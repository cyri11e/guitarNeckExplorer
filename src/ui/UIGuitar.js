// ============================================================
// GUITAR (classe principale)
// ============================================================

class Guitar extends UIComponent {

    constructor(cfg = {}) {
        super();

        this.aspectRatio = cfg.aspectRatio ?? 8;
        this.woodColor   = cfg.woodColor   ?? "maple";

        this.isDraggable = cfg.isDraggable ?? true;
        this.isZoomable  = cfg.isZoomable  ?? true;

        this.debug = cfg.debug ?? false;

        this.setResponsive(cfg.xp ?? 0, cfg.yp ?? 0, cfg.sp ?? 20);

        this.zoomFactor = 1;
        this.fretCount  = cfg.fretCount ?? 24;

        this.inlayStyle = cfg.inlayStyle ?? "dots";

        // géométrie projetée (pixels)
        this.frets   = [];
        this.cases   = [];
        this.strings = [];
        this.inlays  = [];

        // modules
        this.style    = new GuitarStyle(this);
        this.geometry = new GuitarGeometry(this);
        this.renderer = new GuitarRenderer(this, this.style);
        this.overlays = new GuitarOverlays(this, this.style);


        // géométrie logique (ratios)
        this.fretRatio   = this.geometry.computeFretRatios();
        this.stringRatio = this.geometry.computeStringRatios();
        this.inlayFrets  = [3,5,7,9,12,15,17,19,21,24];

        this.geometry.projectGeometry();

        this.openStringNames = ["E", "B", "G", "D", "A", "E"]; 
        this.pinnedNotes = [ 
            // { fret: 1, string: 6 }, 
            // { fret: 2, string: 4 } 
        ]; // { fret, string }
        this.previousPadNotesPinned = []; // Historique pour animations de séquence TRRec

        this.selectedNotes = [
            // { fret: 3, string: 3 }
        ]; // { fret, string }
        this.previousPadNotesSelected = []; // Historique pour animations de séquence TRRec

        this.snapshots =[]
        //  Ajout : flag anti-clic-après-drag
        this.wasDragged = false;

        this.displayMode = cfg.displayMode ?? "note";     // mode par défaut pour les nouvelles notes
        this.labelType   = cfg.labelType   ?? "noteEN";   // noteEN | noteFR
        this.hoverMode   = "cursor"; // "cursor" | "note" | "octave"

        this.multiNotes = false;
        this.intervals =[];
        this.intervalMode = this.intervalModes = [
            "OneString",
            "Chord",
            "BoxR",
            "BoxL",
            "3NPS",
            "Diagonal"
        ];

        this.intervalMode = "OneString"; // mode par défaut
        this.intervalWay = 'up';
        this.octaveShown = "1" ;
        this.inversion = 0 ;
        // animations
        this.highlighted       = [];
        this.interactionBursts = [];
        this.shiftDown = false;

        this.anim = new GuitarAnim();
this.anim.setPreset("snappy"); 
        // --- MODE MARKER ---
        this.markerMode = false;
        this.markerSegments = [];
        this.markerPendingPoint = null;
        this.markerColor = color(255, 0, 0);

        // --- overlays caged ----
        this.cagedOV = false

        this.playTimer = null;
        this.playing = false;
        this.bpm = 80;
        this.sequence = [];

        this._chainAddTimer = null;
        this._chainAddQueue = [];
        this._chainAddTarget = "pinned";

        this._geometryStamp = "";
        this._hoverInvalidateMs = 24;
        this._lastHoverInvalidateAt = 0;

        this.chordRadarPreview = null;
        this.chordRadarSelections = [];
        this.chordRadarPointer = null;
        this.chordRadarRadiusT = 0.35;
        this.chordRadarRadiusStep = 0.08;

        this.contextMenu = {
            visible: false,
            stage: "root",
            x: 0,
            y: 0,
            fret: null,
            string: null
        };
    }

    _computeGeometryStamp() {
        return [
            this.x,
            this.y,
            this.w,
            this.h,
            this.zoomFactor,
            this.fretCount,
            this.inlayStyle
        ].join("|");
    }

    _ensureGeometryProjected() {
        const stamp = this._computeGeometryStamp();
        if (stamp === this._geometryStamp) return;

        this.geometry.projectGeometry();
        this._geometryStamp = stamp;
    }

    setBPM(bpm) {
        this.bpm = bpm;

       // si on joue → on recalcule immédiatement
        if (this.playing) {
            this.restartTimer();
        }
    }

    restartTimer() {
    clearInterval(this.playTimer);

    const interval = 60000 / this.bpm;

    // TICK IMMÉDIAT
    //this.advanceSequence(this.lcd2);
     this.lcd2.invalidate();

    this.playTimer = setInterval(() => {
        this.advanceSequence(this.lcd2);
        this.lcd2.invalidateNow(); //  LCD2 avance même sans souris
    }, interval);

}


startPlayback(lcd2) {
    if (this.playing) return;
    this.playing = true;

    const interval = 60000 /this.bpm; 

    this.playTimer = setInterval(() => {
        this.advanceSequence(lcd2);
    }, interval);
}

stopPlayback() {
    if (!this.playing) return;
    this.playing = false;

    clearInterval(this.playTimer);
    this.playTimer = null;
}

advanceSequence(lcd2) {
    if (!lcd2 || !lcd2.items) return;

    let idx = lcd2.state + 1;
    if (idx >= lcd2.items.length) idx = 0;

    lcd2.setIndex(idx);
    lcd2.invalidate();
}



    // ------------------------------------------------------------
    // MARKER SELECTOR
 onMarkerChange(evt) { 
    if (evt.type === "markerToggle") { 
        this.markerMode = (evt.state === 1); 
        //console.log("[MARKER] Mode =", this.markerMode ? "ON" : "OFF");

        if (!this.markerMode) { 
            this.markerPendingPoint = null; 
        } 
    } 

    if (evt.type === "markerColor") { 
        this.markerColor = this.app.markerSelector.noteColors[evt.index];
        //console.log("[MARKER] Nouvelle couleur =", this.markerColor);
    } 
}

resolveMultiNotes() {

    if (!this.intervals || this.intervals.length === 0) {
        this.notePositions = [];
        return;
    }

    const tuning    = this.instrument.tuning;
    const fretCount = this.fretCount;
    const intervals = this.intervals;

    const notes = [];

    for (let s = 0; s < tuning.length; s++) {

        const openNote = tuning[s];

        for (let f = 0; f <= fretCount; f++) {

            const note = (openNote + f) % 12;

            // MATCH DIRECT : note absolue ∈ intervalles absolus
            for (let i = 0; i < intervals.length; i++) {

                if (note === intervals[i]) {

                    notes.push({
                        string: s,
                        fret: f,
                        note: note,
                        interval: intervals[i]
                    });
                }
            }
        }
    }

    this.notePositions = notes;
}

setIntervalMode(mode) {
    this.intervalMode = mode;
    this.invalidate();
}

setWoodColor(type) {
    this.woodColor = type; // "rose" ou "map"
    this.invalidate();
}

setInlayStyle(type) {
    this.inlayStyle = type; // "dots" / "superstrat" / "trapeze"
    this.invalidate();
}

    _normalizeDisplayMode(mode) {
        const allowed = ["note", "degree", "none"];
        return allowed.includes(mode) ? mode : "note";
    }

    _noteModeToKnobIndex(mode) {
        return ["note", "degree", "none"].indexOf(this._normalizeDisplayMode(mode));
    }

    _getStoredNoteAt(fret, string) {
        return (
            this.selectedNotes.find(n => n.fret === fret && n.string === string) ||
            this.pinnedNotes.find(n => n.fret === fret && n.string === string) ||
            null
        );
    }

    _getNoteDisplayMode(note) {
        return this._normalizeDisplayMode(note?.displayMode ?? this.displayMode);
    }

    _getNoteLabelMode(note) {
        const mode = this._getNoteDisplayMode(note);
        return mode === "note" ? this.labelType : mode;
    }

    _createStoredNote(note = {}, fallbackDisplayMode = this.displayMode) {
        return {
            ...note,
            displayMode: this._normalizeDisplayMode(note.displayMode ?? fallbackDisplayMode)
        };
    }

    _setStoredNoteDisplayMode(fret, string, mode) {
        const nextMode = this._normalizeDisplayMode(mode);
        const note = this._getStoredNoteAt(fret, string);
        if (!note) return false;
        note.displayMode = nextMode;
        return true;
    }

    _syncDisplayModeKnob(mode) {
        const knob = this.app?.components?.find(c => c.name === "knob2");
        const index = this._noteModeToKnobIndex(mode);
        if (!knob || index < 0 || knob.state === index) return;
        knob.setIndex(index);
    }

    _cycleStoredNoteDisplayMode(fret, string) {
        const note = this._getStoredNoteAt(fret, string);
        if (!note) return null;

        const modes = ["note", "degree", "none"];
        const currentIndex = Math.max(0, modes.indexOf(this._normalizeDisplayMode(note.displayMode)));
        const nextMode = modes[(currentIndex + 1) % modes.length];

        note.displayMode = nextMode;
        this.setDisplayMode(nextMode);
        this._syncDisplayModeKnob(nextMode);
        this.invalidate();
        return nextMode;
    }

    _setSelectedNotesDisplayMode(mode) {
        const nextMode = this._normalizeDisplayMode(mode);
        if (!Array.isArray(this.selectedNotes) || this.selectedNotes.length === 0) {
            return false;
        }

        for (const note of this.selectedNotes) {
            if (!note) continue;
            note.displayMode = nextMode;
        }

        this.setDisplayMode(nextMode);
        this._syncDisplayModeKnob(nextMode);
        this.invalidate();
        return true;
    }

    _getContextMenuItems(stage = this.contextMenu?.stage) {
        if (stage === "quality") {
            return [
                {
                    leftId: "majorLeft",
                    rightId: "majorRight",
                    label: "majeur"
                },
                {
                    leftId: "minorLeft",
                    rightId: "minorRight",
                    label: "mineur"
                }
            ];
        }

        if (stage === "scale") {
            return [
                { id: "scaleType:diatonic", label: "diatonique" },
                { id: "scaleType:pentatonic", label: "pentatonique" }
            ];
        }

        if (stage === "scaleFamily") {
            return [
                { id: "scaleFamily:major", label: "majeure" },
                { id: "scaleFamily:minor", label: "mineure" }
            ];
        }

        if (stage === "scaleModes") {
            if (this.contextMenu?.scaleType === "pentatonic") {
                return [
                    { id: "scaleMode:pentatonicMajor", label: "penta majeure" },
                    { id: "scaleMode:pentatonicMinor", label: "penta mineure" }
                ];
            }

            if (this.contextMenu?.scaleFamily === "major") {
                return [
                    { id: "scaleMode:lydien", label: "lydien" },
                    { id: "scaleMode:ionien", label: "ionien" },
                    { id: "scaleMode:mixolydien", label: "mixolydien" }
                ];
            }

            if (this.contextMenu?.scaleFamily === "minor") {
                return [
                    { id: "scaleMode:dorien", label: "dorien" },
                    { id: "scaleMode:eolien", label: "eolien" },
                    { id: "scaleMode:phrygien", label: "phrygien" }
                ];
            }

            return [];
        }

        if (stage === "scaleLayout") {
            return [
                {
                    leftId: "scaleLayout:box:left",
                    rightId: "scaleLayout:box:right",
                    label: "box"
                },
                {
                    leftId: "scaleLayout:diagonal:left",
                    rightId: "scaleLayout:diagonal:right",
                    label: "diagonale"
                }
            ];
        }

        return [
            { id: "chord", label: "accord" },
            { id: "scale", label: "gamme" }
        ];
    }

    _getContextMenuLayout() {
        if (!this.contextMenu?.visible) return null;

        const stage = this.contextMenu?.stage;
        const anchorX = Number.isFinite(this.contextMenu?.x) ? this.contextMenu.x : 0;
        const anchorY = Number.isFinite(this.contextMenu?.y) ? this.contextMenu.y : 0;
        const items = this._getContextMenuItems();
        const itemHeight = 34;
        const margin = 10;

        if (stage === "quality" || stage === "scaleLayout") {
            const maxDisplayChars = items.reduce((maxLen, item) => {
                const len = String(`← ${String(item?.label ?? "")} →`).length;
                return Math.max(maxLen, len);
            }, 0);

            // Compact dual layout: width follows rendered label length while preserving left/right hit zones.
            const totalContentWidth = Math.max(152, (maxDisplayChars * 11) + 36);
            const colWidth = Math.max(68, Math.ceil(totalContentWidth * 0.5));
            const colGap = 10;
            const width = (colWidth * 2) + colGap + 20;
            const height = items.length * itemHeight;
            const x = constrain(anchorX - width * 0.5, margin, max(margin, windowWidth - width - margin));
            const y = constrain(anchorY - height * 0.5, margin, max(margin, windowHeight - height - margin));

            return {
                mode: "dual",
                x,
                y,
                width,
                height,
                itemHeight,
                items,
                colWidth,
                colGap,
                leftX: x + 10,
                rightX: x + 10 + colWidth + colGap
            };
        }

        const maxLabelChars = items.reduce((maxLen, item) => {
            const len = String(item?.label ?? "").length;
            return Math.max(maxLen, len);
        }, 0);

        // Keep the menu as compact as the longest label plus small side paddings.
        const width = Math.max(140, (maxLabelChars * 11) + 42);
        const height = items.length * itemHeight;
        const x = constrain(anchorX - width * 0.5, margin, max(margin, windowWidth - width - margin));
        const y = constrain(anchorY - height * 0.5, margin, max(margin, windowHeight - height - margin));

        return { mode: "single", x, y, width, height, itemHeight, items };
    }

    _contextMenuContains(x, y) {
        const layout = this._getContextMenuLayout();
        if (!layout) return false;
        return x >= layout.x && x <= (layout.x + layout.width) && y >= layout.y && y <= (layout.y + layout.height);
    }

    _openContextMenuForHit(hit, evt) {
        if (!hit || !evt) return;

        const anchor = this.toScreen(hit.fret, hit.string);
        this.contextMenu = {
            visible: true,
            stage: "root",
            side: "right",
            scaleType: null,
            scaleFamily: null,
            scaleMode: null,
            x: Number.isFinite(anchor?.x) ? anchor.x : evt.x,
            y: Number.isFinite(anchor?.y) ? anchor.y : evt.y,
            fret: hit.fret,
            string: hit.string
        };
        this.invalidate();
    }

    _closeContextMenu() {
        if (!this.contextMenu?.visible) return;
        this.contextMenu.visible = false;
        this.invalidate();
    }

    _setContextMenuStage(stage) {
        if (!this.contextMenu) return;
        this.contextMenu.stage = stage;
        this.invalidate();
    }

    _getContextMenuActionAt(x, y) {
        const layout = this._getContextMenuLayout();
        if (!layout) return null;

        const inside = x >= layout.x && x <= (layout.x + layout.width) && y >= layout.y && y <= (layout.y + layout.height);
        if (!inside) return null;

        const idx = floor((y - layout.y) / layout.itemHeight);
        const row = layout.items[idx];
        if (!row) return null;

        if (layout.mode === "dual") {
            const leftMinX = layout.leftX;
            const leftMaxX = leftMinX + layout.colWidth;
            const rightMinX = layout.rightX;
            const rightMaxX = rightMinX + layout.colWidth;

            if (x >= leftMinX && x <= leftMaxX) return row.leftId || null;
            if (x >= rightMinX && x <= rightMaxX) return row.rightId || null;
            return null;
        }

        return row.id || null;
    }

    _getBarreChordShapeFromString(rootString) {

        if (rootString === 1) {
            return {
                rootString: 1,
                major: [
                    { stringOffset: 0, fretOffset: 0 },
                    { stringOffset: 1, fretOffset: 2 },
                    { stringOffset: 2, fretOffset: 2 },
                    { stringOffset: 3, fretOffset: 1 },
                    { stringOffset: 4, fretOffset: 0 },
                    { stringOffset: 5, fretOffset: 0 }
                ],
                minor: [
                    { stringOffset: 0, fretOffset: 0 },
                    { stringOffset: 1, fretOffset: 2 },
                    { stringOffset: 2, fretOffset: 2 },
                    { stringOffset: 3, fretOffset: 0 },
                    { stringOffset: 4, fretOffset: 0 },
                    { stringOffset: 5, fretOffset: 0 }
                ]
            };
        }

        if (rootString === 2) {
            return {
                rootString: 2,
                major: [
                    { stringOffset: -1, fretOffset: 0 },
                    { stringOffset: 0, fretOffset: 0 },
                    { stringOffset: 1, fretOffset: 2 },
                    { stringOffset: 2, fretOffset: 2 },
                    { stringOffset: 3, fretOffset: 2 },
                    { stringOffset: 4, fretOffset: 0 }
                ],
                minor: [
                    { stringOffset: -1, fretOffset: 0 },
                    { stringOffset: 0, fretOffset: 0 },
                    { stringOffset: 1, fretOffset: 2 },
                    { stringOffset: 2, fretOffset: 2 },
                    { stringOffset: 3, fretOffset: 1 },
                    { stringOffset: 4, fretOffset: 0 }
                ]
            };
        }

        if (rootString === 3) {
            return {
                rootString: 3,
                major: [
                    { stringOffset: -2, fretOffset: 2 },
                    { stringOffset: -1, fretOffset: 0 },
                    { stringOffset: 0, fretOffset: 0 },
                    { stringOffset: 1, fretOffset: 2 },
                    { stringOffset: 2, fretOffset: 3 },
                    { stringOffset: 3, fretOffset: 2 }
                ],
                minor: [
                    { stringOffset: -2, fretOffset: 1 },
                    { stringOffset: -1, fretOffset: 0 },
                    { stringOffset: 0, fretOffset: 0 },
                    { stringOffset: 1, fretOffset: 2 },
                    { stringOffset: 2, fretOffset: 3 },
                    { stringOffset: 3, fretOffset: 1 }
                ]
            };
        }

        if (rootString === 4) {
            return {
                rootString: 4,
                major: [
                    { stringOffset: -3, fretOffset: 3 },
                    { stringOffset: -2, fretOffset: 2 },
                    { stringOffset: -1, fretOffset: 0 },
                    { stringOffset: 0, fretOffset: 0 },
                    { stringOffset: 1, fretOffset: 0 },
                    { stringOffset: 2, fretOffset: 3 }
                ],
                minor: [
                    { stringOffset: -3, fretOffset: 3 },
                    { stringOffset: -2, fretOffset: 1 },
                    { stringOffset: -1, fretOffset: 0 },
                    { stringOffset: 0, fretOffset: 0 },
                    { stringOffset: 1, fretOffset: 0 },
                    { stringOffset: 2, fretOffset: 3 }
                ]
            };
        }

        if (rootString === 5) {
            return {
                rootString: 5,
                major: [
                    { stringOffset: -4, fretOffset: -1 },
                    { stringOffset: -3, fretOffset: 2 },
                    { stringOffset: -2, fretOffset: 1 },
                    { stringOffset: -1, fretOffset: -1 },
                    { stringOffset: 0, fretOffset: 0 },
                    { stringOffset: 1, fretOffset: -1 }
                ],
                minor: [
                    { stringOffset: -4, fretOffset: -2 },
                    { stringOffset: -3, fretOffset: 2 },
                    { stringOffset: -2, fretOffset: 0 },
                    { stringOffset: -1, fretOffset: -1 },
                    { stringOffset: 0, fretOffset: 0 },
                    { stringOffset: 1, fretOffset: -2 }
                ]
            };
        }

        if (rootString === 6) {
            return {
                rootString: 1,
                major: [
                    { stringOffset: 0, fretOffset: 0 },
                    { stringOffset: 1, fretOffset: 2 },
                    { stringOffset: 2, fretOffset: 2 },
                    { stringOffset: 3, fretOffset: 1 },
                    { stringOffset: 4, fretOffset: 0 },
                    { stringOffset: 5, fretOffset: 0 }
                ],
                minor: [
                    { stringOffset: 0, fretOffset: 0 },
                    { stringOffset: 1, fretOffset: 2 },
                    { stringOffset: 2, fretOffset: 2 },
                    { stringOffset: 3, fretOffset: 0 },
                    { stringOffset: 4, fretOffset: 0 },
                    { stringOffset: 5, fretOffset: 0 }
                ]
            };
        }

        return null;
    }

    _getContextChordShapeId(rootString, side = "right") {
        const map = {
            1: ["G", "E"],
            2: ["C", "A"],
            3: ["E", "D"],
            4: ["A", "G"],
            5: ["D", "C"],
            6: ["G", "E"]
        };

        const pair = map[rootString];
        if (!pair) return null;
        return side === "left" ? pair[0] : pair[1];
    }

    _getRecipeRootStringByShape(shapeId) {
        const map = {
            E: 1,
            A: 2,
            D: 3,
            G: 4,
            C: 5
        };
        return map[shapeId] || null;
    }

    _findClosestRootFretForShape(targetPc, recipeRootString, referenceFret, side = "right") {
        const instrument = this.app?.instrument;
        if (!instrument || !Number.isFinite(targetPc)) return null;

        const candidates = [];
        for (let fret = 0; fret <= this.fretCount; fret++) {
            const raw = instrument.getNoteAt(recipeRootString - 1, fret);
            if (!raw) continue;
            if (raw.index === targetPc) candidates.push(fret);
        }

        if (candidates.length === 0) return null;

        const leftSide = side === "left";
        const preferred = candidates.filter(f => leftSide ? f <= referenceFret : f >= referenceFret);
        const pool = preferred.length > 0 ? preferred : candidates;

        let best = pool[0];
        let bestDist = Math.abs(best - referenceFret);
        for (let i = 1; i < pool.length; i++) {
            const f = pool[i];
            const dist = Math.abs(f - referenceFret);
            if (dist < bestDist) {
                best = f;
                bestDist = dist;
            }
        }

        return best;
    }

    _applyContextChordQuality(quality, sideArg = null) {
        const clickedFret = this.contextMenu?.fret;
        const clickedString = this.contextMenu?.string;
        const side = sideArg === "left"
            ? "left"
            : (sideArg === "right" ? "right" : (this.contextMenu?.side === "left" ? "left" : "right"));
        if (clickedFret == null || clickedString == null) return false;

        const shapeId = this._getContextChordShapeId(clickedString, side);
        const recipeRootString = this._getRecipeRootStringByShape(shapeId) || clickedString;
        const shape = this._getBarreChordShapeFromString(recipeRootString);
        if (!shape) return false;

        let rootFret = clickedFret;
        const clickedRaw = this.app?.instrument?.getNoteAt?.(clickedString - 1, clickedFret);
        if (clickedRaw) {
            const anchored = this._findClosestRootFretForShape(clickedRaw.index, recipeRootString, clickedFret, side);
            if (Number.isFinite(anchored)) {
                rootFret = anchored;
            }
        }

        const recipe = quality === "minor" ? shape.minor : shape.major;
        const targets = [];

        for (const step of recipe) {
            const targetString = shape.rootString + step.stringOffset;
            if (targetString < 1 || targetString > this.strings.length) continue;

            targets.push({
                targetString,
                targetFret: rootFret + step.fretOffset
            });
        }

        if (targets.length === 0) return false;

        const minTargetFret = targets.reduce((minFret, t) => Math.min(minFret, t.targetFret), Infinity);
        const fretShift = minTargetFret < 0 ? -minTargetFret : 0;
        let changed = false;

        for (const target of targets) {
            const targetString = target.targetString;
            const targetFret = target.targetFret + fretShift;
            if (targetFret < 0 || targetFret > this.fretCount) continue;

            const added = this._addAnimatedNote(this.pinnedNotes, targetFret, targetString, "pin", {
                displayMode: this.displayMode
            });
            changed = changed || added;
        }

        if (changed) {
            this.invalidate();
        }

        return changed;
    }

    _getScaleIntervalsByMode(modeId) {
        const map = {
            lydien:     [0, 2, 4, 6, 7, 9, 11],
            ionien:     [0, 2, 4, 5, 7, 9, 11],
            mixolydien: [0, 2, 4, 5, 7, 9, 10],
            dorien:     [0, 2, 3, 5, 7, 9, 10],
            eolien:     [0, 2, 3, 5, 7, 8, 10],
            phrygien:   [0, 1, 3, 5, 7, 8, 10],
            pentatonicmajor: [0, 2, 4, 7, 9],
            pentatonicminor: [0, 3, 5, 7, 10]
        };
        return map[String(modeId || "").toLowerCase()] || null;
    }

    _countLetterDuplicates(noteNames) {
        const counts = Object.create(null);
        for (const name of noteNames || []) {
            const letter = String(name || "").trim().charAt(0).toUpperCase();
            if (!/[A-G]/.test(letter)) continue;
            counts[letter] = (counts[letter] || 0) + 1;
        }

        let duplicates = 0;
        for (const key of Object.keys(counts)) {
            if (counts[key] > 1) duplicates += (counts[key] - 1);
        }
        return duplicates;
    }

    _pickUseFlatsForScale(rootPc, intervals) {
        const theory = this.theory;
        if (!theory || typeof theory.getNote !== "function") return null;

        const pcs = (intervals || [])
            .map(semitones => ((Number(rootPc) + Number(semitones)) % 12 + 12) % 12)
            .filter(Number.isFinite);
        if (pcs.length === 0) return null;

        const sharpNames = pcs.map(pc => theory.getNote(pc)?.sharp).filter(Boolean);
        const flatNames = pcs.map(pc => theory.getNote(pc)?.flat).filter(Boolean);

        const sharpDup = this._countLetterDuplicates(sharpNames);
        const flatDup = this._countLetterDuplicates(flatNames);

        if (sharpDup < flatDup) return false;
        if (flatDup < sharpDup) return true;
        return null;
    }

    _autoAssignContextScaleTonic(rootFret, rootString, intervals = null) {
        const theory = this.theory;
        const instrument = this.app?.instrument;
        if (!theory || !instrument) return;

        const rootRaw = instrument.getNoteAt?.(rootString - 1, rootFret);
        if (!rootRaw || !Number.isFinite(rootRaw.index)) return;

        if (!theory.hasRoot?.()) {
            theory.setRoot(rootRaw.index);
            this.onChange?.({
                type: "root",
                index: rootRaw.index
            });
        }

        // Choisit ♯/♭ selon l'orthographe la plus cohérente de la gamme (moins de doublons de lettres).
        const preferredUseFlats = this._pickUseFlatsForScale(rootRaw.index, intervals);
        if (typeof preferredUseFlats === "boolean") {
            theory.useFlats = preferredUseFlats;
            const accidentalSwitch = this.app?.components?.find(c => c.name === "metalSwitch1");
            const targetState = preferredUseFlats ? 0 : 1;
            if (accidentalSwitch && accidentalSwitch.state !== targetState) {
                accidentalSwitch.setState(targetState);
            }
        }
    }

    _applyContextScaleSelection(modeId, layoutId, side = "right") {
        const rootFret = this.contextMenu?.fret;
        const rootString = this.contextMenu?.string;
        if (rootFret == null || rootString == null) return false;

        const intervals = this._getScaleIntervalsByMode(modeId);
        if (!intervals || intervals.length === 0) return false;

        this._autoAssignContextScaleTonic(rootFret, rootString, intervals);

        if (typeof MultiNotes !== "function") return false;
        const dispatcher = new MultiNotes(this);

        const hovered = { fret: rootFret, string: rootString };
        const mode = layoutId === "diagonal"
            ? "Diagonal"
            : (side === "left" ? "BoxL" : "BoxR");

        const way = side === "left" ? "down" : "up";
        const octaveShown = layoutId === "diagonal" ? 2 : "T";

        const generated = dispatcher.dispatch(mode, intervals, hovered, way, octaveShown) || [];

        let changed = false;
        for (const pos of generated) {
            if (!pos || !Number.isFinite(pos.fret) || !Number.isFinite(pos.string)) continue;
            if (pos.string < 1 || pos.string > this.strings.length) continue;
            if (pos.fret < 0 || pos.fret > this.fretCount) continue;

            const added = this._addAnimatedNote(this.pinnedNotes, pos.fret, pos.string, "pin", {
                displayMode: this.displayMode
            });
            changed = changed || added;
        }

        if (changed) this.invalidate();
        return changed;
    }

    _handleContextMenuClick(evt) {
        if (!this.contextMenu?.visible || !evt) return false;

        const action = this._getContextMenuActionAt(evt.x, evt.y);

        if (!action) {
            this._closeContextMenu();
            return true;
        }

        if (evt.button !== LEFT) {
            this._closeContextMenu();
            return true;
        }

        if (action === "chord") {
            this._setContextMenuStage("quality");
            return true;
        }

        if (action === "scale") {
            if (this.contextMenu) {
                this.contextMenu.scaleType = null;
                this.contextMenu.scaleFamily = null;
                this.contextMenu.scaleMode = null;
            }
            this._setContextMenuStage("scale");
            return true;
        }

        if (action === "scaleType:diatonic") {
            if (this.contextMenu) {
                this.contextMenu.scaleType = "diatonic";
                this.contextMenu.scaleFamily = null;
                this.contextMenu.scaleMode = null;
            }
            this._setContextMenuStage("scaleFamily");
            return true;
        }

        if (action === "scaleType:pentatonic") {
            if (this.contextMenu) {
                this.contextMenu.scaleType = "pentatonic";
                this.contextMenu.scaleFamily = null;
                this.contextMenu.scaleMode = null;
            }
            this._setContextMenuStage("scaleModes");
            return true;
        }

        if (action === "scaleFamily:major") {
            if (this.contextMenu) {
                this.contextMenu.scaleFamily = "major";
                this.contextMenu.scaleMode = null;
            }
            this._setContextMenuStage("scaleModes");
            return true;
        }

        if (action === "scaleFamily:minor") {
            if (this.contextMenu) {
                this.contextMenu.scaleFamily = "minor";
                this.contextMenu.scaleMode = null;
            }
            this._setContextMenuStage("scaleModes");
            return true;
        }

        if (typeof action === "string" && action.startsWith("scaleMode:")) {
            if (this.contextMenu) {
                this.contextMenu.scaleMode = action.slice("scaleMode:".length);
            }
            this._setContextMenuStage("scaleLayout");
            return true;
        }

        if (action === "scaleLayout:box:left"
            || action === "scaleLayout:box:right"
            || action === "scaleLayout:diagonal:left"
            || action === "scaleLayout:diagonal:right") {
            const modeId = this.contextMenu?.scaleMode;
            const layoutId = action.includes(":box:") ? "box" : "diagonal";
            const side = action.endsWith(":left") ? "left" : "right";
            this._applyContextScaleSelection(modeId, layoutId, side);
            this._closeContextMenu();
            return true;
        }

        if (action === "majorLeft") {
            this._applyContextChordQuality("major", "left");
            this._closeContextMenu();
            return true;
        }

        if (action === "majorRight") {
            this._applyContextChordQuality("major", "right");
            this._closeContextMenu();
            return true;
        }

        if (action === "minorLeft") {
            this._applyContextChordQuality("minor", "left");
            this._closeContextMenu();
            return true;
        }

        if (action === "minorRight") {
            this._applyContextChordQuality("minor", "right");
            this._closeContextMenu();
            return true;
        }

        this._closeContextMenu();
        return true;
    }


setNextIntervalMode() {

    const modes = this.intervalModes;
    const i = modes.indexOf(this.intervalMode);

    const next = (i + 1) % modes.length;
    this.setIntervalMode(modes[next]); // utilise le setter propre

    return this.intervalMode;
}


    setDisplayMode(mode) {
        const nextMode = this._normalizeDisplayMode(mode);
        if (nextMode === this.displayMode) return;
        this.displayMode = nextMode;
        this.invalidate();
    }

    setLabelType(type) {
        const allowed = ["noteEN", "noteFR"];
        if (!allowed.includes(type)) return;
        this.labelType = type;
        this.invalidate();
    }

    // ------------------------------------------------------------
    // GETTERS
    // ------------------------------------------------------------

    getThickness() { return this.h; }
    getLength()    { return this.w; }

    getStringLabelOffset() {
        return this.getThickness() * 0.25;
    }

    getNeckRect() {
        return { x:this.x, y:this.y, w:this.w, h:this.h };
    }

    _normalizeChordRadarChord(chord) {
        if (!chord) return null;

        const chordPitchClasses = Array.isArray(chord.chordPitchClasses)
            ? [...new Set(chord.chordPitchClasses.map(pc => ((pc % 12) + 12) % 12))]
            : [];

        if (chordPitchClasses.length === 0) return null;

        const index = Number.isInteger(chord.index) ? chord.index : -1;
        const rootPc = Number.isInteger(chord.rootPc)
            ? ((chord.rootPc % 12) + 12) % 12
            : chordPitchClasses[0];

        return {
            index,
            roman: String(chord.roman ?? ""),
            chord: String(chord.chord ?? ""),
            quality: String(chord.quality ?? ""),
            degreeIndex: Number.isInteger(chord.degreeIndex) ? chord.degreeIndex : index,
            rootPc,
            chordPitchClasses,
            selectionKey: String(chord.selectionKey ?? `chord|${index}|${rootPc}|${chordPitchClasses.join(",")}`)
        };
    }

    _sameChordRadarChord(a, b) {
        if (!a && !b) return true;
        if (!a || !b) return false;
        return a.selectionKey === b.selectionKey;
    }

    _sameChordRadarChordList(a, b) {
        if (a === b) return true;
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;

        for (let i = 0; i < a.length; i++) {
            if (!this._sameChordRadarChord(a[i], b[i])) return false;
        }

        return true;
    }

    _fadeOutChordRadarPreview(chord) {
        if (!chord || !this.overlays?.getChordRadarOccurrences) return;

        const notes = this.overlays.getChordRadarOccurrences([chord]);
        for (const note of notes) {
            this.overlays.enqueuePopOut(note, "chordRadar", {
                animType: "popOutSeq",
                duration: 220
            });
        }
    }

    setChordRadarPreview(chord) {
        const next = this._normalizeChordRadarChord(chord);
        const prev = this.chordRadarPreview;

        if (this._sameChordRadarChord(prev, next)) return;

        if (prev) {
            this._fadeOutChordRadarPreview(prev);
        }

        this.chordRadarPreview = next;
        this.invalidate();
    }

    clearChordRadarPreview() {
        this.setChordRadarPreview(null);
    }

    setChordRadarSelections(chords) {
        const next = (Array.isArray(chords) ? chords : [])
            .map(chord => this._normalizeChordRadarChord(chord))
            .filter(Boolean)
            .sort((a, b) => a.selectionKey.localeCompare(b.selectionKey));

        if (this._sameChordRadarChordList(this.chordRadarSelections, next)) return;

        this.chordRadarSelections = next;
        if (next.length > 0) {
            this.clearChordRadarPreview();
        }
        this.invalidate();
    }

    clearChordRadarSelections() {
        if (this.chordRadarSelections.length === 0) return;
        this.chordRadarSelections = [];
        this.invalidate();
    }

    hasChordRadarSelections() {
        return Array.isArray(this.chordRadarSelections) && this.chordRadarSelections.length > 0;
    }

    hasChordRadarPreview() {
        return !!this.chordRadarPreview;
    }

    isChordRadarOverlayActive() {
        return this.hasChordRadarSelections() || this.hasChordRadarPreview();
    }

    getChordRadarRadiusPx() {
        this._ensureGeometryProjected();

        const minRadius = this.getThickness() * 0.62;
        const caseA = this.cases[0];
        const caseB = this.cases[Math.min(5, this.fretCount)] ?? this.cases[this.cases.length - 1];
        const span = (caseA && caseB)
            ? Math.abs(caseB.xc - caseA.xc) + (caseA.width * 0.5)
            : this.getThickness() * 2.5;
        const maxRadius = Math.max(minRadius, span);

        return lerp(minRadius, maxRadius, this.chordRadarRadiusT);
    }

    adjustChordRadarRadius(direction) {
        const prev = this.chordRadarRadiusT;
        this.chordRadarRadiusT = constrain(
            this.chordRadarRadiusT + direction * this.chordRadarRadiusStep,
            0,
            1
        );

        if (prev === this.chordRadarRadiusT) return false;

        this.invalidate();
        return true;
    }

    getNutWidth() {
        return this.getThickness() / 10;
    }

    getPositionsForPitchClass(pc) {
        const app = this.app;
        if (!app || !app.instrument) return [];

        const out = [];

        for (let s = 1; s <= this.strings.length; s++) {
            for (let f = 0; f <= this.fretCount; f++) {

                const raw = app.instrument.getNoteAt(s - 1, f);
                if (!raw) continue;

                if (raw.index === pc) {
                    out.push({ string: s, fret: f });
                }
            }
        }

        return out;
    }

    // ------------------------------------------------------------
    // COORDONNÉES
    // ------------------------------------------------------------

    toScreen(caseIndex, stringIndex) {
        this._ensureGeometryProjected();

        const c = this.cases[caseIndex];
        const s = this.strings[stringIndex - 1];

        if (!c || !s) return null;

        return {
            x: c.xc,
            y: s.y
        };
    }

fromScreen(x, y) {
    this._ensureGeometryProjected();

    // 1) Vérifier que la souris est VRAIMENT dans le manche
    const neck = this.getNeckRect();
    if (x < neck.x || x > neck.x + neck.w) return null;
    if (y < neck.y || y > neck.y + neck.h) return null;

    // 2) Trouver la case
    let fret = null;
    for (const c of this.cases) {
        if (x >= c.x1 && x <= c.x2) {
            fret = c.index;
            break;
        }
    }

    // 3) Trouver la corde
    let string = null;
    let bestDy = Infinity;
    for (const s of this.strings) {
        const dy = Math.abs(y - s.y);
        if (dy < bestDy) {
            bestDy = dy;
            string = s.index;
        }
    }

    if (fret == null || string == null) return null;

    return { fret, string };
}


    highlightNote(pc) {
        this.highlighted = this.getPositionsForPitchClass(pc)
            .map(p => ({ ...p, t: 0 }));

        this._startHighlightTimer();
        this.invalidate();
    }

    // ------------------------------------------------------------
    // DRAW
    // ------------------------------------------------------------

    draw() {
        this._ensureGeometryProjected();

        this.renderer.draw();
        this.overlays.draw();

        super.draw();
    }

    // ------------------------------------------------------------
    // INTERACTIONS
    // ------------------------------------------------------------

    onNoteClicked(noteIndex) {
        if (!this.theory.hasRoot()) {
            this.theory.setRoot(noteIndex);
            //console.log("new tonic "+noteIndex)
            this.invalidate();
            return;
        }
        
        // sinon comportement normal (sélection, highlight, etc.)
    }

    isPinned(fret, string) {
        return this.pinnedNotes.some(n => n.fret === fret && n.string === string);
    }

    isSelected(fret, string) {
        return this.selectedNotes.some(n => n.fret === fret && n.string === string);
    }

    _addAnimatedNote(list, fret, string, burstType, noteData = null) {
        const now = millis();
        const idx = list.findIndex(n => n.fret === fret && n.string === string);

        if (idx >= 0) {
            // Note déjà présente: relance seulement le pop-in.
            list[idx].animStart = now;
            if (noteData?.displayMode != null) {
                list[idx].displayMode = this._normalizeDisplayMode(noteData.displayMode);
            }
            return false;
        }

        list.push({
            ...(noteData || {}),
            fret,
            string,
            animStart: now,
            displayMode: this._normalizeDisplayMode(noteData?.displayMode)
        });

        this.interactionBursts.push({
            fret,
            string,
            t: 0,
            type: burstType
        });
        this._startBurstTimer();
        return true;
    }

    _emitPopOut(note, type, opts = {}) {
        this.overlays?.enqueuePopOut(note, type, opts);
    }

    _removeWithPopOut(list, fret, string, type) {
        const idx = list.findIndex(n => n.fret === fret && n.string === string);
        if (idx < 0) return false;

        const [removed] = list.splice(idx, 1);
        this._emitPopOut(removed, type);
        return true;
    }

    _clearWithPopOut(list, type) {
        for (const n of list) {
            this._emitPopOut(n, type);
        }
        list.length = 0;
    }

    _normalizeSnapshotNotes(list) {
        const out = [];
        const seen = new Set();

        for (const n of (list || [])) {
            if (!n) continue;
            const fret = n.fret;
            const string = n.string;
            if (fret == null || string == null) continue;

            const key = `${string}:${fret}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(this._createStoredNote(n));
        }

        return out;
    }

    _transitionNoteList(
        currentList,
        targetList,
        type,
        popInDuration = 220,
        replayExisting = false,
        popInAnimType = "pop",
        popOutAnimType = "popOut",
        popOutDuration = 380,
        previousPadNotes = null
    ) {
        const now = millis();
        const currentMap = new Map(currentList.map(n => [`${n.string}:${n.fret}`, n]));
        const targetMap = new Map(targetList.map(n => [`${n.string}:${n.fret}`, n]));
        const prevMap = previousPadNotes 
            ? new Map(previousPadNotes.map(n => [`${n.string}:${n.fret}`, true]))
            : new Map();

        // 1) Sorties: tout ce qui n'existe plus -> pop-out.
        for (const n of currentList) {
            const key = `${n.string}:${n.fret}`;
            if (!targetMap.has(key)) {
                this._emitPopOut(n, type, {
                    animType: popOutAnimType,
                    duration: popOutDuration
                });
            }
        }

        // 2) Entrées: nouvelles notes -> pop-in rapide.
        const next = [];
        for (const n of targetList) {
            const key = `${n.string}:${n.fret}`;
            const existing = currentMap.get(key);
            const isSequenceReplay = popInAnimType === "popSeq";

            if (existing) {
                existing.displayMode = this._normalizeDisplayMode(n.displayMode ?? existing.displayMode);
                if (isSequenceReplay) {
                    existing.seqHoldPulse = true;
                    existing.seqHoldPulseStart = now;
                    existing.seqHoldPulseFrequency = 16;
                    existing.seqHoldPulseAlphaMin = 45;
                    existing.seqHoldPulseAlphaMax = 190;
                    existing.seqHoldPulseScale = 0.34;
                } else {
                    delete existing.seqHoldPulse;
                    delete existing.seqHoldPulseStart;
                    delete existing.seqHoldPulseFrequency;
                    delete existing.seqHoldPulseAlphaMin;
                    delete existing.seqHoldPulseAlphaMax;
                    delete existing.seqHoldPulseScale;
                }

                if (replayExisting) {
                    // En séquence, chaque step est une réattaque: rejouer l'anim même si la note est identique.
                    const wasInPreviousPad = prevMap.has(key);
                    if (isSequenceReplay || !wasInPreviousPad) {
                        existing.animStart = now;
                        existing.animDuration = popInDuration;
                        existing.animType = popInAnimType;
                    }
                }
                next.push(existing);
            } else {
                next.push({
                    ...this._createStoredNote(n),
                    fret: n.fret,
                    string: n.string,
                    animStart: now,
                    animDuration: popInDuration,
                    animType: popInAnimType,
                    seqHoldPulse: isSequenceReplay,
                    seqHoldPulseStart: isSequenceReplay ? now : undefined,
                    seqHoldPulseFrequency: isSequenceReplay ? 16 : undefined,
                    seqHoldPulseAlphaMin: isSequenceReplay ? 45 : undefined,
                    seqHoldPulseAlphaMax: isSequenceReplay ? 190 : undefined,
                    seqHoldPulseScale: isSequenceReplay ? 0.34 : undefined
                });
            }
        }

        return next;
    }

    applySnapshotAnimated(snap, opts = {}) {
        if (!snap) return;

        const {
            popInDuration = 220,
            includeMarkers = true,
            replayExisting = false,
            animProfile = "snappy"
        } = opts;

        const isSequenceProfile = animProfile === "sequence";
        const popInAnimType = isSequenceProfile ? "popSeq" : "pop";
        const popOutAnimType = isSequenceProfile ? "popOutSeq" : "popOut";
        const popOutDuration = isSequenceProfile ? 260 : 380;

        if (snap.root !== null && snap.root !== undefined) {
            this.theory.setRoot(snap.root);
        } else {
            this.theory.root = null;
        }

        const targetPinned = this._normalizeSnapshotNotes(snap.pinnedNotes);
        const targetSelected = this._normalizeSnapshotNotes(snap.selectedNotes);

        // Sauvegarde des notes du pad précédent avant transition (pour éviter pop sur notes persistantes)
        const prevPinned = this.pinnedNotes;
        const prevSelected = this.selectedNotes;

        this.pinnedNotes = this._transitionNoteList(
            prevPinned,
            targetPinned,
            "pinned",
            popInDuration,
            replayExisting,
            popInAnimType,
            popOutAnimType,
            popOutDuration,
            this.previousPadNotesPinned
        );

        this.selectedNotes = this._transitionNoteList(
            prevSelected,
            targetSelected,
            "selected",
            popInDuration,
            replayExisting,
            popInAnimType,
            popOutAnimType,
            popOutDuration,
            this.previousPadNotesSelected
        );

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

        if (isSequenceProfile) {
            const now = millis();
            const applySeqHoldPulse = (list) => {
                if (!Array.isArray(list)) return;
                for (const n of list) {
                    if (!n) continue;
                    n.seqHoldPulse = true;
                    if (!Number.isFinite(n.seqHoldPulseStart)) n.seqHoldPulseStart = now;
                    n.seqHoldPulseFrequency = Number.isFinite(n.seqHoldPulseFrequency) ? n.seqHoldPulseFrequency : 16;
                    n.seqHoldPulseAlphaMin = Number.isFinite(n.seqHoldPulseAlphaMin) ? n.seqHoldPulseAlphaMin : 45;
                    n.seqHoldPulseAlphaMax = Number.isFinite(n.seqHoldPulseAlphaMax) ? n.seqHoldPulseAlphaMax : 190;
                    n.seqHoldPulseScale = Number.isFinite(n.seqHoldPulseScale) ? n.seqHoldPulseScale : 0.34;
                }
            };

            applySeqHoldPulse(this.pinnedNotes);
            applySeqHoldPulse(this.selectedNotes);
        } else {
            clearSeqHoldPulse(this.pinnedNotes);
            clearSeqHoldPulse(this.selectedNotes);
        }

        // Mise à jour de l'historique du pad pour la prochaine transition
        this.previousPadNotesPinned = prevPinned;
        this.previousPadNotesSelected = prevSelected;

        if (includeMarkers) {
            this.markerSegments = [...(snap.markerSegments || [])];
        }

        this.invalidate();
    }

    togglePinnedNote(fret, string) {
        const idx = this.pinnedNotes.findIndex(n => n.fret === fret && n.string === string);

        if (idx >= 0) {
            // Dépin
            this._removeWithPopOut(this.pinnedNotes, fret, string, "pinned");

        } else {
            // Pin
            this._addAnimatedNote(this.pinnedNotes, fret, string, "pin", { displayMode: this.displayMode });
        }
        this.invalidate();
    }

    toggleSelected(fret, string) {
        const idx = this.selectedNotes.findIndex(n => n.fret === fret && n.string === string);

        if (idx >= 0) {
            // Déselection
            this._removeWithPopOut(this.selectedNotes, fret, string, "selected");

        } else {
            // Sélection
            this._addAnimatedNote(this.selectedNotes, fret, string, "select", { displayMode: this.displayMode });
        }

        this.invalidate();
    }

    // ---- Animation presets -----------------------------------------------
    setAnimationPreset(name) {
        this.anim.setPreset(name);
    }

    _startHighlightTimer() {
        if (this._highlightTimer) return;

        const cfg = this.anim?.highlight || {};

        this.targetTime = cfg.targetTime ?? 1.0;   // durée de la cible (en secondes)
        this.dotTime    = cfg.dotTime ?? 15.0;  // durée du fade-out du point final (en secondes)

        const dt      = cfg.dt ?? 0.02; // vitesse d’incrémentation (≈60 FPS)
        const totalT  = this.targetTime + this.dotTime; // durée totale
        const timerMs = this.anim?.timers?.fastMs ?? 16;

        this._highlightTimer = setInterval(() => {

            let done = true;

            for (let h of this.highlighted) {
                h.t += dt;

                if (h.t < totalT) done = false;
            }

            this.invalidate();

            if (done) {
                clearInterval(this._highlightTimer);
                this._highlightTimer = null;
                this.highlighted = [];
                this.invalidate();
            }

        }, timerMs);
    }

    _startBurstTimer() {
        if (this._burstTimer) return;

        const timerMs = this.anim?.timers?.fastMs ?? 16;

        this._burstTimer = setInterval(() => {

            if (!this.interactionBursts || this.interactionBursts.length === 0) {
                clearInterval(this._burstTimer);
                this._burstTimer = null;
                return;
            }

            this.invalidate();

        }, timerMs); // ~60 FPS
    }

    _enqueueNotesChain(notes, usePinned = true) {
        if (!Array.isArray(notes) || notes.length === 0) return;

        this._chainAddQueue = notes.map(n => ({
            string: n.string,
            fret: n.fret,
            displayMode: this._normalizeDisplayMode(n.displayMode ?? this.displayMode)
        }));
        this._chainAddTarget = usePinned ? "pinned" : "selected";

        if (this._chainAddTimer) {
            clearInterval(this._chainAddTimer);
            this._chainAddTimer = null;
        }

        const stepMs = this.anim?.chain?.stepMs ?? 55;

        this._chainAddTimer = setInterval(() => {
            if (this._chainAddQueue.length === 0) {
                clearInterval(this._chainAddTimer);
                this._chainAddTimer = null;
                return;
            }

            const n = this._chainAddQueue.shift();

            const target = this._chainAddTarget === "pinned"
                ? this.pinnedNotes
                : this.selectedNotes;

            const burstType = this._chainAddTarget === "pinned" ? "pin" : "select";
            this._addAnimatedNote(target, n.fret, n.string, burstType, n);

            this.invalidate();
        }, stepMs);
    }

    _moveFrets(list, delta) {
        return list.map(n => ({
            ...n,
            fret: n.fret + delta,
            string: n.string
        }));
    }

    _moveStrings(list, delta) {
        const minString = 1;
        const maxString = this.strings.length;
        const tuning    = this.instrument.tuning;

        return list.map(n => {
            let string = n.string;
            let fret   = n.fret;

            const step = Math.sign(delta);
            let remaining = Math.abs(delta);

            while (remaining > 0) {
                const oldString = string;
                let newString = oldString + step;

                if (newString < minString) newString = maxString;
                if (newString > maxString) newString = minString;

                const midiOld = tuning[oldString - 1].midi;
                const midiNew = tuning[newString - 1].midi;
                const diff    = Math.abs(midiNew - midiOld);

                if (diff === 4) {
                    fret += (step > 0 ? 1 : -1);
                }

                string = newString;
                remaining--;
            }

            return {
                ...n,
                fret,
                string
            };
        });
    }

    moveSelectedFrets(delta) {
        // Ne JAMAIS toucher pinnedNotes pendant le mouvement
        // Les selectedNotes sont un ensemble totalement indépendant
        this.selectedNotes = this._moveFrets(this.selectedNotes, delta);
        this.invalidate();
    }

    moveSelectedStrings(delta) {
        // Ne JAMAIS toucher pinnedNotes pendant le mouvement
        // Les selectedNotes sont un ensemble totalement indépendant
        this.selectedNotes = this._moveStrings(this.selectedNotes, delta);
        this.invalidate();
    }

    movePinnedFrets(delta) {
        this.pinnedNotes = this._moveFrets(this.pinnedNotes, delta);
        this._moveMarkerSegmentsFrets(delta);
        this.invalidate();
    }

    movePinnedStrings(delta) {
        this.pinnedNotes = this._moveStrings(this.pinnedNotes, delta);
        this._moveMarkerSegmentsStrings(delta);
        this.invalidate();
    }

    _moveMarkerSegmentsFrets(delta) {
        if (!Array.isArray(this.markerSegments) || this.markerSegments.length === 0) return;

        this.markerSegments = this.markerSegments.map(seg => {
            if (!seg) return seg;

            const a0 = seg.a ?? null;
            const b0 = seg.b ?? null;
            const moved = this._moveFrets([a0, b0].filter(Boolean), delta);

            const a = a0 ? moved[0] : null;
            const b = b0 ? moved[a0 ? 1 : 0] : null;

            return {
                ...seg,
                a,
                b
            };
        });
    }

    _moveMarkerSegmentsStrings(delta) {
        if (!Array.isArray(this.markerSegments) || this.markerSegments.length === 0) return;

        this.markerSegments = this.markerSegments.map(seg => {
            if (!seg) return seg;

            const a0 = seg.a ?? null;
            const b0 = seg.b ?? null;
            const moved = this._moveStrings([a0, b0].filter(Boolean), delta);

            const a = a0 ? moved[0] : null;
            const b = b0 ? moved[a0 ? 1 : 0] : null;

            return {
                ...seg,
                a,
                b
            };
        });
    }

    // ------------------------------------------------------------
    // INTERACTIONS SOURIS
    // ------------------------------------------------------------

   mousePressed(evt) {
    this._lastEvt = evt;

    // --- MODE MARKER (clic gauche direct) ---
    if (this.markerMode) {
        //console.log("[MARKER] mousePressed capture");

        // Neutralise tout etat de clic/drag herite du mode normal.
        this.isPressed = false;
        this.dragging = false;
        this.wasDragged = false;

        if (evt?.button !== LEFT) {
            return true;
        }

        const pos = this.fromScreen(evt.x, evt.y);
        if (!pos) {
            //console.log("[MARKER] Aucun point valide sous la souris");
            return true;
        }

        // POINT A
        if (this.markerPendingPoint === null) {
            this.markerPendingPoint = pos;
            //console.log("[MARKER] Point A =", pos);
        }

        // POINT B
        else {
            this.markerSegments.push({
                a: this.markerPendingPoint,
                b: pos,
                color: this.markerColor
            });

            //console.log("[MARKER] Point B =", pos);
            //console.log("[MARKER] Segment ajouté :", this.markerSegments[this.markerSegments.length - 1]);

            this.markerPendingPoint = null;
        }

        this.invalidate();
        return true;
    }

    // --- MODE NORMAL ---
    return super.mousePressed(evt);
}

    
    mouseDragged(evt) {
            if (this.markerMode) {
                return true;
            }

        if (this.isPressed) {
            this.wasDragged = true;
        }
        return super.mouseDragged(evt);
    }
    
    mouseReleased(evt) {
            if (this.markerMode) {
                // Bloque strictement le pipeline onClick du composant parent en mode marker.
                this.isPressed = false;
                this.dragging = false;
                this.wasDragged = false;
                return true;
            }

        // Ne jamais declencher onClick si ce composant n'a pas recu mousePressed localement.
        // Evite les toggles fantomes via un _lastEvt stale (ex: dernier point marker).
        if (!this.isPressed && !this.dragging) {
            return false;
        }

        const res = super.mouseReleased(evt);
        return res;
    }
    
    mouseMoved(evt) {

        if (this.contextMenu?.visible) {
            const hadHover = !!this.hoveredNote || this.isHovered;
            this.hoveredNote = null;
            this.chordRadarPointer = null;
            this.isHovered = false;
            if (hadHover) {
                this.invalidate();
            }
            return false;
        }

        super.mouseMoved?.(evt);

        const prevInside = this.isHovered;
        const prevShift = this.shiftDown;
        const prevHover = this.hoveredNote;

        const inside = this.containsRect(evt);
        this.isHovered = inside;
        this.shiftDown = evt.shiftKey;
        this.chordRadarPointer = inside ? { x: evt.x, y: evt.y } : null;

        if (inside) {
            this.hoveredNote = this.fromScreen(evt.x, evt.y);
        } else {
            this.hoveredNote = null;
        }

        const prevFret = prevHover?.fret ?? null;
        const prevString = prevHover?.string ?? null;
        const nextFret = this.hoveredNote?.fret ?? null;
        const nextString = this.hoveredNote?.string ?? null;

        const hoverChanged = (prevFret !== nextFret) || (prevString !== nextString);
        const stateChanged = (prevInside !== inside) || (prevShift !== this.shiftDown) || hoverChanged;

        if (stateChanged) {
            const now = millis();
            const shouldInvalidateNow =
                hoverChanged ||
                (prevInside !== inside) ||
                (now - this._lastHoverInvalidateAt >= this._hoverInvalidateMs);

            if (shouldInvalidateNow) {
                this._lastHoverInvalidateAt = now;
                this.invalidate();
            }
        }

        return inside;
    }

    mouseWheel(evt) {
        if (!evt.altKey && this.hasChordRadarSelections() && this.containsRect(evt)) {
            const direction = evt.delta < 0 ? 1 : -1;
            return this.adjustChordRadarRadius(direction);
        }

        return super.mouseWheel(evt);
    }

    onClick() {

     
    if (this.markerMode) {
        //console.log("[MARKER] onClick ignoré (mode marker actif)");
        return false;
    }

        const evt = this._lastEvt;
        if (!evt) return false;

        if (this.contextMenu?.visible) {
            return this._handleContextMenuClick(evt);
        }

        // --- MODE MARKER : on ignore complètement onClick ---
        if (this.markerMode) return false;

        if (!this.containsRect(evt)) return false;

        const hit = this.fromScreen(evt.x, evt.y);
        if (!hit) return false;

        const { fret, string } = hit;

        if (evt.button === RIGHT) {
            const note = this._getStoredNoteAt(fret, string);
            if (note) {
                // Clic droit sur une note d'une selection multiple: applique le cycle a toute la selection.
                if (this.isSelected(fret, string) && this.selectedNotes.length > 1) {
                    const modes = ["note", "degree", "none"];
                    const currentIndex = Math.max(0, modes.indexOf(this._normalizeDisplayMode(note.displayMode)));
                    const nextMode = modes[(currentIndex + 1) % modes.length];
                    this._setSelectedNotesDisplayMode(nextMode);
                } else {
                    this._cycleStoredNoteDisplayMode(fret, string);
                }
            } else {
                this._openContextMenuForHit(hit, evt);
            }
            return true;
        }

        const storedNote = this._getStoredNoteAt(fret, string);
        if (storedNote && this._normalizeDisplayMode(storedNote.displayMode) === "none") {
            this._removeWithPopOut(this.pinnedNotes, fret, string, "pinned");
            this._removeWithPopOut(this.selectedNotes, fret, string, "selected");
            this.invalidate();
            return true;
        }

        // 1) NOTIFIER LES RÈGLES
        this.onChange?.({
            type: "noteClick",
            fret,
            string,
            ctrlKey: evt.ctrlKey,
            shiftKey: evt.shiftKey
        });

        // 2) INTERACTIONS LOCALES

        // SHIFT → selected
        if (evt.shiftKey) {
            this.toggleSelected(fret, string);
            return true;
        }

        // clic normal → pinned
        this.togglePinnedNote(fret, string);

        // si on dépinne → on retire aussi de selected
        if (!this.isPinned(fret, string)) {
            this._removeWithPopOut(this.selectedNotes, fret, string, "selected");
        }

        this.invalidate();
        return true;
    }

    keyReleased(k, kc) {
        if (kc === SHIFT) {
            this.shiftDown = false;
            this.invalidate();
            return true;
        }

        return false;
    }

keyPressed(k, kc) {

    // --- PRIORITÉ : MODE MARKER ---
    if (this.markerMode) {

        if (kc === BACKSPACE) {
            // efface le dernier segment
            if (this.markerSegments.length > 0) {
                this.markerSegments.pop();
                this.invalidate();
            }
            return true;
        }

        if (kc === DELETE) {
            // efface tous les segments
            if (this.markerSegments.length > 0) {
                this.markerSegments = [];
                this.invalidate();
            }
            return true;
        }

        // Déplacement des marqueurs uniquement (pas des notes)
        switch (kc) {
            case LEFT_ARROW:
                this._moveMarkerSegmentsFrets(-1);
                this.invalidate();
                return true;

            case RIGHT_ARROW:
                this._moveMarkerSegmentsFrets(+1);
                this.invalidate();
                return true;

            case UP_ARROW:
                this._moveMarkerSegmentsStrings(+1);
                this.invalidate();
                return true;

            case DOWN_ARROW:
                this._moveMarkerSegmentsStrings(-1);
                this.invalidate();
                return true;
        }

        // pas d'autres interactions notes en mode marker
        return false;
    }

    // SHIFT : change l’aspect du hover
    if (kc === SHIFT) {
        this.shiftDown = true;
        this.invalidate();
        return true;
    }

    // Priorité absolue: si des notes sont sélectionnées, Backspace/Delete agissent uniquement sur elles.
    const hasSelectedNotes = this.selectedNotes.length > 0;
    const targetSelected = hasSelectedNotes || keyIsDown(SHIFT);

    // --- BACKSPACE / DELETE (pinned / selected) ---
    if (kc === BACKSPACE) {

        if (targetSelected) {
            // efface la dernière selected
            if (this.selectedNotes.length > 0) {
                const n = this.selectedNotes[this.selectedNotes.length - 1];
                this._removeWithPopOut(this.selectedNotes, n.fret, n.string, "selected");
                this.invalidate();
            }
        } else {
            // efface la dernière pinned
            if (this.pinnedNotes.length > 0) {
                const n = this.pinnedNotes[this.pinnedNotes.length - 1];
                this._removeWithPopOut(this.pinnedNotes, n.fret, n.string, "pinned");
                this.invalidate();
            }
        }

        return true;
    }

    if (kc === DELETE) {

        if (targetSelected) {
            // efface toutes les selected
            if (this.selectedNotes.length > 0) {
                this._clearWithPopOut(this.selectedNotes, "selected");
                this.invalidate();
            }
        } else {
            // efface toutes les pinned
            if (this.pinnedNotes.length > 0) {
                this._clearWithPopOut(this.pinnedNotes, "pinned");
                this.invalidate();
            }
        }

        return true;
    }

    // --- ARROWS ---
    // Priorité aux selectedNotes; sinon on déplace les pinnedNotes.
    switch (kc) {
        case LEFT_ARROW:
            if (this.selectedNotes.length > 0) this.moveSelectedFrets(-1);
            else if (this.pinnedNotes.length > 0) this.movePinnedFrets(-1);
            return true;

        case RIGHT_ARROW:
            if (this.selectedNotes.length > 0) this.moveSelectedFrets(+1);
            else if (this.pinnedNotes.length > 0) this.movePinnedFrets(+1);
            return true;

        case UP_ARROW:
            if (this.selectedNotes.length > 0) this.moveSelectedStrings(+1);
            else if (this.pinnedNotes.length > 0) this.movePinnedStrings(+1);
            return true;

        case DOWN_ARROW:
            if (this.selectedNotes.length > 0) this.moveSelectedStrings(-1);
            else if (this.pinnedNotes.length > 0) this.movePinnedStrings(-1);
            return true;
    }

if (kc === ENTER) {

    const notes = this.overlays.intervalOverlayNotes || [];
    if (notes.length === 0) return true;

    const usePinned = !keyIsDown(SHIFT);
    this._enqueueNotesChain(notes, usePinned);

    this.invalidate();
    return true;
}



    return false;
}


}
