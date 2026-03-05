class GuitarStyle {
    constructor(guitar) {
        this.g = guitar;

        // Couleurs chromatiques (0–11)
        this.noteColors = [
            color("#ea0e0e"),  // tonique fondamentale rouge 

            color("#b9730b"),  //m2 seconde orange
            color("#e38d0c"), //M2

            color("#c5b315"), //m3 tierce jaune 
            color("#d7e60e"),  //M3
            
            color("#0fde32"),  //P4 vert
            color("#42b5c7"),  // TT bleu vert
            color("#3863f1"),   //P5 bleu

            color("#ae48da"),  // m6
            color("#860ce3"),  //M6

            color("#d165b9"),  //m7
            color("#e80cb4")  // M7
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
