// --- CONFIG DES MODES ---
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
const TRIAD_PATTERNS = {
  0: [1, 1, 1],   // Majeur : 1, 3, 5
  1: [1, 2, 1],   // Mineur : 1, b3, 5
  2: [1, 2, 2],   // Diminuée : 1, b3, b5
  3: [1, 1, 3],   // Augmentée : 1, 3, #5
  // etat 3 pour #5
};
const TETRADE_PATTERNS = {
  0: [1, 1, 1, 1],   // Maj7
  1: [1, 1, 1, 2],   // 7
  2: [1, 2, 1, 2],   // m7
  3: [1, 2, 2, 2],   // m7b5
  4: [1, 2, 2, 4],   // dim7  etat 4 bb5 n existe pas
  5: [1, 2, 1, 1],   // mMaj7
};

const PENTATONIC_PATTERNS = {
  0: [1, 1, 1, 1,1],   // Majeure     = 1 2 3 5 6  (pas de 7)
  1: [1, 2, 1,1, 2],   // Mineure     = 1 b3 4 5 b7
};

const PENTA_DEGREES = {
  0: [1, 2, 3, 5, 6],   // Majeure
  1: [1, 3, 4, 5, 7],   // Mineure
};
const DIATONIC_PATTERNS = {
    //        1  2  3  4  5  6  7
    0: [1, 1, 1, 1, 1, 1], // Ionien      : 1 2 3 4 5 6 b7
    1: [1, 2, 1, 1, 2, 1], // Dorien      : 1 2 b3 4 5 b6 7
    2: [2, 2, 1, 1, 2, 2], // Phrygien    : 1 b2 b3 4 5 b6 b7
    3: [1, 1, 2, 1, 1, 1], // Lydien      : 1 2 3 #4 5 6 b7
    4: [1, 1, 1, 1, 1, 2], // Mixolydien  : 1 2 3 4 5 b6 7
    5: [1, 2, 1, 1, 2, 2], // Éolien      : 1 b2 3 4 5 b6 b7
    6: [2, 2, 1, 2, 2, 2], // Locrien     : 1 b2 b3 4 b5 b6 b7
};


// --- CONFIG DES SWITCHES ---
const SWITCH_CONFIG = [
  { title: "1", top: "",  bottom: "" },
  { title: "2", top: "M", bottom: "m" },
  { title: "3", top: "M", bottom: "m" },
  { title: "4", top: "P", bottom: "a" },
  { title: "5", top: "P", bottom: "d" },
  { title: "6", top: "M", bottom: "m" },
  { title: "7", top: "M", bottom: "m" }
];

// --- CONFIG DES KNOBS ---
const KNOB1_OPTIONS = {
  hideBottom: true,
  items: [
    { symbol: "C", label: "Curseur" },
    { symbol: "N", label: "Notes" },
    { symbol: "T", label: "Octaves" },
  ],
  shortcutKey: 'c'
};

const KNOB2_OPTIONS = {
  hideBottom: true,
  items: [
    { symbol: "1", label: "Unique" },
    { symbol: "3", label: "Triade" },
    { symbol: "4", label: "Tetrade" },
    { symbol: "5", label: "Pentatonique" },
    { symbol: "7", label: "Diatonique" },
  ],
  shortcutKey: 'g'
};

// --- CONFIG DU LCD ---
const LCD_OPTIONS = {
  items: ["Majeur", "Mineur", "Diminué", "Augmenté"],
  shortcutKey: 'm'
};

const METALSWITCH_CONFIG = {
    title: "♯ / ♭",
    topLabel: "♯",
    bottomLabel: "♭",
    shortcutKey: "b"
};

// ------------------------------------------------------------
// --- CONFIG DES RÈGLES UI (déclaratif, lisible, factorisé) ---
// ------------------------------------------------------------
const UI_RULES = [

  // RÈGLE 1 :
  // Quand un composant passe ON → le premier switch passe à 1
  (components, source, newState) => {

    if (newState !== 0) {
      let firstSwitch = components.find(c => c instanceof Switch);
      if (firstSwitch) firstSwitch.state = 1;
    }
  },

// RÈGLE 2 :
// Si un seul switch est ON → il devient OFF
(components, source, newState) => {

    // On ne s'intéresse qu'aux switches
    const switches = components.filter(c => c instanceof Switch);

    // Liste des switches ON
    const onSwitches = switches.filter(sw => sw.state !== 0);

    // Si exactement 1 switch est ON
    if (onSwitches.length === 1) {
        const lone = onSwitches[0];

        // On ne réécrit que si nécessaire (évite les boucles)
        if (lone.state !== 0) {
            lone.state = 0;
        }
    }
},
  // RÈGLE 3: exclusion 4#/5♭ basée uniquement sur les états 0/1/2
(components, source, newState) => {

    // On récupère les deux switches concernés
    const sw4 = components.find(c => c.title === "4");
    const sw5 = components.find(c => c.title === "5");

    if (!sw4 || !sw5) return;

    // Cas 1 : 4 est en état 1 ET 5 est en état 2 → on corrige 5
    if (sw4.state === 2 && sw5.state === 2) {
        if (sw5.state !== 0) sw5.state = 0;
        return;
    }

    // Cas 2 : 5 est en état 2 ET 4 est en état 1 → on corrige 4
    if (sw5.state === 2 && sw4.state === 2) {
        if (sw4.state !== 0) sw4.state = 0;
        return;
    }
},

// RÈGLE 4: quand le 2e Knob arrive sur "Unique" (index 0) → éteindre tous les switches
(components, source, newState) => {

    // On récupère le 2e knob
    const knobs = components.filter(c => c instanceof Knob);
    const knob2 = knobs[1]; // index 1 = 2e knob
// console.log('source '+source)
    if (!knob2) return;

    // On ne déclenche que si la source est ce knob-là
    if (source !== knob2) return;

    // "arrive sur unique" = newState === 0 ET ancien état ≠ 0
    if (newState !== 0) return;
    if (source._previousState === 0) return; // il y était déjà

    // On éteint tous les switches
    const switches = components.filter(c => c instanceof Switch);
    for (const sw of switches) {
        if (sw.state !== 0) sw.state = 0;
    }
},
 // RÈGLE 5: Mode "3" (Triade) → activer 1, 3, 5 selon le LCD
(components, source, newState) => {


    const knobs = components.filter(c => c instanceof Knob);
    const knob2 = knobs[1];
    if (!knob2) return;

    const lcd = components.find(c => c instanceof LCDSelector);
    if (!lcd) return;

    // 1. On ne déclenche que si la source est Knob2 OU le LCD
    const isKnob2 = source === knob2;
    const isLCD   = source === lcd;
    if (!isKnob2 && !isLCD) return;

    // 2. On ne travaille que si Knob2 est en mode Triade (index 1)
    if (knob2.state !== 1) return;

    // 3. On lit toujours l’état courant du LCD
    const mode = lcd.state;
    const pattern = TRIAD_PATTERNS[mode];
    if (!pattern) return;

    const sw1 = components.find(c => c instanceof Switch && c.title === "1");
    const sw3 = components.find(c => c instanceof Switch && c.title === "3");
    const sw5 = components.find(c => c instanceof Switch && c.title === "5");
    if (!sw1 || !sw3 || !sw5) return;

    sw1.state = pattern[0];
    sw3.state = pattern[1];
    sw5.state = pattern[2];
},

  // RÈGLE 6 : Knob2 contrôle l’allumage et le mode du LCD
(components, source, newState) => {
    const knobs = components.filter(c => c instanceof Knob);
    const knob2 = knobs[1];
    if (!knob2) return;

    // On ne déclenche que si la source est Knob2
    if (source !== knob2) return;

    const lcd = components.find(c => c instanceof LCDSelector);
    if (!lcd) return;

    // Cas 1 : Unique → LCD OFF
    if (newState === 0) {
        lcd.setOnOff(false);
        lcd.setMode(0, []);
        return;
    }

    // Cas 2 : autre mode → LCD ON + items
    lcd.setOnOff(true);
    lcd.setMode(newState, MODE_OPTIONS[newState]);
},
  
  
// RÈGLE TRIADES : Knob2 = 1 ou changement LCD
(components, source, newState) => {


    const knobs = components.filter(c => c instanceof Knob);
    const knob2 = knobs[1];
    if (!knob2) return;

    const lcd = components.find(c => c instanceof LCDSelector);
    if (!lcd) return;
console.log(
  "PENTA DEBUG → source:", source?.constructor?.name,
  "| knob2.state:", knob2?.state,
  "| lcd.state:", lcd?.state
);

    // Déclenchement : Knob2 OU LCD
    const isKnob2 = source === knob2;
    const isLCD   = source === lcd;
    if (!isKnob2 && !isLCD) return;

    // On ne travaille que si Knob2 est sur TRIADES
    if (knob2.state !== 2) return;

    const mode = lcd.state;
    const pattern = TRIAD_PATTERNS[mode];
    if (!pattern) return;

    // Switches
    const sw1 = components.find(c => c instanceof Switch && c.title === "1");
    const sw3 = components.find(c => c instanceof Switch && c.title === "3");
    const sw5 = components.find(c => c instanceof Switch && c.title === "5");

    const all = components.filter(c => c instanceof Switch);
    all.forEach(sw => sw.state = 0); // RAZ

    sw1.state = pattern[0];
    sw3.state = pattern[1];
    sw5.state = pattern[2];
},
  
// RÈGLE TETRADE : Knob2 = 2 ou changement LCD
(components, source, newState) => {

    const knobs = components.filter(c => c instanceof Knob);
    const knob2 = knobs[1];
    if (!knob2) return;

    const lcd = components.find(c => c instanceof LCDSelector);
    if (!lcd) return;

    // Déclenchement : Knob2 OU LCD
    const isKnob2 = source === knob2;
    const isLCD   = source === lcd;
    if (!isKnob2 && !isLCD) return;

    // On ne travaille que si Knob2 est sur TETRADE
    if (knob2.state !== 2) return;

    const mode = lcd.state;
    const pattern = TETRADE_PATTERNS[mode];
    if (!pattern) return;

    // Switches
    const sw1 = components.find(c => c instanceof Switch && c.title === "1");
    const sw3 = components.find(c => c instanceof Switch && c.title === "3");
    const sw5 = components.find(c => c instanceof Switch && c.title === "5");
    const sw7 = components.find(c => c instanceof Switch && c.title === "7");

    const all = components.filter(c => c instanceof Switch);
    all.forEach(sw => sw.state = 0); // RAZ

    sw1.state = pattern[0];
    sw3.state = pattern[1];
    sw5.state = pattern[2];
    sw7.state = pattern[3];
},
  
// RÈGLE PENTA : Knob2 = 3 ou changement LCD
// RÈGLE PENTA :
// - Knob2 arrive sur PENTA (state devient 3)
// - OU Knob2 est déjà sur PENTA et le LCD change
(components, source, newState) => {

    const knobs = components.filter(c => c instanceof Knob);
    const knob2 = knobs[1];
    if (!knob2) return;

    const lcd = components.find(c => c instanceof LCDSelector);
    if (!lcd) return;

    // --- CONDITION ROBUSTE ----------------------------------------------------
    // 1) Si Knob2 vient d'être tourné
    const isKnob2 = source === knob2;

    // 2) Si LCD change
    const isLCD = source === lcd;

    // 3) Condition robuste :
    //    - Knob2 = 3 (PENTA)
    //    - ET (Knob2 tourné OU LCD changé)
    if (knob2.state !== 3) return;     // ← Penta seulement si knob2=3
    if (!isKnob2 && !isLCD) return;    // ← déclenchement par knob2 ou LCD

    // -------------------------------------------------------------------------

    const mode = lcd.state; // 0 = Maj, 1 = Min
    const pattern = PENTATONIC_PATTERNS[mode];
    if (!pattern) return;

    // Switches
    const sw1 = components.find(c => c instanceof Switch && c.title === "1");
    const sw2 = components.find(c => c instanceof Switch && c.title === "2");
    const sw3 = components.find(c => c instanceof Switch && c.title === "3");
    const sw4 = components.find(c => c instanceof Switch && c.title === "4");
    const sw5 = components.find(c => c instanceof Switch && c.title === "5");
    const sw6 = components.find(c => c instanceof Switch && c.title === "6");
    const sw7 = components.find(c => c instanceof Switch && c.title === "7");

    const all = components.filter(c => c instanceof Switch);

    // --- NORMALISATION DES ÉTATS SPÉCIAUX ------------------------------------
    all.forEach(sw => {
        if (sw.state > 2) sw.state = 2;   // ← remet les états spéciaux à "bas normal"
    });

    // --- RAZ ------------------------------------------------------------------
    all.forEach(sw => sw.state = 0);

    // --- APPLICATION DU PATTERN ----------------------------------------------
    if (mode === 0) {
        // PENTA MAJEURE → 1 2 3 5 6
        sw1.state = pattern[0];
        sw2.state = pattern[1];
        sw3.state = pattern[2];
        sw5.state = pattern[3];
        sw6.state = pattern[4];
    } else {
        // PENTA MINEURE → 1 3 4 5 7
        sw1.state = pattern[0];
        sw3.state = pattern[1];
        sw4.state = pattern[2];
        sw5.state = pattern[3];
        sw7.state = pattern[4];
    }
},
  // RÈGLE DIATONIQUE :
// - Knob2 arrive sur DIATONIQUE (state devient 4)
// - OU Knob2 est déjà sur DIATONIQUE et le LCD change
(components, source, newState) => {

    const knobs = components.filter(c => c instanceof Knob);
    const knob2 = knobs[1];
    if (!knob2) return;

    const lcd = components.find(c => c instanceof LCDSelector);
    if (!lcd) return;

    // --- CONDITION ROBUSTE ----------------------------------------------------
    // Si knob2 est sur DIATONIQUE → règle active
    // Si LCD change ET knob2 est sur DIATONIQUE → règle active
    if (knob2.state !== 4) return;
    if (source !== knob2 && source !== lcd) return;

    // -------------------------------------------------------------------------

    const mode = lcd.state; // 0..6 = I..VII
    const pattern = DIATONIC_PATTERNS[mode];
    if (!pattern) return;

    const all = components.filter(c => c instanceof Switch);

    // NORMALISATION : effacer états spéciaux (3,4)
    all.forEach(sw => {
        if (sw.state > 2) sw.state = 2;
    });

    // RAZ
    all.forEach(sw => sw.state = 0);

    // APPLICATION DU PATTERN
    const sw1 = all.find(sw => sw.title === "2");
    const sw2 = all.find(sw => sw.title === "3");
    const sw3 = all.find(sw => sw.title === "4");
    const sw4 = all.find(sw => sw.title === "5");
    const sw5 = all.find(sw => sw.title === "6");
    const sw6 = all.find(sw => sw.title === "7");


    sw1.state = pattern[0];
    sw2.state = pattern[1];
    sw3.state = pattern[2];
    sw4.state = pattern[3];
    sw5.state = pattern[4];
    sw6.state = pattern[5];

}



];

