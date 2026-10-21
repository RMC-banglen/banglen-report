-- หน้า "ติดตามรายการคำนวณเสาเข็ม" (pile-calc-request.html)
-- รันครั้งเดียวใน Supabase > SQL Editor (โปรเจกต์เดียวกับแดชบอร์ด) รันซ้ำได้ไม่พัง

-- 1) ตารางเก็บคำขอ (1 แถว = 1 งาน, ข้อมูลทั้งหมดอยู่ใน data)
create table if not exists pile_calc_requests (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now(),
  updated_by text
);
alter table pile_calc_requests enable row level security;
drop policy if exists "allow all" on pile_calc_requests;
create policy "allow all" on pile_calc_requests for all using (true) with check (true);
grant all on pile_calc_requests to anon, authenticated, service_role;

-- 2) ที่เก็บไฟล์ PDF จาก สย. (เปิดดูได้ทุกเครื่อง)
insert into storage.buckets (id, name, public)
values ('pile-calc-pdf', 'pile-calc-pdf', true)
on conflict (id) do nothing;
drop policy if exists "pile calc pdf all" on storage.objects;
create policy "pile calc pdf all" on storage.objects for all
  using (bucket_id = 'pile-calc-pdf') with check (bucket_id = 'pile-calc-pdf');

-- 3) สิทธิ์ใช้หน้า: ผู้ใช้ที่ไม่มีคีย์ pilecalc ใน tab_perms ถือว่าใช้ได้
--    ถ้าจะปิดสิทธิ์รายคน เช่น ผู้ใช้ id = 'xxx':
-- update worktrack_users set tab_perms = coalesce(tab_perms, '{}'::jsonb) || '{"pilecalc": false}' where id = 'xxx';
