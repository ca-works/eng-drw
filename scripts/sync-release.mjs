// Reads the app's GitHub releases and writes src/data/release.json for the download buttons.
//
// Each platform comes from the newest release that contains it:
//   macOS   the newest stable release with the Apple silicon DMG
//   Windows the newest release with the Windows installer and portable ZIP (a pre-release
//           is shown as "Preview")
//   source  the newest release with a source ZIP
// Every asset is checked against its release's SHA256SUMS.txt and GitHub's own digest, and must
// be served from this repository's releases. Any API failure stops the build, so the site never
// shows stale or unverified downloads. With no releases at all the site says "Coming soon".
import { writeFile } from 'node:fs/promises';

const repo = 'ca-works/eng-drawing-viewer';
const headers = {
  Accept: 'application/vnd.github+json',
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
};

let result = {
  status: 'unreleased',
  version: null,
  assets: [],
  notes: 'The first public release is being prepared.',
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
  async function verified(r, platform, name) {
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
      platform,
      name,
      url: a.browser_download_url,
      size: a.size,
      sha256: hash,
      version: versionOf(r),
      preview: Boolean(r.prerelease),
      published: r.published_at,
    };
  }

  const assets = [];
  const used = [];
  // Each group: the files one platform needs, and whether pre-releases may supply it.
  const wanted = [
    [[['macos', (v) => `ENG-Drawing-Viewer-${v}-macOS-AppleSilicon.dmg`]], true],
    [
      [
        ['windows', (v) => `ENG-Drawing-Viewer-${v}-Windows-x64-Setup.exe`],
        ['windows-portable', (v) => `ENG-Drawing-Viewer-${v}-Windows-x64-Portable.zip`],
      ],
      false,
    ],
    [[['source', (v) => `eng-drawing-viewer-${v}-source.zip`]], false],
  ];
  for (const [group, stableOnly] of wanted) {
    for (const r of releases) {
      if (stableOnly && r.prerelease) continue;
      const v = versionOf(r);
      if (!r.assets.some((a) => a.name === group[0][1](v))) continue;
      for (const [platform, file] of group) {
        const a = await verified(r, platform, file(v));
        if (!a) throw Error(`${r.tag_name} has ${group[0][1](v)} but not ${file(v)}`);
        assets.push(a);
      }
      if (!used.includes(r)) used.push(r);
      break;
    }
  }
  if (assets.length) {
    const mac = assets.find((a) => a.platform === 'macos');
    const newest = [...used].sort(
      (a, b) => Date.parse(b.published_at) - Date.parse(a.published_at),
    )[0];
    result = {
      status: 'available',
      version: mac ? mac.version : assets[0].version,
      assets,
      notes: newest.body || '',
      published: newest.published_at,
      releases: used.map((r) => ({
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
  `Release state: ${result.status}` +
    (result.assets.length
      ? ` (${result.assets.map((a) => `${a.platform} ${a.version}`).join(', ')})`
      : ''),
);
