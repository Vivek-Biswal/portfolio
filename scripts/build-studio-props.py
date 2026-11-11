"""Editable interaction props. Stable node names are the runtime contract."""
import bpy, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*color,1);m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.6;return m
green=material('Studio enamel',(.045,.09,.06));paper=material('Journal paper',(.9,.85,.69));brass=material('Warm brass',(.5,.35,.15))
def group(name,p=(0,0,0),parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=(p[0],-p[2],p[1]);return o
def box(name,p,size,mat,parent):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.parent=parent;o.location=(p[0],-p[2],p[1]);o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 bevel=o.modifiers.new('Soft manufactured edges','BEVEL');bevel.width=.008;bevel.segments=3;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name);return o
root=group('Interactive_objects')
journal=group('Journal_root',(-5.96,.99,.91),root)
box('Journal_pages',(.26,.03,0),(.52,.04,.36),paper,journal)
box('Journal_back',(.26,0,0),(.55,.025,.39),green,journal)
hinge=group('Journal_cover_hinge',(0,.07,0),parent=journal);box('Journal_cover',(.26,0,0),(.55,.025,.39),green,hinge)
leaf=group('Journal_page_hinge',(0,.057,0),parent=journal);box('Journal_turning_page',(.255,0,0),(.51,.005,.35),paper,leaf)
base=group('Telephone_base_root',(4.75,1.06,3.73),root)
box('Telephone_base',(0,0,0),(.56,.17,.4),green,base)
for i in range(10):
 a=i*math.tau/10;box('Dial_key_'+str(i),(.10*math.cos(a),.10,.10*math.sin(a)),(.033,.012,.033),brass,base)
receiver=group('Telephone_receiver',(4.75,1.23,3.73),root)
box('Receiver_handle',(0,0,0),(.34,.065,.09),green,receiver)
for x in [-.17,.17]:box('Receiver_end',(x,-.025,0),(.13,.12,.15),green,receiver)
keyboard=group('Project_keyboard',(-4.6,1.49,-4.03),root)
box('Keyboard_base',(0,0,0),(.57,.025,.19),green,keyboard)
for i in range(8):
 for j in range(3):box(f'Key_{i}_{j}',(-.245+i*.07,.018,-.06+j*.06),(.045,.006,.04),paper,keyboard)
# Include all anchor contacts in the editable asset, in matching author coordinates.
stations=[('projects',-4.6,-3.3,.5,False),('notes',-5.7,1.85,0,False),('contact',4.75,4.65,0,False)]
games=['snake','bricks','memory','runner','pong','blocks','maze']
stations += [(name,1.6+i*1.55 if i<4 else 5.67,-3.34 if i<4 else -1.1+(i-4)*1.55,0,i>=4) for i,name in enumerate(games)]
for name,x,z,y,side in stations:
 group(name+'_seat',(x,y+.58,z),root)
 group(name+'_hand_contact',(x+(.43 if side else 0),y+.98,z-(0 if side else .43)),root)
 group(name+'_screen_anchor',(x+(1.08 if side else 0),y+1.2,z-(0 if side else 1.08)),root)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'docs/assets/studio-props.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/studio/studio-props.glb'),export_format='GLB',export_animations=False,export_extras=True)
