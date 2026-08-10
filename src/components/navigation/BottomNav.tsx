"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookIcon, HomeIcon, MusicIcon, SettingsIcon } from "@/components/icons";

const items = [
  { href: "/", label: "หน้าหลัก", icon: HomeIcon },
  { href: "/songs", label: "คลังเพลง", icon: MusicIcon },
  { href: "/songs?category=learn", label: "บทเรียน", icon: BookIcon },
  { href: "/settings", label: "ตั้งค่า", icon: SettingsIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="เมนูหลัก" className="sticky bottom-0 z-30 mt-6 border-t border-slate-200/70 bg-white/88 pb-[max(.55rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_40px_rgba(40,76,130,.06)] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-4xl items-center justify-around">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("?")[0]);
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className={`relative flex min-w-20 flex-col items-center gap-1 rounded-2xl px-4 py-2 text-[11px] font-medium transition ${active ? "text-blue-600" : "text-slate-400 hover:text-slate-700"}`}>
              <Icon className="size-5" />
              <span>{item.label}</span>
              {active && <span className="absolute -bottom-2 h-0.5 w-10 rounded-full bg-blue-600" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
