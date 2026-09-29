-- ฐานข้อมูลหลักงานขนส่ง: รถ / คนขับ / การจับคู่คนขับประจำรถ (มีช่วงวันที่ เก็บประวัติได้)

-- รถ: ทะเบียน (รถนอกที่ไม่มีทะเบียน เช่น รถร่วม/รับเอง/รถบ่อตะกั่ว ใช้ชื่อเรียกแทน)
CREATE TABLE IF NOT EXISTS transport_vehicles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plate text NOT NULL UNIQUE,
  vehicle_type text NOT NULL,              -- 'เทรลเลอร์' | '10ล้อ-12ล้อ'
  label text,                              -- ชื่อเรียกเพิ่มเติม เช่น 'สำรอง 12 ล้อ'
  is_company boolean NOT NULL DEFAULT true, -- false = รถนอก (รถร่วม/รับเอง/บ่อตะกั่ว)
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- คนขับ: aliases = ชื่อที่ปรากฏในไฟล์บิล คั่นด้วยจุลภาค ใช้จับคู่ตอนนำเข้า
CREATE TABLE IF NOT EXISTS transport_drivers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  aliases text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- จับคู่คนขับประจำรถ: end_date ว่าง = ยังขับอยู่
CREATE TABLE IF NOT EXISTS transport_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid NOT NULL REFERENCES transport_drivers(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES transport_vehicles(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON transport_vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON transport_drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON transport_assignments FOR ALL USING (true) WITH CHECK (true);
