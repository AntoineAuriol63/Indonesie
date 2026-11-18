import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import './style.css';

import { createWorld } from './world/index.js';
import { createFlatWorld } from './world/flat.js';
import { loadContent } from './data/load.js';
import { ITINERARY, PLACE_BY_ID, REGIONS, REGION_BY_ID, SITE, placesOf, setContent } from './data/places.js';
import { favorites } from './ui/favorites.js';
import { toast } from './ui/fx.js';
import { hideMinimap, showMinimap } from './ui/minimap.js';

// Les contenus (régions, étapes, itinéraire, réglages) sont lus dans la base avant de construire la carte.
loadContent()
  .then(({ content }) => {
    setContent(content);
    applySiteSettings();
    startApp();
  })
  .catch((error) => {
    console.error(error);
    window.showBootError?.(error.message);
  });

// Titre, date et phrase d'accueil viennent des réglages du site.
function applySiteSettings() {
  document.title = [SITE.title, SITE.date.toLowerCase()].filter(Boolean).join(', ');
  document.querySelector('.brand__text strong').textContent = SITE.title;
  document.querySelector('.brand__text small').textContent = SITE.date;
  document.querySelector('.intro__kicker').textContent = SITE.date;
  const title = document.querySelector('.intro__title');
  document.querySelector('.intro__sub').textContent = SITE.intro;
  // Le titre est animé lettre par lettre : on n'y touche que s'il a changé, pour ne pas relancer l'animation.
  if (title.textContent.trim() === SITE.title) return;
  title.setAttribute('aria-label', SITE.title);
  title.replaceChildren(
    ...[...SITE.title].map((letter) => {
      const span = document.createElement('span');
      span.textContent = letter;
      return span;
    }),
  );
}

function startApp() {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const isMobile = () => matchMedia('(max-width: 860px)').matches;
  const days = (min, max) => (min === max ? `${min} jour${min > 1 ? 's' : ''}` : `${min} à ${max} jours`);

  // Où l'on se trouve : vue d'ensemble, dans une région, sur une étape, dans l'exemple d'itinéraire ou dans les favoris.
  const ui = { region: null, place: null, itinerary: false, favorites: false, started: false };
  const itineraryIds = ITINERARY.stops.map((s) => s.place);
  // Position dans la liste (programme ou favoris) au moment d'ouvrir une fiche, pour y revenir au même endroit.
  let listScroll = 0;

  const worldOptions = {
    canvas: $('scene'),
    labelLayer: $('labels'),
    onRegion: (id) => ui.started && openRegion(id),
    onPlace: (id) => ui.started && openPlace(id),
    // Clic sur un élément de la scène détaillée : on montre l'activité correspondante dans la fiche.
    onDetail: (id, match) => {
      if (ui.place !== id) return;
      flashTodo([...document.querySelectorAll('#panel .todo')].find((el) => el.querySelector('.todo__name').lastChild.textContent.startsWith(match)));
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

  // Tous les prix sont affichés en euros. Les montants en roupies sont convertis au taux fixé dans les réglages du site.
  function euros(price) {
    if (price.currency === 'EUR') return `${(+price.amount || 0).toLocaleString('fr-FR')} €`;
    const value = price.amount / SITE.idrPerEur;
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

  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
  // Bouton cœur d'une étape : plein si elle est dans les favoris.
  function likeButton(id, className = '') {
    const on = favorites.has(id);
    return `<button class="like ${className}" data-action="like" data-id="${id}" aria-pressed="${on}" aria-label="${on ? 'Retirer des favoris' : 'Ajouter aux favoris'}" title="${on ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${HEART}</button>`;
  }

  function regionCard(r) {
    const places = placesOf(r.id);
    return `
      <header class="card__head" style="--c:${r.color}">
        <button class="back" data-action="back">‹ Indonésie</button>
        <h2>${esc(r.name)}</h2>
      </header>
      <div class="card__scroll">
        ${gallery(places.map((p) => p.photos[0]).filter(Boolean))}
        <p class="card__text">${esc(r.intro)}</p>
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
              ${favorites.has(p.id) ? `<span class="row__like" title="Dans les favoris">${HEART}</span>` : ''}
            </button>`,
            )
            .join('')}
        </div>
      </div>`;
  }

  function todoList(p) {
    return p.todo
      .map(
        (t, i) => `
        <div class="todo" data-n="${i + 1}">
          ${p.todoImages[i] ? `<img class="todo__photo" src="${esc(p.todoImages[i].at(640))}" alt="${esc(p.todoImages[i].caption)}" loading="lazy" onerror="this.remove()" />` : ''}
          <div class="todo__head">
            <span class="todo__name"><span class="todo__n">${i + 1}</span>${esc(t.name)}</span>
            ${t.type ? `<span class="tag tag--${TYPE_CLASS[t.type] || 'ville'}">${esc(t.type)}</span>` : ''}
          </div>
          <p>${esc(t.text)}</p>
          ${t.time || t.price ? `<p class="todo__meta">${[t.time && esc(t.time), t.price && `${euros(t.price)}${t.price.what ? ` (${esc(t.price.what)})` : ''}`].filter(Boolean).join(' · ')}</p>` : ''}
        </div>`,
      )
      .join('');
  }

  function placeCard(p) {
    const r = REGION_BY_ID[p.region];
    const intro = p.intro.map((para) => `<p class="card__text">${esc(para)}</p>`).join('');
    return `
      <header class="card__head" style="--c:${r.color}">
        <button class="back" data-action="back">‹ ${esc(ui.itinerary ? 'Itinéraire' : ui.favorites ? 'Favoris' : r.name)}</button>
        <div class="card__title">
          <h2>${esc(p.name)}</h2>
          ${p.hidden ? '' : likeButton(p.id)}
        </div>
      </header>
      <div class="card__scroll">
        ${gallery(p.photos)}
        ${intro}
        <h3>À faire</h3>
        <div class="todos">${todoList(p)}</div>
        <h3>En pratique</h3>
        <dl class="facts">
          ${fact('Durée', days(p.daysMin, p.daysMax))}
          ${fact('Y aller', p.access)}
          ${p.tips.length ? `<div class="fact"><dt>À savoir</dt><dd>${p.tips.map((t) => `<p>${esc(t)}</p>`).join('')}</dd></div>` : ''}
        </dl>
        <h3>Sur la carte</h3>
        <div class="minimap" id="minimap"></div>
      </div>`;
  }

  // Met en avant une activité dans la fiche ouverte (depuis la scène 3D ou la carte en bas de fiche).
  function flashTodo(todo) {
    if (!todo) return;
    todo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    todo.classList.remove('is-flash');
    void todo.offsetWidth;
    todo.classList.add('is-flash');
  }

  function placeMap(p) {
    const todo = p.todo;
    // Deux activités au même endroit partagent un seul repère, qui porte leurs deux numéros.
    const byPosition = new Map();
    todo.forEach((t, i) => {
      const at = p.todoCoords[i];
      if (!at) return;
      const key = at.join(',');
      const point = byPosition.get(key);
      if (point) {
        point.label += `·${i + 1}`;
        point.name += `, ${t.name}`;
      } else byPosition.set(key, { n: i + 1, label: String(i + 1), name: t.name, lat: at[0], lon: at[1] });
    });
    const points = [...byPosition.values()];
    showMinimap($('minimap'), {
      center: p.real,
      points,
      color: REGION_BY_ID[p.region].color,
      onPick: (n) => flashTodo(document.querySelector(`#panel .todo[data-n="${n}"]`)),
    });
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

  // Les étapes aimées, rangées par région, avec la durée qu'il faudrait pour toutes les faire.
  function favoritesCard() {
    const liked = favorites.list().map((id) => PLACE_BY_ID[id]);
    const head = (sub) => `
      <header class="card__head" style="--c:#ff5d73">
        <button class="back" data-action="back">‹ Indonésie</button>
        <h2>Favoris</h2>
        <p class="card__themes">${sub}</p>
      </header>`;
    if (!liked.length) {
      return `
        ${head('Aucune étape pour le moment')}
        <div class="card__scroll">
          <div class="empty">
            <span class="empty__heart">${HEART}</span>
            <p>Pour garder une étape de côté, ouvrez sa fiche et cliquez sur le cœur à côté de son nom. Elle apparaîtra ici et sur la carte.</p>
            ${favorites.isShared() ? '<p>La liste est la même pour tous ceux qui ouvrent le site.</p>' : ''}
          </div>
        </div>`;
    }
    const min = liked.reduce((sum, p) => sum + p.daysMin, 0);
    const max = liked.reduce((sum, p) => sum + p.daysMax, 0);
    const groups = REGIONS.map((r) => ({ r, places: liked.filter((p) => p.region === r.id) })).filter((g) => g.places.length);
    return `
      ${head(`${liked.length} étape${liked.length > 1 ? 's' : ''} dans ${groups.length} région${groups.length > 1 ? 's' : ''}`)}
      <div class="card__scroll">
        <dl class="facts">
          ${fact('Durée', `${days(min, max)} pour tout faire, sans compter les trajets d'une étape à l'autre`)}
          ${favorites.isShared() ? fact('Liste', 'La même pour tous ceux qui ouvrent le site : chacun peut ajouter ou retirer un cœur.') : ''}
        </dl>
        ${groups
          .map(
            ({ r, places }) => `
          <h3 class="fav-region" style="--c:${r.color}">${esc(r.name)}</h3>
          <div class="rows">
            ${places
              .map(
                (p) => `
              <div class="fav">
                <button class="row" data-action="place" data-id="${p.id}">
                  ${p.photos[0] ? `<img src="${esc(p.photos[0].at(160))}" alt="" loading="lazy" onerror="this.remove()" />` : ''}
                  <span class="row__text">
                    <span class="row__name">${esc(p.name)}</span>
                    <span class="row__meta">${esc(p.themes)} · ${days(p.daysMin, p.daysMax)}</span>
                  </span>
                </button>
                ${likeButton(p.id, 'like--row')}
              </div>`,
              )
              .join('')}
          </div>`,
          )
          .join('')}
      </div>`;
  }

  // Bouton « Favoris » de la barre du haut, avec le nombre d'étapes aimées.
  function updateFavoritesButton() {
    const count = favorites.count();
    const button = $('favorites-toggle');
    button.setAttribute('aria-pressed', ui.favorites);
    button.querySelector('.btn__count').textContent = count || '';
    button.classList.toggle('has-some', count > 0);
  }

  // Ce que la carte doit montrer : en mode itinéraire ou favoris, seulement les étapes concernées.
  function syncWorld() {
    const liked = favorites.list();
    // Une fiche ouverte depuis les favoris se montre comme d'habitude, avec sa scène détaillée et sa région.
    const only = ui.itinerary ? itineraryIds : ui.favorites && !ui.place ? liked : null;
    world.setState({
      region: ui.favorites && ui.place ? PLACE_BY_ID[ui.place].region : ui.region,
      place: ui.place,
      itinerary: only,
      route: ui.itinerary,
      liked,
    });
  }

  function render() {
    const panel = $('panel');
    const open = ui.place || ui.region || ui.itinerary || ui.favorites;
    panel.classList.toggle('is-open', !!open);
    hideMinimap();
    if (ui.place) {
      panel.innerHTML = placeCard(PLACE_BY_ID[ui.place]);
      placeMap(PLACE_BY_ID[ui.place]);
    } else if (ui.itinerary) panel.innerHTML = itineraryCard();
    else if (ui.favorites) panel.innerHTML = favoritesCard();
    else if (ui.region) panel.innerHTML = regionCard(REGION_BY_ID[ui.region]);
    panel.scrollTop = 0;
    document.body.classList.toggle('has-panel', !!open);
    document.body.classList.toggle('in-itinerary', ui.itinerary);
    $('itinerary-toggle').innerHTML = ui.itinerary
      ? `Quitter<span class="wide">&nbsp;l'itinéraire</span>`
      : `<span class="wide">Exemple d'itinéraire</span><span class="narrow">Itinéraire</span>`;
    $('itinerary-toggle').setAttribute('aria-pressed', ui.itinerary);
    updateFavoritesButton();
    syncWorld();
    updatePadding();
  }

  // ---------------------------------------------------------------- Navigation

  function updatePadding() {
    const open = ui.place || ui.region || ui.itinerary || ui.favorites;
    if (isMobile()) world.setViewPadding({ top: 60, bottom: open ? window.innerHeight * 0.55 : 0 });
    else world.setViewPadding({ top: 60, right: open ? 430 : 0 });
  }

  const home = () => world.flyTo(118.2, -2.9, 44, { duration: 1.8 });

  // Cadre un groupe d'étapes (celles de l'itinéraire, ou les favoris).
  function flyToPlaces(ids) {
    if (!ids.length) return home();
    const pts = ids.map((id) => PLACE_BY_ID[id]);
    const lons = pts.map((p) => p.lon);
    const lats = pts.map((p) => p.lat);
    const span = Math.max(Math.max(...lons) - Math.min(...lons), (Math.max(...lats) - Math.min(...lats)) * 2.4);
    world.flyTo((Math.max(...lons) + Math.min(...lons)) / 2, (Math.max(...lats) + Math.min(...lats)) / 2, Math.min(60, Math.max(5, span * 1.6 + 3)), { duration: 1.8 });
  }
  const flyToItinerary = () => flyToPlaces(itineraryIds);

  function openRegion(id) {
    ui.itinerary = false;
    ui.favorites = false;
    ui.region = id;
    ui.place = null;
    render();
    const f = REGION_BY_ID[id].focus;
    world.flyTo(f.lon, f.lat, f.dist);
  }

  function openPlace(id, options) {
    // On retient où l'on en était dans le programme ou les favoris pour y revenir au même endroit.
    if ((ui.itinerary || ui.favorites) && !ui.place) listScroll = document.querySelector('#panel .card__scroll')?.scrollTop || 0;
    ui.place = id;
    if (!ui.itinerary && !ui.favorites) ui.region = PLACE_BY_ID[id].region;
    render();
    world.focusPlace(id, options);
  }

  function back() {
    if (ui.place) {
      ui.place = null;
      render();
      if (ui.itinerary || ui.favorites) {
        document.querySelector('#panel .card__scroll').scrollTop = listScroll;
        return ui.itinerary ? flyToItinerary() : flyToPlaces(favorites.list());
      }
      const f = REGION_BY_ID[ui.region].focus;
      return world.flyTo(f.lon, f.lat, f.dist);
    }
    ui.region = null;
    ui.itinerary = false;
    ui.favorites = false;
    render();
    home();
  }

  function toggleItinerary() {
    ui.itinerary = !ui.itinerary;
    ui.favorites = false;
    ui.region = null;
    ui.place = null;
    render();
    if (ui.itinerary) flyToItinerary();
    else home();
  }

  function toggleFavorites() {
    ui.favorites = !ui.favorites;
    ui.itinerary = false;
    ui.region = null;
    ui.place = null;
    render();
    if (ui.favorites) flyToPlaces(favorites.list());
    else home();
  }

  // Ajoute ou retire une étape des favoris, sans recharger la fiche ouverte.
  function toggleLike(el) {
    const on = favorites.toggle(el.dataset.id);
    if (ui.favorites && !ui.place) {
      // Dans la liste des favoris, l'étape retirée disparaît de la liste et de la carte.
      const scroll = document.querySelector('#panel .card__scroll')?.scrollTop || 0;
      render();
      document.querySelector('#panel .card__scroll').scrollTop = scroll;
      return flyToPlaces(favorites.list());
    }
    el.setAttribute('aria-pressed', on);
    el.setAttribute('aria-label', on ? 'Retirer des favoris' : 'Ajouter aux favoris');
    el.title = on ? 'Retirer des favoris' : 'Ajouter aux favoris';
    el.classList.remove('is-pop');
    void el.offsetWidth;
    if (on) el.classList.add('is-pop');
    updateFavoritesButton();
    if (on) {
      const button = $('favorites-toggle');
      button.classList.remove('is-bump');
      void button.offsetWidth;
      button.classList.add('is-bump');
    }
    syncWorld();
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
      ui.favorites = false;
      render();
      home();
    },
    back,
    place: (el) => openPlace(el.dataset.id),
    day: (el) => openPlace(el.dataset.id),
    itinerary: toggleItinerary,
    favorites: toggleFavorites,
    like: toggleLike,
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
    if (event.key === 'Escape' && (ui.place || ui.region || ui.itinerary || ui.favorites)) back();
  });

  window.addEventListener('resize', updatePadding);
  render();

  // La liste des favoris est commune : elle peut changer pendant la visite (quelqu'un d'autre a mis un cœur),
  // ou un enregistrement peut échouer. On remet alors l'affichage d'accord avec la liste.
  favorites.onChange((failed) => {
    if (failed) toast("Le favori n'a pas pu être enregistré. Vérifiez la connexion, puis réessayez.");
    const scroll = document.querySelector('#panel .card__scroll');
    if (ui.place || (!ui.favorites && !ui.region)) {
      const like = document.querySelector('#panel .card__title .like');
      if (like) like.outerHTML = likeButton(ui.place);
      updateFavoritesButton();
      return syncWorld();
    }
    const top = scroll ? scroll.scrollTop : 0;
    const strip = document.querySelector('#panel .gallery')?.scrollLeft || 0;
    render();
    document.querySelector('#panel .card__scroll').scrollTop = top;
    if (strip) document.querySelector('#panel .gallery').scrollLeft = strip;
  });
  favorites.start((id) => PLACE_BY_ID[id] && !PLACE_BY_ID[id].hidden);

  // Lien direct vers une fiche : https://…/?etape=jakarta ouvre la carte sur cette étape.
  const direct = new URLSearchParams(location.search).get('etape');
  if (direct && PLACE_BY_ID[direct]) {
    start();
    openPlace(direct, { instant: true });
  }

  // Tout est prêt : on active le bouton de l'écran titre.
  document.body.classList.add('ready');
  $('start').disabled = false;
  $('start').textContent = 'Ouvrir la carte';
  $('start-hint').hidden = false;
  $('start').focus({ preventScroll: true });
}
