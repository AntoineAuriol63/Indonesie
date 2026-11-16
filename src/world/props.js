// Décor animé : mer, nuages, bateaux, fumée des volcans.
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { SEABED_COLOR, toWorld } from './terrain.js';

export function createWater() {
  const group = new THREE.Group();
  const W = 84;
  const H = 52;
  const CELL = 0.32;
  const geometry = new THREE.PlaneGeometry(W, H, Math.round(W / CELL), Math.round(H / CELL));
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(3, 0, 0.5);
  const pos = geometry.attributes.position;
  const rand = mulberry32(7);
  const base = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    // Les vagues s'aplatissent vers le bord pour se raccorder sans couture à la nappe immobile qui l'entoure.
    const edge = Math.min(W / 2 - Math.abs(pos.getX(i) - 3), H / 2 - Math.abs(pos.getZ(i) - 0.5));
    const border = edge < 0.01;
    const x = pos.getX(i) + (border ? 0 : (rand() - 0.5) * CELL * 0.6);
    const z = pos.getZ(i) + (border ? 0 : (rand() - 0.5) * CELL * 0.6);
    pos.setX(i, x);
    pos.setZ(i, z);
    base[i * 3] = x;
    base[i * 3 + 1] = z;
    base[i * 3 + 2] = Math.min(1, edge / 4);
  }
  const material = new THREE.MeshPhongMaterial({
    color: 0x25c4dd,
    flatShading: true,
    transparent: true,
    opacity: 0.78,
    shininess: 80,
    specular: 0x9fe8ff,
    depthWrite: false,
  });
  const surface = new THREE.Mesh(geometry, material);
  surface.renderOrder = 1;

  // Au-delà de la zone animée : quatre nappes immobiles qui l'encadrent, noyées dans la brume.
  const far = new THREE.Group();
  const FAR = 200;
  const cx = 3;
  const cz = 0.5;
  for (const [x, z, w, h] of [
    [cx, cz - H / 2 - FAR / 2, W + FAR * 2, FAR],
    [cx, cz + H / 2 + FAR / 2, W + FAR * 2, FAR],
    [cx - W / 2 - FAR / 2, cz, FAR, H],
    [cx + W / 2 + FAR / 2, cz, FAR, H],
  ]) {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), material);
    sheet.position.set(x, 0, z);
    sheet.renderOrder = 1;
    far.add(sheet);
  }
  const seabed = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: SEABED_COLOR }),
  );
  seabed.position.y = -0.104;
  group.add(seabed, far, surface);

  const update = (t) => {
    const arr = pos.array;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 1];
      arr[i * 3 + 1] = (Math.sin(x * 2.1 + t * 1.1) * 0.011 + Math.cos(z * 2.6 + t * 0.9 + x * 0.7) * 0.011) * base[i * 3 + 2];
    }
    pos.needsUpdate = true;
  };
  return { group, update };
}

// Nuages : plats, légèrement translucides, haut perchés, avec leur ombre portée sur la carte
// pour qu'on les lise comme des nuages et non comme du relief.
const CLOUD_ALTITUDE = 3.4;
export function createClouds() {
  const rand = mulberry32(42);
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, transparent: true, opacity: 0.85, depthWrite: false });
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x0b3a66, transparent: true, opacity: 0.16, depthWrite: false, depthTest: false });
  const blob = new THREE.IcosahedronGeometry(1, 0);
  const disc = new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2);
  const group = new THREE.Group();
  const clouds = [];
  for (let i = 0; i < 10; i++) {
    const cloud = new THREE.Group();
    const parts = 3 + Math.floor(rand() * 3);
    for (let p = 0; p < parts; p++) {
      const m = new THREE.Mesh(blob, material);
      const s = 0.4 + rand() * 0.35;
      m.scale.set(s * 1.7, s * 0.42, s * 1.15);
      m.position.set((p - (parts - 1) / 2) * 0.7 + rand() * 0.2, rand() * 0.1, (rand() - 0.5) * 0.45);
      m.rotation.y = rand() * 3;
      m.renderOrder = 4;
      cloud.add(m);
    }
    const size = 0.6 + rand() * 0.6;
    const altitude = CLOUD_ALTITUDE + rand() * 1.2;
    cloud.scale.setScalar(size);
    cloud.position.set(-26 + rand() * 60, altitude, -9 + rand() * 18);
    // L'ombre est décalée à l'opposé du soleil, comme une vraie ombre portée.
    const shadow = new THREE.Mesh(disc, shadowMaterial);
    shadow.scale.set(size * parts * 0.55, 1, size * 0.75);
    shadow.renderOrder = 2;
    clouds.push({ cloud, shadow, altitude, speed: 0.07 + rand() * 0.1 });
    group.add(cloud, shadow);
  }
  const update = (dt, camDist) => {
    // Les nuages s'effacent quand on zoome, pour ne pas masquer les îles.
    const fade = THREE.MathUtils.clamp((camDist - 8) / 9, 0, 1);
    material.opacity = fade * 0.85;
    shadowMaterial.opacity = fade * 0.16;
    group.visible = fade > 0.01;
    for (const c of clouds) {
      c.cloud.position.x += c.speed * dt;
      if (c.cloud.position.x > 36) c.cloud.position.x = -28;
      c.shadow.position.set(c.cloud.position.x + c.altitude * 0.55, 0.05, c.cloud.position.z - c.altitude * 0.45);
    }
  };
  return { group, update };
}

function makeBoat(sailColor) {
  const boat = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: 0x8d5524, flatShading: true });
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.32, 0.22, 6, 1), wood);
  hull.scale.set(1.5, 1, 0.5);
  hull.position.y = 0.06;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), wood);
  mast.position.y = 0.6;
  const sailMat = new THREE.MeshLambertMaterial({ color: sailColor, flatShading: true, side: THREE.DoubleSide });
  const sailShape = new THREE.BufferGeometry();
  sailShape.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.2, 0, 0.62, 0.25, 0, 0, 1.1, 0], 3));
  sailShape.computeVertexNormals();
  const sail = new THREE.Mesh(sailShape, sailMat);
  const jib = new THREE.Mesh(sailShape, sailMat);
  jib.scale.set(-0.7, 0.8, 1);
  boat.add(hull, mast, sail, jib);
  return boat;
}

// Quelques voiliers qui tournent en rond là où il y a de la mer : [lon, lat, rayon]
export const BOAT_SPOTS = [
  [115.75, -8.62, 0.14],
  [116.0, -8.2, 0.12],
  [119.5, -8.42, 0.14],
  [119.3, -8.95, 0.2],
  [113.5, -6.3, 0.6],
  [117.6, -4.6, 0.8],
  [130.3, -0.9, 0.3],
  [121.6, -0.75, 0.2],
  [124.3, 1.9, 0.25],
  [97.3, 2.2, 0.35],
  [125.5, -5.5, 0.8],
  [108.5, -4.2, 0.7],
];

export function createBoats() {
  const group = new THREE.Group();
  const colors = [0xffffff, 0xff5d73, 0xffd23f, 0xffffff];
  const boats = BOAT_SPOTS.map(([lon, lat, radius], i) => {
    const [x, z] = toWorld(lon, lat);
    const mesh = makeBoat(colors[i % colors.length]);
    group.add(mesh);
    return { mesh, x, z, radius, phase: i * 1.7, dir: i % 2 ? 1 : -1 };
  });
  const update = (t, camDist) => {
    const scale = THREE.MathUtils.clamp(camDist * 0.016, 0.035, 0.3);
    for (const b of boats) {
      const speed = (0.035 / b.radius) * b.dir;
      const a = b.phase + t * speed;
      b.mesh.position.set(b.x + Math.cos(a) * b.radius, Math.sin(t * 2 + b.phase) * 0.006, b.z + Math.sin(a) * b.radius);
      b.mesh.rotation.y = -a - (Math.PI / 2) * b.dir;
      b.mesh.rotation.z = Math.sin(t * 1.7 + b.phase) * 0.08;
      b.mesh.scale.setScalar(scale);
    }
  };
  return { group, update };
}

export function createSmoke(peaks, groundAt) {
  const PUFFS = 6;
  const sources = peaks.filter((p) => p.smokes).map((p) => ({ x: p.x, z: p.z, y: groundAt(p.x, p.z) }));
  const mesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshLambertMaterial({ color: 0xf2f2f2, flatShading: true, transparent: true, opacity: 0.9 }),
    sources.length * PUFFS,
  );
  mesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const update = (t, camDist) => {
    const k = THREE.MathUtils.clamp(camDist * 0.02, 0.05, 0.22);
    let i = 0;
    for (const s of sources) {
      for (let p = 0; p < PUFFS; p++) {
        const life = (t * 0.16 + p / PUFFS + s.x * 0.37) % 1;
        const grow = Math.sin(life * Math.PI);
        dummy.position.set(s.x + life * k * 2.2, s.y + 0.01 + life * k * 3.2, s.z - life * k * 0.5);
        dummy.scale.setScalar(k * (0.25 + life * 0.6) * grow);
        dummy.rotation.set(life * 3 + p, life * 2, p);
        dummy.updateMatrix();
        mesh.setMatrixAt(i++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  return { group: mesh, update };
}
