# Indonésie, août 2027

Site de préparation du voyage : une carte 3D low-poly de l'Indonésie pour parcourir les régions et leurs étapes, et se donner des idées avant de choisir un itinéraire.

## Ce que fait le site

- La vue d'ensemble montre l'archipel, le nom des régions, les grandes villes et un petit modèle 3D animé pour chaque étape.
- Un clic sur une région y fait entrer : ses étapes s'affichent avec leur nom, et une fiche présente la région.
- Un clic sur une étape ouvre sa fiche : photo, présentation, activités, durée, accès, prix relevés.
- Le bouton « Exemple d'itinéraire » n'affiche que les étapes d'un parcours, trace le trajet et en donne le détail.

Se déplacer : glisser, molette, clic droit pour tourner, ou au clavier les flèches et ZQSD (A et E pour tourner, + et - pour zoomer).

## Lancer le site

```bash
npm install
npm run dev
```

`npm run build` génère le site statique dans `dist/`. Chaque push sur la branche le publie sur GitHub Pages (`.github/workflows/deploy.yml`).

## Mettre à jour le contenu

Les textes des fiches viennent du tableur de préparation. Après une modification du tableur :

```bash
python3 scripts/import-base.py chemin/vers/Indonesie_base_voyage.xlsx
```

Le script réécrit `src/data/base.json` et applique les règles de style (apostrophes droites, pas de tirets longs, pas de renvois aux sources).

| Quoi | Fichier |
| --- | --- |
| Textes des régions et des étapes (générés) | `src/data/base.json` |
| Couleurs, cadrages, noms courts, modèles 3D, villes | `src/data/places.js` |
| Exemple d'itinéraire | `src/data/itinerary.js` |
| Carte 3D (relief, mer, nuages, caméra, clavier) | `src/world/` |
| Modèles 3D animés | `src/world/models.js` |
| Carte en mode compatibilité, sans WebGL | `src/world/flat.js` |
| Fiches et navigation | `src/main.js`, `src/style.css` |

Les contours de la carte viennent de Natural Earth (`npm run geo` pour les régénérer). Les photos sont chargées depuis Wikimedia Commons, avec l'auteur et la licence indiqués sous chaque image.
