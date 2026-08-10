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
  progress: number;
  accent: string;
  notes: PinNote[];
};

const laoDuangDuen: PinNote[] = [
  { string: 0, fret: 0, label: "D", beat: 1 },
  { string: 1, fret: 0, label: "F♯", beat: 1 },
  { string: 2, fret: 0, label: "A", beat: 2 },
  { string: 1, fret: 2, label: "G♯", beat: 1 },
  { string: 1, fret: 0, label: "F♯", beat: 1 },
  { string: 0, fret: 2, label: "E", beat: 2 },
  { string: 0, fret: 4, label: "F♯", beat: 1 },
  { string: 1, fret: 0, label: "F♯", beat: 1 },
  { string: 2, fret: 0, label: "A", beat: 2 },
  { string: 1, fret: 2, label: "G♯", beat: 1 },
  { string: 0, fret: 2, label: "E", beat: 1 },
  { string: 0, fret: 0, label: "D", beat: 2 },
];

function transpose(notes: PinNote[], shift: number): PinNote[] {
  return notes.map((note, index) => ({
    ...note,
    string: ((note.string + (index % 3 === 0 ? 1 : 0)) % 3) as StringIndex,
    fret: Math.max(0, Math.min(6, note.fret + shift)),
  }));
}

export const songs: Song[] = [
  {
    slug: "lao-duang-duen",
    title: "ลาวดวงเดือน",
    subtitle: "ทำนองอ่อนหวานสำหรับเริ่มต้นฝึกพิณ",
    category: "เพลงพื้นฐาน",
    difficulty: "เริ่มต้น",
    duration: "2:40",
    bpm: 78,
    progress: 42,
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
    progress: 18,
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
    progress: 0,
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
    progress: 67,
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
    progress: 0,
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
    progress: 8,
    accent: "#d55379",
    notes: [...transpose(laoDuangDuen, 1), ...laoDuangDuen.slice(0, 4)],
  },
];

export function getSong(slug: string) {
  return songs.find((song) => song.slug === slug);
}
