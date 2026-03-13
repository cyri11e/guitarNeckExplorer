class NoteRenderer {
    constructor(guitar, style) {
        this.g = guitar;
        this.style = style;
    }

    draw(x, y, opts = {}) {

        let {
            fillColor = color("#ffffff"),
            strokeColor = "black",
            shapeType = "circle",
            hasShadow = false,
            label = null,
            cursor = null
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

        // Ombre
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

        // Fond
        fill(fillColor);
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

        // Texte principal
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

        fill(shapeType === "square" ? "#00000076" : "#ffffff7d");
        text(base, x - offset + 1, y - offset + 1);

        fill(shapeType === "square" ? 255 : strokeColor);
        text(base, x - offset, y - offset);

        // Altération (#, b)
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
