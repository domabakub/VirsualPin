"""Read back both exports in isolated temporary scenes and record checks."""
import bpy,json
from pathlib import Path
from mathutils import Vector
OUT=Path('S:/Hackaton/art/modern-thai-ranat')
original=bpy.context.window.scene
report={}
for extension in ['glb','fbx']:
    temp=bpy.data.scenes.new('Temporary export verification '+extension)
    bpy.context.window.scene=temp
    if extension=='glb':bpy.ops.import_scene.gltf(filepath=str(OUT/f'modern_thai_ranat.{extension}'))
    else:bpy.ops.import_scene.fbx(filepath=str(OUT/f'modern_thai_ranat.{extension}'))
    meshes=[o for o in temp.objects if o.type=='MESH']
    keys=[o for o in meshes if o.name.startswith('Key_')]
    mats={m for o in meshes for m in o.data.materials if m}
    textured=[m for m in mats if any(n.type=='TEX_IMAGE' and n.image for n in m.node_tree.nodes)]
    def is_mallet(o):
        while o:
            if o.name.startswith('Mallets'):return True
            o=o.parent
        return False
    coords=[o.matrix_world@Vector(c) for o in meshes if not is_mallet(o) for c in o.bound_box]
    dimensions=[round((max(v[i] for v in coords)-min(v[i] for v in coords))*1000,2) for i in range(3)]
    # Blender imports both formats into Z-up, in metres.
    assert len(keys)==21,(extension,len(keys))
    assert any(o.name.startswith('Mallet_L') for o in temp.objects)
    assert any(o.name.startswith('Mallet_R') for o in temp.objects)
    assert len(textured)>0,'Missing wood texture after import'
    assert abs(dimensions[0]-1396.28)<2 and abs(dimensions[1]-360)<2 and abs(dimensions[2]-350)<2,dimensions
    report[extension]={'mesh_count':len(meshes),'keys':len(keys),'materials':len(mats),
                       'textured_materials':len(textured),'instrument_dimensions_mm':dimensions,
                       'bytes':(OUT/f'modern_thai_ranat.{extension}').stat().st_size,'import_pass':True}
    bpy.context.window.scene=original
    # Only remove the objects created by this import, never the authored scene.
    for o in list(temp.objects):bpy.data.objects.remove(o,do_unlink=True)
    bpy.data.scenes.remove(temp)
with bpy.data.libraries.load(str(OUT/'modern_thai_ranat.blend'),link=False) as (source,target):
    report['blend']={'scenes':list(source.scenes),'contains_only_current_scene':len(source.scenes)==1}
(OUT/'export-validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
