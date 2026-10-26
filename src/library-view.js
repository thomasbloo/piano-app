import { LEVELS, filterByLevel } from './levels.js';
import { scoreInfo } from './score-info.js';
import { colorHands } from './score-steps.js';
import { deleteScore, getScore, listScores, saveScore } from './storage.js';

/** @typedef {{ id: string, title: string, composer: string, level?: string, file?: string, imported: boolean }} LibraryEntry */

/** @type {Promise<void> | null} */
let osmdScript = null;

/** OpenSheetMusicDisplay is large, so it is only loaded when a score is first opened. */
function loadOsmd() {
  osmdScript ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'vendor/opensheetmusicdisplay.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Impossible de charger le moteur de partitions.'));
    document.head.append(script);
  });
  return osmdScript;
}

/**
 * Read a file as text, or as a binary string for compressed .mxl, which OSMD unzips itself.
 * @param {File} file
 */
async function readScoreFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (!isZip) return new TextDecoder().decode(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return binary;
}

/**
 * @param {object} deps
 * @param {(osmd: any) => void} deps.onScoreOpened  Called with the renderer once a score is shown.
 * @param {() => void} deps.onScoreClosed
 */
export function createLibraryView({ onScoreOpened, onScoreClosed }) {
  const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
  const list = $('lib-list');
  const listPanel = $('lib-index');
  const viewer = $('lib-viewer');
  const viewerTitle = $('lib-viewer-title');
  const scoreBox = $('score');
  const status = $('lib-status');
  const fileInput = /** @type {HTMLInputElement} */ ($('lib-file'));
  const importLevel = /** @type {HTMLSelectElement} */ ($('lib-level'));
  const filter = /** @type {HTMLSelectElement} */ ($('lib-filter'));

  importLevel.append(...LEVELS.map((level) => new Option(level, level)));
  filter.append(...LEVELS.map((level) => new Option(level, level)));
  filter.addEventListener('change', () => void refresh());

  /** @type {any} */
  let osmd = null;

  async function refresh() {
    /** @type {LibraryEntry[]} */
    let builtIn = [];
    try {
      const response = await fetch('scores/index.json');
      builtIn = (await response.json()).map((/** @type {any} */ e) => ({ ...e, imported: false }));
    } catch {
      status.textContent = 'Impossible de lire la liste des partitions intégrées.';
    }
    /** @type {LibraryEntry[]} */
    let imported = [];
    try {
      imported = (await listScores()).map((s) => ({ id: s.id, title: s.title, composer: s.composer, level: s.level, imported: true }));
    } catch {
      status.textContent = 'Le stockage du navigateur est indisponible : les partitions importées ne seront pas gardées.';
    }
    list.innerHTML = '';
    builtIn = filterByLevel(builtIn, filter.value);
    imported = filterByLevel(imported, filter.value);
    if (!builtIn.length && !imported.length) {
      const empty = document.createElement('p');
      empty.className = 'status';
      empty.textContent = `Aucune partition de niveau « ${filter.value} ».`;
      list.append(empty);
    }
    for (const [heading, entries] of /** @type {[string, LibraryEntry[]][]} */ ([['Morceaux inclus', builtIn], ['Mes partitions', imported]])) {
      if (!entries.length) continue;
      const h = document.createElement('h2');
      h.textContent = heading;
      list.append(h);
      const ul = document.createElement('ul');
      ul.className = 'score-list';
      for (const entry of entries) ul.append(row(entry));
      list.append(ul);
    }
  }

  /** @param {LibraryEntry} entry */
  function row(entry) {
    const li = document.createElement('li');
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'score-open';
    const title = document.createElement('strong');
    title.textContent = entry.title;
    const meta = document.createElement('span');
    // Imported scores show their level in an editable list instead.
    meta.textContent = [entry.composer, entry.imported ? '' : entry.level].filter(Boolean).join(' · ');
    open.append(title, meta);
    open.addEventListener('click', () => void openScore(entry));
    li.append(open);
    if (entry.imported) {
      const level = document.createElement('select');
      level.className = 'score-level';
      level.setAttribute('aria-label', `Niveau de ${entry.title}`);
      if (!entry.level) level.append(new Option('Niveau ?', ''));
      level.append(...LEVELS.map((l) => new Option(l, l)));
      level.value = entry.level ?? '';
      level.addEventListener('change', async () => {
        const stored = await getScore(entry.id);
        if (!stored) return;
        await saveScore({ ...stored, level: level.value });
        await refresh();
      });
      li.append(level);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'score-delete';
      remove.textContent = 'Supprimer';
      remove.setAttribute('aria-label', `Supprimer ${entry.title}`);
      remove.addEventListener('click', async () => {
        if (!confirm(`Supprimer « ${entry.title} » de vos partitions ?`)) return;
        await deleteScore(entry.id);
        await refresh();
      });
      li.append(remove);
    }
    return li;
  }

  /** @param {LibraryEntry} entry */
  async function openScore(entry) {
    status.textContent = 'Chargement…';
    try {
      const content = entry.imported
        ? (await getScore(entry.id))?.content
        : await (await fetch(/** @type {string} */ (entry.file))).text();
      if (!content) throw new Error('Partition introuvable.');
      await loadOsmd();
      listPanel.hidden = true;
      viewer.hidden = false;
      viewerTitle.textContent = entry.title;
      const OSMD = /** @type {any} */ (window).opensheetmusicdisplay.OpenSheetMusicDisplay;
      osmd ??= new OSMD(scoreBox, {
        autoResize: true,
        backend: 'svg',
        drawTitle: false,
        drawComposer: false,
        drawPartNames: false,
        cursorsOptions: [{ type: 0, color: '#ffd166', alpha: 0.6, follow: true }],
      });
      // Scroll the page along with the cursor while playing.
      osmd.FollowCursor = true;
      await osmd.load(content);
      colorHands(osmd);
      // Smaller on phones so several bars fit on a line.
      osmd.zoom = scoreBox.clientWidth < 600 ? 0.6 : 1;
      osmd.render();
      status.textContent = '';
      onScoreOpened(osmd);
    } catch (error) {
      listPanel.hidden = false;
      viewer.hidden = true;
      status.textContent = `Impossible d'ouvrir cette partition. ${error instanceof Error ? error.message : ''}`;
    }
  }

  fileInput.addEventListener('change', async () => {
    const files = [...(fileInput.files ?? [])];
    fileInput.value = '';
    let added = 0;
    for (const file of files) {
      const content = await readScoreFile(file);
      const { title, composer } = scoreInfo(content, file.name);
      await saveScore({ id: crypto.randomUUID(), title, composer, level: importLevel.value, content, addedAt: Date.now() });
      added++;
    }
    status.textContent = added ? `${added} partition${added > 1 ? 's' : ''} ajoutée${added > 1 ? 's' : ''}.` : '';
    await refresh();
  });

  $('lib-back').addEventListener('click', () => {
    onScoreClosed();
    viewer.hidden = true;
    listPanel.hidden = false;
  });

  void refresh();
}
