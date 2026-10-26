# Piano

Webapp installable (PWA) pour apprendre à lire les partitions et à jouer du piano.

## Fonctionnalités

- Clavier virtuel jouable au doigt ou à la souris, avec son.
- Noms des notes sur les touches : aucun, lettres (C D E…) ou solfège (Do Ré Mi…).
- Clavier de 61 touches (Do2 à Do7, comme le Yamaha NP15), ou réduit à 2, 3 ou 4 octaves autour du Do central pour les petits écrans.
- Connexion d'un vrai piano en MIDI (Chrome ou Edge, sur ordinateur ou sur Android en USB).
- Exercices de lecture de notes en clé de sol, de fa ou les deux : une note à la fois ou une suite de 8 notes, sur la portée ou avec lignes supplémentaires, dièses en option, octave exacte ou non. On répond au clavier virtuel ou sur le vrai piano en MIDI ; après deux erreurs la bonne touche s'allume. Score du premier coup et série en cours.
- Bibliothèque de partitions : quatre morceaux du domaine public inclus (Au clair de la lune, Frère Jacques, Ah ! vous dirai-je maman, Ode à la joie) et import de vos propres fichiers MusicXML (`.musicxml`, `.xml` ou `.mxl` compressé) ou MuseScore (`.mscz`, `.mscx`, convertis en MusicXML à l'import), gardés dans le navigateur de l'appareil. Chaque partition a un niveau (Débutant, Facile, Intermédiaire, Avancé), choisi à l'import et modifiable ensuite, et la liste peut être filtrée par niveau. On en trouve sur [IMSLP](https://imslp.org) ou [MuseScore](https://musescore.com), dont les fichiers `.mscz` s'importent tels quels.
- Jouer une partition de la bibliothèque, main droite, main gauche ou les deux mains :
  - **note par note** : la partition attend que vous jouiez les bonnes notes sous le curseur ;
  - **temps réel** : après une mesure de décompte, le curseur avance au tempo (50, 75 ou 100 %) et chaque note est jugée juste, manquée ou fausse.

  L'app joue l'autre main pour vous, peut colorer la prochaine touche à jouer (activable pendant le morceau), et donne un bilan à la fin.
- Thème sombre par défaut (thème clair dans ⚙ Réglages). L'écran tient sans défilement : la partition défile dans sa zone et le clavier reste toujours visible en bas.
- Installable sur l'écran d'accueil d'Android et utilisable hors ligne une fois ouverte.

## Utiliser l'app sur une tablette Android

1. L'app est publiée automatiquement sur GitHub Pages à chaque modification de `main`, à l'adresse `https://thomasbloo.github.io/piano-app/`. Réglage à faire une seule fois : dans le dépôt, Settings → Pages → Source : « GitHub Actions ». GitHub Pages demande un dépôt public ou un compte GitHub payant.
2. Ouvrez l'adresse dans Chrome sur la tablette, puis menu ⋮ → « Installer l'application ».
3. Pour jouer sur le Yamaha NP15 : reliez son port USB TO HOST à la tablette avec un câble USB-B vers USB-C (ou un adaptateur OTG), puis touchez ⚙ Réglages → « Connecter le MIDI ». Ensuite, l'app se reconnecte toute seule à chaque ouverture.

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
