const UI_CONFIG = {

    aspectPanel: {
        type: "panel",
        xp: 15,
        yp: 55,
        sp: 20,
        aspectRatio: 1.5,
        visible: true,
        debug: true,
        isDraggable: true,
        isZoomable: true,
        toggleOnClick: true,
        //toggleShortcut: "v",
        children: ["knob1",
            "knob2",
            "metalSwitch1",
            "metalSwitchENFR"
        ]
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
        debug: true,
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
    debug: true,
    isDraggable: true,
    isZoomable: true,
    fretCount: 22,
    inlayStyle: 'dot',
    woodColor: "maple",
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
            debug: true,
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
            debug: true,
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
}


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
