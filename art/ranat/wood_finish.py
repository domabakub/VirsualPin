"""Small original wood-grain texture and UVs; no external texture dependencies."""
import bpy
import math
from pathlib import Path
root=bpy.context.scene.objects.get('ranat_root')
assert root and root.get('instrument')=='ranat'
w,h=256,512
image=bpy.data.images.get('Ranat original teak grain') or bpy.data.images.new('Ranat original teak grain',width=w,height=h)
pixels=[]
for y in range(h):
    for x in range(w):
        drift=math.sin(y*.009)*2+math.sin(y*.033+x*.005)*.8
        grain=math.sin((x+drift)*.43)*.025+math.sin((x+drift)*1.97)*.012
        fine=math.sin(x*13.43+y*7.19)*.008
        streak=max(0,math.sin((x+drift)*.17))**18*.04
        pixels.extend((.36+grain+fine-streak,.205+grain*.64+fine-streak,.115+grain*.42+fine-streak*.7,1))
image.pixels.foreach_set(pixels)
image.pack()
mat=bpy.data.materials['Ranat • honey teak']
node=next((n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE'),None) or mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
bsdf.inputs['Base Color'].default_value=(1,1,1,1)
mat.node_tree.links.new(node.outputs['Color'],bsdf.inputs['Base Color'])
for obj in bpy.context.scene.objects:
    if obj.type=='MESH' and mat in list(obj.data.materials):
        layer=obj.data.uv_layers.active or obj.data.uv_layers.new(name='Wood grain')
        length=max(v.co.y for v in obj.data.vertices)-min(v.co.y for v in obj.data.vertices)
        width=max(v.co.x for v in obj.data.vertices)-min(v.co.x for v in obj.data.vertices)
        for loop in obj.data.loops:
            vertex=obj.data.vertices[loop.vertex_index]
            layer.data[loop.index].uv=(vertex.co.x/max(width,.001)+.5,vertex.co.y/max(length,.001)+.5)
bpy.ops.wm.save_as_mainfile(filepath='S:/Hackaton/art/ranat/ranat-next.blend',copy=True)
print('Original wood grain packed and bar UVs assigned')
