-- ============================================================
-- ระบบงาน QC เสาเข็มคอนกรีตอัดแรง
--   1) ระบบตรวจสอบก่อนผลิต          (form_type = 'pre')
--   2) ระบบตรวจสอบหลังผลิต มอก.396-2549 (form_type = 'post')
-- หน้ากรอก: qc.html?u=<code>  ·  แดชบอร์ด: แท็บ "งาน QC" ในระบบหลัก
-- ============================================================

-- ---------- พนักงาน QC ----------
create table if not exists qc_inspectors (
  code       text primary key,          -- ใช้ในลิงก์ เช่น phai / kon / earth
  name       text not null,
  active     boolean default true,
  sort_order int default 0
);

insert into qc_inspectors (code,name,sort_order) values
  ('phai','ไผ่',1), ('kon','กอน',2), ('earth','เอิร์ธ',3)
on conflict (code) do nothing;

-- ---------- หัวข้อในฟอร์มตรวจ (แก้ไข/เพิ่ม/ลบได้จากแดชบอร์ด) ----------
-- kind: 'yn'  = ผ่าน/ไม่ผ่าน/ไม่เกี่ยว
--       'num' = กรอกค่าที่วัดได้ แล้วตัดสินด้วย min_val/max_val
create table if not exists qc_checklist (
  id         bigserial primary key,
  form_type  text not null check (form_type in ('pre','post')),
  section    text not null default '',   -- หัวข้อกลุ่ม เช่น แบบหล่อ / มิติ
  label      text not null,              -- ข้อความรายการตรวจ
  kind       text not null default 'yn' check (kind in ('yn','num')),
  unit       text default '',            -- หน่วยของค่าที่วัด เช่น มม. / ซม. / °C
  min_val    numeric,                    -- เกณฑ์ต่ำสุด (ว่าง = ไม่กำหนด)
  max_val    numeric,                    -- เกณฑ์สูงสุด (ว่าง = ไม่กำหนด)
  spec_text  text default '',            -- อธิบายเกณฑ์ให้คนตรวจอ่าน
  active     boolean default true,
  sort_order int default 0
);

create index if not exists qc_checklist_form_idx on qc_checklist (form_type, sort_order);

-- ---------- ใบตรวจ ----------
create table if not exists qc_checks (
  id             bigserial primary key,
  form_type      text not null check (form_type in ('pre','post')),
  inspector_code text not null,
  check_date     date not null,
  bed_no         text default '',        -- แพ/เบดที่ตรวจ (ฟอร์มก่อนผลิต)
  lot_no         text default '',        -- ล็อต/เลขที่ผลิต (ฟอร์มหลังผลิต)
  pile_spec      text default '',        -- ขนาดเสา เช่น I-0.26 x 12.00 ม.
  qty            numeric default 0,      -- จำนวนต้นที่ตรวจ
  result         text not null default 'pass' check (result in ('pass','fail')),
  fail_count     int default 0,          -- จำนวนหัวข้อที่ไม่ผ่าน
  note           text default '',
  created_at     timestamptz default now()
);

create index if not exists qc_checks_date_idx on qc_checks (check_date desc);
create index if not exists qc_checks_who_idx  on qc_checks (inspector_code, check_date desc);

-- ---------- ผลรายหัวข้อของแต่ละใบ ----------
-- เก็บ label ซ้ำไว้ด้วย เพื่อให้ใบเก่ายังอ่านรู้เรื่องแม้ภายหลังจะแก้/ลบหัวข้อในเช็คลิสต์
create table if not exists qc_check_items (
  id         bigserial primary key,
  check_id   bigint not null references qc_checks(id) on delete cascade,
  item_id    bigint,
  label      text not null,
  section    text default '',
  kind       text default 'yn',
  value_yn   text,                       -- pass / fail / na
  value_num  numeric,
  unit       text default '',
  ok         boolean,                    -- ผลตัดสินสุดท้ายของหัวข้อนี้
  note       text default ''
);

create index if not exists qc_check_items_check_idx on qc_check_items (check_id);

-- ---------- รูปแนบ ----------
create table if not exists qc_check_images (
  id        bigserial primary key,
  check_id  bigint not null references qc_checks(id) on delete cascade,
  item_id   bigint,                      -- ว่าง = รูปรวมของใบตรวจ
  image_url text not null,
  created_at timestamptz default now()
);

create index if not exists qc_check_images_check_idx on qc_check_images (check_id);

-- ---------- สิทธิ์ ----------
alter table qc_inspectors   enable row level security;
alter table qc_checklist    enable row level security;
alter table qc_checks       enable row level security;
alter table qc_check_items  enable row level security;
alter table qc_check_images enable row level security;

drop policy if exists "qc_inspectors_all"   on qc_inspectors;
drop policy if exists "qc_checklist_all"    on qc_checklist;
drop policy if exists "qc_checks_all"       on qc_checks;
drop policy if exists "qc_check_items_all"  on qc_check_items;
drop policy if exists "qc_check_images_all" on qc_check_images;

create policy "qc_inspectors_all"   on qc_inspectors   for all using (true) with check (true);
create policy "qc_checklist_all"    on qc_checklist    for all using (true) with check (true);
create policy "qc_checks_all"       on qc_checks       for all using (true) with check (true);
create policy "qc_check_items_all"  on qc_check_items  for all using (true) with check (true);
create policy "qc_check_images_all" on qc_check_images for all using (true) with check (true);

-- ============================================================
-- หัวข้อตรวจตั้งต้น (ร่าง — แก้/เพิ่ม/ลบได้จากแดชบอร์ดภายหลัง)
-- ============================================================
insert into qc_checklist (form_type,section,label,kind,unit,min_val,max_val,spec_text,sort_order)
select * from (values
  -- ===== ก่อนผลิต (มอก.396-2549) =====
  ('pre','วัสดุ (มอก.396-2549)','ปูนซีเมนต์ตรงตามมาตรฐาน มีใบรับรองผลทดสอบ','yn','',null::numeric,null::numeric,'',1),
  ('pre','วัสดุ (มอก.396-2549)','หินและทรายสะอาด ขนาดคละตามกำหนด ไม่มีสิ่งเจือปน','yn','',null,null,'',2),
  ('pre','วัสดุ (มอก.396-2549)','น้ำที่ใช้ผสมสะอาด ไม่มีสารที่เป็นอันตรายต่อคอนกรีต','yn','',null,null,'',3),
  ('pre','วัสดุ (มอก.396-2549)','ลวดเหล็กกล้าอัดแรง (PC wire) ตรงตามมาตรฐาน มีใบรับรอง','yn','',null,null,'',4),
  ('pre','วัสดุ (มอก.396-2549)','เหล็กเสริม/ลวดปลอก ตรงตามมาตรฐาน ไม่เป็นสนิมขุม','yn','',null,null,'',5),
  ('pre','แบบหล่อ','แบบหล่อสะอาด ไม่มีเศษคอนกรีตติดค้าง','yn','',null,null,'',10),
  ('pre','แบบหล่อ','ทาน้ำมันแบบทั่วถึง ไม่มีจุดแห้ง','yn','',null,null,'',20),
  ('pre','แบบหล่อ','แบบหล่อไม่บิดงอ รอยต่อแน่นไม่รั่ว','yn','',null,null,'',30),
  ('pre','ลวดอัดแรง/เหล็กเสริม','ชนิดและจำนวนลวด PC ตรงตามแบบ','yn','',null,null,'',40),
  ('pre','ลวดอัดแรง/เหล็กเสริม','แรงดึงลวดต่อเส้น','num','ตัน',null,null,'ตามค่าที่กำหนดของขนาดเสานั้น',50),
  ('pre','ลวดอัดแรง/เหล็กเสริม','ค่าแรงดึงคลาดเคลื่อนจากที่ออกแบบ','num','%',null,5,'ไม่เกิน ±5% ของค่าที่ออกแบบ',55),
  ('pre','ลวดอัดแรง/เหล็กเสริม','ระยะเรียงปลอกเหล็กตรงตามแบบ','yn','',null,null,'',60),
  ('pre','ลวดอัดแรง/เหล็กเสริม','เหล็กหนวดกุ้ง / Collar ครบถ้วน','yn','',null,null,'',70),
  ('pre','ลวดอัดแรง/เหล็กเสริม','เพลทหัวเสาตรงตำแหน่ง ยึดแน่น','yn','',null,null,'',80),
  ('pre','ลวดอัดแรง/เหล็กเสริม','หัวจับ/สมอยึดลวดสภาพดี ไม่ลื่นไถล','yn','',null,null,'',85),
  ('pre','ลวดอัดแรง/เหล็กเสริม','ระยะหุ้มคอนกรีต','num','มม.',20,null,'ไม่น้อยกว่า 20 มม.',90),
  ('pre','คอนกรีต','ค่ายุบตัว (Slump)','num','ซม.',5,10,'5–10 ซม.',100),
  ('pre','คอนกรีต','อุณหภูมิคอนกรีต','num','°C',null,35,'ไม่เกิน 35 °C',110),
  ('pre','คอนกรีต','จี้เขย่าคอนกรีตทั่วถึง ไม่มีโพรง','yn','',null,null,'',115),
  ('pre','คอนกรีต','เก็บตัวอย่างลูกปูนครบตามกำหนด','yn','',null,null,'',120),
  ('pre','คอนกรีต','เตรียมการบ่มคอนกรีตตามวิธีที่กำหนด','yn','',null,null,'',125),
  ('pre','อื่นๆ','ติดป้ายระบุแพ/วันที่ผลิตเรียบร้อย','yn','',null,null,'',130),
  ('pre','อื่นๆ','บันทึกข้อมูลการผลิต (วันที่ แพ สูตรคอนกรีต) ครบถ้วน','yn','',null,null,'',140),

  -- ===== หลังผลิต (มอก.396-2549) =====
  ('post','มิติ','ความยาวเสา','num','มม.',null,null,'เทียบกับความยาวตามแบบ',10),
  ('post','มิติ','ขนาดหน้าตัด','num','มม.',null,null,'เทียบกับหน้าตัดตามแบบ',20),
  ('post','มิติ','ความโก่ง/คดของเสา','num','มม.',null,null,'วัดจากแนวตรง',30),
  ('post','มิติ','ความหนาคอนกรีตหุ้มเหล็ก','num','มม.',20,null,'ไม่น้อยกว่า 20 มม.',40),
  ('post','มิติ','หัวเสา-ปลายเสาได้ฉาก ไม่บิดเบี้ยว','yn','',null,null,'',50),
  ('post','สภาพผิว','ไม่มีรอยร้าวตามขวาง','yn','',null,null,'',60),
  ('post','สภาพผิว','ไม่มีรอยร้าวตามยาว / โพรงในเนื้อคอนกรีต','yn','',null,null,'',70),
  ('post','สภาพผิว','ผิวเรียบ ไม่มีรูพรุนเกินกำหนด','yn','',null,null,'',80),
  ('post','สภาพผิว','ไม่มีเหล็กเสริมโผล่พ้นผิว','yn','',null,null,'',90),
  ('post','หัว-ปลายเสา','เพลทหัวเสาแนบสนิท ไม่บิด','yn','',null,null,'',100),
  ('post','หัว-ปลายเสา','ปลายเสาได้รูปตามแบบ','yn','',null,null,'',110),
  ('post','เครื่องหมาย/เอกสาร','เครื่องหมาย รหัสสินค้า วันที่ผลิต ครบถ้วน','yn','',null,null,'',120),
  ('post','เครื่องหมาย/เอกสาร','กำลังอัดคอนกรีตผ่านเกณฑ์','yn','',null,null,'อ้างอิงผลทดสอบลูกปูน',130),
  ('post','เครื่องหมาย/เอกสาร','ผลทดสอบการรับแรงดัด (ถ้ามี)','yn','',null,null,'ไม่มีการทดสอบรอบนี้ = ไม่เกี่ยว',140)
) as t(form_type,section,label,kind,unit,min_val,max_val,spec_text,sort_order)
where not exists (select 1 from qc_checklist);
