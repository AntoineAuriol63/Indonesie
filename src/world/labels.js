// Textes posés sur la carte : noms des régions (cliquables), étapes, villes et repères géographiques.
// Partagé par la carte 3D et la carte en mode compatibilité, qui fournissent seulement la position à l'écran.
import { CITIES, GEO_LABELS, PLACES, REGIONS, placesOf } from '../data/places.js';

export function createLabels(layer, { onRegion, onPlace, onRegionHover }) {
  const items = [];
  const add = (type, id, lon, lat, tag, className, html, priority) => {
    const el = document.createElement(tag);
    el.className = `lbl ${className}`;
    el.innerHTML = html;
    if (tag === 'button') el.type = 'button';
    layer.appendChild(el);
    const item = { type, id, lon, lat, el, priority, shown: false, hovered: false, selected: false, w: 0, h: 0, sx: 0, sy: 0, onScreen: false };
    items.push(item);
    return item;
  };

  for (const r of REGIONS) {
    const count = placesOf(r.id).length;
    const item = add('region', r.id, r.label.lon, r.label.lat, 'button', 'lbl--region', `${r.short}<small>${count} étape${count > 1 ? 's' : ''}</small>`, 50);
    item.el.style.setProperty('--c', r.color);
    item.el.addEventListener('click', () => onRegion(r.id));
    item.el.addEventListener('pointerenter', () => onRegionHover?.(r.id));
    item.el.addEventListener('pointerleave', () => onRegionHover?.(null));
  }
  for (const p of PLACES) {
    const item = add('place', p.id, p.lon, p.lat, 'button', 'lbl--place', `<span class="lbl__n"></span>${p.short}`, 70 - p.rank);
    item.region = p.region;
    item.hidden = !!p.hidden;
    item.badge = item.el.firstElementChild;
    item.el.addEventListener('click', () => onPlace(p.id));
  }
  for (const c of CITIES) add('city', c.name, c.lon, c.lat, 'span', 'lbl--city', c.name, c.name === 'Jakarta' ? 30 : 20);
  for (const g of GEO_LABELS) add('geo', g.name, g.lon, g.lat, 'span', `lbl--geo lbl--${g.kind}`, g.name, g.kind === 'sea' ? 5 : 10);

  const byId = Object.fromEntries(items.filter((i) => i.type === 'place').map((i) => [i.id, i]));
  const regionItems = items.filter((i) => i.type === 'region');
  // Met en avant le nom d'une région quand on survole son île (et inversement).
  const setHoverRegion = (id) => {
    for (const item of regionItems) item.el.classList.toggle('is-hot', item.id === id);
  };

  function setState({ region, place, itinerary }) {
    for (const item of items) {
      const el = item.el;
      if (item.type === 'region') {
        item.shown = !itinerary && item.id !== region;
        el.classList.toggle('is-dim', !!region);
      } else if (item.type === 'place') {
        const order = itinerary ? itinerary.indexOf(item.id) + 1 : 0;
        item.shown = itinerary ? order > 0 : item.region === region && !item.hidden;
        item.selected = item.id === place;
        item.badge.textContent = order || '';
        el.classList.toggle('is-selected', item.selected);
      } else if (item.type === 'city') {
        // Une ville qui porte le même nom qu'une étape affichée ferait doublon.
        item.shown = !itinerary && !PLACES.some((p) => p.short === item.id && p.region === region);
      } else {
        item.shown = !itinerary;
      }
      item.w = 0;
    }
  }

  // Place les textes par ordre de priorité ; ceux qui en recouvriraient un autre sont masqués.
  const placed = [];
  function layout() {
    placed.length = 0;
    const order = (i) => (i.selected ? 200 : i.hovered ? 150 : i.priority);
    const sorted = items.filter((i) => i.shown && i.onScreen).sort((a, b) => order(b) - order(a));
    for (const item of items) if (!item.shown || !item.onScreen) item.el.style.display = 'none';
    for (const item of sorted) {
      const el = item.el;
      el.style.display = '';
      if (!item.w) {
        item.w = el.offsetWidth;
        item.h = el.offsetHeight;
      }
      const x = item.sx - item.w / 2;
      const y = item.type === 'place' ? item.sy - item.h : item.type === 'city' ? item.sy + 5 : item.sy - item.h / 2;
      const keep = item.selected || item.hovered;
      const hit = !keep && placed.some((p) => x < p.x + p.w + 3 && x + item.w + 3 > p.x && y < p.y + p.h + 2 && y + item.h + 2 > p.y);
      el.classList.toggle('is-hidden', hit);
      el.classList.toggle('is-hovered', item.hovered);
      el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      if (!hit) placed.push({ x, y, w: item.w, h: item.h });
    }
  }

  return { items, byId, setState, setHoverRegion, layout };
}
