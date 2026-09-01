"use client";

import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState, type RefObject } from "react";
import { drawHands, type HandDrawingMode } from "@/lib/hand-tracking/drawing";
import { LandmarkSmoother } from "@/lib/hand-tracking/smoother";
import type { HandSide, TrackedHand, TrackerPhase } from "@/lib/hand-tracking/types";

const MEDIAPIPE_VERSION = "1.0.1";
const WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export function useHandTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  active: boolean,
  mirrored = true,
  drawingMode: HandDrawingMode = "skeleton",
) {
  const [phase, setPhase] = useState<TrackerPhase>("idle");
  const [hands, setHands] = useState<TrackedHand[]>([]);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const smootherRef = useRef(new LandmarkSmoother());
  const mirroredRef = useRef(mirrored);
  const drawingModeRef = useRef(drawingMode);

  useEffect(() => {
    mirroredRef.current = mirrored;
  }, [mirrored]);

  useEffect(() => {
    drawingModeRef.current = drawingMode;
  }, [drawingMode]);

  useEffect(() => {
    const smoother = smootherRef.current;
    if (!active) {
      const canvas = canvasRef.current;
      canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      const clearId = window.setTimeout(() => {
        setPhase("idle");
        setHands([]);
        setFps(0);
        smoother.reset();
      }, 0);
      return () => window.clearTimeout(clearId);
    }

    let disposed = false;
    let frameId = 0;
    let landmarker: HandLandmarker | null = null;
    let lastVideoTime = -1;
    let frames = 0;
    let fpsStartedAt = performance.now();

    async function initialize() {
      setPhase("loading");
      setError(null);
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
        try {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.45,
            minHandPresenceConfidence: 0.45,
            minTrackingConfidence: 0.45,
          });
        } catch {
          // Some older iPads cannot initialize WebGL; CPU keeps the experience usable.
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.45,
            minHandPresenceConfidence: 0.45,
            minTrackingConfidence: 0.45,
          });
        }

        if (disposed) {
          landmarker.close();
          return;
        }
        setPhase("tracking");
        frameId = requestAnimationFrame(detect);
      } catch (reason) {
        console.error("Hand tracker initialization failed", reason);
        if (!disposed) {
          setPhase("error");
          setError("โหลดระบบตรวจจับมือไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่");
        }
      }
    }

    function detect(now: number) {
      if (disposed) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (landmarker && video && canvas && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const result = landmarker.detectForVideo(video, now);
          const nextHands: TrackedHand[] = result.landmarks.map((landmarks, index) => {
            const category = result.handedness[index]?.[0];
            const classifiedSide: HandSide = category?.categoryName === "Left" ? "Left" : "Right";
            // MediaPipe's handedness follows selfie/mirrored input. Rear-camera
            // frames are not mirrored, so swap the label back to anatomical side.
            const side: HandSide = mirroredRef.current
              ? classifiedSide
              : classifiedSide === "Left" ? "Right" : "Left";
            return {
              side,
              confidence: category?.score ?? 0,
              landmarks: smoother.smooth(side, landmarks),
            };
          });
          setHands(nextHands);
          drawHands(canvas, video, nextHands, mirroredRef.current, drawingModeRef.current);

          frames += 1;
          const elapsed = now - fpsStartedAt;
          if (elapsed >= 1000) {
            setFps(Math.round((frames * 1000) / elapsed));
            frames = 0;
            fpsStartedAt = now;
          }
        }
      }
      frameId = requestAnimationFrame(detect);
    }

    initialize();
    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      landmarker?.close();
      smoother.reset();
    };
  }, [active, canvasRef, videoRef]);

  return { phase, hands, fps, error };
}
