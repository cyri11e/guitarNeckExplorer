// ============================================================
// GUITAR RENDERER
// ============================================================

class GuitarRenderer {
    constructor(guitar, style) {
        this.g = guitar;
        this.style = style;
        this.detectPlatformAdjustments();
    }
    
detectPlatformAdjustments() {
    const ua = navigator.userAgent;

    // Valeurs par défaut
    this.altAdjustX = 0;
    this.altAdjustY = 0;

    // Windows → chasse plus large, altérations trop espacées
    if (ua.includes("Windows")) {
        this.altAdjustX = -1;
        this.altAdjustY = -0.5;
    }

    // macOS → chasse plus serrée, altérations trop proches
    else if (ua.includes("Mac OS")) {
        this.altAdjustX = +0.5;
        this.altAdjustY = 0;
    }

    // Linux → souvent rendu plus brut
    else if (ua.includes("Linux")) {
        this.altAdjustX = -0.5;
        this.altAdjustY = -0.5;
    }

    // iOS / Android → fontes mobiles, altérations trop hautes
    else if (/iPhone|iPad|Android/.test(ua)) {
        this.altAdjustX = 0;
        this.altAdjustY = +1;
    }
}

    // ------------------------------------------------------------
    // CORDES
    // ------------------------------------------------------------

    drawStringShadow(s, t) {
        const off  = t * 1.5;
        const size = t * 0.8;

        fill(0, 20);
        noStroke();
        rect(s.x, s.y + off, s.w, size);
    }

    drawStringShadows() {
        const strings = this.g.strings;
        for (let i = 0; i < strings.length; i++) {
            this.drawStringShadow(strings[i], this.style.getStringThickness(i));
        }
    }

  drawStrings() {
    const strings = this.g.strings;

    for (let i = 0; i < strings.length; i++) {
        const s = strings[i];

        // Base de la corde
        fill(100);
        rect(s.x, s.y, s.w, s.h);

        // Reflet
        fill(230);
        rect(s.x, s.y, s.w, s.h * 0.4);

        push();
        // -------------------------------------------------
        // CORDES WOUND (les 3 graves)
        // -------------------------------------------------
        if (i < 3) {  // i=3,4,5 → cordes graves (E,A,D)
            const step = s.h * 0.35;   // espacement des spires
            const thickness = s.h * 0.15;

            stroke(100);
            strokeWeight(thickness);

            for (let x = s.x; x < s.x + s.w; x += step) {
                line(x, s.y, x, s.y + s.h);
            }
        }
        pop();
    }
}


    // ------------------------------------------------------------
    // FRETTES
    // ------------------------------------------------------------

drawFrets() {
    const frets = this.g.frets;

    // Paramètre unique : épaisseur de la frette
    const fretThickness = 0.8;   // ← ajuste ici (1.0 = rendu actuel)

    for (const f of frets) {

        const x0 = f.x - f.w * 0.5;

        // Largeurs dérivées du paramètre
        const wMain   = f.w * fretThickness;        // largeur principale
        const wShadow = wMain * 0.3;                // ombre latérale
        const wBright = wMain * 0.8;                // highlight
        const hBright = f.h * 0.25;                 // hauteur highlight
        const rCorner = wMain * 0.3;                // arrondi
        const rBright = f.h * 0.25;                 // arrondi highlight

        if (f.index === 0) {
            // Sillet (frette 0)
            fill(240);
            noStroke();
            rect(x0, f.y, wMain, f.h);

            fill(0, 50);
            rect(x0 - wShadow, f.y, wShadow, f.h);

            fill(0, 35);
            rect(x0 + wMain, f.y, wShadow, f.h);

            continue;
        }

        // Ombre large derrière la frette
        fill(0, 40);
        rect(x0 - wShadow, f.y, wMain + wShadow * 2, f.h);

        // Corps principal de la frette
        fill(220);
        rect(x0, f.y, wMain, f.h, rCorner);

        // Highlight supérieur
        fill(255);
        rect(x0, f.y, wBright, hBright, rBright, 0, 0);

        // Ombre interne
        fill(100);
        rect(
            x0 + wMain * 0.3,
            f.y + wMain * 0.3,
            wMain * 0.6,
            f.h * 0.97,
            wMain * 0.98
        );
    }
}


    drawHead() {
        const frets = this.g.frets;
        const nut = frets[0];

        const x0 = this.g.x;
        const y0 = this.g.y;
        const w0 = nut.x - this.g.x;
        const h0 = this.g.h;

        noStroke();
        fill(0, 40);
        rect(x0, y0, w0, h0);
    }

    // ------------------------------------------------------------
    // INLAYS
    // ------------------------------------------------------------

    drawInlayDot(x, y, t) {
        const r = t * 0.10;
        fill(this.style.getInlayColor());
        noStroke();
        circle(x, y, r);
    }

    drawInlaySuperstrat(x, y, t) {
        const r = t * 0.08;
        fill(this.style.getInlayColor());
        noStroke();
        circle(x, y, r);
    }

    drawInlayTrapeze(x, y, t, caseWidth) {
        const s = this.g.strings;
        if (!s || s.length < 5) return;

        const neckH = this.g.h;

        const leftHeightPct  = 0.65;
        const rightHeightPct = 0.30;

        const leftHeight  = neckH * leftHeightPct;
        const rightHeight = neckH * rightHeightPct;

        const yCenter = (s[2].y + s[3].y) * 0.5;

        const topLeftY     = yCenter - leftHeight  * 0.5;
        const bottomLeftY  = yCenter + leftHeight  * 0.5;

        const topRightY    = yCenter - rightHeight * 0.5;
        const bottomRightY = yCenter + rightHeight * 0.5;

        const leftX  = x - caseWidth * 0.30;
        const rightX = x + caseWidth * 0.30;

        fill(this.style.getInlayColor());
        noStroke();

        quad(
            leftX,  topLeftY,
            rightX, topRightY,
            rightX, bottomRightY,
            leftX,  bottomLeftY
        );
    }

    drawInlays() {
        const t = this.g.getThickness();

        for (const inlay of this.g.inlays) {
            if (inlay.type === "trapeze") {
                this.drawInlayTrapeze(inlay.x, inlay.y, t, inlay.caseWidth);
            } else if (this.g.inlayStyle === "superstrat") {
                this.drawInlaySuperstrat(inlay.x, inlay.y, t);
            } else {
                this.drawInlayDot(inlay.x, inlay.y, t);
            }
        }
    }

drawNoteOnFretboard(label, string, fret, color = null, isHover = false) {
    const g = this.g;

    // Position sur le manche
    const c = g.cases[fret];
    const s = g.strings[string - 1];
    if (!c || !s) return;

    const x = c.xc;
    const y = s.y;

    const t = g.getThickness();
    const r = t * (isHover ? 0.16 : 0.18);

    // Couleur
    if (color) fill(color);
    else fill(isHover ? "yellow" : "red");

    noStroke();
    circle(x, y, r);

    // Label
    textAlign(CENTER, CENTER);
    textSize(t * 0.12);
    fill(0);
    text(label, x, y);
}

drawNote(x, y, opts = {}) {

    let {
        fillColor = color("#ffffff"),
        strokeColor = "black",
        strokeW = 1,
        shapeType = "circle",
        opacity = 255,
        hasShadow = false,
        label = null
    } = opts;

    if (!label) return;

    const { base, alt, type, chroma } = label;

    if (chroma != null && this.style && this.style.getChromaColor) {
        const chromaCol = this.style.getChromaColor(chroma);
        if (chromaCol) fillColor = chromaCol;
    }

    const r = this.g.getThickness() * 0.15;
    const offset = hasShadow ? (r / 8) : 0;

    if (hasShadow) {
        noStroke();
        fill(0, 80);

        if (shapeType === "square") {
            push();
            rectMode(CENTER);
            rect(x + offset, y + offset, r, r, r * 0.2);
            pop();
        } else {
            ellipse(x + offset, y + offset, r , r );
        }
    }

    fill(fillColor);
    stroke(strokeColor);
    strokeWeight((shapeType === "square") ? strokeW *2 : strokeW);
    if (base=="") {
       fill(0); 
    }
        
    push();
    if (shapeType === "square") {
        rectMode(CENTER);
        stroke(255);
        rect(x - offset, y - offset, r * 1.1, r *1.1, r * 0.2);
    } else {
        circle(x - offset, y - offset, r);
    }
    pop();

    noStroke();
    fill((shapeType === "square") ? 255 : strokeColor);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);

    textSize(r * 0.75);
    if (base.length === 3)  textSize(r * 0.50); 
    text(base, x - offset, y - offset);

    if (alt) {
        textSize(r * 0.90);

        let ax = x - offset;
        let ay = y - offset - r * 0.15;

        ax += this.altAdjustX;
        ay += this.altAdjustY;

        if (type === "degree") {
            ax -= r * 0.30;
        } else {
            ax += r * 0.45;
        }

        text(alt, ax, ay);
    }

    textStyle(NORMAL);
}


// ------------------------------------------------------------
// HOVER DOT NORMAL (désactivé en mode marker)
// ------------------------------------------------------------
drawHoverDot() {
    if (this.g.markerMode) return;   // 🔥 micro‑patch

    const g = this.g;
    const app = g.app;

    if (!g.isHovered) return;
    const h = g.hoveredNote;
    if (!h) return;

    const baseRaw = app.instrument.getNoteAt(h.string - 1, h.fret);
    const baseIndex = baseRaw.index;
    const baseMidi  = baseRaw.midi;

    const isShift = g.shiftDown === true;

    const selectedStyle = {
        fillColor: "#ffd00055",
        strokeColor: "#ffd000",
        hasShadow: true,
        shapeType: "square"
    };

    const hoverStyle = {
        fillColor: "#5156127d",
        strokeColor: "white",
        hasShadow: true,
        shapeType: "circle"
    };

    const style = isShift ? selectedStyle : hoverStyle;

    if (g.hoverMode === "cursor") {
        const pos = g.toScreen(h.fret, h.string);
        const label = app.theory.getNoteLabel(
            baseIndex,
            g.displayMode === "note" ? g.labelType : g.displayMode
        );

        this.drawNote(pos.x, pos.y, {
            ...style,
            label
        });
        return;
    }

    if (g.hoverMode === "note") {
        for (let s = 1; s <= g.strings.length; s++) {
            for (let f = 0; f <= g.fretCount; f++) {

                const raw = app.instrument.getNoteAt(s - 1, f);
                if (raw.midi !== baseMidi) continue;

                const pos = g.toScreen(f, s);
                const label = app.theory.getNoteLabel(
                    raw.index,
                    g.displayMode === "note" ? g.labelType : g.displayMode
                );

                this.drawNote(pos.x, pos.y, {
                    ...style,
                    label
                });
            }
        }
        return;
    }

    if (g.hoverMode === "octave") {
        for (let s = 1; s <= g.strings.length; s++) {
            for (let f = 0; f <= g.fretCount; f++) {

                const raw = app.instrument.getNoteAt(s - 1, f);
                if (raw.index !== baseIndex) continue;

                const pos = g.toScreen(f, s);
                const label = app.theory.getNoteLabel(
                    raw.index,
                    g.displayMode === "note" ? g.labelType : g.displayMode
                );

                this.drawNote(pos.x, pos.y, {
                    ...style,
                    label
                });
            }
        }
    }
}


// ------------------------------------------------------------
// MARKER — SEGMENTS
// ------------------------------------------------------------
drawMarkedSegments() {
    const g = this.g;
    if (!g.markerMode) return;

    // épaisseur = diamètre note × 1.3
    const thickness = g.getThickness() * 0.22;
    strokeWeight(thickness);

    for (let s of g.markerSegments) {

        // Couleur + transparence
        const col = color(s.color);
        col.setAlpha(180); // ← transparence légère, propre

        stroke(col);

        const p1 = g.toScreen(s.a.fret, s.a.string);
        const p2 = g.toScreen(s.b.fret, s.b.string);

        if (p1 && p2) {
            line(p1.x, p1.y, p2.x, p2.y);
        }
    }
}



// ------------------------------------------------------------
// MARKER — HOVER DOT SPÉCIAL
// ------------------------------------------------------------
drawMarkerHoverDot() {
    const g = this.g;
    if (!g.markerMode || !g.hoveredNote) return;

    const p = g.toScreen(g.hoveredNote.fret, g.hoveredNote.string);

    const thickness = g.getThickness() * 0.1;

    // Couleur + légère transparence
    const col = color(g.markerColor);
    col.setAlpha(180); // ← même transparence que les segments

    strokeWeight(thickness);
    stroke(col);
    noFill();
    circle(p.x, p.y, thickness);
}


// ------------------------------------------------------------
// PINNED / SELECTED
// ------------------------------------------------------------
drawPinnedNotes() {
    this.drawNoteList(this.g.pinnedNotes, {
        fillColor: "#3494f3",
        strokeColor: "black",
        shapeType: "circle",
        hasShadow: false
    });
}

drawSelectedNotes() {
    this.drawNoteList(this.g.selectedNotes, {
        fillColor: "#fcb900",
        strokeColor: "black",
        shapeType: "square",
        hasShadow: true
    });
}


// ------------------------------------------------------------
// ANIMATIONS (désactivées en mode marker)
// ------------------------------------------------------------
drawInteractionBursts() {
    if (this.g.markerMode) return;   // 🔥 micro‑patch

    const g = this.g;

    if (!g.interactionBursts || g.interactionBursts.length === 0)
        return;

    g.interactionBursts = g.interactionBursts.filter(b => {

        b.t += 0.05;
        if (b.t >= 1) return false;

        const pos = g.toScreen(b.fret, b.string);
        if (!pos) return false;

        const alpha = 255 * Math.pow(1 - b.t, 0.7);
        const baseR = g.getThickness() * 0.18;

        const col = (b.type === "select")
            ? [255, 200, 0]
            : [50, 150, 255];

        stroke(col[0], col[1], col[2], alpha);
        strokeWeight(4);
        noFill();
        circle(pos.x, pos.y, baseR * (1 + b.t * 1.8));

        stroke(col[0], col[1], col[2], alpha * 0.4);
        strokeWeight(2);
        circle(pos.x, pos.y, baseR * (1 + b.t * 1.3));

        noStroke();
        fill(col[0], col[1], col[2], alpha * 0.9);
        circle(pos.x, pos.y, baseR * (0.7 - b.t * 0.5));

        return true;
    });

    if (g.interactionBursts.length > 0) g.invalidate();
}


drawHighlightOctave() {
    if (this.g.markerMode) return;   // 🔥 micro‑patch

    const g = this.g;

    if (!g.highlighted || g.highlighted.length === 0)
        return;

    const pts = [];

    for (let h of g.highlighted) {

        h.t += 0.01;

        const pos = g.toScreen(h.fret, h.string);
        if (!pos) continue;

        const t = h.t;
        const alpha = 255 * (1 - t);
        const scale = 1 + 0.3 * (1 - t);

        const baseR = g.getThickness() * 0.20 * scale;

        push();
        translate(pos.x, pos.y);
        noStroke();

        // Phase 1 : cibles (t < 1)
        if (t < 1) {

            const rings = [
                { r: baseR * 1.00, col: [255, 0, 0] },
                { r: baseR * 0.70, col: [255, 255, 255] },
                { r: baseR * 0.40, col: [255, 0, 0] },
                { r: baseR * 0.15, col: [255, 255, 255] }
            ];

            for (const ring of rings) {
                fill(ring.col[0], ring.col[1], ring.col[2], alpha);
                circle(0, 0, ring.r);
            }
        }

        // Phase 2 : point final (t >= 1)
        else {

            const fade = 1 - Math.min((t - 1) / 5, 1);
            const alpha2 = 255 * fade;

            fill(255, 0, 0, alpha2);
            const finalR = g.getThickness() * 0.12;
            circle(0, 0, finalR);

            // On stocke uniquement les points finalisés
            pts.push({
                x: pos.x,
                y: pos.y,
                alpha: alpha2,
                fret: h.fret
            });
        }

        pop();
    }

    // ---------------------------------------------------------
    // 2) RELIAGE DES POINTS FINAUX SELON TA RÈGLE
    // ---------------------------------------------------------
    if (pts.length < 2)
        return;

    // Trier gauche → droite
    pts.sort((a, b) => a.x - b.x);

    // Regrouper par frette
    const groups = [];
    let current = [pts[0]];

    for (let i = 1; i < pts.length; i++) {
        if (pts[i].fret === current[0].fret) {
            current.push(pts[i]);
        } else {
            groups.push(current);
            current = [pts[i]];
        }
    }
    groups.push(current);

    strokeWeight(2);

    for (let gi = 0; gi < groups.length; gi++) {

        const G = groups[gi];       // groupe courant
        const prev = groups[gi-1];  // groupe précédent
        const next = groups[gi+1];  // groupe suivant

        // A) RELIER LE POINT PRÉCÉDENT À TOUS LES POINTS DE LA FRETTTE
        if (prev) {
            const p = prev[prev.length - 1];
            for (const a of G) {
                const alpha = Math.min(p.alpha, a.alpha);
                stroke(255, 0, 0, alpha);
                line(p.x, p.y, a.x, a.y);
            }
        }

        // B) RELIER TOUS LES POINTS DE LA FRETTTE AU POINT SUIVANT
        if (next) {
            const target = next[0];
            for (const a of G) {
                const alpha = Math.min(a.alpha, target.alpha);
                stroke(255, 0, 0, alpha);
                line(a.x, a.y, target.x, target.y);
            }
        }
    }
}
drawNoteList(list, opts = {}) {
    const g = this.g;
    const app = g.app;

    const {
        fillColor = "#ffffff",
        strokeColor = "black",
        shapeType = "circle",
        hasShadow = false,
        outOfBoundsColor = "white"
    } = opts;

    for (let n of list) {

        const inFretRange   = n.fret   >= 0 && n.fret   <= g.fretCount;
        const inStringRange = n.string >= 1 && n.string <= g.strings.length;

        if (!inFretRange || !inStringRange) {
            this.drawOutOfBoundsMarker(n);
            continue;
        }

        const pos = g.toScreen(n.fret, n.string);
        if (!pos) continue;

        const raw = app.instrument.getNoteAt(n.string - 1, n.fret);

        const label = app.theory.getNoteLabel(
            raw.index,
            g.displayMode === "note"
                ? g.labelType
                : g.displayMode
        );

        const full = app.theory.getFullNote(raw.index);
        label.chroma = full.chroma;

        const degObj = app.theory.getNoteLabel(raw.index, "degree");
        const isTonic = (degObj.base === "1");

        this.drawNote(pos.x, pos.y, {
            fillColor,
            strokeColor,
            shapeType,
            hasShadow,
            label,
            isTonic
        });
    }
}

getStringY(stringIndex) {
    const g = this.g;

    const safe = Math.min(Math.max(stringIndex, 1), g.stringRatio.length);

    const ratioIndex = g.stringRatio.length - safe;

    return g.y + g.h * g.stringRatio[ratioIndex];
}

drawOutOfBoundsMarker(sel) {
    const g = this.g;

    const minString = 1;
    const maxString = g.strings.length;
    const minFret   = 0;
    const maxFret   = g.fretCount;

    let x, y;

    if (sel.fret < minFret) {
        x = g.x;
    }
    else if (sel.fret > maxFret) {
        x = g.x + g.w;
    }
    else {
        const safeString = Math.min(Math.max(sel.string, minString), maxString);
        const pos = g.toScreen(sel.fret, safeString);
        x = pos ? pos.x : (g.x + g.w * (sel.fret / maxFret));
    }

    if (sel.string < minString) {
        y = g.y;
    }
    else if (sel.string > maxString) {
        y = g.y + g.h;
    }
    else {
        const safeFret = Math.min(Math.max(sel.fret, minFret), maxFret);
        const pos = g.toScreen(safeFret, sel.string);
        y = pos ? pos.y : (g.y + g.h * (sel.string / maxString));
    }

    fill(255);
    stroke(0);
    textAlign(CENTER, CENTER);
    textSize(20 * g.zoomFactor);
    text("+", x, y);
}

drawOpenStringLabels() {
    const g = this.g;
    const names = ["E", "A", "D", "G", "B", "E"];
    const c0 = g.cases[0];

    const x = c0.xc;
    const t = g.getThickness();
    const col = this.style.getInlayColor();

    textAlign(CENTER, CENTER);
    textSize(t * 0.12);
    fill(col);

    for (let i = 0; i < g.strings.length; i++) {
        const s = g.strings[i];
        text(names[i], x, s.y);
    }
}

drawDebugInfo() {
    const g = this.g;

    const x = g.x;
    const y = g.y;
    const w = g.getLength();
    const h = g.getThickness();

    const ratio = (w / h).toFixed(2);

    const isHovered    = g.isHovered;
    const pressed  = g.isPressed;
    const dragging = g.dragging;

    const mx = mouseX.toFixed(0);
    const my = mouseY.toFixed(0);

    const hit = g.fromScreen(mouseX, mouseY);

    const fretStr   = hit ? hit.fret : "-";
    const stringStr = hit ? hit.string : "-";
    const caseStr   = hit ? hit.fret : "-";

    push();
    pop();
}


// ------------------------------------------------------------
// DRAW GLOBAL
// ------------------------------------------------------------
draw() {
    const g = this.g;

    const neck = g.getNeckRect();
    fill(this.style.getWoodFill());
    stroke(40);
    strokeWeight(2);
    rect(neck.x, neck.y, neck.w, neck.h);

    this.drawInlays();
    this.drawHead();
    this.drawStringShadows();
    this.drawFrets();
    
    this.drawStrings();
    this.drawOpenStringLabels();

    // MARKER SEGMENTS
    this.drawMarkedSegments();

    // PINNED / SELECTED
    this.drawPinnedNotes();
    this.drawSelectedNotes();
    
    // HOVER DOT NORMAL OU MARKER
    this.drawHoverDot();
    this.drawMarkerHoverDot();

    // ANIMATIONS (désactivées en mode marker)
    this.drawInteractionBursts();
    this.drawHighlightOctave();

    if (g.debug) this.drawDebugInfo();
}

}
