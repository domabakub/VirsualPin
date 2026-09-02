import type { StringIndex } from "@/data/songs";
import { isTouchScaleId, type TouchScaleId } from "@/lib/studio/touchPhin";

export const STUDIO_BARS = 8;
export const BEATS_PER_BAR = 4;
export const STUDIO_BEATS = STUDIO_BARS * BEATS_PER_BAR;

export type QuantizeDivision = "off" | "1/8" | "1/16";

export type StudioBendPoint = {
  offsetBeats: number;
  cents: number;
};

export type StudioNote = {
  id: string;
  beat: number;
  durationBeats: number;
  string: StringIndex;
  fret: number;
  velocity: number;
  bendPoints?: StudioBendPoint[];
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
  phinMuted: boolean;
  drumMuted: boolean;
  phinVolume: number;
  drumVolume: number;
  touchKeyRoot: number;
  touchScale: TouchScaleId;
  touchScaleLock: boolean;
  touchBendRange: 1 | 2;
  updatedAt: number;
};

export function createStudioProject(): StudioProject {
  return {
    version: 1,
    id: "virtual-phin-demo",
    name: "ลายพิณแรกของฉัน",
    bpm: 96,
    bars: STUDIO_BARS,
    beatsPerBar: BEATS_PER_BAR,
    notes: [],
    quantize: "off",
    drumEnabled: false,
    phinMuted: false,
    drumMuted: false,
    phinVolume: 0.82,
    drumVolume: 0.62,
    touchKeyRoot: 4,
    touchScale: "major-pentatonic",
    touchScaleLock: false,
    touchBendRange: 2,
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
          bendPoints: Array.isArray(note.bendPoints) ? note.bendPoints
            .filter(point => point && typeof point.offsetBeats === "number" && typeof point.cents === "number")
            .map(point => ({
              offsetBeats: Math.max(0, Math.min(4, point.offsetBeats)),
              cents: Math.max(-1_200, Math.min(1_200, Math.round(point.cents))),
            }))
            .sort((a, b) => a.offsetBeats - b.offsetBeats)
            .slice(0, 160) : [],
        }))
        .sort((a, b) => a.beat - b.beat),
      quantize: value.quantize === "1/8" || value.quantize === "1/16" ? value.quantize : "off",
      phinVolume: typeof value.phinVolume === "number" ? Math.max(0, Math.min(1, value.phinVolume)) : base.phinVolume,
      drumVolume: typeof value.drumVolume === "number" ? Math.max(0, Math.min(1, value.drumVolume)) : base.drumVolume,
      touchKeyRoot: typeof value.touchKeyRoot === "number" ? Math.max(0, Math.min(11, Math.round(value.touchKeyRoot))) : base.touchKeyRoot,
      touchScale: isTouchScaleId(value.touchScale) ? value.touchScale : base.touchScale,
      touchScaleLock: typeof value.touchScaleLock === "boolean" ? value.touchScaleLock : base.touchScaleLock,
      touchBendRange: value.touchBendRange === 1 ? 1 : 2,
    };
  } catch {
    return null;
  }
}
