class MarkerSelector extends UIComponent {
    constructor(cfg = {}) {
        super();

        this.aspectRatio = cfg.aspectRatio ?? 1.0;

        const xp = cfg.xp ?? 0;
        const yp = cfg.yp ?? 0;
        const sp = cfg.sp ?? 10;

        this.setResponsive(xp, yp, sp);
        this.updateResponsive();

        this.shortcutKey = cfg.shortcutKey || null;
        this.description = cfg.description || null;
        
        this._state = -1; // OFF
        this.activeColorIndex = 0;

        this.noteColors = [
            color("#ea0e0e"),  // tonique fondamentale rouge
            color("#b9730b"),  // m2 seconde orange
            color("#e38d0c"),  // M2
            color("#c5b315"),  // m3 tierce jaune
            color("#d7e60e"),  // M3
            color("#0fde32"),  // P4 vert
            color("#42b5c7"),  // TT bleu vert
            color("#3863f1"),  // P5 bleu
            color("#ae48da"),  // m6
            color("#860ce3"),  // M6
            color("#d165b9"),  // m7
            color("#e80cb4"),  // M7
        ];

        this.activeColor = this.noteColors[0];

        this.isHovered = false;
        this.hitOnOff = { x:0, y:0, w:0, h:0 };
        this.hitDots = [];

        this.debugHitZones = true;
    }

    mouseMoved(evt) {
        this.isHovered = this.containsRect(evt);
        this.rebuildHitZones();
        this.invalidate();
        return this.isHovered;
    }

    containsRect(evt) {
        return (
            evt.x >= this.x &&
            evt.x <= this.x + this.w &&
            evt.y >= this.y &&
            evt.y <= this.y + this.h
        );
    }

    onClick() {
        return true;
    }

    onShortcut() {
         this._state = (this._state === 1 ? -1 : 1);

            this.onChange?.({
                type: "markerToggle",
                state: this._state
            });
    }

    mousePressed(evt) {

        this.rebuildHitZones();

        // --- PASTILLES ---
        for (let d of this.hitDots) {
            if (
                evt.x >= d.x && evt.x <= d.x + d.w &&
                evt.y >= d.y && evt.y <= d.y + d.h
            ) {
                this.activeColorIndex = d.colorIndex;
                this.activeColor = this.noteColors[d.colorIndex];

                // activer UI
                this.setActive?.(true);

                // activer marker (sans toggle)
                if (this._state !== 1) {
                    this._state = 1;
                    this.onChange?.({
                        type: "markerToggle",
                        state: this._state
                    });
                }

                // notifier couleur
                this.onChange?.({
                    type: "markerColor",
                    index: d.colorIndex
                });

                this.invalidate();
                return true;
            }
        }

        // --- ZONE CENTRALE (toggle) ---
        if (
            evt.x >= this.hitOnOff.x &&
            evt.x <= this.hitOnOff.x + this.hitOnOff.w &&
            evt.y >= this.hitOnOff.y &&
            evt.y <= this.hitOnOff.y + this.hitOnOff.h
        ) {
            this._state = (this._state === 1 ? -1 : 1);

            this.onChange?.({
                type: "markerToggle",
                state: this._state
            });

            this.setActive?.(true);
            this.invalidate();
            return true;
        }

        return false;
    }

    rebuildHitZones() {
        const W = this.w;
        const H = this.h;
        const x0 = this.x;
        const y0 = this.y;

        // zone centrale = 50% largeur, 100% hauteur
        const midW = this.w * 0.50;
        const midH = this.h;
        const midX = this.x + (this.w - midW) / 2;
        const midY = this.y;

        this.hitOnOff = {
            x: midX,
            y: midY,
            w: midW,
            h: midH
        };

        this.hitDots = [];

        if (!this.isHovered) return;

        const dotSize = H / 6;
        const spacing = H / 6;
        const startY = y0 + (H - spacing * 6) / 2;

        for (let i = 0; i < 6; i++) {
            const y = startY + i * spacing + dotSize / 2;

            const gx = x0 + dotSize * 0.3;
            this.hitDots.push({
                x: gx - dotSize / 2,
                y: y - dotSize / 2,
                w: dotSize,
                h: dotSize,
                colorIndex: i
            });

            const dx = x0 + W - dotSize * 0.3;
            this.hitDots.push({
                x: dx - dotSize / 2,
                y: y - dotSize / 2,
                w: dotSize,
                h: dotSize,
                colorIndex: i + 6
            });
        }
    }

    draw() {
        this.drawDebugRect();
        this.rebuildHitZones();

        const W = this.w;
        const H = this.h;
        const x0 = this.x;
        const y0 = this.y;
        const cx = x0 + W / 2;

        const col = (this._state === 1) ? this.activeColor : color(150);

        // --- TOP ---
        const topW = W * 0.50;
        const topH = H * 0.40;
        const topX = x0 + (W - topW) / 2;

        stroke(0);
        strokeWeight(1.2);
        fill(col);
        rect(topX, y0, topW, topH, 0, 0, W * 0.10, W * 0.10);

        // --- MIDDLE ---
        const midW = W * 0.40;
        const midH = H * 0.18;
        const midX = x0 + (W - midW) / 2;
        const midY = y0 + topH + H * 0.01;

        fill(this._state === 1 ? 255 : 220);
        noStroke();
        rect(midX, midY, midW, midH - W * 0.10);
        arc(midX + midW / 2, midY + midH - W * 0.10, midW, W * 0.20, 0, PI);

        stroke(0);
        noFill();
        rect(midX, midY, midW, midH - W * 0.10);
        arc(midX + midW / 2, midY + midH - W * 0.10, midW, W * 0.20, 0, PI);

        // --- TIP ---
        const tipH = H * 0.25;
        const tipY = midY + midH;
        const u = tipH * 0.7;

        stroke(0);
        strokeWeight(1.2);
        fill(col);

        beginShape();
        vertex(cx - u * 0.5, tipY + tipH);
        vertex(cx - u * 0.5, tipY);
        vertex(cx + u * 0.5, tipY);
        vertex(cx + u * 0.5, tipY + tipH * 0.5);
        endShape(CLOSE);

        // --- DOTS ---
        if (this.isHovered) {
            const dotSize = H / 6;
            const spacing = H / 6;
            const startY = y0 + (H - spacing * 6) / 2;

            for (let i = 0; i < 6; i++) {
                const y = startY + i * spacing + dotSize / 2;

                const gx = x0 + dotSize * 0.3;
                fill(this.noteColors[i]);
                noStroke();
                circle(gx, y, dotSize);

                const dx = x0 + W - dotSize * 0.3;
                fill(this.noteColors[i + 6]);
                circle(dx, y, dotSize);
            }
        }


    }
}
