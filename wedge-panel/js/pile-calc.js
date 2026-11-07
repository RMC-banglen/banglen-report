// คำนวณข้อมูลแบบเสาเข็ม (ไม่แตะ DOM): แบ่งท่อน เลือกลวด/เหล็กเดือยตามความยาว ปลอกเกลียว บ่า เหล็กเสริมพิเศษ
import { PILE_SECTIONS, SHOULDER_STD } from "./pile-data.js?v=20261107075532";

const r2 = (v) => Math.round(v * 100) / 100;
export const m2 = (v) => r2(v).toFixed(2);

// กฎลวดตามความยาวท่อน: ช่วงแรกที่ L ≤ to
export function ruleFor(sec, len) {
  return sec.rules.find((r) => len <= r.to + 1e-9) || null;
}

// ตำแหน่งลวด PC ในหน้าตัดไอ (มม. จากศูนย์กลาง): แถวบน y=−75 แถวล่าง y=+75 (ห่างขอบ 35 มม.) ระยะลวดห่างกัน 35 มม. (ตามแบบ AutoCAD: 3.5 ซม. ต่อเนื่อง)
// แถวบนนับจากขอบขวา แถวล่างนับจากขอบซ้าย: ลวดที่ 1, 2, 3 ห่างขอบ 3.5, 7.0, 10.5 ซม. และอีกฝั่งที่เหลือนับจากขอบตรงข้าม (10 เส้น = แถวละ 5: บน −75,−40,+5,+40,+75 ล่าง −75,−40,−5,+40,+75)
// 4mm×4 + 5mm×2 = แบบมาตรฐาน (ลวด 4 มม. ที่มุม ลวด 5 มม. สลับบน/ล่าง) ซึ่งตรงกับกฎเดียวกัน
// ลวดต้องบาลานซ์: ลวด 4 มม. กับ 5 มม. พื้นที่ไม่เท่ากัน จึงจัดขนาดเป็นคู่ที่หมุน 180° ซึ่งกันและกัน (คู่ริมนอกสุดเป็น 4 มม. ก่อน) ให้จุดศูนย์ถ่วงของกลุ่มลวดอยู่กลางหน้าตัดเสมอ (ผู้ใช้สั่ง)
function balanceSplit(pts, w4) {
  const used = new Set(), key = (p) => p[0].toFixed(3) + "," + p[1].toFixed(3), pairs = [];
  pts.forEach((p) => { if (used.has(key(p))) return; used.add(key(p)); const q = pts.find((r) => r !== p && !used.has(key(r)) && Math.abs(r[0] + p[0]) < 1e-6 && Math.abs(r[1] + p[1]) < 1e-6); if (q) { used.add(key(q)); pairs.push([p, q]); } else pairs.push([p]); });
  pairs.sort((a, b) => Math.abs(b[0][0]) + Math.abs(b[0][1]) - Math.abs(a[0][0]) - Math.abs(a[0][1]));
  const f4 = [], f5 = []; let n = w4;
  pairs.forEach((pr) => { if (n >= pr.length) { f4.push(...pr); n -= pr.length; } else f5.push(...pr); });
  return { w4: f4, w5: f5 };
}
// เสา 40 (I-40 / S-40): ลวดแถวนอก (ห่างผิว 35) ได้สูงสุด 8 เส้นต่อปีก (ซ้าย 4 ขวา 4 นับทีละ 35 มม. ตามเส้นบอกระยะในแบบ) ส่วนที่เกินเป็นแถวที่สอง (เข้ามาอีก 35) แถวล่างนับจากมุมซ้าย แถวบนหมุน 180° — ตำแหน่งแถวสองและการกระจายเป็นการสมมติ
function twoRow(w4, w5, B) {
  const hb = B / 2, yw = hb - 35, N = w4 + w5, k = Math.max(1, Math.round(N / 2)), m1 = Math.min(k, 8), m2 = k - m1;
  const row = (m, y) => { const bl = Math.ceil(m / 2), br = m - bl; return [...Array(bl)].map((_, i) => [-yw + 35 * i, y]).concat([...Array(br)].map((_, j) => [yw - 35 * j, y])); };
  const bot = row(m1, yw).concat(m2 ? row(m2, yw - 35) : []), all = bot.concat(bot.map(([x, y]) => [-x, -y])).sort((p, q) => Math.abs(q[0]) + Math.abs(q[1]) - Math.abs(p[0]) - Math.abs(p[1]));
  const bl1 = Math.ceil(m1 / 2);
  return { ...balanceSplit(all, w4), n4: w4, n5: w5, std: false, per: k, bl: bl1, br: m1 - bl1, two: true };
}
// เสาสี่เหลี่ยม: ลวดรอบวงปลอก ห่างผิว 35 มม. — 4 มุมก่อน ที่เหลือแบ่งเท่าๆ กันตามด้านบน/ล่าง/ซ้าย/ขวา (ลวด 4 มม. ใช้ที่มุมก่อน) ตำแหน่งจริงในแบบไม่มีระบุ จึงเป็นการจัดเอง
function sqLayout(w4, w5, B, pat) {
  if (pat === "two") return twoRow(w4, w5, B);
  const N = w4 + w5, yw = B / 2 - 35;
  const pp = pat && pat[N];
  if (pp) { // ตำแหน่งตามแบบ AutoCAD (ผู้ใช้ส่ง 7 พ.ย. 2569): แถวล่างตามรายการ L n = นับจากมุมซ้าย n×35 มม., R n = จากมุมขวา; แถวบนหมุน 180°; extra = แถวที่สอง (เข้ามา 35 มม.)
    const X = (t) => (t[0] === "L" ? -yw + 35 * +t.slice(1) : yw - 35 * +t.slice(1)), bot = pp.row.map((t) => [X(t), yw]).concat((pp.extra || []).map(([t, r]) => [X(t), yw - 35 * r]));
    const all = bot.concat(bot.map(([x, y]) => [-x, -y])).sort((p, q) => Math.abs(q[0]) + Math.abs(q[1]) - Math.abs(p[0]) - Math.abs(p[1]));
    return { ...balanceSplit(all, w4), n4: w4, n5: w5, std: false, per: 0 };
  }
  const e = Math.max(0, N - 4), cnt = [0, 0, 0, 0]; // บน ล่าง ซ้าย ขวา
  for (let i = 0; i < e; i++) cnt[i % 4]++;
  const along = (m) => Array.from({ length: m }, (_, i) => -yw + ((i + 1) * 2 * yw) / (m + 1));
  const pts = [[-yw, -yw], [yw, yw], [yw, -yw], [-yw, yw]]; // มุม: ซ้ายบน ขวาล่าง ขวาบน ซ้ายล่าง (กระจายแนวทแยง)
  along(cnt[0]).forEach((x) => pts.push([x, -yw])); along(cnt[1]).forEach((x) => pts.push([x, yw]));
  along(cnt[2]).forEach((y) => pts.push([-yw, y])); along(cnt[3]).forEach((y) => pts.push([yw, y]));
  return { ...balanceSplit(pts, w4), n4: w4, n5: w5, std: false, per: 0 };
}
export function wireLayout(w4, w5, B = 220, sq = false, wl, pat, p4) {
  if (sq) return sqLayout(w4, w5, B, pat);
  if (pat === "two") return twoRow(w4, w5, B);
  const hb = B / 2, yw = hb - 35; // แถวลวดห่างผิว 35 มม. (3.5 ซม.)
  if (w4 === 4 && w5 === 2) return { w4: [[-yw, -yw], [yw, -yw], [-yw, yw], [yw, yw]], w5: [[-hb + 70, -yw], [hb - 70, yw]], n4: 4, n5: 2, std: true };
  if (w4 === 2 && w5 === 2) return { w4: [[-yw, -yw], [yw, yw]], w5: [[yw, -yw], [-yw, yw]], n4: 2, n5: 2, std: false, per: 2 }; // I-18: ลวด 4 มม. กับ 5 มม. อย่างละ 1 เส้นต่อแถว (สลับแนวทแยง — ยังไม่ยืนยันจากแบบ)
  // แถวล่าง: ซ้าย bl เส้น (นับจากขอบซ้ายทีละ 35 มม.) ขวา br เส้น (นับจากขอบขวา) • แถวบนหมุน 180° (ซ้ายบน = br, ขวาบน = bl)
  // bl ตามแบบ DXF (เส้นบอกระยะ 3.5 ซม. ในภาพ DETAIL OF PC.WIRES: I-18=1, I-26=3, I-30=3, I-35=2) ถ้าไม่ระบุใช้ครึ่งปัดขึ้น (I-22 ตามแบบ AutoCAD)
  const k = Math.max(1, Math.round((w4 + w5) / 2)), p = k === 4 && p4 ? p4 : 35, bl = k === 4 && p4 ? 2 : k === 3 ? 1 : k > 1 ? Math.min(k - 1, Math.max(1, wl ?? Math.ceil(k / 2))) : k, br = k - bl; // ต้องมีลวดทุกมุม (ซ้ายและขวาของแต่ละแถวอย่างน้อยด้านละ 1 เส้น) — ผู้ใช้สั่ง
  const bot = [...Array(bl)].map((_, i) => -hb + 35 + p * i).concat([...Array(br)].map((_, j) => hb - 35 - p * j)).sort((p, q) => p - q);
  const top = bot.map((x) => -x).sort((p, q) => p - q);
  const all = top.map((x) => [x, -yw]).concat(bot.map((x) => [x, yw]));
  if (w4 > 0 && w5 > 0) { // ลวดสองขนาด: 4 มม. อยู่ที่มุม/ริมนอกสุดก่อน ที่เหลือเป็น 5 มม. (ตำแหน่งจริงในแบบไม่ระบุ — จัดเอง)
    const ord = all.map((p, i) => [p, i]).sort((p, q) => Math.abs(q[0][0]) - Math.abs(p[0][0]) || p[0][1] - q[0][1] || p[1] - q[1]).map((t) => t[0]);
    return { ...balanceSplit(all, w4), n4: w4, n5: w5, std: false, per: k, bl, br, pitch: p };
  }
  return { w4: w4 ? all : [], w5: w5 ? all : [], n4: w4, n5: w5, std: false, per: k, bl, br, pitch: p };
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
  const shortIdx = pieces.reduce((bi, p, i) => (p.len < pieces[bi].len ? i : bi), 0) + 1; // ไม่ได้เลือกท่อน = ท่อนสั้นที่สุดก่อน (เท่ากัน = ท่อนบน)
  // เหล็กเสริมพิเศษ: ความยาวว่าง = ยาวเท่าท่อน
  const extras = (full || sec.extras === false ? [] : input.extras || []).filter((e) => +e.d > 0 && +e.n > 0).map((e) => ({ d: +e.d, n: Math.floor(+e.n), pieces: +e.pieces < 0 ? "all" : +e.pieces > 0 ? Math.floor(+e.pieces) : (input.pieces > 1 ? shortIdx : "all"), len: +e.len > 0 ? r2(+e.len) : null }));
  extras.forEach((e) => { if (e.n % 2) warn.push(`เหล็กเสริม DB${e.d} ${e.n} เส้น เป็นเลขคี่ จัดวางบน/ล่างไม่เท่ากัน`); });
  // เหล็กเสริมแต่ละรายการใช้กับ "ทุกท่อน" หรือท่อนที่ระบุ (นับจากท่อนบน = 1)
  extras.forEach((e) => { if (e.pieces !== "all" && e.pieces > pieces.length) warn.push(`เหล็กเสริม DB${e.d} ระบุท่อนที่ ${e.pieces} แต่มีแค่ ${pieces.length} ท่อน`); });
  pieces.forEach((p, i) => { p.extras = extras.filter((e) => e.pieces === "all" || e.pieces === i + 1); });
  // ท่อนที่ใส่เหล็กเสริมแสดงอยู่ด้านบนเสมอ (ท่อนอื่นเรียงตามเดิมต่อท้าย)
  if (pieces.length > 1 && pieces.some((p) => p.extras.length) && !pieces.every((p) => p.extras.length)) pieces = [...pieces.filter((p) => p.extras.length), ...pieces.filter((p) => !p.extras.length)];
  // ชุดหน้าตัด (config): ท่อนที่ลวด PC และเหล็กเสริมเหมือนกันรวมเป็นหน้าตัดเดียว ต่างกันแยกเป็น A, B (A = ชุดที่ไม่มีเหล็กเสริมก่อน แล้วเรียงตามท่อนจากบน)
  // เกิน 2 ชุด (หน้าตัดวางไม่พอ) → แบ่งตามเหล็กเสริมอย่างเดียว (A ไม่มี / B มี) และให้ลวดดูตาราง
  const wk = (p) => (p.rule ? p.rule.w4 + "/" + p.rule.w5 : "x"), ek = (p) => p.extras.map((e) => e.d + "x" + e.n + "x" + (e.len || "L")).join("|");
  const grp = (keyFn) => { const m = new Map(); pieces.forEach((p, i) => { const k = keyFn(p); if (!m.has(k)) m.set(k, { key: k, idx: [], first: p }); m.get(k).idx.push(i); }); return [...m.values()].sort((a, b) => (a.first.extras.length > 0) - (b.first.extras.length > 0)); };
  let cfgs = full ? [] : grp((p) => wk(p) + "#" + ek(p)), manyCfg = false;
  if (cfgs.length > 2) { cfgs = grp((p) => (p.extras.length ? ek(p) : "")); manyCfg = true; if (cfgs.length > 2) cfgs = [cfgs[0], { key: "rest", idx: cfgs.slice(1).flatMap((g) => g.idx), first: cfgs[1].first }]; }
  const configs = cfgs.map((g, i) => ({ letter: "AB"[i], idx: g.idx, wires: wk(g.first), extras: g.first.extras, rule: g.first.rule || null, layout: g.first.rule ? wireLayout(g.first.rule.w4, g.first.rule.w5, sec.geo ? sec.geo.B : 220, !!(sec.geo && sec.geo.sq), sec.geo && sec.geo.wl, sec.geo && (sec.geo.two ? "two" : sec.geo.pat), sec.geo && sec.geo.p4) : null, simple: manyCfg }));
  configs.forEach((cf) => cf.idx.forEach((i) => { pieces[i].cfg = cf.letter; }));
  const kinds = { A: true, B: configs.length > 1 };
  // บ่า: อ้างระยะจากหัวเสา (ท่อนบน)
  let shoulder = null;
  if (+input.shoulder > 0 && sec.shoulder !== false) {
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
  const xl = (e) => { if (e.len) return `x${m2(e.len)}m.`; if (full) return "xLm."; const ls = [...new Set(pieces.filter((p) => p.extras.includes(e)).map((p) => p.len))]; return `x${ls.map(m2).join("/")}m.`; };
  const xt = extras.map((e) => `${e.n}-DB${e.d}${xl(e)}`).join(" ");
  const title = `PC.PILE ${sz}x${lenTxt}m. (${jt})${xt ? " " + xt : ""}${shoulder ? ` มีบ่าที่ระยะ${m2(shoulder.at)}m.` : ""} ${sec.std}`;
  const r0 = pieces[0] && pieces[0].rule, layout = r0 ? wireLayout(r0.w4, r0.w5, sec.geo ? sec.geo.B : 220, !!(sec.geo && sec.geo.sq), sec.geo && sec.geo.wl, sec.geo && (sec.geo.two ? "two" : sec.geo.pat), sec.geo && sec.geo.p4) : null;
  return { sec, full, joint, pieces, extras, kinds, configs, layout, shoulder, rows, warn, title, L, project: input.project || {} };
}
