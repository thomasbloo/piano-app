// Network first, falling back to the cache, so the app opens offline once visited.
// Also wakes up now and then (periodic background sync, Chrome on Android for an installed app)
// to remind in the evening when the streak has not been continued today.
import { dayOf, streakDays, streakStatus } from './src/streak.js';

const CACHE = 'piano-v1';
const STATE_CACHE = 'piano-state';
const STATE_KEY = 'streak-state';
const NOTIFIED_KEY = 'streak-notified';
const REMINDER_TAG = 'streak-reminder';

const sw = /** @type {any} */ (self);

sw.addEventListener('install', () => sw.skipWaiting());
sw.addEventListener('activate', (/** @type {any} */ event) => event.waitUntil(sw.clients.claim()));

sw.addEventListener('fetch', (/** @type {any} */ event) => {
  if (event.request.method !== 'GET') return;
  // Same-origin files skip the browser's HTTP cache (GitHub Pages lets it keep files for
  // 10 minutes), so a new version is never mixed with old files.
  const sameOrigin = new URL(event.request.url).origin === sw.location.origin;
  event.respondWith(
    (sameOrigin ? fetch(event.request.url, { cache: 'no-cache' }) : fetch(event.request))
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});

sw.addEventListener('periodicsync', (/** @type {any} */ event) => {
  if (event.tag === REMINDER_TAG) event.waitUntil(remind());
});

/** Shows the evening reminder once a day, if the streak is at risk. */
async function remind() {
  const cache = await caches.open(STATE_CACHE);
  const url = (/** @type {string} */ key) => new URL(key, sw.registration.scope).href;
  const state = await (await cache.match(url(STATE_KEY)))?.json();
  if (!state?.reminders) return;
  const now = new Date();
  const today = dayOf(now);
  if (now.getHours() < (state.riskHour ?? 18) || now.getHours() >= 23) return;
  if ((await (await cache.match(url(NOTIFIED_KEY)))?.text()) === today) return;
  const status = streakStatus(state.streak, today);
  if (status === 'done') return;
  const days = streakDays(state.streak, today);
  const [title, body] = status === 'pending'
    ? [`🔥 Votre série de ${days} jour${days > 1 ? 's' : ''} est en danger !`, 'Quelques notes avant minuit suffisent pour la garder.']
    : ['🎹 Un peu de piano ce soir ?', 'Une bonne note suffit pour allumer une nouvelle flamme.'];
  await sw.registration.showNotification(title, { body, icon: 'icon.svg', badge: 'icon.svg', tag: 'streak' });
  await cache.put(url(NOTIFIED_KEY), new Response(today));
}

sw.addEventListener('notificationclick', (/** @type {any} */ event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (windows.length) return windows[0].focus();
    return sw.clients.openWindow(sw.registration.scope);
  })());
});
