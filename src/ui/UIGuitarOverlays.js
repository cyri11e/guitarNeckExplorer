// ============================================================
// GUITAR OVERLAYS — CLEAN STEP 1
// (rendu, pinned, selected, hover, marker, multicurseur)
// ============================================================

class GuitarOverlays {
    constructor(guitar, style) {
        this.g = guitar;
        this.style = style;
        this.intervalDispatcher = new MultiNotes(this.g);
        this.intervalOverlayNotes =[];
        this.popOutNotes = [];
        this._popOutTimer = null;
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
this.caged = new CAGEDOverlay(this.g);
this.noteRenderer = new NoteRenderer(this.g, this.style);

    this._hoverDispatchCacheKey = null;
    this._hoverDispatchCacheList = [];
    this._occurrenceCacheKey = null;
    this._occByMidi = new Map();
    this._occByIndex = new Map();

    }

    // ------------------------------------------------------------
    // NOTE RENDERING
    // ------------------------------------------------------------
    drawNote(x, y, opts = {}) {
        this.noteRenderer.draw(x, y, opts);
    }

    hasActiveNoteAnimations() {
        const g = this.g;

        const hasPopOut = (this.popOutNotes && this.popOutNotes.length > 0);
        if (hasPopOut) return true;

        const hasPopIn = (list) => (list || []).some(n => !!n.animStart);
        if (hasPopIn(g.pinnedNotes)) return true;
        if (hasPopIn(g.selectedNotes)) return true;

        return false;
    }

    enqueuePopOut(note, type = "pinned", opts = {}) {
        if (!note) return;

        const animCfg = this.g.anim?.note || {};

        const {
            animType = "popOut",
            duration = (animCfg.popOutDuration ?? 380)
        } = opts;

        const app = this.g.app;
        const raw = app?.instrument?.getNoteAt(note.string - 1, note.fret);

        let label = null;
        if (raw) {
            label = app.theory.getNoteLabel(
                raw.index,
                this.g.displayMode === "note" ? this.g.labelType : this.g.displayMode
            );

            const full = app.theory.getFullNote(raw.index);
            if (label && full) label.chroma = full.chroma;
        }

        if (!label) {
            label = { base: "", alt: "", type: "note", chroma: null };
        }

        const isSelected = type === "selected";
        this.popOutNotes.push({
            fret: note.fret,
            string: note.string,
            type,
            startAt: millis(),
            animType,
            popOutDuration: duration,
            label,
            fillColor: isSelected ? "#fcb900" : "#3494f3",
            strokeColor: "black",
            shapeType: isSelected ? "square" : "circle",
            hasShadow: isSelected
        });

        this._startPopOutTimer();
    }

    _startPopOutTimer() {
        if (this._popOutTimer) return;

        const timerMs = this.g.anim?.timers?.fastMs ?? 16;

        this._popOutTimer = setInterval(() => {
            if (!this.popOutNotes || this.popOutNotes.length === 0) {
                clearInterval(this._popOutTimer);
                this._popOutTimer = null;
                return;
            }

            this.g.invalidate();
        }, timerMs);
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

            // Animation pop-in
            let animOpts = {};
            if (n.animStart) {
                const elapsed = millis() - n.animStart;
                const duration = n.animDuration ?? (g.anim?.note?.popInDuration ?? 360);
                const t = constrain(elapsed / duration, 0, 1);
                if (t < 1) {
                    animOpts = { anim: { type: n.animType ?? "pop", t } };
                } else {
                    delete n.animStart;
                    delete n.animDuration;
                    delete n.animType;
                }
            }

            this.drawNote(pos.x, pos.y, {
                fillColor,
                strokeColor,
                shapeType,
                hasShadow,
                label,
                ...animOpts
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

    drawPopOutNotes() {
        const g = this.g;
        if (!this.popOutNotes || this.popOutNotes.length === 0) return;

        const now = millis();

        this.popOutNotes = this.popOutNotes.filter(n => {
            const duration = n.popOutDuration ?? (g.anim?.note?.popOutDuration ?? 380);
            const t = constrain((now - n.startAt) / duration, 0, 1);
            if (t >= 1) return false;

            const pos = g.toScreen(n.fret, n.string);
            if (!pos) return false;

            this.drawNote(pos.x, pos.y, {
                fillColor: n.fillColor,
                strokeColor: n.strokeColor,
                shapeType: n.shapeType,
                hasShadow: n.hasShadow,
                label: n.label,
                anim: { type: n.animType ?? "popOut", t }
            });

            return true;
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

    _buildHoverDispatchCacheKey(mode, intervals, hovered, way, octaveShown) {
        if (!hovered) return null;

        const intervalKey = (intervals || []).join(",");
        return [
            mode,
            intervalKey,
            hovered.string,
            hovered.fret,
            way,
            octaveShown
        ].join("|");
    }

    _getDispatchedIntervalList(mode, intervals, hovered, way, octaveShown) {
        const key = this._buildHoverDispatchCacheKey(mode, intervals, hovered, way, octaveShown);
        if (!key) return [];

        if (this._hoverDispatchCacheKey === key) {
            return this._hoverDispatchCacheList;
        }

        const list = this.intervalDispatcher
            ? this.intervalDispatcher.dispatch(mode, intervals, hovered, way, octaveShown)
            : [];

        this._hoverDispatchCacheKey = key;
        this._hoverDispatchCacheList = list || [];

        return this._hoverDispatchCacheList;
    }

    _getOccurrenceCacheKey() {
        const g = this.g;
        const tuning = g.app?.instrument?.tuning || [];
        const tuningKey = tuning.map(t => t.midi).join(",");

        return [
            g.x,
            g.y,
            g.w,
            g.h,
            g.fretCount,
            g.strings.length,
            tuningKey
        ].join("|");
    }

    _rebuildOccurrenceCacheIfNeeded() {
        const g = this.g;
        const app = g.app;
        const key = this._getOccurrenceCacheKey();

        if (key === this._occurrenceCacheKey) return;

        this._occByMidi = new Map();
        this._occByIndex = new Map();

        for (let s = 1; s <= g.strings.length; s++) {
            for (let f = 0; f <= g.fretCount; f++) {
                const raw = app.instrument.getNoteAt(s - 1, f);
                if (!raw) continue;

                const pos = g.toScreen(f, s);
                if (!pos) continue;

                const entry = {
                    string: s,
                    fret: f,
                    index: raw.index,
                    midi: raw.midi,
                    x: pos.x,
                    y: pos.y
                };

                if (!this._occByMidi.has(raw.midi)) this._occByMidi.set(raw.midi, []);
                this._occByMidi.get(raw.midi).push(entry);

                if (!this._occByIndex.has(raw.index)) this._occByIndex.set(raw.index, []);
                this._occByIndex.get(raw.index).push(entry);
            }
        }

        this._occurrenceCacheKey = key;
    }

    // ------------------------------------------------------------
    // HOVER DOT + MULTICURSEUR + MARKER
    // ------------------------------------------------------------
    drawHoverDot() {
        const g = this.g;
        const app = g.app;

        if (g.markerMode) return;
        if (this.hasActiveNoteAnimations()) {
            this.intervalOverlayNotes = [];
            return;
        }
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


const list = this._getDispatchedIntervalList(
        mode,
        intervals,
        h,
        g.intervalWay,
        g.octaveShown
);

    //  Stockage global dans l’overlay
    this.intervalOverlayNotes = list.map(n => ({
        string: n.string,
        fret: n.fret
    }));



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
                fillColor: "#00ff6618",
                strokeColor: "rgba(0, 0, 0, 0.18)",
                hasShadow: true,
                shapeType: "circle",
                label,
                cursor: (label.root),
                overlayAlpha: 70
            });
        }

        const isShift = g.shiftDown === true;

        const selectedStyle = {
            fillColor: "#ff00cc20",
            strokeColor: "rgba(0, 255, 38, 0.2)",
            hasShadow: true,
            shapeType: "square",
            overlayAlpha: 80
        };

        const hoverStyle = {
            fillColor: "#fe000010",
            strokeColor: "rgba(255, 255, 255, 0.18)",
            hasShadow: true,
            shapeType: "circle",
            overlayAlpha: 60
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
            this._rebuildOccurrenceCacheIfNeeded();
            const listByMidi = this._occByMidi.get(baseMidi) || [];

            for (const item of listByMidi) {
                const label = app.theory.getNoteLabel(
                    item.index,
                    g.displayMode === "note" ? g.labelType : g.displayMode
                );

                this.drawNote(item.x, item.y, {
                    ...style,
                    label
                });
            }
            return;
        }

        // MODE T : OCTAVE → toutes les occurrences même pitch class
        if (g.hoverMode === "octave") {
            this._rebuildOccurrenceCacheIfNeeded();
            const listByIndex = this._occByIndex.get(baseIndex) || [];

            for (const item of listByIndex) {
                const label = app.theory.getNoteLabel(
                    item.index,
                    g.displayMode === "note" ? g.labelType : g.displayMode
                );

                this.drawNote(item.x, item.y, {
                    ...style,
                    label
                });
            }
        }
    }

    // ------------------------------------------------------------
    // MARKER — SEGMENTS
    // ------------------------------------------------------------
    drawMarkedSegments() {
        const g = this.g;
        // if (!g.markerMode) return;

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

        push();
        strokeWeight(thickness);
        stroke(col);
        noFill();
        circle(p.x, p.y, thickness);
        pop();
    }

    // ------------------------------------------------------------
    // ANIMATIONS
    // ------------------------------------------------------------
    drawInteractionBursts() {
        const g = this.g;
        if (g.markerMode) return;

        const burstsCfg = g.anim?.bursts || {};

        // Désactivation temporaire du rendu visuel des bursts.
        const renderBursts = burstsCfg.enabled ?? false;

        if (!g.interactionBursts || g.interactionBursts.length === 0)
            return;

        g.interactionBursts = g.interactionBursts.filter(b => {

            b.t += burstsCfg.tStep ?? 0.05;
            if (b.t >= 1) return false;

            const pos = g.toScreen(b.fret, b.string);
            if (!pos) return false;

            const alpha = 255 * Math.pow(1 - b.t, burstsCfg.alphaPow ?? 0.7);
            const baseR = g.getThickness() * (burstsCfg.baseRadius ?? 0.18);

            const col = (b.type === "select")
                ? [255, 200, 0]
                : [50, 150, 255];

            if (!renderBursts) {
                return true;
            }

            stroke(col[0], col[1], col[2], alpha);
            strokeWeight(4);
            noFill();
            circle(pos.x, pos.y, baseR * (1 + b.t * (burstsCfg.ring1Scale ?? 1.8)));

            stroke(col[0], col[1], col[2], alpha * 0.4);
            strokeWeight(2);
            circle(pos.x, pos.y, baseR * (1 + b.t * (burstsCfg.ring2Scale ?? 1.3)));

            noStroke();
            fill(col[0], col[1], col[2], alpha * 0.9);
            circle(pos.x, pos.y, baseR * ((burstsCfg.coreBase ?? 0.7) - b.t * (burstsCfg.coreDecay ?? 0.5)));

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

        const hiCfg = g.anim?.highlight || {};

        if (!g.highlighted || g.highlighted.length === 0)
            return;

        const pts = [];

        for (let h of g.highlighted) {

            h.t += hiCfg.overlayTStep ?? 0.01;

            const pos = g.toScreen(h.fret, h.string);
            if (!pos) continue;

            const t = h.t;
            const alpha = 255 * (1 - t);
            const scale = 1 + (hiCfg.scaleAmp ?? 0.3) * (1 - t);

            const baseR = g.getThickness() * (hiCfg.baseRadius ?? 0.20) * scale;

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
                const finalR = g.getThickness() * (hiCfg.finalRadius ?? 0.12);
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
    // ENTRY POINT
    // ------------------------------------------------------------
    draw() {
        const g = this.g;

        if (g.cagedOV)
            this.caged.draw();


        // 1) Marker (sous les notes)
        push();
        this.drawMarkedSegments();
        this.drawMarkerHoverDot();
        pop();

        // 2) Notes utilisateur
        this.drawPinnedNotes();
        this.drawSelectedNotes();
        this.drawPopOutNotes();

        // 3) Animations (bursts)
        this.drawInteractionBursts();

        // 4) Highlight octave
        this.drawHighlightOctave();

        // 5) Hover normal (désactivé automatiquement si markerMode = true)
        this.drawHoverDot();




    }
}
