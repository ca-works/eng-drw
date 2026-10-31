"""Original CAD models for the website's Image and Vector Editor samples (CadQuery).

    python design/renders/cad_parts.py <output folder>

Writes bracket.step / caliper.step and one .npz per part with triangles grouped by material and
surface type, which render.py loads into Blender. Both parts are fictional samples made for this
site. All dimensions are millimetres.
"""
import math
import sys
from pathlib import Path

import cadquery as cq
import numpy as np


def fillet_edges(wp, selector, radius):
    """Round what OCCT can round; a sample part may keep a sharp edge rather than fail."""
    try:
        return wp.edges(selector).fillet(radius)
    except Exception as exc:  # noqa: BLE001
        print(f'  skipped fillet {selector}: {exc}')
        return wp


def bracket():
    """A machined bearing support: base plate, arched upright with a bearing seat, two gussets."""
    length, depth, thick = 170, 104, 14
    zc, arch = 84, 60  # bore centre height and arch radius
    y0, y1 = -46, -26  # upright front and rear faces (front faces the camera at +y)

    base = (cq.Workplane('XY').box(length, depth, thick, centered=(True, True, False))
            .edges('|Z').fillet(10).faces('>Z').chamfer(1.8).faces('<Z').chamfer(1.0))

    upright = (cq.Workplane('XZ').workplane(offset=-y1)
               .moveTo(-arch, thick - 5).lineTo(-arch, zc)
               .threePointArc((0, zc + arch), (arch, zc)).lineTo(arch, thick - 5).close()
               .extrude(y1 - y0))
    upright = upright.faces('>Y or <Y').chamfer(2.0)

    def gusset(x):
        wp = (cq.Workplane('YZ').workplane(offset=x - 6)
              .moveTo(y1 - 4, thick - 4).lineTo(y1 - 4, zc - 2).lineTo(y1, zc - 2)
              .lineTo(36, thick + 2).lineTo(36, thick - 4).close().extrude(12))
        return fillet_edges(wp, '>X or <X', 0.1) if False else wp.faces('>X or <X').chamfer(1.4)

    body = base.union(upright).union(gusset(47)).union(gusset(-47))
    body = fillet_edges(body, cq.selectors.BoxSelector((-62, -28, thick - .2), (62, 40, thick + .2)), 3.5)

    # Bearing seat: through bore, counterbore from the front, lead-in chamfers.
    axis = cq.Workplane('XZ').workplane(offset=-y1 - 1).center(0, zc)
    body = body.cut(axis.circle(27).extrude(y1 - y0 + 2))
    body = body.cut(cq.Workplane('XZ').workplane(offset=-y1).center(0, zc).circle(33).extrude(5))
    cone = cq.Solid.makeCone(34.8, 33, 1.8, pnt=cq.Vector(0, y1, zc), dir=cq.Vector(0, -1, 0))
    body = body.cut(cq.Workplane(obj=cone))
    cone = cq.Solid.makeCone(28.4, 27, 1.4, pnt=cq.Vector(0, y0, zc), dir=cq.Vector(0, 1, 0))
    body = body.cut(cq.Workplane(obj=cone))

    # Six M5 threaded holes on a 84 mm circle, with countersinks.
    for i in range(6):
        a = math.radians(30 + 60 * i)
        x, z = 43 * math.cos(a), zc + 43 * math.sin(a)
        if z < thick + 12:
            continue
        body = body.cut(cq.Workplane(obj=cq.Solid.makeCylinder(2.6, 22, cq.Vector(x, y1 + 1, z), cq.Vector(0, -1, 0))))
        body = body.cut(cq.Workplane(obj=cq.Solid.makeCone(3.8, 2.6, 1.2, pnt=cq.Vector(x, y1, z), dir=cq.Vector(0, -1, 0))))

    # Machined pocket between the gussets.
    pocket = (cq.Workplane('XY').workplane(offset=thick - 3.2).center(0, 12).rect(68, 52).extrude(5)
              .edges('|Z').fillet(7))
    body = body.cut(pocket)

    # Four counterbored mounting holes.
    for x in (-70, 70):
        for y in (-36, 36):
            body = body.cut(cq.Workplane(obj=cq.Solid.makeCylinder(5, thick + 2, cq.Vector(x, y, -1))))
            body = body.cut(cq.Workplane(obj=cq.Solid.makeCylinder(8.5, 8, cq.Vector(x, y, thick - 7.5))))
            body = body.cut(cq.Workplane(obj=cq.Solid.makeCone(8.5, 10, 1.5, pnt=cq.Vector(x, y, thick - 1.5), dir=cq.Vector(0, 0, 1))))
    return {'aluminium': body}


def outline(points):
    wp = cq.Workplane('XY').moveTo(*points[0])
    for p in points[1:]:
        wp = wp.lineTo(*p)
    return wp.close()


def caliper(opening=46):
    """A 150 mm digital caliper lying flat, jaws open by `opening`. x = 0 is the fixed jaw's face."""
    steel, plastic, lcd, light = {}, {}, {}, {}
    fixed = (cq.Workplane('XY').moveTo(-30, 8).lineTo(-11, 8).lineTo(-1.8, 22).lineTo(-.5, 22).lineTo(0, 19.5)
             .lineTo(0, -41).lineTo(-1.6, -48).threePointArc((-11.2, -29.5), (-30, -8)).close().extrude(3.2))
    fixed = fillet_edges(fixed, cq.selectors.NearestToPointSelector((-30, 8, 1.6)), 1.5)
    fixed = fillet_edges(fixed, cq.selectors.NearestToPointSelector((-30, -8, 1.6)), 2)
    beam = cq.Workplane('XY').box(236, 16, 3.2, centered=False).translate((-28, -8, 0)).edges('|X').chamfer(.5)
    steel['beam'] = fixed.union(beam)
    rod_end = 208 + opening
    steel['rod'] = cq.Workplane('XY').box(rod_end - 200, 2.2, 1.4, centered=False).translate((200, -1.1, .9))

    o = opening
    slider = (cq.Workplane('XY').workplane(offset=3.2)
              .moveTo(o, 19.5).lineTo(o + .5, 22).lineTo(o + 1.8, 22).lineTo(o + 11, 8.5).lineTo(o + 80, 8.5)
              .lineTo(o + 80, -11).lineTo(o + 30, -11).threePointArc((o + 11.2, -29.5), (o + 1.6, -48))
              .lineTo(o, -41).close().extrude(1.6))
    steel['slider'] = slider

    housing = (cq.Workplane('XY').workplane(offset=4.8).center(o + 45, 2.5).rect(70, 33).extrude(5.4)
               .edges('|Z').fillet(5).faces('>Z').chamfer(.9))
    plastic['housing'] = housing
    window = cq.Workplane('XY').workplane(offset=10.2).center(o + 39, 8.5).rect(44, 15).extrude(.2).edges('|Z').fillet(1.2)
    lcd['window'] = window
    for i, x in enumerate((o + 24, o + 39, o + 54)):
        light[f'button{i}'] = cq.Workplane('XY').workplane(offset=10.2).center(x, -6.6).circle(4.2).extrude(.7).faces('>Z').chamfer(.3)

    teeth = []
    for i in range(80):
        a, r = math.radians(i * 4.5), 8.2 if i % 2 else 7.4
        teeth.append((o + 67 + r * math.cos(a), -13.5 + r * math.sin(a)))
    steel['wheel'] = outline(teeth).extrude(1.5).translate((0, 0, 3.2))
    steel['screw'] = cq.Workplane('XY').workplane(offset=3.2).center(o + 60, 19.6).circle(3.2).extrude(3.8).faces('>Z').chamfer(.5)
    return {'steel': steel, 'plastic': plastic, 'lcd': lcd, 'light': light}


AXES = [(1, 0, 0), (0, 1, 0), (0, 0, 1)]


def classify(face):
    kind = face.geomType()
    if kind != 'PLANE':
        return 'curved'
    n = face.normalAt()
    axial = max(abs(n.x), abs(n.y), abs(n.z)) > 0.999
    return 'flat' if axial or face.Area() > 250 else 'chamfer'


def collect(solid, tol, ang, store, material):
    shape = solid.val() if hasattr(solid, 'val') else solid
    shape.mesh(tol, ang)
    for face in shape.Faces():
        verts, tris = face.tessellate(tol, ang)
        key = f'{material}|{classify(face)}'
        v = np.array([[p.x, p.y, p.z] for p in verts], dtype=np.float32)
        t = np.array(tris, dtype=np.int32)
        if len(t):
            store.setdefault(key, []).append((v, t))


def save(store, path):
    arrays = {}
    for key, parts in store.items():
        offset, vs, ts, fs = 0, [], [], []
        for i, (v, t) in enumerate(parts):
            vs.append(v)
            ts.append(t + offset)
            offset += len(v)
        arrays[key + '|v'] = np.concatenate(vs)
        arrays[key + '|t'] = np.concatenate(ts)
    np.savez_compressed(path, **arrays)
    print(path.name, {k[:-2]: len(v) for k, v in arrays.items() if k.endswith('|t')})


def main():
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)

    store = {}
    body = bracket()['aluminium']
    collect(body, .015, .06, store, 'aluminium')
    cq.exporters.export(body, str(out / 'bracket.step'))
    bb = body.val().BoundingBox()
    print('bracket bounds', round(bb.xlen, 1), round(bb.ylen, 1), round(bb.zlen, 1), 'solids', len(body.solids().vals()))
    save(store, out / 'bracket.npz')

    store = {}
    parts = caliper()
    assembly = cq.Assembly()
    for material, group in parts.items():
        for name, wp in group.items():
            collect(wp, .01, .05, store, material)
            assembly.add(wp, name=name)
    assembly.save(str(out / 'caliper.step'))
    save(store, out / 'caliper.npz')


if __name__ == '__main__':
    main()
