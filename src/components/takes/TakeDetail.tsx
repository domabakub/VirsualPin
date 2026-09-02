"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/navigation/AppHeader";
import { PlayIcon } from "@/components/icons";
import { usePhinAudio } from "@/hooks/usePhinAudio";
import { deleteQuickTake, getQuickTake, saveQuickTake } from "@/lib/takes/storage";
import { formatTakeDuration, type QuickTake } from "@/lib/takes/types";
import { TakeTimeline } from "./TakeTimeline";

export function TakeDetail({ id }: { id: string }) {
  const router = useRouter();
  const [take, setTake] = useState<QuickTake | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [playing, setPlaying] = useState(false);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const timersRef = useRef<number[]>([]);
  const startedAtRef = useRef(0);
  const { unlock, pluck, status: audioStatus } = usePhinAudio();

  const stopPlayback = useCallback(() => {
    timersRef.current.forEach(timer => window.clearTimeout(timer));
    timersRef.current = [];
    setPlaying(false);
  }, []);

  useEffect(() => {
    void getQuickTake(id).then(value => { setTake(value); setName(value?.name ?? ""); setLoading(false); });
  }, [id]);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  useEffect(() => {
    if (!playing || !take) return;
    const timer = window.setInterval(() => setPlayheadMs(Math.min(take.durationMs, performance.now() - startedAtRef.current)), 40);
    return () => window.clearInterval(timer);
  }, [playing, take]);

  const playTake = async () => {
    if (playing) { stopPlayback(); return; }
    if (!take || !(await unlock())) return;
    stopPlayback();
    setPlayheadMs(0);
    setPlaying(true);
    startedAtRef.current = performance.now();
    take.notes.forEach(note => {
      timersRef.current.push(window.setTimeout(() => { void pluck(note.string, note.fret); }, note.onsetMs));
    });
    timersRef.current.push(window.setTimeout(() => { setPlayheadMs(take.durationMs); setPlaying(false); }, take.durationMs + 80));
  };

  const rename = async (event: FormEvent) => {
    event.preventDefault();
    if (!take || !name.trim()) return;
    const saved = await saveQuickTake({ ...take, name: name.trim().slice(0, 80), updatedAt: Date.now() });
    setTake(saved);
    setName(saved.name);
  };

  if (loading) return <div className="practice-page"><AppHeader studio studioBackHref="/takes" studioBackLabel="กลับไปบันทึกของฉัน" /><main id="main-content" className="take-detail-main"><p>กำลังเปิดบันทึก…</p></main></div>;
  if (!take) return <div className="practice-page"><AppHeader studio studioBackHref="/takes" studioBackLabel="กลับไปบันทึกของฉัน" /><main id="main-content" className="take-detail-main take-missing"><h1>ไม่พบบันทึกนี้</h1><p>บันทึกอาจถูกลบหรืออยู่ในอุปกรณ์เครื่องอื่น</p><Link href="/takes" className="ui-button ui-primary">กลับไปบันทึกของฉัน</Link></main></div>;

  return <div className="practice-page">
    <AppHeader studio studioBackHref="/takes" studioBackLabel="กลับไปบันทึกของฉัน" />
    <main id="main-content" tabIndex={-1} className="take-detail-main">
      <Link href="/takes" className="take-back">‹ บันทึกของฉัน</Link>
      <header className="take-detail-heading">
        <div><p className="eyebrow">QUICK TAKE</p><h1>{take.name}</h1><p>{take.notes.length} โน้ต · {formatTakeDuration(take.durationMs)}{take.bpm ? ` · ${take.bpm} BPM` : " · จังหวะอิสระ"}</p></div>
        <div className="take-detail-actions"><button type="button" className="ui-button ui-primary" onClick={() => { void playTake(); }}>{playing ? "หยุด" : <><PlayIcon aria-hidden="true" />ฟังย้อนหลัง</>}</button><Link href={`/takes/${take.id}/practice`} className="ui-button">ฝึกตาม</Link></div>
      </header>

      <section className="ui-panel take-review-panel">
        <div className="take-review-top"><div><h2>Phin Tab</h2><p>เลขคือเฟรต ตำแหน่งแนวนอนคือเวลาที่เล่น</p></div><span>{audioStatus === "ready" ? "เสียงพร้อม" : "แตะฟังเพื่อเปิดเสียง"}</span></div>
        <TakeTimeline take={take} playheadMs={playheadMs} />
      </section>

      <section className="take-detail-lower">
        <form className="ui-panel take-rename" onSubmit={rename}><h2>ชื่อบันทึก</h2><label><span>เปลี่ยนชื่อเพื่อให้กลับมาหาง่าย</span><input value={name} maxLength={80} onChange={event => setName(event.target.value)} /></label><button type="submit" className="ui-button">บันทึกชื่อ</button></form>
        <section className="ui-panel take-next-actions"><h2>ทำอะไรต่อ</h2><Link href={`/takes/${take.id}/practice`} className="ui-button ui-primary">ฝึกจากโน้ตชุดนี้</Link><Link href="/studio" className="ui-button">เปิด Studio Mode</Link><button type="button" className="take-delete" onClick={() => setConfirmDelete(true)}>ลบบันทึกนี้</button>{confirmDelete && <div className="take-delete-confirm"><p>ลบบันทึกนี้ออกจากอุปกรณ์?</p><button type="button" className="ui-button" onClick={() => setConfirmDelete(false)}>ยกเลิก</button><button type="button" className="ui-button ui-primary" onClick={() => { void deleteQuickTake(take.id).then(() => router.push("/takes")); }}>ยืนยันลบ</button></div>}</section>
      </section>
    </main>
  </div>;
}
