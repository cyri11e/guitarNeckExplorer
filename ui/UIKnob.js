class Knob extends UIComponent {
  constructor(xp, yp, sp, config = {}) {
    super(xp, yp, sp, config);

    this.items = config.items || [];
    this.index = 0;

    this.hideBottom = config.hideBottom ?? false;

    this.angles = this.computeAngles(this.items.length);

    this.colorBase = 50;
    this.colorRing = 120;
    this.colorNeedle = [255, 80, 80];

    this.hitboxScale = 1.4;

    this.hoverDrag = { isHovered: false, hitZone: { x:0, y:0, w:0, h:0 } };

    this.shortcutKey = config.shortcutKey || null;
    this.shortcutCode = config.shortcutCode || null;

    this.isDraggable = false;
    this.isZoomable = false;

    // ratio du RECTANGLE (cercle + label)
    this.ratio = 0.90;
  }

  getRatio() { return this.ratio; }

  computeAngles(n) {
    let a = [];
    let step = 360 / n;
    for (let i = 0; i < n; i++) a.push((90 + i * step) % 360);
    return a;
  }

  getCenter() {
    return {
      cx: this.x + this.w / 2,
      cy: this.y + this.h / 2
    };
  }

  updateHover(mx, my) {
    let extraW = this.w * (this.hitboxScale - 1);
    let extraH = this.h * (this.hitboxScale - 1);

    let x = this.x - extraW / 2;
    let y = this.y - extraH / 2;
    let w = this.w + extraW;
    let h = this.h + extraH;

    this.hoverDrag.hitZone = { x, y, w, h };

    let inside = mx >= x && mx <= x + w && my >= y && my <= y + h;
    if (!inside) {
      this.hover = false;
      this.hoverDrag.isHovered = false;
      return;
    }

    this.hover = true;

    let { cx, cy } = this.getCenter();
    let r = min(this.w, this.h * 0.7) / 2;

    let click = dist(mx, my, cx, cy) <= r;
    this.hoverDrag.isHovered = !click;
  }

  mousePressed(mx, my) {
    let { cx, cy } = this.getCenter();
    let r = min(this.w, this.h * 0.7) / 2;

    if (dist(mx, my, cx, cy) <= r) {
      this.index = (this.index + 1) % this.items.length;
      return true;
    }
    return false;
  }

draw() {
  // proportions internes
  const topP = 0.25;
  const circleP = 0.50;
  const labelP = 0.25;

  const topH = this.h * topP;
  const circleH = this.h * circleP;
  const labelH = this.h * labelP;

  // centre du cercle
  const cx = this.x + this.w / 2;
  const cy = this.y + topH + circleH / 2;

  // rayon du cercle
  const r = min(this.w, circleH) / 2;

  // --- DEBUG RECTANGLE ---
  if (this.debug && this.hover) {
    noFill();
    stroke(255, 0, 0);
    strokeWeight(2);
    rect(this.x, this.y, this.w, this.h);
  }

  // --- HALO ---
  noStroke();
  fill(255, 40);
  ellipse(cx, cy, r * 2.6, r * 2.6);

  // --- FOND ---
  fill(this.colorBase);
  ellipse(cx, cy, r * 2, r * 2);

  // --- ANNEAU ---
  stroke(this.colorRing);
  strokeWeight(r * 0.07);
  noFill();
  ellipse(cx, cy, r * 2.2, r * 2.2);

  // --- GLOSSY ---
  noStroke();
  fill(255, 25);
  arc(cx, cy, r * 2, r * 2, radians(220), radians(320));

  // --- AIGUILLE ---
  push();
  translate(cx, cy);
  rotate(radians(this.angles[this.index]));
  stroke(...this.colorNeedle);
  strokeWeight(r * 0.12);
  line(0, 0, r * 0.8, 0);
  pop();

  // --- SYMBOLES AUTOUR ---
  this.drawSymbols(cx, cy, r*1.1);

  // --- LABEL BAS (avec contour gris, comme avant) ---

    const item = this.items[this.index];
    const label = item.label || item.symbol;

    textAlign(CENTER, CENTER);
    textSize(r * 0.65);

    const ly = this.y + topH + circleH + labelH * 0.70;

    // contour gris
    stroke(50);
    strokeWeight(r / 10);
    fill(240);
    text(label, cx, ly);

    // redraw propre sans contour (comme ton ancien code)
    noStroke();
    fill(240);
    text(label, cx, ly);

  // --- DEBUG ZONES ---
  if (this.debug && this.hover) this.drawDebug(r);
}



  drawSymbols(cx, cy, r) {
    for (let i = 0; i < this.items.length; i++) {
      let a = this.angles[i];

      if (this.hideBottom && abs(a - 90) < 0.1) continue;

      let rad = radians(a);
      let sx = cx + cos(rad) * (r + r * 0.6);
      let sy = cy + sin(rad) * (r + r * 0.6);

      fill(240);
      stroke(20);
      textAlign(CENTER, CENTER);
      textSize(r * 0.6);
      strokeWeight(r / 12);
      text(this.items[i].symbol, sx, sy);
    }
  }
  
  drawDebug(r) {
  // CLICK ZONE (vert)
  let { cx, cy } = this.getCenter();
  noFill();
  stroke(0, 255, 0);
  strokeWeight(2);
  ellipse(cx, cy, r * 2, r * 2);

  // DRAG ZONE (bleu)
  let b = this.hoverDrag.hitZone;
  stroke(0, 0, 255);
  rect(b.x, b.y, b.w, b.h);
}

  
}







class PinkBox extends UIComponent {
    constructor(xp, yp, sp, config = {}) {
        super(xp, yp, sp, config);
        this.ratio = config.ratio || 1.0;
    }

    getRatio() {
        return this.ratio;
    }

    draw() {
        //if (!this.visible) return;

        push();
        noStroke();
        fill(255, 100, 150);
        rect(this.x, this.y, this.w, this.h, 8);
        pop();
    }
}

