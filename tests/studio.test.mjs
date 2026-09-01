import assert from "node:assert/strict";
import test from "node:test";
import { createStudioMidi, createStudioWav } from "../src/lib/studio/exporters.ts";
import { createStudioProject, quantizeBeat, quantizeNotes, readStudioProject } from "../src/lib/studio/types.ts";

test("studio quantize snaps to eighth and sixteenth notes", () => {
  assert.equal(quantizeBeat(1.24, "1/8"), 1);
  assert.equal(quantizeBeat(1.26, "1/8"), 1.5);
  assert.equal(quantizeBeat(1.13, "1/16"), 1.25);
  const notes = quantizeNotes([
    { id: "b", beat: 2.49, durationBeats: 0.5, string: 0, fret: 0, velocity: 96 },
    { id: "a", beat: 1.12, durationBeats: 0.5, string: 1, fret: 2, velocity: 96 },
  ], "1/16");
  assert.deepEqual(notes.map(note => note.beat), [1, 2.5]);
});

test("studio persistence rejects broken data and sanitizes notes", () => {
  assert.equal(readStudioProject("not-json"), null);
  const project = createStudioProject();
  project.notes = [{ id: "n", beat: 99, durationBeats: 0, string: 2, fret: 99, velocity: 999 }];
  const restored = readStudioProject(JSON.stringify(project));
  assert.ok(restored);
  assert.equal(restored.notes[0].fret, 6);
  assert.equal(restored.notes[0].velocity, 127);
  assert.ok(restored.notes[0].beat < 32);
});

test("studio exports recognizable MIDI and WAV files", async () => {
  const project = createStudioProject();
  project.notes = [{ id: "n", beat: 0, durationBeats: 0.5, string: 0, fret: 0, velocity: 96 }];
  project.drumEnabled = true;
  const midi = new Uint8Array(await createStudioMidi(project).arrayBuffer());
  const wav = new Uint8Array(await createStudioWav(project).arrayBuffer());
  assert.equal(new TextDecoder().decode(midi.slice(0, 4)), "MThd");
  assert.equal(new TextDecoder().decode(wav.slice(0, 4)), "RIFF");
  assert.ok(midi.length > 100);
  assert.ok(wav.length > 100_000);
});
