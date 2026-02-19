class NoteGroup {
    constructor({
        name = "",
        label = "",
        type = "custom",   // "scale", "chord", "custom"
        root = null,       // { fret, string } ou noteIndex
        notes = [],        // [{ fret, string }]
        aspect = {}
    } = {}) {

        this.name  = name;   // identifiant interne
        this.label = label;  // affichage UI

        this.type  = type;   // "scale", "chord", "custom"
        this.root  = root;   // optionnel

        this.notes = notes;  // liste des notes du groupe

        // Style visuel
        this.aspect = {
            shape: aspect.shape ?? "circle",
            strokeColor: aspect.strokeColor ?? "#ffffff",
            fillColor: aspect.fillColor ?? "#ff0000",
            opacity: aspect.opacity ?? 1.0,
            size: aspect.size ?? 1.0,
            colorisable: aspect.colorisable ?? true
        };
    }

    // ------------------------------------------------------------
    // MÉTHODES DE BASE
    // ------------------------------------------------------------

    addNote(fret, string) {
        if (!this.hasNote(fret, string)) {
            this.notes.push({ fret, string });
        }
    }

    removeNote(fret, string) {
        this.notes = this.notes.filter(n => !(n.fret === fret && n.string === string));
    }

    toggleNote(fret, string) {
        if (this.hasNote(fret, string)) {
            this.removeNote(fret, string);
        } else {
            this.addNote(fret, string);
        }
    }

    hasNote(fret, string) {
        return this.notes.some(n => n.fret === fret && n.string === string);
    }

    clear() {
        this.notes = [];
    }

    // ------------------------------------------------------------
    // TRANSFORMATION
    // ------------------------------------------------------------

    transposeFrets(delta) {
        this.notes = this.notes.map(n => ({
            fret: n.fret + delta,
            string: n.string
        }));
    }

    transposeStrings(delta, maxString = 6) {
        this.notes = this.notes.map(n => ({
            fret: n.fret,
            string: ((n.string - 1 + delta + maxString) % maxString) + 1
        }));
    }

    // ------------------------------------------------------------
    // STYLE
    // ------------------------------------------------------------

    setAspect(aspect = {}) {
        Object.assign(this.aspect, aspect);
    }
}
