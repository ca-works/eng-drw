import type { APIRoute } from 'astro';
export const GET: APIRoute = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>ENG Drawing Viewer updates</title><link>https://ca-works.github.io/eng-drw/changelog/</link><description>Public release updates for ENG Drawing Viewer. The first release is in preparation.</description><language>en</language></channel></rss>`,
    { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } },
  );
