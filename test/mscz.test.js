import assert from 'node:assert/strict';
import { test } from 'node:test';
import { msczToMusicXml, mscxToMusicXml, parseXml, spell, unzip } from '../src/mscz.js';

/** A two-staff MuseScore 4 score with the cases piano scores use. */
const MSCX = `<?xml version="1.0" encoding="UTF-8"?>
<museScore version="4.50">
  <Score>
    <Division>480</Division>
    <metaTag name="composer">Composer / arranger</metaTag>
    <metaTag name="workTitle">Untitled score</metaTag>
    <Part><Staff id="1"/><Staff id="2"><defaultClef>F</defaultClef></Staff></Part>
    <Staff id="1">
      <VBox><Text><style>title</style><text>Valse &amp; <b>air</b></text></Text>
        <Text><style>composer</style><text>Anonyme</text></Text></VBox>
      <Measure>
        <voice>
          <KeySig><concertKey>-1</concertKey></KeySig>
          <TimeSig><sigN>3</sigN><sigD>4</sigD></TimeSig>
          <Tempo><tempo>1.5</tempo></Tempo>
          <Chord><durationType>half</durationType>
            <Note><Spanner type="Tie"><Tie/><next><location><fractions>1/2</fractions></location></next></Spanner><pitch>70</pitch><tpc>12</tpc></Note>
            <Note><pitch>74</pitch><tpc>16</tpc></Note>
          </Chord>
          <Tuplet><normalNotes>2</normalNotes><actualNotes>3</actualNotes><baseNote>eighth</baseNote></Tuplet>
          <Chord><durationType>eighth</durationType><Note><pitch>70</pitch><tpc>12</tpc><Spanner type="Tie"><Tie/><prev><location><fractions>-1/2</fractions></location></prev></Spanner></Note></Chord>
          <Chord><durationType>eighth</durationType><Note><pitch>72</pitch><tpc>14</tpc></Note></Chord>
          <Chord><durationType>eighth</durationType><staffMove>1</staffMove><Note><pitch>57</pitch><tpc>17</tpc></Note></Chord>
          <endTuplet/>
        </voice>
      </Measure>
      <Measure>
        <voice>
          <Spanner type="Ottava"><Ottava><subtype>8va</subtype></Ottava><next><location><measures>1</measures></location></next></Spanner>
          <Chord><acciaccatura/><durationType>eighth</durationType><Note><pitch>81</pitch><tpc>17</tpc></Note></Chord>
          <Chord><dots>1</dots><durationType>half</durationType><Note><pitch>79</pitch><tpc>15</tpc></Note></Chord>
          <Spanner type="Ottava"><prev><location><measures>-1</measures></location></prev></Spanner>
        </voice>
      </Measure>
    </Staff>
    <Staff id="2">
      <Measure>
        <voice>
          <Rest><durationType>measure</durationType><duration>3/4</duration></Rest>
        </voice>
      </Measure>
      <Measure>
        <voice>
          <location><fractions>1/4</fractions></location>
          <Chord><durationType>half</durationType><Note><pitch>53</pitch><tpc>13</tpc></Note></Chord>
        </voice>
      </Measure>
    </Staff>
  </Score>
</museScore>`;

/** @param {string} xml */
const notes = (xml) => [...xml.matchAll(/<note>.*?<\/note>/g)].map((m) => m[0]);

test('spells pitches from the tonal pitch class', () => {
  assert.deepEqual(spell(70, 12), { step: 'B', alter: -1, octave: 4 });
  assert.deepEqual(spell(61, 21), { step: 'C', alter: 1, octave: 4 });
  assert.deepEqual(spell(60, 26), { step: 'B', alter: 1, octave: 3 });
  assert.deepEqual(spell(59, 7), { step: 'C', alter: -1, octave: 4 });
});

test('parses elements, attributes, entities and self-closing tags', () => {
  const doc = parseXml('<?xml version="1.0"?><a x="1 &amp; 2"><b/><!-- note --><c>&lt;hi&gt;</c></a>');
  const a = doc.children[0];
  assert.equal(a.attrs.x, '1 & 2');
  assert.deepEqual(a.children.map((c) => c.tag), ['b', 'c']);
  assert.equal(a.children[1].text, '<hi>');
});

test('converts a MuseScore score to MusicXML', () => {
  const xml = mscxToMusicXml(MSCX);
  assert.match(xml, /<work-title>Valse &amp; air<\/work-title>/);
  assert.match(xml, /<creator type="composer">Anonyme<\/creator>/);
  assert.match(xml, /<key><fifths>-1<\/fifths><\/key><time><beats>3<\/beats><beat-type>4<\/beat-type><\/time>/);
  assert.match(xml, /<clef number="2"><sign>F<\/sign>/);
  assert.match(xml, /<sound tempo="90"\/>/);

  const [first, second] = xml.split('</measure>');
  const firstNotes = notes(first);
  // Bb4 + D5 half chord, the Bb tied into the first triplet note.
  assert.match(firstNotes[0], /<step>B<\/step><alter>-1<\/alter><octave>4<\/octave>.*<duration>960<\/duration><tie type="start"\/>/);
  assert.match(firstNotes[1], /<chord\/><pitch><step>D<\/step><octave>5<\/octave>/);
  assert.match(firstNotes[2], /<duration>160<\/duration><tie type="stop"\/>.*<actual-notes>3<\/actual-notes>.*<beam number="1">begin<\/beam>/);
  // The third triplet note is written on the lower staff.
  assert.match(firstNotes[4], /<step>A<\/step><octave>3<\/octave>.*<staff>2<\/staff>/);
  assert.match(firstNotes[5], /<rest measure="yes"\/><duration>1440<\/duration>/);

  const secondNotes = notes(second);
  // Under the 8va line, notes sound an octave higher; the grace note takes no time.
  assert.match(secondNotes[0], /<grace slash="yes"\/><pitch><step>A<\/step><octave>6<\/octave><\/pitch><voice>/);
  assert.match(secondNotes[1], /<step>G<\/step><octave>6<\/octave>.*<duration>1440<\/duration>.*<dot\/>/);
  // A gap at the start of a voice becomes a forward.
  assert.match(second, /<backup><duration>1440<\/duration><\/backup><forward><duration>480<\/duration><voice>5<\/voice><staff>2<\/staff><\/forward>/);
  assert.match(secondNotes[2], /<step>F<\/step><octave>3<\/octave>/);
});

test('reads the score inside a .mscz archive', async () => {
  const name = 'score.mscx';
  const data = new TextEncoder().encode(MSCX);
  const deflated = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  const files = await unzip(zip([{ name: 'META-INF/container.xml', data: new TextEncoder().encode(`<rootfile full-path="${name}"/>`) }, { name, data: deflated, method: 8 }]));
  assert.equal(new TextDecoder().decode(files.get(name)), MSCX);
  const xml = await msczToMusicXml(zip([{ name, data: deflated, method: 8 }]));
  assert.match(xml, /<work-title>Valse &amp; air<\/work-title>/);
});

/**
 * A minimal zip writer for the tests (no checksums, which the reader ignores).
 * @param {{ name: string, data: Uint8Array, method?: number }[]} entries
 */
function zip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const { name, data, method = 0 } of entries) {
    const nameBytes = new TextEncoder().encode(name);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(8, method, true);
    local.setUint32(18, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    chunks.push(new Uint8Array(local.buffer), nameBytes, data);
    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(10, method, true);
    entry.setUint32(20, data.length, true);
    entry.setUint16(28, nameBytes.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
  let pos = 0;
  for (const c of all) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}
