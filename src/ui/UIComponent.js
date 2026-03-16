class UIComponent {

    constructor() {
        // Position / taille relatives
        this.xp = 0;
        this.yp = 0;
        this.sp = 100;      // taille relative (% du parent)
        this.aspectRatio = 1; // largeur = hauteur * aspectRatio

        // Position / taille absolues
        this.x = 0;
        this.y = 0;
        this.w = 0;
        this.h = 0;
        this.parent = null;

        // Interaction
        this.isHovered = false;
        this.isDraggable = false;
        this.isZoomable = false;

        this.dragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.isPressed = false;
        this.pressX = 0;
        this.pressY = 0;

        // Zoom
        this.zoomFactor = 1;

        // Rendering / debug
        this.needsRedraw = true;
        this.debug = false;
        this.wheelActive = false;

        // ⭐ AJOUT : référence vers App
        this.app = null;

        // Z-order interaction policy
        this.bringToFrontOnPress = false;
    }

    // ============================================================
    // RESPONSIVE : relatif -> absolu
    // ============================================================

    setResponsive(xp, yp, sp) {
        this.xp = xp;
        this.yp = yp;
        this.sp = sp;
    }

    _getParentFrame() {
        if (this.parent) {
            return {
                px: this.parent.x,
                py: this.parent.y,
                pw: this.parent.w,
                ph: this.parent.h
            };
        } else {
            return {
                px: 0,
                py: 0,
                pw: windowWidth,
                ph: windowHeight
            };
        }
    }

    updateResponsive() {
        const { px, py, pw, ph } = this._getParentFrame();

        // Position absolue = position relative * taille parent
        this.x = px + pw * (this.xp / 100);
        this.y = py + ph * (this.yp / 100);

        // Hauteur = sp% de la hauteur du parent * zoom
        this.h = ph * (this.sp / 100) * this.zoomFactor;

        // Largeur imposée par le ratio
        this.w = this.h * this.aspectRatio;

        this.computeLayout();
    }

    computeLayout() {}

    // ============================================================
    // UTILITAIRES POSITION / ZOOM (métier)
    // ============================================================

    _updateRelativeFromAbsolute() {
        const { px, py, pw, ph } = this._getParentFrame();

        this.xp = ((this.x - px) / pw) * 100;
        this.yp = ((this.y - py) / ph) * 100;
    }

    moveBy(dx, dy) {
        this.x += dx;
        this.y += dy;
        this._updateRelativeFromAbsolute();
        this.invalidate();
    }

    // moveToAbsolute(nx, ny) {
    //     this.x = nx;
    //     this.y = ny;
    //     this._updateRelativeFromAbsolute();
    //     this.invalidate();
    // }

    applyZoomAt(factor, cx, cy) {
        // cx, cy : point de zoom en coordonnées absolues (ex: mouseX, mouseY)
        if (factor === 1) return;

        // position locale avant zoom (0..1)
        const localX = (cx - this.x) / this.w;
        const localY = (cy - this.y) / this.h;

        // nouvelle taille
        this.w *= factor;
        this.h *= factor;

        // repositionner pour garder le point sous la souris
        this.x = cx - localX * this.w;
        this.y = cy - localY * this.h;

        this.zoomFactor *= factor;

        this._updateRelativeFromAbsolute();
        this.invalidate();
    }

    // ============================================================
    // HIT TEST
    // ============================================================

    containsRect(evt) {
        const inside = (
            evt.x >= this.x &&
            evt.x <= this.x + this.w &&
            evt.y >= this.y &&
            evt.y <= this.y + this.h
        )
        this.isHovered = inside ;
        return inside;
    }

    // ============================================================
    // INTERACTIONS SOURIS (façade : appellent les méthodes métier)
    // ============================================================


mouseWheel(evt) {
    if (!this.isZoomable) return false;
    if (!this.containsRect(evt)) return false;

    this.wheelActive = true;

    const factor = evt.delta > 0 ? 0.95 : 1.05;

    this.applyZoomAt(factor, evt.x, evt.y);
    return true;
}


    // ============================================================
    // INVALIDATION
    // ============================================================

    invalidate() {
        this.needsRedraw = true;

        //  AJOUT : prévenir App
        if (this.app) {
            this.app.invalidate();
        }
    }

invalidateNow() {
    this.invalidate();      // marque le composant
    this.app.update();      // exécute la logique
    this.app.display();     // dessine immédiatement
}



    // ============================================================
    // DEBUG
    // ============================================================

    drawDebugRect() {
        if (!this.debug) return;
        push();
        noFill();
        stroke(255, 0, 0);
        rect(this.x, this.y, this.w, this.h);
        pop();
    }

    drawDebugInfo() {
        if (!this.debug) return;
        push();
        fill(255, 0, 0);
        noStroke();
        textSize(12);
        text(
            `(${this.x.toFixed(0)}, ${this.y.toFixed(0)}) zoom:${this.zoomFactor.toFixed(2)}`,
            this.x + 5,
            this.y + 15
        );
        pop();
    }

    drawShortcutOverlay() {
        if (!this.isHovered) return;
        if (!this.shortcutKey) return;


        textAlign(LEFT, TOP);
        textSize(windowHeight / 30);
        fill('#00ff049e');
        strokeWeight(1)
        noStroke();
        text('['+this.shortcutKey+']', 1, 1);
        text('"'+this.description+'"', windowHeight / 3, 1);

    }

    draw() {
        push()
        this.drawDebugRect();
        this.drawDebugInfo();
        this.drawShortcutOverlay();
        pop()
    }

    // ============================================================
    // EVENTS VIDES
    // ============================================================

updateHover(evt) {
    const inside = this.containsRect(evt);
    this.isHovered = inside;
}

// gestion dans mousemove pas censé etre surchargé
// contraitement à containsRect
mouseMoved(evt) {
        // const inside = this.containsRect(evt);

        // this.isHovered = inside;
        this.updateHover(evt);
        this.invalidate();   // ← redessine le composant


    return this.hovered;
}
// ============================================================
// TRIGGER DE CHANGEMENT D'ÉTAT (pour UI_RULES)
// ============================================================
triggerChange(newState) {

    // Log optionnel
    console.log(
        "%c[TRIGGER] " + this.constructor.name +
        " state=" + newState,
        "color:#ff8800; font-weight:bold;"
    );

    // Dispatch vers UIInteractionManager
    if (window.UIManager &&
        typeof UIManager.onComponentChange === "function") {
        UIManager.onComponentChange(this, newState);
    }
}



    // ------------------------------------------------------------
    // GÉOMÉTRIE / HIT
    // ------------------------------------------------------------
    // containsRect(evt) {
    //     const x = evt.x;
    //     const y = evt.y;
    //     return x >= this.x && x <= this.x + this.w &&
    //            y >= this.y && y <= this.y + this.h;
    // }

    moveToAbsolute(nx, ny) {
        this.x = nx;
        this.y = ny;
        this.invalidate?.();
    }

    // ------------------------------------------------------------
    // SOURIS
    // ------------------------------------------------------------
    mousePressed(evt) {
        if (!this.containsRect(evt)) return false;

        this.isPressed = true;
        this.dragging  = false;

        this.pressX = evt.x;
        this.pressY = evt.y;

        this.dragOffsetX = evt.x - this.x;
        this.dragOffsetY = evt.y - this.y;

        return true; // capturé
    }

    mouseDragged(evt) {
        if (!this.isPressed) return false;
        if (!evt.altKey) return false; // pas de drag sans ALT

        const dx = evt.x - this.pressX;
        const dy = evt.y - this.pressY;
        const dist2 = dx * dx + dy * dy;

        const DRAG_THRESHOLD = 10;

        // tant qu'on n'a pas dépassé le seuil → pas un drag
        if (!this.dragging) {
            if (dist2 < DRAG_THRESHOLD * DRAG_THRESHOLD) {
                return false; // on laisse la possibilité au clic
            }

            // on dépasse le seuil → drag actif
            this.dragging = true;

            // si pas draggable → on ne consomme pas l'event
            if (!this.isDraggable) {
                return false;
            }
        }

        // drag actif et autorisé
        if (this.isDraggable) {
            const nx = evt.x - this.dragOffsetX;
            const ny = evt.y - this.dragOffsetY;
            this.moveToAbsolute(nx, ny);
            return true;
        }

        return false;
    }

    mouseReleased(evt) {
        const wasDragging = this.dragging;

        this.isPressed = false;
        this.dragging  = false;

        // pas de drag + relâché dedans → clic
        if (!wasDragging && this.containsRect(evt)) {
            this.onClick?.();
            return true;    // consommé
        }

        // si drag → on considère que le drag consomme l'event
        return wasDragging;
    }


}
