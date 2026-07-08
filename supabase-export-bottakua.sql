-- รันคำสั่งนี้ใน Supabase SQL Editor (ของบางเลน) เพื่อสร้างชุดคำสั่ง INSERT ของข้อมูล "ซ่อมบ่อตะกั่ว" ทั้งหมด
-- ผลลัพธ์ที่ได้ (คอลัมน์ sql_line) ให้คัดลอกทุกแถวไปวางรันในโปรเจกต์ Supabase ของอีกสาขาได้เลย
-- (ต้องมีตาราง repair_line_items อยู่แล้วในปลายทาง ถ้ายังไม่มีให้รัน supabase-repair-line-items.sql ก่อน)

SELECT
  'INSERT INTO repair_line_items (year, month, section, line_item, sort_order, amount) VALUES (' ||
  year || ',' || month || ',' ||
  quote_literal(section) || ',' ||
  quote_literal(line_item) || ',' ||
  sort_order || ',' ||
  amount ||
  ');' AS sql_line
FROM repair_line_items
WHERE section IN ('เครื่องจักรบ่อตะกั่ว', 'เครนรถบ่อตะกั่ว', 'ซ่อมรถบ่อตะกั่ว')
ORDER BY year, section, sort_order, line_item, month;
