# การติดตั้ง Virtual Phin

## สิ่งที่ต้องมี

- Node.js 20.9 ขึ้นไป (แนะนำ Node.js 22 LTS)
- npm 10 ขึ้นไป
- Chrome, Edge หรือ Safari รุ่นปัจจุบัน
- กล้องหน้า/หลังหรือ Webcam
- อินเทอร์เน็ตสำหรับดาวน์โหลด MediaPipe WASM และ Hand Landmarker model

## ขั้นตอน

1. เปิด Terminal ที่โฟลเดอร์โปรเจกต์
2. ติดตั้ง dependency ด้วย `npm install`
3. เริ่ม development server ด้วย `npm run dev`
4. เปิด `http://localhost:3000`
5. กด “เปิดกล้องเพื่อเริ่ม” และอนุญาตสิทธิ์ Camera

บน Windows PowerShell ที่ปิดการรันสคริปต์ ให้ใช้ `npm.cmd install` และ `npm.cmd run dev` แทน

## แก้ปัญหาเบื้องต้น

- **กล้องไม่เปิด:** ตรวจ Camera permission ของ browser/ระบบปฏิบัติการ และปิดแอปอื่นที่กำลังใช้กล้อง
- **ระบบ AI โหลดไม่สำเร็จ:** ตรวจอินเทอร์เน็ตและ firewall สำหรับ `cdn.jsdelivr.net` และ `storage.googleapis.com`
- **FPS ต่ำ:** ใช้แสงให้เพียงพอ ปิดแท็บที่ไม่จำเป็น และอัปเดต browser
- **มือถือผ่าน LAN IP เปิดกล้องไม่ได้:** browser ต้องใช้ secure context; ใช้ HTTPS หรือ deploy preview

## เปิดใช้ Google Drive Backup (optional)

Quick Take ใช้งานและเก็บในเครื่องได้โดยไม่ต้องตั้งค่า Google หากต้องการปุ่มสำรอง/กู้คืนบนหน้า `/takes`:

1. สร้าง OAuth 2.0 Client ID ประเภท Web application ใน Google Cloud Console
2. เปิด Google Drive API
3. เพิ่ม JavaScript origin เช่น `http://localhost:3000` และ origin ของ production
4. คัดลอก `.env.example` เป็น `.env.local`
5. ใส่ค่า `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
6. restart development server

ระบบจะขอ scope `drive.appdata` เฉพาะเมื่อผู้ใช้กดเชื่อม Google Drive ข้อมูลกล้องไม่ถูกสำรอง มีเฉพาะ Quick Take note events เท่านั้น
