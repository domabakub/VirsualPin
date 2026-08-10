"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export type CameraPhase = "idle" | "requesting" | "ready" | "denied" | "error";
export type CameraFacing = "user" | "environment";

export function useCamera(videoRef: RefObject<HTMLVideoElement | null>) {
  const [phase, setPhase] = useState<CameraPhase>("idle");
  const [facing, setFacing] = useState<CameraFacing>("user");
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setPhase("idle");
  }, [videoRef]);

  const start = useCallback(async (requestedFacing: CameraFacing = facing) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง กรุณาใช้ Safari, Chrome หรือ Edge รุ่นล่าสุด");
      setPhase("error");
      return;
    }

    setError(null);
    setPhase("requesting");
    streamRef.current?.getTracks().forEach((track) => track.stop());

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: requestedFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 60 },
        },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video element is unavailable");
      video.srcObject = stream;
      await video.play();
      setFacing(requestedFacing);
      setPhase("ready");
    } catch (reason) {
      const isDenied = reason instanceof DOMException && ["NotAllowedError", "SecurityError"].includes(reason.name);
      setPhase(isDenied ? "denied" : "error");
      setError(
        isDenied
          ? "ยังไม่ได้รับอนุญาตให้ใช้กล้อง กรุณาอนุญาต Camera ในการตั้งค่าเบราว์เซอร์"
          : "ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบว่ากล้องไม่ได้ถูกใช้งานโดยแอปอื่น",
      );
    }
  }, [facing, videoRef]);

  const flip = useCallback(async () => {
    const nextFacing: CameraFacing = facing === "user" ? "environment" : "user";
    await start(nextFacing);
  }, [facing, start]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  return { phase, facing, error, start, stop, flip };
}
