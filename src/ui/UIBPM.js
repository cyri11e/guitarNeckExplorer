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
        this.anchorUnder = cfg.anchorUnder ?? null;
        this.relativePos = cfg.relativePos ?? false;

        // LED unique
        this.ledPhase = 0;      // 0 → éteint, 1 → plein rouge
        this.ledDecay = 0.85;   // vitesse d’extinction

        // horloge
        this.lastTickTime = millis();

        // tick index (double‑croches)
        this.tickIndex = 0;

        // état PLAY externe
        this.isPlaying = false;
    }

    // -----------------------------------------
    // INTERACTION
    // -----------------------------------------
    mouseReleased(evt) {
        if (!evt) return;
        if (!this.containsRect(evt)) return false;

        const mx = evt.x;

        // bouton -
        if (mx < this.x + this.w * 0.25) {
            this.setValue(this.value - 1);
            return true;
        }

        // bouton +
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

        // Evite un premier tick trop tardif ou trop rapproché après changement de BPM.
        if (this.isPlaying) {
            this.lastTickTime = millis();
        }

        this.onChange?.(v);
        this.invalidate();
    }

    // -----------------------------------------
    // UPDATE (tick = double‑croche)
    // -----------------------------------------
    update() {

        if (!this.isPlaying) {
            // extinction progressive de la LED
            if (this.ledPhase > 0.01) {
                this.ledPhase *= this.ledDecay;
                this.invalidate();
            }
            return;
        }

        // 1 double‑croche = 1/4 de temps
        const interval = (60000 / this.value) / 4;
        const now = millis();

        if (now - this.lastTickTime >= interval) {
            this.lastTickTime = now;

            // Step courant joue maintenant (0 -> 15). TRRec utilise ce meme step.
            const stepIndex = this.tickIndex;

            // LED sur le premier temps de chaque groupe de 4: 0, 4, 8, 12.
            if (stepIndex % 4 === 0) {
                this.ledPhase = 1;
            }

            // ⭐ ÉMISSION D’UN ÉVÉNEMENT UI STANDARD
            this.onChange?.({
                type: "tick",
                tick: stepIndex
            });

            // Prépare le prochain step.
            this.tickIndex = (stepIndex + 1) % 16;

            this.invalidate();
        }

        // extinction progressive
        if (this.ledPhase > 0.01) {
            this.ledPhase *= this.ledDecay;
            this.invalidate();
        }

        // Heartbeat visuel: garantit un redraw continu pendant la lecture,
        // meme entre deux ticks BPM (sinon l'animation semble saccadee).
        this.invalidate();
    }

    // -----------------------------------------
    // RENDER
    // -----------------------------------------
    draw() {
        super.draw();

        const borderW = max(1, this.h * 0.06);

        // fond
        fill(40);
        stroke(200);
        strokeWeight(borderW);
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

        // -----------------------------------------
        // LED UNIQUE (rouge)
        // -----------------------------------------
        const ledR = this.h * 0.18;
        const ledX = this.x + this.w * 0.5;
        const ledY = this.y + this.h * 0.85;

        const intensity = constrain(this.ledPhase, 0, 1);
        fill(255 * intensity, 40 * intensity, 40 * intensity);
        noStroke();
        circle(ledX, ledY, ledR);
    }
}
