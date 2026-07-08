-- เพิ่มคอลัมน์ helper เก็บชื่อคนขับที่ไปช่วยขับรถสำรอง (บันทึกตอนนำเข้า Excel แล้วติ๊กขับรถสำรอง)
ALTER TABLE transport_trips ADD COLUMN IF NOT EXISTS helper text;
