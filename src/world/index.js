// Scène 3D : carte low-poly, caméra, marqueurs cliquables et étiquettes HTML.
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { DESTINATIONS, WORLD_BY_ID } from '../data/destinations.js';
import { buildTerrain, toWorld } from './terrain.js';
import { createBoats, createClouds, createSmoke, createWater } from './props.js';
import { createRoute } from './route.js';

const SKY = 0xbdeeff;
const DEFAULT_POLAR = THREE.MathUtils.degToRad(40);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function createWorld({ canvas, labelLayer, onSelect }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 45, 110);

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
  controls.maxDistance = 60;
  controls.minPolarAngle = THREE.MathUtils.degToRad(8);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(62);
  controls.zoomToCursor = true;
  controls.autoRotateSpeed = 0.35;
  controls.addEventListener('change', () => {
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -25, 24);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -10, 9);
    controls.target.y = 0;
  });

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
    const toRadius = dist * fit();
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

  const target0 = new THREE.Vector3(...[toWorld(118.5, -3)[0], 0, toWorld(118.5, -3)[1]]);
  const flyTarget = new THREE.Vector3();

  // ---------- Marqueurs ----------
  const markerGroup = new THREE.Group();
  scene.add(markerGroup);
  const gemGeometry = new THREE.OctahedronGeometry(1, 0);
  const ringGeometry = new THREE.RingGeometry(0.75, 1, 20).rotateX(-Math.PI / 2);
  const hitGeometry = new THREE.SphereGeometry(1.5, 8, 6);
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const hitMeshes = [];

  const markers = DESTINATIONS.map((dest, index) => {
    const [x, z] = toWorld(dest.lon, dest.lat);
    const y = Math.max(0.01, terrain.groundAt(x, z));
    const color = new THREE.Color(WORLD_BY_ID[dest.world].color);
    const root = new THREE.Group();
    root.position.set(x, y, z);

    const gem = new THREE.Mesh(
      gemGeometry,
      new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.35, metalness: 0.1, emissive: color, emissiveIntensity: 0.35 }),
    );
    gem.scale.set(0.5, 0.85, 0.5);
    const ring = new THREE.Mesh(
      ringGeometry,
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }),
    );
    ring.position.y = 0.04;
    const hit = new THREE.Mesh(hitGeometry, hitMaterial);
    hit.position.y = 1.4;
    hit.userData.id = dest.id;
    hitMeshes.push(hit);
    root.add(gem, ring, hit);
    markerGroup.add(root);

    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'map-label';
    label.style.setProperty('--c', WORLD_BY_ID[dest.world].color);
    label.innerHTML = `<span class="map-label__badge"></span><span class="map-label__icon">${dest.icon}</span><span class="map-label__name">${dest.name}</span><span class="map-label__hearts"></span>`;
    label.addEventListener('click', () => onSelect(dest.id));
    labelLayer.appendChild(label);

    return {
      dest,
      root,
      gem,
      ring,
      label,
      badge: label.querySelector('.map-label__badge'),
      hearts: label.querySelector('.map-label__hearts'),
      top: new THREE.Vector3(x, y, z),
      phase: index * 0.9,
      order: 0,
      selected: false,
      hovered: false,
      width: 120,
    };
  });
  const markerById = Object.fromEntries(markers.map((m) => [m.dest.id, m]));

  let selectedId = null;
  function setState({ selected, stops, votes }) {
    selectedId = selected;
    const order = Object.fromEntries(stops.map((s, i) => [s.id, i + 1]));
    for (const m of markers) {
      m.selected = m.dest.id === selected;
      m.order = order[m.dest.id] || 0;
      m.label.classList.toggle('is-selected', m.selected);
      m.label.classList.toggle('is-stop', m.order > 0);
      m.badge.textContent = m.order || '';
      const v = votes[m.dest.id] || '';
      m.hearts.innerHTML = (v.includes('a') ? '<i class="heart heart--a">♥</i>' : '') + (v.includes('b') ? '<i class="heart heart--b">♥</i>' : '');
      m.ring.material.color.set(m.order ? 0xffd23f : 0xffffff);
      m.width = 0;
    }
    route.setStops(stops.map((s) => markerById[s.id].root.position.clone().setY(markerById[s.id].root.position.y + 0.02)));
  }

  // ---------- Sélection à la souris / au doigt ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pick = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(hitMeshes, false)[0];
    return hit ? hit.object.userData.id : null;
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
    const id = pick(e);
    if (id) onSelect(id);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || down) return;
    const id = pick(e);
    canvas.style.cursor = id ? 'pointer' : '';
    for (const m of markers) m.hovered = m.dest.id === id;
  });

  // ---------- Décalage de la vue (pour centrer la carte dans la zone non couverte par les panneaux) ----------
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
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  place(target0, 34 * fit(), THREE.MathUtils.degToRad(50), 0.5);
  controls.autoRotate = true;

  // ---------- Étiquettes ----------
  const projected = new THREE.Vector3();
  const placed = [];
  function updateLabels(camDist) {
    placed.length = 0;
    const sorted = markers
      .map((m) => m)
      .sort((a, b) => b.selected - a.selected || b.hovered - a.hovered || (b.order > 0) - (a.order > 0));
    for (const m of sorted) {
      projected.copy(m.top);
      projected.y += m.root.scale.y * 2.6;
      projected.project(camera);
      const visible = projected.z < 1 && Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.15;
      if (!visible) {
        m.label.style.display = 'none';
        continue;
      }
      m.label.style.display = '';
      if (!m.width) m.width = m.label.offsetWidth;
      const sx = (projected.x * 0.5 + 0.5) * width;
      const sy = (-projected.y * 0.5 + 0.5) * height;
      const important = m.selected || m.hovered;
      let compact = !important && camDist > 36 * fit() && !m.order;
      const overlaps = (w) => placed.some((p) => Math.abs(p.x - sx) < (p.w + w) / 2 + 4 && Math.abs(p.y - sy) < 30);
      let w = compact ? 34 : m.width;
      if (!important && !compact && overlaps(w)) {
        compact = true;
        w = 34;
      }
      const hidden = !important && compact && overlaps(w);
      m.label.classList.toggle('is-compact', compact);
      m.label.classList.toggle('is-hidden', hidden);
      m.label.classList.toggle('is-hovered', m.hovered);
      m.label.style.translate = `calc(${sx.toFixed(1)}px - 50%) calc(${sy.toFixed(1)}px - 100%)`;
      m.label.style.zIndex = important ? 3 : m.order ? 2 : 1;
      if (!hidden) placed.push({ x: sx, y: sy, w });
    }
  }

  // ---------- Boucle ----------
  const clock = new THREE.Clock();
  let elapsed = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.1);
    elapsed += dt;

    if (flight) {
      flight.t = Math.min(1, flight.t + dt / flight.duration);
      const e = easeInOut(flight.t);
      flyTarget.lerpVectors(flight.fromTarget, flight.toTarget, e);
      const radius = THREE.MathUtils.lerp(flight.fromRadius, flight.toRadius, e) + Math.sin(flight.t * Math.PI) * flight.bump;
      place(flyTarget, radius, THREE.MathUtils.lerp(flight.fromPhi, flight.toPhi, e), THREE.MathUtils.lerp(flight.fromTheta, flight.toTheta, e));
      if (flight.t >= 1) cancelFlight();
    } else {
      controls.update(dt);
    }

    viewShift.x += (viewShift.tx - viewShift.x) * Math.min(1, dt * 6);
    viewShift.y += (viewShift.ty - viewShift.y) * Math.min(1, dt * 6);
    if (Math.abs(viewShift.x) > 0.5 || Math.abs(viewShift.y) > 0.5) camera.setViewOffset(width, height, viewShift.x, viewShift.y, width, height);
    else if (camera.view) camera.clearViewOffset();

    const camDist = camera.position.distanceTo(controls.target);
    const markerScale = THREE.MathUtils.clamp(camDist * 0.02, 0.03, 0.55);
    for (const m of markers) {
      const active = m.selected || m.hovered;
      const s = markerScale * (active ? 1.5 : m.order ? 1.2 : 1);
      m.root.scale.setScalar(s);
      m.gem.position.y = 1.5 + Math.sin(elapsed * 2.2 + m.phase) * 0.25;
      m.gem.rotation.y = elapsed * (active ? 3 : 1.1) + m.phase;
      const pulse = (elapsed * 0.7 + m.phase * 0.3) % 1;
      m.ring.scale.setScalar(0.6 + pulse * 1.3);
      m.ring.material.opacity = (1 - pulse) * 0.85;
    }

    water.update(elapsed);
    clouds.update(dt, camDist);
    boats.update(elapsed, camDist);
    smoke.update(elapsed, camDist);
    route.update(elapsed, camDist);
    renderer.render(scene, camera);
    updateLabels(camDist);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    flyTo,
    setState,
    setViewPadding,
    focusDestination(id, dist) {
      const d = markerById[id].dest;
      const base = WORLD_BY_ID[d.world].focus.dist;
      flyTo(d.lon, d.lat, dist ?? Math.min(base, 4.2), { duration: 1.4 });
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
