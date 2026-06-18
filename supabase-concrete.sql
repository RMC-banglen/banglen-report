-- ============================================================
-- Supabase: ตารางผลทดสอบคอนกรีต + วัตถุดิบ (บางเลน)
-- วิธีใช้: วางทั้งหมดใน Supabase SQL Editor แล้วกด Run
-- ============================================================

create table if not exists concrete_results (
  id           serial primary key,
  sample_date  date not null,
  test_date    date,
  age_days     int,
  formula_name text,
  cube_size    text,
  result1_kn   numeric(8,2),
  result2_kn   numeric(8,2),
  result3_kn   numeric(8,2),
  avg_kn       numeric(8,2),
  avg_mpa      numeric(8,2),
  avg_ksc      numeric(8,2)
);

create table if not exists materials_daily (
  id           serial primary key,
  mat_date     date unique not null,
  cement_total numeric(8,2),
  cement_big   numeric(8,2),
  cement_i18   numeric(8,2),
  rock34       numeric(8,2),
  rock1        numeric(8,2),
  sand         numeric(8,2)
);

alter table concrete_results disable row level security;
alter table materials_daily  disable row level security;

create index if not exists idx_concrete_sample on concrete_results (sample_date);
create index if not exists idx_materials_date  on materials_daily  (mat_date);

-- ตรวจสอบ
select 'concrete_results' t, count(*) n from concrete_results
union all select 'materials_daily', count(*) from materials_daily;
