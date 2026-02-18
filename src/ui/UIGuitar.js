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

        // géométrie logique (ratios)
        this.fretRatio   = this.geometry.computeFretRatios();
        this.stringRatio = this.geometry.computeStringRatios();
        this.inlayFrets  = [3,5,7,9,12,15,17,19,21,24];

        this.geometry.projectGeometry();

        this.openStringNames = ["E", "B", "G", "D", "A", "E"]; 
        this.pinnedNotes = [ { fret: 1, string: 6 }, 
            // { fret: 1, string: 5 }, 
            // { fret: 1, string: 1 }, 
            // { fret: 3, string: 2 }, 
            // { fret: 3, string: 3 },
             { fret: 2, string: 4 } ]; // { fret, string }
        this.selectedNotes = [
                                { fret: 3, string: 3 },
                                // { fret: 5, string: 3 },
                                // { fret: 7, string: 3 },
                                // { fret: 7, string: 4 },
                                // { fret: 5, string: 4 }
                                ]
                                ; // { fret, string }

        // 🔥 Ajout : flag anti-clic-après-drag
        this.wasDragged = false;

        this.displayMode = cfg.displayMode ?? "note";     // note | degree | none
        this.labelType   = cfg.labelType   ?? "noteEN";   // noteEN | noteFR
        this.hoverMode = "cursor"; // "cursor" | "note" | "octave"

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
        return this.getThickness() / 20;
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

    // ------------------------------------------------------------
    // DRAW
    // ------------------------------------------------------------

    draw() {
        this.geometry.projectGeometry();
        this.renderer.draw();
        super.draw();
    }

    // ------------------------------------------------------------
    // INTERACTIONS
    // ------------------------------------------------------------
onNoteClicked(noteIndex) {
    if (!this.theory.hasRoot()) {
        this.theory.setRoot(noteIndex);
        console.log("new tonic "+noteIndex)
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

toggleSelected(fret, string) {
    const idx = this.selectedNotes.findIndex(n => n.fret === fret && n.string === string);
    if (idx >= 0) {
        this.selectedNotes.splice(idx, 1);
    } else {
        this.selectedNotes.push({ fret, string });
    }
    this.invalidate();
}



    togglePinnedNote(fret, string) {
        const idx = this.pinnedNotes.findIndex(n => n.fret === fret && n.string === string);

        if (idx >= 0) {
            this.pinnedNotes.splice(idx, 1);
        } else {
            this.pinnedNotes.push({ fret, string });
        }

        this.invalidate();
    }

highlightNote(noteIndex) {
    this.highlighted = [];

    for (let s = 0; s < this.strings.length; s++) {
        for (let f = 0; f < this.frets; f++) {
            if (this.getNoteAt(s, f) === noteIndex) {
                this.highlighted.push({ s, f, t: 0 });
            }
        }
    }

    this._startHighlightTimer();
    this.invalidate();
}

_startHighlightTimer() {
    if (this._highlightTimer) return;

    this._highlightTimer = setInterval(() => {

        let done = true;

        for (let h of this.highlighted) {
            h.t += 0.05; // vitesse animation
            if (h.t < 1) done = false;
        }

        this.invalidate();

        if (done) {
            clearInterval(this._highlightTimer);
            this._highlightTimer = null;
        }

    }, 16); // ~60 FPS
}


moveSelectedFrets(delta) {
    const maxFret = this.fretCount;

    this.selectedNotes = this.selectedNotes.map(n => ({
        fret: n.fret + delta,   // PAS de clamp ici !
        string: n.string
    }));

    this.invalidate();
}

moveSelectedStrings(delta) {
    const minString = 1;
    const maxString = this.strings.length;
    const tuning    = this.instrument.tuning; // E2, A2, D3, G3, B3, E4...

    this.selectedNotes = this.selectedNotes.map(n => {
        let string = n.string;
        let fret   = n.fret;

        const step = Math.sign(delta);
        let remaining = Math.abs(delta);

        while (remaining > 0) {
            const oldString = string;
            let newString = oldString + step;

            // 1) WRAP VERTICAL
            if (newString < minString) newString = maxString;
            if (newString > maxString) newString = minString;

            // 2) DÉTECTION SOL–SI PAR L’ACCORDAGE (intervalle de 4 demi‑tons)
            const midiOld = tuning[oldString - 1].midi;
            const midiNew = tuning[newString - 1].midi;
            const diff    = Math.abs(midiNew - midiOld);

            if (diff === 4) {
                // paire SOL–SI, on applique ton décalage de frette
                if (step > 0) fret += 1;   // vers "le bas" visuel → frette suivante
                else if (step < 0) fret -= 1; // vers "le haut" visuel → frette précédente
            }

            string = newString;
            remaining--;
        }

        return { fret, string };
    });

    this.invalidate();
}



    // 🔥 Ajout : gestion propre du drag/click

    mousePressed(evt) {
        this.wasDragged = false; // reset
        return super.mousePressed(evt);
    }

    mouseDragged(evt) {
        this.wasDragged = true; // un vrai drag a eu lieu
        return super.mouseDragged(evt);
    }

    mouseReleased(evt) {
        return super.mouseReleased(evt);
    }


    mouseMoved(evt) {
    const inside = this.containsRect(evt);
    this.isHovered = inside;

    if (inside) {
        this.fromScreen(evt.x, evt.y);
    }

    this.invalidate();
    return inside;
}

mouseClicked(evt) {
    if (this.wasDragged) {
        this.wasDragged = false;
        return false;
    }

    if (!this.containsRect(evt)) return false;

    const hit = this.fromScreen(evt.x, evt.y);
    if (!hit) return false;

    const { fret, string } = hit;

    if (evt.shift) {
       
        //this.togglePinnedNote(fret, string);
            this.toggleSelected(fret, string);
        
    } else {
        // comportement existant : pin / unpin
        this.togglePinnedNote(fret, string);

        // si on unpin une note, on la retire aussi de la sélection
        if (!this.isPinned(fret, string)) {
            this.selectedNotes = this.selectedNotes.filter(
                n => !(n.fret === fret && n.string === string)
            );
        }
        this.invalidate();
    }

    return true;
}
keyPressed(k, kc) {
    if (this.selectedNotes.length === 0) return false;

    switch (kc) {
        case LEFT_ARROW:
            this.moveSelectedFrets(-1);
            return true;

        case RIGHT_ARROW:
            this.moveSelectedFrets(+1);
            return true;

        case UP_ARROW:
            this.moveSelectedStrings(+1);
            return true;

        case DOWN_ARROW:
            this.moveSelectedStrings(-1);
            return true;
    }

    return false;
}

}
