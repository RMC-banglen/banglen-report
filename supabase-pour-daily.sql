-- ============================================================
-- รายงานการผลิต–เวลาเทเสร็จ (รายวัน)
-- กรอกจากหน้าแดชบอร์ด แท็บ "ภาพรวมการผลิต"
-- ============================================================

create table if not exists pour_daily (
  id             bigserial primary key,
  d              date not null unique,      -- วันที่ผลิต
  raft_order     numeric default 0,         -- รวมแพสั่งผลิต (แพ)
  raft_produced  numeric default 0,         -- รวมแพผลิต (แพ)
  raft_cancel    numeric default 0,         -- รวมแพ ยกเลิก/ค้างเท (แพ)
  volume_m3      numeric default 0,         -- คิวผลิต (m³)
  finish_time    text default '',           -- เวลาเทเสร็จ เช่น 16:59
  note           text default '',           -- รายงานการผลิตที่ไม่เป็นไปตามกำหนด
  updated_at     timestamptz default now()
);

create index if not exists pour_daily_d_idx on pour_daily (d desc);

alter table pour_daily enable row level security;

drop policy if exists "pour_daily_all" on pour_daily;
create policy "pour_daily_all" on pour_daily for all using (true) with check (true);
