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

        console.log(
            "%c[METALSWITCH SYNC] flatMode=" + guitar.theory.useFlats +
            " (state=" + newState + ")",
            "color:#00ff00; font-weight:bold;"
        );
    }

    // Tu pourras ajouter d’autres règles ici…
];
