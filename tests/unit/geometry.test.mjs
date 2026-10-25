import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bladeSpec as s,
  rootProfile,
  sectionLoop,
  projectedAirfoil,
  sectionHatching,
} from '../../src/geometry/turbine.ts';

test('dovetail roots and platforms fit their circumferential pitch', () => {
  const innerRadius = s.rotorRadius - s.rootHeight;
  const rootPitch = 2 * innerRadius * Math.sin(Math.PI / s.count);
  assert.ok(
    rootPitch > s.rootWidth + 3,
    'adjacent root slots must not intersect',
  );
  assert.ok(2 * s.rotorRadius * Math.sin(Math.PI / s.count) > s.platformWidth);
  assert.equal(
    Math.max(...rootProfile.map(([x]) => x)) -
      Math.min(...rootProfile.map(([x]) => x)),
    s.rootWidth,
  );
  assert.equal(-Math.min(...rootProfile.map(([, y]) => y)), s.rootHeight);
});
test('drawn front and right silhouettes enclose the same loft used by the mesh', () => {
  for (const axis of [0, 2]) {
    const outline = projectedAirfoil(axis);
    for (let i = 0; i <= 64; i++) {
      const section = sectionLoop(i / 64),
        left = outline[i][0],
        right = outline[outline.length - 1 - i][0];
      for (const p of section) {
        const x = axis === 2 ? -p[2] : p[0];
        assert.ok(x >= left - 1e-8 && x <= right + 1e-8);
      }
    }
  }
  assert.equal(-Math.min(...projectedAirfoil(2).map((p) => p[1])), s.span);
  assert.equal(s.span + s.rootHeight, 114);
});
test('A–A uses the defined midspan cut and has clipped hatching', () => {
  assert.ok(
    sectionLoop(s.sectionHeight / s.span).every(
      (p) => Math.abs(p[1] - 44) < 1e-9,
    ),
  );
  assert.ok(sectionHatching().split('M').length > 5);
  for (const t of [0, 0.5, 1]) {
    const section = sectionLoop(t);
    assert.equal(section.length, 96);
    assert.ok(section.flat().every(Number.isFinite));
  }
});
