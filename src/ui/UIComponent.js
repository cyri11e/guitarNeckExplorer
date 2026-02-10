class UIComponent {

    constructor() {
        // --- Responsive placement (percentages) ---
        this.xp = 0;     // position X en %
        this.yp = 0;     // position Y en %
        this.sp = 100;   // scale en %

        // --- Layout en pixels ---
        this.x = 0;
        this.y = 0;
        this.w = 0;
        this.h = 0;

        this.parent = null;

        // --- Interaction ---
        this.hover = false;
        this.isDraggable = false;
        this.isZoomable = false;

        this.dragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;

        // --- Redraw system ---
        this.needsRedraw = true;

        // --- Debug ---
        this.debug = true;

        // --- State ---
        this.state = null;
    }


    debugLog(...args) {
        if (this.debug) console.log(...args);
    }

    // ============================================================
    // RESPONSIVE
    // ============================================================

    setResponsive(xp, yp, sp) {
        this.xp = xp;
        this.yp = yp;
        this.sp = sp;
        this.invalidate();
    }

    updateResponsive() {
        let px, py, pw, ph;


        if (this.parent) {
            px = this.parent.x;
            py = this.parent.y;
            pw = this.parent.w;
            ph = this.parent.h;
        } else {
            // Pas de parent → on se base sur la fenêtre
            px = 0;
            py = 0;
            pw = windowWidth;
            ph = windowHeight;
        }
this.debugLog("updateResponsive pw,ph =", pw, ph);
        this.w = pw * (this.sp / 100);
        this.h = ph * (this.sp / 100);

        this.x = px + pw * (this.xp / 100);
        this.y = py + ph * (this.yp / 100);

        this.computeLayout();
    }



    computeLayout() {
        // Surchargé par les enfants
    }

    // ============================================================
    // REDRAW
    // ============================================================

    invalidate() {
        this.needsRedraw = true;
        if (this.parent && this.parent.invalidate) {
            this.parent.invalidate();
        }
    }

    // ============================================================
    // HOVER
    // ============================================================

    containsRect(mx, my, x, y, w, h) {
        return mx >= x && mx <= x + w && my >= y && my <= y + h;
    }

    updateHover(mx, my) {
        const inside = this.containsRect(mx, my, this.x, this.y, this.w, this.h);

        if (inside && !this.hover) {
            this.hover = true;
            this.onHoverStart();
            this.invalidate();
        }
        else if (!inside && this.hover) {
            this.hover = false;
            this.onHoverEnd();
            this.invalidate();
        }
    }

    onHoverStart() {}
    onHoverEnd() {}

    // ============================================================
    // DRAG
    // ============================================================

    mousePressed(mx, my) {
        if (!this.isDraggable) return false;

        if (this.containsRect(mx, my, this.x, this.y, this.w, this.h)) {
            this.dragging = true;
            this.dragOffsetX = mx - this.x;
            this.dragOffsetY = my - this.y;
            return true;
        }
        return false;
    }

    mouseDragged(mx, my) {
        if (!this.dragging) return false;

        this.x = mx - this.dragOffsetX;
        this.y = my - this.dragOffsetY;

        this.invalidate();
        return true;
    }

    mouseReleased() {
        this.dragging = false;
    }

    // ============================================================
    // ZOOM
    // ============================================================

    mouseWheel(event) {
        if (!this.isZoomable) return false;

        // ⭐ indispensable : vérifier que la souris est sur le composant
        if (!this.containsRect(mouseX, mouseY, this.x, this.y, this.w, this.h)) {
            return false;
        }

        const factor = event.delta > 0 ? 0.95 : 1.05;
        this.zoom(factor);

        return true; // consommé
    }


    zoom(factor) {
        this.sp *= factor;
        this.invalidate();
    }

    // ============================================================
    // STATE
    // ============================================================

    setState(v) {
        if (this.state === v) return;
        this.state = v;
        this.triggerChange(v);
        this.invalidate();
    }

    triggerChange(v) {
        // UIInteractionManager écoutera ça
    }

    // ============================================================
    // DEBUG
    // ============================================================

    drawDebugRect() {
        if (!this.debug) return;
        push();
        noFill();
        stroke(255, 0, 0);
        strokeWeight(1);
        rect(this.x, this.y, this.w, this.h);
        pop();
    }

    drawDebugInfo() {
        if (!this.debug) return;
        push();
        fill(255, 0, 0);
        noStroke();
        textSize(12);
        text(`(${this.x.toFixed(0)}, ${this.y.toFixed(0)})`, this.x + 5, this.y + 15);
        pop();
    }

    // ============================================================
    // DRAW
    // ============================================================

    draw() {
        // Surchargé par les enfants
        this.drawDebugRect();
        this.drawDebugInfo();
    }
}
