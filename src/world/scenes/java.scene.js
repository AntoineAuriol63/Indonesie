// Scènes détaillées de Java (hors Jakarta) : Bandung, Yogyakarta, Dieng, Bromo et Malang, Tumpak Sewu, Surabaya.
import { Group } from 'three';
import { Builder, PI, flag, person, puff, rise } from './kit.js';

// ---------- Briques propres à ce fichier ----------

// Surélève un élément de « lift » unités sur un soubassement (largeur w, profondeur d, centré en z) : sur un terrain
// qui monte vers la caméra ou vers un côté, le devant du modèle s'enterrerait sinon.
function raised(lift, color, w, d, z, { parts, update }) {
  const base = new Builder().box(color, w, lift * 3, d, 0, -lift * 1.5, z).mesh();
  const group = new Group();
  group.add(base, ...parts);
  group.position.y = lift;
  return { parts: [group], update };
}

// Vieille jeep décapotable, origine au sol, tournée vers +x.
function jeepMesh(color) {
  const j = new Builder();
  j.box(color, 0.34, 0.1, 0.19, 0, 0.11, 0);
  j.box(color, 0.13, 0.03, 0.19, 0.11, 0.17, 0);
  j.box('#a5d8ff', 0.014, 0.08, 0.16, 0.045, 0.21, 0, 0, 0, -0.2);
  j.box('#ffffff', 0.17, 0.02, 0.2, -0.085, 0.27, 0);
  j.box('#1d2b53', 0.02, 0.1, 0.02, -0.16, 0.21, 0.085).box('#1d2b53', 0.02, 0.1, 0.02, -0.16, 0.21, -0.085);
  j.box('#ffd23f', 0.02, 0.03, 0.04, 0.175, 0.12, 0.06).box('#ffd23f', 0.02, 0.03, 0.04, 0.175, 0.12, -0.06);
  for (const [x, z] of [[0.11, 0.1], [-0.11, 0.1], [0.11, -0.1], [-0.11, -0.1]]) j.cyl('#1d1d1d', 0.06, 0.06, 0.05, 8, x, 0.06, z, PI / 2);
  j.cyl('#1d1d1d', 0.055, 0.055, 0.04, 8, -0.19, 0.14, 0, 0, 0, PI / 2);
  person(j, '#ffd43b', null, -0.06, 0.14, 0, 0.6);
  return j.mesh();
}

// Cheval vu de profil ajouté au Builder, origine aux sabots, tourné vers +x.
function horse(b, coat, x = 0, y = 0, z = 0, s = 1) {
  b.ball(coat, 0.15 * s, x, y + 0.35 * s, z, 1.75, 0.95, 0.9);
  b.box(coat, 0.12 * s, 0.22 * s, 0.11 * s, x + 0.22 * s, y + 0.47 * s, z, 0, 0, -0.75);
  b.box(coat, 0.2 * s, 0.1 * s, 0.1 * s, x + 0.35 * s, y + 0.54 * s, z, 0, 0, -0.55);
  b.box('#3b2412', 0.05 * s, 0.22 * s, 0.04 * s, x + 0.17 * s, y + 0.52 * s, z, 0, 0, -0.75);
  b.box('#3b2412', 0.05 * s, 0.22 * s, 0.05 * s, x - 0.28 * s, y + 0.32 * s, z, 0, 0, -0.35);
  for (const [lx, lz] of [[0.15, 0.06], [0.15, -0.06], [-0.17, 0.06], [-0.17, -0.06]]) b.box('#3b2412', 0.045 * s, 0.28 * s, 0.045 * s, x + lx * s, y + 0.14 * s, z + lz * s);
  return b;
}

// Becak, le cyclo-pousse javanais : le passager devant sous la capote, le conducteur qui pédale derrière. Tourné vers +x.
function becakMesh(body, hood) {
  const k = new Builder();
  k.box(body, 0.16, 0.1, 0.16, 0.08, 0.1, 0);
  k.box(hood, 0.17, 0.02, 0.18, 0.07, 0.25, 0);
  k.box(hood, 0.02, 0.12, 0.18, -0.01, 0.19, 0);
  k.cyl('#343a40', 0.055, 0.055, 0.016, 8, 0.1, 0.055, 0.09, PI / 2).cyl('#343a40', 0.055, 0.055, 0.016, 8, 0.1, 0.055, -0.09, PI / 2);
  k.cyl('#343a40', 0.055, 0.055, 0.016, 8, -0.16, 0.055, 0, PI / 2);
  k.box('#1c7ed6', 0.14, 0.02, 0.02, -0.08, 0.1, 0);
  person(k, '#4dabf7', null, 0.09, 0.11, 0, 0.55);
  person(k, '#f8f9fa', '#c49a4a', -0.12, 0.1, 0, 0.7);
  return k.mesh();
}

// Place un mesh sur le périmètre d'un carré de demi-côté r (u dans [0, 1[), tourné dans le sens de la marche.
function onSquare(mesh, u, r, y) {
  const k = (u % 1) * 4;
  const side = Math.floor(k);
  const f = (k - side) * 2 - 1;
  if (side === 0) mesh.position.set(f * r, y, r);
  else if (side === 1) mesh.position.set(r, y, -f * r);
  else if (side === 2) mesh.position.set(-f * r, y, -r);
  else mesh.position.set(-r, y, f * r);
  mesh.rotation.y = (side * PI) / 2;
}

// Petite voiture, tournée vers +x.
function carMesh(color) {
  const c = new Builder();
  c.box(color, 0.3, 0.08, 0.15, 0, 0.09, 0);
  c.box(color, 0.17, 0.07, 0.14, -0.02, 0.165, 0);
  c.box('#a5d8ff', 0.12, 0.045, 0.145, -0.02, 0.165, 0).box('#a5d8ff', 0.175, 0.045, 0.11, -0.02, 0.165, 0);
  c.box('#fff3bf', 0.01, 0.03, 0.11, 0.151, 0.1, 0);
  for (const [x, z] of [[0.09, 0.075], [-0.09, 0.075], [0.09, -0.075], [-0.09, -0.075]]) c.cyl('#1d1d1d', 0.04, 0.04, 0.03, 8, x, 0.04, z, PI / 2);
  return c.mesh();
}

// Palmier : ajoute le tronc au Builder et renvoie le bouquet de palmes, mesh mobile à balancer.
function palmTree(b, x, z, h) {
  b.cyl('#a8763e', 0.02, 0.032, h, 5, x, h / 2, z);
  const l = new Builder();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    l.box(i % 2 ? '#2f9e44' : '#40c057', 0.24, 0.02, 0.08, Math.cos(a) * 0.11, -0.03, Math.sin(a) * 0.11, 0, -a, -0.45);
  }
  return l.mesh(x, h + 0.03, z);
}

// Arbre mort : tronc noirci et deux branches.
function deadTree(b, x, y, z, h) {
  b.cyl('#3b3632', 0.008, 0.016, h, 4, x, y + h / 2, z);
  b.box('#3b3632', h * 0.45, 0.012, 0.012, x + h * 0.14, y + h * 0.72, z, 0, 0, 0.7);
  b.box('#3b3632', h * 0.35, 0.012, 0.012, x - h * 0.1, y + h * 0.55, z, 0, 0, -0.8);
}

// Tour pointue de temple hindou javanais (Prambanan, Dieng) : socle, corps, toit en gradins, fleuron.
function spire(b, x, z, s, tiers = 5, tones = ['#8a8378', '#9c958a', '#77716a']) {
  b.box(tones[2], 0.34 * s, 0.07 * s, 0.34 * s, x, 0.035 * s, z);
  b.box(tones[0], 0.27 * s, 0.07 * s, 0.27 * s, x, 0.105 * s, z);
  b.box(tones[1], 0.21 * s, 0.24 * s, 0.21 * s, x, 0.26 * s, z);
  b.box('#33302c', 0.07 * s, 0.13 * s, 0.02 * s, x, 0.215 * s, z + 0.105 * s);
  b.box(tones[2], 0.26 * s, 0.04 * s, 0.26 * s, x, 0.4 * s, z);
  let y = 0.42 * s;
  for (let i = 0; i < tiers; i++) {
    const w = (0.22 - (i * 0.15) / tiers) * s;
    const h = 0.085 * s;
    b.box(i % 2 ? tones[0] : tones[1], w, h, w, x, y + h / 2, z);
    y += h;
  }
  b.cyl(tones[1], 0.012 * s, 0.045 * s, 0.1 * s, 6, x, y + 0.05 * s, z);
  return y + 0.1 * s;
}

// ---------- Bandung et Rancabali : le cratère et le thé au sud, la ville Art déco au nord-est ----------

const BANDUNG = [
  {
    name: 'Gedung Sate',
    match: 'Gedung Sate',
    dx: 0.46,
    dz: -0.8,
    size: 0.22,
    height: 1.12,
    build() {
      const b = new Builder();
      b.box('#9ad17a', 0.9, 0.02, 0.34, 0, 0.01, 0.2);
      // Longues ailes blanches à arcades, corps central coiffé de trois toits étagés
      b.box('#fdfdf7', 1.2, 0.2, 0.26, 0, 0.1, -0.2);
      b.box('#6c757d', 1.24, 0.04, 0.3, 0, 0.22, -0.2);
      for (let i = -5; i <= 5; i++) if (Math.abs(i) > 1) b.box('#3d5a80', 0.05, 0.1, 0.02, i * 0.1, 0.09, -0.065);
      b.box('#fdfdf7', 0.36, 0.34, 0.36, 0, 0.17, -0.16);
      b.box('#3d5a80', 0.09, 0.15, 0.02, 0, 0.1, 0.025);
      b.cyl('#6c757d', 0.16, 0.32, 0.08, 4, 0, 0.38, -0.16, 0, PI / 4, 0);
      b.box('#fdfdf7', 0.2, 0.06, 0.2, 0, 0.45, -0.16);
      b.cyl('#6c757d', 0.1, 0.21, 0.08, 4, 0, 0.52, -0.16, 0, PI / 4, 0);
      b.box('#fdfdf7', 0.12, 0.05, 0.12, 0, 0.585, -0.16);
      b.cyl('#6c757d', 0.02, 0.13, 0.1, 4, 0, 0.66, -0.16, 0, PI / 4, 0);
      // La « brochette de sate » : une tige et six boules
      b.cyl('#868e96', 0.007, 0.007, 0.32, 4, 0, 0.87, -0.16);
      for (let i = 0; i < 6; i++) b.ball('#f1c40f', 0.026, 0, 0.75 + i * 0.05, -0.16);
      b.cyl('#adb5bd', 0.008, 0.008, 0.6, 4, 0.36, 0.3, 0.26);
      for (const x of [-0.36, -0.2]) b.ball('#2f9e44', 0.07, x, 0.1, 0.28, 1, 1.2, 1).cyl('#6b4423', 0.014, 0.014, 0.08, 5, x, 0.04, 0.28);
      const banner = flag('#e03131', '#ffffff', 0.22, 0.13);
      banner.position.set(0.36, 0.53, 0.26);
      const jogger = person(new Builder(), '#ff922b', null, 0, 0, 0, 0.6).mesh();
      return {
        parts: [b.mesh(), banner, jogger],
        update(t) {
          banner.rotation.y = Math.sin(t * 2.4) * 0.5;
          const a = t * 0.8;
          jogger.position.set(Math.cos(a) * 0.26, 0.02 + Math.abs(Math.sin(t * 9)) * 0.02, 0.2 + Math.sin(a) * 0.1);
        },
      };
    },
  },
  {
    name: 'Angklung chez Udjo',
    match: "Spectacle d'angklung",
    dx: 0.8,
    dz: -0.86,
    size: 0.2,
    height: 0.85,
    build() {
      const b = new Builder();
      // Pavillon de bambou au toit de chaume, et trois enfants qui tiennent chacun un angklung
      for (const [x, z] of [[-0.5, -0.46], [0.5, -0.46], [-0.5, -0.22], [0.5, -0.22]]) b.cyl('#c49a4a', 0.02, 0.02, 0.5, 5, x, 0.25, z);
      b.poly('#b58d3d', [[-0.2, 0], [0.2, 0], [0, 0.2]], 1.16, 0, 0.5, -0.34, 0, PI / 2, 0);
      b.box('#d9cbb0', 1.2, 0.03, 0.62, 0, 0.015, -0.06);
      const kids = ['#e03131', '#1c7ed6', '#f59f00'];
      kids.forEach((c, i) => {
        person(b, c, null, (i - 1) * 0.36, 0.03, -0.02, 1);
        b.cyl('#3b2412', 0.045, 0.05, 0.03, 6, (i - 1) * 0.36, 0.27, -0.02); // calot de batik
      });
      // L'angklung : un cadre de bambou où pendent trois tubes de longueurs différentes
      const angklung = () => {
        const a = new Builder();
        a.cyl('#d9b36a', 0.016, 0.016, 0.3, 5, 0, 0.03, 0, 0, 0, PI / 2);
        a.cyl('#d9b36a', 0.008, 0.008, 0.3, 5, 0, 0.36, 0, 0, 0, PI / 2);
        for (const x of [-0.14, 0.14]) a.cyl('#d9b36a', 0.008, 0.008, 0.34, 4, x, 0.2, 0);
        [0.28, 0.21, 0.15].forEach((h, k) => {
          a.cyl('#f0d58c', 0.03, 0.03, h, 6, -0.085 + k * 0.085, 0.045 + h / 2, 0);
          a.cyl('#8d6b2f', 0.031, 0.031, 0.02, 6, -0.085 + k * 0.085, 0.05, 0);
        });
        return a.mesh();
      };
      const set = [angklung(), angklung(), angklung()];
      set.forEach((a, i) => a.position.set((i - 1) * 0.36 + 0.04, 0.08, 0.14));
      return {
        parts: [b.mesh(), ...set],
        update(t) {
          // Chacun secoue le sien à tour de rôle
          set.forEach((a, i) => {
            const on = Math.max(0, Math.sin(t * 1.6 - i * 2.1));
            a.rotation.z = Math.sin(t * 26) * 0.28 * on;
            a.position.y = 0.08 + on * 0.05;
          });
        },
      };
    },
  },
  {
    name: 'Jalan Braga',
    match: 'Jalan Braga',
    dx: 0.74,
    dz: -0.52,
    size: 0.2,
    height: 0.82,
    build() {
      const b = new Builder();
      b.box('#5c6570', 1.3, 0.02, 0.26, 0, 0.01, 0.32);
      b.box('#d9cbb0', 1.3, 0.03, 0.16, 0, 0.015, 0.11);
      // Hôtel Savoy Homann : bandes horizontales et angle arrondi surmonté d'un aileron
      b.box('#fdfdf7', 0.62, 0.4, 0.26, -0.26, 0.2, -0.12);
      b.cyl('#fdfdf7', 0.13, 0.13, 0.4, 10, 0.05, 0.2, -0.12);
      for (let i = 0; i < 3; i++) {
        b.box('#74c0fc', 0.63, 0.045, 0.265, -0.26, 0.1 + i * 0.12, -0.12);
        b.cyl('#74c0fc', 0.134, 0.134, 0.045, 10, 0.05, 0.1 + i * 0.12, -0.12);
      }
      b.cyl('#fdfdf7', 0.07, 0.07, 0.12, 8, 0.05, 0.46, -0.12);
      b.box('#e8590c', 0.03, 0.3, 0.1, 0.05, 0.58, -0.12);
      // Boutique voisine au fronton en gradins
      b.box('#ffd8a8', 0.36, 0.3, 0.24, 0.42, 0.15, -0.12);
      b.box('#ffd8a8', 0.22, 0.07, 0.24, 0.42, 0.335, -0.12).box('#ffd8a8', 0.1, 0.06, 0.24, 0.42, 0.4, -0.12);
      b.box('#3d5a80', 0.09, 0.14, 0.02, 0.42, 0.07, 0.005);
      for (let i = 0; i < 4; i++) b.box(i % 2 ? '#ffffff' : '#e03131', 0.09, 0.02, 0.1, 0.285 + i * 0.09, 0.22, 0.04, 0.35, 0, 0);
      // Les toiles des peintres, posées sur le trottoir
      [['#ff6b6b', '#ffd43b'], ['#4dabf7', '#51cf66'], ['#ffd43b', '#e8590c']].forEach(([c1, c2], i) => {
        const x = -0.5 + i * 0.18;
        b.box('#6b4423', 0.13, 0.15, 0.015, x, 0.105, 0.09, -0.3, 0, 0);
        b.box(c1, 0.105, 0.125, 0.02, x, 0.107, 0.094, -0.3, 0, 0);
        b.box(c2, 0.06, 0.05, 0.024, x + 0.01, 0.09, 0.1, -0.3, 0, 0);
      });
      const painter = person(new Builder(), '#343a40', null, 0, 0, 0, 0.8).box('#e03131', 0.09, 0.02, 0.09, 0, 0.2, 0).box('#6b4423', 0.012, 0.012, 0.12, 0.05, 0.11, 0.06).mesh(0.02, 0.03, 0.16);
      const cars = [carMesh('#2b8a3e'), carMesh('#f08c00')];
      return {
        parts: [b.mesh(), painter, ...cars],
        update(t) {
          painter.rotation.y = -0.6 + Math.sin(t * 3) * 0.35;
          painter.position.x = -0.05 + Math.sin(t * 0.5) * 0.08;
          cars.forEach((c, i) => {
            const dir = i ? -1 : 1;
            const u = (t * 0.2 + i * 0.45) % 1;
            c.position.set((u - 0.5) * 1.2 * dir, 0.02, 0.27 + i * 0.1);
            c.rotation.y = i ? PI : 0;
            c.scale.setScalar(0.8 * Math.min(1, Math.min(u, 1 - u) * 10));
          });
        },
      };
    },
  },
  {
    name: 'Fraises de Ciwidey',
    match: 'Fraises et sources',
    dx: 0.4,
    dz: -0.14,
    size: 0.19,
    height: 0.6,
    build() {
      const b = new Builder();
      // À gauche, le rang de fraisiers et son panier ; à droite, le bassin d'eau chaude au milieu des théiers
      b.box('#7b4a21', 0.5, 0.05, 0.4, -0.32, 0.025, 0.02);
      for (const z of [-0.1, 0.14]) b.box('#2f9e44', 0.46, 0.04, 0.12, -0.32, 0.07, z);
      [[-0.47, -0.1], [-0.3, -0.08], [-0.16, -0.12], [-0.4, 0.14], [-0.22, 0.15]].forEach(([x, z]) => {
        b.cone('#e03131', 0.06, 0.13, 7, x, 0.15, z, PI, 0, 0);
        b.cyl('#2f9e44', 0.05, 0.035, 0.025, 6, x, 0.225, z);
      });
      b.cyl('#c49a4a', 0.08, 0.06, 0.08, 7, -0.06, 0.04, 0.3);
      b.ball('#e03131', 0.035, -0.08, 0.09, 0.3).ball('#e03131', 0.035, -0.03, 0.09, 0.31).ball('#e03131', 0.035, -0.06, 0.1, 0.27);
      b.cyl('#adb5bd', 0.3, 0.32, 0.07, 9, 0.3, 0.035, 0.04);
      b.cyl('#63e6d6', 0.25, 0.25, 0.02, 9, 0.3, 0.07, 0.04);
      for (let i = 0; i < 4; i++) b.ball(i % 2 ? '#2f9e44' : '#237a36', 0.085, 0.06 + i * 0.16, 0.06, -0.3, 1.15, 0.8, 1);
      const picker = person(new Builder(), '#7048e8', '#f2d16b', 0, 0, 0, 0.8).mesh();
      const bather = new Builder().ball('#f2b98a', 0.055, 0, 0.04, 0).ball('#3b2412', 0.05, 0, 0.065, -0.012).box('#f2b98a', 0.16, 0.03, 0.05, 0, -0.01, 0).mesh();
      const steam = [puff(0.05), puff(0.05), puff(0.05)];
      return {
        parts: [b.mesh(), picker, bather, ...steam],
        update(t) {
          picker.position.set(-0.32 + Math.sin(t * 0.5) * 0.14, 0.05, 0.02);
          picker.rotation.x = 0.3 + Math.max(0, Math.sin(t * 3)) * 0.5;
          bather.position.set(0.3 + Math.sin(t * 0.6) * 0.08, 0.08 + Math.sin(t * 2) * 0.008, 0.06);
          steam.forEach((s, i) => rise(s, (t * 0.3 + i / 3) % 1, 0.2 + i * 0.1, 0.09, 0.02, 0.4, 0.08, 1.1));
        },
      };
    },
  },
  {
    name: 'Kawah Putih',
    match: 'Kawah Putih',
    dx: 0.08,
    dz: 0.0,
    size: 0.24,
    height: 0.62,
    build() {
      const b = new Builder();
      // Sable clair, lac laiteux, parois pâles au fond, arbres morts sur la rive
      b.ball('#efe9d4', 0.62, 0, 0, 0.04, 1, 0.06, 0.85, 1);
      b.ball('#a5ecdf', 0.44, 0, 0.036, 0, 1.05, 0.03, 0.7, 1);
      const walls = [0.9, 1.3, 1.7, 1.4, 1.8, 1.25, 0.9];
      walls.forEach((h, i) => {
        const a = PI + (i / 6) * PI;
        b.ball(i % 2 ? '#d5cfbd' : '#c2bca9', 0.17, Math.cos(a) * 0.58, 0.08, Math.sin(a) * 0.4 - 0.04, 1.15, h, 0.9);
      });
      b.ball('#f2e26b', 0.07, -0.34, 0.045, 0.2, 1.4, 0.2, 1).ball('#f2e26b', 0.05, 0.4, 0.045, 0.16, 1.2, 0.2, 1);
      deadTree(b, -0.4, 0.03, 0.08, 0.3);
      deadTree(b, -0.24, 0.03, 0.3, 0.22);
      deadTree(b, 0.42, 0.03, 0.02, 0.26);
      deadTree(b, 0.3, 0.03, -0.2, 0.2);
      // Ponton de bois et visiteur masqué
      b.box('#8d5a2b', 0.3, 0.015, 0.09, 0.12, 0.075, 0.3, 0, 0.5, 0);
      person(b, '#e64980', null, 0.03, 0.08, 0.25, 0.7);
      b.box('#ffffff', 0.05, 0.03, 0.02, 0.03, 0.2, 0.28);
      // Reflet pâle qui glisse sur le lac, vapeurs de soufre
      const sheen = new Builder().ball('#e3fff8', 0.16, 0, 0, 0, 1.3, 0.04, 0.8, 1).mesh();
      const steam = [puff(0.07), puff(0.07), puff(0.07)];
      return {
        parts: [b.mesh(), sheen, ...steam],
        update(t) {
          sheen.position.set(Math.sin(t * 0.4) * 0.22, 0.047, -0.04 + Math.cos(t * 0.3) * 0.08);
          sheen.scale.set(0.8 + Math.sin(t * 0.8) * 0.3, 1, 0.8 + Math.cos(t * 0.6) * 0.3);
          steam.forEach((s, i) => rise(s, (t * 0.18 + i / 3) % 1, -0.25 + i * 0.2, 0.08, -0.1 + i * 0.06, 0.4, 0.2, 1.3));
        },
      };
    },
  },
  {
    name: 'Situ Patenggang',
    match: 'Lac de Situ Patenggang',
    dx: -0.24,
    dz: -0.1,
    size: 0.22,
    height: 0.55,
    build() {
      const b = new Builder();
      b.ball('#4aa3d6', 0.58, 0, 0, 0, 1.05, 0.04, 0.78, 1);
      for (let i = 0; i < 6; i++) {
        const a = PI + 0.2 + (i / 5) * (PI - 0.4);
        b.cone(i % 2 ? '#1f6b33' : '#2f7a2f', 0.08, 0.26, 5, Math.cos(a) * 0.6, 0.15, Math.sin(a) * 0.44);
      }
      // L'île d'Asmara et, en face, le Batu Cinta, le « rocher de l'amour »
      b.ball('#5fae3f', 0.16, -0.16, 0.03, -0.08, 1.2, 0.45, 1);
      b.cone('#1f6b33', 0.06, 0.2, 5, -0.22, 0.19, -0.1).cone('#2f7a2f', 0.05, 0.16, 5, -0.1, 0.16, -0.06);
      b.ball('#8a8f94', 0.1, 0.36, 0.06, -0.14, 1.2, 1, 1).ball('#9aa0a6', 0.06, 0.46, 0.04, -0.06);
      b.box('#8d5a2b', 0.06, 0.015, 0.2, 0.1, 0.04, 0.42);
      const heart = new Builder().ball('#ff4d6d', 0.04, -0.028, 0.03, 0).ball('#ff4d6d', 0.04, 0.028, 0.03, 0).cone('#ff4d6d', 0.062, 0.08, 4, 0, -0.03, 0, PI, PI / 4, 0).mesh(0.36, 0.26, -0.14);
      // Barque colorée qui fait la traversée
      const s = new Builder();
      s.poly('#ffd43b', [[-0.15, 0.05], [0.15, 0.05], [0.1, -0.02], [-0.1, -0.02]], 0.09);
      s.box('#e03131', 0.3, 0.015, 0.092, 0, 0.05, 0);
      person(s, '#e64980', null, -0.04, 0.03, 0, 0.5);
      person(s, '#1c7ed6', null, 0.05, 0.03, 0, 0.5);
      const boat = s.mesh();
      const mist = [puff(0.08), puff(0.08)];
      return {
        parts: [b.mesh(), heart, boat, ...mist],
        update(t) {
          heart.scale.setScalar(1 + Math.max(0, Math.sin(t * 5)) * 0.25);
          const a = t * 0.35;
          boat.position.set(0.1 + Math.sin(a) * 0.2, 0.045 + Math.sin(t * 2.2) * 0.006, 0.18 + Math.sin(a * 2) * 0.1);
          boat.rotation.y = -Math.atan2(Math.cos(a * 2) * 0.2, Math.cos(a) * 0.2);
          boat.rotation.z = Math.sin(t * 2) * 0.08;
          mist.forEach((m, i) => {
            const k = (t * 0.07 + i * 0.5) % 1;
            m.position.set(-0.5 + k * 1.0, 0.1, -0.2 + i * 0.3);
            m.scale.set(1.6 * Math.sin(k * PI), 0.5 * Math.sin(k * PI), Math.sin(k * PI));
          });
        },
      };
    },
  },
  {
    name: 'Thé de Rancabali',
    match: 'Plantations de thé',
    dx: -0.1,
    dz: 0.38,
    size: 0.23,
    height: 0.8,
    build() {
      const b = new Builder();
      // Colline taillée au cordeau : des rangs de théiers qui suivent les courbes de niveau
      const tiers = [0.56, 0.44, 0.32, 0.2];
      tiers.forEach((r, i) => {
        const cx = -0.03 * i;
        const cz = -0.05 * i;
        b.cyl(i % 2 ? '#a5dc5f' : '#93cf52', r - 0.02, r, 0.1, 11, cx, 0.05 + i * 0.1, cz);
        const n = Math.round(r * 30);
        for (let k = 0; k < n; k++) {
          const a = (k / n) * PI * 2;
          b.ball(k % 2 ? '#2a8433' : '#1f6f2c', 0.05, cx + Math.cos(a) * (r - 0.06), 0.105 + i * 0.1, cz + Math.sin(a) * (r - 0.06), 1.3, 0.7, 1.3);
        }
      });
      b.ball('#8a8f94', 0.09, 0.4, 0.06, 0.34, 1.2, 0.9, 1);
      b.cyl('#6b4423', 0.018, 0.022, 0.16, 5, -0.09, 0.48, -0.15);
      b.ball('#1f6b33', 0.11, -0.09, 0.62, -0.15, 1, 0.9, 1);
      // Cueilleuses au chapeau conique, la hotte sur le dos
      const pickers = ['#e64980', '#4dabf7'].map((c) => {
        const k = person(new Builder(), c, '#f2d16b', 0, 0, 0, 0.75);
        k.cyl('#c49a4a', 0.04, 0.03, 0.07, 6, 0, 0.1, -0.06);
        return k.mesh();
      });
      return {
        parts: [b.mesh(), ...pickers],
        update(t) {
          pickers.forEach((k, i) => {
            const r = tiers[i] - 0.06;
            const a = PI / 2 + Math.sin(t * 0.35 + i * 2.2) * 1.1;
            k.position.set(-0.03 * i + Math.cos(a) * r, 0.1 + i * 0.1, -0.05 * i + Math.sin(a) * r);
            k.rotation.y = -a + PI / 2;
            k.rotation.x = Math.max(0, Math.sin(t * 4 + i)) * 0.4;
          });
        },
      };
    },
  },
];

// ---------- Yogyakarta : Borobudur, Prambanan, le Merapi et la ville du sultan ----------

const YOGYAKARTA = [
  {
    name: 'Borobudur',
    match: 'Borobudur, montée',
    dx: 0,
    dz: 0,
    size: 0.26,
    height: 1.0,
    build() {
      const b = new Builder();
      // Cinq terrasses carrées de pierre sombre, trois terrasses rondes couvertes de stupas en cloche
      const stone = ['#857d70', '#958d80', '#a59d90', '#b4ad9f'];
      [1.04, 0.88, 0.72, 0.58].forEach((w, i) => {
        b.box(stone[i], w, 0.09, w, 0, 0.045 + i * 0.09, 0);
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cone('#c9c2b4', 0.03, 0.07, 4, (x * w) / 2 - x * 0.03, 0.125 + i * 0.09, (z * w) / 2 - z * 0.03);
      });
      b.box('#d6cfc0', 0.12, 0.03, 0.56, 0, 0.19, 0.31, 0.62, 0, 0); // escalier sud
      b.box('#d6cfc0', 0.56, 0.03, 0.12, 0.31, 0.19, 0, 0, 0, 0.62); // escalier est
      const rings = [
        [0.27, 0.36, 0.225, 10],
        [0.19, 0.42, 0.15, 7],
      ];
      for (const [r, y, rb, n] of rings) {
        b.cyl('#bdb6a8', r, r + 0.01, 0.06, 12, 0, y + 0.03, 0);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * PI * 2;
          b.cyl('#ded8cb', 0.01, 0.034, 0.06, 6, Math.cos(a) * rb, y + 0.09, Math.sin(a) * rb);
          b.cone('#ded8cb', 0.01, 0.04, 4, Math.cos(a) * rb, y + 0.14, Math.sin(a) * rb);
        }
      }
      b.cyl('#c9c2b4', 0.11, 0.12, 0.05, 10, 0, 0.505, 0);
      b.cyl('#e6e0d4', 0.035, 0.1, 0.15, 8, 0, 0.605, 0);
      b.box('#e6e0d4', 0.06, 0.04, 0.06, 0, 0.7, 0);
      b.cone('#f1ecdf', 0.028, 0.18, 6, 0, 0.81, 0);
      // Pèlerins qui font le tour de la galerie
      const walkers = ['#ff922b', '#f06595', '#4dabf7'].map((c) => person(new Builder(), c, null, 0, 0, 0, 0.55).mesh());
      return {
        parts: [b.mesh(), ...walkers],
        update(t) {
          walkers.forEach((w, i) => {
            onSquare(w, t * 0.05 + i * 0.3, 0.4, 0.18);
            w.position.y += Math.abs(Math.sin(t * 6 + i)) * 0.012;
          });
        },
      };
    },
  },
  {
    name: 'Merapi en jeep',
    match: 'Merapi en jeep',
    dx: 0.48,
    dz: 0.28,
    size: 0.2,
    height: 0.6,
    build() {
      // Au pied du volcan (le Merapi de la carte, juste derrière) : cendres, maison détruite en 2010, vieilles jeeps
      const b = new Builder();
      b.ball('#a39c93', 0.6, 0, 0, 0, 1, 0.05, 0.8, 1);
      b.box('#d8d2c8', 0.3, 0.16, 0.03, -0.05, 0.1, -0.2).box('#d8d2c8', 0.03, 0.2, 0.22, -0.2, 0.12, -0.1).box('#d8d2c8', 0.03, 0.1, 0.22, 0.1, 0.07, -0.1);
      b.box('#3b3632', 0.07, 0.09, 0.035, -0.05, 0.1, -0.2);
      b.box('#6b4423', 0.3, 0.02, 0.03, -0.02, 0.2, -0.12, 0, 0.3, 0.5); // poutre calcinée
      b.ball('#6f6862', 0.1, 0.36, 0.06, -0.22, 1.2, 0.9, 1).ball('#6f6862', 0.06, -0.42, 0.04, 0.06);
      b.cyl('#3b3632', 0.012, 0.02, 0.3, 4, 0.3, 0.17, -0.3).box('#3b3632', 0.14, 0.012, 0.012, 0.34, 0.26, -0.3, 0, 0, 0.6).box('#3b3632', 0.1, 0.012, 0.012, 0.26, 0.2, -0.3, 0, 0, -0.7); // arbre mort
      const jeeps = [jeepMesh('#2f9e44'), jeepMesh('#e03131')];
      const dust = [puff(0.05), puff(0.05)];
      return {
        parts: [b.mesh(), ...jeeps, ...dust],
        update(t) {
          jeeps.forEach((jeep, i) => {
            const a = t * 0.7 + i * PI;
            jeep.position.set(Math.cos(a) * 0.4, 0.03 + Math.abs(Math.sin(t * 8 + i)) * 0.02, 0.12 + Math.sin(a) * 0.24);
            jeep.rotation.y = -a - PI / 2;
            jeep.rotation.z = Math.sin(t * 8 + i) * 0.05;
            const k = (t * 1.5 + i * 0.5) % 1;
            dust[i].position.set(Math.cos(a - 0.55) * 0.4, 0.07 + k * 0.08, 0.12 + Math.sin(a - 0.55) * 0.24);
            dust[i].scale.setScalar((0.5 + k) * Math.sin(k * PI));
          });
        },
      };
    },
  },
  {
    name: 'Prambanan',
    match: 'Prambanan',
    dx: 0.8,
    dz: 0.26,
    size: 0.23,
    height: 1.3,
    build() {
      const b = new Builder();
      b.box('#b9d98a', 1.2, 0.03, 0.9, 0, 0.015, 0);
      // Shiva au centre, Brahma et Vishnu de part et d'autre, trois petits temples devant
      spire(b, 0, -0.2, 1.5, 6);
      spire(b, -0.4, -0.2, 1.1, 5);
      spire(b, 0.4, -0.2, 1.1, 5);
      for (const x of [-0.4, 0, 0.4]) spire(b, x, 0.14, 0.55, 3);
      b.box('#d9c8a0', 0.5, 0.04, 0.2, 0, 0.04, 0.36); // scène du ballet du Ramayana
      // Rama et Sita dansent devant les temples
      const dancers = [
        ['#ffd43b', '#e03131'],
        ['#e03131', '#ffd43b'],
      ].map(([body, crown]) => {
        const d = person(new Builder(), body, null, 0, 0, 0, 0.7);
        d.cone(crown, 0.03, 0.07, 5, 0, 0.21, 0);
        d.box(body, 0.2, 0.02, 0.03, 0, 0.11, 0, 0, 0, 0.5);
        return d.mesh();
      });
      return {
        parts: [b.mesh(), ...dancers],
        update(t) {
          dancers.forEach((d, i) => {
            const a = t * 0.9 + i * PI;
            d.position.set(Math.cos(a) * 0.14, 0.06 + Math.abs(Math.sin(t * 3 + i)) * 0.02, 0.36 + Math.sin(a) * 0.05);
            d.rotation.y = t * 2.2 * (i ? -1 : 1);
          });
        },
      };
    },
  },
  {
    name: 'Rue Malioboro',
    match: 'Rue Malioboro',
    dx: 0.44,
    dz: 0.6,
    size: 0.2,
    height: 0.62,
    build() {
      const b = new Builder();
      b.box('#5c6570', 1.3, 0.02, 0.3, 0, 0.01, 0.2);
      b.box('#d9cbb0', 1.3, 0.025, 0.12, 0, 0.0125, -0.02);
      // Marché Beringharjo : façade jaune, piles de batik sous l'auvent
      b.box('#ffe066', 0.8, 0.28, 0.24, 0, 0.14, -0.22);
      b.box('#ffffff', 0.84, 0.04, 0.28, 0, 0.3, -0.22);
      b.box('#ffe066', 0.26, 0.12, 0.26, 0, 0.38, -0.22);
      b.poly('#b5523a', [[-0.16, 0], [0.16, 0], [0, 0.1]], 0.28, 0, 0.44, -0.22);
      b.box('#6b4423', 0.12, 0.16, 0.02, 0, 0.08, -0.095);
      ['#7b4a21', '#27408b', '#e8590c', '#7b4a21', '#27408b', '#c92a2a'].forEach((c, i) => b.box(c, 0.07, 0.035 + (i % 3) * 0.02, 0.07, -0.33 + i * 0.1 + (i > 2 ? 0.16 : 0), 0.045, -0.04));
      // Réverbères verts de la rue
      for (const x of [-0.52, 0.52]) {
        b.cyl('#1f6b33', 0.012, 0.016, 0.42, 5, x, 0.21, 0.02);
        b.box('#1f6b33', 0.16, 0.015, 0.015, x, 0.4, 0.02);
        b.ball('#fff3bf', 0.03, x - 0.08, 0.37, 0.02).ball('#fff3bf', 0.03, x + 0.08, 0.37, 0.02);
      }
      const becak = becakMesh('#e03131', '#ffd43b');
      // Andong : calèche à quatre roues tirée par un cheval
      const a = new Builder();
      horse(a, '#8d5524', 0.14, 0, 0, 0.5);
      a.box('#1f6b33', 0.22, 0.07, 0.14, -0.2, 0.13, 0);
      a.box('#ffd43b', 0.26, 0.02, 0.17, -0.2, 0.3, 0);
      for (const x of [-0.3, -0.1]) a.cyl('#ffd43b', 0.008, 0.008, 0.14, 4, x, 0.23, 0.065).cyl('#ffd43b', 0.008, 0.008, 0.14, 4, x, 0.23, -0.065);
      for (const z of [-0.08, 0.08]) a.cyl('#343a40', 0.065, 0.065, 0.016, 8, -0.27, 0.065, z, PI / 2).cyl('#343a40', 0.045, 0.045, 0.016, 8, -0.11, 0.045, z, PI / 2);
      a.box('#6b4423', 0.2, 0.012, 0.012, 0, 0.15, 0.04).box('#6b4423', 0.2, 0.012, 0.012, 0, 0.15, -0.04);
      person(a, '#e8590c', '#3b2412', -0.14, 0.16, 0, 0.6);
      const andong = a.mesh();
      return {
        parts: [b.mesh(), becak, andong],
        update(t) {
          const u = (t * 0.16) % 1;
          becak.position.set(-0.6 + u * 1.2, 0.02, 0.28);
          becak.scale.setScalar(Math.min(1, Math.min(u, 1 - u) * 10));
          const v = (t * 0.2 + 0.4) % 1;
          andong.position.set(0.6 - v * 1.2, 0.02 + Math.abs(Math.sin(t * 9)) * 0.012, 0.13);
          andong.rotation.y = PI;
          andong.scale.setScalar(Math.min(1, Math.min(v, 1 - v) * 10));
        },
      };
    },
  },
  {
    name: 'Atelier de batik',
    match: 'Atelier de batik',
    dx: 0.06,
    dz: 0.36,
    size: 0.19,
    height: 0.75,
    build() {
      const b = new Builder();
      // Portique de bambou où sèchent les tissus
      for (const x of [-0.5, 0, 0.5]) b.cyl('#c49a4a', 0.018, 0.018, 0.62, 5, x, 0.31, -0.1);
      b.cyl('#c49a4a', 0.018, 0.018, 1.08, 5, 0, 0.6, -0.1, 0, 0, PI / 2);
      // La batikeuse, assise devant son tissu, et le petit réchaud où fond la cire
      person(b, '#e64980', null, 0.12, 0.05, 0.28, 0.9);
      b.box('#8d5a2b', 0.12, 0.05, 0.12, 0.12, 0.025, 0.28);
      b.box('#f8f0dc', 0.2, 0.2, 0.015, -0.1, 0.16, 0.3, 0, 0.5, 0.0);
      b.box('#7b4a21', 0.13, 0.1, 0.02, -0.1, 0.18, 0.305, 0, 0.5, 0);
      b.cyl('#868e96', 0.05, 0.035, 0.05, 6, 0.36, 0.025, 0.3);
      b.cyl('#343a40', 0.07, 0.04, 0.04, 8, 0.36, 0.07, 0.3);
      b.cyl('#f59f00', 0.055, 0.055, 0.01, 8, 0.36, 0.09, 0.3);
      // Deux batiks suspendus : fond brun ou indigo, motifs clairs
      const cloth = (base, motif, edge) => {
        const c = new Builder();
        c.box(base, 0.4, 0.46, 0.014, 0, -0.23, 0);
        c.box(edge, 0.4, 0.05, 0.018, 0, -0.44, 0).box(edge, 0.4, 0.03, 0.018, 0, -0.02, 0);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) c.box(motif, 0.06, 0.06, 0.02, -0.12 + i * 0.12, -0.11 - j * 0.12, 0, 0, 0, PI / 4);
        return c.mesh();
      };
      const left = cloth('#7b4a21', '#f8e3b0', '#3b2412');
      const right = cloth('#27408b', '#ffffff', '#f8f0dc');
      left.position.set(-0.25, 0.6, -0.1);
      right.position.set(0.25, 0.6, -0.1);
      const smoke = [puff(0.04), puff(0.04)];
      return {
        parts: [b.mesh(), left, right, ...smoke],
        update(t) {
          left.rotation.x = Math.sin(t * 1.5) * 0.22;
          right.rotation.x = Math.sin(t * 1.3 + 1) * 0.22;
          smoke.forEach((s, i) => rise(s, (t * 0.4 + i * 0.5) % 1, 0.36, 0.1, 0.3, 0.35, 0.06, 1));
        },
      };
    },
  },
  {
    name: 'Kraton',
    match: 'Kraton',
    dx: 0.5,
    dz: 0.92,
    size: 0.21,
    height: 0.95,
    build() {
      const b = new Builder();
      // Grand pavillon ouvert (pendopo) : sol de marbre, colonnes vertes et or, toit joglo à forte pointe
      b.box('#f1ead8', 1.0, 0.05, 0.9, 0, 0.025, 0);
      b.box('#fdfdf7', 1.0, 0.14, 0.04, 0, 0.09, -0.45);
      for (const x of [-0.36, -0.12, 0.12, 0.36]) {
        for (const z of [-0.38, 0.14]) {
          b.cyl('#1f6b33', 0.024, 0.024, 0.36, 6, x, 0.23, z);
          b.box('#ffd43b', 0.06, 0.025, 0.06, x, 0.41, z);
        }
      }
      b.cyl('#b5523a', 0.3, 0.6, 0.12, 4, 0, 0.48, -0.12, 0, PI / 4, 0);
      b.cyl('#8f3a24', 0.07, 0.3, 0.26, 4, 0, 0.67, -0.12, 0, PI / 4, 0);
      b.box('#ffd43b', 0.12, 0.03, 0.03, 0, 0.81, -0.12);
      // Le gamelan devant le pavillon : un gong suspendu et deux métallophones
      b.box('#6b4423', 0.02, 0.2, 0.02, -0.1, 0.15, 0.3).box('#6b4423', 0.02, 0.2, 0.02, 0.1, 0.15, 0.3).box('#6b4423', 0.24, 0.02, 0.02, 0, 0.25, 0.3);
      b.cyl('#f1c40f', 0.07, 0.07, 0.02, 8, 0, 0.15, 0.3, PI / 2);
      b.box('#c92a2a', 0.18, 0.05, 0.08, -0.3, 0.075, 0.32).box('#f1c40f', 0.16, 0.012, 0.05, -0.3, 0.105, 0.32);
      b.box('#c92a2a', 0.18, 0.05, 0.08, 0.3, 0.075, 0.32).box('#f1c40f', 0.16, 0.012, 0.05, 0.3, 0.105, 0.32);
      b.cyl('#adb5bd', 0.008, 0.008, 0.6, 4, 0.58, 0.3, 0.42);
      // Cortège de serviteurs du palais, l'un porte l'ombrelle dorée du sultan
      const c = new Builder();
      for (let i = 0; i < 3; i++) {
        person(c, i === 1 ? '#f8f9fa' : '#3d5a80', null, -0.12 + i * 0.12, 0, 0, 0.7);
        c.cyl('#3b2412', 0.035, 0.04, 0.025, 6, -0.12 + i * 0.12, 0.17, 0); // blangkon
      }
      c.cyl('#6b4423', 0.006, 0.006, 0.26, 4, 0.03, 0.2, 0.03);
      c.cone('#ffd43b', 0.09, 0.05, 8, 0.03, 0.35, 0.03);
      const cortege = c.mesh();
      const banner = flag('#e03131', '#ffffff', 0.2, 0.12);
      banner.position.set(0.58, 0.54, 0.42);
      return {
        parts: [b.mesh(), cortege, banner],
        update(t) {
          const u = (t * 0.12) % 1;
          cortege.position.set(-0.5 + u * 0.9, Math.abs(Math.sin(t * 5)) * 0.01, 0.56);
          cortege.scale.setScalar(Math.min(1, Math.min(u, 1 - u) * 10));
          banner.rotation.y = Math.sin(t * 2.4) * 0.5;
        },
      };
    },
  },
  {
    name: 'Taman Sari',
    match: 'Taman Sari',
    dx: 0.12,
    dz: 0.7,
    size: 0.2,
    height: 0.7,
    build() {
      const b = new Builder();
      // Bassin turquoise entre des murs crème, pavillon à tour au fond, portail à fronton sculpté
      b.box('#f3e2c0', 1.0, 0.06, 0.74, 0, 0.03, 0.02);
      b.box('#35c9c0', 0.76, 0.02, 0.4, 0, 0.065, 0.1);
      b.box('#f3e2c0', 1.0, 0.16, 0.06, 0, 0.14, -0.34);
      for (const x of [-0.47, 0.47]) b.box('#f3e2c0', 0.06, 0.12, 0.7, x, 0.12, 0.02);
      b.box('#ecd5a8', 0.28, 0.34, 0.2, 0, 0.23, -0.34);
      b.box('#3b3632', 0.1, 0.16, 0.02, 0, 0.14, -0.235);
      b.pyr('#b5523a', 0.22, 0.12, 0, 0.46, -0.34);
      b.box('#ecd5a8', 0.12, 0.1, 0.1, 0, 0.5, -0.34);
      b.pyr('#b5523a', 0.1, 0.08, 0, 0.59, -0.34);
      for (const x of [-0.36, 0.36]) b.poly('#ecd5a8', [[-0.1, 0], [0.1, 0], [0.1, 0.1], [0.05, 0.14], [0, 0.24], [-0.05, 0.14], [-0.1, 0.1]], 0.06, x, 0.2, -0.34);
      for (const [x, z] of [[-0.42, 0.36], [0.42, 0.36], [-0.2, 0.36], [0.2, 0.36]]) b.cyl('#c0623a', 0.03, 0.022, 0.05, 6, x, 0.085, z).ball('#2f9e44', 0.04, x, 0.14, z);
      // Fontaines en forme de champignon
      for (const x of [-0.2, 0.2]) b.cyl('#ecd5a8', 0.025, 0.035, 0.08, 6, x, 0.1, 0.08).cyl('#ecd5a8', 0.06, 0.03, 0.03, 8, x, 0.15, 0.08);
      const jets = [puff(0.04), puff(0.04), puff(0.04), puff(0.04)];
      return {
        parts: [b.mesh(), ...jets],
        update(t) {
          jets.forEach((j, i) => {
            const life = (t * 0.7 + i * 0.5) % 1;
            const x = i < 2 ? -0.2 : 0.2;
            j.position.set(x + Math.sin(i * 2.4) * life * 0.08, 0.17 + Math.sin(life * PI) * 0.12, 0.08 + Math.cos(i * 2.4) * life * 0.08);
            j.scale.setScalar(0.5 + Math.sin(life * PI) * 0.6);
          });
        },
      };
    },
  },
  {
    name: 'Gudeg, kopi joss',
    match: 'Gudeg',
    dx: 0.78,
    dz: 0.62,
    size: 0.17,
    height: 0.7,
    build() {
      const b = new Builder();
      b.box('#8d5a2b', 0.9, 0.04, 0.5, 0, 0.3, 0); // table de l'angkringan
      for (const [x, z] of [[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]]) b.box('#6b4423', 0.04, 0.3, 0.04, x, 0.15, z);
      // Marmite de terre pleine de gudeg, avec ses œufs bruns
      b.cyl('#b5523a', 0.17, 0.11, 0.16, 8, -0.24, 0.4, 0);
      b.cyl('#7b4a21', 0.15, 0.15, 0.02, 8, -0.24, 0.485, 0);
      b.ball('#c98a4b', 0.04, -0.29, 0.5, 0.03, 1, 1, 1.2).ball('#c98a4b', 0.04, -0.19, 0.5, -0.04, 1.2, 1, 1);
      b.box('#2f9e44', 0.3, 0.012, 0.22, 0.02, 0.326, 0.1, 0, 0.3, 0); // feuille de bananier
      b.ball('#f8f9fa', 0.06, 0.02, 0.35, 0.1, 1.2, 0.7, 1);
      // Verre de kopi joss
      b.cyl('#e9ecef', 0.1, 0.085, 0.22, 8, 0.26, 0.43, 0);
      b.cyl('#3b2412', 0.09, 0.09, 0.015, 8, 0.26, 0.54, 0);
      person(b, '#1c7ed6', null, 0.02, 0, -0.34, 1.6);
      // Le charbon ardent qu'on plonge dans le café
      const ember = new Builder().box('#ff4d1c', 0.07, 0.07, 0.07, 0, 0, 0).box('#ffd43b', 0.04, 0.074, 0.04, 0, 0, 0).mesh();
      const steam = [puff(0.05), puff(0.05), puff(0.05)];
      return {
        parts: [b.mesh(), ember, ...steam],
        update(t) {
          const k = (t * 0.35) % 1;
          ember.position.set(0.26, 0.56 + Math.max(0, Math.cos(k * PI * 2)) * 0.28, 0);
          ember.rotation.set(t * 2, t * 1.4, 0);
          steam.forEach((s, i) => rise(s, (t * 0.4 + i / 3) % 1, 0.26, 0.58, 0, 0.4, 0.08, 1));
        },
      };
    },
  },
];

// ---------- Dieng : le plateau des dieux, ses temples, ses cratères et son lac de couleurs ----------

const DIENG = [
  {
    name: 'Mont Prau',
    match: 'Mont Prau',
    dx: -0.28,
    dz: 0.04,
    size: 0.24,
    height: 1.05,
    build() {
      const b = new Builder();
      // Au fond, les cônes du Sindoro et du Sumbing ; devant, la longue crête herbeuse et ses tentes
      b.cone('#7487b8', 0.3, 0.62, 6, 0.3, 0.31, -0.42).cone('#8fa0c9', 0.22, 0.44, 6, -0.25, 0.22, -0.46);
      b.cone('#e9ecef', 0.075, 0.16, 6, 0.3, 0.55, -0.42);
      b.poly('#6fbf4b', [[-0.62, 0], [0.62, 0], [0.5, 0.26], [0.15, 0.4], [-0.3, 0.34], [-0.52, 0.22]], 0.34, 0, 0, -0.1);
      b.poly('#8fd36a', [[-0.66, 0], [0.66, 0], [0.5, 0.15], [0, 0.22], [-0.5, 0.13]], 0.3, 0, 0, 0.16);
      for (const [x, z] of [[-0.4, 0.2], [-0.2, 0.26], [0.05, 0.22], [0.3, 0.26], [0.42, 0.18], [-0.05, 0.3]]) b.ball('#ffffff', 0.022, x, 0.14 + (0.5 - Math.abs(x)) * 0.14, z); // marguerites
      b.pyr('#ff922b', 0.09, 0.12, -0.2, 0.41, -0.14).pyr('#4dabf7', 0.08, 0.11, 0.0, 0.44, -0.16);
      b.cyl('#adb5bd', 0.007, 0.007, 0.3, 4, 0.2, 0.54, -0.14);
      const banner = flag('#e03131', '#ffffff', 0.16, 0.1);
      banner.position.set(0.2, 0.64, -0.14);
      const hiker = person(new Builder(), '#e03131', null, 0, 0, 0, 0.6).box('#1c7ed6', 0.06, 0.08, 0.04, -0.045, 0.07, 0).mesh();
      return raised(0.2, '#6fbf4b', 1.3, 0.76, -0.02, {
        parts: [b.mesh(), banner, hiker],
        update(t) {
          banner.rotation.y = Math.sin(t * 2.6) * 0.5;
          const x = Math.sin(t * 0.3) * 0.42;
          // Hauteur de la crête sous les pieds du marcheur
          const y = x < -0.3 ? 0.22 + ((x + 0.52) / 0.22) * 0.12 : x < 0.15 ? 0.34 + ((x + 0.3) / 0.45) * 0.06 : 0.4 - ((x - 0.15) / 0.35) * 0.14;
          hiker.position.set(x, y + Math.abs(Math.sin(t * 6)) * 0.015, 0.02);
          hiker.rotation.y = Math.cos(t * 0.3) > 0 ? 0 : PI;
        },
      });
    },
  },
  {
    name: 'Lever de soleil',
    match: 'Lever de soleil au Sikunir',
    dx: 0.3,
    dz: 0.1,
    size: 0.24,
    height: 1.34,
    build() {
      const b = new Builder();
      // La colline du Sikunir et ses marches, le cône du Sindoro derrière
      b.cone('#6c7fb0', 0.3, 0.66, 6, 0.4, 0.33, -0.4);
      b.cyl('#5fae3f', 0.2, 0.52, 0.42, 7, -0.1, 0.21, 0.05);
      b.box('#e9dcc0', 0.1, 0.02, 0.5, -0.1, 0.22, 0.4, 0.92, 0, 0);
      for (let i = 0; i < 5; i++) b.box('#c9b98f', 0.1, 0.022, 0.03, -0.1, 0.06 + i * 0.08, 0.52 - i * 0.06);
      b.ball('#2f9e44', 0.08, -0.5, 0.06, 0.2, 1, 1.2, 1).ball('#2f9e44', 0.07, 0.3, 0.05, 0.3, 1, 1.2, 1);
      // Spectateurs emmitouflés au sommet
      [['#e03131', -0.2], ['#1c7ed6', -0.08], ['#f59f00', 0.04]].forEach(([c, x]) => {
        person(b, c, null, x, 0.42, 0, 0.7);
        b.cyl(c, 0.04, 0.04, 0.03, 6, x, 0.59, 0); // bonnet
      });
      const sun = new Builder();
      sun.cyl('#ffb703', 0.15, 0.15, 0.02, 12, 0, 0, 0, PI / 2);
      sun.cyl('#ffd43b', 0.11, 0.11, 0.026, 12, 0, 0, 0, PI / 2);
      for (let i = 0; i < 8; i++) sun.box('#ffb703', 0.09, 0.022, 0.016, Math.cos((i / 8) * PI * 2) * 0.22, Math.sin((i / 8) * PI * 2) * 0.22, 0, 0, 0, (i / 8) * PI * 2);
      const sunMesh = sun.mesh();
      const clouds = [puff(0.1), puff(0.1)];
      return raised(0.2, '#5fae3f', 1.1, 1.1, 0.05, {
        parts: [b.mesh(), sunMesh, ...clouds],
        update(t) {
          // Le soleil sort de derrière le volcan, monte, puis recommence
          const k = (t * 0.12) % 1;
          const up = Math.min(1, k * 2.2);
          sunMesh.position.set(0.02, 0.2 + up * 0.62, -0.5);
          sunMesh.rotation.z = t * 0.3;
          sunMesh.scale.setScalar((0.9 + Math.sin(t * 3) * 0.06) * Math.min(1, (1 - k) * 8));
          clouds.forEach((c, i) => {
            c.position.set(-0.45 + ((t * 0.04 + i * 0.5) % 1) * 0.9, 0.12, -0.26 - i * 0.14);
            c.scale.set(2, 0.6, 1);
          });
        },
      });
    },
  },
  {
    name: "Temples d'Arjuna",
    match: "Temples d'Arjuna",
    dx: 0.0,
    dz: 0.46,
    size: 0.24,
    height: 0.7,
    build() {
      const b = new Builder();
      b.box('#a9e07e', 1.24, 0.02, 0.5, 0, 0.01, 0.02);
      b.box('#d9cbb0', 1.1, 0.022, 0.08, 0, 0.012, 0.18);
      // Cinq petits temples de pierre alignés sur la pelouse
      [0.78, 0.6, 0.72, 0.6, 0.78].forEach((s, i) => spire(b, (i - 2) * 0.25, -0.06, s, 2));
      const visitor = person(new Builder(), '#f06595', '#f2d16b', 0, 0, 0, 0.6).mesh();
      const mist = [puff(0.1), puff(0.1), puff(0.1)];
      return {
        parts: [b.mesh(), visitor, ...mist],
        update(t) {
          visitor.position.set(Math.sin(t * 0.4) * 0.45, 0.02 + Math.abs(Math.sin(t * 6)) * 0.012, 0.18);
          // Nappes de brume qui traversent la pelouse
          mist.forEach((m, i) => {
            const k = (t * 0.06 + i / 3) % 1;
            m.position.set(-0.6 + k * 1.2, 0.1 + i * 0.05, -0.22 + i * 0.2);
            m.scale.set(2.2 * Math.sin(k * PI), 0.45 * Math.sin(k * PI), 0.9 * Math.sin(k * PI));
          });
        },
      };
    },
  },
  {
    name: 'Carica, mie ongklok',
    match: 'Carica',
    dx: -0.42,
    dz: 0.6,
    size: 0.18,
    height: 0.78,
    build() {
      const b = new Builder();
      // Le carica, petite papaye de montagne : fruits jaunes serrés contre le tronc, sous le bouquet de feuilles
      const leaves = palmTree(b, -0.32, -0.05, 0.5);
      for (let i = 0; i < 6; i++) b.ball(i % 2 ? '#f2c94c' : '#c5d94a', 0.05, -0.32 + Math.cos(i * 1.05) * 0.06, 0.4 + (i % 3) * 0.035, -0.05 + Math.sin(i * 1.05) * 0.06, 1, 1.4, 1);
      // Bocal de carica au sirop
      b.cyl('#ffe066', 0.075, 0.075, 0.15, 8, -0.06, 0.075, 0.26);
      b.cyl('#e03131', 0.078, 0.078, 0.03, 8, -0.06, 0.165, 0.26);
      b.box('#ffffff', 0.09, 0.05, 0.02, -0.06, 0.08, 0.33);
      // Bol de mie ongklok : nouilles, chou, sauce épaisse, et brochettes de bœuf à côté
      b.cyl('#fdfdf7', 0.22, 0.13, 0.13, 9, 0.28, 0.065, 0.02);
      b.cyl('#b9772f', 0.2, 0.2, 0.02, 9, 0.28, 0.13, 0.02);
      for (let i = 0; i < 4; i++) b.box('#ffe066', 0.24, 0.025, 0.03, 0.27 + (i % 2) * 0.03, 0.15, -0.05 + i * 0.045, 0, 0.3 * (i % 2 ? 1 : -1), 0);
      b.ball('#74b816', 0.05, 0.36, 0.15, 0.08, 1.2, 0.6, 1);
      b.cyl('#e9ecef', 0.14, 0.11, 0.02, 8, 0.24, 0.01, 0.38);
      for (let i = 0; i < 3; i++) b.box('#7b3f1d', 0.14, 0.03, 0.035, 0.22, 0.035, 0.33 + i * 0.05).box('#f0d58c', 0.1, 0.01, 0.01, 0.34, 0.035, 0.33 + i * 0.05);
      const steam = [puff(0.05), puff(0.05), puff(0.05)];
      return {
        parts: [b.mesh(), leaves, ...steam],
        update(t) {
          leaves.rotation.z = Math.sin(t * 1.4) * 0.14;
          leaves.rotation.x = Math.cos(t * 1.1) * 0.1;
          steam.forEach((s, i) => rise(s, (t * 0.4 + i / 3) % 1, 0.22 + i * 0.06, 0.16, 0.02, 0.4, 0.08, 1.1));
        },
      };
    },
  },
  {
    name: 'Telaga Warna',
    match: 'Telaga Warna',
    dx: 0.4,
    dz: 0.56,
    size: 0.24,
    height: 0.62,
    build() {
      const b = new Builder();
      // Le lac de deux couleurs, vert d'un côté, turquoise de l'autre, dans son écrin de forêt
      b.ball('#2fb37a', 0.42, -0.14, 0, 0.04, 1.1, 0.04, 0.8, 1);
      b.ball('#35c9d6', 0.36, 0.2, 0.004, 0.08, 1.1, 0.04, 0.8, 1);
      for (let i = 0; i < 5; i++) b.cone(i % 2 ? '#1f6b33' : '#2f7a2f', 0.08, 0.26, 5, -0.56 + i * 0.17, 0.15, -0.32 + Math.abs(i - 2) * 0.05);
      // Les deux gros rochers de Batu Ratapan Angin, d'où l'on regarde le lac
      b.ball('#5fae3f', 0.2, 0.44, 0.06, -0.32, 1.2, 0.9, 1);
      b.ball('#8a8f94', 0.09, 0.37, 0.28, -0.3, 1, 1.3, 1).ball('#9aa0a6', 0.08, 0.52, 0.26, -0.32, 1, 1.2, 1);
      person(b, '#e03131', null, 0.37, 0.39, -0.3, 0.6);
      const glow = new Builder().ball('#b9f27a', 0.15, 0, 0, 0, 1.3, 0.04, 0.8, 1).mesh();
      const mist = [puff(0.08), puff(0.08)];
      return {
        parts: [b.mesh(), glow, ...mist],
        update(t) {
          // Une tache claire passe du vert au turquoise : le lac change de couleur avec la lumière
          glow.position.set(Math.sin(t * 0.35) * 0.3, 0.02, 0.06 + Math.cos(t * 0.5) * 0.08);
          glow.scale.set(0.8 + Math.sin(t * 0.9) * 0.35, 1, 0.8 + Math.cos(t * 0.7) * 0.3);
          mist.forEach((m, i) => {
            const k = (t * 0.07 + i * 0.5) % 1;
            m.position.set(-0.5 + k * 1.0, 0.1, -0.1 + i * 0.26);
            m.scale.set(1.6 * Math.sin(k * PI), 0.5 * Math.sin(k * PI), Math.sin(k * PI));
          });
        },
      };
    },
  },
  {
    name: 'Cratère de Sikidang',
    match: 'Cratère de Sikidang',
    dx: -0.02,
    dz: 0.9,
    size: 0.23,
    height: 0.55,
    build() {
      const b = new Builder();
      // Sol pâle taché de soufre, mare de boue grise qui bout, passerelle de bois
      b.ball('#e0d8bc', 0.62, 0, 0, 0, 1, 0.05, 0.8, 1);
      b.ball('#f2e26b', 0.08, -0.4, 0.035, 0.14, 1.5, 0.2, 1).ball('#f2e26b', 0.06, 0.2, 0.035, -0.3, 1.3, 0.2, 1).ball('#f2e26b', 0.05, 0.44, 0.035, 0.02, 1.3, 0.2, 1);
      b.cyl('#bdb7a9', 0.27, 0.31, 0.06, 9, -0.1, 0.045, -0.1);
      b.cyl('#7d8288', 0.23, 0.23, 0.02, 9, -0.1, 0.075, -0.1);
      b.cyl('#c9c06a', 0.03, 0.07, 0.07, 6, 0.38, 0.06, -0.22).cyl('#3b3632', 0.02, 0.02, 0.01, 6, 0.38, 0.097, -0.22);
      b.box('#8d5a2b', 0.56, 0.02, 0.09, 0.22, 0.07, 0.28, 0, 0.28, 0);
      b.box('#8d5a2b', 0.46, 0.02, 0.09, -0.26, 0.07, 0.3, 0, -0.3, 0);
      for (const [x, z] of [[-0.46, 0.24], [-0.06, 0.36], [0.46, 0.2]]) b.box('#6b4423', 0.025, 0.12, 0.025, x, 0.1, z);
      const walker = person(new Builder(), '#7048e8', null, 0, 0, 0, 0.65).box('#ffffff', 0.05, 0.03, 0.02, 0, 0.125, 0.035).mesh();
      const bubbles = [0, 1].map(() => new Builder().ball('#a9aeb3', 0.06, 0, 0, 0).mesh());
      const steam = [puff(0.08), puff(0.08)];
      return {
        parts: [b.mesh(), walker, ...bubbles, ...steam],
        update(t) {
          const x = Math.sin(t * 0.35) * 0.42;
          walker.position.set(x, 0.08 + Math.abs(Math.sin(t * 6)) * 0.012, 0.36 - Math.abs(x) * 0.28);
          bubbles.forEach((m, i) => {
            const k = (t * 0.9 + i * 0.55) % 1;
            m.position.set(-0.18 + i * 0.16, 0.08, -0.14 + i * 0.1);
            m.scale.set(0.4 + k, Math.sin(k * PI) * 1.1, 0.4 + k);
          });
          steam.forEach((s, i) => rise(s, (t * 0.22 + i * 0.5) % 1, i ? 0.38 : -0.1, 0.1, i ? -0.22 : -0.1, 0.5, 0.16, 1.4));
        },
      };
    },
  },
];

// ---------- Bromo et Malang : le volcan à l'est du massif, la ville à l'ouest ----------

const BROMO = [
  {
    name: 'Batu',
    match: 'Batu, la ville',
    dx: -0.72,
    dz: -0.4,
    size: 0.24,
    height: 1.24,
    build() {
      const b = new Builder();
      // La grande roue de la place, et un pommier chargé de fruits
      b.box('#adb5bd', 0.03, 0.62, 0.03, 0.03, 0.3, -0.06, 0, 0, 0.22).box('#adb5bd', 0.03, 0.62, 0.03, 0.29, 0.3, -0.06, 0, 0, -0.22);
      b.box('#868e96', 0.4, 0.04, 0.14, 0.16, 0.02, -0.06);
      b.cyl('#6b4423', 0.03, 0.04, 0.26, 6, -0.36, 0.13, 0.1);
      b.ball('#2f9e44', 0.2, -0.36, 0.38, 0.1, 1.1, 0.9, 1.1, 1);
      for (const [x, y, z] of [[-0.48, 0.34, 0.2], [-0.3, 0.3, 0.26], [-0.22, 0.42, 0.18], [-0.42, 0.48, 0.16], [-0.34, 0.4, 0.28]]) b.ball('#e03131', 0.04, x, y, z);
      b.cyl('#c49a4a', 0.07, 0.05, 0.07, 7, -0.1, 0.035, 0.3);
      b.ball('#e03131', 0.035, -0.12, 0.08, 0.3).ball('#e03131', 0.035, -0.07, 0.08, 0.31).ball('#ffd43b', 0.035, -0.1, 0.09, 0.27);
      const w = new Builder();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * PI * 2;
        w.box('#e9ecef', 0.4, 0.016, 0.016, Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0, 0, 0, a);
        w.box('#e9ecef', 0.32, 0.02, 0.02, Math.cos(a + PI / 8) * 0.385, Math.sin(a + PI / 8) * 0.385, 0, 0, 0, a + PI / 8 + PI / 2);
        w.ball(['#e03131', '#ffd43b', '#4dabf7', '#51cf66'][i % 4], 0.06, Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0);
      }
      w.cyl('#495057', 0.04, 0.04, 0.06, 8, 0, 0, 0, PI / 2);
      const wheel = w.mesh(0.16, 0.6, -0.06);
      const picker = person(new Builder(), '#1c7ed6', '#f2d16b', 0, 0, 0, 0.75).mesh();
      return raised(0.12, '#8fd36a', 1.1, 0.8, 0.08, {
        parts: [b.mesh(), wheel, picker],
        update(t) {
          wheel.rotation.z = t * 0.5;
          picker.position.set(-0.36 + Math.sin(t * 0.5) * 0.12, Math.max(0, Math.sin(t * 3)) * 0.05, 0.32);
        },
      });
    },
  },
  {
    name: 'Lever de soleil',
    match: 'Lever de soleil sur le Bromo',
    dx: 0.46,
    dz: -0.08,
    size: 0.24,
    height: 1.3,
    build() {
      const b = new Builder();
      // La butte du point de vue de Penanjakan, sa rambarde et ses spectateurs emmitouflés
      b.cyl('#7a6a55', 0.3, 0.56, 0.4, 7, 0, 0.2, 0);
      b.cyl('#8fbf5a', 0.3, 0.3, 0.02, 7, 0, 0.405, 0);
      for (const x of [-0.24, -0.08, 0.08, 0.24]) b.box('#f1f3f5', 0.02, 0.1, 0.02, x, 0.46, -0.2);
      b.box('#f1f3f5', 0.52, 0.02, 0.02, 0, 0.5, -0.2);
      [['#e03131', -0.18], ['#ffd43b', -0.06], ['#1c7ed6', 0.06], ['#f06595', 0.18]].forEach(([c, x], i) => {
        person(b, c, null, x, 0.41, -0.08 + (i % 2) * 0.06, 0.7);
        b.cyl(c, 0.04, 0.04, 0.03, 6, x, 0.58, -0.08 + (i % 2) * 0.06);
      });
      b.cyl('#343a40', 0.006, 0.02, 0.14, 4, 0.2, 0.48, 0.14).box('#343a40', 0.05, 0.035, 0.04, 0.2, 0.56, 0.14); // appareil photo sur trépied
      const sun = new Builder();
      sun.cyl('#ff922b', 0.16, 0.16, 0.02, 12, 0, 0, 0, PI / 2);
      sun.cyl('#ffd43b', 0.12, 0.12, 0.026, 12, 0, 0, 0, PI / 2);
      for (let i = 0; i < 8; i++) sun.box('#ff922b', 0.09, 0.022, 0.016, Math.cos((i / 8) * PI * 2) * 0.23, Math.sin((i / 8) * PI * 2) * 0.23, 0, 0, 0, (i / 8) * PI * 2);
      const sunMesh = sun.mesh();
      const clouds = [puff(0.1), puff(0.1)];
      return raised(0.14, '#7a6a55', 1.0, 1.0, 0, {
        parts: [b.mesh(), sunMesh, ...clouds],
        update(t) {
          const k = (t * 0.12) % 1;
          sunMesh.position.set(0.3, 0.2 + Math.min(1, k * 2.2) * 0.62, -0.42);
          sunMesh.rotation.z = t * 0.3;
          sunMesh.scale.setScalar((0.9 + Math.sin(t * 3) * 0.06) * Math.min(1, (1 - k) * 8));
          // Mer de nuages au pied de la butte
          clouds.forEach((c, i) => {
            c.position.set(-0.5 + ((t * 0.04 + i * 0.5) % 1) * 1.0, 0.2, -0.3 - i * 0.12);
            c.scale.set(2.2, 0.6, 1);
          });
        },
      });
    },
  },
  {
    name: 'Tugu et Jalan Ijen',
    match: 'Jalan Ijen',
    dx: -0.76,
    dz: 0.12,
    size: 0.21,
    height: 0.85,
    build() {
      const b = new Builder();
      // Le bassin rond aux lotus et le monument du Tugu ; derrière, une villa hollandaise entre deux palmiers
      b.cyl('#ced4da', 0.4, 0.42, 0.05, 12, 0, 0.025, 0.1);
      b.cyl('#4dabf7', 0.36, 0.36, 0.02, 12, 0, 0.05, 0.1);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * PI * 2 + 0.3;
        b.cyl('#2f9e44', 0.05, 0.05, 0.012, 7, Math.cos(a) * 0.25, 0.062, 0.1 + Math.sin(a) * 0.25);
        if (i % 2 === 0) b.cone('#ff8fab', 0.03, 0.05, 6, Math.cos(a) * 0.25, 0.09, 0.1 + Math.sin(a) * 0.25, PI, 0, 0);
      }
      b.cyl('#f8f9fa', 0.09, 0.11, 0.08, 8, 0, 0.09, 0.1);
      b.cyl('#f8f9fa', 0.03, 0.06, 0.36, 4, 0, 0.31, 0.1, 0, PI / 4, 0);
      b.cone('#ffd43b', 0.04, 0.09, 6, 0, 0.535, 0.1);
      b.box('#fdfdf7', 0.44, 0.2, 0.2, 0, 0.1, -0.36);
      b.cyl('#b5523a', 0.08, 0.36, 0.14, 4, 0, 0.27, -0.36, 0, PI / 4, 0);
      b.box('#3d5a80', 0.07, 0.11, 0.02, 0, 0.06, -0.255).box('#3d5a80', 0.06, 0.07, 0.02, -0.14, 0.11, -0.255).box('#3d5a80', 0.06, 0.07, 0.02, 0.14, 0.11, -0.255);
      const palms = [palmTree(b, -0.42, -0.24, 0.5), palmTree(b, 0.42, -0.24, 0.56)];
      const jets = [puff(0.035), puff(0.035)];
      return {
        parts: [b.mesh(), ...palms, ...jets],
        update(t) {
          palms.forEach((p, i) => {
            p.rotation.z = Math.sin(t * 1.4 + i * 2) * 0.15;
            p.rotation.x = Math.cos(t * 1.1 + i) * 0.1;
          });
          jets.forEach((j, i) => {
            const life = (t * 0.8 + i * 0.5) % 1;
            j.position.set((i ? 0.16 : -0.16) * (1 - life * 0.5), 0.08 + Math.sin(life * PI) * 0.2, 0.1 + (i ? -0.1 : 0.12) * life);
            j.scale.setScalar(0.6 + Math.sin(life * PI) * 0.7);
          });
        },
      };
    },
  },
  {
    name: 'Kampung Jodipan',
    match: 'Kampung Warna-Warni',
    dx: -0.4,
    dz: 0.14,
    size: 0.22,
    height: 0.8,
    build() {
      const b = new Builder();
      // Maisons de toutes les couleurs étagées sur la berge de la rivière Brantas
      b.box('#4aa3d6', 1.2, 0.02, 0.2, 0, 0.01, 0.42);
      const paint = ['#ff6b6b', '#ffd43b', '#51cf66', '#4dabf7', '#f06595', '#ff922b', '#9775fa', '#20c997'];
      for (let r = 0; r < 3; r++) {
        const z = 0.2 - r * 0.2;
        b.box('#bdb7a9', 1.1, 0.12 * (r + 1), 0.2, 0, 0.06 * (r + 1) - 0.06, z);
        for (let i = 0; i < 5; i++) {
          const x = -0.42 + i * 0.21 + (r % 2) * 0.03;
          const h = 0.13 + ((i + r) % 3) * 0.03;
          b.box(paint[(i * 3 + r * 5) % 8], 0.17, h, 0.15, x, r * 0.12 + h / 2, z);
          b.box(paint[(i * 3 + r * 5 + 3) % 8], 0.19, 0.025, 0.17, x, r * 0.12 + h + 0.012, z);
          b.box('#ffffff', 0.04, 0.05, 0.01, x - 0.03, r * 0.12 + h * 0.55, z + 0.076);
        }
      }
      // Passerelle jaune au-dessus de la rivière
      b.box('#ffd43b', 0.09, 0.02, 0.36, 0.3, 0.1, 0.44);
      b.box('#e03131', 0.012, 0.05, 0.36, 0.255, 0.13, 0.44).box('#e03131', 0.012, 0.05, 0.36, 0.345, 0.13, 0.44);
      b.box('#868e96', 0.03, 0.1, 0.03, 0.3, 0.05, 0.58);
      const walker = person(new Builder(), '#e03131', '#f2d16b', 0, 0, 0, 0.55).mesh();
      // Cerf-volant au-dessus des toits
      const kite = new Builder().octa('#ff3b30', 0.07, 0, 0, 0, 1, 1.3, 0.2).box('#ffd43b', 0.012, 0.16, 0.012, 0, -0.16, 0).mesh();
      const kite2 = new Builder().octa('#4dabf7', 0.06, 0, 0, 0, 1, 1.3, 0.2).box('#ffffff', 0.012, 0.14, 0.012, 0, -0.14, 0).mesh();
      return {
        parts: [b.mesh(), walker, kite, kite2],
        update(t) {
          const u = (t * 0.15) % 1;
          walker.position.set(0.3, 0.11 + Math.abs(Math.sin(t * 6)) * 0.01, 0.6 - (u < 0.5 ? u : 1 - u) * 0.66);
          kite.position.set(-0.2 + Math.sin(t * 0.7) * 0.2, 0.68 + Math.sin(t * 1.4) * 0.06, -0.1);
          kite.rotation.z = Math.sin(t * 1.4) * 0.4;
          kite2.position.set(0.3 + Math.sin(t * 0.6 + 2) * 0.14, 0.6 + Math.cos(t * 1.2) * 0.05, -0.2);
          kite2.rotation.z = Math.cos(t * 1.2) * 0.4;
        },
      };
    },
  },
  {
    name: 'Cratère du Bromo',
    match: 'Mer de sable et cratère',
    dx: 0.44,
    dz: 0.28,
    size: 0.26,
    height: 0.8,
    build() {
      const b = new Builder();
      // Sur la mer de sable grise : le Bromo qui fume, le cône strié du Batok, le petit temple de Luhur Poten
      b.ball('#a39c93', 0.64, 0, 0, 0.05, 1, 0.05, 0.85, 1);
      b.cyl('#857d74', 0.2, 0.38, 0.28, 8, -0.22, 0.16, -0.14);
      b.cyl('#3b3632', 0.16, 0.16, 0.02, 8, -0.22, 0.295, -0.14);
      b.box('#f1e3c4', 0.05, 0.016, 0.3, -0.12, 0.17, 0.1, 0.8, 0, 0); // l'escalier de 250 marches
      b.cyl('#7d8a4f', 0.06, 0.25, 0.36, 10, 0.26, 0.2, -0.2);
      b.cyl('#5f6b3a', 0.055, 0.245, 0.37, 10, 0.26, 0.2, -0.2, 0, PI / 10, 0);
      b.box('#5a5148', 0.2, 0.04, 0.14, 0.2, 0.05, 0.22);
      b.pyr('#3b3632', 0.04, 0.09, 0.16, 0.12, 0.22).pyr('#3b3632', 0.03, 0.07, 0.25, 0.1, 0.22);
      // Cavaliers qui emmènent les visiteurs jusqu'au pied de l'escalier
      const riders = ['#8d5524', '#d9c8a0'].map((coat, i) => {
        const r = horse(new Builder(), coat, 0, 0, 0, 0.42);
        person(r, i ? '#e03131' : '#1c7ed6', null, 0, 0.19, 0, 0.55);
        return r.mesh();
      });
      const smoke = [puff(0.09), puff(0.09), puff(0.09)];
      return {
        parts: [b.mesh(), ...riders, ...smoke],
        update(t) {
          riders.forEach((r, i) => {
            const a = t * 0.5 + i * PI;
            r.position.set(0.08 + Math.cos(a) * 0.3, 0.035 + Math.abs(Math.sin(t * 8 + i)) * 0.015, 0.34 + Math.sin(a) * 0.1);
            r.rotation.y = -a - PI / 2;
          });
          smoke.forEach((s, i) => rise(s, (t * 0.2 + i / 3) % 1, -0.22, 0.3, -0.14, 0.5, 0.2, 1.5));
        },
      };
    },
  },
  {
    name: 'Bakso de Malang',
    match: 'Bakso de Malang',
    dx: -0.72,
    dz: 0.8,
    size: 0.21,
    height: 0.62,
    build() {
      const b = new Builder();
      // Grand bol de bouillon : boulettes, tofu, nouilles, ravioli frit ; à côté, une brochette de bakso grillé
      b.cyl('#fdfdf7', 0.32, 0.17, 0.2, 10, 0.06, 0.1, -0.04);
      b.cyl('#3d5a80', 0.325, 0.31, 0.03, 10, 0.06, 0.19, -0.04);
      b.cyl('#d9a441', 0.28, 0.28, 0.02, 10, 0.06, 0.205, -0.04);
      for (const [x, z] of [[-0.06, -0.12], [0.16, -0.14], [0.2, 0.06]]) b.ball('#9a7b6a', 0.075, x, 0.23, z);
      b.box('#f8e3b0', 0.1, 0.07, 0.08, -0.08, 0.23, 0.06, 0, 0.4, 0);
      for (let i = 0; i < 4; i++) b.box('#ffe066', 0.2, 0.02, 0.025, 0.04 + (i % 2) * 0.03, 0.225, 0.08 + i * 0.03, 0, 0.5 * (i % 2 ? 1 : -1), 0);
      b.poly('#e8a33d', [[-0.07, 0], [0.07, 0], [0, 0.1]], 0.02, 0.24, 0.25, -0.06, -0.6, 0.4, 0);
      b.ball('#51cf66', 0.025, 0.02, 0.23, -0.02).ball('#51cf66', 0.025, 0.12, 0.23, 0.0).ball('#51cf66', 0.02, -0.1, 0.23, -0.02);
      b.cyl('#e9ecef', 0.16, 0.13, 0.02, 8, -0.3, 0.01, 0.32);
      b.box('#f0d58c', 0.4, 0.012, 0.012, -0.28, 0.05, 0.32, 0, 0.3, 0);
      for (let i = 0; i < 3; i++) b.ball('#7b3f1d', 0.05, -0.38 + i * 0.09, 0.06, 0.35 - i * 0.028);
      const ball = new Builder().ball('#9a7b6a', 0.075, 0, 0, 0).mesh();
      const steam = [puff(0.06), puff(0.06), puff(0.06)];
      return {
        parts: [b.mesh(), ball, ...steam],
        update(t) {
          ball.position.set(0.04, 0.23 + Math.sin(t * 2.2) * 0.025, -0.02);
          ball.rotation.y = t;
          steam.forEach((s, i) => rise(s, (t * 0.4 + i / 3) % 1, -0.04 + i * 0.1, 0.24, -0.04, 0.42, 0.08, 1.1));
        },
      };
    },
  },
  {
    name: 'Train de Yogyakarta',
    match: 'Arriver en train',
    dx: -0.5,
    dz: 0.48,
    size: 0.23,
    height: 0.55,
    build() {
      const b = new Builder();
      b.box('#8a837b', 1.3, 0.02, 0.2, 0, 0.01, 0.1);
      b.box('#495057', 1.3, 0.014, 0.014, 0, 0.03, 0.05).box('#495057', 1.3, 0.014, 0.014, 0, 0.03, 0.15);
      for (let i = -5; i <= 5; i++) b.box('#6b4423', 0.03, 0.012, 0.16, i * 0.12, 0.022, 0.1);
      // Quai et abri de la gare
      b.box('#e9ecef', 0.7, 0.05, 0.16, 0, 0.025, -0.12);
      for (const x of [-0.28, 0.28]) b.box('#1c7ed6', 0.025, 0.24, 0.025, x, 0.17, -0.14);
      b.box('#1c7ed6', 0.74, 0.03, 0.22, 0, 0.3, -0.12, 0.15, 0, 0);
      person(b, '#f06595', null, -0.1, 0.05, -0.1, 0.65);
      person(b, '#51cf66', null, 0.04, 0.05, -0.12, 0.65);
      b.box('#c49a4a', 0.06, 0.07, 0.04, 0.12, 0.085, -0.1);
      b.cyl('#495057', 0.01, 0.01, 0.3, 4, 0.52, 0.15, -0.06);
      // Le Malioboro Ekspres : locomotive et deux voitures blanches à bandes bleue et orange
      const tr = new Builder();
      for (let i = 0; i < 3; i++) {
        const x = 0.33 - i * 0.33;
        tr.box(i ? '#f8f9fa' : '#e9ecef', 0.3, 0.13, 0.12, x, 0.115, 0);
        tr.box('#1c4fa0', 0.302, 0.03, 0.122, x, 0.09, 0);
        tr.box('#ff922b', 0.302, 0.012, 0.122, x, 0.066, 0);
        tr.box(i ? '#343a40' : '#a5d8ff', i ? 0.24 : 0.06, 0.035, 0.123, i ? x : x + 0.1, 0.14, 0);
        tr.box('#adb5bd', 0.26, 0.015, 0.1, x, 0.187, 0);
        for (const dx of [-0.09, 0.09]) tr.cyl('#1d1d1d', 0.025, 0.025, 0.13, 6, x + dx, 0.03, 0, PI / 2);
      }
      tr.box('#ff922b', 0.02, 0.07, 0.122, 0.485, 0.1, 0);
      const train = tr.mesh();
      const light = new Builder().ball('#ff3b30', 0.03, 0, 0, 0).mesh(0.52, 0.32, -0.06);
      return {
        parts: [b.mesh(), train, light],
        update(t) {
          // Le train entre en gare, marque l'arrêt, repart
          const k = (t * 0.1) % 1;
          const u = k < 0.35 ? (k / 0.35) ** 0.6 * 0.5 : k < 0.6 ? 0.5 : 0.5 + ((k - 0.6) / 0.4) ** 1.8 * 0.5;
          train.position.set(-0.56 + u * 1.12, 0.035, 0.1);
          train.scale.setScalar(Math.min(1, Math.min(u, 1 - u) * 5));
          light.scale.setScalar(Math.sin(t * 6) > 0 ? 1.3 : 0.5);
        },
      };
    },
  },
  {
    name: 'Pasir Berbisik',
    match: 'Pasir Berbisik',
    dx: 0.46,
    dz: 0.62,
    size: 0.22,
    height: 0.6,
    build() {
      const b = new Builder();
      // Les « sables qui murmurent » et, au fond, les collines rondes de la savane
      b.ball('#a8a198', 0.62, 0, 0, 0.04, 1, 0.05, 0.8, 1);
      for (const [x, z, r] of [[-0.3, 0.2, 0.3], [0.2, 0.34, 0.24], [0.34, -0.02, 0.2], [-0.1, 0.0, 0.2]]) b.box('#8f887f', r, 0.012, 0.025, x, 0.035, z, 0, 0.3, 0);
      b.ball('#8fd36a', 0.22, -0.36, 0.12, -0.26, 1.1, 0.9, 1, 1);
      b.ball('#a5dc5f', 0.26, 0.0, 0.14, -0.32, 1.1, 0.95, 1, 1);
      b.ball('#8fd36a', 0.2, 0.38, 0.1, -0.24, 1.1, 0.85, 1, 1);
      const jeeps = [jeepMesh('#e03131'), jeepMesh('#1c7ed6')];
      const dust = [puff(0.05), puff(0.05)];
      return {
        parts: [b.mesh(), ...jeeps, ...dust],
        update(t) {
          jeeps.forEach((jeep, i) => {
            const a = t * 0.7 + i * 2.4;
            jeep.position.set(Math.cos(a) * 0.36, 0.035 + Math.abs(Math.sin(t * 8 + i)) * 0.02, 0.14 + Math.sin(a) * 0.2);
            jeep.rotation.y = -a - PI / 2;
            jeep.rotation.z = Math.sin(t * 8 + i) * 0.05;
            const k = (t * 1.5 + i * 0.5) % 1;
            dust[i].position.set(Math.cos(a - 0.55) * 0.36, 0.07 + k * 0.08, 0.14 + Math.sin(a - 0.55) * 0.2);
            dust[i].scale.setScalar((0.5 + k) * Math.sin(k * PI));
          });
        },
      };
    },
  },
];

// ---------- Tumpak Sewu : les cascades au pied du Semeru ----------

// Traits d'écume d'une chute : petits pavés blancs espacés de 0,3, à faire descendre en boucle de 0,3.
function streaks(s, x, z, top, ry = 0, w = 0.06) {
  for (let y = 0.1; y < top; y += 0.3) s.box('#ffffff', w, 0.1, 0.02, x + (Math.round(y * 10) % 2 ? 0.02 : -0.02), y, z, 0, ry, 0);
  return s;
}

const TUMPAK_SEWU = [
  {
    name: 'Kapas Biru',
    match: 'Cascade de Kapas Biru',
    dx: -1.15,
    dz: -0.3,
    size: 0.3,
    height: 1.22,
    build() {
      const b = new Builder();
      // Chute haute et fine contre une paroi orangée, rizières en gradins juste avant l'arrivée
      b.box('#c98a4b', 0.44, 1.05, 0.26, 0, 0.525, -0.26);
      b.box('#b5763a', 0.3, 0.84, 0.22, -0.32, 0.42, -0.2).box('#d49a5a', 0.28, 0.72, 0.22, 0.32, 0.36, -0.18);
      b.ball('#2f9e44', 0.2, -0.06, 1.08, -0.26, 1.3, 0.6, 1).ball('#40c057', 0.15, -0.34, 0.88, -0.2, 1.2, 0.6, 1).ball('#37b24d', 0.14, 0.34, 0.76, -0.18, 1.2, 0.6, 1);
      b.box('#8fe3f7', 0.09, 1.05, 0.03, 0, 0.525, -0.115);
      b.cyl('#3ccbe6', 0.2, 0.2, 0.02, 9, 0, 0.03, 0.04);
      b.box('#69db7c', 0.5, 0.07, 0.16, -0.28, 0.035, 0.34).box('#8ce99a', 0.4, 0.04, 0.14, -0.2, 0.02, 0.48);
      b.box('#a67c52', 0.5, 0.02, 0.02, -0.28, 0.075, 0.26).box('#a67c52', 0.4, 0.02, 0.02, -0.2, 0.045, 0.41);
      // Échelle de bambou du sentier
      for (const x of [0.3, 0.38]) b.box('#d9b36a', 0.018, 0.5, 0.018, x, 0.24, 0.0, 0.25, 0, 0);
      for (let i = 0; i < 5; i++) b.box('#d9b36a', 0.1, 0.014, 0.014, 0.34, 0.06 + i * 0.09, 0.05 - i * 0.022);
      const fall = streaks(new Builder(), 0, -0.09, 1.3).mesh();
      const foam = new Builder().ball('#ffffff', 0.07, -0.05, 0, 0).ball('#ffffff', 0.08, 0.05, 0.01, 0.03).mesh(0, 0.06, -0.04);
      const hiker = person(new Builder(), '#e8590c', '#f2d16b', 0, 0, 0, 0.6).mesh();
      return {
        parts: [b.mesh(), fall, foam, hiker],
        update(t) {
          fall.position.y = -((t * 0.7) % 1) * 0.3;
          foam.scale.set(1 + Math.sin(t * 5) * 0.2, 0.8 + Math.sin(t * 7) * 0.3, 1 + Math.cos(t * 4) * 0.15);
          hiker.position.set(-0.28 + Math.sin(t * 0.4) * 0.2, 0.08 + Math.abs(Math.sin(t * 6)) * 0.012, 0.34);
        },
      };
    },
  },
  {
    name: 'Tumpak Sewu',
    match: 'Point de vue panoramique',
    dx: -0.52,
    dz: 0.0,
    size: 0.34,
    height: 1.4,
    build() {
      const b = new Builder();
      // Falaise en fer à cheval couverte de jungle : un rideau de chutes côte à côte
      // Le terrain monte vers le Semeru : tout est surélevé de L sur un socle de roche pour que le bassin reste visible.
      const L = 0.28;
      const R = 0.44;
      const s = new Builder();
      b.cyl('#6f675c', 0.6, 0.7, 0.6, 10, 0, -0.3, -0.06);
      b.box('#3ccbe6', 0.16, 0.5, 0.02, 0, -0.2, 0.555);
      b.cyl('#4f6f3a', 0.56, 0.6, 0.05, 10, 0, 0.025, -0.06);
      b.cyl('#3ccbe6', 0.3, 0.3, 0.02, 10, 0, 0.055, -0.08);
      b.box('#3ccbe6', 0.16, 0.02, 0.42, 0, 0.05, 0.34);
      for (let i = 0; i < 7; i++) {
        const th = (-1 + i / 3) * 1.7;
        const x = Math.sin(th) * R;
        const z = -Math.cos(th) * R;
        const h = 0.92 - Math.abs(i - 3) * 0.07;
        b.box(i % 2 ? '#7a6f62' : '#8a7f72', 0.32, h, 0.18, x, h / 2, z, 0, -th, 0);
        b.ball(i % 2 ? '#2f9e44' : '#40c057', 0.19, x * 1.06, h + 0.02, z * 1.06, 1.2, 0.55, 1.2);
        const xi = Math.sin(th) * (R - 0.1);
        const zi = -Math.cos(th) * (R - 0.1);
        b.box('#8fe3f7', 0.12, h - 0.04, 0.03, xi, (h - 0.04) / 2 + 0.03, zi, 0, -th, 0);
        b.box('#8fe3f7', 0.03, h - 0.1, 0.03, xi + Math.cos(th) * 0.11, (h - 0.1) / 2 + 0.03, zi + Math.sin(th) * 0.11, 0, -th, 0);
        streaks(s, Math.sin(th) * (R - 0.125), -Math.cos(th) * (R - 0.125), 1.2, -th, 0.05);
      }
      // Plateforme du point de vue, en bambou
      b.box('#d9b36a', 0.3, 0.03, 0.2, -0.44, 0.3, 0.44);
      for (const [x, z] of [[-0.57, 0.36], [-0.31, 0.36], [-0.57, 0.52], [-0.31, 0.52]]) b.cyl('#c49a4a', 0.014, 0.014, 0.6, 4, x, 0.0, z);
      b.box('#c49a4a', 0.3, 0.015, 0.015, -0.44, 0.4, 0.35);
      person(b, '#e03131', null, -0.5, 0.315, 0.44, 0.6);
      person(b, '#ffd43b', '#f2d16b', -0.38, 0.315, 0.46, 0.6);
      const fall = s.mesh();
      const foam = new Builder().ball('#ffffff', 0.08, -0.14, 0, -0.2).ball('#ffffff', 0.09, 0.02, 0.01, -0.28).ball('#e6fbff', 0.08, 0.16, 0, -0.2).ball('#ffffff', 0.06, -0.24, 0, -0.06).ball('#ffffff', 0.06, 0.25, 0, -0.06).mesh(0, 0.08 + L, 0);
      const mist = [puff(0.1), puff(0.1)];
      const cliff = b.mesh(0, L, 0);
      return {
        parts: [cliff, fall, foam, ...mist],
        update(t) {
          fall.position.y = L - ((t * 0.6) % 1) * 0.3;
          foam.scale.set(1 + Math.sin(t * 4) * 0.08, 0.8 + Math.sin(t * 6) * 0.3, 1 + Math.cos(t * 5) * 0.08);
          mist.forEach((m, i) => rise(m, (t * 0.18 + i * 0.5) % 1, i ? 0.1 : -0.1, 0.1 + L, -0.1, 0.6, i ? 0.1 : -0.1, 1.4));
        },
      };
    },
  },
  {
    name: 'Descente',
    match: 'Descente au pied',
    dx: -1.0,
    dz: 0.14,
    size: 0.3,
    height: 1.0,
    build() {
      const b = new Builder();
      // Paroi moussue : échelle de bambou, corde fixée à la roche, ruisseau qui coule sur les marches
      b.box('#7d7468', 0.84, 0.82, 0.3, 0, 0.41, -0.26);
      b.box('#8a8175', 0.5, 0.42, 0.28, -0.2, 0.21, 0.0);
      b.ball('#40c057', 0.16, -0.3, 0.84, -0.26, 1.3, 0.5, 1).ball('#2f9e44', 0.14, 0.26, 0.84, -0.28, 1.3, 0.5, 1).ball('#37b24d', 0.1, -0.4, 0.44, 0.02, 1.2, 0.5, 1);
      b.box('#8fe3f7', 0.12, 0.42, 0.02, -0.2, 0.21, 0.145).box('#8fe3f7', 0.12, 0.02, 0.28, -0.2, 0.425, 0.0).box('#8fe3f7', 0.12, 0.4, 0.02, -0.2, 0.62, -0.105);
      b.ball('#3ccbe6', 0.4, 0.0, 0.0, 0.34, 1.2, 0.04, 0.5, 1);
      for (const x of [0.16, 0.26]) b.box('#d9b36a', 0.02, 0.86, 0.02, x, 0.42, -0.06, 0.12, 0, 0);
      for (let i = 0; i < 8; i++) b.box('#d9b36a', 0.12, 0.016, 0.016, 0.21, 0.08 + i * 0.1, -0.015 - i * 0.012);
      b.box('#e03131', 0.014, 0.8, 0.014, 0.33, 0.44, -0.08, 0.12, 0, 0); // corde fixée à la paroi
      b.ball('#6f675c', 0.07, 0.38, 0.04, 0.2, 1.2, 0.8, 1).ball('#6f675c', 0.05, -0.42, 0.03, 0.3);
      const climber = person(new Builder(), '#ff922b', null, 0, 0, 0, 0.6).box('#1c7ed6', 0.06, 0.07, 0.04, 0, 0.07, -0.04).mesh();
      const wader = person(new Builder(), '#f06595', '#f2d16b', 0, 0, 0, 0.6).mesh();
      const fall = streaks(new Builder(), -0.2, 0.16, 0.42).mesh();
      return {
        parts: [b.mesh(), climber, wader, fall],
        update(t) {
          const k = 0.5 + Math.sin(t * 0.5) * 0.5;
          climber.position.set(0.21 + Math.sin(t * 5) * 0.012, 0.08 + k * 0.62, 0.03 - k * 0.07);
          wader.position.set(0.05 + Math.sin(t * 0.4) * 0.22, 0.0 + Math.abs(Math.sin(t * 4)) * 0.01, 0.36);
          fall.position.y = -((t * 0.8) % 1) * 0.3 + 0.1;
        },
      };
    },
  },
  {
    name: 'Goa Tetes',
    match: 'Goa Tetes',
    dx: -0.55,
    dz: 0.46,
    size: 0.28,
    height: 0.85,
    build() {
      const b = new Builder();
      // Paroi de concrétions orangées où l'eau ruisselle devant de petites grottes
      const tones = ['#d9933d', '#e3a857', '#c9822f'];
      for (let r = 0; r < 4; r++) {
        const n = 4 - (r > 1 ? 1 : 0);
        for (let i = 0; i < n; i++) b.ball(tones[(i + r) % 3], 0.2, (i - (n - 1) / 2) * 0.27, 0.1 + r * 0.18, 0.06 - r * 0.1, 1.15, 0.75, 0.9);
      }
      b.ball('#3b2a1e', 0.07, -0.2, 0.24, 0.17, 1.2, 1, 0.5).ball('#3b2a1e', 0.06, 0.16, 0.42, 0.06, 1.2, 1, 0.5).ball('#3b2a1e', 0.05, -0.05, 0.58, -0.03, 1.2, 1, 0.5);
      b.ball('#40c057', 0.12, -0.26, 0.78, -0.24, 1.3, 0.5, 1).ball('#2f9e44', 0.13, 0.2, 0.78, -0.24, 1.3, 0.5, 1);
      for (const [x, y, z] of [[-0.34, 0.2, 0.2], [0.02, 0.2, 0.21], [0.34, 0.18, 0.2], [0.06, 0.4, 0.1], [-0.3, 0.4, 0.1]]) b.box('#bdf0fa', 0.022, 0.2, 0.015, x, y, z);
      b.ball('#3ccbe6', 0.34, 0, 0, 0.36, 1.3, 0.04, 0.45, 1);
      const drops = [0, 1, 2].map(() => new Builder().octa('#8fe3f7', 0.03, 0, 0, 0, 0.7, 1.4, 0.7).mesh());
      const visitor = person(new Builder(), '#1c7ed6', null, 0, 0, 0, 0.6).cyl('#ffd43b', 0.035, 0.04, 0.03, 6, 0, 0.165, 0).mesh();
      return {
        parts: [b.mesh(), ...drops, visitor],
        update(t) {
          drops.forEach((d, i) => {
            const k = (t * 0.9 + i * 0.37) % 1;
            d.position.set(-0.2 + i * 0.2, 0.5 - i * 0.08 - k * k * 0.4, 0.2 + (i === 1 ? 0.0 : 0.02));
            d.scale.setScalar(k < 0.9 ? 1 : (1 - k) * 10);
          });
          visitor.position.set(0.3 + Math.sin(t * 0.5) * 0.1, 0.01, 0.42);
          visitor.rotation.x = -0.2 + Math.sin(t * 1.2) * 0.1;
        },
      };
    },
  },
  {
    name: 'Nuit à Pronojiwo',
    match: 'Dormir à Pronojiwo',
    dx: -1.1,
    dz: 0.56,
    size: 0.27,
    height: 0.72,
    build() {
      const b = new Builder();
      // Petite pension de village : maison claire à toit de tuiles, véranda, hamac sous le bananier
      b.box('#8d5a2b', 0.62, 0.05, 0.5, -0.12, 0.025, -0.08);
      b.box('#fdf3d6', 0.5, 0.24, 0.34, -0.12, 0.17, -0.14);
      b.poly('#c0492b', [[-0.24, 0], [0.24, 0], [0, 0.18]], 0.58, -0.12, 0.29, -0.14, 0, PI / 2, 0);
      b.box('#6b4423', 0.09, 0.15, 0.02, -0.12, 0.125, 0.035);
      b.box('#74c0fc', 0.08, 0.08, 0.02, -0.28, 0.17, 0.035).box('#74c0fc', 0.08, 0.08, 0.02, 0.04, 0.17, 0.035);
      for (const x of [-0.38, 0.14]) b.cyl('#6b4423', 0.014, 0.014, 0.22, 4, x, 0.16, 0.14);
      b.box('#c0492b', 0.6, 0.02, 0.16, -0.12, 0.27, 0.1, 0.3, 0, 0);
      b.box('#ffd43b', 0.14, 0.07, 0.015, 0.3, 0.2, 0.12).cyl('#6b4423', 0.008, 0.008, 0.2, 4, 0.3, 0.1, 0.12); // pancarte
      b.cyl('#b5523a', 0.03, 0.03, 0.1, 5, -0.3, 0.42, -0.2); // cheminée de la cuisine
      for (const x of [0.2, 0.52]) b.cyl('#6b4423', 0.014, 0.014, 0.26, 4, x, 0.13, 0.36);
      const leaves = palmTree(b, 0.44, -0.12, 0.36);
      // Hamac et son dormeur
      const h = new Builder();
      h.box('#4dabf7', 0.3, 0.02, 0.1, 0, -0.07, 0).box('#f8f9fa', 0.3, 0.022, 0.03, 0, -0.07, 0);
      h.box('#adb5bd', 0.02, 0.09, 0.012, -0.15, -0.03, 0, 0, 0, -0.3).box('#adb5bd', 0.02, 0.09, 0.012, 0.15, -0.03, 0, 0, 0, 0.3);
      h.ball('#f2b98a', 0.035, -0.09, -0.035, 0).box('#e8590c', 0.16, 0.035, 0.06, 0.03, -0.045, 0);
      const hammock = h.mesh(0.36, 0.25, 0.36);
      const smoke = [puff(0.05), puff(0.05)];
      return {
        parts: [b.mesh(), leaves, hammock, ...smoke],
        update(t) {
          leaves.rotation.z = Math.sin(t * 1.4) * 0.14;
          leaves.rotation.x = Math.cos(t * 1.1) * 0.1;
          hammock.rotation.x = Math.sin(t * 1.8) * 0.4;
          smoke.forEach((s, i) => rise(s, (t * 0.3 + i * 0.5) % 1, -0.3, 0.48, -0.2, 0.4, 0.1, 1.1));
        },
      };
    },
  },
];

// ---------- Surabaya : le port, les vieux quartiers du nord et le pont vers Madura ----------

const SURAMADU_ANGLE = 0.62; // le pont file vers le nord-est, de Surabaya à Madura

const SURABAYA = [
  {
    name: 'Pont Suramadu',
    match: 'Pont Suramadu',
    dx: 0.28,
    dz: -0.14,
    size: 0.3,
    height: 0.95,
    build() {
      const b = new Builder();
      // Pont à haubans construit le long de x, puis tourné vers Madura
      b.box('#adb5bd', 1.4, 0.04, 0.2, 0, 0.3, 0);
      b.box('#ffd43b', 1.4, 0.012, 0.015, 0, 0.325, 0);
      for (const x of [-0.62, -0.44, 0.44, 0.62]) b.box('#868e96', 0.05, 0.3, 0.16, x, 0.15, 0);
      for (const x of [-0.22, 0.22]) {
        for (const z of [-1, 1]) b.box('#f1f3f5', 0.06, 0.82, 0.05, x, 0.41, z * 0.1, z * 0.07, 0, 0);
        b.box('#f1f3f5', 0.07, 0.05, 0.16, x, 0.8, 0).box('#f1f3f5', 0.07, 0.04, 0.2, x, 0.5, 0);
        for (const dir of [-1, 1]) {
          for (let k = 1; k <= 3; k++) {
            const d = k * 0.11;
            for (const z of [-0.085, 0.085]) b.box('#e03131', 0.012, Math.hypot(d, 0.44), 0.012, x + (dir * d) / 2, 0.54, z, 0, 0, dir * Math.atan(d / 0.44));
          }
        }
      }
      const bridge = b.mesh();
      bridge.rotation.y = SURAMADU_ANGLE;
      const cos = Math.cos(SURAMADU_ANGLE);
      const sin = Math.sin(SURAMADU_ANGLE);
      const cars = [carMesh('#e03131'), carMesh('#ffd43b'), carMesh('#1c7ed6')];
      const s = new Builder();
      s.poly('#f8f9fa', [[-0.14, 0.06], [0.16, 0.06], [0.1, -0.02], [-0.1, -0.02]], 0.1);
      s.box('#1c7ed6', 0.12, 0.06, 0.08, -0.03, 0.09, 0).box('#e03131', 0.3, 0.015, 0.102, 0.01, 0.06, 0);
      const boat = s.mesh();
      return {
        parts: [bridge, ...cars, boat],
        update(t) {
          cars.forEach((c, i) => {
            const dir = i % 2 ? -1 : 1;
            const k = (t * 0.14 + i * 0.37) % 1;
            const u = (k - 0.5) * 1.3 * dir;
            const w = dir * 0.05;
            c.position.set(u * cos + w * sin, 0.32, -u * sin + w * cos);
            c.rotation.y = SURAMADU_ANGLE + (dir > 0 ? 0 : PI);
            c.scale.setScalar(0.42 * Math.min(1, Math.min(k, 1 - k) * 10));
          });
          // Un bateau passe sous le tablier
          const k = (t * 0.08) % 1;
          const w = (k - 0.5) * 0.9;
          boat.position.set(w * sin + 0.02 * cos, 0.02 + Math.sin(t * 2.2) * 0.008, w * cos - 0.02 * sin);
          boat.rotation.y = SURAMADU_ANGLE - PI / 2;
          boat.rotation.z = Math.sin(t * 2) * 0.06;
          boat.scale.setScalar(Math.min(1, Math.min(k, 1 - k) * 8));
        },
      };
    },
  },
  {
    name: 'Monument des héros',
    match: 'Monument des héros',
    dx: -0.78,
    dz: 0.02,
    size: 0.22,
    height: 1.7,
    build() {
      const b = new Builder();
      b.cyl('#9ad17a', 0.56, 0.56, 0.03, 12, 0, 0.015, 0);
      b.cyl('#e9ecef', 0.2, 0.24, 0.08, 10, 0, 0.07, 0);
      // La colonne blanche, effilée, en souvenir de novembre 1945
      b.cyl('#fdfdf7', 0.045, 0.11, 1.16, 10, 0, 0.69, 0);
      b.cone('#fdfdf7', 0.045, 0.14, 10, 0, 1.34, 0);
      for (let i = 0; i < 6; i++) b.ball('#2f9e44', 0.06, Math.cos((i / 6) * PI * 2 + 0.5) * 0.48, 0.07, Math.sin((i / 6) * PI * 2 + 0.5) * 0.48, 1, 1.1, 1);
      b.cyl('#adb5bd', 0.008, 0.008, 0.7, 4, 0.4, 0.35, 0.22);
      const banner = flag('#e03131', '#ffffff', 0.24, 0.14);
      banner.position.set(0.4, 0.63, 0.22);
      const ring = new Builder();
      ['#1c7ed6', '#f06595', '#ffd43b', '#51cf66'].forEach((c, i) => person(ring, c, null, Math.cos((i * PI) / 2) * 0.34, 0, Math.sin((i * PI) / 2) * 0.34, 0.65));
      const visitors = ring.mesh(0, 0.03, 0);
      return raised(0.15, '#7fc556', 1.16, 1.16, 0, {
        parts: [b.mesh(), banner, visitors],
        update(t) {
          banner.rotation.y = Math.sin(t * 2.4) * 0.5;
          visitors.rotation.y = t * 0.3;
          visitors.position.y = 0.03 + Math.abs(Math.sin(t * 5)) * 0.01;
        },
      });
    },
  },
  {
    name: "Quartier d'Ampel",
    match: 'Quartier arabe',
    dx: -0.4,
    dz: 0.16,
    size: 0.23,
    height: 1.15,
    build() {
      const b = new Builder();
      // Mosquée de Sunan Ampel : murs blancs, toit javanais à trois étages, minaret ; devant, la ruelle des échoppes
      b.box('#fdfdf7', 0.6, 0.2, 0.44, -0.14, 0.1, -0.18);
      for (const x of [-0.32, -0.14, 0.04]) b.box('#1f6b33', 0.08, 0.12, 0.02, x, 0.07, 0.045);
      b.cyl('#a0522d', 0.3, 0.5, 0.1, 4, -0.14, 0.25, -0.18, 0, PI / 4, 0);
      b.box('#fdfdf7', 0.34, 0.05, 0.3, -0.14, 0.31, -0.18);
      b.cyl('#a0522d', 0.16, 0.33, 0.1, 4, -0.14, 0.38, -0.18, 0, PI / 4, 0);
      b.box('#fdfdf7', 0.18, 0.05, 0.16, -0.14, 0.44, -0.18);
      b.cyl('#a0522d', 0.02, 0.18, 0.16, 4, -0.14, 0.54, -0.18, 0, PI / 4, 0);
      b.cone('#ffd43b', 0.025, 0.08, 5, -0.14, 0.66, -0.18);
      b.cyl('#fdfdf7', 0.05, 0.065, 0.66, 8, 0.36, 0.33, -0.26);
      b.cyl('#d3f9d8', 0.085, 0.085, 0.03, 8, 0.36, 0.56, -0.26);
      b.cone('#2f9e44', 0.065, 0.16, 8, 0.36, 0.74, -0.26);
      // Échoppes : auvents rayés, dattes, flacons de parfum, tapis roulés
      for (const [x, c] of [[-0.36, '#2f9e44'], [0.3, '#e03131']]) {
        for (let i = 0; i < 4; i++) b.box(i % 2 ? '#ffffff' : c, 0.075, 0.02, 0.16, x - 0.11 + i * 0.075, 0.24, 0.3, 0.3, 0, 0);
        for (const px of [-0.14, 0.14]) b.cyl('#6b4423', 0.01, 0.01, 0.24, 4, x + px, 0.12, 0.24);
        b.box('#8d5a2b', 0.28, 0.08, 0.1, x, 0.04, 0.28);
      }
      b.ball('#5a3217', 0.05, -0.42, 0.1, 0.28, 1.2, 0.6, 1).ball('#5a3217', 0.05, -0.3, 0.1, 0.28, 1.2, 0.6, 1);
      b.box('#ffd43b', 0.03, 0.06, 0.03, 0.22, 0.11, 0.28).box('#f06595', 0.03, 0.05, 0.03, 0.28, 0.105, 0.28).box('#4dabf7', 0.03, 0.07, 0.03, 0.34, 0.115, 0.28);
      b.cyl('#c92a2a', 0.03, 0.03, 0.16, 6, 0.44, 0.08, 0.26).cyl('#2f9e44', 0.03, 0.03, 0.14, 6, 0.5, 0.07, 0.28);
      const pilgrims = [0, 1].map(() => person(new Builder(), '#f8f9fa', null, 0, 0, 0, 0.7).cyl('#f8f9fa', 0.04, 0.04, 0.03, 6, 0, 0.175, 0).mesh());
      return raised(0.2, '#cfc8b8', 1.2, 1.0, 0.02, {
        parts: [b.mesh(), ...pilgrims],
        update(t) {
          pilgrims.forEach((p, i) => {
            p.position.set(Math.sin(t * 0.4 + i * 2.6) * 0.42, Math.abs(Math.sin(t * 5 + i)) * 0.012, 0.42 + i * 0.08);
          });
        },
      });
    },
  },
  {
    name: 'Pont rouge',
    match: 'Pont rouge',
    dx: -0.74,
    dz: 0.56,
    size: 0.22,
    height: 0.9,
    build() {
      const b = new Builder();
      // Le canal, le pont aux rambardes rouges ; à l'ouest une maison de commerce hollandaise, à l'est la porte du quartier chinois
      b.box('#4aa3d6', 0.24, 0.02, 0.96, 0, 0.01, 0);
      b.box('#868e96', 0.6, 0.04, 0.2, 0, 0.1, 0.12);
      for (const x of [-0.12, 0.12]) b.box('#868e96', 0.04, 0.1, 0.18, x, 0.05, 0.12);
      for (const z of [0.03, 0.21]) {
        b.box('#e03131', 0.6, 0.03, 0.02, 0, 0.17, z);
        for (let i = -3; i <= 3; i++) b.box(i % 3 === 0 ? '#ffffff' : '#e03131', 0.02, 0.07, 0.02, i * 0.095, 0.14, z);
      }
      b.box('#fdfdf7', 0.34, 0.26, 0.26, -0.42, 0.13, -0.2);
      b.cyl('#b5523a', 0.06, 0.28, 0.12, 4, -0.42, 0.32, -0.2, 0, PI / 4, 0);
      for (const x of [-0.52, -0.42, -0.32]) b.box('#3d5a80', 0.05, 0.12, 0.02, x, 0.12, -0.065);
      // Porte de Kembang Jepun
      for (const x of [0.28, 0.56]) b.cyl('#c92a2a', 0.025, 0.025, 0.4, 6, x, 0.2, -0.16);
      b.box('#c92a2a', 0.36, 0.05, 0.05, 0.42, 0.38, -0.16);
      b.box('#2f9e44', 0.46, 0.04, 0.14, 0.42, 0.43, -0.16);
      b.box('#ffd43b', 0.05, 0.05, 0.14, 0.19, 0.46, -0.16).box('#ffd43b', 0.05, 0.05, 0.14, 0.65, 0.46, -0.16);
      b.box('#2f9e44', 0.24, 0.04, 0.1, 0.42, 0.49, -0.16).box('#ffd43b', 0.14, 0.03, 0.03, 0.42, 0.525, -0.16);
      const lanterns = new Builder();
      for (let i = -1; i <= 1; i++) lanterns.ball('#ff3b30', 0.035, i * 0.09, -0.04, 0, 1, 1.2, 1).box('#ffd43b', 0.012, 0.03, 0.012, i * 0.09, -0.085, 0);
      const garland = lanterns.mesh(0.42, 0.355, -0.16);
      const becak = becakMesh('#1c7ed6', '#ffd43b');
      const s = new Builder();
      s.poly('#8d5a2b', [[-0.12, 0.05], [0.12, 0.05], [0.08, -0.02], [-0.08, -0.02]], 0.08, 0, 0, 0, 0, PI / 2, 0);
      person(s, '#f8f9fa', '#f2d16b', 0, 0.03, 0, 0.5);
      const boat = s.mesh();
      return raised(0.18, '#cfc8b8', 1.3, 0.98, 0, {
        parts: [b.mesh(), garland, becak, boat],
        update(t) {
          garland.rotation.x = Math.sin(t * 1.6) * 0.3;
          const u = (t * 0.14) % 1;
          becak.position.set(-0.55 + u * 1.1, 0.12, 0.12);
          becak.scale.setScalar(0.8 * Math.min(1, Math.min(u, 1 - u) * 10));
          const k = (t * 0.07 + 0.3) % 1;
          boat.position.set(Math.sin(t) * 0.02, 0.03, 0.44 - k * 0.88);
          boat.scale.setScalar(Math.min(1, Math.min(k, 1 - k) * 8));
        },
      });
    },
  },
  {
    name: 'Mosquée Cheng Hoo',
    match: 'Mosquée Cheng Hoo',
    dx: -0.2,
    dz: 0.48,
    size: 0.21,
    height: 1.1,
    build() {
      const b = new Builder();
      // Petite mosquée-pagode rouge, verte et jaune
      b.box('#f1e3c4', 0.76, 0.05, 0.66, 0, 0.025, 0);
      b.box('#c92a2a', 0.5, 0.22, 0.42, 0, 0.16, -0.02);
      b.box('#ffd43b', 0.14, 0.17, 0.02, 0, 0.135, 0.195);
      for (const x of [-0.3, 0.3]) b.cyl('#c92a2a', 0.025, 0.025, 0.24, 6, x, 0.17, 0.26);
      b.box('#2f9e44', 0.7, 0.05, 0.6, 0, 0.3, 0);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box('#ffd43b', 0.1, 0.06, 0.1, x * 0.33, 0.34, z * 0.28);
      b.cyl('#ffd43b', 0.2, 0.2, 0.2, 8, 0, 0.42, 0);
      for (let i = 0; i < 8; i++) b.box('#c92a2a', 0.03, 0.2, 0.03, Math.cos((i / 8) * PI * 2 + PI / 8) * 0.2, 0.42, Math.sin((i / 8) * PI * 2 + PI / 8) * 0.2);
      b.cyl('#40c057', 0.13, 0.34, 0.08, 8, 0, 0.56, 0);
      b.cyl('#c92a2a', 0.12, 0.12, 0.1, 8, 0, 0.65, 0);
      b.cyl('#40c057', 0.02, 0.22, 0.14, 8, 0, 0.77, 0);
      b.cyl('#ffd43b', 0.008, 0.008, 0.08, 4, 0, 0.87, 0);
      b.box('#d9cbb0', 0.2, 0.03, 0.16, 0, 0.02, 0.4);
      const finial = new Builder().octa('#ffd43b', 0.04, 0, 0, 0, 1, 1.4, 1).mesh(0, 0.94, 0);
      const garlands = [-1, 1].map((side) => {
        const l = new Builder();
        for (let i = 0; i < 3; i++) l.ball('#ff3b30', 0.032, side * (0.1 + i * 0.09), -0.04, 0, 1, 1.2, 1).box('#ffd43b', 0.012, 0.03, 0.012, side * (0.1 + i * 0.09), -0.08, 0);
        return l.mesh(0, 0.27, 0.31);
      });
      return raised(0.1, '#cfc8b8', 0.9, 0.9, 0.04, {
        parts: [b.mesh(), finial, ...garlands],
        update(t) {
          finial.rotation.y = t * 1.4;
          garlands.forEach((g, i) => (g.rotation.x = Math.sin(t * 1.6 + i) * 0.3));
        },
      });
    },
  },
  {
    name: 'Hôtel Majapahit',
    match: 'Hôtel Majapahit',
    dx: -0.76,
    dz: 1.02,
    size: 0.23,
    height: 1.1,
    build() {
      const b = new Builder();
      // Palace colonial blanc : deux niveaux d'arcades, pavillon central à fronton
      b.box('#fdfdf7', 1.0, 0.34, 0.28, 0, 0.17, -0.14);
      b.poly('#a0452c', [[-0.18, 0], [0.18, 0], [0, 0.11]], 1.04, 0, 0.34, -0.14, 0, PI / 2, 0);
      for (let i = -4; i <= 4; i++) {
        if (i === 0) continue;
        b.box('#3d5a80', 0.06, 0.1, 0.02, i * 0.105, 0.08, 0.005).box('#3d5a80', 0.06, 0.08, 0.02, i * 0.105, 0.24, 0.005);
      }
      b.box('#fdfdf7', 0.24, 0.44, 0.12, 0, 0.22, 0.04);
      b.poly('#fdfdf7', [[-0.14, 0], [0.14, 0], [0, 0.08]], 0.12, 0, 0.44, 0.04);
      b.box('#6b4423', 0.08, 0.14, 0.02, 0, 0.07, 0.105);
      b.cyl('#adb5bd', 0.008, 0.008, 0.4, 4, 0, 0.7, 0.04);
      const palms = [palmTree(b, -0.4, 0.26, 0.34), palmTree(b, 0.4, 0.26, 0.4)];
      // 1945 : la bande bleue du drapeau néerlandais est arrachée, il reste le rouge et blanc
      const banner = flag('#e03131', '#ffffff', 0.24, 0.12);
      banner.position.set(0.005, 0.84, 0.04);
      const blue = new Builder().box('#1c4fa0', 0.24, 0.06, 0.012, 0.12, 0, 0).mesh();
      return raised(0.1, '#9ad17a', 1.2, 0.7, 0.02, {
        parts: [b.mesh(), ...palms, banner, blue],
        update(t) {
          palms.forEach((p, i) => {
            p.rotation.z = Math.sin(t * 1.4 + i * 2) * 0.15;
            p.rotation.x = Math.cos(t * 1.1 + i) * 0.1;
          });
          const wave = Math.sin(t * 2.4) * 0.5;
          banner.rotation.y = wave;
          const k = (t * 0.12) % 1;
          const fall = Math.max(0, (k - 0.45) / 0.3);
          blue.position.set(0.005 + fall * 0.2, 0.75 - fall * fall * 0.6, 0.04 + fall * 0.12);
          blue.rotation.set(fall * 2, wave, fall * 3);
          blue.scale.setScalar(fall > 1 ? 0.001 : k < 0.05 ? k * 20 : 1);
        },
      });
    },
  },
  {
    name: 'Jalan Tunjungan',
    match: 'Jalan Tunjungan',
    dx: -0.42,
    dz: 1.04,
    size: 0.2,
    height: 0.84,
    build() {
      const b = new Builder();
      // La rue piétonne le soir : réverbères, guirlande d'ampoules, terrasse de café, musicien de rue
      b.box('#5c6570', 1.2, 0.02, 0.42, 0, 0.01, 0.1);
      for (const x of [-0.52, 0.52]) {
        b.cyl('#343a40', 0.014, 0.02, 0.5, 5, x, 0.25, -0.06);
        b.ball('#fff3bf', 0.045, x, 0.52, -0.06);
      }
      b.cyl('#8d5a2b', 0.08, 0.08, 0.015, 8, -0.3, 0.13, 0.2).cyl('#6b4423', 0.012, 0.012, 0.12, 4, -0.3, 0.06, 0.2);
      person(b, '#f06595', null, -0.42, 0.02, 0.2, 0.7);
      person(b, '#51cf66', null, -0.18, 0.02, 0.22, 0.7);
      b.box('#1c7ed6', 0.24, 0.14, 0.14, 0.34, 0.09, -0.02);
      for (let i = 0; i < 4; i++) b.box(i % 2 ? '#ffffff' : '#ff922b', 0.07, 0.02, 0.2, 0.235 + i * 0.07, 0.32, 0.0, 0.25, 0, 0);
      for (const x of [0.23, 0.45]) b.cyl('#868e96', 0.008, 0.008, 0.2, 4, x, 0.2, -0.08);
      const bulbs = [0, 1].map((k) => {
        const g = new Builder();
        for (let i = k; i < 9; i += 2) g.ball(k ? '#ffd43b' : '#ff8fab', 0.03, -0.44 + i * 0.11, 0.47 - Math.sin((i / 8) * PI) * 0.1, -0.06);
        return g.mesh();
      });
      const m = person(new Builder(), '#343a40', null, 0, 0, 0, 0.8);
      m.box('#c98a4b', 0.1, 0.07, 0.03, 0.03, 0.09, 0.05).box('#6b4423', 0.12, 0.018, 0.018, 0.12, 0.12, 0.05, 0, 0, 0.4);
      const musician = m.mesh(0.04, 0.02, 0.22);
      const strollers = person(person(new Builder(), '#e03131', null, 0, 0, 0, 0.7), '#4dabf7', null, 0.08, 0, 0.03, 0.7).mesh();
      return raised(0.12, '#cfc8b8', 1.24, 0.5, 0.1, {
        parts: [b.mesh(), ...bulbs, musician, strollers],
        update(t) {
          bulbs.forEach((g, i) => g.scale.setScalar(1 + (Math.sin(t * 4 + i * PI) > 0 ? 0.0 : -0.25)));
          musician.rotation.z = Math.sin(t * 3) * 0.12;
          musician.rotation.y = Math.sin(t * 1.5) * 0.3;
          const u = (t * 0.12) % 1;
          strollers.position.set(-0.55 + u * 1.1, 0.02 + Math.abs(Math.sin(t * 5)) * 0.01, 0.36);
          strollers.scale.setScalar(Math.min(1, Math.min(u, 1 - u) * 10));
        },
      });
    },
  },
  {
    name: 'Rawon',
    match: 'Rawon',
    dx: -0.12,
    dz: 0.84,
    size: 0.19,
    height: 0.76,
    build() {
      const b = new Builder();
      // Le rawon : bouillon noir comme de l'encre, bœuf, pousses de soja, œuf salé ; riz et krupuk à côté
      b.cyl('#fdfdf7', 0.32, 0.18, 0.2, 10, -0.1, 0.1, -0.04);
      b.cyl('#1a1716', 0.28, 0.28, 0.02, 10, -0.1, 0.205, -0.04);
      for (const [x, z] of [[-0.2, -0.1], [-0.02, -0.14], [-0.14, 0.08]]) b.box('#6b4030', 0.09, 0.06, 0.07, x, 0.225, z, 0, x * 3, 0);
      for (let i = 0; i < 5; i++) b.box('#f8f0c8', 0.1, 0.015, 0.018, 0.0 + (i % 2) * 0.03, 0.225, -0.02 + i * 0.03, 0, i * 0.7, 0);
      b.ball('#f8f9fa', 0.06, -0.26, 0.225, 0.02, 1.2, 0.6, 1).ball('#ff922b', 0.03, -0.26, 0.25, 0.02);
      b.ball('#51cf66', 0.02, -0.08, 0.225, -0.06).ball('#51cf66', 0.02, 0.02, 0.225, 0.1);
      b.cyl('#e9ecef', 0.2, 0.16, 0.02, 9, 0.34, 0.01, 0.22);
      b.ball('#ffffff', 0.12, 0.34, 0.03, 0.22, 1, 0.7, 1, 1);
      b.ball('#e03131', 0.03, 0.46, 0.035, 0.3);
      b.ball('#ffe8cc', 0.1, 0.3, 0.06, -0.2, 1.3, 0.25, 1).ball('#ffe8cc', 0.08, 0.4, 0.1, -0.16, 1.2, 0.25, 1);
      const spoon = new Builder().box('#adb5bd', 0.02, 0.3, 0.02, 0, 0.15, 0).ball('#adb5bd', 0.045, 0, 0, 0, 1, 0.5, 1.3).mesh();
      const steam = [puff(0.06), puff(0.06), puff(0.06)];
      return raised(0.14, '#8d5a2b', 1.1, 0.86, 0.06, {
        parts: [b.mesh(), spoon, ...steam],
        update(t) {
          spoon.position.set(-0.02, 0.24 + Math.max(0, Math.sin(t * 1.2)) * 0.12, 0.0);
          spoon.rotation.z = -0.5 + Math.sin(t * 1.2) * 0.1;
          steam.forEach((s, i) => rise(s, (t * 0.4 + i / 3) % 1, -0.2 + i * 0.1, 0.24, -0.06, 0.42, 0.08, 1.1));
        },
      });
    },
  },
];

export default {
  'bandung-et-rancabali': BANDUNG,
  'yogyakarta-et-temples': YOGYAKARTA,
  dieng: DIENG,
  'malang-bromo': BROMO,
  'tumpak-sewu': { scale: 0.3, items: TUMPAK_SEWU },
  surabaya: { scale: 0.3, items: SURABAYA },
};
