-- ============================================================
-- ผลทดสอบปูนซีเมนต์ SCG (Mortar) รายเดือน — ไว้เทียบกับกำลังอัดคอนกรีตของโรงงาน
-- วิธีใช้: วางใน Supabase SQL Editor แล้วกด Run (รันซ้ำได้ ไม่ซ้อน)
-- ============================================================
create table if not exists cement_scg (
  ym          text primary key,      -- เดือนที่ทดสอบ รูปแบบ YYYY-MM (ค.ศ.) เช่น 2026-10
  blaine      numeric,               -- ความละเอียด Blaine
  setting_min numeric,               -- Mortar setting time (นาที)
  s1          numeric,               -- Mortar strength 1 วัน (ksc)
  s3          numeric,               -- Mortar strength 3 วัน (ksc)
  s7          numeric,               -- Mortar strength 7 วัน (ksc)
  note        text,
  updated_at  timestamptz default now()
);

alter table cement_scg enable row level security;
drop policy if exists "cement_scg_all" on cement_scg;
create policy "cement_scg_all" on cement_scg for all using (true) with check (true);

-- ข้อมูลเดือน ม.ค.–ต.ค. 69 จากรายงาน SCG
insert into cement_scg (ym, blaine, setting_min, s1, s3, s7) values
  ('2026-01', 4360, 149, 209, 325, 391),
  ('2026-02', 4470, 143, 200, 310, 379),
  ('2026-03', 4300, 136, 204, 313, 384),
  ('2026-04', 4320, 147, 184, 309, 390),
  ('2026-05', 4320, 152, 193, 316, 369),
  ('2026-06', 4450, 135, 197, 318, 379),
  ('2026-07', 4350, 134, 194, 301, 371),
  ('2026-08', 4260, 148, 178, 289, 360),
  ('2026-09', 4340, 142, 185, 297, 366),
  ('2026-10', 4360, 139, 180, 295, 370)
on conflict (ym) do update set
  blaine = excluded.blaine, setting_min = excluded.setting_min,
  s1 = excluded.s1, s3 = excluded.s3, s7 = excluded.s7, updated_at = now();

select 'cement_scg' t, count(*) n from cement_scg;
