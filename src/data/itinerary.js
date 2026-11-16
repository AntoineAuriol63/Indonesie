// Exemple d'itinéraire affiché par le bouton « Exemple d'itinéraire » : 15 jours à deux, Java puis Bali.
//
// Sources utilisées pour le construire : seat61.com (trains à Java), un retour de voyage de juillet 2025
// (Yogyakarta, Malang, Bromo), jadesta.kemenpar.go.id (Borobudur), everydaybromo.com (excursions au Bromo),
// indonesia.travel (temples de Bali).
export const ITINERARY = {
  title: 'Java puis Bali, 15 jours à deux',
  facts: '15 jours · 12 nuits sur place · août, au départ de Paris',
  summary: [
    "On arrive à Jakarta, on traverse Java en train jusqu'au Bromo, puis on s'envole pour Bali : Ubud d'abord, la plage de Sanur pour finir. On dort dans des petits hôtels confortables, en chambre double avec salle de bain privée.",
    "Borobudur et Prambanan sont répartis sur deux jours. L'arrivée par Jakarta reste à comparer avec une arrivée à Yogyakarta avec correspondance, selon les prix et les horaires des vols.",
  ],
  // Étapes tracées sur la carte, dans l'ordre, avec le nombre de nuits.
  stops: [
    { place: 'jakarta', nights: 1 },
    { place: 'yogyakarta-et-temples', nights: 3 },
    { place: 'malang-bromo', nights: 3 },
    { place: 'ubud', nights: 3 },
    { place: 'sanur', nights: 2 },
  ],
  days: [
    { n: 1, title: 'Départ de Paris', text: 'Vol vers Jakarta, avec une escale selon le billet.', night: "Nuit dans l'avion" },
    {
      n: 2,
      title: 'Arrivée à Jakarta',
      place: 'jakarta',
      text: "Transfert et installation à l'hôtel. Si on arrive assez tôt et pas trop fatigués, balade à Kota Tua, le quartier historique, puis à Glodok, le quartier chinois. Juste de quoi avoir un premier aperçu de la ville.",
      night: 'Nuit à Jakarta',
    },
    {
      n: 3,
      title: 'Jakarta → Yogyakarta',
      place: 'yogyakarta-et-temples',
      text: "Train de jour jusqu'à Yogyakarta : 6 à 8 heures selon le train, plus les transferts, donc l'essentiel de la journée. On pose les sacs à l'hôtel, puis balade et dîner autour de Malioboro.",
      night: 'Nuit à Yogyakarta',
    },
    {
      n: 4,
      title: 'Yogyakarta et Prambanan',
      place: 'yogyakarta-et-temples',
      text: "Le matin, visite du Kraton et balade dans les quartiers voisins. L'après-midi, excursion à Prambanan pour voir les temples hindous, et retour à Yogyakarta en soirée.",
      night: 'Nuit à Yogyakarta',
    },
    {
      n: 5,
      title: 'Borobudur et Yogyakarta',
      place: 'yogyakarta-et-temples',
      text: "Départ le matin pour Borobudur. Pour monter sur le monument, il faut réserver le billet qui le prévoit : tous ne donnent pas le même accès. Au retour, s'il reste du temps et de l'énergie, Taman Sari ou une balade dans un quartier de la ville.",
      night: 'Nuit à Yogyakarta',
    },
    {
      n: 6,
      title: 'Yogyakarta → Malang',
      place: 'malang-bromo',
      text: "Train jusqu'à Malang, ce qui prend une grosse demi-journée selon le train choisi. Installation à l'hôtel et dîner tranquille.",
      night: 'Nuit à Malang',
    },
    {
      n: 7,
      title: 'Malang',
      place: 'malang-bromo',
      text: "On visite la ville et ses quartiers, à pied et avec quelques courts trajets motorisés. Retour à l'hôtel assez tôt pour se reposer : l'excursion au Bromo part vers minuit. On garde la chambre à Malang.",
      night: 'Chambre gardée à Malang',
    },
    {
      n: 8,
      title: 'Bromo',
      place: 'malang-bromo',
      text: "Excursion partagée : trajet en jeep, points de vue au lever du jour, traversée de la mer de sable et marche jusqu'au cratère si l'accès est ouvert. Retour à Malang, après-midi libre pour récupérer de la nuit écourtée.",
      night: 'Nuit à Malang',
    },
    {
      n: 9,
      title: 'Malang → Surabaya → Ubud',
      place: 'ubud',
      text: "Route jusqu'à l'aéroport de Surabaya, vol pour Denpasar, puis voiture jusqu'à Ubud. On garde une bonne marge entre le départ de Malang et le vol. La journée passe dans les transports.",
      night: 'Nuit à Ubud',
    },
    {
      n: 10,
      title: 'Ubud et les rizières',
      place: 'ubud',
      text: "Le centre d'Ubud et une promenade dans les rizières autour. Le soir, spectacle de danse s'il y en a un au programme.",
      night: 'Nuit à Ubud',
    },
    {
      n: 11,
      title: "Temples autour d'Ubud",
      place: 'ubud',
      text: 'Excursion avec chauffeur vers Tirta Empul et Gunung Kawi, avec des arrêts dans les villages et les rizières en chemin. Retour à Ubud en fin de journée.',
      night: 'Nuit à Ubud',
    },
    {
      n: 12,
      title: 'Ubud → Sanur',
      place: 'sanur',
      text: "Dernière matinée à Ubud, puis voiture jusqu'à Sanur, en gardant de la marge pour la circulation. Installation à l'hôtel et promenade en bord de mer.",
      night: 'Nuit à Sanur',
    },
    {
      n: 13,
      title: 'Sanur',
      place: 'sanur',
      text: 'Plage, promenade ou vélo sur le front de mer. On profite de la côte après les visites et les trajets des jours précédents.',
      night: 'Nuit à Sanur',
    },
    {
      n: 14,
      title: 'Départ de Bali',
      place: 'sanur',
      text: "Transfert à l'aéroport de Denpasar et vol pour Paris. Le billet doit arriver à Paris le jour 15.",
      night: "Nuit dans l'avion",
    },
    { n: 15, title: 'Arrivée à Paris', text: 'Fin du voyage.' },
  ],
  // Ce qu'il faudra réserver pour se déplacer.
  transports: [
    "Un billet d'avion multidestinations : Paris-Jakarta à l'aller, Denpasar-Paris au retour.",
    'Deux trains : Jakarta-Yogyakarta, puis Yogyakarta-Malang.',
    'Une excursion partagée pour le Bromo.',
    "Un transfert par la route de Malang à l'aéroport de Surabaya.",
    'Un vol intérieur Surabaya-Bali.',
    "Des chauffeurs pour les visites autour de Yogyakarta et d'Ubud, et pour rejoindre les hôtels et les aéroports.",
  ],
  // Objectif de budget par personne, en euros, vols internationaux compris.
  budget: {
    lines: [
      { label: 'Dépenses sur place et vol Surabaya-Bali', amount: 'environ 1 000 €' },
      { label: "Billet d'avion international", amount: '1 000 € au maximum' },
    ],
    totalLabel: 'Objectif par personne',
    total: '2 000 €',
    note: "Soit 4 000 € à deux. Rien n'est encore réservé : les hôtels, les chauffeurs et les vols restent à chiffrer pour nos dates.",
  },
};
