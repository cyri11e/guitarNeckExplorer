class App {
    constructor() {

        // Manager d'interactions
        this.ui = new UIInteractionManager();

        // Tous les composants UI (z-index = ordre d'arrivée)
        this.components = [];

        // ============================================================
        // AUTO-CREATION DEPUIS UI_CONFIG
        // ============================================================

        for (const key in UI_CONFIG) {
            const cfg = UI_CONFIG[key];

            // sécurité : cfg doit exister et avoir un type
            if (!cfg || !cfg.type) continue;

            let comp = null;

            // mapping type → classe
            switch (cfg.type) {
                case "panel":
                    comp = new Panel(cfg);
                    break;

                case "guitar":
                    comp = new Guitar(cfg);
                    break;


                // futur :
                // case "knob": comp = new Knob(cfg); break;
                // case "switch": comp = new Switch(cfg); break;

                default:
                    console.warn("Type inconnu:", cfg.type, "pour", key);
                    continue;
            }

            // nom interne
            comp.name = key;

            // shortcut éventuel
            if (cfg.toggleShortcut) {
                comp.shortcutKey = cfg.toggleShortcut;
            }
            if (cfg.toggleOrientationShortcut) {
                comp.toggleOrientationShortcut = cfg.toggleOrientationShortcut;
            }

            // lien vers App
            comp.app = this;

            // ajout dans la pile (z-index)
            this.components.push(comp);

            // enregistrement dans UIManager
            this.ui.register(comp);


            // responsive initial
            comp.updateResponsive();
        }

        // ============================================================
        // DEBUG / RENDERING
        // ============================================================

        this.needsRedraw = true;
        this.debug = true;
        this.redrawCount = 0;
        this.lastFPS = 0;
        this._lastTime = millis();
        this._frameCounter = 0;
    }

    // ============================================================
    // RENDERING
    // ============================================================

    update() {
        if (!this.needsRedraw) return;
        this.needsRedraw = false;
        this.redrawCount++;
    }

    display() {
        // FPS
        this._frameCounter++;
        const now = millis();
        if (now - this._lastTime > 500) {
            this.lastFPS = (this._frameCounter * 1000) / (now - this._lastTime);
            this._frameCounter = 0;
            this._lastTime = now;
        }

        background(60);

        // dessin bottom → top
        for (const c of this.components) {
            c.draw();
        }

        if (this.debug) this.drawDebugHUD();

        this.needsRedraw = false;
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
        for (const c of this.components) {
            c.updateResponsive();
        }
        this.invalidate();
    }

    invalidate() {
        this.needsRedraw = true;
    }

    // ============================================================
    // EVENTS → UIInteractionManager
    // ============================================================

    mousePressed(x, y)  { this.ui.mousePressed(x, y); }
    mouseReleased(x, y) { this.ui.mouseReleased(x, y); }
    mouseMoved(x, y)    { this.ui.mouseMoved(x, y); }
    mouseDragged(x, y)  { this.ui.mouseDragged(x, y); }
    mouseWheel(e)       { return this.ui.mouseWheel(e); }

    mouseClicked(x, y)  { 
        this.ui.mouseClicked(x, y);
        this.invalidate();
    }

    keyPressed(k, kc) {
        this.ui.handleShortcut(k, kc);
        this.ui.keyPressed(k, kc);
        this.invalidate();
    }

    keyReleased(k, kc) {
        this.ui.keyReleased(k, kc);
    }
}
