"""Render the website's sample parts with Blender Cycles.

    blender -b -P design/renders/render.py -- bracket|caliper <folder with .npz> <out.png> <width> <height> <samples>

Run cad_parts.py first. One Blender unit is 100 mm. Everything in the pictures is generated: there
is no photograph, no stock asset and no transparency; the images are opaque, with a real backdrop.
"""
import math
import sys

import bpy
import numpy as np
from mathutils import Vector

part, folder, out, width, height, samples = sys.argv[sys.argv.index('--') + 1:]
width, height, samples = int(width), int(height), int(samples)
SCALE = 0.01

scene = bpy.context.scene
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj)
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = samples
scene.cycles.use_denoising = True
try:
    scene.cycles.denoiser = 'OPENIMAGEDENOISE'
except TypeError:
    pass
scene.cycles.max_bounces = 10
scene.cycles.glossy_bounces = 6
scene.cycles.caustics_reflective = False
scene.cycles.caustics_refractive = False
scene.render.resolution_x, scene.render.resolution_y = width, height
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.image_settings.color_depth = '8'
scene.render.filepath = out


def add_brushing(m, amount):
    """Long streaks along x in the colour and gloss of brushed steel."""
    nodes, links = m.node_tree.nodes, m.node_tree.links
    b = nodes['Principled BSDF']
    coords = nodes.new('ShaderNodeTexCoord')
    map_ = nodes.new('ShaderNodeMapping')
    map_.inputs['Scale'].default_value = (1.2, 260, 260)
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 2.5
    noise.inputs['Detail'].default_value = 8
    links.new(coords.outputs['Object'], map_.inputs['Vector'])
    links.new(map_.outputs['Vector'], noise.inputs['Vector'])
    base = b.inputs['Base Color'].default_value
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = .32
    ramp.color_ramp.elements[1].position = .68
    ramp.color_ramp.elements[0].color = tuple(c * (1 - amount) for c in base[:3]) + (1,)
    ramp.color_ramp.elements[1].color = tuple(min(1, c * (1 + amount)) for c in base[:3]) + (1,)
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], b.inputs['Base Color'])


def principled(name, color, metallic=0.0, rough=0.5, spec=0.5, aniso=0.0, grain=0.0, grain_scale=900):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nodes, links = m.node_tree.nodes, m.node_tree.links
    b = nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    b.inputs['Specular'].default_value = spec
    b.inputs['Anisotropic'].default_value = aniso
    if grain:
        coords = nodes.new('ShaderNodeTexCoord')
        noise = nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = grain_scale
        noise.inputs['Detail'].default_value = 4
        bump = nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = grain
        bump.inputs['Distance'].default_value = 0.002
        links.new(coords.outputs['Object'], noise.inputs['Vector'])
        links.new(noise.outputs['Fac'], bump.inputs['Height'])
        links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def add_mesh(name, verts, tris, material, smooth):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata((verts * SCALE).tolist(), [], tris.tolist())
    mesh.update()
    mesh.polygons.foreach_set('use_smooth', [smooth] * len(mesh.polygons))
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(material)
    scene.collection.objects.link(obj)
    return obj


def load(path, materials):
    data = np.load(path)
    for key in sorted({k.rsplit('|', 1)[0] for k in data.files}):
        material, surface = key.split('|')
        add_mesh(key, data[key + '|v'], data[key + '|t'], materials[(material, surface)], surface == 'curved')


def aim(obj, target):
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = (Vector(target) - obj.location).to_track_quat('-Z', 'Y')


def area(name, at, target, size, power, color=(1, 1, 1)):
    light = bpy.data.lights.new(name, 'AREA')
    light.shape = 'RECTANGLE'
    light.size, light.size_y = size
    light.energy = power
    light.color = color
    obj = bpy.data.objects.new(name, light)
    obj.location = at
    scene.collection.objects.link(obj)
    aim(obj, target)
    return obj


def sweep(material, y_front=18, y_back=-8, radius=4, top=16):
    profile = [(y_front, 0), (y_back, 0)]
    for i in range(1, 33):
        a = i / 32 * math.pi / 2
        profile.append((y_back - radius * math.sin(a), radius * (1 - math.cos(a))))
    profile.append((y_back - radius, top))
    verts = [(x, y, z) for x in (-25, 25) for y, z in profile]
    n = len(profile)
    faces = [(i, i + n, i + n + 1, i + 1) for i in range(n - 1)]
    mesh = bpy.data.meshes.new('sweep')
    mesh.from_pydata(verts, [], faces)
    mesh.polygons.foreach_set('use_smooth', [True] * len(mesh.polygons))
    obj = bpy.data.objects.new('sweep', mesh)
    obj.data.materials.append(material)
    scene.collection.objects.link(obj)


def reflector(at, target, size, strength):
    """A photographer's white card: only reflections see it, so the metal never mirrors the backdrop."""
    m = bpy.data.materials.new('card')
    m.use_nodes = True
    nodes = m.node_tree.nodes
    nodes.clear()
    emit = nodes.new('ShaderNodeEmission')
    emit.inputs['Strength'].default_value = strength
    output = nodes.new('ShaderNodeOutputMaterial')
    m.node_tree.links.new(emit.outputs[0], output.inputs['Surface'])
    w, h = size[0] / 2, size[1] / 2
    mesh = bpy.data.meshes.new('card')
    mesh.from_pydata([(-w, -h, 0), (w, -h, 0), (w, h, 0), (-w, h, 0)], [], [(0, 1, 2, 3)])
    obj = bpy.data.objects.new('card', mesh)
    obj.data.materials.append(m)
    obj.location = at
    scene.collection.objects.link(obj)
    aim(obj, target)
    obj.cycles_visibility.camera = False
    obj.cycles_visibility.diffuse = False
    obj.cycles_visibility.shadow = False


def world(strength, color=(1, 1, 1)):
    w = bpy.data.worlds.new('w')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (*color, 1)
    w.node_tree.nodes['Background'].inputs[1].default_value = strength
    scene.world = w


def quads(name, rects, z, material):
    """Flat dark marks: scale lines and display segments. rects = (x0, y0, x1, y1) in mm."""
    verts, faces = [], []
    for x0, y0, x1, y1 in rects:
        i = len(verts)
        verts += [(x0 * SCALE, y0 * SCALE, z * SCALE), (x1 * SCALE, y0 * SCALE, z * SCALE),
                  (x1 * SCALE, y1 * SCALE, z * SCALE), (x0 * SCALE, y1 * SCALE, z * SCALE)]
        faces.append((i, i + 1, i + 2, i + 3))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(material)
    scene.collection.objects.link(obj)


SEGMENTS = {'0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc',
            '7': 'abc', '8': 'abcdefg', '9': 'abcdfg'}


def seven_segment(text, x, y, h, material, z):
    w, t, rects = h * .52, h * .12, []
    for ch in text:
        if ch == '.':
            rects.append((x, y, x + t * 1.2, y + t * 1.2))
            x += t * 2.6
            continue
        on = SEGMENTS[ch]
        m = y + h / 2
        boxes = {'a': (x, y + h - t, x + w, y + h), 'd': (x, y, x + w, y + t), 'g': (x, m - t / 2, x + w, m + t / 2),
                 'b': (x + w - t, m, x + w, y + h), 'c': (x + w - t, y, x + w, m),
                 'f': (x, m, x + t, y + h), 'e': (x, y, x + t, m)}
        rects += [boxes[s] for s in on]
        x += w + h * .22
    quads('digits-' + text, rects, z, material)


def label(text, x, y, size, material, z):
    curve = bpy.data.curves.new('label', 'FONT')
    curve.body = text
    curve.size = size * SCALE
    curve.align_x = 'CENTER'
    obj = bpy.data.objects.new('label', curve)
    obj.location = (x * SCALE, y * SCALE, z * SCALE)
    obj.data.materials.append(material)
    scene.collection.objects.link(obj)


if part == 'bracket':
    scene.view_settings.view_transform = 'Filmic'
    scene.view_settings.look = 'Medium High Contrast'
    scene.view_settings.exposure = 0.42
    blasted = principled('blasted', (.72, .73, .75), metallic=1, rough=.36, grain=.3)
    bright = principled('bright', (.9, .91, .92), metallic=1, rough=.13)
    machined = principled('machined', (.86, .87, .88), metallic=1, rough=.2, grain=.05, grain_scale=1400)
    load(f'{folder}/bracket.npz', {('aluminium', 'flat'): blasted, ('aluminium', 'chamfer'): bright,
                                   ('aluminium', 'curved'): machined})
    backdrop = principled('backdrop', (.014, .055, .15), rough=1, spec=0)
    sweep(backdrop)
    world(.25, (.72, .8, 1))
    cam = bpy.data.cameras.new('cam')
    cam.lens = 105
    cam.sensor_width = 36
    obj = bpy.data.objects.new('cam', cam)
    obj.location = (3.3, 8.2, 3.2)
    scene.collection.objects.link(obj)
    aim(obj, (0.02, -0.12, .68))
    scene.camera = obj
    area('key', (-1.6, 1.2, 6), (0, 0, .6), (9, 7), 330)
    area('front', (1.8, 7, 2.2), (0, 0, .7), (6, 3.4), 260)
    area('rim', (4.6, -3.6, 2.6), (0, -.3, .8), (.9, 5), 420)
    reflector((2.0, -3.0, .9), (.8, -.3, .7), (3.2, 2.2), .34)
else:
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    steel = principled('steel', (.4, .41, .43), metallic=1, rough=.24, aniso=.6, grain=.05, grain_scale=1800)
    add_brushing(steel, .22)
    steel_bright = principled('steel-bright', (.46, .47, .49), metallic=1, rough=.2)
    plastic = principled('plastic', (.01, .011, .013), rough=.5, spec=.3)
    plastic_edge = principled('plastic-edge', (.02, .02, .024), rough=.35)
    lcd = principled('lcd', (.72, .77, .66), rough=.5, spec=.2)
    light_mat = principled('light', (.8, .81, .82), rough=.45)
    mark = principled('mark', (.01, .012, .014), rough=.6)
    load(f'{folder}/caliper.npz', {
        ('steel', 'flat'): steel, ('steel', 'chamfer'): steel_bright, ('steel', 'curved'): steel_bright,
        ('plastic', 'flat'): plastic, ('plastic', 'chamfer'): plastic_edge, ('plastic', 'curved'): plastic_edge,
        ('lcd', 'flat'): lcd, ('lcd', 'curved'): lcd, ('light', 'flat'): light_mat, ('light', 'curved'): light_mat})
    ticks = [(x - .09, 8 - (3.2 if x % 10 == 0 else 1.7 if x % 5 == 0 else 1.1), x + .09, 8) for x in range(0, 201)]
    quads('scale', ticks, 3.22, mark)
    for x in range(10, 201, 10):
        label(str(x // 10), x, .9, 3.2, mark, 3.22)
    seven_segment('46.00', 66, 4.4, 8, mark, 10.45)
    label('mm', 98.5, 4.2, 3.4, mark, 10.45)
    floor = principled('floor', (.9, .9, .9), rough=.62, spec=.3)
    add_mesh('floor', np.array([[-1000, -1000, -.05], [1500, -1000, -.05], [1500, 1000, -.05], [-1000, 1000, -.05]], dtype=float),
             np.array([[0, 1, 2], [0, 2, 3]]), floor, False)
    world(.16)
    cam = bpy.data.cameras.new('cam')
    cam.type = 'ORTHO'
    cam.ortho_scale = 3.0
    cam.sensor_fit = 'HORIZONTAL'
    obj = bpy.data.objects.new('cam', cam)
    obj.location = (1.12, -.11, 5)
    scene.collection.objects.link(obj)
    scene.camera = obj
    area('top', (.2, 2.8, 5.4), (1.12, -.11, 0), (9, 4), 195)
    area('fill', (2.4, -3.6, 5), (1.12, -.11, 0), (9, 3), 105)
    area('left', (-4.2, -.1, 3.2), (1.12, -.11, 0), (4, 7), 212)
    area('right', (6.4, -.1, 3.2), (1.12, -.11, 0), (4, 7), 212)

bpy.ops.render.render(write_still=True)
print('rendered', out)
