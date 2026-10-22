import Image from "next/image";
import Link from "next/link";
import { instruments } from "@/instruments/registry";
import { InstrumentNav } from "@/components/navigation/InstrumentNav";
import styles from "./InstrumentLanding.module.css";

export function InstrumentLanding() {
  return <div className={styles.page}>
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label="Next Instruments หน้าแรก">next instruments<span>.</span></Link>
      <InstrumentNav active="home" />
    </header>
    <main id="main-content" tabIndex={-1}>
      <section className={styles.hero} aria-labelledby="landing-title">
        <p className={styles.eyebrow}>THAI INSTRUMENTS. YOUR OWN RHYTHM.</p>
        <h1 id="landing-title">เสียงคุ้นเคย.<br /><span>วิธีเล่นใหม่.</span></h1>
        <p className={styles.intro}>จากเสียงดีดของพิณ สู่ทำนองของระนาด<br />ค้นพบเครื่องดนตรีไทย แล้วลองสร้างเสียงในแบบคุณ</p>
        <a className="ui-button ui-primary" href="#instruments">เลือกเครื่องดนตรี <span aria-hidden="true">↓</span></a>
        <p className={styles.note}>เล่นบนเบราว์เซอร์ · ไม่ต้องสมัครสมาชิก</p>
      </section>

      <section id="instruments" className={styles.section} aria-labelledby="instruments-title">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>CHOOSE YOUR FIRST SOUND</p><h2 id="instruments-title">วันนี้ อยากเล่นเสียงไหน?</h2></div><span>สองเครื่องดนตรี สองเสน่ห์</span></div>
        <div className={styles.cards}>
          {instruments.map((instrument, index) => <article className={styles.card} key={instrument.id}>
            <div className={styles.cardTop}><span>0{index + 1} / {instrument.id === "phin" ? "เครื่องสาย" : "เครื่องตี"}</span><span>{instrument.status}</span></div>
            <div className={styles.instrumentImage}><Image src={instrument.id === "phin" ? "/images/phin-cutout.png" : "/images/ranat-cutout.png"} alt={instrument.id === "phin" ? "พิณไม้สามสาย" : "ระนาดเอก"} fill sizes="(max-width: 700px) 88vw, 44vw" /></div>
            <p className={styles.eyebrow}>{instrument.name}</p><h3>{instrument.thai}</h3><p>{instrument.description}</p>
            <div className={styles.actions}><Link className="ui-button ui-primary" href={instrument.playHref}>ลองเล่น{instrument.thai} <span aria-hidden="true">↗</span></Link><Link className={styles.textLink} href={instrument.href}>รู้จักเครื่องดนตรี <span aria-hidden="true">→</span></Link></div>
          </article>)}
        </div>
      </section>

      <section className={`${styles.section} ${styles.how}`} aria-labelledby="how-title">
        <p className={styles.eyebrow}>FROM YOUR FIRST NOTE</p><h2 id="how-title">เริ่มง่าย ๆ ในสามขั้นตอน</h2>
        <ol className={styles.steps}>
          <li><span>01</span><h3>เลือก</h3><p>เลือกพิณหรือระนาด ตามเสียงที่อยากลองวันนี้</p></li>
          <li><span>02</span><h3>เล่น</h3><p>แตะหน้าจอเพื่อสร้างเสียง ค่อย ๆ เรียงโน้ตเป็นทำนองของคุณ</p></li>
          <li><span>03</span><h3>บันทึก</h3><p>กดบันทึกในหน้าเล่น แล้วฟังทำนองที่คุณสร้างขึ้นอีกครั้ง</p></li>
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="stories-title">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>ROOTED IN CULTURE</p><h2 id="stories-title">ทุกเสียง มีเรื่องราว.</h2></div><span>รู้จักเครื่องดนตรี ก่อนสร้างทำนองใหม่</span></div>
        <div className={styles.stories}>
          <article><div className={styles.storyImage}><Image src="/images/phin-met.jpg" alt="พิณไทยในคอลเลกชัน The Met" fill sizes="(max-width: 700px) 88vw, 40vw" /></div><div className={styles.storyCopy}><p className={styles.eyebrow}>PHIN / พิณ</p><h3>เสน่ห์จากปลายสาย</h3><p>รู้จักพิณผ่านรูปทรง งานไม้ และเสียงดีด ลองสัมผัสสามสาย แล้วเริ่มเรียนรู้ทีละโน้ต</p><Link className={styles.textLink} href="/instruments/phin">รู้จักพิณ <span aria-hidden="true">↗</span></Link></div></article>
          <article><div className={styles.storyImage}><Image src="/images/ranat-met-original.jpg" alt="ระนาดเอกในคอลเลกชัน The Met" fill sizes="(max-width: 700px) 88vw, 40vw" /></div><div className={styles.storyCopy}><p className={styles.eyebrow}>RANAT EK / ระนาดเอก</p><h3>งานไม้ที่กลายเป็นทำนอง</h3><p>จากผืนระนาด รางไม้ และไม้ตีสองข้าง สู่เรื่องราวของเครื่องดนตรีที่นำทำนองในวงปี่พาทย์</p><Link className={styles.textLink} href="/instruments/ranat#story">อ่านเรื่องราวระนาด <span aria-hidden="true">↗</span></Link></div></article>
        </div>
      </section>
    </main>
    <footer className={styles.footer}><Link className={styles.brand} href="/">next instruments<span>.</span></Link><p>เสียงดั้งเดิม ในจังหวะของคุณ</p><Link href="/instruments">เครื่องดนตรีทั้งหมด ↗</Link><small>ภาพการ์ดตัดพื้นหลังด้วย AI · ภาพเครื่องดนตรี: The Met / Public Domain และ Respubliko de Gvapolando / CC0 · <a href="https://www.metmuseum.org/art/collection/search/500840" target="_blank" rel="noreferrer">พิณ The Met</a> · <a href="https://commons.wikimedia.org/wiki/File:Ranat_Ek_-_MET_89.4.303.jpg" target="_blank" rel="noreferrer">ระนาด The Met</a> · <a href="https://commons.wikimedia.org/wiki/File:Pina%C5%ADo.jpg" target="_blank" rel="noreferrer">ภาพพิณ</a></small></footer>
  </div>;
}
