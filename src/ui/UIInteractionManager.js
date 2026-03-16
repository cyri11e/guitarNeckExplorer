class UIInteractionManager {

    constructor() {
        this.components = [];
        this.shortcuts = {};
        this.captureOwner = null;
        this.mouseIsDown = false;

        // ============================================================
        // INTERACTIONS GUITARE (globales)
        // ============================================================
        this.guitar = null;       // détectée automatiquement
        this.brushActive = false; // clic gauche = pinceau
        this.eraseActive = false; // clic droit = gomme
        this.dragActive = false;  // CTRL = drag du manche

        this.lastX = 0;
        this.lastY = 0;
    }

    // ============================================================
    // REGISTER / UNREGISTER
    // ============================================================

    register(component) {
        this.components.push(component);

        // Détection automatique de la guitare
        if (component instanceof Guitar) {
            this.guitar = component;
        }

        if (component.shortcutKey) {
            this.shortcuts[component.shortcutKey.toLowerCase()] = component;
        }
    }

    unregister(component) {
        this.components = this.components.filter(c => c !== component);
    }

    _getTopLevelByZDesc() {
        if (this.app?.getTopLevelComponentsByZ) {
            return this.app.getTopLevelComponentsByZ(false);
        }

        const roots = this.components.filter(c => !c.parent);
        return roots.reverse();
    }

    _isHitOnNonGuitarControl(comp, evt) {
        if (!comp) return false;

        if (Array.isArray(comp.children) && comp.children.length > 0) {
            for (let i = comp.children.length - 1; i >= 0; i--) {
                if (this._isHitOnNonGuitarControl(comp.children[i], evt)) {
                    return true;
                }
            }
        }

        if (comp instanceof Guitar) return false;

        // Les conteneurs (panel) ne doivent pas bloquer la guitare:
        // on bloque seulement sur un contrôle concret non-guitare.
        if (Array.isArray(comp.children) && comp.children.length > 0) {
            return false;
        }

        return !!comp.containsRect?.(evt);
    }

    _hasTopControlHit(evt) {
        for (const root of this._getTopLevelByZDesc()) {
            if (this._isHitOnNonGuitarControl(root, evt)) {
                return true;
            }
        }
        return false;
    }

    // ============================================================
    // EVENT BUILDER
    // ============================================================

_buildEvent(mx, my) {
    return {
        x: mx,
        y: my,
        shiftKey: keyIsDown(SHIFT),
        altKey: keyIsDown(ALT),
        ctrlKey: keyIsDown(CONTROL),
        button: mouseButton
    };
}


    // ============================================================
    // INTERACTIONS GUITARE — HANDLERS INTERNES
    // ============================================================

    _handleGlobalMousePressed(evt) {
        if (!this.guitar) return false;
        if (!this.guitar.containsRect(evt)) return false;

        // Ne pas capturer si un contrôle UI non-guitare est visé.
        if (this._hasTopControlHit(evt)) return false;

        this.lastX = evt.x;
        this.lastY = evt.y;

        // CTRL = drag du manche
        // if (evt.ctrl) {
        //     this.dragActive = true;
        //     this.brushActive = false;
        //     this.eraseActive = false;
        //     return true;
        // }

        // Clic gauche = pinceau
        if (evt.button === 0) {
            this.brushActive = true;
            this.eraseActive = false;
            this.dragActive = false;
            this.guitar.addNoteAtEvent(evt);
            this.app?.bringRootToFront?.(this.guitar);
            return true;
        }

        // Clic droit = gomme
        if (evt.button === 2) {
            this.eraseActive = true;
            this.brushActive = false;
            this.dragActive = false;
            this.guitar.removeNoteAtEvent(evt);
            this.app?.bringRootToFront?.(this.guitar);
            return true;
        }

        return false;
    }

    _handleGlobalMouseMoved(evt) {
        if (!this.guitar) return false;

        if (this.brushActive) {
            this.guitar.addNoteAtEvent(evt);
            return true;
        }

        if (this.eraseActive) {
            this.guitar.removeNoteAtEvent(evt);
            return true;
        }

        return false;
    }

    _handleGlobalMouseDragged(evt) {
        if (!this.guitar) return false;

        if (this.dragActive) {
            const dx = evt.x - this.lastX;
            const dy = evt.y - this.lastY;

            this.lastX = evt.x;
            this.lastY = evt.y;

            this.guitar.moveBy(dx, dy);
            return true;
        }

        return false;
    }

    _handleGlobalMouseReleased(evt) {
        this.brushActive = false;
        this.eraseActive = false;
        this.dragActive = false;
        return false;
    }

    // ============================================================
    // MOUSE EVENTS WITH CAPTURE + GLOBAL GUITAR LAYER
    // ============================================================

    mouseMoved(mx, my) {
        const evt = this._buildEvent(mx, my);

        if (this._handleGlobalMouseMoved(evt)) return true;

        // propagation UI
        for (const c of this._getTopLevelByZDesc()) {
            c.mouseMoved?.(evt);
        }
    }

    mousePressed(mx, my) {
        this.mouseIsDown = true;
        const evt = this._buildEvent(mx, my);

        // 1) Interactions guitare
        if (this._handleGlobalMousePressed(evt)) return true;

        // 2) Sinon propagation UI (top → bottom)
        for (const c of this._getTopLevelByZDesc()) {
            if (c.mousePressed?.(evt)) {
                if (c.bringToFrontOnPress === true) {
                    this.app?.bringRootToFront?.(c);
                }
                this.captureOwner = c;
                return true;
            }
        }

        return false;
    }

    mouseDragged(mx, my) {
        const evt = this._buildEvent(mx, my);

        // 1) Interactions guitare
        if (this._handleGlobalMouseDragged(evt)) return true;

        // 2) Capture UI
        if (this.captureOwner) {
            return this.captureOwner.mouseDragged?.(evt) || false;
        }

        // 3) Propagation UI
        for (const c of this._getTopLevelByZDesc()) {
            if (c.mouseDragged?.(evt)) return true;
        }

        return false;
    }

    mouseReleased(mx, my) {
        this.mouseIsDown = false;
        const evt = this._buildEvent(mx, my);

        // 1) Interactions guitare
        this._handleGlobalMouseReleased(evt);

        // 2) Capture UI
        if (this.captureOwner) {
            const consumed = this.captureOwner.mouseReleased?.(evt) || false;
            this.captureOwner = null;
            return consumed;
        }

        // 3) Propagation UI
        for (const c of this._getTopLevelByZDesc()) {
            if (c.mouseReleased?.(evt)) return true;
        }

        return false;
    }

    // ============================================================
    // WHEEL
    // ============================================================

    mouseWheel(event) {
        const evt = {
            x: mouseX,
            y: mouseY,
            delta: event.delta,
            shift: keyIsDown(SHIFT),
            alt: keyIsDown(ALT),
            ctrl: keyIsDown(CONTROL)
        };

        for (const c of this._getTopLevelByZDesc()) {
            if (c.mouseWheel?.(evt)) return true;
        }
        return false;
    }

    // ============================================================
    // KEYBOARD + SHORTCUTS
    // ============================================================

    keyPressed(k, kc) {
        const lower = k.toLowerCase();

        // Propagation UI
        for (let i = this.components.length - 1; i >= 0; i--) {
            const c = this.components[i];

            if (c.keyPressed?.(k, kc)) return true;
        }

        return false;
    }

    keyReleased(k, kc) {
        this.invalidateAll();
        for (let i = this.components.length - 1; i >= 0; i--) {
            const c = this.components[i];
            if (c.keyReleased?.(k, kc)) return true;
        }
        return false;
    }

    // ============================================================
    // SHORTCUTS
    // ============================================================

    handleShortcut(k, code) {
        const lower = k.toLowerCase();

        for (let i = this.components.length - 1; i >= 0; i--) {
            const c = this.components[i];

            if (c.shortcutKey && lower === c.shortcutKey.toLowerCase()) {
                c.onShortcut?.();
                return true;
            }

            if (c.shortcutCode && code === c.shortcutCode) {
                c.onShortcut?.();
                return true;
            }
        }

        return false;
    }

    // ============================================================
    // REDRAW
    // ============================================================

    invalidateAll() {
        for (let c of this.components) c.invalidate?.();
    }

    // ============================================================
    // RULE DISPATCH
    // ============================================================

    onComponentChange(component, newState) {
        for (const rule of UI_RULES) {
            rule(this.components, component, newState);
        }
    }
}
