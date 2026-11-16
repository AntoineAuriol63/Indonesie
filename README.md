# Indonésie — Notre aventure 🌴

Site de préparation de notre voyage en Indonésie, pensé comme un jeu vidéo : une carte 3D low-poly de l'archipel, des destinations à explorer, des coups de cœur à voter à deux et un itinéraire à composer.

## Les trois niveaux

1. **Rêver** (en ligne) — explorer les destinations, voter, composer et comparer des itinéraires.
2. **Planifier** (à venir) — détailler jour par jour : hôtels, activités, transports, budget.
3. **Partager** (à venir) — journal de bord, photos et messages pour la famille et les amis pendant le voyage.

## Lancer le site

```bash
npm install
npm run dev
```

`npm run build` génère le site statique dans `dist/`.

## Mise en ligne

Le workflow `.github/workflows/deploy.yml` publie le site sur GitHub Pages à chaque push. À activer une seule fois : **Settings → Pages → Source : GitHub Actions**.

## Où modifier quoi

| Quoi | Fichier |
| --- | --- |
| Destinations (textes, notes, saisons, coordonnées) | `src/data/destinations.js` |
| Itinéraires suggérés | `src/data/presets.js` |
| Temps de trajet entre étapes | `src/data/legs.js` |
| Carte 3D (relief, mer, décor, caméra) | `src/world/` |
| Interface (fiches, itinéraire, votes) | `src/main.js`, `src/ui/`, `src/style.css` |

L'itinéraire et les votes sont enregistrés dans le navigateur ; le bouton **Partager** génère un lien qui les contient.

Les contours de la carte viennent de Natural Earth (`npm run geo` pour les régénérer). Les durées de trajet et les saisons sont des ordres de grandeur à vérifier avant de réserver.
