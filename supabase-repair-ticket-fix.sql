-- แก้เลขใบงานแจ้งซ่อม: ใช้เลขสูงสุดของเดือน + 1 แทนการนับจำนวน
-- (เดิมลบใบกลางๆ ทิ้งแล้ว ใบใหม่ได้เลขซ้ำกับใบที่มีอยู่ → แจ้งซ่อมไม่ผ่าน)
-- รันครั้งเดียวใน Supabase > SQL Editor
create or replace function repair_ticket_no() returns trigger as $$
declare ym text; n int;
begin
  ym := lpad((((extract(year from (now() at time zone 'Asia/Bangkok'))::int + 543) % 100))::text, 2, '0')
        || to_char(now() at time zone 'Asia/Bangkok', 'MM');
  select coalesce(max(split_part(ticket_no, '-', 3)::int), 0) + 1 into n
    from repair_requests where ticket_no like 'MR-' || ym || '-%';
  new.ticket_no := 'MR-' || ym || '-' || lpad(n::text, 3, '0');
  return new;
end $$ language plpgsql;
