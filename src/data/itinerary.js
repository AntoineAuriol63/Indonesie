// Itinéraire affiché par le bouton « Exemple d'itinéraire ».
//
// PROVISOIRE : en attendant le vrai parcours, cet exemple reprend les durées minimales et les prix du tableur.
// Un prix à null n'est pas affiché.
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
    { mode: 'Train', duration: 'environ 7 h', price: null },
    { mode: 'Train', duration: 'environ 7 h', price: { amount: 400000, currency: 'IDR', what: 'par personne, en classe exécutive' } },
    { mode: 'Minibus', duration: 'environ 2 h 30', price: { amount: 72500, currency: 'IDR', what: 'par personne' } },
  ],
};
