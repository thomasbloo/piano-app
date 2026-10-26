// Days practised in a row: a day counts once at least one right note has been played.

/** @typedef {{ last: string, days: number }} Streak  last: local date YYYY-MM-DD */

/** Local date as YYYY-MM-DD. @param {Date} date */
export function dayOf(date) {
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The day before, as YYYY-MM-DD. @param {string} day */
function previousDay(day) {
  const [y, m, d] = day.split('-').map(Number);
  return dayOf(new Date(y, m - 1, d - 1));
}

/**
 * Streak after practising on `today`.
 * @param {Streak | null} streak
 * @param {string} today
 * @returns {Streak}
 */
export function practised(streak, today) {
  if (streak?.last === today) return streak;
  if (streak?.last === previousDay(today)) return { last: today, days: streak.days + 1 };
  return { last: today, days: 1 };
}

/**
 * Days in a row as of `today`: still counts if the last practice was yesterday.
 * @param {Streak | null} streak
 * @param {string} today
 */
export function streakDays(streak, today) {
  if (!streak) return 0;
  return streak.last === today || streak.last === previousDay(today) ? streak.days : 0;
}
