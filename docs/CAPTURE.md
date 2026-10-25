# Product screenshots

Every application screenshot on the site is a grab of the real ENG Drawing Viewer window, taken on macOS with the native (Cocoa) platform at Retina density: 2880 × 1800 pixels for a 1440 × 900 pt window, in light and dark. The window's own toolbar is part of the grab; the site only draws the macOS window controls into the space the app leaves for them (`src/components/Screenshot.astro`).

## Sample drawings

All drawings shown are original, fictional samples made for this site. Their title blocks say "SAMPLE DRAWING · ENG Drawing Viewer" and "Not for manufacture".

- `design/drawings/parts/` generates the pump assembly set (bearing flange revisions B and C, drive shaft, three-sheet pump housing with a parts list, mounting bracket) as SVG and prints them to vector PDFs with Chromium: `node design/drawings/parts/generate.mjs --pdf`.
- `design/drawings/parts/print-turbine.mjs` prints the homepage's turbine-blade sheet, exactly as the built site renders it, into `Demo Project/Turbine Stage` (needs `npm run build` and `npm run preview`).

## Capturing

1. Pin the application source so concurrent work can't change the pictures:

   ```
   git -C <app repo> archive <commit> src | tar -x -C /path/to/snapshot
   ```

2. From this repository, run the capture with the application's Python environment:

   ```
   <app repo>/.venv/bin/python tools/capture/capture.py --snapshot /path/to/snapshot --site .
   ```

   A window opens for about a minute. Settings and caches go to a temporary folder, so your own settings are untouched. The script opens `design/drawings/Demo Project` by a relative path, so no personal folder names appear in the window. It writes `src/assets/screens/{main,mark,queue,tools,compare}-{light,dark}.png`.

3. Look at every image before committing: file names, paths in the status bar, and comments. Check that PNGs carry no metadata.

Recapture from the release commit before each public release, so the pictures match what people download.
