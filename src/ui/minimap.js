// Vraie carte (fond OpenStreetMap) affichée en bas d'une fiche, avec un repère numéroté par activité localisée.
// Leaflet n'est chargé qu'à l'ouverture de la première fiche.
let leaflet = null;
let current = null;

async function load() {
  if (!leaflet) {
    const [module] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
    leaflet = module.default || module;
  }
  return leaflet;
}

// points : [{ n, label, name, lat, lon }] ; center : { lat, lon } de l'étape, utilisé quand aucun point n'est localisé.
export async function showMinimap(container, { center, points, color, onPick }) {
  const L = await load();
  if (!container.isConnected) return; // la fiche a été refermée entre-temps
  if (current) current.remove();
  const map = L.map(container, { zoomControl: true, scrollWheelZoom: false, attributionControl: true });
  current = map;
  map.attributionControl.setPrefix(false);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);

  const markers = points.map((p) => {
    const icon = L.divIcon({ className: 'pin', html: `<span style="--c:${color}">${p.label}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] });
    const marker = L.marker([p.lat, p.lon], { icon, title: p.name }).addTo(map);
    marker.bindTooltip(p.name, { direction: 'top', offset: [0, -12] });
    marker.on('click', () => onPick?.(p.n));
    return marker;
  });
  if (markers.length > 1) map.fitBounds(L.featureGroup(markers).getBounds().pad(0.25), { maxZoom: 15 });
  else if (markers.length === 1) map.setView([points[0].lat, points[0].lon], 13);
  else {
    // Aucune activité localisée : on montre simplement où se trouve l'étape.
    map.setView([center.lat, center.lon], 10);
    L.circleMarker([center.lat, center.lon], { radius: 8, color: '#1d2b53', weight: 3, fillColor: color, fillOpacity: 1 }).addTo(map);
  }
  // La molette ne zoome la carte qu'après un clic dessus, pour ne pas gêner le défilement de la fiche.
  map.on('click', () => map.scrollWheelZoom.enable());
  container.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());
}

export function hideMinimap() {
  if (current) current.remove();
  current = null;
}
