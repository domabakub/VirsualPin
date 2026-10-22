import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { findMalletHead } from '../src/instruments/ranat/modelNodes.ts';

test('shipped GLB loads both collision heads and all 21 bars with runtime node names', async () => {
  const bytes = await readFile(new URL('../public/models/ranat-modern-v6.glb', import.meta.url));
  const loader = new GLTFLoader();
  // Node has no image decoder; keep actual geometry and node loading, skip only materials.
  loader.register(() => ({ name: 'test-materials', loadMaterial: () => Promise.resolve(new MeshStandardMaterial()) }));
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const scene = gltf.scene.clone(true);
  scene.updateMatrixWorld(true);
  for (const hand of ['L', 'R']) {
    const mallet = scene.getObjectByName(`mallet_${hand}`);
    assert.ok(mallet);
    const head = findMalletHead(mallet, hand);
    const box = new Box3().setFromObject(head);
    assert.equal(box.isEmpty(), false);
    assert.ok(Number.isFinite(box.min.y));
    assert.ok(box.max.y > box.min.y);
  }
  for (let i = 0; i < 21; i++) {
    assert.ok(scene.getObjectByName(`bar_${String(i).padStart(2, '0')}`));
  }
});
