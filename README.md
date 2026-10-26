# Piano

Webapp installable (PWA) pour apprendre à lire les partitions et à jouer du piano.

## Fonctionnalités

- Clavier virtuel jouable au doigt ou à la souris, avec son.
- Noms des notes sur les touches : aucun, lettres (C D E…) ou solfège (Do Ré Mi…).
- Taille du clavier réglable : 2, 3, 4 octaves ou clavier complet (88 touches).
- Connexion d'un vrai piano en MIDI (Chrome ou Edge, sur ordinateur ou sur Android en USB).
- Installable sur l'écran d'accueil d'Android et utilisable hors ligne une fois ouverte.

À venir : exercices de lecture de notes, bibliothèque de partitions MusicXML, modes main droite / main gauche / deux mains, note par note ou temps réel.

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
