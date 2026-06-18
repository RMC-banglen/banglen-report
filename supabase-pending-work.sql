-- งานรอผลิต (บางเลน)
-- วาง SQL นี้ใน Supabase SQL Editor แล้วกด Run

create table if not exists pending_work (
  id           serial primary key,
  updated_date date not null,
  value_m3     numeric(10,2)
);

alter table pending_work disable row level security;

create index if not exists idx_pending_date on pending_work (updated_date desc);

-- ตรวจสอบ
select * from pending_work order by updated_date desc limit 5;
