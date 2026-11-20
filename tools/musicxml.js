// Builds simple two-staff piano MusicXML from a compact text notation, for the starter
// pieces in scores/. A note is "E4/4" (pitch/duration), "C#5/8." (dotted), or "r/2" (rest).
// Durations: 1 whole, 2 half, 4 quarter, 8 eighth, 16 sixteenth. Bars are separated by "|".

const DIVISIONS = 4; // per quarter note, enough for sixteenths
const TYPES = { 1: 'whole', 2: 'half', 4: 'quarter', 8: 'eighth', 16: '16th' };

/** @param {string} token */
export function parseNote(token) {
  const match = /^(r|[A-G][#b]?\d)\/(1|2|4|8|16)(\.?)$/.exec(token);
  if (!match) throw new Error(`Note illisible : ${token}`);
  const [, pitch, value, dot] = match;
  const base = (4 * DIVISIONS) / Number(value);
  const duration = dot ? base * 1.5 : base;
  if (pitch === 'r') return { rest: true, duration, type: TYPES[value], dot: !!dot };
  const [, step, accidental, octave] = /^([A-G])([#b]?)(\d)$/.exec(pitch) ?? [];
  const alter = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return { rest: false, step, alter, octave: Number(octave), duration, type: TYPES[value], dot: !!dot };
}

/** @param {string} line */
const bars = (line) => line.split('|').map((bar) => bar.trim().split(/\s+/).filter(Boolean).map(parseNote));

/** @typedef {ReturnType<typeof parseNote> & { beams?: string[] }} Note */

/**
 * Beams eighths and sixteenths together within each beat (a dotted quarter in 3/8, 6/8…).
 * @param {Note[]} notes
 * @param {number} beat  length of a beat in divisions
 */
export function addBeams(notes, beat) {
  let start = 0;
  /** @type {Note[][]} */
  const groups = [];
  /** @type {Note[]} */
  let group = [];
  const flush = () => {
    if (group.length > 1) groups.push(group);
    group = [];
  };
  for (const note of notes) {
    const short = !note.rest && (note.type === 'eighth' || note.type === '16th');
    if (!short || Math.floor(start / beat) !== Math.floor((start + note.duration - 1) / beat)) flush();
    else if (group.length && Math.floor(start / beat) !== Math.floor((start - 1) / beat)) flush();
    if (short) group.push(note);
    start += note.duration;
  }
  flush();
  for (const g of groups) {
    g.forEach((note, i) => {
      const level1 = i === 0 ? 'begin' : i === g.length - 1 ? 'end' : 'continue';
      note.beams = [level1];
      if (note.type !== '16th') return;
      const prev = g[i - 1]?.type === '16th';
      const next = g[i + 1]?.type === '16th';
      note.beams.push(prev && next ? 'continue' : prev ? 'end' : next ? 'begin' : i === 0 ? 'forward hook' : 'backward hook');
    });
  }
  return notes;
}

/**
 * @param {Note} note
 * @param {number} staff
 */
function noteXml(note, staff) {
  const voice = staff === 1 ? 1 : 5;
  const pitch = note.rest
    ? '<rest/>'
    : `<pitch><step>${note.step}</step>${note.alter ? `<alter>${note.alter}</alter>` : ''}<octave>${note.octave}</octave></pitch>`;
  return `<note>${pitch}<duration>${note.duration}</duration><voice>${voice}</voice><type>${note.type}</type>${note.dot ? '<dot/>' : ''}<staff>${staff}</staff>${(note.beams ?? []).map((b, i) => `<beam number="${i + 1}">${b}</beam>`).join('')}</note>`;
}

const escape = (/** @type {string} */ s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/**
 * `fifths` is the key signature (1 = one sharp, -1 = one flat). With `pickup`, the first bar
 * is an upbeat: it may be shorter than a full bar (both hands the same length).
 * @param {{ title: string, composer: string, beats: number, beatType: number, tempo: number, right: string, left: string, fifths?: number, pickup?: boolean }} piece
 */
export function buildMusicXml(piece) {
  const right = bars(piece.right);
  const left = bars(piece.left);
  if (right.length !== left.length) {
    throw new Error(`${piece.title} : ${right.length} mesures à droite, ${left.length} à gauche`);
  }
  const barLength = (piece.beats * 4 * DIVISIONS) / piece.beatType;
  const compound = piece.beatType === 8 && piece.beats % 3 === 0;
  const beat = compound ? 1.5 * DIVISIONS : DIVISIONS;
  // In a pickup bar the beats are counted from the end of the bar.
  const offset = (/** @type {Note[]} */ notes, /** @type {boolean} */ isPickup) => {
    if (!isPickup) return addBeams(notes, beat);
    const shift = (beat - (notes.reduce((sum, n) => sum + n.duration, 0) % beat)) % beat;
    return addBeams([{ rest: true, duration: shift, type: 'eighth', dot: false }, ...notes], beat).slice(1);
  };
  const measures = right.map((rh, i) => {
    const lh = left[i];
    const isPickup = !!piece.pickup && i === 0;
    const length = isPickup ? rh.reduce((sum, n) => sum + n.duration, 0) : barLength;
    if (isPickup && length >= barLength) throw new Error(`${piece.title} : la levée doit être plus courte qu'une mesure`);
    for (const [hand, notes] of [['droite', rh], ['gauche', lh]]) {
      const total = /** @type {ReturnType<typeof parseNote>[]} */ (notes).reduce((sum, n) => sum + n.duration, 0);
      if (total !== length) throw new Error(`${piece.title}, mesure ${i + 1}, main ${hand} : durée ${total} au lieu de ${length}`);
    }
    const attributes = i === 0
      ? `<attributes><divisions>${DIVISIONS}</divisions><key><fifths>${piece.fifths ?? 0}</fifths></key><time><beats>${piece.beats}</beats><beat-type>${piece.beatType}</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes><sound tempo="${piece.tempo}"/>`
      : '';
    const barline = i === right.length - 1 ? '<barline location="right"><bar-style>light-heavy</bar-style></barline>' : '';
    offset(rh, isPickup);
    offset(lh, isPickup);
    const number = piece.pickup ? i : i + 1;
    return `<measure number="${number}"${isPickup ? ' implicit="yes"' : ''}>${attributes}${rh.map((n) => noteXml(n, 1)).join('')}<backup><duration>${length}</duration></backup>${lh.map((n) => noteXml(n, 2)).join('')}${barline}</measure>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
<work><work-title>${escape(piece.title)}</work-title></work>
<identification><creator type="composer">${escape(piece.composer)}</creator></identification>
<part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
<part id="P1">
${measures.join('\n')}
</part>
</score-partwise>
`;
}
