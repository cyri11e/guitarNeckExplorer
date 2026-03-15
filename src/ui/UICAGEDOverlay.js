class CAGEDOverlay {
    constructor(guitar) {
        this.g = guitar;
    }

    shapeWidth(shape) {
        return (shape === "G" || shape === "C" || shape === "D") ? 3 : 2;
    }

    shapeShift(a, b) {
        if ((a === "C" && b === "D") || (a === "D" && b === "C")) return 2;
        return this.shapeWidth(b);
    }

    shapeShiftRight(a, b) {
        if (a === "G" && b === "E") return 3;
        if (a === "E" && b === "D") return 2;
        if (a === "D" && b === "C") return 2;
        if (a === "C" && b === "A") return 3;
        if (a === "A" && b === "G") return 2;
        return this.shapeShift(a, b);
    }

    computeCentralBox(shape, fret, side) {
        const w = this.shapeWidth(shape);

        if (side === "left") {
            const end = fret - 1;
            const start = end - (w - 1);
            return { shape, startFret: start, endFret: end };
        }

        if (side === "right") {
            const start = fret + 1;
            const end = start + (w - 1);
            return { shape, startFret: start, endFret: end };
        }

        return null;
    }

    extendLeft(startShape, startFret) {
        const prev = { G:"A", A:"C", C:"D", D:"E", E:"G" };
        const boxes = [];

        let curShape = startShape;
        let curStart = startFret;

        while (true) {
            const sPrev = prev[curShape];
            const wPrev = this.shapeWidth(sPrev);
            const shift = this.shapeShift(curShape, sPrev);

            const newStart = curStart - shift;
            const newEnd   = newStart + wPrev - 1;

            if (newStart < 0) break;

            boxes.push({ shape: sPrev, startFret: newStart, endFret: newEnd });

            curShape = sPrev;
            curStart = newStart;
        }

        return boxes;
    }

    extendRight(startShape, startFret, fretCount) {
        const next = { G:"E", E:"D", D:"C", C:"A", A:"G" };
        const boxes = [];

        let curShape = startShape;
        let curStart = startFret;

        while (true) {
            const sNext = next[curShape];
            const wNext = this.shapeWidth(sNext);
            const shift = this.shapeShiftRight(curShape, sNext);

            const newStart = curStart + shift;
            const newEnd   = newStart + wNext - 1;

            if (newStart > fretCount) break;

            boxes.push({ shape: sNext, startFret: newStart, endFret: newEnd });

            curShape = sNext;
            curStart = newStart;
        }

        return boxes;
    }

    drawBox(box, splitX, y, g) {
        const cStart = g.cases[box.startFret];
        const cEnd   = g.cases[box.endFret];
        if (!cStart || !cEnd) return;

        const wCase = cStart.width;

        const prev = g.cases[box.startFret - 1];
        const next = g.cases[box.endFret + 1];

        let left  = prev ? (prev.xc + cStart.xc) * 0.5 : cStart.xc - wCase * 0.5;
        let right = next ? (cEnd.xc + next.xc) * 0.5 : cEnd.xc + wCase * 0.5;

        if (right < splitX) {
            left  += wCase * 0.5;
            right += wCase * 0.5;
        }

        if (left > splitX) {
            left  -= wCase * 0.5;
            right -= wCase * 0.5;
        }

        const pad = wCase * 0.08;
        const x = left + pad;
        const w = (right - pad) - x;

        const hRect = g.getThickness();

        fill(255, 255, 255, 45);
        rectMode(CORNER);
        rect(x, y - hRect/2, w, hRect, hRect * 0.2);

        noFill();
        stroke(40, 40, 40, 80);
        textSize(hRect * 0.8);
        text(box.shape, x + w/2, y);
        noStroke();
    }

    draw() {
        const g = this.g;
        const h = g.hoveredNote;
        if (!h) return;

        const map = {
            1: ["G", "E"],
            2: ["C", "A"],
            3: ["E", "D"],
            4: ["A", "G"],
            5: ["D", "C"],
            6: ["G", "E"]
        };

        const pair = map[h.string];
        if (!pair) return;

        const y = g.y + g.h / 2;
        const splitX = g.cases[h.fret].xc;
        const leftBox  = this.computeCentralBox(pair[0], h.fret, "left");
        const rightBox = this.computeCentralBox(pair[1], h.fret, "right");

        const boxes = [];

        if (leftBox)  boxes.push(leftBox);
        if (rightBox) boxes.push(rightBox);

        if (leftBox)  boxes.push(...this.extendLeft(leftBox.shape, leftBox.startFret));
        if (rightBox) boxes.push(...this.extendRight(rightBox.shape, rightBox.startFret, g.fretCount));

        push();
        textAlign(CENTER, CENTER);
        textStyle(BOLD);
        noStroke();

        for (const b of boxes) {
            this.drawBox(b, splitX, y, g);
        }

        pop();
    }
}
