"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookIcon, HomeIcon, MusicIcon, SettingsIcon } from "@/components/icons";
import { navigationItems } from "./AppHeader";

const icons = [HomeIcon, MusicIcon, BookIcon, SettingsIcon];
export function BottomNav({ learningMode = false }: { learningMode?: boolean }) {
  const pathname = usePathname();
  return <nav aria-label="เมนูหลักบนมือถือ" className="mobile-navigation">
    {navigationItems.map((item, index) => {
      const active = item.id === "learn" ? pathname === "/songs" && learningMode : item.id === "songs" ? pathname === "/songs" && !learningMode : pathname === item.href;
      const Icon = icons[index];
      return <Link key={item.id} href={item.href} aria-current={active ? "page" : undefined}><Icon aria-hidden="true" className="size-5" /><span>{item.label}</span></Link>;
    })}
  </nav>;
}
