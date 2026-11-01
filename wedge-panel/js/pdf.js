// ส่งออก PDF / ใบสรุป HTML — สร้างในเครื่องผู้ใช้ตอนกดดาวน์โหลด ไม่เก็บไฟล์ลง Storage
// โครงตามต้นแบบ: หน้า 1 สรุปโครงการ • 1 หน้าต่อ c/c (3D + รูปขยายรอยต่อ) • 1 หน้าต่อรหัส (รูปตัด 2 + รูปด้าน 2)
// ชิ้นเนื้อหาที่ยาวเกินหน้าจะถูกย่อให้พอดี ไม่ตัดกลางชิ้น
import { fmt, f2, f3 } from "./calc.js?v=202611010332";
import { panelSheet, jointSvg, esc } from "./draw2d.js?v=202611010332";

const PRINT = {"--bg":"#FFFFFF","--surface":"#FFFFFF","--surface-2":"#F5F6F4","--ink":"#1D2725","--muted":"#5B6964","--faint":"#8A9691","--line":"#CDD3CF","--accent":"#0F6E56","--accent-soft":"#E1F2EB","--rebar":"#C2522B","--rebar-2":"#B07316","--pipe":"#1E5FA0","--warn":"#9A5B05","--warn-soft":"#FBF0DC","--danger":"#A32D2D","--danger-soft":"#FBE8E8","--concrete":"rgba(93,202,165,.20)"};
const unvar = (s) => s.replace(/var\((--[a-z0-9-]+)\)/g, (m, k) => PRINT[k] || "#1D2725");
const safeName = (s, fb) => (s || fb).replace(/[\\/:*?"<>|]/g, "").slice(0, 40);

// ดาวน์โหลดตรงด้วย Blob + <a download>
export function download(filename, blob) {
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const stackTxt = (st) => st.stk.map((h) => (h / 1000).toFixed(2)).join(" + ");

// ช่องลูกค้าเซ็นยืนยันการผลิต (หน้าสรุป)
const sigBlock = (d) => `<div style="margin-top:16px;border:1px solid #CDD3CF;border-radius:6px;padding:10px 14px;page-break-inside:avoid"><b>การยืนยันการผลิต</b><p style="margin:4px 0 12px;font-size:12px;color:#5B6964">ข้าพเจ้าได้ตรวจสอบรายการสินค้า ขนาด จำนวน และแบบแผ่นกันดินตามเอกสารฉบับนี้แล้ว ยืนยันให้ผลิตตามรายการนี้</p>
<table style="width:100%;border-collapse:collapse;margin:0"><tr>
<td style="width:50%;border:0;padding:0 14px;text-align:center;vertical-align:top"><div style="border-bottom:1px solid #1D2725;height:38px"></div><div style="margin-top:4px">( ${esc(d.cu || "................................")} )</div><div style="font-size:12px;color:#5B6964">ลูกค้า / ผู้สั่งซื้อ</div><div style="font-size:12px;margin-top:8px">วันที่ ............../............../..............</div></td>
<td style="width:50%;border:0;padding:0 14px;text-align:center;vertical-align:top"><div style="border-bottom:1px solid #1D2725;height:38px"></div><div style="margin-top:4px">( ${esc(d.sa || "................................")} )</div><div style="font-size:12px;color:#5B6964">ผู้ขาย</div><div style="font-size:12px;margin-top:8px">วันที่ ............../............../..............</div></td>
</tr></table></div>`;

export function summaryHtml(st, d, truckKg) {
  const css = `body{font-family:"IBM Plex Sans Thai",Tahoma,sans-serif;color:#1D2725;margin:24px;font-size:13px}h1{font-size:20px;margin:0 0 4px}table{border-collapse:collapse;width:100%;margin:10px 0}th,td{border:1px solid #CDD3CF;padding:5px 8px;text-align:right}th:first-child,td:first-child{text-align:left}th{background:#F1F3F1}.cap{color:#5B6964;margin:12px 0 2px}.pg{page-break-before:always}svg{width:100%;height:auto}.stamp{border:1px solid;padding:1px 6px;border-radius:4px;font-weight:600}
:root{--ink:#1D2725;--muted:#5B6964;--faint:#8A9691;--surface-2:#F5F6F4;--accent:#0F6E56;--rebar:#C2522B;--rebar-2:#B07316;--pipe:#1E5FA0;--concrete:rgba(93,202,165,.2)}.tb{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;border-top:1px solid #CDD3CF;padding-top:6px}.hint{color:#5B6964}`;
  const rows = st.list.map((i) => `<tr><td>${i.code}</td><td>${f2(i.H)}</td><td>${f2(i.WT)}</td><td>${[...i.cc].map(f2).join(", ") || "-"}</td><td>${fmt(i.qty)}</td><td>${fmt(i.P.wt)}</td><td>${i.P.vol.toFixed(3)}</td><td>${i.P.kg.toFixed(1)}</td></tr>`).join("");
  const sheets = st.list.map((i) => `<div class="pg"><h1>แบบแผ่น ${i.code}</h1>${panelSheet(i, st)}</div>`).join("");
  return `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>ใบสรุป ${esc(d.pj || "แผ่นกันดิน")}</title><style>${css}</style></head><body>
<h1>ใบสรุปแผ่นกันดินหัวลิ่ม</h1><p>บริษัท ร่วมมิตรคอนกรีต(บางเลน) จำกัด • ${new Date().toLocaleDateString("th-TH")}</p>
<table><tr><th>โครงการ</th><td>${esc(d.pj || "-")}</td><th>ลูกค้า</th><td>${esc(d.cu || "-")}</td><th>ผู้ขาย</th><td>${esc(d.sa || "-")}</td></tr>
<tr><th>เสาเข็ม</th><td>${st.p.n}</td><th>หัวลิ่ม</th><td>แบบ ${st.p.ty} (${st.G.d})</td><th>รูปแบบงาน</th><td><span class="stamp">${st.S.sp ? "สั่งพิเศษ" : "มาตรฐานบริษัท"}</span></td></tr>
${st.direct ? `<tr><th>วิธีสั่ง</th><td>สั่งตามจำนวนแผ่น</td><th>ค่าเผื่อทำงาน</th><td colspan="3">ข้างละ ${f3(st.g)} ม.</td></tr><tr><th>อ้างอิง</th><td colspan="5">${esc(d.rf || "-")}</td></tr>` : `<tr><th>ความสูงกำแพง</th><td>${(+d.wh).toFixed(2)} ม.</td><th>การซ้อน</th><td>${stackTxt(st)} ม.</td><th>ค่าเผื่อ</th><td>ข้างละ ${f3(st.g)} ม.</td></tr>`}</table>
<table><tr><th>รหัสสินค้า</th><th>สูง (ม.)</th><th>กว้างรวม (ม.)</th><th>ช่วง กลาง/กลางเสา (ม.)</th><th>จำนวน (แผ่น)</th><th>นน./แผ่น (กก.)</th><th>คอนกรีต (ลบ.ม.)</th><th>เหล็ก (กก.)</th></tr>${rows}</table>
<p>รวม ${fmt(st.totQ)} แผ่น • คอนกรีต ${st.totV.toFixed(2)} ลบ.ม. • เหล็กเสริม ${fmt(st.totS)} กก. • น้ำหนัก ${(st.totW / 1000).toFixed(1)} ตัน • รถ ${fmt(truckKg)} กก. ≈ ${st.trips} เที่ยว</p>
${st.al.length ? `<p><b>หมายเหตุ</b><br>${st.al.map((a) => esc(a[1])).join("<br>")}</p>` : ""}${st.S.sp && st.S.note ? `<p>รายละเอียดพิเศษ: ${esc(st.S.note)}</p>` : ""}${sigBlock(d)}${sheets}</body></html>`;
}

export function downloadSummary(st, d, truckKg) {
  download(`ใบสรุป-${safeName(d.pj, "แผ่นกันดิน")}.html`, new Blob([summaryHtml(st, d, truckKg)], { type: "text/html;charset=utf-8" }));
}

function pdfSummary(st, d, $) {
  return `<h2 style="font-size:20px;margin:0 0 2px">ใบสรุปแผ่นกันดินหัวลิ่ม</h2><p style="margin:0 0 12px;color:#5B6964">บริษัท ร่วมมิตรคอนกรีต(บางเลน) จำกัด • ${new Date().toLocaleDateString("th-TH")}</p>
<table class="tbl" style="margin-bottom:12px"><tr><th>โครงการ</th><td>${esc(d.pj || "-")}</td><th>ลูกค้า</th><td>${esc(d.cu || "-")}</td></tr><tr><th>ผู้ขาย</th><td>${esc(d.sa || "-")}</td><th>รูปแบบงาน</th><td>${st.S.sp ? "สั่งพิเศษ" : "มาตรฐานบริษัท"}</td></tr><tr><th>เสาเข็ม</th><td>${st.p.n}</td><th>หัวลิ่ม</th><td>แบบ ${st.p.ty} • ${st.G.d}</td></tr>${st.direct ? `<tr><th>วิธีสั่ง</th><td>สั่งตามจำนวนแผ่น</td><th>ค่าเผื่อทำงาน</th><td>ข้างละ ${f3(st.g)} ม.</td></tr><tr><th>อ้างอิง</th><td colspan="3">${esc(d.rf || "-")}</td></tr>` : `<tr><th>ความสูงกำแพง</th><td>${(+d.wh).toFixed(2)} ม. (${stackTxt(st)} ม.)</td><th>ค่าเผื่อ</th><td>ข้างละ ${f3(st.g)} ม.</td></tr>`}</table>
${st.direct ? "" : document.querySelector(".hstd").outerHTML}${$("cards").outerHTML}${st.al.length ? `<div class="alerts">${$("alerts").innerHTML}</div>` : ""}<p class="cap">รายการแผ่น</p>${$("sched").outerHTML}<p class="cap">การผลิตและขนส่ง</p>${$("prod").outerHTML}<p class="cap">วัสดุต่อแผ่น</p>${$("mat").outerHTML}${st.S.sp && st.S.note ? `<p>รายละเอียดพิเศษ: ${esc(st.S.note)}</p>` : ""}${sigBlock(d)}`;
}

// views.snapshot(i) = ภาพ 3 มิติช่วงที่ i เป็น JPEG data URL, onStatus(text) = แจ้งความคืบหน้า
export async function makePdf({ st, d, $, views, onStatus }) {
  if (!window.html2canvas || !window.jspdf) throw new Error("โหลดตัวสร้าง PDF ไม่สำเร็จ ลองรีเฟรชหน้า");
  const box = document.createElement("div");
  box.id = "pdfbox";
  box.innerHTML = "<style>#pdfbox .tbl{font-size:11.5px}#pdfbox .tbl th,#pdfbox .tbl td{white-space:normal;padding:5px 6px}#pdfbox .card .v{font-size:17px}</style>";
  box.style.cssText = "position:absolute;left:-12000px;top:0;width:794px;background:#fff;color:#1D2725;font-family:'IBM Plex Sans Thai',Tahoma,sans-serif;font-size:13px";
  Object.entries(PRINT).forEach(([k, v]) => box.style.setProperty(k, v));
  document.body.appendChild(box);
  try {
    await document.fonts.ready;
    const spec = [{ h: pdfSummary(st, d, $) }];
    st.groups.forEach((gr, i) => {
      const img = views.snapshot(i), j = jointSvg(st, gr);
      spec.push({ h: `<h2 style="font-size:18px;margin:0 0 2px">ภาพ 3 มิติ • ช่วงเสา กลาง/กลางเสา ${f2(gr.cc)} ม.</h2><p style="margin:0 0 6px;color:#5B6964">${st.p.n} • กว้างแผ่น ${f2(gr.F.WT)} ม. • ${gr.stk ? `สูง ${(gr.stk[0] / 1000).toFixed(2)} ม. • ${fmt(gr.n)} แผ่น` : `ซ้อน ${stackTxt(st)} ม. • ${fmt(gr.n)} ช่วง`}</p><img src="${img}" alt="ภาพ 3 มิติเสาเข็มกับแผ่นกันดิน" style="width:100%;display:block;border:1px solid #CDD3CF;border-radius:6px"><p class="cap">รูปขยายรอยต่อด้านขวา</p>${j.svg}<p class="hint">${esc(j.note)}</p>` });
    });
    st.list.forEach((it) => {
      spec.push({ h: `<h2 style="font-size:18px;margin:0 0 2px">แบบแผ่น ${it.code}</h2><p style="margin:0;color:#5B6964">${it.name} • จำนวน ${fmt(it.qty)} แผ่น • ${st.p.n} • หัวลิ่มแบบ ${st.p.ty} • ${st.S.sp ? "สั่งพิเศษ" : "มาตรฐานบริษัท"}</p>${panelSheet(it, st)}` });
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
      const cv = await window.html2canvas(pg, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      let w = pw, h = (cv.height * pw) / cv.width;
      if (h > avail) { w = (w * avail) / h; h = avail; } // ย่อให้พอดีหน้า ไม่ตัดกลาง
      if (i > 0) pdf.addPage();
      pdf.addImage(cv.toDataURL("image/jpeg", 0.92), "JPEG", (pw - w) / 2, M, w, h);
      pg.remove();
    }
    download(`แผ่นกันดิน-${safeName(d.pj, "โครงการ")}.pdf`, pdf.output("blob"));
  } finally {
    box.remove();
  }
}
