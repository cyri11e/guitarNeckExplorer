class Panel extends UIComponent {

    constructor(xp, yp, sp, config = {}) {
        super();

        // Responsive placement
        this.setResponsive(xp, yp, sp);

        // Options
        this.isDraggable = config.isDraggable ?? true;
        this.isZoomable  = config.isZoomable  ?? true;

        // Children UI components
        this.children = [];

        // Debug ON by default for testing
        this.debug = true;
    }

    // ============================================================
    // CHILD MANAGEMENT
    // ============================================================

    add(component) {
        component.parent = this;
        this.children.push(component);
        this.invalidate();
    }

    remove(component) {
        this.children = this.children.filter(c => c !== component);
        this.invalidate();
    }

    // ============================================================
    // RESPONSIVE
    // ============================================================

    computeLayout() {
        // Nothing special for now
        // Children will update their layout after us
        for (let c of this.children) {
            c.updateResponsive();
        }
    }

    resize() {
        this.updateResponsive();
        for (let c of this.children) c.resize?.();
        this.invalidate();
    }

    // ============================================================
    // EVENTS
    // ============================================================

    mousePressed(mx, my) {
        // Children first (top-down)
        for (let c of this.children) {
            if (c.mousePressed(mx, my)) return true;
        }
        return super.mousePressed(mx, my);
    }

    mouseDragged(mx, my) {
        // Children first
        for (let c of this.children) {
            if (c.mouseDragged(mx, my)) return true;
        }
        return super.mouseDragged(mx, my);
    }

    mouseReleased(mx, my) {
        for (let c of this.children) c.mouseReleased(mx, my);
        super.mouseReleased(mx, my);
    }

    mouseMoved(mx, my) {
        // Hover detection
        this.updateHover(mx, my);

        for (let c of this.children) {
            c.mouseMoved(mx, my);
        }
    }

  mouseWheel(e) {
    
    if (!this.containsRect(mouseX, mouseY)) return false;

    let delta = constrain(-e.delta * 0.001, -0.2, 0.2);
    let scale = 1 + delta;

    this.zoomFactor *= scale;

    this.updateResponsive();
    return true;
  }

    // ============================================================
    // DRAW
    // ============================================================

    draw() {
        // Draw background panel (simple rectangle)
        push();
        fill(40);
        stroke(200);
        strokeWeight(2);
        rect(this.x, this.y, this.w, this.h, 8);
        pop();

        // Debug overlay
        this.drawDebugRect();
        this.drawDebugInfo();

        // Draw children
        for (let c of this.children) {
            c.draw();
        }
    }

    // ============================================================
    // DEBUG INFO
    // ============================================================

    drawDebugInfo() {
        if (!this.debug) return;

        push();
        fill(255);
        noStroke();
        textSize(12);

        let lines = [
            `Panel`,
            `hover: ${this.hover}`,
            `drag: ${this.dragging}`,
            `click: ${this.containsRect(mouseX, mouseY, this.x, this.y, this.w, this.h)}`,
            `x:${this.x.toFixed(0)} y:${this.y.toFixed(0)}`,
            `w:${this.w.toFixed(0)} h:${this.h.toFixed(0)}`
        ];

        let ty = this.y + 15;
        for (let line of lines) {
            text(line, this.x + 5, ty);
            ty += 14;
        }

        pop();
    }

}
