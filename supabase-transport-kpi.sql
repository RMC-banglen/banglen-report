-- เป้า KPI การซ่อมรถขนส่ง (ต่อปี) ใช้ในหน้า "หยุดวิ่ง" และ Dashboard
CREATE TABLE IF NOT EXISTS transport_kpi (
  year int PRIMARY KEY,                          -- พ.ศ.
  avail_target numeric NOT NULL DEFAULT 95,      -- % รถพร้อมใช้งาน ขั้นต่ำ
  crane_target numeric NOT NULL DEFAULT 2,       -- ซ่อมเครน ไม่เกิน (วัน/คัน/เดือน)
  repair_target numeric NOT NULL DEFAULT 1,      -- ซ่อมรถ ไม่เกิน (วัน/คัน/เดือน)
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE transport_kpi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON transport_kpi FOR ALL USING (true) WITH CHECK (true);
