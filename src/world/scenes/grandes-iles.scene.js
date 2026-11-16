// Scènes détaillées des grandes îles : Sumatra, Kalimantan, Sulawesi.
import * as THREE from 'three';
import { Builder, PI, bike, createModel, flag, person, puff, rise } from './kit.js';

const TAU = PI * 2;
const SKIN = '#f2b98a';
const WOOD = '#8d5a2b';
const DARKWOOD = '#5a3a22';
const SAND = '#f3dc9a';
const ROCK = '#8f948c';

const group = (...children) => {
  const g = new THREE.Group();
  g.add(...children);
  return g;
};
const pingPong = (u) => (u % 2 < 1 ? u % 2 : 2 - (u % 2));
// Apparition et disparition en douceur aux deux bouts d'un trajet en boucle (k dans [0, 1[)
const fade = (k) => Math.min(1, Math.min(k, 1 - k) * 8);

// La mer de la carte monte et descend lentement (houle de ±0,022 unité, formule de createWater dans props.js) : à l'échelle
// de ces scènes, c'est la hauteur d'une barque. Les éléments marqués « sea » suivent donc le niveau de l'eau à leur
// emplacement, pour ne jamais se retrouver noyés ni suspendus au-dessus des vagues. (lon, lat) : repère de l'étape.
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
            float.position.y = (Math.sin(x * 2.1 + t * 1.1) * 0.011 + Math.cos(z * 2.6 + t * 0.9 + x * 0.7) * 0.011 + 0.002) / unit;
          },
        };
      },
    };
  });
}

// Arbre de jungle : tronc et houppier en boules
function tree(b, x, z, h = 0.5, r = 0.2, tones = ['#2f9e44', '#40c057']) {
  b.cyl('#7a4b25', r * 0.16, r * 0.26, h, 5, x, h / 2, z);
  b.ball(tones[0], r, x, h + r * 0.45, z, 1.15, 0.8, 1.1);
  b.ball(tones[1], r * 0.65, x + r * 0.45, h + r * 0.8, z + r * 0.2, 1.1, 0.8, 1);
  return b;
}

// Cocotier : tronc penché ; renvoie la position de la tête, où poser les palmes (fronds).
function palmTrunk(b, x, z, h, lean = 0.1, y = 0) {
  b.cyl('#a8763e', 0.03, 0.045, h * 0.55, 5, x + lean * 0.25, y + h * 0.27, z, 0, 0, -lean * 0.9);
  b.cyl('#a8763e', 0.024, 0.03, h * 0.5, 5, x + lean * 0.72, y + h * 0.74, z, 0, 0, -lean * 0.5);
  return [x + lean * 0.86, y + h * 1.0, z];
}
function fronds(s = 1, dark = false) {
  const b = new Builder();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    b.box(i % 2 ? (dark ? '#1f6b33' : '#2f9e44') : dark ? '#2b8a3e' : '#40c057', 0.4 * s, 0.025 * s, 0.12 * s, Math.cos(a) * 0.18 * s, -0.045 * s, Math.sin(a) * 0.18 * s, 0, -a, -0.45);
  }
  b.ball('#6b4423', 0.035 * s, 0, -0.03 * s, 0);
  return b;
}

// Profil d'un toit « en selle » relevé aux deux bouts (batak, minangkabau, toraja)
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

// Orang-outan assis, tourné vers +z, origine sous lui. Bras levés (vers une branche) ou posés.
function orang(b, x = 0, y = 0, z = 0, s = 1, armsUp = false, fur = '#e8590c') {
  const dark = '#c2410c';
  b.ball(fur, 0.15 * s, x, y + 0.16 * s, z, 1, 1.1, 0.9, 1);
  b.ball(dark, 0.1 * s, x, y + 0.07 * s, z + 0.03 * s, 1.3, 0.7, 1.1);
  b.ball(fur, 0.095 * s, x, y + 0.36 * s, z + 0.03 * s);
  b.ball('#f6c08a', 0.058 * s, x, y + 0.345 * s, z + 0.1 * s, 1.1, 1, 0.6);
  b.ball('#1d2b53', 0.014 * s, x - 0.026 * s, y + 0.365 * s, z + 0.135 * s);
  b.ball('#1d2b53', 0.014 * s, x + 0.026 * s, y + 0.365 * s, z + 0.135 * s);
  if (armsUp) {
    b.box(fur, 0.055 * s, 0.34 * s, 0.055 * s, x - 0.17 * s, y + 0.4 * s, z, 0, 0, 0.35);
    b.box(fur, 0.055 * s, 0.34 * s, 0.055 * s, x + 0.17 * s, y + 0.4 * s, z, 0, 0, -0.35);
  } else {
    b.box(fur, 0.055 * s, 0.26 * s, 0.055 * s, x - 0.16 * s, y + 0.14 * s, z + 0.04 * s, 0, 0, -0.3);
    b.box(fur, 0.055 * s, 0.26 * s, 0.055 * s, x + 0.16 * s, y + 0.14 * s, z + 0.04 * s, 0, 0, 0.3);
  }
  return b;
}

// Nageur avec masque et tuba, allongé à la surface, tourné vers +x
function snorkeler(color = '#ff7b1c') {
  const b = new Builder();
  b.box(color, 0.2, 0.06, 0.1, 0, 0.02, 0);
  b.box(SKIN, 0.16, 0.05, 0.08, -0.17, 0.02, 0);
  b.box('#a3e635', 0.12, 0.02, 0.12, -0.3, 0.02, 0);
  b.ball(SKIN, 0.06, 0.15, 0.035, 0);
  b.box('#1d2b53', 0.04, 0.05, 0.1, 0.19, 0.035, 0);
  b.cyl('#ffd23f', 0.012, 0.012, 0.14, 5, 0.14, 0.11, 0.06);
  return b.mesh();
}

// Tortue verte en une pièce, tournée vers +x
function turtleMesh(s = 1) {
  const b = new Builder();
  b.ball('#2f9e44', 0.17 * s, 0, 0.03 * s, 0, 1.25, 0.5, 1, 1);
  b.ball('#237a36', 0.1 * s, -0.01 * s, 0.085 * s, 0, 1.3, 0.4, 1);
  b.ball('#9be08f', 0.07 * s, 0.25 * s, 0.02 * s, 0, 1.2, 0.8, 0.9);
  for (const side of [1, -1]) {
    b.box('#9be08f', 0.08 * s, 0.02 * s, 0.22 * s, 0.1 * s, 0.01 * s, 0.2 * s * side, 0, 0.5 * side, 0);
    b.box('#9be08f', 0.1 * s, 0.02 * s, 0.07 * s, -0.19 * s, 0.01 * s, 0.1 * s * side, 0, 0.7 * side, 0);
  }
  return b.mesh();
}

// Maison sur pilotis à toit de palme (guesthouse, cabane de pêcheur)
function stiltHut(b, x, z, s = 1, wall = '#fff3d6', roof = '#c49a4a', y = 0) {
  for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box('#6b4423', 0.03 * s, 0.16 * s, 0.03 * s, x + px * 0.13 * s, y + 0.08 * s, z + pz * 0.1 * s);
  b.box('#a67c52', 0.36 * s, 0.03 * s, 0.3 * s, x, y + 0.17 * s, z);
  b.box(wall, 0.3 * s, 0.16 * s, 0.24 * s, x, y + 0.265 * s, z);
  b.box('#5a4334', 0.07 * s, 0.11 * s, 0.02 * s, x, y + 0.24 * s, z + 0.125 * s);
  b.pyr(roof, 0.27 * s, 0.2 * s, x, y + 0.445 * s, z);
  return b;
}

// ------------------------------------------------------------------------------------------------
// Sumatra : Medan et Bukit Lawang
// ------------------------------------------------------------------------------------------------
const BUKIT_LAWANG = [
  {
    name: 'Orangs-outans',
    match: "Trek d'une journée",
    dx: -0.36,
    dz: -0.15,
    size: 0.19,
    height: 1.6,
    build() {
      const b = new Builder();
      // Grand arbre de la forêt du Leuser, avec une branche maîtresse et des lianes
      b.cyl('#7a4b25', 0.07, 0.12, 1.2, 6, -0.3, 0.6, -0.05);
      b.cyl('#7a4b25', 0.035, 0.05, 0.8, 5, 0.08, 1.04, -0.05, 0, 0, PI / 2);
      b.ball('#2f9e44', 0.32, -0.3, 1.3, -0.05, 1.2, 0.75, 1.1);
      b.ball('#40c057', 0.2, 0.36, 1.17, -0.1, 1.3, 0.7, 1);
      b.ball('#37b24d', 0.17, 0.02, 1.25, 0.06, 1.2, 0.7, 1);
      b.cyl('#5c7a2e', 0.01, 0.01, 0.6, 4, 0.4, 0.76, -0.05);
      b.cyl('#5c7a2e', 0.01, 0.01, 0.4, 4, -0.08, 0.86, 0);
      b.cone('#2f9e44', 0.1, 0.2, 5, 0.44, 0.1, 0.22);
      b.cone('#40c057', 0.08, 0.16, 5, -0.5, 0.08, 0.2);
      b.cone('#37b24d', 0.09, 0.18, 5, -0.06, 0.09, -0.3);
      // Le guide et une marcheuse, le nez en l'air
      person(b, '#1971c2', null, 0.16, 0, 0.34, 0.85);
      person(b, '#f03e3e', '#f2d16b', 0.34, 0, 0.4, 0.85);
      // La mère suspendue à la branche, son petit accroché au ventre
      const o = new Builder();
      o.box('#e8590c', 0.06, 0.34, 0.06, 0, -0.17, 0);
      o.ball('#e8590c', 0.17, 0.04, -0.49, 0, 0.95, 1.15, 0.9, 1);
      o.ball('#c2410c', 0.11, 0.04, -0.62, 0, 1.1, 0.8, 1);
      o.ball('#e8590c', 0.1, 0.06, -0.28, 0.05);
      o.ball('#f6c08a', 0.06, 0.07, -0.29, 0.12, 1.1, 1, 0.6);
      o.ball('#1d2b53', 0.014, 0.045, -0.27, 0.15);
      o.ball('#1d2b53', 0.014, 0.095, -0.27, 0.15);
      o.box('#e8590c', 0.055, 0.3, 0.055, 0.21, -0.48, 0.02, 0, 0, 0.5);
      o.box('#c2410c', 0.06, 0.2, 0.06, -0.05, -0.72, 0.03, 0, 0, -0.4);
      o.box('#c2410c', 0.06, 0.2, 0.06, 0.14, -0.72, 0.03, 0, 0, 0.4);
      o.ball('#ff922b', 0.075, 0.04, -0.52, 0.14);
      o.ball('#ff922b', 0.052, 0.04, -0.43, 0.19);
      o.ball('#f6c08a', 0.03, 0.04, -0.435, 0.235, 1, 1, 0.6);
      const mother = o.mesh(0.14, 1.02, -0.03);
      // Un jeune grimpe le long du tronc
      const young = orang(new Builder(), 0, 0, 0, 0.6, true, '#f76707').mesh();
      return {
        parts: [b.mesh(), mother, young],
        update(t) {
          mother.rotation.z = Math.sin(t * 2.1) * 0.45;
          mother.rotation.y = Math.sin(t * 1.05) * 0.3;
          young.position.set(-0.3, 0.3 + pingPong(t * 0.25) * 0.5, 0.07);
          young.rotation.z = Math.sin(t * 6) * 0.15;
        },
      };
    },
  },
  {
    name: 'Trek court',
    match: 'Trek court',
    dx: -0.06,
    dz: -0.45,
    size: 0.18,
    height: 1.15,
    build() {
      const b = new Builder();
      b.box('#b08d57', 1.1, 0.02, 0.13, 0, 0.01, 0.24, 0, 0.12, 0); // sentier boueux
      tree(b, -0.4, -0.18, 0.55, 0.24);
      tree(b, 0.38, -0.22, 0.72, 0.27, ['#237a36', '#2f9e44']);
      tree(b, 0.0, -0.34, 0.42, 0.2, ['#40c057', '#51cf66']);
      b.cyl('#7a4b25', 0.025, 0.03, 0.42, 5, 0.17, 0.5, -0.2, 0, 0, PI / 2 + 0.1);
      b.cone('#2f9e44', 0.08, 0.16, 5, -0.14, 0.08, 0.02);
      b.cone('#40c057', 0.07, 0.14, 5, 0.2, 0.07, 0.04);
      // Semnopithèque de Thomas : gris, ventre blanc, crête sur la tête, longue queue
      b.ball('#868e96', 0.085, 0.1, 0.61, -0.2, 1, 1.15, 0.9);
      b.ball('#f8f9fa', 0.055, 0.1, 0.6, -0.14, 1, 1.2, 0.6);
      b.ball('#868e96', 0.058, 0.1, 0.75, -0.18);
      b.ball('#f8f9fa', 0.035, 0.1, 0.745, -0.135, 1.2, 1, 0.6);
      b.cone('#343a40', 0.025, 0.08, 4, 0.1, 0.83, -0.19);
      const tail = new Builder().box('#868e96', 0.025, 0.3, 0.025, 0, -0.15, 0).mesh(0.1, 0.54, -0.25);
      // Le guide en tête, deux marcheurs avec leur sac à dos
      const w = new Builder();
      person(w, '#2b8a3e', '#f2d16b', 0.18, 0, 0, 0.8);
      person(w, '#f76707', null, 0, 0, 0, 0.8).box('#1971c2', 0.06, 0.09, 0.05, -0.05, 0.1, 0);
      person(w, '#ffd43b', null, -0.17, 0, 0, 0.8).box('#e03131', 0.06, 0.09, 0.05, -0.22, 0.1, 0);
      const walkers = w.mesh();
      return {
        parts: [b.mesh(), tail, walkers],
        update(t) {
          tail.rotation.x = Math.sin(t * 2.2) * 0.4;
          const k = (t * 0.12) % 1;
          const x = -0.42 + k * 0.84;
          walkers.position.set(x, 0.02 + Math.abs(Math.sin(t * 7)) * 0.015, 0.24 - x * 0.12);
          walkers.scale.setScalar(fade(k));
        },
      };
    },
  },
  {
    name: 'Chauves-souris',
    match: 'Grotte aux',
    dx: 0.1,
    dz: -0.12,
    size: 0.16,
    height: 0.95,
    build() {
      const b = new Builder();
      b.ball(ROCK, 0.42, 0, 0.2, -0.1, 1.2, 0.95, 0.8, 1);
      b.ball('#a3a89f', 0.26, -0.36, 0.1, 0.02, 1, 0.9, 0.8);
      b.ball('#7d827a', 0.2, 0.4, 0.08, -0.02, 1, 0.9, 0.9);
      b.ball('#2f9e44', 0.2, -0.15, 0.56, -0.22, 1.4, 0.6, 1);
      b.ball('#40c057', 0.16, 0.25, 0.5, -0.2, 1.3, 0.6, 1);
      b.ball('#16181c', 0.2, 0.04, 0.13, 0.2, 1.15, 1.1, 0.45); // entrée
      for (const [x, h] of [[-0.1, 0.1], [0.02, 0.14], [0.14, 0.09]]) b.cone('#a3a89f', 0.025, h, 4, x, 0.33 - h / 2, 0.27, PI, 0, 0);
      person(b, '#f08c00', null, 0.3, 0, 0.42, 0.8);
      const lamp = new Builder().octa('#ffe066', 0.045, 0, 0, 0).mesh(0.22, 0.14, 0.44);
      const bats = [0, 1].map((n) => {
        const f = new Builder();
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * TAU + n;
          const x = Math.cos(a) * (0.22 + n * 0.12);
          const z = Math.sin(a) * (0.22 + n * 0.12);
          f.box('#212529', 0.11, 0.012, 0.05, x, i * 0.07, z, 0, -a, 0.4);
          f.box('#212529', 0.11, 0.012, 0.05, x, i * 0.07, z, 0, -a, -0.4);
          f.ball('#212529', 0.022, x, i * 0.07 - 0.01, z);
        }
        return f.mesh(0.04, 0.55 + n * 0.12, 0.2);
      });
      return {
        parts: [b.mesh(), lamp, ...bats],
        update(t) {
          lamp.scale.setScalar(0.8 + Math.abs(Math.sin(t * 5)) * 0.5);
          lamp.rotation.y = t * 2;
          bats[0].rotation.y = -t * 1.6;
          bats[1].rotation.y = t * 1.2;
          bats[0].scale.y = 1 + Math.sin(t * 14) * 0.5;
          bats[1].scale.y = 1 + Math.cos(t * 13) * 0.5;
        },
      };
    },
  },
  {
    name: 'Descente en bouée',
    match: 'Retour en bouée',
    dx: -0.12,
    dz: 0.1,
    size: 0.18,
    height: 0.5,
    build() {
      const b = new Builder();
      b.box('#3cb4e6', 1.2, 0.02, 0.36, 0, 0.012, 0); // la Bohorok
      b.box('#7ccf52', 1.2, 0.05, 0.1, 0, 0.025, -0.23);
      b.box('#7ccf52', 1.2, 0.05, 0.1, 0, 0.025, 0.23);
      for (const [x, z, r] of [[-0.3, 0.09, 0.06], [0.12, -0.1, 0.07], [0.42, 0.08, 0.05]]) b.ball(ROCK, r, x, 0.03, z, 1.2, 0.8, 1);
      tree(b, -0.42, -0.26, 0.3, 0.17);
      tree(b, 0.3, -0.27, 0.36, 0.19, ['#237a36', '#2f9e44']);
      // Trois chambres à air attachées ensemble, le guide à l'arrière avec sa perche
      const r = new Builder();
      const shirts = ['#f03e3e', '#ffd43b', '#2b8a3e'];
      shirts.forEach((c, i) => {
        const x = 0.19 - i * 0.19;
        r.add(new THREE.TorusGeometry(0.075, 0.032, 5, 10), '#212529', x, 0.035, 0, PI / 2, 0, 0);
        person(r, c, null, x, 0.03, 0, 0.75);
      });
      r.cyl('#c9a36b', 0.008, 0.008, 0.4, 4, -0.26, 0.2, 0.05, 0, 0, 0.5);
      const raft = r.mesh();
      const foam = new Builder();
      for (const [x, z] of [[-0.24, 0.12], [-0.34, 0.05], [0.18, -0.06], [0.08, -0.13], [0.46, 0.11]]) foam.ball('#ffffff', 0.035, x, 0, z, 1.3, 0.5, 1);
      const rapids = foam.mesh(0, 0.03, 0);
      return {
        parts: [b.mesh(), raft, rapids],
        update(t) {
          const k = (t * 0.14) % 1;
          raft.position.set(-0.45 + k * 0.9, 0.02 + Math.sin(t * 5) * 0.012, Math.sin(k * TAU * 1.5) * 0.06);
          raft.rotation.y = Math.sin(t * 1.3) * 0.25;
          raft.rotation.z = Math.sin(t * 4) * 0.06;
          raft.scale.setScalar(fade(k));
          rapids.position.x = Math.sin(t * 3) * 0.02;
          rapids.scale.y = 1 + Math.sin(t * 6) * 0.5;
        },
      };
    },
  },
  {
    name: 'Baignade',
    match: 'Baignade devant',
    dx: -0.36,
    dz: 0.28,
    size: 0.18,
    height: 0.75,
    build() {
      const b = new Builder();
      b.box('#3cb4e6', 0.34, 0.02, 1.0, 0, 0.012, 0.05); // la rivière vient vers nous
      b.box('#7ccf52', 0.36, 0.05, 1.0, -0.35, 0.025, 0.05);
      b.box('#7ccf52', 0.36, 0.05, 1.0, 0.35, 0.025, 0.05);
      stiltHut(b, -0.36, -0.2, 1, '#fff3d6', '#c49a4a', 0.04);
      stiltHut(b, 0.36, 0.1, 0.85, '#ffd8a8', '#a67f35', 0.04);
      tree(b, 0.38, -0.32, 0.3, 0.17);
      // Passerelle suspendue
      for (const x of [-0.22, 0.22]) for (const z of [0.3, 0.4]) b.box(DARKWOOD, 0.03, 0.34, 0.03, x, 0.2, z);
      b.box('#c9a36b', 0.17, 0.02, 0.1, -0.14, 0.2, 0.35, 0, 0, -0.25);
      b.box('#c9a36b', 0.14, 0.02, 0.1, 0, 0.18, 0.35);
      b.box('#c9a36b', 0.17, 0.02, 0.1, 0.14, 0.2, 0.35, 0, 0, 0.25);
      b.box(DARKWOOD, 0.46, 0.012, 0.012, 0, 0.32, 0.4);
      const head = (c) => new Builder().ball(SKIN, 0.05, 0, 0.03, 0).box(c, 0.1, 0.03, 0.06, 0, 0, 0).box(SKIN, 0.22, 0.02, 0.03, 0, 0.01, 0).mesh();
      const swimmers = [head('#f03e3e'), head('#1971c2')];
      const walker = person(new Builder(), '#7048e8', null, 0, 0, 0, 0.7).mesh();
      return {
        parts: [b.mesh(), ...swimmers, walker],
        update(t) {
          swimmers[0].position.set(-0.04 + Math.sin(t * 0.7) * 0.06, 0.03 + Math.sin(t * 3) * 0.012, 0.0 + Math.cos(t * 0.7) * 0.1);
          swimmers[0].rotation.y = t * 0.7;
          swimmers[1].position.set(0.05, 0.03 + Math.sin(t * 2.6 + 1) * 0.015, -0.3 + Math.sin(t * 0.5) * 0.08);
          swimmers[1].rotation.z = Math.sin(t * 5) * 0.3;
          const u = pingPong(t * 0.3);
          walker.position.set(-0.2 + u * 0.4, 0.2 - Math.sin(u * PI) * 0.025 + Math.abs(Math.sin(t * 8)) * 0.01, 0.35);
        },
      };
    },
  },
  {
    name: 'Mosquée Al-Mashun',
    match: 'Grande mosquée',
    dx: 0.3,
    dz: -0.48,
    size: 0.19,
    height: 1.2,
    build() {
      const b = new Builder();
      b.cyl('#e9ecef', 0.56, 0.58, 0.03, 8, 0, 0.015, 0, 0, PI / 8, 0);
      // Corps octogonal blanc à panneaux verts, grand dôme noir
      b.cyl('#ffffff', 0.3, 0.3, 0.3, 8, 0, 0.18, 0, 0, PI / 8, 0);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        b.box('#2b8a3e', 0.12, 0.15, 0.02, Math.sin(a) * 0.275, 0.17, Math.cos(a) * 0.275, 0, a, 0);
        if (i % 2) {
          // Pavillons d'angle coiffés de petits dômes noirs
          const x = Math.sin(a) * 0.42;
          const z = Math.cos(a) * 0.42;
          b.cyl('#ffffff', 0.085, 0.085, 0.26, 8, x, 0.16, z);
          b.ball('#212529', 0.095, x, 0.31, z, 1, 1.1, 1, 1);
          b.cone('#ffd23f', 0.012, 0.07, 4, x, 0.44, z);
        }
      }
      b.cyl('#ffffff', 0.2, 0.21, 0.1, 8, 0, 0.38, 0, 0, PI / 8, 0);
      b.ball('#212529', 0.22, 0, 0.46, 0, 1, 1.1, 1, 1);
      b.cone('#ffd23f', 0.016, 0.1, 4, 0, 0.74, 0);
      // Minaret
      b.cyl('#ffffff', 0.045, 0.055, 0.8, 8, 0.5, 0.42, 0.22);
      b.cyl('#2b8a3e', 0.075, 0.075, 0.03, 8, 0.5, 0.66, 0.22);
      b.ball('#212529', 0.055, 0.5, 0.84, 0.22, 1, 1.2, 1);
      b.cone('#ffd23f', 0.01, 0.07, 4, 0.5, 0.93, 0.22);
      const crescent = new Builder().add(new THREE.TorusGeometry(0.05, 0.015, 4, 9, PI * 1.45), '#ffd23f', 0, 0.06, 0, 0, 0, PI * 0.8).mesh(0, 0.78, 0);
      const pigeons = new Builder();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU;
        pigeons.box('#ffffff', 0.1, 0.012, 0.04, Math.cos(a) * 0.45, (i % 2) * 0.06, Math.sin(a) * 0.45, 0, -a, 0.35);
        pigeons.box('#ffffff', 0.1, 0.012, 0.04, Math.cos(a) * 0.45, (i % 2) * 0.06, Math.sin(a) * 0.45, 0, -a, -0.35);
      }
      const flock = pigeons.mesh(0, 0.9, 0);
      return {
        parts: [b.mesh(), crescent, flock],
        update(t) {
          crescent.rotation.y = t * 1.2;
          flock.rotation.y = -t * 0.7;
          flock.position.y = 0.92 + Math.sin(t * 1.5) * 0.05;
          flock.scale.y = 1 + Math.sin(t * 10) * 0.4;
        },
      };
    },
  },
  {
    name: 'Palais Maimun',
    match: 'Palais Maimun',
    dx: 0.44,
    dz: -0.15,
    size: 0.18,
    height: 1.0,
    build() {
      const b = new Builder();
      b.box('#9ad17a', 1.2, 0.03, 0.8, 0, 0.015, 0.08);
      // Long palais jaune à arcades, pavillon central à étage, toits sombres à petits dômes
      b.box('#ffd43b', 1.0, 0.24, 0.32, 0, 0.15, -0.14);
      b.box('#495057', 1.04, 0.04, 0.36, 0, 0.29, -0.14);
      for (let i = -4; i <= 4; i++) if (Math.abs(i) > 1) b.box('#2b8a3e', 0.07, 0.13, 0.02, i * 0.105, 0.12, 0.025);
      for (const x of [-0.44, 0.44]) {
        b.box('#ffd43b', 0.2, 0.34, 0.4, x, 0.2, -0.1);
        b.pyr('#495057', 0.19, 0.12, x, 0.43, -0.1);
        b.ball('#212529', 0.05, x, 0.5, -0.1, 1, 1.2, 1);
      }
      b.box('#ffd43b', 0.32, 0.46, 0.34, 0, 0.26, 0);
      b.box('#fff3bf', 0.36, 0.03, 0.38, 0, 0.3, 0);
      for (const x of [-0.1, 0, 0.1]) b.box('#2b8a3e', 0.06, 0.12, 0.02, x, 0.4, 0.175);
      b.pyr('#495057', 0.3, 0.14, 0, 0.56, 0);
      b.ball('#212529', 0.085, 0, 0.64, 0, 1, 1.15, 1, 1);
      b.cone('#ffd23f', 0.012, 0.08, 4, 0, 0.77, 0);
      b.box('#f8f9fa', 0.22, 0.05, 0.14, 0, 0.055, 0.24);
      b.box('#f8f9fa', 0.22, 0.03, 0.1, 0, 0.03, 0.34);
      b.box('#5a4334', 0.09, 0.14, 0.02, 0, 0.15, 0.175);
      b.cyl('#adb5bd', 0.008, 0.008, 0.6, 4, 0.34, 0.33, 0.36);
      const banner = flag('#ffd43b', '#ffd43b', 0.2, 0.12);
      banner.position.set(0.345, 0.56, 0.36);
      // Visiteurs en costume malais devant le perron
      const couple = person(person(new Builder(), '#ffd43b', null, -0.05, 0, 0, 0.8), '#e64980', null, 0.06, 0, 0, 0.8).mesh();
      return {
        parts: [b.mesh(), banner, couple],
        update(t) {
          banner.rotation.y = Math.sin(t * 2.4) * 0.5;
          banner.scale.x = 1 + Math.sin(t * 5.5) * 0.15;
          couple.position.set(-0.3 + pingPong(t * 0.2) * 0.5, 0.03 + Math.abs(Math.sin(t * 6)) * 0.012, 0.42);
        },
      };
    },
  },
  {
    name: 'Soto et durian',
    match: 'Soto Medan',
    dx: 0.0,
    dz: 0.4,
    size: 0.15,
    height: 0.75,
    build() {
      const b = new Builder();
      // Étal de durians, et la marmite de soto sur son réchaud
      b.box('#a67c52', 0.56, 0.16, 0.3, -0.14, 0.08, -0.06);
      for (const [x, y, z] of [[-0.32, 0.22, -0.06], [-0.18, 0.22, -0.1], [-0.04, 0.22, -0.05], [-0.25, 0.33, -0.07], [-0.11, 0.33, -0.08], [-0.18, 0.43, -0.07]]) b.ball('#a3b03c', 0.08, x, y, z);
      b.ball('#a3b03c', 0.075, 0.07, 0.2, 0.03, 1, 0.6, 1);
      b.ball('#ffe066', 0.05, 0.07, 0.23, 0.03, 1, 0.6, 1);
      for (const x of [-0.42, 0.14]) b.cyl('#868e96', 0.01, 0.01, 0.6, 4, x, 0.3, -0.24);
      for (let i = 0; i < 5; i++) b.box(i % 2 ? '#ffffff' : '#2b8a3e', 0.12, 0.025, 0.16, -0.38 + i * 0.12, 0.61, -0.22, 0.35, 0, 0);
      b.box('#495057', 0.2, 0.1, 0.2, 0.36, 0.05, 0.12);
      b.cyl('#ced4da', 0.12, 0.1, 0.12, 8, 0.36, 0.16, 0.12);
      b.cyl('#ffc233', 0.105, 0.105, 0.01, 8, 0.36, 0.222, 0.12);
      person(b, '#e03131', null, -0.36, 0, 0.2, 0.85);
      b.cyl('#4dabf7', 0.04, 0.05, 0.08, 6, 0.1, 0.04, 0.36);
      person(b, '#f8f9fa', null, 0.1, 0.08, 0.36, 0.7);
      const ladle = new Builder().cyl('#868e96', 0.008, 0.008, 0.22, 4, 0, 0.11, 0).mesh(0.36, 0.2, 0.12);
      const steam = [puff(0.05), puff(0.05), puff(0.05)];
      return {
        parts: [b.mesh(), ladle, ...steam],
        update(t) {
          ladle.rotation.z = Math.sin(t * 2.5) * 0.35;
          ladle.rotation.x = Math.cos(t * 2.5) * 0.35;
          steam.forEach((s, i) => rise(s, (t * 0.4 + i / 3) % 1, 0.36, 0.24, 0.12, 0.45, 0.08, 1.1));
        },
      };
    },
  },
];

// ------------------------------------------------------------------------------------------------
// Sumatra : lac Toba et île de Samosir
// ------------------------------------------------------------------------------------------------

// Maison batak toba vue de côté : caisse sur pilotis, toit en selle dont la pointe avant monte plus haut
function batakHouse(b, x, z, s = 1, y = 0) {
  for (const px of [-0.2, 0, 0.2]) for (const pz of [-0.1, 0.1]) b.box('#4a3628', 0.04 * s, 0.16 * s, 0.04 * s, x + px * s, y + 0.08 * s, z + pz * s);
  b.box('#7b3f1d', 0.54 * s, 0.17 * s, 0.3 * s, x, y + 0.245 * s, z);
  b.box('#f8f9fa', 0.545 * s, 0.03 * s, 0.305 * s, x, y + 0.2 * s, z);
  b.box('#c92a2a', 0.545 * s, 0.03 * s, 0.305 * s, x, y + 0.25 * s, z);
  b.box('#212529', 0.545 * s, 0.03 * s, 0.305 * s, x, y + 0.3 * s, z);
  const roof = [[-0.34, 0.32], [0.34, 0.32], [0.52, 0.92], [0.22, 0.6], [-0.06, 0.53], [-0.27, 0.58], [-0.46, 0.76]];
  b.poly('#3a2a26', roof.map(([px, py]) => [px * s, py * s]), 0.4 * s, x, y, z);
  const ridge = [[-0.3, 0.5], [0.3, 0.5], [0.5, 0.9], [0.22, 0.63], [-0.06, 0.56], [-0.27, 0.61], [-0.45, 0.76]];
  b.poly('#5c4840', ridge.map(([px, py]) => [px * s, py * s]), 0.18 * s, x, y, z);
  // Pignon avant peint en rouge, blanc et noir
  b.poly('#c92a2a', [[0.33, 0.33], [0.5, 0.86], [0.37, 0.33]].map(([px, py]) => [px * s, py * s]), 0.3 * s, x, y, z);
  b.cone('#f8f9fa', 0.02 * s, 0.09 * s, 4, x + 0.52 * s, y + 0.96 * s, z);
  b.cone('#f8f9fa', 0.02 * s, 0.08 * s, 4, x - 0.46 * s, y + 0.8 * s, z);
  return b;
}

const TOBA = [
  {
    name: 'Danses batak',
    match: 'Danses batak',
    dx: -0.186,
    dz: -0.033,
    size: 0.17,
    height: 1.05,
    build() {
      const b = new Builder();
      batakHouse(b, -0.05, -0.18, 1);
      b.box('#d9c8a0', 0.1, 0.03, 0.2, -0.05, 0.08, 0.06, 0.7); // échelle d'entrée
      // Les danseurs de tor-tor, écharpe ulos sur l'épaule
      const dancers = [-0.24, 0, 0.24].map((x, i) => {
        const d = person(new Builder(), i === 1 ? '#212529' : '#862e9c', null, 0, 0, 0, 0.9);
        d.box('#c92a2a', 0.035, 0.2, 0.1, 0, 0.1, 0, 0, 0, 0.5);
        d.box('#c92a2a', 0.12, 0.03, 0.12, 0, 0.225, 0);
        d.box(SKIN, 0.22, 0.025, 0.03, 0, 0.14, 0.04);
        return d.mesh(x, 0, 0.3);
      });
      return {
        parts: [b.mesh(), ...dancers],
        update(t) {
          dancers.forEach((d, i) => {
            d.position.y = Math.abs(Math.sin(t * 3 + i * 0.5)) * 0.03;
            d.rotation.y = Math.sin(t * 1.5 + i) * 0.5;
            d.position.x = (i - 1) * 0.24 + Math.sin(t * 0.75) * 0.05;
          });
        },
      };
    },
  },
  {
    name: 'Chaises de pierre',
    match: 'Chaises de pierre',
    dx: 0.055,
    dz: 0.17,
    size: 0.17,
    height: 0.9,
    build() {
      const b = new Builder();
      // Cercle de sièges de pierre autour de la table, sous le grand arbre du village de Huta Siallagan
      b.cyl('#c9c2a8', 0.44, 0.46, 0.02, 10, 0, 0.01, 0.08);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + 0.2;
        const x = Math.sin(a) * 0.28;
        const z = 0.08 + Math.cos(a) * 0.28;
        b.box('#9a9a8e', 0.1, 0.08, 0.1, x, 0.05, z, 0, a, 0);
        b.box('#84847a', 0.1, 0.14, 0.03, x + Math.sin(a) * 0.045, 0.14, z + Math.cos(a) * 0.045, 0, a, 0);
      }
      b.cyl('#a9a99c', 0.11, 0.09, 0.09, 8, 0, 0.055, 0.08);
      for (let i = -3; i <= 3; i++) b.box(i % 2 ? '#84847a' : '#9a9a8e', 0.15, 0.12, 0.08, i * 0.15, 0.06, -0.36 - Math.abs(i) * 0.01);
      b.cyl('#7a4b25', 0.05, 0.08, 0.5, 6, -0.36, 0.25, -0.22);
      person(b, '#f08c00', null, 0.4, 0, 0.3, 0.8);
      person(b, '#4dabf7', '#f2d16b', 0.5, 0, 0.24, 0.8);
      const crown = new Builder().ball('#2f9e44', 0.24, 0, 0, 0, 1.2, 0.8, 1.1).ball('#40c057', 0.16, 0.16, 0.1, 0.06, 1.1, 0.8, 1).mesh(-0.36, 0.6, -0.22);
      const guide = person(new Builder(), '#c92a2a', null, 0, 0, 0, 0.85).box(SKIN, 0.03, 0.03, 0.14, 0.05, 0.14, 0.05).mesh();
      return {
        parts: [b.mesh(), crown, guide],
        update(t) {
          crown.rotation.z = Math.sin(t * 1.3) * 0.06;
          crown.scale.y = 1 + Math.sin(t * 1.9) * 0.04;
          const a = t * 0.5;
          guide.position.set(Math.sin(a) * 0.14, 0.02 + Math.abs(Math.sin(t * 6)) * 0.012, 0.08 + Math.cos(a) * 0.14);
          guide.rotation.y = a;
        },
      };
    },
  },
  {
    name: 'Tuk Tuk',
    match: 'Tuk Tuk et baignade',
    dx: 0.26,
    dz: -0.18,
    size: 0.17,
    height: 0.7,
    build() {
      const b = new Builder();
      // Un bout de la presqu'île, une guesthouse au toit batak, et le ponton d'où l'on saute dans le lac
      b.cyl('#8fd36a', 0.3, 0.34, 0.05, 8, -0.24, 0.025, 0.2);
      b.cyl('#4fc3e8', 0.36, 0.36, 0.012, 10, 0.22, 0.006, -0.16);
      batakHouse(b, -0.28, 0.16, 0.6, 0.04);
      b.box('#c9a36b', 0.56, 0.025, 0.1, 0.16, 0.1, -0.12, 0, 0.7, 0);
      for (const k of [-0.2, 0, 0.2]) b.box(DARKWOOD, 0.025, 0.1, 0.025, 0.16 + k * 0.76 + 0.04, 0.05, -0.12 - k * 0.64 + 0.04);
      const head = (c) => new Builder().ball(SKIN, 0.05, 0, 0.03, 0).box(c, 0.1, 0.03, 0.06, 0, 0, 0).box(SKIN, 0.22, 0.02, 0.03, 0, 0.01, 0).mesh();
      const swimmer = head('#f03e3e');
      const jumper = person(new Builder(), '#1971c2', null, 0, 0, 0, 0.75).mesh();
      const splash = puff(0.07);
      return {
        parts: [b.mesh(), swimmer, jumper, splash],
        update(t) {
          swimmer.position.set(0.26 + Math.sin(t * 0.6) * 0.07, 0.02 + Math.sin(t * 3) * 0.012, 0.02 + Math.cos(t * 0.6) * 0.06);
          swimmer.rotation.y = t * 0.6;
          // Le plongeur court sur le ponton, saute, disparaît dans l'eau
          const k = (t * 0.3) % 1;
          const run = Math.min(1, k / 0.5);
          const jump = THREE.MathUtils.clamp((k - 0.5) / 0.25, 0, 1);
          jumper.position.set(0.0 + run * 0.34 + jump * 0.14, 0.11 + Math.sin(jump * PI) * 0.16 - jump * 0.11, 0.02 - run * 0.29 - jump * 0.12);
          jumper.rotation.z = -jump * 2;
          jumper.scale.setScalar(k < 0.75 ? Math.min(1, k * 10) : 0.001);
          const sp = THREE.MathUtils.clamp((k - 0.75) / 0.25, 0, 1);
          splash.position.set(0.48, 0.03 + sp * 0.1, -0.39);
          splash.scale.setScalar(k < 0.75 ? 0.001 : Math.sin(sp * PI) * 1.4);
        },
      };
    },
  },
  {
    name: 'Tombeau de Tomok',
    match: 'Tombeau du roi',
    dx: 0.296,
    dz: 0.373,
    size: 0.17,
    height: 0.8,
    build() {
      const b = new Builder();
      b.box('#b7b2a6', 0.8, 0.05, 0.4, -0.08, 0.025, -0.1);
      // Sarcophage du roi Sidabutar : coffre en forme de barque, grande tête sculptée à l'avant
      b.box('#9a9a8e', 0.56, 0.2, 0.22, -0.1, 0.15, -0.1);
      b.poly('#84847a', saddle(0.36, 0.26, 0.46, 0.07), 0.24, -0.1, 0, -0.1);
      b.box('#8a8a7e', 0.17, 0.3, 0.2, 0.24, 0.24, -0.1);
      b.ball('#f8f9fa', 0.025, 0.27, 0.3, 0.005);
      b.ball('#f8f9fa', 0.025, 0.2, 0.3, 0.005);
      b.box('#5c5c54', 0.1, 0.02, 0.02, 0.235, 0.2, 0.005);
      b.box('#c92a2a', 0.3, 0.03, 0.235, -0.12, 0.2, -0.1);
      b.box('#f8f9fa', 0.3, 0.03, 0.235, -0.12, 0.17, -0.1);
      b.box('#212529', 0.3, 0.03, 0.235, -0.12, 0.14, -0.1);
      b.box('#84847a', 0.08, 0.14, 0.08, -0.4, 0.38, -0.1); // la statuette assise à l'arrière
      b.box('#9a9a8e', 0.24, 0.12, 0.12, -0.3, 0.11, 0.2);
      // Le Sigale-gale, marionnette de bois qui danse sur son coffre
      b.box(WOOD, 0.3, 0.1, 0.14, 0.34, 0.05, 0.26);
      b.cyl('#1971c2', 0.05, 0.06, 0.2, 6, 0.34, 0.2, 0.26);
      b.ball('#a8703a', 0.055, 0.34, 0.35, 0.26);
      b.box('#c92a2a', 0.12, 0.04, 0.12, 0.34, 0.4, 0.26);
      b.box('#c92a2a', 0.03, 0.2, 0.09, 0.34, 0.2, 0.26, 0, 0, 0.5);
      const arms = new Builder().box('#a8703a', 0.03, 0.03, 0.2, -0.08, 0, 0.09).box('#a8703a', 0.03, 0.03, 0.2, 0.08, 0, 0.09).mesh(0.34, 0.27, 0.26);
      const visitor = person(new Builder(), '#ffd43b', null, 0, 0, 0, 0.8).box('#c92a2a', 0.035, 0.18, 0.09, 0, 0.1, 0, 0, 0, 0.5).mesh();
      return {
        parts: [b.mesh(), arms, visitor],
        update(t) {
          arms.rotation.x = -0.5 + Math.sin(t * 2.4) * 0.7;
          arms.rotation.y = Math.sin(t * 1.2) * 0.4;
          visitor.position.set(-0.36 + pingPong(t * 0.2) * 0.4, 0.02 + Math.abs(Math.sin(t * 6)) * 0.012, 0.36);
        },
      };
    },
  },
  {
    name: 'Samosir en scooter',
    match: 'Tour de Samosir',
    dx: -0.427,
    dz: -0.236,
    size: 0.16,
    height: 0.75,
    build() {
      const b = new Builder();
      b.cyl('#868e96', 0.48, 0.48, 0.02, 14, 0, 0.01, 0);
      b.cyl('#8fd36a', 0.34, 0.34, 0.03, 12, 0, 0.015, 0);
      // Au milieu : une petite église batak et un cocotier
      b.box('#ffffff', 0.2, 0.18, 0.26, -0.06, 0.12, -0.04);
      b.poly('#c92a2a', [[-0.12, 0], [0.12, 0], [0, 0.1]], 0.28, -0.06, 0.21, -0.04);
      b.box('#ffffff', 0.09, 0.34, 0.09, -0.06, 0.2, 0.12);
      b.pyr('#c92a2a', 0.07, 0.14, -0.06, 0.44, 0.12);
      b.box('#5a4334', 0.05, 0.08, 0.02, -0.06, 0.07, 0.17);
      const [hx, hy, hz] = palmTrunk(b, 0.14, -0.08, 0.5, 0.1, 0.02);
      const leaves = fronds(0.8).mesh(hx, hy + 0.03, hz);
      const scooter = (color, helmet) => {
        const s = new Builder();
        s.cyl('#212529', 0.045, 0.045, 0.03, 8, -0.09, 0.045, 0, PI / 2, 0, 0).cyl('#212529', 0.045, 0.045, 0.03, 8, 0.09, 0.045, 0, PI / 2, 0, 0);
        s.box(color, 0.2, 0.05, 0.06, 0, 0.07, 0);
        s.box(color, 0.03, 0.14, 0.06, 0.08, 0.13, 0, 0, 0, -0.25);
        s.box('#212529', 0.02, 0.02, 0.14, 0.1, 0.2, 0);
        s.box('#343a40', 0.12, 0.03, 0.06, -0.04, 0.11, 0);
        s.cyl('#ffd43b', 0.04, 0.05, 0.13, 6, -0.03, 0.19, 0);
        s.ball(helmet, 0.05, -0.02, 0.29, 0);
        return s.mesh();
      };
      const riders = [scooter('#e03131', '#f8f9fa'), scooter('#1c7ed6', '#ffd43b')];
      return {
        parts: [b.mesh(), leaves, ...riders],
        update(t) {
          leaves.rotation.z = Math.sin(t * 1.4) * 0.12;
          riders.forEach((r, i) => {
            const a = t * 0.8 + i * PI;
            r.position.set(Math.cos(a) * 0.41, 0.02 + Math.abs(Math.sin(t * 9 + i)) * 0.006, Math.sin(a) * 0.41);
            r.rotation.y = -a - PI / 2;
            r.rotation.x = -0.15;
          });
        },
      };
    },
  },
  {
    name: 'Carpe et guitare',
    match: 'Carpe du lac',
    dx: 0.55,
    dz: 0.05,
    size: 0.16,
    height: 0.7,
    build() {
      const b = new Builder();
      // Radeau d'un élevage de carpes : le gril à poisson et les chanteurs du soir
      b.box('#3ccbe6', 1.1, 0.012, 0.9, 0, 0.006, 0.02);
      b.box('#c9a36b', 0.96, 0.03, 0.56, 0, 0.045, 0.06);
      for (const x of [-0.4, 0, 0.4]) for (const z of [-0.2, 0.32]) b.cyl('#1c7ed6', 0.05, 0.05, 0.12, 6, x, 0.02, z, PI / 2, 0, 0);
      // Les cages à poissons, à l'arrière
      for (const x of [-0.25, 0.25]) {
        b.box('#2f9e44', 0.4, 0.02, 0.24, x, 0.02, -0.33);
        b.box('#3ccbe6', 0.32, 0.024, 0.17, x, 0.02, -0.33);
      }
      for (const x of [-0.38, -0.06]) for (const z of [-0.08, 0.08]) b.box('#343a40', 0.025, 0.2, 0.025, x, 0.16, z);
      b.box('#495057', 0.4, 0.05, 0.24, -0.22, 0.27, 0);
      b.box('#e8590c', 0.34, 0.02, 0.18, -0.22, 0.3, 0);
      for (const z of [-0.05, 0.06]) {
        b.octa('#f59f00', 0.07, -0.2, 0.34, z, 1.9, 0.6, 0.7);
        b.poly('#f59f00', [[0, 0], [-0.07, 0.05], [-0.07, -0.05]], 0.02, -0.33, 0.34, z, PI / 2, 0, 0);
      }
      person(b, '#f8f9fa', null, -0.42, 0.06, 0.2, 0.85);
      b.cyl('#a67c52', 0.05, 0.05, 0.1, 6, 0.24, 0.11, 0.1);
      b.box('#2b8a3e', 0.03, 0.12, 0.03, 0.02, 0.12, 0.26);
      const singer = person(new Builder(), '#7048e8', null, 0, 0, 0, 0.85).mesh(0.42, 0.06, 0.0);
      const g = new Builder();
      person(g, '#c92a2a', null, 0, 0, 0, 0.8);
      g.ball('#c68642', 0.07, 0.02, 0.1, 0.07, 1.2, 1, 0.5);
      g.ball('#3a2a26', 0.025, 0.02, 0.1, 0.105, 1, 1, 0.4);
      g.box('#6b4423', 0.2, 0.025, 0.025, 0.15, 0.14, 0.07, 0, 0, 0.35);
      const guitarist = g.mesh(0.24, 0.16, 0.1);
      const smoke = [puff(0.06), puff(0.06)];
      const carp = new Builder().octa('#ff922b', 0.06, 0, 0, 0, 1.8, 0.9, 0.6).poly('#ff922b', [[0, 0], [-0.07, 0.05], [-0.07, -0.05]], 0.02, -0.1, 0, 0).mesh();
      return {
        parts: [b.mesh(), singer, guitarist, ...smoke, carp],
        update(t) {
          guitarist.rotation.z = Math.sin(t * 3) * 0.12;
          guitarist.rotation.y = Math.sin(t * 1.5) * 0.2;
          singer.rotation.z = Math.sin(t * 3 + 1) * 0.15;
          singer.position.y = 0.06 + Math.abs(Math.sin(t * 3)) * 0.02;
          smoke.forEach((s, i) => rise(s, (t * 0.35 + i / 2) % 1, -0.22, 0.36, 0, 0.5, 0.1, 1.2));
          // Une carpe saute dans une cage
          const k = (t * 0.5) % 1;
          carp.position.set(-0.33 + k * 0.16, 0.02 + Math.sin(k * PI) * 0.22, -0.33);
          carp.rotation.z = 1.1 - k * 2.2;
          carp.scale.setScalar(k < 0.95 ? 1 : 0.001);
        },
      };
    },
  },
];

// ------------------------------------------------------------------------------------------------
// Sumatra : Bukittinggi et le pays minangkabau
// ------------------------------------------------------------------------------------------------

// Maison minangkabau (rumah gadang) : caisse sur pilotis et toits en cornes de buffle emboîtés
function gadang(b, x, z, s = 1, y = 0, levels = 2) {
  for (const px of [-0.3, -0.1, 0.1, 0.3]) b.box('#4a3628', 0.04 * s, 0.12 * s, 0.26 * s, x + px * s, y + 0.06 * s, z);
  b.box('#7b3f1d', 0.8 * s, 0.2 * s, 0.3 * s, x, y + 0.22 * s, z);
  b.box('#ffd23f', 0.805 * s, 0.025 * s, 0.305 * s, x, y + 0.27 * s, z);
  b.box('#c92a2a', 0.805 * s, 0.025 * s, 0.305 * s, x, y + 0.2 * s, z);
  for (const px of [-0.26, 0, 0.26]) b.box('#2a2222', 0.08 * s, 0.09 * s, 0.02 * s, x + px * s, y + 0.22 * s, z + 0.155 * s);
  const sc = (pts) => pts.map(([px, py]) => [px * s, py * s]);
  b.poly('#3a302c', sc(saddle(0.56, 0.36, 0.74, 0.16)), 0.36 * s, x, y, z);
  if (levels > 1) b.poly('#4a3a34', sc(saddle(0.34, 0.5, 0.94, 0.15)), 0.3 * s, x, y, z);
  for (const [px, py] of levels > 1 ? [[-0.56, 0.74], [0.56, 0.74], [-0.34, 0.94], [0.34, 0.94]] : [[-0.56, 0.74], [0.56, 0.74]]) b.cone('#ffd23f', 0.02 * s, 0.1 * s, 4, x + px * s, y + (py + 0.04) * s, z);
  return b;
}

const BUKITTINGGI = [
  {
    name: 'Vallée de Harau',
    match: 'Vallée de Harau',
    dx: 0.48,
    dz: -0.2,
    size: 0.17,
    height: 1.35,
    build() {
      const b = new Builder();
      // Falaises verticales orangées, cascade, rizières au fond
      b.box('#d98b4a', 0.3, 1.0, 0.5, -0.38, 0.5, -0.15);
      b.box('#c97b3c', 0.52, 1.12, 0.26, 0.0, 0.56, -0.32);
      b.box('#d98b4a', 0.28, 0.86, 0.44, 0.38, 0.43, -0.12);
      for (const [x, h, z] of [[-0.34, 1.0, 0.105], [-0.44, 1.0, 0.105], [0.33, 0.86, 0.105], [0.45, 0.86, 0.105], [-0.14, 1.12, -0.185]]) b.box('#9c5a2c', 0.03, h * 0.8, 0.02, x, h * 0.55, z);
      b.ball('#2f9e44', 0.2, -0.38, 1.02, -0.15, 1, 0.5, 1.3);
      b.ball('#40c057', 0.28, 0.0, 1.14, -0.32, 1.1, 0.4, 0.7);
      b.ball('#37b24d', 0.19, 0.38, 0.88, -0.12, 1, 0.5, 1.2);
      b.box('#dff6ff', 0.07, 1.06, 0.03, 0.1, 0.53, -0.18);
      b.cyl('#3ccbe6', 0.12, 0.12, 0.03, 8, 0.1, 0.015, -0.08);
      b.box('#b2f2bb', 0.42, 0.02, 0.26, -0.02, 0.01, 0.12);
      b.box('#69db7c', 0.3, 0.02, 0.2, -0.24, 0.012, 0.36);
      b.box('#ffe066', 0.3, 0.02, 0.2, 0.1, 0.012, 0.38);
      b.box('#8ce99a', 0.2, 0.02, 0.2, 0.38, 0.012, 0.3);
      const fallB = new Builder();
      for (let i = 0; i < 5; i++) fallB.box('#ffffff', 0.04, 0.12, 0.02, i % 2 ? 0.02 : -0.02, i * 0.25, 0);
      const fall = fallB.mesh(0.1, 0, -0.16);
      const farmer = person(new Builder(), '#1971c2', '#f2d16b', 0, 0, 0, 0.8).mesh();
      const eagle = new Builder().box('#5a3a22', 0.16, 0.015, 0.06, 0.07, 0, 0, 0, 0, 0.3).box('#5a3a22', 0.16, 0.015, 0.06, -0.07, 0, 0, 0, 0, -0.3).ball('#f8f9fa', 0.03, 0, 0, 0.03).mesh();
      return {
        parts: [b.mesh(), fall, farmer, eagle],
        update(t) {
          fall.position.y = -0.04 - ((t * 0.6) % 1) * 0.25;
          farmer.position.set(-0.3 + pingPong(t * 0.15) * 0.6, 0.02, 0.36);
          farmer.rotation.z = 0.3 + Math.sin(t * 3) * 0.25;
          const a = t * 0.7;
          eagle.position.set(Math.cos(a) * 0.3, 1.3 + Math.sin(t * 1.1) * 0.04, 0.05 + Math.sin(a) * 0.22);
          eagle.rotation.y = -a;
          eagle.rotation.z = 0.3;
        },
      };
    },
  },
  {
    name: 'Lac Maninjau',
    match: 'Lac Maninjau',
    dx: -0.45,
    dz: -0.22,
    size: 0.21,
    height: 0.75,
    build() {
      const b = new Builder();
      // Lac de cratère entouré de collines ; au fond, la pente des 44 virages
      b.ball('#3aa7e0', 0.36, 0, 0, 0.12, 1.2, 0.08, 0.85, 1);
      for (let i = 0; i <= 6; i++) {
        const a = PI + (i / 6) * PI;
        const side = Math.abs(i - 3) / 3;
        b.ball(i % 2 ? '#3f9d48' : '#57b356', 0.2, Math.cos(a) * 0.5, 0.06, 0.12 + Math.sin(a) * 0.4, 1, 1.5 - side * 0.7, 0.9);
      }
      b.ball('#57b356', 0.12, -0.46, 0.03, 0.34, 1, 0.8, 1);
      b.ball('#3f9d48', 0.11, 0.47, 0.03, 0.36, 1, 0.8, 1);
      b.box('#f8f9fa', 0.08, 0.06, 0.06, 0.3, 0.05, 0.3).pyr('#c92a2a', 0.07, 0.06, 0.3, 0.11, 0.3);
      // Kelok 44 : la route en lacets, sur un plan incliné tourné vers nous
      const s = new Builder();
      s.box('#4c9a3d', 0.58, 0.56, 0.06, 0, 0.27, 0);
      for (let i = 0; i < 4; i++) s.box('#f1f3f5', 0.4, 0.05, 0.02, 0, 0.41 - i * 0.1, 0.035, 0, 0, i % 2 ? 0.25 : -0.25);
      const slope = s.mesh();
      const car = new Builder().box('#e03131', 0.09, 0.05, 0.05, 0, 0, 0.04).box('#ffd43b', 0.05, 0.04, 0.03, -0.005, 0, 0.075).mesh();
      const hill = group(slope, car);
      hill.position.set(0, 0.0, -0.2);
      hill.rotation.x = -0.75;
      const boat = new Builder().poly('#ffd23f', [[-0.09, 0.04], [0.11, 0.04], [0.07, -0.01], [-0.07, -0.01]], 0.06).box('#e03131', 0.05, 0.05, 0.05, -0.01, 0.06, 0).mesh();
      return {
        parts: [b.mesh(), hill, boat],
        update(t) {
          const u = pingPong(t * 0.12) * 4;
          const seg = Math.min(3, Math.floor(u));
          const f = u - seg;
          const dir = seg % 2 ? -1 : 1;
          car.position.set(dir * (-0.18 + f * 0.36), 0.46 - u * 0.1, 0);
          car.rotation.z = dir * -0.27;
          const a = t * 0.35;
          boat.position.set(Math.cos(a) * 0.2, 0.035 + Math.sin(t * 2) * 0.006, 0.14 + Math.sin(a) * 0.12);
          boat.rotation.y = -a - PI / 2;
        },
      };
    },
  },
  {
    name: 'Jam Gadang',
    match: 'Jam Gadang',
    dx: 0.0,
    dz: 0.05,
    size: 0.18,
    height: 1.62,
    build() {
      const b = new Builder();
      b.box('#d9cbb0', 1.1, 0.03, 1.0, 0, 0.015, 0);
      // La tour de l'horloge : trois étages blancs, quatre cadrans, toit minangkabau à quatre cornes
      b.box('#e9ecef', 0.5, 0.1, 0.5, 0, 0.08, -0.08);
      b.box('#ffffff', 0.34, 0.4, 0.34, 0, 0.33, -0.08);
      b.box('#e9ecef', 0.4, 0.03, 0.4, 0, 0.545, -0.08);
      b.box('#ffffff', 0.29, 0.3, 0.29, 0, 0.71, -0.08);
      b.box('#e9ecef', 0.35, 0.03, 0.35, 0, 0.875, -0.08);
      b.box('#ffffff', 0.26, 0.28, 0.26, 0, 1.03, -0.08);
      b.box('#e9ecef', 0.32, 0.03, 0.32, 0, 1.185, -0.08);
      b.box('#3d5a80', 0.09, 0.16, 0.02, 0, 0.26, 0.095);
      b.box('#3d5a80', 0.07, 0.12, 0.02, 0, 0.7, 0.07);
      for (const [x, z, ry] of [[0, 0.135, 0], [0, -0.135, 0], [0.135, 0, PI / 2], [-0.135, 0, PI / 2]]) {
        b.cyl('#343a40', 0.105, 0.105, 0.02, 12, x, 1.03, -0.08 + z, PI / 2, 0, ry);
        b.cyl('#fff9db', 0.085, 0.085, 0.03, 12, x, 1.03, -0.08 + z, PI / 2, 0, ry);
      }
      b.pyr('#4a3a34', 0.2, 0.1, 0, 1.25, -0.08);
      b.poly('#5c4840', saddle(0.21, 1.22, 1.4, 0.07), 0.1, 0, 0, -0.08);
      b.poly('#5c4840', saddle(0.21, 1.22, 1.4, 0.07), 0.1, 0, 0, -0.08, 0, PI / 2, 0);
      b.cone('#ffd23f', 0.025, 0.2, 5, 0, 1.42, -0.08);
      for (const [x, z] of [[-0.21, 0], [0.21, 0], [0, -0.21], [0, 0.21]]) b.cone('#ffd23f', 0.014, 0.06, 4, x, 1.43, -0.08 + z);
      // Vendeur de brochettes sur la place
      b.box('#2b8a3e', 0.2, 0.14, 0.12, -0.38, 0.1, 0.36);
      b.box('#495057', 0.2, 0.02, 0.12, -0.38, 0.18, 0.36);
      person(b, '#f8f9fa', null, -0.38, 0.03, 0.24, 0.8);
      const hands = [0.085, 0.06].map((len, i) => new Builder().box('#212529', i ? 0.022 : 0.014, len, 0.012, 0, len / 2, 0).mesh(0, 1.03, 0.075 + i * 0.006));
      // Le bendi, la calèche à cheval qui tourne autour de la place
      const c = new Builder();
      c.box('#8d5524', 0.18, 0.09, 0.07, 0.16, 0.13, 0);
      c.box('#8d5524', 0.06, 0.12, 0.06, 0.26, 0.2, 0, 0, 0, -0.5);
      for (const x of [0.1, 0.22]) c.box('#5a3a22', 0.03, 0.1, 0.06, x, 0.05, 0);
      c.box('#c92a2a', 0.18, 0.08, 0.14, -0.1, 0.1, 0);
      c.cyl('#212529', 0.06, 0.06, 0.16, 8, -0.1, 0.06, 0, PI / 2, 0, 0);
      for (const x of [-0.17, -0.03]) c.box('#343a40', 0.012, 0.12, 0.012, x, 0.2, 0);
      c.box('#ffd43b', 0.2, 0.02, 0.16, -0.1, 0.27, 0);
      person(c, '#1971c2', null, -0.08, 0.13, 0, 0.6);
      const bendi = c.mesh();
      const smoke = [puff(0.05), puff(0.05)];
      return {
        parts: [b.mesh(), ...hands, bendi, ...smoke],
        update(t) {
          hands[0].rotation.z = -t * 1.2;
          hands[1].rotation.z = -t * 0.1 - 1;
          const a = t * 0.5;
          bendi.position.set(Math.cos(a) * 0.42, 0.03 + Math.abs(Math.sin(t * 8)) * 0.01, -0.02 + Math.sin(a) * 0.38);
          bendi.rotation.y = -a - PI / 2;
          smoke.forEach((s, i) => rise(s, (t * 0.4 + i / 2) % 1, -0.38, 0.2, 0.36, 0.4, 0.08, 1));
        },
      };
    },
  },
  {
    name: 'Canyon de Sianok',
    match: 'Canyon de Sianok',
    dx: -0.22,
    dz: 0.32,
    size: 0.2,
    height: 0.8,
    build() {
      const b = new Builder();
      // Deux plateaux et, entre eux, le fond plat du canyon : rivière et rizières
      b.box('#d9b77a', 0.34, 0.44, 0.9, -0.35, 0.22, 0);
      b.box('#8fd36a', 0.36, 0.04, 0.92, -0.35, 0.46, 0);
      b.box('#c9a565', 0.3, 0.36, 0.9, 0.38, 0.18, 0);
      b.box('#7ccf52', 0.32, 0.04, 0.92, 0.38, 0.38, 0);
      b.box('#e3c58e', 0.08, 0.3, 0.3, -0.16, 0.15, -0.2);
      b.box('#d9b77a', 0.08, 0.24, 0.24, 0.2, 0.12, 0.2);
      for (const z of [-0.3, 0, 0.3]) b.box('#b8935a', 0.345, 0.02, 0.02, -0.35, 0.3, z + 0.05).box('#a8854f', 0.305, 0.02, 0.02, 0.38, 0.24, z);
      b.box('#b2f2bb', 0.44, 0.02, 0.9, 0.02, 0.01, 0);
      b.box('#69db7c', 0.16, 0.022, 0.2, -0.06, 0.012, 0.3);
      b.box('#ffe066', 0.14, 0.022, 0.18, 0.1, 0.012, -0.05);
      for (const [x, z, r] of [[0.06, 0.34, 0.5], [-0.02, 0.1, -0.5], [0.04, -0.14, 0.5], [-0.02, -0.36, -0.4]]) b.box('#3cb4e6', 0.08, 0.026, 0.3, x, 0.014, z, 0, r, 0);
      tree(b, -0.42, -0.3, 0.18, 0.13).ball('#2f9e44', 0.1, 0.4, 0.44, -0.25, 1.2, 0.7, 1).ball('#40c057', 0.09, 0.42, 0.44, 0.2, 1.2, 0.7, 1);
      // Le belvédère du parc Panorama et sa rambarde
      b.box('#f8f9fa', 0.02, 0.07, 0.5, -0.2, 0.515, 0.15);
      person(b, '#f03e3e', null, -0.3, 0.48, 0.28, 0.8);
      person(b, '#ffd43b', null, -0.36, 0.48, 0.1, 0.8);
      const m = new Builder();
      m.ball('#a1887f', 0.06, 0, 0.06, 0, 1, 1.1, 0.9);
      m.ball('#a1887f', 0.045, 0, 0.15, 0.01);
      m.ball('#f6c08a', 0.025, 0, 0.145, 0.045, 1.1, 1, 0.6);
      m.box('#a1887f', 0.02, 0.02, 0.14, 0, 0.03, -0.1, 0.5);
      const macaque = m.mesh();
      const farmer = person(new Builder(), '#1971c2', '#f2d16b', 0, 0, 0, 0.7).mesh();
      return {
        parts: [b.mesh(), macaque, farmer],
        update(t) {
          const hop = Math.max(0, Math.sin(t * 3));
          macaque.position.set(-0.2, 0.55 + hop * hop * 0.08, 0.15 + Math.sin(t * 0.5) * 0.2);
          macaque.rotation.y = PI / 2 + Math.sin(t * 1.3) * 0.6;
          farmer.position.set(-0.08, 0.02, 0.3 + Math.sin(t * 0.4) * 0.07);
          farmer.rotation.z = 0.3 + Math.sin(t * 3) * 0.25;
        },
      };
    },
  },
  {
    name: 'Palais de Pagaruyung',
    match: 'Palais de Pagaruyung',
    dx: 0.45,
    dz: 0.26,
    size: 0.19,
    height: 1.35,
    build() {
      const b = new Builder();
      b.box('#9ad17a', 1.2, 0.03, 0.8, 0, 0.015, 0.1);
      // Trois étages de bois sculpté sous une rangée de toits pointus
      gadang(b, 0, -0.12, 1.15, 0.03);
      for (const x of [-0.52, 0.52]) b.box('#7b3f1d', 0.16, 0.2, 0.3, x, 0.36, -0.12).box('#ffd23f', 0.165, 0.025, 0.305, x, 0.4, -0.12);
      b.box('#7b3f1d', 0.5, 0.16, 0.26, 0, 0.72, -0.12);
      b.box('#ffd23f', 0.505, 0.025, 0.265, 0, 0.74, -0.12);
      b.poly('#3a302c', saddle(0.42, 0.8, 1.12, 0.12), 0.3, 0, 0, -0.12);
      b.box('#7b3f1d', 0.22, 0.12, 0.2, 0, 0.92, -0.12);
      b.poly('#4a3a34', saddle(0.24, 0.98, 1.26, 0.1), 0.24, 0, 0, -0.12);
      for (const [x, y] of [[-0.42, 1.12], [0.42, 1.12], [-0.24, 1.26], [0.24, 1.26]]) b.cone('#ffd23f', 0.02, 0.1, 4, x, y + 0.05, -0.12);
      // Perron central, son toit en pointe tourné vers nous
      b.box('#7b3f1d', 0.2, 0.2, 0.2, 0, 0.26, 0.12);
      b.poly('#3a302c', saddle(0.2, 0.36, 0.6, 0.1), 0.14, 0, 0, 0.14, 0, PI / 2, 0);
      b.box('#d9c8a0', 0.14, 0.03, 0.2, 0, 0.1, 0.3, 0.6);
      // Grenier à riz (rangkiang)
      b.box('#7b3f1d', 0.14, 0.16, 0.14, 0.46, 0.17, 0.32);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box('#4a3628', 0.025, 0.1, 0.025, 0.46 + x * 0.05, 0.05, 0.32 + z * 0.05);
      b.poly('#3a302c', saddle(0.14, 0.25, 0.42, 0.07), 0.16, 0.46, 0, 0.32);
      for (const x of [-0.5, -0.36]) b.cyl('#6b4423', 0.01, 0.01, 0.8, 4, x, 0.4, 0.36);
      // Les marawa, bannières noir, rouge et jaune
      const marawa = () => new Builder().box('#212529', 0.035, 0.4, 0.012, 0.0175, 0, 0).box('#e03131', 0.035, 0.4, 0.012, 0.0525, 0, 0).box('#ffd43b', 0.035, 0.4, 0.012, 0.0875, 0, 0).mesh();
      const banners = [marawa(), marawa()];
      banners[0].position.set(-0.495, 0.58, 0.36);
      banners[1].position.set(-0.355, 0.58, 0.36);
      const visitors = person(person(new Builder(), '#ffd43b', null, -0.05, 0, 0, 0.75), '#e64980', null, 0.06, 0, 0, 0.75).mesh();
      return {
        parts: [b.mesh(), ...banners, visitors],
        update(t) {
          banners[0].rotation.y = Math.sin(t * 2.4) * 0.6;
          banners[1].rotation.y = Math.sin(t * 2.1 + 1) * 0.6;
          visitors.position.set(-0.2 + pingPong(t * 0.2) * 0.5, 0.03 + Math.abs(Math.sin(t * 6)) * 0.012, 0.44);
        },
      };
    },
  },
  {
    name: 'Tissages',
    match: 'Tissages de Pandai Sikek',
    dx: 0.2,
    dz: 0.46,
    size: 0.17,
    height: 0.8,
    build() {
      const b = new Builder();
      // Métier à tisser le songket : chaîne rouge à fils d'or, tisserande assise au bout
      b.box('#c9a36b', 0.9, 0.03, 0.8, 0.05, 0.015, 0.02);
      for (const x of [-0.42, -0.02]) for (const z of [-0.3, 0.1]) b.box(DARKWOOD, 0.035, 0.42, 0.035, x, 0.21, z);
      for (const z of [-0.3, 0.1]) b.box(DARKWOOD, 0.44, 0.03, 0.035, -0.22, 0.42, z);
      for (const x of [-0.42, -0.02]) b.box(DARKWOOD, 0.035, 0.03, 0.44, x, 0.42, -0.1);
      b.box('#c92a2a', 0.34, 0.015, 0.42, -0.22, 0.24, -0.08, 0.12, 0, 0);
      for (let i = 0; i < 4; i++) b.box('#ffd23f', 0.345, 0.018, 0.035, -0.22, 0.222 + i * 0.012, 0.08 - i * 0.1, 0.12, 0, 0);
      b.box('#a67c52', 0.3, 0.06, 0.08, -0.22, 0.1, 0.26);
      person(b, '#7048e8', null, -0.22, 0.12, 0.26, 0.85);
      b.ball('#e64980', 0.052, -0.22, 0.3, 0.25);
      // Songkets terminés, suspendus à une barre
      for (const x of [0.12, 0.5]) b.box(DARKWOOD, 0.03, 0.5, 0.03, x, 0.25, -0.05);
      b.box(DARKWOOD, 0.42, 0.025, 0.03, 0.31, 0.5, -0.05);
      const cloth = (c1, c2) => new Builder().box(c1, 0.14, 0.34, 0.012, 0, -0.17, 0).box(c2, 0.142, 0.03, 0.014, 0, -0.08, 0).box(c2, 0.142, 0.03, 0.014, 0, -0.2, 0).box(c2, 0.142, 0.05, 0.014, 0, -0.31, 0).mesh();
      const cloths = [cloth('#c92a2a', '#ffd23f'), cloth('#862e9c', '#ffd23f')];
      cloths[0].position.set(0.22, 0.49, -0.05);
      cloths[1].position.set(0.4, 0.49, -0.05);
      const shuttle = new Builder().box('#f8f9fa', 0.08, 0.025, 0.03, 0, 0, 0).mesh();
      const beater = new Builder().box('#e9d9a6', 0.4, 0.05, 0.025, 0, 0, 0).mesh();
      return {
        parts: [b.mesh(), ...cloths, shuttle, beater],
        update(t) {
          cloths[0].rotation.x = Math.sin(t * 1.8) * 0.25;
          cloths[1].rotation.x = Math.sin(t * 1.5 + 1) * 0.25;
          shuttle.position.set(-0.22 + Math.sin(t * 4) * 0.14, 0.275, 0.12);
          beater.position.set(-0.22, 0.28, 0.02 + Math.max(0, Math.sin(t * 4 + 1.5)) * 0.1);
        },
      };
    },
  },
  {
    name: 'Cuisine padang',
    match: 'Cuisine padang',
    dx: 0.02,
    dz: -0.36,
    size: 0.17,
    height: 0.7,
    build() {
      const b = new Builder();
      // La table couverte de petites assiettes : rendang, currys, sambal, légumes
      for (const x of [-0.34, 0.34]) for (const z of [-0.18, 0.18]) b.box(DARKWOOD, 0.04, 0.2, 0.04, x, 0.1, z);
      b.box('#a67c52', 0.82, 0.04, 0.5, 0, 0.22, 0);
      const dishes = ['#5a2d0c', '#f59f00', '#2f9e44', '#e03131', '#ffe066', '#7b3f1d', '#ff922b', '#f8f9fa', '#8d5524', '#74b816', '#e8590c', '#5a2d0c'];
      dishes.forEach((c, i) => {
        const x = -0.3 + (i % 4) * 0.2;
        const z = -0.15 + Math.floor(i / 4) * 0.15;
        b.cyl('#ffffff', 0.075, 0.055, 0.03, 8, x, 0.255, z);
        b.ball(c, 0.05, x, 0.275, z, 1, 0.6, 1);
      });
      b.cyl('#4dabf7', 0.05, 0.06, 0.1, 6, -0.2, 0.05, 0.38);
      person(b, '#f08c00', null, -0.2, 0.1, 0.38, 0.75);
      b.cyl('#4dabf7', 0.05, 0.06, 0.1, 6, 0.16, 0.05, 0.38);
      person(b, '#1971c2', null, 0.16, 0.1, 0.38, 0.75);
      // Le serveur arrive avec sa pile d'assiettes sur le bras
      const w = person(new Builder(), '#f8f9fa', null, 0, 0, 0, 0.95);
      w.cyl('#212529', 0.045, 0.045, 0.04, 6, 0, 0.245, 0);
      for (let i = 0; i < 4; i++) w.cyl('#ffffff', 0.06, 0.045, 0.025, 8, 0.1 + i * 0.012, 0.15 + i * 0.035, 0.02).ball(dishes[i], 0.035, 0.1 + i * 0.012, 0.165 + i * 0.035, 0.02, 1, 0.5, 1);
      const waiter = w.mesh();
      const steam = [puff(0.045), puff(0.045)];
      return {
        parts: [b.mesh(), waiter, ...steam],
        update(t) {
          const u = pingPong(t * 0.25);
          waiter.position.set(-0.42 + u * 0.84, Math.abs(Math.sin(t * 7)) * 0.012, -0.36);
          waiter.rotation.y = Math.sin(t * 0.8) * 0.3;
          steam.forEach((s, i) => rise(s, (t * 0.4 + i / 2) % 1, i ? 0.1 : -0.3, 0.3, 0, 0.35, 0.05, 1));
        },
      };
    },
  },
];

// ------------------------------------------------------------------------------------------------
// Kalimantan : Tanjung Puting
// ------------------------------------------------------------------------------------------------
const RIVER = '#3f93b8';

// Singe nasique assis : dos roux, ventre crème, gros nez rose
function nasique(b, x, y, z, s = 1, nose = 1) {
  b.ball('#c9743a', 0.1 * s, x, y + 0.11 * s, z, 1, 1.15, 0.9);
  b.ball('#f1e3c4', 0.075 * s, x, y + 0.09 * s, z + 0.05 * s, 1, 1.1, 0.7);
  b.ball('#c9743a', 0.065 * s, x, y + 0.27 * s, z + 0.01 * s);
  b.ball('#f0a184', 0.04 * s, x, y + 0.255 * s, z + 0.06 * s, 1, 1, 0.7);
  b.ball('#e8875f', 0.026 * s * nose, x, y + 0.23 * s, z + 0.1 * s, 1, 1.5, 1);
  b.box('#adb5bd', 0.03 * s, 0.12 * s, 0.03 * s, x - 0.07 * s, y + 0.04 * s, z + 0.07 * s);
  b.box('#adb5bd', 0.03 * s, 0.12 * s, 0.03 * s, x + 0.07 * s, y + 0.04 * s, z + 0.07 * s);
  return b;
}

const TANJUNG_PUTING = [
  {
    name: 'Camp Leakey',
    match: 'Camp Leakey',
    dx: 0.6,
    dz: -0.25,
    size: 0.16,
    height: 0.8,
    build() {
      const b = new Builder();
      // Eau noire, ponton, passerelle de bois qui s'enfonce dans la forêt, cabane du camp
      b.box('#1d3b3a', 1.1, 0.02, 0.44, 0, 0.012, 0.32);
      b.box('#4fa64a', 1.1, 0.05, 0.56, 0, 0.025, -0.2);
      b.box('#c9a36b', 0.14, 0.025, 0.74, -0.12, 0.13, 0.04);
      for (const z of [-0.28, -0.06, 0.16, 0.38]) for (const x of [-0.18, -0.06]) b.box(DARKWOOD, 0.025, 0.13, 0.025, x, 0.065, z);
      b.box('#c9a36b', 0.5, 0.025, 0.14, 0.06, 0.13, 0.4);
      for (const x of [-0.14, 0.28]) b.box(DARKWOOD, 0.025, 0.13, 0.025, x, 0.065, 0.45);
      stiltHut(b, 0.3, -0.2, 1, '#a67c52', '#2b8a3e', 0.04);
      b.box('#f8f9fa', 0.16, 0.07, 0.02, 0.3, 0.42, -0.06);
      tree(b, -0.42, -0.3, 0.42, 0.2, ['#237a36', '#2f9e44']);
      tree(b, 0.02, -0.4, 0.5, 0.2);
      tree(b, 0.48, 0.02, 0.26, 0.15, ['#40c057', '#51cf66']);
      person(b, '#f03e3e', null, 0.2, 0.14, 0.4, 0.75);
      // Un orang-outan se promène à quatre pattes sur la passerelle
      const o = new Builder();
      o.ball('#e8590c', 0.11, 0, 0.13, 0, 0.9, 0.85, 1.4, 1);
      o.ball('#e8590c', 0.075, 0, 0.2, 0.15);
      o.ball('#f6c08a', 0.045, 0, 0.19, 0.2, 1.1, 1, 0.6);
      for (const [x, z] of [[-0.07, 0.1], [0.07, 0.1], [-0.07, -0.1], [0.07, -0.1]]) o.box('#c2410c', 0.045, 0.13, 0.045, x, 0.06, z);
      const walker = o.mesh();
      const visitor = person(new Builder(), '#ffd43b', '#f2d16b', 0, 0, 0, 0.75).mesh();
      return {
        parts: [b.mesh(), walker, visitor],
        update(t) {
          const u = (t * 0.12) % 2;
          const back = u > 1;
          walker.position.set(-0.12, 0.145 + Math.abs(Math.sin(t * 6)) * 0.012, -0.26 + (back ? 2 - u : u) * 0.52);
          walker.rotation.y = back ? PI : 0;
          walker.rotation.z = Math.sin(t * 6) * 0.08;
          visitor.position.set(0.06 + Math.sin(t * 0.8) * 0.05, 0.14, 0.4);
          visitor.rotation.z = Math.sin(t * 2) * 0.1;
        },
      };
    },
  },
  {
    name: 'Tanjung Harapan',
    match: 'Orangs-outans de Tanjung Harapan',
    dx: -0.02,
    dz: 0.05,
    size: 0.16,
    height: 1.15,
    build() {
      const b = new Builder();
      // Plateforme de nourrissage, régime de bananes, gros mâle à disques faciaux
      for (const [x, z] of [[-0.22, -0.14], [0.22, -0.14], [-0.22, 0.14], [0.22, 0.14]]) b.box(DARKWOOD, 0.04, 0.24, 0.04, x + 0.08, 0.12, z);
      b.box('#c9a36b', 0.56, 0.03, 0.4, 0.08, 0.25, 0);
      for (const [x, z] of [[0.24, 0.06], [0.28, -0.02], [0.2, -0.04]]) b.ball('#ffd43b', 0.05, x, 0.29, z, 1.4, 0.7, 0.8);
      orang(b, 0.02, 0.265, -0.02, 1.05);
      b.ball('#7a3b1e', 0.045, -0.085, 0.63, 0.03, 0.6, 1.3, 0.7);
      b.ball('#7a3b1e', 0.045, 0.125, 0.63, 0.03, 0.6, 1.3, 0.7);
      // L'arbre et sa liane, par où arrivent les autres
      b.cyl('#7a4b25', 0.06, 0.09, 0.95, 6, -0.4, 0.475, -0.2);
      b.ball('#2f9e44', 0.27, -0.36, 1.02, -0.2, 1.2, 0.7, 1.1);
      b.ball('#40c057', 0.17, -0.12, 0.98, -0.24, 1.2, 0.7, 1);
      b.cyl('#5c7a2e', 0.012, 0.012, 0.7, 4, -0.18, 0.62, -0.2);
      // Le ranger et son panier, les visiteurs derrière la corde
      person(b, '#2b8a3e', '#5c7a2e', 0.44, 0, 0.1, 0.85);
      for (const x of [-0.44, -0.14, 0.16]) b.box(DARKWOOD, 0.02, 0.12, 0.02, x, 0.06, 0.42);
      b.box('#f1e3c4', 0.62, 0.012, 0.012, -0.14, 0.11, 0.42);
      person(b, '#f03e3e', null, -0.3, 0, 0.5, 0.8);
      person(b, '#1971c2', '#f2d16b', -0.06, 0, 0.52, 0.8);
      const arm = new Builder().box('#e8590c', 0.05, 0.2, 0.05, 0, -0.1, 0).ball('#ffd43b', 0.04, 0, -0.22, 0.02, 0.7, 1.4, 0.7).mesh(0.17, 0.55, 0.06);
      const young = orang(new Builder(), 0, -0.34, 0, 0.6, true, '#f76707').mesh();
      return {
        parts: [b.mesh(), arm, young],
        update(t) {
          arm.rotation.x = -1.6 - Math.max(0, Math.sin(t * 2)) * 1.1;
          arm.rotation.z = 0.5;
          young.position.set(-0.18, 0.5 + pingPong(t * 0.2) * 0.42, -0.2);
          young.rotation.z = Math.sin(t * 2.4) * 0.25;
        },
      };
    },
  },
  {
    name: 'Singes nasiques',
    match: 'Singes nasiques',
    dx: 0.1,
    dz: 0.33,
    size: 0.15,
    height: 1.1,
    build() {
      const b = new Builder();
      b.box(RIVER, 1.0, 0.02, 0.36, 0, 0.012, 0.3);
      b.box('#4fa64a', 1.0, 0.05, 0.4, 0, 0.025, -0.1);
      // Arbre du bord de l'eau, deux grosses branches où le groupe passe la soirée
      b.cyl('#7a4b25', 0.06, 0.09, 0.9, 6, -0.05, 0.45, -0.12);
      b.cyl('#7a4b25', 0.03, 0.04, 0.5, 5, -0.28, 0.5, -0.08, 0, 0, PI / 2 - 0.2);
      b.cyl('#7a4b25', 0.03, 0.04, 0.5, 5, 0.2, 0.72, -0.08, 0, 0, PI / 2 + 0.2);
      b.ball('#2f9e44', 0.24, -0.05, 0.98, -0.14, 1.3, 0.7, 1.1);
      b.ball('#40c057', 0.15, -0.46, 0.62, -0.14, 1.2, 0.7, 1);
      b.ball('#37b24d', 0.14, 0.42, 0.84, -0.14, 1.2, 0.7, 1);
      b.cone('#2b8a3e', 0.08, 0.2, 5, 0.42, 0.12, 0.04);
      b.cone('#2b8a3e', 0.07, 0.18, 5, -0.44, 0.11, 0.06);
      nasique(b, 0.28, 0.76, -0.06, 1.1, 1.5); // le mâle et son gros nez
      nasique(b, -0.34, 0.5, -0.06, 0.85, 0.7);
      const tail = new Builder().box('#f8f9fa', 0.028, 0.3, 0.028, 0, -0.15, 0).mesh(0.28, 0.8, -0.14);
      const j = new Builder();
      j.ball('#c9743a', 0.08, 0, 0, 0, 1.4, 0.9, 0.9);
      j.ball('#f1e3c4', 0.06, 0, -0.03, 0, 1.2, 0.7, 0.8);
      j.ball('#c9743a', 0.055, 0.13, 0.03, 0);
      j.ball('#e8875f', 0.022, 0.18, 0.01, 0, 1.4, 1, 1);
      j.box('#adb5bd', 0.14, 0.025, 0.025, 0.1, -0.05, 0.05, 0, 0, -0.5).box('#adb5bd', 0.14, 0.025, 0.025, -0.1, -0.05, 0.05, 0, 0, 0.5);
      j.box('#f8f9fa', 0.2, 0.025, 0.025, -0.2, 0.03, 0, 0, 0, -0.3);
      const jumper = j.mesh();
      const ripple = new Builder().add(new THREE.TorusGeometry(0.1, 0.012, 4, 10), '#d0ebff', 0, 0, 0, PI / 2).mesh(0.1, 0.03, 0.32);
      return {
        parts: [b.mesh(), tail, jumper, ripple],
        update(t) {
          tail.rotation.x = Math.sin(t * 1.8) * 0.3;
          tail.rotation.z = Math.sin(t * 1.1) * 0.15;
          // Saut d'une branche à l'autre, aller puis retour
          const u = (t * 0.35) % 2;
          const back = u > 1;
          const k = Math.min(1, (back ? u - 1 : u) / 0.6);
          const f = back ? 1 - k : k;
          jumper.position.set(-0.2 + f * 0.36, 0.58 + f * 0.2 + Math.sin(k * PI) * 0.22, 0.02);
          jumper.rotation.y = back ? PI : 0;
          jumper.rotation.z = (back ? -1 : 1) * (0.5 - k) * 1.2;
          const r = (t * 0.5) % 1;
          ripple.scale.set(0.5 + r * 1.5, 1, 0.5 + r * 1.5);
          ripple.visible = r < 0.9;
        },
      };
    },
  },
  {
    name: 'Pondok Tanggui',
    match: 'Pondok Tanggui',
    dx: 0.32,
    dz: 0.0,
    size: 0.15,
    height: 1.3,
    build() {
      const b = new Builder();
      // Deux troncs, une liane tendue entre eux, et la passerelle des visiteurs
      for (const [x, h] of [[-0.3, 1.05], [0.3, 0.95]]) {
        b.cyl('#7a4b25', 0.045, 0.07, h, 6, x, h / 2, -0.1);
        b.ball(x < 0 ? '#2f9e44' : '#237a36', 0.24, x, h + 0.06, -0.1, 1.2, 0.7, 1.1);
      }
      b.ball('#40c057', 0.16, 0, 1.08, -0.16, 1.4, 0.6, 1);
      b.cyl('#5c7a2e', 0.014, 0.014, 0.62, 4, 0, 0.84, -0.1, 0, 0, PI / 2);
      b.box('#c9a36b', 1.0, 0.025, 0.16, 0, 0.06, 0.36);
      for (const x of [-0.4, 0, 0.4]) b.box(DARKWOOD, 0.03, 0.06, 0.18, x, 0.03, 0.36);
      b.cone('#2b8a3e', 0.09, 0.2, 5, -0.46, 0.1, 0.1);
      b.cone('#40c057', 0.08, 0.16, 5, 0.46, 0.08, 0.12);
      person(b, '#2b8a3e', '#5c7a2e', 0.36, 0.07, 0.36, 0.8);
      // La mère suspendue par les deux bras, son petit agrippé contre elle
      const m = orang(new Builder(), 0, -0.57, 0, 1, true);
      m.ball('#ff922b', 0.07, 0.03, -0.42, 0.13);
      m.ball('#ff922b', 0.05, 0.03, -0.33, 0.17);
      m.ball('#f6c08a', 0.028, 0.03, -0.335, 0.215, 1, 1, 0.6);
      m.box('#c2410c', 0.055, 0.2, 0.055, -0.09, -0.6, 0.02, 0, 0, -0.3);
      m.box('#c2410c', 0.055, 0.2, 0.055, 0.09, -0.6, 0.02, 0, 0, 0.3);
      const mother = m.mesh(0, 0.84, -0.08);
      const visitors = person(person(new Builder(), '#f03e3e', null, -0.06, 0, 0, 0.8), '#ffd43b', '#f2d16b', 0.07, 0, 0, 0.8).mesh();
      return {
        parts: [b.mesh(), mother, visitors],
        update(t) {
          mother.rotation.x = Math.sin(t * 1.8) * 0.4;
          mother.position.x = Math.sin(t * 0.45) * 0.14;
          mother.rotation.z = Math.cos(t * 0.45) * 0.15;
          visitors.position.set(-0.36 + pingPong(t * 0.15) * 0.5, 0.075 + Math.abs(Math.sin(t * 6)) * 0.01, 0.36);
        },
      };
    },
  },
  {
    name: 'Croisière en klotok',
    match: 'Croisière en klotok',
    dx: 0.5,
    dz: 0.3,
    size: 0.18,
    height: 0.75,
    build() {
      const b = new Builder();
      b.box(RIVER, 1.25, 0.02, 0.56, 0, 0.012, 0.06); // la Sekonyer
      b.box('#4fa64a', 1.25, 0.05, 0.14, 0, 0.025, -0.28);
      for (const [x, h] of [[-0.52, 0.26], [-0.36, 0.2], [0.14, 0.24], [0.34, 0.3], [0.52, 0.2]]) b.cone(x > 0 ? '#2b8a3e' : '#37b24d', 0.07, h, 5, x, 0.05 + h / 2, -0.29);
      // Le klotok : coque de bois, cabine basse, pont supérieur couvert où l'on passe la journée
      const k = new Builder();
      k.poly('#8d5a2b', [[-0.42, 0.11], [0.48, 0.14], [0.36, 0], [-0.36, 0]], 0.2);
      k.poly('#2b8a3e', [[-0.42, 0.11], [0.48, 0.14], [0.47, 0.105], [-0.41, 0.075]], 0.204);
      k.box('#f8f9fa', 0.52, 0.13, 0.17, -0.07, 0.185, 0);
      for (let i = 0; i < 4; i++) k.box('#1c7ed6', 0.07, 0.065, 0.175, -0.25 + i * 0.12, 0.195, 0);
      k.box('#c9a36b', 0.64, 0.02, 0.2, -0.05, 0.26, 0);
      for (const x of [-0.34, -0.06, 0.24]) for (const z of [-0.085, 0.085]) k.box(DARKWOOD, 0.015, 0.17, 0.015, x, 0.35, z);
      k.box('#2b8a3e', 0.66, 0.025, 0.23, -0.05, 0.445, 0);
      person(k, '#f03e3e', null, 0.1, 0.27, 0.01, 0.6);
      person(k, '#ffd43b', '#f2d16b', -0.06, 0.27, -0.01, 0.6);
      k.box('#4dabf7', 0.16, 0.03, 0.14, -0.24, 0.285, 0);
      k.cyl('#495057', 0.016, 0.016, 0.12, 5, -0.33, 0.51, 0);
      k.cyl('#adb5bd', 0.006, 0.006, 0.2, 4, 0.3, 0.55, 0);
      k.box('#e03131', 0.09, 0.03, 0.01, 0.35, 0.63, 0).box('#ffffff', 0.09, 0.03, 0.01, 0.35, 0.6, 0);
      const klotok = k.mesh();
      const smoke = [puff(0.05), puff(0.05)];
      // Un crocodile glisse devant
      const c = new Builder();
      c.box('#5c7a2e', 0.24, 0.035, 0.08, 0, 0, 0);
      c.box('#5c7a2e', 0.12, 0.03, 0.055, 0.17, 0, 0);
      c.cone('#5c7a2e', 0.035, 0.2, 4, -0.2, 0, 0, 0, 0, PI / 2);
      c.ball('#ffd43b', 0.014, 0.12, 0.02, 0.025).ball('#ffd43b', 0.014, 0.12, 0.02, -0.025);
      for (let i = 0; i < 4; i++) c.box('#37592a', 0.03, 0.02, 0.03, -0.09 + i * 0.06, 0.025, 0);
      const croc = c.mesh();
      return {
        parts: [b.mesh(), klotok, ...smoke, croc],
        update(t) {
          const x = Math.sin(t * 0.3) * 0.1;
          klotok.position.set(x, 0.02 + Math.sin(t * 1.9) * 0.01, -0.02);
          klotok.rotation.z = Math.sin(t * 1.5) * 0.03;
          klotok.rotation.x = Math.sin(t * 1.1) * 0.04;
          smoke.forEach((s, i) => rise(s, (t * 0.5 + i / 2) % 1, x - 0.33, 0.6, -0.02, 0.3, -0.12, 0.9));
          const u = (t * 0.1) % 2;
          const back = u > 1;
          croc.position.set(-0.4 + (back ? 2 - u : u) * 0.8, 0.03, 0.26);
          croc.rotation.y = (back ? PI : 0) + Math.sin(t * 3) * 0.15;
        },
      };
    },
  },
  {
    name: 'Lucioles',
    match: 'Lucioles et nuit',
    dx: 0.0,
    dz: -0.25,
    size: 0.15,
    height: 0.95,
    build() {
      const b = new Builder();
      b.box(RIVER, 1.0, 0.02, 0.44, 0, 0.012, 0.26);
      b.box('#3f8f45', 1.0, 0.05, 0.36, 0, 0.025, -0.14);
      // Palmiers nipa de la berge
      for (const [x, z, h] of [[-0.36, -0.12, 0.6], [-0.2, -0.22, 0.48], [-0.06, -0.1, 0.66], [0.12, -0.2, 0.5], [0.3, -0.1, 0.62], [0.44, -0.22, 0.44]]) {
        b.cone('#1f6b33', 0.09, h, 5, x, 0.05 + h / 2, z);
        b.cone('#2b8a3e', 0.06, h * 0.7, 5, x + 0.07, 0.05 + h * 0.35, z + 0.04, 0, 0, -0.3);
      }
      // Le pont du klotok amarré : matelas sous la moustiquaire
      b.poly('#8d5a2b', [[-0.34, 0.08], [0.38, 0.1], [0.3, 0], [-0.3, 0]], 0.22, 0, 0.02, 0.3);
      b.box('#c9a36b', 0.62, 0.02, 0.2, 0.02, 0.115, 0.3);
      b.box('#4dabf7', 0.26, 0.03, 0.16, -0.06, 0.14, 0.3);
      b.pyr('#f8f9fa', 0.2, 0.22, -0.06, 0.27, 0.3);
      b.box('#ffd43b', 0.04, 0.06, 0.04, 0.24, 0.155, 0.3);
      b.ball('#fff3bf', 0.07, 0.4, 0.86, -0.3);
      const swarm = (n) => {
        const f = new Builder();
        for (let i = 0; i < 4; i++) f.octa('#fff200', 0.04, Math.sin(i * 2.4 + n) * 0.34, Math.cos(i * 1.7 + n * 2) * 0.16, Math.cos(i * 3.1 + n) * 0.1);
        return f.mesh();
      };
      const swarms = [swarm(0), swarm(1), swarm(2)];
      return {
        parts: [b.mesh(), ...swarms],
        update(t) {
          swarms.forEach((f, i) => {
            f.position.set(Math.sin(t * 0.5 + i * 2) * 0.08, 0.5 + Math.sin(t * 0.7 + i) * 0.06, -0.1 + i * 0.05);
            f.scale.setScalar(0.25 + Math.max(0, Math.sin(t * 2.2 + i * 2.1)) * 1.0);
            f.rotation.y = Math.sin(t * 0.4 + i) * 0.3;
          });
        },
      };
    },
  },
];

// ------------------------------------------------------------------------------------------------
// Kalimantan : archipel de Derawan
// ------------------------------------------------------------------------------------------------
const LAGOON = '#5fe0d8';

const DERAWAN = [
  {
    name: 'Journée en hors-bord',
    sea: true,
    match: 'Journée en hors-bord',
    dx: 0.15,
    dz: -0.3,
    size: 0.2,
    height: 0.45,
    build() {
      const s = new Builder();
      s.poly('#ffffff', [[-0.2, 0.09], [0.26, 0.1], [0.16, 0], [-0.18, 0]], 0.16);
      s.poly('#1c7ed6', [[-0.2, 0.09], [0.26, 0.1], [0.25, 0.07], [-0.2, 0.06]], 0.164);
      for (const x of [-0.12, 0.06]) for (const z of [-0.07, 0.07]) s.box('#adb5bd', 0.012, 0.14, 0.012, x, 0.16, z);
      s.box('#1c7ed6', 0.24, 0.02, 0.17, -0.03, 0.235, 0);
      person(s, '#f03e3e', null, -0.06, 0.09, 0.02, 0.55);
      person(s, '#ffd43b', null, 0.03, 0.09, -0.03, 0.55);
      s.box('#343a40', 0.05, 0.1, 0.06, -0.22, 0.07, 0);
      const boat = s.mesh();
      const wake = [puff(0.06), puff(0.05), puff(0.04)];
      const b = new Builder();
      b.ball(SAND, 0.1, 0.36, 0, -0.3, 1.4, 0.3, 1).ball('#40c057', 0.06, 0.36, 0.04, -0.3, 1.3, 0.6, 1);
      return {
        parts: [b.mesh(), boat, ...wake],
        update(t) {
          const a = t * 0.8;
          boat.position.set(Math.cos(a) * 0.3, 0.02 + Math.abs(Math.sin(t * 6)) * 0.015, Math.sin(a) * 0.26);
          boat.rotation.y = -a - PI / 2;
          boat.rotation.z = 0.12 + Math.sin(t * 6) * 0.04;
          wake.forEach((w, i) => {
            const back = a - 0.5 - i * 0.35;
            w.position.set(Math.cos(back) * 0.3, 0.02, Math.sin(back) * 0.26);
            w.scale.set(1.2 - i * 0.2, 0.4, 1.2 - i * 0.2);
          });
        },
      };
    },
  },
  {
    name: 'Tour de Derawan',
    match: 'Tour de Derawan',
    dx: -0.34,
    dz: -0.16,
    size: 0.22,
    height: 0.85,
    build() {
      const b = new Builder();
      // Toute l'île : un anneau de sable, le village au milieu, des chambres sur pilotis au bord
      b.cyl(LAGOON, 0.6, 0.6, 0.012, 12, 0, 0.006, 0);
      b.cyl(SAND, 0.46, 0.5, 0.04, 10, 0, 0.02, 0);
      b.cyl('#8fd36a', 0.28, 0.32, 0.03, 9, -0.02, 0.05, -0.04);
      for (const [x, z, c] of [[-0.12, -0.1, '#ffd8a8'], [0.06, -0.14, '#d0ebff'], [-0.02, 0.04, '#ffc9c9']]) {
        b.box(c, 0.1, 0.08, 0.09, x, 0.1, z);
        b.pyr('#c92a2a', 0.085, 0.07, x, 0.175, z);
      }
      stiltHut(b, 0.5, 0.22, 0.7, '#fff3d6', '#c49a4a');
      stiltHut(b, 0.56, -0.04, 0.6, '#d0ebff', '#a67f35');
      b.box('#c9a36b', 0.3, 0.02, 0.06, 0.42, 0.1, 0.1, 0, 0.4, 0);
      const trunks = [palmTrunk(b, -0.24, 0.1, 0.5, 0.12, 0.04), palmTrunk(b, 0.14, 0.06, 0.6, -0.1, 0.04), palmTrunk(b, -0.14, -0.22, 0.44, 0.08, 0.04)];
      const leaves = trunks.map(([x, y, z], i) => fronds(0.8 - i * 0.06).mesh(x, y + 0.03, z));
      const rider = bike('#ff5fa2');
      return {
        parts: [b.mesh(), ...leaves, rider],
        update(t) {
          leaves.forEach((l, i) => {
            l.rotation.z = Math.sin(t * 1.4 + i) * 0.14;
            l.rotation.x = Math.cos(t * 1.1 + i) * 0.1;
          });
          const a = t * 0.6;
          rider.position.set(Math.cos(a) * 0.39, 0.04, Math.sin(a) * 0.39);
          rider.rotation.y = -a - PI / 2;
        },
      };
    },
  },
  {
    name: 'Tortues vertes',
    sea: true,
    match: 'Tortues vertes',
    dx: -0.08,
    dz: 0.14,
    size: 0.21,
    height: 0.6,
    build() {
      const b = new Builder();
      // L'herbier au pied du ponton
      b.cyl(LAGOON, 0.56, 0.56, 0.012, 12, 0, 0.006, 0);
      for (const [x, z, r] of [[-0.1, 0.2, 0.13], [0.26, 0.02, 0.11], [0.1, 0.34, 0.1], [-0.3, 0.02, 0.08]]) b.ball('#38b28a', r, x, 0.008, z, 1.3, 0.1, 1);
      // Ponton sur pilotis et sa cabane
      b.box('#c9a36b', 0.12, 0.025, 0.6, -0.34, 0.15, -0.12);
      b.box('#c9a36b', 0.5, 0.025, 0.12, -0.14, 0.15, -0.36);
      for (const [x, z] of [[-0.34, 0.14], [-0.34, -0.12], [-0.34, -0.38], [-0.1, -0.38], [0.08, -0.38]]) b.box(DARKWOOD, 0.03, 0.15, 0.03, x, 0.075, z);
      stiltHut(b, 0.2, -0.36, 0.8, '#fff3d6', '#c49a4a');
      person(b, '#f03e3e', null, -0.34, 0.16, 0.08, 0.75);
      const hero = createModel('turtle');
      hero.object.position.set(0.06, 0, 0.12);
      hero.object.scale.setScalar(0.9);
      const second = turtleMesh(0.6);
      const diver = snorkeler('#ff7b1c');
      diver.scale.setScalar(0.8);
      return {
        parts: [b.mesh(), hero.object, second, diver],
        update(t) {
          hero.update(t);
          const a = -t * 0.4 + 2;
          second.position.set(0.22 + Math.cos(a) * 0.14, 0.04 + Math.sin(t * 1.4) * 0.01, -0.02 + Math.sin(a) * 0.1);
          second.rotation.y = -a + PI / 2;
          diver.position.set(-0.14 + Math.sin(t * 0.35) * 0.08, 0.02 + Math.sin(t * 2.2) * 0.01, 0.4);
          diver.rotation.z = Math.sin(t * 2.2) * 0.05;
        },
      };
    },
  },
  {
    name: 'Maratua',
    match: 'Lagon et tombants',
    dx: 0.64,
    dz: 0.06,
    size: 0.23,
    height: 0.55,
    build() {
      const b = new Builder();
      // L'atoll en fer à cheval autour de son lagon turquoise, le bleu profond du tombant dehors
      b.cyl('#1c7ed6', 0.6, 0.6, 0.01, 12, 0, 0.005, 0);
      b.cyl(LAGOON, 0.44, 0.44, 0.016, 12, 0, 0.008, 0);
      for (let i = 0; i <= 9; i++) {
        const a = PI * 0.75 + (i / 9) * PI * 1.5;
        const x = Math.cos(a) * 0.42;
        const z = Math.sin(a) * 0.38;
        b.ball(SAND, 0.12, x, 0.01, z, 1.2, 0.25, 1.2);
        b.ball(i % 2 ? '#2f9e44' : '#40c057', 0.085, x * 1.03, 0.05, z * 1.03, 1.2, 0.7 + (i % 3) * 0.15, 1.1);
      }
      // Bungalows sur le lagon
      for (const x of [-0.16, 0.0]) {
        b.box('#c9a36b', 0.1, 0.02, 0.1, x, 0.07, -0.12).box('#fff3d6', 0.08, 0.06, 0.08, x, 0.11, -0.12).pyr('#c49a4a', 0.08, 0.07, x, 0.175, -0.12);
        b.box(DARKWOOD, 0.02, 0.07, 0.02, x, 0.035, -0.12);
      }
      b.box('#c9a36b', 0.3, 0.015, 0.03, -0.08, 0.07, -0.2);
      // Poissons en banc et tortue au-dessus du tombant
      const f = new Builder();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        f.octa(i % 2 ? '#ffd43b' : '#ff922b', 0.035, Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12, 1.6, 0.9, 0.5, -a + PI / 2);
      }
      const school = f.mesh(0.08, 0.05, 0.1);
      const turtle = turtleMesh(0.55);
      const diver = snorkeler('#e64980');
      diver.scale.setScalar(0.7);
      return {
        parts: [b.mesh(), school, turtle, diver],
        update(t) {
          school.rotation.y = t * 0.9;
          school.position.y = 0.05 + Math.sin(t * 1.6) * 0.01;
          const a = t * 0.45;
          turtle.position.set(0.3 + Math.cos(a) * 0.1, 0.035, 0.34 + Math.sin(a) * 0.08);
          turtle.rotation.y = -a - PI / 2;
          diver.position.set(0.16 + Math.sin(t * 0.3) * 0.08, 0.02 + Math.sin(t * 2.2) * 0.008, 0.44);
        },
      };
    },
  },
  {
    name: 'Lac aux méduses',
    sea: true,
    match: 'Lac aux méduses',
    dx: 0.42,
    dz: 0.36,
    size: 0.22,
    height: 0.6,
    build() {
      const b = new Builder();
      // Kakaban : un anneau de jungle autour d'un lac vert
      b.cyl(SAND, 0.56, 0.6, 0.03, 12, 0, 0.015, 0);
      b.cyl('#2ec4a6', 0.36, 0.36, 0.03, 12, 0, 0.035, 0.02);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const front = Math.sin(a) > 0.3;
        b.ball(i % 2 ? '#2f9e44' : '#37b24d', 0.13, Math.cos(a) * 0.45, 0.06, 0.02 + Math.sin(a) * 0.43, 1.1, front ? 0.45 : 1.0, 1.1);
      }
      // Méduses orange qui montent et descendent en pulsant
      const jelly = () => {
        const j = new Builder();
        j.ball('#ffa94d', 0.07, 0, 0, 0, 1, 0.75, 1, 1);
        j.ball('#ffd8a8', 0.045, 0, -0.01, 0, 1, 0.6, 1);
        for (let i = 0; i < 4; i++) j.box('#ff922b', 0.014, 0.09, 0.014, Math.cos(i * 1.57) * 0.03, -0.07, Math.sin(i * 1.57) * 0.03);
        return j.mesh();
      };
      const jellies = [jelly(), jelly(), jelly(), jelly()];
      const spots = [[-0.16, -0.06], [0.14, -0.1], [0.02, 0.12], [-0.2, 0.14]];
      const diver = snorkeler('#1971c2');
      diver.scale.setScalar(0.75);
      return {
        parts: [b.mesh(), ...jellies, diver],
        update(t) {
          jellies.forEach((j, i) => {
            const k = Math.sin(t * 2.4 + i * 1.6);
            j.position.set(spots[i][0], 0.13 + Math.sin(t * 0.8 + i * 1.3) * 0.05, spots[i][1]);
            j.scale.set(1 + k * 0.18, 1 - k * 0.22, 1 + k * 0.18);
          });
          diver.position.set(0.16 + Math.sin(t * 0.3) * 0.06, 0.06 + Math.sin(t * 2.2) * 0.008, 0.2);
          diver.rotation.y = Math.sin(t * 0.3) * 0.3;
        },
      };
    },
  },
  {
    name: 'Raies manta',
    sea: true,
    match: 'Raies manta',
    dx: -0.2,
    dz: 0.5,
    size: 0.22,
    height: 0.6,
    build() {
      const b = new Builder();
      // Sangalaki : un îlot désert, la cabane de l'équipe qui protège les nids de tortues
      b.ball(SAND, 0.2, -0.36, 0, -0.3, 1.3, 0.25, 1);
      b.ball('#40c057', 0.11, -0.38, 0.05, -0.32, 1.3, 0.6, 1);
      b.box('#fff3d6', 0.08, 0.07, 0.07, -0.26, 0.07, -0.24).pyr('#c49a4a', 0.075, 0.06, -0.26, 0.135, -0.24);
      const manta = createModel('manta');
      manta.object.scale.setScalar(1.15);
      const diver = snorkeler('#ffd43b');
      diver.scale.setScalar(0.75);
      return {
        parts: [b.mesh(), manta.object, diver],
        update(t) {
          manta.update(t);
          diver.position.set(-0.3 + Math.sin(t * 0.3) * 0.05, 0.02 + Math.sin(t * 2.2) * 0.01, 0.34);
        },
      };
    },
  },
  {
    name: 'Requins-baleines',
    sea: true,
    match: 'Requins-baleines',
    dx: 0.38,
    dz: 0.7,
    size: 0.22,
    height: 0.8,
    build() {
      const b = new Builder();
      // Plateforme de pêche (bagan) : cadre de bambou, cabane, filet
      for (const [x, z] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.16], [0.22, 0.16]]) b.cyl('#c9a36b', 0.018, 0.018, 0.4, 5, x, 0.2, z - 0.06);
      b.box('#c9a36b', 0.56, 0.025, 0.46, 0, 0.3, -0.08);
      b.box(LAGOON, 0.36, 0.027, 0.26, 0, 0.3, -0.04);
      for (let i = -1; i <= 1; i++) b.box('#868e96', 0.008, 0.028, 0.26, i * 0.09, 0.301, -0.04).box('#868e96', 0.36, 0.028, 0.008, 0, 0.301, -0.04 + i * 0.07);
      b.box('#fff3d6', 0.16, 0.11, 0.12, -0.16, 0.37, -0.22).pyr('#c49a4a', 0.14, 0.1, -0.16, 0.475, -0.22);
      person(b, '#1971c2', '#f2d16b', 0.18, 0.31, -0.22, 0.75);
      b.cyl('#c9a36b', 0.008, 0.008, 0.5, 4, 0.26, 0.5, 0.1);
      b.ball('#ffe066', 0.035, 0.26, 0.76, 0.1);
      // Le requin-baleine tourne sous la plateforme
      const w = new Builder();
      w.ball('#3b5b7a', 0.14, 0, 0.03, 0, 2.3, 0.5, 1.0, 1);
      w.box('#3b5b7a', 0.14, 0.07, 0.22, 0.3, 0.03, 0);
      w.box('#f1f3f5', 0.02, 0.03, 0.18, 0.375, 0.02, 0);
      w.poly('#3b5b7a', [[-0.06, 0], [0.06, 0], [-0.05, 0.1]], 0.02, -0.02, 0.09, 0);
      for (const side of [1, -1]) w.box('#3b5b7a', 0.1, 0.02, 0.16, 0.12, 0.01, 0.16 * side, 0, 0.5 * side, 0);
      for (let i = 0; i < 9; i++) w.ball('#e7f5ff', 0.016, -0.22 + (i % 5) * 0.11, 0.1 - Math.abs((i % 5) - 2) * 0.012, (i < 5 ? 0.05 : -0.05) * (1 + (i % 2) * 0.4));
      const tail = new Builder().cone('#3b5b7a', 0.07, 0.24, 4, -0.12, 0, 0, 0, 0, PI / 2).poly('#3b5b7a', [[-0.26, -0.02], [-0.2, 0], [-0.3, 0.16]], 0.02).mesh(-0.26, 0.03, 0);
      const shark = group(w.mesh(), tail);
      const diver = snorkeler('#f03e3e');
      diver.scale.setScalar(0.7);
      const fish = new Builder();
      for (let i = 0; i < 5; i++) fish.octa('#dee2e6', 0.02, Math.sin(i * 2.1) * 0.1, i * 0.05, Math.cos(i * 1.3) * 0.08, 1.6, 0.8, 0.5);
      const catchFish = fish.mesh(0, 0.02, -0.04);
      return {
        parts: [b.mesh(), shark, diver, catchFish],
        update(t) {
          const a = t * 0.4;
          shark.position.set(Math.cos(a) * 0.3, 0.03 + Math.sin(t * 1.2) * 0.008, 0.02 + Math.sin(a) * 0.3);
          shark.rotation.y = -a - PI / 2;
          tail.rotation.y = Math.sin(t * 3) * 0.4;
          diver.position.set(Math.cos(a + 2.2) * 0.44, 0.02 + Math.sin(t * 2.2) * 0.01, 0.02 + Math.sin(a + 2.2) * 0.42);
          diver.rotation.y = -a - 2.2 - PI / 2;
          catchFish.position.y = 0.02 + ((t * 0.3) % 1) * 0.2;
          catchFish.scale.setScalar(Math.sin(((t * 0.3) % 1) * PI));
        },
      };
    },
  },
];

// ------------------------------------------------------------------------------------------------
// Sulawesi : pays Toraja
// ------------------------------------------------------------------------------------------------

// Grenier à riz toraja (alang) : petite caisse sur quatre piliers ronds, toit en coque de bateau
function alang(b, x, z, s = 1) {
  for (const px of [-0.09, 0.09]) for (const pz of [-0.07, 0.07]) b.cyl('#4a3628', 0.025 * s, 0.025 * s, 0.2 * s, 6, x + px * s, 0.1 * s, z + pz * s);
  b.box('#7b3f1d', 0.28 * s, 0.15 * s, 0.2 * s, x, 0.275 * s, z);
  b.box('#c92a2a', 0.285 * s, 0.035 * s, 0.205 * s, x, 0.26 * s, z);
  b.box('#ffd23f', 0.285 * s, 0.015 * s, 0.205 * s, x, 0.3 * s, z);
  const sc = (pts) => pts.map(([px, py]) => [px * s, py * s]);
  b.poly('#3a2a26', sc(saddle(0.32, 0.37, 0.66, 0.13)), 0.26 * s, x, 0, z);
  b.poly('#c92a2a', sc(saddle(0.28, 0.355, 0.6, 0.04)), 0.18 * s, x, 0, z);
  return b;
}

// Buffle : corps et pattes dans le décor ; la tête, à part, peut bouger. Tourné vers -x.
function buffaloBody(b, x, z, s = 1, hide = '#4b4f58', y = 0) {
  b.box(hide, 0.28 * s, 0.15 * s, 0.14 * s, x, y + 0.17 * s, z);
  for (const [px, pz] of [[-0.1, -0.04], [0.1, -0.04], [-0.1, 0.04], [0.1, 0.04]]) b.box('#33363d', 0.04 * s, 0.1 * s, 0.04 * s, x + px * s, y + 0.05 * s, z + pz * s);
  b.box('#33363d', 0.02 * s, 0.12 * s, 0.02 * s, x + 0.15 * s, y + 0.16 * s, z);
  return b;
}
function buffaloHead(s = 1, hide = '#4b4f58') {
  const h = new Builder();
  h.box(hide, 0.13 * s, 0.1 * s, 0.11 * s, -0.06 * s, -0.02 * s, 0);
  h.box('#f1f3f5', 0.03 * s, 0.03 * s, 0.28 * s, -0.05 * s, 0.04 * s, 0);
  h.box('#f1f3f5', 0.03 * s, 0.09 * s, 0.03 * s, -0.05 * s, 0.085 * s, 0.14 * s);
  h.box('#f1f3f5', 0.03 * s, 0.09 * s, 0.03 * s, -0.05 * s, 0.085 * s, -0.14 * s);
  return h.mesh();
}

const TORAJA = [
  {
    name: 'Batutumonga',
    match: 'Rizières de Batutumonga',
    dx: -0.55,
    dz: -0.45,
    size: 0.2,
    height: 0.8,
    build() {
      const b = new Builder();
      // Versant en terrasses semé de gros rochers ; tout en haut, le café face à la vallée
      const greens = ['#8ce99a', '#51cf66', '#ffe066', '#69db7c', '#b2f2bb'];
      for (let k = 0; k < 5; k++) {
        const top = 0.06 + k * 0.08;
        const z = 0.32 - k * 0.16;
        b.box('#a67c52', 1.0 - k * 0.04, top, 0.16, 0, top / 2, z);
        b.box(greens[k], 0.97 - k * 0.04, 0.016, 0.14, 0, top + 0.008, z);
      }
      b.box('#7fd8f7', 0.3, 0.018, 0.12, 0.26, 0.149, 0.16);
      b.ball('#3d4046', 0.11, -0.3, 0.2, 0.18, 1.2, 0.9, 1);
      b.ball('#4b4f58', 0.08, 0.36, 0.33, -0.02, 1.1, 0.9, 1);
      // Le rocher de Lo'ko Mata, percé de caveaux
      b.ball('#4b4f58', 0.15, -0.1, 0.4, -0.2, 1.2, 1, 0.9, 1);
      for (const [x, y] of [[-0.16, 0.42], [-0.06, 0.44], [-0.11, 0.34]]) b.box('#8d5a2b', 0.045, 0.045, 0.02, x, y, -0.07);
      b.box('#fff3d6', 0.2, 0.12, 0.14, 0.3, 0.44, -0.34);
      b.poly('#3a2a26', saddle(0.16, 0.5, 0.64, 0.07), 0.18, 0.3, 0, -0.34);
      person(b, '#f03e3e', null, 0.12, 0.38, -0.3, 0.7);
      const steam = puff(0.04);
      const walker = person(new Builder(), '#1971c2', '#f2d16b', 0, 0, 0, 0.8).mesh();
      const farmer = person(new Builder(), '#e64980', '#f2d16b', 0, 0, 0, 0.75).mesh();
      return {
        parts: [b.mesh(), steam, walker, farmer],
        update(t) {
          rise(steam, (t * 0.4) % 1, 0.14, 0.52, -0.26, 0.25, 0.04, 1);
          // On redescend à pied, une terrasse après l'autre
          const u = (t * 0.1) % 1;
          const k = Math.min(4, Math.floor((1 - u) * 5));
          walker.position.set(-0.42 + u * 0.3, 0.076 + k * 0.08 + Math.abs(Math.sin(t * 7)) * 0.012, -0.34 + u * 0.7);
          walker.scale.setScalar(fade(u));
          farmer.position.set(0.1 + Math.sin(t * 0.4) * 0.16, 0.23, 0.0);
          farmer.rotation.z = 0.3 + Math.sin(t * 3) * 0.25;
        },
      };
    },
  },
  {
    name: 'Menhirs de Bori',
    match: 'Menhirs de Bori',
    dx: -0.1,
    dz: -0.45,
    size: 0.19,
    height: 0.95,
    build() {
      const b = new Builder();
      b.cyl('#9ad17a', 0.55, 0.58, 0.03, 10, 0, 0.015, 0);
      // Une centaine de pierres dressées, de toutes les tailles
      const stones = [[-0.36, -0.22, 0.5], [-0.18, -0.28, 0.78], [0.02, -0.24, 0.6], [0.2, -0.3, 0.86], [0.38, -0.2, 0.44], [-0.3, 0.0, 0.34], [-0.1, -0.02, 0.5], [0.12, 0.02, 0.4], [0.32, 0.04, 0.56], [-0.2, 0.22, 0.22], [0.02, 0.26, 0.3], [0.24, 0.26, 0.2]];
      stones.forEach(([x, z, h], i) => {
        b.cyl(i % 3 ? '#9a9a8e' : '#84847a', 0.03 + h * 0.03, 0.05 + h * 0.04, h, 5, x, h / 2, z, 0, i, 0);
        if (i % 2) b.ball('#6fae4f', 0.035, x, h, z, 1, 0.5, 1);
      });
      const visitor = person(new Builder(), '#f08c00', null, 0, 0, 0, 0.8).mesh();
      const bird = new Builder().ball('#212529', 0.035, 0, 0.03, 0, 1.4, 1, 1).box('#212529', 0.05, 0.012, 0.16, 0, 0.05, 0).cone('#ffd43b', 0.012, 0.04, 4, 0.06, 0.035, 0, 0, 0, -PI / 2).mesh();
      return {
        parts: [b.mesh(), visitor, bird],
        update(t) {
          const a = t * 0.4;
          visitor.position.set(Math.sin(a) * 0.4, 0.03 + Math.abs(Math.sin(t * 6)) * 0.012, 0.14 + Math.sin(a * 2) * 0.07);
          // Le corbeau passe d'une pierre à l'autre
          const u = (t * 0.25) % 2;
          const k = THREE.MathUtils.clamp(((u % 1) - 0.6) / 0.4, 0, 1);
          const f = u < 1 ? k : 1 - k;
          bird.position.set(0.2 - f * 0.38, 0.87 - f * 0.08 + Math.sin(k * PI) * 0.12, -0.3 + f * 0.02);
          bird.scale.z = k > 0 && k < 1 ? 1 + Math.sin(t * 20) * 0.5 : 0.4;
          bird.rotation.y = u < 1 ? PI : 0;
        },
      };
    },
  },
  {
    name: 'Marché de Bolu',
    match: 'Marché aux buffles',
    dx: 0.28,
    dz: -0.25,
    size: 0.2,
    height: 0.6,
    build() {
      const b = new Builder();
      b.box('#d9c8a0', 1.1, 0.03, 0.8, 0, 0.015, 0);
      // Buffles brossés attachés à leurs piquets ; le plus cher est tacheté de rose
      buffaloBody(b, -0.2, -0.2, 1.15);
      buffaloBody(b, 0.22, -0.02, 1.25, '#f3c5c0');
      for (const [x, y, z] of [[0.3, 0.26, 0.07], [0.14, 0.2, 0.07], [0.26, 0.3, -0.06]]) b.box('#33363d', 0.09, 0.08, 0.02, x, y, z);
      buffaloBody(b, -0.16, 0.26, 1.05, '#3d4046');
      for (const [x, z] of [[-0.48, -0.2], [-0.1, -0.02], [-0.44, 0.26]]) b.cyl('#c9a36b', 0.015, 0.015, 0.3, 5, x, 0.15, z);
      person(b, '#1971c2', null, 0.44, 0.03, 0.3, 0.85);
      person(b, '#f8f9fa', '#f2d16b', 0.3, 0.03, 0.34, 0.85);
      const heads = [buffaloHead(1.15), buffaloHead(1.25, '#f3c5c0'), buffaloHead(1.05, '#3d4046')];
      heads[0].position.set(-0.36, 0.28, -0.2);
      heads[1].position.set(0.05, 0.3, -0.02);
      heads[2].position.set(-0.31, 0.26, 0.26);
      const seller = person(new Builder(), '#c92a2a', '#f2d16b', 0, 0, 0, 0.85).mesh();
      return {
        parts: [b.mesh(), ...heads, seller],
        update(t) {
          heads.forEach((h, i) => {
            h.rotation.z = 0.2 + Math.sin(t * 1.5 + i * 2) * 0.3;
            h.rotation.y = Math.sin(t * 0.8 + i) * 0.25;
          });
          seller.position.set(0.3 + Math.sin(t * 0.5) * 0.18, 0.03 + Math.abs(Math.sin(t * 6)) * 0.012, -0.3);
        },
      };
    },
  },
  {
    name: 'Funérailles',
    match: 'Assister à des funérailles',
    dx: -0.6,
    dz: -0.05,
    size: 0.2,
    height: 0.9,
    build() {
      const b = new Builder();
      b.box('#d9c8a0', 1.1, 0.03, 0.9, 0, 0.015, 0.02);
      // Pavillon de bambou drapé de rouge où s'assoient les invités, vêtus de sombre
      for (const x of [-0.42, -0.1, 0.22]) for (const z of [-0.4, -0.2]) b.cyl('#c9a36b', 0.018, 0.018, 0.5, 5, x, 0.25, z);
      b.box('#c9a36b', 0.74, 0.03, 0.26, -0.1, 0.2, -0.3);
      b.box('#c92a2a', 0.74, 0.08, 0.02, -0.1, 0.16, -0.17);
      b.box('#8d6e3f', 0.8, 0.03, 0.34, -0.1, 0.5, -0.3, 0.2, 0, 0);
      for (const x of [-0.32, -0.14, 0.04]) person(b, '#212529', null, x, 0.21, -0.3, 0.7);
      buffaloBody(b, 0.4, 0.3, 1.05);
      b.cyl('#c9a36b', 0.012, 0.012, 0.86, 5, 0.42, 0.43, -0.28);
      const banner = flag('#c92a2a', '#f8f9fa', 0.08, 0.5);
      banner.position.set(0.425, 0.6, -0.28);
      const head = buffaloHead(1.05);
      head.position.set(0.25, 0.25, 0.3);
      // Le cortège porte le cercueil sous son petit toit de tongkonan, en le secouant
      const c = new Builder();
      for (const [x, z] of [[-0.14, -0.07], [0.14, -0.07], [-0.14, 0.07], [0.14, 0.07]]) person(c, '#212529', null, x, 0, z, 0.8);
      c.box('#c9a36b', 0.44, 0.02, 0.02, 0, 0.2, -0.07).box('#c9a36b', 0.44, 0.02, 0.02, 0, 0.2, 0.07);
      c.cyl('#c92a2a', 0.05, 0.05, 0.26, 8, 0, 0.26, 0, 0, 0, PI / 2);
      for (const x of [-0.08, 0.08]) c.cyl('#ffd23f', 0.053, 0.053, 0.03, 8, x, 0.26, 0, 0, 0, PI / 2);
      c.poly('#c92a2a', saddle(0.2, 0.34, 0.5, 0.06), 0.14, 0, 0, 0);
      c.poly('#ffd23f', saddle(0.2, 0.39, 0.52, 0.02), 0.03, 0, 0, 0);
      const bier = c.mesh();
      return {
        parts: [b.mesh(), banner, head, bier],
        update(t) {
          banner.rotation.y = Math.sin(t * 2.4) * 0.5;
          head.rotation.z = 0.25 + Math.sin(t * 1.6) * 0.3;
          const a = t * 0.45;
          bier.position.set(-0.08 + Math.cos(a) * 0.28, 0.03 + Math.abs(Math.sin(t * 8)) * 0.03, 0.2 + Math.sin(a) * 0.14);
          bier.rotation.y = -a - PI / 2;
          bier.rotation.z = Math.sin(t * 8) * 0.1;
        },
      };
    },
  },
  {
    name: "Ke'te Kesu",
    match: "Village de Ke'te Kesu",
    dx: -0.15,
    dz: -0.05,
    size: 0.22,
    height: 1.0,
    build() {
      const b = new Builder();
      // Les tongkonan d'un côté, les greniers à riz en face
      const house = createModel('house-toraja');
      house.object.position.set(-0.16, 0, -0.2);
      house.object.scale.setScalar(0.92);
      alang(b, 0.36, 0.3, 0.8);
      alang(b, -0.02, 0.36, 0.7);
      // Cornes de buffle empilées sur le poteau de façade
      b.box('#4a3628', 0.04, 0.6, 0.04, 0.3, 0.3, -0.26);
      for (let i = 0; i < 5; i++) b.box('#f1f3f5', 0.03, 0.03, 0.2 - i * 0.02, 0.3, 0.16 + i * 0.09, -0.24);
      person(b, '#f03e3e', null, -0.44, 0, 0.3, 0.8);
      const rooster = new Builder().ball('#e8590c', 0.04, 0, 0.05, 0, 1.3, 1, 0.9).ball('#e8590c', 0.025, 0.05, 0.1, 0).box('#e03131', 0.02, 0.03, 0.01, 0.05, 0.13, 0).cone('#212529', 0.03, 0.08, 4, -0.07, 0.09, 0, 0, 0, 0.9).mesh();
      return {
        parts: [house.object, b.mesh(), rooster],
        update(t) {
          house.update(t);
          const a = t * 0.6;
          rooster.position.set(-0.24 + Math.cos(a) * 0.1, Math.abs(Math.sin(t * 9)) * 0.015, 0.34 + Math.sin(a) * 0.06);
          rooster.rotation.y = -a - PI / 2;
          rooster.rotation.z = Math.max(0, Math.sin(t * 3)) * -0.5;
        },
      };
    },
  },
  {
    name: 'Grottes de Londa',
    match: 'Grottes de Londa',
    dx: -0.5,
    dz: 0.3,
    size: 0.19,
    height: 0.9,
    build() {
      const b = new Builder();
      // Pied de falaise, entrée sombre, cercueils empilés et crânes sur les rochers
      b.ball('#9a917f', 0.46, 0, 0.22, -0.14, 1.2, 1.05, 0.8, 1);
      b.ball('#aaa18e', 0.24, -0.4, 0.1, 0, 1, 0.9, 0.8);
      b.ball('#2f9e44', 0.2, -0.16, 0.64, -0.24, 1.4, 0.6, 1);
      b.ball('#40c057', 0.16, 0.26, 0.58, -0.24, 1.3, 0.6, 1);
      b.ball('#16181c', 0.24, 0.02, 0.14, 0.17, 1.2, 1.05, 0.45);
      b.box('#8d5a2b', 0.24, 0.06, 0.07, -0.36, 0.05, 0.3, 0, 0.2, 0);
      b.box('#6b4423', 0.22, 0.06, 0.07, -0.34, 0.12, 0.29, 0, -0.15, 0);
      b.box('#a67c52', 0.2, 0.06, 0.07, -0.35, 0.19, 0.3, 0, 0.1, 0);
      b.box('#7d7566', 0.28, 0.04, 0.1, 0.36, 0.14, 0.28);
      for (const x of [0.27, 0.35, 0.43]) b.ball('#f8f9fa', 0.032, x, 0.19, 0.29).box('#16181c', 0.03, 0.012, 0.01, x, 0.19, 0.32);
      // Le balcon des tau-tau, au-dessus de l'entrée
      b.box('#5a3a22', 0.36, 0.03, 0.08, 0.02, 0.46, 0.2);
      b.box('#5a3a22', 0.36, 0.02, 0.02, 0.02, 0.52, 0.235);
      for (const x of [-0.1, 0.02, 0.14]) {
        b.box('#f1f3f5', 0.05, 0.09, 0.04, x, 0.52, 0.2);
        b.ball('#a8703a', 0.03, x, 0.59, 0.2);
      }
      // Le porteur de lampe entre et ressort
      const porter = person(new Builder(), '#1971c2', null, 0, 0, 0, 0.8).mesh();
      const lamp = new Builder().octa('#ffe066', 0.045, 0, 0, 0).mesh();
      const visitor = person(new Builder(), '#f03e3e', '#f2d16b', 0, 0, 0, 0.8).mesh();
      return {
        parts: [b.mesh(), porter, lamp, visitor],
        update(t) {
          const u = pingPong(t * 0.18);
          porter.position.set(0.04 + u * 0.1, Math.abs(Math.sin(t * 6)) * 0.012, 0.3 + u * 0.2);
          lamp.position.set(porter.position.x + 0.07, 0.13, porter.position.z + 0.02);
          lamp.scale.setScalar(0.8 + Math.abs(Math.sin(t * 5)) * 0.5);
          lamp.rotation.y = t * 2;
          visitor.position.set(-0.06 + u * 0.1, Math.abs(Math.sin(t * 6 + 1)) * 0.012, 0.38 + u * 0.2);
        },
      };
    },
  },
  {
    name: 'Tombes de Lemo',
    match: 'Tombes de Lemo',
    dx: 0.12,
    dz: 0.45,
    size: 0.2,
    height: 1.25,
    build() {
      const b = new Builder();
      // Falaise percée de caveaux, balcons où sont alignés les tau-tau, bras tendus
      b.box('#b3a58c', 0.92, 1.0, 0.3, 0, 0.5, -0.25);
      b.box('#a3957c', 0.26, 0.74, 0.2, -0.4, 0.37, -0.04);
      b.box('#c2b49b', 0.22, 0.5, 0.16, 0.42, 0.25, -0.05);
      b.ball('#2f9e44', 0.3, -0.2, 1.02, -0.28, 1.3, 0.4, 0.7);
      b.ball('#40c057', 0.26, 0.24, 1.02, -0.28, 1.2, 0.4, 0.7);
      b.ball('#37b24d', 0.13, -0.4, 0.76, -0.04, 1.1, 0.5, 1);
      for (const [x, y] of [[-0.14, 0.86], [0.06, 0.88], [0.26, 0.82], [0.3, 0.3], [0.16, 0.2], [-0.18, 0.22]]) b.box('#4a3628', 0.08, 0.08, 0.02, x, y, -0.095);
      for (const [x, y, n] of [[-0.02, 0.5, 5], [0.18, 0.66, 3]]) {
        const w = n * 0.1;
        b.box('#2a2222', w + 0.04, 0.17, 0.02, x, y + 0.09, -0.095);
        b.box('#5a3a22', w + 0.06, 0.025, 0.09, x, y, -0.055);
        b.box('#5a3a22', w + 0.06, 0.018, 0.018, x, y + 0.055, -0.015);
        for (let i = 0; i < n; i++) {
          const tx = x + (i - (n - 1) / 2) * 0.1;
          b.box(i % 2 ? '#f1f3f5' : '#ffe8cc', 0.055, 0.1, 0.04, tx, y + 0.065, -0.06);
          b.ball('#a8703a', 0.03, tx, y + 0.14, -0.06);
          b.box('#a8703a', 0.07, 0.016, 0.07, tx, y + 0.09, -0.03);
        }
      }
      // Rizière au pied de la paroi
      b.box('#8ce99a', 0.92, 0.02, 0.4, 0, 0.01, 0.22);
      b.box('#69db7c', 0.4, 0.022, 0.16, -0.22, 0.012, 0.3);
      b.box('#7fd8f7', 0.3, 0.022, 0.14, 0.22, 0.012, 0.2);
      person(b, '#f08c00', null, 0.38, 0.02, 0.38, 0.8);
      const farmer = person(new Builder(), '#1971c2', '#f2d16b', 0, 0, 0, 0.8).mesh();
      const egret = new Builder().box('#ffffff', 0.14, 0.012, 0.05, 0.06, 0, 0, 0, 0, 0.35).box('#ffffff', 0.14, 0.012, 0.05, -0.06, 0, 0, 0, 0, -0.35).ball('#ffffff', 0.025, 0, 0, 0.03).mesh();
      return {
        parts: [b.mesh(), farmer, egret],
        update(t) {
          farmer.position.set(-0.3 + pingPong(t * 0.12) * 0.4, 0.02, 0.26);
          farmer.rotation.z = 0.3 + Math.sin(t * 3) * 0.25;
          const a = t * 0.6;
          egret.position.set(Math.cos(a) * 0.34, 0.4 + Math.sin(t * 1.3) * 0.06, 0.2 + Math.sin(a) * 0.14);
          egret.rotation.y = -a;
          egret.scale.y = 1 + Math.sin(t * 9) * 0.6;
        },
      };
    },
  },
];

// ------------------------------------------------------------------------------------------------
// Sulawesi : Manado et Bunaken
// ------------------------------------------------------------------------------------------------
const DEEP = '#1864ab';
const CORALS = ['#ff8fab', '#ffa94d', '#b197fc', '#ffe066', '#63e6be', '#ff6b6b'];

const BUNAKEN = [
  {
    name: 'Tombants',
    sea: true,
    match: 'Snorkeling sur les tombants',
    dx: -0.2,
    dz: -0.42,
    size: 0.24,
    height: 1.0,
    build() {
      const b = new Builder();
      // Manado Tua, le cône de l'ancien volcan, et devant lui le récif qui s'arrête net
      b.cyl(SAND, 0.36, 0.38, 0.03, 10, -0.06, 0.015, -0.3);
      b.cone('#3f9d48', 0.33, 0.62, 8, -0.06, 0.33, -0.3);
      b.cone('#57b356', 0.18, 0.3, 8, -0.06, 0.5, -0.3);
      b.box(LAGOON, 1.05, 0.016, 0.3, 0, 0.008, 0.08);
      b.box(DEEP, 1.05, 0.012, 0.3, 0, 0.006, 0.36);
      // Les coraux du bord du mur
      for (let i = 0; i < 11; i++) {
        const x = -0.48 + i * 0.096;
        b.ball(CORALS[i % 6], 0.045 + (i % 3) * 0.008, x, 0.03, 0.2 + (i % 2) * 0.03, 1.1, 0.8, 1);
        if (i % 3 === 0) b.cone(CORALS[(i + 2) % 6], 0.04, 0.09, 5, x + 0.04, 0.05, 0.14, PI, 0, 0);
      }
      const boat = new Builder();
      boat.poly('#ffffff', [[-0.16, 0.07], [0.2, 0.08], [0.14, 0], [-0.14, 0]], 0.12);
      boat.poly('#e03131', [[-0.16, 0.07], [0.2, 0.08], [0.19, 0.055], [-0.16, 0.045]], 0.124);
      for (const x of [-0.1, 0.06]) boat.box('#adb5bd', 0.01, 0.12, 0.1, x, 0.13, 0);
      boat.box('#ffd43b', 0.22, 0.02, 0.13, -0.02, 0.2, 0);
      person(boat, '#1971c2', null, 0.0, 0.07, 0, 0.55);
      const boatMesh = boat.mesh();
      const drifters = [snorkeler('#ff7b1c'), snorkeler('#e64980')];
      drifters.forEach((d) => d.scale.setScalar(0.75));
      const f = new Builder();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU;
        f.octa(i % 2 ? '#ffd43b' : '#4dabf7', 0.03, Math.cos(a) * 0.13, 0, Math.sin(a) * 0.08, 1.6, 1, 0.5, -a + PI / 2);
      }
      const school = f.mesh(-0.2, 0.04, 0.4);
      const cloud = puff(0.09);
      return {
        parts: [b.mesh(), boatMesh, ...drifters, school, cloud],
        update(t) {
          // Les nageurs dérivent le long du mur, le bateau les suit
          drifters.forEach((d, i) => {
            const k = (t * 0.07 + i * 0.5) % 1;
            d.position.set(-0.46 + k * 0.92, 0.02 + Math.sin(t * 2.2 + i) * 0.008, 0.3 + i * 0.05);
            d.scale.setScalar(0.75 * fade(k));
          });
          boatMesh.position.set(0.2 + Math.sin(t * 0.25) * 0.16, 0.02 + Math.sin(t * 1.9) * 0.01, 0.46);
          boatMesh.rotation.z = Math.sin(t * 1.5) * 0.06;
          school.rotation.y = t * 0.8;
          cloud.position.set(-0.02 + Math.sin(t * 0.3) * 0.05, 0.68, -0.3);
          cloud.scale.set(1.5 + Math.sin(t * 0.7) * 0.15, 0.7, 1);
        },
      };
    },
  },
  {
    name: 'Île de Siladen',
    sea: true,
    match: 'Île de Siladen',
    dx: 0.62,
    dz: -0.42,
    size: 0.2,
    height: 0.75,
    build() {
      const b = new Builder();
      b.cyl(LAGOON, 0.58, 0.58, 0.012, 12, 0, 0.006, 0);
      b.ball('#fff8e1', 0.44, 0, 0, 0, 1.15, 0.12, 0.85, 1);
      b.ball('#40c057', 0.16, -0.14, 0.05, -0.12, 1.3, 0.5, 1);
      b.ball('#2f9e44', 0.12, 0.08, 0.05, -0.2, 1.3, 0.5, 1);
      b.cyl('#ffffff', 0.012, 0.012, 0.3, 4, 0.2, 0.19, 0.12);
      b.cone('#e03131', 0.17, 0.09, 8, 0.2, 0.36, 0.12);
      b.box('#4dabf7', 0.16, 0.025, 0.08, 0.14, 0.07, 0.22);
      person(b, '#ffd43b', null, 0.14, 0.08, 0.22, 0.6);
      const trunks = [palmTrunk(b, -0.18, 0.02, 0.55, 0.14, 0.04), palmTrunk(b, 0.02, -0.12, 0.46, -0.1, 0.04)];
      const leaves = trunks.map(([x, y, z], i) => fronds(0.85 - i * 0.1).mesh(x, y + 0.03, z));
      const boat = new Builder();
      boat.poly('#ffd23f', [[-0.16, 0.05], [0.18, 0.06], [0.12, -0.02], [-0.12, -0.02]], 0.08);
      boat.box('#1c7ed6', 0.3, 0.012, 0.085, 0.01, 0.055, 0);
      boat.box('#6b4423', 0.24, 0.012, 0.012, 0, 0.03, 0.14).box('#6b4423', 0.012, 0.012, 0.14, -0.07, 0.04, 0.08).box('#6b4423', 0.012, 0.012, 0.14, 0.07, 0.04, 0.08);
      const boatMesh = boat.mesh(-0.3, 0.03, 0.4);
      return {
        parts: [b.mesh(), ...leaves, boatMesh],
        update(t) {
          leaves.forEach((l, i) => {
            l.rotation.z = Math.sin(t * 1.4 + i) * 0.14;
            l.rotation.x = Math.cos(t * 1.1 + i) * 0.1;
          });
          boatMesh.rotation.z = Math.sin(t * 1.9) * 0.12;
          boatMesh.position.y = 0.03 + Math.sin(t * 2.2) * 0.01;
        },
      };
    },
  },
  {
    name: 'Plage de Bunaken',
    sea: true,
    match: 'Snorkeling depuis la plage',
    dx: -0.04,
    dz: -0.1,
    size: 0.21,
    height: 0.8,
    build() {
      const b = new Builder();
      // L'île, ses petits resorts, le platier qu'on traverse à la nage jusqu'au bord du tombant
      b.cyl('#8fd36a', 0.36, 0.42, 0.06, 9, 0, 0.03, -0.22);
      b.box(SAND, 0.74, 0.03, 0.14, 0, 0.015, 0.0);
      b.box(LAGOON, 0.9, 0.014, 0.36, 0, 0.007, 0.26);
      b.box(DEEP, 0.9, 0.01, 0.1, 0, 0.005, 0.48);
      for (let i = 0; i < 8; i++) b.ball(CORALS[i % 6], 0.04, -0.4 + i * 0.115, 0.022, 0.4 + (i % 2) * 0.03, 1.1, 0.7, 1);
      stiltHut(b, -0.16, -0.18, 0.75, '#fff3d6', '#c49a4a', 0.05);
      stiltHut(b, 0.2, -0.24, 0.65, '#ffd8a8', '#a67f35', 0.05);
      b.ball('#2f9e44', 0.12, 0.02, 0.12, -0.36, 1.3, 0.8, 1);
      const [hx, hy, hz] = palmTrunk(b, -0.36, -0.1, 0.5, 0.1, 0.05);
      const leaves = fronds(0.8).mesh(hx, hy + 0.03, hz);
      const swimmer = snorkeler('#ff7b1c');
      swimmer.scale.setScalar(0.8);
      const fish = new Builder().octa('#ffd43b', 0.04, 0, 0, 0, 1.5, 1, 0.5).box('#1d2b53', 0.015, 0.06, 0.045, 0.01, 0, 0).mesh();
      return {
        parts: [b.mesh(), leaves, swimmer, fish],
        update(t) {
          leaves.rotation.z = Math.sin(t * 1.4) * 0.14;
          const u = (t * 0.1) % 2;
          const back = u > 1;
          swimmer.position.set(0.1, 0.02 + Math.sin(t * 2.2) * 0.008, 0.12 + (back ? 2 - u : u) * 0.3);
          swimmer.rotation.y = back ? PI / 2 : -PI / 2;
          const k = (t * 0.4) % 1;
          fish.position.set(-0.26 + k * 0.14, 0.02 + Math.sin(k * PI) * 0.14, 0.38);
          fish.rotation.z = 1 - k * 2;
          fish.scale.setScalar(k < 0.95 ? 1 : 0.001);
        },
      };
    },
  },
  {
    name: 'Tortues',
    sea: true,
    match: 'Nager avec les tortues',
    dx: -0.4,
    dz: 0.15,
    size: 0.22,
    height: 0.5,
    build() {
      const b = new Builder();
      // Un bout du mur de corail où les tortues se reposent
      b.cyl(DEEP, 0.56, 0.56, 0.01, 12, 0, 0.005, 0);
      b.ball('#c9b89a', 0.2, -0.3, 0.02, -0.24, 1.3, 0.5, 1);
      for (const [x, z, i] of [[-0.42, -0.2, 0], [-0.3, -0.34, 1], [-0.18, -0.22, 2], [-0.3, -0.14, 3], [-0.08, -0.32, 4]]) b.ball(CORALS[i], 0.06, x, 0.1, z, 1.1, 0.8, 1);
      b.cone('#b197fc', 0.06, 0.14, 5, -0.36, 0.14, -0.28, PI, 0, 0);
      const hero = createModel('turtle');
      hero.object.position.set(0.06, 0, 0.06);
      const riser = turtleMesh(0.7);
      const diver = snorkeler('#1971c2');
      diver.scale.setScalar(0.8);
      const bubbles = puff(0.03);
      return {
        parts: [b.mesh(), hero.object, riser, diver, bubbles],
        update(t) {
          hero.update(t);
          // Une tortue remonte respirer à côté du nageur
          const k = pingPong(t * 0.25);
          riser.position.set(-0.24 + k * 0.1, 0.04 + k * 0.1, 0.02);
          riser.rotation.z = 0.5 - k * 0.3;
          riser.rotation.y = 0.4;
          diver.position.set(0.02 + Math.sin(t * 0.3) * 0.06, 0.02 + Math.sin(t * 2.2) * 0.008, 0.36);
          rise(bubbles, (t * 0.6) % 1, -0.1, 0.05, 0.02, 0.2, 0.02, 1);
        },
      };
    },
  },
  {
    name: 'Cuisine minahasa',
    match: 'Cuisine minahasa',
    dx: 0.62,
    dz: 0.28,
    size: 0.17,
    height: 0.75,
    build() {
      const b = new Builder();
      // Poisson grillé sur un demi-bidon, bol rouge de dabu-dabu, marmite de tinutuan
      b.box('#d9c8a0', 1.0, 0.03, 0.8, 0, 0.015, 0.02);
      for (const x of [-0.36, -0.08]) for (const z of [-0.06, 0.08]) b.box('#343a40', 0.025, 0.2, 0.025, x, 0.11, z);
      b.cyl('#495057', 0.12, 0.12, 0.36, 8, -0.22, 0.24, 0.01, 0, 0, PI / 2);
      b.box('#e8590c', 0.32, 0.02, 0.18, -0.22, 0.3, 0.01);
      for (const z of [-0.04, 0.07]) {
        b.octa('#ffc078', 0.07, -0.2, 0.34, z, 1.9, 0.6, 0.7);
        b.poly('#ffc078', [[0, 0], [-0.07, 0.05], [-0.07, -0.05]], 0.02, -0.33, 0.34, z, PI / 2, 0, 0);
      }
      b.box('#a67c52', 0.4, 0.04, 0.3, 0.26, 0.2, 0.02);
      for (const x of [0.1, 0.42]) for (const z of [-0.1, 0.14]) b.box(DARKWOOD, 0.03, 0.18, 0.03, x, 0.1, z);
      b.cyl('#ffffff', 0.07, 0.05, 0.05, 8, 0.16, 0.245, 0.06).ball('#e03131', 0.05, 0.16, 0.265, 0.06, 1, 0.5, 1);
      b.cyl('#ced4da', 0.09, 0.08, 0.1, 8, 0.36, 0.27, 0.0).cyl('#ffa94d', 0.08, 0.08, 0.01, 8, 0.36, 0.322, 0.0);
      for (const [x, z] of [[0.2, -0.08], [0.26, -0.06], [0.23, -0.1]]) b.cone('#e03131', 0.015, 0.07, 4, x, 0.235, z, PI / 2, 0, x * 9);
      person(b, '#2b8a3e', null, 0.3, 0.03, -0.26, 0.9);
      const cook = person(new Builder(), '#f8f9fa', null, 0, 0, 0, 0.9).mesh(-0.24, 0.03, -0.24);
      const fan = new Builder().box('#c9a36b', 0.14, 0.14, 0.012, 0, 0.1, 0).box('#6b4423', 0.02, 0.08, 0.02, 0, 0, 0).mesh(-0.14, 0.2, -0.16);
      const smoke = [puff(0.055), puff(0.055), puff(0.055)];
      return {
        parts: [b.mesh(), cook, fan, ...smoke],
        update(t) {
          fan.rotation.x = 0.6 + Math.sin(t * 9) * 0.5;
          cook.rotation.z = Math.sin(t * 2) * 0.08;
          smoke.forEach((s, i) => rise(s, (t * 0.4 + i / 3) % 1, -0.22, 0.36, 0.02, 0.5, 0.12, 1.2));
        },
      };
    },
  },
  {
    name: 'Cratère du Mahawu',
    match: 'Tomohon et le cratère',
    dx: 0.65,
    dz: 0.62,
    size: 0.21,
    height: 0.8,
    build() {
      const b = new Builder();
      // Volcan trapu : large cratère au fond vert, escalier jusqu'au bord
      b.cyl('#5a9e4b', 0.3, 0.54, 0.36, 9, 0, 0.18, 0);
      b.cyl('#7d766b', 0.27, 0.3, 0.03, 9, 0, 0.365, 0);
      b.cyl('#5b534a', 0.22, 0.22, 0.032, 9, 0, 0.37, 0);
      b.cyl('#94d82d', 0.12, 0.12, 0.034, 8, 0.02, 0.372, 0.02);
      for (const [x, z, h] of [[-0.42, 0.2, 0.2], [0.44, 0.14, 0.18], [-0.3, 0.36, 0.16], [0.36, -0.3, 0.2]]) b.cone('#2f8a3a', 0.07, h, 5, x, h / 2 + 0.02, z);
      for (let i = 0; i < 6; i++) b.box('#f1f3f5', 0.1, 0.02, 0.05, 0.02 + (i % 2 ? 0.03 : -0.03), 0.06 + i * 0.055, 0.5 - i * 0.045);
      person(b, '#f03e3e', null, -0.16, 0.38, 0.2, 0.7);
      const steam = [puff(0.06), puff(0.06)];
      const walker = person(new Builder(), '#ffd43b', '#f2d16b', 0, 0, 0, 0.7).mesh();
      return {
        parts: [b.mesh(), ...steam, walker],
        update(t) {
          steam.forEach((s, i) => rise(s, (t * 0.25 + i / 2) % 1, i ? 0.08 : -0.06, 0.38, -0.04, 0.5, 0.12, 1.3));
          const a = t * 0.4;
          walker.position.set(Math.cos(a) * 0.255, 0.38 + Math.abs(Math.sin(t * 6)) * 0.01, Math.sin(a) * 0.255);
        },
      };
    },
  },
  {
    name: 'Lac Linow',
    match: 'Lac Linow',
    dx: 0.25,
    dz: 0.98,
    size: 0.2,
    height: 0.6,
    build() {
      const b = new Builder();
      // Le lac qui passe du vert au turquoise, les fumerolles de la rive, le café au bord
      b.ball('#8fd36a', 0.5, 0, 0, 0, 1.15, 0.06, 0.95, 1);
      b.ball('#2b9d6e', 0.36, -0.04, 0.012, 0.04, 1.2, 0.06, 0.85, 1);
      b.ball('#e8d44d', 0.12, 0.34, 0.02, 0.24, 1.2, 0.2, 1);
      b.cyl('#5b534a', 0.035, 0.035, 0.03, 6, 0.32, 0.045, 0.24);
      b.cyl('#5b534a', 0.03, 0.03, 0.03, 6, 0.4, 0.045, 0.2);
      tree(b, -0.44, -0.2, 0.22, 0.15);
      tree(b, 0.3, -0.34, 0.26, 0.16, ['#237a36', '#2f9e44']);
      b.box('#c9a36b', 0.3, 0.025, 0.2, -0.3, 0.1, 0.34);
      for (const [x, z] of [[-0.42, 0.26], [-0.18, 0.26], [-0.42, 0.42], [-0.18, 0.42]]) b.box(DARKWOOD, 0.025, 0.1, 0.025, x, 0.05, z);
      b.box('#fff3d6', 0.14, 0.12, 0.14, -0.36, 0.17, 0.32).pyr('#c92a2a', 0.13, 0.09, -0.36, 0.275, 0.32);
      person(b, '#1971c2', null, -0.22, 0.11, 0.38, 0.7);
      const tint = (c, r) => new Builder().ball(c, r, 0, 0, 0, 1.2, 0.04, 0.85, 1).mesh();
      const tints = [tint('#3bc9db', 0.3), tint('#96f2d7', 0.16)];
      const steam = [puff(0.05), puff(0.05)];
      return {
        parts: [b.mesh(), ...tints, ...steam],
        update(t) {
          tints[0].position.set(-0.04 + Math.sin(t * 0.3) * 0.04, 0.026, 0.04);
          tints[0].scale.setScalar(0.35 + (Math.sin(t * 0.8) * 0.5 + 0.5) * 0.8);
          tints[1].position.set(-0.1 + Math.cos(t * 0.4) * 0.08, 0.034, 0.0);
          tints[1].scale.setScalar(0.3 + (Math.sin(t * 0.8 + 1.5) * 0.5 + 0.5) * 0.9);
          steam.forEach((s, i) => rise(s, (t * 0.35 + i / 2) % 1, i ? 0.4 : 0.32, 0.06, i ? 0.2 : 0.24, 0.4, 0.08, 1.1));
        },
      };
    },
  },
];

// ------------------------------------------------------------------------------------------------
// Sulawesi : Tangkoko
// ------------------------------------------------------------------------------------------------

// Tête de tarsier : yeux énormes, grandes oreilles
function tarsierHead(s = 1) {
  const h = new Builder();
  h.ball('#a1887f', 0.07 * s, 0, 0, 0, 1.1, 0.95, 0.9);
  for (const side of [-1, 1]) {
    h.ball('#ffb300', 0.038 * s, side * 0.034 * s, 0.008 * s, 0.045 * s);
    h.ball('#1a1a1a', 0.018 * s, side * 0.036 * s, 0.008 * s, 0.076 * s);
    h.cone('#d7ccc8', 0.026 * s, 0.06 * s, 4, side * 0.06 * s, 0.065 * s, -0.01 * s, 0, 0, -side * 0.5);
  }
  h.ball('#6d4c41', 0.012 * s, 0, -0.03 * s, 0.065 * s);
  return h.mesh();
}

// Macaque à crête assis : tout noir, houppe sur la tête, face allongée
function crested(b, x, y, z, s = 1) {
  b.ball('#26262b', 0.1 * s, x, y + 0.11 * s, z, 1, 1.15, 0.95);
  b.ball('#26262b', 0.07 * s, x, y + 0.28 * s, z + 0.01 * s);
  b.cone('#15151a', 0.03 * s, 0.1 * s, 5, x, y + 0.37 * s, z - 0.01 * s);
  b.ball('#3a3a40', 0.04 * s, x, y + 0.26 * s, z + 0.06 * s, 0.9, 1.2, 0.8);
  b.ball('#ffb86b', 0.013 * s, x - 0.025 * s, y + 0.29 * s, z + 0.07 * s);
  b.ball('#ffb86b', 0.013 * s, x + 0.025 * s, y + 0.29 * s, z + 0.07 * s);
  b.box('#26262b', 0.035 * s, 0.14 * s, 0.035 * s, x - 0.09 * s, y + 0.08 * s, z + 0.06 * s);
  b.box('#26262b', 0.035 * s, 0.14 * s, 0.035 * s, x + 0.09 * s, y + 0.08 * s, z + 0.06 * s);
  return b;
}

const TANGKOKO = [
  {
    name: 'Calaos',
    match: 'Calaos et couscous',
    dx: -0.14,
    dz: -0.1,
    size: 0.17,
    height: 1.45,
    build() {
      const b = new Builder();
      // Grand figuier chargé de fruits
      b.cyl('#7a4b25', 0.07, 0.11, 1.0, 6, 0, 0.5, -0.05);
      b.cyl('#7a4b25', 0.03, 0.04, 0.5, 5, 0.24, 0.8, -0.05, 0, 0, PI / 2 + 0.25);
      b.ball('#2f9e44', 0.34, 0, 1.16, -0.05, 1.25, 0.7, 1.1, 1);
      b.ball('#40c057', 0.2, -0.3, 1.02, 0, 1.2, 0.7, 1);
      b.ball('#37b24d', 0.18, 0.36, 1.0, -0.08, 1.2, 0.7, 1);
      for (const [x, y, z] of [[-0.2, 1.08, 0.22], [0.1, 1.2, 0.28], [0.3, 1.0, 0.1], [-0.36, 0.98, 0.14], [0.0, 1.0, 0.3]]) b.ball('#e03131', 0.03, x, y, z);
      b.cone('#2f9e44', 0.09, 0.18, 5, -0.36, 0.09, 0.2);
      b.cone('#40c057', 0.08, 0.16, 5, 0.38, 0.08, 0.26);
      // Calao à cimier : corps noir, queue blanche, gros bec jaune surmonté d'un casque rouge
      const hornbill = (wings) => {
        const h = new Builder();
        h.ball('#212529', 0.075, 0, 0, 0, 1.6, 0.9, 0.9);
        h.box('#f8f9fa', 0.16, 0.02, 0.08, -0.17, 0, 0);
        h.ball('#f2c078', 0.05, 0.11, 0.05, 0);
        h.cone('#ffd43b', 0.028, 0.16, 5, 0.22, 0.04, 0, 0, 0, -PI / 2 - 0.15);
        h.box('#e03131', 0.07, 0.035, 0.035, 0.14, 0.105, 0);
        h.ball('#1c7ed6', 0.022, 0.13, 0.0, 0);
        if (!wings) h.box('#212529', 0.16, 0.06, 0.03, -0.02, 0, 0.06).box('#212529', 0.16, 0.06, 0.03, -0.02, 0, -0.06);
        return h.mesh();
      };
      const perched = hornbill(false);
      perched.position.set(0.3, 0.9, -0.05);
      const body = hornbill(true);
      const wing = (side) => new Builder().box('#212529', 0.13, 0.014, 0.22, 0, 0, 0.11 * side).mesh(0, 0.03, 0.04 * side);
      const wings = [wing(1), wing(-1)];
      const flyer = group(body, ...wings);
      return {
        parts: [b.mesh(), perched, flyer],
        update(t) {
          perched.rotation.z = Math.sin(t * 1.5) * 0.2;
          perched.rotation.y = Math.sin(t * 0.7) * 0.6;
          const a = t * 0.7;
          flyer.position.set(Math.cos(a) * 0.42, 1.34 + Math.sin(t * 1.1) * 0.05, -0.05 + Math.sin(a) * 0.36);
          flyer.rotation.y = -a - PI / 2;
          const flap = Math.sin(t * 7) * 0.6;
          wings[0].rotation.x = flap;
          wings[1].rotation.x = -flap;
        },
      };
    },
  },
  {
    name: 'Couscous ours',
    match: 'Calaos et couscous',
    dx: -0.45,
    dz: -0.25,
    size: 0.18,
    height: 1.15,
    build() {
      const b = new Builder();
      b.cyl('#7a4b25', 0.06, 0.1, 0.9, 6, -0.3, 0.45, -0.05);
      b.cyl('#7a4b25', 0.04, 0.05, 0.8, 5, 0.06, 0.68, -0.05, 0, 0, PI / 2 + 0.08);
      b.ball('#2f9e44', 0.3, -0.3, 1.0, -0.05, 1.2, 0.7, 1.1);
      b.ball('#40c057', 0.17, 0.44, 0.76, -0.1, 1.2, 0.7, 1);
      b.cone('#37b24d', 0.09, 0.18, 5, 0.3, 0.09, 0.24);
      const leaves = new Builder().ball('#37b24d', 0.2, 0, 0, 0, 1.3, 0.6, 1).ball('#51cf66', 0.12, 0.16, 0.06, 0.08, 1.2, 0.6, 1).mesh(0.05, 1.02, 0.0);
      // Le couscous ours : marsupial trapu, queue enroulée autour de la branche, il avance au ralenti
      const c = new Builder();
      c.ball('#6d5a4a', 0.12, 0, 0.1, 0, 1.5, 0.95, 1, 1);
      c.ball('#6d5a4a', 0.085, 0.19, 0.12, 0);
      c.ball('#c9b8a0', 0.05, 0.25, 0.1, 0, 1, 0.9, 0.9);
      c.ball('#1a1a1a', 0.014, 0.25, 0.14, 0.04).ball('#1a1a1a', 0.014, 0.25, 0.14, -0.04);
      c.cone('#6d5a4a', 0.025, 0.05, 4, 0.17, 0.2, 0.05).cone('#6d5a4a', 0.025, 0.05, 4, 0.17, 0.2, -0.05);
      for (const x of [-0.1, 0.1]) c.box('#5a4838', 0.05, 0.1, 0.16, x, 0.02, 0);
      c.box('#c9b8a0', 0.14, 0.03, 0.03, -0.22, 0.06, 0, 0, 0, 0.5);
      c.box('#c9b8a0', 0.03, 0.12, 0.03, -0.28, -0.02, 0);
      const cuscus = c.mesh();
      const leaf = new Builder().box('#74b816', 0.06, 0.008, 0.035, 0, 0, 0).mesh();
      return {
        parts: [b.mesh(), leaves, cuscus, leaf],
        update(t) {
          leaves.rotation.z = Math.sin(t * 1.2) * 0.06;
          leaves.scale.y = 1 + Math.sin(t * 1.7) * 0.05;
          const u = (t * 0.06) % 2;
          const back = u > 1;
          cuscus.position.set(-0.12 + (back ? 2 - u : u) * 0.36, 0.72 + (back ? 2 - u : u) * -0.03, -0.05);
          cuscus.rotation.y = back ? PI : 0;
          cuscus.rotation.z = Math.sin(t * 1.5) * 0.05;
          const k = (t * 0.3) % 1;
          leaf.position.set(0.2 + Math.sin(k * 9) * 0.06, 0.9 - k * 0.85, 0.12);
          leaf.rotation.set(k * 6, k * 4, 0);
          leaf.scale.setScalar(fade(k));
        },
      };
    },
  },
  {
    name: 'Plage de Batuputih',
    sea: true,
    match: 'Plage de sable noir',
    dx: 0.1,
    dz: -0.3,
    size: 0.19,
    height: 0.6,
    build() {
      const b = new Builder();
      // Sable volcanique noir, barques de pêcheurs tirées au sec, la mer à droite
      b.box('#3d4046', 0.66, 0.03, 0.96, -0.2, 0.015, 0);
      b.box('#3aa7e0', 0.44, 0.014, 0.96, 0.34, 0.007, 0);
      b.box('#2f9e44', 0.14, 0.06, 0.96, -0.48, 0.03, 0);
      const hull = (c, stripe, x, z, ry) => {
        b.poly(c, [[-0.17, 0.07], [0.2, 0.08], [0.13, 0], [-0.13, 0]], 0.09, x, 0.04, z, 0, ry, 0.12);
        b.box(stripe, 0.3, 0.014, 0.095, x, 0.115, z, 0, ry, 0.12);
        b.box('#c9a36b', 0.02, 0.014, 0.3, x, 0.12, z, 0, ry, 0);
      };
      hull('#1c7ed6', '#ffffff', -0.16, -0.3, 0.2);
      hull('#ffd43b', '#e03131', -0.2, -0.04, -0.1);
      hull('#f8f9fa', '#2b8a3e', -0.14, 0.22, 0.15);
      crested(b, -0.36, 0.03, 0.38, 0.8);
      const [hx, hy, hz] = palmTrunk(b, -0.44, -0.4, 0.5, 0.12, 0.06);
      const leaves = fronds(0.8).mesh(hx, hy + 0.03, hz);
      const wave = () => new Builder().box('#ffffff', 0.03, 0.016, 0.9, 0, 0, 0).box('#e7f5ff', 0.03, 0.014, 0.6, 0.04, 0, 0.05).mesh();
      const waves = [wave(), wave()];
      const swimmer = new Builder().ball(SKIN, 0.05, 0, 0.03, 0).box('#e64980', 0.1, 0.03, 0.06, 0, 0, 0).box(SKIN, 0.22, 0.02, 0.03, 0, 0.01, 0).mesh();
      return {
        parts: [b.mesh(), leaves, ...waves, swimmer],
        update(t) {
          leaves.rotation.z = Math.sin(t * 1.4) * 0.14;
          waves.forEach((w, i) => {
            const k = (t * 0.3 + i * 0.5) % 1;
            w.position.set(0.5 - k * 0.36, 0.02, 0);
            w.scale.set(1, 1, 0.7 + Math.sin(k * PI) * 0.3);
            w.visible = k < 0.95;
          });
          swimmer.position.set(0.38 + Math.sin(t * 0.5) * 0.05, 0.02 + Math.sin(t * 3) * 0.012, 0.1 + Math.cos(t * 0.5) * 0.1);
          swimmer.rotation.y = t * 0.5;
        },
      };
    },
  },
  {
    name: 'Tarsiers',
    match: 'Tarsiers au crépuscule',
    dx: -0.42,
    dz: 0.3,
    size: 0.19,
    height: 1.2,
    build() {
      const b = new Builder();
      // Gros ficus creux où dort la famille ; les racines descendent le long du tronc
      b.cyl('#8a5a34', 0.17, 0.24, 0.85, 7, -0.12, 0.425, -0.08);
      for (const [x, z, r] of [[-0.34, 0.0, 0.5], [0.08, 0.06, -0.5], [-0.14, 0.14, 0]]) b.box('#7a4b25', 0.05, 0.5, 0.05, x, 0.24, z, 0, 0, r * 0.4);
      b.ball('#16181c', 0.09, -0.1, 0.38, 0.12, 1, 1.5, 0.5);
      b.ball('#2f9e44', 0.36, -0.12, 1.0, -0.08, 1.2, 0.6, 1.1, 1);
      b.ball('#40c057', 0.2, 0.2, 0.92, -0.02, 1.2, 0.6, 1);
      b.cyl('#7a4b25', 0.025, 0.035, 0.7, 5, 0.38, 0.35, 0.02);
      b.ball('#37b24d', 0.13, 0.38, 0.74, 0.02, 1.2, 0.7, 1);
      // Tarsier agrippé au bord du creux : seule sa tête pivote
      b.ball('#a1887f', 0.065, -0.2, 0.52, 0.14, 0.9, 1.3, 0.8);
      b.box('#8d6e63', 0.014, 0.24, 0.014, -0.2, 0.36, 0.15);
      b.box('#d7ccc8', 0.04, 0.02, 0.03, -0.26, 0.56, 0.15).box('#d7ccc8', 0.04, 0.02, 0.03, -0.14, 0.56, 0.15);
      const head = tarsierHead(1.25);
      head.position.set(-0.2, 0.65, 0.17);
      // Un autre bondit du tronc à la tige voisine
      const j = new Builder();
      j.ball('#a1887f', 0.055, 0, -0.08, 0, 0.9, 1.3, 0.8);
      j.box('#8d6e63', 0.012, 0.2, 0.012, 0, -0.22, 0);
      j.box('#d7ccc8', 0.03, 0.1, 0.02, -0.04, -0.14, 0.03).box('#d7ccc8', 0.03, 0.1, 0.02, 0.04, -0.14, 0.03);
      const jumper = group(j.mesh(), tarsierHead(1.05));
      // Le guide et sa lampe rouge
      person(b, '#2b8a3e', null, 0.14, 0, 0.38, 0.85);
      person(b, '#ffd43b', '#f2d16b', 0.3, 0, 0.42, 0.8);
      const lamp = new Builder().octa('#ff6b6b', 0.045, 0, 0, 0).mesh(0.08, 0.15, 0.4);
      const moth = new Builder().box('#fff3bf', 0.05, 0.008, 0.03, 0, 0, 0).mesh();
      return {
        parts: [b.mesh(), head, jumper, lamp, moth],
        update(t) {
          head.rotation.y = Math.sin(t * 0.9) * 1.3;
          head.rotation.z = Math.sin(t * 1.7) * 0.1;
          const u = (t * 0.4) % 2;
          const back = u > 1;
          const k = Math.min(1, (back ? u - 1 : u) / 0.45);
          const f = back ? 1 - k : k;
          jumper.position.set(0.07 + f * 0.27, 0.6 - f * 0.1 + Math.sin(k * PI) * 0.14, 0.1 - f * 0.04);
          jumper.rotation.z = (back ? 1 : -1) * Math.sin(k * PI) * 0.7;
          lamp.scale.setScalar(0.8 + Math.abs(Math.sin(t * 4)) * 0.5);
          lamp.rotation.y = t * 2;
          moth.position.set(0.2 + Math.sin(t * 2.3) * 0.12, 0.66 + Math.sin(t * 3.1) * 0.06, 0.2 + Math.cos(t * 1.9) * 0.06);
          moth.rotation.z = Math.sin(t * 20) * 0.6;
        },
      };
    },
  },
  {
    name: 'Macaques à crête',
    match: 'Macaques à crête',
    dx: -0.12,
    dz: 0.2,
    size: 0.18,
    height: 0.7,
    build() {
      const b = new Builder();
      // Le groupe fouille le sol au lever du jour
      b.cyl('#a9c46c', 0.52, 0.55, 0.03, 10, 0, 0.015, 0);
      b.cyl('#7a4b25', 0.2, 0.24, 0.07, 7, -0.3, 0.035, -0.24, 0, 0, 0.05);
      b.cone('#2f9e44', 0.09, 0.18, 5, 0.4, 0.09, -0.22);
      b.cone('#40c057', 0.08, 0.16, 5, -0.44, 0.08, 0.16);
      crested(b, -0.3, 0.07, -0.24, 1.0);
      crested(b, 0.24, 0.03, -0.12, 0.95);
      crested(b, 0.36, 0.03, -0.04, 0.55); // le petit
      // Un macaque marche à quatre pattes, la queue absente, les fesses roses
      const w = new Builder();
      w.ball('#26262b', 0.1, 0, 0.16, 0, 1.6, 0.9, 0.9);
      w.ball('#26262b', 0.07, 0.19, 0.22, 0);
      w.cone('#15151a', 0.03, 0.1, 5, 0.17, 0.3, 0);
      w.ball('#3a3a40', 0.035, 0.25, 0.2, 0, 1.3, 0.9, 0.8);
      w.ball('#ff8fab', 0.04, -0.16, 0.16, 0);
      for (const [x, z] of [[-0.1, 0.05], [0.1, 0.05], [-0.1, -0.05], [0.1, -0.05]]) w.box('#26262b', 0.035, 0.14, 0.035, x, 0.07, z);
      const walker = w.mesh();
      const digger = new Builder();
      crested(digger, 0, 0, 0, 1.0);
      const diggerMesh = digger.mesh(-0.06, 0.03, 0.3);
      const leaf = new Builder().box('#e8a33d', 0.05, 0.008, 0.03, 0, 0, 0).box('#74b816', 0.04, 0.008, 0.03, 0.05, 0, 0.03).mesh();
      return {
        parts: [b.mesh(), walker, diggerMesh, leaf],
        update(t) {
          const a = t * 0.5;
          walker.position.set(0.08 + Math.cos(a) * 0.26, 0.03 + Math.abs(Math.sin(t * 7)) * 0.01, 0.08 + Math.sin(a) * 0.2);
          walker.rotation.y = -a - PI / 2;
          diggerMesh.rotation.x = 0.25 + Math.max(0, Math.sin(t * 3)) * 0.35;
          diggerMesh.rotation.y = Math.sin(t * 0.8) * 0.4;
          const k = (t * 1.5) % 1;
          leaf.position.set(-0.06 + k * 0.1, 0.05 + Math.sin(k * PI) * 0.12, 0.42 + k * 0.05);
          leaf.rotation.z = k * 5;
        },
      };
    },
  },
];

export default {
  'medan-bukit-lawang': { scale: 0.8, items: BUKIT_LAWANG },
  'lac-toba': { scale: 0.3, items: TOBA },
  'bukittinggi-et-hauts-plateaux': { scale: 0.75, items: BUKITTINGGI },
  'tanjung-puting': { scale: 0.6, items: TANJUNG_PUTING },
  'derawan-maratua': { scale: 0.5, items: afloat(118.3, 2.25, 0.5, DERAWAN) },
  'pays-toraja': { scale: 0.8, items: TORAJA },
  'manado-bunaken': { scale: 0.4, items: afloat(124.72, 1.58, 0.4, BUNAKEN) },
  tangkoko: { scale: 0.45, items: afloat(125.17, 1.5, 0.45, TANGKOKO) },
};
