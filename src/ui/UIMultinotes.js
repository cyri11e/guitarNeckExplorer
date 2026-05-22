class MultiNotes {
// TODO : un seul mode box en mode tout direct L et R selon up down
// ajuster CAGED
// regles automatique box = Tout , C = 1 octave + triade 
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

    case "Box":
        return (way === "up")
            ? this.dispatchBoxR(intervals, hovered, way, octaveShown)
            : this.dispatchBoxL(intervals, hovered, way, octaveShown);

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


dispatchOneString(intervals, hovered, way, octaveShown = 1) {
    const T = this.g.app.instrument;

    const base = T.getNoteAt(hovered.string - 1, hovered.fret);
    if (!base) return [];

    const startMidi = base.midi;
    const octave = (octaveShown !== "T") ? octaveShown * ( way == 'up' ? 1 : -1 ) : 0;

    // 1) interval → midi (NEUTRE)
    const targetMidis = intervals.map(interval =>
        T.intervalToMidi(startMidi, interval)
    );

    // 2) midi → octaves (NEUTRE)
    const octaved = targetMidis.map(midi =>
        T.findOctavedMidi(midi, octave)
    );

    // 4) aplatir
    const allMidis = octaved.flat();

    // 5) positions sur la corde
    const positions = allMidis
        .map(midi => T.findNoteOnStringByMidi(hovered.string - 1, midi))
        .filter(Boolean);

    return positions;
}

dispatchChord(intervals, hovered, way, octaveShown = 1) {
    const T = this.g.app.instrument;

    const base = T.getNoteAt(hovered.string - 1, hovered.fret);
    if (!base) return [];

    const startMidi = base.midi;

    // ------------------------------------------------------------
    // MODE 1 OCTAVE → ton code EXACT
    // ------------------------------------------------------------
    if (Math.abs(octaveShown) === 1) {

        const octave = (octaveShown !== "T")
            ? octaveShown * (way === 'up' ? 1 : -1)
            : 0;

        const enriched = intervals.map(interval => {
            const midi = T.intervalToMidi(startMidi, interval);
            const octaved = (interval == 0) ? [midi] : T.findOctavedMidi(midi, octave);
            const finalMidi = octaved[0];
            return {
                interval,
                finalMidi,
                distance: Math.abs(finalMidi - startMidi)
            };
        });

        const sorted = (way === 'down')
            ? enriched.sort((a, b) => a.distance - b.distance)
            : enriched;

        const results = [];

        sorted.forEach((item, i) => {
            const targetString = (way === 'up')
                ? hovered.string + i
                : hovered.string - i;

            if (targetString < 1 || targetString > T.tuning.length) return;

            const pos = T.findNoteOnStringByMidi(targetString - 1, item.finalMidi);
            if (pos) results.push(pos);
        });

        return results;
    }

    // ------------------------------------------------------------
    // MODE MULTI-OCTAVES (|octaveShown| ≠ 1)
    // → way ignoré
    // → octaveShown ignoré
    // → root comprise
    // → toutes les octaves
    // → toutes les cordes sauf la corde de départ
    // → ON PUSH DES POSITIONS BRUTES (comme ton exemple)
    // ------------------------------------------------------------


    const results = [];

    for (let interval of intervals) {

        const midiNeutral = T.intervalToMidi(startMidi, interval);

        // 0 = pitch-class complet → toutes les octaves
        const allMidis = T.findOctavedMidi(midiNeutral, 0);

        for (let m of allMidis) {
            for (let s = 0; s < T.tuning.length; s++) {

                const pos = T.findNoteOnStringByMidi(s, m);
                if (pos) {
                    results.push(pos);   // <-- EXACTEMENT CE QUE TU VEUX
                }
            }
        }
    }

// ------------------------------------------------------------
// MODE CHORD + 2 OCTAVES → limiter à la zone CAGED
// ------------------------------------------------------------
if (Math.abs(octaveShown) === 2) {

    // 1) mapping corde → shapes
    const map = {
        1: ["G", "E"],
        2: ["C", "A"],
        3: ["E", "D"],
        4: ["A", "G"],
        5: ["D", "C"],
        6: ["G", "E"]
    };

    const pair = map[hovered.string];
    if (pair) {

        // 2) largeur shape
        const shapeWidth = L =>
            (L === "G" || L === "C" || L === "D") ? 3 : 2;

        const leftW  = shapeWidth(pair[0]);
        const rightW = shapeWidth(pair[1]);

        // 3) zone de frettes autorisée
        const minFret = hovered.fret - leftW;
        const maxFret = hovered.fret + rightW;

        // 4) filtrage
        return T.filterByFrets(results, minFret, maxFret);
    }
}  

    return results;
}




    // ------------------------------------------------------------
    // BOX GENERIQUE
    // ------------------------------------------------------------
dispatchBox(intervals, hovered, way, octaveShown, minDf, maxDf) {
    const T = this.g.app.instrument;
    const results = [];

    const minFret = hovered.fret + minDf;
    const maxFret = hovered.fret + maxDf;

    const base = T.getNoteAt(hovered.string - 1, hovered.fret);
    if (!base) return results;

    const startMidi = base.midi;

    // Toujours inclure la root
    results.push({
        string: hovered.string,
        fret: hovered.fret,
        note: base
    });

    // direction d’octave (même logique que OneString)
    const octave =
        octaveShown === "T"
            ? 0
            : octaveShown * (way === "up" ? 1 : -1);

    for (let interval of intervals) {

        const midiNeutral = T.intervalToMidi(startMidi, interval);


        const octaved = T.findOctavedMidi(midiNeutral, octave);

        for (let m of octaved) {
            for (let s = 0; s < T.tuning.length; s++) {

                const pos = T.findNoteOnStringByMidi(s, m);
                if (!pos) continue;

                // Filtre direction (sauf mode T)
                if (octaveShown !== "T") {
                    if (way === "up" && pos.string < hovered.string) continue;
                    if (way === "down" && pos.string > hovered.string) continue;
                }

                // Filtre frettes
                if (pos.fret < minFret || pos.fret > maxFret) continue;

                results.push(pos);
            }
        }
    }

    return results;
}





    dispatchBoxR(intervals, hovered, way, octaveShown) {
        return this.dispatchBox(intervals, hovered, way, octaveShown, -1, +3);
    }

    dispatchBoxL(intervals, hovered, way, octaveShown) {
        return this.dispatchBox(intervals, hovered, way, octaveShown, -3, +0);
    }







    // ------------------------------------------------------------
    // DIAGONAL
    // ------------------------------------------------------------
    dispatchDiagonal(intervals, hovered, way, octaveShown) {
        const T = this.g.app.instrument;

        const normalized = (intervals || [])
            .map(i => ((Number(i) % 12) + 12) % 12)
            .sort((a, b) => a - b);
        const key = normalized.join(",");
        const isPentatonic = key === "0,2,4,7,9" || key === "0,3,5,7,10";

        // Penta diagonale 3+2:
        // - saut de ton (2) => meme corde
        // - saut de m3 (3) => changement de corde
        if (isPentatonic) {
            const base = T.getNoteAt(hovered.string - 1, hovered.fret);
            if (!base) return [];

            const results = [{
                string: hovered.string,
                fret: hovered.fret,
                note: base
            }];

            let currentString = hovered.string;
            let prevMidi = base.midi;
            let prevFret = hovered.fret;
            const stringStep = way === "up" ? 1 : -1;

            const ascJumps = [];
            for (let i = 1; i < normalized.length; i++) {
                ascJumps.push(normalized[i] - normalized[i - 1]);
            }
            ascJumps.push(12 - normalized[normalized.length - 1]);

            const jumps = way === "up" ? ascJumps : [...ascJumps].reverse();
            let jumpIndex = 0;
            const maxSteps = Math.max(12, T.tuning.length * 12);

            for (let stepCount = 0; stepCount < maxSteps; stepCount++) {
                const jump = jumps[jumpIndex % jumps.length];
                jumpIndex++;

                // Regle penta 3+2: m3 => changement de corde; ton => meme corde.
                if (jump >= 3) {
                    currentString += stringStep;
                }

                if (currentString < 1 || currentString > T.tuning.length) break;

                const targetMidi = prevMidi + (way === "up" ? jump : -jump);
                const mids = T.findOctavedMidi(targetMidi, 0) || [];

                const directionFiltered = mids
                    .filter(m => way === "up" ? m > prevMidi : m < prevMidi)
                    .sort((a, b) => way === "up" ? a - b : b - a);

                const searchPool = directionFiltered.length > 0
                    ? directionFiltered
                    : mids.slice().sort((a, b) => Math.abs(a - targetMidi) - Math.abs(b - targetMidi));

                let bestPos = null;
                let bestScore = Infinity;

                for (const midi of searchPool) {
                    const pos = T.findNoteOnStringByMidi(currentString - 1, midi);
                    if (!pos) continue;

                    const pitchDist = Math.abs((pos.note?.midi ?? midi) - targetMidi);
                    const fretDist = Math.abs(pos.fret - prevFret);
                    const score = (pitchDist * 100) + fretDist;
                    if (score < bestScore) {
                        bestPos = pos;
                        bestScore = score;
                    }
                }

                if (!bestPos) continue;

                results.push(bestPos);
                prevMidi = bestPos.note?.midi ?? targetMidi;
                prevFret = bestPos.fret;
            }

            return results;
        }

        let results = [];
        let currentRoot = hovered;

        for (let i = 0; i < octaveShown; i++) {

            // 1. Box locale
            const part = this.dispatchBox(
                intervals,
                currentRoot,
                way,
                true,
                way === 'up' ? -1 : -4,
                way === 'up' ? +3 : 0
            );

            results = results.concat(part);

            // 2. Octave géométrique
            const nextRoot = T.computeGeometricOctave(currentRoot, way);
            if (!nextRoot) break;

            currentRoot = nextRoot;
        }

        return results;
    }

    computeGeometricOctave(root, way) {

    const inst = this.g.app.instrument;

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


    // ------------------------------------------------------------
    // 3NPS
    // ------------------------------------------------------------
dispatch3NPS(intervals, hovered, way, octaveShown = 1) {
    const T = this.g.app.instrument;
    const results = [];

    const base = T.getNoteAt(hovered.string - 1, hovered.fret);
    if (!base) return results;

    const startMidi = base.midi;

    // 3NPS piloté par pitch-classes de la gamme pour garder le mode intact
    // et couvrir toutes les cordes dans le sens demandé.
    const rootPc = base.index;
    const scalePcs = new Set(
        intervals.map(i => ((rootPc + i) % 12 + 12) % 12)
    );

    if (way === "up") {
        let currentString = hovered.string;
        let cursorMidi = startMidi;
        let firstGroup = true;

        while (currentString >= 1 && currentString <= T.tuning.length) {
            const candidates = [];

            for (let fret = 0; fret <= T.fretCount; fret++) {
                const raw = T.getNoteAt(currentString - 1, fret);
                if (!raw) continue;
                if (!scalePcs.has(raw.index)) continue;

                const isAboveCursor = firstGroup ? (raw.midi >= cursorMidi) : (raw.midi > cursorMidi);
                if (!isAboveCursor) continue;

                candidates.push({
                    string: currentString,
                    fret,
                    note: raw
                });
            }

            candidates.sort((a, b) => a.note.midi - b.note.midi);
            const group = candidates.slice(0, 3);
            if (group.length < 3) break;

            results.push(...group);
            cursorMidi = group[group.length - 1].note.midi;
            firstGroup = false;

            // Ascendant: après 3 notes, on passe à la corde plus aiguë.
            currentString += 1;
        }

        return results;
    }

    // Branche gauche: 3 notes descendantes par corde, puis corde plus grave.
    let currentString = hovered.string;
    let cursorMidi = startMidi;
    let firstGroup = true;

    while (currentString >= 1 && currentString <= T.tuning.length) {
        const candidates = [];

        for (let fret = 0; fret <= T.fretCount; fret++) {
            const raw = T.getNoteAt(currentString - 1, fret);
            if (!raw) continue;
            if (!scalePcs.has(raw.index)) continue;

            const isBelowCursor = firstGroup ? (raw.midi <= cursorMidi) : (raw.midi < cursorMidi);
            if (!isBelowCursor) continue;

            candidates.push({
                string: currentString,
                fret,
                note: raw
            });
        }

        candidates.sort((a, b) => b.note.midi - a.note.midi);
        const group = candidates.slice(0, 3);
        if (group.length < 3) break;

        results.push(...group);
        cursorMidi = group[group.length - 1].note.midi;
        firstGroup = false;

        // Corde plus grave après 3 notes.
        currentString -= 1;
    }

    return results;
}





}
