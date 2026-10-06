-- น้ำหนักลูกปูนรายก้อน (กก.) — ชั่งก่อนกด ใช้เทียบกับกำลังอัดรายก้อน
alter table concrete_results add column if not exists weight1_kg numeric;
alter table concrete_results add column if not exists weight2_kg numeric;
alter table concrete_results add column if not exists weight3_kg numeric;
