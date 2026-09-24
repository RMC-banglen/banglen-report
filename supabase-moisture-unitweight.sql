-- ============================================================
-- 1) ความชื้นทราย (ASTM C566) + การดูดซึมน้ำ (ASTM C127/C128)
-- 2) หน่วยน้ำหนักคอนกรีตสด (ASTM C138)
--
-- ทั้งสองตัวมีไว้คุมอัตราส่วนน้ำต่อปูน ซึ่งเป็นตัวกำหนดกำลังอัด
-- ทรายชื้นขึ้น = น้ำในส่วนผสมเพิ่มโดยไม่รู้ตัว ต้องหักน้ำที่เติมลง
-- หน่วยน้ำหนักต่ำกว่าปกติ = น้ำเยอะเกินหรือชั่งตวงเพี้ยน รู้ได้ทันทีหน้างาน
--
-- รันใน Supabase -> SQL Editor
-- ============================================================

-- ---------- ความชื้นทราย ----------
-- ความชื้นรวม % = (นน.เปียก - นน.แห้ง) / นน.แห้ง x 100
-- ความชื้นผิว % = ความชื้นรวม - ค่าการดูดซึมน้ำของทรายแหล่งนั้น
-- น้ำที่ต้องหัก (ลิตร/ม³) = นน.ทรายในสูตร x ความชื้นผิว% / 100
-- หักเฉพาะความชื้นผิว เพราะน้ำที่ถูกดูดเข้าเนื้อเม็ดทรายไม่ได้ออกมาผสม
create table if not exists sand_moisture_tests (
  id            bigserial primary key,
  test_date     date not null,
  sand_source   text default '',
  w_wet         numeric,        -- น้ำหนักทรายเปียก (กรัม)
  w_dry         numeric,        -- น้ำหนักทรายหลังอบ/ผึ่งแห้ง (กรัม)
  total_pct     numeric,        -- ความชื้นรวม %
  free_pct      numeric,        -- ความชื้นผิว % (หักค่าดูดซึมแล้ว)
  water_adj_l   numeric,        -- น้ำที่ต้องหักออก ลิตรต่อคอนกรีต 1 ม³
  note          text default '',
  created_at    timestamptz default now()
);
create index if not exists sand_moisture_tests_date_idx on sand_moisture_tests (test_date desc);

alter table sand_moisture_tests enable row level security;
drop policy if exists sand_moisture_tests_all on sand_moisture_tests;
create policy sand_moisture_tests_all on sand_moisture_tests
  for all to anon, authenticated using (true) with check (true);

-- ---------- หน่วยน้ำหนักคอนกรีตสด ----------
-- หน่วยน้ำหนัก (kg/m³) = (นน.รวม - นน.ภาชนะ) / ปริมาตรภาชนะเป็นลิตร x 1000
create table if not exists concrete_unit_weight_tests (
  id            bigserial primary key,
  test_date     date not null,
  formula_name  text default '',
  container_l   numeric,        -- ปริมาตรภาชนะ (ลิตร)
  w_empty       numeric,        -- น้ำหนักภาชนะเปล่า (กก.)
  w_full        numeric,        -- น้ำหนักภาชนะ + คอนกรีต (กก.)
  unit_weight   numeric,        -- หน่วยน้ำหนักที่คำนวณได้ (kg/m³)
  target_uw     numeric,        -- ค่าอ้างอิงตอนที่บันทึก
  diff_pct      numeric,        -- ต่างจากค่าอ้างอิงกี่ %
  slump_cm      numeric,        -- ค่ายุบตัวของคอนกรีตชุดเดียวกัน (ถ้าวัด)
  note          text default '',
  created_at    timestamptz default now()
);
create index if not exists concrete_uw_tests_date_idx on concrete_unit_weight_tests (test_date desc);

alter table concrete_unit_weight_tests enable row level security;
drop policy if exists concrete_uw_tests_all on concrete_unit_weight_tests;
create policy concrete_uw_tests_all on concrete_unit_weight_tests
  for all to anon, authenticated using (true) with check (true);

-- ---------- ค่าตั้งต้น ----------
-- ค่าการดูดซึมน้ำวัดครั้งเดียวต่อแหล่งวัสดุ ใช้ได้ยาว ไม่ต้องวัดทุกวัน
-- ค่าเริ่มต้น 1.0% เป็นค่ากลางของทรายแม่น้ำทั่วไป ควรวัดจริงแล้วมาแก้
alter table sand_silt_spec
  add column if not exists sand_absorption_pct numeric not null default 1.0,
  add column if not exists sand_kg_per_m3      numeric not null default 822,
  add column if not exists target_unit_weight  numeric not null default 2380,
  add column if not exists uw_warn_pct         numeric not null default 2.0;

insert into sand_silt_spec (id) values (1) on conflict (id) do nothing;

select 'sand_moisture_tests'        as ตาราง, count(*)::text as จำนวนแถว from sand_moisture_tests
union all
select 'concrete_unit_weight_tests', count(*)::text from concrete_unit_weight_tests
union all
select 'ค่าดูดซึมทราย %',  sand_absorption_pct::text from sand_silt_spec where id = 1
union all
select 'ทรายในสูตร kg/m³', sand_kg_per_m3::text      from sand_silt_spec where id = 1
union all
select 'หน่วยนน.อ้างอิง',  target_unit_weight::text  from sand_silt_spec where id = 1;
