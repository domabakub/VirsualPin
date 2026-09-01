"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PlayIcon, SearchIcon } from "@/components/icons";
import { AppHeader } from "@/components/navigation/AppHeader";
import { AppFooter } from "@/components/navigation/AppFooter";
import { BottomNav } from "@/components/navigation/BottomNav";
import { songs, type Song } from "@/data/songs";
import { usePracticeData } from "@/hooks/usePracticeData";

const filters = ["ทั้งหมด", "เพลงพื้นฐาน", "เพลงไทยเดิม", "เพลงฝึกทักษะ"] as const;

function SongRow({ song, progress, ready, index }: { song: Song; progress: number; ready: boolean; index: number }) {
  return <article className="song-row"><Link href={`/play/${song.slug}`} aria-label={`เล่นเพลง ${song.title}`}>
    <span className="song-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
    <div className="song-description"><p className="song-category">{song.category}</p><h2>{song.title}</h2><p className="song-subtitle">{song.subtitle}</p><p className="song-meta">{song.notes.length} โน้ต <span>·</span> {song.bpm} BPM <span>·</span> {song.difficulty}</p></div>
    <div className="song-progress"><progress value={progress} max={100} aria-label={`ความคืบหน้า ${song.title}`} /><span>{!ready ? "กำลังอ่านผล…" : progress === 100 ? "ฝึกครบแล้ว ✓" : progress ? `ฝึกแล้ว ${progress}%` : "ยังไม่ได้เริ่ม"}</span></div>
    <span aria-hidden="true" className="song-play"><PlayIcon className="size-4" /></span>
  </Link></article>;
}

export function SongLibrary({ learningMode = false, categoryFilter = "ทั้งหมด" }: { learningMode?: boolean; categoryFilter?: string }) {
  const filter = learningMode ? "เพลงพื้นฐาน" : filters.find(item => item === categoryFilter) ?? "ทั้งหมด";
  const { records, ready, storageTemporary } = usePracticeData();
  const [query, setQuery] = useState("");
  const visibleSongs = useMemo(() => songs.filter(song => (filter === "ทั้งหมด" || song.category === filter) && `${song.title} ${song.subtitle}`.toLowerCase().includes(query.trim().toLowerCase())), [filter, query]);
  return <div className="app-shell library-page">
    <AppHeader active={learningMode ? "learn" : "songs"} />
    <main id="main-content" tabIndex={-1} className="page-width library-main">
      <section className="library-heading"><div><p className="eyebrow">{learningMode ? "ONE NOTE AT A TIME" : "FIND YOUR NEXT MELODY"}</p><h1>{learningMode ? "พื้นฐานการเล่นพิณ" : "เลือกเพลงที่อยากฝึก"}<span>.</span></h1><p className="page-description">{learningMode ? "ทำความรู้จักสายและเฟรต เริ่มทีละโน้ต ในจังหวะของคุณ" : "ให้เสียงที่คุณชอบ เป็นจุดเริ่มต้นของวันนี้"}</p></div>
        <div className="library-search"><label htmlFor="song-search">ค้นหาเพลง</label><div className="search-field"><SearchIcon aria-hidden="true" className="size-5" /><input id="song-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="ชื่อเพลงหรือทักษะที่อยากฝึก" /></div></div>
      </section>
      <p className="sample-notice"><span>แบบฝึกตัวอย่าง</span> ใช้ทดลองสายและเฟรต ยังไม่ใช่ทำนองต้นฉบับที่ตรวจสอบแล้ว</p>
      {learningMode && <ol className="learning-steps"><li><span>01</span>เลือกสายและเฟรต</li><li><span>02</span>ลองดีด ฟังเสียง</li><li><span>03</span>เริ่มฝึกทีละโน้ต</li></ol>}
      <div className="library-toolbar">{!learningMode && <nav aria-label="หมวดแบบฝึก" className="filter-tabs">{filters.map(item => <Link key={item} href={item === "ทั้งหมด" ? "/songs" : `/songs?filter=${encodeURIComponent(item)}`} scroll={false} aria-current={filter === item ? "true" : undefined}>{item}</Link>)}</nav>}<p role="status">{visibleSongs.length} แบบฝึก{storageTemporary ? " · ยังไม่ได้บันทึกถาวร" : ""}</p></div>
      <section className="song-list" aria-label="รายการแบบฝึก">{visibleSongs.map((song, index) => <SongRow key={song.slug} song={song} index={index} ready={ready} progress={records[song.slug]?.total === song.notes.length ? Math.round(records[song.slug].step / song.notes.length * 100) : 0} />)}</section>
      {visibleSongs.length === 0 && <div className="empty-state"><SearchIcon aria-hidden="true" className="size-8" /><h2>ไม่พบเพลงที่ค้นหา</h2><p>ลองใช้ชื่อสั้นลง หรือกลับไปดูแบบฝึกทั้งหมด</p><Link href="/songs" onClick={() => setQuery("")} className="ui-button ui-primary">ล้างการค้นหาและตัวกรอง</Link></div>}
    </main><AppFooter /><BottomNav learningMode={learningMode} />
  </div>;
}
