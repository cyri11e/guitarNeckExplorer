class App {
    constructor() {
        this.ui = new UIInteractionManager();

        // Panel unique (ta structure d’origine)
        this.panel = new Panel(25, 25, 50, 1.5, {
            isDraggable: true,
            isZoomable: true
        });

        // ⭐ lien App <-> UIComponent pour invalidate()
        this.panel.app = this;

        // Responsive initial
        this.panel.updateResponsive();
        this.ui.register(this.panel);

        // Cycle de rendu
        this.needsRedraw = true;

        // Debug / profiling
        this.debug = true;
        this.redrawCount = 0;
        this.lastFPS = 0;
        this._lastTime = millis();
        this._frameCounter = 0;
    }

    update() {
        // Ta structure d’origine : on ne fait quelque chose
        // que si needsRedraw est vrai
        if (!this.needsRedraw) return;

        this.needsRedraw = false;
        this.redrawCount++;   // ⭐ un redraw logique de plus
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
        fill(255);
        textSize(20);
        text('test', 20, 20);

        this.panel.draw();

        if (this.debug) {
            this.drawDebugHUD();
        }

        // ⭐ FIN DU REDRAW
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

    resize() {
        // Ta logique d’origine
        this.panel.updateResponsive();
        this.invalidate();
    }

    invalidate() {
        this.needsRedraw = true;
    }

    // ============================================================
    // EVENTS délégués à UIInteractionManager (inchangés)
    // ============================================================

    mousePressed(x, y)  { this.ui.mousePressed(x, y); }
    mouseReleased(x, y) { this.ui.mouseReleased(x, y); }
    mouseMoved(x, y)    { this.ui.mouseMoved(x, y); }
    mouseDragged(x, y)  { this.ui.mouseDragged(x, y); }
    mouseWheel(e)       { return this.ui.mouseWheel(e); }
    mouseClicked(x, y)  { this.ui.mouseClicked(x, y); }
    keyPressed(k, kc)   { this.ui.keyPressed(k, kc); }
    keyReleased(k, kc)  { this.ui.keyReleased(k, kc); }
}
