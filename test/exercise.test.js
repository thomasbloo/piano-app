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
