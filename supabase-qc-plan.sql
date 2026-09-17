-- ============================================================
-- ใบงานผลิตรายวัน (QC) — วันนี้ผลิตแพไหนบ้าง
-- ใช้จับคู่กับใบตรวจก่อนผลิต เพื่อรู้ว่าแพไหนยังไม่ได้ตรวจ
-- รันหลัง supabase-qc.sql (รันซ้ำได้ ไม่พัง)
-- ============================================================

create table if not exists qc_production_day (
  id         bigserial primary key,
  d          date not null,           -- วันที่ผลิต
  raft_num   int  not null,           -- เลขแพ (ตรงกับ worktrack_raft_info.raft_num)
  pile_spec  text default '',         -- ขนาดเสาของแพนั้น ณ วันที่ลงใบงาน
  created_by text default '',         -- code ของ QC ที่ลงใบงาน
  created_at timestamptz default now(),
  unique (d, raft_num)
);

create index if not exists qc_production_day_d_idx on qc_production_day (d desc);

alter table qc_production_day enable row level security;
drop policy if exists "qc_production_day_all" on qc_production_day;
create policy "qc_production_day_all" on qc_production_day for all using (true) with check (true);
