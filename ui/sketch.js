let panel, panel2;
let knob1, knob2;
let lcd;
let uiRules;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // --- GESTIONNAIRE DE RÈGLES ---
  uiRules = new UIInteractionManager();

  // --- PANEL ---
  panel = new Panel(10, 10, 20, {
    isDraggable: true,
    isZoomable: true,
  });
  panel.debug = false;



  // 👉 NOUVEAU PANEL
  panel2 = new Panel(10, 40, 20, {
    isDraggable: true,
    isZoomable: true,
  });
  panel2.debug = false;

  // --- KNOBS ---
  knob1 = new Knob(0, 0, 100, KNOB1_OPTIONS);
  knob2 = new Knob(0, 0, 100, KNOB2_OPTIONS);

  knob1.debug = false;
  knob2.debug = false;

  // --- LCD ---
  lcd = new LCDSelector(0, 0, 100, LCD_OPTIONS);
  lcd.debug = false;
  lcd.setOnOff(false);
  lcd.setItems([]);

  panel.add(knob1);
  panel.add(knob2);
  panel.add(lcd);

  // --- SWITCHES ---
  SWITCH_CONFIG.forEach((c) => {
    let sw = new Switch(0, 0, 0, {
      title: c.title,
      topLabel: c.top,
      bottomLabel: c.bottom,
      color: "#aa0000",
      shortcutKey: c.title,
      ratio: 0.35,
      debug: false,
    });
    panel.add(sw);
  });

  // --- Metal Switch : # / ♭ ---
  // --- Metal Switch : # / ♭ ---
  const metalSharpFlat = new MetalSwitch(
    0,
    0,
    100, // xp, yp, sp (comme tes autres composants)
    METALSWITCH_CONFIG
  );

  window.metalSharpFlat = metalSharpFlat;

  panel2.add(metalSharpFlat);

  const marker = new MarkerSelector(0, 0, 100, {
    title: "C",
    shortcutKey: "p",
  });

  panel2.add(marker);

  panel.updateResponsive();
  panel2.updateResponsive();
  // --- REGISTER PANEL (tous les composants automatiquement) ---
  uiRules.register(panel);
  uiRules.register(panel2);

  // --- CHARGER LES RÈGLES DEPUIS LE FICHIER CONFIG ---
  UI_RULES.forEach((rule) => uiRules.addRule(rule));
}

function draw() {
  background(230);

  panel.updateResponsive();
  panel.updateHover(mouseX, mouseY);
  panel.draw();
  panel2.updateResponsive();
  panel2.updateHover(mouseX, mouseY);
  panel2.draw();
}

function mousePressed() {
  panel.mousePressed(mouseX, mouseY);
  panel2.mousePressed(mouseX, mouseY);
}

function mouseDragged() {
  panel.mouseDragged(mouseX, mouseY);
  panel2.mouseDragged(mouseX, mouseY);
}
function mouseReleased() {
  panel.mouseReleased(mouseX, mouseY);
  panel2.mouseReleased(mouseX, mouseY);
}
function mouseWheel(e) {
  panel.mouseWheel(e);
  panel2.mouseWheel(e);
}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  panel.updateResponsive();
  panel2.updateResponsive();
}
function keyPressed() {
  UIManager.handleShortcut(key, keyCode);
}
