-- เพิ่ม column รายการเสาเข็มในตาราง quality_reports
ALTER TABLE quality_reports ADD COLUMN IF NOT EXISTS pile_spec text;
ALTER TABLE quality_reports ADD COLUMN IF NOT EXISTS pile_qty int;
