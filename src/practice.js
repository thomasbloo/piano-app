// Practice logic for playing a score, independent of the score renderer so it can be tested.
//
// A score is reduced to "steps": the moments where at least one note starts. Each step keeps
// its renderer cursor position (to move the cursor), its time in whole notes, and its notes.

/** @typedef {'right' | 'left'} Hand */
/** @typedef {Hand | 'both'} HandChoice */
/** @typedef {{ midi: number, hand: Hand, length: number }} StepNote  length in whole notes */
/** @typedef {{ cursor: number, time: number, measure: number, notes: StepNote[] }} Step  measure: index from 0 */

/** Seconds of tolerance either side of a note in real-time mode. */
export const TIMING_WINDOW = 0.2;

/** @param {StepNote} note @param {HandChoice} hand */
const forHand = (note, hand) => hand === 'both' || note.hand === hand;

/**
 * Keep only the steps of a passage, from bar `first` to bar `last` included (indexes from 0).
 * @param {Step[]} steps
 * @param {{ first: number, last: number } | null} passage  null for the whole piece
 */
export function inPassage(steps, passage) {
  return passage ? steps.filter((s) => s.measure >= passage.first && s.measure <= passage.last) : steps;
}

/**
 * Split steps into the notes the player must play and the notes the app plays for them.
 * Steps with nothing left for either side are dropped.
 * @param {Step[]} steps
 * @param {HandChoice} hand
 * @returns {{ cursor: number, time: number, notes: StepNote[], accompaniment: StepNote[] }[]}
 */
export function practiceSteps(steps, hand) {
  return steps
    .map((step) => ({
      cursor: step.cursor,
      time: step.time,
      measure: step.measure,
      notes: step.notes.filter((n) => forHand(n, hand)),
      accompaniment: step.notes.filter((n) => !forHand(n, hand)),
    }))
    .filter((step) => step.notes.length || step.accompaniment.length);
}

/** @typedef {ReturnType<typeof practiceSteps>[number]} PracticeStep */

/**
 * Note-by-note mode: the score waits until every note of the current step has been played.
 * Steps with only accompaniment need nothing from the player: they are handed back as
 * "passed" so the view can play them in time on the way to the next step to play.
 */
export class WaitSession {
  index = 0;
  /** @type {Set<number>} */
  #played = new Set();
  stats = { notes: 0, wrong: 0 };

  /** @param {PracticeStep[]} steps */
  constructor(steps) {
    this.steps = steps;
  }

  get current() {
    return this.steps[this.index];
  }

  get finished() {
    return this.index >= this.steps.length;
  }

  /** Notes of the current step still to play. */
  get remaining() {
    return this.finished ? [] : this.current.notes.map((n) => n.midi).filter((m) => !this.#played.has(m));
  }

  /** Move to the first step with notes to play, returning the accompaniment-only steps before it. */
  start() {
    return this.#skipAccompanimentOnly();
  }

  /**
   * @param {number} midi
   * @returns {{ result: 'hit' | 'advance' | 'wrong' | 'ignored', firstHit: boolean, step?: PracticeStep, passed: PracticeStep[] }}
   *   advance: the step is complete and the score moves on. firstHit: first right note of the step,
   *   the moment to play its accompaniment. passed: accompaniment-only steps skipped after it.
   */
  play(midi) {
    const step = this.current;
    if (this.finished) return { result: 'ignored', firstHit: false, passed: [] };
    if (!this.remaining.includes(midi)) {
      // Pressing again a note of the chord already played is not a mistake.
      if (step.notes.some((n) => n.midi === midi)) return { result: 'ignored', firstHit: false, step, passed: [] };
      this.stats.wrong++;
      return { result: 'wrong', firstHit: false, step, passed: [] };
    }
    const firstHit = this.#played.size === 0;
    this.#played.add(midi);
    this.stats.notes++;
    if (this.remaining.length) return { result: 'hit', firstHit, step, passed: [] };
    this.index++;
    this.#played.clear();
    return { result: 'advance', firstHit, step, passed: this.#skipAccompanimentOnly() };
  }

  #skipAccompanimentOnly() {
    const passed = [];
    while (!this.finished && this.current.notes.length === 0) passed.push(this.steps[this.index++]);
    return passed;
  }
}

/**
 * Real-time mode: the score moves at a fixed tempo and each note is judged on its timing.
 * Times are in seconds from the first step.
 */
export class RealtimeSession {
  /** Index of the latest step whose time has come. */
  index = -1;
  stats = { hits: 0, missed: 0, wrong: 0, total: 0 };
  /** @type {{ step: PracticeStep, at: number, hit: boolean[] , judged: boolean }[]} */
  #timeline;
  #end;

  /**
   * @param {PracticeStep[]} steps
   * @param {number} secondsPerWhole  e.g. 2.4 for 100 quarter notes per minute
   */
  constructor(steps, secondsPerWhole) {
    const start = steps[0]?.time ?? 0;
    this.#timeline = steps.map((step) => ({
      step,
      at: (step.time - start) * secondsPerWhole,
      hit: step.notes.map(() => false),
      judged: false,
    }));
    this.stats.total = steps.reduce((sum, s) => sum + s.notes.length, 0);
    const last = this.#timeline.at(-1);
    const lastLength = last ? Math.max(0, ...[...last.step.notes, ...last.step.accompaniment].map((n) => n.length)) : 0;
    this.#end = last ? last.at + lastLength * secondsPerWhole : 0;
  }

  get duration() {
    return this.#end;
  }

  /** @param {number} index */
  timeOf(index) {
    return this.#timeline[index].at;
  }

  /**
   * Move the clock forward. Returns the steps that have just started (for the cursor and the
   * accompaniment) and how many notes have just been missed.
   * @param {number} t
   */
  advance(t) {
    /** @type {PracticeStep[]} */
    const started = [];
    while (this.index + 1 < this.#timeline.length && this.#timeline[this.index + 1].at <= t) {
      this.index++;
      started.push(this.#timeline[this.index].step);
    }
    let missed = 0;
    for (const entry of this.#timeline) {
      if (entry.judged || entry.at + TIMING_WINDOW >= t) continue;
      entry.judged = true;
      missed += entry.hit.filter((h) => !h).length;
    }
    this.stats.missed += missed;
    return { started, missed, finished: t >= this.#end + TIMING_WINDOW };
  }

  /**
   * @param {number} midi
   * @param {number} t
   * @returns {'hit' | 'wrong'}
   */
  play(midi, t) {
    let best = null;
    for (const entry of this.#timeline) {
      if (Math.abs(entry.at - t) > TIMING_WINDOW) continue;
      const i = entry.step.notes.findIndex((n, j) => n.midi === midi && !entry.hit[j]);
      if (i >= 0 && (!best || Math.abs(entry.at - t) < Math.abs(best.entry.at - t))) best = { entry, i };
    }
    if (!best) {
      this.stats.wrong++;
      return 'wrong';
    }
    best.entry.hit[best.i] = true;
    this.stats.hits++;
    return 'hit';
  }
}
