class BPMControl extends UIComponent {

    constructor(cfg = {}) {
        super();

        this.aspectRatio = cfg.aspectRatio ?? 3.0;

        const xp = cfg.xp ?? 0;
        const yp = cfg.yp ?? 0;
        const sp = cfg.sp ?? 10;

        this.setResponsive(xp, yp, sp);
        this.updateResponsive();

        this.value = cfg.value ?? 80;
        this.min = cfg.min ?? 20;
        this.max = cfg.max ?? 300;

        this.onChange = cfg.onChange || null;
        this.stayOnX = cfg.stayOnX ?? false;
        // LED tempo
this.steps = cfg.steps ?? 4;      // nombre de rectangles
this.currentStep = 0;             // step actif
this.lastStepTime = millis();     // horloge
this.pulsePhase = 0;     // 0 → 1 → 0
this.pulseSpeed = 0.15;  // vitesse du pulse


    }

mouseReleased(evt) {
    if (!evt) return; // sécurité
    if (!this.containsRect(evt)) return false;
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
const interval = (60000 / this.value) / this.steps;

    const now = millis();

    let changed = false;

    // avance du chenillard
    if (now - this.lastStepTime >= interval) {
        this.lastStepTime = now;
        this.currentStep = (this.currentStep + 1) % this.steps;
        changed = true;
    }

    // fade LED (si tu veux garder ton effet BPM)
    const oldPhase = this.ledPhase;
    this.ledPhase *= 0.9;
    if (Math.abs(this.ledPhase - oldPhase) > 0.001) changed = true;

    if (changed) this.invalidate();
}





    // -----------------------------------------
    // RENDER
    // -----------------------------------------
    draw() {
        super.draw();

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

        
const barH = this.h * 0.15;
const barY = this.y + this.h * 0.75;
const barW = this.w / this.steps;

for (let i = 0; i < this.steps; i++) {
    const x = this.x + i * barW;
    push();
    if (this.currentStep === 0) {
        // ⭐ TEMPS FORT : tous pleins rouge vif
        noStroke();
        fill(255, 60, 60);
        rect(x, barY, barW * 0.9, barH, barH * 0.2);
    }
    else {
        if (i === this.currentStep) {
            // ⭐ TEMPS FAIBLE ACTIF : plein rouge vif
            noFill();
            stroke(255, 30, 30);
            rect(x, barY, barW * 0.9, barH, barH * 0.2);
        } else {
            // ⭐ TEMPS FAIBLE INACTIF : rectangle évidé rouge foncé
            noFill();
            stroke(120, 30, 30);
            strokeWeight(2 * this.zoomFactor);
            rect(x, barY, barW * 0.9, barH, barH * 0.2);
        }
    }
    pop();
}




    }
}
