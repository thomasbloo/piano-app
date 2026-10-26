import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diatonicIndex, ledgerLines, renderStaff, staffPosition } from '../src/staff.js';

test('places notes on the treble staff', () => {
  assert.equal(staffPosition(64, 'treble'), 0); // E4 bottom line
  assert.equal(staffPosition(67, 'treble'), 2); // G4 second line
  assert.equal(staffPosition(77, 'treble'), 8); // F5 top line
  assert.equal(staffPosition(60, 'treble'), -2); // middle C, first ledger line below
});

test('places notes on the bass staff', () => {
  assert.equal(staffPosition(43, 'bass'), 0); // G2 bottom line
  assert.equal(staffPosition(53, 'bass'), 6); // F3 on the F line
  assert.equal(staffPosition(60, 'bass'), 10); // middle C, first ledger line above
});

test('puts sharps on the line of their natural', () => {
  assert.equal(diatonicIndex(61), diatonicIndex(60));
  assert.equal(diatonicIndex(66), diatonicIndex(65));
});

test('draws ledger lines outside the staff only', () => {
  assert.deepEqual(ledgerLines(4), []);
  assert.deepEqual(ledgerLines(9), []);
  assert.deepEqual(ledgerLines(-1), []);
  assert.deepEqual(ledgerLines(-2), [-2]);
  assert.deepEqual(ledgerLines(-5), [-2, -4]);
  assert.deepEqual(ledgerLines(12), [10, 12]);
});

test('renders one group per note, with a sharp only on black keys', () => {
  const svg = renderStaff({ clef: 'treble', notes: [{ midi: 60, state: 'current' }, { midi: 61, state: 'pending' }] });
  assert.equal(svg.match(/class="note /g)?.length, 2);
  assert.equal(svg.match(//g)?.length, 1);
  assert.match(svg, /class="note current"/);
});
