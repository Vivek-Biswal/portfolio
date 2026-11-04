"""Repair the first sunset export's side-cabinet local rotations; preserve all other geometry."""
import bpy, math, pathlib
root=pathlib.Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root/'docs/assets/sunset-studio.blend'))
fixed=0
for o in bpy.data.objects:
    if o.type=='MESH' and not o.name.startswith('Wall_') and o.location.x>5 and abs(o.rotation_euler.z-math.pi/2)<.001:
        o.rotation_euler.z-=math.pi;fixed+=1
print('Corrected local cabinet orientations:',fixed,flush=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(root/'docs/assets/sunset-studio.blend'))
bpy.ops.export_scene.gltf(filepath=str(root/'public/studio/sunset-studio.glb'),export_format='GLB',export_apply=True,export_lights=False,export_cameras=False)
scene=bpy.context.scene;scene.cycles.samples=8;scene.render.resolution_percentage=80
scene.render.filepath=str(root/'docs/assets/sunset-studio-preview.png')
bpy.ops.render.render(write_still=True)
