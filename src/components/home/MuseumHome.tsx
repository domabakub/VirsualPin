"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RanatPlayStage } from "@/components/ranat/RanatPlayStage";
import { instruments } from "@/instruments/registry";
import "./museum.css";

const exhibits = [
  { ...instruments[1], title: "RANAT EK", category: "PERCUSSION", region: "CENTRAL THAILAND", image: "/images/ranat-color-cutout.png", copy: "เสียงไม้ที่เรียงร้อยเป็นทำนอง สัมผัสระนาดเอกในมุมมองใหม่ ผ่านโมเดลร่วมสมัยที่คุณทดลองเล่นได้" },
  { ...instruments[0], title: "PHIN", category: "STRING", region: "NORTHEAST THAILAND", image: "/images/phin-cutout.png", copy: "สามสายที่บอกเล่าเรื่องราวของอีสาน ค่อย ๆ รู้จักเสียงพิณ แล้วสร้างทำนองแรกในจังหวะของคุณ" },
];
const number = (index: number) => String(index + 1).padStart(2, "0");

function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link className="museum-link" href={href}><span aria-hidden="true">↗</span>{children}</Link>;
}

function ExhibitionSlider() {
  const [active, setActive] = useState(0);
  const [modelOpen, setModelOpen] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = track.current;
    if (!root) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
    }, { root, threshold: .65 });
    root.querySelectorAll("article").forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const root = track.current;
    if (!root) return;
    let lastMove = 0;
    let distance = 0;
    function onWheel(event: WheelEvent) {
      if (!root || event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY) || window.innerWidth < 701) return;
      const bounds = root.getBoundingClientRect();
      // Only advance when the exhibit is in view; the page stays freely scrollable at both ends.
      if (bounds.top < -80 || bounds.top > window.innerHeight * .3) return;
      const direction = Math.sign(event.deltaY);
      const index = Math.round(root.scrollLeft / root.clientWidth);
      if ((direction < 0 && index === 0) || (direction > 0 && index === exhibits.length - 1)) return;
      event.preventDefault();
      if (performance.now() - lastMove < 850) return;
      distance += event.deltaY * (event.deltaMode === 1 ? 16 : 1);
      if (Math.abs(distance) < 45) return;
      root.scrollTo({ left: (index + direction) * root.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      distance = 0;
      lastMove = performance.now();
    }
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, []);
  function go(index: number) {
    const root = track.current;
    if (!root) return;
    const next = Math.max(0, Math.min(exhibits.length - 1, index));
    root.scrollTo({ left: root.clientWidth * next, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return <section id="exhibition" className="museum-exhibition" aria-label="นิทรรศการเครื่องดนตรี">
    <div className="museum-exhibition-heading"><span>THE PERMANENT EXHIBITION</span><span>สองเครื่องดนตรี · สองเรื่องราว</span></div>
    <div className="museum-exhibit-track" ref={track} tabIndex={0} aria-label="เลื่อนซ้ายขวาหรือใช้ปุ่มลูกศรเพื่อชมเครื่องดนตรี" onKeyDown={event => {
      if (event.target !== event.currentTarget) return;
      if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
        event.preventDefault(); go(event.key === "Home" ? 0 : event.key === "End" ? exhibits.length - 1 : active + (event.key === "ArrowRight" ? 1 : -1));
      }
    }}>
      {exhibits.map((item, index) => <article className={`museum-exhibit museum-exhibit-${item.id}`} key={item.id} data-index={index} aria-label={`${number(index)} ${item.thai}`}>
        <div className="museum-exhibit-copy"><span className="museum-exhibit-number">{number(index)}</span><p className="museum-kicker">{item.category} · {item.region}</p><h2>{item.title}</h2><p className="museum-thai-title">{item.thai}</p><p className="museum-description">{item.copy}</p><ArrowLink href={item.href}>EXPLORE INSTRUMENT</ArrowLink><Link className="museum-play-link" href={item.playHref}>ทดลองเล่น {item.thai} ↗</Link></div>
        <div className="museum-exhibit-space">
          <span className="museum-wall-label" aria-hidden="true">{item.thai}<small>{item.title} / {number(index)}</small></span>
          <div className="museum-exhibit-object">
            {item.id === "ranat" ? <RanatPlayStage showcase /> : modelOpen && active === index ? <iframe title="โมเดลพิณ โดย suphanburiworldmusic" src="https://sketchfab.com/models/80e48aa96fe4452f952537cd0b638d98/embed?autostart=1&autospin=0&scrollwheel=0&dnt=1" allow="autoplay; fullscreen; xr-spatial-tracking" allowFullScreen /> : <Image src={item.image} alt="พิณไม้สามสาย หัวแกะสลัก" fill sizes="(max-width: 700px) 90vw, 55vw" />}
          </div>
          <div className="museum-plinth" aria-hidden="true" />
          <div className="museum-object-caption">{item.id === "ranat" ? <><span>RANAT NEXT · LIVE 3D</span><span>โมเดลร่วมสมัยของโปรเจกต์</span></> : <><button onClick={() => setModelOpen(!modelOpen)}>{modelOpen ? "กลับไปดูภาพ ↗" : "สำรวจโมเดล 3D ↗"}</button><a href="https://sketchfab.com/3d-models/80e48aa96fe4452f952537cd0b638d98" target="_blank" rel="noreferrer">Model: suphanburiworldmusic</a></>}</div>
        </div>
      </article>)}
    </div>
    <div className="museum-slide-controls"><div className="museum-slide-index">{exhibits.map((item, index) => <button key={item.id} onClick={() => go(index)} aria-label={`ชม ${item.thai}`} aria-current={active === index ? "true" : undefined}>{number(index)}</button>)}</div><p aria-live="polite">{exhibits[active].thai} <span> / {number(active)} — 02</span></p><div><button aria-label="เครื่องดนตรีก่อนหน้า" disabled={active === 0} onClick={() => go(active - 1)}>←</button><button aria-label="เครื่องดนตรีถัดไป" disabled={active === exhibits.length - 1} onClick={() => go(active + 1)}>→</button></div></div>
  </section>;
}

export function MuseumHome() {
  const [category, setCategory] = useState("ALL");
  const filtered = exhibits.filter(item => category === "ALL" || item.category === category);
  return <div className="museum-home">
    <header className="museum-nav"><Link href="/" className="museum-brand" aria-label="Virtual Instrument Museum หน้าหลัก">VIM<span>VIRTUAL INSTRUMENT MUSEUM</span></Link><nav aria-label="เมนูหลัก"><a href="#exhibition">EXHIBITION</a><a href="#collection">COLLECTION</a><a href="#stories">STORIES</a></nav><Link className="museum-nav-play" href="/instruments">ลองเล่นเครื่องดนตรี ↗</Link></header>
    <main id="main-content" tabIndex={-1}>
      <section className="museum-hero" aria-labelledby="museum-title">
        <div className="museum-architecture" aria-hidden="true"><div className="museum-arch"/><div className="museum-column"/><div className="museum-floor"/></div>
        <div className="museum-hero-copy"><p className="museum-kicker">A LIVING COLLECTION OF THAI SOUND</p><h1 id="museum-title">VIRTUAL<br/>INSTRUMENT<br/><em>MUSEUM</em></h1><p className="museum-manifesto">Discover <i>·</i> Listen <i>·</i> Play <i>·</i> Learn</p><p className="museum-intro">พื้นที่เล็ก ๆ ที่เก็บเรื่องราวอันยิ่งใหญ่<br/>ค้นพบเครื่องดนตรีไทย ฟังเสียงของวัฒนธรรม<br/>และเป็นส่วนหนึ่งของทำนอง</p><ArrowLink href="#exhibition">ENTER EXHIBITION</ArrowLink></div>
        <div className="museum-hero-art"><div className="museum-distant-phin"><Image src="/images/phin-cutout.png" alt="" fill sizes="180px" /></div><div className="museum-hero-model" role="img" aria-label="โมเดลระนาดเอกสามมิติบนแท่นจัดแสดง"><RanatPlayStage showcase /></div><div className="museum-hero-pedestal"/><div className="museum-hero-label"><span>01 / ระนาดเอก</span><small>WOOD, RHYTHM & RESONANCE</small></div></div>
        <div className="museum-hero-bottom"><span>THAI HERITAGE, REIMAGINED.</span><a href="#exhibition">SCROLL TO DISCOVER <span>↓</span></a><span>EST. 2026 / DIGITAL COLLECTION</span></div>
      </section>
      <div className="museum-prologue"><p>เสียงที่สืบทอดมา<br/><em>รอให้คุณค้นพบอีกครั้ง</em></p><span>A museum you can hear.<br/>A collection you can play.</span><a href="#collection">DISCOVER THE COLLECTION ↓</a></div>
      <ExhibitionSlider />
      <section id="collection" className="museum-collection"><div className="museum-section-heading"><div><p className="museum-kicker">THE COLLECTION / 02 INSTRUMENTS</p><h2>Find your<br/><em>resonance.</em></h2></div><div className="museum-filters" role="group" aria-label="ประเภทเครื่องดนตรี">{["ALL", "PERCUSSION", "STRING"].map(value => <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{value === "ALL" ? "ALL INSTRUMENTS" : value}</button>)}</div></div><div className="museum-catalog">{filtered.map(item => <Link href={item.href} className={`museum-catalog-item museum-catalog-${item.id}`} key={item.id}><div className="museum-catalog-image"><Image src={item.image} alt={item.thai} fill sizes="(max-width: 700px) 90vw, 45vw" /></div><div className="museum-catalog-caption"><span>{number(exhibits.indexOf(item))}</span><h3>{item.title}<small>{item.thai}</small></h3><span>{item.category}<br/>{item.region}</span><b aria-hidden="true">↗</b></div></Link>)}</div><p className="museum-image-credit">ภาพประกอบระนาด: ตัดพื้นหลังและลงสีด้วย AI จากภาพ The Met (89.4.303) สีเป็นการตีความ · ภาพพิณ: Respubliko de Gvapolando / CC0</p></section>
      <section id="stories" className="museum-stories"><div className="museum-story-photo"><Image src="/images/phin-met.jpg" alt="พิณไทยปลายศตวรรษที่ 19 ในคอลเลกชัน The Met" fill sizes="(max-width: 700px) 80vw, 35vw"/><span>THE MET COLLECTION / 89.4.288</span></div><div className="museum-story-copy"><p className="museum-kicker">STORIES BEYOND SOUND</p><h2>More than<br/>an instrument.<br/><em>A living story.</em></h2><p>เบื้องหลังทุกเสียง มีทั้งงานช่าง ความทรงจำ<br/>และผู้คนที่ส่งต่อทำนองจากรุ่นสู่รุ่น<br/>เริ่มรู้จักเครื่องดนตรี จากเรื่องราวที่อยู่ข้างใน</p><ArrowLink href="/instruments/ranat#story">READ THE STORY</ArrowLink><a className="museum-source" href="https://www.metmuseum.org/art/collection/search/500840" target="_blank" rel="noreferrer">ภาพพิณไทยปลายศตวรรษที่ 19 · The Met · Public Domain ↗</a></div></section>
      <section className="museum-closing"><p className="museum-kicker">THE NEXT NOTE IS YOURS</p><h2>อย่าเพียงแค่ชม <em>ลองบรรเลง.</em></h2><ArrowLink href="/instruments">PLAY THE COLLECTION</ArrowLink></section>
    </main>
    <footer className="museum-footer"><Link href="/" className="museum-brand">VIM<span>VIRTUAL INSTRUMENT MUSEUM</span></Link><p>เก็บรักษาเรื่องราว · ส่งต่อเสียงดนตรี</p><a href="#museum-title">BACK TO TOP ↑</a></footer>
  </div>;
}
