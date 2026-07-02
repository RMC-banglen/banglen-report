-- ตารางรายงานเที่ยวรถขนส่ง (เทรลเลอร์ / 10 ล้อ-12 ล้อ)
CREATE TABLE IF NOT EXISTS transport_trips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  year int NOT NULL,
  month int NOT NULL,          -- 1-12
  vehicle_type text NOT NULL,  -- 'เทรลเลอร์' | '10ล้อ-12ล้อ'
  driver_name text NOT NULL,   -- ชื่อคนขับ/ทะเบียนรถ
  sort_order int NOT NULL DEFAULT 0,
  trips int NOT NULL DEFAULT 0,  -- จำนวนเที่ยว
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transport_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON transport_trips FOR ALL USING (true) WITH CHECK (true);
