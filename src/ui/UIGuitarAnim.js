// ============================================================
// GuitarAnim — configuration et presets d'animation
// Utilisé par Guitar via this.anim
// ============================================================

class GuitarAnim {

    constructor() {
        this.setPreset('default');
    }

    // Applique un preset par nom et copie ses valeurs sur this
    setPreset(name) {
        const p = GuitarAnim.PRESETS[name];
        if (!p) {
            console.warn(`GuitarAnim: preset inconnu "${name}". Disponibles : soft, default, snappy`);
            return;
        }
        this.timers    = { ...p.timers };
        this.note      = {
            popInDuration:  p.note.popInDuration,
            popOutDuration: p.note.popOutDuration,
            pop:       { ...p.note.pop },
            popSeq:    { ...p.note.popSeq },
            popOut:    { ...p.note.popOut },
            popOutSeq: { ...p.note.popOutSeq }
        };
        this.bursts    = { ...p.bursts };
        this.highlight = { ...p.highlight };
        this.chain     = { ...p.chain };
    }
}

// ---- Presets ----------------------------------------------------------------
GuitarAnim.PRESETS = {

    soft: {
        timers: { fastMs: 16 },
        note: {
            popInDuration:  480,
            popOutDuration: 520,
            pop:       { backOutS: 1.6, startScale: 0.25, lift: 0.30, alphaStart:  80, alphaEnd: 255 },
            popSeq:    { backOutS: 1.0, startScale: 0.45, lift: 0.18, alphaStart: 140, alphaEnd: 255 },
            popOut:    { easePow: 2,   growSplit: 0.30, shrinkStart: 0.20, growTo: 1.10, shrinkTo: 0.05, drift: 0.06, alphaStart: 220, alphaEnd: 0 },
            popOutSeq: { easePow: 1.5, drift: 0.018, alphaStart: 200, alphaEnd: 0 }
        },
        bursts:    { enabled: false, tStep: 0.04, alphaPow: 0.6, baseRadius: 0.16, ring1Scale: 2.0, ring2Scale: 1.4, coreBase: 0.6, coreDecay: 0.4 },
        highlight: { targetTime: 1.4, dotTime: 20.0, dt: 0.015, overlayTStep: 0.008, scaleAmp: 0.25, baseRadius: 0.22, finalRadius: 0.13 },
        chain:     { stepMs: 80 }
    },

    default: {
        timers: { fastMs: 16 },
        note: {
            popInDuration:  360,
            popOutDuration: 380,
            pop:       { backOutS: 2.2, startScale: 0.35, lift: 0.22, alphaStart: 110, alphaEnd: 255 },
            popSeq:    { backOutS: 1.3, startScale: 0.55, lift: 0.10, alphaStart: 170, alphaEnd: 255 },
            popOut:    { easePow: 3,   growSplit: 0.25, shrinkStart: 0.15, growTo: 1.18, shrinkTo: 0.05, drift: 0.04, alphaStart: 255, alphaEnd: 0 },
            popOutSeq: { easePow: 1.9, drift: 0.012, alphaStart: 230, alphaEnd: 0 }
        },
        bursts:    { enabled: false, tStep: 0.05, alphaPow: 0.7, baseRadius: 0.18, ring1Scale: 1.8, ring2Scale: 1.3, coreBase: 0.7, coreDecay: 0.5 },
        highlight: { targetTime: 1.0, dotTime: 15.0, dt: 0.02, overlayTStep: 0.01, scaleAmp: 0.30, baseRadius: 0.20, finalRadius: 0.12 },
        chain:     { stepMs: 55 }
    },

    snappy: {
        timers: { fastMs: 16 },
        note: {
            popInDuration:  220,
            popOutDuration: 260,
            pop:       { backOutS: 3.0, startScale: 0.20, lift: 0.14, alphaStart: 160, alphaEnd: 255 },
            popSeq:    { backOutS: 2.0, startScale: 0.40, lift: 0.06, alphaStart: 200, alphaEnd: 255 },
            popOut:    { easePow: 4,   growSplit: 0.20, shrinkStart: 0.10, growTo: 1.25, shrinkTo: 0.04, drift: 0.025, alphaStart: 255, alphaEnd: 0 },
            popOutSeq: { easePow: 2.5, drift: 0.008, alphaStart: 255, alphaEnd: 0 }
        },
        bursts:    { enabled: true,  tStep: 0.07, alphaPow: 0.8, baseRadius: 0.20, ring1Scale: 1.6, ring2Scale: 1.2, coreBase: 0.8, coreDecay: 0.6 },
        highlight: { targetTime: 0.6, dotTime: 10.0, dt: 0.03, overlayTStep: 0.015, scaleAmp: 0.40, baseRadius: 0.18, finalRadius: 0.11 },
        chain:     { stepMs: 35 }
    }
};
