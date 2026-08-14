-- ============================================================
-- ตาราง: ผลทดสอบขนาดคละทราย + ค่า FM (Fineness Modulus)
-- น้ำหนักค้างตะแกรง หน่วย: กรัม
-- ============================================================
create table if not exists sand_fm_tests (
  id          bigserial primary key,
  test_date   date not null,
  sand_source text default '',        -- แหล่งทราย / ผู้ขาย
  w9_5        numeric default 0,      -- ค้างตะแกรง 3/8" (9.5 mm)
  w4_75       numeric default 0,      -- ค้างตะแกรง #4  (4.75 mm)
  w2_36       numeric default 0,      -- ค้างตะแกรง #8  (2.36 mm)
  w1_18       numeric default 0,      -- ค้างตะแกรง #16 (1.18 mm)
  w0_60       numeric default 0,      -- ค้างตะแกรง #30 (0.60 mm)
  w0_30       numeric default 0,      -- ค้างตะแกรง #50 (0.30 mm)
  w0_15       numeric default 0,      -- ค้างตะแกรง #100(0.15 mm)
  w_pan       numeric default 0,      -- ค้างถาดล่าง (Pan)
  fm          numeric,                -- ค่า FM ที่คำนวณได้
  note        text default '',
  created_at  timestamptz default now()
);

create index if not exists sand_fm_tests_date_idx on sand_fm_tests (test_date desc);

alter table sand_fm_tests enable row level security;

drop policy if exists "sand_fm_all" on sand_fm_tests;
create policy "sand_fm_all" on sand_fm_tests
  for all using (true) with check (true);
