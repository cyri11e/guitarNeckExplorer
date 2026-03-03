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

        this.selectedNotes = [
            // { fret: 3, string: 3 }
        ]; // { fret, string }

        //  Ajout : flag anti-clic-après-drag
        this.wasDragged = false;

        this.displayMode = cfg.displayMode ?? "note";     // note | degree | none
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

        // --- MODE MARKER ---
        this.markerMode = false;
        this.markerSegments = [];
        this.markerPendingPoint = null;
        this.markerColor = color(255, 0, 0);

        // --- overlays caged ----
        this.cagedOV = false
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


setNextIntervalMode() {

    const modes = this.intervalModes;
    const i = modes.indexOf(this.intervalMode);

    const next = (i + 1) % modes.length;
    this.setIntervalMode(modes[next]); // utilise le setter propre

    return this.intervalMode;
}


    setDisplayMode(mode) {
        const allowed = ["note", "degree", "none"];
        if (!allowed.includes(mode)) return;
        this.displayMode = mode;
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
        const c = this.cases[caseIndex];
        const s = this.strings[stringIndex - 1];

        if (!c || !s) return null;

        return {
            x: c.xc,
            y: s.y
        };
    }

    fromScreen(x, y) {
        let fret = null;
        let string = null;

        for (const c of this.cases) {
            if (x >= c.x1 && x <= c.x2) {
                fret = c.index;
                break;
            }
        }

        let bestDy = Infinity;
        for (const s of this.strings) {
            const dy = Math.abs(y - s.y);
            if (dy < bestDy) {
                bestDy = dy;
                string = s.index;
            }
        }

        if (fret == null || string == null) return null;

        this.hoveredNote = { fret, string };
        this.invalidate();

        return this.hoveredNote;
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
        this.geometry.projectGeometry();

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

    togglePinnedNote(fret, string) {
        const idx = this.pinnedNotes.findIndex(n => n.fret === fret && n.string === string);

        if (idx >= 0) {
            // Dépin
            this.pinnedNotes.splice(idx, 1);

        } else {
            // Pin
            this.pinnedNotes.push({ fret, string });

            // Animation rapide
            this.interactionBursts.push({
                fret,
                string,
                t: 0,
                type: "pin"
            });
            this._startBurstTimer();
        }
        this.invalidate();
    }

    toggleSelected(fret, string) {
        const idx = this.selectedNotes.findIndex(n => n.fret === fret && n.string === string);

        if (idx >= 0) {
            // Déselection
            this.selectedNotes.splice(idx, 1);

        } else {
            // Sélection
            this.selectedNotes.push({ fret, string });

            // Animation rapide
            this.interactionBursts.push({
                fret,
                string,
                t: 0,
                type: "select"
            });
            this._startBurstTimer();
        }

        this.invalidate();
    }

    _startHighlightTimer() {
        if (this._highlightTimer) return;

        this.targetTime = 1.0;   // durée de la cible (en secondes)
        this.dotTime    = 15.0;  // durée du fade-out du point final (en secondes)

        const dt      = 0.02; // vitesse d’incrémentation (≈60 FPS)
        const totalT  = this.targetTime + this.dotTime; // durée totale

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

        }, 16);
    }

    _startBurstTimer() {
        if (this._burstTimer) return;

        this._burstTimer = setInterval(() => {

            if (!this.interactionBursts || this.interactionBursts.length === 0) {
                clearInterval(this._burstTimer);
                this._burstTimer = null;
                return;
            }

            this.invalidate();

        }, 16); // ~60 FPS
    }

    _moveFrets(list, delta) {
        return list.map(n => ({
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

            return { fret, string };
        });
    }

    moveSelectedFrets(delta) {
        this.selectedNotes = this._moveFrets(this.selectedNotes, delta);
        this.invalidate();
    }

    moveSelectedStrings(delta) {
        this.selectedNotes = this._moveStrings(this.selectedNotes, delta);
        this.invalidate();
    }

    movePinnedFrets(delta) {
        this.pinnedNotes = this._moveFrets(this.pinnedNotes, delta);
        this.invalidate();
    }

    movePinnedStrings(delta) {
        this.pinnedNotes = this._moveStrings(this.pinnedNotes, delta);
        this.invalidate();
    }

    // ------------------------------------------------------------
    // INTERACTIONS SOURIS
    // ------------------------------------------------------------

   mousePressed(evt) {
    this._lastEvt = evt;

    // --- MODE MARKER ---
    if (this.markerMode) {
        //console.log("[MARKER] mousePressed capturé");

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
        if (this.isPressed) {
            this.wasDragged = true;
        }
        return super.mouseDragged(evt);
    }
    
    mouseReleased(evt) {
        const res = super.mouseReleased(evt);
        return res;
    }
    
    mouseMoved(evt) {

        super.mouseMoved?.(evt);

        const inside = this.containsRect(evt);
        this.isHovered = inside;
        this.shiftDown = evt.shiftKey;

        if (inside) {
            this.hoveredNote = this.fromScreen(evt.x, evt.y);
        } else {
            this.hoveredNote = null;
        }

        this.invalidate();
        return inside;
    }

    onClick() {

     

    if (this.markerMode) {
        //console.log("[MARKER] onClick ignoré (mode marker actif)");
        return false;
    }

        const evt = this._lastEvt;
        if (!evt) return false;

        // --- MODE MARKER : on ignore complètement onClick ---
        if (this.markerMode) return false;

        if (!this.containsRect(evt)) return false;

        const hit = this.fromScreen(evt.x, evt.y);
        if (!hit) return false;

        const { fret, string } = hit;

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
            this.selectedNotes = this.selectedNotes.filter(
                n => !(n.fret === fret && n.string === string)
            );
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

        // --- PRIORITÉ : MODE MARKER → BACKSPACE = SLICE ---
        if (this.markerMode) {
            if (kc === BACKSPACE || kc === DELETE) {
                if (this.markerSegments.length > 0) {
                    this.markerSegments.pop();
                    this.invalidate();
                }
                return true;
            }
            // pas d'autres shortcuts pour l’instant
        }

        // SHIFT : change l’aspect du hover
        if (kc === SHIFT) {
            this.shiftDown = true;
            this.invalidate();
            return true;
        }

        const usePinned = keyIsDown(SHIFT);

        // --- BACKSPACE / DELETE (pinned / selected) ---
        if (kc === BACKSPACE || kc === DELETE) {

            if (usePinned) {
                if (this.selectedNotes.length > 0) {
                    this.selectedNotes.pop();
                    this.invalidate();
                }
            } else {
                if (this.pinnedNotes.length > 0) {
                    this.pinnedNotes.pop();
                    this.invalidate();
                }
            }

            return true;
        }

        // --- ARROWS ---
        switch (kc) {
            case LEFT_ARROW:
                if (usePinned) this.movePinnedFrets(-1);
                else this.moveSelectedFrets(-1);
                return true;

            case RIGHT_ARROW:
                if (usePinned) this.movePinnedFrets(+1);
                else this.moveSelectedFrets(+1);
                return true;

            case UP_ARROW:
                if (usePinned) this.movePinnedStrings(+1);
                else this.moveSelectedStrings(+1);
                return true;

            case DOWN_ARROW:
                if (usePinned) this.movePinnedStrings(-1);
                else this.moveSelectedStrings(-1);
                return true;
        }

        return false;
    }

}
