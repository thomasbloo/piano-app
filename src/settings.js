/**
 * @typedef {object} Settings
 * @property {import('./notes.js').LabelMode} labels
 * @property {number} octaves
 * @property {boolean} sound
 * @property {'keyboard' | 'exercises'} view
 * @property {import('./exercise.js').ExerciseOptions} exercise
 */

const KEY = 'piano.settings';
/** @type {Settings} */
const DEFAULTS = {
  labels: 'letters',
  octaves: 3,
  sound: true,
  view: 'keyboard',
  exercise: { clef: 'treble', level: 'staff', accidentals: false, mode: 'single', exactOctave: true },
};

/** @returns {Settings} */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const saved = JSON.parse(raw);
    return { ...DEFAULTS, ...saved, exercise: { ...DEFAULTS.exercise, ...saved.exercise } };
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
