-- ============================================================
-- ทดสอบหาปริมาณฝุ่น/ดินในทราย วิธีเขย่าขวด (field silt test)
--
-- วิธีทดสอบ: ใส่ทรายลงขวดใสประมาณครึ่งขวด เติมน้ำ เขย่าแรงๆ แล้วตั้งทิ้งไว้
-- ฝุ่นและดินจะตกตะกอนเป็นชั้นบางๆ อยู่เหนือชั้นทราย วัดความสูงทั้งสองชั้น
-- % ฝุ่น = ชั้นฝุ่น ÷ (ชั้นฝุ่น + ชั้นทราย) × 100
--
-- รันไฟล์นี้ใน Supabase → SQL Editor ครั้งเดียว
-- ============================================================

create table if not exists sand_silt_tests (
  id          bigserial primary key,
  test_date   date not null,
  sand_source text default '',
  sand_mm     numeric not null,        -- ความสูงชั้นทราย (มม.)
  silt_mm     numeric not null,        -- ความสูงชั้นฝุ่นที่ตกตะกอนทับ (มม.)
  silt_pct    numeric,                 -- % ฝุ่น คำนวณตอนบันทึก
  note        text default '',
  created_at  timestamptz default now()
);

create index if not exists sand_silt_tests_date_idx on sand_silt_tests (test_date desc);

-- เกณฑ์ที่ยอมรับได้ แก้ได้จากหน้าเว็บ เก็บแถวเดียว
create table if not exists sand_silt_spec (
  id         int primary key default 1,
  max_pct    numeric not null default 3,
  updated_at timestamptz default now()
);

insert into sand_silt_spec (id, max_pct) values (1, 3)
on conflict (id) do nothing;

-- ตรวจผล
select 'sand_silt_tests' as ตาราง, count(*) as จำนวนแถว from sand_silt_tests
union all
select 'sand_silt_spec', count(*) from sand_silt_spec;
