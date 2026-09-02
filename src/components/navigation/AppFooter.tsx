import Link from "next/link";

export function AppFooter({ photos = false }: { photos?: boolean }) {
  return <footer className="site-footer page-width">
    <div className="footer-line"><span>Virtual Phin</span><p>เสียงของวัฒนธรรม ในจังหวะของคุณ</p><Link href="/settings">ตั้งค่าการใช้งาน ↗</Link></div>
    {photos && <p className="photo-credits">ภาพถ่ายพิณจริง: <a href="https://commons.wikimedia.org/wiki/File:Pina%C5%ADo.jpg" target="_blank" rel="noreferrer">Respubliko de Gvapolando / Wikimedia Commons · CC0</a> และ <a href="https://www.metmuseum.org/art/collection/search/500840" target="_blank" rel="noreferrer">The Metropolitan Museum of Art · Public Domain</a></p>}
  </footer>;
}
