-- บันทึกเหตุผลการเพิ่มปูน (เมื่อต้องเพิ่มปูนนอกสูตรระหว่างผลิต)
CREATE TABLE IF NOT EXISTS cement_addition_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  add_date date NOT NULL,
  raft_num int,              -- แพผลิตที่เพิ่มปูน (1-18)
  reason text,               -- เหตุผลที่เพิ่มปูน
  pile_item text,            -- รายการเสา
  customer_name text,        -- ชื่อลูกค้า
  formula text,              -- สูตรปูนที่ใช้ (เช่น NP335, NP360)
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE cement_addition_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON cement_addition_log FOR ALL USING (true) WITH CHECK (true);

-- ถ้าเคยรันไฟล์นี้ไปแล้วก่อนหน้า (ตารางมีอยู่แล้วแต่ยังไม่มีคอลัมน์ formula)
-- ให้รันแค่บรรทัดนี้บรรทัดเดียวพอ:
ALTER TABLE cement_addition_log ADD COLUMN IF NOT EXISTS formula text;
