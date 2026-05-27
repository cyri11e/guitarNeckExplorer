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

        const textShadowSquare = hasOverlay
            ? color(0, 0, 0, min(118, a))
            : "#00000076";

        const textShadowCircle = hasOverlay
            ? color(255, 255, 255, min(125, a))
            : "#ffffff7d";

        const textMainSquare = hasOverlay
            ? color(255, 255, 255, min(120, a))
            : "#ffffff78";

        const shadowAlpha = hasOverlay
            ? min(80, round(a * 0.32))
            : 80;

        return {
            blanc: ghost ? "#ffffff8c" : (hasOverlay ? color(255, 255, 255, a) : 255),
            noir:  ghost ? "#00000085" : (hasOverlay ? color(0, 0, 0, a) : 0),
            textShadowSquare,
            textShadowCircle,
            textMainSquare,
            cursorColor:      hasOverlay ? color(255, 0, 0, a) : "red",
            shadowColor:      [0, shadowAlpha]
        };
    }

    // Clone une couleur vers une instance locale pour eviter de modifier
    // des p5.Color partagees (palette chromatique, etc.).
    toLocalColor(src, alphaOverride = null) {
        const a = alphaOverride == null ? null : constrain(alphaOverride, 0, 255);

        if (src && src.levels && Array.isArray(src.levels)) {
            const lv = src.levels;
            return color(lv[0], lv[1], lv[2], a == null ? lv[3] : a);
        }

        if (Array.isArray(src) && src.length >= 3) {
            return color(src[0], src[1], src[2], a == null ? (src[3] ?? 255) : a);
        }

        if (typeof src === "object" && src && typeof src.length === "number" && src.length > 0) {
            const first = src[0];
            if (first && first.levels && Array.isArray(first.levels)) {
                const lv = first.levels;
                return color(lv[0], lv[1], lv[2], a == null ? lv[3] : a);
            }
        }

        try {
            const c = color(src ?? "#ffffff");
            if (a != null) c.setAlpha(a);
            return c;
        } catch (_) {
            return color(255, 255, 255, a == null ? 255 : a);
        }
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

    drawCursorOrbit(x, y, R, OFFSET, shapeType) {
        if (shapeType !== "circle") return;

        const cx = x - OFFSET;
        const cy = y - OFFSET;
        const orbitR = R * 0.53;
        const t = millis() * 0.0045;

        // Arcs jaunes rotatifs
        noFill();
        stroke(255, 214, 20, 230);
        strokeWeight(max(1, R * 0.07));
        arc(cx, cy, orbitR * 2, orbitR * 2, t, t + PI * 0.32);
        arc(cx, cy, orbitR * 2, orbitR * 2, t + PI * 0.98, t + PI * 1.30);

        // Pointilles dynamiques autour de la couronne
        noStroke();
        const dotCount = 8;
        for (let i = 0; i < dotCount; i++) {
            const a = t + (TWO_PI * i / dotCount);
            const px = cx + cos(a) * orbitR;
            const py = cy + sin(a) * orbitR;
            const pulse = 0.55 + 0.45 * sin(t * 2.1 + i * 0.85);
            const dotAlpha = 120 + 120 * pulse;
            const dotR = R * (0.03 + 0.03 * pulse);
            fill(255, 214, 20, dotAlpha);
            circle(px, py, dotR * 2);
        }
    }

    // ------------------------------------------------------------
    // 4. LABEL (texte + altérations)
    // ------------------------------------------------------------
    drawLabel(x, y, shapeType, R, OFFSET, label, strokeColor, ghost, colors, xOffset = 0, yOffset = 0) {
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

    drawSelectionCorners(x, y, R, OFFSET) {
        const cs = R * 0.34;
        const pad = R * 0.12;
        const x0 = x - OFFSET - R * 0.5 - pad;
        const x1 = x - OFFSET + R * 0.5 + pad;
        const y0 = y - OFFSET - R * 0.5 - pad;
        const y1 = y - OFFSET + R * 0.5 + pad;

        stroke(76, 255, 0);
        strokeWeight(max(1.2, R * 0.08));
        noFill();

        // coin haut-gauche
        line(x0, y0, x0 + cs, y0);
        line(x0, y0, x0, y0 + cs);

        // coin haut-droit
        line(x1, y0, x1 - cs, y0);
        line(x1, y0, x1, y0 + cs);

        // coin bas-gauche
        line(x0, y1, x0 + cs, y1);
        line(x0, y1, x0, y1 - cs);

        // coin bas-droit
        line(x1, y1, x1 - cs, y1);
        line(x1, y1, x1, y1 - cs);
    }

    drawBottomRightCornerLabel(x, y, R, OFFSET, textValue, labelColor = null) {
        if (!textValue) return;

        const pad = R * 0.12;
        const x1 = x - OFFSET + R * 0.5 + pad;
        const y1 = y - OFFSET + R * 0.5 + pad;
        const textX = x1 + R * 0.10;
        const textY = y1 - R * 0.20;
        const textScale = 2;

        textAlign(LEFT, CENTER);
        textStyle(BOLD);
        textSize(R * 0.30 * textScale);
        noStroke();
            fill(0, 0, 0, 220);
            text(textValue, textX + 1.5, textY + 1.5);
        fill(labelColor || color(76, 255, 0));
        text(textValue, textX, textY);
        textStyle(NORMAL);
    }

    drawNoTonicHint(x, y, R, OFFSET, strokeColor) {
        noStroke();
        textAlign(CENTER, CENTER);
        textStyle(BOLD);
        textSize(R * 0.36);

        const hx = x - OFFSET;
        const hy = y - OFFSET + R * 0.02;

        fill(140);
        text("?", hx, hy);

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
            cursorOrbit = false,
            ghost = false, 
            overlayAlpha = null,
            zoomFactor = 1,
            xOffset = 0,
            yOffset = 0,
            isSelected = false,
            bottomRightLabel = null,
            bottomRightLabelColor = null
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

        // Toujours travailler sur une copie locale pour eviter les effets de bord d'alpha.
        fillColor = this.toLocalColor(fillColor);

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
    const popColor = this.toLocalColor(fillColor, popAlpha);
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
    const popColor = this.toLocalColor(fillColor, popAlpha);
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
    const outColor = this.toLocalColor(fillColor, outAlpha);
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
    const outColor = this.toLocalColor(fillColor, outAlpha);
    fillColor = outColor;

    if (effectiveOverlayAlpha == null) {
        effectiveOverlayAlpha = outAlpha;
    } else {
        effectiveOverlayAlpha = min(effectiveOverlayAlpha, outAlpha);
    }
}

        const colors = this.getColors(ghost, effectiveOverlayAlpha);
        const { blanc, noir } = colors;

        if (effectiveOverlayAlpha != null) {
            strokeColor = this.toLocalColor(strokeColor, effectiveOverlayAlpha);
        }


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

        // 4b. Animation orbitale du curseur
        if (cursorOrbit) {
            this.drawCursorOrbit(x, y, R, OFFSET, shapeType);
        }

        // 5. Label
        this.drawLabel(x, y, shapeType, R, OFFSET, label, strokeColor, ghost, colors, xOffset, yOffset);

        if (label?.noTonicHint === true) {
            this.drawNoTonicHint(x, y, R, OFFSET, strokeColor);
        }

        // 6. Coins de sélection
        if (isSelected) {
            this.drawSelectionCorners(x, y, R, OFFSET);
        }

        if (bottomRightLabel) {
            this.drawBottomRightCornerLabel(x, y, R, OFFSET, bottomRightLabel, bottomRightLabelColor);
        }

        pop();
    }
}
