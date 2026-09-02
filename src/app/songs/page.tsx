import { SongLibrary } from "@/components/songs/SongLibrary";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const query = await searchParams;
  return { title: `${query.category === "learn" ? "พื้นฐานการเล่นพิณ" : "คลังแบบฝึก"} | Virtual Phin` };
}

export default async function SongsPage({ searchParams }: { searchParams: Promise<{ category?: string; filter?: string }> }) {
  const query = await searchParams;
  return <SongLibrary key={query.category === "learn" ? "learn" : "library"} learningMode={query.category === "learn"} categoryFilter={query.filter} />;
}
