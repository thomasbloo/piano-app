/**
 * @typedef {object} Settings
 * @property {import('./notes.js').LabelMode} labels
 * @property {number} octaves
 * @property {boolean} sound
 */

const KEY = 'piano.settings';
/** @type {Settings} */
const DEFAULTS = { labels: 'letters', octaves: 3, sound: true };

/** @returns {Settings} */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
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
