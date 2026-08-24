-- เก็บสถานะหน้า "สต็อกวัตถุดิบเสาเข็ม" (pile-materials.html) เป็นออนไลน์ล้วนบน Supabase
-- (โปรเจกต์เดียวกับระบบหลัก) เหมือนข้อมูลส่วนอื่นของระบบ ไม่ใช้ localStorage แล้ว

create table if not exists pile_materials_state (
  id text primary key default 'default',  -- ใช้แถวเดียว id='default' เก็บสถานะทั้งหมด (เหมือน localStorage เดิม)
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table pile_materials_state enable row level security;
create policy "allow all" on pile_materials_state for all using (true) with check (true);
