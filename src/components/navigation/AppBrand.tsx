import Link from "next/link";
import { PinLogo } from "@/components/icons";

export function AppBrand({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="Virtual Pin Home">
      <span className={`grid size-10 place-items-center rounded-2xl border ${dark ? "border-amber-200/20 bg-amber-200/10 text-amber-300" : "border-blue-100 bg-white text-blue-600 shadow-sm"}`}>
        <PinLogo className="h-7 w-5" />
      </span>
      <span className={`font-serif text-[27px] tracking-[-.04em] ${dark ? "text-white" : "text-[#0b2142]"}`}>
        Virtual<span className="text-blue-600">Pin</span>
      </span>
    </Link>
  );
}
