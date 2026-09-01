import type { Metadata } from "next";
import { StudioWorkspace } from "@/components/studio/StudioWorkspace";
import "./studio.css";

export const metadata: Metadata = {
  title: "Studio | Virtual Pin",
  description: "บันทึก แก้จังหวะ และส่งออกผลงานพิณเป็น WAV หรือ MIDI",
};

export default function StudioPage() {
  return <StudioWorkspace />;
}

