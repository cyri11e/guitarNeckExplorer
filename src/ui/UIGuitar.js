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
        this.pinnedNotes = []; // { fret, string }

        // 🔥 Ajout : flag anti-clic-après-drag
        this.wasDragged = false;
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

    togglePinnedNote(fret, string) {
        const idx = this.pinnedNotes.findIndex(n => n.fret === fret && n.string === string);

        if (idx >= 0) {
            this.pinnedNotes.splice(idx, 1);
        } else {
            this.pinnedNotes.push({ fret, string });
        }

        this.invalidate();
    }

    // 🔥 Ajout : gestion propre du drag/click

    mousePressed(mx, my) {
        this.wasDragged = false; // reset
        return super.mousePressed(mx, my);
    }

    mouseDragged(mx, my) {
        this.wasDragged = true; // un vrai drag a eu lieu
        return super.mouseDragged(mx, my);
    }

    mouseReleased(mx, my) {
        return super.mouseReleased(mx, my);
    }

    mouseClicked(mx, my) {
        // 🔥 Empêche le pin si un drag a eu lieu
        if (this.wasDragged) {
            this.wasDragged = false;
            return false;
        }

        if (!this.containsRect(mx, my)) return false;

        const hit = this.fromScreen(mx, my);
        if (!hit) return false;

        this.togglePinnedNote(hit.fret, hit.string);
        return true;
    }
}
