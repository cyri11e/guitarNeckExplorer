// ============================================================
// HARMONY DETECTOR — Détection d'accords et de gammes
// ============================================================

class HarmonyDetector {
    constructor(theory = null) {
        this.theory = theory;

        this.chordTemplates = [
            { key: "5",       intervals: [0, 7],        suffix: "5",        label: "powerchord" },
            { key: "maj",     intervals: [0, 4, 7],     suffix: "",         label: "triad" },
            { key: "min",     intervals: [0, 3, 7],     suffix: "m",        label: "triad" },
            { key: "dim",     intervals: [0, 3, 6],     suffix: "dim",      label: "triad" },
            { key: "aug",     intervals: [0, 4, 8],     suffix: "aug",      label: "triad" },
            { key: "sus2",    intervals: [0, 2, 7],     suffix: "sus2",     label: "sus" },
            { key: "sus4",    intervals: [0, 5, 7],     suffix: "sus4",     label: "sus" },
            { key: "7",       intervals: [0, 4, 7, 10], suffix: "7",        label: "7" },
            { key: "maj7",    intervals: [0, 4, 7, 11], suffix: "maj7",     label: "maj7" },
            { key: "min7",    intervals: [0, 3, 7, 10], suffix: "m7",       label: "m7" },
            { key: "mMaj7",   intervals: [0, 3, 7, 11], suffix: "mMaj7",    label: "mMaj7" },
            { key: "dim7",    intervals: [0, 3, 6, 9],  suffix: "dim7",     label: "dim7" },
            { key: "m7b5",    intervals: [0, 3, 6, 10], suffix: "m7b5",     label: "m7b5" },
            { key: "6",       intervals: [0, 4, 7, 9],  suffix: "6",        label: "6" },
            { key: "min6",    intervals: [0, 3, 7, 9],  suffix: "m6",       label: "m6" },
            { key: "add9",    intervals: [0, 2, 4, 7],  suffix: "add9",     label: "add9" },
            { key: "madd9",   intervals: [0, 2, 3, 7],  suffix: "madd9",    label: "add9" },
            { key: "7no5",    intervals: [0, 4, 10],    suffix: "7(no5)",   label: "7(no5)" },
            { key: "maj7no5", intervals: [0, 4, 11],    suffix: "maj7(no5)",label: "maj7(no5)" },
            { key: "m7no5",   intervals: [0, 3, 10],    suffix: "m7(no5)",  label: "m7(no5)" }
        ];

        this.scaleFamilies = [
            {
                key: "major",
                baseIntervals: [0, 2, 4, 5, 7, 9, 11],
                familyLabel: "gamme majeure",
                modes: ["ionien", "dorien", "phrygien", "lydien", "mixolydien", "éolien", "locrien"]
            },
            {
                key: "harmonicMinor",
                baseIntervals: [0, 2, 3, 5, 7, 8, 11],
                familyLabel: "gamme mineure harmonique",
                modes: ["mineure harmonique", "locrien 6", "ionien #5", "dorien #4", "phrygien dominant", "lydien #2", "altere bb7"]
            },
            {
                key: "melodicMinor",
                baseIntervals: [0, 2, 3, 5, 7, 9, 11],
                familyLabel: "gamme mineure melodique",
                modes: ["mineure melodique", "dorien b2", "lydien augmenté", "lydien dominant", "mixolydien b6", "locrien #2", "altere"]
            },
            {
                key: "pentatonic",
                baseIntervals: [0, 2, 4, 7, 9],
                familyLabel: "gamme pentatonique",
                modes: ["pentatonique majeure", "mode 2 pentatonique", "mode 3 pentatonique", "mode 4 pentatonique", "pentatonique mineure"]
            }
        ];
    }

    _mod12(v) {
        return ((v % 12) + 12) % 12;
    }

    _toSortedUnique(values) {
        const set = new Set();
        for (const v of (values || [])) {
            if (!Number.isFinite(v)) continue;
            set.add(this._mod12(v));
        }
        return Array.from(set).sort((a, b) => a - b);
    }

    _sameSet(a, b) {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    _relativeIntervals(pitchClasses, rootPc) {
        return this._toSortedUnique((pitchClasses || []).map(pc => this._mod12(pc - rootPc)));
    }

    _pcName(pc) {
        if (!this.theory?.getNoteName) return String(this._mod12(pc));
        return this.theory.getNoteName(this._mod12(pc));
    }

    _templatePriority(tpl) {
        if (!tpl) return 0;
        if (tpl.label === "triad") return 90;
        if (tpl.key === "5") return 80;
        if (tpl.key?.includes("no5")) return 40;
        return 70;
    }

    // Ancien extracteur (pitch classes seules) — conservé pour compatibilité.
    extractPitchClassesFromFrettedNotes(noteList, instrument) {
        return this.extractFromFrettedNotes(noteList, instrument).pcs;
    }

    // Extracteur complet: retourne { pcs, bassPc }.
    // bassPc = pitch class de la note au midi le plus grave.
    extractFromFrettedNotes(noteList, instrument) {
        const seenPc = new Set();
        const pcs = [];
        let bassMidi = Infinity;
        let bassPc = null;

        for (const n of (noteList || [])) {
            if (!n) continue;
            const raw = instrument?.getNoteAt?.(n.string - 1, n.fret);
            if (!raw) continue;

            if (!seenPc.has(raw.index)) {
                seenPc.add(raw.index);
                pcs.push(raw.index);
            }

            if (raw.midi < bassMidi) {
                bassMidi = raw.midi;
                bassPc = raw.index;
            }
        }

        pcs.sort((a, b) => a - b);
        return { pcs, bassPc };
    }

    analyzeVoicing(noteList) {
        const seenPositions = new Set();
        const uniqueStrings = new Set();
        let noteCount = 0;

        for (const note of (noteList || [])) {
            if (!note) continue;
            const posKey = `${note.string}:${note.fret}`;
            if (seenPositions.has(posKey)) continue;
            seenPositions.add(posKey);
            noteCount += 1;
            uniqueStrings.add(note.string);
        }

        const uniqueStringCount = uniqueStrings.size;
        const isArpeggio = noteCount > uniqueStringCount;

        return {
            noteCount,
            uniqueStringCount,
            isArpeggio,
            voicingLabel: isArpeggio ? "arpege" : "accord"
        };
    }

    detectChord(pitchClasses, bassPc = null) {
        const pcs = this._toSortedUnique(pitchClasses);
        if (pcs.length < 2) return null;

        const hasBass = Number.isFinite(bassPc);
        const bassNorm = hasBass ? this._mod12(bassPc) : null;

        // Collecte tous les matches possibles.
        const allMatches = [];
        for (const rootPc of pcs) {
            const rel = this._relativeIntervals(pcs, rootPc);
            for (const tpl of this.chordTemplates) {
                if (!this._sameSet(rel, tpl.intervals)) continue;
                allMatches.push({ rootPc, tpl });
            }
        }

        if (allMatches.length === 0) return null;

        // Priorité: fondamentale à la basse + qualité/template (triades avant no5).
        const best = allMatches.reduce((bestMatch, candidate) => {
            if (!bestMatch) return candidate;

            const bestBass = hasBass && bestMatch.rootPc === bassNorm ? 1 : 0;
            const candBass = hasBass && candidate.rootPc === bassNorm ? 1 : 0;
            if (candBass !== bestBass) {
                return candBass > bestBass ? candidate : bestMatch;
            }

            const bestPrio = this._templatePriority(bestMatch.tpl);
            const candPrio = this._templatePriority(candidate.tpl);
            if (candPrio !== bestPrio) {
                return candPrio > bestPrio ? candidate : bestMatch;
            }

            return bestMatch;
        }, null);

        const { rootPc, tpl } = best;
        const rootName = this._pcName(rootPc);

        const isInversion = hasBass && bassNorm !== rootPc;
        const bassName = isInversion ? this._pcName(bassNorm) : null;

        // Calcule le numéro de renversement (position du bass dans les intervalles du template)
        let inversionNumber = 0;
        if (isInversion) {
            const bassInterval = this._mod12(bassNorm - rootPc);
            const idx = tpl.intervals.indexOf(bassInterval);
            inversionNumber = idx > 0 ? idx : 1;  // idx dans les intervalles du template
        }

        const symbol = isInversion
            ? `${rootName}${tpl.suffix}/${bassName}`
            : `${rootName}${tpl.suffix}`;

        return {
            rootPc,
            rootName,
            chordKey: tpl.key,
            quality: tpl.label,
            bassPc: bassNorm,
            bassName,
            isInversion,
            inversionNumber,
            symbol,
            label: symbol
        };
    }

    _buildModeIntervals(baseIntervals) {
        const out = [];
        for (let i = 0; i < baseIntervals.length; i++) {
            const shift = baseIntervals[i];
            const modeSet = this._toSortedUnique(baseIntervals.map(v => this._mod12(v - shift)));
            out.push(modeSet);
        }
        return out;
    }

    _findScaleMatches(pcs) {
        const matches = [];

        for (const family of this.scaleFamilies) {
            const modeSets = this._buildModeIntervals(family.baseIntervals);

            for (let rootPc = 0; rootPc < 12; rootPc++) {
                const rel = this._relativeIntervals(pcs, rootPc);

                for (let modeIndex = 0; modeIndex < modeSets.length; modeIndex++) {
                    if (!this._sameSet(rel, modeSets[modeIndex])) continue;

                    const modeName = family.modes[modeIndex] || `mode ${modeIndex + 1}`;
                    matches.push({
                        rootPc,
                        rootName: this._pcName(rootPc),
                        familyKey: family.key,
                        familyLabel: family.familyLabel,
                        modeIndex,
                        modeName,
                        label: `${this._pcName(rootPc)} ${modeName}`
                    });
                }
            }
        }

        return matches;
    }

    detectScale(pitchClasses, tonicPc = null) {
        const pcs = this._toSortedUnique(pitchClasses);
        if (pcs.length < 3) return null;

        const matches = this._findScaleMatches(pcs);
        if (matches.length === 0) return null;

        // Sans tonique: on ne donne que l'echelle/famille.
        if (!Number.isFinite(tonicPc)) {
            const families = [...new Set(matches.map(m => m.familyKey))];
            if (families.length !== 1) {
                return {
                    ambiguous: true,
                    familyLabel: "gamme",
                    label: "gamme"
                };
            }

            const fam = matches.find(m => m.familyKey === families[0]);
            return {
                familyKey: fam.familyKey,
                familyLabel: fam.familyLabel,
                label: fam.familyLabel
            };
        }

        // Avec tonique: on resolve mode + tonique.
        const tonic = this._mod12(tonicPc);
        const withTonic = matches.find(m => m.rootPc === tonic);
        if (withTonic) {
            return {
                ...withTonic,
                refinedByTonic: true,
                label: `${withTonic.rootName} ${withTonic.modeName}`
            };
        }

        // Tonic donnee mais aucun mode coherent: fallback famille si possible.
        const familySet = [...new Set(matches.map(m => m.familyKey))];
        if (familySet.length === 1) {
            const fam = matches.find(m => m.familyKey === familySet[0]);
            return {
                familyKey: fam.familyKey,
                familyLabel: fam.familyLabel,
                ambiguous: true,
                label: fam.familyLabel
            };
        }

        return {
            ambiguous: true,
            familyLabel: "gamme",
            label: "gamme"
        };
    }

    analyzePitchClassSet(pitchClasses, tonicPc = null, bassPc = null) {
        const pcs = this._toSortedUnique(pitchClasses);
        if (pcs.length === 0) {
            return {
                pitchClasses: [],
                chord: null,
                scale: null,
                label: "—"
            };
        }

        const chord = this.detectChord(pcs, bassPc);
        const scale = this.detectScale(pcs, tonicPc);

        let label = "unknown";
        if (chord) {
            label = chord.label;
        } else if (scale) {
            label = scale.label;
        }

        return {
            pitchClasses: pcs,
            chord,
            scale,
            label,
            isTriad: chord?.quality === "triad"
        };
    }
}
