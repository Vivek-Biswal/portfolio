"""Reference-led sunset atelier. All geometry is authored locally, without paid assets.
Coordinates are browser X / height Y / depth Z. Wall_N/E/S/W prefixes are runtime cutaways.
"""
import bpy, math, pathlib, random
from mathutils import Vector
R=random.Random(31)
ROOT=pathlib.Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def mat(name,color,rough=.7,metal=0,glow=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if glow:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=glow
    return m
stone=[mat('Sandstone '+str(i),(.49+i*.025,.39+i*.024,.29+i*.022)) for i in range(5)]
wood=[mat('Oak plank '+str(i),(.25+i*.018,.115+i*.011,.047+i*.007),.58) for i in range(7)]
oak=wood[3];dark=mat('Dark stained oak',(.095,.045,.02));forest=mat('Forest enamel',(.035,.08,.056),.45)
brass=mat('Old brass',(.5,.30,.085),.33,.65);paper=mat('Warm paper',(.8,.7,.49))
ivory=mat('Linen',(.65,.55,.38));terracotta=mat('Terracotta',(.42,.18,.085))
leaves=[mat('Leaf '+str(i),(.04+i*.018,.10+i*.025,.027+i*.009)) for i in range(4)]
ink=mat('Screen black',(.012,.02,.027),.3);blue=mat('Screen blue',(.12,.28,.48),.4,0,.6)
pink=mat('Arcade magenta',(.49,.045,.24),.4,0,1.2);violet=mat('Arcade violet',(.23,.10,.55),.4,0,1)
gold=mat('Lamp amber', (1,.47,.08),.3,0,3);creamLight=mat('Lamp core',(1,.77,.30),.4,0,2)
bookmats=[forest,terracotta,ivory,blue,dark,mat('Book burgundy',(.27,.035,.035))]
sage=mat('Sofa velvet',(.11,.19,.13),.95);rug=mat('Persian rug green',(.075,.13,.10),1)
glass=mat('Sunset glass',(.38,.29,.26),.25)
PREFIX=''
def box(n,x,y,z,w,h,d,m,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name=PREFIX+n;o.dimensions=(w,d,h)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
    if bevel:
        mod=o.modifiers.new('Crafted edge','BEVEL');mod.width=bevel;mod.segments=1
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o
def ball(n,x,y,z,r,m,scale=(1,1,1)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=r,location=(x,-z,y));o=bpy.context.object;o.name=PREFIX+n
    o.scale=(scale[0],scale[2],scale[1]);o.data.materials.append(m)
    for p in o.data.polygons:p.use_smooth=True
    return o
def cyl(n,x,y,z,r,h,m,vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=(x,-z,y));o=bpy.context.object;o.name=PREFIX+n;o.data.materials.append(m)
    o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
def lettering(words,x,y,z,size,m=paper):
    curve=bpy.data.curves.new(words,'FONT');curve.body=words;curve.align_x='CENTER';curve.align_y='CENTER';curve.size=size;curve.space_character=1.15;curve.extrude=.002
    o=bpy.data.objects.new(PREFIX+words,curve);bpy.context.collection.objects.link(o);o.location=(x,-z,y);o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(m)
    bpy.context.view_layer.objects.active=o;o.select_set(True)
    for other in bpy.context.selected_objects:
        if other!=o:other.select_set(False)
    bpy.ops.object.convert(target='MESH');return bpy.context.object
def sign(words,x,y,z,width):
    box('Sign brass',x,y,z,width,.66,.10,brass)
    box('Sign enamel',x,y,z+.065,width-.10,.55,.04,forest)
    lettering(words,x,y,z+.095,.25 if len(words)<10 else .20)
def pot(x,y,z,s=1):
    cyl('Clay pot',x,y+.19*s,z,.22*s,.38*s,terracotta)
    cyl('Pot rim',x,y+.38*s,z,.245*s,.06*s,terracotta)
    cyl('Soil',x,y+.41*s,z,.21*s,.02*s,dark)
    for i in range(7):
        a=i*2.4;r=.15*s
        ball('Plant leaf',x+math.cos(a)*r,y+(.48+i*.065)*s,z+math.sin(a)*r,.19*s,leaves[i%4],(.6,1.2,.5))
def ivy(x,y,z,length=1.4):
    for i in range(int(length*7)):
        yy=y-i*.14;xx=x+math.sin(i*1.7)*.12
        box('Vine stem',xx,yy,z,.025,.18,.025,leaves[0],0)
        for side in [-1,1]:ball('Ivy leaf',xx+side*.09,yy+.02,z+.04,.11,leaves[i%4],(1,.7,.35))
def lantern(x,y,z):
    box('Sconce plate',x,y+.12,z,.14,.37,.07,forest)
    box('Sconce arm',x,y+.25,z+.18,.06,.06,.35,brass)
    cyl('Lantern canopy',x,y+.2,z+.32,.17,.055,forest)
    cyl('Amber lantern',x,y,z+.32,.105,.32,gold)
    cyl('Lantern base',x,y-.18,z+.32,.14,.05,forest)
    for dx in [-.11,.11]:box('Lantern frame',x+dx,y,z+.32,.025,.37,.025,brass,0)
def shelf(x,y,z,w=1.3):
    box('Bookcase back',x,y+1.15,z,w,2.3,.13,dark)
    for dx in [-w/2,w/2]:box('Bookcase side',x+dx,y+1.15,z+.20,.08,2.4,.48,oak)
    for row in range(5):
        yy=y+.12+row*.52;box('Bookcase shelf',x,yy,z+.20,w,.07,.48,oak)
        if row<4:
            xx=x-w/2+.12
            while xx<x+w/2-.15:
                bw=R.uniform(.07,.14);bh=R.uniform(.28,.43)
                box('Book spine',xx,yy+.05+bh/2,z+.22,bw,bh,.28,R.choice(bookmats),.006)
                box('Spine label',xx,yy+.14,z+.365,bw*.6,.025,.004,brass,0);xx+=bw+.035
    pot(x+.3,y+2.23,z+.15,.55)
def framed(x,y,z,w=.6,h=.8):
    box('Picture frame',x,y,z,w,h,.05,oak)
    box('Drawing paper',x,y,z+.032,w-.07,h-.07,.012,paper,0)
    for i in range(4):box('Drawing ink',x,y-h*.25+i*h*.15,z+.04,w*R.uniform(.3,.65),.012,.005,forest,0)
def carpet(x,z,w,d,y=.055):
    box('Woven carpet',x,y,z,w,.025,d,rug,.005)
    for inset in [.1,.18,.35]:
        for dz in [-d/2+inset,d/2-inset]:box('Rug border',x,y+.015,z+dz,w-inset*2,.006,.025,ivory,0)
        for dx in [-w/2+inset,w/2-inset]:box('Rug border',x+dx,y+.015,z,.025,.006,d-inset*2,ivory,0)
    for xx in range(int(w/.55)):
        for zz in range(int(d/.55)):
            o=box('Rug diamond',x-w/2+.42+xx*.55,y+.018,z-d/2+.42+zz*.55,.105,.005,.105,ivory,0);o.rotation_euler.z=math.pi/4
def desk(x,z,y=0,w=2.5):
    box('Desk worktop',x,y+.91,z,w,.13,.94,oak)
    for dx in [-w/2+.24,w/2-.24]:
        box('Drawer pedestal',x+dx,y+.43,z,.44,.86,.75,dark)
        for k in range(3):
            box('Drawer',x+dx,y+.18+k*.25,z+.4,.39,.21,.06,oak)
            box('Drawer handle',x+dx,y+.18+k*.25,z+.445,.14,.025,.025,brass,.005)
    box('Chair cushion',x,y+.51,z+1.0,.66,.15,.62,sage,.07)
    box('Chair back',x,y+.85,z+1.29,.66,.65,.10,oak,.04)
    box('Chair back cushion',x,y+.85,z+1.225,.53,.48,.05,sage,.04)
    for dx in [-.26,.26]:
        for dz in [-.24,.24]:box('Chair leg',x+dx,y+.24,z+1+dz,.055,.48,.055,dark)
def monitor(x,y,z,m=blue):
    box('Monitor',x,y,z,1.03,.64,.075,forest)
    box('Display',x,y,z+.045,.93,.53,.012,ink,0)
    for i in range(6):box('Code line',x+.02,y+.18-i*.067,z+.054,R.uniform(.3,.65),.021,.006,m,0)
    box('Monitor riser',x,y-.42,z,.06,.26,.06,brass)
    box('Monitor foot',x,y-.54,z,.38,.035,.23,forest)
def transform_group(objects,x,z,angle):
    c,s=math.cos(angle),math.sin(angle)
    for o in objects:
        xx,zz=o.location.x,-o.location.y;o.location.x=x+c*xx+s*zz;o.location.y=-(z-s*xx+c*zz);o.rotation_euler.z+=angle

# Wooden roof terrace, masonry base and individual floor boards.
box('Foundation',0,-.40,0,16.5,.8,12.5,dark,.06)
for row in range(30):
    zz=-5.8+row*.4
    for col in range(8):
        xx=-7+col*2
        box('Oak floorboard',xx,.005,zz,1.985,.055,.388,R.choice(wood),.005)
        if row%5==0:
            for dx in [-.88,.88]:box('Floor nail',xx+dx,.034,zz,.016,.003,.016,brass,0)

# All four perimeter walls are independent cutaway groups, including their decor.
for side,cx,cz,length,angle in [('N',0,-6,16,0),('S',0,6,16,math.pi),('W',-8,0,12,math.pi/2),('E',8,0,12,-math.pi/2)]:
    PREFIX='Wall_'+side+'_';before=set(bpy.data.objects)
    # Solid lower stone and piers frame genuinely open windows, admitting sunset light.
    for row in range(2):
        for i in range(int(length)):
            box('Stone block',-length/2+.5+i,.2+row*.38,0,.97,.36,.25,R.choice(stone),.018)
    for i in range(int(length/2)+1):
        xx=-length/2+i*2
        box('Window pier',xx,2.12,0,.24,2.9,.30,R.choice(stone),.025)
        ivy(xx+.12,3.4,.20,R.uniform(.4,1.6))
    box('Stone cornice',0,3.62,0,length+.2,.24,.4,stone[3])
    box('Window head',0,3.36,.04,length,.10,.13,forest)
    box('Window sill',0,.87,.10,length,.10,.36,oak)
    for i in range(int(length/2)):
        xx=-length/2+1+i*2
        for dx in [-.92,0,.92]:box('Window mullion',xx+dx,2.12,.03,.055,2.45,.08,forest,.005)
        box('Window transom',xx,2.55,.03,1.86,.05,.08,forest,.005)
        if i%2==0:pot(xx,.94,.22,.55)
    transform_group(set(bpy.data.objects)-before,cx,cz,angle)
PREFIX=''

# Raised Projects atelier at the rear left. Broad steps keep movement continuous.
box('Projects platform',-4.75,.25,-3.75,6.1,.5,3.9,stone[2])
for i in range(3):box('Broad stair',-3.8,.083*(i+1),-1.35-i*.27,3.5,.166*(i+1),.32,stone[3])
desk(-4.6,-4.3,.5,3.5)
for x in [-5.25,-4.05]:monitor(x,1.95,-4.4)
box('Keyboard',-4.6,1.51,-3.99,.85,.035,.25,forest)
for row in range(3):
    for col in range(11):box('Keyboard key',-4.96+col*.07,1.535,-4.07+row*.065,.05,.008,.04,paper,0)
shelf(-7,.5,-5.28,1.25);shelf(-1.85,.5,-5.28,1.35)
box('Projects back panel',-4.6,2.15,-5.64,4.2,3.25,.18,stone[2])
sign('PROJECTS',-4.6,3.17,-5.48,3.7)
for x in [-6.8,-2.5]:lantern(x,2.9,-5.5);pot(x,.5,-3.1,.8)
for x in [-6.4,-2.8]:framed(x,2.3,-5.51,.55,.8)
carpet(-4.2,-2.9,3.9,1.2,.53)

# Ideas nook, its cork board, papers and shaded desk lamp.
box('Ideas partition',-5.75,1.65,-.02,4.25,3.3,.18,stone[1])
sign('IDEAS',-5.7,2.91,.12,2.5)
box('Pinboard frame',-5.7,1.9,.12,2.8,1.25,.09,oak)
box('Cork board',-5.7,1.9,.18,2.68,1.13,.025,terracotta)
for i in range(9):framed(-6.7+(i%3)*.8,1.55+(i//3)*.34,.21,.5,.29)
desk(-5.7,.85,0,2.9)
carpet(-5.7,1.8,3.2,2.8)
for dx in [-.26,.26]:box('Open journal',-5.7+dx,1.0,1.03,.5,.035,.44,paper,.005)
for i in range(5):box('Journal writing',-5.45,1.022,.88+i*.065,.36,.004,.006,dark,0)
cyl('Lamp base',-6.65,1,.75,.15,.04,brass);box('Lamp stem',-6.65,1.27,.75,.035,.55,.035,brass)
box('Green lamp shade',-6.65,1.56,.75,.42,.16,.24,forest,.06);box('Warm lamp underside',-6.65,1.47,.75,.35,.015,.18,gold)
pot(-4.55,.98,.8,.55);pot(-7.4,0,2.4,1.25)
for x in [-7.3,-4.3]:ivy(x,3.25,.18,1.4)

# Arcade alcove, four rear cabinets and three along its right side.
box('Arcade back',4,1.8,-5.65,7.5,3.6,.18,stone[1])
for x in [.55,7.45]:box('Arcade stone column',x,1.65,-2.9,.36,3.3,.6,stone[2])
box('Arcade lintel',4,3.25,-2.9,7.3,.45,.6,stone[3])
sign('VIVEK ARCADE',4,3.22,-2.56,5.65)
for x in [.72,7.3]:lantern(x,2.5,-2.56);ivy(x,3.4,-2.5,1.4)
carpet(4,-3.5,6.7,3.6)
def cabinet(x,z,number,angle=0):
    before=set(bpy.data.objects);accent=[gold,pink,violet,blue,pink,gold,violet][number]
    box('Cabinet body',0,.82,0,1.02,1.64,.80,forest,.055)
    box('Cabinet side trim',-.48,.86,.43,.045,1.6,.035,accent,0)
    box('Cabinet side trim',.48,.86,.43,.045,1.6,.035,accent,0)
    box('Arcade screen frame',0,1.15,.43,.89,.71,.07,dark)
    box('Arcade screen',0,1.15,.48,.77,.58,.015,ink,0)
    box('Marquee',0,1.75,.15,1.08,.22,1.02,accent)
    lettering(['SNAKE','BRICKS','MEMORY','GLITCH','PONG','BLOCKS','MAZE'][number],0,1.76,.675,.10,paper)
    box('Controls',0,.72,.59,1.03,.10,.40,dark)
    cyl('Joystick',-.26,.87,.64,.025,.22,brass);ball('Joystick knob',-.26,.99,.64,.06,accent)
    for dx in [.10,.25,.38]:cyl('Game button',dx,.79,.65,.045,.025,accent)
    box('Coin slot',0,.33,.43,.15,.08,.035,brass)
    # Unique miniature game illustrations rather than letter placeholders.
    for row in range(4):
        for col in range(6):
            if (row*3+col+number)%4!=0:box('Game pixel',-.28+col*.11,.98+row*.11,.495,.075,.06,.005,accent if row%2 else paper,0)
    cyl('Arcade stool seat',0,.48,1.08,.23,.10,terracotta)
    for dx in [-.14,.14]:box('Stool leg',dx,.23,1.08,.045,.46,.045,brass)
    transform_group(set(bpy.data.objects)-before,x,z,angle)
for i,x in enumerate([1.6,3.15,4.7,6.25]):cabinet(x,-4.42,i)
for i,z in enumerate([-1.1,.45,2.0]):cabinet(6.75,z,4+i,-math.pi/2)
for i in range(4):framed(1.5+i*1.6,2.65,-5.5,.7,1)

# Central reading/living area, books, coffee and the resident cat's cushion.
carpet(-.4,1.5,5.8,4.4)
box('Sofa base',-2.5,.35,4,2.5,.55,.88,forest,.10)
box('Sofa back',-2.5,.84,4.35,2.5,.80,.25,sage,.10)
for dx in [-.72,0,.72]:box('Sofa cushion',-2.5+dx,.66,3.98,.7,.22,.65,sage,.09)
for dx in [-1.2,1.2]:box('Sofa arm',-2.5+dx,.7,4,.2,.7,.85,sage,.08)
box('Knitted throw',-3.14,.88,4.12,.5,.06,.88,ivory,.01)
for i in range(7):box('Throw stitch',-3.35+i*.065,.917,4.12,.012,.008,.83,dark,0)
box('Coffee table',-.9,.55,3.85,1.65,.13,.8,oak,.07)
for dx in [-.6,.6]:box('Coffee table leg',-.9+dx,.25,3.85,.07,.5,.5,forest)
for i in range(3):box('Coffee table books',-1.2,.66+i*.06,3.85,.5,.05,.34,bookmats[i])
cyl('Coffee mug',-.5,.73,3.85,.10,.17,paper);pot(-.83,.63,3.6,.35)
shelf(-2,0,-.4,1.15);pot(-2.4,0,1.15,.8)

# Contact corner with a rotary telephone and open door frame.
box('Contact partition',4.75,1.55,2.7,3.2,3.1,.19,stone[2])
sign('SAY HELLO',4.75,2.73,2.84,2.65)
desk(4.75,3.65,0,2.25)
box('Telephone base',4.75,1.05,3.64,.56,.17,.4,forest,.06)
cyl('Telephone dial',4.75,1.15,3.72,.14,.025,brass,24)
for i in range(10):
    a=i*math.tau/10;cyl('Dial hole',4.75+math.cos(a)*.095,1.167,3.72+math.sin(a)*.095,.018,.009,dark,8)
box('Telephone receiver',4.75,1.28,3.56,.72,.09,.15,forest,.04)
for dx in [-.27,.27]:ball('Receiver end',4.75+dx,1.24,3.56,.11,forest,(.8,.6,1))
framed(3.8,1.97,2.85,.55,.7);framed(5.6,1.93,2.85,.48,.6)
lantern(3.45,2.24,2.85);pot(3.05,0,3.6,1.2)
box('Mailbox',6.5,1.2,4.6,.55,.8,.5,forest,.09);box('Mail slot',6.5,1.35,4.87,.35,.04,.02,brass)
for x in [.3,2.45]:box('Entrance door post',x,1.38,5.45,.15,2.76,.20,forest)
box('Entrance transom',1.375,2.76,5.45,2.3,.14,.20,forest)
carpet(1.4,5.05,1.8,1.2)

# Perimeter greenery and terrace railing. Nothing floats with a cutaway wall.
for x,z,s in [(-7.1,4.8,1.3),(-.5,-4.7,.9),(7.15,5,1),(2,-1.4,.7)]:pot(x,0,z,s)
for x in [-7.8,-6.9,-6]:
    box('Terrace railing',x,.55,5.8,.045,1.1,.045,forest)
box('Terrace handrail',-6.9,1.1,5.8,2.3,.055,.08,brass)

# Save an editable, lit Blender scene as well as its browser model.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.world.color=(.12,.08,.055)
for name,loc,power,color,size in [('Sunset',(10,8,7),1700,(1,.58,.29),7),('Soft sky',(-4,-4,12),750,(.63,.72,1),9)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size
    o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
for x,z in [(-4.6,-3.8),(-5.7,1),(4,-3.5),(4.75,3.65)]:
    bpy.ops.object.light_add(type='POINT',location=(x,-z,2.6));o=bpy.context.object;o.data.energy=60;o.data.color=(1,.50,.16);o.data.shadow_soft_size=.6
bpy.ops.object.camera_add(location=(14,-19,16));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=22;scene.camera=camera
scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.film_transparent=True
# Keep the initial foreground cutaway in Blender; the exporter includes all walls.
for o in bpy.data.objects:
    if o.name.startswith(('Wall_S_','Wall_E_')):o.hide_render=True
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'docs/assets/sunset-studio.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/studio/sunset-studio.glb'),export_format='GLB',export_apply=True,export_lights=False,export_cameras=False)
print('SUNSET_STUDIO_READY')
