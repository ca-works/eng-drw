import { writeFile } from 'node:fs/promises';
const repo = 'ca-works/eng-drawing-viewer';
const endpoint = `https://api.github.com/repos/${repo}/releases/latest`;
const response = await fetch(endpoint, {
  headers: {
    Accept: 'application/vnd.github+json',
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  },
});
let result = {
  status: 'unreleased',
  version: null,
  assets: [],
  notes:
    'The first public release is being prepared. Windows is being rebuilt.',
};
if (response.status !== 404) {
  if (!response.ok)
    throw Error(
      `Release API failed (${response.status}); refusing stale release data`,
    );
  const r = await response.json();
  if (r.draft || r.prerelease) throw Error('Expected a public stable release');
  const version = r.tag_name.replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error('Invalid version');
  const checks = r.assets.find((a) => a.name === 'SHA256SUMS.txt');
  if (!checks) throw Error('Release lacks SHA256SUMS.txt');
  const sumsResponse = await fetch(checks.browser_download_url);
  if (!sumsResponse.ok) throw Error('Cannot read checksums');
  const sums = await sumsResponse.text();
  const patterns = [
    ['macos', `ENG-Drawing-Viewer-${version}-macOS-AppleSilicon.dmg`],
    ['source', `eng-drawing-viewer-${version}-source.zip`],
  ];
  const assets = [];
  for (const [platform, name] of patterns) {
    const a = r.assets.find((a) => a.name === name);
    if (!a) throw Error(`Missing ${name}`);
    const hash = sums
      .split('\n')
      .map((l) => l.trim().split(/\s+\*?/))
      .find(([, n]) => n === name)?.[0];
    if (
      !hash ||
      !/^([a-f0-9]{64})$/.test(hash) ||
      a.digest !== `sha256:${hash}`
    )
      throw Error(`Checksum mismatch for ${name}`);
    if (
      !a.browser_download_url.startsWith(
        `https://github.com/${repo}/releases/download/`,
      )
    )
      throw Error('Unexpected download host');
    assets.push({
      platform,
      name,
      url: a.browser_download_url,
      size: a.size,
      sha256: hash,
    });
  }
  result = {
    status: 'available',
    version,
    assets,
    notes: r.body || '',
    published: r.published_at,
  };
}
await writeFile(
  'src/data/release.json',
  JSON.stringify(result, null, 2) + '\n',
);
console.log(`Release state: ${result.status}`);
