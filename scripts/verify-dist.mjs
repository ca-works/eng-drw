import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
const root = resolve('dist'),
  base = '/eng-drw/';
let errors = [];
let pages = 0;
let three = 0;
let js = 0,
  css = 0;
async function walk(d) {
  return (
    await Promise.all(
      (await readdir(d, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? walk(join(d, e.name)) : join(d, e.name),
      ),
    )
  ).flat();
}
for (const file of await walk(root)) {
  const text = await readFile(file);
  if (file.endsWith('.js')) {
    if (file.includes('/three-engine.')) three += gzipSync(text).length;
    else js += gzipSync(text).length;
  }
  if (file.endsWith('.css')) css += gzipSync(text).length;
  if (!file.endsWith('.html')) continue;
  pages++;
  const html = text.toString();
  for (const tag of [
    '<title>',
    'name="description"',
    'rel="canonical"',
    'property="og:image"',
  ])
    if (!html.includes(tag)) errors.push(`${file}: missing ${tag}`);
  for (const m of html.matchAll(/(?:href|src|poster)="([^"]+)"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|data:|#)/.test(u)) continue;
    if (u.startsWith('/') && !u.startsWith(base)) {
      errors.push(`${file}: base-path escape ${u}`);
      continue;
    }
    const clean = u.split(/[?#]/)[0];
    if (!clean) continue;
    const target = u.startsWith('/')
      ? resolve(root, clean.slice(base.length))
      : resolve(dirname(file), clean);
    try {
      const s = await stat(target);
      if (s.isDirectory()) await stat(join(target, 'index.html'));
    } catch {
      errors.push(`${file}: missing ${u}`);
    }
  }
  for (const m of html.matchAll(/(?:src|href)="(https?:[^" ]+)"/g)) {
    const u = new URL(m[1]);
    if (
      ![
        'ca-works.github.io',
        'github.com',
        'www.gnu.org',
        'docs.github.com',
      ].includes(u.hostname)
    )
      errors.push(`${file}: unexpected external URL ${m[1]}`);
  }
}
if (js > 102400) errors.push(`JS gzip ${js} exceeds 100 KiB`);
if (three > 204800)
  errors.push(`Optional Three.js gzip ${three} exceeds 200 KiB`);
if (css > 30720) errors.push(`CSS gzip ${css} exceeds 30 KiB`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(
  `Verified ${pages} pages under ${base}; JS ${Math.round(js / 1024)} KiB gzip, optional 3D ${Math.round(three / 1024)} KiB gzip, CSS ${Math.round(css / 1024)} KiB gzip.`,
);
