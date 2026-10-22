import type { Metadata } from "next";
import Link from "next/link";
import { InstrumentNav } from "@/components/navigation/InstrumentNav";
import Image from "next/image";
import { RanatPlayStage } from "@/components/ranat/RanatPlayStage";
import { instruments } from "@/instruments/registry";

import "./ranat/ranat.css";
import "./instrument-cards.css";
export const metadata: Metadata = { title: "เครื่องดนตรีของคุณ | Phin Next & Ranat Next" };
export default function InstrumentsPage() {
  return <div className="rn-page app-shell"><header className="rn-header"><Link href="/" className="app-brand">next instruments<span>.</span></Link><Link className="rn-back" href="/">กลับหน้าแรก ↗</Link></header><InstrumentNav active="instruments" /><main id="main-content" className="rn-main rn-hub" tabIndex={-1}><p className="eyebrow">ROOTED IN CULTURE. MADE FOR YOU.</p><h1>เสียงคุ้นเคย.<br/><span>ความเป็นไปได้ใหม่.</span></h1><p>เลือกเครื่องดนตรี แล้วค้นหาจังหวะที่เป็นคุณ</p><p className="rn-picker-hint">ชี้ โฟกัส หรือแตะการ์ด แล้วปลุกเสียงดั้งเดิมให้มีชีวิต</p><div className="rn-instrument-grid">{instruments.map((instrument, index) => <Link href={instrument.href} key={instrument.id} className={`rn-instrument-card rn-living-card rn-card-${instrument.id}`}><div className="rn-label-row"><span className="eyebrow">0{index + 1} / {instrument.subtitle}</span><small>{instrument.status}</small></div><div className="rn-card-art rn-photo-art">{instrument.id === "ranat" ? <RanatPlayStage showcase /> : <Image src="/images/phin-cutout.png" alt="ภาพถ่ายพิณไม้สามสาย ลบพื้นหลัง" width={1334} height={1179} loading="eager" sizes="(max-width: 640px) 90vw, 45vw"/>}</div><h2>{instrument.name}<span>.</span></h2><p>{instrument.description}</p><span className="ui-button rn-card-cta">รู้จัก{instrument.thai} <span aria-hidden="true">↗</span></span></Link>)}</div><div className="rn-photo-credits"><span>พิณ: ภาพถ่ายลบพื้นหลัง · ระนาด: โมเดล 3D ของโปรเจกต์</span><a href="https://commons.wikimedia.org/wiki/File:Pina%C5%ADo.jpg" target="_blank" rel="noreferrer">พิณ: Respubliko de Gvapolando</a><a href="https://commons.wikimedia.org/wiki/File:Ranat_Ek_-_MET_89.4.303.jpg" target="_blank" rel="noreferrer">ภาพระนาดอ้างอิงเดิม: The Met · 89.4.303</a><a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noreferrer">CC0 · ใช้งานฟรี ↗</a></div><div className="rn-hub-note"><span>MORE SOUNDS. ONE FAMILY.</span><p>เครื่องดนตรีต่างกัน ความสนุกอยู่ใกล้เหมือนเดิม</p></div></main></div>;
}
