import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_APPEARANCE, HUD_PALETTES, HUD_STYLES, accentForeground, parseAppearance } from "../src/lib/ar-appearance.ts";
import { DEFAULT_LAYOUT, HUD_IDS, applyAppearanceToLayout, parseLayout } from "../src/lib/ar-layout.ts";

test("invalid stored appearance cannot inject CSS or produce unsupported styles", () => {
  for (const input of [null, [], "glass", {}]) assert.deepEqual(parseAppearance(input), DEFAULT_APPEARANCE);
  assert.deepEqual(parseAppearance({ accent: "url(https://example.com)", surface: "red;display:none", text: "#123", style: "unknown", radius: Infinity, weight: NaN }), DEFAULT_APPEARANCE);
  assert.deepEqual(parseAppearance({ accent: "#AABBCC", radius: -10, weight: 90 }), { ...DEFAULT_APPEARANCE, accent: "#aabbcc", radius: 0, weight: 3 });
});

test("appearance survives save/load with layout and string settings preserved", () => {
  for (const style of HUD_STYLES) for (const palette of HUD_PALETTES) {
    const layout = structuredClone(DEFAULT_LAYOUT);
    layout.strings = { ...layout.strings, x: 0.15, y: 0.7, spacing: 0.6, order: [0, 2, 1], appearance: { ...DEFAULT_APPEARANCE, style: style.id, accent: palette.accent, surface: palette.surface, text: palette.text, radius: 0, weight: 3 } };
    assert.deepEqual(parseLayout(JSON.stringify({ version: 1, items: layout })), layout);
  }
  assert.deepEqual(parseLayout(JSON.stringify({ version: 1, items: DEFAULT_LAYOUT })), DEFAULT_LAYOUT);
});

test("applying appearance to all components preserves geometry and does not mutate the saved layout", () => {
  const saved = structuredClone(DEFAULT_LAYOUT);
  saved.strings.order = [1, 0, 2];
  saved.strings.spacing = 1.2;
  saved.left.visible = false;
  saved.left.x = 0.42;
  const before = structuredClone(saved);
  const appearance = { ...DEFAULT_APPEARANCE, accent: "#fab123", style: "outline" };
  const updated = applyAppearanceToLayout(saved, appearance);
  for (const id of HUD_IDS) {
    const { appearance: actual, ...geometry } = updated[id];
    assert.deepEqual(geometry, saved[id]);
    assert.deepEqual(actual, appearance);
  }
  updated.left.appearance.accent = "#000000";
  assert.equal(updated.right.appearance.accent, "#fab123");
  assert.deepEqual(saved, before);
  assert.equal(appearance.accent, "#fab123");
});

test("filled accents use a contrasting foreground", () => {
  assert.equal(accentForeground("#ffffff"), "#000000");
  assert.equal(accentForeground("#000000"), "#ffffff");
  assert.equal(accentForeground("#ffff00"), "#000000");
  assert.equal(accentForeground("#000080"), "#ffffff");
});
