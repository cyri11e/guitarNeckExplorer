class Panel extends UIComponent {
    constructor(cfg) {
        super();

        this.setResponsive(cfg.xp, cfg.yp, cfg.sp);
        this.aspectRatio = cfg.aspectRatio;
        this.visible = cfg.visible;
        this.debug   = cfg.debug;

        this.isDraggable = cfg.isDraggable;
        this.isZoomable  = cfg.isZoomable;

        this.toggleOnClick = cfg.toggleOnClick;

        this.children = [];
    }

    toggleVisible() { 
        this.visible = !this.visible; 
        this.invalidate();
    }

    onShortcut() {
        this.toggleVisible();
    }

    onClick() {
        if (this.toggleOnClick) {
            this.toggleVisible();
        }
    }

    add(component) {
        component.parent = this;
        this.children.push(component);
        this.invalidate();
    }

    computeLayout() {
        for (let c of this.children) {
            c.updateResponsive();
        }
    }

    draw() {
        if (this.visible) {
            push();
            fill(40);
            stroke(200);
            rect(this.x, this.y, this.w, this.h, 8);
            pop();
        }
        super.draw();
       // this.drawDebugRect();
        // this.drawDebugInfo();

        for (let c of this.children) c.draw();
    }

    drawDebugInfo() {
        if (!this.debug) return;

        push();
        fill(255);
        noStroke();
        textSize(12);

        let lines = [
            `Panel`,
            `hover: ${this.isHovered}`,
            `drag: ${this.dragging}`,
            `wheel: ${this.wheelActive}`,
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
