# Ranat web model

The player loads `ranat-modern-v6.glb` (3.7 MB, ~225k triangles): the same model as
`ranat-modern-v5.glb` (9.0 MB, ~327k triangles) after `python scripts/optimize-ranat-web.py`.
The optimizer keeps every `bar_*`/`mallet_*` node, mesh, pivot and extra unchanged, simplifies
only dense decorative meshes (vertex clustering, 2.5 mm cells keyed by normal and UV), stores
normals/UVs with `KHR_mesh_quantization`, and re-encodes textures as 1024 px JPEG. A side-by-side
render showed <0.01% of pixels changing noticeably. Re-run it whenever v5 is regenerated.

`ranat-modern-v5.glb` is the approved ivory/wood, graduated 21-bar model from
`art/modern-thai-ranat/pitched-05/modern_thai_ranat_pitched05.glb`.

Run `node scripts/prepare-ranat-web.cjs` to regenerate the web adapter. It changes
node names and metadata only; geometry, materials, pivots and Y-up transforms
are preserved. The URL is versioned to avoid cached earlier model designs.

- `bar_00`–`bar_20`: low to high, left to right; length 360–270 mm.
- `mallet_L`, `mallet_R`: origins at the padded heads; handles extend toward +Z.
- Runtime sound/labels use the existing application's tuning and saved-take format.
  The source design's solfege is kept separately as `reference_thai_note`.
- Source dimensions: 1398.304 × 349.099 × 360 mm in glTF X/Y/Z axes.

The editable master stays in `art/`; this file is for the current web player.
`ranat-next.glb` is retained as the previous model and is no longer loaded.
