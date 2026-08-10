"use client";

import { useEffect, useRef } from "react";
import { CameraIcon, FlipIcon, HandIcon, ShieldIcon } from "@/components/icons";
import { useCamera } from "@/hooks/useCamera";
import { useHandTracking } from "@/hooks/useHandTracking";
import type { StringIndex } from "@/data/songs";
import { VirtualPinInstrument } from "./VirtualPinInstrument";

const STRING_Y = [0.475, 0.57, 0.665];

type Props = {
  frets: [number, number, number];
  activeString: StringIndex | null;
  expected?: { string: StringIndex; fret: number };
  onSelectFret: (string: StringIndex, fret: number) => void;
  onPluck: (string: StringIndex) => void;
  onUnlockAudio: () => void;
  onFingeredFrets: (frets: [number, number, number]) => void;
};

export function VirtualPinCamera({ frets, activeString, expected, onSelectFret, onPluck, onUnlockAudio, onFingeredFrets }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useCamera(videoRef);
  const tracker = useHandTracking(videoRef, canvasRef, camera.phase === "ready");
  const pinchActiveRef = useRef(false);
  const fretKeyRef = useRef("");
  const isLive = camera.phase === "ready";

  useEffect(() => {
    const right = tracker.hands.find((hand) => hand.side === "Right");
    if (!right) {
      pinchActiveRef.current = false;
      return;
    }
    const thumb = right.landmarks[4];
    const index = right.landmarks[8];
    const distance = Math.hypot(thumb.x - index.x, thumb.y - index.y);
    if (distance < 0.075 && !pinchActiveRef.current) {
      const y = (thumb.y + index.y) / 2;
      const closest = STRING_Y.reduce((best, value, current) => Math.abs(value - y) < Math.abs(STRING_Y[best] - y) ? current : best, 0);
      if (Math.abs(STRING_Y[closest] - y) < 0.07) onPluck(closest as StringIndex);
      pinchActiveRef.current = true;
    } else if (distance > 0.105) {
      pinchActiveRef.current = false;
    }
  }, [onPluck, tracker.hands]);

  useEffect(() => {
    const left = tracker.hands.find((hand) => hand.side === "Left");
    if (!left) return;
    const next: [number, number, number] = [...frets];
    let detected = false;
    for (const tipIndex of [8, 12, 16, 20]) {
      const tip = left.landmarks[tipIndex];
      const x = 1 - tip.x;
      const string = STRING_Y.reduce((best, value, current) => Math.abs(value - tip.y) < Math.abs(STRING_Y[best] - tip.y) ? current : best, 0);
      if (Math.abs(STRING_Y[string] - tip.y) < 0.065 && x >= 0.17 && x <= 0.72) {
        next[string] = Math.max(0, Math.min(6, Math.round((x - 0.17) / 0.092)));
        detected = true;
      }
    }
    const key = next.join("-");
    if (detected && key !== fretKeyRef.current) {
      fretKeyRef.current = key;
      onFingeredFrets(next);
    }
  }, [frets, onFingeredFrets, tracker.hands]);

  const startCamera = () => {
    onUnlockAudio();
    void camera.start();
  };

  return (
    <div className="relative min-h-[500px] overflow-hidden rounded-[28px] border border-white/10 bg-[#081318] shadow-[0_24px_80px_rgba(0,0,0,.35)] max-sm:min-h-[470px]">
      <video ref={videoRef} muted playsInline className={`absolute inset-0 size-full scale-x-[-1] object-cover transition-opacity duration-500 ${isLive ? "opacity-65" : "opacity-0"}`} />
      <canvas ref={canvasRef} aria-label="โครงกระดูกมือจาก AI" className="pointer-events-none absolute inset-0 z-20 size-full" />
      <div className="studio-grid absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,.68)_110%)]" />
      {isLive && <div className="scanline pointer-events-none absolute inset-x-0 top-0 h-1/2" />}

      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent p-4 pb-10">
        <div className="flex items-center gap-2">
          <button type="button" onClick={isLive ? camera.stop : startCamera} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-medium backdrop-blur ${isLive ? "border-emerald-300/25 bg-emerald-400/15 text-emerald-200" : "border-white/15 bg-black/30 text-white/75 hover:bg-white/10"}`}><CameraIcon className="size-4" /><span className={`size-1.5 rounded-full ${isLive ? "animate-pulse bg-emerald-300" : "bg-white/30"}`} />{isLive ? "หยุดกล้อง" : "เปิดกล้อง AR"}</button>
          {tracker.phase === "tracking" && <span className="hidden rounded-full bg-black/35 px-3 py-2 text-[10px] text-white/55 sm:block">{tracker.hands.length}/2 มือ · {tracker.fps} FPS</span>}
        </div>
        {isLive && <button type="button" onClick={camera.flip} aria-label="สลับกล้อง" className="grid size-9 place-items-center rounded-full border border-white/15 bg-black/30 text-white/70 backdrop-blur hover:bg-white/10"><FlipIcon className="size-4" /></button>}
      </div>

      {!isLive && (
        <div className="absolute inset-x-0 top-[15%] z-10 text-center">
          <p className="text-xs font-semibold tracking-[.18em] text-emerald-300/65">VIRTUAL INSTRUMENT READY</p>
          <p className="mt-2 text-sm text-white/45">เล่นด้วยการแตะได้ทันที หรือเปิดกล้องเพื่อใช้มือจริง</p>
        </div>
      )}
      {isLive && tracker.phase === "tracking" && tracker.hands.length === 0 && <div className="pointer-events-none absolute left-1/2 top-[18%] z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-[11px] text-white/65 backdrop-blur"><HandIcon className="size-4 text-emerald-300" />ยกมือให้อยู่เหนือพิณ</div>}

      <VirtualPinInstrument frets={frets} activeString={activeString} expected={expected} onSelectFret={onSelectFret} onPluck={onPluck} />

      <div className="absolute inset-x-4 bottom-3 z-30 flex items-center justify-between text-[9px] text-white/30"><span className="inline-flex items-center gap-1"><ShieldIcon className="size-3" />ประมวลผลบนเครื่อง</span><span>{isLive ? "จีบนิ้วโป้ง–นิ้วชี้แล้วแตะผ่านสายเพื่อดีด" : "เปิดกล้องเพื่อใช้ Hand Tracking"}</span></div>
      {(camera.error || tracker.error) && <div className="absolute inset-x-4 bottom-10 z-40 rounded-xl border border-red-300/20 bg-red-950/80 px-4 py-3 text-xs text-red-100">{camera.error ?? tracker.error}</div>}
    </div>
  );
}
