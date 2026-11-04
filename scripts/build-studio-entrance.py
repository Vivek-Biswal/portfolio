"""Render the studio entrance locally with Blender. No external assets or services."""
import bpy, math, pathlib
from mathutils import Vector

ROOT=pathlib.Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name,color,roughness=.75,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=roughness;bs.inputs['Metallic'].default_value=metal
    return m

stone=mat('Warm limestone',(.73,.69,.57))
paper=mat('Ivory lettering',(.94,.90,.77))
forest=mat('Deep forest',(.045,.10,.075),.42)
sage=mat('Sage green',(.22,.34,.24))
glass=mat('Sage glass',(.37,.50,.43),.26)
oak=mat('Honey oak',(.47,.28,.14))
brass=mat('Satin brass',(.58,.40,.16),.3,.65)
terra=mat('Clay planter',(.54,.29,.18))
leaf=mat('Leaf green',(.19,.32,.16))

def box(name,loc,size,material,bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object;o.name=name;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material)
    if bevel:
        m=o.modifiers.new('Soft edges','BEVEL');m.width=bevel;m.segments=3
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o

def text(body,loc,size,material):
    curve=bpy.data.curves.new(body,'FONT');curve.body=body;curve.size=size
    curve.align_x='CENTER';curve.align_y='CENTER';curve.space_character=1.2
    curve.extrude=.002;curve.bevel_depth=.001
    o=bpy.data.objects.new(body,curve);bpy.context.collection.objects.link(o)
    o.location=loc;o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(material)
    return o

box('Floating foundation',(0,0,.10),(8.6,5,.20),forest)
box('Limestone terrace',(0,-.1,.26),(8.4,4.7,.18),stone)
box('Studio shell',(0,.55,2.03),(7.2,3,3.5),stone)
box('Front recess',(0,-.98,1.94),(6.7,.08,3.02),forest)
box('Deep green parapet',(0,.55,3.85),(7.6,3.4,.28),forest)
box('Roof edge highlight',(0,.55,4.02),(7.5,3.3,.06),sage)
box('Roof garden bed',(-1.5,1.1,4.09),(3.2,1.7,.13),oak)
for x in [-2.8,-2.3,-1.8,-1.3,-.8,-.3]:
    box('Roof sedum',(x,1.1,4.18),(.42,1.55,.13),sage,.08)
box('Skylight curb',(1.8,.7,4.08),(1.8,1.8,.14),forest)
box('Skylight pane',(1.8,.7,4.19),(1.65,1.65,.08),glass)
for x in [1,1.8,2.6]:box('Skylight mullion',(x,.7,4.24),(.035,1.65,.025),brass,.005)

# Tall atelier windows, separated from the entrance by oak slats.
for x in [-2.15,-.48]:
    box('Window',(x,-1.05,1.95),(1.5,.06,2.55),glass)
    box('Window reflection',(x-.42,-1.09,2.2),(.12,.01,1.8),paper,.005)
    box('Window sill',(x,-1.18,.65),(1.65,.34,.09),oak)
    for z in [1.6,2.65]:box('Window transom',(x,-1.11,z),(1.5,.05,.04),brass,.008)
    box('Window centre bar',(x,-1.12,1.94),(.04,.05,2.6),forest,.008)
    box('Interior workbench',(x,-1.1,1.25),(1.15,.05,.09),oak)
    box('Interior screen',(x-.13,-1.115,1.49),(.48,.03,.35),forest)
    box('Screen reflection',(x-.13,-1.14,1.49),(.4,.01,.27),sage)
for x in [.45,.60,.75,.90]:box('Oak screen',(x,-1.10,1.95),(.065,.14,2.8),oak,.01)

box('Door surround',(2.13,-1.08,1.85),(1.7,.2,3.08),oak)
box('Door frame',(2.13,-1.2,1.84),(1.5,.05,2.9),forest)
box('Door glass',(2.13,-1.24,1.92),(1.25,.035,2.55),glass)
box('Door warm interior',(2.13,-1.265,2.05),(.9,.015,1.85),sage)
box('Door kickplate',(2.13,-1.27,.55),(1.25,.03,.24),brass)
box('Door pull',(2.58,-1.35,1.8),(.035,.10,.47),brass,.012)
box('Door light',(2.13,-1.23,3.29),(1.23,.08,.035),paper,.01)
box('Threshold',(2.13,-1.49,.43),(1.85,.6,.15),forest)
box('Front step',(2.13,-1.9,.28),(2.2,.65,.13),stone)
box('Welcome mat',(2.13,-2.05,.36),(1.42,.58,.025),sage)

box('Studio sign',(-1.05,-1.18,3.32),(3.8,.12,.62),forest)
text('VIVEK',(-1.05,-1.251,3.44),.21,paper)
text('OPEN STUDIO',(-1.05,-1.253,3.19),.15,paper)
text('03',(3.15,-1.03,3.32),.19,forest)

# Visible side elevation adds depth without a heavy opaque side wall.
box('Side window',(3.615,.55,2.15),(.06,2.15,1.9),forest)
box('Side glass',(3.651,.55,2.15),(.025,1.98,1.73),glass)
for y in [-.1,.55,1.2]:box('Side mullion',(3.67,y,2.15),(.03,.035,1.8),brass,.008)
box('Side sill',(3.73,.55,1.16),(.25,2.25,.08),oak)

def planter(x,y,scale=1):
    bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=.25*scale,radius2=.34*scale,depth=.55*scale,location=(x,y,.35+.275*scale))
    o=bpy.context.object;o.name='Terracotta pot';o.data.materials.append(terra)
    box('Plant trunk',(x,y,.9*scale),(.055,.055,.8*scale),oak,.012)
    for i in range(4):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=.33*scale,location=(x+math.sin(i*2)*.18*scale,y+math.cos(i*2)*.13*scale,1.05*scale+i*.17*scale))
        o=bpy.context.object;o.name='Foliage';o.scale=(1,.75,.85);o.data.materials.append(leaf)
        for f in o.data.polygons:f.use_smooth=True
planter(-3.5,-1.67,1.1);planter(3.7,-1.65,.8)
box('Studio bench',(-1.25,-1.75,.78),(2.1,.5,.12),oak)
for x in [-2.05,-.45]:box('Bench leg',(x,-1.75,.53),(.09,.38,.5),forest)

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.world.color=(.45,.45,.45)
for name,loc,power,size in [('Softbox',(-5,-7,10),1500,8),('Fill',(6,-2,6),800,6),('Rim',(2,5,8),1100,5)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size
    o.rotation_euler=(Vector((0,0,1.7))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(9,-16,10));camera=bpy.context.object
camera.rotation_euler=(Vector((0,0,2))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=10.8;scene.camera=camera
scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='AgX'
scene.render.filepath=str(ROOT/'public'/'studio'/'entrance.png')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'docs'/'assets'/'studio-entrance.blend'))
bpy.ops.render.render(write_still=True)
print('STUDIO_ENTRANCE_READY')
