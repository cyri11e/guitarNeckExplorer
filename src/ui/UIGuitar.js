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
        this.fretCount = cfg.fretCount ?? 24;

        this.inlayStyle = cfg.inlayStyle ?? "dots"; 
        // "dots", "superstrat", "trapeze"


    }

    // ============================================================
    // GETTERS LOGIQUES
    // ============================================================

    getThickness() { return this.h; }
    getLength()    { return this.w; }

    // espace pour les labels EADGBE (~ 1/4 de case)
    getStringLabelOffset() {
        return this.getThickness() * 0.25;
    }

    getNeckRect() {
        const off = this.getStringLabelOffset();
        return {
            x: this.x,
            y: this.y,
            w: this.w, 
            h: this.h
        };
    }

    getNutRect() {
        const t   = this.getThickness();
        const off = this.getStringLabelOffset();
        const nutW = t / 20;
        return {
            x: this.x + off + nutW,
            y: this.y,
            w: nutW,
            h: t
        };
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
        const t   = this.getThickness();
        const L   = this.getLength();
        const offX = 0;

        const usable  = t * 0.95;
        const margin  = (t - usable) / 2;
        const spacing = usable / 5;

        for (let i = 0; i < 6; i++) {
            const offY  = margin + i * spacing + this.getStringRadiusOffset(i);
            const thick = this.getStringThickness(i);

            arr.push({
                x: this.x + offX,
                y: this.y + offY,
                w: L - offX,
                h: thick
            });
        }
        return arr;
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
    const arr  = [];
    const t    = this.getThickness();
    const L    = this.getLength();
    const offX = this.getStringLabelOffset();

    const nut  = this.getNutRect();
    const nutFrontX = nut.x + nut.w;

    const fw   = t * 0.05;

    // ⭐ recalibrage pour que la frette (N+1) tombe pile au bout du manche
    const fN1 = 1 - 1 / Math.pow(2, (this.fretCount + 1) / 12);
    const Ls  = (L - offX - nut.w) / fN1;

    // frette 0 = sillet
    arr.push({
        index: 0,
        x: nut.x,
        y: this.y,
        w: nut.w,
        h: t
    });

    for (let i = 1; i <= this.fretCount; i++) {
        const posOnScale = Ls - (Ls / Math.pow(2, i / 12));
        const xFret      = nutFrontX + posOnScale;

        arr.push({
            index: i,
            x: xFret,
            y: this.y,
            w: fw,
            h: t
        });
    }

    return arr;
}




drawFrets() {
    const frets = this.getFrets();

    for (const f of frets) {

        if (f.index === 0) {
            // ⭐ SILLET (frette 0)
            fill(240);
            noStroke();
            rect(f.x, f.y, f.w, f.h);

            // ombre gauche
            fill(0, 50);
            rect(f.x - f.w * 0.2, f.y, f.w * 0.2, f.h);

            // ombre droite
            fill(0, 35);
            rect(f.x + f.w, f.y, f.w * 0.3, f.h);

            continue;
        }

        // ⭐ FRETTES NORMALES

        // ombre
        fill(0, 40);
        rect(f.x - f.w * 0.3, f.y, f.w * 1.6, f.h);

        // métal
        fill(220);
        rect(f.x, f.y, f.w, f.h, f.w * 0.3);

        // reflet clair
        fill(255);
        rect(f.x, f.y, f.w * 0.8, f.h * 0.25, f.h * 0.25, 0, 0);

        // reflet sombre
        fill(100);
        rect(
            f.x + f.w * 0.3,
            f.y + f.w * 0.3,
            f.w * 0.6,
            f.h * 0.97,
            f.w * 0.98
        );
    }
}
drawHead()// Ombre uniforme avant le sillet (tête inclinée)
{
    const frets = this.getFrets();
    const nut = frets[0]; // frette 0 = sillet

    const x0 = this.x;
    const y0 = this.y;
    const w0 = nut.x - this.x;
    const h0 = this.h;

    noStroke();
    fill(0, 40); // ombre douce mais uniforme
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

/* -------------------------------------------------------
   INLAYS (repères de touche)
------------------------------------------------------- */

// Couleur auto selon le bois
getInlayColor() {
    // bois sombres → repères blancs
    if (this.woodColor === "rosewood" || this.woodColor === "ebony") {
        return color(255);
    }
    // bois clairs → repères noirs
    return color(0);
}

// Cases qui reçoivent un repère
getInlayFrets() {
    return [3, 5, 7, 9, 12, 15, 17, 19, 21];
}

/* -------------------------
   Styles de repères
------------------------- */

// Dots traditionnels (Fender)
drawInlayDot(x, y, t) {
    const r = t * 0.10;
    fill(this.getInlayColor());
    noStroke();
    circle(x, y, r);
}

// Superstrat (Ibanez / Jackson)
drawInlaySuperstrat(x, y, t) {
    const r = t * 0.12;
    fill(this.getInlayColor());
    noStroke();
    circle(x, y - t * 0.25, r);
}

// Trapèze (Les Paul)
drawInlayTrapeze(x, y, t) {
    const w = t * 0.30;
    const h = t * 0.18;

    fill(this.getInlayColor());
    noStroke();
    quad(
        x - w * 0.5, y - h * 0.5,
        x + w * 0.5, y - h * 0.5,
        x + w * 0.3, y + h * 0.5,
        x - w * 0.3, y + h * 0.5
    );
}

/* -------------------------
   Dessin principal des repères
------------------------- */

drawInlays() {
    const frets = this.getFrets();
    const t = this.getThickness();
    const yCenter = this.y + t * 0.5;

    const inlays = this.getInlayFrets();

    for (const f of inlays) {
        if (f >= this.fretCount) continue;

        const f1 = frets[f];
        const f2 = frets[f + 1];

        const x = (f1.x + f2.x) * 0.5;

        if (this.inlayStyle === "dots") {
            this.drawInlayDot(x, yCenter, t);
        }
        else if (this.inlayStyle === "superstrat") {
            this.drawInlaySuperstrat(x, yCenter, t);
        }
        else if (this.inlayStyle === "trapeze") {
            this.drawInlayTrapeze(x, yCenter, t);
        }
    }
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


        this.drawInlays();

        this.drawHead();
        // ombres cordes
        this.drawStringShadows();

        // frettes
        this.drawFrets();

        // cordes
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
    rect(x + 10, y + 10, 220, 90, 6);

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
        `frets: ${this.fretCount}`,
        x + 18,
        y + 16
    );
}

}
