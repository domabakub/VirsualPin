import Link from "next/link";
import type { InstrumentId } from "@/instruments/registry";
import styles from "./InstrumentNav.module.css";

export function InstrumentNav({ current, active }: { current?: InstrumentId; active?: "home" | "instruments" }) {
  return <nav className={styles.nav} aria-label="หน้าแรกและเครื่องดนตรี">
    <div className={styles.links}>
      <Link href="/" aria-current={active === "home" ? "page" : undefined}>หน้าแรก</Link>
      <Link href="/instruments" aria-current={active === "instruments" ? "page" : undefined}>เครื่องดนตรี</Link>
    </div>
    {current && <Link className={styles.switch} href={current === "phin" ? "/instruments/ranat/play" : "/play/free-play"}>
      สลับไปเล่น{current === "phin" ? "ระนาด" : "พิณ"} <span aria-hidden="true">↗</span>
    </Link>}
  </nav>;
}
