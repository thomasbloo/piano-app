// The daily streak in the header: a flame that grows with the days, a panel with the week and the
// next milestone, a celebration on the first right note of the day, and optional evening reminders.
import {
  FREEZE_EVERY, MAX_FREEZES, MILESTONES, celebration, dayOf, flameTier, freezesNeeded, milestoneAt, nextMilestone,
  practised, streakDays, streakStatus, week,
} from './streak.js';

/** Where the service worker finds the streak, to remind in the evening. */
const STATE_CACHE = 'piano-state';
const STATE_KEY = 'streak-state';
const REMINDER_TAG = 'streak-reminder';
/** From this hour, a streak not yet continued today shows as at risk. */
export const RISK_HOUR = 18;

const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/** Two-layer flame; its colours come from the `tier-N` class around it. */
const FLAME = '<svg viewBox="0 0 24 28" width="100%" height="100%"><path class="flame-outer" d="M12 1c1.2 4.6 6.8 7 6.8 14.2A6.8 6.8 0 0 1 12 22a6.8 6.8 0 0 1-6.8-6.8c0-3.4 1.6-5.6 3.4-6.9 0 2.7 1.2 4.2 2.6 4.2C11.2 8.6 10 5 12 1z"/><path class="flame-inner" d="M12 10.5c.6 2.4 3.6 3.6 3.6 7.3A3.6 3.6 0 0 1 12 21.4a3.6 3.6 0 0 1-3.6-3.6c0-1.8.9-2.9 1.8-3.6 0 1.4.7 2.2 1.4 2.2-.2-2.2-.4-4 .4-5.9z"/></svg>';

/** @param {number} n @param {string} word */
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

/**
 * @param {object} deps
 * @param {import('./settings.js').Settings} deps.settings
 * @param {() => void} deps.save
 */
export function createStreakView({ settings, save }) {
  /** @template {HTMLElement} T @param {string} id @returns {T} */
  const $ = (id) => /** @type {T} */ (document.getElementById(id));
  const chip = $('streak');
  const chipFlame = $('streak-flame');
  const chipText = $('streak-text');
  const panel = $('streak-panel');
  const party = $('streak-celebration');
  chipFlame.innerHTML = FLAME;

  const today = () => dayOf(new Date());

  function showChip() {
    const day = today();
    const days = streakDays(settings.streak, day);
    const status = streakStatus(settings.streak, day);
    chip.className = `chip streak tier-${status === 'done' ? flameTier(days) : 0} ${status}`;
    chip.classList.toggle('at-risk', status === 'pending' && new Date().getHours() >= RISK_HOUR);
    chipText.textContent = status === 'pending' ? `${days} ⏳` : String(days);
    chip.title = status === 'done' ? `Série de ${plural(days, 'jour')}, assurée aujourd'hui`
      : status === 'pending' ? `Série de ${plural(days, 'jour')} : jouez aujourd'hui pour la garder`
      : 'Pas de série en cours';
  }

  function renderPanel() {
    const day = today();
    const streak = settings.streak;
    const days = streakDays(streak, day);
    const status = streakStatus(streak, day);
    const tier = status === 'done' ? flameTier(days) : 0;
    const need = freezesNeeded(streak, day);
    const message = {
      done: 'Bravo, la série est assurée pour aujourd’hui. À demain !',
      pending: need > 0
        ? `${need > 1 ? `${need} jours manqués` : 'Hier a été manqué'} : ${plural(need, 'gel')} ❄️ ${need > 1 ? 'protègent' : 'protège'} votre série si vous jouez aujourd’hui.`
        : 'Jouez au moins une bonne note aujourd’hui pour garder la flamme allumée.',
      lost: `Votre série de ${plural(streak?.days ?? 0, 'jour')} s’est éteinte. Une bonne note et c’est reparti !`,
      none: 'Jouez une bonne note dans un exercice, une gamme ou une partition pour allumer la flamme.',
    }[status];
    const goal = nextMilestone(days);
    const previous = Math.max(MILESTONES.filter((m) => m.days <= days).pop()?.days ?? 0, days >= 365 ? Math.floor(days / 100) * 100 : 0);
    const progress = Math.round((100 * (days - previous)) / (goal.days - previous));
    const strip = week(streak, day).map(({ day: d, state }) => {
      const [y, m, dd] = d.split('-').map(Number);
      const letter = DAY_LETTERS[new Date(y, m - 1, dd).getDay()];
      const mark = state === 'played' ? FLAME : state === 'frozen' ? '❄️' : '';
      return `<li class="day ${state}"><span class="day-dot">${mark}</span><span>${letter}</span></li>`;
    }).join('');
    const freezes = streak?.freezes ?? 0;

    panel.innerHTML = `
      <div class="sp-head">
        <span class="flame big tier-${tier}">${FLAME}</span>
        <div>
          <p class="sp-count">${days}</p>
          <p class="sp-label">${days > 1 ? 'jours d’affilée' : 'jour d’affilée'}</p>
        </div>
      </div>
      <p class="sp-message">${message}</p>
      <ol class="sp-week" aria-label="Les 7 derniers jours">${strip}</ol>
      <div class="sp-goal">
        <p>Prochain palier : <strong>${goal.emoji} ${goal.name}</strong> · encore ${plural(goal.days - days, 'jour')}</p>
        <div class="sp-bar"><div style="width:${Math.max(4, progress)}%"></div></div>
      </div>
      <div class="sp-stats">
        <p><strong>${Math.max(streak?.best ?? 0, days)}</strong><span>Record</span></p>
        <p><strong>${'❄️'.repeat(freezes) || '–'}</strong><span>Gels ${freezes}/${MAX_FREEZES}</span></p>
      </div>
      <p class="sp-note">Un gel ❄️ est gagné tous les ${FREEZE_EVERY} jours d’affilée (${MAX_FREEZES} au plus) : il sauve votre série si vous manquez un jour.</p>
      <label class="sp-reminder"><input type="checkbox" id="streak-reminders" ${settings.reminders ? 'checked' : ''} /> Rappel le soir si je n’ai pas encore joué</label>
      <p id="streak-reminder-status" class="sp-note"></p>`;
    const toggle = /** @type {HTMLInputElement} */ ($('streak-reminders'));
    toggle.addEventListener('change', () => void setReminders(toggle.checked));
    if (settings.reminders) void reminderStatus().then((text) => { $('streak-reminder-status').textContent = text; });
  }

  chip.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    chip.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) renderPanel();
  });
  document.addEventListener('pointerdown', (event) => {
    if (panel.hidden) return;
    const target = /** @type {Node} */ (event.target);
    if (!panel.contains(target) && !chip.contains(target)) {
      panel.hidden = true;
      chip.setAttribute('aria-expanded', 'false');
    }
  });

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let partyTimer;
  /**
   * Big flame in the middle of the screen for a few seconds; it never blocks playing.
   * @param {{ title: string, line: string, tier: number, milestone?: boolean, sad?: boolean }} show
   */
  function celebrate({ title, line, tier, milestone = false, sad = false }) {
    const sparks = milestone ? Array.from({ length: 18 }, (_, i) => `<i style="--a:${i * 20}deg;--d:${(i % 3) * 0.08}s"></i>`).join('') : '';
    party.innerHTML = `
      <div class="party-card ${milestone ? 'milestone' : ''} ${sad ? 'sad' : ''}">
        <div class="party-flame tier-${tier}">${FLAME}${sparks}</div>
        <p class="party-title">${title}</p>
        <p class="party-line">${line}</p>
      </div>`;
    party.hidden = false;
    party.classList.remove('visible');
    void party.offsetWidth;
    party.classList.add('visible');
    clearTimeout(partyTimer);
    partyTimer = setTimeout(() => {
      party.classList.remove('visible');
      setTimeout(() => { party.hidden = true; }, 400);
    }, milestone ? 4500 : 3000);
  }

  /** A right note: counts today, and celebrates the first one of the day. */
  function rightNote() {
    const before = settings.streak;
    const streak = practised(before, today());
    if (streak === before) return;
    const savedBy = freezesNeeded(before, today());
    settings.streak = streak;
    save();
    showChip();
    chip.classList.add('bump');
    setTimeout(() => chip.classList.remove('bump'), 700);
    if (!panel.hidden) renderPanel();
    void writeState();
    const milestone = milestoneAt(streak.days);
    const freezesLeft = (before?.freezes ?? 0) - (streak.days > 1 ? savedBy : 0);
    const earned = streak.days % FREEZE_EVERY === 0 && freezesLeft < MAX_FREEZES;
    const record = streak.days > 1 && streak.days === streak.best && streak.days > (before?.best ?? before?.days ?? 0) && !milestone;
    celebrate({
      title: milestone ? `${milestone.emoji} ${milestone.name} !` : `${plural(streak.days, 'jour')} d’affilée !`,
      line: [
        milestone ? `${streak.days} jours d’affilée, quelle régularité !` : record ? 'Nouveau record !' : celebration(streak.days),
        savedBy && streak.days > 1 ? `${plural(savedBy, 'gel')} ❄️ ${savedBy > 1 ? 'ont' : 'a'} sauvé votre série.` : '',
        earned ? 'Vous gagnez un gel ❄️ !' : '',
      ].filter(Boolean).join(' '),
      tier: flameTier(streak.days),
      milestone: !!milestone,
    });
  }

  // Once per broken streak, say so gently when the app opens.
  const status = streakStatus(settings.streak, today());
  if (status === 'lost' && settings.streak && settings.streakLostSeen !== settings.streak.last) {
    settings.streakLostSeen = settings.streak.last;
    save();
    setTimeout(() => celebrate({
      title: `Série de ${plural(settings.streak?.days ?? 0, 'jour')} éteinte`,
      line: `Votre record : ${settings.streak?.best ?? settings.streak?.days} jours. Une bonne note aujourd’hui rallume la flamme !`,
      tier: 0,
      sad: true,
    }), 800);
  }

  // The chip turns "at risk" in the evening, and the day changes at midnight.
  showChip();
  setInterval(showChip, 60_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) showChip(); });
  void writeState();

  /** Saves what the service worker needs to decide on a reminder. */
  async function writeState() {
    if (!('caches' in window)) return;
    try {
      const cache = await caches.open(STATE_CACHE);
      const body = JSON.stringify({ streak: settings.streak, reminders: settings.reminders, riskHour: RISK_HOUR });
      await cache.put(new URL(STATE_KEY, location.href).href, new Response(body, { headers: { 'Content-Type': 'application/json' } }));
    } catch {
      // No cache storage: reminders just won't know about the streak.
    }
  }

  /** @returns {Promise<any>} */
  async function registration() {
    if (!('serviceWorker' in navigator)) return null;
    return navigator.serviceWorker.ready;
  }

  /** @param {boolean} on */
  async function setReminders(on) {
    const statusLine = $('streak-reminder-status');
    if (on) {
      if (!('Notification' in window)) {
        statusLine.textContent = 'Ce navigateur ne gère pas les notifications.';
        /** @type {HTMLInputElement} */ ($('streak-reminders')).checked = false;
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        statusLine.textContent = 'Les notifications sont refusées. Autorisez-les pour Piano dans les réglages d’Android.';
        /** @type {HTMLInputElement} */ ($('streak-reminders')).checked = false;
        return;
      }
    }
    settings.reminders = on;
    save();
    await writeState();
    const reg = await registration();
    try {
      if (on) await reg?.periodicSync?.register(REMINDER_TAG, { minInterval: 60 * 60 * 1000 });
      else await reg?.periodicSync?.unregister(REMINDER_TAG);
    } catch {
      // Not allowed (app not installed, for example): reminderStatus explains.
    }
    statusLine.textContent = on ? await reminderStatus() : '';
  }

  /** What the reminders can do on this device. */
  async function reminderStatus() {
    const reg = await registration();
    if (!reg?.periodicSync) {
      return 'Ce navigateur ne peut pas réveiller l’app quand elle est fermée : le rappel ne viendra que si l’app est ouverte. Dans Chrome sur Android, installez l’app sur l’écran d’accueil.';
    }
    const tags = await reg.periodicSync.getTags().catch(() => []);
    if (!tags.includes(REMINDER_TAG)) {
      return 'Chrome n’a pas autorisé le réveil en arrière-plan. Installez l’app sur l’écran d’accueil puis réactivez le rappel.';
    }
    return `Activé. Si vous n’avez pas encore joué, un rappel arrive après ${RISK_HOUR} h. Android choisit le moment exact : il peut avoir un peu de retard, surtout en économie de batterie.`;
  }

  // Keeps the background check registered after an app update.
  if (settings.reminders) {
    void registration().then((reg) => reg?.periodicSync?.register(REMINDER_TAG, { minInterval: 60 * 60 * 1000 })).catch(() => {});
  }

  return { rightNote };
}
