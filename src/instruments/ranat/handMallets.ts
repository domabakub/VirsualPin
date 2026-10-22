import { mapCameraPoint, type Calibration } from "@/instruments/ranat/camera";
import type { Articulation } from "@/instruments/ranat/model";

export type MalletHand = "L" | "R";
export type PalmSample = { hand: MalletHand; x: number; y: number; confidence: number };
export type MalletPose = { hand: MalletHand; bar: number; u: number; v: number; armed: boolean; stamp: number };
export type MalletCommand = { kind: "strike"; bar: number; hand: MalletHand; velocity: number; owner: string }
  | { kind: "hold"; bar: number; hand: MalletHand; owner: string }
  | { kind: "release"; owner: string };
export type MalletFrame = { poses: MalletPose[]; commands: MalletCommand[]; ambiguous: boolean };
export type MalletConfig = { calibration: Calibration; start: number; count: number; mode: Articulation; offset: number; sensitivity: number };
type Track = { x: number; y: number; v: number; bar: number; time: number; armed: boolean; lastHit: number };
export const HAND_TIMEOUT_MS = 180;
export const DEFAULT_CALIBRATION: Calibration = { left: .12, right: .88, raised: .22, lowered: .78 };
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Show tracked hands even while sound is paused or the palm is outside the strike region. */
export function previewMalletPoses(samples: PalmSample[], now: number, config: MalletConfig): MalletPose[] {
  const c = config.calibration;
  const last = Math.min(config.start + config.count - 1, (config.mode === "pair" || config.mode === "kro") ? 20 - config.offset : 20);
  if (last < config.start) return [];
  return samples.filter((s, i) => s.confidence >= .55 && Number.isFinite(s.x) && Number.isFinite(s.y) && samples.findIndex(p => p.hand === s.hand) === i).map(s => {
    const u = clamp((s.x - c.left) / (c.right - c.left), 0, 1);
    const v = clamp((s.y - c.raised) / (c.lowered - c.raised), -.4, 1.4);
    return { hand: s.hand, bar: Math.min(last, config.start + Math.floor(u * config.count)), u, v, armed: false, stamp: now };
  });
}

/** Assisted techniques have one physical controller but two virtual mallets. */
export function displayMalletPoses(poses: MalletPose[], mode: Articulation, offset: number): MalletPose[] {
  if (mode === "direct") return poses;
  if (!poses.length) return [];
  const base = poses[0], second = mode === "roll" ? base.bar : base.bar + offset;
  if (second >= 21) return [];
  return [{ ...base, hand: "L" }, { ...base, hand: "R", bar: second }];
}

/** Pure camera-frame interpreter. Sound, React, and rendering are consumers only. */
export class HandMalletController {
  private tracks = new Map<MalletHand, Track>();
  private held: { hand: MalletHand; bar: number } | null = null;
  private dwell: { hand: MalletHand; since: number } | null = null;
  private configKey = "";
  reset(): MalletCommand[] {
    const commands: MalletCommand[] = this.held ? [{ kind: "release", owner: "camera-hold" }] : [];
    this.tracks.clear(); this.held = null; this.dwell = null;
    return commands;
  }
  update(samples: PalmSample[], now: number, config: MalletConfig): MalletFrame {
    const key = JSON.stringify(config);
    const commands = key === this.configKey ? [] : this.reset();
    this.configKey = key;
    const poses: MalletPose[] = [];
    const ambiguous = new Set(samples.map(s => s.hand)).size !== samples.length;
    if (!Number.isFinite(now) || ambiguous) return { poses, commands: [...commands, ...this.reset()], ambiguous };
    let accepted = samples.filter(s => Number.isFinite(s.confidence) && s.confidence >= .55);
    const assisted = config.mode !== "direct";
    // Two hands may play independently only in direct mode; one hand owns assisted patterns.
    if (assisted) {
      const owner = this.held?.hand ?? this.tracks.keys().next().value;
      const primary = accepted.find(s => s.hand === owner) ?? accepted.find(s => s.hand === "L") ?? accepted[0];
      if (owner && primary?.hand !== owner) commands.push(...this.reset());
      accepted = primary ? [primary] : [];
    }
    const seen = new Set<MalletHand>();
    for (const sample of accepted) {
      const mapped = mapCameraPoint(sample, config.calibration, config.start, config.count);
      if (!mapped || ((config.mode === "pair" || config.mode === "kro") && mapped.bar + config.offset >= 21)) continue;
      seen.add(sample.hand);
      let previous = this.tracks.get(sample.hand);
      const dt = previous ? now - previous.time : Infinity;
      // Identity jumps and stale frames must reacquire in the raised position.
      if (previous && (dt <= 0 || dt > HAND_TIMEOUT_MS || Math.hypot(sample.x - previous.x, sample.y - previous.y) > .4)) previous = undefined;
      const u = (sample.x - config.calibration.left) / (config.calibration.right - config.calibration.left);
      let bar = mapped.bar;
      if (previous) {
        const priorIndex = previous.bar - config.start;
        if (u >= (priorIndex - .12) / config.count && u <= (priorIndex + 1.12) / config.count) bar = previous.bar;
      }
      const track: Track = { x: sample.x, y: sample.y, v: mapped.v, bar, time: now, armed: previous?.armed ?? false, lastHit: previous?.lastHit ?? -Infinity };
      if (mapped.v <= .28) track.armed = true;
      const velocity = previous ? (mapped.v - previous.v) / (dt / 1000) : 0;
      const threshold = .62;
      const minVelocity = .9 - clamp(config.sensitivity, 0, 1) * .65;
      const strike = !!previous && track.armed && previous.v < threshold && mapped.v >= threshold && velocity >= minVelocity && now - track.lastHit >= 95;
      if (config.mode === "direct" || config.mode === "pair") {
        if (strike) {
          track.armed = false; track.lastHit = now;
          commands.push({ kind: "strike", bar, hand: sample.hand, velocity: clamp(.45 + velocity * .09, .45, 1), owner: `camera-${sample.hand}` });
        }
      } else {
        if (track.armed && mapped.v >= threshold && previous) {
          if (this.dwell?.hand !== sample.hand) this.dwell = { hand: sample.hand, since: now };
          if (now - this.dwell.since >= 180 && (this.held?.bar !== bar || this.held.hand !== sample.hand)) {
            commands.push({ kind: "hold", bar, hand: sample.hand, owner: "camera-hold" });
            this.held = { hand: sample.hand, bar };
          }
        } else {
          this.dwell = null;
          if (this.held) commands.push({ kind: "release", owner: "camera-hold" });
          this.held = null;
        }
      }
      this.tracks.set(sample.hand, track);
      poses.push({ hand: sample.hand, bar, u, v: mapped.v, armed: track.armed, stamp: now });
    }
    for (const hand of this.tracks.keys()) if (!seen.has(hand)) this.tracks.delete(hand);
    if (this.held && !seen.has(this.held.hand)) {
      commands.push({ kind: "release", owner: "camera-hold" }); this.held = null;
    }
    if (this.dwell && !seen.has(this.dwell.hand)) this.dwell = null;
    return { poses, commands, ambiguous: false };
  }
}
