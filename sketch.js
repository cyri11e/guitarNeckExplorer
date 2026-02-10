let app;

function setup() {
    createCanvas(windowWidth, windowHeight);
    app = new App();
}

function draw() {
    if (app.needsRedraw) {
        app.update();
        app.display();
    }
}


function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    app.resize();
}

// ROUTAGE DES ÉVÉNEMENTS P5 → APP → UIInteractionManager

function mousePressed()  { app.mousePressed(mouseX, mouseY); }
function mouseReleased() { app.mouseReleased(mouseX, mouseY); }
function mouseMoved()    { app.mouseMoved(mouseX, mouseY); }
function mouseDragged()  { app.mouseDragged(mouseX, mouseY); }

function mouseWheel(e) {
    // ⭐ EXACTEMENT comme ton ancien sketch :
    // si un composant consomme → on bloque le comportement navigateur
    if (app.mouseWheel(e)) {
        return false;
    }

    // ⭐ même si rien ne consomme, tu avais "return false" dans ton ancien sketch
    // ce qui empêche le navigateur de zoomer/scroll
    return false;
}

function mouseClicked()  { app.mouseClicked(mouseX, mouseY); }

function keyPressed() {
    UIManager.handleShortcut(key, keyCode);
    app.invalidate();
}

function keyReleased()   { app.keyReleased(key, keyCode); }
