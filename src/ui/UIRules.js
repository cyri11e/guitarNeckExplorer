// ui_rules.js
const LOOP_MODES = {
    OFF: 0,
    ONE_SHOT: 1,
    ALL_SHOT: 2,
    ONE_LOOP: 3,
    ALL_LOOP: 4
};

const TRREC_EXPORT_TYPE = "guitarNeckExplorer.trrec";
const TRREC_EXPORT_VERSION = 1;

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function normalizeStepEtat(value) {
    if (value === 2) return 2;
    if (value === 1) return 1;
    return 0;
}

function sanitizeTabFrets(tabFrets) {
    if (!tabFrets || typeof tabFrets !== "object") return null;

    const out = {};
    for (const [k, v] of Object.entries(tabFrets)) {
        const stringNumber = Number(k);
        const fret = Number(v);
        if (!Number.isFinite(stringNumber) || !Number.isFinite(fret)) continue;
        if (stringNumber < 1 || stringNumber > 6) continue;
        if (fret < 0) continue;
        out[String(stringNumber)] = Math.round(fret);
    }

    return Object.keys(out).length > 0 ? out : null;
}

function buildSnapshotFromTabFrets(tabFrets) {
    const safeTabFrets = sanitizeTabFrets(tabFrets);
    const selectedNotes = [];

    if (safeTabFrets) {
        for (const [stringKey, fretValue] of Object.entries(safeTabFrets)) {
            selectedNotes.push({
                string: Number(stringKey),
                fret: Number(fretValue),
                displayMode: "note"
            });
        }
    }

    return {
        title: "__tab__",
        pinnedNotes: [],
        selectedNotes,
        root: null,
        markerSegments: [],
        harmonyName: null
    };
}

function sanitizeSnapshot(snap) {
    const src = snap || {};
    const harmonyName = String(src.harmonyName ?? "").trim();
    return {
        title: String(src.title ?? "Snapshot"),
        pinnedNotes: Array.isArray(src.pinnedNotes) ? deepClone(src.pinnedNotes) : [],
        selectedNotes: Array.isArray(src.selectedNotes) ? deepClone(src.selectedNotes) : [],
        root: src.root ?? null,
        markerSegments: Array.isArray(src.markerSegments) ? deepClone(src.markerSegments) : [],
        harmonyName: harmonyName || null
    };
}

function queueSnapshotInNextFreeTRRecSlot(trRec, snapshotIndex, snapshotTitle) {
    if (!trRec || !Number.isInteger(snapshotIndex)) return false;

    if (!Array.isArray(trRec.measures) || trRec.measures.length === 0) {
        trRec.measures = [trRec.createEmptyMeasure()];
        trRec.measureIndex = 0;
        trRec.states = trRec.measures[0];
    }

    const padCount = Number.isFinite(trRec.padCount) ? trRec.padCount : 16;
    const startMeasure = Number.isFinite(trRec.measureIndex) ? trRec.measureIndex : 0;
    const selectedStart = Number.isFinite(trRec.selectedGroupStart) ? trRec.selectedGroupStart : 0;
    const playStart = Number.isFinite(trRec.playIndex) ? trRec.playIndex : 0;
    const startIndex = Math.max(0, Math.min(padCount - 1, Math.max(selectedStart, playStart)));

    let targetMeasure = -1;
    let targetStep = -1;

    for (let measureIndex = startMeasure; measureIndex < trRec.measures.length; measureIndex++) {
        const measure = trRec.measures[measureIndex];
        if (!Array.isArray(measure)) continue;

        const stepStart = (measureIndex === startMeasure) ? startIndex : 0;
        for (let stepIndex = stepStart; stepIndex < padCount; stepIndex++) {
            const step = measure[stepIndex];
            if (!step || normalizeStepEtat(step.etat) === 0) {
                targetMeasure = measureIndex;
                targetStep = stepIndex;
                break;
            }
        }

        if (targetMeasure >= 0) break;
    }

    if (targetMeasure < 0) {
        trRec.measures.push(trRec.createEmptyMeasure());
        targetMeasure = trRec.measures.length - 1;
        targetStep = 0;
    }

    const measure = trRec.measures[targetMeasure];
    const step = typeof trRec.createEmptyStep === "function"
        ? trRec.createEmptyStep()
        : { etat: 0, highlight: false, flash: 0, item: null, itemIndex: null, tabFrets: null };

    step.etat = 1;
    step.item = snapshotTitle;
    step.itemIndex = snapshotIndex;
    step.tabFrets = null;
    measure[targetStep] = step;

    if (targetMeasure === trRec.measureIndex) {
        trRec.states = measure;
    }

    trRec.invalidate?.();
    return true;
}

function createTRRecExportPayload(components) {
    const guitar = components.find(c => c.name === "guitar1");
    const trRec = components.find(c => c.name === "trRecPads");
    if (!guitar || !trRec) return null;

    const measures = Array.isArray(trRec.measures) ? trRec.measures : [];
    const snapshots = Array.isArray(guitar.snapshots) ? guitar.snapshots : [];

    const usedIndexSet = new Set();

    const sequence = measures.map(measure => {
        const steps = Array.isArray(measure) ? measure : [];
        return steps.map(step => {
            const etat = normalizeStepEtat(step?.etat);
            const hasIdx = Number.isInteger(step?.itemIndex);
            const itemIndex = hasIdx ? step.itemIndex : null;

            if (itemIndex != null && itemIndex >= 0) {
                usedIndexSet.add(itemIndex);
            }

            const out = { etat, itemIndex };

            const tabFrets = sanitizeTabFrets(step?.tabFrets);
            if (tabFrets) {
                out.tabFrets = tabFrets;
            }

            if (itemIndex == null && step?.item != null) {
                out.item = String(step.item);
            }

            return out;
        });
    });

    const usedIndices = [...usedIndexSet]
        .filter(i => i >= 0 && i < snapshots.length)
        .sort((a, b) => a - b);

    const dependencies = usedIndices.map(sourceIndex => ({
        sourceIndex,
        snapshot: sanitizeSnapshot(snapshots[sourceIndex])
    }));

    return {
        type: TRREC_EXPORT_TYPE,
        version: TRREC_EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        padCount: trRec.padCount,
        sequence,
        dependencies
    };
}

function downloadJSON(payload, filename) {
    if (!payload) return;

    const blob = new Blob([
        JSON.stringify(payload, null, 2)
    ], { type: "application/json" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function pickJSONFile(onData, onError) {
    let input = document.getElementById("trrec-import-input");

    if (!input) {
        input = document.createElement("input");
        input.type = "file";
        input.id = "trrec-import-input";
        input.accept = "application/json,.json";
        input.style.display = "none";
        document.body.appendChild(input);
    }

    input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result ?? "{}"));
                onData?.(parsed);
            } catch (err) {
                onError?.(err);
            }
            input.value = "";
        };
        reader.onerror = () => {
            onError?.(new Error("read-error"));
            input.value = "";
        };
        reader.readAsText(file);
    };

    input.click();
}

function applyTRRecImportPayload(components, payload) {
    if (!payload || payload.type !== TRREC_EXPORT_TYPE) {
        throw new Error("invalid-type");
    }

    const guitar = components.find(c => c.name === "guitar1");
    const trRec = components.find(c => c.name === "trRecPads");
    const lcd2 = components.find(c => c.name === "lcd2");
    if (!guitar || !trRec || !lcd2) {
        throw new Error("missing-components");
    }

    const depsRaw = Array.isArray(payload.dependencies) ? payload.dependencies : [];
    const importedSnapshots = depsRaw.map(d => sanitizeSnapshot(d?.snapshot ?? d));

    const sourceToImported = new Map();
    depsRaw.forEach((d, idx) => {
        if (Number.isInteger(d?.sourceIndex)) {
            sourceToImported.set(d.sourceIndex, idx);
        }
    });

    guitar.snapshots = importedSnapshots;

    lcd2.items = guitar.snapshots.map(s => s.title);
    lcd2.isOn = lcd2.items.length > 0;
    lcd2.state = lcd2.items.length > 0 ? 0 : 0;
    lcd2.invalidate();

    const incomingMeasures = Array.isArray(payload.sequence) ? payload.sequence : [];
    const expectedPadCount = trRec.padCount;

    const rebuiltMeasures = incomingMeasures.map(measure => {
        const row = Array.isArray(measure) ? measure : [];
        return Array.from({ length: expectedPadCount }, (_, i) => {
            const raw = row[i] || {};
            const etat = normalizeStepEtat(raw.etat);

            let newItemIndex = null;
            if (Number.isInteger(raw.itemIndex)) {
                if (sourceToImported.has(raw.itemIndex)) {
                    newItemIndex = sourceToImported.get(raw.itemIndex);
                } else if (raw.itemIndex >= 0 && raw.itemIndex < guitar.snapshots.length) {
                    newItemIndex = raw.itemIndex;
                }
            }

            const step = trRec.createEmptyStep();

            // ON exige une dependance valide; DISABLED peut rester sans item pour servir de coupe.
            if (etat === 1 && newItemIndex == null) {
                return step;
            }

            step.etat = etat;
            step.itemIndex = newItemIndex;
            step.item = (newItemIndex != null)
                ? lcd2.items[newItemIndex]
                : (raw.item ?? null);
            step.tabFrets = sanitizeTabFrets(raw.tabFrets);

            return step;
        });
    });

    trRec.measures = rebuiltMeasures.length > 0
        ? rebuiltMeasures
        : [trRec.createEmptyMeasure()];

    trRec.setMeasureIndex(0);
    trRec.playIndex = 0;
    trRec.invalidate();

    guitar.invalidate();
}

function stopTRRecPlayback(components) {
    const bpm = components.find(c => c.name === "bpmCtrl");
    const playBtn = components.find(c => c.name === "playBtn");
    const guitar = components.find(c => c.name === "guitar1");

    const clearSeqHoldPulse = (list) => {
        if (!Array.isArray(list)) return;
        for (const n of list) {
            if (!n) continue;
            delete n.seqHoldPulse;
            delete n.seqHoldPulseStart;
            delete n.seqHoldPulseFrequency;
            delete n.seqHoldPulseAlphaMin;
            delete n.seqHoldPulseAlphaMax;
            delete n.seqHoldPulseScale;
        }
    };

    clearSeqHoldPulse(guitar?.pinnedNotes);
    clearSeqHoldPulse(guitar?.selectedNotes);
    guitar?.invalidate?.();

    if (bpm) {
        bpm.isPlaying = false;
        bpm.ledPhase = 0;
        bpm.invalidate();
    }

    if (playBtn && playBtn.state !== 0) {
        playBtn.state = 0;
        playBtn.invalidate();
    }
}

function resetTRRecPosition(trRec, loopMode) {
    if (!trRec) return;

    if (loopMode === LOOP_MODES.ALL_SHOT || loopMode === LOOP_MODES.ALL_LOOP) {
        trRec.setMeasureIndex(0);
    }

    trRec.playIndex = 0;

    if (Array.isArray(trRec.states)) {
        for (const step of trRec.states) {
            if (step) step.highlight = false;
        }
    }

    trRec.invalidate();
}

function isSnapshotReferencedInTRRec(trRec, snapshotIndex) {
    if (!trRec || !Array.isArray(trRec.measures)) return false;

    for (const measure of trRec.measures) {
        if (!Array.isArray(measure)) continue;
        for (const step of measure) {
            if (!step) continue;
            if (step.itemIndex === snapshotIndex) return true;
        }
    }

    return false;
}

function reindexTRRecSnapshotRefs(trRec, removedIndex, snapshotTitles) {
    if (!trRec || !Array.isArray(trRec.measures)) return;

    for (const measure of trRec.measures) {
        if (!Array.isArray(measure)) continue;
        for (const step of measure) {
            if (!step || !Number.isInteger(step.itemIndex)) continue;

            if (step.itemIndex > removedIndex) {
                step.itemIndex -= 1;
            }

            if (step.itemIndex >= 0 && step.itemIndex < snapshotTitles.length) {
                step.item = snapshotTitles[step.itemIndex];
            } else {
                step.item = null;
                if (step.etat === 1) {
                    step.etat = 0;
                }
            }
        }
    }
}

function syncModeChordsPanel(components) {
    const panel = components.find(c => c.name === "modeChordsPanel1");
    const guitar = components.find(c => c.name === "guitar1");
    const knobDeg = components.find(c => c.name === "knob13457");
    const lcd = components.find(c => c.name === "lcd1");
    const accidentalSw = components.find(c => c.name === "metalSwitch1");

    if (!panel || !guitar) return;

    // Le mode affiché n'est réaffecté que quand le mode "gamme" est actif.
    if (knobDeg?.state === 4) {
        const modeName = lcd?.items?.[lcd.state];
        if (modeName) panel.setMode(modeName);
    }

    const rootIndex = guitar.theory?.hasRoot?.() ? guitar.theory.root : null;
    panel.setRootContext(rootIndex, guitar.labelType, guitar.theory);

    const pendingUseFlats = panel.consumePendingUseFlats?.();
    if (typeof pendingUseFlats === "boolean" && accidentalSw) {
        accidentalSw.setState(pendingUseFlats ? 0 : 1);
    }
}

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

    },

    // KNOB2 → change displayMode
    (components, source, newState) => {
        if (source.name !== "knob2") return;

        const guitar = components.find(c => c.name === "guitar1");
        if (!guitar) return;

        if (newState === 0) guitar.setDisplayMode("note"); // N
        if (newState === 1) guitar.setDisplayMode("degree"); // D
        if (newState === 2) guitar.setDisplayMode("none");   // P
    },


// ============================================================
// METALSWITCH EN/FR → displayMode
// ============================================================
// METALSWITCH EN/FR → langue
(components, source, newState) => {

    const sw = components.find(c => c.name === "metalSwitchENFR");
    if (source !== sw) return;

    const guitar = components.find(c => c.name === "guitar1");
    const cof    = components.find(c => c.name === "cof1");
    if (!guitar || !cof) return;

    const labelType = (newState === 0) ? "noteEN" : "noteFR";

    // 🎸 guitare : on change la langue, PAS displayMode
    guitar.setLabelType(labelType);
    guitar.invalidate();

    cof.setLabelType(labelType);
    cof.invalidate();
},


// ============================================================
// COF → GUITAR : priorité au hover, click = root persistante
// ============================================================
(components, source, newState) => {

    const cof    = components.find(c => c.name === "cof1");
    const guitar = components.find(c => c.name === "guitar1");
    if (!cof || !guitar) return;

    // On ne réagit qu’aux changements venant du COF
    if (source !== cof) return;

    const hover = cof.hoverIndex;   // priorité
    const root  = cof.rootIndex;    // fallback

    let activeIndex = null;

    if (hover !== -1 && hover !== null) {
        activeIndex = hover;        // priorité absolue
    } else if (root !== null) {
        activeIndex = root;         // fallback
    }

    if (activeIndex === null) {
        guitar.theory.root = null;
        guitar.invalidate();
        return;
    }

    const noteIndex = cof.chroma[activeIndex];
    guitar.theory.root = noteIndex;
    guitar.invalidate();
},
// KNOB1 → hoverMode
(components, source, newState) => {
    if (source.name !== "knob1") return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    if (newState === 0) guitar.hoverMode = "cursor"; // C
    if (newState === 1) guitar.hoverMode = "note";   // N
    if (newState === 2) guitar.hoverMode = "octave"; // T

    guitar.invalidate();
},

// ============================================================
// COF (clic root) → GUITAR : animation highlight des roots
// ============================================================
(components, source, evt) => {

    const cof    = components.find(c => c.name === "cof1");
    const guitar = components.find(c => c.name === "guitar1");
    if (!cof || !guitar) return;

    // On ne réagit qu’aux événements venant du COF
    if (source !== cof) return;

    if (!evt) return;

    // --- 1) CLIC SEGMENT : choix root ---
    if (evt.type === "root") {

        // root désélectionnée → rien
        if (evt.index === null) return;

        const noteIndex = cof.chroma[evt.index];

        // highlight automatique
        guitar.highlightNote(noteIndex);
        return;
    }

    // --- 2) CLIC CENTRAL : highlight ONLY ---
    if (evt.type === "highlight") {

        const noteIndex = evt.pc;   // pc envoyé par le COF
        guitar.highlightNote(noteIndex);
        return;
    }
},


// ============================================================
// GUITAR (CTRL + clic) → définir une nouvelle root
// ============================================================
(components, source, evt) => {

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    // On ne réagit qu’aux événements venant du Guitar
    if (source !== guitar) return;

    // On ne traite que les événements onChange()
    if (!evt || evt.type !== "noteClick") return;

    // CTRL doit être enfoncé
    if (!evt.ctrlKey) return;

    const { fret, string } = evt;

    const raw = guitar.instrument.getNoteAt(string - 1, fret);
    if (!raw) return;

    guitar.theory.setRoot(raw.index);

// notifier les autres composants (comme COF)
guitar.onChange?.({
    type: "root",
    index: raw.index
});

guitar.invalidate();

},

// ============================================================
// Quand Guitar change la root → COF doit se mettre à jour
// ============================================================
(components, source, evt) => {

    if (!evt || evt.type !== "root") return;

    const guitar = components.find(c => c.name === "guitar1");
    const cof = components.find(c => c.name === "cof1");

    if (!guitar || !cof) return;

    // Si la root vient de la guitare
    if (source === guitar) {
        const segIndex = Array.isArray(cof.chroma) ? cof.chroma.indexOf(evt.index) : -1;
        cof.rootIndex = segIndex >= 0 ? segIndex : null;
        cof.invalidate();
    }
},
// ============================================================
// MARKER SELECTOR → GUITAR
// ============================================================
(components, source, evt) => {

    // 1) Trouver le MarkerSelector
    const marker = components.find(c => c.name === "markerSelector1");
    if (!marker) return;

    // 2) On ne réagit que si c’est LUI la source
    if (source !== marker) return;

    // 3) Trouver la guitare
    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    // 4) Toggle ON/OFF
    if (evt.type === "markerToggle") {
        guitar.markerMode = (evt.state === 1);
        guitar.markerPendingPoint = null;

        guitar.invalidate();
        return;
    }

    // 5) Changement de couleur
    if (evt.type === "markerColor") {
        guitar.markerColor = marker.noteColors[evt.index];

        guitar.invalidate();
        return;
    }
},


// RÈGLE : switchDeg1 ↔ autres switchesDeg
(components, source, newState) => {

    // On ne s'intéresse qu'aux switchesDeg
    if (!source.name.startsWith("switchDeg")) return;

    // Récupérer tous les switchesDeg
    const switches = components.filter(c => c.name.startsWith("switchDeg"));
    const root     = switches.find(c => c.name === "switchDeg1");
    if (!root) return;

    // --- CAS 1 : un switch (2–7) est activé → root ON ---
    if (source !== root && newState !== 0) {
        if (root.state === 0) {
            root.setState(1);
        }
        return;
    }

    // --- CAS 2 : tous les switches (2–7) sont OFF → root OFF ---
    if (source !== root && newState === 0) {

        // Vérifier si tous les autres sont OFF
        const othersOn = switches.some(sw =>
            sw !== root && sw.state !== 0
        );

        if (!othersOn && root.state !== 0) {
            root.setState(0);
        }

        return;
    }

    // --- CAS 3 : root OFF → tout le monde OFF ---
    if (source === root && newState === 0) {
        for (const sw of switches) {
            if (sw !== root && sw.state !== 0) {
                sw.setState(0);
            }
        }
        return;
    }
},

(components, source, newState) => {

    if (!source.name.startsWith("switchDeg")) return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    const MAJOR = {
        1: 0,
        2: 2,
        3: 4,
        4: 5,
        5: 7,
        6: 9,
        7: 11
    };

    const ALTER = {
        1: { 1: 0, 2: 0 },
        2: { 1: 0, 2: -1 },
        3: { 1: 0, 2: -1 },
        4: { 1: 0, 2: +1 },
        5: { 1: 0, 2: -1, 3: +1 },
        6: { 1: 0, 2: -1 },
        7: { 1: 0, 2: -1, 4: -2 }
    };

    const intervals = [];

    for (let i = 1; i <= 7; i++) {

        const sw = components.find(c => c.name === "switchDeg" + i);
        if (!sw) continue;

        const state = sw.state;
        if (state === 0) continue; // OFF

        const degree = parseInt(sw.name.replace("switchDeg", ""));


        let interval = MAJOR[degree];

        const adj = ALTER[degree][state];
        if (adj != null) interval += adj;

        intervals.push(interval);
    }
    guitar.intervals = intervals;
    
    guitar.multiNotes = intervals.length > 0; 
    guitar.resolveMultiNotes();
    guitar.invalidate();
},


// ============================================================
// KNOB MULTI CURSOR → synchronise le mode multinote sur l'index du knob
// ============================================================
(components, source, newState) => {

    if (source.name !== "knobMultiCursor") return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    const modes = Array.isArray(guitar.intervalModes) ? guitar.intervalModes : [];
    const selectedMode = modes[newState];
    if (!selectedMode) return;

    guitar.setIntervalMode(selectedMode);
},

// ============================================================
// METALSWITCH WOOD → change la couleur du bois de la guitare
// ============================================================
(components, source, newState) => {

    const sw = components.find(c => c.name === "metalWood");
    if (source !== sw) return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    // 0 = rosewood, 1 = mapple
    const wood = (newState === 0) ? "rosewood" : "mapple";

    guitar.setWoodColor(wood);
},
// ============================================================
// METALSWITCH INLAY → change le style des repères (inlays)
// ============================================================
(components, source, newState) => {

    const sw = components.find(c => c.name === "knobInlays");
    if (source !== sw) return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    // 0 = dots
    // 1 = superStrat
    // 2 = trapeze
    const map = ["dots", "superstrat", "trapeze"];

    const style = map[newState] || "dots";

    guitar.setInlayStyle(style);
},

// ============================================================
// METAL WAY → met à jour le sens intervalWay (up/down)
// ============================================================
(components, source, newState) => {

    if (source.name !== "metalWay") return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    // newState = 1 → up (↗)
    // newState = 0 → down (↙)
    guitar.intervalWay = newState === 1 ? "up" : "down";
},

// RÈGLE : knob13457 → presets automatiques des switchDeg
(components, source, newState) => {

    if (source.name !== "knob13457") return;

    const switches = components.filter(c => c.name.startsWith("switchDeg"));
    const lcd = components.find(c => c.name === "lcd1");

    const set = (deg, state) => {
        const sw = switches.find(s => s.name === "switchDeg" + deg);
        if (sw && sw.state !== state) sw.setState(state);
    };

    // 1) Tout OFF d'abord
    for (let i = 1; i <= 7; i++) set(i, 0);

    // 2) Appliquer le preset selon l'INDEX du knob
    switch (newState) {

        case 0: // "1" / Unique
            // Éteindre le LCD aussi
            if (lcd) {
                lcd.setOnOff(false);
                lcd.setItems([]);
                lcd.setIndex(0);
            }
            break;

        case 1: // Triade
            set(3, 1);
            set(5, 1);
            break;

        case 2: // Tetrade
            set(3, 1);
            set(5, 1);
            set(7, 1);
            break;

        case 3: // Pentatonique
            set(2, 1);
            set(3, 1);
            set(5, 1);
            set(6, 1);
            break;

        case 4: // Diatonique
            set(2, 1);
            set(3, 1);
            set(4, 1);
            set(5, 1);
            set(6, 1);
            set(7, 1);
            break;
    }
},


// KNOB OCTAVES → met à jour g.octaveShown
(components, source, newState) => {

    const knob = components.find(c => c.name === "knobOctaves");
    if (source !== knob) return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    // Récupère l’item sélectionné : "1", "2", "3", "T"
    const item = knob.items[newState];
    if (!item) return;

    // Mise à jour directe dans guitar.js
    guitar.octaveShown = item.symbol; // "1", "2", "3", "T"

    guitar.invalidate();
},

// KNOB INVERSIONS → met à jour g.inversion
(components, source, newState) => {

    const knob = components.find(c => c.name === "knobInversions");
    if (source !== knob) return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    // newState = 0 → "R"
    // newState = 1 → "1st Inv"
    // newState = 2 → "2nd Inv"
    // newState = 3 → "3rd Inv"
    guitar.inversion = newState; // 0,1,2,3

    guitar.invalidate();
},

// ============================================================
// KNOB MULTI CURSOR → presets automatiques
// ============================================================
(components, source, newState) => {

    if (source.name !== "knobMultiCursor") return;

    const guitar   = components.find(c => c.name === "guitar1");
    const knobDeg  = components.find(c => c.name === "knob13457");
    const knobOct  = components.find(c => c.name === "knobOctaves");
    const metalWay = components.find(c => c.name === "metalWay");

    const swCAGED = components.find(c => c.name === "metalCAGED");
    if (swCAGED) swCAGED.setState(1); // ACTIVE CAGED


    if (!guitar || !knobDeg || !knobOct || !metalWay) return;

    // --- ACCORD (index 1) ---
    if (newState === 1) {
        knobDeg.state = 1;  // Triade
        knobOct.state = 1;  // 2 octaves
        guitar.invalidate();
        return;
    }

    // --- BOX (index 2 ou 3) ---
    // if (newState === 2 || newState === 3) {
    //     knobDeg.state = 3;  // Pentatonique
    //     knobOct.state = 2;  // 2 octaves
    //     metalWay.state = 1; // ascendant
    //     guitar.invalidate();
    //     return;
    // }

    // --- 3NPS (4) ou DIAGONAL (5) ---
    if (newState === 4 || newState === 5) {
        knobDeg.state = 4;  // Diatonique
        knobOct.state = 1;  // 2 octaves
        metalWay.state = 1; // ascendant
        if (swCAGED) swCAGED.setState(0);
        guitar.invalidate();
        return;
    }
},

// ============================================================
// METALSWITCH CAGED → active/désactive le mode CAGED Overlay
// ============================================================
(components, source, newState) => {

    const sw = components.find(c => c.name === "metalCAGED");
    if (source !== sw) return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    // newState = 1 → ON (topLabel)
    // newState = 0 → OFF (bottomLabel)
    guitar.cagedOV = (newState === 1);

    guitar.invalidate();
},

// KNOB13457 → configure LCD1 selon le mode
(components, source, newState) => {

    if (source.name !== "knob13457") return;

    const lcd = components.find(c => c.name === "lcd1");
    if (!lcd) return;

    // RESET LCD
    lcd.setOnOff(true);

    switch (newState) {

        case 0: // Unique
            lcd.setOnOff(false);
            lcd.setItems([]);
            lcd.setIndex(0);
            return;

        case 1: // Triade
            lcd.setItems(["Majeur", "Mineur", "Diminué", "Augmenté"]);
            lcd.setIndex(0);
            return;

        case 2: // Tétrade
            lcd.setItems(["Maj7", "7(dom)", "m7", "m7b5", "dim7", "mMaj7"]);
            lcd.setIndex(0);
            return;

        case 3: // Pentatonique
            lcd.setItems(["Maj Penta", "Min Penta"]);
            lcd.setIndex(0);
            return;

        case 4: // Diatonique
            lcd.setItems([
                "Ionien",
                "Dorien",
                "Phrygien",
                "Lydien",
                "Mixolydien",
                "Eolien",
                "Locrien"
            ]);
            lcd.setIndex(0);
            return;
    }
},
// LCD1 → met à jour les switchDeg selon l’item sélectionné
(components, source, newState) => {

    if (source.name !== "lcd1") return;

    const knobDeg = components.find(c => c.name === "knob13457");
    if (!knobDeg) return;

    const lcd = source;

    // Récupération des switches
    const sw2 = components.find(c => c.name === "switchDeg2");
    const sw3 = components.find(c => c.name === "switchDeg3");
    const sw4 = components.find(c => c.name === "switchDeg4");
    const sw5 = components.find(c => c.name === "switchDeg5");
    const sw6 = components.find(c => c.name === "switchDeg6");
    const sw7 = components.find(c => c.name === "switchDeg7");

    // RESET propre
    const reset = () => {
        sw2?.setState(0);
        sw3?.setState(0);
        sw4?.setState(0);
        sw5?.setState(0);
        sw6?.setState(0);
        sw7?.setState(0);
    };

    const value = lcd.items[newState];

    // ------------------------------------------------------------
    // TRIADES
    // ------------------------------------------------------------
    if (knobDeg.state === 1) {
        reset();

        if (value === "Majeur") {
            sw3.setState(1);
            sw5.setState(1);
        }
        if (value === "Mineur") {
            sw3.setState(2);
            sw5.setState(1);
        }
        if (value === "Diminué") {
            sw3.setState(2);
            sw5.setState(2);
        }
        if (value === "Augmenté") {
            sw3.setState(1);
            sw5.setState(3);
        }
        return;
    }

    // ------------------------------------------------------------
    // TÉTRADES
    // ------------------------------------------------------------
    if (knobDeg.state === 2) {
        reset();

        if (value === "Maj7") {
            sw3.setState(1);
            sw5.setState(1);
            sw7.setState(1);
        }
        if (value === "7(dom)") {
            sw3.setState(1);
            sw5.setState(1);
            sw7.setState(2);
        }
        if (value === "m7") {
            sw3.setState(2);
            sw5.setState(1);
            sw7.setState(2);
        }
        if (value === "m7b5") {
            sw3.setState(2);
            sw5.setState(2);
            sw7.setState(2);
        }
        if (value === "dim7") {
            sw3.setState(2);
            sw5.setState(2);
            sw7.setState(4);
        }
        if (value === "mMaj7") {
            sw3.setState(2);
            sw5.setState(1);
            sw7.setState(1);
        }
        return;
    }

    // ------------------------------------------------------------
    // PENTATONIQUES
    // ------------------------------------------------------------
    if (knobDeg.state === 3) {
        reset();

        if (value === "Maj Penta") {
            sw2.setState(1);
            sw3.setState(1);
            sw5.setState(1);
            sw6.setState(1);
        }
        if (value === "Min Penta") {
            sw3.setState(2);
            sw4.setState(1);
            sw5.setState(1);
            sw7.setState(2);
        }
        return;
    }

    // ------------------------------------------------------------
    // DIATONIQUE
    // ------------------------------------------------------------
    if (knobDeg.state === 4) {
        reset();

        if (value === "Ionien") {
            sw2.setState(1);
            sw3.setState(1);
            sw4.setState(1);
            sw5.setState(1);
            sw6.setState(1);
            sw7.setState(1);
        }
        if (value === "Dorien") {
            sw2.setState(1);
            sw3.setState(2);
            sw4.setState(1);
            sw5.setState(1);
            sw6.setState(1);
            sw7.setState(2);
        }
        if (value === "Phrygien") {
            sw2.setState(2);
            sw3.setState(2);
            sw4.setState(1);
            sw5.setState(1);
            sw6.setState(2);
            sw7.setState(2);
        }
        if (value === "Lydien") {
            sw2.setState(1);
            sw3.setState(1);
            sw4.setState(3);
            sw5.setState(1);
            sw6.setState(1);
            sw7.setState(1);
        }
        if (value === "Mixolydien") {
            sw2.setState(1);
            sw3.setState(1);
            sw4.setState(1);
            sw5.setState(1);
            sw6.setState(1);
            sw7.setState(2);
        }
        if (value === "Eolien") {
            sw2.setState(1);
            sw3.setState(2);
            sw4.setState(1);
            sw5.setState(1);
            sw6.setState(2);
            sw7.setState(2);
        }
        if (value === "Locrien") {
            sw2.setState(2);
            sw3.setState(2);
            sw4.setState(1);
            sw5.setState(2);
            sw6.setState(2);
            sw7.setState(2);
        }
        return;
    }
},

// Panel accords des modes: clic colonne => mode Triade + preset triade correspondant.
(components, source, evt) => {
    if (source?.name !== "modeChordsPanel1") return;
    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar || !evt) return;

    if (evt.type === "modeChordHover") {
        if (guitar.hasChordRadarSelections?.()) return;

        if (evt.active) {
            guitar.setChordRadarPreview(evt);
        } else {
            guitar.clearChordRadarPreview();
        }
        return;
    }

    if (evt.type === "modeChordToggle") {
        guitar.setChordRadarSelections(evt.selectedChords || []);

        if ((evt.selectedChords || []).length === 0) {
            guitar.setChordRadarPreview(evt);
        }
        return;
    }

    if (evt.type === "modeChordSelectionClear") {
        guitar.clearChordRadarSelections();
        guitar.clearChordRadarPreview();
    }
},

// Panel accords des modes: persistant hors mode gamme, refresh root/langue en continu.
(components, source, newState) => {
    const watch = new Set([
        "lcd1",
        "knob13457",
        "cof1",
        "guitar1",
        "metalSwitchENFR",
        "metalSwitch1"
    ]);

    if (!watch.has(source?.name)) return;
    syncModeChordsPanel(components);
},




//   snapshot sauvegarde
(components, source, newState) => {

    if (source.name !== "snapshotBtn") return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    // -----------------------------------------
    // 0) Vérifier si on doit créer un snapshot
    // -----------------------------------------
    const hasPinned   = guitar.pinnedNotes.length > 0;
    const hasSelected = guitar.selectedNotes.length > 0;
    const hasRoot     = guitar.theory.hasRoot();
    const hasMarkers  = guitar.markerSegments.length > 0;

    if (!hasPinned && !hasSelected && !hasRoot && !hasMarkers) {
        console.log("Snapshot ignoré : rien à sauvegarder.");
        return;
    }

    // -----------------------------------------
    // 1) Construire le titre
    // -----------------------------------------
    const index = guitar.snapshots.length + 1;
    let title = `${index}`;

    // priorité : dernière selected → dernière pinned → root
    let mainLabel = null;

    const getLabel = (n) => {
        const note = guitar.instrument.getNoteAt(n.string - 1, n.fret);
        if (!note) return null;
        const lbl = guitar.theory.getNoteLabel(note.index, guitar.displayMode);
        return lbl.base + lbl.alt;
    };

    if (!mainLabel && hasSelected) {
        mainLabel = getLabel(guitar.selectedNotes[guitar.selectedNotes.length - 1]);
    }
    if (!mainLabel && hasPinned) {
        mainLabel = getLabel(guitar.pinnedNotes[guitar.pinnedNotes.length - 1]);
    }
    if (!mainLabel && hasRoot) {
        const lbl = guitar.theory.getNoteLabel(guitar.theory.root, guitar.displayMode);
        mainLabel = lbl.base + lbl.alt;
    }

    if (mainLabel) title += `-${mainLabel}`;

    // LCD1 : uniquement si actif
    const lcd1 = components.find(c => c.name === "lcd1");
    if (lcd1 && lcd1.isOn && lcd1.items && lcd1.items.length > 0) {
        const lcdItem = lcd1.items[lcd1.state];
        if (lcdItem) title += `-${lcdItem}`;
    }
    else if (!mainLabel && hasMarkers) {
        // aucun label, lcd1 inactif → markers → "marked"
        title += ` - marked`;
    }

    const snapshotPinnedNotes = hasSelected
        ? deepClone(guitar.selectedNotes)
        : deepClone(guitar.pinnedNotes);

    // -----------------------------------------
    // 2) Création du snapshot
    // -----------------------------------------
    const snap = {
        title,
        pinnedNotes: snapshotPinnedNotes,
        selectedNotes: [],
        root: hasRoot ? guitar.theory.root : null,
        markerSegments: deepClone(guitar.markerSegments),
        harmonyName: String(guitar.selectionHarmonyName || "").trim() || null
    };

    guitar.snapshots.push(snap);

    // -----------------------------------------
    // 3) Sync LCD2
    // -----------------------------------------
    const lcd2 = components.find(c => c.name === "lcd2");
    if (lcd2) {
        lcd2.items = guitar.snapshots.map(s => s.title);
        lcd2.isOn = true;
        lcd2.state = lcd2.items.length - 1;
        lcd2.invalidate();
    }

    const triggerMeta = source.lastTriggerMeta || null;
    if (triggerMeta?.ctrlKey) {
        const trRec = components.find(c => c.name === "trRecPads");
        queueSnapshotInNextFreeTRRecSlot(trRec, guitar.snapshots.length - 1, snap.title);
    }

    source.lastTriggerMeta = null;

    console.log("Snapshot ajouté :", snap.title);
},


// -------------------------------------------------------------
// NAVIGATION TRREC
// -------------------------------------------------------------
// (components, source, evt) => {

//     if (source.name !== "trRecPads") return;

//     const guitar = components.find(c => c.name === "guitar1");
//     const trRec  = source;
//     if (!guitar) return;

//     // Séquence vide → afficher OFF
//     if (guitar.sequence.length === 0) {
//         trRec.states = [
//             { etat:0, item:null },
//             { etat:0, item:null },
//             { etat:0, item:null },
//             { etat:0, item:null }
//         ];
//         trRec.measureIndex = 0;
//         trRec.invalidate();
//         return;
//     }

//     if (evt.type === "prev")
//         guitar.currentMeasure = Math.max(0, guitar.currentMeasure - 1);

//     if (evt.type === "next")
//         guitar.currentMeasure = Math.min(guitar.sequence.length - 1, guitar.currentMeasure + 1);

//     const measure = guitar.sequence[guitar.currentMeasure];

//     trRec.states = measure;
//     trRec.measureIndex = guitar.currentMeasure;
//     trRec.invalidate();
// },


// -------------------------------------------------------------
// AJOUT D’UNE MESURE (+)
// -------------------------------------------------------------
// (components, source, evt) => {

//     if (source.name !== "trRecPads") return;
//     if (evt.type !== "add") return;

//     const guitar = components.find(c => c.name === "guitar1");
//     const trRec  = source;
//     if (!guitar) return;

//     const empty = [
//         { etat:0, item:null },
//         { etat:0, item:null },
//         { etat:0, item:null },
//         { etat:0, item:null }
//     ];

//     // Séquence vide
//     if (guitar.sequence.length === 0) {
//         guitar.sequence.push(empty);
//         guitar.currentMeasure = 0;

//         trRec.states = empty;
//         trRec.measureIndex = 0;
//         trRec.invalidate();
//         return;
//     }

//     // Insertion après la mesure courante
//     const cur = guitar.currentMeasure;
//     guitar.sequence.splice(cur + 1, 0, empty);
//     guitar.currentMeasure = cur + 1;

//     trRec.states = empty;
//     trRec.measureIndex = guitar.currentMeasure;
//     trRec.invalidate();
// },


// // -------------------------------------------------------------
// // ASSIGN ITEM ↔ PAD
// // -------------------------------------------------------------
// (components, source, evt) => {

//     if (source.name !== "trRecPads") return;
//     if (evt.type !== "assign") return;

//     const guitar = components.find(c => c.name === "guitar1");
//     const lcd2   = components.find(c => c.name === "lcd2");
//     const trRec  = source;

//     if (!guitar || !lcd2) return;

//     const measure = guitar.sequence[guitar.currentMeasure];
//     const step = measure[evt.index];

//     // Affectation item
//     step.item = lcd2.state;

//     // Affectation durée (ON)
//     step.etat = trRec.initDur;

//     // Mise à jour TRRec
//     trRec.states = measure;
//     trRec.invalidate();
// },


// // -------------------------------------------------------------
// // SNAPSHOT → CRÉATION D’UNE MESURE TRREC
// // -------------------------------------------------------------
// (components, source, newState) => {

//     if (source.name !== "snapshotBtn") return;

//     const guitar = components.find(c => c.name === "guitar1");
//     if (!guitar) return;

//     // Vérification snapshot
//     const hasPinned   = guitar.pinnedNotes.length > 0;
//     const hasSelected = guitar.selectedNotes.length > 0;
//     const hasRoot     = guitar.theory.hasRoot();
//     const hasMarkers  = guitar.markerSegments.length > 0;

//     if (!hasPinned && !hasSelected && !hasRoot && !hasMarkers) return;

//     // Construction du titre
//     let index = guitar.snapshots.length + 1;
//     let title = `${index}`;

//     let mainLabel = null;

//     const getLabel = (n) => {
//         const note = guitar.instrument.getNoteAt(n.string - 1, n.fret);
//         if (!note) return null;
//         const lbl = guitar.theory.getNoteLabel(note.index, guitar.displayMode);
//         return lbl.base + lbl.alt;
//     };

//     if (hasPinned)
//         mainLabel = getLabel(guitar.pinnedNotes.at(-1));

//     if (!mainLabel && hasSelected)
//         mainLabel = getLabel(guitar.selectedNotes.at(-1));

//     if (!mainLabel && hasRoot) {
//         const lbl = guitar.theory.getNoteLabel(guitar.theory.root, guitar.displayMode);
//         mainLabel = lbl.base + lbl.alt;
//     }

//     if (mainLabel) title += `-${mainLabel}`;

//     const lcd1 = components.find(c => c.name === "lcd1");
//     if (lcd1 && lcd1.isOn && lcd1.items?.length > 0) {
//         const lcdItem = lcd1.items[lcd1.state];
//         if (lcdItem) title += `-${lcdItem}`;
//     }

//     // Création snapshot
//     const snap = {
//         title,
//         pinnedNotes: [...guitar.pinnedNotes],
//         selectedNotes: [...guitar.selectedNotes],
//         root: hasRoot ? guitar.theory.root : null,
//         markerSegments: [...guitar.markerSegments],
//     };

//     guitar.snapshots.push(snap);

//     // Création mesure TRRec
//     const trRec = components.find(c => c.name === "trRecPads");
//     if (trRec) {

//         const itemIndex = guitar.snapshots.length - 1;
//         const dur = trRec.initDur;

//         const measure = [
//             { item: itemIndex, etat: dur },
//             { item: null, etat: 0 },
//             { item: null, etat: 0 },
//             { item: null, etat: 0 }
//         ];

//         guitar.sequence.push(measure);

//         const mIndex = guitar.sequence.length - 1;
//         guitar.currentMeasure = mIndex;

//         trRec.measureIndex = mIndex;
//         trRec.states = measure;
//         trRec.invalidate();
//     }

//     // Sync LCD2
//     const lcd2 = components.find(c => c.name === "lcd2");
//     if (lcd2) {
//         lcd2.items = guitar.snapshots.map(s => s.title);
//         lcd2.isOn = true;
//         lcd2.state = lcd2.items.length - 1;
//         lcd2.invalidate();
//     }
// }

(components, source, evt) => {

    if (source.name !== "trRecPads") return;
    if (evt.type !== "request-add") return;

    const lcd2 = components.find(c => c.name === "lcd2");
    if (!lcd2) return;

    // LCD vide → pas d’ajout possible
    if (!lcd2.items || lcd2.items.length === 0) return;

    const itemIndex = lcd2.state;
    const itemObj   = lcd2.items[itemIndex];

    if (!itemObj) return;

    const index = evt.index;

    // Ajout externe : état = 1 + objet complet du LCD
    source.states[index] = {
        etat: 1,
        item: itemObj,      // l’objet complet
        itemIndex: itemIndex
    };

    source.invalidate();

    source.onChange?.({
        type: "add",
        index,
        etat: 1,
        item: itemObj,
        itemIndex
    });
},

// EXPORT sequence TRREC + dependances snapshots
(components, source, newState) => {

    if (source.name !== "saveSeqBtn") return;
    if (newState !== 1) return;

    const payload = createTRRecExportPayload(components);
    if (!payload) return;

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const h = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");

    downloadJSON(payload, `trrec-sequence-${y}${m}${d}-${h}${min}.json`);

    source.state = 0;
    source.invalidateNow?.();
},

// IMPORT sequence TRREC + dependances snapshots
(components, source, newState) => {

    if (source.name !== "loadSeqBtn") return;
    if (newState !== 1) return;

    pickJSONFile(
        (payload) => {
            try {
                applyTRRecImportPayload(components, payload);
            } catch (err) {
                console.warn("Import sequence invalide:", err?.message || err);
            } finally {
                source.state = 0;
                source.invalidateNow?.();
            }
        },
        () => {
            source.state = 0;
            source.invalidateNow?.();
        }
    );
},

(components, source, evt) => {

    // On ne réagit qu’au BPMControl
    if (source.name !== "bpmCtrl") return;
    if (!evt || evt.type !== "tick") return;

    // Trouver le TRRecPads
    const tr      = components.find(c => c.name === "trRecPads");
    const loopBtn = components.find(c => c.name === "loopBtn");
    if (!tr) return;

    const loopMode = loopBtn?.state ?? LOOP_MODES.ONE_LOOP;
    if (loopMode === LOOP_MODES.OFF) return;

    const previousMeasure = tr.measureIndex;
    const stepResult = tr.advancePlayhead() || {};

    if (!stepResult.wrapped) return;

    const measureCount = Array.isArray(tr.measures) ? tr.measures.length : 1;
    const lastMeasureIndex = Math.max(0, measureCount - 1);
    const atLastMeasure = previousMeasure >= lastMeasureIndex;

    if (loopMode === LOOP_MODES.ONE_SHOT) {
        stopTRRecPlayback(components);
        return;
    }

    if (loopMode === LOOP_MODES.ONE_LOOP) {
        return;
    }

    if (loopMode === LOOP_MODES.ALL_SHOT) {
        if (atLastMeasure) {
            stopTRRecPlayback(components);
            return;
        }

        tr.setMeasureIndex(previousMeasure + 1);
        return;
    }

    if (loopMode === LOOP_MODES.ALL_LOOP) {
        if (atLastMeasure) {
            tr.setMeasureIndex(0);
            return;
        }

        tr.setMeasureIndex(previousMeasure + 1);
    }
},

// LOOP BUTTON → mode de lecture TRREC (off/1shot/allshot/1loop/allloop)
(components, source, newState) => {

    if (source.name !== "loopBtn") return;

    const tr  = components.find(c => c.name === "trRecPads");
    const bpm = components.find(c => c.name === "bpmCtrl");
    if (!tr) return;

    if (newState === LOOP_MODES.OFF) {
        stopTRRecPlayback(components);
        return;
    }

    if (bpm?.isPlaying) {
        resetTRRecPosition(tr, newState);
    }
},

// PLAY BUTTON → active/désactive le BPM
(components, source, newState) => {

    const playBtn = components.find(c => c.name === "playBtn");
    if (source !== playBtn) return;

    const bpm = components.find(c => c.name === "bpmCtrl");
    const tr = components.find(c => c.name === "trRecPads");
    const loopBtn = components.find(c => c.name === "loopBtn");
    if (!bpm) return;

    const loopMode = loopBtn?.state ?? LOOP_MODES.ONE_LOOP;

    if (newState === 1 && loopMode === LOOP_MODES.OFF) {
        playBtn.state = 0;
        playBtn.invalidate();
        bpm.isPlaying = false;
        bpm.invalidate();
        return;
    }

    bpm.isPlaying = (newState === 1);

    if (bpm.isPlaying) {
        bpm.lastTickTime = millis();
        bpm.tickIndex = 0;
        bpm.ledPhase = 0;
        resetTRRecPosition(tr, loopMode);
    } else if (tr) {
        const guitar = components.find(c => c.name === "guitar1");
        const clearSeqHoldPulse = (list) => {
            if (!Array.isArray(list)) return;
            for (const n of list) {
                if (!n) continue;
                delete n.seqHoldPulse;
                delete n.seqHoldPulseStart;
                delete n.seqHoldPulseFrequency;
                delete n.seqHoldPulseAlphaMin;
                delete n.seqHoldPulseAlphaMax;
                delete n.seqHoldPulseScale;
            }
        };

        clearSeqHoldPulse(guitar?.pinnedNotes);
        clearSeqHoldPulse(guitar?.selectedNotes);
        guitar?.invalidate?.();

        tr.playIndex = 0;

        if (Array.isArray(tr.states)) {
            for (const step of tr.states) {
                if (step) step.highlight = false;
            }
        }

        tr.invalidate();
    }

    bpm.invalidate();
}
,

// RESTAURATION D’UN SNAPSHOT (LCD2 → Guitar)
(components, source, newState) => {

    if (source.name !== "lcd2") return;

    const guitar = components.find(c => c.name === "guitar1");
    if (!guitar) return;

    const snap = guitar.snapshots[newState];
    if (!snap) return;

    guitar.applySnapshotAnimated(snap, {
        popInDuration: 260,
        includeMarkers: true
    });

   // console.log("Snapshot restauré :", snap.title);
},
// SUPPRESSION D’UN SNAPSHOT (trashBtn)
(components, source, newState) => {

    if (source.name !== "trashBtn") return;

    const guitar = components.find(c => c.name === "guitar1");
    const lcd2   = components.find(c => c.name === "lcd2");
    const trRec  = components.find(c => c.name === "trRecPads");

    if (!guitar || !lcd2) return;

    const idx = lcd2.state;

    if (idx < 0 || idx >= guitar.snapshots.length) return;

    if (isSnapshotReferencedInTRRec(trRec, idx)) {
        console.warn("Suppression bloquee: snapshot utilise dans la sequence.", idx);
        source.state = 0;
        source.invalidateNow?.();
        return;
    }

    // suppression
    guitar.snapshots.splice(idx, 1);

    // mise à jour LCD2
    lcd2.items = guitar.snapshots.map(s => s.title);

    reindexTRRecSnapshotRefs(trRec, idx, lcd2.items);
    trRec?.invalidate();

    if (lcd2.items.length === 0) {
        lcd2.setOnOff(false);
    } else {
        lcd2.state = Math.min(idx, lcd2.items.length - 1);
    }

    lcd2.invalidate();
    guitar.invalidate();

    console.log("Snapshot supprimé :", idx);
},


// TRREC → GUITAR : restauration snapshot
(components, source, evt) => {

    if (source.name !== "trRecPads") return;
    if (!evt || evt.type !== "padChange") return;

    const guitar = components.find(c => c.name === "guitar1");
    const lcd2   = components.find(c => c.name === "lcd2");
    if (!guitar || !lcd2) return;

    // Etat disabled: coupe nette de la tenue precedente
    if (evt.stepState === 2) {
        guitar.applySnapshotAnimated({
            title: "__mute__",
            pinnedNotes: [],
            selectedNotes: [],
            root: null,
            markerSegments: []
        }, {
            popInDuration: 0,
            includeMarkers: true,
            replayExisting: false,
            animProfile: "sequence"
        });
        return;
    }

    const tabFrets = sanitizeTabFrets(evt.tabFrets);
    if (tabFrets) {
        guitar.applySnapshotAnimated(buildSnapshotFromTabFrets(tabFrets), {
            popInDuration: 170,
            includeMarkers: true,
            replayExisting: true,
            animProfile: "sequence"
        });
        return;
    }

    const snapshotIndex = evt.snapshotIndex;
    if (snapshotIndex == null) return;

    const snap = guitar.snapshots[snapshotIndex];
    if (!snap) return;

    // Transition sequence TRREC: pop-in plus rapide + fade-out via pop-out.
    guitar.applySnapshotAnimated(snap, {
        popInDuration: 170,
        includeMarkers: true,
        replayExisting: true,
        animProfile: "sequence"
    });

    // --- LCD2 ---
    // On met à jour l'affichage sans passer par le setter (qui déclencherait
    // la règle lcd2 → applySnapshotAnimated sans animProfile:"sequence",
    // ce qui effacerait seqHoldPulse immédiatement après qu'on vient de le poser).
    lcd2._index = Number.isFinite(snapshotIndex) ? lcd2.wrap(snapshotIndex) : lcd2._index;
    lcd2.invalidate();
}







];
