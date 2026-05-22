class UIInteractionManager {

    constructor() {
        this.components = [];
        this.shortcuts = {};
        this.captureOwner = null;
        this.mouseIsDown = false;

        // ============================================================
        // INTERACTIONS GUITARE (globales)
        // ============================================================
        this.guitar = null;       // détectée automatiquement
        this.brushActive = false; // clic gauche = pinceau
        this.eraseActive = false;
        this.dragActive = false;  // CTRL = drag du manche

        this.lastX = 0;
        this.lastY = 0;
        // ============================================================
        // SÉLECTION RECTANGULAIRE
        // ============================================================
        this.rectangleSelectionActive = false;
        this.selectionStartX = null;
        this.selectionStartY = null;
        this.selectionEndX = null;
        this.selectionEndY = null;
        this.selectionMovedThreshold = 8;
        this.leftDownHit = null;
    }

    // ============================================================
    // REGISTER / UNREGISTER
    // ============================================================

    register(component) {
        this.components.push(component);

        // Détection automatique de la guitare
        if (component instanceof Guitar) {
            this.guitar = component;
        }

        if (component.shortcutKey) {
            this.shortcuts[component.shortcutKey.toLowerCase()] = component;
        }
    }

    unregister(component) {
        this.components = this.components.filter(c => c !== component);
    }

    _getTopLevelByZDesc() {
        if (this.app?.getTopLevelComponentsByZ) {
            return this.app.getTopLevelComponentsByZ(false);
        }

        const roots = this.components.filter(c => !c.parent);
        return roots.reverse();
    }

    _isHitOnNonGuitarControl(comp, evt) {
        if (!comp) return false;

        if (Array.isArray(comp.children) && comp.children.length > 0) {
            for (let i = comp.children.length - 1; i >= 0; i--) {
                if (this._isHitOnNonGuitarControl(comp.children[i], evt)) {
                    return true;
                }
            }
        }

        if (comp instanceof Guitar) return false;

        // Les conteneurs (panel) ne doivent pas bloquer la guitare:
        // on bloque seulement sur un contrôle concret non-guitare.
        if (Array.isArray(comp.children) && comp.children.length > 0) {
            return false;
        }

        return !!comp.containsRect?.(evt);
    }

    _hasTopControlHit(evt) {
        for (const root of this._getTopLevelByZDesc()) {
            if (this._isHitOnNonGuitarControl(root, evt)) {
                return true;
            }
        }
        return false;
    }

    // ============================================================
    // EVENT BUILDER
    // ============================================================

_buildEvent(mx, my) {
    return {
        x: mx,
        y: my,
        shiftKey: keyIsDown(SHIFT),
        altKey: keyIsDown(ALT),
        ctrlKey: keyIsDown(CONTROL),
        button: mouseButton
    };
}

    _findAltTarget(evt) {
        for (const root of this._getTopLevelByZDesc()) {
            if (!root?.containsRect?.(evt)) continue;
            if (!(root.isDraggable || root.isZoomable)) continue;
            return root;
        }
        return null;
    }

    _startAltCapture(evt) {
        const target = this._findAltTarget(evt);
        if (!target) return false;

        UIComponent.prototype.mousePressed.call(target, evt);
        this.captureOwner = target;
        this.altCapture = true;

        if (target.bringToFrontOnPress === true) {
            this.app?.bringRootToFront?.(target);
        }

        return true;
    }

    _releaseAltCapture() {
        if (!this.captureOwner) return false;

        this.captureOwner.isPressed = false;
        this.captureOwner.dragging = false;
        this.captureOwner = null;
        this.altCapture = false;
        return true;
    }


    // ============================================================
    // INTERACTIONS GUITARE — HANDLERS INTERNES
    // ============================================================

    _guitarContainsWithMargin(evt, marginRatio = 0.20) {
        const g = this.guitar;
        const mx = g.w * marginRatio;
        const my = g.h * marginRatio;
        return (
            evt.x >= g.x - mx &&
            evt.x <= g.x + g.w + mx &&
            evt.y >= g.y - my &&
            evt.y <= g.y + g.h + my
        );
    }

    _isMarkerDrawGesture(evt) {
        return !!(this.guitar?.markerMode && evt?.button === LEFT);
    }

    _resetGlobalGuitarInteractionState() {
        this.brushActive = false;
        this.eraseActive = false;
        this.dragActive = false;
        this.rectangleSelectionActive = false;
        this.selectionStartX = null;
        this.selectionStartY = null;
        this.selectionEndX = null;
        this.selectionEndY = null;
        this.leftDownHit = null;
    }

    _handleGlobalMousePressed(evt) {
        if (this.guitar?.contextMenu?.visible) {
            if (this.guitar._contextMenuContains?.(evt.x, evt.y)) {
                this.guitar._lastEvt = evt;
                this.guitar._handleContextMenuClick?.(evt);
            } else {
                this.guitar._closeContextMenu?.();
            }
            return true;
        }

        if (!this.guitar) {
            console.log("_handleGlobalMousePressed: NO GUITAR");
            return false;
        }
        if (!this._guitarContainsWithMargin(evt)) {
            console.log("_handleGlobalMousePressed: NOT IN GUITAR");
            return false;
        }

        // Ne pas capturer si un contrôle UI non-guitare est visé.
        if (this._hasTopControlHit(evt)) {
            console.log("_handleGlobalMousePressed: HAS TOP CONTROL HIT");
            return false;
        }

        // En mode marker, la guitare gere directement les clics (pas d'interactions notes globales).
        if (this.guitar?.markerMode) {
            this._resetGlobalGuitarInteractionState();
            console.log("_handleGlobalMousePressed: marker mode -> passthrough");
            return false;
        }

        if (this.guitar?.contextMenu?.visible) {
            return false;
        }

        console.log("_handleGlobalMousePressed: CAPTURED! btn=" + evt.button);

        if (this._isMarkerDrawGesture(evt)) {
            console.log("_handleGlobalMousePressed: marker draw gesture -> passthrough");
            return false;
        }

        this.lastX = evt.x;
        this.lastY = evt.y;

        // Clic gauche: on attend le release pour valider un clic simple,
        // ou on bascule en sélection rectangulaire si déplacement.
        if (evt.button === LEFT) {
            this.leftDownHit = this.guitar.fromScreen(evt.x, evt.y);
            this.selectionStartX = evt.x;
            this.selectionStartY = evt.y;
            this.selectionEndX = evt.x;
            this.selectionEndY = evt.y;
            this.rectangleSelectionActive = false;

            console.log("LEFT CLICK: selection start at", { x: evt.x, y: evt.y });

            this.eraseActive = false;
            this.dragActive = false;
            this.app?.bringRootToFront?.(this.guitar);
            this.guitar.invalidate();
            return true;
        }

        // Clic droit = gomme
        if (evt.button === RIGHT) {
            return false;
        }

        return false;
    }

    _handleGlobalMouseMoved(evt) {
        if (!this.guitar) return false;

        if (this.guitar.markerMode) {
            this._resetGlobalGuitarInteractionState();
            return false;
        }

        if (this.eraseActive) {
            const hit = this.guitar.fromScreen(evt.x, evt.y);
            if (hit) {
                this.guitar._removeWithPopOut(this.guitar.pinnedNotes, hit.fret, hit.string, "pinned");
                this.guitar._removeWithPopOut(this.guitar.selectedNotes, hit.fret, hit.string, "selected");
                this.guitar.invalidate();
            }
            return true;
        }

        return false;
    }

    _handleGlobalMouseDragged(evt) {
        if (!this.guitar) return false;

        if (this.guitar.markerMode) {
            this._resetGlobalGuitarInteractionState();
            return false;
        }

        if (this.selectionStartX != null && this.selectionStartY != null) {
            const dx = evt.x - this.selectionStartX;
            const dy = evt.y - this.selectionStartY;
            const distSq = dx * dx + dy * dy;
            const thresholdSq = this.selectionMovedThreshold * this.selectionMovedThreshold;
            const moved = distSq >= thresholdSq;

            console.log("mouseDragged:", { dx, dy, distSq, thresholdSq, moved, active: this.rectangleSelectionActive });

            if (moved || this.rectangleSelectionActive) {
                this.rectangleSelectionActive = true;
                this.selectionEndX = evt.x;
                this.selectionEndY = evt.y;
                console.log("Rectangle active! End:", { x: evt.x, y: evt.y });
                this.guitar.invalidate();
                return true;
            }
        }

        if (this.dragActive) {
            const dx = evt.x - this.lastX;
            const dy = evt.y - this.lastY;

            this.lastX = evt.x;
            this.lastY = evt.y;

            this.guitar.moveBy(dx, dy);
            return true;
        }

        return false;
    }

    _handleGlobalMouseReleased(evt) {
        if (this.guitar?.markerMode) {
            this._resetGlobalGuitarInteractionState();
            return false;
        }

        if (this.guitar && this.selectionStartX != null && this.selectionStartY != null) {
            if (this.rectangleSelectionActive) {
                const rect = {
                    x1: Math.min(this.selectionStartX, this.selectionEndX),
                    y1: Math.min(this.selectionStartY, this.selectionEndY),
                    x2: Math.max(this.selectionStartX, this.selectionEndX),
                    y2: Math.max(this.selectionStartY, this.selectionEndY)
                };

                const notesInRect = this._getNoteListInRectangle(rect);

                if (evt.ctrlKey) {
                    // CTRL: toggle par lot dans la sélection courante.
                    for (const n of notesInRect) {
                        const selectedIdx = this.guitar.selectedNotes.findIndex(
                            s => s.fret === n.fret && s.string === n.string
                        );

                        if (selectedIdx >= 0) {
                            // Retire de selected -> remet en pinned
                            const movedNote = this.guitar.selectedNotes[selectedIdx];
                            this.guitar.selectedNotes.splice(selectedIdx, 1);

                            const pinnedExists = this.guitar.pinnedNotes.some(
                                p => p.fret === n.fret && p.string === n.string
                            );
                            if (!pinnedExists) {
                                this.guitar.pinnedNotes.push(this.guitar._createStoredNote(movedNote || n));
                            }
                        } else {
                            // Ajoute à selected -> retire de pinned
                            const movedNote = this.guitar.pinnedNotes.find(
                                p => p.fret === n.fret && p.string === n.string
                            );
                            this.guitar.pinnedNotes = this.guitar.pinnedNotes.filter(
                                p => !(p.fret === n.fret && p.string === n.string)
                            );

                            const selectedExists = this.guitar.selectedNotes.some(
                                s => s.fret === n.fret && s.string === n.string
                            );
                            if (!selectedExists) {
                                this.guitar.selectedNotes.push(this.guitar._createStoredNote(movedNote || n));
                            }
                        }
                    }
                } else {
                    // Sans CTRL: la sélection rectangle devient la sélection courante.
                    // Les anciens selected hors rectangle reviennent en pinned (pas de disparition).
                    const rectKeys = new Set(notesInRect.map(n => `${n.string}:${n.fret}`));
                    const pool = [
                        ...(this.guitar.pinnedNotes || []),
                        ...(this.guitar.selectedNotes || [])
                    ];

                    const nextPinned = [];
                    const nextSelected = [];
                    const seenPinned = new Set();
                    const seenSelected = new Set();

                    for (const n of pool) {
                        const key = `${n.string}:${n.fret}`;
                        if (rectKeys.has(key)) {
                            if (!seenSelected.has(key)) {
                                seenSelected.add(key);
                                nextSelected.push(this.guitar._createStoredNote(n));
                            }
                        } else {
                            if (!seenPinned.has(key)) {
                                seenPinned.add(key);
                                nextPinned.push(this.guitar._createStoredNote(n));
                            }
                        }
                    }

                    this.guitar.pinnedNotes = nextPinned;
                    this.guitar.selectedNotes = nextSelected;
                }

                this.guitar.invalidate();
            } else {
                const releaseHit = this.guitar.fromScreen(evt.x, evt.y);
                const releaseStoredNote = releaseHit
                    ? this.guitar._getStoredNoteAt(releaseHit.fret, releaseHit.string)
                    : null;
                const sameNote = !!(
                    this.leftDownHit &&
                    releaseHit &&
                    this.leftDownHit.fret === releaseHit.fret &&
                    this.leftDownHit.string === releaseHit.string
                );

                // CTRL + clic: toggle direct de la selection pour la note cliquée,
                // sans dependre du seuil drag/rectangle.
                if (evt.ctrlKey && sameNote && releaseHit) {
                    const keyFret = releaseHit.fret;
                    const keyString = releaseHit.string;

                    const selectedIdx = this.guitar.selectedNotes.findIndex(
                        n => n.fret === keyFret && n.string === keyString
                    );

                    if (selectedIdx >= 0) {
                        // selected -> pinned
                        const movedNote = this.guitar.selectedNotes[selectedIdx];
                        this.guitar.selectedNotes.splice(selectedIdx, 1);

                        const pinnedExists = this.guitar.pinnedNotes.some(
                            n => n.fret === keyFret && n.string === keyString
                        );
                        if (!pinnedExists) {
                            this.guitar.pinnedNotes.push(this.guitar._createStoredNote(movedNote || releaseHit));
                        }
                    } else {
                        // pinned -> selected
                        const movedNote = this.guitar.pinnedNotes.find(
                            n => n.fret === keyFret && n.string === keyString
                        );
                        this.guitar.pinnedNotes = this.guitar.pinnedNotes.filter(
                            n => !(n.fret === keyFret && n.string === keyString)
                        );

                        this.guitar.selectedNotes.push(this.guitar._createStoredNote(movedNote || { fret: keyFret, string: keyString }));
                    }

                    this.guitar.invalidate();
                }
                // Sans CTRL, comportement existant.
                else 
                // Si selectedNotes actives: clic confirme la sélection (remet les notes dans pinnedNotes)
                if (this.guitar.selectedNotes && this.guitar.selectedNotes.length > 0) {
                    for (let note of this.guitar.selectedNotes) {
                        const exists = this.guitar.pinnedNotes.some(
                            n => n.fret === note.fret && n.string === note.string
                        );
                        if (!exists) {
                            this.guitar.pinnedNotes.push(this.guitar._createStoredNote(note));
                        }
                    }
                    this.guitar.selectedNotes = [];
                    this.guitar.invalidate();
                    // Pas de return ici — on laisse le cleanup s'exécuter normalement ci-dessous
                } else {
                    // Sinon: clic simple toggle pinnedNotes
                    if (sameNote && releaseHit) {
                        const idx = this.guitar.pinnedNotes.findIndex(
                            n => n.fret === releaseHit.fret && n.string === releaseHit.string
                        );
                        if (idx >= 0) {
                            this.guitar._removeWithPopOut(this.guitar.pinnedNotes, releaseHit.fret, releaseHit.string, "pinned");
                        } else {
                            this.guitar.pinnedNotes.push(this.guitar._createStoredNote({ fret: releaseHit.fret, string: releaseHit.string }));
                        }
                        this.guitar.invalidate();
                    }
                }
            }
        }

        this._resetGlobalGuitarInteractionState();
        return false;
    }

    // ============================================================
    // MOUSE EVENTS WITH CAPTURE + GLOBAL GUITAR LAYER
    // ============================================================

    mouseMoved(mx, my) {
        const evt = this._buildEvent(mx, my);

        if (this._handleGlobalMouseMoved(evt)) return true;

        // propagation UI
        for (const c of this._getTopLevelByZDesc()) {
            c.mouseMoved?.(evt);
        }
    }

    mousePressed(mx, my) {
        this.mouseIsDown = true;
        const evt = this._buildEvent(mx, my);
        console.log("UIInteractionManager.mousePressed:", { mx, my });

        if (evt.altKey) {
            console.log("→ AltCapture mode");
            return this._startAltCapture(evt);
        }

        // 1) Interactions guitare
        if (this._handleGlobalMousePressed(evt)) {
            console.log("→ Handled by _handleGlobalMousePressed");
            return true;
        }

        // 2) Sinon propagation UI (top → bottom)
        for (const c of this._getTopLevelByZDesc()) {
            if (c.mousePressed?.(evt)) {
                if (c.bringToFrontOnPress === true) {
                    this.app?.bringRootToFront?.(c);
                }
                this.captureOwner = c;
                console.log("→ Handled by UI component:", c.name);
                return true;
            }
        }

        console.log("→ Not handled");
        return false;
    }

    mouseDragged(mx, my) {
        const evt = this._buildEvent(mx, my);
        console.log("UIInteractionManager.mouseDragged:", { mx, my });

        if (this.altCapture && this.captureOwner) {
            return UIComponent.prototype.mouseDragged.call(this.captureOwner, evt) || false;
        }

        // 1) Interactions guitare
        if (this._handleGlobalMouseDragged(evt)) {
            console.log("→ Handled by _handleGlobalMouseDragged");
            return true;
        }

        // 2) Capture UI
        if (this.captureOwner) {
            return this.captureOwner.mouseDragged?.(evt) || false;
        }

        // 3) Propagation UI
        for (const c of this._getTopLevelByZDesc()) {
            if (c.mouseDragged?.(evt)) return true;
        }

        return false;
    }

    mouseReleased(mx, my) {
        this.mouseIsDown = false;
        const evt = this._buildEvent(mx, my);

        if (this.altCapture) {
            return this._releaseAltCapture();
        }

        // 1) Interactions guitare
        this._handleGlobalMouseReleased(evt);

        // 2) Capture UI
        if (this.captureOwner) {
            const consumed = this.captureOwner.mouseReleased?.(evt) || false;
            this.captureOwner = null;
            return consumed;
        }

        // 3) Propagation UI
        for (const c of this._getTopLevelByZDesc()) {
            if (c.mouseReleased?.(evt)) return true;
        }

        return false;
    }

    // ============================================================
    // WHEEL
    // ============================================================

    mouseWheel(event) {
        const evt = {
            x: mouseX,
            y: mouseY,
            delta: event.delta,
            shiftKey: keyIsDown(SHIFT),
            altKey:   keyIsDown(ALT),
            ctrlKey:  keyIsDown(CONTROL)
        };

        if (evt.altKey) {
            const target = this._findAltTarget(evt);
            if (target) {
                return UIComponent.prototype.mouseWheel.call(target, evt) || false;
            }
        }

        for (const c of this._getTopLevelByZDesc()) {
            if (c.mouseWheel?.(evt)) return true;
        }
        return false;
    }

    // ============================================================
    // KEYBOARD + SHORTCUTS
    // ============================================================

    keyPressed(k, kc) {
        const lower = k.toLowerCase();

        // Propagation UI
        for (let i = this.components.length - 1; i >= 0; i--) {
            const c = this.components[i];

            if (c.keyPressed?.(k, kc)) return true;
        }

        return false;
    }

    keyReleased(k, kc) {
        this.invalidateAll();
        for (let i = this.components.length - 1; i >= 0; i--) {
            const c = this.components[i];
            if (c.keyReleased?.(k, kc)) return true;
        }
        return false;
    }

    // ============================================================
    // SHORTCUTS
    // ============================================================

    handleShortcut(k, code) {
        const lower = k.toLowerCase();

        for (let i = this.components.length - 1; i >= 0; i--) {
            const c = this.components[i];

            if (c.shortcutKey && lower === c.shortcutKey.toLowerCase()) {
                c.onShortcut?.();
                return true;
            }

            if (c.shortcutCode && code === c.shortcutCode) {
                c.onShortcut?.();
                return true;
            }
        }

        return false;
    }

    _getNoteListInRectangle(rect) {
        if (!this.guitar) return [];

        const notes = [];
        const seen = new Set();
        console.log("_getNoteListInRectangle: rect =", rect);

        // Sélectionne parmi l'union pinned + selected pour éviter la perte d'une
        // sélection en cours lors d'une nouvelle boîte de sélection.
        const pool = [
            ...(this.guitar.pinnedNotes || []),
            ...(this.guitar.selectedNotes || [])
        ];

        for (let note of pool) {
            const key = `${note.string}:${note.fret}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const pos = this.guitar.toScreen(note.fret, note.string);
            if (!pos) continue;

            const inRect = (pos.x >= rect.x1 && pos.x <= rect.x2 && pos.y >= rect.y1 && pos.y <= rect.y2);
            
            if (inRect) {
                if (note.displayMode === "none") continue;
                console.log(`  ✓ Selected note: fret=${note.fret}, string=${note.string}, pos={x:${pos.x}, y:${pos.y}}`);
                notes.push(this.guitar._createStoredNote(note));
            } else {
                console.log(`  - Outside rect: fret=${note.fret}, string=${note.string}, pos={x:${pos.x}, y:${pos.y}}`);
            }
        }
        
        console.log("_getNoteListInRectangle: total selected =", notes.length, notes);

        return notes;
    }

    // ============================================================
    // REDRAW
    // ============================================================

    invalidateAll() {
        for (let c of this.components) c.invalidate?.();
    }

    // ============================================================
    // RULE DISPATCH
    // ============================================================

    onComponentChange(component, newState) {
        for (const rule of UI_RULES) {
            rule(this.components, component, newState);
        }
    }
}
