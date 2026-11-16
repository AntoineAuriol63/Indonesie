// Itinéraire affiché par le bouton « Exemple d'itinéraire ».
//
// PROVISOIRE : en attendant le vrai parcours, cet exemple ne reprend que des informations du tableur
// (durées minimales proposées, prix relevés). Une valeur à null signifie « pas encore renseigné » :
// le site affiche alors « à préciser » plutôt qu'un chiffre inventé.
export const ITINERARY = {
  title: 'Java, de Jakarta à Surabaya',
  draft: true,
  stops: [
    { place: 'jakarta', days: 2 },
    { place: 'yogyakarta-et-temples', days: 4 },
    { place: 'malang-bromo', days: 3 },
    { place: 'surabaya', days: 1 },
  ],
  // legs[i] relie stops[i] à stops[i + 1].
  legs: [
    { mode: 'Train', duration: null, price: null },
    { mode: 'Train', duration: null, price: '400 000 IDR par personne en classe exécutive (tarif de juillet 2025)' },
    { mode: 'Minibus', duration: null, price: '72 500 IDR par personne (tarif de juillet 2025)' },
  ],
};
