class HelpPopup {
    constructor() {
        this.isVisible = false;
        this.x = 0;
        this.y = 0;
        this.width = 500;
        this.height = 600;
        this.padding = 25;
        this.lineHeight = 35;
        
        this.shortcuts = [
            { key: 'H', desc: 'Afficher cette aide' },
            { key: '', desc: '' }, // Ligne vide
            { key: 'FLÈCHES', desc: 'Transposer les notes sélectionnées' },
            { key: '↑↓ + SHIFT', desc: 'Transposer sans toucher la tonique' },
            { key: '', desc: '' },
            { key: '1-8', desc: 'Sélectionner/désélectionner les intervalles' },
            { key: '', desc: '' },
            { key: '0', desc: 'Vider les intervalles sélectionnés' },
            { key: 'C/A', desc: 'Basculer accord Maj/min' },
            { key: 'S/G', desc: 'Basculer gamme Maj/min' },
            { key: 'P', desc: 'Basculer gamme pentatonique' },
            { key: 'T', desc: 'Basculer triade/tétrade' },
            { key: '', desc: '' },
            { key: 'D', desc: 'Basculer mode Note/Degrés/Blank/Tonic' },
            { key: 'B', desc: 'Basculer mode bémol/dièse' },
            { key: 'Z', desc: 'Basculer mode zoom' },
            { key: '', desc: '' },
            { key: 'L', desc: 'Basculer mode Note/Segment' },
            { key: 'BACKSPACE', desc: 'Supprimer dernière note / segment' },
            { key: 'DELETE', desc: 'Supprimer toutes les notes / segments' }
        ];
        
        this.closeButton = {
            x: 0,
            y: 0,
            w: 30,
            h: 30
        };
    }
    
    toggle() {
        this.isVisible = !this.isVisible;
        if (this.isVisible) {
            this.centerOnScreen();
        }
    }
    
    centerOnScreen() {
        this.x = (windowWidth - this.width) / 2;
        this.y = (windowHeight - this.height) / 2;
        
        // Limiter aux limites de l'écran
        this.x = constrain(this.x, 10, windowWidth - this.width - 10);
        this.y = constrain(this.y, 10, windowHeight - this.height - 10);
        
        // Mettre à jour la position du bouton fermer
        this.closeButton.x = this.x + this.width - 35;
        this.closeButton.y = this.y + 10;
    }
    
    display() {
        if (!this.isVisible) return;
        
        // Fond semi-transparent noir
        fill(30, 30, 30, 220);
        noStroke();
        rect(this.x, this.y, this.width, this.height, 8);
        
        // Bordure bleue brillante
        noFill();
        stroke(100, 180, 255);
        strokeWeight(3);
        rect(this.x, this.y, this.width, this.height, 8);
        strokeWeight(1);
        // Titre
        fill(100, 200, 255);
        textAlign(LEFT, TOP);
        textSize(20);
        textStyle(BOLD);
        text('RACCOURCIS CLAVIER', this.x + this.padding, this.y + this.padding);
        textStyle(NORMAL);
        
        // Ligne séparatrice
        stroke(100, 150, 200);
        strokeWeight(1);
        line(this.x + this.padding, this.y + this.padding + 32, 
             this.x + this.width - this.padding, this.y + this.padding + 32);
        
        // Bouton Fermer
        this.drawCloseButton();
        
        // Contenu du help
        let currentY = this.y + this.padding + 45;
        let leftColumn = this.x + this.padding;
        let rightColumn = this.x + this.width / 2 + 5;
        let maxWidth = this.width / 2 - this.padding * 1.5;
        strokeWeight(0.5);
        for (let i = 0; i < this.shortcuts.length; i++) {
            let shortcut = this.shortcuts[i];
            
            if (shortcut.key === '') {
                // Ligne vide
                currentY += this.lineHeight * 0.5;
                continue;
            }
            
            // Alterner les colonnes
            let col = i % 2;
            let drawX = col === 0 ? leftColumn : rightColumn;
            
            // Touche (en gras, couleur cyan)
            fill(0);
            strokeWeight(1);
            textAlign(LEFT, TOP);
            textSize(12);
            textStyle(BOLD);
            text(shortcut.key, drawX, currentY);
            strokeWeight(0.5);
            // Description (texte blanc plus clair)
            fill(230, 230, 230);
            textStyle(NORMAL);
            textSize(12);
            let descX = drawX + 80;
            text(shortcut.desc, descX, currentY, maxWidth - 80);
            
            // Avancer seulement si on est dans la colonne de droite
            if (col === 1) {
                currentY += this.lineHeight;
            }
        }
    }
    
    drawCloseButton() {
        // Bouton X
        let cx = this.closeButton.x + this.closeButton.w / 2;
        let cy = this.closeButton.y + this.closeButton.h / 2;
        
        // Fond du bouton
        fill(150, 50, 50, 180);
        stroke(200, 100, 100);
        strokeWeight(1);
        rect(this.closeButton.x, this.closeButton.y, this.closeButton.w, this.closeButton.h, 4);
        
        // Symbole X blanc brillant
        stroke(255, 255, 255);
        strokeWeight(3);
        line(cx - 8, cy - 8, cx + 8, cy + 8);
        line(cx + 8, cy - 8, cx - 8, cy + 8);
    }
    
    mousePressed() {
        if (!this.isVisible) return false;
        
        // Vérifier clic sur le bouton Fermer
        if (mouseX >= this.closeButton.x && mouseX <= this.closeButton.x + this.closeButton.w &&
            mouseY >= this.closeButton.y && mouseY <= this.closeButton.y + this.closeButton.h) {
            this.isVisible = false;
            return true;
        }
        
        // Vérifier clic dans la fenêtre (empêcher l'interaction avec la guitare)
        if (mouseX >= this.x && mouseX <= this.x + this.width &&
            mouseY >= this.y && mouseY <= this.y + this.height) {
            return true;
        }
        
        return false;
    }
}
