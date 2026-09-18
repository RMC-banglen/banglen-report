-- ============================================================
-- แก้ค่าระยะยืดของลวดให้ผูกกับ "ขนาดเสา" แทน "เลขแพ"
-- เหตุผล: แพ S และแพที่ 4 เปลี่ยนขนาดได้ทุกวัน ถ้าผูกกับเลขแพ
-- ค่ามาตรฐานจะไม่ตามขนาดที่เปลี่ยนไป ต้องผูกกับขนาดเสาจริงถึงจะถูก
-- รันหลัง supabase-qc-elongation.sql (รันซ้ำได้ ไม่พัง)
-- ============================================================

-- 1) เพิ่มคอลัมน์ขนาดเสา
alter table qc_elongation_spec add column if not exists pile_spec text;

-- 2) เติมขนาดเสาให้แถวเดิม จากขนาดปัจจุบันของแพนั้นในระบบแพผลิต
update qc_elongation_spec e
set pile_spec = coalesce(
  (select r.pile_type || r.section from worktrack_raft_info r where r.raft_num = e.raft_num),
  'แพ ' || e.raft_num
)
where pile_spec is null;

-- 3) แพหลายเลขที่ขนาดเดียวกัน (เช่น I26มอก. มี 4 แพ) จะมีค่าซ้ำกัน — เก็บแถวล่าสุดไว้ 1 แถวต่อขนาด/ต่อลวด
delete from qc_elongation_spec e
where exists (
  select 1 from qc_elongation_spec e2
  where e2.pile_spec = e.pile_spec and e2.wire_mm = e.wire_mm
    and (e2.updated_at, e2.id) > (e.updated_at, e.id)
);

-- 4) เปลี่ยนดัชนีให้กันซ้ำตาม (ขนาดเสา, ขนาดลวด) แทน (เลขแพ, ขนาดลวด)
alter table qc_elongation_spec drop constraint if exists qc_elongation_spec_raft_num_wire_mm_key;
alter table qc_elongation_spec add constraint qc_elongation_spec_pile_spec_wire_mm_key unique (pile_spec, wire_mm);

-- 5) ขนาดเสาบังคับกรอก ส่วนเลขแพเก็บไว้อ้างอิงเฉยๆ ไม่บังคับแล้ว
alter table qc_elongation_spec alter column pile_spec set not null;
alter table qc_elongation_spec alter column raft_num drop not null;
