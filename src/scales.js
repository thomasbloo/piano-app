// Scales to practise: correct spelling (B♭ in F major, F𝄪 in G♯ minor), standard fingerings for
// each hand and the order of notes for one hand, both hands together or in contrary motion.

/** @typedef {'major' | 'natural' | 'harmonic' | 'melodic' | 'chromatic'} ScaleType */
/** @typedef {'right' | 'left' | 'both' | 'contrary'} ScaleHands */
/** @typedef {'right' | 'left'} Hand */
/** A spelled note: letter 0 to 6 from C, alteration in semitones (-2 to 2) and its key. @typedef {{ letter: number, alter: number, midi: number }} Spelled */
/** @typedef {Spelled & { hand: Hand, finger: number }} ScaleNote */
/** @typedef {{ notes: ScaleNote[] }} ScaleStep */
/**
 * @typedef {object} ScaleOptions
 * @property {number} tonic  pitch class, 0 for C
 * @property {ScaleType} type
 * @property {ScaleHands} hand
 * @property {number} octaves  1 or 2
 * @property {'updown' | 'up'} direction
 */

export const SCALE_TYPES = /** @type {const} */ ({
  major: 'majeure',
  natural: 'mineure naturelle',
  harmonic: 'mineure harmonique',
  melodic: 'mineure mélodique',
  chromatic: 'chromatique',
});

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SOLFEGE = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const ACCIDENTALS = { '-2': '𝄫', '-1': '♭', 0: '', 1: '♯', 2: '𝄪' };
/** Semitones of each natural letter above C. */
const NATURAL = [0, 2, 4, 5, 7, 9, 11];

/** Semitone steps of each scale, from the tonic up to the next tonic. */
const STEPS = {
  major: [2, 2, 1, 2, 2, 2, 1],
  natural: [2, 1, 2, 2, 1, 2, 2],
  harmonic: [2, 1, 2, 2, 1, 3, 1],
  melodic: [2, 1, 2, 2, 2, 2, 1],
};

/**
 * How each tonic is written: the usual key, with the fewest accidentals (D♭ major but C♯ minor).
 * [letter, alteration] per pitch class.
 */
const MAJOR_TONICS = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];
const MINOR_TONICS = [[0, 0], [0, 1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [6, -1], [6, 0]];

/**
 * Standard fingerings (as taught by the ABRSM), per tonic pitch class.
 * Each entry: right hand fingers for degrees 1 to 7 going up, the right hand's finger on the top tonic,
 * left hand fingers for degrees 1 to 7, the left hand's finger on the bottom tonic.
 * Degree 1 is the finger on a tonic in the middle of the scale, where the hand carries on.
 * @type {Record<'major' | 'minor', [string, number, string, number][]>}
 */
const FINGERINGS = {
  major: [
    ['1231234', 5, '1432132', 5], // C
    ['2312341', 2, '3214321', 3], // D♭
    ['1231234', 5, '1432132', 5], // D
    ['3123412', 3, '3214321', 3], // E♭
    ['1231234', 5, '1432132', 5], // E
    ['1234123', 4, '1432132', 5], // F
    ['2341231', 2, '4321321', 4], // F♯
    ['1231234', 5, '1432132', 5], // G
    ['3412312', 3, '3214321', 3], // A♭
    ['1231234', 5, '1432132', 5], // A
    ['4123123', 4, '3214321', 3], // B♭
    ['1231234', 5, '1321432', 4], // B
  ],
  minor: [
    ['1231234', 5, '1432132', 5], // C
    ['3412312', 3, '3214321', 3], // C♯
    ['1231234', 5, '1432132', 5], // D
    ['3123412', 3, '2143213', 2], // E♭
    ['1231234', 5, '1432132', 5], // E
    ['1234123', 4, '1432132', 5], // F
    ['3412312', 3, '4321321', 4], // F♯
    ['1231234', 5, '1432132', 5], // G
    ['3412312', 3, '3214321', 3], // G♯
    ['1231234', 5, '1432132', 5], // A
    ['4123123', 4, '2132143', 2], // B♭
    ['1231234', 5, '1321432', 4], // B
  ],
};

/**
 * Where natural and melodic minor need other fingers than harmonic minor, so the thumb stays on white keys.
 * Melodic minor uses MELODIC going up and NATURAL coming down, as it is played.
 * @type {Record<number, [string, number, string, number]>}
 */
const NATURAL_MINOR = {
  8: ['3412312', 3, '3213214', 3], // G♯: F♯ instead of F𝄪
};
/** @type {Record<number, [string, number, string, number]>} */
const MELODIC_MINOR = {
  1: ['2312341', 3, '3214321', 3], // C♯: A♯ instead of A
  6: ['2312341', 3, '4321321', 4], // F♯: D♯ instead of D
};

/** @param {number} n */
const mod = (n, m = 12) => ((n % m) + m) % m;

/** @param {number} midi */
export const isBlackKey = (midi) => [1, 3, 6, 8, 10].includes(mod(midi));

/**
 * Name of a spelled note in letters (B♭) or solfège (Si♭).
 * @param {{ letter: number, alter: number, midi?: number }} note
 * @param {'letters' | 'solfege'} mode
 * @param {boolean} [withOctave]
 */
export function spelledName(note, mode, withOctave = false) {
  const name = (mode === 'letters' ? LETTERS : SOLFEGE)[note.letter] + ACCIDENTALS[/** @type {-2 | -1 | 0 | 1 | 2} */ (note.alter)];
  return withOctave && note.midi !== undefined ? `${name}${spelledOctave(/** @type {Spelled} */ (note))}` : name;
}

/** Octave of a spelled note: B♯3 sounds like C4 but belongs to octave 3. @param {Spelled} note */
export function spelledOctave(note) {
  return Math.floor((note.midi - note.alter) / 12) - 1;
}

/** The tonic as written in this kind of scale. @param {number} tonic @param {ScaleType} type */
export function tonicSpelling(tonic, type) {
  const [letter, alter] = (type === 'major' || type === 'chromatic' ? MAJOR_TONICS : MINOR_TONICS)[mod(tonic)];
  return { letter, alter };
}

/** Name of a scale, like "Ré majeur" or "Fa♯ mineur harmonique". @param {number} tonic @param {ScaleType} type @param {'letters' | 'solfege'} mode */
export function scaleName(tonic, type, mode) {
  const word = type === 'major' ? 'majeur' : type === 'chromatic' ? 'chromatique' : SCALE_TYPES[type].replace('mineure', 'mineur');
  return `Gamme ${type === 'chromatic' ? 'chromatique sur ' : 'de '}${spelledName(tonicSpelling(tonic, type), mode)}${type === 'chromatic' ? '' : ` ${word}`}`;
}

/**
 * The seven notes going up from the tonic, spelled one letter per degree.
 * @param {number} tonic @param {Exclude<ScaleType, 'chromatic'>} type
 * @returns {{ letter: number, alter: number, semitones: number }[]}
 */
export function scaleDegrees(tonic, type) {
  const start = tonicSpelling(tonic, type);
  let semitones = 0;
  return STEPS[type].slice(0, 7).map((step, degree) => {
    const letter = (start.letter + degree) % 7;
    const natural = NATURAL[letter] + (start.letter + degree >= 7 ? 12 : 0);
    const alter = NATURAL[start.letter] + start.alter + semitones - natural;
    const note = { letter, alter, semitones };
    semitones += step;
    return note;
  });
}

/** Key signature of the scale's key: sharps or flats, in order. @param {number} tonic @param {ScaleType} type */
export function keySignature(tonic, type) {
  if (type === 'chromatic') return [];
  return scaleDegrees(tonic, type === 'major' ? 'major' : 'natural')
    .filter((d) => d.alter !== 0)
    .map((d) => ({ letter: d.letter, alter: d.alter }))
    .sort((a, b) => (a.alter > 0 ? sharpOrder(a) - sharpOrder(b) : flatOrder(a) - flatOrder(b)));
}

/** F C G D A E B @param {{ letter: number }} n */
const sharpOrder = (n) => [3, 0, 4, 1, 5, 2, 6].indexOf(n.letter);
/** B E A D G C F @param {{ letter: number }} n */
const flatOrder = (n) => [6, 2, 5, 1, 4, 0, 3].indexOf(n.letter);

/**
 * Notes of a scale going up from a starting key, for a number of octaves, with the top tonic.
 * @param {number} startMidi @param {ScaleType} type @param {number} octaves @param {'up' | 'down'} [spelling]
 *   chromatic notes are written with sharps going up and flats going down; melodic minor goes down as natural minor.
 * @returns {Spelled[]}
 */
function ascending(startMidi, type, octaves, spelling = 'up') {
  if (type === 'chromatic') {
    const notes = [];
    for (let midi = startMidi; midi <= startMidi + 12 * octaves; midi++) notes.push(chromaticSpelling(midi, spelling));
    return notes;
  }
  const degrees = scaleDegrees(startMidi, type === 'melodic' && spelling === 'down' ? 'natural' : type);
  const notes = [];
  for (let o = 0; o < octaves; o++) {
    for (const d of degrees) notes.push({ letter: d.letter, alter: d.alter, midi: startMidi + 12 * o + d.semitones });
  }
  notes.push({ ...degrees[0], midi: startMidi + 12 * octaves });
  return notes.map(({ letter, alter, midi }) => ({ letter, alter, midi }));
}

/** @param {number} midi @param {'up' | 'down'} direction @returns {Spelled} */
function chromaticSpelling(midi, direction) {
  const pc = mod(midi);
  if (!isBlackKey(pc)) return { letter: NATURAL.indexOf(pc), alter: 0, midi };
  return direction === 'up' ? { letter: NATURAL.indexOf(pc - 1), alter: 1, midi } : { letter: NATURAL.indexOf(pc + 1), alter: -1, midi };
}

/**
 * Fingers for notes going up from the bottom tonic to the top tonic.
 * @param {Spelled[]} notes  as built by ascending()
 * @param {number} tonic @param {ScaleType} type @param {Hand} hand
 * @param {'up' | 'down'} way  the notes are played going up or coming down (melodic minor differs)
 */
function fingersUp(notes, tonic, type, hand, way) {
  if (type === 'chromatic') {
    // 3 on the black keys, 1 on the white keys, 2 where two white keys follow each other:
    // on F and C for the right hand, on E and B for the left hand.
    // The scale starts with the thumb on a white key.
    const second = hand === 'right' ? [0, 5] : [4, 11];
    return notes.map((n, i) => (isBlackKey(n.midi) ? 3 : i > 0 && second.includes(mod(n.midi)) ? 2 : 1));
  }
  const pc = mod(tonic);
  const special = type === 'natural' || (type === 'melodic' && way === 'down') ? NATURAL_MINOR[pc]
    : type === 'melodic' ? MELODIC_MINOR[pc]
    : undefined;
  const [rh, rhTop, lh, lhBottom] = special ?? FINGERINGS[type === 'major' ? 'major' : 'minor'][pc];
  const cycle = (hand === 'right' ? rh : lh).split('').map(Number);
  const fingers = notes.map((_, i) => cycle[i % 7]);
  if (hand === 'right') fingers[fingers.length - 1] = rhTop;
  else fingers[0] = lhBottom;
  return fingers;
}

/**
 * One hand's notes and fingers, going up from startMidi and back down (or the reverse with `downFirst`).
 * @param {number} startMidi @param {Hand} hand @param {ScaleOptions} options @param {boolean} [downFirst]
 * @returns {ScaleNote[]}
 */
function handPart(startMidi, hand, options, downFirst = false) {
  const { tonic, type, octaves, direction } = options;
  const bottom = downFirst ? startMidi - 12 * octaves : startMidi;
  const up = ascending(bottom, type, octaves, 'up');
  const down = ascending(bottom, type, octaves, 'down');
  const upFingers = fingersUp(up, tonic, type, hand, 'up');
  const downFingers = fingersUp(down, tonic, type, hand, 'down');
  /** @type {ScaleNote[]} */
  const goingUp = up.map((n, i) => ({ ...n, hand, finger: upFingers[i] }));
  /** @type {ScaleNote[]} */
  const goingDown = down.map((n, i) => ({ ...n, hand, finger: downFingers[i] })).reverse();
  if (downFirst) return direction === 'up' ? goingDown : [...goingDown, ...goingUp.slice(1)];
  return direction === 'up' ? goingUp : [...goingUp, ...goingDown.slice(1)];
}

/**
 * Where each hand starts. One octave: right hand from the tonic above middle C, left hand an octave lower.
 * Two octaves start lower for high tonics, so everything stays on a 61-key keyboard (C2 to C7).
 * @param {ScaleOptions} options
 */
export function startKeys({ tonic, hand, octaves }) {
  const pc = mod(tonic);
  if (hand === 'contrary') return { right: 60 + pc, left: 60 + pc };
  const right = octaves >= 2 && pc >= 5 ? 48 + pc : 60 + pc;
  return { right, left: right - 12 };
}

/**
 * The scale as steps to play in order; with both hands, each step has a note for each hand.
 * @param {ScaleOptions} options
 * @returns {ScaleStep[]}
 */
export function buildScale(options) {
  const start = startKeys(options);
  if (options.hand === 'right' || options.hand === 'left') {
    return handPart(start[options.hand], options.hand, options).map((n) => ({ notes: [n] }));
  }
  const right = handPart(start.right, 'right', options);
  const left = handPart(start.left, 'left', options, options.hand === 'contrary');
  return right.map((n, i) => ({ notes: [n, left[i]] }));
}

/** Lowest and highest keys of a scale. @param {ScaleStep[]} steps */
export function scaleRange(steps) {
  const midis = steps.flatMap((s) => s.notes.map((n) => n.midi));
  return { low: Math.min(...midis), high: Math.max(...midis) };
}

/**
 * Where the hand changes position while going up: the thumb passes under (1 after another finger)
 * or a finger crosses over the thumb (going down, the same places in reverse).
 * @param {ScaleStep[]} steps @param {Hand} hand
 * @returns {{ from: ScaleNote, to: ScaleNote, index: number }[]}  index of the step played with the new position
 */
export function handShifts(steps, hand) {
  const notes = steps.map((s) => s.notes.find((n) => n.hand === hand));
  const shifts = [];
  for (let i = 1; i < notes.length; i++) {
    const from = notes[i - 1];
    const to = notes[i];
    if (!from || !to || from.midi === to.midi) continue;
    // Moving towards the little finger side with a lower finger number, or the reverse, is a crossing.
    const outward = hand === 'right' ? to.midi > from.midi : to.midi < from.midi;
    if (outward ? to.finger < from.finger : to.finger > from.finger) shifts.push({ from, to, index: i });
  }
  return shifts;
}
