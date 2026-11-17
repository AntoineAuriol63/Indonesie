# Indonésie, août 2027

Site de préparation du voyage : une carte 3D low-poly de l'Indonésie pour parcourir les régions et leurs étapes, et se donner des idées avant de choisir un itinéraire.

## Ce que fait le site

- La vue d'ensemble montre l'archipel, le nom des régions, les grandes villes et un petit modèle 3D animé pour chaque étape.
- Un clic n'importe où sur une île (son contour s'épaissit au survol) fait entrer dans la région : ses étapes s'affichent avec leur nom, et une fiche présente la région.
- Une fois dans la région, un clic sur une étape ouvre sa fiche : photos, présentation, liste de ce qu'il y a à faire, temps à prévoir (indicatif), accès, prix et sources.
- Un prix ne s'affiche en chiffres que s'il est daté (champ `checked` du prix), dans sa devise d'origine ; sinon la fiche indique « Tarif à confirmer ». Une activité marquée `hidden: true` est un texte de travail, gardé dans les données mais masqué sur le site tant qu'il n'a pas de source.
- Chaque fiche se termine par ses sources (`sources`) et leur date de vérification (`checked`). Une photo d'activité n'apparaît que si l'activité la désigne (champ `photo`) ; chaque photo affiche son auteur et sa licence.
- Le bouton « Exemple d'itinéraire » n'affiche que les étapes d'un parcours, trace le trajet et en donne le détail.

Se déplacer : glisser, molette, clic droit pour tourner, ou au clavier les flèches et ZQSD (A et E pour tourner, + et - pour zoomer).

## Lancer le site

```bash
npm install
npm run dev
```

`npm run build` génère le site statique dans `dist/`. Chaque push sur la branche le publie sur GitHub Pages (`.github/workflows/deploy.yml`).

## Back office

La page `/admin/` du site publié (https://antoineauriol63.github.io/Indonesie/admin/) sert à modifier à la main les fiches des étapes (textes, activités, prix, photos), les textes des régions et l'exemple d'itinéraire. Elle lit les fichiers dans le dépôt GitHub ; « Enregistrer » crée un commit sur la branche publiée, et le site est à jour une à deux minutes plus tard.

- Lire ne demande rien. Pour enregistrer, il faut un jeton GitHub limité à ce dépôt, avec le droit « Contents : Read and write » ; la page explique comment le créer et le garde dans le navigateur.
- Une photo vient de Wikimedia Commons (nom du fichier, auteur et licence remplis d'un clic), d'une adresse web, ou d'un fichier envoyé depuis l'appareil : il est réduit à 1600 px et rangé dans `public/photos/`.
- Renommer ou supprimer une activité met aussi à jour sa position dans `src/data/coords/`.
- Le code est dans `public/admin/` (une page et un script, sans dépendance). Le dépôt et la branche sont en tête de `public/admin/admin.js`.

## Mettre à jour le contenu

Les textes des fiches viennent du tableur de préparation. Après une modification du tableur :

```bash
python3 scripts/import-base.py chemin/vers/Indonesie_base_voyage.xlsx
```

Le script réécrit `src/data/base.json` et applique les règles de style (apostrophes droites, pas de tirets longs, pas de renvois aux sources).

| Quoi | Fichier |
| --- | --- |
| Données du tableur (durées, repères, prix) | `src/data/base.json` |
| Textes, activités et photos des fiches | `src/data/content/*.json` |
| Consignes de relecture des fiches | `docs/relecture-fiches.md` |
| Contrôle d'un fichier de contenu | `scripts/check-content.py` |
| Couleurs, cadrages, noms courts, modèles 3D, villes | `src/data/places.js` |
| Exemple d'itinéraire | `src/data/itinerary.json` |
| Back office | `public/admin/` |
| Photos envoyées depuis le back office | `public/photos/` |
| Carte 3D (relief, mer, nuages, caméra, clavier) | `src/world/` |
| Modèles 3D animés | `src/world/models.js` |
| Carte en mode compatibilité, sans WebGL | `src/world/flat.js` |
| Fiches et navigation | `src/main.js`, `src/style.css` |

Les contours de la carte viennent de Natural Earth (`npm run geo` pour les régénérer). Les photos sont chargées depuis Wikimedia Commons.
