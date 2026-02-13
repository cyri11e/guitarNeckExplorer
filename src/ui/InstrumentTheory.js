// ============================================================
// INSTRUMENT THEORY — Module autonome (guitare, basse, etc.)
// ============================================================

class InstrumentTheory {

    constructor({
        tuning = ["E2","A2","D3","G3","B3","E4"],
        fretCount = 24,
        musicTheory = null
    } = {}) {

        if (!musicTheory) {
            throw new Error("InstrumentTheory requires a MusicTheory instance");
        }

        this.theory = musicTheory;
        this.fretCount = fretCount;

        // Accordage sous forme d'objets complets
        this.tuning = tuning.map(t => this.parseNoteName(t));
    }

    parseNoteName(name) {
        const match = name.match(/^([A-G])([#b]?)(\d)$/);
        if (!match) throw new Error("Invalid note name: " + name);

        const [, letter, accidental, octaveStr] = match;
        const octave = parseInt(octaveStr);

        const candidates = this.theory.NOTES.filter(n =>
            n.sharp === letter + accidental || n.flat === letter + accidental
        );

        if (candidates.length === 0) {
            throw new Error("Unknown note: " + name);
        }

        const note = candidates[0];

        return {
            name,
            index: note.index,
            octave,
            midi: note.midi + (octave - 4) * 12
        };
    }

    getNoteAt(stringIndex, fret) {
        const open = this.tuning[stringIndex];
        const midi = open.midi + fret;
        const index = this.theory.midiToIndex(midi);

        return {
            midi,
            index,
            name: this.theory.getNoteName(index),
            french: this.theory.getFrenchName(index),
            octave: Math.floor(midi / 12) - 1
        };
    }

    getOccurrences(noteIndex) {
        const out = [];

        for (let s = 0; s < this.tuning.length; s++) {
            for (let f = 0; f <= this.fretCount; f++) {
                const n = this.getNoteAt(s, f);
                if (n.index === noteIndex) {
                    out.push({ string: s, fret: f, note: n });
                }
            }
        }

        return out;
    }

    getScaleOccurrences(scaleIndices) {
        const out = [];

        for (let idx of scaleIndices) {
            out.push({
                noteIndex: idx,
                occurrences: this.getOccurrences(idx)
            });
        }

        return out;
    }

    getChordOccurrences(chordIndices) {
        return this.getScaleOccurrences(chordIndices);
    }

    transpose(semitones) {
        this.tuning = this.tuning.map(t => {
            const newMidi = t.midi + semitones;
            const newIndex = this.theory.midiToIndex(newMidi);
            return {
                name: this.theory.getNoteName(newIndex),
                index: newIndex,
                midi: newMidi,
                octave: Math.floor(newMidi / 12) - 1
            };
        });
    }
}
