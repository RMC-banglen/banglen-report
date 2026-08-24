-- เก็บสถานะหน้า "สต็อกวัตถุดิบเสาเข็ม" (pile-materials.html) แทน localStorage
-- เดิมข้อมูลอยู่แค่ในเบราว์เซอร์เครื่องเดียว (localStorage) พอเปิดจากเครื่อง/เบราว์เซอร์อื่นหรือล้างแคชแล้วข้อมูลหาย
-- ย้ายมาเก็บเป็นก้อน JSON เดียวใน Supabase (โปรเจกต์เดียวกับระบบหลัก) ให้ sync ข้ามเครื่องได้และไม่หาย

create table if not exists pile_materials_state (
  id text primary key default 'default',  -- ใช้แถวเดียว id='default' เก็บสถานะทั้งหมด (เหมือน localStorage เดิม)
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table pile_materials_state enable row level security;
create policy "allow all" on pile_materials_state for all using (true) with check (true);
