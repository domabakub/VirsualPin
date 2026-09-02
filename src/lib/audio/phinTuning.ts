/** Single source of truth for the existing E4 / A3 / E3 tuning. */
export const OPEN_STRING_MIDI = [64, 57, 52] as const;
const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

export function getPhinMidi(string: 0 | 1 | 2, fret: number) {
  return OPEN_STRING_MIDI[string] + fret;
}

export function getPhinFrequency(string: 0 | 1 | 2, fret: number) {
  return 440 * 2 ** ((getPhinMidi(string, fret) - 69) / 12);
}

export function getPhinNoteName(string: 0 | 1 | 2, fret: number, octave = false) {
  const midi = getPhinMidi(string, fret);
  return NOTE_NAMES[midi % 12] + (octave ? Math.floor(midi / 12) - 1 : "");
}
