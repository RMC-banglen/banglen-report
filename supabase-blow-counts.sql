-- ============================================================
-- ประวัติ Blow count 30 ฟุต (โฟร์แมนส่งข้อความในกลุ่ม Telegram → บอทบันทึกให้)
-- ใช้กับแท็บ "นับ Blow count 30 ฟุต" ในหน้ารายงานโฟร์แมน
-- วิธีใช้: เปิด Supabase → SQL Editor → วางทั้งหมด → Run (รันซ้ำได้ ไม่ซ้อน)
-- ระดับดิน (อ่อน / เฝ้าระวัง 1-3 / แข็ง) คำนวณตอนแสดงผลจากจำนวนครั้ง ไม่เก็บในตาราง
-- ============================================================

create table if not exists blow_counts (
  id          bigserial primary key,
  count_date  date not null,          -- วันที่ (วันที่ส่งข้อความ หรือวันที่กรอก)
  site        text,                   -- หน่วยงาน / หน้างาน
  pile        text,                   -- เสา เช่น I30 × 22.00 ม. ต/ช (ธรรมดา)
  size        text,                   -- ขนาดเสา เช่น I30
  length_m    numeric,                -- ความยาวเสา (เมตร)
  blows       int not null,           -- จำนวนครั้งที่นับได้
  feet        int default 30,         -- ระยะที่นับ (ฟุต)
  reporter    text,                   -- ผู้แจ้ง (ชื่อโฟร์แมน)
  note        text,
  source      text default 'form',    -- form / telegram
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists blow_counts_date_idx on blow_counts (count_date desc);

alter table blow_counts enable row level security;
drop policy if exists "blow_counts_all" on blow_counts;
create policy "blow_counts_all" on blow_counts for all using (true) with check (true);

select 'blow_counts' t, count(*) n from blow_counts;
