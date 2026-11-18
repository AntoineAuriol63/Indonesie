// Copie de secours des contenus : lit la base Supabase et écrit src/data/snapshot.json.
// Lancé avant chaque publication du site et deux fois par semaine (.github/workflows/deploy.yml).
// Ne fait jamais échouer la publication : si la base ne répond pas ou est vide, la copie existante est gardée.
import { readFile, writeFile } from 'node:fs/promises';
import { PUBLIC_HEADERS, REST } from '../src/data/supabase.js';

const FILE = new URL('../src/data/snapshot.json', import.meta.url);

async function table(name, query) {
  const response = await fetch(`${REST}/${name}?${query}`, { headers: PUBLIC_HEADERS, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${name} a répondu ${response.status}`);
  return response.json();
}

try {
  const [regions, places, documents] = await Promise.all([
    table('regions', 'select=id,data&order=position,id'),
    table('etapes', 'select=id,data&order=position,id'),
    table('documents', 'select=id,data&order=id'),
  ]);
  if (!regions.length || !places.length) throw new Error('la base est vide');
  const snapshot = {
    regions: regions.map((row) => ({ id: row.id, ...row.data })),
    places: places.map((row) => ({ id: row.id, ...row.data })),
    documents: Object.fromEntries(documents.map((row) => [row.id, row.data])),
  };
  const next = `${JSON.stringify(snapshot, null, 1)}\n`;
  const previous = await readFile(FILE, 'utf8').catch(() => '');
  if (next === previous) console.log(`Copie de secours déjà à jour (${regions.length} régions, ${places.length} étapes).`);
  else {
    await writeFile(FILE, next);
    console.log(`Copie de secours mise à jour : ${regions.length} régions, ${places.length} étapes.`);
  }
} catch (error) {
  console.warn(`Copie de secours inchangée : ${error.message}.`);
}
