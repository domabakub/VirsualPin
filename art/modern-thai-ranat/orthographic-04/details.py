"""Individually playable bars, drilled suspension, restrained timber and mallets."""
from pathlib import Path
import bpy, math, numpy as np
from mathutils import Vector
P=Path('S:/Hackaton/art/modern-thai-ranat/orthographic_04.py')
ns={'__file__':str(P)};exec(compile(P.read_text(),str(P),'exec'),ns);ns['bind']()
scene=ns['scene'];root=ns['root'];groups=ns['groups']
mesh,tube,bevel=ns['mesh'],ns['tube'],ns['bevel']
wood,cord,ivory,gold=[ns[n] for n in ['wood','cord','ivory','gold']]
OUT=P.parent/'orthographic-04'

def refine_insert():
    o=scene.objects['O4 | End_Wood_Insert']
    for m in list(o.modifiers):
        if m.type=='BEVEL':o.modifiers.remove(m)
    for v in o.data.vertices:
        a,b=ns['a'](v.co.z),ns['b'](v.co.z)
        t=(a-v.co.x)/(a-b) if a-b>1e-8 else .5
        v.co.x=a*(1-(.16 if t<.5 else .84))+b*(.16 if t<.5 else .84)

def timber():
    N=2048;y,x=np.mgrid[0:N,0:N];u=x/N;v=y/N
    warp=u+.014*np.sin(v*7+u*4)+.002*np.sin(v*39+u*9)
    grain=.027*np.sin(warp*math.tau*23)+.017*np.sin(warp*math.tau*61)+.009*np.sin(warp*math.tau*191)
    pores=.012*np.maximum(0,np.sin(warp*math.tau*367+v*6))**12
    tone=1+grain+.016*np.sin(warp*29)-pores
    rgba=np.ones((N,N,4),dtype=np.float32)
    for k,c in enumerate([.65,.46,.31]):rgba[:,:,k]=c*tone
    im=bpy.data.images.new('O4 | restrained natural timber',width=N,height=N)
    im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(OUT/'timber.png');im.file_format='PNG';im.save();im.pack()
    next(n for n in wood.node_tree.nodes if n.type=='TEX_IMAGE').image=im
    p=next(n for n in wood.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Roughness'].default_value=.55;p.inputs['Specular IOR Level'].default_value=.22

def key_z(x):return .155+.095*(x/.63)**2

def crown(x,t):return (.010+.010*(x/.6)**2)*(1-t*t)-.010*(x/.6)**2*t*t

def key(i):
    x=(i-10)*.060;length=.180+.180*(abs(x)/.6)**1.5;width=.0565;N=32;vs=[]
    for j in range(N+1):
        y=-length/2+length*j/N;t=2*j/N-1;hw=width/2
        z=crown(x,t)
        vs.extend([(-hw,y,z-.008),(hw,y,z-.008),(hw,y,z+.010+.001*(1-t*t)),(-hw,y,z+.010+.001*(1-t*t))])
    fs=[(3,2,1,0),(4*N,4*N+1,4*N+2,4*N+3)]+[(4*j+k,4*j+(k+1)%4,4*(j+1)+(k+1)%4,4*(j+1)+k) for j in range(N) for k in range(4)]
    o=mesh(f'O4 | Key_{i+1:02}',vs,fs,wood,groups['Keys'],True);o.location=(x,0,key_z(x));o.rotation_euler.y=-math.atan(2*.095*x/.63**2)
    o['note_index']=i;o['interaction']='Rotate this individual bar about its local X axis; origin at centre'
    for sign in [-1,1]:
        z=crown(x,.6)+.003
        cutter=tube('O4 | temporary drill',[(-.04,sign*length*.30,z),(.04,sign*length*.30,z)],.0023,wood,groups['Keys'],12)
        cutter.location=o.location;cutter.rotation_euler=o.rotation_euler
        m=o.modifiers.new('Real rope bore','BOOLEAN');m.operation='DIFFERENCE';m.object=cutter
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
        bpy.data.objects.remove(cutter,do_unlink=True)
    layer=o.data.uv_layers.new(name='Grain along bar')
    for l in o.data.loops:
        v=o.data.vertices[l.vertex_index].co;layer.data[l.index].uv=(v.x/.14+i*.037,v.y/.42+.5)
    bevel(o,.0023,4)
    next(m for m in o.modifiers if m.type=='BEVEL').use_clamp_overlap=False
    return o,length

def details():
    assert not groups['Keys'].children,'Details already exist'
    refine_insert();timber();keys=[key(i) for i in range(21)];bpy.context.view_layer.update()
    for sign in [-1,1]:
        anchor_z=.275;anchor_x=ns['b'](anchor_z)-.002;anchor_y=sign*.065
        points=[(-anchor_x,anchor_y,anchor_z)]
        for o,L in keys:
            for x in [-.02825,.02825]:points.append(tuple(o.matrix_world@Vector((x,sign*L*.30,crown(o.location.x,.6)+.003))))
        points.append((anchor_x,anchor_y,anchor_z))
        tube('O4 | Rope_'+('Front' if sign<0 else 'Back'),points,.0016,cord,groups['Suspension'],10)
        for i,(o,L) in enumerate(keys):
            for side in [-1,1]:
                y=sign*L*.30
                p=[(side*.021,y-.002,.011),(side*.025,y,.012),(side*.029,y+.001,.008),(side*.030,y,.003)]
                p=[(xx,yy,zz+crown(o.location.x,2*yy/L)) for xx,yy,zz in p]
                tube(f'O4 | Rope_Wrap_{i+1:02}',[tuple(o.matrix_world@Vector(v)) for v in p],.0011,cord,groups['Suspension'],7)
        for side in [-1,1]:
            x=side*anchor_x;y=anchor_y;z=anchor_z
            pin=tube('O4 | Suspension_Pin',[(x-side*.002,y,z),(x+side*.014,y,z)],.0028,wood,groups['Suspension'],12);ns['uv'](pin)
            tube('O4 | Anchor_Tie',[(x,y,z),(x+side*.004,y,z-.007),(x,y,z-.016),(x-side*.004,y,z-.010),(x,y,z)],.0016,cord,groups['Suspension'],8)
    # A shadowed inner cavity behind the row, with individual cup resonators.
    dark=ns['dark'];vs=[];N=100
    for x in np.linspace(-.627,.627,N+1):
        lo=ns['floor'](x)+.014;hi=key_z(x)-.012
        vs.extend([(x,y,z) for y,z in [(-.012,lo),(.012,lo),(.012,hi),(-.012,hi)]])
    fs=[(3,2,1,0),(4*N,4*N+1,4*N+2,4*N+3)]+[(4*j+k,4*j+(k+1)%4,4*(j+1)+(k+1)%4,4*(j+1)+k) for j in range(N) for k in range(4)]
    mesh('O4 | Inner_Shadow_Liner',vs,fs,dark,groups['Body'],True)
    for i,(o,L) in enumerate(keys):
        x=o.location.x;z=key_z(x);vs=[];N=24
        for h,r in [(-.047,.008),(-.041,.012),(-.030,.014),(-.022,.011),(-.012,.018)]:
            vs.extend((x+r*math.cos(t),-.050+r*math.sin(t),z+h) for t in np.linspace(0,math.tau,N,endpoint=False))
        fs=[tuple(reversed(range(N))),tuple(range(4*N,5*N))]+[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k) for j in range(4) for k in range(N)]
        obj=mesh(f'O4 | Cup_Resonator_{i+1:02}',vs,fs,wood,groups['Body'],True)
        ns['uv'](obj,(0,2))
        ns['mirror'](obj,(False,True,False))
    old=bpy.data.scenes['Ranat | reference match 03'];origin=old.objects['D3 | Accessories_Mallets'];copies={origin:groups['Mallets']}
    for src in origin.children_recursive:
        o=src.copy();o.name=src.name.replace('D3 |','O4 |')
        if src.data:o.data=src.data.copy()
        scene.collection.objects.link(o);copies[src]=o
        if o.type=='MESH':
            for j,m in enumerate(o.data.materials):
                replacement=bpy.data.materials.get(m.name.replace('D3 |','O4 |'))
                if replacement:o.data.materials[j]=replacement
    for src,o in copies.items():
        if src!=origin:o.parent=copies[src.parent]
    # Keep accessories separate from the instrument's calibrated bounding box.
    for o in groups['Mallets'].children_recursive:o.hide_render=True
    root['stage']='detailed';root['body_symmetry']='Both X and Y; bar contours derived from symmetric front/side concept'
    root['design_note']='Visual concept reconstruction; bar crown/length is reference-driven, not an acoustically tuned production specification'
    ns['save']();ns['render']('final')

details()
