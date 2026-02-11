const UI_CONFIG = {

    panel: {
        type: "panel",
        xp: 25,
        yp: 25,
        sp: 50,
        aspectRatio: 1.5,
        visible: true,
        debug: true,
        isDraggable: true,
        isZoomable: true,
        toggleOnClick: true,
        toggleShortcut: "v"
    },

    panel1: {
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
    woodColor: "maple",
    orientation: "horizontal",
    toggleOrientationShortcut: "o"   // NEW
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
