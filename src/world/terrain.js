// Construit le relief low-poly de l'archipel à partir des contours réels (src/data/geo.json).
import * as THREE from 'three';
import Delaunator from 'delaunator';
import geo from '../data/geo.json';
import { PEAKS, PLACES } from '../data/places.js';
import { fbm, mulberry32 } from './noise.js';

// Projection : 1 unité = 1 degré, nord vers -z.
export const LON0 = 118;
export const LAT0 = -2.5;
export const toWorld = (lon, lat) => [lon - LON0, -(lat - LAT0)];

export const SEABED_COLOR = 0x0b84b5;
const SKIRT_DEPTH = -0.1;

// Îlots absents des données (trop petits) mais indispensables au voyage : [lon, lat, rayon]
const EXTRA_ISLETS = [
  [116.02, -8.35, 0.02], // Gili Trawangan
  [116.06, -8.352, 0.016], // Gili Meno
  [116.1, -8.36, 0.018], // Gili Air
  [124.76, 1.62, 0.04], // Bunaken
  [124.7, 1.72, 0.03], // Manado Tua
  [118.13, 2.3285, 0.03], // Derawan
  [118.62, 2.22, 0.05], // Maratua
  [119.57, -8.656, 0.035], // Padar
  [129.9, -4.53, 0.035], // Banda Neira
  [129.93, -4.57, 0.03], // Banda Besar
  [130.5175, -0.565, 0.02], // Arborek
  [130.68, -0.56, 0.03], // Kri
];

// Lacs : ellipse (centre, demi-axes, rotation) + île centrale éventuelle.
const LAKES = [
  { lon: 98.86, lat: 2.66, rx: 0.5, rz: 0.19, rot: 0.7, island: { rx: 0.17, rz: 0.075 } }, // Toba & Samosir
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function signedArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  return a / 2;
}

function pointInRing(ring, x, z) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const zi = ring[i][1];
    const xj = ring[j][0];
    const zj = ring[j][1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

function distToRing(ring, x, z) {
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ax = ring[j][0];
    const az = ring[j][1];
    const dx = ring[i][0] - ax;
    const dz = ring[i][1] - az;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1e-12), 0, 1);
    const ex = x - ax - t * dx;
    const ez = z - az - t * dz;
    const d = ex * ex + ez * ez;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

const lakes = LAKES.map((l) => {
  const [x, z] = toWorld(l.lon, l.lat);
  return { ...l, x, z, cos: Math.cos(l.rot), sin: Math.sin(l.rot) };
});

// 0 = hors du lac, 1 = dans l'eau, 2 = sur l'île centrale
function lakeAt(x, z) {
  for (const l of lakes) {
    const dx = x - l.x;
    const dz = z - l.z;
    const u = dx * l.cos + dz * l.sin;
    const v = -dx * l.sin + dz * l.cos;
    if ((u / l.rx) ** 2 + (v / l.rz) ** 2 < 1) {
      if (l.island && (u / l.island.rx) ** 2 + (v / l.island.rz) ** 2 < 1) return 2;
      return 1;
    }
  }
  return 0;
}

const peaks = PEAKS.map(([name, lon, lat, h, smokes]) => {
  const [x, z] = toWorld(lon, lat);
  return { name, x, z, h, r: 0.07 + h * 0.42, smokes };
});

// Zones où le maillage est affiné sur les grandes îles (autour des étapes et des lacs).
const detailZones = [
  ...PLACES.map((d) => {
    const [x, z] = toWorld(d.lon, d.lat);
    return { x, z, r: 0.55, s: 0.075 };
  }),
  ...lakes.map((l) => ({ x: l.x, z: l.z, r: 0.75, s: 0.07 })),
];

const C = (hex) => new THREE.Color(hex);
const RAMP_INDONESIA = [
  [0.0, C('#f6e3a1')],
  [0.017, C('#f1dc8c')],
  [0.034, C('#b5e061')],
  [0.12, C('#7ccf52')],
  [0.24, C('#45b356')],
  [0.4, C('#2b9454')],
  [0.62, C('#3f7f5a')],
  [0.8, C('#8a8f86')],
  [0.92, C('#ffffff')],
];
// Pays voisins : teintes de carte ancienne, pour que l'Indonésie ressorte sans que le reste paraisse vide.
const RAMP_NEIGHBOURS = [
  [0.0, C('#f7ecd0')],
  [0.04, C('#f1dfb4')],
  [0.14, C('#e6cb96')],
  [0.3, C('#d6b47c')],
  [0.5, C('#c39c6b')],
];
const ROCK = C('#6d5549');
const LAVA = C('#ff6b35');
const LAKE = C('#39c0e6');
const SAND = C('#f8e9b6');
const SEABED = C(SEABED_COLOR);

function ramp(stops, h, out) {
  if (h <= stops[0][0]) return out.copy(stops[0][1]);
  for (let i = 1; i < stops.length; i++) {
    if (h <= stops[i][0]) {
      const t = (h - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return out.copy(stops[i - 1][1]).lerp(stops[i][1], t);
    }
  }
  return out.copy(stops[stops.length - 1][1]);
}

function addIsland(ring, style, rand, land, skirt) {
  const area = Math.abs(signedArea(ring));
  const s = clamp(Math.sqrt(area) / 11, style.minSpacing, style.maxSpacing);

  // Côte ré-échantillonnée pour obtenir des triangles réguliers.
  const coast = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const k = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / (s * 1.4)));
    for (let j = 0; j < k; j++) coast.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k]);
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of ring) {
    minX = Math.min(minX, p[0]);
    maxX = Math.max(maxX, p[0]);
    minZ = Math.min(minZ, p[1]);
    maxZ = Math.max(maxZ, p[1]);
  }
  const inBox = (o, pad) => o.x > minX - pad && o.x < maxX + pad && o.z > minZ - pad && o.z < maxZ + pad;

  const localPeaks = style.peaks ? peaks.filter((p) => inBox(p, 0) && pointInRing(ring, p.x, p.z)) : [];
  const zones = style.zones && s > 0.09 ? detailZones.filter((zn) => inBox(zn, zn.r)) : [];

  // pts : [x, z, distance à la côte]
  const pts = coast.map((p) => [p[0], p[1], 0]);
  const tryAdd = (x, z, minDist) => {
    if (!pointInRing(ring, x, z)) return;
    const d = distToRing(ring, x, z);
    if (d < minDist) return;
    pts.push([x, z, d]);
  };

  const grid = (cx, cz, radius, step, accept) => {
    let row = 0;
    for (let z = cz - radius; z <= cz + radius; z += step * 0.866, row++) {
      for (let x = cx - radius + (row % 2) * step * 0.5; x <= cx + radius; x += step) {
        const jx = x + (rand() - 0.5) * step * 0.5;
        const jz = z + (rand() - 0.5) * step * 0.5;
        if (accept(jx, jz)) tryAdd(jx, jz, step * 0.45);
      }
    }
  };

  const nearPeak = (x, z) => localPeaks.some((p) => Math.hypot(x - p.x, z - p.z) < p.r * 0.8);
  const inZone = (x, z, upTo = zones.length) => {
    for (let i = 0; i < upTo; i++) if (Math.hypot(x - zones[i].x, z - zones[i].z) < zones[i].r) return true;
    return false;
  };

  // Grille de base (bornée à la boîte englobante).
  {
    let row = 0;
    for (let z = minZ; z <= maxZ; z += s * 0.866, row++) {
      for (let x = minX + (row % 2) * s * 0.5; x <= maxX; x += s) {
        const jx = x + (rand() - 0.5) * s * 0.5;
        const jz = z + (rand() - 0.5) * s * 0.5;
        if (!nearPeak(jx, jz) && !inZone(jx, jz)) tryAdd(jx, jz, s * 0.45);
      }
    }
  }
  zones.forEach((zn, i) => {
    grid(zn.x, zn.z, zn.r, zn.s, (x, z) => Math.hypot(x - zn.x, z - zn.z) < zn.r && !inZone(x, z, i) && !nearPeak(x, z));
  });
  for (const p of localPeaks) {
    tryAdd(p.x, p.z, 0.01);
    for (const [ratio, count] of [
      [0.3, 5],
      [0.62, 8],
      [0.95, 11],
    ]) {
      const off = rand() * Math.PI;
      for (let k = 0; k < count; k++) {
        const a = off + (k / count) * Math.PI * 2;
        tryAdd(p.x + Math.cos(a) * p.r * ratio, p.z + Math.sin(a) * p.r * ratio, 0.012);
      }
    }
  }
  if (pts.length === coast.length) {
    // Minuscule île : un seul sommet central pour lui donner un peu de volume.
    let cx = 0;
    let cz = 0;
    for (const p of coast) {
      cx += p[0];
      cz += p[1];
    }
    tryAdd(cx / coast.length, cz / coast.length, 0);
  }

  // Altitudes
  const heights = pts.map(([x, z, d]) => {
    if (d === 0) return 0.006;
    const lake = lakeAt(x, z);
    if (lake === 1) return 0.05;
    let h = 0.036 + style.relief * (1 - Math.exp(-d / 0.55)) * (0.3 + 1.35 * fbm(x * 0.9 + 7.3, z * 0.9 + 3.1));
    h += 0.02 * fbm(x * 6, z * 6, 2) * Math.min(1, d * 6);
    if (lake === 2) h = 0.09 + 0.05 * fbm(x * 9, z * 9, 2);
    for (const p of localPeaks) {
      const t = Math.max(0, 1 - Math.hypot(x - p.x, z - p.z) / p.r);
      h += p.h * t ** 1.5;
    }
    return h;
  });

  // Triangulation
  const del = Delaunator.from(
    pts,
    (p) => p[0],
    (p) => p[1],
  );
  const tri = del.triangles;
  const color = new THREE.Color();
  for (let t = 0; t < tri.length; t += 3) {
    const ia = tri[t];
    let ib = tri[t + 1];
    let ic = tri[t + 2];
    const cx = (pts[ia][0] + pts[ib][0] + pts[ic][0]) / 3;
    const cz = (pts[ia][1] + pts[ib][1] + pts[ic][1]) / 3;
    if (!pointInRing(ring, cx, cz)) continue;
    // Face vers le haut
    const e1x = pts[ib][0] - pts[ia][0];
    const e1z = pts[ib][1] - pts[ia][1];
    const e2x = pts[ic][0] - pts[ia][0];
    const e2z = pts[ic][1] - pts[ia][1];
    if (e1z * e2x - e1x * e2z < 0) [ib, ic] = [ic, ib];

    const h = (heights[ia] + heights[ib] + heights[ic]) / 3;
    ramp(style.ramp, h, color);
    if (lakeAt(cx, cz) === 1) color.copy(LAKE);
    for (const p of localPeaks) {
      const dist = Math.hypot(cx - p.x, cz - p.z) / p.r;
      if (dist < 0.17 && p.smokes) color.copy(LAVA);
      else if (dist < 0.5 && p.h < 0.45) color.lerp(ROCK, 0.85);
    }
    color.multiplyScalar(0.93 + rand() * 0.14);
    for (const i of [ia, ib, ic]) {
      land.pos.push(pts[i][0], heights[i], pts[i][1]);
      land.col.push(color.r, color.g, color.b);
    }
  }

  // Jupe sous-marine : un liseré de hauts-fonds clairs autour de chaque île.
  const w = clamp(s * 1.3, 0.035, 0.11);
  const n = coast.length;
  const outer = coast.map((p, i) => {
    const prev = coast[(i + n - 1) % n];
    const next = coast[(i + 1) % n];
    let nx = next[1] - prev[1];
    let nz = -(next[0] - prev[0]);
    const len = Math.hypot(nx, nz) || 1;
    nx /= len;
    nz /= len;
    if (pointInRing(ring, p[0] + nx * 0.004, p[1] + nz * 0.004)) {
      nx = -nx;
      nz = -nz;
    }
    return [p[0] + nx * w, p[1] + nz * w];
  });
  const quad = (a, b, c, d) => {
    // a, b sur la côte ; c, d au large
    const push = (p, y, col) => {
      skirt.pos.push(p[0], y, p[1]);
      skirt.col.push(col.r, col.g, col.b);
    };
    const up = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]) >= 0;
    const order = up ? [a, b, c, a, c, d] : [a, c, b, a, d, c];
    for (const p of order) push(p, p === a || p === b ? 0.006 : SKIRT_DEPTH, p === a || p === b ? SAND : SEABED);
  };
  for (let i = 0; i < n; i++) quad(coast[i], coast[(i + 1) % n], outer[(i + 1) % n], outer[i]);
}

function makeGeometry({ pos, col }) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function isletRing(lon, lat, radius, rand) {
  const [x, z] = toWorld(lon, lat);
  const ring = [];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const r = radius * (0.75 + rand() * 0.5);
    ring.push([x + Math.cos(a) * r, z + Math.sin(a) * r * 0.85]);
  }
  return ring;
}

export function buildTerrain() {
  const rand = mulberry32(20260116);
  const land = { pos: [], col: [] };
  const skirt = { pos: [], col: [] };

  const indoStyle = { minSpacing: 0.035, maxSpacing: 0.21, relief: 0.4, ramp: RAMP_INDONESIA, peaks: true, zones: true };
  const neighbourStyle = { minSpacing: 0.12, maxSpacing: 0.34, relief: 0.3, ramp: RAMP_NEIGHBOURS, peaks: false, zones: false };

  const project = (ring) => ring.map(([lon, lat]) => toWorld(lon, lat));
  for (const ring of geo.indonesia) addIsland(project(ring), indoStyle, rand, land, skirt);
  for (const [lon, lat, r] of EXTRA_ISLETS) addIsland(isletRing(lon, lat, r, rand), indoStyle, rand, land, skirt);
  for (const ring of geo.neighbours) addIsland(project(ring), neighbourStyle, rand, land, skirt);

  const group = new THREE.Group();
  const landMesh = new THREE.Mesh(makeGeometry(land), new THREE.MeshLambertMaterial({ vertexColors: true }));
  const skirtMesh = new THREE.Mesh(makeGeometry(skirt), new THREE.MeshBasicMaterial({ vertexColors: true }));
  group.add(landMesh, skirtMesh);

  // Altitude du sol en un point (lancer de rayon vertical, utilisé à l'initialisation seulement).
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const origin = new THREE.Vector3();
  landMesh.geometry.computeBoundingSphere();
  landMesh.geometry.computeBoundingBox();
  const groundAt = (x, z) => {
    origin.set(x, 5, z);
    ray.set(origin, down);
    const hit = ray.intersectObject(landMesh, false)[0];
    return hit ? hit.point.y : 0;
  };

  return { group, landMesh, skirtMesh, groundAt, peaks };
}
