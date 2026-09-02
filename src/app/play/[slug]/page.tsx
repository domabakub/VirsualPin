import { notFound } from "next/navigation";
import { VirtualPhinStudio } from "@/components/play/VirtualPhinStudio";
import { getSong, songs, type Song } from "@/data/songs";

const freePlaySong: Song = {
  slug: "free-play",
  title: "เล่นพิณอิสระ",
  subtitle: "สำรวจเสียงพิณในแบบของคุณ",
  category: "เพลงพื้นฐาน",
  difficulty: "เริ่มต้น",
  duration: "∞",
  bpm: 80,
  accent: "#38d67a",
  notes: [],
};

export function generateStaticParams() {
  return [...songs.map((song) => ({ slug: song.slug })), { slug: "free-play" }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `${slug === "free-play" ? "เล่นพิณอิสระ" : getSong(slug)?.title ?? "ไม่พบแบบฝึก"} | Virtual Phin` };
}

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const freePlay = slug === "free-play";
  const song = freePlay ? freePlaySong : getSong(slug);
  if (!song) notFound();
  return <VirtualPhinStudio key={song.slug} song={song} freePlay={freePlay} />;
}
