import { validateCalibration, type Calibration, type Point } from "@/instruments/ranat/camera";

/** Where the virtual ranat sits on the camera view. x/y are view-normalized (0–1). */
export type ArPlacement = { x: number; y: number; scale: number; opacity: number; swing: number };
/** A bar centre projected onto the camera view, view-normalized. */
export type ScreenBar = { bar: number; x: number; y: number };

export const AR_PLACEMENT_KEY = "ranat-next:ar-placement:v1";
export const DEFAULT_AR_PLACEMENT: ArPlacement = { x: .5, y: .66, scale: .86, opacity: .92, swing: .3 };
/** Must equal the strike threshold in HandMalletController (v crossing .62 = strike). */
export const AR_STRIKE_V = .62;
export const AR_PLACEMENT_LIMITS = {
  x: [.1, .9], y: [.3, .92], scale: [.45, 1.4], opacity: [.35, 1], swing: [.16, .42],
} as const satisfies Record<keyof ArPlacement, readonly [number, number]>;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function clampPlacement(input: ArPlacement): ArPlacement {
  const out = { ...input };
  for (const key of Object.keys(AR_PLACEMENT_LIMITS) as (keyof ArPlacement)[]) {
    const [min, max] = AR_PLACEMENT_LIMITS[key];
    out[key] = Number.isFinite(input[key]) ? clamp(input[key], min, max) : DEFAULT_AR_PLACEMENT[key];
  }
  return out;
}

/** Saved data is untrusted; anything malformed falls back per field. */
export function parsePlacement(raw: string | null): ArPlacement {
  let data: unknown = null;
  try { data = JSON.parse(raw ?? "null"); } catch { /* damaged save → defaults */ }
  const item = data && typeof data === "object" && (data as { version?: unknown }).version === 1 ? (data as { placement?: unknown }).placement : null;
  const source = item && typeof item === "object" ? item as Partial<Record<keyof ArPlacement, unknown>> : {};
  const pick = (key: keyof ArPlacement) => typeof source[key] === "number" ? source[key] as number : DEFAULT_AR_PLACEMENT[key];
  return clampPlacement({ x: pick("x"), y: pick("y"), scale: pick("scale"), opacity: pick("opacity"), swing: pick("swing") });
}

export function serializePlacement(placement: ArPlacement) {
  return JSON.stringify({ version: 1, placement: clampPlacement(placement) });
}

/**
 * Converts a MediaPipe point (normalized to the raw video frame) into the
 * normalized coordinates of a view that shows the video with object-fit: cover.
 * The front camera is shown mirrored, so its x is flipped like the preview.
 */
export function videoToView(point: Point, video: { width: number; height: number }, view: { width: number; height: number }, mirrored: boolean): Point {
  const x = mirrored ? 1 - point.x : point.x;
  if (!(video.width > 0 && video.height > 0 && view.width > 0 && view.height > 0)) return { x, y: point.y };
  const scale = Math.max(view.width / video.width, view.height / video.height);
  const width = video.width * scale, height = video.height * scale;
  return { x: (x * width + (view.width - width) / 2) / view.width, y: (point.y * height + (view.height - height) / 2) / view.height };
}

export type ArRegion = { calibration: Calibration; strikeY: number } | { calibration: null; reason: "offscreen" | "too-small" | "no-room" };

/**
 * Derives the hand play region from where the ranat bars appear on screen, so a
 * palm above a drawn bar aims at that bar and lowering it to the bar's height strikes.
 * Assumes evenly spaced bars (the model spaces bar centres 60 mm apart).
 */
export function regionFromBars(screenBars: ScreenBar[], start: number, count: number, swing: number): ArRegion {
  const active = screenBars.filter(b => b.bar >= start && b.bar < start + count).sort((a, b) => a.bar - b.bar);
  if (active.length !== count || active.some(b => !Number.isFinite(b.x) || !Number.isFinite(b.y))) return { calibration: null, reason: "offscreen" };
  const first = active[0], last = active[active.length - 1];
  const half = count > 1 ? (last.x - first.x) / (count - 1) / 2 : .03;
  const left = first.x - half, right = last.x + half;
  if (left < 0 || right > 1) return { calibration: null, reason: "offscreen" };
  if (right - left < .18) return { calibration: null, reason: "too-small" };
  const strikeY = active.reduce((sum, b) => sum + b.y, 0) / active.length;
  // Shrink the swing if the bars sit too close to the top/bottom of the view.
  const span = Math.min(swing, strikeY / AR_STRIKE_V, (1 - strikeY) / (1 - AR_STRIKE_V));
  if (!(span >= .1)) return { calibration: null, reason: "no-room" };
  const raised = Math.max(0, strikeY - AR_STRIKE_V * span);
  const calibration = { left, right, raised, lowered: Math.min(1, raised + span) };
  return validateCalibration(calibration) ? { calibration, strikeY } : { calibration: null, reason: "no-room" };
}

export const AR_REGION_MESSAGES: Record<"offscreen" | "too-small" | "no-room", string> = {
  offscreen: "ลูกระนาดที่ใช้เล่นล้นขอบภาพ · จัดตำแหน่งหรือย่อระนาดลง",
  "too-small": "ระนาดเล็กเกินไปสำหรับเล็งด้วยมือ · ขยายระนาดขึ้น",
  "no-room": "ไม่มีที่ให้ยกมือเหนือระนาด · เลื่อนระนาดลงหรือลดระยะยกมือ",
};
