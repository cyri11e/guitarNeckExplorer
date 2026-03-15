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

        // Tests internes verbeux, desactives en runtime normal.
        this.enableInternalTests = false;
        if (this.enableInternalTests) {
            this.runInternalTests();
        }
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
        if (stringIndex > 5 ||stringIndex < 0) return null;
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
// ------------------------------------------------------------
// NORMALISATION
// ------------------------------------------------------------
normalizeInterval(interval) {
    // complemente interval negatif
    return (interval % 12 + 12) % 12;
}

complementInterval(interval, way){
    // peut etre inutile ?
    if (way == 'down') 
        return this.normalizeInterval(interval)

    return interval;
}

findNoteOnStringByMidi(stringIndex, targetMidi) {
    // recherche un midi sur une corde
    // corde invalide
    if (stringIndex < 0 || stringIndex >= this.tuning.length)
        return null;

    // scan de la corde
    for (let f = 0; f <= this.fretCount; f++) {
        const n = this.getNoteAt(stringIndex, f);
        if (!n) continue;

        if (n.midi === targetMidi) {
            return {
                string: stringIndex + 1,
                fret: f,
                note: n
            };
        }
    }

    return null;
}

findNoteOnNeckByMidi(targetMidi) {
    // recherche un midi sur toutes les cordes 
    for (let s = 0; s < this.tuning.length; s++) {

        const found = this.findNoteOnStringByMidi(s, targetMidi);

        if (found) return found;
    }

    return null;
}
 
intervalToMidi(startMidi, interval) {
    return startMidi + interval;
}


mod(a, b) {
    return ((a % b) + b) % b;
}

findAllOctavedMidi(targetMidi) {
    // recherche de tous les pitchClass
    const results = [];

    const minMidi = this.tuning[0].midi; // corde la plus grave
    const maxMidi = this.tuning[this.tuning.length - 1].midi + this.fretCount;     // corde la plus aiguë + frettes

    const targetIndex = this.mod(targetMidi, 12);

    for (let midi = minMidi; midi <= maxMidi; midi++) {
        if (this.mod(midi, 12) === targetIndex) {
            results.push(midi);
        }
    }

    return results;
}

findOctavedMidi(targetMidi, octave) {
    // cherche tous les midi + les octaves permises par octaves
    // octave = 0 → pitch-class
    if (octave === 0) {
        return this.findAllOctavedMidi(targetMidi);
    }

    const results = [];
    let midi = targetMidi;

    // toujours inclure la note de départ
    if ( octave >= 0 ) results.push(midi);

    // +12 ou -12 selon le signe
    const step = (octave > 0 ? 12 : -12);

    // boucle simple : répéter |octave| fois
    for (let i = 0; i < Math.abs(octave); i++) {
        midi += step;
        results.push(midi);
    }
    if (octave > 0) results.pop()
    return results;
}




// ------------------------------------------------------------
// RECHERCHE PAR MIDI EXACT (MODE NORMAL)
// agnostique peut trouver aussi bien en montant qu en descendant
// NE DECIDE PAS DU SENS il est imposé par le signe de l intervale
// gere les octaves + et - 0 = mode "tout" on se filtre pas le 
// ------------------------------------------------------------
findByMidiOnString(stringIndex, start, interval, octaveShown) {
    const base = this.getNoteAt(start.string - 1, start.fret);
    if (!base) return [];

    const startMidi = base.midi;

    // 1) toutes les notes du pitch-class (aucun filtre ici)
    const candidates = this.findByPitchClassOnString(
        stringIndex,
        start,
        interval
    );

    // 2) calcul des bornes MIDI d’octave
    const direction = Math.sign(octaveShown);
    const octaveCount = Math.abs(octaveShown);

    let startMidiOctave = startMidi;
    let endMidiOctave = startMidi;

    if (direction > 0) {
        // UP
        endMidiOctave = startMidi + (12 * octaveCount);
    } else if (direction < 0) {
        // DOWN
        startMidiOctave = startMidi - (12 * octaveCount);
    }


    // 3) filtrage uniquement par range MIDI
    return candidates.filter(n => {
        const midi = n.note.midi;
        return (midi >= startMidiOctave && midi <= endMidiOctave) || (octaveShown == 0);
    });
}



// ------------------------------------------------------------
// RECHERCHE PAR PITCH-CLASS (MODE TOUT)
// ------------------------------------------------------------
findByPitchClassOnString(stringIndex, start, interval) {
    const base = this.getNoteAt(start.string - 1, start.fret);
    if (!base) return [];

    const results = [];
    const startMidi = base.midi;
    const intervalMod = this.normalizeInterval(interval);

    for (let f = 0; f <= this.fretCount; f++) {
        const n = this.getNoteAt(stringIndex, f);
        if (!n) continue;

        const diff = n.midi - startMidi;
        const diffMod = this.normalizeInterval(diff);

        if (diffMod === intervalMod) {
            results.push({ string: stringIndex + 1, fret: f, note: n });
        }
    }

    return results;
}

// ------------------------------------------------------------
// ROUTEUR GENERAL
// ------------------------------------------------------------
findNoteOnString(stringIndex, start, interval, octave = 1) {
    if (stringIndex < 0 || stringIndex >= this.tuning.length)
        return [];

    if (octave === "T") {
        return this.findByPitchClassOnString(stringIndex, start, interval);
    }

    return this.findByMidiOnString(stringIndex, start, interval, octave);
}


// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

findNoteOnNextString(start, interval, octave = 1) {
    return this.findNoteOnString(start.string, start, interval, octave);
}

findNoteOnPrevString(start, interval, octave = 1) {
    return this.findNoteOnString(start.string - 2, start, interval, octave);
}

findNoteOnAnyString(start, interval, octave = 1) {
    const results = [];
    for (let s = 0; s < this.tuning.length; s++) {
        results.push(...this.findNoteOnString(s, start, interval, octave));
    }
    return results;
}

// ------------------------------------------------------------
// FILTRES
// ------------------------------------------------------------
filterByStrings(positions, allowedStrings) {
    const allowed = new Set(allowedStrings);
    return positions.filter(p => allowed.has(p.string));
}

filterByFrets(positions, minFret, maxFret) {
    return positions.filter(p => p.fret >= minFret && p.fret <= maxFret);
}

filterByNeighbourStrings(positions) {
    if (positions.length <= 1) return positions;

    const sorted = [...positions].sort((a, b) => a.string - b.string);

    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].string !== sorted[i - 1].string + 1) {
            return [];
        }
    }

    return sorted;
}

// ------------------------------------------------------------
// SCORING
// ------------------------------------------------------------
scorePythagorean(a, b) {
    const ds = a.string - b.string;
    const df = a.fret - b.fret;
    return Math.sqrt(ds * ds + df * df);
}

scoreCompactnessPythagorean(positions) {
    if (positions.length <= 1) return 0;

    let total = 0;
    let count = 0;

    for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
            total += this.scorePythagorean(positions[i], positions[j]);
            count++;
        }
    }

    return total / count;
}

computeGeometricOctave(root, way) {

    const inst = this;

    // 1) déplacement de corde
    const ds = (way === "up" ? +2 : -2);
    const targetString = root.string + ds;

    // 2) delta fret : 2 ou 3 selon couple
    let df = ds;

    const s1 = root.string;
    const s2 = targetString;

    const isSpecial =
        (s1 === 3 && s2 === 5) || // G → B
        (s1 === 5 && s2 === 3) || // B → G
        (s1 === 4 && s2 === 6) || // D → E aigu
        (s1 === 6 && s2 === 4);   // E aigu → D

    if (isSpecial) df = ds+1;

    // 3) signe selon le sens
    if (way === "down") df = -df;

    const targetFret = root.fret + df;

    // 4) note réelle si possible
    if (targetString >= 1 && targetString <= inst.tuning.length) {
        const raw = inst.getNoteAt(targetString - 1, targetFret);
        if (raw) {
            return {
                string: targetString,
                fret: targetFret,
                midi: raw.midi,
                virtual: false
            };
        }
    }

    // 5) sinon → note virtuelle
    return {
        string: targetString,
        fret: targetFret,
        midi: root.midi + (way === "up" ? +12 : -12),
        virtual: true
    };
}


runInternalTests() {

    const show = v => JSON.stringify(v);

    const assert = (name, got, expected) => {
        const ok = show(got) === show(expected);
        if (ok) {
            console.log("✅", name);
        } else {
            console.error("❌", name);
            console.error("   expected:", show(expected));
            console.error("   got     :", show(got));
        }
    };

    console.log("=== INTERNAL TESTS START ===");

    // ---------------------------------------------------------
    // TESTS intervalToMidi
    // ---------------------------------------------------------

    assert(
        "intervalToMidi 60 + 7",
        this.intervalToMidi(60, 7),
        67
    );

    assert(
        "intervalToMidi 60 - 12",
        this.intervalToMidi(60, -12),
        48
    );

    // ---------------------------------------------------------
    // TESTS findOctavedMidi
    // ---------------------------------------------------------

    assert(
        "findOctavedMidi(60, 1)",
        this.findOctavedMidi(60, 1),
        [60]
    );

    assert(
        "findOctavedMidi(60, 2)",
        this.findOctavedMidi(60, 2),
        [60, 72]
    );

    assert(
        "findOctavedMidi(60, -1)",
        this.findOctavedMidi(60, -1),
        [60, 48]
    );

    assert(
        "findOctavedMidi(60, -3)",
        this.findOctavedMidi(60, -3),
        [60, 48, 36, 24]
    );

    // octave = 0 → pitch-class
    const r0 = this.findOctavedMidi(60, 0);
    if (r0.includes(60)) {
        console.log("✅ findOctavedMidi(60,0) includes 60");
        console.log(this.findOctavedMidi(60, -3))
    } else {
        console.error("❌ findOctavedMidi(60,0) missing 60");
        console.error("   got:", show(r0));
    }

    // ---------------------------------------------------------
    // TESTS findAllOctavedMidi
    // ---------------------------------------------------------

    const all60 = this.findAllOctavedMidi(60);
    if (all60.includes(60)) {
        console.log("✅ findAllOctavedMidi(60) includes 60");
    } else {
        console.error("❌ findAllOctavedMidi(60) missing 60");
        console.error("   got:", show(all60));
    }

    // ---------------------------------------------------------
    // TESTS findByMidiOnString
    // ---------------------------------------------------------

    const stringIndex = 0; // corde 1
    const openMidi = this.tuning[0];
    const start = { string: 1, fret: 0 };

    // 1) interval = 0, octaveShown = 0
    let got = this.findByMidiOnString(stringIndex, start, 0, 0);
    let expected =[{"string":1,"fret":0,"note":{"midi":40,"index":4,"name":"E","french":"mi","octave":2}},{"string":1,"fret":12,"note":{"midi":52,"index":4,"name":"E","french":"mi","octave":3}},{"string":1,"fret":24,"note":{"midi":64,"index":4,"name":"E","french":"mi","octave":4}}]

    assert(
        "findByMidiOnString interval=0 octave=0",
        got,
        expected
    );

    // 2) interval = +12, octaveShown = 1
    got = this.findByMidiOnString(stringIndex, start, 12, 1);
    expected =[{"string":1,"fret":0,"note":{"midi":40,"index":4,"name":"E","french":"mi","octave":2}},{"string":1,"fret":12,"note":{"midi":52,"index":4,"name":"E","french":"mi","octave":3}}]

    assert(
        "findByMidiOnString interval=+12 octave=1",
        got,
        expected
    );

    // 3) interval = -12, octaveShown = 1
    got = this.findByMidiOnString(stringIndex, start, -12, 1);
    expected =[{"string":1,"fret":0,"note":{"midi":40,"index":4,"name":"E","french":"mi","octave":2}},{"string":1,"fret":12,"note":{"midi":52,"index":4,"name":"E","french":"mi","octave":3}}]

    assert(
        "findByMidiOnString interval=-12 octave=1",
        got,
        expected
    );

    // 4) interval = +7, octaveShown = 2
    got = this.findByMidiOnString(stringIndex, start, 7, 2);
    expected = [{"string":1,"fret":7,"note":{"midi":47,"index":11,"name":"B","french":"si","octave":2}},{"string":1,"fret":19,"note":{"midi":59,"index":11,"name":"B","french":"si","octave":3}}]

    assert(
        "findByMidiOnString interval=+7 octave=2",
        got,
        expected
    );

    // 5) interval = +5, octaveShown = -1
    got = this.findByMidiOnString(stringIndex, start, 5, -1);
    expected = [];
    let base5 = openMidi + 5;
    for (let k = 0; k >= -1; k--) {
        let midi = base5 + k * 12;
        let pos = this.findNoteOnStringByMidi(stringIndex, midi);
        if (pos) expected.push(pos);
    }

    assert(
        "findByMidiOnString interval=+5 octave=-1",
        got,
        expected
    );

    console.log("=== INTERNAL TESTS END ===");
}


}
