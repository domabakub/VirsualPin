"""Exterior reconstructed from two independently digitized orthographic profiles.
One right end / one quadrant is authored. Mirror modifiers enforce symmetry.
"""
import bpy,bmesh,math,json
import numpy as np
from pathlib import Path
from mathutils import Vector
HERE=Path('S:/Hackaton/art/modern-thai-ranat');OUT=HERE/'orthographic-04'
SCENE='Ranat | orthographic reconstruction 04'
trace=json.loads((OUT/'reference-traces.json').read_text())
base={'__file__':str(HERE/'create_modern_ranat.py')}
exec(compile((HERE/'create_modern_ranat.py').read_text(),base['__file__'],'exec'),base)
mesh=base['mesh'];tube=base['tube'];empty=base['empty'];bevel=base['bevel'];bez=base['bezier']
scene=root=None;groups={};ivory=wood=dark=cord=gold=None

def spline(x,points):
    """Shape-preserving Hermite interpolation; extrema cannot overshoot."""
    p=np.array(points);xs=p[:,0];ys=p[:,1];h=np.diff(xs);d=np.diff(ys)/h
    m=np.zeros(len(xs));m[0]=d[0];m[-1]=d[-1]
    for j in range(1,len(xs)-1):
        if d[j-1]*d[j]>0:
            w1=2*h[j]+h[j-1];w2=h[j]+2*h[j-1];m[j]=(w1+w2)/(w1/d[j-1]+w2/d[j])
    i=max(0,min(len(xs)-2,int(np.searchsorted(xs,x)-1)));t=np.clip((x-xs[i])/h[i],0,1)
    return float((2*t**3-3*t*t+1)*ys[i]+(t**3-2*t*t+t)*h[i]*m[i]+(-2*t**3+3*t*t)*ys[i+1]+(t**3-t*t)*h[i]*m[i+1])

def profile(view,name):
    p=trace[view];scale=p['mm_per_pixel_x' if view=='front' else 'mm_per_pixel_y']/1000;sz=p['mm_per_pixel_z']/1000
    return sorted([((p['ground_y_px']-v)*sz,(u-p['centre_x_px'])*scale) for u,v in p[name]])

FA=profile('front','outer_end');FB=profile('front','inner_end');SW=profile('side','outer_end');SI=profile('side','wood')
def a(z):return spline(z,FA)
def b(z):return spline(z,FB)
def w(z):return max(0,spline(z,SW))
def wi(z):return max(0,spline(z,SI))
def front_path(name):
    p=trace['front'];return [((u-p['centre_x_px'])*p['mm_per_pixel_x']/1000,(p['ground_y_px']-v)*p['mm_per_pixel_z']/1000) for u,v in p[name]]
def rim(x):return spline(abs(x),front_path('rim'))
def floor(x):return spline(abs(x),front_path('underside'))

def mirror(o,axes=(True,True,False)):
    m=o.modifiers.new('Exact structural symmetry','MIRROR');m.use_axis=axes;m.use_clip=True;m.use_mirror_merge=True;m.merge_threshold=.00001
    return o

def smooth_edge(o,width=.0006):
    m=o.modifiers.new('Fine edge radius','BEVEL');m.width=width;m.segments=3
    return o

def uv(o,axes=(1,2),offset=0):
    layer=o.data.uv_layers.new(name='Timber physical mapping')
    for loop in o.data.loops:
        v=o.data.vertices[loop.vertex_index].co
        layer.data[loop.index].uv=(v[axes[0]]/.28+.5+offset,v[axes[1]]/.8+.5)

def bind():
    global scene,root,groups,ivory,wood,dark,cord,gold
    scene=bpy.data.scenes[SCENE];bpy.context.window.scene=scene;base['scene']=scene
    root=scene.objects['O4 | Ranat_Master'];groups={n:scene.objects['O4 | '+n] for n in ['Body','Ends','Supports','Keys','Suspension','Mallets']}
    ivory,wood,dark,cord,gold=[bpy.data.materials['O4 | '+n] for n in ['Ivory','Wood','Cavity','Cord','Brass']]

def ends():
    # Half side contour, including the flat foot at the symmetry plane.
    N=140;outer=[(0,0)]+[(w(z),z) for z in np.linspace(0,.35,N+1)]
    z0,z1=SI[0][0],SI[-1][0];inner=[(0,z0)]+[(wi(z),z) for z in np.linspace(z0,z1,N+1)]
    K=len(outer);vs=[]
    # Surface layers form a solid white rim. All X coordinates stay inside the
    # front-view envelope; all Y coordinates stay inside the side-view envelope.
    sections=[(0,0),(.055,.04),(.94,.04),(1,.10),(1,.90),(.94,.96),(.055,.96),(0,1)]
    for t,depth in sections:
        for o,i in zip(outer,inner):
            y,z=np.array(o)*(1-t)+np.array(i)*t
            x=a(z)*(1-depth)+b(z)*depth
            vs.append((x,y,z))
    fs=[]
    for k in range(len(sections)):
        for j in range(K-1):fs.append((k*K+j,k*K+j+1,((k+1)%8)*K+j+1,((k+1)%8)*K+j))
    frame=mesh('O4 | End_Frame',vs,fs,ivory,groups['Ends'],True);mirror(frame)
    m=frame.modifiers.new('Smooth reference surface','SUBSURF');m.levels=2;m.render_levels=2
    # The insert is a full thick lens within the white frame, mirrored in Y/X.
    vs=[];C=22;R=140
    for face in [0,1]:
        for j,z in enumerate(np.linspace(z0,z1,R+1)):
            for k in range(C+1):
                y=wi(z)*k/C;depth=.16 if face==0 else .84
                x=a(z)*(1-depth)+b(z)*depth
                vs.append((x,y,z))
    K=(R+1)*(C+1);fs=[]
    for f in range(2):
        for j in range(R):
            for k in range(C):q=f*K+j*(C+1)+k;fs.append((q,q+1,q+C+2,q+C+1))
    for j in range(R):q=j*(C+1)+C;fs.append((q,q+C+1,q+C+1+K,q+K))
    o=mesh('O4 | End_Wood_Insert',vs,fs,wood,groups['Ends'],True);uv(o);mirror(o)

def body():
    vs=[];N=110;K=12
    for x in np.linspace(0,.64,N+1):
        lo=floor(x);hi=rim(x);d=min(.148,w(hi)-.004)
        # A narrow bottom becomes a real hollow cavity at the top. Its side-view
        # silhouette stays behind the end frame, as in the reference drawing.
        cross=[(0,lo),(.030,lo),(.055,lo+.003),(.080,lo+.010),(d-.010,hi-.030),(d,hi),
          (d-.010,hi), (d-.019,hi-.026),(.074,lo+.022),(.052,lo+.014),(.030,lo+.012),(0,lo+.012)]
        for k,(y,z) in enumerate(cross):
            y=min(y,max(0,w(z)-(.012 if 6<=k<11 else .002)))
            blend=max(0,(x-.53)/.11)**3
            xx=x+(b(z)+.001-.64)*blend
            vs.append((xx,y,z))
    fs=[(i*K+k,i*K+(k+1)%K,(i+1)*K+(k+1)%K,(i+1)*K+k) for i in range(N) for k in range(K)]
    fs.append(tuple(range(N*K,(N+1)*K)))
    o=mesh('O4 | Resonator_Shell',vs,fs,ivory,groups['Body'],True);o.data.materials.append(dark)
    for p in o.data.polygons:
        if p.index<N*K and 6<=p.index%K<11:p.material_index=1
    smooth_edge(o,.0007);mirror(o)

def supports():
    # Trace the crescent underside support from the FRONT drawing.
    upper=[(.618,.003),(.582,.112),(.465,.112),(.340,.067)]
    lower=[(.618,.003),(.582,.069),(.471,.071),(.340,.067)]
    for inset in [False,True]:
        vs=[];N=90
        for j in range(N+1):
            t=(.045+.88*j/N) if inset else j/N
            lo=bez(*lower,t);hi=bez(*upper,t)
            if inset:lo,hi=lo+.23*(hi-lo),lo+.76*(hi-lo)
            yc=.033+.042*math.sin(t*math.pi/2)
            for s,d in [(0,-1),(0,1),(.08,1),(.92,1),(1,1),(1,-1),(.92,-1),(.08,-1)]:
                x,z=lo+(hi-lo)*s;y=yc+d*(.001 if inset else .005)+(.0051 if inset else 0)
                vs.append((x,y,z))
        K=8;fs=[tuple(reversed(range(K))),tuple(range(N*K,(N+1)*K))]+[(j*K+k,j*K+(k+1)%K,(j+1)*K+(k+1)%K,(j+1)*K+k) for j in range(N) for k in range(K)]
        o=mesh('O4 | '+('Support_Wood' if inset else 'Support_Frame'),vs,fs,wood if inset else ivory,groups['Supports'],True)
        if inset:
            layer=o.data.uv_layers.new()
            for l in o.data.loops:
                j,k=divmod(l.vertex_index,8);layer.data[l.index].uv=(k/8*.25,j/N)
        mirror(o);smooth_edge(o,.0006)
    # A thin brass shoe directly under the end shell's flat foot.
    vs=[(x,y,z) for z in [0,.0025] for y in [0,w(0)] for x in [b(0),a(0)]]
    o=mesh('O4 | Contact_Shoe',vs,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)],gold,groups['Supports']);mirror(o);smooth_edge(o,.0004)

def cameras():
    from mathutils import Vector
    positions={'Front':(0,-4,.175),'Side':(4,0,.175),'Front_Isometric':(.75,-3.4,1.40)}
    for n,p in positions.items():
        d=bpy.data.cameras.new('O4 | Camera_'+n);d.lens=85
        o=bpy.data.objects.new(d.name,d);scene.collection.objects.link(o);o.location=p
        target=Vector((0,0,.175));o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
        if n!='Front_Isometric':d.type='ORTHO';d.ortho_scale=1.55 if n=='Front' else .48
    scene.camera=scene.objects['O4 | Camera_Front']

def setup():
    global scene,root,groups,ivory,wood,dark,cord,gold
    assert SCENE not in bpy.data.scenes
    old=bpy.data.scenes['Ranat | reference match 03'];scene=bpy.data.scenes.new(SCENE);bpy.context.window.scene=scene;base['scene']=scene
    scene.unit_settings.system=old.unit_settings.system;scene.unit_settings.scale_length=1
    root=empty('O4 | Ranat_Master');root['reference_views']='Front View and Side View only';root['symmetry_axes']='X and Y'
    for n in ['Body','Ends','Supports','Keys','Suspension']:groups[n]=empty('O4 | '+n,root)
    groups['Mallets']=empty('O4 | Mallets')
    mats=[]
    for n in ['Ivory','Wood','Cavity','Cord','Brass']:
        m=bpy.data.materials['D3 | '+n].copy();m.name='O4 | '+n;mats.append(m)
    ivory,wood,dark,cord,gold=mats
    ends();body();supports();cameras()
    for old_o in old.objects:
        if old_o.type=='LIGHT' or 'Studio_Ground' in old_o.name:
            o=old_o.copy();o.data=old_o.data.copy();o.name='O4 | '+old_o.name.split(' | ')[-1];scene.collection.objects.link(o)
    scene.world=old.world.copy();scene.render.engine='BLENDER_EEVEE';scene.eevee.taa_render_samples=64
    scene.render.image_settings.file_format='PNG';scene.render.resolution_percentage=100
    root['stage']='exterior verification';save('exterior_blockout.blend')

def view_settings(n):
    scene.camera=scene.objects['O4 | Camera_'+n]
    scene.render.pixel_aspect_x=1;scene.render.pixel_aspect_y=1
    if n=='Front':
        scene.render.resolution_x=1500;scene.render.resolution_y=500;scene.camera.data.ortho_scale=1.55
    elif n=='Side':
        scene.render.resolution_x=700;scene.render.resolution_y=700;scene.camera.data.ortho_scale=.43
    else:scene.render.resolution_x=1400;scene.render.resolution_y=850

def render(stage='blockout'):
    folder=OUT/stage;folder.mkdir(exist_ok=True);queue=['Front','Side']
    def step():
        n=queue.pop(0);view_settings(n);scene.render.filepath=str(folder/(n+'.png'));bpy.ops.render.render(write_still=True,scene=scene.name)
        return .4 if queue else None
    bpy.app.timers.register(step,first_interval=.3)

def save(name='modern_thai_ranat_orthographic04.blend'):
    bpy.data.libraries.write(str(OUT/name),{scene},fake_user=True,compress=True)
