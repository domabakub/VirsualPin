"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowIcon, ClockIcon, PlayIcon, SearchIcon } from "@/components/icons";
import { AppBrand } from "@/components/navigation/AppBrand";
import { BottomNav } from "@/components/navigation/BottomNav";
import { songs, type Song } from "@/data/songs";

const filters = ["ทั้งหมด", "เพลงพื้นฐาน", "เพลงไทยเดิม", "เพลงฝึกทักษะ"] as const;

function PinCover({ song }: { song: Song }) {
  return (
    <div className="relative aspect-[1.45] overflow-hidden rounded-[22px]" style={{ background: `linear-gradient(145deg, ${song.accent}22, ${song.accent}08 58%, #fff)` }}>
      <span className="absolute left-4 top-4 rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold backdrop-blur" style={{ color: song.accent }}>{song.category}</span>
      <svg viewBox="0 0 360 210" className="absolute inset-0 size-full" aria-hidden="true">
        <g transform="rotate(-7 180 105)">
          <path d="M260 96c16-19 43-21 62-7 21 16 25 47 9 68-18 24-54 28-77 8-17-15-22-42-10-61 4-5 9-10 16-8Z" fill={song.accent} opacity=".72" />
          <ellipse cx="293" cy="130" rx="11" ry="16" fill="#fff" opacity=".5" />
          <path d="m266 106-186-40-5 48 191 34Z" fill={song.accent} opacity=".58" />
          <path d="M82 66c-7-20 2-42 23-50-8 13-7 24 2 32 8 8 4 18-4 23" fill={song.accent} opacity=".75" />
          {[0, 1, 2].map((n) => <line key={n} x1="80" y1={77 + n * 10} x2="270" y2={113 + n * 9} stroke="white" strokeWidth="2" opacity=".9" />)}
          {[115, 150, 186, 222].map((x) => <line key={x} x1={x} y1="73" x2={x - 7} y2="127" stroke="white" strokeWidth="3" opacity=".55" />)}
        </g>
        <circle cx="40" cy="167" r="4" fill={song.accent} opacity=".25" /><circle cx="64" cy="180" r="2" fill={song.accent} opacity=".2" />
      </svg>
    </div>
  );
}

function SongCard({ song }: { song: Song }) {
  return (
    <article className="group rounded-[28px] border border-slate-100 bg-white p-3 shadow-[0_14px_45px_rgba(36,69,113,.06)] transition hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(36,69,113,.12)]">
      <PinCover song={song} />
      <div className="px-2 pb-2 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="font-serif text-xl text-[#102544]">{song.title}</h2><p className="mt-1 line-clamp-1 text-xs text-slate-400">{song.subtitle}</p></div>
          <Link href={`/play/${song.slug}`} aria-label={`เล่นเพลง ${song.title}`} className="grid size-10 shrink-0 place-items-center rounded-full text-white shadow-lg transition group-hover:scale-105" style={{ backgroundColor: song.accent, boxShadow: `0 8px 22px ${song.accent}35` }}><PlayIcon className="ml-0.5 size-4" /></Link>
        </div>
        <div className="mt-4 flex items-center gap-3 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1"><ClockIcon className="size-3.5" />{song.duration}</span>
          <span>{song.bpm} BPM</span>
          <span className="ml-auto rounded-full bg-slate-50 px-2.5 py-1">{song.difficulty}</span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all" style={{ width: `${song.progress}%`, backgroundColor: song.accent }} /></div>
        <p className="mt-2 text-right text-[10px] text-slate-400">{song.progress ? `เรียนแล้ว ${song.progress}%` : "ยังไม่ได้เริ่ม"}</p>
      </div>
    </article>
  );
}

export function SongLibrary({ learningMode = false }: { learningMode?: boolean }) {
  const [filter, setFilter] = useState<(typeof filters)[number]>(learningMode ? "เพลงพื้นฐาน" : "ทั้งหมด");
  const [query, setQuery] = useState("");
  const visibleSongs = useMemo(() => songs.filter((song) => (filter === "ทั้งหมด" || song.category === filter) && song.title.toLowerCase().includes(query.toLowerCase())), [filter, query]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,#edf4ff,transparent_35rem),linear-gradient(#f8faff,#f8faff)] text-[#102544]">
      <div className="mx-auto max-w-[1240px] px-5 pt-5 md:px-9 md:pt-7">
        <header className="flex items-center justify-between"><AppBrand /><Link href="/play/free-play" className="hidden items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-blue-200 sm:inline-flex">เล่นอิสระ <ArrowIcon className="size-4" /></Link></header>

        <section className="mt-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div><p className="text-xs font-bold tracking-[.22em] text-blue-500">MUSIC LIBRARY</p><h1 className="mt-2 font-serif text-4xl tracking-[-.035em] md:text-5xl">เลือกเพลงที่อยากฝึก</h1><p className="mt-3 text-sm text-slate-500">บทเพลงตัวอย่างถูกจัดลำดับจากพื้นฐานไปจนถึงการฝึกขั้นสูง</p></div>
          <label className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><SearchIcon className="size-5 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อเพลง…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-300" /></label>
        </section>

        <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
          {filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition ${filter === item ? "bg-[#102544] text-white shadow-md" : "border border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-600"}`}>{item}</button>)}
        </div>

        <section className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleSongs.map((song) => <SongCard key={song.slug} song={song} />)}
        </section>
        {visibleSongs.length === 0 && <div className="my-20 text-center text-sm text-slate-400">ไม่พบเพลงที่ค้นหา</div>}
      </div>
      <BottomNav />
    </div>
  );
}
