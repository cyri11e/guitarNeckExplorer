class App {
    constructor() {
        this.ui = new UIInteractionManager();

        this.panel = new Panel(25, 25, 50, {
            isDraggable: true,
            isZoomable: true
        });

        this.panel.updateResponsive();
        this.ui.register(this.panel);

        this.needsRedraw = true;
    }

    update() {
        if (!this.needsRedraw) return;
        this.needsRedraw = false;
    }

    display() {
        background(60);
        fill(255);
        textSize(20);
        text('test', 20, 20);

        this.panel.draw();
    }

    // resize() {
    //     this.panel.hasBeenPositioned = false;
    //     this.panel.updateResponsive();
    //     this.invalidate();
    // }
    resize() {
    // NE RIEN TOUCHER si l’utilisateur a déjà déplacé/zoomé
    this.panel.updateResponsive(); // safe car updateResponsive respecte hasBeenPositioned
}


    invalidate() {
        this.needsRedraw = true;
    }

    mousePressed(x, y)  { this.ui.mousePressed(x, y); }
    mouseReleased(x, y) { this.ui.mouseReleased(x, y); }
    mouseMoved(x, y)    { this.ui.mouseMoved(x, y); }
    mouseDragged(x, y)  { this.ui.mouseDragged(x, y); }
    mouseWheel(e)       { return this.ui.mouseWheel(e); }
    mouseClicked(x, y)  { this.ui.mouseClicked(x, y); }
    keyPressed(k, kc)   { this.ui.keyPressed(k, kc); }
    keyReleased(k, kc)  { this.ui.keyReleased(k, kc); }
}
