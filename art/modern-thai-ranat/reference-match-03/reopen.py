"""Restore the interactive Blender view after the render process exited."""
import bpy
scene=bpy.context.scene
scene.camera=scene.objects['D3 | Camera_Right_Isometric']
for o in scene.objects:o.select_set(False)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
            area.spaces.active.region_3d.view_camera_zoom=12
            area.spaces.active.shading.type='MATERIAL'
def connect():
    try:bpy.ops.blendermcp.start_server()
    except Exception as e:print('Connection startup:',e)
    return None
bpy.app.timers.register(connect,first_interval=2)
