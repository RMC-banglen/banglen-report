-- ============================================================
-- แยกวิธีทดสอบฝุ่นในทราย เป็น 2 วิธี เพราะวัดคนละหน่วย
--
--   bottle = เขย่าขวด        → วัดความสูงชั้นตะกอน  = % โดยปริมาตร
--   wash   = ล้างผ่านตะแกรงเบอร์ 200 (ASTM C117) → ชั่งน้ำหนัก = % โดยน้ำหนัก
--
-- เกณฑ์ 3%/5% ของ ASTM C33 เป็น % โดยน้ำหนัก ใช้ได้กับวิธี wash เท่านั้น
-- วิธี bottle ไม่มีเกณฑ์ตามมาตรฐาน เป็นการคัดกรองภาคสนาม จึงให้ตั้งค่าเอง
--
-- รันใน Supabase → SQL Editor (รันซ้ำได้ ไม่พัง)
-- ============================================================

-- ผลทดสอบ: เพิ่มวิธี และช่องน้ำหนักสำหรับวิธีล้าง
alter table sand_silt_tests
  add column if not exists method   text not null default 'bottle',
  add column if not exists w_before numeric,   -- น้ำหนักทรายแห้งก่อนล้าง (g)
  add column if not exists w_after  numeric;   -- น้ำหนักทรายแห้งหลังล้าง (g)

-- ช่องของวิธีเขย่าขวดต้องว่างได้ เพราะวิธีล้างไม่ได้ใช้
alter table sand_silt_tests alter column sand_mm drop not null;
alter table sand_silt_tests alter column silt_mm drop not null;

-- เกณฑ์: แยกคนละค่าตามวิธี
alter table sand_silt_spec
  add column if not exists max_pct_bottle numeric not null default 6,
  add column if not exists max_pct_wash   numeric not null default 3;

-- ย้ายค่าเดิมมาเป็นเกณฑ์ของวิธีเขย่าขวด แล้วเลิกใช้คอลัมน์เก่า
update sand_silt_spec
   set max_pct_bottle = max_pct
 where id = 1 and max_pct is not null;

alter table sand_silt_spec drop column if exists max_pct;

insert into sand_silt_spec (id) values (1) on conflict (id) do nothing;

-- ตรวจผล
select id, max_pct_bottle as เกณฑ์เขย่าขวด, max_pct_wash as เกณฑ์ล้างตะแกรง
  from sand_silt_spec where id = 1;
