// Tracé animé de l'itinéraire : arcs en pointillés qui défilent + petit avion qui parcourt le trajet.
import * as THREE from 'three';

const MAX_DOTS = 600;

function makePlane() {
  const plane = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const red = new THREE.MeshLambertMaterial({ color: 0xff3b4e, flatShading: true });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.1, 6), white);
  body.rotation.x = Math.PI / 2;
  const wings = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.3), red);
  wings.position.z = 0.05;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 0.18), red);
  tail.position.z = -0.45;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.2), red);
  fin.position.set(0, 0.13, -0.45);
  plane.add(body, wings, tail, fin);
  return plane;
}

export function createRoute() {
  const group = new THREE.Group();
  const dots = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    MAX_DOTS,
  );
  dots.frustumCulled = false;
  dots.count = 0;
  const plane = makePlane();
  plane.visible = false;
  group.add(dots, plane);

  let curves = [];
  const dummy = new THREE.Object3D();
  const tmp = new THREE.Vector3();
  const ahead = new THREE.Vector3();

  // points : tableau de THREE.Vector3 (positions des étapes, dans l'ordre)
  const setStops = (points) => {
    curves = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const len = a.distanceTo(b);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.y = Math.max(a.y, b.y) + Math.min(2.4, 0.12 + len * 0.22);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      curves.push({ curve, count: THREE.MathUtils.clamp(Math.round(len / 0.1), 5, 70) });
    }
    plane.visible = curves.length > 0;
  };

  const update = (t, camDist) => {
    const dotSize = THREE.MathUtils.clamp(camDist * 0.0045, 0.008, 0.09);
    let i = 0;
    for (const { curve, count } of curves) {
      const shift = (t * 0.6) % 1;
      for (let k = 0; k < count && i < MAX_DOTS; k++) {
        curve.getPoint((k + shift) / count, tmp);
        dummy.position.copy(tmp);
        dummy.scale.setScalar(dotSize);
        dummy.updateMatrix();
        dots.setMatrixAt(i++, dummy.matrix);
      }
    }
    dots.count = i;
    dots.instanceMatrix.needsUpdate = true;

    if (curves.length) {
      const progress = (t * 0.33) % curves.length;
      const leg = curves[Math.floor(progress)].curve;
      const u = progress % 1;
      leg.getPoint(u, plane.position);
      leg.getPoint(Math.min(1, u + 0.02), ahead);
      if (u < 0.98) plane.lookAt(ahead);
      plane.scale.setScalar(THREE.MathUtils.clamp(camDist * 0.022, 0.05, 0.4));
    }
  };

  return { group, setStops, update };
}
