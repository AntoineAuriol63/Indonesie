// Estimation des trajets entre deux étapes (porte à porte, en heures). Ordres de grandeur, à vérifier au moment de réserver.
import { DEST_BY_ID } from './destinations.js';

// Trajets terrestres / maritimes connus : 'a|b' → [icône, description, heures]
const DIRECT = {
  'yogyakarta|bromo-ijen': ['🚆', 'Train jusqu’à Probolinggo ou Malang, puis route', 9],
  'bromo-ijen|ubud': ['⛴️', 'Route + ferry Java → Bali', 6.5],
  'bromo-ijen|munduk': ['⛴️', 'Ferry Java → Bali + route', 4.5],
  'bromo-ijen|bali-sud': ['⛴️', 'Route + ferry Java → Bali', 7],
  'bromo-ijen|amed': ['⛴️', 'Ferry Java → Bali + route', 7.5],
  'ubud|bali-sud': ['🚐', 'Route', 1.5],
  'ubud|munduk': ['🚐', 'Route', 2],
  'ubud|amed': ['🚐', 'Route', 2.5],
  'ubud|nusa-penida': ['🚤', 'Route jusqu’à Sanur + bateau rapide', 2],
  'bali-sud|munduk': ['🚐', 'Route', 3],
  'bali-sud|amed': ['🚐', 'Route', 3.25],
  'bali-sud|nusa-penida': ['🚤', 'Bateau rapide depuis Sanur', 1.75],
  'munduk|amed': ['🚐', 'Route', 3.25],
  'munduk|nusa-penida': ['🚤', 'Route jusqu’à Sanur + bateau rapide', 4],
  'amed|nusa-penida': ['🚤', 'Route jusqu’à Kusamba + bateau rapide', 2.5],
  'ubud|gili': ['🚤', 'Route jusqu’à Padang Bai + bateau rapide', 3.5],
  'bali-sud|gili': ['🚤', 'Route jusqu’à Padang Bai + bateau rapide', 4.25],
  'munduk|gili': ['🚤', 'Route jusqu’à Padang Bai + bateau rapide', 5.5],
  'amed|gili': ['🚤', 'Bateau rapide direct', 1.5],
  'nusa-penida|gili': ['🚤', 'Bateau rapide direct', 2.5],
  'nusa-penida|lombok': ['🚤', 'Bateau rapide + route', 4.5],
  'gili|lombok': ['🚤', 'Bateau (20 min) + route', 2.5],
  'komodo|flores': ['✈️', 'Vol Labuan Bajo → Ende, ou road-trip de 2 à 3 jours à travers Flores', 4.5],
  'bukit-lawang|toba': ['🚐', 'Route via Medan ou Berastagi + ferry', 8.5],
  'toraja|togian': ['🚐', 'Route jusqu’à Ampana (2 jours, étape à Tentena) + ferry', 44],
  'togian|bunaken': ['⛴️', 'Ferry de nuit vers Gorontalo, puis route ou vol vers Manado', 24],
};

// Aéroport de référence de chaque étape : [code, heures de trajet entre l'étape et l'aéroport]
const HUB = {
  yogyakarta: ['YIA', 1.25],
  'bromo-ijen': ['SUB', 3.5],
  ubud: ['DPS', 1.5],
  'bali-sud': ['DPS', 0.75],
  munduk: ['DPS', 2.75],
  amed: ['DPS', 2.75],
  'nusa-penida': ['DPS', 2],
  gili: ['LOP', 2.5],
  lombok: ['LOP', 0.5],
  komodo: ['LBJ', 0.25],
  flores: ['ENE', 1.5],
  sumba: ['TMC', 1],
  'bukit-lawang': ['KNO', 3.5],
  toba: ['KNO', 5],
  'tanjung-puting': ['PKN', 0.5],
  toraja: ['UPG', 8.5],
  togian: ['PLW', 10],
  bunaken: ['MDC', 1.25],
  'raja-ampat': ['SOQ', 3],
};

const AIRPORT = {
  CGK: 'Jakarta',
  DPS: 'Bali',
  YIA: 'Yogyakarta',
  SUB: 'Surabaya',
  LOP: 'Lombok',
  LBJ: 'Labuan Bajo',
  ENE: 'Ende',
  TMC: 'Sumba',
  KNO: 'Medan',
  PKN: 'Pangkalan Bun',
  UPG: 'Makassar',
  PLW: 'Palu',
  MDC: 'Manado',
  SOQ: 'Sorong',
};

// Vols directs courants (durée en heures)
const FLIGHTS = [
  ['DPS', 'YIA', 1.4],
  ['DPS', 'SUB', 1],
  ['DPS', 'LOP', 0.6],
  ['DPS', 'LBJ', 1.25],
  ['DPS', 'TMC', 1.1],
  ['DPS', 'UPG', 1.4],
  ['DPS', 'CGK', 1.9],
  ['DPS', 'ENE', 2],
  ['LBJ', 'ENE', 1],
  ['CGK', 'YIA', 1.2],
  ['CGK', 'SUB', 1.5],
  ['CGK', 'LOP', 2],
  ['CGK', 'LBJ', 2.4],
  ['CGK', 'KNO', 2.4],
  ['CGK', 'PKN', 1.3],
  ['CGK', 'UPG', 2.4],
  ['CGK', 'MDC', 3.4],
  ['CGK', 'SOQ', 4.2],
  ['CGK', 'PLW', 2.7],
  ['SUB', 'PKN', 1.2],
  ['SUB', 'UPG', 1.5],
  ['SUB', 'LOP', 1.1],
  ['UPG', 'SOQ', 2.2],
  ['UPG', 'MDC', 1.8],
  ['UPG', 'PLW', 1.2],
  ['MDC', 'SOQ', 1.5],
];

const AIRPORT_OVERHEAD = 2; // enregistrement, embarquement, bagages
const CONNECTION = 1.75; // par escale

const graph = {};
for (const [a, b, h] of FLIGHTS) {
  (graph[a] ||= []).push([b, h]);
  (graph[b] ||= []).push([a, h]);
}

function flightPath(from, to) {
  const best = { [from]: { cost: 0, path: [from] } };
  const queue = [from];
  while (queue.length) {
    queue.sort((x, y) => best[x].cost - best[y].cost);
    const node = queue.shift();
    for (const [next, h] of graph[node] || []) {
      const cost = best[node].cost + h + (node === from ? 0 : CONNECTION);
      if (!best[next] || cost < best[next].cost) {
        best[next] = { cost, path: [...best[node].path, next] };
        queue.push(next);
      }
    }
  }
  return best[to];
}

const cache = {};

export function getLeg(fromId, toId) {
  const key = `${fromId}|${toId}`;
  if (cache[key]) return cache[key];
  const known = DIRECT[key] || DIRECT[`${toId}|${fromId}`];
  let leg;
  if (known) {
    leg = { icon: known[0], label: known[1], hours: known[2] };
  } else {
    const [hubA, groundA] = HUB[fromId];
    const [hubB, groundB] = HUB[toId];
    if (hubA === hubB) {
      leg = { icon: '🚐', label: 'Route', hours: groundA + groundB };
    } else {
      const flight = flightPath(hubA, hubB);
      const via = flight.path.slice(1, -1).map((c) => AIRPORT[c]);
      leg = {
        icon: '✈️',
        label: `Vol ${AIRPORT[hubA]} → ${AIRPORT[hubB]}${via.length ? ` (escale à ${via.join(', ')})` : ''}`,
        hours: groundA + groundB + flight.cost + AIRPORT_OVERHEAD,
      };
    }
  }
  const a = DEST_BY_ID[fromId];
  const b = DEST_BY_ID[toId];
  leg.km = Math.round(haversine(a.lat, a.lon, b.lat, b.lon));
  cache[key] = leg;
  return leg;
}

function haversine(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export function formatHours(h, { total = false } = {}) {
  if (total) return `≈ ${Math.round(h)} h`;
  if (h >= 16) return `≈ ${Math.round(h / 12) / 2} j`.replace('.', ',');
  const whole = Math.floor(h);
  const minutes = Math.round((h - whole) * 4) * 15;
  if (minutes === 60) return `≈ ${whole + 1} h`;
  return `≈ ${whole} h${minutes ? ` ${minutes}` : ''}`;
}
