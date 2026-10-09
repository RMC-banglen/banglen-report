-- ระบบแจ้งซ่อมเครื่องจักร/รถ (หน้า repair.html) — ทุกฝ่ายแจ้ง → เตือนช่างใน Telegram → ช่างบันทึกงาน → ผู้แจ้งยืนยันปิดงาน
-- รันครั้งเดียวใน Supabase > SQL Editor

-- รายชื่อเครื่องจักร/รถ ที่แจ้งซ่อมได้ (แก้/เพิ่มได้จากแดชบอร์ด)
create table if not exists repair_assets (
  id          bigserial primary key,
  site        text not null default 'banglen',
  name        text not null,
  category    text,                    -- เครน / รถไฟ / เครื่องจักร / รถในโรงงาน / รถขนส่ง
  active      boolean default true,
  sort_order  int default 0,
  unique (site, name)
);

-- ใบแจ้งซ่อม 1 แถว = 1 งาน
create table if not exists repair_requests (
  id              bigserial primary key,
  ticket_no       text unique,          -- MR-6910-001 (ตั้งให้อัตโนมัติ)
  site            text not null default 'banglen',
  asset_name      text not null,
  asset_category  text,
  urgency         text not null default 'abnormal',   -- stop = เครื่องหยุด / abnormal = ผิดปกติแต่ยังเดินได้ / normal = ไม่ด่วน
  symptom         text,
  reporter_name   text,
  reporter_dept   text,
  photos          jsonb default '[]',
  status          text not null default 'open',       -- open / accepted / in_progress / waiting_parts / done / closed / cancelled
  reported_at     timestamptz not null default now(),
  accepted_at     timestamptz,
  started_at      timestamptz,
  done_at         timestamptz,
  closed_at       timestamptz,
  waiting_since   timestamptz,                         -- เริ่มรออะไหล่
  waiting_minutes int default 0,                       -- รวมเวลารออะไหล่ (นาที)
  technician      text,
  helpers         text,
  cause           text,                                -- หมวดสาเหตุ
  work_done       text,
  parts           jsonb default '[]',                  -- [{name, qty, price}]
  parts_cost      numeric default 0,
  vendor          text,
  vendor_cost     numeric default 0,
  after_photos    jsonb default '[]',
  reopen_count    int default 0,
  close_note      text,
  closed_by       text,
  last_alert_at   timestamptz,                         -- เตือนงานค้างล่าสุด (Apps Script)
  alert_count     int default 0,
  updated_at      timestamptz default now()
);
create index if not exists repair_requests_status_idx on repair_requests (status);
create index if not exists repair_requests_reported_idx on repair_requests (reported_at desc);

-- ประวัติการเปลี่ยนสถานะ (ใครทำอะไร เมื่อไหร่)
create table if not exists repair_events (
  id          bigserial primary key,
  request_id  bigint references repair_requests(id) on delete cascade,
  at          timestamptz default now(),
  actor       text,
  action      text,
  note        text
);
create index if not exists repair_events_req_idx on repair_events (request_id);

-- เลขใบงาน MR-ปปดด-ลำดับ (ปี พ.ศ. 2 หลัก)
create or replace function repair_ticket_no() returns trigger as $$
declare ym text; n int;
begin
  ym := lpad((((extract(year from (now() at time zone 'Asia/Bangkok'))::int + 543) % 100))::text, 2, '0')
        || to_char(now() at time zone 'Asia/Bangkok', 'MM');
  select count(*) + 1 into n from repair_requests where ticket_no like 'MR-' || ym || '-%';
  new.ticket_no := 'MR-' || ym || '-' || lpad(n::text, 3, '0');
  return new;
end $$ language plpgsql;
drop trigger if exists repair_ticket_no_trg on repair_requests;
create trigger repair_ticket_no_trg before insert on repair_requests
  for each row when (new.ticket_no is null) execute function repair_ticket_no();

alter table repair_assets enable row level security;
alter table repair_requests enable row level security;
alter table repair_events enable row level security;
drop policy if exists "allow all" on repair_assets;
drop policy if exists "allow all" on repair_requests;
drop policy if exists "allow all" on repair_events;
create policy "allow all" on repair_assets for all using (true) with check (true);
create policy "allow all" on repair_requests for all using (true) with check (true);
create policy "allow all" on repair_events for all using (true) with check (true);

-- ที่เก็บรูปถ่าย (ก่อน/หลังซ่อม) — ย่อรูปก่อนอัปโหลด ~150KB/รูป
insert into storage.buckets (id, name, public) values ('repair-photos', 'repair-photos', true)
  on conflict (id) do nothing;
drop policy if exists "repair photos read" on storage.objects;
drop policy if exists "repair photos upload" on storage.objects;
create policy "repair photos read" on storage.objects for select using (bucket_id = 'repair-photos');
create policy "repair photos upload" on storage.objects for insert with check (bucket_id = 'repair-photos');

-- รายชื่อเริ่มต้น (บางเลน) — ตามไฟล์ "เวลาเสียเครื่องจักร-รถ"
insert into repair_assets (site, name, category, sort_order) values
  ('banglen','เครนเบอร์1','เครน',1),('banglen','เครนเบอร์2','เครน',2),('banglen','เครนเบอร์3','เครน',3),
  ('banglen','เครนเบอร์4','เครน',4),('banglen','เครนเบอร์5','เครน',5),('banglen','เครนเบอร์6','เครน',6),
  ('banglen','เครนเบอร์7','เครน',7),('banglen','เครนเบอร์8','เครน',8),('banglen','เครนเบอร์9','เครน',9),
  ('banglen','เครนเบอร์10','เครน',10),
  ('banglen','รถไฟขนเสาเบอร์1','รถไฟ',20),('banglen','รถไฟขนเสาเบอร์2','รถไฟ',21),('banglen','รถไฟขนคอนกรีต','รถไฟ',22),
  ('banglen','แพล้น','เครื่องจักร',30),('banglen','เครื่องปั่นแหวน','เครื่องจักร',31),('banglen','เครื่องอัดแหวน','เครื่องจักร',32),
  ('banglen','เครื่องดึงลวด','เครื่องจักร',33),('banglen','เครื่องตัดพลาสม่า','เครื่องจักร',34),('banglen','เครื่องจี้คอนกรีต','เครื่องจักร',35),
  ('banglen','รถตัก','รถในโรงงาน',40),('banglen','รถโฟล์คลิฟท์','รถในโรงงาน',41),('banglen','รถในโรงงาน (อื่นๆ)','รถในโรงงาน',42),
  ('banglen','89-8038 (จา)','รถขนส่ง',50),('banglen','88-9923 (ฉลอง)','รถขนส่ง',51),('banglen','89-1445 (เภิก)','รถขนส่ง',52),
  ('banglen','89-9768 (ตึ๋ง)','รถขนส่ง',53),('banglen','90-4551 (ฐา)','รถขนส่ง',54),('banglen','88-7959 (อาร์ม)','รถขนส่ง',55),
  ('banglen','90-5185 (นุ)','รถขนส่ง',56),('banglen','89-6259 (อั๋น)','รถขนส่ง',57),('banglen','87-5101 (หนึ่ง)','รถขนส่ง',58),
  ('banglen','90-3585','รถขนส่ง',59),
  ('banglen','เครนรถ จา','เครนรถขนส่ง',70),('banglen','เครนรถ ฉลอง','เครนรถขนส่ง',71),('banglen','เครนรถ หนึ่ง','เครนรถขนส่ง',72),
  ('banglen','เครนรถ ตึ๋ง','เครนรถขนส่ง',73),('banglen','เครนรถ ฐา','เครนรถขนส่ง',74),('banglen','เครนรถ อาร์ม','เครนรถขนส่ง',75),
  ('banglen','เครนรถ นุ','เครนรถขนส่ง',76),('banglen','เครนรถ อั๋น','เครนรถขนส่ง',77)
on conflict (site, name) do nothing;
