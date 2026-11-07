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
    geo: { B: 220, f: 65, c: 50, dg: 70, tw: 80 }, // รูปหน้าตัดไอ (มม.): กว้าง, ปีก, ก้นร่อง, ลึกร่อง, เอว
    shoulder: true, // มีแบบบ่าในต้นแบบ (ขนาดบ่ายังมีเฉพาะ I-22)
    // ตารางลวดอัดแรงและเหล็กเดือยหัวต่อ ตามช่วงความยาวท่อน (ม.): to = ความยาวสูงสุดของช่วง
    rules: [
      // ตารางปริมาณลวด PC (ไฟล์ Excel 10 ม.ค. 2566): 1–12 ม. 4mm×4 + 5mm×2 • 13–16 ม. 4mm×8 • 17–18 ม. 4mm×10 • 19–20 ม. 5mm×8
      { to: 12, w4: 4, w5: 2, dowel: { n: 4, d: 12, len: 0.3 } },
      { to: 16, w4: 8, w5: 0, dowel: { n: 4, d: 12, len: 0.3 } },
      { to: 18, w4: 10, w5: 0, dowel: { n: 4, d: 16, len: 0.4 } },
      { to: 20, w4: 0, w5: 8, dowel: { n: 6, d: 16, len: 0.4 } },
    ],
    // ปลอกเกลียว CD Ø2.8 มม.: ปลายทั้งสองข้าง 0.33 ม. @0.05 แล้ว 0.66 ม. @0.07 ส่วนกลาง @0.17 (กลาง = L − 1.98)
    spiral: { wire: 2.8, endLen: 0.33, endStep: 0.05, nearLen: 0.66, nearStep: 0.07, midStep: 0.17 },
    lift: 0.207, // จุดยก 0.207L จากปลายทั้งสองข้าง
  },
  T18: {
    key: "T18",
    draft: true, // ทำตัวอย่างให้ผู้ใช้ดูก่อน ยังไม่เปิดในเมนูเว็บ (เปิดดูได้ด้วย ?draft=1)
    label: "I-18",
    size: "0.18x0.18",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 12,
    geo: { B: 180, f: 60, c: 30, dg: 55, tw: 70 },
    shoulder: false, // ยังไม่มีแบบบ่าของหน้าตัดนี้
    rules: [
      { to: 12, w4: 2, w5: 2, dowel: { n: 4, d: 12, len: 0.3 } },
    ],
    // ปลอกเกลียว: ปลาย 1.5B @endStep, ถัดไป 3B @nearStep, ส่วนกลาง @midStep (ตามแบบ DXF)
    spiral: { wire: 2.8, endLen: 0.27, endStep: 0.03, nearLen: 0.54, nearStep: 0.075, midStep: 0.13 },
    lift: 0.207,
  },
  T26: {
    key: "T26",
    draft: true, // ทำตัวอย่างให้ผู้ใช้ดูก่อน ยังไม่เปิดในเมนูเว็บ (เปิดดูได้ด้วย ?draft=1)
    label: "I-26",
    size: "0.26x0.26",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 20,
    geo: { B: 260, f: 65, c: 90, dg: 85, tw: 90 },
    shoulder: false, // ยังไม่มีแบบบ่าของหน้าตัดนี้
    rules: [
      { to: 16, w4: 0, w5: 6, dowel: { n: 3, d: 12, len: 0.3 } },
      { to: 18, w4: 0, w5: 8, dowel: { n: 3, d: 16, len: 0.4 } },
      { to: 20, w4: 0, w5: 10, dowel: { n: 3, d: 16, len: 0.4 } },
    ],
    // ปลอกเกลียว: ปลาย 1.5B @endStep, ถัดไป 3B @nearStep, ส่วนกลาง @midStep (ตามแบบ DXF)
    spiral: { wire: 2.8, endLen: 0.39, endStep: 0.05, nearLen: 0.78, nearStep: 0.065, midStep: 0.16 },
    lift: 0.207,
  },
  T30: {
    key: "T30",
    draft: true, // ทำตัวอย่างให้ผู้ใช้ดูก่อน ยังไม่เปิดในเมนูเว็บ (เปิดดูได้ด้วย ?draft=1)
    label: "I-30",
    size: "0.30x0.30",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 20,
    geo: { B: 300, f: 75, c: 90, dg: 100, tw: 100 },
    shoulder: false, // ยังไม่มีแบบบ่าของหน้าตัดนี้
    rules: [
      { to: 16, w4: 0, w5: 8, dowel: { n: 5, d: 16, len: 0.4 } },
      { to: 18, w4: 0, w5: 10, dowel: { n: 6, d: 16, len: 0.4 } },
      { to: 20, w4: 0, w5: 12, dowel: { n: 7, d: 16, len: 0.4 } },
    ],
    // ปลอกเกลียว: ปลาย 1.5B @endStep, ถัดไป 3B @nearStep, ส่วนกลาง @midStep (ตามแบบ DXF)
    spiral: { wire: 3.0, endLen: 0.45, endStep: 0.055, nearLen: 0.9, nearStep: 0.0675, midStep: 0.17 },
    lift: 0.207,
  },
  T35: {
    key: "T35",
    draft: true, // ทำตัวอย่างให้ผู้ใช้ดูก่อน ยังไม่เปิดในเมนูเว็บ (เปิดดูได้ด้วย ?draft=1)
    label: "I-35",
    size: "0.35x0.35",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 20,
    geo: { B: 350, f: 85, c: 120, dg: 115, tw: 120 },
    shoulder: false, // ยังไม่มีแบบบ่าของหน้าตัดนี้
    rules: [
      { to: 18, w4: 0, w5: 10, dowel: { n: 6, d: 16, len: 0.4 } },
      { to: 20, w4: 0, w5: 12, dowel: { n: 7, d: 16, len: 0.4 } },
    ],
    // ปลอกเกลียว: ปลาย 1.5B @endStep, ถัดไป 3B @nearStep, ส่วนกลาง @midStep (ตามแบบ DXF)
    spiral: { wire: 3.0, endLen: 0.525, endStep: 0.045, nearLen: 1.05, nearStep: 0.06, midStep: 0.15 },
    lift: 0.207,
  },
  S18: {
    key: "S18",
    draft: true, // ทำตัวอย่างให้ผู้ใช้ดูก่อน ยังไม่เปิดในเมนูเว็บ (เปิดดูได้ด้วย ?draft=1)
    label: "[ ]",
    menu: "สี่เหลี่ยม 0.18",
    size: "0.18x0.18",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 14,
    geo: { sq: true, B: 180, ch: 30, dIn: 55 }, // เสาสี่เหลี่ยมมุมตัด 30 มม.; dIn = ระยะเหล็กเดือยจากผิวแผ่น
    shoulder: false,
    extras: false,
    rules: [
      { to: 12, w4: 6, w5: 0, dowel: { n: 4, d: 12, len: 0.3 } },
      { to: 14, w4: 4, w5: 2, dowel: { n: 5, d: 12, len: 0.3 } },
    ],
    spiral: { wire: 3.0, endLen: 0.27, endStep: 0.04, nearLen: 0.54, nearStep: 0.05, midStep: 0.13 },
    lift: 0.207,
  },
  S22: {
    key: "S22",
    draft: true, // ทำตัวอย่างให้ผู้ใช้ดูก่อน ยังไม่เปิดในเมนูเว็บ (เปิดดูได้ด้วย ?draft=1)
    label: "[ ]",
    menu: "สี่เหลี่ยม 0.22",
    size: "0.22x0.22",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 20,
    geo: { sq: true, B: 220, ch: 30, dIn: 50 }, // เสาสี่เหลี่ยมมุมตัด 30 มม.; dIn = ระยะเหล็กเดือยจากผิวแผ่น
    shoulder: false,
    extras: false,
    rules: [
      { to: 12, w4: 0, w5: 6, dowel: { n: 4, d: 16, len: 0.4 } },
      { to: 14, w4: 2, w5: 6, dowel: { n: 4, d: 16, len: 0.4 } },
      { to: 16, w4: 2, w5: 8, dowel: { n: 6, d: 16, len: 0.4 } },
      { to: 18, w4: 2, w5: 10, dowel: { n: 4, d: 20, len: 0.45 } },
      { to: 20, w4: 0, w5: 14, dowel: { n: 5, d: 20, len: 0.45 } },
    ],
    spiral: { wire: 4.0, endLen: 0.33, endStep: 0.065, nearLen: 0.66, nearStep: 0.08, midStep: 0.17 },
    lift: 0.207,
  },
  S26: {
    key: "S26",
    draft: true, // ทำตัวอย่างให้ผู้ใช้ดูก่อน ยังไม่เปิดในเมนูเว็บ (เปิดดูได้ด้วย ?draft=1)
    label: "[ ]",
    menu: "สี่เหลี่ยม 0.26",
    size: "0.26x0.26",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 20,
    geo: { sq: true, B: 260, ch: 30, dIn: 50 }, // เสาสี่เหลี่ยมมุมตัด 30 มม.; dIn = ระยะเหล็กเดือยจากผิวแผ่น
    shoulder: false,
    extras: false,
    rules: [
      { to: 14, w4: 0, w5: 8, dowel: { n: 5, d: 16, len: 0.4 } },
      { to: 16, w4: 0, w5: 10, dowel: { n: 6, d: 16, len: 0.4 } },
      { to: 18, w4: 0, w5: 14, dowel: { n: 5, d: 20, len: 0.4 } },
      { to: 20, w4: 0, w5: 16, dowel: { n: 6, d: 20, len: 0.4 } },
    ],
    spiral: { wire: 4.0, endLen: 0.39, endStep: 0.06, nearLen: 0.78, nearStep: 0.075, midStep: 0.19 },
    lift: 0.207,
  },
  S30: {
    key: "S30",
    draft: true, // ทำตัวอย่างให้ผู้ใช้ดูก่อน ยังไม่เปิดในเมนูเว็บ (เปิดดูได้ด้วย ?draft=1)
    label: "[ ]",
    menu: "สี่เหลี่ยม 0.30",
    size: "0.30x0.30",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 20,
    geo: { sq: true, B: 300, ch: 30, dIn: 55 }, // เสาสี่เหลี่ยมมุมตัด 30 มม.; dIn = ระยะเหล็กเดือยจากผิวแผ่น
    shoulder: false,
    extras: false,
    rules: [
      { to: 14, w4: 0, w5: 10, dowel: { n: 6, d: 16, len: 0.4 } },
      { to: 16, w4: 0, w5: 12, dowel: { n: 7, d: 16, len: 0.4 } },
      { to: 18, w4: 0, w5: 16, dowel: { n: 6, d: 20, len: 0.4 } },
      { to: 20, w4: 0, w5: 20, dowel: { n: 7, d: 20, len: 0.4 } },
    ],
    spiral: { wire: 4.0, endLen: 0.45, endStep: 0.05, nearLen: 0.9, nearStep: 0.06, midStep: 0.15 },
    lift: 0.207,
  },
  S35: {
    key: "S35",
    draft: true, // ทำตัวอย่างให้ผู้ใช้ดูก่อน ยังไม่เปิดในเมนูเว็บ (เปิดดูได้ด้วย ?draft=1)
    label: "[ ]",
    menu: "สี่เหลี่ยม 0.35",
    size: "0.35x0.35",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 20,
    geo: { sq: true, B: 350, ch: 30, dIn: 55 }, // เสาสี่เหลี่ยมมุมตัด 30 มม.; dIn = ระยะเหล็กเดือยจากผิวแผ่น
    shoulder: false,
    extras: false,
    rules: [
      { to: 16, w4: 0, w5: 14, dowel: { n: 5, d: 20, len: 0.45 } },
      { to: 18, w4: 0, w5: 18, dowel: { n: 7, d: 20, len: 0.45 } },
      { to: 20, w4: 0, w5: 22, dowel: { n: 8, d: 20, len: 0.45 } },
    ],
    spiral: { wire: 4.0, endLen: 0.525, endStep: 0.045, nearLen: 1.05, nearStep: 0.06, midStep: 0.15 },
    lift: 0.207,
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
