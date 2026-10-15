-- แจ้งซ่อม: สถานะ "ส่งซ่อมนอก" (ช่างซ่อมเองไม่ได้ → ส่งร้านภายนอก)
-- รันครั้งเดียวใน Supabase > SQL Editor (รันซ้ำได้)
alter table repair_requests add column if not exists outsource_vendor   text;         -- ร้าน/อู่ที่ส่งซ่อม
alter table repair_requests add column if not exists outsource_sent_at  timestamptz;  -- ส่งเมื่อ
alter table repair_requests add column if not exists outsource_eta      date;         -- คาดว่าเสร็จ (เลยกำหนด → เตือนในกลุ่มช่าง)
alter table repair_requests add column if not exists outsource_est      numeric;      -- ราคาประเมิน
alter table repair_requests add column if not exists outsource_note     text;
