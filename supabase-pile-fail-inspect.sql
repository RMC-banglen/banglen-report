-- ============================================================
-- ตรวจสอบเสาเฟลหน้างาน (แอป QC) → แสดงในรายงานโฟร์แมนของแดชบอร์ดด้วย
-- วิธีใช้: วางใน Supabase SQL Editor แล้วกด Run (รันซ้ำได้ ไม่ซ้อน)
-- น้ำหนักเสาคำนวณจากหน้าตัดในแอปแบบเสาเข็ม (A × ความยาว × 2.4) จึงไม่ต้องมีตารางน้ำหนักแยก
-- ============================================================

create table if not exists pile_fail_inspections (
  id              bigserial primary key,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  inspector       text,                 -- ผู้ตรวจ (QC)
  inspect_date    date,                 -- วันที่ตรวจ
  foreman_report_id bigint,             -- อ้างอิงรายการในรายงานโฟร์แมน (foreman_reports.id)
  customer        text,
  site            text,
  pile_size       text,                 -- เช่น I22
  pile_std        text,                 -- tis = มอก. · fac = โรงงาน
  pile_length_m   numeric,
  prod_date       date,                 -- วันที่ผลิต (ถ้าหลายท่อน = วันที่เก่าสุด)
  prod_dates      jsonb default '[]',   -- วันที่ผลิตแต่ละท่อน [{date,len}] (เสาต่อกันหลายท่อน ผลิตคนละวัน)
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
  hammer_drop_cm  numeric,              -- ระยะยกตุ้ม (ซม.)
  qa_ton          numeric,              -- Qa ตามแบบ (ตัน)
  pile_weight_t   numeric,              -- น้ำหนักเสา (ตัน) = หน้าตัด × ยาว × 2.4
  pile_area_cm2   numeric,              -- พื้นที่หน้าตัดที่ใช้ (ตร.ซม.)
  hammer_ratio    numeric,              -- น้ำหนักตุ้ม ÷ น้ำหนักเสา
  blow_s_cm       numeric,              -- ผลคำนวณ Blow: S (ซม./ครั้ง)
  blow_per10      numeric,              -- ผลคำนวณ Blow: ครั้ง/10 ซม.
  photos          jsonb default '[]',   -- รูปตอนเสาแตก [url,...]
  cause_note      text,                 -- ข้อสังเกต / สาเหตุที่น่าจะเป็น
  action_note     text                  -- มาตรการแก้ไข
);

-- ถ้าเคยรันเวอร์ชันก่อนหน้าไปแล้ว: เพิ่มคอลัมน์ที่ขาดให้ (รันซ้ำได้)
alter table pile_fail_inspections add column if not exists prod_dates jsonb default '[]';
alter table pile_fail_inspections add column if not exists pile_std text;
alter table pile_fail_inspections add column if not exists hammer_drop_cm numeric;
alter table pile_fail_inspections add column if not exists qa_ton numeric;
alter table pile_fail_inspections add column if not exists pile_area_cm2 numeric;
alter table pile_fail_inspections add column if not exists blow_s_cm numeric;
alter table pile_fail_inspections add column if not exists blow_per10 numeric;

alter table pile_fail_inspections enable row level security;
drop policy if exists "pile_fail_inspections_all" on pile_fail_inspections;
create policy "pile_fail_inspections_all" on pile_fail_inspections for all using (true) with check (true);

create index if not exists pile_fail_inspections_date_idx on pile_fail_inspections (inspect_date desc);
create index if not exists pile_fail_inspections_foreman_idx on pile_fail_inspections (foreman_report_id);

select 'pile_fail_inspections' t, count(*) n from pile_fail_inspections;
