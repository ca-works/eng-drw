# Website and application releases

The website is a separate static project for `ca-works/eng-drw`. Application binaries and complete corresponding source must pass the private release audit and receive explicit owner approval before publication. The old Windows package must not be published.

## Website

Use Node 24 LTS and `npm ci`. Run `npm run check`, `npm run build` and `npm test`. The `/eng-drw/` base is configured centrally; use the URL helper for links. Review the complete staged file list before any public push. The checkout must contain only website code, licensed fonts, the owner's icon and neutral sample imagery, never the application tree or private audit.

After a permitted push to main, set repository Settings → Pages → Source to GitHub Actions. The deployment workflow builds the static site and uses GitHub Pages. There is no paid service. `deploy.yml` also supports manual dispatch and a daily release refresh.

## Approved application release

Downloads come only from published releases of the public app repository `ca-works/eng-drawing-viewer`. `scripts/sync-release.mjs` (run by every deployment and once a day) reads them and writes `src/data/release.json`. Nothing else may supply a download link, size or checksum.

The site lists exactly four editions, in this order. Each comes from the newest published release that contains its file; a pre-release is shown as *Preview*; an edition no release contains says *Coming soon*.

| Edition | 2.3.0 and later | 2.2.x |
|---|---|---|
| macOS Universal | `ENG-Drawing-Viewer-macOS-Universal.dmg` | — |
| macOS Apple Silicon | `ENG-Drawing-Viewer-macOS-Apple-Silicon.dmg` | `ENG-Drawing-Viewer-<v>-macOS-AppleSilicon.dmg` |
| Windows x64 | `ENG-Drawing-Viewer-Windows-x64.zip` | `ENG-Drawing-Viewer-<v>-Windows-x64-Setup.exe` + `…-Portable.zip` |
| Linux x86-64 | `ENG-Drawing-Viewer-Linux-x86_64.AppImage` | — |
| Source | `eng-drawing-viewer-<v>-source.zip` | same |

Versionless names count only in releases tagged 2.3.0 or later, and versioned names only before, so an old file can never appear as a new version. Every file must be listed in its release's `SHA256SUMS.txt` with the same hash GitHub reports as its digest, and be served from the repository's own release URLs; otherwise the sync fails and the deployment stops, keeping the last verified site. `npm run test:release` covers these rules.

Requirements, architecture text and install notes per edition live in `src/data/editions.ts`; change them only with measured evidence (the app repository's `docs/COMPATIBILITY.md` and test results).

After the owner publishes an approved release, dispatch the deploy workflow (or wait for the daily run) and check the download page: each card's version, size and SHA-256 against the release's `SHA256SUMS.txt`. Never infer approval from CI success or the existence of a local file. No large binaries belong in this website repository.

## Free hosting limits (checked 24 October 2026)

GitHub Pages: 1 GB published site, soft 100 GB/month bandwidth, 10-minute deployment timeout. Custom Actions workflows are exempt from the soft ten-builds-per-hour limit. This site presents a free desktop project, with no commercial transactions or SaaS service.

GitHub Releases: each file under 2 GiB, up to 1000 assets per release; no documented total release size or bandwidth quota. Check the policies again before publication:

- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
