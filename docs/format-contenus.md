# Format du fichier de contenus

C'est le fichier que donne le back office (Réglages > « Télécharger tous les contenus ») et qu'il sait réimporter (« Importer un fichier JSON »). La copie de secours du dépôt, `src/data/snapshot.json`, a la même forme.

Pour travailler les contenus dans un fichier : le télécharger, le modifier, l'importer. L'import vérifie le fichier, montre ce qui change et demande confirmation. Il remplace les régions, les étapes, l'itinéraire et les réglages présents dans le fichier. Une étape absente du fichier est supprimée ; une région absente est laissée telle quelle.

```json
{
  "regions": [ { "id": "bali", "name": "Bali", … } ],
  "places": [ { "id": "ubud", "region": "bali", "name": "Ubud", … } ],
  "documents": { "itineraire": { … }, "site": { … } }
}
```

L'ordre des étapes dans `places` est celui des listes du site.

## Une étape (`places`)

| Champ | Contenu |
| --- | --- |
| `id` | Identifiant : minuscules, chiffres et tirets. Ne pas le changer : la scène 3D de l'étape y est liée. |
| `region` | Identifiant de sa région. |
| `name`, `short` | Nom complet, et nom court affiché sur la carte. |
| `themes` | Thèmes en quelques mots (« Culture / paysages »). |
| `daysMin`, `daysMax` | Durée conseillée, en jours. |
| `lat`, `lon` | Vraie position de l'étape (nombres). |
| `spot` | Facultatif : `{ "lon": …, "lat": … }`, position du modèle 3D si elle doit être décalée (étape en mer). |
| `model`, `rank` | Petit modèle 3D (`palm`, `pura`, `waterfall`…) et visibilité : 1 = toujours, 2 = en se rapprochant, 3 = de près. |
| `hidden` | `true` si l'étape n'apparaît que dans l'exemple d'itinéraire. |
| `intro` | Liste de paragraphes. |
| `todo` | Liste des activités (voir plus bas). |
| `access` | « Y aller ». |
| `tips` | Liste de conseils (« À savoir »). |
| `photos` | Liste de photos (voir plus bas). La première représente l'étape dans les listes. |

## Une activité (`todo`)

| Champ | Contenu |
| --- | --- |
| `name` | Nom. |
| `type` | `Culture`, `Nature`, `Mer`, `Randonnée`, `Ville`, `Cuisine`, `Faune` ou `Détente`. |
| `text` | Description. |
| `time` | Durée ou horaires, en texte libre (« 2 h »). |
| `price` | `null` si c'est gratuit, sinon `{ "amount": 50000, "currency": "IDR", "what": "entrée, par personne" }`. `currency` vaut `"IDR"` ou `"EUR"` ; le site affiche tout en euros. |
| `lat`, `lon` | Facultatifs, ensemble : position sur la carte de la fiche. |
| `photo` | Facultatif : une photo au même format que la galerie. Sans ce champ, le site prend la photo de la galerie dont la légende correspond. |

## Une photo (`photos`)

`file` (nom du fichier sur Wikimedia Commons) ou `url` (adresse de l'image), plus `caption` (légende : sans elle, la photo n'est pas affichée), `author`, `license`, `licenseUrl`.

## Une région (`regions`)

`id`, `name`, `short`, `color`, `intro`, `august` (« En août »), `access`, `daysMin`, `daysMax`, `focus` (`lon`, `lat`, `dist` : où se place la caméra) et `label` (`lon`, `lat` : où le nom est posé sur la carte).

## Les documents

- `itineraire` : `title`, `facts`, `summary` (paragraphes), `stops` (`place`, `nights`), `days` (`n`, `title`, `text`, `night`, `place`), `transports` (lignes), `budget` (`lines` avec `label` et `amount`, `totalLabel`, `total`, `note`).
- `site` : `title`, `date`, `intro` (phrase de l'écran d'accueil), `idrPerEur` (roupies pour un euro).
