export type Point = { x: number; y: number };
export type Calibration = { left: number; right: number; raised: number; lowered: number };
export function validateCalibration(c: Calibration) {
  return Object.values(c).every(Number.isFinite) && c.left >= 0 && c.right <= 1 && c.right - c.left >= .18 && c.raised >= 0 && c.lowered <= 1 && c.lowered - c.raised >= .1;
}
export function mapCameraPoint(point: Point, c: Calibration, start: number, count = 8) {
  if (!validateCalibration(c) || !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isInteger(start) || !Number.isInteger(count) || start < 0 || count < 1 || start + count > 21) return null;
  const u = (point.x - c.left) / (c.right - c.left), v = (point.y - c.raised) / (c.lowered - c.raised);
  if (u < 0 || u > 1 || v < -.4 || v > 1.4) return null;
  return { bar: start + Math.min(count - 1, Math.floor(u * count)), v };
}
export class CameraStrike {
  private raised = false;
  private previous: { v: number; at: number } | null = null;
  reset() { this.raised = false; this.previous = null; }
  update(v: number, now: number) {
    const previous = this.previous;
    if (!previous || now - previous.at > 150 || now <= previous.at) this.raised = false;
    if (v < .3) this.raised = true;
    const hit = !!previous && now - previous.at <= 150 && now > previous.at && this.raised && previous.v < .65 && v >= .65 && (v - previous.v) / ((now - previous.at) / 1000) > .45;
    if (hit) this.raised = false;
    this.previous = { v, at: now }; return hit;
  }
}
