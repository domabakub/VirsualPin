# Modern Ranat — reference matching pass 03

Authored Blender geometry, preserving the supplied 1400 × 360 × 350 mm design envelope. Actual evaluated instrument extent: **1400.993 × 360.000 × 348.905 mm**, within ±5 mm. All instrument object scales are one. Mallets are a separate assembly.

This pass follows the supplied ivory-frame / pale-timber reference:

- Inward-curving upper crowns, broader sculpted shoulders and an S-shaped transition into the foot.
- Independently drawn outer frame and inner wood contours. The ivory frame has a broad face with softened edges; the wood is a curved fitted panel.
- Wide crescent support webs with wood following their curves, replacing the narrow strip-like support of revision 02.
- Raised, smoothly curved trough underside and a thinner visible side wall, with its endpoints fitted to the inside of the end panels.
- Twenty-one individually named wooden bars now fill the trough more closely; two continuous cream suspension cords still pass through transverse bores.
- New packed 2048 px timber grain; neutral Cycles lighting, five verification views from one coherent scene.

The supplied sheet is a perspective concept reference, not a consistent multi-view CAD drawing. This is a visual reconstruction: no claim of exact pixel-level or dimensional identity to every depicted angle is made. In particular, the original brief's explicit ban on individual metallic resonators remains in effect; the interior is one dark hollow trough. No gold-ball row is included.

## Files

- `modern_thai_ranat_reference03.blend`: editable source scene and packed textures.
- `modern_thai_ranat_reference03.glb`: materials, texture, hierarchy, 21 keys and separate mallets.
- `modern_thai_ranat_reference03.fbx`: alternate exchange format with embedded textures.
- `cycles/`: final Front_Isometric, Left_Isometric, Right_Isometric, Front and Side renders.
- `compare.html`: local reference-and-render review sheet.
- `dimensions.json`: measured source geometry.
- `export-validation.json`: round-trip GLB/FBX import measurements.

Use `cycles/` for final renders. `blockout/` and `final/` are earlier inspection passes.

glTF validation: zero errors, warnings, infos or hints. Earlier model versions are preserved. The website was not changed.

Build source: `../reference_match_03.py`, with helpers in `../design_1400.py` and `../create_modern_ranat.py`. `finalize.py` performs the final rebuild/export/render from this saved scene. The graphical Blender process exited during an earlier render; work was restored from the saved source and final renders completed in a separate background process.
