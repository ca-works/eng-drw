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
function fixture(digest) {
  const hash = 'a'.repeat(64),
    version = '2.2.0';
  const assets = [
    `ENG-Drawing-Viewer-${version}-macOS-AppleSilicon.dmg`,
    `eng-drawing-viewer-${version}-source.zip`,
  ].map((name) => ({
    name,
    size: 100,
    digest,
    browser_download_url: `https://github.com/ca-works/eng-drawing-viewer/releases/download/v${version}/${name}`,
  }));
  return [
    {
      status: 200,
      body: {
        tag_name: `v${version}`,
        assets: [
          ...assets,
          {
            name: 'SHA256SUMS.txt',
            browser_download_url:
              'https://github.com/ca-works/eng-drawing-viewer/releases/download/v2.2.0/SHA256SUMS.txt',
          },
        ],
      },
    },
    { status: 200, text: assets.map((a) => `${hash}  ${a.name}`).join('\n') },
  ];
}
test('matching checksums enable Mac and source together, never Windows', () => {
  const r = run(fixture('sha256:' + 'a'.repeat(64)));
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.output);
  assert.equal(out.status, 'available');
  assert.deepEqual(
    out.assets.map((a) => a.platform),
    ['macos', 'source'],
  );
});
test('mismatched digest blocks download publication', () => {
  const r = run(fixture('sha256:' + 'b'.repeat(64)));
  assert.notEqual(r.status, 0);
  assert.equal(r.output, 'original');
});
