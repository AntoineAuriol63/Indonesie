// Lecture des contenus au démarrage du site.
// 1. La base Supabase, pour avoir la dernière version enregistrée dans le back office.
// 2. Si elle ne répond pas à temps : la dernière version lue par ce navigateur.
// 3. À défaut : la copie de secours intégrée au site (src/data/snapshot.json, rafraîchie à chaque publication).
import { PUBLIC_HEADERS, REST } from './supabase.js';

const CACHE = 'indonesie.contenus';
const TIMEOUT = 4500;

async function table(name, query, signal) {
  const response = await fetch(`${REST}/${name}?${query}`, { headers: PUBLIC_HEADERS, signal });
  if (!response.ok) throw new Error(`Contenus : ${name} a répondu ${response.status}`);
  return response.json();
}

// Même forme que la copie de secours : { regions: [...], places: [...], documents: { itineraire, site } }.
export function assemble(regions, places, documents) {
  return {
    regions: regions.map((row) => ({ ...row.data, id: row.id })),
    places: places.map((row) => ({ ...row.data, id: row.id })),
    documents: Object.fromEntries(documents.map((row) => [row.id, row.data])),
  };
}

async function fromDatabase() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const [regions, places, documents] = await Promise.all([
      table('regions', 'select=id,data&order=position,id', controller.signal),
      table('etapes', 'select=id,data&order=position,id', controller.signal),
      table('documents', 'select=id,data', controller.signal),
    ]);
    // Base vide (contenus pas encore importés) : on ne s'en sert pas.
    if (!regions.length || !places.length) throw new Error('Contenus : la base est vide');
    return assemble(regions, places, documents);
  } finally {
    clearTimeout(timer);
  }
}

export async function loadContent() {
  try {
    const content = await fromDatabase();
    try {
      localStorage.setItem(CACHE, JSON.stringify(content));
    } catch {
      // Stockage plein ou indisponible : sans importance.
    }
    return { content, source: 'base' };
  } catch (error) {
    console.warn('Contenus : la base ne répond pas, on utilise une copie.', error);
  }
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE));
    if (cached?.regions?.length && cached?.places?.length) return { content: cached, source: 'navigateur' };
  } catch {
    // Pas de copie lisible dans ce navigateur.
  }
  const snapshot = await import('./snapshot.json');
  return { content: snapshot.default, source: 'secours' };
}
