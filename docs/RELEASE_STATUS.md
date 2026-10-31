# Release status

Updated 31 October 2026. This page says what is public and what is still to do. The download page itself only ever shows what `scripts/sync-release.mjs` verifies from the public releases.

## Public now

| Edition | State | Source |
|---|---|---|
| macOS Apple Silicon | **2.3.0**, released 31 October 2026 | [v2.3.0](https://github.com/ca-works/eng-drawing-viewer/releases/tag/v2.3.0) |
| Windows x64 | **2.3.0**, added to v2.3.0 on 31 October 2026 (portable ZIP, 128,139,653 bytes) | same release |
| Linux x86-64 | **2.3.0**, added to v2.3.0 on 31 October 2026 (AppImage, 133,618,168 bytes) | same release |
| macOS Universal | Coming soon, on the owner's decision | no release; do not build or publish it |

macOS 2.2.0 and Windows 2.2.1 stay in the release history. The site now shows Windows 2.3.0 (a ZIP, no installer) instead of the 2.2.1 Preview.

The v2.3.0 tag is commit `db81eafd` of the public app repository. Its tree is exactly `eng-drawing-viewer-2.3.0-source.zip` (the Apple silicon edition). A published tag never moves.

## Windows and Linux 2.3.0: what was published

- `ENG-Drawing-Viewer-Windows-x64.zip` SHA-256 `4a9b1b88…89bb5`; `ENG-Drawing-Viewer-Linux-x86_64.AppImage` SHA-256 `49c815fb…c41e91`. Built by private CI run 41205118213 from application commit `022e504` (application source identical to the Mac 2.3.0 build; only packaging, build scripts, tests and docs differ).
- Supplemental corresponding source: `eng-drawing-viewer-2.3.0-windows-linux-source.zip` (scanned export of `022e504`, byte-identical to the CI archive, SHA-256 `bcdf2d27…10`). Added to the release; the tag was not touched.
- Also added: the AppImage runtime source (libfuse, LGPL-2.1), `gcc-14.3.0.tar.xz` for NumPy's libquadmath (LGPL-2.1; nearest upstream release, disclosed in `THIRD_PARTY_SOURCES.txt` with a source offer), per-edition `THIRD_PARTY_NOTICES-*.txt` and SBOMs. `SHA256SUMS.txt`, `THIRD_PARTY_SOURCES.txt` and the release notes were updated.
- Private-terms scan (`check_bundle.py --private-terms`) of both unpacked packages and the scanned source export: only upstream false positives (Qt's vendor table "Robert Bosch GmbH"; SymPy's AUTHORS credits an unrelated contributor). No scan was weakened.
- Limitation: Windows and Linux were tested by automated runs and scripted desktop sessions only; no person has used them on an everyday Windows 10/11 PC or a GNOME/KDE desktop. The release notes, download page and support page say so.
- The sync script already handles the versionless file names (`tests/unit/release.test.mjs` covers it).

Remaining: the Universal Mac edition, and a hands-on pass on Windows and Linux.

## Known items for the next application build

- `packaging/macos/READ_ME.txt` still opens with "This private development candidate requires…". It shipped on the 2.3.0 DMG and the release notes say so.
- `docs/LICENSING.md` says only the Universal edition uses the minimal OpenCV; the Apple Silicon edition does too. It also mentions a CycloneDX SBOM that the 2.3.0 bundle does not contain.
- Exported decks carry python-pptx's default template properties (`lastModifiedBy`: the library's author).
