// Scènes détaillées de Bali : Ubud, Munduk, Sidemen, Amed, Menjangan, Uluwatu, Nusa Penida et Sanur.
import * as THREE from 'three';
import { Builder, PI, bike, createModel, person, puff, rise } from './kit.js';

const SKIN = '#f2b98a';
const SAND = '#f3dc9a';
const WATER = '#3ccbe6';
const LAGOON = '#7ae0ec';
const BRICK = '#d9622b';
const STONE = '#9a9a8e';
const IJUK = '#2b2424'; // chaume noir des toits de temple
const GOLD = '#ffd23f';
const MOSS = '#6fae4f';
const CLIFF = '#e3d9c0'; // calcaire clair des falaises du sud (Bukit, Nusa Penida)

const group = (...children) => {
  const g = new THREE.Group();
  g.add(...children);
  return g;
};

// ---------- Briques propres à Bali ----------

// Le relief de la carte est en pente : un élément plat (lac, bassin) y serait à moitié enterré. On le pose sur une butte.
function raised(model, dy, color = '#7cc45c', rTop = 0.62, rBottom = 0.78) {
  const top = group(...model.parts);
  top.position.y = dy;
  const mound = new Builder().cyl(color, rTop, rBottom, dy + 0.4, 9, 0, (dy - 0.4) / 2, 0).mesh();
  return { parts: [mound, top], update: model.update };
}

// La mer de la carte monte et descend lentement (houle de ±0,022 unité, formule de createWater dans props.js) :
// à l'échelle de ces petites scènes, c'est la hauteur d'une pirogue. Les éléments marqués « sea » suivent donc
// le niveau de l'eau à leur emplacement, pour ne jamais se retrouver noyés ni suspendus au-dessus des vagues.
function afloat(lon, lat, scale, items) {
  return items.map((item) => {
    if (!item.sea) return item;
    const x = lon - 118 + item.dx * scale;
    const z = -(lat + 2.5) + item.dz * scale;
    const unit = item.size * scale;
    return {
      ...item,
      build() {
        const model = item.build();
        const float = group(...model.parts);
        return {
          parts: [float],
          update(t) {
            model.update(t);
            float.position.y = (Math.sin(x * 2.1 + t * 1.1) * 0.011 + Math.cos(z * 2.6 + t * 0.9 + x * 0.7) * 0.011) / unit;
          },
        };
      },
    };
  });
}

// Tronc de cocotier penché ; renvoie la position de la tête, pour y poser les palmes.
function palmTrunk(b, x, y, z, h, lean) {
  b.cyl('#a8763e', 0.03, 0.045, h * 0.55, 5, x + lean * 0.25, y + h * 0.27, z, 0, 0, -lean * 0.9);
  b.cyl('#a8763e', 0.024, 0.03, h * 0.5, 5, x + lean * 0.72, y + h * 0.74, z, 0, 0, -lean * 0.5);
  return [x + lean * 0.86, y + h * 0.98, z];
}
function fronds(b, x = 0, y = 0, z = 0, s = 1) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    b.box(i % 2 ? '#2f9e44' : '#40c057', 0.4 * s, 0.025 * s, 0.12 * s, x + Math.cos(a) * 0.18 * s, y - 0.045 * s, z + Math.sin(a) * 0.18 * s, 0, -a, -0.45);
  }
  return b;
}
// Cocotier entier, fixe.
function palm(b, x, y, z, h, lean, s = 0.8) {
  const [hx, hy, hz] = palmTrunk(b, x, y, z, h, lean);
  return fronds(b, hx, hy + 0.04, hz, s);
}

// Meru : sanctuaire aux toits de chaume noir étagés. Renvoie la hauteur du sommet.
function meru(b, x, y, z, tiers, s = 1) {
  b.box(BRICK, 0.3 * s, 0.1 * s, 0.3 * s, x, y + 0.05 * s, z);
  b.box('#5a4334', 0.15 * s, 0.14 * s, 0.15 * s, x, y + 0.17 * s, z);
  for (let i = 0; i < tiers; i++) b.pyr(IJUK, (0.27 - (i * 0.17) / tiers) * s, 0.1 * s, x, y + (0.28 + i * 0.105) * s, z);
  b.cone(GOLD, 0.02 * s, 0.07 * s, 5, x, y + (0.29 + tiers * 0.105) * s, z);
  return y + (0.32 + tiers * 0.105) * s;
}

// Portail fendu (candi bentar) : deux moitiés en escalier, faces intérieures lisses.
function splitGate(b, x, y, z, s = 1, color = '#8a8f98', gap = 0.07) {
  const half = [[0, 0], [0.2, 0], [0.2, 0.1], [0.15, 0.1], [0.15, 0.24], [0.1, 0.24], [0.1, 0.38], [0.05, 0.38], [0.05, 0.5], [0, 0.58]].map(([px, py]) => [px * s, py * s]);
  b.poly(color, half, 0.1 * s, x + gap * s, y, z);
  b.poly(color, half, 0.1 * s, x - gap * s, y, z, 0, PI, 0);
  return b;
}

// Parasol de cérémonie (tedung), pivot au pied.
function tedung(color = GOLD) {
  return new Builder().cyl('#6b4423', 0.008, 0.008, 0.4, 4, 0, 0.2, 0).cone(color, 0.11, 0.07, 8, 0, 0.42, 0).cyl('#ffffff', 0.112, 0.112, 0.02, 8, 0, 0.38, 0).mesh();
}

// Jukung : pirogue de pêche à deux balanciers, proue vers +x. Renvoie le Builder (pour y ajouter un pêcheur).
function jukung(hull = '#ffffff', sail = '#e03131') {
  const b = new Builder();
  b.poly(hull, [[-0.32, 0.09], [-0.22, 0], [0.22, 0], [0.36, 0.13], [0.2, 0.065], [-0.2, 0.065]], 0.075);
  b.box('#1c7ed6', 0.36, 0.015, 0.078, 0, 0.06, 0);
  for (const x of [-0.12, 0.12]) b.box('#8d5a2b', 0.018, 0.018, 0.5, x, 0.085, 0);
  for (const z of [-0.25, 0.25]) b.cyl('#e8c170', 0.018, 0.018, 0.5, 5, 0, 0.03, z, 0, 0, PI / 2);
  if (sail) {
    b.cyl('#8d5a2b', 0.009, 0.009, 0.42, 4, 0.04, 0.27, 0);
    b.poly(sail, [[0.05, 0.12], [0.05, 0.48], [-0.26, 0.15]], 0.012);
  }
  return b;
}

// Nageur au tuba, à plat sur l'eau, tête vers +x.
function snorkeler(suit = '#ff7b1c') {
  const b = new Builder();
  b.box(suit, 0.2, 0.06, 0.1, 0, 0, 0);
  b.box(SKIN, 0.14, 0.05, 0.08, -0.17, 0, 0);
  b.ball(SKIN, 0.06, 0.15, 0.015, 0);
  b.box('#1d2b53', 0.035, 0.05, 0.1, 0.19, 0.01, 0);
  b.cyl(GOLD, 0.011, 0.011, 0.14, 5, 0.14, 0.1, 0.06);
  b.box('#a3e635', 0.14, 0.018, 0.06, -0.31, 0, 0.04, 0, 0, 0.25);
  b.box('#a3e635', 0.14, 0.018, 0.06, -0.31, 0, -0.04, 0, 0, -0.25);
  b.box(SKIN, 0.14, 0.03, 0.035, 0.05, -0.01, 0.09, 0, 0.5, 0);
  b.box(SKIN, 0.14, 0.03, 0.035, 0.05, -0.01, -0.09, 0, -0.5, 0);
  return b.mesh();
}

// Petit poisson, nez vers +x.
function fish(b, main, stripe, x = 0, y = 0, z = 0, s = 1) {
  b.octa(main, 0.07 * s, x, y, z, 1.5, 0.9, 0.5);
  b.box(stripe, 0.025 * s, 0.1 * s, 0.075 * s, x + 0.015 * s, y, z);
  b.poly(main, [[0, 0], [-0.08 * s, 0.06 * s], [-0.06 * s, 0], [-0.08 * s, -0.06 * s]], 0.02 * s, x - 0.09 * s, y, z);
  return b;
}

// Soleil avec ses rayons, face au sud.
function sun(r = 0.12, color = '#ff922b') {
  const b = new Builder().ball(color, r, 0, 0, 0, 1, 1, 0.4, 1);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    b.box('#ffd43b', r * 0.45, r * 0.16, 0.02, Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5, 0, 0, 0, a);
  }
  return b.mesh();
}

// Macaque assis (gris-brun, face rose). Renvoie le Builder.
function macaque(b = new Builder(), x = 0, y = 0, z = 0, s = 1) {
  b.ball('#8d7b68', 0.07 * s, x, y + 0.075 * s, z, 1, 1.15, 0.95);
  b.ball('#8d7b68', 0.05 * s, x, y + 0.19 * s, z + 0.01 * s);
  b.ball('#e8b4a0', 0.028 * s, x, y + 0.18 * s, z + 0.048 * s, 1.1, 1, 0.7);
  b.box('#8d7b68', 0.03 * s, 0.09 * s, 0.03 * s, x - 0.065 * s, y + 0.06 * s, z + 0.04 * s, 0, 0, 0.3);
  b.box('#8d7b68', 0.03 * s, 0.09 * s, 0.03 * s, x + 0.065 * s, y + 0.06 * s, z + 0.04 * s, 0, 0, -0.3);
  b.cyl('#8d7b68', 0.01 * s, 0.012 * s, 0.14 * s, 4, x, y + 0.07 * s, z - 0.1 * s, -0.9, 0, 0);
  return b;
}

// Danseuse : longue jupe, buste, coiffe dorée, bras écartés, éventail.
function dancer(dress, sash) {
  const b = new Builder();
  b.cyl(dress, 0.03, 0.075, 0.17, 6, 0, 0.085, 0);
  b.cyl(sash, 0.045, 0.035, 0.08, 6, 0, 0.205, 0);
  b.ball(SKIN, 0.045, 0, 0.285, 0);
  b.cone(GOLD, 0.05, 0.09, 6, 0, 0.36, 0);
  b.box(GOLD, 0.15, 0.022, 0.03, 0, 0.32, 0);
  b.box(SKIN, 0.15, 0.025, 0.025, 0.1, 0.24, 0, 0, 0, 0.6);
  b.box(SKIN, 0.15, 0.025, 0.025, -0.1, 0.2, 0, 0, 0, 0.3);
  b.box(GOLD, 0.07, 0.06, 0.012, 0.19, 0.3, 0);
  return b.mesh();
}

// Bateau rapide blanc à toit, moteurs hors-bord à l'arrière, proue vers +x.
function fastBoat(stripe = '#1c7ed6') {
  const b = new Builder();
  b.poly('#ffffff', [[-0.36, 0.12], [0.3, 0.12], [0.46, 0.15], [0.3, 0], [-0.34, 0]], 0.22);
  b.box(stripe, 0.66, 0.03, 0.225, -0.03, 0.085, 0);
  b.box('#e7f5ff', 0.4, 0.09, 0.18, -0.1, 0.17, 0);
  b.box('#1d2b53', 0.3, 0.04, 0.185, -0.08, 0.18, 0);
  b.box('#ffffff', 0.46, 0.02, 0.21, -0.1, 0.225, 0);
  for (const z of [-0.06, 0, 0.06]) b.box('#343a40', 0.05, 0.1, 0.04, -0.39, 0.09, z);
  return b;
}

// ---------- Ubud ----------

const UBUD = [
  {
    name: 'Mont Batur',
    match: 'Lever de soleil au mont Batur',
    dx: 0.1,
    dz: -0.34,
    size: 0.22,
    height: 1.15,
    build() {
      const b = new Builder();
      // Cône de lave sombre sur des pentes vertes, cratère au sommet, lac au pied
      b.cyl('#6fae4f', 0.4, 0.56, 0.16, 7, -0.05, 0.08, -0.08);
      b.cyl('#6b6058', 0.13, 0.4, 0.42, 7, -0.05, 0.37, -0.08);
      b.cyl('#3b3632', 0.1, 0.13, 0.03, 7, -0.05, 0.595, -0.08);
      b.poly('#49c6f2', [[-0.2, -0.1], [0.16, -0.12], [0.22, 0.04], [0, 0.12], [-0.2, 0.06]], 0.02, 0.44, 0.012, 0.32, -PI / 2);
      // Marcheurs partis de nuit, lampe frontale allumée
      const h = new Builder();
      person(h, '#e8590c', null, 0, 0, 0, 0.7);
      person(h, '#1c7ed6', null, 0.1, -0.02, 0.04, 0.7);
      h.ball('#fff3bf', 0.016, 0, 0.15, 0.04).ball('#fff3bf', 0.016, 0.1, 0.13, 0.08);
      const hikers = h.mesh();
      const dawn = sun(0.13);
      const steam = puff(0.06);
      return {
        parts: [b.mesh(), dawn, hikers, steam],
        update(t) {
          // Le soleil monte derrière le volcan, les marcheurs grimpent la pente puis attendent en haut
          dawn.position.set(0.4, 0.5 + Math.sin(t * 0.6) * 0.22, -0.34);
          dawn.rotation.z = t * 0.4;
          const u = Math.min(1, ((t * 0.09) % 1) * 1.4);
          const r = 0.42 - 0.3 * u;
          hikers.position.set(-0.05 + r * 0.6, 0.15 + 0.44 * u + Math.abs(Math.sin(t * 6)) * 0.012, -0.08 + r * 0.8);
          rise(steam, (t * 0.25) % 1, -0.05, 0.6, -0.08, 0.3, 0.08, 1);
        },
      };
    },
  },
  {
    name: 'Tegallalang',
    match: 'Rizières de Tegallalang',
    dx: -0.36,
    dz: -0.3,
    size: 0.24,
    height: 0.95,
    build() {
      const b = new Builder();
      // Vallon étroit : des gradins de rizières montent de chaque côté du ruisseau
      const greens = ['#b2f2bb', '#69db7c', '#8ce99a', '#40c057'];
      for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          const h = 0.07 + i * 0.09;
          const d = 0.95 - i * 0.1;
          const x = side * (0.1 + i * 0.13);
          b.box('#a67c52', 0.13, h, d, x, h / 2, 0);
          b.box(greens[(i + (side > 0 ? 1 : 0)) % 4], 0.13, 0.02, d, x, h + 0.01, 0);
        }
      }
      b.box('#49c6f2', 0.08, 0.03, 0.95, 0, 0.015, 0);
      b.box('#c5f0f7', 0.1, 0.022, 0.26, -0.1, 0.081, 0.2).box('#c5f0f7', 0.1, 0.022, 0.2, 0.36, 0.261, -0.15); // parcelles en eau
      const headA = palmTrunk(b, -0.5, 0.36, -0.28, 0.5, 0.12);
      const headB = palmTrunk(b, 0.47, 0.36, 0.1, 0.42, -0.1);
      palm(b, -0.36, 0.27, 0.3, 0.34, 0.08, 0.6);
      const leavesA = fronds(new Builder()).mesh(headA[0], headA[1] + 0.04, headA[2]);
      const leavesB = fronds(new Builder(), 0, 0, 0, 0.85).mesh(headB[0], headB[1] + 0.04, headB[2]);
      const farmer = person(new Builder(), '#3b82f6', '#f2d16b', 0, 0, 0, 0.8).mesh();
      return {
        parts: [b.mesh(), leavesA, leavesB, farmer],
        update(t) {
          leavesA.rotation.z = Math.sin(t * 1.4) * 0.14;
          leavesB.rotation.z = Math.sin(t * 1.2 + 1) * 0.14;
          // Le paysan longe une terrasse et se penche sur ses plants
          farmer.position.set(0.23, 0.18, Math.sin(t * 0.4) * 0.34);
          farmer.rotation.z = -0.3 - Math.max(0, Math.sin(t * 3)) * 0.35;
        },
      };
    },
  },
  {
    name: 'Tirta Empul',
    match: 'Tirta Empul',
    dx: 0.46,
    dz: -0.1,
    size: 0.22,
    height: 0.85,
    build() {
      const b = new Builder();
      b.box('#b8b2a6', 1.05, 0.08, 0.74, 0, 0.04, 0.02); // parvis de pierre
      b.box(WATER, 0.88, 0.02, 0.36, 0, 0.085, 0.15); // bassin de purification
      b.box('#8a8f98', 0.94, 0.2, 0.08, 0, 0.18, -0.08); // mur des fontaines
      b.box(MOSS, 0.94, 0.025, 0.09, 0, 0.29, -0.08);
      for (let i = 0; i < 6; i++) b.box('#5f646c', 0.04, 0.04, 0.07, -0.35 + i * 0.14, 0.21, -0.02);
      meru(b, -0.32, 0.08, -0.26, 3, 0.75);
      meru(b, 0.32, 0.08, -0.26, 5, 0.75);
      splitGate(b, 0, 0.08, -0.27, 0.62, BRICK);
      b.box('#ffd43b', 0.06, 0.02, 0.06, -0.45, 0.09, 0.32).box('#e64980', 0.035, 0.02, 0.035, -0.45, 0.105, 0.32); // offrande
      // Filets d'eau des fontaines
      const s = new Builder();
      for (let i = 0; i < 6; i++) for (let k = 0; k < 2; k++) s.box('#e6fbff', 0.028, 0.035, 0.028, -0.35 + i * 0.14, 0.2 - k * 0.06, 0.025);
      const streams = s.mesh();
      // Fidèles en blanc, dans l'eau jusqu'à la taille, qui passent la tête sous chaque fontaine
      const bathers = [0, 1].map((n) => {
        const p = new Builder();
        for (const i of n ? [1, 4] : [0, 2, 5]) {
          person(p, '#ffffff', null, -0.35 + i * 0.14, 0, 0, 0.75);
          p.box('#ffd43b', 0.075, 0.025, 0.075, -0.35 + i * 0.14, 0.085, 0);
        }
        return p.mesh(0, 0.03, 0.09);
      });
      return {
        parts: [b.mesh(), streams, ...bathers],
        update(t) {
          streams.position.y = -((t * 1.6) % 1) * 0.06;
          bathers[0].rotation.x = -0.1 - Math.max(0, Math.sin(t * 1.3)) * 0.4;
          bathers[1].rotation.x = -0.1 - Math.max(0, Math.sin(t * 1.3 + 2)) * 0.4;
        },
      };
    },
  },
  {
    name: 'Crête de Campuhan',
    match: 'Crête de Campuhan',
    dx: -0.82,
    dz: -0.14,
    size: 0.2,
    height: 0.6,
    build() {
      const b = new Builder();
      // Arête couverte de hautes herbes, chemin pavé sur le faîte
      b.poly('#74b84a', [[-0.32, 0], [0.32, 0], [0.07, 0.22], [-0.07, 0.22]], 1.15, 0, 0, 0, 0, PI / 2, 0);
      b.box('#eadfc4', 1.15, 0.015, 0.09, 0, 0.225, 0);
      palm(b, -0.5, 0.05, -0.2, 0.5, 0.1, 0.7);
      b.ball('#2f9e44', 0.1, 0.5, 0.1, -0.24, 1.2, 0.9, 1);
      const tuft = (side) => {
        const g = new Builder();
        for (let i = 0; i < 7; i++) {
          const x = -0.5 + i * 0.165 + (side > 0 ? 0.08 : 0);
          g.cone(i % 2 ? '#c0d860' : '#a9c94f', 0.035, 0.13, 4, x, 0.065, 0);
          g.cone('#d8e27a', 0.025, 0.1, 4, x + 0.05, 0.05, side * 0.05);
        }
        return g.mesh(0, 0.13, side * 0.13);
      };
      const grassN = tuft(-1);
      const grassS = tuft(1);
      const walkers = [person(new Builder(), '#e64980', null, 0, 0, 0, 0.75).mesh(), person(new Builder(), '#ffd43b', '#f2d16b', 0, 0, 0, 0.75).mesh()];
      return {
        parts: [b.mesh(), grassN, grassS, ...walkers],
        update(t) {
          grassN.rotation.x = Math.sin(t * 2) * 0.22;
          grassS.rotation.x = Math.sin(t * 2 + 0.8) * 0.22;
          walkers.forEach((w, i) => {
            const u = ((t * 0.1 + i * 0.45) % 1) * 2;
            w.position.set(-0.5 + (u < 1 ? u : 2 - u), 0.232 + Math.abs(Math.sin(t * 6 + i)) * 0.012, 0);
          });
        },
      };
    },
  },
  {
    name: 'Danse au palais',
    match: 'Danse balinaise au palais',
    dx: -0.14,
    dz: 0.02,
    size: 0.22,
    height: 1.0,
    build() {
      const b = new Builder();
      b.box('#d9cbb0', 1.1, 0.03, 0.8, 0, 0.015, 0.06); // cour du palais
      // Portail de brique rouge et de pierre sculptée, porte dorée
      b.box(BRICK, 0.34, 0.46, 0.16, 0, 0.26, -0.24);
      b.box(STONE, 0.4, 0.05, 0.2, 0, 0.5, -0.24);
      b.box(BRICK, 0.24, 0.12, 0.14, 0, 0.58, -0.24);
      b.box(STONE, 0.28, 0.04, 0.16, 0, 0.66, -0.24);
      b.box(BRICK, 0.14, 0.1, 0.1, 0, 0.73, -0.24);
      b.pyr(STONE, 0.08, 0.1, 0, 0.83, -0.24);
      b.box(GOLD, 0.13, 0.26, 0.02, 0, 0.16, -0.155);
      b.box('#c92a2a', 0.012, 0.26, 0.022, 0, 0.16, -0.154);
      b.box(STONE, 0.22, 0.03, 0.1, 0, 0.045, -0.12);
      for (const s of [-1, 1]) {
        b.box(BRICK, 0.3, 0.2, 0.08, s * 0.33, 0.13, -0.24);
        b.box(STONE, 0.32, 0.03, 0.1, s * 0.33, 0.245, -0.24);
        b.box(STONE, 0.08, 0.3, 0.1, s * 0.5, 0.18, -0.24);
        // Orchestre de gamelan : musicien assis, métallophone, gong
        person(b, '#7048e8', null, s * 0.44, 0.03, 0.1, 0.7);
        b.box('#8d5a2b', 0.07, 0.05, 0.18, s * 0.34, 0.055, 0.12);
        for (let i = 0; i < 4; i++) b.box(GOLD, 0.05, 0.012, 0.03, s * 0.34, 0.086, 0.06 + i * 0.04);
        b.cyl(GOLD, 0.05, 0.05, 0.015, 8, s * 0.46, 0.13, -0.08, PI / 2, 0, 0);
        b.box('#c92a2a', 0.14, 0.012, 0.012, s * 0.46, 0.19, -0.08).box('#c92a2a', 0.012, 0.16, 0.012, s * 0.39, 0.11, -0.08).box('#c92a2a', 0.012, 0.16, 0.012, s * 0.53, 0.11, -0.08);
      }
      const dancers = [dancer('#2f9e44', '#e64980'), dancer('#e64980', '#ffd43b')];
      const shades = [tedung(GOLD), tedung('#ffffff')];
      shades[0].position.set(-0.2, 0.03, -0.14);
      shades[1].position.set(0.2, 0.03, -0.14);
      return {
        parts: [b.mesh(), ...dancers, ...shades],
        update(t) {
          dancers.forEach((d, i) => {
            const a = t * 0.9 + i * PI;
            d.position.set(Math.cos(a) * 0.14, 0.03 + Math.abs(Math.sin(t * 3 + i)) * 0.015, 0.2 + Math.sin(a) * 0.09);
            d.rotation.y = Math.sin(t * 1.8 + i * 2) * 1.1;
            d.rotation.z = Math.sin(t * 2.4 + i) * 0.12;
          });
          shades[0].rotation.z = Math.sin(t * 1.5) * 0.08;
          shades[1].rotation.z = Math.sin(t * 1.5 + 1) * 0.08;
        },
      };
    },
  },
  {
    name: 'Forêt des singes',
    match: 'Forêt des singes',
    dx: -0.52,
    dz: 0.14,
    size: 0.22,
    height: 1.0,
    build() {
      const b = new Builder();
      // Banian aux racines pendantes
      b.cyl('#6b4a2f', 0.1, 0.16, 0.5, 6, -0.25, 0.25, -0.2);
      b.cyl('#6b4a2f', 0.04, 0.05, 0.5, 5, 0, 0.53, -0.16, 0, 0, PI / 2 - 0.1);
      for (const [x, z] of [[-0.44, -0.1], [-0.06, -0.3], [-0.38, -0.36], [-0.1, -0.06]]) b.cyl('#7a5a3a', 0.012, 0.012, 0.52, 4, x, 0.26, z);
      b.ball('#2f9e44', 0.3, -0.25, 0.72, -0.2, 1.3, 0.7, 1.1);
      b.ball('#40c057', 0.2, 0.06, 0.68, -0.25, 1.2, 0.7, 1);
      b.ball('#37b24d', 0.18, -0.47, 0.6, -0.08, 1.1, 0.7, 1);
      // Temple du XIVe siècle mangé par la mousse, statue de gardien
      b.box('#8a8f98', 0.2, 0.34, 0.14, 0.34, 0.17, -0.2);
      b.box(MOSS, 0.22, 0.03, 0.16, 0.34, 0.355, -0.2);
      b.box('#8a8f98', 0.14, 0.1, 0.1, 0.34, 0.42, -0.2);
      b.box(MOSS, 0.1, 0.03, 0.08, 0.34, 0.485, -0.2);
      b.box('#3b3b36', 0.08, 0.16, 0.02, 0.34, 0.08, -0.125);
      b.box('#8a8f98', 0.1, 0.07, 0.1, 0.12, 0.035, 0.12);
      b.ball('#7d828a', 0.05, 0.12, 0.12, 0.12, 1, 1.2, 1).ball('#7d828a', 0.035, 0.12, 0.2, 0.12);
      b.box(MOSS, 0.1, 0.015, 0.1, 0.12, 0.075, 0.12);
      // Trois macaques : un qui sautille, un perché sur le temple, un pendu à la branche
      const hopper = macaque().mesh();
      const sitter = macaque().mesh(0.34, 0.5, -0.2);
      const hang = macaque(new Builder(), 0, -0.34, 0);
      hang.box('#8d7b68', 0.03, 0.16, 0.03, 0, -0.08, 0);
      const swinger = hang.mesh(0.08, 0.5, -0.14);
      return {
        parts: [b.mesh(), hopper, sitter, swinger],
        update(t) {
          const u = Math.sin(t * 0.7);
          hopper.position.set(-0.1 + u * 0.3, Math.abs(Math.sin(t * 5)) * 0.07, 0.3);
          hopper.rotation.y = Math.cos(t * 0.7) > 0 ? PI / 2 : -PI / 2;
          sitter.rotation.y = Math.sin(t * 1.1) * 0.8;
          swinger.rotation.z = Math.sin(t * 2.3) * 0.55;
        },
      };
    },
  },
  {
    name: 'Cascade de Tegenungan',
    match: 'Cascade de Tegenungan',
    dx: 0.14,
    dz: 0.26,
    size: 0.22,
    height: 0.85,
    build() {
      const b = new Builder();
      // Large chute au fond d'une gorge, grand bassin où l'on se baigne
      b.box('#7a6f63', 0.95, 0.5, 0.26, 0, 0.25, -0.26);
      b.box('#8a7f72', 0.24, 0.34, 0.24, -0.4, 0.17, -0.04);
      b.box('#6b6157', 0.22, 0.26, 0.22, 0.42, 0.13, -0.02);
      b.ball('#2f9e44', 0.18, -0.36, 0.55, -0.26, 1.3, 0.7, 1).ball('#40c057', 0.17, 0.36, 0.55, -0.26, 1.3, 0.7, 1).ball('#37b24d', 0.11, -0.42, 0.38, -0.02).ball('#2f9e44', 0.1, 0.44, 0.3, 0);
      b.box('#7fd8f7', 0.46, 0.5, 0.05, 0, 0.25, -0.11);
      b.box('#7fd8f7', 0.46, 0.04, 0.2, 0, 0.5, -0.2);
      b.cyl(WATER, 0.4, 0.4, 0.03, 9, 0, 0.015, 0.2);
      b.ball('#8a7f72', 0.06, 0.3, 0.03, 0.42, 1.2, 0.7, 1);
      const f = new Builder();
      for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) f.box('#ffffff', 0.05, 0.09, 0.03, -0.17 + k * 0.17 + (i % 2) * 0.06, i * 0.2, 0);
      const fall = f.mesh(0, 0, -0.075);
      const foam = new Builder().ball('#ffffff', 0.09, -0.14, 0, 0).ball('#ffffff', 0.1, 0.02, 0.01, 0.03).ball('#e6fbff', 0.09, 0.16, 0, 0).mesh(0, 0.05, -0.02);
      const swimmer = new Builder().ball(SKIN, 0.045, 0, 0.03, 0).box('#e03131', 0.1, 0.03, 0.07, -0.07, 0.01, 0).box(SKIN, 0.03, 0.03, 0.2, 0, 0.015, 0).mesh();
      return {
        parts: [b.mesh(), fall, foam, swimmer],
        update(t) {
          fall.position.y = -0.02 - ((t * 0.6) % 1) * 0.2;
          foam.scale.set(1 + Math.sin(t * 5) * 0.15, 0.8 + Math.sin(t * 7) * 0.3, 1 + Math.cos(t * 4) * 0.15);
          const a = t * 0.7;
          swimmer.position.set(Math.cos(a) * 0.2, 0.03, 0.26 + Math.sin(a) * 0.1);
          swimmer.rotation.y = -a - PI / 2;
        },
      };
    },
  },
];

// ---------- Munduk ----------

const MUNDUK = [
  {
    name: 'Cascades de Munduk',
    match: 'Sentier des cascades',
    dx: -0.24,
    dz: -0.08,
    size: 0.2,
    height: 1.25,
    build() {
      const b = new Builder();
      // Haute chute étroite sur une paroi rougeâtre, en pleine forêt
      b.box('#9a6a50', 0.7, 1.0, 0.3, 0, 0.5, -0.24);
      b.box('#a87860', 0.26, 0.7, 0.22, -0.3, 0.35, -0.02);
      b.box('#8a5c44', 0.24, 0.5, 0.22, 0.32, 0.25, 0);
      b.ball('#2f9e44', 0.2, -0.22, 1.04, -0.24, 1.3, 0.7, 1).ball('#40c057', 0.19, 0.22, 1.04, -0.24, 1.3, 0.7, 1);
      b.ball('#37b24d', 0.13, -0.34, 0.74, -0.02).ball('#2f9e44', 0.12, 0.36, 0.54, 0);
      b.cone('#237a36', 0.1, 0.32, 5, -0.52, 0.22, 0.22).cyl('#6b4423', 0.015, 0.015, 0.1, 4, -0.52, 0.05, 0.22);
      b.box('#7fd8f7', 0.14, 1.0, 0.05, 0, 0.5, -0.07);
      b.box('#7fd8f7', 0.14, 0.04, 0.2, 0, 1.0, -0.16);
      b.cyl(WATER, 0.24, 0.24, 0.03, 8, 0, 0.015, 0.14);
      b.box(WATER, 0.1, 0.02, 0.26, 0.04, 0.012, 0.42);
      // Passerelle de bambou sur le ruisseau
      b.box('#e8c170', 0.64, 0.02, 0.09, 0.04, 0.11, 0.42);
      for (const x of [-0.26, 0.34]) b.box('#c9a352', 0.02, 0.2, 0.02, x, 0.1, 0.47).box('#c9a352', 0.02, 0.11, 0.02, x, 0.055, 0.37);
      b.box('#c9a352', 0.62, 0.015, 0.015, 0.04, 0.2, 0.47);
      const f = new Builder();
      for (let i = 0; i < 6; i++) f.box('#ffffff', 0.05, 0.1, 0.03, i % 2 ? 0.03 : -0.03, i * 0.22, 0);
      const fall = f.mesh(0, 0, -0.035);
      const mist = puff(0.07);
      const hiker = person(new Builder(), '#e8590c', '#f2d16b', 0, 0, 0, 0.75).box('#6b4423', 0.012, 0.2, 0.012, 0.06, 0.1, 0.02).mesh();
      return {
        parts: [b.mesh(), fall, mist, hiker],
        update(t) {
          fall.position.y = -0.04 - ((t * 0.7) % 1) * 0.22;
          rise(mist, (t * 0.35) % 1, 0, 0.06, 0.1, 0.3, 0.1, 1.4);
          const u = ((t * 0.12) % 1) * 2;
          hiker.position.set(-0.24 + (u < 1 ? u : 2 - u) * 0.56, 0.12 + Math.abs(Math.sin(t * 6)) * 0.012, 0.42);
        },
      };
    },
  },
  {
    name: 'Banyumala',
    match: 'Cascade de Banyumala',
    dx: 0.14,
    dz: -0.14,
    size: 0.2,
    height: 0.95,
    build() {
      const b = new Builder();
      // Deux chutes jumelles glissent sur une paroi couverte de végétation
      b.box('#4f9e4a', 0.98, 0.62, 0.26, 0, 0.31, -0.24);
      b.box('#3f8a3c', 0.3, 0.44, 0.24, -0.42, 0.22, -0.02);
      b.box('#5aae52', 0.26, 0.34, 0.24, 0.44, 0.17, 0);
      b.ball('#2f9e44', 0.17, -0.3, 0.68, -0.24, 1.4, 0.7, 1).ball('#237a36', 0.15, 0.05, 0.7, -0.26, 1.3, 0.7, 1).ball('#40c057', 0.17, 0.36, 0.67, -0.24, 1.3, 0.7, 1);
      for (const x of [-0.16, 0.16]) {
        b.box('#c5f3fb', 0.11, 0.62, 0.04, x, 0.31, -0.1);
        b.box('#c5f3fb', 0.11, 0.03, 0.16, x, 0.62, -0.17);
      }
      b.box('#c5f3fb', 0.025, 0.5, 0.03, 0.33, 0.3, -0.1).box('#c5f3fb', 0.025, 0.4, 0.03, -0.32, 0.36, -0.1);
      b.cyl('#34c3d9', 0.42, 0.42, 0.03, 9, 0, 0.015, 0.2);
      b.ball('#6b6157', 0.06, -0.34, 0.03, 0.4, 1.2, 0.7, 1).ball('#6b6157', 0.05, 0.36, 0.03, 0.36, 1.2, 0.7, 1);
      const streak = (x) => {
        const f = new Builder();
        for (let i = 0; i < 4; i++) f.box('#ffffff', 0.04, 0.09, 0.03, i % 2 ? 0.025 : -0.025, i * 0.2, 0);
        return f.mesh(x, 0, -0.07);
      };
      const falls = [streak(-0.16), streak(0.16)];
      // Baigneurs dans l'eau froide du bassin
      const sw = new Builder();
      sw.ball(SKIN, 0.045, -0.1, 0.04, 0).box('#e03131', 0.08, 0.03, 0.06, -0.1, 0, 0).box(SKIN, 0.2, 0.025, 0.025, -0.1, 0.03, 0, 0, 0, 0.5);
      sw.ball(SKIN, 0.045, 0.12, 0.04, 0.08).box('#1c7ed6', 0.08, 0.03, 0.06, 0.12, 0, 0.08).box(SKIN, 0.2, 0.025, 0.025, 0.12, 0.03, 0.08, 0, 0, -0.5);
      const bathers = sw.mesh(0, 0.03, 0.2);
      return {
        parts: [b.mesh(), ...falls, bathers],
        update(t) {
          falls[0].position.y = -0.02 - ((t * 0.6) % 1) * 0.2;
          falls[1].position.y = -0.02 - ((t * 0.6 + 0.5) % 1) * 0.2;
          bathers.position.y = 0.035 + Math.sin(t * 2.4) * 0.015;
          bathers.rotation.y = Math.sin(t * 0.8) * 0.5;
        },
      };
    },
  },
  {
    name: 'Lacs jumeaux',
    match: 'Lacs Buyan et Tamblingan',
    dx: 0.3,
    dz: 0.3,
    size: 0.22,
    height: 0.6,
    build() {
      const b = new Builder();
      // Deux lacs côte à côte au fond d'une ancienne caldeira, séparés par une bande de forêt
      b.poly('#2f9fd0', [[-0.52, -0.1], [-0.32, -0.2], [-0.08, -0.14], [-0.06, 0.1], [-0.3, 0.2], [-0.5, 0.1]], 0.02, 0, 0.012, 0.06, -PI / 2);
      b.poly('#3ab0dc', [[0.06, -0.16], [0.34, -0.22], [0.54, -0.08], [0.5, 0.14], [0.2, 0.2], [0.05, 0.06]], 0.02, 0, 0.012, 0.06, -PI / 2);
      for (const z of [-0.14, -0.02, 0.1, 0.22]) b.ball(z > 0 ? '#2f9e44' : '#37b24d', 0.07, 0, 0.06, z, 1, 1.1, 1);
      // Crête boisée de Wanagiri, derrière
      b.box('#5a9a48', 1.14, 0.18, 0.14, 0, 0.09, -0.36);
      for (let i = 0; i < 7; i++) b.ball(i % 2 ? '#2f9e44' : '#237a36', 0.09, -0.48 + i * 0.16, 0.2, -0.36, 1.1, 0.9, 1);
      b.box('#e8c170', 0.14, 0.015, 0.1, 0.3, 0.19, -0.3).box('#8d5a2b', 0.015, 0.1, 0.015, 0.3, 0.14, -0.26); // plateforme de vue
      meru(b, -0.46, 0, 0.3, 3, 0.55); // temple au bord du lac Tamblingan
      // Pedau : deux pirogues accouplées, un rameur
      const c = new Builder();
      for (const z of [-0.035, 0.035]) c.poly('#8d5a2b', [[-0.14, 0.035], [-0.1, 0], [0.1, 0], [0.14, 0.035]], 0.03, 0, 0, z);
      c.box('#6b4423', 0.1, 0.01, 0.1, 0, 0.035, 0);
      person(c, '#e03131', '#f2d16b', 0, 0.035, 0, 0.6);
      c.box('#c9a352', 0.012, 0.16, 0.012, 0.05, 0.1, 0.05, 0, 0, -0.5);
      const canoe = c.mesh();
      const mist = [puff(0.06), puff(0.05)];
      return raised({
        parts: [b.mesh(), canoe, ...mist],
        update(t) {
          const u = ((t * 0.07) % 1) * 2;
          const k = u < 1 ? u : 2 - u;
          canoe.position.set(-0.44 + k * 0.3, 0.025 + Math.sin(t * 2.2) * 0.006, 0.08 + Math.sin(k * PI) * 0.06);
          canoe.rotation.y = u < 1 ? 0 : PI;
          canoe.rotation.z = Math.sin(t * 2) * 0.06;
          mist.forEach((m, i) => {
            const life = (t * 0.08 + i * 0.5) % 1;
            m.position.set(-0.3 + i * 0.5 + life * 0.25, 0.1 + i * 0.03, -0.12 + i * 0.1);
            m.scale.setScalar(1.6 * Math.sin(life * PI));
          });
        },
      }, 0.14, '#6aa84f');
    },
  },
  {
    name: 'Ulun Danu Beratan',
    match: 'Temple Ulun Danu Beratan',
    dx: 0.66,
    dz: 0.04,
    size: 0.2,
    height: 1.3,
    build() {
      const b = new Builder();
      // Le temple qui paraît flotter sur le lac : grand meru à onze toits et petit meru à trois toits, chacun sur son îlot
      b.poly('#3aa7d6', [[-0.56, -0.2], [-0.2, -0.32], [0.3, -0.3], [0.56, -0.1], [0.5, 0.26], [0.1, 0.4], [-0.4, 0.34], [-0.58, 0.1]], 0.02, 0, 0.012, 0.04, -PI / 2);
      b.cyl('#c9b79a', 0.2, 0.22, 0.06, 8, -0.12, 0.04, 0.02).cyl(MOSS, 0.19, 0.19, 0.012, 8, -0.12, 0.075, 0.02);
      meru(b, -0.12, 0.08, 0.02, 11, 0.72);
      b.cyl('#c9b79a', 0.13, 0.15, 0.06, 8, 0.28, 0.04, 0.2).cyl(MOSS, 0.12, 0.12, 0.012, 8, 0.28, 0.075, 0.2);
      meru(b, 0.28, 0.08, 0.2, 3, 0.6);
      // Rive : jardin, portail fendu
      b.box('#8fd36a', 0.6, 0.05, 0.18, -0.2, 0.025, -0.38);
      splitGate(b, -0.3, 0.05, -0.38, 0.5, BRICK);
      b.ball('#e64980', 0.04, -0.02, 0.09, -0.38).ball('#ffd43b', 0.04, 0.06, 0.09, -0.36);
      const boat = new Builder().poly('#ffffff', [[-0.11, 0.05], [0.13, 0.05], [0.08, -0.02], [-0.08, -0.02]], 0.07).box('#e03131', 0.2, 0.012, 0.072, 0.01, 0.05, 0);
      person(boat, '#1c7ed6', null, 0, 0.03, 0, 0.55);
      const barque = boat.mesh();
      const mist = [puff(0.07), puff(0.06)];
      return raised({
        parts: [b.mesh(), barque, ...mist],
        update(t) {
          const a = t * 0.35;
          barque.position.set(0.14 + Math.cos(a) * 0.3, 0.04 + Math.sin(t * 2.2) * 0.006, 0.12 + Math.sin(a) * 0.2);
          barque.rotation.y = -a - PI / 2;
          mist.forEach((m, i) => {
            const life = (t * 0.07 + i * 0.5) % 1;
            m.position.set(-0.5 + life * 0.9, 0.1 + i * 0.25, -0.2 + i * 0.3);
            m.scale.setScalar(1.7 * Math.sin(life * PI));
          });
        },
      }, 0.14, '#6aa84f');
    },
  },
  {
    name: 'Café et girofle',
    match: 'Plantations de café',
    dx: -0.2,
    dz: 0.36,
    size: 0.2,
    height: 1.05,
    build() {
      const b = new Builder();
      // Caféiers en rangs, chargés de cerises rouges
      for (let r = 0; r < 2; r++) {
        for (let i = 0; i < 3; i++) {
          const x = -0.44 + i * 0.2 + r * 0.06;
          const z = -0.2 + r * 0.22;
          b.ball(i % 2 ? '#237a36' : '#2b8a3e', 0.09, x, 0.09, z, 1, 0.95, 1);
          b.ball('#e03131', 0.022, x + 0.05, 0.13, z + 0.06).ball('#e03131', 0.022, x - 0.04, 0.08, z + 0.08).ball('#e03131', 0.022, x, 0.16, z + 0.04);
        }
      }
      // Giroflier : grand arbre en cône, échelle de bambou appuyée contre
      b.cyl('#6b4423', 0.03, 0.04, 0.3, 5, 0.3, 0.15, -0.18);
      b.cone('#2f9e44', 0.22, 0.6, 6, 0.3, 0.55, -0.18).cone('#40c057', 0.15, 0.4, 6, 0.3, 0.78, -0.18);
      for (const x of [0.4, 0.47]) b.box('#e8c170', 0.012, 0.64, 0.012, x, 0.3, -0.02, 0.22, 0, 0);
      for (let i = 0; i < 6; i++) b.box('#e8c170', 0.08, 0.012, 0.012, 0.435, 0.06 + i * 0.1, 0.03 - i * 0.022);
      // Nattes de séchage : clous de girofle bruns, grains de café
      b.box('#d9b384', 0.3, 0.012, 0.2, -0.28, 0.006, 0.38).box('#6b3e1e', 0.24, 0.014, 0.14, -0.28, 0.012, 0.38);
      b.box('#d9b384', 0.24, 0.012, 0.2, 0.06, 0.006, 0.4).box('#b5523a', 0.18, 0.014, 0.14, 0.06, 0.012, 0.4);
      // Tasse de café fumante
      b.cyl('#ffffff', 0.05, 0.04, 0.07, 7, 0.36, 0.035, 0.34).cyl('#4a2c17', 0.04, 0.04, 0.01, 7, 0.36, 0.072, 0.34);
      const picker = person(new Builder(), '#e64980', '#f2d16b', 0, 0, 0, 0.75).cyl('#c49a4a', 0.04, 0.03, 0.07, 6, 0, 0.1, 0.06).mesh();
      const steam = [puff(0.04), puff(0.04)];
      return {
        parts: [b.mesh(), picker, ...steam],
        update(t) {
          // Le cueilleur monte et descend l'échelle
          const k = 0.5 + Math.sin(t * 0.6) * 0.5;
          picker.position.set(0.435, 0.1 + k * 0.38, 0.06 - k * 0.085);
          picker.rotation.x = -0.25;
          steam.forEach((s, i) => rise(s, (t * 0.4 + i / 2) % 1, 0.36, 0.09, 0.34, 0.26, 0.05, 1));
        },
      };
    },
  },
  {
    name: 'Banian géant',
    match: 'Rizières et banian de Gesing',
    dx: -0.54,
    dz: 0.1,
    size: 0.18,
    height: 1.2,
    build() {
      const b = new Builder();
      // Banian géant : tronc fait de racines soudées, racines aériennes, houppier immense
      b.cyl('#6b4a2f', 0.14, 0.2, 0.5, 7, 0, 0.25, -0.08);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * PI * 2;
        b.cyl('#7a5a3a', 0.04, 0.06, 0.5, 5, Math.cos(a) * 0.15, 0.25, -0.08 + Math.sin(a) * 0.13);
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * PI * 2 + 0.3;
        const r = 0.32 + (i % 2) * 0.1;
        b.cyl('#8a6a4a', 0.012, 0.012, 0.56, 4, Math.cos(a) * r, 0.28, -0.08 + Math.sin(a) * r * 0.8);
      }
      b.ball('#2f9e44', 0.42, 0, 0.84, -0.08, 1.15, 0.6, 1.1, 1);
      b.ball('#40c057', 0.2, -0.3, 0.72, 0.02, 1.2, 0.7, 1).ball('#37b24d', 0.22, 0.38, 0.72, -0.02, 1.2, 0.7, 1).ball('#237a36', 0.2, 0.05, 0.74, -0.38, 1.3, 0.7, 1);
      // Étoffe à damier noir et blanc nouée autour du tronc, petit autel
      b.cyl('#ffffff', 0.205, 0.215, 0.08, 8, 0, 0.16, -0.08);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * PI * 2;
        b.box('#1a1a1a', 0.06, 0.04, 0.03, Math.cos(a) * 0.205, i % 2 ? 0.18 : 0.14, -0.08 + Math.sin(a) * 0.205, 0, -a + PI / 2, 0);
      }
      b.box(STONE, 0.1, 0.12, 0.08, 0.3, 0.06, 0.2).box(GOLD, 0.06, 0.02, 0.05, 0.3, 0.13, 0.2);
      // Rizières en terrasses au premier plan
      b.box('#a67c52', 1.0, 0.05, 0.14, 0, 0.025, 0.44).box('#8ce99a', 1.0, 0.014, 0.14, 0, 0.056, 0.44);
      b.box('#a67c52', 0.8, 0.04, 0.12, -0.08, 0.02, 0.57).box('#51cf66', 0.8, 0.014, 0.12, -0.08, 0.046, 0.57);
      const walker = person(new Builder(), '#1c7ed6', null, 0, 0, 0, 0.7).mesh();
      const bd = new Builder();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * PI * 2;
        bd.box('#ffffff', 0.12, 0.014, 0.045, Math.cos(a) * 0.4, i * 0.05, Math.sin(a) * 0.4, 0, -a, 0.35);
        bd.box('#ffffff', 0.12, 0.014, 0.045, Math.cos(a) * 0.4, i * 0.05, Math.sin(a) * 0.4, 0, -a, -0.35);
      }
      const birds = bd.mesh(0, 1.1, -0.08);
      return {
        parts: [b.mesh(), walker, birds],
        update(t) {
          // Un visiteur fait le tour de l'arbre : il a l'air minuscule
          const a = t * 0.4;
          walker.position.set(Math.cos(a) * 0.36, Math.abs(Math.sin(t * 6)) * 0.012, 0.0 + Math.sin(a) * 0.3);
          birds.rotation.y = -t * 0.7;
          birds.position.y = 1.12 + Math.sin(t * 1.5) * 0.04;
        },
      };
    },
  },
];

// ---------- Sidemen ----------

const SIDEMEN = [
  {
    name: 'Rafting',
    match: 'Rafting sur la Telaga Waja',
    dx: -0.44,
    dz: -0.24,
    size: 0.2,
    height: 0.6,
    build() {
      const b = new Builder();
      // Rivière entre deux berges de jungle, rochers et rapides
      b.box('#49c6f2', 1.15, 0.03, 0.36, 0, 0.015, 0.06);
      b.box('#74b84a', 1.15, 0.12, 0.16, 0, 0.06, -0.2);
      b.box('#74b84a', 1.15, 0.06, 0.1, 0, 0.03, 0.29);
      for (let i = 0; i < 5; i++) b.ball(i % 2 ? '#2f9e44' : '#237a36', 0.1, -0.46 + i * 0.23, 0.19, -0.22, 1.1, 0.9, 1);
      palm(b, 0.36, 0.1, -0.2, 0.4, 0.1, 0.6);
      b.ball('#7d766d', 0.06, -0.2, 0.03, -0.02, 1.2, 0.7, 1).ball('#8a7f72', 0.07, 0.22, 0.03, 0.14, 1.2, 0.7, 1).ball('#7d766d', 0.05, 0.02, 0.03, 0.18);
      // Raft jaune, quatre rameurs casqués
      const r = new Builder();
      r.ball('#ffd43b', 0.1, 0, 0.035, 0, 1.7, 0.45, 1);
      r.ball('#e8a800', 0.07, 0, 0.055, 0, 1.6, 0.3, 0.8);
      [[-0.07, -0.05, '#e03131'], [0.05, -0.05, '#1c7ed6'], [-0.07, 0.05, '#2f9e44'], [0.05, 0.05, '#e64980']].forEach(([x, z, c]) => {
        person(r, c, null, x, 0.05, z, 0.55);
        r.ball(c, 0.03, x, 0.175, z, 1, 0.8, 1);
        r.box('#343a40', 0.012, 0.012, 0.12, x, 0.1, z + (z > 0 ? 0.07 : -0.07), z > 0 ? 0.5 : -0.5, 0, 0);
      });
      const raft = r.mesh();
      const foam = [0, 1].map(() => new Builder().ball('#ffffff', 0.05, 0, 0, 0).ball('#ffffff', 0.04, 0.07, 0, 0.03).ball('#e6fbff', 0.04, -0.06, 0, 0.02).mesh());
      foam[0].position.set(-0.14, 0.035, 0.02);
      foam[1].position.set(0.3, 0.035, 0.16);
      const splash = puff(0.05);
      return {
        parts: [b.mesh(), raft, ...foam, splash],
        update(t) {
          const k = (t * 0.16) % 1;
          const x = -0.46 + k * 0.92;
          raft.position.set(x, 0.03 + Math.abs(Math.sin(t * 5)) * 0.03, 0.08 + Math.sin(k * PI * 3) * 0.07);
          raft.rotation.z = Math.sin(t * 5) * 0.2;
          raft.rotation.y = Math.cos(k * PI * 3) * 0.35;
          raft.scale.setScalar(Math.min(1, Math.min(k, 1 - k) * 8));
          foam[0].scale.setScalar(0.8 + Math.sin(t * 6) * 0.3);
          foam[1].scale.setScalar(0.8 + Math.cos(t * 5) * 0.3);
          rise(splash, (t * 1.2) % 1, x + 0.16, 0.05, raft.position.z, 0.12, 0.05, 1);
        },
      };
    },
  },
  {
    name: 'Besakih',
    match: 'Temple de Besakih',
    dx: -0.12,
    dz: -0.16,
    size: 0.2,
    height: 1.15,
    build() {
      const b = new Builder();
      // Terrasses de lave sombre sur la pente de l'Agung, grand escalier, portail fendu, merus de trois à onze toits
      ['#6b6b60', '#7a7a6e', '#8a8a7c'].forEach((c, i) => b.box(c, 1.04 - i * 0.18, 0.1, 0.56 - i * 0.14, 0, 0.05 + i * 0.1, -0.1 - i * 0.07));
      b.box('#d8d8cc', 0.16, 0.025, 0.46, 0, 0.165, 0.1, 0.62, 0, 0);
      splitGate(b, 0, 0.3, -0.12, 0.5, '#4a4a44', 0.09);
      meru(b, -0.18, 0.3, -0.3, 7, 0.6);
      meru(b, 0.18, 0.3, -0.3, 9, 0.6);
      meru(b, -0.36, 0.2, -0.2, 5, 0.55);
      meru(b, 0.36, 0.2, -0.2, 7, 0.55);
      meru(b, -0.42, 0.1, 0.06, 3, 0.5);
      meru(b, 0.42, 0.1, 0.06, 3, 0.5);
      // Pèlerins en blanc qui montent l'escalier, offrandes sur la tête
      const p = new Builder();
      for (let i = 0; i < 3; i++) {
        person(p, '#ffffff', null, (i - 1) * 0.045, i * 0.035, -i * 0.05, 0.6);
        p.box(i % 2 ? '#ffd43b' : '#e64980', 0.04, 0.03, 0.04, (i - 1) * 0.045, i * 0.035 + 0.16, -i * 0.05);
      }
      const pilgrims = p.mesh();
      const shades = [tedung(GOLD), tedung('#ffffff')];
      shades[0].position.set(-0.2, 0.2, 0.06);
      shades[1].position.set(0.2, 0.2, 0.06);
      return {
        parts: [b.mesh(), pilgrims, ...shades],
        update(t) {
          const k = (t * 0.12) % 1;
          pilgrims.position.set(0, 0.03 + k * 0.24 + Math.abs(Math.sin(t * 6)) * 0.01, 0.32 - k * 0.36);
          pilgrims.scale.setScalar(Math.min(1, Math.min(k, 1 - k) * 8));
          shades[0].rotation.z = Math.sin(t * 1.6) * 0.1;
          shades[1].rotation.z = Math.sin(t * 1.6 + 1.2) * 0.1;
        },
      };
    },
  },
  {
    name: 'Lempuyang',
    match: 'Temple de Lempuyang',
    dx: 0.5,
    dz: -0.24,
    size: 0.26,
    height: 0.95,
    build() {
      const b = new Builder();
      // La « porte du ciel » : un portail fendu qui encadre le cône de l'Agung
      b.box('#cfd4da', 0.95, 0.06, 0.56, 0, 0.03, 0.14);
      splitGate(b, 0, 0.06, 0.02, 1.15, '#5f6b7a', 0.11);
      b.cone('#9db4e8', 0.36, 0.52, 6, 0, 0.26, -0.44);
      b.cone('#c5d4f5', 0.12, 0.16, 6, 0, 0.47, -0.44);
      b.box('#e9ecef', 0.3, 0.03, 0.2, 0, 0.075, 0.2); // marches
      // File d'attente pour la photo
      ['#e8590c', '#2f9e44', '#e64980'].forEach((c, i) => person(b, c, null, -0.4 + i * 0.09, 0.06, 0.34, 0.65));
      // Le photographe et son miroir tenu sous l'objectif
      person(b, '#343a40', null, 0.04, 0.06, 0.36, 0.6);
      b.box('#a5d8ff', 0.09, 0.01, 0.05, 0.04, 0.13, 0.3);
      const jumper = person(new Builder(), '#ffd43b', null, 0, 0, 0, 0.75).box(SKIN, 0.2, 0.025, 0.025, 0, 0.17, 0, 0, 0, 0.5).box(SKIN, 0.2, 0.025, 0.025, 0, 0.17, 0, 0, 0, -0.5).mesh();
      const clouds = [puff(0.06), puff(0.05)];
      return {
        parts: [b.mesh(), jumper, ...clouds],
        update(t) {
          // Pose en sautant entre les deux moitiés du portail
          jumper.position.set(0, 0.06 + Math.max(0, Math.sin(t * 2.6)) ** 2 * 0.16, 0.06);
          clouds.forEach((c, i) => {
            const a = t * 0.35 + i * PI;
            c.position.set(Math.cos(a) * 0.3, 0.3 + i * 0.08, -0.44 + Math.sin(a) * 0.12);
            c.scale.set(1.8, 1, 1.2);
          });
        },
      };
    },
  },
  {
    name: 'Rizières',
    match: 'Balade dans les rizières',
    dx: -0.44,
    dz: 0.08,
    size: 0.2,
    height: 0.6,
    build() {
      const b = new Builder();
      // Rizières à plat entre leurs diguettes, canal, rivière Unda et son pont jaune
      b.box('#a67c52', 0.7, 0.04, 0.8, -0.2, 0.02, 0);
      const greens = ['#8ce99a', '#51cf66', '#b2f2bb', '#69db7c', '#40c057', '#c0eb75'];
      for (let r = 0; r < 3; r++) for (let i = 0; i < 2; i++) b.box(greens[r * 2 + i], 0.31, 0.02, 0.23, -0.365 + i * 0.33, 0.045, -0.26 + r * 0.26);
      b.box('#49c6f2', 0.18, 0.03, 0.9, 0.3, 0.015, 0);
      b.box('#a67c52', 0.2, 0.04, 0.8, 0.5, 0.02, 0).box('#74b84a', 0.2, 0.012, 0.8, 0.5, 0.045, 0);
      palm(b, -0.5, 0.04, -0.34, 0.42, 0.1, 0.65);
      palm(b, 0.52, 0.04, -0.2, 0.36, -0.08, 0.6);
      b.box('#ffd43b', 0.46, 0.02, 0.09, 0.3, 0.12, 0.12);
      for (const x of [0.12, 0.48]) {
        for (const z of [0.075, 0.165]) b.box('#ffd43b', 0.02, 0.3, 0.02, x, 0.15, z);
        b.box('#ffd43b', 0.025, 0.02, 0.11, x, 0.3, 0.12);
      }
      for (const z of [0.075, 0.165]) b.box('#ffd43b', 0.38, 0.012, 0.012, 0.3, 0.2, z);
      // Canards en file sur la diguette, promeneur sur le pont
      const d = new Builder();
      for (let i = 0; i < 4; i++) {
        d.ball(i % 2 ? '#ffffff' : '#c49a4a', 0.028, -i * 0.07, 0.03, 0, 1.3, 1, 1);
        d.ball(i % 2 ? '#ffffff' : '#c49a4a', 0.018, -i * 0.07 + 0.03, 0.06, 0);
        d.box('#ff922b', 0.02, 0.008, 0.012, -i * 0.07 + 0.05, 0.058, 0);
      }
      const ducks = d.mesh();
      const walker = person(new Builder(), '#e03131', '#f2d16b', 0, 0, 0, 0.7).mesh();
      const farmer = person(new Builder(), '#3b82f6', '#f2d16b', 0, 0, 0, 0.75).mesh(-0.36, 0.05, 0.26);
      return {
        parts: [b.mesh(), ducks, walker, farmer],
        update(t) {
          const u = ((t * 0.1) % 1) * 2;
          const k = u < 1 ? u : 2 - u;
          ducks.position.set(-0.42 + k * 0.5, 0.045 + Math.abs(Math.sin(t * 8)) * 0.008, 0.13);
          ducks.rotation.y = u < 1 ? 0 : PI;
          ducks.rotation.z = Math.sin(t * 8) * 0.12;
          const w = ((t * 0.13) % 1) * 2;
          walker.position.set(0.1 + (w < 1 ? w : 2 - w) * 0.4, 0.13 + Math.abs(Math.sin(t * 6)) * 0.01, 0.12);
          farmer.rotation.z = -0.3 - Math.max(0, Math.sin(t * 3)) * 0.4;
        },
      };
    },
  },
  {
    name: 'Tissage',
    match: 'Ateliers de tissage',
    dx: -0.1,
    dz: 0.2,
    size: 0.2,
    height: 0.9,
    build() {
      const b = new Builder();
      b.box('#d9cbb0', 0.9, 0.03, 0.8, 0, 0.015, 0);
      // Métier à tisser en bois : la chaîne tendue, l'étoffe endek aux bandes vives côté tisserande
      for (const x of [-0.22, 0.22]) {
        for (const z of [-0.14, 0.26]) b.box('#8d5a2b', 0.03, 0.36, 0.03, x, 0.2, z);
        b.box('#8d5a2b', 0.03, 0.03, 0.43, x, 0.37, 0.06);
      }
      b.box('#8d5a2b', 0.47, 0.03, 0.03, 0, 0.37, -0.14).box('#8d5a2b', 0.47, 0.03, 0.03, 0, 0.37, 0.26);
      b.box('#f8f9fa', 0.38, 0.01, 0.24, 0, 0.2, 0.14);
      ['#e64980', '#ffd43b', '#7048e8', '#2f9e44', '#e8590c'].forEach((c, i) => b.box(c, 0.38, 0.014, 0.034, 0, 0.202, -0.11 + i * 0.034));
      b.cyl('#e64980', 0.035, 0.035, 0.42, 6, 0, 0.2, -0.15, 0, 0, PI / 2);
      b.cyl('#f8f9fa', 0.03, 0.03, 0.42, 6, 0, 0.2, 0.27, 0, 0, PI / 2);
      person(b, '#7048e8', null, 0, 0.03, -0.26, 0.95); // la tisserande
      // Étoffes qui sèchent sur un fil
      for (const x of [-0.42, 0.42]) b.box('#6b4423', 0.02, 0.6, 0.02, x, 0.33, -0.36);
      b.box('#6b4423', 0.86, 0.012, 0.012, 0, 0.62, -0.36);
      const cl = new Builder();
      ['#e03131', '#ffd43b', '#1c7ed6', '#2f9e44', '#e64980'].forEach((c, i) => {
        cl.box(c, 0.13, 0.26, 0.012, -0.3 + i * 0.15, -0.13, 0);
        cl.box('#ffffff', 0.13, 0.03, 0.014, -0.3 + i * 0.15, -0.08, 0).box('#1a1a1a', 0.13, 0.02, 0.014, -0.3 + i * 0.15, -0.2, 0);
      });
      const cloths = cl.mesh(0, 0.615, -0.36);
      const beater = new Builder().box('#6b4423', 0.42, 0.09, 0.02, 0, 0, 0).mesh();
      const shuttle = new Builder().box('#343a40', 0.07, 0.02, 0.025, 0, 0, 0).mesh();
      return {
        parts: [b.mesh(), cloths, beater, shuttle],
        update(t) {
          cloths.rotation.x = Math.sin(t * 1.7) * 0.25;
          beater.position.set(0, 0.24, 0.1 - Math.max(0, Math.sin(t * 4)) * 0.1);
          shuttle.position.set(Math.sin(t * 2) * 0.17, 0.215, 0.09);
        },
      };
    },
  },
  {
    name: 'Tirta Gangga',
    match: 'Tirta Gangga',
    dx: 0.3,
    dz: 0.02,
    size: 0.2,
    height: 1.05,
    build() {
      const b = new Builder();
      // Palais d'eau : grand bassin, fontaine à étages, dalles posées sur l'eau entre les statues
      b.box('#b8b2a6', 1.04, 0.05, 0.84, 0, 0.025, 0);
      b.box(WATER, 0.94, 0.02, 0.74, 0, 0.055, 0);
      for (let i = 0; i < 9; i++) {
        const r = 0.13 - i * 0.012;
        b.cyl(i % 2 ? '#e9ecef' : '#cfd4da', r - 0.02, r, 0.06, 8, 0, 0.1 + i * 0.085, -0.16);
        b.cyl('#adb5bd', r + 0.025, r + 0.025, 0.014, 8, 0, 0.14 + i * 0.085, -0.16);
      }
      b.cone(GOLD, 0.02, 0.07, 5, 0, 0.92, -0.16);
      for (let i = -3; i <= 3; i++) {
        b.cyl('#efe6d0', 0.045, 0.045, 0.03, 8, i * 0.125, 0.075, 0.18);
        if (i % 2) b.box('#8a8f98', 0.035, 0.09, 0.035, i * 0.125, 0.11, 0.04).ball('#8a8f98', 0.028, i * 0.125, 0.175, 0.04).cyl('#efe6d0', 0.04, 0.04, 0.03, 8, i * 0.125, 0.075, 0.04);
      }
      b.ball('#e64980', 0.03, -0.36, 0.08, -0.24, 1, 0.6, 1).ball('#e64980', 0.03, 0.34, 0.08, -0.2, 1, 0.6, 1).cyl('#2f9e44', 0.05, 0.05, 0.01, 6, -0.36, 0.068, -0.24).cyl('#2f9e44', 0.05, 0.05, 0.01, 6, 0.34, 0.068, -0.2);
      // Carpes koï
      const k = new Builder();
      fish(k, '#ff922b', '#ffffff', 0.12, 0, 0, 0.8);
      fish(k, '#ffffff', '#e03131', -0.1, 0, 0.07, 0.7);
      fish(k, '#ffd43b', '#ff922b', -0.02, 0, -0.1, 0.7);
      const koi = k.mesh();
      koi.scale.y = 0.4;
      const hopper = person(new Builder(), '#e03131', null, 0, 0, 0, 0.7).mesh();
      const jets = [puff(0.04), puff(0.04)];
      return {
        parts: [b.mesh(), koi, hopper, ...jets],
        update(t) {
          const a = t * 0.5;
          koi.position.set(Math.cos(a) * 0.3, 0.07, 0.22 + Math.sin(a) * 0.08);
          koi.rotation.y = -a - PI / 2;
          // De dalle en dalle
          const s = (t * 0.9) % 12;
          const n = Math.floor(s);
          const f = s - n;
          const at = (i) => (i < 6 ? i : 12 - i) - 3;
          hopper.position.set((at(n) + (at(n + 1) - at(n)) * f) * 0.125, 0.09 + Math.sin(f * PI) * 0.07, 0.18);
          jets.forEach((j, i) => rise(j, (t * 0.5 + i / 2) % 1, 0, 0.95, -0.16, 0.16, i ? 0.1 : -0.1, 1));
        },
      };
    },
  },
  {
    name: 'Kerta Gosa',
    match: "Route d'Ubud par Klungkung",
    dx: -0.36,
    dz: 0.4,
    size: 0.19,
    height: 0.8,
    build() {
      const b = new Builder();
      // Pavillon de justice des rois de Klungkung, posé au milieu de son bassin
      b.box('#b8b2a6', 1.0, 0.04, 0.72, 0, 0.02, -0.06);
      b.box(WATER, 0.9, 0.02, 0.62, 0, 0.045, -0.06);
      b.box(BRICK, 0.52, 0.14, 0.36, 0, 0.11, -0.06);
      b.box(STONE, 0.56, 0.02, 0.4, 0, 0.19, -0.06);
      for (const x of [-0.22, 0, 0.22]) for (const z of [-0.2, 0.08]) b.cyl('#8d5a2b', 0.014, 0.014, 0.2, 5, x, 0.3, z);
      b.poly('#b5523a', [[-0.34, 0], [0.34, 0], [0.16, 0.2], [-0.16, 0.2]], 0.5, 0, 0.4, -0.06);
      b.box(GOLD, 0.34, 0.03, 0.04, 0, 0.61, -0.06);
      b.box('#f1e3c4', 0.44, 0.012, 0.28, 0, 0.395, -0.06); // le plafond peint
      b.box(BRICK, 0.1, 0.03, 0.2, 0, 0.17, 0.2).box(STONE, 0.02, 0.05, 0.2, -0.05, 0.2, 0.2).box(STONE, 0.02, 0.05, 0.2, 0.05, 0.2, 0.2);
      for (const [x, z] of [[-0.36, -0.3], [0.36, -0.3], [-0.36, 0.18], [0.36, 0.18]]) b.box('#8a8f98', 0.04, 0.1, 0.04, x, 0.1, z).ball('#8a8f98', 0.03, x, 0.17, z);
      b.ball('#e64980', 0.03, -0.32, 0.07, -0.02, 1, 0.6, 1).ball('#e64980', 0.03, 0.3, 0.07, -0.14, 1, 0.6, 1).ball('#ffffff', 0.03, 0.34, 0.07, 0.08, 1, 0.6, 1);
      // La route, où passe la voiture du chauffeur
      b.box('#495057', 1.1, 0.02, 0.14, 0, 0.01, 0.42);
      for (let i = -2; i <= 2; i++) b.box('#f8f9fa', 0.08, 0.022, 0.015, i * 0.22, 0.012, 0.42);
      const c = new Builder();
      c.box('#ffffff', 0.22, 0.06, 0.1, 0, 0.06, 0).box('#a5d8ff', 0.12, 0.05, 0.095, -0.01, 0.115, 0).box('#ffffff', 0.13, 0.012, 0.1, -0.01, 0.145, 0);
      for (const x of [-0.07, 0.07]) c.cyl('#1d1d1d', 0.03, 0.03, 0.105, 7, x, 0.03, 0, PI / 2, 0, 0);
      const car = c.mesh();
      const banner = new Builder().box('#ffffff', 0.04, 0.3, 0.012, 0, -0.15, 0).box(GOLD, 0.04, 0.07, 0.014, 0, -0.26, 0).mesh(-0.46, 0.5, 0.26);
      b.cyl('#6b4423', 0.01, 0.01, 0.5, 4, -0.46, 0.25, 0.25);
      return {
        parts: [b.mesh(), car, banner],
        update(t) {
          const k = (t * 0.18) % 1;
          car.position.set(-0.5 + k, 0.02 + Math.abs(Math.sin(t * 9)) * 0.004, 0.42);
          car.scale.setScalar(Math.min(1, Math.min(k, 1 - k) * 8));
          banner.rotation.z = Math.sin(t * 2.2) * 0.2;
          banner.rotation.x = Math.sin(t * 1.6) * 0.15;
        },
      };
    },
  },
  {
    name: 'Bateau pour les Gili',
    sea: true,
    match: 'Route de Padang Bai',
    dx: 0.8,
    dz: 0.2,
    size: 0.2,
    height: 0.6,
    build() {
      const b = new Builder();
      // Balises du chenal de Padang Bai
      for (const [x, c] of [[-0.42, '#e03131'], [0.44, '#2f9e44']]) b.cyl(c, 0.03, 0.045, 0.1, 6, x, 0.05, -0.26).cone(c, 0.03, 0.08, 6, x, 0.14, -0.26);
      const boat = fastBoat().mesh();
      const wake = new Builder().ball('#ffffff', 0.07, 0, 0, 0.08).ball('#ffffff', 0.06, -0.1, 0, -0.08).ball('#e6fbff', 0.06, -0.18, 0, 0.03).ball('#ffffff', 0.04, -0.27, 0, -0.04).mesh();
      const gull = new Builder().box('#ffffff', 0.12, 0.014, 0.045, 0.25, 0, 0, 0, 0, 0.35).box('#ffffff', 0.12, 0.014, 0.045, 0.25, 0, 0, 0, 0, -0.35).mesh();
      return {
        parts: [b.mesh(), boat, wake, gull],
        update(t) {
          const k = (t * 0.14) % 1;
          const x = -0.4 + k * 0.8;
          const s = Math.min(1, Math.min(k, 1 - k) * 8);
          boat.position.set(x, 0.01 + Math.abs(Math.sin(t * 4)) * 0.02, 0.05);
          boat.rotation.z = 0.08 + Math.sin(t * 4) * 0.06;
          boat.scale.setScalar(s);
          wake.position.set(x - 0.42, 0.02, 0.05);
          wake.scale.setScalar(s * (0.8 + Math.sin(t * 7) * 0.25));
          gull.rotation.y = t * 0.9;
          gull.position.set(0, 0.45 + Math.sin(t * 1.4) * 0.04, 0);
        },
      };
    },
  },
];

// ---------- Amed ----------

const AMED = [
  {
    name: 'Épave du Liberty',
    sea: true,
    match: 'Épave du Liberty',
    dx: -0.5,
    dz: -0.46,
    size: 0.3,
    height: 0.75,
    build() {
      const b = new Builder();
      // Le cargo de 125 m couché tout près du rivage, brisé en deux, mangé par la rouille et le corail
      b.poly('#5fd4e6', [[-0.62, -0.22], [-0.2, -0.36], [0.4, -0.32], [0.64, -0.05], [0.5, 0.3], [0, 0.4], [-0.52, 0.28]], 0.02, 0, 0.04, 0, -PI / 2);
      const hull = [[-0.5, 0], [-0.42, -0.13], [0.3, -0.14], [0.54, -0.02], [0.3, 0.1], [-0.42, 0.12]];
      b.poly('#8a4f32', hull, 0.07, 0, 0.09, 0.02, -PI / 2);
      b.poly('#3d7f88', hull.map(([x, y]) => [x * 0.86, y * 0.7]), 0.03, 0, 0.14, 0.02, -PI / 2);
      b.box('#5fd4e6', 0.035, 0.12, 0.3, 0.12, 0.1, 0.03, 0, 0.25, 0); // la cassure
      b.box('#a8623c', 0.16, 0.07, 0.13, -0.16, 0.19, 0.03).cyl('#c98a52', 0.035, 0.035, 0.08, 6, -0.16, 0.26, 0.03);
      b.box('#6b3a24', 0.3, 0.02, 0.02, 0.3, 0.17, 0.02, 0, 0.2, 0.2).box('#6b3a24', 0.2, 0.02, 0.02, -0.34, 0.17, 0.02, 0, -0.3, 0);
      [['#ff8fab', -0.36, -0.08], ['#ffa94d', -0.02, 0.1], ['#b197fc', 0.22, 0.08], ['#ff8fab', 0.42, -0.02], ['#63e6be', 0.02, -0.1], ['#ffd43b', 0.3, -0.1]].forEach(([c, x, z]) => b.ball(c, 0.04, x, 0.17, z + 0.02, 1, 0.8, 1));
      const swimmer = snorkeler('#1c7ed6');
      const school = new Builder();
      for (let i = 0; i < 5; i++) fish(school, i % 2 ? '#ffd43b' : '#ff922b', i % 2 ? '#1d2b53' : '#ffffff', Math.cos(i * 1.26) * 0.4, 0, Math.sin(i * 1.26) * 0.24, 0.6);
      const fishes = school.mesh(0, 0.2, 0.04);
      const bubbles = [puff(0.025), puff(0.02)];
      return {
        parts: [b.mesh(), swimmer, fishes, ...bubbles],
        update(t) {
          const a = t * 0.5;
          swimmer.position.set(Math.cos(a) * 0.28, 0.36 + Math.sin(t * 2.2) * 0.012, 0.08 + Math.sin(a) * 0.16);
          swimmer.rotation.y = -a - PI / 2;
          fishes.rotation.y = t * 0.6;
          bubbles.forEach((p, i) => rise(p, (t * 0.5 + i / 2) % 1, -0.16 + i * 0.3, 0.26, 0.03, 0.22, 0.03, 1));
        },
      };
    },
  },
  {
    name: 'Baie de Jemeluk',
    sea: true,
    match: 'Snorkeling dans la baie de Jemeluk',
    dx: -0.06,
    dz: -0.24,
    size: 0.28,
    height: 0.65,
    build() {
      const b = new Builder();
      // Jardin de corail à quelques mètres du bord, petit temple immergé
      b.poly(LAGOON, [[-0.55, -0.2], [-0.1, -0.34], [0.42, -0.26], [0.56, 0.06], [0.3, 0.36], [-0.3, 0.38], [-0.56, 0.12]], 0.02, 0, 0.04, 0, -PI / 2);
      [['#ff8fab', -0.36, -0.1], ['#ffa94d', -0.2, 0.2], ['#b197fc', 0.3, 0.16], ['#63e6be', 0.36, -0.12], ['#ff6b9d', 0.06, 0.26], ['#ffd43b', -0.4, 0.12]].forEach(([c, x, z], i) =>
        b.ball(c, 0.06, x, 0.04, z, 1, 0.7, 1).cone(c, 0.025, 0.1, 4, x + 0.06, 0.06, z + 0.02, 0, 0, i % 2 ? 0.3 : -0.3),
      );
      b.box('#6f8f95', 0.14, 0.05, 0.12, 0.02, 0.035, -0.08).box('#6f8f95', 0.07, 0.07, 0.06, 0.02, 0.09, -0.08).pyr('#557a80', 0.08, 0.07, 0.02, 0.16, -0.08);
      const swimmer = snorkeler('#ff7b1c');
      const school = new Builder();
      fish(school, '#ff922b', '#ffffff', 0.3, 0, 0, 0.75);
      fish(school, '#ffd43b', '#1d2b53', -0.3, 0, 0.04, 0.75);
      fish(school, '#4dabf7', '#ffd43b', 0, 0, 0.3, 0.75);
      const fishes = school.mesh(0, 0.11, 0.02);
      const ring = new Builder().cyl('#ffffff', 0.2, 0.2, 0.008, 10, 0, 0, 0).cyl(LAGOON, 0.175, 0.175, 0.01, 10, 0, 0, 0).mesh();
      return {
        parts: [b.mesh(), swimmer, fishes, ring],
        update(t) {
          const a = t * 0.55;
          swimmer.position.set(Math.cos(a) * 0.22, 0.2 + Math.sin(t * 2.2) * 0.012, 0.04 + Math.sin(a) * 0.16);
          swimmer.rotation.y = -a - PI / 2;
          fishes.rotation.y = -t * 0.5;
          const k = (t * 0.5) % 1;
          ring.position.set(swimmer.position.x, 0.03, swimmer.position.z);
          ring.scale.set(0.6 + k * 1.2, 1, 0.6 + k * 1.2);
          ring.visible = k < 0.85;
        },
      };
    },
  },
  {
    name: "Salines d'Amed",
    match: "Salines d'Amed",
    dx: -0.3,
    dz: 0.06,
    size: 0.24,
    height: 0.75,
    build() {
      const b = new Builder();
      // Plage de sable gris : troncs de cocotier évidés où l'eau de mer s'évapore, cônes de bambou tressé qui la filtrent
      b.box('#8d8a86', 1.05, 0.06, 0.8, 0, 0.03, 0);
      for (let i = 0; i < 4; i++) {
        b.box('#8d5a2b', 0.6, 0.06, 0.09, -0.16, 0.09, -0.24 + i * 0.13);
        b.box('#ffffff', 0.54, 0.02, 0.055, -0.16, 0.115, -0.24 + i * 0.13);
      }
      for (const x of [0.28, 0.42]) {
        b.cone('#c9a352', 0.07, 0.2, 7, x, 0.28, -0.22, PI, 0, 0);
        for (let k = 0; k < 3; k++) b.cyl('#8d5a2b', 0.008, 0.008, 0.3, 4, x + Math.cos(k * 2.1) * 0.07, 0.2, -0.22 + Math.sin(k * 2.1) * 0.07);
      }
      b.cone('#ffffff', 0.09, 0.12, 7, 0.34, 0.12, 0.26).cone('#f1f3f5', 0.07, 0.09, 7, 0.46, 0.105, 0.18);
      b.box('#c9a352', 0.1, 0.07, 0.1, 0.2, 0.095, 0.3).box('#ffffff', 0.08, 0.02, 0.08, 0.2, 0.135, 0.3);
      // Le saunier porte l'eau de mer à la palanche
      const w = person(new Builder(), '#e8590c', '#f2d16b', 0, 0, 0, 0.85);
      w.box('#6b4423', 0.012, 0.012, 0.32, 0, 0.17, 0);
      for (const z of [-0.15, 0.15]) w.cyl('#495057', 0.03, 0.025, 0.06, 6, 0, 0.08, z).box('#6b4423', 0.006, 0.08, 0.006, 0, 0.13, z);
      const worker = w.mesh();
      const glints = new Builder().octa('#ffffff', 0.03, -0.3, 0, -0.24, 1, 1.6, 1).octa('#ffffff', 0.025, 0, 0, 0.02, 1, 1.6, 1).octa('#ffffff', 0.03, 0.34, 0.1, 0.26, 1, 1.6, 1).mesh(0, 0.17, 0);
      return {
        parts: [b.mesh(), worker, glints],
        update(t) {
          const u = ((t * 0.11) % 1) * 2;
          worker.position.set(-0.46 + (u < 1 ? u : 2 - u) * 0.9, 0.06 + Math.abs(Math.sin(t * 6)) * 0.012, 0.36);
          worker.rotation.z = Math.sin(t * 6) * 0.06;
          glints.scale.setScalar(0.5 + Math.abs(Math.sin(t * 3)) * 0.7);
          glints.rotation.y = t * 2;
        },
      };
    },
  },
  {
    name: 'Jukung à l’aube',
    sea: true,
    match: 'Sortie en pirogue',
    dx: 0.42,
    dz: -0.04,
    size: 0.28,
    height: 0.85,
    build() {
      // Les pêcheurs partent à l'aube pêcher le maquereau à la traîne
      const boats = [jukung('#ffffff', '#e03131'), jukung('#ffd43b', '#1c7ed6')].map((j, i) => {
        person(j, i ? '#2f9e44' : '#e8590c', '#f2d16b', -0.12, 0.05, 0, 0.6);
        return j.mesh();
      });
      const dawn = sun(0.15, '#ff6b35');
      const f = new Builder();
      fish(f, '#74c0fc', '#1c7ed6', 0, 0.16, 0, 0.9);
      const leaper = f.mesh();
      const pivot = group(leaper);
      pivot.position.set(0.1, 0, 0.34);
      const wavelets = new Builder().box('#ffffff', 0.14, 0.012, 0.02, -0.3, 0, 0.3).box('#ffffff', 0.1, 0.012, 0.02, 0.36, 0, 0.12).box('#ffffff', 0.12, 0.012, 0.02, 0.0, 0, -0.12).mesh(0, 0.012, 0);
      return {
        parts: [wavelets, dawn, ...boats, pivot],
        update(t) {
          dawn.position.set(0.3, 0.18 + Math.sin(t * 0.5) * 0.16, -0.4);
          dawn.rotation.z = t * 0.3;
          boats.forEach((m, i) => {
            m.position.set(-0.2 + i * 0.36 + Math.sin(t * 0.3 + i) * 0.08, 0.02 + Math.sin(t * 2 + i * 2) * 0.012, -0.08 + i * 0.26);
            m.rotation.z = Math.sin(t * 1.7 + i) * 0.1;
            m.rotation.x = Math.sin(t * 1.3 + i * 2) * 0.1;
          });
          const k = ((t * 0.5) % 1) * 2;
          leaper.visible = k < 1;
          pivot.rotation.z = PI / 2 - k * PI;
          wavelets.position.x = Math.sin(t * 0.8) * 0.05;
        },
      };
    },
  },
  {
    name: 'Coucher de soleil',
    match: 'Coucher de soleil à Jemeluk',
    dx: -0.32,
    dz: 0.48,
    size: 0.24,
    height: 0.95,
    build() {
      const b = new Builder();
      // Terrasse de café sur les hauteurs de la baie, face au cône de l'Agung
      b.box('#7cc45c', 1.0, 0.5, 0.8, 0, -0.17, 0);
      b.box('#a67c52', 0.8, 0.04, 0.4, 0.04, 0.1, 0.16);
      for (const x of [-0.32, 0.4]) for (const z of [0, 0.32]) b.box('#6b4423', 0.03, 0.12, 0.03, x, 0.05, z);
      b.cone('#6c5a9c', 0.34, 0.6, 6, -0.2, 0.38, -0.26);
      b.cone('#8a78b8', 0.12, 0.2, 6, -0.2, 0.6, -0.26);
      b.ball('#e03131', 0.06, -0.2, 0.15, 0.2, 1.2, 0.7, 1).ball('#1c7ed6', 0.06, 0.02, 0.15, 0.24, 1.2, 0.7, 1); // poufs
      person(b, '#ffd43b', null, -0.2, 0.17, 0.2, 0.7);
      person(b, '#e64980', null, 0.02, 0.17, 0.24, 0.7);
      b.box('#8d5a2b', 0.1, 0.07, 0.1, -0.09, 0.155, 0.3).cyl('#ff922b', 0.015, 0.012, 0.04, 6, -0.09, 0.21, 0.3);
      b.cyl('#ffffff', 0.008, 0.008, 0.36, 4, 0.3, 0.3, 0.16);
      const shade = new Builder().cone('#e8590c', 0.16, 0.08, 8, 0, 0, 0).mesh(0.3, 0.5, 0.16);
      const dusk = sun(0.13, '#ff6b35');
      const jb = jukung('#ffffff', null);
      const boat = jb.mesh();
      boat.scale.setScalar(0.4);
      return {
        parts: [b.mesh(), dusk, shade, boat],
        update(t) {
          // Le soleil descend à côté du cône, puis recommence
          const k = (t * 0.1) % 1;
          dusk.position.set(0.22, 0.66 - k * 0.5, -0.3);
          dusk.scale.setScalar(Math.min(1, Math.min(k, 1 - k) * 6));
          dusk.rotation.z = t * 0.3;
          shade.rotation.z = Math.sin(t * 1.6) * 0.1;
          boat.position.set(0.36 + Math.sin(t * 0.4) * 0.05, 0.1 + Math.abs(Math.sin(t * 1.5)) * 0.01, -0.06);
          boat.rotation.z = Math.sin(t * 1.5) * 0.1;
        },
      };
    },
  },
  {
    name: 'Lipah',
    sea: true,
    match: "Lipah et l'épave de Banyuning",
    dx: 0.14,
    dz: 0.44,
    size: 0.26,
    height: 0.65,
    build() {
      const b = new Builder();
      // Récif devant la plage de sable gris, petite épave japonaise, tortues et poissons-perroquets
      b.poly(LAGOON, [[-0.5, -0.24], [0.1, -0.34], [0.5, -0.18], [0.54, 0.16], [0.2, 0.36], [-0.36, 0.32], [-0.56, 0.06]], 0.02, 0, 0.04, 0, -PI / 2);
      b.poly('#9a9792', [[-0.56, 0.06], [-0.5, -0.24], [-0.3, -0.3], [-0.36, 0], [-0.4, 0.2]], 0.05, 0, 0.025, 0, -PI / 2);
      b.box('#6f8f95', 0.34, 0.03, 0.1, 0.22, 0.03, -0.12, 0, 0.3, 0);
      for (let i = 0; i < 4; i++) b.box('#557a80', 0.02, 0.1, 0.12, 0.1 + i * 0.08, 0.07, -0.1 - i * 0.025, 0, 0.3, 0);
      b.ball('#ff8fab', 0.045, 0.2, 0.06, -0.06, 1, 0.8, 1).ball('#ffa94d', 0.04, 0.34, 0.06, -0.16, 1, 0.8, 1).ball('#b197fc', 0.05, 0.36, 0.04, 0.14, 1, 0.7, 1).ball('#63e6be', 0.045, -0.14, 0.04, 0.24, 1, 0.7, 1);
      const turtle = createModel('turtle');
      turtle.object.scale.setScalar(0.62);
      turtle.object.position.set(0.02, 0.03, 0.1);
      const p = new Builder();
      fish(p, '#20c997', '#4dabf7', 0.3, 0, 0, 0.9);
      fish(p, '#4dabf7', '#f783ac', -0.3, 0, 0, 0.8);
      const parrots = p.mesh(0.1, 0.1, 0.02);
      return {
        parts: [b.mesh(), turtle.object, parrots],
        update(t) {
          turtle.update(t);
          parrots.rotation.y = t * 0.45;
        },
      };
    },
  },
];

// ---------- Pemuteran et Menjangan ----------

// Cerf rusa : corps (renvoyé) et tête séparée, museau vers +x.
function deer() {
  const body = new Builder();
  body.ball('#a9713f', 0.11, 0, 0.26, 0, 1.6, 0.9, 0.8, 1);
  for (const x of [-0.11, 0.11]) for (const z of [-0.04, 0.04]) body.box('#8a5a30', 0.03, 0.2, 0.03, x, 0.1, z);
  body.box('#a9713f', 0.07, 0.18, 0.07, 0.17, 0.36, 0, 0, 0, -0.5);
  body.ball('#f1e3c4', 0.03, -0.18, 0.28, 0);
  const head = new Builder();
  head.box('#a9713f', 0.13, 0.07, 0.07, 0.04, 0, 0);
  head.box('#3b2412', 0.03, 0.03, 0.05, 0.11, -0.005, 0);
  for (const z of [-0.035, 0.035]) {
    head.box('#a9713f', 0.03, 0.05, 0.02, -0.02, 0.05, z * 1.4);
    head.box('#d9c8a0', 0.014, 0.16, 0.014, 0, 0.11, z, z > 0 ? 0.3 : -0.3, 0, 0.2);
    head.box('#d9c8a0', 0.012, 0.08, 0.012, 0.03, 0.14, z * 1.8, 0, 0, -0.7);
  }
  return { body: body.mesh(), head: head.mesh(0.22, 0.45, 0) };
}

const MENJANGAN = [
  {
    name: 'Cerfs de Menjangan',
    sea: true,
    match: 'Cerfs et temples',
    dx: -0.3,
    dz: -0.4,
    size: 0.24,
    height: 0.8,
    build() {
      const b = new Builder();
      // L'île : un banc de sable, une butte de savane, la grande statue blanche de Ganesh tournée vers le large
      b.poly(SAND, [[-0.56, -0.1], [-0.2, -0.3], [0.36, -0.28], [0.58, -0.02], [0.4, 0.3], [-0.2, 0.36], [-0.54, 0.16]], 0.05, 0, 0.025, 0, -PI / 2);
      b.poly('#a8c66c', [[-0.44, -0.08], [-0.16, -0.22], [0.3, -0.2], [0.44, -0.02], [0.2, 0.08], [-0.3, 0.1]], 0.1, 0, 0.07, -0.02, -PI / 2);
      b.ball('#74b84a', 0.09, -0.3, 0.17, -0.1, 1.2, 0.8, 1).ball('#8fbf5a', 0.07, 0.1, 0.16, -0.16, 1.2, 0.8, 1);
      b.box('#e9ecef', 0.16, 0.08, 0.14, 0.34, 0.16, -0.06);
      b.ball('#ffffff', 0.09, 0.34, 0.28, -0.06, 1, 1.1, 0.9).ball('#ffffff', 0.065, 0.34, 0.42, -0.05);
      b.cyl('#ffffff', 0.015, 0.02, 0.12, 5, 0.34, 0.36, 0.01, 0.3, 0, 0);
      b.box('#ffffff', 0.05, 0.07, 0.012, 0.27, 0.43, -0.05).box('#ffffff', 0.05, 0.07, 0.012, 0.41, 0.43, -0.05);
      b.cone(GOLD, 0.035, 0.06, 5, 0.34, 0.51, -0.05);
      splitGate(b, -0.08, 0.12, -0.12, 0.4, BRICK);
      const d = deer();
      const stag = group(d.body, d.head);
      stag.scale.setScalar(0.8);
      // Un second cerf traverse à la nage : seule la tête dépasse
      const sw = deer();
      const swimming = sw.head;
      swimming.scale.setScalar(0.8);
      const ripple = new Builder().cyl('#ffffff', 0.08, 0.08, 0.008, 8, 0, 0, 0).mesh();
      return {
        parts: [b.mesh(), stag, swimming, ripple],
        update(t) {
          const u = ((t * 0.09) % 1) * 2;
          const k = u < 1 ? u : 2 - u;
          stag.position.set(-0.3 + k * 0.5, 0.05 + Math.abs(Math.sin(t * 7)) * 0.01, 0.2);
          stag.rotation.y = u < 1 ? 0 : PI;
          d.head.rotation.z = -0.5 + Math.sin(t * 1.2) * 0.5; // broute, relève la tête
          const s = (t * 0.06) % 1;
          swimming.position.set(0.62 - s * 0.5, 0.04 + Math.sin(t * 3) * 0.01, 0.42);
          swimming.rotation.y = PI;
          ripple.position.set(swimming.position.x + 0.03, 0.012, 0.42);
          ripple.scale.setScalar(0.7 + Math.abs(Math.sin(t * 2.5)) * 0.8);
        },
      };
    },
  },
  {
    name: 'Récif de Menjangan',
    sea: true,
    match: 'Snorkeling à Menjangan',
    dx: 0.22,
    dz: -0.42,
    size: 0.22,
    height: 0.6,
    build() {
      const b = new Builder();
      // Le récif frangeant : un platier clair puis le tombant bleu sombre, et le bateau qui attend
      b.poly('#1a7fb0', [[-0.5, 0.0], [-0.56, 0.22], [-0.2, 0.36], [0.3, 0.34], [0.58, 0.16], [0.52, -0.02], [0.2, 0.06], [-0.2, 0.04]], 0.02, 0, 0.04, 0, -PI / 2);
      b.poly(LAGOON, [[-0.5, 0.0], [-0.2, 0.04], [0.2, 0.06], [0.52, -0.02], [0.56, -0.24], [0.2, -0.4], [-0.3, -0.38], [-0.58, -0.2]], 0.02, 0, 0.045, 0, -PI / 2);
      const corals = ['#ff8fab', '#ffa94d', '#b197fc', '#63e6be', '#ff6b9d', '#ffd43b', '#f783ac', '#74c0fc'];
      corals.forEach((c, i) => {
        const x = -0.48 + i * 0.135;
        const z = 0.12 + (i % 3) * 0.1;
        b.ball(c, 0.05, x, 0.04, z, 1, 0.8, 1);
        if (i % 2) b.cone(c, 0.03, 0.12, 4, x + 0.05, 0.07, z + 0.04);
      });
      // Bateau de bois à auvent, venu de Labuhan Lalang
      const bt = new Builder();
      bt.poly('#8d5a2b', [[-0.2, 0.08], [0.24, 0.1], [0.16, 0], [-0.16, 0]], 0.12);
      bt.box('#ffffff', 0.4, 0.02, 0.125, 0.01, 0.07, 0);
      for (const x of [-0.12, 0.1]) bt.box('#6b4423', 0.012, 0.12, 0.012, x, 0.14, 0.05).box('#6b4423', 0.012, 0.12, 0.012, x, 0.14, -0.05);
      bt.box('#1c7ed6', 0.3, 0.02, 0.14, -0.01, 0.2, 0);
      person(bt, '#e8590c', '#f2d16b', -0.14, 0.08, 0, 0.55);
      const boat = bt.mesh(0.28, 0.01, -0.16);
      const swimmers = [snorkeler('#e64980'), snorkeler('#ffd43b')];
      const school = new Builder();
      for (let i = 0; i < 4; i++) fish(school, i % 2 ? '#ffd43b' : '#ff922b', i % 2 ? '#1d2b53' : '#ffffff', Math.cos(i * 1.57) * 0.16, 0, Math.sin(i * 1.57) * 0.1, 0.6);
      const fishes = school.mesh(0.3, 0.12, 0.22);
      return {
        parts: [b.mesh(), boat, ...swimmers, fishes],
        update(t) {
          boat.rotation.z = Math.sin(t * 1.5) * 0.08;
          boat.position.y = 0.012 + Math.sin(t * 1.9) * 0.01;
          swimmers.forEach((s, i) => {
            const a = t * 0.45 + i * 2.6;
            s.position.set(-0.2 + Math.cos(a) * 0.22, 0.2 + Math.sin(t * 2.2 + i) * 0.012, 0.2 + Math.sin(a) * 0.11);
            s.rotation.y = -a - PI / 2;
          });
          fishes.rotation.y = t * 0.7;
        },
      };
    },
  },
  {
    name: 'Récif restauré',
    sea: true,
    match: 'Récif restauré de Pemuteran',
    dx: 0.56,
    dz: 0.02,
    size: 0.22,
    height: 0.7,
    build() {
      const b = new Builder();
      // Structures métalliques immergées où le corail repousse, statue au milieu
      b.poly(LAGOON, [[-0.52, -0.22], [0, -0.34], [0.5, -0.2], [0.54, 0.16], [0.1, 0.36], [-0.42, 0.28]], 0.02, 0, 0.04, 0, -PI / 2);
      const dome = (x, z, r, tint) => {
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * PI;
          for (let k = 0; k < 5; k++) {
            const u = (k + 0.5) / 5;
            const ang = u * PI;
            b.box('#495057', (r * PI) / 5 + 0.01, 0.014, 0.014, x + Math.cos(ang) * r * Math.cos(a), 0.03 + Math.sin(ang) * r, z + Math.cos(ang) * r * Math.sin(a), 0, -a, ang + PI / 2);
          }
        }
        tint.forEach((c, i) => {
          const a = i * 1.9;
          b.ball(c, 0.035, x + Math.cos(a) * r * 0.8, 0.05 + (i % 3) * r * 0.3, z + Math.sin(a) * r * 0.8, 1, 0.8, 1);
        });
      };
      dome(-0.24, -0.02, 0.2, ['#ff8fab', '#ffa94d', '#b197fc', '#63e6be', '#ff6b9d']);
      dome(0.28, 0.1, 0.15, ['#ffd43b', '#f783ac', '#74c0fc', '#ff8fab']);
      b.box('#8a8f98', 0.09, 0.05, 0.09, 0.02, 0.035, 0.18);
      b.ball('#aeb4bc', 0.05, 0.02, 0.11, 0.18, 1, 1.2, 0.9).ball('#aeb4bc', 0.035, 0.02, 0.2, 0.18).cone('#aeb4bc', 0.02, 0.05, 5, 0.02, 0.25, 0.18);
      const school = new Builder();
      for (let i = 0; i < 5; i++) fish(school, ['#ff922b', '#ffd43b', '#4dabf7', '#f783ac', '#20c997'][i], i % 2 ? '#1d2b53' : '#ffffff', Math.cos(i * 1.26) * 0.3, (i % 2) * 0.05, Math.sin(i * 1.26) * 0.2, 0.65);
      const fishes = school.mesh(-0.1, 0.16, 0.04);
      const swimmer = snorkeler('#2f9e44');
      const fan = new Builder().poly('#e64980', [[0, 0], [-0.07, 0.13], [0, 0.17], [0.07, 0.13]], 0.012).mesh(0.42, 0.03, -0.1);
      return {
        parts: [b.mesh(), fishes, swimmer, fan],
        update(t) {
          fishes.rotation.y = t * 0.6;
          const a = -t * 0.4;
          swimmer.position.set(Math.cos(a) * 0.3, 0.3 + Math.sin(t * 2.2) * 0.012, 0.06 + Math.sin(a) * 0.18);
          swimmer.rotation.y = -a + PI / 2;
          fan.rotation.z = Math.sin(t * 1.4) * 0.25;
        },
      };
    },
  },
  {
    name: 'Plage au couchant',
    sea: true,
    match: 'Fin de journée sur la plage',
    dx: 0.08,
    dz: 0.02,
    size: 0.2,
    height: 0.75,
    build() {
      const b = new Builder();
      // Sable noir, mer plate, le soleil qui descend derrière les volcans de Java
      b.box('#4a4744', 1.05, 0.06, 0.4, 0, 0.03, 0.2);
      b.box(LAGOON, 1.05, 0.02, 0.3, 0, 0.012, -0.14);
      for (const [x, h, c] of [[-0.36, 0.4, '#6c5a9c'], [-0.1, 0.52, '#7c6ab0'], [0.18, 0.34, '#6c5a9c']]) b.cone(c, 0.2, h, 6, x, h / 2, -0.4);
      const jb = jukung('#ffffff', null);
      jb.box('#1c7ed6', 0.3, 0.02, 0.08, 0, 0.03, 0);
      const boat = jb.mesh(-0.26, 0.07, 0.22);
      boat.scale.setScalar(0.75);
      boat.rotation.y = 0.5;
      person(b, '#e64980', null, 0.22, 0.06, 0.26, 0.75);
      person(b, '#ffd43b', null, 0.33, 0.06, 0.28, 0.75);
      const dusk = sun(0.13, '#ff6b35');
      const wave = new Builder().box('#ffffff', 1.0, 0.012, 0.03, 0, 0, 0).mesh();
      const bird = new Builder().box('#ffffff', 0.1, 0.012, 0.04, 0.3, 0, 0, 0, 0, 0.35).box('#ffffff', 0.1, 0.012, 0.04, 0.3, 0, 0, 0, 0, -0.35).mesh();
      return {
        parts: [b.mesh(), boat, dusk, wave, bird],
        update(t) {
          const k = (t * 0.1) % 1;
          dusk.position.set(0.36, 0.6 - k * 0.46, -0.42);
          dusk.scale.setScalar(Math.min(1, Math.min(k, 1 - k) * 6));
          dusk.rotation.z = t * 0.3;
          wave.position.set(0, 0.03, -0.02 + Math.sin(t * 1.2) * 0.03);
          wave.scale.z = 1 + Math.sin(t * 1.2) * 0.5;
          bird.rotation.y = t * 0.8;
          bird.position.set(0, 0.5 + Math.sin(t * 1.5) * 0.03, 0);
        },
      };
    },
  },
  {
    name: 'Parc de Bali Barat',
    match: 'Marche dans le parc',
    dx: -0.2,
    dz: 0.46,
    size: 0.22,
    height: 0.95,
    build() {
      const b = new Builder();
      // Forêt sèche de mousson, sentier, et l'étourneau de Bali : tout blanc, le tour de l'œil bleu
      b.box('#d9c8a0', 1.0, 0.014, 0.12, 0, 0.007, 0.3, 0, 0.15, 0);
      for (const [x, z, h, c] of [[-0.36, -0.2, 0.5, '#a9c94f'], [0.3, -0.24, 0.6, '#74b84a'], [-0.02, -0.3, 0.42, '#c0d860'], [0.44, 0.06, 0.36, '#8fbf5a']]) {
        b.cyl('#7a5a3a', 0.025, 0.04, h, 5, x, h / 2, z);
        b.ball(c, 0.17, x, h + 0.06, z, 1.2, 0.7, 1.1);
        b.cyl('#7a5a3a', 0.015, 0.02, 0.2, 4, x + 0.08, h * 0.75, z, 0, 0, -0.9);
      }
      // Étourneau perché, bien visible
      b.ball('#ffffff', 0.05, -0.2, 0.5, -0.18, 1.2, 1, 0.9).ball('#ffffff', 0.035, -0.15, 0.56, -0.18).ball('#339af0', 0.016, -0.135, 0.565, -0.15);
      b.cone('#ffd43b', 0.012, 0.04, 4, -0.11, 0.555, -0.18, 0, 0, -PI / 2).box('#1a1a1a', 0.04, 0.012, 0.03, -0.26, 0.48, -0.18);
      b.cone('#ffffff', 0.02, 0.08, 4, -0.16, 0.62, -0.18, 0, 0, 0.5);
      // Langur noir assis sur une branche
      b.ball('#2b2b2b', 0.06, 0.42, 0.52, -0.22, 1, 1.15, 0.9).ball('#2b2b2b', 0.04, 0.42, 0.62, -0.21).cyl('#2b2b2b', 0.01, 0.01, 0.22, 4, 0.46, 0.4, -0.24);
      const flyer = new Builder();
      flyer.ball('#ffffff', 0.04, 0, 0, 0, 1.5, 0.9, 0.9).ball('#339af0', 0.014, 0.05, 0.015, 0.02).cone('#ffd43b', 0.01, 0.035, 4, 0.08, 0, 0, 0, 0, -PI / 2);
      flyer.box('#1a1a1a', 0.03, 0.01, 0.03, -0.08, 0, 0);
      const wing = (side) => new Builder().box('#ffffff', 0.06, 0.01, 0.11, 0, 0, 0.055 * side).box('#1a1a1a', 0.06, 0.012, 0.03, 0, 0, 0.12 * side).mesh();
      const wings = [wing(1), wing(-1)];
      const starling = group(flyer.mesh(), ...wings);
      const walkers = new Builder();
      person(walkers, '#5c7c3a', '#8a7a4a', 0, 0, 0, 0.8); // le guide du parc
      person(walkers, '#e03131', null, -0.11, 0, 0.02, 0.75);
      person(walkers, '#1c7ed6', null, -0.21, 0, -0.01, 0.75);
      const trek = walkers.mesh();
      return {
        parts: [b.mesh(), starling, trek],
        update(t) {
          const a = t * 0.9;
          starling.position.set(0.05 + Math.cos(a) * 0.32, 0.8 + Math.sin(t * 1.3) * 0.05, -0.1 + Math.sin(a) * 0.2);
          starling.rotation.y = -a - PI / 2;
          const flap = Math.sin(t * 14) * 0.7;
          wings[0].rotation.x = flap;
          wings[1].rotation.x = -flap;
          const u = ((t * 0.08) % 1) * 2;
          trek.position.set(-0.3 + (u < 1 ? u : 2 - u) * 0.66, 0.014 + Math.abs(Math.sin(t * 6)) * 0.012, 0.3);
          trek.rotation.y = u < 1 ? 0 : PI;
        },
      };
    },
  },
  {
    name: 'Temple de Pulaki',
    match: 'Temple de Pulaki',
    dx: 0.56,
    dz: 0.5,
    size: 0.22,
    height: 1.0,
    build() {
      const b = new Builder();
      // Temple de pierre noire adossé à la falaise, face à la mer, gardé par des macaques
      b.box('#8a7f72', 1.0, 0.6, 0.24, 0, 0.3, -0.34);
      b.box('#9d9285', 0.3, 0.42, 0.2, -0.38, 0.21, -0.16).box('#766c61', 0.26, 0.5, 0.2, 0.4, 0.25, -0.18);
      b.ball('#74b84a', 0.14, -0.2, 0.64, -0.34, 1.4, 0.6, 1).ball('#8fbf5a', 0.12, 0.26, 0.64, -0.34, 1.3, 0.6, 1);
      b.box('#3b3b40', 0.8, 0.1, 0.5, 0, 0.05, 0.08);
      b.box('#d8d8cc', 0.18, 0.02, 0.2, 0, 0.06, 0.4, 0.5, 0, 0);
      splitGate(b, 0, 0.1, 0.24, 0.6, '#2b2b30', 0.1);
      meru(b, -0.2, 0.1, -0.08, 5, 0.6);
      meru(b, 0.2, 0.1, -0.08, 3, 0.6);
      b.box('#2b2b30', 0.26, 0.14, 0.05, -0.3, 0.17, 0.28).box('#2b2b30', 0.26, 0.14, 0.05, 0.3, 0.17, 0.28);
      b.box(GOLD, 0.26, 0.02, 0.055, -0.3, 0.25, 0.28).box(GOLD, 0.26, 0.02, 0.055, 0.3, 0.25, 0.28);
      const monkeys = [macaque().mesh(), macaque().mesh(), macaque().mesh(0.4, 0.5, -0.18)];
      const shade = tedung(GOLD);
      shade.position.set(0, 0.1, -0.02);
      return {
        parts: [b.mesh(), ...monkeys, shade],
        update(t) {
          monkeys[0].position.set(-0.3 + Math.sin(t * 0.8) * 0.1, 0.26 + Math.abs(Math.sin(t * 5)) * 0.06, 0.28);
          monkeys[1].position.set(0.3, 0.26 + Math.max(0, Math.sin(t * 2.2)) ** 2 * 0.1, 0.28);
          monkeys[1].rotation.y = Math.sin(t * 1.1) * 0.8;
          monkeys[2].rotation.y = Math.sin(t * 0.9 + 1) * 0.9;
          shade.rotation.z = Math.sin(t * 1.5) * 0.1;
        },
      };
    },
  },
];

// ---------- Sud de Bali : Uluwatu ----------

const ULUWATU = [
  {
    name: "Temple d'Uluwatu",
    sea: true,
    match: "Temple d'Uluwatu",
    dx: 0.28,
    dz: -0.1,
    size: 0.28,
    height: 1.3,
    build() {
      const b = new Builder();
      // Falaise de 70 m au-dessus de l'océan, le petit temple tout au bord
      b.poly(CLIFF, [[-0.4, 0], [0.42, 0], [0.42, 0.62], [0.2, 0.66], [-0.05, 0.6], [-0.26, 0.66], [-0.36, 0.5], [-0.3, 0.2]], 0.5, 0, 0, -0.12);
      b.poly('#d1c5a8', [[-0.4, 0], [0.1, 0], [0.06, 0.3], [-0.16, 0.42], [-0.34, 0.3]], 0.2, 0.02, 0, 0.18);
      b.box('#c9bc9c', 0.84, 0.03, 0.52, 0.02, 0.2, -0.12).box('#c9bc9c', 0.84, 0.03, 0.52, 0.02, 0.4, -0.12); // strates
      b.box('#8fd36a', 0.6, 0.03, 0.44, 0.12, 0.655, -0.12);
      meru(b, -0.18, 0.66, -0.1, 3, 0.7);
      splitGate(b, 0.14, 0.67, 0.0, 0.5, '#8a8f98');
      b.box('#8a8f98', 0.4, 0.06, 0.03, 0.22, 0.7, 0.1); // muret du chemin de ronde
      b.ball('#2f9e44', 0.1, 0.34, 0.74, -0.24, 1.2, 0.8, 1);
      const foam = new Builder().ball('#ffffff', 0.09, -0.3, 0, 0.3).ball('#ffffff', 0.1, -0.08, 0, 0.36).ball('#e6fbff', 0.09, 0.16, 0, 0.3).ball('#ffffff', 0.08, -0.46, 0, 0.1).mesh(0, 0.03, 0);
      const spray = puff(0.06);
      // Le macaque du muret, qui a volé une paire de lunettes
      const thief = macaque();
      thief.box('#1a1a1a', 0.09, 0.02, 0.012, 0.09, 0.14, 0.05);
      const monkey = thief.mesh();
      const shade = tedung('#ffffff');
      shade.position.set(-0.02, 0.67, 0.02);
      return {
        parts: [b.mesh(), foam, spray, monkey, shade],
        update(t) {
          foam.scale.set(1 + Math.sin(t * 2) * 0.08, 0.7 + Math.abs(Math.sin(t * 2)) * 0.8, 1 + Math.sin(t * 2) * 0.1);
          rise(spray, (t * 0.32) % 1, -0.24, 0.05, 0.34, 0.4, 0.04, 1.5);
          monkey.position.set(0.22 + Math.sin(t * 0.9) * 0.14, 0.73 + Math.abs(Math.sin(t * 5)) * 0.05, 0.1);
          shade.rotation.z = Math.sin(t * 1.6) * 0.1;
        },
      };
    },
  },
  {
    name: 'Danse kecak',
    match: 'Danse kecak',
    dx: 0.66,
    dz: -0.28,
    size: 0.26,
    height: 0.8,
    build() {
      const b = new Builder();
      // Amphithéâtre de pierre : des dizaines d'hommes assis en cercle scandent « tchak tchak » autour du feu
      b.cyl('#cfc4a8', 0.56, 0.56, 0.04, 12, 0, 0.02, 0);
      b.cyl('#8a7f72', 0.34, 0.34, 0.045, 12, 0, 0.025, 0);
      for (let i = 0; i < 7; i++) {
        const a = PI + (i / 6) * PI;
        b.box('#b8ad92', 0.26, 0.12, 0.1, Math.cos(a) * 0.5, 0.06, Math.sin(a) * 0.5, 0, -a + PI / 2, 0);
        b.box('#a69b80', 0.26, 0.22, 0.08, Math.cos(a) * 0.59, 0.11, Math.sin(a) * 0.59, 0, -a + PI / 2, 0);
      }
      b.cyl('#343a40', 0.012, 0.012, 0.3, 4, 0, 0.19, 0).cyl('#343a40', 0.05, 0.03, 0.03, 6, 0, 0.34, 0);
      // Le chœur : torse nu, sarong à damier, en deux groupes qui lèvent les bras tour à tour
      const ring = (odd) => {
        const g = new Builder();
        for (let i = 0; i < 12; i++) {
          if (i % 2 !== odd) continue;
          const a = (i / 12) * PI * 2;
          const x = Math.cos(a) * 0.22;
          const z = Math.sin(a) * 0.22;
          g.cyl('#1a1a1a', 0.035, 0.05, 0.05, 6, x, 0.025, z).cyl('#ffffff', 0.036, 0.04, 0.02, 6, x, 0.05, z);
          g.cyl(SKIN, 0.03, 0.035, 0.08, 6, x, 0.1, z).ball(SKIN, 0.035, x, 0.17, z);
          g.box(SKIN, 0.016, 0.1, 0.016, x - 0.03, 0.2, z, 0, 0, 0.3).box(SKIN, 0.016, 0.1, 0.016, x + 0.03, 0.2, z, 0, 0, -0.3);
          g.box('#e03131', 0.02, 0.02, 0.02, x, 0.2, z + 0.02);
        }
        return g.mesh(0, 0.045, 0);
      };
      const choirs = [ring(0), ring(1)];
      const flame = new Builder().cone('#ff922b', 0.05, 0.14, 6, 0, 0.07, 0).cone('#ffd43b', 0.03, 0.09, 5, 0, 0.05, 0).mesh(0, 0.35, 0);
      // Hanuman, le singe blanc, danse au milieu
      const h = new Builder();
      h.cyl('#ffffff', 0.04, 0.05, 0.14, 6, 0, 0.07, 0).ball('#ffffff', 0.045, 0, 0.19, 0).cone(GOLD, 0.04, 0.06, 6, 0, 0.25, 0);
      h.box('#ffffff', 0.16, 0.022, 0.022, 0.08, 0.15, 0, 0, 0, 0.7).box('#ffffff', 0.16, 0.022, 0.022, -0.08, 0.12, 0, 0, 0, 0.4);
      h.cyl('#ffffff', 0.01, 0.01, 0.16, 4, 0, 0.1, -0.08, -0.8, 0, 0).box('#e03131', 0.09, 0.03, 0.09, 0, 0.06, 0);
      const hanuman = h.mesh();
      // La presqu'île est presque au niveau de la mer sur la carte : une butte garde l'amphithéâtre au sec.
      return raised({
        parts: [b.mesh(), ...choirs, flame, hanuman],
        update(t) {
          const beat = Math.sin(t * 6);
          choirs[0].scale.y = 1 + Math.max(0, beat) * 0.28;
          choirs[1].scale.y = 1 + Math.max(0, -beat) * 0.28;
          choirs[0].rotation.y = Math.sin(t * 1.5) * 0.06;
          choirs[1].rotation.y = -Math.sin(t * 1.5) * 0.06;
          flame.scale.set(1 + Math.sin(t * 9) * 0.15, 1 + Math.sin(t * 7) * 0.25, 1 + Math.cos(t * 9) * 0.15);
          flame.rotation.y = t * 3;
          const a = t * 1.1;
          hanuman.position.set(Math.cos(a) * 0.1, 0.05 + Math.abs(Math.sin(t * 4)) * 0.04, Math.sin(a) * 0.1);
          hanuman.rotation.y = -a * 2;
        },
      }, 0.2, '#e8dcb8', 0.6, 0.7);
    },
  },
  {
    name: 'Vague d’Uluwatu',
    sea: true,
    match: 'Plage de Suluban',
    dx: -0.2,
    dz: -0.2,
    size: 0.3,
    height: 0.95,
    build() {
      // La gauche d'Uluwatu, qui casse sur le récif. Les surfeurs y descendent par la grotte de Suluban.
      const wave = createModel('surf');
      wave.object.position.set(-0.12, 0, 0.1);
      wave.object.scale.setScalar(0.9);
      const b = new Builder();
      b.box(CLIFF, 0.3, 0.5, 0.26, 0.42, 0.25, -0.4).box(CLIFF, 0.26, 0.5, 0.26, 0.04, 0.25, -0.4);
      b.box(CLIFF, 0.68, 0.14, 0.26, 0.23, 0.5, -0.4);
      b.box('#3b3632', 0.14, 0.3, 0.02, 0.22, 0.15, -0.28); // l'entrée de la grotte
      b.box('#8fd36a', 0.68, 0.03, 0.26, 0.23, 0.585, -0.4);
      b.box('#8d5a2b', 0.26, 0.12, 0.16, 0.36, 0.66, -0.4).pyr('#c49a4a', 0.2, 0.12, 0.36, 0.78, -0.4); // café de Blue Point
      b.poly(SAND, [[-0.2, -0.1], [0.2, -0.1], [0.14, 0.06], [-0.14, 0.06]], 0.04, 0.22, 0.03, -0.24, -PI / 2);
      const p = new Builder();
      p.box('#ffd43b', 0.36, 0.025, 0.1, 0, 0, 0).box('#1c7ed6', 0.2, 0.05, 0.08, -0.02, 0.035, 0).ball(SKIN, 0.045, 0.12, 0.06, 0);
      p.box(SKIN, 0.03, 0.03, 0.16, 0.06, 0.02, 0.1).box(SKIN, 0.03, 0.03, 0.16, 0.06, 0.02, -0.1);
      const paddler = p.mesh();
      return {
        parts: [b.mesh(), wave.object, paddler],
        update(t) {
          wave.update(t);
          // Un surfeur sort de la grotte et rame vers la vague
          const k = (t * 0.1) % 1;
          paddler.position.set(0.22 - k * 0.1, 0.03 + Math.sin(t * 2.4) * 0.012, -0.16 + k * 0.6);
          paddler.rotation.y = -PI / 2;
          paddler.rotation.z = Math.sin(t * 2.4) * 0.08;
          paddler.scale.setScalar(Math.min(1, Math.min(k, 1 - k) * 8));
        },
      };
    },
  },
  {
    name: 'Padang Padang',
    sea: true,
    match: 'Plage de Padang Padang',
    dx: 0.08,
    dz: -0.62,
    size: 0.28,
    height: 0.85,
    build() {
      const b = new Builder();
      // Crique de sable clair : on y descend par un escalier coincé dans une faille entre deux rochers
      b.poly(SAND, [[-0.5, -0.1], [0.5, -0.1], [0.52, 0.22], [0.2, 0.36], [-0.24, 0.34], [-0.52, 0.2]], 0.05, 0, 0.025, 0.14, -PI / 2);
      b.poly(LAGOON, [[-0.56, 0.0], [0.56, 0.0], [0.46, -0.24], [0, -0.32], [-0.46, -0.24]], 0.02, 0, 0.04, 0.2, -PI / 2);
      b.box(CLIFF, 0.46, 0.56, 0.3, -0.3, 0.28, -0.24);
      b.box(CLIFF, 0.46, 0.5, 0.3, 0.3, 0.25, -0.24);
      b.box('#d1c5a8', 0.3, 0.3, 0.2, -0.44, 0.15, -0.02).box('#d1c5a8', 0.22, 0.24, 0.2, 0.46, 0.12, -0.04);
      b.ball('#2f9e44', 0.13, -0.3, 0.6, -0.24, 1.4, 0.7, 1).ball('#40c057', 0.12, 0.32, 0.54, -0.24, 1.4, 0.7, 1);
      b.box('#a89d84', 0.13, 0.03, 0.5, 0, 0.26, -0.2, 0.85, 0, 0); // l'escalier dans la faille
      b.box('#8a7f72', 0.14, 0.02, 0.3, 0, 0.012, -0.25);
      b.cyl('#ffffff', 0.008, 0.008, 0.26, 4, -0.26, 0.18, 0.2).cone('#e03131', 0.13, 0.07, 8, -0.26, 0.33, 0.2);
      b.box('#4dabf7', 0.16, 0.02, 0.08, -0.18, 0.06, 0.28);
      b.cyl('#ffffff', 0.008, 0.008, 0.26, 4, 0.3, 0.18, 0.24).cone('#ffd43b', 0.13, 0.07, 8, 0.3, 0.33, 0.24);
      const walker = person(new Builder(), '#e64980', null, 0, 0, 0, 0.7).mesh();
      const sw = new Builder().ball(SKIN, 0.045, 0, 0.03, 0).box('#1c7ed6', 0.09, 0.03, 0.07, -0.07, 0.01, 0).box(SKIN, 0.03, 0.03, 0.2, 0, 0.015, 0).mesh();
      const wave = new Builder().box('#ffffff', 0.8, 0.012, 0.03, 0, 0, 0).mesh();
      // Débutant sur sa planche en mousse
      const lb = new Builder().box('#74c0fc', 0.3, 0.025, 0.1, 0, 0, 0);
      person(lb, '#ff922b', null, 0, 0.012, 0, 0.6);
      const learner = lb.mesh();
      return {
        parts: [b.mesh(), walker, sw, wave, learner],
        update(t) {
          const k = (t * 0.14) % 1;
          walker.position.set(0, 0.44 - k * 0.4 + Math.abs(Math.sin(t * 7)) * 0.01, -0.38 + k * 0.5);
          walker.scale.setScalar(Math.min(1, Math.min(k, 1 - k) * 8));
          sw.position.set(-0.2 + Math.sin(t * 0.6) * 0.1, 0.03, 0.5);
          sw.rotation.y = Math.cos(t * 0.6) > 0 ? 0 : PI;
          wave.position.set(0, 0.055, 0.38 + Math.sin(t * 1.3) * 0.03);
          learner.position.set(0.24 + Math.sin(t * 0.7) * 0.08, 0.035 + Math.sin(t * 2.6) * 0.012, 0.52);
          learner.rotation.z = Math.sin(t * 2.6) * 0.14;
        },
      };
    },
  },
  {
    name: 'Plage de Melasti',
    sea: true,
    match: 'Plage de Melasti',
    dx: 0.72,
    dz: 0.14,
    size: 0.28,
    height: 0.85,
    build() {
      const b = new Builder();
      // La route descend entre deux murs de calcaire taillés jusqu'à une longue plage blanche
      b.box(CLIFF, 0.44, 0.56, 0.36, -0.32, 0.28, -0.26);
      b.box(CLIFF, 0.44, 0.56, 0.36, 0.32, 0.28, -0.26);
      b.box('#c9bc9c', 0.445, 0.03, 0.365, -0.32, 0.19, -0.26).box('#c9bc9c', 0.445, 0.03, 0.365, 0.32, 0.38, -0.26);
      b.box('#8fd36a', 0.44, 0.03, 0.36, -0.32, 0.575, -0.26).box('#8fd36a', 0.44, 0.03, 0.36, 0.32, 0.575, -0.26);
      b.box('#495057', 0.18, 0.02, 0.52, 0, 0.2, -0.22, 0.75, 0, 0);
      b.poly('#fbf3d6', [[-0.56, -0.08], [0.56, -0.08], [0.56, 0.12], [-0.56, 0.12]], 0.05, 0, 0.025, 0.1, -PI / 2);
      b.poly(LAGOON, [[-0.58, 0], [0.58, 0], [0.5, -0.22], [0, -0.28], [-0.5, -0.22]], 0.02, 0, 0.04, 0.2, -PI / 2);
      for (const [x, c] of [[-0.36, '#e03131'], [-0.12, '#1c7ed6'], [0.3, '#ffd43b']]) {
        b.cyl('#ffffff', 0.008, 0.008, 0.22, 4, x, 0.16, 0.12).cone(c, 0.11, 0.06, 8, x, 0.29, 0.12);
        b.box('#ffffff', 0.14, 0.02, 0.07, x + 0.08, 0.065, 0.14);
      }
      const c = new Builder();
      c.box('#e03131', 0.1, 0.05, 0.16, 0, 0.05, 0).box('#a5d8ff', 0.09, 0.04, 0.09, 0, 0.095, 0.0);
      for (const z of [-0.05, 0.05]) c.cyl('#1d1d1d', 0.025, 0.025, 0.105, 7, 0, 0.025, z, 0, 0, PI / 2);
      const car = c.mesh();
      const wave = new Builder().box('#ffffff', 1.0, 0.012, 0.03, 0, 0, 0).mesh();
      const sw = new Builder().ball(SKIN, 0.045, 0, 0.03, 0).box('#e64980', 0.09, 0.03, 0.07, -0.07, 0.01, 0).box(SKIN, 0.03, 0.03, 0.2, 0, 0.015, 0).mesh();
      return {
        parts: [b.mesh(), car, wave, sw],
        update(t) {
          const k = (t * 0.13) % 1;
          car.position.set(0, 0.38 - k * 0.34, -0.4 + k * 0.4);
          car.rotation.x = 0.75;
          car.scale.setScalar(Math.min(1, Math.min(k, 1 - k) * 8));
          wave.position.set(0, 0.055, 0.25 + Math.sin(t * 1.3) * 0.03);
          sw.position.set(0.16 + Math.sin(t * 0.5) * 0.14, 0.03, 0.38);
          sw.rotation.y = Math.cos(t * 0.5) > 0 ? 0 : PI;
        },
      };
    },
  },
  {
    name: 'Poisson grillé',
    match: 'Poisson grillé à Jimbaran',
    dx: 0.68,
    dz: -0.62,
    size: 0.24,
    height: 0.75,
    build() {
      const b = new Builder();
      // Tables dans le sable de Jimbaran, gril aux braises de coques de noix de coco
      b.box(SAND, 1.05, 0.05, 0.8, 0, 0.025, 0);
      for (const [x, z] of [[-0.28, 0.2], [0.1, 0.26], [0.36, 0.06]]) {
        b.box('#ffffff', 0.18, 0.02, 0.14, x, 0.14, z);
        b.box('#8d5a2b', 0.02, 0.1, 0.02, x, 0.09, z);
        b.cyl('#ffd43b', 0.012, 0.012, 0.04, 5, x, 0.17, z);
        person(b, x < 0 ? '#e64980' : '#1c7ed6', null, x - 0.14, 0.05, z, 0.65);
        person(b, x < 0 ? '#2f9e44' : '#ffd43b', null, x + 0.14, 0.05, z, 0.65);
      }
      b.box('#495057', 0.3, 0.1, 0.14, -0.2, 0.1, -0.22);
      b.box('#1a1a1a', 0.28, 0.02, 0.12, -0.2, 0.155, -0.22).box('#e8590c', 0.24, 0.012, 0.09, -0.2, 0.166, -0.22);
      b.box('#c0c6cc', 0.14, 0.02, 0.05, -0.24, 0.185, -0.22).box('#c0c6cc', 0.12, 0.02, 0.05, -0.12, 0.185, -0.2).box('#ff8787', 0.05, 0.02, 0.03, -0.3, 0.185, -0.18);
      person(b, '#ffffff', null, -0.2, 0.05, -0.36, 0.85);
      palm(b, 0.42, 0.05, -0.26, 0.55, -0.12, 0.7);
      // Le lagon, côté ouest, où le soleil se couche
      b.box(LAGOON, 1.05, 0.02, 0.2, 0, 0.012, 0.5);
      const smoke = [puff(0.05), puff(0.05), puff(0.05)];
      const candle = new Builder().cone('#ff922b', 0.02, 0.05, 5, -0.28, 0, 0.2).cone('#ff922b', 0.02, 0.05, 5, 0.1, 0, 0.26).cone('#ff922b', 0.02, 0.05, 5, 0.36, 0, 0.06).mesh(0, 0.21, 0);
      return raised({
        parts: [b.mesh(), ...smoke, candle],
        update(t) {
          smoke.forEach((s, i) => rise(s, (t * 0.4 + i / 3) % 1, -0.2 + (i - 1) * 0.06, 0.2, -0.22, 0.45, 0.1, 1.2));
          candle.scale.y = 0.8 + Math.abs(Math.sin(t * 8)) * 0.5;
        },
      }, 0.18, SAND, 0.66, 0.76);
    },
  },
  {
    name: 'Bingin',
    sea: true,
    match: 'Bingin et Dreamland',
    dx: 0.3,
    dz: -0.9,
    size: 0.28,
    height: 0.85,
    build() {
      const b = new Builder();
      // Bungalows accrochés à la falaise, escalier raide, petite plage et rouleaux de Dreamland
      b.box(CLIFF, 1.0, 0.2, 0.24, 0, 0.1, -0.06);
      b.box(CLIFF, 1.0, 0.4, 0.22, 0, 0.2, -0.24);
      b.box(CLIFF, 1.0, 0.58, 0.2, 0, 0.29, -0.42);
      b.box('#8fd36a', 1.0, 0.03, 0.2, 0, 0.595, -0.42);
      const hut = (x, y, z, c) => {
        b.box('#f8f9fa', 0.16, 0.1, 0.12, x, y + 0.05, z);
        b.poly(c, [[-0.11, 0], [0.11, 0], [0, 0.1]], 0.15, x, y + 0.1, z);
        b.box('#3d5a80', 0.04, 0.06, 0.01, x, y + 0.04, z + 0.062);
      };
      hut(-0.34, 0.2, -0.06, '#c49a4a');
      hut(0.3, 0.2, -0.06, '#b5523a');
      hut(-0.1, 0.4, -0.24, '#b5523a');
      hut(0.36, 0.4, -0.24, '#c49a4a');
      hut(-0.34, 0.58, -0.42, '#c49a4a');
      b.box('#a89d84', 0.1, 0.025, 0.66, 0.06, 0.3, -0.16, 0.9, 0, 0); // l'escalier
      palm(b, 0.42, 0.58, -0.42, 0.34, -0.08, 0.6);
      b.poly(SAND, [[-0.5, -0.08], [0.5, -0.08], [0.5, 0.1], [-0.5, 0.1]], 0.05, 0, 0.03, 0.12, -PI / 2);
      b.poly(LAGOON, [[-0.52, 0], [0.52, 0], [0.46, -0.22], [0, -0.28], [-0.46, -0.22]], 0.02, 0, 0.04, 0.22, -PI / 2);
      // Warung : le poisson grille le soir
      b.box('#8d5a2b', 0.14, 0.08, 0.08, -0.3, 0.1, 0.14).box('#343a40', 0.1, 0.02, 0.06, -0.3, 0.15, 0.14);
      person(b, '#e64980', null, -0.16, 0.055, 0.14, 0.6);
      const walker = person(new Builder(), '#ffd43b', null, 0, 0, 0, 0.6).mesh();
      const rollers = [0, 1].map(() => new Builder().box('#ffffff', 0.9, 0.03, 0.04, 0, 0, 0).ball('#ffffff', 0.04, -0.3, 0.02, 0).ball('#ffffff', 0.04, 0.2, 0.02, 0).mesh());
      const smoke = puff(0.04);
      return {
        parts: [b.mesh(), walker, ...rollers, smoke],
        update(t) {
          const k = (t * 0.12) % 1;
          walker.position.set(0.06, 0.56 - k * 0.5, -0.4 + k * 0.5);
          walker.scale.setScalar(Math.min(1, Math.min(k, 1 - k) * 8));
          rollers.forEach((r, i) => {
            const u = (t * 0.25 + i * 0.5) % 1;
            r.position.set(0, 0.07, 0.5 - u * 0.26);
            r.scale.set(1, 0.4 + Math.sin(u * PI) * 1.2, 1);
          });
          rise(smoke, (t * 0.45) % 1, -0.3, 0.17, 0.14, 0.3, 0.06, 1);
        },
      };
    },
  },
];

// ---------- Nusa Penida et Lembongan ----------

// Raie manta : corps et deux ailes qui battent, nez vers +x.
function mantaRay() {
  const body = new Builder();
  body.octa('#2b3a55', 0.14, 0, 0, 0, 1.45, 0.3, 0.75);
  body.octa('#f1f5f9', 0.1, 0.01, -0.025, 0, 1.4, 0.2, 0.7);
  body.cone('#2b3a55', 0.016, 0.28, 4, -0.32, 0, 0, 0, 0, PI / 2);
  body.box('#2b3a55', 0.08, 0.026, 0.035, 0.21, 0, 0.05, 0, 0.3, 0).box('#2b3a55', 0.08, 0.026, 0.035, 0.21, 0, -0.05, 0, -0.3, 0);
  const wing = (side) => new Builder().poly('#2b3a55', [[-0.12, 0], [0.1, 0], [-0.05, 0.28]], 0.026, 0, 0, 0, (PI / 2) * side, 0, 0).mesh(0, 0, 0.08 * side);
  const left = wing(1);
  const right = wing(-1);
  return { object: group(body.mesh(), left, right), left, right };
}

const PENIDA = [
  {
    name: 'Kelingking',
    sea: true,
    match: 'Kelingking',
    dx: -0.04,
    dz: -0.34,
    size: 0.3,
    height: 0.6,
    build() {
      const b = new Builder();
      // La falaise en tête de tyrannosaure : un cou étroit, une grosse tête gueule ouverte tournée vers le large,
      // et la plage blanche tout en bas, au creux de l'arête
      const rex = [[-0.3, 0.5], [0.56, 0.5], [0.56, 0.16], [0.3, 0.14], [0.18, 0], [0.14, -0.14], [0.12, -0.34], [0, -0.42], [-0.42, -0.42], [-0.46, -0.34], [-0.18, -0.3], [-0.18, -0.22], [-0.52, -0.18], [-0.52, -0.08], [-0.3, -0.04], [-0.04, -0.04], [0.04, 0.08], [0.04, 0.2], [-0.3, 0.26]];
      b.poly(LAGOON, [[-0.36, 0.52], [0.6, 0.52], [0.62, -0.2], [0.3, -0.52], [-0.4, -0.56], [-0.64, -0.3], [-0.6, 0.1]], 0.02, 0, 0.04, 0, -PI / 2);
      b.poly(CLIFF, rex, 0.26, 0, 0.13, 0, -PI / 2);
      b.poly('#74b84a', rex.map(([x, y]) => [x * 0.95, y * 0.95]), 0.03, 0, 0.275, 0, -PI / 2);
      b.poly('#fbf3d6', [[0.2, 0.12], [0.54, 0.14], [0.54, 0], [0.3, -0.12], [0.16, -0.14]], 0.03, 0, 0.06, 0, -PI / 2); // la plage
      b.ball('#1a1a1a', 0.022, -0.3, 0.3, 0.1); // l'œil
      b.ball('#2f9e44', 0.06, 0.4, 0.33, -0.36, 1.2, 0.8, 1).ball('#2f9e44', 0.05, 0.1, 0.33, -0.4, 1.2, 0.8, 1);
      b.box('#8d5a2b', 0.1, 0.05, 0.08, 0.44, 0.31, -0.24).pyr('#c49a4a', 0.09, 0.06, 0.44, 0.37, -0.24); // la buvette du point de vue
      const hikers = new Builder();
      person(hikers, '#e03131', null, 0, 0, 0, 0.5);
      person(hikers, '#ffd43b', null, 0.05, 0, 0.05, 0.5);
      const walkers = hikers.mesh();
      const foam = new Builder().box('#ffffff', 0.34, 0.012, 0.03, 0.36, 0, 0.1, 0, 0.6, 0).box('#ffffff', 0.3, 0.012, 0.03, -0.3, 0, 0.5).box('#ffffff', 0.16, 0.012, 0.03, -0.3, 0, 0.26).mesh(0, 0.07, 0);
      return {
        parts: [b.mesh(), walkers, foam],
        update(t) {
          // Deux marcheurs descendent l'arête, du point de vue vers la tête
          const u = ((t * 0.08) % 1) * 2;
          const k = u < 1 ? u : 2 - u;
          walkers.position.set(0.3 - k * 0.3, 0.29 + Math.abs(Math.sin(t * 6)) * 0.01, -0.2 + k * 0.5);
          foam.scale.set(1 + Math.sin(t * 1.4) * 0.06, 1, 1 + Math.sin(t * 1.4) * 0.06);
          foam.position.y = 0.07 + Math.sin(t * 1.4) * 0.006;
        },
      };
    },
  },
  {
    name: 'Broken Beach',
    sea: true,
    match: 'Broken Beach',
    dx: -0.22,
    dz: -0.68,
    size: 0.26,
    height: 0.6,
    build() {
      const b = new Builder();
      // Crique ronde fermée par une arche sous laquelle la mer entre
      b.cyl(LAGOON, 0.34, 0.34, 0.03, 10, 0, 0.015, 0);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * PI * 2 + PI / 10;
        const front = Math.sin(a) > 0.8;
        const x = Math.cos(a) * 0.42;
        const z = Math.sin(a) * 0.42;
        if (front) {
          b.box(CLIFF, 0.3, 0.1, 0.2, x, 0.27, z, 0, -a + PI / 2, 0); // l'arche
        } else {
          b.box(CLIFF, 0.3, 0.3, 0.2, x, 0.15, z, 0, -a + PI / 2, 0);
        }
        b.box('#74b84a', 0.3, 0.03, 0.2, x, 0.325, z, 0, -a + PI / 2, 0);
      }
      b.ball('#2f9e44', 0.06, -0.44, 0.38, -0.2).ball('#2f9e44', 0.05, 0.36, 0.38, -0.3);
      // Angel's Billabong : la piscine naturelle au bord de la falaise
      b.box(CLIFF, 0.3, 0.12, 0.24, 0.56, 0.06, 0.26);
      b.box('#20c997', 0.2, 0.02, 0.14, 0.56, 0.125, 0.26);
      const walker = person(new Builder(), '#e64980', null, 0, 0, 0, 0.6).mesh();
      const surge = new Builder().ball('#ffffff', 0.06, -0.06, 0, 0).ball('#ffffff', 0.06, 0.06, 0, 0.02).ball('#e6fbff', 0.05, 0, 0, 0.08).mesh();
      const manta = new Builder().octa('#2b3a55', 0.07, 0, 0, 0, 1.5, 0.25, 1.4).cone('#2b3a55', 0.01, 0.14, 4, -0.15, 0, 0, 0, 0, PI / 2).mesh();
      return {
        parts: [b.mesh(), walker, surge, manta],
        update(t) {
          // On fait le tour de la crique par le haut
          const a = t * 0.3;
          walker.position.set(Math.cos(a) * 0.42, 0.34 + Math.abs(Math.sin(t * 6)) * 0.01, Math.sin(a) * 0.42);
          const k = 0.5 + Math.sin(t * 1.2) * 0.5;
          surge.position.set(0, 0.04, 0.5 - k * 0.2);
          surge.scale.setScalar(0.7 + k * 0.6);
          manta.position.set(Math.cos(-t * 0.5) * 0.16, 0.04, Math.sin(-t * 0.5) * 0.16);
          manta.rotation.y = t * 0.5 + PI / 2;
        },
      };
    },
  },
  {
    name: 'Raies manta',
    sea: true,
    match: 'Raies manta',
    dx: -0.44,
    dz: -0.28,
    size: 0.3,
    height: 0.6,
    build() {
      // Les raies viennent se nourrir sous la falaise : on nage au-dessus d'elles
      const b = new Builder();
      b.poly('#2fb4dc', [[-0.5, -0.2], [0, -0.34], [0.5, -0.2], [0.54, 0.16], [0.1, 0.36], [-0.44, 0.28]], 0.02, 0, 0.04, 0, -PI / 2);
      b.poly('#ffffff', [[-0.11, 0.05], [0.13, 0.05], [0.08, -0.02], [-0.08, -0.02]], 0.08, 0.34, 0.03, -0.22);
      b.box('#1c7ed6', 0.2, 0.014, 0.084, 0.35, 0.08, -0.22).box('#ffffff', 0.07, 0.05, 0.06, 0.32, 0.11, -0.22);
      const big = mantaRay();
      const small = mantaRay();
      small.object.scale.setScalar(0.7);
      const swimmer = snorkeler('#e64980');
      swimmer.scale.setScalar(0.8);
      return {
        parts: [b.mesh(), big.object, small.object, swimmer],
        update(t) {
          [big, small].forEach((m, i) => {
            const a = t * 0.5 + i * PI;
            m.object.position.set(Math.cos(a) * (0.2 + i * 0.1), 0.1 + i * 0.04 + Math.sin(t * 1.3 + i) * 0.03, 0.04 + Math.sin(a) * (0.14 + i * 0.06));
            m.object.rotation.y = -a - PI / 2;
            const flap = Math.sin(t * 2.6 + i * 2) * 0.5;
            m.left.rotation.x = flap;
            m.right.rotation.x = -flap;
          });
          const a = -t * 0.3;
          swimmer.position.set(Math.cos(a) * 0.12, 0.3 + Math.sin(t * 2.2) * 0.012, 0.04 + Math.sin(a) * 0.1);
          swimmer.rotation.y = -a + PI / 2;
        },
      };
    },
  },
  {
    name: 'Diamond Beach',
    sea: true,
    match: 'Diamond Beach',
    dx: 0.66,
    dz: -0.44,
    size: 0.28,
    height: 0.85,
    build() {
      const b = new Builder();
      // Falaise blanche, escalier taillé dedans, plage, rochers pointus dans l'eau turquoise
      b.poly(LAGOON, [[-0.5, 0.0], [0.56, 0.0], [0.56, -0.3], [0.1, -0.44], [-0.4, -0.34]], 0.02, 0, 0.04, 0.12, -PI / 2);
      b.box('#f1ead6', 0.9, 0.56, 0.3, -0.06, 0.28, -0.28);
      b.box('#e3d9c0', 0.3, 0.4, 0.24, -0.4, 0.2, -0.06);
      b.box('#74b84a', 0.9, 0.03, 0.3, -0.06, 0.575, -0.28).box('#74b84a', 0.3, 0.03, 0.24, -0.4, 0.415, -0.06);
      b.poly('#fbf3d6', [[-0.26, -0.1], [0.5, -0.1], [0.5, 0.1], [0.1, 0.16], [-0.26, 0.1]], 0.04, 0, 0.02, 0.0, -PI / 2);
      // L'escalier en lacets
      b.box('#a89d84', 0.3, 0.025, 0.05, 0.1, 0.42, -0.12, 0, 0, 0.5).box('#a89d84', 0.3, 0.025, 0.05, 0.1, 0.2, -0.12, 0, 0, -0.5);
      // Les rochers en pointe de diamant
      b.cone('#f1ead6', 0.1, 0.34, 4, 0.3, 0.17, 0.3, 0, 0.4, 0).cone('#e3d9c0', 0.07, 0.24, 4, 0.08, 0.12, 0.38, 0, 0.8, 0).cone('#f1ead6', 0.06, 0.18, 4, 0.48, 0.09, 0.4, 0, 0.2, 0);
      b.cone('#74b84a', 0.035, 0.05, 4, 0.3, 0.35, 0.3);
      palm(b, -0.3, 0.42, -0.1, 0.36, -0.08, 0.6);
      const walker = person(new Builder(), '#e03131', null, 0, 0, 0, 0.6).mesh();
      const foam = new Builder().box('#ffffff', 0.7, 0.012, 0.03, 0.14, 0, 0).mesh();
      const spark = new Builder().octa('#ffffff', 0.035, 0, 0, 0, 1, 1.6, 1).mesh(0.3, 0.42, 0.3);
      return {
        parts: [b.mesh(), walker, foam, spark],
        update(t) {
          const s = ((t * 0.1) % 1) * 2;
          const k = s < 1 ? s : 2 - s;
          const leg = k < 0.5 ? k * 2 : (k - 0.5) * 2;
          walker.position.set(k < 0.5 ? -0.03 + leg * 0.26 : 0.23 - leg * 0.26, 0.5 - k * 0.42, -0.1);
          foam.position.set(0, 0.045, 0.12 + Math.sin(t * 1.3) * 0.03);
          spark.scale.setScalar(0.4 + Math.abs(Math.sin(t * 2.5)) * 0.9);
          spark.rotation.y = t * 2;
        },
      };
    },
  },
  {
    name: 'Pont jaune',
    sea: true,
    match: 'Pont jaune',
    dx: -0.32,
    dz: -1.04,
    size: 0.28,
    height: 0.7,
    build() {
      const b = new Builder();
      // Le pont suspendu entre Lembongan et Ceningan : piétons et scooters seulement
      for (const s of [-1, 1]) {
        b.poly(SAND, [[-0.2, -0.3], [0.2, -0.26], [0.22, 0.3], [-0.18, 0.34]], 0.05, s * 0.44, 0.025, 0, -PI / 2);
        b.poly('#74b84a', [[-0.14, -0.24], [0.14, -0.2], [0.14, 0.06], [-0.12, 0.1]], 0.07, s * 0.46, 0.07, 0.12, -PI / 2);
        palm(b, s * 0.5, 0.1, -0.16, 0.4, s * -0.1, 0.6);
        for (const z of [-0.05, 0.05]) b.box('#ffd43b', 0.03, 0.4, 0.03, s * 0.28, 0.2, 0.1 + z);
        b.box('#ffd43b', 0.035, 0.03, 0.14, s * 0.28, 0.4, 0.1);
        for (const z of [-0.05, 0.05]) b.box('#ffd43b', 0.3, 0.012, 0.012, s * 0.14, 0.31, 0.1 + z, 0, 0, s * -0.6);
      }
      b.box('#ffd43b', 0.6, 0.025, 0.1, 0, 0.15, 0.1);
      for (let i = -2; i <= 2; i++) for (const z of [-0.05, 0.05]) b.box('#ffd43b', 0.01, 0.08 + Math.abs(i) * 0.04, 0.01, i * 0.09, 0.2 + Math.abs(i) * 0.02, 0.1 + z);
      // Parcelles d'algues cultivées dans le chenal
      for (const [x, z] of [[-0.1, -0.2], [0.08, -0.22], [0.0, 0.36]]) b.box('#2b8a3e', 0.14, 0.012, 0.1, x, 0.012, z);
      const sc = new Builder();
      sc.cyl('#1d1d1d', 0.025, 0.025, 0.014, 7, -0.045, 0.025, 0, PI / 2, 0, 0).cyl('#1d1d1d', 0.025, 0.025, 0.014, 7, 0.045, 0.025, 0, PI / 2, 0, 0);
      sc.box('#e03131', 0.1, 0.03, 0.03, 0, 0.045, 0).box('#e03131', 0.015, 0.06, 0.03, 0.045, 0.07, 0);
      person(sc, '#1c7ed6', null, -0.01, 0.05, 0, 0.6);
      const scooter = sc.mesh();
      const boat = new Builder().poly('#ffffff', [[-0.11, 0.05], [0.13, 0.05], [0.08, -0.02], [-0.08, -0.02]], 0.07, 0, 0, 0, 0, PI / 2, 0).box('#1c7ed6', 0.072, 0.012, 0.2, 0, 0.05, 0).mesh();
      return {
        parts: [b.mesh(), scooter, boat],
        update(t) {
          const u = ((t * 0.16) % 1) * 2;
          scooter.position.set(-0.3 + (u < 1 ? u : 2 - u) * 0.6, 0.165, 0.1);
          scooter.rotation.y = u < 1 ? 0 : PI;
          const k = (t * 0.1) % 1;
          boat.position.set(0.02, 0.03 + Math.sin(t * 2.4) * 0.008, 0.46 - k * 0.8);
          boat.scale.setScalar(Math.min(1, Math.min(k, 1 - k) * 8));
          boat.rotation.z = Math.sin(t * 2) * 0.08;
        },
      };
    },
  },
  {
    name: "Devil's Tear",
    sea: true,
    match: "Devil's Tear",
    dx: -0.7,
    dz: -0.76,
    size: 0.24,
    height: 0.9,
    build() {
      const b = new Builder();
      // La houle s'engouffre sous la roche noire et ressort en gerbes de plusieurs mètres
      b.poly('#4a4744', [[-0.5, 0.3], [0.5, 0.3], [0.52, -0.1], [0.2, -0.2], [0.08, 0.02], [-0.1, 0.02], [-0.2, -0.22], [-0.52, -0.14]], 0.2, 0, 0.1, -0.06, -PI / 2);
      b.poly('#5a5653', [[-0.46, 0.3], [0.46, 0.3], [0.46, 0.1], [-0.46, 0.1]], 0.06, 0, 0.23, -0.06, -PI / 2);
      b.box('#8fd36a', 0.9, 0.02, 0.18, 0, 0.27, -0.26);
      b.poly(LAGOON, [[-0.56, 0.0], [0.56, 0.0], [0.5, -0.3], [0, -0.38], [-0.5, -0.3]], 0.02, 0, 0.04, 0.06, -PI / 2);
      person(b, '#e64980', null, -0.3, 0.26, -0.26, 0.65);
      person(b, '#ffd43b', null, -0.2, 0.26, -0.28, 0.65);
      const surge = new Builder().ball('#ffffff', 0.07, -0.05, 0, 0).ball('#ffffff', 0.07, 0.05, 0, 0.04).ball('#e6fbff', 0.06, 0, 0, 0.1).mesh();
      const spray = [puff(0.07), puff(0.06), puff(0.05)];
      return {
        parts: [b.mesh(), surge, ...spray],
        update(t) {
          const k = (t * 0.45) % 1;
          surge.position.set(0, 0.04, 0.34 - Math.min(1, k * 2) * 0.26);
          surge.scale.setScalar(0.6 + Math.sin(Math.min(1, k * 2) * PI) * 0.7);
          // La gerbe jaillit quand la vague touche le fond de la faille
          spray.forEach((s, i) => {
            const life = Math.max(0, Math.min(0.999, (k - 0.4) * 1.9 - i * 0.08));
            rise(s, life, (i - 1) * 0.08, 0.1, 0.02, 0.6 - i * 0.08, (i - 1) * 0.1, 1.6);
          });
        },
      };
    },
  },
  {
    name: 'Mangrove',
    sea: true,
    match: 'Mangrove de Lembongan',
    dx: 0.08,
    dz: -1.16,
    size: 0.24,
    height: 0.7,
    build() {
      const b = new Builder();
      // Couloirs d'eau calme entre les palétuviers, qu'on parcourt en barque à perche
      b.poly('#5fc9b0', [[-0.54, -0.3], [0.54, -0.3], [0.56, 0.32], [-0.56, 0.32]], 0.02, 0, 0.04, 0, -PI / 2);
      const tree = (x, z, s) => {
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * PI * 2;
          b.cyl('#6b4a2f', 0.008, 0.012, 0.2 * s, 4, x + Math.cos(a) * 0.05 * s, 0.09 * s, z + Math.sin(a) * 0.05 * s, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
        }
        b.cyl('#6b4a2f', 0.018, 0.022, 0.12 * s, 5, x, 0.22 * s, z);
        b.ball('#2b8a3e', 0.12 * s, x, 0.34 * s, z, 1.2, 0.75, 1.1);
        b.ball('#40c057', 0.07 * s, x + 0.06 * s, 0.4 * s, z - 0.03, 1.1, 0.7, 1);
      };
      [[-0.4, -0.2, 1.1], [-0.12, -0.26, 1], [0.2, -0.22, 1.2], [0.44, -0.12, 1], [-0.44, 0.22, 1], [0.4, 0.26, 1.1], [-0.02, 0.3, 0.9]].forEach(([x, z, s]) => tree(x, z, s));
      // Le batelier debout à l'arrière, deux passagers
      const s = new Builder();
      s.poly('#e8c170', [[-0.2, 0.05], [-0.14, 0], [0.14, 0], [0.22, 0.07]], 0.08);
      person(s, '#e8590c', '#f2d16b', -0.13, 0.04, 0, 0.7);
      person(s, '#1c7ed6', null, 0.02, 0.03, 0, 0.5);
      person(s, '#e64980', null, 0.1, 0.03, 0, 0.5);
      const skiff = s.mesh();
      const pole = new Builder().box('#8d5a2b', 0.012, 0.4, 0.012, 0, 0.1, 0).mesh();
      const egret = new Builder().box('#ffffff', 0.1, 0.012, 0.04, 0.3, 0, 0, 0, 0, 0.35).box('#ffffff', 0.1, 0.012, 0.04, 0.3, 0, 0, 0, 0, -0.35).mesh();
      return {
        parts: [b.mesh(), skiff, pole, egret],
        update(t) {
          const u = ((t * 0.08) % 1) * 2;
          const k = u < 1 ? u : 2 - u;
          const dir = u < 1 ? 1 : -1;
          skiff.position.set(-0.34 + k * 0.68, 0.02 + Math.sin(t * 2) * 0.005, 0.04);
          skiff.rotation.y = dir > 0 ? 0 : PI;
          pole.position.set(skiff.position.x - dir * 0.17, 0.06, 0.07);
          pole.rotation.z = dir * (0.2 + Math.sin(t * 1.6) * 0.3);
          egret.rotation.y = t * 0.7;
          egret.position.set(0, 0.6 + Math.sin(t * 1.4) * 0.03, 0);
        },
      };
    },
  },
];

// ---------- Sanur ----------

const SANUR = [
  {
    name: 'Musée Le Mayeur',
    match: 'Musée Le Mayeur',
    dx: -0.46,
    dz: -0.5,
    size: 0.22,
    height: 0.85,
    build() {
      const b = new Builder();
      // La maison du peintre au bord de la plage : brique rouge, pierre sculptée, toit de chaume, bassin de lotus
      b.box('#8fd36a', 1.0, 0.04, 0.8, 0, 0.02, 0);
      b.box(BRICK, 0.6, 0.24, 0.3, -0.1, 0.16, -0.2);
      b.box(STONE, 0.64, 0.03, 0.34, -0.1, 0.29, -0.2);
      b.poly('#c49a4a', [[-0.4, 0], [0.4, 0], [0.18, 0.24], [-0.18, 0.24]], 0.44, -0.1, 0.3, -0.2);
      b.box('#8a6a2f', 0.4, 0.03, 0.06, -0.1, 0.55, -0.2);
      b.box(GOLD, 0.1, 0.18, 0.02, -0.1, 0.13, -0.045).box('#c92a2a', 0.1, 0.16, 0.02, -0.3, 0.16, -0.045).box('#c92a2a', 0.1, 0.16, 0.02, 0.1, 0.16, -0.045);
      b.cyl(WATER, 0.13, 0.13, 0.02, 8, 0.36, 0.05, -0.18).ball('#e64980', 0.03, 0.34, 0.07, -0.16, 1, 0.6, 1).ball('#ffffff', 0.025, 0.41, 0.07, -0.22, 1, 0.6, 1);
      // Frangipanier
      b.cyl('#8a7a6a', 0.02, 0.03, 0.2, 5, 0.42, 0.14, 0.14).ball('#40c057', 0.1, 0.42, 0.3, 0.14, 1.2, 0.7, 1.1);
      for (const [x, y, z] of [[0.36, 0.33, 0.2], [0.48, 0.34, 0.12], [0.42, 0.37, 0.08]]) b.ball('#ffffff', 0.025, x, y, z).ball('#ffd43b', 0.012, x, y + 0.012, z + 0.01);
      // Le chevalet et sa toile
      for (const x of [-0.08, 0.04]) b.box('#8d5a2b', 0.015, 0.3, 0.015, x - 0.12, 0.19, 0.22, 0.15, 0, 0);
      b.box('#f8f9fa', 0.18, 0.16, 0.015, -0.14, 0.26, 0.21, 0.15, 0, 0);
      b.box('#ff922b', 0.07, 0.07, 0.016, -0.17, 0.27, 0.215, 0.15, 0, 0).box('#1c7ed6', 0.05, 0.05, 0.016, -0.1, 0.24, 0.215, 0.15, 0, 0).box('#e64980', 0.04, 0.06, 0.016, -0.1, 0.3, 0.215, 0.15, 0, 0);
      person(b, '#f8f9fa', '#c9a352', -0.14, 0.04, 0.36, 0.8); // le peintre
      const brush = new Builder().box(SKIN, 0.025, 0.14, 0.025, 0, 0.07, 0).box('#e03131', 0.012, 0.06, 0.012, 0, 0.16, 0).mesh(-0.09, 0.15, 0.34);
      // Ni Pollok, la danseuse, pose pour lui
      const model = dancer('#ffd43b', '#e03131');
      return {
        parts: [b.mesh(), brush, model],
        update(t) {
          brush.rotation.x = -0.9 + Math.sin(t * 3) * 0.25;
          brush.rotation.z = Math.sin(t * 2.2) * 0.3;
          model.position.set(0.16, 0.04, 0.3);
          model.rotation.y = -0.5 + Math.sin(t * 1.2) * 0.5;
          model.rotation.z = Math.sin(t * 1.8) * 0.1;
        },
      };
    },
  },
  {
    name: 'Marché de nuit',
    match: 'Marché de nuit de Sindhu',
    dx: 0.12,
    dz: -0.56,
    size: 0.21,
    height: 0.8,
    build() {
      const b = new Builder();
      b.box('#5c5f66', 1.0, 0.03, 0.74, 0, 0.015, 0);
      // Deux stands : brochettes de satay sur les braises, marmite de soupe bakso
      const stall = (x, roof) => {
        b.box('#8d5a2b', 0.36, 0.18, 0.2, x, 0.12, -0.14);
        for (const dx of [-0.17, 0.17]) for (const dz of [-0.1, 0.1]) b.box('#6b4423', 0.02, 0.5, 0.02, x + dx, 0.28, -0.14 + dz);
        b.poly(roof, [[-0.22, 0], [0.22, 0], [0.16, 0.1], [-0.16, 0.1]], 0.3, x, 0.5, -0.14);
      };
      stall(-0.26, '#e03131');
      stall(0.26, '#1c7ed6');
      b.box('#343a40', 0.2, 0.03, 0.1, -0.26, 0.225, -0.12).box('#e8590c', 0.18, 0.012, 0.08, -0.26, 0.242, -0.12);
      for (let i = 0; i < 4; i++) b.box('#a0522d', 0.012, 0.012, 0.14, -0.33 + i * 0.045, 0.255, -0.12).box('#c9a352', 0.012, 0.006, 0.08, -0.33 + i * 0.045, 0.255, -0.02);
      b.cyl('#adb5bd', 0.07, 0.06, 0.1, 8, 0.26, 0.26, -0.13).cyl('#f1e3c4', 0.06, 0.06, 0.01, 8, 0.26, 0.312, -0.13);
      person(b, '#2f9e44', null, -0.26, 0.03, -0.3, 0.85);
      person(b, '#e8590c', null, 0.26, 0.03, -0.3, 0.85);
      // Tabourets en plastique et clients
      [['#e03131', -0.36, 0.18], ['#4dabf7', -0.14, 0.24], ['#51cf66', 0.12, 0.2], ['#ffd43b', 0.36, 0.26]].forEach(([c, x, z], i) => {
        b.cyl(c, 0.04, 0.05, 0.08, 6, x, 0.07, z);
        if (i !== 1) person(b, i % 2 ? '#7048e8' : '#f06595', null, x, 0.11, z, 0.65);
      });
      b.box('#f8f9fa', 0.2, 0.02, 0.12, 0, 0.13, 0.3).box('#8d5a2b', 0.02, 0.1, 0.02, 0, 0.08, 0.3);
      // Guirlande d'ampoules entre les stands
      const g = new Builder();
      for (let i = -4; i <= 4; i++) g.ball(i % 2 ? '#ffe066' : '#ffa94d', 0.028, i * 0.1, -0.03 - (16 - i * i) * 0.004, 0);
      g.box('#343a40', 0.84, 0.008, 0.008, 0, -0.02, 0);
      const garland = g.mesh(0, 0.66, 0.02);
      const smoke = [puff(0.05), puff(0.05)];
      const steam = puff(0.04);
      return {
        parts: [b.mesh(), garland, ...smoke, steam],
        update(t) {
          garland.rotation.x = Math.sin(t * 1.4) * 0.3;
          garland.scale.y = 1 + Math.sin(t * 5) * 0.08;
          smoke.forEach((s, i) => rise(s, (t * 0.4 + i / 2) % 1, -0.26, 0.26, -0.12, 0.4, 0.08, 1.1));
          rise(steam, (t * 0.5) % 1, 0.26, 0.32, -0.13, 0.3, -0.05, 1);
        },
      };
    },
  },
  {
    name: 'Promenade à vélo',
    match: 'Front de mer à vélo',
    dx: -0.12,
    dz: -0.24,
    size: 0.22,
    height: 1.0,
    build() {
      const b = new Builder();
      // Promenade pavée le long de la plage, warung au toit de chaume, cerf-volant dans l'alizé
      b.box(SAND, 1.2, 0.04, 0.5, 0, 0.02, 0.1);
      b.box('#d9cbb0', 1.2, 0.02, 0.2, 0, 0.045, 0.0);
      for (let i = -3; i <= 3; i++) b.box('#c9bba0', 0.012, 0.022, 0.2, i * 0.17, 0.046, 0.0);
      b.box('#8d5a2b', 0.26, 0.14, 0.16, -0.36, 0.11, -0.22);
      for (const dx of [-0.13, 0.13]) b.box('#6b4423', 0.02, 0.34, 0.02, -0.36 + dx, 0.21, -0.14);
      b.pyr('#c49a4a', 0.26, 0.16, -0.36, 0.44, -0.2);
      b.cyl('#ffd43b', 0.03, 0.03, 0.05, 6, -0.4, 0.205, -0.2).cyl('#51cf66', 0.03, 0.03, 0.05, 6, -0.32, 0.205, -0.2);
      palm(b, 0.1, 0.04, -0.24, 0.6, 0.12, 0.75);
      palm(b, 0.48, 0.04, -0.2, 0.46, -0.1, 0.65);
      b.cyl('#ffffff', 0.008, 0.008, 0.24, 4, 0.3, 0.16, 0.28).cone('#1c7ed6', 0.12, 0.06, 8, 0.3, 0.3, 0.28).box('#ffffff', 0.16, 0.02, 0.07, 0.38, 0.06, 0.3);
      person(b, '#e03131', null, -0.2, 0.04, 0.26, 0.6); // l'enfant au cerf-volant
      const riders = [bike('#ff5fa2'), bike('#4dabf7')];
      // Cerf-volant balinais : losange à longue queue, au bout de son fil
      const k = new Builder();
      k.poly('#e03131', [[0, 0.1], [0.08, 0], [0, -0.1], [-0.08, 0]], 0.012, 0, 0.56, 0);
      k.poly('#ffd43b', [[0, 0.05], [0.04, 0], [0, -0.05], [-0.04, 0]], 0.014, 0, 0.56, 0);
      k.box('#1a1a1a', 0.012, 0.3, 0.012, 0, 0.32, 0).box('#ffffff', 0.004, 0.5, 0.004, 0, 0.25, 0);
      k.box('#ffd43b', 0.02, 0.14, 0.008, 0.02, 0.4, 0, 0, 0, 0.3);
      const kite = k.mesh(-0.2, 0.14, 0.26);
      return {
        parts: [b.mesh(), ...riders, kite],
        update(t) {
          riders.forEach((r, i) => {
            const dir = i ? -1 : 1;
            const u = (((t * 0.16 + i * 0.4) % 1) - 0.5) * dir;
            r.position.set(u * 1.1, 0.055, -0.04 + i * 0.08);
            r.rotation.y = dir > 0 ? 0 : PI;
          });
          kite.rotation.z = -0.5 + Math.sin(t * 1.1) * 0.2;
          kite.rotation.x = -0.3 + Math.sin(t * 1.7) * 0.15;
        },
      };
    },
  },
  {
    name: 'Lever de soleil',
    sea: true,
    match: 'Lever de soleil sur la plage',
    dx: 0.42,
    dz: -0.1,
    size: 0.3,
    height: 0.9,
    build() {
      // Le soleil sort de la mer derrière les jukung à l'ancre
      const boats = [jukung('#ffffff', null), jukung('#ffd43b', null), jukung('#74c0fc', null)].map((j, i) => {
        j.box(['#e03131', '#1c7ed6', '#e8590c'][i], 0.1, 0.025, 0.08, 0.26, 0.09, 0);
        j.cyl('#8d5a2b', 0.008, 0.008, 0.3, 4, 0, 0.2, 0).box(['#e03131', '#2f9e44', '#ffd43b'][i], 0.08, 0.05, 0.01, 0.045, 0.32, 0);
        const m = j.mesh();
        m.scale.setScalar(0.7);
        return m;
      });
      const dawn = sun(0.2, '#ff6b35');
      const glow = new Builder();
      for (let i = 0; i < 4; i++) glow.box(i % 2 ? '#ffd43b' : '#ffa94d', 0.34 - i * 0.07, 0.01, 0.03, 0, 0, i * 0.07);
      const path = glow.mesh(0.0, 0.012, -0.2);
      return {
        parts: [path, dawn, ...boats],
        update(t) {
          dawn.position.set(0, 0.16 + Math.sin(t * 0.5) * 0.14, -0.36);
          dawn.rotation.z = t * 0.25;
          path.scale.x = 0.8 + Math.sin(t * 2) * 0.2;
          boats.forEach((m, i) => {
            m.position.set(-0.3 + i * 0.3, 0.02 + Math.sin(t * 1.8 + i * 2) * 0.01, 0.16 + (i % 2) * 0.16);
            m.rotation.y = 0.3 - i * 0.3;
            m.rotation.z = Math.sin(t * 1.6 + i * 1.3) * 0.1;
            m.rotation.x = Math.sin(t * 1.2 + i * 2.1) * 0.08;
          });
        },
      };
    },
  },
  {
    name: 'Lagon',
    sea: true,
    match: 'Baignade dans le lagon',
    dx: 0.26,
    dz: 0.3,
    size: 0.26,
    height: 0.6,
    build() {
      const b = new Builder();
      // Eau calme et peu profonde derrière la barrière de corail, où les vagues cassent au large
      b.poly(LAGOON, [[-0.56, 0.3], [0.5, 0.36], [0.58, -0.2], [0.1, -0.36], [-0.5, -0.24]], 0.02, 0, 0.04, 0, -PI / 2);
      b.box('#f08c6b', 0.9, 0.03, 0.05, 0.04, 0.02, 0.36, 0, 0.06, 0);
      // Bale : petit pavillon de repos au toit de chaume, sur son banc de sable
      b.cyl(SAND, 0.2, 0.24, 0.05, 8, -0.36, 0.025, -0.18);
      for (const [x, z] of [[-0.44, -0.24], [-0.28, -0.24], [-0.44, -0.12], [-0.28, -0.12]]) b.box('#8d5a2b', 0.02, 0.22, 0.02, x, 0.16, z);
      b.box('#a67c52', 0.2, 0.02, 0.16, -0.36, 0.12, -0.18).pyr('#c49a4a', 0.2, 0.12, -0.36, 0.33, -0.18);
      const heads = new Builder();
      [[-0.1, -0.1, '#e03131'], [0.06, -0.04, '#ffd43b'], [0.3, -0.16, '#1c7ed6']].forEach(([x, z, c]) => heads.ball(SKIN, 0.045, x, 0.03, z).box(c, 0.07, 0.03, 0.06, x, 0, z).box(SKIN, 0.18, 0.025, 0.025, x, 0.04, z, 0, 0, 0.4));
      const bathers = heads.mesh();
      // Paddle debout
      const p = new Builder().box('#ffffff', 0.36, 0.025, 0.1, 0, 0, 0).box('#20c997', 0.1, 0.027, 0.1, 0.08, 0, 0);
      person(p, '#e64980', null, -0.02, 0.012, 0, 0.75);
      p.box('#343a40', 0.012, 0.3, 0.012, 0.05, 0.14, 0.06, 0, 0, -0.3);
      const paddle = p.mesh();
      const surf = new Builder().box('#ffffff', 0.86, 0.02, 0.04, 0.04, 0, 0, 0, 0.06, 0).ball('#ffffff', 0.04, -0.3, 0.01, 0).ball('#ffffff', 0.04, 0.1, 0.01, 0).ball('#ffffff', 0.04, 0.36, 0.01, 0).mesh();
      return {
        parts: [b.mesh(), bathers, paddle, surf],
        update(t) {
          bathers.position.y = 0.03 + Math.sin(t * 2.2) * 0.012;
          bathers.rotation.y = Math.sin(t * 0.7) * 0.15;
          const a = t * 0.35;
          paddle.position.set(0.1 + Math.cos(a) * 0.3, 0.03 + Math.sin(t * 2) * 0.006, 0.08 + Math.sin(a) * 0.14);
          paddle.rotation.y = -a - PI / 2;
          surf.position.set(0, 0.04, 0.42 + Math.sin(t * 1.3) * 0.02);
          surf.scale.set(1, 0.6 + Math.abs(Math.sin(t * 1.3)) * 0.9, 1);
        },
      };
    },
  },
  {
    name: 'Bateau pour Lembongan',
    sea: true,
    match: 'Journée à Nusa Lembongan',
    dx: 0.72,
    dz: 0.3,
    size: 0.22,
    height: 0.6,
    build() {
      const b = new Builder();
      // La jetée du port de Sanur, d'où partent les bateaux rapides
      b.box('#adb5bd', 0.14, 0.05, 0.5, -0.46, 0.07, -0.2);
      for (const z of [-0.4, -0.2, 0]) b.cyl('#6b4423', 0.02, 0.02, 0.12, 5, -0.46, 0.04, z);
      b.box('#ffd43b', 0.03, 0.1, 0.03, -0.46, 0.14, 0.02);
      const boat = fastBoat('#e8590c').mesh();
      const wake = new Builder().ball('#ffffff', 0.07, 0, 0, 0.08).ball('#ffffff', 0.06, -0.1, 0, -0.08).ball('#e6fbff', 0.06, -0.18, 0, 0.03).ball('#ffffff', 0.04, -0.27, 0, -0.04).mesh();
      const gull = new Builder().box('#ffffff', 0.12, 0.014, 0.045, 0.25, 0, 0, 0, 0, 0.35).box('#ffffff', 0.12, 0.014, 0.045, 0.25, 0, 0, 0, 0, -0.35).mesh();
      return {
        parts: [b.mesh(), boat, wake, gull],
        update(t) {
          const k = (t * 0.14) % 1;
          const x = -0.3 + k * 0.7;
          const s = Math.min(1, Math.min(k, 1 - k) * 8);
          boat.position.set(x, 0.01 + Math.abs(Math.sin(t * 4)) * 0.02, 0.12);
          boat.rotation.z = 0.08 + Math.sin(t * 4) * 0.06;
          boat.scale.setScalar(s);
          wake.position.set(x - 0.42, 0.02, 0.12);
          wake.scale.setScalar(s * (0.8 + Math.sin(t * 7) * 0.25));
          gull.rotation.y = t * 0.9;
          gull.position.set(0, 0.45 + Math.sin(t * 1.4) * 0.04, 0);
        },
      };
    },
  },
];

export default {
  ubud: { scale: 0.36, items: UBUD },
  munduk: { scale: 0.36, items: MUNDUK },
  sidemen: { scale: 0.36, items: afloat(115.4429, -8.4679, 0.36, SIDEMEN) },
  amed: { scale: 0.3, items: afloat(115.72, -8.3, 0.3, AMED) },
  'pemuteran-menjangan': { scale: 0.3, items: afloat(114.6, -8.07, 0.3, MENJANGAN) },
  'sud-de-bali-uluwatu': { scale: 0.25, items: afloat(115.04, -8.86, 0.25, ULUWATU) },
  'nusa-penida-lembongan': { scale: 0.25, items: afloat(115.5, -8.87, 0.25, PENIDA) },
  sanur: { scale: 0.3, items: afloat(115.262, -8.688, 0.3, SANUR) },
};
