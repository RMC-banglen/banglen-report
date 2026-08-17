-- ผลทดสอบขนาดคละหิน (Coarse Aggregate Gradation) — ASTM C33/C136
-- หิน 3/4" (No.67) และหิน 1" (No.57) ใช้ตารางเดียวกัน แยกด้วยคอลัมน์ stone_size
CREATE TABLE IF NOT EXISTS stone_gradation_tests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  test_date date NOT NULL,
  stone_size text NOT NULL,      -- '3/4″' หรือ '1″'
  stone_source text,             -- แหล่งหิน/ผู้ขาย
  w37_5 numeric DEFAULT 0,       -- น้ำหนักค้างตะแกรง 1-1/2" (37.5 mm) กรัม
  w25_0 numeric DEFAULT 0,       -- 1" (25.0 mm)
  w19_0 numeric DEFAULT 0,       -- 3/4" (19.0 mm)
  w12_5 numeric DEFAULT 0,       -- 1/2" (12.5 mm)
  w9_5  numeric DEFAULT 0,       -- 3/8" (9.5 mm)
  w4_75 numeric DEFAULT 0,       -- เบอร์ 4 (4.75 mm)
  w2_36 numeric DEFAULT 0,       -- เบอร์ 8 (2.36 mm)
  w_pan numeric DEFAULT 0,       -- ถาดล่าง (pan)
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE stone_gradation_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON stone_gradation_tests FOR ALL USING (true) WITH CHECK (true);
