
let wH 
let wW 
let selectedNotes = []

// pitch detection
const model_url = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
const scale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
let pitch;
let audioContext;
let mic;
let volumeThreshold = 0.01
let noteFrequency
let noteVolume 

function setup() {
    wH = windowHeight;
    wW = windowWidth;
    createCanvas(wW, wH);

    // Démarrer l'AudioContext lorsque la page est chargée
    userStartAudio().then(() => {
        // Initialiser le contexte audio et le micro après que l'utilisateur ait interagi
        audioContext = getAudioContext();
        mic = new p5.AudioIn();
        mic.start(listening);
    });

    // Création d'un manche de guitare
    guitar = new Guitar(6);
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
    guitar.mouseMoved()
}

function mousePressed(){
    guitar.mousePressed()
}

function keyPressed(){
    guitar.keyPressed()
    if (keyCode == 81) guitar.setPlayedNote ('E4')
    

}

function keyReleased(){
    guitar.keyReleased()
}

function draw() {
    // ici on ne s'occupe que de l affichage
    guitar.display(selectedNotes)
    displayTuner(noteFrequency,100,300,50)
}

function midiNumberToNoteName(midiNumber) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    let octave = Math.floor(midiNumber / 12) - 1;
    let note = notes[midiNumber % 12];
    return  note + octave;
  }
  

function listening(){
    console.log('listening');
    pitch = ml5.pitchDetection(
        model_url,
        audioContext,
        mic.stream,
        modelLoaded);
  }
  
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
        } 
      } else
            guitar.setPlayedNote(null)       
    pitch.getPitch(gotPitch); // Demande la prochaine fréquence
  }
}

function modelLoaded(){
console.log('model loaded!');
pitch.getPitch(gotPitch);
}