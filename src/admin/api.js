// Accès à Supabase pour le back office : ouverture par un code à 4 chiffres, lecture et écriture des contenus, envoi de photos.
// Tout passe par l'API du projet, sans bibliothèque. La lecture est publique. Chaque écriture passe par une fonction de la
// base (docs/supabase.sql) qui vérifie le jeton de session reçu en échange du bon code.
import { PUBLIC_HEADERS, REST, SUPABASE_URL, storageUrl } from '../data/supabase.js';

const SESSION = 'indonesie.admin.jeton';

export class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

let token = null;
try {
  token = localStorage.getItem(SESSION);
} catch {
  // Pas de stockage : il faudra redonner le code à chaque visite.
}
function remember(next) {
  token = next;
  try {
    if (next) localStorage.setItem(SESSION, next);
    else localStorage.removeItem(SESSION);
  } catch {
    // Stockage indisponible : la session tient le temps de la page.
  }
}

async function send(url, { method = 'GET', headers = {}, body } = {}) {
  let response;
  try {
    response = await fetch(url, { method, headers: { ...PUBLIC_HEADERS, ...headers }, body });
  } catch {
    throw new ApiError('Connexion impossible. Vérifiez votre accès à Internet, puis réessayez.', 'reseau');
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (response.ok) return data;
  const code = data?.code || '';
  const detail = data?.message || (typeof data === 'string' ? data : '');
  if (['PGRST205', 'PGRST202', '42P01', '42883', 'NoSuchBucket'].includes(code) || /bucket not found/i.test(detail)) {
    throw new ApiError("La base n'est pas encore installée, ou pas à jour : lancez le script docs/supabase.sql dans l'éditeur SQL de Supabase.", 'installation');
  }
  if (response.status === 413 || /too large|exceeded the maximum/i.test(detail)) throw new ApiError('Fichier trop lourd : 5 Mo au maximum.', 'taille');
  if (/row-level security|mime type/i.test(detail)) throw new ApiError("La base a refusé ce fichier. Réessayez l'envoi ; seules les images sont acceptées.", 'refus');
  throw new ApiError(`La base a répondu une erreur (${response.status}${detail ? ` : ${detail}` : ''}).`, 'erreur');
}

const REASONS = {
  session: 'Le back office est verrouillé. Redonnez le code pour continuer.',
  conflit: 'Ce contenu a été modifié ailleurs entre-temps.',
  demande: "La base a refusé cette demande : identifiant ou contenu non valable.",
  format: 'Le code doit faire exactement 4 chiffres.',
  bloque: "Trop de codes faux. Les essais sont bloqués un moment : réessayez dans un quart d'heure.",
  pas_de_code: "Aucun code n'a encore été choisi.",
};

// Appelle une fonction de la base. Celles du back office répondent { ok: true, … } ou { ok: false, raison }.
async function call(name, args = {}) {
  const result = await send(`${REST}/rpc/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  if (result && result.ok === false) {
    if (result.raison === 'session') remember(null);
    if (result.raison === 'code') {
      const left = result.essais_restants;
      throw new ApiError(left > 0 ? `Code incorrect. Encore ${left} essai${left > 1 ? 's' : ''} avant un blocage d'un quart d'heure.` : "Code incorrect. Les essais sont maintenant bloqués pendant un quart d'heure.", 'code');
    }
    throw new ApiError(REASONS[result.raison] || 'La base a refusé cette demande.', result.raison);
  }
  return result;
}
// Fonction qui demande une session ouverte.
const secured = (name, args = {}) => {
  if (!token) throw new ApiError(REASONS.session, 'session');
  return call(name, { jeton: token, ...args });
};

export const access = {
  hasToken: () => !!token,
  // Le code a-t-il déjà été choisi ? (sinon, le back office propose de le choisir)
  isCodeSet: async () => (await call('etat_acces')).code_defini,
  // Le jeton gardé par ce navigateur est-il encore valable ?
  async check() {
    if (!token) return false;
    const open = await call('session_ouverte', { jeton: token });
    if (!open) remember(null);
    return open;
  },
  async open(code) {
    remember((await call('ouvrir', { code })).jeton);
  },
  // Premier choix du code (ouvre aussi la session), ou changement quand une session est ouverte.
  async choose(code) {
    const result = await call('choisir_code', { code, jeton: token });
    if (result.jeton) remember(result.jeton);
  },
  async lock() {
    const old = token;
    remember(null);
    if (old) await call('fermer', { jeton: old }).catch(() => {});
  },
};

const COLUMNS = { regions: 'id,position,data,updated_at', etapes: 'id,position,data,updated_at', documents: 'id,data,updated_at' };

export const db = {
  list: (table, query = '') => send(`${REST}/${table}?select=${COLUMNS[table]}${query ? `&${query}` : ''}`),
  // Crée ou modifie un contenu. Avec « expected » (date de la version ouverte), échoue (code « conflit »)
  // si quelqu'un l'a modifié depuis. Renvoie la nouvelle date de modification.
  save: async (table, id, data, { position = null, expected = null } = {}) =>
    (await secured('enregistrer', { source: table, ref: id, contenu: data, rang: position, attendu: expected })).updated_at,
  move: async (id, position) => (await secured('deplacer', { ref: id, rang: position })).updated_at,
  remove: (id) => secured('supprimer', { ref: id }),
  history: async (table, id) => (await secured('versions', { source: table, ref: id })).versions,
  importAll: (contents) => secured('importer', { contenus: contents }),
};

// Envoie une image dans le stockage du projet et renvoie son adresse publique.
// La base autorise d'abord un nom de fichier tiré au hasard ; l'image ne peut être déposée que sous ce nom.
export async function uploadPhoto(blob, prefix) {
  const { nom } = await secured('autoriser_envoi', { prefixe: prefix });
  await send(`${SUPABASE_URL}/storage/v1/object/photos/${nom}`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'max-age=31536000' }, body: blob });
  return storageUrl(nom);
}
