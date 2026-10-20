"""Original 'River / ลำน้ำ' ranat, authored for independent key interaction.
Run in a fresh Blender session; preserves all existing scenes. No imported meshes.
"""
import bpy, bmesh, math, shutil
import numpy as np
from pathlib import Path
from mathutils import Vector, Quaternion

OUT=Path('S:/Hackaton/art/ranat')
assert not bpy.data.objects.get('ranat_root'), 'Use a fresh file to avoid naming collisions'
if (OUT/'ranat-next.blend').exists() and not (OUT/'ranat-v1.blend').exists():
    shutil.copy2(OUT/'ranat-next.blend',OUT/'ranat-v1.blend')
scene=bpy.data.scenes.new('Ranat Next — River edition')
bpy.context.window.scene=scene
root=bpy.data.objects.new('ranat_root',None);scene.collection.objects.link(root)
root['instrument']='ranat';root['asset_version']=2;root['units']='meters'

def mat(name,col,rough=.4,metal=0):
    m=bpy.data.materials.new(name)
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*col,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    m.diffuse_color=(*col,1)
    return m
wood=mat('River | toasted teak',(.45,.21,.075),.36)
dark=mat('River | midnight jade lacquer',(.018,.065,.060),.26,.18)
edge=mat('River | smoked walnut',(.085,.025,.012),.32)
gold=mat('River | brushed champagne brass',(.66,.43,.17),.3,.72)
cord=mat('River | flax suspension',(.33,.23,.115),.85)
felt=mat('River | charcoal cotton',(.024,.032,.030),.95)

# A shared 4 x 6 atlas: each bar gets its own long-grain, uneven growth rings.
rng=np.random.default_rng(218)
W,H=512,768
y,x=np.mgrid[0:H,0:W];u=(x%128)/128;v=(y%128)/128
tile=(x//128)+(y//128)*4
warp=v+.023*np.sin(u*9+tile*2)+.008*np.sin(u*27+tile)
grain=np.sin(warp*110+np.sin(warp*21+tile)*2)
fine=np.sin(warp*460+u*3)*.016
pores=np.maximum(0,np.sin(warp*260+tile*4))**28*.045
shade=1+.10*np.sin(tile*2.3)+.07*grain+fine-pores+rng.normal(0,.009,(H,W))
pixels=np.ones((H,W,4),dtype=np.float32)
for c,base in enumerate([.51,.30,.155]):pixels[:,:,c]=np.clip(base*shade,0,1)
tex=bpy.data.images.new('River original teak atlas',width=W,height=H)
tex.pixels.foreach_set(pixels.ravel());tex.pack()
node=wood.node_tree.nodes.new('ShaderNodeTexImage');node.image=tex
p=next(n for n in wood.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
wood.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])

def mesh(name,verts,faces,material,parent=root,smooth=False):
    d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update()
    bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.parent=parent
    d.materials.append(material)
    for f in d.polygons:f.use_smooth=smooth
    return o

def bevel(o,width=.003,segments=3):
    b=o.modifiers.new('Soft crafted edges','BEVEL');b.width=width;b.segments=segments
    return o

def tube(name,points,radius,material,parent=root,sides=8):
    pts=[Vector(p) for p in points];verts=[]
    for i,p in enumerate(pts):
        tangent=(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized()
        ref=Vector((0,0,1)) if abs(tangent.z)<.95 else Vector((0,1,0))
        a=tangent.cross(ref).normalized();b=tangent.cross(a).normalized()
        verts.extend(tuple(p+radius*(a*math.cos(j*2*math.pi/sides)+b*math.sin(j*2*math.pi/sides))) for j in range(sides))
    faces=[tuple(reversed(range(sides))),tuple(range((len(pts)-1)*sides,len(pts)*sides))]
    for i in range(len(pts)-1):
        for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    return mesh(name,verts,faces,material,parent,True)

def box(name,dim,loc,material,parent=root,r=.003):
    a,b,c=[d/2 for d in dim]
    verts=[(x,y,z) for z in [-c,c] for y in [-b,b] for x in [-a,a]]
    faces=[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)]
    o=bevel(mesh(name,verts,faces,material,parent),r);o.location=loc;return o

def atlas_uv(o,index):
    uv=o.data.uv_layers.new(name='Teak grain')
    vs=o.data.vertices
    xs=[v.co.x for v in vs];ys=[v.co.y for v in vs]
    for f in o.data.polygons:
        for li in f.loop_indices:
            p=vs[o.data.loops[li].vertex_index].co
            a=(p.x-min(xs))/max(.0001,max(xs)-min(xs))
            b=(p.y-min(ys))/max(.0001,max(ys)-min(ys))
            uv.data[li].uv=((index%4+.025+.95*a)/4,(index//4+.025+.95*b)/6)

def curve(x):return (x/.65)**2
def halfwidth(x):return .183-.032*(x/.65+1)/2

# Sculpted resonator walls: convex body section, continuous rounded wooden rims.
for side in [-1,1]:
    verts=[];N=80
    for i in range(N+1):
        x=-.65+1.3*i/N;q=curve(x);w=halfwidth(x)
        bottom=.073+.196*q;top=.193+.176*q
        section=[(w-.022,bottom),(w+.002,bottom+.024),(w+.012,bottom+.066),(w,top),
                 (w-.015,top),(w-.013,bottom+.031),(w-.031,bottom+.012)]
        verts.extend((x,side*y,z) for y,z in section)
    faces=[];K=7
    for i in range(N):
        for j in range(K):faces.append((i*K+j,i*K+(j+1)%K,(i+1)*K+(j+1)%K,(i+1)*K+j))
    faces.extend([tuple(reversed(range(K))),tuple(range(N*K,(N+1)*K))])
    bevel(mesh('curved_jade_resonator',verts,faces,dark,smooth=True),.0015,2)
    for offset,r,material in [(0,.008,edge),(-.012,.0018,gold)]:
        tube('rolled_upper_lip',[(x,side*(halfwidth(x)+.001),.193+.176*curve(x)+offset) for x in np.linspace(-.65,.65,81)],r,material)
    for offset in [.017,.028]:
        tube('lower_double_inlay',[(x,side*(halfwidth(x)+.001),.073+.196*curve(x)+offset) for x in np.linspace(-.64,.64,81)],.0012,gold)
    # Fine rising wave motif, original and restrained, mirrored on both sides.
    for mirror in [-1,1]:
        for strand in range(3):
            pts=[]
            for t in np.linspace(0,1,49):
                x=mirror*(.055+.53*t)
                z=.13+.18*curve(x)+.014*math.sin(t*math.pi*2+strand*.5)+strand*.007
                pts.append((x,side*(halfwidth(x)+.0125),z))
            tube('river_inlay',pts,.0009,gold,sides=6)

# Narrow end cheeks sweep outward, with a curved crest and nested brass border.
for side in [-1,1]:
    verts=[];N=28
    for i in range(N+1):
        t=i/N;x=side*(.634+.076*t+.012*math.sin(t*math.pi));z=.267+.275*t
        w=(.185 if side<0 else .153)*(1-.68*t**1.65)
        verts.extend([(x-.008,-w,z),(x+.008,-w,z),(x+.008,w,z),(x-.008,w,z)])
    faces=[(3,2,1,0),(N*4,N*4+1,N*4+2,N*4+3)]
    for i in range(N):
        for j in range(4):faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
    bevel(mesh('swept_end_cheek',verts,faces,edge,smooth=True),.003)
    for front in [-1,1]:
        for inset,radius in [(0,.0028),(.012,.0012)]:
            pts=[]
            for t in np.linspace(.015,.99,45):
                x=side*(.634+.076*t+.012*math.sin(t*math.pi))
                w=(.185 if side<0 else .153)*(1-.68*t**1.65)
                pts.append((x+side*.009,front*(w-inset),.267+.275*t))
            tube('finial_brass_border',pts,radius,gold)

# Layered pedestal with a broad, soft foot and a waisted neck.
for name,sx,sy,sz,z,material in [
    ('foot',.29,.255,.027,.017,edge),('foot_brass',.274,.239,.004,.033,gold),
    ('foot_jade',.254,.217,.023,.046,dark),('neck',.175,.157,.03,.069,edge),
    ('saddle',.225,.205,.016,.088,gold)]:
    box(name,(sx,sy,sz),(0,0,z),material,r=.008 if sz>.02 else .002)

# Crown and taper are part of each mesh; origins remain the stable strike anchors.
for i in range(21):
    x=(i-10)*.059;z=.21+.155*(x/.62)**2;length=.405-.115*i/20
    verts=[];N=12
    for j in range(N+1):
        t=-1+2*j/N;y=t*length/2;w=.0275*(1-.04*t*t)
        crown=.012+.003*(1-t*t)
        verts.extend([(-w,y,-.012),(w,y,-.012),(w,y,crown),(-w,y,crown)])
    faces=[(3,2,1,0),(N*4,N*4+1,N*4+2,N*4+3)]
    for j in range(N):
        for k in range(4):faces.append((j*4+k,j*4+(k+1)%4,(j+1)*4+(k+1)%4,(j+1)*4+k))
    bar=bevel(mesh(f'bar_{i:02}',verts,faces,wood),.003,3)
    bar.location=(x,0,z);bar['bar_id']=i;atlas_uv(bar,i)
    bar.rotation_euler.y=-math.atan(2*.155*x/(.62**2))
    # Small dark sockets and a short flax tie, attached to the vibrating bar.
    for sign in [-1,1]:
        y=sign*length*.32
        box('suspension_socket',(.006,.008,.001),(0,y,.014),edge,bar,.002)
        tube('suspension_tie',[(-.026,y,.013),(0,y,.015),(.026,y,.013)],.0008,cord,bar,6)
for side in [-1,1]:
    tube('tension_cord',[((i-10)*.059,side*(.405-.115*i/20)*.32,.203+.155*(((i-10)*.059)/.62)**2) for i in range(21)],.0012,cord)

for hand,x in [('L',-.24),('R',.24)]:
    m=bpy.data.objects.new('mallet_'+hand,None);scene.collection.objects.link(m);m.parent=root;m.location=(x,-.01,.42)
    shaft=tube('tapered_teak_shaft',[(0,-.31,0),(0,.008,0)],.004,wood,m,12);atlas_uv(shaft,22)
    tube('brass_ferrule',[(0,-.03,0),(0,-.018,0)],.0047,gold,m,12)
    verts=[];faces=[];N=32;R=12
    for j in range(R+1):
        t=-math.pi/2+j*math.pi/R;r=.030*math.cos(t)
        verts.extend((r*math.cos(k*2*math.pi/N),r*math.sin(k*2*math.pi/N),.022*math.sin(t)) for k in range(N))
    for j in range(R):
        for k in range(N):faces.append((j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k))
    mesh('cotton_head_'+hand,verts,faces,felt,m,True)
    for z in [-.014,-.007,0,.007,.014]:
        r=.030*math.sqrt(1-(z/.022)**2)
        tube('cotton_wrap',[(r*math.cos(t),r*math.sin(t),z) for t in np.linspace(0,2*math.pi,49)],.0005,cord,m,5)

# Join only static parts per material; never merge independent keys or mallets.
for material in [dark,edge,gold,cord]:
    parts=[o for o in scene.objects if o.type=='MESH' and o.parent==root and not o.name.startswith('bar_') and o.data.materials[0]==material]
    for o in scene.objects:o.select_set(False)
    for o in parts:
        o.select_set(True);bpy.context.view_layer.objects.active=o
        for modifier in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
    if parts:
        bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join()
        parts[0].name='body_'+material.name.split('|')[-1].strip().replace(' ','_')
for o in scene.objects:o.select_set(False)
root.select_set(True);bpy.context.view_layer.objects.active=root
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        s=area.spaces.active;s.region_3d.view_distance=1.95;s.region_3d.view_location=(0,0,.25)
        s.region_3d.view_rotation=Quaternion((1,0,0),math.radians(65))
        s.shading.color_type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ranat-next.blend'),copy=True)
print('River edition:',len(scene.objects),'objects; saved source')
