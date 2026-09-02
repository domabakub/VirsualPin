import Link from "next/link";

export function AppBrand({ dark = false }: { dark?: boolean }) {
  return <Link href="/" className={`app-brand ${dark ? "app-brand-dark" : ""}`} aria-label="Virtual Phin หน้าหลัก">virtual phin<span aria-hidden="true">.</span></Link>;
}
