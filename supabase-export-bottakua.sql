-- รันคำสั่งนี้ใน Supabase SQL Editor (ของบางเลน) เพื่อสร้างชุดคำสั่ง INSERT ของข้อมูล "ซ่อมบ่อตะกั่ว" ทั้งหมด
-- ผลลัพธ์จะออกมาเป็น "แถวเดียว" (ช่อง sql_script) รวมทุกคำสั่งไว้ในที่เดียว
-- วิธีคัดลอก: คลิกที่ช่องผลลัพธ์ในตาราง (cell) แล้วกด Ctrl+A แล้ว Ctrl+C เพื่อคัดลอกข้อความทั้งหมดในช่องนั้น
-- (หรือดับเบิลคลิกที่ cell เพื่อเปิดดูข้อความเต็ม แล้วกดปุ่ม copy ที่ Supabase มีให้)
-- แล้วนำไปวางรันในโปรเจกต์ Supabase ของอีกสาขาได้เลย
-- (ต้องมีตาราง repair_line_items อยู่แล้วในปลายทาง ถ้ายังไม่มีให้รัน supabase-repair-line-items.sql ก่อน)

SELECT string_agg(
  'INSERT INTO repair_line_items (year, month, section, line_item, sort_order, amount) VALUES (' ||
  year || ',' || month || ',' ||
  quote_literal(section) || ',' ||
  quote_literal(line_item) || ',' ||
  sort_order || ',' ||
  amount ||
  ');',
  E'\n' ORDER BY year, section, sort_order, line_item, month
) AS sql_script
FROM repair_line_items
WHERE section IN ('เครื่องจักรบ่อตะกั่ว', 'เครนรถบ่อตะกั่ว', 'ซ่อมรถบ่อตะกั่ว');
