// Petits modèles 3D low-poly animés posés sur la carte (un par lieu ou par ville).
// createModel(kind) renvoie { object, update(t) } : object est un THREE.Group à l'échelle 1
// (emprise au sol d'environ 1 × 1, origine au niveau du sol, +y vers le haut), update(t) l'anime (t en secondes).
// Chaque modèle est un petit diorama posé à même la carte : une partie statique fusionnée en un seul mesh,
// plus quelques parties mobiles (4 au maximum). Tout partage un unique matériau à couleurs par sommet.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const MODEL_KINDS = [
  'stupa',
  'pura',
  'candi',
  'waterfall',
  'rice',
  'snorkel',
  'fish',
  'turtle',
  'manta',
  'surf',
  'komodo',
  'orangutan',
  'monkey',
  'house-cone',
  'house-toraja',
  'house-horn',
  'house-sumba',
  'house-stilt',
  'skyline',
  'tea',
  'jeep',
  'fort',
  'market',
  'palm',
  'karst',
  'horse',
  'boat',
  'mosque',
  'plane',
  'bridge',
];

const MATERIAL = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const PI = Math.PI;
const G = 0.09; // hauteur du dessus du socle : le « sol » de chaque diorama

const colors = new Map();
const col = (hex) => {
  let c = colors.get(hex);
  if (!c) colors.set(hex, (c = new THREE.Color(hex)));
  return c;
};

const matrix = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const euler = new THREE.Euler();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();

// Assemble des primitives colorées puis les fusionne en un seul mesh.
class Builder {
  constructor() {
    this.parts = [];
  }

  add(geometry, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    g.deleteAttribute('uv');
    matrix.compose(pos.set(x, y, z), quat.setFromEuler(euler.set(rx, ry, rz)), scl.set(sx, sy, sz));
    g.applyMatrix4(matrix);
    const c = col(color);
    const n = g.attributes.position.count;
    const data = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      data[i * 3] = c.r;
      data[i * 3 + 1] = c.g;
      data[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(data, 3));
    this.parts.push(g);
    return this;
  }

  box(color, w, h, d, x, y, z, rx, ry, rz) {
    return this.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, rx, ry, rz);
  }

  cyl(color, rTop, rBottom, h, seg, x, y, z, rx, ry, rz) {
    return this.add(new THREE.CylinderGeometry(rTop, rBottom, h, seg), color, x, y, z, rx, ry, rz);
  }

  cone(color, r, h, seg, x, y, z, rx, ry, rz) {
    return this.add(new THREE.ConeGeometry(r, h, seg), color, x, y, z, rx, ry, rz);
  }

  // Pyramide à base carrée alignée sur les axes
  pyr(color, r, h, x, y, z) {
    return this.cone(color, r, h, 4, x, y, z, 0, PI / 4, 0);
  }

  ball(color, r, x, y, z, sx = 1, sy = 1, sz = 1, detail = 0) {
    return this.add(new THREE.IcosahedronGeometry(r, detail), color, x, y, z, 0, 0, 0, sx, sy, sz);
  }

  octa(color, r, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) {
    return this.add(new THREE.OctahedronGeometry(r, 0), color, x, y, z, 0, ry, 0, sx, sy, sz);
  }

  // Polygone du plan XY (face à la caméra) extrudé en épaisseur le long de z
  poly(color, points, depth, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const shape = new THREE.Shape(points.map(([px, py]) => new THREE.Vector2(px, py)));
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    return this.add(g, color, x, y, z, rx, ry, rz);
  }

  mesh(x = 0, y = 0, z = 0) {
    // Sans socle, certains décors n'ont plus de partie fixe : on renvoie alors un mesh vide.
    if (!this.parts.length) return new THREE.Mesh(new THREE.BufferGeometry(), MATERIAL);
    const geometry = mergeGeometries(this.parts, false);
    geometry.computeVertexNormals();
    for (const g of this.parts) g.dispose();
    const mesh = new THREE.Mesh(geometry, MATERIAL);
    mesh.position.set(x, y, z);
    return mesh;
  }
}

const GRASS = '#8fd36a';
const SAND = '#f3dc9a';
const WATER = '#3ccbe6';
const STONE = '#cfd4da';
const WOOD = '#8d5a2b';
const THATCH = '#c49a4a';
const SKIN = '#f2b98a';

// Les modèles sont posés directement sur la carte, sans socle : le relief ou la mer leur sert de sol.
// (Le paramètre « top » décrivait la couleur de l'ancien socle ; il est conservé pour ne pas toucher aux fabriques.)
function plate(b) {
  return b;
}

function group(...children) {
  const g = new THREE.Group();
  g.add(...children);
  return g;
}

// Petit personnage : corps, tête, chapeau conique éventuel. Origine aux pieds.
function person(b, body, hat, x = 0, y = 0, z = 0, s = 1) {
  b.cyl(body, 0.045 * s, 0.06 * s, 0.16 * s, 6, x, y + 0.08 * s, z);
  b.ball(SKIN, 0.05 * s, x, y + 0.2 * s, z);
  if (hat) b.cone(hat, 0.11 * s, 0.07 * s, 8, x, y + 0.26 * s, z);
  return b;
}

// Cocotier : tronc penché en deux segments ; renvoie la position de la tête pour y accrocher les palmes.
function palmTrunk(b, x, z, h, lean) {
  b.cyl('#a8763e', 0.035, 0.05, h * 0.55, 5, x + lean * 0.25, G + h * 0.27, z, 0, 0, -lean * 0.9);
  b.cyl('#a8763e', 0.028, 0.035, h * 0.5, 5, x + lean * 0.72, G + h * 0.74, z, 0, 0, -lean * 0.5);
  return [x + lean * 0.86, G + h * 0.98, z];
}
function palmLeaves() {
  const b = new Builder();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    b.box(i % 2 ? '#2f9e44' : '#40c057', 0.4, 0.025, 0.12, Math.cos(a) * 0.18, -0.045, Math.sin(a) * 0.18, 0, -a, -0.45);
  }
  b.ball('#6b4423', 0.035, 0, -0.03, 0);
  return b;
}

// Profil d'un toit « en selle » relevé aux deux bouts (toraja, batak, minangkabau)
function saddle(L, yLow, yTip, thick) {
  const d = yTip - yLow;
  return [
    [-L, yTip],
    [-L * 0.6, yLow + d * 0.3],
    [0, yLow],
    [L * 0.6, yLow + d * 0.3],
    [L, yTip],
    [L * 0.72, yLow + d * 0.56 + thick],
    [0, yLow + thick],
    [-L * 0.72, yLow + d * 0.56 + thick],
  ];
}

function flag(colorTop, colorBottom, w = 0.24, h = 0.14) {
  // Drapeau accroché par son bord gauche (pivot en x = 0)
  const b = new Builder();
  b.box(colorTop, w, h / 2, 0.012, w / 2, h / 4, 0);
  b.box(colorBottom, w, h / 2, 0.012, w / 2, -h / 4, 0);
  return b.mesh();
}

function puff(r = 0.07) {
  return new Builder().ball('#ffffff', r, 0, 0, 0).mesh();
}

// Fait monter une volute en boucle : life dans [0, 1[
function rise(mesh, life, x, y, z, height, drift, size) {
  mesh.position.set(x + life * drift, y + life * height, z);
  mesh.scale.setScalar(size * (0.35 + life * 0.9) * Math.sin(life * PI));
  mesh.rotation.set(life * 2, life * 3, 0);
}

const FACTORIES = {
  stupa(ph) {
    const b = plate(new Builder(), GRASS);
    const stone = ['#7d6b8d', '#8f7da0', '#a391b3', '#b9aacb'];
    [0.94, 0.78, 0.62, 0.48].forEach((w, i) => b.box(stone[i], w, 0.11, w, 0, G + 0.055 + i * 0.11, 0));
    b.box('#d8cee3', 0.13, 0.03, 0.56, 0, G + 0.24, 0.3, 0.72, 0, 0); // escalier
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cone('#d8cee3', 0.05, 0.13, 6, x * 0.26, G + 0.395, z * 0.26);
    b.cyl('#b9aacb', 0.2, 0.22, 0.06, 8, 0, G + 0.47, 0);
    for (let i = 0; i < 6; i++) b.cone('#d8cee3', 0.035, 0.09, 5, Math.cos((i / 6) * PI * 2) * 0.16, G + 0.545, Math.sin((i / 6) * PI * 2) * 0.16);
    b.cyl('#e6def0', 0.035, 0.115, 0.2, 8, 0, G + 0.6, 0);
    b.cone('#f1ecf7', 0.035, 0.2, 6, 0, G + 0.8, 0);
    const halo = new Builder().octa('#ffd23f', 0.06, 0, 0, 0, 1, 1.5, 1).mesh(0, G + 1.0, 0);
    const birdsB = new Builder();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2;
      birdsB.box('#ffffff', 0.13, 0.015, 0.05, Math.cos(a) * 0.42, i * 0.06, Math.sin(a) * 0.42, 0, -a, 0.35);
      birdsB.box('#ffffff', 0.13, 0.015, 0.05, Math.cos(a) * 0.42, i * 0.06, Math.sin(a) * 0.42, 0, -a, -0.35);
    }
    const birds = birdsB.mesh(0, G + 0.95, 0);
    return {
      parts: [b.mesh(), halo, birds],
      update(t) {
        halo.rotation.y = t * 1.5 + ph;
        halo.scale.setScalar(0.85 + 0.3 * Math.sin(t * 3 + ph));
        birds.rotation.y = -t * 0.8 - ph;
        birds.position.y = G + 0.98 + Math.sin(t * 1.7 + ph) * 0.05;
      },
    };
  },

  pura(ph) {
    const b = plate(new Builder(), GRASS);
    b.box('#d9622b', 0.5, 0.16, 0.5, 0, G + 0.08, 0);
    b.box('#b84d1e', 0.38, 0.05, 0.38, 0, G + 0.185, 0);
    b.box('#5a4334', 0.24, 0.18, 0.24, 0, G + 0.3, 0);
    b.box('#ffd23f', 0.09, 0.12, 0.02, 0, G + 0.28, 0.125);
    // Toits superposés du meru
    const tiers = 5;
    for (let i = 0; i < tiers; i++) {
      const r = 0.36 - i * 0.055;
      const y = G + 0.42 + i * 0.16;
      b.pyr(i % 2 ? '#3b2f2f' : '#2a2222', r, 0.13, 0, y, 0);
      b.box('#8d5a2b', 0.1 - i * 0.008, 0.08, 0.1 - i * 0.008, 0, y + 0.07, 0);
    }
    b.cone('#ffd23f', 0.03, 0.1, 5, 0, G + 0.42 + tiers * 0.16 - 0.02, 0);
    // Portail fendu
    b.poly('#d9622b', [[0, 0], [0.13, 0], [0.13, 0.34], [0.09, 0.3], [0.05, 0.2], [0, 0.12]], 0.07, -0.25, G, 0.42, 0, PI, 0);
    b.poly('#d9622b', [[0, 0], [0.13, 0], [0.13, 0.34], [0.09, 0.3], [0.05, 0.2], [0, 0.12]], 0.07, 0.25, G, 0.42);
    b.cyl('#6b4423', 0.012, 0.012, 0.5, 4, 0.4, G + 0.25, 0.2);
    const umbrella = new Builder().cone('#ffd23f', 0.14, 0.09, 8, 0, 0, 0).cyl('#ffffff', 0.142, 0.142, 0.02, 8, 0, -0.05, 0).cone('#e03131', 0.02, 0.06, 4, 0, 0.07, 0).mesh(0.4, G + 0.5, 0.2);
    const banner = new Builder().box('#ffffff', 0.05, 0.34, 0.012, 0, -0.17, 0).box('#ffd23f', 0.05, 0.08, 0.014, 0, -0.3, 0).mesh(-0.42, G + 0.62, 0.18);
    b.cyl('#6b4423', 0.012, 0.012, 0.62, 4, -0.42, G + 0.31, 0.18);
    return {
      parts: [b.mesh(), umbrella, banner],
      update(t) {
        umbrella.rotation.z = Math.sin(t * 1.8 + ph) * 0.14;
        umbrella.rotation.x = Math.cos(t * 1.3 + ph) * 0.1;
        banner.rotation.z = Math.sin(t * 2.2 + ph) * 0.22;
        banner.rotation.x = Math.sin(t * 1.6 + ph) * 0.15;
      },
    };
  },

  candi(ph) {
    const b = plate(new Builder(), '#b9d98a');
    b.box('#9a9a8e', 0.6, 0.08, 0.6, -0.08, G + 0.04, 0);
    b.box('#84847a', 0.46, 0.08, 0.46, -0.08, G + 0.12, 0);
    b.box('#a9a99c', 0.34, 0.3, 0.34, -0.08, G + 0.31, 0);
    b.box('#3b3b36', 0.1, 0.18, 0.02, -0.08, G + 0.25, 0.175);
    b.box('#84847a', 0.42, 0.06, 0.42, -0.08, G + 0.49, 0);
    b.box('#9a9a8e', 0.3, 0.1, 0.3, -0.08, G + 0.57, 0);
    b.box('#84847a', 0.2, 0.1, 0.2, -0.08, G + 0.67, 0);
    b.cyl('#a9a99c', 0.03, 0.07, 0.12, 6, -0.08, G + 0.78, 0);
    b.box('#6fae4f', 0.2, 0.03, 0.12, -0.2, G + 0.535, 0.1); // mousse
    b.box('#d9c8a0', 0.1, 0.02, 0.26, -0.08, G + 0.09, 0.36, 0.5); // marches
    // Fumerolle
    b.cyl('#e8d44d', 0.1, 0.13, 0.05, 7, 0.33, G + 0.025, 0.2);
    b.cyl('#6b6b60', 0.06, 0.06, 0.052, 7, 0.33, G + 0.027, 0.2);
    const puffs = [puff(), puff(), puff()];
    return {
      parts: [b.mesh(), ...puffs],
      update(t) {
        puffs.forEach((p, i) => rise(p, (t * 0.28 + i / 3 + ph) % 1, 0.33, G + 0.06, 0.2, 0.75, 0.12, 1.5));
      },
    };
  },

  waterfall(ph) {
    const b = plate(new Builder(), GRASS);
    b.box('#8a7f72', 0.9, 0.95, 0.34, 0, G + 0.475, -0.22);
    b.box('#9d9285', 0.3, 0.7, 0.2, -0.33, G + 0.35, 0.02);
    b.box('#766c61', 0.26, 0.5, 0.22, 0.34, G + 0.25, 0.03);
    b.box('#a89d90', 0.22, 0.16, 0.2, 0.36, G + 0.58, -0.02);
    b.ball('#2f9e44', 0.17, -0.3, G + 0.98, -0.2, 1.3, 0.7, 1);
    b.ball('#40c057', 0.16, 0.28, G + 0.98, -0.22, 1.3, 0.7, 1);
    b.ball('#37b24d', 0.11, -0.36, G + 0.74, 0.02);
    b.ball('#2f9e44', 0.1, 0.38, G + 0.7, 0.0);
    b.box('#49c6f2', 0.24, 0.95, 0.06, 0, G + 0.5, -0.03); // rideau d'eau
    b.box('#49c6f2', 0.24, 0.05, 0.26, 0, G + 0.97, -0.15);
    b.cyl('#3ccbe6', 0.3, 0.3, 0.03, 8, 0, G + 0.015, 0.22, 0, 0, 0);
    const fallB = new Builder();
    for (let i = 0; i < 5; i++) fallB.box('#ffffff', 0.07, 0.11, 0.03, (i % 2 ? 0.06 : -0.06) + (i === 2 ? 0.03 : 0), i * 0.24, 0);
    const fall = fallB.mesh(0, G, 0.012);
    const foam = new Builder().ball('#ffffff', 0.09, -0.08, 0, 0).ball('#ffffff', 0.1, 0.07, 0.01, 0.03).ball('#e6fbff', 0.07, 0, 0, 0.09).mesh(0, G + 0.07, 0.12);
    return {
      parts: [b.mesh(), fall, foam],
      update(t) {
        fall.position.y = G - 0.04 - ((t * 0.55 + ph) % 1) * 0.24;
        foam.scale.set(1 + Math.sin(t * 5 + ph) * 0.18, 0.8 + Math.sin(t * 7 + ph) * 0.3, 1 + Math.cos(t * 4 + ph) * 0.15);
      },
    };
  },

  rice(ph) {
    const b = plate(new Builder(), '#69db7c');
    const greens = ['#8ce99a', '#51cf66', '#b2f2bb', '#40c057'];
    const radii = [0.5, 0.4, 0.29, 0.18];
    radii.forEach((r, i) => {
      const x = -0.03 - i * 0.045;
      const z = -0.02 - i * 0.045;
      b.cyl('#a67c52', r + 0.02, r + 0.03, 0.09, 9, x, G + 0.045 + i * 0.1, z);
      b.cyl(greens[i], r, r, 0.03, 9, x, G + 0.1 + i * 0.1, z);
    });
    b.cyl('#7fd8f7', 0.1, 0.1, 0.032, 7, 0.22, G + 0.1, 0.18); // parcelle en eau
    const [hx, hy, hz] = palmTrunk(b, -0.24, -0.18, 0.55, 0.12);
    const leaves = palmLeaves().mesh(hx, hy + 0.34, hz);
    const farmer = person(new Builder(), '#3b82f6', '#f2d16b').mesh();
    return {
      parts: [b.mesh(), leaves, farmer],
      update(t) {
        const a = 0.9 + Math.sin(t * 0.5 + ph) * 0.9;
        farmer.position.set(-0.03 + Math.cos(a) * 0.4, G + 0.115, -0.02 + Math.sin(a) * 0.4);
        farmer.rotation.y = -a;
        farmer.rotation.z = 0.35 + Math.sin(t * 3 + ph) * 0.3;
        leaves.rotation.z = Math.sin(t * 1.4 + ph) * 0.12;
      },
    };
  },

  snorkel(ph) {
    const b = plate(new Builder(), WATER);
    b.ball('#ff8fab', 0.07, -0.34, G + 0.02, -0.22, 1, 0.6, 1); // coraux
    b.ball('#ffa94d', 0.06, 0.36, G + 0.02, -0.12, 1, 0.6, 1);
    const body = new Builder();
    body.box('#ff7b1c', 0.3, 0.09, 0.14, 0, 0, 0); // torse et maillot (avance vers +x)
    body.box(SKIN, 0.2, 0.07, 0.11, -0.24, 0, 0);
    body.ball(SKIN, 0.085, 0.22, 0.02, 0);
    body.box('#1d2b53', 0.05, 0.07, 0.15, 0.275, 0.01, 0);
    body.cyl('#ffd23f', 0.016, 0.016, 0.2, 5, 0.2, 0.14, 0.09);
    body.box('#ffd23f', 0.05, 0.03, 0.03, 0.22, 0.24, 0.09);
    body.box(SKIN, 0.2, 0.04, 0.05, 0.08, -0.01, 0.13, 0, 0.5, 0);
    body.box(SKIN, 0.2, 0.04, 0.05, 0.08, -0.01, -0.13, 0, -0.5, 0);
    const bodyMesh = body.mesh();
    const fin = () => new Builder().box('#a3e635', 0.2, 0.025, 0.09, -0.1, 0, 0).mesh();
    const finL = fin();
    const finR = fin();
    finL.position.set(-0.34, 0, 0.045);
    finR.position.set(-0.34, 0, -0.045);
    const swimmer = group(bodyMesh, finL, finR);
    swimmer.scale.setScalar(1.25);
    const ring = new Builder().add(new THREE.TorusGeometry(0.2, 0.012, 4, 10), '#ffffff', 0, 0, 0, PI / 2).mesh(0, G + 0.012, 0);
    return {
      parts: [b.mesh(), swimmer, ring],
      update(t) {
        const a = t * 0.6 + ph;
        swimmer.position.set(Math.cos(a) * 0.14, G + 0.07 + Math.sin(t * 2.2 + ph) * 0.015, Math.sin(a) * 0.14);
        swimmer.rotation.y = -a - PI / 2;
        swimmer.rotation.z = Math.sin(t * 2.2 + ph) * 0.06;
        finL.rotation.z = Math.sin(t * 9 + ph) * 0.55;
        finR.rotation.z = -Math.sin(t * 9 + ph) * 0.55;
        const k = (t * 0.6 + ph) % 1;
        ring.position.set(swimmer.position.x, G + 0.012, swimmer.position.z);
        ring.scale.setScalar(0.6 + k * 1.4);
        ring.scale.y = 1;
        ring.visible = k < 0.9;
      },
    };
  },

  fish(ph) {
    const b = plate(new Builder(), WATER);
    b.ball('#ff8fab', 0.08, -0.36, G + 0.03, 0.18, 1, 0.8, 1);
    b.ball('#b197fc', 0.07, 0.38, G + 0.03, 0.12, 1, 0.8, 1);
    b.ball('#63e6be', 0.06, 0.05, G + 0.02, -0.4, 1, 0.8, 1);
    const tints = [
      ['#ff922b', '#ffffff'],
      ['#ffd43b', '#1d2b53'],
      ['#ff6b9d', '#ffffff'],
    ];
    const jumpers = tints.map(([main, stripe], i) => {
      const f = new Builder();
      f.octa(main, 0.1, 0, 0, 0, 1.5, 0.95, 0.55);
      f.box(stripe, 0.035, 0.15, 0.115, 0.02, 0, 0);
      f.poly(main, [[0, 0], [-0.11, 0.09], [-0.08, 0], [-0.11, -0.09]], 0.03, -0.13, 0, 0);
      f.ball('#1d2b53', 0.018, 0.09, 0.025, 0.045);
      f.ball('#1d2b53', 0.018, 0.09, 0.025, -0.045);
      const mesh = f.mesh(0, 0.3, 0);
      mesh.scale.setScalar(1.7);
      const pivot = group(mesh);
      const a = (i / 3) * PI * 2 + 0.4;
      pivot.position.set(Math.cos(a) * 0.1, G - 0.02, Math.sin(a) * 0.1);
      pivot.rotation.y = -a + PI / 2;
      return { pivot, mesh };
    });
    return {
      parts: [b.mesh(), ...jumpers.map((j) => j.pivot)],
      update(t) {
        jumpers.forEach((j, i) => {
          // Saut en arc pendant la première moitié du cycle, sous l'eau le reste du temps
          const k = ((t * 0.45 + i / 3 + ph) % 1) * 2;
          const up = k < 1;
          j.mesh.visible = up;
          if (up) j.pivot.rotation.z = PI / 2 - k * PI;
        });
      },
    };
  },

  turtle(ph) {
    const b = plate(new Builder(), WATER);
    b.ball('#f3dc9a', 0.12, -0.36, G, -0.26, 1.3, 0.4, 1);
    const body = new Builder();
    body.ball('#2f9e44', 0.17, 0, 0.03, 0, 1.25, 0.5, 1, 1);
    body.ball('#237a36', 0.1, -0.01, 0.085, 0, 1.3, 0.4, 1);
    body.ball('#9be08f', 0.07, 0.25, 0.02, 0, 1.2, 0.8, 0.9);
    body.ball('#1d2b53', 0.014, 0.29, 0.045, 0.04);
    body.ball('#1d2b53', 0.014, 0.29, 0.045, -0.04);
    body.box('#9be08f', 0.1, 0.02, 0.07, -0.19, 0.01, 0.1, 0, 0.7, 0);
    body.box('#9be08f', 0.1, 0.02, 0.07, -0.19, 0.01, -0.1, 0, -0.7, 0);
    body.cone('#9be08f', 0.03, 0.08, 4, -0.24, 0.01, 0, 0, 0, PI / 2);
    const flipper = (side) => new Builder().poly('#9be08f', [[0, -0.05], [0.07, -0.02], [0.03, 0.24], [-0.03, 0.2]], 0.025, 0, 0, 0, PI / 2 * side, 0, 0).mesh(0.1, 0.02, 0.13 * side);
    const left = flipper(1);
    const right = flipper(-1);
    const turtle = group(body.mesh(), left, right);
    turtle.scale.setScalar(1.3);
    return {
      parts: [b.mesh(), turtle],
      update(t) {
        const a = t * 0.5 + ph;
        turtle.position.set(Math.cos(a) * 0.15, G + 0.07 + Math.sin(t * 1.6 + ph) * 0.02, Math.sin(a) * 0.2);
        turtle.rotation.y = -a - PI / 2;
        const flap = Math.sin(t * 3.2 + ph) * 0.5;
        left.rotation.x = flap;
        right.rotation.x = -flap;
        left.rotation.y = -0.3 + flap * 0.5;
        right.rotation.y = 0.3 - flap * 0.5;
      },
    };
  },

  manta(ph) {
    const b = plate(new Builder(), '#2fb4dc');
    const body = new Builder();
    body.octa('#2b3a55', 0.16, 0, 0, 0, 1.45, 0.3, 0.75);
    body.octa('#f1f5f9', 0.12, 0.01, -0.03, 0, 1.4, 0.2, 0.7);
    body.cone('#2b3a55', 0.018, 0.32, 4, -0.36, 0, 0, 0, 0, PI / 2);
    body.box('#2b3a55', 0.09, 0.03, 0.04, 0.24, 0, 0.06, 0, 0.3, 0);
    body.box('#2b3a55', 0.09, 0.03, 0.04, 0.24, 0, -0.06, 0, -0.3, 0);
    const wing = (side) => {
      const w = new Builder();
      w.poly('#2b3a55', [[-0.14, 0], [0.12, 0], [-0.06, 0.32]], 0.03, 0, 0, 0, (PI / 2) * side, 0, 0);
      w.poly('#f1f5f9', [[-0.1, 0.02], [0.08, 0.02], [-0.05, 0.26]], 0.012, 0, -0.022, 0, (PI / 2) * side, 0, 0);
      return w.mesh(0, 0, 0.09 * side);
    };
    const left = wing(1);
    const right = wing(-1);
    const manta = group(body.mesh(), left, right);
    const shadow = new Builder().cyl('#1c94bd', 0.2, 0.2, 0.01, 8, 0, 0, 0).mesh(0, G + 0.006, 0);
    return {
      parts: [b.mesh(), manta, shadow],
      update(t) {
        const a = t * 0.55 + ph;
        const y = G + 0.32 + Math.sin(t * 1.3 + ph) * 0.06;
        manta.position.set(Math.cos(a) * 0.16, y, Math.sin(a) * 0.16);
        manta.rotation.y = -a - PI / 2;
        manta.rotation.x = -0.25;
        const flap = Math.sin(t * 2.6 + ph) * 0.5;
        left.rotation.x = flap;
        right.rotation.x = -flap;
        shadow.position.set(manta.position.x, G + 0.006, manta.position.z);
        shadow.scale.set(1.3, 1, 1.5);
      },
    };
  },

  surf(ph) {
    const b = plate(new Builder(), WATER);
    const wave = new Builder();
    // Profil de la vague : monte depuis la droite et s'enroule en lèvre vers le surfeur
    const profile = [[-0.5, 0], [0.46, 0], [0.24, 0.07], [0.06, 0.24], [0.0, 0.42], [0.08, 0.55], [-0.1, 0.62], [-0.32, 0.5], [-0.46, 0.24]];
    wave.poly('#1ea7d6', profile, 0.7, 0, 0, -0.04);
    wave.poly('#8fe3f7', [[0.46, 0], [0.24, 0.07], [0.06, 0.24], [0.0, 0.42], [0.06, 0.42], [0.14, 0.24], [0.3, 0.09]], 0.704, 0, 0, -0.04);
    wave.poly('#ffffff', [[0.0, 0.47], [0.1, 0.56], [-0.1, 0.65], [-0.2, 0.6], [-0.08, 0.57]], 0.74, 0, 0, -0.04);
    for (let i = 0; i < 4; i++) wave.ball('#ffffff', 0.06, -0.12 - (i % 2) * 0.05, 0.64, -0.32 + i * 0.19);
    const waveMesh = wave.mesh(0.06, G, 0);
    const s = new Builder();
    s.box('#ffffff', 0.44, 0.03, 0.12, 0, 0, 0);
    s.box('#e03131', 0.1, 0.032, 0.122, 0.1, 0, 0);
    s.box('#1d2b53', 0.05, 0.14, 0.05, -0.08, 0.085, 0, 0, 0, 0.25);
    s.box('#1d2b53', 0.05, 0.14, 0.05, 0.08, 0.085, 0, 0, 0, -0.25);
    s.box('#ffd23f', 0.1, 0.15, 0.09, 0, 0.22, 0, 0, 0, -0.15);
    s.ball(SKIN, 0.055, 0.03, 0.35, 0);
    s.box(SKIN, 0.2, 0.035, 0.035, 0.14, 0.27, 0.02, 0, 0, 0.2);
    s.box(SKIN, 0.2, 0.035, 0.035, -0.13, 0.25, -0.02, 0, 0, -0.3);
    const surfer = s.mesh(0.28, G + 0.2, 0.12);
    const foam = new Builder().ball('#ffffff', 0.08, 0, 0, 0).ball('#ffffff', 0.07, 0.1, -0.01, 0.2).ball('#e6fbff', 0.07, -0.05, 0, -0.22).mesh(-0.36, G + 0.05, -0.02);
    return {
      parts: [b.mesh(), waveMesh, surfer, foam],
      update(t) {
        const k = Math.sin(t * 1.6 + ph);
        waveMesh.rotation.z = k * 0.06;
        waveMesh.position.x = 0.06 + k * 0.03;
        waveMesh.scale.y = 1 + Math.sin(t * 3.2 + ph) * 0.05;
        surfer.position.set(0.22 + k * 0.04, G + 0.17 + Math.sin(t * 3.2 + ph) * 0.03, 0.1 + Math.sin(t * 0.8 + ph) * 0.12);
        surfer.rotation.z = -0.5 + k * 0.12;
        surfer.rotation.x = Math.sin(t * 2.3 + ph) * 0.12;
        foam.scale.setScalar(0.9 + Math.sin(t * 5 + ph) * 0.2);
      },
    };
  },

  komodo(ph) {
    const b = plate(new Builder(), '#e6cf8a');
    b.ball('#9a8f7a', 0.09, -0.4, G + 0.03, -0.24, 1.2, 0.7, 1);
    b.cone('#74b84a', 0.05, 0.16, 4, 0.4, G + 0.08, 0.26);
    b.cone('#74b84a', 0.04, 0.12, 4, 0.33, G + 0.06, 0.32);
    const body = new Builder();
    body.ball('#7b7362', 0.13, 0, 0.12, 0, 2, 0.75, 1, 1);
    body.ball('#5f5848', 0.07, -0.05, 0.19, 0, 2.2, 0.5, 0.9);
    body.box('#7b7362', 0.14, 0.08, 0.11, 0.26, 0.15, 0);
    body.box('#8a826f', 0.12, 0.06, 0.09, 0.37, 0.13, 0);
    body.ball('#1d2b53', 0.014, 0.33, 0.185, 0.045);
    body.ball('#1d2b53', 0.014, 0.33, 0.185, -0.045);
    body.box('#ff6b9d', 0.08, 0.012, 0.02, 0.47, 0.11, 0);
    const tail = new Builder().cone('#7b7362', 0.075, 0.42, 5, -0.21, 0, 0, 0, 0, PI / 2).mesh(-0.2, 0.12, 0);
    const legs = (flip) => {
      const l = new Builder();
      l.box('#5f5848', 0.06, 0.12, 0.06, 0.15, -0.05, 0.14 * flip, 0, 0, 0);
      l.box('#5f5848', 0.09, 0.03, 0.07, 0.17, -0.105, 0.15 * flip);
      l.box('#5f5848', 0.06, 0.12, 0.06, -0.14, -0.05, -0.14 * flip);
      l.box('#5f5848', 0.09, 0.03, 0.07, -0.12, -0.105, -0.15 * flip);
      return l.mesh(0, 0.12, 0);
    };
    const legsA = legs(1);
    const legsB = legs(-1);
    const walker = group(body.mesh(), tail, legsA, legsB);
    walker.scale.setScalar(1.05);
    return {
      parts: [b.mesh(), walker],
      update(t) {
        const a = t * 0.45 + ph;
        walker.position.set(Math.cos(a) * 0.13, G, Math.sin(a) * 0.13);
        walker.rotation.y = -a - PI / 2 + Math.sin(t * 4 + ph) * 0.08;
        tail.rotation.y = Math.sin(t * 4 + ph) * 0.45;
        legsA.rotation.z = Math.sin(t * 8 + ph) * 0.35;
        legsB.rotation.z = -Math.sin(t * 8 + ph) * 0.35;
      },
    };
  },

  orangutan(ph) {
    const b = plate(new Builder(), GRASS);
    b.cyl('#7a4b25', 0.07, 0.1, 1.15, 6, -0.34, G + 0.575, -0.05);
    b.cyl('#7a4b25', 0.035, 0.05, 0.72, 5, 0.0, G + 1.08, -0.05, 0, 0, PI / 2);
    b.ball('#2f9e44', 0.26, -0.34, G + 1.19, -0.05, 1.2, 0.75, 1.1);
    b.ball('#40c057', 0.18, 0.2, G + 1.17, -0.1, 1.3, 0.7, 1);
    b.ball('#37b24d', 0.15, -0.05, G + 1.22, 0.08, 1.2, 0.7, 1);
    b.ball('#2f9e44', 0.12, 0.38, G + 0.08, 0.2, 1.2, 0.7, 1);
    const o = new Builder();
    o.box('#e8590c', 0.06, 0.34, 0.06, 0, -0.17, 0); // bras tendu vers la branche
    o.ball('#e8590c', 0.16, 0.04, -0.48, 0, 0.95, 1.15, 0.9, 1);
    o.ball('#c2410c', 0.11, 0.04, -0.6, 0, 1.1, 0.8, 1);
    o.ball('#e8590c', 0.1, 0.06, -0.28, 0.05);
    o.ball('#f6c08a', 0.06, 0.07, -0.29, 0.12, 1.1, 1, 0.6);
    o.ball('#1d2b53', 0.013, 0.045, -0.27, 0.15);
    o.ball('#1d2b53', 0.013, 0.095, -0.27, 0.15);
    o.box('#e8590c', 0.055, 0.3, 0.055, 0.2, -0.48, 0.02, 0, 0, 0.5); // second bras
    o.box('#c2410c', 0.06, 0.2, 0.06, -0.04, -0.7, 0.03, 0, 0, -0.4);
    o.box('#c2410c', 0.06, 0.2, 0.06, 0.14, -0.7, 0.03, 0, 0, 0.4);
    const ape = o.mesh(0.12, G + 1.06, -0.03);
    return {
      parts: [b.mesh(), ape],
      update(t) {
        ape.rotation.z = Math.sin(t * 2.1 + ph) * 0.5;
        ape.rotation.y = Math.sin(t * 1.05 + ph) * 0.3;
      },
    };
  },

  monkey(ph) {
    const b = plate(new Builder(), GRASS);
    b.cyl('#7a4b25', 0.09, 0.12, 0.5, 6, -0.1, G + 0.25, -0.05);
    b.cyl('#7a4b25', 0.05, 0.06, 0.62, 5, 0.12, G + 0.52, -0.05, 0, 0, PI / 2 - 0.15);
    b.ball('#2f9e44', 0.2, -0.3, G + 0.72, -0.12, 1.2, 0.8, 1);
    b.ball('#40c057', 0.16, -0.38, G + 0.5, 0.1, 1.1, 0.8, 1);
    b.ball('#37b24d', 0.13, 0.42, G + 0.66, -0.14, 1.1, 0.8, 1);
    const m = new Builder();
    m.ball('#2b2b2b', 0.14, 0, 0.15, 0, 1, 1.15, 0.95, 1);
    m.box('#2b2b2b', 0.05, 0.16, 0.05, -0.11, 0.1, 0.07, 0, 0, 0.3);
    m.box('#2b2b2b', 0.1, 0.05, 0.06, -0.1, 0.02, 0.1);
    m.box('#2b2b2b', 0.1, 0.05, 0.06, 0.1, 0.02, 0.1);
    m.cone('#2b2b2b', 0.025, 0.12, 4, 0, 0.06, -0.15, -1.2, 0, 0);
    const head = new Builder();
    head.ball('#2b2b2b', 0.1, 0, 0.02, 0, 1, 1, 0.95, 1);
    head.cone('#1a1a1a', 0.045, 0.14, 5, 0, 0.14, -0.01);
    head.ball('#8a6f66', 0.055, 0, -0.01, 0.075, 1.1, 1.2, 0.7);
    head.ball('#ffb86b', 0.017, -0.03, 0.02, 0.105);
    head.ball('#ffb86b', 0.017, 0.03, 0.02, 0.105);
    const headMesh = head.mesh(0, 0.36, 0.02);
    const arm = new Builder().box('#2b2b2b', 0.05, 0.2, 0.05, 0, -0.1, 0).mesh(0.12, 0.25, 0.06);
    const monkey = group(m.mesh(), headMesh, arm);
    return {
      parts: [b.mesh(), monkey],
      update(t) {
        const hop = Math.max(0, Math.sin(t * 2.4 + ph));
        monkey.position.set(0.14, G + 0.56 + hop * hop * 0.14, -0.04);
        monkey.rotation.z = -0.1;
        headMesh.rotation.z = Math.sin(t * 1.7 + ph) * 0.3;
        headMesh.rotation.y = Math.sin(t * 0.9 + ph) * 0.5;
        arm.rotation.z = 2.3 + Math.sin(t * 9 + ph) * 0.35; // se gratte la tête
      },
    };
  },

  'house-cone'(ph) {
    const b = plate(new Builder(), '#7ccf52');
    const hut = (x, z, r, h, tone) => {
      b.cyl('#5a4334', r * 0.72, r * 0.72, 0.1, 8, x, G + 0.05, z);
      b.cone(tone, r, h, 8, x, G + 0.06 + h / 2, z);
      b.cone('#8a6a2f', r * 0.5, h * 0.5, 8, x, G + 0.06 + h * 0.76, z);
      b.cyl('#5a4334', 0.012, 0.012, 0.1, 4, x, G + 0.1 + h, z);
      b.box('#2a2222', r * 0.3, 0.1, 0.02, x, G + 0.07, z + r * 0.72);
    };
    hut(-0.16, -0.1, 0.34, 0.72, '#c9a352');
    hut(0.26, 0.14, 0.24, 0.52, '#b58d3d');
    b.ball('#2f9e44', 0.1, -0.42, G + 0.06, 0.26, 1.1, 0.8, 1);
    b.cyl(STONE, 0.1, 0.1, 0.03, 7, 0.02, G + 0.015, 0.36);
    const puffs = [puff(0.06), puff(0.06)];
    return {
      parts: [b.mesh(), ...puffs],
      update(t) {
        puffs.forEach((p, i) => rise(p, (t * 0.3 + i / 2 + ph) % 1, -0.16, G + 0.84, -0.1, 0.5, 0.14, 1.3));
      },
    };
  },

  'house-toraja'(ph) {
    const b = plate(new Builder(), GRASS);
    for (const x of [-0.24, 0, 0.24]) for (const z of [-0.12, 0.12]) b.box('#4a3628', 0.04, 0.22, 0.04, x - 0.08, G + 0.11, z - 0.06);
    b.box('#7b3f1d', 0.6, 0.2, 0.34, -0.08, G + 0.32, -0.06);
    b.box('#c92a2a', 0.5, 0.07, 0.345, -0.08, G + 0.31, -0.06);
    b.box('#ffd23f', 0.5, 0.02, 0.35, -0.08, G + 0.36, -0.06);
    b.poly('#3a2a26', saddle(0.56, 0.5, 0.9, 0.2), 0.42, -0.08, G, -0.06);
    b.poly('#c92a2a', saddle(0.5, 0.48, 0.82, 0.05), 0.3, -0.08, G, -0.06);
    b.poly('#ffd23f', saddle(0.57, 0.62, 0.93, 0.03), 0.04, -0.08, G + 0.02, -0.06);
    b.box('#4a3628', 0.035, 0.5, 0.035, -0.58, G + 0.45, -0.06);
    b.box('#4a3628', 0.035, 0.5, 0.035, 0.42, G + 0.45, -0.06);
    // Buffle
    b.box('#4b4f58', 0.26, 0.14, 0.13, 0.3, G + 0.16, 0.3);
    for (const [x, z] of [[0.2, 0.26], [0.4, 0.26], [0.2, 0.34], [0.4, 0.34]]) b.box('#33363d', 0.04, 0.1, 0.04, x, G + 0.05, z);
    const head = new Builder();
    head.box('#4b4f58', 0.12, 0.1, 0.11, -0.06, -0.02, 0);
    head.box('#ffffff', 0.03, 0.03, 0.26, -0.05, 0.04, 0);
    head.box('#ffffff', 0.03, 0.08, 0.03, -0.05, 0.08, 0.13);
    head.box('#ffffff', 0.03, 0.08, 0.03, -0.05, 0.08, -0.13);
    const headMesh = head.mesh(0.18, G + 0.22, 0.3);
    return {
      parts: [b.mesh(), headMesh],
      update(t) {
        headMesh.rotation.z = 0.25 + Math.sin(t * 1.6 + ph) * 0.35;
        headMesh.rotation.y = Math.sin(t * 0.7 + ph) * 0.2;
      },
    };
  },

  'house-horn'(ph) {
    const b = plate(new Builder(), GRASS);
    for (const x of [-0.34, -0.12, 0.12, 0.34]) b.box('#4a3628', 0.04, 0.14, 0.3, x, G + 0.07, -0.04);
    b.box('#9c4a1a', 0.86, 0.22, 0.34, 0, G + 0.25, -0.04);
    b.box('#ffd23f', 0.86, 0.025, 0.35, 0, G + 0.3, -0.04);
    for (const x of [-0.28, 0, 0.28]) b.box('#2a2222', 0.09, 0.1, 0.02, x, G + 0.24, 0.135);
    b.box('#d9c8a0', 0.12, 0.03, 0.2, 0, G + 0.1, 0.22, 0.6);
    // Deux toits en selle emboîtés : quatre cornes
    b.poly('#4a3a34', saddle(0.58, 0.4, 0.78, 0.18), 0.4, 0, G, -0.04);
    b.poly('#5c4840', saddle(0.34, 0.56, 0.98, 0.16), 0.32, 0, G, -0.04);
    for (const [x, y] of [[-0.58, 0.78], [0.58, 0.78], [-0.34, 0.98], [0.34, 0.98]]) b.cone('#ffd23f', 0.022, 0.1, 4, x, G + y + 0.04, -0.04);
    b.cyl('#6b4423', 0.012, 0.012, 0.6, 4, -0.46, G + 0.3, 0.3);
    b.cyl('#6b4423', 0.012, 0.012, 0.6, 4, 0.46, G + 0.3, 0.3);
    const f1 = flag('#e03131', '#ffd23f', 0.05, 0.36);
    const f2 = flag('#1d2b53', '#ffd23f', 0.05, 0.36);
    f1.position.set(-0.455, G + 0.42, 0.3);
    f2.position.set(0.465, G + 0.42, 0.3);
    return {
      parts: [b.mesh(), f1, f2],
      update(t) {
        f1.rotation.y = Math.sin(t * 2.4 + ph) * 0.6;
        f2.rotation.y = Math.sin(t * 2.1 + ph + 1) * 0.6;
        f1.scale.x = 1 + Math.sin(t * 5 + ph) * 0.2;
        f2.scale.x = 1 + Math.cos(t * 5 + ph) * 0.2;
      },
    };
  },

  'house-sumba'(ph) {
    const b = plate(new Builder(), '#e3c56a');
    for (const [x, z] of [[-0.24, -0.2], [0.12, -0.2], [-0.24, 0.1], [0.12, 0.1]]) b.box('#4a3628', 0.04, 0.18, 0.04, x, G + 0.09, z);
    b.box('#a67c52', 0.5, 0.12, 0.44, -0.06, G + 0.22, -0.05);
    b.add(new THREE.CylinderGeometry(0.17, 0.5, 0.22, 4), '#c9a352', -0.06, G + 0.39, -0.05, 0, PI / 4, 0);
    b.add(new THREE.CylinderGeometry(0.06, 0.17, 0.7, 4), '#b58d3d', -0.06, G + 0.85, -0.05, 0, PI / 4, 0);
    b.box('#8a6a2f', 0.16, 0.03, 0.03, -0.06, G + 1.21, -0.05);
    b.box('#8a6a2f', 0.025, 0.1, 0.025, -0.13, G + 1.26, -0.05, 0, 0, 0.4);
    b.box('#8a6a2f', 0.025, 0.1, 0.025, 0.01, G + 1.26, -0.05, 0, 0, -0.4);
    // Tombeau mégalithique
    b.box('#b7b2a6', 0.26, 0.05, 0.18, 0.32, G + 0.13, 0.28);
    for (const [x, z] of [[0.23, 0.22], [0.41, 0.22], [0.23, 0.34], [0.41, 0.34]]) b.box('#9a958a', 0.04, 0.1, 0.04, x, G + 0.05, z);
    b.cyl('#6b4423', 0.012, 0.012, 0.7, 4, -0.44, G + 0.35, 0.26);
    const banner = flag('#e03131', '#ffffff', 0.2, 0.12);
    banner.position.set(-0.435, G + 0.62, 0.26);
    return {
      parts: [b.mesh(), banner],
      update(t) {
        banner.rotation.y = Math.sin(t * 2.6 + ph) * 0.55;
        banner.scale.x = 1 + Math.sin(t * 5.5 + ph) * 0.15;
      },
    };
  },

  'house-stilt'(ph) {
    const b = plate(new Builder(), WATER);
    for (const [x, z] of [[-0.3, -0.26], [0.1, -0.26], [-0.3, 0.06], [0.1, 0.06]]) b.box('#6b4423', 0.035, 0.24, 0.035, x, G + 0.12, z);
    b.box('#a67c52', 0.56, 0.035, 0.46, -0.1, G + 0.25, -0.1);
    b.box('#fff3d6', 0.4, 0.2, 0.3, -0.12, G + 0.37, -0.14);
    b.box('#5a4334', 0.09, 0.14, 0.02, -0.12, G + 0.34, 0.015);
    b.pyr('#c49a4a', 0.36, 0.3, -0.12, G + 0.62, -0.14);
    b.pyr('#a67f35', 0.2, 0.2, -0.12, G + 0.72, -0.14);
    // Ponton
    b.box('#a67c52', 0.14, 0.03, 0.42, 0.26, G + 0.13, 0.16);
    b.box('#a67c52', 0.14, 0.03, 0.2, 0.2, G + 0.19, 0.0, 0.6);
    for (const z of [0.02, 0.34]) for (const x of [0.2, 0.32]) b.box('#6b4423', 0.03, 0.14, 0.03, x, G + 0.06, z);
    const c = new Builder();
    c.poly('#ffd23f', [[-0.2, 0.06], [0.2, 0.06], [0.13, -0.03], [-0.13, -0.03]], 0.09);
    c.poly('#e03131', [[-0.2, 0.06], [-0.14, 0.06], [-0.09, -0.03], [-0.13, -0.03]], 0.092);
    c.box('#6b4423', 0.3, 0.012, 0.012, 0, 0.05, 0.12);
    c.box('#6b4423', 0.012, 0.012, 0.1, -0.08, 0.05, 0.08);
    c.box('#6b4423', 0.012, 0.012, 0.1, 0.08, 0.05, 0.08);
    const canoe = c.mesh(0.02, G + 0.03, 0.4);
    return {
      parts: [b.mesh(), canoe],
      update(t) {
        canoe.rotation.z = Math.sin(t * 1.9 + ph) * 0.14;
        canoe.rotation.x = Math.sin(t * 1.3 + ph) * 0.1;
        canoe.position.y = G + 0.035 + Math.sin(t * 2.2 + ph) * 0.012;
      },
    };
  },

  skyline(ph) {
    const b = plate(new Builder(), STONE);
    const towers = [
      [-0.3, -0.18, 0.2, 1.0, '#339af0'],
      [-0.06, -0.26, 0.2, 0.74, '#4dabf7'],
      [0.2, -0.2, 0.22, 1.05, '#1c7ed6'],
      [0.36, 0.04, 0.16, 0.6, '#3bc9db'],
      [-0.38, 0.1, 0.16, 0.5, '#748ffc'],
    ];
    for (const [x, z, w, h, c] of towers) {
      b.box(c, w, h, w, x, G + h / 2, z);
      for (let y = 0.14; y < h - 0.05; y += 0.16) b.box('#d0ebff', w + 0.006, 0.035, w + 0.006, x, G + y, z);
      b.box('#e9ecef', w * 0.6, 0.04, w * 0.6, x, G + h + 0.02, z);
    }
    // Monument national : obélisque blanc à flamme dorée
    b.cyl('#e9ecef', 0.15, 0.17, 0.05, 8, 0.02, G + 0.025, 0.28);
    b.cyl('#ffffff', 0.09, 0.05, 0.06, 4, 0.02, G + 0.08, 0.28, 0, PI / 4, 0);
    b.cyl('#ffffff', 0.022, 0.04, 0.5, 4, 0.02, G + 0.36, 0.28, 0, PI / 4, 0);
    b.box('#ffffff', 0.07, 0.02, 0.07, 0.02, G + 0.62, 0.28);
    const flame = new Builder().octa('#ffd23f', 0.045, 0, 0, 0, 1, 1.6, 1).mesh(0.02, G + 0.7, 0.28);
    const beacon = new Builder().ball('#ff3b4e', 0.03, 0, 0, 0).mesh(0.2, G + 1.11, -0.2);
    const heli = new Builder().ball('#e03131', 0.06, 0, 0, 0, 1.4, 0.9, 0.9).box('#e03131', 0.14, 0.02, 0.02, -0.12, 0.01, 0).box('#1d2b53', 0.02, 0.05, 0.02, 0, 0.06, 0).mesh();
    const rotor = new Builder().box('#1d2b53', 0.26, 0.008, 0.03, 0, 0, 0).box('#1d2b53', 0.03, 0.008, 0.26, 0, 0, 0).mesh(0, 0.09, 0);
    const chopper = group(heli, rotor);
    return {
      parts: [b.mesh(), flame, beacon, chopper],
      update(t) {
        flame.rotation.y = t * 2 + ph;
        flame.scale.setScalar(0.85 + 0.3 * Math.abs(Math.sin(t * 4 + ph)));
        beacon.scale.setScalar(Math.sin(t * 5 + ph) > 0 ? 1.4 : 0.35);
        const a = t * 0.8 + ph;
        chopper.position.set(Math.cos(a) * 0.36, G + 1.23 + Math.sin(t * 1.5 + ph) * 0.02, Math.sin(a) * 0.3);
        chopper.rotation.y = -a - PI / 2;
        rotor.rotation.y = t * 22;
      },
    };
  },

  tea(ph) {
    const b = plate(new Builder(), '#6fbf4b');
    // Colline en gradins couverte de rangées de théiers
    for (let row = 0; row < 5; row++) {
      const z = -0.36 + row * 0.17;
      const y = G + 0.34 - row * 0.075;
      b.box('#4a8f3a', 1.0 - Math.abs(row - 2) * 0.12, y - G + 0.02, 0.18, 0, G + (y - G) / 2, z);
      const n = row === 0 || row === 4 ? 4 : 5;
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * 0.19;
        b.ball((i + row) % 2 ? '#2f9e44' : '#237a36', 0.085, x, y + 0.035, z, 1.15, 0.75, 1);
      }
    }
    b.cone('#1f6b33', 0.07, 0.3, 5, 0.42, G + 0.5, -0.36);
    b.cyl('#6b4423', 0.015, 0.015, 0.12, 4, 0.42, G + 0.38, -0.36);
    const p = person(new Builder(), '#e64980', '#f2d16b');
    p.cyl('#c49a4a', 0.045, 0.035, 0.08, 6, 0, 0.12, -0.07);
    const picker = p.mesh();
    return {
      parts: [b.mesh(), picker],
      update(t) {
        const x = Math.sin(t * 0.45 + ph) * 0.32;
        picker.position.set(x, G + 0.13, 0.07);
        picker.rotation.y = Math.cos(t * 0.45 + ph) > 0 ? 0.6 : -0.6;
        picker.rotation.x = -0.5 - Math.max(0, Math.sin(t * 4 + ph)) * 0.5;
      },
    };
  },

  jeep(ph) {
    const b = plate(new Builder(), '#9c958c');
    b.cone('#6f6962', 0.2, 0.2, 6, 0, G + 0.1, 0);
    b.cyl('#3b3632', 0.07, 0.09, 0.02, 6, 0, G + 0.2, 0);
    b.ball('#7d766d', 0.07, -0.42, G + 0.03, -0.2, 1.2, 0.7, 1);
    const j = new Builder();
    j.box('#e03131', 0.34, 0.1, 0.19, 0, 0.11, 0);
    j.box('#e03131', 0.13, 0.03, 0.19, 0.11, 0.17, 0);
    j.box('#c92a2a', 0.02, 0.09, 0.19, 0.04, 0.21, 0, 0, 0, -0.2);
    j.box('#a5d8ff', 0.012, 0.07, 0.15, 0.047, 0.21, 0, 0, 0, -0.2);
    j.box('#ffffff', 0.17, 0.02, 0.2, -0.085, 0.27, 0);
    j.box('#1d2b53', 0.02, 0.1, 0.02, -0.16, 0.21, 0.085);
    j.box('#1d2b53', 0.02, 0.1, 0.02, -0.16, 0.21, -0.085);
    j.box('#ffd23f', 0.02, 0.03, 0.04, 0.175, 0.12, 0.06);
    j.box('#ffd23f', 0.02, 0.03, 0.04, 0.175, 0.12, -0.06);
    for (const [x, z] of [[0.11, 0.1], [-0.11, 0.1], [0.11, -0.1], [-0.11, -0.1]]) j.cyl('#1d1d1d', 0.06, 0.06, 0.05, 8, x, 0.06, z, PI / 2);
    j.cyl('#1d1d1d', 0.055, 0.055, 0.04, 8, -0.19, 0.14, 0, 0, 0, PI / 2);
    const jeep = j.mesh();
    const dust = puff(0.06);
    return {
      parts: [b.mesh(), jeep, dust],
      update(t) {
        const a = t * 0.9 + ph;
        const bounce = Math.abs(Math.sin(t * 7 + ph)) * 0.025;
        jeep.position.set(Math.cos(a) * 0.34, G + bounce, Math.sin(a) * 0.34);
        jeep.rotation.y = -a - PI / 2;
        jeep.rotation.z = Math.sin(t * 7 + ph) * 0.05;
        const k = (t * 1.6 + ph) % 1;
        const back = a - 0.5 - k * 0.5;
        dust.position.set(Math.cos(back) * 0.34, G + 0.05 + k * 0.1, Math.sin(back) * 0.34);
        dust.scale.setScalar((0.5 + k) * Math.sin(k * PI));
      },
    };
  },

  fort(ph) {
    const b = plate(new Builder(), GRASS);
    b.cyl('#e9dcc0', 0.4, 0.44, 0.2, 5, 0, G + 0.1, 0);
    b.cyl('#b7a57f', 0.3, 0.3, 0.202, 5, 0, G + 0.1, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2 + PI / 2;
      b.cyl('#f1e7cf', 0.09, 0.12, 0.26, 4, Math.cos(a) * 0.43, G + 0.13, Math.sin(a) * 0.43, 0, -a + PI / 4, 0);
    }
    b.cyl('#e9dcc0', 0.15, 0.17, 0.36, 8, 0, G + 0.38, 0);
    for (let i = 0; i < 8; i += 2) b.box('#f1e7cf', 0.06, 0.05, 0.06, Math.cos((i / 8) * PI * 2) * 0.13, G + 0.585, Math.sin((i / 8) * PI * 2) * 0.13);
    b.box('#5a4334', 0.07, 0.11, 0.02, 0, G + 0.26, 0.165);
    b.cyl('#6b4423', 0.012, 0.012, 0.5, 4, 0, G + 0.8, 0);
    b.box('#3b3b36', 0.14, 0.04, 0.04, 0.22, G + 0.22, 0.2, 0, 0.6, 0); // canon
    const banner = flag('#e03131', '#ffffff', 0.26, 0.16);
    banner.position.set(0.008, G + 0.96, 0);
    return {
      parts: [b.mesh(), banner],
      update(t) {
        banner.rotation.y = Math.sin(t * 2.5 + ph) * 0.5;
        banner.scale.x = 1 + Math.sin(t * 6 + ph) * 0.15;
      },
    };
  },

  market(ph) {
    const b = plate(new Builder(), '#ecdcae');
    for (const [x, z] of [[-0.36, -0.14], [0.36, -0.14], [-0.36, 0.18], [0.36, 0.18]]) b.box('#6b4423', 0.03, 0.56, 0.03, x, G + 0.28, z);
    b.box('#a67c52', 0.78, 0.04, 0.36, 0, G + 0.2, 0.02);
    b.box('#8d5a2b', 0.74, 0.16, 0.3, 0, G + 0.1, 0.02);
    const spices = ['#e03131', '#ffd23f', '#ff922b', '#8d5a2b', '#74b816'];
    spices.forEach((c, i) => {
      const x = -0.28 + i * 0.14;
      b.cyl('#d9b384', 0.06, 0.045, 0.05, 7, x, G + 0.245, 0.1);
      b.cone(c, 0.055, 0.07, 7, x, G + 0.3, 0.1);
    });
    b.ball('#74b816', 0.045, -0.2, G + 0.26, -0.06);
    b.ball('#ffd23f', 0.045, -0.08, G + 0.26, -0.06);
    b.ball('#e8590c', 0.045, 0.05, G + 0.26, -0.06);
    const awning = new Builder();
    for (let i = 0; i < 6; i++) awning.box(i % 2 ? '#ffffff' : '#e03131', 0.14, 0.025, 0.5, -0.35 + i * 0.14, 0, 0.02);
    for (let i = 0; i < 6; i++) awning.box(i % 2 ? '#ffffff' : '#e03131', 0.14, 0.07, 0.02, -0.35 + i * 0.14, -0.04, 0.27);
    const awningMesh = awning.mesh(0, G + 0.6, 0);
    const vendor = person(new Builder(), '#7048e8', '#f2d16b', 0, 0, 0, 1.15).mesh();
    return {
      parts: [b.mesh(), awningMesh, vendor],
      update(t) {
        awningMesh.rotation.x = 0.16 + Math.sin(t * 1.8 + ph) * 0.06;
        awningMesh.rotation.z = Math.sin(t * 1.3 + ph) * 0.03;
        vendor.position.set(Math.sin(t * 0.6 + ph) * 0.2, G, -0.24);
        vendor.rotation.y = Math.sin(t * 1.2 + ph) * 0.6;
        vendor.rotation.x = Math.max(0, Math.sin(t * 2.2 + ph)) * 0.3;
      },
    };
  },

  palm(ph) {
    const b = plate(new Builder(), SAND);
    b.poly(WATER, [[-0.52, 0], [0.52, 0], [0.4, 0.2], [0.1, 0.1], [-0.2, 0.2], [-0.42, 0.16]], 0.012, 0, G + 0.007, 0.5, -PI / 2, 0, 0);
    const [ax, ay, az] = palmTrunk(b, -0.3, -0.12, 0.85, 0.2);
    const [bx, by, bz] = palmTrunk(b, 0.02, -0.26, 0.62, -0.14);
    // Parasol et transat
    b.cyl('#ffffff', 0.012, 0.012, 0.36, 4, 0.28, G + 0.18, 0.1);
    b.cone('#e03131', 0.2, 0.1, 8, 0.28, G + 0.4, 0.1);
    b.cyl('#ffffff', 0.2, 0.2, 0.012, 8, 0.28, G + 0.35, 0.1);
    b.box('#4dabf7', 0.2, 0.025, 0.1, 0.22, G + 0.06, 0.26, 0, 0, 0.0);
    b.box('#4dabf7', 0.1, 0.025, 0.1, 0.36, G + 0.1, 0.26, 0, 0, 0.9);
    b.ball('#ff922b', 0.045, -0.08, G + 0.045, 0.3);
    const leavesA = palmLeaves().mesh(ax, ay + 0.045, az);
    const leavesB = palmLeaves().mesh(bx, by + 0.045, bz);
    leavesB.scale.setScalar(0.85);
    return {
      parts: [b.mesh(), leavesA, leavesB],
      update(t) {
        leavesA.rotation.z = Math.sin(t * 1.5 + ph) * 0.16;
        leavesA.rotation.x = Math.cos(t * 1.1 + ph) * 0.1;
        leavesB.rotation.z = Math.sin(t * 1.3 + ph + 1) * 0.16;
        leavesB.rotation.x = Math.cos(t * 1.7 + ph) * 0.1;
      },
    };
  },

  karst(ph) {
    const b = plate(new Builder(), WATER);
    const islet = (x, z, r, h) => {
      b.cyl('#cbb994', r * 0.95, r * 0.6, h, 7, x, G + h / 2, z);
      b.ball('#2f9e44', r, x, G + h, z, 1.15, 0.7, 1.15, 1);
      b.ball('#51cf66', r * 0.6, x - r * 0.2, G + h + r * 0.4, z, 1.1, 0.7, 1.1);
    };
    islet(-0.26, -0.18, 0.2, 0.34);
    islet(0.24, -0.26, 0.15, 0.24);
    islet(0.3, 0.2, 0.17, 0.28);
    islet(-0.3, 0.3, 0.11, 0.16);
    islet(0.0, 0.02, 0.09, 0.12);
    const boat = new Builder();
    boat.poly('#ffffff', [[-0.11, 0.05], [0.13, 0.05], [0.08, -0.02], [-0.08, -0.02]], 0.07);
    boat.box('#e03131', 0.24, 0.015, 0.072, 0.01, 0.05, 0);
    boat.poly('#ffd23f', [[0, 0.07], [0, 0.24], [0.1, 0.07]], 0.012);
    const boatMesh = boat.mesh();
    return {
      parts: [b.mesh(), boatMesh],
      update(t) {
        const a = t * 0.5 + ph;
        // Trajet en huit entre les îlots
        boatMesh.position.set(Math.sin(a) * 0.1 - 0.02, G + 0.03 + Math.sin(t * 2.4 + ph) * 0.01, 0.16 + Math.sin(a * 2) * 0.1);
        boatMesh.rotation.y = -Math.atan2(Math.cos(a * 2) * 0.2, Math.cos(a) * 0.1);
        boatMesh.rotation.z = Math.sin(t * 2.2 + ph) * 0.1;
      },
    };
  },

  horse(ph) {
    const b = plate(new Builder(), '#e3c56a');
    b.cone('#b8a24a', 0.05, 0.14, 4, -0.4, G + 0.07, 0.2);
    b.cone('#b8a24a', 0.04, 0.1, 4, 0.42, G + 0.05, -0.18);
    const body = new Builder();
    body.ball('#8d5524', 0.15, 0, 0.35, 0, 1.75, 0.95, 0.9, 1);
    body.box('#8d5524', 0.12, 0.22, 0.11, 0.22, 0.47, 0, 0, 0, -0.75); // encolure
    body.box('#8d5524', 0.21, 0.1, 0.1, 0.36, 0.54, 0, 0, 0, -0.55); // tête
    body.box('#a8703a', 0.07, 0.07, 0.085, 0.44, 0.49, 0, 0, 0, -0.55);
    body.box('#3b2412', 0.05, 0.22, 0.04, 0.17, 0.52, 0, 0, 0, -0.75); // crinière
    body.cone('#8d5524', 0.022, 0.07, 4, 0.29, 0.65, 0.035);
    body.cone('#8d5524', 0.022, 0.07, 4, 0.29, 0.65, -0.035);
    body.ball('#1d2b53', 0.015, 0.37, 0.575, 0.052);
    body.ball('#1d2b53', 0.015, 0.37, 0.575, -0.052);
    body.box('#e03131', 0.13, 0.025, 0.24, -0.02, 0.47, 0);
    const pair = (x) => {
      const l = new Builder();
      l.box('#7a4a1f', 0.045, 0.26, 0.045, 0, -0.13, 0.06);
      l.box('#7a4a1f', 0.045, 0.26, 0.045, 0, -0.13, -0.06);
      l.box('#2a1a0d', 0.05, 0.04, 0.05, 0, -0.26, 0.06);
      l.box('#2a1a0d', 0.05, 0.04, 0.05, 0, -0.26, -0.06);
      return l.mesh(x, 0.3, 0);
    };
    const front = pair(0.15);
    const hind = pair(-0.17);
    const tail = new Builder().box('#3b2412', 0.05, 0.26, 0.05, 0, -0.12, 0).mesh(-0.25, 0.42, 0);
    const horse = group(body.mesh(), front, hind, tail);
    horse.scale.setScalar(1.05);
    return {
      parts: [b.mesh(), horse],
      update(t) {
        const a = t * 0.9 + ph;
        const s = Math.sin(t * 9 + ph);
        horse.position.set(Math.cos(a) * 0.15, G + Math.abs(s) * 0.05, Math.sin(a) * 0.15);
        horse.rotation.y = -a - PI / 2;
        horse.rotation.z = s * 0.08;
        front.rotation.z = s * 0.7;
        hind.rotation.z = -s * 0.7;
        tail.rotation.z = -0.9 + Math.cos(t * 9 + ph) * 0.3;
      },
    };
  },

  boat(ph) {
    const b = plate(new Builder(), WATER);
    const s = new Builder();
    // Coque vue de profil, relevée à la proue
    s.poly('#6b3e1e', [[-0.46, 0.14], [0.56, 0.2], [0.36, 0], [-0.36, 0]], 0.24);
    s.poly('#ffffff', [[-0.46, 0.14], [0.56, 0.2], [0.53, 0.165], [-0.44, 0.105]], 0.244);
    s.box('#a67c52', 0.26, 0.1, 0.16, -0.22, 0.2, 0);
    s.box('#fff3d6', 0.3, 0.02, 0.2, -0.22, 0.26, 0);
    s.cyl('#4a3628', 0.016, 0.016, 0.82, 4, 0.14, 0.56, 0);
    s.cyl('#4a3628', 0.014, 0.014, 0.62, 4, -0.2, 0.52, 0);
    s.cyl('#4a3628', 0.012, 0.012, 0.44, 4, 0.56, 0.3, 0, 0, 0, -1.15);
    s.poly('#fff3d6', [[0.16, 0.26], [0.16, 0.92], [-0.12, 0.34]], 0.014, 0, 0, 0.012);
    s.poly('#ffe8b0', [[-0.18, 0.3], [-0.18, 0.8], [-0.44, 0.34]], 0.014, 0, 0, 0.012);
    s.poly('#fff3d6', [[0.18, 0.3], [0.18, 0.86], [0.72, 0.36]], 0.014, 0, 0, -0.012);
    s.box('#e03131', 0.1, 0.035, 0.012, 0.19, 0.97, 0);
    s.box('#ffffff', 0.1, 0.035, 0.012, 0.19, 0.935, 0);
    const ship = s.mesh(-0.04, G + 0.02, 0);
    ship.scale.setScalar(0.92);
    const wake = new Builder().ball('#ffffff', 0.06, 0, 0, 0.1).ball('#ffffff', 0.05, -0.08, 0, -0.1).ball('#e6fbff', 0.05, -0.14, 0, 0.04).mesh(-0.44, G + 0.02, 0);
    return {
      parts: [b.mesh(), ship, wake],
      update(t) {
        ship.rotation.z = Math.sin(t * 1.5 + ph) * 0.09;
        ship.rotation.x = Math.sin(t * 1.1 + ph) * 0.08;
        ship.position.y = G + 0.02 + Math.sin(t * 1.9 + ph) * 0.02;
        wake.scale.setScalar(0.8 + Math.sin(t * 4 + ph) * 0.25);
      },
    };
  },

  mosque(ph) {
    const b = plate(new Builder(), '#e9ecef');
    b.box('#ffffff', 0.62, 0.26, 0.5, 0, G + 0.13, -0.04);
    b.box('#d3f9d8', 0.66, 0.03, 0.54, 0, G + 0.275, -0.04);
    for (const x of [-0.2, 0, 0.2]) {
      b.box('#1f6b33', 0.1, 0.14, 0.02, x, G + 0.09, 0.215);
      b.cyl('#1f6b33', 0.05, 0.05, 0.02, 8, x, G + 0.16, 0.215, PI / 2);
    }
    b.cyl('#ffffff', 0.2, 0.22, 0.1, 8, 0, G + 0.34, -0.04);
    b.ball('#2f9e44', 0.2, 0, G + 0.42, -0.04, 1, 1.05, 1, 1);
    b.cone('#ffd23f', 0.02, 0.1, 5, 0, G + 0.66, -0.04);
    for (const [x, z] of [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.26], [0.4, 0.26]]) {
      b.cyl('#ffffff', 0.04, 0.05, 0.72, 6, x, G + 0.36, z);
      b.cyl('#d3f9d8', 0.065, 0.065, 0.03, 6, x, G + 0.6, z);
      b.cone('#2f9e44', 0.055, 0.14, 6, x, G + 0.79, z);
    }
    b.ball('#40c057', 0.08, -0.2, G + 0.33, 0.12, 1, 0.9, 1);
    b.ball('#40c057', 0.08, 0.2, G + 0.33, 0.12, 1, 0.9, 1);
    const crescent = new Builder().add(new THREE.TorusGeometry(0.055, 0.016, 4, 9, PI * 1.45), '#ffd23f', 0, 0.06, 0, 0, 0, PI * 0.8).cyl('#ffd23f', 0.008, 0.008, 0.06, 4, 0, -0.01, 0).mesh(0, G + 0.74, -0.04);
    return {
      parts: [b.mesh(), crescent],
      update(t) {
        crescent.rotation.y = t * 1.2 + ph;
        crescent.position.y = G + 0.74 + Math.sin(t * 2 + ph) * 0.01;
      },
    };
  },

  plane(ph) {
    const b = plate(new Builder(), GRASS);
    b.box('#5c6570', 0.98, 0.012, 0.22, 0, G + 0.007, 0.1, 0, 0.35, 0);
    for (let i = -2; i <= 2; i++) b.box('#ffffff', 0.09, 0.014, 0.025, i * 0.19, G + 0.009, 0.1 - i * 0.07, 0, 0.35, 0);
    b.cyl('#e9ecef', 0.045, 0.055, 0.3, 6, -0.36, G + 0.15, -0.3);
    b.cyl('#a5d8ff', 0.085, 0.07, 0.07, 6, -0.36, G + 0.33, -0.3);
    b.cyl('#e9ecef', 0.09, 0.09, 0.015, 6, -0.36, G + 0.37, -0.3);
    const p = new Builder();
    p.cyl('#ffffff', 0.055, 0.055, 0.44, 7, 0, 0, 0, 0, 0, PI / 2);
    p.cone('#ffffff', 0.055, 0.12, 7, 0.28, 0, 0, 0, 0, -PI / 2);
    p.cone('#ffffff', 0.055, 0.14, 7, -0.29, 0.005, 0, 0, 0, PI / 2);
    p.box('#a5d8ff', 0.06, 0.03, 0.09, 0.2, 0.03, 0);
    p.poly('#e03131', [[-0.09, 0], [0.09, 0], [0.01, 0.34], [-0.07, 0.34]], 0.022, 0.02, -0.02, 0.04, PI / 2, 0, 0);
    p.poly('#e03131', [[-0.09, 0], [0.09, 0], [0.01, 0.34], [-0.07, 0.34]], 0.022, 0.02, -0.02, -0.04, -PI / 2, 0, 0);
    p.poly('#e03131', [[-0.34, 0.03], [-0.2, 0.03], [-0.3, 0.2], [-0.36, 0.2]], 0.02);
    p.box('#e03131', 0.09, 0.015, 0.24, -0.3, 0.03, 0);
    p.cyl('#748ffc', 0.028, 0.028, 0.09, 6, 0.06, -0.06, 0.15, 0, 0, PI / 2);
    p.cyl('#748ffc', 0.028, 0.028, 0.09, 6, 0.06, -0.06, -0.15, 0, 0, PI / 2);
    const plane = p.mesh();
    const light = new Builder().ball('#ff3b4e', 0.025, 0, 0, 0).mesh(-0.36, G + 0.41, -0.3);
    return {
      parts: [b.mesh(), plane, light],
      update(t) {
        const a = t * 0.9 + ph;
        plane.position.set(Math.cos(a) * 0.3, G + 0.78 + Math.sin(t * 1.3 + ph) * 0.05, Math.sin(a) * 0.3);
        plane.rotation.set(0, -a - PI / 2, 0);
        plane.rotateX(0.5); // s'incline vers l'intérieur du virage
        light.scale.setScalar(Math.sin(t * 6 + ph) > 0.3 ? 1.5 : 0.4);
      },
    };
  },

  bridge(ph) {
    const b = plate(new Builder(), '#35b7e0');
    b.box('#8fd36a', 0.22, 0.1, 0.9, -0.47, G + 0.05, 0);
    b.box('#8fd36a', 0.22, 0.1, 0.9, 0.47, G + 0.05, 0);
    b.box('#adb5bd', 1.1, 0.045, 0.2, 0, G + 0.3, -0.04);
    b.box('#ffffff', 1.1, 0.012, 0.02, 0, G + 0.326, -0.04);
    for (const x of [-0.5, 0.5]) b.box('#868e96', 0.08, 0.3, 0.2, x, G + 0.15, -0.04);
    for (const x of [-0.2, 0.2]) {
      for (const z of [-0.14, 0.06]) b.box('#e03131', 0.05, 0.86, 0.05, x, G + 0.43, z);
      b.box('#e03131', 0.07, 0.06, 0.26, x, G + 0.86, -0.04);
      b.box('#c92a2a', 0.06, 0.04, 0.24, x, G + 0.6, -0.04);
      b.cone('#ffd23f', 0.035, 0.07, 4, x, G + 0.93, -0.04);
      // Haubans
      for (const dir of [-1, 1]) for (const z of [-0.14, 0.06]) b.box('#e03131', 0.012, 0.46, 0.012, x + dir * 0.13, G + 0.55, z, 0, 0, dir * 0.55);
    }
    const boat = new Builder();
    boat.poly('#ffd23f', [[-0.12, 0.06], [0.14, 0.06], [0.09, -0.02], [-0.09, -0.02]], 0.08, 0, 0, 0, 0, PI / 2, 0);
    boat.box('#ffffff', 0.06, 0.06, 0.1, 0, 0.09, 0.02);
    boat.box('#e03131', 0.065, 0.015, 0.11, 0, 0.125, 0.02);
    const boatMesh = boat.mesh();
    return {
      parts: [b.mesh(), boatMesh],
      update(t) {
        const k = (t * 0.22 + ph) % 1;
        boatMesh.position.set(Math.sin(k * PI * 2) * 0.03, G + 0.03 + Math.sin(t * 2.5 + ph) * 0.008, 0.46 - k * 0.92);
        // Apparaît et disparaît en douceur aux deux bouts du fleuve
        boatMesh.scale.setScalar(Math.min(1, Math.min(k, 1 - k) * 8));
        boatMesh.rotation.z = Math.sin(t * 2 + ph) * 0.06;
      },
    };
  },
};

// Modèle de repli pour un type inconnu : un simple fanion.
function pennant(ph) {
  const b = plate(new Builder(), GRASS);
  b.cyl('#6b4423', 0.015, 0.02, 0.8, 5, 0, G + 0.4, 0);
  b.ball('#ffd23f', 0.035, 0, G + 0.82, 0);
  const banner = new Builder().poly('#ffd23f', [[0, 0.1], [0.34, 0], [0, -0.1]], 0.014).mesh(0.01, G + 0.66, 0);
  return {
    parts: [b.mesh(), banner],
    update(t) {
      banner.rotation.y = Math.sin(t * 2.6 + ph) * 0.5;
      banner.scale.x = 1 + Math.sin(t * 6 + ph) * 0.12;
    },
  };
}

let instances = 0;

export function createModel(kind) {
  // Chaque instance reçoit sa propre phase pour que deux modèles identiques ne bougent pas à l'unisson.
  const phase = (instances++ * 1.37) % (PI * 2);
  const factory = Object.prototype.hasOwnProperty.call(FACTORIES, kind) ? FACTORIES[kind] : pennant;
  const { parts, update } = factory(phase);
  const object = new THREE.Group();
  const body = new THREE.Group();
  body.add(...parts);
  // Les fabriques posent leur décor à la hauteur G (dessus de l'ancien socle) : on redescend le tout au niveau du sol.
  body.position.y = -G;
  object.add(body);
  object.userData.kind = kind;
  update(0);
  return { object, update };
}

// Briques réutilisées par les scènes détaillées (src/world/scenes.js).
export { Builder, flag, person, puff, rise };
