-- ============================================================
-- Supabase Setup: รายงานการผลิตเสาเข็มคอนกรีตอัดแรง
-- วิธีใช้: วาง SQL นี้ใน Supabase SQL Editor แล้วกด Run
-- ============================================================

-- ----------------------------------------------------------------
-- 1. สร้างตาราง
-- ----------------------------------------------------------------

create table if not exists production_monthly (
  id              serial primary key,
  year            int not null,
  month           int not null,  -- 1=ม.ค. ... 12=ธ.ค.
  order_qty       numeric(10,2),  -- คิวสั่งผลิต
  produced        numeric(10,2),  -- คิวผลิตจริง
  cancel          numeric(10,2),  -- ค้าง-ยกเลิก
  days            int,            -- วันที่มีผลิต
  per_day         numeric(10,2),  -- เฉลี่ยคิว/วัน
  transport       numeric(10,2),  -- คิวขนส่ง
  stock           numeric(10,2),  -- สต็อคคงเหลือ
  raft_order      numeric(10,2),  -- แพสั่ง
  raft_produced   numeric(10,2),  -- แพผลิต
  raft_cancel     numeric(10,2),  -- แพค้าง
  is_sample       boolean default false,  -- true = ข้อมูลตัวอย่าง
  unique (year, month)
);

create table if not exists quality_decade (
  id              serial primary key,
  year            int not null,
  sort_order      int not null,   -- ลำดับภายในปี (1,2,3,...)
  label           text not null,  -- เช่น "1–10 ม.ค."
  strength        numeric(8,2),   -- ksc
  cement_total    numeric(8,2),   -- kg/m³
  cement_big      numeric(8,2),
  cement_i18      numeric(8,2),
  rock34          numeric(8,2),   -- หิน 3/4"
  rock1           numeric(8,2),   -- หิน 1"
  sand            numeric(8,2),
  unique (year, sort_order)
);

create table if not exists cancel_causes (
  id              serial primary key,
  year            int not null,
  month           int not null,
  cause_index     int not null,   -- 0-9
  cause_label     text not null,
  count           int not null default 0,
  unique (year, month, cause_index)
);

create table if not exists mix_targets (
  id              serial primary key,
  name            text unique not null,  -- 'rock34', 'rock1', 'sand'
  value           numeric(8,2) not null
);

create table if not exists capacity_config (
  id              serial primary key,
  queue_per_day   int not null default 170,
  raft_per_day    int not null default 12,
  updated_at      timestamptz default now()
);

-- ----------------------------------------------------------------
-- 2. เปิด Read-Only access สาธารณะ (ไม่ต้อง login เพื่อดูข้อมูล)
-- ----------------------------------------------------------------

alter table production_monthly  enable row level security;
alter table quality_decade       enable row level security;
alter table cancel_causes        enable row level security;
alter table mix_targets          enable row level security;
alter table capacity_config      enable row level security;

create policy "public read" on production_monthly  for select using (true);
create policy "public read" on quality_decade       for select using (true);
create policy "public read" on cancel_causes        for select using (true);
create policy "public read" on mix_targets          for select using (true);
create policy "public read" on capacity_config      for select using (true);

-- ----------------------------------------------------------------
-- 3. Insert ข้อมูล — capacity config
-- ----------------------------------------------------------------

insert into capacity_config (queue_per_day, raft_per_day) values (170, 12);

-- ----------------------------------------------------------------
-- 4. Insert ข้อมูล — mix design targets
-- ----------------------------------------------------------------

insert into mix_targets (name, value) values
  ('rock34', 940),
  ('rock1',  330),
  ('sand',   822);

-- ----------------------------------------------------------------
-- 5. Insert ข้อมูล — production_monthly ปี 2569 (ข้อมูลจริง)
-- ----------------------------------------------------------------

insert into production_monthly
  (year, month, order_qty, produced, cancel, days, per_day, transport, stock, raft_order, raft_produced, raft_cancel, is_sample)
values
  (2569, 1,  4453.59, 4291.81, 161.78, 27, 158.96, 4024.69, 4257.81, 293.0,  283.0,  10.0,  false),
  (2569, 2,  3722.51, 3657.43,  65.08, 25, 146.30, 4402.10, 3530.86, 221.0,  219.0,   2.0,  false),
  (2569, 3,  4614.79, 4350.12, 264.67, 31, 140.33, 4691.94, 3210.50, 308.0,  295.0,  10.0,  false),
  (2569, 4,  3453.09, 3268.36, 184.73, 21, 155.64, 2634.03, 3851.02, 231.5,  218.5,  13.0,  false);

-- ----------------------------------------------------------------
-- 6. Insert ข้อมูล — production_monthly ปี 2568 (ข้อมูลตัวอย่าง)
-- ----------------------------------------------------------------

insert into production_monthly
  (year, month, order_qty, produced, cancel, days, per_day, transport, stock, raft_order, raft_produced, raft_cancel, is_sample)
values
  (2568,  1, 4120.0, 3902.4, 217.6, 26, 150.1, 3760.5, 3990.2, 268.0, 255.0, 13.0, true),
  (2568,  2, 3580.0, 3401.0, 179.0, 24, 141.7, 3520.8, 3870.4, 214.0, 206.0,  8.0, true),
  (2568,  3, 4380.0, 4029.6, 350.4, 30, 134.3, 4210.0, 3690.0, 295.0, 276.0, 19.0, true),
  (2568,  4, 3260.0, 3064.4, 195.6, 22, 139.3, 3180.0, 3574.4, 220.0, 210.0, 10.0, true),
  (2568,  5, 3980.0, 3741.2, 238.8, 27, 138.6, 3890.0, 3425.6, 262.0, 248.0, 14.0, true),
  (2568,  6, 3710.0, 3450.3, 259.7, 25, 138.0, 3600.0, 3275.9, 244.0, 230.0, 14.0, true),
  (2568,  7, 4250.0, 4037.5, 212.5, 29, 139.2, 4120.0, 3193.4, 281.0, 268.0, 13.0, true),
  (2568,  8, 4410.0, 4145.4, 264.6, 30, 138.2, 4300.0, 3038.8, 292.0, 274.0, 18.0, true),
  (2568,  9, 3890.0, 3617.7, 272.3, 26, 139.1, 3780.0, 2876.5, 256.0, 240.0, 16.0, true),
  (2568, 10, 4060.0, 3856.0, 204.0, 28, 137.7, 3960.0, 2772.5, 270.0, 257.0, 13.0, true),
  (2568, 11, 4180.0, 3929.2, 250.8, 27, 145.5, 4050.0, 2651.7, 278.0, 262.0, 16.0, true),
  (2568, 12, 4530.0, 4258.2, 271.8, 30, 141.9, 4400.0, 2509.9, 301.0, 283.0, 18.0, true);

-- ----------------------------------------------------------------
-- 7. Insert ข้อมูล — quality_decade ปี 2569 (ข้อมูลจริง)
-- ----------------------------------------------------------------

insert into quality_decade
  (year, sort_order, label, strength, cement_total, cement_big, cement_i18, rock34, rock1, sand)
values
  (2569,  1, '1–10 ม.ค.',   473.00, 328.45, 331.41, 279.91, 920.67, 324.71, 807.12),
  (2569,  2, '11–20 ม.ค.',  478.00, 326.95, 330.77, 279.14, 924.30, 329.19, 810.17),
  (2569,  3, '21–31 ม.ค.',  505.00, 336.48, 337.74, 279.17, 948.53, 339.59, 829.70),
  (2569,  4, '1–10 ก.พ.',   438.00, 329.49, 329.63, 280.21, 933.34, 326.21, 814.59),
  (2569,  5, '11–20 ก.พ.',  467.00, 332.54, 332.54,    null, 963.25, 293.28, 815.80),
  (2569,  6, '21–28 ก.พ.',  454.47, 333.17, 333.17,    null, 938.86, 319.82, 810.29),
  (2569,  7, '1–10 มี.ค.',  482.37, 330.96, 333.43, 279.44, 916.65, 326.89, 801.61),
  (2569,  8, '11–20 มี.ค.', 541.05, 330.08, 333.03, 280.12, 931.94, 330.99, 813.39),
  (2569,  9, '21–31 มี.ค.', 483.36, 328.02, 329.97, 279.66, 924.22, 327.87, 809.42),
  (2569, 10, '1–11 เม.ย.',  475.39, 326.79, 328.62, 279.15, 953.18, 337.04, 832.20),
  (2569, 11, '20–30 เม.ย.',   null, 355.41,    null,    null,   null,   null,   null);

-- ----------------------------------------------------------------
-- 8. Insert ข้อมูล — cancel_causes ปี 2569
-- ----------------------------------------------------------------

insert into cancel_causes (year, month, cause_index, cause_label, count) values
  -- เดือน 1
  (2569, 1, 0, 'แพล้นเสีย',                 3),
  (2569, 1, 1, 'ที่ดึงหินทรายเสีย',          0),
  (2569, 1, 2, 'เครนเสีย',                   0),
  (2569, 1, 3, 'รถไฟขนเสาเข็มเสีย',          0),
  (2569, 1, 4, 'รถไฟขนคอนกรีตเสีย',          1),
  (2569, 1, 5, 'รถขนส่งเข้าเยอะ',            0),
  (2569, 1, 6, 'ผู้รับเหมาผลิตไม่ได้',        3),
  (2569, 1, 7, 'สต็อคเต็ม',                  2),
  (2569, 1, 8, 'ซ่อมแพผลิต',                 1),
  (2569, 1, 9, 'ฝ่ายผลิตยกเลิกเอง',          0),
  -- เดือน 2
  (2569, 2, 0, 'แพล้นเสีย',                 1),
  (2569, 2, 1, 'ที่ดึงหินทรายเสีย',          0),
  (2569, 2, 2, 'เครนเสีย',                   0),
  (2569, 2, 3, 'รถไฟขนเสาเข็มเสีย',          0),
  (2569, 2, 4, 'รถไฟขนคอนกรีตเสีย',          0),
  (2569, 2, 5, 'รถขนส่งเข้าเยอะ',            1),
  (2569, 2, 6, 'ผู้รับเหมาผลิตไม่ได้',        0),
  (2569, 2, 7, 'สต็อคเต็ม',                  0),
  (2569, 2, 8, 'ซ่อมแพผลิต',                 0),
  (2569, 2, 9, 'ฝ่ายผลิตยกเลิกเอง',          0),
  -- เดือน 3
  (2569, 3, 0, 'แพล้นเสีย',                 9),
  (2569, 3, 1, 'ที่ดึงหินทรายเสีย',          5),
  (2569, 3, 2, 'เครนเสีย',                   0),
  (2569, 3, 3, 'รถไฟขนเสาเข็มเสีย',          1),
  (2569, 3, 4, 'รถไฟขนคอนกรีตเสีย',          0),
  (2569, 3, 5, 'รถขนส่งเข้าเยอะ',            1),
  (2569, 3, 6, 'ผู้รับเหมาผลิตไม่ได้',        0),
  (2569, 3, 7, 'สต็อคเต็ม',                  0),
  (2569, 3, 8, 'ซ่อมแพผลิต',                 0),
  (2569, 3, 9, 'ฝ่ายผลิตยกเลิกเอง',          1),
  -- เดือน 4
  (2569, 4, 0, 'แพล้นเสีย',                 6),
  (2569, 4, 1, 'ที่ดึงหินทรายเสีย',          4),
  (2569, 4, 2, 'เครนเสีย',                   0),
  (2569, 4, 3, 'รถไฟขนเสาเข็มเสีย',          2),
  (2569, 4, 4, 'รถไฟขนคอนกรีตเสีย',          0),
  (2569, 4, 5, 'รถขนส่งเข้าเยอะ',            1),
  (2569, 4, 6, 'ผู้รับเหมาผลิตไม่ได้',        0),
  (2569, 4, 7, 'สต็อคเต็ม',                  1),
  (2569, 4, 8, 'ซ่อมแพผลิต',                 0),
  (2569, 4, 9, 'ฝ่ายผลิตยกเลิกเอง',          0);

-- ----------------------------------------------------------------
-- ตรวจสอบ
-- ----------------------------------------------------------------
select 'production_monthly' as tbl, count(*) from production_monthly
union all
select 'quality_decade',            count(*) from quality_decade
union all
select 'cancel_causes',             count(*) from cancel_causes
union all
select 'mix_targets',               count(*) from mix_targets
union all
select 'capacity_config',           count(*) from capacity_config;
