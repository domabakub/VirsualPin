import Link from "next/link";
import { ArrowIcon, BookIcon, MusicIcon, PlayIcon } from "@/components/icons";
import { AppBrand } from "@/components/navigation/AppBrand";
import { BottomNav } from "@/components/navigation/BottomNav";
import { PinHeroArt } from "./PinHeroArt";

const actions = [
  { href: "/songs", title: "เล่นพิณ", description: "เลือกเพลงแล้วเริ่มฝึกกับพิณเสมือน", color: "blue", icon: PlayIcon },
  { href: "/songs", title: "คลังเพลง", description: "สำรวจบทเพลงไทยและแบบฝึกหัด", color: "emerald", icon: MusicIcon },
  { href: "/songs?category=learn", title: "เรียนรู้", description: "เรียนตั้งแต่พื้นฐานพร้อม AI แนะนำ", color: "violet", icon: BookIcon },
];

const palette: Record<string, string> = {
  blue: "from-blue-50/80 to-white text-blue-600 border-blue-100 hover:shadow-blue-100",
  emerald: "from-emerald-50/80 to-white text-emerald-600 border-emerald-100 hover:shadow-emerald-100",
  violet: "from-violet-50/80 to-white text-violet-600 border-violet-100 hover:shadow-violet-100",
};

export function HomeDashboard() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_18%_0%,#edf5ff_0,transparent_34rem),linear-gradient(180deg,#fbfdff,#f7faff)] text-[#102544]">
      <div className="mx-auto max-w-[1440px] px-5 pt-5 md:px-9 md:pt-7">
        <header className="flex items-center justify-between">
          <AppBrand />
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-blue-100 bg-white px-4 py-2 text-xs text-slate-500 shadow-sm sm:block">7 วันต่อเนื่อง · 🔥</span>
            <button type="button" aria-label="โปรไฟล์" className="grid size-10 place-items-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-blue-600 shadow-sm">VP</button>
          </div>
        </header>

        <section className="mt-8 grid items-center gap-8 lg:grid-cols-[.86fr_1.14fr] lg:gap-12">
          <div className="max-w-xl py-2 lg:pl-6">
            <p className="text-xs font-bold tracking-[.28em] text-blue-500">ยินดีต้อนรับกลับ</p>
            <h1 className="mt-4 font-serif text-5xl leading-[1.05] tracking-[-.045em] text-[#0a2243] md:text-6xl">มาสร้างเสียงดนตรี<br /><span className="text-blue-600">ด้วยกัน</span></h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-500">เรียน เล่น และอนุรักษ์เสียงพิณไทยผ่าน AI และ Computer Vision ในแบบของคุณ</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/songs" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700">เลือกเพลงเพื่อเริ่ม <ArrowIcon className="size-4" /></Link>
              <Link href="/play/free-play" className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-6 py-3.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">โหมดเล่นอิสระ</Link>
            </div>
          </div>
          <PinHeroArt />
        </section>

        <section className="mt-9 grid gap-4 md:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href} className={`group relative min-h-52 overflow-hidden rounded-[28px] border bg-gradient-to-br p-6 shadow-[0_16px_50px_rgba(42,82,135,.06)] transition hover:-translate-y-1 hover:shadow-xl ${palette[action.color]}`}>
                <span className="grid size-12 place-items-center rounded-2xl bg-white/90 shadow-sm"><Icon className="size-6" /></span>
                <h2 className="mt-5 font-serif text-2xl text-[#102544]">{action.title}</h2>
                <p className="mt-2 max-w-[250px] text-sm leading-6 text-slate-500">{action.description}</p>
                <span className="absolute bottom-5 right-5 grid size-11 place-items-center rounded-full bg-white text-current shadow-md transition group-hover:translate-x-1"><ArrowIcon className="size-5" /></span>
                <span className="absolute -bottom-14 -right-8 size-40 rounded-full border-[24px] border-current opacity-[.035]" />
              </Link>
            );
          })}
        </section>

        <section className="mt-5 grid gap-4 rounded-[28px] border border-blue-100/80 bg-white/80 p-5 shadow-[0_16px_50px_rgba(42,82,135,.05)] backdrop-blur-xl md:grid-cols-[1fr_auto_auto] md:items-center md:gap-8 md:px-8">
          <div><p className="font-serif text-lg">“ดนตรีไทยไม่ใช่เพียงอดีต แต่คือเสียงที่เราส่งต่อ”</p><p className="mt-1 text-xs text-blue-500">Virtual Pin Learning Lab</p></div>
          <div className="border-blue-100 md:border-l md:pl-8"><p className="text-xs text-slate-400">ความคืบหน้าสัปดาห์นี้</p><p className="mt-1 text-xl font-semibold">72%</p></div>
          <div className="flex gap-2">{[72, 55, 88, 64, 91, 78, 24].map((value, i) => <span key={i} className="flex h-11 w-2 items-end overflow-hidden rounded-full bg-slate-100"><span className="w-full rounded-full bg-blue-500" style={{ height: `${value}%` }} /></span>)}</div>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
