# Modern Ranat — exterior design 02

The original 1400 × 360 × 350 mm concept envelope is restored. Evaluated instrument geometry measures **1400.001 × 360.000 × 349.472 mm**, with all object scales at 1. Mallets are separate accessories, not part of the instrument measurement.

This is a new exterior design iteration in real Blender geometry, following the supplied ivory-and-pale-wood brief. Earlier scenes and files are preserved. The website was not changed.

Visible changes from the previous 1400 concept:

- End pieces are substantially narrower in side view, with an elongated flame outline, sculpted S profile and outward crown.
- The ivory border is a real rounded ring around a fitted recessed wood insert, rather than a large solid board with wood laid over it.
- The trough has a curved underside and tapered end sections. Its end vertices follow the inner end-piece profile to avoid cutting across the wood inset.
- Supports are tapered curved structural webs seated beneath the body, replacing the thick rounded bar-like legs. Pale wood follows the web; muted brass remains on tiny contact shoes.
- Twenty-one separately named keys have softer edges, 360–280 mm lengths, transverse bores and cream suspension cords. No individual metallic resonators are present.
- Wood uses a new packed grain texture; two original hand-sized mallets remain separate.

Files:

- `modern_thai_ranat_design02.blend`: editable scene with six cameras and packed textures.
- `modern_thai_ranat_design02.glb`: model and mallets, embedded materials/textures, approximately 12 MB.
- `modern_thai_ranat_design02.fbx`: model and mallets with embedded textures.
- `final/`: three isometric renders plus front and side checks.
- `blockout/`, `corrected/`: intermediate exterior inspections.
- `dimensions.json`, `export-validation.json`: source measurements and GLB/FBX reimport checks.

GLB and FBX reimport retain 21 keys, both mallets, the wood texture and the measured envelope. glTF validation has zero errors and zero warnings; it notes the 1536 px texture as a non-power-of-two image. This is a design-review asset, not a mobile-optimized LOD or manufacturing/acoustic validation.

Generation script: `../design_1400.py`. It creates a separate scene and preserves the earlier one. In a session containing the original `Modern Thai Ranat | reference study` scene, load the script into a persistent namespace, call `setup()`, inspect the blockout, then call `finish()`. It deliberately refuses to overwrite its existing scene.
