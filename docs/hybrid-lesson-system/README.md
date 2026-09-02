# Hybrid Lesson System

เอกสารนี้เป็น source of truth สำหรับระบบ Quick Take, Lesson Creator, Google account, Google Drive backup และระบบฝึกของครู–นักเรียน

## Product decision

ระบบใช้แนวทาง local-first:

1. ผู้ใช้เล่นและบันทึก Quick Take ได้โดยไม่สมัครสมาชิก
2. IndexedDB เป็นแหล่งข้อมูลหลักระหว่างใช้งานและเมื่อ offline
3. Google account ใช้ระบุตัวตนเมื่อต้องการ sync, publish หรือรับผลนักเรียน
4. App Database เป็น source of truth ของ Lesson, version, share link, assignment และ attempt
5. Google Drive เป็น backup/export แบบ opt-in ไม่ใช่ฐานข้อมูลของ Lesson
6. ภาพกล้องประมวลผลบนอุปกรณ์และไม่ถูกอัปโหลด

```text
Touch / Camera
      |
Capture Engine
      |
Quick Take ---- IndexedDB ---- Sync Queue
      |                            |
      |                       App Database
      |                            |
      +---- Lesson Creator ---- Lesson Version ---- Share / Assignment
      |                                                   |
      +---- Personal Practice ----------------------- Student Attempt
      |
      +---- Optional backup/export ---- Google Drive appData / drive.file
```

## Domain model

### Quick Take

การบันทึกส่วนตัวแบบง่าย เก็บ note event พร้อมเวลาจริง แหล่ง input และ optional confidence ผู้ใช้สามารถฟัง เปลี่ยนชื่อ ฝึกตาม หรือส่งต่อไป Studio/Lesson Creator ได้

ข้อมูลเวลาจริงต้องไม่ถูกแก้ การ quantize ในอนาคตจะเก็บเป็น edited timing แยกจาก raw timing

### Lesson

Draft ที่ครูสร้างจาก Take มี title, objective, phrases, practice preset, hint policy, speed และ scoring policy

### Lesson Version

Snapshot แบบ immutable เมื่อ publish การแก้ไข Lesson ที่เผยแพร่แล้วต้องสร้าง version ใหม่ เพื่อไม่ให้ Attempt เก่าอ้างอิงโน้ตที่เปลี่ยนภายหลัง

### Share Link / Assignment

Share Link เป็น unlisted code ที่เพิกถอนได้ นักเรียนเปิดได้โดยไม่ต้องมีบัญชี Assignment เพิ่มกลุ่ม วันครบกำหนด และ submission policy ภายหลัง

### Attempt

การฝึกหนึ่งรอบ เก็บ lessonVersionId, mode, speed, played events, match results, tracking gaps และ summary score ช่วงที่กล้องตรวจไม่ได้ต้องเป็น unscored ไม่ใช่ wrong

## User flows

### Personal Quick Take

1. เข้า Free Play
2. กด `บันทึกไว้ฝึก`
3. ระบบรอและเริ่มจับเวลาที่โน้ตแรก
4. เล่นผ่าน Touch, keyboard หรือ Camera
5. กด `หยุดและเก็บ`
6. ระบบตั้งชื่อและบันทึกอัตโนมัติ
7. เลือกฟังย้อนหลังหรือฝึกตามแบบ sequence-only

### Teacher Lesson Creator

1. Record Take พร้อม optional BPM/count-in
2. Review ผ่าน Timeline และ Phin Tab
3. แก้โน้ตและแบ่ง phrase
4. เลือก preset: Beginner, Standard หรือ Challenge
5. Preview ในมุมนักเรียน
6. Sign in เมื่อกด Publish
7. สร้าง immutable Lesson Version และ unlisted share code
8. แชร์ link/QR ให้นักเรียน

### Student

1. เปิด share link โดยไม่ต้อง login
2. ฟังตัวอย่างและเลือก Touch/AR
3. ฝึก Learn Notes, Follow Teacher หรือ Test
4. ระบบจับคู่ expected/played events
5. แสดง wrong string, wrong fret, early, late, missed, extra และ unscored
6. ส่งผลกลับครูเมื่อ Assignment กำหนด

## Storage responsibilities

| Store | ใช้เก็บ | ไม่ควรใช้เก็บ |
| --- | --- | --- |
| IndexedDB | Quick Take, Draft, offline Attempt, sync queue | Secret และ refresh token |
| App Database | User, Lesson, Version, Share, Assignment, Attempt | วิดีโอกล้องดิบ |
| Drive appData | Personal backup ที่ซ่อนจาก Drive UI | Lesson sharing เพราะ appData แชร์ไม่ได้ |
| Drive drive.file | Export/import `.vphin`, MIDI, WAV | Query และ analytics ของห้องเรียน |

## Cloud target schema

```text
users
  id, google_subject, display_name, created_at

lessons
  id, owner_id, title, description, status, current_version_id, revision

lesson_versions
  id, lesson_id, version, content_json, published_at

share_links
  id, lesson_version_id, code_hash, status, expires_at

assignments
  id, teacher_id, lesson_version_id, group_id, due_at, policy_json

attempts
  id, lesson_version_id, assignment_id, learner_id, mode, speed,
  started_at, completed_at, summary_json, events_json
```

Note events เหมาะกับ JSON/JSONB เพราะอ่านเป็น snapshot ทั้งชุด ส่วน summary score ควรมีคอลัมน์ที่ query ได้สำหรับรายงาน

## Planned server boundaries

```text
POST   /api/takes/sync
POST   /api/lessons
GET    /api/lessons/:id
PATCH  /api/lessons/:id
POST   /api/lessons/:id/publish
POST   /api/lessons/:id/share
DELETE /api/share/:id
GET    /api/public/lessons/:code
POST   /api/attempts
POST   /api/attempts/:id/complete
```

ทุก mutation ต้องตรวจ session และ ownership ที่ server ห้ามเชื่อ permission จาก UI ฝั่ง client ส่วน public lesson endpoint ต้องคืนเฉพาะ published snapshot

## Google integration

### Current optional backup

เมื่อกำหนด `NEXT_PUBLIC_GOOGLE_CLIENT_ID` หน้า `/takes` สามารถขอ scope `drive.appdata` เมื่อผู้ใช้กดเชื่อม แล้วสำรอง/กู้คืนไฟล์ `virtual-phin-quick-takes-v1.json` ด้วยตนเอง

การเชื่อมนี้ไม่ใช่ production login session และ access token อยู่เฉพาะ memory ของหน้า เหมาะกับ manual backup โดยไม่ต้องมี client secret

### Production account and sync

Production ต้องใช้ authorization-code flow ผ่าน server, session cookie แบบ httpOnly และ secure refresh-token storage ควรขอ `openid email profile` สำหรับ login ก่อน แล้วขอ Drive scope แบบ incremental เมื่อผู้ใช้เปิด backup

Database และ auth provider เลือกได้ภายหลังผ่าน repository boundary โดย UI และ Capture Engine ไม่ควร import SDK ของ provider โดยตรง

## Scoring policy

### Sequence mode

ตรวจสายและเฟรตตามลำดับ ไม่บังคับเวลา เหมาะกับ Quick Take และ Beginner lesson

### Timed mode

จับคู่ event แบบ monotonic alignment ไม่จับตาม array index ตรง ๆ เพราะ missed note หนึ่งตัวจะทำให้ผลทั้งหมดหลังจากนั้นเหลื่อม

Standard score เริ่มต้น:

```text
overall = note accuracy 70% + timing accuracy 30%
```

ต้องแสดงสองคะแนนแยกกันและบอกตำแหน่งความผิดพลาด ไม่ใช้คะแนนรวมเพียงค่าเดียว

## Delivery plan

### Slice A — implemented

- Quick Take จาก Free Play, Touch, keyboard และ Camera
- Smart start ที่โน้ตแรกและ auto duration
- IndexedDB พร้อม localStorage/memory fallback
- My Takes, rename, delete, Timeline/Phin Tab และ replay
- แปลง Take เป็น sequence practice
- Google Drive appData manual backup/restore แบบ optional
- Validation และ unit tests ของ Take data

### Slice B — next

- แก้ string/fret และเลือกช่วงใน Take Review
- Trim silence และ non-destructive quantize
- Accurate AudioContext scheduler
- Export/import `.vphin`
- Sync queue และ conflict revision

### Slice C — cloud foundation

- Google account/session ผ่าน server
- Database schema และ repositories
- Sync Quick Takes/Drafts
- Publish immutable Lesson Version
- Unlisted share link และ QR

### Slice D — student runtime

- Learn Notes, Follow Teacher, Test และ AR Guide
- Timed alignment/scoring
- Result พร้อม phrase retry
- Tracking gap เป็น unscored

### Slice E — classroom

- Assignment, learner identity/consent
- Attempt submission
- Teacher report
- Revocation, expiry และ retention policy

## Definition of done for the hybrid MVP

- การไม่ login ไม่ขวางการเล่นหรือบันทึก
- Refresh/ปิดหน้าแล้ว Quick Take ยังอยู่
- Camera unavailable แล้วยังใช้ Touch ได้
- Drive permission ถูกขอเมื่อผู้ใช้กดเชื่อมเท่านั้น
- Restore ไม่ลบข้อมูล local เดิมและ validate ทุก Take
- Published Lesson immutable และ share code เพิกถอนได้
- นักเรียนเปิด unlisted lesson โดยไม่ต้องมีบัญชี
- กล้องไม่อัปโหลดภาพหรือ landmark ดิบ
- Tracking loss ไม่ถูกนับเป็นความผิดของนักเรียน
- Route Handler ตรวจ session/ownership ทุก mutation

