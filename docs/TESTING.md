# Website test results

Latest local run: 25 October 2026, production build served by `astro preview` under `/eng-drw/`.

## Build

- `npm run check`: 0 errors, warnings or hints.
- `npm run build` + `scripts/verify-dist.mjs`: 8 pages; base path, internal links and assets, metadata and size budgets pass. Core JS 50 KiB gzip, optional 3D 137 KiB gzip (desktop autoplay, opt-in on touch and reduced motion), CSS 12 KiB gzip.
- `npm run test:release`: release-metadata unit tests and geometry invariants pass.

## Browsers (Playwright)

- Chromium, WebKit and mobile Chromium: 47 passed, 4 intentional skips (desktop-only or mobile-only cases).
- Covered: every page renders without console errors and with valid links; download cards stay honest before a release; the MARK demo (callout, linked comment, undo, redo); theme persistence; mobile menu focus trap and Escape; no serious or critical axe findings; light, dark and reduced-motion layouts at 360, 390, 768, 1280 and 1440 px; 3D loading failure keeps the poster; the full turbine → blade → drawing sequence and Replay (run 9 times in a row).
- Firefox: the local Playwright Firefox build doesn't start on this Mac ("Could not find profile folder"). Firefox runs in the `Check website` workflow on GitHub's Ubuntu runners.

## Lighthouse 13 (home page)

| Preset | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| Mobile | 96 | 100 | 100 | 100 | 2.4 s | 30 ms | 0.002 |
| Desktop | 100 | 100 | 100 | 100 | 0.5 s | 0 ms | 0.005 |

Desktop performance was 79 (500 ms blocking time) until the 3D scene setup was split into short steps with asynchronous shader compilation. These are lab measurements on a fast Mac, not field data.

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
