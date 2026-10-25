// Small SVG helpers for technical drawings. Units are millimetres.
export const fmt = (n) => +n.toFixed(3);

export const STROKE = { thick: 0.5, thin: 0.25, centre: 0.18 };

export function line(x1, y1, x2, y2, cls = 'thin') {
  return `<line class="${cls}" x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}"/>`;
}
export function circle(cx, cy, r, cls = 'thick') {
  return `<circle class="${cls}" cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}"/>`;
}
export function path(d, cls = 'thick') {
  return `<path class="${cls}" d="${d}"/>`;
}
export function rect(x, y, w, h, cls = 'thin') {
  return `<rect class="${cls}" x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}"/>`;
}
export function text(x, y, s, { size = 3.5, anchor = 'middle', rotate = 0, weight = 400, cls = 'txt' } = {}) {
  const tr = rotate ? ` transform="rotate(${rotate} ${fmt(x)} ${fmt(y)})"` : '';
  return `<text class="${cls}" x="${fmt(x)}" y="${fmt(y)}" font-size="${size}" text-anchor="${anchor}" font-weight="${weight}"${tr}>${esc(s)}</text>`;
}
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function arrowHead(x, y, angle, len = 3, w = 1.1) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const bx = x - c * len, by = y - s * len;
  const px = -s * w / 2, py = c * w / 2;
  return `<path class="arrow" d="M${fmt(x)},${fmt(y)} L${fmt(bx + px)},${fmt(by + py)} L${fmt(bx - px)},${fmt(by - py)} Z"/>`;
}

/** Horizontal linear dimension between x1 and x2 measured at height y (feature at fy1/fy2). */
export function dimH(x1, x2, y, label, { fy1 = null, fy2 = null, gap = 1.5, over = 2 } = {}) {
  const out = [];
  if (fy1 !== null) out.push(line(x1, fy1 + Math.sign(y - fy1) * gap, x1, y + Math.sign(y - fy1) * over, 'thin ext'));
  if (fy2 !== null) out.push(line(x2, fy2 + Math.sign(y - fy2) * gap, x2, y + Math.sign(y - fy2) * over, 'thin ext'));
  out.push(line(x1, y, x2, y, 'thin dimline'));
  out.push(arrowHead(x1, y, Math.PI), arrowHead(x2, y, 0));
  out.push(text((x1 + x2) / 2, y - 1.2, label));
  return `<g class="dim">${out.join('')}</g>`;
}

/** Vertical linear dimension between y1 and y2 at x (feature at fx). */
export function dimV(y1, y2, x, label, { fx1 = null, fx2 = null, gap = 1.5, over = 2 } = {}) {
  const out = [];
  if (fx1 !== null) out.push(line(fx1 + Math.sign(x - fx1) * gap, y1, x + Math.sign(x - fx1) * over, y1, 'thin ext'));
  if (fx2 !== null) out.push(line(fx2 + Math.sign(x - fx2) * gap, y2, x + Math.sign(x - fx2) * over, y2, 'thin ext'));
  out.push(line(x, y1, x, y2, 'thin dimline'));
  out.push(arrowHead(x, y1, -Math.PI / 2), arrowHead(x, y2, Math.PI / 2));
  out.push(text(x - 1.2, (y1 + y2) / 2, label, { rotate: -90 }));
  return `<g class="dim">${out.join('')}</g>`;
}

/** Diameter dimension across a circle at an angle (radians). */
export function dimDia(cx, cy, r, angle, label, { ext = 14 } = {}) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const x1 = cx - c * r, y1 = cy - s * r, x2 = cx + c * r, y2 = cy + s * r;
  const x3 = cx + c * (r + ext), y3 = cy + s * (r + ext);
  const out = [line(x1, y1, x3, y3, 'thin dimline'), arrowHead(x1, y1, angle + Math.PI), arrowHead(x2, y2, angle)];
  const shelf = c >= 0 ? 1 : -1;
  out.push(line(x3, y3, x3 + shelf * (label.length * 2.1 + 2), y3, 'thin dimline'));
  out.push(text(x3 + shelf * 1, y3 - 1.2, label, { anchor: shelf > 0 ? 'start' : 'end' }));
  return `<g class="dim">${out.join('')}</g>`;
}

/** Leader with a note. */
export function leader(x1, y1, x2, y2, label, { anchor = 'start' } = {}) {
  const ang = Math.atan2(y1 - y2, x1 - x2);
  const dir = anchor === 'start' ? 1 : -1;
  const len = label.length * 2.05 + 2;
  return `<g class="dim">${line(x2, y2, x1, y1, 'thin dimline')}${arrowHead(x1, y1, ang)}${line(x2, y2, x2 + dir * len, y2, 'thin dimline')}${text(x2 + dir * 1, y2 - 1.2, label, { anchor })}</g>`;
}

export function centreCross(cx, cy, r, ext = 3) {
  return line(cx - r - ext, cy, cx + r + ext, cy, 'centre') + line(cx, cy - r - ext, cx, cy + r + ext, 'centre');
}

/** 45° hatch lines clipped to a clip-path id. */
export function hatch(id, x, y, w, h, spacing = 2.5) {
  const out = [];
  for (let k = -h; k < w + h; k += spacing) out.push(line(x + k, y + h, x + k + h, y, 'hatchline'));
  return `<g class="hatch" clip-path="url(#${id})">${out.join('')}</g>`;
}

/** ISO 5457-style frame with zone markers for a sheet W×H. */
export function frame(W, H, { cols = 8, rows = 6 } = {}) {
  const m = 10, inner = 5;
  const out = [rect(m, m, W - 2 * m, H - 2 * m, 'thick frame'), rect(m + inner, m + inner, W - 2 * (m + inner), H - 2 * (m + inner), 'thin frame')];
  const zw = (W - 2 * m) / cols, zh = (H - 2 * m) / rows;
  for (let i = 1; i < cols; i++) {
    out.push(line(m + i * zw, m, m + i * zw, m + inner), line(m + i * zw, H - m - inner, m + i * zw, H - m));
  }
  for (let j = 1; j < rows; j++) {
    out.push(line(m, m + j * zh, m + inner, m + j * zh), line(W - m - inner, m + j * zh, W - m, m + j * zh));
  }
  for (let i = 0; i < cols; i++) {
    out.push(text(m + (i + 0.5) * zw, m + 3.6, String(i + 1), { size: 3, cls: 'txt zone' }));
    out.push(text(m + (i + 0.5) * zw, H - m - 1.2, String(i + 1), { size: 3, cls: 'txt zone' }));
  }
  for (let j = 0; j < rows; j++) {
    const L = String.fromCharCode(65 + j);
    out.push(text(m + 2.5, m + (j + 0.5) * zh + 1, L, { size: 3, cls: 'txt zone' }));
    out.push(text(W - m - 2.5, m + (j + 0.5) * zh + 1, L, { size: 3, cls: 'txt zone' }));
  }
  // centring marks
  out.push(line(W / 2, 0 + 4, W / 2, m + inner, 'thick'), line(W / 2, H - m - inner, W / 2, H - 4, 'thick'));
  out.push(line(4, H / 2, m + inner, H / 2, 'thick'), line(W - m - inner, H / 2, W - 4, H / 2, 'thick'));
  return `<g id="frame">${out.join('')}</g>`;
}

/** Title block anchored to the bottom-right inside corner. */
export function titleBlock(W, H, t) {
  const x2 = W - 15, y2 = H - 15, w = 180, h = 44;
  const x = x2 - w, y = y2 - h;
  const out = [rect(x, y, w, h, 'thick')];
  // rows
  out.push(line(x, y + 10, x2, y + 10), line(x, y + 24, x2, y + 24), line(x, y + 34, x2, y + 34));
  // columns
  out.push(line(x + 110, y + 10, x + 110, y2), line(x + 140, y + 24, x + 140, y2), line(x + 60, y + 24, x + 60, y2), line(x + 30, y + 34, x + 30, y2), line(x + 85, y + 34, x + 85, y2));
  const lab = (lx, ly, s) => text(lx, ly, s, { size: 1.8, anchor: 'start', cls: 'txt label' });
  const val = (lx, ly, s, size = 3.2, weight = 500) => text(lx, ly, s, { size, anchor: 'start', weight });
  out.push(text(x + 2, y + 4.2, 'SAMPLE DRAWING · ENG Drawing Viewer', { size: 2.6, anchor: 'start', weight: 600, cls: 'txt brand' }));
  out.push(text(x + 2, y + 8.3, 'Fictional part for demonstration. Not for manufacture.', { size: 2, anchor: 'start', cls: 'txt label' }));
  out.push(lab(x + 2, y + 13, 'TITLE'), val(x + 2, y + 20.5, t.title, 5.2, 600));
  out.push(lab(x + 112, y + 13, 'DRAWING NO.'), val(x + 112, y + 20.5, t.number, 4.6, 600));
  out.push(lab(x + 2, y + 27, 'MATERIAL'), val(x + 2, y + 31.8, t.material, 2.6));
  out.push(lab(x + 62, y + 27, 'GENERAL TOLERANCES'), val(x + 62, y + 31.8, t.tolerances ?? 'ISO 2768-mK', 2.6));
  out.push(lab(x + 112, y + 27, 'REV'), val(x + 112, y + 31.8, t.rev, 3.2, 600));
  out.push(lab(x + 142, y + 27, 'SHEET'), val(x + 142, y + 31.8, t.sheet ?? '1 / 1', 3.2));
  out.push(lab(x + 2, y + 37, 'SCALE'), val(x + 2, y + 42, t.scale ?? '1:1', 3));
  out.push(lab(x + 32, y + 37, 'SIZE'), val(x + 32, y + 42, t.size ?? 'A3', 3));
  out.push(lab(x + 62, y + 37, 'MASS'), val(x + 62, y + 42, t.mass ?? '—', 3));
  out.push(lab(x + 87, y + 37, 'UNITS'), val(x + 87, y + 42, 'mm', 3));
  out.push(lab(x + 112, y + 37, 'PROJECTION'));
  // first-angle projection symbol
  const px = x + 150, py = y + 39.5;
  out.push(path(`M${px},${py - 2.5} L${px + 7},${py - 1.5} L${px + 7},${py + 1.5} L${px},${py + 2.5} Z`, 'thin'));
  out.push(line(px - 3, py, px + 26, py, 'centre'));
  out.push(circle(px + 17, py, 2.5, 'thin'), circle(px + 17, py, 1.5, 'thin'));
  return `<g id="titleblock">${out.join('')}</g>`;
}

export function notes(x, y, items) {
  const out = [text(x, y, 'NOTES', { size: 3, anchor: 'start', weight: 600 })];
  items.forEach((s, i) => out.push(text(x, y + 5 + i * 4.4, `${i + 1}. ${s}`, { size: 2.6, anchor: 'start' })));
  return `<g id="notes">${out.join('')}</g>`;
}

export function svgDoc(W, H, body, { title = '', defs = '' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" class="eng-drawing" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<style>
.eng-drawing{background:#fff}
.eng-drawing *{vector-effect:none}
.eng-drawing .thick{fill:none;stroke:#111;stroke-width:${STROKE.thick};stroke-linecap:round;stroke-linejoin:round}
.eng-drawing .thin{fill:none;stroke:#111;stroke-width:${STROKE.thin};stroke-linecap:round}
.eng-drawing .hidden{fill:none;stroke:#111;stroke-width:${STROKE.thin};stroke-dasharray:2.4 1.2}
.eng-drawing .centre{fill:none;stroke:#111;stroke-width:${STROKE.centre};stroke-dasharray:8 1.5 1 1.5}
.eng-drawing .hatchline{fill:none;stroke:#111;stroke-width:0.13}
.eng-drawing .arrow{fill:#111;stroke:none}
.eng-drawing .txt{fill:#111;font-family:"Inter Variable","Inter","Helvetica Neue",Arial,sans-serif;letter-spacing:0.02em}
.eng-drawing .label{fill:#555}
.eng-drawing .zone{fill:#444}
.eng-drawing .cutting{fill:none;stroke:#111;stroke-width:0.7}
</style>
<defs>${defs}</defs>
<rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>
${body}
</svg>`;
}
