"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/navigation/AppHeader";
import { VirtualPhinStudio } from "@/components/play/VirtualPhinStudio";
import { getQuickTake } from "@/lib/takes/storage";
import { quickTakeToSong, type QuickTake } from "@/lib/takes/types";

export function TakePracticeLoader({ id }: { id: string }) {
  const [take, setTake] = useState<QuickTake | null | undefined>(undefined);
  useEffect(() => { void getQuickTake(id).then(setTake); }, [id]);
  if (take === undefined) return <div className="practice-page"><AppHeader studio /><main id="main-content" className="take-detail-main"><p>กำลังเตรียมแบบฝึก…</p></main></div>;
  if (!take) return <div className="practice-page"><AppHeader studio /><main id="main-content" className="take-detail-main take-missing"><h1>ไม่พบบันทึกนี้</h1><Link href="/takes" className="ui-button ui-primary">กลับไปบันทึกของฉัน</Link></main></div>;
  return <VirtualPhinStudio song={quickTakeToSong(take)} backHref={`/takes/${take.id}`} backLabel="กลับไปบันทึกนี้" practiceSource="take" />;
}
