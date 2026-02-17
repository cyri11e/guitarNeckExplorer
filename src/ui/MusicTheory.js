// ============================================================
// MUSIC THEORY — Module autonome complet
// ============================================================

// ------------------------------------------------------------
// BASE DE DONNÉES DES NOTES (chromatique 0..11)
// ------------------------------------------------------------

const NOTES = [
    { index: 0,  sharp: "C",  flat: "C",  midi: 60 },
    { index: 1,  sharp: "C#", flat: "Db", midi: 61 },
    { index: 2,  sharp: "D",  flat: "D",  midi: 62 },
    { index: 3,  sharp: "D#", flat: "Eb", midi: 63 },
    { index: 4,  sharp: "E",  flat: "E",  midi: 64 },
    { index: 5,  sharp: "F",  flat: "F",  midi: 65 },
    { index: 6,  sharp: "F#", flat: "Gb", midi: 66 },
    { index: 7,  sharp: "G",  flat: "G",  midi: 67 },
    { index: 8,  sharp: "G#", flat: "Ab", midi: 68 },
    { index: 9,  sharp: "A",  flat: "A",  midi: 69 },
    { index: 10, sharp: "A#", flat: "Bb", midi: 70 },
    { index: 11, sharp: "B",  flat: "B",  midi: 71 }
];


// ------------------------------------------------------------
// BASE DE DONNÉES DES INTERVALLES
// ------------------------------------------------------------

const INTERVALS = [
    { semitones: 0,  short: "P1", long: "Unisson",         degree: 1, quality: "P" },
    { semitones: 1,  short: "m2", long: "Seconde mineure", degree: 2, quality: "m" },
    { semitones: 2,  short: "M2", long: "Seconde majeure", degree: 2, quality: "M" },
    { semitones: 3,  short: "m3", long: "Tierce mineure",  degree: 3, quality: "m" },
    { semitones: 4,  short: "M3", long: "Tierce majeure",  degree: 3, quality: "M" },
    { semitones: 5,  short: "P4", long: "Quarte juste",    degree: 4, quality: "P" },
    { semitones: 6,  short: "TT", long: "Triton",          degree: 4, quality: "A/d" },
    { semitones: 7,  short: "P5", long: "Quinte juste",    degree: 5, quality: "P" },
    { semitones: 8,  short: "m6", long: "Sixte mineure",   degree: 6, quality: "m" },
    { semitones: 9,  short: "M6", long: "Sixte majeure",   degree: 6, quality: "M" },
    { semitones: 10, short: "m7", long: "Septième mineure",degree: 7, quality: "m" },
    { semitones: 11, short: "M7", long: "Septième majeure",degree: 7, quality: "M" },
    { semitones: 12, short: "P8", long: "Octave",          degree: 8, quality: "P" }
];



class MusicTheory {

    constructor() {
        this.useFlats = false;
        this.root = null;
        this.NOTES = NOTES;
        this.INTERVALS = INTERVALS;
    }

    hasRoot() {
        return this.root !== null;
    }

    setRoot(i) {
        this.root = ((i % 12) + 12) % 12;
    }


    // -----------------------------
    // NOTES
    // -----------------------------
    getNote(index) {
        return this.NOTES[((index % 12) + 12) % 12];
    }

translateENtoFR(nameEN) {
    // 1) séparer lettre + altération
    const m = nameEN.match(/^([A-G])([#b]?)$/);
    if (!m) return nameEN;

    const letter = m[1];
    const alt    = m[2]; // "#" ou "b" ou ""

    // 2) correspondance lettre EN → FR
    const map = {
        "C": "do",
        "D": "ré",
        "E": "mi",
        "F": "fa",
        "G": "sol",
        "A": "la",
        "B": "si"
    };

    const baseFR = map[letter] || letter;

    // 3) altération ASCII → UTF
    const altFR =
        alt === "#" ? "♯" :
        alt === "b" ? "♭" :
        "";

    return baseFR + altFR;
}


getDegreeLabel(interval) {

    const useFlats = this.useFlats;

    // tableau DEG d’origine
    const DEG = [
        { base: "1", alt: ""  }, // 0
        { base: "2", alt: "♭" }, // 1
        { base: "2", alt: ""  }, // 2
        { base: "3", alt: "♭" }, // 3
        { base: "3", alt: ""  }, // 4
        { base: "4", alt: ""  }, // 5
        { base: "4", alt: "♯" }, // 6
        { base: "5", alt: ""  }, // 7
        { base: "6", alt: "♭" }, // 8
        { base: "6", alt: ""  }, // 9
        { base: "7", alt: "♭" }, // 10
        { base: "7", alt: ""  }  // 11
    ];

    const d = DEG[interval];

    // cas spécial : #4 → b5 en mode flats
    if (interval === 6 && useFlats) {
        return { base: "5", alt: "♭" };
    }

    return d;
}


getFullNote(index) {
    index = (index + 12) % 12;

    const n = this.NOTES[index];

    // EN : sharp ou flat selon useFlats
    const nameEN = this.useFlats ? n.flat : n.sharp;

    // FR : via la méthode interne
    const nameFR = this.translateENtoFR(nameEN);

    // extraction EN
    const mEN = nameEN.match(/^([A-G])([#b]?)$/);
    const baseEN = mEN[1];
    const altEN  = mEN[2] || "";

    // extraction FR
    const mFR = nameFR.match(/^(.+?)([♯♭]?)$/);
    const baseFR = mFR[1];
    const altFR  = mFR[2] || "";

    // -----------------------------
    // CHROMA RELATIF
    // -----------------------------
    let chroma = null;
    if (this.root !== null) {
        chroma = (index - this.root + 12) % 12;
    }

    // -----------------------------
    // INTERVAL
    // -----------------------------
    let intervalShort = null;
    if (chroma !== null) {
        const interval = this.INTERVALS.find(i => i.semitones === chroma);
        intervalShort = interval ? interval.short : null;
    }

    // -----------------------------
    // DEGRÉ
    // -----------------------------
    let degreeBase = null;
    let degreeAlt  = null;

    if (chroma !== null) {
        const d = this.getDegreeLabel(chroma);
        degreeBase = d.base;
        degreeAlt  = d.alt;
    }

    return {
        index,
        nameEN,
        nameFR,
        baseEN,
        altEN,
        baseFR,
        altFR,
        chroma,
        intervalShort,
        degreeBase,
        degreeAlt
    };
}


getNoteLabel(index, mode) {
    const n = this.NOTES[index];

    // EN : sharp ou flat selon useFlats
    const nameEN = this.useFlats ? n.flat : n.sharp;

    if (mode === "noteEN") {
        const m = nameEN.match(/^([A-G])([#b]?)$/);
        return {
            base: m[1],
            alt:  m[2] === "#" ? "♯" :
                  m[2] === "b" ? "♭" : "",
            type: mode
        };
    }

    if (mode === "noteFR") {
        const nameFR = this.translateENtoFR(nameEN);
        const m = nameFR.match(/^(.+?)([♯♭]?)$/);
        return {
            base: m[1],
            alt:  m[2] || "",
            type: mode
        };
    }

    // degree / interval → ton système existant
    const full = this.getFullNote(index);
    return this.getLabelFromFull(full, mode);
}


getLabelFromFull(full, mode) {

    if (mode === "degree") {
        if (!full.degreeBase) {
            // pas de fondamentale définie → rien à afficher
            return {
                base: "",
                alt: "",
                type: "degree"
            };
        }
        return {
            base: full.degreeBase,
            alt:  full.degreeAlt || "",
            type: "degree"
        };
    }

    if (mode === "interval") {
        if (!full.intervalShort) {
            return {
                base: "",
                alt: "",
                type: "interval"
            };
        }
        return {
            base: full.intervalShort,
            alt:  "",
            type: "interval"
        };
    }

    if (mode === "none") {
        return {
            base: "",
            alt:  "",
            type: "none"
        };
    }

    // fallback : EN
    return {
        base: full.baseEN,
        alt:  full.altEN,
        type: "noteEN"
    };
}




    getNoteName(index) {
        const n = this.getNote(index);
        return this.useFlats ? n.flat : n.sharp;
    }

    getFrenchName(index) {
        const n = this.getNote(index);
        const nameEN = this.useFlats ? n.flat : n.sharp;
        return this.translateENtoFR(nameEN);
    }


    toggleAccidentals() {
        this.useFlats = !this.useFlats;
    }

    // -----------------------------
    // INTERVALLES
    // -----------------------------
    getInterval(semitones) {
        semitones = ((semitones % 12) + 12) % 12;
        return this.INTERVALS.find(i => i.semitones === semitones);
    }

    // -----------------------------
    // FRETTED NOTES
    // -----------------------------
    getFrettedNoteName(openIndex, fret) {
        return this.getNoteName(openIndex + fret);
    }

    // -----------------------------
    // MIDI / FREQUENCE
    // -----------------------------
    freqToMidi(freq) {
        return Math.round(69 + 12 * Math.log2(freq / 440));
    }

    midiToIndex(midi) {
        return ((midi % 12) + 12) % 12;
    }

    midiToName(midi) {
        return this.getNoteName(this.midiToIndex(midi));
    }
}
