class LCDSelector extends UIComponent {
  constructor(xp, yp, sp, config = {}) {
    super();

    this.setResponsive(xp, yp, sp);
    this.ratio = config.ratio || 1.5;
    this.w = this.h * this.ratio; // ← largeur réelle du LCD

    this.items = config.items || [];
    this.index = 0;

    this.isOn = false;
    this.placeholder = "-----";

    this.scrollOffset = 0;
    this.sensitivity = 1.0;

    this.dragging = false;
    this.clickCandidate = false;
    this.dragStartY = 0;
    this.dragOffsetY = 0;

    this.shortcutKey = config.shortcutKey || null;
    this.shortcutCode = config.shortcutCode || null;
    UIManager.register(this);
    this.memory = {}; // mémorise l’index par mode
    this.currentMode = null;

    this.debug = config.debug || false;
  }
  
    getRatio() { return this.ratio; }

  onShortcut() {
    // Exemple : activer le composant
    this.setOnOff(true);
    //if (this.index !== 0)
    // Exemple : passer à l’item suivant
    this.index = this.wrap(this.index + 1);
  }

  // a virer ?
  setItems(list) {
    this.items = list;
    // surtout ne pas remettre index = 0
  }

  setMode(modeId, list) {
    // 1. Sauvegarde de l’index du mode précédent
    if (this.currentMode !== null) {
      this.memory[this.currentMode] = this.index;
    }

    // 2. Mise à jour des items
    this.items = list;

    // 3. Restauration de l’index mémorisé
    if (modeId in this.memory) {
      this.index = this.memory[modeId];
    } else {
      this.index = 0; // première visite
    }

    // 4. Mise à jour du mode courant
    this.currentMode = modeId;
  }

  setOnOff(state) {
    this.isOn = state;
  }

  wrap(i) {
    let n = this.items.length;
    return ((i % n) + n) % n;
  }

  updateHover(mx, my) {
    this.hover = this.containsRect(mx, my);
  }

  // -----------------------------
  // INTERACTION
  // -----------------------------

  mousePressed(mx, my) {
    if (this.debug) {
      console.log("----[PRESS]----");
      console.log("mx,my =", mx, my);
      console.log("containsRect =", this.containsRect(mx, my));
      console.log("isOn =", this.isOn);
    }

    if (!this.isOn) return false;
    if (!this.containsRect(mx, my)) return false;

    this.dragging = false;
    this.clickCandidate = true;
    this.dragStartY = my;
    this.dragOffsetY = my;

    if (this.debug) console.log("[PRESS] inside OK");

    return true;
  }

  mouseDragged(mx, my) {
    if (this.debug) {
      console.log("----[DRAG]----");
      console.log("mx,my =", mx, my);
      console.log("clickCandidate =", this.clickCandidate);
      console.log("dragging =", this.dragging);
    }

    if (!this.isOn) return false;
    if (!this.clickCandidate && !this.dragging) return false;

    let dy = my - this.dragOffsetY;
    this.dragOffsetY = my;

    if (!this.dragging && Math.abs(my - this.dragStartY) > 3) {
      this.dragging = true;
      this.clickCandidate = false;
      if (this.debug) console.log("[DRAG] START (threshold passed)");
    }

    if (this.dragging) {
      this.scrollOffset += dy * this.sensitivity;
      if (this.debug) console.log("[DRAG] scrollOffset =", this.scrollOffset);
    }

    return true;
  }

  mouseReleased(mx, my) {
    if (!this.isOn) return;

    let cy = this.y + this.h / 2;

    if (this.debug) {
      console.log("----[RELEASE]----");
      console.log("mx,my =", mx, my);
      console.log("cy =", cy, "itemHeight =", this.itemHeight);
      console.log("dragging =", this.dragging);
      console.log("clickCandidate =", this.clickCandidate);
      console.log("scrollOffset =", this.scrollOffset);
      console.log("index(before) =", this.index);
      console.log("containsRect =", this.containsRect(mx, my));
    }

    // --- SCROLL ---
    if (this.dragging) {
      if (this.debug) console.log("[RELEASE] mode = DRAG");

      // combien d’items on a parcouru ?
      let delta = this.scrollOffset / this.itemHeight;

      // arrondi à l’item le plus proche
      let step = Math.round(delta);

      if (this.debug) console.log("delta =", delta, "step =", step);

      this.index = this.wrap(this.index - step);

      this.scrollOffset = 0;
    }

    // --- CLIC ---
    else if (this.clickCandidate && this.containsRect(mx, my)) {
      if (this.debug) console.log("[RELEASE] mode = CLICK");

      if (my < cy - this.itemHeight / 2) {
        if (this.debug) console.log("[CLICK] ABOVE");
        this.index = this.wrap(this.index - 1);
      } else if (my > cy + this.itemHeight / 2) {
        if (this.debug) console.log("[CLICK] BELOW");
        this.index = this.wrap(this.index + 1);
      } else {
        if (this.debug) console.log("[CLICK] CENTER");
      }

      this.scrollOffset = 0;
    }

    if (this.debug) {
      console.log(
        "[RELEASE] end index(after) =",
        this.index,
        "item =",
        this.items[this.index]
      );
    }

    this.dragging = false;
    this.clickCandidate = false;
  }

  // -----------------------------
  // RENDER
  // -----------------------------

  draw() {
    this.drawDebugRect();

    // LCD background
    let bgOn = color(120, 255, 120, 180);
    let bgOff = color(60, 120, 60, 120);
    let marginLeft = this.h * 0.20;   // marge pour le point
    let w = this.h * this.ratio - marginLeft;

    let lcdX = this.x + marginLeft;   //  LCD décalé à droite
    let lcdW = w - marginLeft;        //  LCD rétréci


    fill(this.isOn ? bgOn : bgOff);
    noStroke();
    rect(lcdX, this.y, this.w- marginLeft, this.h, this.h * 0.2);

    // border
    stroke(this.isOn ? 0 : 50);
    strokeWeight(2);
    noFill();
    rect(lcdX, this.y, this.w- marginLeft, this.h, this.h * 0.2);

    if (!this.isOn) {
      fill(0, 40);
      textAlign(CENTER, CENTER);
      textSize(this.h * 0.25);
      text(this.placeholder, lcdX + w / 2, this.y + this.h / 2);
      return;
    }

    textAlign(CENTER, CENTER);
    noStroke();

    this.itemHeight = this.h * 0.33;

    let cx = lcdX + w / 2;
    let cy = this.y + this.h / 2;

    // 9 items autour du centre
    let ids = [];
    for (let k = -4; k <= 4; k++) {
      ids.push(this.wrap(this.index + k));
    }

    // CLIPPING
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(lcdX, this.y, this.w, this.h);
    drawingContext.clip();

    for (let k = -4; k <= 4; k++) {
      let idx = this.wrap(this.index + k);
      let y = cy + k * this.itemHeight + this.scrollOffset;

      // distance normalisée au centre
      let distNorm = abs(k + this.scrollOffset / this.itemHeight);

      // effet cylindre premium
      let alpha = map(distNorm, 0, 2, 255, 0, true);
      let size = map(distNorm, 0, 4, this.h * 0.24, this.h * 0.16, true);

      fill(0, alpha);
      textSize(size);
      noStroke();
      text(this.items[idx], cx, y);
    }

    drawingContext.restore();

    // highlight central
    stroke(0);
    strokeWeight(2);
    noFill();
    rect(
      lcdX,
      cy - this.itemHeight / 2,
      this.w,
      this.itemHeight,
      this.itemHeight * 0.2
    );

    // --- POINT BLANC RESPONSIVE ---
    let cyPoint = cy;
    let dotSize = this.h * 0.1;
    let dotOffset = this.w * 0.15;

    // à gauche
    let cxPoint = this.x + marginLeft * 0.5;

    fill(200);
    noStroke();
    ellipse(cxPoint, cyPoint, dotSize, dotSize);
  }
}
