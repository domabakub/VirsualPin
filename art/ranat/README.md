# Ranat Next — Pearl edition (current)

Current source: `ranat-next.blend`. Runtime: `../../public/models/ranat-next.glb`.
Preview: `pearl-preview.png` (Blender studio render; web lighting differs).
Earlier green edition is backed up as `river-v2.blend` and `river-v2.glb`.

## Design revision — 2026-10-03

Pearl-white resonator, ash-grey keys and end cheeks, champagne-gold edges, burgundy cord, grip and pedestal accents. All geometry and textures remain authored for the project. The user's close-up reference informed the visible end suspension loops and pins.

Two continuous suspension cords now pass along brass eyelets on the 21 keys and terminate at four gold anchor pins with doubled end loops and binding knots. This replaces the v2 hidden under-key cord and isolated tie stripes. It is a visual interpretation, not a physical or historically measured construction.

Mallet heads are now soft discs 44 mm wide and 20 mm thick; shafts are 370 mm long with slender 7 mm diameter. Burgundy grips and gold bands add detail. Runtime pitch now keeps handles away from the camera sightline, avoiding the short-handle appearance. Strike clearance was adjusted for the thinner head.

## Source workflow

Run `build_ranat_v2.py` in a fresh Blender file, then `refine_pearl.py` once. The refinement requires asset_version 2 and advances to 3. The builder/refiner preserve existing scenes and back up earlier authored files. Run `render_pearl.py` for the separate studio preview.

Export only `ranat_root`, modifiers applied, then use glTF Transform `dedup`. Preserve `bar_00`–`bar_20` and `mallet_L` / `mallet_R`. Key animation uses asset rest positions; GLB has no baked note clips. Blender is Z-up; exported GLB is Y-up.

## Checks

- GLB: 1,779,756 bytes; 112 nodes; 66,148 rendered triangles; 8 materials; one 512 × 1024 embedded texture.
- glTF validation: no errors, warnings, info or hints.
- Lint and production build (including TypeScript) pass.
- Browser: pad click, keyboard A and direct 3D-key click recorded 3 notes; no browser errors in that check.
- Visually checked the web model and Blender render for continuous cords, end loops, new palette and mallet proportions.
- Real camera tracking and phone performance were not retested for this appearance revision.

## Earlier visual references

- User-supplied `reference.png`: boat-shaped wooden resonator and gold edging.
- [ระนาดเอก by suphanburicityofmusic52](https://sketchfab.com/3d-models/b1a9e6bda72149eb856f69d417d2ed79): curved silhouette and upturned ends, inspected via its public thumbnail. No third-party mesh or texture was imported.
