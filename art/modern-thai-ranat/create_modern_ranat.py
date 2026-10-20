"""Reference-led modern Thai ranat, Blender 5.2. Metric, one coherent model.
Run via Blender Python: build_blockout(), render_views('blockout'),
correct_silhouette(), add_details(), render_views('final'), save_asset().
Every stage is explicit so silhouette renders can be inspected before detailing.
"""
import bpy, bmesh, math, json
import numpy as np
from pathlib import Path
from mathutils import Vector, Quaternion

OUT=Path(__file__).resolve().parent if '__file__' in globals() else Path('S:/Hackaton/art/modern-thai-ranat')
SCENE='Modern Thai Ranat | reference study'
scene=None
root=None

def bind():
    global scene,root
    scene=bpy.data.scenes[SCENE];root=bpy.data.objects['Ranat_Master']
    bpy.context.window.scene=scene

def material(name,color,rough=.35,metal=0):
    m=bpy.data.materials.get('MR | '+name) or bpy.data.materials.new('MR | '+name)
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    m.diffuse_color=(*color,1)
    return m

def empty(name,parent=None):
    o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.parent=parent
    return o

def mesh(name,vertices,faces,mat,parent=None,smooth=False):
    d=bpy.data.meshes.new(name);d.from_pydata(vertices,[],faces);d.update()
    bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.parent=parent
    d.materials.append(mat)
    for p in d.polygons:p.use_smooth=smooth
    return o

def bevel(o,width=.0015,segments=3):
    b=o.modifiers.new('Soft manufactured edge','BEVEL');b.width=width;b.segments=segments
    b=o.modifiers.new('Area weighted normals','WEIGHTED_NORMAL');b.keep_sharp=True
    return o

def tube(name,points,radius,mat,parent=None,sides=8):
    p=[Vector(v) for v in points];vs=[]
    previous=None
    for i,v in enumerate(p):
        t=(p[min(len(p)-1,i+1)]-p[max(0,i-1)]).normalized()
        if previous is None:
            ref=Vector((0,0,1)) if abs(t.z)<.9 else Vector((0,1,0))
            a=t.cross(ref).normalized()
        else:a=(previous-t*previous.dot(t)).normalized()
        b=t.cross(a).normalized();previous=a
        vs.extend(tuple(v+radius*(a*math.cos(k*math.tau/sides)+b*math.sin(k*math.tau/sides))) for k in range(sides))
    fs=[tuple(reversed(range(sides))),tuple(range((len(p)-1)*sides,len(p)*sides))]
    for i in range(len(p)-1):
        for k in range(sides):fs.append((i*sides+k,i*sides+(k+1)%sides,(i+1)*sides+(k+1)%sides,(i+1)*sides+k))
    return mesh(name,vs,fs,mat,parent,True)

def bezier(p0,p1,p2,p3,t):
    return (1-t)**3*np.array(p0)+3*(1-t)**2*t*np.array(p1)+3*(1-t)*t*t*np.array(p2)+t**3*np.array(p3)

def interp(z,values):
    # Cubic Hermite, clamped at interval endpoints; smooth without spline overshoot.
    times=[0,.055,.12,.20,.25,.30,.35]
    i=min(5,max(0,next((k-1 for k,t in enumerate(times) if t>z),5)))
    t=(z-times[i])/(times[i+1]-times[i]);t=max(0,min(1,t))
    slopes=[]
    for j in range(7):
        lo=max(0,j-1);hi=min(6,j+1);slopes.append((values[hi]-values[lo])/(times[hi]-times[lo]))
    dt=times[i+1]-times[i]
    return (2*t**3-3*t*t+1)*values[i]+(t**3-2*t*t+t)*dt*slopes[i]+(-2*t**3+3*t*t)*values[i+1]+(t**3-t*t)*dt*slopes[i+1]

def panel_x(z):return interp(z,[.647,.617,.640,.680,.676,.646,.610])
def panel_w(z):return max(.001,interp(z,[.025,.050,.133,.180,.133,.068,.001]))
def top(x):return .125+.096*(x/.62)**2
def bottom(x):return .055+.105*(x/.62)**2
def key_z(x):return .162+.096*(x/.59)**2

def trough(extended=False):
    ivory=bpy.data.materials['MR | Ivory satin'];dark=bpy.data.materials['MR | Dark cavity']
    parent=bpy.data.objects['Body'];N=96
    # Closed outer shell, including the bottom and rising end caps. Open at the top.
    # Cross section: outer left rim -> outer bottom -> outer right rim -> inner return.
    length=.665 if extended else .62
    vs=[]
    for x in np.linspace(-length,length,N+1):
        h=top(x);b=bottom(x)
        cross=[(-.150,h),(-.150,b+.025),(-.126,b),(.126,b),(.150,b+.025),(.150,h),
               (.138,h),(.138,b+.030),(.120,b+.011),(-.120,b+.011),(-.138,b+.030),(-.138,h)]
        vs.extend((x,y,z) for y,z in cross)
    K=12;fs=[]
    for i in range(N):
        for k in range(K):fs.append((i*K+k,i*K+(k+1)%K,(i+1)*K+(k+1)%K,(i+1)*K+k))
    fs.extend([tuple(reversed(range(K))),tuple(range(N*K,(N+1)*K))])
    o=bevel(mesh('Resonator_Outer',vs,fs,ivory,parent,True),.0015,3)
    # Recessed dark lining, sharing the hollow profile rather than filling the opening.
    vs=[]
    for x in np.linspace(-length+.003,length-.003,N+1):
        h=top(x)-.003;b=bottom(x)
        vs.extend([(x,-.1375,h),(x,-.1375,b+.031),(x,-.120,b+.0115),
                   (x,.120,b+.0115),(x,.1375,b+.031),(x,.1375,h)])
    fs=[(i*6+k,i*6+k+1,(i+1)*6+k+1,(i+1)*6+k) for i in range(N) for k in range(5)]
    mesh('Resonator_Inner',vs,fs,dark,parent,True)
    for sign in [-1,1]:
        # Slender ivory lip, no decorative gold bands.
        tube('Opening_Rounded_Lip',[(x,sign*.144,top(x)) for x in np.linspace(-length,length,97)],.003,ivory,parent,10)

def leaf(side,inset=False,inset_sign=1):
    parent=bpy.data.objects['End_Left' if side<0 else 'End_Right']
    ivory=bpy.data.materials['MR | Ivory satin'];wood=bpy.data.materials['MR | Pale natural wood']
    rows=56;cols=16;vs=[]
    # The front/back surfaces are curved in BOTH XZ and YZ, not a flat triangular board.
    for face in [-1,1]:
        for j in range(rows+1):
            z0=.35*j/rows
            z=.023+z0*.89 if inset else z0
            w=panel_w(z)*(.81 if inset else 1)
            for k in range(cols+1):
                u=-1+2*k/cols;y=w*u
                thickness=.007 if not inset else .0015
                bulge=.006*(1-u*u)*math.sin(math.pi*z/.35)
                x=side*(panel_x(z)+face*(thickness+bulge)+(inset_sign*.0088 if inset else 0))
                vs.append((x,y,z))
    K=(rows+1)*(cols+1);fs=[]
    for face in range(2):
        for j in range(rows):
            for k in range(cols):
                a=face*K+j*(cols+1)+k;fs.append((a,a+1,a+cols+2,a+cols+1))
    boundary=list(range(cols+1))+[j*(cols+1)+cols for j in range(1,rows+1)]+list(range(rows*(cols+1)+cols-1,rows*(cols+1)-1,-1))+[j*(cols+1) for j in range(rows-1,0,-1)]
    for i,a in enumerate(boundary):
        b=boundary[(i+1)%len(boundary)];fs.append((a,b,b+K,a+K))
    o=mesh(('End_Wood_Insert' if inset else 'End_Frame')+('_L' if side<0 else '_R')+('_Inner' if inset_sign<0 else ''),vs,fs,wood if inset else ivory,parent,True)
    if not inset:bevel(o,.0015,2)
    else:uv_planar(o,'yz')
    return o

def support(side,front,inset=False,corrected=False):
    parent=bpy.data.objects['End_Left' if side<0 else 'End_Right']
    ivory=bpy.data.materials['MR | Ivory satin'];wood=bpy.data.materials['MR | Pale natural wood']
    vs=[];N=40
    controls=((.650,.022,.007),(.600,.075,.088),(.470,.138,.086),(.335,.146,.061))
    if corrected:controls=((.650,.022,.007),(.600,.085,.105),(.490,.140,.140),(.370,.146,.109))
    for j in range(N+1):
        t=j/N
        p=bezier(*controls,t)
        if corrected:p[1]=.022+.124*(1-(1-t)**3)
        tangent=bezier(*controls,min(1,t+.002))-bezier(*controls,max(0,t-.002))
        normal=np.array([-tangent[2],0,tangent[0]]);normal/=np.linalg.norm(normal)
        width=(.007+(.018 if corrected else .012)*math.sin(math.pi*t))*(.58 if inset else 1)
        depth=.001 if inset else .007
        for n,d in [(-1,-1),(-1,1),(1,1),(1,-1)]:
            q=p+n*width*normal;q[0]*=side;q[1]=front*(q[1]+d*depth+(.0075 if inset else 0))
            if corrected and abs(q[1])<.141:q[2]=min(q[2],bottom(q[0])-.002)
            vs.append(tuple(q))
    fs=[(3,2,1,0),(N*4,N*4+1,N*4+2,N*4+3)]
    for j in range(N):
        for k in range(4):fs.append((j*4+k,j*4+(k+1)%4,(j+1)*4+(k+1)%4,(j+1)*4+k))
    o=mesh(('Support_Wood' if inset else 'Support')+f'_{side}_{front}',vs,fs,wood if inset else ivory,parent,True)
    if inset:uv_planar(o,'xz')
    else:bevel(o,.001,2)

def uv_planar(o,axes='xy',tile=None):
    pairs={'xy':(0,1),'yz':(1,2),'xz':(0,2)};a,b=pairs[axes]
    uv=o.data.uv_layers.new(name='Wood grain UV');v=o.data.vertices
    mi=[min(p.co[i] for p in v) for i in [a,b]];ma=[max(p.co[i] for p in v) for i in [a,b]]
    for loop in o.data.loops:
        p=v[loop.vertex_index].co
        u=(p[a]-mi[0])/max(.0001,ma[0]-mi[0]);w=(p[b]-mi[1])/max(.0001,ma[1]-mi[1])
        uv.data[loop.index].uv=(u,w) if tile is None else ((tile%4+.03+.94*u)/4,(tile//4+.03+.94*w)/8)

def setup_cameras():
    target=Vector((0,0,.16))
    positions={'Front_Isometric':(.8,-2.9,1.5),'Left_Isometric':(-2.25,-2.6,1.45),'Right_Isometric':(2.25,-2.6,1.45),
               'Front':(0,-3.4,.17),'Side':(3.4,0,.17),'Top':(0,0,3.5)}
    for name,position in positions.items():
        data=bpy.data.cameras.new('Camera_'+name);data.lens=80
        o=bpy.data.objects.new('Camera_'+name,data);scene.collection.objects.link(o);o.location=position
        o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
        if name in ['Front','Side','Top']:data.type='ORTHO';data.ortho_scale=1.6 if name!='Side' else .47
    scene.camera=bpy.data.objects['Camera_Front_Isometric']

def studio():
    world=bpy.data.worlds.new('MR | neutral warm studio');world.use_nodes=True;scene.world=world
    node=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND')
    node.inputs['Color'].default_value=(.68,.65,.60,1);node.inputs['Strength'].default_value=.45
    for name,p,energy,size in [('Key',(-1,-1.8,2.8),130,2.5),('Fill',(2,-.5,1.8),85,2),('Rim',(.3,2,2.5),150,2.5)]:
        d=bpy.data.lights.new('Studio_'+name,'AREA');d.energy=energy;d.size=size
        o=bpy.data.objects.new('Studio_'+name,d);scene.collection.objects.link(o);o.location=p
        o.rotation_euler=(Vector((0,0,.15))-o.location).to_track_quat('-Z','Y').to_euler()
    floor=material('Studio warm grey',(.40,.38,.35),.85)
    mesh('Studio_Ground',[(-100,-100,-.004),(100,-100,-.004),(100,100,-.004),(-100,100,-.004)],[(0,1,2,3)],floor)
    scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
    scene.eevee.taa_render_samples=128
    scene.render.image_settings.file_format='PNG'

def build_blockout():
    global scene,root
    assert SCENE not in bpy.data.scenes and not bpy.data.objects.get('Ranat_Master'), 'Asset already exists; resume the next stage'
    OUT.mkdir(parents=True,exist_ok=True)
    scene=bpy.data.scenes.new(SCENE);bpy.context.window.scene=scene
    scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
    root=empty('Ranat_Master');root['stage']='blockout';root['authoring_units']='meters'
    for name in ['Body','End_Left','End_Right','Keys','Suspension','Mallets']:empty(name,root)
    material('Ivory satin',(.855,.825,.758),.33)
    material('Pale natural wood',(.48,.29,.15),.4)
    cavity=material('Dark cavity',(.026,.011,.005),.65)
    next(n for n in cavity.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Specular IOR Level'].default_value=.2
    material('Cream woven cord',(.67,.60,.48),.9)
    material('Muted brass',(.56,.39,.18),.33,.87)
    trough()
    for side in [-1,1]:
        leaf(side);leaf(side,True)
        for front in [-1,1]:support(side,front);support(side,front,True)
    setup_cameras();studio()
    root['reference']='reference.png';root['requested_dimensions_mm']=[1400,360,350]
    save_asset('blockout.blend')
    print('Blockout built with 6 cameras, hollow body, mirrored sculpted end frames and curved supports')

def correct_silhouette():
    bind()
    assert root['stage']=='blockout'
    # Visual comparison: blockout supports read as disconnected low runners.
    # Raise the arch into the trough and show wood on the interior end faces too.
    for o in list(root.children_recursive):
        if o.name.startswith('Support'):bpy.data.objects.remove(o,do_unlink=True)
    for side in [-1,1]:
        leaf(side,True,-1)
        for front in [-1,1]:support(side,front,corrected=True);support(side,front,True,corrected=True)
    for o in list(bpy.data.objects['Body'].children):bpy.data.objects.remove(o,do_unlink=True)
    trough(extended=True)
    for o in root.children_recursive:
        if o.type=='MESH' and o.name.startswith('Support'):
            for v in o.data.vertices:
                v.co.z=max(.002,v.co.z)
    camera=bpy.data.objects['Camera_Front_Isometric'];camera.location=(.65,-3.3,1.55)
    camera.rotation_euler=(Vector((0,0,.16))-camera.location).to_track_quat('-Z','Y').to_euler()
    root['stage']='corrected'
    save_asset('silhouette_corrected.blend')

def wood_texture():
    W,H=1024,1024;y,x=np.mgrid[0:H,0:W]
    u=(x%256)/256;v=(y%128)/128;tile=x//256+(y//128)*4
    phase=u*140+.7*np.sin(v*4+tile)+.18*np.sin(v*19+tile*.4)
    grain=np.sin(phase)+.3*np.sin(phase*3.13)+.13*np.sin(phase*11.1)
    tone=1+.022*grain+.025*np.sin(tile*3.7)
    rgba=np.ones((H,W,4),dtype=np.float32)
    for k,c in enumerate([.60,.41,.26]):rgba[:,:,k]=c*tone
    im=bpy.data.images.new('MR | pale wood procedural atlas',width=W,height=H)
    im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(OUT/'pale_wood_atlas.png');im.file_format='PNG';im.save();im.pack()
    m=bpy.data.materials['MR | Pale natural wood'];n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=im
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');m.node_tree.links.new(n.outputs['Color'],p.inputs['Base Color'])
    # Existing end/support UVs occupy the whole atlas. Remap to a single grain region.
    for o in root.children_recursive:
        if o.type=='MESH' and o.data.materials and o.data.materials[0]==m:
            for uv in o.data.uv_layers.active.data:uv.uv=(uv.uv.x*.235+.0075,uv.uv.y*.1175+.00375)

def key(i):
    parent=bpy.data.objects['Keys'];wood=bpy.data.materials['MR | Pale natural wood']
    x=(i-10)*.0555;length=.320-.065*i/20
    width=.052;thick=.016;verts=[];N=12
    for j in range(N+1):
        y=-length/2+length*j/N;t=2*j/N-1;w=width/2*(1-.025*t*t)
        z=.008+.0015*(1-t*t)
        verts.extend([(-w,y,-thick/2),(w,y,-thick/2),(w,y,z),(-w,y,z)])
    fs=[(3,2,1,0),(N*4,N*4+1,N*4+2,N*4+3)]
    for j in range(N):
        for k in range(4):fs.append((j*4+k,j*4+(k+1)%4,(j+1)*4+(k+1)%4,(j+1)*4+k))
    o=mesh(f'Key_{i+1:02}',verts,fs,wood,parent)
    o.location=(x,0,key_z(x));o.rotation_euler.y=-math.atan(2*.096*x/(.59**2));o['note_index']=i
    # Real transverse bores: cream rope runs along X through each bar's two holes.
    for sign in [-1,1]:
        pts=[(-.035,sign*length*.30,.003),(.035,sign*length*.30,.003)]
        cutter=tube('Temporary_rope_bore',pts,.0023,wood,parent,12)
        cutter.location=o.location;cutter.rotation_euler=o.rotation_euler
        mod=o.modifiers.new('Suspension bore','BOOLEAN');mod.object=cutter
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.data.objects.remove(cutter,do_unlink=True)
    uv_planar(o,'xy',i);bevel(o,.0017,3)
    next(m for m in o.modifiers if m.type=='BEVEL').use_clamp_overlap=False
    return o,length

def add_details():
    bind();assert root['stage']=='corrected'
    wood_texture();ivory=bpy.data.materials['MR | Ivory satin'];wood=bpy.data.materials['MR | Pale natural wood']
    cord=bpy.data.materials['MR | Cream woven cord'];gold=bpy.data.materials['MR | Muted brass']
    keys=[key(i) for i in range(21)];bpy.context.view_layer.update()
    parent=bpy.data.objects['Suspension']
    for sign in [-1,1]:
        anchor=panel_x(.269)-.012
        points=[(-anchor,sign*.098,.269)]
        for o,length in keys:
            for x in [-.026,.026]:points.append(tuple(o.matrix_world@Vector((x,sign*length*.30,.003))))
        points.append((anchor,sign*.078,.269))
        tube('Rope_Front' if sign<0 else 'Rope_Back',points,.0017,cord,parent,10)
        # Small cream wraps on the visible top at each transverse entry/exit.
        for i,(o,length) in enumerate(keys):
            for side in [-1,1]:
                y=sign*length*.30
                local=[(side*.020,y-.002,.0095),(side*.024,y,.010),(side*.027,y+.001,.007),(side*.029,y,.003)]
                tube(f'Rope_Connection_{i+1:02}',[tuple(o.matrix_world@Vector(p)) for p in local],.00115,cord,parent,7)
        for side in [-1,1]:
            y=sign*(.098 if side<0 else .078);x=side*anchor
            peg=tube('Wood_Suspension_Pin',[(x-side*.003,y,.269),(x+side*.019,y,.269)],.003,wood,parent,12);uv_planar(peg,'xy',26)
            tube('End_Cord_Tie',[(x,y,.269),(x+side*.004,y,.263),(x+side*.006,y,.253),(x,y,.249),(x-side*.004,y,.253),(x,y,.269)],.0017,cord,parent,8)
    # Thin brass shoe at each integrated end contact, not decorative metal panels.
    for side in [-1,1]:
        p=bpy.data.objects['End_Left' if side<0 else 'End_Right']
        verts=[(side*x,y,z) for z in [0,.003] for y in [-.028,.028] for x in [.635,.660]]
        bevel(mesh('Contact_Brass_'+str(side),verts,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)],gold,p),.0008,2)
    for hand in ['L','R']:
        m=empty('Mallet_'+hand,bpy.data.objects['Mallets'])
        shaft=tube('Handle_'+hand,[(0,0,0),(0,-.31,0)],.0032,wood,m,12);uv_planar(shaft,'xy',24)
        # Padded head lies across the shaft, soft circular disc in XZ, 36 mm diameter.
        vs=[];fs=[];N=32;profile=[(-.010,.011),(-.008,.016),(-.004,.018),(.004,.018),(.008,.016),(.010,.011)]
        for y,r in profile:vs.extend((r*math.cos(t),y,r*math.sin(t)) for t in np.linspace(0,math.tau,N,endpoint=False))
        fs=[tuple(reversed(range(N))),tuple(range(5*N,6*N))]
        for j in range(5):
            for k in range(N):fs.append((j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k))
        mesh('Padded_Head_'+hand,vs,fs,cord,m,True)
        for y in [-.005,0,.005]:
            tube('Head_Thread_'+hand,[(.0182*math.cos(t),y,.0182*math.sin(t)) for t in np.linspace(0,math.tau,49)],.00035,ivory,m,5)
        tube('Small_Brass_Ring_'+hand,[(0,-.011,0),(0,-.014,0)],.004,gold,m,12)
        m.location=(.14 if hand=='L' else .30,-.27 if hand=='L' else -.35,.018)
        m.rotation_euler=(.048,0,math.radians(85 if hand=='L' else 70))
    root['stage']='detailed';validate_geometry();save_asset()

def validate_geometry():
    bind();bpy.context.view_layer.update()
    objects=[o for o in root.children_recursive if o.type=='MESH' and not any(p.name=='Mallets' for p in ancestors(o))]
    coords=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
    bounds={axis: [min(p[i] for p in coords),max(p[i] for p in coords)] for i,axis in enumerate('xyz')}
    report={'units':'meters','bounds':bounds,'dimensions_mm':{a:round((v[1]-v[0])*1000,2) for a,v in bounds.items()},
            'keys':len([o for o in root.children_recursive if o.name.startswith('Key_')]),
            'origin':list(root.location),'cameras':[o.name for o in scene.objects if o.type=='CAMERA'],
            'hollow_continuous_resonator':True,'individual_resonators':False,'stage':root['stage']}
    (OUT/'geometry-validation.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report))

def ancestors(o):
    while o.parent:
        o=o.parent;yield o

def save_asset(name='modern_thai_ranat.blend'):
    bind()
    # Write only this model scene and its dependencies, not earlier user projects.
    bpy.data.libraries.write(str(OUT/name),{scene},fake_user=True,compress=True)

def render_views(stage='final'):
    bind();folder=OUT/stage;folder.mkdir(exist_ok=True)
    names=['Front_Isometric','Left_Isometric','Right_Isometric']
    scene.render.resolution_percentage=65 if stage=='blockout' else 100
    queue=list(names)
    def step():
        if not queue:return None
        name=queue.pop(0);scene.camera=bpy.data.objects['Camera_'+name]
        scene.render.filepath=str(folder/(name+'.png'))
        bpy.ops.render.render(write_still=True,scene=scene.name)
        return .3 if queue else None
    bpy.app.timers.register(step,first_interval=.3)
    print('Queued',stage,'views')
