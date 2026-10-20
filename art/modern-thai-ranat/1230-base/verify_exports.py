"""Import each deliverable into a temporary scene and measure all master geometry."""
import bpy,json
from pathlib import Path
OUT=Path(__file__).resolve().parent
original=bpy.context.window.scene
report={}
for extension in ['glb','fbx']:
    temp=bpy.data.scenes.new('Temporary 1230 verification '+extension)
    bpy.context.window.scene=temp
    try:
        if extension=='glb':bpy.ops.import_scene.gltf(filepath=str(OUT/f'modern_thai_ranat_1230.{extension}'))
        else:bpy.ops.import_scene.fbx(filepath=str(OUT/f'modern_thai_ranat_1230.{extension}'))
        bpy.context.view_layer.update()
        root=next(o for o in temp.objects if o.name.startswith('Ranat_Master'))
        meshes=[o for o in root.children_recursive if o.type=='MESH']
        coords=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
        dims=[round((max(v[i] for v in coords)-min(v[i] for v in coords))*1000,3) for i in range(3)]
        keys=[o for o in meshes if o.name.startswith('Key_')]
        mats={m for o in meshes for m in o.data.materials if m}
        # Image buffers are lazy after import: accessing pixels forces decoding.
        textured=[m for m in mats if any(n.type=='TEX_IMAGE' and n.image and len(n.image.pixels)>0 for n in m.node_tree.nodes)]
        assert all(abs(d-t)<5 for d,t in zip(dims,[1230,415,425])),dims
        assert len(keys)==21,len(keys)
        assert textured,'Missing wood texture'
        assert any(o.name.startswith('Mallet_L') for o in temp.objects)
        assert any(o.name.startswith('Mallet_R') for o in temp.objects)
        report[extension]={'dimensions_mm':dims,'instrument_meshes':len(meshes),'keys':len(keys),
            'wood_texture_loaded':bool(textured),'two_separate_mallets':True,'import_pass':True,
            'bytes':(OUT/f'modern_thai_ranat_1230.{extension}').stat().st_size}
    finally:
        bpy.context.window.scene=original
        for o in list(temp.objects):bpy.data.objects.remove(o,do_unlink=True)
        bpy.data.scenes.remove(temp)
with bpy.data.libraries.load(str(OUT/'modern_thai_ranat_1230.blend'),link=False) as (source,target):
    report['blend']={'scenes':list(source.scenes),'contains_only_current_scene':len(source.scenes)==1}
assert report['blend']['contains_only_current_scene']
(OUT/'export-validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
