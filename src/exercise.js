import { isBlack } from './notes.js';

/** @typedef {import('./staff.js').Clef} Clef */
/** @typedef {import('./staff.js').NoteState} NoteState */

/**
 * @typedef {object} ExerciseOptions
 * @property {Clef | 'both'} clef
 * @property {'staff' | 'ledger'} level  Notes on the staff only, or with up to three ledger lines.
 * @property {boolean} accidentals
 * @property {'single' | 'sequence'} mode
 * @property {boolean} exactOctave  When false, any octave of the right note counts.
 */

/** Note ranges in MIDI numbers. Treble: E4–F5 or A3–C6. Bass: G2–A3 or C2–E4. */
export const RANGES = {
  treble: { staff: [64, 77], ledger: [57, 84] },
  bass: { staff: [43, 57], ledger: [36, 64] },
};

export const SEQUENCE_LENGTH = 8;
/** After this many wrong answers on one note, the right key is shown. */
export const HINT_AFTER = 2;

/** Lowest and highest notes an exercise with these options can ask for. @param {ExerciseOptions} options */
export function exerciseRange(options) {
  const clefs = options.clef === 'both' ? /** @type {Clef[]} */ (['treble', 'bass']) : [options.clef];
  const lows = clefs.map((c) => RANGES[c][options.level][0]);
  const highs = clefs.map((c) => RANGES[c][options.level][1]);
  return { low: Math.min(...lows), high: Math.max(...highs) };
}

/**
 * @param {Clef} clef
 * @param {ExerciseOptions} options
 * @param {() => number} rng
 * @param {number} [avoid]  Previous note, so the same note never comes twice in a row.
 */
export function randomNote(clef, options, rng, avoid) {
  const [low, high] = RANGES[clef][options.level];
  const candidates = [];
  for (let midi = low; midi <= high; midi++) {
    if ((options.accidentals || !isBlack(midi)) && midi !== avoid) candidates.push(midi);
  }
  return candidates[Math.floor(rng() * candidates.length)];
}

/** @param {number} target @param {number} played @param {boolean} exactOctave */
export function isCorrect(target, played, exactOctave) {
  return exactOctave ? target === played : (target - played) % 12 === 0;
}

/** One running exercise: the notes on screen, which one is asked, and the score. */
export class ExerciseSession {
  /** @type {Clef} */
  clef = 'treble';
  /** @type {{ midi: number, state: NoteState }[]} */
  notes = [];
  index = 0;
  mistakesOnCurrent = 0;
  stats = { asked: 0, firstTry: 0, streak: 0, bestStreak: 0 };
  #options;
  #rng;

  /** @param {ExerciseOptions} options @param {() => number} [rng] */
  constructor(options, rng = Math.random) {
    this.#options = options;
    this.#rng = rng;
    this.next();
  }

  get options() {
    return this.#options;
  }

  get current() {
    return this.notes[this.index];
  }

  /** Start a new note (single mode) or a new row of notes (sequence mode). */
  next() {
    const { clef, mode } = this.#options;
    this.clef = clef === 'both' ? (this.#rng() < 0.5 ? 'treble' : 'bass') : clef;
    const count = mode === 'sequence' ? SEQUENCE_LENGTH : 1;
    /** @type {number | undefined} */
    let previous = this.notes.at(-1)?.midi;
    this.notes = [];
    for (let i = 0; i < count; i++) {
      previous = randomNote(this.clef, this.#options, this.#rng, previous);
      this.notes.push({ midi: previous, state: i === 0 ? 'current' : 'pending' });
    }
    this.index = 0;
    this.mistakesOnCurrent = 0;
  }

  /**
   * Answer the current note.
   * @param {number} midi
   * @returns {{ correct: boolean, hint: boolean, finished: boolean }}
   *   hint: the player should be shown the right key; finished: the note or row is done.
   */
  answer(midi) {
    const note = this.current;
    if (!isCorrect(note.midi, midi, this.#options.exactOctave)) {
      this.mistakesOnCurrent++;
      note.state = 'wrong';
      this.stats.streak = 0;
      return { correct: false, hint: this.mistakesOnCurrent >= HINT_AFTER, finished: false };
    }
    this.stats.asked++;
    if (this.mistakesOnCurrent === 0) {
      this.stats.firstTry++;
      this.stats.streak++;
      this.stats.bestStreak = Math.max(this.stats.bestStreak, this.stats.streak);
    }
    note.state = 'correct';
    this.mistakesOnCurrent = 0;
    this.index++;
    const finished = this.index >= this.notes.length;
    if (!finished) this.current.state = 'current';
    return { correct: true, hint: false, finished };
  }
}
