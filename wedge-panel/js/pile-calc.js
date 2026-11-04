// คำนวณข้อมูลแบบเสาเข็ม (ไม่แตะ DOM): แบ่งท่อน เลือกลวด/เหล็กเดือยตามความยาว ปลอกเกลียว บ่า เหล็กเสริมพิเศษ
import { PILE_SECTIONS, SHOULDER_STD } from "./pile-data.js";

const r2 = (v) => Math.round(v * 100) / 100;
export const m2 = (v) => r2(v).toFixed(2);

// กฎลวดตามความยาวท่อน: ช่วงแรกที่ L ≤ to
export function ruleFor(sec, len) {
  return sec.rules.find((r) => len <= r.to + 1e-9) || null;
}

// แบ่งเป็น 2 ท่อนอัตโนมัติ: ท่อนบน = เมตรเต็มครึ่งล่าง (17 ม. → 8 + 9, 19 ม. → 9 + 10)
export function autoSplit(L) {
  const a = Math.floor(L / 2 + 1e-9);
  return [a, r2(L - a)];
}

// input = { section, L, pieces (1|2), split ([a,b] ใส่เอง หรือว่าง), full (แบบเต็ม), joint (มีหัวต่อ), extras [{d,n,len}], shoulder (ระยะจากหัว ม. หรือว่าง), project {pj,ow,lo} }
export function planPile(input) {
  const sec = PILE_SECTIONS[input.section];
  const warn = [];
  if (!sec) return { sec: null, pieces: [], rows: [], warn: ["ยังไม่มีข้อมูลหน้าตัดนี้"], title: "" };
  const joint = input.joint !== false;
  const full = !!input.full;
  const L = r2(+input.L || 0);
  let pieces = [];
  if (full) {
    pieces = [{ full: true, len: null, mid: null }];
  } else {
    if (!(L >= sec.minL && L <= sec.maxL * (input.pieces === 2 ? 2 : 1))) warn.push(`ความยาว ${m2(L)} ม. อยู่นอกช่วง ${m2(sec.minL)}–${m2(sec.maxL * (input.pieces === 2 ? 2 : 1))} ม.`);
    let lens = [L];
    if (input.pieces === 2) {
      const sp = Array.isArray(input.split) && input.split.length === 2 && input.split.every((v) => +v > 0) ? input.split.map((v) => r2(+v)) : autoSplit(L);
      if (Math.abs(sp[0] + sp[1] - L) > 0.005) warn.push(`ความยาวสองท่อนรวม ${m2(sp[0] + sp[1])} ม. ไม่เท่ากับความยาวรวม ${m2(L)} ม.`);
      lens = sp;
    }
    pieces = lens.map((len) => {
      const rule = ruleFor(sec, len);
      if (len < sec.minL || len > sec.maxL) warn.push(`ท่อนยาว ${m2(len)} ม. อยู่นอกช่วง ${m2(sec.minL)}–${m2(sec.maxL)} ม. ของตารางลวด`);
      const s = sec.spiral, ends = 2 * (s.endLen + s.nearLen);
      if (len <= ends) warn.push(`ท่อนยาว ${m2(len)} ม. สั้นเกินกว่าจะมีส่วนกลาง @${m2(s.midStep)}`);
      return { full: false, len, mid: r2(len - ends), rule };
    });
  }
  // เหล็กเสริมพิเศษ: ความยาวว่าง = ยาวเท่าท่อน
  const extras = (input.extras || []).filter((e) => +e.d > 0 && +e.n > 0).map((e) => ({ d: +e.d, n: Math.floor(+e.n), len: +e.len > 0 ? r2(+e.len) : null }));
  extras.forEach((e) => { if (e.n % 2) warn.push(`เหล็กเสริม DB${e.d} ${e.n} เส้น เป็นเลขคี่ จัดวางบน/ล่างไม่เท่ากัน`); });
  // บ่า: อ้างระยะจากหัวเสา (ท่อนบน)
  let shoulder = null;
  if (+input.shoulder > 0) {
    const at = r2(+input.shoulder), top = pieces[0];
    shoulder = { at, ...SHOULDER_STD };
    if (!full && top && at >= top.len) warn.push(`ระยะบ่า ${m2(at)} ม. เกินความยาวท่อนบน ${m2(top.len)} ม.`);
  }
  // ตารางลวด: แถวตามความยาวแต่ละท่อน (ท่อนยาวเท่ากันรวมแถว) หรือทั้งตารางถ้าเป็นแบบเต็ม
  let rows = [];
  if (full) {
    let from = sec.minL;
    rows = sec.rules.map((r) => { const row = { label: `${m2(from)}–${m2(r.to)} m.`, w4: r.w4, w5: r.w5, dowel: r.dowel }; from = r.to + 1; return row; });
  } else {
    const seen = new Set();
    pieces.forEach((p) => { if (!seen.has(p.len)) { seen.add(p.len); rows.push({ label: `${m2(p.len)} m.`, w4: p.rule?.w4 ?? 0, w5: p.rule?.w5 ?? 0, dowel: p.rule?.dowel ?? null }); } });
  }
  const sz = `${sec.label} ${sec.size.replace("x", "x")}`;
  const lenTxt = full ? "1.00-20.00" : m2(L);
  let jt = joint ? (input.pieces === 2 && !full ? `2 ท่อนต่อเชื่อม ${pieces.map((p) => r2(p.len)).join("+")}` : "มีหัวต่อ") : "ไม่มีหัวต่อเชื่อม";
  if (full) jt = "มีหัวต่อ";
  const xt = extras.map((e) => `${e.n}-DB${e.d}x${e.len ? m2(e.len) : (full ? "L" : m2(pieces[0].len))}m.`).join(" ");
  const title = `PC.PILE ${sz}x${lenTxt}m. (${jt})${xt ? " " + xt : ""}${shoulder ? ` มีบ่าที่ระยะ${m2(shoulder.at)}m.` : ""} ${sec.std}`;
  return { sec, full, joint, pieces, extras, shoulder, rows, warn, title, L, project: input.project || {} };
}
