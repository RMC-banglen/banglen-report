-- ============================================================
-- คำนวณผลระยะยืดของลวดใหม่ ให้ตรงกับค่ามาตรฐานปัจจุบันใน qc_elongation_spec
--
-- ใช้เมื่อ: แก้ค่ามาตรฐาน (target_mm / tol_pct) ไปแล้ว แต่ใบตรวจเก่ายังขึ้นผลเดิม
-- เพราะระบบคำนวณผ่าน/ไม่ผ่านตอนกดบันทึก แล้วเก็บค่าตายตัวไว้ ไม่ได้คิดใหม่ตอนเปิดดู
--
-- แก้ให้ 3 อย่าง: ok ของหัวข้อระยะยืด, หมายเหตุเกณฑ์, สถานะ+จำนวนที่ไม่ผ่านของหัวใบตรวจ
--
-- วิธีใช้: รันทีละขั้น ดูผลขั้นที่ 1 ก่อนว่าถูกต้อง แล้วค่อยรันขั้นที่ 2 และ 3
-- ============================================================

-- จับคู่ชื่อสเปกแบบเดียวกับหน้าเว็บ: S26มอก. / S26รง. ให้ถือเป็น S26
-- (ใช้เฉพาะที่ขึ้นต้นด้วย S ตามด้วยตัวเลข ส่วน I26รง. ไม่ตัด ต้องตรงทั้งคำ)
create or replace function _norm_spec(s text) returns text language sql immutable as $$
  select case
    when s ~ '^S[0-9]+(มอก\.|รง\.)$' then substring(s from '^(S[0-9]+)')
    else s
  end;
$$;

-- หัวข้อระยะยืดทั้งหมด จับคู่กับค่ามาตรฐานปัจจุบัน
create or replace view _elong_recalc as
select
  ci.id                as item_id,
  ci.check_id,
  ch.check_date,
  ch.bed_no,
  ch.pile_spec,
  ci.label,
  ci.value_num,
  ci.ok                as ok_เดิม,
  ci.note              as หมายเหตุเดิม,
  e.target_mm,
  e.tol_pct,
  round((e.target_mm * (1 - e.tol_pct/100.0))::numeric, 1) as ต่ำสุด,
  round((e.target_mm * (1 + e.tol_pct/100.0))::numeric, 1) as สูงสุด,
  (ci.value_num >= e.target_mm * (1 - e.tol_pct/100.0)
   and ci.value_num <= e.target_mm * (1 + e.tol_pct/100.0)) as ok_ใหม่,
  'เกณฑ์ ' || e.target_mm || ' มม. ±' || e.tol_pct || '%' as หมายเหตุใหม่
from qc_check_items ci
join qc_checks ch on ch.id = ci.check_id
join qc_elongation_spec e
  on e.wire_mm = case
       when ci.label like '%4 มม.%' then 4
       when ci.label like '%5 มม.%' then 5
     end
 and (
       (e.pile_spec is not null and _norm_spec(e.pile_spec) = _norm_spec(ch.pile_spec))
    or (e.pile_spec is null and e.raft_num::text = ch.bed_no)
     )
where ci.label like '%Elongation total%'
  and ci.value_num is not null
  and ch.pile_spec is not null
  and ch.pile_spec <> 'เลนเดี่ยว';


-- ============================================================
-- ขั้นที่ 1 — ดูก่อนว่าจะเปลี่ยนแถวไหนบ้าง (ยังไม่แก้อะไร)
-- ============================================================
select check_id, check_date, pile_spec, label, value_num,
       target_mm, ต่ำสุด, สูงสุด, ok_เดิม, ok_ใหม่, หมายเหตุเดิม, หมายเหตุใหม่
from _elong_recalc
where ok_เดิม is distinct from ok_ใหม่
order by check_date desc, check_id, label;


-- ============================================================
-- ขั้นที่ 2 — แก้ ok และหมายเหตุของหัวข้อระยะยืด
-- ============================================================
update qc_check_items ci
set ok   = r.ok_ใหม่,
    note = r.หมายเหตุใหม่
from _elong_recalc r
where ci.id = r.item_id
  and (ci.ok is distinct from r.ok_ใหม่ or ci.note is distinct from r.หมายเหตุใหม่);


-- ============================================================
-- ขั้นที่ 3 — คิดสถานะหัวใบตรวจใหม่จากหัวข้อย่อยที่ไม่ผ่าน
-- (เฉพาะใบที่มีหัวข้อระยะยืด จะได้ไม่ไปแตะใบอื่น)
-- ============================================================
update qc_checks ch
set fail_count = f.n,
    result     = case when f.n > 0 then 'fail' else 'pass' end
from (
  select ci.check_id, count(*) filter (where ci.ok is false) as n
  from qc_check_items ci
  where ci.check_id in (select distinct check_id from _elong_recalc)
  group by ci.check_id
) f
where ch.id = f.check_id
  and (ch.fail_count is distinct from f.n
       or ch.result is distinct from case when f.n > 0 then 'fail' else 'pass' end);


-- ============================================================
-- ขั้นที่ 4 — ตรวจผลหลังแก้
-- ============================================================
select ch.id, ch.check_date, ch.pile_spec, ch.result, ch.fail_count,
       ci.label, ci.value_num, ci.ok, ci.note
from qc_checks ch
join qc_check_items ci on ci.check_id = ch.id
where ci.label like '%Elongation total%'
order by ch.check_date desc, ch.id, ci.label
limit 40;
