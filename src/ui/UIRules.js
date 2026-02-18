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
// COF → GUITAR : animation highlight des roots sur le manche
// ============================================================
// ============================================================
// COF (clic root) → GUITAR : animation highlight des roots
// ============================================================
(components, source, newState) => {

    const cof    = components.find(c => c.name === "cof1");
    const guitar = components.find(c => c.name === "guitar1");
    if (!cof || !guitar) return;

    // On ne réagit qu’aux changements venant du COF
    if (source !== cof) return;

    //  On ignore totalement le hover
    if (cof.rootIndex === null) return;

    // rootIndex → noteIndex
    const noteIndex = cof.chroma[cof.rootIndex];

    //  déclenche l’animation du manche
    guitar.highlightNote(noteIndex);
    console.log('hilite')
},



];
