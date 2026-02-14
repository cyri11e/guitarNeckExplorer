const UI_CONFIG = {

    aspectPanel: {
        type: "panel",
        xp: 25,
        yp: 25,
        sp: 20,
        aspectRatio: 1.5,
        visible: true,
        debug: true,
        isDraggable: true,
        isZoomable: true,
        toggleOnClick: true,
        //toggleShortcut: "v",
        children: ["knob1",
            "metalSwitch1",
            "knob2"]
    },


metalSwitch1: {
    type: "metalSwitch",
    sp: 100,     // % de la hauteur du panel
    topLabel: "♯",
    bottomLabel: "♭",
    shortcutKey: "b"
},



    panel2: {
        type: "panel",
        xp: 60,
        yp: 25,
        sp: 40,
        aspectRatio: 1.2,
        visible: true,
        debug: true,
        isDraggable: true,
        isZoomable: true,
        toggleOnClick: true,
        toggleShortcut: "w"
    },

guitar1: {
    type: "guitar",
    xp: 10,
    yp: 10,
    sp: 20,
    aspectRatio: 8,
    debug: true,
    isDraggable: true,
    isZoomable: true,
    fretCount: 22,
    inlayStyle: 'dot',
    woodColor: "maple",
    orientation: "horizontal",
    toggleOrientationShortcut: "o"   // NEW
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
