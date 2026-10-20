"""Original, editable Ranat Next prototype. Run in Blender; creates a new scene."""
import bpy
import math
from pathlib import Path
from mathutils import Quaternion

out = Path('S:/Hackaton/art/ranat')
out.mkdir(parents=True, exist_ok=True)
scene = bpy.data.scenes.new('Ranat Next — interaction prototype')
bpy.context.window.scene = scene
root = bpy.data.objects.new('ranat_root', None)
scene.collection.objects.link(root)
root['asset_version'] = 1
root['instrument'] = 'ranat'
root['units'] = 'meters'

def material(name, color, metallic=0, roughness=.45):
    m = bpy.data.materials.new(name)
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    m.diffuse_color = (*color, 1)
    return m

wood = material('Ranat • honey teak', (.38,.16,.055))
dark = material('Ranat • deep lacquer', (.10,.035,.016), roughness=.3)
gold = material('Ranat • satin brass', (.64,.40,.13), metallic=.65)
ivory = material('Ranat • wrapped cotton', (.82,.76,.61), roughness=.9)
cord = material('Ranat • suspension cord', (.24,.19,.12), roughness=.95)

def mesh(name, verts, faces, mat, parent=root):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.parent = parent
    data.materials.append(mat)
    return obj

def box(name, sx, sy, sz, loc, mat, radius=.004, parent=root):
    # Rounded rectangle extruded along z, with a bevelled top profile.
    outline=[]
    for cx,cy,a0 in [(sx/2-radius,sy/2-radius,0),(-sx/2+radius,sy/2-radius,90),(-sx/2+radius,-sy/2+radius,180),(sx/2-radius,-sy/2+radius,270)]:
        for j in range(5):
            a=math.radians(a0+j*90/4)
            outline.append((cx+radius*math.cos(a),cy+radius*math.sin(a)))
    n=len(outline)
    verts=[(x,y,-sz/2) for x,y in outline]+[(x*.98,y*.98,sz/2) for x,y in outline]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    obj=mesh(name,verts,faces,mat,parent);obj.location=loc
    return obj

def tube(name, pts, radius, mat, parent=root, sides=8):
    verts=[]
    for x,y,z in pts:
        for j in range(sides):
            a=2*math.pi*j/sides
            verts.append((x,y+math.cos(a)*radius,z+math.sin(a)*radius))
    faces=[]
    for i in range(len(pts)-1):
        for j in range(sides): faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    return mesh(name,verts,faces,mat,parent)

# Hollow boat-shaped resonator: curved front and rear walls.
for side in [-1,1]:
    verts=[]
    for i in range(49):
        x=-.65+1.3*i/48; t=x/.65
        top=.19+.18*t*t; bottom=.09+.17*t*t
        y=side*(.178-.028*(t+1)/2)
        verts.extend([(x,y,bottom),(x,y,top),(x,y-side*.018,top),(x,y-side*.018,bottom)])
    faces=[]
    for i in range(48):
        for j in range(4): faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
    faces += [(3,2,1,0),(192,193,194,195)]
    mesh('trough_front' if side==-1 else 'trough_back',verts,faces,dark)
    for level in [.025,.075]:
        tube('brass_inlay',[(x,side*(.179-.028*(x/.65+1)/2),.09+.17*(x/.65)**2+level) for x in [-.64+1.28*i/64 for i in range(65)]],.0022,gold)
for x in [-.66,.66]:
    box('end_finial',.037,.36 if x<0 else .30,.22,(x,0,.35),dark,.012)
    box('end_brass_cap',.042,.365 if x<0 else .305,.016,(x,0,.46),gold,.009)
box('pedestal',.24,.24,.06,(0,0,.03),dark,.02)
box('pedestal_rim',.29,.27,.016,(0,0,.013),gold,.012)
box('pedestal_neck',.15,.17,.06,(0,0,.075),dark,.01)

for i in range(21):
    x=(i-10)*.059
    height=.21+.155*(x/.62)**2
    length=.405-.115*i/20
    bar=box(f'bar_{i:02d}',.055,length,.022,(x,0,height),wood,.006)
    bar['bar_id']=i
    # Small decorative end stripes belong to the animated bar.
    for y in [-length*.34,length*.34]:
        box(f'bar_binding_{i:02d}',.052,.003,.001,(0,y,.0115),cord,.0008,bar)
for side in [-1,1]:
    tube('suspension',[( (i-10)*.059,side*(.405-.115*i/20)*.34,.206+.155*(((i-10)*.059)/.62)**2) for i in range(21)],.0018,cord)

for hand,x in [('L',-.24),('R',.24)]:
    mallet=bpy.data.objects.new('mallet_'+hand,None);scene.collection.objects.link(mallet);mallet.parent=root
    mallet.location=(x,-.025,.42)
    # Head pivot at origin; handle points toward the player (-Y).
    box('shaft_'+hand,.009,.31,.009,(0,-.145,0),wood,.003,mallet)
    verts=[]; faces=[]; segments=28; rings=12
    for j in range(rings+1):
        theta=math.pi*j/rings
        for k in range(segments):
            phi=2*math.pi*k/segments
            verts.append((.029*math.sin(theta)*math.cos(phi),.029*math.sin(theta)*math.sin(phi),.023*math.cos(theta)))
    for j in range(rings):
        for k in range(segments): faces.append((j*segments+k,j*segments+(k+1)%segments,(j+1)*segments+(k+1)%segments,(j+1)*segments+k))
    head=mesh('head_'+hand,verts,faces,ivory,mallet)
    for p in head.data.polygons:p.use_smooth=True
    for z in [-.012,-.006,0,.006,.012]:
        radius=.029*math.sqrt(1-(z/.023)**2)
        # Flat wrap ridges on the head; round cross-section unnecessary at web size.
        points=[(radius*math.cos(2*math.pi*k/48),radius*math.sin(2*math.pi*k/48),z) for k in range(49)]
        tube('cotton_wrap_'+hand,points,.00065,cord,mallet,4)

for obj in scene.objects: obj.select_set(False)
root.select_set(True)
bpy.context.view_layer.objects.active=root
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        space=area.spaces.active
        space.region_3d.view_distance=2.1
        space.region_3d.view_location=(0,0,.20)
        space.region_3d.view_rotation=Quaternion((1,0,0),math.radians(55))
        space.shading.color_type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ranat-next.blend'),copy=True)
print('Created Ranat Next',len(scene.objects),'objects')
