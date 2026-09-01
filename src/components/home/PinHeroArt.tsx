"use client";

import Image from "next/image";
import { useState } from "react";
import { CubeIcon } from "@/components/icons";

export function PinHeroArt() {
  const [viewerOpen, setViewerOpen] = useState(false);
  return <figure className="hero-photograph">
    <div className="hero-model-frame">
      {viewerOpen ? <iframe
        title="โมเดลสามมิติพิณ โดย suphanburiworldmusic บน Sketchfab"
        src="https://sketchfab.com/models/80e48aa96fe4452f952537cd0b638d98/embed?autostart=1&camera=0&autospin=0&scrollwheel=0&dnt=1&ui_theme=dark"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        allowFullScreen
      /> : <>
        <Image src="/images/phin-contemporary.jpg" alt="พิณไม้สามสาย หัวแกะสลัก วางบนเสื่อ เป็นภาพถ่ายเครื่องดนตรีจริง" fill priority sizes="(max-width: 767px) 90vw, 480px" />
      </>}
    </div>
    <figcaption><button type="button" onClick={() => setViewerOpen(current => !current)} className="model-toggle"><CubeIcon aria-hidden="true" />{viewerOpen ? "กลับภาพตัวอย่าง" : "โมเดล 3 มิติ · กดเพื่อสำรวจ"}</button><a href="https://sketchfab.com/3d-models/80e48aa96fe4452f952537cd0b638d98" target="_blank" rel="noreferrer">พิณ โดย suphanburiworldmusic ↗</a></figcaption>
  </figure>;
}
