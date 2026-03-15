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
        child.parent = this;          //  hiérarchie UIComponent
        child.isDraggable = false;    //  le panel gère le drag global
        child.isZoomable  = false;    //  idem
        
        this.children.push(child);
        child.updateResponsive();     //  recalcul dans le panel
        this.updateChildrenLayout();
    }

    // -------------------------------------------------------
    // RESPONSIVE
    // -------------------------------------------------------
    updateResponsive() {
        super.updateResponsive();     // calcule x,y,w,h du panel
        this.updateChildrenLayout();  // layout interne
    }

updateChildrenLayout() {
    if (this.children.length === 0) return;

    const padding = this.h * 0.05;
    const gap = padding;
    const innerX = this.x + padding;
    const innerY = this.y + padding;
    const innerH = Math.max(0, this.h - padding * 2);

    const getChildHeight = (child) => {
        const sp = child.sp ?? 100;
        // Règle demandée: sp = 0 ou 100 => hauteur pleine du panel
        if (sp === 0 || sp === 100) return innerH;
        return innerH * (sp / 100);
    };

    // 1) Layout auto: ligne horizontale (mode historique).
    let xCursor = innerX;
    let contentRight = innerX;

    for (let c of this.children) {
        const ratio = c.aspectRatio ?? 1;
        c.h = getChildHeight(c);
        c.w = c.h * ratio;

        if (c.relativePos === true) continue;
        if (c.anchorUnder) continue;

        c.x = xCursor;
        c.y = innerY;

        contentRight = Math.max(contentRight, c.x + c.w);
        xCursor += c.w + gap;
    }

    // 2) La largeur du panel s'adapte au contenu horizontal.
    const autoContentWidth = Math.max(0, contentRight - innerX);
    const newPanelWidth = autoContentWidth > 0
        ? autoContentWidth + padding * 2
        : this.w;

    this.w = newPanelWidth;
    this.aspectRatio = this.h > 0 ? (this.w / this.h) : this.aspectRatio;

    // 3) Place les enfants relatifs ou ancrés dans l'espace interne final du panel.
    const finalInnerW = Math.max(0, this.w - padding * 2);
    for (let c of this.children) {
        c.h = getChildHeight(c);
        c.w = c.h * (c.aspectRatio ?? 1);

        if (c.anchorUnder) {
            const anchor = this.children.find(x => x.name === c.anchorUnder);
            if (anchor) {
                c.x = anchor.x;
                c.y = anchor.y + anchor.h + gap;
            } else {
                c.x = innerX;
                c.y = innerY;
            }
        } else if (c.relativePos === true) {
            c.x = innerX + finalInnerW * ((c.xp ?? 0) / 100);
            c.y = innerY + innerH * ((c.yp ?? 0) / 100);
        } else {
            continue;
        }

        // Les children relatifs restent dans le panel.
        const maxX = innerX + Math.max(0, finalInnerW - c.w);
        const maxY = innerY + Math.max(0, innerH - c.h);
        c.x = constrain(c.x, innerX, maxX);
        c.y = constrain(c.y, innerY, maxY);
    }
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

    applyZoomAt(factor, cx, cy) {
        super.applyZoomAt(factor, cx, cy);
        this.updateChildrenLayout();
    }

    moveBy(dx, dy) {
        super.moveBy(dx, dy);
        this.updateChildrenLayout();
    }
}
