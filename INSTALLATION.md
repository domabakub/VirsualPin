# การติดตั้ง Virtual Pin

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
