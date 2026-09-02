"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraIcon, ClockIcon, MusicIcon, PlayIcon, VolumeIcon } from "@/components/icons";
import { VirtualPhinCamera } from "@/components/play/VirtualPhinCamera";
import { StudioTouchPhin } from "@/components/studio/StudioTouchPhin";
import type { StringIndex } from "@/data/songs";
import { usePhinAudio } from "@/hooks/usePhinAudio";
import { getPhinNoteName } from "@/lib/audio/phinTuning";
import { createStudioMidi, createStudioWav } from "@/lib/studio/exporters";
import {
  BEATS_PER_BAR,
  STUDIO_BARS,
  STUDIO_BEATS,
  beatLabel,
  createStudioProject,
  quantizeNotes,
  readStudioProject,
  type StudioBendPoint,
  type QuantizeDivision,
  type StudioNote,
  type StudioProject,
} from "@/lib/studio/types";

const STORAGE_KEY = "virtual-phin-studio-v1";
type TransportState = "idle" | "count-in" | "recording" | "playing";
type InputMode = "touch" | "camera";
type ActiveTouchRecording = {
  noteId: string;
  startedAt: number;
  startBeat: number;
  bendPoints: StudioBendPoint[];
  lastCents: number;
  lastSampleAt: number;
};

function fileSafeName(name: string) {
  const safe = name.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
  return safe || "virtual-phin-song";
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function notePosition(note: StudioNote) {
  return {
    left: `${note.beat / STUDIO_BEATS * 100}%`,
    width: `${Math.max(1.1, note.durationBeats / STUDIO_BEATS * 100)}%`,
    top: `${10 + note.string * 25}px`,
  };
}

export function StudioWorkspace() {
  const [project, setProject] = useState<StudioProject>(() => createStudioProject());
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"loading" | "saving" | "saved" | "temporary">("loading");
  const [transport, setTransport] = useState<TransportState>("idle");
  const [playheadBeat, setPlayheadBeat] = useState(0);
  const [countIn, setCountIn] = useState<number | null>(null);
  const [metronome, setMetronome] = useState(true);
  const [frets, setFrets] = useState<[number, number, number]>([0, 0, 0]);
  const [activeString, setActiveString] = useState<StringIndex | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("touch");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [notice, setNotice] = useState("พร้อมบันทึก · Count-in 1 ห้อง");
  const [exporting, setExporting] = useState<"wav" | "midi" | null>(null);
  const timersRef = useRef<number[]>([]);
  const transportStartedAtRef = useRef(0);
  const activeTimerRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const sessionRef = useRef(0);
  const playbackVoiceIdsRef = useRef(new Set<string>());
  const touchRecordingsRef = useRef(new Map<string, ActiveTouchRecording>());
  const { unlock, pluck, click, percussion, startTouchVoice, bendTouchVoice, stopTouchVoice, status: audioStatus, error: audioError } = usePhinAudio(project.phinMuted ? 0 : project.phinVolume);
  const secondsPerBeat = 60 / project.bpm;
  const selectedNote = project.notes.find(note => note.id === selectedNoteId) ?? null;

  const finalizeTouchRecordings = useCallback((endedAt: number) => {
    if (!touchRecordingsRef.current.size) return;
    const completed = new Map(Array.from(touchRecordingsRef.current.values(), recording => [recording.noteId, recording]));
    touchRecordingsRef.current.clear();
    setProject(current => ({
      ...current,
      notes: current.notes.map(note => {
        const recording = completed.get(note.id);
        if (!recording) return note;
        return {
          ...note,
          durationBeats: Math.max(0.125, Math.min(STUDIO_BEATS - recording.startBeat, (endedAt - recording.startedAt) / 1_000 / secondsPerBeat)),
          bendPoints: recording.bendPoints.slice(0, 160),
        };
      }),
      updatedAt: Date.now(),
    }));
  }, [secondsPerBeat]);

  const clearTransportTimers = useCallback(() => {
    timersRef.current.forEach(timer => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const stopTransport = useCallback((message?: string) => {
    finalizeTouchRecordings(performance.now());
    sessionRef.current += 1;
    clearTransportTimers();
    playbackVoiceIdsRef.current.forEach(voiceId => stopTouchVoice(voiceId));
    playbackVoiceIdsRef.current.clear();
    setTransport("idle");
    setCountIn(null);
    if (message) setNotice(message);
  }, [clearTransportTimers, finalizeTouchRecordings, stopTouchVoice]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readStudioProject(window.localStorage.getItem(STORAGE_KEY));
      if (stored) {
        setProject(stored);
        setNotice(`เปิดโปรเจกต์เดิมแล้ว · ${stored.notes.length} โน้ต`);
      }
      setHydrated(true);
      setSaveState("saved");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...project, updatedAt: Date.now() }));
        setSaveState("saved");
      } catch {
        setSaveState("temporary");
      }
    }, 500);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [hydrated, project]);

  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.hidden) stopTransport("หยุดการเล่นแล้ว เพราะหน้าต่างถูกพัก");
    };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => document.removeEventListener("visibilitychange", stopWhenHidden);
  }, [stopTransport]);

  useEffect(() => () => {
    clearTransportTimers();
    if (activeTimerRef.current) window.clearTimeout(activeTimerRef.current);
  }, [clearTransportTimers]);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, Math.max(0, delay));
    timersRef.current.push(timer);
  }, []);

  const startPlayhead = useCallback((mode: "playing" | "recording", session: number) => {
    const tick = () => {
      if (sessionRef.current !== session) return;
      const beat = (performance.now() - transportStartedAtRef.current) / 1_000 / secondsPerBeat;
      if (beat >= STUDIO_BEATS) {
        setPlayheadBeat(STUDIO_BEATS);
        stopTransport(mode === "recording" ? "บันทึกครบ 8 ห้องแล้ว" : "เล่นโปรเจกต์จบแล้ว");
        return;
      }
      setPlayheadBeat(beat);
      schedule(tick, 40);
    };
    tick();
  }, [schedule, secondsPerBeat, stopTransport]);

  const scheduleBacking = useCallback((session: number, includeMetronome: boolean) => {
    for (let beat = 0; beat < STUDIO_BEATS; beat += 1) {
      if (includeMetronome) schedule(() => {
        if (sessionRef.current === session) void click();
      }, beat * secondsPerBeat * 1_000);
    }
    if (project.drumEnabled && !project.drumMuted) {
      for (let step = 0; step < STUDIO_BEATS * 2; step += 1) {
        schedule(() => {
          if (sessionRef.current === session) void percussion(step, project.drumVolume);
        }, step * 0.5 * secondsPerBeat * 1_000);
      }
    }
  }, [click, percussion, project.drumEnabled, project.drumMuted, project.drumVolume, schedule, secondsPerBeat]);

  const playProject = useCallback(async () => {
    if (transport !== "idle") {
      stopTransport("หยุดที่ตำแหน่งปัจจุบัน");
      return;
    }
    if (!project.notes.length && !project.drumEnabled) {
      setNotice("ยังไม่มีโน้ตหรือ Drum Loop ให้เล่น");
      return;
    }
    if (!(await unlock())) return;
    stopTransport();
    const session = ++sessionRef.current;
    setPlayheadBeat(0);
    setTransport("playing");
    setNotice("กำลังเล่นโปรเจกต์");
    transportStartedAtRef.current = performance.now();
    if (!project.phinMuted) {
      project.notes.forEach(note => {
        const voiceId = `play-${session}-${note.id}`;
        playbackVoiceIdsRef.current.add(voiceId);
        schedule(() => {
          if (sessionRef.current === session) void startTouchVoice(voiceId, note.string, note.fret);
        }, note.beat * secondsPerBeat * 1_000);
        note.bendPoints?.forEach(point => schedule(() => {
          if (sessionRef.current === session) bendTouchVoice(voiceId, point.cents);
        }, (note.beat + point.offsetBeats) * secondsPerBeat * 1_000));
        schedule(() => {
          stopTouchVoice(voiceId);
          playbackVoiceIdsRef.current.delete(voiceId);
        }, (note.beat + note.durationBeats) * secondsPerBeat * 1_000);
      });
    }
    scheduleBacking(session, metronome);
    startPlayhead("playing", session);
  }, [bendTouchVoice, metronome, project.drumEnabled, project.notes, project.phinMuted, schedule, scheduleBacking, secondsPerBeat, startPlayhead, startTouchVoice, stopTouchVoice, stopTransport, transport, unlock]);

  const startRecording = useCallback(async () => {
    if (transport === "recording" || transport === "count-in") {
      stopTransport("หยุดบันทึกแล้ว · เทคถูกเก็บบน Timeline");
      return;
    }
    if (transport === "playing") stopTransport();
    if (!(await unlock())) return;
    clearTransportTimers();
    const session = ++sessionRef.current;
    setTransport("count-in");
    setPlayheadBeat(0);
    setNotice(project.notes.length ? "Count-in · เทคใหม่จะแทนเทคพิณเดิม" : "Count-in · เตรียมเล่นพิณ");
    for (let count = 0; count < BEATS_PER_BAR; count += 1) {
      schedule(() => {
        if (sessionRef.current !== session) return;
        setCountIn(BEATS_PER_BAR - count);
        void click();
      }, count * secondsPerBeat * 1_000);
    }
    schedule(() => {
      if (sessionRef.current !== session) return;
      setProject(current => ({ ...current, notes: [], updatedAt: Date.now() }));
      setSelectedNoteId(null);
      setCountIn(null);
      setTransport("recording");
      setNotice("กำลังบันทึก · เล่นผ่านหน้าจอหรือกล้องได้เลย");
      transportStartedAtRef.current = performance.now();
      scheduleBacking(session, metronome);
      startPlayhead("recording", session);
    }, BEATS_PER_BAR * secondsPerBeat * 1_000);
  }, [clearTransportTimers, click, metronome, project.notes.length, schedule, scheduleBacking, secondsPerBeat, startPlayhead, stopTransport, transport, unlock]);

  const selectFret = useCallback((string: StringIndex, fret: number) => {
    setFrets(current => {
      const next: [number, number, number] = [...current];
      next[string] = fret;
      return next;
    });
  }, []);

  const pluckString = useCallback((string: StringIndex, fretOverride?: number) => {
    const detectedAt = performance.now();
    const fret = fretOverride ?? frets[string];
    if (fretOverride !== undefined) selectFret(string, fretOverride);
    setActiveString(string);
    if (activeTimerRef.current) window.clearTimeout(activeTimerRef.current);
    activeTimerRef.current = window.setTimeout(() => setActiveString(null), 180);

    if (transport === "recording") {
      const rawBeat = (detectedAt - transportStartedAtRef.current) / 1_000 / secondsPerBeat;
      if (rawBeat >= 0 && rawBeat < STUDIO_BEATS) {
        const note: StudioNote = {
          id: `${Math.round(detectedAt)}-${string}-${fret}`,
          beat: rawBeat,
          durationBeats: 0.5,
          string,
          fret,
          velocity: 96,
        };
        setProject(current => ({ ...current, notes: [...current.notes, note].sort((a, b) => a.beat - b.beat), updatedAt: Date.now() }));
        setSelectedNoteId(note.id);
      }
    }
    void pluck(string, fret);
  }, [frets, pluck, secondsPerBeat, selectFret, transport]);

  const startTouchGesture = useCallback((gestureId: string, string: StringIndex, fret: number) => {
    const detectedAt = performance.now();
    selectFret(string, fret);
    setActiveString(string);
    void startTouchVoice(gestureId, string, fret);
    if (transport !== "recording") return;
    const rawBeat = (detectedAt - transportStartedAtRef.current) / 1_000 / secondsPerBeat;
    if (rawBeat < 0 || rawBeat >= STUDIO_BEATS) return;
    const noteId = `${Math.round(detectedAt)}-${string}-${fret}-touch`;
    const bendPoints: StudioBendPoint[] = [{ offsetBeats: 0, cents: 0 }];
    touchRecordingsRef.current.set(gestureId, {
      noteId,
      startedAt: detectedAt,
      startBeat: rawBeat,
      bendPoints,
      lastCents: 0,
      lastSampleAt: detectedAt,
    });
    const note: StudioNote = { id: noteId, beat: rawBeat, durationBeats: 0.125, string, fret, velocity: 96, bendPoints };
    setProject(current => ({ ...current, notes: [...current.notes, note].sort((a, b) => a.beat - b.beat), updatedAt: Date.now() }));
    setSelectedNoteId(noteId);
  }, [secondsPerBeat, selectFret, startTouchVoice, transport]);

  const pitchTouchGesture = useCallback((gestureId: string, cents: number) => {
    bendTouchVoice(gestureId, cents);
    const recording = touchRecordingsRef.current.get(gestureId);
    if (!recording) return;
    const now = performance.now();
    if (now - recording.lastSampleAt < 32 || Math.abs(cents - recording.lastCents) < 4) return;
    recording.bendPoints.push({
      offsetBeats: Math.max(0, (now - recording.startedAt) / 1_000 / secondsPerBeat),
      cents: Math.max(-1_200, Math.min(1_200, Math.round(cents))),
    });
    recording.lastCents = cents;
    recording.lastSampleAt = now;
  }, [bendTouchVoice, secondsPerBeat]);

  const endTouchGesture = useCallback((gestureId: string) => {
    const endedAt = performance.now();
    window.setTimeout(() => stopTouchVoice(gestureId), 140);
    const recording = touchRecordingsRef.current.get(gestureId);
    touchRecordingsRef.current.delete(gestureId);
    if (!recording) return;
    const durationBeats = Math.max(0.125, Math.min(STUDIO_BEATS - recording.startBeat, (endedAt - recording.startedAt) / 1_000 / secondsPerBeat));
    setProject(current => ({
      ...current,
      notes: current.notes.map(note => note.id === recording.noteId ? {
        ...note,
        durationBeats,
        bendPoints: recording.bendPoints.slice(0, 160),
      } : note),
      updatedAt: Date.now(),
    }));
    setActiveString(null);
  }, [secondsPerBeat, stopTouchVoice]);

  const applyQuantize = (division: Exclude<QuantizeDivision, "off">) => {
    setProject(current => ({ ...current, quantize: division, notes: quantizeNotes(current.notes, division), updatedAt: Date.now() }));
    setNotice(`จัดจังหวะทุกโน้ตเป็น ${division} แล้ว`);
  };

  const updateSelectedNote = (change: Partial<Pick<StudioNote, "string" | "fret" | "velocity">>) => {
    if (!selectedNoteId) return;
    setProject(current => ({
      ...current,
      notes: current.notes.map(note => note.id === selectedNoteId ? { ...note, ...change } : note),
      updatedAt: Date.now(),
    }));
  };

  const deleteSelectedNote = () => {
    if (!selectedNoteId) return;
    setProject(current => ({ ...current, notes: current.notes.filter(note => note.id !== selectedNoteId), updatedAt: Date.now() }));
    setSelectedNoteId(null);
    setNotice("ลบโน้ตที่เลือกแล้ว");
  };

  const newProject = () => {
    stopTransport();
    setProject(createStudioProject());
    setSelectedNoteId(null);
    setPlayheadBeat(0);
    setNotice("สร้างโปรเจกต์ใหม่ 8 ห้องแล้ว");
  };

  const exportProject = (kind: "wav" | "midi") => {
    if (exporting) return;
    if (!project.notes.length && !project.drumEnabled) {
      setNotice("บันทึกโน้ตหรือเพิ่ม Drum Loop ก่อน Export");
      return;
    }
    setExporting(kind);
    setNotice(kind === "wav" ? "กำลังเรนเดอร์ไฟล์ WAV…" : "กำลังสร้างไฟล์ MIDI…");
    window.setTimeout(() => {
      try {
        const baseName = fileSafeName(project.name);
        if (kind === "wav") download(createStudioWav(project), `${baseName}.wav`);
        else download(createStudioMidi(project), `${baseName}.mid`);
        setNotice(`Export ${kind.toUpperCase()} สำเร็จ · ตรวจไฟล์ในโฟลเดอร์ดาวน์โหลด`);
      } catch (reason) {
        console.error("Studio export failed", reason);
        setNotice(`Export ${kind.toUpperCase()} ไม่สำเร็จ กรุณาลองอีกครั้ง`);
      } finally {
        setExporting(null);
      }
    }, 80);
  };

  const noteSummary = useMemo(() => {
    if (!project.notes.length) return "ยังไม่มีเทคพิณ";
    const lastBeat = Math.max(...project.notes.map(note => note.beat));
    return `${project.notes.length} โน้ต · ถึงห้อง ${Math.min(STUDIO_BARS, Math.floor(lastBeat / BEATS_PER_BAR) + 1)}`;
  }, [project.notes]);

  const phinRegion = useMemo(() => {
    if (!project.notes.length) return null;
    const firstBeat = Math.max(0, Math.min(...project.notes.map(note => note.beat)));
    const lastBeat = Math.min(STUDIO_BEATS, Math.max(...project.notes.map(note => note.beat + note.durationBeats)));
    const durationBeats = Math.max(0.5, lastBeat - firstBeat);
    return {
      firstBeat,
      durationBeats,
      style: {
        left: `${firstBeat / STUDIO_BEATS * 100}%`,
        width: `${Math.min(100 - firstBeat / STUDIO_BEATS * 100, Math.max(3, durationBeats / STUDIO_BEATS * 100))}%`,
      },
    };
  }, [project.notes]);

  return (
    <div className="studio-app">
      <header className="studio-topbar">
        <div className="studio-project-brand">
          <Link href="/" className="studio-back" aria-label="กลับหน้าหลัก">‹</Link>
          <div>
            <span>VIRTUAL PHIN STUDIO</span>
            <input aria-label="ชื่อโปรเจกต์" value={project.name} maxLength={80} onChange={event => setProject(current => ({ ...current, name: event.target.value, updatedAt: Date.now() }))} />
          </div>
        </div>

        <div className="studio-transport" aria-label="ส่วนควบคุมการเล่น">
          <button type="button" className="studio-icon-button" aria-label="กลับจุดเริ่มต้น" onClick={() => { stopTransport(); setPlayheadBeat(0); }}>↤</button>
          <button type="button" className={`studio-icon-button ${transport === "playing" ? "is-active" : ""}`} aria-label={transport === "playing" ? "หยุด" : "เล่น"} onClick={() => { void playProject(); }}>
            {transport === "playing" ? "Ⅱ" : <PlayIcon aria-hidden="true" />}
          </button>
          <button type="button" className={`studio-record-button ${transport === "recording" || transport === "count-in" ? "is-recording" : ""}`} aria-label={transport === "recording" || transport === "count-in" ? "หยุดบันทึก" : "เริ่มบันทึก"} onClick={() => { void startRecording(); }}><span /></button>
          <div className="studio-display">
            <span><small>ตำแหน่ง</small><strong>{beatLabel(playheadBeat)}</strong></span>
            <label><small>BPM</small><input type="number" min="60" max="160" value={project.bpm} disabled={transport !== "idle"} onChange={event => setProject(current => ({ ...current, bpm: Math.max(60, Math.min(160, Number(event.target.value) || 96)), updatedAt: Date.now() }))} /></label>
            <span><small>ห้อง</small><strong>4/4</strong></span>
          </div>
          <button type="button" className={`studio-icon-button ${metronome ? "is-active" : ""}`} aria-pressed={metronome} aria-label="เปิดหรือปิดเมโทรนอม" onClick={() => setMetronome(value => !value)}><ClockIcon aria-hidden="true" /></button>
        </div>

        <div className="studio-export-actions">
          <button type="button" onClick={() => exportProject("midi")} disabled={Boolean(exporting)}>MIDI</button>
          <button type="button" className="studio-export-primary" onClick={() => exportProject("wav")} disabled={Boolean(exporting)}>{exporting === "wav" ? "กำลังสร้าง…" : "Export WAV"}</button>
        </div>
      </header>

      <main id="main-content" className="studio-main">
        <section className="studio-session-toolbar" aria-label="เครื่องมือโปรเจกต์">
          <div><button type="button" onClick={newProject}>โปรเจกต์ใหม่</button><span>8 ห้อง · Count-in 1 ห้อง</span></div>
          <div className="studio-save-state"><span className={saveState === "temporary" ? "is-warning" : ""} />{saveState === "loading" ? "กำลังเปิดโปรเจกต์" : saveState === "saving" ? "กำลังบันทึก…" : saveState === "temporary" ? "บันทึกถาวรไม่ได้" : "Auto-save แล้ว"}</div>
        </section>

        <div className="studio-arrangement">
          <aside className="studio-tracks" aria-label="รายการแทร็ก">
            <div className="studio-panel-title"><strong>แทร็ก</strong><span>2 แทร็ก</span></div>
            <div className="studio-track-ruler-spacer" aria-hidden="true" />
            <article className="studio-track is-phin">
              <div className="studio-track-heading"><span className="studio-track-icon"><MusicIcon aria-hidden="true" /></span><div><strong>พิณหลัก</strong><small>{noteSummary}</small></div></div>
              <div className="studio-track-controls">
                <button type="button" aria-pressed={project.phinMuted} className={project.phinMuted ? "is-muted" : ""} onClick={() => setProject(current => ({ ...current, phinMuted: !current.phinMuted }))}>M</button>
                <label><VolumeIcon aria-hidden="true" /><input aria-label="ระดับเสียงพิณ" type="range" min="0" max="1" step="0.01" value={project.phinVolume} onChange={event => setProject(current => ({ ...current, phinVolume: Number(event.target.value) }))} /></label>
              </div>
            </article>
            <article className={`studio-track is-drum ${!project.drumEnabled ? "is-disabled" : ""}`}>
              <div className="studio-track-heading"><span className="studio-track-icon">●</span><div><strong>โปงลางบีต</strong><small>{project.drumEnabled ? "Isan Demo Beat · 8 ห้อง" : "ยังไม่ได้เพิ่ม Loop"}</small></div></div>
              {project.drumEnabled ? <div className="studio-track-controls">
                <button type="button" aria-pressed={project.drumMuted} className={project.drumMuted ? "is-muted" : ""} onClick={() => setProject(current => ({ ...current, drumMuted: !current.drumMuted }))}>M</button>
                <label><VolumeIcon aria-hidden="true" /><input aria-label="ระดับเสียง Drum Loop" type="range" min="0" max="1" step="0.01" value={project.drumVolume} onChange={event => setProject(current => ({ ...current, drumVolume: Number(event.target.value) }))} /></label>
              </div> : <button type="button" className="studio-add-loop" onClick={() => { setProject(current => ({ ...current, drumEnabled: true, updatedAt: Date.now() })); setNotice("เพิ่มโปงลางบีต 8 ห้องแล้ว"); }}>+ เพิ่ม Loop</button>}
            </article>
          </aside>

          <section className="studio-timeline-panel" aria-label="ไทม์ไลน์ 8 ห้อง">
            <div className="studio-timeline-toolbar">
              <span>Timeline</span>
              <div><button type="button" className={project.quantize === "1/8" ? "is-selected" : ""} onClick={() => applyQuantize("1/8")}>Quantize 1/8</button><button type="button" className={project.quantize === "1/16" ? "is-selected" : ""} onClick={() => applyQuantize("1/16")}>Quantize 1/16</button></div>
            </div>
            <div className="studio-ruler">{Array.from({ length: STUDIO_BARS }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
            <div className="studio-timeline">
              <div className="studio-lane studio-phin-lane">
                {!project.notes.length && <span className="studio-empty-lane">กด Record แล้วเล่นพิณ โน้ตจะปรากฏที่นี่</span>}
                {phinRegion && <div className="studio-phin-region" style={phinRegion.style} aria-hidden="true">
                  <strong>พิณ Take 01</strong>
                  <span>{project.notes.map((note, index) => <i key={note.id} style={{ left: `${(note.beat - phinRegion.firstBeat) / phinRegion.durationBeats * 100}%`, height: `${8 + note.velocity / 8 + index % 3 * 3}px` }} />)}</span>
                </div>}
                {project.notes.map(note => <button key={note.id} type="button" aria-label={`${getPhinNoteName(note.string, note.fret, true)} ที่ ${beatLabel(note.beat)}`} className={`studio-note-block string-${note.string} ${selectedNoteId === note.id ? "is-selected" : ""}`} style={notePosition(note)} onClick={() => setSelectedNoteId(note.id)}><span>{note.fret}{note.bendPoints?.some(point => point.cents !== 0) ? "↗" : ""}</span></button>)}
              </div>
              <div className="studio-lane studio-drum-lane">
                {project.drumEnabled ? <div className="studio-drum-region"><strong>Isan Demo Beat</strong><span>{Array.from({ length: 16 }, (_, index) => <i key={index} className={index % 4 === 0 ? "is-accent" : ""} />)}</span></div> : <span className="studio-empty-lane">เพิ่ม Drum Loop จากแทร็กด้านซ้าย</span>}
              </div>
              <div className="studio-playhead" style={{ left: `${Math.min(100, playheadBeat / STUDIO_BEATS * 100)}%` }} />
            </div>
          </section>
        </div>

        <section className={`studio-lower ${inputMode === "touch" ? "is-touch-mode" : ""}`}>
          <div className="studio-note-editor">
            <div className="studio-panel-title"><div><strong>Note Editor</strong><span>{selectedNote ? `${getPhinNoteName(selectedNote.string, selectedNote.fret, true)} · ${beatLabel(selectedNote.beat)}` : "เลือกโน้ตบน Timeline เพื่อแก้ไข"}</span></div>{selectedNote && <button type="button" onClick={deleteSelectedNote}>ลบโน้ต</button>}</div>
            {selectedNote ? <div className="studio-editor-form">
              <label>สาย<select value={selectedNote.string} onChange={event => updateSelectedNote({ string: Number(event.target.value) as StringIndex })}><option value="0">สาย 1 · E4</option><option value="1">สาย 2 · A3</option><option value="2">สาย 3 · E3</option></select></label>
              <label>เฟรต<select value={selectedNote.fret} onChange={event => updateSelectedNote({ fret: Number(event.target.value) })}>{Array.from({ length: 7 }, (_, fret) => <option key={fret} value={fret}>{fret} · {getPhinNoteName(selectedNote.string, fret, true)}</option>)}</select></label>
              <label>น้ำหนัก<output>{selectedNote.velocity}</output><input type="range" min="30" max="127" value={selectedNote.velocity} onChange={event => updateSelectedNote({ velocity: Number(event.target.value) })} /></label>
              <button type="button" onClick={() => { void pluck(selectedNote.string, selectedNote.fret); }}>ฟังโน้ตนี้</button>
            </div> : <div className="studio-editor-empty"><span>○</span><p>หลังบันทึก ให้เลือกกล่องโน้ตสีเขียวบน Timeline<br />จากนั้นเปลี่ยนสาย เฟรต หรือน้ำหนักการดีดได้</p></div>}
          </div>

          <div className="studio-instrument">
            <div className="studio-panel-title">
              <div><strong>Input</strong><span>{inputMode === "camera" ? "Hand Tracking" : "Touch Phin"} · เสียง {audioStatus === "ready" ? "พร้อม" : "ยังไม่เปิด"}</span></div>
              <div className="studio-input-tabs"><button type="button" className={inputMode === "touch" ? "is-selected" : ""} onClick={() => setInputMode("touch")}>สัมผัส</button><button type="button" className={inputMode === "camera" ? "is-selected" : ""} onClick={() => setInputMode("camera")}><CameraIcon aria-hidden="true" /> กล้อง</button></div>
            </div>
            <div className="studio-instrument-body">
              {inputMode === "touch" ? <StudioTouchPhin
                keyRoot={project.touchKeyRoot}
                scale={project.touchScale}
                scaleLock={project.touchScaleLock}
                bendRange={project.touchBendRange}
                onKeyRootChange={touchKeyRoot => setProject(current => ({ ...current, touchKeyRoot, updatedAt: Date.now() }))}
                onScaleChange={touchScale => setProject(current => ({ ...current, touchScale, updatedAt: Date.now() }))}
                onScaleLockChange={touchScaleLock => setProject(current => ({ ...current, touchScaleLock, updatedAt: Date.now() }))}
                onBendRangeChange={touchBendRange => setProject(current => ({ ...current, touchBendRange, updatedAt: Date.now() }))}
                onGestureStart={startTouchGesture}
                onGesturePitch={pitchTouchGesture}
                onGestureEnd={endTouchGesture}
              /> : <VirtualPhinCamera frets={frets} activeString={activeString} onSelectFret={selectFret} onPluck={pluckString} onUnlockAudio={() => { void unlock(); }} />}
            </div>
          </div>
        </section>

        <footer className="studio-status" aria-live="polite">
          <span className={`studio-status-dot ${transport === "recording" ? "is-recording" : ""}`} />
          <strong>{countIn ? `เตรียมตัว ${countIn}` : notice}</strong>
          <span>{audioError ?? `Audio: ${audioStatus} · ${project.notes.length} โน้ต`}</span>
        </footer>
      </main>
    </div>
  );
}
