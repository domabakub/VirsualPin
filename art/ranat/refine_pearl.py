"""Upgrade the authored River geometry to Pearl / modern white-grey-gold.
Run once after build_ranat_v2.py, or on its existing River scene.
"""
import bpy, bmesh, math, ast, shutil
import numpy as np
from pathlib import Path
from mathutils import Vector, Quaternion

OUT=Path('S:/Hackaton/art/ranat')
root=bpy.data.objects['ranat_root']
assert root.get('asset_version')==2, 'This revision expects the River v2 source'
scene=next(s for s in bpy.data.scenes if root in list(s.objects) and 'product preview' not in s.name)
bpy.context.window.scene=scene
for name in ['ranat-next.blend','ranat-source.glb']:
    backup=OUT/('river-v2'+Path(name).suffix)
    if (OUT/name).exists() and not backup.exists():shutil.copy2(OUT/name,backup)

# Reuse the mesh helpers, without executing the v2 builder or touching other scenes.
tree=ast.parse((OUT/'build_ranat_v2.py').read_text(encoding='utf-8'))
helpers=ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)],type_ignores=[])
exec(compile(helpers,'ranat_mesh_helpers','exec'))

def recolor(name,color,rough,metal=0):
    m=bpy.data.materials[name];p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
    p.inputs['Metallic'].default_value=metal;m.diffuse_color=(*color,1)
    return m
pearl=recolor('River | midnight jade lacquer',(.77,.79,.80),.24,.12)
grey=recolor('River | smoked walnut',(.24,.265,.30),.32,.18)
gold=recolor('River | brushed champagne brass',(.68,.39,.10),.28,.74)
red=mat('Pearl | oxblood accent',(.24,.009,.022),.33,.05)
rope=mat('Pearl | burgundy braided suspension',(.16,.013,.024),.85)
silk=mat('Pearl | ivory cotton head',(.78,.77,.71),.93)
shaftmat=mat('Pearl | satin ivory handle',(.28,.31,.35),.34,.1)
keymat=bpy.data.materials['River | toasted teak']

# Quiet grey micro-grain in a power-of-two atlas; color lives in the map because
# runtime note feedback tints each bar material. All 21 keys keep distinct UVs.
W,H=512,1024;y,x=np.mgrid[0:H,0:W]
v=y/H*6;tile=np.floor(v)*4+x//128
grain=.009*np.sin(v*170+.4*np.sin(x/20))+.003*np.sin(v*950)
shade=.48+.025*np.sin(tile*1.7)+grain
pixels=np.ones((H,W,4),dtype=np.float32)
for c,offset in enumerate([-.01,0,.012]):pixels[:,:,c]=shade+offset
texture=bpy.data.images.new('Pearl original ash-grey grain',width=W,height=H)
texture.pixels.foreach_set(pixels.ravel());texture.pack()
texnode=next(n for n in keymat.node_tree.nodes if n.type=='TEX_IMAGE');texnode.image=texture
bsdf=next(n for n in keymat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
bsdf.inputs['Roughness'].default_value=.39
keymat.diffuse_color=(.60,.63,.67,1)

owned=[root,*root.children_recursive]
for o in owned:
    if o.name.startswith(('suspension_socket','suspension_tie')) or o.name=='body_flax_suspension':
        bpy.data.objects.remove(o,do_unlink=True)

# A continuous front and rear lacing line, through raised brass eyelets. These
# replace the old hidden cord and disconnected short transverse stripes.
bpy.context.view_layer.update()
for sign in [-1,1]:
    anchors=[Vector((-.669,sign*.132,.402))]
    for i in range(21):
        bar=bpy.data.objects[f'bar_{i:02}'];length=.405-.115*i/20
        eyey=sign*length*.32
        tube(f'key_eyelet_{i:02}',[(.0046*math.cos(t),eyey+.0046*math.sin(t),.0148) for t in np.linspace(0,2*math.pi,17)],.0011,gold,bar,6)
        anchors.append(bar.matrix_world @ Vector((0,eyey,.0175)))
    anchors.append(Vector((.669,sign*.094,.402)))
    tube('continuous_suspension_front' if sign<0 else 'continuous_suspension_back',anchors,.0018,rope,sides=10)
    for side in [-1,1]:
        x=side*.669;y=sign*(.132 if side<0 else .094);z=.402
        # Cord turns over the pin, down the cheek, into a visible doubled loop.
        tube('gold_anchor_pin',[(x-.012,y,z),(x+.012,y,z)],.0042,gold,sides=12)
        pts=[(x,y,z),(x+side*.008,y,.394),(x+side*.012,y,.367)]
        pts += [(x+side*(.012+.006*math.sin(t)),y,.349+.018*math.cos(t)) for t in np.linspace(0,2*math.pi,25)]
        pts += [(x+side*.012,y,.367),(x+side*.007,y,.394),(x,y,z)]
        tube('end_lacing_loop',pts,.0017,rope,sides=8)
        tube('red_binding_knot',[(x+side*.008,y-.004,.375),(x+side*.008,y+.004,.375)],.004,red,sides=10)

# Narrow burgundy reveals under the upper gold rim and a red pedestal inset.
for side in [-1,1]:
    tube('burgundy_rim_reveal',[(x,side*(halfwidth(x)+.003),.193+.176*curve(x)-.006) for x in np.linspace(-.65,.65,81)],.0026,red)
    tube('champagne_top_edge',[(x,side*(halfwidth(x)+.001),.197+.176*curve(x)) for x in np.linspace(-.65,.65,81)],.0024,gold)
box('burgundy_pedestal_reveal',(.255,.219,.004),(0,0,.058),red,r=.0015)

# Broader metal edging catches a clean highlight at the end cheeks.
for side in [-1,1]:
    for front in [-1,1]:
        vertices=[]
        for t in np.linspace(.02,.99,40):
            x=side*(.634+.076*t+.012*math.sin(t*math.pi))
            w=(.185 if side<0 else .153)*(1-.68*t**1.65)
            vertices.extend([(x+side*.0095,front*w,.267+.275*t),(x+side*.0095,front*(w-.010),.267+.275*t)])
        mesh('champagne_finial_ribbon',vertices,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(39)],gold)
for vertex in bpy.data.objects['body_brushed_champagne_brass'].data.vertices:
    if abs(vertex.co.y)>.13:vertex.co.y+=math.copysign(.003,vertex.co.y)

# Rebuild mallets around the existing head pivots: 44 mm diameter, 20 mm thick,
# 370 mm slender shaft. Fewer wraps avoid the old oversized stacked-ball look.
for hand in ['L','R']:
    m=bpy.data.objects['mallet_'+hand]
    for child in list(m.children):bpy.data.objects.remove(child,do_unlink=True)
    m.rotation_euler=(.32,0,-.30 if hand=='L' else .30)
    m.location=( -.21 if hand=='L' else .21, -.01,.365)
    tube('ivory_shaft_'+hand,[(0,-.37,0),(0,.006,0)],.0035,shaftmat,m,12)
    tube('burgundy_grip_'+hand,[(0,-.361,0),(0,-.285,0)],.0041,red,m,12)
    for y in [-.282,-.363,-.024]:
        tube('gold_handle_band_'+hand,[(0,y-.0015,0),(0,y+.0015,0)],.0044,gold,m,12)
    # Soft disc profile, without degenerate sphere-pole faces.
    profile=[(-.010,.014),(-.009,.019),(-.006,.022),(.006,.022),(.009,.019),(.010,.014)]
    N=40;verts=[]
    for z,r in profile:verts.extend((r*math.cos(t),r*math.sin(t),z) for t in np.linspace(0,2*math.pi,N,endpoint=False))
    faces=[tuple(reversed(range(N))),tuple(range((len(profile)-1)*N,len(profile)*N))]
    for j in range(len(profile)-1):
        for k in range(N):faces.append((j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k))
    mesh('ivory_wrapped_head_'+hand,verts,faces,silk,m,True)
    for z in [-.005,0,.005]:
        tube('cotton_seam_'+hand,[(.0222*math.cos(t),.0222*math.sin(t),z) for t in np.linspace(0,2*math.pi,41)],.0004,shaftmat,m,5)
    tube('burgundy_head_seam_'+hand,[(.0223*math.cos(t),.0223*math.sin(t),0) for t in np.linspace(0,2*math.pi,41)],.0006,red,m,6)

root['asset_version']=3;root['design']='Pearl | ivory, ash, champagne, oxblood'
root['mallet_head_radius']=.022;root['mallet_head_half_height']=.010
scene.name='Ranat Next — Pearl edition'
for o in scene.objects:o.select_set(False)
for a in bpy.context.screen.areas:
    if a.type=='VIEW_3D':
        s=a.spaces.active;s.overlay.show_overlays=False
        s.region_3d.view_distance=2.2;s.region_3d.view_location=(0,0,.24)
        s.region_3d.view_rotation=Quaternion((1,0,0),math.radians(60))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ranat-next.blend'),copy=True)
print('Pearl edition saved:',len(scene.objects),'objects')
