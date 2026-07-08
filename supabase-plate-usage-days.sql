-- จำนวนวันที่มีผลิตในแต่ละเดือน (ใช้ร่วมกันทุกรุ่นแพ ไม่ต้องกรอกแยกทีละแพ)
CREATE TABLE IF NOT EXISTS plate_usage_days (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  year int NOT NULL,
  month int NOT NULL,
  production_days int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(year, month)
);
ALTER TABLE plate_usage_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON plate_usage_days FOR ALL USING (true) WITH CHECK (true);

-- ไม่ต้องใช้คอลัมน์ production_days ในตาราง plate_usage อีกต่อไป (เก็บไว้เผื่อ แต่ไม่ได้ใช้แล้ว)
