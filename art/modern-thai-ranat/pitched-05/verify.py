import bpy,json
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent
FILE='modern_thai_ranat_pitched05'
original=bpy.data.scenes['Ranat | graduated bars 05'];bpy.context.window.scene=original
for other in list(bpy.data.scenes):
    if other!=original:bpy.data.scenes.remove(other)
original.camera=original.objects['O5 | Camera_Front_Isometric']
original.render.resolution_x=1600;original.render.resolution_y=950
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            sp=area.spaces.active;sp.overlay.show_overlays=False
            if 'MATERIAL' in [i.identifier for i in sp.shading.bl_rna.properties['type'].enum_items]:sp.shading.type='MATERIAL'
            sp.region_3d.view_perspective='CAMERA';sp.region_3d.view_camera_zoom=0
for o in original.objects:o.select_set(False)
bpy.context.view_layer.objects.active=None
assert all(max(abs(v-1) for v in o.scale)<1e-6 for o in original.objects if o.name.startswith('O5 |'))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(FILE+'.blend')),compress=True)
report={'blend':{'scene':original.name,'only_current_scene':len(bpy.data.scenes)==1,'unit_scales':True,'saved_as_mainfile':True}}
for extension in ['glb','fbx']:
    temp=bpy.data.scenes.new('Export verification '+extension);bpy.context.window.scene=temp
    try:
        path=OUT/(FILE+'.'+extension)
        if extension=='glb':bpy.ops.import_scene.gltf(filepath=str(path))
        else:bpy.ops.import_scene.fbx(filepath=str(path))
        bpy.context.view_layer.update();root=next(o for o in temp.objects if 'Ranat_Master' in o.name)
        meshes=[o for o in root.children_recursive if o.type=='MESH']
        coords=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
        dims=[round((max(v[i] for v in coords)-min(v[i] for v in coords))*1000,3) for i in range(3)]
        keys=[o for o in meshes if 'Key_' in o.name]
        mats={m for o in meshes for m in o.data.materials if m}
        textured=[m for m in mats if any(n.type=='TEX_IMAGE' and n.image and len(n.image.pixels)>0 for n in m.node_tree.nodes)]
        assert all(abs(d-t)<5 for d,t in zip(dims,[1400,360,350])),dims
        assert len(keys)==21,len(keys)
        keys.sort(key=lambda o:o.matrix_world.translation.x)
        lengths=[]
        for key in keys:
            ys=[(key.matrix_world@v.co).y for v in key.data.vertices]
            lengths.append((max(ys)-min(ys))*1000)
        assert all(lengths[i]>lengths[i+1] for i in range(20)),lengths
        assert abs(lengths[0]-360)<.1 and abs(lengths[-1]-270)<.1,lengths
        if extension=='glb':assert [o.get('pitch_rank') for o in keys]==list(range(1,22))
        assert textured,'Missing texture'
        assert any('Mallet_L' in o.name for o in temp.objects) and any('Mallet_R' in o.name for o in temp.objects)
        triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
        report[extension]={'dimensions_mm':dims,'mesh_count':len(meshes),'keys':21,'two_mallets':True,'texture_loaded':True,'triangles':triangles,'bytes':path.stat().st_size,'import_pass':True}
    finally:
        bpy.context.window.scene=original
        for o in list(temp.objects):bpy.data.objects.remove(o,do_unlink=True)
        bpy.data.scenes.remove(temp)
(OUT/'export-validation.json').write_text(json.dumps(report,indent=2))
print('DELIVERABLE_VERIFICATION',json.dumps(report),flush=True)

