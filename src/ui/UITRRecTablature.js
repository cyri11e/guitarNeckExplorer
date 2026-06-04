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
        this._manualCursorGlobalStep = null;

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

    _resolveGlobalStep(globalStep) {
        const tr = this._trRec;
        if (!tr || !Number.isFinite(globalStep)) return null;

        const padCount = this._getPadCount();
        const measures = Array.isArray(tr.measures) ? tr.measures : [];

        const measureIndex = Math.floor(globalStep / padCount);
        const stepIndex = ((globalStep % padCount) + padCount) % padCount;
        const measure = measures[measureIndex] || null;
        const step = Array.isArray(measure) ? (measure[stepIndex] || null) : null;

        return {
            measureIndex,
            stepIndex,
            globalStep,
            step,
            exists: Array.isArray(measure)
        };
    }

    _stepHasPlayableNotes(stepData) {
        if (!stepData || stepData.etat !== 1) return false;
        const map = this._stepToStringMap(stepData);
        return !!(map && map.size > 0);
    }

    _findActiveCursorGlobalStep(highlightedGlobalStep) {
        if (!Number.isInteger(highlightedGlobalStep)) return null;

        let globalStep = highlightedGlobalStep;
        while (globalStep >= 0) {
            const ref = this._resolveGlobalStep(globalStep);
            if (!ref || !ref.exists) return null;

            const stepData = ref.step;
            if (stepData?.etat === 2) return null;
            if (this._stepHasPlayableNotes(stepData)) return globalStep;

            globalStep -= 1;
        }

        return null;
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
        const padLeft = this.w * 0.03;
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

    _isTopMarkerBandHit(mx, my, layout) {
        if (!layout) return false;

        const bandTop = layout.gridY - layout.rowH * 0.68;
        const bandBottom = layout.gridY - layout.rowH * 0.12;
        return (
            mx >= layout.gridX &&
            mx <= layout.gridX + layout.gridW &&
            my >= bandTop &&
            my <= bandBottom
        );
    }

    _normalizeTopMarker(value) {
        if (value === "PM" || value === "^") return value;
        return null;
    }

    _cycleTopMarker(stepData) {
        if (!stepData || typeof stepData !== "object") return;

        const current = this._normalizeTopMarker(stepData.topMarker);
        if (current == null) {
            stepData.topMarker = "PM";
            return;
        }

        if (current === "PM") {
            stepData.topMarker = "^";
            return;
        }

        stepData.topMarker = null;
    }

    _normalizeNoteFx(value) {
        if (value === "bendQuarter" || value === "bendHalf" || value === "bendFull" || value === "slide" || value === "slidePrev" || value === "hammer" || value === "pull") return value;
        return null;
    }

    _getStepNoteFx(stepData, stringNumber) {
        if (!stepData || !Number.isFinite(stringNumber)) return null;
        return this._normalizeNoteFx(stepData?.noteFx?.[String(stringNumber)]);
    }

    _getStepFxMentions(stepData) {
        if (!stepData || typeof stepData.noteFx !== "object" || !stepData.noteFx) return [];

        let hasBend = false;
        let hasSlide = false;
        let hasHammer = false;
        let hasPull = false;
        for (const rawFx of Object.values(stepData.noteFx)) {
            const fx = this._normalizeNoteFx(rawFx);
            if (fx === "bendQuarter" || fx === "bendHalf" || fx === "bendFull") hasBend = true;
            if (fx === "slide" || fx === "slidePrev") hasSlide = true;
            if (fx === "hammer") hasHammer = true;
            if (fx === "pull") hasPull = true;
        }

        const out = [];
        if (hasBend) out.push("b");
        if (hasSlide) out.push("sl.");
        if (hasHammer) out.push("H");
        if (hasPull) out.push("P");
        return out;
    }

    _setStepNoteFx(stepData, stringNumber, fx) {
        if (!stepData || !Number.isFinite(stringNumber)) return;

        const safeFx = this._normalizeNoteFx(fx);
        if (!stepData.noteFx || typeof stepData.noteFx !== "object") {
            stepData.noteFx = {};
        }

        if (!safeFx) {
            delete stepData.noteFx[String(stringNumber)];
            if (Object.keys(stepData.noteFx).length === 0) {
                stepData.noteFx = null;
            }
            return;
        }

        stepData.noteFx[String(stringNumber)] = safeFx;
    }

    _cycleStepNoteFx(stepData, stringNumber) {
        const current = this._getStepNoteFx(stepData, stringNumber);
        const order = [null, "bendQuarter", "bendHalf", "bendFull", "slide", "hammer"];
        const idx = order.indexOf(current);
        const next = order[(idx + 1) % order.length];
        this._setStepNoteFx(stepData, stringNumber, next);
    }

    _toggleStepPullFx(stepData, stringNumber) {
        const current = this._getStepNoteFx(stepData, stringNumber);
        this._setStepNoteFx(stepData, stringNumber, current === "pull" ? null : "pull");
    }

    _drawHeldArc(startX, endX, anchorY) {
        const arcCenterX = (startX + endX) * 0.5;
        const arcWidth = max(4, abs(endX - startX) * 1.02);
        const arcHeight = max(this.h * 0.035, this.h * 0.052);
        const arcCenterY = anchorY - arcHeight * 0.02;

        noFill();
        stroke(32, 32, 32, 220);
        strokeWeight(max(1.1, this.h * 0.0034));
        arc(arcCenterX, arcCenterY, arcWidth, arcHeight, PI, TWO_PI);
    }

    _getBubbleRectForNote(layout, stepX, stringNumber, fret) {
        const rowIndex = layout.stringCount - stringNumber;
        if (rowIndex < 0 || rowIndex >= layout.stringCount) return null;

        const y = layout.gridY + rowIndex * layout.rowH;
        const fretText = String(max(0, Math.round(fret)));
        const fretTextSize = this.h * 0.085;

        textSize(fretTextSize);
        const bubbleW = max(layout.stepW * 0.64, textWidth(fretText) + this.h * 0.08);
        const bubbleH = max(layout.rowH * 0.82, fretTextSize * 1.38);
        const bubbleX = stepX + (layout.stepW - bubbleW) * 0.5;
        const bubbleY = y - bubbleH * 0.5;

        return {
            rowIndex,
            y,
            bubbleX,
            bubbleY,
            bubbleW,
            bubbleH,
            centerX: bubbleX + bubbleW * 0.5,
            centerY: y,
            leftX: bubbleX,
            rightX: bubbleX + bubbleW
        };
    }

    _getFretTextBounds(centerX, centerY, fretText, fretTextSize) {
        textSize(fretTextSize);

        const textW = textWidth(fretText);
        const textH = max(1, textAscent() + textDescent());

        return {
            left: centerX - textW * 0.5,
            right: centerX + textW * 0.5,
            top: centerY - textH * 0.5,
            bottom: centerY + textH * 0.5,
            centerX,
            centerY,
            width: textW,
            height: textH
        };
    }

    _findNextPlayableStepOnString(globalStep, stringNumber) {
        if (!Number.isInteger(globalStep) || !Number.isFinite(stringNumber)) return null;

        const tr = this._trRec;
        const measures = Array.isArray(tr?.measures) ? tr.measures : [];
        const padCount = this._getPadCount();
        const maxGlobal = measures.length * padCount - 1;

        for (let g = globalStep + 1; g <= maxGlobal; g++) {
            const ref = this._resolveGlobalStep(g);
            if (!ref || !ref.exists) break;

            if (ref.step?.etat === 2) break;

            const map = this._stepToStringMap(ref.step);
            if (map && map.has(stringNumber)) {
                return {
                    globalStep: g,
                    fret: map.get(stringNumber)
                };
            }
        }

        return null;
    }

    _findPreviousPlayableStepOnString(globalStep, stringNumber) {
        if (!Number.isInteger(globalStep) || !Number.isFinite(stringNumber)) return null;

        const tr = this._trRec;
        const measures = Array.isArray(tr?.measures) ? tr.measures : [];
        const padCount = this._getPadCount();

        for (let g = globalStep - 1; g >= 0; g--) {
            const ref = this._resolveGlobalStep(g);
            if (!ref || !ref.exists) break;

            if (ref.step?.etat === 2) break;

            const map = this._stepToStringMap(ref.step);
            if (map && map.has(stringNumber)) {
                return {
                    globalStep: g,
                    fret: map.get(stringNumber)
                };
            }
        }

        return null;
    }

    _tryHandleNoteFxClick(mx, my, layout, stepRef, col) {
        if (!layout || !stepRef) return false;

        const stringMap = this._stepToStringMap(stepRef.step);
        if (!stringMap || stringMap.size === 0) return false;

        const stepX = layout.gridX + col * layout.stepW;

        for (let stringNumber = layout.stringCount; stringNumber >= 1; stringNumber--) {
            if (!stringMap.has(stringNumber)) continue;

            const fret = stringMap.get(stringNumber);
            const bubble = this._getBubbleRectForNote(layout, stepX, stringNumber, fret);
            if (!bubble) continue;

            const insideBubble = (
                mx >= bubble.bubbleX &&
                mx <= bubble.bubbleX + bubble.bubbleW &&
                my >= bubble.bubbleY &&
                my <= bubble.bubbleY + bubble.bubbleH
            );

            if (!insideBubble) continue;

            const isRightSide = mx >= bubble.bubbleX + bubble.bubbleW * 0.58;
            const isLeftSide = mx <= bubble.bubbleX + bubble.bubbleW * 0.42;

            if (isLeftSide) {
                this._toggleStepPullFx(stepRef.step, stringNumber);
            } else if (isRightSide) {
                this._cycleStepNoteFx(stepRef.step, stringNumber);
            } else {
                return false;
            }

            this._manualCursorGlobalStep = stepRef.globalStep;
            this.invalidate();
            this._trRec?.invalidate?.();
            return true;
        }

        return false;
    }

    _selectSubMeasure(stepRef) {
        const tr = this._trRec;
        if (!tr || !stepRef) return;

        this._manualCursorGlobalStep = stepRef.globalStep;

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

        if (evt.button === LEFT && this._isTopMarkerBandHit(mx, my, layout)) {
            const col = Math.floor((mx - layout.gridX) / layout.stepW);
            if (!Number.isFinite(col) || col < 0 || col >= layout.totalSteps) return true;

            const stepRef = this._resolveStepAt(col);
            if (!stepRef || !stepRef.exists) return true;

            const trMeasures = Array.isArray(tr.measures) ? tr.measures : [];
            const measure = trMeasures[stepRef.measureIndex];
            if (!Array.isArray(measure)) return true;

            if (!measure[stepRef.stepIndex]) {
                measure[stepRef.stepIndex] = (typeof tr.createEmptyStep === "function")
                    ? tr.createEmptyStep()
                    : { etat: 0, highlight: false, flash: 0, item: null, itemIndex: null, tabFrets: null, topMarker: null, noteFx: null };
            }

            this._cycleTopMarker(measure[stepRef.stepIndex]);

            if (tr.measureIndex === stepRef.measureIndex) {
                tr.states = measure;
            }

            tr.invalidate?.();
            this.invalidate();
            return true;
        }

        if (mx < layout.gridX || mx > layout.gridX + layout.gridW) return true;
        if (my < layout.gridY - layout.rowH * 0.5 || my > layout.gridY + layout.gridH + layout.rowH * 0.5) return true;

        const col = Math.floor((mx - layout.gridX) / layout.stepW);
        if (!Number.isFinite(col) || col < 0 || col >= layout.totalSteps) return true;

        const stepRef = this._resolveStepAt(col);
        if (!stepRef) return true;

        if (evt.button === LEFT && this._tryHandleNoteFxClick(mx, my, layout, stepRef, col)) {
            return true;
        }

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

        const sourceCursorGlobalStep = Number.isInteger(highlightedGlobalStep)
            ? highlightedGlobalStep
            : (Number.isInteger(this._manualCursorGlobalStep) ? this._manualCursorGlobalStep : null);

        if (Number.isInteger(highlightedGlobalStep) && highlightedGlobalStep !== this._lastHighlightedGlobalStep) {
            this._stepPulseByGlobalStep.set(highlightedGlobalStep, 1);
            this._manualCursorGlobalStep = null;
        }
        this._lastHighlightedGlobalStep = highlightedGlobalStep;
        const activeCursorGlobalStep = this._findActiveCursorGlobalStep(sourceCursorGlobalStep);

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
        const drawnLegatoArcs = new Set();

        for (let step = 0; step < totalSteps; step++) {
            const x = gridX + step * stepW;
            const stepRef = this._resolveStepAt(step);
            if (!stepRef) continue;

            const s = stepRef.step;
            const isMuted = s?.etat === 2;
            const isHighlighted = !!s?.highlight;
            const isActiveCursorStep = stepRef.globalStep === activeCursorGlobalStep;
            const stepFlash = constrain(Number(s?.flash) || 0, 0, 1.5);
            const flashPulse = constrain(stepFlash / 1.5, 0, 1);
            const replayPulse = constrain(this._stepPulseByGlobalStep.get(stepRef.globalStep) || 0, 0, 1);
            const pulse = max(flashPulse, replayPulse);
            const stepTopMarker = this._normalizeTopMarker(s?.topMarker);
            const stepFxMentions = this._getStepFxMentions(s);

            if (isMuted) {
                noStroke();
                fill(170, 170, 170, 90);
                rect(x + stepW * 0.07, gridY - this.h * 0.008, stepW * 0.86, gridH + this.h * 0.016, this.h * 0.01);
            }

            if (isActiveCursorStep) {
                noStroke();
                fill(255, 205, 40, 120);
                rect(x + stepW * 0.04, gridY - this.h * 0.012, stepW * 0.92, gridH + this.h * 0.024, this.h * 0.012);
            }

            if (pulse > 0.01) {
                noStroke();
                fill(255, 230, 110, 120 * pulse);
                rect(x + stepW * 0.02, gridY - this.h * 0.016, stepW * 0.96, gridH + this.h * 0.032, this.h * 0.014);
            }

            const topMentions = [];
            if (stepTopMarker) topMentions.push(stepTopMarker);
            if (stepFxMentions.length > 0) topMentions.push(...stepFxMentions);

            if (topMentions.length > 0) {
                noStroke();
                fill(isActiveCursorStep ? 25 : 35);
                textAlign(CENTER, CENTER);
                textSize(this.h * 0.08);
                text(topMentions.join(" "), x + stepW * 0.5, gridY - rowH * 0.38);
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
                const noteFx = this._getStepNoteFx(s, stringNumber);

                if (noteFx === "hammer") {
                    const nextOnString = this._findNextPlayableStepOnString(stepRef.globalStep, stringNumber);
                    if (nextOnString) {
                        const nextWindowCol = nextOnString.globalStep - this._getWindowStartGlobalStep();
                        if (nextWindowCol >= 0 && nextWindowCol < totalSteps) {
                            const nextX = gridX + nextWindowCol * stepW;
                            const nextBubble = this._getBubbleRectForNote(layout, nextX, stringNumber, nextOnString.fret);

                            if (nextBubble) {
                                const arcKey = `${stepRef.globalStep}:${nextOnString.globalStep}:${stringNumber}:${noteFx}`;
                                if (!drawnLegatoArcs.has(arcKey)) {
                                    const arcAnchorY = min(bubbleY, nextBubble.bubbleY) - this.h * 0.012;
                                    this._drawHeldArc(
                                        bubbleX + bubbleW * 0.5,
                                        nextBubble.bubbleX + nextBubble.bubbleW * 0.5,
                                        arcAnchorY
                                    );
                                    drawnLegatoArcs.add(arcKey);
                                }
                            }
                        }
                    }
                } else if (noteFx === "pull") {
                    const prevOnString = this._findPreviousPlayableStepOnString(stepRef.globalStep, stringNumber);
                    if (prevOnString) {
                        const prevWindowCol = prevOnString.globalStep - this._getWindowStartGlobalStep();
                        if (prevWindowCol >= 0 && prevWindowCol < totalSteps) {
                            const prevX = gridX + prevWindowCol * stepW;
                            const prevBubble = this._getBubbleRectForNote(layout, prevX, stringNumber, prevOnString.fret);

                            if (prevBubble) {
                                const arcKey = `${prevOnString.globalStep}:${stepRef.globalStep}:${stringNumber}:pull`;
                                if (!drawnLegatoArcs.has(arcKey)) {
                                    const arcAnchorY = min(bubbleY, prevBubble.bubbleY) - this.h * 0.012;
                                    this._drawHeldArc(
                                        prevBubble.bubbleX + prevBubble.bubbleW * 0.5,
                                        bubbleX + bubbleW * 0.5,
                                        arcAnchorY
                                    );
                                    drawnLegatoArcs.add(arcKey);
                                }
                            }
                        }
                    }
                }

                noStroke();
                const baseColor = isActiveCursorStep ? color(20, 20, 20) : (isHighlighted ? color(255, 236, 130) : color(244, 244, 244));
                const pulseColor = color(255, 228, 95);
                const bubbleColor = isActiveCursorStep ? baseColor : lerpColor(baseColor, pulseColor, pulse);
                fill(bubbleColor);
                rect(bubbleX, bubbleY, bubbleW, bubbleH, bubbleH * 0.28);

                const fretCenterX = x + stepW * 0.5;
                const fretCenterY = y + rowH * 0.01;
                const fretBounds = this._getFretTextBounds(fretCenterX, fretCenterY, fretText, fretTextSize);

                if (noteFx === "slide") {
                    const nextOnString = this._findNextPlayableStepOnString(stepRef.globalStep, stringNumber);
                    if (nextOnString) {
                        const nextWindowCol = nextOnString.globalStep - this._getWindowStartGlobalStep();
                        if (nextWindowCol >= 0 && nextWindowCol < totalSteps) {
                            const nextX = gridX + nextWindowCol * stepW;
                            const nextBubble = this._getBubbleRectForNote(layout, nextX, stringNumber, nextOnString.fret);

                            if (nextBubble) {
                                const nextFretText = String(max(0, Math.round(nextOnString.fret)));
                                const nextFretCenterX = nextX + stepW * 0.5;
                                const nextFretCenterY = nextBubble.centerY;
                                const nextFretBounds = this._getFretTextBounds(nextFretCenterX, nextFretCenterY, nextFretText, fretTextSize);

                                const isUpMove = Number(nextOnString.fret) >= Number(fret);
                                stroke(35, 35, 35, 220);
                                strokeWeight(max(1.8, this.h * 0.0056));
                                noFill();

                                const slideStartX = fretBounds.right;
                                const slideStartY = isUpMove ? fretBounds.bottom : fretBounds.top;
                                const slideEndX = nextFretBounds.left;
                                const slideEndY = isUpMove ? nextFretBounds.top : nextFretBounds.bottom;

                                line(slideStartX, slideStartY, slideEndX, slideEndY);

                                const arcKey = `${stepRef.globalStep}:${nextOnString.globalStep}:${stringNumber}:slide`;
                                if (!drawnLegatoArcs.has(arcKey)) {
                                    const arcAnchorY = min(slideStartY, slideEndY) - this.h * 0.014;
                                    this._drawHeldArc(
                                        fretBounds.centerX,
                                        nextFretBounds.centerX,
                                        arcAnchorY
                                    );
                                    drawnLegatoArcs.add(arcKey);
                                }
                            }
                        }
                    } else {
                        stroke(35, 35, 35, 210);
                        strokeWeight(max(1.8, this.h * 0.0056));
                        noFill();

                        const slideStartX = fretBounds.right;
                        const slideStartY = fretBounds.centerY;
                        const slideEndX = min(gridX + gridW - stepW * 0.08, slideStartX + stepW * 0.75);
                        const slideEndY = fretBounds.centerY - rowH * 0.12;
                        line(slideStartX, slideStartY, slideEndX, slideEndY);
                    }
                } else if (noteFx === "slidePrev") {
                    const prevOnString = this._findPreviousPlayableStepOnString(stepRef.globalStep, stringNumber);
                    if (prevOnString) {
                        const prevWindowCol = prevOnString.globalStep - this._getWindowStartGlobalStep();
                        if (prevWindowCol >= 0 && prevWindowCol < totalSteps) {
                            const prevX = gridX + prevWindowCol * stepW;
                            const prevBubble = this._getBubbleRectForNote(layout, prevX, stringNumber, prevOnString.fret);

                            if (prevBubble) {
                                const prevFretText = String(max(0, Math.round(prevOnString.fret)));
                                const prevFretCenterX = prevX + stepW * 0.5;
                                const prevFretCenterY = prevBubble.centerY;
                                const prevFretBounds = this._getFretTextBounds(prevFretCenterX, prevFretCenterY, prevFretText, fretTextSize);

                                const isUpMove = Number(fret) >= Number(prevOnString.fret);
                                stroke(35, 35, 35, 220);
                                strokeWeight(max(1.8, this.h * 0.0056));
                                noFill();

                                const slideStartX = fretBounds.left;
                                const slideStartY = isUpMove ? fretBounds.bottom : fretBounds.top;
                                const slideEndX = prevFretBounds.right;
                                const slideEndY = isUpMove ? prevFretBounds.top : prevFretBounds.bottom;

                                line(slideStartX, slideStartY, slideEndX, slideEndY);

                                const arcKey = `${prevOnString.globalStep}:${stepRef.globalStep}:${stringNumber}:slidePrev`;
                                if (!drawnLegatoArcs.has(arcKey)) {
                                    const arcAnchorY = min(slideStartY, slideEndY) - this.h * 0.014;
                                    this._drawHeldArc(
                                        prevFretBounds.centerX,
                                        fretBounds.centerX,
                                        arcAnchorY
                                    );
                                    drawnLegatoArcs.add(arcKey);
                                }
                            }
                        }
                    } else {
                        stroke(35, 35, 35, 210);
                        strokeWeight(max(1.8, this.h * 0.0056));
                        noFill();

                        const slideStartX = fretBounds.left;
                        const slideStartY = fretBounds.centerY;
                        const slideEndX = max(gridX + stepW * 0.08, slideStartX - stepW * 0.75);
                        const slideEndY = fretBounds.centerY + rowH * 0.12;
                        line(slideStartX, slideStartY, slideEndX, slideEndY);
                    }
                }

                stroke(25, 25, 25, 150);
                strokeWeight(max(1, this.h * 0.0025));
                fill(isActiveCursorStep ? 255 : 20);
                textAlign(CENTER, CENTER);
                textSize(fretTextSize);
                text(fretText, x + stepW * 0.5, y + rowH * 0.01);

                if (noteFx === "bendQuarter" || noteFx === "bendHalf" || noteFx === "bendFull") {
                    const bendStartX = bubbleX + bubbleW * 0.83;
                    const bendStartY = y + bubbleH * 0.06;
                    const arcRadius = stepW * 0.42;
                    const arcSweep = HALF_PI;
                    const arcSegments = 12;

                    const bendEndX = bendStartX + arcRadius * sin(arcSweep);
                    const bendEndY = bendStartY - arcRadius * (1 - cos(arcSweep));

                    noFill();
                    stroke(30, 30, 30, 230);
                    strokeWeight(max(1, this.h * 0.003));
                    beginShape();
                    for (let i = 0; i <= arcSegments; i++) {
                        const t = arcSweep * (i / arcSegments);
                        const vx = bendStartX + arcRadius * sin(t);
                        const vy = bendStartY - arcRadius * (1 - cos(t));
                        vertex(vx, vy);
                    }
                    endShape();

                    const headW = stepW * 0.09;
                    const headH = rowH * 0.22;
                    line(bendEndX, bendEndY, bendEndX - headW, bendEndY + headH);
                    line(bendEndX, bendEndY, bendEndX + headW, bendEndY + headH);

                    noStroke();
                    fill(25);
                    textAlign(CENTER, CENTER);
                    textSize(this.h * 0.052);
                    text(noteFx === "bendQuarter" ? "1/4" : (noteFx === "bendHalf" ? "1/2" : "1"), bendEndX, bendEndY - rowH * 0.17);
                }
            }
        }

        if (hasActivePulse) {
            this.invalidate();
        }
    }
}
