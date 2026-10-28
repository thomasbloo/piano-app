import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clefsFor, renderScaleStaff } from '../src/scale-staff.js';
import { SCALE_TYPES, buildScale, handShifts, isBlackKey, keySignature, scaleName, scaleRange, spelledName } from '../src/scales.js';

/** @param {import('../src/scales.js').ScaleOptions} options @param {number} [hand] */
const written = (options, hand = 0) => buildScale(options).map((s) => spelledName(s.notes[hand], 'letters') + s.notes[hand].finger).join(' ');
const base = /** @type {const} */ ({ tonic: 0, type: 'major', hand: 'right', octaves: 1, direction: 'up' });

test('spells each degree with its own letter', () => {
  assert.equal(written({ ...base, tonic: 2 }), 'D1 E2 F♯3 G1 A2 B3 C♯4 D5');
  assert.equal(written({ ...base, tonic: 5 }), 'F1 G2 A3 B♭4 C1 D2 E3 F4');
  assert.equal(written({ ...base, tonic: 8, type: 'harmonic' }), 'G♯3 A♯4 B1 C♯2 D♯3 E1 F𝄪2 G♯3');
  assert.equal(written({ ...base, tonic: 3, type: 'natural' }), 'E♭3 F1 G♭2 A♭3 B♭4 C♭1 D♭2 E♭3');
});

test('names scales in solfège or letters', () => {
  assert.equal(scaleName(6, 'major', 'solfege'), 'Gamme de Fa♯ majeur');
  assert.equal(scaleName(1, 'harmonic', 'letters'), 'Gamme de C♯ mineur harmonique');
  assert.equal(scaleName(0, 'chromatic', 'solfege'), 'Gamme chromatique sur Do');
});

test('gives the key signature in order', () => {
  assert.deepEqual(keySignature(11, 'major').map((n) => spelledName(n, 'solfege')), ['Fa♯', 'Do♯', 'Sol♯', 'Ré♯', 'La♯']);
  assert.deepEqual(keySignature(3, 'major').map((n) => spelledName(n, 'letters')), ['B♭', 'E♭', 'A♭']);
  assert.deepEqual(keySignature(9, 'harmonic'), []);
});

test('melodic minor goes up raised and comes down natural', () => {
  assert.equal(written({ ...base, tonic: 9, type: 'melodic', direction: 'updown' }), 'A1 B2 C3 D1 E2 F♯3 G♯4 A5 G4 F3 E2 D1 C3 B2 A1');
});

test('left hand starts with its bottom finger and carries on with the thumb', () => {
  assert.equal(written({ ...base, hand: 'left', octaves: 2 }), 'C5 D4 E3 F2 G1 A3 B2 C1 D4 E3 F2 G1 A3 B2 C1');
  assert.equal(written({ ...base, tonic: 11, hand: 'left' }), 'B4 C♯3 D♯2 E1 F♯4 G♯3 A♯2 B1');
});

test('right hand puts the thumb on the middle tonic and ends on its top finger', () => {
  assert.equal(written({ ...base, octaves: 2 }), 'C1 D2 E3 F1 G2 A3 B4 C1 D2 E3 F1 G2 A3 B4 C5');
});

test('the thumb never lands on a black key', () => {
  for (const type of /** @type {(keyof typeof SCALE_TYPES)[]} */ (Object.keys(SCALE_TYPES))) {
    for (let tonic = 0; tonic < 12; tonic++) {
      for (const hand of /** @type {const} */ (['right', 'left'])) {
        const steps = buildScale({ tonic, type, hand, octaves: 2, direction: 'updown' });
        for (const n of steps.map((s) => s.notes[0])) {
          assert.ok(!(n.finger === 1 && isBlackKey(n.midi)), `${type} ${tonic} ${hand} ${spelledName(n, 'letters')}`);
          assert.ok(n.finger >= 1 && n.finger <= 5);
        }
      }
    }
  }
});

test('every scale fits on a 61-key keyboard', () => {
  for (const type of /** @type {(keyof typeof SCALE_TYPES)[]} */ (Object.keys(SCALE_TYPES))) {
    for (let tonic = 0; tonic < 12; tonic++) {
      for (const hand of /** @type {const} */ (['right', 'left', 'both', 'contrary'])) {
        const { low, high } = scaleRange(buildScale({ tonic, type, hand, octaves: 2, direction: 'updown' }));
        assert.ok(low >= 36 && high <= 96, `${type} ${tonic} ${hand}`);
      }
    }
  }
});

test('both hands play an octave apart, contrary motion from the same key', () => {
  const both = buildScale({ ...base, hand: 'both' });
  assert.deepEqual(both[0].notes.map((n) => n.midi), [60, 48]);
  const contrary = buildScale({ ...base, hand: 'contrary', direction: 'updown' });
  assert.deepEqual(contrary.map((s) => s.notes.map((n) => n.midi)).slice(0, 3), [[60, 60], [62, 59], [64, 57]]);
  assert.deepEqual(contrary.at(-1)?.notes.map((n) => n.finger), [1, 1]);
});

test('chromatic scale: 3 on black keys, 2 between two white keys', () => {
  assert.equal(written({ ...base, type: 'chromatic' }), 'C1 C♯3 D1 D♯3 E1 F2 F♯3 G1 G♯3 A1 A♯3 B1 C2');
  assert.equal(written({ ...base, type: 'chromatic', hand: 'left' }), 'C1 C♯3 D1 D♯3 E2 F1 F♯3 G1 G♯3 A1 A♯3 B2 C1');
});

test('finds where the thumb passes under and the fingers cross over', () => {
  const steps = buildScale({ ...base, direction: 'updown' });
  assert.deepEqual(handShifts(steps, 'right').map((s) => spelledName(s.to, 'letters') + s.to.finger), ['F1', 'E3']);
  const left = buildScale({ ...base, hand: 'left', direction: 'updown' });
  assert.deepEqual(handShifts(left, 'left').map((s) => spelledName(s.to, 'letters') + s.to.finger), ['A3', 'G1']);
});

test('a hand changes clef only beyond three ledger lines', () => {
  const left = buildScale({ ...base, tonic: 4, hand: 'left', octaves: 2, direction: 'updown' }).map((s) => s.notes[0]);
  const clefs = clefsFor(left, 'left');
  assert.equal(clefs[0], 'bass');
  assert.ok(clefs.includes('treble'));
  assert.equal(clefs.at(-1), 'bass');
});

test('draws the fingers and a natural after an accidental', () => {
  const steps = buildScale({ ...base, tonic: 9, type: 'melodic', direction: 'updown' });
  const svg = renderScaleStaff({ steps, states: steps.map(() => 'pending'), fingers: true });
  assert.equal((svg.match(/class="finger right"/g) ?? []).length, steps.length);
  assert.ok(svg.includes(''), 'natural sign on the way down');
});

test('very high right-hand notes stay in treble clef', () => {
  const right = buildScale({ ...base, tonic: 8, type: 'harmonic', hand: 'contrary', octaves: 2 }).map((s) => s.notes[0]);
  assert.ok(clefsFor(right, 'right').every((c) => c === 'treble'));
});
