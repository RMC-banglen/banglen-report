-- แจ้งซ่อม v2: ใบงาน PM ตามรอบ (ระบบเปิดใบงานเองจากรอบงานประจำของช่าง)
-- รันครั้งเดียวใน Supabase > SQL Editor (รันซ้ำได้ ไม่พัง)

-- kind: repair = แจ้งซ่อม (เครื่องเสีย) · pm = บำรุงรักษาตามรอบ (ระบบเปิดเองจาก "รอบงานประจำ")
alter table repair_requests add column if not exists kind text not null default 'repair';
-- PM: ผูกกับรายการใน calibration_items — ปิดใบงานแล้วอัปเดตวันที่ทำในรอบงานประจำให้เอง
alter table repair_requests add column if not exists pm_item_id text;

create index if not exists repair_requests_pm_idx on repair_requests (pm_item_id) where pm_item_id is not null;
create index if not exists repair_requests_asset_idx on repair_requests (asset_name);
