# Ranat — 1230 mm base revision

Built in Blender as separately re-authored geometry. No overall uniform or non-uniform mesh resize was used. The earlier concept files remain in the parent directory.

## Verified envelope

All evaluated mesh vertices under `Ranat_Master`: **1230.000 × 414.942 × 425.000 mm** (X length, Y depth, Z height). Target 1230 × 415 × 425 mm; tolerance ±5 mm. Origin is at floor centre. Blender units are metres. All authored instrument object scales are (1, 1, 1), with Apply Scale performed.

`Ranat_Master` is an assembly Empty, so measure its descendant geometry rather than the Empty's own Dimensions field. Two hand-sized mallets are in the separate `Accessories_Mallets` assembly, included in the exports but outside the instrument envelope. Studio, lights and cameras are omitted from GLB/FBX.

## Changes by system

| System | Earlier geometry (mm) | New geometry (mm) |
|---|---:|---:|
| Central resonator length | 1330 | 1160 |
| Body outside depth | 300 | 356 |
| Cavity inside width | 276 | 332 |
| Body wall thickness | 12 | 12 |
| Centre body floor height | 55 | 78 |
| Centre body rim height | 125 | 167 |
| Centre key origin height | 162 | 213 |
| Nominal centre underside-to-rim clearance | 29 | 37 |
| Key centre spacing | 55.5 | 46.5 |
| Key width | 52 | 44 |
| Key lengths, low to high end | 320–255 | 370–300 |
| Key base thickness | 16 | 18 |
| End piece height | 350 | 425 |
| End piece maximum depth | 360 | 415 |
| End frame core thickness | 14 | 14 |
| Brass foot contact depth | 56 | 98 |

The body keeps a continuous concave arc with new independently defined floor/rim profiles. End panels use a new cross section with broader depth and unchanged core thickness. Curved support paths and their attachment heights were rebuilt. Pale wood inserts have fixed physical border margins and a 200 × 800 mm texture mapping to avoid stretching grain. Twenty-one individual keys, bores, two suspension cords and end ties were rebuilt for the new span. Mallet geometry and size are unchanged.

The geometric cavity volume estimate is 30.26 litres; this is a mesh design estimate, not an acoustic tuning or manufacturing validation.

## Deliverables and inspection

- `modern_thai_ranat_1230.blend`: editable source, packed wood images, five verification cameras.
- `modern_thai_ranat_1230.glb`: embedded PBR textures and separate key/mallet objects.
- `modern_thai_ranat_1230.fbx`: geometry, hierarchy, embedded texture images.
- `1230_blockout.blend`: structure before keys and suspension.
- `blockout/` and `final/`: Front, Side, Front_Isometric, Left_Isometric and Right_Isometric PNGs.
- `blockout-dimensions.json`, `final-dimensions.json`: evaluated source measurements.
- `export-validation.json`: GLB and FBX reimport checks. Both retained 1230.000 × 414.942 × 425.000 mm, 21 keys, two mallets and decoded wood textures.
- glTF Validator: zero errors and zero warnings.

The website and its published model were not changed. This revision establishes the new proportional base for subsequent end-piece detailing.

## Rebuild

Open the earlier `../modern_thai_ranat.blend` in a separate Blender session. In Blender's Python Console load `../reproportion_1230.py` with `exec(compile(...), namespace)`, then call `namespace['build_structure']()`. Inspect the blockout before calling `namespace['finish']()`. `namespace['render_views']('final')` renders the five cameras. The script depends on helpers in `../create_modern_ranat.py`; keep both scripts together. Do not rebuild over an existing scene named `Modern Thai Ranat | 1230 base`; the script deliberately refuses that operation.
