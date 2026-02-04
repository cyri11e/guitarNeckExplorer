class Panel extends UIComponent {
  constructor(xp, yp, hp, config = {}) {
    super();

    this.xp = xp;
    this.yp = yp;
    this.sp = hp;

    this.isDraggable = config.isDraggable ?? true;
    this.isZoomable  = config.isZoomable  ?? true;

    this.zoomFactor = 1;
    this.initialized = false;

    this.children = [];
  }

  add(child) {
    child.isDraggable = false;
    child.isZoomable  = false;
    this.children.push(child);
  }

  updateResponsive() {
    let base = min(windowWidth, windowHeight);

    this.baseSize = base * (this.sp / 100);

    this.w = this.baseSize * this.zoomFactor;
    this.h = this.baseSize * this.zoomFactor;

    if (!this.initialized) {
      this.x = windowWidth  * (this.xp / 100);
      this.y = windowHeight * (this.yp / 100);
      this.initialized = true;
    }

    this.updateChildren();
  }

  updateChildren() {
    if (this.children.length === 0) return;

    let padding = this.h * 0.05;
    let xCursor = this.x + padding;

    for (let c of this.children) {


      let ratio = c.getRatio ? c.getRatio() : 1;
      
c.normalizeSP(true); // mode panel

c.h = (this.h - padding * 2) * (c.sp / 100);
c.w = c.h * ratio;


      c.x = xCursor;
      c.y = this.y + padding;

      xCursor += c.w + padding;
    }

    this.w = xCursor - this.x;
  }

draw() {
  // fond noir mat
  noStroke();
  fill(20, 20, 20, 220);
  rect(this.x, this.y, this.w, this.h, this.h * 0.15);

  // contour métal
  stroke(180);
  strokeWeight(3);
  noFill();
  rect(this.x, this.y, this.w, this.h, this.h * 0.15);

  // ombre portée
  noStroke();
  fill(0, 0, 0, 120);
  rect(this.x + 4, this.y + 4, this.w, this.h, this.h * 0.15);

  // enfants
  for (let c of this.children) {
    c.updateHover(mouseX, mouseY);
    c.draw();
  }
}


  // -------------------------------------------------------
  // INTERACTIONS
  // -------------------------------------------------------

  mousePressed(mx, my) {
    if (!this.containsRect(mx, my)) return false;

    // 1) Enfants d'abord
    for (let c of this.children) {
      if (c.mousePressed(mx, my)) return true;
    }

    // 2) Drag du panel
    if (this.isDraggable && super.mousePressed(mx, my)) {
      return true;
    }

    return true;
  }

  mouseDragged(mx, my) {
    // drag du panel
    if (this.isDraggable && super.mouseDragged(mx, my)) {
      this.updateChildren();
      return true;
    }

    // drag d’un enfant
    for (let c of this.children) {
      if (c.mouseDragged(mx, my)) return true;
    }

    return false;
  }

mouseReleased(mx, my) {
    super.mouseReleased(mx, my);
    for (let c of this.children) c.mouseReleased(mx, my);
}


  mouseWheel(e) {
    if (!this.containsRect(mouseX, mouseY)) return false;

    let delta = constrain(-e.delta * 0.001, -0.2, 0.2);
    let scale = 1 + delta;

    this.zoomFactor *= scale;

    this.updateResponsive();
    return true;
  }
}
