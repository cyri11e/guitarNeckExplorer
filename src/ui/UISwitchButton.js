class Switch extends UIComponent {
    constructor(cfg = {}) {
        super();

        // --- POSITION / TAILLE ---
        const xp = cfg.xp ?? 0;
        const yp = cfg.yp ?? 0;
        const sp = cfg.sp ?? 10;

        this.aspectRatio = cfg.aspectRatio ?? 1.0;
        this.setResponsive(xp, yp, sp);
        this.updateResponsive();

        // --- LABELS ---
        this.title       = cfg.title       || "";
        this.topLabel    = cfg.topLabel    || "";
        this.bottomLabel = cfg.bottomLabel || "";
        this.shortcutKey = cfg.shortcutKey || null;
        this.description = cfg.description || null;
        
        // --- ÉTAT ---
        this._state = 0; // 0 = neutre, 1 = top, 2 = bottom
        this.isPassive = (!this.topLabel && !this.bottomLabel);

        // --- WHEEL ---
        this._wheelAccum = 0;
        this.wheelStepThreshold = cfg.wheelStepThreshold ?? 180;
        // séquence ordonnée du bas vers le haut (qualité musicale croissante)
        // ex. [2, 1] = bottom < top ; [2, 1, 3] = d < P < A ; [4, 2, 1] = dd < m < M
        this._wheelSequence = cfg.wheelSequence ?? null;
        // mapping états étendus → labels (personnalisable par instance)
        this._specialMap = cfg.specialMap ?? { 3: "a", 4: "dd" };

        // --- INTERACTION ---
        this.isDraggable = true;
        this.isZoomable  = true;
    }

    // -----------------------------
    // ÉTAT
    // -----------------------------
    get state() { return this._state; }

    set state(v) {
        if (this._state === v) return;
        this._state = v;

        this.invalidate();

        //  EXACTEMENT comme MetalSwitch
        this.onChange?.(v);
    }

    setState(v) { this.state = v; }

    // -----------------------------
    // INTERACTION
    // -----------------------------
    onShortcut() {
        if (!this.isPassive) {
            this.state = (this._state + 1) % 3;
        }
    }

    onClick() {
        if (!this.isPassive) {
            this.state = (this._state + 1) % 3;
        }
        return true;
    }

    mouseWheel(evt) {
        if (evt.altKey) return super.mouseWheel(evt);
        if (this.isPassive) return false;
        if (!this.containsRect(evt)) return false;

        this._wheelAccum -= evt.delta;
        if (Math.abs(this._wheelAccum) < this.wheelStepThreshold) return true;

        // delta positif = scroll bas → descend musicalement (qualité basse = bas de la séquence)
        // séquence ordonnée [haut..bas] : seq[0]=top(M/P), seq[last]=bottom(m/d)
        // scroll bas (delta>0) → idx+1 → vers la fin de la séquence = qualité basse
        const step = this._wheelAccum > 0 ? 1 : -1;
        this._wheelAccum = 0;

        // séquence ordonnée du haut vers le bas : [1(M/P), 2(m/d), ...]
        const seq = this._wheelSequence ?? [1, 2];
        const idx = seq.indexOf(this._state);

        if (idx === -1) {
            // état 0 (off) ou inconnu → bord proche selon direction
            this.state = step > 0 ? seq[seq.length - 1] : seq[0];
        } else {
            this.state = seq[Math.max(0, Math.min(seq.length - 1, idx + step))];
        }
        return true;
    }

containsRect(evt) {

    const totalH = this.h;
    const labelH = totalH * 0.30;
    const capH   = totalH * 0.70;

    // --- ZONE INTERNE (même que draw) ---
    const capMargin = this.w * 0.10;
    const innerX    = this.x + capMargin;
    const innerY    = this.y + labelH + capMargin;
    const innerW    = this.w - capMargin * 2;
    const innerH    = capH - capMargin * 2;

    // --- CALCUL EXACT DU BOUTON ROUGE ---
    const txtTopW    = textWidth(this.topLabel);
    const txtBottomW = textWidth(this.bottomLabel);
    const txtW       = max(txtTopW, txtBottomW);

    const padX    = innerW * 0.10;
    const minCapW = innerW * 0.40;

    let capW = max(minCapW, txtW + padX * 2);
    capW     = min(capW, innerW);

    const capX = innerX + (innerW - capW) / 2;
    const capY = innerY;

    // --- HITZONE = EXACTEMENT LE BOUTON ROUGE ---
    return (
        evt.x >= capX &&
        evt.x <= capX + capW &&
        evt.y >= capY &&
        evt.y <= capY + innerH
    );
}


    // -----------------------------
    // RENDER COMPLET
    // -----------------------------
    draw() {

        this.drawDebugRect();
        if (this.hover) {
            stroke(0, 255, 0);
            strokeWeight(2);
            noFill();
            rect(this.x, this.y, this.w, this.h);
        }

        const totalH = this.h;
        const labelH = totalH * 0.3;
        const capH   = totalH * 0.7;

        // --- PASSIF ---
        if (this.isPassive) {
            fill(30);
            noStroke();
            rect(this.x, this.y, this.w, totalH, this.w * 0.1);

            textAlign(CENTER, CENTER);
            textSize(capH * 0.5);
            fill(this.state === 0 ? 120 : 255);
            text(this.title, this.x + this.w / 2, this.y + labelH * 0.6);
            return;
        }

        // --- FOND ---
        fill(30);
        noStroke();
        rect(this.x, this.y, this.w, totalH, this.w * 0.1);

        // --- TITRE ---
        textAlign(CENTER, CENTER);
        textSize(capH * 0.4);
        fill(this.state === 0 ? 120 : 255);
        text(this.title, this.x + this.w / 2, this.y + labelH * 0.6);

        // --- ALTÉRATION / LABELS ---
        const specialMap = this._specialMap;
        const special = specialMap[this.state] || null;
        const effectiveBottom = special ? special : this.bottomLabel;

        let activeParam =
            (this.state === 1) ? this.topLabel :
            (this.state >= 2)  ? effectiveBottom :
            null;

        let prefix = "";
        if (activeParam === "m" || activeParam === "d") prefix = "♭";
        if (activeParam === "dd") prefix = "𝄫";
        if (activeParam === "a") prefix = "♯";

        textSize(capH * 0.4);
        fill(this.state === 0 ? 120 : 255);
        text(prefix, this.x + this.w / 6, this.y + labelH * 0.5);

        // --- BOÎTIER ---
        stroke(60);
        strokeWeight(2);
        fill(30);
        rect(this.x, this.y + labelH, this.w, capH, this.w * 0.1);

        // --- ZONE INTERNE ---
        const capMargin = this.w * 0.10;
        const innerX    = this.x + capMargin;
        const innerY    = this.y + labelH + capMargin;
        const innerW    = this.w - capMargin * 2;
        const innerH    = capH - capMargin * 2;

        noStroke();
        fill(0);
        rect(innerX, innerY, innerW, innerH, innerW * 0.1);

        // --- BOUTON ROUGE ---
        textAlign(CENTER, CENTER);
        textSize(capH * 0.40);

        const txtTopW    = textWidth(this.topLabel);
        const txtBottomW = textWidth(this.bottomLabel);
        const txtW       = max(txtTopW, txtBottomW);

        const padX    = innerW * 0.10;
        const minCapW = innerW * 0.40;

        let capW = max(minCapW, txtW + padX * 2);
        capW     = min(capW, innerW);

        const capX = innerX + (innerW - capW) / 2;
        const capY = innerY;

        const capColor = (this.state === 0)
            ? color(100, 0, 0)
            : color(220, 0, 0);

        fill(capColor);
        rect(capX, capY, capW, innerH, capW * 0.1);     

        if (this.isHovered){
            push();
            stroke("#ee3713");
            noFill();
            rect(capX, capY, capW, innerH);
            pop();
        }

        // --- LABELS ---
        const topY    = this.y + labelH + capH * 0.3;
        const bottomY = this.y + labelH + capH * 0.7;

        if (this.state === 1) {
            textStyle(BOLD);
            fill(250);
            text(this.topLabel, this.x + this.w / 2, topY);

            fill(120);
            textStyle(NORMAL);
            text(effectiveBottom, this.x + this.w / 2, bottomY);

        } else if (this.state >= 2) {
            fill(120);
            text(this.topLabel, this.x + this.w / 2, topY);

            fill(250);
            textStyle(BOLD);
            text(effectiveBottom, this.x + this.w / 2, bottomY);
            textStyle(NORMAL);

        } else {
            fill(120);
            text(this.topLabel, this.x + this.w / 2, topY);
            text(effectiveBottom, this.x + this.w / 2, bottomY);
        }
        super.draw();
    }
}


