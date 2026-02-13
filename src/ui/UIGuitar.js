class Guitar extends UIComponent {

    constructor(cfg = {}) {
        super();

        this.aspectRatio = cfg.aspectRatio ?? 8;
        this.woodColor   = cfg.woodColor   ?? "maple";

        this.isDraggable = cfg.isDraggable ?? true;
        this.isZoomable  = cfg.isZoomable  ?? true;

        this.debug = cfg.debug ?? false;

        this.setResponsive(cfg.xp ?? 0, cfg.yp ?? 0, cfg.sp ?? 20);

        this.zoomFactor = 1;
    }

    // ============================================================
    // RESPONSIVE (géométrie interne horizontale)
    // ============================================================

    updateResponsive() {
        const { px, py, pw, ph } = this._getParentFrame();

        this.x = px + pw * (this.xp / 100);
        this.y = py + ph * (this.yp / 100);

        const base = ph * (this.sp / 100) * this.zoomFactor;

        this.h = base;                     // épaisseur du manche
        this.w = this.h * this.aspectRatio; // longueur du manche
    }

    computeLayout() {}

    // ============================================================
    // GETTERS LOGIQUES
    // ============================================================

    getThickness() { return this.h; }
    getLength()    { return this.w; }

    getNeckRect() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    getNutRect() {
        const t = this.h;
        const nutW = t / 20;
        return { x: this.x + nutW, y: this.y, w: nutW, h: t };
    }

    getNutShadowRect() {
        const nut = this.getNutRect();
        const s = this.h / 200;
        return { x: nut.x - s, y: nut.y, w: s, h: nut.h };
    }

    getNutShadowRectRight() {
        const nut = this.getNutRect();
        const s = this.h / 100;
        return { x: nut.x + nut.w, y: nut.y, w: s, h: nut.h };
    }

    // ============================================================
    // CORDES
    // ============================================================

    getStringThickness(i) {
        const t = this.h;
        return (t * 0.020) - (i / 5) * (t * 0.012);
    }

    getStringRadiusOffset(i) {
        const center = 2.5;
        const d = i - center;
        return -(d * d) * (2 / (center * center));
    }

    getStrings() {
        const arr = [];
        const t = this.h;
        const L = this.w;

        const usable = t * 0.95;
        const margin = (t - usable) / 2;
        const spacing = usable / 5;

        for (let i = 0; i < 6; i++) {
            const off = margin + i * spacing + this.getStringRadiusOffset(i);
            const thick = this.getStringThickness(i);

            arr.push({
                x: this.x,
                y: this.y + off,
                w: L,
                h: thick
            });
        }
        return arr;
    }

    drawStringShadow(s, t) {
        const off = t * 1.5;
        const size = t * 0.8;

        fill(0, 20);
        noStroke();
        rect(s.x, s.y + off, s.w, size);
    }

    drawStringShadows() {
        const strings = this.getStrings();
        for (let i = 0; i < strings.length; i++) {
            this.drawStringShadow(strings[i], this.getStringThickness(i));
        }
    }

    drawStrings() {
        const strings = this.getStrings();

        for (let i = 0; i < strings.length; i++) {
            const s = strings[i];

            // sombre
            fill(150);
            rect(s.x, s.y, s.w, s.h);

            // highlight
            fill(230);
            rect(s.x, s.y, s.w, s.h * 0.4);
        }
    }

    // ============================================================
    // FRETTES
    // ============================================================

    getFrets() {
        const arr = [];
        const t = this.h;
        const L = this.w;

        const count = 12;
        const fw = t * 0.05;

        for (let i = 0; i < count; i++) {
            const pos = (L / (count + 1)) * (i + 1);
            arr.push({ x: this.x + pos, y: this.y, w: fw, h: t });
        }
        return arr;
    }

    drawFrets() {
        const frets = this.getFrets();

        for (const f of frets) {
            // ombre
            fill(0, 40);
            rect(f.x - f.w * 0.3, f.y, f.w * 1.6, f.h);

            // métal
            fill(220);
            rect(f.x, f.y, f.w, f.h,f.w *0.3);

            // reflet clair
            fill(255);
            rect(f.x, f.y, f.w * 0.8, f.h * 0.25,f.h * 0.25,0,0);

            //reflet sombre
            fill(100);
            rect(f.x +f.w *0.3, f.y +f.w *0.3, f.w * 0.6, f.h * 0.97, f.w *0.98);
        }
    }

    // ============================================================
    // COULEUR BOIS
    // ============================================================

    getWoodFill() {
        if (this.woodColor === "rosewood") {
            return color(60, 35, 20);
        }
        return color(200, 170, 110);
    }

    // ============================================================
    // DRAW
    // ============================================================

    draw() {
        // manche
        const neck = this.getNeckRect();
        fill(this.getWoodFill());
        stroke(40);
        strokeWeight(2);
        rect(neck.x, neck.y, neck.w, neck.h);

        // ombres cordes
        this.drawStringShadows();

        // frettes
        this.drawFrets();

        // sillet
        const nut = this.getNutRect();
        fill(240);
        noStroke();
        rect(nut.x, nut.y, nut.w, nut.h);

        // cordes
        this.drawStrings();

        // ombres sillet
        const ns = this.getNutShadowRect();
        fill(0, 50);
        rect(ns.x, ns.y, ns.w, ns.h);

        const nsr = this.getNutShadowRectRight();
        fill(0, 35);
        rect(nsr.x, nsr.y, nsr.w, nsr.h);

        if (this.debug) {
            this.drawDebugRect();
            this.drawDebugInfo();
        }
    }
}
