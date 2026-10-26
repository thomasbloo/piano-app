import { isBlack, noteName } from './notes.js';

/**
 * @typedef {object} KeyboardOptions
 * @property {number} low
 * @property {number} high
 * @property {import('./notes.js').LabelMode} labels
 * @property {(midi: number) => void} onNoteOn
 * @property {(midi: number) => void} onNoteOff
 */

/** Virtual piano keyboard. White keys are laid out in a flex row; black keys sit on top of them. */
export class Keyboard {
  /** @type {Map<number, HTMLElement>} */
  #keys = new Map();
  #root;
  #options;

  /**
   * @param {HTMLElement} root
   * @param {KeyboardOptions} options
   */
  constructor(root, options) {
    this.#root = root;
    this.#options = options;
    this.#render();
  }

  /** @param {Partial<KeyboardOptions>} options */
  update(options) {
    this.#options = { ...this.#options, ...options };
    this.#render();
  }

  /** @param {number} midi @param {boolean} active */
  setActive(midi, active) {
    this.#keys.get(midi)?.classList.toggle('active', active);
  }

  /**
   * Tint the keys to play next in their hand's colour and name them, as a hint while playing a score.
   * @param {{ midi: number, hand: 'right' | 'left' }[]} notes
   */
  setExpected(notes) {
    for (const [midi, key] of this.#keys) {
      const hand = notes.find((n) => n.midi === midi)?.hand;
      key.classList.toggle('expected', !!hand);
      key.classList.toggle('expected-right', hand === 'right');
      key.classList.toggle('expected-left', hand === 'left');
    }
  }

  /**
   * Mark a key as right or wrong for a short moment, used by the exercises.
   * @param {number} midi
   * @param {'correct' | 'wrong'} kind
   */
  flash(midi, kind) {
    const key = this.#keys.get(midi);
    if (!key) return;
    key.classList.add(kind);
    setTimeout(() => key.classList.remove(kind), 600);
  }

  #render() {
    const { low, high, labels } = this.#options;
    this.#root.innerHTML = '';
    this.#keys.clear();
    const board = document.createElement('div');
    board.className = 'keyboard';
    const whiteCount = countWhite(low, high);
    let whiteIndex = 0;

    for (let midi = low; midi <= high; midi++) {
      const key = document.createElement('button');
      key.type = 'button';
      key.dataset.midi = String(midi);
      if (isBlack(midi)) {
        key.className = 'key black';
        key.style.left = `calc(${(whiteIndex / whiteCount) * 100}% - var(--black-width) / 2)`;
      } else {
        key.className = 'key white';
        whiteIndex++;
      }
      if (labels !== 'none') {
        const label = document.createElement('span');
        label.className = 'label';
        // Show the octave number on each C so the player can find their place.
        label.textContent = noteName(midi, labels, midi % 12 === 0);
        key.append(label);
      }
      key.setAttribute('aria-label', noteName(midi, 'letters', true));
      key.dataset.name = noteName(midi, labels === 'solfege' ? 'solfege' : 'letters');
      this.#bindPointer(key, midi);
      this.#keys.set(midi, key);
      board.append(key);
    }
    board.style.setProperty('--white-count', String(whiteCount));
    this.#root.append(board);
    this.#keys.get(60)?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  /** @param {HTMLElement} key @param {number} midi */
  #bindPointer(key, midi) {
    let down = false;
    const release = () => {
      if (!down) return;
      down = false;
      this.setActive(midi, false);
      this.#options.onNoteOff(midi);
    };
    key.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      down = true;
      this.setActive(midi, true);
      this.#options.onNoteOn(midi);
    });
    key.addEventListener('pointerup', release);
    key.addEventListener('pointerleave', release);
    key.addEventListener('pointercancel', release);
  }
}

/** @param {number} low @param {number} high */
function countWhite(low, high) {
  let n = 0;
  for (let midi = low; midi <= high; midi++) if (!isBlack(midi)) n++;
  return n;
}
