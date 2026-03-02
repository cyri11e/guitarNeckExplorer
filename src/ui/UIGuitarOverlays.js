// ============================================================
// GUITAR OVERLAYS — CLEAN STEP 1
// (rendu, pinned, selected, hover, marker, multicurseur)
// ============================================================

class GuitarOverlays {
    constructor(guitar, style) {
        this.g = guitar;
        this.style = style;
        this.intervalDispatcher = new MultiNotes(this.g);

        this.intervalSelectorLabels = [
            "1",  // 0
            "b2", // 1
            "2",  // 2
            "b3", // 3
            "3",  // 4
            "4",  // 5
            "#4", // 6
            "5",  // 7
            "b6", // 8
            "6",  // 9
            "b7", // 10
            "7"   // 11
        ];
    }

    // ------------------------------------------------------------
    // NOTE RENDERING
    // ------------------------------------------------------------
    drawNote(x, y, opts = {}) {

        let {
            fillColor = color("#ffffff"),
            strokeColor = "black",
            shapeType = "circle",
            hasShadow = false,
            label = null,
            cursor =null
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

        if (base === "") fill(this.g.woodColor == 'rosewood' ? 255 : 0); // pastille

        if (shapeType === "square") {
            rectMode(CENTER);
            stroke(255);
            rect(x - offset, y - offset, r, r, r * 0.2);
            if (cursor){
                stroke('red')
                strokeWeight(weight*2);
                rect(x - offset, y - offset, r*1.1, r, r * 0.2);
            }

        } else {
            stroke(0);
            circle(x - offset, y - offset, r);
            stroke(255);
            circle(x - offset, y - offset, r * 0.9);
            if (cursor){
                stroke('red')
                strokeWeight(weight*2);
                circle(x - offset, y - offset, r * 1.1);
            }
        }

// Texte principal
noStroke();
textAlign(CENTER, CENTER);
textStyle(BOLD);

// taille initiale (comme avant)
textSize(r * (base.length === 3 ? 0.50 : 0.65));

// --- 🔥 Correction largeur réelle ---
let targetWidth = r * 0.65;   // largeur visuelle souhaitée
let w = textWidth(base);

if (w > targetWidth) {
    // réduire proportionnellement
    let factor = targetWidth / w;
    textSize((r * (base.length === 3 ? 0.50 : 0.65)) * factor);
}
// --- 🔥 Fin correction ---

// ombre du texte
fill(shapeType === "square" ? "#00000076" : "#ffffff7d");
text(base, x - offset + 1, y - offset + 1);

// texte principal
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

    drawNoteList(list, opts = {}) {
        const g = this.g;
        const app = g.app;

        const {
            fillColor = "#ffffff",
            strokeColor = "black",
            shapeType = "circle",
            hasShadow = false
        } = opts;

        for (let n of (list || [])) {

            const inFretRange = n.fret >= 0 && n.fret <= g.fretCount;
            const inStringRange = n.string >= 1 && n.string <= g.strings.length;

            if (!inFretRange || !inStringRange) {
                this.drawOutOfBoundsMarker?.(n);
                continue;
            }

            const pos = g.toScreen(n.fret, n.string);
            if (!pos) continue;

            const raw = app.instrument.getNoteAt(n.string - 1, n.fret);
            if (!raw) continue;

            const label = app.theory.getNoteLabel(
                raw.index,
                g.displayMode === "note"
                    ? g.labelType
                    : g.displayMode
            );

            const full = app.theory.getFullNote(raw.index);
            label.chroma = full.chroma;

            this.drawNote(pos.x, pos.y, {
                fillColor,
                strokeColor,
                shapeType,
                hasShadow,
                label
            });
        }
    }

    // ------------------------------------------------------------
    // PINNED / SELECTED
    // ------------------------------------------------------------
    drawPinnedNotes() {
        this.drawNoteList(this.g.pinnedNotes || [], {
            fillColor: "#3494f3",
            strokeColor: "black",
            shapeType: "circle",
            hasShadow: false
        });
    }

    drawSelectedNotes() {
        this.drawNoteList(this.g.selectedNotes || [], {
            fillColor: "#fcb900",
            strokeColor: "black",
            shapeType: "square",
            hasShadow: true
        });
    }

    // ------------------------------------------------------------
    // LABEL D’INTERVAL RELATIF (pour mode degree)
    // ------------------------------------------------------------
    getRelativeDegreeLabel(interval) {

        // normalisation modulo 12 pour supporter les intervalles négatifs
        interval = ((interval % 12) + 12) % 12;

        const theory = this.g.app.theory;
        const d = theory.getDegreeLabel(interval);
        if (!d) return null;

        return {
            base: d.base,
            alt: d.alt,
            type: "degree",
            chroma: null
        };
    }

    // ------------------------------------------------------------
    // HOVER DOT + MULTICURSEUR + MARKER
    // ------------------------------------------------------------
    drawHoverDot() {
        const g = this.g;
        const app = g.app;

        if (g.markerMode) return;
        if (!g.isHovered) return;

        const h = g.hoveredNote;
        if (!h) return;

        const baseRaw = app.instrument.getNoteAt(h.string - 1, h.fret);
        if (!baseRaw) return;

        const baseIndex = baseRaw.index;
        const baseMidi = baseRaw.midi;

        // MODE MULTINOTE (placeholder, externalisé plus tard)
        const mode = g.intervalMode;
const intervals = g.intervals || [];


const list = this.intervalDispatcher
    ? this.intervalDispatcher.dispatch(
        mode,
        intervals,
        h,
        g.intervalWay,
        g.octaveShown
      )
    : [];


        for (let i = 0; i < list.length; i++) {
            const n = list[i];

            const pos = g.toScreen(n.fret, n.string);
            if (!pos) continue;

            const raw = app.instrument.getNoteAt(n.string - 1, n.fret);
            if (!raw) continue;

            let label;

            switch (g.displayMode) {

                case "note":
                    label = app.theory.getNoteLabel(raw.index, g.labelType);
                    break;

                case "degree": {
                    const realInterval = (raw.midi - baseMidi + 120) % 12;
                    label = this.getRelativeDegreeLabel(realInterval);
                    label.root =  label.base =='1';
                    break;
                }

                case "none":
                    const realInterval = (raw.midi - baseMidi + 120) % 12;
                    label = this.getRelativeDegreeLabel(realInterval);
                    label.root =  label.base =='1';
                    label.base ='';
                    break;

                default:
                    label = null;
                    break;
            }

            this.drawNote(pos.x, pos.y, {
                fillColor: "#00ff666e",
                strokeColor: "black",
                hasShadow: true,
                shapeType: "circle",
                label,
                cursor: (label.root)
            });
        }

        const isShift = g.shiftDown === true;

        const selectedStyle = {
            fillColor: "#ff00ccb7",
            strokeColor: "#00ff26",
            hasShadow: true,
            shapeType: "square"
        };

        const hoverStyle = {
            fillColor: "#fe00003f",
            strokeColor: "white",
            hasShadow: true,
            shapeType: "circle"
        };

        const style = isShift ? selectedStyle : hoverStyle;

        // MODE C : CURSOR → un seul dot sous la souris
        if (g.hoverMode === "cursor") {

            const pos = g.toScreen(h.fret, h.string);
            if (!pos) return;

            let label;

            // MULTINOTE + MODE DEGREE → afficher "1"
            if (intervals.length > 0 && g.displayMode === "degree") {

                label = {
                    base: "1",
                    alt: "",
                    type: "degree",
                    chroma: 0
                };

            } else {

                label = app.theory.getNoteLabel(
                    baseIndex,
                    g.displayMode === "note" ? g.labelType : g.displayMode
                );
                
            }

            this.drawNote(pos.x, pos.y, {
                ...style,
                label
            });

            return;
        }

        // MODE N : NOTE → toutes les occurrences même MIDI
        if (g.hoverMode === "note") {
            for (let s = 1; s <= g.strings.length; s++) {
                for (let f = 0; f <= g.fretCount; f++) {

                    const raw = app.instrument.getNoteAt(s - 1, f);
                    if (!raw || raw.midi !== baseMidi) continue;

                    const pos = g.toScreen(f, s);
                    if (!pos) continue;

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

        // MODE T : OCTAVE → toutes les occurrences même pitch class
        if (g.hoverMode === "octave") {
            for (let s = 1; s <= g.strings.length; s++) {
                for (let f = 0; f <= g.fretCount; f++) {

                    const raw = app.instrument.getNoteAt(s - 1, f);
                    if (!raw || raw.index !== baseIndex) continue;

                    const pos = g.toScreen(f, s);
                    if (!pos) continue;

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

        const thickness = g.getThickness() * 0.22;
        strokeWeight(thickness);

        for (let s of (g.markerSegments || [])) {
            const col = color(s.color);
            col.setAlpha(180);
            stroke(col);

            const p1 = g.toScreen(s.a.fret, s.a.string);
            const p2 = g.toScreen(s.b.fret, s.b.string);

            if (p1 && p2) line(p1.x, p1.y, p2.x, p2.y);
        }
    }

    // ------------------------------------------------------------
    // MARKER — HOVER DOT
    // ------------------------------------------------------------
    drawMarkerHoverDot() {
        const g = this.g;
        if (!g.markerMode || !g.hoveredNote) return;

        const p = g.toScreen(g.hoveredNote.fret, g.hoveredNote.string);
        if (!p) return;

        const thickness = g.getThickness() * 0.1;

        const col = color(g.markerColor);
        col.setAlpha(180);

        strokeWeight(thickness);
        stroke(col);
        noFill();
        circle(p.x, p.y, thickness);
    }

    // ------------------------------------------------------------
    // ANIMATIONS
    // ------------------------------------------------------------
    drawInteractionBursts() {
        const g = this.g;
        if (g.markerMode) return;

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

    // ------------------------------------------------------------
    // HIGHLIGHT OCTAVE
    // ------------------------------------------------------------
    drawHighlightOctave() {
        const g = this.g;
        if (g.markerMode) return;

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
            } else {
                const fade = 1 - Math.min((t - 1) / 5, 1);
                const alpha2 = 255 * fade;

                fill(255, 0, 0, alpha2);
                const finalR = g.getThickness() * 0.12;
                circle(0, 0, finalR);

                pts.push({
                    x: pos.x,
                    y: pos.y,
                    alpha: alpha2,
                    fret: h.fret
                });
            }

            pop();
        }

        if (pts.length < 2) return;

        pts.sort((a, b) => a.x - b.x);

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

            const G = groups[gi];
            const prev = groups[gi - 1];
            const next = groups[gi + 1];

            if (prev) {
                const p = prev[prev.length - 1];
                for (const a of G) {
                    const alpha = Math.min(p.alpha, a.alpha);
                    stroke(255, 0, 0, alpha);
                    line(p.x, p.y, a.x, a.y);
                }
            }

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

    // ------------------------------------------------------------
    // OUT OF BOUNDS
    // ------------------------------------------------------------
    drawOutOfBoundsMarker(sel) {
        const g = this.g;

        const minString = 1;
        const maxString = g.strings.length;
        const minFret = 0;
        const maxFret = g.fretCount;

        let x, y;

        if (sel.fret < minFret) x = g.x;
        else if (sel.fret > maxFret) x = g.x + g.w;
        else {
            const safeString = Math.min(Math.max(sel.string, minString), maxString);
            const pos = g.toScreen(sel.fret, safeString);
            x = pos ? pos.x : (g.x + g.w * (sel.fret / maxFret));
        }

        if (sel.string < minString) y = g.y;
        else if (sel.string > maxString) y = g.y + g.h;
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

drawCAGEDOverlay() {
    const g = this.g;
    const h = g.hoveredNote;
    if (!h) return;

    // mapping corde → texte (1 = grave)
    const map = {
        1: "G E", // E grave
        2: "C A", // A
        3: "E D", // D
        4: "A G", // G
        5: "D C", // B
        6: "G E"  // E aigu
    };

    const txt = map[h.string];
    if (!txt) return;

    // position horizontale = fret hover
    const pos = g.toScreen(h.fret, h.string);
    if (!pos) return;

    // position verticale = centre du manche (fixe)
    const centerY = g.y + g.h / 1.7;

    push();
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    fill(255, 0, 0, 60);
    noStroke();

    // taille proportionnelle au manche
    textSize(g.getThickness() *1.3  );

    text(txt, pos.x, centerY);
    pop();
}


    // ------------------------------------------------------------
    // ENTRY POINT
    // ------------------------------------------------------------
    draw() {
        const g = this.g;
this.drawCAGEDOverlay();
        // 1) Marker (sous les notes)
        this.drawMarkedSegments();
        this.drawMarkerHoverDot();

        // 2) Notes utilisateur
        this.drawPinnedNotes();
        this.drawSelectedNotes();

        // 3) Animations (bursts)
        this.drawInteractionBursts();

        // 4) Highlight octave
        this.drawHighlightOctave();

        // 5) Hover normal (désactivé automatiquement si markerMode = true)
        this.drawHoverDot();


    }
}
