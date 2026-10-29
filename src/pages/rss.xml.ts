import type { APIRoute } from 'astro';
import release from '../data/release.json';

const site = 'https://ca-works.github.io/eng-drw/';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// One item per verified public release (newest first), as listed by scripts/sync-release.mjs.
export const GET: APIRoute = () => {
  const items = (release.releases as { version: string; url: string; published: string; preview: boolean }[])
    .map((r) => {
      const platforms = release.editions
        .filter((e) => e.available && e.version === r.version)
        .map((e) => ({ 'macos-universal': 'Mac (Universal)', 'macos-apple-silicon': 'Mac (Apple Silicon)', 'windows-x64': 'Windows', 'linux-x86_64': 'Linux' })[e.id]);
      const what = platforms.length ? ` for ${platforms.join(', ')}` : '';
      return (
        `<item><title>ENG Drawing Viewer ${esc(r.version)}${r.preview ? ' (Preview)' : ''}</title>` +
        `<link>${esc(r.url)}</link><guid isPermaLink="false">eng-drawing-viewer-${esc(r.version)}</guid>` +
        `<pubDate>${new Date(r.published).toUTCString()}</pubDate>` +
        `<description>Version ${esc(r.version)}${esc(what)} is available${r.preview ? ' as a Preview' : ''}: free and open source. ` +
        `Download it from ${site}download/</description></item>`
      );
    })
    .join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>ENG Drawing Viewer updates</title>` +
      `<link>${site}changelog/</link><description>Releases of ENG Drawing Viewer.</description>` +
      `<language>en</language>${items}</channel></rss>`,
    { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } },
  );
};
