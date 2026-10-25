// Generates the demo drawing SVGs and prints them to vector PDFs in a "Demo Project" folder tree.
// Usage: node design/drawings/parts/generate.mjs [--pdf]
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { flange, shaft, bracket, pumpSheet } from './parts.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const svgDir = join(here, '..', '.parts-svg');
const pdfRoot = join(here, '..', 'Demo Project');
mkdirSync(svgDir, { recursive: true });

const drawings = {
  'flange-rev-b': flange(),
  'flange-rev-c': flange({ holes: 8, holeD: 12, thickness: 20, rev: 'C' }),
  shaft: shaft(),
  bracket: bracket(),
  'pump-1': pumpSheet(1),
  'pump-2': pumpSheet(2),
  'pump-3': pumpSheet(3),
};
for (const [name, svg] of Object.entries(drawings)) writeFileSync(join(svgDir, `${name}.svg`), svg);

console.log(`wrote ${Object.keys(drawings).length} SVGs`);

if (process.argv.includes('--pdf')) {
  const { chromium } = await import('@playwright/test');
  const fontCss = readFileSync(join(here, '..', '..', '..', 'node_modules', '@fontsource-variable', 'inter', 'index.css'), 'utf8')
    .replaceAll('./files/', pathToFileURL(join(here, '..', '..', '..', 'node_modules', '@fontsource-variable', 'inter', 'files')).href + '/');
  const files = [
    ['Mechanical/Pump Assembly/EDV-2000 Pump housing (3 sheets).pdf', ['pump-1', 'pump-2', 'pump-3']],
    ['Mechanical/Pump Assembly/EDV-1001 Bearing flange rev B.pdf', ['flange-rev-b']],
    ['Mechanical/Pump Assembly/EDV-1003 Drive shaft.pdf', ['shaft']],
    ['Mechanical/Pump Assembly/Revisions/EDV-1001 Bearing flange rev C.pdf', ['flange-rev-c']],
    ['Mechanical/Brackets/EDV-1004 Mounting bracket.pdf', ['bracket']],
  ];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [rel, names] of files) {
    const body = names.map((n) => `<section>${readFileSync(join(svgDir, `${n}.svg`), 'utf8')}</section>`).join('');
    const htmlPath = join(svgDir, 'print.html');
    writeFileSync(htmlPath, `<!doctype html><html><head><style>${fontCss}
      @page{size:420mm 297mm;margin:0} html,body{margin:0}
      section{width:420mm;height:297mm;page-break-after:always;overflow:hidden}
      section:last-child{page-break-after:auto}
      section svg{width:420mm;height:297mm;display:block}</style></head><body>${body}</body></html>`);
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const out = join(pdfRoot, rel);
    mkdirSync(dirname(out), { recursive: true });
    await page.evaluate(() => document.fonts.load('16px "Inter Variable"'));
    await page.pdf({ path: out, width: '420mm', height: '297mm', printBackground: true, preferCSSPageSize: true });
    console.log('pdf', rel);
  }
  await browser.close();
}
