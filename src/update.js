// An installed app on Android can stay open in the background for days, running the code it
// loaded the first time. This checks the published version whenever the app comes back to the
// screen, and reloads it when a new one is out, so fixes reach the tablet without closing the app.

/** File the Pages workflow writes with the published commit. */
const VERSION_URL = 'version.txt';

/** @param {typeof fetch} fetchFn @returns {Promise<string | null>} null when offline or not published. */
export async function fetchVersion(fetchFn = fetch) {
  try {
    const response = await fetchFn(VERSION_URL, { cache: 'no-store' });
    return response.ok ? (await response.text()).trim() || null : null;
  } catch {
    return null;
  }
}

/** Whether the app should reload: both versions are known and they differ. @param {string | null} loaded @param {string | null} latest */
export const isNewVersion = (loaded, latest) => loaded !== null && latest !== null && loaded !== latest;

/** Remember the running version, then reload when the app is shown again and a newer one is out. */
export function watchForUpdates() {
  /** @type {string | null} */
  let loaded = null;
  void fetchVersion().then((v) => { loaded = v; });
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) return;
    const latest = await fetchVersion();
    if (loaded === null) loaded = latest;
    else if (isNewVersion(loaded, latest)) location.reload();
  });
}
