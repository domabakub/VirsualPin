export type Articulation = "direct" | "pair" | "kro" | "roll";
export type RanatSource = "touch" | "keyboard" | "camera" | "demo";
export type RanatEvent = { id: string; bar: number; onsetMs: number; velocity: number; hand: "L" | "R"; source: RanatSource; assisted: boolean };
export type RanatTake = { version: 1; instrumentId: "ranat"; tuningId: "equal-seven-a3-v1"; id: string; name: string; createdAt: number; durationMs: number; events: RanatEvent[] };
const labels = ["ลา", "ที", "โด", "เร", "มี", "ฟา", "ซอล"];
export const bars = Array.from({ length: 21 }, (_, index) => ({ id: index, label: labels[index % 7], register: Math.floor(index / 7), frequency: 220 * 2 ** (index / 7) }));
export const articulations: { id: Articulation; title: string; english: string; description: string }[] = [
  { id: "direct", title: "ตีเอง", english: "SINGLE", description: "แตะหนึ่งครั้ง ได้หนึ่งเสียง ใช้สองนิ้วตีพร้อมกันหรือสลับกันได้" },
  { id: "pair", title: "ตีคู่", english: "PAIRS", description: "แตะโน้ตฐานหนึ่งครั้ง สองไม้ตีคู่เสียงที่เลือกพร้อมกัน" },
  { id: "kro", title: "กรอช่วย", english: "SUSTAIN", description: "แตะค้างที่โน้ตฐาน สองไม้สลับตีคู่เสียงต่อเนื่อง ปล่อยเพื่อหยุด" },
  { id: "roll", title: "รัวเสียงเดียว", english: "ROLL", description: "แตะค้าง สองไม้ตีสลับกันบนลูกเดียว ปล่อยเพื่อหยุด" },
];
export function validBar(bar: number) { return Number.isInteger(bar) && bar >= 0 && bar < bars.length; }
export function resolvePair(base: number, offset: number): [number, number] | null {
  if (!validBar(base) || !Number.isInteger(offset) || offset < 1 || offset > 7) return null;
  return [base, validBar(base + offset) ? base + offset : base - offset];
}
export function patternNote(base: number, offset: number, mode: "kro" | "roll", step: number) {
  const pair = mode === "roll" ? (validBar(base) ? [base, base] : null) : resolvePair(base, offset);
  if (!pair) return null;
  return { bar: pair[step % 2], hand: (step % 2 ? "R" : "L") as "L" | "R" };
}
export function parseRanatTake(value: unknown): RanatTake | null {
  if (!value || typeof value !== "object") return null;
  const take = value as Partial<RanatTake>;
  if (take.version !== 1 || take.instrumentId !== "ranat" || take.tuningId !== "equal-seven-a3-v1" || typeof take.id !== "string" || typeof take.name !== "string" || !Number.isFinite(take.createdAt) || !Number.isFinite(take.durationMs) || take.durationMs! < 0 || take.durationMs! > 300_000 || !Array.isArray(take.events) || take.events.length > 12000) return null;
  if (!take.events.every(e => e && typeof e.id === "string" && validBar(e.bar) && Number.isFinite(e.onsetMs) && e.onsetMs >= 0 && e.onsetMs <= take.durationMs! && Number.isFinite(e.velocity) && e.velocity > 0 && e.velocity <= 1 && ["L", "R"].includes(e.hand) && ["touch", "keyboard", "camera", "demo"].includes(e.source) && typeof e.assisted === "boolean")) return null;
  return { version: 1, instrumentId: "ranat", tuningId: "equal-seven-a3-v1", id: take.id.slice(0, 100), name: take.name.slice(0, 80), createdAt: take.createdAt!, durationMs: take.durationMs!, events: [...take.events].sort((a, b) => a.onsetMs - b.onsetMs) };
}
export const KEYBOARD_KEYS = "asdfghjkl;";
export const NUMBER_KEYS = "1234567890";
/** Physical number/letter rows also work with the Thai keyboard layout. */
export function ranatKeyboardIndex(code: string, key: string) {
  if (/^Digit[0-9]$/.test(code)) return NUMBER_KEYS.indexOf(code.slice(-1));
  if (/^Numpad[0-9]$/.test(code)) return /^[0-9]$/.test(key) ? NUMBER_KEYS.indexOf(code.slice(-1)) : -1;
  const letterCodes = ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon"];
  const physical = letterCodes.indexOf(code);
  return physical >= 0 ? physical : key.length === 1 ? KEYBOARD_KEYS.indexOf(key.toLowerCase()) : -1;
}
