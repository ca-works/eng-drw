import type { APIRoute } from 'astro';
import release from '../data/release.json';

const site = 'https://ca-works.github.io/eng-drw/';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = () => {
  const item =
    release.status === 'available' && 'published' in release
      ? `<item><title>ENG Drawing Viewer ${esc(String(release.version))}</title>` +
        `<link>${site}changelog/</link><guid isPermaLink="false">eng-drawing-viewer-${esc(String(release.version))}</guid>` +
        `<pubDate>${new Date(String(release.published)).toUTCString()}</pubDate>` +
        `<description>Version ${esc(String(release.version))} for Mac is available: free and open source. ` +
        `Download it from ${site}download/</description></item>`
      : '';
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>ENG Drawing Viewer updates</title>` +
      `<link>${site}changelog/</link><description>Releases of ENG Drawing Viewer.</description>` +
      `<language>en</language>${item}</channel></rss>`,
    { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } },
  );
};
