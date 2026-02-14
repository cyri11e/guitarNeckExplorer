class MetalSwitch extends UIComponent {
    constructor(cfg = {}) {
        super();

        // --- CONFIG POSITION / TAILLE (depuis UI_CONFIG) ---
        const xp = cfg.xp ?? 0;
        const yp = cfg.yp ?? 0;
        const sp = cfg.sp ?? 10;

        this.aspectRatio = 0.55; // vertical

        this.setResponsive(xp, yp, sp);
        this.updateResponsive();

        // --- LABELS / TITRE ---
        this.title       = cfg.title       || "";
        this.topLabel    = cfg.topLabel    || "";
        this.bottomLabel = cfg.bottomLabel || "";
        this.shortcutKey = cfg.toggleShortcut || cfg.shortcutKey || null;

        // --- ÉTAT ---
        this._state = 0; // 0 = bas, 1 = haut
        this.isPassive = false;

        // --- TEST ERGO ---
        this.isDraggable = true;
        this.isZoomable  = true;
    }

    // -----------------------------
    // ÉTAT
    // -----------------------------
    get state() { return this._state; }

set state(v) {
    v = v ? 1 : 0;
    if (this._state === v) return;
    this._state = v;

    this.invalidate();

    //  indispensable pour déclencher les règles
    this.onChange?.(v);
}



    setState(v) { this.state = v; }

    // -----------------------------
    // INTERACTION
    // -----------------------------
    onShortcut() {
        if (!this.isPassive) {
            this.state = this._state === 0 ? 1 : 0;
        }
    }

    onClick() {
        if (!this.isPassive) {
            this.state = this._state === 0 ? 1 : 0;
        }
        return true;
    }

containsRect(mx, my) {

    // centre du switch
    const cx = this.x + this.w / 2;

    // zone centrale verticale (entre labels)
    const topLabelH    = this.h * 0.22;
    const bottomLabelH = this.h * 0.22;

    const midY = this.y + topLabelH;
    const midH = this.h - topLabelH - bottomLabelH;

    // rayon du hexagone (même que dans draw)
    const baseR = this.w * 0.3;
    const hexR  = baseR + this.w * 0.04;

    // hitbox = un carré autour du hexagone
    const hitX = cx - hexR;
    const hitY = midY + midH * 0.50 - hexR;
    const hitW = hexR * 2;
    const hitH = hexR * 2;

    return (
        mx >= hitX &&
        mx <= hitX + hitW &&
        my >= hitY &&
        my <= hitY + hitH
    );
}

    // -----------------------------
    // RENDER (inchangé, sauf this.containsRect retiré)
    // -----------------------------
    draw() {

        this.drawDebugRect();
        this.drawDebugInfo();

        const W = this.w;
        const H = this.h;

        const cx = this.x + W / 2;

        // Zones verticales
        const topLabelH    = H * 0.22;
        const bottomLabelH = H * 0.22;

        const midY = this.y + topLabelH;
        const midH = H - topLabelH - bottomLabelH;

        // --- BOUTON VRAIMENT PETIT ---------------------------------------------
        const baseR = W * 0.3; 
        const hexR  = baseR + W * 0.04;
        const margin = W * 0.02;
        const unit   = W * 0.015;

        const r1_outer = baseR - margin;
        const r1_inner = r1_outer - 1 * unit;

        const r2_outer = r1_inner;
        const r2_inner = r2_outer - 2 * unit;

        const r3_outer = r2_inner;
        const r3_inner = r3_outer - 0.01 * unit;

        const r4_outer = r3_inner;
        const r4_inner = r4_outer - 5 * unit;

        const r5_outer = r4_inner;
        const r5_inner = r5_outer - 2 * unit;

        const leverR = r5_inner * 0.8 ;

        const cyPlate = midY + midH * 0.50;
        const cyLever = (this._state === 1)
            ? midY + midH * 0.32
            : midY + midH * 0.68;

        // --- FOND ---------------------------------------------------------------
        noStroke();
        fill(30);
        rect(this.x, this.y, W, H, W * 0.1);

        // --- LABEL HAUT ---------------------------------------------------------
        textAlign(CENTER, CENTER);
        textSize(topLabelH * 1.2);
        fill(this._state === 1 ? 255 : 100);
        text(this.topLabel, cx, this.y + topLabelH * 0.7);
      
        // --- LABEL BAS ----------------------------------------------------------
        
        textSize(bottomLabelH*1.2);
        fill(this._state === 0 ? 255 : 100);
        text(this.bottomLabel, cx, this.y + H - bottomLabelH * 0.7);

        // --- HEXAGONE EXTERNE (SANS TRANSLATE) ---------------------------------
        fill(145);
        stroke(70);
        strokeWeight(1.0);
        beginShape();
        for (let i = 0; i < 6; i++) {
            const a  = (PI / 3) * i - PI / 6;
            const vx = cx + hexR * cos(a);
            const vy = cyPlate + hexR * sin(a);
            vertex(vx, vy);
        }
        endShape(CLOSE);

        // --- ANNEAUX (du plus grand au plus petit) ------------------------------

        noStroke();

        // anneau 1 : gris très foncé
        fill(50);
        ellipse(cx, cyPlate, r1_outer * 2, r1_outer * 2);
        fill(20);
        ellipse(cx, cyPlate, r1_inner * 2, r1_inner * 2);

        // anneau 2 : gris clair
        fill(140);
        ellipse(cx, cyPlate, r2_outer * 2, r2_outer * 2);
        fill(0);
        ellipse(cx, cyPlate, r2_inner * 2, r2_inner * 2);

        // anneau 3 : quasi noir, très fin
        fill(60);
        ellipse(cx, cyPlate, r3_outer * 2, r3_outer * 2);
        fill(80);
        ellipse(cx, cyPlate, r3_inner * 2, r3_inner * 2);



        // --- SECOND TRIANGLE POUR TEST VISUEL ---


        // anneau 4 : gris moyen, épais
        fill('#605a50');
        ellipse(cx, cyPlate, r4_outer * 2, r4_outer * 2);
        fill(50);
        ellipse(cx, cyPlate, r4_inner * 2, r4_inner * 2);



// anneau 5 : quasi noir, fin
        fill(15);
        ellipse(cx, cyPlate, r5_outer * 2.1, r5_outer * 2.1);
        fill(40);
        ellipse(cx, cyPlate, r5_inner * 2, r5_inner * 2);
        fill(150);
        ellipse(cx, cyPlate, r5_inner * 1.8, r5_inner * 1.8);
        fill('#38312f');
        ellipse(cx, cyPlate, r5_inner * 1, r5_inner * 1);


        // --- OMBRE TRIANGULAIRE -------------------------------------------------
        noStroke();
        fill(0, 80);   // noir semi-transparent

        if (this._state === 1) {
            // potard en haut → ombre vers le bas
            beginShape();
            vertex(cx, cyPlate - hexR * 0.3);
            vertex(cx - hexR * 0.5, cyPlate + hexR );
            vertex(cx + hexR * 0.5, cyPlate + hexR );
            endShape(CLOSE);

        } else {
            // potard en bas → ombre vers le haut
            beginShape();
            vertex(cx, cyPlate + hexR * 0.3);
            vertex(cx - hexR * 0.5, cyPlate - hexR );
            vertex(cx + hexR * 0.5, cyPlate - hexR );
            endShape(CLOSE);
        }
 fill('#393734')

if (this._state === 1) {
    // triangle inversé (haut)
    beginShape();
    vertex(cx, cyPlate + hexR * 0.2);
    vertex(cx - hexR * 0.3, cyPlate - hexR*0.5 );
    vertex(cx + hexR * 0.3, cyPlate - hexR*0.5 );
    endShape(CLOSE);

} else {
    // triangle inversé (bas)
    beginShape();
    vertex(cx, cyPlate - hexR * 0.2);
    vertex(cx - hexR * 0.3, cyPlate + hexR*0.5 );
    vertex(cx + hexR * 0.3, cyPlate + hexR*0.5 );
    endShape(CLOSE);
}  
        // --- TÉTON --------------------------------------------------------------
        fill('#AFA799');
        ellipse(cx, cyLever, leverR * 2, leverR * 2);

        fill('#45413C');
        ellipse(cx, cyLever - leverR * 0.35, leverR * 1.4, leverR * 1.4);

        fill(200);
        ellipse(cx + leverR * 0.35, cyLever, leverR * 0.6, leverR * 0.6);
        ellipse(cx - leverR * 0.3, cyLever, leverR * 0.5, leverR * 0.5);

        // --- REFLET DYNAMIQUE -----------------------------------------
        stroke(255);      // blanc doux
        strokeWeight(2);
        noFill();

        const arcR = leverR ;   // taille du reflet

        if (this._state === 1) {
            // switch en haut → reflet arrondi vers le haut
            arc(cx, cyLever - leverR * 0.55, arcR, arcR * 0.6, PI + QUARTER_PI, TWO_PI - QUARTER_PI);
        } else {
            // switch en bas → reflet arrondi vers le bas
            arc(cx, cyLever + leverR * 0.25, arcR, arcR * 0.6, QUARTER_PI, PI - QUARTER_PI);
        }
    }
}
