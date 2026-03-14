class NoteRenderer {
    constructor(guitar, style) {
        this.g = guitar;
        this.style = style;
    }

    // ------------------------------------------------------------
    // PALETTE
    // ------------------------------------------------------------
    getColors(ghost) {
        return {
            blanc: ghost ? "#ffffff8c" : 255,
            noir:  ghost ? "#00000085" : 0,
            textShadowSquare: "#00000076",
            textShadowCircle: "#ffffff7d",
            textMainSquare:   "#ffffff78",
            cursorColor:      "red",
            shadowColor:      [0, 80]
        };
    }

    // ------------------------------------------------------------
    // 1. SHADOW
    // ------------------------------------------------------------
    drawShadow(x, y, shapeType, R, OFFSET, shadowColor) {
        noStroke();
        fill(shadowColor[0], shadowColor[1]);

        if (shapeType === "square") {
            rectMode(CENTER);
            rect(x + OFFSET, y + OFFSET, R, R, R * 0.2);
        } else {
            ellipse(x + OFFSET, y + OFFSET, R, R);
        }
    }

    // ------------------------------------------------------------
    // 2. OUTER CONTOUR (noir)
    // ------------------------------------------------------------
    drawOuter(x, y, shapeType, R, OFFSET, noir, STROKE, cursor, cursorColor) {
        strokeWeight(STROKE);

        if (shapeType === "square") {
            rectMode(CENTER);
            stroke(noir);
            rect(x - OFFSET, y - OFFSET, R, R, R * 0.2);

            if (cursor) {
                stroke(cursorColor);
                strokeWeight(STROKE * 2);
                rect(x - OFFSET, y - OFFSET, R * 1.1, R, R * 0.2);
            }

        } else {
            stroke(noir);
            circle(x - OFFSET, y - OFFSET, R);

            if (cursor) {
                stroke(cursorColor);
                strokeWeight(STROKE * 2);
                circle(x - OFFSET, y - OFFSET, R * 1.1);
            }
        }
    }

    // ------------------------------------------------------------
    // 3. INNER CONTOUR (blanc)
    // ------------------------------------------------------------
    drawInner(x, y, shapeType, R, OFFSET, blanc) {
        stroke(blanc);

        if (shapeType === "square") {
            rectMode(CENTER);
            rect(x - OFFSET, y - OFFSET, R, R, R * 0.2);
        } else {
            circle(x - OFFSET, y - OFFSET, R * 0.9);
        }
    }

    // ------------------------------------------------------------
    // 4. LABEL (texte + altérations)
    // ------------------------------------------------------------
    drawLabel(x, y, shapeType, R, OFFSET, label, strokeColor, ghost, colors) {
        const { base, alt, type } = label;

        noStroke();
        textAlign(CENTER, CENTER);
        textStyle(BOLD);

        // Taille du texte principal
        textSize(R * (base.length === 3 ? 0.50 : 0.65));

        let targetWidth = R * 0.65;
        let w = textWidth(base);

        if (w > targetWidth) {
            let factor = targetWidth / w;
            textSize((R * (base.length === 3 ? 0.50 : 0.65)) * factor);
        }

        // Ombre du texte
        fill(shapeType === "square" ? colors.textShadowSquare : colors.textShadowCircle);
        text(base, x - OFFSET + 1, y - OFFSET + 1);

        // Texte principal (corrigé)
        const mainTextColor =
            shapeType === "square"
                ? colors.textMainSquare
                : (ghost ? colors.noir : strokeColor);

        fill(mainTextColor);
        text(base, x - OFFSET, y - OFFSET);

        // Altération (#, b)
        if (alt) {
            textSize(R * 0.90);

            let ax = x - OFFSET;
            let ay = y - OFFSET - R * 0.15;

            ax += this.style.altAdjustX ?? 0;
            ay += this.style.altAdjustY ?? 0;

            if (type === "degree") ax -= R * 0.30;
            else ax += R * 0.45;

            // Ombre alt
            fill(shapeType === "square" ? colors.textShadowSquare : colors.textShadowCircle);
            text(alt, ax + 1, ay + 1);

            // Altération
            fill(shapeType === "square" ? colors.blanc : strokeColor);
            text(alt, ax, ay);
        }

        textStyle(NORMAL);
    }

    // ------------------------------------------------------------
    // MAIN DRAW
    // ------------------------------------------------------------
    draw(x, y, opts = {}) {

        let {
            fillColor = color("#ffffff"),
            strokeColor = "black",
            shapeType = "circle",
            hasShadow = false,
            label = null,
            cursor = null,
            ghost = false, 
            zoomFactor = 1,
            xOffset = 0,
            yOffset = 0
        } = opts;

        x += xOffset;
        y += yOffset;

        if (!label) return;

        const colors = this.getColors(ghost);
        const { blanc, noir } = colors;

        const { base, chroma } = label;

        // Couleur chromatique
        if (chroma != null && this.style?.getChromaColor) {
            const chromaCol = this.style.getChromaColor(chroma);
            if (chromaCol) fillColor = chromaCol;
        }

        const R = this.g.getThickness() * 0.17 * zoomFactor;
        const STROKE = R / 10;

        // OFFSET normal
        let OFFSET = hasShadow ? (R / 12) : 0;

        // ------------------------------------------------------------
        // ANIMATION GHOST (sinus)
        // ------------------------------------------------------------
        if (ghost) {
            const t = millis() * 0.005;       // vitesse
            const anim = Math.sin(t) * (R * 0.05); // amplitude
            OFFSET += anim;
        }

        push();

        // 1. Ombre
        if (hasShadow) {
            this.drawShadow(x, y, shapeType, R, OFFSET, colors.shadowColor);
        }

        // 2. Fond
        fill(fillColor);
        stroke(strokeColor);
        strokeWeight(STROKE);

        if (base === "") {
            fill(this.g.woodColor == 'rosewood' ? blanc : noir);
        }

        if (shapeType === "square") {
            rectMode(CENTER);
            rect(x - OFFSET, y - OFFSET, R, R, R * 0.2);
        } else {
            circle(x - OFFSET, y - OFFSET, R);
        }

        // 3. Contour externe
        this.drawOuter(x, y, shapeType, R, OFFSET, noir, STROKE, cursor, colors.cursorColor);

        // 4. Contour interne
        this.drawInner(x, y, shapeType, R, OFFSET, blanc);

        // 5. Label
        this.drawLabel(x, y, shapeType, R, OFFSET, label, strokeColor, ghost, colors);

        pop();
    }
}
