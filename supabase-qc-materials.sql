-- ============================================================
-- เพิ่ม "ระบบตรวจสอบวัตถุดิบ" เข้าระบบงาน QC
-- รันไฟล์นี้หลังจากรัน supabase-qc.sql ไปแล้ว (รันซ้ำได้ ไม่พัง)
-- ============================================================

-- 1) เปิดให้ form_type รับค่า 'mat' (ตรวจวัตถุดิบ) เพิ่มจาก pre/post
alter table qc_checklist drop constraint if exists qc_checklist_form_type_check;
alter table qc_checklist add  constraint qc_checklist_form_type_check
  check (form_type in ('pre','post','mat'));

alter table qc_checks drop constraint if exists qc_checks_form_type_check;
alter table qc_checks add  constraint qc_checks_form_type_check
  check (form_type in ('pre','post','mat'));

-- 2) ช่องข้อมูลเฉพาะของใบตรวจวัตถุดิบ
alter table qc_checks add column if not exists material  text default '';  -- ชนิดวัตถุดิบที่ตรวจ
alter table qc_checks add column if not exists supplier  text default '';  -- ผู้ขาย/ผู้ส่ง

-- 3) ย้ายหัวข้อ "วัสดุ" ที่เคยอยู่ในฟอร์มก่อนผลิต ออกไป (ปิดไว้ ไม่ลบ ใบเก่ายังอ่านได้)
update qc_checklist set active=false
 where form_type='pre' and section like 'วัสดุ%';

-- 4) หัวข้อตรวจของแต่ละวัตถุดิบ — section = ชื่อวัตถุดิบ
insert into qc_checklist (form_type,section,label,kind,unit,min_val,max_val,spec_text,sort_order)
select * from (values
  -- ปูนซีเมนต์ ประเภท 3
  ('mat','ปูนซีเมนต์ ประเภท 3','ใบส่งของ/ใบรับรองผลทดสอบ (mill test) ครบถ้วน','yn','',null::numeric,null::numeric,'',10),
  ('mat','ปูนซีเมนต์ ประเภท 3','ระบุประเภท 3 ชัดเจน ตรงตามที่สั่ง','yn','',null,null,'',20),
  ('mat','ปูนซีเมนต์ ประเภท 3','ไม่จับตัวเป็นก้อนแข็ง ไม่เปียกชื้น','yn','',null,null,'',30),
  ('mat','ปูนซีเมนต์ ประเภท 3','วันที่ผลิตไม่เก่าเกินกำหนด','yn','',null,null,'',40),
  ('mat','ปูนซีเมนต์ ประเภท 3','ปริมาณที่รับ','num','ตัน',null,null,'',50),

  -- ลวด PC.WIRE มอก.95
  ('mat','ลวด PC.WIRE (มอก.95)','มีเครื่องหมายมาตรฐาน มอก.95','yn','',null,null,'',10),
  ('mat','ลวด PC.WIRE (มอก.95)','ใบรับรองผลทดสอบแรงดึงจากผู้ผลิต','yn','',null,null,'',20),
  ('mat','ลวด PC.WIRE (มอก.95)','ขนาดเส้นผ่านศูนย์กลาง','num','มม.',null,null,'เทียบกับขนาดที่สั่ง',30),
  ('mat','ลวด PC.WIRE (มอก.95)','ผิวไม่เป็นสนิมขุม ไม่มีรอยบาด','yn','',null,null,'',40),
  ('mat','ลวด PC.WIRE (มอก.95)','เก็บในที่แห้ง ไม่วางกับพื้นเปียก','yn','',null,null,'',50),
  ('mat','ลวด PC.WIRE (มอก.95)','น้ำหนักที่รับ','num','กก.',null,null,'',60),

  -- ลวดปลอก มอก.194
  ('mat','ลวดปลอก (มอก.194)','มีเครื่องหมายมาตรฐาน มอก.194','yn','',null,null,'',10),
  ('mat','ลวดปลอก (มอก.194)','ใบรับรองผลทดสอบจากผู้ผลิต','yn','',null,null,'',20),
  ('mat','ลวดปลอก (มอก.194)','ขนาดเส้นผ่านศูนย์กลาง','num','มม.',null,null,'เทียบกับขนาดที่สั่ง',30),
  ('mat','ลวดปลอก (มอก.194)','ผิวไม่เป็นสนิมขุม','yn','',null,null,'',40),
  ('mat','ลวดปลอก (มอก.194)','น้ำหนักที่รับ','num','กก.',null,null,'',50),

  -- เหล็กเสริมคอนกรีต
  ('mat','เหล็กเสริมคอนกรีต','มีเครื่องหมายมาตรฐานและตราผู้ผลิตที่เนื้อเหล็ก','yn','',null,null,'',10),
  ('mat','เหล็กเสริมคอนกรีต','ชั้นคุณภาพ/ขนาดตรงตามที่สั่ง','yn','',null,null,'',20),
  ('mat','เหล็กเสริมคอนกรีต','ความยาวเส้น','num','ม.',null,null,'เทียบกับที่สั่ง',30),
  ('mat','เหล็กเสริมคอนกรีต','ไม่เป็นสนิมขุม ไม่โก่งงอเสียรูป','yn','',null,null,'',40),
  ('mat','เหล็กเสริมคอนกรีต','จำนวนที่รับ','num','เส้น',null,null,'',50),

  -- เหล็กแผ่น 5x20 ฟุต
  ('mat','เหล็กแผ่น 5x20 ฟุต','ความหนาแผ่น','num','มม.',null,null,'9 / 8 / 6 มม. ตามที่สั่ง',10),
  ('mat','เหล็กแผ่น 5x20 ฟุต','ขนาดแผ่นครบ 5x20 ฟุต ไม่ขาดมุม','yn','',null,null,'',20),
  ('mat','เหล็กแผ่น 5x20 ฟุต','ผิวไม่เป็นสนิมขุม ไม่บิดโก่ง','yn','',null,null,'',30),
  ('mat','เหล็กแผ่น 5x20 ฟุต','ใบส่งของระบุเกรด/ความหนาตรงกัน','yn','',null,null,'',40),
  ('mat','เหล็กแผ่น 5x20 ฟุต','จำนวนที่รับ','num','แผ่น',null,null,'',50),

  -- เหล็ก Collar
  ('mat','เหล็ก Collar','ขนาด/รูปทรงตรงตามแบบ','yn','',null,null,'',10),
  ('mat','เหล็ก Collar','งานเชื่อมเรียบร้อย ไม่มีรอยแตกร้าว','yn','',null,null,'',20),
  ('mat','เหล็ก Collar','ผิวไม่เป็นสนิมขุม','yn','',null,null,'',30),
  ('mat','เหล็ก Collar','จำนวนที่รับ','num','ชุด',null,null,'',40),

  -- น้ำยาผสมคอนกรีต
  ('mat','น้ำยาผสมคอนกรีต','ชนิด/รุ่นตรงตามที่สั่ง','yn','',null,null,'',10),
  ('mat','น้ำยาผสมคอนกรีต','ยังไม่หมดอายุ','yn','',null,null,'',20),
  ('mat','น้ำยาผสมคอนกรีต','สภาพน้ำยาปกติ ไม่แยกชั้น ไม่ตกตะกอน','yn','',null,null,'',30),
  ('mat','น้ำยาผสมคอนกรีต','ภาชนะปิดสนิท ฉลากครบถ้วน','yn','',null,null,'',40),
  ('mat','น้ำยาผสมคอนกรีต','ปริมาณที่รับ','num','ลิตร',null,null,'',50)
) as t(form_type,section,label,kind,unit,min_val,max_val,spec_text,sort_order)
where not exists (select 1 from qc_checklist where form_type='mat');
