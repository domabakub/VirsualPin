import test from "node:test";
import assert from "node:assert/strict";
import { HandMalletController, DEFAULT_CALIBRATION, displayMalletPoses, previewMalletPoses } from "../src/instruments/ranat/handMallets.ts";
import { validateCalibration, mapCameraPoint } from "../src/instruments/ranat/camera.ts";
const config = { calibration: DEFAULT_CALIBRATION, start: 7, count: 8, mode: "direct", offset: 7, sensitivity: .5 };
const palm = (hand, v, x = .4, confidence = .95) => ({ hand, x, y: .22 + v * .56, confidence });

test("preview follows both hands before playing, including outside the strike area", () => {
  const poses = previewMalletPoses([palm("L", -.5, .05), palm("R", .8, .95)], 100, config);
  assert.deepEqual(poses.map(p => [p.hand, p.bar]), [["L", 7], ["R", 14]]);
  assert.ok(poses.every(p => !p.armed));
  assert.equal(previewMalletPoses([], 120, config).length, 0);
  assert.equal(previewMalletPoses([palm("L", .1, .4, .2)], 120, config).length, 0);
});

test("paired strokes work with both hands visible and keep the same owner", () => {
  const c = new HandMalletController(), cfg = { ...config, mode: "pair" };
  c.update([palm("R", .1)], 0, cfg);
  c.update([palm("L", .1), palm("R", .4)], 40, cfg);
  const frame = c.update([palm("L", .1), palm("R", .8)], 80, cfg);
  assert.equal(frame.commands.length, 1);
  assert.equal(frame.commands[0].hand, "R");
  assert.equal(displayMalletPoses(frame.poses, "pair", 7).length, 2);
  assert.equal(c.update([palm("L", .8)], 120, cfg).commands.length, 0);
});

test("assisted hold accepts a second visible hand and releases when both disappear", () => {
  const c = new HandMalletController(), cfg = { ...config, mode: "kro" };
  c.update([palm("L", .1), palm("R", .1, .7)], 0, cfg);
  c.update([palm("L", .7), palm("R", .2, .7)], 40, cfg);
  c.update([palm("L", .7), palm("R", .2, .7)], 140, cfg);
  assert.equal(c.update([palm("L", .7), palm("R", .2, .7)], 240, cfg).commands[0].kind, "hold");
  assert.deepEqual(c.update([], 280, cfg).commands, [{ kind: "release", owner: "camera-hold" }]);
});
test("two independent hands strike once, then must rise again", () => {
  const c = new HandMalletController();
  c.update([palm("L",.1),palm("R",.1,.7)],0,config);
  c.update([palm("L",.4),palm("R",.4,.7)],40,config);
  const frame = c.update([palm("L",.8),palm("R",.8,.7)],80,config);
  assert.equal(frame.commands.length,2);
  assert.deepEqual(frame.commands.map(c=>c.hand),["L","R"]);
  assert.equal(c.update([palm("L",.9),palm("R",.9,.7)],120,config).commands.length,0);
  c.update([palm("L",.1)],200,config);
  assert.equal(c.update([palm("L",.7)],240,config).commands.length,1);
});
test("missing, low-confidence, ambiguous, stale and jumping hands never create phantom hits", () => {
  for (const interruption of [[],[palm("L",.4,.4,.2)],[palm("L",.4),palm("L",.4,.7)]]) {
    const c = new HandMalletController(); c.update([palm("L",.1)],0,config);
    c.update(interruption,40,config);
    assert.equal(c.update([palm("L",.8)],80,config).commands.length,0);
  }
  const c = new HandMalletController(); c.update([palm("L",.1)],0,config);
  assert.equal(c.update([palm("L",.8)],500,config).commands.length,0);
  c.update([palm("L",.1,.15)],540,config);
  assert.equal(c.update([palm("L",.8,.85)],580,config).commands.length,0);
});
test("aim hysteresis prevents a boundary jitter from switching the target", () => {
  const c = new HandMalletController();
  const boundary = .12 + .76 * 3 / 8;
  assert.equal(c.update([palm("L",.2,boundary-.001)],0,config).poses[0].bar,9);
  assert.equal(c.update([palm("L",.2,boundary+.001)],40,config).poses[0].bar,9);
  assert.equal(c.update([palm("L",.2,boundary+.025)],80,config).poses[0].bar,10);
});
test("assisted hold releases on hand loss and does not resume while already lowered", () => {
  const c = new HandMalletController(), cfg = {...config,mode:"kro"};
  c.update([palm("L",.1)],0,cfg); c.update([palm("L",.7)],40,cfg);
  c.update([palm("L",.7)],140,cfg);
  assert.equal(c.update([palm("L",.7)],240,cfg).commands[0].kind,"hold");
  assert.deepEqual(c.update([],280,cfg).commands,[{kind:"release",owner:"camera-hold"}]);
  assert.equal(c.update([palm("L",.8)],320,cfg).commands.length,0);
});
test("changing range disarms an in-flight stroke; slow lowering and side movement stay silent", () => {
  const c = new HandMalletController(); c.update([palm("L",.1)],0,config);
  assert.equal(c.update([palm("L",.7)],40,{...config,start:0}).commands.length,0);
  const d = new HandMalletController(); d.update([palm("L",.1)],0,config);
  for(let i=1;i<=15;i++) assert.equal(d.update([palm("L",.1+i*.04)],i*100,config).commands.length,0);
});
test("calibration rejects inverted strokes and invalid ranges", () => {
  assert.equal(validateCalibration({...DEFAULT_CALIBRATION,raised:.8,lowered:.2}),false);
  assert.equal(mapCameraPoint({x:.5,y:.5},DEFAULT_CALIBRATION,20,8),null);
});
test("one physical hand drives both virtual mallets in assisted modes", () => {
  const pose={hand:"R",bar:7,u:.5,v:.4,armed:true,stamp:10};
  assert.deepEqual(displayMalletPoses([pose],"kro",7).map(p=>[p.hand,p.bar]),[["L",7],["R",14]]);
  assert.deepEqual(displayMalletPoses([pose],"roll",7).map(p=>p.bar),[7,7]);
  assert.deepEqual(displayMalletPoses([],"pair",7),[]);
});
