class COF extends UIComponent {

    constructor(cfg = {}) {
        super();

        this.name = cfg.name ?? "cof1";

        this.aspectRatio = 1;
        this.setResponsive(cfg.xp ?? 0, cfg.yp ?? 0, cfg.sp ?? 20);

        this.chroma = [0,7,2,9,4,11,6,1,8,3,10,5];

        this.hoverIndex = -1;
        this.rootIndex  = null;

        this.displayMode = "note";
        this.labelType   = "noteEN";

        this.theory = cfg.theory ?? null;
        this.renderer = new COFRenderer(this);

        // Animation
        this.animAngle = 0;
        this.targetAngle = 0;
        this.animSpeed = 0.15;

        this._animTimer = null; // 🔥 timer interne
    }

    _startAnimationLoop() {
        if (this._animTimer) return; // déjà en cours

        this._animTimer = setInterval(() => {
            // si l’animation est finie → stop
            if (Math.abs(this.animAngle - this.targetAngle) < 0.0001) {
                clearInterval(this._animTimer);
                this._animTimer = null;
                return;
            }

            // sinon → redraw
            this.invalidate();

        }, 16); // ~60 FPS
    }

mouseMoved(evt) {
    const idx = this._hitTest(evt.x, evt.y);

    // 🔥 Le centre (-2) ne doit PAS devenir un hover
    const hover = (idx === -2) ? -1 : idx;

    const oldHover = this.hoverIndex;
    this.hoverIndex = hover;

    if (hover !== oldHover) {
        this.onChange?.({
            type: "hover",
            index: hover
        });
    }

    this.invalidate();
    return (hover >= 0);
}




  mousePressed(evt) {
    this._lastEvt = evt; //  indispensable

    const idx = this._hitTest(evt.x, evt.y);

    // capture uniquement si on clique sur un segment ou le centre
    return (idx >= 0);
}



onClick() {
    const evt = this._lastEvt;
    if (!evt) return false;

    const idx = this._hitTest(evt.x, evt.y);

    // --- CLIC CENTRAL : highlight ONLY ---
    if (idx === -2) {
        if (this.rootIndex !== null) {
            this.onChange?.({
                type: "root",
                index: this.rootIndex
            });
        }
        return true;
    }

    // --- CLIC HORS ZONE ---
    if (idx < 0) return false;

    // --- CLIC SEGMENT : toggle root ---
    if (this.rootIndex === idx) {
        this.rootIndex = null;
        this.targetAngle = 0;

        this.onChange?.({
            type: "root",
            index: null
        });

    } else {
        this.rootIndex = idx;

        const seg = TWO_PI / 12;
        const newAngle = -idx * seg;

        let delta = newAngle - this.animAngle;
        delta = ((delta + Math.PI) % (2 * Math.PI)) - Math.PI;

        this.targetAngle = this.animAngle + delta;

        this.onChange?.({
            type: "root",
            index: idx
        });
    }

    this._startAnimationLoop();
    this.invalidate();
    return true;
}




_hitTest(px, py) {
    const cx = this.x + this.w/2;
    const cy = this.y + this.h/2;

    const dx = px - cx;
    const dy = py - cy;

    const dist = Math.sqrt(dx*dx + dy*dy);

    const rOuter = this.w/2;
    const rInner = this.w/2 * 0.45;

    const centerRadius = this.w * 0.20;

    // --- Zone centrale ---
    if (dist < centerRadius) {
        return -2; // clic spécial, mais PAS une note
    }

    if (dist > rOuter) return -1;
    if (dist < rInner) return -1;

    let angle = Math.atan2(dy, dx);

    const segAngle = TWO_PI / 12;
    const root = this.rootIndex ?? 0;
    const offset = -PI / 12 - root * segAngle;

    angle = angle + HALF_PI - offset;

    if (angle < 0) angle += TWO_PI;
    if (angle >= TWO_PI) angle -= TWO_PI;

    return Math.floor(angle / segAngle);
}

setLabelType(type) {
    this.labelType = type;
    this.invalidate();
}


    draw() {
        this.renderer.draw();
    }
}


class COFRenderer {

    constructor(cof) {
        this.c = cof;
    }

    draw() {
        const c = this.c;

        const cx = c.x + c.w/2;
        const cy = c.y + c.h/2;

        const rOuter = c.w/2;
        const rInner = c.w/2 * 0.45;

        const segAngle = TWO_PI / 12;

        // interpolation
        c.animAngle += (c.targetAngle - c.animAngle) * c.animSpeed;

        const offset = -PI / 12 + c.animAngle;

        const epsilon  = 0.01;

        for (let i = 0; i < 12; i++) {

            const a0 = i * segAngle + offset - HALF_PI - epsilon;
            const a1 = (i+1) * segAngle + offset - HALF_PI + epsilon;

            if (i === c.rootIndex) fill(255, 20, 20);
            else if (i === c.hoverIndex) fill(200);
            else fill(150);

            beginShape();
            for (let a = a0; a <= a1; a += 0.02) {
                vertex(cx + Math.cos(a) * rOuter, cy + Math.sin(a) * rOuter);
            }
            for (let a = a1; a >= a0; a -= 0.02) {
                vertex(cx + Math.cos(a) * rInner, cy + Math.sin(a) * rInner);
            }
            endShape(CLOSE);

            const noteIndex = c.chroma[i];
            if (noteIndex == null) continue;

            const mode = (c.displayMode === "note")
                ? c.labelType
                : c.displayMode;

            const labelObj = c.theory.getNoteLabel(noteIndex, mode);
            if (!labelObj || !labelObj.base) continue;

            const noteTxt = labelObj.base + (labelObj.alt ?? "");

            const mid = (a0 + a1) * 0.5;
            const lr  = (rInner + rOuter) * 0.55;
            const lx  = cx + Math.cos(mid) * lr;
            const ly  = cy + Math.sin(mid) * lr;

            fill(0);
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(c.w * 0.10);
            text(noteTxt, lx, ly);

            if (c.rootIndex !== null) {
                const degObj = c.theory.getNoteLabel(noteIndex, "degree");
                if (!degObj || !degObj.base) continue;

                const degreeTxt = (degObj.alt ?? "") + degObj.base;

                const lr2 = (rInner + rOuter) * 0.38;
                const lx2 = cx + Math.cos(mid) * lr2;
                const ly2 = cy + Math.sin(mid) * lr2;

                fill(0);
                noStroke();
                textAlign(CENTER, CENTER);
                textSize(c.w * 0.08);
                text(degreeTxt, lx2, ly2);
            }
        }

        if (c.rootIndex !== null) {
            const noteIndex = c.chroma[c.rootIndex];
            const mode = (c.displayMode === "note")
                ? c.labelType
                : c.displayMode;

            const labelObj = c.theory.getNoteLabel(noteIndex, mode);
            if (!labelObj || !labelObj.base) return;

            const txt = labelObj.base + (labelObj.alt ?? "");

            fill(255);
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(c.w * 0.25);
            text(txt, cx, cy);
        }
    }
}

