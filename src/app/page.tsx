import type { Metadata } from "next";
import { InstrumentLanding } from "@/components/home/InstrumentLanding";

export const metadata: Metadata = {
  title: { absolute: "Next Instruments | พิณและระนาดออนไลน์" },
  description: "เสียงคุ้นเคย วิธีเล่นใหม่ เลือกเล่นพิณหรือระนาดบนเบราว์เซอร์ เรียนรู้เรื่องราวเครื่องดนตรีไทย และบันทึกทำนองของคุณ",
};

export default function Home() {
  return <InstrumentLanding />;
}
