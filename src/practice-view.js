import { click, startNote, stopNote } from './audio.js';
import { RealtimeSession, WaitSession, practiceSteps } from './practice.js';
import { readSteps, scoreTempo } from './score-steps.js';

/** How long the "Bravo !" or "Oups" badge stays on the score, in ms. */
const TOAST_TIME = 700;

/**
 * Practice bar under an open score: choose the hand and the mode, then play along.
 * @param {object} deps
 * @param {import('./settings.js').Settings} deps.settings
 * @param {() => void} deps.save
 * @param {import('./keyboard.js').Keyboard} deps.keyboard
 * @param {() => void} deps.onRangeChange
 * @param {() => void} deps.onRightNote  Called on each right note, to count the day in the streak.
 */
export function createPracticeView({ settings, save, keyboard, onRangeChange, onRightNote }) {
  const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
  const handButtons = /** @type {HTMLButtonElement[]} */ ([...document.querySelectorAll('#lib-viewer [data-hand]')]);
  const modeButtons = /** @type {HTMLButtonElement[]} */ ([...document.querySelectorAll('#lib-viewer [data-mode]')]);
  const speedSelect = /** @type {HTMLSelectElement} */ ($('pr-speed'));
  const keysButton = $('pr-keys');
  const startButton = /** @type {HTMLButtonElement} */ ($('pr-start'));
  const startText = $('pr-start-text');
  const feedback = $('pr-feedback');
  const toast = $('pr-toast');
  const ring = $('pr-ring');
  const percent = $('pr-percent');
  const progress = $('pr-progress');

  const options = settings.practice;
  speedSelect.value = String(options.speed);

  function showOptions() {
    for (const b of handButtons) b.setAttribute('aria-pressed', String(b.dataset.hand === options.hand));
    for (const b of modeButtons) b.setAttribute('aria-pressed', String(b.dataset.mode === options.mode));
    keysButton.setAttribute('aria-pressed', String(options.showKeys));
  }
  showOptions();

  /** @type {any} */
  let osmd = null;
  /** @type {import('./practice.js').Step[]} */
  let steps = [];
  let cursorPosition = 0;
  /** @type {WaitSession | RealtimeSession | null} */
  let session = null;
  let startedAt = 0;
  let frame = 0;
  /** @type {ReturnType<typeof setTimeout>[]} */
  let timers = [];
  /** Right notes in a row, reset by a wrong or missed note. */
  let inARow = 0;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let toastTimer;

  const secondsPerWhole = () => 240 / (scoreTempo(osmd) * options.speed);
  const now = () => performance.now() / 1000;

  // Showing the next key can be switched on and off while playing.
  keysButton.addEventListener('click', () => {
    options.showKeys = !options.showKeys;
    save();
    showOptions();
    keyboard.setExpected(options.showKeys ? expected : []);
  });

  /** Any change of hand, mode or speed stops the piece. */
  function changed() {
    stop();
    save();
    showOptions();
    feedback.textContent = '';
    showProgress(0);
  }
  for (const b of handButtons) b.addEventListener('click', () => { options.hand = /** @type {any} */ (b.dataset.hand); changed(); });
  for (const b of modeButtons) b.addEventListener('click', () => { options.mode = /** @type {any} */ (b.dataset.mode); changed(); });
  speedSelect.addEventListener('change', () => { options.speed = Number(speedSelect.value); changed(); });

  /** @param {'correct' | 'wrong'} kind */
  function showToast(kind) {
    toast.textContent = kind === 'correct' ? 'Bravo !' : 'Oups';
    toast.className = `toast ${kind} visible`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), TOAST_TIME);
  }

  /** @param {boolean} right */
  function judged(right) {
    inARow = right ? inARow + 1 : 0;
    if (right) onRightNote();
    showToast(right ? 'correct' : 'wrong');
  }

  /** Progress ring and the line under the title. @param {number} done  share of the piece played, 0 to 1 */
  function showProgress(done) {
    const value = Math.round(done * 100);
    ring.setAttribute('stroke-dasharray', `${value} 100`);
    percent.textContent = `${value}%`;
    const bars = osmd?.Sheet?.SourceMeasures?.length ?? 0;
    const bar = done >= 1 ? bars : session && osmd ? osmd.cursor.Iterator.CurrentMeasureIndex + 1 : 1;
    progress.textContent = [
      osmd?.Sheet?.ComposerString,
      bars ? `mesure ${Math.min(bar, bars)} sur ${bars}` : '',
      inARow > 1 ? `${inARow} justes d'affilée` : '',
    ].filter(Boolean).join(' · ');
  }

  startButton.addEventListener('click', () => (session ? stop() : start()));

  /** @param {number} position */
  function moveCursor(position) {
    if (position < cursorPosition) {
      osmd.cursor.reset();
      cursorPosition = 0;
    }
    while (cursorPosition < position) {
      osmd.cursor.next();
      cursorPosition++;
    }
  }

  /** Next notes to play, kept so the hint can be switched on mid-piece. @type {import('./practice.js').StepNote[]} */
  let expected = [];

  /** @param {import('./practice.js').StepNote[]} notes */
  function showKeys(notes) {
    expected = notes;
    keyboard.setExpected(options.showKeys ? notes : []);
  }

  /** Notes of the current step still to play in note-by-note mode. @param {WaitSession} wait */
  const waitingNotes = (wait) => (wait.finished ? [] : wait.current.notes.filter((n) => wait.remaining.includes(n.midi)));

  /** Play the other hand's notes for as long as they last. @param {import('./practice.js').StepNote[]} notes @param {number} delay seconds */
  function accompany(notes, delay = 0) {
    const spw = secondsPerWhole();
    for (const note of notes) {
      timers.push(setTimeout(() => startNote(note.midi, 70), delay * 1000));
      timers.push(setTimeout(() => stopNote(note.midi), (delay + note.length * spw * 0.95) * 1000));
    }
  }

  function start() {
    if (!osmd || !steps.length) return;
    const playable = practiceSteps(steps, options.hand);
    if (!playable.some((s) => s.notes.length)) {
      feedback.textContent = options.hand === 'left' ? "Cette partition n'a pas de main gauche." : 'Rien à jouer pour cette main.';
      return;
    }
    startText.textContent = 'Arrêter';
    startButton.classList.add('playing');
    inARow = 0;
    osmd.cursor.reset();
    cursorPosition = 0;
    osmd.cursor.show();

    if (options.mode === 'wait') {
      const wait = new WaitSession(playable);
      session = wait;
      const intro = wait.start();
      intro.forEach((s) => accompany(s.accompaniment, (s.time - intro[0].time) * secondsPerWhole()));
      moveCursor(wait.current.cursor);
      showKeys(waitingNotes(wait));
      showProgress(0);
      startedAt = now();
      feedback.textContent = 'Jouez les notes sous le curseur. La partition vous attend.';
      return;
    }

    const realtime = new RealtimeSession(playable, secondsPerWhole());
    session = realtime;
    // One bar of four clicks before the music starts.
    const beat = secondsPerWhole() / 4;
    for (let i = 0; i < 4; i++) timers.push(setTimeout(() => click(i === 0), i * beat * 1000));
    startedAt = now() + 4 * beat;
    feedback.textContent = 'Préparez-vous…';
    const tick = () => {
      const t = now() - startedAt;
      if (t >= 0) {
        const { started, missed, finished } = realtime.advance(t);
        for (const step of started) {
          moveCursor(step.cursor);
          accompany(step.accompaniment);
          showKeys(step.notes);
        }
        if (started.length) showProgress(Math.min(1, t / realtime.duration));
        if (started.length && t < 0.5) feedback.textContent = '';
        if (missed) {
          inARow = 0;
          feedback.textContent = missed > 1 ? `${missed} notes manquées` : 'Note manquée';
        }
        if (finished) {
          const { hits, missed: allMissed, wrong, total } = realtime.stats;
          stop();
          showProgress(1);
          feedback.textContent = `Terminé : ${hits}/${total} notes justes et à temps (${Math.round((100 * hits) / total)} %), ${allMissed} manquée${allMissed > 1 ? 's' : ''}, ${wrong} fausse${wrong > 1 ? 's' : ''} note${wrong > 1 ? 's' : ''}.`;
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(frame);
    timers.forEach(clearTimeout);
    timers = [];
    session = null;
    startText.textContent = 'Jouer';
    startButton.classList.remove('playing');
    showKeys([]);
    osmd?.cursor.hide();
  }

  return {
    /** Called when a new score has been rendered. @param {any} instance */
    setScore(instance) {
      stop();
      osmd = instance;
      steps = readSteps(osmd);
      feedback.textContent = '';
      showProgress(0);
      onRangeChange();
    },

    /** Lowest and highest notes of the open score, so the keyboard can show them all. */
    range() {
      const midis = steps.flatMap((s) => s.notes.map((n) => n.midi));
      return midis.length ? { low: Math.min(...midis), high: Math.max(...midis) } : null;
    },

    stop,

    /** @param {number} midi */
    play(midi) {
      if (!session) return;
      if (session instanceof RealtimeSession) {
        const result = session.play(midi, now() - startedAt);
        keyboard.flash(midi, result === 'hit' ? 'correct' : 'wrong');
        judged(result === 'hit');
        return;
      }
      const result = session.play(midi);
      if (result.result === 'ignored') return;
      if (result.result === 'wrong') {
        keyboard.flash(midi, 'wrong');
        judged(false);
        showProgress(session.index / session.steps.length);
        return;
      }
      keyboard.flash(midi, 'correct');
      judged(true);
      const spw = secondsPerWhole();
      if (result.firstHit && result.step) accompany(result.step.accompaniment);
      if (result.result === 'advance' && result.step) {
        const from = /** @type {import('./practice.js').PracticeStep} */ (result.step).time;
        result.passed.forEach((s) => accompany(s.accompaniment, (s.time - from) * spw));
      }
      if (session.finished) {
        const { notes, wrong } = session.stats;
        const seconds = Math.round(now() - startedAt);
        stop();
        showProgress(1);
        feedback.textContent = `Terminé en ${Math.floor(seconds / 60)} min ${seconds % 60} s : ${notes} notes, ${wrong} erreur${wrong > 1 ? 's' : ''}.`;
        return;
      }
      moveCursor(session.current.cursor);
      showKeys(waitingNotes(session));
      showProgress(session.index / session.steps.length);
    },
  };
}
