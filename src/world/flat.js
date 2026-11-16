// Carte en relief calculée sans carte graphique, utilisée quand WebGL n'est pas disponible sur l'appareil.
// Même relief low-poly, vu sous le même angle incliné, mêmes marqueurs et même API que la carte 3D (src/world/index.js).
// La projection est axonométrique : se déplacer = translater, zoomer = mettre à l'échelle, ce qui permet de ne
// redessiner les ~40 000 facettes que lorsque la vue se stabilise.
import { PLACE_BY_ID, REGIONS, REGION_BY_ID } from '../data/places.js';
import { createKeys } from './keys.js';
import { buildTerrain, toWorld } from './terrain.js';
import { createLabels } from './labels.js';
import { BOAT_SPOTS } from './props.js';

const SEA = '#27bfd9';
const INK = '#1d2b53';
const KZ = 0.77; // écrasement de la profondeur (caméra inclinée à ~40°)
const KY = 0.85; // part de l'altitude visible à l'écran
const CACHE_MARGIN = 1.5; // l'image du relief déborde de l'écran pour pouvoir glisser sans trou
const BOUNDS = { minX: -25, maxX: 24, minZ: -10, maxZ: 9 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(amount > 0 ? c + (255 - c) * amount : c * (1 + amount));
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

// Prépare les triangles du relief : coordonnées au sol + couleur déjà éclairée.
function prepareTriangles(mesh) {
  const pos = mesh.geometry.attributes.position.array;
  const col = mesh.geometry.attributes.color.array;
  const count = pos.length / 9;
  const tris = new Array(count);
  const light = [-0.5, 0.75, 0.44];
  for (let t = 0; t < count; t++) {
    const i = t * 9;
    const ax = pos[i];
    const ay = pos[i + 1];
    const az = pos[i + 2];
    const e1 = [pos[i + 3] - ax, pos[i + 4] - ay, pos[i + 5] - az];
    const e2 = [pos[i + 6] - ax, pos[i + 7] - ay, pos[i + 8] - az];
    let nx = e1[1] * e2[2] - e1[2] * e2[1];
    let ny = e1[2] * e2[0] - e1[0] * e2[2];
    let nz = e1[0] * e2[1] - e1[1] * e2[0];
    const len = Math.hypot(nx, ny, nz) || 1;
    if (ny < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const lit = 0.66 + 0.56 * Math.max(0, (nx * light[0] + ny * light[1] + nz * light[2]) / len);
    const c = (k) => Math.round(clamp(col[i + k] * lit, 0, 1) * 255);
    // Chaque sommet est stocké projeté : [x, z·KZ − y·KY]
    tris[t] = {
      depth: Math.max(az, pos[i + 5], pos[i + 8]),
      color: `rgb(${c(0)}, ${c(1)}, ${c(2)})`,
      p: [ax, az * KZ - ay * KY, pos[i + 3], pos[i + 5] * KZ - pos[i + 4] * KY, pos[i + 6], pos[i + 8] * KZ - pos[i + 7] * KY],
    };
  }
  // Algorithme du peintre : du plus lointain (nord) au plus proche, les reliefs de devant recouvrent ceux de derrière.
  tris.sort((a, b) => a.depth - b.depth);
  const coords = new Float32Array(count * 6);
  const colors = new Array(count);
  tris.forEach((tri, t) => {
    coords.set(tri.p, t * 6);
    colors[t] = tri.color;
  });
  return { coords, colors, count };
}

export function createFlatWorld({ canvas, labelLayer, onRegion, onPlace }) {
  let ctx = canvas.getContext('2d');
  if (!ctx) {
    // Un canvas qui a déjà tenté un contexte 3D peut refuser le 2D : on repart d'un canvas neuf.
    const fresh = canvas.cloneNode();
    canvas.replaceWith(fresh);
    canvas = fresh;
    ctx = canvas.getContext('2d');
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const terrain = buildTerrain();
  const land = prepareTriangles(terrain.landMesh);
  const skirt = prepareTriangles(terrain.skirtMesh);

  let hoverRegion = null;
  const setHoverRegion = (id) => {
    hoverRegion = id;
    labels.setHoverRegion(id);
  };
  const labels = createLabels(labelLayer, { onRegion, onPlace, onRegionHover: setHoverRegion });
  // Dans ce mode, chaque étape est une gemme à la couleur de sa région (les modèles 3D demandent WebGL).
  const markers = labels.items
    .filter((item) => item.type === 'place')
    .map((tag, index) => {
      const [x, z] = toWorld(tag.lon, tag.lat);
      const color = REGION_BY_ID[tag.region].color;
      const y = Math.max(0.01, terrain.groundAt(x, z));
      return Object.assign(tag, { x, z, y, color, light: shade(color, 0.35), dark: shade(color, -0.25), gx: 0, gy: 0, phase: index * 0.9, k: 1, active: false });
    });
  const anchors = labels.items
    .filter((item) => item.type !== 'place')
    .map((item) => {
      const [x, z] = toWorld(item.lon, item.lat);
      return { item, x, z };
    });
  let state = { region: null, place: null, itinerary: null };
  let stops = [];
  const keys = createKeys(() => {
    flight = null;
  });

  // ---------- Vue ----------
  let width = 0;
  let height = 0;
  const view = { x: 0.5, z: 0.5, s: 20 };
  const shift = { x: 0, y: 0, tx: 0, ty: 0 };
  const fit = () => clamp(1.55 / (width / height), 1, 2.6);
  const scaleFor = (dist) => height / (0.69 * dist * fit());
  const minScale = () => scaleFor(60);
  const maxScale = () => scaleFor(1.6);
  const toScreenX = (wx) => (wx - view.x) * view.s + width / 2 - shift.x;
  const toScreenY = (wz, wy = 0) => ((wz - view.z) * KZ - wy * KY) * view.s + height / 2 - shift.y;
  const clampView = () => {
    view.s = clamp(view.s, minScale(), maxScale());
    view.x = clamp(view.x, BOUNDS.minX, BOUNDS.maxX);
    view.z = clamp(view.z, BOUNDS.minZ, BOUNDS.maxZ);
  };

  // ---------- Image du relief (recalculée seulement quand la vue se stabilise ou sort du cadre) ----------
  const cache = document.createElement('canvas');
  const cctx = cache.getContext('2d');
  let cacheView = null;
  let lastRender = 0;
  let lastMove = 0;

  function renderCache(now) {
    const w = width * CACHE_MARGIN;
    const h = height * CACHE_MARGIN;
    cache.width = Math.round(w * dpr);
    cache.height = Math.round(h * dpr);
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cctx.lineJoin = 'round';
    const s = view.s;
    const ox = w / 2 - view.x * s;
    const oy = h / 2 - view.z * KZ * s;

    // Hauts-fonds clairs autour des îles
    cctx.beginPath();
    for (let t = 0; t < skirt.count; t++) {
      const i = t * 6;
      const c = skirt.coords;
      cctx.moveTo(c[i] * s + ox, c[i + 1] * s + oy);
      cctx.lineTo(c[i + 2] * s + ox, c[i + 3] * s + oy);
      cctx.lineTo(c[i + 4] * s + ox, c[i + 5] * s + oy);
      cctx.closePath();
    }
    cctx.fillStyle = 'rgba(175, 242, 236, 0.55)';
    cctx.fill();

    // Relief, facette par facette
    cctx.lineWidth = 0.8;
    const c = land.coords;
    for (let t = 0; t < land.count; t++) {
      const i = t * 6;
      const x1 = c[i] * s + ox;
      const y1 = c[i + 1] * s + oy;
      const x2 = c[i + 2] * s + ox;
      const y2 = c[i + 3] * s + oy;
      const x3 = c[i + 4] * s + ox;
      const y3 = c[i + 5] * s + oy;
      if (Math.max(x1, x2, x3) < 0 || Math.min(x1, x2, x3) > w || Math.max(y1, y2, y3) < 0 || Math.min(y1, y2, y3) > h) continue;
      cctx.beginPath();
      cctx.moveTo(x1, y1);
      cctx.lineTo(x2, y2);
      cctx.lineTo(x3, y3);
      cctx.closePath();
      cctx.fillStyle = cctx.strokeStyle = land.colors[t];
      cctx.fill();
      cctx.stroke();
    }
    cacheView = { x: view.x, z: view.z, s };
    lastRender = now;
  }

  function cacheIsStale() {
    if (!cacheView) return 'now';
    const k = view.s / cacheView.s;
    const dx = Math.abs(view.x - cacheView.x) * view.s;
    const dz = Math.abs(view.z - cacheView.z) * view.s * KZ;
    const slackX = (width * (CACHE_MARGIN * k - 1)) / 2 - Math.abs(shift.x);
    const slackY = (height * (CACHE_MARGIN * k - 1)) / 2 - Math.abs(shift.y);
    if (k < 0.7 || k > 1.6 || dx > slackX || dz > slackY) return 'soon';
    if (k !== 1 || dx > 0.5 || dz > 0.5) return 'idle';
    return null;
  }

  // ---------- Déplacements animés ----------
  let flight = null;
  function fly(to, duration) {
    const travel = Math.hypot(to.x - view.x, to.z - view.z) * Math.min(view.s, to.s);
    flight = {
      t: 0,
      duration: duration + Math.min(1.2, (travel / width) * 0.5),
      from: { ...view },
      to,
      // Petit recul pendant les longs trajets, pour voir d'où l'on vient et où l'on va.
      bump: clamp(Math.log(travel / (width * 0.5)), 0, 1.4),
    };
  }
  function flyTo(lon, lat, dist, { duration = 1.6 } = {}) {
    const [x, z] = toWorld(lon, lat);
    fly({ x, z, s: clamp(scaleFor(dist), minScale(), maxScale()) }, duration);
  }

  // ---------- Interactions ----------
  const pointers = new Map();
  let moved = 0;
  let pinch = null;
  const markerAt = (px, py) => {
    let best = null;
    let bestDist = 26;
    for (const m of markers) {
      const d = Math.hypot(px - m.gx, py - (m.gy - 30 * m.k));
      if (m.active && d < bestDist) {
        best = m;
        bestDist = d;
      }
    }
    return best;
  };
  const zoomAround = (px, py, factor) => {
    const wx = (px - width / 2 + shift.x) / view.s + view.x;
    const wz = (py - height / 2 + shift.y) / (view.s * KZ) + view.z;
    view.s = clamp(view.s * factor, minScale(), maxScale());
    view.x = wx - (px - width / 2 + shift.x) / view.s;
    view.z = wz - (py - height / 2 + shift.y) / (view.s * KZ);
    clampView();
    lastMove = performance.now();
  };

  canvas.addEventListener('pointerdown', (e) => {
    flight = null;
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) moved = 0;
    pinch = null;
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) {
      if (e.pointerType === 'mouse') {
        const hit = markerAt(e.clientX, e.clientY);
        for (const m of markers) m.hovered = m === hit;
        const region = hit || state.itinerary ? null : regionAt(e.clientX, e.clientY);
        setHoverRegion(region && region !== state.region ? region : null);
        canvas.style.cursor = hit || hoverRegion ? 'pointer' : '';
      }
      return;
    }
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    if (pointers.size === 1) {
      view.x -= dx / view.s;
      view.z -= dy / (view.s * KZ);
      clampView();
      lastMove = performance.now();
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) zoomAround((a.x + b.x) / 2, (a.y + b.y) / 2, dist / pinch);
      pinch = dist;
    }
  });
  const release = (e) => {
    if (!pointers.delete(e.pointerId)) return;
    pinch = null;
    if (e.type === 'pointerup' && pointers.size === 0 && moved < 8) {
      const hit = markerAt(e.clientX, e.clientY);
      if (hit) return onPlace(hit.id);
      const region = state.itinerary ? null : regionAt(e.clientX, e.clientY);
      if (region && region !== state.region) onRegion(region);
    }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      flight = null;
      zoomAround(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0016)));
    },
    { passive: false },
  );

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    cacheView = null;
  }
  window.addEventListener('resize', resize);
  resize();
  [view.x, view.z] = toWorld(118.5, -3);
  view.s = scaleFor(40);

  // ---------- Dessin ----------
  function drawSea(t) {
    ctx.fillStyle = SEA;
    ctx.fillRect(0, 0, width, height);
    // Reflets : de petites vaguelettes ancrées à la carte, qui scintillent.
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const step = 2.2;
    const x0 = Math.floor(((-width / 2 + shift.x) / view.s + view.x) / step) * step;
    const z0 = Math.floor(((-height / 2 + shift.y) / (view.s * KZ) + view.z) / step) * step;
    const cols = Math.min(60, Math.ceil(width / view.s / step) + 1);
    const rows = Math.min(40, Math.ceil(height / (view.s * KZ) / step) + 1);
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const wx = x0 + c * step;
        const wz = z0 + r * step;
        const seed = Math.sin(wx * 12.9898 + wz * 78.233) * 43758.5453;
        const rnd = seed - Math.floor(seed);
        const px = toScreenX(wx + rnd * step);
        const py = toScreenY(wz + ((rnd * 7.3) % 1) * step);
        const alpha = 0.1 + 0.16 * Math.sin(t * 1.4 + rnd * 20);
        if (alpha <= 0.02) continue;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(px - 9, py);
        ctx.quadraticCurveTo(px - 4, py - 4, px, py);
        ctx.quadraticCurveTo(px + 4, py + 4, px + 9, py);
        ctx.stroke();
      }
    }
  }

  // ---------- Décor animé ----------
  const boats = BOAT_SPOTS.map(([lon, lat, radius], i) => {
    const [x, z] = toWorld(lon, lat);
    return { x, z, radius, phase: i * 1.7, dir: i % 2 ? 1 : -1, sail: ['#fff', '#ff5d73', '#ffd23f', '#fff'][i % 4] };
  });
  function drawBoats(t) {
    const k = clamp(view.s * 0.045, 5, 15);
    ctx.lineWidth = 1;
    for (const b of boats) {
      const a = b.phase + t * (0.035 / b.radius) * b.dir;
      const px = toScreenX(b.x + Math.cos(a) * b.radius);
      const py = toScreenY(b.z + Math.sin(a) * b.radius) + Math.sin(t * 2 + b.phase) * 1.2;
      if (px < -20 || px > width + 20 || py < -20 || py > height + 20) continue;
      const f = -Math.sin(a) * b.dir >= 0 ? 1 : -1; // sens de navigation à l'écran
      ctx.fillStyle = '#8d5524';
      ctx.beginPath();
      ctx.moveTo(px - k * f, py - k * 0.25);
      ctx.lineTo(px + k * 1.1 * f, py - k * 0.25);
      ctx.lineTo(px + k * 0.7 * f, py + k * 0.2);
      ctx.lineTo(px - k * 0.7 * f, py + k * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = b.sail;
      ctx.strokeStyle = 'rgba(29, 43, 83, 0.3)';
      ctx.beginPath();
      ctx.moveTo(px, py - k * 0.35);
      ctx.lineTo(px, py - k * 1.6);
      ctx.lineTo(px + k * 0.8 * f, py - k * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px - k * 0.1 * f, py - k * 0.35);
      ctx.lineTo(px - k * 0.1 * f, py - k * 1.25);
      ctx.lineTo(px - k * 0.6 * f, py - k * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  const smokers = terrain.peaks.filter((p) => p.smokes).map((p) => ({ x: p.x, z: p.z, y: terrain.groundAt(p.x, p.z) }));
  const polygon = (cx, cy, r, sides, rot) => {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rot + (i / sides) * Math.PI * 2;
      ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9);
    }
    ctx.closePath();
  };
  function drawSmoke(t) {
    const k = clamp(view.s * 0.022, 3, 16);
    for (const s of smokers) {
      const px = toScreenX(s.x);
      const py = toScreenY(s.z, s.y);
      if (px < -60 || px > width + 60 || py < -20 || py > height + 120) continue;
      for (let p = 0; p < 6; p++) {
        const life = (t * 0.16 + p / 6 + s.x * 0.37) % 1;
        const grow = Math.sin(life * Math.PI);
        ctx.fillStyle = `rgba(${p % 2 ? '255, 255, 255' : '233, 238, 245'}, ${(0.9 * Math.min(1, grow * 1.6)).toFixed(2)})`;
        polygon(px + life * k * 2.4, py - k * 0.4 - life * k * 4.2, k * (0.3 + life * 0.75) * (0.4 + grow * 0.6), 6, life * 3 + p);
        ctx.fill();
      }
    }
  }

  const clouds = Array.from({ length: 11 }, (_, i) => {
    const r = (n) => {
      const v = Math.sin((i + 1) * n) * 43758.5453;
      return v - Math.floor(v);
    };
    return { x: -26 + r(12.9) * 60, z: -9 + r(78.2) * 18, alt: 2.6 + r(3.7) * 1.2, size: 0.5 + r(9.1) * 0.55, speed: 0.08 + r(5.3) * 0.12, parts: 3 + Math.floor(r(1.9) * 3) };
  });
  function drawClouds(t) {
    // Comme en 3D, les nuages s'effacent quand on zoome pour ne pas masquer les îles.
    const alpha = clamp((scaleFor(7) - view.s) / (scaleFor(7) - scaleFor(15)), 0, 1) * 0.92;
    if (alpha < 0.02) return;
    for (const c of clouds) {
      const wx = ((c.x + t * c.speed + 28) % 64) - 28;
      const px = toScreenX(wx);
      const ground = toScreenY(c.z);
      const py = toScreenY(c.z, c.alt);
      const r = c.size * view.s * 0.55;
      if (px < -r * 6 || px > width + r * 6 || py < -r * 4 || ground > height + r * 8) continue;
      ctx.fillStyle = `rgba(13, 60, 110, ${(alpha * 0.13).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(px, ground, r * c.parts * 0.62, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let p = 0; p < c.parts; p++) {
        const ox = (p - (c.parts - 1) / 2) * r * 0.95;
        const pr = r * (0.8 + ((p * 7 + 3) % 5) * 0.1);
        ctx.fillStyle = `rgba(214, 226, 238, ${alpha.toFixed(2)})`;
        polygon(px + ox, py + pr * 0.14, pr, 7, p + 0.4);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
        polygon(px + ox - pr * 0.08, py - pr * 0.12, pr * 0.86, 7, p + 0.9);
        ctx.fill();
      }
    }
  }

  function drawRoute(t) {
    if (stops.length < 2) return;
    const legs = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      const len = Math.hypot(b.gx - a.gx, b.gy - a.gy);
      legs.push({ a, b, len, cx: (a.gx + b.gx) / 2, cy: (a.gy + b.gy) / 2 - Math.min(150, 14 + len * 0.22) });
    }
    const point = (leg, u) => {
      const v = 1 - u;
      return [v * v * leg.a.gx + 2 * v * u * leg.cx + u * u * leg.b.gx, v * v * leg.a.gy + 2 * v * u * leg.cy + u * u * leg.b.gy];
    };
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(29, 43, 83, 0.35)';
    ctx.lineWidth = 1;
    for (const leg of legs) {
      const count = clamp(Math.round(leg.len / 13), 4, 70);
      const offset = (t * 0.6) % 1;
      for (let k = 0; k < count; k++) {
        const [px, py] = point(leg, (k + offset) / count);
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    // Le petit avion
    const progress = (t * 0.33) % legs.length;
    const leg = legs[Math.floor(progress)];
    const u = progress % 1;
    const [px, py] = point(leg, u);
    const [qx, qy] = point(leg, Math.min(1, u + 0.02));
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(qy - py, qx - px));
    ctx.fillStyle = '#ff3b4e';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-3, -11);
    ctx.lineTo(3, 0);
    ctx.lineTo(-3, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-10, -3.5);
    ctx.lineTo(-10, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Région de l'île sous un point de l'écran (on ignore l'altitude : la projection la décale très peu).
  function regionAt(px, py) {
    const wx = (px - width / 2 + shift.x) / view.s + view.x;
    const wz = (py - height / 2 + shift.y) / (view.s * KZ) + view.z;
    return terrain.regionAtPoint(wx, wz);
  }

  // Contour des îles à la couleur de leur région : discret au repos, épais au survol ou quand la région est ouverte.
  const ringsByRegion = REGIONS.map((r) => ({ id: r.id, color: r.color, rings: terrain.islands.filter((i) => i.region === r.id).map((i) => i.ring) }));
  function drawOutlines() {
    ctx.lineJoin = 'round';
    for (const region of ringsByRegion) {
      const hot = region.id === hoverRegion && !state.itinerary;
      const open = region.id === state.region;
      ctx.strokeStyle = region.color;
      ctx.lineWidth = hot ? 5 : open ? 3.5 : 1.5;
      ctx.globalAlpha = hot || open ? 1 : 0.55;
      ctx.beginPath();
      for (const ring of region.rings) {
        for (let i = 0; i < ring.length; i++) {
          const x = toScreenX(ring[i][0]);
          const y = toScreenY(ring[i][1]);
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.closePath();
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawMarkers(t) {
    for (const m of markers) {
      m.gx = toScreenX(m.x);
      m.gy = toScreenY(m.z, m.y);
      m.onScreen = m.gx > -60 && m.gx < width + 60 && m.gy > -20 && m.gy < height + 90;
    }
    for (const m of markers) {
      // Étapes de la région ouverte (ou de l'itinéraire) en grand, les autres en petit.
      m.active = state.itinerary ? state.itinerary.includes(m.id) : m.region === state.region && !m.hidden;
      if ((state.itinerary || m.hidden) && !m.active) m.onScreen = false;
      if (!m.onScreen) continue;
      const active = m.selected || m.hovered;
      const k = active ? 1.45 : m.active ? 1.15 : 0.6;
      m.k = k;
      if (m.active) {
        const pulse = (t * 0.7 + m.phase * 0.3) % 1;
        ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - pulse).toFixed(2)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(m.gx, m.gy, (6 + pulse * 16) * k, (3.5 + pulse * 9) * k, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Gemme à facettes qui flotte au-dessus du lieu
      const cy = m.gy - 30 * k - Math.sin(t * 2.2 + m.phase) * 4;
      const w = 9 * k;
      const h = 15 * k;
      const squeeze = Math.sin(t * (active ? 3 : 1.1) + m.phase); // simule la rotation
      const ridge = m.gx + w * 0.55 * squeeze;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.moveTo(m.gx, cy - h);
      ctx.lineTo(m.gx + w, cy);
      ctx.lineTo(m.gx, cy + h);
      ctx.lineTo(m.gx - w, cy);
      ctx.closePath();
      ctx.fillStyle = m.dark;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(m.gx, cy - h);
      ctx.lineTo(ridge, cy);
      ctx.lineTo(m.gx, cy + h);
      ctx.lineTo(m.gx - w, cy);
      ctx.closePath();
      ctx.fillStyle = m.color;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(m.gx, cy - h);
      ctx.lineTo(ridge, cy);
      ctx.lineTo(m.gx - w, cy);
      ctx.closePath();
      ctx.fillStyle = m.light;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(m.gx, cy - h);
      ctx.lineTo(m.gx + w, cy);
      ctx.lineTo(m.gx, cy + h);
      ctx.lineTo(m.gx - w, cy);
      ctx.closePath();
      ctx.stroke();

      m.sx = m.gx;
      m.sy = m.gy - 30 * k - h - 8;
    }
  }

  let last = performance.now();
  let elapsed = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    elapsed += dt;

    if (flight) {
      flight.t = Math.min(1, flight.t + dt / flight.duration);
      const e = easeInOut(flight.t);
      view.x = flight.from.x + (flight.to.x - flight.from.x) * e;
      view.z = flight.from.z + (flight.to.z - flight.from.z) * e;
      view.s = Math.exp(Math.log(flight.from.s) + (Math.log(flight.to.s) - Math.log(flight.from.s)) * e - Math.sin(flight.t * Math.PI) * flight.bump);
      lastMove = now;
      if (flight.t >= 1) flight = null;
    }
    const pressed = keys.read();
    if (pressed.active && !flight) {
      view.x += (pressed.x * width * 0.55 * dt) / view.s;
      view.z += (pressed.y * width * 0.55 * dt) / (view.s * KZ);
      view.s *= 1 - pressed.zoom * dt * 1.4;
      clampView();
      lastMove = now;
    }
    const sx = shift.x;
    shift.x += (shift.tx - shift.x) * Math.min(1, dt * 6);
    shift.y += (shift.ty - shift.y) * Math.min(1, dt * 6);
    if (Math.abs(shift.x - sx) > 0.3) lastMove = now;

    const stale = cacheIsStale();
    if (stale === 'now' || (stale === 'soon' && now - lastRender > 220) || (stale === 'idle' && now - lastMove > 140)) renderCache(now);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSea(elapsed);
    const k = view.s / cacheView.s;
    const cw = width * CACHE_MARGIN * k;
    const ch = height * CACHE_MARGIN * k;
    ctx.drawImage(cache, toScreenX(cacheView.x) - cw / 2, toScreenY(cacheView.z) - ch / 2, cw, ch);
    drawOutlines();
    drawBoats(elapsed);
    drawSmoke(elapsed);
    drawMarkers(elapsed);
    drawRoute(elapsed);
    drawClouds(elapsed);
    for (const a of anchors) {
      a.item.sx = toScreenX(a.x);
      a.item.sy = toScreenY(a.z);
      a.item.onScreen = a.item.sx > -80 && a.item.sx < width + 80 && a.item.sy > -40 && a.item.sy < height + 40;
    }
    labels.layout();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    mode: 'relief',
    flyTo,
    setState(next) {
      state = next;
      labels.setState(state);
      stops = state.itinerary ? state.itinerary.map((id) => labels.byId[id]) : [];
    },
    setViewPadding({ left = 0, right = 0, top = 0, bottom = 0 }) {
      shift.tx = (right - left) / 2;
      shift.ty = (bottom - top) / 2;
    },
    focusPlace(id) {
      const p = PLACE_BY_ID[id];
      flyTo(p.lon, p.lat, clamp(REGION_BY_ID[p.region].focus.dist * 0.55, 2.4, 4.6), { duration: 1.3 });
    },
    zoom(factor) {
      fly({ x: view.x, z: view.z, s: clamp(view.s / factor, minScale(), maxScale()) }, 0.45);
    },
    stopIdle() {},
  };
}
