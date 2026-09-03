-- ============================================================
-- ปูนที่ใช้จริงต่อคิว + ส่วนต่างที่ลดได้เทียบเกณฑ์ปีก่อน
-- กรอกข้อมูลจากหน้าเว็บโดยตรง (ไม่ผ่าน Google Sheet)
-- ============================================================

-- บันทึกรายเดือน
create table if not exists cement_usage (
  id          bigserial primary key,
  year        int not null,          -- ปี พ.ศ. เช่น 2569
  month       int not null,          -- 1-12
  cement_kg   numeric not null,      -- ยอดซื้อปูน (กิโลกรัม)
  volume_m3   numeric not null,      -- ยอดคิวคำนวณ (m³)
  note        text default '',
  created_at  timestamptz default now(),
  unique (year, month)
);

create index if not exists cement_usage_ym_idx on cement_usage (year desc, month desc);

-- ค่าตั้งต้น: เกณฑ์ปีก่อน + ราคาปูนล่าสุด (มีแถวเดียว id=1)
create table if not exists cement_config (
  id              int primary key default 1,
  baseline_kg_m3  numeric not null default 380,   -- เฉลี่ยที่ใช้ปีก่อน
  price_per_kg    numeric not null default 0,     -- ราคาปูนล่าสุด บาท/กก.
  updated_at      timestamptz default now(),
  constraint cement_config_single_row check (id = 1)
);

insert into cement_config (id) values (1) on conflict (id) do nothing;

alter table cement_usage  enable row level security;
alter table cement_config enable row level security;

drop policy if exists "cement_usage_all" on cement_usage;
create policy "cement_usage_all" on cement_usage for all using (true) with check (true);

drop policy if exists "cement_config_all" on cement_config;
create policy "cement_config_all" on cement_config for all using (true) with check (true);
