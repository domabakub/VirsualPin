import Link from "next/link";

export function AppBrand({ dark = false }: { dark?: boolean }) {
  return <Link href="/" className={`app-brand ${dark ? "app-brand-dark" : ""}`} aria-label="Virtual Pin หน้าหลัก">virtual pin<span aria-hidden="true">.</span></Link>;
}
