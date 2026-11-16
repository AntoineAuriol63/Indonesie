// Exemple d'itinéraire affiché par le bouton « Exemple d'itinéraire » : 15 jours à deux, Java puis Bali.
//
// Sources utilisées pour le construire : seat61.com (trains à Java), un retour de voyage de juillet 2025
// (Yogyakarta, Malang, Bromo), everydaybromo.com (excursions au Bromo), jadesta.kemenpar.go.id (Borobudur),
// indonesia.travel (temples de Bali).
export const ITINERARY = {
  title: 'Java puis Bali, 15 jours à deux',
  facts: '15 jours · 12 nuits sur place · août, au départ de Paris',
  summary:
    "On arrive à Jakarta, on traverse Java en train jusqu'au Bromo, puis on s'envole pour Bali : Ubud d'abord, la plage de Sanur pour finir. On dort dans des petits hôtels confortables, en chambre double avec salle de bain privée.",
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
      text: "Transfert et installation à l'hôtel. Si l'heure d'arrivée et la fatigue le permettent, balade dans Kota Tua, le quartier historique, puis dans Glodok, le quartier chinois.",
      night: 'Nuit à Jakarta',
    },
    {
      n: 3,
      title: 'Jakarta → Yogyakarta',
      place: 'yogyakarta-et-temples',
      text: "Train de jour jusqu'à Yogyakarta : 6 à 8 heures selon le train, plus les transferts. On pose les sacs à l'hôtel, puis première balade et dîner autour de Malioboro.",
      night: 'Nuit à Yogyakarta',
    },
    {
      n: 4,
      title: 'Yogyakarta',
      place: 'yogyakarta-et-temples',
      text: "Visite du Kraton, le palais du sultan, et de Taman Sari. Le reste de la journée, on se balade dans les quartiers, entre artisanat et cuisine locale. Tout se fait à pied, avec quelques courts trajets motorisés.",
      night: 'Nuit à Yogyakarta',
    },
    {
      n: 5,
      title: 'Borobudur et Prambanan',
      place: 'yogyakarta-et-temples',
      text: "Borobudur le matin, Prambanan l'après-midi, avec un chauffeur à la journée pour relier les deux. Grosse journée : il y a plusieurs heures de route entre les visites.",
      night: 'Nuit à Yogyakarta',
    },
    {
      n: 6,
      title: 'Yogyakarta → Malang',
      place: 'malang-bromo',
      text: "Train jusqu'à Malang, ce qui prend une grosse demi-journée. Installation à l'hôtel et soirée tranquille.",
      night: 'Nuit à Malang',
    },
    {
      n: 7,
      title: 'Malang',
      place: 'malang-bromo',
      text: "On visite la ville et ses quartiers, puis on se repose en fin de journée : le départ pour le Bromo est dans la nuit. On garde la chambre à Malang.",
      night: 'Chambre gardée à Malang',
    },
    {
      n: 8,
      title: 'Bromo',
      place: 'malang-bromo',
      text: "Départ vers minuit, en excursion partagée. Trajet en jeep, points de vue au lever du jour, traversée de la mer de sable et marche jusqu'au cratère si l'accès est ouvert. Retour à Malang et après-midi pour récupérer.",
      night: 'Nuit à Malang',
    },
    {
      n: 9,
      title: 'Malang → Surabaya → Ubud',
      place: 'ubud',
      text: "Route jusqu'à l'aéroport de Surabaya, vol pour Denpasar, puis voiture jusqu'à Ubud. La journée passe dans les transports, sans visite.",
      night: 'Nuit à Ubud',
    },
    {
      n: 10,
      title: 'Ubud',
      place: 'ubud',
      text: "Le centre d'Ubud et une promenade dans les rizières. Le soir, spectacle de danse s'il y en a un au programme.",
      night: 'Nuit à Ubud',
    },
    {
      n: 11,
      title: "Temples autour d'Ubud",
      place: 'ubud',
      text: 'Excursion avec chauffeur vers Tirta Empul et Gunung Kawi, avec des arrêts dans les villages et les rizières en chemin.',
      night: 'Nuit à Ubud',
    },
    {
      n: 12,
      title: 'Ubud → Sanur',
      place: 'sanur',
      text: "Matinée à Ubud, puis voiture jusqu'à Sanur, en gardant de la marge pour les embouteillages. Installation à l'hôtel et promenade en bord de mer.",
      night: 'Nuit à Sanur',
    },
    {
      n: 13,
      title: 'Sanur',
      place: 'sanur',
      text: 'Plage, promenade ou vélo sur le front de mer. Dernière journée complète à Bali.',
      night: 'Nuit à Sanur',
    },
    { n: 14, title: 'Départ de Bali', place: 'sanur', text: "Transfert à l'aéroport de Denpasar et vol pour Paris.", night: "Nuit dans l'avion" },
    { n: 15, title: 'Arrivée à Paris', text: 'Fin du voyage.' },
  ],
  // Budget par personne, en euros, hors vol international. Ce sont des enveloppes de préparation, pas des devis.
  budget: {
    basis: 'Par personne, en partageant la chambre double et les voitures, avec des repas surtout locaux et des excursions en groupe.',
    lines: [
      { label: 'Hébergement', amount: 240, note: '12 nuits à 40 € la chambre double' },
      { label: 'Repas et boissons', amount: 180 },
      { label: 'Deux trains à Java', amount: 65 },
      { label: 'Vol Surabaya-Bali avec bagage', amount: 90 },
      { label: 'Transferts, trajets locaux et chauffeurs', amount: 120 },
      { label: 'Visites et activités', amount: 130 },
      { label: 'Formalités, connexion et assurance', amount: 75 },
      { label: 'Marge pour imprévus', amount: 100 },
    ],
    total: 1000,
    flight:
      "Il faut un billet multidestinations : Paris-Jakarta à l'aller, Denpasar-Paris au retour. Avec un billet à 1 000 € par personne, le voyage revient à 2 000 € chacun, soit 4 000 € à deux. À 1 200 €, on passe à 2 200 € chacun, soit 4 400 € à deux.",
  },
};
