// Back office du site : lit les contenus dans le dépôt GitHub et les enregistre par l'API « contents ».
// Chaque enregistrement crée un commit sur la branche publiée ; GitHub Pages reconstruit alors le site.
// Aucune dépendance, aucun serveur : la page est un fichier statique copié tel quel dans dist/admin/.
const REPO = 'AntoineAuriol63/Indonesie';
const BRANCH = 'claude/intelligent-hypatia-acu4wn'; // branche publiée par .github/workflows/deploy.yml
const API = `https://api.github.com/repos/${REPO}/contents/`;
const TOKEN_KEY = 'indonesie-admin-token';
const TYPES = ['Culture', 'Nature', 'Mer', 'Randonnée', 'Ville', 'Cuisine', 'Faune', 'Détente'];

const $ = (id) => document.getElementById(id);
function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.filter((c) => c != null));
  return node;
}
function say(text, isError = false) {
  $('status').textContent = text;
  $('status').classList.toggle('error', isError);
}

// ---------------------------------------------------------------- GitHub

// Le jeton reste dans ce navigateur. Sans stockage disponible (navigation privée), il vit le temps de la page.
let memoryToken = '';
function token() {
  try {
    return localStorage.getItem(TOKEN_KEY) || memoryToken;
  } catch {
    return memoryToken;
  }
}
function setToken(value) {
  memoryToken = value;
  try {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // pas de stockage : le jeton reste en mémoire
  }
  $('token-state').textContent = value ? 'mémorisé sur cet appareil' : 'absent (lecture seule)';
}

const ERRORS = {
  401: 'GitHub refuse le jeton : il est faux ou expiré.',
  403: 'GitHub refuse la demande : trop de lectures sans jeton, ou jeton sans le droit « Contents : Read and write » sur ce dépôt.',
  404: 'Introuvable sur GitHub : le fichier manque, ou le jeton ne donne pas accès à ce dépôt.',
  409: "Le fichier a été modifié ailleurs depuis l'ouverture de cette page. Rechargez la page avant de modifier (ce qui n'est pas enregistré sera perdu).",
};
// Lecture (sans corps) ou écriture (avec corps) d'un chemin du dépôt.
async function gh(path, body) {
  const res = await fetch(API + path + (body ? '' : `?ref=${encodeURIComponent(BRANCH)}`), {
    method: body ? 'PUT' : 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/vnd.github+json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
    body: body && JSON.stringify({ ...body, branch: BRANCH }),
  });
  if (res.ok) return res.json();
  throw new Error(ERRORS[res.status] || `Erreur GitHub ${res.status} sur ${path}.`);
}

const fromBase64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));
function toBase64(text) {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
async function readJson(path) {
  const meta = await gh(path);
  const text = fromBase64(meta.content);
  return { path, sha: meta.sha, text, data: JSON.parse(text) };
}
// Même indentation et même fin de fichier qu'à la lecture, pour que le commit ne montre que la modification.
const serialize = (file) => JSON.stringify(file.data, null, file.text.match(/\n( +)/)?.[1].length ?? 2) + (file.text.endsWith('\n') ? '\n' : '');
const isJson = (f) => f.name.endsWith('.json');

// ---------------------------------------------------------------- État

const files = new Map(); // chemin -> fichier chargé
const changed = new Map(); // chemin -> titres des contenus modifiés (pour le message de commit)
const uploads = new Map(); // chemin dans le dépôt -> image à envoyer, en base64
const previews = new Map(); // adresse de la photo dans la fiche -> image locale, tant que le site n'est pas republié
const firstName = new WeakMap(); // activité -> son nom au chargement
const firstNames = new Map(); // id d'étape -> noms des activités au chargement
let entries = [];
let current = null;

function touch() {
  if (!changed.has(current.path)) changed.set(current.path, new Set());
  changed.get(current.path).add(current.title);
  $('save').disabled = false;
  say('Modifications non enregistrées.');
}
// Les positions des activités (src/data/coords/) sont rangées par nom : on retient les noms de départ pour suivre les renommages.
function rememberNames() {
  for (const file of files.values()) {
    for (const [id, place] of Object.entries(file.data.places || {})) {
      firstNames.set(id, place.todo.map((t) => t.name));
      for (const t of place.todo) firstName.set(t, t.name);
    }
  }
}

// ---------------------------------------------------------------- Formulaire

const field = (label, control) => (label ? el('label', { className: 'field' }, el('span', { textContent: label }), control) : control);
const button = (text, title, onclick, disabled = false) => el('button', { type: 'button', textContent: text, title, onclick, disabled });

const RENDER = {
  text(schema, get, set) {
    const input = el(schema.long ? 'textarea' : 'input', { value: get() ?? '' });
    input.oninput = () => {
      set(input.value);
      touch();
    };
    return field(schema.label, input);
  },
  number(schema, get, set) {
    const input = el('input', { type: 'number', value: get() ?? 0 });
    input.oninput = () => {
      set(Number(input.value) || 0);
      touch();
    };
    return field(schema.label, input);
  },
  select(schema, get, set) {
    const select = el('select', {}, ...schema.options().map(([value, label]) => el('option', { value, textContent: label })));
    select.value = get() ?? '';
    select.onchange = () => {
      set(select.value);
      touch();
    };
    return field(schema.label, select);
  },
  object(schema, get) {
    const box = el('div', {}, schema.label ? el('h3', { textContent: schema.label }) : null);
    for (const [key, f] of Object.entries(schema.fields)) {
      box.append(
        render(
          f,
          () => get()[key],
          (value) => {
            // Un champ facultatif vide disparaît du fichier au lieu d'y rester vide.
            if (f.optional && (value === '' || value == null)) delete get()[key];
            else get()[key] = value;
          },
        ),
      );
    }
    return box;
  },
  // Case à cocher qui ajoute ou retire un bloc (prix, photo propre à une activité).
  optional(schema, get, set) {
    const box = el('div');
    const draw = () => {
      const toggle = el('input', { type: 'checkbox', checked: get() != null });
      toggle.onchange = () => {
        set(toggle.checked ? structuredClone(schema.empty) : null);
        touch();
        draw();
      };
      box.replaceChildren(el('label', { className: 'check' }, toggle, schema.label));
      if (get() != null) box.append(render(schema.item, get, set));
    };
    draw();
    return box;
  },
  list(schema, get) {
    const box = el('section');
    const draw = (open = -1) => {
      const items = get();
      const move = (i, step) => {
        items.splice(i + step, 0, ...items.splice(i, 1));
        touch();
        draw();
      };
      box.replaceChildren(el('h3', { textContent: `${schema.label} (${items.length})` }));
      items.forEach((item, i) => {
        const body = render(
          schema.item,
          () => items[i],
          (value) => (items[i] = value),
        );
        const tools = el(
          'span',
          { className: 'tools' },
          button('↑', 'Monter', () => move(i, -1), i === 0),
          button('↓', 'Descendre', () => move(i, 1), i === items.length - 1),
          button('✕', 'Supprimer', () => {
            if (!confirm('Supprimer cet élément ?')) return;
            items.splice(i, 1);
            touch();
            draw();
          }),
        );
        if (!schema.title) return box.append(el('div', { className: 'item row' }, body, tools));
        // Élément long (activité, jour) : replié, avec son titre.
        const title = el('span', { textContent: schema.title(item, i) });
        const details = el('details', { className: 'item', open: i === open }, el('summary', {}, title, tools), body);
        details.addEventListener('input', () => (title.textContent = schema.title(items[i], i)));
        box.append(details);
      });
      box.append(
        button('+ Ajouter', '', () => {
          items.push(structuredClone(schema.empty));
          touch();
          draw(items.length - 1);
        }),
      );
    };
    draw();
    return box;
  },
  photo(schema, get) {
    const box = el('div', { className: 'photo' });
    const draw = () => {
      const ph = get();
      const input = (label, key) => {
        const control = el('input', { value: ph[key] ?? '' });
        control.oninput = () => {
          ph[key] = control.value;
          touch();
        };
        return field(label, control);
      };
      const origin = el('select', {}, el('option', { value: 'commons', textContent: 'Wikimedia Commons' }), el('option', { value: 'url', textContent: 'Adresse web ou fichier envoyé' }));
      origin.value = 'url' in ph ? 'url' : 'commons';
      origin.onchange = () => {
        const caption = ph.caption || '';
        for (const key of Object.keys(ph)) delete ph[key];
        Object.assign(ph, origin.value === 'url' ? { url: '', caption, source: '' } : { file: '', caption, author: '', license: '', licenseUrl: '' });
        touch();
        draw();
      };
      const fields = el('div', {}, input('Légende', 'caption'), field('Origine', origin));
      if ('url' in ph) {
        const send = el('input', { type: 'file', accept: 'image/*' });
        send.onchange = () => send.files[0] && upload(send.files[0], ph).then(draw, (error) => say(error.message, true));
        fields.append(input("Adresse de l'image (https://…)", 'url'), input('Source (site, auteur, licence)', 'source'), field('Ou envoyer une photo depuis cet appareil', send));
      } else {
        const name = input('Nom du fichier sur Commons (ou adresse de sa page)', 'file');
        name.querySelector('input').onchange = () => {
          ph.file = commonsName(ph.file);
          draw();
        };
        fields.append(
          name,
          button('Remplir auteur et licence depuis Commons', '', () => fillFromCommons(ph).then(draw, (error) => say(error.message, true))),
          input('Auteur', 'author'),
          input('Licence', 'license'),
          input('Adresse de la licence', 'licenseUrl'),
        );
      }
      const image = el('img', { alt: '', loading: 'lazy' });
      if (previewOf(ph)) image.src = previewOf(ph);
      box.replaceChildren(image, fields);
      fields.addEventListener('change', () => previewOf(ph) && (image.src = previewOf(ph)));
    };
    draw();
    return box;
  },
};
const render = (schema, get, set) => RENDER[schema.kind](schema, get, set);

// ---------------------------------------------------------------- Photos

function previewOf(ph) {
  if (ph.url) return previews.get(ph.url) || (/^https?:/.test(ph.url) ? ph.url : `../${ph.url}`);
  return ph.file ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(ph.file)}?width=320` : '';
}
// Accepte le nom du fichier, « File:… » ou l'adresse de sa page sur Commons.
function commonsName(value) {
  const name = value.trim().replace(/^.*(?:File|Fichier):/i, '');
  try {
    return decodeURIComponent(name).replace(/_/g, ' ');
  } catch {
    return name.replace(/_/g, ' ');
  }
}
async function fillFromCommons(ph) {
  const query = new URLSearchParams({ action: 'query', titles: `File:${ph.file}`, prop: 'imageinfo', iiprop: 'extmetadata', iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl', format: 'json', origin: '*' });
  const data = await (await fetch(`https://commons.wikimedia.org/w/api.php?${query}`)).json();
  const meta = Object.values(data.query.pages)[0].imageinfo?.[0].extmetadata;
  if (!meta) throw new Error(`Fichier introuvable sur Commons : « ${ph.file} ».`);
  // L'auteur arrive en HTML : on n'en garde que le texte.
  ph.author = new DOMParser().parseFromString(meta.Artist?.value || '', 'text/html').body.textContent.trim();
  ph.license = meta.LicenseShortName?.value || '';
  ph.licenseUrl = meta.LicenseUrl?.value || '';
  touch();
}
// Photo envoyée depuis l'appareil : réduite à 1600 px, rangée dans public/photos/ au prochain enregistrement.
async function upload(file, ph) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Ce navigateur ne sait pas lire cette image. Essayez un fichier JPEG ou PNG.");
  }
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = el('canvas', { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) });
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  ph.url = `photos/${current.id}-${Date.now()}.jpg`;
  ph.source ||= 'Photo personnelle';
  uploads.set(`public/${ph.url}`, dataUrl.split(',')[1]);
  previews.set(ph.url, dataUrl);
  touch();
}

// ---------------------------------------------------------------- Schémas des contenus

const text = (label, more) => ({ kind: 'text', label, ...more });
const PHOTO = { kind: 'photo' };
const NEW_PHOTO = { file: '', caption: '', author: '', license: '', licenseUrl: '' };
let placeOptions = [];

const PLACE = {
  kind: 'object',
  fields: {
    intro: { kind: 'list', label: 'Présentation, 1 ou 2 paragraphes', item: text('', { long: true }), empty: '' },
    todo: {
      kind: 'list',
      label: 'Activités',
      title: (t) => t.name || 'Nouvelle activité',
      empty: { name: '', type: 'Culture', text: '', time: '', price: null },
      item: {
        kind: 'object',
        fields: {
          name: text('Nom'),
          type: { kind: 'select', label: 'Type', options: () => TYPES.map((t) => [t, t]) },
          text: text('Texte', { long: true }),
          time: text('Durée ou moment'),
          price: {
            kind: 'optional',
            label: 'Indiquer un prix',
            empty: { amount: 0, currency: 'IDR', what: '' },
            item: {
              kind: 'object',
              fields: {
                amount: { kind: 'number', label: 'Montant' },
                currency: { kind: 'select', label: 'Devise (le site convertit les roupies en euros)', options: () => [['IDR', 'Roupies (IDR)'], ['EUR', 'Euros (EUR)']] },
                what: text('Ce que couvre ce prix'),
              },
            },
          },
          photo: { kind: 'optional', optional: true, label: 'Donner sa propre photo à cette activité', empty: NEW_PHOTO, item: PHOTO },
        },
      },
    },
    access: text('Accès', { long: true }),
    tips: { kind: 'list', label: 'Conseils', item: text('', { long: true }), empty: '' },
    photos: { kind: 'list', label: 'Galerie, la plus belle en premier', item: PHOTO, empty: NEW_PHOTO },
  },
};
const REGION = { kind: 'object', fields: { intro: text('Présentation', { long: true }), august: text('En août', { long: true }), access: text('Y aller', { long: true }) } };
const ITINERARY = {
  kind: 'object',
  fields: {
    title: text('Titre'),
    facts: text('Sous-titre'),
    summary: { kind: 'list', label: 'Résumé', item: text('', { long: true }), empty: '' },
    stops: {
      kind: 'list',
      label: 'Étapes tracées sur la carte, dans l\'ordre',
      empty: { place: 'jakarta', nights: 1 },
      item: { kind: 'object', fields: { place: { kind: 'select', label: 'Étape', options: () => placeOptions }, nights: { kind: 'number', label: 'Nuits' } } },
    },
    days: {
      kind: 'list',
      label: 'Jours',
      title: (d) => `Jour ${d.n} : ${d.title}`,
      empty: { n: 0, title: '', text: '' },
      item: {
        kind: 'object',
        fields: {
          n: { kind: 'number', label: 'Numéro du jour' },
          title: text('Titre'),
          place: { kind: 'select', optional: true, label: 'Fiche ouverte au clic sur ce jour', options: () => [['', 'Aucune'], ...placeOptions] },
          text: text('Texte', { long: true }),
          night: text('Nuit', { optional: true }),
        },
      },
    },
    transports: { kind: 'list', label: 'Transports à réserver', item: text(''), empty: '' },
    budget: {
      kind: 'object',
      label: 'Budget',
      fields: {
        lines: { kind: 'list', label: 'Lignes', empty: { label: '', amount: '' }, item: { kind: 'object', fields: { label: text('Intitulé'), amount: text('Montant') } } },
        totalLabel: text('Intitulé du total'),
        total: text('Total'),
        note: text('Note', { long: true }),
      },
    },
  },
};

// ---------------------------------------------------------------- Chargement et navigation

async function boot() {
  say('Chargement des contenus…');
  const listing = await gh('src/data/content');
  const [base, itinerary, ...content] = await Promise.all(['src/data/base.json', 'src/data/itinerary.json', ...listing.filter(isJson).map((f) => f.path)].map(readJson));
  for (const file of [itinerary, ...content]) files.set(file.path, file);
  rememberNames();

  // Sanur ne vient pas du tableur (voir EXTRA_PLACES dans src/data/places.js).
  const places = [...base.data.places, { id: 'sanur', region: 'bali', name: 'Sanur' }];
  placeOptions = places.map((p) => [p.id, p.name]);
  entries = [{ id: 'itineraire', group: '', title: "Exemple d'itinéraire", path: itinerary.path, schema: ITINERARY, get: () => itinerary.data }];
  for (const region of base.data.regions) {
    const regionFile = content.find((f) => f.data.regions?.[region.id]);
    if (regionFile) entries.push({ id: region.id, group: region.name, title: `Région ${region.name}`, label: 'Texte de la région', path: regionFile.path, schema: REGION, get: () => regionFile.data.regions[region.id] });
    for (const place of places.filter((p) => p.region === region.id)) {
      const file = content.find((f) => f.data.places?.[place.id]);
      if (file) entries.push({ id: place.id, group: region.name, title: place.name, path: file.path, schema: PLACE, get: () => file.data.places[place.id] });
    }
  }

  const groups = new Map();
  entries.forEach((entry, index) => {
    const option = el('option', { value: index, textContent: entry.label || entry.title });
    if (!entry.group) return $('nav').append(option);
    if (!groups.has(entry.group)) groups.set(entry.group, $('nav').appendChild(el('optgroup', { label: entry.group })));
    groups.get(entry.group).append(option);
  });
  $('nav').onchange = () => open(Number($('nav').value));
  open(0);
  say('');
}

function open(index) {
  current = entries[index];
  $('form').replaceChildren(el('h2', { textContent: current.title }), render(current.schema, current.get));
  scrollTo(0, 0);
}

// ---------------------------------------------------------------- Enregistrement

function problem() {
  for (const path of changed.keys()) {
    for (const [id, place] of Object.entries(files.get(path).data.places || {})) {
      const title = entries.find((e) => e.id === id)?.title || id;
      const names = place.todo.map((t) => t.name.trim());
      if (names.includes('')) return `${title} : une activité n'a pas de nom.`;
      if (new Set(names).size < names.length) return `${title} : deux activités portent le même nom.`;
      for (const ph of [...place.photos, ...place.todo.map((t) => t.photo).filter(Boolean)]) {
        if (!ph.caption?.trim() || !(ph.file || ph.url)) return `${title} : une photo n'a pas de légende, ou pas de fichier ni d'adresse.`;
      }
    }
  }
  return '';
}

// Reporte dans src/data/coords/ les activités renommées ou supprimées, pour que la carte des fiches suive.
async function syncCoords() {
  const renames = {};
  for (const path of changed.keys()) {
    for (const [id, place] of Object.entries(files.get(path).data.places || {})) {
      const now = new Map(place.todo.map((t) => [firstName.get(t), t.name]));
      for (const old of firstNames.get(id) || []) if (now.get(old) !== old) (renames[id] ||= {})[old] = now.get(old);
    }
  }
  if (!Object.keys(renames).length) return;
  for (const item of (await gh('src/data/coords')).filter(isJson)) {
    const file = await readJson(item.path);
    let hit = false;
    for (const [id, map] of Object.entries(renames)) {
      if (!file.data[id]) continue;
      file.data[id] = Object.fromEntries(
        Object.entries(file.data[id]).flatMap(([name, position]) => {
          if (!(name in map)) return [[name, position]];
          hit = true;
          return map[name] ? [[map[name], position]] : [];
        }),
      );
    }
    if (hit) await gh(item.path, { message: 'Back office : positions des activités renommées', content: toBase64(serialize(file)), sha: file.sha });
  }
}

async function save() {
  if (!token()) {
    $('token-box').open = true;
    return say("Pour enregistrer, collez d'abord un jeton GitHub ci-dessous.", true);
  }
  if (problem()) return say(problem(), true);
  $('save').disabled = true;
  say('Enregistrement…');
  try {
    // Les photos envoyées d'abord (seulement celles encore utilisées), puis les positions, puis les textes.
    const texts = [...changed.keys()].map((path) => serialize(files.get(path))).join('');
    for (const [path, content] of uploads) {
      if (texts.includes(path.replace('public/', ''))) await gh(path, { message: `Back office : photo ${path.split('/').pop()}`, content });
      uploads.delete(path);
    }
    await syncCoords();
    for (const [path, titles] of changed) {
      const file = files.get(path);
      const next = serialize(file);
      const result = await gh(path, { message: `Back office : ${[...titles].join(', ')}`, content: toBase64(next), sha: file.sha });
      Object.assign(file, { sha: result.content.sha, text: next });
      changed.delete(path);
    }
    rememberNames();
    say('Enregistré. Le site publié sera à jour dans une à deux minutes.');
  } catch (error) {
    say(error.message, true);
    $('save').disabled = false;
  }
}

$('save').onclick = save;
$('token-save').onclick = () => {
  setToken($('token').value.trim());
  $('token').value = '';
};
$('token-clear').onclick = () => setToken('');
addEventListener('beforeunload', (event) => changed.size && event.preventDefault());
setToken(token());
boot().catch((error) => say(error.message, true));
