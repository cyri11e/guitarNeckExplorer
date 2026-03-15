class TRRecPads extends UIComponent {

    constructor(cfg = {}) {
        super();

        this.padCount = cfg.padCount ?? 16;

        this.aspectRatio = this.padCount / 1.2;

        const xp = cfg.xp ?? 0;
        const yp = cfg.yp ?? 0;
        const sp = cfg.sp ?? 10;

        this.setResponsive(xp, yp, sp);
        this.updateResponsive();

        // ajout du flag highlight
this.states = Array.from({ length: this.padCount }, () => ({
    etat: 0,
    highlight: false,
    flash: 0
}));


        this.shortcutKey = cfg.shortcutKey || null;
        this.description = cfg.description || null;

        this.isDraggable = false;
        this.isZoomable = false;

        // playhead externe
        this.playIndex = 0;
    }

    // appelé par le moteur global (tick BPM)
advancePlayhead() {

    // 1) index courant
    const idx = this.playIndex;

    // sécurité
    if (!this.states || this.states.length === 0) return;

    // clear highlight
    for (const s of this.states) {
        s.highlight = false;
    }

    const s = this.states[idx];
    if (s) {
        s.highlight = true;

        // flash accent si note
        if (s.etat === 1) {
            s.flash = 1.5;
        }
    }

    // flash groupe de 4
    if (idx % 4 === 0) {
        const group = Math.floor(idx / 4);
        const start = group * 4;
        for (let i = 0; i < 4; i++) {
            const pad = this.states[start + i];
            if (pad) pad.flash = 1;
        }
    }

    //  notifier les règles UI avec l’index COURANT

const pad = this.states[idx];


this.onChange?.({
    type: "padChange",
    padIndex: idx,
    snapshotIndex: pad ? pad.itemIndex : null
});



    // 3) seulement maintenant on avance
    this.playIndex = (this.playIndex + 1) % this.padCount;

    this.invalidate();
}



    get measure() {
        return this.states.map(s => ({ etat: s.etat }));
    }

    set measure(arr) {
        if (!Array.isArray(arr)) return;

        this.states = Array.from({ length: this.padCount }, (_, i) => ({
            etat: arr[i]?.etat === 1 ? 1 : 0,
            highlight: false
        }));

        this.invalidate();
    }

    mouseReleased(evt) {
        if (!evt) return false;
        if (!this.containsRect(evt)) return false;

        const mx = evt.x;
        const my = evt.y;

        const padAreaH = this.h;
        const padSize = this.w / this.padCount;

        if (my < this.y || my > this.y + padAreaH) return false;

        const index = Math.floor((mx - this.x) / padSize);
        if (!Number.isFinite(index)) return false;
        if (index < 0 || index >= this.states.length) return false;

        const old = this.states[index];
        if (!old) return false;

        // suppression interne (1 → 0)
        if (old.etat !== 0) {
            this.states[index] = { etat: 0, highlight: false };
            this.invalidate();

            this.onChange?.({
                type: "remove",
                index,
                etat: 0
            });

            return true;
        }

        // ajout externe (0 → ?)
        this.onChange?.({
            type: "request-add",
            index,
            etat: 0
        });

        return true;
    }

    draw() {
        super.draw();

        fill(30);
        stroke(120);
        strokeWeight(this.w * 0.003);
        rect(this.x, this.y, this.w, this.h, this.h * 0.08);

        const padAreaH = this.h;

        const padSize = (this.w * 0.96) / this.padCount;
        const padW = padSize * 0.80;
        const padH = padAreaH * 0.75;

        const padOffsetX = (padSize - padW) / 2;
        const padOffsetY = (padAreaH - padH) / 2;

        const radius = padH * 0.08;
        const sw = padW * 0.10;

        const groupGap = padSize * 0.15;

        let xCursor = this.x + (this.w - (padSize * this.padCount + groupGap * 3)) / 2;

        for (let i = 0; i < this.padCount; i++) {

            // --- GAP + LIGNE ENTRE GROUPES DE 4 ---
            if (i > 0 && i % 4 === 0) {

                const sepX = xCursor + groupGap * 0.5;

                push();
                stroke(80);
                strokeWeight(2);
                line(sepX, this.y + padOffsetY, sepX, this.y + padOffsetY + padH);
                pop();

                xCursor += groupGap;
            }

            const s = this.states[i] || { etat: 0, highlight: false };

            const x = xCursor + padOffsetX;
            const y = this.y + padOffsetY;

            push();

            // --- PAD VIDE ---
            if (s.etat === 0) {

                if (s.highlight) {
                    noFill();
                    stroke(255, 60, 60);
                    strokeWeight(sw);
                } else {
                    noFill();
                    stroke(90, 0, 0);
                    strokeWeight(sw);
                }

                rect(x, y, padW, padH, radius);
            }

            // --- PAD REMPLI ---
            else if (s.etat === 1) {

                if (s.highlight) {
                    fill(255, 60, 60);
                    stroke(255);
                    strokeWeight(sw);
                    rect(x, y, padW, padH, radius);

                    if (s.item) {
                        push();
                        const label = String(s.item.label ?? s.item).trim();
                        const txtSize = padH * 0.28;

                        textSize(txtSize);
                        textAlign(CENTER, CENTER);
                        noStroke();
                        fill(255);

                        const maxChars = Math.floor(padW / (txtSize * 0.55));
                        let display = label;
                        if (display.length > maxChars) {
                            display = display.substring(0, maxChars - 1) + "…";
                        }

                        text(display, x + padW / 2, y + padH / 2);
                        pop();
                    }
                }

                else {
                    noFill();
                    stroke(255, 60, 60);
                    strokeWeight(sw);
                    rect(x, y, padW, padH, radius);

                    if (s.item) {
                        push();
                        const label = String(s.item.label ?? s.item).trim();
                        const txtSize = padH * 0.28;

                        textSize(txtSize);
                        textAlign(CENTER, CENTER);
                        noStroke();
                        fill(255);

                        const maxChars = Math.floor(padW / (txtSize * 0.55));
                        let display = label;
                        if (display.length > maxChars) {
                            display = display.substring(0, maxChars - 1) + "…";
                        }

                        text(display, x + padW / 2, y + padH / 2);
                        pop();
                    }
                }
            }
// --- FLASH TEMPO (blanc) ---
if (s.flash > 0.01) {
    const alpha = s.flash * 255;
    noStroke();
    fill(255, alpha);
    rect(x, y, padW, padH, radius);

    // fade-out interne
    s.flash *= 0.85;
    this.invalidate();
}

            pop();

            xCursor += padSize;
        }
    }
}
