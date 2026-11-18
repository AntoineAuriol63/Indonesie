// Import d'un fichier JSON qui remplace les contenus de la base.
// Le fichier a la même forme que celui du bouton « Télécharger tous les contenus » (voir docs/format-contenus.md) :
// { "regions": [{ id, … }], "places": [{ id, … }], "documents": { "itineraire": {…}, "site": {…} } }.
import { h } from './ui.js';

const ID = /^[a-z0-9-]{1,60}$/;
const TYPES = ['Culture', 'Nature', 'Mer', 'Randonnée', 'Ville', 'Cuisine', 'Faune', 'Détente'];
const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
const isText = (v) => typeof v === 'string';
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

// Même contenu, quel que soit l'ordre des champs (la base ne garde pas l'ordre du fichier).
const canon = (v) =>
  Array.isArray(v)
    ? `[${v.map(canon).join(',')}]`
    : isObject(v)
      ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`
      : JSON.stringify(v ?? null);

// Vérifie le fichier. Renvoie { errors } (phrases à corriger dans le fichier) ou { rows } prêt à verser dans la base.
export function readImport(text, knownRegions) {
  let file;
  try {
    file = JSON.parse(text);
  } catch (error) {
    return { errors: [`Ce n'est pas un fichier JSON valide : ${error.message}`] };
  }
  const errors = [];
  const regions = file?.regions;
  const places = file?.places ?? file?.etapes;
  const documents = file?.documents ?? {};
  if (!isObject(file) || !Array.isArray(regions) || !Array.isArray(places) || !isObject(documents)) {
    return { errors: ['Le fichier doit contenir « regions » (une liste), « places » (une liste) et « documents ». Partez du fichier fourni par « Télécharger tous les contenus ».'] };
  }
  if (!places.length) errors.push("Le fichier ne contient aucune étape : il viderait le site. Import refusé.");

  const seen = new Set();
  const unique = (kind, id) => {
    if (!isText(id) || !ID.test(id)) return errors.push(`${kind} : identifiant « ${id} » non valable (minuscules, chiffres et tirets seulement).`), false;
    if (seen.has(`${kind}/${id}`)) return errors.push(`${kind} « ${id} » : présente deux fois dans le fichier.`), false;
    return seen.add(`${kind}/${id}`), true;
  };
  for (const r of regions) {
    if (!isObject(r) || !unique('Région', r.id)) continue;
    if (!isText(r.name) || !r.name.trim()) errors.push(`Région « ${r.id} » : il manque le nom (« name »).`);
  }
  const regionIds = new Set([...knownRegions, ...regions.filter(isObject).map((r) => r.id)]);
  for (const p of places) {
    if (!isObject(p) || !unique('Étape', p.id)) continue;
    const where = `Étape « ${p.id} »`;
    if (!isText(p.name) || !p.name.trim()) errors.push(`${where} : il manque le nom (« name »).`);
    if (!regionIds.has(p.region)) errors.push(`${where} : région « ${p.region} » inconnue.`);
    if (!isNumber(p.lat) || !isNumber(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) errors.push(`${where} : « lat » et « lon » doivent être des nombres (ex. -8.507 et 115.262).`);
    for (const key of ['intro', 'tips', 'todo', 'photos']) if (p[key] != null && !Array.isArray(p[key])) errors.push(`${where} : « ${key} » doit être une liste.`);
    (Array.isArray(p.todo) ? p.todo : []).forEach((t, i) => {
      const what = `${where}, activité ${i + 1}`;
      if (!isObject(t) || !isText(t.name) || !t.name.trim()) return errors.push(`${what} : il manque le nom.`);
      if (t.type && !TYPES.includes(t.type)) errors.push(`${what} (« ${t.name} ») : type « ${t.type} » inconnu. Types possibles : ${TYPES.join(', ')}.`);
      if (t.price != null && (!isObject(t.price) || !isNumber(t.price.amount) || !['IDR', 'EUR'].includes(t.price.currency)))
        errors.push(`${what} (« ${t.name} ») : le prix doit avoir un montant (« amount », un nombre) et une monnaie (« currency » : "IDR" ou "EUR"), ou valoir null.`);
      if ((t.lat != null || t.lon != null) && (!isNumber(t.lat) || !isNumber(t.lon))) errors.push(`${what} (« ${t.name} ») : « lat » et « lon » vont ensemble et sont des nombres.`);
    });
    (Array.isArray(p.photos) ? p.photos : []).forEach((ph, i) => {
      if (!isObject(ph) || !(isText(ph.file) || isText(ph.url))) errors.push(`${where}, photo ${i + 1} : il faut « file » (fichier de Wikimedia Commons) ou « url ».`);
    });
  }
  for (const [id, data] of Object.entries(documents)) if (!['itineraire', 'site'].includes(id) || !isObject(data)) errors.push(`Document « ${id} » : seuls « itineraire » et « site » sont attendus.`);
  if (documents.site && !(documents.site.idrPerEur > 0)) errors.push('Réglages (« site ») : « idrPerEur » doit être un nombre positif.');
  if (errors.length) return { errors };

  const row = ({ id, ...data }, position) => ({ id, position, data });
  return { rows: { regions: regions.map(row), etapes: places.map(row), documents: Object.entries(documents).map(([id, data]) => ({ id, data })) } };
}

// Compare le fichier à la base : ce qui sera ajouté, modifié, supprimé. « current » : { regions, etapes, documents }
// sous la forme { id: { name, data } } des dernières versions enregistrées.
export function compareImport(rows, current) {
  const diff = (table, deletes) => {
    const incoming = new Map(rows[table].map((r) => [r.id, r]));
    return {
      added: rows[table].filter((r) => !current[table][r.id]).map((r) => r.data.name || r.id),
      changed: rows[table].filter((r) => current[table][r.id] && canon(current[table][r.id].data) !== canon(r.data)).map((r) => r.data.name || r.id),
      removed: deletes ? Object.entries(current[table]).filter(([id]) => !incoming.has(id)).map(([id, c]) => ({ id, name: c.name || id })) : [],
      kept: deletes ? [] : Object.entries(current[table]).filter(([id]) => !incoming.has(id)).map(([, c]) => c.name),
    };
  };
  const result = { regions: diff('regions', false), etapes: diff('etapes', true), documents: diff('documents', false) };
  result.empty = ['regions', 'etapes', 'documents'].every((t) => !result[t].added.length && !result[t].changed.length && !result[t].removed.length);
  return result;
}

// Résumé affiché avant de confirmer.
export function importSummary(diff) {
  const names = (list) => (list.length > 12 ? `${list.slice(0, 12).join(', ')} et ${list.length - 12} autres` : list.join(', '));
  const line = ([one, many], list, kind) => list.length > 0 && h('li', { class: kind ? `import__${kind}` : '' }, h('strong', {}, `${list.length} ${list.length > 1 ? many : one} : `), names(list));
  const DOC = { itineraire: "Exemple d'itinéraire", site: 'Réglages du site' };
  const docs = [...diff.documents.added, ...diff.documents.changed].map((id) => DOC[id] || id);
  return h(
    'ul',
    { class: 'import' },
    line(['étape modifiée', 'étapes modifiées'], diff.etapes.changed),
    line(['étape ajoutée', 'étapes ajoutées'], diff.etapes.added),
    line(['étape supprimée', 'étapes supprimées'], diff.etapes.removed.map((r) => r.name), 'removed'),
    line(['région modifiée', 'régions modifiées'], diff.regions.changed),
    line(['région ajoutée', 'régions ajoutées'], diff.regions.added),
    docs.length > 0 && h('li', {}, h('strong', {}, 'Aussi remplacés : '), docs.join(', ')),
    diff.regions.kept.length > 0 && h('li', { class: 'import__note' }, `Régions absentes du fichier, laissées telles quelles : ${names(diff.regions.kept)}.`),
  );
}
