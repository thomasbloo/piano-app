import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  dayOf, flameTier, freezesNeeded, milestoneAt, nextMilestone, practised, streakDays, streakStatus, week,
} from '../src/streak.js';

test('starts a streak on the first day', () => {
  assert.deepEqual(practised(null, '2026-10-26'), {
    last: '2026-10-26', days: 1, best: 1, freezes: 0, history: ['2026-10-26'], frozen: [],
  });
});

test('counts a day only once', () => {
  const streak = { last: '2026-10-26', days: 3 };
  assert.equal(practised(streak, '2026-10-26'), streak);
});

test('grows on the next day, across months, and keeps the record', () => {
  const next = practised({ last: '2026-10-31', days: 3, best: 10 }, '2026-11-01');
  assert.equal(next.days, 4);
  assert.equal(next.best, 10);
  assert.equal(next.last, '2026-11-01');
});

test('restarts after a missed day without freeze', () => {
  const next = practised({ last: '2026-10-24', days: 5 }, '2026-10-26');
  assert.equal(next.days, 1);
  assert.equal(next.best, 5);
});

test('earns a freeze every 7 days, at most 2', () => {
  assert.equal(practised({ last: '2026-10-25', days: 6 }, '2026-10-26').freezes, 1);
  assert.equal(practised({ last: '2026-10-25', days: 13, freezes: 2 }, '2026-10-26').freezes, 2);
});

test('a freeze saves a missed day', () => {
  const streak = { last: '2026-10-24', days: 9, freezes: 1 };
  assert.equal(streakDays(streak, '2026-10-26'), 9);
  assert.equal(streakStatus(streak, '2026-10-26'), 'pending');
  assert.equal(freezesNeeded(streak, '2026-10-26'), 1);
  const next = practised(streak, '2026-10-26');
  assert.equal(next.days, 10);
  assert.equal(next.freezes, 0);
  assert.deepEqual(next.frozen, ['2026-10-25']);
});

test('still shows yesterday’s streak, but not an older one', () => {
  assert.equal(streakDays({ last: '2026-10-25', days: 5 }, '2026-10-26'), 5);
  assert.equal(streakDays({ last: '2026-10-24', days: 5 }, '2026-10-26'), 0);
  assert.equal(streakDays(null, '2026-10-26'), 0);
});

test('tells where the streak stands', () => {
  assert.equal(streakStatus(null, '2026-10-26'), 'none');
  assert.equal(streakStatus({ last: '2026-10-26', days: 2 }, '2026-10-26'), 'done');
  assert.equal(streakStatus({ last: '2026-10-25', days: 2 }, '2026-10-26'), 'pending');
  assert.equal(streakStatus({ last: '2026-10-20', days: 4 }, '2026-10-26'), 'lost');
  assert.equal(streakStatus({ last: '2026-10-20', days: 1 }, '2026-10-26'), 'none');
});

test('milestones and flame size', () => {
  assert.equal(milestoneAt(7)?.name, 'Une semaine');
  assert.equal(milestoneAt(8), null);
  assert.equal(nextMilestone(8).days, 14);
  assert.equal(nextMilestone(400).days, 500);
  assert.deepEqual([0, 1, 7, 30, 100].map(flameTier), [0, 1, 2, 3, 4]);
});

test('the week strip marks played, frozen and missed days', () => {
  const streak = { last: '2026-10-26', days: 3, history: ['2026-10-23', '2026-10-24', '2026-10-26'], frozen: ['2026-10-25'] };
  assert.deepEqual(week(streak, '2026-10-26').map((d) => d.state), ['missed', 'missed', 'missed', 'played', 'played', 'frozen', 'played']);
  assert.equal(week(null, '2026-10-26')[6].state, 'today');
});

test('formats local dates', () => {
  assert.equal(dayOf(new Date(2026, 0, 5)), '2026-01-05');
});
