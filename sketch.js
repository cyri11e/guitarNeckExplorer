let wH 
let wW 
let guitar

// Game variables
let gameStarted = false;
let gameMode = null; // "intervals", "degrees" ou "notes"
let difficultySelected = false; // La difficulté a-t-elle été sélectionnée ?
let useFlatMode = true; // true = bémols, false = dièses
let god_mode = false; // Affiche la pastille sous le curseur (mode debug)
let gameActive = true;
let gameStartTime = 0;
let questionDisplayTime = 0; // Temps d'affichage de la question
let startingNoteDisplayTime = 0; // Temps d'affichage de la note de départ
let score = 0;
let totalCorrectResponses = 0; // Nombre de réponses correctes
let responseTimes = []; // Array des temps de réponse (uniquement pour réponses correctes)
let questionsAnswered = 0; // Nombre de questions répondues
let sessionQuestions = 10; // Nombre de questions par session
let timeLimitSeconds = 3; // Limite de temps en secondes (par défaut: Normal 3s)
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
let showingQuestion = false; // La question est-elle affichée ?
let startingNoteVisible = false; // La note de départ est-elle visible ?
let timeoutOccurred = false; // Le temps a-t-il expiré ?
let displayTimeDelay = 1000
let nextTimeDelay = 1000 // Délai avant la question suivante
let answerDisplayTime = 0 // Moment où la réponse a été affichée
// Intervalle list (semitones) - incluant montées et descentes
const intervalList = [-12, -11, -10, -9, -8, -7, -5, -4, -3, -2, -1 ,0,1, 2, 3, 4, 5, 7, 8, 9, 10,11, 12];

// Intervalle par difficulté (en semitones)
const noobIntervals = [3, 4, 7, 11,12]; // b3, 3, 5, 8 - triades uniquement ascendant (sans unisson, sans triton)
const slowIntervals = [3, 4, 6, 7, 10, 11, 12, -3, -4, -6, -7, -10, -11, -12]; // +7ièmes ascendant/descendant
const normalIntervals = [ 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12]; // Pentato (sans unisson)
const expertIntervals = intervalList; // Tous les intervalles

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
        if (showingAnswer || timeoutOccurred) {
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
    // Écran d'accueil : choix du type de jeu
    if (!gameMode && !sessionEnded) {
        let buttonY = height / 2 + 50;
        let buttonWidth = 120;
        let buttonHeight = 50;
        
        // Bouton 1 - Intervalles
        if (mouseX > width / 2 - 200 - buttonWidth / 2 && mouseX < width / 2 - 200 + buttonWidth / 2 &&
            mouseY > buttonY - buttonHeight / 2 && mouseY < buttonY + buttonHeight / 2) {
            gameMode = "intervals";
            useFlatMode = random() > 0.5;
            return false;
        }
        
        // Bouton 2 - Degrés
        if (mouseX > width / 2 - buttonWidth / 2 && mouseX < width / 2 + buttonWidth / 2 &&
            mouseY > buttonY - buttonHeight / 2 && mouseY < buttonY + buttonHeight / 2) {
            gameMode = "degrees";
            useFlatMode = random() > 0.5;
            return false;
        }
        
        // Bouton 3 - Notes
        if (mouseX > width / 2 + 200 - buttonWidth / 2 && mouseX < width / 2 + 200 + buttonWidth / 2 &&
            mouseY > buttonY - buttonHeight / 2 && mouseY < buttonY + buttonHeight / 2) {
            gameMode = "notes";
            useFlatMode = random() > 0.5;
            return false;
        }
    }
    
    // Écran de sélection de difficulté
    if (gameMode && !difficultySelected && !sessionEnded) {
        let buttonY = height / 2 + 50;
        let buttonWidth = 100;
        let buttonHeight = 50;
        let buttonsX = [width / 2 - 160, width / 2 - 50, width / 2 + 60, width / 2 + 170];
        let difficulties = [
            { label: 'NOOB', time: 10 },
            { label: 'SLOW', time: 5 },
            { label: 'NORMAL', time: 4 },
            { label: 'EXPERT', time: 2 }
        ];
        
        for (let i = 0; i < difficulties.length; i++) {
            if (mouseX > buttonsX[i] - buttonWidth / 2 && mouseX < buttonsX[i] + buttonWidth / 2 &&
                mouseY > buttonY - buttonHeight / 2 && mouseY < buttonY + buttonHeight / 2) {
                timeLimitSeconds = difficulties[i].time;
                difficultySelected = true;
                gameStarted = true;
                startNewQuestion();
                return false;
            }
        }
    }
    
    // Écran de fin : recommencer
    if (sessionEnded) {
        let restartButtonY = height / 2 + 120;
        let restartButtonWidth = 150;
        let restartButtonHeight = 50;
        
        if (mouseX > width / 2 - restartButtonWidth / 2 && mouseX < width / 2 + restartButtonWidth / 2 &&
            mouseY > restartButtonY - restartButtonHeight / 2 && mouseY < restartButtonY + restartButtonHeight / 2) {
            // Réinitialiser le jeu
            gameMode = null;
            difficultySelected = false;
            gameStarted = false;
            sessionEnded = false;
            score = 0;
            responseTimes = [];
            totalCorrectResponses = 0;
            questionsAnswered = 0;
            return false;
        }
    }
    
    // Jeu normal
    if (!gameActive || !gameMode || showingAnswer || !startingNoteVisible) return false;
    
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
                // Tracker le temps uniquement pour les bonnes réponses
                let responseTime = millis() - startingNoteDisplayTime;
                responseTimes.push(responseTime);
                totalCorrectResponses++;
            } else {
                answerWasCorrect = false;
            }
            
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
            // Mode Intervalles - filtrer selon la difficulté
            let allowedIntervals;
            if (timeLimitSeconds === 10) { // NOOB
                allowedIntervals = noobIntervals;
            } else if (timeLimitSeconds === 5) { // SLOW
                allowedIntervals = slowIntervals;
            } else if (timeLimitSeconds === 4) { // NORMAL
                allowedIntervals = normalIntervals;
            } else { // EXPERT (1s)
                allowedIntervals = expertIntervals;
            }
            currentInterval = random(allowedIntervals);
            targetNote = calculateTargetNote(startingNote, currentInterval);
        } else if (gameMode === "degrees") {
            // Mode Degrés - utiliser les intervalles pour pouvoir exprimer b3 et b5
            // IMPORTANT: en mode degrees, on n'utilise que les intervalles POSITIFS
            // (un 2 descendant n'est pas un b7, c'est un 2 descendant)
            let allowedIntervals;
            if (timeLimitSeconds === 10) { // NOOB - b3, 3, 5, 8 (triades ascendantes, sans unisson, sans triton)
                allowedIntervals = [3, 4, 7, 12];
            } else if (timeLimitSeconds === 5) { // SLOW - +7ièmes ascendant seulement
                allowedIntervals = [3, 4, 6, 7, 10, 11, 12,-3, -4, -6, -7, -10, -11, -12];
            } else if (timeLimitSeconds === 4) { // NORMAL - pentato ascendant seulement
                allowedIntervals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            } else { // EXPERT
                allowedIntervals = intervalList;
            }
            let randomInterval = random(allowedIntervals);
            targetNote = calculateTargetNote(startingNote, randomInterval);
            // Convertir l'intervalle en degré pour l'affichage
            currentDegree = randomInterval;
        } else if (gameMode === "notes") {
            // Mode Notes - note aléatoire basée sur la difficulté
            // Utiliser intervalles ascendants ET descendants pour avoir UP, DOWN et FIND
            let allowedIntervals;
            if (timeLimitSeconds === 10) { // NOOB - triades ascendantes uniquement
                allowedIntervals = [3, 4, 7, 12];
            } else if (timeLimitSeconds === 5) { // SLOW - +7ièmes ascendant/descendant
                allowedIntervals = [3, 4, 6, 7, 10, 11, 12, -3, -4, -6, -7, -10, -11, -12];
            } else if (timeLimitSeconds === 3) { // NORMAL - pentato ascendant/descendant
                allowedIntervals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, -1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12];
            } else { // EXPERT
                allowedIntervals = intervalList;
            }
            let randomInterval = random(allowedIntervals);
            targetNote = calculateTargetNote(startingNote, randomInterval);
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
    timeoutOccurred = false;
    showingQuestion = true; // La question est affichée
    startingNoteVisible = false; // La note de départ n'est pas encore visible
    answerDisplayTime = 0; // Réinitialiser le temps d'affichage de la réponse
    
    questionDisplayTime = millis(); // Enregistrer le temps d'affichage de la question
    
    // Configurer le guitar pour afficher la pastille correctement
    guitar.startingNotePosition = startingNotePosition; // Passer la position de départ
    guitar.startingNoteVisible = false; // La note de départ n'est pas visible au début
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
    
    // === LOGS DE DEBUG ===
    console.log('=== NOUVELLE QUESTION ===');
    console.log('Difficulté:', timeLimitSeconds + 's', '(' + ['NOOB', 'SLOW', 'NORMAL', 'EXPERT'][[10, 5, 3, 1].indexOf(timeLimitSeconds)] + ')');
    console.log('Mode:', gameMode.toUpperCase());
    console.log('Question #' + (questionsAnswered + 1) + '/' + sessionQuestions);
    console.log('');
    console.log('📍 NOTE DE DÉPART:', startingNote, 'String', startingNotePosition.string, 'Fret', startingNotePosition.fret);
    
    if (gameMode === "intervals") {
        console.log('📊 INTERVALLE:', currentInterval, 'semitones (' + getIntervalName(currentInterval).fr + ')');
    } else if (gameMode === "degrees") {
        console.log('📊 DEGRÉ:', currentDegree, 'semitones (' + getDegreeName(currentDegree) + ')');
    } else if (gameMode === "notes") {
        console.log('📊 NOTE À TROUVER:', currentTargetNoteName);
    }
    
    console.log('🎯 RÉPONSE ATTENDUE:', targetNote);
    if (correctNotePosition) {
        console.log('   Position: String', correctNotePosition.string, 'Fret', correctNotePosition.fret);
    }
    console.log('');
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
        // Écran d'accueil avec choix du type de jeu
        fill(0);
        textSize(48);
        textAlign(CENTER, CENTER);
        text('The KYN Game', width / 2, height / 2 - 100);
        
        textSize(32);
        text('Know Your Neck !', width / 2, height / 2 - 50);
        
        textSize(24);
        text('Sélectionnez votre type de jeu', width / 2, height / 2 - 10);
        
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
    
    if (gameMode && !difficultySelected) {
        // Écran de sélection de difficulté
        fill(0);
        textSize(48);
        textAlign(CENTER, CENTER);
        text('The KYN Game', width / 2, height / 2 - 100);
        
        textSize(32);
        text('Know Your Neck !', width / 2, height / 2 - 50);
        
        textSize(24);
        text('Sélectionnez votre niveau de difficulté', width / 2, height / 2 - 10);
        
        // Boutons de difficulté
        let buttonY = height / 2 + 50;
        let buttonWidth = 100;
        let buttonHeight = 50;
        let buttonsX = [width / 2 - 160, width / 2 - 50, width / 2 + 60, width / 2 + 170];
        let difficulties = [
            { label: 'NOOB', time: '10s' },
            { label: 'SLOW', time: '5s' },
            { label: 'NORMAL', time: '4s' },
            { label: 'EXPERT', time: '2s' }
        ];
        
        for (let i = 0; i < difficulties.length; i++) {
            fill(0, 100, 200);
            rect(buttonsX[i] - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight);
            fill(255);
            textSize(16);
            text(difficulties[i].label, buttonsX[i], buttonY - 10);
            textSize(12);
            text(difficulties[i].time, buttonsX[i], buttonY + 12);
        }
        
        return;
    }
    
    // Écran de fin de session
    if (sessionEnded) {
        fill(0);
        textSize(48);
        textAlign(CENTER, CENTER);
        text('Session terminée!', width / 2, height / 2 - 100);
        
        textSize(32);
        text('Score: ' + score + '/' + sessionQuestions, width / 2, height / 2 - 20);
        
        // Afficher la moyenne ou le message "Prends ton temps"
        let percentageScore = (score / sessionQuestions) * 10;
        if (percentageScore >= 8) {
            let averageTimeMs = 0;
            if (totalCorrectResponses > 0) {
                averageTimeMs = responseTimes.reduce((a, b) => a + b, 0) / totalCorrectResponses;
            }
            let averageTime = averageTimeMs / 1000;
            text('Temps moyen: ' + averageTime.toFixed(1) + 's', width / 2, height / 2 + 30);
        } else {
            fill(150, 0, 0);
            textSize(28);
            text('Prends ton temps', width / 2, height / 2 + 30);
            fill(0);
            textSize(16);
            text('(Score trop faible pour afficher le temps)', width / 2, height / 2 + 60);
        }
        
        // Bouton Recommencer
        let restartButtonY = height / 2 + 120;
        let restartButtonWidth = 150;
        let restartButtonHeight = 50;
        
        fill(0, 150, 0);
        rect(width / 2 - restartButtonWidth / 2, restartButtonY - restartButtonHeight / 2, restartButtonWidth, restartButtonHeight);
        fill(255);
        textSize(20);
        text('Recommencer', width / 2, restartButtonY);
        
        return;
    }
    
    // Pendant le jeu
    let uiY = guitar.neckY + guitar.neckHeight + 80;
    
    // Vérifier si 2 secondes se sont écoulées depuis l'affichage de la question
    let timeSinceQuestionDisplay = millis() - questionDisplayTime;
    if (timeSinceQuestionDisplay >= displayTimeDelay && !startingNoteVisible) {
        startingNoteVisible = true;
        startingNoteDisplayTime = millis(); // Enregistrer le temps de début du countdown
        guitar.startingNoteVisible = true; // Afficher la note de départ
    }
    
    // Calculer le temps restant du countdown
    let timeElapsedSinceStart = millis() - startingNoteDisplayTime;
    let timeRemaining = timeLimitSeconds * 1000 - timeElapsedSinceStart;
    
    // Vérifier si le temps a expiré
    if (timeRemaining <= 0 && !showingAnswer && startingNoteVisible && !timeoutOccurred) {
        showingAnswer = true;
        timeoutOccurred = true;
        answerWasCorrect = false;
        questionsAnswered++;
        
        // Afficher la position correcte sur le manche
        if (correctNotePosition) {
            guitar.setPlayedNote([targetNote]);
        }
    }
    
    // Afficher les informations de la question
    fill(0);
    textAlign(CENTER, TOP);
    
    if (gameMode === "intervals") {
        let intervalInfo = getIntervalName(int(currentInterval));
        let directionText = "";
        let codeText = "";
        let nameText = "";
        
        if (currentInterval === 0) {
            directionText = "FIND";
            codeText = "unisson";
        } else if (currentInterval > 0) {
            directionText = "UP";
            codeText = intervalInfo.code;
            nameText = intervalInfo.fr;
        } else {
            directionText = "DOWN";
            codeText = intervalInfo.code;
            nameText = intervalInfo.fr;
        }
        
        // Afficher DIRECTION CODE en gros
        textSize(70);
        textStyle(BOLD);
        text(directionText + ' ' + codeText, width / 2, uiY);
        
        // Afficher le nom de l'intervalle en plus petit si applicable
        if (nameText) {
            textSize(28);
            textStyle(NORMAL);
            text((directionText == "UP" ? 'Monte ' : 'Descends ') + 
                 (nameText == 'triton' ? "d'un " :"d'une ")
                  + nameText, width / 2, uiY + 80);
        }
    } else if (gameMode === "degrees") {
        let degreeInfo = getDegreeName(int(currentDegree));
        let directionText = "";
        
        if (currentDegree === 0) {
            directionText = "FIND";
        } else if (currentDegree > 0) {
            directionText = "UP " + degreeInfo;
        } else {
            directionText = "DOWN " + degreeInfo;
        }
        
        textSize(70);
        textStyle(BOLD);
        text(directionText, width / 2, uiY);
        
        textSize(28);
        textStyle(NORMAL);
        text( (currentDegree === 0 ? 'Trouve le meme ' : (currentDegree > 0 ? 'Monte à ' : 'Descends à '))  
                + degreeInfo, width / 2, uiY + 80);
        
    } else if (gameMode === "notes") {
        let startNoteName = startingNote.match(/[A-G]#?b?/)[0];
        let startOctave = parseInt(startingNote.match(/\d+/)[0]);
        let targetOctave = parseInt(targetNote.match(/\d+/)[0]);
        let directionText = "";
        
        // FIND seulement si c'est exactement la même note (même nom ET même octave)
        if (currentTargetNoteName === startNoteName && targetOctave === startOctave) {
            directionText = "FIND " + currentTargetNoteName;
        } else if (targetOctave > startOctave) {
            directionText = "UP " + currentTargetNoteName;
        } else if (targetOctave < startOctave) {
            directionText = "DOWN " + currentTargetNoteName;
        } else {
            // Même octave mais note différente
            directionText = "UP " + currentTargetNoteName;
        }
        
        textSize(70);
        textStyle(BOLD);
        text(directionText, width / 2, uiY);
    }
    
    // Afficher le score et le countdown
    text('Score: ' + score, width / 3,  40);
    
    // Afficher le countdown si la note de départ est visible
    if (startingNoteVisible && !showingAnswer) {
        let secondsRemaining = max(0, timeRemaining / 1000);
        if (secondsRemaining > 2) {
            fill(0);
        } else if (secondsRemaining > 1) {
            fill(200, 150, 0);
        } else {
            fill(200, 0, 0);
        }
        textSize(40);
        text(secondsRemaining.toFixed(1) + 's',100, uiY + 40);
    }
    
    // Message de résultat
    if (showingAnswer) {
        // Enregistrer le moment où la réponse est affichée (première fois seulement)
        if (answerDisplayTime === 0) {
            answerDisplayTime = millis();
        }
        
        textSize(100);
        textStyle(BOLD)
        textAlign(CENTER, CENTER);
        
        let resultY = 200;
        
        if (answerWasCorrect) {
            fill(0, 200, 0); // Vert
                text('✓ CORRECT! ' , width / 2, resultY);
        } else {
            fill(200, 0, 0); // Rouge
            if (timeoutOccurred) {
                text('✗ 🕑! ' , width / 2, resultY);
            } else {
                text('✗' , width / 2, resultY);
            }
        }
        
        // Vérifier si le délai d'auto-progression est passé
        let timeSinceAnswerDisplay = millis() - answerDisplayTime;
        if (timeSinceAnswerDisplay >= nextTimeDelay) {
            // Auto-progression
            if (questionsAnswered < sessionQuestions) {
                startNewQuestion();
            } else {
                sessionEnded = true;
            }
        }
        
        // Instructions pour continuer
        fill(100);
        textSize(16);
        let remainingTime = nextTimeDelay - timeSinceAnswerDisplay;
        //text('Prochaine question dans ' + max(0, (remainingTime / 1000).toFixed(1)) + 's', width / 2, resultY + 50);
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
    
    // Cas spécial: 12 et -12 sont une octave, pas unisson
    if (semitones === 12 || semitones === -12) {
        return intervals[12];
    }
    
    // Pour les intervalles négatifs, afficher le nom de l'intervalle ascendant équivalent
    if (semitones < 0) {
        let positiveSemitones = Math.abs(semitones) % 12;
        let baseInterval = intervals[positiveSemitones] || { fr: 'Unknown', code: '?' };
        return baseInterval;
    }
    
    return intervals[semitones % 12] || { fr: 'Unknown', code: '?' };
}

function getDegreeName(semitones) {
    // Convertir les semitones en noms de degrés
    const degrees = {
        0: '1',
        1: 'b2',
        2: '2',
        3: 'b3',
        4: '3',
        5: '4',
        6: 'b5',
        7: '5',
        8: 'b6',
        9: '6',
        10: 'b7',
        11: '7',
        12: '1'
    };
    
    // Cas spécial pour 12 et -12 (octave = degré 1 une octave plus haut)
    if (semitones === 12 || semitones === -12) {
        return '1 (octave)';
    }
    
    // Pour les intervalles négatifs, on affiche juste le degré positif avec direction "grave"
    if (semitones < 0) {
        let positiveSemitones = Math.abs(semitones) % 12;
        return degrees[positiveSemitones] || 'Unknown';
    }
    
    return degrees[semitones % 12] || 'Unknown';
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