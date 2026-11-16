// Scènes détaillées de l'Est : Moluques (Banda Neira, Ternate et Tidore, Morotai), Raja Ampat (Kri, Piaynemo),
// Timor occidental (Kupang) et Alor. Presque toutes ces étapes sont en mer ou sur de très petites îles :
// l'échelle est réduite et beaucoup d'éléments apportent leur propre bout de sable ou de rocher.
import { Group, TorusGeometry } from 'three';
import { Builder, PI, createModel, flag, person, puff, rise } from './kit.js';

const TAU = PI * 2;
const SAND = '#f3dc9a';
const GRASS = '#8fd36a';
const LAGOON = '#7fe6e0';
const PLANK = '#a67c52';
const DARK = '#4a3628';
const THATCH = '#c49a4a';
const SKIN = '#f2b98a';

// ---------- La houle ----------
// La mer de la carte (createWater, dans props.js) monte et descend de ±0,022 unité de carte. À l'échelle de ces
// petites scènes, c'est le quart de la hauteur d'un modèle : un îlot plat serait noyé, une barque resterait en l'air.
// Donc, pour tout élément posé en mer :
//  - ce qui est fixe (îlots, pilotis, rochers) descend loin sous l'eau et garde ses parties utiles au-dessus de la
//    crête (« w » = hauteur de la houle en unités du modèle, donnée par swell) ;
//  - ce qui flotte (barques, nageurs, hauts-fonds, coraux à fleur d'eau) est réuni dans un groupe « afloat » que
//    ride() cale à chaque image sur le niveau réel de l'eau à cet endroit.
const SWELL = 0.022;
const swell = (scale, item) => SWELL / (scale * item.size);

function afloat(...children) {
  const g = new Group();
  g.add(...children);
  return g;
}
// Même formule que createWater (props.js) : hauteur de l'eau et, pour que le groupe épouse la surface d'un bord à
// l'autre, sa pente. La position et l'échelle de l'élément sur la carte sont lues dans la matrice du groupe (celle
// de l'image précédente, ce qui suffit). Le groupe doit être posé à l'origine de l'élément.
function ride(g, t) {
  const e = g.matrixWorld.elements;
  const k = Math.hypot(e[0], e[1], e[2]);
  if (k < 1e-6) return;
  const x = e[12];
  const z = e[14];
  const ground = e[13] - g.position.y * k;
  const a = x * 2.1 + t * 1.1;
  const c = z * 2.6 + t * 0.9 + x * 0.7;
  g.position.y = (0.011 * (Math.sin(a) + Math.cos(c)) - ground) / k + 0.015;
  g.rotation.z = Math.atan(0.011 * (2.1 * Math.cos(a) - 0.7 * Math.sin(c)));
  g.rotation.x = Math.atan(0.011 * 2.6 * Math.sin(c));
}

// ---------- Briques communes à ces scènes ----------

// Sol d'un élément posé sur la terre ferme. Le relief de la carte est en pente : le sol repose donc sur une butte
// d'herbe qui s'enfonce sous le terrain, et l'élément entier est surélevé (raised) de la hauteur, mesurée sur la
// carte, dont le terrain dépasse sous son emprise.
const pad = (b, color, r, x = 0, z = 0, h = 0.05, spread = 0.5) => b.cyl('#a3d95f', r * 1.03, r + spread, 0.9, 10, x, -0.45, z).cyl(color, r, r * 1.03, h, 10, x, h / 2, z);
function raised({ parts, update }, lift) {
  const g = new Group();
  g.add(...parts);
  g.position.y = lift;
  return { parts: [g], update };
}
// Îlot fixe : plateau hors d'atteinte de la houle (renvoie sa hauteur), entouré d'une grève basse que la houle
// couvre et découvre, le tout plongeant loin sous l'eau.
function isle(b, w, r, x = 0, z = 0, color = SAND, above = 0.05) {
  const top = w + above;
  const depth = 2.5 * w;
  b.cyl(color, r, r + 0.12, top + depth, 10, x, (top - depth) / 2, z);
  b.cyl(color === SAND ? '#fbeab5' : color, r + 0.14, r + 0.55, 0.25 * w + depth, 10, x, (0.25 * w - depth) / 2, z);
  return top;
}
// Pilotis plantés dans le fond, jusqu'à la hauteur « top ».
function stilts(b, w, points, top, s = 0.035, color = DARK) {
  for (const [x, z] of points) b.box(color, s, top + 2.5 * w, s, x, (top - 2.5 * w) / 2, z);
  return b;
}
// Haut-fond turquoise, à poser dans un groupe flottant.
const shoal = (b, r, x = 0, z = 0, color = LAGOON) => b.cyl(color, r, r, 0.012, 12, x, 0.006, z);

// Couronne de palmes, centrée sur la tête du tronc.
function fronds(b, x, y, z, s = 0.5) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    b.box(i % 2 ? '#2f9e44' : '#40c057', 0.4 * s, 0.03 * s, 0.13 * s, x + Math.cos(a) * 0.17 * s, y - 0.04 * s, z + Math.sin(a) * 0.17 * s, 0, -a, -0.45);
  }
  return b.ball('#6b4423', 0.04 * s, x, y - 0.02 * s, z);
}
// Tronc de cocotier penché vers +x (lean) ; renvoie la position de sa tête.
function trunk(b, x, z, h = 0.5, lean = 0.1, y = 0) {
  b.cyl('#a8763e', 0.02, 0.03, Math.hypot(h, lean), 5, x + lean / 2, y + h / 2, z, 0, 0, -Math.atan2(lean, h));
  return [x + lean, y + h, z];
}
// Cocotier entier, palmes fixes.
function palm(b, x, z, h = 0.5, lean = 0.1, y = 0) {
  const [hx, hy, hz] = trunk(b, x, z, h, lean, y);
  return fronds(b, hx, hy, hz, h);
}
// Buisson ou arbre rond.
const bush = (b, x, y, z, r = 0.08, color = '#2f9e44') => b.ball(color, r, x, y + r * 0.6, z, 1.1, 0.8, 1.1);

// Petite barque, proue vers +x. Renvoie le Builder pour y ajouter passagers, toit ou balanciers.
function skiff(hull = '#ffffff', trim = '#e03131', k = 1) {
  const c = new Builder();
  c.poly(hull, [[-0.2 * k, 0.07 * k], [0.23 * k, 0.085 * k], [0.13 * k, -0.03 * k], [-0.15 * k, -0.03 * k]], 0.11 * k);
  c.box(trim, 0.4 * k, 0.016 * k, 0.114 * k, 0.01 * k, 0.074 * k, 0);
  return c;
}
// Bateau rapide des sorties à la journée : coque blanche, taud, moteur hors-bord.
function speedboat(color = '#1c7ed6', k = 1) {
  const c = skiff('#ffffff', color, k);
  c.box(color, 0.2 * k, 0.014 * k, 0.12 * k, -0.03 * k, 0.2 * k, 0);
  for (const [x, z] of [[-0.12, -0.05], [-0.12, 0.05], [0.06, -0.05], [0.06, 0.05]]) c.box('#adb5bd', 0.012 * k, 0.12 * k, 0.012 * k, x * k, 0.135 * k, z * k);
  c.box('#343a40', 0.04 * k, 0.08 * k, 0.05 * k, -0.22 * k, 0.06 * k, 0);
  person(c, '#ffd43b', null, -0.02 * k, 0.05 * k, 0, 0.5 * k);
  return c;
}

// Nageur au masque et au tuba, allongé en surface, tête vers +x (un seul mesh).
function swimmer(suit = '#ff7b1c', k = 0.55) {
  const s = new Builder();
  s.box(suit, 0.3 * k, 0.09 * k, 0.14 * k, 0, 0, 0);
  s.box(SKIN, 0.2 * k, 0.07 * k, 0.11 * k, -0.24 * k, 0, 0);
  s.ball(SKIN, 0.085 * k, 0.22 * k, 0.02 * k, 0);
  s.box('#1d2b53', 0.05 * k, 0.07 * k, 0.15 * k, 0.275 * k, 0.01 * k, 0);
  s.cyl('#ffd23f', 0.018 * k, 0.018 * k, 0.22 * k, 5, 0.2 * k, 0.14 * k, 0.09 * k);
  s.box(SKIN, 0.2 * k, 0.04 * k, 0.05 * k, 0.08 * k, -0.01 * k, 0.13 * k, 0, 0.5, 0);
  s.box(SKIN, 0.2 * k, 0.04 * k, 0.05 * k, 0.08 * k, -0.01 * k, -0.13 * k, 0, -0.5, 0);
  s.box('#a3e635', 0.2 * k, 0.025 * k, 0.09 * k, -0.43 * k, 0, 0.05 * k, 0, 0.2, 0);
  s.box('#a3e635', 0.2 * k, 0.025 * k, 0.09 * k, -0.43 * k, 0, -0.05 * k, 0, -0.2, 0);
  return s.mesh();
}
// Fait tourner un nageur ou un bateau en rond autour de (cx, cz), nez dans le sens de la marche.
function circle(mesh, a, cx, y, cz, rx, rz = rx) {
  mesh.position.set(cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz);
  mesh.rotation.y = -a - PI / 2;
}

// Banc de poissons disposés en couronne : on fait tourner le mesh entier (rotation.y croissante).
function school(colors, n, r, s = 1) {
  const b = new Builder();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const rr = r * (0.7 + ((i * 7) % 5) * 0.1);
    const c = colors[i % colors.length];
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const y = ((i * 3) % 4) * 0.02 * s;
    b.octa(c, 0.05 * s, x, y, z, 1.7, 1, 0.5, -a + PI / 2);
    b.octa(c, 0.03 * s, x - Math.sin(a) * 0.08 * s, y, z + Math.cos(a) * 0.08 * s, 0.8, 1.3, 0.4, -a + PI / 2);
  }
  return b.mesh();
}

// Massif de coraux colorés à fleur d'eau.
function corals(b, x, z, s = 1, y = 0) {
  b.ball('#ff8fab', 0.07 * s, x - 0.09 * s, y + 0.03 * s, z, 1, 0.7, 1);
  b.ball('#ffa94d', 0.06 * s, x + 0.07 * s, y + 0.03 * s, z + 0.05 * s, 1, 0.8, 1);
  b.ball('#b197fc', 0.05 * s, x + 0.01 * s, y + 0.03 * s, z - 0.08 * s, 1, 0.9, 1);
  b.cone('#63e6be', 0.03 * s, 0.1 * s, 5, x + 0.13 * s, y + 0.05 * s, z - 0.05 * s);
  return b;
}

// Îlot calcaire en champignon : pied rongé par la mer (il part de y0, sous l'eau), chapeau de forêt à la hauteur h.
function mushroom(b, x, z, r, h, y0 = 0) {
  b.cyl('#c2b79d', r * 0.8, r * 0.55, h - y0, 7, x, (h + y0) / 2, z);
  b.ball('#2f9e44', r, x, h, z, 1.1, 0.75, 1.1, 1);
  b.ball('#51cf66', r * 0.6, x - r * 0.2, h + r * 0.42, z, 1.1, 0.7, 1.1);
  return b;
}

// Cabane en feuilles de palmier sur pilotis courts, pignons à l'est et à l'ouest.
function hut(b, x, z, s = 1, y = 0, wall = '#c9a352', roof = '#a67f35') {
  for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(DARK, 0.03 * s, 0.16 * s, 0.03 * s, x + px * 0.15 * s, y + 0.08 * s, z + pz * 0.11 * s);
  b.box(PLANK, 0.4 * s, 0.03 * s, 0.32 * s, x, y + 0.17 * s, z);
  b.box(wall, 0.3 * s, 0.16 * s, 0.24 * s, x, y + 0.265 * s, z);
  b.box(DARK, 0.07 * s, 0.11 * s, 0.02 * s, x, y + 0.24 * s, z + 0.125 * s);
  b.poly(roof, [[-0.2 * s, 0], [0.2 * s, 0], [0, 0.18 * s]], 0.4 * s, x, y + 0.345 * s, z, 0, PI / 2, 0);
  return b;
}
// Maison d'Alor : plateforme sur quatre poteaux sous un haut toit de chaume en pyramide.
function lopo(b, x, z, s = 1, y = 0) {
  for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(DARK, 0.03 * s, 0.2 * s, 0.03 * s, x + px * 0.11 * s, y + 0.1 * s, z + pz * 0.11 * s);
  b.box(PLANK, 0.3 * s, 0.03 * s, 0.3 * s, x, y + 0.14 * s, z);
  b.cyl(THATCH, 0.06 * s, 0.27 * s, 0.34 * s, 4, x, y + 0.37 * s, z, 0, PI / 4, 0);
  b.cyl('#a67f35', 0.02 * s, 0.07 * s, 0.1 * s, 4, x, y + 0.58 * s, z, 0, PI / 4, 0);
  return b;
}

// Cône volcanique en trois étages (pentes vertes, haut de roche nue) ; renvoie la hauteur du cratère.
function volcano(b, r, h, low = '#5fae4a', mid = '#4a8f3a', top = '#7d6f63', x = 0, z = 0, y = 0) {
  b.cyl(low, r * 0.62, r, h * 0.36, 9, x, y + h * 0.18, z);
  b.cyl(mid, r * 0.34, r * 0.62, h * 0.34, 9, x, y + h * 0.53, z);
  b.cyl(top, r * 0.15, r * 0.34, h * 0.3, 9, x, y + h * 0.85, z);
  b.cyl('#3b3632', r * 0.11, r * 0.11, 0.012, 9, x, y + h + 0.004, z);
  return y + h;
}

// Giroflier : colonne de feuillage sombre, bouquets de clous roses au bout des branches.
function cloveTree(b, x, z, s = 1, y = 0) {
  b.cyl('#7a4b25', 0.025 * s, 0.035 * s, 0.2 * s, 5, x, y + 0.1 * s, z);
  [0.2, 0.16, 0.11].forEach((r, i) => {
    b.cone(i % 2 ? '#37b24d' : '#2b8a3e', r * s, 0.3 * s, 7, x, y + (0.3 + i * 0.2) * s, z);
    for (let k = 0; k < 4; k++) {
      const a = k * 1.57 + i * 0.7;
      b.ball('#f783ac', 0.025 * s, x + Math.cos(a) * r * 0.75 * s, y + (0.22 + i * 0.2) * s, z + Math.sin(a) * r * 0.75 * s);
    }
  });
  return b;
}

// Scooter et son pilote casqué, tourné vers +x.
function scooter(color) {
  const s = new Builder();
  s.cyl('#343a40', 0.04, 0.04, 0.025, 8, -0.09, 0.04, 0, PI / 2, 0, 0).cyl('#343a40', 0.04, 0.04, 0.025, 8, 0.09, 0.04, 0, PI / 2, 0, 0);
  s.box(color, 0.2, 0.05, 0.06, -0.01, 0.08, 0).box(color, 0.03, 0.13, 0.06, 0.08, 0.13, 0);
  person(s, '#f8f9fa', null, -0.03, 0.1, 0, 0.7);
  s.ball(color, 0.042, -0.03, 0.25, 0);
  return s.mesh();
}

const walker = (color, hat = null, s = 0.7) => person(new Builder(), color, hat, 0, 0, 0, s).mesh();
// Aller-retour entre 0 et 1.
const pingpong = (u) => {
  const k = u % 2;
  return k < 1 ? k : 2 - k;
};
// Planche, tronc ou escalier tendu entre deux points A et B.
function beam(b, color, ax, ay, az, bx, by, bz, width = 0.05, thick = 0.02) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const flat = Math.hypot(dx, dz);
  return b.box(color, Math.hypot(flat, dy), thick, width, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, 0, Math.atan2(-dz, dx), Math.atan2(dy, flat));
}
// Palmier lontar : tronc droit, couronne ronde hérissée de feuilles en éventail (tête à la hauteur y + h).
function lontarCrown(b, x, y, z, s = 1) {
  b.ball('#2f8f3f', 0.12 * s, x, y, z, 1, 0.8, 1);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    b.cone(i % 2 ? '#51b85a' : '#3fa34d', 0.05 * s, 0.16 * s, 4, x + Math.cos(a) * 0.14 * s, y + 0.03 * s, z + Math.sin(a) * 0.14 * s, 0, -a, -PI / 2 + 0.35);
  }
  return b;
}
// Hamac rayé et son dormeur, accroché par ses deux bouts le long de l'axe x (origine au milieu de la corde).
function hammock(color = '#e03131') {
  const h = new Builder();
  h.box(color, 0.16, 0.02, 0.07, 0, -0.075, 0).box('#ffffff', 0.04, 0.022, 0.072, 0, -0.075, 0);
  h.box(color, 0.07, 0.015, 0.05, -0.105, -0.045, 0, 0, 0, -0.9).box(color, 0.07, 0.015, 0.05, 0.105, -0.045, 0, 0, 0, 0.9);
  h.ball(SKIN, 0.03, -0.06, -0.045, 0);
  return h.mesh();
}

// ---------- Banda Neira ----------
// La carte n'a ici que deux îlots minuscules, cachés sous la colline du fort : tout le reste apporte son île.

function banda() {
  const S = 0.4;
  // Rayon du cône du Gunung Api à la hauteur u (0 au pied, 1 au cratère), pour y poser coulée et marcheurs.
  const slope = (u) => (u < 0.36 ? 0.5 - 0.53 * u : u < 0.7 ? 0.31 - 0.41 * (u - 0.36) : 0.17 - 0.32 * (u - 0.7));
  return {
    scale: S,
    items: [
      {
        name: 'Fort Belgica',
        match: 'Fort Belgica',
        dx: 0.04,
        dz: 0.08,
        size: 0.26,
        height: 1.45,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const g = isle(b, w, 0.76);
          b.cyl('#6fbf4b', 0.6, 0.72, 0.18, 10, 0, g + 0.09, 0); // la colline au-dessus du bourg
          const y = g + 0.18;
          const corner = (i, r) => [-Math.sin((i / 5) * TAU) * r, -Math.cos((i / 5) * TAU) * r];
          // Enceinte basse en pentagone, bastions en pointe aux cinq angles
          b.cyl('#e6dcc4', 0.45, 0.47, 0.13, 5, 0, y + 0.065, 0, 0, PI, 0);
          b.cyl('#b9ab8c', 0.38, 0.38, 0.134, 5, 0, y + 0.065, 0, 0, PI, 0);
          for (let i = 0; i < 5; i++) {
            const [x, z] = corner(i, 0.46);
            b.cyl('#e6dcc4', 0.085, 0.1, 0.15, 4, x, y + 0.075, z, 0, (i / 5) * TAU, 0);
          }
          // Donjon pentagonal et ses cinq tours rondes
          b.cyl('#f1e7cf', 0.27, 0.29, 0.26, 5, 0, y + 0.26, 0, 0, PI, 0);
          b.cyl('#b9ab8c', 0.2, 0.2, 0.264, 5, 0, y + 0.26, 0, 0, PI, 0);
          for (let i = 0; i < 5; i++) {
            const [x, z] = corner(i, 0.27);
            b.cyl('#f1e7cf', 0.075, 0.08, 0.36, 8, x, y + 0.31, z);
            b.cyl('#8a7a5c', 0.058, 0.058, 0.02, 8, x, y + 0.495, z);
          }
          b.box('#5a4334', 0.09, 0.1, 0.02, 0, y + 0.18, 0.233);
          b.box('#5a4334', 0.1, 0.09, 0.02, 0, y + 0.045, 0.376);
          b.box('#d9cbb0', 0.1, 0.02, 0.26, 0, y - 0.05, 0.52, 0.42, 0, 0); // rampe d'accès
          b.cyl('#6b4423', 0.012, 0.012, 0.5, 4, 0, y + 0.63, 0);
          const banner = flag('#e03131', '#ffffff', 0.26, 0.16);
          banner.position.set(0.008, y + 0.79, 0);
          const guard = walker('#1c7ed6');
          return {
            parts: [b.mesh(), banner, guard],
            update(t) {
              banner.rotation.y = Math.sin(t * 2.5) * 0.5;
              banner.scale.x = 1 + Math.sin(t * 6) * 0.15;
              // Un visiteur fait les cent pas sur le rempart sud
              guard.position.set(-0.2 + pingpong(t * 0.3) * 0.4, y + 0.132 + Math.abs(Math.sin(t * 7)) * 0.012, 0.3);
            },
          };
        },
      },
      {
        name: 'Maisons coloniales',
        match: 'Fort Nassau',
        dx: -0.12,
        dz: 0.42,
        size: 0.24,
        height: 0.95,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const y = isle(b, w, 0.7, 0, 0.02, '#dccfae') - 0.05;
          // Istana Mini : longue maison blanche, galerie à colonnes, toit de tuiles
          b.box('#e9e2d0', 0.86, 0.04, 0.46, -0.1, y + 0.07, -0.14);
          b.box('#fdfdf7', 0.74, 0.24, 0.26, -0.1, y + 0.21, -0.22);
          b.poly('#b5523a', [[-0.25, 0], [0.25, 0], [0, 0.15]], 0.84, -0.1, y + 0.36, -0.15, 0, PI / 2, 0);
          b.box('#fdfdf7', 0.84, 0.035, 0.46, -0.1, y + 0.345, -0.15);
          for (let i = 0; i < 7; i++) b.cyl('#ffffff', 0.02, 0.024, 0.25, 6, -0.46 + i * 0.12, y + 0.215, 0.06);
          for (const x of [-0.34, -0.22, 0.02, 0.14]) b.box('#3d8a7a', 0.06, 0.12, 0.02, x, y + 0.2, -0.088);
          b.box('#6b4423', 0.08, 0.16, 0.02, -0.1, y + 0.17, -0.088);
          // Fort Nassau, à moitié en ruine : pans de mur gris, une arche, de l'herbe dessus
          b.box('#a59f93', 0.34, 0.14, 0.06, 0.4, y + 0.12, 0.22);
          b.box('#8f897d', 0.06, 0.2, 0.06, 0.26, y + 0.15, 0.22);
          b.box('#8f897d', 0.06, 0.1, 0.24, 0.55, y + 0.1, 0.1);
          b.box('#3b3b36', 0.08, 0.09, 0.07, 0.42, y + 0.095, 0.22);
          b.ball('#51cf66', 0.05, 0.5, y + 0.2, 0.22, 1.4, 0.6, 1).ball('#51cf66', 0.04, 0.3, y + 0.26, 0.22, 1.2, 0.6, 1);
          b.cyl('#495057', 0.02, 0.03, 0.14, 6, 0.3, y + 0.085, 0.38, 0, 0, PI / 2 - 0.2); // vieux canon
          b.cyl('#adb5bd', 0.008, 0.008, 0.5, 4, -0.56, y + 0.3, 0.2);
          const banner = flag('#e03131', '#ffffff', 0.2, 0.12);
          banner.position.set(-0.555, y + 0.49, 0.2);
          const strollers = [walker('#e64980', '#f2d16b'), walker('#1c7ed6')];
          return {
            parts: [b.mesh(), banner, ...strollers],
            update(t) {
              banner.rotation.y = Math.sin(t * 2.3) * 0.5;
              strollers.forEach((s, i) => {
                s.position.set(-0.42 + pingpong(t * 0.22 + i * 0.9) * 0.6, y + 0.05 + Math.abs(Math.sin(t * 7 + i)) * 0.012, 0.2 + i * 0.14);
              });
            },
          };
        },
      },
      {
        name: 'Gunung Api',
        match: 'Montée au Gunung Api',
        dx: -0.58,
        dz: 0.1,
        size: 0.28,
        height: 1.75,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const g = isle(b, w, 0.56, 0, 0, '#3f3a36', 0.03); // grève de sable noir
          const top = volcano(b, 0.5, 1.0, '#5fae4a', '#6b8f4a', '#7d6f63', 0, 0, g);
          // La coulée de 1988 : traînée noire du cratère jusqu'à la mer
          for (let i = 0; i < 8; i++) {
            const u = 0.06 + i * 0.125;
            const r = slope(u) + 0.01;
            b.ball('#2b2725', 0.085 - u * 0.04, Math.cos(2.35) * r, g + u, Math.sin(2.35) * r, 1, 0.7, 1);
          }
          b.ball('#2b2725', 0.15, Math.cos(2.35) * 0.6, g - 0.06, Math.sin(2.35) * 0.6, 1.2, 0.6, 1.2);
          for (const a of [0.2, 1.5, 3.4]) bush(b, Math.cos(a) * 0.47, g, Math.sin(a) * 0.47, 0.07);
          const smoke = [puff(0.09), puff(0.09), puff(0.09)];
          // Deux marcheurs sur le sentier raide
          const hikers = new Builder();
          person(hikers, '#ffd43b', null, 0, 0, 0, 0.6);
          person(hikers, '#e03131', null, 0.07, -0.05, 0.03, 0.6);
          const team = hikers.mesh();
          return {
            parts: [b.mesh(), team, ...smoke],
            update(t) {
              smoke.forEach((s, i) => rise(s, (t * 0.22 + i / 3) % 1, 0, top, 0, 0.55, 0.22, 1.5));
              // Montée lente en lacets, puis redescente
              const u = pingpong(t * 0.16) * 0.92;
              const a = 0.85 + Math.sin(u * 10) * 0.22;
              team.position.set(Math.cos(a) * slope(u), g + u, Math.sin(a) * slope(u));
            },
          };
        },
      },
      {
        name: 'Coulée de lave',
        match: 'Snorkeling sur la coulée',
        dx: -0.3,
        dz: -0.52,
        size: 0.24,
        height: 0.7,
        build() {
          // La langue de lave noire entrée dans la mer
          const b = new Builder();
          b.ball('#2b2725', 0.34, -0.05, 0, -0.36, 1.5, 1.15, 0.8, 1);
          b.ball('#3a3431', 0.22, 0.32, 0, -0.26, 1.2, 1.35, 1);
          // Coraux-tables repoussés dessus, larges de plusieurs mètres
          const r = new Builder();
          shoal(r, 0.6, 0, 0.1);
          r.ball('#2b2725', 0.18, -0.36, 0, -0.1, 1.2, 0.2, 1).ball('#2b2725', 0.16, 0.12, 0, -0.06, 1.5, 0.2, 1).ball('#2b2725', 0.14, 0.3, 0, 0.3, 1.2, 0.2, 1);
          const tables = [[-0.3, 0.16, 0.13, '#ffa94d'], [0.02, 0.26, 0.16, '#ff8fab'], [0.34, 0.1, 0.12, '#b197fc'], [-0.08, 0.0, 0.1, '#ffd43b'], [0.24, 0.4, 0.1, '#63e6be'], [-0.3, 0.44, 0.09, '#ff6b9d']];
          for (const [x, z, rad, c] of tables) {
            r.cyl('#8a6d5a', 0.02, 0.03, 0.06, 5, x, 0.04, z);
            r.cyl(c, rad, rad * 0.7, 0.03, 8, x, 0.08, z);
          }
          const diver = swimmer('#ff7b1c', 0.5);
          const fishes = school(['#ffd43b', '#ffffff', '#ff922b'], 7, 0.3, 0.8);
          const sea = afloat(r.mesh(), diver, fishes);
          return {
            parts: [b.mesh(), sea],
            update(t) {
              ride(sea, t);
              circle(diver, t * 0.5, 0.02, 0.15 + Math.sin(t * 2.2) * 0.012, 0.2, 0.34, 0.22);
              diver.rotation.z = Math.sin(t * 2.2) * 0.07;
              fishes.rotation.y = t * 0.9;
              fishes.position.set(0.02, 0.13 + Math.sin(t * 1.7) * 0.015, 0.18);
            },
          };
        },
      },
      {
        name: 'Confiture de muscade',
        match: 'Confiture de muscade',
        dx: 0.2,
        dz: -0.55,
        size: 0.22,
        height: 1.05,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          // Terrasse de pension sur pilotis, table ronde et pot de confiture
          const y = w - 0.09;
          stilts(b, w, [[-0.42, -0.32], [0.42, -0.32], [-0.42, 0.32], [0.42, 0.32], [0, 0.32], [0, -0.32]], y + 0.12, 0.05);
          b.box(PLANK, 1.0, 0.04, 0.8, 0, y + 0.13, 0);
          b.box('#fdfdf7', 0.5, 0.3, 0.2, -0.2, y + 0.3, -0.28);
          b.poly('#b5523a', [[-0.16, 0], [0.16, 0], [0, 0.12]], 0.56, -0.2, y + 0.45, -0.28, 0, PI / 2, 0);
          b.box('#3d8a7a', 0.08, 0.14, 0.02, -0.2, y + 0.26, -0.175);
          b.cyl('#8d5a2b', 0.03, 0.03, 0.14, 6, 0.1, y + 0.22, 0.12);
          b.cyl('#c98f52', 0.26, 0.26, 0.03, 10, 0.1, y + 0.3, 0.12);
          b.cyl('#e8890c', 0.085, 0.085, 0.16, 8, 0.0, y + 0.395, 0.06); // le pot, ambré
          b.cyl('#e03131', 0.09, 0.09, 0.03, 8, 0.0, y + 0.49, 0.06);
          b.box('#fff3bf', 0.1, 0.07, 0.02, 0.0, y + 0.395, 0.146);
          b.cyl('#f8f9fa', 0.09, 0.075, 0.015, 8, 0.21, y + 0.322, 0.2); // assiette et crêpe
          b.cyl('#f2c14e', 0.07, 0.07, 0.015, 8, 0.21, y + 0.335, 0.2);
          b.ball('#e8890c', 0.03, 0.21, y + 0.35, 0.2, 1.3, 0.6, 1);
          // Le fruit ouvert : chair jaune, noix brune, macis rouge
          b.ball('#f2d16b', 0.055, 0.22, y + 0.345, 0.0, 1, 0.8, 1);
          b.ball('#6b3e1e', 0.032, 0.22, y + 0.38, 0.0);
          b.box('#e03131', 0.075, 0.012, 0.014, 0.22, y + 0.402, 0.0).box('#e03131', 0.014, 0.012, 0.075, 0.22, y + 0.402, 0.0);
          person(b, '#7048e8', null, 0.4, y + 0.15, 0.04, 0.9);
          b.cyl('#ffffff', 0.03, 0.025, 0.045, 6, -0.08, y + 0.34, 0.26); // tasse fumante
          const spoon = new Builder().box('#dee2e6', 0.025, 0.2, 0.025, 0, 0.1, 0).ball('#e8890c', 0.035, 0, 0, 0).mesh();
          const steam = [puff(0.05), puff(0.05)];
          return {
            parts: [b.mesh(), spoon, ...steam],
            update(t) {
              // La cuillère plonge dans le pot et en ressort chargée
              const k = Math.max(0, Math.sin(t * 1.6));
              spoon.position.set(k * 0.14, y + 0.54 + k * 0.08, 0.06 + k * 0.08);
              spoon.rotation.z = -k * 0.9;
              steam.forEach((s, i) => rise(s, (t * 0.4 + i / 2) % 1, -0.08, y + 0.37, 0.26, 0.3, 0.05, 0.9));
            },
          };
        },
      },
      {
        name: 'Pulau Hatta',
        match: 'Journée à Pulau Hatta',
        dx: 0.62,
        dz: -0.18,
        size: 0.24,
        height: 1.05,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const g = isle(b, w, 0.32, -0.05, -0.2);
          b.ball('#51cf66', 0.2, -0.1, g, -0.3, 1.3, 0.55, 0.9, 1);
          hut(b, 0.08, -0.2, 0.75, g - 0.01, '#e9d8a6', '#b5523a'); // le vieux village
          const [hx, hy, hz] = trunk(b, -0.26, -0.12, 0.6, -0.1, g);
          const leaves = fronds(new Builder(), 0, 0, 0, 0.55).mesh(hx, hy, hz);
          // Le tombant démarre au bord de la plage : frange de corail à fleur d'eau
          const r = new Builder();
          shoal(r, 0.74, 0, 0.02);
          for (let i = 0; i < 8; i++) {
            const a = 0.1 + (i / 7) * 2.9;
            r.ball(['#ff8fab', '#ffa94d', '#b197fc', '#ffd43b'][i % 4], 0.06, -0.05 + Math.cos(a) * 0.6, 0.03, -0.2 + Math.sin(a) * 0.6, 1.1, 0.7, 1.1);
          }
          const boat = skiff('#ffffff', '#1c7ed6', 0.8).box('#1c7ed6', 0.14, 0.012, 0.09, -0.04, 0.15, 0).box('#adb5bd', 0.012, 0.09, 0.012, -0.1, 0.105, 0.035).box('#adb5bd', 0.012, 0.09, 0.012, 0.02, 0.105, -0.035).mesh(0.36, 0.02, 0.1);
          const fishes = school(['#ffd43b', '#4dabf7', '#ff6b9d'], 6, 0.16, 0.75);
          fishes.position.set(-0.05, 0.08, 0.22);
          const turtle = createModel('turtle');
          turtle.object.scale.setScalar(0.5);
          turtle.object.position.set(-0.46, 0.01, 0.02);
          const sea = afloat(r.mesh(), boat, fishes, turtle.object);
          return {
            parts: [b.mesh(), leaves, sea],
            update(t) {
              ride(sea, t);
              leaves.rotation.z = Math.sin(t * 1.4) * 0.14;
              boat.rotation.z = Math.sin(t * 1.9) * 0.1;
              fishes.rotation.y = t * 1.1;
              turtle.update(t);
            },
          };
        },
      },
      {
        name: 'Muscadiers',
        match: 'Plantations de muscade',
        dx: 0.5,
        dz: 0.34,
        size: 0.24,
        height: 1.5,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const g = isle(b, w, 0.68);
          b.cyl('#6fbf4b', 0.6, 0.66, 0.06, 10, 0, g + 0.03, 0);
          const y = g;
          // Un kenari géant, à contreforts, fait de l'ombre aux muscadiers
          b.cyl('#8a6a4a', 0.05, 0.08, 0.8, 6, -0.26, y + 0.46, -0.22);
          for (let i = 0; i < 4; i++) b.box('#8a6a4a', 0.16, 0.14, 0.03, -0.26 + Math.cos(i * 1.57 + 0.5) * 0.07, y + 0.12, -0.22 + Math.sin(i * 1.57 + 0.5) * 0.07, 0, -(i * 1.57 + 0.5), 0);
          // Deux muscadiers, ronds et sombres, chargés de fruits jaunes
          for (const [x, z, r] of [[0.24, -0.16, 0.19], [-0.02, 0.1, 0.15]]) {
            b.cyl('#7a4b25', 0.025, 0.03, 0.2, 5, x, y + 0.16, z);
            b.ball('#2b8a3e', r, x, y + 0.26 + r * 0.8, z, 1, 1.1, 1, 1);
            for (let i = 0; i < 6; i++) {
              const a = i * 1.05 + r * 9;
              b.ball('#ffd43b', 0.03, x + Math.cos(a) * r * 0.86, y + 0.26 + r * (0.55 + (i % 3) * 0.3), z + Math.sin(a) * r * 0.86);
            }
          }
          // L'escalier de Lonthoir
          for (let i = 0; i < 4; i++) b.box('#d9cbb0', 0.14, 0.02, 0.05, 0.36, y + 0.07 + i * 0.012, 0.44 - i * 0.05);
          const canopy = new Builder().ball('#2f9e44', 0.3, 0, 0, 0, 1.25, 0.6, 1.1, 1).ball('#40c057', 0.2, 0.16, 0.08, 0.06, 1.2, 0.6, 1).ball('#37b24d', 0.18, -0.2, 0.05, -0.04, 1.2, 0.6, 1).mesh(-0.26, y + 0.92, -0.22);
          // Le fruit qu'on ouvre devant nous : deux moitiés jaunes, la noix brune et son macis rouge
          const fruit = new Builder();
          fruit.ball('#f2d16b', 0.1, -0.08, 0, 0, 0.55, 1, 1, 1).ball('#f2d16b', 0.1, 0.08, 0, 0, 0.55, 1, 1, 1);
          fruit.ball('#6b3e1e', 0.06, 0, 0, 0, 1, 1.2, 1, 1);
          for (let i = 0; i < 3; i++) fruit.box('#e03131', 0.02, 0.15, 0.125, 0, 0, 0, 0, (i / 3) * PI, 0);
          const nut = fruit.mesh(-0.34, y + 0.34, 0.3);
          const picker = new Builder();
          person(picker, '#e8590c', '#f2d16b', 0, 0, 0, 0.8);
          picker.cyl('#c49a4a', 0.008, 0.008, 0.5, 4, 0.06, 0.3, 0).cyl('#c49a4a', 0.035, 0.02, 0.06, 6, 0.06, 0.56, 0); // la perche à panier
          const man = picker.mesh(0.16, y + 0.06, 0.26);
          return {
            parts: [b.mesh(), canopy, nut, man],
            update(t) {
              canopy.rotation.z = Math.sin(t * 1.1) * 0.05;
              nut.rotation.y = t * 1.2;
              nut.position.y = y + 0.34 + Math.sin(t * 2) * 0.03;
              man.rotation.z = Math.sin(t * 2.4) * 0.12;
            },
          };
        },
      },
    ],
  };
}

// ---------- Ternate et Tidore ----------
// L'île de Ternate est tout entière occupée par le cône du Gamalama, déjà sur la carte (et il fume) :
// les éléments se rangent autour, sur leur propre sol, et Tidore reçoit le sien.

function ternate() {
  const S = 0.3;
  return {
    scale: S,
    items: [
      {
        name: 'Lac Tolire',
        match: 'Lac Tolire',
        dx: -0.46,
        dz: -0.26,
        size: 0.28,
        height: 1.05,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const top = w + 0.4;
          // Cratère aux parois raides, lac vert au fond
          b.cyl('#6f9a52', 0.44, 0.7, top + 2.5 * w, 9, 0, (top - 2.5 * w) / 2, 0);
          b.cyl('#4f6b3d', 0.38, 0.38, 0.02, 9, 0, top + 0.004, 0);
          b.cyl('#2fbf71', 0.31, 0.31, 0.02, 9, 0, top + 0.012, 0);
          for (let i = 0; i < 9; i++) {
            const a = (i / 9) * TAU + 0.2;
            b.ball(i % 3 ? '#4a8f3a' : '#8d8478', 0.085, Math.cos(a) * 0.42, top + 0.03, Math.sin(a) * 0.42, 1.2, 0.9, 1.2);
          }
          person(b, '#e03131', null, 0.3, top + 0.08, 0.32, 0.8); // le lanceur, sur le bord
          const stone = new Builder().ball('#343a40', 0.035, 0, 0, 0).mesh();
          // Le crocodile blanc de la légende
          const c = new Builder();
          c.box('#f8f9fa', 0.2, 0.035, 0.07, 0, 0, 0).box('#f8f9fa', 0.1, 0.03, 0.05, 0.14, 0, 0);
          c.cone('#f8f9fa', 0.03, 0.14, 4, -0.16, 0, 0, 0, 0, PI / 2);
          c.ball('#e03131', 0.013, 0.14, 0.022, 0.022).ball('#e03131', 0.013, 0.14, 0.022, -0.022);
          const croc = c.mesh();
          return {
            parts: [b.mesh(), stone, croc],
            update(t) {
              // La pierre part vers le lac et n'atteint jamais l'eau
              const u = (t * 0.45) % 1;
              stone.position.set(0.28 - u * 0.16, top + 0.26 + Math.sin(u * PI) * 0.24 - u * 0.1, 0.3 - u * 0.16);
              stone.scale.setScalar(1 - u * u);
              circle(croc, t * 0.4, 0, top + 0.035, 0, 0.16);
            },
          };
        },
      },
      {
        name: "Tour de l'île",
        match: "Tour de l'île",
        dx: 0.14,
        dz: -0.5,
        size: 0.28,
        height: 0.8,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const g = isle(b, w, 0.52, 0, 0, '#3a3431'); // sable noir
          b.cyl('#6c757d', 0.46, 0.48, 0.02, 12, 0, g + 0.01, 0); // la route côtière
          b.cyl('#4f9e45', 0.32, 0.34, 0.04, 10, 0, g + 0.02, 0);
          // Batu Angus : blocs de lave noire
          for (const [x, z, s, r] of [[-0.12, -0.1, 0.16, 0.3], [0.1, -0.14, 0.13, 0.9], [0.0, 0.08, 0.11, 0.5], [-0.2, 0.08, 0.09, 1.2], [0.19, 0.06, 0.1, 0.2]]) b.box('#2b2725', s, s * 1.1, s * 0.9, x, g + 0.04 + s * 0.45, z, 0.2, r, 0.15);
          bush(b, 0.02, g + 0.04, -0.22, 0.06).ball('#40c057', 0.05, -0.24, g + 0.07, -0.06);
          const rider = scooter('#e03131');
          // Sulamadaha : la crique turquoise où l'on nage au masque
          const cove = shoal(new Builder(), 0.28, 0, 0).mesh(0.86, 0, 0.22);
          const diver = swimmer('#ffd43b', 0.45);
          const sea = afloat(cove, diver);
          return {
            parts: [b.mesh(), rider, sea],
            update(t) {
              ride(sea, t);
              circle(rider, -t * 0.7, 0, g + 0.02, 0, 0.4);
              rider.rotation.y += PI;
              circle(diver, t * 0.6, 0.86, 0.05, 0.22, 0.12);
            },
          };
        },
      },
      {
        name: 'Fort Tolukko',
        match: 'Tournée des forts',
        dx: 0.6,
        dz: -0.22,
        size: 0.26,
        height: 1.25,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const g = isle(b, w, 0.6);
          b.cyl('#6fbf4b', 0.5, 0.58, 0.14, 10, 0, g + 0.07, 0);
          const y = g + 0.14;
          // Petit fort portugais en pierre de lave : deux bastions ronds devant, chevet arrondi
          b.box('#8f8a7e', 0.46, 0.24, 0.36, 0, y + 0.12, -0.04);
          b.box('#c9c4b8', 0.46, 0.03, 0.36, 0, y + 0.255, -0.04).box('#7a756a', 0.4, 0.032, 0.3, 0, y + 0.256, -0.04);
          for (const [x, z, r] of [[-0.22, 0.16, 0.15], [0.22, 0.16, 0.15], [0, -0.22, 0.2]]) {
            b.cyl('#8f8a7e', r, r + 0.012, 0.24, 8, x, y + 0.12, z);
            b.cyl('#c9c4b8', r, r, 0.03, 8, x, y + 0.255, z).cyl('#7a756a', r - 0.035, r - 0.035, 0.032, 8, x, y + 0.256, z);
          }
          b.box('#3b3b36', 0.09, 0.13, 0.02, 0, y + 0.085, 0.142);
          b.box('#e9e2d0', 0.12, 0.03, 0.3, 0, y - 0.03, 0.4, 0.5, 0, 0); // escalier
          b.cyl('#3b3b36', 0.02, 0.028, 0.14, 6, 0.22, y + 0.29, 0.2, PI / 2 - 0.15, 0, 0); // canon pointé vers la mer
          b.cyl('#6b4423', 0.012, 0.012, 0.46, 4, 0, y + 0.5, -0.22);
          const banner = flag('#e03131', '#ffffff', 0.24, 0.14);
          banner.position.set(0.008, y + 0.65, -0.22);
          const visitor = walker('#ffd43b');
          return {
            parts: [b.mesh(), banner, visitor],
            update(t) {
              banner.rotation.y = Math.sin(t * 2.4) * 0.5;
              banner.scale.x = 1 + Math.sin(t * 6) * 0.15;
              visitor.position.set(-0.14 + pingpong(t * 0.3) * 0.28, y + 0.272 + Math.abs(Math.sin(t * 7)) * 0.012, 0.0);
            },
          };
        },
      },
      {
        name: 'Palais du sultan',
        match: 'Palais du sultan',
        dx: 0.26,
        dz: -0.08,
        size: 0.26,
        height: 1.15,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const g = isle(b, w, 0.64);
          b.cyl(GRASS, 0.56, 0.62, 0.05, 10, 0, g + 0.025, 0);
          const y = g + 0.05;
          // Le kedaton : grande maison jaune pâle en haut de son escalier
          b.box('#e9e2d0', 0.9, 0.14, 0.44, 0, y + 0.07, -0.16);
          b.box('#f8f9fa', 0.26, 0.03, 0.34, 0, y + 0.06, 0.2, 0.42, 0, 0);
          b.box('#f6e58d', 0.72, 0.24, 0.26, 0, y + 0.26, -0.22);
          b.cyl('#f6e58d', 0.15, 0.15, 0.24, 8, 0, y + 0.26, -0.07); // avant-corps à pans coupés
          b.poly('#6c7a89', [[-0.2, 0], [0.2, 0], [0, 0.14]], 0.8, 0, y + 0.38, -0.22, 0, PI / 2, 0);
          b.cone('#6c7a89', 0.19, 0.14, 8, 0, y + 0.45, -0.07);
          for (const x of [-0.27, -0.2, 0.2, 0.27]) b.box('#2b8a3e', 0.05, 0.11, 0.02, x, y + 0.27, -0.088);
          b.box('#6b4423', 0.07, 0.13, 0.02, 0, y + 0.22, 0.08);
          for (const x of [-0.38, 0.38]) b.cyl('#adb5bd', 0.008, 0.008, 0.5, 4, x, y + 0.39, 0.0);
          bush(b, -0.4, y, 0.26, 0.07).ball('#2f9e44', 0.07, 0.4, y + 0.05, 0.26);
          const banner = flag('#ffd43b', '#2b8a3e', 0.2, 0.12);
          banner.position.set(-0.375, y + 0.58, 0);
          // Le parasol jaune du sultan
          const parasol = new Builder().cyl('#6b4423', 0.008, 0.008, 0.34, 4, 0, -0.17, 0).cone('#ffd43b', 0.13, 0.07, 8, 0, 0.03, 0).cyl('#e8590c', 0.132, 0.132, 0.015, 8, 0, -0.01, 0).mesh(0.38, y + 0.48, 0);
          const guard = walker('#1d2b53', '#e03131');
          return {
            parts: [b.mesh(), banner, parasol, guard],
            update(t) {
              banner.rotation.y = Math.sin(t * 2.2) * 0.5;
              parasol.rotation.z = Math.sin(t * 1.5) * 0.1;
              parasol.rotation.y = t * 0.6;
              guard.position.set(-0.34 + pingpong(t * 0.25) * 0.68, y + 0.14 + Math.abs(Math.sin(t * 7)) * 0.012, 0.0);
            },
          };
        },
      },
      {
        name: 'Girofliers',
        match: 'Girofliers du Gamalama',
        dx: -0.46,
        dz: 0.14,
        size: 0.26,
        height: 1.25,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const g = isle(b, w, 0.58);
          b.cyl('#6fbf4b', 0.52, 0.57, 0.05, 10, 0, g + 0.025, 0);
          const y = g + 0.05;
          cloveTree(b, -0.26, -0.2, 1.15, y);
          cloveTree(b, 0.22, -0.28, 0.95, y);
          // Échelle de bambou appuyée au plus vieux
          for (const z of [-0.17, -0.11]) beam(b, '#c49a4a', 0.02, y, z, -0.16, y + 0.52, z, 0.014, 0.014);
          for (let i = 1; i < 5; i++) b.box('#c49a4a', 0.012, 0.012, 0.07, 0.02 - i * 0.036, y + i * 0.104, -0.14);
          // Les clous sèchent sur une bâche bleue
          b.box('#339af0', 0.52, 0.012, 0.36, 0.12, y + 0.006, 0.24);
          b.box('#7a4a2a', 0.44, 0.014, 0.28, 0.12, y + 0.016, 0.24);
          for (let i = 0; i < 6; i++) b.box('#a0623a', 0.05, 0.016, 0.04, -0.04 + (i % 3) * 0.14, y + 0.018, 0.17 + Math.floor(i / 3) * 0.13);
          b.cyl('#d9b384', 0.06, 0.045, 0.07, 7, -0.36, y + 0.035, 0.34).cyl('#7a4a2a', 0.052, 0.052, 0.01, 7, -0.36, y + 0.072, 0.34);
          const picker = walker('#e8590c', '#f2d16b', 0.75);
          const r = new Builder();
          person(r, '#7048e8', '#f2d16b', 0, 0, 0, 0.8);
          beam(r, '#c49a4a', 0.03, 0.14, 0, 0.24, 0.01, 0, 0.012, 0.012);
          r.box('#c49a4a', 0.012, 0.012, 0.12, 0.24, 0.01, 0);
          const raker = r.mesh();
          return {
            parts: [b.mesh(), picker, raker],
            update(t) {
              picker.position.set(-0.12, y + 0.3 + Math.sin(t * 1.2) * 0.04, -0.14);
              picker.rotation.z = 0.3 + Math.sin(t * 3) * 0.1;
              // Le râteau retourne les clous
              raker.position.set(-0.22 + Math.sin(t * 2) * 0.05, y, 0.24);
              raker.rotation.y = Math.sin(t * 0.7) * 0.4;
            },
          };
        },
      },
      {
        name: 'Thon cru et sagou',
        match: 'Thon cru et sagou',
        dx: -0.18,
        dz: 0.48,
        size: 0.24,
        height: 1.05,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const y = w + 0.06; // le plancher du warung, sur pilotis
          stilts(b, w, [[-0.44, -0.34], [0.44, -0.34], [-0.44, 0.34], [0.44, 0.34], [0, 0.34], [0, -0.34]], y - 0.03, 0.05);
          b.box(PLANK, 0.98, 0.04, 0.8, 0, y - 0.02, 0);
          // Comptoir bleu, auvent rayé
          b.box('#1c7ed6', 0.5, 0.2, 0.16, -0.2, y + 0.1, -0.28);
          for (const x of [-0.44, 0.04]) b.box('#868e96', 0.015, 0.44, 0.015, x, y + 0.22, -0.36);
          for (let i = 0; i < 5; i++) b.box(i % 2 ? '#ffffff' : '#e03131', 0.104, 0.02, 0.26, -0.41 + i * 0.104, y + 0.44, -0.27, 0.25, 0, 0);
          person(b, '#e64980', null, -0.2, y, -0.38, 0.9);
          // Table ronde et bols géants
          b.cyl('#8d5a2b', 0.03, 0.03, 0.12, 6, 0.14, y + 0.06, 0.12);
          b.cyl('#c98f52', 0.3, 0.3, 0.03, 10, 0.14, y + 0.135, 0.12);
          const ty = y + 0.15;
          // Gohu ikan : dés de thon cru, basilic, cacahuètes
          b.cyl('#f8f9fa', 0.11, 0.08, 0.05, 8, 0.02, ty + 0.025, 0.06);
          for (const [x, z, c] of [[-0.02, 0.03, '#e03131'], [0.05, 0.07, '#c92a2a'], [0.0, 0.1, '#e03131'], [0.06, 0.01, '#f03e3e']]) b.box(c, 0.045, 0.045, 0.045, x, ty + 0.065, z, 0.3, 0.5, 0);
          b.ball('#2f9e44', 0.022, -0.01, ty + 0.085, 0.07).ball('#2f9e44', 0.02, 0.05, ty + 0.09, 0.04).ball('#e9c46a', 0.016, 0.03, ty + 0.09, 0.1);
          // Papeda : la pâte de sagou translucide
          b.cyl('#f8f9fa', 0.1, 0.075, 0.05, 8, 0.27, ty + 0.025, 0.1);
          b.ball('#dfe7ea', 0.075, 0.27, ty + 0.05, 0.1, 1, 0.6, 1);
          // Bouillon jaune au poisson, verre d'air guraka
          b.cyl('#f8f9fa', 0.085, 0.065, 0.045, 8, 0.14, ty + 0.022, 0.28);
          b.cyl('#f2c14e', 0.07, 0.07, 0.01, 8, 0.14, ty + 0.048, 0.28);
          b.octa('#adb5bd', 0.03, 0.14, ty + 0.06, 0.28, 1.6, 0.5, 0.7);
          b.cyl('#a0623a', 0.03, 0.025, 0.07, 6, 0.3, ty + 0.035, -0.08);
          person(b, '#2f9e44', null, -0.24, y, 0.2, 0.85);
          // Les baguettes enroulent le papeda
          const sticks = new Builder().box('#e9d8a6', 0.012, 0.2, 0.012, -0.02, 0.1, 0, 0, 0, 0.25).box('#e9d8a6', 0.012, 0.2, 0.012, 0.02, 0.1, 0, 0, 0, -0.25).ball('#dfe7ea', 0.032, 0, 0.01, 0).mesh();
          const steam = [puff(0.05), puff(0.05)];
          return {
            parts: [b.mesh(), sticks, ...steam],
            update(t) {
              sticks.position.set(0.27, ty + 0.09 + Math.max(0, Math.sin(t * 1.3)) * 0.1, 0.1);
              sticks.rotation.y = t * 5;
              rise(steam[0], (t * 0.4) % 1, 0.3, ty + 0.08, -0.08, 0.3, 0.05, 0.9);
              rise(steam[1], (t * 0.4 + 0.5) % 1, 0.14, ty + 0.06, 0.28, 0.3, -0.05, 0.9);
            },
          };
        },
      },
      {
        name: 'Tidore',
        match: 'Journée à Tidore',
        dx: 0.18,
        dz: 0.36,
        size: 0.26,
        height: 1.12,
        build() {
          const b = new Builder();
          pad(b, '#6fbf4b', 0.44, 0.04, -0.06, 0.08, 0.15);
          // Le fort Tahula, bâti par les Espagnols, en haut d'un long escalier
          b.cyl('#7ab55a', 0.2, 0.32, 0.3, 8, 0.2, 0.23, -0.2);
          b.box('#8f8a7e', 0.3, 0.14, 0.24, 0.2, 0.45, -0.2);
          b.box('#7a756a', 0.24, 0.02, 0.18, 0.2, 0.522, -0.2);
          for (const x of [0.06, 0.34]) b.cyl('#8f8a7e', 0.085, 0.095, 0.17, 8, x, 0.465, -0.09).cyl('#7a756a', 0.06, 0.06, 0.02, 8, x, 0.552, -0.09);
          beam(b, '#f8f9fa', 0.2, 0.09, 0.3, 0.2, 0.4, -0.06, 0.09, 0.025);
          cloveTree(b, -0.22, -0.26, 0.8, 0.08);
          cloveTree(b, -0.28, 0.1, 0.6, 0.08);
          b.cyl('#6b4423', 0.012, 0.012, 0.36, 4, 0.2, 0.7, -0.24);
          const banner = flag('#e03131', '#ffffff', 0.2, 0.12);
          banner.position.set(0.208, 0.82, -0.24);
          const visitor = walker('#1c7ed6');
          // Le bateau rapide de Bastiong, dans le détroit
          const boat = speedboat('#e03131', 0.9).mesh();
          const wake = new Builder().ball('#ffffff', 0.05, 0, 0, 0.05).ball('#ffffff', 0.04, -0.07, 0, -0.05).mesh();
          const sea = afloat(boat, wake);
          return raised({
            parts: [b.mesh(), banner, visitor, sea],
            update(t) {
              ride(sea, t);
              banner.rotation.y = Math.sin(t * 2.3) * 0.5;
              // Montée et descente de l'escalier
              const u = pingpong(t * 0.2);
              visitor.position.set(0.2, 0.1 + u * 0.3, 0.3 - u * 0.36);
              // Allers-retours entre les deux îles
              const k = pingpong(t * 0.12);
              const dir = (t * 0.12) % 2 < 1 ? 1 : -1;
              boat.position.set(-0.62 - k * 0.3, 0.02, -0.3 - k * 0.5);
              boat.rotation.y = dir > 0 ? PI - 1.03 : -1.03;
              boat.rotation.z = Math.sin(t * 5) * 0.05;
              wake.position.set(boat.position.x + dir * 0.13, 0.02, boat.position.z + dir * 0.21);
              wake.scale.setScalar(0.8 + Math.sin(t * 6) * 0.25);
            },
          }, 0.12);
        },
      },
    ],
  };
}

// ---------- Morotai ----------
// Le repère est au milieu de l'île ; Daruba, les musées et les îlots sont tout au sud-ouest.

function morotai() {
  const S = 0.45;
  return {
    scale: S,
    items: [
      {
        name: 'Îles de Dodola',
        match: 'Îles de Dodola',
        dx: -0.6,
        dz: 0.4,
        size: 0.26,
        height: 0.95,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const g = isle(b, w, 0.28, -0.32, -0.12); // Dodola Besar
          b.ball('#51cf66', 0.2, -0.36, g, -0.18, 1.2, 0.5, 1, 1);
          hut(b, -0.22, -0.1, 0.6, g - 0.01);
          const [hx, hy, hz] = trunk(b, -0.44, -0.04, 0.55, -0.08, g);
          const leaves = fronds(new Builder(), 0, 0, 0, 0.55).mesh(hx, hy, hz);
          const g2 = isle(b, w, 0.14, 0.42, 0.16); // Dodola Kecil
          bush(b, 0.4, g2, 0.12, 0.08);
          palm(b, 0.44, 0.18, 0.4, 0.06, g2);
          // La langue de sable blanc : la houle la couvre et la découvre
          const bar = 0.45 * w;
          for (let i = 0; i <= 4; i++) b.cyl('#fff3c4', 0.06, 0.36, 2.2 * w, 8, -0.06 + i * 0.09, bar - 1.1 * w, -0.02 + i * 0.04);
          const pair = new Builder();
          person(pair, '#e64980', null, 0, 0, 0, 0.7);
          person(pair, '#1c7ed6', '#f2d16b', -0.07, 0, 0.02, 0.7);
          const walkers = pair.mesh();
          const r = shoal(new Builder(), 0.66, 0.02, 0.04);
          corals(r, 0.2, 0.42, 1);
          const boat = skiff('#ffffff', '#2f9e44', 0.85).mesh(-0.2, 0.02, 0.42);
          const diver = swimmer('#ff7b1c', 0.45);
          const sea = afloat(r.mesh(), boat, diver);
          return {
            parts: [b.mesh(), leaves, walkers, sea],
            update(t) {
              ride(sea, t);
              leaves.rotation.z = Math.sin(t * 1.4) * 0.14;
              // On traverse à pied d'une île à l'autre
              const u = pingpong(t * 0.18);
              walkers.position.set(-0.04 + u * 0.36, bar + Math.abs(Math.sin(t * 7)) * 0.012, -0.01 + u * 0.16);
              boat.rotation.z = Math.sin(t * 1.9) * 0.1;
              circle(diver, t * 0.5, 0.32, 0.05, 0.46, 0.14);
            },
          };
        },
      },
      {
        name: 'Zum Zum',
        match: 'Tournée des îlots',
        dx: -0.46,
        dz: 0.88,
        size: 0.24,
        height: 1.15,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const g = isle(b, w, 0.36);
          b.ball('#51cf66', 0.2, -0.14, g, -0.12, 1.2, 0.5, 1, 1);
          // La statue de MacArthur : socle blanc, silhouette kaki, casquette, pipe
          b.box('#e9ecef', 0.22, 0.03, 0.22, 0.1, g + 0.015, 0.06);
          b.box('#f8f9fa', 0.16, 0.16, 0.16, 0.1, g + 0.11, 0.06);
          person(b, '#a39a6b', null, 0.1, g + 0.19, 0.06, 1.3);
          b.cyl('#8a8255', 0.05, 0.062, 0.03, 8, 0.1, g + 0.525, 0.045).box('#8a8255', 0.07, 0.012, 0.04, 0.1, g + 0.512, 0.1);
          b.box('#212529', 0.075, 0.018, 0.012, 0.1, g + 0.465, 0.115); // lunettes noires
          b.box('#6b4423', 0.012, 0.012, 0.08, 0.12, g + 0.44, 0.13);
          palm(b, -0.22, 0.08, 0.42, -0.06, g);
          const [hx, hy, hz] = trunk(b, -0.1, -0.2, 0.6, 0.1, g);
          const leaves = fronds(new Builder(), 0, 0, 0, 0.55).mesh(hx, hy, hz);
          b.cyl('#adb5bd', 0.008, 0.008, 0.5, 4, 0.28, g + 0.25, -0.08);
          const banner = flag('#e03131', '#ffffff', 0.18, 0.11);
          banner.position.set(0.285, g + 0.44, -0.08);
          // Le bateau loué à Daruba fait le tour de l'îlot
          const boat = speedboat('#1c7ed6', 0.9).mesh();
          const sea = afloat(shoal(new Builder(), 0.7).mesh(), boat);
          return {
            parts: [b.mesh(), leaves, banner, sea],
            update(t) {
              ride(sea, t);
              leaves.rotation.z = Math.sin(t * 1.5) * 0.14;
              banner.rotation.y = Math.sin(t * 2.4) * 0.5;
              circle(boat, t * 0.45, 0, 0.02, 0, 0.6);
              boat.rotation.z = Math.sin(t * 5) * 0.04;
            },
          };
        },
      },
      {
        name: 'Blindés de 1944',
        match: 'Musées de la guerre',
        dx: -0.18,
        dz: 0.66,
        size: 0.24,
        height: 1.1,
        build() {
          // Daruba est au bord de l'eau, au pied d'une île très pentue : on pose la cour sur un cap, contre la côte
          const w = swell(S, this);
          const cape = new Builder();
          const g = isle(cape, w, 0.62, 0, 0, '#cfc8b8');
          const b = new Builder();
          // Les deux musées côte à côte
          b.box('#fdfdf7', 0.42, 0.22, 0.22, -0.26, 0.16, -0.32);
          b.poly('#b5523a', [[-0.15, 0], [0.15, 0], [0, 0.1]], 0.46, -0.26, 0.27, -0.32, 0, PI / 2, 0);
          b.box('#1d2b53', 0.08, 0.13, 0.02, -0.26, 0.115, -0.205);
          b.box('#f1e3c4', 0.36, 0.2, 0.22, 0.26, 0.15, -0.32);
          b.poly('#55633a', [[-0.15, 0], [0.15, 0], [0, 0.1]], 0.4, 0.26, 0.25, -0.32, 0, PI / 2, 0);
          b.box('#1d2b53', 0.08, 0.13, 0.02, 0.26, 0.115, -0.205);
          // Véhicule amphibie de 1944, rouillé, dans la cour
          b.poly('#8a5a3c', [[-0.24, 0], [0.2, 0], [0.28, 0.08], [0.2, 0.16], [-0.24, 0.16]], 0.2, -0.02, 0.08, 0.12);
          for (const z of [0.0, 0.24]) {
            b.box('#4a3a30', 0.5, 0.08, 0.05, -0.01, 0.09, z);
            for (let i = 0; i < 5; i++) b.cyl('#2d2420', 0.035, 0.035, 0.056, 6, -0.2 + i * 0.1, 0.085, z, PI / 2, 0, 0);
          }
          b.box('#a8623a', 0.14, 0.012, 0.1, -0.14, 0.245, 0.12).box('#a8623a', 0.07, 0.012, 0.06, 0.12, 0.245, 0.16);
          const turret = new Builder().cyl('#7a4e33', 0.07, 0.08, 0.07, 7, 0, 0.035, 0).cyl('#4a3a30', 0.014, 0.014, 0.2, 5, 0.14, 0.045, 0, 0, 0, PI / 2).mesh(0.02, 0.24, 0.12);
          b.cyl('#adb5bd', 0.008, 0.008, 0.5, 4, 0.5, 0.3, 0.02);
          const banner = flag('#e03131', '#ffffff', 0.2, 0.12);
          banner.position.set(0.505, 0.5, 0.02);
          const visitor = walker('#ffd43b');
          const court = raised({ parts: [b.mesh(), turret, banner, visitor] }, g - 0.05).parts[0];
          return {
            parts: [cape.mesh(), court],
            update(t) {
              turret.rotation.y = Math.sin(t * 0.6) * 0.7;
              banner.rotation.y = Math.sin(t * 2.3) * 0.5;
              circle(visitor, t * 0.4, -0.02, 0.05 + Math.abs(Math.sin(t * 7)) * 0.012, 0.14, 0.42, 0.26);
            },
          };
        },
      },
      {
        name: 'Monument Nakamura',
        match: 'Musées de la guerre',
        dx: 0.12,
        dz: 0.12,
        size: 0.22,
        height: 0.95,
        build() {
          const b = new Builder();
          pad(b, '#5fae4a', 0.56, 0, 0, 0.05);
          // Le soldat resté caché jusqu'en 1974, statufié au milieu de la jungle
          b.box('#e9ecef', 0.26, 0.05, 0.26, 0, 0.075, 0.1);
          b.box('#f8f9fa', 0.17, 0.2, 0.17, 0, 0.2, 0.1);
          person(b, '#6b7a4a', null, 0, 0.3, 0.1, 1.25);
          b.cyl('#55633a', 0.05, 0.062, 0.03, 6, 0, 0.622, 0.085).box('#55633a', 0.07, 0.012, 0.04, 0, 0.61, 0.14);
          b.box('#4a3628', 0.016, 0.34, 0.016, 0.1, 0.5, 0.1, 0, 0, -0.18);
          // Sa cabane de branches
          b.cone('#8a7a45', 0.14, 0.18, 4, 0.34, 0.14, -0.2, 0, PI / 4, 0).box('#2a2222', 0.07, 0.08, 0.02, 0.34, 0.09, -0.1);
          for (const [x, z, h] of [[-0.34, -0.2, 0.5], [0.1, -0.36, 0.6], [-0.36, 0.22, 0.4]]) b.cyl('#7a4b25', 0.03, 0.045, h, 5, x, 0.05 + h / 2, z);
          for (const [x, z] of [[-0.14, -0.3], [0.36, 0.2], [-0.2, 0.36], [0.24, 0.36]]) b.cone('#40c057', 0.06, 0.12, 5, x, 0.11, z);
          const c = new Builder();
          c.ball('#2f9e44', 0.24, -0.34, 0.6, -0.2, 1.1, 0.7, 1.1, 1).ball('#237a36', 0.26, 0.1, 0.72, -0.36, 1.2, 0.7, 1.1, 1).ball('#40c057', 0.2, -0.36, 0.5, 0.22, 1.1, 0.7, 1.1, 1);
          const canopy = c.mesh();
          // Un perroquet tourne au-dessus de la clairière
          const p = new Builder();
          p.octa('#e03131', 0.05, 0, 0, 0, 1.6, 0.8, 0.7).box('#1c7ed6', 0.05, 0.012, 0.2, 0, 0.01, 0).cone('#ffd43b', 0.015, 0.04, 4, 0.09, 0, 0, 0, 0, -PI / 2);
          const parrot = p.mesh();
          return raised({
            parts: [b.mesh(), canopy, parrot],
            update(t) {
              canopy.rotation.z = Math.sin(t * 1.1) * 0.03;
              circle(parrot, t * 1.1, 0, 0.82 + Math.sin(t * 2.3) * 0.05, 0.05, 0.3);
              parrot.rotation.z = Math.sin(t * 9) * 0.3;
            },
          }, 0.1);
        },
      },
      {
        name: "Source d'Air Kaca",
        match: "Source d'Air Kaca",
        dx: 0.46,
        dz: 0.47,
        size: 0.22,
        height: 1.0,
        build() {
          const w = swell(S, this);
          const cape = new Builder();
          const g = isle(cape, w, 0.56, 0, 0, '#6fbf4b');
          const b = new Builder();
          // Le bassin d'« eau de verre », cerné de rochers
          b.cyl('#8d8478', 0.36, 0.4, 0.08, 9, 0, 0.07, 0.04);
          b.cyl('#5fe0ea', 0.3, 0.3, 0.02, 9, 0, 0.105, 0.04);
          for (let i = 0; i < 9; i++) {
            const a = (i / 9) * TAU + 0.3;
            b.ball(i % 2 ? '#9a958a' : '#7d766d', 0.07 + (i % 3) * 0.015, Math.cos(a) * 0.36, 0.1, 0.04 + Math.sin(a) * 0.36, 1.1, 0.8, 1.1);
          }
          b.cyl('#7a4b25', 0.03, 0.04, 0.4, 5, -0.3, 0.24, -0.34).ball('#2f9e44', 0.2, -0.3, 0.5, -0.34, 1.2, 0.75, 1.1, 1);
          bush(b, 0.3, 0.04, -0.38, 0.1, '#40c057');
          // Souvenir des Américains venus y faire le plein d'eau : un jerrycan et un casque
          b.box('#55633a', 0.08, 0.11, 0.05, 0.44, 0.095, 0.2).box('#55633a', 0.03, 0.02, 0.03, 0.42, 0.16, 0.2);
          b.ball('#55633a', 0.045, 0.34, 0.16, 0.3, 1, 0.7, 1);
          const bather = new Builder().ball(SKIN, 0.05, 0, 0.06, 0).cyl(SKIN, 0.045, 0.05, 0.05, 6, 0, 0, 0).ball('#343a40', 0.04, 0, 0.09, -0.01, 1, 0.6, 1).mesh();
          const ripple = new Builder().cyl('#d0f7fa', 0.12, 0.12, 0.006, 10, 0, 0, 0).mesh();
          const kid = walker('#e64980', null, 0.6);
          const spring = raised({ parts: [b.mesh(), ripple, bather, kid] }, g - 0.04).parts[0];
          return {
            parts: [cape.mesh(), spring],
            update(t) {
              bather.position.set(-0.04 + Math.sin(t * 0.5) * 0.08, 0.115 + Math.sin(t * 2.4) * 0.012, 0.06);
              const k = (t * 0.6) % 1;
              ripple.position.set(bather.position.x, 0.118, 0.06);
              ripple.scale.set(0.5 + k * 1.3, 1, 0.5 + k * 1.3);
              ripple.visible = k < 0.85;
              // Un enfant saute du rocher
              const u = (t * 0.5) % 1;
              const j = Math.min(1, u / 0.5);
              kid.position.set(0.3 - j * 0.14, 0.17 + Math.sin(j * PI) * 0.16 - j * 0.1, -0.1 + j * 0.06);
              kid.scale.setScalar(u < 0.5 ? 0.9 : Math.max(0.01, 0.9 - (u - 0.5) * 6));
            },
          };
        },
      },
    ],
  };
}

// ---------- Kri, Gam et Arborek ----------
// Le repère est sur l'îlot d'Arborek ; Kri est le petit îlot à l'est, Gam la grande île au nord.

// Paradisier rouge mâle, tourné vers +x : corps brun, tête jaune, gorge verte, plumes de parade rouges, deux brins noirs.
function redParadise() {
  const m = new Builder();
  m.ball('#8a3b1e', 0.075, 0, 0.08, 0, 1.5, 1, 0.95, 1);
  m.ball('#ffd43b', 0.05, 0.11, 0.14, 0);
  m.ball('#2f9e44', 0.032, 0.145, 0.125, 0, 1, 0.9, 1.1);
  m.cone('#a5d8ff', 0.014, 0.06, 4, 0.19, 0.14, 0, 0, 0, -PI / 2);
  m.ball('#1d2b53', 0.012, 0.14, 0.16, 0.035).ball('#1d2b53', 0.012, 0.14, 0.16, -0.035);
  for (let i = -2; i <= 2; i++) m.box(i % 2 ? '#ff6b6b' : '#e03131', 0.035, 0.28, 0.014, -0.16, 0.2, i * 0.045, i * 0.28, 0, 0.7);
  for (const s of [-1, 1]) {
    m.box('#212529', 0.24, 0.008, 0.008, -0.2, 0.0, s * 0.03, 0, 0, 0.5);
    m.octa('#212529', 0.02, -0.31, -0.06, s * 0.03, 1, 1, 0.4);
  }
  m.box('#495057', 0.012, 0.06, 0.012, 0.02, 0.0, 0.03).box('#495057', 0.012, 0.06, 0.012, 0.02, 0.0, -0.03);
  return m.mesh();
}

function kri() {
  const S = 0.4;
  return {
    scale: S,
    items: [
      {
        name: 'Arborek',
        match: 'Arborek et son ponton',
        dx: 0.0,
        dz: -0.05,
        size: 0.26,
        height: 0.95,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const g = isle(b, w, 0.36, -0.06, -0.18);
          // Village fleuri : trois cases aux toits de couleur
          hut(b, -0.22, -0.26, 0.5, g - 0.01, '#fdfdf7', '#1c7ed6');
          hut(b, 0.08, -0.32, 0.5, g - 0.01, '#fdfdf7', '#e03131');
          hut(b, -0.06, -0.06, 0.5, g - 0.01, '#fdfdf7', '#2f9e44');
          for (let i = 0; i < 9; i++) b.ball(['#ff6b9d', '#ffd43b', '#f783ac'][i % 3], 0.024, -0.32 + ((i * 37) % 50) / 100, g + 0.02, -0.4 + ((i * 53) % 44) / 100);
          palm(b, 0.18, -0.14, 0.4, 0.06, g);
          const [hx, hy, hz] = trunk(b, -0.32, -0.08, 0.5, -0.08, g);
          const leaves = fronds(new Builder(), 0, 0, 0, 0.5).mesh(hx, hy, hz);
          // Le ponton et son abri
          const d = w + 0.07;
          stilts(b, w, [[0.07, 0.24], [0.15, 0.24], [0.07, 0.44], [0.15, 0.44], [0.02, 0.6], [0.2, 0.6], [0.02, 0.72], [0.2, 0.72]], d, 0.025);
          b.box(PLANK, 0.1, 0.025, 0.5, 0.11, d, 0.36);
          b.box(PLANK, 0.22, 0.025, 0.16, 0.11, d, 0.66);
          for (const [x, z] of [[0.02, 0.6], [0.2, 0.6], [0.02, 0.72], [0.2, 0.72]]) b.box(DARK, 0.016, 0.16, 0.016, x, d + 0.09, z);
          b.pyr(THATCH, 0.17, 0.09, 0.11, d + 0.21, 0.66);
          // Une tresseuse et son chapeau de pandanus en forme de raie manta
          person(b, '#e64980', null, 0.08, g, -0.02, 0.7);
          b.octa('#2b3a55', 0.07, 0.08, g + 0.2, -0.02, 1.5, 0.25, 0.9);
          // Sous le ponton : bancs de poissons entre des piliers couverts de coraux mous
          const r = shoal(new Builder(), 0.74, 0.02, 0.12);
          for (const [x, z, c] of [[0.05, 0.24, '#ff922b'], [0.17, 0.26, '#ff6b9d'], [0.05, 0.45, '#b197fc'], [0.18, 0.43, '#ffa94d'], [0.0, 0.62, '#ff6b9d'], [0.23, 0.6, '#ff922b'], [0.0, 0.75, '#ffa94d'], [0.22, 0.74, '#b197fc']]) r.ball(c, 0.04, x, 0.03, z, 1, 1.3, 1);
          corals(r, -0.44, 0.2, 0.9);
          corals(r, 0.42, 0.42, 0.7);
          const fishes = school(['#ffd43b', '#e7f5ff', '#74c0fc'], 9, 0.17, 0.7);
          fishes.position.set(0.11, 0.06, 0.42);
          const sea = afloat(r.mesh(), fishes);
          const kid = walker('#e64980', null, 0.6);
          return {
            parts: [b.mesh(), leaves, kid, sea],
            update(t) {
              ride(sea, t);
              leaves.rotation.z = Math.sin(t * 1.4) * 0.14;
              fishes.rotation.y = t * 1.3;
              // Un enfant saute du bout du ponton
              const u = (t * 0.45) % 1;
              const j = Math.min(1, u / 0.55);
              kid.position.set(0.24 + j * 0.2, d + 0.02 + Math.sin(j * PI) * 0.2 - j * d, 0.68);
              kid.rotation.z = -j * 2.5;
              kid.scale.setScalar(u < 0.55 ? 1 : Math.max(0.01, 1 - (u - 0.55) * 6));
            },
          };
        },
      },
      {
        name: 'Homestay',
        match: 'Dormir en homestay',
        dx: 0.42,
        dz: 0.04,
        size: 0.26,
        height: 1.15,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const d = w + 0.1;
          stilts(b, w, [[-0.36, -0.3], [0.32, -0.3], [-0.36, 0.14], [0.32, 0.14], [-0.02, -0.3], [-0.02, 0.14]], d, 0.035);
          b.box(PLANK, 0.78, 0.03, 0.52, -0.02, d, -0.08);
          // Cabane en feuilles de palmier, toit de chaume pentu
          b.box('#c9a352', 0.44, 0.2, 0.3, -0.14, d + 0.115, -0.16);
          b.box('#b08a3e', 0.45, 0.02, 0.31, -0.14, d + 0.09, -0.16).box('#b08a3e', 0.45, 0.02, 0.31, -0.14, d + 0.16, -0.16);
          b.box(DARK, 0.09, 0.14, 0.02, -0.14, d + 0.085, -0.005);
          b.poly('#d9b45a', [[-0.25, 0], [0.25, 0], [0, 0.24]], 0.56, -0.14, d + 0.215, -0.16, 0, PI / 2, 0);
          b.box('#8a6a2f', 0.58, 0.02, 0.03, -0.14, d + 0.455, -0.16);
          // L'escalier qui descend au récif
          beam(b, PLANK, 0.2, d, 0.18, 0.2, d - 2 * w - 0.1, 0.48, 0.11, 0.02);
          for (const x of [0.16, 0.34]) b.box(DARK, 0.02, 0.26, 0.02, x, d + 0.13, 0.0);
          const bed = hammock('#1c7ed6');
          bed.position.set(0.25, d + 0.24, 0);
          // Sous la cabane : coraux et requin à pointe noire
          const r = shoal(new Builder(), 0.7, 0, 0.06);
          corals(r, -0.4, 0.36, 1);
          corals(r, 0.44, 0.3, 0.8);
          const s = new Builder();
          s.octa('#7b8794', 0.07, 0, 0.012, 0, 2.6, 0.3, 0.7);
          s.poly('#7b8794', [[-0.05, 0], [0.05, 0], [-0.04, 0.12]], 0.014, 0, 0.02, 0);
          s.poly('#212529', [[-0.042, 0.08], [-0.01, 0.08], [-0.04, 0.125]], 0.016, 0, 0.02, 0);
          s.poly('#7b8794', [[-0.16, 0], [-0.24, 0.07], [-0.2, 0]], 0.012, 0, 0.012, 0);
          const shark = s.mesh();
          const sea = afloat(r.mesh(), shark);
          return {
            parts: [b.mesh(), bed, sea],
            update(t) {
              ride(sea, t);
              bed.rotation.x = Math.sin(t * 1.7) * 0.35;
              circle(shark, t * 0.5, 0.0, 0.01, 0.34, 0.42, 0.18);
            },
          };
        },
      },
      {
        name: 'Récif de Kri',
        match: 'Snorkeling sur le récif',
        dx: 0.8,
        dz: 0.12,
        size: 0.26,
        height: 0.7,
        build() {
          // Le récif de la côte nord : crête de corail, bleu profond, tourbillon de poissons
          const r = shoal(new Builder(), 0.66);
          r.cyl('#1c94bd', 0.34, 0.34, 0.014, 10, 0.12, 0.007, 0.3);
          corals(r, -0.22, -0.26, 1.3);
          corals(r, 0.2, -0.34, 1.1);
          corals(r, -0.42, 0.04, 1);
          r.cyl('#8a6d5a', 0.02, 0.03, 0.06, 5, 0.42, 0.04, -0.08).cyl('#ffd43b', 0.12, 0.085, 0.03, 8, 0.42, 0.08, -0.08);
          r.ball('#e599f7', 0.09, 0.02, 0.03, -0.1, 1.1, 0.7, 1, 1);
          const outer = school(['#ffd43b', '#f8f9fa', '#4dabf7'], 11, 0.34, 1);
          const inner = school(['#ff922b', '#ff6b9d', '#63e6be'], 7, 0.2, 1.3);
          const diver = swimmer('#e64980', 0.5);
          const boat = skiff('#ffffff', '#e8590c', 0.8);
          person(boat, '#2f9e44', '#f2d16b', -0.06, 0.04, 0, 0.6);
          const guide = boat.mesh();
          const sea = afloat(r.mesh(), outer, inner, diver, guide);
          return {
            parts: [sea],
            update(t) {
              ride(sea, t);
              outer.rotation.y = t * 0.9;
              outer.position.set(0.02, 0.1 + Math.sin(t * 1.3) * 0.02, 0.06);
              inner.rotation.y = -t * 1.4;
              inner.position.set(0.02, 0.2 + Math.sin(t * 1.7) * 0.03, 0.06);
              // Le courant porte le long du récif : palmes aux pieds, et le guide suit en barque
              const u = pingpong(t * 0.14);
              const dir = (t * 0.14) % 2 < 1 ? 0 : PI;
              diver.position.set(-0.4 + u * 0.8, 0.05, 0.44);
              diver.rotation.y = dir;
              guide.position.set(-0.36 + u * 0.7, 0.02, 0.6);
              guide.rotation.y = dir;
              guide.rotation.z = Math.sin(t * 2) * 0.08;
            },
          };
        },
      },
      {
        name: 'Yenbuba',
        match: 'Dormir à la pointe ouest',
        dx: 0.2,
        dz: 0.36,
        size: 0.24,
        height: 0.9,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const g = isle(b, w, 0.2, -0.3, -0.22);
          hut(b, -0.3, -0.26, 0.62, g - 0.01);
          palm(b, -0.44, -0.1, 0.42, -0.06, g);
          // Le ponton du homestay
          const d = w + 0.07;
          stilts(b, w, [[-0.06, -0.12], [-0.12, -0.06], [0.14, 0.08], [0.08, 0.14], [0.36, 0.3], [0.3, 0.36]], d, 0.025);
          b.box(PLANK, 0.68, 0.025, 0.1, 0.1, d, 0.1, 0, -PI / 4, 0);
          person(b, '#ffd43b', null, 0.3, d + 0.012, 0.3, 0.6);
          // Les bancs de sable par où l'on rejoint le village à marée basse
          const bar = 0.4 * w;
          for (let i = 0; i < 4; i++) b.cyl('#fff3c4', 0.06, 0.34, 2.2 * w, 8, -0.5 + i * 0.09, bar - 1.1 * w, 0.2 + i * 0.07);
          const hiker = walker('#e64980', '#f2d16b', 0.65);
          // Sous le ponton : poissons, petits requins, tortues
          const r = shoal(new Builder(), 0.7, 0.04, 0.08);
          corals(r, 0.5, 0.1, 0.8);
          corals(r, -0.1, 0.52, 0.7);
          const turtle = createModel('turtle');
          turtle.object.scale.setScalar(0.62);
          turtle.object.position.set(0.14, 0.01, 0.44);
          const fishes = school(['#ffd43b', '#e7f5ff', '#ff922b'], 7, 0.15, 0.7);
          fishes.position.set(0.3, 0.06, 0.06);
          const sea = afloat(r.mesh(), turtle.object, fishes);
          return {
            parts: [b.mesh(), hiker, sea],
            update(t) {
              ride(sea, t);
              turtle.update(t);
              fishes.rotation.y = t * 1.2;
              const u = pingpong(t * 0.2);
              hiker.position.set(-0.5 + u * 0.27, bar + Math.abs(Math.sin(t * 7)) * 0.012, 0.2 + u * 0.21);
            },
          };
        },
      },
      {
        name: 'Raies manta',
        match: 'Raies manta',
        dx: -0.5,
        dz: -0.1,
        size: 0.26,
        height: 0.8,
        build() {
          // Fond de sable clair, patate de corail où les mantas viennent se faire nettoyer
          const r = shoal(new Builder(), 0.68, 0, 0, '#c4f1e4');
          r.ball('#c9a36b', 0.12, 0, 0.02, 0, 1.2, 0.6, 1.1);
          corals(r, 0.02, 0, 0.9, 0.05);
          for (let i = 0; i < 5; i++) r.octa('#4dabf7', 0.022, Math.cos(i * 1.3) * 0.16, 0.12 + (i % 2) * 0.03, Math.sin(i * 1.3) * 0.16, 1.6, 0.8, 0.5, i);
          const big = createModel('manta');
          big.object.scale.setScalar(1.25);
          const shade = big.object.children[0] && big.object.children[0].children[2];
          if (shade) shade.visible = false; // l'ombre portée du modèle se lit mal sur le sable clair
          // Une seconde manta, plus bas, en sens inverse
          const m = new Builder();
          m.octa('#2b3a55', 0.16, 0, 0, 0, 1.45, 0.3, 0.75).octa('#f1f5f9', 0.12, 0.01, -0.03, 0, 1.4, 0.2, 0.7);
          m.poly('#2b3a55', [[-0.14, 0], [0.12, 0], [-0.06, 0.32]], 0.03, 0, 0, 0.09, PI / 2, 0, 0);
          m.poly('#2b3a55', [[-0.14, 0], [0.12, 0], [-0.06, 0.32]], 0.03, 0, 0, -0.09, -PI / 2, 0, 0);
          m.cone('#2b3a55', 0.018, 0.32, 4, -0.36, 0, 0, 0, 0, PI / 2);
          m.box('#2b3a55', 0.09, 0.03, 0.04, 0.24, 0, 0.06, 0, 0.3, 0).box('#2b3a55', 0.09, 0.03, 0.04, 0.24, 0, -0.06, 0, -0.3, 0);
          const second = m.mesh();
          second.scale.setScalar(0.8);
          const watcher = swimmer('#ffd43b', 0.45);
          const sea = afloat(r.mesh(), big.object, second, watcher);
          return {
            parts: [sea],
            update(t) {
              ride(sea, t);
              big.update(t);
              const a = -t * 0.4;
              second.position.set(Math.cos(a) * 0.46, 0.07 + Math.sin(t * 1.4) * 0.02, Math.sin(a) * 0.46);
              second.rotation.y = -a + PI / 2;
              second.rotation.x = Math.sin(t * 2.2) * 0.2;
              // On reste en surface, à distance
              watcher.position.set(0.5, 0.05 + Math.sin(t * 2) * 0.01, 0.42);
              watcher.rotation.y = 2.5 + Math.sin(t * 0.5) * 0.3;
            },
          };
        },
      },
      {
        name: 'Paradisiers rouges',
        match: 'Oiseaux de paradis',
        dx: 0.32,
        dz: -0.36,
        size: 0.24,
        height: 1.38,
        build() {
          const b = new Builder();
          pad(b, '#5fae4a', 0.5, 0, 0, 0.06);
          // L'arbre de parade : grandes branches nues au-dessus de la forêt
          b.cyl('#7a4b25', 0.045, 0.07, 0.9, 6, -0.05, 0.5, -0.05);
          beam(b, '#7a4b25', -0.05, 0.84, -0.05, 0.42, 0.92, -0.05, 0.045, 0.045);
          beam(b, '#7a4b25', -0.05, 0.7, -0.05, -0.4, 0.8, -0.05, 0.04, 0.04);
          beam(b, '#7a4b25', -0.05, 0.94, -0.05, -0.12, 1.12, -0.05, 0.03, 0.03);
          bush(b, 0.34, 0.06, -0.22, 0.12).ball('#40c057', 0.1, -0.36, 0.12, -0.2, 1.1, 0.8, 1.1);
          for (const [x, z] of [[0.3, 0.26], [-0.1, 0.34], [0.12, 0.3]]) b.cone('#40c057', 0.06, 0.12, 5, x, 0.12, z);
          // Deux guetteurs aux jumelles, arrivés à la frontale avant l'aube
          person(b, '#495057', '#868e96', -0.3, 0.06, 0.28, 0.75);
          person(b, '#1c7ed6', null, -0.18, 0.06, 0.34, 0.75);
          b.box('#212529', 0.05, 0.02, 0.03, -0.3, 0.205, 0.32).box('#212529', 0.05, 0.02, 0.03, -0.18, 0.205, 0.38);
          const f = new Builder();
          f.ball('#2f9e44', 0.2, -0.22, 0, -0.06, 1.2, 0.7, 1, 1).ball('#40c057', 0.17, 0.16, -0.06, -0.1, 1.2, 0.7, 1, 1).ball('#37b24d', 0.14, 0.02, 0.06, 0.1, 1.2, 0.7, 1);
          const foliage = f.mesh(-0.05, 0.5, -0.05);
          const birds = [redParadise(), redParadise()];
          birds.forEach((m) => m.scale.setScalar(1.15));
          return raised({
            parts: [b.mesh(), foliage, ...birds],
            update(t) {
              foliage.rotation.z = Math.sin(t * 1.2) * 0.04;
              // Les mâles dansent : sauts, courbettes, volte-face
              birds[0].position.set(0.26, 0.94 + Math.abs(Math.sin(t * 5)) * 0.05, -0.05);
              birds[0].rotation.set(0, Math.sin(t * 1.3) * 0.9, Math.sin(t * 2.5) * 0.4 - 0.1);
              birds[1].position.set(-0.3, 0.82 + Math.abs(Math.sin(t * 5 + 1.6)) * 0.05, -0.05);
              birds[1].rotation.set(0, PI + Math.sin(t * 1.1 + 2) * 0.9, Math.sin(t * 2.5 + 1) * 0.4 - 0.1);
            },
          }, 0.08);
        },
      },
      {
        name: 'Baie de Kabui',
        match: 'Baie de Kabui',
        dx: -0.3,
        dz: -0.5,
        size: 0.26,
        height: 0.9,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          // Îlots calcaires en champignon
          mushroom(b, -0.4, -0.3, 0.17, w + 0.26, -2.5 * w);
          mushroom(b, 0.36, -0.34, 0.13, w + 0.2, -2.5 * w);
          mushroom(b, 0.0, -0.44, 0.09, w + 0.14, -2.5 * w);
          // Le passage : deux rives de mangrove, un chenal étroit comme une rivière
          for (const s of [-1, 1]) {
            b.ball('#2f9e44', 0.22, s * 0.34 + 0.02, 0, 0.26, 1.25, 1.45, 1.1, 1);
            b.ball('#51cf66', 0.13, s * 0.4 + 0.02, 0.3, 0.2, 1.2, 0.8, 1.1);
            for (let i = 0; i < 4; i++) b.cyl(DARK, 0.01, 0.01, 2.2 * w, 4, s * 0.1 + 0.02 + s * (i % 2) * 0.03, 0, 0.08 + i * 0.12, 0, 0, s * 0.3);
          }
          // Coraux mous orange sous la surface
          const r = new Builder();
          r.box(LAGOON, 0.2, 0.012, 0.74, 0.02, 0.006, 0.26);
          for (let i = 0; i < 7; i++) r.cone(i % 2 ? '#ff922b' : '#ffa94d', 0.035, 0.07, 5, 0.02 + (i % 2 ? -0.07 : 0.07), 0.04, -0.04 + i * 0.1);
          const boat = skiff('#ffd43b', '#e03131', 0.9);
          person(boat, '#1c7ed6', '#f2d16b', -0.1, 0.04, 0, 0.55);
          person(boat, '#e64980', null, 0.05, 0.04, 0, 0.55);
          const canoe = boat.mesh();
          const sea = afloat(r.mesh(), canoe);
          return {
            parts: [b.mesh(), sea],
            update(t) {
              ride(sea, t);
              const u = pingpong(t * 0.15);
              canoe.position.set(0.02, 0.02, 0.62 - u * 0.66);
              canoe.rotation.y = (t * 0.15) % 2 < 1 ? PI / 2 : -PI / 2;
              canoe.rotation.z = Math.sin(t * 2.2) * 0.06;
            },
          };
        },
      },
    ],
  };
}

// ---------- Waigeo, secteur de Piaynemo ----------
// Le repère est en pleine mer, aux îles Fam ; Waigeo et Gam sont les terres du nord-est.

function piaynemo() {
  const S = 0.4;
  return {
    scale: S,
    items: [
      {
        name: 'Belvédère de Piaynemo',
        match: 'Belvédère de Piaynemo',
        dx: 0.0,
        dz: -0.08,
        size: 0.3,
        height: 1.2,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          // Pains de sucre calcaires : pied clair rongé par la mer, dôme de forêt
          const sugarloaf = (x, z, r, h) => {
            b.cyl('#c2b79d', r * 0.92, r * 0.78, 3.7 * w, 7, x, -0.65 * w, z);
            b.ball('#2f9e44', r, x, 1.2 * w, z, 1, h / r, 1, 1);
            b.ball('#51cf66', r * 0.55, x - r * 0.15, 1.2 * w + h * 0.6, z + r * 0.1);
          };
          sugarloaf(0.26, -0.06, 0.15, 0.3);
          sugarloaf(0.5, -0.22, 0.12, 0.24);
          sugarloaf(0.02, 0.44, 0.1, 0.2);
          sugarloaf(0.42, 0.42, 0.09, 0.16);
          sugarloaf(-0.38, 0.34, 0.11, 0.2);
          sugarloaf(0.62, 0.14, 0.07, 0.13);
          // La colline du belvédère : escalier en bois de 300 marches, deux plateformes
          sugarloaf(-0.24, -0.3, 0.3, 0.5);
          const y0 = 1.2 * w;
          const top = y0 + 0.5;
          const path = [[-0.1, y0 + 0.02, 0.05], [-0.34, y0 + 0.34, -0.1], [-0.2, top + 0.01, -0.24]];
          beam(b, PLANK, ...path[0], ...path[1], 0.06, 0.03);
          beam(b, PLANK, ...path[1], ...path[2], 0.06, 0.03);
          b.box(PLANK, 0.16, 0.03, 0.12, -0.36, y0 + 0.35, -0.1);
          b.box(PLANK, 0.24, 0.03, 0.18, -0.2, top + 0.02, -0.26);
          for (const [x, z] of [[-0.31, -0.18], [-0.09, -0.18], [-0.31, -0.34], [-0.09, -0.34]]) b.box(DARK, 0.016, 0.1, 0.016, x, top + 0.08, z);
          b.box(DARK, 0.24, 0.014, 0.014, -0.2, top + 0.13, -0.18);
          person(b, '#e64980', null, -0.25, top + 0.035, -0.26, 0.6);
          // Le ponton du bas, où l'on vend des noix de coco
          stilts(b, w, [[-0.16, 0.08], [-0.02, 0.08], [-0.16, 0.2], [-0.02, 0.2]], y0, 0.02);
          b.box(PLANK, 0.2, 0.025, 0.18, -0.09, y0 + 0.01, 0.13);
          b.ball('#2f9e44', 0.03, -0.14, y0 + 0.05, 0.16).ball('#2f9e44', 0.03, -0.09, y0 + 0.05, 0.18).ball('#40c057', 0.03, -0.115, y0 + 0.09, 0.17);
          const climber = walker('#ffd43b', null, 0.6);
          // Le lagon turquoise et le bateau de la journée
          const boat = speedboat('#e03131', 0.75).mesh();
          const sea = afloat(shoal(new Builder(), 0.74, 0.12, 0.1).mesh(), boat);
          return {
            parts: [b.mesh(), climber, sea],
            update(t) {
              ride(sea, t);
              // Vingt minutes de montée, avec des paliers
              const u = pingpong(t * 0.12) * 2;
              const i = u < 1 ? 0 : 1;
              const k = u < 1 ? u : u - 1;
              climber.position.set(path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i][1] + (path[i + 1][1] - path[i][1]) * k + 0.02 + Math.abs(Math.sin(t * 7)) * 0.01, path[i][2] + (path[i + 1][2] - path[i][2]) * k);
              const v = pingpong(t * 0.14);
              boat.position.set(-0.14 + v * 0.62, 0.02, 0.2 + Math.sin(v * PI) * 0.04);
              boat.rotation.y = (t * 0.14) % 2 < 1 ? 0 : PI;
              boat.rotation.z = Math.sin(t * 4) * 0.04;
            },
          };
        },
      },
      {
        name: 'Telaga Bintang',
        match: 'Telaga Bintang',
        dx: -0.42,
        dz: 0.14,
        size: 0.26,
        height: 0.95,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const top = w + 0.12;
          b.cyl('#c2b79d', 0.52, 0.62, top + 2.5 * w - 0.04, 9, 0, (top - 0.04 - 2.5 * w) / 2, 0);
          b.cyl('#3fa34d', 0.5, 0.53, 0.05, 9, 0, top - 0.02, 0);
          // Le lagon en étoile à cinq branches, une pointe ouverte vers nous
          const star = [];
          for (let i = 0; i < 10; i++) {
            const a = -PI / 2 + (i / 10) * TAU;
            star.push([Math.cos(a) * (i % 2 ? 0.17 : 0.47), Math.sin(a) * (i % 2 ? 0.17 : 0.47)]);
          }
          b.poly('#5fe3d6', star, 0.02, 0, top + 0.012, 0, -PI / 2, 0, 0);
          // Calcaire coupant et forêt entre les branches ; le piton du fond se grimpe en dix minutes
          for (let i = 0; i < 5; i++) {
            const a = -PI / 2 + ((i + 0.5) / 5) * TAU;
            const x = Math.cos(a) * 0.36;
            const z = -Math.sin(a) * 0.36;
            if (i === 1) continue;
            b.ball('#2b8a3e', 0.13, x, top + 0.04, z, 1, 0.85, 1, 1).ball('#51cf66', 0.07, x - 0.03, top + 0.13, z);
          }
          b.cone('#b9ad94', 0.15, 0.4, 6, 0, top + 0.2, -0.36).ball('#2b8a3e', 0.09, 0.1, top + 0.06, -0.4).ball('#2b8a3e', 0.08, -0.11, top + 0.06, -0.38);
          const climber = walker('#e8590c', null, 0.6);
          const s = new Builder();
          for (const [x, z] of [[0, 0], [0.1, 0.2], [-0.2, -0.06], [0.22, -0.08]]) s.octa('#ffffff', 0.025, x, 0, z, 1, 1.6, 1);
          const glints = s.mesh(0, top + 0.05, 0.02);
          const boat = speedboat('#1c7ed6', 0.8).mesh(0.16, 0.02, 0.78);
          const sea = afloat(boat);
          return {
            parts: [b.mesh(), climber, glints, sea],
            update(t) {
              ride(sea, t);
              boat.rotation.z = Math.sin(t * 1.9) * 0.08;
              const u = pingpong(t * 0.2);
              climber.position.set(0, top + 0.02 + u * 0.36, -0.2 - u * 0.15);
              glints.scale.setScalar(0.6 + Math.abs(Math.sin(t * 2.2)) * 0.7);
              glints.rotation.y = t * 0.8;
            },
          };
        },
      },
      {
        name: 'Pasir Timbul',
        match: 'La journée en bateau',
        dx: 0.06,
        dz: 0.46,
        size: 0.24,
        height: 0.7,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          // Le banc de sable qui sort de l'eau à marée basse
          const y = 0.6 * w;
          for (const [x, z, r] of [[-0.3, 0.03, 0.08], [-0.12, -0.05, 0.13], [0.1, -0.05, 0.13], [0.3, 0.04, 0.08]]) b.cyl('#fff0c2', r, r + 0.36, 3 * w, 9, x, y - 1.5 * w, z);
          b.cone('#ff922b', 0.05, 0.02, 5, 0.22, y + 0.01, 0.0);
          person(b, '#ffd43b', null, 0.12, y, 0.02, 0.8);
          b.box('#212529', 0.04, 0.03, 0.03, 0.08, y + 0.15, 0.04);
          const jumpers = [walker('#e64980', null, 0.8), walker('#1c7ed6', null, 0.8), walker('#2f9e44', null, 0.65)];
          const boat = speedboat('#e03131', 0.9).mesh();
          const sea = afloat(shoal(new Builder(), 0.72, 0, 0, '#aef0e6').mesh(), boat);
          return {
            parts: [b.mesh(), ...jumpers, sea],
            update(t) {
              ride(sea, t);
              // La photo de groupe : tout le monde saute
              jumpers.forEach((j, i) => j.position.set(-0.2 + i * 0.1, y + Math.max(0, Math.sin(t * 3.2 + i * 0.5)) * 0.14, -0.04 + (i % 2) * 0.03));
              circle(boat, t * 0.4, 0, 0.02, 0.04, 0.58, 0.36);
              boat.rotation.z = Math.sin(t * 5) * 0.04;
            },
          };
        },
      },
      {
        name: 'Paradisier de Wilson',
        match: 'Oiseaux de paradis près',
        dx: 0.84,
        dz: -0.3,
        size: 0.22,
        height: 1.01,
        build() {
          const b = new Builder();
          pad(b, '#5fae4a', 0.52, 0, 0, 0.06);
          b.cyl('#8a6a4a', 0.27, 0.27, 0.012, 9, 0.06, 0.066, 0.1); // sa piste de danse, nettoyée feuille à feuille
          b.cyl('#7a4b25', 0.014, 0.02, 0.52, 5, 0.06, 0.32, 0.1); // la tige où il parade
          b.cyl('#7a4b25', 0.012, 0.016, 0.3, 5, 0.26, 0.2, 0.2, 0, 0, -0.3);
          for (const [x, z] of [[-0.2, 0.3], [0.36, 0.0], [0.3, 0.34], [-0.1, 0.38]]) b.cone('#40c057', 0.06, 0.13, 5, x, 0.12, z);
          for (const [x, z, h] of [[-0.36, -0.1, 0.6], [0.3, -0.3, 0.7]]) {
            b.cyl('#7a4b25', 0.03, 0.045, h, 5, x, 0.05 + h / 2, z);
            b.ball('#2f9e44', 0.2, x, 0.1 + h, z, 1.2, 0.75, 1.1, 1);
          }
          // L'affût en palmes, un guetteur dedans
          b.cone('#6b8e3a', 0.2, 0.3, 5, -0.06, 0.2, -0.3).box('#2a2222', 0.1, 0.1, 0.02, -0.06, 0.13, -0.14);
          b.ball(SKIN, 0.035, -0.06, 0.13, -0.13);
          // La femelle, brune, regarde du haut d'une branche
          b.ball('#8a6a4a', 0.045, 0.3, 0.36, 0.2, 1.3, 1, 1).ball('#22b8cf', 0.025, 0.35, 0.39, 0.2);
          // Le mâle : calotte turquoise, nuque jaune, dos rouge, plastron vert, deux plumes violettes en spirale
          const m = new Builder();
          m.ball('#212529', 0.07, 0, 0, 0, 1.3, 1, 1, 1);
          m.ball('#e03131', 0.062, -0.03, 0.035, 0, 1.2, 0.8, 1);
          m.ball('#ffd43b', 0.04, 0.045, 0.06, 0, 1, 0.6, 1.1);
          m.ball('#22b8cf', 0.045, 0.1, 0.07, 0);
          m.ball('#2b8a3e', 0.048, 0.07, -0.02, 0, 1, 0.8, 1.25);
          m.cone('#f8f9fa', 0.012, 0.045, 4, 0.155, 0.06, 0, 0, 0, -PI / 2);
          for (const s of [-1, 1]) m.add(new TorusGeometry(0.04, 0.01, 4, 8, PI * 1.6), '#7048e8', -0.12, -0.01, s * 0.04, 0, s * 0.6, 0);
          m.box('#4263eb', 0.012, 0.06, 0.012, 0.0, -0.08, 0.025).box('#4263eb', 0.012, 0.06, 0.012, 0.0, -0.08, -0.025);
          const bird = m.mesh();
          bird.scale.setScalar(1.5);
          const leaf = new Builder().box('#74b816', 0.08, 0.01, 0.05, 0, 0, 0).mesh();
          return raised({
            parts: [b.mesh(), bird, leaf],
            update(t) {
              // Il monte et descend le long de la tige en se montrant sous tous les angles
              bird.position.set(0.06, 0.26 + Math.abs(Math.sin(t * 1.6)) * 0.26, 0.14);
              bird.rotation.set(0, Math.sin(t * 2.6) * 1.1 - PI / 2, 0.5);
              // et jette hors de la piste la moindre feuille tombée
              const u = (t * 0.5) % 1;
              leaf.position.set(0.02 + u * 0.4, 0.08 + Math.sin(u * PI) * 0.2, 0.2 + u * 0.2);
              leaf.rotation.set(u * 9, u * 5, 0);
            },
          }, 0.06);
        },
      },
      {
        name: 'Friwen',
        match: 'Friwen',
        dx: 0.62,
        dz: 0.04,
        size: 0.26,
        height: 1.0,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const g = isle(b, w, 0.28, -0.24, -0.16);
          b.ball('#51cf66', 0.16, -0.34, g, -0.24, 1.2, 0.5, 1, 1);
          hut(b, -0.34, -0.1, 0.52, g - 0.01, '#fdfdf7', '#1c7ed6');
          hut(b, -0.14, -0.26, 0.48, g - 0.01, '#fdfdf7', '#e03131');
          const [hx, hy, hz] = trunk(b, -0.44, -0.24, 0.5, -0.06, g);
          const leaves = fronds(new Builder(), 0, 0, 0, 0.5).mesh(hx, hy, hz);
          // Le ponton du village
          const d = w + 0.07;
          stilts(b, w, [[-0.2, 0.12], [-0.12, 0.12], [-0.2, 0.34], [-0.12, 0.34]], d, 0.025);
          b.box(PLANK, 0.1, 0.025, 0.4, -0.16, d, 0.18);
          person(b, '#ffd43b', null, -0.16, d + 0.012, 0.3, 0.6);
          // En face, l'îlot de Friwenbonda : ses falaises plongent dans la mer
          const top = w + 0.42;
          b.cyl('#b9ad94', 0.2, 0.25, top + 2.5 * w, 7, 0.42, (top - 2.5 * w) / 2, -0.12);
          b.ball('#2f9e44', 0.22, 0.42, top, -0.12, 1.05, 0.6, 1.05, 1).ball('#51cf66', 0.12, 0.38, top + 0.1, -0.1);
          // Friwen Wall : la paroi de coraux mous qu'on longe au masque
          const r = shoal(new Builder(), 0.74, 0.08, 0.06);
          for (let i = 0; i < 9; i++) {
            const a = 0.1 + (i / 8) * 2.9;
            r.ball(['#ff922b', '#ff6b9d', '#b197fc', '#ffa94d'][i % 4], 0.05, 0.42 + Math.cos(a) * 0.31, 0.03, -0.12 + Math.sin(a) * 0.31, 1, 0.9, 1);
          }
          const fishes = school(['#ffd43b', '#e7f5ff', '#74c0fc'], 8, 0.15, 0.7);
          fishes.position.set(-0.16, 0.06, 0.3);
          const diver = swimmer('#ffd43b', 0.46);
          const sea = afloat(r.mesh(), fishes, diver);
          return {
            parts: [b.mesh(), leaves, sea],
            update(t) {
              ride(sea, t);
              leaves.rotation.z = Math.sin(t * 1.4) * 0.14;
              fishes.rotation.y = t * 1.2;
              // Aller-retour le long de la paroi
              const a = 0.3 + pingpong(t * 0.12) * 2.5;
              diver.position.set(0.42 + Math.cos(a) * 0.45, 0.05, -0.12 + Math.sin(a) * 0.45);
              diver.rotation.y = -a - PI / 2 + ((t * 0.12) % 2 < 1 ? 0 : PI);
            },
          };
        },
      },
      {
        name: 'Homestay',
        match: 'Dormir aux îles Fam',
        dx: -0.42,
        dz: -0.42,
        size: 0.24,
        height: 1.0,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const g = isle(b, w, 0.42);
          // Bungalows à terre, sur la plage
          hut(b, -0.14, -0.16, 0.9, g - 0.01);
          hut(b, 0.24, -0.22, 0.6, g - 0.01);
          const [hx, hy, hz] = trunk(b, 0.34, 0.12, 0.52, -0.06, g);
          const leaves = fronds(new Builder(), 0, 0, 0, 0.52).mesh(hx, hy, hz);
          b.box(DARK, 0.02, 0.26, 0.02, 0.06, g + 0.13, 0.2);
          const bed = hammock('#e8590c');
          bed.position.set(0.19, g + 0.22, 0.17);
          // Le courant ne vient que le soir : l'ampoule s'allume et s'éteint
          const bulb = new Builder().ball('#ffe066', 0.035, 0, 0, 0).mesh(-0.14, g + 0.35, -0.01);
          // Le ponton où l'on nage, la barque des sorties
          const d = w + 0.07;
          stilts(b, w, [[-0.28, 0.4], [-0.2, 0.4], [-0.28, 0.62], [-0.2, 0.62]], d, 0.025);
          b.box(PLANK, 0.1, 0.025, 0.42, -0.24, d, 0.44);
          const boat = skiff('#8d5a2b', '#ffd43b', 0.85);
          boat.box('#8d5a2b', 0.3, 0.012, 0.012, 0, 0.03, 0.14).box('#8d5a2b', 0.012, 0.012, 0.16, -0.08, 0.05, 0.07).box('#8d5a2b', 0.012, 0.012, 0.16, 0.08, 0.05, 0.07);
          const canoe = boat.mesh(0.14, 0.02, 0.62);
          const sea = afloat(shoal(new Builder(), 0.74).mesh(), canoe);
          return {
            parts: [b.mesh(), leaves, bed, bulb, sea],
            update(t) {
              ride(sea, t);
              leaves.rotation.z = Math.sin(t * 1.4) * 0.14;
              bed.rotation.x = Math.sin(t * 1.7) * 0.35;
              bulb.scale.setScalar(Math.sin(t * 0.8) > 0 ? 1.3 : 0.5);
              canoe.rotation.z = Math.sin(t * 1.9) * 0.1;
            },
          };
        },
      },
    ],
  };
}

// ---------- Kupang ----------
// La ville regarde vers l'ouest : la baie est à gauche, Timor à droite.

function kupang() {
  const S = 0.35;
  return {
    scale: S,
    items: [
      {
        name: 'Marché de nuit',
        match: 'Marché de nuit',
        dx: 0.4,
        dz: 0.18,
        size: 0.26,
        height: 0.93,
        build() {
          const b = new Builder();
          pad(b, '#495057', 0.64, 0, 0, 0.05); // la rue, à la tombée du jour
          // L'étal : poissons, calamars et crevettes sur la glace
          b.box('#1c7ed6', 0.52, 0.14, 0.22, -0.22, 0.12, -0.22);
          b.box('#e7f5ff', 0.52, 0.03, 0.22, -0.22, 0.205, -0.22);
          b.octa('#e03131', 0.055, -0.4, 0.24, -0.22, 1.7, 0.5, 0.8, 0.3).octa('#ced4da', 0.055, -0.27, 0.24, -0.2, 1.7, 0.5, 0.8, -0.2).octa('#ff922b', 0.05, -0.14, 0.24, -0.24, 1.7, 0.5, 0.8, 0.4);
          b.cone('#ffd8e4', 0.03, 0.1, 5, -0.03, 0.235, -0.2, 0, 0, PI / 2).ball('#ff8787', 0.025, -0.36, 0.235, -0.28).ball('#ff8787', 0.025, -0.3, 0.235, -0.29);
          person(b, '#e64980', null, -0.22, 0.05, -0.38, 0.9);
          // Le barbecue : braises rouges, poissons sur la grille
          b.box('#343a40', 0.32, 0.12, 0.16, 0.24, 0.11, -0.22);
          b.box('#ff6b35', 0.28, 0.015, 0.12, 0.24, 0.175, -0.22);
          b.octa('#6b4423', 0.055, 0.17, 0.2, -0.22, 1.7, 0.5, 0.8).octa('#8a5a2b', 0.055, 0.31, 0.2, -0.22, 1.7, 0.5, 0.8);
          person(b, '#2f9e44', null, 0.24, 0.05, -0.38, 0.9);
          // Tables et tabourets en plastique
          for (const [x, z, c] of [[-0.24, 0.2, '#e03131'], [0.2, 0.28, '#1c7ed6']]) {
            b.box(c, 0.22, 0.02, 0.2, x, 0.16, z);
            for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(c, 0.02, 0.1, 0.02, x + px * 0.09, 0.1, z + pz * 0.08);
            b.cyl('#f8f9fa', 0.04, 0.03, 0.02, 7, x - 0.04, 0.18, z).cyl('#f8f9fa', 0.04, 0.03, 0.02, 7, x + 0.05, 0.18, z + 0.03);
          }
          person(b, '#ffd43b', null, -0.42, 0.05, 0.22, 0.75);
          person(b, '#7048e8', null, -0.06, 0.05, 0.24, 0.75);
          person(b, '#e8590c', null, 0.38, 0.05, 0.3, 0.75);
          // Guirlande d'ampoules au-dessus de la rue
          for (const x of [-0.56, 0.56]) b.cyl('#868e96', 0.01, 0.01, 0.56, 4, x, 0.33, 0.02);
          const g = new Builder();
          for (let i = 0; i <= 8; i++) {
            const k = i / 8 - 0.5;
            g.ball(i % 2 ? '#ffe066' : '#ffa94d', 0.03, k * 1.1, k * k * 0.5 - 0.12, 0);
            if (i < 8) g.box('#343a40', 0.14, 0.006, 0.006, k * 1.1 + 0.07, k * k * 0.5 - 0.1, 0);
          }
          const garland = g.mesh(0, 0.6, 0.02);
          const fan = new Builder().box('#e9d8a6', 0.1, 0.1, 0.012, 0.07, 0, 0).mesh(0.26, 0.24, -0.34);
          const smoke = [puff(0.06), puff(0.06)];
          return raised({
            parts: [b.mesh(), garland, fan, ...smoke],
            update(t) {
              garland.rotation.x = Math.sin(t * 1.3) * 0.2;
              garland.scale.y = 1 + Math.sin(t * 5) * 0.06;
              fan.rotation.y = Math.sin(t * 8) * 0.7;
              smoke.forEach((s, i) => rise(s, (t * 0.35 + i / 2) % 1, 0.24, 0.22, -0.22, 0.5, 0.1, 1.1));
            },
          }, 0.08);
        },
      },
      {
        name: 'Coucher de soleil',
        match: 'Coucher de soleil',
        dx: -0.2,
        dz: -0.1,
        size: 0.26,
        height: 0.85,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          // La petite plage de Tedis, au bord du vieux quartier
          const g = isle(b, w, 0.32, 0.36, 0.04);
          person(b, '#e64980', null, 0.2, g, 0.1, 0.7);
          person(b, '#1c7ed6', null, 0.3, g, 0.16, 0.7);
          person(b, '#ffd43b', null, 0.25, g, 0.22, 0.5);
          // Le vendeur de maïs grillé et sa charrette
          b.box('#2f9e44', 0.2, 0.1, 0.12, 0.46, g + 0.11, -0.1);
          for (const x of [0.39, 0.53]) b.cyl('#343a40', 0.045, 0.045, 0.02, 8, x, g + 0.045, -0.03, PI / 2, 0, 0);
          b.box('#495057', 0.2, 0.015, 0.12, 0.46, g + 0.168, -0.1);
          for (let i = 0; i < 3; i++) b.cyl('#ffd43b', 0.016, 0.016, 0.09, 5, 0.4 + i * 0.06, g + 0.19, -0.1, PI / 2, 0, 0);
          person(b, '#e8590c', '#f2d16b', 0.48, g, -0.22, 0.85);
          palm(b, 0.56, 0.14, 0.5, 0.06, g);
          // Le soleil descend dans la baie
          const sun = new Builder().cyl('#ff922b', 0.24, 0.24, 0.02, 14, 0, 0, 0, PI / 2, 0, 0).cyl('#ffd43b', 0.17, 0.17, 0.026, 14, 0, 0, 0, PI / 2, 0, 0).mesh();
          const r = new Builder();
          for (let i = 0; i < 6; i++) r.box(i % 2 ? '#ffd43b' : '#ffa94d', 0.17 - i * 0.015, 0.012, 0.035, -0.26 + i * 0.045, 0.008, -0.1 + i * 0.07);
          const glow = r.mesh();
          const boat = skiff('#343a40', '#212529', 0.8);
          person(boat, '#212529', '#343a40', -0.04, 0.04, 0, 0.6);
          const canoe = boat.mesh(-0.14, 0.02, 0.44);
          const sea = afloat(glow, canoe);
          const smoke = puff(0.05);
          return {
            parts: [b.mesh(), sun, smoke, sea],
            update(t) {
              ride(sea, t);
              const k = pingpong(t * 0.12);
              sun.position.set(-0.3, 0.34 - k * 0.3, -0.24);
              glow.scale.x = 0.8 + Math.sin(t * 3) * 0.2;
              canoe.rotation.z = Math.sin(t * 1.8) * 0.08;
              rise(smoke, (t * 0.4) % 1, 0.46, g + 0.2, -0.1, 0.4, 0.08, 1);
            },
          };
        },
      },
      {
        name: 'Plage de Lasiana',
        match: 'Plage de Lasiana',
        dx: -0.1,
        dz: -0.42,
        size: 0.26,
        height: 0.85,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          // Longue plage de sable bordée de palmiers lontar
          const g = isle(b, w, 0.34, 0.14, -0.26);
          isle(b, w, 0.34, 0.14, 0.26);
          const trees = [[0.34, -0.36, 0.6], [0.4, 0.0, 0.5], [0.32, 0.36, 0.66]];
          for (const [x, z, h] of trees) b.cyl('#6b5a45', 0.028, 0.038, h, 6, x, g + h / 2, z);
          const c = new Builder();
          for (const [x, z, h] of trees) lontarCrown(c, x, g + h, z, 1);
          const crowns = c.mesh();
          // Paillotes où l'on boit une noix de coco
          for (const [x, z] of [[0.08, -0.2], [0.12, 0.24]]) {
            b.cyl(DARK, 0.014, 0.014, 0.26, 5, x, g + 0.13, z);
            b.cone(THATCH, 0.17, 0.1, 8, x, g + 0.31, z);
            b.box(PLANK, 0.16, 0.015, 0.05, x, g + 0.07, z + 0.1);
            b.ball('#2f9e44', 0.03, x + 0.04, g + 0.105, z + 0.1);
            b.cyl('#ffffff', 0.004, 0.004, 0.06, 4, x + 0.045, g + 0.14, z + 0.1, 0, 0, -0.3);
          }
          person(b, '#e64980', null, 0.0, g, -0.08, 0.7);
          person(b, '#ffd43b', null, 0.04, g, 0.36, 0.7);
          const kid = walker('#1c7ed6', null, 0.6);
          // Les vagues viennent mourir sur le sable
          const r = new Builder();
          r.box(LAGOON, 0.3, 0.012, 1.1, -0.42, 0.006, 0);
          const foam = new Builder().box('#ffffff', 0.04, 0.014, 1.0, 0, 0.012, 0).box('#ffffff', 0.03, 0.014, 0.7, -0.1, 0.012, 0.08).mesh();
          const sea = afloat(r.mesh(), foam);
          return {
            parts: [b.mesh(), crowns, kid, sea],
            update(t) {
              ride(sea, t);
              crowns.rotation.z = Math.sin(t * 1.2) * 0.025;
              kid.position.set(-0.08 + Math.sin(t * 0.9) * 0.04, g + Math.abs(Math.sin(t * 7)) * 0.015, pingpong(t * 0.2) * 0.9 - 0.45);
              foam.position.x = -0.36 + Math.sin(t * 1.5) * 0.07;
            },
          };
        },
      },
      {
        name: 'Grotte de Kristal',
        match: 'Grotte de Kristal',
        dx: -0.05,
        dz: 0.42,
        size: 0.26,
        height: 1.05,
        build() {
          const b = new Builder();
          pad(b, '#b9ad94', 0.6, 0, 0.04, 0.05, 0.2);
          // La voûte de calcaire, ouverte vers nous
          b.ball('#9a8f7a', 0.42, 0, 0.05, -0.2, 1.25, 1.05, 0.8, 1);
          b.ball('#8a7f6b', 0.22, -0.4, 0.05, 0.04, 1, 1.3, 1.1, 1);
          b.ball('#8a7f6b', 0.22, 0.4, 0.05, 0.04, 1, 1.3, 1.1, 1);
          b.poly('#25262b', [[-0.3, 0], [0.3, 0], [0.26, 0.2], [0.12, 0.31], [-0.12, 0.31], [-0.26, 0.2]], 0.03, 0, 0.05, 0.13);
          for (const [x, h] of [[-0.14, 0.1], [0.0, 0.14], [0.15, 0.08]]) b.cone('#c2b79d', 0.028, h, 5, x, 0.36 - h / 2, 0.16, PI, 0, 0);
          bush(b, -0.2, 0.44, -0.2, 0.09).ball('#40c057', 0.08, 0.22, 0.46, -0.24).ball('#2f9e44', 0.07, -0.42, 0.34, 0.02);
          // Le bassin d'eau claire et bleutée
          b.cyl('#4dd4f0', 0.3, 0.3, 0.02, 10, 0, 0.06, 0.3);
          for (const [x, z, s] of [[-0.3, 0.44, 0.07], [0.32, 0.42, 0.08], [0.12, 0.6, 0.06], [-0.1, 0.6, 0.05]]) b.ball('#8a7f6b', s, x, 0.07, z, 1.2, 0.8, 1);
          person(b, '#ffd43b', null, 0.36, 0.12, 0.44, 0.7); // on descend sur les rochers glissants
          // Le rayon de soleil de fin de matinée
          const ray = new Builder();
          beam(ray, '#fff3bf', 0.26, 0.62, 0.1, 0.02, 0.07, 0.3, 0.07, 0.07);
          const sunbeam = ray.mesh();
          const bather = new Builder().ball(SKIN, 0.05, 0, 0.06, 0).cyl('#e03131', 0.045, 0.05, 0.05, 6, 0, 0, 0).mesh();
          const ripple = new Builder().cyl('#d0f7fa', 0.12, 0.12, 0.006, 10, 0, 0, 0).mesh();
          return raised({
            parts: [b.mesh(), sunbeam, ripple, bather],
            update(t) {
              const s = 0.7 + Math.sin(t * 1.4) * 0.3;
              sunbeam.scale.set(1, 1, s);
              bather.position.set(Math.sin(t * 0.5) * 0.12, 0.075 + Math.sin(t * 2.4) * 0.012, 0.32);
              const k = (t * 0.6) % 1;
              ripple.position.set(bather.position.x, 0.078, 0.32);
              ripple.scale.set(0.5 + k * 1.3, 1, 0.5 + k * 1.3);
              ripple.visible = k < 0.85;
            },
          }, 0.1);
        },
      },
      {
        name: 'Sasando',
        match: "Se'i et sasando",
        dx: 0.8,
        dz: 0.0,
        size: 0.24,
        height: 1.07,
        build() {
          const b = new Builder();
          pad(b, '#d9c9a3', 0.56, 0, 0, 0.05);
          // Le joueur de sasando, coiffé du chapeau de Rote à corne
          b.box('#c2255c', 0.44, 0.012, 0.32, -0.16, 0.056, 0.14).box('#ffd43b', 0.44, 0.014, 0.03, -0.16, 0.057, 0.06).box('#ffd43b', 0.44, 0.014, 0.03, -0.16, 0.057, 0.22);
          person(b, '#1d2b53', '#e9d8a6', -0.3, 0.06, 0.12, 1.1);
          b.cone('#e9d8a6', 0.022, 0.12, 5, -0.3, 0.44, 0.12);
          // La harpe : un tube de bambou dans sa coque de feuille de lontar
          const sx = -0.06;
          const sz = 0.16;
          b.cyl('#c49a4a', 0.026, 0.026, 0.46, 6, sx, 0.29, sz);
          for (let i = 0; i < 9; i++) {
            const a = PI + (i / 8) * PI;
            b.box(i % 2 ? '#e9d8a6' : '#d9c48a', 0.014, 0.36, 0.07, sx + Math.cos(a) * 0.16, 0.29, sz + Math.sin(a) * 0.16, 0, -a, 0);
          }
          b.ball('#d9c48a', 0.045, sx, 0.5, sz - 0.02).ball('#d9c48a', 0.045, sx, 0.09, sz - 0.02);
          for (let i = -2; i <= 2; i++) b.box('#f8f9fa', 0.005, 0.34, 0.005, sx + i * 0.022, 0.29, sz + 0.03);
          // Le fumoir à se'i : lanières de viande au-dessus des braises
          for (const x of [0.2, 0.46]) b.box(DARK, 0.02, 0.3, 0.02, x, 0.2, -0.18);
          b.box(DARK, 0.3, 0.02, 0.02, 0.33, 0.34, -0.18);
          for (let i = 0; i < 5; i++) b.box(i % 2 ? '#a13d2d' : '#7b2d26', 0.035, 0.14, 0.015, 0.23 + i * 0.05, 0.26, -0.18);
          b.box('#343a40', 0.26, 0.04, 0.12, 0.33, 0.07, -0.18).box('#ff6b35', 0.2, 0.012, 0.08, 0.33, 0.095, -0.18);
          person(b, '#2f9e44', null, 0.38, 0.05, 0.22, 0.8);
          const note = () => new Builder().ball('#1d2b53', 0.03, 0, 0, 0, 1.2, 0.9, 1).box('#1d2b53', 0.01, 0.09, 0.01, 0.028, 0.045, 0).box('#1d2b53', 0.04, 0.02, 0.01, 0.045, 0.085, 0).mesh();
          const notes = [note(), note()];
          const smoke = puff(0.06);
          return raised({
            parts: [b.mesh(), ...notes, smoke],
            update(t) {
              notes.forEach((n, i) => {
                const k = (t * 0.4 + i * 0.5) % 1;
                n.position.set(sx + 0.06 + k * 0.14 + Math.sin(k * 9 + i) * 0.03, 0.5 + k * 0.4, sz);
                n.scale.setScalar(Math.sin(k * PI) * 1.2);
              });
              rise(smoke, (t * 0.3) % 1, 0.33, 0.36, -0.18, 0.5, 0.1, 1.2);
            },
          }, 0.17);
        },
      },
    ],
  };
}

// ---------- Alor et Kepa ----------
// Le repère est dans le détroit : Pantar à l'ouest, Alor à l'est, Kepa au milieu de l'eau.

function alor() {
  const S = 0.35;
  return {
    scale: S,
    items: [
      {
        name: 'Îlot de Kepa',
        match: "Séjour sur l'îlot de Kepa",
        dx: -0.05,
        dz: -0.05,
        size: 0.28,
        height: 1.0,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          const g = isle(b, w, 0.46);
          b.ball(GRASS, 0.3, -0.04, g, -0.12, 1.2, 0.25, 1, 1);
          // Quelques bungalows de style local, toit de chaume en pyramide
          lopo(b, -0.24, -0.18, 0.7, g);
          lopo(b, 0.06, -0.28, 0.7, g);
          lopo(b, 0.26, -0.06, 0.62, g);
          // Électricité solaire, repas pris tous ensemble
          b.box('#868e96', 0.012, 0.09, 0.012, -0.02, g + 0.045, 0.0).box('#1c4e9e', 0.16, 0.012, 0.11, -0.02, g + 0.1, 0.02, 0.5, 0, 0);
          b.box(PLANK, 0.22, 0.015, 0.08, -0.2, g + 0.07, 0.2).box(DARK, 0.02, 0.06, 0.06, -0.28, g + 0.035, 0.2).box(DARK, 0.02, 0.06, 0.06, -0.12, g + 0.035, 0.2);
          person(b, '#e64980', null, -0.26, g, 0.27, 0.55);
          person(b, '#1c7ed6', null, -0.16, g, 0.27, 0.55);
          person(b, '#ffd43b', null, -0.2, g, 0.13, 0.55);
          const [hx, hy, hz] = trunk(b, 0.3, 0.2, 0.5, 0.08, g);
          const leaves = fronds(new Builder(), 0, 0, 0, 0.5).mesh(hx, hy, hz);
          const smoke = puff(0.05);
          // La barque d'Alor Kecil, cinq minutes de traversée
          const r = shoal(new Builder(), 0.78);
          corals(r, -0.3, 0.6, 1);
          corals(r, 0.2, 0.66, 0.8);
          const boat = skiff('#ffffff', '#1c7ed6', 0.85);
          person(boat, '#e8590c', '#f2d16b', -0.08, 0.04, 0, 0.55);
          const ferry = boat.mesh();
          const sea = afloat(r.mesh(), ferry);
          return {
            parts: [b.mesh(), leaves, smoke, sea],
            update(t) {
              ride(sea, t);
              leaves.rotation.z = Math.sin(t * 1.4) * 0.14;
              rise(smoke, (t * 0.3) % 1, 0.06, g + 0.42, -0.28, 0.4, 0.1, 1);
              const u = pingpong(t * 0.14);
              ferry.position.set(0.62 + u * 0.4, 0.02, 0.2 + u * 0.1);
              ferry.rotation.y = (t * 0.14) % 2 < 1 ? -0.25 : PI - 0.25;
              ferry.rotation.z = Math.sin(t * 2.2) * 0.06;
            },
          };
        },
      },
      {
        name: 'Récif de Kepa',
        match: 'Snorkeling devant Kepa',
        dx: -0.24,
        dz: 0.36,
        size: 0.26,
        height: 0.6,
        build() {
          // Coraux durs en très bon état : tables, cerveaux, branches
          const r = shoal(new Builder(), 0.5);
          for (const [x, z, rad, c] of [[-0.28, -0.14, 0.13, '#ffa94d'], [0.27, -0.2, 0.12, '#63e6be']]) {
            r.cyl('#8a6d5a', 0.02, 0.03, 0.06, 5, x, 0.04, z);
            r.cyl(c, rad, rad * 0.7, 0.03, 8, x, 0.08, z);
          }
          r.ball('#e599f7', 0.1, 0.3, 0.03, 0.14, 1.1, 0.7, 1, 1).ball('#ffd43b', 0.08, -0.32, 0.03, 0.2, 1.1, 0.7, 1, 1);
          for (let i = 0; i < 5; i++) r.cone('#74c0fc', 0.03, 0.14, 5, -0.04 + Math.cos(i * 1.26) * 0.06, 0.07, -0.32 + Math.sin(i * 1.26) * 0.06, Math.sin(i * 1.26) * 0.4, 0, -Math.cos(i * 1.26) * 0.4);
          // L'anémone et ses poissons-clowns
          r.ball('#c2255c', 0.09, 0, 0.03, 0.02, 1.2, 0.6, 1.2);
          const a = new Builder();
          for (let i = 0; i < 9; i++) {
            const an = (i / 9) * TAU;
            const rr = i % 2 ? 0.07 : 0.035;
            a.cone('#ffa8cc', 0.016, 0.1, 4, Math.cos(an) * rr, 0.05, Math.sin(an) * rr, Math.sin(an) * 0.4, 0, -Math.cos(an) * 0.4);
          }
          const tentacles = a.mesh(0, 0.05, 0.02);
          const c = new Builder();
          c.octa('#ff7b1c', 0.045, 0, 0, 0, 1.6, 1, 0.6).box('#ffffff', 0.016, 0.075, 0.056, 0.01, 0, 0).box('#ffffff', 0.014, 0.05, 0.04, -0.045, 0, 0);
          c.octa('#ff7b1c', 0.03, -0.14, 0.02, 0.08, 1.6, 1, 0.6).box('#ffffff', 0.012, 0.05, 0.04, -0.135, 0.02, 0.08);
          const clowns = c.mesh();
          const diver = swimmer('#1c7ed6', 0.52); // en shorty : l'eau est fraîche en août
          const sea = afloat(r.mesh(), tentacles, clowns, diver);
          return {
            parts: [sea],
            update(t) {
              ride(sea, t);
              tentacles.rotation.z = Math.sin(t * 1.8) * 0.2;
              tentacles.rotation.x = Math.cos(t * 1.4) * 0.2;
              circle(clowns, t * 1.2, 0, 0.19 + Math.sin(t * 3) * 0.02, 0.02, 0.11);
              circle(diver, t * 0.45, 0, 0.06 + Math.sin(t * 2.2) * 0.012, 0.04, 0.32, 0.26);
            },
          };
        },
      },
      {
        name: 'Pura et Ternate',
        match: 'Sortie en barque',
        dx: -0.2,
        dz: -0.45,
        size: 0.26,
        height: 0.8,
        build() {
          const w = swell(S, this);
          const b = new Builder();
          // L'île de Pura : un cône sec tombant dans la mer, un village au ras de l'eau
          const top = w + 0.42;
          b.cyl('#a9a85a', 0.05, 0.56, top + 2.5 * w, 8, -0.2, (top - 2.5 * w) / 2, -0.2);
          b.cyl('#8f9a4a', 0.05, 0.2, 0.2, 8, -0.2, top - 0.1, -0.2);
          for (const [x, y, z] of [[-0.3, 0.3, -0.02], [-0.06, 0.36, -0.08], [-0.36, 0.42, -0.14]]) b.ball('#6f8a3a', 0.05, x, w + y - 0.1, z);
          const g = isle(b, w, 0.16, 0.0, 0.08);
          hut(b, -0.04, 0.06, 0.5, g - 0.01);
          hut(b, 0.08, 0.12, 0.42, g - 0.01, '#e9d8a6');
          // Le rocher d'où plongent les enfants, avec leurs lunettes de bois
          const rock = w + 0.06;
          b.cyl('#8d8478', 0.13, 0.3, rock + 2.5 * w, 7, 0.42, (rock - 2.5 * w) / 2, -0.06);
          const kid = walker('#e64980', null, 0.6);
          // Nasse en bambou posée sur le récif
          const r = shoal(new Builder(), 0.72, 0.08, 0.14);
          r.cyl('#d9b96a', 0.05, 0.1, 0.24, 7, 0.36, 0.1, 0.42, 0, 0.5, PI / 2);
          for (const k of [-0.08, 0, 0.08]) r.cyl('#8d6a2f', 0.09 - k * 0.2, 0.09 - k * 0.2, 0.014, 7, 0.36 + k * 0.88, 0.1, 0.42 - k * 0.48, 0, 0.5, PI / 2);
          corals(r, 0.1, 0.5, 0.9);
          const fishes = school(['#ffd43b', '#f8f9fa'], 5, 0.12, 0.7);
          fishes.position.set(0.36, 0.08, 0.42);
          // La barque à balancier du pêcheur
          const boat = skiff('#1c7ed6', '#ffd43b', 0.9);
          boat.box('#8d5a2b', 0.34, 0.012, 0.012, 0, 0.03, 0.16).box('#8d5a2b', 0.34, 0.012, 0.012, 0, 0.03, -0.16).box('#8d5a2b', 0.012, 0.012, 0.34, -0.09, 0.07, 0).box('#8d5a2b', 0.012, 0.012, 0.34, 0.09, 0.07, 0);
          person(boat, '#e8590c', '#f2d16b', -0.04, 0.04, 0, 0.6);
          const canoe = boat.mesh();
          const sea = afloat(r.mesh(), fishes, canoe);
          return {
            parts: [b.mesh(), kid, sea],
            update(t) {
              ride(sea, t);
              fishes.rotation.y = t * 1.2;
              circle(canoe, t * 0.35, -0.1, 0.02, 0.4, 0.34, 0.16);
              canoe.rotation.z = Math.sin(t * 2.1) * 0.06;
              const u = (t * 0.5) % 1;
              const j = Math.min(1, u / 0.55);
              kid.position.set(0.42 + j * 0.16, rock + Math.sin(j * PI) * 0.2 - j * rock, -0.02 + j * 0.1);
              kid.rotation.z = -j * 2.6;
              kid.scale.setScalar(u < 0.55 ? 1 : Math.max(0.01, 1 - (u - 0.55) * 6));
            },
          };
        },
      },
      {
        name: 'Village de Takpala',
        match: 'Village de Takpala',
        dx: 0.7,
        dz: 0.05,
        size: 0.28,
        height: 1.13,
        build() {
          const b = new Builder();
          pad(b, '#c9a877', 0.64, 0, 0, 0.06);
          // Maisons abui en bambou, à haut toit de chaume, autour de la place
          lopo(b, -0.36, -0.2, 0.95, 0.06);
          lopo(b, 0.0, -0.36, 1.05, 0.06);
          lopo(b, 0.38, -0.18, 0.9, 0.06);
          bush(b, -0.5, 0.06, 0.1, 0.08, '#6f8a3a').ball('#6f8a3a', 0.07, 0.52, 0.11, 0.14);
          // Le mesbah, autel de pierres au centre, avec un moko
          b.cyl('#8d8478', 0.1, 0.12, 0.06, 8, 0, 0.09, 0.2);
          b.cyl('#b08d57', 0.04, 0.025, 0.04, 8, 0, 0.14, 0.2).cyl('#b08d57', 0.025, 0.04, 0.04, 8, 0, 0.18, 0.2);
          // Le lego-lego : on danse en cercle, bras dessus bras dessous
          const d = new Builder();
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * TAU;
            person(d, ['#7b2d26', '#1d2b53', '#c2255c', '#e8590c'][i % 4], null, Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25, 0.7);
            d.box(SKIN, 0.19, 0.02, 0.02, Math.cos(a + PI / 8) * 0.245, 0.1, Math.sin(a + PI / 8) * 0.245, 0, -(a + PI / 8) - PI / 2, 0);
          }
          const dancers = d.mesh(0, 0.06, 0.2);
          const smoke = [puff(0.06), puff(0.06)];
          return raised({
            parts: [b.mesh(), dancers, ...smoke],
            update(t) {
              dancers.rotation.y = t * 0.5;
              dancers.position.y = 0.06 + Math.abs(Math.sin(t * 3)) * 0.02;
              smoke.forEach((s, i) => rise(s, (t * 0.28 + i / 2) % 1, 0.0, 0.76, -0.36, 0.45, 0.14, 1.2));
            },
          }, 0.13);
        },
      },
      {
        name: 'Moko et ikats',
        match: 'Musée des mille moko',
        dx: 0.34,
        dz: 0.14,
        size: 0.24,
        height: 1.10,
        build() {
          const b = new Builder();
          pad(b, '#d9c9a3', 0.58, 0, 0, 0.05);
          // Un moko : tambour de bronze en sablier, à quatre anses
          const mx = -0.26;
          const mz = 0.06;
          b.box('#e9ecef', 0.34, 0.06, 0.34, mx, 0.08, mz);
          b.cyl('#b08d57', 0.1, 0.16, 0.15, 10, mx, 0.185, mz);
          b.cyl('#8f7a45', 0.085, 0.1, 0.12, 10, mx, 0.32, mz);
          b.cyl('#b08d57', 0.16, 0.085, 0.15, 10, mx, 0.455, mz);
          b.cyl('#5f9a84', 0.125, 0.14, 0.03, 10, mx, 0.16, mz).cyl('#5f9a84', 0.14, 0.125, 0.03, 10, mx, 0.47, mz);
          b.cyl('#d4b46a', 0.17, 0.17, 0.02, 10, mx, 0.54, mz).cone('#8f7a45', 0.07, 0.014, 8, mx, 0.556, mz);
          for (let i = 0; i < 4; i++) b.box('#8f7a45', 0.03, 0.07, 0.03, mx + Math.cos(i * 1.57 + 0.78) * 0.11, 0.33, mz + Math.sin(i * 1.57 + 0.78) * 0.11);
          // La tisseuse et son métier à ceinture
          b.cyl(DARK, 0.014, 0.014, 0.24, 4, 0.46, 0.17, 0.22);
          [['#7b2d26', -0.04], ['#1d2b53', 0], ['#f8f9fa', 0.04]].forEach(([c, z]) => beam(b, c, 0.46, 0.26, 0.22 + z, 0.16, 0.14, 0.22 + z, 0.04, 0.012));
          person(b, '#c2255c', null, 0.1, 0.03, 0.22, 0.95);
          const batten = new Builder().box('#6b4423', 0.025, 0.025, 0.16, 0, 0, 0).mesh();
          // Ikats de l'île, suspendus à un fil
          for (const x of [0.02, 0.5]) b.cyl(DARK, 0.012, 0.012, 0.46, 4, x, 0.28, -0.3);
          b.box(DARK, 0.5, 0.008, 0.008, 0.26, 0.5, -0.3);
          const k = new Builder();
          ['#7b2d26', '#1d2b53', '#7b2d26', '#e9d8a6', '#1d2b53', '#7b2d26'].forEach((c, i) => k.box(c, 0.036, 0.26, 0.012, -0.09 + i * 0.036, -0.13, 0));
          ['#1d2b53', '#c2255c', '#e9d8a6', '#c2255c', '#1d2b53'].forEach((c, i) => k.box(c, 0.036, 0.2, 0.012, 0.17 + i * 0.036, -0.1, 0));
          const cloth = k.mesh(0.22, 0.5, -0.3);
          const visitor = walker('#1c7ed6');
          return raised({
            parts: [b.mesh(), batten, cloth, visitor],
            update(t) {
              const u = 0.3 + pingpong(t * 1.4) * 0.5;
              batten.position.set(0.16 + u * 0.3, 0.155 + u * 0.12, 0.22);
              cloth.rotation.x = Math.sin(t * 1.6) * 0.25;
              circle(visitor, t * 0.35, mx, 0.05 + Math.abs(Math.sin(t * 7)) * 0.012, mz, 0.28);
            },
          }, 0.2);
        },
      },
    ],
  };
}

export default {
  'banda-neira': banda(),
  'ternate-tidore': ternate(),
  morotai: morotai(),
  'kri-gam-arborek': kri(),
  'waigeo-secteur-de-piaynemo': piaynemo(),
  kupang: kupang(),
  'alor-kepa': alor(),
};
