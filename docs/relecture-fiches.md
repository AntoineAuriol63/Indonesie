# Relecture des fiches : consignes

À lire par la session qui reprend le contenu des fiches avec un accès complet à internet.

## Demande

Repasser sur chaque fiche, une par une, pour compléter ce qui manque et corriger ce qui est faux. Ne rien inventer : toute information doit venir d'une source consultée (site officiel, guide de voyage spécialisé, Wikivoyage, Wikipédia, récit de voyage récent). Une information qu'on ne retrouve nulle part est retirée. Si Wikimedia Commons manque de bonnes photos pour un lieu, aller en chercher ailleurs.

Le voyage : août 2027, en couple, petits hôtels confortables. Pas de plongée bouteille, pas de trek de plusieurs jours, pas d'ascension du Rinjani. Snorkeling et randonnées d'une journée : oui.

## Où est le contenu

- `src/data/content/*.json` : un fichier par groupe de régions (`java`, `bali`, `sonde`, `grandes-iles`, `est`, `sanur`). C'est là qu'on écrit.
- `src/data/base.json` : données du tableur de départ (durées, repères, prix). Ne pas modifier.
- `src/data/itinerary.js` : l'exemple d'itinéraire.

Format d'une étape :

```json
{
  "intro": ["paragraphe 1", "paragraphe 2"],
  "todo": [
    { "name": "…", "type": "Ville", "text": "…", "time": "2 h", "price": { "amount": 50000, "currency": "IDR", "what": "entrée du musée, par personne" } }
  ],
  "access": "…",
  "tips": ["…"],
  "photos": [
    { "file": "Nom du fichier sur Commons.jpg", "caption": "…", "author": "…", "license": "CC BY-SA 4.0", "licenseUrl": "https://…" },
    { "url": "https://adresse-directe-de-l-image.jpg", "caption": "…", "source": "Unsplash, licence Unsplash" }
  ]
}
```

- `type` : `Culture`, `Nature`, `Mer`, `Randonnée`, `Ville`, `Cuisine`, `Faune` ou `Détente`.
- `price` : `null` ou un montant dans sa devise d'origine (le site convertit en euros, à 20 100 roupies pour 1 €). `what` dit exactement ce qu'on paie. Un prix n'est ajouté que s'il vient d'une source datée et fiable.
- `photos` : 4 à 6 par étape, la plus belle en premier. Regarder chaque photo avant de la retenir. Légende de 3 à 8 mots, strictement descriptive.
- Par région : `intro`, `august`, `access`.

Contrôle à lancer après chaque fichier modifié :

```bash
python3 scripts/check-content.py src/data/content/java.json
```

Pour voir le résultat : `npm run dev`.

## Le ton

Écrit comme le voyageur lui-même, qui note vite ce qu'il a compris en préparant le voyage et qui veut donner envie : phrases courtes, concrètes, au présent, avec « on ». Simple et sympathique. Ni brochure, ni guide, ni encyclopédie. Chaque phrase apprend quelque chose de précis ; une phrase qui pourrait s'appliquer à n'importe quelle destination est supprimée.

Exemple donné par l'utilisateur : pas « Malang peut servir de base urbaine avant une excursion au Bromo », mais « Pour faire une excursion sur le volcan Bromo, il faut dormir à Malang ».

À éviter (marqueurs de texte généré par IA, d'après le guide Wikipédia « Identifier l'usage d'une IA générative ») : ton promotionnel, emphase, phrases creuses, « permet de », « offre », « se découvre », « incontournable », « niché », « véritable », « authentique », « immersion », les précautions floues (« à vérifier », « selon les sources »), les énumérations par trois systématiques, les tirets longs, le gras, les emojis, les apostrophes courbes, les points d'exclamation. Le script de contrôle en détecte une partie.

## Méthode proposée

Pour chaque fiche :

1. Relever chaque affirmation factuelle (durée, distance, altitude, date, horaire, jour de fermeture, mode d'accès, déroulé d'une excursion) et la vérifier sur une source. Corriger ou retirer.
2. Se demander ce qui manque pour quelqu'un qui hésite à y aller : ce qu'on y fait vraiment, combien de temps ça prend, comment on y va, où on dort, à quelle heure y aller, ce qui est fermé ou compliqué en août.
3. Relire le texte à voix haute et réécrire ce qui sonne brochure.
4. Compléter la galerie si un sujet important n'a pas de photo ou si une photo est faible.

Tenir un journal des vérifications (affirmation, source, verdict) hors du dépôt ou dans `docs/`, pour pouvoir dire à la fin ce qui a été corrigé.

## Points douteux déjà repérés

Écrits de mémoire lors de la première rédaction, sans source consultée.

### Java (`java.json`)

- Durées de trajet : train de l'aéroport de Jakarta vers BNI City (environ 50 min), Whoosh Halim-Padalarang puis navette, train Gambir-Bandung (environ 3 h), Jakarta-Yogyakarta (6 à 8 h), Yogyakarta-Malang (6 à 7 h), Yogyakarta-Surabaya (4 à 5 h), train de l'aéroport de Yogyakarta (environ 40 min), Yogyakarta-Dieng (3 h 30 à 4 h), Malang-Tumpak Sewu (2 h), Bandung-Rancabali (2 h).
- Borobudur : fonctionnement de la montée (créneau d'une heure, guide, sandales fournies, réservation en ligne) et tarifs actuels.
- Kraton de Yogyakarta : fermeture en début d'après-midi, spectacles quotidiens. Ballet du Ramayana à Prambanan : jours de représentation.
- Jakarta : musées fermés le lundi, visite de la mosquée Istiqlal, avenues sans voitures le dimanche matin, Sunda Kelapa « à vingt minutes à pied » de la place Fatahillah.
- Chiffres : Kawah Putih (plus de 2 400 m), Penanjakan (2 770 m), Tumpak Sewu (environ 120 m), « environ 250 marches » au Bromo, hôtel de ville de Batavia (1710), Toko Oen (1930), Hôtel Majapahit, 29 pays à la conférence de Bandung.
- Dieng : festival en août, gel nocturne, changement de bus à Magelang.
- Tumpak Sewu : détail de la descente, remontée par Goa Tetes, accès à Kapas Biru.
- Surabaya : musée du 10 Novembre, Jalan Tunjungan, minibus de Malang.
- Photos manquantes : mosquée Cheng Hoo de Surabaya, quartier d'Ampel, Goa Tetes, Jalan Ijen, Batu, Singosari, cuisine de rue à Jakarta.

### Bali (`bali.json`)

- Toutes les durées de route (Ubud-aéroport, Ubud-Munduk, Ubud-Sidemen, Sidemen-Amed, Munduk-Pemuteran, aéroport-Pemuteran, Sidemen-Tirta Gangga, Sidemen-Besakih, ports de Penida-Diamond Beach).
- Horaires des spectacles : danse au palais d'Ubud, kecak d'Uluwatu.
- Gunung Kawi (« plus de 250 marches »), mont Batur (départ vers 2 h, deux heures de montée).
- Munduk : banian géant de Gesing, séchage des clous de girofle.
- Sidemen : rafting sur la Telaga Waja, rivière Unda. Les deux prix de transfert (400 000 et 350 000 IDR) : par véhicule ou par personne ?
- Amed : temple immergé de Jemeluk, épave de Banyuning, sorties en jukung, distance de l'épave du Liberty au rivage.
- Pemuteran : récif restauré « lancé en 2000 », statue de Ganesh à Menjangan, faune du parc, 30 min de bateau.
- Uluwatu : spots pour débutants (Padang Padang, Dreamland).
- Nusa : navettes Lembongan-Penida, 45 min de descente à Kelingking, conditions de mer en août pour les mantas.
- Photos manquantes : village de Sidemen et tissage, Diamond Beach (la photo retenue montre Atuh), snorkeling à Amed, Pemuteran et son récif, Bingin, Melasti, cours de cuisine à Ubud.

### Lombok, Flores, Sumbawa, Sumba (`sonde.json`)

- Temps de route : Ruteng-Denge, Labuan Bajo-Ruteng, Waikabubak-Waingapu, Bangsal-Senaru, aéroport-Senaru, aéroport-Tetebatu, Poto Tano-Sumbawa Besar et ferry, Kuta-Selong Belanak, Kuta-Mawun.
- Wae Rebo : durée et dénivelé de la marche non chiffrés, à compléter.
- Sumbawa : liaisons de l'aéroport de Sumbawa Besar, bateau public pour Moyo, cascade de Diwu Mba'i, requins-baleines de la baie de Saleh, île de Kenawa.
- Tetebatu : Sarang Walet, Jeruk Manis, villages de Pringgasela et Loyok, excursion à Benang Stokel et Benang Kelambu.
- Sumba : hauteur des toits de Ratenggaro, incendie de Tarung (2017), plateforme de Praijing, cascade de Tanggedu, vols depuis Bali.
- Komodo : heure de départ des excursions, durées de montée à Padar et Kelor, grotte de Rangko, marché de nuit de Kampung Ujung.
- Gili : navette entre les îles, Padang Bai-Gili (environ 2 h), eau de douche salée.
- Divers : palais Dalam Loka (1885, 99 piliers), visite de Diana à Moyo (1993), mosquée de Bayan Beleq.
- Aucun prix dans ce groupe : à chercher.
- Photos manquantes : Tetebatu (deux photos seulement du lieu), grotte de Rangko, Ruteng Pu'u, village de Tarung, Sendang Gile.

### Moluques, Raja Ampat, Timor et Alor (`est.json`)

- Banda : bateau rapide Tulehu-Banda (environ 6 h, quelques départs par semaine, arrêts en août), trajets vers Pulau Hatta et Pulau Ai, montée au Gunung Api.
- Ternate : musée du palais, lac Ngade, traversée vers Tidore.
- Morotai : Dodola, Zum Zum, musées de Daruba, Air Kaca, accès par avion ou par Tobelo.
- Raja Ampat : 374 espèces à Cape Kri, nombre de marches à Piaynemo, Waisai-Piaynemo (1 h 30 à 2 h), saison des mantas, où se trouvent Junior Homestay et Raja Ampat Sunrise.
- Kupang : Lasiana, grotte de Kristal, plage de Tedis.
- Alor : La P'tite Kepa (toujours ouvert, toujours seul hébergement ?), Takpala, vol Kupang-Alor.
- Photos manquantes : vestiges de guerre et banc de sable de Dodola à Morotai, marché de nuit de Kupang, îlot de Kepa, fonds marins de Banda.

### Sumatra, Kalimantan, Sulawesi (`grandes-iles.json`)

Textes écrits, galeries de photos pas encore faites au moment où ces consignes sont rédigées. Tout est à vérifier.

### Sanur (`sanur.json`)

- Longueur de la promenade du front de mer, durée du bateau pour Nusa Lembongan, dates d'installation de Le Mayeur.
