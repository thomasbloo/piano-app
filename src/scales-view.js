import { click, startNote, stopNote } from './audio.js';
import { renderScaleStaff } from './scale-staff.js';
import { buildScale, handShifts, keySignature, scaleDegrees, scaleName, scaleRange, spelledName, tonicSpelling } from './scales.js';

/** Tempos offered, in beats per minute. */
const TEMPOS = [40, 50, 60, 70, 80, 90, 100, 110, 120, 140, 160];
const HAND_NAME = { right: 'main droite', left: 'main gauche' };

/**
 * Scales tab: choose a scale and a hand, see it on the staff with its fingering and on the keys,
 * listen to it, then play it note by note or in time with the metronome.
 * @param {object} deps
 * @param {import('./settings.js').Settings} deps.settings
 * @param {() => void} deps.save
 * @param {import('./keyboard.js').Keyboard} deps.keyboard
 * @param {() => void} deps.onRangeChange
 * @param {() => void} deps.onRightNote  Called on each right note, to count the day in the streak.
 * @param {(mode: 'letters' | 'solfege') => void} deps.onLabelsChange  The do-ré-mi / C-D-E switch, shared with the settings.
 */
export function createScalesView({ settings, save, keyboard, onRangeChange, onRightNote, onLabelsChange }) {
  const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
  const tonicSelect = /** @type {HTMLSelectElement} */ ($('sc-tonic'));
  const typeSelect = /** @type {HTMLSelectElement} */ ($('sc-type'));
  const octavesSelect = /** @type {HTMLSelectElement} */ ($('sc-octaves'));
  const directionSelect = /** @type {HTMLSelectElement} */ ($('sc-direction'));
  const tempoSelect = /** @type {HTMLSelectElement} */ ($('sc-tempo'));
  const perBeatSelect = /** @type {HTMLSelectElement} */ ($('sc-per-beat'));
  const handButtons = /** @type {HTMLButtonElement[]} */ ([...document.querySelectorAll('[data-sc-hand]')]);
  const modeButtons = /** @type {HTMLButtonElement[]} */ ([...document.querySelectorAll('[data-sc-mode]')]);
  const notationButtons = /** @type {HTMLButtonElement[]} */ ([...document.querySelectorAll('[data-notation]')]);
  const metronomeButton = $('sc-metronome');
  const fingersButton = $('sc-fingers');
  const keysButton = $('sc-keys');
  const listenButton = $('sc-listen');
  const listenText = $('sc-listen-text');
  const startButton = $('sc-start');
  const startText = $('sc-start-text');
  const staffBox = $('sc-staff');
  const title = $('sc-title');
  const keyText = $('sc-key');
  const tips = $('sc-tips');
  const feedback = $('sc-feedback');

  const options = settings.scales;
  for (const tempo of TEMPOS) tempoSelect.add(new Option(`♩ = ${tempo}`, String(tempo)));

  /** @type {import('./scales.js').ScaleStep[]} */
  let steps = [];
  /** @type {import('./scale-staff.js').StepState[]} */
  let states = [];
  let current = -1;
  /** @type {'wait' | 'tempo' | 'listen' | null} */
  let running = null;
  let startedAt = 0;
  let frame = 0;
  /** @type {ReturnType<typeof setTimeout>[]} */
  let timers = [];
  /** Keys already played right in each step, and the steps with a wrong note. */
  let played = /** @type {Set<number>[]} */ ([]);
  let stepErrors = /** @type {boolean[]} */ ([]);
  let wrong = 0;
  /** In tempo mode, how early (negative) or late each right note was, in seconds. */
  let offsets = /** @type {number[]} */ ([]);
  /** @type {Set<number>} */
  const sounding = new Set();

  const names = () => (settings.labels === 'letters' ? 'letters' : 'solfege');
  const now = () => performance.now() / 1000;
  const stepTime = () => 60 / options.tempo / options.perBeat;
  /** @param {import('./scales.js').ScaleNote} n */
  const noteText = (n) => spelledName(n, names());

  function fillTonics() {
    const kind = options.type === 'major' || options.type === 'chromatic' ? 'major' : 'minor';
    tonicSelect.innerHTML = '';
    for (let pc = 0; pc < 12; pc++) {
      tonicSelect.add(new Option(spelledName(tonicSpelling(pc, kind === 'major' ? 'major' : 'natural'), names()), String(pc)));
    }
    tonicSelect.value = String(options.tonic);
  }

  function showOptions() {
    fillTonics();
    typeSelect.value = options.type;
    octavesSelect.value = String(options.octaves);
    directionSelect.value = options.direction;
    tempoSelect.value = String(options.tempo);
    perBeatSelect.value = String(options.perBeat);
    for (const b of handButtons) b.setAttribute('aria-pressed', String(b.dataset.scHand === options.hand));
    for (const b of modeButtons) b.setAttribute('aria-pressed', String(b.dataset.scMode === options.mode));
    for (const b of notationButtons) b.setAttribute('aria-pressed', String(b.dataset.notation === settings.labels));
    metronomeButton.setAttribute('aria-pressed', String(options.metronome));
    fingersButton.setAttribute('aria-pressed', String(options.fingers));
    keysButton.setAttribute('aria-pressed', String(options.showKeys));
  }

  /** Title, key signature and where the hands change position. */
  function describe() {
    const mode = names();
    title.textContent = scaleName(options.tonic, options.type, mode);
    if (options.type === 'chromatic') {
      keyText.textContent = 'Toutes les touches, blanches et noires, par demi-tons.';
    } else {
      const signature = keySignature(options.tonic, options.type);
      const kind = signature[0]?.alter > 0 ? 'dièse' : 'bémol';
      let text = signature.length
        ? `${signature.length} ${kind}${signature.length > 1 && kind === 'dièse' ? 's' : ''} à la clé : ${signature.map((n) => spelledName(n, mode)).join(', ')}`
        : 'Aucune altération à la clé';
      const natural = scaleDegrees(options.tonic, 'natural');
      const raised = options.type === 'harmonic' || options.type === 'melodic'
        ? scaleDegrees(options.tonic, options.type).filter((d, i) => d.alter !== natural[i].alter)
        : [];
      if (raised.length) {
        text += ` · haussé${raised.length > 1 ? 's' : ''} : ${raised.map((d) => spelledName(d, mode)).join(', ')}`;
        if (options.type === 'melodic') text += ' en montant seulement';
      }
      keyText.textContent = text;
    }

    tips.innerHTML = '';
    const hands = /** @type {('right' | 'left')[]} */ (options.hand === 'both' || options.hand === 'contrary' ? ['right', 'left'] : [options.hand]);
    for (const hand of hands) {
      // Each change of position once: the same ones come back in the next octave.
      const seen = new Set();
      const moves = handShifts(steps, hand).filter((s) => {
        const key = `${s.from.letter}${s.to.letter}${s.from.finger}${s.to.finger}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const line = document.createElement('span');
      line.className = `tip ${hand}`;
      const first = steps[0].notes.find((n) => n.hand === hand);
      const start = first ? `départ sur ${noteText(first)} avec le ${first.finger === 1 ? 'pouce' : first.finger}` : '';
      const passes = moves.map((m) => {
        const outward = hand === 'right' ? m.to.midi > m.from.midi : m.to.midi < m.from.midi;
        return outward ? `pouce sous le ${m.from.finger} → ${noteText(m.to)}` : `${m.to.finger} par-dessus le pouce → ${noteText(m.to)}`;
      });
      line.textContent = `${hand === 'right' ? 'Main droite' : 'Main gauche'} : ${[start, ...passes].join(' · ')}`;
      tips.append(line);
    }
  }

  function draw() {
    staffBox.innerHTML = renderScaleStaff({ steps, states, fingers: options.fingers });
    const note = /** @type {SVGGraphicsElement | null} */ (staffBox.querySelector('.note.current'));
    note?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  /** @param {import('./scales.js').ScaleNote[]} notes */
  function showKeys(notes) {
    keyboard.setExpected(options.showKeys ? notes.map((n) => ({
      midi: n.midi,
      hand: n.hand,
      name: noteText(n),
      finger: options.fingers ? n.finger : undefined,
    })) : []);
  }

  /** At rest, the keys of the first octave light up with their fingers: where to put the hands. */
  function showStartPosition() {
    const perOctave = options.type === 'chromatic' ? 12 : 7;
    showKeys(steps.slice(0, perOctave + 1).flatMap((s) => s.notes));
  }

  /** Any change of scale or option: stop and start again from the top. */
  function rebuild(first = false) {
    stop();
    steps = buildScale(options);
    states = steps.map(() => 'pending');
    current = -1;
    feedback.textContent = '';
    feedback.className = 'feedback';
    showOptions();
    describe();
    draw();
    if (first) return;
    onRangeChange();
    showStartPosition();
  }

  function changed() {
    save();
    rebuild();
  }

  tonicSelect.addEventListener('change', () => { options.tonic = Number(tonicSelect.value); changed(); });
  typeSelect.addEventListener('change', () => { options.type = /** @type {any} */ (typeSelect.value); changed(); });
  octavesSelect.addEventListener('change', () => { options.octaves = Number(octavesSelect.value); changed(); });
  directionSelect.addEventListener('change', () => { options.direction = /** @type {any} */ (directionSelect.value); changed(); });
  for (const b of handButtons) b.addEventListener('click', () => { options.hand = /** @type {any} */ (b.dataset.scHand); changed(); });
  for (const b of modeButtons) b.addEventListener('click', () => { options.mode = /** @type {any} */ (b.dataset.scMode); changed(); });
  for (const b of notationButtons) b.addEventListener('click', () => onLabelsChange(/** @type {any} */ (b.dataset.notation)));
  tempoSelect.addEventListener('change', () => { options.tempo = Number(tempoSelect.value); changed(); });
  perBeatSelect.addEventListener('change', () => { options.perBeat = Number(perBeatSelect.value); changed(); });
  metronomeButton.addEventListener('click', () => { options.metronome = !options.metronome; save(); showOptions(); });
  fingersButton.addEventListener('click', () => {
    options.fingers = !options.fingers;
    save();
    showOptions();
    draw();
    if (running) showKeys(steps[current]?.notes ?? []);
    else showStartPosition();
  });
  keysButton.addEventListener('click', () => {
    options.showKeys = !options.showKeys;
    save();
    showOptions();
    if (running) showKeys(steps[current]?.notes ?? []);
    else showStartPosition();
  });
  listenButton.addEventListener('click', () => (running === 'listen' ? stop() : listen()));
  startButton.addEventListener('click', () => (running === 'wait' || running === 'tempo' ? stop() : start()));

  /** @param {number} index */
  function moveTo(index) {
    if (current >= 0 && states[current] === 'current') states[current] = 'pending';
    current = index;
    if (index >= 0 && index < steps.length && states[index] === 'pending') states[index] = 'current';
    draw();
  }

  /** The app plays the scale at the chosen tempo, with the keys and fingers lit as it goes. */
  function listen() {
    stop();
    running = 'listen';
    listenText.textContent = 'Arrêter';
    listenButton.classList.add('playing');
    const step = stepTime();
    steps.forEach((s, i) => {
      timers.push(setTimeout(() => {
        sounding.forEach((m) => stopNote(m));
        sounding.clear();
        for (const n of s.notes) {
          startNote(n.midi, 90);
          sounding.add(n.midi);
        }
        moveTo(i);
        showKeys(s.notes);
      }, i * step * 1000));
    });
    timers.push(setTimeout(() => {
      stop();
    }, steps.length * step * 1000 + 300));
  }

  function start() {
    stop();
    states = steps.map(() => 'pending');
    played = steps.map(() => new Set());
    stepErrors = steps.map(() => false);
    wrong = 0;
    offsets = [];
    startText.textContent = 'Arrêter';
    startButton.classList.add('playing');
    feedback.className = 'feedback';

    if (options.mode === 'wait') {
      running = 'wait';
      startedAt = 0;
      moveTo(0);
      showKeys(steps[0].notes);
      feedback.textContent = 'Jouez les notes sous le curseur, avec les doigts indiqués.';
      return;
    }

    running = 'tempo';
    const beat = 60 / options.tempo;
    const step = stepTime();
    // One bar of four clicks, then the metronome keeps going if it is on.
    const beats = 4 + (options.metronome ? Math.ceil((steps.length * step) / beat) : 0);
    for (let i = 0; i < beats; i++) timers.push(setTimeout(() => click(i % 4 === 0), i * beat * 1000));
    startedAt = now() + 4 * beat;
    feedback.textContent = 'Préparez-vous… 1, 2, 3, 4';
    showKeys(options.showKeys ? steps[0].notes : []);
    const tick = () => {
      const t = now() - startedAt;
      if (t >= -step / 2) {
        const index = Math.min(steps.length - 1, Math.max(0, Math.round(t / step)));
        if (t > -step / 4 && feedback.textContent?.startsWith('Préparez')) feedback.textContent = '';
        // A step whose time has gone by without all its notes is missed.
        for (let i = 0; i < steps.length; i++) {
          if ((states[i] === 'pending' || states[i] === 'current') && t > (i + 0.5) * step && played[i].size < steps[i].notes.length) {
            states[i] = 'wrong';
          }
        }
        if (index !== current) {
          moveTo(index);
          showKeys(steps[index].notes);
        }
        if (t > (steps.length - 0.5) * step) {
          finishTempo();
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }

  function finishTempo() {
    const total = steps.reduce((sum, s) => sum + s.notes.length, 0);
    const hits = offsets.length;
    const mean = hits ? offsets.reduce((a, b) => a + b, 0) / hits : 0;
    const spread = hits ? offsets.reduce((a, b) => a + Math.abs(b - mean), 0) / hits : 0;
    const ms = Math.round(spread * 1000);
    const parts = [`${hits}/${total} notes justes et en place`];
    if (hits > 1) {
      parts.push(`écart moyen ${ms} ms${Math.abs(mean) > 0.03 ? `, plutôt en ${mean < 0 ? 'avance' : 'retard'}` : ''}`);
    }
    if (wrong) parts.push(`${wrong} fausse${wrong > 1 ? 's' : ''} note${wrong > 1 ? 's' : ''}`);
    const even = hits === total && ms < 40;
    let advice = '';
    if (even && wrong === 0) {
      const next = TEMPOS.find((t) => t > options.tempo);
      advice = next ? ` Très régulier ! Essayez ♩ = ${next}.` : ' Très régulier !';
    } else if (hits < total * 0.8 || ms > 80) {
      advice = ' Ralentissez le tempo pour gagner en régularité.';
    }
    stop();
    draw();
    feedback.textContent = `Terminé : ${parts.join(', ')}.${advice}`;
    feedback.className = `feedback ${even && wrong === 0 ? 'correct' : ''}`;
  }

  function finishWait() {
    const seconds = Math.round(now() - startedAt);
    const clean = !wrong;
    stop();
    draw();
    feedback.textContent = clean
      ? `Bravo, sans faute en ${seconds} s ! Passez au mode au tempo quand elle est fluide.`
      : `Terminé en ${seconds} s avec ${wrong} fausse${wrong > 1 ? 's' : ''} note${wrong > 1 ? 's' : ''}. Les notes en rouge sont à revoir.`;
    feedback.className = `feedback ${clean ? 'correct' : ''}`;
  }

  function stop() {
    cancelAnimationFrame(frame);
    timers.forEach(clearTimeout);
    timers = [];
    sounding.forEach((m) => stopNote(m));
    sounding.clear();
    const wasRunning = running;
    running = null;
    if (current >= 0 && states[current] === 'current') states[current] = 'pending';
    current = -1;
    listenText.textContent = 'Écouter';
    listenButton.classList.remove('playing');
    startText.textContent = 'Jouer';
    startButton.classList.remove('playing');
    if (wasRunning) {
      draw();
      showStartPosition();
    }
  }

  /** @param {number} midi */
  function playWait(midi) {
    const step = steps[current];
    if (!startedAt) startedAt = now();
    const note = step.notes.find((n) => n.midi === midi);
    if (!note || played[current].has(midi)) {
      wrong++;
      stepErrors[current] = true;
      keyboard.flash(midi, 'wrong');
      const missing = step.notes.filter((n) => !played[current].has(n.midi));
      feedback.textContent = `Oups : ${missing.map((n) => `${noteText(n)} avec le ${n.finger} (${HAND_NAME[n.hand]})`).join(' et ')}.`;
      feedback.className = 'feedback wrong';
      return;
    }
    played[current].add(midi);
    keyboard.flash(midi, 'correct');
    onRightNote();
    if (played[current].size < step.notes.length) return;
    states[current] = stepErrors[current] ? 'wrong' : 'correct';
    if (feedback.classList.contains('wrong')) {
      feedback.textContent = '';
      feedback.className = 'feedback';
    }
    if (current === steps.length - 1) {
      finishWait();
      return;
    }
    moveTo(current + 1);
    showKeys(steps[current].notes);
  }

  /** @param {number} midi */
  function playTempo(midi) {
    const step = stepTime();
    const t = now() - startedAt;
    const nearest = Math.round(t / step);
    // The note counts for the nearest step that needs it, or a neighbour when played a bit early or late.
    for (const i of [nearest, nearest - 1, nearest + 1]) {
      if (i < 0 || i >= steps.length) continue;
      const offset = t - i * step;
      if (Math.abs(offset) > step * 0.75) continue;
      if (!steps[i].notes.some((n) => n.midi === midi) || played[i].has(midi)) continue;
      played[i].add(midi);
      offsets.push(offset);
      keyboard.flash(midi, 'correct');
      onRightNote();
      if (played[i].size === steps[i].notes.length && states[i] !== 'wrong') states[i] = 'correct';
      draw();
      return;
    }
    wrong++;
    keyboard.flash(midi, 'wrong');
  }

  rebuild(true);

  return {
    /** Keys the scale needs, so the keyboard can show them all. */
    range: () => scaleRange(steps),

    /** Back on the tab: light the starting keys again. */
    show() {
      showStartPosition();
    },

    /** Leaving the tab: stop and clear the keys. */
    hide() {
      stop();
      keyboard.setExpected([]);
    },

    /** The notation changed in the settings or here: rename everything. */
    refresh() {
      showOptions();
      describe();
      if (running) showKeys(steps[current]?.notes ?? []);
      else showStartPosition();
    },

    /** @param {number} midi */
    play(midi) {
      if (running === 'wait') playWait(midi);
      else if (running === 'tempo') playTempo(midi);
    },
  };
}
