// Régions, étapes et villes affichées sur la carte.
// Les textes viennent du tableur de préparation (src/data/base.json, généré par scripts/import-base.py) ;
// ce fichier n'ajoute que ce qui concerne l'affichage : couleurs, cadrages, modèles 3D, noms courts.
import base from './base.json';

// Couleur, cadrage de la caméra (lon, lat, distance) et position du nom sur la carte.
const REGION_VIEW = {
  sumatra: { color: '#12b5a6', focus: [99.8, 1.2, 10], label: [101.6, -0.9] },
  java: { color: '#ff8a3d', focus: [110, -7.4, 13.5], label: [109.2, -6.2] },
  bali: { color: '#ff4f8b', focus: [115.1, -8.47, 3.7], label: [114.6, -7.45] },
  'lombok-et-gili': { color: '#ffb703', focus: [116.3, -8.62, 3.3], label: [115.3, -9.95] },
  sumbawa: { color: '#f77f00', focus: [117.8, -8.5, 5], label: [118.2, -7.45] },
  'flores-et-komodo': { color: '#9b5de5', focus: [120.1, -8.65, 5.4], label: [122.6, -7.5] },
  sumba: { color: '#c05299', focus: [119.85, -9.75, 4.2], label: [119.9, -10.75] },
  'timor-occidental-et-alor': { color: '#577590', focus: [124.0, -9.3, 5.6], label: [125.6, -10.9], short: 'Timor et Alor' },
  kalimantan: { color: '#43a047', focus: [114.6, -0.4, 13], label: [113.8, -0.3] },
  sulawesi: { color: '#0096c7', focus: [121.9, -1.0, 12], label: [121.0, -2.4] },
  moluques: { color: '#e63946', focus: [128.4, -1.3, 11.5], label: [128.5, -1.6] },
  'raja-ampat': { color: '#f15bb5', focus: [130.5, -0.6, 4.2], label: [131.2, 1.0] },
};

// Nom court pour la carte, modèle 3D, ordre d'apparition quand on dézoome (rang 1 = affiché en premier)
// et, si besoin, position du modèle quand le repère du tableur ne convient pas (activité en mer, îlot absent de la carte).
const PLACE_VIEW = {
  ubud: ['Ubud', 'pura', 1],
  munduk: ['Munduk', 'waterfall', 3],
  sidemen: ['Sidemen', 'rice', 3],
  amed: ['Amed', 'snorkel', 2, [115.72, -8.3]],
  'pemuteran-menjangan': ['Menjangan', 'fish', 3, [114.6, -8.07]],
  'sud-de-bali-uluwatu': ['Uluwatu', 'surf', 2, [115.04, -8.86]],
  'nusa-penida-lembongan': ['Nusa Penida', 'manta', 2, [115.5, -8.87]],
  'labuan-bajo-komodo': ['Komodo', 'komodo', 1, [119.46, -8.57]],
  'ruteng-et-manggarai': ['Ruteng', 'rice', 3],
  'wae-rebo': ['Wae Rebo', 'house-cone', 2],
  jakarta: ['Jakarta', 'skyline', 1],
  'bandung-et-rancabali': ['Rancabali', 'tea', 3],
  'yogyakarta-et-temples': ['Yogyakarta', 'stupa', 1],
  dieng: ['Dieng', 'candi', 3],
  'malang-bromo': ['Bromo', 'jeep', 1],
  'tumpak-sewu': ['Tumpak Sewu', 'waterfall', 3],
  surabaya: ['Surabaya', 'skyline', 2],
  'tanjung-puting': ['Tanjung Puting', 'orangutan', 1],
  'derawan-maratua': ['Derawan', 'turtle', 1, [118.3, 2.25]],
  'sud-de-lombok': ['Sud de Lombok', 'surf', 2, [116.28, -8.97]],
  tetebatu: ['Tetebatu', 'rice', 3],
  'nord-de-lombok': ['Nord de Lombok', 'waterfall', 3],
  'gili-air-meno-trawangan': ['Îles Gili', 'turtle', 1, [116.06, -8.3]],
  'banda-neira': ['Banda Neira', 'fort', 1],
  'ternate-tidore': ['Ternate', 'market', 1, [127.36, 0.78]],
  morotai: ['Morotai', 'palm', 2],
  'kri-gam-arborek': ['Kri et Arborek', 'house-stilt', 2, [130.52, -0.6]],
  'waigeo-secteur-de-piaynemo': ['Piaynemo', 'karst', 1],
  'pays-toraja': ['Pays Toraja', 'house-toraja', 1],
  'manado-bunaken': ['Bunaken', 'fish', 1, [124.72, 1.58]],
  tangkoko: ['Tangkoko', 'monkey', 2, [125.17, 1.5]],
  'medan-bukit-lawang': ['Bukit Lawang', 'orangutan', 1],
  'lac-toba': ['Lac Toba', 'house-horn', 1],
  'bukittinggi-et-hauts-plateaux': ['Bukittinggi', 'house-horn', 1],
  'sud-ouest-waikabubak': ['Waikabubak', 'house-sumba', 1],
  'waingapu-et-est': ['Waingapu', 'horse', 2],
  'sumbawa-besar-moyo': ['Moyo', 'waterfall', 1],
  kupang: ['Kupang', 'palm', 1],
  'alor-kepa': ['Alor', 'snorkel', 1, [124.38, -8.3]],
};

export const REGIONS = base.regions.map((r) => {
  const view = REGION_VIEW[r.id];
  return { ...r, short: view.short || r.name, color: view.color, focus: { lon: view.focus[0], lat: view.focus[1], dist: view.focus[2] }, label: { lon: view.label[0], lat: view.label[1] } };
});
export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

export const PLACES = base.places.map((p) => {
  const [short, model, rank, spot] = PLACE_VIEW[p.id];
  return { ...p, short, model, rank, lon: spot ? spot[0] : p.lon, lat: spot ? spot[1] : p.lat };
});
export const PLACE_BY_ID = Object.fromEntries(PLACES.map((p) => [p.id, p]));
export const placesOf = (regionId) => PLACES.filter((p) => p.region === regionId);

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
