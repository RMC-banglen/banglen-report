-- แจ้งซ่อม: รายการสาเหตุการซ่อมที่แก้ได้เอง + แยกตามประเภทเครื่อง
-- รันครั้งเดียวใน Supabase > SQL Editor (รันซ้ำได้)
--   applies = all (ทุกประเภท) หรือรายการคั่นจุลภาค: vehicle (รถขนส่ง/รถในโรงงาน) · crane (เครน/เครนรถ) · machine (เครื่องจักร/รถไฟ/อื่นๆ)
--   "อื่นๆ" ไม่ต้องใส่ในตาราง — ระบบเติมท้ายรายการให้เสมอ (พร้อมช่องพิมพ์ระบุ)
create table if not exists repair_causes (
  id          bigserial primary key,
  site        text not null default 'banglen',
  name        text not null,
  applies     text not null default 'all',
  active      boolean default true,
  sort_order  int default 0,
  unique (site, name)
);
alter table repair_causes enable row level security;
drop policy if exists "allow all" on repair_causes;
create policy "allow all" on repair_causes for all using (true) with check (true);

insert into repair_causes (site, name, applies, sort_order) values
  ('banglen','สึกหรอตามอายุ','all',1),
  ('banglen','ใช้งานผิดวิธี','all',2),
  ('banglen','ขาดการบำรุงรักษา','all',3),
  ('banglen','ระบบไฟฟ้า','all',4),
  ('banglen','อุบัติเหตุ/ชน','all',5),
  ('banglen','ยาง/ช่วงล่าง','vehicle',10),
  ('banglen','เครื่องยนต์/เกียร์','vehicle',11),
  ('banglen','ระบบเบรก/ลม','vehicle',12),
  ('banglen','สลิง/รอก','crane',20),
  ('banglen','ลิมิตสวิตช์/เซนเซอร์','crane',21),
  ('banglen','มอเตอร์/เกียร์ยก','crane',22),
  ('banglen','ไฮดรอลิก/ลม','crane,machine',30),
  ('banglen','เครื่องกล/เกียร์/ลูกปืน','crane,machine',31),
  ('banglen','สายพาน/โซ่','machine',32)
on conflict (site, name) do nothing;
