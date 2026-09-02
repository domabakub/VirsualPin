"use client";

import Link from "next/link";
import { AppFooter } from "@/components/navigation/AppFooter";
import { AppHeader } from "@/components/navigation/AppHeader";
import { BottomNav } from "@/components/navigation/BottomNav";
import { ClockIcon, PlayIcon } from "@/components/icons";
import { useQuickTakes } from "@/hooks/useQuickTakes";
import { formatTakeDuration } from "@/lib/takes/types";
import { GoogleDriveBackup } from "./GoogleDriveBackup";

const dateFormatter = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" });

export function QuickTakesLibrary() {
  const { takes, loading, error, refresh } = useQuickTakes();
  return <div className="app-shell takes-page">
    <AppHeader active="takes" />
    <main id="main-content" tabIndex={-1} className="takes-main page-width">
      <header className="takes-heading">
        <div><p className="eyebrow">MY TAKES</p><h1>บันทึกของฉัน</h1><p>เล่น เก็บไว้ แล้วกลับมาฝึกตามได้ทันที</p></div>
        <Link href="/play/free-play" className="ui-button ui-primary"><span className="quick-take-record-dot" />บันทึกการเล่นใหม่</Link>
      </header>

      <GoogleDriveBackup onRestore={refresh} />

      {error && <p role="alert" className="takes-alert">{error}</p>}
      {loading ? <p className="takes-loading">กำลังอ่านบันทึก…</p> : takes.length ? <section className="take-list" aria-label="รายการบันทึกการเล่น">
        {takes.map(take => <article key={take.id} className="take-row">
          <Link href={`/takes/${take.id}`} className="take-row-main">
            <span className="take-row-icon"><ClockIcon aria-hidden="true" /></span>
            <span className="take-row-copy"><strong>{take.name}</strong><small>{dateFormatter.format(take.updatedAt)} · {take.notes.length} โน้ต · {formatTakeDuration(take.durationMs)}{take.bpm ? ` · ${take.bpm} BPM` : ""}</small></span>
            <span className="take-row-source">{take.notes.some(note => note.source === "camera") ? "กล้อง" : "สัมผัส"}</span>
            <span className="take-row-play"><PlayIcon aria-hidden="true" /></span>
          </Link>
          <Link href={`/takes/${take.id}/practice`} className="take-row-practice">ฝึกตาม</Link>
        </article>)}
      </section> : <section className="take-empty">
        <span className="take-empty-record" aria-hidden="true" />
        <h2>ยังไม่มีบันทึกการเล่น</h2>
        <p>เข้าโหมดเล่นอิสระ กด “บันทึกไว้ฝึก” แล้วเล่นตามปกติ ระบบจะเก็บโน้ตให้อัตโนมัติ</p>
        <Link href="/play/free-play" className="ui-button ui-primary">เริ่มบันทึกครั้งแรก</Link>
      </section>}
    </main>
    <AppFooter /><BottomNav />
  </div>;
}

