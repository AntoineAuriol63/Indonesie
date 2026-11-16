// Charge les scènes en cours d'écriture (src/world/scenes/wip/*.scene.js), uniquement en développement.
// Chaque fichier est chargé séparément : un fichier en erreur n'empêche pas les autres d'apparaître.
export function loadWipScenes(register) {
  for (const [path, load] of Object.entries(import.meta.glob('./wip/*.scene.js'))) {
    load()
      .then((file) => register(file.default))
      .catch((error) => console.error(`Scène en cours d'écriture illisible : ${path}`, error));
  }
}
