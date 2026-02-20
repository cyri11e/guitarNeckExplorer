class Knob extends UIComponent {
    constructor(cfg = {}) {
        super();
        this.aspectRatio = cfg.aspectRatio ?? 0.90;

        // --- POSITION / RESPONSIVE ---
        const xp = cfg.xp ?? 0;
        const yp = cfg.yp ?? 0;
        const sp = cfg.sp ?? 10;

        this.setResponsive(xp, yp, sp);
        this.updateResponsive();

        // --- CONFIG ---
        this.items = cfg.items || [];
        this._index = 0;

        this.hideBottom = cfg.hideBottom ?? false;

        this.shortcutKey  = cfg.shortcutKey  || null;
        this.shortcutCode = cfg.shortcutCode || null;

        // --- ANGLES ---
        this.angles = this.computeAngles(this.items.length);

        // --- VISUEL ---
        this.colorBase   = 50;
        this.colorRing   = 120;
        this.colorNeedle = [255, 80, 80];
        this.hitboxScale = 1.1;

        this.hoverDrag = { isHovered: false, hitZone: { x:0, y:0, w:0, h:0 } };

        // --- INTERACTION ---
        this.isDraggable = true;
        this.isZoomable  = true;
    }

    // -----------------------------
    // ÉTAT HARMONISÉ (comme MetalSwitch)
    // -----------------------------
    get state() {
        return this._index;
    }

    set state(v) {
        this.setIndex(v);
    }

    setIndex(v) {
        const wrapped = this.wrap(v);
        if (wrapped === this._index) return;

        this._index = wrapped;

        this.invalidate();

        // ⭐ indispensable pour RuleManager
        this.onChange?.(this._index);
    }

    wrap(i) {
        const n = this.items.length;
        return ((i % n) + n) % n;
    }

    // -----------------------------
    // ANGLES
    // -----------------------------
    computeAngles(n) {
        if (n <= 0) return [];
        const a = [];
        const step = 360 / n;
        for (let i = 0; i < n; i++) {
            a.push((90 + i * step) % 360);
        }
        return a;
    }

    // -----------------------------
    // INTERACTION
    // -----------------------------
    onShortcut() {
        this.setIndex(this._index + 1);
    }

onClick() {
    this.setIndex(this._index + 1);
    return true;
}


    getCenter() {
        return {
            cx: this.x + this.w / 2,
            cy: this.y + this.h / 2
        };
    }

    // updateHover(evt) {
    //     let extraW = this.w * (this.hitboxScale - 1);
    //     let extraH = this.h * (this.hitboxScale - 1);

    //     let x = this.x - extraW / 2;
    //     let y = this.y - extraH / 2;
    //     let w = this.w + extraW;
    //     let h = this.h + extraH;

    //     this.hoverDrag.hitZone = { x, y, w, h };

    //     let inside = evt.x >= x && evt.x <= x + w && evt.y >= y && evt.y <= y + h;
    //     this.hover = inside;
    //     this.hoverDrag.isHovered = inside;
    // }

containsRect(evt) {
    // centre réel du knob (pas le centre du composant)
    const topP = 0.25;
    const circleP = 0.50;

    const topH = this.h * topP;
    const circleH = this.h * circleP;

    const cx = this.x + this.w / 2;
    const cy = this.y + topH + circleH / 2;

    // rayon réel du knob
    const r = min(this.w, circleH) / 2;

    return dist(evt.x, evt.y, cx, cy) <= r * this.hitboxScale;
}



    // -----------------------------
    // RENDER
    // -----------------------------
    draw() {
        this.drawDebugRect();
        this.drawDebugInfo();

        const topP = 0.25;
        const circleP = 0.50;
        const labelP = 0.25;

        const topH = this.h * topP;
        const circleH = this.h * circleP;
        const labelH = this.h * labelP;

        const cx = this.x + this.w / 2;
        const cy = this.y + topH + circleH / 2;
        const r = min(this.w, circleH) / 2;

        // --- HALO ---
        noStroke();
        fill(255, 40);
        ellipse(cx, cy, r * 2.6, r * 2.6);

        // --- FOND ---
        fill(this.colorBase);
        ellipse(cx, cy, r * 2, r * 2);

        // --- ANNEAU ---
        stroke(this.colorRing);
        strokeWeight(r * 0.07);
        noFill();
        ellipse(cx, cy, r * 2.2, r * 2.2);

        // --- GLOSSY ---
        noStroke();
        fill(255, 25);
        arc(cx, cy, r * 2, r * 2, radians(220), radians(320));

        // --- AIGUILLE ---
        push();
        translate(cx, cy);
        rotate(radians(this.angles[this._index]));
        stroke(...this.colorNeedle);
        strokeWeight(r * 0.12);
        line(0, 0, r * 0.8, 0);
        pop();

        // --- SYMBOLES ---
        this.drawSymbols(cx, cy, r * 1.1);

        // --- LABEL ---
        const item = this.items[this._index];
        const label = item.label || item.symbol;

        textAlign(CENTER, CENTER);
        textSize(r * 0.65);

        const ly = this.y + topH + circleH + labelH * 0.70;

        stroke(50);
        strokeWeight(r / 10);
        fill(240);
        text(label, cx, ly);

        noStroke();
        fill(240);
        text(label, cx, ly);

        // --- HOVER OUTLINE ---
        if (this.hover) {
            noFill();
            stroke(0, 255, 0);
            strokeWeight(2);
            ellipse(cx, cy, r * 2, r * 2);
        }
    }

    drawSymbols(cx, cy, r) {
        for (let i = 0; i < this.items.length; i++) {
            let a = this.angles[i];
            if (this.hideBottom && abs(a - 90) < 0.1) continue;

            let rad = radians(a);
            let sx = cx + cos(rad) * (r + r * 0.6);
            let sy = cy + sin(rad) * (r + r * 0.6);

            fill(240);
            stroke(20);
            textAlign(CENTER, CENTER);
            textSize(r * 0.6);
            strokeWeight(r / 12);
            text(this.items[i].symbol, sx, sy);
        }
    }
}
