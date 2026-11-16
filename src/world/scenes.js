// Scènes détaillées : quand une étape est sélectionnée, son petit modèle laisse place à plusieurs
// monuments et activités animés, posés sur la carte autour du lieu.
//
// Une scène est une liste d'éléments : { name, match, dx, dz, size, height, build }.
//   name   : texte de l'étiquette sur la carte
//   match  : début du nom de l'activité correspondante dans la fiche (un clic sur l'étiquette y amène)
//   dx, dz : décalage en degrés par rapport au repère de l'étape (dx vers l'est, dz vers le sud)
//   size   : taille en degrés d'une unité du modèle ; height : hauteur du modèle, pour placer l'étiquette
//   build  : fabrique, renvoie { parts, update(t) } comme les modèles de models.js (origine au sol)
import * as THREE from 'three';
import { Builder, createModel, flag, person, puff, rise } from './models.js';

const PI = Math.PI;

// Vélo de location avec son cycliste, origine au sol, tourné vers +x.
function bike(color) {
  const b = new Builder();
  b.cyl('#343a40', 0.05, 0.05, 0.016, 8, -0.07, 0.05, 0, PI / 2, 0, 0);
  b.cyl('#343a40', 0.05, 0.05, 0.016, 8, 0.07, 0.05, 0, PI / 2, 0, 0);
  b.box(color, 0.15, 0.022, 0.022, 0, 0.09, 0);
  b.box(color, 0.022, 0.07, 0.022, 0.06, 0.12, 0);
  person(b, color, color, -0.01, 0.09, 0, 0.75);
  return b.mesh();
}

const JAKARTA = [
  {
    name: 'Kota Tua',
    match: 'Place Fatahillah',
    dx: -0.08,
    dz: 0,
    size: 0.22,
    height: 0.85,
    build() {
      const b = new Builder();
      b.box('#d9cbb0', 1.3, 0.03, 0.66, 0, 0.015, 0.22); // place pavée
      // Ancien hôtel de ville de Batavia : long bâtiment blanc, toit de tuiles, clocheton
      b.box('#fdfdf7', 1.1, 0.32, 0.32, 0, 0.16, -0.3);
      b.poly('#b5523a', [[-0.2, 0], [0.2, 0], [0, 0.13]], 1.14, 0, 0.32, -0.3, 0, PI / 2, 0);
      b.box('#fdfdf7', 0.3, 0.42, 0.14, 0, 0.21, -0.1);
      b.poly('#fdfdf7', [[-0.17, 0], [0.17, 0], [0, 0.1]], 0.14, 0, 0.42, -0.1);
      b.cyl('#fdfdf7', 0.065, 0.065, 0.14, 8, 0, 0.52, -0.3);
      b.cone('#3d5a80', 0.085, 0.13, 8, 0, 0.655, -0.3);
      b.cyl('#3d5a80', 0.008, 0.008, 0.12, 4, 0, 0.78, -0.3);
      for (let i = -4; i <= 4; i++) {
        if (Math.abs(i) < 2) continue;
        b.box('#3d5a80', 0.055, 0.1, 0.02, i * 0.115, 0.2, -0.135);
        b.box('#3d5a80', 0.055, 0.06, 0.02, i * 0.115, 0.07, -0.135);
      }
      b.box('#6b4423', 0.08, 0.14, 0.02, 0, 0.07, -0.025);
      b.cyl('#495057', 0.02, 0.03, 0.1, 6, 0.42, 0.08, 0.3); // vieux canon sur la place
      const riders = [bike('#ff5fa2'), bike('#ffd43b'), bike('#4dabf7')];
      return {
        parts: [b.mesh(), ...riders],
        update(t) {
          riders.forEach((r, i) => {
            const a = t * 0.9 + (i * PI * 2) / 3;
            r.position.set(Math.cos(a) * 0.46, 0.03, 0.24 + Math.sin(a) * 0.2);
            r.rotation.y = -a - PI / 2;
          });
        },
      };
    },
  },
  {
    name: 'Sunda Kelapa',
    match: 'Port de Sunda Kelapa',
    dx: -0.24,
    dz: -0.3,
    size: 0.24,
    height: 0.75,
    build() {
      const b = new Builder();
      b.box('#8d6e63', 1.25, 0.06, 0.16, 0, 0.03, 0.42); // quai
      for (let i = -2; i <= 2; i++) b.cyl('#5d4037', 0.025, 0.025, 0.1, 6, i * 0.28, 0.08, 0.36);
      b.box('#c9a36b', 0.1, 0.08, 0.1, -0.42, 0.1, 0.44).box('#b08d57', 0.1, 0.08, 0.1, -0.3, 0.1, 0.45).box('#c9a36b', 0.1, 0.08, 0.1, -0.36, 0.18, 0.445);
      // Deux pinisi amarrés côte à côte
      const boats = [createModel('boat'), createModel('boat')];
      boats[0].object.position.set(-0.3, 0, 0.02);
      boats[0].object.scale.setScalar(0.62);
      boats[1].object.position.set(0.34, 0, -0.04);
      boats[1].object.scale.setScalar(0.7);
      boats[1].object.rotation.y = 0.2;
      // Un docker fait des allers-retours sur le quai avec un sac sur l'épaule
      const docker = person(new Builder(), '#e8590c', null, 0, 0, 0, 0.8).box('#f1e3c4', 0.09, 0.05, 0.05, 0, 0.2, 0).mesh();
      return {
        parts: [b.mesh(), boats[0].object, boats[1].object, docker],
        update(t) {
          boats[0].update(t);
          boats[1].update(t + 1.3);
          const u = (t * 0.25) % 2;
          docker.position.set(-0.2 + (u < 1 ? u : 2 - u) * 0.7, 0.06, 0.43);
          docker.position.y += Math.abs(Math.sin(t * 7)) * 0.012;
        },
      };
    },
  },
  {
    name: 'Glodok',
    match: 'Glodok',
    dx: -0.42,
    dz: 0.16,
    size: 0.19,
    height: 0.8,
    build() {
      const b = new Builder();
      // Temple chinois : murs rouges, deux toits noirs aux angles relevés, faîte doré
      b.box('#c0392b', 0.72, 0.3, 0.46, 0, 0.15, 0);
      b.box('#2d3436', 0.94, 0.05, 0.64, 0, 0.325, 0);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box('#2d3436', 0.12, 0.05, 0.12, x * 0.45, 0.365, z * 0.3);
      b.box('#c0392b', 0.42, 0.14, 0.28, 0, 0.42, 0);
      b.box('#2d3436', 0.6, 0.05, 0.42, 0, 0.515, 0);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box('#2d3436', 0.09, 0.045, 0.09, x * 0.28, 0.55, z * 0.19);
      b.box('#f1c40f', 0.4, 0.035, 0.05, 0, 0.56, 0);
      b.box('#f1c40f', 0.14, 0.2, 0.02, 0, 0.1, 0.235);
      b.cyl('#c0392b', 0.025, 0.025, 0.3, 6, -0.26, 0.15, 0.3).cyl('#c0392b', 0.025, 0.025, 0.3, 6, 0.26, 0.15, 0.3);
      b.cyl('#f1c40f', 0.06, 0.045, 0.09, 8, 0, 0.05, 0.42); // brûle-encens
      // Lanternes rouges qui se balancent, fumée d'encens
      const lanterns = new Builder();
      for (let i = -2; i <= 2; i++) lanterns.ball('#ff3b30', 0.035, i * 0.11, -0.04, 0, 1, 1.2, 1).box('#f1c40f', 0.012, 0.03, 0.012, i * 0.11, -0.085, 0);
      const garland = lanterns.mesh(0, 0.3, 0.33);
      const smoke = [puff(0.05), puff(0.05)];
      return {
        parts: [b.mesh(), garland, ...smoke],
        update(t) {
          garland.rotation.x = Math.sin(t * 1.6) * 0.25;
          smoke.forEach((s, i) => rise(s, (t * 0.3 + i * 0.5) % 1, 0, 0.1, 0.42, 0.45, 0.08, 1));
        },
      };
    },
  },
  {
    name: 'Monas',
    match: 'Monas',
    dx: 0.14,
    dz: 0.5,
    size: 0.2,
    height: 1.95,
    build() {
      const b = new Builder();
      b.box('#9ad17a', 1.1, 0.03, 1.1, 0, 0.015, 0); // pelouse de la place Merdeka
      b.box('#e9ecef', 0.66, 0.1, 0.66, 0, 0.08, 0);
      b.cyl('#f8f9fa', 0.36, 0.2, 0.16, 4, 0, 0.21, 0, 0, PI / 4, 0);
      b.cyl('#f8f9fa', 0.045, 0.1, 1.28, 4, 0, 0.93, 0, 0, PI / 4, 0);
      b.box('#f8f9fa', 0.2, 0.04, 0.2, 0, 1.59, 0);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.ball('#2f9e44', 0.09, x * 0.44, 0.1, z * 0.44, 1, 1.2, 1);
      // La flamme dorée du sommet
      const flame = new Builder().cone('#ffc107', 0.085, 0.22, 6, 0, 0.11, 0).ball('#ffe066', 0.06, 0, 0.05, 0).mesh(0, 1.61, 0);
      return {
        parts: [b.mesh(), flame],
        update(t) {
          flame.rotation.y = t * 1.5;
          flame.scale.set(1 + Math.sin(t * 5) * 0.08, 1 + Math.sin(t * 3.3) * 0.12, 1 + Math.cos(t * 5) * 0.08);
        },
      };
    },
  },
  {
    name: 'Istiqlal et cathédrale',
    match: 'Mosquée Istiqlal',
    dx: 0.52,
    dz: 0.26,
    size: 0.2,
    height: 1.25,
    build() {
      const mosque = createModel('mosque');
      mosque.object.position.set(-0.32, 0, 0);
      mosque.object.scale.setScalar(0.8);
      // La cathédrale néogothique, juste en face : nef grise et deux flèches
      const b = new Builder();
      b.box('#dee2e6', 0.26, 0.3, 0.56, 0.5, 0.15, 0);
      b.poly('#868e96', [[-0.15, 0], [0.15, 0], [0, 0.16]], 0.56, 0.5, 0.3, 0);
      for (const x of [0.4, 0.6]) {
        b.box('#dee2e6', 0.1, 0.5, 0.1, x, 0.25, 0.3);
        b.pyr('#adb5bd', 0.075, 0.42, x, 0.71, 0.3);
      }
      b.pyr('#adb5bd', 0.045, 0.3, 0.5, 0.6, -0.1);
      b.box('#3d5a80', 0.08, 0.14, 0.02, 0.5, 0.2, 0.36);
      return { parts: [mosque.object, b.mesh()], update: (t) => mosque.update(t) };
    },
  },
  {
    name: 'Musée national',
    match: 'Musée national',
    dx: -0.28,
    dz: 0.6,
    size: 0.18,
    height: 0.75,
    build() {
      const b = new Builder();
      // Façade néoclassique à colonnes, et l'éléphant de bronze devant
      b.box('#f8f9fa', 1.0, 0.3, 0.4, 0, 0.17, -0.12);
      b.box('#e9ecef', 1.06, 0.04, 0.5, 0, 0.02, -0.08);
      b.box('#e9ecef', 0.5, 0.04, 0.2, 0, 0.34, 0.12);
      b.poly('#f8f9fa', [[-0.26, 0], [0.26, 0], [0, 0.12]], 0.2, 0, 0.36, 0.12);
      for (let i = -2; i <= 2; i++) b.cyl('#f8f9fa', 0.022, 0.022, 0.28, 6, i * 0.1, 0.18, 0.2);
      b.box('#adb5bd', 0.14, 0.14, 0.2, 0, 0.07, 0.48);
      b.ball('#8a6d3b', 0.07, 0, 0.23, 0.48, 1.3, 1, 0.9);
      b.ball('#8a6d3b', 0.045, 0.1, 0.25, 0.48);
      b.cyl('#8a6d3b', 0.012, 0.016, 0.09, 5, 0.14, 0.2, 0.48, 0, 0, 0.3);
      for (const [x, z] of [[-0.05, -0.03], [0.05, -0.03], [-0.05, 0.03], [0.05, 0.03]]) b.cyl('#8a6d3b', 0.014, 0.014, 0.06, 5, x, 0.165, 0.48 + z);
      b.cyl('#adb5bd', 0.008, 0.008, 0.5, 4, 0.42, 0.29, 0.3);
      const banner = flag('#e03131', '#ffffff', 0.2, 0.12);
      banner.position.set(0.42, 0.48, 0.3);
      return {
        parts: [b.mesh(), banner],
        update(t) {
          banner.rotation.y = Math.sin(t * 2.4) * 0.5;
        },
      };
    },
  },
  {
    name: 'Cuisine de rue',
    match: 'Cuisine de rue',
    dx: 0.54,
    dz: 0.68,
    size: 0.15,
    height: 0.7,
    build() {
      const b = new Builder();
      // Charrette de vendeur ambulant, auvent rayé, tabourets en plastique
      b.box('#1c7ed6', 0.5, 0.2, 0.26, 0, 0.2, 0);
      b.box('#ffd43b', 0.5, 0.03, 0.26, 0, 0.315, 0);
      b.cyl('#343a40', 0.07, 0.07, 0.02, 8, -0.16, 0.07, 0.14, PI / 2, 0, 0).cyl('#343a40', 0.07, 0.07, 0.02, 8, 0.16, 0.07, 0.14, PI / 2, 0, 0);
      for (const x of [-0.23, 0.23]) b.cyl('#868e96', 0.01, 0.01, 0.3, 4, x, 0.46, -0.11).cyl('#868e96', 0.01, 0.01, 0.3, 4, x, 0.46, 0.11);
      for (let i = 0; i < 5; i++) b.box(i % 2 ? '#ffffff' : '#e03131', 0.11, 0.025, 0.34, -0.22 + i * 0.11, 0.62, 0);
      b.cyl('#495057', 0.07, 0.05, 0.04, 8, 0.08, 0.35, 0); // wok
      person(b, '#2f9e44', null, -0.36, 0, -0.02, 0.85);
      b.cyl('#e03131', 0.045, 0.055, 0.09, 6, 0.1, 0.045, 0.34).cyl('#4dabf7', 0.045, 0.055, 0.09, 6, -0.12, 0.045, 0.38);
      person(b, '#f76707', null, 0.1, 0.09, 0.34, 0.7);
      const steam = [puff(0.05), puff(0.05), puff(0.05)];
      return {
        parts: [b.mesh(), ...steam],
        update(t) {
          steam.forEach((s, i) => rise(s, (t * 0.45 + i / 3) % 1, 0.08, 0.38, 0, 0.4, 0.06, 1));
        },
      };
    },
  },
  {
    name: 'Avenue Sudirman',
    match: 'Dimanche matin',
    dx: 0.1,
    dz: 0.94,
    size: 0.2,
    height: 1.5,
    build() {
      const b = new Builder();
      // Gratte-ciel de verre le long de l'avenue, fermée aux voitures le dimanche matin
      const towers = [
        [-0.42, 0.9, '#4dabf7'],
        [-0.14, 1.35, '#339af0'],
        [0.16, 0.75, '#74c0fc'],
        [0.44, 1.12, '#228be6'],
      ];
      for (const [x, h, c] of towers) {
        b.box(c, 0.2, h, 0.2, x, h / 2, -0.2);
        b.box('#e7f5ff', 0.14, 0.04, 0.14, x, h + 0.02, -0.2);
        for (let y = 0.15; y < h - 0.05; y += 0.16) b.box('#d0ebff', 0.205, 0.03, 0.205, x, y, -0.2);
      }
      b.box('#495057', 1.3, 0.02, 0.26, 0, 0.01, 0.22);
      for (let i = -3; i <= 3; i++) b.box('#f8f9fa', 0.1, 0.022, 0.02, i * 0.19, 0.012, 0.22);
      for (const x of [-0.55, 0.55]) b.ball('#2f9e44', 0.07, x, 0.12, 0.42, 1, 1.3, 1).cyl('#6b4423', 0.015, 0.015, 0.1, 5, x, 0.05, 0.42);
      const riders = [bike('#ff922b'), bike('#51cf66'), bike('#f06595')];
      return {
        parts: [b.mesh(), ...riders],
        update(t) {
          riders.forEach((r, i) => {
            const dir = i % 2 ? -1 : 1;
            const u = (((t * 0.22 + i * 0.37) % 1) - 0.5) * dir;
            r.position.set(u * 1.2, 0.02, 0.17 + i * 0.05);
            r.rotation.y = dir > 0 ? 0 : PI;
          });
        },
      };
    },
  },
];

const SCENES = { jakarta: JAKARTA };

// Renvoie la scène d'une étape (ou null), avec son centre, pour y amener la caméra.
export function sceneOf(placeId) {
  const items = SCENES[placeId];
  if (!items) return null;
  const xs = items.map((i) => i.dx);
  const zs = items.map((i) => i.dz);
  return {
    items,
    center: { dx: (Math.min(...xs) + Math.max(...xs)) / 2, dz: (Math.min(...zs) + Math.max(...zs)) / 2 },
    span: Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)),
  };
}

// Construit un élément : un groupe à l'échelle 1, à placer et à animer par la scène 3D.
export function buildItem(item) {
  const { parts, update } = item.build();
  const object = new THREE.Group();
  object.add(...parts);
  update(0);
  return { object, update };
}
