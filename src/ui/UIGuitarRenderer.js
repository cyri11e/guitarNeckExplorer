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


// parseNoteLabel(label) {
//     label = label.trim();

//     // Normalisation des altérations
//     const flat  = ["b", "♭"];
//     const sharp = ["#", "♯"];

//     // Remplacement automatique
//     label = label
//         .replace(/^b(?=\d)/, "♭")   // b3 → ♭3
//         .replace(/b$/, "♭")         // Eb → E♭
//         .replace(/#/, "♯");         // C# → C♯

//     // Degré : ♭3, ♯5…
//     if (/^[♭♯]\d+$/.test(label)) {
//         return {
//             base: label.slice(1),
//             alt: label[0],
//             type: "degree"
//         };
//     }

//     // Note : C♯, E♭…
//     if (/^[A-G][♭♯]?$/.test(label)) {
//         return {
//             base: label[0],
//             alt: label.slice(1),
//             type: "note"
//         };
//     }

//     // Fallback
//     return { base: label, alt: "", type: "raw" };
// }

drawNote(x, y, opts = {}) {

    // --- extraction des options ---
    let {
        fillColor = color("#ffffff"),
        strokeColor = "black",
        strokeW = 1,
        shapeType = "circle",   // "circle" | "square"
        opacity = 255,
        hasShadow = false,
        label = null // { base, alt, type, chroma }
    } = opts;

    // --- sécurité : label doit exister ---
    if (!label) return;

    const { base, alt, type, chroma } = label;

    // --- priorité couleur chromatique ---
    // si chroma existe ET style fournit une couleur → priorité
    if (chroma != null && this.style && this.style.getChromaColor) {
        const chromaCol = this.style.getChromaColor(chroma);
        if (chromaCol) fillColor = chromaCol;
    }

    // --- rayon et offset ---
    const r = this.g.getThickness() * 0.18;
    const offset = hasShadow ? (r / 20) : 0;

    // --- ombre ---
    if (hasShadow) {
        noStroke();
        fill(0, 40);

        if (shapeType === "square") {
            push();
            rectMode(CENTER);
            rect(x + offset, y + offset, r, r, r * 0.2);
            pop();
        } else {
            ellipse(x + offset, y + offset, r * 1.1, r * 1.1);
        }
    }

    // --- forme principale ---
    fill(fillColor);
    stroke(strokeColor);
    strokeWeight(strokeW);
    if (base=="") {
       fill(0); 
    }
        
    push();
    if (shapeType === "square") {
        rectMode(CENTER);
        rect(x - offset, y - offset, r, r, r * 0.2);
    } else {
        circle(x - offset, y - offset, r);
    }
    pop();

    // --- texte ---
    noStroke();
    fill(strokeColor);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);

    // base centrée
    textSize(r * 0.75);
    text(base, x - offset, y - offset);

    // --- altération ---
    if (alt) {
        textSize(r * 0.65);

        let ax = x - offset;
        let ay = y - offset - r * 0.15;

        // ajustement OS
        ax += this.altAdjustX;
        ay += this.altAdjustY;

        // placement selon type
        if (type === "degree") {
            ax -= r * 0.35; // à gauche
        } else {
            ax += r * 0.35; // à droite
        }

        text(alt, ax, ay);
    }

    textStyle(NORMAL);
}



drawHoverDot() {
    if (!this.g.isHovered) return;

    const h = this.g.hoveredNote;
    if (!h) return;

    const pos = this.g.toScreen(h.fret, h.string);
    const raw = this.g.instrument.getNoteAt(h.string - 1, h.fret);

    const label = this.g.theory.getNoteLabel(
        raw.index,
        this.g.displayMode
    );

    this.drawNote(pos.x, pos.y, {
        fillColor: "#5156127d",
        strokeColor: "white",
        opacity: 50,
        hasShadow: true,
        label
    });
}



drawPinnedNotes() {
    const g = this.g;
    const app = g.app;

    for (const pin of g.pinnedNotes) {
        const pos = g.toScreen(pin.fret, pin.string);
        if (!pos) continue;

        const raw = app.instrument.getNoteAt(pin.string - 1, pin.fret);

        const label = app.theory.getNoteLabel(
            raw.index,
            g.displayMode
        );

        this.drawNote(pos.x, pos.y, {
            fillColor: "red",
            strokeColor: "black",
            hasShadow: false,
            label
        });
    }
}

drawSelectedNotes() {
    const g = this.g;
    const app = g.app;

    for (let s of g.selectedNotes) {

        const inFretRange   = s.fret   >= 0 && s.fret   <= g.fretCount;
        const inStringRange = s.string >= 1 && s.string <= g.strings.length;

        if (!inFretRange || !inStringRange) {
            this.drawOutOfBoundsMarker(s);
            continue;
        }

        const pos = g.toScreen(s.fret, s.string);
        const raw = app.instrument.getNoteAt(s.string - 1, s.fret);

        const label = app.theory.getNoteLabel(
            raw.index,
            g.displayMode
        );

        this.drawNote(pos.x, pos.y, {
            fillColor: "#fcb900",
            strokeColor: "black",
            shapeType: "square",
            hasShadow: true,
            label
        });
    }
}

getStringY(stringIndex) {
    const g = this.g;

    // clamp
    const safe = Math.min(Math.max(stringIndex, 1), g.stringRatio.length);

    // stringRatio[0] = corde 6 (haut)
    // stringRatio[5] = corde 1 (bas)
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

    // ---------------------------------------------------------
    // 1) X (inchangé)
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // 2) Y (corrigé pour les sorties par le côté)
    // ---------------------------------------------------------
    if (sel.string < minString) {
        // sortie par le haut/bas → tu avais dit que ça, c'était OK
        y = g.y;
    }
    else if (sel.string > maxString) {
        y = g.y + g.h;
    }
    else {
        // corde valide → on veut être EXACTEMENT sur la corde,
        // même si la frette est hors manche
        const safeFret = Math.min(Math.max(sel.fret, minFret), maxFret);
        const pos = g.toScreen(safeFret, sel.string);
        y = pos ? pos.y : (g.y + g.h * (sel.string / maxString));
    }

    // ---------------------------------------------------------
    // 3) Dessin
    // ---------------------------------------------------------
    fill(255);
    stroke(0);
    textAlign(CENTER, CENTER);
    textSize(20 * g.zoomFactor);
    text("+", x, y);
}



drawOpenStringLabels() {
    const g = this.g;
    const names = ["E", "A", "D", "G", "B", "E"]; // corde 1 → aiguë
    const c0 = g.cases[0]; // case à vide

    const x = c0.xc;       // 🔥 même emplacement horizontal que la pastille
    const t = g.getThickness();
    const col = this.style.getInlayColor();

    textAlign(CENTER, CENTER);
    textSize(t * 0.12);
    fill(col);

    for (let i = 0; i < g.strings.length; i++) {
        const s = g.strings[i];
        text(names[i], x, s.y);  // 🔥 même y que la pastille
    }
}



    // ------------------------------------------------------------
    // DEBUG
    // ------------------------------------------------------------

drawDebugInfo() {
    const g = this.g;

    const x = g.x;
    const y = g.y;
    const w = g.getLength();
    const h = g.getThickness();

    const ratio = (w / h).toFixed(2);

    // Interaction
    const isHovered    = g.isHovered;
    const pressed  = g.isPressed;
    const dragging = g.dragging;

    // Coordonnées souris
    const mx = mouseX.toFixed(0);
    const my = mouseY.toFixed(0);

    // Conversion guitare
    const hit = g.fromScreen(mouseX, mouseY);

    const fretStr   = hit ? hit.fret : "-";
    const stringStr = hit ? hit.string : "-";
    const caseStr   = hit ? hit.fret : "-";   // même index pour l’instant

    push();
    fill("green");
    textSize(12);
    textAlign(LEFT, TOP);

    text(
        `x: ${x.toFixed(1)}\n` +
        `y: ${y.toFixed(1)}\n` +
        `w: ${w.toFixed(1)}\n` +
        `h: ${h.toFixed(1)}\n` +
        `ratio: ${ratio}\n` +
        `frets: ${g.fretCount}\n` +
        `cases: ${g.cases.length}\n\n` +

        `hover: ${isHovered}\n` +
        `pressed: ${pressed}\n` +
        `dragging: ${dragging}\n` +
        `mouse: ${mx}, ${my}\n` +
        `case: ${caseStr}\n` +
        `fret: ${fretStr}\n` +
        `string: ${stringStr}`,
        x + 18,
        y + 36
    );

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
        this.drawPinnedNotes();
        this.drawSelectedNotes();
        
        this.drawHoverDot();

        if (g.debug) this.drawDebugInfo();
    }
}
