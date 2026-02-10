class App {
    constructor() {
        this.ui = new UIInteractionManager();
        this.components = [];

        this.needsRedraw = true;

        // Ajout automatique du panel test
        const panel = new Panel(25, 25, 50, 1.5, {
            isDraggable: true,
            isZoomable: true
        });

        this.add(panel);
    }

    add(component) {
        this.components.push(component);
        this.ui.register(component);
        component.updateResponsive();
        this.invalidate();
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

        for (let c of this.components) {
            c.draw();
        }
    }

    resize() {
        for (let c of this.components) {
            c.updateResponsive();
        }
        this.invalidate();
    }

    invalidate() {
        this.needsRedraw = true;
    }

    // EVENTS délégués
    mousePressed(x, y)  { this.ui.mousePressed(x, y); }
    mouseReleased(x, y) { this.ui.mouseReleased(x, y); }
    mouseMoved(x, y)    { this.ui.mouseMoved(x, y); }
    mouseDragged(x, y)  { this.ui.mouseDragged(x, y); }
    mouseWheel(e)       { return this.ui.mouseWheel(e); }
    mouseClicked(x, y)  { this.ui.mouseClicked(x, y); }
    keyPressed(k, kc)   { this.ui.keyPressed(k, kc); }
    keyReleased(k, kc)  { this.ui.keyReleased(k, kc); }
}
