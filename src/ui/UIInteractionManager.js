class UIInteractionManager {

    constructor() {
        this.components = [];
    }

    // ============================================================
    // REGISTER COMPONENTS
    // ============================================================

    register(component) {
        this.components.push(component);
    }

    unregister(component) {
        this.components = this.components.filter(c => c !== component);
    }

    // ============================================================
    // EVENT ROUTING
    // ============================================================

    mousePressed(mx, my) {
        for (let c of this.components) {
            if (c.mousePressed(mx, my)) return true;
        }
        return false;
    }

    mouseReleased(mx, my) {
        for (let c of this.components) c.mouseReleased(mx, my);
    }

    mouseMoved(mx, my) {
        for (let c of this.components) c.mouseMoved(mx, my);
    }

    mouseDragged(mx, my) {
        for (let c of this.components) {
            if (c.mouseDragged(mx, my)) return true;
        }
        return false;
    }

    mouseWheel(event) {
        for (let c of this.components) {
            if (c.mouseWheel(event)) return true;
        }
        return false;
    }

mouseClicked(mx, my) {
    for (let c of this.components) {
        c.mouseClicked?.(mx, my);
    }
    return false;
}


    keyPressed(k, kc) {
        for (let c of this.components) {
            if (c.keyPressed?.(k, kc)) return true;
        }
        return false;
    }

    keyReleased(k, kc) {
        for (let c of this.components) {
            if (c.keyReleased?.(k, kc)) return true;
        }
        return false;
    }

    // ============================================================
    // REDRAW
    // ============================================================

    invalidateAll() {
        for (let c of this.components) c.invalidate();
    }

    // ============================================================
    // 🔥 AJOUT : MÉTHODES DE UIManager (sans rien retirer)
    // ============================================================

    handleShortcut(k, code) {
        for (let c of this.components) {

            // touche caractère
            if (c.shortcutKey && k.toLowerCase() === c.shortcutKey.toLowerCase()) {
                c.onShortcut?.();
            }

            // touche keyCode
            if (c.shortcutCode && code === c.shortcutCode) {
                c.onShortcut?.();
            }
        }
    }

    handleClick(x, y) {
        for (let c of this.components) {
            if (c.containsRect?.(x, y)) {
                c.onClick?.();
            }
        }
    }

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
