// หน้าจอ: ฟอร์ม ผลคำนวณ แท็บ บันทึกโครงการ ส่งออก — ตรรกะคำนวณอยู่ใน calc.js ทั้งหมด
import { STD, HS } from "./standards.js?v=20261101064304";
import {
  calcProject, calcDirect, splitSpans, stackOptions, suggestHeights, STDH, standardSpec, fmt, f2, f3,
} from "./calc.js?v=20261101064304";
import { barName as NM, PIPE_NAME as PN, DEFAULT_TRUCK_KG } from "./standards.js?v=20261101064304";
import { panelSheet, jointSvg, remark3d, esc } from "./draw2d.js?v=20261101064304";
import { createViews } from "./view3d.js?v=20261101064304";
import { makePdf, downloadSummary } from "./pdf.js?v=20261101064304";
import { getSession, showLogin, logout, canUse, canEdit, syncSession } from "./auth.js?v=20261101064304";
import { listProjects, getProject, saveProject } from "./db.js?v=20261101064304";

const $ = (id) => document.getElementById(id);
let STATE = null, spans = [{ cc: 1500, n: 10 }], stackSel = 0, curId = null, user = null, editable = false;
let orderRows = [{ WT: 1370, H: 1000, qty: 10 }];
let orderAllowance = 20; // มม. ค่าเผื่อทำงานข้างละ (มาตรฐาน 20) ไม่มีช่องให้แก้ ใช้คำนวณระยะกลาง/กลางเสาในหมายเหตุ
let views = null, cur = "view3d";
const PANES = ["view3d", "drawing", "production", "table"];

// ---------------- ช่วงเสา (กรอกเอง) ----------------
function renderSpans() {
  const box = $("spans"); box.innerHTML = "";
  spans.forEach((s, i) => {
    const d = document.createElement("div"); d.className = "sr";
    d.innerHTML = `<div><label>ระยะ กลาง/กลางเสา (ม.)</label><input type="number" step="0.01" min="0.6" max="6" value="${(s.cc / 1000).toFixed(2)}"></div><div><label>จำนวนช่วง</label><input type="number" step="1" min="1" value="${s.n}"></div><button type="button" class="iconbtn" aria-label="ลบช่วงนี้">✕</button>`;
    const [a, b] = d.querySelectorAll("input");
    a.oninput = () => { s.cc = Math.round(+a.value * 1000); sched(); };
    b.oninput = () => { s.n = Math.floor(+b.value) || 0; sched(); };
    d.querySelector("button").onclick = () => { if (spans.length > 1) { spans.splice(i, 1); renderSpans(); run(); } };
    box.appendChild(d);
  });
}
function renderRows() {
  const box = $("orows"); box.innerHTML = "";
  orderRows.forEach((r, i) => {
    const d = document.createElement("div"); d.className = "oitem";
    d.innerHTML = `<div class="orow"><div><label>กว้างรวม (ม.)</label><input type="number" step="0.01" min="0.1" value="${(r.WT / 1000).toFixed(2)}"></div><div><label>สูง (ม.)</label><select>${HS.map((h) => `<option value="${h}" ${h === r.H ? "selected" : ""}>${(h / 1000).toFixed(2)}</option>`).join("")}</select></div><div><label>จำนวน (แผ่น)</label><input type="number" step="1" min="1" value="${r.qty}"></div><button type="button" class="iconbtn" aria-label="ลบรายการนี้">✕</button></div>`;
    const [w, q] = d.querySelectorAll("input"), h = d.querySelector("select");
    w.oninput = () => { r.WT = Math.round(+w.value * 1000); sched(); };
    h.onchange = () => { r.H = +h.value; run(); };
    q.oninput = () => { r.qty = Math.floor(+q.value) || 0; sched(); };
    d.querySelector("button").onclick = () => { if (orderRows.length > 1) { orderRows.splice(i, 1); renderRows(); run(); } };
    box.appendChild(d);
  });
}
$("addRow").onclick = () => { const l = orderRows[orderRows.length - 1] || { WT: 1370, H: 1000 }; orderRows.push({ WT: l.WT, H: l.H, qty: 1 }); renderRows(); run(); };
// แสดง/ซ่อนส่วนของแต่ละโหมด
function applyModeUi(direct) {
  $("wallBox").hidden = direct; $("spanFs").hidden = direct; $("rowsFs").hidden = !direct;
  $("lgPile").textContent = direct ? "หน้าตัดเสาเข็มไอ" : "เสาเข็มและความสูงกำแพง";
  $("omHint").textContent = direct ? "ใส่ความกว้างรวม ความสูงมาตรฐาน และจำนวนแผ่นเอง เหมาะกับสั่งขาดหรือสั่งเพิ่ม" : "ใส่ความยาวกำแพงและระยะเสา ระบบคำนวณความกว้างและจำนวนแผ่นให้";
}
$("addSpan").onclick = () => { spans.push({ cc: spans[spans.length - 1].cc, n: 1 }); renderSpans(); run(); };

// ---------------- ความสูงกำแพงและการซ้อนแผ่น ----------------
function setWh(h) { $("wh").value = (h / 1000).toFixed(2); stackSel = 0; run(); }
function renderStdChips(Ht) {
  const box = $("whStd");
  if (!box.dataset.done) {
    box.dataset.done = "1";
    box.innerHTML = STDH.filter((h) => h <= 3000).map((h) => `<button type="button" data-h="${h}">${(h / 1000).toFixed(2)}</button>`).join("");
    box.querySelectorAll("button").forEach((b) => (b.onclick = () => setWh(+b.dataset.h)));
  }
  box.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.h === Ht ? "true" : "false"));
}
function drawStackVis(a) {
  const v = $("stkVis");
  if (!a) { v.innerHTML = ""; return; }
  const tot = a.reduce((p, q) => p + q, 0), k = Math.min(0.06, 170 / tot);
  v.innerHTML = `<small>กำแพงที่เลือก</small><b>${(tot / 1000).toFixed(2)}</b><div class="col" role="img" aria-label="ซ้อนแผ่น ${a.map((h) => (h / 1000).toFixed(2)).join(" + ")} เมตร">${a.map((h) => `<i style="height:${Math.max(16, h * k)}px">${(h / 1000).toFixed(2)}</i>`).join("")}</div>`;
}
function renderStack() {
  const Ht = Math.round(+$("wh").value * 1000);
  $("whE").textContent = ""; $("whSug").innerHTML = ""; renderStdChips(Ht); $("stkVis").innerHTML = "";
  const box = $("stk"); box.innerHTML = "";
  if (!(Ht >= 500 && Ht <= 4800)) { $("whE").textContent = "ใส่ความสูงกำแพงระหว่าง 0.50 ถึง 4.80 ม."; return []; }
  const op = stackOptions(Ht);
  if (!op.length) {
    const { up, down } = suggestHeights(Ht);
    $("whE").textContent = `ความสูง ${(Ht / 1000).toFixed(2)} ม. ไม่ตรงกับการซ้อนแผ่นมาตรฐาน`;
    $("whSug").innerHTML = `<div class="sug">${up ? `<button type="button" class="pri" data-h="${up}">ปรับขึ้นเป็น ${(up / 1000).toFixed(2)} ม.</button>` : ""}${down ? `<button type="button" data-h="${down}">ปรับลงเป็น ${(down / 1000).toFixed(2)} ม.</button>` : ""}</div><p class="hint">แนะนำปรับขึ้น กำแพงจะสูงไม่ต่ำกว่าที่ต้องการ ส่วนที่เกินฝังลงดินหรือถมดินเพิ่ม</p>`;
    $("whSug").querySelectorAll("button").forEach((b) => (b.onclick = () => setWh(+b.dataset.h)));
    return [];
  }
  if (stackSel >= op.length) stackSel = 0;
  drawStackVis(op[stackSel]);
  op.forEach((a, i) => {
    const l = document.createElement("label");
    l.innerHTML = `<input type="radio" name="stk" value="${i}" ${i === stackSel ? "checked" : ""}> ${a.map((h) => (h / 1000).toFixed(2)).join(" + ")} ม. <span style="color:var(--faint);font-size:12px;margin-left:auto">${a.length} แผ่น/ช่วง${a.over ? ` • สูงรวม ${fmt(a.sum)}` : ""}</span>`;
    l.querySelector("input").onchange = () => { stackSel = i; run(); };
    box.appendChild(l);
  });
  return op;
}

// ---------------- อ่านฟอร์ม ----------------
const radio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
function spec() {
  if (radio("md") !== "sp") return standardSpec();
  return { sp: true, dv: +$("dv").value, sv: Math.round(+$("sv").value * 1000), dh: +$("dh").value, sh: Math.round(+$("sh").value * 1000), cv: STD.cv, oh: STD.oh, pd: +$("pd").value, pr: +$("pr").value, pc: +$("pc").value, note: $("nt").value.trim() };
}
function currentSpans(al) {
  if (radio("sm") !== "len") return spans;
  const method = $("lmt").value === "eq" ? "eq" : "rest";
  const r = splitSpans(Math.round(+$("lm").value * 1000), Math.round(+$("cmx").value * 1000), method);
  $("lenOut").textContent = "";
  r.errors.forEach((e) => al.push(["d", e]));
  r.warnings.forEach((w) => al.push(w));
  if (r.spans.length) {
    const s = Math.round(+$("cmx").value * 1000);
    const txt = r.spans.map((o, i) => (method === "rest" && i === r.spans.length - 1 && o.cc !== s ? `ช่วงสุดท้าย ${f2(o.cc)} ม.` : `เสาห่างกัน ${f2(o.cc)} ม. ${o.n} ช่วง`)).join(" และ ");
    $("lenOut").innerHTML = `<b>${txt}</b><br>ใช้เสาเข็มไอ ${r.pileCount} ต้น`;
  }
  return r.spans;
}

// ---------------- คำนวณและแสดงผล ----------------
function run() {
  const direct = radio("om") === "direct";
  applyModeUi(direct);
  const S = spec();
  $("stdBox").hidden = S.sp; $("spBox").hidden = !S.sp;
  const truck = +$("tk").value || DEFAULT_TRUCK_KG;
  let r;
  if (direct) {
    r = calcDirect({ pile: $("pt").value, allowance: orderAllowance, rows: orderRows.map((r) => ({ WT: r.WT, H: r.H, qty: r.qty })), spec: S, truckKg: truck });
    r.ref = $("rf").value.trim();
  } else {
    const op = renderStack();
    const lenMode = radio("sm") === "len";
    $("lenBox").hidden = !lenMode; $("manBox").hidden = lenMode;
    const spanAl = [];
    const sp = currentSpans(spanAl);
    const stk = op[stackSel] ? [...op[stackSel]] : [];
    r = calcProject({ pile: $("pt").value, allowance: Math.round(+$("gp").value * 1000), spans: sp, stack: stk, spec: S, truckKg: truck });
    r.al = [...r.al.filter((a) => a[1].startsWith("งานสั่งพิเศษ")), ...spanAl, ...r.al.filter((a) => !a[1].startsWith("งานสั่งพิเศษ"))];
  }
  STATE = r;
  const { p, G, list, nPile, nSpan, wLen, totQ, totV, totS, totW, trips } = r;
  $("cards").innerHTML = `<div class="card"><div class="k">หัวลิ่ม</div><div class="v">แบบ ${p.ty}</div><div class="s">${G.d} • ${p.n}</div></div>
${direct ? `<div class="card"><div class="k">วิธีสั่ง</div><div class="v">ตามจำนวนแผ่น</div><div class="s">${esc(r.ref || "ไม่มีข้อมูลระยะเสา")}</div></div>` : `<div class="card"><div class="k">เสาเข็มไอ</div><div class="v">${fmt(nPile)} ต้น</div><div class="s">${fmt(nSpan)} ช่วง • กำแพงยาว ${(wLen / 1000).toFixed(2)} ม.</div></div>`}
<div class="card"><div class="k">แผ่นทั้งโครงการ</div><div class="v">${fmt(totQ)} แผ่น</div><div class="s">${list.length} รหัส • <span class="stamp ${S.sp ? "sp" : "std"}">${S.sp ? "สั่งพิเศษ" : "มาตรฐานบริษัท"}</span></div></div>
<div class="card"><div class="k">คอนกรีตรวม</div><div class="v">${totV.toFixed(2)} ลบ.ม.</div><div class="s">เหล็กเสริม ${fmt(totS)} กก.</div></div>
<div class="card"><div class="k">น้ำหนักขนส่ง</div><div class="v">${(totW / 1000).toFixed(1)} ตัน</div><div class="s">รถ ${fmt(truck)} กก. ≈ ${trips} เที่ยว</div></div>`;
  $("alerts").innerHTML = r.al.map((a) => `<div class="al ${a[0]}">${esc(a[1])}</div>`).join("");
  $("sched").querySelector("tbody").innerHTML = list.map((i) => `<tr><td class="code">${i.code}</td><td style="text-align:left">${i.name}</td><td>${f2(i.H)}</td><td>${f2(i.WT)}</td><td>${[...i.cc].map(f2).join(", ") || "-"}</td><td>${fmt(i.qty)}</td><td>${fmt(i.P.wt)}</td><td>${i.P.vol.toFixed(3)}</td><td>${i.P.kg.toFixed(1)}</td></tr>`).join("") || `<tr><td colspan="9">ใส่ระยะเสาและความสูงกำแพงเพื่อดูรายการแผ่น</td></tr>`;
  fillSelect("sel3", r.groups.map((gr, i) => [String(i), gr.stk ? `กลาง/กลางเสา ${f2(gr.cc)} ม. • กว้างแผ่น ${f2(gr.F.WT)} ม. • สูง ${f2(gr.stk[0])} ม. • ${gr.n} แผ่น` : `กลาง/กลางเสา ${f2(gr.cc)} ม. • กว้างแผ่น ${f2(gr.F.WT)} ม. • ${gr.n} ช่วง`]));
  const optItem = list.map((i) => [i.code, `${i.code} • สูง ${(i.H / 1000).toFixed(2)} × กว้าง ${f2(i.WT)}`]);
  fillSelect("selD", optItem); fillSelect("selT", optItem);
  renderProd(); drawJoint(); drawPanel();
  if (cur === "view3d") views.buildWall(+$("sel3").value || 0);
  if (cur === "table") views.table.build();
  saveDraft();
}
function fillSelect(id, opts) {
  const s = $(id), k = s.value;
  s.innerHTML = opts.map(([v, t]) => `<option value="${v}">${t}</option>`).join("");
  if (k && opts.some(([v]) => v === k)) s.value = k;
}
function renderProd() {
  const st = STATE, tn = +$("tn").value || 1, cy = +$("cy").value || 1;
  $("prod").querySelector("tbody").innerHTML = st.list.map((i) => {
    const per = i.tf.R * i.tf.n, pd = per * tn * cy, days = per ? Math.ceil(i.qty / pd) : "-";
    return `<tr><td class="code">${i.code}</td><td>${fmt(i.qty)}</td><td>${per ? `${per} (${i.tf.R}×${i.tf.n})` : "วางไม่ได้"}</td><td>${per ? fmt(pd) : "-"}</td><td>${days}</td><td>${fmt(i.P.wt)}</td></tr>`;
  }).join("");
  $("mat").querySelector("tbody").innerHTML = st.list.map((i) => {
    const P = i.P, S = st.S;
    return `<tr><td class="code">${i.code}</td><td>${P.nv}-${NM(S.dv)} ยาว ${f2(P.lv)}</td><td>${P.nh}-${NM(S.dh)} ยาว ${f2(P.lh)}</td><td>${P.kg.toFixed(1)}</td><td>${P.vol.toFixed(3)}</td><td>${S.pd && P.pipe.P.length ? P.pipe.P.length + " ท่อน Ø" + PN[S.pd] + " ยาว " + f2(P.T) : "-"}</td></tr>`;
  }).join("");
}
function drawJoint() {
  const gr = STATE.groups[+$("sel3").value || 0], j = jointSvg(STATE, gr);
  $("sJ").outerHTML = j.svg ? j.svg.replace("<svg ", '<svg id="sJ" ') : '<svg id="sJ" viewBox="0 0 680 20"></svg>';
  $("jNote").textContent = j.note;
  $("n3").innerHTML = remark3d(STATE, gr);
}
function drawPanel() {
  const st = STATE, it = st.list.find((i) => i.code === $("selD").value) || st.list[0];
  $("dwg").innerHTML = it ? panelSheet(it, st, $("cu").value.trim()) : '<p class="hint">ยังไม่มีรายการแผ่น</p>';
}

let tmr; function sched() { clearTimeout(tmr); tmr = setTimeout(run, 220); }

// ---------------- แท็บ ----------------
function show(name) {
  if (!PANES.includes(name)) name = "view3d";
  cur = name;
  PANES.forEach((n) => { $("p-" + n).hidden = n !== name; $("t-" + n).setAttribute("aria-selected", n === name ? "true" : "false"); });
  if (name === "view3d" && STATE) views.buildWall(+$("sel3").value || 0);
  if (name === "table" && STATE) { views.table.refresh(); views.table.build(); }
}
document.querySelectorAll("nav.tabs button").forEach((b) => (b.onclick = () => { show(b.dataset.p); try { if (!location.hash.startsWith("#p-")) history.replaceState(null, "", "#" + b.dataset.p); } catch (e) {} }));
window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (PANES.includes(h)) show(h); else if (/^p-[a-z0-9]+$/.test(h)) loadProject(h); });

// ---------------- เก็บ/โหลดข้อมูลฟอร์ม (JSON) ----------------
const FIELDS = ["rf", "pj", "cu", "sa", "pt", "wh", "gp", "dv", "sv", "dh", "sh", "pd", "pr", "pc", "nt", "tn", "cy", "tk", "lm", "cmx", "lmt"];
function collect() {
  const o = { stackSel, spans: spans.map((s) => ({ ...s })), md: radio("md"), sm: radio("sm"), om: radio("om"), rows: orderRows.map((r) => ({ ...r })) };
  FIELDS.forEach((k) => { o[k] = $(k).value; });
  o.wh = +o.wh; // บันทึกค่าที่เป็นความยาวเล็กๆ เป็นมม. เสมอ (ช่องกรอกเป็นเมตร)
  ['gp', 'sv', 'sh'].forEach((k) => { o[k] = Math.round(+o[k] * 1000); });
  o.ga = orderAllowance;
  return o;
}
function apply(d) {
  if (!d) return;
  (d.sm === "man" ? $("smM") : $("smL")).checked = true;
  (d.om === "direct" ? $("omD") : $("omW")).checked = true;
  if (Array.isArray(d.rows) && d.rows.length) orderRows = d.rows.map((r) => ({ WT: +r.WT || 1370, H: +r.H || 1000, qty: +r.qty || 1 }));
  orderAllowance = +d.ga > 0 ? +d.ga : 20;
  FIELDS.forEach((k) => { if (d[k] !== undefined && $(k)) $(k).value = d[k]; });
  if (Array.isArray(d.spans) && d.spans.length) spans = d.spans.map((s) => ({ cc: +s.cc || 1500, n: +s.n || 1 }));
  ["gp", "sv", "sh"].forEach((k) => { if (d[k] !== undefined) { const v = +d[k]; $(k).value = (v >= 1 ? v / 1000 : v).toFixed(3); } });
  stackSel = +d.stackSel || 0;
  (d.md === "sp" ? $("mdP") : $("mdS")).checked = true;
  renderSpans(); renderRows(); run();
}
function saveDraft() { try { localStorage.setItem("wp-draft", JSON.stringify(collect())); } catch (e) {} }
function loadDraft() { try { const d = JSON.parse(localStorage.getItem("wp-draft") || "null"); if (d) apply(d); } catch (e) {} }

const msg = (t) => { $("saveMsg").textContent = t; };
async function refreshList() {
  try {
    const rows = await listProjects(15);
    $("plist").innerHTML = rows.map((r) => `<button type="button" data-id="${esc(r.id)}">${esc(r.name || "ไม่มีชื่อโครงการ")} <span style="color:var(--faint)">• ${esc(r.customer || "")} • ${new Date(r.updated_at || 0).toLocaleDateString("th-TH")}</span></button>`).join("");
    $("plist").querySelectorAll("button").forEach((b) => (b.onclick = () => { location.hash = "#" + b.dataset.id; }));
  } catch (e) { $("plist").innerHTML = ""; }
}
async function loadProject(id) {
  try {
    const row = await getProject(id);
    if (!row) { msg("ไม่พบโครงการนี้"); return; }
    apply(row.data); curId = id; msg("เปิดโครงการแล้ว");
  } catch (e) { msg("เปิดโครงการไม่ได้ ลองใหม่อีกครั้ง"); }
}
$("bSave").onclick = async () => {
  if (!editable) { msg("บัญชีนี้ดูได้อย่างเดียว บันทึกไม่ได้"); return; }
  if (!$("pj").value.trim()) { msg("ใส่ชื่อโครงการก่อนบันทึก"); $("pj").focus(); return; }
  try {
    curId = await saveProject({ id: curId, form: collect(), user });
    try { history.replaceState(null, "", "#" + curId); } catch (e) {}
    msg("บันทึกแล้ว • ส่งลิงก์หน้านี้ให้ทีมเปิดดูได้"); refreshList();
  } catch (e) { msg("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง"); }
};
$("bNew").onclick = () => {
  curId = null; try { history.replaceState(null, "", "#view3d"); } catch (e) {}
  $("pj").value = ""; $("cu").value = ""; spans = [{ cc: 1500, n: 10 }]; orderRows = [{ WT: 1370, H: 1000, qty: 10 }]; $("rf").value = ""; $("omW").checked = true; renderSpans(); renderRows(); run(); msg("เริ่มโครงการใหม่แล้ว");
};
$("bAdd").onclick = () => {
  if (!editable) { msg("บัญชีนี้ดูได้อย่างเดียว"); return; }
  if (!STATE || !STATE.list.length) { msg("ยังไม่มีรายการแผ่นให้คัดลอก"); return; }
  const base = $("pj").value.trim() || "โครงการ";
  // เอารายการแผ่นของโครงการเดิมมาเป็นแถวตั้งต้น ให้แก้จำนวนที่ต้องสั่งเพิ่ม
  orderRows = STATE.list.map((i) => ({ WT: i.WT, H: i.H, qty: i.qty }));
  orderAllowance = STATE.direct ? STATE.g : Math.round(+$("gp").value * 1000); // ใช้ค่าเผื่อเดียวกับโครงการเดิม
  $("omD").checked = true; $("rf").value = "สั่งเพิ่มจากโครงการ " + base;
  $("pj").value = base.replace(/ (สั่งเพิ่ม)$/, "") + " (สั่งเพิ่ม)";
  curId = null; try { history.replaceState(null, "", "#drawing"); } catch (e) {}
  renderRows(); run(); msg("คัดลอกเป็นใบสั่งเพิ่มแล้ว • แก้จำนวนแผ่นแล้วกดบันทึกโครงการ (จะบันทึกเป็นโครงการใหม่)");
};
$("bDl").onclick = () => {
  if (!STATE || !STATE.list.length) { msg("ยังไม่มีรายการแผ่นให้สรุป"); return; }
  downloadSummary(STATE, collect(), +$("tk").value || DEFAULT_TRUCK_KG); msg("ดาวน์โหลดใบสรุปแล้ว • เปิดไฟล์แล้วสั่งพิมพ์เป็น PDF ได้");
};
$("bPdf").onclick = async () => {
  if (!STATE || !STATE.list.length) { msg("ยังไม่มีรายการแผ่นให้ส่งออก"); return; }
  const btn = $("bPdf"); btn.disabled = true; msg("กำลังสร้าง PDF…");
  try {
    await makePdf({ st: STATE, d: collect(), $, views, onStatus: msg });
    msg("ดาวน์โหลด PDF แล้ว • หน้าแรกสรุปโครงการ หน้าถัดไปเป็นแบบแผ่นทุกรหัส");
  } catch (e) { msg(e && e.message ? e.message : "สร้าง PDF ไม่สำเร็จ ลองใหม่อีกครั้ง"); }
  finally { btn.disabled = false; views.buildWall(+$("sel3").value || 0); }
};

// ---------------- เริ่มทำงาน ----------------
function wire() {
  views = createViews({ $, getState: () => STATE });
  $("sel3").onchange = () => { drawJoint(); views.buildWall(+$("sel3").value || 0); };
  $("selD").onchange = drawPanel;
  FIELDS.forEach((id) => { $(id).addEventListener("input", sched); $(id).addEventListener("change", sched); });
  document.querySelectorAll('input[name="md"],input[name="sm"],input[name="om"]').forEach((x) => x.addEventListener("change", run));
}

function enter(u) {
  user = u;
  if (!canUse(u)) { $("app").hidden = true; $("deny").hidden = false; return; }
  $("deny").hidden = true; $("app").hidden = false;
  editable = canEdit(u);
  $("uName").textContent = u.name; $("roTag").hidden = editable;
  $("bSave").disabled = !editable;
  renderSpans(); renderRows(); loadDraft(); run();
  const h0 = location.hash.slice(1);
  show(PANES.includes(h0) ? h0 : "view3d");
  refreshList();
  if (/^p-[a-z0-9]+$/.test(h0)) loadProject(h0);
}
function boot() {
  wire();
  const out = () => { logout(); location.reload(); };
  $("bOut").onclick = out; $("bDenyOut").onclick = out;
  const s = getSession();
  if (s) { enter(s); syncSession(s).then((fresh) => { if (fresh !== s && JSON.stringify(fresh) !== JSON.stringify(s)) { user = fresh; editable = canEdit(fresh); $("roTag").hidden = editable; $("bSave").disabled = !editable; if (!canUse(fresh)) enter(fresh); } }); }
  else showLogin($("login"), enter);
}
boot();
