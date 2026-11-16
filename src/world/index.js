// Scène 3D : carte low-poly, caméra, modèles animés des étapes et des villes, textes de la carte.
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { CITIES, PLACES, PLACE_BY_ID, REGIONS, REGION_BY_ID } from '../data/places.js';
import { createKeys } from './keys.js';
import { createLabels } from './labels.js';
import { createModel } from './models.js';
import { buildItem, sceneOf } from './scenes.js';
import { buildTerrain, toWorld } from './terrain.js';
import { createBoats, createClouds, createSmoke, createWater } from './props.js';
import { createRoute } from './route.js';

const SKY = 0xbdeeff;
const DEFAULT_POLAR = THREE.MathUtils.degToRad(40);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function createWorld({ canvas, labelLayer, onRegion, onPlace, onDetail }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    // Deuxième essai avec des réglages minimaux ; si la 3D reste indisponible, l'erreur remonte et le mode compatibilité prend le relais.
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 60, 140);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 300);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7fd6c2, 1.5));
  const sun = new THREE.DirectionalLight(0xfff0d0, 2.6);
  sun.position.set(-8, 12, 7);
  scene.add(sun);

  const terrain = buildTerrain();
  const water = createWater();
  const clouds = createClouds();
  const boats = createBoats();
  const smoke = createSmoke(terrain.peaks, terrain.groundAt);
  const route = createRoute();
  scene.add(terrain.group, water.group, clouds.group, boats.group, smoke.group, route.group);

  // ---------- Caméra ----------
  const controls = new MapControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.6;
  controls.maxDistance = 125;
  controls.minPolarAngle = THREE.MathUtils.degToRad(8);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(62);
  controls.zoomToCursor = true;
  controls.autoRotateSpeed = 0.3;
  const clampTarget = () => {
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -25, 25);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -10.5, 9.5);
    controls.target.y = 0;
  };
  controls.addEventListener('change', clampTarget);

  const spherical = new THREE.Spherical();
  const place = (target, radius, phi, theta) => {
    controls.target.copy(target);
    camera.position.setFromSphericalCoords(radius, phi, theta).add(target);
    camera.lookAt(target);
  };

  // Sur écran étroit on recule pour garder le même champ horizontal.
  const fit = () => THREE.MathUtils.clamp(1.55 / camera.aspect, 1, 2.6);

  let flight = null;
  const cancelFlight = () => {
    if (!flight) return;
    flight = null;
    controls.enabled = true;
  };
  canvas.addEventListener('pointerdown', cancelFlight, { capture: true });
  canvas.addEventListener('wheel', cancelFlight, { capture: true, passive: true });

  function flyTo(lon, lat, dist, { duration = 1.6, theta = 0, phi = DEFAULT_POLAR } = {}) {
    const [x, z] = toWorld(lon, lat);
    spherical.setFromVector3(camera.position.clone().sub(controls.target));
    const to = new THREE.Vector3(x, 0, z);
    let fromTheta = spherical.theta;
    while (fromTheta - theta > Math.PI) fromTheta -= Math.PI * 2;
    while (fromTheta - theta < -Math.PI) fromTheta += Math.PI * 2;
    const toRadius = Math.min(dist * fit(), controls.maxDistance);
    const travel = controls.target.distanceTo(to);
    flight = {
      t: 0,
      duration: duration + Math.min(1.2, travel * 0.06),
      fromTarget: controls.target.clone(),
      toTarget: to,
      fromRadius: spherical.radius,
      toRadius,
      // Petit saut en altitude pendant les longs trajets, façon carte de jeu vidéo.
      bump: Math.max(0, Math.min(14, travel * 0.55) - Math.abs(toRadius - spherical.radius) * 0.5),
      fromPhi: spherical.phi,
      toPhi: phi,
      fromTheta,
      toTheta: theta,
    };
    controls.enabled = false;
    controls.autoRotate = false;
  }

  const [startX, startZ] = toWorld(118.5, -3);
  const flyTarget = new THREE.Vector3();

  // ---------- Clavier ----------
  const keys = createKeys(() => {
    cancelFlight();
    controls.autoRotate = false;
  });
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const offset = new THREE.Vector3();
  function applyKeys(dt, camDist) {
    const k = keys.read();
    if (!k.active || flight) return;
    if (k.x || k.y) {
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      right.crossVectors(forward, camera.up).normalize();
      const step = camDist * 0.38 * dt;
      offset.set(0, 0, 0).addScaledVector(right, k.x * step).addScaledVector(forward, -k.y * step);
      const before = controls.target.clone();
      controls.target.add(offset);
      clampTarget();
      camera.position.add(controls.target.clone().sub(before));
    }
    if (k.rotate || k.zoom) {
      spherical.setFromVector3(offset.copy(camera.position).sub(controls.target));
      spherical.theta += k.rotate * dt * 1.2;
      spherical.radius = THREE.MathUtils.clamp(spherical.radius * (1 + k.zoom * dt * 1.4), controls.minDistance, controls.maxDistance);
      camera.position.setFromSpherical(spherical).add(controls.target);
      camera.lookAt(controls.target);
    }
  }

  // ---------- Étapes et villes : un modèle animé par lieu ----------
  let hoverRegion = null;
  const setHoverRegion = (id) => {
    hoverRegion = id;
    labels.setHoverRegion(id);
  };
  const labels = createLabels(labelLayer, { onRegion, onPlace, onRegionHover: setHoverRegion });

  // ---------- Contour des régions : un trait à la couleur de la région le long des côtes de ses îles ----------
  const outlines = {};
  for (const region of REGIONS) {
    const positions = [];
    for (const island of terrain.islands) {
      if (island.region !== region.id) continue;
      const ring = island.ring;
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        positions.push(a[0], 0.03, a[1], b[0], 0.03, b[1]);
      }
    }
    if (!positions.length) continue;
    const material = new LineMaterial({ color: region.color, linewidth: 2, transparent: true, opacity: 0.5, depthWrite: false });
    const line = new LineSegments2(new LineSegmentsGeometry().setPositions(positions), material);
    line.renderOrder = 3;
    scene.add(line);
    outlines[region.id] = { material, width: 2, opacity: 0.5 };
  }
  function updateOutlines(dt) {
    for (const [id, o] of Object.entries(outlines)) {
      // Survolée : trait épais ; région ouverte : trait net ; au repos : liseré discret.
      const hot = id === hoverRegion && !state.itinerary;
      const open = id === state.region;
      const width = hot ? 6 : open ? 4 : 2;
      const opacity = hot || open ? 1 : 0.5;
      o.width += (width - o.width) * Math.min(1, dt * 12);
      o.opacity += (opacity - o.opacity) * Math.min(1, dt * 12);
      o.material.linewidth = o.width;
      o.material.opacity = o.opacity;
    }
  }
  const modelGroup = new THREE.Group();
  scene.add(modelGroup);
  const ringGeometry = new THREE.RingGeometry(0.72, 1, 24).rotateX(-Math.PI / 2);
  const hitGeometry = new THREE.SphereGeometry(0.8, 8, 6);
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const hitMeshes = [];

  const spots = [];
  const addSpot = (lon, lat, kind, extra) => {
    const [x, z] = toWorld(lon, lat);
    const y = Math.max(0.004, terrain.groundAt(x, z));
    const model = createModel(kind);
    const root = new THREE.Group();
    root.position.set(x, y, z);
    root.add(model.object);
    modelGroup.add(root);
    const spot = { root, model, x, y, z, show: 0, wanted: true, sx: 0, sy: 0, ...extra };
    spots.push(spot);
    return spot;
  };

  const placeSpots = {};
  PLACES.forEach((p) => {
    const spot = addSpot(p.lon, p.lat, p.model, { id: p.id, region: p.region, rank: p.rank, hidden: !!p.hidden, tag: labels.byId[p.id] });
    const ring = new THREE.Mesh(
      ringGeometry,
      new THREE.MeshBasicMaterial({ color: REGION_BY_ID[p.region].color, transparent: true, opacity: 0, depthWrite: false }),
    );
    ring.position.y = 0.03;
    const hit = new THREE.Mesh(hitGeometry, hitMaterial);
    hit.position.y = 0.6;
    hit.userData.id = p.id;
    hitMeshes.push(hit);
    spot.root.add(ring, hit);
    spot.ring = ring;
    placeSpots[p.id] = spot;
  });
  CITIES.filter((c) => c.model).forEach((c) => addSpot(c.lon, c.lat, c.model, { rank: 4 }));

  // ---------- Scènes détaillées : les lieux à voir autour d'une étape, affichés quand elle est sélectionnée ----------
  const scenes = {};
  const easeOutBack = (k) => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2;
  function sceneFor(id) {
    if (id in scenes) return scenes[id];
    const def = sceneOf(id);
    if (!def) return (scenes[id] = null);
    const origin = placeSpots[id];
    const items = def.items.map((item) => {
      const x = origin.x + item.dx;
      const z = origin.z + item.dz;
      const y = Math.max(0, terrain.groundAt(x, z));
      const built = buildItem(item);
      const root = new THREE.Group();
      root.position.set(x, y, z);
      root.add(built.object);
      root.visible = false;
      scene.add(root);
      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'lbl lbl--detail';
      label.textContent = item.name;
      label.style.display = 'none';
      label.addEventListener('click', () => onDetail?.(id, item.match));
      labelLayer.appendChild(label);
      return { item, root, update: built.update, label, top: new THREE.Vector3(x, y + item.height * item.size, z) };
    });
    return (scenes[id] = { items, detail: 0 });
  }
  function updateScenes(dt, elapsed) {
    if (state.place && !state.itinerary) sceneFor(state.place);
    for (const [id, sc] of Object.entries(scenes)) {
      if (!sc) continue;
      const target = id === state.place ? 1 : 0;
      sc.detail += (target - sc.detail) * Math.min(1, dt * 3.5);
      if (target === 0 && sc.detail < 0.01) sc.detail = 0;
      const n = sc.items.length;
      sc.items.forEach((it, i) => {
        // Les éléments apparaissent l'un après l'autre, avec un petit rebond.
        const k = THREE.MathUtils.clamp(sc.detail * (1 + n * 0.28) - i * 0.28, 0, 1);
        it.root.visible = k > 0.01;
        it.label.style.display = k > 0.85 ? '' : 'none';
        if (!it.root.visible) return;
        it.root.scale.setScalar(it.item.size * easeOutBack(k));
        it.update(elapsed);
        projected.copy(it.top).project(camera);
        const sx = (projected.x * 0.5 + 0.5) * width;
        const sy = (-projected.y * 0.5 + 0.5) * height;
        it.label.style.translate = `calc(${sx.toFixed(1)}px - 50%) calc(${sy.toFixed(1)}px - 100%)`;
      });
    }
  }

  // Position au sol des textes qui ne sont pas attachés à un modèle.
  const anchors = labels.items
    .filter((item) => item.type !== 'place')
    .map((item) => {
      const [x, z] = toWorld(item.lon, item.lat);
      return { item, position: new THREE.Vector3(x, item.type === 'city' ? Math.max(0, terrain.groundAt(x, z)) : 0, z) };
    });

  let state = { region: null, place: null, itinerary: null };
  function setState(next) {
    state = next;
    labels.setState(state);
    route.setStops(state.itinerary ? state.itinerary.map((id) => placeSpots[id].root.position.clone().setY(placeSpots[id].y + 0.03)) : []);
  }

  // ---------- Sélection à la souris / au doigt ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const aim = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  };
  // Une étape n'est cliquable qu'une fois sa région ouverte (ou dans l'itinéraire).
  const pickPlace = (event) => {
    aim(event);
    const hit = raycaster.intersectObjects(hitMeshes, false).find((h) => placeSpots[h.object.userData.id].active);
    return hit ? hit.object.userData.id : null;
  };
  // N'importe quel point d'une île désigne sa région. Un modèle posé en mer compte pour la région de son étape.
  const pickRegion = (event) => {
    aim(event);
    const land = raycaster.intersectObject(terrain.landMesh, false)[0];
    if (land) return terrain.regionOfFace(land.faceIndex);
    const model = raycaster.intersectObjects(hitMeshes, false)[0];
    return model ? placeSpots[model.object.userData.id].region : null;
  };
  let down = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 6) return;
    const id = pickPlace(e);
    if (id) return onPlace(id);
    if (state.itinerary) return;
    const region = pickRegion(e);
    if (region && region !== state.region) onRegion(region);
  });
  // Survol : on mémorise la position et on la traite une fois par image.
  let hoverEvent = null;
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' && !down) hoverEvent = e;
  });
  canvas.addEventListener('pointerleave', () => {
    hoverEvent = null;
    setHoverRegion(null);
  });
  function updateHover() {
    if (!hoverEvent) return;
    const e = hoverEvent;
    hoverEvent = null;
    const id = pickPlace(e);
    for (const p of PLACES) placeSpots[p.id].tag.hovered = p.id === id;
    const region = id || state.itinerary ? null : pickRegion(e);
    setHoverRegion(region && region !== state.region ? region : null);
    canvas.style.cursor = id || hoverRegion ? 'pointer' : '';
  }

  // ---------- Décalage de la vue (pour centrer la carte dans la zone non couverte par le panneau) ----------
  const viewShift = { x: 0, y: 0, tx: 0, ty: 0 };
  function setViewPadding({ left = 0, right = 0, top = 0, bottom = 0 }) {
    viewShift.tx = (right - left) / 2;
    viewShift.ty = (bottom - top) / 2;
  }

  let width = 0;
  let height = 0;
  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    for (const o of Object.values(outlines)) o.material.resolution.set(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  place(new THREE.Vector3(startX, 0, startZ), 36 * fit(), THREE.MathUtils.degToRad(50), 0.5);
  controls.autoRotate = true;

  // ---------- Modèles : taille constante à l'écran, et on n'affiche pas ceux qui se marcheraient dessus ----------
  const projected = new THREE.Vector3();
  const shownSpots = [];
  function updateSpots(dt, camDist, elapsed) {
    // Taille constante à l'écran de près, puis les modèles rapetissent quand on dézoome beaucoup.
    const base = THREE.MathUtils.clamp(camDist * 0.034, 0.04, 0.8);
    const minGap = Math.max(26, Math.min(height * 0.058, (base / camDist) * height * 2.1));
    for (const s of spots) {
      projected.set(s.x, s.y, s.z).project(camera);
      s.onScreen = projected.z < 1 && Math.abs(projected.x) < 1.15 && Math.abs(projected.y) < 1.2;
      s.sx = (projected.x * 0.5 + 0.5) * width;
      s.sy = (-projected.y * 0.5 + 0.5) * height;
      const inItinerary = state.itinerary?.includes(s.id);
      s.active = state.itinerary ? inItinerary : !!s.id && s.region === state.region && !s.hidden;
      // Priorité : étape sélectionnée, étapes de la région ouverte, puis rang.
      s.order = s.id === state.place ? 0 : s.active ? 1 : 1 + s.rank;
    }
    shownSpots.length = 0;
    for (const s of [...spots].sort((a, b) => a.order - b.order)) {
      if (state.itinerary) s.wanted = s.active;
      else if (s.active || s.id === state.place) s.wanted = true;
      else s.wanted = !s.hidden && !shownSpots.some((o) => Math.hypot(o.sx - s.sx, o.sy - s.sy) < minGap);
      if (s.wanted && s.onScreen) shownSpots.push(s);
    }
    for (const s of spots) {
      s.show += ((s.wanted ? 1 : 0) - s.show) * Math.min(1, dt * 9);
      const visible = s.show > 0.02 && s.onScreen;
      s.root.visible = visible;
      if (!visible) continue;
      const selected = s.id && s.id === state.place;
      const hovered = s.tag?.hovered;
      const detail = scenes[s.id]?.detail || 0;
      const scale = base * s.show * (selected ? 1.35 : hovered ? 1.18 : 1) * (1 - detail);
      s.root.scale.setScalar(scale);
      s.model.update(elapsed);
      if (s.ring) {
        const pulse = (elapsed * 0.7 + s.x) % 1;
        s.ring.scale.setScalar(0.7 + pulse * 0.9);
        s.ring.material.opacity = s.active ? (1 - pulse) * 0.9 : 0;
      }
      if (s.tag) {
        // Le nom de l'étape se place juste au-dessus du modèle.
        projected.set(s.x, s.y + scale * 1.55, s.z).project(camera);
        s.tag.sx = (projected.x * 0.5 + 0.5) * width;
        s.tag.sy = (-projected.y * 0.5 + 0.5) * height;
        s.tag.onScreen = detail < 0.5;
      }
    }
    for (const s of spots) if (s.tag && !s.root.visible) s.tag.onScreen = false;
    for (const a of anchors) {
      projected.copy(a.position).project(camera);
      a.item.onScreen = projected.z < 1 && Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1;
      a.item.sx = (projected.x * 0.5 + 0.5) * width;
      a.item.sy = (-projected.y * 0.5 + 0.5) * height;
    }
    labels.layout();
  }

  // ---------- Boucle ----------
  const clock = new THREE.Clock();
  let elapsed = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.1);
    elapsed += dt;
    let camDist = camera.position.distanceTo(controls.target);

    if (flight) {
      flight.t = Math.min(1, flight.t + dt / flight.duration);
      const e = easeInOut(flight.t);
      flyTarget.lerpVectors(flight.fromTarget, flight.toTarget, e);
      const radius = THREE.MathUtils.lerp(flight.fromRadius, flight.toRadius, e) + Math.sin(flight.t * Math.PI) * flight.bump;
      place(flyTarget, radius, THREE.MathUtils.lerp(flight.fromPhi, flight.toPhi, e), THREE.MathUtils.lerp(flight.fromTheta, flight.toTheta, e));
      if (flight.t >= 1) cancelFlight();
    } else {
      applyKeys(dt, camDist);
      controls.update(dt);
    }

    viewShift.x += (viewShift.tx - viewShift.x) * Math.min(1, dt * 6);
    viewShift.y += (viewShift.ty - viewShift.y) * Math.min(1, dt * 6);
    if (Math.abs(viewShift.x) > 0.5 || Math.abs(viewShift.y) > 0.5) camera.setViewOffset(width, height, viewShift.x, viewShift.y, width, height);
    else if (camera.view) camera.clearViewOffset();

    camDist = camera.position.distanceTo(controls.target);
    // La brume recule avec la caméra, pour que la carte reste nette même vue de très haut (petits écrans).
    scene.fog.near = Math.max(60, camDist * 1.5);
    scene.fog.far = Math.max(140, camDist * 3.6);
    water.update(elapsed);
    clouds.update(dt, camDist);
    boats.update(elapsed, camDist);
    smoke.update(elapsed, camDist);
    route.update(elapsed, camDist);
    updateHover();
    updateOutlines(dt);
    updateScenes(dt, elapsed);
    updateSpots(dt, camDist, elapsed);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    mode: '3d',
    flyTo,
    setState,
    setViewPadding,
    focusPlace(id) {
      const p = PLACE_BY_ID[id];
      const detailed = sceneOf(id);
      // Avec une scène détaillée, on cadre l'ensemble de ses éléments, d'un peu plus près.
      if (detailed) return flyTo(p.lon + detailed.center.dx, p.lat - detailed.center.dz, Math.max(2.6, detailed.span * 2.6), { duration: 1.3 });
      flyTo(p.lon, p.lat, THREE.MathUtils.clamp(REGION_BY_ID[p.region].focus.dist * 0.55, 2.4, 4.6), { duration: 1.3 });
    },
    zoom(factor) {
      spherical.setFromVector3(camera.position.clone().sub(controls.target));
      flight = {
        t: 0,
        duration: 0.45,
        fromTarget: controls.target.clone(),
        toTarget: controls.target.clone(),
        fromRadius: spherical.radius,
        toRadius: THREE.MathUtils.clamp(spherical.radius * factor, controls.minDistance, controls.maxDistance),
        bump: 0,
        fromPhi: spherical.phi,
        toPhi: spherical.phi,
        fromTheta: spherical.theta,
        toTheta: spherical.theta,
      };
      controls.enabled = false;
    },
    stopIdle() {
      controls.autoRotate = false;
    },
  };
}
