# Ranat web model

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
