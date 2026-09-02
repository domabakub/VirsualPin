import test from "node:test";
import assert from "node:assert/strict";
import { getPhinFrequency, getPhinNoteName } from "../src/lib/audio/phinTuning.ts";
import { advancePractice, emptyPracticeData, getPracticeAccuracy, parsePracticeData } from "../src/lib/practice.ts";
import { songs } from "../src/data/songs.ts";
import { readPractice, savePractice } from "../src/hooks/usePracticeData.ts";

test("open strings keep the established E4 / A3 / E3 tuning", () => {
  const expected = [["E4", 329.6275569], ["A3", 220], ["E3", 164.8137785]];
  expected.forEach(([name, frequency], string) => {
    assert.equal(getPhinNoteName(string, 0, true), name);
    assert.ok(Math.abs(getPhinFrequency(string, 0) - frequency) < 0.00001);
  });
});

test("all 21 finger positions have the expected pitch names", () => {
  const expected = [
    ["E4", "F4", "F♯4", "G4", "G♯4", "A4", "A♯4"],
    ["A3", "A♯3", "B3", "C4", "C♯4", "D4", "D♯4"],
    ["E3", "F3", "F♯3", "G3", "G♯3", "A3", "A♯3"],
  ];
  expected.forEach((names, string) => names.forEach((name, fret) => assert.equal(getPhinNoteName(string, fret, true), name)));
  assert.equal(getPhinFrequency(1, 12), 440);
});

test("every sample, including transformed samples, derives its label from its playable position", () => {
  for (const song of songs) {
    assert.ok(song.notes.length > 0);
    assert.equal("progress" in song, false, "progress must not live in song fixtures");
    for (const note of song.notes) {
      assert.ok(note.fret >= 0 && note.fret <= 6);
      assert.equal(note.label, getPhinNoteName(note.string, note.fret), `${song.slug}: string ${note.string}, fret ${note.fret}`);
    }
  }
});

test("incorrect plucks do not advance; completion cannot earn extra points", () => {
  const initial = { step: 0, mistakes: 0, total: 2, updatedAt: 1 };
  const wrong = advancePractice(initial, false, 2);
  assert.deepEqual(wrong, { step: 0, mistakes: 1, total: 2, updatedAt: 2 });
  const correct = advancePractice(wrong, true, 3);
  assert.equal(getPracticeAccuracy(correct.step, correct.mistakes), 50);
  const complete = advancePractice(correct, true, 4);
  assert.equal(complete.step * 100, 200);
  assert.strictEqual(advancePractice(complete, true, 5), complete);
  assert.equal(initial.step, 0);
  assert.equal(getPracticeAccuracy(0, 0), null);
});

test("stored progress and preferences survive serialization", () => {
  const data = emptyPracticeData();
  data.records["lao-duang-duen"] = { step: 4, mistakes: 2, total: 12, updatedAt: 1234 };
  data.preferences = { facing: "environment", volume: 0.25, shortcuts: true };
  assert.deepEqual(parsePracticeData(JSON.stringify(data)), data);
});

test("corrupt or unknown-version storage falls back safely", () => {
  for (const raw of [null, "not json", "null", "[]", '{"version":2}', '{"version":1,"records":null}']) {
    assert.deepEqual(parsePracticeData(raw), emptyPracticeData());
  }
});

test("bad records cannot create impossible scores and valid records remain readable", () => {
  const good = { step: 2, mistakes: 1, total: 12, updatedAt: 100 };
  const data = parsePracticeData(JSON.stringify({
    version: 1,
    records: { good, negative: { ...good, step: -1 }, excessive: { ...good, step: 13 }, fractional: { ...good, mistakes: 0.5 }, missing: {}, "__proto__": { ...good } },
    preferences: { facing: "unknown", volume: 10, shortcuts: "true" },
  }));
  assert.deepEqual(data.records, { good });
  assert.deepEqual(data.preferences, { facing: "user", volume: 1, shortcuts: false });
});

test("unavailable browser storage preserves this session and can recover on a later save", () => {
  const previousWindow = globalThis.window;
  const fakeWindow = new EventTarget();
  let persisted = null;
  let blocked = true;
  let changes = 0;
  fakeWindow.localStorage = {
    getItem() { if (blocked) throw new Error("Storage blocked"); return persisted; },
    setItem(key, value) { if (blocked) throw new Error("Quota exceeded"); persisted = value; },
  };
  fakeWindow.addEventListener("virtual-phin:practice-change", () => changes++);
  globalThis.window = fakeWindow;
  try {
    const record = { step: 3, mistakes: 1, total: 12, updatedAt: 1234 };
    savePractice("sample", record);
    assert.deepEqual(readPractice("sample", 12), record);
    assert.equal(readPractice("sample", 16), undefined, "changed exercises cannot resume an incompatible record");
    blocked = false;
    savePractice("sample", { ...record, step: 4 });
    assert.equal(parsePracticeData(persisted).records.sample.step, 4);
    assert.equal(changes, 2);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
