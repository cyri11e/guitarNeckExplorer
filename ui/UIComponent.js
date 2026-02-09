class UIComponent {
  constructor() {
    // --- FLAGS D’INTERACTION UTILISATEUR ---
    // L’utilisateur peut-il déplacer ce composant ?
    this.isDraggable = false;

    // L’utilisateur peut-il zoomer ce composant ?
    this.isZoomable = false;

    // --- ETAT DRAG ---
    this.dragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    // --- RESPONSIVE ---
    this.usePercent = true;

    // --- HOVER ---
    this.hover = false;
    this.shortcutKey = null; // ex: 'a'
    this.shortcutCode = null; // ex: ENTER
    // --- ETAT ---
    this.onChange = null;
    // --- DEBUG ---
    this.debug = false;
  }
  
    // Façade harmonisée
    get state() {
        return 0; // valeur par défaut pour les composants sans état
    }

set state(v) {
    if (this.value === v) return;
    this._previousState = this.value;  // <--- on mémorise l'ancien état
    this.setValue(v);
}


    // API publique générique
    setState(v) {
        this.state = v;
    }


  
  normalizeSP(inPanel = false) {
    // 1. rien → 100%
    if (this.sp == null) {
      this.sp = 100;
    }

    // 2. 0 → 100%
    if (this.sp === 0) {
      this.sp = 100;
    }

    // 3. min selon contexte
    let minH = inPanel ? 10 : 5;

    if (this.sp > 0 && this.sp < minH) {
      this.sp = minH;
    }
  }

  onShortcut() {
    // override dans les composants
  }
  // -------------------------------------------------------
  // RESPONSIVE
  // -------------------------------------------------------
  setResponsive(xp, yp, sp) {
    this.xp = xp;
    this.yp = yp;
    this.sp = sp;
    this.usePercent = true;
  }

  updateResponsive() {
    this.normalizeSP(false); // mode window
    if (!this.usePercent) return;

    let base = min(windowWidth, windowHeight);

    this.w = base * (this.sp / 100);
    this.h = this.w * 1.25;

    this.x = windowWidth * (this.xp / 100) - this.w / 2;
    this.y = windowHeight * (this.yp / 100) - this.h / 2;
  }

  // -------------------------------------------------------
  // HOVER RECTANGLE
  // -------------------------------------------------------
  updateHover(mx, my) {
    this.hover = this.containsRect(mx, my);
  }

  containsRect(mx, my) {
    return (
      mx >= this.x &&
      mx <= this.x + this.w &&
      my >= this.y &&
      my <= this.y + this.h
    );
  }

  //------------ETAT--------------
triggerChange(newState) {
    console.log(
        "%c[TRIGGER] from " + this.constructor.name +
        "  id=" + (this.id ?? "none") +
        "  state=" + newState,
        "color:#ff8800; font-weight:bold;"
    );

    if (this.onChange) {
        this.onChange(newState);
    }

  //  UIManager.onComponentChange(this, newState);
}

  
  // -------------------------------------------------------
  // INTERACTIONS UTILISATEUR
  // -------------------------------------------------------

  mousePressed(mx, my) {
    // Si l’utilisateur n’a pas le droit → on bloque
    if (!this.isDraggable) return false;

    if (!this.containsRect(mx, my)) return false;

    this.dragging = true;
    this.dragOffsetX = mx - this.x;
    this.dragOffsetY = my - this.y;
    return true;
  }

  mouseDragged(mx, my) {
    if (!this.isDraggable) return false;
    if (!this.dragging) return false;

    this.x = mx - this.dragOffsetX;
    this.y = my - this.dragOffsetY;
    return true;
  }

  mouseReleased() {
    this.dragging = false;
  }

  mouseWheel(event) {
    if (!this.isZoomable) return false;
    if (!this.containsRect(mouseX, mouseY)) return false;

    let delta = constrain(-event.delta * 0.001, -0.2, 0.2);

    this.w = max(this.w * (1 + delta), 20);
    this.h = this.w * 1.25;

    return true;
  }

  // -------------------------------------------------------
  // DEBUG RECTANGLE
  // -------------------------------------------------------
  drawDebugRect() {
    if (!this.debug || !this.hover) return;

    noFill();
    stroke(255, 0, 0);
    strokeWeight(2);
    rect(this.x, this.y, this.w, this.h);
  }
  
}
