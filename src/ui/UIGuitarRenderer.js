// ============================================================
// GUITAR RENDERER
// ============================================================

class GuitarRenderer {
    constructor(guitar, style) {
        this.g = guitar;
        this.style = style;
    }

    // ------------------------------------------------------------
    // CORDES
    // ------------------------------------------------------------

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

            fill(150);
            rect(s.x, s.y, s.w, s.h);

            fill(230);
            rect(s.x, s.y, s.w, s.h * 0.4);
        }
    }

    // ------------------------------------------------------------
    // FRETTES
    // ------------------------------------------------------------

    drawFrets() {
        const frets = this.g.frets;

        for (const f of frets) {

            const x0 = f.x - f.w * 0.5;

            if (f.index === 0) {
                fill(240);
                noStroke();
                rect(x0, f.y, f.w, f.h);

                fill(0, 50);
                rect(x0 - f.w * 0.2, f.y, f.w * 0.2, f.h);

                fill(0, 35);
                rect(x0 + f.w, f.y, f.w * 0.3, f.h);

                continue;
            }

            fill(0, 40);
            rect(x0 - f.w * 0.3, f.y, f.w * 1.6, f.h);

            fill(220);
            rect(x0, f.y, f.w, f.h, f.w * 0.3);

            fill(255);
            rect(x0, f.y, f.w * 0.8, f.h * 0.25, f.h * 0.25, 0, 0);

            fill(100);
            rect(
                x0 + f.w * 0.3,
                f.y + f.w * 0.3,
                f.w * 0.6,
                f.h * 0.97,
                f.w * 0.98
            );
        }
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

    // ------------------------------------------------------------
    // INLAYS
    // ------------------------------------------------------------

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


    // curseur 
drawHoverDot() {
    const g = this.g;

    // 🔥 NE DESSINE QUE SI LA SOURIS EST DANS LE MANCHE
    if (!g.hover) return;

    const hit = g.fromScreen(mouseX, mouseY);
    if (!hit) return;

    const c = g.cases[hit.fret];
    const s = g.strings[hit.string - 1];

    const cx = c.xc;
    const cy = s.y;

    const r = c.h * 0.15;

    push();
    noStroke();
    fill(255, 255, 0, 180);
    ellipse(cx, cy, r, r);
    pop();
}

drawOpenStringLabels() {
    const g = this.g;
    const names = ["E", "B", "G", "D", "A", "E"]; // corde 1 → aiguë
    const c0 = g.cases[0]; // case à vide

    const x = c0.xc;       // 🔥 même emplacement horizontal que la pastille
    const t = g.getThickness();
    const col = this.style.getInlayColor();

    textAlign(CENTER, CENTER);
    textSize(t * 0.12);
    fill(col);

    for (let i = 0; i < g.strings.length; i++) {
        const s = g.strings[i];
        text(names[i], x, s.y);  // 🔥 même y que la pastille
    }
}

drawPinnedNotes() {
    const g = this.g;

    for (const n of g.pinnedNotes) {
        const c = g.cases[n.fret];
        const s = g.strings[n.string - 1];

        const cx = c.xc;
        const cy = s.y;
        const r = c.h * 0.18;

        push();
        noStroke();
        fill(0, 200, 255, 200); // bleu translucide
        ellipse(cx, cy, r, r);
        pop();
    }
}


    // ------------------------------------------------------------
    // DEBUG
    // ------------------------------------------------------------

drawDebugInfo() {
    const g = this.g;

    const x = g.x;
    const y = g.y;
    const w = g.getLength();
    const h = g.getThickness();

    const ratio = (w / h).toFixed(2);

    // Interaction
    const hover    = g.hover;
    const pressed  = g.isPressed;
    const dragging = g.dragging;

    // Coordonnées souris
    const mx = mouseX.toFixed(0);
    const my = mouseY.toFixed(0);

    // Conversion guitare
    const hit = g.fromScreen(mouseX, mouseY);

    const fretStr   = hit ? hit.fret : "-";
    const stringStr = hit ? hit.string : "-";
    const caseStr   = hit ? hit.fret : "-";   // même index pour l’instant

    push();
    fill("green");
    textSize(12);
    textAlign(LEFT, TOP);

    text(
        `x: ${x.toFixed(1)}\n` +
        `y: ${y.toFixed(1)}\n` +
        `w: ${w.toFixed(1)}\n` +
        `h: ${h.toFixed(1)}\n` +
        `ratio: ${ratio}\n` +
        `frets: ${g.fretCount}\n` +
        `cases: ${g.cases.length}\n\n` +

        `hover: ${hover}\n` +
        `pressed: ${pressed}\n` +
        `dragging: ${dragging}\n` +
        `mouse: ${mx}, ${my}\n` +
        `case: ${caseStr}\n` +
        `fret: ${fretStr}\n` +
        `string: ${stringStr}`,
        x + 18,
        y + 36
    );

    pop();
}


    // ------------------------------------------------------------
    // DRAW GLOBAL
    // ------------------------------------------------------------

    draw() {
        const g = this.g;

        const neck = g.getNeckRect();
        fill(this.style.getWoodFill());
        stroke(40);
        strokeWeight(2);
        rect(neck.x, neck.y, neck.w, neck.h);

        this.drawInlays();
        this.drawHead();
        this.drawStringShadows();
        this.drawFrets();
        this.drawStrings();
        this.drawOpenStringLabels();
        this.drawPinnedNotes();
        this.drawHoverDot();

        if (g.debug) this.drawDebugInfo();
    }
}
