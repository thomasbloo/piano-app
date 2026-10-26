// Imported scores live in IndexedDB: MusicXML files are often too big for localStorage.

/**
 * @typedef {object} StoredScore
 * @property {string} id
 * @property {string} title
 * @property {string} composer
 * @property {string} content  MusicXML text, or the raw bytes of an .mxl file as a binary string.
 * @property {number} addedAt
 */

const DB_NAME = 'piano';
const STORE = 'scores';

/** @type {Promise<IDBDatabase> | null} */
let dbPromise = null;

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

/**
 * @template T
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => IDBRequest<T>} action
 * @returns {Promise<T>}
 */
async function run(mode, action) {
  const store = (await db()).transaction(STORE, mode).objectStore(STORE);
  return new Promise((resolve, reject) => {
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** @returns {Promise<StoredScore[]>} */
export async function listScores() {
  const scores = /** @type {StoredScore[]} */ (await run('readonly', (s) => s.getAll()));
  return scores.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
}

/** @param {string} id @returns {Promise<StoredScore | undefined>} */
export const getScore = (id) => run('readonly', (s) => s.get(id));

/** @param {StoredScore} score */
export const saveScore = (score) => run('readwrite', (s) => s.put(score));

/** @param {string} id */
export const deleteScore = (id) => run('readwrite', (s) => s.delete(id));
