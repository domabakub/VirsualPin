"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CameraIcon, FlipIcon, HandIcon, SettingsIcon, ShieldIcon } from "@/components/icons";
import { useArLayout } from "@/hooks/useArLayout";
import { mapToPluckZone, pluckStringPositions, stringPositions, type HudId } from "@/lib/ar-layout";
import { ArHudSurface, ArLayoutEditor } from "./ArLayoutEditor";
import { useCamera } from "@/hooks/useCamera";
import { useHandTracking } from "@/hooks/useHandTracking";
import type { StringIndex } from "@/data/songs";
import type { TrackedHand } from "@/lib/hand-tracking/types";
import {
  LEFT_PINCH,
  LEFT_FRET_ZONE,
  FRET_TRAVEL,
  averageLandmarks,
  detectFret,
  detectPinchedString,
  detectPluck,
  detectRightPinchFocus,
  detectString,
  getLeftPinchRatios,
  smoothLandmark,
  type CameraPoint,
  type FretSensitivity,
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
  modeSwitch?: ReactNode;
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
  stringArea?: { x: number; y: number; width: number; height: number },
) {
  const candidates = hands.map((hand) => ({
    hand,
    ...projectToView(hand.landmarks[9], video, view, mirrored),
  }));
  if (candidates.length === 2) {
    // Screen position remains stable when MediaPipe briefly flips hand labels.
    const ordered = candidates.sort((a, b) => a.x - b.x);
    return side === "Left" ? ordered[0].hand : ordered[1].hand;
  }
  const only = candidates[0];
  if (!only) return undefined;
  // A customized pluck area may be on the left of the screen. Keep a lone
  // right hand assigned to that area rather than to the old screen midpoint.
  if (stringArea && only.hand.side === "Right" && only.x >= stringArea.x - 0.08 && only.x <= stringArea.x + stringArea.width + 0.08 && only.y >= stringArea.y - 0.08 && only.y <= stringArea.y + stringArea.height + 0.08) {
    return side === "Right" ? only.hand : undefined;
  }
  // A single hand belongs to one control only. An identified left hand may
  // travel slightly past the center after calibrating fret zero.
  const controlSide = only.x < 0.5 || (only.hand.side === "Left" && only.x < 0.72) ? "Left" : "Right";
  return controlSide === side ? only.hand : undefined;
}

function getStringArea(stage: HTMLDivElement | null, strings: HTMLDivElement | null) {
  const bounds = stage?.getBoundingClientRect();
  const area = strings?.getBoundingClientRect();
  if (!bounds?.width || !bounds.height || !area) return undefined;
  return { x: (area.left - bounds.left) / bounds.width, y: (area.top - bounds.top) / bounds.height, width: area.width / bounds.width, height: area.height / bounds.height };
}

export function VirtualPhinCamera({ frets, activeString, expected, onSelectFret, onPluck, onUnlockAudio, defaultFacing = "user", onLiveChange, standaloneMode = false, className = "", modeSwitch }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stringsRef = useRef<HTMLDivElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const arLayout = useArLayout();
  const [selectedHud, setSelectedHud] = useState<HudId>("left");
  const camera = useCamera(videoRef);
  const mirrored = camera.facing === "user";
  const tracker = useHandTracking(videoRef, canvasRef, camera.phase === "ready" && !arLayout.editing, mirrored, "instrument");
  const isLive = camera.phase === "ready";
  const isExpanded = isLive || camera.phase === "requesting" || arLayout.editing;
  useEffect(() => { onLiveChange?.(isLive); }, [isLive, onLiveChange]);
  const [leftVisible, setLeftVisible] = useState(false);
  const rightVisible = tracker.hands.some((hand) => hand.side === "Right") || tracker.hands.length === 2;

  const [fretPreview, setFretPreview] = useState(0);
  const [leftFretActive, setLeftFretActive] = useState(false);
  const [leftFingerString, setLeftFingerString] = useState<StringIndex | null>(null);
  const [leftHint, setLeftHint] = useState("วางมือซ้ายด้านซ้ายของภาพ");
  const [fretSensitivity, setFretSensitivity] = useState<FretSensitivity>("normal");
  const [selectedString, setSelectedString] = useState<StringIndex | null>(null);
  const [rightPinching, setRightPinching] = useState(false);
  const [pluckState, setPluckState] = useState<PluckState>("idle");

  const fretPreviewRef = useRef(0);
  const leftFretActiveRef = useRef(false);
  const leftLostAtRef = useRef(0);
  const leftZoneLostAtRef = useRef(0);
  const leftSmoothedRef = useRef<CameraPoint | null>(null);
  const fretOriginRef = useRef<number>(LEFT_FRET_ZONE.minX);
  const calibrationMessageRef = useRef<{ text: string; until: number } | null>(null);
  const leftFingerStringRef = useRef<StringIndex | null>(null);
  const leftFingerCandidateRef = useRef<StringIndex | null>(null);
  const leftFingerCandidateAtRef = useRef(0);
  const leftFingerReleaseAtRef = useRef(0);
  const rightPinchingRef = useRef(false);
  const rightSmoothedRef = useRef<CameraPoint | null>(null);
  const previousRightRef = useRef<CameraPoint | null>(null);
  const rightGeometryRef = useRef("");
  const selectedStringRef = useRef<StringIndex | null>(null);
  const rightFrameAtRef = useRef(0);
  const rightLostAtRef = useRef(0);
  const lastPluckAtRef = useRef(-Infinity);
  const pluckStateRef = useRef<PluckState>("idle");
  const pluckTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem("virtual-phin:fret-sensitivity");
        if (saved === "low" || saved === "normal" || saved === "high") setFretSensitivity(saved);
      } catch { /* Private browsing may block storage. */ }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const changeSensitivity = (value: FretSensitivity) => {
    setFretSensitivity(value);
    try { window.localStorage.setItem("virtual-phin:fret-sensitivity", value); } catch { /* Session setting still works. */ }
  };

  const calibrateFret = () => {
    const palm = leftSmoothedRef.current;
    const maxOrigin = Math.min(0.43, 0.71 - FRET_TRAVEL[fretSensitivity]);
    if (!palm || palm.x < 0.02 || palm.x > maxOrigin) {
      const text = "วางมือซ้ายให้ชิดซ้ายอีกนิดก่อนตั้งเฟรต 0";
      calibrationMessageRef.current = { text, until: performance.now() + 1600 };
      setLeftHint(text);
      return;
    }
    fretOriginRef.current = palm.x;
    fretPreviewRef.current = 0;
    setFretPreview(0);
    ([0, 1, 2] as StringIndex[]).forEach((string) => onSelectFret(string, 0));
    const text = "ตั้งตำแหน่งนี้เป็นเฟรต 0 แล้ว";
    calibrationMessageRef.current = { text, until: performance.now() + 1200 };
    setLeftHint(text);
  };

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
    if (arLayout.editing) return;
    const left = findHandForSideZone(tracker.hands, "Left", videoRef.current, canvasRef.current, mirrored, getStringArea(stageRef.current, stringsRef.current));
    const now = performance.now();
    if (!left) {
      if (!leftLostAtRef.current) leftLostAtRef.current = now;
      leftZoneLostAtRef.current = 0;
      if (now - leftLostAtRef.current > 550) {
        leftSmoothedRef.current = null;
        setLeftVisible(false);
        setLeftHint("ไม่พบมือซ้ายในพื้นที่ควบคุม");
        resetLeftFretToOpenString();
      }
      return;
    }
    leftLostAtRef.current = 0;
    setLeftVisible(true);

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

    const nextFret = detectFret(smoothed, fretPreviewRef.current, fretOriginRef.current, FRET_TRAVEL[fretSensitivity]);
    if (nextFret === null) {
      if (!leftZoneLostAtRef.current) leftZoneLostAtRef.current = now;
      setLeftHint("พบมือแล้ว · ย้ายมือเข้าระดับกลางภาพ");
      if (now - leftZoneLostAtRef.current > 450) resetLeftFretToOpenString();
      return;
    }

    leftZoneLostAtRef.current = 0;
    if (calibrationMessageRef.current && now < calibrationMessageRef.current.until) {
      setLeftHint(calibrationMessageRef.current.text);
    } else if (leftFingerStringRef.current !== null) {
      setLeftHint(`ยืนยันนิ้วสาย ${leftFingerStringRef.current + 1} แล้ว`);
    } else if (leftFingerCandidateRef.current !== null) {
      setLeftHint(`กำลังยืนยันนิ้วสาย ${leftFingerCandidateRef.current + 1}`);
    } else {
      const closestRatio = Math.min(...getLeftPinchRatios(left.landmarks));
      setLeftHint(`เล็งเฟรต ${nextFret} · รอจีบ (ระยะนิ้ว ${closestRatio.toFixed(2)})`);
    }
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
  }, [arLayout.editing, fretSensitivity, mirrored, onPluck, onSelectFret, resetLeftFretToOpenString, tracker.hands]);

  useEffect(() => {
    if (arLayout.editing) return;
    const right = findHandForSideZone(tracker.hands, "Right", videoRef.current, canvasRef.current, mirrored, getStringArea(stageRef.current, stringsRef.current));
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

    const projected = projectToView(focus, videoRef.current, canvasRef.current, mirrored);
    const stageBounds = stageRef.current?.getBoundingClientRect();
    const stringBounds = stringsRef.current?.getBoundingClientRect();
    const stringY = pluckStringPositions(arLayout.layout.strings);
    const geometry = (stageBounds && stringBounds ? [stageBounds.width, stageBounds.height, stringBounds.left - stageBounds.left, stringBounds.top - stageBounds.top, stringBounds.width, stringBounds.height].map(value => Math.round(value)).join(":") : "") + stringY.join(":");
    if (rightGeometryRef.current !== geometry) {
      rightGeometryRef.current = geometry;
      previousRightRef.current = null;
      rightSmoothedRef.current = null;
      rightFrameAtRef.current = 0;
    }
    const viewPoint = stageBounds?.width && stageBounds.height && stringBounds
      ? mapToPluckZone(projected, {
        x: (stringBounds.left - stageBounds.left) / stageBounds.width,
        y: (stringBounds.top - stageBounds.top) / stageBounds.height,
        width: stringBounds.width / stageBounds.width,
        height: stringBounds.height / stageBounds.height,
      }) : projected;
    const smoothed = smoothLandmark(rightSmoothedRef.current, viewPoint, 0.62);
    const elapsedMs = rightFrameAtRef.current ? Math.min(now - rightFrameAtRef.current, 90) : 0;
    const nextString = detectString(smoothed, selectedStringRef.current, stringY);

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
      stringY,
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
  }, [arLayout.editing, arLayout.layout.strings, mirrored, onPluck, tracker.hands]);

  useEffect(() => {
    fretOriginRef.current = LEFT_FRET_ZONE.minX;
  }, [isLive, mirrored]);

  useEffect(() => {
    leftSmoothedRef.current = null;
    calibrationMessageRef.current = null;
    queueMicrotask(() => {
      setLeftVisible(false);
      setLeftHint("วางมือซ้ายด้านซ้ายของภาพ");
    });
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
    if (pluckTimerRef.current) window.clearTimeout(pluckTimerRef.current);
    lastPluckAtRef.current = -Infinity;
    queueMicrotask(() => { setSelectedString(null); setRightPinching(false); updatePluckState("idle"); });
  }, [arLayout.editing, isLive, mirrored, onSelectFret]);

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

  const finishEditing = (save: boolean) => {
    if (save) arLayout.save(); else arLayout.cancel();
    requestAnimationFrame(() => editButtonRef.current?.focus());
  };

  const renderHud = (id: HudId) => {
    switch (id) {
      case "status": return <div className="ar-status-pill"><span className={isLive ? "is-live" : ""} />{isLive ? `${camera.facing === "user" ? "กล้องหน้า" : "กล้องหลัง"} · ${tracker.hands.length}/2 มือ` : "ตัวอย่างหน้าจอ AR"}</div>;
      case "flip": return <button type="button" disabled={!isLive} onClick={camera.flip} aria-label="สลับกล้อง" className="ar-camera-button"><FlipIcon className="size-5" /></button>;
      case "left": return <div className="ar-hand-card"><p><HandIcon />มือซ้าย <span className={`ar-hand-dot ${leftVisible ? "is-live" : ""}`} /></p><strong>{leftFretActive ? leftFingerString === null ? `เฟรต ${fretPreview} · รอจีบ` : `สาย ${leftFingerString + 1} · เฟรต ${fretPreview}` : "เฟรต 0 · สายเปล่า"}</strong><small>{arLayout.editing ? "เลื่อนมือเพื่อเลือกเฟรต" : leftHint}</small></div>;
      case "right": return <div className={`ar-hand-card ${pluckState === "pluck" ? "is-plucking" : ""}`}><p><HandIcon />มือขวา <span className={`ar-hand-dot ${rightVisible ? "is-live" : ""}`} /></p><strong>{pluckState === "pluck" && selectedString !== null ? `ดีดสาย ${selectedString + 1}` : rightPinching ? "ลากผ่านสาย" : "จีบโป้งกับชี้"}</strong></div>;
      case "frets": return <div className="ar-fret-strip">{FRET_LABELS.map(fret => <span key={fret} className={fretPreview === fret ? "is-active" : ""}>{fret}</span>)}</div>;
      case "strings": return <div className="ar-strings">{arLayout.layout.strings.order.map(string => <div key={string} className={`ar-string-line ${selectedString === string ? "is-active" : ""}`} style={{ top: `${stringPositions(arLayout.layout.strings)[string] * 100}%` }}><i /><span>สาย {string + 1}</span></div>)}</div>;
      case "instrument": return <VirtualPhinInstrument frets={frets} activeString={activeString} expected={expected} locked={focusedNote} cameraActive stringOrder={arLayout.layout.strings.order} />;
      case "calibrate": return <button type="button" disabled={!isLive || !leftVisible} onClick={calibrateFret} className="ar-calibrate-button">ตั้งเฟรต 0 <span aria-hidden="true">⌖</span></button>;
    }
  };

  return (
    <div className={`camera-workspace ${isExpanded ? "is-expanded" : ""} ${arLayout.editing ? "is-layout-editing" : ""} ${className}`}>
    <div className="ar-workspace-body">
    <div className="ar-camera-column">
    <section className="ui-panel camera-panel">
      <div ref={stageRef} className="camera-stage relative min-w-0 overflow-hidden rounded-2xl bg-[#1d1d1f]">
      <video ref={videoRef} muted playsInline className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${mirrored ? "scale-x-[-1]" : "scale-x-100"} ${isLive ? "opacity-100" : "opacity-0"}`} />
      <canvas ref={canvasRef} aria-label="จุดติดตามมือสำหรับเล่นพิณ" className="pointer-events-none absolute inset-0 z-20 size-full" />
      {camera.phase === "requesting" && <div className="camera-loading absolute inset-0 z-10 grid place-items-center text-sm text-white">กำลังเปิดกล้อง…</div>}
      {!isLive && <div className="studio-grid absolute inset-0 opacity-30" />}

      {arLayout.editing && <div className="ar-layout-grid" aria-hidden="true"><span>พื้นที่จัดวางของคุณ</span></div>}
      {isLive && expected && <span className="ar-expected-note">เป้าหมาย: สาย {expected.string + 1} · เฟรต {expected.fret}</span>}
      {(isLive || arLayout.editing) && <ArHudSurface layout={arLayout.layout} editing={arLayout.editing} selected={selectedHud} onSelect={setSelectedHud} onUpdate={arLayout.update} stringsRef={stringsRef}>{renderHud}</ArHudSurface>}
      <div className="absolute bottom-3 left-3 z-30 rounded-full bg-black/85 px-3 py-1 text-xs text-white"><span className="inline-flex items-center gap-1"><ShieldIcon className="size-3" />ประมวลผลบนเครื่อง</span></div>
    </div>
    </section>
      <div className="play-mode-toolbar">
        {!arLayout.editing && modeSwitch}
        <div className="play-mode-toolbar-copy"><h2>เล่นด้วยกล้อง</h2><p>{standaloneMode ? "AR ควบคุมด้วยมือจริง · ประมวลผลบนเครื่อง" : "ทางเลือกเสริม · ใช้ปุ่มด้านบนได้เสมอ"}</p></div>
        {arLayout.editing ? <><div className="ar-edit-banner"><SettingsIcon className="size-4" /><strong>จัดวางหน้าจอ</strong><span>ลากเพื่อย้าย · พักการตรวจจับมือ</span></div><div className="ar-quick-actions"><button type="button" className="ui-button" onClick={() => finishEditing(false)}>ยกเลิก</button><button type="button" className="ui-button ui-primary" onClick={() => finishEditing(true)}>บันทึก</button></div></> : <>
          <button ref={editButtonRef} type="button" disabled={!arLayout.ready} onClick={arLayout.begin} className="ui-button ar-edit-trigger"><SettingsIcon className="size-4" />จัดวางหน้าจอ</button>
          <button type="button" onClick={isLive || camera.phase === "requesting" ? camera.stop : startCamera} className="ui-button"><CameraIcon className="size-4" />{camera.phase === "requesting" ? "ยกเลิกการเปิดกล้อง" : isLive ? "หยุดกล้อง" : "เปิดกล้อง"}</button>
        </>}
      </div>
      {arLayout.message && <p role="status" className="ar-layout-message">{arLayout.message}</p>}
      <p role="status" className="ar-camera-status">{arLayout.editing ? "พักการตรวจจับมือระหว่างจัดวางหน้าจอ" : camera.phase === "requesting" ? "กำลังขออนุญาตใช้กล้องจากเบราว์เซอร์…" : isLive && (tracker.phase === "loading" || tracker.phase === "idle") ? "กำลังโหลดระบบตรวจจับมือ… ครั้งแรกอาจใช้เวลาสักครู่" : isLive && tracker.phase === "tracking" ? "กล้องพร้อม · วางมือทั้งสองให้เห็นในภาพ" : "ไม่บันทึกหรือส่งภาพกล้องขึ้นเซิร์ฟเวอร์"}</p>
      {(camera.error || (isLive && tracker.error)) && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">{camera.error ?? tracker.error} · {standaloneMode ? "สลับกลับไปโหมดแตะโน้ตได้" : "ใช้ปุ่มดีดสายด้านบนต่อได้"}</p>}
    </div>
    {arLayout.editing && <ArLayoutEditor layout={arLayout.layout} selected={selectedHud} onSelect={setSelectedHud} onUpdate={arLayout.update} onReset={arLayout.reset} onSave={() => finishEditing(true)} onCancel={() => finishEditing(false)} onApplyAppearance={arLayout.applyAppearance} />}
    </div>
    <details className="ui-panel camera-settings text-sm text-slate-700">
    <summary className="min-h-11 cursor-pointer font-semibold">ตั้งค่ามือและวิธีควบคุม</summary>
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-700">
      <label htmlFor="fret-sensitivity" className="font-semibold">ความไวเฟรต</label>
      <select id="fret-sensitivity" value={fretSensitivity} onChange={(event) => changeSensitivity(event.target.value as FretSensitivity)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3">
        <option value="low">ต่ำ · เลื่อนกว้าง</option><option value="normal">ปกติ</option><option value="high">สูง · เลื่อนสั้น</option>
      </select>
      <button type="button" disabled={!isLive || !leftVisible} onClick={calibrateFret} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50">ตั้งตำแหน่งนี้เป็นเฟรต 0</button>
      <span className="text-xs text-slate-600">วางมือซ้ายใกล้จุดเริ่มก่อนกด แล้วเลื่อนไปทางขวา</span>
    </div>
    <details className="mt-3 text-sm leading-6 text-slate-700"><summary className="min-h-11 cursor-pointer font-semibold">วิธีควบคุมด้วยมือ</summary><ul className="mt-2 list-disc space-y-2 pl-5"><li>วางมือซ้ายด้านซ้ายของภาพ กดตั้งเฟรต 0 แล้วเลื่อนไปทางขวาเพื่อเลือกเฟรต 0–6</li><li>จีบโป้งกับนิ้วชี้/กลาง/นางซ้าย เพื่อเล่นสาย 1/2/3 โดยอัตโนมัติ</li><li>ปล่อยนิ้วชี้ซ้ายจะเล่นสาย 1 เฟรต 0; ปล่อยนิ้วกลาง/นางไม่มีเสียง</li><li>มือขวาจีบโป้งกับนิ้วชี้ค้าง แล้วลากผ่านสายที่ต้องการ</li><li>หากไม่จับเฟรตด้วยมือซ้าย จะเป็นสายเปล่า</li></ul></details>
    </details>
    </div>
  );
}
