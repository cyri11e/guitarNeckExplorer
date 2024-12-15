class Guitar{
    constructor(fretCount){
        this.neckX = 50; // offset
        this.neckY = 20;
        this.fretCount = fretCount;
        this.stringCount = 6;

        this.canvasWidth = windowWidth;
        this.canvasHeight = windowHeight;
        this.neckWidth = 12/14*this.canvasWidth;
        this.neckHeight = this.canvasWidth/6
        this.markerDiameter = this.neckHeight/10
        this.noteMarkerDiameter = this.neckHeight/5 // Diamètre des pastilles de note
        this.textSize = 0.8*this.noteMarkerDiameter
        this.markerPositions = [3, 5, 7, 9, 12];
        this.openStringNotes = ['E', 'A', 'D', 'G', 'B', 'E'];
        this.stringThickness = [1, 1.5, 2, 2.5, 3, 4]; // Épaisseurs des cordes du Mi aigu au Mi grave
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        this.hoveredNote = null;
        this.clickedNote = null;
        this.playedNoteName = null;
        this.clickedNotes =[]
        this.midiPlayedNotes = []
        this.octaveMode = false
        this.tonic = null

        this.noteColors = [
            color(255, 20, 20),          // Do (C) - Rouge
            color(255, 82, 90),        // Do# (C#) / Réb (Db) - Intermédiaire entre rouge et orange
            color(255, 165, 10),        // Ré (D) - Orange
            color(255, 210, 10),        // Ré# (D#) / Mib (Eb) - Intermédiaire entre orange et jaune
            color(200, 200, 10),        // Mi (E) - Jaune
            color(144, 238, 144),      // Fa (F) - Vert clair
            color(72, 169, 127),       // Fa# (F#) / Solb (Gb) - Intermédiaire entre vert clair et bleu
            color(20, 40, 255),          // Sol (G) - Bleu
            color(68, 103, 192),       // Sol# (G#) / Lab (Ab) - Intermédiaire entre bleu et indigo
            color(75, 10, 130),         // La (A) - Indigo
            color(111, 21, 168),       // La# (A#) / Sib (Bb) - Intermédiaire entre indigo et violet
            color(148, 10, 211)         // Si (B) - Violet foncé
          ];
          this.anim =this.fade(10)

    }

    fade(speed) {
        let value = speed > 0 ? 0 : 100; // Initialiser en fonction de la direction de l'animation
        if (!speed) speed = 1; // Utiliser la valeur par défaut si non spécifiée
        return () => {
            if (speed > 0 && value < 100) {
                value += speed;
            } else if (speed < 0 && value > 0) {
                value += speed;
            }
            return value;
        };
    }
    
    setMidiNotes(notes){
        console.log('recu',notes)
        this.midiPlayedNotes = notes
    }

    setPlayedNote(note){
        //console.log('recu',note)
        this.playedNoteName = {note :note} 
    }

    resize(){
        this.canvasWidth = windowWidth;
        this.canvasHeight = windowHeight;
        this.neckWidth = 12/14*this.canvasWidth;
        this.neckHeight = this.canvasWidth/6
        this.markerDiameter = this.neckHeight/10
        this.noteMarkerDiameter = this.neckHeight/5 // Diamètre des pastilles de note
        this.textSize = this.noteMarkerDiameter
   }

    display() {
        background(220);
      
        // Dessiner le manche de la guitare
        this.drawNeckBackground();
      
       // Dessiner les cordes avec des épaisseurs différentes
        this.drawStrings();
           
        // Dessiner les marqueurs de position pour les cases 3, 5, 7, 9 et 12
        this.drawMarkers();
      
        // Ajouter les noms des cordes à vide
        this.drawOpenNotes();
        
        // Dessiner les notes selectionées
        this.drawSelectedNotes();
        
        // afficher la note jouée
        this.drawPlayedNotes();
        
        // Dessiner la note survolée et ses variantes
        this.drawHoveredNote();
        
    }

    drawNeckBackground() {
        fill(89, 69, 19); // Couleur marron pour le manche
        rect(this.neckX, this.neckY, this.neckWidth, this.neckHeight);

        // Dessiner le sillet
        fill(0); // Couleur noire pour le sillet
        rect(this.neckX - 5, this.neckY, 5, this.neckHeight);

        // Dessiner les frettes avec un effet métallique
        for (let i = 0; i <= this.fretCount; i++) {
            let x = this.neckX + i * (this.neckWidth / this.fretCount);
            let gradient = drawingContext.createLinearGradient(x, this.neckY, x + (this.neckWidth / this.fretCount), this.neckY + this.neckHeight);
            gradient.addColorStop(0, '#D3D3D3'); // Gris clair
            gradient.addColorStop(0.5, '#FFFFFF'); // Blanc pour le reflet
            gradient.addColorStop(1, '#A9A9A9'); // Gris foncé
            drawingContext.fillStyle = gradient;
            rect(x, this.neckY, 2, this.neckHeight);
        }
    }

    drawPlayedNotes() {
        if (this.playedNoteName != null) {
            let noteColor;
            if (this.tonic)
                noteColor = this.noteColors[this.calculeDegreeChromatique(this.tonic, this.playedNoteName)];
            else
                noteColor = 'red';
            if (noteColor)
                fill(color(noteColor));
            this.drawAllOccurrences(this.playedNoteName, true);
        }

        for ( let midiPlayedNote of this.midiPlayedNotes){
            let noteColor;
            if (this.tonic)
                noteColor = this.noteColors[this.calculeDegreeChromatique(this.tonic, midiPlayedNote)];
            else
                noteColor = 'red';
            if (noteColor)
                fill(color(noteColor));
            this.drawAllOccurrences(midiPlayedNote, true);
        }

    }

    drawHoveredNote() {
        if (this.hoveredNote) {
            let noteColor;
            if (this.tonic)
                noteColor = this.noteColors[this.calculeDegreeChromatique(this.tonic, this.hoveredNote)];

            else
                noteColor = 'red';
            fill(color(noteColor));

            if (this.octaveMode)
                this.drawAllOctaves(this.hoveredNote, null, true);

            else
                this.drawAllOccurrences(this.hoveredNote, null, true);

        }
    }

    drawSelectedNotes() {
        for (let note of this.clickedNotes) {
            let noteColor;
            if (this.getNoteName(note.note) === this.getNoteName(this.tonic.note))
                noteColor = 'red';

            else
                noteColor = this.noteColors[this.calculeDegreeChromatique(this.tonic, note)];

            fill(color(noteColor)); //  opaque
            this.drawNoteOnFretboard(note.note, note.string, note.fret);
        }
    }

    drawOpenNotes() {
        fill(0);
        textSize(this.textSize);
        textAlign(CENTER, CENTER);
        for (let i = 0; i < this.stringCount; i++) {
            let y = this.neckY + i * (this.neckHeight / (this.stringCount - 1));
            text(this.openStringNotes[this.stringCount - 1 - i], this.neckX - 20, y);
        }
    }

    drawMarkers() {
        fill(200);
        noStroke();
        for (let i of this.markerPositions) {
            let x = this.neckX + i * (this.neckWidth / this.fretCount) - (this.neckWidth / this.fretCount) / 2;
            if (i === 12) {
                ellipse(x, this.neckY + this.neckHeight / 3, this.markerDiameter, this.markerDiameter);
                ellipse(x, this.neckY + 2 * this.neckHeight / 3, this.markerDiameter, this.markerDiameter);
            } else {
                ellipse(x, this.neckY + this.neckHeight / 2, this.markerDiameter, this.markerDiameter);
            }
        }
    }

    drawStrings() {
        for (let i = 0; i < this.stringCount; i++) {
            let y = this.neckY + i * (this.neckHeight / (this.stringCount - 1));
            { // Appliquer l'effet métallique 
                let gradient = drawingContext.createLinearGradient(this.neckX, y, this.neckX + this.neckWidth, y);
                gradient.addColorStop(0, '#C0C0C0'); // Argenté
                gradient.addColorStop(0.5, '#FFFFFF'); // Blanc pour le reflet
                gradient.addColorStop(1, '#808080'); // Gris foncé
                drawingContext.fillStyle = gradient;
                noStroke();
                rect(this.neckX, y - this.stringThickness[i] / 2, this.neckWidth, this.stringThickness[i]);
            }
        }
    }

    getNoteCoordinates(note) {
        let coordinates = [];
        let openStringOctaves = [4, 3, 3, 3, 2, 2]; // Octaves des cordes à vide du Mi aigu au Mi grave
     
        for (let stringIndex = 0; stringIndex < this.stringCount; stringIndex++) {
          let openNoteIndex = this.noteNames.indexOf(this.openStringNotes[this.stringCount - 1 - stringIndex]);
          for (let fretIndex = 0; fretIndex <= this.fretCount; fretIndex++) {
            let noteIndex = (openNoteIndex + fretIndex) % this.noteNames.length;
            let octave = openStringOctaves[stringIndex] + Math.floor((openNoteIndex + fretIndex) / this.noteNames.length);

            if (this.noteNames[noteIndex] + octave === note) {
              coordinates.push({ string: stringIndex, fret: fretIndex });
            }
          }
        }
        return coordinates;
      }
    
    getNoteName(noteString) {
        // Cette fonction extrait le nom de la note sans l'octave à partir d'une chaîne de caractères
        let match = noteString.match(/([A-G]#?)/);
        return match ? match[1] : null;
      }     
      
    getOctavesCoordinates(note) {
        let coordinates = [];
        
        for (let stringIndex = 0; stringIndex < this.stringCount; stringIndex++) {
          let openNoteIndex = this.noteNames.indexOf(this.openStringNotes[this.stringCount - 1 - stringIndex]);
          for (let fretIndex = 0; fretIndex <= this.fretCount; fretIndex++) {
            let noteIndex = (openNoteIndex + fretIndex) % this.noteNames.length;
     
            if (this.noteNames[noteIndex] === note) {
              coordinates.push({ string: stringIndex, fret: fretIndex });
            }
          }
        }
        return coordinates;
      }

    getNoteFromCoordinates(string, fret) {
        let openStringOctaves = [4, 3, 3, 3, 2, 2]; // Octaves des cordes à vide du Mi aigu au Mi grave
        let openNoteIndex = this.noteNames.indexOf(this.openStringNotes[this.stringCount - 1 - string]);
        let noteIndex = (openNoteIndex + fret) % this.noteNames.length;
        let octave = openStringOctaves[string] + Math.floor((openNoteIndex + fret) / this.noteNames.length);
        return this.noteNames[noteIndex] + octave;
    }
      

    
    
    getNoteIndex(note) {
      const notesOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      if (note.note) {
          const noteName = note.note.match(/[A-G]#?/)[0]; // Extraire le nom de la note sans l'octave
          const octave = parseInt(note.note.match(/\d+/)[0]); // Extraire l'octave
          return notesOrder.indexOf(noteName) + (octave * 12);
      } else return 0

    }
    
    calculateSemitoneDistance(note1, note2) {
      const note1Index = this.getNoteIndex(note1);
      const note2Index = this.getNoteIndex(note2);
      return (note2Index - note1Index) % 12; // Distance en demi-tons dans les 12 degrés chromatiques
    }
    
    calculeDegreeChromatique(tonic, note) {
      if (tonic){
          const semitoneDistance = this.calculateSemitoneDistance(tonic, note);
          return (semitoneDistance + 12) % 12; // Assure que le résultat est toujours positif
      } else 
        return 0
    }
    
    chromaticToDiatonic(degreeChromatic) {
        const conversionTable = {
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
            11: '7'
        };
    
        return conversionTable[degreeChromatic % 12];
    }

    // AFFICHAGE
    animated(drawFunction,targetDiameter,growthRate) {
        if (diameter < targetDiameter) {
            diameter += growthRate;
            drawFunction(circleX, circleY, diameter, fillColor);
        } else {
            diameter = targetDiameter; // Fixer la taille au diamètre cible
        }
    }

    drawNoteOnFretboard(note, string, fret, vibre, hover) {
        // Couleur doit etre definie avant l'appel
        push()
        noStroke();
        let x = fret === 0 ? this.neckX - 20 : this.neckX + fret * (this.neckWidth / this.fretCount) - (this.neckWidth / this.fretCount) / 2;
        let y = this.neckY + string * (this.neckHeight / (this.stringCount - 1));
        let pulse, noteLabel

        if (vibre){
            stroke(255); // Définir la couleur du pourtour en blanc 
            strokeWeight(2); // Définir l'épaisseur du pourtour
            pulse = sin(frameCount*0.8) * 3
        }
        else {
            noStroke()
            pulse = 0
        }

        let offset = 0
        let hoverPulse = 0
        if (hover){
            hoverPulse = sin(frameCount*0.1) * 2
            offset =  5
            push()
            fill(40,100)
            ellipse(x+offset-hoverPulse, y+offset-hoverPulse, 2*this.noteMarkerDiameter , this.noteMarkerDiameter );
            pop()
            ellipse(x-offset, y-offset+hoverPulse, 2*this.noteMarkerDiameter , this.noteMarkerDiameter );
        
        } else      
            ellipse(x, y, 2*this.noteMarkerDiameter +pulse, this.noteMarkerDiameter + pulse);
        
        textSize(this.textSize);
        textAlign(CENTER, CENTER);
        blendMode(BLEND);
        noStroke()
        fill(25); // Couleur grise pour l ombre
        if (this.degreMode)
            noteLabel = this.chromaticToDiatonic(this.calculeDegreeChromatique(this.tonic,{note : note}),)
        else
            noteLabel = note

        text(noteLabel, x+2-offset, y+2-offset+hoverPulse);
        fill(255); // Couleur blanche pour le texte
        text(noteLabel, x-offset, y-offset+hoverPulse);
        
        pop()
      }

      drawAllOccurrences(note, pulse, hover) {
        push()
        // Dessiner toutes les occurrences de la note
        noStroke();
        // Parcourir toutes les cordes et frettes pour dessiner les occurrences de la note
        for (let string = 0; string < this.stringCount; string++) {
          for (let fret = 0; fret < this.fretCount+1; fret++) {
            if (this.getNoteFromCoordinates(string, fret) === note.note) {
              this.drawNoteOnFretboard(note.note, string, fret, pulse, hover);          
            }
          }
        }
        pop()
      }

      drawAllOctaves(note, pulse, hover) {
        push()
        // Dessiner toutes les occurrences de la note
        noStroke();
        // Parcourir toutes les cordes et frettes pour dessiner les occurrences de la note
        for (let string = 0; string < this.stringCount; string++) {
          for (let fret = 0; fret < this.fretCount+1; fret++) {
            if (this.getNoteName(this.getNoteFromCoordinates(string, fret)) === this.getNoteName(note.note)) {
              this.drawNoteOnFretboard(this.getNoteFromCoordinates(string, fret), string, fret, pulse, hover);          
            }
          }
        }
        pop()
      }
    

    //  INTERACTIONS
    mouseMoved() {
        if (mouseX > this.neckX - this.neckWidth 
            && mouseX < this.neckX + this.neckWidth 
            && mouseY > this.neckY - this.neckHeight/10
            && mouseY < this.neckY + this.neckHeight+ this.neckHeight/10) {
          let fretWidth = this.neckWidth / this.fretCount;
          let stringHeight = this.neckHeight / (this.stringCount - 1);
          let fret = Math.floor((mouseX - this.neckX + fretWidth ) / fretWidth);
          let string = Math.floor((mouseY - this.neckY + stringHeight / 2) / stringHeight);
          let note = this.getNoteFromCoordinates(string, fret);
          //console.log(string)

          if (fret > -1 )
              this.hoveredNote = { note, string, fret };
          else 
           this.hoveredNote = null;  
        } else {
          this.hoveredNote = null;
        }
      }  

      mousePressed() {
        if (this.hoveredNote) {
          let index = this.clickedNotes.findIndex(item => 
            item.note === this.hoveredNote.note 
          );
      
          if (index !== -1) {
            // Si la note est déjà dans le tableau, la supprimer
            this.clickedNotes.splice(index, 1);
            if (this.clickedNote && this.clickedNote.note === this.hoveredNote.note) {
              this.clickedNote = null;
            }
          } else {
            // Sinon, ajouter la note au tableau
            this.clickedNote = { note: this.hoveredNote.note, string: this.hoveredNote.string, fret: this.hoveredNote.fret };
            this.clickedNotes.push(this.clickedNote);
          }
        }
        if (this.clickedNotes.length>0) 
            this.tonic = this.clickedNotes[0]
        else 
            this.tonic = null
      }
      
      keyPressed(){
        // touche "O" changement de mode unisson / octave
        if (keyCode == 79) this.octaveMode = !this.octaveMode
        if (keyCode == 68) this.degreMode = !this.degreMode
        
        if (keyCode == 80) this.setPlayedNote ('C3')
      }

      keyReleased(){
        this.setPlayedNote(null)
      }


    
    
}
