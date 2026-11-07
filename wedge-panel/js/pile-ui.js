// หน้าจอแท็บ "แบบเสาเข็ม": ฟอร์ม → พรีวิวแบบ → ส่งออก PDF A4 (ไม่เก็บลงฐานข้อมูล จำร่างในเครื่อง)
import { planPile, autoSplit, m2 } from "./pile-calc.js?v=20261107012315";
import { pileSheet } from "./pile-draw.js?v=20261107012315";
import { PILE_SECTIONS } from "./pile-data.js?v=20261107012315";
import { download } from "./pdf.js?v=20261107012315";
import { esc } from "./draw2d.js?v=20261107012315";

const $ = (id) => document.getElementById(id);
const DKEY = "wp-pile-draft", MKEY = "wp-mode";
const DB_SIZES = [10, 12, 16, 20, 25];
let extras = [], splits = [], started = false;

const num = (id) => { const v = parseFloat($(id).value); return v > 0 ? v : 0; };
const pnVal = () => Math.min(6, Math.max(1, +$("pnS").value || 1));
const radio = (n) => (document.querySelector(`input[name="${n}"]:checked`) || {}).value;

function read() {
  const full = radio("pt") === "full", pieces = pnVal();
  const sp = splits.slice(0, pieces).map((v) => (parseFloat(v) > 0 ? parseFloat(v) : 0));
  return {
    section: $("psec").value, full, L: num("pL"), pieces, joint: full || pieces >= 2, // 2 ท่อนขึ้นไป = มีหัวต่อ, ท่อนเดี่ยว = ไม่มีหัวต่อ (แบบเต็มแสดงหัวต่อ)
   
    split: pieces >= 2 && sp.length === pieces && sp.every((v) => v > 0) ? sp : null,
    extras: extras.map((e) => ({ ...e })),
    shoulder: $("psh").checked ? num("pshAt") : 0,
    project: { pj: $("ppj").value.trim(), ow: $("pow").value.trim(), lo: $("plo").value.trim() },
    _raw: { splits: splits.slice(0, pieces), shOn: $("psh").checked, shAt: $("pshAt").value, pt: radio("pt"), pn: String(pnVal()) },
  };
}

// ความยาวแต่ละท่อนตามที่ใส่เอง หรือแบ่งอัตโนมัติ (ใช้แสดงในตัวเลือกท่อน และหาท่อนสั้นที่สุด)
function pieceLens() {
  const n = pnVal(); if (n < 2) return [num("pL")];
  const sp = splits.slice(0, n).map((v) => parseFloat(v)), L = num("pL");
  return sp.length === n && sp.every((v) => v > 0) ? sp : L ? autoSplit(L, n) : Array(n).fill(0);
}
const shortestIdx = (lens) => lens.reduce((bi, v, i) => (v > 0 && (lens[bi] <= 0 || v < lens[bi]) ? i : bi), 0) + 1;

function renderExtras() {
  const box = $("pxs"); box.innerHTML = "";
  extras.forEach((e, i) => {
    const multi = pnVal() > 1, showSel = multi, lens = pieceLens(), sIdx = shortestIdx(lens); // ท่อนเดี่ยว: ไม่ต้องเลือก • ระบุความยาวสั้นกว่าเสา: ท่อนบนเสมอ • ไม่ระบุ(เต็มท่อน): เลือกท่อนบน/ทุกท่อน
    if (!multi) e.pieces = 0;
    const d = document.createElement("div"); d.className = "pxrow" + (showSel ? "" : " nosel");
    d.innerHTML = `<div><label>ขนาด</label><select>${DB_SIZES.map((s) => `<option value="${s}" ${s === e.d ? "selected" : ""}>DB${s}</option>`).join("")}</select></div><div><label>ยาว (ม.)</label><input type="number" step="0.01" min="0" value="${e.len || ""}" placeholder="เต็มท่อน"></div><div><label>จำนวน (เส้น)</label><input type="number" step="1" min="1" max="8" value="${e.n || ""}"></div>${showSel ? `<div><label>ใช้กับท่อน</label><select class="xp">${lens.map((l, q) => `<option value="${q + 1}" ${e.pieces !== -1 && (e.pieces || sIdx) === q + 1 ? "selected" : ""}>ท่อนที่ ${q + 1}${l ? ` (${m2(l)} ม.)` : ""}</option>`).join("")}<option value="-1" ${e.pieces === -1 ? "selected" : ""}>ทั้ง ${pnVal()} ท่อน</option></select></div>` : ""}<button type="button" class="iconbtn" aria-label="ลบเหล็กเสริมนี้">✕</button>`;
    const [sel, xp] = d.querySelectorAll("select"), [len, n] = d.querySelectorAll("input");
    if (xp) xp.onchange = () => { e.pieces = +xp.value; render(); };
    sel.onchange = () => { e.d = +sel.value; render(); };
    len.oninput = () => { const had = e.len > 0; e.len = parseFloat(len.value) || 0; if ((e.len > 0) !== had) renderExtras(); render(); };
    n.oninput = () => { e.n = Math.floor(+n.value) || 0; render(); };
    d.querySelector("button").onclick = () => { extras.splice(i, 1); renderExtras(); render(); };
    box.appendChild(d);
  });
}

function syncUi() {
  const full = radio("pt") === "full", two = pnVal() === 2;
  $("pLbox").hidden = full; $("pnBox").hidden = full; $("plSplit").hidden = full || pnVal() < 2; renderSplitRows(); $("pjHint").textContent = full ? "" : (pnVal() >= 2 ? "เสา 2 ท่อนขึ้นไป มีหัวต่อเชื่อม (แผ่นเหล็กและเหล็กเดือย) ทุกรอยต่อ" : "ท่อนเดี่ยว ไม่มีหัวต่อเชื่อม");
  $("pshBox").hidden = full; $("pxBox").hidden = full; $("pshAtBox").hidden = !$("psh").checked || full;
  const L = num("pL");
  
}

// ช่องความยาวแต่ละท่อน (ว่าง = แบ่งอัตโนมัติ) สร้างตามจำนวนท่อน ค่าอัตโนมัติแสดงเป็น placeholder
function renderSplitRows() {
  const n = pnVal(), box = $("plRows"), L = num("pL"), auto = n >= 2 && L ? autoSplit(L, n) : [];
  if (box.dataset.n !== String(n)) {
    box.dataset.n = String(n); box.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const d = document.createElement("div"); d.className = "splr";
      d.innerHTML = `<label>ท่อนที่ ${i + 1}${i === 0 ? " (บน)" : i === n - 1 ? " (ล่าง)" : ""} (ม.)</label><input type="number" step="0.01" min="0" value="${splits[i] || ""}">`;
      const inp = d.querySelector("input"); inp.oninput = () => { splits[i] = inp.value; renderExtras(); sched(); };
      box.appendChild(d);
    }
  }
  [...box.querySelectorAll("input")].forEach((inp, i) => { inp.placeholder = auto[i] ? m2(auto[i]) : ""; });
}

let tmr; const sched = () => { clearTimeout(tmr); tmr = setTimeout(render, 150); };
function render() {
  syncUi();
  const inp = read(), plan = planPile(inp);
  $("pileSheet").innerHTML = pileSheet(plan);
  const empty = !inp.full && !inp.L;
  $("pileWarn").innerHTML = empty ? '<div class="al w">ใส่ความยาวเสา (ม.) เพื่อเขียนแบบ</div>' : plan.warn.map((w) => `<div class="al w">${esc(w)}</div>`).join("");
  $("bPilePdf").disabled = empty;
  try { localStorage.setItem(DKEY, JSON.stringify(inp)); } catch (e) {}
}

function restore() {
  try {
    const d = JSON.parse(localStorage.getItem(DKEY) || "null");
    if (!d) return;
    $("psec").value = d.section in PILE_SECTIONS ? d.section : "T22";
    $("pL").value = d.L || "";
    $("ppj").value = (d.project && d.project.pj) || ""; $("pow").value = (d.project && d.project.ow) || ""; $("plo").value = (d.project && d.project.lo) || "";
    const r = d._raw || {};
    const pt = document.querySelector(`input[name="pt"][value="${r.pt || "len"}"]`);
    if (pt) pt.checked = true; $("pnS").value = String(Math.min(6, Math.max(1, +r.pn || 1)));
    splits = Array.isArray(r.splits) ? r.splits.map((v) => (+v > 0 ? String(v) : "")) : []; // บ่า: ไม่กู้ค่าจากร่าง — เข้าหน้าใหม่ทุกครั้งต้องไม่ติ๊กบ่า (ติ๊กเองเมื่อมีบ่าเท่านั้น)
    $("psh").checked = false; $("pshAt").value = "";
    extras = (d.extras || []).map((e) => ({ d: +e.d || 16, n: +e.n || 4, len: +e.len || 0, pieces: +e.pieces || 0 }));
  } catch (e) {}
}

async function pdf() {
  const inp = read(), plan = planPile(inp), b = $("bPilePdf"), msg = $("pileMsg");
  b.disabled = true; msg.textContent = "กำลังสร้าง PDF…";
  try {
    if (!window.html2canvas || !window.jspdf) throw new Error("โหลดตัวสร้าง PDF ไม่สำเร็จ ลองรีเฟรชหน้า");
    await document.fonts.ready;
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;left:-12000px;top:0;width:1188px;height:840px;background:#fff";
    host.innerHTML = pileSheet(plan).replace('width="100%"', 'width="1188" height="840"');
    document.body.appendChild(host);
    const cv = await window.html2canvas(host, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    host.remove();
    const doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    doc.addImage(cv.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 841.89, 595.28);
    const name = `แบบเสาเข็ม ${PILE_SECTIONS[inp.section].label} ${inp.full ? "แบบเต็ม" : m2(inp.L) + "ม"}`.replace(/[\\/:*?"<>|]/g, "");
    download(name + ".pdf", doc.output("blob"));
    msg.textContent = "ดาวน์โหลดแล้ว";
  } catch (e) { msg.textContent = "สร้าง PDF ไม่สำเร็จ: " + e.message; }
  b.disabled = false;
}

function setMode(m) {
  const pile = m === "pile";
  $("wallWrap").hidden = pile; $("pileWrap").hidden = !pile;
  $("m-wall").setAttribute("aria-selected", pile ? "false" : "true");
  $("m-pile").setAttribute("aria-selected", pile ? "true" : "false");
  $("appTitle").textContent = pile ? "เขียนแบบเสาเข็มไอ" : "ออกแบบแผ่นกันดินหัวลิ่ม";
  try { sessionStorage.setItem(MKEY, m); } catch (e) {}
  if (pile) render();
}

// เลื่อนล้อเมาส์บนช่องตัวเลขที่โฟกัสอยู่ ห้ามเปลี่ยนค่า
document.addEventListener("wheel", (e) => { const t = e.target; if (t && t.tagName === "INPUT" && t.type === "number" && document.activeElement === t) t.blur(); }, { passive: true });

export function initPile() {
  if (started) return; started = true;
  $("psec").innerHTML = Object.values(PILE_SECTIONS).map((s) => `<option value="${s.key}">${s.label} มอก. (${s.size} ม.)</option>`).join("");
  restore(); renderExtras();
  ["pL", "pshAt", "ppj", "pow", "plo"].forEach((id) => $(id).addEventListener("input", sched));
  $("pL").addEventListener("input", renderExtras); // ความยาวท่อนเปลี่ยน → ตัวเลือกท่อนของเหล็กเสริมอัปเดต
  ["psh", "psec"].forEach((id) => $(id).addEventListener("change", render));
  document.querySelectorAll('input[name="pt"],#pnS').forEach((x) => x.addEventListener("change", () => { renderExtras(); render(); }));
  $("pxAdd").onclick = () => { extras.push({ d: 16, n: 4, len: 0, pieces: pnVal() > 1 ? 1 : 0 }); renderExtras(); render(); };
  $("bPilePdf").onclick = pdf;
  $("m-wall").onclick = () => setMode("wall"); $("m-pile").onclick = () => setMode("pile");
  let m = "wall"; try { m = sessionStorage.getItem(MKEY) || "wall"; } catch (e) {}
  setMode(m === "pile" ? "pile" : "wall");
}
