-- ============================================================
-- ยอดส่งเสาเข็มรวมรายเดือน (ไม่แยกขนาด)
-- ใช้เป็นตัวหารหา "% เสียหายต่อยอดส่ง" ในแท็บวิเคราะห์ขนาดเสา
-- กรอกเองจากหน้าเว็บ (แท็บ มูลค่า-เปอร์เซ็นต์เสียหาย → วิเคราะห์ขนาดเสา)
-- ============================================================

create table if not exists pile_shipped (
  id          bigserial primary key,
  year        int not null,            -- ปี พ.ศ. เช่น 2569
  month       int not null,            -- 1-12
  qty         numeric not null,        -- ยอดส่งรวมทั้งเดือน (ต้น)
  updated_at  timestamptz default now(),
  unique (year, month)
);

create index if not exists pile_shipped_ym_idx on pile_shipped (year desc, month desc);

alter table pile_shipped enable row level security;

drop policy if exists "pile_shipped_all" on pile_shipped;
create policy "pile_shipped_all" on pile_shipped for all using (true) with check (true);
