// หน้าจอแท็บ "แบบเสาเข็ม": ฟอร์ม → พรีวิวแบบ → ส่งออก PDF A4 (ไม่เก็บลงฐานข้อมูล จำร่างในเครื่อง)
import { planPile, autoSplit, m2 } from "./pile-calc.js?v=20261107072923";
import { pileSheet } from "./pile-draw.js?v=20261107072923";
import { PILE_SECTIONS } from "./pile-data.js?v=20261107072923";
import { download } from "./pdf.js?v=20261107072923";
import { esc } from "./draw2d.js?v=20261107072923";
import { getSession, canEdit } from "./auth.js?v=20261107072923";
import { nextPileCode, savePileJob, listPileJobs, deleteProject } from "./db.js?v=20261107072923";
import { db } from "./db.js?v=20261107072923";
import { parseRequest, TEMPLATE, blowSheet } from "./pile-req.js?v=20261107072923";

const $ = (id) => document.getElementById(id);
const DKEY = "wp-pile-draft", MKEY = "wp-mode";
const DB_SIZES = [10, 12, 16, 20, 25];
let extras = [], splits = [], started = false, queue = [], active = null, curJobId = null, curCode = null;

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
    blow: { W: num("pW"), Qa: num("pQa"), H: num("pH") },
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
    d.innerHTML = `<div><label>ขนาด</label><select>${DB_SIZES.map((s) => `<option value="${s}" ${s === e.d ? "selected" : ""}>DB${s}</option>`).join("")}</select></div><div><label>ยาว (ม.)</label><input type="number" step="0.01" min="0" value="${e.len || ""}" placeholder="เต็มท่อน"></div><div><label>จำนวน (เส้น)</label><input type="number" step="1" min="1" max="8" value="${e.n || ""}"></div>${showSel ? `<div><label>ใช้กับท่อน</label><select class="xp" ${e.pieces === -1 ? "disabled" : ""}>${lens.map((l, q) => `<option value="${q + 1}" ${e.pieces !== -1 && (e.pieces > 0 ? e.pieces : sIdx) === q + 1 ? "selected" : ""}>ท่อนที่ ${q + 1}${l ? ` (${m2(l)} ม.)` : ""}</option>`).join("")}</select></div>` : ""}<button type="button" class="iconbtn" aria-label="ลบเหล็กเสริมนี้">✕</button>${multi && !(e.len > 0) ? `<label class="pxall"><input type="checkbox" ${e.pieces === -1 ? "checked" : ""}> เหล็กเต็มความยาวเสา (ขึ้นเต็มทั้ง ${pnVal()} ท่อน)</label>` : ""}`;
    const [sel, xp] = d.querySelectorAll("select"), [len, n] = d.querySelectorAll("input");
    const ck = d.querySelector(".pxall input");
    if (ck) ck.onchange = () => { e.pieces = ck.checked ? -1 : 0; renderExtras(); render(); };
    if (xp) xp.onchange = () => { e.pieces = +xp.value; render(); };
    sel.onchange = () => { e.d = +sel.value; render(); };
    len.oninput = () => { const had = e.len > 0; e.len = parseFloat(len.value) || 0; let ch = (e.len > 0) !== had;
      if (e.len > 0 && e.pieces === -1) { e.pieces = 0; ch = true; } // ระบุความยาวแล้ว = ไม่ใช่เหล็กเต็มเสา
      if (ch) { renderExtras(); const nl = $("pxs").querySelectorAll(".pxrow")[extras.indexOf(e)]?.querySelectorAll("input[type=number]")[0]; if (nl) { nl.focus(); try { nl.setSelectionRange(nl.value.length, nl.value.length); } catch (er) {} } } render(); };
    n.oninput = () => { e.n = Math.floor(+n.value) || 0; render(); };
    d.querySelector("button").onclick = () => { extras.splice(i, 1); renderExtras(); render(); };
    box.appendChild(d);
  });
}

function syncUi() {
  const full = radio("pt") === "full", two = pnVal() === 2;
  $("pLbox").hidden = full; $("pnBox").hidden = full; $("plSplit").hidden = full || pnVal() < 2; renderSplitRows(); $("pjHint").textContent = full ? "" : (pnVal() >= 2 ? "เสา 2 ท่อนขึ้นไป มีหัวต่อเชื่อม (แผ่นเหล็กและเหล็กเดือย) ทุกรอยต่อ" : "ท่อนเดี่ยว ไม่มีหัวต่อเชื่อม");
  const sc = PILE_SECTIONS[$("psec").value], noSh = !(sc && sc.shoulder); if (noSh) $("psh").checked = false; $("pshBox").hidden = full || noSh; // บ่ามีเฉพาะหน้าตัดที่มีแบบบ่า $("pxBox").hidden = full || (sc && sc.extras === false); $("pshAtBox").hidden = !$("psh").checked || full || noSh;
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
    $("psec").value = [...$("psec").options].some((o) => o.value === d.section) ? d.section : "T22";
    $("pL").value = d.L || "";
    $("ppj").value = (d.project && d.project.pj) || ""; $("pow").value = (d.project && d.project.ow) || ""; $("plo").value = (d.project && d.project.lo) || "";
    const r = d._raw || {};
    const pt = document.querySelector(`input[name="pt"][value="${r.pt || "len"}"]`);
    if (pt) pt.checked = true; $("pnS").value = String(Math.min(6, Math.max(1, +r.pn || 1)));
    splits = Array.isArray(r.splits) ? r.splits.map((v) => (+v > 0 ? String(v) : "")) : []; // บ่า: ไม่กู้ค่าจากร่าง — เข้าหน้าใหม่ทุกครั้งต้องไม่ติ๊กบ่า (ติ๊กเองเมื่อมีบ่าเท่านั้น)
    $("psh").checked = false; $("pshAt").value = "";
    const bw = d.blow || {}; $("pW").value = bw.W || ""; $("pQa").value = bw.Qa || ""; $("pH").value = bw.H || "";
    extras = (d.extras || []).map((e) => ({ d: +e.d || 16, n: +e.n || 4, len: +e.len || 0, pieces: +e.pieces || 0 }));
  } catch (e) {}
}

async function addPage(doc, html, first) {
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-12000px;top:0;width:1188px;height:840px;background:#fff";
  host.innerHTML = html; document.body.appendChild(host);
  const cv = await window.html2canvas(host, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  host.remove();
  if (!first) doc.addPage("a4", "landscape");
  doc.addImage(cv.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 841.89, 595.28);
}
const secName = (k) => { const s = PILE_SECTIONS[k]; return (s.menu || s.label) + " มอก."; };
const blowItem = (inp) => ({ section: inp.section, L: inp.L, W: inp.blow.W, Qa: inp.blow.Qa, H: inp.blow.H });

// ---- วางข้อความคำขอ → รายการเสา → PDF ทั้งชุด ----
function pileInputOf(p, project) {
  return { section: p.section, full: false, L: p.L, pieces: p.pieces, joint: p.pieces >= 2, split: p.split, extras: (p.extras || []).map((e) => ({ ...e })), shoulder: p.shoulder || 0, project, blow: { W: p.W, Qa: p.Qa, H: p.H } };
}
function loadPile(p, project) {
  $("psec").value = p.section; $("pL").value = p.L; $("pnS").value = String(p.pieces);
  const pt = document.querySelector('input[name="pt"][value="len"]'); if (pt) pt.checked = true;
  splits = p.split ? p.split.map(String) : []; extras = (p.extras || []).map((e) => ({ d: +e.d || 16, n: +e.n || 4, len: +e.len || 0, pieces: +e.pieces || 0 })); active = p;
  $("psh").checked = (p.shoulder || 0) > 0; $("pshAt").value = p.shoulder > 0 ? p.shoulder : "";
  $("pW").value = p.W || ""; $("pQa").value = p.Qa || ""; $("pH").value = p.H || "";
  $("ppj").value = project.pj; $("pow").value = project.ow; $("plo").value = project.lo;
  $("plRows").dataset.n = ""; renderExtras(); render();
}
function readReq() { curJobId = null; curCode = null; showQueue(parseRequest($("preq").value, PILE_SECTIONS)); }

// รายการคำขอจากหน้า "ติดตามรายการคำนวณเสาเข็ม" (อ่านอย่างเดียว ไม่แก้สถานะในระบบนั้น)
async function loadTracker() {
  const msg = $("preqMsg"), box = $("preqList"); msg.textContent = "กำลังดึงรายการขอ…"; box.innerHTML = "";
  try {
    const { data, error } = await db().from("pile_calc_requests").select("id,data,updated_at").order("updated_at", { ascending: false }).limit(60);
    if (error) throw error;
    const rows = (data || []).map((x) => x.data).filter((r) => r && r.status === "received" && Array.isArray(r.items));
    msg.textContent = rows.length ? "คำขอที่ยังไม่ได้เขียนแบบ " + rows.length + " งาน กดเลือกงาน" : "ไม่มีคำขอที่รอเขียนแบบ";
    rows.forEach((r) => {
      const b = document.createElement("button"); b.type = "button"; b.style.cssText = "display:block;width:100%;text-align:left;margin:3px 0";
      b.textContent = (r.code ? r.code + " " : "") + (r.project || "(ไม่มีชื่อโครงการ)") + " — " + r.items.length + " รายการ";
      b.onclick = () => { curJobId = null; curCode = null; showQueue(fromTracker(r)); }; box.appendChild(b);
    });
  } catch (e) { msg.textContent = "ดึงรายการขอไม่สำเร็จ: " + (e.message || e); }
}
function fromTracker(r) {
  const piles = r.items.map((i) => {
    const sz = parseFloat(i.size), size = Math.round(sz < 1 ? sz * 100 : sz), kind = i.section === "S" ? "S" : "T", errs = [];
    const L = parseFloat(i.length) || 0, W = parseFloat(i.hammer) || 0, Qa = parseFloat(i.qa) || 0, H = parseFloat(i.drop) || 0;
    if (i.std === "factory") errs.push("มาตรฐานโรงงาน ยังไม่รองรับ");
    if (i.micro || i.joint === "micro") errs.push("ไมโครไพล์ ไม่รองรับ");
    if (!PILE_SECTIONS[kind + size]) errs.push("ไม่มีหน้าตัดนี้ในระบบ");
    if (!L) errs.push("ไม่มีความยาว"); if (!W) errs.push("ไม่มีน้ำหนักตุ้ม"); if (!Qa) errs.push("ไม่มี Qa"); if (!H) errs.push("ไม่มีระยะยก");
    return { section: kind + size, sizeCm: size, kind, L, pieces: i.joint === "joined" ? 2 : 1, split: null, W, Qa, H, errs, qty: i.qty };
  });
  return { project: { pj: r.project || "", ow: r.owner || "", lo: r.location || "" }, piles };
}
function showQueue(r) {
  const msg = $("preqMsg");
  const proj = { pj: r.project.pj || $("ppj").value.trim(), ow: r.project.ow || $("pow").value.trim(), lo: r.project.lo || $("plo").value.trim() };
  queue = r.piles.map((p) => ({ ...p, project: proj }));
  const box = $("preqList"); box.innerHTML = "";
  queue.forEach((p, i) => {
    const pl = p.pieces > 1 ? (p.split || autoSplit(p.L, p.pieces)).join("+") : "ท่อนเดี่ยว";
    const b = document.createElement("button"); b.type = "button"; b.className = "preqrow";
    b.style.cssText = "display:block;width:100%;text-align:left;margin:3px 0";
    b.textContent = (p.errs.length ? "⚠ " : "") + (i + 1) + ". " + (p.kind === "T" ? "I" : "S") + "-" + p.sizeCm + " ยาว " + p.L + " ม. (" + pl + ") ตุ้ม " + p.W + " Qa " + p.Qa + " ยก " + p.H + (p.errs.length ? " — " + p.errs.join(", ") : "");
    b.onclick = () => { if (!PILE_SECTIONS[p.section]) return; syncActive(); loadPile(p, proj); }; box.appendChild(b);
  });
  $("preqPdf").hidden = !queue.some((p) => !p.errs.length);
  msg.textContent = queue.length ? "พบ " + queue.length + " ต้น กดแถวเพื่อดูแบบ" : "ไม่พบรายการเสา (ต้องมีบรรทัดแบบ I 0.22×19.00 ม.)";
  if (queue[0] && PILE_SECTIONS[queue[0].section]) loadPile(queue[0], proj);
}
// เสาที่เปิดอยู่ในฟอร์ม → เก็บค่าที่แก้ล่าสุดกลับเข้ารายการ
function syncActive() {
  if (!active || !queue.includes(active)) return;
  const i = read();
  Object.assign(active, { section: i.section, L: i.L, pieces: i.pieces, split: i.split, W: i.blow.W, Qa: i.blow.Qa, H: i.blow.H, extras: i.extras, shoulder: i.shoulder, kind: i.section[0], sizeCm: +i.section.slice(1) });
}
const slim = (p) => ({ section: p.section, L: p.L, pieces: p.pieces, split: p.split || null, W: p.W, Qa: p.Qa, H: p.H, extras: p.extras || [], shoulder: p.shoulder || 0 });
async function saveJob() {
  const msg = $("pjMsg"), b = $("bPjSave");
  if (!canEdit(getSession())) { msg.textContent = "บัญชีนี้บันทึกไม่ได้ (ดูได้อย่างเดียว)"; return; }
  syncActive();
  let piles = queue.filter((p) => !p.errs.length && PILE_SECTIONS[p.section]).map(slim);
  if (!queue.length) { const i = read(); if (i.full || !i.L) { msg.textContent = "ใส่ความยาวเสาก่อนบันทึก"; return; } piles = [slim({ section: i.section, L: i.L, pieces: i.pieces, split: i.split, W: i.blow.W, Qa: i.blow.Qa, H: i.blow.H, extras: i.extras, shoulder: i.shoulder })]; }
  if (!piles.length) { msg.textContent = "ไม่มีเสาที่ข้อมูลครบให้บันทึก"; return; }
  b.disabled = true; msg.textContent = "กำลังบันทึก…";
  try {
    if (!curCode) curCode = await nextPileCode();
    const project = { pj: $("ppj").value.trim(), ow: $("pow").value.trim(), lo: $("plo").value.trim() };
    curJobId = await savePileJob({ id: curJobId, job: { code: curCode, project, piles }, user: getSession() });
    msg.textContent = "บันทึกแล้ว รหัส " + curCode + " (" + piles.length + " ต้น)";
    refreshJobs();
  } catch (e) { msg.textContent = "บันทึกไม่สำเร็จ: " + (e.message || e); }
  b.disabled = false;
}
function newJob() { // เริ่มงานใหม่: ล้างรายการเสาและรหัสที่เปิดอยู่ (ฟอร์มเสาคงไว้)
  queue = []; active = null; curJobId = null; curCode = null; $("preq").value = ""; $("preqList").innerHTML = ""; $("preqPdf").hidden = true; $("preqMsg").textContent = "";
  ["ppj", "pow", "plo"].forEach((id) => { $(id).value = ""; }); render();
  $("pjMsg").textContent = "เริ่มงานใหม่ (บันทึกครั้งหน้าจะได้รหัสใหม่)";
}
async function refreshJobs() {
  const box = $("pjList"); if (!box) return;
  try {
    const rows = await listPileJobs(20); box.innerHTML = "";
    rows.forEach((row) => {
      const d = row.data || {}, wrap = document.createElement("div"); wrap.style.cssText = "display:flex;gap:4px;margin:3px 0";
      const b = document.createElement("button"); b.type = "button"; b.style.cssText = "flex:1;text-align:left";
      b.textContent = (d.code || row.name) + " " + ((d.project && d.project.pj) || "") + " — " + ((d.piles || []).length) + " ต้น";
      b.onclick = () => openJob(row);
      const x = document.createElement("button"); x.type = "button"; x.className = "iconbtn"; x.textContent = "ลบ"; x.setAttribute("aria-label", "ลบงาน " + (d.code || ""));
      x.onclick = () => delJob(row);
      wrap.append(b, x); box.appendChild(wrap);
    });
    if (!rows.length) box.textContent = "ยังไม่มีงานที่บันทึก";
  } catch (e) { box.textContent = "โหลดรายการไม่สำเร็จ"; }
}
function openJob(row) {
  const d = row.data || {};
  const piles = (d.piles || []).map((p) => ({ ...p, kind: p.section[0], sizeCm: +p.section.slice(1), errs: [] }));
  showQueue({ project: d.project || { pj: "", ow: "", lo: "" }, piles });
  curJobId = row.id; curCode = d.code || null;
  $("pjMsg").textContent = "เปิดงาน " + curCode + " แก้ไขแล้วกดบันทึกเพื่อเก็บทับรหัสเดิม";
}
async function delJob(row) {
  const d = row.data || {};
  if (!canEdit(getSession())) { $("pjMsg").textContent = "บัญชีนี้ลบไม่ได้ (ดูได้อย่างเดียว)"; return; }
  if (!window.confirm("ลบงาน " + (d.code || "") + " " + ((d.project && d.project.pj) || "") + " ถาวรใช่ไหม?\n\nลบแล้วกู้คืนไม่ได้ (รหัสนี้จะไม่ถูกนำมาใช้ซ้ำในวันเดียวกันถ้ามีรหัสที่ใหญ่กว่า)")) return;
  try {
    await deleteProject(row.id);
    if (curJobId === row.id) { curJobId = null; curCode = null; }
    $("pjMsg").textContent = "ลบงาน " + (d.code || "") + " แล้ว"; refreshJobs();
  } catch (e) { $("pjMsg").textContent = "ลบไม่สำเร็จ: " + (e.message || e); }
}

async function pdfAll() {
  syncActive();
  const ok = queue.filter((p) => !p.errs.length && PILE_SECTIONS[p.section]), b = $("preqPdf"), msg = $("preqMsg");
  if (!ok.length) return; b.disabled = true;
  try {
    if (!window.html2canvas || !window.jspdf) throw new Error("โหลดตัวสร้าง PDF ไม่สำเร็จ ลองรีเฟรชหน้า");
    await document.fonts.ready;
    const doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    let first = true;
    for (let i = 0; i < ok.length; i++) {
      msg.textContent = "กำลังสร้าง PDF… " + (i + 1) + "/" + ok.length;
      const inp = pileInputOf(ok[i], ok[i].project), plan = planPile(inp);
      await addPage(doc, pileSheet(plan).replace('width="100%"', 'width="1188" height="840"'), first); first = false;
      await addPage(doc, blowSheet(blowItem(inp), secName(inp.section), inp.project, plan.pieces.map((q) => q.len)), false);
    }
    const pj = (ok[0].project.pj || "คำขอ").slice(0, 30);
    download(("แบบเสาเข็ม+blow " + pj + ".pdf").replace(/[\/:*?"<>|]/g, ""), doc.output("blob"));
    msg.textContent = "ดาวน์โหลดแล้ว " + ok.length + " ต้น";
  } catch (e) { msg.textContent = "สร้าง PDF ไม่สำเร็จ: " + e.message; }
  b.disabled = false;
}

async function pdf() {
  const inp = read(), plan = planPile(inp), b = $("bPilePdf"), msg = $("pileMsg");
  b.disabled = true; msg.textContent = "กำลังสร้าง PDF…";
  try {
    if (!window.html2canvas || !window.jspdf) throw new Error("โหลดตัวสร้าง PDF ไม่สำเร็จ ลองรีเฟรชหน้า");
    await document.fonts.ready;
    const doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    await addPage(doc, pileSheet(plan).replace('width="100%"', 'width="1188" height="840"'), true);
    if (inp.blow.W && inp.blow.Qa && inp.blow.H && !inp.full) await addPage(doc, blowSheet(blowItem(inp), secName(inp.section), inp.project, plan.pieces.map((q) => q.len)), false);
    const name = `แบบเสาเข็ม ${(PILE_SECTIONS[inp.section].menu || PILE_SECTIONS[inp.section].label)} ${inp.full ? "แบบเต็ม" : m2(inp.L) + "ม"}`.replace(/[\\/:*?"<>|]/g, "");
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
  $("psec").innerHTML = Object.values(PILE_SECTIONS).filter((s) => !s.draft || /[?&]draft/.test(location.search)).sort((a, b) => (a.geo.sq ? 1 : 0) - (b.geo.sq ? 1 : 0) || a.geo.B - b.geo.B).map((s) => `<option value="${s.key}">${s.menu || s.label} มอก. (${s.size} ม.)</option>`).join("");
  restore(); renderExtras();
  ["pL", "pshAt", "ppj", "pow", "plo", "pW", "pQa", "pH"].forEach((id) => $(id).addEventListener("input", sched));
  $("pL").addEventListener("input", renderExtras); // ความยาวท่อนเปลี่ยน → ตัวเลือกท่อนของเหล็กเสริมอัปเดต
  ["psh", "psec"].forEach((id) => $(id).addEventListener("change", render));
  document.querySelectorAll('input[name="pt"],#pnS').forEach((x) => x.addEventListener("change", () => { renderExtras(); render(); }));
  $("pxAdd").onclick = () => { extras.push({ d: 16, n: 4, len: 0, pieces: pnVal() > 1 ? 1 : 0 }); renderExtras(); render(); };
  $("bPilePdf").onclick = pdf;
  $("preqTpl").onclick = () => { $("preq").value = TEMPLATE; $("preqMsg").textContent = "แก้ข้อความตัวอย่างนี้ แล้วกด อ่านข้อความ (หรือส่งตัวอย่างนี้ให้หน้างานกรอก)"; try { navigator.clipboard.writeText(TEMPLATE); } catch (e) {} };
  $("preqGo").onclick = readReq; $("preqDb").onclick = loadTracker; $("preqPdf").onclick = pdfAll; $("bPjSave").onclick = saveJob; $("bPjNew").onclick = newJob; refreshJobs();
  $("m-wall").onclick = () => setMode("wall"); $("m-pile").onclick = () => setMode("pile");
  let m = "wall"; try { m = sessionStorage.getItem(MKEY) || "wall"; } catch (e) {}
  setMode(m === "pile" ? "pile" : "wall");
}
