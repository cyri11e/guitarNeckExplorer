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
            if (c.mouseClicked?.(mx, my)) return true;
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
}
