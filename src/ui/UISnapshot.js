class SnapshotButton extends UIComponent {

    constructor(cfg = {}) {
        super();

        this.aspectRatio = 1.0;

        const xp = cfg.xp ?? 0;
        const yp = cfg.yp ?? 0;
        const sp = cfg.sp ?? 10;

        this.setResponsive(xp, yp, sp);
        this.updateResponsive();

        // shortcut
        this.shortcutKey  = cfg.shortcutKey  || " ";
        this.shortcutCode = cfg.shortcutCode || 32;
        this.description = cfg.description || null;

        // NOUVEAU : label optionnel
        this.label = cfg.label || null;
        this.led = cfg.led ?? false;
        this.stateCount = Math.max(2, cfg.stateCount ?? 2);
        this.stateLabels = Array.isArray(cfg.stateLabels) ? cfg.stateLabels : null;

        this._state = 0;
    }

    // -----------------------------
    // ÉTAT HARMONISÉ
    // -----------------------------
    get state() { return this._state; }
    set state(v) {
        this._state = v;
        this.onChange?.(this._state);
    }

    // -----------------------------
    // INTERACTION
    // -----------------------------
    onShortcut() {
        this.trigger();
    }

    onClick() {
        this.trigger();
        return true;
    }

trigger() {
    if (this.stateCount <= 2) {
        this.state = this.state ? 0 : 1;
        return;
    }

    this.state = (this.state + 1) % this.stateCount;
}


    containsRect(evt) {
        return (
            evt.x >= this.x &&
            evt.x <= this.x + this.w &&
            evt.y >= this.y &&
            evt.y <= this.y + this.h
        );
    }

    // -----------------------------
    // RENDER
    // -----------------------------
draw() {
    super.draw();

    const borderW = max(1, this.h * 0.06);

    // fond
    fill(60);
    stroke(200);
    strokeWeight(borderW);
    rect(this.x, this.y, this.w, this.h, this.h * 0.15);

    // -----------------------------------------
    // LABEL (toujours affiché)
    // -----------------------------------------
    const activeLabel = this.stateLabels?.[this._state] ?? this.label;

    if (activeLabel) {
        noStroke();
        fill(230);
        textAlign(CENTER, CENTER);
        textSize(this.h * 0.55);
        text(activeLabel, this.x + this.w * 0.5, this.y + this.h * 0.5);
    }

// -----------------------------------------
// LED OPTIONNELLE
// -----------------------------------------
if (this.led) {
    const ledR = this.w * 0.18;
    const ledX = this.x + this.w - ledR * 1.2;
    const ledY = this.y + ledR * 1.2;

    noStroke();
    fill(this._state !== 0 ? color(255, 20, 20) : color(80, 80, 80));
    circle(ledX, ledY, ledR);
}


    // -----------------------------------------
    // Si pas de label → icône appareil photo
    // (comportement d’origine)
    // -----------------------------------------
    if (!activeLabel) {
        const cx = this.x + this.w * 0.5;
        const cy = this.y + this.h * 0.5;
        const r  = this.w * 0.25;

        noStroke();
        fill(230);
        rect(cx - r, cy - r * 0.6, r * 2, r * 1.2, r * 0.2);

        fill(80);
        circle(cx, cy, r * 1.2);

        fill(200);
        circle(cx, cy, r * 0.6);
    }
}

}
