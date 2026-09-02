import type { Metadata } from "next";
import { TakeDetail } from "@/components/takes/TakeDetail";

export const metadata: Metadata = { title: "ดูบันทึกการเล่น | Virtual Phin" };

export default async function TakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TakeDetail id={id} />;
}

