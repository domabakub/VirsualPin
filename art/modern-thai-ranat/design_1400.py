"""Exterior design revision, authored at 1400 x 360 x 350 mm in Blender."""
import bpy,bmesh,math,json
import numpy as np
from pathlib import Path
from mathutils import Vector
HERE=Path('S:/Hackaton/art/modern-thai-ranat')
OUT=HERE/'design-1400'
SCENE='Ranat | 1400 exterior design 02'
base={'__file__':str(HERE/'create_modern_ranat.py')}
exec(compile((HERE/'create_modern_ranat.py').read_text(),base['__file__'],'exec'),base)
mesh=base['mesh'];tube=base['tube'];bevel=base['bevel'];empty=base['empty'];bez=base['bezier']
scene=None;root=None;groups={};ivory=wood=dark=cord=gold=None

def bind():
    global scene,root,groups,ivory,wood,dark,cord,gold
    scene=bpy.data.scenes[SCENE];bpy.context.window.scene=scene
    root=scene.objects['D2 | Ranat_Master'];groups={n:scene.objects['D2 | '+n] for n in ['Body','End_Left','End_Right','Keys','Suspension','Accessories_Mallets']}
    base['scene']=scene
    ivory,wood,dark,cord,gold=[bpy.data.materials['D2 | '+n] for n in ['Ivory','Wood','Cavity','Cord','Brass']]

def uv(o,axes=(0,1),offset=0):
    layer=o.data.uv_layers.new(name='Physical wood grain')
    for l in o.data.loops:
        v=o.data.vertices[l.vertex_index].co
        layer.data[l.index].uv=(v[axes[0]]/.22+.5+offset,v[axes[1]]/.60+.5)

def materials():
    global ivory,wood,dark,cord,gold
    names=['Ivory satin','Pale natural wood','Dark cavity','Cream woven cord','Muted brass']
    mats=[]
    for old,new in zip(names,['Ivory','Wood','Cavity','Cord','Brass']):
        m=bpy.data.materials['MR | '+old].copy();m.name='D2 | '+new;mats.append(m)
    ivory,wood,dark,cord,gold=mats
    N=1536;y,x=np.mgrid[0:N,0:N];u=x/N;v=y/N
    # Continuous timber grain with wandering growth lines and fine pores.
    warp=u+.008*np.sin(2*math.pi*v*1.5)+.003*np.sin(2*math.pi*v*4+u*5)
    grain=np.sin(2*math.pi*(warp*76))+.35*np.sin(2*math.pi*(warp*173))
    pores=np.maximum(0,np.sin(2*math.pi*(warp*311)+.7*np.sin(v*30)))**14
    tone=1+.060*grain-.045*pores+.035*np.sin(warp*35)
    rgba=np.ones((N,N,4),dtype=np.float32)
    for k,c in enumerate([.63,.455,.305]):rgba[:,:,k]=c*tone
    im=bpy.data.images.new('D2 | pale flowing timber',width=N,height=N)
    im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(OUT/'pale_timber.png');im.file_format='PNG';im.save();im.pack()
    n=next(n for n in wood.node_tree.nodes if n.type=='TEX_IMAGE');n.image=im
    p=next(n for n in wood.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Roughness'].default_value=.37

def endx(z):
    # A full S sweep in length-height, with an outward rising crown.
    ts=[0,.045,.105,.18,.25,.30,.35];vs=[.660,.636,.639,.677,.678,.665,.691]
    i=min(5,max(0,next((k-1 for k,t in enumerate(ts) if t>z),5)))
    t=max(0,min(1,(z-ts[i])/(ts[i+1]-ts[i])))
    slopes=[(vs[min(6,j+1)]-vs[max(0,j-1)])/(ts[min(6,j+1)]-ts[max(0,j-1)]) for j in range(7)]
    d=ts[i+1]-ts[i]
    return .005643+(2*t**3-3*t*t+1)*vs[i]+(t**3-2*t*t+t)*d*slopes[i]+(-2*t**3+3*t*t)*vs[i+1]+(t**3-t*t)*d*slopes[i+1]

def contours():
    # Closed sculptural leaf; narrow crown and elongated waist, not broad diamond.
    curves=[[(.012,.350),(-.012,.310),(-.110,.224),(-.087,.155)],
      [(-.087,.155),(-.078,.101),(-.023,.057),(-.027,.003)],
      [(-.027,.003),(-.013,.002),(.013,.002),(.027,.003)],
      [(.027,.003),(.018,.072),(.098,.119),(.095,.188)],
      [(.095,.188),(.101,.251),(.035,.302),(.012,.350)]]
    out=[]
    for c in curves:
        out.extend(bez(*c,t) for t in np.linspace(0,1,32,endpoint=False))
    outer=np.array(out);inner=[]
    # Inward surface border varies naturally at crown and foot.
    centre=np.array([.004,.180])
    for y,z in outer:
        q=centre+(np.array([y,z])-centre)*np.array([.70,.84])
        q[0]+=.005*math.sin(math.pi*q[1]/.35)
        inner.append(q)
    return outer,np.array(inner)

def ends():
    outer,inner=contours();N=len(outer)
    for side in [-1,1]:
        p=groups['End_Left' if side<0 else 'End_Right'];verts=[]
        # Rounded ivory ring: front/back with a crowned cross-section and real opening.
        section=[(0,-.007),(.05,-.010),(.24,-.014),(.70,-.014),(1,-.007),
                 (1,.007),(.70,.014),(.24,.014),(.05,.010),(0,.007)]
        for k,(t,dep) in enumerate(section):
            for a,b in zip(outer,inner):
                y,z=(1-t)*a+t*b
                # Fade thickness at tip so the envelope is 350 mm high.
                fade=.45+.55*math.sin(math.pi*min(1,z/.35))
                verts.append((side*(endx(z)+dep*fade),y,z))
        faces=[(k*N+j,k*N+(j+1)%N,((k+1)%len(section))*N+(j+1)%N,((k+1)%len(section))*N+j) for k in range(len(section)) for j in range(N)]
        o=mesh('D2 | End_Frame_'+str(side),verts,faces,ivory,p,True)
        bevel(o,.0008,2)
        # Solid wood lens fitted inside the opening; convex grain surface is recessed
        # behind the crowned frame. Both faces share one coherent solid.
        vs=[];R=14;c=np.mean(inner,axis=0)
        for face in [-1,1]:
            for r in np.linspace(.001,1.025,R):
                for point in inner:
                    y,z=c+(point-c)*r
                    dep=face*(.0045+.003*(1-r*r))
                    vs.append((side*(endx(z)+dep),y,z))
        K=N*R;fs=[]
        for f in range(2):
            for r in range(R-1):
                for j in range(N):
                    a=f*K+r*N+j;b=f*K+r*N+(j+1)%N;fs.append((a,b,b+N,a+N))
            fs.append(tuple(f*K+j for j in range(N)))
        for j in range(N):a=(R-1)*N+j;b=(R-1)*N+(j+1)%N;fs.append((a,b,b+K,a+K))
        o=mesh('D2 | End_Wood_Insert_'+str(side),vs,fs,wood,p,True);uv(o,(1,2))

def rim(x):return .142+.096*(x/.62)**2
def floor(x):return .058+.074*(x/.65)**2
def depth(x):return .162-.096*(abs(x)/.672)**8

def joined_x(x,z):
    a=abs(x);w=max(0,(a-.56)/.112)**3
    return (1 if x>=0 else -1)*(a+(endx(z)-.006-.672)*w)

def trough():
    N=120;vs=[];sections=[]
    # Smooth curved bottom and slightly convex sidewalls, without old hard chamfer.
    for x in np.linspace(-.672,.672,N+1):
        d=depth(x);lo=floor(x);hi=rim(x);h=hi-lo
        yz=[(-d,hi),(-d-.001,hi-.014),(-d+.003,lo+h*.40),(-d+.017,lo+.012),(-d+.043,lo),
            (0,lo-.002),(d-.043,lo),(d-.017,lo+.012),(d-.003,lo+h*.40),(d+.001,hi-.014),(d,hi),
            (d-.011,hi),(d-.010,hi-.013),(d-.014,lo+h*.40),(d-.026,lo+.024),(d-.047,lo+.012),
            (0,lo+.010),(-d+.047,lo+.012),(-d+.026,lo+.024),(-d+.014,lo+h*.40),(-d+.010,hi-.013),(-d+.011,hi)]
        sections.append(yz);vs.extend((joined_x(x,z),y,z) for y,z in yz)
    K=len(sections[0]);fs=[(i*K+k,i*K+(k+1)%K,(i+1)*K+(k+1)%K,(i+1)*K+k) for i in range(N) for k in range(K)]
    fs.extend([tuple(reversed(range(K))),tuple(range(N*K,(N+1)*K))])
    o=mesh('D2 | Resonator_Outer',vs,fs,ivory,groups['Body'],True);bevel(o,.001,3)
    # Assign the integral inside surface dark wood; no independent resonator parts.
    o.data.materials.append(dark)
    for poly in o.data.polygons:
        if poly.index<N*K and 11<=poly.index%K<21:poly.material_index=1
    for sign in [-1,1]:tube('D2 | Opening_Lip',[(joined_x(x,rim(x)),sign*(depth(x)-.0055),rim(x)) for x in np.linspace(-.666,.666,121)],.002,ivory,groups['Body'],10)

def legs():
    for side in [-1,1]:
        parent=groups['End_Left' if side<0 else 'End_Right']
        for front in [-1,1]:
            # Two flowing boundary curves fill a structural web into the underside.
            upper=[(.659,.004),(.617,.123),(.460,.112),(.285,floor(.285)+.003)]
            lower=[(.659,.004),(.596,.067),(.448,.079),(.285,floor(.285)+.003)]
            for inset in [False,True]:
                vs=[];N=70
                for j in range(N+1):
                    t=j/N;u=bez(*upper,t);l=bez(*lower,t)
                    if inset:
                        a=l+.24*(u-l);b=l+.68*(u-l)
                    else:a=l;b=u
                    y=.028+.087*(1-(1-t)**3)
                    for mix,d in [(0,-1),(0,1),(.18,1),(.82,1),(1,1),(1,-1),(.82,-1),(.18,-1)]:
                        x,z=a+(b-a)*mix
                        thick=(.001 if inset else .0065)*(math.sin(math.pi*mix)*.25+.75)
                        yy=front*(y+d*thick+(.0064 if inset else 0))
                        # The upper edge seats into the shell instead of forming a capped bar.
                        vs.append((side*x,yy,max(.002,z)))
                K=8;fs=[tuple(reversed(range(K))),tuple(range(N*K,(N+1)*K))]
                fs += [(j*K+k,j*K+(k+1)%K,(j+1)*K+(k+1)%K,(j+1)*K+k) for j in range(N) for k in range(K)]
                o=mesh('D2 | '+('Support_Wood_' if inset else 'Support_')+str(side)+'_'+str(front),vs,fs,wood if inset else ivory,parent,True)
                if inset:uv(o,(0,2))
                else:bevel(o,.001,3)
        v=[(side*x,y,z) for z in [0,.003] for y in [-.033,.033] for x in [.644,.673]]
        bevel(mesh('D2 | Brass_Contact_'+str(side),v,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)],gold,parent),.0008,3)

def keys():
    result=[]
    for i in range(21):
        length=.360-.080*i/20;w=.052;x=(i-10)*.0555;vs=[];N=16
        for j in range(N+1):
            t=2*j/N-1;y=t*length/2;half=w/2*(1-.030*t*t);z=.009+.002*(1-t*t)
            vs.extend([(-half,y,-.009),(half,y,-.009),(half,y,z),(-half,y,z)])
        fs=[(3,2,1,0),(N*4,N*4+1,N*4+2,N*4+3)]+[(j*4+k,j*4+(k+1)%4,(j+1)*4+(k+1)%4,(j+1)*4+k) for j in range(N) for k in range(4)]
        o=mesh(f'D2 | Key_{i+1:02}',vs,fs,wood,groups['Keys']);o.location=(x,0,.176+.096*(x/.59)**2);o.rotation_euler.y=-math.atan(2*.096*x/.59**2);o['note_index']=i
        for sign in [-1,1]:
            c=tube('D2 temporary bore',[(-.035,sign*length*.30,.002),(.035,sign*length*.30,.002)],.0025,wood,None,12);c.location=o.location;c.rotation_euler=o.rotation_euler
            m=o.modifiers.new('Suspension bore','BOOLEAN');m.object=c;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(c,do_unlink=True)
        uv(o,(0,1),i*.073);bevel(o,.0023,4);next(m for m in o.modifiers if m.type=='BEVEL').use_clamp_overlap=False
        result.append((o,length))
    bpy.context.view_layer.update();parent=groups['Suspension'];h=.289;anchor=endx(h)-.008
    for sign in [-1,1]:
        pts=[(-anchor,sign*.042,h)]
        for o,length in result:
            for x in [-.026,.026]:pts.append(tuple(o.matrix_world@Vector((x,sign*length*.30,.002))))
        pts.append((anchor,sign*.042,h));tube('D2 | Rope_'+('Front' if sign<0 else 'Back'),pts,.0016,cord,parent,10)
        for o,length in result:
            for side in [-1,1]:
                y=sign*length*.30
                pts=[(side*.020,y-.002,.010),(side*.024,y,.0115),(side*.027,y+.001,.007),(side*.029,y,.002)]
                tube('D2 | Rope_Knot',[tuple(o.matrix_world@Vector(v)) for v in pts],.00115,cord,parent,8)
        for side in [-1,1]:
            x=side*anchor;y=sign*.042
            peg=tube('D2 | Suspension_Pin',[(x-side*.003,y,h),(x+side*.016,y,h)],.003,wood,parent,12);uv(peg)
            tube('D2 | End_Tie',[(x,y,h),(x+side*.005,y,h-.005),(x,y,h-.016),(x-side*.004,y,h-.011),(x,y,h)],.0016,cord,parent,8)

def setup():
    global scene,root,groups
    assert SCENE not in bpy.data.scenes
    OUT.mkdir(exist_ok=True)
    old=bpy.data.scenes['Modern Thai Ranat | reference study']
    scene=bpy.data.scenes.new(SCENE);bpy.context.window.scene=scene;base['scene']=scene
    scene.unit_settings.system=old.unit_settings.system;scene.unit_settings.scale_length=1
    root=empty('D2 | Ranat_Master');root['target_dimensions_mm']=[1400,360,350]
    for n in ['Body','End_Left','End_Right','Keys','Suspension']:groups[n]=empty('D2 | '+n,root)
    groups['Accessories_Mallets']=empty('D2 | Accessories_Mallets')
    materials();trough();ends();legs()
    # Preserve original hand-sized mallets, with their independent pivots.
    old_m=next(o for o in old.objects if o.type=='EMPTY' and o.name.split(' | ')[-1]=='Mallets')
    mapping={old_m:groups['Accessories_Mallets']}
    def clone(o):
        for c in o.children:
            n=c.copy();n.name='D2 | '+c.name.split(' | ')[-1];scene.collection.objects.link(n);n.parent=mapping[o];mapping[c]=n;clone(c)
    clone(old_m)
    # Copy camera and studio setup from the original for meaningful comparison.
    for o in old.objects:
        if o.type in ['CAMERA','LIGHT'] or 'Studio_Ground' in o.name:
            n=o.copy();n.data=o.data.copy();n.name='D2 | '+o.name.split(' | ')[-1];scene.collection.objects.link(n)
    scene.world=old.world.copy();scene.render.engine=old.render.engine
    scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
    scene.eevee.taa_render_samples=128;scene.render.image_settings.file_format='PNG'
    for n in ['Front','Side']:
        c=scene.objects['D2 | Camera_'+n];c.data.ortho_scale=1.6 if n=='Front' else .65
    scene.camera=scene.objects['D2 | Camera_Front_Isometric'];root['stage']='exterior'
    refine_shading()
    save('exterior_blockout.blend');render('blockout')

def finish():
    bind();assert root['stage']=='exterior';keys();root['stage']='detailed'
    for o in scene.objects:o.select_set(False)
    for o in [root,*root.children_recursive]:o.select_set(True)
    bpy.context.view_layer.objects.active=root;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    check();save();render('final')

def refine_shading():
    for o in root.children_recursive:
        if o.type!='MESH' or 'Key_' in o.name:continue
        for m in list(o.modifiers):
            if m.type=='WEIGHTED_NORMAL':o.modifiers.remove(m)
        if 'End_Frame' in o.name:
            if not any(m.type=='SUBSURF' for m in o.modifiers):
                m=o.modifiers.new('Sculpted continuous frame','SUBSURF');m.levels=2;m.render_levels=2
        if 'Support_' in o.name:
            for m in list(o.modifiers):
                if m.type=='BEVEL':o.modifiers.remove(m)
            if not any(m.type=='SUBSURF' for m in o.modifiers):
                m=o.modifiers.new('Flowing support surface','SUBSURF');m.levels=2;m.render_levels=2

def check():
    bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();coords=[]
    for o in root.children_recursive:
        if o.type!='MESH':continue
        ev=o.evaluated_get(dg);me=ev.to_mesh();coords.extend(ev.matrix_world@v.co for v in me.vertices);ev.to_mesh_clear()
    dims=[(max(v[i] for v in coords)-min(v[i] for v in coords))*1000 for i in range(3)]
    info={'dimensions_mm':dims,'target_mm':[1400,360,350],'keys':len(groups['Keys'].children),'all_scales_one':all(all(abs(v-1)<1e-6 for v in o.scale) for o in [root,*root.children_recursive]),'separate_mallet_assembly':True}
    root['measured_dimensions_mm']=dims;(OUT/'dimensions.json').write_text(json.dumps(info,indent=2));print(json.dumps(info))
    assert all(abs(v-t)<=5 for v,t in zip(dims,[1400,360,350])),dims

def save(name='modern_thai_ranat_design02.blend'):
    scene.camera=scene.objects['D2 | Camera_Front_Isometric']
    bpy.data.libraries.write(str(OUT/name),{scene},fake_user=True,compress=True)

def render(stage):
    folder=OUT/stage;folder.mkdir(exist_ok=True);queue=['Front_Isometric','Left_Isometric','Right_Isometric','Front','Side']
    def step():
        n=queue.pop(0);scene.camera=scene.objects['D2 | Camera_'+n];scene.render.filepath=str(folder/(n+'.png'));bpy.ops.render.render(write_still=True,scene=scene.name)
        return .3 if queue else None
    bpy.app.timers.register(step,first_interval=.3)
