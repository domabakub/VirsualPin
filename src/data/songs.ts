import { getPinNoteName } from "@/lib/audio/pinTuning";

export type StringIndex = 0 | 1 | 2;

export type PinNote = {
  string: StringIndex;
  fret: number;
  label: string;
  beat: number;
};

export type Song = {
  slug: string;
  title: string;
  subtitle: string;
  category: "เพลงพื้นฐาน" | "เพลงไทยเดิม" | "เพลงฝึกทักษะ";
  difficulty: "เริ่มต้น" | "ปานกลาง" | "ท้าทาย";
  duration: string;
  bpm: number;
  accent: string;
  notes: PinNote[];
};

const laoDuangDuen: Omit<PinNote, "label">[] = [
  { string: 0, fret: 0, beat: 1 },
  { string: 1, fret: 0, beat: 1 },
  { string: 2, fret: 0, beat: 2 },
  { string: 1, fret: 2, beat: 1 },
  { string: 1, fret: 0, beat: 1 },
  { string: 0, fret: 2, beat: 2 },
  { string: 0, fret: 4, beat: 1 },
  { string: 1, fret: 0, beat: 1 },
  { string: 2, fret: 0, beat: 2 },
  { string: 1, fret: 2, beat: 1 },
  { string: 0, fret: 2, beat: 1 },
  { string: 0, fret: 0, beat: 2 },
];

function transpose(notes: Omit<PinNote, "label">[], shift: number): Omit<PinNote, "label">[] {
  return notes.map((note, index) => ({
    ...note,
    string: ((note.string + (index % 3 === 0 ? 1 : 0)) % 3) as StringIndex,
    fret: Math.max(0, Math.min(6, note.fret + shift)),
  }));
}

const songExamples: (Omit<Song, "notes"> & { notes: Omit<PinNote, "label">[] })[] = [
  {
    slug: "lao-duang-duen",
    title: "ลาวดวงเดือน",
    subtitle: "ทำนองอ่อนหวานสำหรับเริ่มต้นฝึกพิณ",
    category: "เพลงพื้นฐาน",
    difficulty: "เริ่มต้น",
    duration: "2:40",
    bpm: 78,
    accent: "#3f7bf3",
    notes: laoDuangDuen,
  },
  {
    slug: "khang-khao-kin-kluai",
    title: "ค้างคาวกินกล้วย",
    subtitle: "ฝึกความคล่องตัวและการสลับสาย",
    category: "เพลงไทยเดิม",
    difficulty: "ปานกลาง",
    duration: "3:15",
    bpm: 104,
    accent: "#19ad83",
    notes: transpose(laoDuangDuen, 1),
  },
  {
    slug: "lao-siang-thian",
    title: "ลาวเสี่ยงเทียน",
    subtitle: "เรียนรู้การลากเสียงและจังหวะช้า",
    category: "เพลงไทยเดิม",
    difficulty: "เริ่มต้น",
    duration: "2:55",
    bpm: 72,
    accent: "#8b65ec",
    notes: transpose(laoDuangDuen, 0),
  },
  {
    slug: "khamen-sai-yok",
    title: "เขมรไทรโยค",
    subtitle: "บทเพลงสำคัญสำหรับฝึกน้ำหนักมือ",
    category: "เพลงฝึกทักษะ",
    difficulty: "ปานกลาง",
    duration: "4:05",
    bpm: 88,
    accent: "#ea7d5c",
    notes: transpose(laoDuangDuen, 2),
  },
  {
    slug: "ton-worachet",
    title: "ต้นวรเชษฐ์",
    subtitle: "ฝึกวลีเพลงและการเปลี่ยนตำแหน่งนิ้ว",
    category: "เพลงฝึกทักษะ",
    difficulty: "ท้าทาย",
    duration: "4:30",
    bpm: 112,
    accent: "#d49b28",
    notes: transpose(laoDuangDuen, 2).reverse(),
  },
  {
    slug: "soi-saeng-daeng",
    title: "สร้อยแสงแดง",
    subtitle: "ฝึกการดีดต่อเนื่องและความแม่นยำ",
    category: "เพลงไทยเดิม",
    difficulty: "ท้าทาย",
    duration: "3:48",
    bpm: 120,
    accent: "#d55379",
    notes: [...transpose(laoDuangDuen, 1), ...laoDuangDuen.slice(0, 4)],
  },
];

export const songs: Song[] = songExamples.map(song => ({
  ...song,
  notes: song.notes.map(note => ({ ...note, label: getPinNoteName(note.string, note.fret) })),
}));

export function getSong(slug: string) {
  return songs.find((song) => song.slug === slug);
}
