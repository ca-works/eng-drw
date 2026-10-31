# Website test results

Latest local run: 31 October 2026, production build served by `astro preview` under `/eng-drw/`.

## Build

- `npm run check`: 0 errors, warnings or hints.
- `npm run build` + `scripts/verify-dist.mjs`: 8 pages; base path, internal links and assets, metadata and size budgets pass. Core JS 51 KiB gzip, optional 3D 137 KiB gzip (desktop autoplay, opt-in on touch and reduced motion), CSS 16 KiB gzip.
- `npm run test:release`: release-metadata unit tests and geometry invariants pass.

## Browsers (Playwright)

- Chromium, WebKit and mobile Chromium: 68 passed, 4 intentional skips (desktop-only or mobile-only cases).
- Covered: every page renders without console errors and with valid links; download cards stay honest (Apple Silicon 2.3.0 with its real URL and size, Universal Coming soon with no link); every slide comment has its numbered callout on the drawing; callouts stay on their features at 360, 768 and 1440 px; the marked-up hero without the 3D scene; section anchors clear the sticky header at 375 and 1280 px; screenshots enlarge and close; the trace's real point counts; the MARK demo; theme persistence; mobile menu focus trap and Escape; no serious or critical axe findings; light, dark and reduced-motion layouts at 360, 390, 768, 1280 and 1440 px; 3D loading failure keeps the sheet; the full turbine → blade → drawing sequence and Replay.
- Firefox (and Chromium and WebKit again) run in the `Check website` workflow on GitHub's Ubuntu runners, free on this public repository. The local Playwright Firefox build does not start on this Mac. The timed WebGL animation test is skipped on CI because the runners have no GPU.

## Lighthouse 13 (home page)

| Preset | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| Mobile | 96 | 100 | 100 | 100 | 2.4 s | 0 ms | 0.002 |
| Desktop | 100 | 100 | 100 | 100 | 0.7 s | 0 ms | 0.005 |

Lab measurements on a fast Mac, not field data. One of three desktop runs scored 91 with 240 ms blocking time while other apps were busy; the other two were 100 with 0 ms.

## Visual review

Full-page screenshots of the home, features, download and support pages at 1440 × 900 (light and dark) and 390 × 844 were inspected after every design change, as were frames of the hero animation. No page scrolls horizontally at any tested width.

## Privacy checks before publishing

- No analytics, cookies, external fonts or third-party requests.
- Every image has no EXIF or text metadata; sample PDFs carry only Chromium's producer tag and contain no personal text.
- Repository text was scanned for personal names, local paths, tokens and employer references.

## Commands

```
npm run check
npm run build
npm run test:release
npm test                 # needs: npx playwright install chromium firefox webkit
npx lighthouse http://127.0.0.1:4321/eng-drw/ --preset=desktop
```
