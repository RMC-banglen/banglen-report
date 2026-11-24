-- ============================================================
-- ผลทดสอบขนาดคละทราย: ตรวจการชั่ง (ASTM C136 / AASHTO T27)
-- 1) w_sample  = น้ำหนักตัวอย่างแห้งก่อนร่อน (g) — ผลรวมหลังร่อน (ค้างทุกตะแกรง + ถาดล่าง) ต้องต่างจากค่านี้ไม่เกิน 0.3%
--                เกินแล้วผลนั้นใช้ตัดสินไม่ได้ ต้องทดสอบใหม่
-- 2) w_detail  = น้ำหนักรวม (ภาชนะ+ทราย) และน้ำหนักภาชนะเปล่าของแต่ละตะแกรง/ถาด ณ วันทดสอบ (เก็บไว้ย้อนดู)
--                ตัวเลขสุทธิ (หักภาชนะแล้ว) ยังอยู่ในคอลัมน์ w9_5 … w_pan เหมือนเดิม กราฟต่าง ๆ ไม่เปลี่ยน
-- 3) sieve_tare / sieve_tare_at = น้ำหนักภาชนะเปล่าที่ตั้งไว้ (ใช้ร่วมกันทุกเครื่อง) + วันที่ตั้งล่าสุด
-- รันครั้งเดียวใน Supabase SQL Editor (รันซ้ำได้ ไม่ซ้อน) — ผลทดสอบเก่าจะเป็นค่าว่าง (ตรวจย้อนหลังไม่ได้)
-- ============================================================
alter table sand_fm_tests add column if not exists w_sample numeric;
alter table sand_fm_tests add column if not exists w_detail jsonb;
alter table sand_silt_spec add column if not exists sieve_tare jsonb;
alter table sand_silt_spec add column if not exists sieve_tare_at timestamptz;
comment on column sand_fm_tests.w_sample is 'น้ำหนักตัวอย่างแห้งก่อนร่อน (g) — ใช้ตรวจการสูญหายตอนร่อน ≤ 0.3%';
