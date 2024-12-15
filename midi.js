// Enable WEBMIDI.js and trigger the onEnabled() function when ready
WebMidi
    .enable()
    .then(onEnabled)
    .catch(err => alert(err));

// Function triggered when WEBMIDI.js is ready
function onEnabled() {
  
  const mySynth = WebMidi.inputs[0];  
   // Fonction pour ajouter des écouteurs d'événements à un canal donné
  function addChannelListeners(channel) {
    channel.addListener("noteon", e => notePressed(e.data[1]));
    channel.addListener("noteoff", e => noteReleased(e.data[1]));
    channel.addListener("controlchange", e => controlChange(e));
  }

  // Ajouter des écouteurs pour chaque canal de 1 à 5
  for (let i = 1; i <= 5; i++) {
    addChannelListeners(mySynth.channels[i]);
  }
}

// Fonction pour jouer une note MIDI simulée
function playNote() {
  const mySynth = WebMidi.outputs[0]; // Sélectionne la sortie MIDI appropriée
  const noteNumber = 60; // Exemple: Numéro de note MIDI pour le C4
  const velocity = 127; // Vélocité maximale

  // Envoyer le message Note On
  mySynth.channels[1].sendNoteOn(noteNumber, {velocity: velocity});

  // Envoyer le message Note Off après une courte durée
  setTimeout(() => {
    mySynth.channels[1].sendNoteOff(noteNumber);
  }, 500); // La note sera relâchée après 500 ms
}