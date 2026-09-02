import assert from "node:assert/strict";
import test from "node:test";
import { createQuickTake, formatTakeDuration, quickTakeToSong, readQuickTake } from "../src/lib/takes/types.ts";

test("quick take validation clamps unsafe note data", () => {
  const take = readQuickTake({
    version: 1,
    id: "take-1",
    name: "  ทดลอง  ",
    notes: [{ id: "n", string: 2, fret: 99, onsetMs: -5, durationMs: 0, velocity: 999, source: "camera", confidence: 2 }],
    durationMs: 0,
    createdAt: 1,
    updatedAt: 2,
  });
  assert.ok(take);
  assert.equal(take.name, "ทดลอง");
  assert.equal(take.notes[0].fret, 6);
  assert.equal(take.notes[0].onsetMs, 0);
  assert.equal(take.notes[0].durationMs, 80);
  assert.equal(take.notes[0].velocity, 127);
  assert.equal(take.notes[0].confidence, 1);
  assert.equal(take.durationMs, 80);
});

test("quick take becomes a sequence practice song", () => {
  const take = createQuickTake({
    id: "ABC-1",
    now: 1_700_000_000_000,
    durationMs: 1_200,
    bpm: 96,
    name: "ลายของฉัน",
    notes: [
      { id: "a", string: 0, fret: 0, onsetMs: 0, durationMs: 300, velocity: 96, source: "touch" },
      { id: "b", string: 1, fret: 2, onsetMs: 600, durationMs: 300, velocity: 96, source: "camera" },
    ],
  });
  const song = quickTakeToSong(take);
  assert.equal(song.slug, "take-abc-1");
  assert.equal(song.notes.length, 2);
  assert.equal(song.notes[1].fret, 2);
  assert.equal(song.bpm, 96);
  assert.equal(formatTakeDuration(61_000), "1:01");
});

test("quick take rejects empty recordings", () => {
  assert.throws(() => createQuickTake({ id: "empty", notes: [], durationMs: 0 }));
  assert.equal(readQuickTake({ version: 1, id: "empty", notes: [] }), null);
});
