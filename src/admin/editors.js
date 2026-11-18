// Formulaires du back office : étape, région, exemple d'itinéraire, réglages.
// Chaque fonction reçoit le contenu ouvert (doc.data, modifié en place) et renvoie les blocs à afficher.
import { todoPhotos } from '../data/places.js';
import { positionMap } from './map.js';
import { photoEditor } from './photos.js';
import { createForm, grid, h, listEditor, note, section, stringList } from './ui.js';

const TYPES = ['Culture', 'Nature', 'Mer', 'Randonnée', 'Ville', 'Cuisine', 'Faune', 'Détente'];
const MODELS = [
  ['palm', 'Palmier'], ['pura', 'Temple balinais'], ['stupa', 'Stupa (Borobudur)'], ['candi', 'Temple de pierre'], ['mosque', 'Mosquée'], ['fort', 'Fort'],
  ['skyline', 'Immeubles'], ['market', 'Marché'], ['bridge', 'Pont'], ['waterfall', 'Cascade'], ['rice', 'Rizières'], ['tea', 'Plantation de thé'],
  ['karst', 'Îlots rocheux'], ['jeep', 'Jeep'], ['surf', 'Surf'], ['snorkel', 'Masque et tuba'], ['fish', 'Poissons'], ['turtle', 'Tortue'],
  ['manta', 'Raie manta'], ['komodo', 'Dragon de Komodo'], ['orangutan', 'Orang-outan'], ['monkey', 'Singe'], ['horse', 'Cheval'],
  ['house-cone', 'Maison conique (Wae Rebo)'], ['house-toraja', 'Maison toraja'], ['house-horn', 'Maison à cornes (Sumatra)'],
  ['house-sumba', 'Maison de Sumba'], ['house-stilt', 'Maison sur pilotis'], ['boat', 'Bateau'], ['plane', 'Avion'],
]; // prettier-ignore

const located = (o) => Number.isFinite(o?.lat) && Number.isFinite(o?.lon);
const samePhoto = (a, b) => a && b && (a.file ? a.file === b.file : !!a.url && a.url === b.url);
export function euros(price, rate) {
  if (!price || !Number.isFinite(+price.amount)) return '';
  if (price.currency === 'EUR') return `${(+price.amount).toLocaleString('fr-FR')} €`;
  const value = price.amount / rate;
  return `environ ${value < 10 ? Math.max(1, Math.round(value)) : Math.round(value)} €`;
}
const chip = (text, kind = '') => h('span', { class: `chip ${kind ? `chip--${kind}` : ''}` }, text);

// ---------------------------------------------------------------- Étape

export function placeEditor({ doc, changed, store, remove }) {
  const p = doc.data;
  for (const key of ['intro', 'todo', 'tips', 'photos']) p[key] ||= [];
  const color = () => store.region(p.region)?.color || '#1d2b53';
  const coordFields = new Set();
  let map;
  let activities;
  // Après une modification : l'éditeur est prévenu tout de suite, la carte et les en-têtes suivent juste après.
  let timer = 0;
  const form = createForm(() => {
    changed();
    clearTimeout(timer);
    timer = setTimeout(() => {
      map.refresh();
      activities.refreshHeads();
    }, 200);
  });

  function activityBody(t) {
    const priceBox = h('div', { class: 'grid' });
    const converted = h('p', { class: 'field__hint field--wide' });
    const drawPrice = () => {
      priceBox.replaceChildren(
        ...(t.price
          ? [
              form.number(t.price, 'amount', 'Montant', { min: 0, step: 'any', half: true }),
              form.select(t.price, 'currency', 'Monnaie', [['IDR', 'Roupies indonésiennes'], ['EUR', 'Euros']], { half: true }),
              form.text(t.price, 'what', 'Ce que le prix comprend', { wide: true, placeholder: 'entrée du site, par personne' }),
              converted,
            ]
          : []),
      );
      showConverted();
    };
    const showConverted = () => {
      converted.textContent = t.price ? `Affiché sur le site : ${euros(t.price, store.rate()) || '…'}${t.price.what ? ` (${t.price.what})` : ''}` : '';
    };
    priceBox.addEventListener('input', showConverted);
    priceBox.addEventListener('change', showConverted);
    const paid = h('input', {
      type: 'checkbox',
      checked: !!t.price,
      onchange: () => {
        t.price = paid.checked ? { amount: null, currency: 'IDR', what: '' } : null;
        drawPrice();
        form.changed();
      },
    });
    drawPrice();

    const coords = form.coords(t, 'Position', { optional: true, half: true, hint: 'Latitude, longitude : à coller depuis Google Maps, ou à poser sur la carte.' });
    coordFields.add(coords);
    const chosen = p.photos.findIndex((ph) => samePhoto(ph, t.photo));
    const photo = h(
      'select',
      {
        onchange: (e) => {
          if (e.target.value === 'auto') delete t.photo;
          else t.photo = { ...p.photos[+e.target.value] };
          form.changed();
        },
      },
      h('option', { value: 'auto' }, 'Automatique (photo dont la légende correspond)'),
      p.photos.map((ph, i) => h('option', { value: i, selected: i === chosen }, `Photo ${i + 1} : ${ph.caption || 'sans légende'}`)),
    );
    return [
      grid(form.text(t, 'name', 'Nom'), form.select(t, 'type', 'Type', TYPES.map((x) => [x, x]), { half: true }), form.text(t, 'time', 'Durée ou horaires', { placeholder: '2 h', half: true })),
      form.area(t, 'text', 'Description', { rows: 3 }),
      h('div', { class: 'field field--wide field--check' }, h('label', {}, paid, h('span', {}, 'Activité payante'))),
      priceBox,
      grid(
        coords,
        h(
          'div',
          { class: 'field field--half field--buttons' },
          h('button', { type: 'button', class: 'button', onclick: () => map.place(t) }, 'Placer sur la carte'),
        ),
      ),
      h('div', { class: 'field field--wide' }, h('label', {}, "Photo de l'activité"), photo),
    ];
  }

  activities = listEditor({
    items: p.todo,
    title: (t) => t.name,
    meta: (t, i) => {
      const image = todoPhotos(p.todo, p.photos.filter((ph) => (ph.file || ph.url) && ph.caption?.length > 3))[i];
      return [
        image && h('img', { class: 'item__thumb', src: image.at(160), alt: '', loading: 'lazy' }),
        t.type && chip(t.type),
        t.price && chip(euros(t.price, store.rate()) || 'prix à compléter'),
        !located(t) && chip('sans position', 'warn'),
      ];
    },
    body: activityBody,
    create: () => ({ name: '', type: 'Nature', text: '', time: '', price: null }),
    addLabel: 'Ajouter une activité',
    removeLabel: 'cette activité',
    empty: "Aucune activité pour le moment.",
    onChange: form.changed,
  });

  const placeCoords = form.coords(p, "Position de l'étape");
  coordFields.add(placeCoords);
  map = positionMap({ place: p, color: color(), form, onMoved: () => coordFields.forEach((f) => f.isConnected && f.refresh()) });

  // Position du modèle 3D, seulement quand elle doit différer de la vraie position.
  const spot = p.spot ? { ...p.spot } : {};
  const spotForm = createForm(() => {
    if (located(spot)) p.spot = { lon: spot.lon, lat: spot.lat };
    else delete p.spot;
    changed();
  });

  return {
    kind: `Étape · ${store.region(p.region)?.name || 'sans région'}`,
    title: () => p.name || 'Nouvelle étape',
    view: `../?etape=${encodeURIComponent(doc.id)}`,
    nav: [['presentation', 'Présentation'], ['activites', 'Activités'], ['photos', 'Photos'], ['pratique', 'En pratique'], ['carte', 'Positions'], ['affichage', 'Carte 3D']],
    sections: [
      section(
        'presentation',
        'Présentation',
        grid(
          form.text(p, 'name', 'Nom'),
          form.select(p, 'region', 'Région', store.regions().map((r) => [r.id, r.name]), { half: true }),
          form.text(p, 'themes', 'Thèmes', { placeholder: 'Culture / paysages', half: true }),
          form.number(p, 'daysMin', 'Durée conseillée, au moins (jours)', { min: 1, half: true }),
          form.number(p, 'daysMax', 'Durée conseillée, au plus (jours)', { min: 1, half: true }),
        ),
        form.paragraphs(p, 'intro', 'Introduction'),
      ),
      section(
        'activites',
        'Activités',
        note("L'ordre est celui de la fiche. Les prix en roupies sont convertis en euros sur le site, au taux fixé dans les réglages."),
        activities,
      ),
      section(
        'photos',
        'Photos',
        note("La première photo représente l'étape dans les listes. La légende dit simplement ce qu'on voit : sans légende, une photo n'est pas affichée."),
        photoEditor({ photos: p.photos, prefix: doc.id, form }),
      ),
      section(
        'pratique',
        'En pratique',
        form.area(p, 'access', 'Y aller', { rows: 2 }),
        h('div', { class: 'field field--wide' }, h('label', {}, 'À savoir'), stringList(p, 'tips', { addLabel: 'Ajouter un conseil', placeholder: 'Un conseil par ligne', onChange: form.changed })),
      ),
      section('carte', 'Positions', grid(placeCoords), map),
      section(
        'affichage',
        'Carte 3D',
        grid(
          form.text(p, 'short', 'Nom court affiché sur la carte', { max: 24 }),
          form.select(p, 'model', 'Petit modèle 3D', MODELS, { half: true }),
          form.select(p, 'rank', 'Visible', [[1, 'Toujours, même de loin'], [2, 'En se rapprochant un peu'], [3, 'De près seulement']], { numeric: true, half: true }),
          spotForm.coords(spot, 'Position du modèle, si elle doit être décalée', {
            optional: true,
            hint: "À remplir seulement si le modèle doit être posé ailleurs que la vraie position (activité en mer, îlot absent de la carte). Sinon, laisser vide.",
          }),
        ),
        form.check(p, 'hidden', "Masquer l'étape sur la carte", { hint: "Elle n'apparaît alors que dans l'exemple d'itinéraire." }),
        note("La scène 3D détaillée d'une étape est dessinée dans le code du site. Ses étiquettes ouvrent l'activité dont le nom commence pareil : après un renommage, l'étiquette reste affichée mais ne mène plus à l'activité."),
      ),
      h(
        'section',
        { class: 'panel panel--danger' },
        h('h2', {}, 'Supprimer'),
        h('p', {}, "L'étape disparaît du site, avec ses activités et ses photos. L'historique en garde une copie."),
        h('button', { type: 'button', class: 'button button--danger', onclick: remove }, 'Supprimer cette étape'),
      ),
    ],
  };
}

// ---------------------------------------------------------------- Région

export function regionEditor({ doc, changed, store, open, reorder }) {
  const r = doc.data;
  r.focus ||= {};
  r.label ||= {};
  const form = createForm(changed);
  const order = h('div', { class: 'order' });
  const drawOrder = () => {
    const places = store.placesOf(doc.id);
    order.replaceChildren(
      ...(places.length
        ? places.map((place, i) =>
            h(
              'div',
              { class: 'order__row' },
              h('span', { class: 'item__n' }, String(i + 1)),
              h('button', { type: 'button', class: 'order__name', onclick: () => open('etapes', place.id) }, place.data.name),
              h('button', { type: 'button', class: 'mini', title: 'Monter', 'aria-label': 'Monter', disabled: i === 0, onclick: () => reorder(doc.id, i, -1).then(drawOrder) }, '↑'),
              h('button', { type: 'button', class: 'mini', title: 'Descendre', 'aria-label': 'Descendre', disabled: i === places.length - 1, onclick: () => reorder(doc.id, i, 1).then(drawOrder) }, '↓'),
            ),
          )
        : [h('p', { class: 'list__empty' }, 'Aucune étape dans cette région.')]),
    );
  };
  drawOrder();
  return {
    kind: 'Région',
    title: () => r.name || 'Région',
    view: '../',
    nav: [['presentation', 'Présentation'], ['etapes', 'Étapes'], ['affichage', 'Carte 3D']],
    sections: [
      section(
        'presentation',
        'Présentation',
        grid(
          form.text(r, 'name', 'Nom'),
          form.text(r, 'short', 'Nom affiché sur la carte', { half: true, max: 24 }),
          form.color(r, 'color', 'Couleur', { half: true }),
          form.number(r, 'daysMin', 'Durée conseillée, au moins (jours)', { min: 1, half: true }),
          form.number(r, 'daysMax', 'Durée conseillée, au plus (jours)', { min: 1, half: true }),
        ),
        form.area(r, 'intro', 'Présentation', { rows: 4 }),
        form.area(r, 'august', 'En août', { rows: 2 }),
        form.area(r, 'access', 'Y aller', { rows: 2 }),
      ),
      section('etapes', 'Étapes de la région', note("L'ordre est celui de la liste affichée sur le site. Il est enregistré tout de suite."), order),
      section(
        'affichage',
        'Carte 3D',
        note("Où la caméra se place quand on ouvre la région, et où son nom est posé sur la vue d'ensemble. Les îles qui appartiennent à la région sont fixées dans le code du site."),
        grid(
          form.number(r.focus, 'lon', 'Caméra : longitude', { step: 'any', half: true }),
          form.number(r.focus, 'lat', 'Caméra : latitude', { step: 'any', half: true }),
          form.number(r.focus, 'dist', 'Caméra : distance (plus grand = vue plus large)', { step: 'any', min: 1, half: true }),
          h('div', { class: 'field field--half' }),
          form.number(r.label, 'lon', 'Nom : longitude', { step: 'any', half: true }),
          form.number(r.label, 'lat', 'Nom : latitude', { step: 'any', half: true }),
        ),
      ),
    ],
  };
}

// ---------------------------------------------------------------- Exemple d'itinéraire

export function itineraryEditor({ doc, changed, store }) {
  const it = doc.data;
  for (const key of ['summary', 'stops', 'days', 'transports']) it[key] ||= [];
  it.budget ||= {};
  it.budget.lines ||= [];
  const form = createForm(changed);
  const placeOptions = () => store.places().map((p) => [p.id, p.data.name]);
  const placeName = (id) => store.place(id)?.data.name || '';
  return {
    kind: 'Itinéraire',
    title: () => it.title || "Exemple d'itinéraire",
    view: '../',
    nav: [['presentation', 'Présentation'], ['etapes', 'Étapes'], ['jours', 'Jour par jour'], ['transports', 'Transports'], ['budget', 'Budget']],
    sections: [
      section('presentation', 'Présentation', grid(form.text(it, 'title', 'Titre'), form.text(it, 'facts', 'Sous-titre', { placeholder: '15 jours à deux, Java puis Bali' })), form.paragraphs(it, 'summary', 'Résumé')),
      section(
        'etapes',
        'Étapes tracées sur la carte',
        note("Dans l'ordre du voyage : le tracé relie ces étapes, numérotées sur la carte."),
        listEditor({
          items: it.stops,
          title: (s) => placeName(s.place) || 'Étape à choisir',
          meta: (s) => chip(`${s.nights || 0} nuit${s.nights > 1 ? 's' : ''}`),
          body: (s) => grid(form.select(s, 'place', 'Étape', placeOptions(), { half: true }), form.number(s, 'nights', 'Nuits', { min: 0, half: true })),
          create: () => ({ place: store.places()[0]?.id || '', nights: 1 }),
          addLabel: 'Ajouter une étape',
          removeLabel: 'cette étape',
          onChange: changed,
        }),
      ),
      section(
        'jours',
        'Jour par jour',
        note("Un clic sur un jour ouvre, sur le site, la fiche de l'étape choisie."),
        listEditor({
          items: it.days,
          numbered: false,
          title: (d) => `J${d.n ?? '?'} · ${d.title || 'Sans titre'}`,
          meta: (d) => d.place && chip(placeName(d.place)),
          body: (d) => [
            grid(
              form.number(d, 'n', 'Jour n°', { min: 1, half: true }),
              form.select(d, 'place', 'Fiche à ouvrir', [['', 'Aucune'], ...placeOptions()], { half: true, optional: true }),
              form.text(d, 'title', 'Titre'),
              form.text(d, 'night', 'Nuit', { placeholder: 'Nuit à Yogyakarta', optional: true }),
            ),
            form.area(d, 'text', 'Programme', { rows: 3 }),
          ],
          create: () => ({ n: (it.days.at(-1)?.n || 0) + 1, title: '', text: '' }),
          addLabel: 'Ajouter un jour',
          removeLabel: 'ce jour',
          onChange: changed,
        }),
      ),
      section('transports', 'Transports à réserver', stringList(it, 'transports', { addLabel: 'Ajouter une ligne', placeholder: 'Un trajet par ligne', onChange: changed })),
      section(
        'budget',
        'Budget',
        listEditor({
          items: it.budget.lines,
          title: (l) => l.label,
          meta: (l) => l.amount && chip(l.amount),
          body: (l) => grid(form.text(l, 'label', 'Poste'), form.text(l, 'amount', 'Montant', { placeholder: 'environ 1 000 €', half: true })),
          create: () => ({ label: '', amount: '' }),
          addLabel: 'Ajouter un poste',
          removeLabel: 'ce poste',
          onChange: changed,
        }),
        grid(form.text(it.budget, 'totalLabel', 'Intitulé du total', { half: true }), form.text(it.budget, 'total', 'Total', { half: true })),
        form.area(it.budget, 'note', 'Remarque', { rows: 2 }),
      ),
    ],
  };
}

// ---------------------------------------------------------------- Réglages

export function settingsEditor({ doc, changed, download, importFile, changeCode }) {
  const s = doc.data;
  const form = createForm(changed);
  return {
    kind: 'Réglages',
    title: () => 'Réglages du site',
    view: '../',
    nav: [],
    sections: [
      section(
        'site',
        'Titre et accueil',
        grid(form.text(s, 'title', 'Titre du site', { max: 14, half: true }), form.text(s, 'date', 'Date affichée sous le titre', { half: true }), form.text(s, 'intro', "Phrase de l'écran d'accueil")),
      ),
      section(
        'prix',
        'Prix',
        grid(
          form.number(s, 'idrPerEur', 'Roupies pour 1 euro', {
            min: 1,
            hint: "Les prix saisis en roupies sont affichés en euros sur le site, arrondis à l'euro, avec ce taux.",
            half: true,
          }),
        ),
      ),
      section(
        'acces',
        "Code d'accès",
        note("Le back office s'ouvre avec un code à 4 chiffres, gardé 60 jours par chaque appareil. Au bout de 5 codes faux, les essais sont bloqués un quart d'heure. Code oublié : la marche à suivre est en tête du fichier docs/supabase.sql."),
        h('button', { type: 'button', class: 'button', onclick: changeCode }, 'Changer le code'),
      ),
      section(
        'sauvegarde',
        'Sauvegarde et import',
        note("Les contenus sont recopiés automatiquement dans le dépôt GitHub deux fois par semaine. On peut aussi en télécharger une copie complète à tout moment."),
        h('button', { type: 'button', class: 'button', onclick: () => download() }, 'Télécharger tous les contenus (fichier JSON)'),
        h('h3', { class: 'panel__sub' }, 'Importer un fichier'),
        note("Pour travailler les contenus dans un fichier : téléchargez-le, modifiez-le, puis importez-le. Il remplace les régions, les étapes, l'itinéraire et les réglages ; une étape absente du fichier est supprimée. Le fichier est vérifié et les changements sont affichés avant toute modification."),
        h('button', { type: 'button', class: 'button', onclick: importFile }, 'Importer un fichier JSON…'),
      ),
    ],
  };
}
