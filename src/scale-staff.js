import { ledgerLines } from './staff.js';
import { handShifts, spelledOctave } from './scales.js';

// A scale on one staff per hand (right hand in treble clef on top, left hand in bass clef below),
// with the finger numbers above the right hand and below the left hand. Bravura glyphs, as in staff.js.

/** @typedef {'treble' | 'bass'} Clef */
/** @typedef {'pending' | 'current' | 'correct' | 'wrong'} StepState */

const SPACE = 12;
const GLYPH = {
  treble: '',
  bass: '',
  trebleChange: '',
  bassChange: '',
  notehead: '',
  '-2': '',
  '-1': '',
  0: '',
  1: '',
  2: '',
};
const NOTEHEAD_WIDTH = 1.18 * SPACE;
const STEM_LENGTH = 3.5 * SPACE;
const NOTE_START = 64;
const NOTE_GAP = 40;
const CLEF_CHANGE_GAP = 30;
/** Each staff's band, in half spaces from its bottom line: room for three ledger lines and the fingers,
 * more when the notes go further. The fingers sit above the right hand and below the left hand. */
const BAND_TOP = 18;
const BAND_BOTTOM = -10;
const FINGER_GAP = 3;
/** Diatonic index of each clef's bottom line: E4 for treble, G2 for bass. */
const BOTTOM_LINE = { treble: 4 * 7 + 2, bass: 2 * 7 + 4 };
const CLEF_LINE = { treble: 2, bass: 6 };
const HOME = /** @type {const} */ ({ right: 'treble', left: 'bass' });
/** Beyond three ledger lines towards the other clef, a hand changes clef; it goes back home once a note fits there again. */
const HIGHEST = 14;
const LOWEST = -6;

/** @param {import('./scales.js').Spelled} note @param {Clef} clef */
export function scalePosition(note, clef) {
  return spelledOctave(note) * 7 + note.letter - BOTTOM_LINE[clef];
}

/**
 * Clef of each note of one hand: its home clef, unless the note would need more than three ledger lines.
 * @param {import('./scales.js').Spelled[]} notes @param {'right' | 'left'} hand
 * @returns {Clef[]}
 */
export function clefsFor(notes, hand) {
  const home = HOME[hand];
  const other = home === 'treble' ? 'bass' : 'treble';
  // Only going towards the other clef helps: very high notes stay in treble clef, very low ones in bass clef.
  const fits = (/** @type {import('./scales.js').Spelled} */ n) => {
    const p = scalePosition(n, home);
    return home === 'treble' ? p >= LOWEST : p <= HIGHEST;
  };
  /** @type {Clef} */
  let clef = notes[0] && !fits(notes[0]) ? other : home;
  return notes.map((n) => {
    if (clef === home && !fits(n)) clef = other;
    else if (clef !== home) {
      const p = scalePosition(n, home);
      if (p >= -2 && p <= 10) clef = home;
    }
    return clef;
  });
}

/**
 * @param {object} options
 * @param {import('./scales.js').ScaleStep[]} options.steps
 * @param {StepState[]} options.states  one per step
 * @param {boolean} options.fingers  show the finger numbers
 */
export function renderScaleStaff({ steps, states, fingers }) {
  const hands = /** @type {('right' | 'left')[]} */ (['right', 'left'].filter((h) => steps.some((s) => s.notes.some((n) => n.hand === h))));
  const parts = hands.map((hand) => steps.map((s) => s.notes.find((n) => n.hand === hand)));
  const clefs = parts.map((notes, i) => clefsFor(/** @type {import('./scales.js').Spelled[]} */ (notes), hands[i]));

  // Columns line up across the staves; a clef change on either staff makes room in both.
  /** @type {number[]} */
  const xs = [];
  let x = NOTE_START;
  for (let i = 0; i < steps.length; i++) {
    if (i > 0 && clefs.some((c) => c[i] !== c[i - 1])) x += CLEF_CHANGE_GAP;
    xs.push(x);
    x += NOTE_GAP;
  }
  const width = x;
  const bands = parts.map((notes, h) => {
    const positions = notes.flatMap((n, i) => (n ? [scalePosition(n, clefs[h][i])] : []));
    const top = Math.max(BAND_TOP, Math.max(...positions) + (hands[h] === 'right' ? FINGER_GAP + 2 : 2));
    const bottom = Math.min(BAND_BOTTOM, Math.min(...positions) - (hands[h] === 'left' ? FINGER_GAP + 2 : 2));
    const finger = hands[h] === 'right' ? top - 2 : bottom + 1.5;
    return { top, bottom, finger, height: ((top - bottom) * SPACE) / 2 };
  });
  const height = bands.reduce((sum, b) => sum + b.height, 0);
  /** @type {string[]} */
  const out = [];

  steps.forEach((_, i) => {
    if (states[i] === 'current') {
      out.push(`<rect class="cursor" x="${xs[i] - 10}" y="0" width="${NOTEHEAD_WIDTH + 20}" height="${height}" rx="8"/>`);
    }
  });

  hands.forEach((hand, h) => {
    const band = bands[h];
    const top = bands.slice(0, h).reduce((sum, b) => sum + b.height, 0);
    const y = (/** @type {number} */ p) => top + ((band.top - p) * SPACE) / 2;
    for (let p = 0; p <= 8; p += 2) out.push(`<line class="staff-line" x1="0" x2="${width}" y1="${y(p)}" y2="${y(p)}"/>`);
    out.push(`<text class="glyph" x="8" y="${y(CLEF_LINE[clefs[h][0]])}">${GLYPH[clefs[h][0]]}</text>`);
    const shifts = new Set(handShifts(steps, hand).map((s) => s.index));
    /** Last alteration written for each letter and octave, so a natural sign follows a sharp or flat. @type {Map<string, number>} */
    const written = new Map();

    parts[h].forEach((note, i) => {
      if (!note) return;
      const clef = clefs[h][i];
      const nx = xs[i];
      if (i > 0 && clef !== clefs[h][i - 1]) {
        out.push(`<text class="glyph" x="${nx - CLEF_CHANGE_GAP + 2}" y="${y(CLEF_LINE[clef])}">${GLYPH[`${clef}Change`]}</text>`);
      }
      const position = scalePosition(note, clef);
      const g = [];
      for (const p of ledgerLines(position)) {
        g.push(`<line class="ledger" x1="${nx - 5}" x2="${nx + NOTEHEAD_WIDTH + 5}" y1="${y(p)}" y2="${y(p)}"/>`);
      }
      const key = `${note.letter}${spelledOctave(note)}`;
      const before = written.get(key) ?? 0;
      if (note.alter !== 0 || before !== 0) {
        g.push(`<text class="glyph" x="${nx - (note.alter === 2 ? 1.0 : 1.1) * SPACE}" y="${y(position)}">${GLYPH[/** @type {-2 | -1 | 0 | 1 | 2} */ (note.alter)]}</text>`);
      }
      written.set(key, note.alter);
      g.push(`<text class="glyph" x="${nx}" y="${y(position)}">${GLYPH.notehead}</text>`);
      const stem = position < 4
        ? { x: nx + NOTEHEAD_WIDTH - 0.6, y1: y(position) - 1, y2: y(position) - STEM_LENGTH }
        : { x: nx + 0.6, y1: y(position) + 1, y2: y(position) + STEM_LENGTH };
      g.push(`<line class="stem" x1="${stem.x}" x2="${stem.x}" y1="${stem.y1}" y2="${stem.y2}"/>`);
      if (fingers) {
        const fx = nx + NOTEHEAD_WIDTH / 2;
        const fy = y(band.finger);
        if (shifts.has(i)) g.push(`<circle class="shift ${hand}" cx="${fx}" cy="${fy - 5}" r="10"/>`);
        g.push(`<text class="finger ${hand}" x="${fx}" y="${fy}" text-anchor="middle">${note.finger}</text>`);
      }
      out.push(`<g class="note ${states[i]}" data-index="${i}">${g.join('')}</g>`);
    });
  });

  return `<svg class="staff scale-staff" viewBox="0 0 ${width} ${height}" data-width="${width}" data-height="${height}" style="font-size:${4 * SPACE}px" role="img" aria-label="Gamme sur la portée">${out.join('')}</svg>`;
}
