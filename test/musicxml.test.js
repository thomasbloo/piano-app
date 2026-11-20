import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addBeams, buildMusicXml, parseNote } from '../tools/musicxml.js';
import { autoBass } from '../tools/bass.js';
import { PIECES } from '../tools/pieces.js';

test('parses notes, dotted notes, accidentals and rests', () => {
  assert.deepEqual(parseNote('E4/4'), { rest: false, step: 'E', alter: 0, octave: 4, duration: 4, type: 'quarter', dot: false });
  assert.equal(parseNote('D4/4.').duration, 6);
  assert.equal(parseNote('F#3/8').alter, 1);
  assert.equal(parseNote('r/2').rest, true);
  assert.throws(() => parseNote('H4/4'));
});

test('every starter piece has full bars in both hands', () => {
  for (const piece of PIECES) {
    const xml = buildMusicXml(piece);
    assert.match(xml, /<staves>2<\/staves>/);
    assert.ok(xml.includes(`<work-title>${piece.title}</work-title>`));
  }
});

test('rejects a bar that is too short', () => {
  assert.throws(
    () => buildMusicXml({ title: 'x', composer: 'y', beats: 4, beatType: 4, tempo: 90, right: 'C4/2', left: 'C3/1' }),
    /mesure 1, main droite/,
  );
});

test('beams eighths and sixteenths within each beat', () => {
  const notes = ['C4/8', 'D4/8', 'E4/4', 'F4/16', 'G4/16', 'A4/8', 'B4/8.', 'C5/16'].map((t) => parseNote(t));
  addBeams(/** @type {any} */ (notes), 4);
  assert.deepEqual(notes.map((n) => /** @type {any} */ (n).beams), [
    ['begin'], ['end'], undefined, ['begin', 'begin'], ['continue', 'end'], ['end'], ['begin'], ['end', 'backward hook'],
  ]);
});

test('writes a pickup bar and a key signature', () => {
  const xml = buildMusicXml({ title: 'x', composer: 'y', beats: 3, beatType: 4, tempo: 90, fifths: 1, pickup: true, right: 'D4/4 | G4/2.', left: 'r/4 | G2/2.' });
  assert.match(xml, /<measure number="0" implicit="yes">/);
  assert.match(xml, /<fifths>1<\/fifths>/);
});

test('the automatic left hand fills each bar with a fitting bass note', () => {
  assert.equal(autoBass('C4/4 E4/4 | G4/4 D4/4 | F4/4 A4/4 | C4/2', { beats: 2, beatType: 4 }), 'C3/2 | G2/2 | F2/2 | C3/2');
  assert.equal(autoBass('G4/4 | C4/2.', { beats: 3, beatType: 4, pickup: true }), 'r/4 | C3/2.');
});
