-- เช็คว่ามีแถวเที่ยวรถที่ vehicle_type ไม่ใช่ "เทรลเลอร์" หรือ "10ล้อ-12ล้อ" ตกค้างอยู่ไหม
-- (เกิดจากบั๊กเก่าที่แยกชื่อ/ประเภทรถผิดตอนนำเข้า Excel)
SELECT vehicle_type, driver_name, year, month, day, trips, note
FROM transport_trips
WHERE vehicle_type NOT IN ('เทรลเลอร์','10ล้อ-12ล้อ')
ORDER BY year, month, day;

-- ถ้าเจอแถวตกค้าง ให้ลบทิ้งด้วยคำสั่งนี้ (ลบทั้งหมดที่ไม่ใช่ 2 ประเภทที่ถูกต้อง)
-- DELETE FROM transport_trips WHERE vehicle_type NOT IN ('เทรลเลอร์','10ล้อ-12ล้อ');
