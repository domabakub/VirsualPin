import type { Song, StringIndex } from "@/data/songs";
import { getPhinNoteName } from "@/lib/audio/phinTuning";

export const QUICK_TAKE_VERSION = 1 as const;

export type TakeInputSource = "touch" | "camera" | "keyboard";

export type QuickTakeNote = {
  id: string;
  string: StringIndex;
  fret: number;
  velocity: number;
  onsetMs: number;
  durationMs: number;
  source: TakeInputSource;
  confidence?: number;
};

export type QuickTake = {
  version: typeof QUICK_TAKE_VERSION;
  id: string;
  name: string;
  notes: QuickTakeNote[];
  durationMs: number;
  bpm?: number;
  tuning: "E4-A3-E3";
  createdAt: number;
  updatedAt: number;
};

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInputSource(value: unknown): value is TakeInputSource {
  return value === "touch" || value === "camera" || value === "keyboard";
}

function readNote(value: unknown, index: number): QuickTakeNote | null {
  if (!value || typeof value !== "object") return null;
  const note = value as Partial<QuickTakeNote>;
  if (!finiteNumber(note.string) || !finiteNumber(note.fret) || !finiteNumber(note.onsetMs)) return null;
  const string = Math.round(note.string);
  if (string < 0 || string > 2) return null;
  return {
    id: typeof note.id === "string" && note.id ? note.id.slice(0, 120) : `note-${index}`,
    string: string as StringIndex,
    fret: Math.max(0, Math.min(6, Math.round(note.fret))),
    velocity: finiteNumber(note.velocity) ? Math.max(1, Math.min(127, Math.round(note.velocity))) : 96,
    onsetMs: Math.max(0, Math.min(3_600_000, note.onsetMs)),
    durationMs: finiteNumber(note.durationMs) ? Math.max(80, Math.min(30_000, note.durationMs)) : 500,
    source: isInputSource(note.source) ? note.source : "touch",
    ...(finiteNumber(note.confidence) ? { confidence: Math.max(0, Math.min(1, note.confidence)) } : {}),
  };
}

export function readQuickTake(value: unknown): QuickTake | null {
  if (!value || typeof value !== "object") return null;
  const take = value as Partial<QuickTake>;
  if (take.version !== QUICK_TAKE_VERSION || typeof take.id !== "string" || !Array.isArray(take.notes)) return null;
  const notes = take.notes
    .map(readNote)
    .filter((note): note is QuickTakeNote => Boolean(note))
    .sort((a, b) => a.onsetMs - b.onsetMs)
    .slice(0, 10_000);
  if (!notes.length) return null;
  const naturalDuration = Math.max(...notes.map(note => note.onsetMs + note.durationMs));
  const createdAt = finiteNumber(take.createdAt) && take.createdAt > 0 ? Math.round(take.createdAt) : Date.now();
  const updatedAt = finiteNumber(take.updatedAt) && take.updatedAt > 0 ? Math.round(take.updatedAt) : createdAt;
  return {
    version: QUICK_TAKE_VERSION,
    id: take.id.slice(0, 120),
    name: typeof take.name === "string" && take.name.trim() ? take.name.trim().slice(0, 80) : "บันทึกการเล่น",
    notes,
    durationMs: finiteNumber(take.durationMs) ? Math.max(naturalDuration, Math.min(3_600_000, take.durationMs)) : naturalDuration,
    ...(finiteNumber(take.bpm) ? { bpm: Math.max(40, Math.min(240, Math.round(take.bpm))) } : {}),
    tuning: "E4-A3-E3",
    createdAt,
    updatedAt,
  };
}

export function parseQuickTakeList(value: unknown): QuickTake[] {
  if (!Array.isArray(value)) return [];
  return value.map(readQuickTake).filter((take): take is QuickTake => Boolean(take)).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function createQuickTake(args: {
  id: string;
  notes: QuickTakeNote[];
  durationMs: number;
  bpm?: number;
  now?: number;
  name?: string;
}): QuickTake {
  const now = args.now ?? Date.now();
  const date = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(now);
  const take = readQuickTake({
    version: QUICK_TAKE_VERSION,
    id: args.id,
    name: args.name ?? `บันทึกการเล่น · ${date}`,
    notes: args.notes,
    durationMs: args.durationMs,
    bpm: args.bpm,
    tuning: "E4-A3-E3",
    createdAt: now,
    updatedAt: now,
  });
  if (!take) throw new Error("Quick Take ต้องมีอย่างน้อยหนึ่งโน้ต");
  return take;
}

export function quickTakeToSong(take: QuickTake): Song {
  return {
    slug: `take-${take.id.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`.slice(0, 80),
    title: take.name,
    subtitle: "ฝึกตามโน้ตที่คุณบันทึกไว้",
    category: "เพลงฝึกทักษะ",
    difficulty: "เริ่มต้น",
    duration: formatTakeDuration(take.durationMs),
    bpm: take.bpm ?? 80,
    accent: "#3f7bf3",
    notes: take.notes.map(note => ({ string: note.string, fret: note.fret, beat: Math.max(0.25, note.durationMs / 500), label: getPhinNoteName(note.string, note.fret) })),
  };
}

export function formatTakeDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(durationMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

