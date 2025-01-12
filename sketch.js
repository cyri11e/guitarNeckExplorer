let wH 
let wW 
let selectedNotes = []
let liveNotes = []
let micMuted = true;
let muteButton;
let guitar
let sensitivitySlider;

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
    muteButton = createButton('Mute Microphone');
    muteButton.position(10, 10);
    muteButton.mousePressed(toggleMic);
    sensitivitySlider = createSlider(0, 1, volumeThreshold, 0.001);
    sensitivitySlider.position(10, 40);
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
    guitar = new Guitar(12);
    detector = new MultiPitchDetector();
} 

function toggleMic() {
    micMuted = !micMuted;
    if (micMuted) {
      muteButton.html('Unmute Microphone');
      // Arrêter le micro
      detector.mic.stop();
    } else {
      muteButton.html('Mute Microphone');
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

function mousePressed(){
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