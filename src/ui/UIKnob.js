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
        this.description = cfg.description || null;

        // --- ANGLES ---
        this.angles = this.computeAngles(this.items.length);
        this._needleAngle = this.angles[0] ?? 90;
        this._needleTargetAngle = this._needleAngle;
        this._knobDragging = false;

        // --- VISUEL ---
        this.colorBase   = 50;
        this.colorRing   = 120;
        this.colorNeedle = [255, 80, 80];
        this.hitboxScale = 1.1;

        this.hoverDrag = { isHovered: false, hitZone: { x:0, y:0, w:0, h:0 } };
        this._hoverItemIndex = null;
        this.wheelStepThreshold = cfg.wheelStepThreshold ?? 180;
        this._wheelAccum = 0;

        // --- INTERACTION ---
        this.isDraggable = false; // drag contrôle la valeur, pas la position
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

    setIndex(v, opts = {}) {
        const { syncNeedle = true } = opts;
        const wrapped = this.wrap(v);
        if (wrapped === this._index) return;

        this._index = wrapped;
        const a = this.angles[this._index] ?? this._needleAngle;

        if (syncNeedle) {
            this._needleTargetAngle = a;
            this._needleAngle = a;
        }

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
    // HELPERS GÉOMÉTRIE
    // -----------------------------
    _getGeometry() {
        const topP    = 0.25;
        const circleP = 0.50;
        const topH    = this.h * topP;
        const circleH = this.h * circleP;
        return {
            cx: this.x + this.w / 2,
            cy: this.y + topH + circleH / 2,
            r:  min(this.w, circleH) / 2
        };
    }

    // Retourne l'index de l'item dont l'angle est le plus proche du point (px, py)
    _nearestItemForAngle(px, py) {
        const { cx, cy } = this._getGeometry();
        const angleDeg = (degrees(atan2(py - cy, px - cx)) + 360) % 360;
        let best = 0, bestDiff = Infinity;
        for (let i = 0; i < this.angles.length; i++) {
            let diff = Math.abs(angleDeg - this.angles[i]);
            if (diff > 180) diff = 360 - diff;
            if (diff < bestDiff) { bestDiff = diff; best = i; }
        }
        return best;
    }

    _normalizeAngle(a) {
        return (a % 360 + 360) % 360;
    }

    _shortestDelta(fromA, toA) {
        let d = this._normalizeAngle(toA) - this._normalizeAngle(fromA);
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        return d;
    }

    _angleFromPoint(px, py) {
        const { cx, cy } = this._getGeometry();
        return this._normalizeAngle(degrees(atan2(py - cy, px - cx)));
    }

    _nearestIndexForAngleDeg(angleDeg) {
        let best = 0;
        let bestDiff = Infinity;
        for (let i = 0; i < this.angles.length; i++) {
            const d = Math.abs(this._shortestDelta(angleDeg, this.angles[i]));
            if (d < bestDiff) {
                bestDiff = d;
                best = i;
            }
        }
        return best;
    }

    _commitIndex(nextIndex) {
        const wrapped = this.wrap(nextIndex);
        if (wrapped === this._index) return;
        this._index = wrapped;
        this.onChange?.(this._index);
    }

    // -----------------------------
    // INTERACTION
    // -----------------------------
    onShortcut() {
        this.setIndex(this._index + 1);
    }

    mousePressed(evt) {
        this._lastEvt = evt;
        this._knobDragging = false;
        return super.mousePressed(evt);
    }

    onClick() {
        if (!this._lastEvt) { this.setIndex(this._index + 1); return true; }
        const { cx, cy, r } = this._getGeometry();
        const d = dist(this._lastEvt.x, this._lastEvt.y, cx, cy);
        if (d <= r * 1.1) {
            // clic au centre → cycle séquentiel
            this.setIndex(this._index + 1);
        } else {
            // clic direct sur un symbole/label → saut direct
            this.setIndex(this._nearestItemForAngle(this._lastEvt.x, this._lastEvt.y), { syncNeedle: true });
        }
        return true;
    }

    mouseDragged(evt) {
        if (evt.altKey) return super.mouseDragged(evt); // ALT = repositionner
        if (!this.isPressed) return false;

        if (!this.containsRect(evt)) {
            const i = this._nearestIndexForAngleDeg(this._needleAngle);
            const notch = this.angles[i] ?? this._needleAngle;
            this._needleAngle = notch;
            this._needleTargetAngle = notch;
            this._commitIndex(i);
            this._knobDragging = false;
            this.invalidate();
            return true;
        }

        this._knobDragging = true;
        const angleNow = this._angleFromPoint(evt.x, evt.y);
        this._needleAngle = angleNow;
        this._needleTargetAngle = angleNow;
        this._commitIndex(this._nearestIndexForAngleDeg(angleNow));
        this.invalidate();
        return true;
    }

    mouseWheel(evt) {
        if (evt.altKey) return super.mouseWheel(evt); // ALT = zoom
        if (!this.containsRect(evt)) return false;

        const delta = evt.delta ?? evt.deltaY ?? 0;
        this._wheelAccum += delta;

        const threshold = Math.max(40, this.wheelStepThreshold);
        if (Math.abs(this._wheelAccum) < threshold) return true;

        const steps = Math.trunc(this._wheelAccum / threshold);
        this._wheelAccum -= steps * threshold;
        this.setIndex(this._index + steps, { syncNeedle: true });
        return true;
    }

    mouseReleased(evt) {
        if (evt.altKey) return super.mouseReleased(evt);

        const wasDragging = this._knobDragging;
        this._knobDragging = false;

        if (wasDragging) {
            const i = this._nearestIndexForAngleDeg(this._needleAngle);
            const notch = this.angles[i] ?? this._needleAngle;
            this._needleAngle = notch;
            this._needleTargetAngle = notch;
            this._commitIndex(i);

            this.isPressed = false;
            this.dragging = false;
            this.invalidate();
            return true;
        }

        return super.mouseReleased(evt);
    }

    mouseMoved(evt) {
        super.mouseMoved?.(evt);
        const { cx, cy, r } = this._getGeometry();
        const d = dist(evt.x, evt.y, cx, cy);
        const newHover = (d > r * 1.1 && d <= r * 2.2)
            ? this._nearestItemForAngle(evt.x, evt.y)
            : null;
        if (newHover !== this._hoverItemIndex) {
            this._hoverItemIndex = newHover;
            this.invalidate();
        }
        return d <= r * 2.2;
    }


    getCenter() {
        return {
            cx: this.x + this.w / 2,
            cy: this.y + this.h / 2
        };
    }



containsRect(evt) {
    const { cx, cy, r } = this._getGeometry();
    // couvre le knob + les symboles périphériques
    return dist(evt.x, evt.y, cx, cy) <= r * 2.2;
}



    // -----------------------------
    // RENDER
    // -----------------------------
    draw() {

        push()
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
        this._needleAngle = this._needleTargetAngle;

        push();
        translate(cx, cy);
        rotate(radians(this._needleAngle));
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
        if (this.isHovered) {
            noFill();
            stroke(0, 255, 0);
            strokeWeight(2);
            ellipse(cx, cy, r * 2, r * 2);
        }
        pop()
        super.draw();
    }

    drawSymbols(cx, cy, r) {
        for (let i = 0; i < this.items.length; i++) {
            let a = this.angles[i];
            if (this.hideBottom && abs(a - 90) < 0.1) continue;

            let rad = radians(a);
            let sx = cx + cos(rad) * (r + r * 0.6);
            let sy = cy + sin(rad) * (r + r * 0.6);

            const isActive = (i === this._index);
            const isHover  = (i === this._hoverItemIndex);

            textAlign(CENTER, CENTER);
            textSize(isActive ? r * 0.72 : r * 0.6);
            strokeWeight(r / 12);

            if (isActive) {
                stroke(20);
                fill(255, 220, 80);     // doré — item sélectionné
            } else if (isHover) {
                stroke(20);
                fill(160, 210, 255);    // bleu clair — survol
            } else {
                stroke(20);
                fill(240);
            }

            text(this.items[i].symbol, sx, sy);
        }
    }
}
