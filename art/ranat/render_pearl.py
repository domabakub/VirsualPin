"""Product preview in a separate scene; excludes staging from the exported GLB."""
import bpy, math
from mathutils import Vector
source=bpy.data.scenes['Ranat Next — Pearl edition']
preview=bpy.data.scenes.new('Pearl edition — product preview')
preview.render.engine=source.render.engine
for o in source.objects:preview.collection.objects.link(o)
world=bpy.data.worlds.new('River studio');world.use_nodes=True;preview.world=world
background=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND')
background.inputs['Color'].default_value=(.75,.8,.85,1);background.inputs['Strength'].default_value=.35
camera=bpy.data.cameras.new('Pearl preview camera');camera.type='ORTHO';camera.ortho_scale=1.85
cam=bpy.data.objects.new('Pearl preview camera',camera);preview.collection.objects.link(cam)
cam.location=(.28,-2.5,1.3);cam.rotation_euler=(Vector((0,0,.26))-cam.location).to_track_quat('-Z','Y').to_euler();preview.camera=cam
for name,position,power,size,color in [
    ('Softbox key',(-1,-1.5,2.5),160,2,(1,.87,.72)),
    ('Softbox fill',(1.3,-.3,1.3),60,1.5,(.8,.9,1)),
    ('Softbox rim',(0,1.5,2),190,1.8,(1,1,1))]:
    light=bpy.data.lights.new(name,'AREA');light.energy=power;light.size=size;light.color=color
    o=bpy.data.objects.new(name,light);preview.collection.objects.link(o);o.location=position
    o.rotation_euler=(Vector((0,0,.2))-o.location).to_track_quat('-Z','Y').to_euler()
floor=bpy.data.meshes.new('Studio floor');floor.from_pydata([(-200,-200,-.001),(200,-200,-.001),(200,200,-.001),(-200,200,-.001)],[],[(0,1,2,3)])
o=bpy.data.objects.new('Studio floor',floor);preview.collection.objects.link(o)
m=bpy.data.materials.new('Studio warm white');p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(.79,.80,.78,1);p.inputs['Roughness'].default_value=.9;floor.materials.append(m)
preview.render.resolution_x=1440;preview.render.resolution_y=900;preview.render.resolution_percentage=100
preview.render.image_settings.file_format='PNG';preview.render.filepath='S:/Hackaton/art/ranat/pearl-preview.png'
def render_preview():
    bpy.ops.render.render(write_still=True,scene=preview.name)
    return None
bpy.app.timers.register(render_preview,first_interval=.5)
print('Preview render scheduled')

