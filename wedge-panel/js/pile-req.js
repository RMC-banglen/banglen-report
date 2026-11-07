// อ่านข้อความคำขอรายการคำนวณเสาเข็ม (จากกลุ่มเทเลแกรม) + ใบคำนวณ blow count (สูตร Danish)
import { autoSplit } from "./pile-calc.js?v=20261107071440";
import { esc } from "./draw2d.js?v=20261107071440";

// พื้นที่หน้าตัด A (ตร.ซม.) และเส้นรอบรูป P (ซม.) ของเสา มอก.
export const AP = { T18: [275, 89], T22: [386, 105], T26: [489, 126], T30: [660, 145], T35: [880, 180], T40: [1240, 197.5],
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

const LOC_KEY = /แขวง|เขต|(^|\s)(ต|อ|จ)\.|ตำบล|อำเภอ|จังหวัด|ถนน|ซอย|หมู่/;
const LABEL = /(หน่วยงาน|ชื่องาน|โครงการ|เจ้าของโครงการ|เจ้าของ|สถานที่ก่อสร้าง|สถานที่)/;
// 1 บรรทัดมีได้หลายป้าย เช่น "หน่วยงาน ... เจ้าของ ..." หน่วยงาน = โครงการ ; บรรทัดไม่มีป้าย = สถานที่
function parseHeadLine(l, p) {
  const parts = l.split(LABEL), clean = (t) => t.replace(/^[\s:]+/, "").replace(/\.{4,}/g, "").trim();
  if (parts.length === 1) { const t = clean(l); if (t) p.lo = (p.lo ? p.lo + " " : "") + t; return; }
  if (clean(parts[0])) p.lo = (p.lo ? p.lo + " " : "") + clean(parts[0]);
  for (let i = 1; i < parts.length; i += 2) {
    const lab = parts[i], t = clean(parts[i + 1] || "");
    if (lab === "โครงการ") p.pj = t ? "โครงการ" + t : "";
    else if (lab === "หน่วยงาน" || lab === "ชื่องาน") p.pj = t;
    else if (/^เจ้าของ/.test(lab)) p.ow = t;
    else p.lo = (p.lo ? p.lo + " " : "") + t;
  }
}

// → { project:{pj,ow,lo}, piles:[{section,sizeCm,L,pieces,split,W,Qa,H,text,errs[]}] }
export function parseRequest(text, secs) {
  const blocks = String(text || "").split(/\n\s*[_\-=]{3,}\s*(?:\n|$)/).map((b) => b.split("\n").map((l) => l.trim()).filter(Boolean)).filter((b) => b.length);
  const project = { pj: "", ow: "", lo: "" }, piles = [];
  const pileRe = /(^|\s)([IiSsไอเอส])\s*[-.]?\s*(\d*\.?\d+)\s*[x×*X]\s*(\d+(?:\.\d+)?)/;
  blocks.forEach((lines) => {
    const idx = lines.findIndex((l) => pileRe.test(l));
    const head = idx < 0 ? lines : lines.slice(0, idx);
    head.reduce((a, l) => { if (a.length && /(คุณ|นาย|นาง|นางสาว|น\.ส\.)$/.test(a[a.length - 1])) a[a.length - 1] += l; else a.push(l); return a; }, []) // ชื่อที่ขึ้นบรรทัดใหม่หลังคำนำหน้า ต่อกลับเป็นบรรทัดเดียว
      .forEach((l) => parseHeadLine(l, project));
    if (project.ow) { // ชื่อเจ้าของตัดเฉพาะชื่อ ส่วนที่ต่อจากนั้น (แขวง/เขต/ต./อ./จ. ...) เป็นสถานที่
      const k = project.ow.search(LOC_KEY);
      if (k > 0) { project.lo = (project.ow.slice(k) + (project.lo ? " " + project.lo : "")).trim(); project.ow = project.ow.slice(0, k).trim(); }
    }
    project.lo = project.lo.replace(/(แขวง|เขต)\.\s*/g, "$1").replace(/\s+/g, " ").trim();
    if (/^(คุณ|นาย|นาง|นางสาว)?$/.test(project.ow)) project.ow = "";
    if (/^[ต./อจ\s]*$/.test(project.lo)) project.lo = ""; // เหลือแต่ "ต./อ./จ." จากฟอร์มเปล่า
    if (idx < 0) return;
    const body = lines.slice(idx).join("\n"), m = lines[idx].match(pileRe);
    const kind = /^[Ii]|ไอ/.test(m[2]) ? "T" : "S", sizeCm = Math.round(n(m[3]) < 1 ? n(m[3]) * 100 : n(m[3])), L = n(m[4]);
    const key = kind + sizeCm, errs = [];
    if (!secs[key]) errs.push(`ไม่มีหน้าตัด ${kind === "T" ? "I" : "S"}-${sizeCm} ในระบบ`);
    const ex = body.match(/(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)(?:\s*\+\s*(\d+(?:\.\d+)?))?/);
    let pieces = 1, split = null;
    if (ex) { split = ex.slice(1).filter(Boolean).map(n); pieces = split.length; if (Math.abs(split.reduce((a, b) => a + b, 0) - L) > 0.01) errs.push("ความยาวแต่ละท่อนรวมไม่เท่าความยาวเสา"); }
    else if (/ต\s*[\/.]?\s*[ชซ]|ต่อ/.test(body)) pieces = 2;
    const get = (re) => { const x = body.match(re); return x ? n(x[1]) : 0; };
    const W = get(/ตุ้ม\s*[:.]?\s*(\d+(?:\.\d+)?)/), Qa = get(/Qa\s*[.:=]?\s*(\d+(?:\.\d+)?)/i), H = get(/ยก\s*[:.]?\s*(\d+(?:\.\d+)?)/);
    if (!W) errs.push("ไม่พบน้ำหนักตุ้ม"); if (!Qa) errs.push("ไม่พบ Qa"); if (!H) errs.push("ไม่พบระยะยก");
    piles.push({ section: key, sizeCm, kind, L, pieces, split, W, Qa, H, errs });
  });
  return { project, piles };
}

// ผลคำนวณ Danish: S (ซม./ครั้ง), จำนวนครั้ง/10 ซม. และ/30 ซม.
export function blow(sectionKey, L, W, H, Qa) {
  const [A, P] = AP[sectionKey] || [0, 0]; if (!A || !(W > 0) || !(H > 0) || !(Qa > 0)) return null;
  const a = E * W * H, b = (L * 100) / (A * EC), Qu = FS * Qa, S = a / Qu - 0.5 * Math.sqrt(2 * a * b);
  return { A, P, a, b, Qu, S, per10: S > 0 ? 10 / S : 0, per30: S > 0 ? 30 / S : 0, pen10: 10 * S };
}

const f = (v, d = 2) => (isFinite(v) ? v.toFixed(d) : "-");
// หน้าใบ blow count (ขนาดเดียวกับแผ่นแบบ 1188×840)
export function blowSheet(p, secLabel, project, pieceLens) {
  const r = blow(p.section, p.L, p.W, p.H, p.Qa);
  const rows = Array.from({ length: 14 }, (_, i) => `<tr><td>${i + 1}</td><td></td><td></td><td></td><td></td></tr>`).join("");
  const res = r ? (r.S > 0 ? "" : `<p style="color:#c00;font-weight:700">ค่า S ≤ 0 : ตุ้ม/ระยะยกเบาเกินไปสำหรับ Qa นี้</p>`) : `<p style="color:#c00">ข้อมูลไม่ครบ</p>`;
  const pcs = pieceLens && pieceLens.length > 1 ? `ต่อเชื่อม ${pieceLens.length} ท่อน (${pieceLens.map((v) => f(v)).join(" + ")} ม.)` : "ท่อนเดี่ยว";
  return `<div style="width:1188px;height:840px;background:#fff;color:#000;font-family:Sarabun,Tahoma,sans-serif;font-size:17px;padding:30px 44px;box-sizing:border-box;border:2px solid #000">
<div style="display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:8px"><b style="font-size:26px">ใบคำนวณ Blow Count (สูตร Danish)</b><span>เสาเข็ม ${esc(secLabel)} ยาว ${f(p.L)} ม. ${esc(pcs)}</span></div>
<div style="margin:8px 0 12px;line-height:1.5">โครงการ: ${esc(project.pj)} &nbsp; เจ้าของ: ${esc(project.ow)} &nbsp; สถานที่: ${esc(project.lo)}</div>
<div style="display:flex;gap:32px">
<table style="border-collapse:collapse;width:520px"><tbody>
${[["น้ำหนักตุ้ม W", f(p.W), "ตัน"], ["ระยะยกตุ้ม H", f(p.H, 0), "ซม."], ["แรงที่ยอมให้ Qa", f(p.Qa), "ตัน"], ["ตัวคูณปลอดภัย F.S.", f(FS, 1), ""], ["กำลังประลัย Qu = F.S.×Qa", r ? f(r.Qu) : "-", "ตัน"],
["พื้นที่หน้าตัด A", r ? f(r.A, 0) : "-", "ซม.²"], ["ความยาวเสา L", f(p.L * 100, 0), "ซม."], ["ประสิทธิภาพตุ้ม E", f(E), ""], ["Ec", f(EC, 0), "ตัน/ซม.²"],
["a = E·W·H", r ? f(r.a) : "-", "ตัน·ซม."], ["b = L/(A·Ec)", r ? f(r.b, 5) : "-", "ซม./ตัน"]].map((x) => `<tr><td style="border:1px solid #000;padding:3px 8px">${x[0]}</td><td style="border:1px solid #000;padding:3px 8px;text-align:right;width:90px">${x[1]}</td><td style="border:1px solid #000;padding:3px 8px;width:70px">${x[2]}</td></tr>`).join("")}
</tbody></table>
<div style="flex:1"><div style="border:2px solid #000;padding:12px 16px;line-height:1.7"><b>S = a/Qu − ½√(2ab)</b><br>ระยะจมต่อครั้ง S = <b>${r ? f(r.S, 3) : "-"}</b> ซม./ครั้ง<br>10 ครั้งสุดท้ายจมไม่เกิน <b>${r ? f(r.pen10, 1) : "-"}</b> ซม.<br>ประมาณ <b>${r ? f(r.per10, 1) : "-"}</b> ครั้ง / 10 ซม. &nbsp; = <b>${r ? f(r.per30, 1) : "-"}</b> ครั้ง / 30 ซม. (ฟุต)</div>${res}
<div style="margin-top:10px;font-size:15px;color:#333">หมายเหตุ: ค่าที่ได้เป็นเกณฑ์ตอกเสาเข็มตามสูตร Danish ใช้ควบคุมหน้างาน ไม่แทนรายการคำนวณของวิศวกร</div></div></div>
<table style="border-collapse:collapse;width:100%;margin-top:14px;font-size:15px"><thead><tr>${["ครั้งที่/ช่วงตอก", "ระดับ/ความลึก (ม.)", "จำนวนครั้ง/10 ซม.", "จำนวนครั้ง/30 ซม.", "หมายเหตุ"].map((h) => `<th style="border:1px solid #000;padding:2px 6px">${h}</th>`).join("")}</tr></thead><tbody>${rows.replace(/<td>/g, '<td style="border:1px solid #000;height:15px">')}</tbody></table>
</div>`;
}

export { autoSplit };
