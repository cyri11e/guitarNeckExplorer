class GuitarStyle {
    constructor(guitar) {
        this.g = guitar;
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
}
