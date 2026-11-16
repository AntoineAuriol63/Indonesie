import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import './style.css';

import { createWorld } from './world/index.js';
import { createFlatWorld } from './world/flat.js';
import { PLACE_BY_ID, REGION_BY_ID, placesOf } from './data/places.js';
import { ITINERARY } from './data/itinerary.js';
import { toast } from './ui/fx.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isMobile = () => matchMedia('(max-width: 860px)').matches;
const days = (min, max) => (min === max ? `${min} jour${min > 1 ? 's' : ''}` : `${min} à ${max} jours`);

// Où l'on se trouve : vue d'ensemble, dans une région, sur une étape, ou dans l'exemple d'itinéraire.
const ui = { region: null, place: null, itinerary: false, started: false };
const itineraryIds = ITINERARY.stops.map((s) => s.place);
let itineraryScroll = 0;

const worldOptions = {
  canvas: $('scene'),
  labelLayer: $('labels'),
  onRegion: (id) => ui.started && openRegion(id),
  onPlace: (id) => ui.started && openPlace(id),
  // Clic sur un élément de la scène détaillée : on montre l'activité correspondante dans la fiche.
  onDetail: (id, match) => {
    if (ui.place !== id) return;
    const todo = [...document.querySelectorAll('#panel .todo')].find((el) => el.querySelector('.todo__name').textContent.startsWith(match));
    if (!todo) return;
    todo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    todo.classList.remove('is-flash');
    void todo.offsetWidth;
    todo.classList.add('is-flash');
  },
};
let world;
try {
  world = createWorld(worldOptions);
} catch (error) {
  // Pas de WebGL sur cet appareil : la carte en relief calculée par le site prend le relais, tout le reste fonctionne à l'identique.
  console.warn('WebGL indisponible, passage au rendu logiciel :', error);
  $('labels').replaceChildren();
  world = createFlatWorld(worldOptions);
  document.body.classList.add('is-flat');
}

// ---------------------------------------------------------------- Fiches

// Tous les prix sont affichés en euros. Les montants en roupies sont convertis à un taux arrondi.
const IDR_PER_EUR = 20100;
function euros(price) {
  if (price.currency === 'EUR') return `${price.amount.toLocaleString('fr-FR')} €`;
  const value = price.amount / IDR_PER_EUR;
  return `environ ${value < 10 ? Math.max(1, Math.round(value)) : Math.round(value)} €`;
}

// Bande de photos qu'on fait défiler.
function gallery(photos) {
  if (!photos.length) return '';
  return `
    <div class="gallery ${photos.length === 1 ? 'gallery--single' : ''}">
      ${photos
        .map(
          (p) => `
        <figure>
          <img src="${esc(p.at(960))}" alt="${esc(p.caption)}" loading="lazy" onerror="this.closest('figure').remove()" />
          <figcaption>${esc(p.caption)}</figcaption>
        </figure>`,
        )
        .join('')}
    </div>`;
}

const fact = (label, value) => (value ? `<div class="fact"><dt>${label}</dt><dd>${esc(value)}</dd></div>` : '');
const TYPE_CLASS = { Culture: 'culture', Nature: 'nature', Mer: 'mer', Randonnée: 'rando', Ville: 'ville', Cuisine: 'cuisine', Faune: 'faune', Détente: 'detente' };

function regionCard(r) {
  const places = placesOf(r.id);
  return `
    <header class="card__head" style="--c:${r.color}">
      <button class="back" data-action="back">‹ Indonésie</button>
      <h2>${esc(r.name)}</h2>
    </header>
    <div class="card__scroll">
      ${gallery(places.map((p) => p.photos[0]).filter(Boolean))}
      <p class="card__text">${esc(r.intro || r.text)}</p>
      <dl class="facts">
        ${fact('En août', r.august)}
        ${fact('Durée', days(r.daysMin, r.daysMax))}
        ${fact('Y aller', r.access)}
      </dl>
      <h3>Les activités</h3>
      <div class="rows">
        ${places
          .map(
            (p) => `
          <button class="row" data-action="place" data-id="${p.id}">
            ${p.photos[0] ? `<img src="${esc(p.photos[0].at(160))}" alt="" loading="lazy" onerror="this.remove()" />` : ''}
            <span class="row__text">
              <span class="row__name">${esc(p.name)}</span>
              <span class="row__meta">${esc(p.themes)} · ${days(p.daysMin, p.daysMax)}</span>
            </span>
          </button>`,
          )
          .join('')}
      </div>
    </div>`;
}

function todoList(p) {
  // Contenu rédigé s'il existe, sinon les activités brutes du tableur.
  const items = p.content
    ? p.content.todo
    : p.activities.map((a) => ({ name: a.name, type: '', text: [a.what, a.conditions].filter(Boolean).join('. '), time: a.duration, price: null }));
  return items
    .map(
      (t) => `
      <div class="todo">
        <div class="todo__head">
          <span class="todo__name">${esc(t.name)}</span>
          ${t.type ? `<span class="tag tag--${TYPE_CLASS[t.type] || 'ville'}">${esc(t.type)}</span>` : ''}
        </div>
        <p>${esc(t.text)}</p>
        ${t.time || t.price ? `<p class="todo__meta">${[t.time && esc(t.time), t.price && `${euros(t.price)} (${esc(t.price.what)})`].filter(Boolean).join(' · ')}</p>` : ''}
      </div>`,
    )
    .join('');
}

function placeCard(p) {
  const r = REGION_BY_ID[p.region];
  const c = p.content;
  const intro = c ? c.intro.map((para) => `<p class="card__text">${esc(para)}</p>`).join('') : `<p class="card__text">${esc(p.text)}</p>`;
  const tips = c ? c.tips : [p.note].filter(Boolean);
  return `
    <header class="card__head" style="--c:${r.color}">
      <button class="back" data-action="back">‹ ${esc(ui.itinerary ? 'Itinéraire' : r.name)}</button>
      <h2>${esc(p.name)}</h2>
    </header>
    <div class="card__scroll">
      ${gallery(p.photos)}
      ${intro}
      <h3>À faire</h3>
      <div class="todos">${todoList(p)}</div>
      <h3>En pratique</h3>
      <dl class="facts">
        ${fact('Durée', days(p.daysMin, p.daysMax))}
        ${fact('Y aller', c ? c.access : p.access)}
        ${tips.length ? `<div class="fact"><dt>À savoir</dt><dd>${tips.map((t) => `<p>${esc(t)}</p>`).join('')}</dd></div>` : ''}
      </dl>
    </div>`;
}

function itineraryCard() {
  const stops = ITINERARY.stops
    .map((s, i) => {
      const p = PLACE_BY_ID[s.place];
      return `
        <button class="stop" data-action="place" data-id="${p.id}" style="--c:${REGION_BY_ID[p.region].color}">
          <span class="stop__n">${i + 1}</span>
          <span class="stop__name">${esc(p.short)}</span>
          <span class="stop__meta">${s.nights} nuit${s.nights > 1 ? 's' : ''}</span>
        </button>`;
    })
    .join('');
  // Un clic sur un jour ouvre la fiche de l'étape concernée ; le bouton retour ramène au programme.
  const dayRows = ITINERARY.days
    .map((d) => {
      const tag = d.place ? 'button' : 'div';
      return `
        <${tag} class="day" ${d.place ? `data-action="day" data-id="${d.place}"` : ''}>
          <span class="day__n">J${d.n}</span>
          <span class="day__body">
            <span class="day__title">${esc(d.title)}</span>
            <span class="day__text">${esc(d.text)}</span>
            ${d.night ? `<span class="day__night">${esc(d.night)}</span>` : ''}
          </span>
        </${tag}>`;
    })
    .join('');
  const b = ITINERARY.budget;
  return `
    <header class="card__head" style="--c:#1d2b53">
      <button class="back" data-action="back">‹ Indonésie</button>
      <h2>${esc(ITINERARY.title)}</h2>
      <p class="card__themes">${esc(ITINERARY.facts)}</p>
    </header>
    <div class="card__scroll">
      ${ITINERARY.summary.map((para) => `<p class="card__text">${esc(para)}</p>`).join('')}
      <h3>Les étapes</h3>
      <div class="stops">${stops}</div>
      <h3>Jour par jour</h3>
      <div class="days">${dayRows}</div>
      <h3>Transports à réserver</h3>
      <div class="transports">${ITINERARY.transports.map((t) => `<p>${esc(t)}</p>`).join('')}</div>
      <h3>Budget</h3>
      <div class="budget">
        ${b.lines.map((l) => `<div class="budget__line"><span>${esc(l.label)}</span><b>${esc(l.amount)}</b></div>`).join('')}
        <div class="budget__line budget__line--total"><span>${esc(b.totalLabel)}</span><b>${esc(b.total)}</b></div>
      </div>
      <p class="card__text">${esc(b.note)}</p>
    </div>`;
}

function render() {
  const panel = $('panel');
  const open = ui.place || ui.region || ui.itinerary;
  panel.classList.toggle('is-open', !!open);
  if (ui.place) panel.innerHTML = placeCard(PLACE_BY_ID[ui.place]);
  else if (ui.itinerary) panel.innerHTML = itineraryCard();
  else if (ui.region) panel.innerHTML = regionCard(REGION_BY_ID[ui.region]);
  panel.scrollTop = 0;
  document.body.classList.toggle('has-panel', !!open);
  document.body.classList.toggle('in-itinerary', ui.itinerary);
  $('itinerary-toggle').textContent = ui.itinerary ? "Quitter l'itinéraire" : "Exemple d'itinéraire";
  $('itinerary-toggle').setAttribute('aria-pressed', ui.itinerary);
  world.setState({ region: ui.region, place: ui.place, itinerary: ui.itinerary ? itineraryIds : null });
  updatePadding();
}

// ---------------------------------------------------------------- Navigation

function updatePadding() {
  const open = ui.place || ui.region || ui.itinerary;
  if (isMobile()) world.setViewPadding({ top: 60, bottom: open ? window.innerHeight * 0.55 : 0 });
  else world.setViewPadding({ top: 60, right: open ? 430 : 0 });
}

const home = () => world.flyTo(118.2, -2.9, 44, { duration: 1.8 });

function flyToItinerary() {
  const pts = itineraryIds.map((id) => PLACE_BY_ID[id]);
  const lons = pts.map((p) => p.lon);
  const lats = pts.map((p) => p.lat);
  const span = Math.max(Math.max(...lons) - Math.min(...lons), (Math.max(...lats) - Math.min(...lats)) * 2.4);
  world.flyTo((Math.max(...lons) + Math.min(...lons)) / 2, (Math.max(...lats) + Math.min(...lats)) / 2, Math.max(5, span * 1.6 + 3), { duration: 1.8 });
}

function openRegion(id) {
  ui.itinerary = false;
  ui.region = id;
  ui.place = null;
  render();
  const f = REGION_BY_ID[id].focus;
  world.flyTo(f.lon, f.lat, f.dist);
}

function openPlace(id) {
  // On retient où l'on en était dans le programme pour y revenir au même endroit.
  if (ui.itinerary && !ui.place) itineraryScroll = document.querySelector('#panel .card__scroll')?.scrollTop || 0;
  ui.place = id;
  if (!ui.itinerary) ui.region = PLACE_BY_ID[id].region;
  render();
  world.focusPlace(id);
}

function back() {
  if (ui.place) {
    ui.place = null;
    render();
    if (ui.itinerary) {
      document.querySelector('#panel .card__scroll').scrollTop = itineraryScroll;
      return flyToItinerary();
    }
    const f = REGION_BY_ID[ui.region].focus;
    return world.flyTo(f.lon, f.lat, f.dist);
  }
  ui.region = null;
  ui.itinerary = false;
  render();
  home();
}

function toggleItinerary() {
  ui.itinerary = !ui.itinerary;
  ui.region = null;
  ui.place = null;
  render();
  if (ui.itinerary) flyToItinerary();
  else home();
}

function start() {
  if (ui.started) return;
  ui.started = true;
  document.body.classList.add('started');
  world.stopIdle();
  home();
  setTimeout(() => $('help').classList.add('is-open'), 1200);
  setTimeout(() => $('help').classList.remove('is-open'), 14000);
}

const handlers = {
  start,
  home: () => {
    ui.region = null;
    ui.place = null;
    ui.itinerary = false;
    render();
    home();
  },
  back,
  place: (el) => openPlace(el.dataset.id),
  day: (el) => openPlace(el.dataset.id),
  itinerary: toggleItinerary,
  zoom: (el) => world.zoom(+el.dataset.factor),
  help: () => $('help').classList.toggle('is-open'),
  'why-2d': () =>
    toast("Ce navigateur n'a pas d'accélération graphique (WebGL) : la carte est dessinée en mode compatibilité, sans rotation de la caméra ni modèles 3D. Pour le rendu complet, activez l'accélération graphique dans les réglages du navigateur."),
};

document.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (!el || el.disabled) return;
  handlers[el.dataset.action]?.(el, event);
});

document.addEventListener('keydown', (event) => {
  if (!ui.started) {
    if (event.key === 'Enter' || event.key === ' ') start();
    return;
  }
  if (event.key === 'Escape' && (ui.place || ui.region || ui.itinerary)) back();
});

window.addEventListener('resize', updatePadding);
render();

// Tout est prêt : on active le bouton de l'écran titre.
document.body.classList.add('ready');
$('start').disabled = false;
$('start').textContent = 'Ouvrir la carte';
$('start-hint').hidden = false;
$('start').focus({ preventScroll: true });

