class TRRecPads extends UIComponent {

    constructor(cfg = {}) {
        super();

        this.padCount = cfg.padCount ?? 16;
        this.gridCols = cfg.gridCols ?? 4;
        this.gridRows = Math.max(1, Math.ceil(this.padCount / this.gridCols));

        this.aspectRatio = cfg.aspectRatio ?? 1;

        const xp = cfg.xp ?? 0;
        const yp = cfg.yp ?? 0;
        const sp = cfg.sp ?? 10;

        this.setResponsive(xp, yp, sp);
        this.updateResponsive();

        // Mesures TRREC
        this.measures = [this.createEmptyMeasure()];
        this.measureIndex = 0;
        this.states = this.measures[this.measureIndex];


        this.shortcutKey = cfg.shortcutKey || null;
        this.description = cfg.description || null;

        this.isDraggable = false;
        this.isZoomable = false;

        // playhead externe
        this.playIndex = 0;
        this.selectedGroupStart = 0;

        // drag & drop pads
        this.dragSourceIndex = null;
        this.dragHoverIndex = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragDidMove = false;
    }

    createEmptyStep() {
        return {
            etat: 0,
            highlight: false,
            flash: 0,
            item: null,
            itemIndex: null,
            tabFrets: null,
            topMarker: null,
            noteFx: null
        };
    }

    createEmptyMeasure() {
        return Array.from({ length: this.padCount }, () => this.createEmptyStep());
    }

    _normalizeEtat(value) {
        return value === 2 ? 2 : (value === 1 ? 1 : 0);
    }

    _normalizeTopMarker(value) {
        if (value === "PM" || value === "^") return value;
        return null;
    }

    _normalizeNoteFxValue(value) {
        if (value === "bendQuarter" || value === "bendHalf" || value === "bendFull" || value === "slide" || value === "slidePrev" || value === "hammer" || value === "pull") return value;
        return null;
    }

    _sanitizeNoteFxMap(noteFx) {
        if (!noteFx || typeof noteFx !== "object") return null;

        const out = {};
        for (const [k, v] of Object.entries(noteFx)) {
            const stringNumber = Number(k);
            if (!Number.isFinite(stringNumber) || stringNumber < 1 || stringNumber > 6) continue;

            const fx = this._normalizeNoteFxValue(v);
            if (!fx) continue;

            out[String(stringNumber)] = fx;
        }

        return Object.keys(out).length > 0 ? out : null;
    }

    _cloneStepData(step) {
        return {
            ...this.createEmptyStep(),
            etat: this._normalizeEtat(step?.etat),
            item: step?.item ?? null,
            itemIndex: step?.itemIndex ?? null,
            tabFrets: (step?.tabFrets && typeof step.tabFrets === "object")
                ? JSON.parse(JSON.stringify(step.tabFrets))
                : null,
            topMarker: this._normalizeTopMarker(step?.topMarker),
            noteFx: this._sanitizeNoteFxMap(step?.noteFx)
        };
    }

    _clearDragState() {
        this.dragSourceIndex = null;
        this.dragHoverIndex = null;
        this.dragDidMove = false;
    }

    _getLayoutMetrics() {
        const outerPadY = this.h * 0.015;
        const sectionGap = this.h * 0.008;
        const controlH = this.h * 0.16;

        const padAreaY = this.y + outerPadY;
        const padAreaH = this.h - controlH - sectionGap - outerPadY * 2;
        const controlY = padAreaY + padAreaH + sectionGap;

        const padAreaX = this.x + this.w * 0.02;
        const padAreaW = this.w * 0.96;

        const contentPadX = padAreaW * 0.04;
        const contentPadY = padAreaH * 0.05;

        const gridX = padAreaX + contentPadX;
        const gridY = padAreaY + contentPadY;
        const gridW = padAreaW - contentPadX * 2;
        const gridH = padAreaH - contentPadY * 2;

        const cellW = gridW / this.gridCols;
        const cellH = gridH / this.gridRows;

        return {
            outerPadY,
            sectionGap,
            controlH,
            padAreaY,
            padAreaH,
            controlY,
            padAreaX,
            padAreaW,
            gridX,
            gridY,
            cellW,
            cellH
        };
    }

    _getPadIndexFromPoint(mx, my, metrics = null) {
        const m = metrics || this._getLayoutMetrics();

        if (my < m.padAreaY || my > m.padAreaY + m.padAreaH) return null;
        if (mx < m.padAreaX || mx > m.padAreaX + m.padAreaW) return null;

        const col = Math.floor((mx - m.gridX) / m.cellW);
        const row = Math.floor((my - m.gridY) / m.cellH);
        const index = row * this.gridCols + col;

        if (!Number.isFinite(index)) return null;
        if (col < 0 || col >= this.gridCols) return null;
        if (row < 0 || row >= this.gridRows) return null;
        if (index < 0 || index >= this.states.length) return null;

        return index;
    }

    setMeasureIndex(index) {
        if (!Number.isFinite(index)) return;
        if (!this.measures || this.measures.length === 0) {
            this.measures = [this.createEmptyMeasure()];
        }

        const clamped = constrain(index, 0, this.measures.length - 1);
        this.measureIndex = clamped;
        this.states = this.measures[this.measureIndex];
        this.playIndex = 0;
        this.selectedGroupStart = 0;
        this.invalidate();
    }

    selectSubMeasure(groupIndex, options = {}) {
        const syncPlayhead = options.syncPlayhead !== false;
        const groupsPerMeasure = Math.max(1, Math.floor(this.padCount / 4));
        const safeGroup = constrain(groupIndex, 0, groupsPerMeasure - 1);
        const start = safeGroup * 4;

        this.selectedGroupStart = start;

        if (syncPlayhead) {
            this.playIndex = start;
        }

        if (Array.isArray(this.states)) {
            for (const step of this.states) {
                if (step) step.highlight = false;
            }
        }

        this.onChange?.({
            type: "submeasure-select",
            measureIndex: this.measureIndex,
            groupIndex: safeGroup,
            startIndex: start
        });

        this.invalidate();
    }

    addMeasureAfterCurrent() {
        const insertAt = this.measureIndex + 1;
        this.measures.splice(insertAt, 0, this.createEmptyMeasure());
        this.setMeasureIndex(insertAt);

        this.onChange?.({
            type: "measure-add",
            measureIndex: this.measureIndex,
            measureCount: this.measures.length
        });
    }

    cloneMeasureAfterCurrent() {
        const src = this.measures[this.measureIndex] || this.createEmptyMeasure();

        const cloned = Array.from({ length: this.padCount }, (_, i) => ({
            ...this.createEmptyStep(),
            etat: src[i]?.etat === 2 ? 2 : (src[i]?.etat === 1 ? 1 : 0),
            item: src[i]?.item ?? null,
            itemIndex: src[i]?.itemIndex ?? null,
            topMarker: this._normalizeTopMarker(src[i]?.topMarker),
            noteFx: this._sanitizeNoteFxMap(src[i]?.noteFx)
        }));

        const insertAt = this.measureIndex + 1;
        this.measures.splice(insertAt, 0, cloned);
        this.setMeasureIndex(insertAt);

        this.onChange?.({
            type: "measure-clone",
            measureIndex: this.measureIndex,
            measureCount: this.measures.length
        });
    }

    removeCurrentMeasure() {
        if (!this.measures || this.measures.length === 0) {
            this.measures = [this.createEmptyMeasure()];
        }

        if (this.measures.length === 1) {
            this.measures[0] = this.createEmptyMeasure();
            this.setMeasureIndex(0);
        } else {
            this.measures.splice(this.measureIndex, 1);
            const nextIndex = min(this.measureIndex, this.measures.length - 1);
            this.setMeasureIndex(nextIndex);
        }

        this.onChange?.({
            type: "measure-remove",
            measureIndex: this.measureIndex,
            measureCount: this.measures.length
        });
    }

    // appel├® par le moteur global (tick BPM)
advancePlayhead() {

    // 1) index courant
    const idx = this.playIndex;

    // s├®curit├®
    if (!this.states || this.states.length === 0) return;

    // clear highlight
    for (const s of this.states) {
        s.highlight = false;
    }

    const s = this.states[idx];
    if (s) {
        s.highlight = true;

        // flash accent si note
        if (s.etat === 1) {
            s.flash = 1.5;
        }
    }

    // flash groupe de 4
    if (idx % 4 === 0) {
        const group = Math.floor(idx / 4);
        const start = group * 4;
        for (let i = 0; i < 4; i++) {
            const pad = this.states[start + i];
            if (pad) pad.flash = 1;
        }
    }

    //  notifier les r├¿gles UI avec lÔÇÖindex COURANT

const pad = this.states[idx];


this.onChange?.({
    type: "padChange",
    padIndex: idx,
    stepState: pad ? pad.etat : 0,
    snapshotIndex: pad ? pad.itemIndex : null,
    tabFrets: pad?.tabFrets ?? null
});



    // 3) seulement maintenant on avance
    const wrapped = (idx + 1) >= this.padCount;
    this.playIndex = wrapped ? 0 : (idx + 1);

    this.invalidate();

    return {
        stepIndex: idx,
        wrapped,
        measureIndex: this.measureIndex
    };
}



    get measure() {
        return this.states.map(s => ({ etat: s.etat }));
    }

    set measure(arr) {
        if (!Array.isArray(arr)) return;

        this.states = Array.from({ length: this.padCount }, (_, i) => ({
            etat: arr[i]?.etat === 2 ? 2 : (arr[i]?.etat === 1 ? 1 : 0),
            highlight: false,
            flash: 0,
            item: arr[i]?.item ?? null,
            itemIndex: arr[i]?.itemIndex ?? null,
            tabFrets: (arr[i]?.tabFrets && typeof arr[i].tabFrets === "object")
                ? JSON.parse(JSON.stringify(arr[i].tabFrets))
                : null,
            topMarker: this._normalizeTopMarker(arr[i]?.topMarker),
            noteFx: this._sanitizeNoteFxMap(arr[i]?.noteFx)
        }));

        if (!this.measures || this.measures.length === 0) {
            this.measures = [this.states];
            this.measureIndex = 0;
        } else {
            this.measures[this.measureIndex] = this.states;
        }

        this.invalidate();
    }

    mousePressed(evt) {
        if (!evt) return false;
        if (!this.containsRect(evt)) return false;

        this.dragStartX = evt.x;
        this.dragStartY = evt.y;
        this.dragDidMove = false;
        this.dragHoverIndex = null;

        this.dragSourceIndex = this._getPadIndexFromPoint(evt.x, evt.y);
        return true;
    }

    mouseDragged(evt) {
        if (!evt) return false;
        if (this.dragSourceIndex == null) return false;

        const dx = evt.x - this.dragStartX;
        const dy = evt.y - this.dragStartY;
        if (Math.hypot(dx, dy) > 6) {
            this.dragDidMove = true;
        }

        this.dragHoverIndex = this._getPadIndexFromPoint(evt.x, evt.y);
        this.invalidate();
        return true;
    }

    mouseReleased(evt) {
        if (!evt) return false;

        if (this.dragDidMove && this.dragSourceIndex != null) {
            const fromIndex = this.dragSourceIndex;
            const toIndex = this.dragHoverIndex;
            const isCopy = !!evt.ctrlKey;

            if (
                toIndex != null &&
                toIndex !== fromIndex &&
                fromIndex >= 0 &&
                fromIndex < this.states.length
            ) {
                const sourceStep = this.states[fromIndex];

                if (sourceStep && this._normalizeEtat(sourceStep.etat) !== 0) {
                    this.states[toIndex] = this._cloneStepData(sourceStep);

                    if (!isCopy) {
                        this.states[fromIndex] = this.createEmptyStep();
                    }

                    this.onChange?.({
                        type: "pad-transfer",
                        fromIndex,
                        toIndex,
                        isCopy
                    });

                    this._clearDragState();
                    this.invalidate();
                    return true;
                }
            }

            this._clearDragState();
            this.invalidate();
            return true;
        }

        this._clearDragState();

        if (!this.containsRect(evt)) return false;

        const mx = evt.x;
        const my = evt.y;
        const metrics = this._getLayoutMetrics();

        const controlH = metrics.controlH;
        const controlY = metrics.controlY;

        // -------------------------------------------------
        // BARRE DE CONTROLES MESURES
        // -------------------------------------------------
        if (my >= controlY && my <= controlY + controlH) {
            const btnH = controlH * 0.72;
            const btnW = btnH * 0.875;
            const btnY = controlY + (controlH - btnH) * 0.5;
            const gap = btnW * 0.18;

            const plusX = this.x + this.w * 0.03;
            const cloneX = plusX + btnW + gap;
            const prevX = cloneX + btnW + gap;

            const minusX = this.x + this.w * 0.97 - btnW;
            const nextX = minusX - gap - btnW;

            const isInside = (x, y, w, h) => (
                mx >= x && mx <= x + w && my >= y && my <= y + h
            );

            if (isInside(plusX, btnY, btnW, btnH)) {
                this.addMeasureAfterCurrent();
                return true;
            }

            if (isInside(cloneX, btnY, btnW, btnH)) {
                this.cloneMeasureAfterCurrent();
                return true;
            }

            if (isInside(prevX, btnY, btnW, btnH)) {
                this.setMeasureIndex(this.measureIndex - 1);
                return true;
            }

            if (isInside(nextX, btnY, btnW, btnH)) {
                this.setMeasureIndex(this.measureIndex + 1);
                return true;
            }

            if (isInside(minusX, btnY, btnW, btnH)) {
                this.removeCurrentMeasure();
                return true;
            }

            return true;
        }

        const index = this._getPadIndexFromPoint(mx, my, metrics);
        if (index == null) return false;

        const old = this.states[index];
        if (!old) return false;

        // cycle interne : ON (1) -> DISABLED (2) -> OFF (0)
        if (old.etat === 1) {
            this.states[index] = {
                ...old,
                etat: 2,
                highlight: false,
                flash: 0
            };
            this.invalidate();

            this.onChange?.({
                type: "disable",
                index,
                etat: 2,
                item: old.item ?? null,
                itemIndex: old.itemIndex ?? null
            });

            return true;
        }

        if (old.etat === 2) {
            this.states[index] = this.createEmptyStep();
            this.invalidate();

            this.onChange?.({
                type: "remove",
                index,
                etat: 0
            });

            return true;
        }

        // ajout externe (0 ÔåÆ ?)
        this.onChange?.({
            type: "request-add",
            index,
            etat: 0
        });

        return true;
    }

    draw() {
        super.draw();

        fill(30);
        stroke(120);
        strokeWeight(this.w * 0.003);
        rect(this.x, this.y, this.w, this.h, this.h * 0.08);

        const outerPadY = this.h * 0.015;
        const sectionGap = this.h * 0.008;
        const controlH = this.h * 0.16;
        const padAreaY = this.y + outerPadY;
        const padAreaH = this.h - controlH - sectionGap - outerPadY * 2;
        const controlY = padAreaY + padAreaH + sectionGap;

        const padAreaX = this.x + this.w * 0.02;
        const padAreaW = this.w * 0.96;

        // Liseret externe dedie aux 16 pads
        noFill();
        stroke(105, 105, 105, 220);
        strokeWeight(max(1, this.h * 0.008));
        rect(padAreaX, padAreaY, padAreaW, padAreaH, this.h * 0.04);

        // -------------------------------------------------
        // BARRE DE CONTROLES MESURES
        // -------------------------------------------------
        const btnH = controlH * 0.72;
        const btnW = btnH * 0.875;
        const btnY = controlY + (controlH - btnH) * 0.5;
        const gap = btnW * 0.18;
        const radiusBtn = btnH * 0.2;

        const plusX = this.x + this.w * 0.03;
        const cloneX = plusX + btnW + gap;
        const prevX = cloneX + btnW + gap;

        const minusX = this.x + this.w * 0.97 - btnW;
        const nextX = minusX - gap - btnW;

        // Fond barre
        noStroke();
        fill(20, 20, 20, 170);
        rect(this.x + this.w * 0.02, controlY + this.h * 0.002, this.w * 0.96, controlH * 0.96, radiusBtn);

        const drawBtn = (x, symbol) => {
            stroke(150);
            strokeWeight(max(1, btnH * 0.08));
            fill(50);
            rect(x, btnY, btnW, btnH, radiusBtn);

            noStroke();
            fill(230);
            textAlign(CENTER, CENTER);
            textSize(btnH * 0.55);
            text(symbol, x + btnW * 0.5, btnY + btnH * 0.52);
        };

        drawBtn(plusX, "+");
        drawBtn(cloneX, "C");
        drawBtn(prevX, "<");
        drawBtn(nextX, ">");
        drawBtn(minusX, "-");

        noStroke();
        fill(200);
        textAlign(CENTER, CENTER);

        const seqLeft = prevX + btnW + gap;
        const seqRight = nextX - gap;
        const seqX = (seqLeft < seqRight)
            ? (seqLeft + seqRight) * 0.5
            : this.x + this.w * 0.5;

        const seqLabel = `Seq ${this.measureIndex + 1}/${this.measures.length}`;
        const seqAvail = max(1, seqRight - seqLeft);

        let seqSize = controlH * 0.36;
        textSize(seqSize);
        while (textWidth(seqLabel) > seqAvail * 0.92 && seqSize > 7) {
            seqSize *= 0.9;
            textSize(seqSize);
        }

        text(
            seqLabel,
            seqX,
            controlY + controlH * 0.52
        );

        const contentPadX = padAreaW * 0.02;
        const contentPadY = padAreaH * 0.03;

        const gridX = padAreaX + contentPadX;
        const gridY = padAreaY + contentPadY;
        const gridW = padAreaW - contentPadX * 2;
        const gridH = padAreaH - contentPadY * 2;

        const cellW = gridW / this.gridCols;
        const cellH = gridH / this.gridRows;

        const padW = cellW * 0.90;
        const padH = cellH * 0.90;
        const radius = padH * 0.12;
        const sw = max(1, min(padW, padH) * 0.12);
        const isDraggingPads = this.dragSourceIndex != null && this.dragDidMove;
        const isCopyDrag = isDraggingPads && keyIsDown(CONTROL);
        const selectedGroup = Math.floor((this.selectedGroupStart ?? 0) / 4);

        if (selectedGroup >= 0 && selectedGroup < this.gridRows) {
            const selectedY = gridY + selectedGroup * cellH;
            noFill();
            stroke(255, 220, 120, 210);
            strokeWeight(max(1, this.h * 0.01));
            rect(
                gridX + cellW * 0.04,
                selectedY + cellH * 0.08,
                gridW - cellW * 0.08,
                cellH * 0.84,
                this.h * 0.03
            );
        }

        for (let i = 0; i < this.padCount; i++) {

            const row = Math.floor(i / this.gridCols);
            const col = i % this.gridCols;

            const s = this.states[i] || { etat: 0, highlight: false };

            const cellX = gridX + col * cellW;
            const cellY = gridY + row * cellH;

            const x = cellX + (cellW - padW) * 0.5;
            const y = cellY + (cellH - padH) * 0.5;

            push();

            // --- PAD VIDE ---
            if (s.etat === 0) {

                if (s.highlight) {
                    noFill();
                    stroke(255, 60, 60);
                    strokeWeight(sw);
                } else {
                    noFill();
                    stroke(90, 0, 0);
                    strokeWeight(sw);
                }

                rect(x, y, padW, padH, radius);
            }

            // --- PAD REMPLI ---
            else if (s.etat === 1) {

                if (s.highlight) {
                    fill(255, 60, 60);
                    stroke(255);
                    strokeWeight(sw);
                    rect(x, y, padW, padH, radius);

                    if (s.item) {
                        push();
                        const label = String(s.item.label ?? s.item).trim();
                        const txtSize = padH * 0.28;

                        textSize(txtSize);
                        textAlign(CENTER, CENTER);
                        noStroke();
                        fill(255);

                        const maxChars = Math.floor(padW / (txtSize * 0.55));
                        let display = label;
                        if (display.length > maxChars) {
                            display = display.substring(0, maxChars - 1) + "...";
                        }

                        text(display, x + padW / 2, y + padH / 2);
                        pop();
                    }
                }

                else {
                    noFill();
                    stroke(255, 60, 60);
                    strokeWeight(sw);
                    rect(x, y, padW, padH, radius);

                    if (s.item) {
                        push();
                        const label = String(s.item.label ?? s.item).trim();
                        const txtSize = padH * 0.28;

                        textSize(txtSize);
                        textAlign(CENTER, CENTER);
                        noStroke();
                        fill(255);

                        const maxChars = Math.floor(padW / (txtSize * 0.55));
                        let display = label;
                        if (display.length > maxChars) {
                            display = display.substring(0, maxChars - 1) + "...";
                        }

                        text(display, x + padW / 2, y + padH / 2);
                        pop();
                    }
                }
            }

            // --- PAD DISABLED ---
            else if (s.etat === 2) {
                noFill();
                if (s.highlight) {
                    stroke(210, 210, 210);
                } else {
                    stroke(130, 130, 130);
                }
                strokeWeight(sw);
                rect(x, y, padW, padH, radius);
            }
// --- FLASH TEMPO (blanc) ---
if (s.flash > 0.01) {
    const alpha = s.flash * 255;
    noStroke();
    fill(255, alpha);
    rect(x, y, padW, padH, radius);

    // fade-out interne
    s.flash *= 0.85;
    this.invalidate();
}

            // --- DRAG OVERLAY ---
            if (isDraggingPads && i === this.dragSourceIndex) {
                noFill();
                stroke(255, 230, 120, 220);
                strokeWeight(max(1, sw * 0.8));
                rect(x, y, padW, padH, radius);
            }

            if (isDraggingPads && i === this.dragHoverIndex) {
                noFill();
                stroke(isCopyDrag ? color(120, 255, 160) : color(255, 190, 90));
                strokeWeight(max(1, sw));
                rect(x - sw * 0.2, y - sw * 0.2, padW + sw * 0.4, padH + sw * 0.4, radius);

                if (isCopyDrag) {
                    noStroke();
                    fill(120, 255, 160, 230);
                    textAlign(CENTER, CENTER);
                    textSize(padH * 0.42);
                    text("+", x + padW * 0.5, y + padH * 0.5);
                }
            }

            pop();
        }
    }
}
