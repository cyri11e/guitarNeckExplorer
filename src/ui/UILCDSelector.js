class LCDSelector extends UIComponent {

    constructor(cfg = {}) {
        super();

        // --- POSITION / RESPONSIVE ---
        const xp = cfg.xp ?? 0;
        const yp = cfg.yp ?? 0;
        const sp = cfg.sp ?? 10;

        this.aspectRatio = cfg.aspectRatio ?? (cfg.ratio ?? 1.5);

        this.setResponsive(xp, yp, sp);
        this.updateResponsive();

        // --- DATA ---
        this.items = cfg.items || [];
        this._index = 0;

        this.isOn = cfg.isOn ?? false;
        this.placeholder = cfg.placeholder ?? "-----";

        this.scrollOffset = 0;
        this.sensitivity = cfg.sensitivity ?? 1.0;

        this.dragging = false;
        this.clickCandidate = false;
        this.dragStartY = 0;
        this.dragOffsetY = 0;

        this._wheelAccum = 0;
        this.wheelStepThreshold = cfg.wheelStepThreshold ?? 180;

        this.shortcutKey  = cfg.shortcutKey  || null;
        this.shortcutCode = cfg.shortcutCode || null;
        this.description  = cfg.description  || null;

        // --- MODE MEMORY ---
        this.memory = {};
        this.currentMode = null;

        this.debug = cfg.debug ?? false;
    }

    // ============================================================
    // ÉTAT HARMONISÉ (comme Knob / Switch)
    // ============================================================

    get state() { return this._index; }

    set state(v) {
        const wrapped = this.wrap(v);
        if (wrapped === this._index) return;

        this._index = wrapped;
        this.invalidate();
        this.onChange?.(wrapped);   // ⭐ indispensable pour RuleManager
    }

    setIndex(v) { this.state = v; }

    wrap(i) {
        const n = this.items.length;
        return ((i % n) + n) % n;
    }
// ============================================================
// API SIMPLE (compatibilité avec les règles UI)
// ============================================================

setItems(list) {
    this.items = list;
    this.invalidate();
}

setOnOff(state) {
    this.isOn = state;
    this.invalidate();
}

    // ============================================================
    // MODES (mémoire interne)
    // ============================================================

    setMode(modeId, list) {

        if (this.currentMode !== null) {
            this.memory[this.currentMode] = this._index;
        }

        this.items = list;

        if (modeId in this.memory) {
            this._index = this.memory[modeId];
        }

        this.currentMode = modeId;
        this.invalidate();
    }

    // ============================================================
    // SHORTCUT
    // ============================================================

    onShortcut() {
        this.isOn = true;
        this.state = this._index + 1;
    }

    // ============================================================
    // INTERACTION (adaptée au framework)
    // ============================================================

    containsRect(evt) {
        return (
            evt.x >= this.x &&
            evt.x <= this.x + this.w &&
            evt.y >= this.y &&
            evt.y <= this.y + this.h
        );
    }

    mousePressed(evt) {
        if (!this.isOn) return false;
        if (!this.containsRect(evt)) return false;

        this.dragging = false;
        this.clickCandidate = true;
        this.dragStartY = evt.y;
        this.dragOffsetY = evt.y;

        return true;
    }

    mouseDragged(evt) {
        if (!this.isOn) return false;
        if (!this.containsRect(evt)) return false;

        if (!this.clickCandidate && !this.dragging) return false;

        const dy = evt.y - this.dragOffsetY;
        this.dragOffsetY = evt.y;

        if (!this.dragging && Math.abs(evt.y - this.dragStartY) > 3) {
            this.dragging = true;
            this.clickCandidate = false;
        }

        if (this.dragging) {
            this.scrollOffset += dy * this.sensitivity;
            this.invalidate();
        }

        return true;
    }

    mouseReleased(evt) {
        if (!this.isOn) return false;

        const cy = this.y + this.h / 2;

        // --- SCROLL ---
        if (this.dragging) {
            const delta = this.scrollOffset / this.itemHeight;
            const step = Math.round(delta);

            this.state = this._index - step;
            this.scrollOffset = 0;
        }

        // --- CLICK ---
        else if (this.clickCandidate && this.containsRect(evt)) {

            if (evt.y < cy - this.itemHeight / 2) {
                this.state = this._index - 1;
            }
            else if (evt.y > cy + this.itemHeight / 2) {
                this.state = this._index + 1;
            }

            this.scrollOffset = 0;
        }

        this.dragging = false;
        this.clickCandidate = false;

        return true;
    }

    mouseWheel(evt) {
        if (evt.altKey) return super.mouseWheel(evt);
        if (!this.isOn) return false;
        if (!this.containsRect(evt)) return false;

        this._wheelAccum += evt.delta;
        if (Math.abs(this._wheelAccum) >= this.wheelStepThreshold) {
            const step = this._wheelAccum > 0 ? -1 : 1;
            this._wheelAccum = 0;
            this.state = this._index + step;
        }
        return true;
    }

    // ============================================================
    // RENDER
    // ============================================================

    draw() {

        this.drawDebugRect();

        const marginLeft = this.h * 0.20;
        const lcdX = this.x + marginLeft;
        const lcdW = this.w - marginLeft;

        const bgOn  = color(120, 255, 120, 180);
        const bgOff = color(60, 120, 60, 120);

        fill(this.isOn ? bgOn : bgOff);
        noStroke();
        rect(lcdX, this.y, lcdW, this.h, this.h * 0.2);

        stroke(this.isOn ? 0 : 50);
        strokeWeight(2);
        noFill();
        rect(lcdX, this.y, lcdW, this.h, this.h * 0.2);

        if (!this.isOn) {
            fill(0, 40);
            textAlign(CENTER, CENTER);
            textSize(this.h * 0.25);
            text(this.placeholder, lcdX + lcdW / 2, this.y + this.h / 2);
            return;
        }

        // --- LISTE ---
        this.itemHeight = this.h * 0.33;

        const cx = lcdX + lcdW / 2;
        const cy = this.y + this.h / 2;

        drawingContext.save();
        drawingContext.beginPath();
        drawingContext.rect(lcdX, this.y, lcdW, this.h);
        drawingContext.clip();

        for (let k = -4; k <= 4; k++) {
            const idx = this.wrap(this._index + k);
            const y = cy + k * this.itemHeight + this.scrollOffset;

            const distNorm = Math.abs(k + this.scrollOffset / this.itemHeight);

            const alpha = map(distNorm, 0, 2, 255, 0, true);
            const size  = map(distNorm, 0, 4, this.h * 0.24, this.h * 0.16, true);

            fill(0, alpha);
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(size);
            text(this.items[idx], cx, y);
        }

        drawingContext.restore();
        noFill();
        noStroke();

        // --- CADRE CENTRAL ---
        stroke(0);
        strokeWeight(2);
        noFill();
        rect(
            lcdX,
            cy - this.itemHeight / 2,
            lcdW,
            this.itemHeight,
            this.itemHeight * 0.2
        );

        // --- POINT LATERAL ---
        const dotSize = this.h * 0.1;
        const cxPoint = this.x + marginLeft * 0.5;

        fill(200);
        noStroke();
        ellipse(cxPoint, cy, dotSize, dotSize);

        super.draw();
    }
}
