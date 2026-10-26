# Piano

Webapp installable (PWA) pour apprendre à lire les partitions et à jouer du piano.

## Fonctionnalités

- Clavier virtuel jouable au doigt ou à la souris, avec son.
- Noms des notes sur les touches : aucun, lettres (C D E…) ou solfège (Do Ré Mi…).
- Clavier de 61 touches (Do2 à Do7, comme le Yamaha NP15), ou réduit à 2, 3 ou 4 octaves autour du Do central pour les petits écrans.
- Connexion d'un vrai piano en MIDI (Chrome ou Edge, sur ordinateur ou sur Android en USB).
- Exercices de lecture de notes en clé de sol, de fa ou les deux : une note à la fois ou une suite de 8 notes, sur la portée ou avec lignes supplémentaires, dièses en option, octave exacte ou non. On répond au clavier virtuel ou sur le vrai piano en MIDI ; après deux erreurs la bonne touche s'allume. Score du premier coup et série en cours.
- Bibliothèque de partitions : quatre morceaux du domaine public inclus (Au clair de la lune, Frère Jacques, Ah ! vous dirai-je maman, Ode à la joie) et import de vos propres fichiers MusicXML (`.musicxml`, `.xml` ou `.mxl` compressé), gardés dans le navigateur. On en trouve sur [IMSLP](https://imslp.org) ou [MuseScore](https://musescore.com), qui permet aussi d'exporter en MusicXML.
- Installable sur l'écran d'accueil d'Android et utilisable hors ligne une fois ouverte.

À venir : jouer les partitions de la bibliothèque, avec les modes main droite / main gauche / deux mains, note par note ou temps réel.

## Lancer en local

L'app n'a aucune dépendance ni étape de compilation : ce sont des fichiers HTML, CSS et JavaScript servis tels quels.

```sh
npm start        # sert le dossier sur http://localhost:8080
```

Le MIDI ne fonctionne que sur `localhost` ou en HTTPS.

## Commandes

- `npm start` : serveur local (Python 3)
- `npm test` : tests (Node 20 ou plus)
- `npm run scores` : régénère les morceaux inclus (`scores/`) à partir de `tools/pieces.js`
- `npm run typecheck` : vérification des types via JSDoc (nécessite `tsc`)

## Crédits

Les symboles musicaux utilisent la police [Bravura](https://github.com/steinbergmedia/bravura) (SIL Open Font License, voir `fonts/BRAVURA-LICENSE.txt`). Les partitions sont affichées avec [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org) 2.2.1 (licence BSD, voir `vendor/OSMD-LICENSE.txt`).
