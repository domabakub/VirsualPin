"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeftIcon, ClockIcon, PlayIcon, VolumeIcon } from "@/components/icons";
import { AppBrand } from "@/components/navigation/AppBrand";
import type { Song, StringIndex } from "@/data/songs";
import { usePinAudio } from "@/hooks/usePinAudio";
import { VirtualPinCamera } from "./VirtualPinCamera";

const STRING_NAMES = ["สาย 1", "สาย 2", "สาย 3"];

export function VirtualPinStudio({ song, freePlay = false }: { song: Song; freePlay?: boolean }) {
  const [frets, setFrets] = useState<[number, number, number]>([0, 0, 0]);
  const [activeString, setActiveString] = useState<StringIndex | null>(null);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [practicing, setPracticing] = useState(false);
  const [metronome, setMetronome] = useState(false);
  const [feedback, setFeedback] = useState("แตะสายพิณเพื่อทดสอบเสียง หรือกดเริ่มฝึก");
  const activeTimer = useRef<number | null>(null);
  const { unlock, pluck, click } = usePinAudio();
  const expected = !freePlay ? song.notes[step] : undefined;
  const complete = !freePlay && step >= song.notes.length;

  const selectFret = useCallback((string: StringIndex, fret: number) => {
    setFrets((current) => {
      const next: [number, number, number] = [...current];
      next[string] = fret;
      return next;
    });
  }, []);

  const pluckString = useCallback((string: StringIndex) => {
    void unlock();
    pluck(string, frets[string]);
    setActiveString(string);
    if (activeTimer.current) window.clearTimeout(activeTimer.current);
    activeTimer.current = window.setTimeout(() => setActiveString(null), 260);

    if (!practicing || freePlay) {
      setFeedback(`กำลังเล่น ${STRING_NAMES[string]} · เฟรต ${frets[string]}`);
      return;
    }
    const target = song.notes[step];
    if (!target) return;
    if (target.string === string && target.fret === frets[string]) {
      setScore((value) => value + 100);
      setStep((value) => value + 1);
      setFeedback(step + 1 === song.notes.length ? "ยอดเยี่ยม! เล่นครบทั้งท่อนแล้ว" : "ถูกต้อง · เตรียมโน้ตถัดไป");
    } else {
      setMistakes((value) => value + 1);
      const positionHint = frets[target.string] === target.fret ? `ดีด ${STRING_NAMES[target.string]}` : `วางนิ้วที่ ${STRING_NAMES[target.string]} เฟรต ${target.fret}`;
      setFeedback(`ลองอีกครั้ง · ${positionHint}`);
    }
  }, [freePlay, frets, practicing, song.notes, step, pluck, unlock]);

  const setTrackedFrets = useCallback((next: [number, number, number]) => setFrets(next), []);
  const unlockAudio = useCallback(() => { void unlock(); }, [unlock]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (["1", "2", "3"].includes(event.key)) pluckString((Number(event.key) - 1) as StringIndex);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pluckString]);

  useEffect(() => {
    if (!metronome) return;
    click();
    const interval = window.setInterval(click, 60_000 / song.bpm);
    return () => window.clearInterval(interval);
  }, [click, metronome, song.bpm]);

  useEffect(() => () => {
    if (activeTimer.current) window.clearTimeout(activeTimer.current);
  }, []);

  const startPractice = () => {
    void unlock();
    setStep(0);
    setScore(0);
    setMistakes(0);
    setPracticing(true);
    setFeedback("เริ่มได้ · วางนิ้วตามจุดสีน้ำเงินแล้วดีดสาย");
  };

  const accuracy = useMemo(() => score ? Math.round((score / (score + mistakes * 100)) * 100) : 0, [mistakes, score]);
  const visibleNotes = song.notes.slice(Math.max(0, step - 2), Math.min(song.notes.length, step + 7));
  const visibleStart = Math.max(0, step - 2);

  return (
    <main className="min-h-[100svh] bg-[radial-gradient(circle_at_75%_0%,rgba(25,91,104,.18),transparent_35rem),#050b0e] text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-4 md:px-6">
        <header className="flex items-center justify-between gap-4">
          <AppBrand dark />
          <div className="hidden rounded-full border border-white/10 bg-white/5 px-5 py-2 text-center backdrop-blur md:block"><span className="text-[10px] tracking-[.15em] text-white/35">{freePlay ? "FREE PLAY" : "กำลังฝึกเพลง"}</span><p className="text-sm font-medium">{song.title}</p></div>
          <Link href="/songs" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65 transition hover:bg-white/10 hover:text-white"><ChevronLeftIcon className="size-4" />เลือกเพลง</Link>
        </header>

        <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
          <VirtualPinCamera frets={frets} activeString={activeString} expected={practicing ? expected : undefined} onSelectFret={selectFret} onPluck={pluckString} onUnlockAudio={unlockAudio} onFingeredFrets={setTrackedFrets} />

          <aside className="flex flex-col gap-3">
            <div className="glass rounded-[24px] p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold tracking-[.18em] text-emerald-300/65">AI COACH</p><h1 className="mt-1 text-xl font-semibold">{freePlay ? "โหมดเล่นอิสระ" : song.title}</h1></div><span className="rounded-full bg-amber-300/10 px-3 py-1 text-[10px] text-amber-200">{song.bpm} BPM</span></div>
              <div className={`mt-5 rounded-2xl border p-4 ${feedback.startsWith("ถูกต้อง") || feedback.startsWith("ยอดเยี่ยม") ? "border-emerald-300/20 bg-emerald-300/8" : feedback.startsWith("ลอง") ? "border-amber-300/20 bg-amber-300/8" : "border-white/8 bg-white/4"}`}>
                <p className="text-xs leading-5 text-white/70">{feedback}</p>
              </div>

              {!freePlay && (
                <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl bg-black/25 p-4">
                  <div><p className="text-[10px] text-white/35">โน้ตปัจจุบัน</p><p className="mt-1 font-mono text-lg text-emerald-300">{complete ? "COMPLETE" : expected ? `${expected.label} · สาย ${expected.string + 1} · เฟรต ${expected.fret}` : "READY"}</p></div>
                  <span className={`grid size-11 place-items-center rounded-full border text-lg font-bold ${complete ? "border-emerald-300/30 bg-emerald-300/15 text-emerald-300" : "border-blue-300/25 bg-blue-300/10 text-blue-300"}`}>{complete ? "✓" : expected?.string !== undefined ? expected.string + 1 : "–"}</span>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-white/4 p-3"><p className="text-[9px] text-white/30">ความแม่นยำ</p><p className="mt-1 text-lg font-semibold text-emerald-300">{accuracy}%</p></div><div className="rounded-xl bg-white/4 p-3"><p className="text-[9px] text-white/30">คะแนน</p><p className="mt-1 text-lg font-semibold">{score}</p></div></div>
            </div>

            <div className="glass rounded-[24px] p-4">
              {!freePlay && <button type="button" onClick={startPractice} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3.5 text-sm font-semibold text-[#052113] shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-300"><PlayIcon className="size-4" />{practicing ? "เริ่มฝึกใหม่" : "เริ่มฝึกเพลง"}</button>}
              <button type="button" onClick={() => { void unlock(); setMetronome((value) => !value); }} className={`mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs transition ${metronome ? "border-amber-300/30 bg-amber-300/10 text-amber-200" : "border-white/10 bg-white/4 text-white/55 hover:bg-white/8"}`}><ClockIcon className="size-4" />เมโทรนอม {metronome ? "เปิด" : "ปิด"}</button>
            </div>

            <div className="glass mt-auto rounded-[24px] p-4 text-xs leading-5 text-white/40"><p className="mb-2 flex items-center gap-2 font-medium text-white/70"><VolumeIcon className="size-4 text-emerald-300" />วิธีเล่นด้วยมือ</p><ol className="list-inside list-decimal space-y-1"><li>เปิดกล้องและยกมือทั้งสอง</li><li>มือซ้ายแตะตำแหน่งเฟรต</li><li>มือขวาจีบนิ้วแล้วผ่านสาย</li></ol></div>
          </aside>
        </section>

        {!freePlay && (
          <section className="glass mt-4 overflow-hidden rounded-[24px] p-4">
            <div className="flex items-center justify-between"><div><p className="text-[10px] tracking-[.14em] text-white/35">NOTE TIMELINE</p><p className="mt-1 text-xs text-white/65">{step}/{song.notes.length} โน้ต</p></div><div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.min(100, (step / song.notes.length) * 100)}%` }} /></div></div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {visibleNotes.map((note, index) => {
                const absoluteIndex = visibleStart + index;
                const isCurrent = absoluteIndex === step;
                const isPast = absoluteIndex < step;
                return <div key={`${absoluteIndex}-${note.label}`} className={`min-w-20 rounded-xl border px-3 py-2 text-center transition ${isCurrent ? "border-blue-300/35 bg-blue-400/15 text-blue-200 shadow-[0_0_20px_rgba(96,165,250,.12)]" : isPast ? "border-emerald-300/15 bg-emerald-300/8 text-emerald-300/55" : "border-white/8 bg-white/3 text-white/40"}`}><p className="font-mono text-sm font-semibold">{note.label}</p><p className="mt-1 text-[9px]">สาย {note.string + 1} · {note.fret}</p></div>;
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
