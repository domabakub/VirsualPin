import type { StringIndex } from "@/data/songs";

export const STUDIO_BARS = 8;
export const BEATS_PER_BAR = 4;
export const STUDIO_BEATS = STUDIO_BARS * BEATS_PER_BAR;

export type QuantizeDivision = "off" | "1/8" | "1/16";

export type StudioNote = {
  id: string;
  beat: number;
  durationBeats: number;
  string: StringIndex;
  fret: number;
  velocity: number;
};

export type StudioProject = {
  version: 1;
  id: string;
  name: string;
  bpm: number;
  bars: typeof STUDIO_BARS;
  beatsPerBar: typeof BEATS_PER_BAR;
  notes: StudioNote[];
  quantize: QuantizeDivision;
  drumEnabled: boolean;
  pinMuted: boolean;
  drumMuted: boolean;
  pinVolume: number;
  drumVolume: number;
  updatedAt: number;
};

export function createStudioProject(): StudioProject {
  return {
    version: 1,
    id: "virtual-pin-demo",
    name: "ลายพิณแรกของฉัน",
    bpm: 96,
    bars: STUDIO_BARS,
    beatsPerBar: BEATS_PER_BAR,
    notes: [],
    quantize: "off",
    drumEnabled: false,
    pinMuted: false,
    drumMuted: false,
    pinVolume: 0.82,
    drumVolume: 0.62,
    updatedAt: Date.now(),
  };
}

export function quantizeStep(division: QuantizeDivision) {
  if (division === "1/8") return 0.5;
  if (division === "1/16") return 0.25;
  return 0;
}

export function quantizeBeat(beat: number, division: QuantizeDivision) {
  const step = quantizeStep(division);
  if (!step) return Math.max(0, Math.min(STUDIO_BEATS - 0.01, beat));
  return Math.max(0, Math.min(STUDIO_BEATS - step, Math.round(beat / step) * step));
}

export function quantizeNotes(notes: StudioNote[], division: QuantizeDivision) {
  return notes
    .map(note => ({ ...note, beat: quantizeBeat(note.beat, division) }))
    .sort((a, b) => a.beat - b.beat);
}

export function beatLabel(beat: number) {
  const safeBeat = Math.max(0, beat);
  const bar = Math.floor(safeBeat / BEATS_PER_BAR) + 1;
  const withinBar = safeBeat % BEATS_PER_BAR;
  const quarter = Math.floor(withinBar) + 1;
  const sixteenth = Math.floor((withinBar % 1) * 4) + 1;
  return `${bar}.${quarter}.${sixteenth}`;
}

export function readStudioProject(raw: string | null): StudioProject | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StudioProject>;
    if (value.version !== 1 || !Array.isArray(value.notes)) return null;
    const base = createStudioProject();
    return {
      ...base,
      ...value,
      version: 1,
      id: typeof value.id === "string" ? value.id : base.id,
      name: typeof value.name === "string" && value.name.trim() ? value.name.slice(0, 80) : base.name,
      bpm: typeof value.bpm === "number" ? Math.max(60, Math.min(160, Math.round(value.bpm))) : base.bpm,
      bars: STUDIO_BARS,
      beatsPerBar: BEATS_PER_BAR,
      notes: value.notes
        .filter((note): note is StudioNote => Boolean(note)
          && typeof note.id === "string"
          && typeof note.beat === "number"
          && typeof note.string === "number"
          && typeof note.fret === "number")
        .map(note => ({
          ...note,
          beat: Math.max(0, Math.min(STUDIO_BEATS - 0.01, note.beat)),
          durationBeats: Math.max(0.125, Math.min(4, Number(note.durationBeats) || 0.5)),
          string: Math.max(0, Math.min(2, note.string)) as StringIndex,
          fret: Math.max(0, Math.min(6, Math.round(note.fret))),
          velocity: Math.max(1, Math.min(127, Math.round(Number(note.velocity) || 96))),
        }))
        .sort((a, b) => a.beat - b.beat),
      quantize: value.quantize === "1/8" || value.quantize === "1/16" ? value.quantize : "off",
      pinVolume: typeof value.pinVolume === "number" ? Math.max(0, Math.min(1, value.pinVolume)) : base.pinVolume,
      drumVolume: typeof value.drumVolume === "number" ? Math.max(0, Math.min(1, value.drumVolume)) : base.drumVolume,
    };
  } catch {
    return null;
  }
}

