// ============================================================
// MUSIC THEORY — Module autonome complet
// ============================================================

// ------------------------------------------------------------
// BASE DE DONNÉES DES NOTES (chromatique 0..11)
// ------------------------------------------------------------

const NOTES = [
    { index: 0,  sharp: "C",  flat: "C",  french: "do",  midi: 60 },
    { index: 1,  sharp: "C#", flat: "Db", french: "ré♭", midi: 61 },
    { index: 2,  sharp: "D",  flat: "D",  french: "ré",  midi: 62 },
    { index: 3,  sharp: "D#", flat: "Eb", french: "mi♭", midi: 63 },
    { index: 4,  sharp: "E",  flat: "E",  french: "mi",  midi: 64 },
    { index: 5,  sharp: "F",  flat: "F",  french: "fa",  midi: 65 },
    { index: 6,  sharp: "F#", flat: "Gb", french: "sol♭", midi: 66 },
    { index: 7,  sharp: "G",  flat: "G",  french: "sol", midi: 67 },
    { index: 8,  sharp: "G#", flat: "Ab", french: "la♭", midi: 68 },
    { index: 9,  sharp: "A",  flat: "A",  french: "la",  midi: 69 },
    { index: 10, sharp: "A#", flat: "Bb", french: "si♭", midi: 70 },
    { index: 11, sharp: "B",  flat: "B",  french: "si",  midi: 71 }
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
        this.NOTES = NOTES;
        this.INTERVALS = INTERVALS;
    }

    // -----------------------------
    // NOTES
    // -----------------------------
    getNote(index) {
        return this.NOTES[((index % 12) + 12) % 12];
    }

    getNoteName(index) {
        const n = this.getNote(index);
        return this.useFlats ? n.flat : n.sharp;
    }

    getFrenchName(index) {
        return this.getNote(index).french;
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
