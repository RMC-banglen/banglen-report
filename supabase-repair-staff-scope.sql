-- หัวหน้าฝ่ายดูแลเฉพาะหมวด (รันครั้งเดียวใน Supabase > SQL Editor)
-- all = ทุกหมวด · fleet = รถขนส่ง+เครนรถขนส่ง · factory = เครื่องจักรในโรงงาน (นอกจากรถขนส่ง)
alter table repair_staff add column if not exists scope text default 'all';
