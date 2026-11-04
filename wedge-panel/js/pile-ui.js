// หน้าจอแท็บ "แบบเสาเข็ม": ฟอร์ม → พรีวิวแบบ → ส่งออก PDF A4 (ไม่เก็บลงฐานข้อมูล จำร่างในเครื่อง)
import { planPile, autoSplit, m2 } from "./pile-calc.js";
import { pileSheet } from "./pile-draw.js";
import { PILE_SECTIONS } from "./pile-data.js";
import { download } from "./pdf.js?v=20261104053849";
import { esc } from "./draw2d.js?v=20261104053849";

const $ = (id) => document.getElementById(id);
const DKEY = "wp-pile-draft", MKEY = "wp-mode";
const DB_SIZES = [10, 12, 16, 20, 25];
let extras = [], started = false;

const num = (id) => { const v = parseFloat($(id).value); return v > 0 ? v : 0; };
const radio = (n) => (document.querySelector(`input[name="${n}"]:checked`) || {}).value;

function read() {
  const full = radio("pt") === "full", pieces = radio("pn") === "2" ? 2 : 1;
  const a = num("plA"), b = num("plB");
  return {
    section: $("psec").value, full, L: num("pL"), pieces, joint: $("pjoint").checked,
    split: pieces === 2 && a && b ? [a, b] : null,
    extras: extras.map((e) => ({ ...e })),
    shoulder: $("psh").checked ? num("pshAt") : 0,
    project: { pj: $("ppj").value.trim(), ow: $("pow").value.trim(), lo: $("plo").value.trim() },
    _raw: { a: $("plA").value, b: $("plB").value, shOn: $("psh").checked, shAt: $("pshAt").value, pt: radio("pt"), pn: radio("pn") },
  };
}

function renderExtras() {
  const box = $("pxs"); box.innerHTML = "";
  extras.forEach((e, i) => {
    const d = document.createElement("div"); d.className = "pxrow";
    d.innerHTML = `<div><label>ขนาด</label><select>${DB_SIZES.map((s) => `<option value="${s}" ${s === e.d ? "selected" : ""}>DB${s}</option>`).join("")}</select></div><div><label>ยาว (ม.)</label><input type="number" step="0.01" min="0" value="${e.len || ""}" placeholder="เต็มท่อน"></div><div><label>จำนวน (เส้น)</label><input type="number" step="1" min="1" max="8" value="${e.n || ""}"></div><button type="button" class="iconbtn" aria-label="ลบเหล็กเสริมนี้">✕</button>`;
    const sel = d.querySelector("select"), [len, n] = d.querySelectorAll("input");
    sel.onchange = () => { e.d = +sel.value; render(); };
    len.oninput = () => { e.len = parseFloat(len.value) || 0; render(); };
    n.oninput = () => { e.n = Math.floor(+n.value) || 0; render(); };
    d.querySelector("button").onclick = () => { extras.splice(i, 1); renderExtras(); render(); };
    box.appendChild(d);
  });
}

function syncUi() {
  const full = radio("pt") === "full", two = radio("pn") === "2";
  $("pLbox").hidden = full; $("pnBox").hidden = full; $("plSplit").hidden = full || !two;
  $("pshBox").hidden = full; $("pxBox").hidden = full; $("pshAtBox").hidden = !$("psh").checked || full;
  const L = num("pL");
  if (two && L) { const [a, b] = autoSplit(L); $("plA").placeholder = m2(a); $("plB").placeholder = m2(b); }
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
    $("pL").value = d.L || ""; $("pjoint").checked = d.joint !== false;
    $("ppj").value = (d.project && d.project.pj) || ""; $("pow").value = (d.project && d.project.ow) || ""; $("plo").value = (d.project && d.project.lo) || "";
    const r = d._raw || {};
    const pt = document.querySelector(`input[name="pt"][value="${r.pt || "len"}"]`), pn = document.querySelector(`input[name="pn"][value="${r.pn || "1"}"]`);
    if (pt) pt.checked = true; if (pn) pn.checked = true;
    $("plA").value = r.a || ""; $("plB").value = r.b || ""; $("psh").checked = !!r.shOn; $("pshAt").value = r.shAt || "";
    extras = (d.extras || []).map((e) => ({ d: +e.d || 16, n: +e.n || 4, len: +e.len || 0 }));
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

export function initPile() {
  if (started) return; started = true;
  $("psec").innerHTML = Object.values(PILE_SECTIONS).map((s) => `<option value="${s.key}">${s.label} มอก. (${s.size} ม.)</option>`).join("");
  restore(); renderExtras();
  ["pL", "plA", "plB", "pshAt", "ppj", "pow", "plo"].forEach((id) => $(id).addEventListener("input", sched));
  ["pjoint", "psh", "psec"].forEach((id) => $(id).addEventListener("change", render));
  document.querySelectorAll('input[name="pt"],input[name="pn"]').forEach((x) => x.addEventListener("change", render));
  $("pxAdd").onclick = () => { extras.push({ d: 16, n: 4, len: 0 }); renderExtras(); render(); };
  $("bPilePdf").onclick = pdf;
  $("m-wall").onclick = () => setMode("wall"); $("m-pile").onclick = () => setMode("pile");
  let m = "wall"; try { m = sessionStorage.getItem(MKEY) || "wall"; } catch (e) {}
  setMode(m === "pile" ? "pile" : "wall");
}
