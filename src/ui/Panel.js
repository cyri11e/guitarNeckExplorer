class Panel extends UIComponent {

    constructor(xp, yp, sp, config = {}) {
        super();

        this.setResponsive(xp, yp, sp);

        this.isDraggable = config.isDraggable ?? true;
        this.isZoomable  = config.isZoomable  ?? true;

        this.children = [];
        this.debug = true;
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
        push();
        fill(40);
        stroke(200);
        rect(this.x, this.y, this.w, this.h, 8);
        pop();

        this.drawDebugRect();
        this.drawDebugInfo();

        for (let c of this.children) {
            c.draw();
        }
    }

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
