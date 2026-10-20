"""Graduate the accepted O4 bars low-to-high, preserving every other mesh."""
import bpy,ast,math,json,hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector
HERE=Path('S:/Hackaton/art/modern-thai-ranat');OUT=HERE/'pitched-05';OUT.mkdir(exist_ok=True)
old=bpy.data.scenes['Ranat | orthographic reconstruction 04']
assert 'Ranat | graduated bars 05' not in bpy.data.scenes
scene=bpy.data.scenes.new('Ranat | graduated bars 05');copies={}
for src in old.objects:
    o=src.copy();o.name=src.name.replace('O4 |','O5 |')
    if src.data:o.data=src.data.copy()
    scene.collection.objects.link(o);copies[src]=o
for src,o in copies.items():o.parent=copies.get(src.parent)
scene.world=old.world.copy();scene.unit_settings.system=old.unit_settings.system;scene.unit_settings.scale_length=1
scene.render.engine=old.render.engine;scene.view_settings.view_transform=old.view_settings.view_transform;scene.view_settings.exposure=.25
scene.render.image_settings.file_format='PNG';scene.render.resolution_percentage=100
bpy.context.window.scene=scene
root=scene.objects['O5 | Ranat_Master'];groups={n:scene.objects['O5 | '+n] for n in ['Keys','Suspension','Mallets']}
for group in ['Keys','Suspension']:
    for o in list(groups[group].children_recursive):bpy.data.objects.remove(o,do_unlink=True)
base={'__file__':str(HERE/'create_modern_ranat.py')};exec(compile((HERE/'create_modern_ranat.py').read_text(),base['__file__'],'exec'),base);base['scene']=scene
mesh,tube,bevel=base['mesh'],base['tube'],base['bevel']
wood,cord=[bpy.data.materials['O4 | '+n] for n in ['Wood','Cord']]
ns={'__file__':str(HERE/'orthographic_04.py')};exec(compile((HERE/'orthographic_04.py').read_text(),ns['__file__'],'exec'),ns)
source=(HERE/'orthographic-04/details.py').read_text();tree=ast.parse(source)
for item in tree.body:
    if isinstance(item,ast.FunctionDef) and item.name in ['key','key_z','crown']:
        code=ast.get_source_segment(source,item).replace('O4 |','O5 |').replace('length=.180+.180*(abs(x)/.6)**1.5','length=.360-.090*i/20')
        exec(compile(code,'graduated key generator','exec'),globals())
keys=[key(i) for i in range(21)];bpy.context.view_layer.update()
notes=['ซ','ล','ท','ด','ร','ม','ฟ'];manifest=[]
for i,(o,L) in enumerate(keys):
    o['pitch_rank']=i+1;o['thai_note']=notes[i%7];o['octaves_above_first_sol']=i//7;o['bar_length_mm']=round(L*1000,3)
    o['pitch_direction']='Low to high along +X; player sits at negative Y'
    manifest.append({'object':o.name,'pitch_rank':i+1,'thai_note':notes[i%7],'octaves_above_first_sol':i//7,'length_mm':round(L*1000,3),'x_mm':round(o.location.x*1000,3)})
for sign in [-1,1]:
    az=.275;ax=ns['b'](az)-.002;ay=sign*.065;points=[(-ax,ay,az)]
    for o,L in keys:
        for x in [-.02825,.02825]:points.append(tuple(o.matrix_world@Vector((x,sign*L*.30,crown(o.location.x,.6)+.003))))
    points.append((ax,ay,az))
    tube('O5 | Rope_'+('Front' if sign<0 else 'Back'),points,.0016,cord,groups['Suspension'],10)
    for i,(o,L) in enumerate(keys):
        for side in [-1,1]:
            y=sign*L*.30;p=[(side*.021,y-.002,.011),(side*.025,y,.012),(side*.029,y+.001,.008),(side*.030,y,.003)]
            p=[(x,y,z+crown(o.location.x,2*y/L)) for x,y,z in p]
            tube(f'O5 | Rope_Wrap_{i+1:02}',[tuple(o.matrix_world@Vector(v)) for v in p],.0011,cord,groups['Suspension'],7)
    for side in [-1,1]:
        x=side*ax;y=ay;z=az
        pin=tube('O5 | Suspension_Pin',[(x-side*.002,y,z),(x+side*.014,y,z)],.0028,wood,groups['Suspension'],12)
        uv=pin.data.uv_layers.new()
        for l in pin.data.loops:
            v=pin.data.vertices[l.vertex_index].co;uv.data[l.index].uv=(v.y/.28+.5,v.z/.8+.5)
        tube('O5 | Anchor_Tie',[(x,y,z),(x+side*.004,y,z-.007),(x,y,z-.016),(x-side*.004,y,z-.010),(x,y,z)],.0016,cord,groups['Suspension'],8)
# Verify every accepted exterior/body/accessory mesh is unchanged from O4.
unchanged=[]
for src,o in copies.items():
    if src.type!='MESH' or any(a==old.objects['O4 | '+n] for n in ['Keys','Suspension'] for a in [src.parent]):continue
    assert len(src.data.vertices)==len(o.data.vertices)
    assert all((a.co-b.co).length<1e-9 for a,b in zip(src.data.vertices,o.data.vertices)),src.name
    assert src.matrix_world==o.matrix_world,src.name
    unchanged.append(o.name)
assert all(manifest[i]['length_mm']>manifest[i+1]['length_mm'] for i in range(20))
root['body_symmetry']='Accepted O4 exterior remains symmetric; bars now graduate low-to-high'
root['design_note']='21 bars: low left / high right from player at -Y. Lengths 360 to 270 mm are visual design dimensions, not an acoustic tuning calculation. Sound samples still require calibration.'
root['note_order']='ซ ล ท ด ร ม ฟ ซ ล ท ด ร ม ฟ ซ ล ท ด ร ม ฟ'
(OUT/'note-map.json').write_text(json.dumps({'player_side':'negative Y','pitch_increases_along':'+X','frequency_hz_assigned':False,'keys':manifest},ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'geometry-check.json').write_text(json.dumps({'strictly_decreasing_lengths':True,'keys':21,'unchanged_meshes':unchanged,'length_endpoints_mm':[360,270]},indent=2))
camdata=bpy.data.cameras.new('O5 | Camera_Top');camdata.type='ORTHO';camdata.ortho_scale=1.52
cam=bpy.data.objects.new(camdata.name,camdata);scene.collection.objects.link(cam);cam.location=(0,0,3)
scene.camera=scene.objects['O5 | Camera_Front_Isometric'];scene.render.resolution_x=1600;scene.render.resolution_y=950
for o in scene.objects:o.select_set(False)
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.overlay.show_overlays=False;area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.region_3d.view_camera_zoom=18
bpy.data.libraries.write(str(OUT/'modern_thai_ranat_pitched05.blend'),{scene},fake_user=True,compress=True)
print(json.dumps({'scene':scene.name,'keys':len(keys),'first':manifest[0],'last':manifest[-1],'unchanged_meshes':len(unchanged)},ensure_ascii=False))
