-- ============================================================
-- ตัวเลขรายเดือนที่กรอกจากแดชบอร์ด
--
-- เดิมต้องไปพิมพ์ในชีท Google ทีละช่อง แล้วชีทค่อย sync ขึ้นมา
-- คนกรอกต้องเปิดสองที่ ลืมที่ใดที่หนึ่งตัวเลขก็ไม่ตรงกัน
--
-- ตารางนี้เก็บเฉพาะ "ค่าที่คนกรอก" ไม่เก็บค่าที่คำนวณได้เอง
--   % ผลิต · ส่วนต่างสต็อค · เฉลี่ยคิว/วัน  -> ชีทคำนวณให้เหมือนเดิม
--   แพสั่ง · แพผลิต · แพค้าง · วันผลิต      -> มาจากรายงานรายวัน (pour_daily)
--
-- ปี เก็บเป็น พ.ศ. ให้ตรงกับชีทและหน้าจอ
--
-- รันใน Supabase -> SQL Editor
-- ============================================================

create table if not exists monthly_input (
  year        int not null,            -- พ.ศ. เช่น 2569
  month       int not null,            -- 1-12
  order_qty   numeric,                 -- คิวสั่งผลิต
  produced    numeric,                 -- คิวผลิตจริง
  transport   numeric,                 -- คิวขนส่ง
  stock       numeric,                 -- สต็อคคงเหลือ
  updated_at  timestamptz default now(),
  updated_by  text,
  primary key (year, month)
);

alter table monthly_input enable row level security;

drop policy if exists "monthly_input_all" on monthly_input;
create policy "monthly_input_all" on monthly_input for all using (true) with check (true);

select * from monthly_input order by year desc, month desc;
