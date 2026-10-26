// Starter pieces, all in the public domain, arranged simply for beginners:
// the tune in the right hand and one or two bass notes per bar in the left.

export const PIECES = [
  {
    id: 'au-clair-de-la-lune',
    title: 'Au clair de la lune',
    composer: 'Traditionnel',
    level: 'Débutant',
    beats: 4, beatType: 4, tempo: 90,
    right: `C4/4 C4/4 C4/4 D4/4 | E4/2 D4/2 | C4/4 E4/4 D4/4 D4/4 | C4/1 |
            C4/4 C4/4 C4/4 D4/4 | E4/2 D4/2 | C4/4 E4/4 D4/4 D4/4 | C4/1 |
            D4/4 D4/4 D4/4 D4/4 | A3/2 A3/2 | D4/4 C4/4 B3/4 A3/4 | G3/1 |
            C4/4 C4/4 C4/4 D4/4 | E4/2 D4/2 | C4/4 E4/4 D4/4 D4/4 | C4/1`,
    left: `C3/1 | C3/2 G2/2 | C3/2 G2/2 | C3/1 |
           C3/1 | C3/2 G2/2 | C3/2 G2/2 | C3/1 |
           G2/1 | F2/1 | G2/1 | G2/1 |
           C3/1 | C3/2 G2/2 | C3/2 G2/2 | C3/1`,
  },
  {
    id: 'frere-jacques',
    title: 'Frère Jacques',
    composer: 'Traditionnel',
    level: 'Débutant',
    beats: 4, beatType: 4, tempo: 100,
    right: `C4/4 D4/4 E4/4 C4/4 | C4/4 D4/4 E4/4 C4/4 | E4/4 F4/4 G4/2 | E4/4 F4/4 G4/2 |
            G4/8 A4/8 G4/8 F4/8 E4/4 C4/4 | G4/8 A4/8 G4/8 F4/8 E4/4 C4/4 | C4/4 G3/4 C4/2 | C4/4 G3/4 C4/2`,
    left: `C3/1 | C3/1 | C3/1 | C3/1 | C3/1 | C3/1 | C3/2 G2/2 | C3/1`,
  },
  {
    id: 'ah-vous-dirai-je-maman',
    title: 'Ah ! vous dirai-je, maman',
    composer: 'Traditionnel',
    level: 'Débutant',
    beats: 4, beatType: 4, tempo: 100,
    right: `C4/4 C4/4 G4/4 G4/4 | A4/4 A4/4 G4/2 | F4/4 F4/4 E4/4 E4/4 | D4/4 D4/4 C4/2 |
            G4/4 G4/4 F4/4 F4/4 | E4/4 E4/4 D4/2 | G4/4 G4/4 F4/4 F4/4 | E4/4 E4/4 D4/2 |
            C4/4 C4/4 G4/4 G4/4 | A4/4 A4/4 G4/2 | F4/4 F4/4 E4/4 E4/4 | D4/4 D4/4 C4/2`,
    left: `C3/1 | F3/2 C3/2 | F3/2 C3/2 | G2/2 C3/2 |
           C3/2 F3/2 | C3/2 G2/2 | C3/2 F3/2 | C3/2 G2/2 |
           C3/1 | F3/2 C3/2 | F3/2 C3/2 | G2/2 C3/2`,
  },
  {
    id: 'ode-a-la-joie',
    title: 'Ode à la joie',
    composer: 'Ludwig van Beethoven',
    level: 'Débutant',
    beats: 4, beatType: 4, tempo: 100,
    right: `E4/4 E4/4 F4/4 G4/4 | G4/4 F4/4 E4/4 D4/4 | C4/4 C4/4 D4/4 E4/4 | E4/4. D4/8 D4/2 |
            E4/4 E4/4 F4/4 G4/4 | G4/4 F4/4 E4/4 D4/4 | C4/4 C4/4 D4/4 E4/4 | D4/4. C4/8 C4/2`,
    left: `C3/1 | G2/1 | C3/1 | G2/1 | C3/1 | G2/1 | C3/1 | G2/2 C3/2`,
  },
];
