// ============================================================
// GUITAR RENDERER — MANCHE UNIQUEMENT
// ============================================================

class GuitarRenderer {
    constructor(guitar, style) {
        this.g = guitar;
        this.style = style;
        this.detectPlatformAdjustments();
    }

    detectPlatformAdjustments() {
        const ua = navigator.userAgent;
        this.altAdjustX = 0;
        this.altAdjustY = 0;

        if (ua.includes("Windows")) {
            this.altAdjustX = -1;
            this.altAdjustY = -0.5;
        } else if (ua.includes("Mac OS")) {
            this.altAdjustX = +0.5;
            this.altAdjustY = 0;
        } else if (ua.includes("Linux")) {
            this.altAdjustX = -0.5;
            this.altAdjustY = -0.5;
        } else if (/iPhone|iPad|Android/.test(ua)) {
            this.altAdjustX = 0;
            this.altAdjustY = +1;
        }
    }

    // ------------------------------------------------------------
    // MANCHE
    // ------------------------------------------------------------
    drawNeck() {
        const g = this.g;
        const neck = g.getNeckRect();
        fill(this.style.getWoodFill());
        stroke(40);
        strokeWeight(2);
        rect(neck.x, neck.y, neck.w, neck.h);
    }

    drawHead() {
        const frets = this.g.frets;
        const nut = frets[0];
        const x0 = this.g.x;
        const y0 = this.g.y;
        const w0 = nut.x - this.g.x;
        const h0 = this.g.h;

        noStroke();
        fill(0, 40);
        rect(x0, y0, w0, h0);
    }

    drawFrets() {
        const frets = this.g.frets;
        const fretThickness = 0.8;

        for (const f of frets) {
            const x0 = f.x - f.w * 0.5;
            const wMain   = f.w * fretThickness;
            const wShadow = wMain * 0.3;
            const wBright = wMain * 0.8;
            const hBright = f.h * 0.25;
            const rCorner = wMain * 0.3;
            const rBright = f.h * 0.25;

            if (f.index === 0) {
                fill(240); noStroke();
                rect(x0, f.y, wMain, f.h);

                fill(0, 50);
                rect(x0 - wShadow, f.y, wShadow, f.h);

                fill(0, 35);
                rect(x0 + wMain, f.y, wShadow, f.h);
                continue;
            }

            fill(0, 40);
            rect(x0 - wShadow, f.y, wMain + wShadow * 2, f.h);

            fill(220);
            rect(x0, f.y, wMain, f.h, rCorner);

            fill(255);
            rect(x0, f.y, wBright, hBright, rBright, 0, 0);

            fill(100);
            rect(
                x0 + wMain * 0.3,
                f.y + wMain * 0.3,
                wMain * 0.6,
                f.h * 0.97,
                wMain * 0.98
            );
        }
    }

    drawStringShadow(s, t) {
        const off  = t * 1.5;
        const size = t * 0.8;
        fill(0, 20);
        noStroke();
        rect(s.x, s.y + off, s.w, size);
    }

    drawStringShadows() {
        const strings = this.g.strings;
        for (let i = 0; i < strings.length; i++) {
            this.drawStringShadow(strings[i], this.style.getStringThickness(i));
        }
    }

    drawStrings() {
        const strings = this.g.strings;

        for (let i = 0; i < strings.length; i++) {
            const s = strings[i];

            fill(100);
            rect(s.x, s.y, s.w, s.h);

            fill(230);
            rect(s.x, s.y, s.w, s.h * 0.4);

            push();
            if (i < 3) {
                const step = s.h * 0.35;
                const thickness = s.h * 0.15;

                stroke(100);
                strokeWeight(thickness);

                for (let x = s.x; x < s.x + s.w; x += step) {
                    line(x, s.y, x, s.y + s.h);
                }
            }
            pop();
        }
    }

    drawSequenceStringPulse() {
        const g = this.g;
        const notes = [
            ...(g.pinnedNotes || []),
            ...(g.selectedNotes || [])
        ];

        const activeByString = new Map();
        for (const n of notes) {
            if (!n?.seqHoldPulse) continue;
            if (!Number.isFinite(n.string) || n.string < 1 || n.string > g.strings.length) continue;
            activeByString.set(n.string, n);
        }

        if (activeByString.size === 0) return;

        const now = millis();

        push();
        noFill();
        strokeCap(ROUND);

        for (const [stringNumber, note] of activeByString.entries()) {
            const s = g.strings[stringNumber - 1];
            if (!s) continue;

            const pos = g.toScreen?.(note.fret, note.string) || null;

            const startedAt = Number.isFinite(note.seqHoldPulseStart) ? note.seqHoldPulseStart : now;
            const freq = Number.isFinite(note.seqHoldPulseFrequency) ? note.seqHoldPulseFrequency : 16;
            const t = (now - startedAt) / 1000;
            const osc = (Math.sin(t * freq * TWO_PI) + 1) * 0.5;
            const pulse = Math.pow(osc, 0.55);

            const alpha = lerp(55, 255, pulse);
            const weight = lerp(max(1, s.h * 0.16), max(1.5, s.h * 0.34), pulse);
            const glowWeight = weight * 1.7;
            const y = s.y + s.h * 0.5;
            const noteRadius = this.g.getThickness() * 0.17;
            const x1 = pos ? max(pos.x + noteRadius * 0.9, s.x) : s.x;
            const x2 = s.x + s.w;
            const jitterBase = Math.sin(t * freq * TWO_PI * 1.75 + stringNumber * 1.31);
            const jitter = jitterBase * (s.h * 0.045 * pulse);

            if (x1 >= x2) continue;

            // halo principal, blanc pur
            stroke(255, alpha);
            strokeWeight(glowWeight);
            line(x1 + jitter, y, x2 + jitter, y);

            // vibration subtile: trois traits rapides autour du centre
            const vibAmp = s.h * 0.16 * pulse;
            stroke(255, alpha * 0.65);
            strokeWeight(weight * 0.72);
            line(x1 + jitter * 0.6, y - vibAmp, x2 + jitter * 0.6, y - vibAmp);
            line(x1 - jitter * 0.45, y + vibAmp, x2 - jitter * 0.45, y + vibAmp);

            stroke(255, alpha * 0.45);
            strokeWeight(weight * 0.5);
            line(x1 - jitter * 0.25, y, x2 - jitter * 0.25, y);
        }

        pop();

        // Maintenir la boucle d'animation indépendamment des overlays de notes.
        this.g.invalidate();
    }

    drawInlays() {
        const t = this.g.getThickness();

        for (const inlay of this.g.inlays) {
            if (inlay.type === "trapeze") {
                this.drawInlayTrapeze(inlay.x, inlay.y, t, inlay.caseWidth);
            } else if (this.g.inlayStyle === "superstrat") {
                this.drawInlaySuperstrat(inlay.x, inlay.y, t);
            } else {
                this.drawInlayDot(inlay.x, inlay.y, t);
            }
        }
    }

    drawInlayDot(x, y, t) {
        const r = t * 0.10;
        fill(this.style.getInlayColor());
        noStroke();
        circle(x, y, r);
    }

    drawInlaySuperstrat(x, y, t) {
        const r = t * 0.08;
        fill(this.style.getInlayColor());
        noStroke();
        circle(x, y, r);
    }

    drawInlayTrapeze(x, y, t, caseWidth) {
        const s = this.g.strings;
        if (!s || s.length < 5) return;

        const neckH = this.g.h;

        const leftHeightPct  = 0.65;
        const rightHeightPct = 0.30;

        const leftHeight  = neckH * leftHeightPct;
        const rightHeight = neckH * rightHeightPct;

        const yCenter = (s[2].y + s[3].y) * 0.5;

        const topLeftY     = yCenter - leftHeight  * 0.5;
        const bottomLeftY  = yCenter + leftHeight  * 0.5;

        const topRightY    = yCenter - rightHeight * 0.5;
        const bottomRightY = yCenter + rightHeight * 0.5;

        const leftX  = x - caseWidth * 0.30;
        const rightX = x + caseWidth * 0.30;

        fill(this.style.getInlayColor());
        noStroke();

        quad(
            leftX,  topLeftY,
            rightX, topRightY,
            rightX, bottomRightY,
            leftX,  bottomLeftY
        );
    }

    drawOpenStringLabels() {
        const g = this.g;
        const names = ["E", "A", "D", "G", "B", "E"];
        const c0 = g.cases[0];

        const x = c0.xc;
        const t = g.getThickness();
        const col = this.style.getInlayColor();

        textAlign(CENTER, CENTER);
        textSize(t * 0.12);
        fill(col);

        for (let i = 0; i < g.strings.length; i++) {
            const s = g.strings[i];
            text(names[i], x, s.y);
        }
    }

    // ------------------------------------------------------------
    // DRAW GLOBAL
    // ------------------------------------------------------------
    draw() {
        this.drawNeck();
        this.drawInlays();
        this.drawHead();
        this.drawStringShadows();
        this.drawFrets();
        this.drawStrings();
        this.drawSequenceStringPulse();
        this.drawOpenStringLabels();
    }
}
