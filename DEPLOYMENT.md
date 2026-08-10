# การ Deploy

## Vercel

1. Push โปรเจกต์ขึ้น Git repository
2. Import repository ใน Vercel
3. เลือก Framework Preset เป็น **Next.js**
4. Build command ใช้ `npm run build`
5. Deploy และทดสอบ Camera permission ผ่าน URL แบบ HTTPS

โปรเจกต์ Milestone 1 ยังไม่ต้องใช้ environment variables หรือ backend

## Production checklist

- รัน `npm run lint`, `npm run typecheck` และ `npm run build`
- ทดสอบกล้องหน้า/หลังบน iPad/iPhone จริง
- ทดสอบ Chrome Android และ desktop webcam
- ตรวจว่า Content Security Policy (ถ้ามี) อนุญาต model/WASM จาก `cdn.jsdelivr.net` และ `storage.googleapis.com`
- ตรวจ Camera permission และ orientation ทั้งแนวตั้ง/แนวนอน
