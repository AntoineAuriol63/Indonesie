// Décor de la carte : villes, repères géographiques, sommets. Ces éléments font partie de la carte elle-même
// (comme le relief) et ne se modifient pas depuis le back office.

// Grandes villes : [nom, lon, lat, modèle 3D ou null si une étape voisine en a déjà un]
export const CITIES = [
  ['Jakarta', 106.83, -6.18, null],
  ['Bandung', 107.61, -6.92, null],
  ['Yogyakarta', 110.37, -7.8, null],
  ['Surabaya', 112.74, -7.25, null],
  ['Denpasar', 115.22, -8.67, 'plane'],
  ['Labuan Bajo', 119.84, -8.46, 'boat'],
  ['Medan', 98.67, 3.59, 'mosque'],
  ['Padang', 100.36, -0.95, null],
  ['Palembang', 104.75, -2.99, 'bridge'],
  ['Pontianak', 109.33, -0.03, null],
  ['Banjarmasin', 114.59, -3.32, 'market'],
  ['Balikpapan', 116.83, -1.27, null],
  ['Makassar', 119.36, -5.16, 'boat'],
  ['Manado', 124.84, 1.49, null],
  ['Kupang', 123.6, -10.17, null],
  ['Ambon', 128.18, -3.7, 'palm'],
  ['Sorong', 131.25, -0.88, null],
  ['Jayapura', 140.75, -2.5, 'house-stilt'],
].map(([name, lon, lat, model]) => ({ name, lon, lat, model }));

// Repères géographiques non cliquables : pays voisins, mers, grandes îles hors sélection.
export const GEO_LABELS = [
  ['Malaisie', 102.4, 4.2, 'country'],
  ['Malaisie', 116.0, 5.3, 'country'],
  ['Brunei', 114.6, 4.5, 'country'],
  ['Philippines', 125.0, 7.3, 'country'],
  ['Papouasie-Nouvelle-Guinée', 144.5, -6.0, 'country'],
  ['Timor oriental', 126.0, -8.75, 'country'],
  ['Papouasie', 137.5, -4.0, 'island'],
  ['Mer de Java', 111.5, -5.0, 'sea'],
  ['Océan Indien', 104.0, -9.5, 'sea'],
  ['Mer de Banda', 127.0, -6.0, 'sea'],
  ['Mer de Célèbes', 121.5, 3.5, 'sea'],
  ['Détroit de Makassar', 118.0, -2.2, 'sea'],
  ['Océan Pacifique', 134.5, 3.0, 'sea'],
  ['Mer de Chine méridionale', 107.5, 4.0, 'sea'],
].map(([name, lon, lat, kind]) => ({ name, lon, lat, kind }));

// Volcans et sommets : [nom, lon, lat, hauteur relative, fume ?]
export const PEAKS = [
  ['Merapi', 110.446, -7.541, 0.3, true],
  ['Slamet', 109.208, -7.242, 0.3, false],
  ['Bromo', 112.95, -7.942, 0.2, true],
  ['Semeru', 112.922, -8.108, 0.34, true],
  ['Ijen', 114.242, -8.058, 0.24, true],
  ['Batur', 115.375, -8.242, 0.1, false],
  ['Agung', 115.508, -8.343, 0.2, true],
  ['Rinjani', 116.47, -8.42, 0.26, true],
  ['Tambora', 118.0, -8.25, 0.28, false],
  ['Kelimutu', 121.82, -8.77, 0.16, false],
  ['Sinabung', 98.392, 3.17, 0.28, true],
  ['Kerinci', 101.264, -1.697, 0.38, true],
  ['Lokon', 124.79, 1.36, 0.18, true],
  ['Gamalama', 127.33, 0.8, 0.14, true],
  ['Puncak Jaya', 137.158, -4.078, 0.5, false],
];

// Points autour desquels le relief est dessiné plus finement : les positions des étapes au moment où les scènes 3D
// ont été posées. La liste est figée exprès : si une étape est déplacée depuis le back office, le relief ne bouge pas,
// et les scènes détaillées restent posées correctement.
export const DETAIL_SPOTS = [
  [115.262, -8.507], [115.0792, -8.254], [115.4429, -8.4679], [115.72, -8.3], [114.6, -8.07], [115.04, -8.86],
  [115.5, -8.87], [119.46, -8.57], [120.4626, -8.6127], [120.2831, -8.7694], [106.8136, -6.1343], [107.3711, -7.154],
  [110.2039, -7.6079], [109.8641, -7.207], [112.95, -7.9417], [112.9172, -8.2314], [112.7378, -7.2458], [111.9184, -3.055],
  [118.3, 2.25], [116.28, -8.97], [116.4176, -8.5577], [116.4007, -8.3029], [116.06, -8.3], [129.8965, -4.5316],
  [127.36, 0.78], [128.4, 2.3], [130.52, -0.6], [130.3002, -0.5817], [119.9, -2.969], [124.72, 1.58],
  [125.17, 1.5], [98.145, 3.557], [98.88, 2.68], [100.3686, -0.3007], [119.4167, -9.6667], [120.2641, -9.6567],
  [117.5192, -8.2118], [123.6077, -10.1702], [124.38, -8.3], [115.262, -8.688],
];
