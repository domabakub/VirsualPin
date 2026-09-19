import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { StringIndex } from "@/data/songs";

export type CameraPoint = { x: number; y: number };

export const LEFT_FRET_ZONE = {
  minX: 0.08,
  minY: 0.12,
  maxY: 0.9,
  minFret: 0,
  maxFret: 6,
} as const;

export const FRET_TRAVEL = {
  low: 0.3,
  normal: 0.24,
  high: 0.18,
} as const;
export type FretSensitivity = keyof typeof FRET_TRAVEL;

export const RIGHT_PLUCK_ZONE = {
  minX: 0.5,
  maxX: 0.98,
  // Indexed by string number: string 1 is bottom, 2 middle and 3 top.
  stringY: [0.64, 0.5, 0.36] as [number, number, number],
  acquireRadius: 0.07,
  releaseRadius: 0.09,
  minVelocity: 0.06,
  minTravel: 0.002,
  // Fast enough for tremolo while still rejecting duplicate detections from
  // two adjacent camera frames crossing the same string.
  cooldownMs: 70,
} as const;

export const RIGHT_PINCH = {
  activateRatio: 0.5,
  releaseRatio: 0.68,
} as const;

export const LEFT_PINCH = {
  fingerTips: [8, 12, 16] as const,
  activateRatio: [0.46, 0.5, 0.53] as const,
  releaseRatio: [0.62, 0.66, 0.69] as const,
  ambiguityMargin: 0.035,
  holdMs: 55,
  releaseHoldMs: 110,
} as const;

export function smoothLandmark(previous: CameraPoint | null, next: CameraPoint, alpha = 0.34): CameraPoint {
  if (!previous) return next;
  return {
    x: previous.x + (next.x - previous.x) * alpha,
    y: previous.y + (next.y - previous.y) * alpha,
  };
}

export function averageLandmarks(landmarks: NormalizedLandmark[], indices: readonly number[]): CameraPoint {
  const sum = indices.reduce((value, index) => ({
    x: value.x + landmarks[index].x,
    y: value.y + landmarks[index].y,
  }), { x: 0, y: 0 });
  return { x: sum.x / indices.length, y: sum.y / indices.length };
}

function landmarkDistance(from: NormalizedLandmark, to: NormalizedLandmark) {
  return Math.hypot(from.x - to.x, from.y - to.y, (from.z ?? 0) - (to.z ?? 0));
}

function imageDistance(from: NormalizedLandmark, to: NormalizedLandmark) {
  return Math.hypot(from.x - to.x, from.y - to.y);
}

/** A thumb-index pinch becomes one stable control point for the right hand. */
export function detectRightPinchFocus(landmarks: NormalizedLandmark[], wasActive: boolean): CameraPoint | null {
  const palmScale = Math.max(0.0001, landmarkDistance(landmarks[5], landmarks[17]));
  const pinchRatio = landmarkDistance(landmarks[4], landmarks[8]) / palmScale;
  const threshold = wasActive ? RIGHT_PINCH.releaseRatio : RIGHT_PINCH.activateRatio;
  if (pinchRatio > threshold) return null;

  return {
    x: (landmarks[4].x + landmarks[8].x) / 2,
    y: (landmarks[4].y + landmarks[8].y) / 2,
  };
}

/** Index, middle and ring map directly to strings 1, 2 and 3. */
export function getLeftPinchRatios(landmarks: NormalizedLandmark[]): number[] {
  // Use palm length as a backup when the hand turns edge-on to the camera.
  const palmScale = Math.max(0.0001, imageDistance(landmarks[5], landmarks[17]), imageDistance(landmarks[0], landmarks[9]) * 0.8);
  return LEFT_PINCH.fingerTips.map((tip) => imageDistance(landmarks[4], landmarks[tip]) / palmScale);
}

export function detectPinchedString(landmarks: NormalizedLandmark[], lockedString: StringIndex | null): StringIndex | null {
  const ratios = getLeftPinchRatios(landmarks);

  if (lockedString !== null && ratios[lockedString] <= LEFT_PINCH.releaseRatio[lockedString]) {
    return lockedString;
  }

  const ordered = ratios
    .map((ratio, string) => ({ ratio, string: string as StringIndex }))
    .sort((a, b) => a.ratio - b.ratio);
  const closest = ordered[0];
  const second = ordered[1];
  if (closest.ratio > LEFT_PINCH.activateRatio[closest.string]) return null;
  if (second.ratio - closest.ratio < LEFT_PINCH.ambiguityMargin) return null;
  return closest.string;
}

export function detectFret(
  point: CameraPoint,
  currentFret: number | null,
  origin: number = LEFT_FRET_ZONE.minX,
  travel: number = FRET_TRAVEL.normal,
): number | null {
  const zone = LEFT_FRET_ZONE;
  if (point.y < zone.minY || point.y > zone.maxY || point.x < -0.05 || point.x > 1.05) return null;

  const fretCount = zone.maxFret - zone.minFret + 1;
  const cellWidth = travel / fretCount;

  // Past the ends of the range, keep the nearest fret rather than losing the hand.
  if (point.x < origin) return zone.minFret;
  if (point.x >= origin + travel) return zone.maxFret;

  if (currentFret !== null) {
    const currentIndex = currentFret - zone.minFret;
    const currentLeft = origin + currentIndex * cellWidth;
    const hysteresis = cellWidth * 0.18;
    if (point.x >= currentLeft - hysteresis && point.x <= currentLeft + cellWidth + hysteresis) {
      return currentFret;
    }
  }

  const rawIndex = Math.floor((point.x - origin) / cellWidth);
  const safeIndex = Math.max(0, Math.min(fretCount - 1, rawIndex));
  return zone.minFret + safeIndex;
}

export function detectString(point: CameraPoint, currentString: StringIndex | null): StringIndex | null {
  const zone = RIGHT_PLUCK_ZONE;
  if (point.x < zone.minX || point.x > zone.maxX) return null;

  if (currentString !== null && Math.abs(point.y - zone.stringY[currentString]) <= zone.releaseRadius) {
    return currentString;
  }

  const nearest = zone.stringY.reduce((best, stringY, index) => (
    Math.abs(point.y - stringY) < Math.abs(point.y - zone.stringY[best]) ? index : best
  ), 0) as StringIndex;

  return Math.abs(point.y - zone.stringY[nearest]) <= zone.acquireRadius ? nearest : null;
}

type PluckInput = {
  previous: CameraPoint | null;
  current: CameraPoint;
  elapsedMs: number;
  now: number;
  lastPluckAt: number;
};

export function detectPluck({ previous, current, elapsedMs, now, lastPluckAt }: PluckInput): StringIndex | null {
  if (!previous || elapsedMs <= 0) return null;
  if (now - lastPluckAt < RIGHT_PLUCK_ZONE.cooldownMs) return null;
  if (
    previous.x < RIGHT_PLUCK_ZONE.minX
    || current.x < RIGHT_PLUCK_ZONE.minX
    || previous.x > RIGHT_PLUCK_ZONE.maxX
    || current.x > RIGHT_PLUCK_ZONE.maxX
  ) return null;

  const movement = current.y - previous.y;
  const velocity = Math.abs(movement) / (elapsedMs / 1000);
  if (Math.abs(movement) < RIGHT_PLUCK_ZONE.minTravel || velocity < RIGHT_PLUCK_ZONE.minVelocity) return null;

  const crossed = RIGHT_PLUCK_ZONE.stringY
    .map((stringY, string) => ({
      string: string as StringIndex,
      stringY,
      crossed: (previous.y - stringY) * (current.y - stringY) <= 0,
    }))
    .filter((candidate) => candidate.crossed);

  if (crossed.length === 0) return null;
  return crossed.reduce((nearest, candidate) => (
    Math.abs(current.y - candidate.stringY) < Math.abs(current.y - nearest.stringY) ? candidate : nearest
  )).string;
}
