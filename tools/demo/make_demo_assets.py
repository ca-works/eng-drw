"""Make the Image and Vector Editor demonstrations on the homepage from the real application code.

Runs the published ENG Drawing Viewer source (`eng-drawing-viewer-2.3.0-source.zip`) with the app's
own Python environment, headless:

    <app>/.venv/bin/python tools/demo/make_demo_assets.py --snapshot /path/to/source --site .

The source pictures are original renders of fictional parts (design/renders: CadQuery models,
Blender Cycles). Both are opaque pictures with a real backdrop.

1. Sample: design/renders/bracket.png, unchanged except for the JPEG the site serves.
2. Background removal: `image_tools.remove_background`, the model-free automatic removal behind the
   Image Editor's "Remove background automatically", then `refine_selection` (Select › Feather /
   grow / smooth…) for the edge. The result's alpha is the app's mask, untouched.
3. Quick Selection: `image_tools.quick_selection` with the brush strokes in STROKES, each added to
   the selection as in the app; the selection's outline is saved as an SVG path.
4. Target file size: `image_export.optimize_export`. The JPEG files it returns are saved unchanged,
   so the sizes shown on the site are the files' real sizes.
5. Tracing: `vector_trace.trace_image` on design/renders/caliper.png, rendered at exactly 8 pixels
   per millimetre. The app's edge mode gives the edge step, a nearly unsimplified trace gives the
   raw points and the final trace is exported with the Vector Editor's own SVG and DXF writers.

Writes public/demo/* and src/data/demo.json.
"""
import argparse
import json
import re
import sys
from pathlib import Path

# Quick Selection brush strokes as fractions of the picture: the arch, the gussets, the upright, the
# base plate, then short touch-ups on the side face, the plate's ends and the threaded holes.
STROKES = [
    [(.43, .24), (.56, .21), (.63, .33)],
    [(.37, .31), (.37, .52), (.39, .68)],
    [(.42, .62), (.56, .67), (.68, .72)],
    [(.61, .46), (.67, .62)],
    [(.27, .77), (.41, .84), (.60, .79)],
    [(.32, .36), (.32, .64)],
    [(.25, .72), (.30, .73)],
    [(.70, .74), (.75, .75), (.79, .75)],
    [(.59, .33), (.60, .42), (.575, .50)],
    [(.595, .31), (.60, .49)],
]
PIXELS_PER_MM = 8
THRESHOLD = 178
MIN_AREA = 2800  # square pixels: drops the display digits and other small print
RAW_SIMPLIFY, FINAL_SIMPLIFY = .25, 2.0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--snapshot', type=Path, required=True)
    parser.add_argument('--site', type=Path, required=True)
    args = parser.parse_args()
    site = args.site.resolve()
    sys.path.insert(0, str(args.snapshot.resolve() / 'src'))

    import cv2
    import numpy as np
    from PIL import Image
    import eng_viewer
    from eng_viewer.core import image_tools
    from eng_viewer.core.image_export import optimize_export
    from eng_viewer.core.vector_trace import trace_image

    out = site / 'public' / 'demo'
    out.mkdir(parents=True, exist_ok=True)
    for old in ('cutout.webp', 'sample.jpg', 'trace-source.png', 'trace.svg'):
        (out / old).unlink(missing_ok=True)
    data = {'app_version': eng_viewer.__version__}

    def outline(mask, tolerance=1.4, min_area=300):
        pixels = (np.asarray(mask) >= 128).astype('uint8') * 255
        contours, _ = cv2.findContours(pixels, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        contours = [cv2.approxPolyDP(c, tolerance, True) for c in contours if cv2.contourArea(c) > min_area]
        return ' '.join('M' + ' L'.join(f'{p[0][0]},{p[0][1]}' for p in c) + ' Z' for c in contours)

    # 1. The opaque sample.
    sample = Image.open(site / 'design' / 'renders' / 'bracket.png').convert('RGB')
    W, H = sample.size
    sample.save(out / 'sample.jpg', quality=90, optimize=True)
    data['sample'] = {'file': 'sample.jpg', 'width': W, 'height': H, 'opaque': True}

    # 2. Automatic background removal and the Refine step (the app's own functions, unchanged).
    visible = image_tools.remove_background(sample.convert('RGBA'))
    visible = image_tools.refine_selection(visible, feather=1.0, grow=0, smooth=3)
    cut = sample.convert('RGBA')
    cut.putalpha(visible)
    cut.save(out / 'cutout.webp', 'WEBP', quality=90, alpha_quality=95, method=6)
    data['background_removal'] = {'file': 'cutout.webp', 'function': 'image_tools.remove_background',
                                  'refine': {'feather': 1.0, 'grow': 0, 'smooth': 3},
                                  'kept_fraction': round(float(np.asarray(visible).mean()) / 255, 3)}

    # 3. Quick Selection, brush radius 22, one stroke at a time, then Refine.
    selection, strokes = None, []
    for stroke in STROKES:
        points = []
        for (x0, y0), (x1, y1) in zip(stroke, stroke[1:]):
            points += [((x0 + (x1 - x0) * i / 24) * W, (y0 + (y1 - y0) * i / 24) * H) for i in range(25)]
        selection = image_tools.quick_selection(sample.convert('RGBA'), points, radius=22, existing=selection)
        strokes.append([(round(x), round(y)) for x, y in points[::6]])
    selection = image_tools.refine_selection(selection, feather=0, grow=0, smooth=3)
    data['quick_selection'] = {'function': 'image_tools.quick_selection', 'radius': 22, 'strokes': strokes,
                               'outline': outline(selection),
                               'selected_fraction': round(float(np.asarray(selection).mean()) / 255, 3)}

    # 4. Target file size: the export search, actual encoded bytes.
    exports = []
    for label, target, resize in (('Original quality', None, False), ('Under 80 KB', 80_000, False),
                                  ('Under 50 KB', 50_000, False), ('Under 20 KB', 20_000, True)):
        r = optimize_export(sample, 'JPEG', target_bytes=target, quality=92, min_quality=35, allow_resize=resize)
        name = f'export-{len(exports)}.jpg'
        (out / name).write_bytes(r.data)
        exports.append({'label': label, 'target_bytes': target, 'allow_resize': resize, 'file': name,
                        'bytes': r.size_bytes, 'width': r.width, 'height': r.height, 'quality': r.quality,
                        'target_met': r.target_met})
    assert all(e['target_met'] for e in exports), 'a target size was not reached'
    data['exports'] = exports

    # 5. Trace the caliper at its true scale: edges, raw points, refined points, export.
    raster = Image.open(site / 'design' / 'renders' / 'caliper.png').convert('RGB')
    dpi = PIXELS_PER_MM * 25.4
    common = dict(threshold=THRESHOLD, min_area=MIN_AREA, dpi=dpi, smoothing=1.0)
    raw, raw_info = trace_image(raster, mode='threshold', simplify=RAW_SIMPLIFY, **common)
    final, info = trace_image(raster, mode='threshold', simplify=FINAL_SIMPLIFY, **common)
    edges, edge_info = trace_image(raster, mode='edges', threshold=90, simplify=1.0, min_area=30, dpi=dpi)

    def paths(doc, name):
        doc.export_svg(out / name, overwrite=True)
        svg = (out / name).read_text(encoding='utf-8')
        return svg, re.findall(r'<path[^>]* d="([^"]+)"', svg), re.search(r'viewBox="([^"]+)"', svg).group(1)

    _, raw_paths, _ = paths(raw, 'caliper-raw.svg')
    (out / 'caliper-raw.svg').unlink()
    _, edge_paths, _ = paths(edges, 'caliper-edges.svg')
    (out / 'caliper-edges.svg').unlink()
    svg, final_paths, view = paths(final, 'caliper.svg')
    final.export_dxf(out / 'caliper.dxf', overwrite=True)
    points = np.array([(float(x), float(y)) for x, y in re.findall(r'[ML]\s*([-\d.]+)[ ,]([-\d.]+)', ' '.join(final_paths))])
    low, high = points.min(axis=0), points.max(axis=0)
    # The edge and raw-point steps of the animation: separate pictures, not inline SVG, because of
    # their size. Their coordinates are the trace's, in the same 300 x 130 mm viewBox.
    def layer(name, body):
        (out / name).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}">{body}</svg>\n', encoding='utf-8')

    short = lambda d: re.sub(r'(\d+\.\d)\d+', r'\1', d)
    layer('caliper-edges.svg', ''.join(f'<path fill="#0a6fd6" fill-rule="evenodd" d="{short(d)}"/>' for d in edge_paths))
    raw_points = re.findall(r'[ML]\s*([-\d.]+)[ ,]([-\d.]+)', ' '.join(raw_paths))
    dots = ''.join(f'<circle cx="{float(x):.1f}" cy="{float(y):.1f}" r=".42"/>' for x, y in raw_points)
    layer('caliper-raw.svg', f'<g fill="#fff" stroke="#0a6fd6" stroke-width=".22">{dots}</g>')
    # The site's copy of the raster; the trace above read the full 2400 pixel file.
    raster.resize((1600, round(1600 * raster.height / raster.width)), Image.Resampling.LANCZOS).save(out / 'caliper.webp', 'WEBP', quality=94, method=6)
    data['trace'] = {
        'function': 'vector_trace.trace_image', 'pixels_per_mm': PIXELS_PER_MM, 'dpi': round(dpi, 1),
        'threshold': THRESHOLD, 'min_area_px': MIN_AREA, 'source_px': list(raster.size), 'source_file': 'caliper.webp',
        'contours': info['contours'], 'nodes': info['nodes'], 'removed': info['removed'],
        'raw_nodes': raw_info['nodes'], 'raw_contours': raw_info['contours'],
        'edge_contours': edge_info['contours'], 'edge_nodes': edge_info['nodes'],
        'width_mm': round(float(high[0] - low[0]), 1), 'height_mm': round(float(high[1] - low[1]), 1),
        'bbox_mm': [round(float(v), 2) for v in (*low, *high)], 'page_mm': [round(final.width, 1), round(final.height, 1)],
        'viewBox': view, 'paths': final_paths, 'model_mm': [284.0, 70.8],
        'svg_file': 'caliper.svg', 'dxf_file': 'caliper.dxf',
        'svg_bytes': (out / 'caliper.svg').stat().st_size, 'dxf_bytes': (out / 'caliper.dxf').stat().st_size}

    (site / 'src' / 'data' / 'demo.json').write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')
    show = {k: v for k, v in data.items() if k not in ('quick_selection', 'trace')}
    print(json.dumps(show, indent=1)[:1600])
    print('selection', data['quick_selection']['selected_fraction'],
          {k: v for k, v in data['trace'].items() if k != 'paths'})


if __name__ == '__main__':
    main()
