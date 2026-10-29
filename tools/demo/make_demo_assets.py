"""Make the Image and Vector Editor demonstrations on the homepage from the real application code.

Runs the ENG Drawing Viewer source of a pinned release snapshot (`git archive <commit> src | tar -x`)
with the app's own Python environment, headless:

    <app>/.venv-build/bin/python tools/demo/make_demo_assets.py --snapshot /path/to/snapshot --site .

1. The sample photo: the site's own rendered rotor (src/assets/assembly-poster.png) placed on a
   generated cutting mat. It is an original sample, not a real photograph.
2. Background removal: `image_tools.remove_background`, the model-free automatic removal behind the
   Image Editor's "Remove background automatically" (no AI model).
3. Quick Selection: `image_tools.quick_selection` with one stroke across the hub; the selection's
   outline is saved as an SVG path.
4. Target file size: `image_export.optimize_export`, the Image Editor's export search. The JPEG
   files it returns are saved unchanged, so the sizes shown on the site are the files' real sizes.
5. Tracing: `vector_trace.trace_image` on the rotor's silhouette, saved with the Vector Editor's own
   SVG and DXF export.

Writes public/demo/* and src/data/demo.json. The exported JPEGs are served exactly as the app wrote
them (their sizes are what the site shows); the cut-out is shown as a WebP with transparency.
"""
import argparse
import json
import re
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--snapshot', type=Path, required=True)
    parser.add_argument('--site', type=Path, required=True)
    args = parser.parse_args()
    site = args.site.resolve()
    sys.path.insert(0, str(args.snapshot.resolve() / 'src'))

    import numpy as np
    from PIL import Image, ImageDraw, ImageFilter
    import eng_viewer
    from eng_viewer.core import image_tools
    from eng_viewer.core.image_export import optimize_export
    from eng_viewer.core.vector_trace import trace_image

    out = site / 'public' / 'demo'
    out.mkdir(parents=True, exist_ok=True)
    data = {'app_version': eng_viewer.__version__}

    # 1. Sample: the rotor render (transparent background) placed on a generated green cutting mat
    # with a soft shadow.
    rotor = Image.open(site / 'src' / 'assets' / 'assembly-poster.png').convert('RGBA')
    rotor = rotor.crop(rotor.getchannel('A').getbbox())

    W, H = 1600, 1200
    mat = Image.new('RGB', (W, H), (38, 92, 74))
    d = ImageDraw.Draw(mat)
    for x in range(0, W, 40):
        d.line([(x, 0), (x, H)], fill=(52, 112, 92) if x % 200 else (86, 150, 126), width=1 if x % 200 else 2)
    for y in range(0, H, 40):
        d.line([(0, y), (W, y)], fill=(52, 112, 92) if y % 200 else (86, 150, 126), width=1 if y % 200 else 2)
    rng = np.random.default_rng(7)
    noise = rng.normal(0, 4, (H, W, 1))
    mat = Image.fromarray(np.clip(np.asarray(mat, dtype=float) + noise, 0, 255).astype('uint8'))
    scale = 0.92 * H / rotor.height
    rotor = rotor.resize((round(rotor.width * scale), round(rotor.height * scale)), Image.Resampling.LANCZOS)
    pos = ((W - rotor.width) // 2 + 40, (H - rotor.height) // 2)
    shadow = Image.new('L', (W, H), 0)
    shadow.paste(rotor.getchannel('A'), (pos[0] + 26, pos[1] + 30))
    shadow = shadow.filter(ImageFilter.GaussianBlur(22)).point(lambda v: int(v * 0.55))
    sample = Image.composite(Image.new('RGB', (W, H), (8, 24, 18)), mat, shadow)
    sample.paste(rotor, pos, rotor)
    sample.save(out / 'sample.jpg', quality=88, optimize=True)
    data['sample'] = {'file': 'sample.jpg', 'width': W, 'height': H}

    # 2. Automatic background removal (the app's own function, unchanged).
    visible = image_tools.remove_background(sample.convert('RGBA'))
    cut = sample.convert('RGBA')
    cut.putalpha(visible)
    # Shown as WebP (with alpha) to keep the page light; the PNG would be 2 MB.
    cut.save(out / 'cutout.webp', 'WEBP', quality=88, method=6)
    data['background_removal'] = {'file': 'cutout.webp', 'function': 'image_tools.remove_background',
                                  'kept_fraction': round(float(np.asarray(visible).mean()) / 255, 3)}

    # 3. Quick Selection: one stroke across the hub.
    cx, cy = pos[0] + rotor.width // 2, pos[1] + rotor.height // 2
    stroke = [(cx - 150 + i * 15, cy + (i % 4 - 2) * 6) for i in range(21)]
    mask = image_tools.quick_selection(sample.convert('RGBA'), stroke, radius=26)
    import cv2
    m = (np.asarray(mask) >= 128).astype('uint8') * 255
    contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = [cv2.approxPolyDP(c, 1.5, True) for c in contours if cv2.contourArea(c) > 400]
    path = ' '.join('M' + ' L'.join(f'{p[0][0]},{p[0][1]}' for p in c) + ' Z' for c in contours)
    data['quick_selection'] = {'function': 'image_tools.quick_selection', 'stroke': stroke, 'outline': path,
                               'selected_fraction': round(float(m.mean()) / 255, 3)}

    # 4. Target file size: the export search, actual encoded bytes.
    exports = []
    for label, target, resize in (('Original quality', None, False), ('Under 250 KB', 250_000, False),
                                  ('Under 120 KB', 120_000, False), ('Under 40 KB', 40_000, True)):
        r = optimize_export(sample, 'JPEG', target_bytes=target, quality=92, min_quality=35, allow_resize=resize)
        name = f'export-{len(exports)}.jpg'
        (out / name).write_bytes(r.data)
        exports.append({'label': label, 'target_bytes': target, 'allow_resize': resize, 'file': name,
                        'bytes': r.size_bytes, 'width': r.width, 'height': r.height, 'quality': r.quality,
                        'target_met': r.target_met})
    data['exports'] = exports

    # 5. Trace the rotor silhouette (black on white) and export with the Vector Editor's writers.
    silhouette = Image.new('RGB', rotor.size, 'white')
    silhouette.paste((24, 28, 34), (0, 0), rotor.getchannel('A').point(lambda v: 255 if v >= 128 else 0))
    silhouette = silhouette.resize((silhouette.width // 2, silhouette.height // 2), Image.Resampling.LANCZOS)
    doc, info = trace_image(silhouette, mode='threshold', threshold=128, simplify=1.2, min_area=40, dpi=96)
    doc.export_svg(out / 'trace.svg', overwrite=True)
    doc.export_dxf(out / 'trace.dxf', overwrite=True)
    svg = (out / 'trace.svg').read_text(encoding='utf-8')
    paths = re.findall(r'<path[^>]* d="([^"]+)"', svg)
    view = re.search(r'viewBox="([^"]+)"', svg).group(1)
    data['trace'] = {'function': 'vector_trace.trace_image', 'contours': info['contours'], 'nodes': info['nodes'],
                     'width_mm': round(doc.width, 1), 'height_mm': round(doc.height, 1), 'viewBox': view,
                     'paths': paths, 'svg_bytes': (out / 'trace.svg').stat().st_size,
                     'dxf_bytes': (out / 'trace.dxf').stat().st_size,
                     'source': {'width': silhouette.width, 'height': silhouette.height}}
    silhouette.save(out / 'trace-source.png', optimize=True)
    (out / 'trace.dxf').unlink()  # measured above; the site doesn't serve it

    (site / 'src' / 'data' / 'demo.json').write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in data.items() if k not in ('quick_selection', 'trace')}, indent=2))
    print('trace:', info['contours'], 'contours,', info['nodes'], 'nodes; selection',
          data['quick_selection']['selected_fraction'])


if __name__ == '__main__':
    main()
