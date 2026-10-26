import { isBlack } from './notes.js';

// Staff rendering with the Bravura music font (SMuFL code points). In SMuFL one em is
// four staff spaces, and every glyph's origin sits on the staff line it belongs to.

/** @typedef {'treble' | 'bass'} Clef */
/** @typedef {'pending' | 'current' | 'correct' | 'wrong'} NoteState */

const SPACE = 12;
const GLYPH = { treble: '', bass: '', notehead: '', sharp: '' };
const NOTEHEAD_WIDTH = 1.18 * SPACE;
const STEM_LENGTH = 3.5 * SPACE;
// Staff positions are counted in half spaces from the bottom line, so lines are 0, 2, 4, 6, 8.
const TOP_POSITION = 14;
const BOTTOM_POSITION = -6;
const NOTE_START = 64;
const NOTE_GAP = 44;

/** Diatonic index of the white key at or just below each pitch class. Sharps share their natural's line. */
const LETTER_OF_PITCH_CLASS = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
/** Diatonic index of each clef's bottom line: E4 for treble, G2 for bass. */
const BOTTOM_LINE = { treble: 4 * 7 + 2, bass: 2 * 7 + 4 };
/** Line each clef glyph is anchored to: G line for treble, F line for bass. */
const CLEF_LINE = { treble: 2, bass: 6 };

/** @param {number} midi */
export function diatonicIndex(midi) {
  const pc = ((midi % 12) + 12) % 12;
  return (Math.floor(midi / 12) - 1) * 7 + LETTER_OF_PITCH_CLASS[pc];
}

/** @param {number} midi @param {Clef} clef */
export function staffPosition(midi, clef) {
  return diatonicIndex(midi) - BOTTOM_LINE[clef];
}

/** Ledger line positions needed for a note at this staff position. @param {number} position */
export function ledgerLines(position) {
  const lines = [];
  for (let p = -2; p >= position; p -= 2) lines.push(p);
  for (let p = 10; p <= position; p += 2) lines.push(p);
  return lines;
}

/** @param {number} position */
const y = (position) => ((TOP_POSITION - position) * SPACE) / 2;

/**
 * Render a staff with one clef and a row of quarter notes as an SVG string.
 * @param {{ clef: Clef, notes: { midi: number, state: NoteState }[] }} options
 */
export function renderStaff({ clef, notes }) {
  const width = NOTE_START + Math.max(notes.length, 1) * NOTE_GAP + 8;
  const height = y(BOTTOM_POSITION);
  const parts = [];

  for (let p = 0; p <= 8; p += 2) {
    parts.push(`<line class="staff-line" x1="0" x2="${width}" y1="${y(p)}" y2="${y(p)}"/>`);
  }
  parts.push(`<text class="glyph" x="8" y="${y(CLEF_LINE[clef])}">${GLYPH[clef]}</text>`);

  notes.forEach((note, i) => {
    const x = NOTE_START + i * NOTE_GAP;
    const position = staffPosition(note.midi, clef);
    const noteParts = [];
    for (const p of ledgerLines(position)) {
      noteParts.push(`<line class="ledger" x1="${x - 5}" x2="${x + NOTEHEAD_WIDTH + 5}" y1="${y(p)}" y2="${y(p)}"/>`);
    }
    if (isBlack(note.midi)) {
      noteParts.push(`<text class="glyph" x="${x - 1.1 * SPACE}" y="${y(position)}">${GLYPH.sharp}</text>`);
    }
    noteParts.push(`<text class="glyph" x="${x}" y="${y(position)}">${GLYPH.notehead}</text>`);
    // Stems go up below the middle line and down from it upwards, as in printed music.
    const stem = position < 4
      ? { x: x + NOTEHEAD_WIDTH - 0.6, y1: y(position) - 1, y2: y(position) - STEM_LENGTH }
      : { x: x + 0.6, y1: y(position) + 1, y2: y(position) + STEM_LENGTH };
    noteParts.push(`<line class="stem" x1="${stem.x}" x2="${stem.x}" y1="${stem.y1}" y2="${stem.y2}"/>`);
    parts.push(`<g class="note ${note.state}" data-index="${i}">${noteParts.join('')}</g>`);
  });

  return `<svg class="staff" viewBox="0 0 ${width} ${height}" width="${width * 2}" style="font-size:${4 * SPACE}px" role="img" aria-label="Portée">${parts.join('')}</svg>`;
}
