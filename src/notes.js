/** @typedef {'none' | 'letters' | 'solfege'} LabelMode */

const LETTERS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const SOLFEGE = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const BLACK = new Set([1, 3, 6, 8, 10]);

/** @param {number} midi */
const pitchClass = (midi) => ((midi % 12) + 12) % 12;

/** @param {number} midi */
export function isBlack(midi) {
  return BLACK.has(pitchClass(midi));
}

/** Octave in scientific pitch notation: MIDI 60 is C4. @param {number} midi */
export function octaveOf(midi) {
  return Math.floor(midi / 12) - 1;
}

/**
 * @param {number} midi
 * @param {'letters' | 'solfege'} mode
 * @param {boolean} [withOctave]
 */
export function noteName(midi, mode, withOctave = false) {
  const name = (mode === 'letters' ? LETTERS : SOLFEGE)[pitchClass(midi)];
  return withOctave ? `${name}${octaveOf(midi)}` : name;
}

/** @param {number} midi */
export function frequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Keyboard range centred on middle C for 2 to 4 octaves, or the full 88 keys.
 * @param {number} octaves
 */
export function keyboardRange(octaves) {
  if (octaves >= 7) return { low: 21, high: 108 };
  const low = 60 - 12 * Math.floor(octaves / 2);
  return { low, high: low + 12 * octaves };
}
