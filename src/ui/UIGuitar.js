class Guitar extends UIComponent {

    constructor(cfg = {}) {
        super();

        this.aspectRatio = cfg.aspectRatio ?? 8;
        this.woodColor   = cfg.woodColor   ?? "maple";
        this.orientation = cfg.orientation ?? "horizontal";

        this.isDraggable = cfg.isDraggable ?? true;
        this.isZoomable  = cfg.isZoomable  ?? true;

        this.debug = cfg.debug ?? false;

        this.setResponsive(cfg.xp ?? 0, cfg.yp ?? 0, cfg.sp ?? 20);

        this.zoomFactor = 1;
    }

    // ============================================================
    // RESPONSIVE (géométrie interne TOUJOURS horizontale)
    // ============================================================

    updateResponsive() {
        const { px, py, pw, ph } = this._getParentFrame();

        this.x = px + pw * (this.xp / 100);
        this.y = py + ph * (this.yp / 100);

        const base = ph * (this.sp / 100) * this.zoomFactor;

        this.h = base;               // épaisseur
        this.w = this.h * this.aspectRatio; // longueur
    }

    // ============================================================
    // GETTERS LOGIQUES
    // ============================================================

    getThickness() { return this.h; }
    getLength()    { return this.w; }

    getNeckRect() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    getNutRect() {
        const t = this.getThickness();
        const nutW = t / 20;
        return { x: this.x + nutW, y: this.y, w: nutW, h: t };
    }

    getNutShadowRect() {
        const nut = this.getNutRect();
        const s = this.getThickness() / 200;
        return { x: nut.x - s, y: nut.y, w: s, h: nut.h };
    }

    getNutShadowRectRight() {
        const nut = this.getNutRect();
        const s = this.getThickness() / 100;
        return { x: nut.x + nut.w, y: nut.y, w: s, h: nut.h };
    }

    // ============================================================
    // CORDES
    // ============================================================

    getStringThickness(i) {
        const t = this.getThickness();
        return (t * 0.020) - (i / 5) * (t * 0.012);
    }

    getStringRadiusOffset(i) {
        const center = 2.5;
        const d = i - center;
        return -(d * d) * (2 / (center * center));
    }

    getStrings() {
        const arr = [];
        const t = this.getThickness();
        const L = this.getLength();

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

        const r = { x: s.x, y: s.y + off, w: s.w, h: size };
        const rr = this.mapRect(r);

        fill(0, 20);
        noStroke();
        rect(rr.x, rr.y, rr.w, rr.h);
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
            let r = this.mapRect(s);
            fill(150);
            rect(r.x, r.y, r.w, r.h);

            // highlight
            const h = { x: s.x, y: s.y, w: s.w, h: s.h * 0.4 };
            r = this.mapRect(h);
            fill(230);
            rect(r.x, r.y, r.w, r.h);
        }
    }

    // ============================================================
    // FRETTES
    // ============================================================

    getFrets() {
        const arr = [];
        const t = this.getThickness();
        const L = this.getLength();

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
            let r = this.mapRect({
                x: f.x - f.w * 0.3,
                y: f.y,
                w: f.w * 1.6,
                h: f.h
            });
            fill(0, 40);
            rect(r.x, r.y, r.w, r.h);

            // métal
            r = this.mapRect(f);
            fill(220);
            rect(r.x, r.y, r.w, r.h);

            // highlight
            const h = {
                x: f.x,
                y: f.y,
                w: f.w * 0.8,
                h: f.h * 0.25
            };
            r = this.mapRect(h);
            fill(255);
            rect(r.x, r.y, r.w, r.h);
        }
    }

    // ============================================================
    // ROTATION LOGIQUE (projection 90°)
    // ============================================================

    mapPoint(x, y) {
        if (this.orientation === "horizontal") return { x, y };

        const x0 = this.x;
        const y0 = this.y;
        const L  = this.getLength();

        return {
            x: x0 + (y - y0),
            y: y0 + (L - (x - x0))
        };
    }

    mapRect(r) {
        if (this.orientation === "horizontal") return r;

        const p = this.mapPoint(r.x, r.y);

        return {
            x: p.x,
            y: p.y,
            w: r.h,
            h: r.w
        };
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
        let r = this.mapRect(this.getNeckRect());
        fill(this.getWoodFill());
        stroke(40);
        strokeWeight(2);
        rect(r.x, r.y, r.w, r.h);

        // ombres cordes
        this.drawStringShadows();

        // frettes
        this.drawFrets();

        // sillet
        r = this.mapRect(this.getNutRect());
        fill(240);
        noStroke();
        rect(r.x, r.y, r.w, r.h);

        // cordes
        this.drawStrings();

        // ombres sillet
        r = this.mapRect(this.getNutShadowRect());
        fill(0, 50);
        rect(r.x, r.y, r.w, r.h);

        r = this.mapRect(this.getNutShadowRectRight());
        fill(0, 35);
        rect(r.x, r.y, r.w, r.h);

        if (this.debug) {
            this.drawDebugRect();
            this.drawDebugInfo();
        }
    }

    toggleOrientation() {
        this.orientation =
            (this.orientation === "horizontal") ? "vertical" : "horizontal";

        this.updateResponsive();
        this.invalidate();
    }
}
