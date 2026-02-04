let panel;
let knob1, knob2;
let lcd;
let dummyBox;
const MODE_OPTIONS = {
  1: ["Majeur", "Mineur", "Diminué", "Augmenté"],
  2: ["Maj7", "7", "m7", "m7b5", "dim7", "mMaj7"],
  3: ["Majeure", "Mineure"],
  4: [
    "Ionien",
    "Dorien",
    "Phrygien",
    "Lydien",
    "Mixolydien",
    "Eolien",
    "Locrien",
  ],
};

function setup() {
  createCanvas(windowWidth, windowHeight);

  panel = new Panel(10, 10, 20, {
    isDraggable: true,
    isZoomable: true,
  });
  panel.debug = false;

  knob1 = new Knob(0, 0, 100, {
    hideBottom: true,
    items: [
      { symbol: "C", label: "Curseur" },
      { symbol: "N", label: "Notes" },
      { symbol: "T", label: "Octaves" },
    ],
    shortcutKey: 'c'
  });

  knob2 = new Knob(0, 0, 100, {
    hideBottom: true,
    items: [
      { symbol: "1", label: "Unique" },
      { symbol: "3", label: "Triade" },
      { symbol: "4", label: "Tetrade" },
      { symbol: "5", label: "Pentatonique" },
      { symbol: "7", label: "Diatonique" },
    ],
    shortcutKey: 'g'
  });

  lcd = new LCDSelector(0, 0, 100, {
      items: ["Majeur", "Mineur", "Diminué", "Augmenté"],
      shortcutKey: 'm'   // touche M active ce LCD
  });

  lcd.debug = true;

  // OFF par défaut
  lcd.setOnOff(false);
  lcd.setItems([]);

  knob1.debug = true;
  knob2.debug = true;

  panel.add(knob1);
  panel.add(knob2);
  panel.add(lcd);


dummyBox = new PinkBox(0, 0, 100, { ratio: 1 });
// sp = 80% de la hauteur du panel
// ratio = 1.5 → rectangle horizontal

panel.add(dummyBox);

  panel.updateResponsive();
}

function draw() {
  background(230);
  // --- LIAISON LCD ↔ POTARD 13457 ---
  let modeIndex = knob2.index; // knob2 = ton potard 13457

  if (modeIndex === 0) {
    lcd.setOnOff(false);
    lcd.setMode(0,[]);
  } else {
    lcd.setOnOff(true);
    lcd.setMode(modeIndex, MODE_OPTIONS[modeIndex]);

  }

  panel.updateResponsive();
  panel.updateHover(mouseX, mouseY);
  panel.draw();
}

function mousePressed() {
  panel.mousePressed(mouseX, mouseY);
}

function mouseDragged() {
  panel.mouseDragged(mouseX, mouseY);
}

function mouseReleased() {
  panel.mouseReleased(mouseX, mouseY);
}


function mouseWheel(e) {
  panel.mouseWheel(e);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  panel.updateResponsive();
}
function keyPressed() {
  UIManager.handleShortcut(key, keyCode);
}
