# Application d'Exercices d'Orthophonie

Cette application web permet de réaliser des exercices d'orthophonie basés sur la prononciation de voyelles à des hauteurs spécifiques.

## Fonctionnalités

- Génération aléatoire de voyelles (a, e, i, o, u, ou)
- Génération aléatoire de notes musicales (do, ré, mi, fa, sol, la, si) entre 90Hz et 880Hz
- Minuteur pour maintenir la vocalise pendant 10 secondes
- Enregistrement audio et lecture
- Analyse de la hauteur vocale (pitch)
- Représentation des notes sur une portée musicale

## Structure du projet

```
projet_prototype/
│
├── index.html                # Page HTML principale
├── css-file.css              # Dossier pour les styles CSS
│                             # Fichier CSS principal
├── js-file.js                # Dossier pour les scripts JavaScript
│                             # Fichier JavaScript principal
├── assets/                   # Ressources (images, polices, etc.)
│   ├── images/               # Images utilisées dans le projet
│   └── fonts/                # Polices personnalisées
```

## Installation et lancement

1. Clonez ce dépôt
2. Ouvrez le fichier `index.html` dans votre navigateur

Pour le développement, vous pouvez utiliser un serveur local comme Live Server pour VS Code.

## Technologies utilisées

- HTML5 / CSS3 / JavaScript (ES6+)
- Web Audio API pour l'analyse audio
- MediaRecorder API pour l'enregistrement
- Interface responsive pour tous les appareils

## Fonctionnalités à venir

- Implémentation complète de la détection de hauteur (pitch detection)
- Visualisation en temps réel de la hauteur vocale
- Représentation avancée sur portée musicale (avec VexFlow)
- Sauvegarde des exercices et progression
- Mode exercice guidé avec sessions prédéfinies

## Licence

Ce projet est sous licence MIT.
