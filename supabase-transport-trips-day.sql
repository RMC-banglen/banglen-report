-- เพิ่มคอลัมน์ day เพื่อรองรับการบันทึกเที่ยวรถรายวัน (1-31)
-- แถวที่ day เป็น NULL = ยอดรวมทั้งเดือนที่กรอกไว้เดิม, แถวที่มี day = ยอดของวันนั้นๆ
ALTER TABLE transport_trips ADD COLUMN IF NOT EXISTS day int;
