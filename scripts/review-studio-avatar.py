import bpy,sys
from pathlib import Path
from mathutils import Vector
root=Path.cwd();bpy.ops.wm.open_mainfile(filepath=str(root/'docs/assets/studio-avatar.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['VivekRig'];cam=scene.camera
cam.location=(3,-5,1.7);cam.rotation_euler=(Vector((0,0,.9))-cam.location).to_track_quat('-Z','Y').to_euler()
for clip,fraction in [('walk',.25),('walk',.75),('sit_down',1),('typing',.5),('phone_pickup',1),('stand_up',1)]:
 rig.animation_data.action=bpy.data.actions[clip]
 start,end=rig.animation_data.action.frame_range
 scene.frame_set(round(start+(end-start)*fraction))
 scene.render.filepath=str(root/f'docs/assets/avatar-{clip}-{fraction}.png');bpy.ops.render.render(write_still=True)
