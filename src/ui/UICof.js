class COF extends UIComponent {

    constructor(cfg = {}) {
        super();

        this.name = cfg.name ?? "cof1";

        this.aspectRatio = 1;
        this.setResponsive(cfg.xp ?? 0, cfg.yp ?? 0, cfg.sp ?? 20);

        // cycle des quintes → indices chromatiques
        this.chroma = [0,7,2,9,4,11,6,1,8,3,10,5];

        this.hoverIndex = -1;
        this.rootIndex  = null;

        // langue par défaut
        this.displayMode = "note";      // toujours note pour l’instant
        this.labelType   = "noteEN";    // langue


        this.renderer = new COFRenderer(this);
        this.theory = cfg.theory ?? null;

    }

setDisplayMode(mode) {
    const allowed = ["note", "degree", "none"];
    if (!allowed.includes(mode)) return;
    this.displayMode = mode;
    this.invalidate();
}


    setLabelType(type) {
        const allowed = ["noteEN", "noteFR"];
        if (!allowed.includes(type)) return;
        this.labelType = type;
        this.invalidate();
    }

mouseMoved(evt) {
    const idx = this._hitTest(evt.x, evt.y);

    const oldHover = this.hoverIndex;
    this.hoverIndex = idx;

    // ne spamme pas si rien ne change
    if (idx !== oldHover) {
        this.onChange?.(idx);
    }

    this.invalidate();
    return (idx >= 0);
}


    mousePressed(evt) {
        const idx = this._hitTest(evt.x, evt.y);
        return (idx >= 0);
    }

    mouseClicked(evt) {
        const idx = this._hitTest(evt.x, evt.y);
        if (idx < 0) return false;

        if (this.rootIndex === idx) {
            this.rootIndex = null;
            this.onChange?.(null);
        } else {
            this.rootIndex = idx;
            this.onChange?.(idx);
        }

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

        if (dist > rOuter) return -1;
        if (dist < rInner) return -1;

        let angle = Math.atan2(dy, dx);

const segAngle = TWO_PI / 12;
const root = this.rootIndex ?? 0;
const offset = -PI / 12 - root * segAngle;


        angle -= offset;

        angle += HALF_PI;
        if (angle < 0) angle += TWO_PI;

        return Math.floor(angle / segAngle);
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
        const root = c.rootIndex ?? 0;
        const offset = -PI / 12 - root * segAngle;

        const epsilon  = 0.01;

        for (let i = 0; i < 12; i++) {

            const a0 = i * segAngle + offset - HALF_PI - epsilon;
            const a1 = (i+1) * segAngle + offset - HALF_PI + epsilon;

            // couleur segment
            if (i === c.rootIndex) fill(255, 20, 20);
            else if (i === c.hoverIndex) fill(200);
            else fill(150);

            beginShape();

            // arc extérieur
            for (let a = a0; a <= a1; a += 0.02) {
                vertex(cx + Math.cos(a) * rOuter, cy + Math.sin(a) * rOuter);
            }

            // arc intérieur
            for (let a = a1; a >= a0; a -= 0.02) {
                vertex(cx + Math.cos(a) * rInner, cy + Math.sin(a) * rInner);
            }

            endShape(CLOSE);

            // --- LABEL ---
            const noteIndex = c.chroma[i];
            const mode = (c.displayMode === "note")
                ? c.labelType
                : c.displayMode;

            const labelObj = c.theory.getNoteLabel(noteIndex, mode);

            const noteTxt = labelObj.base + (labelObj.alt ?? "");

            const mid = (a0 + a1) * 0.5;
            const lr  = (rInner + rOuter) * 0.55; // plus au bord
            const lx  = cx + Math.cos(mid) * lr;
            const ly  = cy + Math.sin(mid) * lr;

            fill(0);
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(c.w * 0.10);
            text(noteTxt, lx, ly);

            // --- DEGRÉ (si root définie) ---
            if (c.rootIndex !== null) {

                // On récupère le degré pour CE noteIndex
                const degObj = c.theory.getNoteLabel(noteIndex, "degree");
                const degreeTxt =(degObj.alt ?? "") + degObj.base ;

                const lr2 = (rInner + rOuter) * 0.38; // plus à l’intérieur
                const lx2 = cx + Math.cos(mid) * lr2;
                const ly2 = cy + Math.sin(mid) * lr2;

                fill(0);
                noStroke();
                textAlign(CENTER, CENTER);
                textSize(c.w * 0.08);
                text(degreeTxt, lx2, ly2);
            }


        }



        // --- ROOT CENTRALE ---
        if (c.rootIndex !== null) {
            const noteIndex = c.chroma[c.rootIndex];
            const mode = (c.displayMode === "note")
                ? c.labelType
                : c.displayMode;

            const labelObj = c.theory.getNoteLabel(noteIndex, mode);

            const txt = labelObj.base + (labelObj.alt ?? "");

            fill(255);
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(c.w * 0.25);
            text(txt, cx, cy);
        }
    }
}
