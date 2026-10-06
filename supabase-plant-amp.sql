-- ค่าแอมป์เครื่องโม่ แพล้นปูน — ถ่ายรูปมิเตอร์ดิจิตอลจากหน้า plant.html (วันละหลายรอบ)
create table if not exists plant_amp_readings (
  id                 bigserial primary key,
  d                  date not null,                       -- วันที่โม่
  read_at            timestamptz not null default now(),  -- เวลาที่อ่าน (รอบที่โม่)
  formula            text,                                -- สูตรคอนกรีต เช่น NP315
  amp                numeric not null,                    -- ค่าแอมป์ที่อ่านได้
  water_l            numeric,                             -- น้ำที่เติม (ลิตร) ถ้าจดได้
  sand_moisture_pct  numeric,                             -- ความชื้นทรายตอนนั้น (ดึงจากผล QC ล่าสุดของวัน)
  note               text,
  created_at         timestamptz default now()
);
create index if not exists plant_amp_readings_d_idx on plant_amp_readings (d desc);
alter table plant_amp_readings enable row level security;
drop policy if exists "allow all" on plant_amp_readings;
create policy "allow all" on plant_amp_readings for all using (true) with check (true);

-- ช่วงแอมป์ปกติ (ตั้งจากแดชบอร์ด) — นอกช่วงนี้ส่งแจ้งเตือน Telegram เข้ากลุ่ม QC
create table if not exists plant_amp_spec (
  id          int primary key default 1,
  amp_min     numeric,
  amp_max     numeric,
  updated_at  timestamptz default now()
);
insert into plant_amp_spec (id) values (1) on conflict (id) do nothing;
alter table plant_amp_spec enable row level security;
drop policy if exists "allow all" on plant_amp_spec;
create policy "allow all" on plant_amp_spec for all using (true) with check (true);
