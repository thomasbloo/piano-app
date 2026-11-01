import { ExerciseSession, exerciseRange, notesAtStep, stepCount, stepOrder } from './exercise.js';
import { noteName } from './notes.js';
import { renderStaff } from './staff.js';

/** Delay before the next note or row appears, so the player sees the green note. */
const NEXT_DELAY = 500;

/**
 * Wires the exercise panel to the shared keyboard.
 * @param {object} deps
 * @param {import('./settings.js').Settings} deps.settings
 * @param {() => void} deps.save
 * @param {import('./keyboard.js').Keyboard} deps.keyboard
 * @param {() => void} deps.onRangeChange  Called when the exercise needs a different keyboard range.
 * @param {() => void} deps.onRightNote  Called on each right answer, to count the day in the streak.
 */
export function createExerciseView({ settings, save, keyboard, onRangeChange, onRightNote }) {
  const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
  const clefSelect = /** @type {HTMLSelectElement} */ ($('ex-clef'));
  const levelSelect = /** @type {HTMLSelectElement} */ ($('ex-level'));
  const modeSelect = /** @type {HTMLSelectElement} */ ($('ex-mode'));
  const stepSelect = /** @type {HTMLSelectElement} */ ($('ex-step'));
  const stepLabel = $('ex-step-label');
  const accidentalsCheck = /** @type {HTMLInputElement} */ ($('ex-accidentals'));
  const octaveCheck = /** @type {HTMLInputElement} */ ($('ex-octave'));
  const staff = $('staff');
  const feedback = $('ex-feedback');
  const stats = $('ex-stats');

  const options = settings.exercise;
  clefSelect.value = options.clef;
  levelSelect.value = options.level;
  modeSelect.value = options.mode;
  accidentalsCheck.checked = options.accidentals;
  octaveCheck.checked = options.exactOctave;
  fillSteps(options.step ?? 0);

  let session = new ExerciseSession(options);
  let waiting = false;

  function draw() {
    staff.innerHTML = renderStaff({ clef: session.clef, notes: session.notes });
    const { asked, firstTry, streak, bestStreak } = session.stats;
    stats.textContent = asked
      ? `Réussies du premier coup : ${firstTry}/${asked} (${Math.round((100 * firstTry) / asked)} %) · Série : ${streak} · Record : ${bestStreak}`
      : '';
  }

  /** The options the controls show, with the level from the level menu. @returns {import('./exercise.js').ExerciseOptions} */
  function readOptions() {
    return {
      clef: /** @type {any} */ (clefSelect.value),
      level: /** @type {any} */ (levelSelect.value),
      mode: /** @type {any} */ (modeSelect.value),
      accidentals: accidentalsCheck.checked,
      exactOctave: octaveCheck.checked,
      step: Number(stepSelect.value) || 0,
    };
  }

  /**
   * Rebuild the level menu for the chosen clef, notes and sharps. Level 1 has two notes and each
   * level adds one; "Aléatoire" is every note, so the menu stops one level before it.
   * @param {number} wanted  Level to select, kept within the new number of levels.
   */
  function fillSteps(wanted) {
    const opts = readOptions();
    const count = stepCount(opts);
    const names = settings.labels === 'letters' ? 'letters' : 'solfege';
    const order = opts.clef === 'both' ? null : stepOrder(opts.clef, opts);
    stepSelect.innerHTML = '';
    stepSelect.add(new Option('Aléatoire', '0'));
    for (let step = 1; step <= count; step++) {
      let text = `Niveau ${step}`;
      if (order) {
        text += step === 1
          ? ` : ${order.slice(0, 2).map((m) => noteName(m, names)).join(' ')}`
          : ` : + ${noteName(order[notesAtStep(step) - 1], names)}`;
      }
      stepSelect.add(new Option(text, String(step)));
    }
    stepSelect.value = String(Math.min(wanted, count));
    stepLabel.hidden = opts.mode !== 'sequence';
  }

  function restart() {
    fillSteps(Number(stepSelect.value) || 0);
    settings.exercise = readOptions();
    save();
    session = new ExerciseSession(settings.exercise);
    waiting = false;
    feedback.textContent = 'Jouez la note affichée.';
    feedback.className = 'feedback';
    onRangeChange();
    draw();
  }

  for (const input of [clefSelect, levelSelect, modeSelect, stepSelect, accidentalsCheck, octaveCheck]) {
    input.addEventListener('change', restart);
  }

  $('ex-skip').addEventListener('click', () => {
    session.next();
    waiting = false;
    feedback.textContent = 'Jouez la note affichée.';
    feedback.className = 'feedback';
    draw();
  });

  draw();

  return {
    /** Redraw the level names after the note names setting changed. */
    refresh: () => fillSteps(Number(stepSelect.value) || 0),

    /** Keyboard range the current exercise needs. */
    range: () => exerciseRange(settings.exercise),

    /** @param {number} midi */
    play(midi) {
      if (waiting) return;
      const target = session.current.midi;
      const result = session.answer(midi);
      const name = (/** @type {number} */ m) => `${noteName(m, 'solfege', true)} (${noteName(m, 'letters', true)})`;
      if (result.correct) {
        keyboard.flash(midi, 'correct');
        onRightNote();
        feedback.textContent = `Bravo, c'est ${name(target)}.`;
        feedback.className = 'feedback correct';
        if (result.finished) {
          waiting = true;
          setTimeout(() => {
            session.next();
            waiting = false;
            draw();
          }, NEXT_DELAY);
        }
      } else {
        keyboard.flash(midi, 'wrong');
        feedback.textContent = result.hint
          ? `Ce n'est pas ${name(midi)}. La bonne touche s'allume en vert.`
          : `Ce n'est pas ${name(midi)}. Réessayez.`;
        feedback.className = 'feedback wrong';
        if (result.hint) keyboard.flash(target, 'correct');
      }
      draw();
    },
  };
}
