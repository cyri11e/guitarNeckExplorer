class LCDSelector extends UIComponent {
  constructor(xp, yp, sp, config = {}) {
    super();

    this.setResponsive(xp, yp, sp);
    this.ratio = config.ratio || 1.5;
    this.w = this.h * this.ratio;

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

    this.memory = {};
    this.currentMode = null;

    this.debug = true;
    Object.defineProperty(this, "index", {
    get: () => this._index,
    set: (v) => {
        console.log(
            "%c[INDEX WRITE] index → " + v +
            "  (called by: " + new Error().stack.split("\n")[2].trim() + ")",
            "color:#ff4444; font-weight:bold;"
        );
        this._index = v;
    }
});
this._index = 0;

  }

  // -----------------------------
  // HARMONISATION + DEBUG
  // -----------------------------

  get state() {
    return this.index;
  }

  set state(v) {
    if (this.index === v) return;
    if (this.debug) console.log("[LCD] set state →", v);
    this.setIndex(v);
  }

setIndex(v) {
    console.log(
        "%c[INDEX CHANGE] LCD index → " + v +
        "  (called by: " + (new Error().stack.split("\n")[2].trim()) + ")",
        "color:#ff4444; font-weight:bold;"
    );

    this.index = this.wrap(v);
    this.triggerChange(this.index);
}


  // -----------------------------
  // ESSENTIEL : permet à UIManager de détecter le LCD
  // -----------------------------
  contains(mx, my) {
   // console.log('contains')
    return (
      mx >= this.x &&
      mx <= this.x + this.w &&
      my >= this.y &&
      my <= this.y + this.h
    );
  }

  // -----------------------------
  // API
  // -----------------------------

  getRatio() { return this.ratio; }

  onShortcut() {
    this.setOnOff(true);
    this.state = this.wrap(this.index + 1);
  }

  setItems(list) {
    this.items = list;
  }


  setMode(modeId, list) {
    console.log(
        "%c[SETMODE CALL] modeId=" + modeId +
        "  (called by: " + new Error().stack.split("\n")[2].trim() + ")",
        "color:#ff00ff; font-weight:bold;"
    );


    // 1. Sauvegarde du mode précédent
    if (this.currentMode !== null) {
        this.memory[this.currentMode] = this.index;
    }

    // 2. Mise à jour des items
    this.items = list;

    // 3. Restauration de l’index mémorisé
    if (modeId in this.memory) {
        this.index = this.memory[modeId];
    } 
    else {
        // Première visite : on garde l'index actuel
        // (NE PAS remettre à 0)
        this.index = this.index;
    }

    // 4. Mise à jour du mode courant
    this.currentMode = modeId;
}

  setOnOff(state) {
    this.isOn = state;
    if (this.debug) console.log("[LCD] setOnOff →", state);
  }

  wrap(i) {
    let n = this.items.length;
    return ((i % n) + n) % n;
  }

  updateHover(mx, my) {
    this.hover = this.contains(mx, my);
  }

  // -----------------------------
  // INTERACTION
  // -----------------------------

  mousePressed(mx, my) {
    console.log("[LCD] mousePressed CHECK");

    if (!this.isOn) return false;
    if (!this.contains(mx, my)) return false;

    this.dragging = false;
    this.clickCandidate = true;
    this.dragStartY = my;
    this.dragOffsetY = my;

    if (this.debug) console.log("[LCD] PRESS");

    return true;
  }

  mouseDragged(mx, my) {
    if (!this.isOn || !this.contains(mx, my)) return;

    if (!this.clickCandidate && !this.dragging) return false;

    let dy = my - this.dragOffsetY;
    this.dragOffsetY = my;

    if (!this.dragging && Math.abs(my - this.dragStartY) > 3) {
      this.dragging = true;
      this.clickCandidate = false;
      if (this.debug) console.log("[LCD] DRAG START");
    }

    if (this.dragging) {
      this.scrollOffset += dy * this.sensitivity;
      if (this.debug) console.log("[LCD] DRAG scrollOffset =", this.scrollOffset);
    }

    return true;
  }

  mouseReleased(mx, my) {

    if (!this.isOn) return;

    let cy = this.y + this.h / 2;

    if (this.debug) console.log("[LCD] RELEASE before index =", this.index);

    // --- SCROLL ---
    if (this.dragging) {
      let delta = this.scrollOffset / this.itemHeight;
      let step = Math.round(delta);

      console.log("[LCD] SCROLL step =", step);

      this.state = this.wrap(this.index - step);
      this.scrollOffset = 0;
    }

    // --- CLICK ---
    else if (this.clickCandidate && this.contains(mx, my)) {

      if (my < cy - this.itemHeight / 2) {
        this.state = this.wrap(this.index - 1);
      }
      else if (my > cy + this.itemHeight / 2) {
        this.state = this.wrap(this.index + 1);
      }

      this.scrollOffset = 0;
    }

    console.log("[LCD] RELEASE after index =", this.state);

    this.dragging = false;
    this.clickCandidate = false;
  }

  // -----------------------------
  // RENDER
  // -----------------------------

  draw() {
    this.drawDebugRect();

    let bgOn = color(120, 255, 120, 180);
    let bgOff = color(60, 120, 60, 120);

    let marginLeft = this.h * 0.20;
    let w = this.h * this.ratio - marginLeft;

    let lcdX = this.x + marginLeft;

    fill(this.isOn ? bgOn : bgOff);
    noStroke();
    rect(lcdX, this.y, this.w - marginLeft, this.h, this.h * 0.2);

    stroke(this.isOn ? 0 : 50);
    strokeWeight(2);
    noFill();
    rect(lcdX, this.y, this.w - marginLeft, this.h, this.h * 0.2);

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

    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(lcdX, this.y, this.w, this.h);
    drawingContext.clip();

    for (let k = -4; k <= 4; k++) {
      let idx = this.wrap(this.index + k);
      let y = cy + k * this.itemHeight + this.scrollOffset;

      let distNorm = abs(k + this.scrollOffset / this.itemHeight);

      let alpha = map(distNorm, 0, 2, 255, 0, true);
      let size = map(distNorm, 0, 4, this.h * 0.24, this.h * 0.16, true);

      fill(0, alpha);
      textSize(size);
      noStroke();
      text(this.items[idx], cx, y);
    }

    drawingContext.restore();

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

    let cyPoint = cy;
    let dotSize = this.h * 0.1;

    let cxPoint = this.x + marginLeft * 0.5;

    fill(200);
    noStroke();
    ellipse(cxPoint, cyPoint, dotSize, dotSize);
  }
}
