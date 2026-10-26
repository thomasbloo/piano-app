import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scoreInfo } from '../src/score-info.js';

test('reads title and composer from MusicXML', () => {
  const xml = '<work><work-title>Lettre &amp; air</work-title></work><creator type="composer">J. S. Bach</creator>';
  assert.deepEqual(scoreInfo(xml, 'x.musicxml'), { title: 'Lettre & air', composer: 'J. S. Bach' });
});

test('falls back to the movement title, then the file name', () => {
  assert.equal(scoreInfo('<movement-title>Menuet</movement-title>', 'a.xml').title, 'Menuet');
  assert.equal(scoreInfo('<score-partwise/>', 'gymnopedie_no-1.musicxml').title, 'gymnopedie no 1');
  assert.deepEqual(scoreInfo('PK\u0003\u0004...', 'Clair-de-lune.mxl'), { title: 'Clair de lune', composer: '' });
});
