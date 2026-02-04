class SwitchBase extends UIComponent {
  constructor(x, y, hPercent, title, top = "", bottom = "") {
    super();

    // Mode autonome
    this.xp = x;
    this.yp = y;
    this.hp = hPercent;
    this.usePercent = true;

    this.title = title;
    this.labelTop = top;
    this.labelBottom = bottom;

    this.isPassive = (!top && !bottom);
    this.state = 0; // 0 = OFF, 1 = top active, 2 = bottom active

    this.updateResponsive();
    this.w = this.calculateWidth();
  }

  // --- AUTONOME ---
  updateResponsive() {
    if (!this.usePercent) return;

    let base = min(windowWidth, windowHeight);

    this.h = base * (this.hp / 100);
    this.x = windowWidth  * (this.xp / 100);
    this.y = windowHeight * (this.yp / 100);

    this.w = this.calculateWidth();
  }

  // --- PANEL ---
  setHeight(h) {
    this.h = h;
    this.w = this.calculateWidth();
  }

  computeWidth() {
    // largeur déjà calculée
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  // --- CALCUL LARGEUR EXACT D’ORIGINE ---
  calculateWidth() {
    textSize(this.h * 0.35);
    let titleW = textWidth(this.title);

    textSize(this.h * 0.4);
    let topW = textWidth(this.labelTop);
    let bottomW = textWidth(this.labelBottom);

    let maxW = max(titleW, topW, bottomW);

    return maxW * 1.6; // marge visuelle EXACTE
  }

  // --- DESSIN EXACT D’ORIGINE ---
  draw() {
    if (this.usePercent) this.updateResponsive();

    let labelH = this.h * 0.3;
    let totalH = this.h + labelH;

    // --- MODE PASSIF ---
    if (this.isPassive) {
      fill(30);
      noStroke();
      rect(this.x, this.y, this.w, totalH, this.w * 0.1);

      textAlign(CENTER, CENTER);
      textSize(this.h * 0.40);
      fill(this.state === 0 ? 120 : 255);
      text(this.title, this.x + this.w / 2, this.y + labelH * 0.5);
      return;
    }

    // --- FOND GLOBAL ---
    fill(30);
    noStroke();
    rect(this.x, this.y, this.w, totalH, this.w * 0.1);

    // --- LABEL ---
    textAlign(CENTER, CENTER);
    textSize(this.h * 0.4);
    fill(this.state === 0 ? 120 : 255);
    text(this.title, this.x + this.w / 2, this.y + labelH * 0.5);

    // --- PRÉFIXES ♭ / ♯ ---
    let activeParam = null;
    if (this.state === 1) activeParam = this.labelTop;
    else if (this.state === 2) activeParam = this.labelBottom;

    let prefix = "";
    if (activeParam === "m" || activeParam === "d") prefix = "♭";
    else if (activeParam === "a") prefix = "♯";

    textSize(this.h * 0.3);
    text(prefix, this.x + this.w / 5, this.y + labelH * 0.4);

    // --- BOÎTIER ---
    stroke(60);
    strokeWeight(2);
    fill(30);
    rect(this.x, this.y + labelH, this.w, this.h, this.w * 0.1);

    // --- CAPOT ---
    let capMargin = this.w * 0.1;
    let capX = this.x + capMargin;
    let capY = this.y + labelH + capMargin;
    let capW = this.w - capMargin * 2;
    let capH = this.h - capMargin * 2;

    let activeColor = color(220, 0, 0);
    let inactiveColor = color(100, 0, 0);
    let capColor = this.state === 0 ? inactiveColor : activeColor;

    noStroke();
    fill(capColor);
    rect(capX, capY, capW, capH, capW * 0.1);

    // --- MENTIONS ---
    textAlign(CENTER, CENTER);
    textSize(this.h * 0.4);

    if (this.state === 1) {
      textStyle(BOLD);
      fill(250);
      text(this.labelTop, this.x + this.w / 2, this.y + labelH + this.h * 0.3);
      fill(120);
      textStyle(NORMAL);
      text(this.labelBottom, this.x + this.w / 2, this.y + labelH + this.h * 0.7);

    } else if (this.state === 2) {
      fill(120);
      text(this.labelTop, this.x + this.w / 2, this.y + labelH + this.h * 0.3);
      fill(250);
      textStyle(BOLD);
      text(this.labelBottom, this.x + this.w / 2, this.y + labelH + this.h * 0.7);
      textStyle(NORMAL);

    } else {
      fill(120);
      text(this.labelTop, this.x + this.w / 2, this.y + labelH + this.h * 0.3);
      text(this.labelBottom, this.x + this.w / 2, this.y + labelH + this.h * 0.7);
    }
  }

  // --- INTERACTION EXACTE ---
  mousePressed(mx, my) {
    if (this.isPassive) return false;

    let labelH = this.h * 0.3;
    let totalH = this.h + labelH;

    if (mx > this.x && mx < this.x + this.w &&
        my > this.y && my < this.y + totalH) {

      this.state = (this.state + 1) % 3;
      return true;
    }
    return false;
  }
}
