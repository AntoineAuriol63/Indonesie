// Scènes détaillées de Flores, Komodo, Sumbawa et Sumba.
import { Builder, PI, createModel, flag, person, puff, rise } from './kit.js';

const TAU = PI * 2;
const SAND = '#f3dc9a';
const SKIN = '#f2b98a';

// ---------- Briques communes à ces scènes ----------

// Nageur avec masque, tuba et palmes, allongé à la surface, tourné vers +x.
function swimmer(suit = '#ff7b1c') {
  const b = new Builder();
  b.box(suit, 0.16, 0.05, 0.08, 0, 0, 0);
  b.box(SKIN, 0.12, 0.04, 0.06, -0.14, 0, 0);
  b.ball(SKIN, 0.045, 0.12, 0.01, 0);
  b.box('#1d2b53', 0.03, 0.04, 0.08, 0.15, 0.01, 0);
  b.cyl('#ffd23f', 0.01, 0.01, 0.11, 5, 0.11, 0.07, 0.05);
  b.box('#a3e635', 0.1, 0.015, 0.1, -0.25, 0, 0);
  const mesh = b.mesh();
  mesh.scale.setScalar(0.7);
  return mesh;
}

// Petit cheval de Sumba, tourné vers +x, avec un cavalier éventuel.
function pony(coat = '#8d5524', rider = null) {
  const b = new Builder();
  b.ball(coat, 0.1, 0, 0.2, 0, 1.7, 0.95, 0.9);
  b.box(coat, 0.07, 0.15, 0.07, 0.15, 0.29, 0, 0, 0, -0.7);
  b.box(coat, 0.13, 0.065, 0.065, 0.24, 0.34, 0, 0, 0, -0.5);
  b.box('#3b2412', 0.03, 0.15, 0.03, 0.115, 0.32, 0, 0, 0, -0.7);
  for (const x of [-0.1, 0.1]) for (const z of [-0.04, 0.04]) b.box(coat, 0.03, 0.14, 0.03, x, 0.07, z);
  b.box('#3b2412', 0.03, 0.14, 0.03, -0.18, 0.17, 0, 0, 0, -0.4);
  if (rider) person(b, rider, null, -0.01, 0.26, 0, 0.6);
  return b.mesh();
}

// Soleil : boule et rayons, à faire tourner sur lui-même.
function sun(r, color = '#ffc93c') {
  const b = new Builder();
  b.ball(color, r, 0, 0, 0, 1, 1, 1, 1);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    b.box(color, r * 0.5, r * 0.16, r * 0.16, Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45, 0, 0, 0, a);
  }
  return b.mesh();
}

// Filets d'eau d'une chute : petits pavés blancs espacés de « step » ; on fait descendre le mesh d'un pas, en boucle.
// falls : liste de [x, y du haut, z, hauteur].
function streaks(falls, step) {
  const b = new Builder();
  for (const [x, top, z, h] of falls) {
    const n = Math.round(h / step);
    for (let i = 0; i < n; i++) b.box('#ffffff', 0.045, step * 0.5, 0.02, x + (i % 2 ? 0.03 : -0.03), top - step * (i + 0.3), z);
  }
  return b.mesh();
}

// Écume au pied d'une chute.
function foam(r = 0.06) {
  return new Builder().ball('#ffffff', r, -r, 0, 0).ball('#ffffff', r * 1.1, r * 0.8, 0.01, 0.02).ball('#e6fbff', r * 0.8, 0, 0, r).mesh();
}
function churn(mesh, t) {
  mesh.scale.set(1 + Math.sin(t * 5) * 0.18, 0.8 + Math.sin(t * 7) * 0.3, 1 + Math.cos(t * 4) * 0.15);
}

// Place un objet le long d'une ligne brisée ([x, y, z] par point), u allant de 0 à 1.
function along(path, u, object) {
  const f = u * (path.length - 1);
  const i = Math.min(path.length - 2, Math.floor(f));
  const k = f - i;
  const a = path[i];
  const c = path[i + 1];
  object.position.set(a[0] + (c[0] - a[0]) * k, a[1] + (c[1] - a[1]) * k, a[2] + (c[2] - a[2]) * k);
}

// Mbaru niang : grande maison conique des Manggarai, couverte de chaume presque jusqu'au sol.
function niang(b, x, z, r, h, tone = '#b9975b', door = '#2a2222') {
  b.cyl('#5a4334', r * 0.8, r * 0.8, 0.06, 8, x, 0.03, z);
  b.cone(tone, r, h, 8, x, 0.04 + h / 2, z);
  for (const k of [0.3, 0.55, 0.78]) b.cyl('#8f7140', r * (1 - k) + 0.012, r * (1 - k) + 0.022, 0.02, 8, x, 0.04 + h * k, z);
  b.cyl('#5a4334', 0.012, 0.012, 0.12, 4, x, 0.08 + h, z);
  b.box('#f8f9fa', 0.09, 0.014, 0.014, x, 0.14 + h, z);
  b.box(door, r * 0.3, 0.12, 0.08, x, 0.09, z + r * 0.88);
}

// Maison de Sumba : plancher sur pilotis, toit de chaume bas surmonté d'une haute tour.
function sumbaHouse(b, x, z, s, tower, y = 0) {
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box('#4a3628', 0.04 * s, 0.14 * s, 0.04 * s, x + dx * 0.17 * s, y + 0.07 * s, z + dz * 0.15 * s);
  b.box('#a67c52', 0.46 * s, 0.1 * s, 0.4 * s, x, y + 0.19 * s, z);
  b.cyl('#c9a352', 0.13 * s, 0.44 * s, 0.2 * s, 4, x, y + 0.34 * s, z, 0, PI / 4, 0);
  b.cyl('#b58d3d', 0.05 * s, 0.13 * s, tower * s, 4, x, y + (0.44 + tower / 2) * s, z, 0, PI / 4, 0);
  b.box('#8a6a2f', 0.14 * s, 0.025 * s, 0.025 * s, x, y + (0.45 + tower) * s, z);
  b.box('#8a6a2f', 0.02 * s, 0.09 * s, 0.02 * s, x - 0.07 * s, y + (0.49 + tower) * s, z, 0, 0, 0.4);
  b.box('#8a6a2f', 0.02 * s, 0.09 * s, 0.02 * s, x + 0.07 * s, y + (0.49 + tower) * s, z, 0, 0, -0.4);
}

// Tombe mégalithique : une dalle posée sur quatre pieds.
function dolmen(b, x, z, s = 1, y = 0) {
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box('#9a958a', 0.04 * s, 0.09 * s, 0.04 * s, x + dx * 0.08 * s, y + 0.045 * s, z + dz * 0.05 * s);
  b.box('#c2bdb1', 0.24 * s, 0.05 * s, 0.17 * s, x, y + 0.115 * s, z);
}

// Le relief de ces îles est pentu : posé tel quel, un élément s'enfonce d'un côté et flotte de l'autre.
// On le relève donc de « lift » (en unités du modèle) et on glisse dessous une butte qui comble le vide.
const GREEN = '#86d45c';
function raised(lift, color, item, r = 0.6) {
  const { build } = item;
  return {
    ...item,
    lift,
    height: item.height + lift,
    build() {
      const { parts, update } = build();
      const mound = new Builder();
      if (color) mound.cyl(color, r, r + 0.3, 0.5, 10, 0, -0.25, 0);
      const root = mound.mesh(0, lift, 0);
      root.add(...parts);
      return { parts: [root], update };
    },
  };
}

// ---------- Labuan Bajo et le parc de Komodo ----------
const KOMODO = [
  raised(0, '#d9d08c', {
    name: 'Dragons',
    match: 'Dragons de Komodo',
    dx: 0.02,
    dz: -0.08,
    size: 0.2,
    height: 0.8,
    build() {
      const b = new Builder();
      // Poste des rangers sur pilotis
      for (const x of [-0.44, -0.2]) for (const z of [-0.42, -0.26]) b.box('#6b4423', 0.03, 0.16, 0.03, x, 0.08, z);
      b.box('#a67c52', 0.32, 0.03, 0.24, -0.32, 0.17, -0.34);
      b.box('#efe2c2', 0.26, 0.13, 0.18, -0.32, 0.25, -0.34);
      b.poly('#7a5a2f', [[-0.19, 0], [0.19, 0], [0, 0.13]], 0.26, -0.32, 0.315, -0.34);
      // Un dragon fait la sieste à l'ombre du poste
      b.ball('#6f6756', 0.07, -0.3, 0.05, -0.1, 2, 0.6, 0.9).box('#7b7362', 0.1, 0.05, 0.07, -0.14, 0.045, -0.1).cone('#6f6756', 0.04, 0.2, 5, -0.5, 0.04, -0.08, 0, 0, PI / 2);
      // Palmier lontar et herbe sèche de la savane
      b.cyl('#8a6f4d', 0.025, 0.04, 0.5, 5, 0.38, 0.25, -0.32);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU;
        b.box(i % 2 ? '#7fae3f' : '#94c24a', 0.2, 0.02, 0.07, 0.38 + Math.cos(a) * 0.1, 0.53, -0.32 + Math.sin(a) * 0.1, 0, -a, -0.5);
      }
      b.cone('#b7a85a', 0.05, 0.14, 4, 0.16, 0.07, -0.42).cone('#b7a85a', 0.04, 0.1, 4, -0.02, 0.05, -0.44).cone('#b7a85a', 0.04, 0.1, 4, -0.42, 0.05, 0.36);
      // Le ranger et son bâton fourchu
      person(b, '#6b7a3a', null, 0.4, 0, 0.3, 0.95);
      b.cyl('#3f4a23', 0.055, 0.055, 0.03, 6, 0.4, 0.24, 0.3);
      b.cyl('#5a3d1e', 0.009, 0.009, 0.34, 4, 0.48, 0.17, 0.3);
      b.cyl('#5a3d1e', 0.008, 0.008, 0.09, 4, 0.46, 0.37, 0.3, 0, 0, 0.5).cyl('#5a3d1e', 0.008, 0.008, 0.09, 4, 0.5, 0.37, 0.3, 0, 0, -0.5);
      const dragon = createModel('komodo');
      dragon.object.position.set(0.02, 0, 0.14);
      return { parts: [b.mesh(), dragon.object], update: (t) => dragon.update(t) };
    },
  }, 0.54),
  {
    name: 'Padar',
    match: 'Lever de soleil sur Padar',
    dx: 0.29,
    dz: 0.13,
    size: 0.25,
    height: 1.0,
    build() {
      const b = new Builder();
      let n = 0;
      const hump = (x, z, h) => {
        const r = 0.08 + h * 0.36;
        b.cyl('#ead9a0', r + 0.05, r + 0.09, 0.16, 7, x, 0.07, z);
        b.cone(n % 2 ? '#c9ad5c' : '#b99a4e', r, h, 5, x, h / 2 + 0.13, z, 0, n * 1.1, 0);
        n++;
      };
      const ridge = (x1, z1, h1, x2, z2, h2, from) => {
        for (let i = from; i <= 3; i++) hump(x1 + ((x2 - x1) * i) / 3, z1 + ((z2 - z1) * i) / 3, h1 + ((h2 - h1) * i) / 3);
      };
      // La crête principale, du sommet (au fond) à la pointe, et quatre éperons qui ferment les baies
      ridge(0.05, -0.36, 0.52, -0.03, -0.1, 0.3, 0);
      ridge(-0.03, -0.1, 0.3, 0.07, 0.14, 0.26, 1);
      ridge(0.07, 0.14, 0.26, -0.02, 0.42, 0.14, 1);
      ridge(0.05, -0.36, 0.4, -0.46, -0.3, 0.14, 1);
      ridge(0.05, -0.36, 0.4, 0.46, -0.26, 0.14, 1);
      ridge(0.07, 0.14, 0.22, -0.44, 0.14, 0.1, 1);
      ridge(0.07, 0.14, 0.22, 0.44, 0.2, 0.1, 1);
      // Les trois plages : blanche, rose et grise
      const beach = (color, x, z, out) => {
        b.ball('#7ae9e4', 0.15, x + out * 0.13, 0.01, z, 1.2, 0.12, 1.15);
        b.ball(color, 0.12, x, 0.13, z, 1.2, 0.3, 1);
      };
      beach('#fffaf0', -0.25, -0.08, -1);
      beach('#ff9eb5', 0.27, -0.03, 1);
      beach('#70757d', -0.22, 0.29, -1);
      person(b, '#e03131', null, 0.05, 0.64, -0.36, 0.6); // au sommet, on attend le soleil
      const hiker = person(new Builder(), '#339af0', '#ffd43b', 0, 0, 0, 0.6).mesh();
      const path = [[-0.02, 0.27, 0.42], [0.07, 0.38, 0.14], [-0.03, 0.42, -0.1], [0.03, 0.57, -0.28]];
      const star = sun(0.11);
      return {
        parts: [b.mesh(), hiker, star],
        update(t) {
          const u = (t * 0.09) % 1;
          along(path, u, hiker);
          hiker.position.y += Math.abs(Math.sin(t * 7)) * 0.012;
          hiker.scale.setScalar(Math.min(1, Math.min(u, 1 - u) * 10));
          star.position.set(0.32, 0.3 + (0.5 - 0.5 * Math.cos(t * 0.6)) * 0.5, -0.52);
          star.rotation.z = t * 0.5;
        },
      };
    },
  },
  {
    name: 'Pink Beach',
    match: 'Pink Beach',
    dx: 0.06,
    dz: 0.32,
    size: 0.22,
    height: 0.5,
    build() {
      const b = new Builder();
      b.cone('#c2ad62', 0.24, 0.3, 5, -0.4, 0.15, -0.28).cone('#b39c52', 0.2, 0.22, 5, -0.44, 0.11, 0.26).cone('#cdb86c', 0.16, 0.16, 5, -0.36, 0.08, 0.0);
      b.box('#ffb8c9', 0.5, 0.2, 1.0, -0.12, 0.07, 0, 0, 0, -0.06); // sable rose
      b.box('#ff8fab', 0.12, 0.2, 1.0, 0.13, 0.035, 0); // frange mouillée, plus rose
      b.box('#5fdde8', 0.36, 0.03, 1.0, 0.36, 0.015, 0);
      b.ball('#ff6b6b', 0.045, 0.3, 0.03, -0.3, 1, 0.5, 1).ball('#ffa94d', 0.04, 0.44, 0.03, 0.08, 1, 0.5, 1).ball('#f06595', 0.05, 0.32, 0.03, 0.36, 1, 0.5, 1);
      person(b, '#1c7ed6', '#f2d16b', -0.12, 0.165, -0.22, 0.8);
      b.box('#ffffff', 0.22, 0.012, 0.1, -0.14, 0.176, 0.22).box('#20c997', 0.15, 0.04, 0.06, -0.15, 0.2, 0.22).ball(SKIN, 0.035, -0.05, 0.205, 0.22);
      const wave = new Builder().box('#ffffff', 0.04, 0.02, 0.98, 0, 0, 0).box('#e6fbff', 0.03, 0.016, 0.92, 0.05, 0, 0).mesh();
      const swim = swimmer('#ff7b1c');
      return {
        parts: [b.mesh(), wave, swim],
        update(t) {
          wave.position.set(0.15 + Math.sin(t * 1.4) * 0.06, 0.15, 0);
          const a = t * 0.5;
          swim.position.set(0.38 + Math.sin(a * 2) * 0.04, 0.1 + Math.sin(t * 2.2) * 0.008, Math.sin(a) * 0.32);
          swim.rotation.y = Math.cos(a) > 0 ? -PI / 2 : PI / 2;
        },
      };
    },
  },
  {
    name: 'Raies manta',
    match: 'Nager avec les raies manta',
    dx: 0.34,
    dz: -0.22,
    size: 0.24,
    height: 0.62,
    build() {
      const manta = createModel('manta');
      // Petits poissons nettoyeurs et têtes de corail de la « station de nettoyage »
      const b = new Builder();
      b.ball('#ff8fab', 0.05, -0.4, 0.02, 0.3, 1, 0.5, 1).ball('#ffa94d', 0.045, 0.42, 0.02, 0.26, 1, 0.5, 1).ball('#b197fc', 0.04, 0.36, 0.02, -0.34, 1, 0.5, 1);
      const swim = swimmer('#f03e3e');
      return {
        parts: [b.mesh(), manta.object, swim],
        update(t) {
          manta.update(t);
          const a = -t * 0.35;
          swim.position.set(Math.cos(a) * 0.4, 0.1 + Math.sin(t * 2.2) * 0.008, Math.sin(a) * 0.34);
          swim.rotation.y = -a + PI / 2;
        },
      };
    },
  },
  {
    name: 'Taka Makassar',
    match: 'Banc de sable',
    dx: 0.58,
    dz: -0.4,
    size: 0.22,
    height: 0.42,
    build() {
      const b = new Builder();
      b.ball('#a5f3ec', 0.3, 0, 0.004, 0, 1.8, 0.06, 1.25); // eau très claire autour du banc
      // Le banc de sable, en croissant
      const bank = [];
      for (let i = 0; i <= 8; i++) bank.push([Math.cos(PI * (1.1 + (i / 8) * 0.8)) * 0.5, -0.36 - Math.sin(PI * (1.1 + (i / 8) * 0.8)) * 0.5]);
      for (let i = 8; i >= 0; i--) bank.push([Math.cos(PI * (1.14 + (i / 8) * 0.72)) * 0.42, -0.44 - Math.sin(PI * (1.14 + (i / 8) * 0.72)) * 0.42]);
      b.poly('#fff6dc', bank, 0.14, 0, 0.06, 0, -PI / 2, 0, 0);
      person(b, '#e64980', null, -0.24, 0.13, 0.0, 0.7);
      person(b, '#1c7ed6', '#f2d16b', -0.12, 0.13, -0.05, 0.7);
      b.cone('#ff922b', 0.04, 0.02, 5, 0.26, 0.14, 0.0);
      // Bateau rapide au mouillage
      const s = new Builder();
      s.poly('#ffffff', [[-0.16, 0.07], [0.2, 0.07], [0.13, -0.02], [-0.14, -0.02]], 0.11);
      s.box('#1c7ed6', 0.34, 0.016, 0.114, 0.02, 0.055, 0);
      s.box('#e9ecef', 0.12, 0.05, 0.08, -0.03, 0.1, 0);
      s.box('#1c7ed6', 0.18, 0.012, 0.1, -0.03, 0.16, 0);
      for (const x of [-0.1, 0.04]) s.box('#adb5bd', 0.01, 0.06, 0.01, x, 0.125, 0.04);
      const boat = s.mesh();
      const wader = person(new Builder(), '#ffd43b', null, 0, 0, 0, 0.7).mesh();
      return {
        parts: [b.mesh(), boat, wader],
        update(t) {
          boat.position.set(0.12, 0.03 + Math.sin(t * 2) * 0.01, 0.3);
          boat.rotation.z = Math.sin(t * 1.6) * 0.08;
          boat.rotation.x = Math.sin(t * 1.2) * 0.06;
          const w = Math.sin(t * 0.5);
          wader.position.set(0.08 + w * 0.2, 0.13 + Math.abs(Math.sin(t * 6)) * 0.01, -0.08 + w * w * 0.06);
        },
      };
    },
  },
  {
    name: 'Chauves-souris',
    match: 'Envol des chauves-souris',
    dx: 0.6,
    dz: 0.0,
    size: 0.23,
    height: 0.95,
    build() {
      const b = new Builder();
      // Îlot de mangrove : vase, racines-échasses, feuillage serré
      b.ball('#5d4d3a', 0.3, 0, 0.02, 0, 1.3, 0.4, 0.9);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        b.cyl('#4a3a2a', 0.012, 0.012, 0.16, 4, Math.cos(a) * 0.26, 0.07, Math.sin(a) * 0.17, 0, 0, Math.cos(a) * 0.5);
      }
      b.ball('#1f7a3a', 0.2, -0.14, 0.24, -0.02, 1.2, 0.7, 1).ball('#2b8a3e', 0.18, 0.15, 0.22, 0.04, 1.2, 0.7, 1).ball('#237a36', 0.14, 0, 0.34, -0.06, 1.2, 0.7, 1);
      const flock = (count) => {
        const m = new Builder();
        for (let i = 0; i < count; i++) {
          const x = (i - (count - 1) / 2) * 0.24;
          const y = (i % 2) * 0.09;
          const z = (((i * 7) % 3) - 1) * 0.08;
          m.octa('#2b2130', 0.026, x, y, z, 1, 1, 1.5);
          m.box('#43324d', 0.11, 0.012, 0.05, x - 0.055, y + 0.022, z, 0, 0, -0.45);
          m.box('#43324d', 0.11, 0.012, 0.05, x + 0.055, y + 0.022, z, 0, 0, 0.45);
        }
        return m.mesh();
      };
      const bats = [flock(4), flock(3), flock(4)];
      // Le bateau au mouillage, d'où l'on regarde l'envol
      const s = new Builder();
      s.poly('#6b3e1e', [[-0.18, 0.08], [0.22, 0.1], [0.14, -0.02], [-0.14, -0.02]], 0.12);
      s.box('#f1e3c4', 0.3, 0.014, 0.124, 0.02, 0.085, 0);
      s.box('#a67c52', 0.12, 0.07, 0.09, -0.06, 0.13, 0);
      person(s, '#e03131', null, 0.08, 0.09, 0, 0.5);
      person(s, '#ffd43b', null, 0.14, 0.09, 0.02, 0.5);
      const boat = s.mesh();
      return {
        parts: [b.mesh(), boat, ...bats],
        update(t) {
          bats.forEach((m, i) => {
            const k = (t * 0.16 + i / 3) % 1;
            m.position.set(-0.1 + k * 0.7, 0.45 + k * 0.45 + Math.sin(k * 9 + i) * 0.03, -0.06 + i * 0.07);
            const s2 = Math.sin(k * PI) * 1.1;
            m.scale.set(s2, s2 * (0.2 + Math.abs(Math.sin(t * 9 + i * 2)) * 1.3), s2);
          });
          boat.position.set(0.02, 0.025 + Math.sin(t * 2) * 0.01, 0.42);
          boat.rotation.z = Math.sin(t * 1.5) * 0.07;
        },
      };
    },
  },
  {
    name: 'Labuan Bajo',
    match: 'Coucher de soleil à Labuan Bajo',
    dx: 0.86,
    dz: -0.2,
    size: 0.24,
    height: 0.85,
    build() {
      const b = new Builder();
      b.ball('#86b85a', 0.34, 0.3, 0, -0.08, 1, 0.75, 1.35, 1); // la colline au-dessus du port
      b.box('#d9cdb0', 0.16, 0.16, 0.7, -0.04, 0.07, 0.14); // front de mer
      // Maisons du port
      b.box('#fff3d6', 0.12, 0.1, 0.12, 0.1, 0.1, -0.3).pyr('#c0392b', 0.1, 0.07, 0.1, 0.185, -0.3);
      b.box('#d0ebff', 0.12, 0.1, 0.12, 0.12, 0.12, -0.08).pyr('#c0392b', 0.1, 0.07, 0.12, 0.205, -0.08);
      // Bar perché sur la colline : terrasse en bois, parasols
      for (const [x, z] of [[0.14, 0.02], [0.44, 0.02], [0.14, 0.24], [0.44, 0.24]]) b.box('#6b4423', 0.03, 0.34, 0.03, x, 0.17, z);
      b.box('#a67c52', 0.36, 0.03, 0.28, 0.29, 0.34, 0.13);
      b.box('#6b4423', 0.36, 0.02, 0.02, 0.29, 0.4, 0.27);
      for (const [x, c] of [[0.2, '#ffd43b'], [0.38, '#ff6b6b']]) b.cyl('#ffffff', 0.008, 0.008, 0.16, 4, x, 0.43, 0.1).cone(c, 0.1, 0.06, 8, x, 0.53, 0.1);
      person(b, '#7048e8', null, 0.26, 0.355, 0.2, 0.6);
      person(b, '#f76707', null, 0.36, 0.355, 0.2, 0.6);
      // Stands de poisson grillé du marché de Kampung Ujung
      b.box('#1c7ed6', 0.14, 0.02, 0.2, -0.03, 0.33, 0.34);
      for (const z of [0.26, 0.42]) b.box('#868e96', 0.012, 0.15, 0.012, -0.03, 0.245, z);
      b.box('#495057', 0.08, 0.06, 0.12, -0.03, 0.2, 0.34).box('#ff922b', 0.06, 0.012, 0.03, -0.03, 0.236, 0.31).box('#ff922b', 0.06, 0.012, 0.03, -0.03, 0.236, 0.37);
      // Pinisi de croisière au mouillage dans la baie
      const boat = createModel('boat');
      boat.object.position.set(-0.46, 0, 0.12);
      boat.object.scale.setScalar(0.62);
      const star = sun(0.11, '#ff7b1c');
      const smoke = [puff(0.04), puff(0.04)];
      return {
        parts: [b.mesh(), boat.object, star, ...smoke],
        update(t) {
          boat.update(t);
          star.position.set(-0.52, 0.3 + Math.cos(t * 0.5) * 0.2, -0.4);
          star.rotation.z = t * 0.4;
          smoke.forEach((s, i) => rise(s, (t * 0.4 + i * 0.5) % 1, -0.03, 0.25, 0.34, 0.35, -0.08, 1));
        },
      };
    },
  },
];

// ---------- Ruteng et le pays manggarai ----------
const RUTENG = [
  raised(0.25, '#7a5a3a', {
    name: 'Rizières de Cancar',
    match: "Rizières en toile d'araignée",
    dx: -0.5,
    dz: -0.2,
    size: 0.22,
    height: 0.42,
    build() {
      const b = new Builder();
      b.cyl('#7a5a3a', 0.56, 0.58, 0.03, 12, 0, 0.015, 0);
      // Le lingko : des parts de gâteau qui partent du centre, recoupées en parcelles
      const greens = ['#8ce99a', '#51cf66', '#b2f2bb', '#40c057', '#d8f5a2', '#69db7c'];
      const rings = [0.04, 0.21, 0.38, 0.54];
      const N = 12;
      for (let i = 0; i < N; i++) {
        const a1 = (i / N) * TAU + 0.035;
        const a2 = ((i + 1) / N) * TAU - 0.035;
        for (let k = 0; k < 3; k++) {
          const r1 = rings[k] + 0.012;
          const r2 = rings[k + 1] - 0.012;
          const pts = [[r1 * Math.cos(a1), r1 * Math.sin(a1)], [r2 * Math.cos(a1), r2 * Math.sin(a1)], [r2 * Math.cos(a2), r2 * Math.sin(a2)], [r1 * Math.cos(a2), r1 * Math.sin(a2)]];
          b.poly(greens[(i * 5 + k * 2) % 6], pts, 0.02, 0, 0.035, 0, -PI / 2, 0, 0);
        }
      }
      b.cyl('#8d5a2b', 0.02, 0.025, 0.12, 5, 0, 0.09, 0); // le pieu du centre
      const farmer = person(new Builder(), '#3b82f6', '#f2d16b', 0, 0, 0, 0.85).mesh();
      const birds = new Builder();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU;
        birds.box('#ffffff', 0.12, 0.014, 0.05, Math.cos(a) * 0.3, i * 0.04, Math.sin(a) * 0.3, 0, -a, 0.35);
        birds.box('#ffffff', 0.12, 0.014, 0.05, Math.cos(a) * 0.3, i * 0.04, Math.sin(a) * 0.3, 0, -a, -0.35);
      }
      const egrets = birds.mesh();
      return {
        parts: [b.mesh(), farmer, egrets],
        update(t) {
          const a = t * 0.3;
          farmer.position.set(Math.cos(a) * 0.38, 0.04, Math.sin(a) * 0.38);
          farmer.rotation.y = -a;
          farmer.rotation.z = 0.25 + Math.sin(t * 3) * 0.25;
          egrets.rotation.y = -t * 0.7;
          egrets.position.y = 0.3 + Math.sin(t * 1.4) * 0.04;
        },
      };
    },
  }),
  raised(0.3, GREEN, {
    name: 'Liang Bua',
    match: 'Grotte de Liang Bua',
    dx: 0.06,
    dz: -0.4,
    size: 0.22,
    height: 0.9,
    build() {
      const b = new Builder();
      // Colline de calcaire et grande bouche sombre de la grotte
      b.poly('#a39e8f', [[-0.55, 0], [0.55, 0], [0.52, 0.3], [0.34, 0.56], [0.05, 0.66], [-0.28, 0.6], [-0.5, 0.36]], 0.5, 0, 0, -0.2);
      b.poly('#2b2733', [[-0.36, 0], [0.36, 0], [0.36, 0.2], [0.26, 0.34], [0.1, 0.42], [-0.1, 0.42], [-0.26, 0.34], [-0.36, 0.2]], 0.03, 0, 0, 0.055);
      for (const [x, y, h] of [[-0.22, 0.34, 0.1], [-0.08, 0.41, 0.15], [0.06, 0.41, 0.1], [0.2, 0.36, 0.13], [0.3, 0.29, 0.08]]) b.cone('#e3ddca', 0.03, h, 5, x, y - h / 2, 0.085, PI, 0, 0);
      b.ball('#2f9e44', 0.17, -0.26, 0.62, -0.2, 1.3, 0.6, 1.2).ball('#40c057', 0.16, 0.1, 0.68, -0.22, 1.3, 0.6, 1.2).ball('#37b24d', 0.13, 0.42, 0.5, -0.2, 1.2, 0.6, 1.2);
      // Sol de la salle et carrés de fouille bordés de ficelle
      b.box('#c9b08a', 0.96, 0.03, 0.42, 0, 0.015, 0.27);
      for (const x of [-0.2, 0.0]) {
        b.box('#f8f9fa', 0.18, 0.012, 0.16, x, 0.034, 0.27);
        b.box('#6b4a2c', 0.15, 0.014, 0.13, x, 0.035, 0.27);
      }
      b.box('#8d5a2b', 0.02, 0.2, 0.02, -0.33, 0.1, 0.2).box('#8d5a2b', 0.02, 0.2, 0.02, -0.27, 0.1, 0.2); // échelle
      for (const y of [0.06, 0.12, 0.18]) b.box('#8d5a2b', 0.07, 0.015, 0.02, -0.3, y, 0.2);
      const digger = person(new Builder(), '#f08c00', '#f2d16b', 0, 0, 0, 0.8).mesh(0.16, 0.03, 0.3);
      const lamp = new Builder().ball('#ffd43b', 0.035, 0, 0, 0).mesh(-0.2, 0.09, 0.1);
      const dust = puff(0.04);
      return {
        parts: [b.mesh(), digger, lamp, dust],
        update(t) {
          digger.rotation.z = 0.35 + Math.sin(t * 4) * 0.3;
          lamp.scale.setScalar(1 + Math.sin(t * 6) * 0.25);
          rise(dust, (t * 0.5) % 1, 0.04, 0.05, 0.3, 0.2, -0.08, 1);
        },
      };
    },
  }),
  raised(0.05, GREEN, {
    name: "Ruteng Pu'u",
    match: "Village de Ruteng Pu'u",
    dx: 0.0,
    dz: -0.05,
    size: 0.21,
    height: 0.85,
    build() {
      const b = new Builder();
      niang(b, -0.28, -0.26, 0.27, 0.58);
      niang(b, 0.28, -0.26, 0.27, 0.58, '#c9a352');
      // Cour ronde pavée et, au milieu, le compang, l'autel de pierres des ancêtres
      b.cyl('#b7b2a6', 0.36, 0.38, 0.04, 10, 0, 0.02, 0.2);
      b.cyl('#9a958a', 0.27, 0.27, 0.044, 10, 0, 0.022, 0.2);
      b.cyl('#c2bdb1', 0.12, 0.14, 0.08, 7, 0, 0.08, 0.2);
      for (let i = 0; i < 6; i++) b.ball('#8f8a7e', 0.035, Math.cos(i) * 0.13, 0.06, 0.2 + Math.sin(i) * 0.13, 1, 0.7, 1);
      b.cyl('#6b4423', 0.015, 0.02, 0.2, 5, 0, 0.22, 0.2).ball('#e8590c', 0.07, 0, 0.36, 0.2, 1.2, 0.8, 1.2);
      const visitor = person(new Builder(), '#1c7ed6', null, 0, 0, 0, 0.7).mesh();
      const smoke = [puff(0.05), puff(0.05)];
      return {
        parts: [b.mesh(), visitor, ...smoke],
        update(t) {
          const a = t * 0.5;
          visitor.position.set(Math.cos(a) * 0.24, 0.04 + Math.abs(Math.sin(t * 6)) * 0.012, 0.2 + Math.sin(a) * 0.24);
          smoke.forEach((s, i) => rise(s, (t * 0.3 + i * 0.5) % 1, -0.28, 0.7, -0.26, 0.4, 0.12, 1.2));
        },
      };
    },
  }),
  raised(0.08, GREEN, {
    name: 'Marché',
    match: 'Marché de Ruteng',
    dx: 0.3,
    dz: 0.06,
    size: 0.19,
    height: 0.7,
    build() {
      const b = new Builder();
      // Étal couvert d'une bâche, légumes de montagne, sacs de café
      for (const [x, z] of [[-0.4, -0.2], [0.1, -0.2], [-0.4, 0.12], [0.1, 0.12]]) b.box('#6b4423', 0.03, 0.5, 0.03, x, 0.25, z);
      b.box('#f08c00', 0.6, 0.03, 0.42, -0.15, 0.51, -0.04, 0.12, 0, 0);
      b.box('#8d5a2b', 0.46, 0.14, 0.26, -0.15, 0.07, -0.04);
      b.ball('#74b816', 0.05, -0.3, 0.17, -0.04).ball('#74b816', 0.05, -0.2, 0.17, 0.02).ball('#e03131', 0.04, -0.08, 0.17, -0.06).ball('#ff922b', 0.04, 0.0, 0.17, 0.02).ball('#f8f9fa', 0.045, -0.12, 0.17, 0.05);
      for (const [x, z] of [[-0.36, 0.3], [-0.2, 0.34], [-0.04, 0.3]]) b.cyl('#d9b384', 0.07, 0.06, 0.12, 7, x, 0.06, z).cyl('#4a2c17', 0.06, 0.06, 0.02, 7, x, 0.125, z);
      person(b, '#7048e8', '#f2d16b', -0.15, 0, -0.24, 0.9);
      // Portant de songke, les sarongs noirs à motifs colorés
      for (const x of [0.22, 0.5]) b.cyl('#6b4423', 0.012, 0.012, 0.5, 4, x, 0.25, 0.1);
      b.cyl('#6b4423', 0.01, 0.01, 0.3, 4, 0.36, 0.5, 0.1, 0, 0, PI / 2);
      const cloth = new Builder();
      cloth.box('#212529', 0.24, 0.34, 0.014, 0, -0.17, 0);
      ['#ffd43b', '#e03131', '#40c057', '#f06595'].forEach((c, i) => cloth.box(c, 0.24, 0.022, 0.018, 0, -0.07 - i * 0.07, 0));
      const songke = cloth.mesh(0.36, 0.5, 0.1);
      const buyer = person(new Builder(), '#e64980', null, 0, 0, 0, 0.85).mesh();
      const steam = puff(0.04);
      b.cyl('#495057', 0.04, 0.04, 0.06, 6, 0.14, 0.03, 0.36); // la bouilloire de café
      return {
        parts: [b.mesh(), songke, buyer, steam],
        update(t) {
          songke.rotation.x = Math.sin(t * 1.7) * 0.22;
          buyer.position.set(0.12 + Math.sin(t * 0.6) * 0.26, Math.abs(Math.sin(t * 6)) * 0.012, 0.26);
          rise(steam, (t * 0.5) % 1, 0.14, 0.07, 0.36, 0.3, 0.05, 1);
        },
      };
    },
  }),
  raised(0.1, '#4a8f3c', {
    name: 'Lac Ranamese',
    match: 'Lac Ranamese',
    dx: 0.52,
    dz: -0.12,
    size: 0.23,
    height: 0.6,
    build() {
      const b = new Builder();
      // Lac de cratère : un anneau de forêt, plus haut au fond
      b.cyl('#4a8f3c', 0.5, 0.56, 0.08, 11, 0, 0.04, 0);
      b.cyl('#1fa39a', 0.34, 0.34, 0.03, 10, 0, 0.075, 0.02);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const back = Math.sin(a) < 0.3;
        const h = back ? 0.2 + ((i * 3) % 4) * 0.04 : 0.1;
        b.cone(i % 2 ? '#1f7a3a' : '#2b8a3e', back ? 0.1 : 0.07, h, 6, Math.cos(a) * 0.44, 0.08 + h / 2, Math.sin(a) * 0.42);
      }
      // Pêcheur sur son radeau de bambou
      const r = new Builder();
      for (let i = -2; i <= 2; i++) r.cyl('#d9b44a', 0.014, 0.014, 0.22, 5, 0, 0, i * 0.028, 0, 0, PI / 2);
      person(r, '#e03131', '#f2d16b', -0.03, 0.01, 0, 0.6);
      r.cyl('#5a3d1e', 0.006, 0.006, 0.24, 4, 0.08, 0.14, 0, 0, 0, -0.9);
      const raft = r.mesh();
      const fish = new Builder().octa('#dee2e6', 0.035, 0, 0, 0, 1.6, 0.9, 0.5).mesh();
      return {
        parts: [b.mesh(), raft, fish],
        update(t) {
          const a = t * 0.3;
          raft.position.set(Math.cos(a) * 0.16, 0.1 + Math.sin(t * 2) * 0.004, 0.03 + Math.sin(a) * 0.12);
          raft.rotation.y = Math.sin(t * 0.4) * 0.5;
          const k = (t * 0.5) % 1;
          fish.position.set(raft.position.x + 0.16, 0.08 + Math.sin(Math.min(1, k * 2) * PI) * 0.1, raft.position.z + 0.02);
          fish.rotation.z = 1.2 - Math.min(1, k * 2) * 2.4;
        },
      };
    },
  }),
  raised(0.05, GREEN, {
    name: 'Caci',
    match: 'Combat de caci',
    dx: -0.28,
    dz: 0.08,
    size: 0.21,
    height: 0.7,
    build() {
      const b = new Builder();
      b.cyl('#dcc79b', 0.5, 0.52, 0.03, 10, 0, 0.015, 0.04); // terre battue
      // Gongs sur leur portique, spectateurs
      b.box('#6b4423', 0.03, 0.34, 0.03, -0.16, 0.17, -0.36).box('#6b4423', 0.03, 0.34, 0.03, 0.16, 0.17, -0.36).box('#6b4423', 0.38, 0.03, 0.03, 0, 0.35, -0.36);
      person(b, '#7048e8', null, -0.36, 0.03, -0.26, 0.75);
      person(b, '#2f9e44', null, 0.36, 0.03, -0.26, 0.75);
      person(b, '#e64980', '#f2d16b', 0.44, 0.03, -0.1, 0.75);
      const gongs = new Builder();
      for (const x of [-0.08, 0.08]) gongs.cyl('#f1c40f', 0.06, 0.06, 0.02, 8, x, -0.1, 0, PI / 2, 0, 0).cyl('#c9a227', 0.02, 0.02, 0.03, 6, x, -0.1, 0.01, PI / 2, 0, 0).box('#5a3d1e', 0.008, 0.08, 0.008, x, -0.03, 0);
      const gongMesh = gongs.mesh(0, 0.34, -0.36);
      const fighter = (sarong, whip) => {
        const f = new Builder();
        f.cyl('#f8f9fa', 0.04, 0.05, 0.1, 6, 0, 0.05, 0);
        f.cyl(sarong, 0.058, 0.062, 0.07, 6, 0, 0.12, 0); // songke noué à la taille
        f.cyl(SKIN, 0.045, 0.05, 0.1, 6, 0, 0.2, 0);
        f.ball(SKIN, 0.045, 0, 0.29, 0);
        // Panggal : la coiffe en cornes de buffle
        f.box('#e03131', 0.11, 0.03, 0.04, 0, 0.33, 0).box('#ffd43b', 0.022, 0.08, 0.022, -0.055, 0.37, 0).box('#ffd43b', 0.022, 0.08, 0.022, 0.055, 0.37, 0);
        if (whip) {
          f.box(SKIN, 0.03, 0.13, 0.03, 0.06, 0.28, 0, 0, 0, -0.5);
          f.cyl('#5a3d1e', 0.009, 0.009, 0.2, 4, 0.13, 0.42, 0, 0, 0, -0.3);
          f.box('#f1e3c4', 0.22, 0.014, 0.014, 0.26, 0.5, 0, 0, 0, -0.35);
        } else {
          f.cyl('#8d5a2b', 0.1, 0.1, 0.02, 8, -0.08, 0.2, 0, 0, 0, PI / 2); // bouclier rond
          f.cyl('#f1c40f', 0.035, 0.035, 0.024, 6, -0.08, 0.2, 0, 0, 0, PI / 2);
          f.cyl('#d9b44a', 0.008, 0.008, 0.36, 4, -0.04, 0.3, 0.08, 0.3, 0, 0.2); // arc de bambou pour parer
        }
        return f.mesh();
      };
      const attacker = fighter('#212529', true);
      const defender = fighter('#c2255c', false);
      return {
        parts: [b.mesh(), gongMesh, attacker, defender],
        update(t) {
          const s = Math.sin(t * 3);
          const strike = Math.max(0, s);
          attacker.position.set(-0.2 + strike * 0.1, 0.03 + Math.abs(s) * 0.05, 0.1);
          attacker.rotation.z = 0.3 - strike * 0.75;
          defender.position.set(0.18 + strike * 0.05, 0.03 + Math.max(0, -s) * 0.04, 0.1);
          defender.rotation.z = -strike * 0.25;
          gongMesh.rotation.x = Math.sin(t * 6) * 0.2;
        },
      };
    },
  }),
];

// ---------- Wae Rebo : les éléments, côte à côte, composent le hameau ----------
const WAE_REBO = [
  raised(0.3, GREEN, {
    name: 'Lever du jour',
    match: 'Lever du jour',
    dx: -0.52,
    dz: -0.88,
    size: 0.3,
    height: 1.05,
    build() {
      const b = new Builder();
      // La butte au-dessus des maisons, les crêtes du cirque derrière
      b.cone('#2f7d46', 0.3, 0.55, 5, -0.38, 0.27, -0.34).cone('#37894e', 0.34, 0.7, 5, 0.02, 0.35, -0.42).cone('#2f7d46', 0.28, 0.5, 5, 0.4, 0.25, -0.32);
      b.ball('#6fb556', 0.36, 0, 0, 0.1, 1.2, 0.6, 0.9, 1);
      person(b, '#e03131', null, -0.04, 0.2, 0.12, 0.75);
      person(b, '#ffd43b', null, 0.1, 0.19, 0.16, 0.75);
      const star = sun(0.15);
      const mists = [puff(0.11), puff(0.11)];
      return {
        parts: [b.mesh(), star, ...mists],
        update(t) {
          star.position.set(0.22, 0.5 + (0.5 - 0.5 * Math.cos(t * 0.6)) * 0.42, -0.5);
          star.rotation.z = t * 0.4;
          mists.forEach((m, i) => {
            const k = (t * 0.09 + i * 0.5) % 1;
            const s = Math.sin(k * PI);
            m.position.set(-0.5 + k * 1.0, 0.1 + i * 0.1, 0.42 - i * 0.5);
            m.scale.set(1.6 * s, 0.3 * s, 0.8 * s);
          });
        },
      };
    },
  }),
  raised(0.2, GREEN, {
    name: 'Maison des tambours',
    match: "Cérémonie d'accueil",
    dx: 0.05,
    dz: -0.82,
    size: 0.3,
    height: 1.25,
    build() {
      const b = new Builder();
      niang(b, 0, -0.12, 0.44, 1.0);
      // Le tambour suspendu à l'entrée et un ancien qui attend les visiteurs
      b.cyl('#8d5a2b', 0.045, 0.045, 0.1, 7, 0.16, 0.2, 0.3, 0, 0, PI / 2).cyl('#f1e3c4', 0.04, 0.04, 0.012, 7, 0.215, 0.2, 0.3, 0, 0, PI / 2);
      person(b, '#343a40', null, -0.14, 0.02, 0.32, 0.8);
      b.box('#f8f9fa', 0.09, 0.02, 0.09, -0.14, 0.2, 0.32);
      // L'autel de pierre au centre du village
      b.cyl('#b7b2a6', 0.16, 0.18, 0.06, 8, 0.02, 0.03, 0.56);
      for (let i = 0; i < 6; i++) b.ball('#8f8a7e', 0.04, 0.02 + Math.cos(i * 1.05) * 0.1, 0.07, 0.56 + Math.sin(i * 1.05) * 0.1, 1, 0.7, 1);
      const guests = person(person(new Builder(), '#1c7ed6', null, -0.04, 0, 0, 0.75), '#f76707', '#f2d16b', 0.05, 0, 0.05, 0.75).mesh();
      const smoke = [puff(0.06), puff(0.06)];
      return {
        parts: [b.mesh(), guests, ...smoke],
        update(t) {
          // Les visiteurs avancent jusqu'à la porte et entrent
          const k = (t * 0.14) % 1;
          guests.position.set(0.3 - k * 0.3, 0.01 + Math.abs(Math.sin(t * 6)) * 0.012, 0.75 - k * 0.42);
          guests.scale.setScalar(Math.min(1, Math.min(k, 1 - k) * 8));
          smoke.forEach((s, i) => rise(s, (t * 0.28 + i * 0.5) % 1, 0, 1.12, -0.12, 0.45, 0.14, 1.3));
        },
      };
    },
  }),
  raised(0.05, GREEN, {
    name: 'Nuit au village',
    match: 'Nuit dans une maison conique',
    dx: 0.45,
    dz: -0.62,
    size: 0.28,
    height: 1.2,
    build() {
      const b = new Builder();
      niang(b, -0.2, -0.14, 0.3, 0.68, '#a88a52', '#ffd43b');
      niang(b, 0.24, 0.12, 0.26, 0.58, '#b9975b', '#ffd43b');
      // Nattes et couvertures qui prennent l'air devant la maison des hôtes
      b.box('#d9b44a', 0.16, 0.012, 0.1, -0.26, 0.012, 0.3).box('#e03131', 0.08, 0.02, 0.1, -0.3, 0.022, 0.3).box('#d9b44a', 0.16, 0.012, 0.1, -0.06, 0.012, 0.36).box('#1c7ed6', 0.08, 0.02, 0.1, -0.1, 0.022, 0.36);
      // Croissant de lune et étoiles
      const m = new Builder();
      const outer = [];
      for (let i = 0; i <= 8; i++) outer.push([Math.cos(-1.9 + (i / 8) * 3.8) * 0.12, Math.sin(-1.9 + (i / 8) * 3.8) * 0.12]);
      for (let i = 8; i >= 0; i--) outer.push([0.03 + Math.cos(-1.5 + (i / 8) * 3.0) * 0.085, Math.sin(-1.5 + (i / 8) * 3.0) * 0.1]);
      m.poly('#ffe066', outer, 0.03, 0, 0, 0, 0, PI, 0);
      const moon = m.mesh(0.08, 1.0, -0.2);
      const stars = new Builder().octa('#fff3bf', 0.03, -0.3, 0.9, -0.1).octa('#fff3bf', 0.024, 0.36, 0.84, 0).octa('#fff3bf', 0.02, -0.12, 1.1, -0.1).mesh();
      const smoke = [puff(0.05), puff(0.05)];
      return {
        parts: [b.mesh(), moon, stars, ...smoke],
        update(t) {
          moon.rotation.z = Math.sin(t * 0.8) * 0.15;
          stars.scale.setScalar(1 + Math.sin(t * 4) * 0.035);
          stars.position.y = Math.sin(t * 1.3) * 0.02;
          // La fumée des cuisines passe à travers le chaume
          rise(smoke[0], (t * 0.3) % 1, -0.2, 0.6, -0.14, 0.35, 0.1, 1.2);
          rise(smoke[1], (t * 0.3 + 0.5) % 1, 0.24, 0.6, 0.12, 0.3, 0.1, 1.1);
        },
      };
    },
  }),
  raised(0.05, GREEN, {
    name: 'Café',
    match: 'Café de Wae Rebo',
    dx: 0.2,
    dz: -0.36,
    size: 0.28,
    height: 0.6,
    build() {
      const b = new Builder();
      // Les cerises de café sèchent sur des bâches
      b.box('#3b82f6', 0.44, 0.014, 0.3, -0.18, 0.012, 0.16).box('#b23a2a', 0.38, 0.016, 0.24, -0.18, 0.022, 0.16);
      b.box('#3b82f6', 0.3, 0.014, 0.26, 0.26, 0.012, 0.28).box('#e9d8a6', 0.25, 0.016, 0.21, 0.26, 0.022, 0.28);
      // Caféiers chargés de cerises rouges
      for (const [x, z] of [[-0.38, -0.3], [-0.12, -0.36], [0.14, -0.3]]) {
        b.cyl('#6b4423', 0.015, 0.02, 0.14, 5, x, 0.07, z).ball('#2b8a3e', 0.13, x, 0.22, z, 1, 0.9, 1);
        for (let i = 0; i < 4; i++) b.ball('#e03131', 0.025, x + Math.cos(i * 1.7) * 0.1, 0.2 + (i % 2) * 0.07, z + 0.09 + Math.sin(i * 1.7) * 0.03);
      }
      // Sacs de grains, bouilloire sur le feu
      b.cyl('#d9b384', 0.06, 0.055, 0.12, 7, 0.42, 0.06, -0.06).cyl('#d9b384', 0.06, 0.055, 0.12, 7, 0.3, 0.06, -0.12);
      b.cyl('#495057', 0.05, 0.05, 0.07, 7, 0.4, 0.05, 0.04).box('#ff922b', 0.1, 0.02, 0.1, 0.4, 0.01, 0.04);
      person(b, '#c2255c', null, 0.26, 0.02, 0.1, 0.8); // une femme trie les grains
      const raker = new Builder();
      person(raker, '#7048e8', '#f2d16b', 0, 0, 0, 0.85);
      raker.cyl('#8d5a2b', 0.008, 0.008, 0.26, 4, 0.08, 0.1, 0.05, 0.9, 0, 0).box('#8d5a2b', 0.1, 0.015, 0.02, 0.08, 0.02, 0.15);
      const rakerMesh = raker.mesh();
      const steam = puff(0.04);
      return {
        parts: [b.mesh(), rakerMesh, steam],
        update(t) {
          rakerMesh.position.set(-0.18 + Math.sin(t * 0.7) * 0.14, 0.02, -0.04);
          rakerMesh.rotation.x = Math.sin(t * 3) * 0.12;
          rise(steam, (t * 0.45) % 1, 0.4, 0.1, 0.04, 0.3, 0.05, 1);
        },
      };
    },
  }),
  raised(0.05, GREEN, {
    name: 'Montée depuis Denge',
    match: 'Montée à pied depuis Denge',
    dx: -0.36,
    dz: -0.36,
    size: 0.28,
    height: 0.95,
    build() {
      const b = new Builder();
      // Versant de forêt : bas devant, haut au fond, vers le col
      b.poly('#3f9142', [[-0.5, 0], [0.5, 0], [0.5, 0.52], [0.2, 0.5], [-0.1, 0.26]], 0.84, 0, 0, 0, 0, PI / 2, 0);
      const ground = (z) => (z > 0.1 ? ((0.5 - z) / 0.4) * 0.26 : z > -0.2 ? 0.26 + ((0.1 - z) / 0.3) * 0.24 : 0.5 + ((-0.2 - z) / 0.3) * 0.02);
      for (const [x, z] of [[-0.34, 0.36], [0.36, 0.38], [-0.36, 0.08], [0.38, 0.1], [-0.34, -0.2], [0.36, -0.16], [-0.3, -0.42], [0.34, -0.42], [0.05, -0.02]]) {
        b.cone(z > 0 ? '#1f7a3a' : '#2b8a3e', 0.1, 0.3, 6, x, ground(z) + 0.15, z);
      }
      // Le sentier en lacets
      const turns = [[-0.2, 0.46], [0.2, 0.28], [-0.2, 0.1], [0.22, -0.12], [0.0, -0.36]];
      const path = turns.map(([x, z]) => [x, ground(z) + 0.01, z]);
      for (let i = 0; i < turns.length - 1; i++) {
        for (let k = 0; k < 5; k++) {
          const x = turns[i][0] + ((turns[i + 1][0] - turns[i][0]) * k) / 5;
          const z = turns[i][1] + ((turns[i + 1][1] - turns[i][1]) * k) / 5;
          b.cyl('#e9d8a6', 0.03, 0.03, 0.02, 6, x, ground(z) + 0.005, z);
        }
      }
      // Le dernier abri, avec son tambour de bambou pour s'annoncer
      for (const x of [-0.08, 0.08]) b.box('#6b4423', 0.02, 0.18, 0.02, x, 0.6, -0.4);
      b.poly('#a67f35', [[-0.14, 0], [0.14, 0], [0, 0.1]], 0.16, 0, 0.69, -0.4);
      b.cyl('#d9b44a', 0.02, 0.02, 0.1, 6, 0, 0.6, -0.4);
      const hiker = (body) => {
        const h = person(new Builder(), body, '#f2d16b', 0, 0, 0, 0.75);
        h.box('#343a40', 0.06, 0.09, 0.04, 0, 0.1, -0.05);
        return h.mesh();
      };
      const walkers = [hiker('#e03131'), hiker('#1c7ed6')];
      return {
        parts: [b.mesh(), ...walkers],
        update(t) {
          walkers.forEach((w, i) => {
            const u = (t * 0.07 + i * 0.5) % 1;
            along(path, u, w);
            w.position.y += Math.abs(Math.sin(t * 7 + i)) * 0.012;
            w.scale.setScalar(Math.min(1, Math.min(u, 1 - u) * 10));
          });
        },
      };
    },
  }),
];

// ---------- Sumbawa Besar et l'île de Moyo ----------
const MOYO = [
  raised(0, GREEN, {
    name: 'Mata Jitu',
    match: 'Cascade de Mata Jitu',
    dx: 0.07,
    dz: -0.06,
    size: 0.19,
    height: 0.9,
    build() {
      const b = new Builder();
      // Vasques de calcaire en escalier, remplies d'une eau vert laiteux
      const tiers = [[0.04, -0.32, 0.17, 0.56], [-0.05, -0.14, 0.2, 0.42], [0.05, 0.04, 0.23, 0.28], [-0.03, 0.2, 0.26, 0.14]]; // x, z, rayon, hauteur
      const falls = [];
      tiers.forEach(([x, z, r, h], i) => {
        b.cyl(i % 2 ? '#d9cca2' : '#e9dfbd', r, r + 0.03, h, 8, x, h / 2, z, 0, PI / 8, 0);
        b.cyl(i % 2 ? '#5ee0b5' : '#3bd4a0', r - 0.045, r - 0.045, 0.02, 8, x, h + 0.002, z, 0, PI / 8, 0);
        if (i < 3) {
          b.box('#c5f6fa', 0.13, 0.14, 0.02, x, h - 0.07, z + r * 0.93 + 0.012);
          falls.push([x, h, z + r * 0.93 + 0.03, 0.14]);
        }
      });
      b.box('#c5f6fa', 0.12, 0.3, 0.02, 0.04, 0.72, -0.2); // l'eau sort de la forêt
      b.ball('#2f9e44', 0.2, -0.3, 0.52, -0.36, 1.2, 0.8, 1).ball('#40c057', 0.2, 0.36, 0.5, -0.34, 1.2, 0.8, 1).ball('#237a36', 0.22, 0.04, 0.72, -0.44, 1.3, 0.8, 1);
      b.ball('#37b24d', 0.14, -0.4, 0.24, -0.04).ball('#2f9e44', 0.14, 0.42, 0.22, 0.02).ball('#40c057', 0.1, -0.42, 0.1, 0.26).ball('#37b24d', 0.1, 0.4, 0.1, 0.3);
      b.ball(SKIN, 0.04, 0.06, 0.17, 0.26).ball(SKIN, 0.04, -0.12, 0.17, 0.3); // baigneurs dans la dernière vasque
      const water = streaks(falls, 0.07);
      const froth = foam(0.04);
      froth.position.set(0.05, 0.16, 0.14);
      return {
        parts: [b.mesh(), water, froth],
        update(t) {
          water.position.y = -((t * 0.9) % 1) * 0.07;
          churn(froth, t);
        },
      };
    },
  }, 0.55),
  {
    name: 'Snorkeling',
    match: 'Snorkeling devant Labuan Aji',
    dx: -0.26,
    dz: -0.02,
    size: 0.22,
    height: 0.42,
    build() {
      const b = new Builder();
      // Récif à quelques brasses de la plage : coraux et anémone
      b.ball('#7ae9e4', 0.3, 0, 0.004, 0, 1.6, 0.06, 1.3);
      b.ball('#ff8fab', 0.07, -0.34, 0.03, -0.2, 1, 0.6, 1).ball('#ffa94d', 0.06, 0.3, 0.03, -0.26, 1, 0.6, 1).ball('#b197fc', 0.06, -0.3, 0.03, 0.26, 1, 0.6, 1).ball('#63e6be', 0.05, 0.1, 0.03, 0.34, 1, 0.6, 1);
      b.cyl('#e599f7', 0.06, 0.04, 0.05, 7, 0.02, 0.04, 0.02);
      const swim = swimmer('#f03e3e');
      // Deux poissons-clowns tournent autour de leur anémone
      const f = new Builder();
      for (const side of [-1, 1]) {
        f.octa('#ff7b1c', 0.05, side * 0.13, 0, 0, 0.6, 0.9, 1.5);
        f.box('#ffffff', 0.064, 0.085, 0.022, side * 0.13, 0, 0.015);
        f.box('#ffffff', 0.05, 0.06, 0.018, side * 0.13, 0, -0.04);
      }
      const clowns = f.mesh(0.02, 0.07, 0.02);
      const turtle = createModel('turtle');
      turtle.object.scale.setScalar(0.6);
      turtle.object.position.set(0.3, 0, 0.1);
      return {
        parts: [b.mesh(), swim, clowns, turtle.object],
        update(t) {
          const a = t * 0.45;
          swim.position.set(-0.14 + Math.cos(a) * 0.2, 0.1 + Math.sin(t * 2.2) * 0.008, Math.sin(a) * 0.2);
          swim.rotation.y = -a - PI / 2;
          clowns.rotation.y = -t * 1.6;
          clowns.position.y = 0.07 + Math.sin(t * 3) * 0.015;
          turtle.update(t);
        },
      };
    },
  },
  raised(0.05, GREEN, {
    name: "Diwu Mba'i",
    match: "Cascade de Diwu Mba'i",
    dx: 0.04,
    dz: 0.27,
    size: 0.18,
    height: 1.0,
    build() {
      const b = new Builder();
      b.box('#8a7f72', 0.8, 0.46, 0.3, -0.08, 0.23, -0.3).box('#9d9285', 0.24, 0.3, 0.22, -0.42, 0.15, -0.08).box('#766c61', 0.2, 0.2, 0.2, 0.3, 0.1, -0.16);
      b.ball('#2f9e44', 0.18, -0.34, 0.5, -0.3, 1.3, 0.7, 1).ball('#40c057', 0.16, 0.14, 0.5, -0.32, 1.3, 0.7, 1);
      b.box('#74c0fc', 0.14, 0.46, 0.03, -0.1, 0.23, -0.145).box('#74c0fc', 0.14, 0.03, 0.2, -0.1, 0.47, -0.24);
      b.cyl('#1098ad', 0.36, 0.36, 0.03, 9, -0.04, 0.015, 0.14); // la vasque profonde
      b.cyl('#0c8599', 0.2, 0.2, 0.032, 8, -0.06, 0.016, 0.12);
      // Le grand arbre et sa branche au-dessus de l'eau
      b.cyl('#6b4423', 0.04, 0.06, 0.72, 6, 0.42, 0.36, 0.06);
      b.box('#6b4423', 0.42, 0.04, 0.04, 0.24, 0.68, 0.08, 0, 0, 0.1);
      b.ball('#2f9e44', 0.22, 0.42, 0.86, 0.02, 1.3, 0.7, 1.2).ball('#40c057', 0.15, 0.16, 0.82, 0.06, 1.3, 0.7, 1.1);
      person(b, '#ffd43b', null, 0.3, 0.2, -0.14, 0.6); // un enfant attend son tour sur le rocher
      // La corde et l'enfant qui s'y balance avant de sauter
      const r = new Builder();
      r.cyl('#f1e3c4', 0.008, 0.008, 0.34, 4, 0, -0.17, 0);
      person(r, '#e03131', null, 0, -0.5, 0, 0.65);
      const rope = r.mesh(0.08, 0.66, 0.1);
      const water = streaks([[-0.1, 0.46, -0.12, 0.44]], 0.11);
      const froth = foam(0.05);
      froth.position.set(-0.1, 0.05, -0.08);
      return {
        parts: [b.mesh(), rope, water, froth],
        update(t) {
          rope.rotation.z = Math.sin(t * 2.1) * 0.75;
          water.position.y = -((t * 0.8) % 1) * 0.11;
          churn(froth, t);
        },
      };
    },
  }, 0.55),
  raised(0.25, '#9ad17a', {
    name: 'Palais Dalam Loka',
    match: 'Palais Dalam Loka',
    dx: -0.35,
    dz: 0.78,
    size: 0.25,
    height: 0.9,
    build() {
      const b = new Builder();
      b.box('#a5d982', 1.14, 0.03, 0.92, 0, 0.015, 0.04); // le jardin
      // Deux bâtisses jumelles en bois sur une forêt de piliers de teck
      for (const cx of [-0.27, 0.27]) {
        for (let i = -2; i <= 2; i++) for (const z of [-0.3, -0.12, 0.06]) b.box('#5a3d26', 0.03, 0.2, 0.03, cx + i * 0.1, 0.13, z);
        b.box('#8a5e38', 0.5, 0.03, 0.5, cx, 0.235, -0.12);
        b.box('#b9824d', 0.46, 0.18, 0.46, cx, 0.34, -0.12);
        for (const i of [-1, 0, 1]) b.box('#2a1c12', 0.07, 0.09, 0.02, cx + i * 0.14, 0.34, 0.115);
        b.poly('#6b4a2f', [[-0.29, 0], [0.29, 0], [0, 0.2]], 0.54, cx, 0.43, -0.12);
        b.poly('#e9d8a6', [[-0.2, 0], [0.2, 0], [0, 0.14]], 0.02, cx, 0.44, 0.155);
        b.poly('#4f3723', [[-0.16, 0], [0.16, 0], [0, 0.16]], 0.34, cx, 0.55, -0.12);
        b.box('#ffd43b', 0.03, 0.09, 0.03, cx, 0.74, 0.05);
      }
      b.box('#b9824d', 0.1, 0.14, 0.24, 0, 0.32, -0.12);
      // L'escalier couvert qui monte entre les deux
      b.box('#a67c52', 0.14, 0.03, 0.42, 0, 0.13, 0.3, 0.5, 0, 0);
      b.poly('#4a3628', [[-0.1, 0], [0.1, 0], [0, 0.08]], 0.4, 0, 0.3, 0.3, 0.5, 0, 0);
      for (const x of [-0.07, 0.07]) b.box('#4a3323', 0.02, 0.26, 0.02, x, 0.15, 0.46);
      b.cyl('#adb5bd', 0.008, 0.008, 0.6, 4, 0.48, 0.3, 0.4);
      const banner = flag('#e03131', '#ffffff', 0.2, 0.12);
      banner.position.set(0.48, 0.54, 0.4);
      const visitor = person(new Builder(), '#1c7ed6', '#f2d16b', 0, 0, 0, 0.75).mesh();
      return {
        parts: [b.mesh(), banner, visitor],
        update(t) {
          banner.rotation.y = Math.sin(t * 2.4) * 0.5;
          visitor.position.set(-0.3 + Math.sin(t * 0.5) * 0.18, 0.03 + Math.abs(Math.sin(t * 6)) * 0.012, 0.38);
        },
      };
    },
  }, 0.8),
  {
    name: 'Requins-baleines',
    match: 'Requins-baleines',
    dx: 0.62,
    dz: 0.56,
    size: 0.26,
    height: 0.6,
    build() {
      const b = new Builder();
      // Bagan : plateforme de pêche, une coque et un grand cadre de bambou d'où pendent les filets
      b.poly('#6b3e1e', [[-0.3, 0.1], [0.34, 0.13], [0.24, 0], [-0.24, 0]], 0.14, 0, 0, -0.14);
      b.box('#a67c52', 0.2, 0.1, 0.12, -0.05, 0.16, -0.14).box('#e8590c', 0.24, 0.02, 0.16, -0.05, 0.22, -0.14);
      for (const z of [-0.44, 0.16]) b.box('#d9b44a', 0.94, 0.022, 0.022, 0, 0.14, z);
      for (const x of [-0.46, -0.16, 0.16, 0.46]) b.box('#d9b44a', 0.022, 0.022, 0.62, x, 0.14, -0.14);
      for (const x of [-0.3, 0.3]) b.cyl('#d9b44a', 0.01, 0.01, 0.3, 4, x, 0.29, -0.14).ball('#fff3bf', 0.035, x, 0.45, -0.14);
      person(b, '#2f9e44', '#f2d16b', 0.16, 0.13, -0.14, 0.6);
      // Le requin-baleine : large tête plate, dos bleu-gris semé de taches blanches
      const s = new Builder();
      s.ball('#3d5a80', 0.1, 0, 0, 0, 2.6, 0.55, 1.0, 1);
      s.box('#3d5a80', 0.1, 0.07, 0.17, 0.24, 0, 0);
      s.box('#e9ecef', 0.02, 0.03, 0.13, 0.295, -0.005, 0);
      for (let i = 0; i < 9; i++) s.ball('#ffffff', 0.02, -0.18 + (i % 5) * 0.09, 0.05, ((i % 3) - 1) * 0.045);
      s.poly('#34507a', [[-0.05, 0], [0.05, 0], [-0.04, 0.09]], 0.02, -0.04, 0.045, 0);
      s.box('#34507a', 0.09, 0.015, 0.1, 0.1, -0.01, 0.12, 0, 0.5, 0).box('#34507a', 0.09, 0.015, 0.1, 0.1, -0.01, -0.12, 0, -0.5, 0);
      const shark = s.mesh();
      const tail = new Builder().poly('#34507a', [[0, 0], [-0.14, 0.11], [-0.09, 0], [-0.14, -0.07]], 0.02).mesh(-0.24, 0, 0);
      shark.add(tail);
      const swim = swimmer('#ffd43b');
      return {
        parts: [b.mesh(), shark, swim],
        update(t) {
          const a = t * 0.4;
          shark.position.set(Math.cos(a) * 0.36, 0.1 + Math.sin(t * 1.2) * 0.01, 0.34 + Math.sin(a) * 0.16);
          shark.rotation.y = -a - PI / 2 + Math.sin(t * 3) * 0.06;
          tail.rotation.y = Math.sin(t * 3) * 0.5;
          swim.position.set(Math.cos(a - 0.9) * 0.2, 0.1 + Math.sin(t * 2.2) * 0.008, 0.34 + Math.sin(a - 0.9) * 0.06);
          swim.rotation.y = -a + 0.9 - PI / 2;
        },
      };
    },
  },
  {
    name: 'Île de Kenawa',
    match: 'Île de Kenawa',
    dx: -0.62,
    dz: 0.14,
    size: 0.23,
    height: 0.7,
    build() {
      const b = new Builder();
      // Îlot désert : un anneau de sable, de l'herbe, une seule colline
      b.ball('#8eeae6', 0.34, 0, 0.004, 0, 1.5, 0.06, 1.2);
      b.ball('#fff3d0', 0.3, 0, 0.02, 0, 1.45, 0.4, 1.1);
      b.ball('#c4cf6e', 0.25, 0, 0.06, -0.02, 1.5, 0.4, 1.1);
      b.cone('#b3c25e', 0.24, 0.4, 6, -0.12, 0.34, -0.08).cone('#c4cf6e', 0.13, 0.14, 5, 0.12, 0.21, -0.12);
      for (const [x, z] of [[0.2, 0.08], [0.3, -0.02]]) {
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box('#6b4423', 0.012, 0.08, 0.012, x + dx * 0.035, 0.19, z + dz * 0.035);
        b.pyr('#a67f35', 0.07, 0.05, x, 0.255, z);
      }
      person(b, '#e03131', null, -0.12, 0.54, -0.08, 0.6);
      // La barque du pêcheur qui dépose les visiteurs
      const s = new Builder();
      s.poly('#1c7ed6', [[-0.16, 0.07], [0.2, 0.09], [0.13, -0.02], [-0.13, -0.02]], 0.1);
      s.box('#ffffff', 0.3, 0.014, 0.104, 0.02, 0.07, 0);
      person(s, '#f76707', '#f2d16b', -0.08, 0.07, 0, 0.5);
      person(s, '#7048e8', null, 0.04, 0.07, 0, 0.5);
      const boat = s.mesh();
      const hiker = person(new Builder(), '#ffd43b', null, 0, 0, 0, 0.6).mesh();
      const path = [[0.18, 0.15, 0.2], [0.02, 0.2, 0.1], [-0.06, 0.36, 0.02], [-0.1, 0.5, -0.06]];
      return {
        parts: [b.mesh(), boat, hiker],
        update(t) {
          const k = 0.5 - 0.5 * Math.cos(t * 0.35);
          boat.position.set(0.62 - k * 0.3, 0.025 + Math.sin(t * 2.2) * 0.01, 0.34 - k * 0.1);
          boat.rotation.y = PI + 0.3;
          boat.rotation.z = Math.sin(t * 1.7) * 0.08;
          const u = (t * 0.1) % 1;
          along(path, u, hiker);
          hiker.position.y += Math.abs(Math.sin(t * 7)) * 0.012;
          hiker.scale.setScalar(Math.min(1, Math.min(u, 1 - u) * 10));
        },
      };
    },
  },
];

// ---------- Ouest de Sumba : Waikabubak et la côte de Kodi ----------
const WAIKABUBAK = [
  {
    name: 'Ratenggaro',
    match: 'Village de Ratenggaro',
    dx: -0.62,
    dz: 0.1,
    size: 0.23,
    height: 1.9,
    build() {
      const b = new Builder();
      // Le village sur sa butte (elle se fond dans la côte, derrière), la plage et l'embouchure devant
      b.cyl('#d9c27a', 0.44, 0.54, 0.44, 8, 0.1, 0.22, -0.14);
      b.box(SAND, 1.04, 0.2, 0.34, -0.02, 0.05, 0.36).box(SAND, 0.3, 0.2, 0.5, -0.4, 0.05, 0.1);
      b.box('#5fdde8', 0.1, 0.2, 0.34, 0.34, 0.055, 0.36); // la rivière qui se jette dans la mer
      // Les plus hauts toits de Sumba
      sumbaHouse(b, 0.26, -0.3, 0.74, 1.25, 0.44);
      sumbaHouse(b, -0.08, -0.2, 0.68, 1.05, 0.44);
      sumbaHouse(b, 0.28, 0.02, 0.62, 0.95, 0.44);
      // Tombes de pierre face au large
      dolmen(b, -0.06, 0.12, 1.0, 0.44);
      b.box('#c2bdb1', 0.1, 0.16, 0.12, -0.28, 0.5, 0.02);
      dolmen(b, -0.38, 0.14, 0.9, 0.15);
      // Un enfant propose un tour à cheval sur le sable
      const horse = pony('#8d5524', '#e03131');
      const smoke = puff(0.05);
      return {
        parts: [b.mesh(), horse, smoke],
        update(t) {
          const a = t * 0.5;
          horse.position.set(-0.1 + Math.sin(a) * 0.3, 0.15 + Math.abs(Math.sin(t * 8)) * 0.02, 0.38 + Math.sin(a * 2) * 0.03);
          horse.rotation.y = Math.cos(a) > 0 ? 0 : PI;
          horse.rotation.z = Math.sin(t * 8) * 0.05;
          rise(smoke, (t * 0.3) % 1, -0.08, 0.9, -0.2, 0.4, 0.14, 1.2);
        },
      };
    },
  },
  raised(0.35, '#8a8d92', {
    name: 'Lagon de Weekuri',
    match: 'Lagon de Weekuri',
    dx: -0.8,
    dz: -0.5,
    size: 0.23,
    height: 0.62,
    build() {
      const b = new Builder();
      b.cyl('#8a8d92', 0.5, 0.54, 0.04, 11, 0, 0.02, 0);
      b.cyl('#35dccd', 0.4, 0.4, 0.03, 10, 0, 0.035, 0.02); // le lagon
      b.cyl('#7ff0e6', 0.22, 0.22, 0.032, 8, 0.02, 0.036, 0.08);
      // Barrière de rochers côté large, percée d'un trou par où entrent les vagues
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU;
        const back = Math.sin(a) < 0.25;
        if (i === 10) continue;
        const h = back ? 0.16 + ((i * 5) % 4) * 0.035 : 0.07;
        b.cyl(i % 2 ? '#5f636b' : '#6f747c', back ? 0.05 : 0.04, back ? 0.1 : 0.07, h, 5, Math.cos(a) * 0.45, 0.04 + h / 2, 0.01 + Math.sin(a) * 0.43, 0, i, 0);
      }
      b.ball('#40c057', 0.08, -0.4, 0.24, -0.28, 1.2, 0.7, 1).ball('#2f9e44', 0.08, 0.42, 0.22, -0.22, 1.2, 0.7, 1);
      // Le plongeoir en bois
      for (const [x, z] of [[0.3, 0.14], [0.44, 0.14], [0.3, 0.28], [0.44, 0.28]]) b.box('#6b4423', 0.02, 0.24, 0.02, x, 0.15, z);
      b.box('#a67c52', 0.2, 0.02, 0.2, 0.36, 0.27, 0.21).box('#a67c52', 0.1, 0.02, 0.06, 0.24, 0.27, 0.2);
      person(b, '#1c7ed6', null, 0.4, 0.28, 0.24, 0.55);
      const jumper = person(new Builder(), '#e03131', null, 0, 0, 0, 0.6).mesh();
      const splash = foam(0.05);
      const swim = swimmer('#ffd43b');
      const surge = foam(0.06);
      return {
        parts: [b.mesh(), jumper, splash, swim, surge],
        update(t) {
          const k = (t * 0.4) % 1;
          const u = Math.min(1, k * 2.2);
          jumper.position.set(0.22 - u * 0.2, 0.28 + u * 0.3 - u * u * 0.56, 0.2 - u * 0.06);
          jumper.rotation.z = u * 3;
          jumper.scale.setScalar(u < 1 ? 1 : 0.001);
          const s = k > 0.45 && k < 0.8 ? Math.sin(((k - 0.45) / 0.35) * PI) : 0.001;
          splash.position.set(0.02, 0.06, 0.14);
          splash.scale.set(s * 1.4, s * 2, s * 1.4);
          const a = t * 0.35;
          swim.position.set(-0.16 + Math.cos(a) * 0.12, 0.07, -0.04 + Math.sin(a) * 0.14);
          swim.rotation.y = -a - PI / 2;
          surge.position.set(Math.cos((10 / 14) * TAU) * 0.44, 0.07, 0.01 + Math.sin((10 / 14) * TAU) * 0.42);
          surge.scale.setScalar(0.7 + Math.max(0, Math.sin(t * 1.8)) * 1.1);
        },
      };
    },
  }),
  {
    name: 'Arche de Bwanna',
    match: 'Plage de Bwanna',
    dx: -0.26,
    dz: 0.17,
    size: 0.23,
    height: 0.8,
    build() {
      const b = new Builder();
      // Falaise, plateau d'herbe, sentier raide
      b.box('#d9b77e', 1.0, 0.5, 0.26, 0, 0.25, -0.38).box('#c9a56c', 1.01, 0.05, 0.27, 0, 0.18, -0.38).box('#c9a56c', 1.01, 0.04, 0.27, 0, 0.36, -0.38);
      b.box('#8fbf5a', 1.04, 0.05, 0.3, 0, 0.52, -0.38);
      for (let i = 0; i < 6; i++) b.box('#f1e3c4', 0.07, 0.03, 0.04, 0.42 - i * 0.045, 0.46 - i * 0.08, -0.235);
      b.box(SAND, 1.0, 0.2, 0.56, 0, 0.05, 0.0);
      // L'arche de pierre géante plantée dans le sable
      b.poly('#b08a5a', [[-0.26, 0], [-0.14, 0], [-0.11, 0.28], [0, 0.36], [0.11, 0.28], [0.14, 0], [0.27, 0], [0.24, 0.42], [0.08, 0.56], [-0.1, 0.55], [-0.24, 0.4]], 0.16, -0.12, 0.14, 0.08, 0, 0.2, 0);
      b.ball('#9a7a4e', 0.06, 0.34, 0.17, 0.16, 1.3, 0.7, 1).ball('#9a7a4e', 0.045, 0.24, 0.16, 0.22, 1.2, 0.7, 1);
      const wave = new Builder().box('#ffffff', 1.0, 0.02, 0.04, 0, 0, 0).box('#e6fbff', 0.94, 0.016, 0.03, 0, 0, 0.05).mesh();
      const walker = person(new Builder(), '#e03131', '#f2d16b', 0, 0, 0, 0.7).mesh();
      return {
        parts: [b.mesh(), wave, walker],
        update(t) {
          wave.position.set(0, 0.1, 0.31 - Math.sin(t * 1.4) * 0.04);
          // On passe sous l'arche à pied
          walker.position.set(-0.12 + Math.sin(t * 0.5) * 0.03, 0.15 + Math.abs(Math.sin(t * 6)) * 0.012, 0.06 + Math.sin(t * 0.5) * 0.18);
        },
      };
    },
  },
  raised(0.05, '#c9b27a', {
    name: 'Tarung et Waitabar',
    match: 'Villages de Tarung',
    dx: 0.02,
    dz: -0.16,
    size: 0.23,
    height: 1.4,
    build() {
      const b = new Builder();
      b.cyl('#c9b27a', 0.54, 0.6, 0.08, 9, 0, 0.04, 0.04); // la butte
      sumbaHouse(b, 0.3, -0.14, 0.8, 0.85, 0.08);
      sumbaHouse(b, -0.02, -0.34, 0.6, 0.7, 0.08);
      // Cornes de buffle des sacrifices passés, accrochées en façade
      for (const y of [0.2, 0.26]) b.box('#f8f9fa', 0.07, 0.016, 0.016, 0.26, y, 0.03, 0, 0, 0.5).box('#f8f9fa', 0.07, 0.016, 0.016, 0.34, y, 0.03, 0, 0, -0.5);
      // Les tombes au milieu, entre les deux villages
      dolmen(b, 0.0, 0.28, 1.25, 0.08);
      b.box('#b7b2a6', 0.16, 0.1, 0.12, -0.26, 0.13, 0.4).box('#9a958a', 0.2, 0.03, 0.16, -0.26, 0.195, 0.4);
      const house = createModel('house-sumba');
      house.object.scale.setScalar(0.85);
      house.object.position.set(-0.3, 0.08, 0.02);
      const smoke = [puff(0.05), puff(0.05)];
      return {
        parts: [b.mesh(), house.object, ...smoke],
        update(t) {
          house.update(t);
          smoke.forEach((s, i) => rise(s, (t * 0.3 + i * 0.5) % 1, 0.3, 0.46, -0.14, 0.4, 0.12, 1.2));
        },
      };
    },
  }),
  raised(0.15, GREEN, {
    name: 'Praijing',
    match: 'Village de Praijing',
    dx: 0.34,
    dz: -0.3,
    size: 0.23,
    height: 0.95,
    build() {
      const b = new Builder();
      // Village étagé sur sa colline : des toits pointus qui sortent des arbres
      b.cyl('#86b85a', 0.52, 0.58, 0.12, 9, 0, 0.06, 0);
      b.cyl('#79ad50', 0.33, 0.38, 0.14, 8, 0.04, 0.19, -0.12);
      for (const [x, z] of [[-0.1, -0.22], [0.2, -0.2], [0.05, -0.02]]) sumbaHouse(b, x, z, 0.42, 0.85, 0.26);
      for (const [x, z] of [[-0.38, -0.04], [0.42, 0.02], [-0.22, 0.26], [0.26, 0.3]]) sumbaHouse(b, x, z, 0.4, 0.8, 0.12);
      for (const [x, y, z] of [[-0.26, 0.3, -0.1], [0.34, 0.3, -0.1], [-0.02, 0.18, 0.2], [-0.44, 0.16, 0.2], [0.46, 0.16, 0.24], [0.1, 0.3, -0.34]]) b.ball('#2f9e44', 0.08, x, y, z, 1, 0.9, 1);
      // La plateforme d'observation à l'entrée
      for (const x of [-0.08, 0.1]) b.box('#6b4423', 0.02, 0.2, 0.02, x, 0.1, 0.5);
      b.box('#a67c52', 0.26, 0.02, 0.12, 0.01, 0.2, 0.48).box('#6b4423', 0.26, 0.015, 0.015, 0.01, 0.27, 0.535);
      person(b, '#1c7ed6', '#f2d16b', 0.02, 0.21, 0.47, 0.6);
      const smoke = [puff(0.045), puff(0.045)];
      const birds = new Builder();
      for (let i = 0; i < 2; i++) {
        const a = i * PI;
        birds.box('#343a40', 0.1, 0.012, 0.04, Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3, 0, -a, 0.35);
        birds.box('#343a40', 0.1, 0.012, 0.04, Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3, 0, -a, -0.35);
      }
      const swifts = birds.mesh(0, 0.85, -0.05);
      return {
        parts: [b.mesh(), swifts, ...smoke],
        update(t) {
          swifts.rotation.y = -t * 0.8;
          rise(smoke[0], (t * 0.3) % 1, 0.05, 0.42, -0.02, 0.35, 0.1, 1.1);
          rise(smoke[1], (t * 0.3 + 0.5) % 1, -0.38, 0.3, -0.04, 0.3, 0.1, 1.0);
        },
      };
    },
  }),
  raised(0.05, GREEN, {
    name: 'Cascade de Lapopu',
    match: 'Cascade de Lapopu',
    dx: 0.4,
    dz: 0.02,
    size: 0.22,
    height: 1.2,
    build() {
      const b = new Builder();
      // Haute cascade en escalier, étroite, dans la forêt
      b.box('#6f675b', 0.9, 0.5, 0.3, 0, 0.25, -0.34);
      const falls = [];
      for (let i = 0; i < 5; i++) {
        const h = 1.0 - i * 0.2;
        const z = -0.34 + i * 0.13;
        b.box(i % 2 ? '#857c6e' : '#7a7165', 0.4 + i * 0.05, h, 0.13, 0, h / 2, z);
        b.box('#d0f4ff', 0.18 + i * 0.03, 0.02, 0.13, 0, h + 0.01, z);
        b.box('#bfeeff', 0.18 + i * 0.03, 0.2, 0.02, 0, h - 0.1, z + 0.075);
        falls.push([0, h, z + 0.09, 0.2]);
        const side = i % 2 ? 1 : -1;
        b.ball(i % 2 ? '#2f9e44' : '#40c057', 0.16, side * (0.34 + i * 0.02), h * 0.85, z, 1, 0.9, 1);
        b.ball('#237a36', 0.13, -side * (0.36 + i * 0.02), h * 0.6, z + 0.04, 1, 0.9, 1);
      }
      b.cyl('#2fbf8f', 0.3, 0.3, 0.03, 9, 0, 0.015, 0.36); // le bassin vert où l'on se baigne
      b.ball(SKIN, 0.04, 0.14, 0.04, 0.42);
      const water = streaks(falls, 0.1);
      const froth = foam(0.05);
      froth.position.set(0, 0.05, 0.3);
      return {
        parts: [b.mesh(), water, froth],
        update(t) {
          water.position.y = -((t * 0.9) % 1) * 0.1;
          churn(froth, t);
        },
      };
    },
  }),
  raised(0.05, GREEN, {
    name: 'Marché',
    match: 'Marché de Waikabubak',
    dx: -0.3,
    dz: -0.05,
    size: 0.2,
    height: 0.7,
    build() {
      const b = new Builder();
      // Nattes au sol : tas de noix d'arec, feuilles de bétel, chaux, tabac
      b.box('#d9b384', 0.5, 0.014, 0.34, -0.14, 0.01, 0.12).box('#c9a36b', 0.34, 0.014, 0.3, 0.3, 0.01, 0.2);
      b.cone('#74b816', 0.09, 0.1, 7, -0.3, 0.065, 0.06).cone('#f08c00', 0.09, 0.1, 7, -0.1, 0.065, 0.06).cone('#74b816', 0.07, 0.08, 7, -0.2, 0.055, 0.22);
      b.box('#2b8a3e', 0.12, 0.03, 0.08, 0.02, 0.03, 0.2).box('#2b8a3e', 0.12, 0.03, 0.08, 0.02, 0.06, 0.2).cone('#f8f9fa', 0.05, 0.06, 7, 0.24, 0.045, 0.14).cone('#8d5a2b', 0.07, 0.07, 7, 0.38, 0.05, 0.24);
      person(b, '#c2255c', null, -0.2, 0.01, -0.12, 0.85); // la vendeuse
      // Un homme, le parang glissé dans le tissu noué à la taille
      person(b, '#343a40', null, 0.42, 0.01, -0.02, 0.9);
      b.box('#e03131', 0.12, 0.03, 0.12, 0.42, 0.09, -0.02).box('#adb5bd', 0.02, 0.14, 0.02, 0.49, 0.08, 0.02, 0, 0, 0.3).box('#e03131', 0.1, 0.03, 0.1, 0.42, 0.25, -0.02);
      // Grand parasol de marché
      b.cyl('#868e96', 0.012, 0.012, 0.56, 4, -0.36, 0.28, -0.14);
      const shade = new Builder();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        shade.box(i % 2 ? '#ffd43b' : '#1c7ed6', 0.26, 0.02, 0.2, Math.cos(a) * 0.13, -0.035, Math.sin(a) * 0.13, 0, -a, -0.3);
      }
      const parasol = shade.mesh(-0.36, 0.6, -0.14);
      const buyer = person(new Builder(), '#1c7ed6', '#f2d16b', 0, 0, 0, 0.85).mesh();
      return {
        parts: [b.mesh(), parasol, buyer],
        update(t) {
          parasol.rotation.z = Math.sin(t * 1.5) * 0.08;
          parasol.rotation.x = Math.cos(t * 1.1) * 0.06;
          buyer.position.set(0.05 + Math.sin(t * 0.6) * 0.3, 0.01 + Math.abs(Math.sin(t * 6)) * 0.012, 0.42);
        },
      };
    },
  }),
];

// ---------- Est de Sumba : Waingapu ----------
const WAINGAPU = [
  raised(0.1, null, {
    name: 'Collines de Wairinding',
    match: 'Collines de Wairinding',
    dx: -0.56,
    dz: 0.3,
    size: 0.26,
    height: 0.62,
    build() {
      const b = new Builder();
      // Des dizaines de collines rondes couvertes d'herbe jaune paille, sans un arbre
      const hills = [[-0.3, -0.32, 0.26, '#e2bd5a'], [0.05, -0.38, 0.3, '#d4a94a'], [0.36, -0.28, 0.24, '#e9c46a'], [-0.44, -0.02, 0.2, '#d9b04f'], [-0.1, -0.06, 0.24, '#f0d070'], [0.26, 0.04, 0.22, '#dcb654'], [-0.28, 0.28, 0.18, '#ecc963'], [0.08, 0.32, 0.17, '#e2bd5a'], [0.42, 0.32, 0.15, '#d4a94a']];
      for (const [x, z, r, c] of hills) b.ball(c, r, x, 0, z, 1, 0.62, 1, 1);
      person(b, '#e03131', null, -0.12, 0.145, -0.04, 0.6);
      person(b, '#1c7ed6', '#f2d16b', -0.04, 0.14, -0.02, 0.6);
      const horse = pony('#6b3e1e');
      horse.scale.setScalar(0.7);
      const kite = new Builder().octa('#3b2412', 0.03, 0, 0, 0, 0.8, 0.8, 1.8).box('#3b2412', 0.13, 0.012, 0.06, -0.07, 0.015, 0, 0, 0, -0.3).box('#3b2412', 0.13, 0.012, 0.06, 0.07, 0.015, 0, 0, 0, 0.3).mesh();
      return {
        parts: [b.mesh(), horse, kite],
        update(t) {
          const a = t * 0.5;
          horse.position.set(0.26 + Math.cos(a) * 0.06, 0.125 + Math.abs(Math.sin(t * 8)) * 0.012, 0.04 + Math.sin(a) * 0.06);
          horse.rotation.y = -a - PI / 2;
          const c = t * 0.6;
          kite.position.set(Math.cos(c) * 0.3, 0.5 + Math.sin(t * 1.3) * 0.03, -0.1 + Math.sin(c) * 0.24);
          kite.rotation.y = -c + PI;
        },
      };
    },
  }),
  raised(0.4, GREEN, {
    name: 'Ikat',
    match: "Ateliers d'ikat",
    dx: -0.1,
    dz: 0.12,
    size: 0.24,
    height: 0.8,
    build() {
      const b = new Builder();
      b.box('#dcc79b', 1.0, 0.03, 0.8, 0, 0.015, 0.04);
      // Barre de bambou où sèchent les grandes pièces
      for (const x of [-0.46, 0.46]) b.cyl('#c9a352', 0.016, 0.016, 0.62, 5, x, 0.31, -0.26);
      b.cyl('#c9a352', 0.013, 0.013, 0.96, 5, 0, 0.62, -0.26, 0, 0, PI / 2);
      const hanging = (ground, band, motif) => {
        const c = new Builder();
        c.box(ground, 0.36, 0.44, 0.014, 0, -0.22, 0);
        c.box(band, 0.36, 0.03, 0.018, 0, -0.04, 0).box(band, 0.36, 0.03, 0.018, 0, -0.4, 0);
        // Motif de cheval
        c.box(motif, 0.14, 0.06, 0.018, 0, -0.2, 0).box(motif, 0.03, 0.09, 0.018, 0.06, -0.14, 0).box(motif, 0.07, 0.03, 0.018, 0.09, -0.1, 0);
        c.box(motif, 0.025, 0.08, 0.018, -0.05, -0.27, 0).box(motif, 0.025, 0.08, 0.018, 0.05, -0.27, 0).box(motif, 0.025, 0.07, 0.018, -0.08, -0.17, 0, 0, 0, 0.5);
        return c.mesh();
      };
      const clothA = hanging('#1e3a8a', '#f8f9fa', '#f8f9fa');
      const clothB = hanging('#a8321e', '#f1e3c4', '#1e3a8a');
      clothA.position.set(-0.22, 0.61, -0.26);
      clothB.position.set(0.22, 0.61, -0.26);
      // Métier à sangle dorsale : la chaîne tendue d'un piquet à la taille de la tisserande
      b.box('#6b4423', 0.03, 0.26, 0.03, -0.32, 0.16, 0.22).box('#6b4423', 0.03, 0.03, 0.3, -0.32, 0.27, 0.22);
      b.box('#f8f9fa', 0.52, 0.012, 0.26, -0.06, 0.18, 0.22, 0, 0, -0.26);
      for (const [z, c] of [[0.13, '#1e3a8a'], [0.22, '#a8321e'], [0.31, '#1e3a8a']]) b.box(c, 0.52, 0.016, 0.05, -0.06, 0.18, z, 0, 0, -0.26);
      person(b, '#343a40', null, 0.24, 0.03, 0.22, 0.9);
      b.ball('#212529', 0.035, 0.24, 0.26, 0.2);
      // Pots de teinture : indigo et racine de morinda, écheveaux de fil
      b.cyl('#8d5a2b', 0.07, 0.05, 0.09, 7, -0.36, 0.075, 0.46).cyl('#1e3a8a', 0.06, 0.06, 0.012, 7, -0.36, 0.123, 0.46);
      b.cyl('#8d5a2b', 0.07, 0.05, 0.09, 7, -0.18, 0.075, 0.5).cyl('#a8321e', 0.06, 0.06, 0.012, 7, -0.18, 0.123, 0.5);
      b.ball('#f8f9fa', 0.045, 0.4, 0.06, 0.44, 1.4, 0.7, 1).ball('#1e3a8a', 0.045, 0.3, 0.06, 0.5, 1.4, 0.7, 1);
      const batten = new Builder().box('#5a3d1e', 0.03, 0.03, 0.3, 0, 0, 0).mesh();
      return {
        parts: [b.mesh(), clothA, clothB, batten],
        update(t) {
          clothA.rotation.x = Math.sin(t * 1.6) * 0.2;
          clothB.rotation.x = Math.sin(t * 1.9 + 1) * 0.2;
          // Le battant tasse la trame, d'avant en arrière
          const k = 0.5 + 0.5 * Math.sin(t * 4);
          batten.position.set(0.02 + k * 0.1, 0.175 - k * 0.027, 0.22);
        },
      };
    },
  }),
  {
    name: 'Arbres dansants',
    match: 'Arbres dansants de Walakiri',
    dx: 0.36,
    dz: -0.09,
    size: 0.24,
    height: 0.9,
    build() {
      const b = new Builder();
      b.box('#9fe3ea', 1.0, 0.024, 0.66, 0, 0.012, -0.18); // l'eau qui se retire
      b.box('#ffc078', 0.14, 0.026, 0.6, -0.4, 0.013, -0.18); // reflet du soleil
      b.box('#e8d3a0', 1.0, 0.2, 0.38, 0, 0.05, 0.32); // sable mouillé
      person(b, '#343a40', null, 0.3, 0.15, 0.34, 0.75);
      // Petits palétuviers tordus, sur leurs racines-échasses
      const tree = (h, lean) => {
        const m = new Builder();
        for (const side of [-1, 1]) m.cyl('#3b2a1e', 0.012, 0.012, 0.16, 4, side * 0.06, 0.06, 0, 0, 0, -side * 0.7);
        m.cyl('#3b2a1e', 0.012, 0.012, 0.14, 4, 0, 0.06, 0.05, 0.6, 0, 0);
        m.cyl('#4a3628', 0.022, 0.026, h * 0.42, 5, lean * 0.04, 0.1 + h * 0.2, 0, 0, 0, -lean * 0.45);
        m.cyl('#4a3628', 0.018, 0.022, h * 0.42, 5, lean * 0.04, 0.1 + h * 0.55, 0, 0, 0, lean * 0.6);
        m.cyl('#4a3628', 0.014, 0.018, h * 0.3, 5, -lean * 0.02, 0.1 + h * 0.85, 0, 0, 0, -lean * 0.5);
        m.ball('#2b8a3e', 0.1, lean * 0.04, 0.12 + h, 0, 1.5, 0.5, 1.2).ball('#37b24d', 0.06, lean * 0.12, 0.17 + h, 0, 1.3, 0.6, 1.1);
        return m.mesh();
      };
      const trees = [tree(0.42, 1), tree(0.52, -1), tree(0.36, 1), tree(0.46, -1)];
      const spots = [[-0.3, -0.04], [-0.06, -0.2], [0.18, -0.02], [0.4, -0.24]];
      trees.forEach((m, i) => m.position.set(spots[i][0], 0.02, spots[i][1]));
      const star = sun(0.15, '#ff7b1c');
      return {
        parts: [b.mesh(), star, ...trees],
        update(t) {
          trees.forEach((m, i) => {
            m.rotation.z = Math.sin(t * 1.4 + i * 1.7) * 0.14;
            m.rotation.x = Math.cos(t * 1.1 + i) * 0.06;
          });
          star.position.set(-0.4, 0.26 + Math.cos(t * 0.5) * 0.16, -0.54);
          star.rotation.z = t * 0.4;
        },
      };
    },
  },
  raised(0.25, GREEN, {
    name: 'Cascade de Waimarang',
    match: 'Cascade de Waimarang',
    dx: 0.52,
    dz: 0.62,
    size: 0.24,
    height: 0.8,
    build() {
      const b = new Builder();
      // Vasque turquoise au fond d'une gorge de calcaire : falaises en fer à cheval, hautes au fond
      b.cyl('#2ee6d6', 0.38, 0.38, 0.04, 10, 0, 0.02, 0.02);
      b.cyl('#8ff5ea', 0.2, 0.2, 0.042, 8, 0.02, 0.021, 0.08);
      for (let i = 0; i <= 10; i++) {
        const a = PI + (i / 10) * PI;
        const h = 0.34 + ((i * 5) % 3) * 0.07;
        const x = Math.cos(a) * 0.44;
        const z = 0.0 + Math.sin(a) * 0.42;
        b.cyl(i % 2 ? '#ddd6c2' : '#cfc7b0', 0.1, 0.14, h, 6, x, h / 2, z, 0, i, 0);
        b.ball(i % 2 ? '#2f9e44' : '#40c057', 0.11, x * 1.05, h + 0.03, z * 1.05, 1.1, 0.7, 1.1);
      }
      for (let i = 1; i < 6; i++) {
        const a = (i / 6) * PI;
        b.cyl('#cfc7b0', 0.05, 0.08, 0.08, 5, Math.cos(a) * 0.44, 0.04, 0.02 + Math.sin(a) * 0.42, 0, i, 0);
      }
      b.box('#bff3ff', 0.09, 0.4, 0.02, -0.04, 0.2, -0.3);
      const water = streaks([[-0.04, 0.4, -0.285, 0.4]], 0.1);
      const froth = foam(0.045);
      froth.position.set(-0.04, 0.06, -0.24);
      const swim = swimmer('#f03e3e');
      return {
        parts: [b.mesh(), water, froth, swim],
        update(t) {
          water.position.y = -((t * 0.9) % 1) * 0.1;
          churn(froth, t);
          const a = t * 0.4;
          swim.position.set(0.04 + Math.cos(a) * 0.16, 0.06, 0.1 + Math.sin(a) * 0.12);
          swim.rotation.y = -a - PI / 2;
        },
      };
    },
  }),
  raised(0.3, '#e0c9a0', {
    name: 'Canyon de Tanggedu',
    match: 'Cascade de Tanggedu',
    dx: -0.72,
    dz: -0.14,
    size: 0.24,
    height: 0.62,
    build() {
      const b = new Builder();
      // Deux parois de roche claire sculptée en strates
      const strata = ['#f1e3c4', '#e0c9a0', '#f5ead0', '#d6bf92'];
      for (const side of [-1, 1]) {
        for (let k = 0; k < 4; k++) b.box(strata[k], 0.34 - k * 0.055, 0.1, 0.96 - k * 0.1, side * (0.37 + k * 0.025), 0.05 + k * 0.1, -0.02 + (k % 2) * 0.04 * side);
      }
      // Bassins bleu-vert en gradins et petites cascades
      const falls = [];
      [[0.24, -0.32], [0.15, -0.02], [0.06, 0.3]].forEach(([h, z], i) => {
        b.box(strata[i], 0.42, h, 0.32, 0, h / 2, z);
        b.box('#35cfc6', 0.3, 0.02, 0.28, 0, h + 0.008, z);
        if (i < 2) {
          b.box('#d0f4ff', 0.16, 0.09, 0.02, 0, h - 0.045, z + 0.165);
          falls.push([0, h, z + 0.18, 0.09]);
        }
      });
      // La seconde rivière dévale la paroi de droite et rejoint la première
      for (let k = 1; k < 4; k++) {
        const x = 0.37 + k * 0.025 - (0.34 - k * 0.055) / 2;
        b.box('#d0f4ff', 0.02, 0.1, 0.09, x - 0.008, 0.05 + k * 0.1, 0.0);
        b.box('#d0f4ff', 0.05, 0.014, 0.09, x + 0.03, 0.105 + k * 0.1, 0.0);
      }
      const water = streaks(falls, 0.045);
      const froth = foam(0.04);
      froth.position.set(0, 0.09, 0.2);
      const hiker = person(new Builder(), '#e03131', '#f2d16b', 0, 0, 0, 0.7).mesh();
      return {
        parts: [b.mesh(), water, froth, hiker],
        update(t) {
          water.position.y = -((t * 1.1) % 1) * 0.045;
          churn(froth, t);
          hiker.position.set(-0.42, 0.4 + Math.abs(Math.sin(t * 6)) * 0.012, Math.sin(t * 0.4) * 0.26);
        },
      };
    },
  }),
  raised(0.3, '#e6c75a', {
    name: 'Puru Kambera',
    match: 'Savane de Puru Kambera',
    dx: -0.36,
    dz: -0.48,
    size: 0.24,
    height: 0.62,
    build() {
      const b = new Builder();
      // La plaine d'herbe jaune (la butte) et sa plage, au bord d'une mer bleu foncé
      b.ball(SAND, 0.3, 0, -0.03, -0.46, 1.9, 0.2, 0.7);
      // Quelques arbres en parasol
      for (const [x, z, h] of [[-0.36, -0.14, 0.34], [0.4, -0.06, 0.4], [0.3, 0.38, 0.3]]) {
        b.cyl('#6b4423', 0.018, 0.026, h, 5, x, h / 2, z);
        b.ball('#5c940d', 0.15, x, h + 0.02, z, 1.4, 0.35, 1.2);
      }
      for (const [x, z] of [[-0.42, 0.26], [-0.1, -0.2], [0.14, 0.42], [0.44, 0.2], [-0.2, 0.44]]) b.cone('#c9a83c', 0.04, 0.1, 4, x, 0.05, z);
      const horses = [pony('#8d5524'), pony('#3b2412'), pony('#d9b384')];
      horses[2].scale.setScalar(0.7);
      return {
        parts: [b.mesh(), ...horses],
        update(t) {
          // Un cheval trotte en rond, les deux autres broutent
          const a = t * 0.5;
          horses[0].position.set(-0.08 + Math.cos(a) * 0.2, Math.abs(Math.sin(t * 8)) * 0.02, 0.12 + Math.sin(a) * 0.16);
          horses[0].rotation.y = -a - PI / 2;
          horses[1].position.set(0.2, 0, 0.1);
          horses[1].rotation.set(0, 0.4, -0.25 - Math.max(0, Math.sin(t * 1.2)) * 0.3);
          horses[2].position.set(-0.3, 0, 0.28);
          horses[2].rotation.set(0, PI - 0.5, -0.2 - Math.max(0, Math.sin(t * 1.5 + 1)) * 0.3);
        },
      };
    },
  }, 0.58),
];

export default {
  'labuan-bajo-komodo': KOMODO,
  'ruteng-et-manggarai': RUTENG,
  'wae-rebo': { scale: 0.4, items: WAE_REBO },
  'sumbawa-besar-moyo': MOYO,
  'sud-ouest-waikabubak': WAIKABUBAK,
  'waingapu-et-est': WAINGAPU,
};
