import Link from "next/link";
import { AppBrand } from "@/components/navigation/AppBrand";
import { BottomNav } from "@/components/navigation/BottomNav";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#f8faff] text-[#102544]">
      <div className="mx-auto max-w-3xl px-5 pt-6"><AppBrand /><section className="mt-12 rounded-[30px] border border-slate-100 bg-white p-7 shadow-sm"><p className="text-xs font-bold tracking-[.2em] text-blue-500">SETTINGS</p><h1 className="mt-3 font-serif text-4xl">ตั้งค่าการฝึก</h1><div className="mt-8 space-y-4"><div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div><p className="font-medium">กล้องเริ่มต้น</p><p className="text-xs text-slate-400">ใช้กล้องหน้าเพื่อให้ภาพเหมือนกระจก</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-600">กล้องหน้า</span></div><div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div><p className="font-medium">ความไวของ Hand Tracking</p><p className="text-xs text-slate-400">ค่ากลางเหมาะกับการใช้งานทั่วไป</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">ปานกลาง</span></div></div><Link href="/" className="mt-8 inline-block text-sm font-medium text-blue-600">← กลับหน้าหลัก</Link></section></div><BottomNav />
    </div>
  );
}
