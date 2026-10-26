import { startNote, stopNote } from './audio.js';
import { createExerciseView } from './exercise-view.js';
import { Keyboard } from './keyboard.js';
import { createLibraryView } from './library-view.js';
import { connectMidi, midiSupported } from './midi.js';
import { coverRange, keyboardRange, noteName } from './notes.js';
import { loadSettings, saveSettings } from './settings.js';

const settings = loadSettings();
const save = () => saveSettings(settings);
/** @template {HTMLElement} T @param {string} id @returns {T} */
const $ = (id) => /** @type {T} */ (document.getElementById(id));

const labelsSelect = /** @type {HTMLSelectElement} */ ($('labels'));
const octavesSelect = /** @type {HTMLSelectElement} */ ($('octaves'));
const soundCheck = /** @type {HTMLInputElement} */ ($('sound'));
const midiButton = /** @type {HTMLButtonElement} */ ($('midi-btn'));
const midiStatus = $('midi-status');
const lastNote = $('last-note');

labelsSelect.value = settings.labels;
octavesSelect.value = String(Math.min(settings.octaves, 5));
soundCheck.checked = settings.sound;

/** @param {number} midi @param {number} [velocity] */
function noteOn(midi, velocity = 100) {
  if (settings.sound) startNote(midi, velocity);
  lastNote.textContent = `${noteName(midi, 'letters', true)} · ${noteName(midi, 'solfege', true)}`;
  if (settings.view === 'exercises') exercises.play(midi);
}

/** @param {number} midi */
function noteOff(midi) {
  stopNote(midi);
}

/** The chosen keyboard size, widened in the exercises so every note asked can be played. */
function currentRange() {
  const range = keyboardRange(settings.octaves);
  if (settings.view !== 'exercises') return range;
  const needed = exercises.range();
  return coverRange(range, needed.low, needed.high);
}

const keyboard = new Keyboard($('keyboard'), {
  ...keyboardRange(settings.octaves),
  labels: settings.labels,
  onNoteOn: (midi) => noteOn(midi),
  onNoteOff: noteOff,
});

const exercises = createExerciseView({
  settings,
  save,
  keyboard,
  onRangeChange: () => keyboard.update(currentRange()),
});

/** @param {import('./settings.js').Settings['view']} view */
function showView(view) {
  settings.view = view;
  save();
  for (const button of document.querySelectorAll('.tabs button')) {
    button.setAttribute('aria-current', String(/** @type {HTMLElement} */ (button).dataset.view === view));
  }
  $('view-keyboard').hidden = view !== 'keyboard';
  $('view-exercises').hidden = view !== 'exercises';
  $('view-library').hidden = view !== 'library';
  keyboard.update(currentRange());
}

createLibraryView();

for (const button of document.querySelectorAll('.tabs button')) {
  button.addEventListener('click', () => showView(/** @type {any} */ (/** @type {HTMLElement} */ (button).dataset.view)));
}
showView(settings.view);

labelsSelect.addEventListener('change', () => {
  settings.labels = /** @type {import('./notes.js').LabelMode} */ (labelsSelect.value);
  save();
  keyboard.update({ labels: settings.labels });
});

octavesSelect.addEventListener('change', () => {
  settings.octaves = Number(octavesSelect.value);
  save();
  keyboard.update(currentRange());
});

soundCheck.addEventListener('change', () => {
  settings.sound = soundCheck.checked;
  save();
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
