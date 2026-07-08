-- จำนวนวันทำงานของรถขนส่งในแต่ละเดือน (ใช้หารหาค่าเฉลี่ยเที่ยว/คัน/วัน) แก้ไขได้จากหน้าเว็บ
CREATE TABLE IF NOT EXISTS transport_workdays (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  year int NOT NULL,
  month int NOT NULL,
  days int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(year, month)
);
ALTER TABLE transport_workdays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON transport_workdays FOR ALL USING (true) WITH CHECK (true);

-- วันทำงานปี 2569 ตามตาราง "รายการขนส่ง (บางเลน) ปี 69"
INSERT INTO transport_workdays (year, month, days) VALUES
(2569, 1, 27),
(2569, 2, 28),
(2569, 3, 31),
(2569, 4, 23),
(2569, 5, 31),
(2569, 6, 30),
(2569, 7, 31),
(2569, 8, 31),
(2569, 9, 30),
(2569, 10, 31),
(2569, 11, 30),
(2569, 12, 28)
ON CONFLICT (year, month) DO UPDATE SET days = EXCLUDED.days;
