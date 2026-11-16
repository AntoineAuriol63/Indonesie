// Scènes détaillées : quand une étape est sélectionnée, son petit modèle laisse place à plusieurs
// monuments et activités animés, posés sur la carte autour du lieu.
//
// Chaque fichier *.scene.js de ce dossier exporte { 'id-etape': [éléments] }, ou { 'id-etape': { scale, items } }
// pour une scène plus petite ou plus grande que la normale. Un élément :
//   name   : texte de l'étiquette sur la carte
//   match  : début du nom de l'activité correspondante dans la fiche (un clic sur l'étiquette y amène)
//   dx, dz : position par rapport au repère de l'étape (dx vers l'est, dz vers le sud), en unités de scène
//   size   : taille d'une unité du modèle, en unités de scène ; height : hauteur du modèle, pour placer l'étiquette
//   build  : fabrique, renvoie { parts, update(t) } comme les modèles de models.js (origine au sol)
// Une unité de scène vaut « scale » degré sur la carte (SCENE_SCALE par défaut). Sur une petite île, réduire scale.
import * as THREE from 'three';

export const SCENE_SCALE = 0.5;

const SCENES = {};
for (const file of Object.values(import.meta.glob('./*.scene.js', { eager: true }))) Object.assign(SCENES, file.default);
// En développement, on charge aussi les scènes en cours d'écriture (dossier wip/, absent du site publié).
if (import.meta.env.DEV) import('./wip-loader.js').then((wip) => wip.loadWipScenes((scenes) => Object.assign(SCENES, scenes)));

// Renvoie la scène d'une étape (ou null), avec son centre et son étendue en degrés (est-ouest, nord-sud), pour y amener la caméra.
export function sceneOf(placeId) {
  const def = SCENES[placeId];
  if (!def) return null;
  const items = Array.isArray(def) ? def : def.items;
  const scale = Array.isArray(def) ? SCENE_SCALE : def.scale || SCENE_SCALE;
  const xs = items.map((i) => i.dx * scale);
  const zs = items.map((i) => i.dz * scale);
  return {
    items,
    scale,
    center: { dx: (Math.min(...xs) + Math.max(...xs)) / 2, dz: (Math.min(...zs) + Math.max(...zs)) / 2 },
    // Marge à garder autour de la scène : place pour les étiquettes et l'emprise des éléments du bord.
    margin: scale * (0.2 + Math.max(...items.map((i) => i.size)) * 1.6),
    spanX: Math.max(...xs) - Math.min(...xs),
    spanZ: Math.max(...zs) - Math.min(...zs),
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
