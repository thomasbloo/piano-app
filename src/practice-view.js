import { click, startNote, stopNote } from './audio.js';
import { RealtimeSession, WaitSession, practiceSteps } from './practice.js';
import { readSteps, scoreTempo } from './score-steps.js';

/**
 * Practice bar under an open score: choose the hand and the mode, then play along.
 * @param {object} deps
 * @param {import('./settings.js').Settings} deps.settings
 * @param {() => void} deps.save
 * @param {import('./keyboard.js').Keyboard} deps.keyboard
 * @param {() => void} deps.onRangeChange
 */
export function createPracticeView({ settings, save, keyboard, onRangeChange }) {
  const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
  const handSelect = /** @type {HTMLSelectElement} */ ($('pr-hand'));
  const modeSelect = /** @type {HTMLSelectElement} */ ($('pr-mode'));
  const speedSelect = /** @type {HTMLSelectElement} */ ($('pr-speed'));
  const keysCheck = /** @type {HTMLInputElement} */ ($('pr-keys'));
  const startButton = /** @type {HTMLButtonElement} */ ($('pr-start'));
  const feedback = $('pr-feedback');

  const options = settings.practice;
  handSelect.value = options.hand;
  modeSelect.value = options.mode;
  speedSelect.value = String(options.speed);
  keysCheck.checked = options.showKeys;

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

  const secondsPerWhole = () => 240 / (scoreTempo(osmd) * options.speed);
  const now = () => performance.now() / 1000;

  // Showing the next key can be switched on and off while playing.
  keysCheck.addEventListener('change', () => {
    options.showKeys = keysCheck.checked;
    save();
    keyboard.setExpected(options.showKeys ? expected : []);
  });

  for (const input of [handSelect, modeSelect, speedSelect]) {
    input.addEventListener('change', () => {
      stop();
      options.hand = /** @type {any} */ (handSelect.value);
      options.mode = /** @type {any} */ (modeSelect.value);
      options.speed = Number(speedSelect.value);
      save();
      feedback.textContent = '';
    });
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

  /** Keys of the next notes to play, kept so the hint can be switched on mid-piece. @type {number[]} */
  let expected = [];

  /** @param {number[]} midis */
  function showKeys(midis) {
    expected = midis;
    keyboard.setExpected(options.showKeys ? midis : []);
  }

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
    startButton.textContent = 'Arrêter';
    osmd.cursor.reset();
    cursorPosition = 0;
    osmd.cursor.show();

    if (options.mode === 'wait') {
      const wait = new WaitSession(playable);
      session = wait;
      const intro = wait.start();
      intro.forEach((s) => accompany(s.accompaniment, (s.time - intro[0].time) * secondsPerWhole()));
      moveCursor(wait.current.cursor);
      showKeys(wait.remaining);
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
          showKeys(step.notes.map((n) => n.midi));
        }
        if (started.length && t < 0.5) feedback.textContent = '';
        if (missed) feedback.textContent = missed > 1 ? `${missed} notes manquées` : 'Note manquée';
        if (finished) {
          const { hits, missed: allMissed, wrong, total } = realtime.stats;
          stop();
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
    startButton.textContent = 'Commencer';
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
        return;
      }
      const result = session.play(midi);
      if (result.result === 'ignored') return;
      if (result.result === 'wrong') {
        keyboard.flash(midi, 'wrong');
        return;
      }
      keyboard.flash(midi, 'correct');
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
        feedback.textContent = `Terminé en ${Math.floor(seconds / 60)} min ${seconds % 60} s : ${notes} notes, ${wrong} erreur${wrong > 1 ? 's' : ''}.`;
        return;
      }
      moveCursor(session.current.cursor);
      showKeys(session.remaining);
    },
  };
}
