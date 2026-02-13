class Guitar extends UIComponent {

    constructor(cfg = {}) {
        super();

        this.aspectRatio = cfg.aspectRatio ?? 8;
        this.woodColor   = "rosewood";

        this.isDraggable = cfg.isDraggable ?? true;
        this.isZoomable  = cfg.isZoomable  ?? true;

        this.debug = cfg.debug ?? false;

        this.setResponsive(cfg.xp ?? 0, cfg.yp ?? 0, cfg.sp ?? 20);

        this.zoomFactor = 1;
        this.fretCount  = cfg.fretCount ?? 24;

        this.inlayStyle = cfg.inlayStyle ?? "trapeze"; 
        // "dots", "superstrat", "trapeze"

        // géométrie logique (ratios)
        this.fretRatio   = this.computeFretRatios();   // 0..1
        this.stringRatio = this.computeStringRatios(); // 0..1
        this.inlayFrets  = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];

        // géométrie projetée (pixels)
        this.frets   = [];
        this.cases   = [];
        this.strings = [];
        this.inlays  = [];

        this.projectGeometry();
    }

    // ============================================================
    // LOGIQUE (RATIOS)
    // ============================================================

    computeFretRatios() {
        const arr = [];
        const max = this.fretCount + 1;

        for (let i = 0; i <= max; i++) {
            arr[i] = 1 - 1 / Math.pow(2, i / 12);
        }

        const scale = arr[max];
        for (let i = 0; i <= max; i++) {
            arr[i] /= scale;
        }

        return arr;
    }

    computeStringRatios() {
        const arr = [];
        const n = 6;

        const usable = 0.9;      // zone verticale utilisée
        const margin = (1 - usable) / 2;
        const spacing = usable / (n - 1);

        for (let i = 0; i < n; i++) {
            arr[i] = margin + i * spacing;
        }

        return arr;
    }

    // ============================================================
    // GETTERS LOGIQUES
    // ============================================================

    getThickness() { return this.h; }
    getLength()    { return this.w; }

    getStringLabelOffset() {
        return this.getThickness() * 0.25;
    }

    getNeckRect() {
        return {
            x: this.x,
            y: this.y,
            w: this.w,
            h: this.h
        };
    }

    getNutWidth() {
        return this.getThickness() / 20;
    }

    // ============================================================
    // PROJECTION GEOMETRIE (RATIOS -> PIXELS)
    // ============================================================

    projectGeometry() {
        const t = this.getThickness();
        const L = this.getLength();

        const offLabel = this.getStringLabelOffset();
        const nutW     = this.getNutWidth();

        const neckX = this.x;
        const neckY = this.y;
        const neckW = L;
        const neckH = t;

        // ---------- FRETTES ----------
        const frets = [];

        // frette 0 = sillet (position spéciale)
        const nutX = neckX + offLabel + nutW;
        frets.push({
            index: 0,
            x: nutX,
            y: neckY,
            w: nutW,
            h: neckH
        });

        const fw = t * 0.05;

        for (let i = 1; i <= this.fretCount; i++) {
            const r = this.fretRatio[i]; // 0..1
            const x = nutX + (neckW - offLabel - nutW * 2) * r;

            frets.push({
                index: i,
                x,
                y: neckY,
                w: fw,
                h: neckH
            });
        }

        this.frets = frets;

        // ---------- CASES ----------
        const cases = [];
        for (let i = 0; i < this.fretCount; i++) {
            const f1 = frets[i];
            const f2 = frets[i + 1];

            const x1 = f1.x;
            const x2 = f2.x;
            const width = x2 - x1;

            cases.push({
                index: i,
                x1,
                x2,
                xc: (x1 + x2) * 0.5,
                width,
                y: neckY,
                h: neckH
            });
        }
        this.cases = cases;

        // ---------- CORDES ----------
        const strings = [];
        for (let i = 0; i < this.stringRatio.length; i++) {
            const ry = this.stringRatio[i];
            const y  = neckY + neckH * ry;
            const thick = this.getStringThickness(i);

            strings.push({
                index: i,
                x: neckX,
                y,
                w: neckW,
                h: thick
            });
        }
        this.strings = strings;

        // ============================================================
        // ---------- INLAYS (NOUVELLE VERSION ENTRE LES CORDES) ------
        // ============================================================

        const inlays = [];
        const s = this.strings;

        for (const f of this.inlayFrets) {
            if (f >= this.cases.length) continue;
            const c = this.cases[f];
            const x = c.xc;

            const isDouble = (f === 12 || f === 24);

            if (this.inlayStyle === "trapeze") {
                const y = this.y + this.h * 0.5;
                inlays.push({
                    type: "trapeze",
                    fret: f,
                    x,
                    y,
                    caseWidth: c.width
                });
            }
            else if (this.inlayStyle === "superstrat") {
                const ySingle  = (s[0].y + s[1].y) * 0.5;
                const yDouble1 = (s[0].y + s[1].y) * 0.5;
                const yDouble2 = (s[1].y + s[2].y) * 0.5;

                if (isDouble) {
                    inlays.push({ type: "dot", fret: f, x, y: yDouble1 });
                    inlays.push({ type: "dot", fret: f, x, y: yDouble2 });
                } else {
                    inlays.push({ type: "dot", fret: f, x, y: ySingle });
                }
            }
            else { // dots classiques
                const ySingle  = (s[2].y + s[3].y) * 0.5;
                const yDouble1 = (s[1].y + s[2].y) * 0.5;
                const yDouble2 = (s[3].y + s[4].y) * 0.5;

                if (isDouble) {
                    inlays.push({ type: "dot", fret: f, x, y: yDouble1 });
                    inlays.push({ type: "dot", fret: f, x, y: yDouble2 });
                } else {
                    inlays.push({ type: "dot", fret: f, x, y: ySingle });
                }
            }
        }

        this.inlays = inlays;
    }

    // ============================================================
    // CONVERSIONS COORDONNÉES
    // ============================================================

    toScreen(fretIndex, stringIndex) {
        const c = this.cases[fretIndex];
        const s = this.strings[stringIndex];
        if (!c || !s) return null;
        return { x: c.xc, y: s.y };
    }

    fromScreen(x, y) {
        let fret = null;
        let string = null;

        for (const c of this.cases) {
            if (x >= c.x1 && x <= c.x2) {
                fret = c.index;
                break;
            }
        }

        let bestDy = Infinity;
        for (const s of this.strings) {
            const dy = Math.abs(y - s.y);
            if (dy < bestDy) {
                bestDy = dy;
                string = s.index;
            }
        }

        if (fret == null || string == null) return null;
        return { fret, string };
    }

    // ============================================================
    // CORDES
    // ============================================================

    getStringThickness(i) {
        const t = this.getThickness();
        return (t * 0.020) - (i / 5) * (t * 0.012);
    }

    getStrings() {
        return this.strings;
    }

    drawStringShadow(s, t) {
        const off  = t * 1.5;
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

            fill(150);
            rect(s.x, s.y, s.w, s.h);

            fill(230);
            rect(s.x, s.y, s.w, s.h * 0.4);
        }
    }

    // ============================================================
    // FRETTES
    // ============================================================

    getFrets() {
        return this.frets;
    }

drawFrets() {
    const frets = this.getFrets();

    for (const f of frets) {

        // position centrée
        const x0 = f.x - f.w * 0.5;

        if (f.index === 0) {
            // ---------- SILLET ----------
            fill(240);
            noStroke();
            rect(x0, f.y, f.w, f.h);

            fill(0, 50);
            rect(x0 - f.w * 0.2, f.y, f.w * 0.2, f.h);

            fill(0, 35);
            rect(x0 + f.w, f.y, f.w * 0.3, f.h);

            continue;
        }

        // ---------- FRETTES NORMALES ----------

        // ombre large
        fill(0, 40);
        rect(x0 - f.w * 0.3, f.y, f.w * 1.6, f.h);

        // métal
        fill(220);
        rect(x0, f.y, f.w, f.h, f.w * 0.3);

        // highlight
        fill(255);
        rect(x0, f.y, f.w * 0.8, f.h * 0.25, f.h * 0.25, 0, 0);

        // rainure sombre
        fill(100);
        rect(
            x0 + f.w * 0.3,
            f.y + f.w * 0.3,
            f.w * 0.6,
            f.h * 0.97,
            f.w * 0.98
        );
    }
}


    drawHead() {
        const frets = this.getFrets();
        const nut = frets[0];

        const x0 = this.x;
        const y0 = this.y;
        const w0 = nut.x - this.x;
        const h0 = this.h;

        noStroke();
        fill(0, 40);
        rect(x0, y0, w0, h0);
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
    // INLAYS
    // ============================================================

    getInlayColor() {
        if (this.woodColor === "rosewood" || this.woodColor === "ebony") {
            return color(255);
        }
        return color(0);
    }

    drawInlayDot(x, y, t) {
        const r = t * 0.10;
        fill(this.getInlayColor());
        noStroke();
        circle(x, y, r);
    }

    drawInlaySuperstrat(x, y, t) {
        const r = t * 0.12;
        fill(this.getInlayColor());
        noStroke();
        circle(x, y, r);
    }

drawInlayTrapeze(x, y, t, caseWidth) {
    const s = this.strings;
    if (!s || s.length < 5) return;

    // Hauteur totale du manche
    const neckH = this.h;

    // ================================
    // VALEURS À AJUSTER (en % du manche)
    // ================================
    const leftHeightPct  = 0.65;   // côté gauche = 55% de la hauteur du manche
    const rightHeightPct = 0.30;   // côté droit  = 30% de la hauteur du manche
    // ================================

    // Hauteurs réelles
    const leftHeight  = neckH * leftHeightPct;
    const rightHeight = neckH * rightHeightPct;

    // Position verticale centrée sur les 4 cordes intérieures
    const yCenter = (s[2].y + s[3].y) * 0.5;

    const topLeftY     = yCenter - leftHeight  * 0.5;
    const bottomLeftY  = yCenter + leftHeight  * 0.5;

    const topRightY    = yCenter - rightHeight * 0.5;
    const bottomRightY = yCenter + rightHeight * 0.5;

    // Position horizontale (à ajuster si tu veux)
    const leftX  = x - caseWidth * 0.30;
    const rightX = x + caseWidth * 0.30;

    fill(this.getInlayColor());
    noStroke();

    quad(
        leftX,  topLeftY,      // côté gauche (long)
        rightX, topRightY,     // côté droit (court)
        rightX, bottomRightY,
        leftX,  bottomLeftY
    );
}







    drawInlays() {
        const t = this.getThickness();

        for (const inlay of this.inlays) {
            if (inlay.type === "trapeze") {
                this.drawInlayTrapeze(inlay.x, inlay.y, t, inlay.caseWidth);
            } else if (this.inlayStyle === "superstrat") {
                this.drawInlaySuperstrat(inlay.x, inlay.y, t);
            } else {
                this.drawInlayDot(inlay.x, inlay.y, t);
            }
        }
    }

    // ============================================================
    // DRAW
    // ============================================================

    draw() {
        // si responsive / zoom change ailleurs, penser à rappeler projectGeometry()
        this.projectGeometry();

        const neck = this.getNeckRect();
        fill(this.getWoodFill());
        stroke(40);
        strokeWeight(2);
        rect(neck.x, neck.y, neck.w, neck.h);

        this.drawInlays();
        this.drawHead();
        this.drawStringShadows();
        this.drawFrets();
        this.drawStrings();

        if (this.debug) {
            this.drawDebugRect();
            this.drawDebugInfo();
        }
    }

    drawDebugInfo() {
        const x = this.x;
        const y = this.y;
        const w = this.getLength();
        const h = this.getThickness();

        const ratio = (w / h).toFixed(2);

        fill(0, 180);
        noStroke();
        rect(x + 10, y + 10, 260, 110, 6);

        fill(255);
        textSize(12);
        textAlign(LEFT, TOP);

        text(
            "DEBUG GUITAR\n" +
            `x: ${x.toFixed(1)}\n` +
            `y: ${y.toFixed(1)}\n` +
            `w: ${w.toFixed(1)}\n` +
            `h: ${h.toFixed(1)}\n` +
            `ratio: ${ratio}\n` +
            `frets: ${this.fretCount}\n` +
            `cases: ${this.cases.length}`,
            x + 18,
            y + 16
        );
    }
}
