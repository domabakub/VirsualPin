import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type HandSide = "Left" | "Right";

export type TrackedHand = {
  side: HandSide;
  confidence: number;
  landmarks: NormalizedLandmark[];
};

export type TrackerPhase = "idle" | "loading" | "tracking" | "error";
