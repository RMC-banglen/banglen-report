// อ่านข้อความคำขอรายการคำนวณเสาเข็ม (จากกลุ่มเทเลแกรม) + ใบคำนวณ blow count (สูตร Danish)
import { autoSplit } from "./pile-calc.js?v=20261110021915";
import { TITLE_BLOCK } from "./pile-data.js?v=20261110021915";
import { esc } from "./draw2d.js?v=20261110021915";

// พื้นที่หน้าตัด A (ตร.ซม.) และเส้นรอบรูป P (ซม.) ของเสา มอก.
export const AP = { T18: [275, 89], T22: [386, 105], T26: [489, 126], T30: [660, 145], T35: [880, 180], T40: [1240, 197.5],
  // มาตรฐานโรงงาน: พื้นที่และเส้นรอบรูปคิดจากหน้าตัดตามแบบ (ไม่หักบัว)
  F15: [140, 74.9], F18: [216, 89.3], F22: [344, 107.5], F26: [460, 129.9], F30: [585, 148.9], F35: [805, 176.0],
  Q22: [484, 88], Q26: [676, 104], Q30: [900, 120], // สี่เหลี่ยมโรงงาน B² (ไม่หักบัว) เส้นรอบรูป 4B
  S18: [324, 72], S22: [484, 88], S26: [676, 104], S30: [900, 120], S35: [1225, 140], S40: [1600, 160] };
const E = 0.75, FS = 2.5, EC = 300;

export const TEMPLATE = `โครงการ ........................
เจ้าของ คุณ ........................
สถานที่ ต./อ./จ. ........................
I 0.22×19.00 ม. (มอก) ต/ช
ตุ้ม 3.21 t.
Qa. 23 t.
ยก 40 cm.
__________
I 0.22×15.00 ม. (มอก)
ตุ้ม 3.21 t.
Qa. 23 t.
ยก 40 cm.`;

const n = (s) => parseFloat(s);

const LOC_KEY = /แขวง|เขต|(^|\s)(ต|อ|จ)\.|[ก-๙](ต|อ|จ)\.(?=[ก-๙])|ตำบล|อำเภอ|จังหวัด|ถนน|ซอย|หมู่/;
const LOC_LINE = /^(แขวง|เขต|ต\.|อ\.|จ\.|ตำบล|อำเภอ|จังหวัด|ถนน|ซอย|หมู่|ถ\.|กรุงเทพ)/;
const LABEL = /(หน่วยงาน|ชื่องาน|โ?ครงการ|เจ้าของโครงการ|เจ้าของ|สถานที่ก่อสร้าง|สถานที่)/;
// 1 บรรทัดมีได้หลายป้าย เช่น "หน่วยงาน ... เจ้าของ ..." หน่วยงาน = โครงการ ; บรรทัดไม่มีป้าย = สถานที่
function parseHeadLine(l, p) {
  const parts = l.split(LABEL), clean = (t) => t.replace(/^[\s:.]+/, "").replace(/\.{4,}/g, "").trim();
  if (parts.length === 1) {
    const t = clean(l); if (!t) return;
    if (!p.ow && OWNER_LINE.test(t)) { p.ow = t; p._last = "ow"; return; }
    if (p._last === "pj" && !LOC_LINE.test(t)) { p.pj += " " + t; return; } // ชื่อโครงการยาวขึ้นบรรทัดใหม่ ต่อกัน
    p.lo = (p.lo ? p.lo + " " : "") + t; p._last = "lo"; return;
  }
  if (clean(parts[0])) { p.lo = (p.lo ? p.lo + " " : "") + clean(parts[0]); p._last = "lo"; }
  for (let i = 1; i < parts.length; i += 2) {
    const lab = parts[i], t = clean(parts[i + 1] || "");
    if (lab === "โครงการ" || lab === "ครงการ" || lab === "หน่วยงาน" || lab === "ชื่องาน") { p.pj = t; p._last = "pj"; } // หน่วยงาน = โครงการ ไม่เอาคำว่า หน่วยงาน/โครงการ มาใส่ในชื่อ
    else if (/^เจ้าของ/.test(lab)) { p.ow = t; p._last = "ow"; }
    else { p.lo = (p.lo ? p.lo + " " : "") + t; p._last = "lo"; }
  }
}

// ชื่อเจ้าของแบบเต็มทางการ: บจก./บ./บริษัท.X → "บริษัท X จำกัด", บมจ. → "บริษัท X จำกัด (มหาชน)", รพ. → โรงพยาบาล, หจก. → ห้างหุ้นส่วนจำกัด, นาย/นาง/น.ส. → คุณ
const ORG_RE = /^(บริษัท|บจก|บมจ|หจก|ห้างหุ้นส่วน|โรงพยาบาล|รพ\.|โรงเรียน|มหาวิทยาลัย|วัด|อบต|อบจ|เทศบาล|องค์การ|กรม|สำนักงาน|การไฟฟ้า|การประปา|มูลนิธิ|สหกรณ์|กองทัพ|ศาล|กระทรวง|การรถไฟ|การทางพิเศษ|ที่ว่าการ|สถานีตำรวจ|ธนาคาร|นิติบุคคล|สมาคม|ร้าน|หมู่บ้าน)/;
const OWNER_LINE = /^(บริษัท|บจก|บมจ|หจก|ห้างหุ้นส่วน|รพ\.|โรงพยาบาล|คุณ|นาย|นาง|นางสาว|น\.ส\.)/;
export function normOwner(s0) {
  const s = String(s0 || "").normalize("NFC").replace(/\s+/g, " ").trim(); let m;
  if (!s) return "";
  // เจ้าของหลายคน (คุณ ก คุณ ข) → "คุณ ก และ คุณ ข" ตัวต่อตัว
  const many = s.split(/\s+(?=(?:คุณ|นางสาว|น\.ส\.|นาย|นาง)\s*\S)/).filter(Boolean);
  if (many.length > 1 && !/และ|,/.test(s)) return many.map(normOwner).join(" และ ");
  if ((m = s.match(/^(?:บมจ\.?|บริษัท\.?\s*มหาชน)\s*(.+?)\s*(?:จำกัด)?\s*(?:\(?\s*มหาชน\s*\)?)?$/))) return "บริษัท " + m[1] + " จำกัด (มหาชน)";
  if ((m = s.match(/^(?:บจก\.?|บ\.|บริษัท)\.?\s*(.+?)\s*\(?\s*มหาชน\s*\)?$/))) return "บริษัท " + m[1].replace(/\s*จำกัด$/, "") + " จำกัด (มหาชน)";
  if ((m = s.match(/^(?:บจก\.?|บ\.|บริษัท)\.?\s*(.+?)\s*(?:จำกัด|จก\.?)?$/))) return "บริษัท " + m[1] + " จำกัด";
  if ((m = s.match(/^รพ\.?\s*(.+)$/))) return "โรงพยาบาล" + m[1];
  if ((m = s.match(/^(?:หจก\.?|ห้างหุ้นส่วนจำกัด)\s*(.+)$/))) return "ห้างหุ้นส่วนจำกัด " + m[1];
  if ((m = s.match(/^(?:นางสาว|น\.ส\.|นาย|นาง)\.?\s*(.+)$/))) return "คุณ " + m[1].trim();
  if (/^คุณ/.test(s) || ORG_RE.test(s)) return s;
  return "คุณ " + s; // ไม่มีคำนำหน้า = บุคคล
}

// → { project:{pj,ow,lo}, piles:[{section,sizeCm,L,pieces,split,W,Qa,H,errs[]}] }
// เสาแต่ละต้นเริ่มที่บรรทัดแบบ (I 0.30x22.00 ...) ไปจนถึงบรรทัดแบบถัดไป ไม่ต้องมีเส้นคั่น
export function parseRequest(text, secs) {
  const pileRe = /(^|\s)([IiSsไอเอส])\s*[-.]?\s*(\d*\.?\d+)\s*[x×*X]\s*(\d+(?:\.\d+)?)/;
  const all = String(text || "").replace(/[​-‍﻿\r]/g, "").split("\n")
    .map((l) => l.replace(/^\s*\[?\d{1,2}[:.]\d{2}\]?\s+[^\s]{1,25}\s+(?=\S)/, "").trim()) // ตัดเวลา/ชื่อผู้ส่งที่ติดมาจากไลน์
    .filter((l) => l && !/^[_\-=*]{3,}$/.test(l));
  const idxs = []; all.forEach((l, i) => { if (pileRe.test(l)) idxs.push(i); });
  const project = { pj: "", ow: "", lo: "" }, piles = [];
  all.slice(0, idxs.length ? idxs[0] : all.length)
    .reduce((a, l) => { if (a.length && /(คุณ|นาย|นาง|นางสาว|น\.ส\.)$/.test(a[a.length - 1])) a[a.length - 1] += l; else a.push(l); return a; }, []) // ชื่อที่ขึ้นบรรทัดใหม่หลังคำนำหน้า ต่อกลับเป็นบรรทัดเดียว
    .forEach((l) => parseHeadLine(l, project));
  { // ชื่อโครงการที่มีสถานที่ต่อท้ายในบรรทัดเดียว (… แขวงรามอินทรา เขต… / … ต.แม่กลอง) → ตัดส่วนสถานที่ออก และตัดเลขที่โครงการนำหน้า ("6904 :")
    const cut = project.pj.search(/(^|\s)(แขวง|ต\.|ตำบล|ถ\.|ซ\.)/);
    if (cut > 0) { project.lo = (project.pj.slice(cut).trim() + (project.lo ? " " + project.lo : "")).trim(); project.pj = project.pj.slice(0, cut).trim(); }
  }
  if (project.ow) { // ชื่อเจ้าของตัดเฉพาะชื่อ ส่วนที่ต่อจากนั้น (แขวง/เขต/ต./อ./จ. ...) เป็นสถานที่
    const mk = LOC_KEY.exec(project.ow), k = mk ? mk.index + (/^[฀-๿](ต|อ|จ)./.test(mk[0]) ? 1 : 0) : -1; // ต./อ./จ. ติดท้ายชื่อ: จุดตัดอยู่หลังตัวอักษรหน้ามัน
    if (k > 0) { project.lo = (project.ow.slice(k) + (project.lo ? " " + project.lo : "")).trim(); project.ow = project.ow.slice(0, k).trim(); }
  }
  project.lo = project.lo.replace(/(แขวง|เขต)\.\s*/g, "$1").replace(/กทม\.?|กรุงเทพฯ?(?!มหานคร)/g, "กรุงเทพมหานคร").replace(/(^|\s)(ต|อ|จ)\.\s+(?=[ก-๙])/g, "$1$2.").replace(/\s+/g, " ").trim(); // กทม. → กรุงเทพมหานคร ชื่อเต็มเสมอ • "ต. สนามจันทร์" → "ต.สนามจันทร์"
  if (/^(คุณ|นาย|นาง|นางสาว)?$/.test(project.ow)) project.ow = "";
  if (/^[ต./อจ\s]*$/.test(project.lo)) project.lo = ""; // เหลือแต่ "ต./อ./จ." จากฟอร์มเปล่า
  // ชื่อโครงการ: จุดที่พิมพ์คั่นคำ ("ก่อสร้าง.บ้านแกรนด์สิริ.ทาวน์โฮม") = เว้นวรรค (ตัวย่อ ค.ส.ล. คงไว้) และแยกเลขกับคำ ("2ชั้น4คูหา" → "2 ชั้น 4 คูหา")
  project.pj = project.pj.replace(/([฀-๿]{2,})\.(?=[฀-๿A-Za-z])/g, (m, w) => (/(อบต|อบจ|รพ|บจก|บมจ|หจก|กทม)$/.test(w) ? m : w + " ")).replace(/(\d)([ก-ฮ])/g, "$1 $2").replace(/([ก-ฮะ-ฺ็-๎])(\d)/g, "$1 $2").replace(/\s+/g, " ").trim();
  // หน่วยงานรัฐ: ถ้าไม่ได้ระบุเจ้าของ และชื่อโครงการขึ้นต้นด้วยชื่อหน่วยงานรัฐ (เทศบาล/อบต./กรม/การไฟฟ้า ฯลฯ) ชื่อหน่วยงานนั้นคือเจ้าของ
  if (!project.ow) {
    const t = project.pj.replace(/^(งานก่อสร้าง|ก่อสร้าง)\s*/, ""), org = t.split(/\s+(?=ก่อสร้าง|งานก่อสร้าง|โครงการ|ปรับปรุง|ต่อเติม|(?:\()?\d)/)[0].trim();
    if (/^(โรงพยาบาล|รพ.|เทศบาล|องค์การบริหารส่วน|อบต|อบจ|กรม|กระทรวง|การไฟฟ้า|การประปา|การรถไฟ|การทางพิเศษ|สำนักงาน|ที่ว่าการ|สถานีตำรวจ|กองทัพ)/.test(org)) project.ow = org;
  }
  const notes = [];
  if (project.ow && !OWNER_LINE.test(project.ow) && !ORG_RE.test(project.ow)) notes.push('เจ้าของ "' + project.ow + '" ไม่มีคำนำหน้า ระบบใส่ "คุณ" ให้ (ขอยืนยันชื่อ)');
  project.ow = normOwner(project.ow); delete project._last;
  idxs.forEach((ix, k) => {
    const body = all.slice(ix, k + 1 < idxs.length ? idxs[k + 1] : all.length).join("\n"), m = all[ix].match(pileRe);
    const kind = /^[Ii]|ไอ/.test(m[2]) ? "T" : "S", sizeCm = Math.round(n(m[3]) < 1 ? n(m[3]) * 100 : n(m[3])), L = n(m[4]);
    // มาตรฐาน: ข้อความมีคำว่า "โรงงาน" (หรือขนาด I-15 ที่มีแต่โรงงาน) = เสาโรงงาน ไม่เขียน = มอก. (ไม่แตะ มอก.)
    const fac = /โรงงาน/.test(body) || (kind === "T" && !secs["T" + sizeCm] && !!secs["F" + sizeCm]);
    const key = (fac ? (kind === "T" ? "F" : "Q") : kind) + sizeCm, errs = [], asks = [];
    const micro = /ไมโคร|micro/i.test(body), mn = micro ? body.match(/(\d+)\s*ท่อน/) : null; // ไมโครไพล์: "(12ท่อนต่อ)" = ท่อนสั้นเท่ากัน n ท่อน
    if (/หก\s*เหลี่ยม/.test(body)) errs.push("เสาหกเหลี่ยม ยังไม่รองรับ");
    if (!secs[key] && !errs.some((e) => /ยังไม่รองรับ/.test(e))) errs.push("ไม่มีหน้าตัด " + (kind === "T" ? "I" : "S") + "-" + sizeCm + (fac ? " โรงงาน" : "") + " ในระบบ");
    const ex = body.match(/(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)(?:\s*\+\s*(\d+(?:\.\d+)?))?/);
    let pieces = 1, split = null;
    if (ex) { split = ex.slice(1).filter(Boolean).map(n); pieces = split.length; if (Math.abs(split.reduce((a, b) => a + b, 0) - L) > 0.01) errs.push("ความยาวแต่ละท่อนรวมไม่เท่าความยาวเสา"); }
    else if (/ต\s*[\/.]?\s*[ชซ]|ต่อ/.test(body)) pieces = 2;
    if (micro) { // ไมโครไพล์ (มอก./โรงงาน): ท่อนละ 1.5 ม. เท่ากันทุกท่อน จำนวนท่อน = ความยาว ÷ 1.5
      const nm = L / 1.5; split = null; pieces = 1;
      if (!(L > 0) || Math.abs(nm - Math.round(nm)) > 1e-6 || nm < 2) errs.push("ไมโครไพล์ ความยาว " + L + " ม. หาร 1.5 ไม่ลงตัว");
      else { pieces = Math.round(nm); split = Array(pieces).fill(1.5); if (mn && +mn[1] !== pieces) errs.push("ไมโครไพล์ ระบุ " + mn[1] + " ท่อน แต่ " + L + " ม. = " + pieces + " ท่อน"); }
    }
    const get = (re) => { const x = body.match(re); return x ? n(x[1]) : 0; };
    // "ตุ้ม": วรรณยุกต์/สระอาจเรียงสลับกันตามแป้นพิมพ์ จึงรับทั้งสองลำดับ
    const W = get(/ต[ุ้]{0,2}ม\s*[:.=]?\s*(\d+(?:\.\d+)?)/), Qa = get(/Qa\s*[.:=]?\s*(\d+(?:\.\d+)?)/i), H = get(/ยก\s*[:.=]?\s*(\d+(?:\.\d+)?)/);
    if (!W) errs.push("ไม่พบน้ำหนักตุ้ม"); if (!Qa) errs.push("ไม่พบ Qa"); if (!H) errs.push("ไม่พบระยะยก");
    // จำนวนลวด PC (เสาที่เลือกได้ เช่น I-15 โรงงาน 3 หรือ 4 เส้น): "ลวด 3 เส้น" / "4 เส้น"
    let wires = 0; const wm = body.match(/(?:ลวด|wire|pc)[^\d\n]{0,8}(\d)\s*เส้น|(\d)\s*เส้น/i); if (wm) wires = +(wm[1] || wm[2]);
    if (secs[key] && secs[key].rules.some((x) => x.wires)) { if (!(wires === 3 || wires === 4)) { asks.push("ไม่ระบุจำนวนลวด PC (3 หรือ 4 เส้น) ระบบใช้ตามความยาวเสา"); wires = 0; } } else wires = 0;
    piles.push({ section: key, sizeCm, kind, L, pieces, split, W, Qa, H, wires, errs, asks });
  });
  return { project, piles, notes };
}

// ผลคำนวณ Danish: S (ซม./ครั้ง), จำนวนครั้ง/10 ซม. และ/30 ซม.
export function blow(sectionKey, L, W, H, Qa) {
  const [A, P] = AP[sectionKey] || [0, 0]; if (!A || !(W > 0) || !(H > 0) || !(Qa > 0)) return null;
  const a = E * W * H, b = (L * 100) / (A * EC), Qu = FS * Qa, S = a / Qu - 0.5 * Math.sqrt(2 * a * b);
  return { A, P, a, b, Qu, S, per10: S > 0 ? 10 / S : 0, per30: S > 0 ? 30 / S : 0, pen10: 10 * S };
}

const f = (v, d = 2) => (isFinite(v) ? v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) : "-");
const DENSITY = 2.4; // ตัน/ลบ.ม. คอนกรีตอัดแรง (ใช้หาน้ำหนักเสา Wp)

// ใบคำนวณ blow count แบบฟอร์ม Excel ของบริษัท (A4 แนวตั้ง 794×1123) หัวกระดาษ/สูตร/ลำดับบรรทัดตามต้นแบบ
// p = {section,L,W,Qa,H}  project = {pj,ow,lo}  pieceLens = ความยาวแต่ละท่อน  code = รหัสงาน (ไม่มีก็ได้)
export function blowSheet(p, secLabel, project, pieceLens, code) {
  const r = blow(p.section, p.L, p.W, p.H, p.Qa), kind = /^[TF]/.test(p.section) ? "T" : "S", size = p.section.slice(1);
  const wp = r ? (r.A * p.L * 100 * DENSITY) / 1e6 : 0;
  const sz = (+size / 100).toFixed(2), len = f(p.L);
  const pile = kind === "T" ? `I &nbsp; ${sz} × ${len} ม.` : `เสาตัน ${sz} × ${sz} × ${len} ม.`;
  const pcs = pieceLens && pieceLens.length > 6 && new Set(pieceLens).size === 1 ? `ไมโครไพล์ ${pieceLens.length} ท่อน ท่อนละ ${f(pieceLens[0])} ม.` : pieceLens && pieceLens.length > 1 ? `${pieceLens.length} ท่อนต่อเชื่อม (${pieceLens.map((v) => f(v)).join(" + ")} ม.)` : "ท่อนเดี่ยว";
  const red = (t) => `<b style="color:#c00000">${t}</b>`;
  const row = (l, s, v, u) => `<div class="r"><span>${l}</span><span>${s || ""}</span><span class="e"></span><span class="v">${v == null ? "" : v}</span><span>${u || ""}</span></div>`;
  const row3 = (l, s, v, u) => `<div class="r"><span>${l}</span><span>${s}</span><span class="e">=</span><span class="v">${v}</span><span>${u}</span></div>`;
  const S = r ? r.S : NaN;
  const css = `<style>
.bs{width:794px;height:1123px;background:#fff;color:#000;box-sizing:border-box;padding:46px 56px;font-family:'Times New Roman',Times,serif;font-size:15px;position:relative}
.bs .r{display:grid;grid-template-columns:276px 152px 22px 90px 1fr;height:26px;align-items:center}
.bs .r>span{white-space:nowrap}
.bs .r>span:nth-child(5){padding-left:8px}
.bs .v{text-align:right}.bs .r3 .v{text-align:right}.bs .e{text-align:center}
.bs .g{height:16px}
.bs .box{border:1.5px solid #13508A;border-radius:8px;padding:10px 16px;margin:12px 0 14px;font-family:'Sarabun','Noto Sans Thai',Tahoma,sans-serif;font-size:14px;line-height:1.55;background:#f5f8fc}
.bs .box .k{color:#13508A;font-weight:700;display:inline-block;width:78px}
</style>`;
  return `${css}<div class="bs">
<div style="display:flex;align-items:center;gap:14px;border-bottom:2px solid #000;padding-bottom:12px"><img src="assets/logo.png" style="width:128px;height:auto" alt=""><div style="font-family:'Sarabun','Noto Sans Thai',Tahoma,sans-serif"><div style="font-size:19px;font-weight:700">บริษัท ร่วมมิตรคอนกรีต (บางเลน) จำกัด</div><div style="font-size:13px;margin-top:4px">299หมู่12 ต.บางภาษี อ.บางเลน จ.นครปฐม 73130</div></div></div>
<div style="text-align:center;font-weight:700;font-size:19px;margin-top:22px">Pile Bearing Capacity Calculation by Gravity drop hammer</div>
<div class="box"><div><span class="k">โครงการ</span>${esc(project.pj || "-")}</div><div><span class="k">เจ้าของ</span>${esc(project.ow || "-")}</div><div><span class="k">สถานที่</span>${esc(project.lo || "-")}</div><div><span class="k">เสาเข็ม</span>${pile} &nbsp; ${esc(pcs)} &nbsp; TIS.396-2549</div></div>
${row("PILE LENGTH :", "L =", f(p.L * 100), "CM.")}
${row("AREA", "A =", r ? f(r.A) : "-", "CM.<sup style='font-size:9px'>2</sup>")}
${row("PERIMETER", "P =", r ? f(r.P) : "-", "CM.")}
${row("WEIGHT OF PILE", "Wp =", r ? f(wp) : "-", "T.")}
${row("MODULUS OF ELASTICITY P.C. PILE", "Ec =", f(EC), "T. / CM.")}
<div class="g"></div>
${row("RIG. NO.", "", "", "")}
${row("WEIGHT OF DROP HAMMER", "W =", red(f(p.W)), "T.")}
${row("EFFICIENCY FACTOR FOR RIG.", "E =", f(E), "")}
${row("HEIGHT OF FALL DROP HAMMER", "H =", red(f(p.H)), "CM.")}
${row("ALLOWABLE BEARING CAPACITY", "Qa =", f(p.Qa), "T.")}
${row("FACTOR OF SAFETY", "F.S. =", f(FS), "")}
${row("ULTIMATE BEARING CAPACITY", "Qu =", r ? f(r.Qu) : "-", "T.")}
<div class="g"></div>
<div style="height:26px;display:flex;align-items:center">FROM DANISH PILE DRIVING FORMULAR</div>
<div style="display:flex;align-items:center;gap:10px;margin:2px 0 2px 70px;height:54px"><span>Qu =</span><span style="display:inline-block;text-align:center"><div style="border-bottom:1.3px solid #000;padding:0 14px 1px;font-style:italic">a</div><div style="padding:1px 10px">S + 1/2 * SQR. 2ab</div></span></div>
<div style="height:26px;display:flex;align-items:center">WHERE ;</div>
${row3("ENERGY FOR DRIVING", "a = EWH", r ? f(r.a) : "-", "T-CM.")}
${row3("ENERGY LOSS", "b = L/Aec", r ? f(r.b, 5) : "-", "CM./T.")}
${row3("EXPECTED PENETRATION", "S = a/Qu - 1/2 SQR.2ab", r ? f(S, 3) : "-", "CM./BLOW")}
<div class="g"></div>
<div style="height:26px;display:flex;align-items:center">THUS ;</div>
${row3("FOR 10 BLOWS REQUIRED PENETRATION", "", r && S > 0 ? f(10 * S) : "-", "CM.")}
${row3("FOR 1 FOOT REQUIRES", "", r && S > 0 ? f(30 / S) : "-", "BLOWS.")}
${r && S <= 0 ? `<p style="color:#c00000;font-weight:700;margin-top:14px">หมายเหตุ: ค่า S ≤ 0 ตุ้ม/ระยะยกเบาเกินไปสำหรับ Qa นี้</p>` : ""}
<div style="position:absolute;right:96px;bottom:60px;width:270px;text-align:center;font-family:'Sarabun','Noto Sans Thai',Tahoma,sans-serif;font-size:14px;line-height:1.6">
<div style="height:46px;border-bottom:1.2px solid #000"></div>
<div style="margin-top:4px;font-size:15px">( ${esc(TITLE_BLOCK.approveByTh)} )</div>
<div>วิศวกร &nbsp; ${esc(TITLE_BLOCK.licence)}</div>
</div>
</div>`;
}

export { autoSplit };

// ชื่อสั้นสำหรับค้นหา/ตั้งชื่อไฟล์: "ชนิดงาน + เจ้าของ" เช่น "บ้านพักอาศัย คุณ สุปราณี จีนประดับ"
export function shortProject(pj) {
  let t = String(pj || "").replace(/\s+/g, " ").trim();
  t = t.replace(/^(งาน)?(ก่อสร้าง|โครงการ|ต่อเติม)\s*/, "");
  t = t.split(/\s+(?=ค\.ส\.ล|คสล|พร้อม|จำนวน|\d)/)[0].replace(/\s*\d.*$/, "").trim();
  return t.length > 36 ? t.slice(0, 36).trim() : t;
}
export const jobLabel = (p) => [shortProject(p && p.pj), p && p.ow].filter(Boolean).join(" ").trim();

// ข้อที่ควรถามกลับฝ่ายที่ขอ: ข้อมูลขาด/ไม่แน่ใจ และ Qa ที่เกินกำลังเสา (calc = ผลคำนวณของเสาแต่ละต้น หรือ null)
export function askList(project, notes, piles, calcOf) {
  const a = [];
  if (!project.pj) a.push("ไม่พบชื่อโครงการ"); if (!project.ow) a.push("ไม่พบชื่อเจ้าของโครงการ"); if (!project.lo) a.push("ไม่พบสถานที่ก่อสร้าง");
  (notes || []).forEach((t) => a.push(t));
  piles.forEach((p, i) => {
    const nm = "เสาต้นที่ " + (i + 1) + " (" + (p.kind === "T" ? "I" : "S") + "-" + p.sizeCm + " ยาว " + p.L + " ม.)";
    (p.errs || []).forEach((e) => a.push(nm + ": " + e)); (p.asks || []).forEach((e) => a.push(nm + ": " + e));
    const c = calcOf && !(p.errs || []).length ? calcOf(p) : null;
    if (c && p.Qa > c.safe) a.push(nm + ": Qa " + p.Qa + " ตัน เกินกำลังเสาที่รับได้ปลอดภัย (" + (Math.floor(c.safe * 10) / 10) + " ตัน) ขอยืนยัน Qa หรือเปลี่ยนขนาดเสา");
    const b = !(p.errs || []).length && blow(p.section, p.L, p.W, p.H, p.Qa);
    if (b && !(b.S > 0)) a.push(nm + ": ตุ้ม " + p.W + " ตัน ยก " + p.H + " ซม. เบาเกินสำหรับ Qa " + p.Qa + " ตัน ขอยืนยันน้ำหนักตุ้ม/ระยะยก");
  });
  return a;
}
