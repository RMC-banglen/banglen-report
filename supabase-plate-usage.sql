-- ตารางการใช้แพผลิต (เทียบจำนวนแพที่ลงผลิตกับจำนวนแพที่มี) แบบกรอกยอดรวมรายเดือน
CREATE TABLE IF NOT EXISTS plate_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  year int NOT NULL,
  month int NOT NULL,          -- 1-12
  pile_type text NOT NULL,     -- เช่น 'I-18มอก.', 'I-26มอก.', 'S-18', 'I-30โรงงาน'
  plates_used numeric NOT NULL DEFAULT 0,   -- จำนวนแพที่ลงผลิตรวมทั้งเดือน (plate-day)
  production_days int NOT NULL DEFAULT 0,  -- จำนวนวันที่มีผลิตในเดือนนั้น
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(year, month, pile_type)
);

ALTER TABLE plate_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON plate_usage FOR ALL USING (true) WITH CHECK (true);
