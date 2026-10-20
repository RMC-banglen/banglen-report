-- ค่าแอมป์รอบที่ QC เก็บก้อนลูกปูน (ติ๊กจากหน้า plant.html หรือแดชบอร์ด) → ขึ้นเทียบกับกำลังอัดในกราฟ
-- รันครั้งเดียวใน Supabase > SQL Editor (รันซ้ำได้)
alter table plant_amp_readings add column if not exists for_cube boolean default false;
create index if not exists plant_amp_readings_cube_idx on plant_amp_readings (d) where for_cube;
