export const instruments = [
  { id: "phin", name: "Phin Next", subtitle: "VIRTUAL PHIN", thai: "พิณ", href: "/instruments/phin", playHref: "/play/free-play", description: "ดีดเสียงคุ้นเคย ให้เป็นจังหวะของคุณ", status: "พร้อมเล่น" },
  { id: "ranat", name: "Ranat Next", subtitle: "VIRTUAL THAI XYLOPHONE", thai: "ระนาดเอก", href: "/instruments/ranat", playHref: "/instruments/ranat/play", description: "สองไม้ หนึ่งทำนอง ความเป็นไปได้ไม่สิ้นสุด", status: "เสียงจำลอง · รุ่นทดลอง" },
] as const;
export type InstrumentId = typeof instruments[number]["id"];
