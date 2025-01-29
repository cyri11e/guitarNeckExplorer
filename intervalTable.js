class IntervalTable {
    constructor(x, y, numCells, guitar) {
        this.x = x;
        this.y = y;
        this.numCells = numCells;
        this.guitar = guitar;
        this.cellWidth = 100;
        this.cellHeight = 40;
        this.intervals = ['1P', '2M', '2m', '3M', '3m', '4P', '4A', '5P', '5d', '6M', '6m', '7M', '7m', '8P'];
        this.states = Array(numCells).fill(0);
        this.setIntervals(this.guitar.intervals); // Initialiser l'état du tableau avec les intervalles de la guitare
    }

    display() {
        for (let i = 0; i < this.numCells; i++) {
            let cellX = this.x + i * this.cellWidth;
            if (i === 0) cellX += this.cellWidth / 2; // Décaler d'une demi-case à droite pour la 1ère case
            if (i >= 4) cellX -= this.cellWidth / 2; // Décaler d'une demi-case à partir de la 5ème case
            let cellY = this.y;
            let width = (i === 0 || i === 7) ? this.cellWidth / 2 : this.cellWidth;
            noFill(); // Pas de remplissage pour toutes les cases
            stroke(255); // Surligner les bords en blanc
            rect(cellX, cellY, width, this.cellHeight, 5);
            let label = this.getLabel(i);
            textAlign(CENTER, CENTER);
            if (this.states[i] === 0) {
                fill(255); // Encre blanche pour l'état vide
                textSize(16);
                text(label, cellX + width / 2, cellY + this.cellHeight / 2);
            } else {
                fill(0); // Encre noire pour les autres états
                textSize(20); // Police plus grande pour les autres états
                if (label === '1P') {
                    textAlign(RIGHT, CENTER);
                    text(label, cellX + width - 10, cellY + this.cellHeight / 2);
                } else if (label === '8P') {
                    textAlign(LEFT, CENTER);
                    text(label, cellX + 10, cellY + this.cellHeight / 2);
                } else if (label === '4P') {
                    textAlign(LEFT, CENTER);
                    text(label, cellX + 10, cellY + this.cellHeight / 2);
                } else if (label === '5P') {
                    textAlign(RIGHT, CENTER);
                    text(label, cellX + width - 10, cellY + this.cellHeight / 2);
                } else if (label.endsWith('M') || label.endsWith('A') || label.endsWith('P')) {
                    textAlign(RIGHT, CENTER);
                    text(label, cellX + width - 10, cellY + this.cellHeight / 2);
                } else {
                    textAlign(LEFT, CENTER);
                    text(label, cellX + 10, cellY + this.cellHeight / 2);
                }
            }
        }
        text(this.states, 100, 500);
    }

    getLabel(index) {
        if (index === 0) {
            return this.guitar.tonic ? this.guitar.tonic.note : '1P';
        }
        let state = this.states[index];
        if (index === 1) {
            return state === 0 ? '2' : state === 1 ? '2M' : '2m';
        }
        if (index === 2) {
            return state === 0 ? '3' : state === 1 ? '3M' : '3m';
        }
        if (index === 3) {
            return state === 0 ? '4' : state === 1 ? '4P' : '4A';
        }
        if (index === 4) {
            return state === 0 ? '5' : state === 1 ? '5P' : '5d';
        }
        if (index === 5) {
            return state === 0 ? '6' : state === 1 ? '6M' : '6m';
        }
        if (index === 6) {
            return state === 0 ? '7' : state === 1 ? '7M' : '7m';
        }
        if (index === 7) {
            return state === 0 ? '8' : '8P';
        }
        return '';
    }

    handleMousePressed(mx, my) {
        for (let i = 0; i < this.numCells; i++) {
            let cellX = this.x + i * this.cellWidth;
            if (i === 0) cellX += this.cellWidth / 2; // Décaler d'une demi-case à droite pour la 1ère case
            if (i >= 4) cellX -= this.cellWidth / 2; // Décaler d'une demi-case à partir de la 5ème case
            let cellY = this.y;
            let width = (i === 0 || i === 7) ? this.cellWidth / 2 : this.cellWidth;
            if (mx > cellX && mx < cellX + width && my > cellY && my < cellY + this.cellHeight) {
                this.nextState(i);
                this.guitar.updateIntervalsFromTable();
            }
        }
    }

    nextState(index) {
        if (index === 0) return;
        if (index === 4 && this.states[3] === 2) this.states[3] = 0; // 5d exclut 4A
        if (index === 3 && this.states[4] === 2) this.states[4] = 0; // 4A exclut 5d
        if (index === 7) {
            this.states[index] = (this.states[index] + 1) % 2; // La case 8 (octave) n'a que deux états
        } else {
            this.states[index] = (this.states[index] + 1) % (index === 3 || index === 4 ? 3 : 3);
        }
    }

    getIntervals() {
        let intervals = [];
        for (let i = 0; i < this.numCells; i++) {
            if (this.states[i] !== 0) {
                intervals.push(this.intervals[i]);
            }
        }
        return intervals;
    }

    setIntervals(intervals) {
        this.states.fill(0);
        for (let interval of intervals) {
            let index = this.intervals.indexOf(interval);
            if (index !== -1) {
                this.states[index] = 1;
            }
        }
    }
}