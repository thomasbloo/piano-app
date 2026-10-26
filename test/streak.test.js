import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dayOf, practised, streakDays } from '../src/streak.js';

test('starts a streak on the first day', () => {
  assert.deepEqual(practised(null, '2026-10-26'), { last: '2026-10-26', days: 1 });
});

test('counts a day only once', () => {
  const streak = { last: '2026-10-26', days: 3 };
  assert.equal(practised(streak, '2026-10-26'), streak);
});

test('grows on the next day, across months', () => {
  assert.deepEqual(practised({ last: '2026-10-31', days: 3 }, '2026-11-01'), { last: '2026-11-01', days: 4 });
});

test('restarts after a missed day', () => {
  assert.deepEqual(practised({ last: '2026-10-24', days: 5 }, '2026-10-26'), { last: '2026-10-26', days: 1 });
});

test('still shows yesterday’s streak, but not an older one', () => {
  assert.equal(streakDays({ last: '2026-10-25', days: 5 }, '2026-10-26'), 5);
  assert.equal(streakDays({ last: '2026-10-24', days: 5 }, '2026-10-26'), 0);
  assert.equal(streakDays(null, '2026-10-26'), 0);
});

test('formats local dates', () => {
  assert.equal(dayOf(new Date(2026, 0, 5)), '2026-01-05');
});
