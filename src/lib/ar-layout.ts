import type { StringIndex } from "@/data/songs";
import { parseAppearance, type HudAppearance } from "@/lib/ar-appearance";

export const AR_LAYOUT_KEY = "virtual-phin:ar-layout:v1";
export type StringOrder = [StringIndex, StringIndex, StringIndex];
export type StringSettings = { spacing: number; order: StringOrder };
export const DEFAULT_STRING_SETTINGS: StringSettings = { spacing: 1, order: [2, 1, 0] };

export const HUD_ITEMS = {
  status: { label: "สถานะกล้อง", width: 0.38, height: 0.07, minWidth: 142, minHeight: 38 },
  flip: { label: "สลับกล้อง", width: 0.06, height: 0.08, minWidth: 44, minHeight: 44 },
  left: { label: "ข้อมูลมือซ้าย", width: 0.34, height: 0.18, minWidth: 120, minHeight: 92 },
  right: { label: "ข้อมูลมือขวา", width: 0.30, height: 0.14, minWidth: 108, minHeight: 70 },
  frets: { label: "แถบแสดงเฟรต", width: 0.40, height: 0.08, minWidth: 140, minHeight: 40 },
  strings: { label: "พื้นที่ดีดสาย", width: 0.46, height: 0.44, minWidth: 110, minHeight: 144 },
  instrument: { label: "คอพิณ / โน้ต", width: 0.72, height: 0.22, minWidth: 210, minHeight: 98 },
  calibrate: { label: "ปุ่มตั้งเฟรต 0", width: 0.24, height: 0.08, minWidth: 130, minHeight: 44 },
} as const;

export type HudId = keyof typeof HUD_ITEMS;
export type HudItem = { x: number; y: number; scale: number; opacity: number; visible: boolean; appearance?: HudAppearance };
export type HudPatch = Partial<HudItem & StringSettings>;
export type HudLayout = Record<HudId, HudItem> & { strings: HudItem & StringSettings };
export const HUD_IDS = Object.keys(HUD_ITEMS) as HudId[];
export const DEFAULT_LAYOUT: HudLayout = {
  status: { x: 0, y: 0, scale: 1, opacity: 1, visible: true },
  flip: { x: 1, y: 0, scale: 1, opacity: 1, visible: true },
  left: { x: 0, y: 0.15, scale: 1, opacity: 1, visible: true },
  right: { x: 1, y: 0.15, scale: 1, opacity: 1, visible: true },
  frets: { x: 0, y: 0.44, scale: 1, opacity: 1, visible: true },
  strings: { x: 1, y: 0.48, scale: 1, opacity: 1, visible: true, ...DEFAULT_STRING_SETTINGS },
  instrument: { x: 0.5, y: 0.95, scale: 1, opacity: 0.85, visible: true },
  calibrate: { x: 0, y: 0.64, scale: 1, opacity: 1, visible: true },
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function numberIn(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

/** Saved data is untrusted; keep missing or malformed controls usable. */
export function parseLayout(raw: string | null): HudLayout {
  let items: Partial<Record<HudId, HudPatch>> = {};
  try {
    const data = JSON.parse(raw ?? "null");
    if (data?.version === 1 && data.items && typeof data.items === "object") items = data.items;
  } catch { /* A damaged save falls back to defaults. */ }
  return Object.fromEntries(HUD_IDS.map(id => {
    const fallback = DEFAULT_LAYOUT[id];
    const item = items[id];
    return [id, {
      x: numberIn(item?.x, fallback.x, 0, 1),
      y: numberIn(item?.y, fallback.y, 0, 1),
      scale: numberIn(item?.scale, fallback.scale, 0.75, 1.4),
      opacity: numberIn(item?.opacity, fallback.opacity, 0.3, 1),
      visible: typeof item?.visible === "boolean" ? item.visible : fallback.visible,
      ...(item?.appearance !== undefined ? { appearance: parseAppearance(item.appearance) } : {}),
      ...(id === "strings" ? {
        spacing: numberIn(item?.spacing, DEFAULT_STRING_SETTINGS.spacing, 0.6, 1.2),
        order: Array.isArray(item?.order) && item.order.length === 3 && new Set(item.order).size === 3 && item.order.every(value => value === 0 || value === 1 || value === 2)
          ? [...item.order] : [...DEFAULT_STRING_SETTINGS.order],
      } : {}),
    }];
  })) as HudLayout;
}

export function applyAppearanceToLayout(layout: HudLayout, appearance: HudAppearance): HudLayout {
  return Object.fromEntries(HUD_IDS.map(id => [id, { ...layout[id], appearance: { ...appearance } }])) as HudLayout;
}

/** Positions are indexed by string identity; reordering never changes its pitch. */
export function stringPositions(settings: StringSettings): [number, number, number] {
  const positions: [number, number, number] = [0, 0, 0];
  settings.order.forEach((string, row) => { positions[string] = 0.5 + (row - 1) * settings.spacing / 3; });
  return positions;
}

export function pluckStringPositions(settings: StringSettings): [number, number, number] {
  return stringPositions(settings).map(position => 0.29 + position * 0.42) as [number, number, number];
}

/** Positions use available travel so right/bottom anchored controls survive resizing. */
export function hudRect(id: HudId, item: HudItem, width: number, height: number) {
  const definition = HUD_ITEMS[id];
  const w = Math.min(width, Math.max(definition.minWidth, width * definition.width * item.scale));
  const h = Math.min(height, Math.max(definition.minHeight, height * definition.height * item.scale));
  return { x: item.x * (width - w), y: item.y * (height - h), width: w, height: h };
}

/** Map the displayed string area into the detector's original coordinate system. */
export function mapToPluckZone(point: { x: number; y: number }, rect: { x: number; y: number; width: number; height: number }) {
  return {
    x: 0.5 + (point.x - rect.x) / Math.max(rect.width, 0.001) * 0.48,
    y: 0.29 + (point.y - rect.y) / Math.max(rect.height, 0.001) * 0.42,
  };
}
