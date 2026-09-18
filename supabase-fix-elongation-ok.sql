-- ============================================================
-- คำนวณผล ok ของระยะยืดใหม่ จากค่ามาตรฐานปัจจุบันใน qc_elongation_spec
-- รันหลังจากแก้ค่า target_mm / tol_pct ในหน้า dashboard ให้ถูกต้องแล้ว
-- ============================================================

-- helper: normalize pile_spec (S26มอก. / S26รง. → S26)
create or replace function _norm_spec(s text) returns text language sql immutable as $$
  select case
    when s ~ '^(S[0-9]+)(มอก\.|รง\.)$' then substring(s from '^(S[0-9]+)')
    else s
  end;
$$;

-- อัปเดต ok ของ qc_check_items สำหรับหัวข้อระยะยืด
-- จับคู่กับ qc_elongation_spec ผ่าน pile_spec (normalize) + wire_mm
update qc_check_items ci
set ok = (
  ci.value_num >= e.target_mm * (1 - e.tol_pct / 100.0)
  and ci.value_num <= e.target_mm * (1 + e.tol_pct / 100.0)
)
from qc_check_items ci2
join qc_checks ch on ch.id = ci2.check_id
join qc_elongation_spec e
  on _norm_spec(coalesce(e.pile_spec, 'แพ ' || e.raft_num::text))
     = _norm_spec(ch.pile_spec)
  and e.wire_mm = case
    when ci2.label like '%4 มม.%' then 4
    when ci2.label like '%5 มม.%' then 5
  end
where ci.id = ci2.id
  and ci2.label like '%Elongation total%'
  and ci2.value_num is not null
  and ch.pile_spec is not null
  and ch.pile_spec != 'เลนเดี่ยว';

-- แสดงผลหลังแก้
select
  ch.pile_spec,
  ci.label,
  ci.value_num,
  e.target_mm,
  e.tol_pct,
  round((e.target_mm * (1 - e.tol_pct/100.0))::numeric, 1) as lo,
  round((e.target_mm * (1 + e.tol_pct/100.0))::numeric, 1) as hi,
  ci.ok
from qc_check_items ci
join qc_checks ch on ch.id = ci.check_id
join qc_elongation_spec e
  on _norm_spec(coalesce(e.pile_spec, 'แพ ' || e.raft_num::text)) = _norm_spec(ch.pile_spec)
  and e.wire_mm = case
    when ci.label like '%4 มม.%' then 4
    when ci.label like '%5 มม.%' then 5
  end
where ci.label like '%Elongation total%'
  and ci.value_num is not null
order by ch.check_date desc, ch.pile_spec, e.wire_mm
limit 50;
