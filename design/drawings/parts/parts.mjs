// Original, fictional demo parts. Every drawing is A3 landscape (420 × 297 mm) unless noted.
import {
  line, circle, path, rect, text, dimH, dimV, dimDia, leader, centreCross, hatch, frame, titleBlock, notes, svgDoc, fmt,
} from './lib.mjs';

const W = 420, H = 297;

/* ------------------------------------------------------------------ flange */
export function flange({ holes = 6, holeD = 14, thickness = 18, rev = 'B', number = 'EDV-1001' } = {}) {
  const cx = 120, cy = 128, R = 80, Rhub = 45, Rbore = 30, Rpcd = 62.5, rh = holeD / 2;
  const sx = 262, T = thickness, L = 45; // section view origin and sizes
  const front = [];
  front.push(circle(cx, cy, R), circle(cx, cy, Rhub), circle(cx, cy, Rbore));
  // keyway in the bore
  front.push(path(`M${cx - 9},${fmt(cy - Math.sqrt(Rbore ** 2 - 81))} V${cy - Rbore - 4.4} H${cx + 9} V${fmt(cy - Math.sqrt(Rbore ** 2 - 81))}`, 'thick keyway'));
  const holeEls = [];
  for (let i = 0; i < holes; i++) {
    const a = (i / holes) * Math.PI * 2 - Math.PI / 2 + (holes === 6 ? Math.PI / 6 : Math.PI / holes);
    const hx = cx + Math.cos(a) * Rpcd, hy = cy + Math.sin(a) * Rpcd;
    holeEls.push(`<g class="hole" data-i="${i}">${circle(hx, hy, rh)}${line(hx - rh - 1.5, hy, hx + rh + 1.5, hy, 'centre')}${line(hx, hy - rh - 1.5, hx, hy + rh + 1.5, 'centre')}</g>`);
  }
  const centres = [
    centreCross(cx, cy, R, 6),
    circle(cx, cy, Rpcd, 'centre'),
  ];
  // cutting plane A–A (vertical through the centre, viewed from the left)
  const cut = [
    line(cx, cy - R - 12, cx, cy + R + 12, 'centre'),
    line(cx, cy - R - 12, cx, cy - R - 6, 'cutting'), line(cx, cy + R + 6, cx, cy + R + 12, 'cutting'),
    line(cx, cy - R - 12, cx + 7, cy - R - 12, 'thin'), line(cx, cy + R + 12, cx + 7, cy + R + 12, 'thin'),
    `<path class="arrow" d="M${cx + 8},${cy - R - 12} l-3,-1.1 v2.2 z"/>`,
    `<path class="arrow" d="M${cx + 8},${cy + R + 12} l-3,-1.1 v2.2 z"/>`,
    text(cx + 4, cy - R - 14, 'A', { size: 5, weight: 600 }), text(cx + 4, cy + R + 18.5, 'A', { size: 5, weight: 600 }),
  ];
  const holeAngleTop = (holes === 6 ? Math.PI / 6 : Math.PI / holes) - Math.PI / 2;
  const dims = [
    dimDia(cx, cy, R, -Math.PI / 4 - 0.12, 'Ø160', { ext: 16 }),
    dimDia(cx, cy, Rbore, Math.PI * 0.8, 'Ø60 H7', { ext: 40 }),
    leader(cx + Math.cos(holeAngleTop) * Rpcd + rh * 0.7, cy + Math.sin(holeAngleTop) * Rpcd - rh * 0.7, cx + 70, cy - 98, `${holes}× Ø${holeD} EQ SP`),
    leader(cx + Rpcd * Math.cos(0.9), cy + Rpcd * Math.sin(0.9), cx + 78, cy + 88, `PCD Ø125`),
  ];
  // section A–A: holes lie in the plane at top/bottom when a hole is on the vertical axis
  const holeOnAxis = holes % 2 === 0 && holes !== 6 ? true : false;
  const hy1 = cy - Rpcd, hy2 = cy + Rpcd;
  const sec = [];
  sec.push(path(`M${sx},${cy - R} H${sx + T} V${cy - Rhub} H${sx + L} V${cy + Rhub} H${sx + T} V${cy + R} H${sx} Z`, 'thick'));
  sec.push(line(sx, cy - Rbore, sx + L, cy - Rbore, 'thick'), line(sx, cy + Rbore, sx + L, cy + Rbore, 'thick'));
  sec.push(line(sx, cy - Rbore - 4.4, sx + L, cy - Rbore - 4.4, 'hidden'));
  // chamfer lines on the hub
  sec.push(line(sx + L - 1.5, cy - Rhub, sx + L, cy - Rhub + 1.5, 'thick'), line(sx + L - 1.5, cy + Rhub, sx + L, cy + Rhub - 1.5, 'thick'));
  if (!holeOnAxis) {
    // section passes between holes: show holes as hidden lines
    [hy1, hy2].forEach((hy) => sec.push(line(sx, hy - rh, sx + T, hy - rh, 'hidden'), line(sx, hy + rh, sx + T, hy + rh, 'hidden')));
  } else {
    [hy1, hy2].forEach((hy) => sec.push(line(sx, hy - rh, sx + T, hy - rh, 'thick'), line(sx, hy + rh, sx + T, hy + rh, 'thick')));
  }
  sec.push(line(sx - 8, cy, sx + L + 8, cy, 'centre'));
  [hy1, hy2].forEach((hy) => sec.push(line(sx - 3, hy, sx + T + 3, hy, 'centre')));
  const holeGap = holeOnAxis ? [[hy1 - rh, hy1 + rh], [hy2 - rh, hy2 + rh]] : [];
  const clipRects = [];
  const band = (y1, y2, x1, x2) => clipRects.push(`<rect x="${x1}" y="${fmt(y1)}" width="${fmt(x2 - x1)}" height="${fmt(y2 - y1)}"/>`);
  // flange bands minus hole gaps
  const flangeBand = (y1, y2) => {
    let cur = y1;
    for (const [g1, g2] of holeGap) if (g1 > y1 && g2 < y2) { band(cur, g1, sx, sx + T); cur = g2; }
    band(cur, y2, sx, sx + T);
  };
  flangeBand(cy - R, cy - Rbore - 4.4); flangeBand(cy + Rbore, cy + R);
  band(cy - Rhub, cy - Rbore - 4.4, sx + T, sx + L); band(cy + Rbore, cy + Rhub, sx + T, sx + L);
  const defs = `<clipPath id="secA">${clipRects.join('')}</clipPath>`;
  const hatchEl = hatch('secA', sx, cy - R, L, 2 * R, 2.5);
  sec.push(text(sx + L / 2, cy - R - 10, 'SECTION A–A', { size: 4.2, weight: 600 }));
  const sdims = [
    dimH(sx, sx + T, cy + R + 9, String(T), { fy1: cy + R, fy2: cy + R }),
    dimH(sx, sx + L, cy + R + 18, '45', { fy1: cy + R, fy2: cy + Rhub }),
    dimV(cy - Rhub, cy + Rhub, sx + L + 14, 'Ø90', { fx1: sx + L, fx2: sx + L }),
    dimV(cy - R, cy + R, sx + L + 26, 'Ø160', { fx1: sx + T, fx2: sx + T }),
    leader(sx + L, cy - Rhub + 0.8, sx + L + 30, cy - Rhub - 22, '1.5 × 45°'),
  ];
  const surf = `<g class="dim">${path(`M${sx - 14},${cy - R - 2} l2,4 l4,-8 h6`, 'thin')}${text(sx - 4, cy - R - 7, 'Ra 1.6', { size: 2.6 })}</g>`;
  const body = [
    frame(W, H),
    `<g id="centrelines">${centres.join('')}</g>`,
    `<g id="outline">${front.join('')}</g>`,
    `<g id="holes">${holeEls.join('')}</g>`,
    `<g id="cutting">${cut.join('')}</g>`,
    `<g id="section">${sec.join('')}</g>`,
    `<g id="hatching">${hatchEl}</g>`,
    `<g id="dims">${dims.join('')}${sdims.join('')}${surf}</g>`,
    notes(22, 246, [
      'REMOVE ALL SHARP EDGES 0.5 × 45°.',
      'GENERAL TOLERANCES ISO 2768-mK.',
      'MATERIAL CERTIFICATE EN 10204 3.1 REQUIRED.',
      `BOLT HOLES ${holes}× Ø${holeD} THROUGH, EQUALLY SPACED.`,
    ]),
    titleBlock(W, H, { title: 'BEARING FLANGE', number, rev, material: 'EN-GJS-400-15 (ductile iron)', mass: holes === 6 ? '2.41 kg' : '2.58 kg' }),
  ];
  return svgDoc(W, H, body.join('\n'), { title: `Bearing flange ${number} rev ${rev}`, defs });
}

/* ------------------------------------------------------------------ shaft */
export function shaft() {
  const y = 130, x0 = 40;
  // steps: [length, diameter]
  const steps = [[30, 30], [22, 40], [120, 45], [10, 55], [60, 40], [40, 32]];
  const out = [], dims = [];
  let x = x0;
  const pts = [];
  steps.forEach(([l, d]) => { pts.push([x, d]); x += l; pts.push([x, d]); });
  const top = pts.map(([px, d], i) => `${i ? 'L' : 'M'}${px},${y - d / 2}`).join(' ');
  const bot = pts.slice().reverse().map(([px, d]) => `L${px},${y + d / 2}`).join(' ');
  out.push(path(`${top} ${bot} Z`, 'thick'));
  x = x0;
  steps.forEach(([l, d], i) => {
    if (i) out.push(line(x, y - Math.max(d, steps[i - 1][1]) / 2, x, y + Math.max(d, steps[i - 1][1]) / 2, 'thick'));
    dims.push(dimV(y - d / 2, y + d / 2, x + l / 2, `Ø${d}${d === 45 ? ' k6' : ''}`));
    x += l;
  });
  // keyway on the Ø45 section
  out.push(path(`M${x0 + 72},${y - 7} h70 a7,7 0 0 1 0,14 h-70 a7,7 0 0 1 0,-14 Z`, 'thick'));
  out.push(line(x0 - 10, y, x + 10, y, 'centre'));
  // overall and step lengths
  dims.push(dimH(x0, x, y + 58, String(x - x0), { fy1: y + 15, fy2: y + 16 }));
  let acc = x0;
  steps.forEach(([l], i) => { dims.push(dimH(acc, acc + l, y + 44, String(l), { fy1: y + steps[i][1] / 2, fy2: y + steps[i][1] / 2 })); acc += l; });
  dims.push(leader(x0 + 110, y - 7, x0 + 130, y - 52, 'KEYWAY 14 N9 × 5.5'));
  // section B–B of the keyway
  const scx = 350, scy = 130, r = 22.5;
  out.push(circle(scx, scy, r), path(`M${scx - 7},${scy - Math.sqrt(r * r - 49)} V${scy - r + 5.5} H${scx + 7} V${scy - Math.sqrt(r * r - 49)}`, 'thick'));
  out.push(centreCross(scx, scy, r, 5), text(scx, scy - r - 12, 'SECTION B–B', { size: 4.2, weight: 600 }));
  const defs = `<clipPath id="secB"><path d="M${scx - r},${scy} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0 Z M${scx - 7},${scy - r} h14 v${5.5 + 0.6} h-14 Z" clip-rule="evenodd"/></clipPath>`;
  const body = [
    frame(W, H),
    `<g id="outline">${out.join('')}</g>`,
    `<g id="hatching">${hatch('secB', scx - r, scy - r, 2 * r, 2 * r, 2.2)}</g>`,
    `<g id="dims">${dims.join('')}</g>`,
    notes(22, 246, ['CHAMFER ALL SHOULDERS 1 × 45°.', 'INDUCTION HARDEN BEARING SEATS 50–55 HRC.', 'RUN-OUT OF Ø45 k6 ≤ 0.02 TO A–B.']),
    titleBlock(W, H, { title: 'DRIVE SHAFT', number: 'EDV-1003', rev: 'A', material: '42CrMo4 +QT', mass: '3.12 kg', scale: '1:2' }),
  ];
  return svgDoc(W, H, body.join('\n'), { title: 'Drive shaft EDV-1003', defs });
}

/* ------------------------------------------------------------------ bracket */
export function bracket() {
  const out = [], dims = [];
  // front view: L profile with a triangular gusset (scale 1:2)
  const fx = 70, fy = 45, t = 6, hgt = 150, len = 110;
  out.push(path(`M${fx},${fy} h${t} v${hgt - t} h${len - t} v${t} h${-len} Z`, 'thick'));
  out.push(path(`M${fx + t},${fy + 55} L${fx + 75},${fy + hgt - t}`, 'thick'), path(`M${fx + t},${fy + 63} L${fx + 67},${fy + hgt - t}`, 'thin'));
  [fx + 42, fx + 88].forEach((hx) => { out.push(line(hx - 2.75, fy + hgt - t, hx - 2.75, fy + hgt, 'hidden'), line(hx + 2.75, fy + hgt - t, hx + 2.75, fy + hgt, 'hidden'), line(hx, fy + hgt - t - 3, hx, fy + hgt + 3, 'centre')); });
  dims.push(dimH(fx, fx + len, fy + hgt + 14, '220', { fy1: fy + hgt, fy2: fy + hgt }));
  dims.push(dimV(fy, fy + hgt, fx - 14, '300', { fx1: fx, fx2: fx }));
  dims.push(dimH(fx, fx + t, fy - 8, '12', { fy1: fy, fy2: fy }));
  // top view (plan of base)
  const tx = 250, ty = 60, tw = 110, td = 75;
  out.push(rect(tx, ty, tw, td, 'thick'));
  out.push(line(tx + t, ty, tx + t, ty + td, 'thick'));
  [[tx + 42, ty + 18], [tx + 88, ty + 18], [tx + 42, ty + 57], [tx + 88, ty + 57]].forEach(([hx, hy]) => { out.push(circle(hx, hy, 2.75), centreCross(hx, hy, 2.75, 2.5)); });
  dims.push(dimH(tx + 42, tx + 88, ty - 10, '92', { fy1: ty + 18, fy2: ty + 18 }));
  dims.push(dimV(ty + 18, ty + 57, tx + tw + 14, '78', { fx1: tx + 88, fx2: tx + 88 }));
  dims.push(leader(tx + 90, ty + 59, tx + 70, ty + 105, '4× Ø11 THRU', { anchor: 'end' }));
  out.push(text(fx + len / 2, fy - 18, 'FRONT VIEW', { size: 4, weight: 600 }), text(tx + tw / 2, ty - 22, 'TOP VIEW', { size: 4, weight: 600 }));
  const body = [
    frame(W, H),
    `<g id="outline">${out.join('')}</g>`,
    `<g id="dims">${dims.join('')}</g>`,
    notes(22, 246, ['FOLD RADIUS R6 INSIDE.', 'DEBURR ALL EDGES.', 'FINISH: POWDER COAT RAL 7016.']),
    titleBlock(W, H, { title: 'MOUNTING BRACKET', number: 'EDV-1004', rev: 'C', material: 'S355MC, t = 12', mass: '4.86 kg', scale: '1:2' }),
  ];
  return svgDoc(W, H, body.join('\n'), { title: 'Mounting bracket EDV-1004' });
}

/* ------------------------------------------------------------------ pump housing (3 sheets) */
export function pumpSheet(n) {
  const out = [], dims = [];
  const cx = 150, cy = 125;
  if (n === 1) {
    // volute outline approximated by a spiral of arcs
    let d = '';
    for (let a = 0; a <= 360; a += 6) {
      const r = 55 + (a / 360) * 30, t = (a * Math.PI) / 180;
      d += `${a ? 'L' : 'M'}${fmt(cx + Math.cos(t) * r)},${fmt(cy + Math.sin(t) * r)} `;
    }
    out.push(path(d, 'thick'), path(`M${cx + 55},${cy} V${cy + 82} M${cx + 85},${cy} V${cy + 82}`, 'thick'), rect(cx + 45, cy + 82, 50, 6, 'thick'), line(cx + 70, cy + 5, cx + 70, cy + 93, 'centre'));
    out.push(circle(cx, cy, 30), circle(cx, cy, 18), centreCross(cx, cy, 85, 6));
    for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; out.push(circle(cx + Math.cos(t) * 42, cy + Math.sin(t) * 42, 3.5)); }
    dims.push(dimDia(cx, cy, 30, Math.PI * 0.8, 'Ø60', { ext: 70 }));
    dims.push(leader(cx + 29, cy - 29, cx + 70, cy - 105, '8× M6 ON PCD Ø84'));
  } else if (n === 2) {
    out.push(path(`M80,90 h140 v100 h-140 Z`, 'thick'), path(`M110,90 v-20 h80 v20`, 'thick'), circle(150, 140, 30), circle(150, 140, 18, 'hidden'));
    out.push(line(70, 140, 230, 140, 'centre'), line(150, 60, 150, 200, 'centre'));
    dims.push(dimH(80, 220, 210, '140', { fy1: 190, fy2: 190 }), dimV(70, 190, 245, '120', { fx1: 190, fx2: 220 }));
  } else {
    // parts list
    const x = 40, y = 50, cols = [12, 30, 70, 50, 14], heads = ['ITEM', 'PART NO.', 'DESCRIPTION', 'MATERIAL', 'QTY'];
    const rows = [
      ['1', 'EDV-2001', 'Volute casing', 'EN-GJL-250', '1'],
      ['2', 'EDV-2002', 'Impeller Ø180, 6 vanes', 'CuSn10', '1'],
      ['3', 'EDV-1003', 'Drive shaft', '42CrMo4 +QT', '1'],
      ['4', 'EDV-1001', 'Bearing flange', 'EN-GJS-400-15', '2'],
      ['5', 'ISO 4762', 'Socket head cap screw M6 × 20', '8.8 zinc', '8'],
      ['6', 'DIN 6885', 'Parallel key 14 × 9 × 70', 'C45K', '1'],
      ['7', 'EDV-2007', 'Mechanical seal Ø40', 'SiC / EPDM', '1'],
      ['8', 'ISO 3601', 'O-ring 170 × 3', 'NBR 70', '1'],
    ];
    const tw = cols.reduce((a, b) => a + b, 0) * 1.6, rh = 9;
    out.push(text(x, y - 8, 'PARTS LIST', { size: 5, anchor: 'start', weight: 600 }));
    out.push(rect(x, y, tw, rh * (rows.length + 1), 'thick'));
    let cxp = x;
    cols.forEach((c, i) => { if (i) out.push(line(cxp, y, cxp, y + rh * (rows.length + 1))); out.push(text(cxp + 2, y + 6, heads[i], { size: 3, anchor: 'start', weight: 600 })); cxp += c * 1.6; });
    rows.forEach((r, j) => {
      const ry = y + rh * (j + 1);
      out.push(line(x, ry, x + tw, ry, j ? 'thin' : 'thick'));
      let px = x; r.forEach((cell, i) => { out.push(text(px + 2, ry + 6, cell, { size: 3, anchor: 'start' })); px += cols[i] * 1.6; });
    });
  }
  const body = [
    frame(W, H),
    `<g id="outline">${out.join('')}</g>`,
    `<g id="dims">${dims.join('')}</g>`,
    titleBlock(W, H, { title: 'PUMP HOUSING', number: 'EDV-2000', rev: 'D', material: n === 3 ? 'SEE PARTS LIST' : 'EN-GJL-250', sheet: `${n} / 3`, mass: '18.4 kg', scale: n === 3 ? '—' : '1:2' }),
  ];
  return svgDoc(W, H, body.join('\n'), { title: `Pump housing EDV-2000 sheet ${n}` });
}
