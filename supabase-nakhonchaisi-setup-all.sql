-- ============================================================
-- Supabase Setup ทั้งหมด สำหรับนครชัยศรี
-- วิธีใช้: วางทั้งหมดใน Supabase SQL Editor แล้วกด Run
-- ============================================================

-- ----------------------------------------------------------------
-- ส่วนที่ 1: ตารางหลัก
-- ----------------------------------------------------------------

create table if not exists production_monthly (
  id              serial primary key,
  year            int not null,
  month           int not null,
  order_qty       numeric(10,2),
  produced        numeric(10,2),
  cancel          numeric(10,2),
  days            int,
  per_day         numeric(10,2),
  transport       numeric(10,2),
  stock           numeric(10,2),
  raft_order      numeric(10,2),
  raft_produced   numeric(10,2),
  raft_cancel     numeric(10,2),
  is_sample       boolean default false,
  unique (year, month)
);

create table if not exists production_decades (
  id          serial primary key,
  year        int not null,
  sort_order  int not null,
  label       text not null,
  produced    numeric(10,2),
  unique (year, sort_order)
);

create table if not exists production_causes (
  id          serial primary key,
  year        int not null,
  month       int not null,
  cause_index int not null,
  cause_label text not null,
  count       int not null default 0,
  unique (year, month, cause_index)
);

create table if not exists quality_decade (
  id              serial primary key,
  year            int not null,
  sort_order      int not null,
  label           text not null,
  strength        numeric(8,2),
  cement_total    numeric(8,2),
  cement_big      numeric(8,2),
  cement_i18      numeric(8,2),
  rock34          numeric(8,2),
  rock1           numeric(8,2),
  sand            numeric(8,2),
  unique (year, sort_order)
);

create table if not exists cancel_causes (
  id          serial primary key,
  year        int not null,
  month       int not null,
  cause_index int not null,
  cause_label text not null,
  count       int not null default 0,
  unique (year, month, cause_index)
);

create table if not exists mix_targets (
  id    serial primary key,
  name  text unique not null,
  value numeric(8,2) not null
);

create table if not exists capacity_config (
  id            serial primary key,
  queue_per_day int not null default 170,
  raft_per_day  int not null default 12,
  updated_at    timestamptz default now()
);

-- ----------------------------------------------------------------
-- ส่วนที่ 2: ตารางเสาเสีย
-- ----------------------------------------------------------------

create table if not exists damage_yearly (
  id    serial primary key,
  year  int unique not null,
  sales numeric(18,2),
  loss  numeric(18,2)
);

create table if not exists damage_monthly (
  id    serial primary key,
  year  int not null,
  month int not null,
  sales numeric(18,2),
  loss  numeric(18,2),
  unique (year, month)
);

create table if not exists damage_causes (
  id         serial primary key,
  year       int not null,
  sort_order int not null,
  cause_name text not null,
  value      numeric(18,2),
  unique (year, sort_order)
);

create table if not exists damage_customers (
  id            serial primary key,
  year          int not null,
  sort_order    int not null,
  customer_name text not null,
  count         int,
  unique (year, sort_order)
);

create table if not exists damage_items (
  id           serial primary key,
  year         int  not null,
  month        int  not null,
  code_type    text not null,
  damage_group text,
  customer_name text,
  cause        text,
  amount       numeric(18,2) default 0
);

create table if not exists damage_sales (
  id    serial primary key,
  year  int  not null,
  month int  not null,
  sales numeric(18,2) default 0,
  unique (year, month)
);

-- ----------------------------------------------------------------
-- ส่วนที่ 3: ปิด RLS ทั้งหมด (อนุญาตเขียนจาก Apps Script)
-- ----------------------------------------------------------------

alter table production_monthly  disable row level security;
alter table production_decades  disable row level security;
alter table production_causes   disable row level security;
alter table quality_decade      disable row level security;
alter table cancel_causes       disable row level security;
alter table mix_targets         disable row level security;
alter table capacity_config     disable row level security;
alter table damage_yearly       disable row level security;
alter table damage_monthly      disable row level security;
alter table damage_causes       disable row level security;
alter table damage_customers    disable row level security;
alter table damage_items        disable row level security;
alter table damage_sales        disable row level security;

-- ----------------------------------------------------------------
-- ส่วนที่ 4: ข้อมูลเริ่มต้น
-- ----------------------------------------------------------------

insert into capacity_config (queue_per_day, raft_per_day) values (170, 12)
on conflict do nothing;

insert into mix_targets (name, value) values
  ('rock34', 940), ('rock1', 330), ('sand', 822)
on conflict do nothing;

-- Index
create index if not exists idx_damage_items_ym   on damage_items (year, month);
create index if not exists idx_damage_items_code on damage_items (code_type);
create index if not exists idx_damage_sales_ym   on damage_sales (year, month);

-- ----------------------------------------------------------------
-- ตรวจสอบ
-- ----------------------------------------------------------------
select 'production_monthly' as tbl, count(*) from production_monthly
union all select 'damage_items', count(*) from damage_items
union all select 'mix_targets', count(*) from mix_targets
union all select 'capacity_config', count(*) from capacity_config;
