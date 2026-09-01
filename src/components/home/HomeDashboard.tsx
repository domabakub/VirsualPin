"use client";

import Image from "next/image";
import Link from "next/link";
import { usePracticeData } from "@/hooks/usePracticeData";
import { songs } from "@/data/songs";
import { ArrowIcon, BookIcon, MusicIcon, PlayIcon } from "@/components/icons";
import { AppHeader } from "@/components/navigation/AppHeader";
import { AppFooter } from "@/components/navigation/AppFooter";
import { BottomNav } from "@/components/navigation/BottomNav";
import { PinHeroArt } from "./PinHeroArt";

const actions = [
  { href: "/play/free-play", title: "เริ่มจากความสนุก", description: "เลือกสาย ลองดีด แล้วค้นหาเสียงที่ชอบ ไม่ต้องมีพื้นฐาน", label: "เล่นอิสระ", icon: PlayIcon, number: "01" },
  { href: "/songs?category=learn", title: "ค่อย ๆ รู้จักพิณ", description: "เรียนรู้สายและเฟรตทีละโน้ต ตามจังหวะที่สบายสำหรับคุณ", label: "เริ่มต้นเรียน", icon: BookIcon, number: "02" },
  { href: "/studio", title: "เปลี่ยนเสียงเป็นเพลง", description: "อัดลายพิณ วางจังหวะ แก้โน้ต และส่งออกเป็น WAV หรือ MIDI", label: "เปิด Studio", icon: MusicIcon, number: "03" },
];

export function HomeDashboard() {
  const { records, ready, storageTemporary } = usePracticeData();
  const completed = songs.filter(song => records[song.slug]?.total === song.notes.length && records[song.slug]?.step === song.notes.length).length;
  const resume = songs.filter(song => records[song.slug]?.total === song.notes.length && records[song.slug]?.step > 0 && records[song.slug]?.step < song.notes.length).sort((a, b) => records[b.slug].updatedAt - records[a.slug].updatedAt)[0];
  return <div className="app-shell home-page">
    <AppHeader active="home" />
    <div className="announcement">เครื่องดนตรีไทย ในพื้นที่ของคุณ <span aria-hidden="true">·</span> ไม่ต้องมีพิณ ก็เริ่มได้</div>
    <main id="main-content" tabIndex={-1}>
      <section className="home-hero page-width">
        <div className="hero-copy">
          <p className="eyebrow">A NEW WAY TO PLAY</p>
          <h1>เสียงคุ้นเคย.<br /><span>วิธีเล่นใหม่.</span></h1>
          <p className="hero-description">สัมผัสเสียงพิณไทยผ่านปลายนิ้ว<br className="hidden sm:block" /> ลองเล่น เรียนรู้ และสร้างจังหวะในแบบคุณ</p>
          <div className="hero-actions"><Link href={resume ? `/play/${resume.slug}` : "/play/free-play"} className="ui-button ui-primary">{resume ? `ฝึกต่อ · ${resume.title}` : "ลองเล่นพิณ"}</Link><Link href="/songs?category=learn" className="text-link">เริ่มจากพื้นฐาน <span aria-hidden="true">›</span></Link></div>
          <p className="hero-footnote">เล่นได้ทันทีบนเบราว์เซอร์ · ไม่ต้องสมัครสมาชิก</p>
        </div>
        <PinHeroArt />
      </section>

      <section className="ways-section">
        <div className="page-width">
          <div className="section-heading"><h2>เริ่มง่าย ๆ.<br /><span>เล่นได้ในแบบคุณ.</span></h2><p>ไม่ต้องรีบเก่ง แค่เริ่มจากเสียงแรก</p></div>
          <div className="ways-grid">{actions.map(action => {
            const Icon = action.icon;
            return <Link href={action.href} key={action.number} className="way-card"><div className="way-top"><Icon aria-hidden="true" className="size-6" /><span>{action.number}</span></div><h3>{action.title}</h3><p>{action.description}</p><span className="way-action">{action.label}<ArrowIcon aria-hidden="true" className="size-4" /></span></Link>;
          })}</div>
        </div>
      </section>

      <section className="heritage-section page-width">
        <div className="heritage-image"><Image src="/images/phin-met.jpg" alt="ภาพถ่ายพิณไทยปลายศตวรรษที่ 19 จากคอลเลกชัน The Metropolitan Museum of Art" width={419} height={720} sizes="(max-width: 767px) 240px, 360px" /><span>THE MET COLLECTION · 89.4.288</span></div>
        <div className="heritage-copy"><p className="eyebrow">ROOTED IN CULTURE</p><h2>จากเสียงดั้งเดิม.<br /><span>สู่การเรียนรู้วันนี้.</span></h2><p>เครื่องดนตรีที่มีเรื่องราว ไม่ควรอยู่ไกลตัว<br />เราชวนคุณมารู้จักพิณ ผ่านประสบการณ์เรียบง่ายบนหน้าจอ</p><p className="heritage-caption">ภาพพิณไทยจากปลายศตวรรษที่ 19<br />The Crosby Brown Collection, The Met</p><Link href="/songs?category=learn" className="text-link">รู้จักพิณทีละโน้ต <span aria-hidden="true">›</span></Link></div>
      </section>

      <section className="progress-section page-width" aria-label="ความก้าวหน้าของคุณ"><div><p className="eyebrow">YOUR OWN RHYTHM</p><h2>ทุกครั้งที่เล่น คืออีกก้าว.</h2><p>{storageTemporary ? "บันทึกถาวรไม่ได้ · ผลฝึกอยู่เฉพาะครั้งนี้" : "ผลฝึกของคุณ บันทึกไว้ในเบราว์เซอร์นี้"}</p></div><div className="progress-number"><strong>{ready ? completed : "—"}</strong><span>/ {songs.length} แบบฝึกสำเร็จ</span></div><Link href="/songs" className="text-link">ดูความคืบหน้า <span aria-hidden="true">›</span></Link></section>
    </main>
    <AppFooter photos /><BottomNav />
  </div>;
}
