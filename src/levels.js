/** Difficulty levels a score can be tagged with, from easiest to hardest. */
export const LEVELS = ['Débutant', 'Facile', 'Intermédiaire', 'Avancé'];

/** Filter value meaning "every level". */
export const ALL_LEVELS = '';

/**
 * @template {{ level?: string }} T
 * @param {T[]} entries
 * @param {string} level  one of LEVELS, or ALL_LEVELS
 * @returns {T[]}
 */
export function filterByLevel(entries, level) {
  return level === ALL_LEVELS ? entries : entries.filter((e) => e.level === level);
}
