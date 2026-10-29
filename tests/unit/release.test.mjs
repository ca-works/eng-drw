import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const script = pathToFileURL(resolve('scripts/sync-release.mjs')).href;
function run(responses) {
  const dir = mkdtempSync(join(tmpdir(), 'eng-release-test-'));
  mkdirSync(join(dir, 'src/data'), { recursive: true });
  writeFileSync(join(dir, 'src/data/release.json'), 'original');
  const code = `const responses=${JSON.stringify(responses)};globalThis.fetch=async()=>{const r=responses.shift();return {status:r.status,ok:r.status>=200&&r.status<300,json:async()=>r.body,text:async()=>r.text}};await import(${JSON.stringify(script)});`;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', code],
    { cwd: dir, encoding: 'utf8' },
  );
  const output = readFileSync(join(dir, 'src/data/release.json'), 'utf8');
  rmSync(dir, { recursive: true });
  return { ...result, output };
}
test('missing public release is honestly unreleased', () => {
  const r = run([{ status: 404 }]);
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.output).status, 'unreleased');
});
test('API errors fail without replacing last verified snapshot', () => {
  const r = run([{ status: 503 }]);
  assert.notEqual(r.status, 0);
  assert.equal(r.output, 'original');
});
const base = 'https://github.com/ca-works/eng-drawing-viewer/releases/download';
const H = 'a'.repeat(64);
// A release with the given files; every listed file's digest matches unless `digest` overrides it.
function rel(version, names, { prerelease = false, published, digest } = {}) {
  return {
    tag_name: `v${version}`,
    draft: false,
    prerelease,
    published_at: published,
    html_url: `https://github.com/ca-works/eng-drawing-viewer/releases/tag/v${version}`,
    body: `notes ${version}`,
    assets: [
      ...names.map((name) => ({
        name,
        size: 100,
        digest: digest ?? `sha256:${H}`,
        browser_download_url: `${base}/v${version}/${name}`,
      })),
      { name: 'SHA256SUMS.txt', browser_download_url: `${base}/v${version}/SHA256SUMS.txt` },
    ],
  };
}
const sums = (names) => ({ status: 200, text: names.map((n) => `${H}  ${n}`).join('\n') });
const mac220 = ['ENG-Drawing-Viewer-2.2.0-macOS-AppleSilicon.dmg', 'eng-drawing-viewer-2.2.0-source.zip'];
const win221 = [
  'ENG-Drawing-Viewer-2.2.1-Windows-x64-Setup.exe',
  'ENG-Drawing-Viewer-2.2.1-Windows-x64-Portable.zip',
  'eng-drawing-viewer-2.2.1-source.zip',
];

const ids = ['macos-universal', 'macos-apple-silicon', 'windows-x64', 'linux-x86_64'];
const byId = (out) => Object.fromEntries(out.editions.map((e) => [e.id, e]));
const four230 = [
  'ENG-Drawing-Viewer-macOS-Universal.dmg',
  'ENG-Drawing-Viewer-macOS-Apple-Silicon.dmg',
  'ENG-Drawing-Viewer-Windows-x64.zip',
  'ENG-Drawing-Viewer-Linux-x86_64.AppImage',
  'eng-drawing-viewer-2.3.0-source.zip',
];

test('a stable 2.2.0 Mac release enables Apple Silicon and source only', () => {
  const r = run([
    { status: 200, body: [rel('2.2.0', mac220, { published: '2026-10-28T03:00:00Z' })] },
    sums(mac220),
  ]);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.output);
  assert.equal(out.status, 'available');
  assert.deepEqual(out.editions.map((e) => e.id), ids);
  assert.deepEqual(out.editions.filter((e) => e.available).map((e) => e.id), ['macos-apple-silicon']);
  assert.equal(out.source.version, '2.2.0');
  assert.equal(out.version, '2.2.0');
});
test('the 2.2.1 Windows pre-release is a Preview next to the stable 2.2.0 Mac build', () => {
  const r = run([
    {
      status: 200,
      body: [
        rel('2.2.0', mac220, { published: '2026-10-28T03:00:00Z' }),
        rel('2.2.1', win221, { prerelease: true, published: '2026-10-28T13:00:00Z' }),
      ],
    },
    sums(mac220),
    sums(win221),
  ]);
  assert.equal(r.status, 0, r.stderr);
  const out = byId(JSON.parse(r.output));
  assert.equal(out['macos-apple-silicon'].version, '2.2.0');
  assert.equal(out['macos-apple-silicon'].preview, false);
  assert.equal(out['windows-x64'].version, '2.2.1');
  assert.equal(out['windows-x64'].preview, true);
  assert.equal(out['windows-x64'].name, 'ENG-Drawing-Viewer-2.2.1-Windows-x64-Setup.exe');
  assert.equal(out['windows-x64'].extras[0].name, 'ENG-Drawing-Viewer-2.2.1-Windows-x64-Portable.zip');
  assert.equal(out['macos-universal'].available, false);
  assert.equal(out['linux-x86_64'].available, false);
  assert.equal(JSON.parse(r.output).version, '2.2.0');
});
test('a 2.3.0 release with versionless names supplies all four editions', () => {
  const r = run([
    {
      status: 200,
      body: [
        rel('2.2.0', mac220, { published: '2026-10-28T03:00:00Z' }),
        rel('2.2.1', win221, { prerelease: true, published: '2026-10-28T13:00:00Z' }),
        rel('2.3.0', four230, { published: '2026-11-02T10:00:00Z' }),
      ],
    },
    sums(four230),
  ]);
  assert.equal(r.status, 0, r.stderr);
  const parsed = JSON.parse(r.output);
  const out = byId(parsed);
  for (const id of ids) {
    assert.equal(out[id].available, true, id);
    assert.equal(out[id].version, '2.3.0', id);
    assert.equal(out[id].preview, false, id);
  }
  assert.equal(out['windows-x64'].name, 'ENG-Drawing-Viewer-Windows-x64.zip');
  assert.deepEqual(out['windows-x64'].extras, []);
  assert.equal(parsed.version, '2.3.0');
  assert.equal(parsed.source.version, '2.3.0');
});
test('a versionless name in a 2.2.x release is never taken for that edition', () => {
  const odd = ['ENG-Drawing-Viewer-macOS-Universal.dmg', 'ENG-Drawing-Viewer-Linux-x86_64.AppImage'];
  const r = run([
    { status: 200, body: [rel('2.2.0', [...mac220, ...odd], { published: '2026-10-28T03:00:00Z' })] },
    sums([...mac220, ...odd]),
  ]);
  assert.equal(r.status, 0, r.stderr);
  const out = byId(JSON.parse(r.output));
  assert.equal(out['macos-universal'].available, false);
  assert.equal(out['linux-x86_64'].available, false);
});
test('a 2.3.0 release without an edition keeps the older one for it', () => {
  const partial = ['ENG-Drawing-Viewer-Linux-x86_64.AppImage', 'eng-drawing-viewer-2.3.0-source.zip'];
  const r = run([
    {
      status: 200,
      body: [
        rel('2.2.0', mac220, { published: '2026-10-28T03:00:00Z' }),
        rel('2.3.0', partial, { published: '2026-11-02T10:00:00Z' }),
      ],
    },
    sums(mac220),
    sums(partial),
  ]);
  assert.equal(r.status, 0, r.stderr);
  const out = byId(JSON.parse(r.output));
  assert.equal(out['macos-apple-silicon'].version, '2.2.0');
  assert.equal(out['linux-x86_64'].version, '2.3.0');
  assert.equal(out['macos-universal'].available, false);
});
test('mismatched digest blocks download publication', () => {
  const r = run([
    { status: 200, body: [rel('2.2.0', mac220, { published: '2026-10-28T03:00:00Z', digest: 'sha256:' + 'b'.repeat(64) })] },
    sums(mac220),
  ]);
  assert.notEqual(r.status, 0);
  assert.equal(r.output, 'original');
});
test('an empty release list is honestly unreleased', () => {
  const r = run([{ status: 200, body: [] }]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.output).status, 'unreleased');
});
