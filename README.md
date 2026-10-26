# Piano

Webapp installable (PWA) pour apprendre à lire les partitions et à jouer du piano.

## Fonctionnalités

- Clavier virtuel jouable au doigt ou à la souris, avec son.
- Noms des notes sur les touches : aucun, lettres (C D E…) ou solfège (Do Ré Mi…).
- Clavier de 61 touches (Do2 à Do7, comme le Yamaha NP15), ou réduit à 2, 3 ou 4 octaves autour du Do central pour les petits écrans.
- Connexion d'un vrai piano en MIDI (Chrome ou Edge, sur ordinateur ou sur Android en USB).
- Exercices de lecture de notes en clé de sol, de fa ou les deux : une note à la fois ou une suite de 8 notes, sur la portée ou avec lignes supplémentaires, dièses en option, octave exacte ou non. On répond au clavier virtuel ou sur le vrai piano en MIDI ; après deux erreurs la bonne touche s'allume. Score du premier coup et série en cours.
- Installable sur l'écran d'accueil d'Android et utilisable hors ligne une fois ouverte.

À venir : bibliothèque de partitions MusicXML, modes main droite / main gauche / deux mains, note par note ou temps réel.

## Lancer en local

L'app n'a aucune dépendance ni étape de compilation : ce sont des fichiers HTML, CSS et JavaScript servis tels quels.

```sh
npm start        # sert le dossier sur http://localhost:8080
```

Le MIDI ne fonctionne que sur `localhost` ou en HTTPS.

## Commandes

- `npm start` : serveur local (Python 3)
- `npm test` : tests (Node 20 ou plus)
- `npm run typecheck` : vérification des types via JSDoc (nécessite `tsc`)

## Crédits

Les symboles musicaux utilisent la police [Bravura](https://github.com/steinbergmedia/bravura) (SIL Open Font License, voir `fonts/BRAVURA-LICENSE.txt`).
