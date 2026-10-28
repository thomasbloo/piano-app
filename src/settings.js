/**
 * @typedef {object} Settings
 * @property {import('./notes.js').LabelMode} labels
 * @property {number} octaves
 * @property {boolean} sound
 * @property {'dark' | 'light'} theme
 * @property {boolean} midi  MIDI access was granted before, so it reconnects on start
 * @property {'keyboard' | 'exercises' | 'scales' | 'library'} view
 * @property {import('./exercise.js').ExerciseOptions} exercise
 * @property {{ hand: import('./practice.js').HandChoice, mode: 'wait' | 'realtime', speed: number, showKeys: boolean, accompany: boolean }} practice
 * @property {ScaleSettings} scales
 * @property {import('./streak.js').Streak | null} streak
 */

/**
 * @typedef {import('./scales.js').ScaleOptions & {
 *   mode: 'wait' | 'tempo', tempo: number, perBeat: number, metronome: boolean, fingers: boolean, showKeys: boolean
 * }} ScaleSettings
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
  practice: { hand: 'right', mode: 'wait', speed: 0.75, showKeys: true, accompany: true },
  scales: {
    tonic: 0, type: 'major', hand: 'right', octaves: 1, direction: 'updown',
    mode: 'wait', tempo: 60, perBeat: 2, metronome: true, fingers: true, showKeys: true,
  },
  streak: null,
};

/** @returns {Settings} */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const saved = JSON.parse(raw);
    return { ...DEFAULTS, ...saved, exercise: { ...DEFAULTS.exercise, ...saved.exercise }, practice: { ...DEFAULTS.practice, ...saved.practice }, scales: { ...DEFAULTS.scales, ...saved.scales } };
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
