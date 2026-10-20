import test from "node:test";
import assert from "node:assert/strict";
import { bars, resolvePair, patternNote, parseRanatTake } from "../src/instruments/ranat/model.ts";
import { CameraStrike, mapCameraPoint, validateCalibration } from "../src/instruments/ranat/camera.ts";
import { encodeWave } from "../src/instruments/ranat/export.ts";
import { RanatAudio } from "../src/instruments/ranat/audio.ts";

test("octaves resolve seven positions apart without wrapping or clamping", () => {
  assert.equal(bars.length, 21);
  for (let i = 0; i < 14; i++) { assert.deepEqual(resolvePair(i, 7), [i, i + 7]); assert.ok(Math.abs(bars[i+7].frequency / bars[i].frequency - 2) < .00001); }
  for (const i of [-1, 14, 20, 21, NaN, .5]) assert.equal(resolvePair(i, 7), null);
  assert.equal(resolvePair(0, 0), null);
});
test("kro alternates two targets while roll alternates hands on one target", () => {
  assert.deepEqual([0,1,2,3].map(i => patternNote(3,7,"kro",i)), [{bar:3,hand:"L"},{bar:10,hand:"R"},{bar:3,hand:"L"},{bar:10,hand:"R"}]);
  assert.equal(patternNote(20,7,"kro",0), null);
  assert.deepEqual(patternNote(20,7,"roll",1), {bar:20,hand:"R"});
});
test("calibration rejects too narrow a stroke and does not clamp out-of-frame hands", () => {
  const c = {left:.1,right:.9,raised:.2,lowered:.7};
  assert.ok(validateCalibration(c));
  assert.equal(validateCalibration({...c,lowered:.22}),false);
  assert.equal(mapCameraPoint({x:.09,y:.3},c,0),null);
  assert.equal(mapCameraPoint({x:.9,y:.7},c,0).bar,7);
  assert.equal(mapCameraPoint({x:.1,y:.7},c,7).bar,7);
});
test("strike requires a fresh raised hand and never fires twice while held", () => {
  const d = new CameraStrike();
  assert.equal(d.update(.8,0),false);
  assert.equal(d.update(.1,30),false);
  assert.equal(d.update(.5,60),false);
  assert.equal(d.update(.8,90),true);
  assert.equal(d.update(.9,120),false);
  d.update(.1,150); assert.equal(d.update(.8,500),false);
  d.reset(); assert.equal(d.update(.8,520),false);
});
test("take parser preserves assisted events and rejects corrupt pitches and timing", () => {
  const t = {version:1,instrumentId:"ranat",tuningId:"equal-seven-a3-v1",id:"one",name:"ทดสอบ",createdAt:1,durationMs:200,events:[{id:"e",bar:3,onsetMs:100,velocity:.7,hand:"L",source:"camera",assisted:true}]};
  assert.equal(parseRanatTake(t).events[0].assisted,true);
  assert.equal(parseRanatTake({...t,instrumentId:"phin"}),null);
  assert.equal(parseRanatTake({...t,events:[{...t.events[0],bar:21}]}),null);
  assert.equal(parseRanatTake({...t,durationMs:50}),null);
  assert.equal(parseRanatTake({...t,events:[{...t.events[0],onsetMs:Infinity}]}),null);
});
test("WAV export has a valid PCM header and clips samples without overflowing", () => {
  const wav = encodeWave(new Float32Array([-2,-.5,0,.5,2]),22050), view = new DataView(wav);
  assert.equal(new TextDecoder().decode(wav.slice(0,4)),"RIFF");
  assert.equal(new TextDecoder().decode(wav.slice(8,12)),"WAVE");
  assert.equal(view.getUint32(24,true),22050); assert.equal(view.getUint32(40,true),10);
  assert.equal(view.getInt16(44,true),-32768); assert.equal(view.getInt16(52,true),32767);
});
test("audio release cancels scheduled hits while retaining already sounding tails", async () => {
  const prior = globalThis.AudioContext;
  const sources = [];
  let closed = false;
  const parameter = () => ({value:0,setTargetAtTime(){}});
  globalThis.AudioContext = class {
    currentTime = 1; sampleRate = 1000; state = "running";
    resume() {return Promise.resolve();} close() {closed=true; return Promise.resolve();}
    createGain() {return {gain:parameter(),connect(){},disconnect(){}};}
    createDynamicsCompressor() {return {threshold:parameter(),ratio:parameter(),connect(){}};}
    createBuffer(_channels,size) {return {getChannelData:() => new Float32Array(size)};}
    createBufferSource() {const source = {stopped:false,connect(){},disconnect(){},start(at){this.at=at;},stop(){this.stopped=true;}}; sources.push(source); return source;}
  };
  try {
    const audio = new RanatAudio(); await audio.unlock();
    audio.strike(0,.7,1); audio.strike(7,.7,1.04);
    audio.cancelPending(); assert.equal(sources[0].stopped,false); assert.equal(sources[1].stopped,true);
    audio.dispose(); assert.equal(sources[0].stopped,true); assert.equal(closed,true);
  } finally {globalThis.AudioContext=prior;}
});
