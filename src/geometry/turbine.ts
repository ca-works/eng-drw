/** Original solid, uncooled demonstration blade. All dimensions are millimetres.
 * One definition drives the mesh, projections, section and dimension anchors.
 * This is a concept model, not an airworthy component or production drawing.
 */
export const bladeSpec = Object.freeze({
  span: 88,
  rootChord: 42,
  tipChord: 30,
  platformWidth: 25,
  platformDepth: 50,
  platformThickness: 5,
  rootDepth: 40,
  rootHeight: 26,
  rootWidth: 22,
  neckWidth: 12,
  sectionHeight: 44,
  rotorRadius: 105,
  count: 18,
});
export type Point3 = [number, number, number];
export const rootProfile: [number, number][] = [
  [-6, -5],
  [-6, -12],
  [-11, -24],
  [-9, -26],
  [9, -26],
  [11, -24],
  [6, -12],
  [6, -5],
];
export function sectionPoint(t: number, u: number, side: number): Point3 {
  const chord =
    bladeSpec.rootChord + (bladeSpec.tipChord - bladeSpec.rootChord) * t;
  // Closed NACA-style thickness distribution with a rounded leading edge.
  const thickness =
    5 *
    0.12 *
    chord *
    (0.2969 * Math.sqrt(u) -
      0.126 * u -
      0.3516 * u * u +
      0.2843 * u * u * u -
      0.1036 * u ** 4);
  const camber = 0.04 * chord * 4 * u * (1 - u);
  const z = (u - 0.5) * chord;
  const x = camber + side * thickness;
  const angle = ((-28 + 17 * t) * Math.PI) / 180;
  return [
    x * Math.cos(angle) + z * Math.sin(angle) + 3 * t * t,
    t * bladeSpec.span,
    -x * Math.sin(angle) + z * Math.cos(angle),
  ];
}
export function sectionLoop(t: number, steps = 48): Point3[] {
  const points: Point3[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = (1 - Math.cos((Math.PI * i) / steps)) / 2;
    points.push(sectionPoint(t, u, 1));
  }
  for (let i = steps - 1; i > 0; i--) {
    const u = (1 - Math.cos((Math.PI * i) / steps)) / 2;
    points.push(sectionPoint(t, u, -1));
  }
  return points;
}
export function projectedAirfoil(axis: 0 | 2): [number, number][] {
  const left: [number, number][] = [],
    right: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const t = i / 64,
      values = sectionLoop(t).map((p) => (axis === 2 ? -p[2] : p[0]));
    left.push([Math.min(...values), -t * bladeSpec.span]);
    right.push([Math.max(...values), -t * bladeSpec.span]);
  }
  return [...left, ...right.reverse()];
}
export function polygonPath(
  points: readonly (readonly number[])[],
  close = true,
) {
  return (
    points
      .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(3)} ${p[1].toFixed(3)}`)
      .join(' ') + (close ? 'Z' : '')
  );
}
export const frontOutline = polygonPath(projectedAirfoil(2));
export const sideOutline = polygonPath(projectedAirfoil(0));
export const midSection = polygonPath(
  sectionLoop(bladeSpec.sectionHeight / bladeSpec.span).map((p) => [
    -p[2],
    -p[0],
  ]),
);
/** Clip 45-degree hatch segments against the actual section polygon (PDF-safe). */
export function sectionHatching() {
  const p = sectionLoop(bladeSpec.sectionHeight / bladeSpec.span).map((q) => [
    -q[2],
    -q[0],
  ]);
  const cuts = p.map(([x, y]) => y - x),
    paths: string[] = [];
  for (let c = Math.floor(Math.min(...cuts)); c <= Math.max(...cuts); c += 2) {
    const hits: number[][] = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i],
        b = p[(i + 1) % p.length],
        v = a[1] - a[0] - c,
        w = b[1] - b[0] - c;
      if ((v < 0 && w >= 0) || (w < 0 && v >= 0)) {
        const t = v / (v - w);
        hits.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
    }
    hits.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i + 1 < hits.length; i += 2)
      paths.push(polygonPath([hits[i], hits[i + 1]], false));
  }
  return paths.join(' ');
}
