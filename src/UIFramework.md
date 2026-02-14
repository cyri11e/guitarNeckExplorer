# Framework UI — Documentation interne
Version 1.0 — Architecture actuelle

---

## 1. Philosophie générale

- Aucune transformation globale (`translate`, `rotate`, `scale`, `push`, `pop`).
- Tous les dessins se font en **coordonnées absolues**.
- Aucun composant ne modifie le contexte global p5.
- Séparation stricte des responsabilités :
  - interaction
  - géométrie
  - style
  - rendu
  - théorie musicale

---

## 2. UIComponent — API standard

### Propriétés
- `x, y, w, h`
- `children[]`
- `isHovered`
- `dragging`
- `visible`
- `invalidated`

### Méthodes principales
- `draw()`
- `drawSelf()`
- `drawChildren()`
- `invalidate()`
- `containsRect(x, y)`

### Interaction
- `mousePressed(x, y)`
- `mouseDragged(x, y)`
- `mouseReleased(x, y)`
- `mouseClicked(x, y)`

---

## 3. UIInteractionManager — comportement

### Séquence d’événements
1. `mousePressed`
2. `mouseDragged` (si mouvement)
3. `mouseReleased`
4. `mouseClicked` **uniquement si pas de drag**

### Conséquence
- `dragging` est **toujours false** dans `mouseClicked()`.
- Pour bloquer un clic après un drag : utiliser un flag interne `wasDragged`.

---

## 4. Règles d’or du dessin

### Interdits absolus
- `translate()`
- `rotate()`
- `scale()`
- `push()` / `pop()`
- Variables nommées comme des fonctions p5 (`fill`, `stroke`, etc.)

### Obligations
- Coordonnées absolues uniquement.
- Styles locaux, jamais persistants.
- Aucun effet de bord.

---

## 5. Guitar — pipeline d’interaction

### États internes
- `hoveredNote`
- `pinnedNotes[]`
- `wasDragged`
- `zoomFactor`
- `isHovered`

### Méthodes clés
- `fromScreen(x, y)` → pixel → fret/string
- `toScreen(fret, string)` → fret/string → pixel
- `togglePinnedNote()`
- `mousePressed` → reset `wasDragged`
- `mouseDragged` → `wasDragged = true`
- `mouseClicked` → bloque pin si `wasDragged`

---

## 6. GuitarRenderer — règles strictes

### Ce qu’il fait
- Dessine le manche, frets, cordes, inlays.
- Dessine les notes (hover, pinned, scale…).

### Ce qu’il ne fait jamais
- Logique musicale.
- Logique d’interaction.
- Transformations p5.
- Modifier l’état de Guitar.

### Méthode centrale : `drawNote()`
- Dessin pur.
- Options paramétrables (`noteFill`, `noteStroke`, `shapeType`, `opacity`, `hasShadow`).
- Texte centré.
- Altérations positionnées intelligemment.
- Ajustements OS via `altAdjustX` / `altAdjustY`.

---

## 7. Instrument & InstrumentTheory

- `Instrument` calcule les notes réelles.
- `InstrumentTheory` fournit les noms (C, D#, Eb…).
- Aucun calcul musical ne dépend de l’affichage (`openStringNames`).

---

## 8. Règles de nommage

- Pas de noms réservés p5.
- Préfixes recommandés :
  - `noteFill`
  - `noteStroke`
  - `shapeType`
  - `opacity`

---

## 9. Résumé

- Framework UI minimaliste, déterministe, sans magie.
- Rendu pur, interaction propre, logique musicale séparée.
- Aucune transformation globale.
- Aucune pollution du contexte p5.
- Architecture claire et stable.

