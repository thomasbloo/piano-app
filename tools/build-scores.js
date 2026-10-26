// Writes the starter pieces to scores/*.musicxml and the list to scores/index.json.
// Run with: npm run scores
import { writeFileSync } from 'node:fs';
import { buildMusicXml } from './musicxml.js';
import { PIECES } from './pieces.js';

const index = PIECES.map(({ id, title, composer, level }) => {
  writeFileSync(`scores/${id}.musicxml`, buildMusicXml(PIECES.find((p) => p.id === id)));
  return { id, title, composer, level, file: `scores/${id}.musicxml` };
});
writeFileSync('scores/index.json', JSON.stringify(index, null, 2) + '\n');
console.log(`${index.length} partitions écrites dans scores/`);
