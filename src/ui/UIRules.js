// ui_rules.js
const UI_RULES = [

    // RÈGLE : MetalSwitch (♯/♭) synchronise avec guitar.flatMode
    // state = 0 (bas) → ♭ → guitar.flatMode = true
    // state = 1 (haut) → ♯ → guitar.flatMode = false
    (components, source, newState) => {

        // On cible un MetalSwitch précis par son nom
        const metalSwitch = components.find(c => c.name === "metalSwitch1");
        if (!metalSwitch) return;

        // On ne réagit que si c’est LUI qui a changé
        if (source !== metalSwitch) return;

        // On récupère la guitare
        const guitar = components.find(c => c.name === "guitar1");
        if (!guitar) return;

        // Application de la règle
        guitar.theory.useFlats = (newState === 0);

    },

    // KNOB2 → change displayMode
    (components, source, newState) => {
        if (source.name !== "knob2") return;

        const guitar = components.find(c => c.name === "guitar1");
        if (!guitar) return;

        if (newState === 0) guitar.setDisplayMode("note"); // N
        if (newState === 1) guitar.setDisplayMode("degree"); // D
        if (newState === 2) guitar.setDisplayMode("none");   // P
    },


// ============================================================
// METALSWITCH EN/FR → displayMode
// ============================================================
// METALSWITCH EN/FR → langue
(components, source, newState) => {

    const sw = components.find(c => c.name === "metalSwitchENFR");
    if (source !== sw) return;

    const guitar = components.find(c => c.name === "guitar1");
    const cof    = components.find(c => c.name === "cof1");
    if (!guitar || !cof) return;

    const labelType = (newState === 0) ? "noteEN" : "noteFR";

    // 🎸 guitare : on change la langue, PAS displayMode
    guitar.setLabelType(labelType);
    guitar.invalidate();

    cof.setLabelType(labelType);
    cof.invalidate();
},


// ============================================================
// COF → GUITAR : priorité au hover, click = root persistante
// ============================================================
(components, source, newState) => {

    const cof    = components.find(c => c.name === "cof1");
    const guitar = components.find(c => c.name === "guitar1");
    if (!cof || !guitar) return;

    // On ne réagit qu’aux changements venant du COF
    if (source !== cof) return;

    const hover = cof.hoverIndex;   // priorité
    const root  = cof.rootIndex;    // fallback

    let activeIndex = null;

    if (hover !== -1 && hover !== null) {
        activeIndex = hover;        // priorité absolue
    } else if (root !== null) {
        activeIndex = root;         // fallback
    }

    if (activeIndex === null) {
        guitar.theory.root = null;
        guitar.invalidate();
        return;
    }

    const noteIndex = cof.chroma[activeIndex];
    guitar.theory.root = noteIndex;
    guitar.invalidate();
},
// KNOB1 → hoverMode
(components, source, newState) => {
    if (source.name !== "knob1") return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    if (newState === 0) guitar.hoverMode = "cursor"; // C
    if (newState === 1) guitar.hoverMode = "note";   // N
    if (newState === 2) guitar.hoverMode = "octave"; // T

    guitar.invalidate();
},

// ============================================================
// COF (clic root) → GUITAR : animation highlight des roots
// ============================================================
(components, source, evt) => {

    const cof    = components.find(c => c.name === "cof1");
    const guitar = components.find(c => c.name === "guitar1");
    if (!cof || !guitar) return;

    // On ne réagit qu’aux événements venant du COF
    if (source !== cof) return;

    if (!evt) return;

    // --- 1) CLIC SEGMENT : choix root ---
    if (evt.type === "root") {

        // root désélectionnée → rien
        if (evt.index === null) return;

        const noteIndex = cof.chroma[evt.index];

        // highlight automatique
        guitar.highlightNote(noteIndex);
        return;
    }

    // --- 2) CLIC CENTRAL : highlight ONLY ---
    if (evt.type === "highlight") {

        const noteIndex = evt.pc;   // pc envoyé par le COF
        guitar.highlightNote(noteIndex);
        return;
    }
},


// ============================================================
// GUITAR (CTRL + clic) → définir une nouvelle root
// ============================================================
(components, source, evt) => {

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    // On ne réagit qu’aux événements venant du Guitar
    if (source !== guitar) return;

    // On ne traite que les événements onChange()
    if (!evt || evt.type !== "noteClick") return;

    // CTRL doit être enfoncé
    if (!evt.ctrlKey) return;

    const { fret, string } = evt;

    const raw = guitar.instrument.getNoteAt(string - 1, fret);
    if (!raw) return;

    guitar.theory.setRoot(raw.index);

// notifier les autres composants (comme COF)
guitar.onChange?.({
    type: "root",
    index: raw.index
});

guitar.invalidate();

},

// ============================================================
// Quand Guitar change la root → COF doit se mettre à jour
// ============================================================
(components, source, evt) => {

    if (!evt || evt.type !== "root") return;

    const guitar = components.find(c => c.name === "guitar1");
    const cof = components.find(c => c.name === "cof1");

    if (!guitar || !cof) return;

    // Si la root vient de la guitare
    if (source === guitar) {
        cof.rootIndex = evt.index;
        cof.invalidate();
    }
},
// ============================================================
// MARKER SELECTOR → GUITAR
// ============================================================
(components, source, evt) => {

    // 1) Trouver le MarkerSelector
    const marker = components.find(c => c.name === "markerSelector1");
    if (!marker) return;

    // 2) On ne réagit que si c’est LUI la source
    if (source !== marker) return;

    // 3) Trouver la guitare
    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    console.log("[RULE:MARKER] Reçu :", evt);

    // 4) Toggle ON/OFF
    if (evt.type === "markerToggle") {
        guitar.markerMode = (evt.state === 1);
        guitar.markerPendingPoint = null;

        console.log("[MARKER] Mode =", guitar.markerMode ? "ON" : "OFF");

        guitar.invalidate();
        return;
    }

    // 5) Changement de couleur
    if (evt.type === "markerColor") {
        guitar.markerColor = marker.noteColors[evt.index];

        console.log("[MARKER] Nouvelle couleur =", guitar.markerColor);

        guitar.invalidate();
        return;
    }
},


// RÈGLE : switchDeg1 ↔ autres switchesDeg
(components, source, newState) => {

    // On ne s'intéresse qu'aux switchesDeg
    if (!source.name.startsWith("switchDeg")) return;

    // Récupérer tous les switchesDeg
    const switches = components.filter(c => c.name.startsWith("switchDeg"));
    const root     = switches.find(c => c.name === "switchDeg1");
    if (!root) return;

    // --- CAS 1 : un switch (2–7) est activé → root ON ---
    if (source !== root && newState !== 0) {
        if (root.state === 0) {
            root.setState(1);
        }
        return;
    }

    // --- CAS 2 : tous les switches (2–7) sont OFF → root OFF ---
    if (source !== root && newState === 0) {

        // Vérifier si tous les autres sont OFF
        const othersOn = switches.some(sw =>
            sw !== root && sw.state !== 0
        );

        if (!othersOn && root.state !== 0) {
            root.setState(0);
        }

        return;
    }

    // --- CAS 3 : root OFF → tout le monde OFF ---
    if (source === root && newState === 0) {
        for (const sw of switches) {
            if (sw !== root && sw.state !== 0) {
                sw.setState(0);
            }
        }
        return;
    }
},

(components, source, newState) => {

    if (!source.name.startsWith("switchDeg")) return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    const MAJOR = {
        1: 0,
        2: 2,
        3: 4,
        4: 5,
        5: 7,
        6: 9,
        7: 11
    };

    const ALTER = {
        1: { 1: 0, 2: 0 },
        2: { 1: 0, 2: -1 },
        3: { 1: 0, 2: -1 },
        4: { 1: 0, 2: +1 },
        5: { 1: 0, 2: -1, 3: +1 },
        6: { 1: 0, 2: -1 },
        7: { 1: 0, 2: -1, 4: -2 }
    };

    const intervals = [];

    for (let i = 1; i <= 7; i++) {

        const sw = components.find(c => c.name === "switchDeg" + i);
        if (!sw) continue;

        const state = sw.state;
        if (state === 0) continue; // OFF

        const degree = parseInt(sw.name.replace("switchDeg", ""));


        let interval = MAJOR[degree];

        const adj = ALTER[degree][state];
        if (adj != null) interval += adj;

        intervals.push(interval);
    }
    guitar.intervals = intervals;
    
    guitar.multiNotes = intervals.length > 0; 
    guitar.resolveMultiNotes();
    guitar.invalidate();
},


// ============================================================
// KNOB MULTI CURSOR → avance au prochain mode multinote
// ============================================================
(components, source, newState) => {

    if (source.name !== "knobMultiCursor") return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    guitar.setNextIntervalMode();
},

// ============================================================
// METALSWITCH WOOD → change la couleur du bois de la guitare
// ============================================================
(components, source, newState) => {

    const sw = components.find(c => c.name === "metalWood");
    if (source !== sw) return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    // 0 = rosewood, 1 = mapple
    const wood = (newState === 0) ? "rosewood" : "mapple";

    guitar.setWoodColor(wood);
},
// ============================================================
// METALSWITCH INLAY → change le style des repères (inlays)
// ============================================================
(components, source, newState) => {

    const sw = components.find(c => c.name === "knobInlays");
    if (source !== sw) return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    // 0 = dots
    // 1 = superStrat
    // 2 = trapeze
    const map = ["dots", "superstrat", "trapeze"];

    const style = map[newState] || "dots";

    guitar.setInlayStyle(style);
},

// ============================================================
// METAL WAY → met à jour le sens intervalWay (up/down)
// ============================================================
(components, source, newState) => {

    if (source.name !== "metalWay") return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    // newState = 1 → up (↗)
    // newState = 0 → down (↙)
    guitar.intervalWay = newState === 1 ? "up" : "down";
},

// RÈGLE : knob13457 → presets automatiques des switchDeg
(components, source, newState) => {

    if (source.name !== "knob13457") return;

    const switches = components.filter(c => c.name.startsWith("switchDeg"));
    const lcd = components.find(c => c.name === "lcd1");

    const set = (deg, state) => {
        const sw = switches.find(s => s.name === "switchDeg" + deg);
        if (sw && sw.state !== state) sw.setState(state);
    };

    // 1) Tout OFF d'abord
    for (let i = 1; i <= 7; i++) set(i, 0);

    // 2) Appliquer le preset selon l'INDEX du knob
    switch (newState) {

        case 0: // "1" / Unique
            // Éteindre le LCD aussi
            if (lcd) {
                lcd.setOnOff(false);
                lcd.setItems([]);
                lcd.setIndex(0);
            }
            break;

        case 1: // Triade
            set(3, 1);
            set(5, 1);
            break;

        case 2: // Tetrade
            set(3, 1);
            set(5, 1);
            set(7, 1);
            break;

        case 3: // Pentatonique
            set(2, 1);
            set(3, 1);
            set(5, 1);
            set(6, 1);
            break;

        case 4: // Diatonique
            set(2, 1);
            set(3, 1);
            set(4, 1);
            set(5, 1);
            set(6, 1);
            set(7, 1);
            break;
    }
},


// KNOB OCTAVES → met à jour g.octaveShown
(components, source, newState) => {

    const knob = components.find(c => c.name === "knobOctaves");
    if (source !== knob) return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    // Récupère l’item sélectionné : "1", "2", "3", "T"
    const item = knob.items[newState];
    if (!item) return;

    // Mise à jour directe dans guitar.js
    guitar.octaveShown = item.symbol; // "1", "2", "3", "T"

    guitar.invalidate();
},

// KNOB INVERSIONS → met à jour g.inversion
(components, source, newState) => {

    const knob = components.find(c => c.name === "knobInversions");
    if (source !== knob) return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    // newState = 0 → "R"
    // newState = 1 → "1st Inv"
    // newState = 2 → "2nd Inv"
    // newState = 3 → "3rd Inv"
    guitar.inversion = newState; // 0,1,2,3

    guitar.invalidate();
},

// ============================================================
// KNOB MULTI CURSOR → presets automatiques
// ============================================================
(components, source, newState) => {

    if (source.name !== "knobMultiCursor") return;

    const guitar   = components.find(c => c.name === "guitar1");
    const knobDeg  = components.find(c => c.name === "knob13457");
    const knobOct  = components.find(c => c.name === "knobOctaves");
    const metalWay = components.find(c => c.name === "metalWay");

    const swCAGED = components.find(c => c.name === "metalCAGED");
    if (swCAGED) swCAGED.setState(1); // ACTIVE CAGED


    if (!guitar || !knobDeg || !knobOct || !metalWay) return;

    // --- ACCORD (index 1) ---
    if (newState === 1) {
        knobDeg.state = 1;  // Triade
        knobOct.state = 1;  // 2 octaves
        guitar.invalidate();
        return;
    }

    // --- BOX (index 2 ou 3) ---
    // if (newState === 2 || newState === 3) {
    //     knobDeg.state = 3;  // Pentatonique
    //     knobOct.state = 2;  // 2 octaves
    //     metalWay.state = 1; // ascendant
    //     guitar.invalidate();
    //     return;
    // }

    // --- 3NPS (4) ou DIAGONAL (5) ---
    if (newState === 4 || newState === 5) {
        knobDeg.state = 4;  // Diatonique
        knobOct.state = 1;  // 2 octaves
        metalWay.state = 1; // ascendant
        if (swCAGED) swCAGED.setState(0);
        guitar.invalidate();
        return;
    }
},

// ============================================================
// METALSWITCH CAGED → active/désactive le mode CAGED Overlay
// ============================================================
(components, source, newState) => {

    const sw = components.find(c => c.name === "metalCAGED");
    if (source !== sw) return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    // newState = 1 → ON (topLabel)
    // newState = 0 → OFF (bottomLabel)
    guitar.cagedOV = (newState === 1);

    guitar.invalidate();
},

// KNOB13457 → configure LCD1 selon le mode
(components, source, newState) => {

    if (source.name !== "knob13457") return;

    const lcd = components.find(c => c.name === "lcd1");
    if (!lcd) return;

    // RESET LCD
    lcd.setOnOff(true);

    switch (newState) {

        case 0: // Unique
            lcd.setOnOff(false);
            lcd.setItems([]);
            lcd.setIndex(0);
            return;

        case 1: // Triade
            lcd.setItems(["Majeur", "Mineur", "Diminué", "Augmenté"]);
            lcd.setIndex(0);
            return;

        case 2: // Tétrade
            lcd.setItems(["Maj7", "7(dom)", "m7", "m7b5", "dim7", "mMaj7"]);
            lcd.setIndex(0);
            return;

        case 3: // Pentatonique
            lcd.setItems(["Maj Penta", "Min Penta"]);
            lcd.setIndex(0);
            return;

        case 4: // Diatonique
            lcd.setItems([
                "Ionien",
                "Dorien",
                "Phrygien",
                "Lydien",
                "Mixolydien",
                "Eolien",
                "Locrien"
            ]);
            lcd.setIndex(0);
            return;
    }
},
// LCD1 → met à jour les switchDeg selon l’item sélectionné
(components, source, newState) => {

    if (source.name !== "lcd1") return;

    const knobDeg = components.find(c => c.name === "knob13457");
    if (!knobDeg) return;

    const lcd = source;

    // Récupération des switches
    const sw2 = components.find(c => c.name === "switchDeg2");
    const sw3 = components.find(c => c.name === "switchDeg3");
    const sw4 = components.find(c => c.name === "switchDeg4");
    const sw5 = components.find(c => c.name === "switchDeg5");
    const sw6 = components.find(c => c.name === "switchDeg6");
    const sw7 = components.find(c => c.name === "switchDeg7");

    // RESET propre
    const reset = () => {
        sw2?.setState(0);
        sw3?.setState(0);
        sw4?.setState(0);
        sw5?.setState(0);
        sw6?.setState(0);
        sw7?.setState(0);
    };

    const value = lcd.items[newState];

    // ------------------------------------------------------------
    // TRIADES
    // ------------------------------------------------------------
    if (knobDeg.state === 1) {
        reset();

        if (value === "Majeur") {
            sw3.setState(1);
            sw5.setState(1);
        }
        if (value === "Mineur") {
            sw3.setState(2);
            sw5.setState(1);
        }
        if (value === "Diminué") {
            sw3.setState(2);
            sw5.setState(2);
        }
        if (value === "Augmenté") {
            sw3.setState(1);
            sw5.setState(3);
        }
        return;
    }

    // ------------------------------------------------------------
    // TÉTRADES
    // ------------------------------------------------------------
    if (knobDeg.state === 2) {
        reset();

        if (value === "Maj7") {
            sw3.setState(1);
            sw5.setState(1);
            sw7.setState(1);
        }
        if (value === "7(dom)") {
            sw3.setState(1);
            sw5.setState(1);
            sw7.setState(2);
        }
        if (value === "m7") {
            sw3.setState(2);
            sw5.setState(1);
            sw7.setState(2);
        }
        if (value === "m7b5") {
            sw3.setState(2);
            sw5.setState(2);
            sw7.setState(2);
        }
        if (value === "dim7") {
            sw3.setState(2);
            sw5.setState(2);
            sw7.setState(4);
        }
        if (value === "mMaj7") {
            sw3.setState(2);
            sw5.setState(1);
            sw7.setState(1);
        }
        return;
    }

    // ------------------------------------------------------------
    // PENTATONIQUES
    // ------------------------------------------------------------
    if (knobDeg.state === 3) {
        reset();

        if (value === "Maj Penta") {
            sw2.setState(1);
            sw3.setState(1);
            sw5.setState(1);
            sw6.setState(1);
        }
        if (value === "Min Penta") {
            sw3.setState(2);
            sw4.setState(1);
            sw5.setState(1);
            sw7.setState(2);
        }
        return;
    }

    // ------------------------------------------------------------
    // DIATONIQUE
    // ------------------------------------------------------------
    if (knobDeg.state === 4) {
        reset();

        if (value === "Ionien") {
            sw2.setState(1);
            sw3.setState(1);
            sw4.setState(1);
            sw5.setState(1);
            sw6.setState(1);
            sw7.setState(1);
        }
        if (value === "Dorien") {
            sw2.setState(1);
            sw3.setState(2);
            sw4.setState(1);
            sw5.setState(1);
            sw6.setState(1);
            sw7.setState(2);
        }
        if (value === "Phrygien") {
            sw2.setState(2);
            sw3.setState(2);
            sw4.setState(1);
            sw5.setState(1);
            sw6.setState(2);
            sw7.setState(2);
        }
        if (value === "Lydien") {
            sw2.setState(1);
            sw3.setState(1);
            sw4.setState(3);
            sw5.setState(1);
            sw6.setState(1);
            sw7.setState(1);
        }
        if (value === "Mixolydien") {
            sw2.setState(1);
            sw3.setState(1);
            sw4.setState(1);
            sw5.setState(1);
            sw6.setState(1);
            sw7.setState(2);
        }
        if (value === "Eolien") {
            sw2.setState(1);
            sw3.setState(2);
            sw4.setState(1);
            sw5.setState(1);
            sw6.setState(2);
            sw7.setState(2);
        }
        if (value === "Locrien") {
            sw2.setState(2);
            sw3.setState(2);
            sw4.setState(1);
            sw5.setState(2);
            sw6.setState(2);
            sw7.setState(2);
        }
        return;
    }
},




//   snapshot sauvegarde
(components, source, newState) => {

    if (source.name !== "snapshotBtn") return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    // -----------------------------------------
    // 0) Vérifier si on doit créer un snapshot
    // -----------------------------------------
    const hasPinned   = guitar.pinnedNotes.length > 0;
    const hasSelected = guitar.selectedNotes.length > 0;
    const hasRoot     = guitar.theory.hasRoot();
    const hasMarkers  = guitar.markerSegments.length > 0;

    if (!hasPinned && !hasSelected && !hasRoot && !hasMarkers) {
        console.log("Snapshot ignoré : rien à sauvegarder.");
        return;
    }

    // -----------------------------------------
    // 1) Construire le titre
    // -----------------------------------------
    const index = guitar.snapshots.length + 1;
    let title = `${index}`;

    // priorité : dernière pinned → dernière selected → root
    let mainLabel = null;

    const getLabel = (n) => {
        const note = guitar.instrument.getNoteAt(n.string - 1, n.fret);
        if (!note) return null;
        const lbl = guitar.theory.getNoteLabel(note.index, guitar.displayMode);
        return lbl.base + lbl.alt;
    };

    if (hasPinned) {
        mainLabel = getLabel(guitar.pinnedNotes[guitar.pinnedNotes.length - 1]);
    }
    if (!mainLabel && hasSelected) {
        mainLabel = getLabel(guitar.selectedNotes[guitar.selectedNotes.length - 1]);
    }
    if (!mainLabel && hasRoot) {
        const lbl = guitar.theory.getNoteLabel(guitar.theory.root, guitar.displayMode);
        mainLabel = lbl.base + lbl.alt;
    }

    if (mainLabel) title += `-${mainLabel}`;

    // LCD1 : uniquement si actif
    const lcd1 = components.find(c => c.name === "lcd1");
    if (lcd1 && lcd1.isOn && lcd1.items && lcd1.items.length > 0) {
        const lcdItem = lcd1.items[lcd1.state];
        if (lcdItem) title += `-${lcdItem}`;
    }
    else if (!mainLabel && hasMarkers) {
        // aucun label, lcd1 inactif → markers → "marked"
        title += ` - marked`;
    }

    // -----------------------------------------
    // 2) Création du snapshot
    // -----------------------------------------
    const snap = {
        title,
        pinnedNotes: [...guitar.pinnedNotes],
        selectedNotes: [...guitar.selectedNotes],
        root: hasRoot ? guitar.theory.root : null,
        markerSegments: [...guitar.markerSegments]
    };

    guitar.snapshots.push(snap);

    // -----------------------------------------
    // 3) Sync LCD2
    // -----------------------------------------
    const lcd2 = components.find(c => c.name === "lcd2");
    if (lcd2) {
        lcd2.items = guitar.snapshots.map(s => s.title);
        lcd2.isOn = true;
        lcd2.state = lcd2.items.length - 1;
        lcd2.invalidate();
    }

    console.log("Snapshot ajouté :", snap.title);
},


// -------------------------------------------------------------
// NAVIGATION TRREC
// -------------------------------------------------------------
// (components, source, evt) => {

//     if (source.name !== "trRecPads") return;

//     const guitar = components.find(c => c.name === "guitar1");
//     const trRec  = source;
//     if (!guitar) return;

//     // Séquence vide → afficher OFF
//     if (guitar.sequence.length === 0) {
//         trRec.states = [
//             { etat:0, item:null },
//             { etat:0, item:null },
//             { etat:0, item:null },
//             { etat:0, item:null }
//         ];
//         trRec.measureIndex = 0;
//         trRec.invalidate();
//         return;
//     }

//     if (evt.type === "prev")
//         guitar.currentMeasure = Math.max(0, guitar.currentMeasure - 1);

//     if (evt.type === "next")
//         guitar.currentMeasure = Math.min(guitar.sequence.length - 1, guitar.currentMeasure + 1);

//     const measure = guitar.sequence[guitar.currentMeasure];

//     trRec.states = measure;
//     trRec.measureIndex = guitar.currentMeasure;
//     trRec.invalidate();
// },


// -------------------------------------------------------------
// AJOUT D’UNE MESURE (+)
// -------------------------------------------------------------
// (components, source, evt) => {

//     if (source.name !== "trRecPads") return;
//     if (evt.type !== "add") return;

//     const guitar = components.find(c => c.name === "guitar1");
//     const trRec  = source;
//     if (!guitar) return;

//     const empty = [
//         { etat:0, item:null },
//         { etat:0, item:null },
//         { etat:0, item:null },
//         { etat:0, item:null }
//     ];

//     // Séquence vide
//     if (guitar.sequence.length === 0) {
//         guitar.sequence.push(empty);
//         guitar.currentMeasure = 0;

//         trRec.states = empty;
//         trRec.measureIndex = 0;
//         trRec.invalidate();
//         return;
//     }

//     // Insertion après la mesure courante
//     const cur = guitar.currentMeasure;
//     guitar.sequence.splice(cur + 1, 0, empty);
//     guitar.currentMeasure = cur + 1;

//     trRec.states = empty;
//     trRec.measureIndex = guitar.currentMeasure;
//     trRec.invalidate();
// },


// // -------------------------------------------------------------
// // ASSIGN ITEM ↔ PAD
// // -------------------------------------------------------------
// (components, source, evt) => {

//     if (source.name !== "trRecPads") return;
//     if (evt.type !== "assign") return;

//     const guitar = components.find(c => c.name === "guitar1");
//     const lcd2   = components.find(c => c.name === "lcd2");
//     const trRec  = source;

//     if (!guitar || !lcd2) return;

//     const measure = guitar.sequence[guitar.currentMeasure];
//     const step = measure[evt.index];

//     // Affectation item
//     step.item = lcd2.state;

//     // Affectation durée (ON)
//     step.etat = trRec.initDur;

//     // Mise à jour TRRec
//     trRec.states = measure;
//     trRec.invalidate();
// },


// // -------------------------------------------------------------
// // SNAPSHOT → CRÉATION D’UNE MESURE TRREC
// // -------------------------------------------------------------
// (components, source, newState) => {

//     if (source.name !== "snapshotBtn") return;

//     const guitar = components.find(c => c.name === "guitar1");
//     if (!guitar) return;

//     // Vérification snapshot
//     const hasPinned   = guitar.pinnedNotes.length > 0;
//     const hasSelected = guitar.selectedNotes.length > 0;
//     const hasRoot     = guitar.theory.hasRoot();
//     const hasMarkers  = guitar.markerSegments.length > 0;

//     if (!hasPinned && !hasSelected && !hasRoot && !hasMarkers) return;

//     // Construction du titre
//     let index = guitar.snapshots.length + 1;
//     let title = `${index}`;

//     let mainLabel = null;

//     const getLabel = (n) => {
//         const note = guitar.instrument.getNoteAt(n.string - 1, n.fret);
//         if (!note) return null;
//         const lbl = guitar.theory.getNoteLabel(note.index, guitar.displayMode);
//         return lbl.base + lbl.alt;
//     };

//     if (hasPinned)
//         mainLabel = getLabel(guitar.pinnedNotes.at(-1));

//     if (!mainLabel && hasSelected)
//         mainLabel = getLabel(guitar.selectedNotes.at(-1));

//     if (!mainLabel && hasRoot) {
//         const lbl = guitar.theory.getNoteLabel(guitar.theory.root, guitar.displayMode);
//         mainLabel = lbl.base + lbl.alt;
//     }

//     if (mainLabel) title += `-${mainLabel}`;

//     const lcd1 = components.find(c => c.name === "lcd1");
//     if (lcd1 && lcd1.isOn && lcd1.items?.length > 0) {
//         const lcdItem = lcd1.items[lcd1.state];
//         if (lcdItem) title += `-${lcdItem}`;
//     }

//     // Création snapshot
//     const snap = {
//         title,
//         pinnedNotes: [...guitar.pinnedNotes],
//         selectedNotes: [...guitar.selectedNotes],
//         root: hasRoot ? guitar.theory.root : null,
//         markerSegments: [...guitar.markerSegments],
//     };

//     guitar.snapshots.push(snap);

//     // Création mesure TRRec
//     const trRec = components.find(c => c.name === "trRecPads");
//     if (trRec) {

//         const itemIndex = guitar.snapshots.length - 1;
//         const dur = trRec.initDur;

//         const measure = [
//             { item: itemIndex, etat: dur },
//             { item: null, etat: 0 },
//             { item: null, etat: 0 },
//             { item: null, etat: 0 }
//         ];

//         guitar.sequence.push(measure);

//         const mIndex = guitar.sequence.length - 1;
//         guitar.currentMeasure = mIndex;

//         trRec.measureIndex = mIndex;
//         trRec.states = measure;
//         trRec.invalidate();
//     }

//     // Sync LCD2
//     const lcd2 = components.find(c => c.name === "lcd2");
//     if (lcd2) {
//         lcd2.items = guitar.snapshots.map(s => s.title);
//         lcd2.isOn = true;
//         lcd2.state = lcd2.items.length - 1;
//         lcd2.invalidate();
//     }
// }

(components, source, evt) => {

    if (source.name !== "trRecPads") return;
    if (evt.type !== "request-add") return;

    const lcd2 = components.find(c => c.name === "lcd2");
    if (!lcd2) return;

    // LCD vide → pas d’ajout possible
    if (!lcd2.items || lcd2.items.length === 0) return;

    const itemIndex = lcd2.state;
    const itemObj   = lcd2.items[itemIndex];

    if (!itemObj) return;

    const index = evt.index;

    // Ajout externe : état = 1 + objet complet du LCD
    source.states[index] = {
        etat: 1,
        item: itemObj,      // l’objet complet
        itemIndex: itemIndex
    };

    source.invalidate();

    source.onChange?.({
        type: "add",
        index,
        etat: 1,
        item: itemObj,
        itemIndex
    });
},

(components, source, evt) => {

    // On ne réagit qu’au BPMControl
    if (source.name !== "bpmCtrl") return;
    if (!evt || evt.type !== "tick") return;

    // Trouver le TRRecPads
    const tr = components.find(c => c.name === "trRecPads");
    if (!tr) return;

    // Avancer le playhead
    tr.advancePlayhead();
},

// PLAY BUTTON → active/désactive le BPM
(components, source, newState) => {

    const playBtn = components.find(c => c.name === "playBtn");
    if (source !== playBtn) return;

    const bpm = components.find(c => c.name === "bpmCtrl");
    if (!bpm) return;

    bpm.isPlaying = (newState === 1);

    if (bpm.isPlaying) {
        bpm.lastStepTime = millis();
        bpm.ledPhase = 1;
    }

    bpm.invalidate();
}
,

// RESTAURATION D’UN SNAPSHOT (LCD2 → Guitar)
(components, source, newState) => {

    if (source.name !== "lcd2") return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    const snap = guitar.snapshots[newState];
    if (!snap) return;

    // --- ROOT ---
    if (snap.root !== null) {
        guitar.theory.setRoot(snap.root);
    } else {
        guitar.theory.root = null;
    }

    // --- PINNED NOTES ---
    guitar.pinnedNotes = [...snap.pinnedNotes];

    // --- SELECTED NOTES ---
    guitar.selectedNotes = [...snap.selectedNotes];

    // --- MARKERS ---
    guitar.markerSegments = [...snap.markerSegments];

    guitar.invalidate();

    console.log("Snapshot restauré :", snap.title);
},
// SUPPRESSION D’UN SNAPSHOT (trashBtn)
(components, source, newState) => {

    if (source.name !== "trashBtn") return;

    const guitar = components.find(c => c.name === "guitar1");
    const lcd2   = components.find(c => c.name === "lcd2");

    if (!guitar || !lcd2) return;

    const idx = lcd2.state;

    if (idx < 0 || idx >= guitar.snapshots.length) return;

    // suppression
    guitar.snapshots.splice(idx, 1);

    // mise à jour LCD2
    lcd2.items = guitar.snapshots.map(s => s.title);

    if (lcd2.items.length === 0) {
        lcd2.setOnOff(false);
    } else {
        lcd2.state = Math.min(idx, lcd2.items.length - 1);
    }

    lcd2.invalidate();
    guitar.invalidate();

    console.log("Snapshot supprimé :", idx);
},


// TRREC → GUITAR : restauration snapshot
(components, source, evt) => {

    if (source.name !== "trRecPads") return;
    if (!evt || evt.type !== "padChange") return;

    const guitar = components.find(c => c.name === "guitar1");
    const lcd2   = components.find(c => c.name === "lcd2");
    if (!guitar || !lcd2) return;

    const snapshotIndex = evt.snapshotIndex;
    if (snapshotIndex == null) return;

    const snap = guitar.snapshots[snapshotIndex];
    if (!snap) return;

    // --- RESTAURATION ---
    if (snap.root !== null) guitar.theory.setRoot(snap.root);
    else guitar.theory.root = null;

    guitar.pinnedNotes    = [...snap.pinnedNotes];
    guitar.selectedNotes  = [...snap.selectedNotes];
    guitar.markerSegments = [...snap.markerSegments];

    guitar.invalidate();

    // --- LCD2 ---
    lcd2.state = snapshotIndex;
    lcd2.invalidate();
}







];
