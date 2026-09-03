// ---------- Reference data (extracted from Bang Len plate/wire formula workbook) ----------

export const REBAR_WEIGHT_PER_M = { // kg/m, มอก. 24 ตามมาตรฐาน SD40/SR24
  RB6: 0.222, RB9: 0.499,
  DB12: 0.888, DB16: 1.58, DB20: 2.47, DB25: 3.85,
};

export const PLATE_WEIGHT_PER_PIECE = { // kg/แผ่น ตามขนาดเสา (คอลัมน์ R)
  'อ18': 0.936, 'อ22': 2.028, 'อ26': 2.720, 'อ30': 4.171, 'อ35': 5.899,
  'อม18': 2.489, 'อม22': 3.422, 'อม26': 4.38, 'อม30': 6.14, 'อม35': 8.641, 'อม40': 10.78,
  'อส22': 2.444, 'อส26': 5.235, 'อส30': 6.57, 'อส35': 9.662,
  'อสม15': null, 'อสม18': 2.489, 'อสม22': 3.915, 'อสม26': 5.235, 'อสม30': 6.57, 'อสม35': 9.662, 'อสม40': 11.585,
};

// ความหนาแผ่นเพลท (มม.) ต่อขนาดเสา — ค่าเริ่มต้นทั้งหมด 9mm. ตามไฟล์ต้นฉบับ ("สรุปแผ่นเพลท 9 mm.") แก้ไขได้ในหน้าตั้งค่าคงที่
export const PLATE_THICKNESS_MM = Object.fromEntries(Object.keys(PLATE_WEIGHT_PER_PIECE).map(k => [k, 9]));
// ขนาดเสาโรงงานบางขนาดใช้เพลทหนา 8mm./6mm. ตามไฟล์อ้างอิงจริง
PLATE_THICKNESS_MM['อ30'] = 8; PLATE_THICKNESS_MM['อ35'] = 8; PLATE_THICKNESS_MM['อส26'] = 8;
PLATE_THICKNESS_MM['อ22'] = 6; PLATE_THICKNESS_MM['อ26'] = 6; PLATE_THICKNESS_MM['อส22'] = 6;

// น้ำหนักเหล็กหนวดกุ้งต่อชิ้น (kg/ชิ้น) ตามขนาดเสา — เชื่อมติดหัวเพลท จำนวนชิ้น = จำนวนแผ่นเพลทที่คำนวณได้
export const WHISKER_WEIGHT_PER_PIECE = {
  'อ18': 0.7, 'อ22': 1.24, 'อ26': 1.1, 'อ30': 1.38, 'อ35': 3.23,
  'อม18': 1.1, 'อม22': 1.1, 'อม26': 1.65, 'อม30': 3.23, 'อม35': 3.88, 'อม40': 5.65,
  'อส22': 1.24, 'อส26': 1.55, 'อส30': 2.59, 'อส35': 5.67,
  'อสม15': null, 'อสม18': 1.38, 'อสม22': 2.59, 'อสม26': 3.23, 'อสม30': 3.88, 'อสม35': 5.67, 'อสม40': 9.83,
};

// ชนิด/ขนาด/ความยาวเหล็กหนวดกุ้งที่ใช้จริงตามขนาดเสา
export const WHISKER_REBAR_SPEC = {
  'อ26': 'DB12x0.31m.', 'อ30': 'DB12x0.31m.', 'อ35': 'DB16x0.41m.',
  'อม18': 'DB20x0.46m.', 'อม22': 'DB25x0.51m.', 'อม26': 'DB25x0.51m.',
};

// น้ำหนักลวด PC ต่อเมตรต่อเส้น (กก./ม./เส้น) ตาม มอก. 95 — PC4=ลวด 4mm, PC5=ลวด 5mm, PC7=ลวด 7mm
export const PC_WIRE_KG_PER_M = { 4: 0.102, 5: 0.161, 7: 0.314 };

// จำนวนเส้นลวด PC ต่อเสา 1 ต้น แยกตามขนาดเสาและช่วงความยาว (min/max เป็นค่าคั่นกลางระหว่าง label ต้นฉบับ)
export const PC_WIRE_TABLE = [
  { id: 0, diam: 'อ18', pc4: 4, pc5: 0 },
  { id: 1, diam: 'อ22', pc4: 6, pc5: 0 },
  { id: 2, diam: 'อ26', pc4: 8, pc5: 0 },
  { id: 3, diam: 'อ30', max: 12.5, pc4: 4, pc5: 4 },
  { id: 4, diam: 'อ30', min: 12.5, pc4: 2, pc5: 6 },
  { id: 5, diam: 'อ35', max: 11.5, pc4: 0, pc5: 8 },
  { id: 6, diam: 'อ35', min: 11.5, pc4: 4, pc5: 6 },
  { id: 7, diam: 'อม18', max: 10.5, pc4: 2, pc5: 2 },
  { id: 8, diam: 'อม18', exact: 11, pc4: 6, pc5: 0 },
  { id: 9, diam: 'อม18', exact: 12, pc4: 4, pc5: 2 },
  { id: 10, diam: 'อม22', max: 12.5, pc4: 4, pc5: 2 },
  { id: 11, diam: 'อม22', min: 12.5, pc4: 8, pc5: 0 },
  { id: 12, diam: 'อม26', max: 12.5, pc4: 0, pc5: 6 },
  { id: 13, diam: 'อม26', min: 12.5, pc4: 4, pc5: 4 },
  { id: 14, diam: 'อม30', pc4: 2, pc5: 6 },
  { id: 15, diam: 'อม35', max: 11.5, pc4: 2, pc5: 8 },
  { id: 16, diam: 'อม35', min: 11.5, pc4: 0, pc5: 10 },
  { id: 17, diam: 'อม40', pc4: 0, pc5: 14 },
  { id: 18, diam: 'อส22', pc4: 0, pc5: 6 },
  { id: 19, diam: 'อส26', pc4: 2, pc5: 6 },
  { id: 20, diam: 'อส30', pc4: 0, pc5: 10 },
  { id: 21, diam: 'อสม15', pc4: 0, pc5: 0 },
  { id: 22, diam: 'อสม18', pc4: 6, pc5: 0 },
  { id: 23, diam: 'อสม22', max: 12.5, pc4: 0, pc5: 6 },
  { id: 24, diam: 'อสม22', min: 12.5, pc4: 4, pc5: 4 },
  { id: 25, diam: 'อสม26', pc4: 2, pc5: 6 },
  { id: 26, diam: 'อสม30', pc4: 0, pc5: 10 },
  { id: 27, diam: 'อสม35', pc4: 0, pc5: 14 },
  { id: 28, diam: 'อสม40', pc4: 0, pc5: 18 },
];

export function isMok(diam) {
  return diam.startsWith('อม') || diam.startsWith('อสม');
}

export function diamLabel(diam) {
  let series, size, tag;
  if (diam.startsWith('อสม')) { series = 'S'; size = diam.slice(3); tag = 'มอก.'; }
  else if (diam.startsWith('อส')) { series = 'S'; size = diam.slice(2); tag = 'โรงงาน'; }
  else if (diam.startsWith('อม')) { series = 'I'; size = diam.slice(2); tag = 'มอก.'; }
  else if (diam.startsWith('อ')) { series = 'I'; size = diam.slice(1); tag = 'โรงงาน'; }
  else return diam;
  return series + '-' + size + ' ' + tag;
}

export function pcConfigLabel(c) {
  const d = diamLabel(c.diam);
  if (c.exact !== undefined) return d + ' ยาว = ' + c.exact + ' ม.';
  if (c.max !== undefined) return d + ' ยาว < ' + c.max + ' ม.';
  if (c.min !== undefined) return d + ' ยาว > ' + c.min + ' ม.';
  return d + ' (ทุกความยาว)';
}

// น้ำหนักลวดปลอกต่อเสา 1 ต้น (kg/ต้น) แยกตามขนาดเสา (diam) และความยาวปัดลง (E)
export const STIRRUP_TABLE = { // กก./ต้น ตามขนาดเสาและความยาวปัดลง
  'อ26': { 6: 2.61, 7: 2.784, 8: 2.871, 9: 3.132, 10: 3.306, 11: 3.48, 12: 3.654, 13: 3.828, 14: 4.002 },
  'อ30': { 4: 3.08, 5: 3.3, 6: 3.52, 7: 3.74, 8: 3.96, 9: 4.07, 10: 4.4, 11: 4.4, 12: 4.84, 13: 5.06, 14: 5.28, 18: 7.7 },
  'อ35': { 6: 5.27, 7: 5.58, 8: 5.89, 9: 6.2, 10: 6.2, 11: 6.82, 12: 7.13, 13: 7.44, 14: 7.75 },
  'อส22': { 5: 1.476, 6: 1.771, 7: 1.919, 8: 1.919, 9: 2.214, 10: 2.362, 11: 2.509, 12: 2.657, 13: 2.804, 14: 2.952 },
  'อส26': { 6: 4.56, 7: 4.864, 8: 5.168, 9: 5.472, 10: 5.776, 11: 6.08, 12: 6.384, 13: 6.688, 14: 6.992 },
  'อส30': { 6: 6.37, 7: 6.734, 8: 7.098, 9: 7.462, 10: 7.826, 11: 8.19, 12: 8.918, 13: 9.282, 14: 9.646 },
  'อม18': { 3: 1.534, 4: 1.711, 5: 1.888, 6: 2.242, 7: 2.478, 8: 2.655, 9: 2.95, 10: 3.068, 11: 3.422, 12: 3.422 },
  'อม22': { 6: 2.7, 7: 2.7, 8: 3.15, 9: 3.45, 10: 3.45, 11: 3.45, 12: 3.9, 13: 3.9, 14: 3.9 },
  'อม26': { 5: 3.66, 6: 4.136, 7: 4.324, 8: 4.512, 9: 4.794, 10: 4.982, 11: 4.982, 12: 5.452, 13: 5.64, 14: 5.875 },
  'อม30': { 6: 5.396, 7: 5.822, 8: 6.248, 9: 6.674, 10: 7.1, 11: 7.1, 12: 8.094, 13: 8.094, 14: 8.52, 18: 12.78 },
  'อม35': { 6: 7.824, 7: 8.476, 8: 8.802, 9: 9.291, 10: 9.78, 11: 9.943, 12: 10.595, 13: 10.921, 14: 11.736 },
  'อม40': { 8: 14.95, 9: 15.925, 10: 16.575, 12: 18.2, 13: 19.175, 14: 19.825 },
  'อสม18': { 6: 2.193, 7: 2.397, 8: 2.601, 9: 2.805, 10: 2.958, 11: 3.162, 12: 3.366, 13: 3.57, 14: 3.774 },
  'อสม22': { 5: 3.567, 6: 4.059, 7: 4.059, 8: 4.305, 9: 4.797, 10: 4.797, 11: 5.412, 12: 5.904, 13: 5.904, 14: 6.396 },
  'อสม26': { 6: 5.168, 7: 5.624, 8: 5.928, 9: 5.928, 10: 6.688, 11: 6.992, 12: 7.296, 13: 7.904, 14: 7.904 },
  'อสม30': { 3: 6.916, 6: 8.008, 7: 8.372, 8: 9.1, 9: 9.464, 10: 10.192, 11: 10.556, 12: 11.284, 13: 11.648, 14: 12.376 },
  'อสม35': { 6: 11.118, 7: 11.772, 8: 12.426, 9: 13.08, 10: 13.734, 11: 14.388, 12: 15.042, 13: 15.696, 14: 16.132 },
  'อสม40': { 6: 17.886, 7: 18.97, 8: 20.054, 9: 21.138, 10: 22.222, 11: 23.306, 12: 24.39, 13: 25.474, 14: 26.558 },
};

// ขนาดลวดปลอกที่ใช้จริงต่อขนาดเสา (มม.) — ตรวจสอบตรงกับตารางน้ำหนักด้านบนทุกค่า
export const STIRRUP_WIRE_MM = {
  'อ26': 2.8, 'อ30': 2.8, 'อ35': 3.0,
  'อม18': 2.8, 'อม22': 2.8, 'อม26': 2.8, 'อม30': 3.0, 'อม35': 3.0, 'อม40': 4.0,
  'อส22': 3.0, 'อส26': 4.0, 'อส30': 4.0,
  'อสม18': 3.0, 'อสม22': 4.0, 'อสม26': 4.0, 'อสม30': 4.0, 'อสม35': 4.0, 'อสม40': 4.0,
};

function findPcConfig(diam, length, table) {
  const configs = (table || PC_WIRE_TABLE).filter(c => c.diam === diam);
  if (!configs.length) return null;
  for (const c of configs) {
    if (c.exact !== undefined && Math.abs(length - c.exact) < 0.01) return c;
  }
  for (const c of configs) {
    if (c.exact !== undefined) continue;
    if (c.max !== undefined && length >= c.max) continue;
    if (c.min !== undefined && length < c.min) continue;
    return c;
  }
  return null;
}

// ---------- Per-row parsing (mirrors the workbook's per-row formula columns) ----------
export function parsePileRow(code, name, qty, config) {
  code = String(code || '').trim();
  name = String(name || '').trim();
  qty = Number(qty) || 0;
  const rebarWeights = (config && config.rebarWeights) || REBAR_WEIGHT_PER_M;
  const plateWeights = (config && config.plateWeights) || PLATE_WEIGHT_PER_PIECE;
  const whiskerWeights = (config && config.whiskerWeights) || WHISKER_WEIGHT_PER_PIECE;
  const warnings = [];
  const dashIdx = code.indexOf('-');
  if (!code || dashIdx < 1) return { skip: true, reason: 'อ่านรหัสสินค้าไม่ได้ (ไม่มีรูปแบบ "...-ความยาว...")' };
  const diam = code.substring(1, dashIdx);
  const lenStr = code.substring(dashIdx + 1, dashIdx + 5);
  const length = parseFloat(lenStr) / 100;
  if (!isFinite(length) || length <= 0) return { skip: true, reason: 'อ่านความยาวจากรหัสไม่ได้: "' + code + '"' };
  const roundedLen = Math.floor(length + 1e-6);
  const totalLength = length * qty;

  // rebar (DB/RB) — a name can list more than one spec, e.g. "4DB20x9.00 ม.+2DB20x5.00 ม." (case-insensitive, x/X/×, ม./m./เมตร, optional dot/spaces)
  const rebarMatches = [...name.matchAll(/(\d+)[\s-]*(DB|RB)[\s-]*(\d+)\s*[xX×*@]\s*([\d.]+)\s*(?:ม\.?|m\.?|เมตร|เม\.?)/gi)];
  const rebars = rebarMatches.map(m => {
    const count = Number(m[1]), type = m[2].toUpperCase(), size = Number(m[3]), each = Number(m[4]);
    const key = type + size;
    const unitW = rebarWeights[key];
    if (unitW == null) warnings.push('ไม่ทราบน้ำหนักเหล็ก ' + key + ' (รหัส ' + code + ')');
    return {
      spec: type + size + 'x' + each.toFixed(2) + ' ม.',
      pieces: count * qty,
      weightKg: unitW != null ? count * qty * each * unitW : 0,
    };
  });

  // joint plate
  const isWelded = /ท่อนเชื่อม/.test(name);
  const isTwoSide = /2\s*ข้าง/.test(name);
  const plateMultiplier = isTwoSide ? 2 : (isWelded ? 1 : 0);
  const plateCount = qty * plateMultiplier;
  let plate = null;
  let whisker = null;
  let collar = null;
  if (plateCount > 0) {
    const w = plateWeights[diam];
    if (w == null) warnings.push('ไม่ทราบน้ำหนักแผ่นเพลทสำหรับขนาดเสา ' + diam + ' (รหัส ' + code + ')');
    plate = { diam, count: plateCount, weightKg: w != null ? plateCount * w : 0 };
    const ww = whiskerWeights[diam];
    if (ww == null) warnings.push('ไม่ทราบน้ำหนักเหล็กหนวดกุ้งสำหรับขนาดเสา ' + diam + ' (รหัส ' + code + ')');
    const whiskerSpecs = (config && config.whiskerSpecs) || WHISKER_REBAR_SPEC;
    whisker = { diam, count: plateCount, weightKg: ww != null ? plateCount * ww : 0, spec: whiskerSpecs[diam] || null };
    if (isMok(diam)) collar = { diam, count: plateCount };
  }

  // PC wire — a name can state an explicit override, e.g. "4+8 PcWire 5 มม." (= 12 wires of 5mm for this pile)
  const specialPcMatch = name.match(/(\d+)\s*(?:[+&]|and)?\s*(\d+)?\s*(?:p\.?\s*c\.?[-_.\s]*wire|pcw|pc[-_]?w)\s*(\d+(?:\.\d+)?)\s*(?:มม|mm)\.?/i);
  const pcWireTable = (config && config.pcWireTable) || PC_WIRE_TABLE;
  const pcKgPerM = (config && config.pcWireKgPerM) || PC_WIRE_KG_PER_M;
  let pc = null;
  if (specialPcMatch) {
    const count = Number(specialPcMatch[1]) + Number(specialPcMatch[2] || 0);
    const mm = Number(specialPcMatch[3]);
    const kgPerM = pcKgPerM[mm];
    if (kgPerM == null) {
      warnings.push('ไม่ทราบน้ำหนักลวด PC.wire ขนาด ' + mm + ' มม. (รหัส ' + code + ') — ข้ามส่วนลวด PC.wire ของแถวนี้');
    } else {
      const weightKg = totalLength * count * kgPerM;
      pc = {
        diam,
        pc4Kg: mm === 4 ? weightKg : 0,
        pc5Kg: mm === 5 ? weightKg : 0,
        pc7Kg: mm === 7 ? weightKg : 0,
      };
    }
  } else {
    const pcConfig = findPcConfig(diam, length, pcWireTable);
    if (!pcConfig) {
      warnings.push('ไม่พบสูตรลวด PC.wire สำหรับขนาดเสา ' + diam + ' ยาว ' + length + ' ม. (รหัส ' + code + ') — ข้ามส่วนลวด PC.wire ของแถวนี้');
    } else {
      pc = {
        diam,
        pc4Kg: totalLength * pcConfig.pc4 * pcKgPerM[4],
        pc5Kg: totalLength * pcConfig.pc5 * pcKgPerM[5],
        pc7Kg: 0,
      };
    }
  }

  // stirrup wire
  const stirrupTableAll = (config && config.stirrupTable) || STIRRUP_TABLE;
  const stirrupTable = stirrupTableAll[diam];
  const perPile = stirrupTable ? stirrupTable[roundedLen] : undefined;
  let stirrup = null;
  if (perPile == null) {
    warnings.push('ไม่พบสูตรลวดปลอกสำหรับขนาดเสา ' + diam + ' ยาว ' + roundedLen + ' ม. (รหัส ' + code + ') — ข้ามส่วนลวดปลอกของแถวนี้');
  } else {
    stirrup = { diam, weightKg: perPile * qty };
  }

  return { skip: false, code, name, qty, diam, length, totalLength, isWelded, rebars, plate, whisker, collar, pc, stirrup, warnings };
}

export function calcPileList(inputRows, config) {
  const rebarAgg = new Map(), plateAgg = new Map(), whiskerAgg = new Map(), collarAgg = new Map(), pcAgg = new Map(), stirrupAgg = new Map();
  const pileAgg = new Map();   // สรุปจำนวนต้น + ความยาวรวม แยกตาม ขนาดเสา × ความยาว × ท่อนเดียว/ท่อนต่อเชื่อม
  const warnings = [];
  let totalPiles = 0, usedRows = 0, skippedRows = [];

  for (const r of inputRows) {
    const res = parsePileRow(r.code, r.name, r.qty, config);
    if (res.skip) { skippedRows.push({ code: r.code, name: r.name, reason: res.reason }); continue; }
    usedRows++;
    totalPiles += res.qty;
    warnings.push(...res.warnings);

    // สะสมจำนวนต้น + ความยาวรวม (ความยาว × จำนวน) แยกตามขนาดเสา × ความยาว × ท่อนเดียว/ท่อนต่อเชื่อม
    // (แยกท่อนเดียว/ท่อนต่อเชื่อมไว้ เพราะบางขนาดเสาใช้สูตรปูนต่างกันระหว่างสองแบบนี้)
    {
      const pk = res.diam + '|' + res.length.toFixed(2) + '|' + (res.isWelded ? 'W' : 'S');
      const pe = pileAgg.get(pk) || { diam: res.diam, length: res.length, isWelded: res.isWelded, qty: 0, totalLength: 0 };
      pe.qty += res.qty;
      pe.totalLength += res.totalLength;
      pileAgg.set(pk, pe);
    }

    if (res.rebars.length) {
      for (const rb of res.rebars) {
        const e = rebarAgg.get(rb.spec) || { spec: rb.spec, pieces: 0, weightKg: 0 };
        e.pieces += rb.pieces; e.weightKg += rb.weightKg;
        rebarAgg.set(rb.spec, e);
      }
    }
    if (res.plate) {
      const e = plateAgg.get(res.plate.diam) || { diam: res.plate.diam, count: 0, weightKg: 0 };
      e.count += res.plate.count; e.weightKg += res.plate.weightKg;
      plateAgg.set(res.plate.diam, e);
    }
    if (res.whisker) {
      const e = whiskerAgg.get(res.whisker.diam) || { diam: res.whisker.diam, count: 0, weightKg: 0, spec: res.whisker.spec };
      e.count += res.whisker.count; e.weightKg += res.whisker.weightKg;
      whiskerAgg.set(res.whisker.diam, e);
    }
    if (res.collar) {
      const e = collarAgg.get(res.collar.diam) || { diam: res.collar.diam, count: 0 };
      e.count += res.collar.count;
      collarAgg.set(res.collar.diam, e);
    }
    if (res.pc) {
      const e = pcAgg.get(res.pc.diam) || { diam: res.pc.diam, pc4Kg: 0, pc5Kg: 0, pc7Kg: 0 };
      e.pc4Kg += res.pc.pc4Kg; e.pc5Kg += res.pc.pc5Kg; e.pc7Kg += res.pc.pc7Kg;
      pcAgg.set(res.pc.diam, e);
    }
    if (res.stirrup) {
      const e = stirrupAgg.get(res.stirrup.diam) || { diam: res.stirrup.diam, weightKg: 0 };
      e.weightKg += res.stirrup.weightKg;
      stirrupAgg.set(res.stirrup.diam, e);
    }
  }

  const sortByKey = (arr, k) => arr.sort((a, b) => String(a[k]).localeCompare(String(b[k]), 'th'));
  return {
    totalRows: inputRows.length,
    usedRows,
    totalPiles,
    skippedRows,
    warnings: [...new Set(warnings)],
    piles: [...pileAgg.values()].sort((a, b) => String(a.diam).localeCompare(String(b.diam), 'th') || a.length - b.length || (a.isWelded ? 1 : 0) - (b.isWelded ? 1 : 0)),
    rebar: sortByKey([...rebarAgg.values()], 'spec'),
    plates: sortByKey([...plateAgg.values()], 'diam'),
    whisker: sortByKey([...whiskerAgg.values()], 'diam'),
    collar: sortByKey([...collarAgg.values()], 'diam'),
    pc: sortByKey([...pcAgg.values()], 'diam'),
    stirrup: sortByKey([...stirrupAgg.values()], 'diam'),
  };
}

// ---------- Minimal in-browser XLSX reader (zip + inflate + sheet1 XML) ----------
async function unzip(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
  if (eocd < 0) throw new Error('ไฟล์ไม่ใช่ .xlsx ที่ถูกต้อง');
  const cdOffset = dv.getUint32(eocd + 16, true);
  const cdEntries = dv.getUint16(eocd + 10, true);
  const entries = [];
  let ptr = cdOffset;
  for (let i = 0; i < cdEntries; i++) {
    const compMethod = dv.getUint16(ptr + 10, true);
    const compSize = dv.getUint32(ptr + 20, true);
    const nameLen = dv.getUint16(ptr + 28, true);
    const extraLen = dv.getUint16(ptr + 30, true);
    const commentLen = dv.getUint16(ptr + 32, true);
    const localOffset = dv.getUint32(ptr + 42, true);
    const name = new TextDecoder().decode(buf.subarray(ptr + 46, ptr + 46 + nameLen));
    entries.push({ name, compMethod, compSize, localOffset });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  async function extract(entry) {
    const lp = entry.localOffset;
    const nameLen = dv.getUint16(lp + 26, true);
    const extraLen = dv.getUint16(lp + 28, true);
    const dataStart = lp + 30 + nameLen + extraLen;
    const compData = buf.subarray(dataStart, dataStart + entry.compSize);
    if (entry.compMethod === 0) return new TextDecoder('utf-8').decode(compData);
    const stream = new Blob([compData]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const ab = await new Response(stream).arrayBuffer();
    return new TextDecoder('utf-8').decode(ab);
  }
  return { entries, extract };
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  return [...doc.getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join(''));
}

function parseSheetRows(xml, ss) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const rows = [];
  for (const rowEl of doc.getElementsByTagName('row')) {
    const cells = {};
    for (const c of rowEl.getElementsByTagName('c')) {
      const col = c.getAttribute('r').match(/[A-Z]+/)[0];
      const type = c.getAttribute('t');
      const vEl = c.getElementsByTagName('v')[0];
      if (!vEl) continue;
      let val = vEl.textContent;
      if (type === 's') val = ss[parseInt(val)] ?? '';
      cells[col] = val;
    }
    rows.push(cells);
  }
  return rows;
}

export async function readPileListXlsx(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const { entries, extract } = await unzip(buf);
  const ssEntry = entries.find(e => e.name === 'xl/sharedStrings.xml');
  const ss = ssEntry ? parseSharedStrings(await extract(ssEntry)) : [];
  const sheetEntry = entries.find(e => e.name === 'xl/worksheets/sheet1.xml') || entries.find(e => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name));
  if (!sheetEntry) throw new Error('ไม่พบชีทข้อมูลในไฟล์');
  const rows = parseSheetRows(await extract(sheetEntry), ss);

  // find header row: contains something matching รหัส / จำนวน
  let headerRowIdx = -1, colMap = {};
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cells = rows[i];
    const entries2 = Object.entries(cells);
    const codeCol = entries2.find(([, v]) => /รหัส/.test(v));
    const qtyCol = entries2.find(([, v]) => /จำนวน/.test(v));
    const nameCol = entries2.find(([, v]) => /รายการ|ชื่อ/.test(v));
    if (codeCol && qtyCol) {
      headerRowIdx = i;
      colMap = { code: codeCol[0], qty: qtyCol[0], name: nameCol ? nameCol[0] : null };
      break;
    }
  }
  if (headerRowIdx < 0) {
    // fallback: assume A=code, B=name, C=qty, no header
    colMap = { code: 'A', name: 'B', qty: 'C' };
    headerRowIdx = -1;
  }

  const dataRows = [];
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const cells = rows[i];
    const code = cells[colMap.code];
    const qty = cells[colMap.qty];
    if (!code || !qty) continue;
    dataRows.push({ code, name: colMap.name ? (cells[colMap.name] || '') : '', qty });
  }
  return dataRows;
}
