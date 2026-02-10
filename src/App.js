class App {
    constructor() {
        //  Ton moteur UI physique + logique fusionné
        this.ui = new UIInteractionManager();

        //  Création du panel
        this.panel = new Panel(UI_CONFIG.panel);
        this.panel2 = new Panel(UI_CONFIG.panel2);

        //  Déclaration des raccourcis
        this.panel.shortcutKey = UI_CONFIG.panel.toggleShortcut;
        this.panel2.shortcutKey = UI_CONFIG.panel2.toggleShortcut;

        //  Enregistrement
        this.ui.register(this.panel);
        this.ui.register(this.panel2);

        //  Lien App → composants
        this.panel.app = this;
        this.panel2.app = this;

        //  Responsive initial
        this.panel.updateResponsive();
        this.panel2.updateResponsive();

        //  Cycle de rendu
        this.needsRedraw = true;

        // Debug
        this.debug = true;
        this.redrawCount = 0;
        this.lastFPS = 0;
        this._lastTime = millis();
        this._frameCounter = 0;
    }

    // ============================================================
    // RENDERING
    // ============================================================

    update() {
        if (!this.needsRedraw) return;
        this.needsRedraw = false;
        this.redrawCount++;
    }

display() {
    // FPS
    this._frameCounter++;
    const now = millis();
    if (now - this._lastTime > 500) {
        this.lastFPS = (this._frameCounter * 1000) / (now - this._lastTime);
        this._frameCounter = 0;
        this._lastTime = now;
    }

    background(60);

    //  TON TEXTE "test" REMIS ICI 
    push();
    fill(255);
    textSize(20);
    text("test", 50, 50);
    pop();

    //  Dessin du panel
    this.panel.draw();
    this.panel2.draw();

    if (this.debug) this.drawDebugHUD();

    this.needsRedraw = false;
}


    drawDebugHUD() {
        push();
        fill(255, 200, 0);
        textSize(14);
        text(
            `redraw: ${this.redrawCount}   fps: ${this.lastFPS.toFixed(1)}`,
            20,
            height - 20
        );
        pop();
    }

    // ============================================================
    // RESPONSIVE
    // ============================================================

    resize() {
        this.panel.updateResponsive();
        this.invalidate();
    }

    invalidate() {
        this.needsRedraw = true;
    }

    // ============================================================
    // EVENTS → UIInteractionManager
    // ============================================================

    mousePressed(x, y)  { this.ui.mousePressed(x, y); }
    mouseReleased(x, y) { this.ui.mouseReleased(x, y); }
    mouseMoved(x, y)    { this.ui.mouseMoved(x, y); }
    mouseDragged(x, y)  { this.ui.mouseDragged(x, y); }
    mouseWheel(e)       { return this.ui.mouseWheel(e); }

    mouseClicked(x, y)  { 
        this.ui.mouseClicked(x, y);
        this.invalidate();
    }

    keyPressed(k, kc) {
        //  shortcuts logiques
        this.ui.handleShortcut(k, kc);

        //  shortcuts physiques (si un composant les gère)
        this.ui.keyPressed(k, kc);

        this.invalidate();
    }

    keyReleased(k, kc) {
        this.ui.keyReleased(k, kc);
    }
}
