// Contenus du site : régions, étapes, exemple d'itinéraire et réglages.
// Ils sont gardés dans Supabase et modifiés depuis le back office (/admin/). Au démarrage, load.js les lit et les
// passe à setContent(), qui prépare ce dont la carte et les fiches ont besoin. Tant que ce n'est pas fait, tout est vide.

// Une photo vient de Wikimedia Commons (champ « file », redimensionnée à la demande) ou d'une adresse web (champ « url »).
const commons = (path) => (width) => `${path}?width=${width}`;
export const photoOf = (ph) =>
  ph.url
    ? { caption: ph.caption, at: () => ph.url }
    : { caption: ph.caption, at: commons(`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(ph.file)}`) };

// Photo de chaque activité. Une activité peut désigner la sienne (champ « photo », même format que la galerie) ;
// sinon on lui attribue la photo de la galerie dont la légende parle du même sujet, quand il y en a une.
const STOP_WORDS = new Set(['dans', 'pour', 'avec', 'vers', 'depuis', 'sous', 'entre', 'leur', 'leurs', 'cette', 'tout', 'tous', 'plus']);
const words = (text) =>
  new Set(
    String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .match(/[a-z0-9]{4,}/g)
      ?.filter((w) => !STOP_WORDS.has(w)) || [],
  );
const shared = (a, b) => [...a].filter((w) => b.has(w)).length;
export function todoPhotos(todo, gallery) {
  const names = todo.map((t) => words(t.name));
  const texts = todo.map((t) => words(t.text));
  const result = todo.map((t) => (t.photo && (t.photo.file || t.photo.url) ? photoOf(t.photo) : null));
  gallery.forEach((ph) => {
    const caption = words(ph.caption);
    let best = -1;
    let bestScore = 0;
    todo.forEach((t, i) => {
      const score = shared(caption, names[i]) * 2 + shared(caption, texts[i]) * 0.5;
      if (score > bestScore) {
        best = i;
        bestScore = score;
      }
    });
    if (best >= 0 && bestScore >= 2 && !result[best]) result[best] = photoOf(ph);
  });
  return result;
}

export let REGIONS = [];
export let REGION_BY_ID = {};
export let PLACES = [];
export let PLACE_BY_ID = {};
export let ITINERARY = { title: '', facts: '', summary: [], stops: [], days: [], transports: [], budget: { lines: [], totalLabel: '', total: '', note: '' } };
// Réglages : titre et date affichés, phrase de l'écran d'accueil, taux de change utilisé pour convertir les prix en euros.
export let SITE = { title: 'Indonésie', date: 'Août 2027', intro: '', idrPerEur: 20100 };
export const placesOf = (regionId) => PLACES.filter((p) => p.region === regionId && !p.hidden);

const list = (value) => (Array.isArray(value) ? value : []);
const number = (value, fallback) => (Number.isFinite(+value) && value !== null && value !== '' ? +value : fallback);

// Met en forme les contenus lus dans la base (ou dans la copie de secours). On reste tolérant : un champ oublié
// dans le back office ne doit pas empêcher le site de démarrer.
export function setContent(raw) {
  REGIONS = list(raw.regions).map((r) => ({
    ...r,
    short: r.short || r.name,
    color: r.color || '#1d2b53',
    daysMin: number(r.daysMin, 1),
    daysMax: number(r.daysMax, number(r.daysMin, 1)),
    focus: { lon: number(r.focus?.lon, 118), lat: number(r.focus?.lat, -2.5), dist: number(r.focus?.dist, 10) },
    label: { lon: number(r.label?.lon, number(r.focus?.lon, 118)), lat: number(r.label?.lat, number(r.focus?.lat, -2.5)) },
  }));
  REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

  PLACES = list(raw.places)
    // Une étape sans région connue ou sans position ne peut pas être posée sur la carte.
    .filter((p) => REGION_BY_ID[p.region] && Number.isFinite(+p.lat) && Number.isFinite(+p.lon))
    .map((p) => {
      const todo = list(p.todo);
      // Une photo n'est montrée que si elle est complète (fichier ou adresse, et une vraie légende).
      const gallery = list(p.photos).filter((ph) => (ph.file || ph.url) && ph.caption?.length > 3);
      const hasSpot = Number.isFinite(+p.spot?.lon) && Number.isFinite(+p.spot?.lat);
      return {
        ...p,
        short: p.short || p.name,
        themes: p.themes || '',
        daysMin: number(p.daysMin, 1),
        daysMax: number(p.daysMax, number(p.daysMin, 1)),
        model: p.model || 'palm',
        rank: number(p.rank, 2),
        hidden: !!p.hidden,
        intro: list(p.intro),
        tips: list(p.tips),
        todo,
        photos: gallery.map(photoOf),
        todoImages: todoPhotos(todo, gallery),
        todoCoords: todo.map((t) => (Number.isFinite(t.lat) && Number.isFinite(t.lon) ? [t.lat, t.lon] : null)),
        // « real » garde la vraie position de l'étape, même quand son modèle est déplacé (en mer, par exemple) sur la carte 3D.
        real: { lat: +p.lat, lon: +p.lon },
        lon: hasSpot ? +p.spot.lon : +p.lon,
        lat: hasSpot ? +p.spot.lat : +p.lat,
      };
    });
  PLACE_BY_ID = Object.fromEntries(PLACES.map((p) => [p.id, p]));

  const it = raw.documents?.itineraire || {};
  ITINERARY = {
    title: it.title || "Exemple d'itinéraire",
    facts: it.facts || '',
    summary: list(it.summary),
    // Une étape supprimée depuis ne doit pas casser le tracé.
    stops: list(it.stops).filter((s) => PLACE_BY_ID[s.place]),
    days: list(it.days).map((d) => ({ ...d, place: PLACE_BY_ID[d.place] ? d.place : null })),
    transports: list(it.transports),
    budget: { lines: list(it.budget?.lines), totalLabel: it.budget?.totalLabel || '', total: it.budget?.total || '', note: it.budget?.note || '' },
  };
  const site = raw.documents?.site || {};
  SITE = { title: site.title || 'Indonésie', date: site.date || '', intro: site.intro || '', idrPerEur: number(site.idrPerEur, 20100) || 20100 };
}
