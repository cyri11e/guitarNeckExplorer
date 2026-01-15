let wH 
let wW 
let guitar

// Game variables
let gameStarted = false;
let gameMode = null; // "intervals", "degrees" ou "notes"
let useFlatMode = true; // true = bémols, false = dièses
let god_mode = true; // Affiche la pastille sous le curseur (mode debug)
let gameActive = true;
let gameStartTime = 0;
let questionStartTime = 0; // Pour tracker le temps par question
let currentTime = 0;
let score = 0;
let totalTime = 0; // Temps total des réponses
let questionsAnswered = 0; // Nombre de questions répondues
let sessionQuestions = 10; // Nombre de questions par session
let targetNote = null;
let startingNote = null;
let startingNotePosition = null; // {string, fret} de la note de départ
let currentInterval = 0;
let currentDegree = 0;
let currentTargetNoteName = null; // Pour le mode "notes"
let userSelectedNote = null;
let userSelectedPosition = null; // {string, fret} de la sélection de l'utilisateur
let showingAnswer = false;
let answerWasCorrect = false;
let correctNotePosition = null;
let sessionEnded = false; // La session est-elle terminée ?

// Intervalle list (semitones) - incluant montées et descentes
const intervalList = [-12, -10, -9, -8, -7, -5, -4, -3, -2, 0, 2, 3, 4, 5, 7, 8, 9, 10, 12];

function setup() {
    wH = windowHeight;
    wW = windowWidth;
    createCanvas(wW, wH);
    
    // Création du manche de guitare
    guitar = new Guitar(13);
    
    // Ne pas démarrer le jeu tout de suite - attendre que l'utilisateur appuie sur Space
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

function mouseDragged() {
    if (guitar) {
        guitar.mouseMoved();
    }
    return false;
}

function mouseReleased() {
    // nothing for now
}

function keyPressed(){
    // Espace pour passer à la question suivante ou terminer la session
    if (key === ' ' || keyCode === 32) {
        if (showingAnswer) {
            questionsAnswered++;
            
            // Vérifier si la session est terminée
            if (questionsAnswered >= sessionQuestions) {
                sessionEnded = true;
                gameStarted = false;
            } else {
                // Passer à la question suivante
                startNewQuestion();
            }
        }
        return false;
    }
    
    if (guitar) {
        guitar.keyPressed();
    }
}

function keyReleased(){
    if (guitar) {
        guitar.keyReleased();
    }
}

function draw() {
    // Affichage du manche de guitare
    guitar.display()
    
    // Afficher les indices visuels
    drawVisualFeedback();
    
    // Affichage du jeu
    displayGameUI();
}

function mouseClicked() {
    // Écran d'accueil : boutons cliquables
    if (!gameMode && !sessionEnded) {
        let buttonY = height / 2 + 50;
        let buttonWidth = 120;
        let buttonHeight = 50;
        
        // Bouton 1 - Intervalles
        if (mouseX > width / 2 - 200 - buttonWidth / 2 && mouseX < width / 2 - 200 + buttonWidth / 2 &&
            mouseY > buttonY - buttonHeight / 2 && mouseY < buttonY + buttonHeight / 2) {
            gameMode = "intervals";
            useFlatMode = random() > 0.5;
            gameStarted = true;
            startNewQuestion();
            return false;
        }
        
        // Bouton 2 - Degrés
        if (mouseX > width / 2 - buttonWidth / 2 && mouseX < width / 2 + buttonWidth / 2 &&
            mouseY > buttonY - buttonHeight / 2 && mouseY < buttonY + buttonHeight / 2) {
            gameMode = "degrees";
            useFlatMode = random() > 0.5;
            gameStarted = true;
            startNewQuestion();
            return false;
        }
        
        // Bouton 3 - Notes
        if (mouseX > width / 2 + 200 - buttonWidth / 2 && mouseX < width / 2 + 200 + buttonWidth / 2 &&
            mouseY > buttonY - buttonHeight / 2 && mouseY < buttonY + buttonHeight / 2) {
            gameMode = "notes";
            useFlatMode = random() > 0.5;
            gameStarted = true;
            startNewQuestion();
            return false;
        }
    }
    
    // Écran de fin : recommencer
    if (sessionEnded) {
        let restartButtonY = height / 2 + 100;
        let restartButtonWidth = 150;
        let restartButtonHeight = 50;
        
        if (mouseX > width / 2 - restartButtonWidth / 2 && mouseX < width / 2 + restartButtonWidth / 2 &&
            mouseY > restartButtonY - restartButtonHeight / 2 && mouseY < restartButtonY + restartButtonHeight / 2) {
            // Réinitialiser le jeu
            gameMode = null;
            gameStarted = false;
            sessionEnded = false;
            score = 0;
            totalTime = 0;
            questionsAnswered = 0;
            return false;
        }
    }
    
    // Jeu normal
    if (!gameActive || !gameMode || showingAnswer) return false;
    
    if (guitar) {
        guitar.mouseClicked();
        
        // Vérifier si l'utilisateur a cliqué sur une note
        if (guitar.clickedNote) {
            userSelectedNote = guitar.clickedNote;
            userSelectedPosition = { string: guitar.clickedNote.string, fret: guitar.clickedNote.fret };
            
            // Vérifier si c'est la bonne réponse
            if (userSelectedNote.note === targetNote) {
                answerWasCorrect = true;
                score++;
            } else {
                answerWasCorrect = false;
            }
            
            // Tracker le temps de cette question
            let responseTime = millis() - questionStartTime;
            totalTime += responseTime;
            questionsAnswered++;
            
            showingAnswer = true;
            
            // Afficher la position correcte sur le manche
            if (correctNotePosition) {
                guitar.setPlayedNote([targetNote]);
            }
        }
    }
    return false;
}

function getRandomNote(baseNote, maxOctaveDistance = 1) {
    const notesOrderSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const notesOrderFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    const enharmonics = {
        'C#': 'Db',
        'Db': 'C#',
        'D#': 'Eb',
        'Eb': 'D#',
        'F#': 'Gb',
        'Gb': 'F#',
        'G#': 'Ab',
        'Ab': 'G#',
        'A#': 'Bb',
        'Bb': 'A#'
    };
    
    // Extraire la note et l'octave
    let noteName = baseNote.match(/[A-G]#?b?/)[0];
    let octave = parseInt(baseNote.match(/\d+/)[0]);
    
    // Normaliser la note selon le mode (flat ou sharp)
    if (useFlatMode) {
        // Si en mode bémol, convertir les dièses en bémols
        if (noteName.includes('#')) {
            noteName = enharmonics[noteName];
        }
    } else {
        // Si en mode dièse, convertir les bémols en dièses
        if (noteName.includes('b')) {
            noteName = enharmonics[noteName];
        }
    }
    
    let notesOrder = useFlatMode ? notesOrderFlat : notesOrderSharp;
    let baseNoteIndex = notesOrder.indexOf(noteName);
    if (baseNoteIndex === -1) {
        // Fallback si la note normalisée n'est pas trouvée
        baseNoteIndex = 0;
    }
    
    let baseMidiIndex = baseNoteIndex + (octave * 12);
    
    // Générer une note aléatoire dans la plage ± (maxOctaveDistance * 12) semitones
    // Mais limiter aux octaves 2-4 qui existent sur le fretboard
    let midiRange = maxOctaveDistance * 12;
    let minOctave = 2;
    let maxOctave = 4;
    let minMidiIndex = minOctave * 12;
    let maxMidiIndex = (maxOctave + 1) * 12 - 1;
    
    let randomMidiIndex;
    let attempts = 0;
    do {
        randomMidiIndex = baseMidiIndex + floor(random(-midiRange, midiRange + 1));
        attempts++;
    } while ((randomMidiIndex < minMidiIndex || randomMidiIndex > maxMidiIndex) && attempts < 10);
    
    // Si on a pas trouvé après 10 tentatives, utiliser une note dans les limites
    if (randomMidiIndex < minMidiIndex || randomMidiIndex > maxMidiIndex) {
        randomMidiIndex = baseMidiIndex; // Fallback à la note de base
    }
    
    let targetOctave = Math.floor(randomMidiIndex / 12);
    let targetNoteIndex = randomMidiIndex % 12;
    if (targetNoteIndex < 0) {
        targetNoteIndex += 12;
        targetOctave -= 1;
    }
    
    return notesOrder[targetNoteIndex] + targetOctave;
}

// ====== GAME FUNCTIONS ======

function startNewQuestion() {
    let validQuestion = false;
    let attempts = 0;
    
    // Boucler jusqu'à trouver une question valide (intervalle accessible sur le manche)
    while (!validQuestion && attempts < 20) {
        // Sélectionner une position aléatoire sur le manche
        let randomString = floor(random(6));
        let randomFret = floor(random(1, guitar.fretCount));
        
        startingNote = guitar.getNoteFromCoordinates(randomString, randomFret);
        startingNotePosition = { string: randomString, fret: randomFret };
        
        if (gameMode === "intervals") {
            // Mode Intervalles
            currentInterval = random(intervalList);
            targetNote = calculateTargetNote(startingNote, currentInterval);
        } else if (gameMode === "degrees") {
            // Mode Degrés - degrés de la gamme majeure (incluant unisson)
            const degrees = [0, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7];
            currentDegree = random(degrees);
            targetNote = calculateTargetByDegree(startingNote, currentDegree);
        } else if (gameMode === "notes") {
            // Mode Notes - note aléatoire
            targetNote = getRandomNote(startingNote, 1); // ±1 octave
            currentTargetNoteName = targetNote.match(/[A-G]#?b?/)[0];
        }
        
        // Trouver la position de cette note sur le manche
        correctNotePosition = findNoteOnFretboard(targetNote);
        
        // Vérifier que la note cible est accessible (existe sur le manche)
        if (correctNotePosition) {
            validQuestion = true;
        }
        attempts++;
    }
    
    // Réinitialiser l'état
    userSelectedNote = null;
    userSelectedPosition = null;
    showingAnswer = false;
    answerWasCorrect = false;
    questionStartTime = millis(); // Tracker le temps du début de la question
    
    // Configurer le guitar pour afficher la pastille correctement en god_mode
    guitar.startingNotePosition = startingNotePosition; // Passer la position de départ
    guitar.godMode = god_mode; // Passer l'état du mode dieu
    guitar.startingNote = startingNote; // Passer la note de départ pour affichage
    
    if (gameMode === "notes") {
        guitar.degreMode = false; // Afficher les notes
        guitar.tonic = null; // Pas de tonique en mode notes
    } else {
        guitar.degreMode = true; // Afficher les degrés
        guitar.tonic = { note: startingNote, string: startingNotePosition.string, fret: startingNotePosition.fret };
    }
    
    // Configuration pour afficher uniquement la note survolée
    guitar.selectionMode = 'single';
    guitar.intervals = []; // Vider les intervalles
    guitar.clickedNotes = []; // Vider les notes cliquées
    guitar.playedNotes = []; // Vider les notes jouées
}

function calculateTargetByDegree(startNote, degree) {
    // Gamme majeure : intervalles en semitones [0, 2, 4, 5, 7, 9, 11]
    const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];
    const notesOrderSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    // Extraire la note et l'octave
    let noteName = startNote.match(/[A-G]#?/)[0];
    let octave = parseInt(startNote.match(/\d+/)[0]);
    
    let startNoteIndex = notesOrderSharp.indexOf(noteName);
    let startMidiIndex = startNoteIndex + (octave * 12);
    
    // Cas spécial : degré 0 = unisson (même note)
    if (degree === 0) {
        return startNote;
    }
    
    // Pour les autres degrés
    let degreeIndex = Math.abs(degree) - 1;
    degreeIndex = degreeIndex % 7; // Limiter à 0-6
    
    // Obtenir l'intervalle en semitones pour ce degré
    let intervalInSemitones = majorScaleIntervals[degreeIndex];
    
    // Si le degré est négatif, aller une octave vers le bas
    if (degree < 0) {
        intervalInSemitones = intervalInSemitones - 12;
    }
    
    // Calculer la note cible en MIDI
    let targetMidiIndex = startMidiIndex + intervalInSemitones;
    
    let targetOctave = Math.floor(targetMidiIndex / 12);
    let targetNoteIndex = targetMidiIndex % 12;
    if (targetNoteIndex < 0) {
        targetNoteIndex += 12;
        targetOctave -= 1;
    }
    
    let targetNote = notesOrderSharp[targetNoteIndex] + targetOctave;
    
    // Convertir en bémol si nécessaire
    if (useFlatMode) {
        let targetNoteName = targetNote.match(/[A-G]#?b?/)[0];
        if (targetNoteName.includes('#')) {
            const enharmonics = {'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'};
            targetNoteName = enharmonics[targetNoteName];
            targetNote = targetNoteName + targetOctave;
        }
    }
    
    return targetNote;
}

function calculateTargetNote(startNote, interval) {
    const notesOrderSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    // Extraire la note et l'octave
    let noteName = startNote.match(/[A-G]#?/)[0];
    let octave = parseInt(startNote.match(/\d+/)[0]);
    
    let noteIndex = notesOrderSharp.indexOf(noteName);
    let midiIndex = noteIndex + (octave * 12);
    let targetMidiIndex = midiIndex + interval;
    
    let targetOctave = Math.floor(targetMidiIndex / 12);
    let targetNoteIndex = targetMidiIndex % 12;
    if (targetNoteIndex < 0) {
        targetNoteIndex += 12;
        targetOctave -= 1;
    }
    
    let targetNote = notesOrderSharp[targetNoteIndex] + targetOctave;
    
    // Convertir en bémol si nécessaire
    if (useFlatMode) {
        let targetNoteName = targetNote.match(/[A-G]#?b?/)[0];
        if (targetNoteName.includes('#')) {
            const enharmonics = {'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'};
            targetNoteName = enharmonics[targetNoteName];
            targetNote = targetNoteName + targetOctave;
        }
    }
    
    return targetNote;
}

function findNoteOnFretboard(noteName) {
    // Rechercher la première occurrence de cette note sur le manche
    for (let string = 0; string < 6; string++) {
        for (let fret = 0; fret <= guitar.fretCount; fret++) {
            let noteOnFret = guitar.getNoteFromCoordinates(string, fret);
            if (noteOnFret === noteName) {
                return { string: string, fret: fret };
            }
        }
    }
    return null; // Note non trouvée
}

function displayGameUI() {
    if (!gameMode) {
        // Écran d'accueil avec options cliquables
        fill(0);
        textSize(48);
        textAlign(CENTER, CENTER);
        text('The KYN Game', width / 2, height / 2 - 100);
        
        textSize(32);
        text('Know Your Neck !', width / 2, height / 2 - 50);
        
        // Boutons cliquables
        let buttonY = height / 2 + 50;
        let buttonWidth = 120;
        let buttonHeight = 50;
        
        // Bouton 1 - Intervalles
        fill(0, 100, 200);
        rect(width / 2 - 200 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight);
        fill(255);
        textSize(18);
        text('1 - INTERVALLES', width / 2 - 200, buttonY);
        
        // Bouton 2 - Degrés
        fill(0, 100, 200);
        rect(width / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight);
        fill(255);
        text('2 - DEGRÉS', width / 2, buttonY);
        
        // Bouton 3 - Notes
        fill(0, 100, 200);
        rect(width / 2 + 200 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight);
        fill(255);
        text('3 - NOTES', width / 2 + 200, buttonY);
        
        fill(100);
        textSize(14);
        text('Intervalles: montée/descente', width / 2 - 200, height / 2 + 110);
        text('Degrés: dans une gamme', width / 2, height / 2 + 110);
        text('Notes: trouver une note spécifique', width / 2 + 200, height / 2 + 110);
        
        return;
    }
    
    // Écran de fin de session
    if (sessionEnded) {
        fill(0);
        textSize(48);
        textAlign(CENTER, CENTER);
        text('Session terminée!', width / 2, height / 2 - 100);
        
        textSize(32);
        let averageTime = totalTime / questionsAnswered / 1000;
        text('Score: ' + score + '/' + sessionQuestions, width / 2, height / 2 - 20);
        text('Temps moyen: ' + averageTime.toFixed(1) + 's', width / 2, height / 2 + 30);
        
        // Bouton Recommencer
        let restartButtonY = height / 2 + 100;
        let restartButtonWidth = 150;
        let restartButtonHeight = 50;
        
        fill(0, 150, 0);
        rect(width / 2 - restartButtonWidth / 2, restartButtonY - restartButtonHeight / 2, restartButtonWidth, restartButtonHeight);
        fill(255);
        textSize(20);
        text('Recommencer', width / 2, restartButtonY);
        
        return;
    }
    
    // Calculer le temps écoulé - arrêter le chrono si réponse donnée
    if (showingAnswer) {
        // Le chrono reste figé au moment de la réponse
    } else {
        currentTime = millis() - gameStartTime;
    }
    
    let seconds = floor(currentTime / 1000);
    let ms = currentTime % 1000;
    
    // Afficher l'UI sous le manche - plus loin du manche
    fill(0);
    textSize(24);
    textAlign(CENTER, TOP);
    
    let uiY = guitar.neckY + guitar.neckHeight + 80;
    
    // Afficher les informations de la question
    let questionText = "";
    if (gameMode === "intervals") {
        // Format: "Monte d'une tierce mineure (+m3)" ou "Descend d'une quarte juste (-P4)"
        let intervalInfo = getIntervalName(int(currentInterval));
        
        if (currentInterval === 0) {
            // Unisson - cas spécial
            questionText = "Trouve la même note (unisson)";
        } else {
            let sign = currentInterval >= 0 ? "+" : "-";
            if (currentInterval >= 0) {
                questionText = "Monte d'une " + intervalInfo.fr + " (" + sign + intervalInfo.code + ")";
            } else {
                questionText = "Descend d'une " + intervalInfo.fr + " (" + sign + intervalInfo.code + ")";
            }
        }
    } else if (gameMode === "degrees") {
        // Format pour les degrés
        if (currentDegree === 0) {
            // Unisson
            questionText = "Trouve le degré 1 (unisson)";
        } else {
            let degreeNum = Math.abs(currentDegree);
            let direction = currentDegree > 0 ? "aigu" : "grave";
            
            if (Math.abs(currentDegree) === 1) {
                // Degré 1 plus aigu/grave = octave
                questionText = "Trouve le degré 1 " + direction + " (octave)";
            } else {
                // Autres degrés
                questionText = "Trouve le degré " + degreeNum + " " + direction;
            }
        }
    } else if (gameMode === "notes") {
        // Format pour les notes
        let startNoteName = startingNote.match(/[A-G]#?b?/)[0];
        let targetNoteName = targetNote.match(/[A-G]#?b?/)[0];
        let startOctave = parseInt(startingNote.match(/\d+/)[0]);
        let targetOctave = parseInt(targetNote.match(/\d+/)[0]);
        
        if (targetNoteName === startNoteName && targetOctave === startOctave) {
            // Unisson - même note, même octave (normalement pas possible)
            questionText = "Trouve le même " + currentTargetNoteName;
        } else if (targetNoteName === startNoteName) {
            // Même note, octave différent
            let direction = targetOctave > startOctave ? "aigu" : "grave";
            questionText = "Trouve le même " + currentTargetNoteName + " " + direction;
        } else {
            // Note différente - préciser la direction
            let direction = targetOctave > startOctave ? "aigu" : "grave";
            questionText = "Trouve le " + currentTargetNoteName + " " + direction;
        }
    }
    
    text(questionText, width / 2, uiY);
    
    // Afficher le score et le timer sur la même ligne
    text('Score: ' + score + '  |  Time: ' + seconds + '.' + floor(ms / 100), width / 2, uiY + 40);
    
    // Message de résultat
    if (showingAnswer) {
        textSize(28);
        textAlign(CENTER, CENTER);
        
        let resultY = uiY + 100;
        
        if (answerWasCorrect) {
            fill(0, 200, 0); // Vert
            if (gameMode === "intervals") {
                let intervalInfo = getIntervalName(int(currentInterval));
                text('✓ CORRECT! ' + intervalInfo.fr, width / 2, resultY);
            } else if (gameMode === "degrees") {
                if (currentDegree === 0) {
                    text('✓ CORRECT! Degré 1 (unisson)', width / 2, resultY);
                } else {
                    let degreeNum = Math.abs(currentDegree);
                    if (degreeNum === 1) {
                        text('✓ CORRECT! Octave', width / 2, resultY);
                    } else {
                        text('✓ CORRECT! Degré ' + degreeNum, width / 2, resultY);
                    }
                }
            } else if (gameMode === "notes") {
                text('✓ CORRECT! ' + currentTargetNoteName, width / 2, resultY);
            }
        } else {
            fill(200, 0, 0); // Rouge
            text('✗ ERREUR! Réponse: ' + targetNote, width / 2, resultY);
        }
        
        // Instructions pour continuer
        fill(100);
        textSize(16);
        text('Pressez ESPACE pour continuer', width / 2, resultY + 50);
    }
}

function getIntervalName(semitones) {
    const intervals = {
        0: { fr: 'unisson', code: 'P1' },
        1: { fr: 'seconde mineure', code: 'm2' },
        2: { fr: 'seconde majeure', code: 'M2' },
        3: { fr: 'tierce mineure', code: 'm3' },
        4: { fr: 'tierce majeure', code: 'M3' },
        5: { fr: 'quarte juste', code: 'P4' },
        6: { fr: 'triton', code: 'TT' },
        7: { fr: 'quinte juste', code: 'P5' },
        8: { fr: 'sixte mineure', code: 'm6' },
        9: { fr: 'sixte majeure', code: 'M6' },
        10: { fr: 'septième mineure', code: 'm7' },
        11: { fr: 'septième majeure', code: 'M7' },
        12: { fr: 'octave', code: 'P8' }
    };
    
    // Pour les intervalles négatifs, afficher le nom de l'intervalle ascendant équivalent
    if (semitones < 0) {
        let positiveSemitones = Math.abs(semitones) % 12;
        // Cas spécial: -12 est une octave, pas unisson
        if (Math.abs(semitones) % 12 === 0 && Math.abs(semitones) > 0) {
            positiveSemitones = 12;
        }
        let baseInterval = intervals[positiveSemitones] || { fr: 'Unknown', code: '?' };
        return baseInterval;
    }
    
    return intervals[semitones % 12] || { fr: 'Unknown', code: '?' };
}

function drawVisualFeedback() {
    if (!gameStarted || !gameMode) return;
    
    let startFretWidth = guitar.neckWidth / guitar.fretCount;
    let stringHeight = guitar.neckHeight / (guitar.stringCount - 1);
    
    // Afficher un cercle autour de la sélection de l'utilisateur
    if (userSelectedPosition && showingAnswer) {
        let x = guitar.neckX + userSelectedPosition.fret * startFretWidth - (startFretWidth / 2);
        let y = guitar.neckY + userSelectedPosition.string * stringHeight;
        
        push();
        noFill();
        stroke(0);
        strokeWeight(3);
        ellipse(x, y, guitar.noteMarkerDiameter * 1.5, guitar.noteMarkerDiameter * 1.5);
        pop();
    }
    
    // Afficher la position correcte en vert si la réponse est incorrecte
    if (showingAnswer && !answerWasCorrect && correctNotePosition) {
        let x = guitar.neckX + correctNotePosition.fret * startFretWidth - (startFretWidth / 2);
        let y = guitar.neckY + correctNotePosition.string * stringHeight;
        
        push();
        fill(0, 255, 0, 100); // Vert semi-transparent
        noStroke();
        ellipse(x, y, guitar.noteMarkerDiameter * 1.2, guitar.noteMarkerDiameter * 1.2);
        
        // Bordure verte
        noFill();
        stroke(0, 255, 0);
        strokeWeight(2);
        ellipse(x, y, guitar.noteMarkerDiameter * 1.4, guitar.noteMarkerDiameter * 1.4);
        pop();
    }
}