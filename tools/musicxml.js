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

/**
 * @param {ReturnType<typeof parseNote>} note
 * @param {number} staff
 */
function noteXml(note, staff) {
  const voice = staff === 1 ? 1 : 5;
  const pitch = note.rest
    ? '<rest/>'
    : `<pitch><step>${note.step}</step>${note.alter ? `<alter>${note.alter}</alter>` : ''}<octave>${note.octave}</octave></pitch>`;
  return `<note>${pitch}<duration>${note.duration}</duration><voice>${voice}</voice><type>${note.type}</type>${note.dot ? '<dot/>' : ''}<staff>${staff}</staff></note>`;
}

const escape = (/** @type {string} */ s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/**
 * @param {{ title: string, composer: string, beats: number, beatType: number, tempo: number, right: string, left: string }} piece
 */
export function buildMusicXml(piece) {
  const right = bars(piece.right);
  const left = bars(piece.left);
  if (right.length !== left.length) {
    throw new Error(`${piece.title} : ${right.length} mesures à droite, ${left.length} à gauche`);
  }
  const barLength = (piece.beats * 4 * DIVISIONS) / piece.beatType;
  const measures = right.map((rh, i) => {
    const lh = left[i];
    for (const [hand, notes] of [['droite', rh], ['gauche', lh]]) {
      const total = /** @type {ReturnType<typeof parseNote>[]} */ (notes).reduce((sum, n) => sum + n.duration, 0);
      if (total !== barLength) throw new Error(`${piece.title}, mesure ${i + 1}, main ${hand} : durée ${total} au lieu de ${barLength}`);
    }
    const attributes = i === 0
      ? `<attributes><divisions>${DIVISIONS}</divisions><key><fifths>0</fifths></key><time><beats>${piece.beats}</beats><beat-type>${piece.beatType}</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes><sound tempo="${piece.tempo}"/>`
      : '';
    const barline = i === right.length - 1 ? '<barline location="right"><bar-style>light-heavy</bar-style></barline>' : '';
    return `<measure number="${i + 1}">${attributes}${rh.map((n) => noteXml(n, 1)).join('')}<backup><duration>${barLength}</duration></backup>${lh.map((n) => noteXml(n, 2)).join('')}${barline}</measure>`;
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
