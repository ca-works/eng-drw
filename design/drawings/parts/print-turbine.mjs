// Prints the homepage's turbine-blade drawing (as rendered by the built site, with its real CSS and fonts)
// to vector PDFs for the demo library. Needs `npm run build` and a preview server on :4321.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', 'Demo Project', 'Turbine Stage');
mkdirSync(root, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4321/eng-drw/', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  document.documentElement.dataset.theme = 'light';
  const svg = document.querySelector('svg.drawing');
  const keep = svg.cloneNode(true);
  keep.querySelectorAll('[data-reveal],[style]').forEach((el) => { el.removeAttribute('style'); el.removeAttribute('data-reveal'); });
  document.body.replaceChildren(keep);
  document.body.style.cssText = 'margin:0;background:#fff;color:#263343';
  keep.style.cssText = 'width:820pt;height:540pt;display:block;color:#263343';
  const st = document.createElement('style');
  st.textContent = '@page{size:820pt 540pt;margin:0} *{animation:none!important;transition:none!important} svg.drawing *{opacity:1!important;stroke-dashoffset:0!important}';
  document.head.append(st);
});
await page.evaluate(() => document.fonts.ready);
for (const [name, pages] of [['ENG-003 Rotor blade.pdf', 1], ['ENG-003 Blade review (3 sheets).pdf', 3]]) {
  if (pages > 1) await page.evaluate((n) => { const s = document.body.firstElementChild; while (document.body.children.length < n) document.body.append(s.cloneNode(true)); }, pages);
  await page.pdf({ path: join(root, name), width: '289.28mm', height: '190.5mm', printBackground: true });
  console.log('pdf', name);
}
await browser.close();
