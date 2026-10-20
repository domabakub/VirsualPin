# Modern Thai Ranat — reference model

Created and executed with Python/bpy in Blender 5.2.2 LTS, 2026-10-03.
Primary visual reference: the user's `reference.png`; detailed requirements: `brief.txt`.

## Deliverables

- `modern_thai_ranat.blend`: editable geometry, bevel/weighted-normal modifiers, packed wood texture, studio and six verification cameras. Contains only the new model scene.
- `modern_thai_ranat.glb`: optimized, self-contained runtime/interchange asset, with independent keys and mallets. Studio, lights and cameras excluded.
- `modern_thai_ranat.fbx`: model hierarchy with the wood texture embedded. Studio excluded.
- `final/Front_Isometric.png`, `Left_Isometric.png`, `Right_Isometric.png`: three views of the same model.
- `create_modern_ranat.py`: actual bpy modeling code used to build the asset.
- `verify_exports.py`, `geometry-validation.json`, `export-validation.json`: verification source and results.

## Construction

Instrument bounds: **1396.28 × 360.00 × 350.00 mm**, excluding the separately placed mallets; requested approximate size was 1400 × 360 × 350 mm. Origin of `Ranat_Master` is world (0, 0, 0), at ground level. Blender uses metres and Z-up; GLB uses Y-up.

The body is an open-top, continuous hollow resonator with a dark wood lining. Major end frames and supports are mirrored left/right. Both faces of each sculpted ivory leaf end contain a pale wood inset. Curved supports join the body and end structure. Brass is limited to small contact shoes and mallet rings.

There are 21 separate `Key_01`–`Key_21` meshes, with rounded edges and actual transverse bores. Two cream cords run through the key set, with visible entry wraps and end ties attached to wooden pins. Keys remain above the opening. There are no individual resonator balls, bowls or pipes.

Two separate `Mallet_L` and `Mallet_R` groups use head-centred origins, pale wood shafts and cream padded heads. They are staged on the ground in front for the renders and included in the exports.

## Iteration and checks

1. Built the hollow body, mirrored end frames and support blockout; created all six cameras.
2. Rendered three initial views to `blockout/` and compared to the reference.
3. Raised the low runner-like supports into integrated arches, added interior wood end insets, extended the trough into the end structures, and corrected support tips protruding into the cavity. Intermediate views are in `corrected/`.
4. Added keys, real bores, cords, end pins, material atlas and mallets.
5. Refined key bevels, pale wood contrast, darker cavity and end cord attachment locations; rendered the final three views.
6. Reimported both exports into temporary isolated scenes. Each retained 21 keys, both mallets, five assigned materials, the wood texture and the source dimensions.

glTF validator reports **0 errors, 0 warnings, 0 info notices**. Evaluated meshes of all 21 keys have **zero non-manifold edges**. GLB is 2,845,836 bytes; FBX is 2,340,636 bytes. Read-back details are in the JSON reports.

This is a 3D reconstruction from a concept sheet, with hidden construction inferred. The reference views are not calibrated CAD drawings, so visual correspondence is approximate rather than a claim of exact measured reconstruction. Acoustic tuning and manufacturing strength are not simulated.

## Reproduce in Blender

Use a fresh Blender file so the requested object names are available. In Blender's Python Console:

```python
import runpy
model = runpy.run_path('/absolute/path/to/create_modern_ranat.py')
model['build_blockout']()
model['render_views']('blockout')
# Inspect the three images before continuing.
model['correct_silhouette']()
model['add_details']()
model['render_views']('final')
model['save_asset']()
```

Render jobs are queued through Blender timers. Let the current render set finish before starting the next stage. Export only `Ranat_Master` and its descendants with modifiers evaluated; preserve key and mallet nodes during optimization. The accompanying PNG is also provided for tools that cannot read packed textures.

The web app's prior Pearl model has not been replaced by this deliverable; this new asset follows the requested `Key_01`/`Mallet_L` hierarchy rather than the app's earlier node names.
