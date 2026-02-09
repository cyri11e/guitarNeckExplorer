class Switch extends UIComponent {
    constructor(xp, yp, sp, config = {}) {
        super();

        this.ratio = config.ratio || 1.0;

        this.title       = config.title       || "";
        this.topLabel    = config.topLabel    || "";
        this.bottomLabel = config.bottomLabel || "";
        this.color       = config.color       || "#aa0000";

        this._state = 0; // <-- état interne réel (multi-états)
        this.isPassive = (!this.topLabel && !this.bottomLabel);

        this.shortcutKey  = config.shortcutKey  || null;
        this.shortcutCode = config.shortcutCode || null;

        this.setResponsive(xp, yp, sp, config);

        UIManager.register(this);
    }
// table interne des altérations selon state (indirect uniquement)
static alterationMap = {
  3: "a",   // # (augmenté)
  4: "dd",  // double bémol
};

    // façade harmonisée
    get state() {
        return this._state;
    }

set state(v) {
    if (this._state === v) return; // <-- garde-fou
    this._state = v;
    this.triggerChange(v);
}


    // API publique
    setState(v) {
        this.state = v; // utilise la façade
    }

    onShortcut() {
        if (!this.isPassive) {
            this.state = (this.state + 1) % 3;
        }
    }


  
getRatio() {
    // 1) Ratio minimal (fallback si ratio absent / null / 0)
    let minRatio = this.ratio;
    if (!minRatio || minRatio <= 0) minRatio = 0.1;

    // 2) Hauteur fictive
    let H = 100;

    // 3) On utilise UNE SEULE taille de texte cohérente
    textSize(H * 0.25);

    // 4) Largeur du contenu
    let titleW  = textWidth(this.title);
    let topW    = textWidth(this.topLabel);
    let bottomW = textWidth(this.bottomLabel);

    // 5) Largeur minimale typographique
    let minCharW = textWidth("W");

    // 6) Largeur finale du contenu
    let contentW = max(titleW, topW, bottomW, minCharW);

    // 7) Ratio dynamique
    let dynamicRatio = contentW / H;

    // 8) Clamp max
    let maxRatio = 3.0;

    // 9) Ratio final
    return constrain(dynamicRatio, minRatio, maxRatio);
}




    // --- Clic souris ---
    mousePressed(mx, my) {
        if (this.containsRect(mx, my, this.x, this.y, this.w, this.h) && !this.isPassive) {
            this.setState( (this.state + 1) % 3);
        }
    }

  
draw() {

  // --- DEBUG & HOVER -------------------------------------------------------
  this.drawDebugRect();
  if (this.hover) {
    stroke(0, 255, 0);
    strokeWeight(2);
    noFill();
    rect(this.x, this.y, this.w, this.h);
  }

  // --- DIMENSIONS PRINCIPALES ---------------------------------------------
  const totalH = this.h;
  const labelH = totalH * 0.3;
  const capH   = totalH * 0.7;

  // --- MODE PASSIF ---------------------------------------------------------
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

  // --- FOND GLOBAL ---------------------------------------------------------
  fill(30);
  noStroke();
  rect(this.x, this.y, this.w, totalH, this.w * 0.1);

  // --- TITRE ---------------------------------------------------------------
  textAlign(CENTER, CENTER);
  textSize(capH * 0.4);
  fill(this.state === 0 ? 120 : 255);
  text(this.title, this.x + this.w / 2, this.y + labelH * 0.6);

  // --- ALTÉRATION ----------------------------------------------------------
// --- ALTÉRATION ----------------------------------------------------------

// bottom effectif : si state est spécial (3/4), on remplace le bas
const special = Switch.alterationMap[this.state] || null;
const effectiveBottom = special ? special : this.bottomLabel;

let activeParam =
  (this.state === 1) ? this.topLabel :
  (this.state === 2 || this.state === 3 || this.state === 4) ? effectiveBottom :
  null;

let prefix = "";
if (activeParam === "m" || activeParam === "d" || activeParam === "dd") prefix = "♭";
  // double bémol (𝄫)
  if (activeParam === "dd") prefix = "𝄫"; // NEW
if (activeParam === "a") prefix = "♯";

textSize(capH * 0.4);
fill(this.state === 0 ? 120 : 255);
text(prefix, this.x + this.w / 6, this.y + labelH * 0.5);


  // --- BOÎTIER DU CAP ------------------------------------------------------
  stroke(60);
  strokeWeight(2);
  fill(30);
  rect(this.x, this.y + labelH, this.w, capH, this.w * 0.1);

  // --- ZONE INTERNE NOIRE --------------------------------------------------
  const capMargin = this.w * 0.10;
  const innerX    = this.x + capMargin;
  const innerY    = this.y + labelH + capMargin;
  const innerW    = this.w - capMargin * 2;
  const innerH    = capH - capMargin * 2;

  noStroke();
  fill(0);
  rect(innerX, innerY, innerW, innerH, innerW * 0.1);

  // --- BOUTON ROUGE (DYNAMIQUE) -------------------------------------------
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

  // --- LABELS TOP / BOTTOM -------------------------------------------------
  const topY    = this.y + labelH + capH * 0.3;
  const bottomY = this.y + labelH + capH * 0.7;

if (this.state === 1) {
  // TOP actif
  textStyle(BOLD);
  fill(250);
  text(this.topLabel, this.x + this.w / 2, topY);

  fill(120);
  textStyle(NORMAL);
  text(effectiveBottom, this.x + this.w / 2, bottomY);

} else if (this.state === 2 || this.state === 3 || this.state === 4) {
  // BAS (normal ou spécial) actif
  fill(120);
  text(this.topLabel, this.x + this.w / 2, topY);

  fill(250);
  textStyle(BOLD);
  text(effectiveBottom, this.x + this.w / 2, bottomY);
  textStyle(NORMAL);

} else { // state === 0
  fill(120);
  text(this.topLabel, this.x + this.w / 2, topY);
  text(effectiveBottom, this.x + this.w / 2, bottomY);
}

  
  
  
}




}

class MetalSwitch extends UIComponent {
    constructor(xp, yp, sp, config = {}) {
        super();

        this.title       = config.title       || "";
        this.topLabel    = config.topLabel    || "";
        this.bottomLabel = config.bottomLabel || "";
        this.shortcutKey = config.shortcutKey || null;

        this._state = 0; // 0 = bas, 1 = haut
        this.isPassive = false;

        this.setResponsive(xp, yp, sp, config);

        UIManager.register(this);
    }

    get state() { return this._state; }
    set state(v) {
        v = v ? 1 : 0;
        if (this._state === v) return;
        this._state = v;
        this.triggerChange(v);
    }
containsRect(mx, my, x, y, w, h) {

    const hitX = this.x + this.w * 0.25;
    const hitY = this.y + this.h * 0.25;
    const hitW = this.w * 0.5;
    const hitH = this.h * 0.5;

    return (
        mx >= hitX &&
        mx <= hitX + hitW &&
        my >= hitY &&
        my <= hitY + hitH
    );
}


    setState(v) { this.state = v; }

    onShortcut() {
        if (!this.isPassive) {
            this.state = this._state === 0 ? 1 : 0;
        }
    }

    mousePressed(mx, my) {
        if (this.containsRect(mx, my, this.x, this.y, this.w, this.h) && !this.isPassive) {
            this.state = this._state === 0 ? 1 : 0;
        }
    }

  
draw() {

    this.drawDebugRect();

    const W = this.w;
    const H = this.h;

    const cx = this.x + W / 2;

    // Zones verticales
    const topLabelH    = H * 0.22;
    const bottomLabelH = H * 0.22;

    const midY = this.y + topLabelH;
    const midH = H - topLabelH - bottomLabelH;

    // --- BOUTON VRAIMENT PETIT ---------------------------------------------
    const baseR = W * 0.22; // ≈ 44% de la largeur en diamètre
    const hexR  = baseR + W * 0.03;
    const margin = W * 0.02;
    const unit   = W * 0.015;

    const r1_outer = baseR - margin;
    const r1_inner = r1_outer - 1 * unit;

    const r2_outer = r1_inner;
    const r2_inner = r2_outer - 2 * unit;

    const r3_outer = r2_inner;
    const r3_inner = r3_outer - 0.1 * unit;

    const r4_outer = r3_inner;
    const r4_inner = r4_outer - 5 * unit;

    const r5_outer = r4_inner;
    const r5_inner = r5_outer - 1 * unit;

    const leverR = r5_inner * 1.5 ;

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
    textSize(topLabelH * 1.5);
    fill(this._state === 1 ? 255 : 100);
    text(this.topLabel, cx, this.y + topLabelH * 0.5);
  
      // --- LABEL BAS ----------------------------------------------------------
    textSize(bottomLabelH*1.5);
    fill(this._state === 0 ? 255 : 100);
    text(this.bottomLabel, cx, this.y + H - bottomLabelH * 0.5);

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
    fill(30);
    ellipse(cx, cyPlate, r1_outer * 2, r1_outer * 2);
    fill(20);
    ellipse(cx, cyPlate, r1_inner * 2, r1_inner * 2);

    // anneau 2 : gris clair
    fill(190);
    ellipse(cx, cyPlate, r2_outer * 2, r2_outer * 2);
    fill(0);
    ellipse(cx, cyPlate, r2_inner * 2, r2_inner * 2);

    // anneau 3 : quasi noir, très fin
    fill(30);
    ellipse(cx, cyPlate, r3_outer * 2, r3_outer * 2);
    fill(0);
    ellipse(cx, cyPlate, r3_inner * 2, r3_inner * 2);

    // anneau 4 : gris moyen, épais
    fill('#726A5C');
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
      fill('#201A18');
    ellipse(cx, cyPlate, r5_inner * 1.4, r5_inner * 1.4);

  // --- OMBRE TRIANGULAIRE -------------------------------------------------
noStroke();
fill(0, 80);   // noir semi-transparent

if (this._state === 1) {
    // potard en haut → ombre vers le bas
    beginShape();
    vertex(cx, cyPlate - hexR * 0.3);      // sommet du triangle (près du haut)
    vertex(cx - hexR * 0.5, cyPlate + hexR );
    vertex(cx + hexR * 0.5, cyPlate + hexR );
    endShape(CLOSE);

} else {
    // potard en bas → ombre vers le haut
    beginShape();
    vertex(cx, cyPlate + hexR * 0.3);      // sommet du triangle (près du bas)
    vertex(cx - hexR * 0.5, cyPlate - hexR );
    vertex(cx + hexR * 0.5, cyPlate - hexR );
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
// --- REFLET ARC -------------------------------------------------
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


