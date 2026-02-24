// ============================================================
// GUITAR OVERLAYS — notes, hover, marker, animations, etc.
// ============================================================

class GuitarOverlays {
    constructor(guitar, style) {
        this.g = guitar;
        this.style = style;
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
        ]; // fallback par defaut

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
            label = null
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

        if (base === "") fill(0);

        if (shapeType === "square") {
            rectMode(CENTER);
            stroke(255);
            rect(x - offset, y - offset, r, r, r * 0.2);
        } else {
            stroke(0);
            circle(x - offset, y - offset, r);
            stroke(255)
            circle(x - offset, y - offset, r * 0.9);
            //stroke(0)

        }

        // Texte principal
        noStroke();
        textAlign(CENTER, CENTER);
        textStyle(BOLD);

        textSize(r * (base.length === 3 ? 0.50 : 0.80));

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

        for (let n of list) {

            const inFretRange = n.fret >= 0 && n.fret <= g.fretCount;
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
    // HOVER DOT NORMAL (désactivé en mode marker)
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

        // ------------------------------------------------------------
        // MODE MULTINOTE : dessiner les intervalles relatifs
        // ------------------------------------------------------------
        const mode = g.intervalMode;
        const intervals = this._prepareIntervalsForWay(
            g.intervals,
            g.intervalWay
        );


        const list = this.dispatchIntervals(mode, intervals);

        for (let i = 0; i < list.length; i++) {
            const n = list[i];


            const pos = g.toScreen(n.fret, n.string);
            if (!pos) continue;

            const raw = app.instrument.getNoteAt(n.string - 1, n.fret);

            let label;

            // règle d'affichage globale
            switch (g.displayMode) {

                case "note":
                    label = app.theory.getNoteLabel(raw.index, g.labelType);
                    break;

                case "degree":
                    const realInterval = (raw.midi - baseMidi + 120) % 12;
label = this.getRelativeDegreeLabel(realInterval);


                    break;


                case "index":
                    label = raw.index.toString();
                    break;

                default:
                    label = app.theory.getNoteLabel(raw.index, g.labelType);
                    break;
            }

            this.drawNote(pos.x, pos.y, {
                fillColor: "#ff88008a",
                strokeColor: "black",
                hasShadow: true,
                shapeType: "circle",
                label
            });
        }



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


        // MODE C : CURSOR → un seul dot sous la souris
        if (g.hoverMode === "cursor") {

            const pos = g.toScreen(h.fret, h.string);

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

                // comportement normal (mononote ou mode note)
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

    findInterval(interval, mode) {

        const g = this.g;
        const app = g.app;
        const inst = app.instrument;

        const h = g.hoveredNote;
        if (!h) return null;

        const baseRaw = inst.getNoteAt(h.string - 1, h.fret);
        if (!baseRaw) return null;

        const baseMidi = baseRaw.midi;
        const targetMidi = baseMidi + interval;

        const maxFret = g.fretCount;

        // ------------------------------------------------------------
        // MODE H : même corde
        // ------------------------------------------------------------
        if (mode === "H") {

            const s = h.string - 1;

            for (let f = 0; f <= maxFret; f++) {

                const raw = inst.getNoteAt(s, f);
                if (!raw) continue;

                if (raw.midi === targetMidi) {
                    return { string: s + 1, fret: f, midi: raw.midi };
                }
            }

            return null;
        }

        // ------------------------------------------------------------
        // MODE V : corde suivante
        // ------------------------------------------------------------
        if (mode === "V") {

            const s = h.string; // corde suivante
            if (s >= inst.tuning.length) return null;

            for (let f = 0; f <= maxFret; f++) {

                const raw = inst.getNoteAt(s, f);
                if (!raw) continue;

                if (raw.midi === targetMidi) {
                    return { string: s + 1, fret: f, midi: raw.midi };
                }
            }

            return null;
        }

        return null;
    }


    dispatchIntervals(mode, intervals) {

        const g = this.g;
        const app = g.app;
        const inst = app.instrument;

        const h = g.hoveredNote;
        if (!h) return [];

        const results = [];

        const baseRaw = inst.getNoteAt(h.string - 1, h.fret);
        if (!baseRaw) return [];

        const baseMidi = baseRaw.midi;
        const maxFret = g.fretCount;

        // ------------------------------------------------------------
        // MODE OneString : tout sur la même corde
        // ------------------------------------------------------------
        if (mode === "OneString") {

            for (let i = 0; i < intervals.length; i++) {

                const interval = intervals[i];
                if (interval === 0) continue; // hover déjà affichée

                const found = this.findInterval(interval, "H");
                if (found) results.push(found);
            }

            return results;
        }


if (mode === "Chord") {

    const { graves, aigus } = this.prepareChordIntervals(g.intervals, g.inversion);

    // 1) notes graves
    const graveResults = [];
    this.chordDispatch(graves, -1, h, inst, baseMidi, maxFret, graveResults);

    // 2) notes aigus
    const aiguResults = [];
    this.chordDispatch(aigus, +1, h, inst, baseMidi, maxFret, aiguResults);

    // 3) fusion
    return [...graveResults, ...aiguResults];
}


        // ------------------------------------------------------------
        // MODE BoxR : fenêtre -1 → +4
        // ------------------------------------------------------------
        // ------------------------------------------------------------
        // MODE BOXR — scan toutes cordes, frettes vers la droite
        // ------------------------------------------------------------
        if (mode === "BoxR") {

            const minDf = 0;   // à partir de la frette actuelle
            const maxDf = +4;  // jusqu'à 4 frettes à droite (comme BoxL mais inversé)

            for (let i = 0; i < intervals.length; i++) {

                const interval = intervals[i];
                if (interval === 0) continue;

                const targetMidi = baseMidi + interval;
                let found = null;

                for (let s = 0; s < inst.tuning.length; s++) {

                    for (let df = minDf; df <= maxDf; df++) {

                        const f = h.fret + df;
                        if (f < 0 || f > maxFret) continue;

                        const raw = inst.getNoteAt(s, f);
                        if (!raw) continue;

                        if (raw.midi === targetMidi) {
                            found = { string: s + 1, fret: f, midi: raw.midi };
                            break;
                        }
                    }

                    if (found) break;
                }

                if (found) results.push(found);
            }

            return results;
        }

        // ------------------------------------------------------------
        // MODE BoxL : fenêtre -4 → +1
        // ------------------------------------------------------------
        if (mode === "BoxL") {

            const minDf = -4;
            const maxDf = +1;

            for (let i = 0; i < intervals.length; i++) {

                const interval = intervals[i];
                if (interval === 0) continue;

                const targetMidi = baseMidi + interval;
                let found = null;

                for (let s = 0; s < inst.tuning.length; s++) {

                    for (let df = minDf; df <= maxDf; df++) {

                        const f = h.fret + df;
                        if (f < 0 || f > maxFret) continue;

                        const raw = inst.getNoteAt(s, f);
                        if (!raw) continue;

                        if (raw.midi === targetMidi) {
                            found = { string: s + 1, fret: f, midi: raw.midi };
                            break;
                        }
                    }

                    if (found) break;
                }

                if (found) results.push(found);
            }

            return results;
        }


        // ------------------------------------------------------------
        // MODE 3NPS : 3 notes max par corde, direction selon le signe
        // ------------------------------------------------------------
        if (mode === "3NPS") {

            let s = h.string - 1;      // corde courante
            let notesOnString = 1;     // hovered = 1 note sur la première corde

            for (let i = 0; i < intervals.length; i++) {

                const interval = intervals[i];
                if (interval === 0) continue;

                // direction géométrique selon le signe de l’intervalle
                const direction = (interval > 0) ? +1 : -1;

                // si on a atteint la limite sur cette corde → changer de corde
                if (notesOnString >= 3) {
                    s += direction;

                    // hors limites → stop
                    if (s < 0 || s >= inst.tuning.length) break;

                    notesOnString = 0;
                }

                const targetMidi = baseMidi + interval;
                let found = null;

                // chercher la première occurrence sur la corde courante
                for (let f = 0; f <= maxFret; f++) {

                    const raw = inst.getNoteAt(s, f);
                    if (!raw) continue;

                    if (raw.midi === targetMidi) {
                        found = { string: s + 1, fret: f, midi: raw.midi };
                        break;
                    }
                }

                if (found) {
                    results.push(found);
                    notesOnString++;
                }
            }

            return results;
        }



        // ------------------------------------------------------------
        // MODE "diagonal" : tout doit tenir dans le rectangle fondamentale–octave
        // ------------------------------------------------------------
        // ------------------------------------------------------------
        // MODE "Diagonal" : toutes combinaisons valides, puis chemin le plus compact
        // ------------------------------------------------------------
        if (mode === "Diagonal") {

            const inst = app.instrument;
            const maxFret = g.fretCount;

            const root = { string: h.string - 1, fret: h.fret };
            const baseMidi = inst.getNoteAt(root.string, root.fret)?.midi;
            if (baseMidi == null) return [];

            // octave géométrique L : dépend du sens (up/down)
            const octaveCandidates = [];
            const way = g.intervalWay;

            const sOct = root.string + (way === "up" ? 2 : -2);
            const f2 = root.fret + (way === "up" ? 2 : -2);
            const f3 = root.fret + (way === "up" ? 3 : -3);

            //  IMPORTANT : on NE vérifie PAS les limites du manche
            // C’est une octave VIRTUELLE, géométrique, hors manche si nécessaire
            octaveCandidates.push({ string: sOct + 1, fret: f2 });
            octaveCandidates.push({ string: sOct + 1, fret: f3 });


            const paths = this._diagonalGeneratePaths(inst, intervals, root, baseMidi, maxFret);

            if (!paths.length || !octaveCandidates.length) return [];

            let bestPath = null;
            let bestScore = Infinity;

            for (const path of paths) {
                for (const oct of octaveCandidates) {
                    const score = this._diagonalScorePath(
                        { string: root.string + 1, fret: root.fret },
                        path,
                        oct
                    );
                    if (score < bestScore) {
                        bestScore = score;
                        bestPath = path;
                    }
                }
            }

            return bestPath || [];
        }

        return results;
    }


chordDispatch(intervals, dirOverride, h, inst, baseMidi, maxFret, results) {

    for (let i = 0; i < intervals.length; i++) {

        const interval = intervals[i];
        if (interval === 0) continue;

        const index = results.length + 1;

        // direction LOCALE, jamais globale
        const dir = (dirOverride != null)
            ? dirOverride
            : (interval > 0 ? +1 : -1);

        const s = (h.string - 1) + dir * index;
        if (s < 0 || s >= inst.tuning.length) break;

        const targetMidi = baseMidi + interval;
        let found = null;

        for (let f = 0; f <= maxFret; f++) {
            const raw = inst.getNoteAt(s, f);
            if (!raw) continue;
            if (raw.midi === targetMidi) {
                found = { string: s + 1, fret: f, midi: raw.midi };
                break;
            }
        }

        if (found) results.push(found);
    }

    return results;
}
prepareChordIntervals(intervals, inversion) {

    // 1) rotation (inversion)
    const rot = intervals.slice(inversion).concat(intervals.slice(0, inversion));

    // 2) trouver la fondamentale
    const rootIndex = rot.indexOf(0);
    const root = rot[rootIndex];

    // 3) intervalles relatifs signés autour de 0
    const signed = rot.map((v, i) => {
        const diff = v - root;          // ex: 4→4, 7→7, 0→0
        const mod  = ((diff % 12) + 12) % 12;
        if (i < rootIndex && mod !== 0) return mod - 12; // avant 0 → négatif
        return mod;                                     // après 0 → positif
    });

    // 4) 0 + graves + aigus (dans le bon sens pour Chord)
    const rootFirst   = 0;
    const gravesOnly  = signed.filter(v => v < 0).sort((a, b) => b - a); // -5, -8, ...
    const aigusOnly   = signed.filter(v => v > 0).sort((a, b) => a - b); // 4, 7, ...

    const graves = [rootFirst, ...gravesOnly];
    const aigus  = [rootFirst, ...aigusOnly];

    return { graves, aigus };
}



    // ------------------------------------------------------------
    // DIAGONAL — helpers internes
    // ------------------------------------------------------------
    _diagonalScorePath(root, path, octaveL) {

        const full = [root, ...path, octaveL];

        let minF = Infinity, maxF = -Infinity;
        let minS = Infinity, maxS = -Infinity;

        for (const p of full) {

            // ⚠️ IGNORER les points virtuels ou hors manche
            if (p.virtual) continue;
            if (p.fret < 0 || p.fret > this.g.fretCount) continue;
            if (p.string < 1 || p.string > this.g.app.instrument.tuning.length) continue;

            minF = Math.min(minF, p.fret);
            maxF = Math.max(maxF, p.fret);
            minS = Math.min(minS, p.string);
            maxS = Math.max(maxS, p.string);
        }

        // Si aucune note jouable → score très mauvais mais pas bloquant
        if (minF === Infinity) return 9999;

        const width = maxF - minF;
        const height = maxS - minS;

        return width + height * 3;
    }


    _diagonalFindCandidates(inst, targetMidi, prev, maxFret) {
        const out = [];

        for (let s = 0; s < inst.tuning.length; s++) {
            for (let f = 0; f <= maxFret; f++) {

                const raw = inst.getNoteAt(s, f);
                if (!raw || raw.midi !== targetMidi) continue;

                const dF = f - prev.fret;
                if (Math.abs(dF) >= 5) continue;

                out.push({ string: s + 1, fret: f, midi: raw.midi });
            }
        }

        // ⚠️ IMPORTANT :
        // Si aucune note jouable n'existe → on retourne un placeholder virtuel
        // pour garder la continuité du chemin.
        if (out.length === 0) {
            out.push({
                string: prev.string,   // même corde
                fret: prev.fret,       // même frette
                midi: targetMidi,      // mais note virtuelle
                virtual: true          // marquage
            });
        }

        return out;
    }

    _diagonalGeneratePaths(inst, intervals, root, baseMidi, maxFret) {

        const paths = [];

        const recurse = (i, prev, current) => {

            if (i >= intervals.length) {
                paths.push([...current]);
                return;
            }

            const interval = intervals[i];
            if (interval === 0) {
                recurse(i + 1, prev, current);
                return;
            }

            const targetMidi = baseMidi + interval;
            const candidates = this._diagonalFindCandidates(inst, targetMidi, prev, maxFret);

            for (const c of candidates) {
                current.push(c);
                recurse(i + 1, { string: c.string - 1, fret: c.fret }, current);
                current.pop();
            }
        };

        recurse(0, root, []);
        return paths;
    }



    // ---------------------------------------------------------
    // Complémente un intervalle 
    //   UP   : +i
    //   DOWN : -(12 - abs(i))
    // ---------------------------------------------------------
    _complementInterval(i) {
        if (i === 0) return 0;

        const abs = Math.abs(i);
        return -(12 - abs);
    }


    // ---------------------------------------------------------
    // Complémente un tableau d’intervalles
    // ---------------------------------------------------------
    _complementIntervals(arr) {
        return arr.map(i => this._complementInterval(i));
    }


    // ---------------------------------------------------------
    // Prépare les intervalles selon intervalWay :
    //   1. trie les intervalles
    //   2. applique le complément si DOWN
    //   3. retrie dans le bon sens
    // ---------------------------------------------------------
    _prepareIntervalsForWay(intervals, intervalWay) {

        // 1. tri initial (UP = croissant)
        let sorted = [...intervals].sort((a, b) => a - b);

        // 2. si DOWN → complément
        if (intervalWay === "down") {
            sorted = this._complementIntervals(sorted);
        }

        // 3. tri final selon le sens
        if (intervalWay === "up") {
            sorted.sort((a, b) => a - b);
        } else {
            sorted.sort((a, b) => b - a);
        }

        return sorted;
    }



    // ------------------------------------------------------------
    // MARKER — SEGMENTS
    // ------------------------------------------------------------
    drawMarkedSegments() {
        const g = this.g;
        if (!g.markerMode) return;

        const thickness = g.getThickness() * 0.22;
        strokeWeight(thickness);

        for (let s of g.markerSegments) {
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

    // ------------------------------------------------------------
    // DRAW GLOBAL
    // ------------------------------------------------------------
    draw() {
        this.drawMarkedSegments();
        this.drawPinnedNotes();
        this.drawSelectedNotes();
        this.drawHoverDot();
        this.drawMarkerHoverDot();
        this.drawInteractionBursts();
        this.drawHighlightOctave();
    }
}
