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
    // ตารางลวด PC: Excel 1 ส.ค. 2569 • เหล็กเชื่อมหัวเพลท: ตารางที่ผู้ใช้ส่ง 7 พ.ย. 2569 ตัดความยาวลง 1 ซม. (เผื่อความยาวเชื่อมเข้าไปในเพลท) → 30/40/45/50 ซม.
    rules: [
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
    label: "I-18",
    size: "0.18x0.18",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 12,
    geo: { B: 180, f: 60, c: 30, dg: 55, tw: 70, wl: 1 },
    shoulder: false, // ยังไม่มีแบบบ่าของหน้าตัดนี้
    // ตารางลวด PC: Excel 1 ส.ค. 2569 • เหล็กเชื่อมหัวเพลท: ตารางที่ผู้ใช้ส่ง 7 พ.ย. 2569 (ยาวเป็นเมตร)
    rules: [
      { to: 10, w4: 2, w5: 2, dowel: { n: 4, d: 12, len: 0.3 } },
      { to: 11, w4: 6, w5: 0, dowel: { n: 4, d: 12, len: 0.3 } },
      { to: 12, w4: 4, w5: 2, dowel: { n: 4, d: 12, len: 0.3 } },
    ],
    // ปลอกเกลียว: ปลาย 1.5B @endStep, ถัดไป 3B @nearStep, ส่วนกลาง @midStep (ตามแบบ DXF)
    spiral: { wire: 2.8, endLen: 0.27, endStep: 0.03, nearLen: 0.54, nearStep: 0.075, midStep: 0.13 },
    lift: 0.207,
  },
  T26: {
    key: "T26",
    label: "I-26",
    size: "0.26x0.26",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 20,
    geo: { B: 260, f: 65, c: 90, dg: 85, tw: 90, wl: 3, p4: 70 },
    shoulder: false, // ยังไม่มีแบบบ่าของหน้าตัดนี้
    // ตารางลวด PC: Excel 1 ส.ค. 2569 • เหล็กเชื่อมหัวเพลท: ตารางที่ผู้ใช้ส่ง 7 พ.ย. 2569 (ยาวเป็นเมตร)
    rules: [
      { to: 12, w4: 0, w5: 6, dowel: { n: 6, d: 12, len: 0.3 } },
      { to: 16, w4: 4, w5: 4, dowel: { n: 6, d: 12, len: 0.3 } },
      { to: 18, w4: 0, w5: 8, dowel: { n: 6, d: 16, len: 0.4 } },
      { to: 20, w4: 0, w5: 10, dowel: { n: 6, d: 16, len: 0.4 } },
    ],
    // ปลอกเกลียว: ปลาย 1.5B @endStep, ถัดไป 3B @nearStep, ส่วนกลาง @midStep (ตามแบบ DXF)
    spiral: { wire: 2.8, endLen: 0.39, endStep: 0.05, nearLen: 0.78, nearStep: 0.065, midStep: 0.16 },
    lift: 0.207,
  },
  T30: {
    key: "T30",
    label: "I-30",
    size: "0.30x0.30",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 20,
    geo: { B: 300, f: 75, c: 90, dg: 100, tw: 100, wl: 3, p4: 70 },
    shoulder: false, // ยังไม่มีแบบบ่าของหน้าตัดนี้
    // ตารางลวด PC: Excel 1 ส.ค. 2569 • เหล็กเชื่อมหัวเพลท: ตารางที่ผู้ใช้ส่ง 7 พ.ย. 2569 (ยาวเป็นเมตร)
    rules: [
      { to: 16, w4: 2, w5: 6, dowel: { n: 5, d: 16, len: 0.4 } },
      { to: 18, w4: 0, w5: 10, dowel: { n: 6, d: 16, len: 0.4 } },
      { to: 20, w4: 0, w5: 12, dowel: { n: 7, d: 16, len: 0.4 } },
    ],
    // ปลอกเกลียว: ปลาย 1.5B @endStep, ถัดไป 3B @nearStep, ส่วนกลาง @midStep (ตามแบบ DXF)
    spiral: { wire: 3.0, endLen: 0.45, endStep: 0.055, nearLen: 0.9, nearStep: 0.0675, midStep: 0.17 },
    lift: 0.207,
  },
  T35: {
    key: "T35",
    label: "I-35",
    size: "0.35x0.35",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 20,
    geo: { B: 350, f: 85, c: 120, dg: 115, tw: 120, wl: 2 },
    shoulder: false, // ยังไม่มีแบบบ่าของหน้าตัดนี้
    // ตารางลวด PC: Excel 1 ส.ค. 2569 • เหล็กเชื่อมหัวเพลท: ตารางที่ผู้ใช้ส่ง 7 พ.ย. 2569 (ยาวเป็นเมตร)
    rules: [
      { to: 11, w4: 2, w5: 8, dowel: { n: 6, d: 16, len: 0.4 } },
      { to: 14, w4: 0, w5: 10, dowel: { n: 6, d: 16, len: 0.4 } },
      { to: 18, w4: 0, w5: 12, dowel: { n: 6, d: 16, len: 0.4 } },
      { to: 20, w4: 0, w5: 12, dowel: { n: 7, d: 16, len: 0.4 } },
    ],
    // ปลอกเกลียว: ปลาย 1.5B @endStep, ถัดไป 3B @nearStep, ส่วนกลาง @midStep (ตามแบบ DXF)
    spiral: { wire: 3.0, endLen: 0.525, endStep: 0.045, nearLen: 1.05, nearStep: 0.06, midStep: 0.15 },
    lift: 0.207,
  },
  S18: {
    key: "S18",
    label: "[ ]",
    menu: "S-18",
    size: "0.18x0.18",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 14,
    geo: { sq: true, B: 180, ch: 20, dIn: 55, pat: { 6: { row: ["L0","L1","R0"] } } }, // เสาสี่เหลี่ยมมุมตัด 20 มม.; dIn = ระยะเหล็กเดือยจากผิวแผ่น
    shoulder: false,
    // ตารางลวด PC: Excel 1 ส.ค. 2569 • เหล็กเชื่อมหัวเพลท: ตารางที่ผู้ใช้ส่ง 7 พ.ย. 2569 (ยาวเป็นเมตร)
    rules: [
      { to: 10, w4: 6, w5: 0, dowel: { n: 4, d: 12, len: 0.3 } },
      { to: 12, w4: 4, w5: 2, dowel: { n: 4, d: 12, len: 0.3 } },
      { to: 14, w4: 4, w5: 2, dowel: { n: 5, d: 12, len: 0.3 } },
    ],
    spiral: { wire: 3.0, endLen: 0.27, endStep: 0.04, nearLen: 0.54, nearStep: 0.05, midStep: 0.13 },
    lift: 0.207,
  },
  S22: {
    key: "S22",
    label: "[ ]",
    menu: "S-22",
    size: "0.22x0.22",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 20,
    geo: { sq: true, B: 220, ch: 20, dIn: 50, pat: { 6: { row: ["L0","L1","R0"] } } }, // เสาสี่เหลี่ยมมุมตัด 20 มม.; dIn = ระยะเหล็กเดือยจากผิวแผ่น
    shoulder: false,
    // ตารางลวด PC: Excel 1 ส.ค. 2569 • เหล็กเชื่อมหัวเพลท: ตารางที่ผู้ใช้ส่ง 7 พ.ย. 2569 (ยาวเป็นเมตร)
    rules: [
      { to: 12, w4: 0, w5: 6, dowel: { n: 4, d: 16, len: 0.4 } },
      { to: 14, w4: 4, w5: 4, dowel: { n: 4, d: 16, len: 0.4 } },
      { to: 16, w4: 4, w5: 4, dowel: { n: 6, d: 16, len: 0.4 } },
      { to: 18, w4: 2, w5: 10, dowel: { n: 4, d: 20, len: 0.45 } },
      { to: 20, w4: 0, w5: 14, dowel: { n: 5, d: 20, len: 0.45 } },
    ],
    spiral: { wire: 4.0, endLen: 0.33, endStep: 0.065, nearLen: 0.66, nearStep: 0.08, midStep: 0.17 },
    lift: 0.207,
  },
  S26: {
    key: "S26",
    label: "[ ]",
    menu: "S-26",
    size: "0.26x0.26",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 20,
    geo: { sq: true, B: 260, ch: 20, dIn: 50, pat: { 8: { row: ["L0","L1","R1","R0"] } } }, // เสาสี่เหลี่ยมมุมตัด 20 มม.; dIn = ระยะเหล็กเดือยจากผิวแผ่น
    shoulder: false,
    // ตารางลวด PC: Excel 1 ส.ค. 2569 • เหล็กเชื่อมหัวเพลท: ตารางที่ผู้ใช้ส่ง 7 พ.ย. 2569 (ยาวเป็นเมตร)
    rules: [
      { to: 14, w4: 2, w5: 6, dowel: { n: 5, d: 16, len: 0.4 } },
      { to: 16, w4: 2, w5: 8, dowel: { n: 6, d: 16, len: 0.4 } },
      { to: 18, w4: 0, w5: 14, dowel: { n: 5, d: 20, len: 0.4 } },
      { to: 20, w4: 0, w5: 16, dowel: { n: 6, d: 20, len: 0.4 } },
    ],
    spiral: { wire: 4.0, endLen: 0.39, endStep: 0.06, nearLen: 0.78, nearStep: 0.075, midStep: 0.19 },
    lift: 0.207,
  },
  S30: {
    key: "S30",
    label: "[ ]",
    menu: "S-30",
    size: "0.30x0.30",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 20,
    geo: { sq: true, B: 300, ch: 20, dIn: 55, pat: { 10: { row: ["L0","L1","L2","R2","R0"] } } }, // เสาสี่เหลี่ยมมุมตัด 20 มม.; dIn = ระยะเหล็กเดือยจากผิวแผ่น
    shoulder: false,
    // ตารางลวด PC: Excel 1 ส.ค. 2569 • เหล็กเชื่อมหัวเพลท: ตารางที่ผู้ใช้ส่ง 7 พ.ย. 2569 (ยาวเป็นเมตร)
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
    label: "[ ]",
    menu: "S-35",
    size: "0.35x0.35",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 20,
    geo: { sq: true, B: 350, ch: 20, dIn: 55, pat: { 14: { row: ["L0","L1","L2","R2","R0"], extra: [["L0",1],["R0",1]] } } }, // เสาสี่เหลี่ยมมุมตัด 20 มม.; dIn = ระยะเหล็กเดือยจากผิวแผ่น
    shoulder: false,
    // ตารางลวด PC: Excel 1 ส.ค. 2569 • เหล็กเชื่อมหัวเพลท: ตารางที่ผู้ใช้ส่ง 7 พ.ย. 2569 (ยาวเป็นเมตร)
    rules: [
      { to: 16, w4: 0, w5: 14, dowel: { n: 5, d: 20, len: 0.45 } },
      { to: 18, w4: 0, w5: 18, dowel: { n: 7, d: 20, len: 0.45 } },
      { to: 20, w4: 0, w5: 22, dowel: { n: 8, d: 20, len: 0.45 } },
    ],
    spiral: { wire: 4.0, endLen: 0.525, endStep: 0.045, nearLen: 1.05, nearStep: 0.06, midStep: 0.15 },
    lift: 0.207,
  },
  T40: {
    key: "T40",
    label: "I-40",
    size: "0.40x0.40",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 20,
    geo: { B: 400, f: 110, c: 120, dg: 120, tw: 160, two: true },
    shoulder: false,
    // ตารางลวด PC: Excel 1 ส.ค. 2569 • เหล็กเชื่อมหัวเพลท: ตารางผู้ใช้ 7 พ.ย. 2569 ตัดสั้นลง 1 ซม. • ปลอก/ขนาดจาก 40.dxf
    rules: [
      { to: 14, w4: 0, w5: 14, dowel: { n: 5, d: 20, len: 0.45 } },
      { to: 16, w4: 0, w5: 16, dowel: { n: 6, d: 20, len: 0.45 } },
      { to: 18, w4: 0, w5: 18, dowel: { n: 5, d: 25, len: 0.5 } },
      { to: 20, w4: 0, w5: 20, dowel: { n: 6, d: 25, len: 0.5 } },
    ],
    spiral: { wire: 4.0, endLen: 0.6, endStep: 0.035, nearLen: 1.2, nearStep: 0.08, midStep: 0.2 },
    lift: 0.207,
  },
  S40: {
    key: "S40",
    label: "[ ]",
    menu: "S-40",
    size: "0.40x0.40",
    std: "TIS 396-2549",
    minL: 1,
    maxL: 20,
    geo: { sq: true, B: 400, ch: 20, dIn: 55, two: true },
    shoulder: false,
    // ตารางลวด PC: Excel 1 ส.ค. 2569 • เหล็กเชื่อมหัวเพลท: ตารางผู้ใช้ 7 พ.ย. 2569 ตัดสั้นลง 1 ซม. • ปลอก/ขนาดจาก 40.dxf
    rules: [
      { to: 14, w4: 0, w5: 18, dowel: { n: 5, d: 25, len: 0.5 } },
      { to: 16, w4: 0, w5: 20, dowel: { n: 5, d: 25, len: 0.5 } },
      { to: 18, w4: 0, w5: 24, dowel: { n: 6, d: 25, len: 0.5 } },
      { to: 20, w4: 0, w5: 28, dowel: { n: 7, d: 25, len: 0.5 } },
    ],
    spiral: { wire: 4.0, endLen: 0.6, endStep: 0.04, nearLen: 1.2, nearStep: 0.05, midStep: 0.125 },
    lift: 0.207,
  },
};

// บ่า (ที่รองรับ): ขนาดตามแบบ 0.20 + 0.10 ม. เหล็กในบ่า 3 เส้น DB12
export const SHOULDER_STD = { a: 0.2, b: 0.1, bars: 3, d: 12, cover: 0.05 }; // เหล็ก 3 เส้นเว้นเท่ากัน: ระยะหุ้ม 0.05 ที่ปลาย ระยะเหล็ก 0.05 (0.05, 0.10, 0.15 จากขอบบ่า)

// ===== เสามาตรฐานโรงงาน (เพิ่มแยกจาก มอก. — ห้ามแก้ T*/S* ด้านบน) =====
// หน้าตัด: ยึดตามเส้นบอกระยะใน "แบบโรงงาน.dxf" ทั้งหมด (9 พ.ย. 2569) B,f,c,dg,tw มม. (ลาด = (B−2f−c)/2) พื้นที่ไม่หักบัว
// วัสดุ (ลวด ปลอก เหล็กเดือย แผ่นเหล็ก): I-15/18/22/26 ยึดตามไฟล์ บ่อตะกั่ว • I-30/35 (และสี่เหลี่ยม/หกเหลี่ยม) ยึดตาม แบบโรงงาน.dxf (ผู้ใช้สั่ง)
// cy = ลวดห่างผิวแนวตั้ง, ex = ลวดแรกห่างขอบข้าง, wp = ระยะระหว่างลวด (มม.) • plate = ความหนาแผ่นเหล็กหัวต่อ (มม.) • fac = มาตรฐานโรงงาน
// dowel: { n, d (มม.), len (ม.), k: "DB" | "RB" } • rows = แยกชนิดแถวบน/ล่าง (เช่น I-22: บน 2-RB9 ล่าง 2-DB12 ยาว 0.40)
const FAC = { std: "มาตรฐานโรงงาน", stdTh: "โรงงาน", fac: true, shoulder: false, extras: false, lift: 0.207, minL: 1 };
const RB9 = { n: 4, d: 9, len: 0.3, k: "RB" }, DB12x5 = { n: 5, d: 12, len: 0.3 }, DB16x5 = { n: 5, d: 16, len: 0.4 };
const MIX22 = { n: 4, d: 12, len: 0.4, k: "DB", rows: { top: { d: 9, k: "RB", len: 0.3 }, bot: { d: 12, k: "DB", len: 0.4 } } };
const DB12x4L = { n: 4, d: 12, len: 0.4 };
Object.assign(PILE_SECTIONS, {
  // I-15: บ่อตะกั่ว ยาว 1–5 ม. ลวด 3 เส้น • 6–10 ม. ลวด 4 เส้น (คำขอจะระบุจำนวนลวด 3 หรือ 4 เส้น) ปลอก 4-Ø2.5@0.075 / 4-Ø2.5@0.15
  F15: { ...FAC, key: "F15", label: "I-15", size: "0.15x0.15", maxL: 10, plate: 5, geo: { B: 150, f: 25, c: 70, dg: 50, tw: 50, cy: 20, ex: 25, wp: 35 },
    rules: [{ to: 5, w4: 3, w5: 0, wires: 3, dowel: RB9 }, { to: 5, w4: 4, w5: 0, wires: 4, dowel: RB9 }, { to: 10, w4: 4, w5: 0, wires: 4, dowel: RB9 }],
    spiral: { wire: 2.5, endLen: 0.3, endStep: 0.075, nearLen: 0.6, nearStep: 0.15, midStep: 0.3 } },
  // I-18: บ่อตะกั่ว ลวด 1–10 ม. 4 เส้น • 11–12 ม. 6 เส้น (4 มม.) เหล็กเดือย 4-RB9×0.30 แผ่น 5 มม. ปลอก 5-Ø2.5@0.06 (0.30) / 5-Ø2.5@0.12 (0.60) / @0.30
  F18: { ...FAC, key: "F18", label: "I-18", size: "0.18x0.18", maxL: 12, plate: 5, geo: { B: 180, f: 35, c: 70, dg: 60, tw: 60, cy: 25, ex: 35, wp: 35 },
    rules: [{ to: 10, w4: 4, w5: 0, dowel: RB9 }, { to: 12, w4: 6, w5: 0, dowel: RB9 }],
    spiral: { wire: 2.5, endLen: 0.3, endStep: 0.06, nearLen: 0.6, nearStep: 0.12, midStep: 0.3 } },
  // I-22: บ่อตะกั่ว ลวด 1–11 ม. 4 มม. ×6 • 12–14 ม. 4 มม. ×4 + 5 มม. ×2 เหล็กเดือย 2-RB9×0.30 + 2-DB12×0.40 แผ่น 6 มม. ปลอก 2x7-Ø2.8@0.06 (0.40) / 4-Ø2.8@0.20 (0.80) / @0.30
  F22: { ...FAC, key: "F22", label: "I-22", size: "0.22x0.22", maxL: 14, plate: 6, geo: { B: 220, f: 47, c: 74, dg: 70, tw: 80, cy: 30, ex: 40, wp: 35 },
    rules: [{ to: 11, w4: 6, w5: 0, dowel: MIX22 }, { to: 14, w4: 4, w5: 2, dowel: MIX22 }],
    spiral: { wire: 2.8, endLen: 0.4, endStep: 0.06, nearLen: 0.8, nearStep: 0.2, midStep: 0.3 } },
  // I-26: บ่อตะกั่ว ลวด 1–12 ม. 4 มม. ×8 • 13–14 ม. 4 มม. ×6 + 5 มม. ×2 เหล็กเดือย 4-DB12×0.40 แผ่น 6 มม. ปลอก 2x7-Ø2.8@0.06 (0.40) / 6-Ø2.8@0.135 (0.80) / @0.30
  F26: { ...FAC, key: "F26", label: "I-26", size: "0.26x0.26", maxL: 14, plate: 6, geo: { B: 260, f: 55, c: 90, dg: 90, tw: 80, cy: 35, ex: 45, wp: 40 },
    rules: [{ to: 12, w4: 8, w5: 0, dowel: DB12x4L }, { to: 14, w4: 6, w5: 2, dowel: DB12x4L }],
    spiral: { wire: 2.8, endLen: 0.4, endStep: 0.06, nearLen: 0.8, nearStep: 0.135, midStep: 0.3 } },
  // I-30, I-35: แบบโรงงาน.dxf (ปลอก CD3.0 @0.05 / 0.15 / 0.25) I-35 โซนปลาย/ใกล้ยังไม่พบในแบบ ใช้ 0.50/1.00 เท่า I-30 (รอยืนยัน)
  F30: { ...FAC, key: "F30", label: "I-30", size: "0.30x0.30", maxL: 14, plate: 8, geo: { B: 300, f: 55, c: 110, dg: 105, tw: 90, cy: 35, ex: 35, wp: 35 },
    rules: [{ to: 12, w4: 4, w5: 4, dowel: DB12x5 }, { to: 14, w4: 2, w5: 6, dowel: DB12x5 }],
    spiral: { wire: 3, endLen: 0.5, endStep: 0.05, nearLen: 1, nearStep: 0.15, midStep: 0.25 } },
  F35: { ...FAC, key: "F35", label: "I-35", size: "0.35x0.35", maxL: 14, plate: 8, geo: { B: 350, f: 70, c: 140, dg: 120, tw: 110, cy: 35, ex: 35, wp: 35 },
    rules: [{ to: 11, w4: 0, w5: 8, dowel: DB16x5 }, { to: 14, w4: 4, w5: 6, dowel: DB16x5 }],
    spiral: { wire: 3, endLen: 0.5, endStep: 0.05, nearLen: 1, nearStep: 0.15, midStep: 0.25 } },
});

// ชื่อผู้ออกแบบ/เขียนแบบ/อนุมัติ ในตารางชื่อแบบ (คงเดิมทุกแบบ)
export const TITLE_BLOCK = {
  company: "บริษัท ร่วมมิตรคอนกรีต(บางเลน) จำกัด",
  companyEn: "RUAMMITR CONCRETE (BANGLAN) COMPANY LIMITED",
  designBy: "ชัยพร สุรังสิมันต์กุล",
  drawBy: "ชัยพร สุรังสิมันต์กุล",
  approveBy: "ชัยพร สุรังสิมันต์กุล",
  approveByTh: "ชัยพร สุรังสิมันต์กุล", // ใช้ในช่องเซ็นของใบ blow count
  licence: "สย.8954",
};
