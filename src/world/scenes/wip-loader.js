// Charge les scènes en cours d'écriture (src/world/scenes/wip/*.scene.js), uniquement en développement.
const scenes = {};
for (const file of Object.values(import.meta.glob('./wip/*.scene.js', { eager: true }))) Object.assign(scenes, file.default);
export default scenes;
