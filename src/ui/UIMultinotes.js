class MultiNotes {

    constructor(guitar) {
        this.g = guitar;
    }

    // ------------------------------------------------------------
    // API PRINCIPALE
    // ------------------------------------------------------------
    dispatch(mode, intervals, hovered, way, octaveShown) {

        if (!hovered || !intervals || intervals.length === 0)
            return [];

        switch (mode) {

            case "OneString":
                return this.dispatchOneString(intervals, hovered, way, octaveShown);

            case "BoxR":
                return this.dispatchBoxR(intervals, hovered, way, octaveShown);

            case "BoxL":
                return this.dispatchBoxL(intervals, hovered, way, octaveShown);

            case "3NPS":
                return this.dispatch3NPS(intervals, hovered, way, octaveShown);

            case "Diagonal":
                return this.dispatchDiagonal(intervals, hovered, way, octaveShown);

            case "Chord":
                return this.dispatchChord(intervals, hovered, way, octaveShown);

            default:
                return [];
        }
    }

findOccurrence(hovered, interval, octaveShift) {
    const g = this.g;
    const inst = g.app.instrument;

    const baseRaw = inst.getNoteAt(hovered.string - 1, hovered.fret);
    if (!baseRaw) return [];

    const baseMidi = baseRaw.midi;
    const targetMidi = baseMidi + interval + 12 * octaveShift;

    const results = [];

    for (let s = 0; s < g.strings.length; s++) {
        for (let f = 0; f <= g.fretCount; f++) {
            const raw = inst.getNoteAt(s, f);
            if (raw && raw.midi === targetMidi) {
                results.push({
                    string: s + 1,
                    fret: f,
                    midi: raw.midi
                });
            }
        }
    }

    return results;
}


findStringOccurrence(hovered, interval, stringOffset) {

    const g = this.g;
    const inst = g.app.instrument;

    const targetString = hovered.string + stringOffset;
    if (targetString < 1 || targetString > inst.tuning.length) return null;

    const baseRaw = inst.getNoteAt(hovered.string - 1, hovered.fret);
    if (!baseRaw) return null;

    const targetMidi = baseRaw.midi + interval;
    const maxFret = g.fretCount;

    // SCAN DE LA CORDE CIBLE (exactement comme ton ancien code)
    for (let f = 0; f <= maxFret; f++) {
        const raw = inst.getNoteAt(targetString - 1, f);
        if (!raw) continue;

        if (raw.midi === targetMidi) {
            return { string: targetString, fret: f, midi: raw.midi };
        }
    }

    return null;
}




findAllOccurrences(hovered, interval, way, octaveShown) {
    const g = this.g;
    const inst = g.app.instrument;

    const baseRaw = inst.getNoteAt(hovered.string - 1, hovered.fret);
    if (!baseRaw) return [];

    const baseIndex = baseRaw.index;
    const results = [];

    // ----- MODE T : pitch-class, ignorer le sens -----
    if (octaveShown === "T") {
        const targetIndex = ((baseIndex + interval) % 12 + 12) % 12;

        for (let s = 0; s < g.strings.length; s++) {
            for (let f = 0; f <= g.fretCount; f++) {
                const raw = inst.getNoteAt(s, f);
                if (raw && raw.index === targetIndex) {
                    results.push({
                        string: s + 1,
                        fret: f,
                        midi: raw.midi
                    });
                }
            }
        }

        return results;
    }

    // ----- MODE normal : note exacte ± octaves -----
    const directional = this.computeDirectionalInterval(interval, way);

    // 🔥 ICI : on génère les shifts pour TOUS les intervalles, y compris 0
    const shifts = [0];
    if (octaveShown === "2") shifts.push(1, -1);
    if (octaveShown === "3") shifts.push(1, 2, -1, -2);

    for (let k of shifts) {
        const occ = this.findOccurrence(hovered, directional, k);
        results.push(...occ);
    }

    return results;
}






computeDirectionalInterval(interval, way) {
    if (way === "up") return interval;
    return interval - 12; // descendre = même note, octave plus bas
}



    // ------------------------------------------------------------
    // MODE 1 : OneString (COMPLET)
    // ------------------------------------------------------------
dispatchOneString(intervals, hovered, way, octaveShown) {

    const results = [];

    // 🔥 injecter la root si on est en mode multi-octave
    let intervalsToUse = intervals;
    const multiOctave = (octaveShown === "2" || octaveShown === "3" || octaveShown === "T");

    if (multiOctave && !intervalsToUse.includes(0)) {
        intervalsToUse = [0, ...intervalsToUse];
    }

    for (let interval of intervalsToUse) {

        const all = this.findAllOccurrences(hovered, interval, way, octaveShown);

        const sameString = all.filter(n => n.string === hovered.string);

        const final = (octaveShown === "T")
            ? sameString
            : sameString.filter(n =>
                way === "up"
                    ? n.fret >= hovered.fret
                    : n.fret <= hovered.fret
            );

        results.push(...final);
    }

    return results;
}


dispatchBox(intervals, hovered, way, octaveShown, minDf, maxDf) {

    const results = [];

    const minFret = hovered.fret + minDf;
    const maxFret = hovered.fret + maxDf;

    for (let interval of intervals) {

        // 1. Toutes les occurrences
        const all = this.findAllOccurrences(hovered, interval, way, octaveShown);

        // 2. Filtre des cordes selon le sens
        let filtered;

        if (octaveShown === "T") {
            // Mode T → ignore le sens
            filtered = all;
        } else {
            filtered = all.filter(n =>
                way === "up"
                    ? n.string >= hovered.string   // cordes aigües (ton système)
                    : n.string <= hovered.string   // cordes graves
            );
        }

        // 3. Filtre des frettes selon la fenêtre
        filtered = filtered.filter(n =>
            n.fret >= minFret && n.fret <= maxFret
        );

        results.push(...filtered);
    }

    return results;
}




dispatchBoxR(intervals, hovered, way, octaveShown) {
    return this.dispatchBox(intervals, hovered, way, octaveShown, -1, +3);
}


dispatchBoxL(intervals, hovered, way, octaveShown) {
    return this.dispatchBox(intervals, hovered, way, octaveShown, -3, +1);
}

filterOneNotePerString(notes, hovered) {

    const bestPerString = new Map();

    for (const n of notes) {

        const existing = bestPerString.get(n.string);

        if (!existing) {
            bestPerString.set(n.string, n);
            continue;
        }

        // garder la note la plus proche de hovered
        const dNew = Math.abs(n.fret - hovered.fret);
        const dOld = Math.abs(existing.fret - hovered.fret);

        if (dNew < dOld) {
            bestPerString.set(n.string, n);
        }
    }

    return Array.from(bestPerString.values());
}

dispatchChord(intervals, hovered, way, octaveShown) {

    // Fenêtre standard
    let min = 0;
    let max = 3;

    // Ajustement spécifique corde B (string 5)
    const isBString = hovered.string === 5;
    const B_OFFSET_MIN = -1;
    const B_OFFSET_MAX = 3;

    if (isBString) {
        min = B_OFFSET_MIN;
        max = B_OFFSET_MAX;
    }

    // Si on descend → on inverse la fenêtre
    if (way === "down") {
        [min, max] = [-max, isBString ? 0 : -min];
    }

    const notes = this.dispatchBox(
        intervals,
        hovered,
        way,
        octaveShown,
        min,
        max
    );

    return this.filterOneNotePerString(notes, hovered);
}


    // ------------------------------------------------------------
    // AUTRES MODES (VIDES)
    // ------------------------------------------------------------


    dispatch3NPS(intervals, hovered, way, octaveShown) { return []; }
    dispatchDiagonal(intervals, hovered, way, octaveShown) { return []; }

}
