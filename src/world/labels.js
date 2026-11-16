// Étiquettes HTML des destinations, partagées par la carte 3D et la carte 2D de secours.
import { DESTINATIONS, WORLD_BY_ID } from '../data/destinations.js';

export function createLabels(layer, onSelect) {
  const items = DESTINATIONS.map((dest, index) => {
    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'map-label';
    label.style.setProperty('--c', WORLD_BY_ID[dest.world].color);
    label.innerHTML = `<span class="map-label__badge"></span><span class="map-label__icon">${dest.icon}</span><span class="map-label__name">${dest.name}</span><span class="map-label__hearts"></span>`;
    label.addEventListener('click', () => onSelect(dest.id));
    layer.appendChild(label);
    return {
      dest,
      label,
      badge: label.querySelector('.map-label__badge'),
      hearts: label.querySelector('.map-label__hearts'),
      phase: index * 0.9,
      order: 0,
      selected: false,
      hovered: false,
      width: 0,
      // Position à l'écran, renseignée par la carte avant chaque appel à layout()
      sx: 0,
      sy: 0,
      onScreen: false,
    };
  });
  const byId = Object.fromEntries(items.map((m) => [m.dest.id, m]));

  function setState({ selected, stops, votes }) {
    const order = Object.fromEntries(stops.map((s, i) => [s.id, i + 1]));
    for (const m of items) {
      m.selected = m.dest.id === selected;
      m.order = order[m.dest.id] || 0;
      m.label.classList.toggle('is-selected', m.selected);
      m.label.classList.toggle('is-stop', m.order > 0);
      m.badge.textContent = m.order || '';
      const v = votes[m.dest.id] || '';
      m.hearts.innerHTML = (v.includes('a') ? '<i class="heart heart--a">♥</i>' : '') + (v.includes('b') ? '<i class="heart heart--b">♥</i>' : '');
      m.width = 0;
    }
  }

  // Place les étiquettes en évitant les chevauchements : les moins prioritaires se réduisent à leur icône, puis se masquent.
  const placed = [];
  function layout(compactAll) {
    placed.length = 0;
    const sorted = [...items].sort((a, b) => b.selected - a.selected || b.hovered - a.hovered || (b.order > 0) - (a.order > 0));
    for (const m of sorted) {
      if (!m.onScreen) {
        m.label.style.display = 'none';
        continue;
      }
      m.label.style.display = '';
      if (!m.width) m.width = m.label.offsetWidth;
      const important = m.selected || m.hovered;
      let compact = !important && compactAll && !m.order;
      const overlaps = (w) => placed.some((p) => Math.abs(p.x - m.sx) < (p.w + w) / 2 + 4 && Math.abs(p.y - m.sy) < 30);
      let w = compact ? 34 : m.width;
      if (!important && !compact && overlaps(w)) {
        compact = true;
        w = 34;
      }
      const hidden = !important && compact && overlaps(w);
      m.label.classList.toggle('is-compact', compact);
      m.label.classList.toggle('is-hidden', hidden);
      m.label.classList.toggle('is-hovered', m.hovered);
      m.label.style.translate = `calc(${m.sx.toFixed(1)}px - 50%) calc(${m.sy.toFixed(1)}px - 100%)`;
      m.label.style.zIndex = important ? 3 : m.order ? 2 : 1;
      if (!hidden) placed.push({ x: m.sx, y: m.sy, w });
    }
  }

  return { items, byId, setState, layout };
}
