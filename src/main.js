import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import './style.css';

import { createWorld } from './world/index.js';
import { DESTINATIONS, DEST_BY_ID, STAT_LABELS, WORLDS, WORLD_BY_ID } from './data/destinations.js';
import { PRESETS } from './data/presets.js';
import { formatHours, getLeg } from './data/legs.js';
import { actions, encodeState, loadedFromLink, state, stopIndex, subscribe, totalNights } from './ui/store.js';
import { sceneSvg } from './ui/art.js';
import { burst, toast } from './ui/fx.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
const isMobile = () => matchMedia('(max-width: 860px)').matches;

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const SEASONS = [
  { label: 'Saison des pluies', icon: '🌧️', cls: 'rain' },
  { label: 'Saison correcte', icon: '⛅', cls: 'ok' },
  { label: 'Saison idéale', icon: '☀️', cls: 'good' },
];
const BUDGETS = ['', 'Petit budget', 'Budget moyen', 'Budget élevé'];

const ui = { selected: null, filter: 'all', tour: null, started: false };
let tourTimer = null;

const world = createWorld({
  canvas: $('scene'),
  labelLayer: $('labels'),
  onSelect: (id) => {
    if (!ui.started) return;
    if (ui.tour) stopTour();
    select(id);
  },
});

const syncWorld = () => world.setState({ selected: ui.selected, stops: state.stops, votes: state.votes });

// ---------------------------------------------------------------- Liste des destinations

function buildList() {
  $('list').innerHTML = `
    <div class="list__head">
      <h2>Destinations</h2>
      <label class="month" title="Quand partez-vous ?">🗓️
        <select id="month-select" aria-label="Mois du voyage">
          <option value="">Quel mois ?</option>
          ${MONTHS.map((m, i) => `<option value="${i}">${m}</option>`).join('')}
        </select>
      </label>
    </div>
    <div class="chips" id="list-filters"></div>
    <div class="list__scroll" id="list-rows"></div>`;
  $('month-select').value = state.month ?? '';
  $('month-select').addEventListener('change', (e) => actions.setMonth(e.target.value === '' ? null : +e.target.value));
}

function renderList() {
  const filters = [
    ['all', 'Toutes'],
    ['loved', '♥ Coups de cœur'],
    ['season', '☀️ De saison'],
  ];
  $('list-filters').innerHTML = filters
    .map(([id, label]) => `<button class="chip ${ui.filter === id ? 'is-on' : ''}" data-action="filter" data-id="${id}">${label}</button>`)
    .join('');

  const keep = (d) => {
    if (ui.filter === 'loved') return !!state.votes[d.id];
    if (ui.filter === 'season') return state.month === null || +d.months[state.month] === 2;
    return true;
  };
  let html = '';
  for (const w of WORLDS) {
    const items = DESTINATIONS.filter((d) => d.world === w.id && keep(d));
    if (!items.length) continue;
    html += `<button class="world" data-action="world" data-id="${w.id}" style="--c:${w.color}"><i></i>${w.name}<span>voir ›</span></button>`;
    for (const d of items) {
      const order = stopIndex(d.id) + 1;
      const v = state.votes[d.id] || '';
      const season = state.month === null ? null : SEASONS[+d.months[state.month]];
      html += `
        <div class="row ${ui.selected === d.id ? 'is-selected' : ''}" data-action="select" data-id="${d.id}" style="--c:${w.color}" role="button" tabindex="0">
          <span class="row__icon">${d.icon}</span>
          <span class="row__text"><b>${d.name}</b><small>${d.type}</small></span>
          ${season ? `<span class="season season--${season.cls}" title="${season.label} en ${MONTHS[state.month].toLowerCase()}">${season.icon}</span>` : ''}
          <span class="row__hearts">${v.includes('a') ? '<i class="heart heart--a">♥</i>' : ''}${v.includes('b') ? '<i class="heart heart--b">♥</i>' : ''}</span>
          <button class="row__add ${order ? 'is-on' : ''}" data-action="toggle-stop" data-id="${d.id}" title="${order ? 'Retirer de l’itinéraire' : 'Ajouter à l’itinéraire'}">${order || '+'}</button>
        </div>`;
    }
  }
  $('list-rows').innerHTML =
    html ||
    `<p class="empty">${ui.filter === 'loved' ? 'Pas encore de coup de cœur. Ouvrez une destination et cliquez sur ♥ !' : 'Aucune destination ne correspond.'}</p>`;
}

// ---------------------------------------------------------------- Fiche destination

function renderDetail() {
  const panel = $('detail');
  const d = DEST_BY_ID[ui.selected];
  panel.classList.toggle('is-open', !!d);
  if (!d) return;
  const w = WORLD_BY_ID[d.world];

  const stats = Object.entries(STAT_LABELS)
    .map(
      ([key, s], i) => `
      <div class="stat">
        <span class="stat__label">${s.icon} ${s.label}</span>
        <span class="stat__pips" aria-label="${d.stats[key]} sur 5">${[1, 2, 3, 4, 5]
          .map((n) => `<i class="${n <= d.stats[key] ? 'is-on' : ''}" style="animation-delay:${0.15 + i * 0.07 + n * 0.05}s"></i>`)
          .join('')}</span>
      </div>`,
    )
    .join('');

  const months = [...d.months]
    .map((r, i) => `<i class="m m--${SEASONS[+r].cls} ${state.month === i ? 'is-current' : ''}" title="${MONTHS[i]} : ${SEASONS[+r].label.toLowerCase()}">${MONTHS[i][0]}</i>`)
    .join('');
  const current = state.month === null ? '' : `<p class="season-note season-note--${SEASONS[+d.months[state.month]].cls}">${SEASONS[+d.months[state.month]].icon} ${SEASONS[+d.months[state.month]].label} en ${MONTHS[state.month].toLowerCase()}</p>`;

  panel.style.setProperty('--c', w.color);
  panel.innerHTML = `
    <button class="close" data-action="close-detail" aria-label="Fermer">✕</button>
    <div class="detail__scroll">
      <div class="banner">
        ${sceneSvg(d.scene)}
        <span class="banner__world">${w.name}</span>
        <span class="banner__icon">${d.icon}</span>
      </div>
      <div class="detail__body">
        <h2>${d.name}</h2>
        <p class="tagline">${d.tagline}</p>
        <div class="tags">
          <span class="tag tag--type">${d.type}</span>
          <span class="tag">Niveau : ${d.level}</span>
          <span class="tag" title="${BUDGETS[d.budget]}">${'€'.repeat(d.budget)}</span>
        </div>
        <div id="detail-votes"></div>
        <p class="desc">${d.description}</p>

        <h3>Statistiques</h3>
        <div class="stats">${stats}</div>

        <h3>Quêtes à ne pas manquer</h3>
        <ul class="quests">${d.highlights.map((h, i) => `<li style="animation-delay:${0.2 + i * 0.06}s">${h}</li>`).join('')}</ul>

        <h3>Infos pratiques</h3>
        <dl class="facts">
          <dt>🌙 Durée conseillée</dt>
          <dd>${d.nights.min === d.nights.max ? plural(d.nights.min, 'nuit') : `${d.nights.min} à ${d.nights.max} nuits`}</dd>
          <dt>☀️ Meilleure saison</dt>
          <dd><div class="months">${months}</div>${current}</dd>
          <dt>💰 Budget</dt>
          <dd>${'€'.repeat(d.budget)} · ${BUDGETS[d.budget]}</dd>
          <dt>🧳 Comment y aller</dt>
          <dd>${d.access}</dd>
        </dl>
        <div class="links">
          <a class="btn btn--small" target="_blank" rel="noopener" href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${d.name} Indonésie`)}">📷 Voir des photos</a>
          <a class="btn btn--small" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lon}">🗺️ Google Maps</a>
        </div>
      </div>
    </div>
    <div class="detail__cta" id="detail-cta"></div>`;
  renderDetailDynamic();
}

function renderDetailDynamic() {
  const d = DEST_BY_ID[ui.selected];
  if (!d || !$('detail-votes')) return;
  const v = state.votes[d.id] || '';
  $('detail-votes').innerHTML = `
    <div class="votes ${v === 'ab' ? 'is-match' : ''}">
      ${['a', 'b']
        .map(
          (p, i) => `
        <span class="vote-wrap">
          <button class="vote vote--${p} ${v.includes(p) ? 'is-on' : ''}" data-action="vote" data-player="${p}" aria-pressed="${v.includes(p)}">
            <span class="vote__heart">♥</span><span>${esc(state.names[i])}</span>
          </button>
          <button class="rename" data-action="rename" data-player="${i}" title="Changer le prénom">✏️</button>
        </span>`,
        )
        .join('')}
      ${v === 'ab' ? '<p class="match">💞 Coup de cœur commun !</p>' : ''}
    </div>`;

  const index = stopIndex(d.id);
  $('detail-cta').innerHTML =
    index < 0
      ? `<button class="btn btn--mint btn--big" data-action="add-stop" data-id="${d.id}">＋ Ajouter à l’itinéraire <small>${plural(d.nights.ideal, 'nuit')}</small></button>`
      : `<div class="cta-row">
          <span class="cta-order">Étape ${index + 1}</span>
          <div class="stepper">
            <button data-action="nights" data-id="${d.id}" data-delta="-1" aria-label="Une nuit de moins">−</button>
            <b>${plural(state.stops[index].nights, 'nuit')}</b>
            <button data-action="nights" data-id="${d.id}" data-delta="1" aria-label="Une nuit de plus">+</button>
          </div>
          <button class="btn btn--ghost btn--small" data-action="remove-stop" data-id="${d.id}">Retirer</button>
        </div>`;
}

// ---------------------------------------------------------------- Barre d'itinéraire

function renderDock() {
  const previousScroll = $('dock-stops')?.scrollLeft ?? 0;
  const nights = totalNights();
  const over = nights - state.days;
  let hours = 0;
  let stopsHtml = '';
  state.stops.forEach((s, i) => {
    const d = DEST_BY_ID[s.id];
    if (i > 0) {
      const leg = getLeg(state.stops[i - 1].id, s.id);
      hours += leg.hours;
      stopsHtml += `<button class="leg ${leg.hours >= 8 ? 'leg--long' : ''}" data-action="leg" data-from="${state.stops[i - 1].id}" data-to="${s.id}" title="${esc(leg.label)}"><span>${leg.icon}</span><small>${formatHours(leg.hours)}</small></button>`;
    }
    stopsHtml += `
      <div class="stop ${ui.selected === s.id ? 'is-selected' : ''}" style="--c:${WORLD_BY_ID[d.world].color}">
        <button class="stop__main" data-action="select" data-id="${s.id}">
          <span class="stop__order">${i + 1}</span><span class="stop__icon">${d.icon}</span><span class="stop__name">${d.name}</span>
        </button>
        <div class="stop__controls">
          <button class="mini" data-action="move" data-id="${s.id}" data-delta="-1" ${i === 0 ? 'disabled' : ''} title="Avancer dans l’itinéraire">‹</button>
          <div class="stepper stepper--small">
            <button data-action="nights" data-id="${s.id}" data-delta="-1" aria-label="Une nuit de moins">−</button>
            <b>${s.nights} n.</b>
            <button data-action="nights" data-id="${s.id}" data-delta="1" aria-label="Une nuit de plus">+</button>
          </div>
          <button class="mini" data-action="move" data-id="${s.id}" data-delta="1" ${i === state.stops.length - 1 ? 'disabled' : ''} title="Reculer dans l’itinéraire">›</button>
          <button class="mini mini--x" data-action="remove-stop" data-id="${s.id}" title="Retirer">✕</button>
        </div>
      </div>`;
  });

  const meta = !state.stops.length
    ? 'Aucune étape pour l’instant'
    : over > 0
      ? `⚠️ ${plural(over, 'nuit')} de trop`
      : over === 0
        ? '✅ Complet'
        : `Reste ${plural(-over, 'nuit')}`;

  $('dock').innerHTML = `
    <div class="dock__summary">
      <div class="dock__title">🧭 Notre itinéraire
        <button class="mini mini--x" data-action="clear" title="Vider l’itinéraire" ${state.stops.length ? '' : 'disabled'}>🗑</button>
      </div>
      <div class="dock__days">
        <div class="stepper stepper--small" title="Durée totale du voyage">
          <button data-action="days" data-delta="-1" aria-label="Un jour de moins">−</button>
          <b>${state.days} jours</b>
          <button data-action="days" data-delta="1" aria-label="Un jour de plus">+</button>
        </div>
        <span class="dock__count ${over > 0 ? 'is-over' : ''}">${nights}/${state.days}</span>
      </div>
      <div class="meter ${over > 0 ? 'is-over' : ''}"><i style="width:${Math.min(100, (nights / state.days) * 100)}%"></i></div>
      <div class="dock__meta">${meta}${hours ? ` · ${formatHours(hours, { total: true })} de trajet` : ''}</div>
    </div>
    <div class="dock__stops" id="dock-stops">
      ${
        stopsHtml ||
        `<p class="dock__empty">Cliquez sur une destination puis sur <b>＋ Ajouter</b>, ou piochez dans les <button class="link" data-action="presets">✨ idées d’itinéraires</button>.</p>`
      }
    </div>
    <div class="dock__actions">
      <button class="btn btn--sun btn--small" data-action="presets">✨ Idées</button>
      <button class="btn btn--sky btn--small" data-action="tour">🎬 Visite guidée</button>
      <button class="btn btn--small" data-action="share">🔗 Partager</button>
    </div>`;
  $('dock-stops').scrollLeft = previousScroll;
}

// ---------------------------------------------------------------- Idées d'itinéraires

function openPresets() {
  const cards = PRESETS.map((p) => {
    const nights = p.stops.reduce((n, s) => n + s[1], 0);
    return `
      <button class="preset" data-action="load-preset" data-id="${p.id}">
        <span class="preset__icon">${p.icon}</span>
        <span class="preset__name">${p.name}</span>
        <span class="preset__nights">${nights} nuits · ${p.stops.length} étapes</span>
        <span class="preset__pitch">${p.pitch}</span>
        <span class="preset__route">${p.stops.map(([id]) => `<i style="--c:${WORLD_BY_ID[DEST_BY_ID[id].world].color}">${DEST_BY_ID[id].icon} ${DEST_BY_ID[id].name}</i>`).join('<b>›</b>')}</span>
      </button>`;
  }).join('');
  $('modal').innerHTML = `
    <div class="modal__backdrop" data-action="close-modal"></div>
    <div class="modal__card panel" role="dialog" aria-modal="true" aria-label="Idées d’itinéraires">
      <button class="close" data-action="close-modal" aria-label="Fermer">✕</button>
      <h2>✨ Idées d’itinéraires</h2>
      <p class="modal__intro">Des points de départ à personnaliser à deux. Charger une idée remplace l’itinéraire en cours.</p>
      <div class="presets">${cards}</div>
    </div>`;
  $('modal').hidden = false;
}
const closeModal = () => {
  $('modal').hidden = true;
  $('modal').innerHTML = '';
};

// ---------------------------------------------------------------- Caméra

function updatePadding() {
  if (isMobile()) world.setViewPadding({ top: 60, bottom: ui.selected ? window.innerHeight * 0.55 : 130 });
  else world.setViewPadding({ top: 70, left: ui.tour ? 0 : 300, right: ui.selected ? 410 : 0, bottom: 150 });
}

const home = () => world.flyTo(116.5, -5.2, 27, { duration: 2 });

function flyToStops() {
  if (!state.stops.length) return home();
  const ds = state.stops.map((s) => DEST_BY_ID[s.id]);
  const lons = ds.map((d) => d.lon);
  const lats = ds.map((d) => d.lat);
  const lonSpan = Math.max(...lons) - Math.min(...lons);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const span = Math.max(lonSpan, latSpan * 2.4);
  world.flyTo((Math.max(...lons) + Math.min(...lons)) / 2, (Math.max(...lats) + Math.min(...lats)) / 2, Math.max(5, span * 1.35 + 3), { duration: 1.8 });
}

function select(id, { fly = true } = {}) {
  ui.selected = id;
  document.body.classList.toggle('has-detail', !!id);
  document.body.classList.remove('list-open');
  renderDetail();
  renderList();
  renderDock();
  syncWorld();
  updatePadding();
  if (id && fly) world.focusDestination(id);
  document.querySelector('.stop.is-selected')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
}

// ---------------------------------------------------------------- Visite guidée

function renderTour() {
  const bar = $('tourbar');
  bar.classList.toggle('is-open', !!ui.tour);
  if (!ui.tour) {
    bar.innerHTML = '';
    return;
  }
  const { index, ids, playing } = ui.tour;
  bar.innerHTML = `
    <div class="tourbar__inner">
      <span class="tourbar__title">🎬 ${state.stops.length >= 2 ? 'Notre itinéraire' : 'Tour d’horizon'}</span>
      <button class="mini" data-action="tour-prev" aria-label="Précédent">◀</button>
      <b>${index + 1} / ${ids.length}</b>
      <button class="mini" data-action="tour-next" aria-label="Suivant">▶</button>
      <button class="mini" data-action="tour-play" aria-label="${playing ? 'Pause' : 'Lecture'}">${playing ? '❚❚' : '▶'}</button>
      <button class="mini mini--x" data-action="tour-stop" aria-label="Quitter la visite">✕</button>
      ${playing ? '<i class="tourbar__progress"></i>' : ''}
    </div>`;
}

const TOUR_STEP_MS = 10000;
function showTourStep() {
  clearTimeout(tourTimer);
  select(ui.tour.ids[ui.tour.index]);
  renderTour();
  if (ui.tour.playing) tourTimer = setTimeout(() => tourGo(1), TOUR_STEP_MS);
}
function tourGo(delta) {
  const n = ui.tour.ids.length;
  ui.tour.index = (ui.tour.index + delta + n) % n;
  showTourStep();
}
function startTour() {
  ui.tour = { index: 0, playing: true, ids: state.stops.length >= 2 ? state.stops.map((s) => s.id) : DESTINATIONS.map((d) => d.id) };
  document.body.classList.add('is-touring');
  showTourStep();
}
function stopTour() {
  clearTimeout(tourTimer);
  ui.tour = null;
  document.body.classList.remove('is-touring');
  renderTour();
  updatePadding();
}

// ---------------------------------------------------------------- Actions

function start() {
  if (ui.started) return;
  ui.started = true;
  document.body.classList.add('started');
  world.stopIdle();
  if (state.stops.length) flyToStops();
  else home();
  if (loadedFromLink) setTimeout(() => toast('Itinéraire partagé chargé !', '🔗'), 900);
}

async function share() {
  const url = `${location.origin}${location.pathname}#p=${encodeState(state)}`;
  try {
    await navigator.clipboard.writeText(url);
    toast('Lien copié ! Il contient l’itinéraire et les coups de cœur.', '🔗');
  } catch {
    prompt('Copiez ce lien pour partager l’itinéraire :', url);
  }
}

const PHASE_INFO = {
  1: ['Niveau 1 — Rêver : explorez, votez, composez l’itinéraire.', '🌴'],
  2: ['Niveau 2 — Planifier : hôtels, activités et budget jour par jour. À débloquer une fois l’itinéraire choisi !', '🔒'],
  3: ['Niveau 3 — Partager : journal de bord, photos et messages pour la famille et les amis. Bientôt !', '🔒'],
};

const handlers = {
  start,
  home: () => {
    if (ui.tour) stopTour();
    select(null);
    home();
  },
  phase: (el) => toast(...PHASE_INFO[el.dataset.phase]),
  zoom: (el) => world.zoom(+el.dataset.factor),
  'toggle-list': () => document.body.classList.toggle('list-open'),
  filter: (el) => {
    if (el.dataset.id === 'season' && state.month === null) {
      toast('Choisissez d’abord le mois du voyage, juste au-dessus.', '🗓️');
      $('month-select').focus();
      return;
    }
    ui.filter = el.dataset.id;
    renderList();
  },
  world: (el) => {
    const f = WORLD_BY_ID[el.dataset.id].focus;
    if (isMobile()) document.body.classList.remove('list-open');
    world.flyTo(f.lon, f.lat, f.dist);
  },
  select: (el) => {
    if (ui.tour) stopTour();
    select(el.dataset.id);
  },
  'close-detail': () => {
    if (ui.tour) stopTour();
    select(null);
  },
  'toggle-stop': (el) => (stopIndex(el.dataset.id) >= 0 ? actions.removeStop(el.dataset.id) : addStop(el.dataset.id, el)),
  'add-stop': (el) => addStop(el.dataset.id, el),
  'remove-stop': (el) => actions.removeStop(el.dataset.id),
  nights: (el) => actions.setNights(el.dataset.id, +el.dataset.delta),
  move: (el) => actions.moveStop(el.dataset.id, +el.dataset.delta),
  days: (el) => actions.setDays(+el.dataset.delta),
  vote: (el) => {
    const result = actions.toggleVote(ui.selected, el.dataset.player);
    if (result === 'ab') {
      const r = $('detail-votes').getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, { count: 36, emoji: '💖' });
    }
  },
  rename: (el) => {
    const i = +el.dataset.player;
    const name = prompt(`Prénom du joueur ${i + 1} :`, state.names[i]);
    if (name) actions.setName(i, name);
  },
  leg: (el) => {
    const leg = getLeg(el.dataset.from, el.dataset.to);
    toast(`${DEST_BY_ID[el.dataset.from].name} → ${DEST_BY_ID[el.dataset.to].name} : ${leg.label}, ${formatHours(leg.hours)} porte à porte (${leg.km} km à vol d’oiseau).`, leg.icon);
  },
  presets: openPresets,
  'close-modal': closeModal,
  'load-preset': (el) => {
    const preset = PRESETS.find((p) => p.id === el.dataset.id);
    if (state.stops.length && !confirm(`Remplacer l’itinéraire en cours par « ${preset.name} » ?`)) return;
    closeModal();
    if (ui.tour) stopTour();
    actions.setStops(preset.stops);
    select(null);
    flyToStops();
    toast(`« ${preset.name} » chargé. À vous de l’ajuster !`, preset.icon);
  },
  share,
  clear: () => {
    if (confirm('Vider tout l’itinéraire ?')) actions.setStops([]);
  },
  tour: startTour,
  'tour-prev': () => tourGo(-1),
  'tour-next': () => tourGo(1),
  'tour-play': () => {
    ui.tour.playing = !ui.tour.playing;
    showTourStep();
  },
  'tour-stop': stopTour,
};

function addStop(id, el) {
  actions.addStop(id);
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, { count: 18, emoji: DEST_BY_ID[id].icon });
}

document.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (!el || el.disabled) return;
  handlers[el.dataset.action]?.(el, event);
});

document.addEventListener('keydown', (event) => {
  if (event.target.matches('input, select, textarea')) return;
  if (!ui.started) {
    if (event.key === 'Enter' || event.key === ' ') start();
    return;
  }
  if (event.key === 'Escape') {
    if (!$('modal').hidden) closeModal();
    else if (ui.tour) stopTour();
    else if (ui.selected) select(null);
  } else if (ui.tour && event.key === 'ArrowRight') tourGo(1);
  else if (ui.tour && event.key === 'ArrowLeft') tourGo(-1);
  else if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.row')) {
    event.preventDefault();
    select(event.target.dataset.id);
  }
});

subscribe((what) => {
  renderDock();
  renderList();
  if (what === 'settings' || what === 'all') renderDetail();
  else renderDetailDynamic();
  syncWorld();
});

window.addEventListener('resize', updatePadding);
$('scene').addEventListener('pointerdown', () => document.body.classList.remove('list-open'));

buildList();
renderList();
renderDock();
syncWorld();
updatePadding();
