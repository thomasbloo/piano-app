import assert from 'node:assert/strict';
import { test } from 'node:test';
import { coverRange, frequency, isBlack, keyboardRange, noteName } from '../src/notes.js';

test('names middle C in both notations', () => {
  assert.equal(noteName(60, 'letters', true), 'C4');
  assert.equal(noteName(60, 'solfege'), 'Do');
  assert.equal(noteName(69, 'letters', true), 'A4');
});

test('detects black keys', () => {
  assert.equal(isBlack(61), true);
  assert.equal(isBlack(64), false);
  assert.equal(isBlack(21), false);
});

test('computes A4 at 440 Hz', () => {
  assert.ok(Math.abs(frequency(69) - 440) < 1e-9);
  assert.ok(Math.abs(frequency(81) - 880) < 1e-9);
});

test('centres ranges on middle C', () => {
  assert.deepEqual(keyboardRange(2), { low: 48, high: 72 });
  assert.deepEqual(keyboardRange(3), { low: 48, high: 84 });
  assert.deepEqual(keyboardRange(7), { low: 21, high: 108 });
});

test('widens a keyboard range to whole octaves', () => {
  assert.deepEqual(coverRange({ low: 48, high: 72 }, 36, 84), { low: 36, high: 84 });
  assert.deepEqual(coverRange({ low: 48, high: 84 }, 57, 77), { low: 48, high: 84 });
  assert.deepEqual(coverRange({ low: 48, high: 72 }, 43, 64), { low: 36, high: 72 });
});
