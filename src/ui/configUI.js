const UI_CONFIG = {

    aspectPanel: {
        type: "panel",
        xp: 15,
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
            "metalSwitchENFR"
        ]
    },

// PANEL HARMONIE
harmonyPanel: {
    type: "panel",
    xp: 15,
    yp: 75,
    sp: 20,
    aspectRatio: 1.2,
    visible: true,
    isDraggable: true,
    isZoomable: true,
    toggleOnClick: true,

    children: [
        "knobChordType",
        "switchDeg1",
        "switchDeg2",
        "switchDeg3",
        "switchDeg4",
        "switchDeg5",
        "switchDeg6",
        "switchDeg7"
    ]
},



// --- KNOB 2 : Type d’accord ---
knobChordType: {
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
    shortcutKey: "g"
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
    bottomLabel: "m"
},

switchDeg3: {
    type: "switch",
    xp: 50,
    yp: 60,
    sp: 100,
    aspectRatio: 0.40,
    title: "3",
    topLabel: "M",
    bottomLabel: "m"
},

switchDeg4: {
    type: "switch",
    xp: 50,
    yp: 70,
    sp: 100,
    aspectRatio: 0.40,
    title: "4",
    topLabel: "P",
    bottomLabel: "a"
},

switchDeg5: {
    type: "switch",
    xp: 50,
    yp: 80,
    sp: 100,
    aspectRatio: 0.40,
    title: "5",
    topLabel: "P",
    bottomLabel: "d"
},

switchDeg6: {
    type: "switch",
    xp: 50,
    yp: 90,
    sp: 100,
    aspectRatio: 0.40,
    title: "6",
    topLabel: "M",
    bottomLabel: "m"
},

switchDeg7: {
    type: "switch",
    xp: 50,
    yp: 100,
    sp: 100,
    aspectRatio: 0.40,
    title: "7",
    topLabel: "M",
    bottomLabel: "m"
},


metalSwitch1: {
    type: "metalSwitch",
    sp: 100,     // % de la hauteur du panel
    topLabel: "♯",
    bottomLabel: "♭",
    shortcutKey: "b"
},

metalSwitchENFR: {
    type: "metalSwitch",
    sp: 100,     // % de la hauteur du panel
    topLabel: "FR",
    bottomLabel: "EN",
    shortcutKey: "f"
},

    panel2: {
        type: "panel",
        xp: 60,
        yp: 55,
        sp: 40,
        aspectRatio: 1.2,
        visible: true,
        debug: false,
        isDraggable: true,
        isZoomable: true,
        toggleOnClick: true,
        toggleShortcut: "w",
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
    woodColor: "mapple",
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
    shortcutKey: 'c'
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
    shortcutKey: 'd'
},


cof1 : { 
    type: "cof",
    xp: 50,
    yp: 50,
    sp: 100
},



markerSelector1: {
    type: "markerSelector",
    xp: 50,
    yp: 50,
    sp: 100,
    shortcutKey: "k"   // optionnel
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
