class PotardBase extends UIComponent {

  constructor(x, y, rPercent) {
    super();
    this.spacingFactor = 7;

    this.xp = x;
    this.yp = y;
    this.rp = rPercent;
    this.usePercent = true;

    // Données fidèles à ton ancien PotardMultiNotes
    this.modes  = ["unique", "triade", "tetrade", "penta", "gamme"];
    this.labels = ["Unique", "Triade", "Tetrade", "Penta", "Gamme"];

    this.positions = [90, 162, 234, 306, 18];

    this.index = 0;
    this.angle = this.positions[0];

    this.offsetY = 0;

    this.updateResponsive();
  }

  // --- MODE AUTONOME ---
  updateResponsive() {
    if (!this.usePercent) return;

    let base = min(windowWidth, windowHeight);

    this.cx = windowWidth  * (this.xp / 100);
    this.cy = windowHeight * (this.yp / 100);
    this.r  = base         * (this.rp / 100);

    this.w = this.r * 2;
    this.h = this.r * 2.5;

    this.x = this.cx - this.r;
    this.y = this.cy - this.r;
  }

  // --- MODE PANEL ---
setHeight(h) {
  this.h = h;

  this.r = h / 2.5;
  this.w = this.r * 2;

  this.offsetY = this.r * 0.50;  // ta valeur validée
  this.offsetX = this.r * 0.60;  // nouveau décalage horizontal
}


  computeWidth() {}

  getCenter() {
    if (this.usePercent) {
      return { cx: this.cx, cy: this.cy };
    } else {
      return { 
  cx: this.x + this.r + this.offsetX,
  cy: this.y + this.r + this.offsetY
};

    }
  }

  // --- DESSIN ---
  draw() {
    if (this.usePercent) this.updateResponsive();

    this.drawKnob();
    this.drawSymbols();
    this.drawLabel();
  }

  drawKnob() {
    let { cx, cy } = this.getCenter();

    push();
    translate(cx, cy);

    // HALO (fait ressortir du fond sombre)
    noStroke();
    fill(255, 40);
    ellipse(0, 0, this.r * 2.6, this.r * 2.6);

    // FOND
    fill(50);
    ellipse(0, 0, this.r * 2, this.r * 2);

    // BEVEL interne
    stroke(20);
    strokeWeight(this.r * 0.05);
    noFill();
    ellipse(0, 0, this.r * 1.85, this.r * 1.85);

    // ANNEAU
    stroke(120);
    strokeWeight(this.r * 0.07);
    noFill();
    ellipse(0, 0, this.r * 2.2, this.r * 2.2);

    // GLOSSY (reflet premium)
    noStroke();
    fill(255, 25);
    arc(0, 0, this.r * 2, this.r * 2, radians(220), radians(320));

    // AIGUILLE
    push();
    rotate(radians(this.angle));
    stroke(255, 80, 80);
    strokeWeight(this.r * 0.12);
    line(0, 0, this.r * 0.8, 0);
    pop();

    pop();
  }

  drawSymbols() {
    let { cx, cy } = this.getCenter();

    for (let i = 0; i < this.modes.length; i++) {
      let a = radians(this.positions[i]);
      let sx = cx + cos(a) * (this.r + this.r * 0.6);
      let sy = cy + sin(a) * (this.r + this.r * 0.6);

      drawMultiSymbol(this.modes[i], sx, sy, this.r);
    }
  }

  drawLabel() {
    let { cx, cy } = this.getCenter();

    textAlign(CENTER, CENTER);
    textSize(this.r * 0.55);

    // lisibilité améliorée
    stroke(0, 80);
    strokeWeight(this.r * 0.05);
    fill(220);

    text(this.labels[this.index], cx, cy + this.r * 1.5);
  }

mousePressed(mx, my) {


  let { cx, cy } = this.getCenter();
  let d = dist(mx, my, cx, cy);

  if (d < this.r * 1.3) {

    let old = this.index;

    this.index = (this.index + 1) % this.modes.length;
    this.angle = this.positions[this.index];

    // détecter un vrai changement
    this.changed = (this.index !== old);
    if (this.changed) {
      console.log(
        "POTARD STATE CHANGED → index:", this.index,
        "mode:", this.modes[this.index]
      );
}

    return true;
  }
  return false;
}

}
