// Étapes aimées : gardées dans le navigateur (localStorage), donc propres à chaque appareil.
const KEY = 'indonesie.favoris';

let ids = [];
try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (Array.isArray(saved)) ids = saved.filter((id) => typeof id === 'string');
} catch {
  // Stockage indisponible (navigation privée, réglages) : les favoris tiennent le temps de la visite.
}

const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Voir plus haut.
  }
};

export const favorites = {
  // Ne garde que les étapes qui existent encore (une fiche peut avoir été renommée ou retirée).
  keep(isKnown) {
    const before = ids.length;
    ids = ids.filter(isKnown);
    if (ids.length !== before) save();
  },
  has: (id) => ids.includes(id),
  list: () => [...ids],
  count: () => ids.length,
  toggle(id) {
    if (ids.includes(id)) ids = ids.filter((x) => x !== id);
    else ids.push(id);
    save();
    return ids.includes(id);
  },
};
