import { SongLibrary } from "@/components/songs/SongLibrary";

export default async function SongsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const query = await searchParams;
  return <SongLibrary learningMode={query.category === "learn"} />;
}
