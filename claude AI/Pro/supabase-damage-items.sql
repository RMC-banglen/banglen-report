-- ============================================================
-- ตารางรายละเอียดเสาเสีย-เสียหาย (รายการ)
-- วิธีใช้: วาง SQL นี้ใน Supabase SQL Editor แล้วกด Run
-- ============================================================

-- ตารางรายการเสียหาย (ระดับ transaction)
create table if not exists damage_items (
  id           serial primary key,
  year         int  not null,
  month        int  not null,           -- 1-12
  code_type    text not null,           -- REB / ROB / ID
  damage_group text,                    -- รับคืน-เสียหายหน้างาน / เสียหายในโรงงาน
  customer_name text,
  cause        text,
  amount       numeric(18,2) default 0
);

-- ตารางยอดขายรายเดือน (สำหรับคำนวณ %)
create table if not exists damage_sales (
  id     serial primary key,
  year   int  not null,
  month  int  not null,
  sales  numeric(18,2) default 0,
  unique (year, month)
);

-- เปิดสิทธิ์
alter table damage_items enable row level security;
alter table damage_sales  enable row level security;

drop policy if exists "anon all" on damage_items;
drop policy if exists "anon all" on damage_sales;

create policy "anon all" on damage_items for all using (true) with check (true);
create policy "anon all" on damage_sales  for all using (true) with check (true);

-- Index เพื่อความเร็ว
create index if not exists idx_damage_items_ym   on damage_items (year, month);
create index if not exists idx_damage_items_code on damage_items (code_type);
create index if not exists idx_damage_sales_ym   on damage_sales  (year, month);

-- ข้อมูลตัวอย่าง ยอดขายรายเดือน ปี 2569
insert into damage_sales (year, month, sales) values
  (2569, 1, 17345153.30),
  (2569, 2, 19459745.47),
  (2569, 3, 21730581.59),
  (2569, 4, 11730756.37),
  (2569, 5, 17601538.50)
on conflict (year, month) do update set sales = excluded.sales;

-- ตรวจสอบ
select 'damage_items' t, count(*) n from damage_items
union all select 'damage_sales', count(*) from damage_sales;
