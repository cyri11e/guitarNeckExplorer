
class VolumeControl {
    constructor(detector) {
        this.detector = detector;
        this.volumeLevel = 0;
        this.volumeThreshold = 0.001;
        this.sensitivitySlider = createSlider(0, 1, this.volumeThreshold, 0.001);
        this.sensitivitySlider.position(10, 60);
        this.sensitivitySlider.style('width', '200px');
        this.sensitivitySlider.input(() => {
            let value = this.sensitivitySlider.value();
            console.log('Sensitivity Slider Value:', value);
            this.detector.setSensitivity(value);
        });
    }

    updateVolumeLevel(mic) {
        if (mic) {
            this.volumeLevel = mic.getLevel();
        }
    }

    display() {
        fill(0);
        rect(10, 40, 200, 10);
        fill(0, 255, 0);
        rect(10, 40, map(this.volumeLevel, 0, 1, 0, 200), 10);
    }
}