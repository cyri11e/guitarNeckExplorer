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







];
