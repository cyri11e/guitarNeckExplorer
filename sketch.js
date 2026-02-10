let wH 
let wW 
let selectedNotes = []
let liveNotes = []
let micMuted = true;
// UI Panels et Composants
let panel, panel2;
let knob1, knob2;
let lcd;
let marker;
let uiRules;

let guitar
let volumeLevel = 0;
let helpPopup; // Popup d'aide

// pitch detection
const model_url = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
const scale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
let pitch;
let audioContext;
let mic;
let volumeThreshold = 0.001
let noteFrequency
let noteVolume 
let myFont

function drawTextCentered(txt, x, y, tweak = -5) {
  const offsetY = (textAscent() - textDescent()) / 2 + tweak;
  text(txt, x, y - offsetY);
}


//function preload() { myFont = loadFont("FreeSans.ttf"); }

function setup() {
    wH = windowHeight;
    wW = windowWidth;
    createCanvas(wW, wH);

    
    // Création du manche de guitare AVANT le contrôle de mode segment
    guitar = new Guitar(13);

    // ===== INITIALISATION DES PANNEAUX UI =====
    // Gestionnaire de règles UI
    uiRules = new UIInteractionManager();

    // Panel 1 : Contrôle des notes (knobs, LCD, switches intervalles)
    panel = new Panel(1, 1, 10, {
        isDraggable: true,
        isZoomable: true,
    });
    panel.debug = false;

    // Panel 2 : Contrôle avancé (metal switch + marker segment)
    panel2 = new Panel(60, 1, 10, {
        isDraggable: true,
        isZoomable: true,
    });
    panel2.debug = false;

    // ===== PANEL 1 : CONTRÔLE DES NOTES =====
    // Knob1 : C/N/T (Curseur / Notes / Octaves)
    knob1 = new Knob(0, 0, 100, KNOB1_OPTIONS);
    knob1.debug = false;
    panel.add(knob1);

    // Knob2 : 1/3/4/5/7 (Unique / Triade / Tétrade / Pentatonique / Diatonique)
    knob2 = new Knob(0, 0, 100, KNOB2_OPTIONS);
    knob2.debug = false;
    panel.add(knob2);

    // LCD : Sous-catégories (Maj/Min/Diminué/Augmenté, etc.)
    lcd = new LCDSelector(0, 0, 100, LCD_OPTIONS);
    lcd.debug = false;
    lcd.setOnOff(false);
    lcd.setItems([]);
    panel.add(lcd);

    // Switches d'intervalles (remplacent les boutons HTML)
    SWITCH_CONFIG.forEach((config) => {
        let sw = new Switch(0, 0, 100, {
            title: config.title,
            topLabel: config.top,
            bottomLabel: config.bottom,
            color: "#aa0000",
            shortcutKey: config.title,
            ratio: 0.35,
            debug: false,
        });
        panel.add(sw);
    });

    // ===== PANEL 2 : CONTRÔLE AVANCÉ =====
    // Metal Switch : # / ♭
    const metalSharpFlat = new MetalSwitch(
        0, 0, 100,
        METALSWITCH_CONFIG
    );
    metalSharpFlat.debug = false;
    
    // Initialiser le MetalSwitch selon l'état initial de guitar
    // state = 0 → flat mode (♭)
    // state = 1 → sharp mode (♯)
    metalSharpFlat.state = guitar.flatMode ? 0 : 1;
    
    panel2.add(metalSharpFlat);

    // Marker : Mode Segment ON/OFF + Color Picker
    marker = new MarkerSelector(0, 0, 100, {
        title: "Segment",
        shortcutKey: "p",
    });
    marker.debug = false;
    panel2.add(marker);

    // Enregistrer les panneaux
    uiRules.register(panel);
    uiRules.register(panel2);

    // Charger les règles UI depuis config
    if (typeof UI_RULES !== 'undefined') {
        UI_RULES.forEach((rule) => uiRules.addRule(rule));
    }
    
    // Popup d'aide
    helpPopup = new HelpPopup();  



} 


// La fonction toggleSegmentMode est maintenant gérée par SegmentModeControl
// On la garde pour la compatibilité avec les touches clavier
function toggleSegmentMode() {
    if (typeof guitar !== 'undefined' && guitar) {
        guitar.segmentMode = !guitar.segmentMode;
    }
}



function windowResized() {
    // gestion reponsive
    wW = windowWidth
    wH = windowHeight
    resizeCanvas(wW, wH);
    guitar.resize()
    if (panel) panel.updateResponsive();
    if (panel2) panel2.updateResponsive();
    console.log('resize')
}

function mouseMoved(){
    if (panel) panel.updateHover(mouseX, mouseY);
    if (panel2) panel2.updateHover(mouseX, mouseY);
    if (guitar) {
        guitar.mouseMoved();
    }
}

function mouseDragged() {
    // Priorité aux panneaux UI
    if (panel && panel.mouseDragged(mouseX, mouseY)) return false;
    if (panel2 && panel2.mouseDragged(mouseX, mouseY)) return false;
    
    // Sinon, laisser la guitare gérer le drag
    if (guitar) {
        guitar.mouseMoved();
    }
    return false;
}

function mouseReleased() {
    if (panel) panel.mouseReleased(mouseX, mouseY);
    if (panel2) panel2.mouseReleased(mouseX, mouseY);
}
//     }
// }

function keyPressed(){
    // Gestion des raccourcis UI
    if (typeof UIManager !== 'undefined') {
        UIManager.handleShortcut(key, keyCode);
    }
    
    // Touche H pour l'aide
    if (keyCode == 72) { // 72 = H
        if (helpPopup) {
            helpPopup.toggle();
        }
        return;
    }
    
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

function mouseWheel(event) {
    // Priorité aux panneaux pour le zoom
    if (panel && panel.mouseWheel(event)) {
        return false;
    }
    if (panel2 && panel2.mouseWheel(event)) {
        return false;
    }
    // Sinon, laisser la guitare gérer
    return false;
}
function draw() {
    // ici on ne s'occupe que de l affichage
    guitar.display(selectedNotes)
    
    // ===== RENDU UI PANELS =====
    if (panel) {
        panel.updateResponsive();
        panel.updateHover(mouseX, mouseY);
        panel.draw();
    }
    if (panel2) {
        panel2.updateResponsive();
        panel2.updateHover(mouseX, mouseY);
        panel2.draw();
    }
    
    // Afficher le popup d'aide
    if (helpPopup) {
        helpPopup.display();
    }
    
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


// Flag de capture UI
let uiCapturedClick = false;

function mousePressed() {
    // Priorité aux panneaux UI
    if (panel && panel.mousePressed(mouseX, mouseY)) {
        uiCapturedClick = true;
        console.log('%c[UI CAPTURED] Panel 1', 'color:#00ff00');
        return false;
    }
    if (panel2 && panel2.mousePressed(mouseX, mouseY)) {
        uiCapturedClick = true;
        console.log('%c[UI CAPTURED] Panel 2', 'color:#00ff00');
        return false;
    }
    uiCapturedClick = false;
    return true;
}

function mouseClicked() {
    // Si l'UI a capturé le clic, NE PAS continuer
    if (uiCapturedClick) {
        console.log('%c[CLICK BLOCKED] UI already captured', 'color:#ff0000');
        return false;
    }
    
    // Priorité au popup d'aide
    if (helpPopup && helpPopup.mousePressed()) {
        return false;
    }
    
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

// --- NOUVEAU : INTERVALLES MULTI-ETATS ---

function toggleIntervalButton(n) {
   // n = 1 à 7 (numéro du switch)
   // Cette fonction modifie le switch correspondant, qui déclenche la RÈGLE de sync
   
   if (!UIManager || !UIManager.components) return;
   
   // Trouver le switch avec le titre "n"
   const switches = UIManager.components.filter(c => c instanceof Switch && !c.isPassive);
   const targetSwitch = switches.find(sw => parseInt(sw.title) === n);
   
   if (!targetSwitch) return;
   
   // Cycle : 0 (inactif) → 1 (majeur/normal) → 2 (altéré/mineur) → 0
   targetSwitch.state = (targetSwitch.state + 1) % 3;

}




