import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LAYOUT, HUD_IDS, hudRect, mapToPluckZone, parseLayout, stringPositions, pluckStringPositions } from "../src/lib/ar-layout.ts";
import { detectPluck, detectString } from "../src/lib/hand-tracking/virtualPhinInteraction.ts";

test("corrupt, unsupported, and partial saves recover with bounded values", () => {
  for (const raw of [null, "{broken", "null", '{"version":99,"items":{}}']) assert.deepEqual(parseLayout(raw), DEFAULT_LAYOUT);
  const layout = parseLayout(JSON.stringify({ version: 1, items: { left: { x: 900, y: -2, scale: 0, opacity: "bad", visible: false }, strings: null } }));
  assert.deepEqual(layout.left, { x: 1, y: 0, scale: 0.75, opacity: 1, visible: false });
  assert.deepEqual(layout.strings, DEFAULT_LAYOUT.strings);
  assert.deepEqual(parseLayout(JSON.stringify({ version: 1, items: DEFAULT_LAYOUT })), DEFAULT_LAYOUT);
});

test("existing saves migrate without losing positions; invalid string settings recover safely", () => {
  const oldStrings = { x: 0.2, y: 0.3, scale: 1.2, opacity: 0.7, visible: false };
  const migrated = parseLayout(JSON.stringify({ version: 1, items: { strings: oldStrings } }));
  assert.deepEqual(migrated.strings, { ...oldStrings, spacing: 1, order: [2, 1, 0] });
  for (const order of [[0, 0, 1], [0, 1], [0, 1, 9], ["0", 1, 2], null, {}]) {
    const saved = parseLayout(JSON.stringify({ version: 1, items: { strings: { spacing: -20, order } } }));
    assert.deepEqual(saved.strings.order, [2, 1, 0]);
    assert.equal(saved.strings.spacing, 0.6);
  }
  const layout = structuredClone(DEFAULT_LAYOUT);
  layout.strings.spacing = 1.2;
  layout.strings.order = [1, 0, 2];
  assert.deepEqual(parseLayout(JSON.stringify({ version: 1, items: layout })), layout);
});

test("every order and spacing selects and plucks the displayed string in both directions", () => {
  const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const order of orders) for (const spacing of [0.6, 1, 1.2]) {
    const settings = { order, spacing };
    const positions = stringPositions(settings);
    const stringY = pluckStringPositions(settings);
    const rect = { x: 0.35, y: 0.15, width: 0.3, height: 0.6 };
    assert.ok(positions.every(y => y > 0 && y < 1));
    assert.ok(positions[order[0]] < positions[order[1]] && positions[order[1]] < positions[order[2]]);
    for (const string of order) {
      const visualPoint = { x: rect.x + rect.width / 2, y: rect.y + positions[string] * rect.height };
      const point = mapToPluckZone(visualPoint, rect);
      assert.equal(detectString(point, null, stringY), string);
      // Tightly spaced strings must release the previously focused neighbour.
      for (const previousString of order) assert.equal(detectString(point, previousString, stringY), string);
      for (const direction of [-1, 1]) assert.equal(detectPluck({
        previous: { ...point, y: point.y - 0.008 * direction },
        current: { ...point, y: point.y + 0.008 * direction },
        elapsedMs: 30, now: 1000, lastPluckAt: 0, stringY,
      }), string);
    }
    assert.equal(detectPluck({ previous: { x: 0.7, y: stringY[0] - 0.01 }, current: { x: 0.7, y: stringY[0] + 0.01 }, elapsedMs: 30, now: 1000, lastPluckAt: 990, stringY }), null);
  }
});

test("all components stay inside mobile, desktop, and rotated surfaces at every supported scale", () => {
  for (const [width, height] of [[264, 420], [800, 500], [1100, 300]]) {
    for (const id of HUD_IDS) for (const scale of [0.75, 1, 1.4]) for (const anchor of [0, 0.5, 1]) {
      const rect = hudRect(id, { ...DEFAULT_LAYOUT[id], x: anchor, y: anchor, scale }, width, height);
      assert.ok(rect.x >= 0 && rect.y >= 0);
      assert.ok(rect.x + rect.width <= width + 0.001);
      assert.ok(rect.y + rect.height <= height + 0.001);
    }
  }
});

test("moved and resized visual strings select and pluck the corresponding string", () => {
  for (const rect of [{ x: 0.1, y: 0.2, width: 0.4, height: 0.6 }, { x: 0.6, y: 0.1, width: 0.25, height: 0.4 }]) {
    for (const [string, fraction] of [[0, 5 / 6], [1, 0.5], [2, 1 / 6]]) {
      const visible = { x: rect.x + rect.width / 2, y: rect.y + fraction * rect.height };
      assert.equal(detectString(mapToPluckZone(visible, rect), null), string);
      assert.equal(detectPluck({
        previous: mapToPluckZone({ ...visible, y: visible.y - 0.01 }, rect),
        current: mapToPluckZone({ ...visible, y: visible.y + 0.01 }, rect),
        elapsedMs: 30, now: 1000, lastPluckAt: 0,
      }), string);
    }
    assert.equal(detectString(mapToPluckZone({ x: rect.x - 0.01, y: rect.y + rect.height / 2 }, rect), null), null);
  }
});
