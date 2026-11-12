-- ============================================================
-- ตรวจสอบเสาเฟลหน้างาน (แอป QC)
-- วิธีใช้: วางใน Supabase SQL Editor แล้วกด Run (รันซ้ำได้ ไม่ซ้อน)
-- ============================================================

-- 1) น้ำหนักเสาเข็มต่อเมตร ตามขนาด (ไว้คำนวณน้ำหนักเสา = กก./ม. × ความยาว เทียบกับน้ำหนักตุ้ม 0.7–2.5 เท่า)
--    ค่าเริ่มต้นเป็นค่าประมาณ (confirmed = false) — ให้ QC เปิดดูแล้วแก้เป็นค่าจริงของโรงงาน (กดแก้ในฟอร์ม ระบบจะตั้ง confirmed = true)
create table if not exists qc_pile_weights (
  size       text primary key,          -- เช่น I22, S26
  kg_per_m   numeric not null,          -- น้ำหนัก กก./เมตร
  confirmed  boolean not null default false,
  updated_at timestamptz default now()
);

insert into qc_pile_weights (size, kg_per_m, confirmed) values
  ('I18', 45, false), ('I22', 70, false), ('I26', 95, false), ('I30', 120, false), ('I35', 150, false), ('I40', 190, false),
  ('S18', 78, false), ('S22', 116, false), ('S26', 162, false), ('S30', 216, false), ('S35', 294, false)
on conflict (size) do nothing;

-- 2) ใบตรวจเสาเฟลหน้างาน
create table if not exists pile_fail_inspections (
  id              bigserial primary key,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  inspector       text,                 -- ผู้ตรวจ (QC)
  inspect_date    date,                 -- วันที่ตรวจ
  foreman_report_id bigint,             -- อ้างอิงรายงานโฟร์แมน (ถ้าเลือกมา)
  customer        text,
  site            text,
  pile_size       text,                 -- เช่น I22
  pile_length_m   numeric,
  prod_date       date,                 -- วันที่ผลิต (ยึดวันนี้นับอายุเสา)
  face_date       text,                 -- วันที่หน้าเสา (อ้างอิง อาจย้อนวัน)
  drive_date      date,                 -- วันที่ตอก
  age_days        int,                  -- อายุเสา = วันที่ตอก − วันที่ผลิต
  strength_formula text,                -- สูตรที่เลือกเทียบกำลังอัด ('' = ทุกสูตร)
  strength_rows   jsonb default '[]',   -- ผลกำลังอัดวันผลิต ±3 วัน ที่ใช้ตอนตรวจ [{d,a,k}]
  blow_id         bigint,               -- อ้างอิงรายการ Blow count (ถ้าเลือกมา)
  blow_site       text,
  blow_count      int,                  -- ครั้ง / 30 ฟุตสุดท้าย
  blow_feet       int default 30,
  vertical_result text,                 -- ok / bad / na
  vertical_note   text,                 -- ค่าที่วัดได้ เช่น เอียง 2 ซม.
  hammer_weight_t numeric,              -- น้ำหนักตุ้ม (ตัน)
  hammer_drop_m   numeric,              -- ระยะยกตุ้ม (ม.)
  pile_weight_t   numeric,              -- น้ำหนักเสา (ตัน) ที่ใช้คำนวณ
  pile_kg_per_m   numeric,
  hammer_ratio    numeric,              -- น้ำหนักตุ้ม ÷ น้ำหนักเสา
  photos          jsonb default '[]',   -- รูปตอนเสาแตก [url,...]
  cause_note      text,                 -- ข้อสังเกต / สาเหตุที่น่าจะเป็น
  action_note     text                  -- มาตรการแก้ไข
);

alter table qc_pile_weights enable row level security;
alter table pile_fail_inspections enable row level security;
drop policy if exists "qc_pile_weights_all" on qc_pile_weights;
create policy "qc_pile_weights_all" on qc_pile_weights for all using (true) with check (true);
drop policy if exists "pile_fail_inspections_all" on pile_fail_inspections;
create policy "pile_fail_inspections_all" on pile_fail_inspections for all using (true) with check (true);

create index if not exists pile_fail_inspections_date_idx on pile_fail_inspections (inspect_date desc);

select 'qc_pile_weights' t, count(*) n from qc_pile_weights
union all select 'pile_fail_inspections', count(*) from pile_fail_inspections;
