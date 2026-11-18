// Carte de l'éditeur d'étape : la position de l'étape et celle de chaque activité, à déplacer à la souris.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { h, toast } from './ui.js';

const located = (o) => Number.isFinite(o?.lat) && Number.isFinite(o?.lon);

export function positionMap({ place, color, form, onMoved }) {
  const box = h('div', { class: 'map' });
  const banner = h('p', { class: 'map__banner', hidden: true });
  const results = h('div', { class: 'map__results' });
  const search = h('input', { type: 'search', placeholder: 'Chercher un lieu (ex. Tirta Empul)', 'aria-label': 'Chercher un lieu sur la carte' });
  const root = h(
    'div',
    { class: 'mapbox' },
    h('form', { class: 'map__search', onsubmit: (e) => (e.preventDefault(), find()) }, search, h('button', { class: 'button', type: 'submit' }, 'Chercher')),
    results,
    banner,
    box,
    h('p', { class: 'field__hint' }, "L'étoile est la position de l'étape, les numéros sont ceux des activités. Tout se déplace à la souris."),
  );

  let map = null;
  let layer = null;
  let placing = null; // activité en attente d'un clic sur la carte
  const pin = (label, className) => L.divIcon({ className: `pin ${className || ''}`, html: `<span style="--c:${color}">${label}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] });

  function draw() {
    if (!map) return;
    layer.clearLayers();
    const moved = (target, marker) => {
      const at = marker.getLatLng();
      target.lat = +at.lat.toFixed(5);
      target.lon = +at.lng.toFixed(5);
      form.changed();
      onMoved();
    };
    if (located(place)) {
      const marker = L.marker([place.lat, place.lon], { icon: pin('★', 'pin--place'), draggable: true, title: "Position de l'étape", zIndexOffset: -100 }).addTo(layer);
      marker.on('dragend', () => moved(place, marker));
    }
    place.todo.forEach((t, i) => {
      if (!located(t)) return;
      const marker = L.marker([t.lat, t.lon], { icon: pin(String(i + 1)), draggable: true, title: t.name }).addTo(layer);
      marker.bindTooltip(t.name || `Activité ${i + 1}`, { direction: 'top', offset: [0, -12] });
      marker.on('dragend', () => moved(t, marker));
    });
  }
  function fit() {
    const points = [place, ...place.todo].filter(located).map((o) => [o.lat, o.lon]);
    if (points.length > 1) map.fitBounds(L.latLngBounds(points).pad(0.25), { maxZoom: 15 });
    else if (points.length) map.setView(points[0], 11);
    else map.setView([-2.5, 118], 5);
  }
  function stopPlacing() {
    placing = null;
    banner.hidden = true;
    box.classList.remove('is-placing');
  }

  // La carte n'est créée qu'une fois visible : Leaflet a besoin de connaître sa taille.
  new IntersectionObserver((entries, observer) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    observer.disconnect();
    map = L.map(box, { scrollWheelZoom: false });
    map.attributionControl.setPrefix(false);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    layer = L.layerGroup().addTo(map);
    map.on('click', (event) => {
      map.scrollWheelZoom.enable();
      if (!placing) return;
      placing.lat = +event.latlng.lat.toFixed(5);
      placing.lon = +event.latlng.lng.toFixed(5);
      stopPlacing();
      form.changed();
      onMoved();
      draw();
    });
    box.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());
    draw();
    fit();
  }).observe(box);

  async function find() {
    const query = search.value.trim();
    if (!query) return;
    results.replaceChildren(h('p', { class: 'field__hint' }, 'Recherche…'));
    try {
      const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q: query, format: 'jsonv2', countrycodes: 'id', limit: '5', 'accept-language': 'fr' })}`;
      const found = await (await fetch(url)).json();
      results.replaceChildren(
        ...(found.length
          ? found.map((r) =>
              h(
                'button',
                {
                  type: 'button',
                  class: 'map__result',
                  onclick: () => {
                    map?.setView([+r.lat, +r.lon], 15);
                    results.replaceChildren();
                  },
                },
                r.display_name,
              ),
            )
          : [h('p', { class: 'field__hint' }, "Rien trouvé en Indonésie pour cette recherche. Essayez un nom plus court, ou le nom local.")]),
      );
    } catch {
      results.replaceChildren();
      toast('La recherche de lieux ne répond pas. Réessayez dans un instant.', 'error');
    }
  }

  root.refresh = draw;
  // Attend un clic sur la carte pour y poser une activité.
  root.place = (activity) => {
    placing = activity;
    banner.textContent = `Cliquez sur la carte à l'endroit de « ${activity.name || 'cette activité'} ». Échap pour annuler.`;
    banner.hidden = false;
    box.classList.add('is-placing');
    root.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  document.addEventListener('keydown', (e) => e.key === 'Escape' && placing && root.isConnected && stopPlacing());
  return root;
}
