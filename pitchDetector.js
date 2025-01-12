class MultiPitchDetector {
    constructor() {

        userStartAudio().then(() => {
            // Initialiser le contexte audio et le micro après que l'utilisateur ait interagi
            audioContext = getAudioContext();

        });

      this.mic = new p5.AudioIn();
      this.fft = new p5.FFT(0.2, 4096 * 2);
      this.peaks = [];
      this.notePeaks = [];
      this.lowestNotes = [];
      this.nyquist = sampleRate() / 2;
      this.mic.start();
      this.fft.setInput(this.mic);
    }
  
    analyze() {
        if (!this.mic.enabled) {
          return;
        }
        this.spectrum = this.fft.analyze();
        this.findPeaks();
      
        let maxAmplitude = Math.max(...this.spectrum);
        let filteredPeaks = this.peaks.filter(peak => this.spectrum[peak] >= 0.8 * maxAmplitude);
      
        // Stocker les notes des 6 premiers pics filtrés
        this.notePeaks = filteredPeaks.slice(0, 6).map(peak => this.midiToNoteName(this.freqToMidi((peak / this.spectrum.length) * this.nyquist)));
      
        // Trier les notes par fréquence croissante
        let sortedNotes = this.notePeaks.sort((a, b) => this.noteToFrequency(a) - this.noteToFrequency(b));
      
        // Obtenir les notes uniques les plus graves
        this.lowestNotes = [];
        sortedNotes.forEach(note => {
          if (!this.lowestNotes.some(existingNote => existingNote[0] === note[0])) {
            if (this.noteToFrequency(note) > this.noteToFrequency('D2'))
             this.lowestNotes.push(note);
          }
          if (this.lowestNotes.length >= 3) {
            return;
          }
        });
      
        return {
          notePeaks: this.notePeaks,
          lowestNotes: this.lowestNotes
        };
      }
      
  
    findPeaks() {
      this.peaks = [];
      for (let i = 1; i < this.spectrum.length / 4 - 1; i++) {
        if (this.spectrum[i] > this.spectrum[i - 1] && this.spectrum[i] > this.spectrum[i + 1]) {
          this.peaks.push(i);
        }
      }
      return this.peaks;
    }
  
    freqToMidi(frequency) {
      return 69 + 12 * Math.log2(frequency / 440);
    }
  
    midiToNoteName(midiNote) {
      let noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      let octave = Math.floor(midiNote / 12) - 1;
      let note = noteNames[Math.round(midiNote) % 12];
      return note + octave;
    }
  
    noteToFrequency(note) {
      if (note === null) return null;
      let noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      if (typeof note === 'string') {
          let noteName = note.slice(0, -1);
          let octave = parseInt(note.slice(-1));
          let midiNote = noteNames.indexOf(noteName) + (octave + 1) * 12;
          return 440 * Math.pow(2, (midiNote - 69) / 12);
      }
      return null;
    }
  
    // Méthode pour obtenir les notes les plus graves
    getPitches() {
      return this.lowestNotes;
    }

    setSensitivity(threshold) {
        this.mic.amp(threshold);
    }
  }
