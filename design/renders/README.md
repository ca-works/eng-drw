# Sample part renders

Original pictures for the Image and Vector Editor demonstrations. Both parts are fictional, modelled for this site; nothing here comes from an employer, a stock library or a paid service.

- `cad_parts.py`: CadQuery models of a machined bearing bracket and a 150 mm digital caliper. Writes `bracket.step`, `caliper.step` and the triangle files `render.py` reads.
- `render.py`: Blender Cycles scenes. The bracket stands on a matte blue sweep; the caliper is photographed straight down with an orthographic camera at exactly 8 pixels per millimetre, so a trace of it can be checked against the model.
- `bracket.png`, `caliper.png`: the opaque source pictures the application processes. There is no alpha channel in either.

```bash
uv venv --python 3.12 cad && uv pip install --python cad/bin/python cadquery
cad/bin/python design/renders/cad_parts.py /tmp/parts
blender -b -P design/renders/render.py -- bracket /tmp/parts design/renders/bracket.png 1600 1200 300
blender -b -P design/renders/render.py -- caliper /tmp/parts design/renders/caliper.png 2400 1040 200
```

Then run `tools/demo/make_demo_assets.py` (`docs/CAPTURE.md`).

Lighting notes, learned from what the app's GrabCut does: metal that mirrors the backdrop gets cut away with it, so the bracket has a small reflector card that only reflections see, and the sweep has no specular, so the card can't appear in the floor. The caliper is lit from four sides so that its contact shadows stay lighter than the trace threshold.
