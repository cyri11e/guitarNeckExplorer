class ModeChordsPanel extends UIComponent {
    constructor(cfg = {}) {
        super();

        this.aspectRatio = cfg.aspectRatio ?? 3.0;
        this.setResponsive(cfg.xp ?? 0, cfg.yp ?? 0, cfg.sp ?? 10);
        this.updateResponsive();

        this.shortcutKey = cfg.shortcutKey || null;
        this.description = cfg.description || "Accords diatoniques du mode";

        this.isDraggable = cfg.isDraggable ?? true;
        this.isZoomable = cfg.isZoomable ?? true;

        this.selectedModeLabel = "-";
        this.columns = [];
        this._hitColumns = [];
        this._hoverCol = -1;
        this._pendingUseFlats = null;
        this._selectedCols = new Set();
        this._selectionContextKey = "";

        this._modeDef = null;
        this._rootIndex = null;
        this._labelType = "noteEN";
        this._theory = null;

        this._chromaNeonHex = [
            "#ea0e0e",
            "#b9730b",
            "#e38d0c",
            "#c5b315",
            "#d7e60e",
            "#0fde32",
            "#42b5c7",
            "#3863f1",
            "#ae48da",
            "#860ce3",
            "#d165b9",
            "#e80cb4"
        ];

        this.modeDefs = {
            ionien: {
                display: "Ionien",
                romans: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
                intervals: [0, 2, 4, 5, 7, 9, 11],
                qualities: ["", "m", "m", "", "", "m", "dim"]
            },
            dorien: {
                display: "Dorien",
                romans: ["i", "ii", "III", "IV", "v", "vi°", "VII"],
                intervals: [0, 2, 3, 5, 7, 9, 10],
                qualities: ["m", "m", "", "", "m", "dim", ""]
            },
            phrygien: {
                display: "Phrygien",
                romans: ["i", "II", "III", "iv", "v°", "VI", "vii"],
                intervals: [0, 1, 3, 5, 7, 8, 10],
                qualities: ["m", "", "", "m", "dim", "", "m"]
            },
            lydien: {
                display: "Lydien",
                romans: ["I", "II", "iii", "#iv°", "V", "vi", "vii"],
                intervals: [0, 2, 4, 6, 7, 9, 11],
                qualities: ["", "", "m", "dim", "", "m", "m"]
            },
            mixolydien: {
                display: "Mixolydien",
                romans: ["I", "ii", "iii°", "IV", "v", "vi", "VII"],
                intervals: [0, 2, 4, 5, 7, 9, 10],
                qualities: ["", "m", "dim", "", "m", "m", ""]
            },
            eolien: {
                display: "Eolien",
                romans: ["i", "ii°", "III", "iv", "v", "VI", "VII"],
                intervals: [0, 2, 3, 5, 7, 8, 10],
                qualities: ["m", "dim", "", "m", "m", "", ""]
            },
            locrien: {
                display: "Locrien",
                romans: ["i°", "II", "iii", "iv", "V", "VI", "vii"],
                intervals: [0, 1, 3, 5, 6, 8, 10],
                qualities: ["dim", "", "m", "m", "", "", "m"]
            }
        };
    }

    _normalizeModeName(name) {
        return String(name ?? "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    setMode(modeName) {
        const key = this._normalizeModeName(modeName);
        const def = this.modeDefs[key];
        if (!def) return;

        this._modeDef = def;
        this.selectedModeLabel = def.display;

        this._syncSelectionContext();
        this._refreshColumns();
        this.invalidate();
    }

    setRootContext(rootIndex, labelType, theory) {
        this._rootIndex = Number.isInteger(rootIndex) ? rootIndex : null;
        this._labelType = labelType || "noteEN";
        this._theory = theory || null;

        this._syncSelectionContext();
        this._refreshColumns();
        this.invalidate();
    }

    consumePendingUseFlats() {
        const v = this._pendingUseFlats;
        this._pendingUseFlats = null;
        return v;
    }

    _toNoteName(pc, useFlats) {
        const note = this._theory?.NOTES?.[((pc % 12) + 12) % 12];
        if (!note) return null;

        const nameEN = useFlats ? note.flat : note.sharp;
        if (this._labelType === "noteFR") {
            return this._theory.translateENtoFR(nameEN);
        }
        return nameEN;
    }

    _qualitySuffix(q) {
        if (q === "m") return "m";
        if (q === "dim") return "°";
        return "";
    }

    _withUnicodeAccidentals(text) {
        return String(text ?? "")
            .replace(/#/g, "♯")
            .replace(/b/g, "♭");
    }

    _getRomanAccidental(degreeIndex) {
        const major = [0, 2, 4, 5, 7, 9, 11];
        const modeInt = this._modeDef?.intervals?.[degreeIndex];
        const majorInt = major[degreeIndex];

        if (!Number.isFinite(modeInt) || !Number.isFinite(majorInt)) return "";

        let delta = modeInt - majorInt;
        while (delta <= -6) delta += 12;
        while (delta > 6) delta -= 12;

        if (delta === -2) return "♭♭";
        if (delta === -1) return "♭";
        if (delta === 1) return "♯";
        if (delta === 2) return "♯♯";
        return "";
    }

    _decorateRoman(roman, degreeIndex) {
        const core = String(roman ?? "").replace(/^[#b♯♭]+/, "");
        return this._getRomanAccidental(degreeIndex) + core;
    }

    _isAccidentalChar(ch) {
        return ch === "♭" || ch === "♯";
    }

    _measureTightText(label, accidentalAdvanceFactor = 0.72) {
        const s = String(label ?? "");
        let w = 0;
        for (const ch of s) {
            const cw = textWidth(ch);
            w += this._isAccidentalChar(ch) ? (cw * accidentalAdvanceFactor) : cw;
        }
        return w;
    }

    _drawTightCenteredText(label, cx, cy, accidentalAdvanceFactor = 0.72) {
        const s = String(label ?? "");

        // Sans ♭/♯ : centrage natif p5, exact sur toutes les plateformes.
        const hasAccidentals = [...s].some(ch => this._isAccidentalChar(ch));
        if (!hasAccidentals) {
            textAlign(CENTER, CENTER);
            text(s, cx, cy);
            return;
        }

        // Avec ♭/♯ : rendu caractère par caractère, avance réduite uniquement sur les accidentels.
        const totalW = this._measureTightText(s, accidentalAdvanceFactor);
        let x = cx - totalW / 2;

        textAlign(LEFT, CENTER);
        for (const ch of s) {
            text(ch, x, cy);
            const cw = textWidth(ch);
            x += this._isAccidentalChar(ch) ? (cw * accidentalAdvanceFactor) : cw;
        }
    }

    _extractLetterStem(name) {
        const ascii = String(name ?? "").replace(/[♯♭#b]/g, "");
        const m = ascii.match(/[A-Za-z]+/);
        return (m?.[0] ?? ascii).toLowerCase();
    }

    _hasDuplicateLetterStems(chords) {
        const seen = new Set();
        for (const c of chords) {
            const stem = this._extractLetterStem(c.note);
            if (seen.has(stem)) return true;
            seen.add(stem);
        }
        return false;
    }

    _hasMissingNotes(chords) {
        const expected = this._modeDef?.intervals?.length ?? 0;
        return chords.length !== expected;
    }

    _buildChords(useFlats) {
        const out = [];
        for (let i = 0; i < this._modeDef.intervals.length; i++) {
            const interval = this._modeDef.intervals[i];
            const quality = this._modeDef.qualities[i] || "";
            const pc = (this._rootIndex + interval) % 12;
            const noteName = this._toNoteName(pc, useFlats);
            if (!noteName) continue;

            const chordPitchClasses = this._buildTriadPitchClasses(pc, quality);

            out.push({
                degreeIndex: i,
                note: noteName,
                quality,
                rootPc: pc,
                chordPitchClasses,
                chord: this._withUnicodeAccidentals(noteName + this._qualitySuffix(quality))
            });
        }
        return out;
    }

    _buildTriadPitchClasses(rootPc, quality) {
        let intervals = [0, 4, 7];

        if (quality === "m") intervals = [0, 3, 7];
        if (quality === "dim") intervals = [0, 3, 6];
        if (quality === "aug") intervals = [0, 4, 8];

        return intervals.map(semitones => (rootPc + semitones) % 12);
    }

    _getSelectionContextKey() {
        const mode = this._normalizeModeName(this.selectedModeLabel);
        const root = this._rootIndex == null ? "none" : this._rootIndex;
        return `${mode}|${root}`;
    }

    _syncSelectionContext() {
        const nextKey = this._getSelectionContextKey();
        if (nextKey === this._selectionContextKey) return;

        const hadSelection = this._selectedCols.size > 0;
        this._selectionContextKey = nextKey;
        this._selectedCols.clear();

        if (hadSelection) {
            this.onChange?.({
                type: "modeChordSelectionClear",
                selectedIndices: [],
                selectedChords: []
            });
        }
    }

    _buildColumnPayload(index) {
        const col = this.columns[index] || {};
        const selectedChords = this._getSelectedChordPayloads();

        return {
            index,
            roman: col.roman ?? "",
            chord: col.chord ?? "",
            degreeIndex: col.degreeIndex ?? index,
            quality: col.quality ?? "",
            rootPc: col.rootPc ?? null,
            chordPitchClasses: Array.isArray(col.chordPitchClasses) ? [...col.chordPitchClasses] : [],
            selectionKey: `${this._selectionContextKey}|${index}`,
            selected: this._selectedCols.has(index),
            selectedIndices: Array.from(this._selectedCols).sort((a, b) => a - b),
            selectedChords
        };
    }

    _getSelectedChordPayloads() {
        return Array.from(this._selectedCols)
            .sort((a, b) => a - b)
            .map(index => {
                const col = this.columns[index] || {};
                return {
                    index,
                    roman: col.roman ?? "",
                    chord: col.chord ?? "",
                    degreeIndex: col.degreeIndex ?? index,
                    quality: col.quality ?? "",
                    rootPc: col.rootPc ?? null,
                    chordPitchClasses: Array.isArray(col.chordPitchClasses) ? [...col.chordPitchClasses] : [],
                    selectionKey: `${this._selectionContextKey}|${index}`
                };
            });
    }

    _emitHoverChange(index) {
        if (index == null || index < 0) {
            this.onChange?.({
                type: "modeChordHover",
                active: false,
                index: -1,
                chordPitchClasses: []
            });
            return;
        }

        this.onChange?.({
            type: "modeChordHover",
            active: true,
            ...this._buildColumnPayload(index)
        });
    }

    _getChordNeonColor(rootPc) {
        if (!Number.isInteger(rootPc)) return color(58, 78, 92, 230);
        const idx = ((rootPc % 12) + 12) % 12;
        return color(this._chromaNeonHex[idx]);
    }

    _refreshColumns() {
        if (!this._modeDef || !this._theory || this._rootIndex == null) {
            this.columns = (this._modeDef?.romans ?? []).map((roman, i) => ({
                index: i,
                roman: this._decorateRoman(roman, i),
                chord: "-"
            }));
            return;
        }

        let useFlats = !!this._theory.useFlats;
        let chords = this._buildChords(useFlats);

        const hasDuplicate = this._hasDuplicateLetterStems(chords);
        const hasMissing = this._hasMissingNotes(chords);

        if (hasDuplicate || hasMissing) {
            const toggled = !useFlats;
            const alt = this._buildChords(toggled);

            const altDuplicate = this._hasDuplicateLetterStems(alt);
            const altMissing = this._hasMissingNotes(alt);

            const fixesDuplicate = hasDuplicate && !altDuplicate;
            const fixesMissing = hasMissing && !altMissing;

            if (fixesDuplicate || fixesMissing) {
                useFlats = toggled;
                chords = alt;
                this._theory.useFlats = useFlats;
                this._pendingUseFlats = useFlats;
            }
        }

        this.columns = this._modeDef.romans.map((roman, i) => {
            const ch = chords[i];
            return {
                index: i,
                roman: this._decorateRoman(roman, i),
                chord: ch ? ch.chord : "-",
                degreeIndex: ch ? ch.degreeIndex : i,
                quality: ch ? ch.quality : "",
                rootPc: ch ? ch.rootPc : null,
                chordPitchClasses: ch ? [...ch.chordPitchClasses] : []
            };
        });
    }

    _rebuildHitColumns() {
        this._hitColumns = [];
        if (!this.columns.length) return;

        const rowGap = this.h * 0.05;
        const colGap = this.w * 0.014;
        const headerH = this.h * 0.12;
        const topPad = this.h * 0.03;
        const bottomPad = this.h * 0.05;

        const yRoman = this.y + headerH + topPad;
        const contentBottom = this.y + this.h - bottomPad;
        const boxH = (contentBottom - yRoman - rowGap) / 2;

        const rawInnerW = this.w * 0.94;
        const rawColW = (rawInnerW - (this.columns.length - 1) * colGap) / this.columns.length;
        const targetColW = boxH * 1.08;
        const colW = Math.min(rawColW, targetColW);

        const totalW = this.columns.length * colW + (this.columns.length - 1) * colGap;
        const innerX = this.x + (this.w - totalW) / 2;

        for (let i = 0; i < this.columns.length; i++) {
            const cx = innerX + i * (colW + colGap);
            const yChord = yRoman + boxH + rowGap;
            this._hitColumns.push({
                index: i,
                x: cx,
                w: colW,
                yRoman,
                yChord,
                h: boxH
            });
        }
    }

    mouseMoved(evt) {
        if (!this.containsRect(evt)) {
            if (this._hoverCol !== -1) {
                this._hoverCol = -1;
                this._emitHoverChange(-1);
                this.invalidate();
            }
            return false;
        }

        this._rebuildHitColumns();
        const idx = this._hitColumns.find(h =>
            evt.x >= h.x && evt.x <= h.x + h.w && evt.y >= h.yRoman && evt.y <= h.yChord + h.h
        )?.index ?? -1;

        if (idx !== this._hoverCol) {
            this._hoverCol = idx;
            this._emitHoverChange(idx);
            this.invalidate();
        }
        return true;
    }

    mousePressed(evt) {
        if (!this.containsRect(evt)) return false;
        this._rebuildHitColumns();

        for (const h of this._hitColumns) {
            const inside = evt.x >= h.x && evt.x <= h.x + h.w && evt.y >= h.yRoman && evt.y <= h.yChord + h.h;
            if (!inside) continue;

            if (this._selectedCols.has(h.index)) {
                this._selectedCols.delete(h.index);
            } else {
                this._selectedCols.add(h.index);
            }

            this.onChange?.({
                type: "modeChordToggle",
                ...this._buildColumnPayload(h.index)
            });
            this.invalidate();
            return true;
        }

        return true;
    }

    draw() {
        push();

        textFont("sans-serif");
        noStroke();
        fill(20, 26, 30, 230);
        rect(this.x, this.y, this.w, this.h, this.h * 0.08);

        fill(170, 210, 230);
        textAlign(LEFT, TOP);
        textSize(this.h * 0.09);
        text(`Mode: ${this.selectedModeLabel}`, this.x + this.w * 0.03, this.y + this.h * 0.03);

        this._rebuildHitColumns();
        for (const h of this._hitColumns) {
            const col = this.columns[h.index] || { roman: "", chord: "" };
            const hovered = h.index === this._hoverCol;
            const selected = this._selectedCols.has(h.index);
            const baseNeon = this._getChordNeonColor(col.rootPc);

            const boxColor = color(baseNeon);
            boxColor.setAlpha(selected ? 235 : (hovered ? 215 : 168));

            const glowColor = color(baseNeon);
            glowColor.setAlpha(selected ? 210 : (hovered ? 170 : 95));

            noStroke();
            fill(boxColor);
            rect(h.x, h.yRoman, h.w, h.h, this.h * 0.03);
            rect(h.x, h.yChord, h.w, h.h, this.h * 0.03);

            noFill();
            if (selected) {
                const ringOuter = color(baseNeon);
                ringOuter.setAlpha(245);

                const ringInner = color(255, 255, 255, 230);

                drawingContext.save();
                drawingContext.shadowColor = ringOuter.toString();
                drawingContext.shadowBlur = this.h * 0.05;

                stroke(ringOuter);
                strokeWeight(this.h * 0.014);
                rect(h.x, h.yRoman, h.w, h.h, this.h * 0.03);
                rect(h.x, h.yChord, h.w, h.h, this.h * 0.03);

                drawingContext.restore();

                stroke(ringInner);
                strokeWeight(this.h * 0.006);
                rect(h.x, h.yRoman, h.w, h.h, this.h * 0.03);
                rect(h.x, h.yChord, h.w, h.h, this.h * 0.03);
            } else {
                stroke(glowColor);
                strokeWeight(hovered ? this.h * 0.009 : this.h * 0.007);
                rect(h.x, h.yRoman, h.w, h.h, this.h * 0.03);
                rect(h.x, h.yChord, h.w, h.h, this.h * 0.03);
            }

            fill(selected ? color(235, 255, 245) : 245);
            noStroke();
            textAlign(CENTER, CENTER);
            textFont("Times New Roman");
            textSize(Math.min(this.h * 0.2, h.h * 0.72));
            this._drawTightCenteredText(col.roman, h.x + h.w / 2, h.yRoman + h.h / 2, 0.68);

            fill(selected ? color(210, 255, 230) : color(255, 230, 150));
            textFont("sans-serif");
            textSize(Math.min(this.h * 0.18, h.h * 0.55));
            this._drawTightCenteredText(col.chord, h.x + h.w / 2, h.yChord + h.h / 2, 0.7);
        }

        pop();

        super.draw();
    }
}
