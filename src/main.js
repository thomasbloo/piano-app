import { startNote, stopNote } from './audio.js';
import { createExerciseView } from './exercise-view.js';
import { Keyboard } from './keyboard.js';
import { createLibraryView } from './library-view.js';
import { connectMidi, midiSupported } from './midi.js';
import { createPracticeView } from './practice-view.js';
import { createScalesView } from './scales-view.js';
import { coverRange, keyboardRange, noteName } from './notes.js';
import { loadSettings, saveSettings } from './settings.js';
import { dayOf, practised, streakDays } from './streak.js';

const settings = loadSettings();
const save = () => saveSettings(settings);
/** @template {HTMLElement} T @param {string} id @returns {T} */
const $ = (id) => /** @type {T} */ (document.getElementById(id));

const labelsSelect = /** @type {HTMLSelectElement} */ ($('labels'));
const octavesSelect = /** @type {HTMLSelectElement} */ ($('octaves'));
const soundCheck = /** @type {HTMLInputElement} */ ($('sound'));
const themeSelect = /** @type {HTMLSelectElement} */ ($('theme'));
const settingsButton = $('settings-btn');
const midiButton = /** @type {HTMLButtonElement} */ ($('midi-btn'));
const midiStatus = $('midi-status');
const midiName = $('midi-name');
const midiMessage = $('midi-message');
const lastNote = $('last-note');

labelsSelect.value = settings.labels;
octavesSelect.value = String(Math.min(settings.octaves, 5));
soundCheck.checked = settings.sound;
themeSelect.value = settings.theme;
document.documentElement.dataset.theme = settings.theme;

themeSelect.addEventListener('change', () => {
  settings.theme = /** @type {'dark' | 'light'} */ (themeSelect.value);
  document.documentElement.dataset.theme = settings.theme;
  save();
});

settingsButton.addEventListener('click', () => {
  const panel = $('settings');
  panel.hidden = !panel.hidden;
  settingsButton.setAttribute('aria-expanded', String(!panel.hidden));
});

/** Days practised in a row, shown in the header. */
function showStreak() {
  const days = streakDays(settings.streak, dayOf(new Date()));
  $('streak').hidden = days === 0;
  $('streak-text').textContent = `Série de ${days} jour${days > 1 ? 's' : ''}`;
}

/** A right note in an exercise or a score counts today in the streak. */
function rightNote() {
  const streak = practised(settings.streak, dayOf(new Date()));
  if (streak === settings.streak) return;
  settings.streak = streak;
  save();
  showStreak();
}
showStreak();

/** @param {number} midi @param {number} [velocity] */
function noteOn(midi, velocity = 100) {
  if (settings.sound) startNote(midi, velocity);
  lastNote.textContent = `${noteName(midi, 'letters', true)} · ${noteName(midi, 'solfege', true)}`;
  if (settings.view === 'exercises') exercises.play(midi);
  if (settings.view === 'scales') scales.play(midi);
  if (settings.view === 'library') practice.play(midi);
}

/** @param {number} midi */
function noteOff(midi) {
  stopNote(midi);
}

/** The chosen keyboard size, widened so every note of the exercise or the open score can be played. */
function currentRange() {
  const range = keyboardRange(settings.octaves);
  const needed = settings.view === 'exercises' ? exercises.range()
    : settings.view === 'scales' ? scales.range()
    : settings.view === 'library' ? practice.range()
    : null;
  return needed ? coverRange(range, needed.low, needed.high) : range;
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
  onRightNote: rightNote,
});

const practice = createPracticeView({
  settings,
  save,
  keyboard,
  onRangeChange: () => keyboard.update(currentRange()),
  onRightNote: rightNote,
});

/** Note names on the keys, from the settings or the switch in the scales tab. @param {import('./notes.js').LabelMode} mode */
function setLabels(mode) {
  settings.labels = mode;
  labelsSelect.value = mode;
  save();
  keyboard.update({ labels: mode });
  scales.refresh();
}

const scales = createScalesView({
  settings,
  save,
  keyboard,
  onRangeChange: () => keyboard.update(currentRange()),
  onRightNote: rightNote,
  onLabelsChange: setLabels,
});

/** @param {import('./settings.js').Settings['view']} view */
function showView(view) {
  if (view !== 'library') practice.stop();
  if (view !== 'scales') scales.hide();
  settings.view = view;
  save();
  for (const button of document.querySelectorAll('.tabs button')) {
    button.setAttribute('aria-current', String(/** @type {HTMLElement} */ (button).dataset.view === view));
  }
  $('view-keyboard').hidden = view !== 'keyboard';
  $('view-exercises').hidden = view !== 'exercises';
  $('view-scales').hidden = view !== 'scales';
  $('view-library').hidden = view !== 'library';
  keyboard.update(currentRange());
  if (view === 'scales') scales.show();
}

createLibraryView({ onScoreOpened: (osmd) => practice.setScore(osmd), onScoreClosed: () => practice.stop() });

for (const button of document.querySelectorAll('.tabs button')) {
  button.addEventListener('click', () => showView(/** @type {any} */ (/** @type {HTMLElement} */ (button).dataset.view)));
}
showView(settings.view);

labelsSelect.addEventListener('change', () => setLabels(/** @type {import('./notes.js').LabelMode} */ (labelsSelect.value)));

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
  midiMessage.textContent = 'Ce navigateur ne gère pas le MIDI. Utilisez Chrome ou Edge.';
}

async function startMidi() {
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
        midiStatus.hidden = !names.length;
        midiName.textContent = names.join(', ');
        midiStatus.title = `MIDI connecté : ${names.join(', ')}`;
        midiMessage.textContent = names.length ? '' : 'Aucun piano MIDI branché.';
      },
    });
    settings.midi = true;
    save();
  } catch {
    midiMessage.textContent = "L'accès MIDI a été refusé.";
  }
}

midiButton.addEventListener('click', () => void startMidi());

// Once MIDI has been allowed, reconnect by itself on the next visits.
if (settings.midi && midiSupported()) void startMidi();

if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  void navigator.serviceWorker.register('sw.js');
}
