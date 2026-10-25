// Renders public/social.png (1200 × 630) from the real icon and a real app screenshot.
// Usage: node scripts/make-social.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const b64 = (p) => 'data:image/png;base64,' + readFileSync(join(root, p)).toString('base64');
const font = 'data:font/woff2;base64,' + readFileSync(join(root, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')).toString('base64');
const html = `<!doctype html><html><head><style>
@font-face{font-family:Inter;src:url(${font}) format('woff2');font-weight:100 900}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:Inter;background:#fbfbfd;color:#1d1d1f;position:relative}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgb(10 111 214/.07) 1px,transparent 1px),linear-gradient(90deg,rgb(10 111 214/.07) 1px,transparent 1px);background-size:40px 40px;mask-image:linear-gradient(90deg,#000 0%,transparent 60%)}
.copy{position:absolute;left:72px;top:96px;width:520px}
.brand{display:flex;align-items:center;gap:16px;font-size:26px;font-weight:600;letter-spacing:-.02em}
.brand img{width:64px;height:64px}
h1{margin-top:52px;font-size:84px;line-height:.98;letter-spacing:-.05em;font-weight:680}
h1 span{color:#0a6fd6}
p{margin-top:30px;font-size:25px;line-height:1.4;color:#4b4d55;letter-spacing:-.01em}
.shot{position:absolute;left:600px;top:118px;width:900px;border-radius:14px;overflow:hidden;
 box-shadow:0 0 0 1px rgb(0 0 0/.25),0 30px 70px -20px rgb(16 24 40/.45),0 60px 120px -40px rgb(10 111 214/.35);
 transform:perspective(1800px) rotateY(-14deg) rotateX(4deg);transform-origin:left center}
.shot img{display:block;width:100%}
.lights{position:absolute;left:1.39%;top:2.22%;width:3.61%;height:1.33%;display:flex;justify-content:space-between}
.lights i{width:23%;height:100%;border-radius:50%}
.lights i:nth-child(1){background:#ff5f57}.lights i:nth-child(2){background:#febc2e}.lights i:nth-child(3){background:#28c840}
</style></head><body><div class="grid"></div>
<div class="copy"><div class="brand"><img src="${b64('src/assets/icon.png')}">ENG Drawing Viewer</div>
<h1>Every detail.<br><span>Clearly.</span></h1>
<p>View, mark up, convert and present engineering drawings. Free, and all on your computer.</p></div>
<div class="shot"><span class="lights"><i></i><i></i><i></i></span><img src="${b64('src/assets/screens/mark-dark.png')}"></div>
</body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(root, 'public/social.png') });
await browser.close();
console.log('wrote public/social.png');
