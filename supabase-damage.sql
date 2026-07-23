-- ============================================================
-- ตารางข้อมูลเสาเสีย & ความเสียหาย
-- วิธีใช้: วาง SQL นี้ใน Supabase SQL Editor แล้วกด Run
-- ============================================================

-- 1. สร้างตาราง
create table if not exists damage_yearly (
  id serial primary key,
  year int unique not null,
  sales numeric(18,2),   -- ยอดขาย (บาท)
  loss  numeric(18,2)    -- มูลค่าเสียหาย (บาท)
);

create table if not exists damage_monthly (
  id serial primary key,
  year int not null,
  month int not null,    -- 1-12
  sales numeric(18,2),
  loss  numeric(18,2),
  unique (year, month)
);

create table if not exists damage_causes (
  id serial primary key,
  year int not null,
  sort_order int not null,
  cause_name text not null,
  value numeric(18,2),   -- มูลค่า (บาท)
  unique (year, sort_order)
);

create table if not exists damage_customers (
  id serial primary key,
  year int not null,
  sort_order int not null,
  customer_name text not null,
  count int,             -- จำนวนครั้งที่เสาเสีย
  unique (year, sort_order)
);

-- 2. เปิดสิทธิ์ อ่าน+เขียน (สำหรับ anon key)
alter table damage_yearly    enable row level security;
alter table damage_monthly   enable row level security;
alter table damage_causes    enable row level security;
alter table damage_customers enable row level security;

drop policy if exists "anon all" on damage_yearly;
drop policy if exists "anon all" on damage_monthly;
drop policy if exists "anon all" on damage_causes;
drop policy if exists "anon all" on damage_customers;

create policy "anon all" on damage_yearly    for all using (true) with check (true);
create policy "anon all" on damage_monthly   for all using (true) with check (true);
create policy "anon all" on damage_causes    for all using (true) with check (true);
create policy "anon all" on damage_customers for all using (true) with check (true);

-- 3. ล้าง + ใส่ข้อมูลเริ่มต้น
truncate damage_yearly, damage_monthly, damage_causes, damage_customers restart identity;

-- รายปี
insert into damage_yearly (year, sales, loss) values
  (2565, 201534492.77, 1668996.73),
  (2566, 229414514.05, 1632024.54),
  (2568, 195137597.38, 1459639.97),
  (2569,  87867775.23,  582095.78);

-- รายเดือน ปี 2569
insert into damage_monthly (year, month, sales, loss) values
  (2569, 1, 17345153.30, 110734.79),
  (2569, 2, 19459745.47,  87310.30),
  (2569, 3, 21730581.59, 134545.11),
  (2569, 4, 11730756.37,  67319.12),
  (2569, 5, 17601538.50, 182186.46);

-- สาเหตุ ปี 2569
insert into damage_causes (year, sort_order, cause_name, value) values
  (2569, 1,  'เสาเข็ม Fail',                   223526.62),
  (2569, 2,  'เสาร้าวในกอง/ขนส่ง/ปีกแตก',      104645.72),
  (2569, 3,  'เสาเข็มหัวแตก',                   51108.10),
  (2569, 4,  'ตอกเอียง/เทสต์ไม่ผ่าน/ผิดหมุด',   47622.16),
  (2569, 5,  'พนักงานบริษัท',                   40865),
  (2569, 6,  'เสาเสียในสต๊อค',                  34270),
  (2569, 7,  'ผู้รับเหมา',                      30398.08),
  (2569, 8,  'สั่งผลิตผิด/ส่งผิด/ปรับปรุง',     28666.32),
  (2569, 9,  'เสาเข็มหายจากนับสต๊อค',           15005),
  (2569, 10, 'ปั้นจั่นลากหัก/ชน',               5988.79),
  (2569, 11, 'อื่นๆ',                           0),
  (2569, 12, 'ตอกสไลด์',                        0),
  (2569, 13, 'เสาเข็มบริษัทอื่น',               0);

-- ลูกค้า ปี 2569
insert into damage_customers (year, sort_order, customer_name, count) values
  (2569, 1,  'บจก.วิทวี',                  5),
  (2569, 2,  'คุณนงลักษณ์',                4),
  (2569, 3,  'บ.ดับบลิวเฮ้าส์',            4),
  (2569, 4,  'บจก.เคพีวาย',                2),
  (2569, 5,  'บจก.กาญจนเควต',              2),
  (2569, 6,  'บ้านพักอาศัย (คุณสนิท)',     2),
  (2569, 7,  'บจก.ไทยร็อคเฟอร์เทค',        2),
  (2569, 8,  'บจก.อาร์ตคอนกรีต',           2),
  (2569, 9,  'คุณติณน์',                   2),
  (2569, 10, 'บจก.ทีวายเค',                1),
  (2569, 11, 'บ.หอมศีล',                   1),
  (2569, 12, 'บจก.เหรียญทอง',              1),
  (2569, 13, 'บจก.ไอยราวาณิชย์',           1),
  (2569, 14, 'บ.ไทยมั่นคงพลาสติก',         1),
  (2569, 15, 'บจก.พีช พลัส พร็อพเพอร์ตี้',  1),
  (2569, 16, 'บจก.บุญโสฬส',                1),
  (2569, 17, 'บจก.เอรอส',                  1),
  (2569, 18, 'บจก.บีบี เอสเตท',            1),
  (2569, 19, 'บจก.ลิ้มพัฒนาดีซีเมนต์',     1),
  (2569, 20, 'เอริชเฮ้าส์',                1),
  (2569, 21, 'บจก.โกเด้นไพรซ์',            1);

-- ตรวจสอบ
select 'damage_yearly' t, count(*) from damage_yearly
union all select 'damage_monthly', count(*) from damage_monthly
union all select 'damage_causes', count(*) from damage_causes
union all select 'damage_customers', count(*) from damage_customers;
