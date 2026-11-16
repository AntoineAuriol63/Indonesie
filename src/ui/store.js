// État du voyage : étapes, coups de cœur, réglages. Sauvegardé dans le navigateur et partageable par lien.
// (Phase 2 : ce module sera branché sur une vraie base de données partagée.)
import { DEST_BY_ID } from '../data/destinations.js';

const KEY = 'indonesie:voyage:v1';

const defaults = () => ({
  stops: [], // [{ id, nights }]
  votes: {}, // { [id]: 'a' | 'b' | 'ab' }
  days: 21,
  month: null, // 0-11
  names: ['Joueur 1', 'Joueur 2'],
});

function sanitize(raw) {
  const s = defaults();
  if (!raw || typeof raw !== 'object') return s;
  if (Array.isArray(raw.stops)) {
    const seen = new Set();
    for (const stop of raw.stops) {
      if (!stop || !DEST_BY_ID[stop.id] || seen.has(stop.id)) continue;
      seen.add(stop.id);
      s.stops.push({ id: stop.id, nights: Math.max(1, Math.min(30, Math.round(+stop.nights) || 1)) });
    }
  }
  if (raw.votes && typeof raw.votes === 'object') {
    for (const [id, v] of Object.entries(raw.votes)) if (DEST_BY_ID[id] && /^(a|b|ab)$/.test(v)) s.votes[id] = v;
  }
  if (Number.isFinite(+raw.days)) s.days = Math.max(5, Math.min(90, Math.round(+raw.days)));
  if (raw.month !== null && raw.month !== undefined && raw.month !== '' && +raw.month >= 0 && +raw.month <= 11) s.month = Math.round(+raw.month);
  if (Array.isArray(raw.names)) s.names = [0, 1].map((i) => String(raw.names[i] || s.names[i]).slice(0, 16));
  return s;
}

const toBase64Url = (text) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const fromBase64Url = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

export function encodeState(s) {
  return toBase64Url(JSON.stringify({ s: s.stops.map((x) => [x.id, x.nights]), v: s.votes, d: s.days, m: s.month, n: s.names }));
}

function decodeState(encoded) {
  try {
    const c = JSON.parse(fromBase64Url(encoded));
    return sanitize({ stops: (c.s || []).map(([id, nights]) => ({ id, nights })), votes: c.v, days: c.d, month: c.m, names: c.n });
  } catch {
    return null;
  }
}

function load() {
  // Un lien partagé (#p=…) a priorité sur la sauvegarde locale.
  const match = location.hash.match(/p=([\w-]+)/);
  if (match) {
    const shared = decodeState(match[1]);
    history.replaceState(null, '', location.pathname + location.search);
    if (shared) return { state: shared, fromLink: true };
  }
  try {
    return { state: sanitize(JSON.parse(localStorage.getItem(KEY))), fromLink: false };
  } catch {
    return { state: defaults(), fromLink: false };
  }
}

const loaded = load();
export const state = loaded.state;
export const loadedFromLink = loaded.fromLink;

const listeners = new Set();
export const subscribe = (fn) => listeners.add(fn);

function commit(what) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* navigation privée : on continue sans sauvegarde */
  }
  for (const fn of listeners) fn(what);
}
if (loadedFromLink) commit('all');

export const stopIndex = (id) => state.stops.findIndex((s) => s.id === id);
export const totalNights = () => state.stops.reduce((n, s) => n + s.nights, 0);

export const actions = {
  addStop(id) {
    if (stopIndex(id) >= 0) return;
    state.stops.push({ id, nights: DEST_BY_ID[id].nights.ideal });
    commit('stops');
  },
  removeStop(id) {
    state.stops = state.stops.filter((s) => s.id !== id);
    commit('stops');
  },
  setNights(id, delta) {
    const stop = state.stops[stopIndex(id)];
    if (!stop) return;
    stop.nights = Math.max(1, Math.min(30, stop.nights + delta));
    commit('stops');
  },
  moveStop(id, delta) {
    const i = stopIndex(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= state.stops.length) return;
    [state.stops[i], state.stops[j]] = [state.stops[j], state.stops[i]];
    commit('stops');
  },
  setStops(list) {
    state.stops = list.map(([id, nights]) => ({ id, nights }));
    commit('stops');
  },
  toggleVote(id, player) {
    const current = state.votes[id] || '';
    const next = current.includes(player) ? current.replace(player, '') : [...(current + player)].sort().join('');
    if (next) state.votes[id] = next;
    else delete state.votes[id];
    commit('votes');
    return next;
  },
  setDays(delta) {
    state.days = Math.max(5, Math.min(90, state.days + delta));
    commit('settings');
  },
  setMonth(month) {
    state.month = month;
    commit('settings');
  },
  setName(index, name) {
    state.names[index] = name.trim().slice(0, 16) || state.names[index];
    commit('settings');
  },
};
