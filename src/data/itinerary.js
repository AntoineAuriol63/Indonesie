// Exemple d'itinéraire affiché par le bouton « Exemple d'itinéraire » : 15 jours à deux, Java puis Bali.
// Les données sont dans itinerary.json, qu'on modifie à la main ou depuis le back office (/admin/) :
// « stops » = étapes tracées sur la carte, dans l'ordre, avec le nombre de nuits ; « transports » = ce qu'il faudra
// réserver pour se déplacer ; « budget » = objectif par personne, en euros, vols internationaux compris.
//
// Sources utilisées pour le construire : seat61.com (trains à Java), un retour de voyage de juillet 2025
// (Yogyakarta, Malang, Bromo), jadesta.kemenpar.go.id (Borobudur), everydaybromo.com (excursions au Bromo),
// indonesia.travel (temples de Bali).
import data from './itinerary.json';

export const ITINERARY = data;
