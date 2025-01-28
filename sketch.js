let wH 
let wW 
let selectedNotes = []
let liveNotes = []
let micMuted = true;
let muteButton;
let guitar
let sensitivitySlider;
let volumeLevel = 0;
let volumeControl;
let intervalCheckboxes = [];

// pitch detection
const model_url = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
const scale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
let pitch;
let audioContext;
let mic;
let volumeThreshold = 0.001
let noteFrequency
let noteVolume 

function setup() {
    wH = windowHeight;
    wW = windowWidth;
    createCanvas(wW, wH);
    muteButton = createButton('<i class="fas fa-microphone-slash"></i>');
    muteButton.position(10, 10);
    muteButton.mousePressed(toggleMic);
    sensitivitySlider = createSlider(0, 1, volumeThreshold, 0.001);
    sensitivitySlider.position(10, 60);
    sensitivitySlider.style('width', '200px');
    sensitivitySlider.input(() => {
        let value = sensitivitySlider.value();
        console.log('Sensitivity Slider Value:', value);
        detector.setSensitivity(value);
    });
  
    // Démarrer l'AudioContext lorsque la page est chargée
    userStartAudio().then(() => {
        // Initialiser le contexte audio et le micro après que l'utilisateur ait interagi
        audioContext = getAudioContext();
        mic = new p5.AudioIn();
        mic.start();
    });

    // Création d'un manche de guitare
    guitar = new Guitar(13);
    detector = new MultiPitchDetector();
    volumeControl = new VolumeControl(detector);

    // Création des cases à cocher pour les intervalles
    const intervalLabels = ['Show Intervals', '2', '3', '4', '5', '6', '7', '8'];
    for (let i = 0; i < intervalLabels.length; i++) {
        let checkbox = createCheckbox(intervalLabels[i], false);
        checkbox.position(windowWidth - 150, 10 + i * 30);
        if (i === 0) {
            checkbox.changed(() => guitar.showIntervals = checkbox.checked());
        } else {
            checkbox.changed(() => guitar.handleCheckboxChange(i + 1));
        }
        intervalCheckboxes.push(checkbox);
    }
} 

function toggleMic() {
    micMuted = !micMuted;
    if (micMuted) {
      muteButton.html('<i class="fas fa-microphone"></i>');
      // Arrêter le micro
      detector.mic.stop();
    } else {
      muteButton.html('<i class="fas fa-microphone-slash"></i>');
      // Démarrer le micro
      detector.mic.start();
    }
  }

function windowResized() {
    // gestion reponsive
    wW = windowWidth
    wH = windowHeight
    resizeCanvas(wW, wH);
    guitar.resize()
    console.log('resize')
}

function mouseMoved(){
    if (guitar) {
        guitar.mouseMoved();
    }
}

function mouseReleased(){
    if (guitar) {
        guitar.mousePressed();
    }
}

function keyPressed(){
    if (guitar) {
        guitar.keyPressed();
    }
    if (keyCode == 81) guitar.setPlayedNote ('E4');
}

function keyReleased(){
    if (guitar) {
        guitar.keyReleased();
    }
}

function draw() {
    // ici on ne s'occupe que de l affichage
    guitar.display(selectedNotes)
    displayTuner(noteFrequency,400,400,100)
    
    // Mettre à jour et afficher le vumètre
    volumeControl.updateVolumeLevel(mic);
    volumeControl.display();
    
    if (!micMuted) {
        // Autres logiques liées à l'analyse du micro
        let result = detector.analyze();
        let notes = detector.getPitches()
        //text('Notes des 6 premiers pics: ' + result.notePeaks.join(', '), 10, height - 30);
        //text('3 notes les plus graves: ' + detector.getPitches().join(', '), 10, height - 50);
        if (notes.length > 0)
            guitar.setPlayedNote(notes)
        else
            guitar.setPlayedNote(null)
    }
    drawCircleOfFifths()
}

function midiNumberToNoteName(midiNumber) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    let octave = Math.floor(midiNumber / 12) - 1;
    let note = notes[midiNumber % 12];
    return  note + octave;
  }
  

// function listening(){
//     console.log('listening');
//     pitch = ml5.pitchDetection(
//         model_url,
//         audioContext,
//         mic.stream,
//         modelLoaded);
//   }
  
function displayTuner(frequency, x, y, s) {
    let midiNote, accurateNoteFrequency, centOffset, noteName;

    if ((frequency)&&(noteVolume > volumeThreshold)){
        push()   
        midiNote = freqToMidi(frequency);
        accurateNoteFrequency = midiToFreq(midiNote);
        centOffset = 1200 * Math.log2(frequency / accurateNoteFrequency);
        noteName = midiNumberToNoteName(midiNote) 
        textSize(s); // Définir la taille du texte
        fill(0); // Couleur noire pour le texte
        text(noteName, x, y); // Afficher le nom de la note et le numéro MIDI
        
        stroke(0);
        line(x - s, y + s, x + s, y + s); // Dessiner la ligne de base
        
        let offsetX = map(centOffset, -50, 50, -s, s); // Convertir le décalage en pixels
        stroke(255, 0, 0); // Couleur rouge pour l'indicateur de décalage
        strokeCap(SQUARE)
        strokeWeight(10)
        if ( Math.abs(centOffset)<20 ) 
            stroke('green')
        line(x, y + s - 10, x + offsetX, y + s - 10); // Dessiner l'indicateur de décalage
        pop()
    }
}


function gotPitch(error, frequency){
    let midiNote
    if (error) {
      console.error(error);
    } else {
      noteVolume = mic.getLevel(); // Obtenir le niveau de volume
      noteFrequency = frequency
      if (noteVolume > volumeThreshold) { // Vérifier si le volume dépasse le seuil
        if (frequency) { // S'assurer que la fréquence est définie
          midiNote = freqToMidi(frequency);
          if (midiNote>30) 
            guitar.setPlayedNote(midiNumberToNoteName(midiNote)) 
        } else
            guitar.setPlayedNote(null) 
      }    
            
            
    pitch.getPitch(gotPitch); // Demande la prochaine fréquence
  }
}

// function modelLoaded(){
// console.log('model loaded!');
// pitch.getPitch(gotPitch);
// }

function drawCircleOfFifths() {
    textSize(32);    
    let radius = (wH - textSize()) / 4;
    let centerX = wW / 2;
    let centerY = wH * 3 / 4;
    let notes = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

    fill(255);
    stroke(0);
    strokeWeight(2);


    textAlign(CENTER, CENTER);

    fill(0);

    for (let i = 0; i < notes.length; i++) {
        let angle = TWO_PI * i / notes.length - HALF_PI;
        let x = centerX + cos(angle) * radius;
        let y = centerY + sin(angle) * radius;
        text(notes[i], x, y);
    }
}

// gestion du midi

function notePressed(midiNote) {
    let index = liveNotes.findIndex(item => 
        item.note === midiNumberToNoteName(midiNote) 
      );
  
      if (index === -1) {
        // Si la note n'est déjà dans le tableau
        // ajouter la note au tableau
        liveNotes.push({note:midiNumberToNoteName(midiNote)});
      }
      console.log(liveNotes)
    guitar.setMidiNotes(liveNotes)
}
  
function noteReleased(midiNote) { 
    // retirer la note relachee
    let index = liveNotes.findIndex(item => 
        item.note === midiNumberToNoteName(midiNote) 
      );
  
      if (index !== -1) 
        liveNotes.splice(index, 1)   

      guitar.setMidiNotes(liveNotes)
}

function handleCheckboxChange(interval) {
    const intervalMap = {
        2: [2, 1], // seconde majeure et mineure
        3: [4, 3], // tierce majeure et mineure
        4: [5, 4], // quarte juste et diminuée
        5: [7, 6], // quinte juste et diminuée
        6: [9, 8], // sixte majeure et mineure
        7: [11, 10], // septième majeure et mineure
        8: [12] // octave
    };

    let intervals = intervalMap[interval];
    let currentInterval = intervals[0];
    let minorInterval = intervals[1];

    if (!guitar.intervals.includes(currentInterval) && (!minorInterval || !guitar.intervals.includes(minorInterval))) {
        guitar.intervals.push(currentInterval);
    } else if (guitar.intervals.includes(currentInterval)) {
        guitar.intervals = guitar.intervals.filter(interval => interval !== currentInterval);
        if (minorInterval) guitar.intervals.push(minorInterval);
    } else if (minorInterval && guitar.intervals.includes(minorInterval)) {
        guitar.intervals = guitar.intervals.filter(interval => interval !== minorInterval);
    }
}