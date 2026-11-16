// Génère src/data/geo.json à partir de Natural Earth (paquet world-atlas).
// À relancer uniquement si l'on veut changer le niveau de détail : `npm run geo`.
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { DESTINATIONS } from '../src/data/destinations.js';

const topo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/countries-10m.json', import.meta.url)));
const countries = feature(topo, topo.objects.countries).features;

const INDONESIA = '360';
const NEIGHBOURS = ['458', '096', '626', '598', '702', '608']; // Malaisie, Brunei, Timor oriental, PNG, Singapour, Philippines
const BOUNDS = { lonMin: 93, lonMax: 152, latMin: -12, latMax: 8.6 };

const TOLERANCE = 0.018; // degrés
const MIN_AREA = 0.004; // degrés²
const MIN_AREA_NEAR_DEST = 0.0004;

function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  return Math.abs(a / 2);
}

function centroid(ring) {
  let x = 0;
  let y = 0;
  for (const p of ring) {
    x += p[0];
    y += p[1];
  }
  return [x / ring.length, y / ring.length];
}

// Douglas-Peucker
function simplify(points, tol) {
  if (points.length < 5) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let maxD = 0;
    let idx = -1;
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1e-12;
    for (let i = a + 1; i < b; i++) {
      const t = Math.max(0, Math.min(1, ((points[i][0] - ax) * dx + (points[i][1] - ay) * dy) / len2));
      const d = Math.hypot(points[i][0] - ax - t * dx, points[i][1] - ay - t * dy);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tol && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function simplifyRing(ring, tol) {
  // Anneau fermé : on le coupe en deux pour éviter qu'il ne s'effondre.
  const open = ring.slice(0, -1);
  if (open.length < 8) return open;
  const mid = Math.floor(open.length / 2);
  const a = simplify(open.slice(0, mid + 1), tol);
  const b = simplify([...open.slice(mid), open[0]], tol);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

function nearDestination(ring) {
  const [cx, cy] = centroid(ring);
  return DESTINATIONS.some((d) => Math.hypot(d.lon - cx, d.lat - cy) < 0.45);
}

function extract(feat, isIndonesia) {
  const polys = feat.geometry.type === 'Polygon' ? [feat.geometry.coordinates] : feat.geometry.coordinates;
  const out = [];
  for (const poly of polys) {
    const outer = poly[0];
    const [cx, cy] = centroid(outer);
    if (cx < BOUNDS.lonMin || cx > BOUNDS.lonMax || cy < BOUNDS.latMin || cy > BOUNDS.latMax) continue;
    const area = ringArea(outer);
    const minArea = isIndonesia && nearDestination(outer) ? MIN_AREA_NEAR_DEST : isIndonesia ? MIN_AREA : MIN_AREA * 4;
    if (area < minArea) continue;
    const tol = area < 0.05 ? TOLERANCE / 3 : area < 1 ? TOLERANCE / 1.5 : TOLERANCE;
    const ring = simplifyRing(outer, isIndonesia ? tol : tol * 2).map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]);
    if (ring.length >= 3) out.push(ring);
  }
  return out;
}

const indonesia = extract(
  countries.find((c) => c.id === INDONESIA),
  true,
);
const neighbours = countries.filter((c) => NEIGHBOURS.includes(c.id)).flatMap((c) => extract(c, false));

const stats = (polys) => `${polys.length} polygones, ${polys.reduce((n, p) => n + p.length, 0)} sommets`;
console.log('Indonésie :', stats(indonesia));
console.log('Voisins   :', stats(neighbours));

// Vérifie que chaque destination est bien sur (ou tout près d')une terre.
function inside(ring, x, y) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
for (const d of DESTINATIONS) {
  const on = indonesia.some((r) => inside(r, d.lon, d.lat));
  if (!on) {
    let best = Infinity;
    for (const r of indonesia) for (const p of r) best = Math.min(best, Math.hypot(p[0] - d.lon, p[1] - d.lat));
    console.log(`  ⚠ ${d.id} n'est pas sur une terre (côte la plus proche : ${best.toFixed(3)}°)`);
  }
}

writeFileSync(new URL('../src/data/geo.json', import.meta.url), JSON.stringify({ indonesia, neighbours }));
console.log('→ src/data/geo.json');
