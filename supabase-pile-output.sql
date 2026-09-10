-- ============================================================
-- ยอดผลิต/ยอดขายเสาเข็ม แยกหน้าตัด+ความยาว (นำเข้าจากไฟล์ Excel รายงานยอดขาย-ผลิต)
-- ใช้เป็นตัวหารของ "อัตราเสาร้าว ต่อ 1,000 ต้นที่ผลิต"
-- ไฟล์ต้นทาง: ชีท "ผลิต" (ยอดรับสำเร็จรูป) และชีท "ขาย" (ยอดขาย)
--             คอลัมน์: รหัสสินค้า | ชื่อสินค้า | ยอด...
--
-- month = 1-12 คือไฟล์รายเดือน
-- month = 0    คือไฟล์ที่ครอบหลายเดือน (เช่นทั้งปี) ใช้เป็นตัวหารรวมเมื่อยังไม่มีรายเดือน
-- ============================================================

create table if not exists pile_output (
  id            bigserial primary key,
  year          int not null,            -- ปี พ.ศ. เช่น 2569
  month         int not null,            -- 1-12 = รายเดือน, 0 = ทั้งช่วงตามไฟล์
  sec           text not null,           -- หน้าตัด เช่น I-0.26
  len           numeric not null,        -- ความยาว (เมตร)
  produced_qty  numeric default 0,       -- ยอดผลิต (ยอดรับสำเร็จรูป)
  sold_qty      numeric default 0,       -- ยอดขาย
  range_text    text default '',         -- ช่วงวันที่ของรายงาน เช่น 01/01/2569 – 09/09/2569
  updated_at    timestamptz default now(),
  unique (year, month, sec, len)
);

create index if not exists pile_output_ym_idx on pile_output (year desc, month desc);

alter table pile_output enable row level security;

drop policy if exists "pile_output_all" on pile_output;
create policy "pile_output_all" on pile_output for all using (true) with check (true);
