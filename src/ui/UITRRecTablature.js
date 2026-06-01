class TRRecTablature extends UIComponent {

    constructor(cfg = {}) {
        super();

        this.aspectRatio = cfg.aspectRatio ?? 3.2;

        const xp = cfg.xp ?? 0;
        const yp = cfg.yp ?? 0;
        const sp = cfg.sp ?? 100;

        this.setResponsive(xp, yp, sp);
        this.updateResponsive();

        this.stepsPerBar = cfg.stepsPerBar ?? 4;
        this.visibleBars = cfg.visibleBars ?? 5;

        this.isDraggable = false;
        this.isZoomable = false;

        this._trRec = null;
        this._guitar = null;
        this._instrument = null;
        this._lcd2 = null;
        this._harmonyDetector = null;
        this._stepPulseByGlobalStep = new Map();
        this._lastHighlightedGlobalStep = null;

        this.showChordNames = cfg.showChordNames ?? true;

        this.maxEditableFret = cfg.maxEditableFret ?? 24;
    }

    _resolveRefs() {
        if (!this.app || !Array.isArray(this.app.components)) return;

        if (!this._trRec) {
            this._trRec = this.app.components.find(c => c.name === "trRecPads") || null;
        }

        if (!this._guitar) {
            this._guitar = this.app.components.find(c => c.name === "guitar1") || null;
        }

        if (!this._instrument && this._guitar?.instrument) {
            this._instrument = this._guitar.instrument;
        }

        if (!this._lcd2) {
            this._lcd2 = this.app.components.find(c => c.name === "lcd2") || null;
        }

        if (!this._harmonyDetector && this.app?.theory) {
            this._harmonyDetector = new HarmonyDetector(this.app.theory);
        } else if (this._harmonyDetector && this.app?.theory) {
            this._harmonyDetector.theory = this.app.theory;
        }
    }

    _getPadCount() {
        const tr = this._trRec;
        if (!tr) return 16;
        return Number.isFinite(tr.padCount) ? tr.padCount : 16;
    }

    _getVisibleBarCount() {
        const tr = this._trRec;
        const measureCount = Array.isArray(tr?.measures) ? tr.measures.length : 1;

        // Si la sequence ne contient qu'une seule mesure, inutile d'afficher la barre d'anticipation.
        if (measureCount <= 1) return 4;
        return this.visibleBars;
    }

    _getWindowStartGlobalStep() {
        const tr = this._trRec;
        const padCount = this._getPadCount();
        const currentMeasure = Number.isFinite(tr?.measureIndex) ? tr.measureIndex : 0;

        // Scroll uniquement de sequence en sequence.
        return currentMeasure * padCount;
    }

    _resolveStepAt(windowStepIndex) {
        const tr = this._trRec;
        if (!tr) return null;

        const padCount = this._getPadCount();
        const stepsPerBar = this.stepsPerBar;
        const globalStart = this._getWindowStartGlobalStep();
        const globalStep = globalStart + windowStepIndex;

        const measureIndex = Math.floor(globalStep / padCount);
        const stepIndex = ((globalStep % padCount) + padCount) % padCount;

        const measures = Array.isArray(tr.measures) ? tr.measures : [];
        const measure = measures[measureIndex] || null;
        const step = Array.isArray(measure) ? (measure[stepIndex] || null) : null;

        const subBarIndex = Math.floor(stepIndex / stepsPerBar);

        return {
            measureIndex,
            stepIndex,
            globalStep,
            subBarIndex,
            step,
            exists: Array.isArray(measure)
        };
    }

    _tabFretsToMap(tabFrets) {
        if (!tabFrets || typeof tabFrets !== "object") return null;

        const out = new Map();
        for (const [k, v] of Object.entries(tabFrets)) {
            const stringNumber = Number(k);
            const fret = Number(v);

            if (!Number.isFinite(stringNumber) || !Number.isFinite(fret)) continue;
            if (stringNumber < 1 || stringNumber > 6) continue;
            if (fret < 0) continue;

            out.set(stringNumber, Math.round(fret));
        }

        return out.size > 0 ? out : null;
    }

    _mapToTabFrets(map) {
        if (!(map instanceof Map) || map.size === 0) return null;

        const out = {};
        for (const [stringNumber, fret] of map.entries()) {
            out[String(stringNumber)] = Math.max(0, Math.round(fret));
        }

        return out;
    }

    _normalizeAccidentals(text) {
        return String(text ?? "")
            .replace(/([A-Ga-g])#/g, "$1♯")
            .replace(/([A-Ga-g])b/g, "$1♭")
            .trim();
    }

    _getStepChordName(stepData) {
        if (!stepData || stepData.etat !== 1) return "";
        if (!this._harmonyDetector || !this._instrument) return "";

        const noteList = [];
        const stringMap = this._stepToStringMap(stepData);
        if (!stringMap || stringMap.size === 0) return "";

        for (const [stringNumber, fret] of stringMap.entries()) {
            noteList.push({ string: stringNumber, fret });
        }

        const extracted = this._harmonyDetector.extractFromFrettedNotes(noteList, this._instrument);
        const analysis = this._harmonyDetector.analyzePitchClassSet(
            extracted.pcs,
            this.app?.theory?.hasRoot?.() ? this.app.theory.root : null,
            extracted.bassPc,
            { noteCount: extracted.noteCount }
        );

        return this._normalizeAccidentals(analysis?.chord?.symbol || "");
    }

    _toggleChordNames() {
        this.showChordNames = !this.showChordNames;
        this.invalidate();
    }

    _buildSnapshotStringMap(snapshot) {
        const map = new Map();
        const selected = Array.isArray(snapshot?.selectedNotes) ? snapshot.selectedNotes : [];
        const pinned = Array.isArray(snapshot?.pinnedNotes) ? snapshot.pinnedNotes : [];

        const notes = [...pinned, ...selected];

        for (const note of notes) {
            const stringNumber = Number(note?.string);
            const fret = Number(note?.fret);

            if (!Number.isFinite(stringNumber) || !Number.isFinite(fret)) continue;
            if (stringNumber < 1 || stringNumber > 6) continue;

            const existing = map.get(stringNumber);
            if (!Number.isFinite(existing) || fret > existing) {
                map.set(stringNumber, fret);
            }
        }

        return map;
    }

    _stepToStringMap(stepData) {
        if (!stepData || stepData.etat !== 1) return null;

        const fromTab = this._tabFretsToMap(stepData.tabFrets);
        if (fromTab) return fromTab;

        const snapshotIndex = stepData.itemIndex;
        if (!Number.isInteger(snapshotIndex)) return null;

        const snapshots = Array.isArray(this._guitar?.snapshots) ? this._guitar.snapshots : [];
        if (snapshotIndex < 0 || snapshotIndex >= snapshots.length) return null;

        return this._buildSnapshotStringMap(snapshots[snapshotIndex]);
    }

    _getLayout(visibleBarCount) {
        // Plus d'air en partie haute + lignes un peu plus compactes verticalement.
        const padTop = this.h * 0.40;
        const padBottom = this.h * 0.09;
        const padLeft = this.w * 0.075;
        const padRight = this.w * 0.03;

        const gridX = this.x + padLeft;
        const gridY = this.y + padTop;
        const gridW = Math.max(10, this.w - padLeft - padRight);
        const gridH = Math.max(10, this.h - padTop - padBottom);

        const stringCount = 6;
        const totalSteps = visibleBarCount * this.stepsPerBar;
        const stepW = gridW / totalSteps;
        const rowH = gridH / Math.max(1, stringCount - 1);

        return {
            gridX,
            gridY,
            gridW,
            gridH,
            stringCount,
            totalSteps,
            stepW,
            rowH
        };
    }

    _isChordLabelBandHit(mx, my, layout) {
        if (!layout) return false;

        const bandTop = layout.gridY - layout.rowH * 1.7;
        const bandBottom = layout.gridY - layout.rowH * 0.72;
        return (
            mx >= layout.gridX &&
            mx <= layout.gridX + layout.gridW &&
            my >= bandTop &&
            my <= bandBottom
        );
    }

    _selectSubMeasure(stepRef) {
        const tr = this._trRec;
        if (!tr || !stepRef) return;

        if (typeof tr.setMeasureIndex === "function" && tr.measureIndex !== stepRef.measureIndex) {
            tr.setMeasureIndex(stepRef.measureIndex);
        }

        const groupIndex = Math.floor(stepRef.stepIndex / this.stepsPerBar);
        if (typeof tr.selectSubMeasure === "function") {
            tr.selectSubMeasure(groupIndex, { syncPlayhead: true });
        } else {
            tr.playIndex = groupIndex * this.stepsPerBar;
            tr.invalidate?.();
        }

        const snapshotIndex = stepRef.step?.itemIndex;
        if (this._lcd2 && Number.isInteger(snapshotIndex)) {
            const itemCount = Array.isArray(this._lcd2.items) ? this._lcd2.items.length : 0;
            if (snapshotIndex >= 0 && snapshotIndex < itemCount) {
                this._lcd2.state = snapshotIndex;
                this._lcd2.isOn = itemCount > 0;
                this._lcd2.invalidate?.();
            }
        }

        this.invalidate();
    }

    mouseReleased(evt) {
        if (!evt) return false;
        if (!this.containsRect(evt)) return false;

        this._resolveRefs();
        const tr = this._trRec;
        if (!tr) return false;

        const visibleBarCount = this._getVisibleBarCount();
        const layout = this._getLayout(visibleBarCount);

        const mx = evt.x;
        const my = evt.y;

        if (evt.button === LEFT && this._isChordLabelBandHit(mx, my, layout)) {
            this._toggleChordNames();
            return true;
        }

        if (mx < layout.gridX || mx > layout.gridX + layout.gridW) return true;
        if (my < layout.gridY - layout.rowH * 0.5 || my > layout.gridY + layout.gridH + layout.rowH * 0.5) return true;

        const col = Math.floor((mx - layout.gridX) / layout.stepW);
        if (!Number.isFinite(col) || col < 0 || col >= layout.totalSteps) return true;

        const stepRef = this._resolveStepAt(col);
        if (!stepRef) return true;
        this._selectSubMeasure(stepRef);
        return true;
    }

    draw() {
        super.draw();
        this._resolveRefs();

        fill(250, 250, 246, 245);
        stroke(35);
        strokeWeight(max(1, this.h * 0.012));
        rect(this.x, this.y, this.w, this.h, this.h * 0.04);

        const tr = this._trRec;
        if (!tr) {
            noStroke();
            fill(20);
            textAlign(CENTER, CENTER);
            textSize(this.h * 0.1);
            text("Tablature: sequenceur introuvable", this.x + this.w * 0.5, this.y + this.h * 0.5);
            return;
        }

        const visibleBarCount = this._getVisibleBarCount();
        const layout = this._getLayout(visibleBarCount);
        const gridX = layout.gridX;
        const gridY = layout.gridY;
        const gridW = layout.gridW;
        const gridH = layout.gridH;
        const stringCount = layout.stringCount;
        const totalSteps = layout.totalSteps;
        const stepW = layout.stepW;
        const rowH = layout.rowH;
        const fretTextSize = this.h * 0.085;

        let highlightedGlobalStep = null;
        for (let step = 0; step < totalSteps; step++) {
            const ref = this._resolveStepAt(step);
            if (ref?.step?.highlight) {
                highlightedGlobalStep = ref.globalStep;
                break;
            }
        }

        if (Number.isInteger(highlightedGlobalStep) && highlightedGlobalStep !== this._lastHighlightedGlobalStep) {
            this._stepPulseByGlobalStep.set(highlightedGlobalStep, 1);
        }
        this._lastHighlightedGlobalStep = highlightedGlobalStep;

        let hasActivePulse = false;
        for (const [globalStep, value] of this._stepPulseByGlobalStep.entries()) {
            const next = value * 0.82;
            if (next <= 0.02) {
                this._stepPulseByGlobalStep.delete(globalStep);
                continue;
            }
            this._stepPulseByGlobalStep.set(globalStep, next);
            hasActivePulse = true;
        }

        noStroke();
        fill(30);
        textAlign(LEFT, CENTER);
        textSize(this.h * 0.09);

        for (let i = 0; i < stringCount; i++) {
            const y = gridY + i * rowH;
            stroke(40, 40, 40, 200);
            strokeWeight(max(1, this.h * 0.006));
            line(gridX, y, gridX + gridW, y);
        }

        stroke(20, 20, 20, 220);
        strokeWeight(max(1, this.h * 0.008));
        line(gridX, gridY - this.h * 0.02, gridX, gridY + gridH + this.h * 0.01);
        line(gridX + gridW, gridY - this.h * 0.02, gridX + gridW, gridY + gridH + this.h * 0.01);

        if (visibleBarCount > 4) {
            const previewX = gridX + (visibleBarCount - 1) * this.stepsPerBar * stepW;
            stroke(120, 120, 120, 190);
            strokeWeight(max(1, this.h * 0.005));
            line(previewX, gridY - this.h * 0.016, previewX, gridY + gridH + this.h * 0.008);
        }

        let lastChordName = "";

        for (let step = 0; step < totalSteps; step++) {
            const x = gridX + step * stepW;
            const stepRef = this._resolveStepAt(step);
            if (!stepRef) continue;

            const s = stepRef.step;
            const isMuted = s?.etat === 2;
            const isHighlighted = !!s?.highlight;
            const stepFlash = constrain(Number(s?.flash) || 0, 0, 1.5);
            const flashPulse = constrain(stepFlash / 1.5, 0, 1);
            const replayPulse = constrain(this._stepPulseByGlobalStep.get(stepRef.globalStep) || 0, 0, 1);
            const pulse = max(flashPulse, replayPulse);

            if (isMuted) {
                noStroke();
                fill(170, 170, 170, 90);
                rect(x + stepW * 0.07, gridY - this.h * 0.008, stepW * 0.86, gridH + this.h * 0.016, this.h * 0.01);
            }

            if (isHighlighted) {
                noStroke();
                fill(255, 205, 40, 120);
                rect(x + stepW * 0.04, gridY - this.h * 0.012, stepW * 0.92, gridH + this.h * 0.024, this.h * 0.012);
            }

            if (pulse > 0.01) {
                noStroke();
                fill(255, 230, 110, 120 * pulse);
                rect(x + stepW * 0.02, gridY - this.h * 0.016, stepW * 0.96, gridH + this.h * 0.032, this.h * 0.014);
            }

            const stringMap = this._stepToStringMap(s);
            if (!stringMap || stringMap.size === 0) continue;

            const stepChordName = this.showChordNames ? this._getStepChordName(s) : "";
            if (stepChordName && stepChordName !== lastChordName) {
                lastChordName = stepChordName;
                const chordX = x + stepW * 0.5;
                const chordY = gridY - rowH * 1.42;

                textAlign(CENTER, CENTER);
                textSize(this.h * 0.115);

                const labelPadX = this.w * 0.01;
                const labelW = textWidth(stepChordName) + labelPadX * 2;
                const labelH = this.h * 0.055;

                noStroke();
                fill(250, 250, 246, 220);
                rect(chordX - labelW * 0.5, chordY - labelH * 0.5, labelW, labelH, labelH * 0.32);

                fill(18);
                text(stepChordName, chordX, chordY);
            }

            for (let row = 0; row < stringCount; row++) {
                const stringNumber = stringCount - row;
                if (!stringMap.has(stringNumber)) continue;

                const fret = stringMap.get(stringNumber);
                const y = gridY + row * rowH;

                const fretText = String(max(0, Math.round(fret)));
                textSize(fretTextSize);
                const bubbleW = max(stepW * 0.64, textWidth(fretText) + this.h * 0.08);
                const bubbleH = max(rowH * 0.82, fretTextSize * 1.38);
                const bubbleX = x + (stepW - bubbleW) * 0.5;
                const bubbleY = y - bubbleH * 0.5;

                noStroke();
                const baseColor = isHighlighted ? color(255, 236, 130) : color(244, 244, 244);
                const pulseColor = color(255, 228, 95);
                fill(lerpColor(baseColor, pulseColor, pulse));
                rect(bubbleX, bubbleY, bubbleW, bubbleH, bubbleH * 0.28);

                stroke(25, 25, 25, 150);
                strokeWeight(max(1, this.h * 0.0025));
                fill(20);
                textAlign(CENTER, CENTER);
                textSize(fretTextSize);
                text(fretText, x + stepW * 0.5, y + rowH * 0.01);
            }
        }

        if (hasActivePulse) {
            this.invalidate();
        }
    }
}
