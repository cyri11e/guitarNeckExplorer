let wH 
let wW 
let selectedNotes = []
let liveNotes = []
let micMuted = true;
let muteButton;
let segmentButton;
let selectionModeButton;
let majorMinorToggle; // <-- nouveau : toggle Maj/min
let scaleTypeButton; // <-- nouveau : 3-état Accords/Penta/Gamme
let clearButton;
let guitar
let sensitivitySlider;
let volumeLevel = 0;
let volumeControl;

// pitch detection
const model_url = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
const scale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
let pitch;
let audioContext;
let mic;
let volumeThreshold = 0.001
let noteFrequency
let noteVolume 

let intervalButtons = []; // boutons multi-états pour intervalles

function setup() {
    wH = windowHeight;
    wW = windowWidth;
    createCanvas(wW, wH);
    // muteButton = createButton('<i class="fas fa-microphone-slash"></i>');
    // muteButton.position(10, 10);
    // muteButton.mousePressed(toggleMic);

    segmentButton = createButton('Mode: Note');
    segmentButton.position(80, 10);
    segmentButton.style('padding', '6px 10px');
    segmentButton.mousePressed(toggleSegmentMode);

    selectionModeButton = createButton('Affichage: all');
    selectionModeButton.position(200, 10);
    selectionModeButton.style('padding', '6px 10px');
    selectionModeButton.mousePressed(toggleSelectionMode);

    // Toggle Maj/min
    majorMinorToggle = createButton('Maj');
    majorMinorToggle.position(410, 10);
    majorMinorToggle.style('padding', '6px 10px');
    majorMinorToggle.mousePressed(toggleMajorMinor);

    // 3-état : Accords / Penta / Gamme
    scaleTypeButton = createButton('Accords');
    scaleTypeButton.position(340, 10);
    scaleTypeButton.style('padding', '6px 10px');
    scaleTypeButton.mousePressed(toggleScaleType);

    clearButton = createButton('Vider');
    clearButton.position(500, 10);
    clearButton.style('padding', '6px 10px');
    clearButton.mousePressed(clearSelection);

    // sensitivitySlider = createSlider(0, 1, volumeThreshold, 0.001);
    // sensitivitySlider.position(10, 60);
    // sensitivitySlider.style('width', '200px');
    // sensitivitySlider.input(() => {
    //     let value = sensitivitySlider.value();
    //     console.log('Sensitivity Slider Value:', value);
    //     detector.setSensitivity(value);
    // });
  
    // Démarrer l'AudioContext lorsque la page est chargée
    userStartAudio().then(() => {
        // Initialiser le contexte audio et le micro après que l'utilisateur ait interagi
        audioContext = getAudioContext();
        mic = new p5.AudioIn();
        mic.start();
    });

    // Création d'un manche de guitare
    guitar = new Guitar(13);
    //detector = new MultiPitchDetector();
    //volumeControl = new VolumeControl(detector);

    // Boutons multi-états pour intervalles 1 à 7
    const intervalLabels = [
        ['1'],        // 1
        ['2', 'b2'],  // 2
        ['3', 'b3'],  // 3
        ['4', '#4'],  // 4
        ['5', 'b5'],  // 5
        ['6', 'b6'],  // 6
        ['7', 'b7'],  // 7
        ['8']         // 8 octave
    ];
    // Positionnement à droite du bouton "Vider"
    let baseX = 500 + clearButton.width + 10; // 10px d'espace après "Vider"
    let baseY = 10;
    let btnWidth = 38; // largeur fixe pour coller les boutons
    for (let i = 0; i < 8; i++) {
        let btn = createButton(intervalLabels[i][0]);
        btn.position(baseX + i * btnWidth, baseY);
        btn.style('padding', '6px 0px');
        btn.style('width', btnWidth + 'px');
        btn.style('font-weight', 'bold');
        btn.style('margin', '0');
        btn.style('border-radius', '0');
        btn.mousePressed(() => toggleIntervalButton(i + 1));
        intervalButtons.push(btn);
    }
    updateIntervalButtons();
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

// ajoute la fonction de bascule
function toggleSegmentMode() {
    // bascule l'état sur l'objet guitar si disponible
    if (typeof guitar !== 'undefined' && guitar) {
        guitar.segmentMode = !guitar.segmentMode;
    } else {
        // si guitar pas encore instancié, on conserve l'état sur le bouton quand même
    }

    // déterminer état affiché
    let isSegment = (guitar && guitar.segmentMode) || (!guitar && segmentButton.html().includes('Segment'));
    if (!guitar) isSegment = !isSegment;

    // mettre à jour label
    segmentButton.html('Mode: ' + (isSegment ? 'Segment' : 'Note'));

    // style visuel simple
    if (isSegment) {
        // ⚡️ ici on appelle la fonction de couleur
        let newColor = guitar.segmentColorToggle();
        segmentButton.style('background-color', newColor);
        segmentButton.style('color', '#000000ff');
    } else {
        segmentButton.style('background-color', '');
        segmentButton.style('color', '');
    }
}



// Nouveau : bascule cyclique entre 'all' -> 'exact' -> 'single'
function toggleSelectionMode() {
	const modes = ['all', 'exact', 'single'];
	let current = 'all';
	if (guitar && guitar.selectionMode) current = guitar.selectionMode;
	const next = modes[(modes.indexOf(current) + 1) % modes.length];
	// appliquer sur l'objet guitar si présent
	if (guitar) guitar.selectionMode = next;
	// mettre à jour label
	selectionModeButton.html('Affichage: ' + next);
	// styling simple
	if (next === 'single') {
		selectionModeButton.style('background-color', '#222');
		selectionModeButton.style('color', '#fff');
	} else {
		selectionModeButton.style('background-color', '');
		selectionModeButton.style('color', '');
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

// function mouseReleased(){
//     if (guitar) {
//         guitar.mousePressed();
//     }
// }

function keyPressed(){
    if (guitar) {
        guitar.keyPressed();
    }
    // Synchroniser boutons avec touches 1 à 7
    if (keyCode >= 49 && keyCode <= 56) { // touches '1' à '8'
        toggleIntervalButton(keyCode - 48);
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
    // displayTuner(noteFrequency,400,400,100)
    
    // Mettre à jour et afficher le vumètre
    //volumeControl.updateVolumeLevel(mic);
    //volumeControl.display();
    
    // if (!micMuted) {
    //     // Autres logiques liées à l'analyse du micro
    //     let result = detector.analyze();
    //     let notes = detector.getPitches()
    //     //text('Notes des 6 premiers pics: ' + result.notePeaks.join(', '), 10, height - 30);
    //     //text('3 notes les plus graves: ' + detector.getPitches().join(', '), 10, height - 50);
    //     if (notes.length > 0)
    //         guitar.setPlayedNote(notes)
    //     else
    //         guitar.setPlayedNote(null)
    // }
}


function mouseClicked() {
    if (guitar) {
        guitar.mouseClicked();
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

function drawCircleOfFifths() {
    textSize(32);    
    let radius = (wH - textSize()*2) / 4;
    let centerX = wW / 2;
    let centerY = wH * 3 / 4;
    let notes = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

    fill(255);
    stroke(0);
    strokeWeight(1);


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

function toggleMajorMinor() {
   if (guitar) {
       guitar.isMajor = !guitar.isMajor;
       majorMinorToggle.html(guitar.isMajor ? 'Maj' : 'min');
       majorMinorToggle.style('background-color', guitar.isMajor ? '' : '#666');
       // mettre à jour les intervals selon le type courant
       updateIntervalsFromMode();
   }
}

function toggleScaleType() {
   if (guitar) {
       const types = ['accords', 'penta', 'gamme'];
       let currentIndex = types.indexOf(guitar.scaleType || 'accords');
       let nextIndex = (currentIndex + 1) % types.length;
       guitar.scaleType = types[nextIndex];
       scaleTypeButton.html(types[nextIndex].charAt(0).toUpperCase() + types[nextIndex].slice(1));
       // mettre à jour les intervals
       updateIntervalsFromMode();
   }
}

function updateIntervalsFromMode() {
   if (!guitar) return;
   const scaleType = guitar.scaleType || 'accords';
   const isMajor = guitar.isMajor;
   let intervals = [];
   
   if (scaleType === 'accords') {
       intervals = isMajor ? guitar.majorChord : guitar.minorChord;
   } else if (scaleType === 'penta') {
       intervals = isMajor ? guitar.majorPentatonicScale : guitar.minorPentatonicScale;
   } else if (scaleType === 'gamme') {
       intervals = isMajor ? guitar.majorScale : guitar.minorScale;
   }
   guitar.intervals = [...intervals];
   updateIntervalButtons();
}

function setIntervals(intervals) {
   if (guitar) {
       guitar.intervals = [...intervals];
   }
}

function clearSelection() {
   if (guitar) {
       if (guitar.segmentMode) {
           // Mode segment : vider les segments
           guitar.segments = [];
           guitar._segmentBuffer = [];
       } else {
           // Mode note : vider les notes et intervalles
           guitar.intervals = [];
           guitar.clickedNotes = [];
           guitar.tonic = null;
       }
   }
   guitar.resetIntervalButtons(); // MAJ visuelle des boutons
   updateIntervalButtons();
}

// --- NOUVEAU : INTERVALLES MULTI-ETATS ---

function toggleIntervalButton(n) {
   // n = 1 à 8
   if (!guitar) return;
   const intervalMap = {
       1: [0],        // 1
       2: [2, 1],     // 2, b2
       3: [4, 3],     // 3, b3
       4: [5, 6],     // 4, #4
       5: [7, 6],     // 5, b5
       6: [9, 8],     // 6, b6
       7: [11, 10],   // 7, b7
       8: [12]        // 8 octave
   };
   let intervals = intervalMap[n];
   let current = intervals.find(val => guitar.intervals.includes(val));
   // cycle : inactif -> majeur -> altéré -> inactif
   if (!current) {
       // aucun actif, activer majeur
       guitar.intervals.push(intervals[0]);
   } else if (current === intervals[0] && intervals[1] !== undefined) {
       // majeur actif, passer à altéré
       guitar.intervals = guitar.intervals.filter(val => val !== intervals[0]);
       guitar.intervals.push(intervals[1]);
   } else if (intervals[1] !== undefined) {
        // altéré actif, désactiver tout
        guitar.intervals = guitar.intervals.filter(val => val !== intervals[1]);
   } else {
      // octave (pas d'altéré), désactiver
      guitar.intervals = guitar.intervals.filter(val => val !== intervals[0]);
   }
   updateIntervalButtons();
}

function updateIntervalButtons() {
   if (!guitar) return;
   const intervalMap = {
       1: [0],        // 1
       2: [2, 1],     // 2, b2
       3: [4, 3],     // 3, b3
       4: [5, 6],     // 4, #4
       5: [7, 6],     // 5, b5
       6: [9, 8],     // 6, b6
       7: [11, 10],   // 7, b7
       8: [12]        // 8 octave
   };
   const intervalLabels = [
       ['1'],
       ['2', 'b2'],
       ['3', 'b3'],
       ['4', '#4'],
       ['5', 'b5'],
       ['6', 'b6'],
       ['7', 'b7'],
       ['8']
   ];
   for (let i = 0; i < 8; i++) {
       let intervals = intervalMap[i + 1];
       let btn = intervalButtons[i];
       let label = intervalLabels[i][0];
       let minorLabel = intervalLabels[i][1];
       if (guitar.intervals.includes(intervals[0])) {
           btn.html(label);
           btn.style('background-color', '#2ecc40');
           btn.style('color', '#fff');
       } else if (intervals[1] !== undefined && guitar.intervals.includes(intervals[1])) {
           btn.html(minorLabel);
           btn.style('background-color', '#ff9800');
           btn.style('color', '#fff');
       } else {
           btn.html(label);
           btn.style('background-color', '#eee');
           btn.style('color', '#888');
       }
   }
}

function mouseClicked() {
    // Vérifier si un bouton d'accord ouvert est cliqué
    const buttonY = guitar.neckY + guitar.neckHeight * 1.5;
    const buttonHeight = guitar.neckWidth / 10;
    const openNotes = ['C', 'A', 'G', 'E', 'D']; // Ordre CAGED
    const buttonWidth = guitar.neckWidth / 5;
    
    for (let i = 0; i < openNotes.length; i++) {
        const note = openNotes[i];
        const buttonX = guitar.neckX + i * buttonWidth;
        
        // Vérifier si le clic est dans la hitbox du bouton
        if (mouseX >= buttonX && mouseX <= buttonX + buttonWidth - 5 &&
            mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
            
            // Charger l'accord ouvert
            guitar.loadOpenChord(note);
            return false;
        }
    }
    
    // Si aucun bouton n'a été cliqué, continuer avec le comportement normal du manche
    if (guitar) {
        guitar.mouseClicked();
    }
    return false;
}