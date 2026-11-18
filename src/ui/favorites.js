// Étapes aimées : une seule liste, commune à tous les visiteurs, gardée dans une table Supabase.
// Le navigateur en garde une copie (localStorage) pour l'afficher tout de suite et pour continuer à fonctionner
// si la base ne répond pas. Ce que chacun peut lire ou écrire est fixé par les règles de la table (docs/supabase.sql).
import { PUBLIC_HEADERS, REST } from '../data/supabase.js';

const API = `${REST}/favoris`;
const CACHE = 'indonesie.favoris';
const SENT = 'indonesie.favoris.envoyes';
const REFRESH_EVERY = 30000;

const stored = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // stockage indisponible (navigation privée, réglages)
  }
};
const store = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Voir plus haut.
  }
};

let ids = [];
try {
  const saved = JSON.parse(stored(CACHE));
  if (Array.isArray(saved)) ids = saved.filter((id) => typeof id === 'string');
} catch {
  // Copie illisible : on repart de la liste de la base.
}

let isKnown = () => true;
let shared = false; // vrai dès que la base a répondu une fois
let writing = 0; // écritures en cours : on ne recharge pas la liste pendant ce temps
const listeners = [];
const emit = (error) => listeners.forEach((fn) => fn(error));
const same = (a, b) => a.length === b.length && a.every((id) => b.includes(id));

async function call(query, options = {}) {
  const response = await fetch(API + query, {
    ...options,
    headers: { ...PUBLIC_HEADERS, 'Content-Type': 'application/json', ...options.headers },
  });
  // 409 : l'étape est déjà dans la liste, ajoutée par quelqu'un d'autre entre-temps.
  if (!response.ok && response.status !== 409) throw new Error(`Favoris : réponse ${response.status}`);
  return response;
}
const add = (places) =>
  call('?on_conflict=place', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(places.map((place) => ({ place }))),
  });

// Relit la liste commune. La première fois sur un appareil, on y verse les favoris qu'il avait gardés pour lui.
async function refresh() {
  if (writing) return;
  try {
    const rows = await (await call('?select=place&order=created_at')).json();
    if (writing) return;
    let remote = rows.map((row) => row.place);
    if (!stored(SENT)) {
      const mine = ids.filter((id) => !remote.includes(id));
      if (mine.length) await add(mine);
      remote = remote.concat(mine);
      store(SENT, '1');
    }
    const first = !shared;
    shared = true;
    if (first || !same(ids, remote)) {
      ids = remote;
      store(CACHE, JSON.stringify(ids));
      emit();
    }
  } catch (error) {
    console.warn('Favoris : la liste commune ne répond pas, on garde celle de cet appareil.', error);
  }
}

export const favorites = {
  // Démarre la synchronisation. isKnown écarte les étapes qui n'existent plus sur le site.
  start(known) {
    isKnown = known;
    refresh();
    setInterval(() => document.visibilityState === 'visible' && refresh(), REFRESH_EVERY);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && refresh());
  },
  // Prévenu à chaque changement de la liste ; reçoit true si un enregistrement a échoué.
  onChange: (fn) => listeners.push(fn),
  isShared: () => shared,
  has: (id) => ids.includes(id),
  list: () => ids.filter(isKnown),
  count: () => ids.filter(isKnown).length,
  // Ajoute ou retire une étape. L'affichage change tout de suite ; si la base refuse, on revient en arrière.
  toggle(id) {
    const before = ids;
    const on = !ids.includes(id);
    ids = on ? [...ids, id] : ids.filter((x) => x !== id);
    store(CACHE, JSON.stringify(ids));
    // Tant que la base n'a jamais répondu sur cet appareil, le favori reste ici ; il sera versé à la liste commune plus tard.
    if (shared || stored(SENT)) {
      writing++;
      (on ? add([id]) : call(`?place=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }))
        .then(
          () => writing--,
          () => {
            writing--;
            ids = before;
            store(CACHE, JSON.stringify(ids));
            emit(true);
          },
        );
    }
    return on;
  },
};
