import Link from "next/link";

export function AppBrand({ dark = false }: { dark?: boolean }) {
  return <Link href="/" className={`app-brand ${dark ? "app-brand-dark" : ""}`} aria-label="Phin Next หน้าหลัก">phin next<span aria-hidden="true">.</span></Link>;
}
