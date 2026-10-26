import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMusicXml, parseNote } from '../tools/musicxml.js';
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
