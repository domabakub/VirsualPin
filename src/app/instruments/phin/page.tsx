import type { Metadata } from "next";
import { HomeDashboard } from "@/components/home/HomeDashboard";
export const metadata: Metadata = { title: "Phin Next | Virtual Phin" };
export default function PhinPage() { return <HomeDashboard/>; }
