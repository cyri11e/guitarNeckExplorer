const UI_CONFIG = {

    aspectPanel: {
        type: "panel",
        xp: 5,
        yp: 55,
        sp: 20,
        aspectRatio: 1.5,
        visible: true,
        debug: false,
        isDraggable: true,
        isZoomable: true,
        toggleOnClick: true,
        //toggleShortcut: "v",
        children: ["markerSelector1","knob1",
            "knob2",
            "metalSwitch1",
            "metalSwitchENFR",
            "metalWood",
            "knobInlays",
            "metalCAGED"
        ]
    },

// PANEL HARMONIE
harmonyPanel: {
    type: "panel",
    xp: 5,
    yp: 75,
    sp: 20,
    aspectRatio: 1.2,
    visible: true,
    isDraggable: true,
    isZoomable: true,
    toggleOnClick: true,

    children: [
        "knob13457",
        "lcd1",
        "switchDeg1",
        "switchDeg2",
        "switchDeg3",
        "switchDeg4",
        "switchDeg5",
        "switchDeg6",
        "switchDeg7",

        
    ]
},

// PANEL type de vue curseur
cursorPanel: {
    type: "panel",
    xp: 50,
    yp: 75,
    sp: 20,
    aspectRatio: 1.2,
    visible: true,
    isDraggable: true,
    isZoomable: true,
    toggleOnClick: true,

    children: [
        "knobMultiCursor",
        "metalWay",
        "knobOctaves",
        "knobInversions"        
    ]
},



lcd1: {
    type: "lcdSelector",
    xp: 50,
    yp: 50,
    sp: 100,
    aspectRatio: 1.8,
    items: ["A", "B", "C", "D", "E"],
    isOn: false,
    shortcutKey: "l",
    description: "Sélecteur LCD"
},


// --- KNOB 2 : Type d’accord ---
knob13457: {
    type: "knob",
    xp: 50,
    yp: 25,
    sp: 100,
    hideBottom: true,
    items: [
        { symbol: "1", label: "Unique" },
        { symbol: "3", label: "Triade" },
        { symbol: "4", label: "Tetrade" },
        { symbol: "5", label: "Pentatonique" },
        { symbol: "7", label: "Diatonique" }
    ],
    shortcutKey: "g",
    description: "Preselection de groupe"
},

// --- KNOB 2 : Type d’accord ---
knobMultiCursor: {
    type: "knob",
    xp: 50,
    yp: 25,
    sp: 100,
    hideBottom: true,
    items: [
        { symbol: "1S", label: "1 Corde" },
        { symbol: "C", label: "Accord" },
        { symbol: "B>", label: "Box Droite" },
        { symbol: "<B", label: "Box Gauche" },
        { symbol: "3N", label: "3 Notes/c" },
        { symbol: "/", label: "Diagonal" }
    ],
    shortcutKey: "x",
    debug: true,
    description: "Evolution sur le manche"
},

knobInlays: {
    type: "knob",
    xp: 50,
    yp: 25,
    sp: 100,
    hideBottom: true,
    items: [
        { symbol: "●", label: "Classique" },
        { symbol: "•", label: "S. Strat" },
        { symbol: "▬", label: "Les Paul" },

    ],
    shortcutKey: "p",
    description: "Type de inlays"
},

knobOctaves: {
    type: "knob",
    xp: 50,
    yp: 25,
    sp: 100,
    hideBottom: true,
    items: [
        { symbol: "1", label: "1 Octave" },
        { symbol: "2", label: "2 Octaves" },
        { symbol: "3", label: "3 Octaves" },
        { symbol: "T", label: "Tout" },
    ],
    shortcutKey: "o",
    description: "etendue de la sélection"
},
knobInversions: {
    type: "knob",
    xp: 50,
    yp: 25,
    sp: 100,
    hideBottom: true,
    items: [
        { symbol: "R", label: "Root" },
        { symbol: "1", label: "1st Inv" },
        { symbol: "2", label: "2nd Inv" },
        { symbol: "3", label: "3rd Inv" },
    ],
    shortcutKey: "i"
},


// --- SWITCHES (1 à 7) ---
switchDeg1: {
    type: "switch",
    xp: 50,
    yp: 40,
    sp: 100,
    aspectRatio: 0.3,
    title: "1",
    topLabel: "",
    bottomLabel: ""
},

switchDeg2: {
    type: "switch",
    xp: 50,
    yp: 50,
    sp: 100,
    aspectRatio: 0.4,
    title: "2",
    topLabel: "M",
    bottomLabel: "m",
    shortcutKey: "2",
    description: "Commuter une seconde"

},

switchDeg3: {
    type: "switch",
    xp: 50,
    yp: 60,
    sp: 100,
    aspectRatio: 0.40,
    title: "3",
    topLabel: "M",
    bottomLabel: "m",
    shortcutKey: "3",
    description: "Commuter une tierce"

},

switchDeg4: {
    type: "switch",
    xp: 50,
    yp: 70,
    sp: 100,
    aspectRatio: 0.40,
    title: "4",
    topLabel: "P",
    bottomLabel: "a",
    shortcutKey: "4",
    description: "Commuter une quarte"

},

switchDeg5: {
    type: "switch",
    xp: 50,
    yp: 80,
    sp: 100,
    aspectRatio: 0.40,
    title: "5",
    topLabel: "P",
    bottomLabel: "d",
    shortcutKey: "5",
    description: "Commuter une quinte"
},

switchDeg6: {
    type: "switch",
    xp: 50,
    yp: 90,
    sp: 100,
    aspectRatio: 0.40,
    title: "6",
    topLabel: "M",
    bottomLabel: "m",
    shortcutKey: "6",
    description: "Commuter une sixte"
},

switchDeg7: {
    type: "switch",
    xp: 50,
    yp: 100,
    sp: 100,
    aspectRatio: 0.40,
    title: "7",
    topLabel: "M",
    bottomLabel: "m",
    shortcutKey: "7",
    description: "Commuter une septième"
    
},


metalSwitch1: {
    type: "metalSwitch",
    sp: 100,     // % de la hauteur du panel
    topLabel: "♯",
    bottomLabel: "♭",
    shortcutKey: "b",
    description: "Mode Diese ou Bemol"

},

metalSwitchENFR: {
    type: "metalSwitch",
    sp: 100,     // % de la hauteur du panel
    topLabel: "FR",
    bottomLabel: "EN",
    shortcutKey: "f",
    description: "Langue des Notes"

},

metalWood: {
    type: "metalSwitch",
    sp: 100,     // % de la hauteur du panel
    topLabel: "map",
    bottomLabel: "rose",
    shortcutKey: "w",
    description: "Couleur de la table"

},

metalWay: {
    name: "up",
    type: "metalSwitch",
    sp: 100,     // % de la hauteur du panel
    topLabel: "↗",
    bottomLabel: "↙",
    defaultState: 1,   // ← ON par défaut
    shortcutKey: "u",
    description: "sens de progression"
},

metalCAGED: {
    name: "CAGED",
    type: "metalSwitch",
    sp: 100,     // % de la hauteur du panel
    topLabel: "caged",
    bottomLabel: "off",
    aspectRatio: 1,
    defaultState: 0,   // ← ON par défaut
    shortcutKey: "q",
    description: "box caged"
},
    panel2: {
        type: "panel",
        xp: 80,
        yp: 55,
        sp: 40,
        aspectRatio: 1.2,
        visible: true,
        debug: false,
        isDraggable: true,
        isZoomable: true,
        toggleOnClick: true,
        //toggleShortcut: "w",
        children: ["cof1"]
    },

guitar1: {
    type: "guitar",
    xp: 5,
    yp: 5,
    sp: 40,
    aspectRatio: 8,
    debug: false,
    isDraggable: true,
    isZoomable: true,
    fretCount: 22,
    inlayStyle: 'dots',
    woodColor: "rosewood",
    orientation: "horizontal",
    toggleOrientationShortcut: "o" ,  // NEW
    displayMode: "note"

},


knob1: {
    type: "knob",
    xp: 50,
    yp: 50,
    sp: 100,
    hideBottom: true,
    debug: false,
    isDraggable: true,
    isZoomable: true,
    items: [
        { symbol: "C", label: "Curseur" },
        { symbol: "N", label: "Notes" },
        { symbol: "T", label: "Octaves" },
    ],
    shortcutKey: 'c',
    description: "Mode de curseur"

},

knob2: {
    type: "knob",
    xp: 50,
    yp: 50,
    sp: 100,
    hideBottom: true,
    debug: false,
    isDraggable: true,
    isZoomable: true,
    items: [
        { symbol: "N", label: "Note" },
        { symbol: "D", label: "Degré" },
        { symbol: "P", label: "Pastille" },
    ],
    shortcutKey: 'd',
    description: "Type d'affichage des notes"
},


cof1 : { 
    type: "cof",
    xp: 50,
    yp: 50,
    sp: 100,
    description: "Cycle des quintes"
},



markerSelector1: {
    type: "markerSelector",
    xp: 50,
    yp: 50,
    sp: 100,
    shortcutKey: "m" ,  // optionnel
    description: "Mode Marker, Dessinez sur le manche"
},

snapshotPanel: {
    type: "panel",
    xp: 50,
    yp: 55,
    sp: 20,
    aspectRatio: 1,
    children: ["snapshotBtn","lcd2","playBtn","loopBtn","trashBtn","bpmCtrl"]
},

snapshotBtn: {
    type: "snapshotButton",
    xp: 0,
    yp: 0,
    sp: 100,
    shortcutKey: "s",
    description: "Capture snapshot"
},
trashBtn: {
    type: "snapshotButton",
    xp: 0,
    yp: 0,
    sp: 50,
    label: '🗑️',
    description: "delete snapshot"
},
playBtn: {
    type: "snapshotButton",
    xp: 0,
    yp: 0,
    sp: 50,
    label:'▶',
    led: true,
    shortcutKey: "p",
    description: "play snapshot"
},
loopBtn: {
    type: "snapshotButton",
    xp: 0,
    yp: 0,
    sp: 50,
    label:'↺',
    shortcutKey: "l",
    led: true,
    description: "play snapshot"
},

lcd2: {
    type: "lcdSelector",
    xp: 0,
    yp: 0,
    sp: 100,
    aspectRatio: 1.8,
    items: [],
    isOn: false,
    shortcutKey: "",
    description: "liste Snapshots"
},
bpmCtrl: {
    type: "bpmCtrl",
    xp: 0,
    yp: 0,
    anchorUnder: "playBtn",
    sp: 50,
    value: 80,
    aspectRatio: 3.2,
    min: 20,
    max: 300,
    stayOnX : true,
    // onChange: (bpm) => {
        //     // à jour ton moteur ici ?
        // }
    },

trRecPanel: {
        type: "panel",
        xp: 5,
        yp: 35,
        sp: 20,
        aspectRatio: 1,
        children: ["trRecPads"]
    },

trRecPads: {
    type: "trRecPads",
    xp: 0,
    yp: 150,
    sp: 80,
    padCount: 16,      // nombre de pads
   //  aspectRatio: padCount / 4,   // dynamique
    description: "TR-REC Pads",
    shortcutKey: "T"
},


    // // Exemple futur : un knob
    // Knob_freq: {
    //     type: "knob",
    //     xp: 10,
    //     yp: 10,
    //     sp: 5,
    //     min: 20,
    //     max: 20000,
    //     value: 440
    // },

    // // Exemple futur : un switch
    // Switch_power: {
    //     type: "switch",
    //     xp: 5,
    //     yp: 5,
    //     sp: 5,
    //     value: false
    // }
};
