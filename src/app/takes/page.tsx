import type { Metadata } from "next";
import { QuickTakesLibrary } from "@/components/takes/QuickTakesLibrary";

export const metadata: Metadata = { title: "บันทึกของฉัน | Virtual Phin", description: "บันทึกโน้ตที่เล่นไว้ฟังและฝึกตามภายหลัง" };

export default function TakesPage() { return <QuickTakesLibrary />; }

