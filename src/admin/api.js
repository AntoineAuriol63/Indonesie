// Accès à Supabase pour le back office : connexion, lecture et écriture des contenus, envoi de photos.
// Tout passe par l'API du projet, sans bibliothèque. Les droits sont vérifiés par la base (docs/supabase.sql) :
// seul un compte éditeur connecté peut écrire.
import { REST, SUPABASE_KEY, SUPABASE_URL, storageUrl } from '../data/supabase.js';

const SESSION = 'indonesie.admin.session';
const JSON_TYPE = { 'Content-Type': 'application/json' };

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let session = null;
try {
  session = JSON.parse(localStorage.getItem(SESSION));
} catch {
  // Pas de session lisible : il faudra se connecter.
}
let lastEmail = session?.email || '';
function remember(next) {
  session = next;
  if (next?.email) lastEmail = next.email;
  try {
    if (next) localStorage.setItem(SESSION, JSON.stringify(next));
    else localStorage.removeItem(SESSION);
  } catch {
    // Stockage indisponible : la session tient le temps de la page.
  }
}

// Traduit une erreur de l'API en une phrase utile.
function explain(status, body) {
  const code = body?.error_code || body?.code || '';
  const text = body?.message || body?.msg || body?.error_description || (typeof body === 'string' ? body : '');
  if (code === 'invalid_credentials' || /invalid login/i.test(text)) return 'E-mail ou mot de passe incorrect.';
  if (code === 'email_not_confirmed') return "Ce compte n'est pas encore confirmé. Dans Supabase, ouvrez Authentication > Users et confirmez-le.";
  if (code === 'PGRST205' || code === 'PGRST202' || code === '42P01' || code === 'NoSuchBucket') return "La base n'est pas encore installée : lancez le script docs/supabase.sql dans l'éditeur SQL de Supabase.";
  if (code === '42501' || status === 403 || body?.statusCode === '403' || /row-level security/i.test(text)) return "Ce compte n'a pas le droit de modifier les contenus du site.";
  if (code === '23505') return 'Un contenu porte déjà cet identifiant.';
  if (status === 413 || /too large|exceeded the maximum/i.test(text)) return 'Fichier trop lourd : 5 Mo au maximum.';
  if (status === 429) return 'Trop de tentatives. Patientez une minute, puis réessayez.';
  if (status === 401) return 'Votre session a expiré. Reconnectez-vous.';
  return `La base a répondu une erreur (${status}${text ? ` : ${text}` : ''}).`;
}

async function send(url, { method = 'GET', headers = {}, body, bearer } = {}) {
  let response;
  try {
    response = await fetch(url, { method, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${bearer || SUPABASE_KEY}`, ...headers }, body });
  } catch {
    throw new ApiError('Connexion impossible. Vérifiez votre accès à Internet, puis réessayez.', 0, 'network');
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) throw new ApiError(explain(response.status, data), response.status, data?.error_code || data?.code || '');
  return data;
}

function keep(data) {
  remember({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    email: data.user?.email || session?.email || '',
  });
}

export const auth = {
  email: () => session?.email || null,
  // Dernier e-mail connecté, pour préremplir le formulaire après une session expirée.
  lastEmail: () => lastEmail,
  async signIn(email, password) {
    keep(await send(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: JSON_TYPE, body: JSON.stringify({ email, password }) }));
  },
  async signOut() {
    const token = session?.access_token;
    remember(null);
    if (token) await send(`${SUPABASE_URL}/auth/v1/logout`, { method: 'POST', bearer: token }).catch(() => {});
  },
};

// Jeton de la session en cours, renouvelé peu avant son expiration (il dure une heure).
let renewing = null;
async function accessToken(force = false) {
  if (!session) throw new ApiError('Votre session a expiré. Reconnectez-vous.', 401, 'session');
  if (force || session.expires_at - Date.now() / 1000 < 90) {
    renewing ||= send(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: JSON_TYPE, body: JSON.stringify({ refresh_token: session.refresh_token }) })
      .then(keep)
      .finally(() => (renewing = null));
    try {
      await renewing;
    } catch (error) {
      if (error.status >= 400 && error.status < 500) {
        remember(null);
        throw new ApiError('Votre session a expiré. Reconnectez-vous.', 401, 'session');
      }
      throw error;
    }
  }
  return session.access_token;
}

async function authed(url, options = {}) {
  try {
    return await send(url, { ...options, bearer: await accessToken() });
  } catch (error) {
    // Jeton refusé alors qu'on le croyait valable : on le renouvelle une fois.
    if (error.status === 401 && error.code !== 'session') return send(url, { ...options, bearer: await accessToken(true) });
    throw error;
  }
}

const COLUMNS = { regions: 'id,position,data,updated_at', etapes: 'id,position,data,updated_at', documents: 'id,data,updated_at' };
const id = (value) => `id=eq.${encodeURIComponent(value)}`;

export const db = {
  list: (table, query = '') => authed(`${REST}/${table}?select=${COLUMNS[table] || '*'}${query ? `&${query}` : ''}`),
  // Ajoute des lignes ; avec upsert, remplace celles qui existent déjà (import des contenus).
  insert: (table, rows, { upsert = false } = {}) =>
    authed(`${REST}/${table}?select=${COLUMNS[table]}${upsert ? '&on_conflict=id' : ''}`, {
      method: 'POST',
      headers: { ...JSON_TYPE, Prefer: `${upsert ? 'resolution=merge-duplicates,' : ''}return=representation` },
      body: JSON.stringify(rows),
    }),
  // Modifie une ligne. Avec updatedAt, seulement si personne ne l'a modifiée depuis : sinon la réponse est vide.
  update: (table, rowId, patch, updatedAt) =>
    authed(`${REST}/${table}?select=${COLUMNS[table]}&${id(rowId)}${updatedAt ? `&updated_at=eq.${encodeURIComponent(updatedAt)}` : ''}`, {
      method: 'PATCH',
      headers: { ...JSON_TYPE, Prefer: 'return=representation' },
      body: JSON.stringify(patch),
    }),
  remove: (table, rowId) => authed(`${REST}/${table}?${id(rowId)}`, { method: 'DELETE' }),
  history: (table, rowId) =>
    authed(`${REST}/historique?select=id,data,action,saved_at,saved_by&source=eq.${table}&ref=eq.${encodeURIComponent(rowId)}&order=saved_at.desc&limit=30`),
  isEditor: () => authed(`${REST}/rpc/est_editeur`, { method: 'POST', headers: JSON_TYPE, body: '{}' }),
};

// Envoie une image dans le stockage du projet et renvoie son adresse publique.
export async function uploadPhoto(blob, prefix) {
  const path = `${prefix}-${Date.now().toString(36)}.jpg`;
  await authed(`${SUPABASE_URL}/storage/v1/object/photos/${path}`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'max-age=31536000' }, body: blob });
  return storageUrl(path);
}
