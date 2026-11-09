// การคำนวณทั้งหมด ไม่แตะ DOM — สูตรตามหัวข้อ 4 ของ HANDOFF.md (พอร์ตจาก wedge-panel-designer.html)
import {
  PILES, WG, HS, MAX_STACK, KG, STD, TABLE, barName,
  CONCRETE_DENSITY, DEFAULT_ALLOWANCE, DEFAULT_TRUCK_KG, SPECIAL_ORDER_WARNING,
} from "./standards.js?v=20261109025100";

// ---------- รูปแบบตัวเลข ----------
export const fmt = (n) => Math.round(n).toLocaleString("th-TH");
// ตัวเลขมีลูกน้ำคั่นหลักพัน + ทศนิยม d ตำแหน่ง เช่น nf(1234.5, 1) = "1,234.5"
export const nf = (n, d = 0) => Number(n).toLocaleString("th-TH", { minimumFractionDigits: d, maximumFractionDigits: d });
export const f3 = (n) => (n / 1000).toFixed(3);
// เมตร 2 ตำแหน่ง ถ้าไม่ลงทุก 10 มม. ใช้ 3 ตำแหน่ง
export const f2 = (n) => (n / 1000).toFixed(Math.round(n) % 10 ? 3 : 2);

// ---------- ความกว้างแผ่นและการเสียบร่อง ----------
// กว้างรวม = c/c − tw − 2×ค่าเผื่อ ปัดลงทุก 10 มม. ค่าเผื่อจริง = (c/c − tw − กว้างรวมที่ปัด)/2
export function fitCalc(pile, G, cc, g) {
  const raw = cc - pile.tw - 2 * g;
  const WT = Math.floor(raw / 10) * 10;
  return fitWidth(pile, G, cc, WT, raw);
}

// ตรวจการเสียบร่องของแผ่นกว้างรวม WT ที่ระยะกลาง/กลางเสา cc (ค่าเผื่อจริง gr = (cc − tw − WT)/2)
export function fitWidth(pile, G, cc, WT, raw = WT) {
  const gr = (cc - pile.tw - WT) / 2;
  const ze = pile.dg - gr; // เสียบร่อง
  const m = pile.B / 2 - pile.f;
  const tap = m - pile.c / 2;
  let mn = 1e9;
  for (let z = 0; z <= ze; z += 0.5) {
    const c = m - (tap * z) / pile.dg - G.ht(ze - z);
    if (c < mn) mn = c;
  }
  return { WT, raw, gr, ze, mn, cm: m - G.ht(ze), ct: m - (tap * ze) / pile.dg - G.E / 2 };
}

// กว้างรวมมากสุดที่ใช้ได้กับระยะกลาง/กลางเสา cc และค่าเผื่อ g (ปัดลงทุก 10 มม.)
export const maxWidthFor = (pile, cc, g) => Math.floor((cc - pile.tw - 2 * g) / 10) * 10;

// ---------- แบ่งระยะเสาจากความยาวกำแพง ----------
// method "eq": ทุกช่วงห่างเท่ากัน กระจายเศษทีละ 10 มม.
// method "rest": ช่วงเต็มตามระยะที่ใส่ + ช่วงสุดท้ายเป็นเศษ
// คืน { spans:[{cc,n}], warnings:[[level,text]], errors:[text], pileCount }
export function splitSpans(length, spacing, method) {
  const L = Math.round(length), s = Math.round(spacing);
  const out = [], warnings = [], errors = [];
  if (!(L >= 600)) { errors.push("ใส่ความยาวกำแพงอย่างน้อย 0.60 ม."); return { spans: out, warnings, errors, pileCount: 0 }; }
  if (!(s >= 600 && s <= 6000)) { errors.push("เสาต้องห่างกัน 0.60 ถึง 6.00 ม."); return { spans: out, warnings, errors, pileCount: 0 }; }
  if (method === "eq") {
    const n = Math.ceil(L / s), b = Math.floor(L / n / 10) * 10, rest = L - b * n;
    const k = Math.min(n, Math.floor(rest / 10)), frac = rest - k * 10;
    if (k > 0 && k < n) { out.push({ cc: b + 10, n: k }); out.push({ cc: b + frac, n: n - k }); }
    else if (k === n) { out.push({ cc: b + 10, n: n - 1 }); out.push({ cc: b + 10 + frac, n: 1 }); }
    else out.push({ cc: b + frac, n });
    if (frac && k < n && n - k > 1) { const g = out.pop(); out.push({ cc: b, n: g.n - 1 }, { cc: b + frac, n: 1 }); }
  } else {
    const n = Math.floor(L / s), rem = L - n * s;
    if (n) out.push({ cc: s, n });
    if (rem > 0) {
      out.push({ cc: rem, n: 1 });
      if (rem < 600) warnings.push(["w", `ช่วงสุดท้ายเหลือแค่ ${f2(rem)} ม. สั้นเกินไป แนะนำเลือก “ทุกช่วงห่างเท่ากัน”`]);
    }
  }
  const nSpan = out.reduce((a, b) => a + b.n, 0);
  return { spans: out, warnings, errors, pileCount: nSpan + 1 };
}

// ---------- การซ้อนแผ่น ----------
// ชุดแผ่นมาตรฐาน 1–4 แผ่นที่รวมได้พอดีความสูงกำแพง เรียงจากใช้แผ่นน้อยที่สุด
export function stackOptions(Ht) {
  const res = [];
  const rec = (start, arr, sum) => {
    if (arr.length && sum >= Ht) { res.push(arr.slice()); return; }
    if (arr.length >= MAX_STACK) return;
    for (let i = start; i < HS.length; i++) { arr.push(HS[i]); rec(i, arr, sum + HS[i]); arr.pop(); }
  };
  rec(0, [], 0);
  res.forEach((a) => { a.sort((x, y) => y - x); a.sum = a.reduce((p, q) => p + q, 0); a.over = a.sum - Ht; a.k = new Set(a).size; });
  const pool = res.filter((a) => a.over === 0).sort((a, b) => a.length - b.length || a.over - b.over || a.k - b.k);
  const seen = new Set(), out = [];
  pool.forEach((a) => { const key = a.join("+"); if (!seen.has(key)) { seen.add(key); out.push(a); } });
  return out.slice(0, 4);
}

// ความสูงกำแพงมาตรฐานทั้งหมดที่ซ้อนได้ (ผลรวมของแผ่น 1–4 แผ่น)
export const STDH = (() => {
  const s = new Set();
  const rec = (st, sum, k) => {
    if (k) s.add(sum);
    if (k === MAX_STACK) return;
    for (let i = st; i < HS.length; i++) rec(i, sum + HS[i], k + 1);
  };
  rec(0, 0, 0);
  return [...s].sort((a, b) => a - b);
})();

// ถ้าไม่ตรงมาตรฐาน เสนอ "ปรับขึ้น" (แนะนำ) และ "ปรับลง"
export function suggestHeights(Ht) {
  return { up: STDH.find((h) => h > Ht) ?? null, down: [...STDH].reverse().find((h) => h < Ht) ?? null };
}

// ---------- เหล็กเสริม ท่อ น้ำหนัก ----------
export function standardSpec() { return { sp: false, ...STD, pr: null, pc: 0 }; }

function placePipes(vx, hy, dv, dh, pd, nr, nc, WT, TP, H) {
  if (!pd) return { P: [], xs: [], ys: [], warn: "" };
  const rad = pd / 2, st = 50;
  const ax = (bars, n, Lt, lo, hi, bd) => {
    const ok = (c) => c - rad >= lo && c + rad <= hi && bars.every((b) => Math.abs(b - c) - bd / 2 - rad >= 10);
    const out = [];
    for (let i = 0; i < Math.floor(n / 2); i++) {
      let got = null;
      for (let d = 0; d <= 900 && got === null; d += st)
        for (const sg of [1, -1]) {
          const c = Math.round((Lt * (i + 0.5)) / n / st) * st + sg * d;
          if (ok(c) && ok(Lt - c) && !out.includes(c)) { got = c; break; }
        }
      if (got === null) return null;
      out.push(got, Lt - got);
    }
    if (n % 2) {
      let c = Lt / 2;
      if (!ok(c)) {
        c = null;
        for (let d = 0; d <= 900 && c === null; d += st)
          for (const sg of [1, -1]) {
            const cc = Math.round(Lt / 2 / st) * st + sg * d;
            if (ok(cc)) { c = cc; break; }
          }
      }
      if (c === null) return null;
      out.push(c);
    }
    return out.sort((a, b) => a - b);
  };
  const xsT = ax(vx.map((x) => x + TP), nc, WT, TP, WT - TP, dv);
  const ys = ax(hy, nr, H, 0, H, dh);
  if (!xsT || !ys) return { P: [], xs: [], ys: [], warn: "วางท่อระบายน้ำให้ไม่โดนเหล็กไม่ได้" };
  const xs = xsT.map((x) => x - TP), P = [];
  ys.forEach((y) => xs.forEach((x) => P.push([x, y])));
  let gap = 1e9;
  xs.forEach((c) => vx.forEach((b) => { gap = Math.min(gap, Math.abs(b - c) - dv / 2 - rad); }));
  ys.forEach((c) => hy.forEach((b) => { gap = Math.min(gap, Math.abs(b - c) - dh / 2 - rad); }));
  return { P, xs, ys, warn: "", gap };
}

// แผ่นหนึ่งรหัส: เหล็ก ท่อ คอนกรีต น้ำหนัก (WT = กว้างรวมปลายลิ่มถึงปลายลิ่ม, H = สูง)
export function panelCalc(G, WT, H, S) {
  const T = G.T, TP = G.TP, W = WT - 2 * TP, cv = S.cv, oh = S.oh;
  const x0 = -TP + cv, x1 = WT - TP - cv, lv = H - 2 * cv, lh = WT - 2 * cv;
  const vs = x0 + oh, ve = x1 - oh;
  const nm = Math.max(2, Math.ceil((ve - vs) / S.sv) + 1), am = (ve - vs) / (nm - 1), vx = [];
  for (let i = 0; i < nm; i++) vx.push(vs + i * am);
  const hs = cv + oh, he = H - cv - oh;
  const nh = Math.max(2, Math.ceil((he - hs) / S.sh) + 1), ah = (he - hs) / (nh - 1), hy = [];
  for (let j = 0; j < nh; j++) hy.push(hs + j * ah);
  const rows = S.pd ? (S.pr || (H <= 500 ? 1 : 2)) : 0;
  const cols = S.pd ? (S.pc || Math.max(1, Math.floor(WT / 600))) : 0;
  const pipe = placePipes(vx, hy, S.dv, S.dh, S.pd, rows, cols, WT, TP, H);
  const kv = (nm * lv / 1000) * KG[S.dv], kh = (nh * lh / 1000) * KG[S.dh];
  const vol = ((W * T + 2 * G.tipA) * H) / 1e9 - (pipe.P.length * Math.PI * (S.pd / 2) ** 2 * T) / 1e9;
  return { W, WT, H, T, TP, vx, hy, am, ah, lv, lh, nv: nm, nh, kv, kh, kg: kv + kh, vol, wt: vol * CONCRETE_DENSITY, pipe, ties: nm * nh, x0, x1 };
}

// ตัวกั้นหัวคู่: ใช้เหล็กรางน้ำ 2 นิ้วทั้งหมด (TCc ระยะสั้นลง ไม่มีแผ่นตัดพลาสม่า — ผู้ใช้สั่ง 7 พ.ย. 2569) • div = "std" ใช้แบบมาตรฐานเดิม (TC) เฉพาะในเทสต์/เทียบ
export const divG = (G, div) => (div !== "std" ? { ...G, TC: G.TCc, div: "ch" } : G);

// ---------- โต๊ะหล่อ ----------
export function tableFit(G, W, H) {
  const WB = G.TD + 50, CE = WB + 5, x0 = CE - WB, xeMax = x0 + TABLE.LF - WB, span = xeMax - CE;
  let R = 1;
  while (TABLE.CS + (R + 1) * H + R * TABLE.TDV + TABLE.MG <= TABLE.TW) R++;
  const okH = TABLE.CS + H + TABLE.MG <= TABLE.TW;
  const n = Math.floor((span + G.TC) / (W + G.TC));
  return { R: okH ? R : 0, n: Math.max(0, n), span };
}

// ---------- รหัสและชื่อสินค้า ----------
const c3 = (v) => String(Math.round(v)).padStart(3, "0");
const d2 = (d) => String(d).padStart(2, "0");

export function mkCode(WT, H, T, S, P) {
  const hc = H % 10 ? String(H).padStart(4, "0") : c3(H / 10);
  let c = `2ร-${c3(WT / 10)}-${hc}-${c3(T / 10)}`;
  if (S.sp) c += `-${P.nv}+${P.nh}-${S.dv === S.dh ? d2(S.dv) : d2(S.dv) + d2(S.dh)}`;
  return c;
}

export function mkName(WT, H, T, S, P) {
  let n = `แผ่นกันดิน ${(WT / 1000).toFixed(2)} x ${H % 10 ? (H / 1000).toFixed(3) : (H / 1000).toFixed(2)} x ${(T / 1000).toFixed(2)} ม.`;
  if (S.sp) n += ` เสริมเหล็ก ${P.nv}+${P.nh}${S.dv === S.dh ? barName(S.dv) : barName(S.dv) + "/" + barName(S.dh)} มม.`;
  return n;
}

// ---------- ทั้งโครงการ ----------
// in = { pile, allowance, spans:[{cc,n}], stack:[ความสูงแผ่น...], spec, truckKg }
// คืน { p, G, g, S, groups, list, totQ, totW, totV, totS, trips, nSpan, nPile, wLen, al }
export function calcProject(input) {
  const p = PILES[input.pile], G = divG(WG[p.ty], input.div);
  const g = input.allowance ?? DEFAULT_ALLOWANCE;
  const S = input.spec || standardSpec();
  const stk = input.stack || [];
  const al = [];
  if (!(g >= 5 && g <= 40)) al.push(["d", "ค่าเผื่อควรอยู่ระหว่าง 0.005 ถึง 0.040 ม."]);
  if (S.sp && (!(S.sv >= 75) || !(S.sh >= 75))) al.push(["d", "ระยะ @ เหล็กต้องไม่น้อยกว่า 0.075 ม."]);

  const groups = [];
  (input.spans || []).forEach((s, i) => {
    if (!(s.cc >= 600 && s.cc <= 6000) || !(s.n >= 1)) {
      al.push(["d", `ช่วงเสาแถวที่ ${i + 1}: เสาต้องห่างกัน 0.60 ถึง 6.00 ม. และมีอย่างน้อย 1 ช่วง`]);
      return;
    }
    const F = fitCalc(p, G, s.cc, g);
    if (F.ze < 20) al.push(["d", `ช่วง กลาง/กลางเสา ${f2(s.cc)} ม.: ค่าเผื่อมากเกินไป แผ่นเสียบร่องได้น้อยกว่า 0.020 ม.`]);
    if (F.mn < 3) al.push(["d", `ช่วง กลาง/กลางเสา ${f2(s.cc)} ม.: ลิ่มหนากว่าร่อง แผ่นจะติด ต้องเพิ่มค่าเผื่อ`]);
    groups.push({ ...s, F });
  });

  const nSpan = groups.reduce((a, x) => a + x.n, 0);
  const nPile = nSpan ? nSpan + 1 : 0;
  const wLen = groups.reduce((a, x) => a + x.cc * x.n, 0);

  const items = new Map();
  groups.forEach((gr) => {
    stk.forEach((H) => {
      const it = getItem(items, G, S, gr.F.WT, H, al);
      it.qty += gr.n;
      it.cc.add(gr.cc);
    });
  });
  if (S.sp) al.unshift(["w", SPECIAL_ORDER_WARNING]);
  return { p, G, g, S, stk, groups, nSpan, nPile, wLen, ...totals(items, input.truckKg, S), al };
}

// รายการแผ่นหนึ่งรหัส (กว้างรวม WT, สูง H) สร้างครั้งเดียวต่อคู่ แล้วสะสมจำนวนเข้าไป
function getItem(items, G, S, WT, H, al) {
  const key = WT + "|" + H;
  let it = items.get(key);
  if (!it) {
    const P = panelCalc(G, WT, H, S), code = mkCode(WT, H, G.T, S, P);
    it = { code, name: mkName(WT, H, G.T, S, P), H, WT, P, qty: 0, cc: new Set() };
    items.set(key, it);
    if (P.pipe.warn) al.push(["w", `${code}: ${P.pipe.warn}`]);
    it.tf = tableFit(G, P.W, H);
    if (it.tf.n < 1 || it.tf.R < 1) al.push(["d", `${code}: แผ่นใหญ่เกินโต๊ะหล่อ (ตัวแผ่นยาวได้ไม่เกิน ${f2(it.tf.span)} ม.)`]);
  }
  return it;
}

function totals(items, truckKg, S) {
  const list = [...items.values()].sort((a, b) => b.H - a.H || a.WT - b.WT);
  const totQ = list.reduce((s, i) => s + i.qty, 0);
  const totW = list.reduce((s, i) => s + i.qty * i.P.wt, 0);
  const totV = list.reduce((s, i) => s + i.qty * i.P.vol, 0);
  const totS = list.reduce((s, i) => s + i.qty * i.P.kg, 0);
  const truck = truckKg || DEFAULT_TRUCK_KG;
  // สรุปวัสดุแยกชนิดเหล็ก (ขนาดเดียวกันรวมกัน) และท่อ PVC ทั้งโครงการ
  const bars = new Map();
  const addBar = (d, n, len, kg) => { const b = bars.get(d) || { d, n: 0, len: 0, kg: 0 }; b.n += n; b.len += len; b.kg += kg; bars.set(d, b); };
  list.forEach((i) => {
    addBar(S.dv, i.qty * i.P.nv, (i.qty * i.P.nv * i.P.lv) / 1000, i.qty * i.P.kv);
    addBar(S.dh, i.qty * i.P.nh, (i.qty * i.P.nh * i.P.lh) / 1000, i.qty * i.P.kh);
  });
  const pipeCount = S.pd ? list.reduce((s, i) => s + i.qty * i.P.pipe.P.length, 0) : 0;
  const pipeLen = S.pd ? list.reduce((s, i) => s + (i.qty * i.P.pipe.P.length * i.P.T) / 1000, 0) : 0;
  // แตกตามขนาดเหล็ก + ความยาวต่อเส้น (มม.) เช่น RB6 ยาว 0.95 ม. กี่เส้น (ความยาวต่อเส้นต่างกันตามความสูงแผ่น)
  const lines = new Map();
  const addLine = (d, each, n) => {
    const key = d + "|" + each, l = lines.get(key) || { d, each, n: 0, len: 0, kg: 0 };
    l.n += n; l.len += (n * each) / 1000; l.kg += ((n * each) / 1000) * KG[d]; lines.set(key, l);
  };
  list.forEach((i) => { addLine(S.dv, i.P.lv, i.qty * i.P.nv); addLine(S.dh, i.P.lh, i.qty * i.P.nh); });
  const mat = {
    bars: [...bars.values()].sort((a, b) => a.d - b.d),
    lines: [...lines.values()].sort((a, b) => a.d - b.d || b.each - a.each),
    pipeCount, pipeLen, pipeEach: list.length ? list[0].P.T : 0, // ท่อยาวเท่าความหนาแผ่น (มม.)
  };
  return { list, totQ, totW, totV, totS, truck, trips: Math.ceil(totW / truck), mat };
}

// ---------- สั่งตามจำนวนแผ่น (ลูกค้ากำหนดความกว้างและจำนวนมาเอง / สั่งเพิ่ม) ----------
// in = { pile, rows:[{WT (มม. กว้างรวมปลายลิ่มถึงปลายลิ่ม), H (มม. ต้องเป็นความสูงมาตรฐาน), qty}], spec, truckKg }
// ไม่มีข้อมูลระยะเสา จึงตรวจการเสียบร่องด้วยค่าเผื่อมาตรฐาน 20 มม./ข้าง (กลาง/กลางเสา = กว้างรวม + เอว + 2×ค่าเผื่อ)
export function calcDirect(input) {
  const p = PILES[input.pile], G = divG(WG[p.ty], input.div);
  const S = input.spec || standardSpec();
  const g = input.allowance ?? DEFAULT_ALLOWANCE;
  const al = [], items = new Map(), groups = new Map(), rowInfo = [];
  if (!(g >= 5 && g <= 40)) al.push(["d", "ค่าเผื่อควรอยู่ระหว่าง 0.005 ถึง 0.040 ม."]);
  (input.rows || []).forEach((r, i) => {
    const n = i + 1, WT = Math.round(r.WT), H = Math.round(r.H), qty = Math.floor(r.qty);
    if (!(WT > 0) || !(qty >= 1)) { al.push(["d", `รายการที่ ${n}: ใส่ความกว้างและจำนวนแผ่น (อย่างน้อย 1 แผ่น)`]); return; }
    if (!HS.includes(H)) { al.push(["d", `รายการที่ ${n}: ความสูงต้องเป็นขนาดมาตรฐาน 0.50 / 0.75 / 1.00 / 1.20 ม.`]); return; }
    const WTr = Math.floor(WT / 10) * 10, sk = Math.min(MAX_STACK, Math.max(1, Math.floor(r.st) || 1));
    if (qty % sk) al.push(["w", `รายการที่ ${n}: ซ้อนกัน ${sk} แผ่น แต่จำนวน ${fmt(qty)} แผ่นหารไม่ลงตัว`]);
    if (WT % 10) al.push(["w", `รายการที่ ${n}: ความกว้าง ${f2(WT)} ม. ไม่ลงทุก 0.01 ม. ปัดลงเป็น ${f2(WTr)} ม.`]);
    // กลาง/กลางเสา: ถ้าใส่ค่าหน้างานมาใช้ค่านั้น ไม่ใส่ = แนะนำจากกว้างรวม + เอวเสา + 2×ค่าเผื่อ
    const actual = r.cc > 0 ? Math.round(r.cc) : null;
    const cc = actual ?? WTr + p.tw + 2 * g;
    if (!(cc >= 600 && cc <= 6000)) { al.push(["d", `รายการที่ ${n}: กลาง/กลางเสา ${f2(cc)} ม. อยู่นอกช่วงที่ใช้ได้ (0.60–6.00 ม.)`]); return; }
    const F = fitWidth(p, G, cc, WTr);
    const maxW = maxWidthFor(p, cc, g);
    rowInfo[i] = { n, WT: WTr, cc, actual: actual != null, gr: F.gr, ze: F.ze, maxW, over: actual != null && WTr > maxW };
    if (rowInfo[i].over) al.push(["d", `รายการที่ ${n}: กลาง/กลางเสาหน้างาน ${f2(cc)} ม. ใช้แผ่นกว้าง ${f2(WTr)} ม. ไม่ได้ (เหลือค่าเผื่อข้างละ ${f3(Math.max(0, F.gr))} ม. น้อยกว่ามาตรฐาน ${f3(g)} ม.) แนะนำลดความกว้างเป็น ${f2(maxW)} ม.`]);
    else if (F.ze < 20) al.push(["d", `รายการที่ ${n}: ค่าเผื่อมากเกินไป แผ่นเสียบร่องได้น้อยกว่า 0.020 ม.${actual != null ? ` แนะนำเพิ่มความกว้างเป็น ${f2(maxW)} ม.` : ""}`]);
    if (F.mn < 3) al.push(["d", `รายการที่ ${n}: ลิ่มหนากว่าร่อง แผ่นจะติด`]);
    const it = getItem(items, G, S, WTr, H, al);
    it.qty += qty;
    it.cc.add(cc);
    const key = cc + "|" + WTr + "|" + H + "|" + sk;
    const gr = groups.get(key) || { cc, n: 0, F, stk: Array(sk).fill(H), WT: WTr };
    gr.n += qty; groups.set(key, gr);
  });
  if (S.sp) al.unshift(["w", SPECIAL_ORDER_WARNING]);
  return { p, G, g, S, stk: [], groups: [...groups.values()], rowInfo, nSpan: 0, nPile: 0, wLen: 0, direct: true, ...totals(items, input.truckKg, S), al };
}

// ---------- การผลิต ----------
// 1 โต๊ะผลิต 1 รอบ/วัน เสมอ และหล่อรหัสเดียวต่อวัน: แผ่นต่อวัน = (แถว × แผ่นต่อแถว) × จำนวนโต๊ะที่จัดให้รหัสนั้น
export function productionPlan(item, tables = 1) {
  const per = item.tf.R * item.tf.n;
  const perDay = per * tables;
  return { per, perDay, days: per && tables > 0 ? Math.ceil(item.qty / perDay) : null };
}

// จัดโต๊ะให้แต่ละรหัสอัตโนมัติ: ให้รหัสละ 1 โต๊ะก่อน (ถ้าโต๊ะพอ) แล้วเติมให้รหัสที่ใช้วันมากที่สุดทีละโต๊ะ จนโต๊ะหมด
// คืน { [code]: จำนวนโต๊ะ } — รหัสที่วางโต๊ะไม่ได้ได้ 0
export function allocateTables(list, tables) {
  const out = {}, ok = list.filter((i) => i.tf.R * i.tf.n > 0);
  list.forEach((i) => { out[i.code] = 0; });
  const days = (i) => (out[i.code] ? productionPlan(i, out[i.code]).days : Infinity);
  const byQty = [...ok].sort((a, b) => b.qty / (b.tf.R * b.tf.n) - a.qty / (a.tf.R * a.tf.n));
  let left = Math.max(0, Math.floor(tables));
  byQty.forEach((i) => { if (left > 0) { out[i.code] = 1; left--; } });
  while (left > 0 && ok.length) {
    const w = ok.reduce((m, i) => (days(i) > days(m) ? i : m), ok[0]);
    if (days(w) <= 1) break; // ทุกรหัสเสร็จภายใน 1 วันแล้ว ไม่ต้องเติมโต๊ะ
    out[w.code]++; left--;
  }
  // ปรับให้วันผลิตของแต่ละรหัสใกล้กันที่สุด: ย้ายโต๊ะจากรหัสหนึ่งไปอีกรหัสถ้าทำให้ (วันที่นานสุด, ผลต่างวัน) ดีขึ้น
  const score = () => { const d = ok.map((i) => days(i)); return [Math.max(...d), Math.max(...d) - Math.min(...d)]; };
  const better = (x, y) => x[0] < y[0] || (x[0] === y[0] && x[1] < y[1]);
  for (let moved = true, guard = 0; moved && ok.length > 1 && guard < 200; guard++) {
    moved = false;
    for (const f of ok) for (const t of ok) {
      if (f === t || out[f.code] < 2) continue;
      const s0 = score(); out[f.code]--; out[t.code]++;
      if (better(score(), s0)) moved = true; else { out[f.code]++; out[t.code]--; }
    }
  }
  return out;
}
