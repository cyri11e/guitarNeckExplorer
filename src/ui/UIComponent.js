class UIComponent {

    constructor() {
        this.xp = 0;
        this.yp = 0;
        this.sp = 100;

        this.x = 0;
        this.y = 0;
        this.w = 0;
        this.h = 0;

        this.parent = null;

        this.hover = false;
        this.isDraggable = false;
        this.isZoomable = false;

        this.dragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;

        this.zoomFactor = 1;

        this.needsRedraw = true;
        this.debug = true;
        this.wheelActive = false;

        // Modèle B : responsive initial seulement
        this.hasBeenPositioned = false;
    }

    // ============================================================
    // RESPONSIVE INITIAL
    // ============================================================

    setResponsive(xp, yp, sp) {
        this.xp = xp;
        this.yp = yp;
        this.sp = sp;
    }

    updateResponsive() {
        let px, py, pw, ph;

        if (this.parent) {
            px = this.parent.x;
            py = this.parent.y;
            pw = this.parent.w;
            ph = this.parent.h;
        } else {
            px = 0;
            py = 0;
            pw = windowWidth;
            ph = windowHeight;
        }

        // Taille responsive initiale
        if (!this.hasBeenPositioned) {
            this.w = pw * (this.sp / 100);
            this.h = ph * (this.sp / 100);
        }

        // Position responsive initiale
        if (!this.hasBeenPositioned) {
            this.x = px + pw * (this.xp / 100);
            this.y = py + ph * (this.yp / 100);
        }

        this.computeLayout();
    }

    computeLayout() {}

    // ============================================================
    // HIT TEST
    // ============================================================

    containsRect(mx, my) {
        return (
            mx >= this.x &&
            mx <= this.x + this.w &&
            my >= this.y &&
            my <= this.y + this.h
        );
    }

    // ============================================================
    // DRAG
    // ============================================================

    mousePressed(mx, my) {
        if (!this.isDraggable) return false;

        if (this.containsRect(mx, my)) {
            this.dragging = true;
            this.dragOffsetX = mx - this.x;
            this.dragOffsetY = my - this.y;

            this.hasBeenPositioned = true;
            return true;
        }
        return false;
    }

    mouseDragged(mx, my) {
        if (!this.dragging) return false;

        this.x = mx - this.dragOffsetX;
        this.y = my - this.dragOffsetY;

        this.hasBeenPositioned = true;
        this.invalidate();
        return true;
    }

    mouseReleased() {
        this.dragging = false;
    }

    // ============================================================
    // ZOOM LIBRE (Modèle B)
    // ============================================================

    mouseWheel(event) {
        if (!this.isZoomable) return false;
        if (!this.containsRect(mouseX, mouseY)) return false;

        this.wheelActive = true;

        const factor = event.delta > 0 ? 0.95 : 1.05;

        // Zoom centré
        let localX = mouseX - this.x;
        let localY = mouseY - this.y;

        this.w *= factor;
        this.h *= factor;

        this.x = mouseX - localX * factor;
        this.y = mouseY - localY * factor;

        this.zoomFactor *= factor;
        this.hasBeenPositioned = true;

        this.invalidate();
        return true;
    }

    // ============================================================
    // INVALIDATION
    // ============================================================

    invalidate() {
        this.needsRedraw = true;
    }

    // ============================================================
    // DEBUG
    // ============================================================

    drawDebugRect() {
        if (!this.debug) return;
        push();
        noFill();
        stroke(255, 0, 0);
        rect(this.x, this.y, this.w, this.h);
        pop();
    }

    drawDebugInfo() {
        if (!this.debug) return;
        push();
        fill(255, 0, 0);
        noStroke();
        textSize(12);
        text(
            `(${this.x.toFixed(0)}, ${this.y.toFixed(0)}) wheel:${this.wheelActive}`,
            this.x + 5,
            this.y + 15
        );
        pop();
    }

    draw() {
        this.drawDebugRect();
        this.drawDebugInfo();
    }

    // ============================================================
    // EVENTS (méthodes vides pour éviter les erreurs)
    // ============================================================

    mouseMoved(mx, my) { return false; }
    mouseClicked(mx, my) { return false; }
    keyPressed(k, kc) { return false; }
    keyReleased(k, kc) { return false; }

}
