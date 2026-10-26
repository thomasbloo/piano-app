import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALL_LEVELS, filterByLevel } from '../src/levels.js';

const scores = [{ title: 'a', level: 'Débutant' }, { title: 'b', level: 'Avancé' }, { title: 'c' }];

test('keeps every score when no level is chosen', () => {
  assert.equal(filterByLevel(scores, ALL_LEVELS).length, 3);
});

test('keeps only scores of the chosen level, leaving out untagged ones', () => {
  assert.deepEqual(filterByLevel(scores, 'Avancé').map((s) => s.title), ['b']);
  assert.deepEqual(filterByLevel(scores, 'Facile'), []);
});
