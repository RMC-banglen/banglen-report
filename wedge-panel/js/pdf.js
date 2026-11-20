// © 2569 นุกูล ยอดเทียน — สร้างเพื่อบริษัท ร่วมมิตรคอนกรีต(บางเลน) จำกัด สงวนลิขสิทธิ์ ใช้ภายในบริษัทเท่านั้น ห้ามคัดลอกหรือเผยแพร่โดยไม่ได้รับอนุญาต
// ส่งออก PDF / ใบสรุป HTML — สร้างในเครื่องผู้ใช้ตอนกดดาวน์โหลด ไม่เก็บไฟล์ลง Storage
// โครงตามต้นแบบ: หน้า 1 สรุปโครงการ • 1 หน้าต่อ c/c (3D + รูปขยายรอยต่อ) • 1 หน้าต่อรหัส (รูปตัด 2 + รูปด้าน 2)
// ชิ้นเนื้อหาที่ยาวเกินหน้าจะถูกย่อให้พอดี ไม่ตัดกลางชิ้น
import { fmt, f2, f3, stackCountTxt } from "./calc.js?v=20261120090658";
import { panelSheet, jointSvg, remark3d, shoulderRemark, esc } from "./draw2d.js?v=20261120090658";

export const PRINT = {"--bg":"#FFFFFF","--surface":"#FFFFFF","--surface-2":"#F5F6F4","--ink":"#1D2725","--muted":"#5B6964","--faint":"#8A9691","--line":"#CDD3CF","--accent":"#0F6E56","--accent-soft":"#E1F2EB","--rebar":"#C2522B","--rebar-2":"#B07316","--pipe":"#1E5FA0","--warn":"#9A5B05","--warn-soft":"#FBF0DC","--danger":"#A32D2D","--danger-soft":"#FBE8E8","--concrete":"rgba(93,202,165,.20)"};
export const unvar = (s) => s.replace(/var\((--[a-z0-9-]+)\)/g, (m, k) => PRINT[k] || "#1D2725");
const safeName = (s, fb) => (s || fb).replace(/[\\/:*?"<>|]/g, "").slice(0, 40);

// ดาวน์โหลดตรงด้วย Blob + <a download>
export function download(filename, blob) {
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const stackTxt = (st) => st.stk.map((h) => (h / 1000).toFixed(2)).join(" + ");

// หน้าปก: โลโก้ ชื่อโครงการ ลูกค้า/ผู้ขาย วันที่ เสาเข็ม และรายการแผ่นทุกแบบ (ไม่มีน้ำหนัก/วัสดุ/การผลิต ใช้ได้ทั้งฉบับภายในและฉบับลูกค้า)
function pdfCover(st, d) {
  const row = (k, v) => (v ? `<tr><th style="width:130px;text-align:left;color:#5B6964;font-weight:500;padding:6px 0">${k}</th><td style="padding:6px 0;font-size:15px">${esc(v)}</td></tr>` : "");
  // ตามความสูงกำแพงที่ลูกค้าต้องการ: สูงรวมเท่าไร กว้างเท่าไร แบ่งเป็นแผ่นสูงอะไรกี่แผ่น รวมกี่แผ่น
  const wl = st.groups.map((gr) => { const stk = gr.stk || st.stk || [], k = stk.length || 1, spans = gr.stk ? gr.n / k : gr.n, m = new Map(); stk.forEach((h) => m.set(h, (m.get(h) || 0) + spans)); return { tot: stk.reduce((a, b) => a + b, 0), WT: gr.F.WT, k, spans, m }; });
  const walls = wl.map((w) => `<tr><td><b>${f2(w.WT)}</b></td><td>${f2(w.tot)}</td><td style="text-align:left">${[...w.m.entries()].map(([h, q]) => `แผ่นสูง ${f2(h)} ม. × ${fmt(q)} แผ่น`).join("<br>")}</td><td>${fmt(w.spans)}</td><td>${fmt(w.spans * w.k)}</td></tr>`).join("");
  const wallTbl = `<p style="font-weight:700;margin:0 0 6px">ความสูงกำแพงที่ต้องการ และการแบ่งแผ่น</p><table class="tbl" style="width:100%"><tr><th>กว้างแผ่น (ม.)</th><th>สูงรวม (ม.)</th><th style="text-align:left">แบ่งเป็นแผ่นสูง × จำนวน</th><th>จำนวนช่วง</th><th>รวม (แผ่น)</th></tr>${walls}</table>`;
  const byH = new Map(); st.list.forEach((i) => byH.set(i.H, (byH.get(i.H) || 0) + i.qty));
  const hs = `<p style="font-weight:700;margin:22px 0 6px">สรุปจำนวนแผ่นตามความสูงแผ่น</p><table class="tbl" style="width:60%"><tr><th style="text-align:left">ความสูงแผ่น (ม.)</th><th>จำนวน (แผ่น)</th></tr>${[...byH.entries()].sort((x, y) => x[0] - y[0]).map(([h, q]) => `<tr><td style="text-align:left">${f2(h)}</td><td>${fmt(q)}</td></tr>`).join("")}<tr><td style="text-align:left"><b>รวม</b></td><td><b>${fmt(st.totQ)}</b></td></tr></table>`;
  const items = [...st.list].sort((x, y) => x.H - y.H || x.WT - y.WT).map((i) => `<tr><td class="code">${i.code}</td><td style="text-align:left">${i.name.replace(/\d+-(?:RB|DB)\d+/g, (m) => `<span style="white-space:nowrap">${m}</span>`)}</td><td>${f2(i.WT)}</td><td>${f2(i.H)}</td><td>${f2(st.G.T)}</td><td>${fmt(i.qty)}</td></tr>`).join("");
  return `<div style="min-height:960px;position:relative;font-family:inherit">
<div style="display:flex;align-items:center;gap:16px;border-bottom:2px solid #1D2725;padding-bottom:14px"><img src="assets/logo.png" style="width:120px;height:auto" alt=""><div><div style="font-size:20px;font-weight:700">บริษัท ร่วมมิตรคอนกรีต (บางเลน) จำกัด</div><div style="font-size:13px;color:#5B6964;margin-top:4px">299 หมู่ 12 ต.บางภาษี อ.บางเลน จ.นครปฐม 73130</div></div></div>
<div style="text-align:center;margin:90px 0 56px"><div style="font-size:30px;font-weight:700;line-height:1.5">แบบแผ่นกันดินหัวลิ่ม</div><div style="font-size:17px;color:#5B6964;margin-top:6px">${st.p.n} • หัวลิ่มแบบ ${st.p.ty} • ${st.S.sp ? "สั่งพิเศษ" : "มาตรฐานบริษัท"}</div></div>
<table style="width:100%;border-collapse:collapse;border-top:1px solid #CDD3CF;border-bottom:1px solid #CDD3CF;margin-bottom:34px">${row("โครงการ", d.pj)}${row("ลูกค้า", d.cu)}${row("ผู้ขาย", d.sa)}${row("อ้างอิง", st.direct ? d.rf : "")}${row("วันที่", new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }))}</table>
${wallTbl}
${hs}
<p style="font-weight:700;margin:22px 0 6px">รายการรหัสแผ่น (${st.list.length} แบบ)</p>
<table class="tbl" style="width:100%"><tr><th>รหัส</th><th style="text-align:left">รายการ</th><th>กว้างรวม (ม.)</th><th>สูง (ม.)</th><th>หนา (ม.)</th><th>จำนวน (แผ่น)</th></tr>${items}</table>
</div>`;
}

// ตารางรายการแผ่นในใบสรุปภายใน: ตัดคอลัมน์ช่วงกลาง/กลางเสาออก และเรียก "กว้างรวม" เป็น "กว้าง" เฉยๆ
function schedForPdf($) {
  const t = $("sched").cloneNode(true), ths = [...t.querySelectorAll("thead th")], ci = ths.findIndex((h) => h.textContent.includes("กลาง/กลางเสา")), wi = ths.findIndex((h) => h.textContent.includes("กว้างรวม"));
  if (wi >= 0) ths[wi].textContent = "กว้าง (ม.)";
  if (ci >= 0) t.querySelectorAll("tr").forEach((r) => { const c = r.children[ci]; if (c && r.children.length > 1) c.remove(); });
  return t.outerHTML;
}
function pdfSummary(st, d, $) {
  return `<h2 style="font-size:20px;margin:0 0 2px">ใบสรุปแผ่นกันดินหัวลิ่ม</h2><p style="margin:0 0 12px;color:#5B6964">บริษัท ร่วมมิตรคอนกรีต(บางเลน) จำกัด • ${new Date().toLocaleDateString("th-TH")}</p>
<table class="tbl" style="margin-bottom:12px"><tr><th>โครงการ</th><td>${esc(d.pj || "-")}</td><th>ลูกค้า</th><td>${esc(d.cu || "-")}</td></tr><tr><th>ผู้ขาย</th><td>${esc(d.sa || "-")}</td><th>รูปแบบงาน</th><td>${st.S.sp ? "สั่งพิเศษ" : "มาตรฐานบริษัท"}</td></tr><tr><th>เสาเข็ม</th><td>${st.p.n}</td><th>หัวลิ่ม</th><td>แบบ ${st.p.ty} • ${st.G.d}</td></tr>${st.direct ? `<tr><th>วิธีสั่ง</th><td>สั่งตามจำนวนแผ่น</td><th>หมายเหตุ</th><td>ระยะกลาง/กลางเสาในตารางเผื่อค่าการทำงานแล้วข้างละ ${f3(st.g)} ม.</td></tr><tr><th>อ้างอิง</th><td colspan="3">${esc(d.rf || "-")}</td></tr>` : `<tr><th>ความสูงกำแพง</th><td>${(+d.wh).toFixed(2)} ม. (${stackTxt(st)} ม.)</td><th>ค่าเผื่อ</th><td>ข้างละ ${f3(st.g)} ม.</td></tr>`}</table>
${st.direct ? "" : document.querySelector(".hstd").outerHTML}${$("cards").outerHTML}${st.al.length ? `<div class="alerts">${$("alerts").innerHTML}</div>` : ""}<p class="cap">รายการแผ่น</p>${schedForPdf($)}<p class="cap">การผลิตและขนส่ง</p>${$("prod").outerHTML}${$("prodWarn").innerHTML}<p class="cap">วัสดุต่อแผ่น</p>${$("mat").outerHTML}${st.S.sp && st.S.note ? `<p>รายละเอียดพิเศษ: ${esc(st.S.note)}</p>` : ""}`;
}

// views.snapshot(i) = ภาพ 3 มิติช่วงที่ i เป็น JPEG data URL, onStatus(text) = แจ้งความคืบหน้า
// customer = true: ไม่มีหน้าสรุปภายใน (เฉพาะภาพ 3 มิติ + แบบแผ่น) สำหรับส่งลูกค้า
export async function makePdf({ st, d, $, views, onStatus, customer = false }) {
  if (!window.html2canvas || !window.jspdf) throw new Error("โหลดตัวสร้าง PDF ไม่สำเร็จ ลองรีเฟรชหน้า");
  const box = document.createElement("div");
  box.id = "pdfbox";
  box.innerHTML = "<style>#pdfbox .tbl{font-size:11.5px}#pdfbox .tbl th,#pdfbox .tbl td{white-space:normal;padding:5px 6px}#pdfbox .card .v{font-size:17px}</style>";
  box.style.cssText = "position:absolute;left:-12000px;top:0;width:794px;background:#fff;color:#1D2725;font-family:'IBM Plex Sans Thai',Tahoma,sans-serif;font-size:13px";
  Object.entries(PRINT).forEach(([k, v]) => box.style.setProperty(k, v));
  document.body.appendChild(box);
  try {
    await document.fonts.ready;
    const spec = customer ? [{ h: pdfCover(st, d) }] : [{ h: pdfSummary(st, d, $) }]; // หน้าปก = เฉพาะฉบับลูกค้า (ฉบับภายในใช้ใบสรุปเป็นหน้าแรก)
    st.groups.forEach((gr, i) => {
      const img = views.snapshot(i), j = jointSvg(st, gr);
      spec.push({ h: `<h2 style="font-size:18px;margin:0 0 2px">ภาพ 3 มิติ • ช่วงเสา กลาง/กลางเสา ${f2(gr.cc)} ม.</h2><p style="margin:0 0 6px;color:#5B6964">${st.p.n} • กว้างแผ่น ${f2(gr.F.WT)} ม. • หนา ${f2(st.G.T)} ม. • ${gr.stk ? `${gr.stk.length > 1 ? `ซ้อน ${gr.stk.length} แผ่น (${gr.stk.map((h) => (h / 1000).toFixed(2)).join(" + ")}) สูงรวม ${(gr.stk.reduce((a, b) => a + b, 0) / 1000).toFixed(2)} ม.` : `สูง ${(gr.stk[0] / 1000).toFixed(2)} ม.`} • ${stackCountTxt(gr)}` : `ซ้อน ${stackTxt(st)} ม. • ${fmt(gr.n)} ช่วง`}</p><img src="${img}" alt="ภาพ 3 มิติเสาเข็มกับแผ่นกันดิน" style="width:100%;display:block;border:1px solid #CDD3CF;border-radius:6px"><p class="cap">รูปขยายรอยต่อด้านขวา</p>${j.svg}${remark3d(st, gr)}${shoulderRemark(st, gr, d)}` });
    });
    st.list.forEach((it) => {
      spec.push({ h: `<h2 style="font-size:18px;margin:0 0 2px">แบบแผ่น ${it.code}</h2><p style="margin:0;color:#5B6964">${it.name} • จำนวน ${fmt(it.qty)} แผ่น • ${st.p.n} • หัวลิ่มแบบ ${st.p.ty} • ${st.S.sp ? "สั่งพิเศษ" : "มาตรฐานบริษัท"}</p>${panelSheet(it, st, d.cu || "")}` });
    });
    const pdf = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
    const pw = 595.28, ph = 841.89, M = 28, avail = ph - 2 * M;
    for (let i = 0; i < spec.length; i++) {
      onStatus && onStatus(`กำลังสร้าง PDF… ${Math.round(((i + 1) / spec.length) * 100)}%`);
      const pg = document.createElement("div");
      pg.style.cssText = "padding:4px 36px 8px;background:#fff";
      pg.innerHTML = unvar(spec[i].h);
      pg.querySelectorAll("svg").forEach((s) => { s.style.minWidth = "0"; s.style.width = "100%"; s.style.height = "auto"; s.style.display = "block"; });
      box.appendChild(pg);
      const cv = await window.html2canvas(pg, { scale: 3, backgroundColor: "#ffffff", useCORS: true });
      let w = pw, h = (cv.height * pw) / cv.width;
      if (h > avail) { w = (w * avail) / h; h = avail; } // ย่อให้พอดีหน้า ไม่ตัดกลาง
      if (i > 0) pdf.addPage();
      pdf.addImage(cv.toDataURL("image/jpeg", 0.95), "JPEG", (pw - w) / 2, M, w, h);
      pg.remove();
    }
    download(`แผ่นกันดิน-${safeName(d.pj, "โครงการ")}${customer ? "-ส่งลูกค้า" : ""}.pdf`, pdf.output("blob"));
  } finally {
    box.remove();
  }
}
