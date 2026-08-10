import { notFound } from "next/navigation";
import { VirtualPinStudio } from "@/components/play/VirtualPinStudio";
import { getSong, songs, type Song } from "@/data/songs";

const freePlaySong: Song = {
  slug: "free-play",
  title: "เล่นพิณอิสระ",
  subtitle: "สำรวจเสียงพิณในแบบของคุณ",
  category: "เพลงพื้นฐาน",
  difficulty: "เริ่มต้น",
  duration: "∞",
  bpm: 80,
  progress: 0,
  accent: "#38d67a",
  notes: [],
};

export function generateStaticParams() {
  return [...songs.map((song) => ({ slug: song.slug })), { slug: "free-play" }];
}

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const freePlay = slug === "free-play";
  const song = freePlay ? freePlaySong : getSong(slug);
  if (!song) notFound();
  return <VirtualPinStudio song={song} freePlay={freePlay} />;
}
