export function PinHeroArt() {
  return (
    <div className="relative mx-auto aspect-[1.35] w-full max-w-[620px] overflow-hidden rounded-[52%_48%_42%_58%/54%_42%_58%_46%] bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-[inset_0_0_80px_rgba(96,143,220,.12)]">
      <div className="absolute left-[18%] top-[10%] h-[72%] w-px bg-gradient-to-b from-transparent via-blue-200/60 to-transparent" />
      <div className="absolute left-[31%] top-0 h-full w-px bg-gradient-to-b from-transparent via-blue-100 to-transparent" />
      <svg viewBox="0 0 720 470" className="absolute inset-0 size-full" aria-label="ภาพประกอบพิณไทย">
        <defs>
          <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e4b16d" />
            <stop offset=".45" stopColor="#ae6a32" />
            <stop offset="1" stopColor="#70401f" />
          </linearGradient>
          <linearGradient id="neck" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#c9904d" />
            <stop offset="1" stopColor="#754321" />
          </linearGradient>
          <filter id="shadow"><feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#365478" floodOpacity=".2" /></filter>
        </defs>
        <g transform="rotate(-9 360 250)" filter="url(#shadow)">
          <path d="M534 207c23-24 53-32 86-20 25 9 45 31 51 58 8 38-13 80-49 97-39 18-89 6-112-30-14-22-15-52-2-75 7-12 15-21 26-30Z" fill="url(#wood)" />
          <ellipse cx="585" cy="267" rx="21" ry="28" fill="#3d2419" opacity=".78" />
          <path d="M544 217c30 27 56 74 60 118" fill="none" stroke="#f0c98c" strokeWidth="3" opacity=".65" />
          <path d="M548 321 164 238l8-75 391 74Z" fill="url(#neck)" />
          <path d="M166 162c-13-28-7-62 17-82 12-10 28-16 43-14-18 14-24 29-16 44 7 14 5 31-6 42-9 10-23 14-38 10Z" fill="url(#wood)" />
          <path d="M182 163c2-22 14-43 35-56-7 18-5 31 7 41" fill="none" stroke="#f1c987" strokeWidth="4" strokeLinecap="round" />
          {[0, 1, 2].map((string) => <line key={string} x1="179" y1={181 + string * 16} x2="554" y2={250 + string * 14} stroke={string === 1 ? "#f7d786" : "#f5edcd"} strokeWidth="3" />)}
          {[220, 271, 324, 378, 433, 487].map((x) => <line key={x} x1={x} y1={170 + (x - 220) * .19} x2={x - 13} y2={254 + (x - 220) * .19} stroke="#e7d2b0" strokeWidth="5" opacity=".9" />)}
          <circle cx="187" cy="178" r="7" fill="#6e3d22" /><circle cx="177" cy="207" r="7" fill="#6e3d22" /><circle cx="192" cy="230" r="7" fill="#6e3d22" />
        </g>
        <path d="M530 375c55-9 96-47 122-91" fill="none" stroke="#84b3ff" strokeWidth="2" strokeDasharray="5 10" opacity=".6" />
        <circle cx="656" cy="272" r="5" fill="#4a88f6" />
      </svg>
      <div className="absolute bottom-[8%] left-[13%] rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-lg shadow-blue-900/5 backdrop-blur-xl">
        <p className="text-[10px] font-bold tracking-[.15em] text-blue-500">AI HAND TRACKING</p>
        <p className="mt-1 text-sm font-semibold text-[#12294a]">เรียนรู้จากทุกการเคลื่อนไหว</p>
      </div>
    </div>
  );
}
