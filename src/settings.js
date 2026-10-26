/**
 * @typedef {object} Settings
 * @property {import('./notes.js').LabelMode} labels
 * @property {number} octaves
 * @property {boolean} sound
 * @property {'dark' | 'light'} theme
 * @property {boolean} midi  MIDI access was granted before, so it reconnects on start
 * @property {'keyboard' | 'exercises' | 'library'} view
 * @property {import('./exercise.js').ExerciseOptions} exercise
 * @property {{ hand: import('./practice.js').HandChoice, mode: 'wait' | 'realtime', speed: number, showKeys: boolean }} practice
 * @property {import('./streak.js').Streak | null} streak
 */

const KEY = 'piano.settings';
/** @type {Settings} */
const DEFAULTS = {
  labels: 'letters',
  octaves: 5,
  sound: true,
  theme: 'dark',
  midi: false,
  view: 'keyboard',
  exercise: { clef: 'treble', level: 'staff', accidentals: false, mode: 'single', exactOctave: true },
  practice: { hand: 'right', mode: 'wait', speed: 0.75, showKeys: true },
  streak: null,
};

/** @returns {Settings} */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const saved = JSON.parse(raw);
    return { ...DEFAULTS, ...saved, exercise: { ...DEFAULTS.exercise, ...saved.exercise }, practice: { ...DEFAULTS.practice, ...saved.practice } };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

/** @param {Settings} settings */
export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private mode or blocked storage: settings just won't persist.
  }
}
