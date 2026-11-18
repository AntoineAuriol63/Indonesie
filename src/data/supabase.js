// Projet Supabase qui garde les contenus du site (régions, étapes, itinéraire, réglages), les favoris et les photos envoyées.
// La clé ci-dessous est la clé publique du projet : elle est faite pour figurer dans le code d'un site.
// Ce qu'elle permet est fixé par les règles de la base (docs/supabase.sql) : lire les contenus et gérer les favoris.
// Modifier les contenus demande en plus d'être connecté au back office avec un compte éditeur.
export const SUPABASE_URL = 'https://iocfpzdaqiceiqwhawmg.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_Mme0_QfZcI0A0_t9b7ZMRw_Gn82NQtZ';

export const REST = `${SUPABASE_URL}/rest/v1`;
export const PUBLIC_HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
// Adresse publique d'une photo envoyée depuis le back office (stockage Supabase, dossier « photos »).
export const storageUrl = (path) => `${SUPABASE_URL}/storage/v1/object/public/photos/${path}`;
