class NoteView {
    constructor(guitar, style) {
        this.g = guitar;
        this.style = style;

        // Animation interne
        this.anim = null; // { type: "fade"|"glow"|"burst", t:0 }
    }

    // ------------------------------------------------------------
    // Déclenche une animation
    // ------------------------------------------------------------
    setAnimation(type = "fade") {
        this.anim = { type, t: 0 };
    }

    // ------------------------------------------------------------
    // Mise à jour de l’animation
    // ------------------------------------------------------------
    update() {
        if (!this.anim) return;

        this.anim.t += 0.05;
        if (this.anim.t >= 1) {
            this.anim = null;
        }
    }

    // ------------------------------------------------------------
    // Rendu public (avec animation)
    // ------------------------------------------------------------
    draw(x, y, opts = {}) {

        // 1) Mise à jour animation
        this.update();

        // 2) On applique l’effet visuel AVANT le rendu
        let alpha = 255;
        let glow = 0;
        let burst = 0;

        if (this.anim) {
            const t = this.anim.t;

            if (this.anim.type === "fade") {
                alpha = 255 * (1 - t);
            }

            if (this.anim.type === "glow") {
                glow = 1 - t;
            }

            if (this.anim.type === "burst") {
                burst = t;
            }
        }

        // 3) On injecte alpha/glow/burst dans opts
        opts.alpha = alpha;
        opts.glow = glow;
        opts.burst = burst;

        // 4) Rendu interne (ton ancien drawNote)
        this._drawInternal(x, y, opts);
    }

    // ------------------------------------------------------------
    // Ton drawNote original (copié tel quel)
    // ------------------------------------------------------------
_drawInternal(x, y, opts = {}) {

    let {
        fillColor = color("#ffffff"),
        strokeColor = "black",
        shapeType = "circle",
        hasShadow = false,
        label = null,
        cursor = null,
        alpha = 255,
        glow = 0,
        burst = 0
    } = opts;

    if (!label) return;

    const { base, alt, type, chroma } = label;

    // Couleur chromatique
    if (chroma != null && this.style?.getChromaColor) {
        const chromaCol = this.style.getChromaColor(chroma);
        if (chromaCol) fillColor = chromaCol;
    }

    const r = this.g.getThickness() * 0.17;
    const weight = r / 10;
    const offset = hasShadow ? (r / 12) : 0;

    push();

    // ---------------------------------------
    // BURST (optionnel, mais non destructif)
    // ---------------------------------------
    if (burst > 0) {
        const br = r * (1 + burst * 1.5);
        noFill();
        stroke(255, 200 * (1 - burst));
        strokeWeight(2);
        circle(x, y, br);
    }

    // ---------------------------------------
    // GLOW (optionnel)
    // ---------------------------------------
    if (glow > 0) {
        noStroke();
        fill(255, 255, 0, 120 * glow);
        circle(x, y, r * 1.8);
    }

    // ---------------------------------------
    // Ombre
    // ---------------------------------------
    if (hasShadow) {
        noStroke();
        fill(0, 80);
        if (shapeType === "square") {
            rectMode(CENTER);
            rect(x + offset, y + offset, r, r, r * 0.2);
        } else {
            ellipse(x + offset, y + offset, r, r);
        }
    }

    // ---------------------------------------
    // Fond
    // ---------------------------------------
    fill(red(fillColor), green(fillColor), blue(fillColor), alpha);
    stroke(strokeColor);
    strokeWeight(weight);

    if (base === "") fill(this.g.woodColor == 'rosewood' ? 255 : 0);

    if (shapeType === "square") {
        rectMode(CENTER);
        stroke(255);
        rect(x - offset, y - offset, r, r, r * 0.2);

        if (cursor) {
            stroke('red');
            strokeWeight(weight * 2);
            rect(x - offset, y - offset, r * 1.1, r, r * 0.2);
        }

    } else {
        stroke(0);
        circle(x - offset, y - offset, r);
        stroke(255);
        circle(x - offset, y - offset, r * 0.9);

        if (cursor) {
            stroke('red');
            strokeWeight(weight * 2);
            circle(x - offset, y - offset, r * 1.1);
        }
    }

    // ---------------------------------------
    // Texte principal
    // ---------------------------------------
    noStroke();
    textAlign(CENTER, CENTER);
    textStyle(BOLD);

    textSize(r * (base.length === 3 ? 0.50 : 0.65));

    let targetWidth = r * 0.65;
    let w = textWidth(base);

    if (w > targetWidth) {
        let factor = targetWidth / w;
        textSize((r * (base.length === 3 ? 0.50 : 0.65)) * factor);
    }

    // ombre du texte
    fill(shapeType === "square" ? "#00000076" : "#ffffff7d");
    text(base, x - offset + 1, y - offset + 1);

    // texte principal
    fill(shapeType === "square" ? 255 : strokeColor);
    text(base, x - offset, y - offset);

    // ---------------------------------------
    // Altération (#, b)
    // ---------------------------------------
    if (alt) {
        textSize(r * 0.90);

        let ax = x - offset;
        let ay = y - offset - r * 0.15;

        ax += this.style.altAdjustX ?? 0;
        ay += this.style.altAdjustY ?? 0;

        if (type === "degree") ax -= r * 0.30;
        else ax += r * 0.45;

        fill(shapeType === "square" ? "#00000076" : "#ffffff7d");
        text(alt, ax + 1, ay + 1);

        fill(shapeType === "square" ? 255 : strokeColor);
        text(alt, ax, ay);
    }

    textStyle(NORMAL);
    pop();
}

}


class NoteAnimator {
    constructor() {
        this.active = new Map(); // key "string-fret" → { type, t }
        this.mode = "fade"; // "fade" | "glow" | "burst"
    }

    // ------------------------------------------------------------
    // Déclenche une animation sur une note
    // ------------------------------------------------------------
    trigger(string, fret) {
        const key = `${string}-${fret}`;
        this.active.set(key, { type: this.mode, t: 0 });
    }

    // ------------------------------------------------------------
    // Mise à jour globale (appelée 1x par frame)
    // ------------------------------------------------------------
    update() {
        for (const [key, anim] of this.active) {
            anim.t += 0.05;
            if (anim.t >= 1) this.active.delete(key);
        }
    }

    // ------------------------------------------------------------
    // Retourne les paramètres d’animation pour une note
    // ------------------------------------------------------------
    getParams(string, fret) {
        const key = `${string}-${fret}`;
        const anim = this.active.get(key);

        if (!anim) {
            return { alpha: 255, glow: 0, burst: 0 };
        }

        const t = anim.t;

        switch (anim.type) {
            case "fade":
                return { alpha: 255 * (1 - t), glow: 0, burst: 0 };

            case "glow":
                return { alpha: 255, glow: 1 - t, burst: 0 };

            case "burst":
                return { alpha: 255, glow: 0, burst: t };

            default:
                return { alpha: 255, glow: 0, burst: 0 };
        }
    }
}
