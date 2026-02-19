let app;

function setup() {
    createCanvas(windowWidth, windowHeight);

    app = new App();
}

function draw() {
   // clear(); // ou background(0)

    if (app.needsRedraw) {
        app.update();
        app.display();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    app.resize();
    redraw();
}

// ============================================================
// ROUTAGE DES ÉVÉNEMENTS P5 → APP → UIInteractionManager
// ============================================================

function mousePressed()  { app.mousePressed(mouseX, mouseY); }
function mouseReleased() { app.mouseReleased(mouseX, mouseY); }
function mouseMoved()    { app.mouseMoved(mouseX, mouseY); }
function mouseDragged()  { app.mouseDragged(mouseX, mouseY); }

function mouseWheel(e) {
    if (app.mouseWheel(e)) return false;
    return false;
}

//function mouseClicked()  { app.mouseClicked(mouseX, mouseY); }

function keyPressed()    { app.keyPressed(key, keyCode); }
function keyReleased()   { app.keyReleased(key, keyCode); }
