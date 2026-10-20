"""Re-author each subsystem to the 1230 x 415 x 425 mm base; no scale resize.
Requires the previous reference-study asset in this Blender session.
Call build_structure(), inspect render_views('blockout'), then finish().
"""
import bpy,bmesh,math,json,runpy
import numpy as np
from pathlib import Path
from mathutils import Vector

HERE=Path(__file__).resolve().parent if '__file__' in globals() else Path('S:/Hackaton/art/modern-thai-ranat')
OUT=HERE/'1230-base'
SCENE='Modern Thai Ranat | 1230 base'
base={'__file__':str(HERE/'create_modern_ranat.py')}
exec(compile((HERE/'create_modern_ranat.py').read_text(encoding='utf-8'),base['__file__'],'exec'),base)
scene=None;root=None
mesh=base['mesh'];tube=base['tube'];bevel=base['bevel'];empty=base['empty'];bezier=base['bezier']
ivory=wood=dark=cord=gold=None

def bind():
    global scene,root,ivory,wood,dark,cord,gold
    scene=bpy.data.scenes[SCENE];root=scene.objects['Ranat_Master']
    bpy.context.window.scene=scene;base['scene']=scene;base['root']=root;base['OUT']=OUT
    ivory=bpy.data.materials['MR | Ivory satin'];dark=bpy.data.materials['MR | Dark cavity']
    cord=bpy.data.materials['MR | Cream woven cord'];gold=bpy.data.materials['MR | Muted brass']
    wood=bpy.data.materials['MR1230 | pale wood physical grain']

def profile(z,values):
    ts=[0,.065,.150,.255,.315,.375,.425]
    i=next((i for i in range(6) if z<=ts[i+1]),5)
    t=max(0,min(1,(z-ts[i])/(ts[i+1]-ts[i])))
    slope=[]
    for j in range(7):
        a=max(0,j-1);b=min(6,j+1);slope.append((values[b]-values[a])/(ts[b]-ts[a]))
    # Zero tangent at extrema keeps the section within its dimensional envelope.
    for j in range(1,6):
        if (values[j]-values[j-1])*(values[j+1]-values[j])<=0:slope[j]=0
    d=ts[i+1]-ts[i]
    return (2*t**3-3*t*t+1)*values[i]+(t**3-2*t*t+t)*d*slope[i]+(-2*t**3+3*t*t)*values[i+1]+(t**3-t*t)*d*slope[i+1]

def px(z):return profile(z,[.562,.532,.555,.599,.595,.565,.529])-.00382
def pw(z):return max(.001,profile(z,[.045,.068,.167,.2075,.164,.080,.001]))
def rim(x):return .167+.115*(x/.55)**2
def floor(x):return .078+.108*(x/.55)**2
def strike(x):return .213+.103*(x/.465)**2

def physical_uv(o,axes='xy'):
    a,b={'xy':(0,1),'yz':(1,2),'xz':(0,2)}[axes]
    uv=o.data.uv_layers.new(name='Physical grain 200x800mm')
    for lp in o.data.loops:
        p=o.data.vertices[lp.vertex_index].co
        uv.data[lp.index].uv=(p[a]/.2+.5,p[b]/.8+.5)

def texture():
    global wood
    wood=bpy.data.materials['MR | Pale natural wood'].copy();wood.name='MR1230 | pale wood physical grain'
    N=1024;y,x=np.mgrid[0:N,0:N];u=x/N;v=y/N
    # About 2 mm growth-line pitch; shared physical mapping, not stretched insert UVs.
    phase=math.tau*(u*100+.10*np.sin(v*math.tau*3))
    tone=1+.025*np.sin(phase)+.008*np.sin(phase*3)+.004*np.sin(phase*11)
    rgba=np.ones((N,N,4),dtype=np.float32)
    for k,c in enumerate([.60,.41,.26]):rgba[:,:,k]=c*tone
    im=bpy.data.images.new('MR1230 | 200x800mm wood',width=N,height=N)
    im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(OUT/'wood_200x800mm.png');im.file_format='PNG';im.save();im.pack()
    n=next(n for n in wood.node_tree.nodes if n.type=='TEX_IMAGE');n.image=im

def body():
    p=scene.objects['Body'];N=96;vs=[]
    for x in np.linspace(-.580,.580,N+1):
        h=rim(x);b=floor(x)
        section=[(-.178,h),(-.178,b+.032),(-.151,b),(.151,b),(.178,b+.032),(.178,h),
                 (.166,h),(.166,b+.036),(.145,b+.011),(-.145,b+.011),(-.166,b+.036),(-.166,h)]
        vs.extend((x,y,z) for y,z in section)
    K=12;fs=[(i*K+k,i*K+(k+1)%K,(i+1)*K+(k+1)%K,(i+1)*K+k) for i in range(N) for k in range(K)]
    fs.extend([tuple(reversed(range(K))),tuple(range(N*K,(N+1)*K))])
    bevel(mesh('Resonator_Outer',vs,fs,ivory,p,True),.0015,3)
    vs=[]
    for x in np.linspace(-.577,.577,N+1):
        h=rim(x)-.003;b=floor(x)
        vs.extend([(x,-.1655,h),(x,-.1655,b+.0365),(x,-.145,b+.0115),
                   (x,.145,b+.0115),(x,.1655,b+.0365),(x,.1655,h)])
    fs=[(i*6+k,i*6+k+1,(i+1)*6+k+1,(i+1)*6+k) for i in range(N) for k in range(5)]
    mesh('Resonator_Inner',vs,fs,dark,p,True)
    for sign in [-1,1]:tube('Opening_Rounded_Lip',[(x,sign*.172,rim(x)) for x in np.linspace(-.58,.58,97)],.003,ivory,p,10)

def leaf(side,inset=False,face_sign=1):
    p=scene.objects['End_Left' if side<0 else 'End_Right'];R=68;C=20;vs=[]
    for face in [-1,1]:
        for j in range(R+1):
            # Re-drawn insert with absolute 25/22 mm end margins, not stretched old mesh.
            z=.025+.378*j/R if inset else .425*j/R
            w=max(.001,pw(z)-.019) if inset else pw(z)
            for k in range(C+1):
                u=-1+2*k/C;y=w*u
                bulge=.010*(1-u*u)*math.sin(math.pi*z/.425)
                x=side*(px(z)+face*((.0015 if inset else .007)+bulge)+(face_sign*.0088 if inset else 0))
                vs.append((x,y,z))
    K=(R+1)*(C+1);fs=[]
    for f in range(2):
        for j in range(R):
            for k in range(C):
                a=f*K+j*(C+1)+k;fs.append((a,a+1,a+C+2,a+C+1))
    boundary=list(range(C+1))+[j*(C+1)+C for j in range(1,R+1)]+list(range(R*(C+1)+C-1,R*(C+1)-1,-1))+[j*(C+1) for j in range(R-1,0,-1)]
    for i,a in enumerate(boundary):b=boundary[(i+1)%len(boundary)];fs.append((a,b,b+K,a+K))
    o=mesh(('End_Wood_Insert' if inset else 'End_Frame')+('_L' if side<0 else '_R')+('_Inner' if face_sign<0 else ''),vs,fs,wood if inset else ivory,p,True)
    if inset:physical_uv(o,'yz')
    else:bevel(o,.0015,2)

def support(side,front,inset=False):
    p=scene.objects['End_Left' if side<0 else 'End_Right'];vs=[];N=48
    controls=((.561,.036,.008),(.514,.111,.132),(.397,.170,.170),(.298,.174,.123))
    for j in range(N+1):
        t=j/N;c=bezier(*controls,t);c[1]=.036+.138*(1-(1-t)**3)
        tangent=bezier(*controls,min(1,t+.001))-bezier(*controls,max(0,t-.001))
        normal=np.array([-tangent[2],0,tangent[0]]);normal/=np.linalg.norm(normal)
        w=(.008+.017*math.sin(math.pi*t))*(.57 if inset else 1)
        for n,d in [(-1,-1),(-1,1),(1,1),(1,-1)]:
            q=c+n*w*normal;q[0]*=side;q[1]=front*(q[1]+d*(.001 if inset else .007)+(.0075 if inset else 0))
            if abs(q[1])<.169:q[2]=min(q[2],floor(q[0])-.002)
            q[2]=max(.002,q[2]);vs.append(tuple(q))
    fs=[(3,2,1,0),(N*4,N*4+1,N*4+2,N*4+3)]
    fs += [(j*4+k,j*4+(k+1)%4,(j+1)*4+(k+1)%4,(j+1)*4+k) for j in range(N) for k in range(4)]
    o=mesh(('Support_Wood' if inset else 'Support')+f'_{side}_{front}',vs,fs,wood if inset else ivory,p,True)
    if inset:physical_uv(o,'xz')
    else:bevel(o,.001,2)

def save(name='modern_thai_ranat_1230.blend'):
    bpy.data.libraries.write(str(OUT/name),{scene},fake_user=True,compress=True)

def build_structure():
    global scene,root,ivory,dark,cord,gold
    assert SCENE not in bpy.data.scenes,'New base already exists; resume finish()'
    old=bpy.data.scenes['Modern Thai Ranat | reference study']
    OUT.mkdir(parents=True,exist_ok=True)
    # Preserve the previous scene and its saved file; free canonical names only in
    # this project's previous scene. There is no deletion of the earlier model.
    for o in list(old.objects):o.name='V1400 | '+o.name
    scene=bpy.data.scenes.new(SCENE);bpy.context.window.scene=scene
    base['scene']=scene;base['OUT']=OUT
    scene.unit_settings.system=old.unit_settings.system;scene.unit_settings.scale_length=1
    root=empty('Ranat_Master');base['root']=root
    root['base_dimensions_mm']=[1230,415,425];root['revision']='Re-authored 1230 base';root['stage']='structure'
    for name in ['Body','End_Left','End_Right','Keys','Suspension']:empty(name,root)
    ivory=bpy.data.materials['MR | Ivory satin'];dark=bpy.data.materials['MR | Dark cavity']
    cord=bpy.data.materials['MR | Cream woven cord'];gold=bpy.data.materials['MR | Muted brass']
    texture();body()
    for side in [-1,1]:
        leaf(side);leaf(side,True);leaf(side,True,-1)
        for front in [-1,1]:support(side,front);support(side,front,True)
        p=scene.objects['End_Left' if side<0 else 'End_Right']
        vs=[(side*x,y,z) for z in [0,.003] for y in [-.049,.049] for x in [.548,.574]]
        bevel(mesh('Contact_Brass_'+str(side),vs,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)],gold,p),.0008,2)
    base['setup_cameras']();base['studio']()
    for o in scene.objects:
        if o.type=='CAMERA':
            target=Vector((0,0,.208));o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
    scene.objects['Camera_Front'].location=(0,-3.4,.2125);scene.objects['Camera_Front'].rotation_euler=(math.pi/2,0,0)
    scene.objects['Camera_Side'].location=(3.4,0,.2125);scene.objects['Camera_Side'].rotation_euler=(Vector((0,0,.2125))-scene.objects['Camera_Side'].location).to_track_quat('-Z','Y').to_euler()
    scene.objects['Camera_Side'].data.ortho_scale=.76
    scene.objects['Camera_Front'].data.ortho_scale=1.42
    scene.objects['Camera_Front_Isometric'].location=(.6,-3.1,1.6)
    scene.objects['Camera_Front_Isometric'].rotation_euler=(Vector((0,0,.20))-scene.objects['Camera_Front_Isometric'].location).to_track_quat('-Z','Y').to_euler()
    report('blockout');save('1230_blockout.blend')

def key(i):
    x=(i-10)*.0465;length=.370-.070*i/20;w=.044;vs=[];N=12
    for j in range(N+1):
        t=2*j/N-1;y=t*length/2;half=w/2*(1-.025*t*t);z=.009+.0015*(1-t*t)
        vs.extend([(-half,y,-.009),(half,y,-.009),(half,y,z),(-half,y,z)])
    fs=[(3,2,1,0),(N*4,N*4+1,N*4+2,N*4+3)]
    fs += [(j*4+k,j*4+(k+1)%4,(j+1)*4+(k+1)%4,(j+1)*4+k) for j in range(N) for k in range(4)]
    p=scene.objects['Keys'];o=mesh(f'Key_{i+1:02}',vs,fs,wood,p)
    o.location=(x,0,strike(x));o.rotation_euler.y=-math.atan(2*.103*x/(.465**2));o['note_index']=i
    for sign in [-1,1]:
        cutter=tube('Temporary_Bore',[(-.030,sign*length*.30,.0035),(.030,sign*length*.30,.0035)],.0023,wood,p,12)
        cutter.location=o.location;cutter.rotation_euler=o.rotation_euler
        mod=o.modifiers.new('Cord bore','BOOLEAN');mod.object=cutter;bpy.context.view_layer.objects.active=o
        bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
    physical_uv(o);bevel(o,.0017,3);next(m for m in o.modifiers if m.type=='BEVEL').use_clamp_overlap=False
    return o,length

def finish():
    bind();assert root['stage']=='structure'
    keys=[key(i) for i in range(21)];bpy.context.view_layer.update();p=scene.objects['Suspension']
    height=.335;anchor=px(height)-.012
    for sign in [-1,1]:
        pts=[(-anchor,sign*.113,height)]
        for o,length in keys:
            for x in [-.022,.022]:pts.append(tuple(o.matrix_world@Vector((x,sign*length*.30,.0035))))
        pts.append((anchor,sign*.093,height))
        tube('Rope_Front' if sign<0 else 'Rope_Back',pts,.0017,cord,p,10)
        for i,(o,length) in enumerate(keys):
            for side in [-1,1]:
                y=sign*length*.30
                pts=[(side*.016,y-.002,.0105),(side*.020,y,.011),(side*.023,y+.001,.008),(side*.025,y,.0035)]
                tube(f'Rope_Connection_{i+1:02}',[tuple(o.matrix_world@Vector(v)) for v in pts],.00115,cord,p,7)
        for side in [-1,1]:
            x=side*anchor;y=sign*(.113 if side<0 else .093)
            peg=tube('Wood_Suspension_Pin',[(x-side*.003,y,height),(x+side*.019,y,height)],.003,wood,p,12);physical_uv(peg)
            tube('End_Cord_Tie',[(x,y,height),(x+side*.004,y,height-.006),(x+side*.006,y,height-.016),(x,y,height-.020),(x-side*.004,y,height-.016),(x,y,height)],.0017,cord,p,8)
    # Unchanged hand-sized mallets are separate accessories. They do not belong to
    # the instrument dimensional envelope and are not secretly excluded from it.
    accessories=empty('Accessories_Mallets')
    old_parent=bpy.data.objects['V1400 | Mallets'];mapping={old_parent:accessories}
    def clone_children(old):
        for child in old.children:
            o=child.copy();o.name=child.name.removeprefix('V1400 | ');scene.collection.objects.link(o)
            o.parent=mapping[old];mapping[child]=o;clone_children(child)
    clone_children(old_parent)
    root['stage']='complete'
    for o in scene.objects:o.select_set(False)
    for o in [root,*root.children_recursive]:o.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    report('final');scene.camera=scene.objects['Camera_Front_Isometric'];save()

def report(stage):
    bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
    objects=[o for o in root.children_recursive if o.type=='MESH'];coords=[]
    for o in objects:
        ev=o.evaluated_get(deps);me=ev.to_mesh()
        coords.extend(ev.matrix_world@v.co for v in me.vertices);ev.to_mesh_clear()
    low=[min(v[i] for v in coords) for i in range(3)];high=[max(v[i] for v in coords) for i in range(3)]
    dims=[(high[i]-low[i])*1000 for i in range(3)];target=[1230,415,425]
    scales=all(all(abs(v-1)<1e-6 for v in o.scale) for o in [root,*root.children_recursive])
    assert all(abs(d-t)<=5 for d,t in zip(dims,target)),dims
    assert scales,'Unapplied scale'
    # Estimate the usable internal cavity by integrating actual section polygons.
    xs=np.linspace(-.577,.577,1001);areas=[]
    for x in xs:
        h=rim(x);b=floor(x)
        section=[(-.166,h),(-.166,b+.036),(-.145,b+.011),(.145,b+.011),(.166,b+.036),(.166,h)]
        areas.append(abs(sum(section[i][0]*section[(i+1)%6][1]-section[(i+1)%6][0]*section[i][1] for i in range(6)))/2)
    volume=sum((areas[i]+areas[i+1])*.5*(xs[i+1]-xs[i]) for i in range(len(xs)-1))*1000
    payload={'stage':stage,'measurement':'All evaluated mesh vertices under Ranat_Master, no exclusions',
      'dimensions_mm':[round(d,3) for d in dims],'target_mm':target,'tolerance_mm':5,'all_scales_one':scales,
      'bounds_m':[low,high],'origin':list(root.location),'cavity_approx_litres':round(volume,2),
      'system_parameters_mm':{'body_length':1160,'body_outer_depth':356,'cavity_width':332,'wall_thickness':12,
      'centre_floor_z':78,'centre_rim_z':167,'centre_key_origin_z':213,'centre_key_underside_clearance':37,
      'key_pitch':46.5,'key_width':44,'key_lengths':[370,300],'key_body_thickness':18,
      'end_height':425,'end_depth':415,'frame_core_thickness':14,'foot_depth':98},
      'keys':sum(o.name.startswith('Key_') for o in objects),'global_mesh_resize_used':False}
    (OUT/(stage+'-dimensions.json')).write_text(json.dumps(payload,indent=2))
    print(json.dumps(payload))

def render_views(stage='final'):
    bind();folder=OUT/stage;folder.mkdir(exist_ok=True)
    queue=['Front','Side','Front_Isometric','Left_Isometric','Right_Isometric']
    def step():
        name=queue.pop(0);scene.camera=scene.objects['Camera_'+name]
        scene.render.filepath=str(folder/(name+'.png'));bpy.ops.render.render(write_still=True,scene=scene.name)
        return .3 if queue else None
    bpy.app.timers.register(step,first_interval=.3)
    print('Queued',stage,'five views')
