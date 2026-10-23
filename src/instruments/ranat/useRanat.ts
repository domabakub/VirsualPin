"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { RanatAudio } from "@/instruments/ranat/audio";
import { useAutomaticAudio } from "@/hooks/useAutomaticAudio";
import { type Articulation, type RanatEvent, type RanatSource, type RanatTake, parseRanatTake, patternNote, resolvePair, validBar } from "@/instruments/ranat/model";

const STORAGE_KEY = "next-instruments.ranat.takes.v1";
type Pattern = { owner: string; base: number; pendingBase?: number; offset: number; mode: "kro" | "roll"; source: RanatSource; next: number; step: number };
export function useRanat() {
  const engine = useRef<RanatAudio | null>(null);
  const pattern = useRef<Pattern | null>(null);
  const visualTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const transport = useRef<{ events: RanatEvent[]; start: number; index: number; end: number } | null>(null);
  const recording = useRef<{ start: number; events: RanatEvent[] } | null>(null);
  const rateRef = useRef(10), bpmRef = useRef(88), metroRef = useRef(false), nextClick = useRef(0), beatRef = useRef(0);
  const operation = useRef(0);
  const storageWritable = useRef(true);
  const takesRef = useRef<RanatTake[]>([]);
  const volumeRef = useRef(65);
  const visualId = useRef(0);
  const invalidate = useCallback(() => { operation.current++; }, []);
  const [ready, setReady] = useState(false), [error, setError] = useState("");
  const [hits, setHits] = useState<{ bar: number; hand: "L" | "R"; stamp: number; id: number }[]>([]);
  const [active, setActive] = useState(false), [playing, setPlaying] = useState(false), [isRecording, setRecording] = useState(false);
  const [takes, setTakes] = useState<RanatTake[]>([]), [storageReady, setStorageReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [rate, setRateState] = useState(10), [bpm, setBpmState] = useState(88), [metronome, setMetroState] = useState(false);
  const [volume, setVolumeState] = useState(65), [beat, setBeat] = useState(-1);
  const setRate = (value: number) => { rateRef.current = value; setRateState(value); };
  const setBpm = (value: number) => { bpmRef.current = value; setBpmState(value); };
  const setVolume = (value: number) => { volumeRef.current = value; engine.current?.setVolume(value / 100); setVolumeState(value); };
  const unlock = useCallback(async () => {
    try { if (!engine.current) { engine.current = new RanatAudio(); engine.current.setVolume(volumeRef.current / 100); } await engine.current.unlock(); setReady(true); setError(""); return true; }
    catch { setError("เริ่มเสียงไม่ได้ ลองแตะเครื่องดนตรีอีกครั้ง"); return false; }
  }, []);
  useAutomaticAudio(unlock);
  const emit = useCallback((bar: number, hand: "L" | "R", source: RanatSource, assisted: boolean, at: number, velocity = 0.72) => {
    const audio = engine.current;
    if (!audio || !validBar(bar)) return;
    audio.strike(bar, velocity, at);
    const take = recording.current;
    if (take && source !== "demo" && take.events.length < 12000) take.events.push({ id: crypto.randomUUID(), bar, hand, source, assisted, velocity, onsetMs: Math.max(0, (at - take.start) * 1000) });
    const timer = setTimeout(() => {
      visualTimers.current.delete(timer);
      const id = ++visualId.current, stamp = performance.now();
      setHits(previous => [...previous.filter(hit => stamp - hit.stamp < 400), { bar, hand, stamp, id }].slice(-32));
    }, Math.max(0, (at - audio.time) * 1000));
    visualTimers.current.add(timer);
  }, []);
  const endPattern = useCallback((owner?: string) => {
    if (owner && pattern.current?.owner !== owner) return;
    operation.current++;
    if (!pattern.current) { setActive(false); return; }
    pattern.current = null; engine.current?.cancelPending();
    for (const timer of visualTimers.current) clearTimeout(timer); visualTimers.current.clear();
    if (recording.current && engine.current) recording.current.events = recording.current.events.filter(e => e.onsetMs <= (engine.current!.time - recording.current!.start) * 1000);
    setActive(false);
  }, []);
  const stop = useCallback(() => {
    operation.current++; endPattern(); transport.current = null; engine.current?.stop(); setPlaying(false); setHits([]);
    for (const timer of visualTimers.current) clearTimeout(timer); visualTimers.current.clear();
    metroRef.current = false; setMetroState(false); setBeat(-1);
  }, [endPattern]);
  const begin = useCallback(async (base: number, mode: Articulation, offset: number, owner: string, source: RanatSource, hand: "L" | "R" = "R", velocity = .72) => {
    if (!validBar(base) || ((mode === "pair" || mode === "kro") && !resolvePair(base, offset))) { if (pattern.current?.owner === owner) endPattern(owner); return; }
    if (transport.current) return;
    if ((mode === "kro" || mode === "roll") && pattern.current && pattern.current.owner !== owner) return;
    const request = operation.current;
    if (!engine.current?.ready && !await unlock()) return;
    if (request !== operation.current) return;
    const audio = engine.current!;
    if (mode === "kro" || mode === "roll") {
      if (pattern.current?.owner === owner) { pattern.current.pendingBase = base; return; }
      pattern.current = { owner, base, offset, mode, source, next: audio.time + 0.01, step: 0 }; setActive(true);
    } else if (mode === "pair") {
      const pair = resolvePair(base, offset)!;
      emit(pair[0], "L", source, true, audio.time, velocity); emit(pair[1], "R", source, true, audio.time, velocity);
    } else emit(base, hand, source, false, audio.time, velocity);
  }, [emit, endPattern, unlock]);
  const release = useCallback((owner: string) => { operation.current++; endPattern(owner); }, [endPattern]);
  const setMetronome = useCallback(async () => {
    const request = operation.current;
    if (!metroRef.current && !await unlock() || request !== operation.current) return;
    metroRef.current = !metroRef.current; setMetroState(metroRef.current); nextClick.current = engine.current?.time ?? 0; beatRef.current = 0;
    if (!metroRef.current) setBeat(-1);
  }, [unlock]);
  const saveRecording = useCallback(() => {
    const captured = recording.current; recording.current = null; setRecording(false);
    if (!captured || !engine.current) return;
    const durationMs = Math.min(300000, Math.max(0, (engine.current.time - captured.start) * 1000));
    const events = captured.events.filter(e => e.onsetMs <= durationMs);
    if (!events.length) { setNotice("ยังไม่มีโน้ตในบันทึก ลองตีแล้วอัดใหม่"); return; }
    const take: RanatTake = { version: 1, instrumentId: "ranat", tuningId: "equal-seven-a3-v1", id: crypto.randomUUID(), name: `ทำนองของฉัน · ${new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`, createdAt: Date.now(), durationMs, events };
    const updated = [take, ...takesRef.current].slice(0, 12);
    takesRef.current = updated; setTakes(updated);
    try { if (!storageWritable.current) throw new Error("Preserve unreadable original"); localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); }
    catch { setNotice("บันทึกถาวรไม่ได้ งานนี้อยู่ชั่วคราว กรุณาดาวน์โหลดก่อนปิดหน้า"); }
  }, []);
  const toggleRecording = useCallback(async () => {
    if (recording.current) { endPattern(); saveRecording(); return; }
    stop(); const request = operation.current; if (!await unlock() || request !== operation.current) return;
    recording.current = { start: engine.current!.time, events: [] }; setRecording(true); setNotice("");
  }, [endPattern, saveRecording, stop, unlock]);
  const playEvents = useCallback(async (events: RanatEvent[], durationMs: number) => {
    saveRecording(); stop(); const request = operation.current;
    if (!await unlock() || request !== operation.current) return;
    const start = engine.current!.time + 0.06;
    transport.current = { events, start, index: 0, end: start + durationMs / 1000 + 1.4 }; setPlaying(true);
  }, [saveRecording, stop, unlock]);
  const importTake = useCallback((value: unknown) => {
    const take = parseRanatTake(value);
    if (!take || !take.events.length) { setNotice("ไฟล์นี้ไม่ใช่บันทึก Ranat Next ที่รองรับ"); return; }
    saveRecording(); stop();
    const updated = [take, ...takesRef.current.filter(item => item.id !== take.id)].slice(0,12);
    takesRef.current = updated; setTakes(updated);
    try { if (!storageWritable.current) throw new Error("Preserve original"); localStorage.setItem(STORAGE_KEY,JSON.stringify(updated)); setNotice("นำเข้าทำนองเรียบร้อย พร้อมฟังย้อนหลัง"); }
    catch { setNotice("นำเข้าได้ชั่วคราว แต่บันทึกถาวรไม่ได้ กรุณาเก็บไฟล์ต้นฉบับไว้"); }
  }, [saveRecording, stop]);
  useEffect(() => {
    const timers = visualTimers.current;
    const load = setTimeout(() => {
      try { const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); if (!Array.isArray(raw)) throw new Error("Invalid collection"); const parsed = raw.map(parseRanatTake); if (parsed.some(v => v === null)) throw new Error("Unsupported take"); takesRef.current = parsed.filter((v): v is RanatTake => v !== null).slice(0, 12); setTakes(takesRef.current); }
      catch { storageWritable.current = false; setNotice("อ่านบันทึกเดิมไม่ได้ ข้อมูลต้นฉบับยังอยู่ กรุณาดาวน์โหลดบันทึกใหม่ก่อนปิดหน้า"); }
      setStorageReady(true);
    }, 0);
    const tick = setInterval(() => {
      const audio = engine.current; if (!audio?.ready) return;
      const p = pattern.current;
      if (p) {
        if (p.next < audio.time - 0.08) p.next = audio.time;
        while (p.next < audio.time + 0.04) {
          if (p.step % 2 === 0 && p.pendingBase !== undefined) { p.base = p.pendingBase; p.pendingBase = undefined; }
          const note = patternNote(p.base, p.offset, p.mode, p.step++);
          if (note) emit(note.bar, note.hand, p.source, true, p.next, 0.62);
          p.next += 1 / rateRef.current;
        }
      }
      const t = transport.current;
      if (t) {
        while (t.index < t.events.length && t.start + t.events[t.index].onsetMs / 1000 < audio.time + 0.04) {
          const event = t.events[t.index++], at = t.start + event.onsetMs / 1000;
          if (at >= audio.time - 0.06) emit(event.bar, event.hand, "demo", event.assisted, at, event.velocity);
        }
        if (audio.time >= t.end) { transport.current = null; setPlaying(false); }
      }
      if (metroRef.current && audio.time >= nextClick.current) { const value = beatRef.current++ % 4; audio.click(value === 0); setBeat(value); nextClick.current = audio.time + 60 / bpmRef.current; }
      if (recording.current && audio.time - recording.current.start >= 300) { endPattern(); saveRecording(); setNotice("บันทึกครบ 5 นาทีแล้ว เก็บทำนองให้เรียบร้อย"); }
    }, 12);
    const suspend = () => { saveRecording(); stop(); };
    const visibility = () => { if (document.hidden) suspend(); };
    window.addEventListener("blur", suspend); window.addEventListener("pagehide", suspend); document.addEventListener("visibilitychange", visibility);
    return () => { invalidate(); saveRecording(); pattern.current = null; transport.current = null; clearTimeout(load); clearInterval(tick); window.removeEventListener("blur", suspend); window.removeEventListener("pagehide", suspend); document.removeEventListener("visibilitychange", visibility); for (const timer of timers) clearTimeout(timer); engine.current?.dispose(); engine.current = null; };
  }, [emit, endPattern, invalidate, saveRecording, stop]);
  return { ready, error, unlock, hits, active, playing, isRecording, takes, storageReady, notice, rate, setRate, bpm, setBpm, metronome, setMetronome, volume, setVolume, beat, begin, release, stop, endPattern, toggleRecording, saveRecording, playEvents, importTake };
}
