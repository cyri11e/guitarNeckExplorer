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
