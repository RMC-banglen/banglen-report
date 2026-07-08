-- บันทึกเหตุผลของวันที่ไม่มีเที่ยววิ่ง (เช่น หยุด, รถเสีย, ลา) ต่อคนขับ/วัน
CREATE TABLE IF NOT EXISTS transport_day_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  year int NOT NULL,
  month int NOT NULL,
  day int NOT NULL,
  vehicle_type text NOT NULL,
  driver_name text NOT NULL,
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(year, month, day, vehicle_type, driver_name)
);
ALTER TABLE transport_day_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON transport_day_notes FOR ALL USING (true) WITH CHECK (true);
