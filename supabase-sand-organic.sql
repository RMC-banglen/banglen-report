-- ============================================================
-- ทดสอบสารอินทรีย์เจือปนในทราย (ASTM C40 — colorimetric)
--
-- วิธี: แช่ทรายในสารละลาย NaOH 3% ทิ้งไว้ 24 ชม. แล้วดูสีของน้ำ
--       น้ำยิ่งเข้ม/คล้ำ = มีสารอินทรีย์มาก
--
-- ที่นี่ไม่ได้ตัดสินผ่าน/ไม่ผ่านตามมาตรฐาน เพราะการอ่านสีจากภาพถ่าย
-- ขึ้นกับแสงและกล้อง ใช้เป็นเครื่องมือบันทึกและเฝ้าดูแนวโน้มแทน
-- ถ้าวันไหนสีเข้มผิดปกติจะเตือนให้ไปตรวจซ้ำด้วยแผ่นเทียบสีจริง
--
-- ค่าสีเก็บเป็น RGB ที่ปรับสมดุลขาวแล้ว (ใช้กระดาษขาวในรูปเป็นตัวอ้างอิง)
-- จึงเทียบข้ามวัน/ข้ามสภาพแสงกันได้
--
-- รันใน Supabase → SQL Editor
-- ============================================================

create table if not exists sand_organic_tests (
  id           bigserial primary key,
  test_date    date not null,
  sand_source  text default '',
  color_r      int,            -- สีของน้ำหลังปรับสมดุลขาว 0-255
  color_g      int,
  color_b      int,
  color_index  numeric,        -- ดัชนีความเข้ม 0-100 (ยิ่งสูง = ยิ่งเข้ม/เหลืองน้ำตาล)
  image_url    text,
  note         text default '',
  created_at   timestamptz default now()
);

create index if not exists sand_organic_tests_date_idx on sand_organic_tests (test_date desc);

alter table sand_organic_tests enable row level security;
drop policy if exists sand_organic_tests_all on sand_organic_tests;
create policy sand_organic_tests_all on sand_organic_tests
  for all to anon, authenticated using (true) with check (true);

-- เกณฑ์เตือน (ไม่ใช่เกณฑ์มาตรฐาน — เป็นค่าที่โรงงานตั้งเองจากประสบการณ์)
alter table sand_silt_spec
  add column if not exists organic_warn_index numeric not null default 35;

insert into sand_silt_spec (id) values (1) on conflict (id) do nothing;

select 'sand_organic_tests' as ตาราง, count(*)::text as จำนวนแถว from sand_organic_tests
union all
select 'เกณฑ์เตือนสารอินทรีย์', organic_warn_index::text from sand_silt_spec where id = 1;
