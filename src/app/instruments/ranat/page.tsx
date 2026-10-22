import type { Metadata } from "next";
import Link from "next/link";
import { InstrumentNav } from "@/components/navigation/InstrumentNav";
import { RanatPlayStage } from "@/components/ranat/RanatPlayStage";
import "./ranat.css";
import "./landing.css";
export const metadata: Metadata = { title: "Ranat Next | รู้จักระนาดเอก", description: "รู้จักที่มา ส่วนประกอบ และเสน่ห์ของระนาดเอก ก่อนลองเล่นระนาดจำลองในจังหวะของคุณ" };

const parts = [
  ["01", "ผืนระนาด", "ลูกระนาดไม้ที่เรียงจากเสียงต่ำไปสูง ร้อยเชือกแขวนเป็นผืน โดยทั่วไปมี 21 ลูก แต่บางรางมี 22 ลูก"],
  ["02", "รางและโขน", "รางไม้ทรงคล้ายเรือช่วยอุ้มเสียง ส่วนแผ่นไม้ที่ปิดหัวและท้ายรางเรียกว่าโขน เป็นทั้งโครงสร้างและพื้นที่ของงานช่าง"],
  ["03", "ไม้ตีสองข้าง", "ไม้แข็งให้เสียงคมและชัด ส่วนไม้นวมให้เสียงนุ่มกว่า ไม้ตีจึงเปลี่ยนบุคลิกของเสียงได้ แม้ใช้ระนาดรางเดียวกัน"],
];

export default function RanatPage() {
  return <div className="rn-page app-shell rn-landing">
    <header className="rn-header"><Link href="/instruments" className="app-brand">ranat next<span>.</span></Link><nav aria-label="เครื่องดนตรี"><Link href="/instruments/phin">Phin Next</Link><Link href="/instruments/ranat" aria-current="page">Ranat Next</Link></nav><Link href="/instruments/ranat/play" className="rn-back">ลองเล่นระนาด ↗</Link></header>
    <InstrumentNav />
    <main id="main-content" className="rn-main" tabIndex={-1}>
      <section className="rl-hero">
        <div><p className="eyebrow">ROOTED IN CULTURE · RANAT EK</p><h1>สองไม้.<br/><span>เรื่องราวไม่รู้จบ.</span></h1><p className="rl-lead">รู้จักระนาดเอก ผ่านเสียง งานช่าง และทำนอง<br/>จากวงปี่พาทย์ สู่เสียงแรกที่คุณลองเล่นเอง</p><div className="rl-actions"><Link href="/instruments/ranat/play" className="ui-button ui-primary">ลองเล่นระนาด <span aria-hidden="true">↗</span></Link><a href="#story" className="text-link">อ่านเรื่องราว <span aria-hidden="true">↓</span></a></div><p className="rl-note">เล่นได้บนเบราว์เซอร์ · ไม่ต้องสมัครสมาชิก</p></div>
        <figure className="rl-art"><RanatPlayStage showcase/><figcaption>ระนาดเอก · เครื่องตีที่นำทำนองในวงปี่พาทย์<span>ระนาดดีไซน์ร่วมสมัยของโปรเจกต์</span></figcaption></figure>
      </section>
      <div className="rl-facts" aria-label="รู้จักระนาดอย่างรวดเร็ว"><div><strong>21</strong><span>ลูกระนาดที่พบโดยทั่วไป</span></div><div><strong>2</strong><span>ไม้ตี สร้างสีสันของทำนอง</span></div><div><strong>ปี่พาทย์</strong><span>วงดนตรีที่มีระนาดเอกนำทำนอง</span></div></div>
      <section id="story" className="rl-section rl-story"><div><p className="eyebrow">FROM WOOD TO MELODY</p><h2>จากไม้ที่ให้จังหวะ.<br/><span>สู่ทำนองที่มีชีวิต.</span></h2></div><div className="rl-prose"><p>ระนาดเอกเป็นเครื่องดนตรีไทยประเภทเครื่องตี เสียงเกิดจากไม้สองข้างกระทบลูกระนาดที่แขวนอยู่เหนือราง เสน่ห์ของมันอยู่ทั้งในเสียงกังวาน และการเดินทำนองที่คล่องตัว</p><p>คำอธิบายที่มาซึ่งพบในฐานข้อมูล SACIT สันนิษฐานว่าระนาดพัฒนามาจากกรับ จากไม้ที่ใช้ตีจังหวะ ไปสู่ไม้หลายขนาดที่เรียงเป็นชุด ก่อนเพิ่มเชือกแขวนและรางรองรับเสียง เรื่องนี้ช่วยให้เห็นว่าการสร้างเครื่องดนตรีสัมพันธ์กับการทดลองของช่างอย่างไร</p><p>ในวงปี่พาทย์ ระนาดเอกทำหน้าที่นำทำนอง ผู้บรรเลงเติมรายละเอียดของเสียงให้ทำนองเคลื่อนไหว จึงต้องอาศัยทั้งความแม่นยำ การฟัง และการเล่นร่วมกับเครื่องอื่น</p><a className="text-link" href="https://archive.sacit.or.th/handicraft/2459" target="_blank" rel="noreferrer">อ่านที่มาจาก SACIT <span aria-hidden="true">↗</span></a></div></section>
      <section className="rl-section"><p className="eyebrow">CRAFTED FOR SOUND</p><h2>หนึ่งราง.<span> หลายรายละเอียด.</span></h2><p className="rl-section-intro">รู้จักส่วนเล็ก ๆ ที่ร่วมกันสร้างเสียงระนาด</p><div className="rl-cards">{parts.map(([number, title, copy]) => <article key={number}><span className="rl-number">{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
      <section className="rl-section rl-curious"><div><p className="eyebrow">DID YOU KNOW?</p><h2>เสียงที่ได้ยิน.<br/><span>มีอะไรซ่อนอยู่?</span></h2><p className="rl-section-intro">เกร็ดเล็ก ๆ ที่ทำให้ฟังระนาดสนุกขึ้น</p></div><div className="rl-prose"><article><h3>ไม้ต่างกัน เสียงก็ต่างกัน</h3><p>ลูกระนาดทำได้ทั้งจากไม้ไผ่และไม้เนื้อแข็ง วัสดุของผืนระนาดและหัวไม้ตีมีส่วนต่อสีสันเสียง จึงไม่ได้มีเพียงระนาดเสียงแบบเดียว</p></article><article><h3>การตั้งเสียงอยู่ใต้ลูกระนาด</h3><p>ช่างปรับระดับเสียงด้วยการแต่งเนื้อไม้และถ่วงใต้ลูกระนาดด้วยส่วนผสมขี้ผึ้งกับตะกั่ว งานที่มองไม่เห็นจากด้านบนนี้ต้องอาศัยความละเอียดและการฟัง</p></article><article><h3>คู่แปดทำให้ทำนองมีมิติ</h3><p>การตีคู่แปดใช้ไม้สองข้างตีเสียงเดียวกันในคนละช่วงเสียง เป็นลักษณะการบรรเลงที่พบได้ในการเล่นระนาดเอก ลองฟังว่าทำนองเดียวมีน้ำหนักเพิ่มขึ้นอย่างไร</p></article></div></section>
      <section className="rl-section rl-before"><p className="eyebrow">BEFORE YOUR FIRST NOTE</p><h2>ก่อนเล่น.<span> รู้ไว้สักนิด.</span></h2><div className="rl-cards"><article><span className="rl-number">01 / ฟัง</span><h3>เริ่มจากเสียงเดียว</h3><p>ลองแตะทีละลูก ฟังเสียงต่ำและสูง แล้วค่อยเรียงเป็นทำนองสั้น ๆ ไม่ต้องเริ่มด้วยความเร็ว</p></article><article><span className="rl-number">02 / ลอง</span><h3>ค่อย ๆ จับจังหวะ</h3><p>ในพื้นที่เล่น คุณเลือกตีเดี่ยว ตีคู่ หรือกรอได้ เริ่มช้า ๆ และใช้เครื่องช่วยจังหวะเพื่อให้เสียงสม่ำเสมอ</p></article><article><span className="rl-number">03 / เข้าใจ</span><h3>จอคือพื้นที่ทดลอง</h3><p>Ranat Next ใช้เสียงสังเคราะห์และระบบช่วยเล่น การสัมผัส น้ำหนักไม้ และการตั้งเสียงของระนาดจริงแตกต่างกัน หากอยากฝึกบรรเลงจริง ควรเรียนกับครูดนตรีไทย</p></article></div></section>
      <section className="rl-cta"><p className="eyebrow">YOUR FIRST MELODY STARTS HERE</p><h2>อ่านเรื่องราวแล้ว.<br/><span>ลองสร้างเสียงของคุณ.</span></h2><Link href="/instruments/ranat/play" className="ui-button ui-primary">เริ่มเล่นระนาด ↗</Link><p>สัมผัส / คีย์บอร์ด · โหมดกล้องทดลอง · บันทึกทำนอง</p></section>
      <aside className="rl-sources" aria-label="แหล่งข้อมูล"><span>อ่านเพิ่มเติมและแหล่งข้อมูล</span><a href="https://archive.sacit.or.th/handicraft/2459" target="_blank" rel="noreferrer">SACIT · ระนาดเอก ↗</a><a href="https://saranukromthai.or.th/oldchild/94" target="_blank" rel="noreferrer">สารานุกรมไทยสำหรับเยาวชน · เครื่องตี ↗</a></aside>
      <footer className="rn-footer"><span>ranat next.</span><p>เรื่องราวดั้งเดิม ในจังหวะของคุณ</p><Link href="/instruments">เครื่องดนตรีทั้งหมด ↗</Link></footer>
    </main>
  </div>;
}
