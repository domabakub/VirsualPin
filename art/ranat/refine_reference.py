"""Refine the original prototype using the user's supplied front-view reference."""
import bpy
import math
from pathlib import Path
scene = bpy.context.scene
root = scene.objects.get('ranat_root')
assert root and root.get('instrument') == 'ranat', 'Select the Ranat prototype scene first'

for obj in list(root.children):
    if obj.name.startswith('end_finial'):
        side = -1 if obj.location.x < 0 else 1
        verts=[]; faces=[]
        for i in range(25):
            t=i/24; x=side*(.633+.091*t); z=.225+.32*t
            w=(.185 if side<0 else .155)*(1-.73*t)
            verts.extend([(x,-w,z),(x,w,z),(x-side*.018,w,z),(x-side*.018,-w,z)])
        for i in range(24):
            for j in range(4):faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
        faces += [(3,2,1,0),(96,97,98,99)]
        obj.data.clear_geometry();obj.data.from_pydata(verts,[],faces);obj.data.update();obj.location=(0,0,0)
        for edge in [-1,1]:
            vs=[];fs=[]
            for i in range(25):
                t=i/24; x=side*(.633+.091*t);z=.225+.32*t;w=edge*(.185 if side<0 else .155)*(1-.73*t)
                for j in range(8):
                    a=math.pi*2*j/8;vs.append((x+math.cos(a)*.0025,w+math.sin(a)*.0025,z))
            for i in range(24):
                for j in range(8):fs.append((i*8+j,i*8+(j+1)%8,(i+1)*8+(j+1)%8,(i+1)*8+j))
            data=bpy.data.meshes.new('finial_gold_outline');data.from_pydata(vs,[],fs);data.materials.append(bpy.data.materials['Ranat • satin brass'])
            trim=bpy.data.objects.new('finial_gold_outline',data);scene.collection.objects.link(trim);trim.parent=root
    elif obj.name.startswith('end_brass_cap'):
        bpy.data.objects.remove(obj,do_unlink=True)

for name,color,roughness in [('Ranat • wrapped cotton',(.018,.021,.024),.85),('Ranat • deep lacquer',(.055,.014,.008),.28),('Ranat • honey teak',(.27,.135,.073),.52)]:
    mat=bpy.data.materials[name]
    node=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value=(*color,1);node.inputs['Roughness'].default_value=roughness
    mat.diffuse_color=(*color,1)
for obj in scene.objects: obj.select_set(False)
bpy.context.view_layer.objects.active=root
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':area.spaces.active.overlay.show_relationship_lines=False
bpy.ops.wm.save_as_mainfile(filepath='S:/Hackaton/art/ranat/ranat-next.blend',copy=True)
print('Reference silhouette and black mallet heads applied')
