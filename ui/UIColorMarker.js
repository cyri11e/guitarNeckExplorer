class MarkerSelector extends UIComponent {
    constructor(xp, yp, sp, config = {}) {
        super();

        this.title = config.title || "";
        this.shortcutKey = config.shortcutKey || null;

        this._state = -1;

        this.noteColors = [
            color(255, 20, 20),
            color(255, 82, 90),
            color(255, 165, 10),
            color(255, 210, 10),
            color(200, 200, 10),
            color(144, 238, 144),
            color(72, 169, 127),
            color(20, 40, 255),
            color(68, 103, 192),
            color(75, 10, 130),
            color(111, 21, 168),
            color(148, 10, 211)
        ];

        this.activeColor = this.noteColors[0];

        this.setResponsive(xp, yp, sp, config);
        UIManager.register(this);

        this.debug = true;
    }

    get state() { return this._state; }
    set state(v) {
        if (this._state === v) return;
        this._state = v;
        this.triggerChange(v);
    }

    onShortcut() {
        if (this._state === -1) {
            this.activeColor = this.noteColors[0];
            this.state = 1;
        } else {
            this.state = -1;
        }
    }

    mousePressed(mx, my) {

        // 1) clic pastilles
        if (this.hover && this.hitDots) {
            for (let d of this.hitDots) {
                if (
                    mx >= d.x && mx <= d.x + d.w &&
                    my >= d.y && my <= d.y + d.h
                ) {
                    this.activeColor = this.noteColors[d.colorIndex];
                    this.state = 1;
                    return;
                }
            }
        }

        // 2) clic ON/OFF
        if (
            mx >= this.hitOnOff.x &&
            mx <= this.hitOnOff.x + this.hitOnOff.w &&
            my >= this.hitOnOff.y &&
            my <= this.hitOnOff.y + this.hitOnOff.h
        ) {
            this.onShortcut();
            return;
        }
    }

    draw() {

        this.drawDebugRect();

        const W = this.w;
        const H = this.h;

        const x0 = this.x;
        const y0 = this.y;
        const cx = x0 + W / 2;

        const col = (this._state === 1) ? this.activeColor : color(150);

        // -------------------------
        // PROPORTIONS
        // -------------------------
        const topW = W * 0.50;
        const topH = H * 0.20 * 2;
        const topX = x0 + (W - topW) / 2;

        const midW = W * 0.40;
        const midH = H * 0.22;
        const midX = x0 + (W - midW) / 2;
        const midY = y0 + topH;

        const tipH = H * 0.25;
        const tipY = midY + midH;

        // -------------------------
        // HITZONE ON/OFF
        // -------------------------
        this.hitOnOff = {
            x: midX,
            y: midY,
            w: midW,
            h: midH
        };

        // -------------------------
        // HITZONES PASTILLES
        // -------------------------
        this.hitDots = [];

        if (this.hover) {

            const dotSize = H / 6;
            const spacing = H / 6;
            const startY = y0 + (H - spacing * 6) / 2;

            for (let i = 0; i < 6; i++) {

                const y = startY + i * spacing + dotSize / 2;

                // gauche
                const gx = x0 + dotSize * 0.3;
                this.hitDots.push({
                    x: gx - dotSize / 2,
                    y: y - dotSize / 2,
                    w: dotSize,
                    h: dotSize,
                    colorIndex: i
                });

                // droite
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

        // -------------------------
        // 1) PARTIE HAUTE
        // -------------------------
        stroke(0);
        strokeWeight(1.2);
        fill(col);
        rect(topX, y0, topW, topH, 0, 0, W * 0.10, W * 0.10);

        // -------------------------
        // 2) PARTIE MILIEU
        // -------------------------
        fill(this._state === 1 ? 255 : 220);
        noStroke();
        rect(midX, midY, midW, midH - W * 0.10);
        arc(midX + midW / 2, midY + midH - W * 0.10, midW, W * 0.20, 0, PI);

        stroke(0);
        noFill();
        rect(midX, midY, midW, midH - W * 0.10);
        arc(midX + midW / 2, midY + midH - W * 0.10, midW, W * 0.20, 0, PI);

        // -------------------------
        // 3) POINTE LOGO
        // -------------------------
        stroke(0);
        strokeWeight(1.2);
        fill(col);

        const u = tipH * 0.7;

        const p0x = cx - u * 0.5;
        const p0y = tipY + tipH;

        const p1x = p0x;
        const p1y = tipY;

        const p2x = p1x + u;
        const p2y = tipY;

        const p3x = p2x;
        const p3y = tipY + tipH * 0.5;

        beginShape();
        vertex(p0x, p0y);
        vertex(p1x, p1y);
        vertex(p2x, p2y);
        vertex(p3x, p3y);
        endShape(CLOSE);

        // -------------------------
        // 4) PASTILLES (dessin)
        // -------------------------
        if (this.hover) {

            const dotSize = H / 6;
            const spacing = H / 6;
            const startY = y0 + (H - spacing * 6) / 2;

            for (let i = 0; i < 6; i++) {

                const y = startY + i * spacing + dotSize / 2;

                fill(this.noteColors[i]);
                noStroke();
                circle(x0 + dotSize * 0.3, y, dotSize);

                fill(this.noteColors[i + 6]);
                circle(x0 + W - dotSize * 0.3, y, dotSize);
            }
        }
    }
}
