import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ExerciseSession, RANGES, SEQUENCE_LENGTH, exerciseRange, isCorrect, randomNote } from '../src/exercise.js';
import { isBlack } from '../src/notes.js';

/** Deterministic random numbers so the tests are repeatable. */
function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/** @type {import('../src/exercise.js').ExerciseOptions} */
const base = { clef: 'treble', level: 'staff', accidentals: false, mode: 'single', exactOctave: true };

test('random notes stay in range, skip black keys and never repeat', () => {
  const rng = seeded();
  let previous;
  for (let i = 0; i < 500; i++) {
    const midi = randomNote('treble', base, rng, previous);
    assert.ok(midi >= RANGES.treble.staff[0] && midi <= RANGES.treble.staff[1]);
    assert.ok(!isBlack(midi));
    assert.notEqual(midi, previous);
    previous = midi;
  }
});

test('accidentals add black keys', () => {
  const rng = seeded(7);
  const notes = Array.from({ length: 300 }, () => randomNote('bass', { ...base, accidentals: true }, rng));
  assert.ok(notes.some(isBlack));
});

test('octave matters only when asked', () => {
  assert.equal(isCorrect(60, 60, true), true);
  assert.equal(isCorrect(60, 72, true), false);
  assert.equal(isCorrect(60, 72, false), true);
  assert.equal(isCorrect(60, 48, false), true);
  assert.equal(isCorrect(60, 62, false), false);
});

test('range for both clefs spans bass and treble', () => {
  assert.deepEqual(exerciseRange({ ...base, clef: 'both', level: 'ledger' }), { low: 36, high: 84 });
});

test('counts first-try answers and gives a hint after repeated mistakes', () => {
  const session = new ExerciseSession(base, seeded(3));
  const target = session.current.midi;
  assert.deepEqual(session.answer(target + 1), { correct: false, hint: false, finished: false });
  assert.deepEqual(session.answer(target + 1), { correct: false, hint: true, finished: false });
  assert.deepEqual(session.answer(target), { correct: true, hint: false, finished: true });
  assert.deepEqual(session.stats, { asked: 1, firstTry: 0, streak: 0, bestStreak: 0 });

  session.next();
  session.answer(session.current.midi);
  assert.deepEqual(session.stats, { asked: 2, firstTry: 1, streak: 1, bestStreak: 1 });
});

test('sequence mode walks through a row of notes', () => {
  const session = new ExerciseSession({ ...base, mode: 'sequence' }, seeded(5));
  assert.equal(session.notes.length, SEQUENCE_LENGTH);
  for (let i = 0; i < SEQUENCE_LENGTH; i++) {
    assert.equal(session.notes[i].state, 'current');
    const result = session.answer(session.current.midi);
    assert.equal(result.finished, i === SEQUENCE_LENGTH - 1);
  }
  assert.ok(session.notes.every((n) => n.state === 'correct'));
});

test('a new note never repeats the one just answered', () => {
  const session = new ExerciseSession(base, seeded(11));
  for (let i = 0; i < 200; i++) {
    const previous = session.current.midi;
    session.answer(previous);
    session.next();
    assert.notEqual(session.current.midi, previous);
  }
});

test('progressive levels start on the lowest Do and add one note each', async () => {
  const { stepOrder, stepCount, notePool } = await import('../src/exercise.js');
  const seq = { ...base, mode: /** @type {const} */ ('sequence'), level: /** @type {const} */ ('ledger') };
  assert.deepEqual(stepOrder('treble', seq).slice(0, 3), [60, 62, 64]);
  assert.deepEqual(stepOrder('treble', seq).slice(-2), [59, 57]);
  assert.deepEqual(stepOrder('bass', seq).slice(0, 2), [36, 38]);
  assert.deepEqual(notePool('treble', { ...seq, step: 1 }), [60, 62]);
  assert.deepEqual(notePool('treble', { ...seq, step: 2 }), [60, 62, 64]);
  // The level after the last one would be the full random set.
  const count = stepCount(seq);
  assert.equal(notePool('treble', { ...seq, step: count }).length + 1, notePool('treble', { ...seq, step: 0 }).length);
  // Sharps come after every natural note.
  const withSharps = stepOrder('treble', { ...seq, accidentals: true });
  const firstSharp = withSharps.findIndex(isBlack);
  assert.ok(withSharps.slice(firstSharp).every(isBlack));
  assert.equal(withSharps.length, RANGES.treble.ledger[1] - RANGES.treble.ledger[0] + 1);
  // Single-note mode ignores the level.
  assert.equal(notePool('treble', { ...seq, mode: 'single', step: 1 }).length, notePool('treble', seq).length);
});

test('level 1 sequences use only its two notes', () => {
  const session = new ExerciseSession({ ...base, mode: 'sequence', step: 1 }, seeded(3));
  for (let i = 0; i < 20; i++) {
    assert.ok(session.notes.every((n) => n.midi === 72 || n.midi === 74));
    session.next();
  }
});

test('every level asks for its new note at least twice per row, never twice in a row', async () => {
  const { stepOrder, stepCount, newNotes, NEW_NOTE_MIN } = await import('../src/exercise.js');
  for (const level of /** @type {const} */ (['staff', 'ledger'])) {
    for (const accidentals of [false, true]) {
      for (const clef of /** @type {const} */ (['treble', 'bass', 'both'])) {
        const opts = { ...base, clef, level, accidentals, mode: /** @type {const} */ ('sequence') };
        for (let step = 1; step <= stepCount(opts); step++) {
          const session = new ExerciseSession({ ...opts, step }, seeded(step * 7 + 1));
          for (let row = 0; row < 30; row++) {
            const notes = session.notes.map((n) => n.midi);
            const required = newNotes(session.clef, { ...opts, step });
            if (clef !== 'both') assert.ok(required.length > 0);
            if (step > 1 && required.length) assert.equal(required[0], stepOrder(session.clef, opts)[step]);
            for (const note of required) {
              assert.ok(notes.filter((m) => m === note).length >= NEW_NOTE_MIN, `level ${step}: ${notes}`);
            }
            if (step > 1) for (let i = 1; i < notes.length; i++) assert.notEqual(notes[i], notes[i - 1]);
            session.next();
          }
        }
      }
    }
  }
});
