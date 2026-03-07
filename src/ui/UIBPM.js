class BPMControl extends UIComponent {

    constructor(cfg = {}) {
        super();

        this.aspectRatio = 3.0;

        const xp = cfg.xp ?? 0;
        const yp = cfg.yp ?? 0;
        const sp = cfg.sp ?? 10;

        this.setResponsive(xp, yp, sp);
        this.updateResponsive();

        this.value = cfg.value ?? 80;
        this.min = cfg.min ?? 20;
        this.max = cfg.max ?? 300;

        this.onChange = cfg.onChange || null;

        // LED tempo
        this.ledPhase = 0;
        this.lastTick = millis();
    }

mouseReleased(evt) {
    if (!evt) return; // sécurité

    const mx = evt.x;

    // zone bouton -
    if (mx < this.x + this.w * 0.25) {
        this.setValue(this.value - 1);
        return true;
    }

    // zone bouton +
    if (mx > this.x + this.w * 0.75) {
        this.setValue(this.value + 1);
        return true;
    }

    // zone centrale → édition manuelle
    const newVal = prompt("BPM:", this.value);
    if (newVal !== null) {
        this.setValue(parseInt(newVal));
    }

    return true;
}




    setValue(v) {
        v = constrain(v, this.min, this.max);
        this.value = v;
        this.onChange?.(v);
        this.invalidate();
    }

    // -----------------------------------------
    // TEMPO LED
    // -----------------------------------------
    update() {
        const interval = 60000 / this.value;
        const now = millis();

        if (now - this.lastTick >= interval) {
            this.lastTick = now;
            this.ledPhase = 1; // flash ON
        }

        // fade out LED
        this.ledPhase *= 0.85;
    }

    // -----------------------------------------
    // RENDER
    // -----------------------------------------
    draw() {
        super.draw();
        this.update();

        // fond
        fill(40);
        stroke(200);
        strokeWeight(2 * this.zoomFactor);
        rect(this.x, this.y, this.w, this.h, this.h * 0.15);

        // BPM text
        noStroke();
        fill(230);
        textAlign(CENTER, CENTER);
        textSize(this.h * 0.45);
        text(`${this.value} BPM`, this.x + this.w * 0.5, this.y + this.h * 0.5);

        // bouton -
        fill(180);
        textSize(this.h * 0.5);
        text("-", this.x + this.w * 0.15, this.y + this.h * 0.5);

        // bouton +
        text("+", this.x + this.w * 0.85, this.y + this.h * 0.5);

        // LED tempo
        const ledR = this.h * 0.18;
        const ledX = this.x + this.w * 0.5;
        const ledY = this.y + this.h * 0.85;

        fill(255, 60, 60, 255 * this.ledPhase);
        circle(ledX, ledY, ledR);
    }
}
