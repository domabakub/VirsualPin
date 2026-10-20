"""Reference matching pass: sculptural end shells and integrated crescent feet."""
from pathlib import Path
_source=Path('S:/Hackaton/art/modern-thai-ranat/design_1400.py').read_text()
_source=_source.replace("'design-1400'","'reference-match-03'").replace('D2 |','D3 |').replace('D2 temporary','D3 temporary').replace('1400 exterior design 02','reference match 03').replace('design02','reference03')
exec(compile(_source,'reference03_base','exec'),globals())
# The reference key bed fills the trough nearly to the end shells.
_key_source=_source.split('def keys():',1)[1].split('\ndef setup():',1)[0]
_key_source=_key_source.replace('w=.052','w=.057').replace('*.0555','*.060').replace('.096','.076')
exec(compile('def keys():'+_key_source,'reference03_keys','exec'),globals())

def endx(z):
    ts=[0,.050,.115,.19,.245,.300,.35]
    vs=[.660,.632,.645,.674,.668,.636,.610]
    i=min(5,max(0,next((k-1 for k,t in enumerate(ts) if t>z),5)))
    t=max(0,min(1,(z-ts[i])/(ts[i+1]-ts[i])))
    slopes=[]
    for j in range(7):
        a=max(0,j-1);b=min(6,j+1);s=(vs[b]-vs[a])/(ts[b]-ts[a])
        if 0<j<6 and (vs[j]-vs[j-1])*(vs[j+1]-vs[j])<=0:s=0
        slopes.append(s)
    d=ts[i+1]-ts[i]
    return .0113+(2*t**3-3*t*t+1)*vs[i]+(t**3-2*t*t+t)*d*slopes[i]+(-2*t**3+3*t*t)*vs[i+1]+(t**3-t*t)*d*slopes[i+1]

def contours():
    # Drawn crown/shoulder/waist/base curves, following the reference's end detail.
    outer_curves=[[(.026,.350),(.012,.322),(-.135,.246),(-.118,.180)],
      [(-.118,.180),(-.112,.112),(-.026,.064),(-.028,.003)],
      [(-.028,.003),(-.010,.001),(.019,.001),(.031,.003)],
      [(.031,.003),(.011,.073),(.099,.122),(.108,.186)],
      [(.108,.186),(.117,.250),(.057,.306),(.026,.350)]]
    inner_curves=[[(.023,.321),(-.001,.291),(-.110,.226),(-.096,.180)],
      [(-.096,.180),(-.087,.121),(-.012,.077),(-.006,.035)],
      [(-.006,.035),(.000,.033),(.004,.033),(.009,.035)],
      [(.009,.035),(.004,.089),(.070,.140),(.080,.187)],
      [(.080,.187),(.085,.242),(.040,.287),(.023,.321)]]
    def sample(curves):return np.array([bez(*c,t) for c in curves for t in np.linspace(0,1,36,endpoint=False)])
    return sample(outer_curves),sample(inner_curves)

def ends():
    outer,inner=contours();N=len(outer)
    # Thickness is a sculpted crown, broad on the ivory shoulder, fine at its edge.
    section=[(0,-.006),(.06,-.013),(.17,-.0155),(.83,-.0155),(1,-.007),
             (1,.007),(.83,.0155),(.17,.0155),(.06,.013),(0,.006)]
    for side in [-1,1]:
        p=groups['End_Left' if side<0 else 'End_Right'];vs=[]
        for t,dep in section:
            for a,b in zip(outer,inner):
                y,z=(1-t)*a+t*b;fade=.50+.50*math.sin(math.pi*z/.35)
                vs.append((side*(endx(z)+dep*fade),y,z))
        fs=[(k*N+j,k*N+(j+1)%N,((k+1)%len(section))*N+(j+1)%N,((k+1)%len(section))*N+j) for k in range(len(section)) for j in range(N)]
        frame=mesh('D3 | End_Frame_'+str(side),vs,fs,ivory,p,True)
        m=frame.modifiers.new('Continuous sculpted ivory','SUBSURF');m.levels=2;m.render_levels=2
        # The wooden panel forms a shallow curved lens seated behind the ivory lip.
        vs=[];R=20;c=np.mean(inner,axis=0)
        for f in [-1,1]:
            for r in np.linspace(.001,1.025,R):
                for q in inner:
                    y,z=c+(q-c)*r
                    vs.append((side*(endx(z)+f*(.006+.005*(1-r*r))),y,z))
        K=N*R;fs=[]
        for f in range(2):
            for r in range(R-1):
                for j in range(N):
                    a=f*K+r*N+j;b=f*K+r*N+(j+1)%N;fs.append((a,b,b+N,a+N))
            fs.append(tuple(f*K+j for j in range(N)))
        for j in range(N):a=(R-1)*N+j;b=(R-1)*N+(j+1)%N;fs.append((a,b,b+K,a+K))
        o=mesh('D3 | End_Wood_Insert_'+str(side),vs,fs,wood,p,True);uv(o,(1,2))

def floor(x):return .080+.078*(x/.65)**2
def rim(x):return .145+.091*(x/.62)**2
def depth(x):return .149-.062*(abs(x)/.672)**8

def legs():
    # One sculptural junction at each end splits into fore/aft arched ribs.
    for side in [-1,1]:
        p=groups['End_Left' if side<0 else 'End_Right']
        for front in [-1,1]:
            upper=[(.660,.003),(.606,.160),(.470,.160),(.327,floor(.327)+.011)]
            lower=[(.660,.003),(.607,.080),(.505,.077),(.327,floor(.327)+.011)]
            for inset in [False,True]:
                vs=[];N=80
                for j in range(N+1):
                    t=.018+.96*j/N if inset else j/N
                    a=bez(*lower,t);b=bez(*upper,t)
                    if inset:
                        a,b=a+.20*(b-a),a+.72*(b-a)
                    yy=.028+.112*(1-(1-t)**3)
                    # Elliptical edge roll, rather than flat strips or thick tubes.
                    for theta in np.linspace(0,math.tau,16,endpoint=False):
                        u=(1-math.cos(theta))*.5;x,z=a+(b-a)*u
                        d=math.sin(theta)*(.0014 if inset else .007)
                        vs.append((side*x,front*(yy+d+(.0068 if inset else 0)),max(.002,z)))
                K=16;fs=[tuple(reversed(range(K))),tuple(range(N*K,(N+1)*K))]
                fs += [(j*K+k,j*K+(k+1)%K,(j+1)*K+(k+1)%K,(j+1)*K+k) for j in range(N) for k in range(K)]
                o=mesh('D3 | '+('Support_Wood_' if inset else 'Support_')+f'{side}_{front}',vs,fs,wood if inset else ivory,p,True)
                if inset:
                    layer=o.data.uv_layers.new(name='Grain following support arch')
                    for loop in o.data.loops:
                        j,k=divmod(loop.vertex_index,16)
                        layer.data[loop.index].uv=((1-math.cos(k*math.tau/16))*.20+.2,j/N*.70)
        v=[(side*x,y,z) for z in [0,.003] for y in [-.035,.035] for x in [.643,.677]]
        bevel(mesh('D3 | Brass_Contact_'+str(side),v,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)],gold,p),.0008,3)

def tune_presentation():
    # Match the lower eye line and larger visible end surfaces in the reference.
    positions={'Front_Isometric':(1.3,-3.5,1.65),'Left_Isometric':(-2.6,-2.6,1.75),'Right_Isometric':(2.6,-2.6,1.75)}
    for name,pos in positions.items():
        o=scene.objects['D3 | Camera_'+name];o.location=pos
        o.rotation_euler=(Vector((0,0,.17))-o.location).to_track_quat('-Z','Y').to_euler();o.data.lens=85
    for name in ['Ivory','Wood']:
        m=bpy.data.materials['D3 | '+name];p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        p.inputs['Roughness'].default_value=.30 if name=='Ivory' else .42
    # More natural grain: long undulations with subtle pores, no regular striping.
    N=2048;y,x=np.mgrid[0:N,0:N];u=x/N;v=y/N
    warp=u+.028*np.sin(v*6+u*3)+.005*np.sin(v*27+u*11)
    grain=.075*np.sin(warp*math.tau*18)+.055*np.sin(warp*math.tau*43)+.022*np.sin(warp*math.tau*173)
    tone=1+grain+.045*np.sin(warp*29)+.025*np.sin(warp*73+v*3)
    rgba=np.ones((N,N,4),dtype=np.float32)
    for k,c in enumerate([.60,.417,.275]):rgba[:,:,k]=c*tone
    im=bpy.data.images.new('D3 | figured pale timber',width=N,height=N);im.pixels.foreach_set(rgba.ravel())
    im.filepath_raw=str(OUT/'pale_timber.png');im.file_format='PNG';im.save();im.pack()
    next(n for n in wood.node_tree.nodes if n.type=='TEX_IMAGE').image=im

def start():
    setup();tune_presentation();fair_surfaces()
    # setup's deferred render reads the revised camera settings when it runs.
    save('exterior_blockout.blend')

def fair_surfaces():
    for o in groups['Body'].children:
        if 'Resonator_Outer' in o.name:
            for m in list(o.modifiers):o.modifiers.remove(m)
            m=o.modifiers.new('Fair continuous resonator shell','SUBSURF');m.levels=2;m.render_levels=2
