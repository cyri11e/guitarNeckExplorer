class SegmentModeControl {
    constructor(x, y, guitar) {
        this.x = x;
        this.y = y;
        this.guitar = guitar;
        
        // Dimensions du bouton principal (carré)
        this.mainButtonWidth = 45;
        this.mainButtonHeight = 45;
        
        // Mini-boutons de couleur (très compacts en grille 2 colonnes)
        this.colorButtonSize = 20;
        this.colorButtonSpacing = 22; // 20px + 2px gap
        this.miniButtonsX = this.x + this.mainButtonWidth + 10; // 65px depuis la gauche
        this.miniButtonsY = this.y; // Aligné en haut
        
        // Slider alpha (compact, hauteur = bouton)
        this.sliderWidth = 14;
        this.sliderHeight = this.mainButtonHeight *1.5; // 45px
        this.sliderX = this.miniButtonsX + this.colorButtonSpacing * 2 + 5; // Juste après les couleurs
        this.sliderY = this.y;
        this.alphaValue = 0.7; // Valeur par défaut
        this.sliderDragging = false;
        
        // Couleurs disponibles (synchronisées avec guitar.segmentColor)
        this.colors = [
            { hex: '#0080ff', name: 'Bleu' },
            { hex: '#f700ff', name: 'Magenta' },
            { hex: '#1eff00', name: 'Vert' },
            { hex: '#fe0303', name: 'Rouge' },
            { hex: '#fafe03', name: 'Jaune' },
            { hex: '#ff8000', name: 'Orange' }
        ];
        
        this.selectedColorIndex = this.guitar.segmentColorIndex;
        this.showColorPicker = false;
        this.updateGuitarSegmentColor(); // Initialiser
    }
    
    display() {
        // Dessiner le bouton principal avec icône
        this.drawMainButton();
        
        // Afficher les mini-boutons et le slider seulement en mode segment
        if (this.guitar.segmentMode) {
            this.drawColorButtons();
            this.drawAlphaSlider();
        }
    }
    
    drawMainButton() {
        let bgColor;
        if (this.guitar.segmentMode) {
            // En mode segment, fond basé sur la couleur sélectionnée
            let col = this.colors[this.selectedColorIndex];
            let hex = col.hex.substring(1); // Enlever le #
            let r = parseInt(hex.substring(0, 2), 16);
            let g = parseInt(hex.substring(2, 4), 16);
            let b = parseInt(hex.substring(4, 6), 16);
            bgColor = color(r, g, b, 220);
        } else {
            bgColor = color(160, 160, 160, 220);
        }
        
        // Dessiner le bouton arrondi
        fill(bgColor);
        stroke(100);
        strokeWeight(1);
        rect(this.x, this.y, this.mainButtonWidth, this.mainButtonHeight, 6);
        
        // Dessiner l'icône Unicode (note ou crayon)
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(24);
        
        if (this.guitar.segmentMode) {
            text('🖌️', this.x + this.mainButtonWidth / 2, this.y + this.mainButtonHeight / 2);
        } else {
            text('🎵', this.x + this.mainButtonWidth / 2, this.y + this.mainButtonHeight / 2);
        }
    }
    
    drawMusicalNoteIcon() {
        // Utilise le symbole Unicode ♪
        // Dessin supprimé - utilise textSize et Unicode
    }
    
    drawBrushIcon() {
        // Utilise le symbole Unicode ✎
        // Dessin supprimé - utilise textSize et Unicode
    }
    
    drawColorButtons() {
        // Layout en grille 2 colonnes pour les 6 couleurs
        // Colonne 0: indices 0, 2, 4 (Bleu, Vert, Jaune)
        // Colonne 1: indices 1, 3, 5 (Magenta, Rouge, Orange)
        
        const colorLayout = [
            { index: 0, col: 0, row: 0 }, // Bleu
            { index: 1, col: 1, row: 0 }, // Magenta
            { index: 2, col: 0, row: 1 }, // Vert
            { index: 3, col: 1, row: 1 }, // Rouge
            { index: 4, col: 0, row: 2 }, // Jaune
            { index: 5, col: 1, row: 2 }  // Orange
        ];
        
        for (let item of colorLayout) {
            let col = this.colors[item.index];
            let isSelected = (item.index === this.selectedColorIndex);
            
            // Convertir hex en RGB
            let hex = col.hex.substring(1);
            let r = parseInt(hex.substring(0, 2), 16);
            let g = parseInt(hex.substring(2, 4), 16);
            let b = parseInt(hex.substring(4, 6), 16);
            
            // Position en grille
            let bx = this.miniButtonsX + item.col * this.colorButtonSpacing;
            let by = this.miniButtonsY + item.row * this.colorButtonSpacing;
            
            // Dessiner le bouton
            if (isSelected) {
                fill(r, g, b, 255);
                stroke(255);
                strokeWeight(2);
            } else {
                fill(r, g, b, 200);
                stroke(100);
                strokeWeight(1);
            }
            rect(bx, by, this.colorButtonSize, this.colorButtonSize, 2);
            
            // Croix au centre si sélectionné
            if (isSelected) {
                stroke(255);
                strokeWeight(1.5);
                let cx = bx + this.colorButtonSize / 2;
                let cy = by + this.colorButtonSize / 2;
                let s = 5;
                line(cx - s, cy - s, cx + s, cy + s);
                line(cx + s, cy - s, cx - s, cy + s);
            }
        }
    }
    
    drawAlphaSlider() {
        // Cadre du slider compact
        fill(40);
        stroke(80);
        strokeWeight(1);
        rect(this.sliderX, this.sliderY, this.sliderWidth, this.sliderHeight, 2);
        
        // Curseur du slider
        let cursorY = this.sliderY + (1 - this.alphaValue) * this.sliderHeight;
        fill(100, 150, 255);
        noStroke();
        ellipse(this.sliderX + this.sliderWidth / 2, cursorY, 8);
    }
    
    mousePressed() {
        // Clic sur le bouton principal
        if (this.isMouseOverMainButton()) {
            this.guitar.segmentMode = !this.guitar.segmentMode;
            return true;
        }
        
        // Clic sur les mini-boutons de couleur
        if (this.guitar.segmentMode) {
            // Layout en grille 2 colonnes pour les 6 couleurs
            const colorLayout = [
                { index: 0, col: 0, row: 0 }, // Bleu
                { index: 1, col: 1, row: 0 }, // Magenta
                { index: 2, col: 0, row: 1 }, // Vert
                { index: 3, col: 1, row: 1 }, // Rouge
                { index: 4, col: 0, row: 2 }, // Jaune
                { index: 5, col: 1, row: 2 }  // Orange
            ];
            
            for (let item of colorLayout) {
                let bx = this.miniButtonsX + item.col * this.colorButtonSpacing;
                let by = this.miniButtonsY + item.row * this.colorButtonSpacing;
                
                if (mouseX >= bx && mouseX <= bx + this.colorButtonSize &&
                    mouseY >= by && mouseY <= by + this.colorButtonSize) {
                    this.selectedColorIndex = item.index;
                    this.updateGuitarSegmentColor();
                    return true;
                }
            }
            
            // Clic sur le slider
            if (this.isMouseOverSlider()) {
                this.sliderDragging = true;
                this.updateAlphaFromMouse();
                return true;
            }
        }
        
        return false;
    }
    
    mouseDragged() {
        // Seulement si on drag le slider
        if (this.sliderDragging && this.isMouseOverSlider()) {
            this.updateAlphaFromMouse();
            return true;
        }
        return false;
    }
    
    mouseReleased() {
        this.sliderDragging = false;
    }
    
    isMouseOverMainButton() {
        return mouseX >= this.x && mouseX <= this.x + this.mainButtonWidth &&
               mouseY >= this.y && mouseY <= this.y + this.mainButtonHeight;
    }
    
    isMouseOverSlider() {
        return mouseX >= this.sliderX - 8 && mouseX <= this.sliderX + this.sliderWidth + 8 &&
               mouseY >= this.sliderY && mouseY <= this.sliderY + this.sliderHeight;
    }
    
    updateAlphaFromMouse() {
        // Vérifier que la souris est bien sur le slider
        if (!this.isMouseOverSlider()) {
            return;
        }
        let relativeY = constrain(mouseY - this.sliderY, 0, this.sliderHeight);
        this.alphaValue = 1 - (relativeY / this.sliderHeight);
        this.updateAllSegmentAlpha();
    }
    
    updateGuitarSegmentColor() {
        // Met à jour SEULEMENT la couleur sélectionnée (sans changer l'alpha)
        let col = this.colors[this.selectedColorIndex];
        let alphaHex = Math.round(this.alphaValue * 255).toString(16).padStart(2, '0');
        let newColor = col.hex + alphaHex;
        
        // Mettre à jour la couleur dans l'array segmentColor de guitar
        if (this.guitar.segmentColor && this.guitar.segmentColor[this.selectedColorIndex]) {
            this.guitar.segmentColor[this.selectedColorIndex] = newColor;
        }
        
        // Mettre à jour aussi l'index de couleur sélectionnée
        this.guitar.segmentColorIndex = this.selectedColorIndex;
    }
    
    updateAllSegmentAlpha() {
        // Met à jour l'alpha de TOUS les segments, peu importe leur couleur
        let alphaHex = Math.round(this.alphaValue * 255).toString(16).padStart(2, '0');
        
        for (let i = 0; i < this.guitar.segmentColor.length; i++) {
            let currentColor = this.guitar.segmentColor[i];
            // Garder les 6 premiers caractères (# + RRGGBB) et remplacer l'alpha
            let newColor = currentColor.substring(0, 7) + alphaHex;
            this.guitar.segmentColor[i] = newColor;
        }
    }
}
