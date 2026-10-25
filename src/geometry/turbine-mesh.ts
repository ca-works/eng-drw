import * as THREE from 'three';
import { bladeSpec as s, rootProfile, sectionLoop } from './turbine';

export function makeBladeGeometry() {
  const positions: number[] = [],
    indices: number[] = [];
  const rows = 40,
    cols = 96;
  for (let r = 0; r <= rows; r++)
    for (const p of sectionLoop(r / rows))
      positions.push(...p.map((v) => v / 100));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const a = r * cols + c,
        b = (r + 1) * cols + c,
        d = r * cols + ((c + 1) % cols),
        e = (r + 1) * cols + ((c + 1) % cols);
      indices.push(a, b, d, d, b, e);
    }
  // Separate capped ends retain smooth airfoil normals and close the loft.
  for (const r of [0, rows]) {
    const loop = sectionLoop(r / rows);
    const tris = THREE.ShapeUtils.triangulateShape(
      loop.map((p) => new THREE.Vector2(p[0], p[2])),
      [],
    );
    const offset = positions.length / 3;
    for (const p of loop) positions.push(...p.map((v) => v / 100));
    for (const t of tris) indices.push(...t.map((i) => offset + i));
  }
  const airfoil = new THREE.BufferGeometry();
  airfoil.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  airfoil.setIndex(indices);
  airfoil.computeVertexNormals();
  const rootShape = new THREE.Shape(
    rootProfile.map((p) => new THREE.Vector2(p[0] / 100, p[1] / 100)),
  );
  const root = new THREE.ExtrudeGeometry(rootShape, {
    depth: s.rootDepth / 100,
    bevelEnabled: false,
    steps: 1,
  });
  root.translate(0, 0, -s.rootDepth / 200);
  const platform = new THREE.BoxGeometry(
    s.platformWidth / 100,
    s.platformThickness / 100,
    s.platformDepth / 100,
  );
  platform.translate(0, -s.platformThickness / 200, 0);
  return { airfoil, root, platform };
}
export function makeRotorDisc() {
  const points: THREE.Vector2[] = [];
  const R = s.rotorRadius;
  for (let i = 0; i < s.count; i++) {
    const a = (i * Math.PI * 2) / s.count;
    const local = [
      [-12, Math.sqrt(R * R - 144)],
      [-7.5, Math.sqrt(R * R - 56.25)],
      [-7.5, R - 12],
      [-12.5, R - 24],
      [-10.5, R - 27.5],
      [10.5, R - 27.5],
      [12.5, R - 24],
      [7.5, R - 12],
      [7.5, Math.sqrt(R * R - 56.25)],
      [12, Math.sqrt(R * R - 144)],
    ];
    for (const [x, y] of local)
      points.push(
        new THREE.Vector2(
          (x * Math.cos(a) + y * Math.sin(a)) / 100,
          (y * Math.cos(a) - x * Math.sin(a)) / 100,
        ),
      );
    const start = a + Math.asin(12 / R),
      end = ((i + 1) * Math.PI * 2) / s.count - Math.asin(12 / R);
    for (let j = 1; j < 4; j++) {
      const t = start + ((end - start) * j) / 4;
      points.push(
        new THREE.Vector2((R * Math.sin(t)) / 100, (R * Math.cos(t)) / 100),
      );
    }
  }
  const shape = new THREE.Shape(points);
  const bore = new THREE.Path();
  bore.absarc(0, 0, 0.3, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      hole = new THREE.Path();
    hole.absarc(
      0.65 * Math.cos(a),
      0.65 * Math.sin(a),
      0.045,
      0,
      Math.PI * 2,
      true,
    );
    shape.holes.push(hole);
  }
  const disc = new THREE.ExtrudeGeometry(shape, {
    depth: 0.42,
    steps: 1,
    bevelEnabled: true,
    bevelSize: 0.004,
    bevelThickness: 0.004,
    bevelSegments: 2,
    curveSegments: 64,
  });
  disc.translate(0, 0, -0.21);
  return disc;
}
