// Days practised in a row: a day counts once at least one right note has been played.
// Like a game streak: a flame that grows, milestones to reach, and freezes that save a missed day.

/**
 * @typedef {object} Streak
 * @property {string} last  last day practised, local date YYYY-MM-DD
 * @property {number} days  days in a row up to `last`
 * @property {number} [best]  longest streak ever
 * @property {number} [freezes]  saved missed days left (earned every 7 days, at most MAX_FREEZES)
 * @property {string[]} [history]  recent days practised, oldest first
 * @property {string[]} [frozen]  recent missed days saved by a freeze
 */

/** A freeze is earned every this many days in a row. */
export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;
/** Days kept in `history` and `frozen`, enough for the calendar. */
const KEEP_DAYS = 42;

/** @typedef {{ days: number, name: string, emoji: string }} Milestone */
/** @type {Milestone[]} */
export const MILESTONES = [
  { days: 3, name: 'Bien parti', emoji: '✨' },
  { days: 7, name: 'Une semaine', emoji: '🎉' },
  { days: 14, name: 'Deux semaines', emoji: '🎹' },
  { days: 30, name: 'Un mois', emoji: '🏅' },
  { days: 50, name: 'Cinquante jours', emoji: '🌟' },
  { days: 100, name: 'Centurion', emoji: '💯' },
  { days: 200, name: 'Inarrêtable', emoji: '🚀' },
  { days: 365, name: 'Une année', emoji: '👑' },
];

/** Local date as YYYY-MM-DD. @param {Date} date */
export function dayOf(date) {
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The day `delta` days after `day` (before if negative). @param {string} day @param {number} delta */
export function addDays(day, delta) {
  const [y, m, d] = day.split('-').map(Number);
  return dayOf(new Date(y, m - 1, d + delta));
}

/** Whole days from `from` to `to`. @param {string} from @param {string} to */
function daysBetween(from, to) {
  const toUtc = (/** @type {string} */ day) => {
    const [y, m, d] = day.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86400000);
}

/** Days missed since the last practice, not counting today. @param {Streak} streak @param {string} today */
function missedDays(streak, today) {
  return Math.max(0, daysBetween(streak.last, today) - 1);
}

/** @param {string[]} list @param {string} today */
const recent = (list, today) => list.filter((day) => daysBetween(day, today) < KEEP_DAYS);

/**
 * Streak after practising on `today`. Missed days are saved by freezes when there are enough.
 * @param {Streak | null} streak
 * @param {string} today
 * @returns {Streak}
 */
export function practised(streak, today) {
  if (streak?.last === today) return streak;
  const missed = streak ? missedDays(streak, today) : 0;
  const freezes = streak?.freezes ?? 0;
  const keeps = !!streak && missed <= freezes;
  const days = keeps ? streak.days + 1 : 1;
  const saved = keeps ? Array.from({ length: missed }, (_, i) => addDays(streak.last, i + 1)) : [];
  let left = keeps ? freezes - missed : freezes;
  if (days % FREEZE_EVERY === 0) left = Math.min(MAX_FREEZES, left + 1);
  return {
    last: today,
    days,
    best: Math.max(streak?.best ?? streak?.days ?? 0, days),
    freezes: left,
    history: recent([...(streak?.history ?? []), today], today),
    frozen: recent([...(streak?.frozen ?? []), ...saved], today),
  };
}

/**
 * Days in a row as of `today`: still counts while it can be continued today.
 * @param {Streak | null} streak
 * @param {string} today
 */
export function streakDays(streak, today) {
  if (!streak) return 0;
  return missedDays(streak, today) <= (streak.freezes ?? 0) ? streak.days : 0;
}

/**
 * Where the streak stands today: `done` already practised, `pending` alive but not yet played today,
 * `lost` broken (after a streak of 2 days or more), `none` nothing going on.
 * @param {Streak | null} streak
 * @param {string} today
 * @returns {'done' | 'pending' | 'lost' | 'none'}
 */
export function streakStatus(streak, today) {
  if (!streak) return 'none';
  if (streak.last === today) return 'done';
  if (streakDays(streak, today) > 0) return 'pending';
  return streak.days >= 2 ? 'lost' : 'none';
}

/** Freezes that will be used up if the user plays today. @param {Streak | null} streak @param {string} today */
export function freezesNeeded(streak, today) {
  return streak ? missedDays(streak, today) : 0;
}

/** The milestone reached on exactly this day, if any. @param {number} days */
export function milestoneAt(days) {
  return MILESTONES.find((m) => m.days === days) ?? null;
}

/** The next milestone to reach; past the last one, every further hundred days. @param {number} days */
export function nextMilestone(days) {
  return MILESTONES.find((m) => m.days > days)
    ?? { days: (Math.floor(days / 100) + 1) * 100, name: `${(Math.floor(days / 100) + 1) * 100} jours`, emoji: '👑' };
}

/** Flame look by streak length: grows and changes colour. @param {number} days @returns {0 | 1 | 2 | 3 | 4} */
export function flameTier(days) {
  if (days <= 0) return 0;
  if (days < 7) return 1;
  if (days < 30) return 2;
  if (days < 100) return 3;
  return 4;
}

/**
 * The last 7 days ending today, for the calendar strip.
 * @param {Streak | null} streak
 * @param {string} today
 * @returns {{ day: string, state: 'played' | 'frozen' | 'missed' | 'today' }[]}
 */
export function week(streak, today) {
  const played = new Set(streak?.history ?? (streak ? [streak.last] : []));
  const frozen = new Set(streak?.frozen ?? []);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    const state = played.has(day) ? 'played' : frozen.has(day) ? 'frozen' : day === today ? 'today' : 'missed';
    return { day, state };
  });
}

/** Encouraging line after the first right note of the day. @param {number} days */
export function celebration(days) {
  if (days === 1) return 'Une nouvelle série commence. Revenez demain pour la faire grandir !';
  const lines = [
    'La flamme grandit. À demain !',
    'Encore un jour de gagné, bravo !',
    'Vos doigts vous remercient. Rendez-vous demain !',
    'Régulier comme un métronome !',
    'Chaque jour compte. Continuez comme ça !',
    'Petit à petit, le piano devient naturel.',
  ];
  return lines[days % lines.length];
}
