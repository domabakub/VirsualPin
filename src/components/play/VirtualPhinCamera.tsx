"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CameraIcon, FlipIcon, HandIcon, ShieldIcon } from "@/components/icons";
import { useCamera } from "@/hooks/useCamera";
import { useHandTracking } from "@/hooks/useHandTracking";
import type { StringIndex } from "@/data/songs";
import type { TrackedHand } from "@/lib/hand-tracking/types";
import {
  LEFT_PINCH,
  RIGHT_PLUCK_ZONE,
  averageLandmarks,
  detectFret,
  detectPinchedString,
  detectPluck,
  detectRightPinchFocus,
  detectString,
  smoothLandmark,
  type CameraPoint,
} from "@/lib/hand-tracking/virtualPhinInteraction";
import { VirtualPhinInstrument } from "./VirtualPhinInstrument";

const PALM_ANCHOR = [0, 5, 9, 13, 17] as const;
const FRET_LABELS = [0, 1, 2, 3, 4, 5, 6];

type Props = {
  frets: [number, number, number];
  activeString: StringIndex | null;
  expected?: { string: StringIndex; fret: number };
  onSelectFret: (string: StringIndex, fret: number) => void;
  onPluck: (string: StringIndex, fret?: number) => void;
  onUnlockAudio: () => void;
  defaultFacing?: "user" | "environment";
  onLiveChange?: (live: boolean) => void;
  standaloneMode?: boolean;
  className?: string;
};

type PluckState = "idle" | "ready" | "pluck";

function projectToView(point: CameraPoint, video: HTMLVideoElement | null, view: HTMLCanvasElement | null, mirrored: boolean): CameraPoint {
  if (!video?.videoWidth || !video.videoHeight || !view) {
    return { x: mirrored ? 1 - point.x : point.x, y: point.y };
  }

  const bounds = view.getBoundingClientRect();
  const scale = Math.max(bounds.width / video.videoWidth, bounds.height / video.videoHeight);
  const width = video.videoWidth * scale;
  const height = video.videoHeight * scale;
  return {
    x: (((mirrored ? 1 - point.x : point.x) * width) + (bounds.width - width) / 2) / bounds.width,
    y: ((point.y * height) + (bounds.height - height) / 2) / bounds.height,
  };
}

function findHandForSideZone(
  hands: TrackedHand[],
  side: "Left" | "Right",
  video: HTMLVideoElement | null,
  view: HTMLCanvasElement | null,
  mirrored: boolean,
) {
  const candidates = hands.map((hand) => ({
    hand,
    x: projectToView(hand.landmarks[9], video, view, mirrored).x,
  }));
  const isInZone = (x: number) => side === "Left" ? x < 0.5 : x > 0.5;
  return candidates.find(({ hand, x }) => hand.side === side && isInZone(x))?.hand
    ?? candidates.find(({ x }) => isInZone(x))?.hand;
}

export function VirtualPhinCamera({ frets, activeString, expected, onSelectFret, onPluck, onUnlockAudio, defaultFacing = "user", onLiveChange, standaloneMode = false, className = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useCamera(videoRef);
  const mirrored = camera.facing === "user";
  const tracker = useHandTracking(videoRef, canvasRef, camera.phase === "ready", mirrored, "instrument");
  const isLive = camera.phase === "ready";
  useEffect(() => { onLiveChange?.(isLive); }, [isLive, onLiveChange]);
  const leftVisible = tracker.hands.some((hand) => hand.side === "Left") || tracker.hands.length === 2;
  const rightVisible = tracker.hands.some((hand) => hand.side === "Right") || tracker.hands.length === 2;

  const [fretPreview, setFretPreview] = useState(0);
  const [leftFretActive, setLeftFretActive] = useState(false);
  const [leftFingerString, setLeftFingerString] = useState<StringIndex | null>(null);
  const [selectedString, setSelectedString] = useState<StringIndex | null>(null);
  const [rightPinching, setRightPinching] = useState(false);
  const [pluckState, setPluckState] = useState<PluckState>("idle");

  const fretPreviewRef = useRef(0);
  const leftFretActiveRef = useRef(false);
  const leftLostAtRef = useRef(0);
  const leftZoneLostAtRef = useRef(0);
  const leftSmoothedRef = useRef<CameraPoint | null>(null);
  const leftFingerStringRef = useRef<StringIndex | null>(null);
  const leftFingerCandidateRef = useRef<StringIndex | null>(null);
  const leftFingerCandidateAtRef = useRef(0);
  const leftFingerReleaseAtRef = useRef(0);
  const rightPinchingRef = useRef(false);
  const rightSmoothedRef = useRef<CameraPoint | null>(null);
  const previousRightRef = useRef<CameraPoint | null>(null);
  const selectedStringRef = useRef<StringIndex | null>(null);
  const rightFrameAtRef = useRef(0);
  const rightLostAtRef = useRef(0);
  const lastPluckAtRef = useRef(-Infinity);
  const pluckStateRef = useRef<PluckState>("idle");
  const pluckTimerRef = useRef<number | null>(null);

  const updatePluckState = (next: PluckState) => {
    if (pluckStateRef.current === next) return;
    pluckStateRef.current = next;
    setPluckState(next);
  };

  const resetLeftFretToOpenString = useCallback(() => {
    if (!leftFretActiveRef.current && fretPreviewRef.current === 0 && leftFingerStringRef.current === null) return;
    leftFretActiveRef.current = false;
    fretPreviewRef.current = 0;
    leftFingerStringRef.current = null;
    leftFingerCandidateRef.current = null;
    leftFingerCandidateAtRef.current = 0;
    leftFingerReleaseAtRef.current = 0;
    setLeftFretActive(false);
    setFretPreview(0);
    setLeftFingerString(null);
    ([0, 1, 2] as StringIndex[]).forEach((string) => onSelectFret(string, 0));
  }, [onSelectFret]);

  useEffect(() => {
    const left = findHandForSideZone(tracker.hands, "Left", videoRef.current, canvasRef.current, mirrored);
    const now = performance.now();
    if (!left) {
      if (!leftLostAtRef.current) leftLostAtRef.current = now;
      leftSmoothedRef.current = null;
      leftZoneLostAtRef.current = 0;
      if (now - leftLostAtRef.current > 220) resetLeftFretToOpenString();
      return;
    }
    leftLostAtRef.current = 0;

    const detectedFinger = detectPinchedString(left.landmarks, leftFingerStringRef.current);
    if (detectedFinger === null) {
      leftFingerCandidateRef.current = null;
      leftFingerCandidateAtRef.current = 0;
      if (leftFingerStringRef.current !== null) {
        if (!leftFingerReleaseAtRef.current) {
          leftFingerReleaseAtRef.current = now;
        } else if (now - leftFingerReleaseAtRef.current >= LEFT_PINCH.releaseHoldMs) {
          const releasedFinger = leftFingerStringRef.current;
          leftFingerStringRef.current = null;
          leftFingerReleaseAtRef.current = 0;
          setLeftFingerString(null);
          ([0, 1, 2] as StringIndex[]).forEach((string) => onSelectFret(string, 0));

          // String 1 supports a left-hand pull-off: releasing the index finger
          // plucks the open string once without waiting for the right hand.
          if (releasedFinger === 0 && leftFretActiveRef.current) onPluck(0, 0);
        }
      }
    } else if (detectedFinger === leftFingerStringRef.current) {
      leftFingerReleaseAtRef.current = 0;
      leftFingerCandidateRef.current = null;
      leftFingerCandidateAtRef.current = 0;
    } else if (detectedFinger !== leftFingerCandidateRef.current) {
      leftFingerReleaseAtRef.current = 0;
      leftFingerCandidateRef.current = detectedFinger;
      leftFingerCandidateAtRef.current = now;
    } else if (now - leftFingerCandidateAtRef.current >= LEFT_PINCH.holdMs) {
      const previousFinger = leftFingerStringRef.current;
      leftFingerStringRef.current = detectedFinger;
      leftFingerReleaseAtRef.current = 0;
      leftFingerCandidateRef.current = null;
      leftFingerCandidateAtRef.current = 0;
      setLeftFingerString(detectedFinger);
      ([0, 1, 2] as StringIndex[]).forEach((string) => onSelectFret(string, string === detectedFinger ? fretPreviewRef.current : 0));

      const autoFret = leftFretActiveRef.current ? fretPreviewRef.current : 0;

      // Releasing the index still performs string 1's open-string pull-off,
      // including when the player switches directly to another finger.
      if (previousFinger === 0 && detectedFinger !== 0 && leftFretActiveRef.current) {
        onPluck(0, 0);
      }

      // Every newly pinched finger plucks its mapped string at the wrist fret.
      // Middle/ring releases intentionally stay silent; only string 1 has the
      // open-string sound handled above and in the null-release branch.
      onPluck(detectedFinger, autoFret);
    }

    const palm = averageLandmarks(left.landmarks, PALM_ANCHOR);
    const viewPoint = projectToView(palm, videoRef.current, canvasRef.current, mirrored);
    const smoothed = smoothLandmark(leftSmoothedRef.current, viewPoint, 0.24);
    leftSmoothedRef.current = smoothed;

    const nextFret = detectFret(smoothed, fretPreviewRef.current);
    if (nextFret === null) {
      if (!leftZoneLostAtRef.current) leftZoneLostAtRef.current = now;
      if (now - leftZoneLostAtRef.current > 140) resetLeftFretToOpenString();
      return;
    }

    leftZoneLostAtRef.current = 0;
    if (!leftFretActiveRef.current) {
      leftFretActiveRef.current = true;
      setLeftFretActive(true);
    }
    if (nextFret !== fretPreviewRef.current) {
      fretPreviewRef.current = nextFret;
      setFretPreview(nextFret);
      const pressedString = leftFingerStringRef.current;
      ([0, 1, 2] as StringIndex[]).forEach((string) => onSelectFret(string, string === pressedString ? nextFret : 0));
    }
  }, [mirrored, onPluck, onSelectFret, resetLeftFretToOpenString, tracker.hands]);

  useEffect(() => {
    const right = findHandForSideZone(tracker.hands, "Right", videoRef.current, canvasRef.current, mirrored);
    const now = performance.now();
    if (!right) {
      if (!rightLostAtRef.current) rightLostAtRef.current = now;
      if (now - rightLostAtRef.current <= 220) return;
      rightSmoothedRef.current = null;
      previousRightRef.current = null;
      rightFrameAtRef.current = 0;
      selectedStringRef.current = null;
      rightPinchingRef.current = false;
      queueMicrotask(() => {
        setSelectedString(null);
        setRightPinching(false);
        updatePluckState("idle");
      });
      return;
    }
    rightLostAtRef.current = 0;

    const focus = detectRightPinchFocus(right.landmarks, rightPinchingRef.current);
    if (!focus) {
      rightPinchingRef.current = false;
      rightSmoothedRef.current = null;
      previousRightRef.current = null;
      rightFrameAtRef.current = 0;
      selectedStringRef.current = null;
      queueMicrotask(() => {
        setRightPinching(false);
        setSelectedString(null);
        updatePluckState("idle");
      });
      return;
    }
    if (!rightPinchingRef.current) {
      rightPinchingRef.current = true;
      setRightPinching(true);
    }

    const viewPoint = projectToView(focus, videoRef.current, canvasRef.current, mirrored);
    const smoothed = smoothLandmark(rightSmoothedRef.current, viewPoint, 0.62);
    const elapsedMs = rightFrameAtRef.current ? Math.min(now - rightFrameAtRef.current, 90) : 0;
    const nextString = detectString(smoothed, selectedStringRef.current);

    if (nextString !== selectedStringRef.current) {
      selectedStringRef.current = nextString;
      setSelectedString(nextString);
    }

    const pluckedString = detectPluck({
      previous: previousRightRef.current,
      current: smoothed,
      elapsedMs,
      now,
      lastPluckAt: lastPluckAtRef.current,
    });

    if (pluckedString !== null) {
      lastPluckAtRef.current = now;
      selectedStringRef.current = pluckedString;
      setSelectedString(pluckedString);
      updatePluckState("pluck");
      const playedFret = leftFretActiveRef.current && leftFingerStringRef.current === pluckedString
        ? fretPreviewRef.current
        : 0;
      onPluck(pluckedString, playedFret);
      if (pluckTimerRef.current) window.clearTimeout(pluckTimerRef.current);
      pluckTimerRef.current = window.setTimeout(() => updatePluckState("ready"), 180);
    } else if (pluckStateRef.current !== "pluck") {
      updatePluckState("ready");
    }

    previousRightRef.current = smoothed;
    rightSmoothedRef.current = smoothed;
    rightFrameAtRef.current = now;
  }, [mirrored, onPluck, tracker.hands]);

  useEffect(() => {
    leftSmoothedRef.current = null;
    leftLostAtRef.current = 0;
    leftZoneLostAtRef.current = 0;
    leftFretActiveRef.current = false;
    fretPreviewRef.current = 0;
    leftFingerStringRef.current = null;
    leftFingerCandidateRef.current = null;
    leftFingerCandidateAtRef.current = 0;
    leftFingerReleaseAtRef.current = 0;
    queueMicrotask(() => {
      setLeftFretActive(false);
      setFretPreview(0);
      setLeftFingerString(null);
      ([0, 1, 2] as StringIndex[]).forEach((string) => onSelectFret(string, 0));
    });
    rightSmoothedRef.current = null;
    previousRightRef.current = null;
    rightFrameAtRef.current = 0;
    rightLostAtRef.current = 0;
    rightPinchingRef.current = false;
  }, [isLive, mirrored, onSelectFret]);

  useEffect(() => () => {
    if (pluckTimerRef.current) window.clearTimeout(pluckTimerRef.current);
  }, []);

  const startCamera = () => {
    onUnlockAudio();
    void camera.start(defaultFacing);
  };

  const effectiveFret = leftFretActive && leftFingerString !== null ? fretPreview : 0;
  const focusedNote = rightPinching && selectedString !== null
    ? { string: selectedString, fret: leftFingerString === selectedString ? effectiveFret : 0 }
    : undefined;

  return (
    <section className={`ui-panel camera-panel ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">เล่นด้วยกล้อง</h2><p className="text-sm text-slate-600">{standaloneMode ? "AR ควบคุมด้วยมือจริง · ประมวลผลบนเครื่อง" : "ทางเลือกเสริม · ใช้ปุ่มด้านบนได้เสมอ"}</p></div>
        <button type="button" onClick={isLive || camera.phase === "requesting" ? camera.stop : startCamera} className="ui-button"><CameraIcon className="size-4" />{camera.phase === "requesting" ? "ยกเลิกการเปิดกล้อง" : isLive ? "หยุดกล้อง" : "เปิดกล้อง"}</button>
      </div>
      <p role="status" className="mb-3 text-sm text-slate-700">{camera.phase === "requesting" ? "กำลังขออนุญาตใช้กล้องจากเบราว์เซอร์…" : isLive && (tracker.phase === "loading" || tracker.phase === "idle") ? "กำลังโหลดระบบตรวจจับมือ… ครั้งแรกอาจใช้เวลาสักครู่" : isLive && tracker.phase === "tracking" ? "กล้องพร้อม · วางมือทั้งสองให้เห็นในภาพ" : "ไม่บันทึกหรือส่งภาพกล้องขึ้นเซิร์ฟเวอร์"}</p>
      {(camera.error || (isLive && tracker.error)) && <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">{camera.error ?? tracker.error} · {standaloneMode ? "สลับกลับไปโหมดแตะโน้ตได้" : "ใช้ปุ่มดีดสายด้านบนต่อได้"}</p>}
      <div className={`camera-stage relative min-w-0 overflow-hidden rounded-2xl bg-[#1d1d1f] ${isLive ? "h-[min(60svh,420px)] min-h-[280px] sm:h-[500px]" : "hidden"}`}>
      <video ref={videoRef} muted playsInline className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${mirrored ? "scale-x-[-1]" : "scale-x-100"} ${isLive ? "opacity-100" : "opacity-0"}`} />
      <canvas ref={canvasRef} aria-label="จุดติดตามมือสำหรับเล่นพิณ" className="pointer-events-none absolute inset-0 z-20 size-full" />
      {!isLive && <div className="studio-grid absolute inset-0 opacity-30" />}

      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          {isLive && expected && <span className="max-w-[190px] rounded-xl bg-black/85 px-3 py-2 text-xs font-semibold text-white">เป้าหมาย: สาย {expected.string + 1} · เฟรต {expected.fret}</span>}
          {isLive && tracker.phase === "tracking" && <span className="hidden rounded-full bg-black/85 px-3 py-2 text-xs text-white sm:block">{camera.facing === "user" ? "กล้องหน้า · กระจก" : "กล้องหลัง · ภาพจริง"} · {tracker.hands.length}/2 มือ</span>}
        </div>
        {isLive && <button type="button" onClick={camera.flip} aria-label="สลับกล้อง" className="grid size-11 place-items-center rounded-full border border-white/45 bg-black/75 text-white backdrop-blur-sm hover:bg-black/90"><FlipIcon className="size-4" /></button>}
      </div>

      {isLive && tracker.phase === "tracking" && tracker.hands.length === 0 && <div className="pointer-events-none absolute inset-x-3 top-[13%] z-10 flex items-center gap-2 rounded-xl border border-white/30 bg-black/85 px-3 py-2 text-xs text-white"><HandIcon className="size-4 shrink-0 text-[#f1cb8c]" />วางมือซ้ายและขวาในภาพ</div>}

      {isLive && (
        <div className="pointer-events-none absolute inset-0 z-[25] text-white">
          <div className="absolute left-3 top-[23%] flex max-w-[42%] flex-col items-start gap-1.5">
            <div className="rounded-xl border border-white/25 bg-black/85 px-2 py-2 shadow-sm">
              <p className="text-xs text-white">มือซ้าย · {leftVisible ? "พบมือ" : "ไม่พบมือ"}</p>
              <p className="mt-1 text-xs font-semibold">{leftFretActive ? leftFingerString === null ? `เฟรต ${fretPreview} · รอจีบ` : `สาย ${leftFingerString + 1} · เฟรต ${fretPreview}` : "เฟรต 0 · สายเปล่า"}</p>
            </div>
          </div>

          <div aria-hidden="true" className="absolute left-3 top-[43%] hidden h-9 w-[43%] grid-cols-7 rounded-xl border border-white/20 bg-black/85 p-1 sm:grid">
            {FRET_LABELS.map((fret) => <div key={fret} className="grid place-items-center"><span className={`grid size-6 place-items-center rounded-full text-xs font-semibold transition ${fretPreview === fret ? "bg-[#e5aa5f] text-[#3b250f]" : "text-white"}`}>{fret}</span></div>)}
          </div>

          <div className={`absolute right-3 top-[23%] max-w-[44%] rounded-xl border px-2 py-2 text-right shadow-sm ${pluckState === "pluck" ? "border-[#ffd393] bg-[#74451f]" : rightPinching ? "border-[#a8ddb5] bg-[#315c3d]" : "border-white/25 bg-black/85"}`}>
            <p className="text-xs text-white">มือขวา · {rightVisible ? "พบมือ" : "ไม่พบมือ"}</p>
            <p className="mt-1 text-xs font-semibold">{!rightVisible ? "วางมือในภาพ" : !rightPinching ? "จีบโป้งกับชี้" : pluckState === "pluck" && selectedString !== null ? `ดีดสาย ${selectedString + 1}` : "ลากผ่านสาย"}</p>
          </div>

          <div className="absolute inset-0">
            {RIGHT_PLUCK_ZONE.stringY.map((lineY, string) => {
              const active = selectedString === string;
              return <div key={string} className={`absolute right-3 flex h-12 w-[32%] -translate-y-1/2 items-center rounded-xl px-2 transition ${active ? "bg-[#3f7450]/35" : ""}`} style={{ top: `${lineY * 100}%` }}><div className={`h-[2px] flex-1 transition-all ${active ? "bg-[#fff1cf] shadow-[0_0_14px_rgba(255,238,196,.95)]" : "bg-white"}`} /><span className="ml-2 whitespace-nowrap rounded bg-black/85 px-1 py-1 text-xs font-semibold text-white">สาย {string + 1}</span></div>;
            })}
          </div>
        </div>
      )}

      <VirtualPhinInstrument frets={frets} activeString={activeString} expected={expected} locked={focusedNote} cameraActive={isLive} />

      <div className="absolute bottom-3 left-3 z-30 rounded-full bg-black/85 px-3 py-1 text-xs text-white"><span className="inline-flex items-center gap-1"><ShieldIcon className="size-3" />ประมวลผลบนเครื่อง</span></div>
    </div>
    <details className="mt-3 text-sm leading-6 text-slate-700"><summary className="min-h-11 cursor-pointer font-semibold">วิธีควบคุมด้วยมือ</summary><ul className="mt-2 list-disc space-y-2 pl-5"><li>ข้อมือซ้ายเลื่อนซ้าย–ขวาเพื่อเลือกเฟรต 0–6</li><li>จีบโป้งกับนิ้วชี้/กลาง/นางซ้าย เพื่อเล่นสาย 1/2/3 โดยอัตโนมัติ</li><li>ปล่อยนิ้วชี้ซ้ายจะเล่นสาย 1 เฟรต 0; ปล่อยนิ้วกลาง/นางไม่มีเสียง</li><li>มือขวาจีบโป้งกับนิ้วชี้ค้าง แล้วลากผ่านสายที่ต้องการ</li><li>หากไม่จับเฟรตด้วยมือซ้าย จะเป็นสายเปล่า</li></ul></details>
    </section>
  );
}
