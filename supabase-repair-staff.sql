-- แจ้งซ่อม: รายชื่อช่าง + หัวหน้าช่าง (ตั้งจากแดชบอร์ด แท็บแจ้งซ่อม)
-- รันครั้งเดียวใน Supabase > SQL Editor (รันซ้ำได้)
--   ช่าง (tech)  = รับงาน / บันทึกการซ่อม ได้
--   หัวหน้า (head) = ทำได้เหมือนช่าง + มอบหมายงาน + ถูก @แท็กใน Telegram ตอนงานค้างนาน
create table if not exists repair_staff (
  id          bigserial primary key,
  site        text not null default 'banglen',
  name        text not null,                 -- ชื่อที่ช่างเลือกในแอป (ต้องตรงกัน)
  role        text not null default 'tech',  -- tech / head
  telegram    text,                          -- ชื่อผู้ใช้ Telegram ไม่ต้องมี @ (ใช้แท็กหัวหน้า)
  active      boolean default true,
  sort_order  int default 0,
  unique (site, name)
);
alter table repair_staff enable row level security;
drop policy if exists "allow all" on repair_staff;
create policy "allow all" on repair_staff for all using (true) with check (true);

-- ใครเป็นคนมอบหมายงาน (หัวหน้า) — ว่าง = ช่างกดรับเอง
alter table repair_requests add column if not exists assigned_by text;
