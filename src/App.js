class App {
    constructor() {

        // Managers
        this.ui = new UIInteractionManager();
        this.ui.app = this;
        this.rules = new RuleManager();

        // Théorie musicale
        this.theory = new MusicTheory();
        this.theory.useFlats = true;

        // Théorie instrumentale
        this.instrument = new InstrumentTheory({
            tuning: ["E2","A2","D3","G3","B3","E4"],
            fretCount: 24,
            musicTheory: this.theory
        });

        // Tous les composants UI (z-index)
        this.components = [];

        // ============================================================
        // 1) CRÉATION DES COMPOSANTS (mais PAS encore de hiérarchie)
        // ============================================================

        for (const key in UI_CONFIG) {
            const cfg = UI_CONFIG[key];
            if (!cfg || !cfg.type) continue;

            let comp = null;

            switch (cfg.type) {
                case "panel":
                    comp = new Panel(cfg);
                    break;

                case "guitar":
                    comp = new Guitar(cfg);
                    comp.theory = this.theory;
                    comp.instrument = this.instrument;
                    break;

                case "metalSwitch":
                    comp = new MetalSwitch(cfg);
                    break;

                case "knob":
                    comp = new Knob(cfg); 
                    break;    

                case "cof":
                    comp = new COF(cfg); 
                    comp.theory = this.theory;
                    break;  

                case "markerSelector":
                    comp = new MarkerSelector(cfg); 
                    break;    

                case "modeChordsPanel":
                    comp = new ModeChordsPanel(cfg);
                    break;

                case "lcdSelector":
                    comp = new LCDSelector(cfg); 
                    break; 


                case "switch":
                    comp = new Switch(cfg); 
                    break; 

                case "snapshotButton":
                    comp = new SnapshotButton(cfg); 
                    break;     
        
                case "bpmCtrl":
                    comp = new BPMControl(cfg); 
                    break;     
                    
                case "trRecPads":
                    comp = new TRRecPads(cfg); 
                    break;

                case "trRecTab":
                    comp = new TRRecTablature(cfg);
                    break;

                default:
                    console.warn("Type inconnu:", cfg.type, "pour", key);
                    continue;
            }

            comp.name = key;
            comp.app = this;
            comp._creationOrder = this.components.length;
            comp._hasExplicitZ = Number.isFinite(cfg.zIndex);
            comp.zIndex = comp._hasExplicitZ ? cfg.zIndex : 0;

            if (cfg.toggleShortcut) comp.shortcutKey = cfg.toggleShortcut;
            if (cfg.toggleOrientationShortcut) comp.toggleOrientationShortcut = cfg.toggleOrientationShortcut;

            this.components.push(comp);

            // Interaction manager
            this.ui.register(comp);

            comp.updateResponsive();
        }

        // ============================================================
        // 2) CONSTRUCTION DE LA HIÉRARCHIE (Panel → enfants)
        // ============================================================

        for (const key in UI_CONFIG) {
            const cfg = UI_CONFIG[key];
            if (!cfg.children) continue;

            const parent = this.components.find(c => c.name === key);
            if (!parent) continue;

            for (const childName of cfg.children) {
                const child = this.components.find(c => c.name === childName);
                if (child) {
                    parent.add(child);
                }
            }

            parent.updateChildrenLayout();
            parent.updateResponsive();
        }

        this._assignAutomaticZIndex();

        // ============================================================
        // 3) ENREGISTREMENT DES COMPOSANTS DANS RULEMANAGER
        // ============================================================

// 3) ENREGISTREMENT DES COMPOSANTS DANS RULEMANAGER
// 3) ENREGISTREMENT DES COMPOSANTS DANS RULEMANAGER
for (const comp of this.components) {
    if (!comp.parent) {   // ← seulement les racines
        this.rules.register(comp);
    }
}



        // ============================================================
        // 4) CHARGEMENT DES RÈGLES
        // ============================================================

        UI_RULES.forEach(rule => this.rules.addRule(rule));

        // ============================================================
        // DEBUG / RENDERING
        // ============================================================

        this.needsRedraw = true;
        this.debug = true;
        this.redrawCount = 0;
        this.lastFPS = 0;
        this._lastTime = millis();
        this._frameCounter = 0;
        this._isDisplaying = false;
        this._invalidatedWhileDisplaying = false;
    }

    _assignAutomaticZIndex() {
        let slot = 0;

        for (const comp of this.components) {
            if (comp.parent) continue;

            if (!comp._hasExplicitZ) {
                comp.zIndex = slot * 10;
            }

            const rootZ = comp.zIndex;
            if (Array.isArray(comp.children)) {
                for (const child of comp.children) {
                    if (!child._hasExplicitZ) {
                        // Dans un panel, tous les enfants partagent le meme z logique.
                        child.zIndex = rootZ + 1;
                    }
                }
            }

            slot++;
        }
    }

    _getRootComponent(component) {
        let c = component;
        while (c?.parent) c = c.parent;
        return c || null;
    }

    bringRootToFront(component) {
        const root = this._getRootComponent(component);
        if (!root) return false;

        const roots = this.components.filter(c => !c.parent);
        if (roots.length === 0) return false;

        let maxZ = -Infinity;
        for (const r of roots) {
            const z = Number.isFinite(r.zIndex) ? r.zIndex : 0;
            if (z > maxZ) maxZ = z;
        }

        const current = Number.isFinite(root.zIndex) ? root.zIndex : 0;
        const nextZ = maxZ + 10;
        if (current >= nextZ) return false;

        root.zIndex = nextZ;
        this.invalidate();
        return true;
    }

    getTopLevelComponentsByZ(ascending = true) {
        const roots = this.components.filter(c => !c.parent);

        roots.sort((a, b) => {
            const za = Number.isFinite(a.zIndex) ? a.zIndex : 0;
            const zb = Number.isFinite(b.zIndex) ? b.zIndex : 0;
            if (za !== zb) return ascending ? (za - zb) : (zb - za);

            const oa = Number.isFinite(a._creationOrder) ? a._creationOrder : 0;
            const ob = Number.isFinite(b._creationOrder) ? b._creationOrder : 0;
            return ascending ? (oa - ob) : (ob - oa);
        });

        return roots;
    }

    // ============================================================
    // RENDERING
    // ============================================================

    update() {
       // if (!this.needsRedraw) return;

        for (const c of this.components) {
            if (typeof c.update === "function") {
                c.update();
            }
        }

        this.redrawCount++;
    }

    display() {
        this._isDisplaying = true;
        this._invalidatedWhileDisplaying = false;

        // FPS
        this._frameCounter++;
        const now = millis();
        if (now - this._lastTime > 500) {
            this.lastFPS = (this._frameCounter * 1000) / (now - this._lastTime);
            this._frameCounter = 0;
            this._lastTime = now;
        }

        background(60);

        // dessin bottom → top (composants racine uniquement)
        for (const c of this.getTopLevelComponentsByZ(true)) {
            c.draw();   // Panels dessinent leurs enfants
        }

        if (this.debug) this.drawDebugHUD();

        this._isDisplaying = false;
        this.needsRedraw = this._invalidatedWhileDisplaying;
    }

    drawDebugHUD() {
        push();
        fill(255, 200, 0);
        textSize(14);
        text(
            `redraw: ${this.redrawCount}   fps: ${this.lastFPS.toFixed(1)}`,
            20,
            height - 20
        );
        pop();
    }

    // ============================================================
    // RESPONSIVE
    // ============================================================

    resize() {
        // 1) recalculer les panels
        for (const c of this.components) {
            c.updateResponsive();
        }

        // 2) recalculer les enfants APRÈS que les panels soient stables
        for (const c of this.components) {
            if (c instanceof Panel) {
                c.updateChildrenLayout();
            }
        }

        this._assignAutomaticZIndex();

        this.invalidate();
    }


invalidate() {
    if (this._isDisplaying) {
        this._invalidatedWhileDisplaying = true;
        return;
    }

    this.needsRedraw = true;
}


    forceRedraw() {
        this.needsRedraw = true;
        this.update();
        this.display();
    }

    // ============================================================
    // EVENTS → UIInteractionManager
    // ============================================================

    mousePressed(x, y)  { this.ui.mousePressed(x, y); }
    mouseReleased(x, y) { this.ui.mouseReleased(x, y); }
    mouseMoved(x, y)    { this.ui.mouseMoved(x, y); }
    mouseDragged(x, y)  { this.ui.mouseDragged(x, y); }
    mouseWheel(e)       { return this.ui.mouseWheel(e); }


    keyPressed(k, kc) {
        this.ui.handleShortcut(k, kc);
        this.ui.keyPressed(k, kc);
        this.invalidate();
    }

    keyReleased(k, kc) {
        this.ui.keyReleased(k, kc);
    }
}
