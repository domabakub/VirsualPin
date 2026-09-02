import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { StringIndex } from "@/data/songs";

export type CameraPoint = { x: number; y: number };

export const LEFT_FRET_ZONE = {
  minX: 0.04,
  maxX: 0.46,
  minY: 0.18,
  maxY: 0.86,
  minFret: 0,
  maxFret: 6,
} as const;

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
  activateRatio: 0.32,
  releaseRatio: 0.48,
  ambiguityMargin: 0.08,
  holdMs: 90,
  releaseHoldMs: 70,
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
export function detectPinchedString(landmarks: NormalizedLandmark[], lockedString: StringIndex | null): StringIndex | null {
  const palmScale = Math.max(0.0001, landmarkDistance(landmarks[5], landmarks[17]));
  const ratios = LEFT_PINCH.fingerTips.map((tip) => landmarkDistance(landmarks[4], landmarks[tip]) / palmScale);

  if (lockedString !== null && ratios[lockedString] <= LEFT_PINCH.releaseRatio) {
    return lockedString;
  }

  const ordered = ratios
    .map((ratio, string) => ({ ratio, string: string as StringIndex }))
    .sort((a, b) => a.ratio - b.ratio);
  const closest = ordered[0];
  const second = ordered[1];
  if (closest.ratio > LEFT_PINCH.activateRatio) return null;
  if (second.ratio - closest.ratio < LEFT_PINCH.ambiguityMargin) return null;
  return closest.string;
}

export function detectFret(point: CameraPoint, currentFret: number | null): number | null {
  const zone = LEFT_FRET_ZONE;
  if (point.x < zone.minX || point.x > zone.maxX || point.y < zone.minY || point.y > zone.maxY) return null;

  const fretCount = zone.maxFret - zone.minFret + 1;
  const cellWidth = (zone.maxX - zone.minX) / fretCount;

  if (currentFret !== null) {
    const currentIndex = currentFret - zone.minFret;
    const currentLeft = zone.minX + currentIndex * cellWidth;
    const hysteresis = cellWidth * 0.22;
    if (point.x >= currentLeft - hysteresis && point.x <= currentLeft + cellWidth + hysteresis) {
      return currentFret;
    }
  }

  const rawIndex = Math.floor((point.x - zone.minX) / cellWidth);
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
