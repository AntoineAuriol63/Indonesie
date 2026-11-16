// Scènes détaillées de Lombok et des îles Gili : sud de Lombok, Tetebatu, nord de Lombok (Senaru), Gili.
import { Builder, PI, bike, person, puff, rise } from './kit.js';

// ---------- Briques propres à ce fichier ----------
const SAND = '#f3dc9a';
const SKIN = '#f2b98a';
const WOOD = '#8d5a2b';
const THATCH = '#c49a4a';
const FALL = '#8fe3f7';
const POOL = '#3ccbe6';
const EARTH = '#d2b783';
const MEADOW = '#74c365';

// Boucle dans [0, 1[ et fondu aux deux bouts d'un trajet (pour faire réapparaître un mobile sans à-coup).
const loop = (t, speed, phase = 0) => (t * speed + phase) % 1;
const fade = (k) => Math.max(0.001, Math.min(1, Math.min(k, 1 - k) * 8));
const smooth = (k) => k * k * (3 - 2 * k);

// Rehausse un élément de « lift » unités (propriété facultative d'un élément de ce fichier). En mer, c'est pour rester
// au-dessus de la houle : elle monte et descend de 0,022 unité de carte, soit près d'une demi-unité de modèle à l'échelle
// de ces scènes, et noierait l'élément. À flanc de pente, c'est pour que l'amont n'enterre pas le devant du modèle.
function raised(lift, build) {
  return () => {
    const { parts, update } = build();
    const root = new Builder().mesh(); // mesh vide qui sert de conteneur
    root.position.y = lift;
    root.add(...parts);
    return { parts: [root], update };
  };
}
const withLift = (items) => items.map((it) => (it.lift ? { ...it, height: it.height + it.lift, build: raised(it.lift, it.build) } : it));

// Dalle de terrain épaisse : le dessus est à la hauteur « top », le reste s'enfonce dans le sol pour rattraper la pente.
function slab(b, color, r, top = 0.04, x = 0, z = 0, seg = 10) {
  return b.cyl(color, r, r * 1.04, 0.34, seg, x, top - 0.17, z);
}

// Cocotier fixe, penché de « lean » radians vers +x, planté à la hauteur y.
function palm(b, x, z, h = 0.5, lean = 0.2, y = 0) {
  b.cyl('#a8763e', 0.022, 0.035, h, 5, x + (Math.sin(lean) * h) / 2, y + (Math.cos(lean) * h) / 2, z, 0, 0, -lean);
  const tx = x + Math.sin(lean) * h;
  const ty = y + Math.cos(lean) * h;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2 + 0.3;
    b.box(i % 2 ? '#2f9e44' : '#40c057', 0.26, 0.02, 0.09, tx + Math.cos(a) * 0.11, ty - 0.02, z + Math.sin(a) * 0.11, 0, -a, -0.4);
  }
  return b;
}

// Traits d'eau blancs d'une ou plusieurs chutes : [x, z, largeur, y du bas, nombre]. Le mesh descend d'un pas (STEP) en boucle.
const STEP = 0.22;
function drops(list) {
  const b = new Builder();
  for (const [x, z, w, y0, n] of list) for (let i = 0; i < n; i++) b.box('#ffffff', w * 0.4, 0.09, 0.02, x + ((i % 2) - 0.5) * w * 0.5, y0 + i * STEP, z);
  return b.mesh();
}
const fallDown = (mesh, t, speed = 0.6) => {
  mesh.position.y = -loop(t, speed) * STEP;
};

// Écume au pied d'une chute.
function foam(x, y, z, s = 1) {
  const m = new Builder().ball('#ffffff', 0.07, -0.07, 0, 0).ball('#ffffff', 0.08, 0.06, 0.01, 0.03).ball('#e6fbff', 0.06, 0, 0, 0.08).mesh(x, y, z);
  m.userData.s = s;
  return m;
}
const churn = (m, t) => m.scale.set(m.userData.s * (1 + Math.sin(t * 5) * 0.18), m.userData.s * (0.8 + Math.sin(t * 7) * 0.3), m.userData.s * (1 + Math.cos(t * 4) * 0.15));

// Oiseaux en vol, répartis sur un cercle de rayon r (on fait tourner le mesh).
function birds(color, n, r, s = 1) {
  const b = new Builder();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    for (const tilt of [0.4, -0.4]) b.box(color, 0.12 * s, 0.014 * s, 0.045 * s, Math.cos(a) * r, i * 0.05, Math.sin(a) * r, 0, -a, tilt);
  }
  return b.mesh();
}

// Disque du soleil, face à la caméra.
function sun(core, halo, r) {
  const m = new Builder().cyl(halo, r * 1.32, r * 1.32, 0.012, 14, 0, 0, -0.012, PI / 2, 0, 0).cyl(core, r, r, 0.02, 14, 0, 0, 0, PI / 2, 0, 0).mesh();
  m.rotation.x = -0.75;
  return m;
}

// Buffle d'eau, tourné vers +x, origine au sol.
function buffalo() {
  const b = new Builder();
  b.box('#5b606b', 0.3, 0.16, 0.15, 0, 0.19, 0);
  b.box('#4b4f58', 0.12, 0.11, 0.12, 0.2, 0.2, 0);
  b.box('#3a3d44', 0.06, 0.06, 0.09, 0.28, 0.17, 0);
  b.box('#efe6cf', 0.03, 0.03, 0.32, 0.18, 0.27, 0); // cornes en croissant, rabattues vers l'arrière
  b.box('#efe6cf', 0.1, 0.03, 0.03, 0.14, 0.29, 0.16, 0, 0, -0.3).box('#efe6cf', 0.1, 0.03, 0.03, 0.14, 0.29, -0.16, 0, 0, -0.3);
  for (const [x, z] of [[0.1, 0.05], [0.1, -0.05], [-0.1, 0.05], [-0.1, -0.05]]) b.box('#3a3d44', 0.045, 0.12, 0.045, x, 0.06, z);
  b.box('#3a3d44', 0.02, 0.11, 0.02, -0.16, 0.17, 0);
  return b.mesh();
}

// Jukung : pirogue à deux balanciers, tournée vers +x. Renvoie le Builder pour y ajouter un équipage.
function jukung(hull, sail) {
  const b = new Builder();
  b.poly(hull, [[-0.3, 0.07], [0.34, 0.1], [0.22, 0], [-0.2, 0]], 0.08);
  b.poly('#ffffff', [[-0.3, 0.07], [0.34, 0.1], [0.33, 0.075], [-0.29, 0.045]], 0.084);
  for (const x of [-0.12, 0.14]) b.box('#c9a36b', 0.02, 0.02, 0.52, x, 0.09, 0);
  for (const z of [-0.26, 0.26]) b.cyl('#e9d8a6', 0.018, 0.018, 0.5, 5, 0, 0.06, z, 0, 0, PI / 2);
  if (sail) b.cyl('#6b4423', 0.01, 0.01, 0.42, 4, 0.05, 0.29, 0).poly(sail, [[0.04, 0.12], [0.04, 0.5], [-0.24, 0.15]], 0.012);
  return b;
}

// Nageur au masque et tuba, allongé à la surface, tourné vers +x.
function snorkeler(suit) {
  const b = new Builder();
  b.box(suit, 0.3, 0.09, 0.14, 0, 0, 0).box(SKIN, 0.2, 0.07, 0.11, -0.24, 0, 0).ball(SKIN, 0.085, 0.22, 0.02, 0);
  b.box('#1d2b53', 0.05, 0.07, 0.15, 0.275, 0.01, 0);
  b.cyl('#ffd23f', 0.016, 0.016, 0.2, 5, 0.2, 0.14, 0.09).box('#ffd23f', 0.05, 0.03, 0.03, 0.22, 0.24, 0.09);
  b.box(SKIN, 0.2, 0.04, 0.05, 0.08, -0.01, 0.13, 0, 0.5, 0).box(SKIN, 0.2, 0.04, 0.05, 0.08, -0.01, -0.13, 0, -0.5, 0);
  b.box('#a3e635', 0.18, 0.025, 0.08, -0.42, 0, 0.05, 0, 0, 0.25).box('#a3e635', 0.18, 0.025, 0.08, -0.42, 0, -0.05, 0, 0, -0.25);
  return b.mesh();
}

// Maison sasak : murs bas de bambou tressé sous un grand toit de chaume. « turned » : faîte parallèle à la caméra.
function sasakHouse(b, x, z, w, roof, turned) {
  b.box('#d6b97b', w, 0.13, w * 0.72, x, 0.105, z);
  b.box('#b8975a', w + 0.006, 0.025, w * 0.72 + 0.006, x, 0.12, z);
  if (turned) b.poly(roof, [[-w * 0.52, 0], [w * 0.52, 0], [w * 0.1, w * 0.56], [-w * 0.1, w * 0.56]], w * 1.25, x, 0.17, z, 0, PI / 2, 0);
  else b.poly(roof, [[-w * 0.68, 0], [w * 0.68, 0], [w * 0.12, w * 0.62], [-w * 0.12, w * 0.62]], w * 0.92, x, 0.17, z);
  b.box('#5a4334', w * 0.22, 0.09, 0.02, x, 0.085, z + w * 0.36 + 0.006);
}

// Une file de marcheurs, guide en tête : [couleur, chapeau, sac à dos].
function walkers(list, s = 0.85, gap = 0.11) {
  const b = new Builder();
  list.forEach(([body, hat, pack], i) => {
    const x = ((list.length - 1) / 2 - i) * gap;
    person(b, body, hat, x, 0, 0, s);
    if (pack) b.box(pack, 0.05 * s, 0.08 * s, 0.04 * s, x - 0.045 * s, 0.11 * s, 0);
  });
  return b.mesh();
}
// Aller-retour d'une file le long de x, entre -half et +half ; elle fait demi-tour aux deux bouts.
function patrol(mesh, t, speed, half, x, y, z) {
  const u = loop(t, speed) * 2;
  const forth = u < 1;
  mesh.position.set(x + (forth ? u * 2 - 1 : 3 - u * 2) * half, y + Math.abs(Math.sin(t * 7)) * 0.012, z);
  mesh.rotation.y = forth ? 0 : PI;
}

// Profil du toit « en bonnet » des greniers à riz sasak.
const BONNET = [[-0.19, 0], [-0.24, 0.13], [-0.21, 0.28], [-0.12, 0.39], [0, 0.43], [0.12, 0.39], [0.21, 0.28], [0.24, 0.13], [0.19, 0]];

// Croissant de lune.
function crescent(R = 0.09) {
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const a = -1.92 + (i / 8) * 3.84;
    pts.push([Math.cos(a) * R, Math.sin(a) * R]);
  }
  for (let i = 1; i < 7; i++) {
    const a = 1.465 - (i / 7) * 2.93;
    pts.push([-0.444 * R + Math.cos(a) * R * 0.944, Math.sin(a) * R * 0.944]);
  }
  return pts;
}

// ---------- Sud de Lombok (Kuta) : le repère est en mer, la côte passe à 0,3 unité au nord ----------
const SUD = [
  {
    name: 'Village sasak',
    match: 'Village sasak',
    dx: 0.3,
    dz: -0.88,
    size: 0.22,
    height: 0.82,
    build() {
      const b = new Builder();
      slab(b, EARTH, 0.56);
      // Lumbung : grenier à riz sur pilotis, toit de chaume en forme de bonnet
      const lx = -0.24;
      const lz = -0.14;
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        b.cyl(WOOD, 0.02, 0.02, 0.22, 5, lx + x * 0.13, 0.15, lz + z * 0.12);
        b.cyl('#5a4334', 0.05, 0.05, 0.015, 7, lx + x * 0.13, 0.25, lz + z * 0.12); // disques contre les rats
      }
      b.box('#a67c52', 0.4, 0.03, 0.36, lx, 0.275, lz);
      b.poly(THATCH, BONNET, 0.36, lx, 0.29, lz);
      b.box('#a67f35', 0.14, 0.03, 0.38, lx, 0.715, lz);
      b.box('#5a4334', 0.09, 0.11, 0.02, lx, 0.37, lz + 0.185);
      b.box(WOOD, 0.05, 0.3, 0.015, lx + 0.02, 0.17, lz + 0.26, 0.5, 0, 0); // échelle
      // Maison au toit de chaume
      sasakHouse(b, 0.27, -0.18, 0.38, '#b9924a', false);
      b.box('#8d7b5a', 0.28, 0.03, 0.1, 0.27, 0.055, 0.03);
      // Portique où sèchent les étoffes tissées par les femmes du village
      for (const x of [-0.2, 0.22]) b.cyl(WOOD, 0.012, 0.012, 0.3, 4, x, 0.19, 0.34);
      b.box(WOOD, 0.44, 0.015, 0.015, 0.01, 0.34, 0.34);
      const c = new Builder();
      ['#c92a2a', '#364fc7', '#fcc419', '#e64980'].forEach((col, i) => {
        c.box(col, 0.085, 0.2, 0.012, -0.15 + i * 0.1, -0.1, 0);
        c.box('#fff3d6', 0.087, 0.02, 0.014, -0.15 + i * 0.1, -0.15, 0);
      });
      const cloths = c.mesh(0.01, 0.335, 0.34);
      // Une villageoise, panier sur la tête, et une poule qui picore
      const woman = person(new Builder(), '#7048e8', null, 0, 0, 0, 0.9).cyl('#c9a36b', 0.06, 0.04, 0.05, 7, 0, 0.26, 0).mesh();
      const hen = new Builder().ball('#ffffff', 0.04, 0, 0.045, 0, 1.2, 1, 0.9).ball('#ffffff', 0.024, 0.045, 0.085, 0).box('#e03131', 0.02, 0.02, 0.01, 0.045, 0.11, 0).box('#ffa94d', 0.025, 0.012, 0.012, 0.075, 0.082, 0).mesh();
      return {
        parts: [b.mesh(), cloths, woman, hen],
        update(t) {
          cloths.rotation.x = Math.sin(t * 2) * 0.28;
          patrol(woman, t, 0.11, 0.2, 0.02, 0.04, 0.12);
          hen.position.set(-0.3 + Math.sin(t * 0.5) * 0.08, 0.04, 0.3);
          hen.rotation.z = -Math.max(0, Math.sin(t * 7)) * 0.7;
        },
      };
    },
  },
  {
    name: 'Buffles sur la plage',
    match: 'Premier cours de surf',
    dx: -0.55,
    dz: -0.52,
    size: 0.2,
    height: 0.5,
    build() {
      const b = new Builder();
      b.box(SAND, 1.12, 0.34, 0.5, 0, -0.13, 0);
      b.box('#fff7dd', 1.12, 0.02, 0.12, 0, 0.04, 0.2); // sable mouillé
      for (const x of [-0.42, -0.1, 0.36]) b.cone('#9bbf4f', 0.045, 0.11, 5, x, 0.09, -0.2);
      // En fin d'après-midi, le troupeau traverse la plage, le gardien derrière
      const herd = [buffalo(), buffalo(), buffalo(), person(new Builder(), '#e8590c', '#f2d16b', 0, 0, 0, 0.95).box(WOOD, 0.015, 0.3, 0.015, -0.08, 0.16, 0, 0, 0, 0.6).mesh()];
      const sizes = [1, 0.68, 0.92, 1];
      const lanes = [0.02, 0.1, -0.06, 0.04];
      return {
        parts: [b.mesh(), ...herd],
        update(t) {
          herd.forEach((m, i) => {
            const k = loop(t, 0.08, 1 - i * 0.2);
            m.position.set(0.5 - k, 0.04 + Math.abs(Math.sin(t * 6 + i * 2)) * 0.012, lanes[i]);
            m.rotation.set(0, i < 3 ? PI : 0, i < 3 ? Math.sin(t * 6 + i * 2) * 0.05 : 0);
            m.scale.setScalar(sizes[i] * fade(k));
          });
        },
      };
    },
  },
  {
    name: 'Dîner à Kuta',
    match: 'Dîner à Kuta',
    dx: 0.03,
    dz: -0.6,
    size: 0.2,
    height: 0.8,
    build() {
      const b = new Builder();
      slab(b, '#e3cf9d', 0.54);
      // Warung : comptoir de bambou sous un toit de chaume, guirlande d'ampoules, planche de surf contre le poteau
      b.box('#c9a36b', 0.62, 0.2, 0.2, 0, 0.14, -0.26);
      for (const x of [-0.34, 0.34]) for (const z of [-0.4, -0.12]) b.cyl(WOOD, 0.018, 0.018, 0.5, 5, x, 0.29, z);
      b.poly(THATCH, [[-0.46, 0], [0.46, 0], [0.08, 0.2], [-0.08, 0.2]], 0.4, 0, 0.52, -0.26);
      for (let i = -3; i <= 3; i++) b.ball(i % 2 ? '#ffd43b' : '#ff922b', 0.024, i * 0.11, 0.5, -0.05);
      b.box('#ffd43b', 0.08, 0.42, 0.02, -0.46, 0.25, -0.1, 0, 0, 0.18).box('#e03131', 0.082, 0.05, 0.022, -0.45, 0.3, -0.1, 0, 0, 0.18);
      // Barbecue : braises et poulets grillés (ayam taliwang)
      b.box('#495057', 0.38, 0.05, 0.18, -0.08, 0.17, 0.12);
      for (const x of [-0.24, 0.08]) b.box('#343a40', 0.025, 0.12, 0.16, x, 0.1, 0.12);
      b.box('#ff6b35', 0.34, 0.015, 0.14, -0.08, 0.2, 0.12);
      for (let i = 0; i < 3; i++) b.ball('#a8431a', 0.05, -0.19 + i * 0.11, 0.225, 0.12, 1.1, 0.5, 1.3);
      person(b, '#e8590c', null, -0.08, 0.04, -0.04, 0.95);
      // Table, assiette de liserons d'eau, un dîneur
      b.box('#a67c52', 0.24, 0.025, 0.2, 0.36, 0.17, 0.26);
      for (const x of [0.27, 0.45]) b.box(WOOD, 0.025, 0.12, 0.16, x, 0.1, 0.26);
      b.cyl('#ffffff', 0.05, 0.05, 0.012, 8, 0.36, 0.19, 0.26).ball('#51cf66', 0.035, 0.36, 0.2, 0.26, 1, 0.6, 1);
      person(b, '#339af0', null, 0.36, 0.06, 0.08, 0.8);
      const fan = new Builder().box('#f2d16b', 0.1, 0.1, 0.012, 0, 0.1, 0).box(WOOD, 0.012, 0.08, 0.012, 0, 0.03, 0).mesh(0.0, 0.2, 0.02);
      const smoke = [puff(0.05), puff(0.05)];
      return {
        parts: [b.mesh(), fan, ...smoke],
        update(t) {
          fan.rotation.z = -0.5 + Math.sin(t * 9) * 0.5;
          smoke.forEach((s, i) => rise(s, loop(t, 0.4, i * 0.5), -0.1 + i * 0.08, 0.26, 0.12, 0.45, 0.1, 1));
        },
      };
    },
  },
  {
    name: 'Colline de Merese',
    match: 'Coucher de soleil sur la colline',
    dx: 0.47,
    dz: -0.4,
    size: 0.24,
    height: 1.3,
    lift: 0.15,
    build() {
      // Hauteur de la colline (un ellipsoïde) à la verticale d'un point
      const hill = (x, z) => -0.04 + 0.5 * Math.sqrt(Math.max(0, 1 - (x * x) / 0.25 - (z * z) / 0.18));
      const b = new Builder();
      b.ball('#8fb548', 0.5, 0, -0.04, 0, 1, 1, 0.85, 1); // herbe rase
      b.ball('#7ea63e', 0.3, 0.34, -0.04, -0.14, 1, 0.75, 0.9, 1);
      b.ball('#a3c257', 0.22, -0.38, -0.04, 0.16, 1, 0.6, 0.9, 1);
      for (let i = 0; i < 6; i++) b.box('#efe2b4', 0.05, 0.02, 0.04, 0.32 - i * 0.055, hill(0.32 - i * 0.055, 0.3 - i * 0.045), 0.3 - i * 0.045); // sentier
      // L'arbre solitaire du sommet, et ceux qui attendent le coucher du soleil
      b.cyl('#6b4423', 0.015, 0.02, 0.14, 5, 0.18, hill(0.18, -0.08) + 0.06, -0.08).ball('#5c940d', 0.09, 0.18, hill(0.18, -0.08) + 0.17, -0.08, 1.3, 0.7, 1.1);
      person(b, '#e64980', null, -0.08, hill(-0.08, 0.08) - 0.03, 0.08, 0.75);
      person(b, '#339af0', null, 0.03, hill(0.03, 0.1) - 0.03, 0.1, 0.75);
      person(b, '#ffd43b', '#f2d16b', -0.2, hill(-0.2, 0.1) - 0.03, 0.1, 0.7);
      const disc = sun('#ff6b1a', '#ffb347', 0.17);
      const hiker = person(new Builder(), '#ffffff', null, 0, 0, 0, 0.8).box('#e03131', 0.045, 0.07, 0.04, 0, 0.1, 0.045).mesh();
      const flock = birds('#3d3a52', 2, 0.07, 0.8);
      return {
        parts: [b.mesh(), disc, hiker, flock],
        update(t) {
          // Le soleil descend côté ouest et disparaît derrière l'épaule de la colline
          const k = loop(t, 0.07);
          disc.position.set(-0.52, 0.9 - k * 0.62, -0.22);
          disc.scale.setScalar(fade(k));
          const u = loop(t, 0.1);
          const x = 0.34 - u * 0.3;
          const z = 0.32 - u * 0.24;
          hiker.position.set(x, hill(x, z) + Math.abs(Math.sin(t * 7)) * 0.012, z);
          hiker.scale.setScalar(fade(u));
          const f = loop(t, 0.12, 0.3);
          flock.position.set(0.55 - f * 1.1, 0.6 + Math.sin(t * 2) * 0.03, -0.2);
          flock.rotation.y = PI / 2;
          flock.scale.setScalar(fade(f));
        },
      };
    },
  },
  {
    name: 'Plage de Mawun',
    match: 'Plage de Mawun',
    dx: -0.2,
    dz: -0.3,
    size: 0.22,
    height: 0.8,
    lift: 0.4,
    build() {
      const b = new Builder();
      // Croissant de sable, eau claire au bord et vite profonde, entre deux collines qui ferment presque la baie
      slab(b, SAND, 0.52, 0.04, 0, -0.1);
      b.cyl('#5fd9e6', 0.34, 0.34, 0.02, 12, 0, 0.045, 0.14);
      b.cyl('#22b0d8', 0.2, 0.2, 0.02, 10, 0, 0.05, 0.25);
      b.ball('#7cc35a', 0.24, -0.45, 0.04, 0.18, 1, 1.15, 1.25, 1);
      b.ball('#6ab04c', 0.22, 0.46, 0.04, 0.16, 1, 1.3, 1.25, 1);
      b.ball('#8fd36a', 0.2, -0.3, 0.03, -0.44, 1.3, 0.7, 0.8, 1).ball('#7cc35a', 0.2, 0.32, 0.03, -0.46, 1.3, 0.6, 0.8, 1);
      for (const [x, c] of [[-0.16, '#4dabf7'], [0.14, '#ff8787']]) {
        b.box(c, 0.08, 0.02, 0.18, x + 0.1, 0.07, -0.2).box(c, 0.08, 0.02, 0.09, x + 0.1, 0.1, -0.32, 0.7, 0, 0); // transats
        b.cyl('#ffffff', 0.008, 0.008, 0.3, 4, x, 0.19, -0.26);
      }
      palm(b, 0.02, -0.46, 0.46, 0.15, 0.04);
      const parasols = [['#e03131', -0.16], ['#ffd43b', 0.14]].map(([c, x]) => new Builder().cone(c, 0.15, 0.08, 8, 0, 0.04, 0).cyl('#ffffff', 0.15, 0.15, 0.012, 8, 0, 0, 0).mesh(x, 0.34, -0.26));
      const swimmer = new Builder().ball(SKIN, 0.045, 0, 0.035, 0).box('#f06595', 0.1, 0.04, 0.06, 0, 0, 0).box(SKIN, 0.22, 0.025, 0.03, 0, 0.012, 0).mesh();
      return {
        parts: [b.mesh(), ...parasols, swimmer],
        update(t) {
          parasols.forEach((p, i) => {
            p.rotation.z = Math.sin(t * 1.6 + i) * 0.16;
            p.rotation.x = Math.cos(t * 1.2 + i) * 0.1;
          });
          // Le baigneur reste près du bord
          swimmer.position.set(Math.sin(t * 0.5) * 0.14, 0.065 + Math.sin(t * 2.5) * 0.008, 0.02 + Math.cos(t * 0.5) * 0.05);
          swimmer.rotation.y = Math.sin(t * 0.5) * 0.8;
        },
      };
    },
  },
  {
    name: 'Tanjung Aan',
    match: 'Plage de Tanjung Aan',
    dx: 0.23,
    dz: -0.12,
    size: 0.22,
    height: 0.75,
    lift: 0.45,
    build() {
      const b = new Builder();
      // Deux baies jumelles : sable très fin d'un côté, en grains ronds comme du poivre de l'autre
      slab(b, '#fff4d6', 0.36, 0.04, -0.22, -0.14);
      slab(b, '#e6c987', 0.36, 0.04, 0.22, -0.14);
      for (let i = 0; i < 6; i++) b.ball('#b98f4d', 0.02, 0.08 + i * 0.07, 0.05, -0.2 - (i % 2) * 0.1);
      for (const x of [-0.26, 0.26]) b.cyl('#8eeee4', 0.25, 0.25, 0.02, 10, x, 0.045, 0.12).cyl('#4fd3e0', 0.13, 0.13, 0.02, 8, x, 0.05, 0.22);
      b.ball('#9a8f7a', 0.13, 0, 0.05, 0.1, 1, 1.1, 1.7, 1).ball('#8fd36a', 0.09, 0, 0.17, 0.04, 1.1, 0.6, 1.5); // le promontoire entre les deux
      palm(b, -0.36, -0.3, 0.42, 0.2, 0.04);
      palm(b, 0.42, -0.32, 0.36, -0.15, 0.04);
      const boat = jukung('#e03131', '#ffd43b').mesh();
      boat.scale.setScalar(0.72);
      const w = new Builder();
      person(w, '#ff922b', null, -0.05, -0.08, 0, 0.9);
      person(w, '#4dabf7', '#f2d16b', 0.07, -0.08, 0.05, 0.8);
      const bathers = w.mesh();
      const gull = birds('#ffffff', 1, 0, 0.9);
      return {
        parts: [b.mesh(), boat, bathers, gull],
        update(t) {
          boat.position.set(0.27, 0.06 + Math.sin(t * 2.1) * 0.01, 0.2);
          boat.rotation.set(Math.sin(t * 1.3) * 0.1, 0.25, Math.sin(t * 1.7) * 0.08);
          bathers.position.set(-0.26, 0.06 + Math.sin(t * 2.4) * 0.012, 0.14);
          bathers.rotation.y = Math.sin(t * 0.8) * 0.6;
          const a = t * 0.7;
          gull.position.set(Math.cos(a) * 0.36, 0.5 + Math.sin(t * 1.7) * 0.03, -0.08 + Math.sin(a) * 0.22);
          gull.rotation.y = -a - PI / 2;
        },
      };
    },
  },
  {
    name: 'Cours de surf',
    match: 'Premier cours de surf',
    dx: -0.5,
    dz: -0.1,
    size: 0.22,
    height: 0.75,
    lift: 0.45,
    build() {
      const b = new Builder();
      // Au fond, le bout de plage de l'école : planches plantées dans le sable, parasol
      b.box(SAND, 1.0, 0.34, 0.24, 0, -0.12, -0.42);
      b.box(WOOD, 0.36, 0.02, 0.02, -0.26, 0.21, -0.46);
      ['#ff6b6b', '#ffd43b', '#4dabf7'].forEach((c, i) => b.box(c, 0.075, 0.3, 0.02, -0.37 + i * 0.11, 0.19, -0.43, -0.25, 0, 0));
      b.cyl('#ffffff', 0.01, 0.01, 0.32, 4, 0.3, 0.2, -0.42).cone('#e03131', 0.17, 0.09, 8, 0.3, 0.39, -0.42);
      person(b, '#2f9e44', null, 0.12, 0.05, -0.4, 0.8);
      // Le moniteur, dans l'eau jusqu'à la taille, bras levés
      person(b, '#1d2b53', '#f2d16b', 0.38, -0.07, 0.14, 1);
      b.box(SKIN, 0.03, 0.12, 0.03, 0.32, 0.15, 0.14, 0, 0, 0.6).box(SKIN, 0.03, 0.12, 0.03, 0.44, 0.15, 0.14, 0, 0, -0.6);
      // Une vague douce qui roule vers la plage
      const w = new Builder();
      w.poly('#1ea7d6', [[-0.18, 0], [0.16, 0], [0.09, 0.1], [0.02, 0.14], [-0.06, 0.1]], 0.92, 0, 0, 0, 0, PI / 2, 0);
      for (let i = -2; i <= 2; i++) w.ball('#ffffff', 0.055, i * 0.2, 0.13, -0.03);
      const wave = w.mesh();
      // Le débutant, debout sur une grande planche en mousse, bras en croix
      const s = new Builder();
      s.box('#4dabf7', 0.15, 0.035, 0.5, 0, 0, 0).box('#ffd43b', 0.152, 0.037, 0.08, 0, 0, -0.14);
      s.box('#1d2b53', 0.05, 0.1, 0.05, 0, 0.065, -0.08).box('#1d2b53', 0.05, 0.1, 0.05, 0, 0.065, 0.08);
      s.box('#ff922b', 0.1, 0.14, 0.12, 0, 0.18, 0).ball(SKIN, 0.055, 0, 0.3, 0).box(SKIN, 0.035, 0.035, 0.42, 0, 0.22, 0);
      const surfer = s.mesh();
      // Une élève attend la vague, allongée sur sa planche
      const p = new Builder();
      p.box('#ffd43b', 0.14, 0.03, 0.44, 0, 0, 0).box('#f06595', 0.1, 0.06, 0.2, 0, 0.045, 0.02).ball(SKIN, 0.05, 0, 0.07, -0.13).box(SKIN, 0.3, 0.03, 0.04, 0, 0.03, -0.06);
      const paddler = p.mesh(-0.32, 0.02, 0.3);
      return {
        parts: [b.mesh(), wave, surfer, paddler],
        update(t) {
          const k = loop(t, 0.16);
          const z = 0.42 - k * 0.6;
          const grow = Math.sin(k * PI);
          wave.position.z = z;
          wave.scale.y = 0.3 + grow * 0.9;
          surfer.position.set(-0.04 + Math.sin(t * 0.7) * 0.05, 0.03 + grow * 0.1, z - 0.15);
          surfer.rotation.set(-0.1 * grow + Math.sin(t * 2.1) * 0.08, 0, Math.sin(t * 5) * 0.22); // il vacille
          paddler.position.y = 0.02 + Math.sin(t * 2.4) * 0.015;
          paddler.rotation.z = Math.sin(t * 2.4 + 1) * 0.08;
        },
      };
    },
  },
];

// ---------- Tetebatu : au pied sud du Rinjani ; les cascades et la forêt sont au nord, côté volcan ----------
// Le village est à 0,17 unité de carte d'altitude et la caméra vise le niveau de la mer : la scène apparaît donc décalée
// vers le haut de l'écran. D'où deux rangées seulement, étalées en largeur, et des modèles pas trop hauts au fond.
const TETEBATU = [
  {
    name: 'Singes noirs',
    match: 'Forêt des singes noirs',
    dx: -0.26,
    dz: 0.03,
    size: 0.22,
    height: 1.3,
    build() {
      const b = new Builder();
      slab(b, MEADOW, 0.5);
      b.cyl('#7a4b25', 0.05, 0.075, 0.8, 6, -0.28, 0.4, -0.08);
      b.cyl('#6f4421', 0.045, 0.065, 0.65, 6, 0.32, 0.32, -0.02);
      b.cyl('#7a4b25', 0.03, 0.04, 0.44, 5, -0.07, 0.5, -0.08, 0, 0, PI / 2);
      b.ball('#2f9e44', 0.28, -0.28, 0.88, -0.08, 1.2, 0.7, 1.1).ball('#40c057', 0.18, -0.06, 0.95, -0.14, 1.2, 0.65, 1).ball('#37b24d', 0.16, -0.46, 0.78, 0.02, 1, 0.8, 1);
      b.ball('#2b8a3e', 0.24, 0.32, 0.72, -0.02, 1.2, 0.7, 1.1).ball('#40c057', 0.15, 0.46, 0.64, 0.08);
      b.ball('#2f9e44', 0.1, -0.44, 0.08, 0.26, 1.2, 0.8, 1).ball('#51cf66', 0.08, 0.12, 0.07, 0.36, 1.2, 0.8, 1);
      // Un lutung assis sur la branche, son petit (orange à la naissance) contre lui
      b.ball('#22252b', 0.085, 0, 0.62, -0.08, 1, 1.2, 0.95).ball('#22252b', 0.06, 0, 0.75, -0.06).ball('#4a4e57', 0.03, 0, 0.745, -0.01).cone('#22252b', 0.03, 0.06, 5, 0, 0.815, -0.06);
      b.ball('#ff922b', 0.042, 0.07, 0.59, -0.02);
      const tail = new Builder().cyl('#22252b', 0.014, 0.018, 0.38, 5, 0, -0.19, 0).mesh(-0.05, 0.57, -0.12);
      // Un autre saute d'un arbre à l'autre
      const m = new Builder();
      m.ball('#22252b', 0.07, 0, 0, 0, 1.5, 0.9, 0.9).ball('#22252b', 0.05, 0.12, 0.04, 0).ball('#4a4e57', 0.025, 0.16, 0.035, 0);
      for (const z of [0.04, -0.04]) m.box('#22252b', 0.14, 0.03, 0.03, 0.12, -0.04, z, 0, 0, -0.3).box('#22252b', 0.14, 0.03, 0.03, -0.12, -0.03, z, 0, 0, 0.3);
      m.cyl('#22252b', 0.012, 0.016, 0.36, 5, -0.27, 0.05, 0, 0, 0, PI / 2 + 0.3);
      const leaper = m.mesh();
      // Au sol, un macaque gris
      const g = new Builder();
      g.ball('#9a8c7a', 0.06, 0, 0.08, 0, 1.4, 0.9, 0.9).ball('#9a8c7a', 0.045, 0.1, 0.13, 0).ball('#d9b99a', 0.022, 0.135, 0.125, 0).cyl('#9a8c7a', 0.01, 0.012, 0.14, 4, -0.12, 0.13, 0, 0, 0, 0.6);
      for (const x of [-0.05, 0.06]) g.box('#85786a', 0.025, 0.07, 0.07, x, 0.035, 0);
      const macaque = g.mesh();
      return {
        parts: [b.mesh(), tail, leaper, macaque],
        update(t) {
          tail.rotation.set(0.15, 0, Math.sin(t * 1.6) * 0.4);
          const u = loop(t, 0.2) * 2;
          const forth = u < 1;
          const k = smooth(Math.min(1, Math.max(0, ((forth ? u : u - 1) - 0.3) / 0.4)));
          const s = forth ? k : 1 - k;
          leaper.position.set(-0.2 + s * 0.5, 1.1 - s * 0.2 + Math.sin(k * PI) * 0.16, 0.02);
          leaper.rotation.set(0, forth ? 0 : PI, (0.5 - k) * 0.8);
          patrol(macaque, t, 0.1, 0.2, 0.06, 0.04, 0.26);
        },
      };
    },
  },
  {
    name: 'Jeruk Manis',
    match: 'Cascade de Jeruk Manis',
    dx: 0.26,
    dz: 0.03,
    size: 0.22,
    height: 1.2,
    build() {
      const b = new Builder();
      // Une haute chute d'un seul jet, en pleine forêt
      b.box('#857a6d', 0.6, 1.25, 0.3, 0, 0.375, -0.32);
      b.box('#9d9285', 0.28, 0.85, 0.3, -0.38, 0.225, -0.14);
      b.box('#766c61', 0.28, 0.7, 0.3, 0.38, 0.15, -0.12);
      b.ball('#2f9e44', 0.2, -0.2, 1.02, -0.32, 1.3, 0.6, 1).ball('#40c057', 0.18, 0.22, 1.02, -0.34, 1.3, 0.6, 1);
      b.ball('#37b24d', 0.14, -0.4, 0.68, -0.12, 1.2, 0.6, 1.2).ball('#2f9e44', 0.14, 0.4, 0.53, -0.1, 1.2, 0.6, 1.2);
      b.box(FALL, 0.13, 0.95, 0.04, 0, 0.525, -0.155).box(FALL, 0.13, 0.04, 0.2, 0, 1.0, -0.25);
      slab(b, MEADOW, 0.5, 0.03, 0, 0.12);
      b.cyl(POOL, 0.24, 0.24, 0.02, 9, 0, 0.045, 0.1);
      b.box('#49c6f2', 0.1, 0.02, 0.36, 0.1, 0.042, 0.42, 0, 0.3, 0);
      for (const [x, z, h] of [[-0.44, 0.2, 0.36], [-0.3, 0.42, 0.3], [0.46, 0.22, 0.34], [0.36, 0.42, 0.26], [-0.52, -0.02, 0.3]]) {
        b.cyl('#6b4423', 0.02, 0.02, 0.1, 5, x, 0.08, z).cone('#2b8a3e', 0.11, h, 6, x, 0.12 + h / 2, z);
      }
      person(b, '#ffd43b', null, -0.16, 0.03, 0.36, 0.85).box('#e8590c', 0.055, 0.08, 0.04, -0.16, 0.12, 0.4);
      const water = drops([[0, -0.13, 0.1, 0.1, 5]]);
      const mist = [puff(0.07), puff(0.07)];
      return {
        parts: [b.mesh(), water, ...mist],
        update(t) {
          fallDown(water, t);
          mist.forEach((p, i) => rise(p, loop(t, 0.3, i * 0.5), -0.06 + i * 0.12, 0.08, 0.04, 0.3, i ? 0.12 : -0.12, 1.2));
        },
      };
    },
  },
  {
    name: 'Benang Stokel',
    match: 'Cascades de Benang Stokel',
    dx: -0.78,
    dz: -0.08,
    size: 0.24,
    height: 1,
    build() {
      const b = new Builder();
      b.box('#7f766a', 1.04, 1.0, 0.3, 0, 0.3, -0.3);
      b.box('#948a7c', 0.2, 0.6, 0.2, -0.5, 0.15, -0.1).box('#6f675c', 0.12, 0.5, 0.2, 0, 0.1, -0.12);
      for (const [x, r] of [[-0.42, 0.16], [-0.14, 0.14], [0.1, 0.17], [0.38, 0.16]]) b.ball(x > 0 ? '#40c057' : '#2f9e44', r, x, 0.84, -0.3, 1.3, 0.6, 1.1);
      // Benang Stokel : deux hautes chutes côte à côte
      for (const x of [-0.36, -0.16]) b.box(FALL, 0.09, 0.78, 0.04, x, 0.42, -0.135).box(FALL, 0.09, 0.04, 0.1, x, 0.81, -0.18);
      // Benang Kelambu : l'eau sort de la végétation en rideau de fils
      b.box('#2f9e44', 0.44, 0.3, 0.08, 0.3, 0.6, -0.13);
      for (let i = 0; i < 4; i++) b.ball(i % 2 ? '#40c057' : '#37b24d', 0.09, 0.14 + i * 0.11, 0.62 + (i % 2) * 0.06, -0.08, 1.2, 0.9, 0.8);
      for (let i = 0; i < 6; i++) b.box('#d9f6fb', 0.022, 0.5, 0.02, 0.11 + i * 0.075, 0.28, -0.1);
      slab(b, MEADOW, 0.56, 0.03, 0, 0.1);
      b.cyl(POOL, 0.22, 0.22, 0.02, 9, -0.26, 0.045, 0.06).cyl(POOL, 0.2, 0.2, 0.02, 9, 0.3, 0.045, 0.06).box('#49c6f2', 0.4, 0.02, 0.1, 0.02, 0.042, 0.14);
      b.ball('#9a8f7a', 0.05, -0.02, 0.06, 0.02, 1.2, 0.7, 1).ball('#9a8f7a', 0.04, 0.5, 0.06, 0.2, 1.2, 0.7, 1);
      person(b, '#f06595', null, -0.2, -0.04, 0.12, 0.85);
      person(b, '#ffd43b', '#f2d16b', 0.44, 0.03, 0.34, 0.85);
      const twin = drops([[-0.36, -0.11, 0.08, 0.1, 3], [-0.16, -0.11, 0.08, 0.21, 3]]);
      const c = new Builder();
      for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) c.box('#ffffff', 0.032, 0.05, 0.02, 0.11 + i * 0.075, 0.12 + ((i * 0.37) % 1) * STEP + j * STEP, -0.085);
      const curtain = c.mesh();
      const spray = foam(-0.26, 0.08, 0.0, 1.1);
      return {
        parts: [b.mesh(), twin, curtain, spray],
        update(t) {
          fallDown(twin, t);
          fallDown(curtain, t, 0.45);
          churn(spray, t);
        },
      };
    },
  },
  {
    name: 'Sarang Walet',
    match: 'Cascade de Sarang Walet',
    dx: -0.46,
    dz: 0.42,
    size: 0.22,
    height: 1.12,
    build() {
      const b = new Builder();
      // Gorge étroite : deux parois rapprochées, la rivière au fond, la chute tout au bout
      b.box('#7d7468', 0.32, 1.05, 0.8, -0.35, 0.275, -0.06);
      b.box('#8c8275', 0.32, 0.95, 0.8, 0.35, 0.225, -0.06);
      b.box('#6f675c', 0.42, 1.05, 0.2, 0, 0.275, -0.42);
      b.box('#978c7e', 0.08, 0.5, 0.3, -0.19, 0.25, 0.12).box('#7d7468', 0.08, 0.4, 0.3, 0.19, 0.2, -0.1);
      b.ball('#2f9e44', 0.18, -0.36, 0.8, -0.1, 1.1, 0.5, 1.6).ball('#40c057', 0.17, 0.36, 0.7, -0.05, 1.1, 0.5, 1.6).ball('#37b24d', 0.16, 0, 0.8, -0.42, 1.3, 0.5, 0.8);
      b.ball('#51cf66', 0.06, -0.18, 0.5, 0.3).ball('#51cf66', 0.05, 0.18, 0.4, 0.2).ball('#69db7c', 0.05, -0.2, 0.3, -0.05);
      b.box('#49c6f2', 0.38, 0.3, 0.98, 0, -0.1, 0.1);
      b.box(FALL, 0.14, 0.72, 0.04, 0, 0.41, -0.31);
      b.ball('#9a8f7a', 0.05, -0.11, 0.06, 0.42, 1.2, 0.7, 1).ball('#9a8f7a', 0.04, 0.13, 0.06, 0.26, 1.2, 0.7, 1);
      const water = drops([[0, -0.285, 0.1, 0.1, 3]]);
      // On remonte la rivière à pied, de l'eau jusqu'aux genoux
      const wader = person(new Builder(), '#f06595', null, 0, 0, 0, 0.9).mesh();
      // Les martinets (walet) qui nichent dans la gorge
      const swifts = birds('#343a40', 3, 0.2, 0.7);
      return {
        parts: [b.mesh(), water, wader, swifts],
        update(t) {
          fallDown(water, t);
          const u = loop(t, 0.09) * 2;
          wader.position.set(Math.sin(t * 1.1) * 0.04, 0.01 + Math.abs(Math.sin(t * 5)) * 0.012, 0.48 - (u < 1 ? u : 2 - u) * 0.6);
          swifts.position.set(0, 1.0 + Math.sin(t * 1.5) * 0.04, -0.05);
          swifts.rotation.y = -t * 1.3;
        },
      };
    },
  },
  {
    name: 'Tisserandes',
    match: "Villages d'artisans",
    dx: 0.78,
    dz: 0.03,
    size: 0.22,
    height: 0.82,
    lift: 0.1,
    build() {
      const b = new Builder();
      slab(b, EARTH, 0.55);
      // Berugak : plateforme ouverte sous un toit de chaume, piles d'étoffes
      b.box('#a67c52', 0.5, 0.05, 0.34, -0.18, 0.15, -0.26);
      for (const x of [-0.4, 0.04]) for (const z of [-0.4, -0.12]) b.cyl(WOOD, 0.02, 0.02, 0.5, 5, x, 0.29, z);
      b.poly(THATCH, [[-0.36, 0], [0.36, 0], [0.08, 0.2], [-0.08, 0.2]], 0.44, -0.18, 0.52, -0.26);
      ['#c92a2a', '#364fc7', '#fcc419'].forEach((c, i) => b.box(c, 0.14, 0.025, 0.1, -0.28, 0.19 + i * 0.025, -0.24));
      // La tisserande, assise devant son métier à ceinture : l'étoffe rayée s'allonge devant elle
      person(b, '#e64980', null, -0.14, 0.02, 0.06, 0.95);
      ['#f1e3c4', '#c92a2a', '#364fc7', '#fcc419', '#c92a2a', '#2b8a3e'].forEach((c, i) => b.box(c, 0.2, 0.014, 0.056, -0.14, 0.125 - i * 0.008, 0.16 + i * 0.054));
      b.box(WOOD, 0.28, 0.03, 0.03, -0.14, 0.07, 0.48);
      for (const x of [-0.27, -0.01]) b.cyl(WOOD, 0.012, 0.012, 0.1, 4, x, 0.08, 0.48);
      const beater = new Builder().box('#6b4423', 0.27, 0.03, 0.022, 0, 0, 0).mesh();
      // Les étoffes teintes aux plantes sèchent sur un fil : indigo, curcuma, racine de noni
      for (const x of [0.14, 0.52]) b.cyl(WOOD, 0.014, 0.014, 0.46, 4, x, 0.27, -0.04);
      b.box(WOOD, 0.4, 0.015, 0.015, 0.33, 0.49, -0.04);
      const c = new Builder();
      ['#364fc7', '#fcc419', '#c92a2a'].forEach((col, i) => {
        c.box(col, 0.1, 0.3, 0.012, -0.12 + i * 0.12, -0.15, 0);
        c.box('#fff3d6', 0.102, 0.02, 0.014, -0.12 + i * 0.12, -0.08, 0).box('#fff3d6', 0.102, 0.02, 0.014, -0.12 + i * 0.12, -0.24, 0);
      });
      const cloths = c.mesh(0.33, 0.485, -0.04);
      // La marmite de teinture sur le feu
      b.cyl('#5c4a3d', 0.08, 0.065, 0.1, 8, 0.36, 0.11, 0.3).cyl('#364fc7', 0.068, 0.068, 0.012, 8, 0.36, 0.162, 0.3).cone('#ff922b', 0.05, 0.06, 5, 0.36, 0.06, 0.37);
      const steam = puff(0.05);
      return {
        parts: [b.mesh(), beater, cloths, steam],
        update(t) {
          beater.position.set(-0.14, 0.135, 0.25 + Math.max(0, Math.sin(t * 4)) * 0.1);
          cloths.rotation.x = Math.sin(t * 1.7) * 0.22;
          rise(steam, loop(t, 0.35), 0.36, 0.18, 0.3, 0.35, 0.08, 1);
        },
      };
    },
  },
  {
    name: 'Rizières',
    match: 'Marche dans les rizières',
    dx: 0,
    dz: 0.39,
    size: 0.24,
    height: 1,
    build() {
      const b = new Builder();
      const greens = ['#51cf66', '#8ce99a', '#69db7c', '#b2f2bb'];
      // Quatre terrasses qui descendent vers nous
      for (let i = 0; i < 4; i++) {
        const y = 0.34 - i * 0.1;
        const z = -0.36 + i * 0.24;
        b.box('#a67c52', 1.0, y + 0.3, 0.25, 0, (y - 0.3) / 2, z);
        b.box(greens[i], 0.96, 0.02, 0.2, 0, y + 0.01, z);
        for (let r = -1; r <= 1; r++) b.box('#2f9e44', 0.9, 0.024, 0.014, 0, y + 0.012, z + r * 0.06);
      }
      b.box('#9be7f5', 0.94, 0.026, 0.19, 0, 0.053, 0.36); // la terrasse du bas est en eau
      b.box('#9be7f5', 0.3, 0.026, 0.19, -0.32, 0.253, -0.12);
      // En haut : cocotier et champ de tabac
      palm(b, -0.4, -0.38, 0.42, 0.15, 0.35);
      for (let k = 0; k < 4; k++) b.cone('#2b8a3e', 0.05, 0.14, 5, 0.12 + k * 0.1, 0.43, -0.36).ball('#f783ac', 0.022, 0.12 + k * 0.1, 0.51, -0.36);
      // Le guide du village et deux marcheurs sur la digue
      const file = walkers([['#e8590c', '#f2d16b', null], ['#339af0', null, '#1d2b53'], ['#f06595', '#ffffff', null]], 0.85);
      // Un paysan repique, un autre laboure la terrasse en eau avec son buffle
      const planter = person(new Builder(), '#3b82f6', '#f2d16b', 0, 0, 0, 0.9).mesh(-0.22, 0.15, 0.12);
      const ox = buffalo();
      ox.scale.setScalar(0.62);
      ox.add(person(new Builder(), '#7048e8', '#f2d16b', -0.36, 0, 0, 1.3).box(WOOD, 0.2, 0.02, 0.02, -0.25, 0.12, 0).mesh());
      return {
        parts: [b.mesh(), file, planter, ox],
        update(t) {
          patrol(file, t, 0.07, 0.28, 0.02, 0.26, 0.0);
          planter.rotation.x = 0.4 + Math.sin(t * 3) * 0.35;
          patrol(ox, t, 0.05, 0.26, 0, 0.05, 0.36);
        },
      };
    },
  },
  {
    name: 'Cuisine sasak',
    match: 'Cours de cuisine sasak',
    dx: 0.52,
    dz: 0.39,
    size: 0.2,
    height: 0.75,
    lift: 0.1,
    build() {
      const b = new Builder();
      slab(b, EARTH, 0.52);
      // Cloison de bambou tressé, étagère, poêles et piments suspendus
      b.box('#d8b878', 0.84, 0.42, 0.04, 0, 0.25, -0.32);
      for (let i = -3; i <= 3; i++) b.box('#b8975a', 0.014, 0.42, 0.046, i * 0.12, 0.25, -0.32);
      b.box('#a67c52', 0.46, 0.02, 0.08, 0.14, 0.34, -0.27);
      b.cyl('#ffd43b', 0.035, 0.025, 0.03, 7, 0, 0.365, -0.27).cyl('#e03131', 0.035, 0.025, 0.03, 7, 0.12, 0.365, -0.27).cyl('#74b816', 0.035, 0.025, 0.03, 7, 0.24, 0.365, -0.27);
      b.cyl('#343a40', 0.055, 0.055, 0.015, 8, -0.3, 0.36, -0.29, PI / 2, 0, 0).cyl('#495057', 0.04, 0.04, 0.015, 8, -0.18, 0.37, -0.29, PI / 2, 0, 0);
      for (let i = 0; i < 4; i++) b.cone('#e03131', 0.016, 0.07, 4, -0.06 + i * 0.028, 0.4, -0.29, PI, 0, 0);
      // Foyer d'argile et wok de liserons d'eau
      b.box('#b5651d', 0.28, 0.14, 0.22, -0.2, 0.11, -0.04).box('#ff922b', 0.1, 0.07, 0.02, -0.2, 0.09, 0.075);
      b.cyl('#343a40', 0.13, 0.07, 0.06, 8, -0.2, 0.21, -0.04).cyl('#74b816', 0.11, 0.11, 0.012, 8, -0.2, 0.238, -0.04);
      person(b, '#7048e8', null, -0.43, 0.04, -0.04, 0.95);
      // Table : piments, curcuma, légumes, mortier de pierre
      b.box('#a67c52', 0.42, 0.03, 0.26, 0.2, 0.19, 0.12);
      for (const [x, z] of [[0.02, 0.02], [0.38, 0.02], [0.02, 0.22], [0.38, 0.22]]) b.box(WOOD, 0.03, 0.16, 0.03, x, 0.1, z);
      b.cone('#e03131', 0.045, 0.05, 6, 0.08, 0.23, 0.06).cone('#fcc419', 0.04, 0.05, 6, 0.2, 0.23, 0.04).ball('#51cf66', 0.045, 0.33, 0.225, 0.05, 1.2, 0.6, 1);
      b.cyl('#6c757d', 0.07, 0.045, 0.045, 8, 0.2, 0.2275, 0.18);
      person(b, '#ffffff', null, 0.46, 0.04, 0.16, 0.9).box('#e03131', 0.09, 0.07, 0.02, 0.46, 0.11, 0.21); // l'apprentie et son tablier
      const spatula = new Builder().box(WOOD, 0.016, 0.22, 0.016, 0.05, 0.09, 0, 0, 0, -0.5).mesh(-0.2, 0.24, -0.04);
      const pestle = new Builder().cyl('#343a40', 0.016, 0.022, 0.12, 6, 0, 0.06, 0).mesh();
      const steam = [puff(0.05), puff(0.05)];
      return {
        parts: [b.mesh(), spatula, pestle, ...steam],
        update(t) {
          spatula.rotation.y = t * 2.6;
          pestle.position.set(0.2, 0.24 + Math.abs(Math.sin(t * 5)) * 0.07, 0.18); // on pile le sambal
          pestle.rotation.z = -0.3;
          steam.forEach((s, i) => rise(s, loop(t, 0.42, i * 0.5), -0.2, 0.26, -0.04, 0.4, 0.07, 1));
        },
      };
    },
  },
];

// ---------- Nord de Lombok (Senaru) : vu du sud, le cône du Rinjani cache Senaru ----------
// La scène est donc décalée vers l'ouest, en chapelet le long de la côte nord-ouest (seule partie du versant nord visible),
// et chaque élément est rehaussé parce que la pente descend vers le nord, à l'opposé de la caméra.
const NORD = [
  {
    name: 'Mosquée de Bayan',
    match: 'Vieille mosquée de Bayan',
    dx: -1.071,
    dz: 0.378,
    size: 0.2,
    height: 0.98,
    lift: 0.55,
    build() {
      const b = new Builder();
      slab(b, '#9ccc65', 0.56, 0.05);
      // Socle de galets
      b.box('#adb5bd', 0.64, 0.1, 0.64, 0, 0.1, -0.04);
      for (let i = -3; i <= 3; i++) {
        b.ball(i % 2 ? '#868e96' : '#dee2e6', 0.045, i * 0.095, 0.1, 0.285, 1, 0.8, 0.6);
        b.ball(i % 2 ? '#dee2e6' : '#868e96', 0.045, 0.325, 0.1, -0.04 + i * 0.095, 0.6, 0.8, 1);
        b.ball(i % 2 ? '#dee2e6' : '#868e96', 0.045, -0.325, 0.1, -0.04 + i * 0.095, 0.6, 0.8, 1);
      }
      b.box('#dee2e6', 0.16, 0.05, 0.08, 0, 0.075, 0.33);
      // Murs bas en bambou tressé, grand toit à deux étages
      b.box('#c9a36b', 0.54, 0.1, 0.54, 0, 0.2, -0.04);
      b.box('#5a4334', 0.1, 0.09, 0.02, 0, 0.195, 0.235);
      b.cyl('#6f6253', 0.2, 0.5, 0.24, 4, 0, 0.37, -0.04, 0, PI / 4, 0);
      b.box('#c9a36b', 0.26, 0.05, 0.26, 0, 0.51, -0.04);
      b.cyl('#857663', 0.02, 0.28, 0.26, 4, 0, 0.66, -0.04, 0, PI / 4, 0);
      b.cyl('#5a4334', 0.012, 0.012, 0.1, 4, 0, 0.83, -0.04);
      // Petites tombes couvertes de chaume
      for (const [x, z] of [[-0.46, 0.2], [0.46, 0.24]]) b.box('#c9a36b', 0.12, 0.07, 0.1, x, 0.085, z).poly(THATCH, [[-0.1, 0], [0.1, 0], [0, 0.09]], 0.14, x, 0.12, z);
      palm(b, 0.44, -0.3, 0.52, 0.12, 0.05);
      const flock = birds('#ffffff', 3, 0.3, 0.8);
      // Un fidèle en blanc, coiffé du songkok
      const man = person(new Builder(), '#ffffff', null, 0, 0, 0, 0.9).cyl('#212529', 0.04, 0.04, 0.04, 7, 0, 0.235, 0).box('#2b8a3e', 0.1, 0.06, 0.1, 0, 0.03, 0).mesh();
      return {
        parts: [b.mesh(), flock, man],
        update(t) {
          flock.position.y = 0.92 + Math.sin(t * 1.7) * 0.04;
          flock.rotation.y = -t * 0.8;
          patrol(man, t, 0.07, 0.3, 0, 0.05, 0.43);
        },
      };
    },
  },
  {
    name: 'Sendang Gile',
    match: 'Cascade de Sendang Gile',
    dx: -0.458,
    dz: -0.127,
    size: 0.2,
    height: 1.3,
    lift: 0.55,
    build() {
      const b = new Builder();
      // L'eau tombe en deux paliers d'une falaise couverte de mousse et de fougères
      b.box('#7f766a', 0.74, 1.35, 0.26, 0, 0.475, -0.36);
      b.box('#8f8578', 0.86, 0.8, 0.26, 0, 0.2, -0.12);
      b.box('#5fae4a', 0.2, 0.3, 0.02, -0.22, 0.85, -0.225).box('#69b34c', 0.18, 0.24, 0.02, 0.24, 0.8, -0.225);
      b.box('#5fae4a', 0.24, 0.3, 0.02, -0.26, 0.35, 0.015).box('#69b34c', 0.2, 0.26, 0.02, 0.28, 0.3, 0.015);
      b.ball('#2f9e44', 0.2, -0.2, 1.17, -0.36, 1.3, 0.6, 1).ball('#40c057', 0.18, 0.22, 1.17, -0.38, 1.3, 0.6, 1);
      b.ball('#37b24d', 0.1, -0.38, 0.63, -0.1, 1.1, 0.7, 1).ball('#40c057', 0.1, 0.38, 0.63, -0.1, 1.1, 0.7, 1);
      b.box(FALL, 0.16, 0.55, 0.04, 0, 0.875, -0.215).box(FALL, 0.16, 0.04, 0.16, 0, 1.15, -0.29);
      b.box('#49c6f2', 0.3, 0.02, 0.2, 0, 0.605, -0.11);
      b.box(FALL, 0.24, 0.57, 0.04, 0, 0.315, 0.025);
      slab(b, MEADOW, 0.54, 0.03, 0, 0.14);
      b.cyl(POOL, 0.26, 0.26, 0.02, 9, 0, 0.045, 0.24);
      // L'escalier de 200 marches qui descend du guichet
      for (let i = 0; i < 7; i++) b.box(i % 2 ? '#dee2e6' : '#ced4da', 0.13, 0.04 + i * 0.07, 0.07, 0.5, (0.04 + i * 0.07) / 2, 0.4 - i * 0.07);
      const water = drops([[0, -0.19, 0.11, 0.66, 3], [0, 0.05, 0.16, 0.08, 3]]);
      const spray = foam(0, 0.08, 0.14, 1.1);
      // On peut se mettre dessous
      const bather = person(new Builder(), '#f06595', null, 0, 0, 0, 0.85).box(SKIN, 0.03, 0.1, 0.03, -0.06, 0.2, 0, 0, 0, 0.5).box(SKIN, 0.03, 0.1, 0.03, 0.06, 0.2, 0, 0, 0, -0.5).mesh();
      return {
        parts: [b.mesh(), water, spray, bather],
        update(t) {
          fallDown(water, t);
          churn(spray, t);
          bather.position.set(0.02, 0.0 + Math.abs(Math.sin(t * 4)) * 0.03, 0.2);
          bather.rotation.y = Math.sin(t * 1.3) * 0.5;
        },
      };
    },
  },
  {
    name: 'Hameau de Senaru',
    match: 'Hameau traditionnel de Senaru',
    dx: -0.662,
    dz: -0.013,
    size: 0.2,
    height: 0.72,
    lift: 0.55,
    build() {
      const b = new Builder();
      slab(b, EARTH, 0.58);
      sasakHouse(b, -0.26, -0.22, 0.36, '#b08d57', true);
      sasakHouse(b, 0.26, -0.24, 0.32, '#9c8a5b', false);
      sasakHouse(b, 0.3, 0.2, 0.3, '#b9924a', true);
      // Berugak : la plateforme couverte où l'on reçoit
      b.box('#a67c52', 0.28, 0.04, 0.2, -0.26, 0.13, 0.24);
      for (const x of [-0.38, -0.14]) for (const z of [0.16, 0.32]) b.cyl(WOOD, 0.014, 0.014, 0.32, 4, x, 0.2, z);
      b.poly(THATCH, [[-0.2, 0], [0.2, 0], [0, 0.12]], 0.26, -0.26, 0.36, 0.24);
      // Clôture de bambou et bananier
      for (let i = -4; i <= 4; i++) b.cyl('#b8975a', 0.01, 0.01, 0.12, 4, i * 0.1, 0.1, -0.5);
      b.box('#b8975a', 0.84, 0.012, 0.012, 0, 0.13, -0.5);
      b.cyl('#94d82d', 0.02, 0.025, 0.2, 5, 0.02, 0.14, -0.4);
      for (let i = 0; i < 4; i++) b.box('#51cf66', 0.2, 0.012, 0.07, 0.02 + Math.cos(i * 1.6) * 0.08, 0.25, -0.4 + Math.sin(i * 1.6) * 0.08, 0, -i * 1.6, -0.5);
      const smoke = [puff(0.05), puff(0.05)];
      // Une habitante porte sa récolte sur la tête, une poule picore
      const woman = person(new Builder(), '#e64980', null, 0, 0, 0, 0.9).ball('#74b816', 0.055, 0, 0.27, 0, 1.3, 0.7, 1).mesh();
      const hen = new Builder().ball('#8d5a2b', 0.04, 0, 0.045, 0, 1.2, 1, 0.9).ball('#8d5a2b', 0.024, 0.045, 0.085, 0).box('#e03131', 0.02, 0.02, 0.01, 0.045, 0.11, 0).box('#ffa94d', 0.025, 0.012, 0.012, 0.075, 0.082, 0).mesh();
      return {
        parts: [b.mesh(), ...smoke, woman, hen],
        update(t) {
          smoke.forEach((s, i) => rise(s, loop(t, 0.3, i * 0.5), -0.26, 0.38, -0.22, 0.4, 0.12, 1.1));
          patrol(woman, t, 0.08, 0.2, 0.0, 0.04, 0.02);
          hen.position.set(0.02 + Math.sin(t * 0.5) * 0.08, 0.04, 0.36);
          hen.rotation.z = -Math.max(0, Math.sin(t * 7)) * 0.7;
        },
      };
    },
  },
  {
    name: 'Tiu Kelep',
    match: 'Cascade de Tiu Kelep',
    dx: -0.253,
    dz: -0.195,
    size: 0.2,
    height: 1.45,
    lift: 0.55,
    build() {
      const b = new Builder();
      // Un mur d'eau de 45 m dans un cirque de roche, et des filets qui sortent de la végétation
      b.box('#756c61', 0.8, 1.55, 0.26, 0, 0.525, -0.34);
      b.box('#857a6d', 0.34, 1.25, 0.3, -0.5, 0.375, -0.2, 0, 0.5, 0);
      b.box('#857a6d', 0.34, 1.15, 0.3, 0.5, 0.325, -0.2, 0, -0.5, 0);
      for (const [x, y, z] of [[-0.24, 1.32, -0.34], [0.24, 1.32, -0.36], [-0.52, 1.02, -0.2], [0.52, 0.92, -0.2]]) b.ball(x > 0 ? '#40c057' : '#2f9e44', 0.2, x, y, z, 1.2, 0.6, 1);
      b.box(FALL, 0.3, 1.25, 0.05, 0, 0.675, -0.19).box(FALL, 0.3, 0.04, 0.16, 0, 1.3, -0.27);
      for (const x of [-0.28, 0.28]) b.ball('#37b24d', 0.09, x, 0.86, -0.19, 1.2, 0.8, 0.6).box(FALL, 0.06, 0.8, 0.03, x, 0.44, -0.185);
      slab(b, MEADOW, 0.58, 0.03, 0, 0.16);
      b.cyl(POOL, 0.4, 0.4, 0.02, 10, 0, 0.045, 0.08);
      // La rivière qu'on traverse à gué
      b.box('#49c6f2', 1.0, 0.02, 0.14, 0, 0.042, 0.46);
      for (let i = -2; i <= 2; i++) b.ball('#adb5bd', 0.04, i * 0.17, 0.06, 0.46, 1.2, 0.5, 1);
      const water = drops([[0, -0.155, 0.22, 0.1, 6], [-0.28, -0.165, 0.06, 0.12, 3], [0.28, -0.165, 0.06, 0.23, 3]]);
      const mist = [puff(0.09), puff(0.09)];
      const hiker = person(new Builder(), '#ffd43b', null, 0, 0, 0, 0.85).box('#1c7ed6', 0.05, 0.08, 0.04, -0.045, 0.1, 0).mesh();
      return {
        parts: [b.mesh(), water, ...mist, hiker],
        update(t) {
          fallDown(water, t, 0.7);
          mist.forEach((p, i) => rise(p, loop(t, 0.28, i * 0.5), -0.1 + i * 0.2, 0.1, 0.0, 0.4, i ? 0.16 : -0.16, 1.3));
          patrol(hiker, t, 0.06, 0.4, 0, 0.07, 0.46);
        },
      };
    },
  },
  {
    name: 'Panorama Walk',
    match: 'Senaru Panorama Walk',
    dx: -0.867,
    dz: 0.178,
    size: 0.2,
    height: 1.12,
    lift: 0.55,
    build() {
      const b = new Builder();
      slab(b, '#8fd36a', 0.56);
      // Petites rizières en terrasses
      for (let i = 0; i < 3; i++) {
        const y = 0.24 - i * 0.07;
        b.box('#a67c52', 0.52, y + 0.3, 0.16, 0.26, (y - 0.3) / 2, -0.4 + i * 0.15);
        b.box(['#51cf66', '#8ce99a', '#69db7c'][i], 0.48, 0.02, 0.12, 0.26, y + 0.01, -0.4 + i * 0.15);
      }
      // Canal d'irrigation maçonné : on marche sur son rebord
      b.box('#ced4da', 1.1, 0.1, 0.2, 0, 0.07, 0.28);
      b.box('#49c6f2', 1.1, 0.02, 0.09, 0, 0.115, 0.25);
      // Jardin : bananier, caféier chargé de cerises
      b.cyl('#94d82d', 0.02, 0.025, 0.2, 5, 0.44, 0.14, 0.06);
      for (let i = 0; i < 4; i++) b.box('#51cf66', 0.2, 0.012, 0.07, 0.44 + Math.cos(i * 1.6) * 0.08, 0.25, 0.06 + Math.sin(i * 1.6) * 0.08, 0, -i * 1.6, -0.5);
      b.ball('#2b8a3e', 0.08, 0.12, 0.12, 0.04, 1, 1.1, 1).ball('#e03131', 0.018, 0.16, 0.16, 0.1).ball('#e03131', 0.018, 0.08, 0.1, 0.11).ball('#e03131', 0.018, 0.14, 0.08, 0.1);
      // Bosquet de bambous
      const g = new Builder();
      for (const [x, z, h, lean] of [[-0.1, 0, 0.9, -0.12], [0, 0.04, 1.0, 0.02], [0.08, -0.03, 0.85, 0.16], [-0.04, -0.08, 0.95, -0.04], [0.07, 0.07, 0.75, 0.1]]) {
        g.cyl('#94d82d', 0.014, 0.02, h, 5, x + (Math.sin(lean) * h) / 2, (Math.cos(lean) * h) / 2, z, 0, 0, -lean);
        const tx = x + Math.sin(lean) * h;
        const ty = Math.cos(lean) * h;
        g.ball('#5c940d', 0.09, tx, ty, z, 1.3, 0.5, 1).ball('#74b816', 0.07, tx - 0.05, ty - 0.16, z + 0.03, 1.4, 0.4, 1).ball('#74b816', 0.06, tx + 0.05, ty - 0.3, z - 0.02, 1.4, 0.4, 1);
      }
      const grove = g.mesh(-0.32, 0.04, -0.2);
      // La guide du village et deux marcheurs
      const file = walkers([['#e64980', '#f2d16b', null], ['#339af0', null, '#1d2b53'], ['#ffd43b', null, '#e8590c']], 0.85);
      const r = new Builder();
      for (let i = -2; i <= 2; i++) r.box('#ffffff', 0.07, 0.012, 0.02, i * 0.25, 0, (i % 2) * 0.02);
      const ripples = r.mesh();
      return {
        parts: [b.mesh(), grove, file, ripples],
        update(t) {
          grove.rotation.z = Math.sin(t * 1.2) * 0.06;
          grove.rotation.x = Math.cos(t * 0.9) * 0.04;
          patrol(file, t, 0.06, 0.3, 0, 0.12, 0.34);
          ripples.position.set(-0.125 + loop(t, 0.5) * 0.25, 0.13, 0.25);
        },
      };
    },
  },
];

// ---------- Îles Gili : repère en mer au nord des trois îlots ; tout est posé sur l'eau, avec son bout de sable ----------
const GILI = [
  {
    name: 'Tortues',
    match: 'Snorkeling avec les tortues',
    dx: -0.32,
    dz: -0.18,
    size: 0.2,
    height: 0.45,
    lift: 0.42,
    build() {
      const b = new Builder();
      // Herbier où broutent les tortues, quelques coraux
      b.cyl('#7fe3ea', 0.5, 0.5, 0.02, 12, 0, 0.02, 0);
      for (const [x, z, r] of [[-0.12, -0.1, 0.13], [0.14, 0.06, 0.12], [-0.05, 0.2, 0.1], [0.2, -0.2, 0.09]]) b.ball('#2f9e7a', r, x, 0.03, z, 1.3, 0.16, 1);
      b.ball('#ff8fab', 0.06, -0.38, 0.04, 0.16, 1, 0.6, 1).ball('#ffa94d', 0.05, 0.4, 0.04, 0.1, 1, 0.6, 1).ball('#b197fc', 0.05, 0.0, 0.04, -0.42, 1, 0.6, 1);
      const body = new Builder();
      body.ball('#2f9e44', 0.17, 0, 0.03, 0, 1.25, 0.5, 1, 1).ball('#237a36', 0.1, -0.01, 0.085, 0, 1.3, 0.4, 1);
      body.ball('#9be08f', 0.07, 0.25, 0.02, 0, 1.2, 0.8, 0.9).ball('#1d2b53', 0.014, 0.29, 0.045, 0.04).ball('#1d2b53', 0.014, 0.29, 0.045, -0.04);
      body.box('#9be08f', 0.1, 0.02, 0.07, -0.19, 0.01, 0.1, 0, 0.7, 0).box('#9be08f', 0.1, 0.02, 0.07, -0.19, 0.01, -0.1, 0, -0.7, 0);
      const turtle = body.mesh();
      const flipper = (side) => new Builder().poly('#9be08f', [[0, -0.05], [0.07, -0.02], [0.03, 0.24], [-0.03, 0.2]], 0.025, 0, 0, 0, (PI / 2) * side, 0, 0).mesh(0.1, 0.02, 0.13 * side);
      const left = flipper(1);
      const right = flipper(-1);
      turtle.add(left, right);
      turtle.scale.setScalar(0.95);
      const swimmer = snorkeler('#ff7b1c');
      swimmer.scale.setScalar(0.85);
      return {
        parts: [b.mesh(), turtle, swimmer],
        update(t) {
          // Le nageur suit la tortue à distance, sans la toucher
          const a = t * 0.45;
          turtle.position.set(Math.cos(a) * 0.24, 0.09 + Math.sin(t * 1.6) * 0.015, Math.sin(a) * 0.22);
          turtle.rotation.y = -a - PI / 2;
          const flap = Math.sin(t * 3.2) * 0.5;
          left.rotation.set(flap, -0.3 + flap * 0.5, 0);
          right.rotation.set(-flap, 0.3 - flap * 0.5, 0);
          const s = a - 1.9;
          swimmer.position.set(Math.cos(s) * 0.26, 0.08 + Math.sin(t * 2.2) * 0.012, Math.sin(s) * 0.24);
          swimmer.rotation.set(0, -s - PI / 2, Math.sin(t * 2.2) * 0.06);
        },
      };
    },
  },
  {
    name: 'Statues de Meno',
    match: 'Tour des trois îles en bateau',
    dx: 0.08,
    dz: -0.2,
    size: 0.22,
    height: 0.55,
    lift: 0.42,
    build() {
      const b = new Builder();
      // Le cercle de statues immergées (48 en vrai), sur son fond de sable clair
      b.cyl('#b5f2e6', 0.4, 0.4, 0.02, 12, -0.14, 0.02, 0.0);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * PI * 2;
        const x = -0.14 + Math.cos(a) * 0.25;
        const z = Math.sin(a) * 0.23;
        const c = i % 3 ? '#7fa8a4' : '#96bdb0';
        b.cyl(c, 0.035, 0.05, 0.14, 6, x, 0.09, z).ball(c, 0.04, x, 0.19, z);
        if (i % 3 === 0) b.ball(i % 2 ? '#ff8fab' : '#ffa94d', 0.022, x + 0.03, 0.13, z + 0.03); // le corail s'y installe
      }
      for (let i = 0; i < 5; i++) b.ball('#8bb3ab', 0.045, -0.14 + Math.cos(i * 1.26) * 0.1, 0.04, Math.sin(i * 1.26) * 0.09, 1.6, 0.5, 0.8); // gisants au centre
      // Le bateau à fond de verre de la sortie classique
      const s = new Builder();
      s.poly('#ffffff', [[-0.26, 0.09], [0.3, 0.11], [0.22, 0], [-0.2, 0]], 0.16);
      s.poly('#1c7ed6', [[-0.26, 0.09], [0.3, 0.11], [0.29, 0.08], [-0.25, 0.06]], 0.164);
      for (const x of [-0.16, 0.14]) for (const z of [-0.065, 0.065]) s.cyl('#ffffff', 0.008, 0.008, 0.2, 4, x, 0.19, z);
      s.box('#ffd43b', 0.42, 0.02, 0.19, -0.01, 0.295, 0);
      person(s, '#e03131', null, 0.02, 0.08, 0, 0.62);
      person(s, '#2f9e44', null, -0.1, 0.08, 0.02, 0.62);
      const boat = s.mesh();
      boat.scale.setScalar(0.85);
      const swimmer = snorkeler('#f06595');
      swimmer.scale.setScalar(0.62);
      const bubbles = [puff(0.03), puff(0.03)];
      return {
        parts: [b.mesh(), boat, swimmer, ...bubbles],
        update(t) {
          boat.position.set(0.3, 0.03 + Math.sin(t * 1.9) * 0.012, 0.22);
          boat.rotation.set(Math.sin(t * 1.1) * 0.08, 0, Math.sin(t * 1.5) * 0.07);
          const a = t * 0.5;
          swimmer.position.set(-0.14 + Math.cos(a) * 0.12, 0.3 + Math.sin(t * 2.2) * 0.01, Math.sin(a) * 0.11);
          swimmer.rotation.y = -a - PI / 2;
          bubbles.forEach((p, i) => rise(p, loop(t, 0.5, i * 0.5), -0.2 + i * 0.14, 0.06, 0.04, 0.2, 0.02, 1));
        },
      };
    },
  },
  {
    name: 'Lever de soleil',
    match: 'Lever de soleil sur le Rinjani',
    dx: 0.42,
    dz: -0.02,
    size: 0.22,
    height: 1.2,
    lift: 0.42,
    build() {
      const b = new Builder();
      // Le Rinjani et les montagnes de Lombok à contre-jour, reflet doré sur l'eau
      b.poly('#6b8fb3', [[-0.55, 0], [0.55, 0], [0.4, 0.1], [0.22, 0.14], [0.12, 0.3], [0.04, 0.26], [-0.04, 0.31], [-0.2, 0.12], [-0.4, 0.08]], 0.03, 0, 0, -0.42);
      b.cyl('#ffe9a8', 0.42, 0.42, 0.02, 12, 0, 0.02, 0.1);
      b.cyl('#fff6d6', 0.18, 0.18, 0.02, 10, 0.04, 0.025, -0.12);
      // À cette heure-là, il n'y a que les pêcheurs
      const j = jukung('#1c7ed6', null);
      person(j, '#e8590c', '#f2d16b', -0.04, 0.08, 0, 0.85);
      j.box(WOOD, 0.012, 0.36, 0.012, 0.12, 0.3, 0, 0, 0, -0.9).box('#ffffff', 0.006, 0.2, 0.006, 0.27, 0.3, 0);
      const boat = j.mesh();
      boat.scale.setScalar(0.9);
      const fish = new Builder().octa('#ff922b', 0.05, 0, 0.14, 0, 1.6, 0.9, 0.5).poly('#ff922b', [[0, 0], [-0.07, 0.05], [-0.05, 0], [-0.07, -0.05]], 0.02, -0.07, 0.14, 0).mesh(0.3, 0.02, 0.34);
      const disc = sun('#ffd43b', '#fff3bf', 0.16);
      return {
        parts: [b.mesh(), boat, fish, disc],
        update(t) {
          boat.position.set(-0.08, 0.03 + Math.sin(t * 2) * 0.012, 0.16);
          boat.rotation.set(Math.sin(t * 1.2) * 0.1, 0, Math.sin(t * 1.6) * 0.07);
          // Un poisson saute hors de l'eau
          const k = loop(t, 0.3) * 2;
          fish.visible = k < 1;
          if (k < 1) fish.rotation.z = PI / 2 - k * PI;
          // Le soleil sort de derrière les montagnes
          const u = loop(t, 0.07);
          disc.position.set(0.08, u * 0.56, -0.47);
          disc.scale.setScalar(fade(u));
        },
      };
    },
  },
  {
    name: 'Coucher de soleil',
    match: 'Coucher de soleil côté ouest',
    dx: -0.56,
    dz: 0.12,
    size: 0.22,
    height: 1.15,
    lift: 0.42,
    build() {
      const b = new Builder();
      b.cyl('#7fe3ea', 0.46, 0.46, 0.02, 12, 0, 0.02, 0.12);
      // Le cône de l'Agung, à Bali, sur l'horizon
      b.cone('#7a5ea8', 0.26, 0.32, 6, -0.02, 0.16, -0.46).cone('#6a4f98', 0.15, 0.15, 5, 0.27, 0.075, -0.46);
      // La balançoire plantée dans l'eau
      for (const x of [-0.17, 0.17]) b.cyl(WOOD, 0.02, 0.026, 0.46, 5, x, 0.22, 0.22, 0, 0, x > 0 ? 0.08 : -0.08);
      b.box(WOOD, 0.46, 0.03, 0.03, 0, 0.45, 0.22);
      // Bout de plage d'un bar : poufs, table basse
      slab(b, SAND, 0.2, 0.05, 0.42, 0.38, 8);
      b.ball('#e03131', 0.06, 0.36, 0.09, 0.34, 1.1, 0.7, 1.1).ball('#ff922b', 0.06, 0.48, 0.09, 0.4, 1.1, 0.7, 1.1);
      b.cyl('#a67c52', 0.04, 0.04, 0.05, 6, 0.4, 0.075, 0.48);
      person(b, '#339af0', null, 0.36, 0.11, 0.34, 0.7);
      const s = new Builder();
      for (const x of [-0.07, 0.07]) s.box('#f1e3c4', 0.012, 0.28, 0.012, x, -0.14, 0);
      s.box(WOOD, 0.18, 0.02, 0.07, 0, -0.28, 0);
      person(s, '#f06595', null, 0, -0.27, 0, 0.8);
      const swing = s.mesh(0, 0.44, 0.22);
      const disc = sun('#ff6b1a', '#ffb347', 0.16);
      const flock = birds('#3d3a52', 2, 0.07, 0.8);
      return {
        parts: [b.mesh(), swing, disc, flock],
        update(t) {
          swing.rotation.x = Math.sin(t * 1.9) * 0.55;
          // Le soleil descend derrière le volcan
          const k = loop(t, 0.07);
          disc.position.set(0.0, 0.44 - k * 0.8, -0.58);
          disc.scale.setScalar(fade(k));
          const f = loop(t, 0.11, 0.4);
          flock.position.set(0.5 - f, 0.5 + Math.sin(t * 2) * 0.03, -0.2);
          flock.rotation.y = PI / 2;
          flock.scale.setScalar(fade(f));
        },
      };
    },
  },
  {
    name: 'Vélo et cidomo',
    match: "Tour de l'île à vélo",
    dx: -0.58,
    dz: 0.52,
    size: 0.22,
    height: 0.72,
    lift: 0.42,
    build() {
      const b = new Builder();
      // Une île de sable sans voiture : piste qui en fait le tour, cocotiers, bungalow
      slab(b, SAND, 0.54, 0.05, 0, 0, 12);
      b.cyl('#8fd36a', 0.25, 0.27, 0.03, 10, 0, 0.065, 0);
      palm(b, -0.1, -0.08, 0.5, 0.18, 0.07);
      palm(b, 0.12, -0.02, 0.4, -0.2, 0.07);
      b.box('#fff3d6', 0.14, 0.09, 0.12, 0, 0.125, 0.12).pyr(THATCH, 0.13, 0.12, 0, 0.23, 0.12);
      // Cidomo : la carriole à cheval, seul « taxi » des îles
      const c = new Builder();
      c.ball('#8d5524', 0.075, 0.2, 0.17, 0, 1.6, 0.9, 0.8);
      c.box('#8d5524', 0.05, 0.12, 0.05, 0.31, 0.24, 0, 0, 0, -0.6).box('#8d5524', 0.1, 0.05, 0.05, 0.37, 0.29, 0, 0, 0, -0.4);
      c.box('#3b2412', 0.025, 0.1, 0.02, 0.28, 0.27, 0, 0, 0, -0.6).ball('#e03131', 0.022, 0.36, 0.34, 0);
      for (const [x, z] of [[0.28, 0.035], [0.28, -0.035], [0.12, 0.035], [0.12, -0.035]]) c.box('#7a4a1f', 0.025, 0.12, 0.025, x, 0.06, z);
      c.box('#3b2412', 0.02, 0.1, 0.02, 0.08, 0.13, 0, 0, 0, -0.4);
      for (const z of [0.07, -0.07]) c.box(WOOD, 0.3, 0.012, 0.012, 0.06, 0.15, z);
      for (const z of [0.1, -0.1]) c.cyl('#343a40', 0.085, 0.085, 0.02, 10, -0.16, 0.085, z, PI / 2, 0, 0);
      c.box('#1c7ed6', 0.24, 0.07, 0.17, -0.16, 0.16, 0);
      for (const x of [-0.26, -0.06]) for (const z of [0.075, -0.075]) c.cyl('#ffffff', 0.008, 0.008, 0.2, 4, x, 0.29, z);
      c.box('#e03131', 0.3, 0.03, 0.22, -0.16, 0.385, 0).box('#ffd43b', 0.26, 0.03, 0.18, -0.16, 0.405, 0);
      person(c, '#2f9e44', null, -0.08, 0.19, 0, 0.6);
      person(c, '#f06595', null, -0.22, 0.19, 0, 0.6);
      const cidomo = c.mesh();
      cidomo.scale.setScalar(0.78);
      const riders = [bike('#ff5fa2'), bike('#4dabf7')];
      return {
        parts: [b.mesh(), cidomo, ...riders],
        update(t) {
          const a = t * 0.5;
          cidomo.position.set(Math.cos(a) * 0.4, 0.05 + Math.abs(Math.sin(t * 9)) * 0.012, Math.sin(a) * 0.4);
          cidomo.rotation.y = -a - PI / 2;
          riders.forEach((r, i) => {
            const q = a + 2.3 + i * 1.7;
            r.position.set(Math.cos(q) * 0.4, 0.05, Math.sin(q) * 0.4);
            r.rotation.y = -q - PI / 2;
          });
        },
      };
    },
  },
  {
    name: 'Marché de nuit',
    match: 'Marché de nuit de Trawangan',
    dx: -0.3,
    dz: 0.66,
    size: 0.2,
    height: 1.05,
    lift: 0.42,
    build() {
      const b = new Builder();
      slab(b, SAND, 0.54, 0.05, 0, 0, 12);
      // Étal : poissons et fruits de mer sur la glace, auvent rayé
      b.box('#a67c52', 0.6, 0.16, 0.22, -0.1, 0.13, -0.18);
      b.box('#e7f5ff', 0.56, 0.03, 0.2, -0.1, 0.225, -0.18);
      ['#ff6b6b', '#74c0fc', '#ffa94d', '#74c0fc', '#ff6b6b'].forEach((c, i) => b.octa(c, 0.04, -0.32 + i * 0.11, 0.255, -0.18 + (i % 2) * 0.04, 1.5, 0.5, 0.7, 0.3));
      for (const x of [-0.42, 0.22]) b.cyl('#868e96', 0.012, 0.012, 0.56, 4, x, 0.33, -0.32);
      for (let i = 0; i < 6; i++) b.box(i % 2 ? '#ffffff' : '#1c7ed6', 0.115, 0.02, 0.3, -0.39 + i * 0.115, 0.6, -0.24, 0.25, 0, 0);
      person(b, '#7048e8', null, -0.1, 0.05, -0.36, 0.9);
      // Barbecue : on choisit son poisson, il part sur les braises
      b.box('#495057', 0.26, 0.12, 0.16, 0.36, 0.11, -0.08).box('#ff6b35', 0.22, 0.015, 0.12, 0.36, 0.175, -0.08);
      b.octa('#c97b3d', 0.05, 0.36, 0.2, -0.08, 1.6, 0.4, 0.7);
      person(b, '#e8590c', null, 0.36, 0.05, -0.24, 0.9);
      // Grande table commune
      b.box('#a67c52', 0.5, 0.025, 0.16, -0.06, 0.17, 0.26);
      for (const x of [-0.26, 0.14]) b.box(WOOD, 0.03, 0.12, 0.12, x, 0.11, 0.26);
      [['#339af0', -0.22], ['#f06595', -0.06], ['#ffd43b', 0.1]].forEach(([c, x]) => {
        person(b, c, null, x, 0.06, 0.13, 0.75);
        b.cyl('#ffffff', 0.035, 0.035, 0.01, 7, x, 0.19, 0.25);
      });
      for (const x of [-0.48, 0.48]) b.cyl(WOOD, 0.014, 0.014, 0.5, 4, x, 0.3, 0.4);
      const g = new Builder();
      for (let i = -4; i <= 4; i++) g.ball(i % 2 ? '#ffd43b' : '#ff922b', 0.032, i * 0.11, -0.03 - (1 - (i * i) / 16) * 0.07, 0);
      const garland = g.mesh(0, 0.55, 0.4);
      const smoke = [puff(0.05), puff(0.05)];
      const moon = new Builder().poly('#ffe066', crescent(0.13), 0.03).octa('#ffe066', 0.03, -0.2, 0.12, 0, 1, 1, 0.5).mesh();
      return {
        parts: [b.mesh(), garland, ...smoke, moon],
        update(t) {
          garland.rotation.x = Math.sin(t * 1.6) * 0.3;
          smoke.forEach((s, i) => rise(s, loop(t, 0.4, i * 0.5), 0.36, 0.2, -0.08, 0.45, 0.1, 1));
          moon.position.set(0.3, 0.8 + Math.sin(t * 1.2) * 0.02, -0.42);
          moon.rotation.set(-0.7, Math.sin(t * 0.8) * 0.3, -0.4);
        },
      };
    },
  },
];

export default {
  'sud-de-lombok': { scale: 0.22, items: withLift(SUD) },
  tetebatu: { scale: 0.25, items: withLift(TETEBATU) },
  'nord-de-lombok': { scale: 0.22, items: withLift(NORD) },
  'gili-air-meno-trawangan': { scale: 0.25, items: withLift(GILI) },
};
