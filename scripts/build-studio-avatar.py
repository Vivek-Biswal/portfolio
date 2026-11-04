"""Locally authored, editable skinned studio avatar. Blender 5.2, no external assets.
Coordinates in authoring helpers are x / height / forward. One joined mesh,
one armature; all actions reuse the same face and weights.
"""
import bpy, math, os
from mathutils import Vector, Matrix
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def v(p): return Vector((p[0],-p[2],p[1]))
def mat(name,color,rough=.65):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
 return m
skin=mat('Warm skin',(.46,.225,.112),.7); lip=mat('Natural lip',(.285,.09,.055)); hair=mat('Swept charcoal hair',(.018,.015,.014),.48)
cloth=mat('Cotton black',(.025,.029,.031),.92);pants=mat('Charcoal twill',(.055,.061,.073),.94);shoe=mat('Ivory sneakers',(.83,.8,.7),.8)
white=mat('Eye white',(.82,.78,.70),.38);iris=mat('Brown eyes',(.035,.017,.009),.3);teeth=mat('Warm smile',(.85,.81,.72),.52)
parts=[]
def ell(name,p,s,material,bone,seg=24,rings=16):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=v(p));o=bpy.context.object;o.name=name;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(material)
 for f in o.data.polygons:f.use_smooth=True
 g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE');parts.append(o);return o
def tube(name,points,radii,material,bones):
 verts=[];faces=[];n=16
 for j,p in enumerate(points):
  tangent=(v(points[min(j+1,len(points)-1)])-v(points[max(0,j-1)])).normalized()
  a=tangent.cross(Vector((0,1,0))).normalized();b=tangent.cross(a).normalized()
  for i in range(n):verts.append(v(p)+(a*math.cos(i*math.tau/n)+b*math.sin(i*math.tau/n))*radii[j])
 for j in range(len(points)-1):
  for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 faces.extend([tuple(reversed(range(n))),tuple((len(points)-1)*n+i for i in range(n))])
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.materials.append(material);o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
 for f in me.polygons:f.use_smooth=True
 groups={b:o.vertex_groups.new(name=b) for b in set(bones)}
 for j,b in enumerate(bones):groups[b].add(list(range(j*n,(j+1)*n)),1,'REPLACE')
 parts.append(o);return o
# Rest skeleton, with a relaxed narrow A pose.
rest={'hips':((0,.93,0),(0,1.07,0),None),'chest':((0,1.07,0),(0,1.43,0),'hips'),'head':((0,1.43,0),(0,1.77,0),'chest')}
for side,s in [('L',1),('R',-1)]:
 for n,a,b,parent in [('upperArm',(.245*s,1.40,0),(.31*s,1.15,0),'chest'),('forearm',(.31*s,1.15,0),(.34*s,.94,.025),'upperArm.'+side),('hand',(.34*s,.94,.025),(.35*s,.84,.035),'forearm.'+side),('upperLeg',(.12*s,.93,0),(.12*s,.51,.015),'hips'),('shin',(.12*s,.51,.015),(.12*s,.10,0),'upperLeg.'+side),('foot',(.12*s,.10,0),(.12*s,.08,.18),'shin.'+side)]:rest[n+'.'+side]=(a,b,parent)
 # Eyelids are separate deform bones within the same mesh, closed by scale.
 rest['lid.'+side]=((.072*s,1.707,.125),(.072*s,1.735,.125),'head')
arm=bpy.data.armatures.new('Vivek skeleton');rig=bpy.data.objects.new('VivekRig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for name,(a,b,parent) in rest.items():
 bone=arm.edit_bones.new(name);bone.head=v(a);bone.tail=v(b);bone.align_roll(Vector((1,0,0)).cross((bone.tail-bone.head).normalized()))
 if parent:bone.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
ell('Sweater body',(0,1.23,0),(.205,.30,.126),cloth,'chest')
ell('Sweater yoke',(0,1.365,0),(.235,.105,.116),cloth,'chest')
ell('Sweater hem',(0,1.01,0),(.193,.085,.13),cloth,'chest')
ell('Trouser hips',(0,.94,0),(.19,.13,.125),pants,'hips')
ell('Neck',(0,1.48,0),(.077,.13,.078),skin,'head')
ell('Collar',(0,1.451,0),(.104,.037,.104),cloth,'chest')
# Oval face, tapering jaw and cheek volume instead of a spherical oversized head.
ell('Face',(0,1.67,.004),(.153,.207,.133),skin,'head',40,28)
ell('Jaw',(0,1.56,.023),(.112,.083,.103),skin,'head')
ell('Chin',(0,1.526,.044),(.078,.038,.073),skin,'head')
for s in [-1,1]:
 ell('Ear',(.153*s,1.655,-.005),(.031,.052,.025),skin,'head')
 ell('Inner ear',(.171*s,1.652,.011),(.008,.028,.012),lip,'head')
 ell('Cheek',(.084*s,1.625,.070),(.040,.052,.020),skin,'head')
 side='L' if s>0 else 'R'
 ell('Almond eye',(.069*s,1.687,.119),(.044,.019,.018),white,'head')
 ell('Iris',(.069*s,1.686,.136),(.016,.016,.006),iris,'head')
 ell('Catchlight',(.064*s,1.693,.142),(.004,.004,.002),white,'head',12,8)
 tube('Brow',[(s*.027,1.728,.125),(s*.067,1.738,.130),(s*.106,1.725,.116)],[.009,.011,.006],hair,['head']*3)
 ell('Lid',(.069*s,1.707,.125),(.045,.008,.016),skin,'lid.'+side)
ell('Nose bridge',(0,1.655,.128),(.024,.055,.025),skin,'head')
ell('Nose tip',(0,1.625,.151),(.034,.023,.031),skin,'head')
for s in [-1,1]:ell('Nostril',(.025*s,1.614,.153),(.009,.005,.008),lip,'head',16,8)
# A small curved smile, no enormous continuous white slab.
tube('Smile shadow',[(-.08,1.588,.120),(-.045,1.574,.143),(0,1.57,.150),(.045,1.577,.143),(.079,1.594,.119)],[.006,.014,.017,.013,.005],lip,['head']*5)
tube('Upper teeth',[(-.063,1.588,.136),(-.03,1.582,.153),(0,1.58,.156),(.03,1.584,.152),(.061,1.592,.134)],[.006,.008,.008,.007,.004],teeth,['head']*5)
# Fitted hair cap and swept overlapping locks. All weighted to the same head.
ell('Hair cap',(0,1.79,-.022),(.158,.103,.137),hair,'head',32,20)
for i in range(4):
 o=ell('Swept lock',(-.09+i*.056,1.826-i*.009,.053),(.065,.045,.12),hair,'head');o.rotation_euler.y=-.25;o.rotation_euler.z=-.40
for s in [-1,1]:ell('Tapered side hair',(.14*s,1.746,-.03),(.027,.088,.086),hair,'head')
for side,s in [('L',1),('R',-1)]:
 ell('Shoulder '+side,(.22*s,1.36,0),(.084,.103,.086),cloth,'upperArm.'+side)
 tube('Sleeve '+side,[(.215*s,1.40,0),(.265*s,1.33,0),(.31*s,1.15,0),(.327*s,1.04,.014)],[.09,.083,.07,.065],cloth,['upperArm.'+side]*2+['forearm.'+side]*2)
 tube('Wrist '+side,[(.327*s,1.055,.014),(.34*s,.94,.025)],[.048,.037],skin,['forearm.'+side]*2)
 ell('Wrist joint '+side,(.34*s,.942,.025),(.038,.033,.031),skin,'hand.'+side)
 ell('Palm '+side,(.347*s,.90,.03),(.044,.063,.026),skin,'hand.'+side)
 for j in range(4):ell('Finger '+side,(s*(.32+j*.018),.854,.036),(.011,.031,.012),skin,'hand.'+side,12,8)
 ell('Thumb '+side,(.311*s,.906,.048),(.019,.035,.018),skin,'hand.'+side,16,10)
 tube('Trousers '+side,[(.12*s,.96,0),(.12*s,.80,0),(.12*s,.53,.014),(.12*s,.49,.013),(.12*s,.27,.005),(.12*s,.13,0)],[.105,.10,.081,.079,.066,.064],pants,['upperLeg.'+side]*3+['shin.'+side]*3)
 ell('Sneaker '+side,(.12*s,.084,.073),(.076,.067,.145),shoe,'foot.'+side)
 ell('Sole '+side,(.12*s,.033,.08),(.079,.028,.147),shoe,'foot.'+side)
 for j in range(3):tube('Lace '+side,[(.085*s,.14,.04+j*.028),(.15*s,.14,.04+j*.028)],[.005,.005],white,['foot.'+side]*2)
face=[o for o in parts if o.data.materials[0]==skin and o.vertex_groups.get('head') and o.name!='Neck']
bpy.ops.object.select_all(action='DESELECT')
for o in face:o.select_set(True)
bpy.context.view_layer.objects.active=face[0];bpy.ops.object.join();face_obj=bpy.context.object
parts=[o for o in parts if o not in face]+[face_obj]
remesh=face_obj.modifiers.new('Unified facial surface','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.004
bpy.ops.object.modifier_apply(modifier=remesh.name)
sm=face_obj.modifiers.new('Soft facial transitions','SMOOTH');sm.factor=.7;sm.iterations=5;bpy.ops.object.modifier_apply(modifier=sm.name)
dec=face_obj.modifiers.new('Web surface budget','DECIMATE');dec.ratio=.55;bpy.ops.object.modifier_apply(modifier=dec.name)
face_obj.vertex_groups.clear();g=face_obj.vertex_groups.new(name='head');g.add(list(range(len(face_obj.data.vertices))),1,'REPLACE')
for f in face_obj.data.polygons:f.use_smooth=True
# Smooth garment unions remove primitive seams, then restore blended rig weights.
for material,candidates in [(cloth,['chest','hips','upperArm.L','forearm.L','upperArm.R','forearm.R']),(pants,['hips','upperLeg.L','shin.L','upperLeg.R','shin.R']),(skin,['forearm.L','hand.L','forearm.R','hand.R'])]:
 selected=[o for o in parts if o.data.materials[0]==material and (material!=skin or any(o.vertex_groups.get(n) for n in candidates))]
 bpy.ops.object.select_all(action='DESELECT')
 for o in selected:o.select_set(True)
 bpy.context.view_layer.objects.active=selected[0];bpy.ops.object.join();garment=bpy.context.object
 parts=[o for o in parts if o not in selected]+[garment]
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 remesh=garment.modifiers.new('Continuous garment','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.004 if material==skin else .009;bpy.ops.object.modifier_apply(modifier=remesh.name)
 sm=garment.modifiers.new('Tailored surface','SMOOTH');sm.factor=.8;sm.iterations=5;bpy.ops.object.modifier_apply(modifier=sm.name)
 dec=garment.modifiers.new('Web garment budget','DECIMATE');dec.ratio=.5;bpy.ops.object.modifier_apply(modifier=dec.name)
 garment.vertex_groups.clear();groups={name:garment.vertex_groups.new(name=name) for name in candidates}
 for vert in garment.data.vertices:
  pos=vert.co;distances=[]
  allowed=candidates
  if material==cloth:
   side='L' if pos.x>0 else 'R'
   # Continuous shoulder and elbow weights: hard region boundaries tear the
   # surface when both arms reach forward. The underarm closes progressively.
   def ramp(value,lo,hi):
    q=max(0,min(1,(value-lo)/(hi-lo)));return q*q*(3-2*q)
   arm_weight=ramp(abs(pos.x),.15,.30)
   forearm_weight=1-ramp(pos.z,1.09,1.22)
   hip_weight=(1-ramp(pos.z,.98,1.13))*.65
   values={'chest':(1-arm_weight)*(1-hip_weight),'hips':(1-arm_weight)*hip_weight,'upperArm.'+side:arm_weight*(1-forearm_weight),'forearm.'+side:arm_weight*forearm_weight}
   for name,weight in values.items():
    if weight>0:groups[name].add([vert.index],weight,'REPLACE')
   continue
  if material==pants:allowed=['hips','upperLeg.'+('L' if pos.x>0 else 'R')] if pos.z>.76 else ['upperLeg.'+('L' if pos.x>0 else 'R'),'shin.'+('L' if pos.x>0 else 'R')]
  if material==skin:allowed=['forearm.'+('L' if pos.x>0 else 'R'),'hand.'+('L' if pos.x>0 else 'R')]
  for name in allowed:
   a,b,_=rest[name];a=v(a);b=v(b);ab=b-a;t=max(0,min(1,(pos-a).dot(ab)/ab.length_squared));d=(pos-(a+ab*t)).length
   if name=='hips' and material==pants:d*=1.1
   distances.append((d,name))
  nearest=sorted(distances)[:2];weights=[math.exp(-d*40) for d,name in nearest];total=sum(weights)
  for (_,name),weight in zip(nearest,weights):groups[name].add([vert.index],weight/total,'REPLACE')
 for f in garment.data.polygons:f.use_smooth=True
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();mesh=bpy.context.object;mesh.name='Vivek_Surface';bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
mod=mesh.modifiers.new('One shared skeleton','ARMATURE');mod.object=rig;mesh.parent=rig

def ik(a,c,l1,l2,bend):
 a=Vector(a);c=Vector(c);d=c-a;dist=min(d.length,l1+l2-.0001);axis=d.normalized();h=(l1*l1-l2*l2+dist*dist)/(2*dist);perp=Vector(bend);perp=(perp-axis*perp.dot(axis)).normalized()
 return tuple(a+axis*h+perp*math.sqrt(max(0,l1*l1-h*h)))
def smooth(t):return t*t*(3-2*t)
def pose(kind,t):
 seated=kind in ['seated_idle','typing','book_open','page_turn','phone_pickup','phone_putdown','arcade_play','release']
 q=smooth(t) if kind=='sit_down' else 1-smooth(t) if kind=='stand_up' else 1 if seated else 0
 hip=.93-.27*q;lean=.035*q
 if kind=='walk':hip=.87+.008*math.cos(t*math.tau*2)
 if kind in ['phone_pickup','phone_putdown']:
  phone_use=smooth(min(1,t*1.5));phone_use=1-phone_use if kind=='phone_putdown' else phone_use;lean=.20*(1-phone_use)+.035*phone_use
 joints={};joints['hips']=((0,hip,0),(0,hip+.14,lean));joints['chest']=(joints['hips'][1],(0,hip+.50,lean+.012*math.sin(t*math.tau) if kind=='idle' else lean));joints['head']=(joints['chest'][1],(0,hip+.84,lean))
 for side,s in [('L',1),('R',-1)]:
  if kind=='walk':
   cycle=(t+(0 if s>0 else .5))%1
   forward=.30-1.20*cycle if cycle<.5 else -.30+.60*smooth((cycle-.5)*2)
   lift=0 if cycle<.5 else .09*math.sin((cycle-.5)*math.tau)
   ankle=(s*.12,.10+lift,forward)
  else:ankle=(s*.12,.10,.43*q)
  top=(s*.12,hip,0);knee=ik(top,ankle,.42,.412,(0,0,1));joints['upperLeg.'+side]=(top,knee);joints['shin.'+side]=(knee,ankle);joints['foot.'+side]=(ankle,(ankle[0],ankle[1]-.02,ankle[2]+.18))
  shoulder=(s*.245,hip+.47,lean);hand=(s*.34,hip+.01,.025+.20*q)
  if kind=='walk':hand=(s*.34,hip+.01,.17*math.sin(t*math.tau+(math.pi if s>0 else 0)))
  use=smooth(min(1,t*1.5))
  if kind in ['typing','arcade_play']:hand=(s*.19,hip+(.32 if kind=='typing' or s>0 else .10)+.008*math.sin(t*math.tau*4+s),.43)
  if kind in ['book_open','page_turn']:hand=(s*(.19-.13*math.sin(t*math.pi) if s>0 else .19),hip+.31+.05*math.sin(t*math.pi),.42)
  if kind in ['phone_pickup','phone_putdown'] and s<0:
   if kind=='phone_putdown':use=1-use
   # The palm holds the middle of the handset; its upper earpiece reaches the
   # ear. Start at the cradle centre rather than snapping from the lap.
   hand=(-.13*use,hip+.58-.025*use,.60-.57*use)
  reach=Vector(hand)-Vector(shoulder)
  if reach.length>.47:hand=tuple(Vector(shoulder)+reach.normalized()*.47)
  elbow=ik(shoulder,hand,.258,.214,(s,0,-.4));joints['upperArm.'+side]=(shoulder,elbow);joints['forearm.'+side]=(elbow,hand);joints['hand.'+side]=(hand,(hand[0],hand[1]-(.012 if kind in ['typing','book_open','page_turn','arcade_play'] else .08),hand[2]+(.08 if kind in ['typing','book_open','page_turn','arcade_play'] else .015)))
 yaw=smooth(t)*math.pi/2 if kind=='turn' else 0
 if yaw:
  def spin(p):return (p[0]*math.cos(yaw)+p[2]*math.sin(yaw),p[1],-p[0]*math.sin(yaw)+p[2]*math.cos(yaw))
  joints={n:(spin(a),spin(b)) for n,(a,b) in joints.items()}
 for name,(a,b) in joints.items():
  pb=rig.pose.bones[name];axis_y=(v(b)-v(a)).normalized();axis_z=Vector((math.cos(yaw),math.sin(yaw),0)).cross(axis_y).normalized();axis_x=axis_y.cross(axis_z).normalized();rot=Matrix((axis_x,axis_y,axis_z)).transposed().to_quaternion();pb.matrix=Matrix.LocRotScale(v(a),rot,Vector((1,1,1)));bpy.context.view_layer.update()
 for side in ['L','R']:rig.pose.bones['lid.'+side].scale=(1,1,1)

clips={'idle':3,'walk':.73,'turn':.45,'sit_down':1.1,'seated_idle':3,'stand_up':1.1,'typing':1.2,'book_open':1.3,'page_turn':.65,'phone_pickup':1.3,'phone_putdown':1.3,'arcade_play':1.2,'release':.65}
rig.animation_data_create()
for name,duration in clips.items():
 action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action;frames=round(duration*30)
 for frame in range(frames+1):
  pose(name,frame/frames)
  for pb in rig.pose.bones:
   pb.keyframe_insert('location',frame=frame,group=pb.name);pb.keyframe_insert('rotation_quaternion',frame=frame,group=pb.name);pb.keyframe_insert('scale',frame=frame,group=pb.name)
rig.animation_data.action=None;pose('idle',0)
# Stable editable reference points in the rig file.
for name,point in [('contact_hand_L',(.34,.94,.025)),('contact_hand_R',(-.34,.94,.025)),('seat_hips',(0,.66,0))]:
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=v(point);o.parent=rig;o.empty_display_size=.04
scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=0;scene.frame_end=90
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=rig
out=ROOT/'public/studio/studio-avatar.glb';out.parent.mkdir(exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_animations=True,export_extras=True)
# Review lighting/cameras live only in the .blend, not the web export.
scene.world.color=(.22,.22,.22)
for name,loc,power,size in [('Soft key',(3,-4,5),400,4),('Warm rim',(-3,2,3),500,3),('Fill',(-3,-2,2),180,3)]:
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',data);scene.collection.objects.link(cam);scene.camera=cam;data.type='ORTHO';data.ortho_scale=2.15
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=600;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True
cam.location=(2.4,-5,2.1);cam.rotation_euler=(Vector((0,0,.98))-cam.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'docs/assets/studio-avatar.blend'))
for name,loc in [('front',(0,-5,1.1)),('side',(5,0,1.1)),('back',(0,5,1.1))]:
 cam.location=loc;cam.rotation_euler=(Vector((0,0,.98))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(ROOT/f'docs/assets/avatar-{name}.png');bpy.ops.render.render(write_still=True)
print('AVATAR_EXPORT_COMPLETE',out)
