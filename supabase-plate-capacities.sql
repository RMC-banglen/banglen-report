-- จำนวนแพที่มีของแต่ละรุ่นเสาเข็ม (แก้ไขได้ผ่านหน้าเว็บ) ถ้าไม่มีแถวในตารางนี้ จะใช้ค่าเริ่มต้นในโค้ด
CREATE TABLE IF NOT EXISTS plate_capacities (
  pile_type text PRIMARY KEY,
  cap numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE plate_capacities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON plate_capacities FOR ALL USING (true) WITH CHECK (true);
