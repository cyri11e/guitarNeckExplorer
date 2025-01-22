class ScaleControl {
    constructor(labels, positionX, positionY) {
        this.labels = labels;
        this.currentIndex = 0;
        this.positionX = positionX;
        this.positionY = positionY;
        this.width = 100;
        this.height = 40;
        this.createSwitch();
    }

    createSwitch() {
        this.switchCanvas = createGraphics(this.width, this.height);
        this.updateSwitch();
    }

    updateSwitch() {
        this.switchCanvas.clear();
        this.switchCanvas.fill(200);
        this.switchCanvas.rect(0, 0, this.width, this.height, 20);
        this.switchCanvas.fill(100);
        this.switchCanvas.rect(this.currentIndex * (this.width / this.labels.length), 0, this.width / this.labels.length, this.height, 20);
        this.switchCanvas.fill(255);
        this.switchCanvas.textAlign(CENTER, CENTER);
        this.switchCanvas.textSize(16);
        this.switchCanvas.text(this.labels[this.currentIndex], this.width / 2, this.height / 2);
    }

    nextState() {
        this.currentIndex = (this.currentIndex + 1) % this.labels.length;
        this.updateSwitch();
    }

    getCurrentState() {
        return this.labels[this.currentIndex];
    }

    display() {
        image(this.switchCanvas, this.positionX, this.positionY);
    }

    handleMousePressed(mx, my) {
        if (mx > this.positionX && mx < this.positionX + this.width && my > this.positionY && my < this.positionY + this.height) {
            this.nextState();
        }
    }
}