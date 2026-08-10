# Virtual Pin

แพลตฟอร์มเรียนรู้การเล่นพิณไทยด้วย AI, Computer Vision และ AR โดยทำงานผ่านเว็บเบราว์เซอร์ ไม่ต้องใช้เซนเซอร์ ถุงมือ หรืออุปกรณ์เสริม

## แผนพัฒนา 4 Milestones

1. **Camera & Hand Tracking** — เปิดกล้อง ตรวจจับมือซ้าย/ขวา 21 จุด และลดอาการ landmark สั่น
2. **Virtual Pin & Audio** — พิณเสมือน 3D, fret/string mapping และเสียงตอบสนองทันที
3. **AI Coach** — ประเมินนิ้ว การดีด จังหวะ และแนะนำการแก้ไขแบบ real-time
4. **Learning Platform** — บทเรียน เพลง คะแนน ประวัติ และ Dashboard สำหรับผู้เรียน/ครู

ขณะนี้พัฒนาและส่งมอบเฉพาะ **Milestone 1** ตามลำดับการอนุมัติของโครงการ

## ความสามารถใน Milestone 1

- เปิด/หยุดกล้องจาก browser และสลับกล้องหน้า/หลัง
- รองรับกล้องบน iOS, iPadOS, Android, Windows และ macOS
- ตรวจจับได้สูงสุด 2 มือด้วย MediaPipe Hand Landmarker
- แยกมือซ้าย/ขวา พร้อม confidence
- แสดง landmark 21 จุดและโครงกระดูกมือบนภาพกล้องแบบ mirrored
- ลด jitter ด้วย Exponential Moving Average
- GPU acceleration และ fallback ไป CPU อัตโนมัติ
- ประมวลผลภาพภายใน browser โดยไม่ส่งวิดีโอขึ้น server
- Responsive dark glassmorphism UI ที่ออกแบบสำหรับ tablet

## โครงสร้าง

```text
src/
├── app/                    # Next.js App Router และ global styles
├── components/
│   └── training/           # หน้าจอฝึกและส่วนแสดงสถานะ
├── hooks/                  # Camera และ MediaPipe lifecycle
└── lib/
    └── hand-tracking/      # Types, landmark smoother, canvas renderer
```

## เริ่มใช้งาน

ดูขั้นตอนละเอียดใน [INSTALLATION.md](./INSTALLATION.md)

```bash
npm install
npm run dev
```

เปิด `http://localhost:3000` แล้วกด **เปิดกล้องเพื่อเริ่ม**

## คำสั่งตรวจสอบ

```bash
npm run lint
npm run typecheck
npm run build
```

## หมายเหตุเรื่องกล้อง

`getUserMedia()` ใช้ได้บน `localhost` หรือ HTTPS เท่านั้น หากทดสอบจากอุปกรณ์อื่นผ่าน IP ภายในเครือข่ายควรใช้ HTTPS tunnel หรือ deploy preview
