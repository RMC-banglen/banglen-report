-- ============================================================
-- แก้ปัญหา "new row violates row-level security policy"
--
-- ตาราง sand_silt_tests / sand_silt_spec เปิด RLS ไว้แต่ไม่มี policy
-- แอปจึงอ่านไม่เห็นและเขียนไม่ได้ ต้องเปิดสิทธิ์ให้เท่ากับตารางอื่นในระบบ
-- (แอปทุกตัวใช้ anon key ตัวเดียวกัน ไม่มีระบบล็อกอินฝั่งฐานข้อมูล)
--
-- รันใน Supabase → SQL Editor
-- ============================================================

alter table sand_silt_tests enable row level security;
alter table sand_silt_spec  enable row level security;

drop policy if exists sand_silt_tests_all on sand_silt_tests;
create policy sand_silt_tests_all on sand_silt_tests
  for all to anon, authenticated
  using (true) with check (true);

drop policy if exists sand_silt_spec_all on sand_silt_spec;
create policy sand_silt_spec_all on sand_silt_spec
  for all to anon, authenticated
  using (true) with check (true);

-- กันกรณีแถวค่าเกณฑ์ยังไม่ถูกสร้าง
insert into sand_silt_spec (id, max_pct) values (1, 3)
on conflict (id) do nothing;

-- ตรวจผล — ควรเห็น 1 แถว และ policy อย่างละ 1
select 'แถวค่าเกณฑ์' as รายการ, count(*)::text as ผล from sand_silt_spec
union all
select 'policy ที่มี', count(*)::text from pg_policies
 where tablename in ('sand_silt_tests','sand_silt_spec');
