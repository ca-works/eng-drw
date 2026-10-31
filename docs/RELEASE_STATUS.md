# Release status

Updated 31 October 2026. This page says what is public and what is still to do. The download page itself only ever shows what `scripts/sync-release.mjs` verifies from the public releases.

## Public now

| Edition | State | Source |
|---|---|---|
| macOS Apple Silicon | **2.3.0**, released 31 October 2026 | [v2.3.0](https://github.com/ca-works/eng-drawing-viewer/releases/tag/v2.3.0) |
| Windows x64 | 2.2.1 Preview | [v2.2.1](https://github.com/ca-works/eng-drawing-viewer/releases/tag/v2.2.1) |
| Linux x86-64 | Coming soon | no release yet |
| macOS Universal | Coming soon, on the owner's decision | no release; do not build or publish it |

macOS 2.2.0 stays in the release history.

The v2.3.0 tag is commit `db81eafd` of the public app repository. Its tree is exactly `eng-drawing-viewer-2.3.0-source.zip`. A published tag never moves.

## Still to do: Windows and Linux 2.3.0

The Windows and Linux candidates in the private `release/candidate-2.3.0` folder must **not** be published. They bundle FFmpeg and, on Linux, OpenSSL 1.1.1k through the published OpenCV wheel. The corrected builds come from the separate Windows and Linux session, which is the only place their source and packaging change.

When its handoff arrives:

1. Check the handoff has artifact paths, SHA-256 and sizes, source commits, test results, security and licensing results, corresponding source and platform requirements.
2. Hash the files independently and compare them with the handoff. Unpack without running them and scan them with `tools/check_bundle.py --private-terms`.
3. Confirm FFmpeg and OpenSSL are gone, or that their source and licence position are settled.
4. Decide where they go:
   - If `src/` and `pyproject.toml` match the v2.3.0 tag and only build files differ, add them to v2.3.0 with a supplemental source archive, for example `eng-drawing-viewer-2.3.0-windows-linux-source.zip`, exported from the commit they were built from.
   - If the application source changed, publish them as a new version with its own tag. Never add them to v2.3.0, and never move that tag.
5. Update `SHA256SUMS.txt`, `THIRD_PARTY_SOURCES.txt` (add the AppImage runtime archive and any Windows-only lines) and the release notes, then `gh release upload --clobber`. The file names must be `ENG-Drawing-Viewer-Windows-x64.zip` and `ENG-Drawing-Viewer-Linux-x86_64.AppImage`, or the site won't see them.
6. Download every new asset anonymously and verify it against `SHA256SUMS.txt`.
7. Dispatch `Deploy website` and verify both download buttons on the live site, with their sizes and checksums. `allEditorsReleased` then switches the remaining copy by itself once Universal also exists, so reread the download page's intro, which still mentions pending editions until then.

## Known items for the next application build

- `packaging/macos/READ_ME.txt` still opens with "This private development candidate requires…". It shipped on the 2.3.0 DMG and the release notes say so.
- `docs/LICENSING.md` says only the Universal edition uses the minimal OpenCV; the Apple Silicon edition does too. It also mentions a CycloneDX SBOM that the 2.3.0 bundle does not contain.
- Exported decks carry python-pptx's default template properties (`lastModifiedBy`: the library's author).
