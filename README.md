# Indonésie, août 2027

Site de préparation du voyage : une carte 3D low-poly de l'Indonésie pour parcourir les régions et leurs étapes, et se donner des idées avant de choisir un itinéraire.

## Ce que fait le site

- La vue d'ensemble montre l'archipel, le nom des régions, les grandes villes et un petit modèle 3D animé pour chaque étape.
- Un clic n'importe où sur une île (son contour s'épaissit au survol) fait entrer dans la région : ses étapes s'affichent avec leur nom, et une fiche présente la région.
- Une fois dans la région, un clic sur une étape ouvre sa fiche : photos, présentation, liste de ce qu'il y a à faire, durée, accès, prix en euros.
- Le bouton « Exemple d'itinéraire » n'affiche que les étapes d'un parcours, trace le trajet et en donne le détail.

Se déplacer : glisser, molette, clic droit pour tourner, ou au clavier les flèches et ZQSD (A et E pour tourner, + et - pour zoomer).

## Lancer le site

```bash
npm install
npm run dev
```

`npm run build` génère le site statique dans `dist/` : le site lui-même et le back office (`dist/admin/`). Chaque push sur la branche le publie sur GitHub Pages (`.github/workflows/deploy.yml`).

## Où sont les contenus

Tous les contenus sont dans une base Supabase et se modifient depuis le back office : régions, étapes (textes, activités, prix, positions, photos), exemple d'itinéraire, réglages (titre, date, phrase d'accueil, taux de change), favoris.

Au démarrage, le site lit la base (`src/data/load.js`). Si elle ne répond pas dans les quelques secondes, il utilise la dernière version lue par le navigateur, ou à défaut la copie de secours intégrée au site (`src/data/snapshot.json`).

Ce qui reste dans le code : le relief et le décor de la carte (villes, mers, volcans : `src/data/map.js`), les modèles 3D et les scènes détaillées des étapes (`src/world/`).

### Installer la base

1. Dans Supabase, créer son compte éditeur : Authentication > Users > Add user, en cochant « Auto Confirm User ».
2. Coller `docs/supabase.sql` dans l'éditeur SQL et le lancer. Il crée les tables, les droits, l'historique et le dossier des photos, et donne le droit de modifier à tous les comptes qui existent à ce moment-là.
3. Ouvrir le back office, se connecter et cliquer sur « Importer les contenus du site » : la copie de secours est versée dans la base.

Pour ajouter un éditeur plus tard : créer son compte de la même façon, puis relancer la dernière commande du script.

L'adresse du projet et sa clé publique sont dans `src/data/supabase.js`. La clé publique ne permet que de lire les contenus et de gérer les favoris ; écrire demande d'être connecté avec un compte éditeur (règles dans `docs/supabase.sql`).

## Back office

https://antoineauriol63.github.io/Indonesie/admin/ (code dans `admin/` et `src/admin/`)

- Connexion par e-mail et mot de passe (compte créé dans Supabase).
- La vue d'ensemble liste les étapes et signale ce qui reste à compléter (photo sans légende, activité sans position…).
- Une étape : présentation, activités (ordre, type, prix converti en euros, photo), galerie de photos, conseils, positions sur une carte, réglages de la carte 3D.
- Une photo vient de Wikimedia Commons (auteur et licence remplis tout seuls), d'une adresse web, ou de l'appareil : elle est alors réduite à 1600 px et rangée dans le stockage Supabase.
- Une position se colle depuis Google Maps (« -8.5069, 115.2625 ») ou se pose à la souris sur la carte.
- « Enregistrer » (ou Ctrl+S) écrit dans la base : le site affiche la nouvelle version à son prochain chargement.
- « Historique » liste les versions précédentes d'un contenu et permet d'en reprendre une.

## Sauvegarde automatique

Le lundi et le jeudi, `.github/workflows/deploy.yml` lit la base (`scripts/snapshot.mjs`), recopie les contenus dans `src/data/snapshot.json`, enregistre cette copie dans le dépôt si elle a changé, et republie le site. Ce passage régulier évite aussi que le projet Supabase gratuit soit mis en pause après une semaine sans activité.

## Favoris

Le cœur d'une fiche ajoute l'étape à une liste de favoris commune à tous les visiteurs (table `favoris`). Si la base ne répond pas, les favoris restent dans le navigateur.

## Repères dans le code

| Quoi | Fichier |
| --- | --- |
| Lecture des contenus, mise en forme pour le site | `src/data/load.js`, `src/data/places.js` |
| Projet Supabase (adresse, clé publique) | `src/data/supabase.js` |
| Tables, droits, historique, stockage des photos | `docs/supabase.sql` |
| Copie de secours des contenus | `src/data/snapshot.json`, `scripts/snapshot.mjs` |
| Back office | `admin/index.html`, `src/admin/` |
| Villes, repères géographiques, sommets | `src/data/map.js` |
| Carte 3D (relief, mer, nuages, caméra, clavier) | `src/world/` |
| Modèles 3D animés, scènes détaillées | `src/world/models.js`, `src/world/scenes/` |
| Carte en mode compatibilité, sans WebGL | `src/world/flat.js` |
| Fiches, navigation, favoris | `src/main.js`, `src/ui/`, `src/style.css` |
| Journaux de la relecture des fiches (sources consultées) | `docs/journal-relecture-*.md` |

Sources de l'exemple d'itinéraire : seat61.com (trains à Java), un retour de voyage de juillet 2025 (Yogyakarta, Malang, Bromo), jadesta.kemenpar.go.id (Borobudur), everydaybromo.com (excursions au Bromo), indonesia.travel (temples de Bali).

Les contours de la carte viennent de Natural Earth (`npm run geo` pour les régénérer). Les photos sont chargées depuis Wikimedia Commons, d'autres sites, ou le stockage Supabase.
