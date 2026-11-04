// ข้อมูลมาตรฐานแบบเสาเข็มไอ (PC Pile) ตามแบบ RMC: แต่ละหน้าตัดมีกฎของตัวเองตามความยาว
// เพิ่มหน้าตัดใหม่ = เพิ่มรายการใน PILE_SECTIONS (ใช้รหัสเดียวกับ PILES ใน standards.js เพื่อใช้รูปหน้าตัด)
// ที่มา I-22 มอก.: แบบ "แบบI22มอก เต็ม" (ตารางลวดตามความยาว) • "Drawing pile-19m" (2 ท่อนต่อ) • "Drawing pile-Model" (เหล็กพิเศษ + บ่า)
export const PILE_SECTIONS = {
  T22: {
    key: "T22",
    label: "I-22",
    size: "0.22x0.22",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 20,
    // ตารางลวดอัดแรงและเหล็กเดือยหัวต่อ ตามช่วงความยาวท่อน (ม.): to = ความยาวสูงสุดของช่วง
    rules: [
      { to: 16, w4: 4, w5: 2, dowel: { n: 4, d: 12, len: 0.3 } },
      { to: 18, w4: 10, w5: 0, dowel: { n: 4, d: 16, len: 0.4 } },
      { to: 20, w4: 0, w5: 8, dowel: { n: 6, d: 16, len: 0.4 } },
    ],
    // ปลอกเกลียว CD Ø2.8 มม.: ปลายทั้งสองข้าง 0.33 ม. @0.05 แล้ว 0.66 ม. @0.07 ส่วนกลาง @0.17 (กลาง = L − 1.98)
    spiral: { wire: 2.8, endLen: 0.33, endStep: 0.05, nearLen: 0.66, nearStep: 0.07, midStep: 0.17 },
    lift: 0.207, // จุดยก 0.207L จากปลายทั้งสองข้าง
  },
};

// บ่า (ที่รองรับ): ขนาดตามแบบ 0.20 + 0.10 ม. เหล็กในบ่า 3 เส้น DB12
export const SHOULDER_STD = { a: 0.2, b: 0.1, bars: 3, d: 12, cover: 0.05 }; // เหล็ก 3 เส้นเว้นเท่ากัน: ระยะหุ้ม 0.05 ที่ปลาย ระยะเหล็ก 0.05 (0.05, 0.10, 0.15 จากขอบบ่า)

// ชื่อผู้ออกแบบ/เขียนแบบ/อนุมัติ ในตารางชื่อแบบ (คงเดิมทุกแบบ)
export const TITLE_BLOCK = {
  company: "บริษัท ร่วมมิตรคอนกรีต(บางเลน) จำกัด",
  companyEn: "RUAMMITR CONCRETE (BANGLAN) COMPANY LIMITED",
  designBy: "CHAIYAPORN S.",
  drawBy: "CHAIYAPORN S.",
  approveBy: "CHAIYAPORN S.",
  licence: "สย.8954",
};
