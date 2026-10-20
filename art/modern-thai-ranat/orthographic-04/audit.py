"""Measure evaluated Blender geometry, and overlay its projections on the source."""
import bpy,json,math
import numpy as np
from pathlib import Path
from mathutils import Vector,kdtree
OUT=Path(__file__).resolve().parent
tr=json.loads((OUT/'reference-traces.json').read_text())
source_scene=bpy.data.scenes['Ranat | orthographic reconstruction 04'];bpy.context.window.scene=source_scene
root=source_scene.objects['O4 | Ranat_Master'];bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()

def evaluated(o):
    ev=o.evaluated_get(dg);me=ev.to_mesh()
    vs=np.array([ev.matrix_world@v.co for v in me.vertices]);es=np.array([tuple(e.vertices) for e in me.edges]);ev.to_mesh_clear()
    return vs,es

def section(vs,es,value,axis=2):
    p,q=vs[es[:,0]],vs[es[:,1]]
    ok=(np.minimum(p[:,axis],q[:,axis])<=value+1e-8)&(np.maximum(p[:,axis],q[:,axis])>=value-1e-8)&(np.abs(p[:,axis]-q[:,axis])>1e-10)
    p,q=p[ok],q[ok]
    t=(value-p[:,axis])/(q[:,axis]-p[:,axis]);return p+(q-p)*t[:,None]

frame=evaluated(source_scene.objects['O4 | End_Frame']);insert=evaluated(source_scene.objects['O4 | End_Wood_Insert']);body=evaluated(source_scene.objects['O4 | Resonator_Shell'])
def profile_values(vs,es,axis):
    result=[]
    for z in np.linspace(.001,.349,175):
        ps=section(vs,es,z)
        if len(ps):
            if axis==0:ps=ps[ps[:,0]>.4]
            if len(ps):result.append((z,float(np.min(ps[:,axis])),float(np.max(ps[:,axis]))))
    return np.array(result)
f=profile_values(*frame,0);s=profile_values(*frame,1);wood=profile_values(*insert,1)
frontpaths=[]
for idx in [1,2]:
    frontpaths.append([(tr['front']['centre_x_px']+x/tr['front']['mm_per_pixel_x']*1000,tr['front']['ground_y_px']-z/tr['front']['mm_per_pixel_z']*1000) for z,x in f[:,[0,idx]]])
frontpaths += [[(2*tr['front']['centre_x_px']-x,y) for x,y in path] for path in list(frontpaths)]
for which in ['top','bottom']:
    path=[]
    for x in np.linspace(-.635,.635,240):
        ps=section(*body,x,axis=0)
        if len(ps):
            z=float(np.max(ps[:,2]) if which=='top' else np.min(ps[:,2]));p=tr['front'];path.append((p['centre_x_px']+x*1000/p['mm_per_pixel_x'],p['ground_y_px']-z*1000/p['mm_per_pixel_z']))
    frontpaths.append(path)
sidepaths=[]
for data in [s,wood]:
    for idx in [1,2]:
        sidepaths.append([(tr['side']['centre_x_px']+y*1000/tr['side']['mm_per_pixel_y'],tr['side']['ground_y_px']-z*1000/tr['side']['mm_per_pixel_z']) for z,y in data[:,[0,idx]]])

# Errors are against digitized reference landmarks, not an asserted perfect CAD match.
checks={}
for view,name,data,idx in [('front','outer_end',f,2),('front','inner_end',f,1),('side','outer_end',s,2),('side','wood',wood,2)]:
    p=tr[view];sc=p['mm_per_pixel_x' if view=='front' else 'mm_per_pixel_y'];errs=[]
    for u,v in p[name]:
        z=(p['ground_y_px']-v)*p['mm_per_pixel_z']/1000
        if data[0,0]<=z<=data[-1,0]:
            actual=np.interp(z,data[:,0],data[:,idx]);target=(u-p['centre_x_px'])*sc/1000;errs.append(abs(actual-target)*1000)
    checks[view+'_'+name]={'max_mm':round(max(errs),3),'mean_mm':round(float(np.mean(errs)),3),'landmarks':len(errs)}
allvs=[];sym={}
for o in root.children_recursive:
    if o.type!='MESH':continue
    vs,es=evaluated(o);allvs.extend(vs)
    if any(m.type=='MIRROR' for m in o.modifiers):
        tree=kdtree.KDTree(len(vs))
        for i,v in enumerate(vs):tree.insert(v,i)
        tree.balance();worst=0
        for v in vs[::max(1,len(vs)//400)]:
            for axis in [a for a in [0,1] if any(m.type=='MIRROR' and m.use_axis[a] for m in o.modifiers)]:
                q=v.copy();q[axis]*=-1;worst=max(worst,tree.find(q)[2])
        sym[o.name]=round(worst*1000,6)
arr=np.array(allvs);dims=(arr.max(axis=0)-arr.min(axis=0))*1000
report={'source_views':['Front View','Side View'],'left_isometric_used':False,'dimensions_mm':dims.tolist(),
    'landmark_errors':checks,'mirrored_structure_error_mm':sym,
    'note':'Manual reference digitization. Reference X/Z and Y/Z axes calibrated separately to the labels; overlays show calibrated projections, not an unconstrained perspective image.'}
(OUT/'profile-audit.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))

# Render actual projected outlines above an unlit plane carrying the source image.
sc=bpy.data.scenes.new('O4 | Reference projection audit');bpy.context.window.scene=sc
im=bpy.data.images.load('C:/Users/Asus/AppData/Local/Temp/codex-clipboard-387faa7c-2d68-4f7a-b56e-e748eb480ecc.png',check_existing=True)
def emission(name,color=None):
    m=bpy.data.materials.new(name);n=m.node_tree.nodes;n.clear();e=n.new('ShaderNodeEmission');out=n.new('ShaderNodeOutputMaterial');m.node_tree.links.new(e.outputs[0],out.inputs['Surface'])
    if color:e.inputs['Color'].default_value=(*color,1)
    else:
        tex=n.new('ShaderNodeTexImage');tex.image=im;m.node_tree.links.new(tex.outputs['Color'],e.inputs['Color'])
    return m
picture=emission('O4 | audit reference');cyan=emission('O4 | evaluated silhouette',(.0,.55,.85))
d=bpy.data.cameras.new('O4 | audit camera');d.type='ORTHO';cam=bpy.data.objects.new(d.name,d);sc.collection.objects.link(cam);cam.location=(0,0,1000);sc.camera=cam
sc.render.engine='BLENDER_EEVEE';sc.eevee.taa_render_samples=8;sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG'
queue=[('front',(850,765,1315,940),frontpaths),('side',(1345,765,1505,940),sidepaths)]
def step():
    view,(x0,y0,x1,y1),paths=queue.pop(0);W=x1-x0;H=y1-y0;cx=(x0+x1)/2;cy=(y0+y1)/2;objects=[]
    me=bpy.data.meshes.new('audit reference plane');me.from_pydata([(-W/2,-H/2,0),(W/2,-H/2,0),(W/2,H/2,0),(-W/2,H/2,0)],[],[(0,1,2,3)]);me.materials.append(picture);uv=me.uv_layers.new()
    for i,p in enumerate([(x0/1536,1-y1/1024),(x1/1536,1-y1/1024),(x1/1536,1-y0/1024),(x0/1536,1-y0/1024)]):uv.data[i].uv=p
    o=bpy.data.objects.new('reference plane',me);sc.collection.objects.link(o);objects.append(o)
    for path in paths:
        if len(path)<2:continue
        c=bpy.data.curves.new('evaluated projection','CURVE');c.dimensions='3D';c.bevel_depth=.30;c.bevel_resolution=2
        sp=c.splines.new('POLY');sp.points.add(len(path)-1)
        for p,(x,y) in zip(sp.points,path):p.co=(x-cx,cy-y,1,1)
        o=bpy.data.objects.new('evaluated projection',c);sc.collection.objects.link(o);c.materials.append(cyan);objects.append(o)
    cam.data.ortho_scale=max(W,H);sc.render.resolution_x=W*3;sc.render.resolution_y=H*3;sc.render.filepath=str(OUT/('overlay_'+view+'.png'));bpy.ops.render.render(write_still=True,scene=sc.name)
    for o in objects:bpy.data.objects.remove(o,do_unlink=True)
    if queue:return .4
    bpy.context.window.scene=source_scene
    return None
bpy.app.timers.register(step,first_interval=.3)
