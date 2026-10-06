-- ============================================================
-- สูตรคอนกรีต (mix design) ต่อคอนกรีต 1 ม³
--
-- เก็บไว้ในฐานข้อมูลแทนการฝังในโค้ด เพราะสูตรมีการปรับอยู่เรื่อย ๆ
-- โดยเฉพาะน้ำที่เติมกับน้ำยา จะได้แก้จากแอปได้เลยไม่ต้องรอแก้โค้ด
--
-- ทราย 822 กก. เป็นน้ำหนักตอน "ความชื้น 7%" (ตามหัวตาราง S 7%)
-- ไม่ใช่ทรายแห้ง เวลาความชื้นเปลี่ยนจึงต้องปรับทั้งน้ำหนักทรายและน้ำที่เติม
--
--   ทรายแห้งจริง   = 822 ÷ 1.07           = 768.2 กก.
--   ความชื้น M%    → ชั่งทรายเปียก         = 768.2 × (1 + M/100)
--                  → น้ำที่ทรายพามาเกิน    = 768.2 × (M − 7)/100
--                  → น้ำที่เติม             = water_add − น้ำส่วนเกินนั้น
--
-- รันใน Supabase -> SQL Editor
-- ============================================================

create table if not exists concrete_mix_design (
  formula      text primary key,        -- ชื่อสูตร เช่น NP315
  cement_kg    numeric not null,        -- ปูน OPC3 (กก.)
  sand_kg      numeric not null,        -- ทรายที่ความชื้นอ้างอิง (กก.)
  rock34_kg    numeric not null,        -- หิน 3/4" (กก.)
  rock1_kg     numeric not null,        -- หิน 1" (กก.)
  water_add_l  numeric not null,        -- น้ำที่เติมที่แพล้นท์ (ลิตร)
  np_cc        numeric,                 -- น้ำยา (cc)
  amp          numeric,                 -- แอมป์เครื่องโม่ที่ควรได้
  slump_cm     numeric,                 -- ค่ายุบตัวเป้าหมาย (ซม.)
  sort_order   int default 0,
  active       boolean default true,
  updated_at   timestamptz default now()
);

alter table concrete_mix_design enable row level security;
drop policy if exists concrete_mix_design_all on concrete_mix_design;
create policy concrete_mix_design_all on concrete_mix_design
  for all to anon, authenticated using (true) with check (true);

-- ความชื้นอ้างอิงของทรายในสูตร (หัวตารางเขียน S 7%)
create table if not exists concrete_mix_config (
  id              int primary key default 1,
  sand_base_moist numeric not null default 7,
  updated_at      timestamptz default now()
);
alter table concrete_mix_config enable row level security;
drop policy if exists concrete_mix_config_all on concrete_mix_config;
create policy concrete_mix_config_all on concrete_mix_config
  for all to anon, authenticated using (true) with check (true);
insert into concrete_mix_config (id) values (1) on conflict (id) do nothing;

-- ค่าตั้งต้นตามตารางสูตรที่ใช้อยู่
insert into concrete_mix_design
  (formula, cement_kg, sand_kg, rock34_kg, rock1_kg, water_add_l, np_cc, amp, slump_cm, sort_order) values
  ('NP315', 315, 822, 940, 330, 70, 3100, 55, 12, 1),
  ('NP325', 325, 822, 940, 330, 67, 3200, 55, 12, 2),
  ('NP335', 335, 822, 940, 330, 65, 3300, 55, 12, 3),
  ('NP345', 345, 822, 940, 330, 63, 3600, 60, 12, 4),
  ('NP355', 355, 822, 940, 330, 60, 3900, 60, 12, 5)
on conflict (formula) do update set
  cement_kg = excluded.cement_kg, sand_kg = excluded.sand_kg,
  rock34_kg = excluded.rock34_kg, rock1_kg = excluded.rock1_kg,
  water_add_l = excluded.water_add_l, np_cc = excluded.np_cc,
  amp = excluded.amp, slump_cm = excluded.slump_cm,
  sort_order = excluded.sort_order, updated_at = now();

select formula, cement_kg as ปูน, sand_kg as ทราย, water_add_l as น้ำที่เติม, np_cc as น้ำยา
from concrete_mix_design order by sort_order;
