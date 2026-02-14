class Panel extends UIComponent {

    constructor(cfg = {}) {
        super();

        // Position / taille relatives
        this.xp = cfg.xp ?? 0;
        this.yp = cfg.yp ?? 0;
        this.sp = cfg.sp ?? 20;
        this.aspectRatio = cfg.aspectRatio ?? 1.5;

        // Drag / zoom
        this.isDraggable = cfg.isDraggable ?? true;
        this.isZoomable  = cfg.isZoomable  ?? true;

        // Enfants
        this.children = [];

        // Responsive initial
        this.setResponsive(this.xp, this.yp, this.sp);
        this.updateResponsive();
    }

    // -------------------------------------------------------
    // AJOUT D’UN ENFANT
    // -------------------------------------------------------
    add(child) {
        child.parent = this;          // ⭐ hiérarchie UIComponent
        child.isDraggable = false;    // ⭐ le panel gère le drag global
        child.isZoomable  = false;    // ⭐ idem
        this.children.push(child);
        child.updateResponsive();     // ⭐ recalcul dans le panel
    }

    // -------------------------------------------------------
    // RESPONSIVE
    // -------------------------------------------------------
    updateResponsive() {
        super.updateResponsive();     // calcule x,y,w,h du panel
        //this.updateChildrenLayout();  // layout interne
    }

updateChildrenLayout() {
    if (this.children.length === 0) return;

    const padding = this.h * 0.05;
    let xCursor = this.x + padding;

    for (let c of this.children) {

        const ratio = c.aspectRatio ?? 1;

        c.h = (this.h - padding * 2) * (c.sp / 100);
        c.w = c.h * ratio;

        c.x = xCursor;
        c.y = this.y + padding;

        xCursor += c.w + padding;
    }

    // ⭐ largeur dynamique
    this.w = xCursor - this.x;

    // ⭐ ratio dynamique
    this.aspectRatio = this.w / this.h;
}


    // -------------------------------------------------------
    // DESSIN
    // -------------------------------------------------------
    draw() {
        super.draw();
        // Fond
        noStroke();
        fill(20, 20, 20, 220);
        rect(this.x, this.y, this.w, this.h, this.h * 0.05);

        // Contour métal
        stroke(180);
        strokeWeight(3* this.zoomFactor);
        noFill();
        rect(this.x, this.y, this.w, this.h, this.h * 0.05);

        // Ombre portée
        noStroke();
        fill(0, 0, 0, 120);
        rect(this.x + 4, this.y + 4, this.w, this.h, this.h * 0.05);

        // Enfants
        for (let c of this.children) {
            c.draw();
        }
    }

    // -------------------------------------------------------
    // INTERACTIONS
    // -------------------------------------------------------
    mousePressed(evt) {
        if (!this.containsRect(evt)) return false;

        // Enfants d'abord
        for (let c of this.children) {
            if (c.mousePressed(evt)) return true;
        }

        // Drag du panel
        return super.mousePressed(evt);
    }

    mouseDragged(evt) {
        // Drag du panel
        if (super.mouseDragged(evt)) {
            this.updateChildrenLayout();
            return true;
        }

        // Drag d’un enfant
        for (let c of this.children) {
            if (c.mouseDragged(evt)) return true;
        }

        return false;
    }

    mouseReleased(evt) {
        super.mouseReleased(evt);
        for (let c of this.children) c.mouseReleased(evt);
    }

    mouseWheel(evt) {
        if (!this.containsRect(evt)) return false;

        const factor = evt.delta > 0 ? 0.95 : 1.05;
        this.applyZoomAt(factor, evt.x, evt.y);

        this.updateChildrenLayout();
        return true;
    }
}
