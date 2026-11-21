// A simple left hand for a melody in C major: one long bass note per bar, picked from
// C (do), F (fa) or G (sol) by which chord best fits the bar's melody notes.
import { parseNote } from './musicxml.js';

const DIVISIONS = 4;
const CHORDS = [
  { root: 'C3', notes: ['C', 'E', 'G'] },
  { root: 'G2', notes: ['G', 'B', 'D', 'F'] },
  { root: 'F2', notes: ['F', 'A', 'C'] },
];
const LENGTHS = /** @type {[number, string][]} */ ([[16, '1'], [12, '2.'], [8, '2'], [6, '4.'], [4, '4'], [3, '8.'], [2, '8'], [1, '16']]);

/**
 * Tokens filling `length` sixteenths with one pitch (tied by ear, not on paper), or rests.
 * @param {number} length
 * @param {string} pitch  e.g. "C3", or "r"
 */
export function fill(length, pitch) {
  const tokens = [];
  for (const [size, value] of LENGTHS) {
    while (length >= size) {
      tokens.push(`${pitch}/${value}`);
      length -= size;
    }
  }
  return tokens.join(' ');
}

/**
 * @param {string} right  the melody, in the notation of tools/musicxml.js
 * @param {{ beats: number, beatType: number, pickup?: boolean }} time
 */
export function autoBass(right, { beats, beatType, pickup }) {
  const barLength = (beats * 4 * DIVISIONS) / beatType;
  const bars = right.split('|').map((bar) => bar.trim().split(/\s+/).filter(Boolean).map(parseNote));
  let previous = 'C3';
  return bars.map((notes, i) => {
    const length = notes.reduce((sum, n) => sum + n.duration, 0);
    if (pickup && i === 0) return fill(length, 'r');
    let root = previous;
    if (i === bars.length - 1) root = 'C3';
    else if (notes.some((n) => !n.rest)) {
      let best = -1;
      for (const chord of CHORDS) {
        const score = notes.reduce((sum, n) => sum + (!n.rest && chord.notes.includes(n.step) ? n.duration : 0), 0);
        if (score > best) [best, root] = [score, chord.root];
      }
    }
    previous = root;
    return fill(barLength, root);
  }).join(' | ');
}
