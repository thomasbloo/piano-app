import { startNote, stopNote } from './audio.js';
import { Keyboard } from './keyboard.js';
import { connectMidi, midiSupported } from './midi.js';
import { keyboardRange, noteName } from './notes.js';
import { loadSettings, saveSettings } from './settings.js';

const settings = loadSettings();
/** @template {HTMLElement} T @param {string} id @returns {T} */
const $ = (id) => /** @type {T} */ (document.getElementById(id));

const labelsSelect = /** @type {HTMLSelectElement} */ ($('labels'));
const octavesSelect = /** @type {HTMLSelectElement} */ ($('octaves'));
const soundCheck = /** @type {HTMLInputElement} */ ($('sound'));
const midiButton = /** @type {HTMLButtonElement} */ ($('midi-btn'));
const midiStatus = $('midi-status');
const lastNote = $('last-note');

labelsSelect.value = settings.labels;
octavesSelect.value = String(settings.octaves);
soundCheck.checked = settings.sound;

/** @param {number} midi @param {number} [velocity] */
function noteOn(midi, velocity = 100) {
  if (settings.sound) startNote(midi, velocity);
  lastNote.textContent = `${noteName(midi, 'letters', true)} · ${noteName(midi, 'solfege', true)}`;
}

/** @param {number} midi */
function noteOff(midi) {
  stopNote(midi);
}

const keyboard = new Keyboard($('keyboard'), {
  ...keyboardRange(settings.octaves),
  labels: settings.labels,
  onNoteOn: (midi) => noteOn(midi),
  onNoteOff: noteOff,
});

labelsSelect.addEventListener('change', () => {
  settings.labels = /** @type {import('./notes.js').LabelMode} */ (labelsSelect.value);
  saveSettings(settings);
  keyboard.update({ labels: settings.labels });
});

octavesSelect.addEventListener('change', () => {
  settings.octaves = Number(octavesSelect.value);
  saveSettings(settings);
  keyboard.update(keyboardRange(settings.octaves));
});

soundCheck.addEventListener('change', () => {
  settings.sound = soundCheck.checked;
  saveSettings(settings);
});

if (!midiSupported()) {
  midiButton.disabled = true;
  midiStatus.textContent = 'Ce navigateur ne gère pas le MIDI. Utilisez Chrome ou Edge.';
}

midiButton.addEventListener('click', async () => {
  try {
    await connectMidi({
      onNoteOn: (midi, velocity) => {
        keyboard.setActive(midi, true);
        noteOn(midi, velocity);
      },
      onNoteOff: (midi) => {
        keyboard.setActive(midi, false);
        noteOff(midi);
      },
      onDevicesChange: (names) => {
        midiStatus.textContent = names.length
          ? `MIDI connecté : ${names.join(', ')}`
          : 'Accès MIDI accordé, mais aucun appareil branché.';
      },
    });
  } catch {
    midiStatus.textContent = "L'accès MIDI a été refusé.";
  }
});

if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  void navigator.serviceWorker.register('sw.js');
}
