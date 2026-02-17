class GuitarStyle {
    constructor(guitar) {
        this.g = guitar;

        // Couleurs chromatiques (0–11)
        this.noteColors = [
            color(255, 20, 20),
            color(255, 82, 82),
            color(255, 165, 10),
            color(255, 210, 10),
            color(200, 200, 10),
            color(144, 238, 144),
            color(72, 169, 127),
            color(20, 40, 255),
            color(68, 103, 192),
            color(75, 10, 130),
            color(111, 21, 168),
            color(200, 10, 211)
        ];
    }

    getWoodFill() {
        if (this.g.woodColor === "rosewood") return color(60, 35, 20);
        return color(200, 170, 110);
    }

    getInlayColor() {
        if (["rosewood", "ebony"].includes(this.g.woodColor)) return color(255);
        return color(0);
    }

    getStringThickness(i) {
        const t = this.g.h;
        return (t * 0.020) - (i / 5) * (t * 0.012);
    }

    getChromaColor(chroma) {
        if (chroma == null) return null;
        return this.noteColors[chroma] ?? null;
    }

}
