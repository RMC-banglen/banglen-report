-- ============================================================
-- ยอดส่ง/ยอดขายเสาเข็ม แยกตามหน้าตัด+ความยาว (นำเข้าจากไฟล์ Excel รายงานยอดขาย)
-- ใช้เป็นตัวหารหา "% เสียหายต่อยอดส่ง" ในแท็บวิเคราะห์ขนาดเสา
-- ไฟล์ต้นทาง: รายงานยอดขาย/ผลิต ชีท "ขาย" คอลัมน์ รหัสสินค้า | ชื่อสินค้า | ยอดขาย
-- ============================================================

create table if not exists pile_shipped (
  id          bigserial primary key,
  year        int not null,            -- ปี พ.ศ. ของรายงาน เช่น 2569
  sec         text not null,           -- หน้าตัด เช่น I-0.26
  len         numeric not null,        -- ความยาว (เมตร)
  qty         numeric not null,        -- จำนวนต้นที่ส่ง/ขาย
  range_text  text default '',         -- ช่วงวันที่ของรายงาน เช่น 01/01/2569 - 09/09/2569
  updated_at  timestamptz default now(),
  unique (year, sec, len)
);

create index if not exists pile_shipped_year_idx on pile_shipped (year desc);

alter table pile_shipped enable row level security;

drop policy if exists "pile_shipped_all" on pile_shipped;
create policy "pile_shipped_all" on pile_shipped for all using (true) with check (true);
