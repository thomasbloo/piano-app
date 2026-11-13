import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchVersion, isNewVersion } from '../src/update.js';

test('reloads only when both versions are known and differ', () => {
  assert.equal(isNewVersion('abc', 'def'), true);
  assert.equal(isNewVersion('abc', 'abc'), false);
  assert.equal(isNewVersion(null, 'def'), false);
  assert.equal(isNewVersion('abc', null), false);
});

test('reads the published version, or null when offline or missing', async () => {
  const ok = /** @type {any} */ (async () => new Response('abc123\n'));
  const missing = /** @type {any} */ (async () => new Response('', { status: 404 }));
  const offline = /** @type {any} */ (async () => { throw new TypeError('offline'); });
  assert.equal(await fetchVersion(ok), 'abc123');
  assert.equal(await fetchVersion(missing), null);
  assert.equal(await fetchVersion(offline), null);
});
