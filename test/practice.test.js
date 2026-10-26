import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RealtimeSession, TIMING_WINDOW, WaitSession, inPassage, practiceSteps } from '../src/practice.js';

/** Ode to Joy, first bar: right hand E E F G in quarters over a whole C in the left hand. */
const STEPS = [
  { cursor: 0, measure: 0, time: 0, notes: [{ midi: 64, hand: 'right', length: 0.25 }, { midi: 48, hand: 'left', length: 1 }] },
  { cursor: 1, measure: 0, time: 0.25, notes: [{ midi: 64, hand: 'right', length: 0.25 }] },
  { cursor: 2, measure: 0, time: 0.5, notes: [{ midi: 65, hand: 'right', length: 0.25 }] },
  { cursor: 3, measure: 0, time: 0.75, notes: [{ midi: 67, hand: 'right', length: 0.25 }] },
  { cursor: 4, measure: 1, time: 1, notes: [{ midi: 67, hand: 'right', length: 1 }, { midi: 43, hand: 'left', length: 1 }] },
];

test('splits notes between the player and the accompaniment', () => {
  const left = practiceSteps(STEPS, 'left');
  assert.equal(left.length, 5);
  assert.deepEqual(left[0].notes.map((n) => n.midi), [48]);
  assert.deepEqual(left[0].accompaniment.map((n) => n.midi), [64]);
  assert.deepEqual(left[1].notes, []);
  const both = practiceSteps(STEPS, 'both');
  assert.deepEqual(both[0].notes.map((n) => n.midi), [64, 48]);
  assert.deepEqual(both[0].accompaniment, []);
});

test('note by note: waits for the whole chord and counts mistakes', () => {
  const session = new WaitSession(practiceSteps(STEPS, 'both'));
  assert.deepEqual(session.start(), []);
  assert.deepEqual(session.play(64), { result: 'hit', firstHit: true, step: session.current, passed: [] });
  assert.equal(session.play(64).result, 'ignored');
  assert.equal(session.play(50).result, 'wrong');
  assert.equal(session.play(48).result, 'advance');
  assert.equal(session.index, 1);
  for (const midi of [64, 65, 67, 67]) session.play(midi);
  assert.equal(session.play(43).result, 'advance');
  assert.equal(session.finished, true);
  assert.deepEqual(session.stats, { notes: 7, wrong: 1 });
});

test('note by note, left hand: right-hand-only steps are passed to the accompaniment', () => {
  const session = new WaitSession(practiceSteps(STEPS, 'left'));
  session.start();
  const result = session.play(48);
  assert.equal(result.result, 'advance');
  assert.deepEqual(result.passed.map((s) => s.cursor), [1, 2, 3]);
  assert.equal(session.current.cursor, 4);
});

test('real time: judges notes inside the timing window', () => {
  // 100 quarter notes per minute: a whole note lasts 2.4 s, a quarter 0.6 s.
  const session = new RealtimeSession(practiceSteps(STEPS, 'right'), 2.4);
  assert.deepEqual(session.advance(0).started.map((s) => s.cursor), [0]);
  assert.equal(session.play(64, 0.05), 'hit');
  assert.equal(session.play(64, 0.6 + TIMING_WINDOW - 0.01), 'hit'); // late but in time
  assert.equal(session.play(70, 1.2), 'wrong');
  assert.equal(session.play(65, 2.0), 'wrong'); // far too late
  const { missed } = session.advance(2.1);
  assert.equal(missed, 2); // F and G were never played
  assert.equal(session.play(67, 2.4), 'hit');
  assert.equal(session.advance(4.8 + TIMING_WINDOW + 0.01).finished, true);
  assert.deepEqual(session.stats, { hits: 3, missed: 2, wrong: 2, total: 5 });
});

test('real time: the same key played twice takes the closest note', () => {
  const session = new RealtimeSession(practiceSteps(STEPS, 'right'), 0.4); // quarters 0.1 s apart
  assert.equal(session.play(64, 0.11), 'hit');
  assert.equal(session.play(64, 0.12), 'hit');
  assert.equal(session.play(64, 0.13), 'wrong');
});

test('keeps the steps of the chosen bars only', () => {
  assert.equal(inPassage(STEPS, null).length, 5);
  assert.deepEqual(inPassage(STEPS, { first: 1, last: 1 }).map((s) => s.cursor), [4]);
  assert.deepEqual(inPassage(STEPS, { first: 0, last: 0 }).map((s) => s.cursor), [0, 1, 2, 3]);
});
