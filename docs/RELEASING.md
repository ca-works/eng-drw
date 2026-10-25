# Website and application releases

The website is a separate static project for `ca-works/eng-drw`. Application binaries and complete corresponding source must pass the private release audit and receive explicit owner approval before publication. The old Windows package must not be published.

## Website

Use Node 24 LTS and `npm ci`. Run `npm run check`, `npm run build` and `npm test`. The `/eng-drw/` base is configured centrally; use the URL helper for links. Review the complete staged file list before any public push. The checkout must contain only website code, licensed fonts, the owner's icon and neutral sample imagery, never the application tree or private audit.

After a permitted push to main, set repository Settings → Pages → Source to GitHub Actions. The deployment workflow builds the static site and uses GitHub Pages. There is no paid service. `deploy.yml` also supports manual dispatch and a daily release refresh.

## Approved application release

The planned separate application repository is `ca-works/eng-drawing-viewer`; create it only after owner approval of the clean export. The website sync script reads that repository. If no public stable release exists it writes an unreleased state. Any other API failure aborts deployment rather than presenting stale download information.

The first public version is planned as 2.2.0, but must not be advertised as released in advance. Expected assets:

- `ENG-Drawing-Viewer-2.2.0-macOS-AppleSilicon.dmg`
- `ENG-Drawing-Viewer-2.2.0-macOS-AppleSilicon.zip`
- `eng-drawing-viewer-2.2.0-source.zip`
- `SHA256SUMS.txt`
- Required dependency source/licence artifacts from the release audit.

`sync-release.mjs` requires both DMG and source ZIP, checks GitHub's digest against SHA256SUMS and enables those cards together. Windows remains Coming soon; support for its approved future asset must be added deliberately. Never infer approval from CI success or the existence of a local file.

After publishing an approved release, dispatch the website workflow and verify live download sizes and SHA-256 checksums. Public application requirements must be updated only after measured compatibility checks. No large binaries belong in this website repository.

## Free hosting limits (checked 24 October 2026)

GitHub Pages: 1 GB published site, soft 100 GB/month bandwidth, 10-minute deployment timeout. Custom Actions workflows are exempt from the soft ten-builds-per-hour limit. This site presents a free desktop project, with no commercial transactions or SaaS service.

GitHub Releases: each file under 2 GiB, up to 1000 assets per release; no documented total release size or bandwidth quota. Check the policies again before publication:

- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
