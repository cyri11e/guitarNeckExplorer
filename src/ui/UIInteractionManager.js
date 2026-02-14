class UIInteractionManager {

    constructor() {
        this.components = [];
        this.shortcuts = {};
        this.captureOwner = null;   // 🔥 composant qui a capturé la souris
        this.mouseIsDown = false;
    }

    // ============================================================
    // REGISTER / UNREGISTER
    // ============================================================

    register(component) {
        this.components.push(component);

        if (component.shortcutKey) {
            this.shortcuts[component.shortcutKey.toLowerCase()] = component;
        }
    }

    unregister(component) {
        this.components = this.components.filter(c => c !== component);
    }



    // ============================================================
    // MOUSE EVENTS WITH CAPTURE
    // ============================================================
_buildEvent(mx, my) {
    return {
        x: mx,
        y: my,
        shift: keyIsDown(SHIFT),
        alt: keyIsDown(ALT),
        ctrl: keyIsDown(CONTROL),
        button: mouseButton
    };
}

mouseMoved(mx, my) {
    const evt = this._buildEvent(mx, my);

    for (const c of this.components) {
        c.mouseMoved?.(evt);
    }
}



 mousePressed(mx, my) {
    this.mouseIsDown = true;

    const evt = this._buildEvent(mx, my);

    // top → bottom
    for (let i = this.components.length - 1; i >= 0; i--) {
        const c = this.components[i];

        if (c.mousePressed?.(evt)) {
            this.captureOwner = c;
            return true;
        }
    }

    return false;
}


mouseDragged(mx, my) {
    const evt = this._buildEvent(mx, my);

    if (this.captureOwner) {
        return this.captureOwner.mouseDragged?.(evt) || false;
    }

    for (let i = this.components.length - 1; i >= 0; i--) {
        const c = this.components[i];
        if (c.mouseDragged?.(evt)) return true;
    }

    return false;
}


mouseReleased(mx, my) {
    this.mouseIsDown = false;

    const evt = this._buildEvent(mx, my);

    if (this.captureOwner) {
        const consumed = this.captureOwner.mouseReleased?.(evt) || false;
        this.captureOwner = null;
        return consumed;
    }

    for (let i = this.components.length - 1; i >= 0; i--) {
        const c = this.components[i];
        if (c.mouseReleased?.(evt)) return true;
    }

    return false;
}


mouseClicked(mx, my) {
    if (this.captureOwner) return false;

    const evt = this._buildEvent(mx, my);

    for (let i = this.components.length - 1; i >= 0; i--) {
        const c = this.components[i];
        if (c.mouseClicked?.(evt)) return true;
    }

    return false;
}


mouseWheel(event) {
    const evt = {
        x: mouseX,
        y: mouseY,
        delta: event.delta,
        shift: keyIsDown(SHIFT),
        alt: keyIsDown(ALT),
        ctrl: keyIsDown(CONTROL)
    };

    for (let i = this.components.length - 1; i >= 0; i--) {
        const c = this.components[i];
        if (c.mouseWheel?.(evt)) return true;
    }
    return false;
}


    // ============================================================
    // KEYBOARD + SHORTCUTS
    // ============================================================

    keyPressed(k, kc) {
        const lower = k.toLowerCase();

        // Shortcuts directs
        if (this.shortcuts[lower]) {
            this.shortcuts[lower].onShortcut?.();
            return true;
        }

        // Guitar orientation toggle
        for (let c of this.components) {
            if (c.toggleOrientationShortcut &&
                lower === c.toggleOrientationShortcut.toLowerCase()) {
                c.toggleOrientation?.();
                return true;
            }
        }


        // Sinon propagation normale (z-index)
        for (let i = this.components.length - 1; i >= 0; i--) {
            const c = this.components[i];
            if (c.keyPressed?.(k, kc)) return true;
        }

        return false;
    }

    keyReleased(k, kc) {
        for (let i = this.components.length - 1; i >= 0; i--) {
            const c = this.components[i];
            if (c.keyReleased?.(k, kc)) return true;
        }
        return false;
    }

    // ============================================================
    // SHORTCUTS (ancienne API, mais en z-index)
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
    // CLICK LOGIQUE (z-index)
    // ============================================================

    handleClick(x, y) {
        // 🔥 un click logique ne doit PAS passer si captureOwner existe
        if (this.captureOwner) return false;

        for (let i = this.components.length - 1; i >= 0; i--) {
            const c = this.components[i];

            if (c.containsRect?.(x, y)) {
                c.onClick?.();
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
        console.log(
            "%c[RULE DISPATCH] source=" + component.constructor.name +
            "  id=" + (component.id ?? "none") +
            "  state=" + newState,
            "color:#00aaff; font-weight:bold;"
        );

        for (const rule of UI_RULES) {
            rule(this.components, component, newState);
        }
    }
}
