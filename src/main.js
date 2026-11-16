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
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

// Où l'on se trouve : vue d'ensemble, dans une région, sur une étape, ou dans l'exemple d'itinéraire.
const ui = { region: null, place: null, itinerary: false, started: false };
const itineraryIds = ITINERARY.stops.map((s) => s.place);

const worldOptions = {
  canvas: $('scene'),
  labelLayer: $('labels'),
  onRegion: (id) => ui.started && openRegion(id),
  onPlace: (id) => ui.started && openPlace(id),
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

function photo(p, small = false) {
  if (!p) return '';
  const license = p.license.split(',')[0];
  const licenseText = license.startsWith('CC') ? license : lower(license);
  return `
    <figure class="photo ${small ? 'photo--small' : ''}">
      <img src="${esc(p.src)}?width=${small ? 480 : 960}" alt="${esc(p.alt)}" loading="lazy" onerror="this.closest('figure').remove()" />
      <figcaption>${esc(p.alt)}. Photo : <a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.author)}</a>, <a href="${esc(p.licenseUrl)}" target="_blank" rel="noopener">${esc(licenseText)}</a>, Wikimedia Commons.</figcaption>
    </figure>`;
}

const fact = (label, value) => (value ? `<div class="fact"><dt>${label}</dt><dd>${esc(value)}</dd></div>` : '');

function price(p) {
  const amount = p.amount.toLocaleString('fr-FR');
  const money = p.currency === 'EUR' ? `${amount} €` : `${amount} ${p.currency}`;
  const unit = p.unit === 'personne' ? ' par personne' : p.unit.startsWith('nuit') ? ` la ${p.unit}` : '';
  const details = [p.includes && `comprend : ${lower(p.includes)}`, p.excludes && `hors : ${lower(p.excludes)}`].filter(Boolean).join(' ; ');
  return `<li><span>${esc(p.label)}</span><b>${money}${unit}</b>${details ? `<small>${esc(details)}</small>` : ''}</li>`;
}

function regionCard(r) {
  const places = placesOf(r.id);
  return `
    <header class="card__head" style="--c:${r.color}">
      <button class="back" data-action="back">‹ Indonésie</button>
      <h2>${esc(r.name)}</h2>
      <p class="card__themes">${esc(r.themes)}</p>
    </header>
    <div class="card__scroll">
      ${photo(r.photo)}
      <p class="card__text">${esc(r.text)}</p>
      <dl class="facts">
        ${fact('En août', r.august)}
        ${fact('Durée', days(r.daysMin, r.daysMax))}
        ${fact('Y aller', r.access)}
        ${fact('Sur place', r.transport)}
        ${fact('À prévoir', r.limits)}
      </dl>
      <h3>Les étapes</h3>
      <div class="rows">
        ${places
          .map(
            (p) => `
          <button class="row" data-action="place" data-id="${p.id}">
            <span class="row__name">${esc(p.name)}</span>
            <span class="row__meta">${esc(p.themes)} · ${days(p.daysMin, p.daysMax)}</span>
          </button>`,
          )
          .join('')}
      </div>
      ${r.reviews
        .map((v) => `<p class="review">Retour d'un voyageur (${esc(lower(v.context))}, ${esc(v.zone)}) : ${esc(lower(v.liked))}. Réserve : ${esc(lower(v.caveat))}.</p>`)
        .join('')}
    </div>`;
}

function placeCard(p) {
  const r = REGION_BY_ID[p.region];
  const activities = p.activities
    .map(
      (a) => `
      <div class="activity">
        <span class="activity__name">${esc(a.name)}</span>
        <span class="activity__what">${esc([a.what, a.duration && lower(a.duration)].filter(Boolean).join(', '))}</span>
        ${a.conditions ? `<span class="activity__note">${esc(a.conditions)}</span>` : ''}
      </div>`,
    )
    .join('');
  return `
    <header class="card__head" style="--c:${r.color}">
      <button class="back" data-action="back">‹ ${esc(ui.itinerary ? 'Itinéraire' : r.name)}</button>
      <h2>${esc(p.name)}</h2>
      <p class="card__themes">${esc(p.themes)}</p>
    </header>
    <div class="card__scroll">
      ${photo(p.photo)}
      <p class="card__text">${esc(p.text)}</p>
      ${activities ? `<h3>À faire</h3><div class="activities">${activities}</div>` : ''}
      <h3>En pratique</h3>
      <dl class="facts">
        ${fact('Durée', days(p.daysMin, p.daysMax))}
        ${fact('Y aller', p.access)}
        ${fact('Effort', p.effort)}
        ${fact('À savoir', p.note)}
      </dl>
      ${p.prices.length ? `<h3>Prix relevés</h3><ul class="prices">${p.prices.map(price).join('')}</ul><p class="hint">Prix relevés en novembre 2026, à revérifier pour août 2027.</p>` : ''}
    </div>`;
}

function itineraryCard() {
  const total = ITINERARY.stops.reduce((n, s) => n + s.days, 0);
  const steps = ITINERARY.stops
    .map((s, i) => {
      const p = PLACE_BY_ID[s.place];
      const leg = ITINERARY.legs[i];
      const next = ITINERARY.stops[i + 1];
      return `
        <button class="stop" data-action="place" data-id="${p.id}" style="--c:${REGION_BY_ID[p.region].color}">
          <span class="stop__n">${i + 1}</span>
          <span class="stop__body">
            <span class="stop__name">${esc(p.name)}</span>
            <span class="stop__meta">${s.days} jour${s.days > 1 ? 's' : ''} · ${esc(p.see)}</span>
            ${p.prices
              .filter((x) => !/^Trans/.test(x.kind))
              .map((x) => `<span class="stop__price">${esc(x.label)} : ${x.amount.toLocaleString('fr-FR')} ${x.currency === 'EUR' ? '€' : x.currency}</span>`).join('')}
          </span>
        </button>
        ${
          next
            ? `<div class="leg">
                <span class="leg__mode">${esc(leg.mode)} vers ${esc(PLACE_BY_ID[next.place].short)}</span>
                <span>Durée : ${leg.duration ? esc(leg.duration) : 'à préciser'}</span>
                <span>Prix : ${leg.price ? esc(leg.price) : 'à préciser'}</span>
              </div>`
            : ''
        }`;
    })
    .join('');
  return `
    <header class="card__head" style="--c:#1d2b53">
      <button class="back" data-action="back">‹ Indonésie</button>
      <h2>${esc(ITINERARY.title)}</h2>
      <p class="card__themes">${ITINERARY.stops.length} étapes · ${total} jours sur place</p>
    </header>
    <div class="card__scroll">
      ${ITINERARY.draft ? '<p class="draft">Exemple provisoire, construit avec les durées et les prix du tableur. Il sera remplacé par le vrai parcours.</p>' : ''}
      <div class="timeline">${steps}</div>
      <p class="hint">Les prix sont ceux relevés dans le tableur, à revérifier pour août 2027.</p>
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
  world.flyTo((Math.max(...lons) + Math.min(...lons)) / 2, (Math.max(...lats) + Math.min(...lats)) / 2, Math.max(5, span * 1.35 + 3), { duration: 1.8 });
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
  ui.place = id;
  if (!ui.itinerary) ui.region = PLACE_BY_ID[id].region;
  render();
  world.focusPlace(id);
}

function back() {
  if (ui.place) {
    ui.place = null;
    render();
    if (ui.itinerary) return flyToItinerary();
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

