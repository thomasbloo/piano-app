// Reads MuseScore files (.mscz, a zip, or plain .mscx) and turns them into MusicXML,
// so scores downloaded from musescore.com can be imported without exporting them first.
// Covers what piano scores use: notes, chords, rests, ties, tuplets, grace notes, several
// voices, cross-staff notes, clef, key and time changes. Repeats are kept as barlines only.

/** @typedef {{ tag: string, attrs: Record<string, string>, children: XmlNode[], text: string }} XmlNode */

const ENTITIES = /** @type {Record<string, string>} */ ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" });

/** @param {string} s */
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (whole, name) => {
    if (name[0] !== '#') return ENTITIES[name] ?? whole;
    return String.fromCodePoint(name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1)));
  });
}

/**
 * A small XML parser: elements, attributes and text, which is all a .mscx file holds.
 * @param {string} xml
 * @returns {XmlNode}
 */
export function parseXml(xml) {
  /** @type {XmlNode} */
  const root = { tag: '#document', attrs: {}, children: [], text: '' };
  const stack = [root];
  const tagPattern = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<[?!][^>]*>|<\/([^\s>]+)\s*>|<([^\s/>]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  let last = 0;
  for (let match = tagPattern.exec(xml); match; match = tagPattern.exec(xml)) {
    const top = stack[stack.length - 1];
    top.text += decode(xml.slice(last, match.index));
    last = tagPattern.lastIndex;
    const [, cdata, closing, opening, attrText, selfClosing] = match;
    if (cdata !== undefined) top.text += cdata;
    else if (closing) {
      if (stack.length > 1) stack.pop();
    } else if (opening) {
      /** @type {Record<string, string>} */
      const attrs = {};
      for (const [, name, , double, single] of attrText.matchAll(/([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
        attrs[name] = decode(double ?? single);
      }
      /** @type {XmlNode} */
      const node = { tag: opening, attrs, children: [], text: '' };
      top.children.push(node);
      if (!selfClosing) stack.push(node);
    }
  }
  return root;
}

/** @param {XmlNode | undefined} node @param {string} tag */
const child = (node, tag) => node?.children.find((c) => c.tag === tag);
/** @param {XmlNode | undefined} node @param {string} tag */
const children = (node, tag) => node?.children.filter((c) => c.tag === tag) ?? [];
/** @param {XmlNode | undefined} node @param {string} tag */
const childText = (node, tag) => child(node, tag)?.text.trim();
/** All the text inside a node, including formatting tags such as <b>. @param {XmlNode} node @returns {string} */
const allText = (node) => node.text + node.children.map(allText).join('');

/**
 * Files inside a zip archive. Uses the browser's (or Node's) built-in deflate.
 * @param {Uint8Array} bytes
 * @returns {Promise<Map<string, Uint8Array>>}
 */
export async function unzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error('Archive illisible.');
  const count = view.getUint16(end + 10, true);
  let pos = view.getUint32(end + 16, true);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(pos, true) !== 0x02014b50) throw new Error('Archive illisible.');
    const method = view.getUint16(pos + 10, true);
    const size = view.getUint32(pos + 20, true);
    const nameLength = view.getUint16(pos + 28, true);
    const extraLength = view.getUint16(pos + 30, true);
    const commentLength = view.getUint16(pos + 32, true);
    const offset = view.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + nameLength));
    pos += 46 + nameLength + extraLength + commentLength;
    const start = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true);
    const data = bytes.subarray(start, start + size);
    if (method === 0) files.set(name, data);
    else if (method === 8) {
      const stream = new Blob([/** @type {Uint8Array<ArrayBuffer>} */ (data)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      files.set(name, new Uint8Array(await new Response(stream).arrayBuffer()));
    }
  }
  return files;
}

/**
 * The score inside a .mscz file, converted to MusicXML.
 * @param {Uint8Array} bytes
 */
export async function msczToMusicXml(bytes) {
  const files = await unzip(bytes);
  const container = files.get('META-INF/container.xml');
  const declared = container ? /full-path="([^"]+\.mscx)"/.exec(new TextDecoder().decode(container))?.[1] : undefined;
  const name = declared && files.has(declared) ? declared : [...files.keys()].find((n) => n.endsWith('.mscx'));
  if (!name) throw new Error('Aucune partition MuseScore dans ce fichier.');
  return mscxToMusicXml(new TextDecoder().decode(/** @type {Uint8Array} */ (files.get(name))));
}

const TYPES = ['breve', 'whole', 'half', 'quarter', 'eighth', '16th', '32nd', '64th', '128th'];
/** Length of a note value in quarter notes. @param {string} type */
const typeLength = (type) => 8 / 2 ** TYPES.indexOf(type);
const CLEFS = /** @type {Record<string, string>} */ ({
  G: '<sign>G</sign><line>2</line>',
  G8va: '<sign>G</sign><line>2</line><clef-octave-change>1</clef-octave-change>',
  G8vb: '<sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change>',
  F: '<sign>F</sign><line>4</line>',
  F8vb: '<sign>F</sign><line>4</line><clef-octave-change>-1</clef-octave-change>',
  C3: '<sign>C</sign><line>3</line>',
  C4: '<sign>C</sign><line>4</line>',
});

/** @param {string} s */
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** "3/16" → 0.75 quarter notes. @param {string | undefined} fraction */
function fractionLength(fraction) {
  const [n, d] = (fraction ?? '0/1').split('/').map(Number);
  return (n / (d || 1)) * 4;
}

/**
 * Step, alteration and octave from MuseScore's midi pitch and "tonal pitch class".
 * @param {number} midi @param {number} tpc
 */
export function spell(midi, tpc) {
  const index = tpc - 13;
  const step = 'FCGDAEB'[((index % 7) + 7) % 7];
  const alter = Math.floor(index / 7);
  const natural = midi - alter;
  return { step, alter, octave: Math.floor(natural / 12) - 1 };
}

/**
 * @typedef {object} Item
 * @property {'note' | 'rest'} kind
 * @property {number} start   in quarter notes from the start of the measure
 * @property {number} length  in quarter notes (0 for grace notes)
 * @property {string} type
 * @property {number} dots
 * @property {[number, number] | null} tuplet  actual and normal notes
 * @property {{ midi: number, tpc: number, tieStart: boolean, tieStop: boolean }[]} notes
 * @property {number} staff
 * @property {boolean} grace
 * @property {string} beamMode
 * @property {boolean} measureRest
 */

/**
 * @param {string} mscx
 * @returns {string} MusicXML
 */
export function mscxToMusicXml(mscx) {
  const score = child(child(parseXml(mscx), 'museScore'), 'Score');
  if (!score) throw new Error("Ce n'est pas une partition MuseScore.");
  const staves = children(score, 'Staff').filter((s) => children(s, 'Measure').length);
  if (!staves.length) throw new Error('Partition vide.');
  const staffCount = Math.min(staves.length, 2);
  const meta = (/** @type {string} */ name) => children(score, 'metaTag').find((m) => m.attrs.name === name)?.text.trim() ?? '';
  /** @param {string} style */
  const frameText = (style) => {
    for (const box of children(staves[0], 'VBox')) {
      for (const text of children(box, 'Text')) {
        if (childText(text, 'style')?.toLowerCase() === style) {
          const node = child(text, 'text');
          if (node) return allText(node).replace(/\s+/g, ' ').trim();
        }
      }
    }
    return '';
  };
  const placeholder = (/** @type {string} */ s) => (/^(untitled score|composer \/ arranger)$/i.test(s) ? '' : s);
  const title = placeholder(meta('workTitle')) || frameText('title') || placeholder(meta('movementTitle'));
  const composer = placeholder(meta('composer')) || frameText('composer');

  // Default clefs come from the part's staves; the first staff is treble and the second bass otherwise.
  const partStaves = children(child(score, 'Part'), 'Staff');
  const clefs = [0, 1].map((i) => childText(partStaves[i], 'defaultClef') ?? (i === 0 ? 'G' : 'F'));

  const measureCount = Math.max(...staves.slice(0, staffCount).map((s) => children(s, 'Measure').length));
  const divisions = 480;
  const ticks = (/** @type {number} */ quarters) => Math.round(quarters * divisions);
  let beats = 4;
  let beatType = 4;
  let fifths = 0;
  let tempo = 0;
  let measureStart = 0;
  // 8va and similar lines: MuseScore keeps the written pitch, so the notes under them are shifted here.
  /** @type {{ staff: number, start: number, end: number, shift: number }[]} */
  const ottavas = [];
  const OTTAVAS = /** @type {Record<string, number>} */ ({ '8va': 12, '8vb': -12, '15ma': 24, '15mb': -24, '22ma': 36, '22mb': -36, 0: 12, 1: -12, 2: 24, 3: -24 });
  const out = [];

  for (let m = 0; m < measureCount; m++) {
    const measures = staves.slice(0, staffCount).map((s) => children(s, 'Measure')[m]);
    /** @type {string[]} */
    const attributes = [];
    let barStart = '';
    let barEnd = '';
    /** @type {Item[][]} indexed by staff * 4 + voice */
    const voices = [];
    const declaredLength = fractionLength(measures[0]?.attrs.len) || 0;
    /** @type {(string | null)[]} */
    const clefChanges = [null, null];

    measures.forEach((measure, staff) => {
      if (!measure) return;
      if (child(measure, 'startRepeat')) barStart = '<barline location="left"><bar-style>heavy-light</bar-style><repeat direction="forward"/></barline>';
      if (child(measure, 'endRepeat')) barEnd = '<barline location="right"><bar-style>light-heavy</bar-style><repeat direction="backward"/></barline>';
      children(measure, 'voice').forEach((voice, v) => {
        /** @type {Item[]} */
        const items = [];
        let position = 0;
        /** @type {[number, number][]} */
        const tuplets = [];
        for (const el of voice.children) {
          switch (el.tag) {
            case 'TimeSig':
              if (staff === 0 && v === 0) {
                beats = Number(childText(el, 'sigN') ?? beats);
                beatType = Number(childText(el, 'sigD') ?? beatType);
                attributes.push(`<time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>`);
              }
              break;
            case 'KeySig':
              if (staff === 0 && v === 0) {
                fifths = Number(childText(el, 'concertKey') ?? childText(el, 'accidental') ?? 0);
                attributes.unshift(`<key><fifths>${fifths}</fifths></key>`);
              }
              break;
            case 'Clef': {
              const type = childText(el, 'concertClefType') ?? childText(el, 'subtype');
              if (type && CLEFS[type] && v === 0 && type !== clefs[staff]) {
                clefs[staff] = type;
                clefChanges[staff] = type;
              }
              break;
            }
            case 'Tempo':
              if (!tempo) tempo = Math.round(Number(childText(el, 'tempo')) * 60);
              break;
            case 'Spanner':
              if (el.attrs.type === 'Ottava') {
                const at = measureStart + position;
                if (child(el, 'next')) ottavas.push({ staff, start: at, end: Infinity, shift: OTTAVAS[childText(child(el, 'Ottava'), 'subtype') ?? '8va'] ?? 0 });
                else if (child(el, 'prev')) {
                  const range = ottavas.findLast((o) => o.staff === staff && o.end === Infinity);
                  if (range) range.end = at;
                }
              }
              break;
            case 'location':
              position += fractionLength(childText(el, 'fractions'));
              break;
            case 'Tuplet':
              tuplets.push([Number(childText(el, 'actualNotes') ?? 1), Number(childText(el, 'normalNotes') ?? 1)]);
              break;
            case 'endTuplet':
              tuplets.pop();
              break;
            case 'Chord':
            case 'Rest': {
              const type = childText(el, 'durationType') ?? 'quarter';
              const dots = Number(childText(el, 'dots') ?? 0);
              const grace = el.children.some((c) => /^(acciaccatura|appoggiatura|grace\d+(after)?)$/.test(c.tag));
              const tuplet = tuplets.length ? tuplets[tuplets.length - 1] : null;
              const measureRest = type === 'measure';
              let length = measureRest
                ? fractionLength(childText(el, 'duration')) || declaredLength || (beats * 4) / beatType
                : typeLength(type) * (2 - 0.5 ** dots);
              if (tuplet) length = (length * tuplet[1]) / tuplet[0];
              if (grace) length = 0;
              const move = Number(childText(el, 'staffMove') ?? 0);
              /** @type {Item} */
              const item = {
                kind: el.tag === 'Chord' ? 'note' : 'rest',
                start: position,
                length,
                type: measureRest ? 'whole' : type,
                dots,
                tuplet,
                notes: [],
                staff: Math.min(Math.max(staff + move, 0), staffCount - 1),
                grace,
                beamMode: childText(el, 'BeamMode') ?? '',
                measureRest,
              };
              const at = measureStart + position;
              const shift = ottavas.find((o) => o.staff === staff && o.start <= at && at < o.end)?.shift ?? 0;
              for (const note of children(el, 'Note')) {
                const midi = Number(childText(note, 'pitch')) + shift;
                const tpc = Number(childText(note, 'tpc') ?? 14);
                const spanners = children(note, 'Spanner').filter((s) => s.attrs.type === 'Tie');
                // MuseScore 3.0 wrote <Tie> and <endSpanner> directly in the note; later versions use spanners.
                const tieStart = spanners.some((s) => child(s, 'next')) || !!child(note, 'Tie');
                const tieStop = spanners.some((s) => child(s, 'prev')) || !!child(note, 'endSpanner');
                item.notes.push({ midi, tpc, tieStart, tieStop });
              }
              items.push(item);
              position += length;
              break;
            }
          }
        }
        voices[staff * 4 + v] = items;
      });
    });
    let xml = `<measure number="${m + 1}"${declaredLength && Math.abs(declaredLength - (beats * 4) / beatType) > 1e-6 ? ' implicit="yes"' : ''}>`;
    if (m === 0 || attributes.length || clefChanges.some(Boolean)) {
      xml += '<attributes>';
      if (m === 0) xml += `<divisions>${divisions}</divisions>`;
      if (m === 0 && !attributes.some((a) => a.startsWith('<key'))) xml += `<key><fifths>${fifths}</fifths></key>`;
      xml += attributes.join('');
      if (m === 0) xml += `<staves>${staffCount}</staves>`;
      for (let s = 0; s < staffCount; s++) {
        const clef = m === 0 ? clefs[s] : clefChanges[s];
        if (clef) xml += `<clef number="${s + 1}">${CLEFS[clef] ?? CLEFS[s === 0 ? 'G' : 'F']}</clef>`;
      }
      xml += '</attributes>';
    }
    if (m === 0 && tempo) xml += `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${tempo}</per-minute></metronome></direction-type><sound tempo="${tempo}"/></direction>`;
    xml += barStart;
    let cursor = 0;
    voices.forEach((items, index) => {
      if (!items?.length) return;
      const staff = Math.floor(index / 4);
      const voiceNumber = index + 1;
      // A voice that holds only rests (MuseScore's empty extra voices) is left out.
      if (index % 4 && items.every((i) => i.kind === 'rest')) return;
      const beams = beamGroups(items, beats, beatType);
      if (cursor > 0) xml += `<backup><duration>${ticks(cursor)}</duration></backup>`;
      cursor = 0;
      items.forEach((item, i) => {
        if (item.start > cursor + 1e-6) xml += `<forward><duration>${ticks(item.start - cursor)}</duration><voice>${voiceNumber}</voice><staff>${staff + 1}</staff></forward>`;
        cursor = Math.max(cursor, item.start);
        xml += itemXml(item, voiceNumber, beams[i], ticks);
        cursor += item.length;
      });
      // MuseScore lets a second voice stop early; fill the gap so every voice spans the bar.
      const barLength = declaredLength || (beats * 4) / beatType;
      if (cursor < barLength - 1e-6) {
        xml += `<forward><duration>${ticks(barLength - cursor)}</duration><voice>${voiceNumber}</voice><staff>${staff + 1}</staff></forward>`;
        cursor = barLength;
      }
    });
    xml += barEnd;
    if (m === measureCount - 1 && !barEnd) xml += '<barline location="right"><bar-style>light-heavy</bar-style></barline>';
    xml += '</measure>';
    out.push(xml);
    measureStart += declaredLength || (beats * 4) / beatType;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
${title ? `<work><work-title>${escape(title)}</work-title></work>` : ''}
<identification>${composer ? `<creator type="composer">${escape(composer)}</creator>` : ''}<encoding><software>piano-app mscz import</software></encoding></identification>
<part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
<part id="P1">
${out.join('\n')}
</part>
</score-partwise>
`;
}

/**
 * Beam eighths and shorter within each beat, following MuseScore's own beam breaks.
 * @param {Item[]} items @param {number} beats @param {number} beatType
 * @returns {(string | null)[]}
 */
function beamGroups(items, beats, beatType) {
  const beat = beatType === 8 && beats % 3 === 0 ? 1.5 : 4 / beatType;
  /** @type {(string | null)[]} */
  const result = items.map(() => null);
  /** @type {number[]} */
  let run = [];
  const flush = () => {
    if (run.length > 1) run.forEach((j, k) => (result[j] = k === 0 ? 'begin' : k === run.length - 1 ? 'end' : 'continue'));
    run = [];
  };
  items.forEach((item, j) => {
    if (item.grace) return;
    const beamable = item.kind === 'note' && TYPES.indexOf(item.type) >= TYPES.indexOf('eighth');
    const newBeat = Math.abs(item.start / beat - Math.round(item.start / beat)) < 1e-6;
    if (item.beamMode === 'no' || !beamable) return flush();
    if (item.beamMode === 'begin' || (newBeat && item.beamMode !== 'mid')) flush();
    run.push(j);
  });
  flush();
  return result;
}

/**
 * @param {Item} item @param {number} voice @param {string | null} beam @param {(q: number) => number} ticks
 */
function itemXml(item, voice, beam, ticks) {
  const duration = item.grace ? '' : `<duration>${ticks(item.length)}</duration>`;
  const tail = (/** @type {boolean} */ first, /** @type {{ tieStart: boolean, tieStop: boolean } | null} */ note) => {
    let s = `<voice>${voice}</voice>`;
    if (!item.measureRest) s += `<type>${item.type}</type>` + '<dot/>'.repeat(item.dots);
    if (item.tuplet) s += `<time-modification><actual-notes>${item.tuplet[0]}</actual-notes><normal-notes>${item.tuplet[1]}</normal-notes></time-modification>`;
    s += `<staff>${item.staff + 1}</staff>`;
    if (first && beam) s += `<beam number="1">${beam}</beam>`;
    if (note && (note.tieStart || note.tieStop)) {
      s += '<notations>' + (note.tieStop ? '<tied type="stop"/>' : '') + (note.tieStart ? '<tied type="start"/>' : '') + '</notations>';
    }
    return s;
  };
  if (item.kind === 'rest' || !item.notes.length) {
    return `<note><rest${item.measureRest ? ' measure="yes"' : ''}/>${duration}${tail(true, null)}</note>`;
  }
  return item.notes
    .map((note, k) => {
      const { step, alter, octave } = spell(note.midi, note.tpc);
      const ties = (note.tieStop ? '<tie type="stop"/>' : '') + (note.tieStart ? '<tie type="start"/>' : '');
      return `<note>${item.grace ? '<grace slash="yes"/>' : ''}${k ? '<chord/>' : ''}<pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>${octave}</octave></pitch>${duration}${ties}${tail(k === 0, note)}</note>`;
    })
    .join('');
}
