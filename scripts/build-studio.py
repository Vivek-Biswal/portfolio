"""Reproducible, local-only Blender source for the open studio shell.
Run with Blender --background --factory-startup --python scripts/build-studio.py.
"""
import bpy, math, pathlib
from mathutils import Vector

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'studio'
OUT.mkdir(exist_ok=True)

def material(name, color, roughness=.72, metal=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1)
    m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=roughness
    bs.inputs['Metallic'].default_value=metal
    return m

cream=material('Warm limestone',(.78,.73,.61))
oak=material('Honey oak',(.46,.29,.15))
sage=material('Sage upholstery',(.28,.39,.29))
ink=material('Forest enamel',(.055,.11,.09),.38)
brass=material('Brushed brass',(.56,.38,.14),.3,.65)
paper=material('Ivory',(.92,.88,.74))
leaf=material('Leaves',(.18,.32,.18))
terra=material('Terracotta',(.51,.25,.15))
screen=material('Screen glass',(.06,.14,.13),.25)
mint=material('Phosphor mint',(.56,.78,.55),.55)
apricot=material('Apricot enamel',(.73,.43,.24),.6)
lavender=material('Dusty lilac',(.46,.39,.54),.7)
sand=material('Natural linen',(.65,.58,.43),.95)
light_tile=material('Limestone variation',(.81,.76,.65))
window=material('Frosted sage glass',(.50,.65,.55),.55)

# Author coordinates match the browser: x horizontal, z depth, y height.
def box(name,x,y,z,w,h,d,mat,bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y))
    o=bpy.context.object; o.name=name; o.dimensions=(w,d,h)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    if bevel:
        mod=o.modifiers.new('Soft crafted edges','BEVEL'); mod.width=bevel; mod.segments=2
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o

def cylinder(name,x,y,z,r,h,mat,vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=(x,-z,y))
    o=bpy.context.object; o.name=name; o.data.materials.append(mat)
    bevel=o.modifiers.new('Edge highlight','BEVEL'); bevel.width=.012; bevel.segments=2
    o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o

def sphere(name,x,y,z,r,mat,scale=(1,1,1)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=r,location=(x,-z,y))
    o=bpy.context.object;o.name=name;o.scale=(scale[0],scale[2],scale[1]);o.data.materials.append(mat)
    for face in o.data.polygons: face.use_smooth=True
    return o

box('Foundation',0,-.22,0,14.4,.4,10.4,ink)
for row in range(20):
    for col in range(7):
        box('Oak floor',-6+col*2,-.005,-4.75+row*.5,1.985,.05,.485,light_tile if (row*3+col)%7==0 else cream,.006)
box('Back wall',0,1.45,-5,14.3,3,.18,paper)
box('Left low wall',-7,.45,0,.18,1,10,cream)
box('Right low wall',7,.45,0,.18,1,10,cream)
box('Back rail',0,.6,-4.87,14,.08,.08,oak)
for x in [-5.4,-1.8,1.8,5.4]:
    box('Window surround',x,2.05,-4.86,2.8,1.55,.12,ink)
    box('Window soft daylight',x,2.05,-4.78,2.55,1.3,.05,window)
    box('Window mullion',x,2.05,-4.72,.05,1.3,.04,brass)
    box('Window sill',x,1.28,-4.65,2.95,.08,.3,oak)
    box('Window transom',x,2.2,-4.72,2.55,.04,.04,brass,.01)

for station,(x,z) in enumerate([(-4,0),(0,-.6),(4,0)]):
    rug=[sage,sand,apricot][station]
    box('Woven rug',x,.04,z+.5,2.9,.035,2.5,rug,.025)
    for dz in [-1.13,1.13]:
        box('Rug woven border',x,.06,z+.5+dz,2.7,.008,.04,paper,0)
    for dx in [-1.33,1.33]:
        box('Rug woven border',x+dx,.06,z+.5,.04,.008,2.3,paper,0)
    box('Worktop',x,.85,z,2.2,.13,.85,oak)
    box('Desk apron',x,.72,z,2,.16,.65,oak,.025)
    box('Desk drawer pull',x,.72,z+.34,.3,.025,.025,brass,.01)
    for dx in [-.85,.85]:
        for dz in [-.28,.28]: box('Desk leg',x+dx,.4,z+dz,.07,.8,.07,ink,.015)
    box('Chair seat',x,.47,z+1,.65,.13,.6,sage)
    box('Chair back',x,.83,z+1.27,.65,.64,.1,sage)
    box('Chair cushion',x,.55,z+1,.56,.04,.51,rug,.018)
    for dx in [-.25,.25]:
        for dz in [-.22,.22]: box('Chair leg',x+dx,.23,z+1+dz,.05,.46,.05,oak,.012)

box('Projects monitor',-4,1.3,-.08,1.05,.63,.06,ink)
box('Projects display',-4,1.3,-.035,.94,.51,.02,screen,.015)
box('Monitor stand',-4,.98,-.08,.07,.25,.07,brass)
box('Monitor foot',-4,.93,-.08,.43,.025,.26,ink,.01)
box('Keyboard',-4,.94,.27,.65,.035,.2,paper,.012)
for row in range(3):
    for col in range(9):
        box('Keyboard keys',-4.26+col*.064,.96,.21+row*.055,.045,.007,.035,sage,0)
box('Monitor editor sidebar',-4.32,1.3,-.019,.18,.42,.006,sage,0)
for line in range(5):
    box('Monitor code line',-3.94,1.44-line*.065,-.018,.39-(line%3)*.055,.018,.006,mint if line%2 else paper,0)
cylinder('Pencil cup',-4.85,1.02,-.15,.09,.2,terra)
for dx in [-.035,.03]: cylinder('Pencil',-4.85+dx,1.18,-.15,.012,.25,brass,8)
for i in range(3): box('Notebook',-.45+i*.18,.95+i*.055,-.6,.65,.05,.44,[paper,sage,terra][i])
box('Open notebook cover',.52,.935,-.48,.65,.025,.47,sage,.01)
for dx in [-.15,.15]: box('Open notebook page',.52+dx,.955,-.48,.29,.016,.43,paper,.008)
for line in range(4): box('Notebook ruled line',.66,.966,-.61+line*.075,.22,.003,.008,sand,0)
pen=box('Notebook fountain pen',.65,.982,-.25,.38,.025,.025,ink,.007);pen.rotation_euler.z=.24
box('Phone base',4,.98,0,.55,.15,.32,ink)
box('Telephone receiver',4,1.16,-.07,.7,.1,.13,ink)
for dx in [-.25,.25]: sphere('Receiver earpiece',4+dx,1.13,-.07,.1,ink,scale=(.85,.65,1.05))
cylinder('Telephone dial surround',4,1.061,.065,.115,.018,brass,24)
cylinder('Telephone dial centre',4,1.075,.065,.052,.012,ink,16)
for i in range(10):
    a=i*math.tau/10
    cylinder('Telephone dial hole',4+math.cos(a)*.083,1.074,.065+math.sin(a)*.083,.014,.006,ink,8)
box('Contact stationery',4.75,.94,-.07,.4,.028,.3,paper,.012)
box('Contact seal',4.75,.958,-.07,.07,.006,.07,terra,.01)

for i in range(7):
    x=-5.7+i*1.9
    box('Arcade cabinet '+str(i),x,.7,-3.45,.82,1.4,.65,ink)
    accent=[mint,apricot,lavender,window,sand,lavender,mint][i]
    box('Cabinet trim',x,1.45,-3.45,.9,.15,.7,accent)
    box('Cabinet display',x,1.03,-3.105,.65,.49,.025,screen,.015)
    box('Cabinet marquee',x,1.45,-3.085,.72,.09,.015,paper,.008)
    box('Control panel',x,.65,-3.04,.8,.12,.3,sage)
    box('Coin slot',x,.32,-3.1,.1,.08,.02,brass,.008)
    box('Cabinet lower accent',x,.18,-3.115,.62,.05,.025,accent,.006)
    cylinder('Arcade joystick',x-.21,.78,-2.98,.017,.16,brass,8)
    sphere('Joystick grip',x-.21,.87,-2.98,.05,ink)
    for dx in [.12,.23]: cylinder('Arcade button',x+dx,.72,-2.99,.038,.022,apricot if dx<.2 else paper,12)
    def pixel(dx,dy,w=.055,h=.055,mat=accent):
        box('Cabinet '+str(i)+' game pixel',x+dx,1.03+dy,-3.088,w,h,.006,mat,0)
    if i==0:  # Snake, with a clear bend and a single fruit.
        for dx,dy in [(-.18,-.06),(-.12,-.06),(-.06,-.06),(-.06,0),(-.06,.06),(0,.06),(.06,.06)]: pixel(dx,dy)
        pixel(.2,.14,mat=apricot)
    elif i==1:
        for row in range(3):
            for col in range(5): pixel(-.22+col*.11,.16-row*.065,.09,.045,paper if row==0 else accent)
        pixel(.04,-.17,.18,.025);pixel(.09,-.07,.03,.03)
    elif i==2:
        for row in [-1,1]:
            for col in [-1,0,1]:
                pixel(col*.17,row*.1,.125,.14,accent)
                pixel(col*.17,row*.1,.034,.05,paper)
    elif i==3:
        pixel(0,-.17,.55,.018,paper);pixel(-.17,-.08,.055,.14,accent)
        pixel(.1,-.13,.05,.07,apricot);pixel(.22,.12,.03,.03,paper)
    elif i==4:
        pixel(-.23,.08,.025,.17);pixel(.23,-.08,.025,.17)
        for y in [-.16,-.08,0,.08,.16]:pixel(0,y,.012,.035,paper)
        pixel(.1,.03,.03,.03,paper)
    elif i==5:
        for col,top in enumerate([2,3,1,2,4]):
            for row in range(top):pixel(-.2+col*.09,-.18+row*.07,.072,.055,[accent,paper,mint][(col+row)%3])
        pixel(.02,.13);pixel(.08,.13);pixel(.08,.19)
    else:
        for dx in [-.22,.22]:pixel(dx,0,.025,.37)
        pixel(0,.18,.46,.025);pixel(0,-.18,.46,.025)
        pixel(-.05,.07,.25,.025);pixel(.05,-.05,.25,.025)
        pixel(-.1,-.11,.035,.035,paper);pixel(.14,.12,.035,.035,apricot)

for x,z in [(-6.4,3.7),(6.4,3.7),(-6.4,-1.2),(6.4,-1.2)]:
    cylinder('Planter',x,.25,z,.3,.5,terra,16)
    cylinder('Planter rim',x,.49,z,.32,.06,terra,16)
    cylinder('Potting soil',x,.51,z,.27,.015,oak,16)
    box('Plant trunk',x,.8,z,.08,1,.08,oak)
    for i in range(3):
        sphere('Plant foliage',x+(.18 if i%2 else -.12),1+i*.22,z,.4,leaf,scale=(1,.9,.75))
box('Entrance mat',0,.055,4.2,2.5,.05,1.2,ink)
for dz in [-.47,.47]:box('Entrance mat piping',0,.082,4.2+dz,2.2,.006,.025,brass,0)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'docs'/'assets'/'open-studio.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'open-studio.glb'),export_format='GLB',export_apply=True)
print('STUDIO_ASSET_READY')
