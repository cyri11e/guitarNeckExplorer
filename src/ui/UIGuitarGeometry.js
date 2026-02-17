// ============================================================
// GUITAR GEOMETRY
// ============================================================

class GuitarGeometry {
    constructor(guitar) {
        this.g = guitar;
    }

    // ------------------------------------------------------------
    // RATIOS
    // ------------------------------------------------------------

computeFretRatios() {
    const g = this.g;
    const arr = [];
    const max = g.fretCount + 1;

    // 1) courbe originale
    for (let i = 0; i <= max; i++) {
        arr[i] = 1 - 1 / Math.pow(2, i / 12);
    }

    // 2) adoucissement de la pente
    const p = 1.1;   // ← ajuste ici (0.7 = 30% plus petit environ)
    for (let i = 0; i <= max; i++) {
        arr[i] = Math.pow(arr[i], p);
    }

    // 3) renormalisation (la dernière frette reste correcte)
    const scale = arr[max];
    for (let i = 0; i <= max; i++) {
        arr[i] /= scale;
    }

    return arr;
}


computeStringRatios() {
    const arr = [];
    const n = 6;

    const usable = 0.9;
    const margin = (1 - usable) / 2;
    const spacing = usable / (n - 1);

    // i = 0 → corde 6 (aiguë)
    // i = 5 → corde 1 (grave)
    for (let i = 0; i < n; i++) {
        const reversed = (n - 1) - i;   // 5,4,3,2,1,0
        arr[i] = margin + reversed * spacing;
    }

    return arr;
}


    // ------------------------------------------------------------
    // PROJECTION (RATIOS → PIXELS)
    // ------------------------------------------------------------

    projectGeometry() {
        const g = this.g;

        const t = g.getThickness();
        const L = g.getLength();

        const offLabel = g.getStringLabelOffset();
        const nutW     = g.getNutWidth();

        const neckX = g.x;
        const neckY = g.y;
        const neckW = L;
        const neckH = t;

        // ---------- FRETTES ----------
        const frets = [];
        const nutX = neckX + offLabel + nutW;

        frets.push({ index:0, x:nutX, y:neckY, w:nutW, h:neckH });

        const fw = t * 0.05;

        for (let i = 1; i <= g.fretCount; i++) {
            const r = g.fretRatio[i];
            const x = nutX + (neckW - offLabel - nutW * 2) * r;

            frets.push({ index:i, x, y:neckY, w:fw, h:neckH });
        }

        g.frets = frets;

// ---------- CASES ----------
const cases = [];


// case 0 : début du manche -> sillet
const nut = frets[0]; // index 0 = sillet

cases.push({
    index: 0,
    x1: neckX,
    x2: nut.x,
    xc: (neckX + nut.x) * 0.5,
    width: nut.x - neckX,
    y: neckY,
    h: neckH
});

// cases 1..fretCount : entre frettes successives
for (let i = 0; i < g.fretCount; i++) {
    const f1 = frets[i];     // 0 = sillet, 1 = frette 1, etc.
    const f2 = frets[i + 1];

    const x1 = f1.x;
    const x2 = f2.x;

    cases.push({
        index: i + 1,        // case 1 = sillet->f1, case 2 = f1->f2, etc.
        x1,
        x2,
        xc: (x1 + x2) * 0.5,
        width: x2 - x1,
        y: neckY,
        h: neckH
    });
}

g.cases = cases;


        // ---------- CORDES ----------
        const strings = [];
        for (let i = 0; i < g.stringRatio.length; i++) {
            const ry = g.stringRatio[i];
            const y  = neckY + neckH * ry;
            const thick = g.style.getStringThickness(i);

            strings.push({ index:i+1, x:neckX, y, w:neckW, h:thick });
        }
        g.strings = strings;

        // ---------- INLAYS ----------
        const inlays = [];
        const s = g.strings;

        for (const f of g.inlayFrets) {
            if (f >= g.cases.length) continue;

            const c = g.cases[f];
            const x = c.xc;
            const isDouble = (f === 12 || f === 24);

            if (g.inlayStyle === "trapeze") {
                inlays.push({
                    type:"trapeze",
                    fret:f,
                    x,
                    y:g.y + g.h * 0.5,
                    caseWidth:c.width
                });
            }
            else if (g.inlayStyle === "superstrat") {
                const ySingle  = (s[0].y + s[1].y) * 0.5;
                const yDouble1 = (s[0].y + s[1].y) * 0.5;
                const yDouble2 = (s[1].y + s[2].y) * 0.5;

                if (isDouble) {
                    inlays.push({ type:"dot", fret:f, x, y:yDouble1 });
                    inlays.push({ type:"dot", fret:f, x, y:yDouble2 });
                } else {
                    inlays.push({ type:"dot", fret:f, x, y:ySingle });
                }
            }
            else {
                const ySingle  = (s[2].y + s[3].y) * 0.5;
                const yDouble1 = (s[1].y + s[2].y) * 0.5;
                const yDouble2 = (s[3].y + s[4].y) * 0.5;

                if (isDouble) {
                    inlays.push({ type:"dot", fret:f, x, y:yDouble1 });
                    inlays.push({ type:"dot", fret:f, x, y:yDouble2 });
                } else {
                    inlays.push({ type:"dot", fret:f, x, y:ySingle });
                }
            }
        }

        g.inlays = inlays;
    }
}
