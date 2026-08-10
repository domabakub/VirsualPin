import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { HandSide } from "./types";

/** Exponential moving average keeps landmarks responsive while reducing camera jitter. */
export class LandmarkSmoother {
  private previous = new Map<HandSide, NormalizedLandmark[]>();

  constructor(private readonly alpha = 0.42) {}

  smooth(side: HandSide, next: NormalizedLandmark[]): NormalizedLandmark[] {
    const before = this.previous.get(side);
    if (!before || before.length !== next.length) {
      const initial = next.map((point) => ({ ...point }));
      this.previous.set(side, initial);
      return initial;
    }

    const smoothed = next.map((point, index) => ({
      x: before[index].x + this.alpha * (point.x - before[index].x),
      y: before[index].y + this.alpha * (point.y - before[index].y),
      z: before[index].z + this.alpha * (point.z - before[index].z),
      visibility: point.visibility,
    }));
    this.previous.set(side, smoothed);
    return smoothed;
  }

  reset() {
    this.previous.clear();
  }
}
