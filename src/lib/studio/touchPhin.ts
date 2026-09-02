export const TOUCH_PHIN_FRETS = 7;

export type TouchScaleId = "chromatic" | "major" | "minor" | "major-pentatonic" | "minor-pentatonic";

export const TOUCH_KEYS = [
  { value: 0, label: "C" },
  { value: 1, label: "C♯" },
  { value: 2, label: "D" },
  { value: 3, label: "E♭" },
  { value: 4, label: "E" },
  { value: 5, label: "F" },
  { value: 6, label: "F♯" },
  { value: 7, label: "G" },
  { value: 8, label: "A♭" },
  { value: 9, label: "A" },
  { value: 10, label: "B♭" },
  { value: 11, label: "B" },
] as const;

export const TOUCH_SCALES: ReadonlyArray<{ value: TouchScaleId; label: string; intervals: readonly number[] }> = [
  { value: "chromatic", label: "Chromatic", intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { value: "major", label: "Major", intervals: [0, 2, 4, 5, 7, 9, 11] },
  { value: "minor", label: "Minor", intervals: [0, 2, 3, 5, 7, 8, 10] },
  { value: "major-pentatonic", label: "Major Pentatonic", intervals: [0, 2, 4, 7, 9] },
  { value: "minor-pentatonic", label: "Minor Pentatonic", intervals: [0, 3, 5, 7, 10] },
];

export function isTouchScaleId(value: unknown): value is TouchScaleId {
  return TOUCH_SCALES.some(scale => scale.value === value);
}

export function isMidiInTouchScale(midi: number, root: number, scaleId: TouchScaleId) {
  const scale = TOUCH_SCALES.find(candidate => candidate.value === scaleId) ?? TOUCH_SCALES[0];
  const interval = ((midi - root) % 12 + 12) % 12;
  return scale.intervals.includes(interval);
}

