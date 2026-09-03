-- ============================================================
-- เก็บ "รายการสินค้า" และ "จำนวน" ของแต่ละแถวเสียหาย
-- เช่น "เสาเข็ม I-0.30 x 11.00 เมตร ท่อนเชื่อม" จำนวน 2 ต้น
-- ============================================================
alter table damage_items
  add column if not exists product_name text;

alter table damage_items
  add column if not exists qty numeric;
