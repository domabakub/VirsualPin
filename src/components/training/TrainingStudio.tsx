import { PinLogo } from "@/components/icons";
import { CameraStage } from "./CameraStage";

export function TrainingStudio() {
  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-[1500px] flex-col px-5 py-4 max-sm:px-3 max-sm:py-3">
      <header className="mb-4 flex items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/8 text-amber-300"><PinLogo className="h-8 w-6" /></span>
          <div>
            <h1 className="text-lg font-semibold leading-tight tracking-[.04em]">VIRTUAL PIN</h1>
            <p className="mt-0.5 text-[11px] text-white/40">AI THAI MUSIC ACADEMY</p>
          </div>
        </div>

        <div className="glass rounded-full px-4 py-2 text-center max-sm:hidden">
          <span className="mr-2 text-xs text-white/40">ขั้นตอนที่ 1/4</span>
          <span className="text-sm font-medium">ตั้งค่ากล้องและตรวจจับมือ</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/45">
          <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#4ade80]" />
          <span className="max-sm:hidden">ระบบพร้อมใช้งาน</span>
        </div>
      </header>

      <CameraStage />

      <footer className="flex items-center justify-between gap-3 px-1 pt-3 text-[11px] text-white/30">
        <span>Milestone 01 · Computer Vision Foundation</span>
        <span>รองรับ iPad · iPhone · Android · Desktop</span>
      </footer>
    </main>
  );
}
