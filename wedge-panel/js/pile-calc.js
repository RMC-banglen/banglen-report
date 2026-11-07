// คำนวณข้อมูลแบบเสาเข็ม (ไม่แตะ DOM): แบ่งท่อน เลือกลวด/เหล็กเดือยตามความยาว ปลอกเกลียว บ่า เหล็กเสริมพิเศษ
import { PILE_SECTIONS, SHOULDER_STD } from "./pile-data.js?v=20261107012041";

const r2 = (v) => Math.round(v * 100) / 100;
export const m2 = (v) => r2(v).toFixed(2);

// กฎลวดตามความยาวท่อน: ช่วงแรกที่ L ≤ to
export function ruleFor(sec, len) {
  return sec.rules.find((r) => len <= r.to + 1e-9) || null;
}

// ตำแหน่งลวด PC ในหน้าตัดไอ (มม. จากศูนย์กลาง): แถวบน y=−75 แถวล่าง y=+75 (ห่างขอบ 35 มม.) ระยะลวดห่างกัน 35 มม. (ตามแบบ AutoCAD: 3.5 ซม. ต่อเนื่อง)
// แถวบนนับจากขอบขวา แถวล่างนับจากขอบซ้าย: ลวดที่ 1, 2, 3 ห่างขอบ 3.5, 7.0, 10.5 ซม. และอีกฝั่งที่เหลือนับจากขอบตรงข้าม (10 เส้น = แถวละ 5: บน −75,−40,+5,+40,+75 ล่าง −75,−40,−5,+40,+75)
// 4mm×4 + 5mm×2 = แบบมาตรฐาน (ลวด 4 มม. ที่มุม ลวด 5 มม. สลับบน/ล่าง) ซึ่งตรงกับกฎเดียวกัน
export function wireLayout(w4, w5) {
  if (w4 === 4 && w5 === 2) return { w4: [[-75, -75], [75, -75], [-75, 75], [75, 75]], w5: [[-40, -75], [40, 75]], n4: 4, n5: 2, std: true };
  const k = Math.max(1, Math.round(Math.max(w4, w5) / 2)), nl = Math.floor(k / 2), nr = Math.ceil(k / 2);
  const top = [...Array(nl)].map((_, i) => -110 + 35 * (i + 1)).concat([...Array(nr)].map((_, j) => 110 - 35 * (j + 1))).sort((p, q) => p - q);
  const bot = top.map((x) => -x).sort((p, q) => p - q);
  const mk = (n) => (n > 0 ? top.map((x) => [x, -75]).concat(bot.map((x) => [x, 75])) : []);
  return { w4: mk(w4), w5: mk(w5), n4: w4, n5: w5, std: false, per: k };
}

// แบ่งเป็น n ท่อนอัตโนมัติ: เมตรเต็มเท่ากัน เศษไปเพิ่มท่อนท้าย (17 ม. 2 ท่อน → 8+9, 19 → 9+10, 28 ม. 3 ท่อน → 9+9+10)
export function autoSplit(L, n = 2) {
  const base = Math.floor(L / n + 1e-9), lens = Array(n).fill(base);
  let extra = r2(L - base * n);
  for (let i = n - 1; i >= 0 && extra >= 1 - 1e-9; i--) { lens[i] += 1; extra = r2(extra - 1); }
  lens[n - 1] = r2(lens[n - 1] + extra);
  return lens.map(r2);
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
    const np = input.pieces > 1 ? Math.min(6, Math.floor(input.pieces)) : 1;
    if (!(L >= sec.minL && L <= sec.maxL * np)) warn.push(`ความยาว ${m2(L)} ม. อยู่นอกช่วง ${m2(sec.minL)}–${m2(sec.maxL * np)} ม.`);
    let lens = [L];
    if (np > 1) {
      const sp = Array.isArray(input.split) && input.split.length === np && input.split.every((v) => +v > 0) ? input.split.map((v) => r2(+v)) : autoSplit(L, np);
      const sum = r2(sp.reduce((t, v) => t + v, 0));
      if (Math.abs(sum - L) > 0.005) warn.push(`ความยาวรวมของ ${np} ท่อน ${m2(sum)} ม. ไม่เท่ากับความยาวรวม ${m2(L)} ม.`);
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
  const extras = (full ? [] : input.extras || []).filter((e) => +e.d > 0 && +e.n > 0).map((e) => ({ d: +e.d, n: Math.floor(+e.n), pieces: +e.pieces < 0 ? "all" : +e.pieces > 0 ? Math.floor(+e.pieces) : (input.pieces > 1 ? 1 : "all"), len: +e.len > 0 ? r2(+e.len) : null }));
  extras.forEach((e) => { if (e.n % 2) warn.push(`เหล็กเสริม DB${e.d} ${e.n} เส้น เป็นเลขคี่ จัดวางบน/ล่างไม่เท่ากัน`); });
  // เหล็กเสริมแต่ละรายการใช้กับ "ทุกท่อน" หรือท่อนที่ระบุ (นับจากท่อนบน = 1)
  extras.forEach((e) => { if (e.pieces !== "all" && e.pieces > pieces.length) warn.push(`เหล็กเสริม DB${e.d} ระบุท่อนที่ ${e.pieces} แต่มีแค่ ${pieces.length} ท่อน`); });
  pieces.forEach((p, i) => { p.extras = extras.filter((e) => e.pieces === "all" || e.pieces === i + 1); });
  // ชุดหน้าตัด (config): ท่อนที่ลวด PC และเหล็กเสริมเหมือนกันรวมเป็นหน้าตัดเดียว ต่างกันแยกเป็น A, B (A = ชุดที่ไม่มีเหล็กเสริมก่อน แล้วเรียงตามท่อนจากบน)
  // เกิน 2 ชุด (หน้าตัดวางไม่พอ) → แบ่งตามเหล็กเสริมอย่างเดียว (A ไม่มี / B มี) และให้ลวดดูตาราง
  const wk = (p) => (p.rule ? p.rule.w4 + "/" + p.rule.w5 : "x"), ek = (p) => p.extras.map((e) => e.d + "x" + e.n + "x" + (e.len || p.len)).join("|");
  const grp = (keyFn) => { const m = new Map(); pieces.forEach((p, i) => { const k = keyFn(p); if (!m.has(k)) m.set(k, { key: k, idx: [], first: p }); m.get(k).idx.push(i); }); return [...m.values()].sort((a, b) => (a.first.extras.length > 0) - (b.first.extras.length > 0)); };
  let cfgs = full ? [] : grp((p) => wk(p) + "#" + ek(p)), manyCfg = false;
  if (cfgs.length > 2) { cfgs = grp((p) => (p.extras.length ? ek(p) : "")); manyCfg = true; if (cfgs.length > 2) cfgs = [cfgs[0], { key: "rest", idx: cfgs.slice(1).flatMap((g) => g.idx), first: cfgs[1].first }]; }
  const configs = cfgs.map((g, i) => ({ letter: "AB"[i], idx: g.idx, wires: wk(g.first), extras: g.first.extras, rule: g.first.rule || null, layout: g.first.rule ? wireLayout(g.first.rule.w4, g.first.rule.w5) : null, simple: manyCfg }));
  configs.forEach((cf) => cf.idx.forEach((i) => { pieces[i].cfg = cf.letter; }));
  const kinds = { A: true, B: configs.length > 1 };
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
  let jt = joint ? (input.pieces > 1 && !full ? `${pieces.length} ท่อนต่อเชื่อม ${pieces.map((p) => r2(p.len)).join("+")}` : "มีหัวต่อ") : "ไม่มีหัวต่อเชื่อม";
  if (full) jt = "มีหัวต่อ";
  const xt = extras.map((e) => `${e.n}-DB${e.d}x${e.len ? m2(e.len) : (full ? "L" : m2(pieces[0].len))}m.`).join(" ");
  const title = `PC.PILE ${sz}x${lenTxt}m. (${jt})${xt ? " " + xt : ""}${shoulder ? ` มีบ่าที่ระยะ${m2(shoulder.at)}m.` : ""} ${sec.std}`;
  const r0 = pieces[0] && pieces[0].rule, layout = r0 ? wireLayout(r0.w4, r0.w5) : null;
  return { sec, full, joint, pieces, extras, kinds, configs, layout, shoulder, rows, warn, title, L, project: input.project || {} };
}
