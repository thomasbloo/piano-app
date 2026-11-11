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
 * @property {number} [step]  Sequence mode only: progressive level (1 = two notes), or 0 for all notes at random.
 */

/** Note ranges in MIDI numbers. Treble: E4–F5 or A3–C6. Bass: G2–A3 or C2–E4. */
export const RANGES = {
  treble: { staff: [64, 77], ledger: [57, 84] },
  bass: { staff: [43, 57], ledger: [36, 64] },
};

export const SEQUENCE_LENGTH = 8;
/** In a progressive level, each row asks for the note that level adds at least this many times. */
export const NEW_NOTE_MIN = 2;
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
 * Order in which the progressive levels add notes, for one clef.
 * Starts on the lowest Do (C) of the range and goes up note by note to the top; the notes below
 * that Do come next, going down; sharps, when asked, come last in the same order.
 * The whole list is exactly the notes of the random exercise.
 * @param {Clef} clef
 * @param {ExerciseOptions} options
 */
export function stepOrder(clef, options) {
  const [low, high] = RANGES[clef][options.level];
  let firstC = low;
  while (firstC % 12 !== 0 && firstC <= high) firstC++;
  if (firstC > high) firstC = low;
  const ordered = [];
  for (let midi = firstC; midi <= high; midi++) ordered.push(midi);
  for (let midi = firstC - 1; midi >= low; midi--) ordered.push(midi);
  const naturals = ordered.filter((m) => !isBlack(m));
  return options.accidentals ? [...naturals, ...ordered.filter(isBlack)] : naturals;
}

/** Notes a level adds up to: level 1 has two notes, each level one more. */
export const notesAtStep = (/** @type {number} */ step) => step + 1;

/**
 * Number of progressive levels before "all notes at random". The level after the last one would
 * hold every note, which is the random exercise itself, so it is not listed twice.
 * @param {ExerciseOptions} options
 */
export function stepCount(options) {
  const clefs = options.clef === 'both' ? /** @type {Clef[]} */ (['treble', 'bass']) : [options.clef];
  return Math.max(...clefs.map((c) => stepOrder(c, options).length)) - 2;
}

/** The notes an exercise can ask for on one clef. @param {Clef} clef @param {ExerciseOptions} options */
export function notePool(clef, options) {
  const all = stepOrder(clef, options);
  const step = options.mode === 'sequence' ? options.step ?? 0 : 0;
  return (step > 0 ? all.slice(0, notesAtStep(step)) : all).sort((a, b) => a - b);
}

/**
 * The notes a progressive level must ask for in every row: the note it adds (level 1 adds two
 * notes, Do and Ré, so both). Empty for the random exercise and outside sequence mode.
 * @param {Clef} clef
 * @param {ExerciseOptions} options
 */
export function newNotes(clef, options) {
  const step = options.mode === 'sequence' ? options.step ?? 0 : 0;
  if (step <= 0) return [];
  const order = stepOrder(clef, options);
  const count = notesAtStep(step);
  // With "both" clefs one clef can run out of notes before the other: no new note on it then.
  if (count > order.length) return [];
  return step === 1 ? order.slice(0, 2) : [order[count - 1]];
}

/**
 * Make sure each of `required` appears at least `min` times in `row`, by replacing random other
 * notes, never next to the same note (unless the pool has only two notes, as in randomNote).
 * @param {number[]} row  changed in place
 * @param {number[]} required
 * @param {number} min
 * @param {() => number} rng
 * @param {boolean} noRepeat  whether two equal notes in a row must be avoided
 * @param {number} [before]  note shown just before the row
 */
export function ensureNotes(row, required, min, rng, noRepeat, before) {
  for (const note of required) {
    while (row.filter((m) => m === note).length < min) {
      const free = row.flatMap((m, i) => {
        if (m === note) return [];
        // Keep at least `min` of every other required note.
        if (required.includes(m) && row.filter((x) => x === m).length <= min) return [];
        if (noRepeat && ((i > 0 ? row[i - 1] : before) === note || row[i + 1] === note)) return [];
        return [i];
      });
      if (free.length === 0) break;
      row[free[Math.floor(rng() * free.length)]] = note;
    }
  }
}

/**
 * @param {Clef} clef
 * @param {ExerciseOptions} options
 * @param {() => number} rng
 * @param {number} [avoid]  Previous note, so the same note never comes twice in a row
 *   (except with only two notes, where that would just alternate them).
 */
export function randomNote(clef, options, rng, avoid) {
  const pool = notePool(clef, options);
  const candidates = pool.length > 2 ? pool.filter((m) => m !== avoid) : pool;
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
    const before = this.notes.at(-1)?.midi;
    /** @type {number[]} */
    const row = [];
    for (let i = 0; i < count; i++) row.push(randomNote(this.clef, this.#options, this.#rng, row.at(-1) ?? before));
    if (mode === 'sequence') {
      const noRepeat = notePool(this.clef, this.#options).length > 2;
      ensureNotes(row, newNotes(this.clef, this.#options), NEW_NOTE_MIN, this.#rng, noRepeat, before);
    }
    this.notes = row.map((midi, i) => ({ midi, state: i === 0 ? 'current' : 'pending' }));
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
