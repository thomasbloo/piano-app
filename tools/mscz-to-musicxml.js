// Converts MuseScore files to MusicXML: node tools/mscz-to-musicxml.js score.mscz [out.musicxml]
import { readFileSync, writeFileSync } from 'node:fs';
import { msczToMusicXml, mscxToMusicXml } from '../src/mscz.js';

const [input, output = input.replace(/\.msc[zx]$/i, '') + '.musicxml'] = process.argv.slice(2);
const bytes = readFileSync(input);
const xml = bytes[0] === 0x50 && bytes[1] === 0x4b ? await msczToMusicXml(new Uint8Array(bytes)) : mscxToMusicXml(bytes.toString('utf8'));
writeFileSync(output, xml);
console.log(`${input} → ${output}`);
