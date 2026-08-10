"use client";

import { useRef } from "react";
import { CameraIcon, FlipIcon, HandIcon, ShieldIcon } from "@/components/icons";
import { useCamera } from "@/hooks/useCamera";
import { useHandTracking } from "@/hooks/useHandTracking";
import { HandStatus } from "./HandStatus";

export function CameraStage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useCamera(videoRef);
  const tracker = useHandTracking(videoRef, canvasRef, camera.phase === "ready");
  const isLive = camera.phase === "ready";
  const message = camera.error ?? tracker.error;

  return (
    <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px] gap-4 max-[900px]:grid-cols-1">
      <div className="glass relative min-h-[520px] overflow-hidden rounded-[28px] max-sm:min-h-[480px]">
        <video ref={videoRef} muted playsInline className={`absolute inset-0 size-full scale-x-[-1] object-cover transition-opacity duration-700 ${isLive ? "opacity-100" : "opacity-0"}`} />
        <canvas ref={canvasRef} aria-label="โครงกระดูกมือที่ตรวจจับได้" className="pointer-events-none absolute inset-0 size-full" />

        <div className="studio-grid absolute inset-0 -z-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(2,8,10,.7)_125%)]" />
        {isLive && <div className="scanline pointer-events-none absolute inset-x-0 top-0 h-1/2" />}

        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent p-5 pb-12">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs backdrop-blur-md">
            <span className={`size-2 rounded-full ${isLive ? "animate-pulse bg-emerald-400" : "bg-white/30"}`} />
            {isLive ? "CAMERA LIVE" : "CAMERA OFF"}
          </div>
          <div className="flex items-center gap-2">
            {tracker.phase === "tracking" && <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs text-white/65 backdrop-blur-md">{tracker.fps} FPS · 21 จุด/มือ</span>}
            {isLive && <button type="button" onClick={camera.flip} title="สลับกล้อง" className="grid size-9 place-items-center rounded-full border border-white/15 bg-black/40 text-white/80 backdrop-blur-md transition hover:bg-white/15 hover:text-white"><FlipIcon className="size-4" /></button>}
          </div>
        </div>

        {!isLive && (
          <div className="absolute inset-0 grid place-items-center p-6">
            <div className="max-w-sm text-center">
              <div className="relative mx-auto mb-6 grid size-24 place-items-center rounded-[28px] border border-emerald-300/20 bg-emerald-300/8 text-emerald-300 shadow-[0_0_60px_rgba(62,224,130,.12)]">
                <CameraIcon className="size-10" />
                <span className="absolute -right-1 -top-1 size-4 rounded-full border-4 border-[#0b1519] bg-amber-400" />
              </div>
              <h2 className="text-2xl font-semibold">เตรียมพื้นที่สำหรับตรวจจับมือ</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">วางอุปกรณ์ให้นิ่ง ให้เห็นมือทั้งสองข้าง และมีแสงสว่างเพียงพอ</p>
              <button type="button" onClick={() => camera.start()} disabled={camera.phase === "requesting"} className="mt-6 inline-flex min-w-48 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-3.5 font-semibold text-[#052113] shadow-[0_12px_35px_rgba(55,219,124,.24)] transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60">
                <CameraIcon className="size-5" />
                {camera.phase === "requesting" ? "กำลังขออนุญาต…" : "เปิดกล้องเพื่อเริ่ม"}
              </button>
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/35"><ShieldIcon className="size-4" />ประมวลผลบนอุปกรณ์ ไม่บันทึกภาพ</div>
            </div>
          </div>
        )}

        {isLive && tracker.phase === "loading" && (
          <div className="absolute inset-0 grid place-items-center bg-black/35 backdrop-blur-sm">
            <div className="rounded-2xl border border-white/10 bg-black/55 px-5 py-4 text-sm"><span className="mr-3 inline-block size-3 animate-spin rounded-full border-2 border-emerald-300/30 border-t-emerald-300" />กำลังโหลด AI ตรวจจับมือ…</div>
          </div>
        )}

        {message && (
          <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-red-300/20 bg-red-950/75 px-4 py-3 text-sm text-red-100 backdrop-blur-md">{message}</div>
        )}

        {isLive && tracker.phase === "tracking" && tracker.hands.length === 0 && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center rounded-3xl border border-white/10 bg-black/35 px-8 py-5 text-center backdrop-blur-sm">
              <HandIcon className="mb-2 size-8 text-emerald-300/80" />
              <span className="font-medium">ยกมือทั้งสองให้อยู่ในกรอบ</span>
              <span className="mt-1 text-xs text-white/50">หันฝ่ามือเข้าหากล้อง แยกนิ้วเล็กน้อย</span>
            </div>
          </div>
        )}

        <div className="absolute inset-x-4 bottom-4 hidden max-[900px]:block">
          {isLive && <HandStatus hands={tracker.hands} />}
        </div>
      </div>

      <aside className="flex flex-col gap-4 max-[900px]:hidden">
        <div className="glass rounded-[24px] p-5">
          <p className="text-[11px] font-semibold tracking-[.18em] text-emerald-300/70">HAND TRACKING</p>
          <h2 className="mt-2 text-xl font-semibold">สถานะการตรวจจับ</h2>
          <p className="mt-1 text-sm leading-6 text-white/45">ระบบติดตามโครงสร้างมือ 21 จุดแบบ real-time</p>
        </div>
        <HandStatus hands={tracker.hands} vertical />
        <div className="glass mt-auto rounded-[24px] p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-300/10 text-emerald-300"><ShieldIcon className="size-5" /></span>
            <div><p className="text-sm font-medium">ข้อมูลเป็นส่วนตัว</p><p className="mt-1 text-xs leading-5 text-white/40">วิดีโอและข้อมูลมือประมวลผลภายในเบราว์เซอร์ ไม่มีการอัปโหลดขึ้นเซิร์ฟเวอร์</p></div>
          </div>
        </div>
      </aside>
    </section>
  );
}
