// Starter pieces, all in the public domain, arranged simply for beginners:
// the tune in the right hand and one or two bass notes per bar in the left.
// A piece without `left` gets one bass note per bar from autoBass (C major tunes).
import { autoBass } from './bass.js';

/** @typedef {{ id: string, title: string, composer: string, level: string, beats: number, beatType: number, tempo: number, right: string, left?: string, fifths?: number, pickup?: boolean }} PieceSource */

/** @type {PieceSource[]} */
const SOURCES = [
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

  // Comptines : la main droite reste dans la position de Do (5 notes) ou presque.
  {
    id: 'hot-cross-buns',
    title: 'Hot Cross Buns',
    composer: 'Traditionnel anglais',
    level: 'Débutant',
    beats: 4, beatType: 4, tempo: 90,
    right: `E4/4 D4/4 C4/2 | E4/4 D4/4 C4/2 | C4/8 C4/8 C4/8 C4/8 D4/8 D4/8 D4/8 D4/8 | E4/4 D4/4 C4/2 |
            E4/4 D4/4 C4/2 | E4/4 D4/4 C4/2 | C4/8 C4/8 C4/8 C4/8 D4/8 D4/8 D4/8 D4/8 | E4/4 D4/4 C4/2`,
  },
  {
    id: 'mary-had-a-little-lamb',
    title: 'Mary Had a Little Lamb',
    composer: 'Traditionnel américain',
    level: 'Débutant',
    beats: 4, beatType: 4, tempo: 100,
    right: `E4/4 D4/4 C4/4 D4/4 | E4/4 E4/4 E4/2 | D4/4 D4/4 D4/2 | E4/4 G4/4 G4/2 |
            E4/4 D4/4 C4/4 D4/4 | E4/4 E4/4 E4/4 E4/4 | D4/4 D4/4 E4/4 D4/4 | C4/1`,
  },
  {
    id: 'une-souris-verte',
    title: 'Une souris verte',
    composer: 'Traditionnel',
    level: 'Débutant',
    beats: 2, beatType: 4, tempo: 90,
    right: `C4/8 C4/8 C4/8 D4/8 | C4/4 G3/4 | C4/8 C4/8 C4/8 D4/8 | C4/4 G3/4 |
            F4/8 E4/8 D4/8 E4/8 | F4/8 E4/8 D4/4 | F4/8 E4/8 D4/8 E4/8 | F4/8 E4/8 D4/4 |
            C4/8 C4/8 C4/8 D4/8 | C4/4 G3/4 | C4/8 C4/8 C4/8 D4/8 | C4/4 G3/4 |
            C4/8 C4/8 D4/8 C4/8 | C4/8 C4/8 D4/4 | G4/2 | C4/2`,
  },
  {
    id: 'pirouette-cacahuete',
    title: 'Pirouette cacahuète',
    composer: 'Traditionnel',
    level: 'Débutant',
    beats: 2, beatType: 4, tempo: 100,
    right: `C4/8 C4/8 C4/8 D4/8 | E4/8 E4/8 D4/4 | E4/8 F4/8 G4/8 G4/8 | F4/8 E4/8 D4/4 |
            C4/8 C4/8 C4/8 D4/8 | E4/8 E4/8 D4/4 | E4/8 F4/8 G4/8 E4/8 | D4/8 D4/8 C4/4 |
            E4/8 F4/8 G4/8 E4/8 | D4/8 D4/8 C4/4 | E4/8 F4/8 G4/8 E4/8 | D4/8 D4/8 C4/4`,
  },
  {
    id: 'sur-le-pont-d-avignon',
    title: "Sur le pont d'Avignon",
    composer: 'Traditionnel',
    level: 'Débutant',
    beats: 2, beatType: 4, tempo: 100,
    right: `C4/8 C4/8 C4/4 | D4/8 D4/8 D4/4 | E4/8 F4/8 G4/8 C4/8 | B3/8 C4/8 D4/8 G3/8 |
            C4/8 C4/8 C4/4 | D4/8 D4/8 D4/4 | E4/8 F4/8 G4/8 C4/8 | D4/8 B3/8 C4/4`,
  },
  {
    id: 'j-ai-du-bon-tabac',
    title: "J'ai du bon tabac",
    composer: 'Traditionnel',
    level: 'Débutant',
    beats: 2, beatType: 4, tempo: 100,
    right: `C4/8 D4/8 E4/8 C4/8 | D4/4 D4/8 E4/8 | F4/4 F4/4 | E4/4 E4/4 |
            C4/8 D4/8 E4/8 C4/8 | D4/4 D4/8 E4/8 | F4/4 G4/4 | C4/2 |
            G4/8 G4/8 F4/8 E4/8 | D4/4 D4/4 | G4/8 G4/8 F4/8 E4/8 | D4/2 |
            C4/8 D4/8 E4/8 C4/8 | D4/4 D4/8 E4/8 | F4/4 G4/4 | C4/2`,
  },
  {
    id: 'il-etait-un-petit-navire',
    title: 'Il était un petit navire',
    composer: 'Traditionnel',
    level: 'Débutant',
    beats: 2, beatType: 4, tempo: 100,
    right: `G3/8 C4/8 C4/8 C4/8 | C4/8 D4/8 E4/8 D4/8 | C4/2 |
            G3/8 C4/8 C4/8 C4/8 | C4/8 D4/8 E4/8 D4/8 | C4/2 |
            E4/8 F4/8 G4/8 G4/8 | G4/8 A4/8 G4/8 F4/8 | E4/8 D4/8 C4/4 |
            E4/8 F4/8 G4/8 G4/8 | G4/8 A4/8 G4/8 F4/8 | E4/8 D4/8 C4/4 |
            G4/4 E4/4 | G4/4 C4/4`,
  },
  {
    id: 'ah-les-crocodiles',
    title: 'Ah ! les crocodiles',
    composer: 'Traditionnel',
    level: 'Débutant',
    beats: 2, beatType: 4, tempo: 100,
    right: `C4/8 C4/8 C4/8 E4/8 | G4/4 G4/4 | A4/8 A4/8 G4/8 F4/8 | E4/2 |
            F4/8 F4/8 F4/8 D4/8 | E4/8 E4/8 E4/8 C4/8 | D4/8 D4/8 E4/8 D4/8 | C4/2 |
            G4/2 | E4/8 E4/8 E4/8 E4/8 | F4/8 F4/8 F4/8 F4/8 | E4/4 r/4 |
            E4/8 E4/8 F4/8 G4/8 | A4/4 G4/4 | G4/8 F4/8 E4/8 D4/8 | C4/2`,
  },
  {
    id: 'alouette',
    title: 'Alouette, gentille alouette',
    composer: 'Traditionnel',
    level: 'Débutant',
    beats: 4, beatType: 4, tempo: 100,
    right: `C4/4. D4/8 E4/4 E4/4 | D4/8 C4/8 D4/8 E4/8 C4/4 G3/4 | C4/4. D4/8 E4/4 E4/4 | D4/8 C4/8 D4/8 E4/8 C4/2 |
            G4/8 G4/8 G4/4 G4/8 G4/8 G4/4 | G4/8 G4/8 G4/4 G4/8 G4/8 G4/4 | G4/1 |
            C4/4. D4/8 E4/4 E4/4 | D4/8 C4/8 D4/8 E4/8 C4/4 G3/4 | C4/4. D4/8 E4/4 E4/4 | D4/8 C4/8 D4/8 E4/8 C4/2`,
  },
  {
    id: 'vive-le-vent',
    title: 'Vive le vent (Jingle Bells)',
    composer: 'James Lord Pierpont',
    level: 'Débutant',
    beats: 4, beatType: 4, tempo: 110,
    right: `E4/4 E4/4 E4/2 | E4/4 E4/4 E4/2 | E4/4 G4/4 C4/4. D4/8 | E4/1 |
            F4/4 F4/4 F4/4. F4/8 | F4/4 E4/4 E4/4 E4/8 E4/8 | E4/4 D4/4 D4/4 E4/4 | D4/2 G4/2 |
            E4/4 E4/4 E4/2 | E4/4 E4/4 E4/2 | E4/4 G4/4 C4/4. D4/8 | E4/1 |
            F4/4 F4/4 F4/4 F4/4 | F4/4 E4/4 E4/4 E4/8 E4/8 | G4/4 G4/4 F4/4 D4/4 | C4/1`,
  },
  // Un peu plus loin : petits sauts, levées, mesures à 3 temps.
  {
    id: 'london-bridge',
    title: 'London Bridge Is Falling Down',
    composer: 'Traditionnel anglais',
    level: 'Facile',
    beats: 4, beatType: 4, tempo: 100,
    right: `G4/4. A4/8 G4/4 F4/4 | E4/4 F4/4 G4/2 | D4/4 E4/4 F4/2 | E4/4 F4/4 G4/2 |
            G4/4. A4/8 G4/4 F4/4 | E4/4 F4/4 G4/2 | D4/2 G4/2 | E4/4 C4/2.`,
  },
  {
    id: 'old-macdonald',
    title: 'Old MacDonald Had a Farm',
    composer: 'Traditionnel américain',
    level: 'Facile',
    beats: 4, beatType: 4, tempo: 110,
    right: `C4/4 C4/4 C4/4 G3/4 | A3/4 A3/4 G3/2 | E4/4 E4/4 D4/4 D4/4 | C4/2. G3/4 |
            C4/4 C4/4 C4/4 G3/4 | A3/4 A3/4 G3/2 | E4/4 E4/4 D4/4 D4/4 | C4/2. G3/8 G3/8 |
            C4/4 C4/4 C4/4 G3/8 G3/8 | C4/4 C4/4 C4/2 | C4/8 C4/8 C4/4 C4/8 C4/8 C4/4 | C4/8 C4/8 C4/8 C4/8 C4/4 C4/4 |
            C4/4 C4/4 C4/4 G3/4 | A3/4 A3/4 G3/2 | E4/4 E4/4 D4/4 D4/4 | C4/1`,
  },
  {
    id: 'kumbaya',
    title: 'Kumbaya',
    composer: 'Spiritual traditionnel',
    level: 'Facile',
    beats: 4, beatType: 4, tempo: 80,
    right: `C4/4 E4/4 G4/4. G4/8 | A4/4 A4/4 G4/2 | C4/4 E4/4 G4/4. G4/8 | F4/4 E4/4 D4/2 |
            C4/4 E4/4 G4/4. G4/8 | A4/4 A4/4 G4/2 | F4/4 E4/4 D4/4 D4/4 | C4/1`,
  },
  {
    id: 'when-the-saints',
    title: 'When the Saints Go Marching In',
    composer: 'Spiritual traditionnel',
    level: 'Facile',
    beats: 4, beatType: 4, tempo: 120,
    right: `r/4 C4/4 E4/4 F4/4 | G4/1 | r/4 C4/4 E4/4 F4/4 | G4/1 |
            r/4 C4/4 E4/4 F4/4 | G4/2 E4/2 | C4/2 E4/2 | D4/1 |
            r/4 E4/4 E4/4 D4/4 | C4/2. C4/4 | E4/2 G4/4 G4/4 | F4/2 E4/4 F4/4 |
            G4/2 E4/2 | C4/2 D4/2 | C4/1`,
  },
  {
    id: 'joyeux-anniversaire',
    title: 'Joyeux anniversaire',
    composer: 'Mildred et Patty Hill',
    level: 'Facile',
    beats: 3, beatType: 4, tempo: 100, pickup: true,
    right: `G4/8 G4/8 | A4/4 G4/4 C5/4 | B4/2 G4/8 G4/8 | A4/4 G4/4 D5/4 | C5/2 G4/8 G4/8 |
            G5/4 E5/4 C5/4 | B4/4 A4/4 F5/8 F5/8 | E5/4 C5/4 D5/4 | C5/2.`,
  },
  {
    id: 'amazing-grace',
    title: 'Amazing Grace',
    composer: 'John Newton (paroles), air traditionnel',
    level: 'Facile',
    beats: 3, beatType: 4, tempo: 80, pickup: true,
    right: `G3/4 | C4/2 E4/8 C4/8 | E4/2 D4/4 | C4/2 A3/4 | G3/2 G3/4 |
            C4/2 E4/8 C4/8 | E4/2 D4/4 | G4/2 E4/4 | G4/2 E4/8 C4/8 |
            E4/2 D4/4 | C4/2 A3/4 | G3/2 G3/4 | C4/2 E4/8 C4/8 | E4/2 D4/4 | C4/2.`,
  },
  {
    id: 'douce-nuit',
    title: 'Douce nuit',
    composer: 'Franz Xaver Gruber',
    level: 'Facile',
    beats: 3, beatType: 4, tempo: 70,
    right: `G4/4. A4/8 G4/4 | E4/2. | G4/4. A4/8 G4/4 | E4/2. |
            D5/2 D5/4 | B4/2. | C5/2 C5/4 | G4/2. |
            A4/2 A4/4 | C5/4. B4/8 A4/4 | G4/4. A4/8 G4/4 | E4/2. |
            A4/2 A4/4 | C5/4. B4/8 A4/4 | G4/4. A4/8 G4/4 | E4/2. |
            D5/2 D5/4 | F5/4. D5/8 B4/4 | C5/2. | E5/2. |
            C5/4 G4/4 E4/4 | G4/4. F4/8 D4/4 | C4/2. | C4/2.`,
    left: `C3/2. | C3/2. | C3/2. | C3/2. |
           G2/2. | G2/2. | C3/2. | C3/2. |
           F2/2. | F2/2. | C3/2. | C3/2. |
           F2/2. | F2/2. | C3/2. | C3/2. |
           G2/2. | G2/2. | C3/2. | C3/2. |
           C3/2. | G2/2. | C3/2. | C3/2.`,
  },
  {
    id: 'il-est-ne-le-divin-enfant',
    title: 'Il est né le divin enfant',
    composer: 'Traditionnel',
    level: 'Facile',
    beats: 2, beatType: 4, tempo: 100,
    right: `G3/8 C4/8 C4/8 E4/8 | C4/8 E4/8 G4/4 | A4/8 G4/8 F4/8 E4/8 | D4/8 E4/8 C4/4 |
            G3/8 C4/8 C4/8 E4/8 | C4/8 E4/8 G4/4 | A4/8 G4/8 F4/8 E4/8 | D4/8 G3/8 C4/4`,
  },
  {
    id: 'greensleeves',
    title: 'Greensleeves',
    composer: 'Traditionnel anglais',
    level: 'Intermédiaire',
    beats: 3, beatType: 4, tempo: 90, pickup: true,
    right: `A4/4 | C5/2 D5/4 | E5/4. F5/8 E5/4 | D5/2 B4/4 | G4/4. A4/8 B4/4 |
            C5/2 A4/4 | A4/4. G#4/8 A4/4 | B4/2 G#4/4 | E4/2 A4/4 |
            C5/2 D5/4 | E5/4. F5/8 E5/4 | D5/2 B4/4 | G4/4. A4/8 B4/4 |
            C5/4. B4/8 A4/4 | G#4/4. F#4/8 G#4/4 | A4/2. |
            G5/2. | G5/4. F#5/8 E5/4 | D5/2 B4/4 | G4/4. A4/8 B4/4 |
            C5/2 A4/4 | A4/4. G#4/8 A4/4 | B4/2 G#4/4 | E4/2. |
            G5/2. | G5/4. F#5/8 E5/4 | D5/2 B4/4 | G4/4. A4/8 B4/4 |
            C5/4. B4/8 A4/4 | G#4/4. F#4/8 G#4/4 | A4/2.`,
    left: `r/4 | A2/2. | C3/2. | G2/2. | G2/2. |
           A2/2. | A2/2. | E2/2. | E2/2. |
           A2/2. | C3/2. | G2/2. | G2/2. |
           A2/2. | E2/2. | A2/2. |
           C3/2. | C3/2. | G2/2. | G2/2. |
           A2/2. | A2/2. | E2/2. | E2/2. |
           C3/2. | C3/2. | G2/2. | G2/2. |
           A2/2. | E2/2. | A2/2.`,
  },
  // Classique simplifié.
  {
    id: 'berceuse-de-brahms',
    title: 'Berceuse',
    composer: 'Johannes Brahms',
    level: 'Facile',
    beats: 3, beatType: 4, tempo: 80, pickup: true,
    right: `E4/8 E4/8 | G4/2 E4/8 E4/8 | G4/2 E4/8 G4/8 | C5/4 B4/4. A4/8 | A4/4 G4/4 D4/8 E4/8 |
            F4/4 D4/4 D4/8 E4/8 | F4/2 D4/8 F4/8 | B4/8 A4/8 G4/4 B4/4 | C5/2 C4/8 C4/8 |
            C5/2 A4/8 F4/8 | G4/2 E4/8 C4/8 | F4/4 G4/4 A4/4 | G4/2 C4/8 C4/8 |
            C5/2 A4/8 F4/8 | G4/2 E4/8 C4/8 | F4/4 E4/4 D4/4 | C4/2.`,
    left: `r/4 | C3/2. | C3/2. | G2/2. | G2/2. |
           G2/2. | G2/2. | G2/2. | C3/2. |
           F2/2. | C3/2. | G2/2. | C3/2. |
           F2/2. | C3/2. | G2/2. | C3/2.`,
  },
  {
    id: 'le-printemps-vivaldi',
    title: 'Le Printemps (thème)',
    composer: 'Antonio Vivaldi',
    level: 'Facile',
    beats: 4, beatType: 4, tempo: 100,
    right: `C4/4 E4/4 E4/4 E4/4 | D4/8 C4/8 G4/2. | G4/8 F4/8 E4/4 E4/4 E4/4 | D4/8 C4/8 G4/2. |
            G4/8 F4/8 E4/4 F4/8 G4/8 F4/4 | E4/2 D4/2 |
            C4/4 E4/4 E4/4 E4/4 | D4/8 C4/8 G4/2. | G4/8 F4/8 E4/4 E4/4 E4/4 | D4/8 C4/8 G4/2. |
            G4/8 F4/8 E4/4 F4/8 G4/8 F4/4 | E4/4 D4/4 C4/2`,
  },
  {
    id: 'canon-de-pachelbel',
    title: 'Canon (version facile)',
    composer: 'Johann Pachelbel',
    level: 'Facile',
    beats: 4, beatType: 4, tempo: 70,
    right: `E5/2 D5/2 | C5/2 B4/2 | A4/2 G4/2 | A4/2 B4/2 |
            C5/2 B4/2 | A4/2 G4/2 | F4/2 E4/2 | F4/2 D4/2 |
            C4/4 E4/4 G4/4 F4/4 | E4/4 C4/4 E4/4 D4/4 | C4/4 A3/4 C4/4 G4/4 | F4/4 A4/4 G4/4 F4/4 | E4/1`,
    left: `C3/2 G2/2 | A2/2 E2/2 | F2/2 C2/2 | F2/2 G2/2 |
           C3/2 G2/2 | A2/2 E2/2 | F2/2 C2/2 | F2/2 G2/2 |
           C3/2 G2/2 | A2/2 E2/2 | F2/2 C2/2 | F2/2 G2/2 | C3/1`,
  },
  {
    id: 'menuet-en-sol',
    title: 'Menuet en sol',
    composer: 'Christian Petzold (attribué à J.-S. Bach)',
    level: 'Intermédiaire',
    beats: 3, beatType: 4, tempo: 100, fifths: 1,
    right: `D5/4 G4/8 A4/8 B4/8 C5/8 | D5/4 G4/4 G4/4 | E5/4 C5/8 D5/8 E5/8 F#5/8 | G5/4 G4/4 G4/4 |
            C5/4 D5/8 C5/8 B4/8 A4/8 | B4/4 C5/8 B4/8 A4/8 G4/8 | F#4/4 G4/8 A4/8 B4/8 G4/8 | A4/2. |
            D5/4 G4/8 A4/8 B4/8 C5/8 | D5/4 G4/4 G4/4 | E5/4 C5/8 D5/8 E5/8 F#5/8 | G5/4 G4/4 G4/4 |
            C5/4 D5/8 C5/8 B4/8 A4/8 | B4/4 C5/8 B4/8 A4/8 G4/8 | A4/4 B4/8 A4/8 G4/8 F#4/8 | G4/2.`,
    left: `G3/2 A3/4 | B3/2. | C4/2. | B3/2. |
           A3/2. | G3/2. | D4/4 B3/4 G3/4 | D4/2 D3/4 |
           B3/2 A3/4 | G3/2. | C4/2. | B3/2. |
           A3/2 F#3/4 | G3/2 B3/4 | C4/4 D4/4 D3/4 | G3/2 G2/4`,
  },
  {
    id: 'le-cygne',
    title: 'Le Cygne (thème)',
    composer: 'Camille Saint-Saëns',
    level: 'Intermédiaire',
    beats: 6, beatType: 4, tempo: 60, fifths: 1,
    right: `G5/2. F#5/4 B4/4 E5/4 | D5/2. G4/4 A4/4 B4/4 | C5/4 D5/4 E5/4 A4/4 B4/4 C5/4 | D5/1 r/2 |
            E5/2. D5/4 B4/4 G4/4 | A4/2. F#4/4 G4/4 A4/4 | B4/4 C5/4 B4/4 A4/4 G4/4 F#4/4 | G4/1 r/2`,
    left: `G2/2. G2/2. | B2/2. B2/2. | C3/2. A2/2. | D3/2. D3/2. |
           C3/2. G2/2. | D3/2. D3/2. | D3/2. D3/2. | G2/2. G2/2.`,
  },
  {
    id: 'lettre-a-elise',
    title: 'La Lettre à Élise (début)',
    composer: 'Ludwig van Beethoven',
    level: 'Intermédiaire',
    beats: 3, beatType: 8, tempo: 60, pickup: true,
    right: `E5/16 D#5/16 |
            E5/16 D#5/16 E5/16 B4/16 D5/16 C5/16 | A4/8 r/16 C4/16 E4/16 A4/16 | B4/8 r/16 E4/16 G#4/16 B4/16 | C5/8 r/16 E4/16 E5/16 D#5/16 |
            E5/16 D#5/16 E5/16 B4/16 D5/16 C5/16 | A4/8 r/16 C4/16 E4/16 A4/16 | B4/8 r/16 E4/16 C5/16 B4/16 | A4/8 r/8 E5/16 D#5/16 |
            E5/16 D#5/16 E5/16 B4/16 D5/16 C5/16 | A4/8 r/16 C4/16 E4/16 A4/16 | B4/8 r/16 E4/16 G#4/16 B4/16 | C5/8 r/16 E4/16 E5/16 D#5/16 |
            E5/16 D#5/16 E5/16 B4/16 D5/16 C5/16 | A4/8 r/16 C4/16 E4/16 A4/16 | B4/8 r/16 E4/16 C5/16 B4/16 | A4/8 r/16 B4/16 C5/16 D5/16 |
            E5/8. G4/16 F5/16 E5/16 | D5/8. F4/16 E5/16 D5/16 | C5/8. E4/16 D5/16 C5/16 | B4/8 r/16 E4/16 E5/16 D#5/16 |
            E5/16 D#5/16 E5/16 B4/16 D5/16 C5/16 | A4/8 r/16 C4/16 E4/16 A4/16 | B4/8 r/16 E4/16 C5/16 B4/16 | A4/4.`,
    left: `r/8 |
           r/4. | A2/4. | E2/4. | A2/4. |
           r/4. | A2/4. | E2/4. | A2/4. |
           r/4. | A2/4. | E2/4. | A2/4. |
           r/4. | A2/4. | E2/4. | A2/4. |
           C3/4. | G2/4. | A2/4. | E2/4. |
           r/4. | A2/4. | E2/4. | A2/4.`,
  },
];

const LEVEL_ORDER = ['Débutant', 'Facile', 'Intermédiaire', 'Avancé'];

/** All starter pieces, easiest first, each with a left hand. */
export const PIECES = SOURCES
  .map((piece) => ({ ...piece, left: piece.left ?? autoBass(piece.right, piece) }))
  .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
