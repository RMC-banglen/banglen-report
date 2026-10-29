-- ============================================================
-- รายงานโฟร์แมน — เสาเข็มเฟลหน้างาน (เดิมกรอกในไฟล์ Excel "รายงานโฟร์แมน")
-- วิธีใช้: เปิด Supabase → SQL Editor → วางทั้งหมด → Run (รันซ้ำได้ ไม่ซ้อน)
-- ใช้กับแท็บ "รายงานโฟร์แมน" บนแดชบอร์ด + บอท Telegram (ข้อความขึ้นต้น "แจ้งเสาเฟล")
-- ============================================================

create table if not exists foreman_reports (
  id          bigserial primary key,
  drive_date  date not null,          -- วันที่ตอก
  factory     text,                   -- โรงงาน (บางเลน / บ่อตะกั่ว)
  size        text,                   -- ขนาดเสาเข็ม เช่น I22
  length_m    numeric,                -- ความยาว (เมตร)
  kind        text,                   -- ประเภท เช่น ช/มอก  ช/รง  ด/มอก
  fail_of     text,                   -- เฟลจากกี่ต้น เช่น 1/60
  customer    text,                   -- ชื่อลูกค้า
  site        text,                   -- หน้างาน
  cast_dates  text,                   -- วันที่หน้าเสา (วันหล่อเสา) เช่น 21/12/68-4/1/69
  foreman     text,                   -- โฟร์แมนรายงาน
  fix         text,                   -- แก้ไข เช่น แซม 2 ต้น / รอสรุป
  remark      text,                   -- หมายเหตุ / อาการ เช่น Fail, เสาแตกปีกขณะตอก
  segs        text,                   -- ความยาวแต่ละท่อน เช่น 8+7
  crane       text,                   -- ปั้นจั่น
  source      text default 'form',    -- form / excel / telegram
  created_by  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists foreman_reports_drive_idx on foreman_reports (drive_date desc);

alter table foreman_reports enable row level security;
drop policy if exists "foreman_reports_all" on foreman_reports;
create policy "foreman_reports_all" on foreman_reports for all using (true) with check (true);

select 'foreman_reports' t, count(*) n from foreman_reports;
