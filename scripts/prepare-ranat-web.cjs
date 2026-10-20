// Adapt the approved Blender export to the web player's stable node contract.
// Geometry, materials, pivots and glTF's Y-up coordinates are preserved.
const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve('art/modern-thai-ranat/pitched-05/modern_thai_ranat_pitched05.glb');
const target = path.resolve('public/models/ranat-modern-v5.glb');
const input = fs.readFileSync(source);
if (input.readUInt32LE(0) !== 0x46546c67 || input.readUInt32LE(4) !== 2) throw Error('Expected glTF 2 GLB');
const jsonLength = input.readUInt32LE(12);
const document = JSON.parse(input.toString('utf8', 20, 20 + jsonLength));
const keys = document.nodes.filter(n => /^O5 \| Key_\d{2}$/.test(n.name)).sort((a, b) => a.extras.note_index - b.extras.note_index);
if (keys.length !== 21) throw Error(`Expected 21 keys, found ${keys.length}`);
keys.forEach((node, i) => {
  if (node.extras.note_index !== i || (i && node.extras.bar_length_mm >= keys[i - 1].extras.bar_length_mm)) throw Error('Invalid bar ordering');
  node.name = `bar_${String(i).padStart(2, '0')}`;
  // Pitch rank maps to the existing player's tuning, including saved recordings.
  node.extras.reference_thai_note = node.extras.thai_note;
  delete node.extras.thai_note;
});
for (const hand of ['L', 'R']) {
  const mallet = document.nodes.find(n => n.name === `O5 | Mallet_${hand}`);
  if (!mallet) throw Error(`Missing ${hand} mallet`);
  mallet.name = `mallet_${hand}`;
}
document.asset.extras = { ...document.asset.extras, source: 'modern_thai_ranat_pitched05', revision: 5 };
const content = Buffer.from(JSON.stringify(document));
const padded = Buffer.alloc(Math.ceil(content.length / 4) * 4, 0x20); content.copy(padded);
const tail = input.subarray(20 + jsonLength);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
header.writeUInt32LE(20 + padded.length + tail.length, 8);
header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, Buffer.concat([header, padded, tail]));
console.log(`Prepared ${target}: ${keys.length} playable bars, 2 mallets, ${fs.statSync(target).size} bytes`);
