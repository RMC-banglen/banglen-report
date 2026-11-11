// © 2569 นุกูล ยอดเทียน — สร้างเพื่อบริษัท ร่วมมิตรคอนกรีต(บางเลน) จำกัด สงวนลิขสิทธิ์ ใช้ภายในบริษัทเท่านั้น ห้ามคัดลอกหรือเผยแพร่โดยไม่ได้รับอนุญาต
// รายการคำนวณเสาเข็มคอนกรีตอัดแรง (สูตรจากไฟล์ Excel บริษัท "691107-01 ... I-0.35_TIS.xlsx" ชีต I-35มอก) + หน้าปก/หน้าคั่น
// ใช้ได้ทุกหน้าตัด: เปลี่ยนค่าตามหน้าตัด (พื้นที่/โมเมนต์) ลวด PC เหล็กเดือย และเกลียว จากข้อมูลหน้าตัดใน pile-data.js
import { PILE_SECTIONS, TITLE_BLOCK } from "./pile-data.js?v=20261111095332";
import { ruleFor, autoSplit } from "./pile-calc.js?v=20261111095332";
import { esc } from "./draw2d.js?v=20261111095332";

export const FC = 350, FCI = 250, RH = 75, ES_MOD = 2000000; // ksc
const AREA_RB = { 6: 0.283, 9: 0.636, 12: 1.131 }; // เหล็กเส้นกลม RB (SR24, fy 2400) ตร.ซม.
const AREA_DB = { 10: 0.79, 12: 1.12, 16: 2.01, 20: 3.14, 25: 4.91 }; // ตร.ซม. (DB12 = 1.12 ตามใบคำนวณเดิม)
const FY = 4000; // SD40
const PI7 = 22 / 7; // ใบคำนวณเดิมใช้ 22/7

// ---- คุณสมบัติหน้าตัด (ซม.) ----
// หน้าตัดไอ: B = ลึก = กว้าง, f = ปีกตั้ง, c = เอวตรง, tw = ความหนาเอว, ด้านบ่า s = (B−tw)/2, ลาด t = (B−2f−c)/2
export function sectionProps(sec) {
  const g = sec.geo, B = g.B / 10;
  if (g.sq) return { B, Ac: B * B, p: 4 * B, Ix: Math.pow(B, 4) / 12, Zx: (Math.pow(B, 4) / 12) * 2 / B };
  const f = g.f / 10, c = g.c / 10, s = (B - g.tw / 10) / 2, t = (B - 2 * f - c) / 2, slant = Math.sqrt(t * t + s * s);
  const Ac = B * B - c * 2 * s - 4 * 0.5 * s * t;
  const p = 2 * f + 2 * slant + 2 * c + 2 * slant + 2 * f + 2 * B;
  const Ix = (1 / 12) * B * Math.pow(B, 3) - (1 / 12) * 2 * s * Math.pow(c, 3) - 4 * ((1 / 12) * s * Math.pow(t, 3) + 0.5 * s * t * Math.pow(c / 2, 2));
  return { B, Ac, p, Ix, Zx: (Ix * 2) / B };
}

// มาตรฐานโรงงาน (Excel รายการคำนวณ I-0.22 รง.): Pu ลวดตามตาราง ไม่คูณ 1.05 และสัมประสิทธิ์ Pe = Pi − 0.1257·T (4 มม.) / 0.1964·T (5 มม.) • มอก.: 1.05 และ 0.125 / 0.196
const wireSteel = (n4, n5, fac) => {
  const f = fac ? 1 : 1.05;
  const rows = [
    { name: "PC wire 4 mm.", Pu: f * 2274, k: fac ? 0.1257 : 0.125, n: n4, tis420: false },
    { name: "PC wire 5 mm.", Pu: f * 3538, k: fac ? 0.1964 : 0.196, n: n5, tis420: false },
    { name: "PC.strand 9.5mm.", Pu: 10430, k: 0.548, n: 0, tis420: true },
    { name: "PCstrand12.7mm.", Pu: 18763, k: 0.987, n: 0, tis420: true },
  ];
  rows.forEach((r) => { r.Pi = r.Pu * 0.75; });
  return rows;
};

// opts.w4/w5/Lmax ใช้ทดสอบ/กำหนดเอง ปกติไม่ใส่ (ใช้ท่อนที่ยาวที่สุดและตารางลวดของท่อนนั้น)
export function structCalc({ secKey, pieceLens, Qa, wires, opts = {} }) {
  const sec = PILE_SECTIONS[secKey], pr = sectionProps(sec);
  // ความยาวตรวจแรงยก = ท่อนที่ยาวที่สุด ส่วนลวด/เหล็กเดือย = ตารางของท่อนที่ให้แรงอัดรวม (Pi) น้อยที่สุด (ตามใบคำนวณเดิม: I-18 10+11 ใช้ลวด 2/2, I-35 11+12 ใช้ลวด 2/8)
  const Lmax = opts.Lmax || Math.max(...pieceLens), puF = sec.fac ? 1 : 1.05, pi = (r) => r.w4 * puF * 2274 * 0.75 + r.w5 * puF * 3538 * 0.75;
  const cand = pieceLens.map((l) => ruleFor(sec, l, wires) || sec.rules[sec.rules.length - 1]);
  const rule = cand.reduce((m, r) => (pi(r) < pi(m) ? r : m), cand[0]);
  const w4 = opts.w4 ?? rule.w4, w5 = opts.w5 ?? rule.w5, dowel = rule.dowel;
  const w = (pr.Ac * 2400) / 100 / 100;
  const Mm = Lmax * Lmax * w * 0.0215, M = 1.3 * Mm, MZ = (M / pr.Zx) * 100;
  const rows = wireSteel(w4, w5, !!sec.fac);
  const totPi = rows.reduce((a, r) => a + r.n * r.Pi, 0), fci = totPi / pr.Ac;
  const ES = (fci * ES_MOD) / (15100 * Math.sqrt(FCI)), SH = 1200 - 11 * RH, Fcds = 0, CR = 12 * fci - 7 * Fcds;
  const RE95 = 1270 - 0.4 * ES - 0.2 * (SH + CR), RE420 = 1410 - 0.4 * ES - 0.2 * (SH + CR);
  const T95 = ES + SH + CR + RE95, T420 = ES + SH + CR + RE420;
  rows.forEach((r) => { r.Pe = r.Pi - r.k * (r.tis420 ? T420 : T95); r.totPi = r.n * r.Pi; r.totPe = r.n * r.Pe; });
  const totPe = rows.reduce((a, r) => a + r.totPe, 0), fce = totPe / pr.Ac;
  const chk = {
    t1: MZ + fci, t1lim: FCI * 0.6, t2: -MZ + fci, t2lim: -Math.sqrt(FCI) * 0.8,
    w1: MZ + fce, w1lim: FC * 0.45, w2: -MZ + fce, w2lim: -Math.sqrt(FC) * 1.59,
  };
  chk.t1ok = chk.t1lim > chk.t1; chk.t2ok = chk.t2lim < chk.t2; chk.w1ok = chk.w1lim > chk.w1; chk.w2ok = chk.w2lim < chk.w2;
  const ult = ((0.85 * FC - 0.6 * fce) * pr.Ac) / 1000, safe = ((0.33 * FC - 0.27 * fce) * pr.Ac) / 1000;
  // เหล็กปลอก (เกลียว): ความยาวต่อ 1 รอบ ≈ เส้นรอบรูปหัก 8 เท่าระยะผิวถึงเหล็กปลอก (ปรับตามขนาดเสา: I-18 → 0.68 ม., I-35 → 1.50 ม. ตรงกับใบคำนวณเดิม)
  const sp = sec.spiral, B = pr.B, tin = 2.6 + (B - 18) * (0.59 / 17);
  const loopLen = Math.round((pr.p - 8 * tin)) / 100, vol = ((PI7 * sp.wire * sp.wire) / 4 / 100) * loopLen * 100;
  const st = {
    d: sp.wire, loopLen, vol, endLen: sp.endLen, endStep: sp.endStep, nearLen: sp.nearLen, nearStep: sp.nearStep, midStep: sp.midStep,
    reqA: 1.5 * B * pr.Ac * 0.005, reqB: 3 * pr.Ac * B * 0.002, reqC: pr.Ac * 0.0008 * 100,
  };
  st.nA = st.reqA / vol; st.nB = st.reqB / vol; st.nC = st.reqC / vol;
  st.usedA = (2 * sp.endLen) / sp.endStep; st.usedB = sp.nearLen / sp.nearStep; st.usedC = 1 / sp.midStep;
  // รอยต่อ: เหล็กเดือย + งานเชื่อม
  // เหล็กเดือย: DB (SD40 fy4000) หรือ RB (SR24 fy2400) แยกแถวบน/ล่างได้ (โรงงาน I-22: 2-RB9 + 2-DB12)
  const nTop = Math.floor(dowel.n / 2), bars = (dowel.rows ? [{ n: nTop, ...dowel.rows.top }, { n: dowel.n - nTop, ...dowel.rows.bot }] : [{ n: dowel.n, d: dowel.d, k: dowel.k }]).map((b) => {
    const k = b.k || "DB", area = k === "RB" ? AREA_RB[b.d] : AREA_DB[b.d], fy = k === "RB" ? 2400 : FY;
    return { n: b.n, d: b.d, k, area, fy, cap: area * fy, len: b.len ?? dowel.len };
  });
  const main = bars.reduce((m, b) => (b.d > m.d ? b : m), bars[0]), dbCm = main.d / 10, cap = main.cap, force = totPe;
  const nowel = dowel.n, dowelCap = bars.reduce((t, b) => t + b.n * b.cap, 0);
  const weldOpts = [6, 8, 10, 12], dowelWeld = PI7 * bars.reduce((t, b) => t + (b.d / 10) * b.n, 0);
  let wsz = weldOpts.find((s) => force / (104 * s) <= dowelWeld) || 12;
  const weld = { cls: "E70", size: wsz, perCm: 104 * wsz, need: force / (104 * wsz), dowelWeld };
  weld.ok = dowelWeld > weld.need;
  const ldc = (0.075 * dbCm * main.fy) / Math.sqrt(FC), useLd = Math.round(Math.max(...bars.map((b) => b.len)) * 100);
  return {
    secKey, sec, pr, w, Lmax, rule, w4, w5, Qa,
    pick: { l: 0.207 * Lmax, Mm, M, MZ }, loss: { fci, ES, SH, Fcds, CR, RE95, RE420, T95, T420 },
    rows, totPi, totPe, fci, fce, chk, ult, safe, st,
    joint: { n: nowel, d: main.d, bars, cap, dowelCap, force, ok: dowelCap > force, weld, ldc, minLd: 30, useLd },
  };
}

// ---- ข้อความชื่อรายการ ----
const m2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
const pcsTxt = (lens) => (lens.length > 1 && new Set(lens).size === 1 && Math.abs(lens[0] - 1.5) < 1e-9 ? `( Micropile ${m2(lens[0])} m. ${lens.length} ท่อนต่อเชื่อม )` : lens.length > 1 ? `( ${lens.length} ท่อนต่อเชื่อม ${lens.map((v) => (Number.isInteger(v) ? v : m2(v)) + "m.").join("+")} )` : "( ท่อนเดี่ยว )");
export function pileTitle(p, lens) {
  const sec = PILE_SECTIONS[p.section], k = (+p.section.slice(1) / 100).toFixed(2);
  return sec.geo.sq ? `S-${k} x ${k} x ${m2(p.L)}m. ${pcsTxt(lens)}` : `I-${k} x ${k} x ${m2(p.L)}m. ${pcsTxt(lens)}`;
}
export const pieceLensOf = (p) => (p.pieces > 1 ? (p.split && p.split.length === p.pieces ? p.split : autoSplit(p.L, p.pieces)) : [p.L]);

// ---- HTML ----
const f = (v, d = 2) => (isFinite(v) && Math.abs(v) > 1e-9 ? v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) : "-"); // ศูนย์แสดงเป็น - ตามใบคำนวณเดิม
const FONT = "'Sarabun','Noto Sans Thai',Tahoma,sans-serif";
const CSS = `<style>
.cqsp{width:794px;height:1123px;background:#fff;color:#000;box-sizing:border-box;font-family:${FONT};font-size:11.5px;position:relative}
.cqsp *{box-sizing:border-box}
.cqsp .cqfr{position:absolute;left:36px;right:36px;top:36px;min-height:1050px;border:1.2px solid #000;display:flex;flex-direction:column}
.cqsp .cqhd{display:flex;border-bottom:1.2px solid #000}
.cqsp .cqhd .cqlg{width:250px;padding:8px 10px;text-align:center;border-right:1.2px solid #000;display:flex;flex-direction:column;align-items:center;justify-content:center}
.cqsp .cqhd .cqlg img{width:112px}
.cqsp .cqhd .cqti{flex:1;padding:6px 10px;line-height:1.55}
.cqsp .cqhd .cqti b{font-size:12px}
.cqsp .cqpj{display:grid;grid-template-columns:88px 10px 1fr;margin-top:3px;border-top:1px solid #000;padding-top:3px}
.cqsp .cqbar{text-align:center;font-weight:700;font-size:13px;padding:5px;border-bottom:1px solid #000}
.cqsp .cqsec{font-weight:700;font-size:12px;padding:5px 8px 3px}
.cqsp .cqr{display:grid;grid-template-columns:210px 214px 16px 86px 1fr;align-items:center;min-height:18px;padding:0 8px}
.cqsp .cqr.t{grid-template-columns:1fr 1fr;}
.cqsp .cqr .cqv{text-align:right;padding-right:6px}
.cqsp .cqr .cqe{text-align:center}
.cqsp .cqr>span{white-space:nowrap}
.cqsp .cqr.cqw>span{white-space:normal}
.cqsp .cqtwo{display:grid;grid-template-columns:0.9fr 1.1fr;border-bottom:1px solid #aaa}
.cqsp .cqtwo>.cqr:last-child>span:first-child{white-space:nowrap}
.cqsp .cqrows{position:relative}
.cqsp .cqvl{position:absolute;left:45%;top:0;bottom:0;border-left:1px solid #000}
.cqsp .cqrows>.cqtwo:last-child{border-bottom:none}
.cqsp.cqp2 .cqr{min-height:30px}
.cqsp.cqp2 .cqsec{padding:12px 8px 6px;font-size:13px}
.cqsp.cqp2 .cqbar{padding:9px;font-size:14px}
.cqsp .cqsub{padding:3px 8px 1px;font-weight:600}
.cqsp .cqbd>.cqsub{border-top:1px solid #000;margin-top:2px}
.cqsp .cqbd>.cqsub:first-child{border-top:none;margin-top:0}
.cqsp table.cqtb{width:100%;border-collapse:collapse;font-size:12px}
.cqsp table.cqtb td,.cqsp table.cqtb th{border:none;padding:3px 5px;text-align:center;font-weight:400}
.cqsp table.cqtb.cqdot td{border-bottom:1px dotted #000}
.cqsp table.cqhd8 td,.cqsp table.cqhd8 th{border:1px solid #000;font-weight:700;padding:5px 4px}
.cqsp table.cqhd8 tr:first-child>*{border-top:none}
.cqsp table.cqhd8 tr:last-child>*{border-bottom:none}
.cqsp table.cqhd8 tr>*:first-child{border-left:none}
.cqsp table.cqhd8 tr>*:last-child{border-right:none}
.cqsp .cqred{color:#c00000;font-weight:700}
.cqsp .cqblue td{color:#1f3fd0;font-weight:400}
.cqsp table.cqhd8{table-layout:fixed;width:100%}
.cqsp .cqsg{width:280px;text-align:center;font-size:12px;line-height:1.6}
.cqsp .cqsg .cqln{height:44px;border-bottom:1.2px solid #000}
.cqsp .cqvt{position:relative;width:30px;flex:none;border-right:1px solid #000}
.cqsp .cqvt span{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-90deg);white-space:nowrap;font-weight:700;font-size:10px;line-height:1.2;text-align:center}
.cqsp .cqgrp{display:flex}
.cqsp .cqgrp>.cqbd{flex:1}
.cqsp .cqeng{border:1px solid #000;display:inline-block;padding:3px 8px;margin:8px;font-weight:700;font-size:11px}
.cqsp .cqnm{text-align:center;margin:30px 0 8px}
</style>`;

const logo = (src) => `<img src="${src}" alt="">`;
const head = (project, title, logoSrc) => `<div class="cqhd"><div class="cqlg">${logo(logoSrc)}<div style="font-weight:700;font-size:11px;margin-top:3px">บริษัท ร่วมมิตรคอนกรีต (บางเลน) จำกัด</div><div style="font-size:9.5px">299 หมู่12 ต.บางภาษี อ.บางเลน จ.นครปฐม 73130</div></div>
<div class="cqti"><b>รายการคำนวณเสาเข็มคอนกรีตอัดแรง ขนาด ${esc(title.line1)}</b><br>${esc(title.line2)} ${title.std}
<div class="cqpj"><span>โครงการ</span><span>:</span><span>${esc(project.pj || "")}</span>${project.ow ? `<span>เจ้าของโครงการ</span><span>:</span><span>${esc(project.ow)}</span>` : ""}<span>สถานที่</span><span>:</span><span>${esc(project.lo || "")}</span></div></div></div>`;

const row = (l, s, v, u, o = {}) => `<div class="cqr"><span>${l}</span><span>${s || ""}</span><span class="cqe">${o.eq === false ? "" : "="}</span><span class="cqv ${o.cls || ""}">${v}</span><span>${u || ""}</span></div>`;
const rowSub = (t) => `<div class="cqsub">${t}</div>`;

function titleParts(p, lens) {
  const sec = PILE_SECTIONS[p.section], k = (+p.section.slice(1) / 100).toFixed(2), sq = sec.geo.sq;
  return { kindTh: sq ? "หน้าตัดสี่เหลี่ยม" : "หน้าตัดตัว I", line1: `${sq ? "S" : "I"}-${k} x ${k} x ${m2(p.L)}m.`, line2: pcsTxt(lens), std: sec.fac ? "มาตรฐานโรงงาน" : "มาตรฐาน มอก.396-2549" };
}

// หน้า 1: คุณสมบัติหน้าตัด • ตรวจแรงยกเสา • การสูญเสียแรงอัด • วัสดุ • ตรวจหน่วยแรง • กำลังรับน้ำหนัก
// opts.cap = แสดงตารางกำลังรับน้ำหนัก (CAPACITIES OF SECTION) ปกติซ่อนไว้ ติ๊กเลือกแสดงได้ในหน้าส่งออก
export function calcPage1(p, project, c, logoSrc = "assets/logo.png", opts = {}) {
  const lens = pieceLensOf(p), t = titleParts(p, lens), pk = c.pick, ls = c.loss, g = c.chk;
  const ok = (b) => `<b class="cqred">${b ? "OK" : "NO.K"}</b>`;
  const mat = c.rows.map((r) => `<tr><td style="text-align:left">${r.name}</td><td>${f(r.Pu)}</td><td>${f(r.Pi)}</td><td>${f(r.Pe)}</td><td>${f(r.n)}</td><td>${f(r.totPi)}</td><td>${f(r.totPe)}</td></tr>`).join("");
  return `${CSS}<div class="cqsp"><div class="cqfr">${head(project, t, logoSrc)}
<div class="cqbar">PROPERTIES OF &nbsp;PILE</div>
<table class="cqtb cqhd8"><tr><th>Ac (cm2.)</th><th>L (max) (m.)</th><th>p (cm.)</th><th>w (kg/m.)</th><th>Ix (cm4.)</th><th>Zx (cm3.)</th><th>fc' cy (ksc.)</th><th>fci' cy (ksc.)</th></tr>
<tr class="cqblue"><td>${f(c.pr.Ac)}</td><td>${f(c.Lmax)}</td><td>${f(c.pr.p)}</td><td>${f(c.w)}</td><td>${f(c.pr.Ix)}</td><td>${f(c.pr.Zx)}</td><td>${f(FC)}</td><td>${f(FCI)}</td></tr></table>
<div class="cqsec" style="text-align:center;border-top:1px solid #000">TWO POINT PICKING CONDITION: ( PLUS &nbsp;30 % FOR IMPACTED LOAD )</div>
${row("l = 0.207( LENGTH OF PILE )", "(l)", f(pk.l), "m.")}
${row("Mmax &nbsp;= 0.0215 (w) (L) (L)", "(Mm)", f(pk.Mm), "kg-m.")}
${row("M &nbsp;= &nbsp;Mi &nbsp;= &nbsp;1.3(Mm)", "(M)", f(pk.M), "kg-m.")}
${row("M/Zx", "", f(pk.MZ), "ksc.")}
<div class="cqgrp" style="border-top:1px solid #000"><div class="cqvt"><span>LOSSES OF PRESTRESS</span></div><div class="cqbd">
${rowSub("LOSS DUE TO ELASTIC SHORTENING:")}
${row("Fcir", "Pi / Ag + Pi e2 / Ix - Ms e /Ix", f(ls.fci), "ksc.")}
${row("ES", "Es * Fcir / Eci", f(ls.ES), "ksc.")}
${rowSub("LOSS DUE TO SHRINKAGE:")}
${row("RH", "", f(RH), "%")}
${row("SH", "1200 - 11*RH", f(ls.SH), "ksc.")}
${rowSub("LOSS DUE TO CREEP OF CONCRETE:")}
${row("Fcds", "M e / I", f(ls.Fcds), "ksc.")}
${row("CR", "12*Fcir-7*Fcds", f(ls.CR), "ksc.")}
${rowSub("LOSS DUE TO RELAXATION OF PRESTRESSING STEEL: ( FOR PC.WIRE TIS 95-2525 )")}
${row("RE ( TIS 95-2525 )", "=1270-0.4*ES-0.2*(SH+CR)", f(ls.RE95), "ksc.")}
${row("RE ( TIS 420-2525 )", "=1410-0.4*ES-0.2*(SH+CR)", f(ls.RE420), "ksc.")}
${row("TOTAL(TIS 95-2525)", "=ES+SH+CR+RE", f(ls.T95), "ksc.")}
${row("TOTAL(TIS420-2525)", "=ES+SH+CR+RE", f(ls.T420), "ksc.")}
</div></div>
<div class="cqgrp" style="border-top:1px solid #000"><div class="cqvt"><span>PROPERTIES<br>OF MATERIAL</span></div><div class="cqbd" style="padding:4px">
<table class="cqtb cqdot"><tr><th>TYPE</th><th>Pu (kg.)</th><th>Pi (kg.)</th><th>Pe = Pi-Loss (kg.)</th><th>use No.</th><th>TOTAL Pi (kg.)</th><th>TOTAL Pe (kg.)</th></tr>${mat}
<tr><td colspan="5" style="text-align:right;font-weight:700">GRAND TOTAL</td><td>${f(c.totPi)}</td><td>${f(c.totPe)}</td></tr></table>
<div style="display:flex;justify-content:space-around;padding:6px 0;font-weight:600"><span>fci = Pi / Ac = <b>${f(c.fci)}</b> ksc</span><span>fce = Pe / Ac = <b>${f(c.fce)}</b> ksc</span></div></div></div>
<div class="cqgrp" style="border-top:1px solid #000;flex:1"><div class="cqvt"><span>CHECK STRESS<br>IN PC. PILE</span></div><div class="cqbd" style="padding:4px"><table class="cqtb cqdot">
<tr><th>AT TRANSFER STAGE</th><th>(M/Zx)+(fci)</th><th>&lt; 0.60 fci'</th><th>solution</th><th>-(M/Zx)+(fci)</th><th>&lt; -0.8 fci'<sup>1/2</sup></th><th>solution</th></tr>
<tr><td></td><td>${f(g.t1)}</td><td>${f(g.t1lim)}</td><td>${ok(g.t1ok)}</td><td>${f(g.t2)}</td><td>${f(g.t2lim)}</td><td>${ok(g.t2ok)}</td></tr>
<tr><th>AT WORKING STAGE</th><th>(M/Zx)+(fce)</th><th>&lt; 0.45 fc'</th><th>solution</th><th>-(M/Zx)+(fce)</th><th>&lt; -1.59 fc'<sup>1/2</sup></th><th>solution</th></tr>
<tr><td></td><td>${f(g.w1)}</td><td>${f(g.w1lim)}</td><td>${ok(g.w1ok)}</td><td>${f(g.w2)}</td><td>${f(g.w2lim)}</td><td>${ok(g.w2ok)}</td></tr></table></div></div>
${opts.cap ? `<div class="cqsec" style="border-top:1px solid #000">CAPACITIES OF SECTION</div>
${row("Ultimate load for pile", "(0.85*fc' - 0.6*fce)*Ac/1000", f(c.ult), "ton.")}
${row("Safe load for pile", "(0.33*fc' - 0.27*fce)*Ac/1000", f(c.safe), "ton.")}
${row("<b>SAFE LOAD</b>", "", `<b>${c.Qa > 0 ? f(c.Qa, 0) : "-"}</b>`, "ตัน", { eq: false })}` : ""}
<div style="border-top:1px solid #000;padding:6px 70px 16px 22px;margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end"><span class="cqeng" style="margin:0">ENGINEER IN CHARGE</span><div class="cqsg"><div class="cqln"></div><div>( ${esc(TITLE_BLOCK.approveByTh)} )</div><div>วิศวกร &nbsp; ${esc(TITLE_BLOCK.licence)}</div></div></div>
</div></div>`;
}

// หน้า 2: ออกแบบเหล็กปลอก • รอยต่อเชื่อม • ความยาวฝังเหล็กเดือย
export function calcPage2(p, project, c, logoSrc = "assets/logo.png") {
  const lens = pieceLensOf(p), t = titleParts(p, lens), st = c.st, j = c.joint, w = j.weld;
  const sf = (v) => String(Math.round(v * 10000) / 10000);
  const two = (a, b, c1, d) => `<div class="cqtwo"><div class="cqr cqw" style="grid-template-columns:1fr 70px 62px">${a}</div><div class="cqr cqw" style="grid-template-columns:1fr 80px 56px">${b}</div></div>`;
  const cell = (l, v, u) => `<span>${l}</span><span class="cqv">${v}</span><span>${u}</span>`;
  return `${CSS}<div class="cqsp cqp2"><div class="cqfr">${head(project, t, logoSrc)}
<div class="cqbar">DESIGN OF PRESTRESSED CONCRETE PILE</div>
<div class="cqstir"><div class="cqsec" style="border-bottom:1px solid #000">Design of strrups</div><div class="cqrows"><div class="cqvl"></div>
${two(cell("Used stirrups diameter", f(st.d, 1), "mm."), cell("Length of stirrups per loop", f(st.loopLen), "m."))}
${two(cell("", "", ""), cell("Volume of stirrups per loop", f(st.vol), "cm^3"))}
${two(cell("Range a & e at length 1.5B require volume of stirrups 0.50% of concrete volume", "", ""), cell("Require volume of stirrups", f(st.reqA), "cm^3"))}
${two(cell("Require number of stirrups", f(st.nA), "loops"), cell(`Used stirrups 2-CD${f(st.d, 1)}mm.@${sf(st.endStep)} at ${sf(st.endLen)} m.`, f(st.usedA), "loops"))}
${two(cell("Range b & d at length 3.0B require volume of stirrups 0.20% of concrete volume", "", ""), cell("Require volume of stirrups", f(st.reqB), "cm^3"))}
${two(cell("Require number of stirrups", f(st.nB), "loops"), cell(`Used stirrups CD${f(st.d, 1)}mm.@${sf(st.nearStep)} at ${sf(st.nearLen)} m.`, f(st.usedB), "loops"))}
${two(cell("Range c at midle span require volume of stirrups 0.08% of concrete volume", "", ""), cell("Require volume of stirrups", f(st.reqC), "cm^3/m."))}
${two(cell("Require number of stirrups", f(st.nC), "loops / m."), cell(`Used stirrups CD${f(st.d, 1)}mm.@${sf(st.midStep)}`, f(st.usedC), "loops/m."))}
</div></div>
<div class="cqsec" style="border-top:1px solid #000">Design of Joint welding</div>
${j.bars.map((b) => row(`Choose ${b.k}${b.d}mm. ${b.k === "RB" ? "SR24" : "SD40"} for Dowel ;`, `${f(b.area)} x ${f(b.fy, 0)}`, f(b.cap, 0), "kg. / No.")).join("")}
${row("Effictive pre-stress after loss", "", f(c.fce), "ksc.")}
${row("Total Force in pile", "", f(j.force, 0), "kg.")}
${row(`Use ${j.bars.map((b) => `${b.n}-${b.k}${b.d}mm.`).join(" + ")} &nbsp;For dowel`, "", f(j.dowelCap, 0) + " kg. &gt;", `${f(j.force, 0)} kg. &nbsp; <b class="cqred">${j.ok ? "OK" : "No.K"}</b>`)}
<div class="cqsec" style="border-top:1px solid #000">Design welding for dowel and plate and Plate to Plate.</div>
${row(`Choose welding class ${w.cls} ; Welding size ${w.size}mm.`, "", f(w.perCm, 0), "kg./cm.")}
${row("; Need welding length", "", f(w.need), "cm.")}
${row(`; For ${j.n} Dowel bar welding length`, "", f(w.dowelWeld), "cm. &nbsp; " + (w.ok ? `More than need ==&gt; <b class="cqred">OK</b>` : `<b class="cqred">No.K</b>`))}
<div class="cqsec" style="border-top:1px solid #000">Design develop length of dowel bar</div>
${row("; Develop length ; &nbsp;ldc = 0.075*db*fy / Sqrt(f'c)", "", f(j.ldc), "cm.")}
${row("; Minimum Develop length", "", f(j.minLd, 0), "cm.")}
${row("Use Develop Length", "", f(j.useLd, 0), "cm.")}
<div style="border-top:1px solid #000;padding:6px 70px 16px 22px;margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end"><span class="cqeng" style="margin:0">ENGINEER IN CHARGE</span><div class="cqsg"><div class="cqln"></div><div>( ${esc(TITLE_BLOCK.approveByTh)} )</div><div>วิศวกร &nbsp; ${esc(TITLE_BLOCK.licence)}</div></div></div>
</div></div>`;
}

// หน้าคั่นก่อนรายการคำนวณของเสาแต่ละต้น
export function dividerPage(p) {
  const lens = pieceLensOf(p), sec = PILE_SECTIONS[p.section], k = (+p.section.slice(1) / 100).toFixed(2);
  return `${CSS}<div class="cqsp"><div style="position:absolute;left:0;right:0;top:210px;text-align:center;font-size:18px;font-weight:700;line-height:2">รายการคำนวณเสาเข็มคอนกรีตอัดแรง${lens.length > 1 && lens.every((v) => Math.abs(v - 1.5) < 1e-9) ? " Micropile" : ""}<br>ขนาด ${sec.geo.sq ? "S" : "I"}-${k} x ${k} x ${m2(p.L)}m.<br>${esc(pcsTxt(lens))}<br>${sec.fac ? "มาตรฐานโรงงาน" : "มาตรฐาน มอก.396-2549"}</div></div>`;
}

// ปก: รายการเสาทุกต้น เรียงตามขนาดแล้วตามความยาว
// เรียง: เสา I ก่อนสี่เหลี่ยม → ขนาดเล็กไปใหญ่ → มอก. ก่อนโรงงาน → ความยาว
const famOf = (sec) => (PILE_SECTIONS[sec] && PILE_SECTIONS[sec].geo.sq ? 1 : 0);
export const sortPiles = (piles) => piles.slice().sort((a, b) => famOf(a.section) - famOf(b.section) || +a.section.slice(1) - +b.section.slice(1) || !!PILE_SECTIONS[a.section].fac - !!PILE_SECTIONS[b.section].fac || a.L - b.L);
export function coverPage(piles, project, logoSrc = "assets/logo.png") {
  const nFac = piles.filter((p) => PILE_SECTIONS[p.section].fac).length, mixed = nFac > 0 && nFac < piles.length, stdLine = nFac === piles.length ? "มาตรฐานโรงงาน" : "มาตรฐาน มอก. 396-2549";
  const list = sortPiles(piles).map((p) => { const k = (+p.section.slice(1) / 100).toFixed(2), sq = PILE_SECTIONS[p.section].geo.sq; return `<div style="margin:3px 0">${sq ? "S" : "I"}-${k} x ${k} x ${m2(p.L)}m. ${esc(pcsTxt(pieceLensOf(p)))}${mixed ? " " + (PILE_SECTIONS[p.section].fac ? "มาตรฐานโรงงาน" : "มอก.396-2549") : ""}</div>`; }).join("");
  return `${CSS}<div class="cqsp" style="text-align:center;font-size:14px"><div style="position:absolute;left:0;right:0;top:80px"><img src="${logoSrc}" style="width:190px" alt="">
<div style="font-weight:700;font-size:16px;margin-top:12px">บริษัท ร่วมมิตรคอนกรีต (บางเลน) จำกัด</div><div style="font-size:13px">299 หมู่12 ต.บางภาษี อ.บางเลน จ.นครปฐม 73130</div>
<div style="font-weight:700;margin-top:26px;font-size:16px">รายการคำนวณเสาเข็มคอนกรีตอัดแรง</div>${mixed ? "" : `<div style="margin-top:8px;font-weight:600">${stdLine}</div>`}
<div style="margin-top:14px;font-weight:600">${list}</div>
<div style="margin-top:80px;line-height:1.9"><div>โครงการ : &nbsp;${esc(project.pj || "")}</div>${project.ow ? `<div>เจ้าของโครงการ : &nbsp;${esc(project.ow)}</div>` : ""}<div>สถานที่ : &nbsp;${esc(project.lo || "")}</div></div>
<div style="margin:150px 80px 0 auto;width:280px;font-size:13px;line-height:1.7"><div style="height:60px;border-bottom:1.2px solid #000"></div><div>( ${esc(TITLE_BLOCK.approveByTh)} )</div><div>วิศวกร &nbsp; ${esc(TITLE_BLOCK.licence)}</div></div></div></div>`;
}
