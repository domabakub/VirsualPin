import test from "node:test";
import assert from "node:assert/strict";
import { AR_STRIKE_V, DEFAULT_AR_PLACEMENT, parsePlacement, regionFromBars, serializePlacement, videoToView } from "../src/instruments/ranat/ar.ts";
import { HandMalletController } from "../src/instruments/ranat/handMallets.ts";
import { validateCalibration } from "../src/instruments/ranat/camera.ts";

// 21 evenly spaced bars across the view, tops on one line.
const row = (y = .7, left = .05, step = .045) => Array.from({ length: 21 }, (_, bar) => ({ bar, x: left + step * bar, y }));

test("placement saves round-trip and damaged or hostile data falls back per field", () => {
  const custom = { x: .4, y: .6, scale: .7, opacity: .5, swing: .25 };
  assert.deepEqual(parsePlacement(serializePlacement(custom)), custom);
  assert.deepEqual(parsePlacement(null), DEFAULT_AR_PLACEMENT);
  assert.deepEqual(parsePlacement("{oops"), DEFAULT_AR_PLACEMENT);
  assert.deepEqual(parsePlacement(JSON.stringify({ version: 2, placement: custom })), DEFAULT_AR_PLACEMENT);
  const odd = parsePlacement(JSON.stringify({ version: 1, placement: { x: 9, y: "low", scale: -1, opacity: null, swing: Infinity } }));
  assert.equal(odd.x, .9); assert.equal(odd.y, DEFAULT_AR_PLACEMENT.y); assert.equal(odd.scale, .45);
  assert.equal(odd.opacity, DEFAULT_AR_PLACEMENT.opacity); assert.equal(odd.swing, DEFAULT_AR_PLACEMENT.swing);
});

test("video points map through object-fit cover and the mirrored preview", () => {
  // 16:9 video in a 3:4 portrait view is cropped left/right.
  const video = { width: 1280, height: 720 }, view = { width: 300, height: 400 };
  assert.deepEqual(videoToView({ x: .5, y: .5 }, video, view, true), { x: .5, y: .5 });
  const right = videoToView({ x: .6, y: .25 }, video, view, false);
  assert.ok(Math.abs(right.x - (.5 + .1 * (1280 * 400 / 720) / 300)) < 1e-9);
  assert.equal(right.y, .25);
  const mirrored = videoToView({ x: .6, y: .25 }, video, view, true);
  assert.ok(Math.abs(mirrored.x - (1 - right.x)) < 1e-9);
  assert.deepEqual(videoToView({ x: .2, y: .3 }, { width: 0, height: 0 }, view, true), { x: .8, y: .3 });
});

test("the play region spans the eight drawn bars and strikes at their top line", () => {
  const region = regionFromBars(row(.7), 7, 8, .3);
  assert.ok(region.calibration);
  const c = region.calibration;
  assert.ok(validateCalibration(c));
  assert.ok(Math.abs(c.left - (.05 + .045 * 7 - .0225)) < 1e-9);
  assert.ok(Math.abs(c.right - (.05 + .045 * 14 + .0225)) < 1e-9);
  assert.ok(Math.abs(c.raised + (c.lowered - c.raised) * AR_STRIKE_V - .7) < 1e-9);
});

test("bars near the view edge shrink the swing or explain why AR cannot play", () => {
  const low = regionFromBars(row(.95), 7, 8, .4).calibration;
  assert.ok(low && low.lowered <= 1 && low.lowered - low.raised < .4);
  assert.equal(regionFromBars(row(.99), 7, 8, .4).reason, "no-room");
  assert.equal(regionFromBars(row(.7, -.2), 0, 8, .3).reason, "offscreen");
  assert.equal(regionFromBars(row(.7, .4, .01), 7, 8, .3).reason, "too-small");
  assert.equal(regionFromBars([], 7, 8, .3).reason, "offscreen");
});

test("a palm over a drawn bar aims at that bar and lowering to the bar line strikes it", () => {
  const { calibration } = regionFromBars(row(.7), 7, 8, .3);
  const config = { calibration, start: 7, count: 8, mode: "direct", offset: 7, sensitivity: .5 };
  const overBar10 = .05 + .045 * 10, span = calibration.lowered - calibration.raised;
  const at = v => calibration.raised + v * span;
  const c = new HandMalletController();
  assert.equal(c.update([{ hand: "R", x: overBar10, y: at(.1), confidence: .9 }], 0, config).poses[0].bar, 10);
  c.update([{ hand: "R", x: overBar10, y: at(.4), confidence: .9 }], 40, config);
  const hit = c.update([{ hand: "R", x: overBar10, y: .71, confidence: .9 }], 80, config);
  assert.deepEqual(hit.commands.map(cmd => [cmd.kind, cmd.bar]), [["strike", 10]]);
});
