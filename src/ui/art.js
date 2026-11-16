// Illustrations low-poly générées en SVG pour l'en-tête de chaque fiche destination.

const W = 400;
const H = 190;
let uid = 0;

const poly = (points, fill, extra = '') => `<polygon points="${points}" fill="${fill}" ${extra}/>`;

function sky(top, bottom) {
  const id = `sky${uid++}`;
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})"/>`;
}

const sun = (x, y, r, color = '#fff3b0') =>
  `<g class="art-sun"><circle cx="${x}" cy="${y}" r="${r * 1.7}" fill="${color}" opacity=".25"/><circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/></g>`;

const cloud = (x, y, s = 1, delay = 0) =>
  `<g class="art-cloud" style="animation-delay:${delay}s" fill="#fff" opacity=".92"><polygon points="${x},${y} ${x + 14 * s},${y - 12 * s} ${x + 34 * s},${y - 16 * s} ${x + 52 * s},${y - 8 * s} ${x + 64 * s},${y} "/></g>`;

// Montagne à deux facettes (claire / sombre)
function mountain(cx, top, half, base, light, dark) {
  const ridge = cx + half * 0.18;
  return poly(`${cx - half},${base} ${cx},${top} ${ridge},${base}`, light) + poly(`${ridge},${base} ${cx},${top} ${cx + half},${base}`, dark);
}

function volcano(cx, top, half, base, light, dark, smoking = true) {
  const t = half * 0.16;
  const ridge = cx + half * 0.15;
  let out =
    poly(`${cx - half},${base} ${cx - t},${top} ${cx + t * 0.4},${top} ${ridge},${base}`, light) +
    poly(`${ridge},${base} ${cx + t * 0.4},${top} ${cx + t},${top} ${cx + half},${base}`, dark) +
    poly(`${cx - t},${top} ${cx + t},${top} ${cx + t * 0.5},${top + 5} ${cx - t * 0.5},${top + 5}`, '#ff7b3a');
  if (smoking) {
    out += [0, 1, 2]
      .map(
        (i) =>
          `<polygon class="art-smoke" style="animation-delay:${i * 1.3}s" fill="#fff" opacity=".85" points="${cx - 7},${top - 4} ${cx},${top - 13} ${cx + 8},${top - 6} ${cx + 3},${top + 1}"/>`,
      )
      .join('');
  }
  return out;
}

function sea(y, c1, c2, c3) {
  let out = `<rect x="0" y="${y}" width="${W}" height="${H - y}" fill="${c1}"/>`;
  const rows = Math.ceil((H - y) / 16);
  for (let r = 0; r < rows; r++) {
    for (let i = -1; i < 9; i++) {
      const x = i * 50 + (r % 2) * 25;
      const yy = y + r * 16;
      out += poly(`${x},${yy + 16} ${x + 25},${yy} ${x + 50},${yy + 16}`, (i + r) % 2 ? c2 : c3, `class="art-wave" style="animation-delay:${((i + r) % 5) * 0.4}s"`);
    }
  }
  return out;
}

function palm(x, y, h = 46, lean = 8) {
  const tx = x + lean;
  const ty = y - h;
  const leaf = (dx, dy, c) => poly(`${tx},${ty} ${tx + dx * 0.55},${ty + dy - 7} ${tx + dx},${ty + dy}`, c);
  return (
    `<g class="art-sway" style="transform-origin:${x}px ${y}px">` +
    poly(`${x - 2.5},${y} ${x + 2.5},${y} ${tx + 1.5},${ty} ${tx - 1.5},${ty}`, '#8d5a2b') +
    leaf(-24, 6, '#2f9e44') +
    leaf(24, 6, '#37b24d') +
    leaf(-18, -6, '#40c057') +
    leaf(18, -7, '#2f9e44') +
    leaf(-9, 15, '#2b8a3e') +
    leaf(10, 15, '#37b24d') +
    '</g>'
  );
}

function stupa(cx, base) {
  let out = '';
  const stone = ['#6c5b7b', '#7d6b8d', '#8f7da0', '#a391b3'];
  for (let i = 0; i < 4; i++) {
    const w = 78 - i * 15;
    const y = base - (i + 1) * 13;
    out += poly(`${cx - w},${y + 13} ${cx - w + 6},${y} ${cx + w - 6},${y} ${cx + w},${y + 13}`, stone[i]);
  }
  const y = base - 52;
  out += poly(`${cx - 13},${y} ${cx - 9},${y - 16} ${cx},${y - 22} ${cx + 9},${y - 16} ${cx + 13},${y}`, '#b9a8c9');
  out += poly(`${cx - 2},${y - 22} ${cx},${y - 40} ${cx + 2},${y - 22}`, '#d8cbe4');
  for (const dx of [-48, -30, 30, 48]) out += poly(`${cx + dx - 5},${base - 26} ${cx + dx},${base - 37} ${cx + dx + 5},${base - 26}`, '#a391b3');
  return out;
}

// Maison traditionnelle : toit haut (Sumba) ou toit en forme de coque (Toraja)
function house(x, base, kind, s = 1) {
  if (kind === 'toraja') {
    return (
      poly(`${x - 16 * s},${base} ${x - 16 * s},${base - 16 * s} ${x + 16 * s},${base - 16 * s} ${x + 16 * s},${base}`, '#7b3f1d') +
      `<path d="M${x - 36 * s},${base - 34 * s} Q${x},${base - 6 * s} ${x + 36 * s},${base - 34 * s} L${x + 26 * s},${base - 14 * s} L${x - 26 * s},${base - 14 * s} Z" fill="#3b2a20"/>` +
      `<path d="M${x - 36 * s},${base - 34 * s} Q${x},${base - 12 * s} ${x + 36 * s},${base - 34 * s} Q${x},${base - 20 * s} ${x - 36 * s},${base - 34 * s}Z" fill="#c92a2a"/>`
    );
  }
  return (
    poly(`${x - 20 * s},${base} ${x - 20 * s},${base - 10 * s} ${x + 20 * s},${base - 10 * s} ${x + 20 * s},${base}`, '#8d5a2b') +
    poly(`${x - 26 * s},${base - 10 * s} ${x - 8 * s},${base - 22 * s} ${x + 8 * s},${base - 22 * s} ${x + 26 * s},${base - 10 * s}`, '#d9a441') +
    poly(`${x - 8 * s},${base - 22 * s} ${x - 3 * s},${base - 56 * s} ${x + 3 * s},${base - 56 * s} ${x + 8 * s},${base - 22 * s}`, '#c08a2e')
  );
}

function islet(x, base, w, h) {
  return (
    poly(`${x - w * 0.36},${base} ${x - w * 0.42},${base - h * 0.4} ${x + w * 0.42},${base - h * 0.4} ${x + w * 0.36},${base}`, '#b6a58a') +
    poly(`${x - w * 0.5},${base - h * 0.38} ${x - w * 0.3},${base - h * 0.85} ${x},${base - h} ${x + w * 0.1},${base - h * 0.38}`, '#40c057') +
    poly(`${x + w * 0.1},${base - h * 0.38} ${x},${base - h} ${x + w * 0.34},${base - h * 0.8} ${x + w * 0.5},${base - h * 0.38}`, '#2b8a3e')
  );
}

const sail = (x, y, s = 1) =>
  `<g class="art-bob">${poly(`${x - 12 * s},${y} ${x + 12 * s},${y} ${x + 8 * s},${y + 5 * s} ${x - 8 * s},${y + 5 * s}`, '#7b3f1d')}${poly(`${x},${y - 2 * s} ${x},${y - 22 * s} ${x + 11 * s},${y - 2 * s}`, '#fff')}${poly(`${x - 2 * s},${y - 2 * s} ${x - 2 * s},${y - 17 * s} ${x - 10 * s},${y - 2 * s}`, '#ff5d73')}</g>`;

function canopy(y, colors, seed = 0) {
  let out = '';
  for (let i = -1; i < 12; i++) {
    const x = i * 38 + ((seed * 13) % 20);
    const h = 26 + ((i * 7 + seed * 5) % 4) * 7;
    out += poly(`${x},${y + 30} ${x + 6},${y - h * 0.5} ${x + 22},${y - h} ${x + 40},${y - h * 0.45} ${x + 46},${y + 30}`, colors[(i + 12) % colors.length]);
  }
  return out;
}

function terraces(y) {
  const greens = ['#8ce99a', '#69db7c', '#51cf66', '#40c057', '#37b24d'];
  let out = '';
  for (let i = 0; i < 5; i++) {
    const yy = y + i * 15;
    out += `<path d="M0,${yy + 6} Q100,${yy - 12 + i * 2} 200,${yy + 4} T400,${yy - 2} L400,${H} L0,${H}Z" fill="${greens[i]}"/>`;
    out += `<path d="M0,${yy + 6} Q100,${yy - 12 + i * 2} 200,${yy + 4} T400,${yy - 2}" fill="none" stroke="#d3f9d8" stroke-width="2" opacity=".7"/>`;
  }
  return out;
}

const fish = (x, y, color, s = 1, delay = 0) =>
  `<g class="art-fish" style="animation-delay:${delay}s">${poly(`${x},${y} ${x + 14 * s},${y - 6 * s} ${x + 24 * s},${y} ${x + 14 * s},${y + 6 * s}`, color)}${poly(`${x},${y} ${x - 8 * s},${y - 6 * s} ${x - 8 * s},${y + 6 * s}`, color)}</g>`;

const coral = (x, base, color, s = 1) =>
  poly(`${x},${base} ${x - 10 * s},${base - 18 * s} ${x - 3 * s},${base - 14 * s} ${x},${base - 30 * s} ${x + 5 * s},${base - 13 * s} ${x + 13 * s},${base - 22 * s} ${x + 8 * s},${base}`, color);

const SCENES = {
  temple: () =>
    sky('#ff9e6d', '#ffe29a') +
    sun(300, 70, 24) +
    volcano(90, 52, 90, 150, '#c98b9b', '#b07486') +
    mountain(330, 80, 110, 150, '#e0a899', '#cf917f') +
    `<rect y="120" width="${W}" height="14" fill="#fff" opacity=".35"/>` +
    canopy(140, ['#2f9e44', '#37b24d', '#2b8a3e'], 1) +
    stupa(200, 172) +
    `<rect y="170" width="${W}" height="20" fill="#2b8a3e"/>` +
    palm(52, 176, 52, -6) +
    palm(352, 178, 48, 8),
  volcano: () =>
    sky('#6a4c93', '#ffb37a') +
    sun(70, 96, 18, '#ffe9a8') +
    mountain(320, 54, 120, 160, '#8e6ea8', '#74568f') +
    volcano(160, 40, 120, 160, '#5f4b7a', '#49385f') +
    volcano(262, 96, 60, 160, '#7a6090', '#5f4b7a', false) +
    `<path d="M0,150 Q100,132 200,148 T400,140 L400,190 L0,190Z" fill="#e9c9a8"/>` +
    `<path d="M0,166 Q120,150 240,166 T400,160 L400,190 L0,190Z" fill="#d9b08c"/>` +
    cloud(250, 60, 1, 0) +
    cloud(20, 44, 0.8, 3),
  rice: () =>
    sky('#4cc9f0', '#d8f8ff') +
    sun(330, 44, 18) +
    cloud(60, 50, 1, 0) +
    cloud(210, 36, 0.8, 4) +
    mountain(110, 44, 120, 120, '#74c69d', '#52b788') +
    mountain(300, 62, 130, 120, '#95d5b2', '#74c69d') +
    terraces(104) +
    palm(60, 150, 56, -8) +
    palm(330, 168, 60, 10) +
    palm(300, 172, 40, -4),
  beach: () =>
    sky('#38b6ff', '#c9f4ff') +
    sun(320, 46, 22) +
    cloud(40, 48, 1, 0) +
    cloud(190, 30, 0.7, 5) +
    sea(92, '#18c2d6', '#35d0e0', '#12b3c9') +
    sail(250, 104) +
    `<path d="M0,150 Q140,120 400,146 L400,190 L0,190Z" fill="#ffe8a3"/>` +
    `<path d="M0,170 Q160,146 400,168 L400,190 L0,190Z" fill="#ffd97a"/>` +
    palm(70, 162, 70, 14) +
    palm(112, 170, 50, -10),
  jungle: () =>
    sky('#b7efc5', '#e9fbe5') +
    sun(310, 40, 16, '#fffbe0') +
    mountain(120, 30, 150, 130, '#74c69d', '#52b788') +
    mountain(310, 52, 140, 130, '#95d5b2', '#74c69d') +
    `<rect y="92" width="${W}" height="12" fill="#fff" opacity=".45"/>` +
    canopy(112, ['#40916c', '#52b788', '#2d6a4f'], 0) +
    canopy(138, ['#2d6a4f', '#1b4332', '#40916c'], 2) +
    `<path d="M150,190 Q190,160 170,146 Q215,158 250,190Z" fill="#5fd3e6"/>` +
    canopy(170, ['#1b4332', '#2d6a4f'], 4),
  reef: () =>
    sky('#1fb6d9', '#0a4f8f') +
    poly('60,0 110,0 40,190 0,190', '#fff', 'opacity=".12"') +
    poly('190,0 250,0 230,190 150,190', '#fff', 'opacity=".1"') +
    poly('320,0 350,0 400,190 340,190', '#fff', 'opacity=".1"') +
    `<path d="M0,160 Q100,140 200,158 T400,150 L400,190 L0,190Z" fill="#e8d6a0"/>` +
    coral(50, 168, '#ff6b9d', 1.3) +
    coral(110, 172, '#ffa94d', 1) +
    coral(300, 166, '#da77f2', 1.4) +
    coral(350, 172, '#ff8787', 1) +
    coral(210, 174, '#63e6be', 0.9) +
    fish(90, 70, '#ffd43b', 1, 0) +
    fish(230, 100, '#ff922b', 1.2, 1.2) +
    fish(300, 54, '#fff', 0.8, 2.1) +
    fish(160, 128, '#ff6b9d', 0.9, 0.6),
  cliff: () =>
    sky('#38b6ff', '#d4f6ff') +
    sun(60, 44, 20) +
    cloud(220, 40, 1, 0) +
    sea(84, '#0fb5cc', '#2ccbe0', '#0aa5bd') +
    poly('400,40 300,46 250,70 236,112 262,140 240,190 400,190', '#e9d9b4') +
    poly('250,70 236,112 262,140 240,190 290,190 300,120 282,84', '#cdb98c') +
    poly('400,32 296,38 244,66 262,76 310,56 400,52', '#40c057') +
    poly('236,112 196,120 170,150 190,160 214,140 262,140', '#e9d9b4') +
    poly('236,108 198,116 190,122 240,118', '#37b24d') +
    `<path d="M140,190 Q200,150 262,172 L250,190Z" fill="#fff3c4"/>`,
  islands: () =>
    sky('#48cae4', '#dff9ff') +
    sun(330, 42, 18) +
    cloud(40, 40, 1, 0) +
    cloud(180, 28, 0.7, 4) +
    sea(84, '#16c3d8', '#39d3e3', '#10b2c8') +
    islet(70, 110, 70, 52) +
    islet(170, 100, 46, 34) +
    islet(310, 118, 110, 70) +
    islet(236, 136, 50, 30) +
    islet(110, 158, 64, 40) +
    sail(190, 150, 1.1),
  lake: () =>
    sky('#74c0fc', '#e7f5ff') +
    sun(80, 40, 16) +
    cloud(240, 36, 1, 1) +
    mountain(90, 36, 130, 110, '#63b58c', '#4a9c75') +
    volcano(250, 30, 120, 110, '#7fc8a0', '#5fb088', false) +
    mountain(370, 58, 90, 110, '#95d5b2', '#74c69d') +
    sea(108, '#3bc9db', '#66d9e8', '#22b8cf') +
    islet(190, 138, 90, 30) +
    `<path d="M0,176 Q120,160 400,180 L400,190 L0,190Z" fill="#40c057"/>` +
    palm(40, 180, 44, 6),
  savanna: () =>
    sky('#ffa94d', '#fff0c2') +
    sun(310, 60, 24, '#fff7d6') +
    mountain(90, 70, 150, 140, '#e6b566', '#d49f4b') +
    mountain(300, 86, 170, 140, '#edc77f', '#e0b060') +
    `<path d="M0,134 Q130,112 260,132 T400,126 L400,190 L0,190Z" fill="#d9a441"/>` +
    `<path d="M0,160 Q150,140 400,158 L400,190 L0,190Z" fill="#c08a2e"/>` +
    house(120, 160, 'sumba', 1) +
    house(184, 166, 'sumba', 0.8) +
    house(64, 170, 'sumba', 0.7) +
    palm(330, 170, 56, -10),
  village: () =>
    sky('#63c7ff', '#e3f8ff') +
    cloud(40, 40, 1, 0) +
    cloud(260, 30, 0.8, 3) +
    mountain(80, 26, 140, 130, '#52b788', '#40916c') +
    mountain(290, 40, 160, 130, '#74c69d', '#52b788') +
    terraces(118) +
    house(130, 168, 'toraja', 1.1) +
    house(240, 174, 'toraja', 0.9) +
    palm(340, 176, 54, 8),
};

export function sceneSvg(type) {
  const draw = SCENES[type] || SCENES.beach;
  return `<svg class="art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${draw()}</svg>`;
}
