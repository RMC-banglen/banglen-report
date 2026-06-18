-- ============================================================
-- Supabase: ตารางรายงานปัญหาคุณภาพและบริการ
-- วิธีใช้: วางทั้งหมดใน Supabase SQL Editor แล้วกด Run
-- ============================================================

create table if not exists quality_reports (
  id           serial primary key,
  report_date  date not null,
  title        text not null,
  type         text not null default 'คุณภาพผลิตภัณฑ์',
  description  text,
  status       text not null default 'open',  -- open | in_progress | done
  fix_note     text,
  created_at   timestamptz default now()
);

create table if not exists quality_report_images (
  id         serial primary key,
  report_id  int references quality_reports(id) on delete cascade,
  image_url  text not null,
  created_at timestamptz default now()
);

alter table quality_reports        disable row level security;
alter table quality_report_images  disable row level security;

create index if not exists idx_quality_date      on quality_reports (report_date desc);
create index if not exists idx_quality_img_repid on quality_report_images (report_id);

-- ตรวจสอบ
select 'quality_reports' t, count(*) n from quality_reports
union all select 'quality_report_images', count(*) from quality_report_images;

-- ============================================================
-- หลังรัน SQL แล้ว ให้สร้าง Storage Bucket:
--   Supabase Dashboard → Storage → New bucket
--   Name: quality-images
--   Public bucket: เปิด (toggle ON)
-- ============================================================
