class NoteRenderer {
    constructor(guitar, style) {
        this.g = guitar;
        this.style = style;
    }

    // ------------------------------------------------------------
    // PALETTE
    // ------------------------------------------------------------
    getColors(ghost, overlayAlpha = null) {
        const hasOverlay = overlayAlpha != null;
        const a = hasOverlay ? constrain(overlayAlpha, 0, 255) : 255;
        return {
            blanc: ghost ? "#ffffff8c" : (hasOverlay ? color(255, 255, 255, a) : 255),
            noir:  ghost ? "#00000085" : (hasOverlay ? color(0, 0, 0, a) : 0),
            textShadowSquare: "#00000076",
            textShadowCircle: "#ffffff7d",
            textMainSquare:   "#ffffff78",
            cursorColor:      hasOverlay ? color(255, 0, 0, a) : "red",
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
            overlayAlpha = null,
            zoomFactor = 1,
            xOffset = 0,
            yOffset = 0
        } = opts;

        x += xOffset;
        y += yOffset;

        if (!label) return;

        let effectiveOverlayAlpha = overlayAlpha;

        const { base, chroma } = label;

        // Couleur chromatique
        if (chroma != null && this.style?.getChromaColor) {
            const chromaCol = this.style.getChromaColor(chroma);
            if (chromaCol) fillColor = chromaCol;
        }

        let R = this.g.getThickness() * 0.17 * zoomFactor;

// ------------------------------------------------------------
// ANIMATION : POP-IN
// ------------------------------------------------------------
if (opts.anim && opts.anim.type === "pop") {
    const t = constrain(opts.anim.t, 0, 1);
    const popCfg = this.g.anim?.note?.pop || {};

    // EASING "backOut" plus marqué
    const s = popCfg.backOutS ?? 2.2;
    const u = t - 1;
    const backOut = 1 + (s + 1) * u * u * u + s * u * u;

    // Démarre petit puis overshoot visible avant stabilisation
    const startScale = popCfg.startScale ?? 0.35;
    const popScale = lerp(startScale, 1, backOut);
    R *= popScale;

    // Montée plus franche au démarrage
    y -= R * (popCfg.lift ?? 0.22) * (1 - t);

    // Fade-in rapide de la pastille
    const popAlpha = lerp(popCfg.alphaStart ?? 110, popCfg.alphaEnd ?? 255, t);
    const popColor = color(fillColor);
    popColor.setAlpha(popAlpha);
    fillColor = popColor;
}

if (opts.anim && opts.anim.type === "popSeq") {
    const t = constrain(opts.anim.t, 0, 1);
    const popSeqCfg = this.g.anim?.note?.popSeq || {};

    // Sequence replay: pop plus court et plus compact
    const s = popSeqCfg.backOutS ?? 1.3;
    const u = t - 1;
    const backOut = 1 + (s + 1) * u * u * u + s * u * u;

    const startScale = popSeqCfg.startScale ?? 0.55;
    const popScale = lerp(startScale, 1, backOut);
    R *= popScale;

    y -= R * (popSeqCfg.lift ?? 0.10) * (1 - t);

    const popAlpha = lerp(popSeqCfg.alphaStart ?? 170, popSeqCfg.alphaEnd ?? 255, t);
    const popColor = color(fillColor);
    popColor.setAlpha(popAlpha);
    fillColor = popColor;
}

if (opts.anim && opts.anim.type === "popOut") {
    const t = constrain(opts.anim.t, 0, 1);
    const popOutCfg = this.g.anim?.note?.popOut || {};
    const easeOut = 1 - Math.pow(1 - t, popOutCfg.easePow ?? 3);

    // Pop-out visible: petit gonflement puis disparition
    const growSplit = popOutCfg.growSplit ?? 0.25;
    const shrinkStart = popOutCfg.shrinkStart ?? 0.15;
    const growPhase = min(t / growSplit, 1);
    const shrinkPhase = max((t - shrinkStart) / Math.max(1 - shrinkStart, 0.001), 0);
    const growScale = lerp(1.0, popOutCfg.growTo ?? 1.18, growPhase);
    const shrinkScale = lerp(1.0, popOutCfg.shrinkTo ?? 0.05, shrinkPhase);
    R *= growScale * shrinkScale;

    // Drift vertical plus visible
    y -= this.g.getThickness() * (popOutCfg.drift ?? 0.04) * easeOut;

    // Fade-out global
    const outAlpha = lerp(popOutCfg.alphaStart ?? 255, popOutCfg.alphaEnd ?? 0, easeOut);
    const outColor = color(fillColor);
    outColor.setAlpha(outAlpha);
    fillColor = outColor;

    if (effectiveOverlayAlpha == null) {
        effectiveOverlayAlpha = outAlpha;
    } else {
        effectiveOverlayAlpha = min(effectiveOverlayAlpha, outAlpha);
    }
}

if (opts.anim && opts.anim.type === "popOutSeq") {
    const t = constrain(opts.anim.t, 0, 1);
    const popOutSeqCfg = this.g.anim?.note?.popOutSeq || {};
    const easeOut = 1 - Math.pow(1 - t, popOutSeqCfg.easePow ?? 1.9);

    // Sequence fade-out pur: pas de scale, pas d'effet de retrecissement
    y -= this.g.getThickness() * (popOutSeqCfg.drift ?? 0.012) * easeOut;

    const outAlpha = lerp(popOutSeqCfg.alphaStart ?? 230, popOutSeqCfg.alphaEnd ?? 0, easeOut);
    const outColor = color(fillColor);
    outColor.setAlpha(outAlpha);
    fillColor = outColor;

    if (effectiveOverlayAlpha == null) {
        effectiveOverlayAlpha = outAlpha;
    } else {
        effectiveOverlayAlpha = min(effectiveOverlayAlpha, outAlpha);
    }
}

        const colors = this.getColors(ghost, effectiveOverlayAlpha);
        const { blanc, noir } = colors;


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
