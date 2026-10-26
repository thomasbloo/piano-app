import { click, startNote, stopNote } from './audio.js';
import { RealtimeSession, WaitSession, inPassage, practiceSteps } from './practice.js';
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
  const otherButton = $('pr-other');
  const listenButton = $('pr-listen');
  const listenText = $('pr-listen-text');
  const passageButton = $('pr-passage');
  const passageText = $('pr-passage-text');
  const passageClear = $('pr-passage-clear');
  const scoreBox = $('score');

  const options = settings.practice;
  speedSelect.value = String(options.speed);

  function showOptions() {
    for (const b of handButtons) b.setAttribute('aria-pressed', String(b.dataset.hand === options.hand));
    for (const b of modeButtons) b.setAttribute('aria-pressed', String(b.dataset.mode === options.mode));
    keysButton.setAttribute('aria-pressed', String(options.showKeys));
    otherButton.setAttribute('aria-pressed', String(options.accompany));
    otherButton.hidden = options.hand === 'both';
  }
  showOptions();

  /** @type {any} */
  let osmd = null;
  /** @type {import('./practice.js').Step[]} */
  let steps = [];
  let cursorPosition = 0;
  /** @type {WaitSession | RealtimeSession | null} */
  let session = null;
  /** True while the app plays the piece for the player to hear. */
  let listening = false;
  /** Bars to practise, indexes from 0; null for the whole piece. @type {{ first: number, last: number } | null} */
  let passage = null;
  /** While choosing a passage: 'first' waits for the first bar, 'last' for the last one. @type {'first' | 'last' | null} */
  let picking = null;
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
  otherButton.addEventListener('click', () => {
    options.accompany = !options.accompany;
    save();
    showOptions();
  });

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
    const bar = done >= 1 ? bars : (session || listening) && osmd ? osmd.cursor.Iterator.CurrentMeasureIndex + 1 : 1;
    progress.textContent = [
      bars ? `mesure ${Math.min(bar, bars)} sur ${bars}` : '',
      inARow > 1 ? `${inARow} justes d'affilée` : '',
    ].filter(Boolean).join(' · ');
  }

  startButton.addEventListener('click', () => (session ? stop() : start()));
  listenButton.addEventListener('click', () => (listening ? stop() : listen()));

  // Choosing a passage: tap the button, then the first bar and the last bar on the score.
  passageButton.addEventListener('click', () => {
    stop();
    picking = picking ? null : 'first';
    if (picking) passage = null;
    showPassage();
  });
  passageClear.addEventListener('click', () => {
    stop();
    picking = null;
    passage = null;
    showPassage();
    showProgress(0);
  });
  scoreBox.addEventListener('click', (event) => {
    if (!picking || !osmd) return;
    const bar = measureAt(event.clientX, event.clientY);
    if (bar === null) return;
    if (picking === 'first') {
      passage = { first: bar, last: bar };
      picking = 'last';
    } else if (passage) {
      passage = { first: Math.min(passage.first, bar), last: Math.max(passage.first, bar) };
      picking = null;
    }
    showPassage();
    showProgress(0);
  });
  // The score is laid out again when the window changes size: follow it.
  window.addEventListener('resize', () => setTimeout(drawPassage, 300));

  /** Size of an OSMD unit on screen, in pixels. */
  const unit = () => 10 * (osmd?.zoom ?? 1);

  /** Box of a bar across all staves, in OSMD units. @param {number} index */
  function measureBox(index) {
    const staves = (osmd.GraphicSheet.MeasureList[index] ?? []).filter(Boolean);
    if (!staves.length) return null;
    /** @type {{ left: number, right: number, y: number }[]} */
    const boxes = staves.map((/** @type {any} */ m) => {
      const { AbsolutePosition: at, BorderLeft, BorderRight } = m.PositionAndShape;
      return { left: at.x + BorderLeft, right: at.x + BorderRight, y: at.y };
    });
    // A staff is 4 units high from its top line; leave a little room for notes just outside it.
    return {
      left: Math.min(...boxes.map((b) => b.left)),
      right: Math.max(...boxes.map((b) => b.right)),
      top: Math.min(...boxes.map((b) => b.y)) - 2,
      bottom: Math.max(...boxes.map((b) => b.y)) + 6,
    };
  }

  /** Index of the bar under a point of the screen, or null. @param {number} clientX @param {number} clientY */
  function measureAt(clientX, clientY) {
    const svg = scoreBox.querySelector('svg');
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left) / unit();
    const y = (clientY - rect.top) / unit();
    const count = osmd.GraphicSheet.MeasureList.length;
    for (let i = 0; i < count; i++) {
      const box = measureBox(i);
      if (box && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) return i;
    }
    return null;
  }

  /** Shade the bars of the passage on the score. */
  function drawPassage() {
    scoreBox.querySelectorAll('.passage-mark').forEach((el) => el.remove());
    const svg = scoreBox.querySelector('svg');
    if (!passage || !osmd || !svg) return;
    const rect = svg.getBoundingClientRect();
    const boxRect = scoreBox.getBoundingClientRect();
    const offsetX = rect.left - boxRect.left + scoreBox.scrollLeft;
    const offsetY = rect.top - boxRect.top + scoreBox.scrollTop;
    for (let i = passage.first; i <= passage.last; i++) {
      const box = measureBox(i);
      if (!box) continue;
      const mark = document.createElement('div');
      mark.className = 'passage-mark';
      mark.style.left = `${offsetX + box.left * unit()}px`;
      mark.style.top = `${offsetY + box.top * unit()}px`;
      mark.style.width = `${(box.right - box.left) * unit()}px`;
      mark.style.height = `${(box.bottom - box.top) * unit()}px`;
      scoreBox.append(mark);
    }
  }

  function showPassage() {
    scoreBox.classList.toggle('picking', !!picking);
    passageButton.setAttribute('aria-pressed', String(!!picking));
    passageClear.hidden = !passage || !!picking;
    if (picking === 'first') passageText.textContent = 'Touchez la première mesure';
    else if (picking === 'last') passageText.textContent = 'Touchez la dernière mesure';
    else if (passage) passageText.textContent = passage.first === passage.last ? `Mesure ${passage.first + 1}` : `Mesures ${passage.first + 1} à ${passage.last + 1}`;
    else passageText.textContent = 'Tout le morceau';
    drawPassage();
  }

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
    keepLineAtTop();
  }

  /** Space left above the current line for the passage and speed chips, in pixels. */
  const TOP_ROOM = 52;

  /** Scroll so the line being played sits at the top of the score and the next one shows in full below. */
  function keepLineAtTop() {
    const cursor = scoreBox.querySelector('[id^="cursorImg"]');
    if (!cursor) return;
    const top = cursor.getBoundingClientRect().top - scoreBox.getBoundingClientRect().top + scoreBox.scrollTop;
    const target = Math.max(0, top - TOP_ROOM);
    if (Math.abs(target - scoreBox.scrollTop) > 8) scoreBox.scrollTo({ top: target, behavior: 'smooth' });
  }

  /** Notes the app is sounding, so they can all be silenced when the piece is stopped. @type {Set<number>} */
  const sounding = new Set();

  /** @param {number} midi @param {number} velocity @param {number} delay seconds @param {number} length seconds */
  function sound(midi, velocity, delay, length) {
    timers.push(setTimeout(() => {
      startNote(midi, velocity);
      sounding.add(midi);
    }, delay * 1000));
    timers.push(setTimeout(() => {
      stopNote(midi);
      sounding.delete(midi);
    }, (delay + length) * 1000));
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
    if (!options.accompany) return;
    const spw = secondsPerWhole();
    for (const note of notes) {
      sound(note.midi, 70, delay, note.length * spw * 0.95);
    }
  }

  /** Steps of the passage, or of the whole piece, split for the chosen hand. */
  function playableSteps() {
    return practiceSteps(inPassage(steps, passage), options.hand);
  }

  function prepareCursor() {
    picking = null;
    showPassage();
    osmd.cursor.reset();
    cursorPosition = 0;
    osmd.cursor.show();
    keepLineAtTop();
  }

  /** Play the passage or the piece at tempo, for the player to hear how it goes. */
  function listen() {
    if (!osmd || !steps.length) return;
    stop();
    const playable = playableSteps();
    if (!playable.length) return;
    listening = true;
    listenText.textContent = 'Arrêter';
    listenButton.classList.add('playing');
    prepareCursor();
    feedback.textContent = '';
    const spw = secondsPerWhole();
    const first = playable[0].time;
    let end = 0;
    for (const step of playable) {
      const at = (step.time - first) * spw;
      timers.push(setTimeout(() => {
        moveCursor(step.cursor);
        showKeys(step.notes);
        showProgress(at / Math.max(end, 0.001));
        for (const note of step.notes) sound(note.midi, 90, 0, note.length * spw * 0.95);
        accompany(step.accompaniment);
      }, at * 1000));
      end = Math.max(end, at + Math.max(0, ...[...step.notes, ...step.accompaniment].map((n) => n.length)) * spw);
    }
    timers.push(setTimeout(() => {
      stop();
      showProgress(1);
    }, end * 1000 + 200));
  }

  function start() {
    if (!osmd || !steps.length) return;
    stop();
    const playable = playableSteps();
    if (!playable.some((s) => s.notes.length)) {
      feedback.textContent = options.hand === 'left' ? "Cette partition n'a pas de main gauche." : 'Rien à jouer pour cette main.';
      return;
    }
    startText.textContent = 'Arrêter';
    startButton.classList.add('playing');
    inARow = 0;
    prepareCursor();

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
    sounding.forEach((midi) => stopNote(midi));
    sounding.clear();
    session = null;
    listening = false;
    listenText.textContent = 'Écouter';
    listenButton.classList.remove('playing');
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
      passage = null;
      picking = null;
      showPassage();
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
