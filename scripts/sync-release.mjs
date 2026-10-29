// Reads the app's GitHub releases and writes src/data/release.json for the download buttons.
//
// There are four editions, always listed in this order:
//   macos-universal      ENG-Drawing-Viewer-macOS-Universal.dmg              (2.3.0 and later)
//   macos-apple-silicon  ENG-Drawing-Viewer-macOS-Apple-Silicon.dmg          (2.3.0 and later)
//                        ENG-Drawing-Viewer-<v>-macOS-AppleSilicon.dmg       (2.2.x)
//   windows-x64          ENG-Drawing-Viewer-Windows-x64.zip                  (2.3.0 and later)
//                        ENG-Drawing-Viewer-<v>-Windows-x64-Setup.exe        (2.2.x, with the
//                        ENG-Drawing-Viewer-<v>-Windows-x64-Portable.zip      portable ZIP as an extra)
//   linux-x86_64         ENG-Drawing-Viewer-Linux-x86_64.AppImage            (2.3.0 and later)
// plus the source:       eng-drawing-viewer-<v>-source.zip
//
// Each edition comes from the newest published (non-draft) release that contains its file; a
// pre-release is marked "preview". Versionless names are accepted only from 2.3.0 on and versioned
// names only before it, so a 2.2.0 file can never be shown as 2.3.0. Every file is checked against
// its release's SHA256SUMS.txt and GitHub's own digest, and must be served from this repository's
// releases. Any API failure stops the build, so the site never shows stale or unverified
// downloads. An edition no release contains is written with "available": false ("Coming soon").
import { writeFile } from 'node:fs/promises';

const repo = 'ca-works/eng-drawing-viewer';
const headers = {
  Accept: 'application/vnd.github+json',
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
};

const compare = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};
const versionless = (v) => compare(v, '2.3.0') >= 0;
// For each edition: its file for a version (null when that version can't have it) and the extra
// files that must accompany it.
const EDITIONS = [
  {
    id: 'macos-universal',
    file: (v) => (versionless(v) ? 'ENG-Drawing-Viewer-macOS-Universal.dmg' : null),
  },
  {
    id: 'macos-apple-silicon',
    file: (v) =>
      versionless(v)
        ? 'ENG-Drawing-Viewer-macOS-Apple-Silicon.dmg'
        : `ENG-Drawing-Viewer-${v}-macOS-AppleSilicon.dmg`,
  },
  {
    id: 'windows-x64',
    file: (v) =>
      versionless(v)
        ? 'ENG-Drawing-Viewer-Windows-x64.zip'
        : `ENG-Drawing-Viewer-${v}-Windows-x64-Setup.exe`,
    extras: (v) => (versionless(v) ? [] : [`ENG-Drawing-Viewer-${v}-Windows-x64-Portable.zip`]),
  },
  {
    id: 'linux-x86_64',
    file: (v) => (versionless(v) ? 'ENG-Drawing-Viewer-Linux-x86_64.AppImage' : null),
  },
];

let result = {
  status: 'unreleased',
  version: null,
  editions: EDITIONS.map(({ id }) => ({ id, available: false })),
  source: null,
  notes: 'The first public release is being prepared.',
  releases: [],
};

const response = await fetch(
  `https://api.github.com/repos/${repo}/releases?per_page=30`,
  { headers },
);
if (response.status !== 404) {
  if (!response.ok)
    throw Error(`Release API failed (${response.status}); refusing stale release data`);
  const releases = (await response.json())
    .filter((r) => !r.draft)
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));

  const sumsCache = new Map();
  async function checksums(r) {
    if (!sumsCache.has(r.tag_name)) {
      const file = r.assets.find((a) => a.name === 'SHA256SUMS.txt');
      if (!file) throw Error(`${r.tag_name} lacks SHA256SUMS.txt`);
      const res = await fetch(file.browser_download_url);
      if (!res.ok) throw Error(`Cannot read checksums of ${r.tag_name}`);
      sumsCache.set(r.tag_name, await res.text());
    }
    return sumsCache.get(r.tag_name);
  }
  const versionOf = (r) => {
    const v = r.tag_name.replace(/^v/, '');
    if (!/^\d+\.\d+\.\d+$/.test(v)) throw Error(`Invalid version ${r.tag_name}`);
    return v;
  };
  async function verified(r, name) {
    const a = r.assets.find((x) => x.name === name);
    if (!a) return null;
    const sums = await checksums(r);
    const hash = sums
      .split('\n')
      .map((l) => l.trim().split(/\s+\*?/))
      .find(([, n]) => n === name)?.[0];
    if (!hash || !/^[a-f0-9]{64}$/.test(hash) || a.digest !== `sha256:${hash}`)
      throw Error(`Checksum mismatch for ${name}`);
    if (!a.browser_download_url.startsWith(`https://github.com/${repo}/releases/download/`))
      throw Error('Unexpected download host');
    return {
      name,
      url: a.browser_download_url,
      size: a.size,
      sha256: hash,
      version: versionOf(r),
      preview: Boolean(r.prerelease),
      published: r.published_at,
      release_url: r.html_url,
    };
  }

  const used = new Set();
  const editions = [];
  for (const edition of EDITIONS) {
    let found = { id: edition.id, available: false };
    for (const r of releases) {
      const v = versionOf(r);
      const name = edition.file(v);
      if (!name || !r.assets.some((a) => a.name === name)) continue;
      const main = await verified(r, name);
      const extras = [];
      for (const extra of edition.extras?.(v) ?? []) {
        const e = await verified(r, extra);
        if (!e) throw Error(`${r.tag_name} has ${name} but not ${extra}`);
        extras.push(e);
      }
      found = { id: edition.id, available: true, ...main, extras };
      used.add(r);
      break;
    }
    editions.push(found);
  }
  let source = null;
  for (const r of releases) {
    source = await verified(r, `eng-drawing-viewer-${versionOf(r)}-source.zip`);
    if (source) {
      used.add(r);
      break;
    }
  }
  const available = editions.filter((e) => e.available);
  if (available.length) {
    const byDate = [...used].sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
    const stable = available.filter((e) => !e.preview);
    result = {
      status: 'available',
      // The newest version offered as a stable download (a preview only if nothing is stable).
      version: (stable.length ? stable : available).map((e) => e.version).sort(compare).at(-1),
      editions,
      source,
      notes: byDate[0].body || '',
      published: byDate[0].published_at,
      releases: byDate.map((r) => ({
        version: versionOf(r),
        url: r.html_url,
        published: r.published_at,
        preview: Boolean(r.prerelease),
      })),
    };
  }
}
await writeFile('src/data/release.json', JSON.stringify(result, null, 2) + '\n');
console.log(
  `Release state: ${result.status} (` +
    result.editions
      .map((e) => `${e.id} ${e.available ? e.version + (e.preview ? ' preview' : '') : 'coming soon'}`)
      .join(', ') +
    (result.source ? `, source ${result.source.version}` : '') +
    ')',
);
