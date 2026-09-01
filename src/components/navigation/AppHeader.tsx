import Link from "next/link";
import { AppBrand } from "./AppBrand";

export type NavigationPage = "home" | "songs" | "learn" | "settings";
export const navigationItems = [
  { id: "home", href: "/", label: "ภาพรวม" },
  { id: "songs", href: "/songs", label: "คลังเพลง" },
  { id: "learn", href: "/songs?category=learn", label: "เริ่มต้นเรียน" },
  { id: "settings", href: "/settings", label: "ตั้งค่า" },
] as const;

export function AppHeader({ active, studio = false }: { active?: NavigationPage; studio?: boolean }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <AppBrand />
        {!studio && <nav aria-label="เมนูหลักบนเดสก์ท็อป" className="desktop-navigation">
          {navigationItems.map(item => <Link key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined}>{item.label}</Link>)}
        </nav>}
        <Link href={studio ? "/songs" : "/play/free-play"} className="header-action">{studio ? "กลับไปคลังเพลง" : "ลองเล่นพิณ"}<span aria-hidden="true">↗</span></Link>
      </div>
    </header>
  );
}
