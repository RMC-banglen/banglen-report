-- ============================================================
-- ค่าระยะยืดของลวด (Elongation total) — ตั้งค่าคงที่ต่อแพ ต่อขนาดลวด
-- QC กรอกค่าที่วัดได้จริง ระบบเทียบกับค่านี้แล้วตัดสินผ่าน/ไม่ผ่านให้เอง
-- รันหลัง supabase-qc.sql (รันซ้ำได้ ไม่พัง)
-- ============================================================

create table if not exists qc_elongation_spec (
  id         bigserial primary key,
  raft_num   int not null,                 -- เลขแพ (ตรงกับ worktrack_raft_info.raft_num)
  wire_mm    numeric not null,             -- ขนาดลวด เช่น 4 หรือ 5
  target_mm  numeric not null,             -- ระยะยืดมาตรฐาน (มม.)
  tol_pct    numeric not null default 5,   -- ยอมให้คลาดเคลื่อน ± กี่ %
  note       text default '',
  updated_at timestamptz default now(),
  unique (raft_num, wire_mm)
);

create index if not exists qc_elongation_raft_idx on qc_elongation_spec (raft_num);

alter table qc_elongation_spec enable row level security;
drop policy if exists "qc_elongation_spec_all" on qc_elongation_spec;
create policy "qc_elongation_spec_all" on qc_elongation_spec for all using (true) with check (true);

-- ปิดหัวข้อแรงดึงแบบเดิม (เปลี่ยนมาใช้ระยะยืดแทน) — ปิดไว้ ไม่ลบ ใบเก่ายังอ่านได้
update qc_checklist set active=false
 where form_type='pre'
   and (label like 'แรงดึงลวดต่อเส้น%' or label like 'ค่าแรงดึงคลาดเคลื่อน%');
