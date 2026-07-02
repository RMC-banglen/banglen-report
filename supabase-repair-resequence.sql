-- รีเซ็ต sort_order ใหม่ทั้งหมดให้เป็นเลขเรียงต่อกัน (1,2,3,...) แยกตามหมวด
-- แก้ปัญหาลำดับซ้ำ/สลับกันจากการทดสอบหลายรอบ
WITH ranked AS (
  SELECT section, line_item,
    ROW_NUMBER() OVER (PARTITION BY section ORDER BY MIN(sort_order), line_item) AS rn
  FROM repair_line_items
  GROUP BY section, line_item
)
UPDATE repair_line_items r
SET sort_order = ranked.rn
FROM ranked
WHERE r.section = ranked.section AND r.line_item = ranked.line_item;
