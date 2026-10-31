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

   A window opens for about a minute. Settings and caches go to a temporary folder, so your own settings are untouched. The script opens `design/drawings/Demo Project` by a relative path, so no personal folder names appear in the window. It writes `src/assets/screens/{main,mark,queue,tools,compare,pdfedit,image,vector}-{light,dark}.png`. The Image and Vector captures open `public/demo/sample.jpg` and `public/demo/caliper.svg`, so run `tools/demo/make_demo_assets.py` first. `--only image,vector` recaptures just those two.

3. Look at every image before committing: file names, paths in the status bar, and comments. Check that PNGs carry no metadata.

Recapture from the release commit before each public release, so the pictures match what people download.

## Real demonstrations

Every demonstration on the homepage is output of the application, made from the published source of the release (`eng-drawing-viewer-2.3.0-source.zip`, unpacked as the snapshot). Application binaries are never rebuilt or changed for the site.

**PowerPoint.** `tools/demo/make_review_slide.py` drives the real MARK window on the sample blade drawing: three numbered callouts with linked comments, a circle, two arrows and a highlight. It sends the page to the queue and exports with the app's `ExportController`. It writes `public/demo/review/blade-review.pptx` (served for download), the picture from inside that deck, and `src/data/review.json`, which holds the marks in the sheet's coordinates plus the title, comments and positions read back from the file. The hero and the PowerPoint story draw the marks from that JSON inside the drawing's SVG, in viewBox units, so they stay on their features at any width. To change a mark, change the constants at the top of the script and run it again; never edit the JSON by hand.

The finished slide on the page is built from the file's real geometry, not from a screenshot, because a picture of a 16:9 slide can't be read on a phone. No office suite renders it here: Quick Look substitutes a serif font for the deck's theme font, and PowerPoint must not be scripted on the owner's Mac while it may hold other work.

**Image Editor.** `design/renders/bracket.png` is an original, opaque render (see `design/renders/README.md`). `tools/demo/make_demo_assets.py` runs `remove_background`, `refine_selection` (the app's Select › Feather / grow / smooth) and `quick_selection` with the brush strokes listed in the script, then saves the unchanged results. No mask is painted or retouched. If a result looks wrong, change the render's lighting or the strokes and run it again.

**Vector Editor.** `design/renders/caliper.png` is rendered at exactly 8 pixels per millimetre, so the trace can be checked against the model: 284.1 × 70.6 mm traced, 284.0 × 70.8 mm modelled. The script traces it three times with the app's `trace_image`: edge mode for the edge step, nearly unsimplified for the raw points, refined for the final outline, and exports `public/demo/caliper.svg` and `.dxf` with the Vector Editor's writers. The app's trace produces straight segments, so the site must not call it Bézier fitting.
