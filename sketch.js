let app;

window.addEventListener("keydown", (e) => {
    if (e.key === "Alt") {
        e.preventDefault();
    }
}, { passive: false });

window.addEventListener("keydown", (e) => {
    if (e.key === "Alt") {
        document.body.style.cursor = "move";
    }
}, { passive: false });

window.addEventListener("keyup", (e) => {
    if (e.key === "Alt") {
        document.body.style.cursor = "default";
    }
});


function setup() {
    createCanvas(windowWidth, windowHeight);

    app = new App();
}

function draw() {
    app.update();          // tourne à chaque frame
    if (app.needsRedraw) {
        app.display();     // ne dessine que si nécessaire
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
