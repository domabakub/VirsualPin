import type { Metadata } from "next";
import { TakePracticeLoader } from "@/components/takes/TakePracticeLoader";

export const metadata: Metadata = { title: "ฝึกจากบันทึก | Virtual Phin" };

export default async function TakePracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TakePracticeLoader id={id} />;
}

