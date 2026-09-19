import test from "node:test";
import assert from "node:assert/strict";
import {
  FRET_TRAVEL,
  LEFT_PINCH,
  detectFret,
  detectPinchedString,
} from "../src/lib/hand-tracking/virtualPhinInteraction.ts";

function handWithDistances(distances) {
  const landmarks = Array.from({ length: 21 }, () => ({ x: 0.8, y: 0.8, z: 0 }));
  landmarks[4] = { x: 0.4, y: 0.4, z: 0 };
  landmarks[0] = { x: 0.4, y: 0.68, z: 0 };
  landmarks[5] = { x: 0.3, y: 0.5, z: 0 };
  landmarks[9] = { x: 0.4, y: 0.48, z: 0 };
  landmarks[17] = { x: 0.5, y: 0.5, z: 0 };
  [8, 12, 16].forEach((tip, index) => {
    landmarks[tip] = { x: 0.4 + distances[index] * 0.2, y: 0.4, z: 0 };
  });
  return landmarks;
}

test("a calibrated fret zero reaches fret six with a short movement and clamps at the ends", () => {
  const origin = 0.15;
  const travel = FRET_TRAVEL.normal;
  assert.equal(detectFret({ x: origin, y: 0.5 }, 0, origin, travel), 0);
  assert.equal(detectFret({ x: origin + travel / 2, y: 0.5 }, 0, origin, travel), 3);
  assert.equal(detectFret({ x: origin + travel, y: 0.5 }, 3, origin, travel), 6);
  assert.equal(detectFret({ x: origin + travel + 0.05, y: 0.5 }, 6, origin, travel), 6);
  assert.equal(detectFret({ x: origin - 0.05, y: 0.5 }, 2, origin, travel), 0);
  assert.equal(detectFret({ x: origin + 0.1, y: 0.02 }, 2, origin, travel), null);
});

test("fret boundaries resist small camera jitter but still accept deliberate movement", () => {
  const width = FRET_TRAVEL.high / 7;
  const origin = 0.08;
  assert.equal(detectFret({ x: origin + width * 1.1, y: 0.5 }, 0, origin, FRET_TRAVEL.high), 0);
  assert.equal(detectFret({ x: origin + width * 1.3, y: 0.5 }, 0, origin, FRET_TRAVEL.high), 1);
});

test("left pinch recognizes each finger, keeps a locked finger, and rejects ambiguity", () => {
  for (let finger = 0; finger < 3; finger++) {
    const ratios = [1.2, 1.2, 1.2];
    ratios[finger] = LEFT_PINCH.activateRatio[finger] - 0.04;
    assert.equal(detectPinchedString(handWithDistances(ratios), null), finger);
    ratios[finger] = LEFT_PINCH.releaseRatio[finger] - 0.02;
    assert.equal(detectPinchedString(handWithDistances(ratios), finger), finger);
    ratios[finger] = LEFT_PINCH.releaseRatio[finger] + 0.03;
    assert.equal(detectPinchedString(handWithDistances(ratios), finger), null);
  }
  assert.equal(detectPinchedString(handWithDistances([0.4, 0.42, 1.2]), null), null);
});
