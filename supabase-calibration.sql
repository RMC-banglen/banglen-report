-- ตารางงาน Calibration เครื่องมือ
CREATE TABLE IF NOT EXISTS calibration_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text DEFAULT 'เครื่องวัด',
  interval_type text DEFAULT 'month', -- 'day' | 'month' | 'year'
  interval_value int DEFAULT 12,
  last_cal_date date,
  next_cal_date date, -- คำนวณอัตโนมัติจาก last_cal_date + interval
  responsible text,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE calibration_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON calibration_items FOR ALL USING (true) WITH CHECK (true);
