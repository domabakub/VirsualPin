import type { Metadata } from "next";
import { RanatWorkspace } from "@/components/ranat/RanatWorkspace";
import "../ranat.css";

export const metadata: Metadata = { title: "เล่นระนาดเอก | Ranat Next", description: "ลองตีเดี่ยว ตีคู่ กรอ และบันทึกทำนองด้วยระนาดจำลอง" };
export default function RanatPlayPage() { return <RanatWorkspace/>; }
