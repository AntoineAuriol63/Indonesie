// Back office du site : connexion, liste des contenus, éditeurs, enregistrement dans Supabase.
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import './admin.css';

import { access, db } from './api.js';
import { itineraryEditor, placeEditor, regionEditor, settingsEditor } from './editors.js';
import { thumb } from './photos.js';
import { confirmDialog, dialog, fill, h, toast } from './ui.js';

const root = document.getElementById('admin');
const located = (o) => Number.isFinite(o?.lat) && Number.isFinite(o?.lon);
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

// ---------------------------------------------------------------- Contenus chargés

// Un contenu ouvert dans le back office : sa table, son identifiant, la version en cours de modification (data)
// et la dernière version enregistrée (saved), pour savoir s'il reste des modifications à enregistrer.
const docs = new Map();
const key = (table, id) => `${table}/${id}`;
const isDirty = (doc) => JSON.stringify(doc.data) !== doc.saved;
function addDoc(table, row, isNew = false) {
  const doc = { table, id: row.id, data: row.data, position: row.position ?? 0, updatedAt: row.updated_at || null, saved: isNew && table !== 'documents' ? '' : JSON.stringify(row.data), isNew };
  docs.set(key(table, row.id), doc);
  return doc;
}
const byPosition = (a, b) => a.position - b.position || a.id.localeCompare(b.id);
const store = {
  regions: () => [...docs.values()].filter((d) => d.table === 'regions').sort(byPosition).map((d) => ({ ...d.data, id: d.id })),
  region: (id) => docs.get(key('regions', id))?.data,
  places: () => [...docs.values()].filter((d) => d.table === 'etapes').sort(byPosition),
  place: (id) => docs.get(key('etapes', id)),
  placesOf: (regionId) => store.places().filter((d) => d.data.region === regionId),
  rate: () => +docs.get(key('documents', 'site'))?.data.idrPerEur || 20100,
};

// ---------------------------------------------------------------- Accès par code

// Champ pour un code à 4 chiffres : pavé numérique sur téléphone, chiffres masqués.
const codeInput = (label) => {
  const input = h('input', { type: 'password', inputMode: 'numeric', autocomplete: 'off', maxLength: 4, pattern: '[0-9]{4}', required: true, class: 'code', 'aria-label': label });
  input.addEventListener('input', () => (input.value = input.value.replace(/\D/g, '').slice(0, 4)));
  return input;
};

// Formulaire du code : il part tout seul dès que les 4 chiffres sont saisis.
function codeForm(onDone, message) {
  const code = codeInput('Code à 4 chiffres');
  const error = h('p', { class: 'login__error', role: 'alert' }, message || '');
  const form = h('form', { class: 'login' }, code, error);
  let busy = false;
  const submit = async () => {
    if (busy || code.value.length !== 4) return;
    busy = true;
    error.textContent = '';
    try {
      await access.open(code.value);
      onDone();
    } catch (e) {
      if (e.code === 'pas_de_code') return showGate();
      error.textContent = e.message;
      code.value = '';
      code.focus();
    }
    busy = false;
  };
  code.addEventListener('input', submit);
  form.addEventListener('submit', (event) => (event.preventDefault(), submit()));
  return form;
}

// Choix d'un nouveau code, saisi deux fois (première ouverture du back office, ou changement dans les réglages).
function newCodeForm(onDone, label) {
  const first = codeInput('Nouveau code');
  const second = codeInput('Le même code, une seconde fois');
  const error = h('p', { class: 'login__error', role: 'alert' });
  const button = h('button', { class: 'button button--primary', type: 'submit' }, label);
  return h(
    'form',
    {
      class: 'login',
      onsubmit: async (event) => {
        event.preventDefault();
        if (first.value.length !== 4) return (error.textContent = 'Le code doit faire exactement 4 chiffres.');
        if (first.value !== second.value) return (error.textContent = 'Les deux codes ne sont pas identiques.');
        button.disabled = true;
        error.textContent = '';
        try {
          await access.choose(first.value);
          onDone();
        } catch (e) {
          error.textContent = e.message;
          button.disabled = false;
        }
      },
    },
    h('div', { class: 'field' }, h('label', {}, 'Code à 4 chiffres', first)),
    h('div', { class: 'field' }, h('label', {}, 'Encore une fois', second)),
    error,
    button,
  );
}

async function showGate(message) {
  let codeSet = true;
  try {
    codeSet = await access.isCodeSet();
  } catch (error) {
    return showMessage('Back office indisponible', error.message, [h('button', { class: 'button button--primary', onclick: boot }, 'Réessayer')]);
  }
  root.replaceChildren(
    h(
      'div',
      { class: 'gate' },
      h('p', { class: 'gate__logo' }, '🌴'),
      h('h1', {}, 'Back office'),
      codeSet
        ? [h('p', { class: 'gate__sub' }, 'Entrez le code à 4 chiffres.'), codeForm(boot, message)]
        : [h('p', { class: 'gate__sub' }, "Première ouverture : choisissez le code à 4 chiffres qui protégera le back office. Il sera demandé sur chaque nouvel appareil."), newCodeForm(boot, 'Choisir ce code')],
      h('a', { href: '../', class: 'gate__link' }, '‹ Retour au site'),
    ),
  );
  root.querySelector('input').focus();
}
// Session fermée en cours de travail : on redonne le code sans quitter la page, pour ne rien perdre.
const relogin = () =>
  dialog({
    title: 'Back office verrouillé',
    body: (close) => [h('p', {}, 'Redonnez le code pour continuer. Vos modifications en cours sont conservées.'), codeForm(() => close(true))],
    actions: [{ label: 'Annuler', value: false }],
  });
async function guarded(action) {
  try {
    return await action();
  } catch (error) {
    if (error.code === 'session' && (await relogin())) return action();
    throw error;
  }
}

// ---------------------------------------------------------------- Démarrage

async function boot() {
  root.replaceChildren(h('p', { class: 'boot' }, 'Chargement des contenus…'));
  let rows;
  try {
    if (!(await access.check())) return showGate();
    rows = await Promise.all([db.list('regions', 'order=position,id'), db.list('etapes', 'order=position,id'), db.list('documents')]);
  } catch (error) {
    return showMessage('Chargement impossible', error.message, [h('button', { class: 'button button--primary', onclick: boot }, 'Réessayer')]);
  }
  const [regions, places, documents] = rows;
  if (!regions.length && !places.length) return showImport();
  docs.clear();
  regions.forEach((row) => addDoc('regions', row));
  places.forEach((row) => addDoc('etapes', row));
  documents.forEach((row) => addDoc('documents', row));
  // Les deux contenus uniques existent toujours dans le back office, même s'ils n'ont jamais été enregistrés.
  if (!docs.has(key('documents', 'itineraire'))) addDoc('documents', { id: 'itineraire', data: { title: "Exemple d'itinéraire", facts: '', summary: [], stops: [], days: [], transports: [], budget: { lines: [], totalLabel: '', total: '', note: '' } } }, true);
  if (!docs.has(key('documents', 'site'))) addDoc('documents', { id: 'site', data: { title: 'Indonésie', date: 'Août 2027', intro: 'Cliquez sur une région pour voir ses étapes.', idrPerEur: 20100 } }, true);
  renderShell();
  show();
}

function showMessage(title, text, actions = []) {
  root.replaceChildren(h('div', { class: 'gate' }, h('p', { class: 'gate__logo' }, '🌴'), h('h1', {}, title), h('p', { class: 'gate__sub' }, text), h('div', { class: 'gate__actions' }, actions)));
}

// Base vide : on y verse les contenus intégrés au site (la copie de secours).
function showImport() {
  const button = h('button', { class: 'button button--primary' }, 'Importer les contenus du site');
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Import en cours…';
    try {
      const snapshot = (await import('../data/snapshot.json')).default;
      const row = ({ id, ...data }, position) => ({ id, position, data });
      await db.importAll({
        regions: snapshot.regions.map(row),
        etapes: snapshot.places.map(row),
        documents: Object.entries(snapshot.documents).map(([id, data]) => ({ id, data })),
      });
      toast(`Import terminé : ${plural(snapshot.regions.length, 'région')}, ${plural(snapshot.places.length, 'étape')}.`);
      boot();
    } catch (error) {
      toast(error.message, 'error');
      button.disabled = false;
      button.textContent = 'Importer les contenus du site';
    }
  });
  showMessage('La base est vide', "Les contenus actuels du site (régions, étapes, activités, photos, itinéraire) vont être copiés dans la base. C'est à faire une seule fois.", [button]);
}

async function lock() {
  if ([...docs.values()].some(isDirty) && !(await confirmDialog('Verrouiller le back office ?', 'Des modifications ne sont pas enregistrées. Elles seront perdues.', 'Verrouiller'))) return;
  await access.lock();
  docs.clear();
  location.hash = '';
  showGate();
}

// ---------------------------------------------------------------- Mise en page

let main;
let side;
let current = null; // { doc, view, refresh } du contenu affiché
const links = new Map(); // clé du contenu -> son lien dans la liste

const go = (table, id) => (location.hash = id ? `#/${table}/${id}` : `#/${table}`);
function route() {
  const [, table, id] = location.hash.split('/');
  if (table === 'itineraire') return { table: 'documents', id: 'itineraire' };
  if (table === 'reglages') return { table: 'documents', id: 'site' };
  if ((table === 'etapes' || table === 'regions') && id) return { table, id: decodeURIComponent(id) };
  return null;
}

function renderShell() {
  main = h('main', { class: 'main' });
  side = h('nav', { class: 'side', 'aria-label': 'Contenus' });
  root.replaceChildren(
    h(
      'header',
      { class: 'top' },
      h('button', { class: 'top__menu', type: 'button', 'aria-label': 'Afficher la liste des contenus', onclick: () => root.classList.toggle('show-side') }, '☰'),
      h('a', { class: 'top__brand', href: '#/' }, h('span', {}, '🌴'), 'Indonésie', h('small', {}, 'back office')),
      h('span', { class: 'top__space' }),
      h('a', { class: 'button button--ghost', href: '../', target: '_blank', rel: 'noopener' }, 'Voir le site ↗'),
      h('button', { class: 'button button--ghost', type: 'button', title: 'Le code sera redemandé sur cet appareil', onclick: lock }, 'Verrouiller'),
    ),
    h('div', { class: 'layout' }, side, main),
  );
  renderSide();
}

function renderSide(filter = '') {
  links.clear();
  const wanted = filter.trim().toLowerCase();
  const link = (doc, label, href, extra) => {
    const a = h('a', { href, class: 'side__link' }, extra, h('span', { class: 'side__name' }, label), h('span', { class: 'side__dot', title: 'Modifications non enregistrées' }));
    links.set(key(doc.table, doc.id), a);
    a.classList.toggle('is-dirty', isDirty(doc));
    return a;
  };
  const search = h('input', { type: 'search', placeholder: 'Chercher une étape', 'aria-label': 'Chercher une étape', value: filter });
  search.addEventListener('input', () => {
    renderSide(search.value);
    const again = side.querySelector('input[type=search]');
    again.focus();
    again.setSelectionRange(again.value.length, again.value.length);
  });
  const groups = store.regions().map((r) => {
    const places = store.placesOf(r.id).filter((d) => !wanted || d.data.name.toLowerCase().includes(wanted));
    if (wanted && !places.length) return null;
    return h(
      'div',
      { class: 'side__group' },
      link(docs.get(key('regions', r.id)), r.name, `#/regions/${r.id}`, h('span', { class: 'side__color', style: { '--c': r.color } })),
      places.map((d) => link(d, d.data.name || 'Nouvelle étape', `#/etapes/${d.id}`)),
    );
  });
  const orphans = store.places().filter((d) => !store.region(d.data.region));
  fill(
    side,
    h('a', { href: '#/', class: 'side__link side__link--top' }, h('span', { class: 'side__name' }, "Vue d'ensemble")),
    link(docs.get(key('documents', 'itineraire')), "Exemple d'itinéraire", '#/itineraire'),
    link(docs.get(key('documents', 'site')), 'Réglages', '#/reglages'),
    h('div', { class: 'side__head' }, h('h2', {}, 'Régions et étapes'), h('button', { type: 'button', class: 'button button--small', onclick: newPlace }, '+ Étape')),
    search,
    groups,
    orphans.length && h('div', { class: 'side__group' }, h('p', { class: 'side__orphans' }, 'Sans région'), orphans.map((d) => link(d, d.data.name, `#/etapes/${d.id}`))),
  );
  markCurrent();
}
function markCurrent() {
  const now = route();
  for (const [k, a] of links) a.classList.toggle('is-current', !!now && k === key(now.table, now.id));
  side.querySelector('.side__link--top').classList.toggle('is-current', !now);
}

// ---------------------------------------------------------------- Vue d'ensemble

function overview() {
  const places = store.places();
  const count = (fn) => places.reduce((sum, d) => sum + fn(d.data), 0);
  const todo = (p) => p.todo || [];
  const issues = (p) =>
    [
      !(p.photos || []).length && 'pas de photo',
      (p.photos || []).some((ph) => !(ph.caption?.length > 3)) && 'photo sans légende',
      !(p.intro || []).length && "pas d'introduction",
      !todo(p).length && "pas d'activité",
      todo(p).filter((t) => !located(t)).length && `${plural(todo(p).filter((t) => !located(t)).length, 'activité')} sans position`,
      todo(p).some((t) => t.price && !Number.isFinite(+t.price.amount)) && 'prix sans montant',
    ].filter(Boolean);
  const stat = (value, label) => h('div', { class: 'stat' }, h('strong', {}, String(value)), h('span', {}, label));
  main.replaceChildren(
    h('div', { class: 'bar' }, h('div', { class: 'bar__title' }, h('p', { class: 'bar__kind' }, 'Back office'), h('h1', {}, "Vue d'ensemble"))),
    h(
      'div',
      { class: 'stats' },
      stat(store.regions().length, 'régions'),
      stat(places.length, 'étapes'),
      stat(count((p) => todo(p).length), 'activités'),
      stat(count((p) => (p.photos || []).length), 'photos'),
      stat(count((p) => todo(p).filter((t) => !located(t)).length), 'activités sans position'),
    ),
    h(
      'section',
      { class: 'panel' },
      h('h2', {}, 'Toutes les étapes'),
      h('p', { class: 'note' }, 'Cliquez sur une étape pour la modifier. La colonne de droite signale ce qui reste à compléter.'),
      store.regions().map((r) => {
        const list = store.placesOf(r.id);
        return [
          h('h3', { class: 'table__region' }, h('span', { class: 'side__color', style: { '--c': r.color } }), h('a', { href: `#/regions/${r.id}` }, r.name)),
          h(
            'div',
            { class: 'table' },
            list.length
              ? list.map((d) => {
                  const p = d.data;
                  const image = thumb((p.photos || [])[0], 160);
                  return h(
                    'a',
                    { class: 'table__row', href: `#/etapes/${d.id}` },
                    image ? h('img', { src: image, alt: '', loading: 'lazy' }) : h('span', { class: 'table__noimg' }),
                    h('span', { class: 'table__name' }, p.name, p.hidden && h('span', { class: 'chip' }, 'masquée')),
                    h('span', { class: 'table__count' }, `${plural(todo(p).length, 'activité')} · ${plural((p.photos || []).length, 'photo')}`),
                    h('span', { class: 'table__issues' }, issues(p).map((text) => h('span', { class: 'chip chip--warn' }, text))),
                  );
                })
              : h('p', { class: 'list__empty' }, 'Aucune étape.'),
          ),
        ];
      }),
    ),
  );
}

// ---------------------------------------------------------------- Éditeur

function show() {
  root.classList.remove('show-side');
  markCurrent();
  const target = route();
  current = null;
  if (!target) return overview(), window.scrollTo(0, 0);
  const doc = docs.get(key(target.table, target.id));
  if (!doc) {
    main.replaceChildren(h('div', { class: 'panel' }, h('h2', {}, 'Contenu introuvable'), h('p', {}, "Ce contenu n'existe pas ou a été supprimé."), h('a', { class: 'button', href: '#/' }, "Retour à la vue d'ensemble")));
    return;
  }
  const builders = { etapes: placeEditor, regions: regionEditor, documents: doc.id === 'site' ? settingsEditor : itineraryEditor };
  const title = h('h1', {});
  const status = h('span', { class: 'status' });
  const saveButton = h('button', { type: 'button', class: 'button button--primary', onclick: () => save(doc) }, 'Enregistrer');
  const undoButton = h('button', { type: 'button', class: 'button', title: 'Revenir à la dernière version enregistrée', onclick: () => revert(doc) }, 'Annuler');
  const refresh = () => {
    const dirty = isDirty(doc);
    title.textContent = view.title();
    status.textContent = doc.isNew && doc.saved === '' ? 'Pas encore enregistrée' : dirty ? 'Modifications non enregistrées' : 'Enregistré';
    status.classList.toggle('is-dirty', dirty);
    saveButton.disabled = !dirty;
    undoButton.hidden = !dirty || doc.saved === '';
    const a = links.get(key(doc.table, doc.id));
    if (a) {
      a.classList.toggle('is-dirty', dirty);
      if (doc.table !== 'documents') a.querySelector('.side__name').textContent = doc.data.name || 'Sans nom';
    }
  };
  const view = builders[doc.table]({ doc, changed: () => refresh(), store, open: go, remove: () => removePlace(doc), reorder, download, changeCode });
  current = { doc, refresh };
  main.replaceChildren(
    h(
      'div',
      { class: 'bar' },
      h('div', { class: 'bar__title' }, h('p', { class: 'bar__kind' }, view.kind), title),
      h(
        'div',
        { class: 'bar__actions' },
        status,
        undoButton,
        doc.table !== 'documents' || doc.id === 'itineraire' ? h('button', { type: 'button', class: 'button', onclick: () => history(doc) }, 'Historique') : null,
        h('a', { class: 'button', href: view.view, target: '_blank', rel: 'noopener' }, 'Voir sur le site ↗'),
        saveButton,
      ),
      view.nav.length > 1 &&
        h(
          'div',
          { class: 'bar__nav' },
          view.nav.map(([id, label]) => h('button', { type: 'button', onclick: () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, label)),
        ),
    ),
    ...view.sections,
  );
  refresh();
  window.scrollTo(0, 0);
}

async function revert(doc) {
  if (!(await confirmDialog('Annuler les modifications ?', 'Le contenu revient à sa dernière version enregistrée.', 'Annuler les modifications'))) return;
  doc.data = JSON.parse(doc.saved);
  show();
}

// ---------------------------------------------------------------- Enregistrement

// Ce qui empêcherait le site d'afficher correctement le contenu. Renvoie une phrase, ou rien si tout va bien.
function problem(doc) {
  const d = doc.data;
  if (doc.table === 'etapes') {
    if (!d.name?.trim()) return "L'étape n'a pas de nom.";
    if (!store.region(d.region)) return "Choisissez la région de l'étape.";
    if (!located(d)) return "L'étape n'a pas de position (bloc « Positions »).";
    if (d.daysMin > d.daysMax) return 'La durée « au moins » dépasse la durée « au plus ».';
    const unnamed = (d.todo || []).findIndex((t) => !t.name?.trim());
    if (unnamed >= 0) return `L'activité ${unnamed + 1} n'a pas de nom.`;
    const unpriced = (d.todo || []).find((t) => t.price && !Number.isFinite(t.price.amount));
    if (unpriced) return `« ${unpriced.name} » est payante mais n'a pas de montant. Indiquez-le, ou décochez « Activité payante ».`;
  }
  if (doc.table === 'regions' && !d.name?.trim()) return "La région n'a pas de nom.";
  if (doc.id === 'site' && doc.table === 'documents' && !(d.idrPerEur > 0)) return 'Le taux de change doit être un nombre positif.';
  return null;
}

// Petit ménage avant d'enregistrer : espaces en trop, lignes vides, champs facultatifs laissés vides.
function tidy(doc) {
  const d = doc.data;
  const clean = (list) => (list || []).map((s) => String(s).trim()).filter(Boolean);
  if (doc.table === 'etapes') {
    d.name = d.name.trim();
    d.short = (d.short || '').trim() || d.name;
    d.intro = clean(d.intro);
    d.tips = clean(d.tips);
    d.photos = (d.photos || []).filter((ph) => ph.file || ph.url);
    for (const t of d.todo || []) {
      t.name = t.name.trim();
      if (!located(t)) {
        delete t.lat;
        delete t.lon;
      }
      if (!t.price) t.price = null;
    }
    if (!d.hidden) delete d.hidden;
  }
  if (doc.table === 'documents' && doc.id === 'itineraire') {
    d.summary = clean(d.summary);
    d.transports = clean(d.transports);
    for (const day of d.days || []) if (!day.place) delete day.place;
    d.stops = (d.stops || []).filter((s) => s.place);
  }
}

async function save(doc, force = false) {
  const issue = problem(doc);
  if (issue) return toast(issue, 'error');
  tidy(doc);
  try {
    let updatedAt;
    try {
      updatedAt = await guarded(() => db.save(doc.table, doc.id, doc.data, { position: doc.isNew ? doc.position : null, expected: doc.isNew || force ? null : doc.updatedAt }));
    } catch (error) {
      if (error.code !== 'conflit') throw error;
      const again = await confirmDialog(
        'Contenu modifié entre-temps',
        "Ce contenu a été enregistré ailleurs (autre onglet, autre personne) depuis que vous l'avez ouvert. Enregistrer quand même remplace cette autre version par la vôtre ; elle reste dans l'historique.",
        'Enregistrer quand même',
        'primary',
      );
      if (again) return save(doc, true);
      return;
    }
    doc.isNew = false;
    doc.updatedAt = updatedAt;
    doc.saved = JSON.stringify(doc.data);
    current?.refresh();
    toast('Enregistré. Le site affiche la nouvelle version dès son prochain chargement.');
  } catch (error) {
    toast(error.message, 'error');
  }
}

// ---------------------------------------------------------------- Étapes : création, suppression, ordre

const slug = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

async function newPlace() {
  const now = route();
  const data = { name: '', region: now?.table === 'regions' ? now.id : now?.table === 'etapes' ? docs.get(key('etapes', now.id))?.data.region : store.regions()[0]?.id };
  const name = h('input', { type: 'text', placeholder: 'Nom de la nouvelle étape', oninput: (e) => (data.name = e.target.value) });
  const region = h('select', { onchange: (e) => (data.region = e.target.value) }, store.regions().map((r) => h('option', { value: r.id, selected: r.id === data.region }, r.name)));
  setTimeout(() => name.focus(), 50);
  const ok = await dialog({
    title: 'Nouvelle étape',
    body: [
      h('div', { class: 'field' }, h('label', {}, 'Nom', name)),
      h('div', { class: 'field' }, h('label', {}, 'Région', region)),
      h('p', { class: 'note' }, "Une nouvelle étape est posée sur la carte avec un petit modèle 3D au choix. Elle n'a pas de scène 3D détaillée : celles-ci sont dessinées dans le code du site."),
    ],
    actions: [{ label: 'Annuler', value: false }, { label: "Créer l'étape", value: true, kind: 'primary' }],
  });
  if (!ok) return;
  if (!data.name.trim()) return toast("Donnez un nom à l'étape.", 'error');
  let id = slug(data.name) || 'etape';
  for (let n = 2; docs.has(key('etapes', id)); n++) id = `${slug(data.name)}-${n}`;
  const focus = store.region(data.region)?.focus || {};
  addDoc(
    'etapes',
    {
      id,
      position: Math.max(0, ...store.places().map((d) => d.position)) + 1,
      data: { region: data.region, name: data.name.trim(), short: data.name.trim().slice(0, 24), themes: '', daysMin: 1, daysMax: 2, lat: focus.lat ?? -2.5, lon: focus.lon ?? 118, model: 'palm', rank: 2, intro: [], todo: [], access: '', tips: [], photos: [] },
    },
    true,
  );
  renderSide();
  go('etapes', id);
}

async function removePlace(doc) {
  const itinerary = docs.get(key('documents', 'itineraire'))?.data;
  const used = itinerary?.stops?.some((s) => s.place === doc.id) || itinerary?.days?.some((d) => d.place === doc.id);
  const text = `« ${doc.data.name} » sera retirée du site avec ses activités et ses photos.${used ? " Elle fait partie de l'exemple d'itinéraire : elle en sera retirée à l'affichage." : ''}`;
  if (!(await confirmDialog("Supprimer l'étape ?", text, 'Supprimer définitivement'))) return;
  try {
    if (!doc.isNew) await guarded(() => db.remove(doc.id));
    docs.delete(key('etapes', doc.id));
    renderSide();
    toast('Étape supprimée.');
    go('');
  } catch (error) {
    toast(error.message, 'error');
  }
}

// Déplace une étape dans la liste de sa région. Les places sont échangées et enregistrées tout de suite.
async function reorder(regionId, index, delta) {
  const list = store.placesOf(regionId);
  const a = list[index];
  const b = list[index + delta];
  if (!a || !b) return;
  if (a.position === b.position) b.position += delta;
  [a.position, b.position] = [b.position, a.position];
  try {
    for (const doc of [a, b]) {
      if (doc.isNew) continue;
      const updatedAt = await guarded(() => db.move(doc.id, doc.position));
      if (updatedAt) doc.updatedAt = updatedAt;
    }
    renderSide();
  } catch (error) {
    [a.position, b.position] = [b.position, a.position];
    toast(error.message, 'error');
  }
}

// ---------------------------------------------------------------- Historique et sauvegarde

async function history(doc) {
  let versions;
  try {
    versions = doc.isNew ? [] : await guarded(() => db.history(doc.table, doc.id));
  } catch (error) {
    return toast(error.message, 'error');
  }
  const when = (iso) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
  const about = (data) => (doc.table === 'etapes' ? `${plural((data.todo || []).length, 'activité')}, ${plural((data.photos || []).length, 'photo')}` : '');
  const chosen = await dialog({
    title: 'Versions précédentes',
    wide: true,
    body: (close) =>
      versions.length
        ? [
            h('p', { class: 'note' }, "Chaque enregistrement garde la version qu'il remplace. Reprendre une version la recharge dans l'éditeur : elle ne remplace l'actuelle qu'après « Enregistrer »."),
            h(
              'div',
              { class: 'versions' },
              versions.map((v) =>
                h(
                  'div',
                  { class: 'versions__row' },
                  h('span', {}, h('strong', {}, `Version du ${when(v.saved_at)}`), h('small', {}, [v.action === 'suppression' ? 'avant suppression' : 'remplacée ce jour-là', about(v.data)].filter(Boolean).join(' · '))),
                  h('button', { type: 'button', class: 'button', onclick: () => close(v) }, 'Reprendre'),
                ),
              ),
            ),
          ]
        : h('p', {}, "Pas encore de version précédente : ce contenu n'a pas été modifié depuis sa création."),
  });
  if (!chosen) return;
  doc.data = structuredClone(chosen.data);
  show();
  toast('Version reprise. Vérifiez-la, puis enregistrez pour la publier.');
}

// Changement du code depuis les réglages.
const changeCode = () =>
  dialog({
    title: 'Changer le code',
    body: (close) => [
      h('p', {}, 'Le nouveau code sera demandé sur les autres appareils. Celui-ci reste ouvert.'),
      newCodeForm(() => (close(true), toast('Code changé.')), 'Changer le code'),
    ],
    actions: [{ label: 'Annuler', value: false }],
  });

function download() {
  const snapshot = {
    regions: store.regions(),
    places: store.places().map((d) => ({ id: d.id, ...JSON.parse(d.saved || '{}') })),
    documents: Object.fromEntries([...docs.values()].filter((d) => d.table === 'documents').map((d) => [d.id, JSON.parse(d.saved)])),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 1)], { type: 'application/json' }));
  h('a', { href: url, download: `indonesie-contenus-${new Date().toISOString().slice(0, 10)}.json` }).click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------------------------------------------------------------- Événements

addEventListener('hashchange', () => main && show());
addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    if (current && isDirty(current.doc)) save(current.doc);
  }
});
addEventListener('beforeunload', (event) => [...docs.values()].some(isDirty) && event.preventDefault());

boot();
