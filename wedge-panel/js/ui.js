// หน้าจอ: ฟอร์ม ผลคำนวณ แท็บ บันทึกโครงการ ส่งออก — ตรรกะคำนวณอยู่ใน calc.js ทั้งหมด
import { STD, HS, MAX_STACK } from "./standards.js?v=20261105020709";
import {
  calcProject, calcDirect, allocateTables, productionPlan, nf, splitSpans, stackOptions, suggestHeights, STDH, standardSpec, fmt, f2, f3,
} from "./calc.js?v=20261105020709";
import { barName as NM, PIPE_NAME as PN, DEFAULT_TRUCK_KG } from "./standards.js?v=20261105020709";
import { panelSheet, jointSvg, remark3d, shoulderRemark, esc } from "./draw2d.js?v=20261105020709";
import { createViews } from "./view3d.js?v=20261105020709";
import { initPile } from "./pile-ui.js?v=20261105020709";
import { makePdf } from "./pdf.js?v=20261105020709";
import { getSession, showLogin, logout, canUse, canEdit, syncSession } from "./auth.js?v=20261105020709";
import { listProjects, getProject, saveProject, deleteProject } from "./db.js?v=20261105020709";

const $ = (id) => document.getElementById(id);
// ช่องจำนวนเต็มที่แสดงลูกน้ำคั่นหลักพัน (class "thou"): โฟกัส = ตัดลูกน้ำให้แก้ง่าย ออกจากช่อง = ใส่ลูกน้ำ
const toInt = (v) => Math.floor(Number(String(v).replace(/,/g, "")) || 0);
document.addEventListener("focusin", (e) => { const t = e.target; if (t.matches && t.matches("input.thou")) t.value = t.value.replace(/,/g, ""); });
document.addEventListener("focusout", (e) => { const t = e.target; if (t.matches && t.matches("input.thou") && t.value !== "") t.value = toInt(t.value).toLocaleString("th-TH"); });
let STATE = null, spans = [{ cc: 0, n: 0 }], stackSel = 0, curId = null, user = null, editable = false;
let orderRows = [{ WT: 0, H: 0, qty: 0 }];
let listRows = []; // รายการโครงการที่โหลดมา
let orderAllowance = 20; // มม. ค่าเผื่อทำงานข้างละ (มาตรฐาน 20) ไม่มีช่องให้แก้ ใช้คำนวณระยะกลาง/กลางเสาในหมายเหตุ
let views = null, cur = "view3d";
const PANES = ["view3d", "drawing", "production", "table"];

// ---------------- ช่วงเสา (กรอกเอง) ----------------
function renderSpans() {
  const box = $("spans"); box.innerHTML = "";
  spans.forEach((s, i) => {
    const d = document.createElement("div"); d.className = "sr";
    d.innerHTML = `<div><label>ระยะ กลาง/กลางเสา (ม.)</label><input type="number" step="0.01" min="0.6" max="6" value="${s.cc ? (s.cc / 1000).toFixed(2) : ""}"></div><div><label>จำนวนช่วง</label><input type="number" step="1" min="1" value="${s.n || ""}"></div><button type="button" class="iconbtn" aria-label="ลบช่วงนี้">✕</button>`;
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
    d.innerHTML = `<div class="orow"><div><label>กว้างรวม (ม.)</label><input type="number" step="0.01" min="0.1" value="${r.WT ? (r.WT / 1000).toFixed(2) : ""}"></div><div><label>สูง (ม.)</label><select><option value="" ${r.H ? "" : "selected"}>เลือก</option>${HS.map((h) => `<option value="${h}" ${h === r.H ? "selected" : ""}>${(h / 1000).toFixed(2)}</option>`).join("")}</select></div><div><label>จำนวน (แผ่น)</label><input class="thou" type="text" inputmode="numeric" value="${r.qty ? r.qty.toLocaleString("th-TH") : ""}"></div><button type="button" class="iconbtn" aria-label="ลบรายการนี้">✕</button></div><div class="orow2"><label>ซ้อนกันกี่แผ่น (1 = ไม่ซ้อน)</label><input type="number" class="stk" min="1" max="${MAX_STACK}" step="1" value="${r.st || 1}"></div>`;
    const [w, q, sk] = d.querySelectorAll("input"), h = d.querySelector("select");
    sk.oninput = () => { r.st = Math.min(MAX_STACK, Math.max(1, Math.floor(+sk.value) || 1)); sched(); };
    w.oninput = () => { r.WT = Math.round(+w.value * 1000); sched(); };
    h.onchange = () => { r.H = +h.value || 0; run(); };
    q.oninput = () => { r.qty = toInt(q.value); sched(); };
    d.querySelector("button").onclick = () => { if (orderRows.length > 1) { orderRows.splice(i, 1); renderRows(); run(); } };
    box.appendChild(d);
  });
}
$("addRow").onclick = () => { const l = orderRows[orderRows.length - 1] || { H: 0 }; orderRows.push({ WT: 0, H: l.H, qty: 0 }); renderRows(); run(); };
// แสดง/ซ่อนส่วนของแต่ละโหมด
function applyModeUi(direct) {
  $("wallBox").hidden = direct; $("spanFs").hidden = direct; $("rowsFs").hidden = !direct;
  $("lgPile").textContent = direct ? "หน้าตัดเสาเข็มไอ" : "เสาเข็มและความสูงกำแพง";
  $("omHint").textContent = direct ? "ใส่ความกว้างรวม ความสูงมาตรฐาน และจำนวนแผ่นเอง เหมาะกับสั่งขาดหรือสั่งเพิ่ม" : "ใส่ความยาวกำแพงและระยะเสา ระบบคำนวณความกว้างและจำนวนแผ่นให้";
}
$("addSpan").onclick = () => { spans.push({ cc: spans[spans.length - 1].cc, n: 0 }); renderSpans(); run(); };

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
// ข้อความความสูงของกลุ่มในโหมดสั่งตามจำนวนแผ่น: แผ่นเดียว = "สูง 1.00 ม." / ซ้อน = "ซ้อน 2 แผ่น สูงรวม 2.00 ม."
const stkTxt = (gr) => (gr.stk.length > 1 ? `ซ้อน ${gr.stk.length} แผ่น สูงรวม ${f2(gr.stk.reduce((a, b) => a + b, 0))} ม.` : `สูง ${f2(gr.stk[0])} ม.`);
function drawStackVis(a) {
  const v = $("stkVis");
  if (!a) { v.innerHTML = ""; return; }
  const tot = a.reduce((p, q) => p + q, 0), k = Math.min(0.04, 100 / tot);
  v.innerHTML = `<small>กำแพงที่เลือก</small><b>${(tot / 1000).toFixed(2)}</b><div class="col" role="img" aria-label="ซ้อนแผ่น ${a.map((h) => (h / 1000).toFixed(2)).join(" + ")} เมตร">${a.map((h) => `<i style="height:${Math.max(15, h * k)}px">${(h / 1000).toFixed(2)}</i>`).join("")}</div>`;
}
function renderStack() {
  const Ht = Math.round(+$("wh").value * 1000);
  $("whE").textContent = ""; $("whSug").innerHTML = ""; renderStdChips(Ht); $("stkVis").innerHTML = "";
  const box = $("stk"); box.innerHTML = "";
  if ($("wh").value === "") return [];
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
  if (radio("sm") !== "len") return spans.filter((s) => s.cc && s.n); // แถวที่ยังกรอกไม่ครบไม่นำไปคำนวณ (ไม่ขึ้นเตือนแดง)
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
  syncShoulder();
  const S = spec();
  $("stdBox").hidden = S.sp; $("spBox").hidden = !S.sp;
  const truck = toInt($("tk").value) || DEFAULT_TRUCK_KG;
  let r;
  if (direct) {
    if (!$("pt").value || !orderRows.some((x) => x.WT > 0 && x.qty >= 1 && HS.includes(x.H))) return showEmpty();
    r = calcDirect({ pile: $("pt").value, allowance: orderAllowance, rows: orderRows.filter((r) => r.WT || r.qty).map((r) => ({ WT: r.WT, H: r.H, qty: r.qty, st: r.st || 1 })), spec: S, truckKg: truck });
    r.ref = $("rf").value.trim();
  } else {
    const op = renderStack();
    const lenMode = radio("sm") === "len";
    $("lenBox").hidden = !lenMode; $("manBox").hidden = lenMode;
    const spanAl = [];
    const sp = currentSpans(spanAl);
    const stk = op[stackSel] ? [...op[stackSel]] : [];
    if (!$("pt").value || !stk.length || !sp.some((x) => x.cc >= 600 && x.n >= 1)) return showEmpty();
    r = calcProject({ pile: $("pt").value, allowance: Math.round(+$("gp").value * 1000), spans: sp, stack: stk, spec: S, truckKg: truck });
    r.al = [...r.al.filter((a) => a[1].startsWith("งานสั่งพิเศษ")), ...spanAl, ...r.al.filter((a) => !a[1].startsWith("งานสั่งพิเศษ"))];
  }
  STATE = r;
  $("results").hidden = false; $("emptyMsg").hidden = true; setActions(true);
  const { p, G, list, nPile, nSpan, wLen, totQ, totV, totS, totW, trips } = r;
  $("cards").innerHTML = `<div class="card"><div class="k">หัวลิ่ม</div><div class="v">แบบ ${p.ty}</div><div class="s">${G.d} • ${p.n}</div></div>
${direct ? `<div class="card"><div class="k">วิธีสั่ง</div><div class="v">ตามจำนวนแผ่น</div><div class="s">${esc(r.ref || "ไม่มีข้อมูลระยะเสา")}</div></div>` : `<div class="card"><div class="k">เสาเข็มไอ</div><div class="v">${fmt(nPile)} ต้น</div><div class="s">${fmt(nSpan)} ช่วง • กำแพงยาว ${nf(wLen / 1000, 2)} ม.</div></div>`}
<div class="card"><div class="k">แผ่นทั้งโครงการ</div><div class="v">${fmt(totQ)} แผ่น</div><div class="s">${list.length} รหัส • <span class="stamp ${S.sp ? "sp" : "std"}">${S.sp ? "สั่งพิเศษ" : "มาตรฐานบริษัท"}</span></div></div>
<div class="card"><div class="k">น้ำหนักขนส่ง</div><div class="v">${nf(totW / 1000, 1)} ตัน</div><div class="s">รถ ${fmt(truck)} กก. ≈ ${trips} เที่ยว</div></div>`;
  $("alerts").innerHTML = r.al.map((a) => `<div class="al ${a[0]}">${esc(a[1])}</div>`).join("");
  $("sched").querySelector("tbody").innerHTML = list.map((i) => `<tr><td class="code">${i.code}</td><td style="text-align:left">${i.name}</td><td>${f2(i.H)}</td><td>${f2(i.WT)}</td><td>${[...i.cc].map(f2).join(", ") || "-"}</td><td>${fmt(i.qty)}</td><td>${fmt(i.P.wt)}</td><td>${i.P.vol.toFixed(3)}</td><td>${i.P.kg.toFixed(1)}</td></tr>`).join("") || `<tr><td colspan="9">ใส่ระยะเสาและความสูงกำแพงเพื่อดูรายการแผ่น</td></tr>`;
  fillSelect("sel3", r.groups.map((gr, i) => [String(i), gr.stk ? `กลาง/กลางเสา ${f2(gr.cc)} ม. • กว้างแผ่น ${f2(gr.F.WT)} ม. • ${stkTxt(gr)} • ${fmt(gr.n)} แผ่น` : `กลาง/กลางเสา ${f2(gr.cc)} ม. • กว้างแผ่น ${f2(gr.F.WT)} ม. • ${fmt(gr.n)} ช่วง`]));
  const optItem = list.map((i) => [i.code, `${i.code} • สูง ${(i.H / 1000).toFixed(2)} × กว้าง ${f2(i.WT)}`]);
  fillSelect("selD", optItem); fillSelect("selT", optItem);
  renderProd(); drawJoint(); drawPanel();
  if (cur === "view3d") views.buildWall(+$("sel3").value || 0);
  if (cur === "table") views.table.build();
  saveDraft();
}
// ยังใส่ข้อมูลไม่ครบ: ซ่อนแบบและผลคำนวณ แสดงข้อความรอ และปิดปุ่มที่ต้องมีแบบ
function showEmpty() {
  STATE = null;
  $("results").hidden = true; $("emptyMsg").hidden = false; setActions(false);
  saveDraft();
}
function setActions(on) {
  $("bSave").disabled = !(on && editable);
  ["bPdf", "bPdfC", "bAdd"].forEach((id) => { $(id).disabled = !on; });
}
function fillSelect(id, opts) {
  const s = $(id), k = s.value;
  s.innerHTML = opts.map(([v, t]) => `<option value="${v}">${t}</option>`).join("");
  if (k && opts.some(([v]) => v === k)) s.value = k;
}
// จำนวนโต๊ะต่อรหัสที่ผู้ใช้กำหนดเอง (ว่าง = ให้ระบบจัดให้) — เก็บในโครงการด้วย
let tableAlloc = null;
function renderProd() {
  const st = STATE, tn = Math.max(1, Math.floor(+$("tn").value) || 1);
  const auto = allocateTables(st.list, tn);
  const alloc = {};
  st.list.forEach((i) => { const v = tableAlloc && tableAlloc[i.code]; alloc[i.code] = Number.isInteger(v) && v >= 0 ? v : auto[i.code]; });
  let used = 0;
  const warn = [];
  $("prod").querySelector("tbody").innerHTML = st.list.map((i) => {
    const t = alloc[i.code], pl = productionPlan(i, t), per = pl.per;
    used += t;
    if (!per) warn.push("รหัส " + i.code + " วางบนโต๊ะไม่ได้");
    else if (!t) warn.push("รหัส " + i.code + " ยังไม่ได้จัดโต๊ะ");
    return `<tr><td class="code">${i.code}</td><td>${fmt(i.qty)}</td><td>${per ? `${fmt(per)} แผ่น` : "วางไม่ได้"}</td><td>${per ? fmt(t) : "-"}</td><td>${per && t ? fmt(pl.perDay) : "-"}</td><td>${pl.days || "-"}</td><td>${fmt(i.P.wt)}</td></tr>`;
  }).join("");
  if (used > tn) warn.push("จัดโต๊ะรวม " + fmt(used) + " โต๊ะ เกินจำนวนโต๊ะที่มี (" + fmt(tn) + " โต๊ะ)");
  $("prodWarn").innerHTML = warn.map((w) => '<div class="al w">' + esc(w) + "</div>").join("");
  // ช่องกรอกจำนวนโต๊ะต่อรหัส อยู่ในฟอร์ม (หน้ากรอก) — ตารางผลิตฝั่งผลลัพธ์แสดงเป็นตัวเลขเท่านั้น
  $("allocBox").hidden = !st.list.length;
  $("allocRows").innerHTML = st.list.map((i) => {
    const per = i.tf.R * i.tf.n;
    return `<div class="arow"><span class="code">${i.code}</span><small>${per ? "1 โต๊ะ = " + fmt(per) + " แผ่น/วัน" : "วางไม่ได้"}</small><input type="number" class="tbA" data-code="${esc(i.code)}" min="0" max="99" value="${alloc[i.code]}" ${per ? "" : "disabled"} aria-label="จำนวนโต๊ะ ${esc(i.code)}"><span>โต๊ะ</span></div>`;
  }).join("");
  $("allocRows").querySelectorAll(".tbA").forEach((x) => (x.onchange = () => {
    tableAlloc = {}; $("allocRows").querySelectorAll(".tbA").forEach((y) => { tableAlloc[y.dataset.code] = Math.max(0, Math.floor(+y.value) || 0); });
    renderProd(); saveDraft();
  }));
  $("bAuto").onclick = () => { tableAlloc = null; renderProd(); saveDraft(); };
  $("mat").querySelector("tbody").innerHTML = st.list.map((i) => {
    const P = i.P, S = st.S;
    return `<tr><td class="code">${i.code}</td><td>${P.nv}-${NM(S.dv)} ยาว ${f2(P.lv)}</td><td>${P.kv.toFixed(2)}</td><td>${P.nh}-${NM(S.dh)} ยาว ${f2(P.lh)}</td><td>${P.kh.toFixed(2)}</td><td>${P.kg.toFixed(2)}</td><td>${P.vol.toFixed(3)}</td><td>${S.pd && P.pipe.P.length ? P.pipe.P.length + " ท่อน Ø" + PN[S.pd] + " ยาว " + f2(P.T) : "-"}</td></tr>`;
  }).join("");
  // สรุปวัสดุทั้งโครงการ แยกชนิดเหล็ก (ใช้ภายใน คิดราคา)
  const m = st.mat, S2 = st.S;
  const rows = [];
  m.bars.forEach((b) => {
    const ls = m.lines.filter((l) => l.d === b.d);
    ls.forEach((l) => rows.push(`<tr><td style="text-align:left">เหล็ก ${NM(l.d)}</td><td>${f2(l.each)}</td><td>${fmt(l.n)} เส้น</td><td>${nf(l.len, 2)}</td><td>${nf(l.kg, 1)} กก.</td></tr>`));
    if (ls.length > 1) rows.push(`<tr><td style="text-align:left"><i>รวมเหล็ก ${NM(b.d)}</i></td><td>-</td><td><i>${fmt(b.n)} เส้น</i></td><td><i>${nf(b.len, 2)}</i></td><td><i>${nf(b.kg, 1)} กก.</i></td></tr>`);
  });
  rows.push(`<tr><td style="text-align:left"><b>เหล็กรวม</b></td><td>-</td><td>-</td><td>-</td><td><b>${nf(st.totS, 1)} กก.</b></td></tr>`);
  rows.push(`<tr><td style="text-align:left">คอนกรีต</td><td>-</td><td>-</td><td>-</td><td>${nf(st.totV, 2)} ลบ.ม.</td></tr>`);
  if (S2.pd && m.pipeCount) rows.push(`<tr><td style="text-align:left">ท่อ PVC Ø${PN[S2.pd]}</td><td>${f2(m.pipeEach)}</td><td>${fmt(m.pipeCount)} ท่อน</td><td>${nf(m.pipeLen, 2)}</td><td>-</td></tr>`);
  $("matTot").querySelector("tbody").innerHTML = st.list.length ? rows.join("") : "";
}
function drawJoint() {
  const gr = STATE.groups[+$("sel3").value || 0], j = jointSvg(STATE, gr);
  $("sJ").outerHTML = j.svg ? j.svg.replace("<svg ", '<svg id="sJ" ') : '<svg id="sJ" viewBox="0 0 680 20"></svg>';
  updateNote3d();
}
function drawPanel() {
  const st = STATE, it = st.list.find((i) => i.code === $("selD").value) || st.list[0];
  $("dwg").innerHTML = it ? panelSheet(it, st, $("cu").value.trim()) : '<p class="hint">ยังไม่มีรายการแผ่น</p>';
}

// บ่ารองรับแผ่น (ภาพ 3 มิติ): เปิด/ปิด + ด้านบนแผ่นเสมอหัวเข็ม หรือ ลงมาจากหัวเข็ม ___ ม.
function syncShoulder() {
  const on = $("shOn").checked, drop = on && $("shMode").value === "drop";
  $("shMode").hidden = !on; $("shDrop").hidden = !drop; $("shDropU").hidden = !drop;
  views.setShoulder(on, drop ? Math.max(0, Math.round((+$("shDrop").value || 0) * 1000)) : 0);
}
function updateNote3d() {
  const gr = STATE.groups[+$("sel3").value || 0];
  $("n3").innerHTML = remark3d(STATE, gr) + shoulderRemark(STATE, gr, collect());
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
const FIELDS = ["rf", "pj", "cu", "sa", "pt", "wh", "gp", "dv", "sv", "dh", "sh", "pd", "pr", "pc", "nt", "tn", "tk", "lm", "cmx", "lmt"];
function collect() {
  const o = { stackSel, spans: spans.map((s) => ({ ...s })), md: radio("md"), sm: radio("sm"), om: radio("om"), rows: orderRows.map((r) => ({ ...r })), shOn: $("shOn").checked ? 1 : 0, shMode: $("shMode").value, shDrop: Math.round((+$("shDrop").value || 0) * 1000) };
  FIELDS.forEach((k) => { o[k] = $(k).value; });
  o.tk = toInt(o.tk);
  o.wh = +o.wh; // บันทึกค่าที่เป็นความยาวเล็กๆ เป็นมม. เสมอ (ช่องกรอกเป็นเมตร)
  ['gp', 'sv', 'sh'].forEach((k) => { o[k] = Math.round(+o[k] * 1000); });
  o.ga = orderAllowance;
  o.ta = tableAlloc ? { ...tableAlloc } : null;
  return o;
}
function apply(d) {
  if (!d) return;
  (d.sm === "man" ? $("smM") : $("smL")).checked = true;
  (d.om === "direct" ? $("omD") : $("omW")).checked = true;
  $("shOn").checked = !!d.shOn; if (d.shMode) $("shMode").value = d.shMode; if (d.shDrop !== undefined) $("shDrop").value = (+d.shDrop / 1000).toFixed(2);
  if (Array.isArray(d.rows) && d.rows.length) orderRows = d.rows.map((r) => ({ WT: +r.WT || 0, H: HS.includes(+r.H) ? +r.H : 0, qty: +r.qty || 0, st: Math.min(MAX_STACK, Math.max(1, Math.floor(+r.st) || 1)) }));
  orderAllowance = +d.ga > 0 ? +d.ga : 20;
  tableAlloc = d.ta && typeof d.ta === "object" ? { ...d.ta } : null;
  FIELDS.forEach((k) => { if (d[k] !== undefined && $(k)) $(k).value = d[k]; });
  if (Array.isArray(d.spans) && d.spans.length) spans = d.spans.map((s) => ({ cc: +s.cc || 0, n: +s.n || 0 }));
  ["gp", "sv", "sh"].forEach((k) => { if (d[k] !== undefined) { const v = +d[k]; $(k).value = (v >= 1 ? v / 1000 : v).toFixed(3); } });
  if (!+d.wh) $("wh").value = "";
  if (d.tk !== undefined) $("tk").value = (toInt(d.tk) || DEFAULT_TRUCK_KG).toLocaleString("th-TH");
  stackSel = +d.stackSel || 0;
  (d.md === "sp" ? $("mdP") : $("mdS")).checked = true;
  renderSpans(); renderRows(); run();
}
// ร่างในเครื่องจำด้วยว่าเป็นโครงการที่บันทึกไว้แล้วไหม (_id) และสถานะ ณ ตอนบันทึกล่าสุด (_saved) เพื่อไม่ให้กู้ร่างแล้วกลายเป็นโครงการใหม่ซ้ำ
function saveDraft() { try { localStorage.setItem("wp-draft", JSON.stringify({ ...collect(), _id: curId, _saved: lastSaved })); } catch (e) {} }
function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem("wp-draft") || "null");
    if (!d) return;
    apply(d);
    if (d._id) {
      curId = d._id; lastSaved = d._saved ?? null; msg(""); saveDraft();
      // โครงการถูกลบไปแล้ว (เช่นลบจากเครื่องอื่น) ให้ถือเป็นโครงการใหม่ที่ยังไม่บันทึก
      getProject(d._id).then((row) => { if (!row) { curId = null; lastSaved = null; msg(""); saveDraft(); } }).catch(() => {});
    }
  } catch (e) {}
}

const msg = (t) => { $("saveMsg").textContent = t; $("bLink").hidden = !curId; renderList(); $("bSave").textContent = curId ? "บันทึกการแก้ไข" : "บันทึกโครงการ"; };
// วาดรายการโครงการ: แถวที่เปิดอยู่ไฮไลต์ และมีไอคอนถังขยะ (เฉพาะผู้ที่แก้ไขได้) กดแล้วต้องยืนยันก่อนลบ
const TRASH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/><path d="M10 11v6M14 11v6"/></svg>';
function renderList() {
  $("plist").innerHTML = listRows.map((r) => {
    const cur = r.id === curId;
    return '<div class="prow' + (cur ? " cur" : "") + '"><button type="button" class="pbtn" data-id="' + esc(r.id) + '">' + esc(r.name || "ไม่มีชื่อโครงการ") + ' <span style="color:var(--faint)">• ' + esc(r.customer || "") + " • " + new Date(r.updated_at || 0).toLocaleDateString("th-TH") + "</span></button>" +
      (cur && editable ? '<button type="button" class="ptrash" title="ลบโครงการนี้" aria-label="ลบโครงการนี้">' + TRASH_SVG + "</button>" : "") + "</div>";
  }).join("");
  $("plist").querySelectorAll(".pbtn").forEach((b) => (b.onclick = async () => { if (!(await guardUnsaved())) return; location.hash = "#" + b.dataset.id; }));
  const t = $("plist").querySelector(".ptrash"); if (t) t.onclick = deleteCurrent;
}
async function refreshList() {
  try { listRows = await listProjects(15); } catch (e) { listRows = []; }
  renderList();
}
async function loadProject(id) {
  try {
    const row = await getProject(id);
    if (!row) { msg("ไม่พบโครงการนี้"); return; }
    apply(row.data); curId = id; lastSaved = snapshot(); saveDraft(); msg("เปิดโครงการแล้ว");
  } catch (e) { msg("เปิดโครงการไม่ได้ ลองใหม่อีกครั้ง"); }
}
async function saveCurrent() {
  if (!editable) { msg("บัญชีนี้ดูได้อย่างเดียว บันทึกไม่ได้"); return false; }
  if (!$("pj").value.trim()) { msg("ใส่ชื่อโครงการก่อนบันทึก"); $("pj").focus(); return false; }
  const wasNew = !curId;
  try {
    curId = await saveProject({ id: curId, form: collect(), user });
    try { history.replaceState(null, "", "#" + curId); } catch (e) {}
    lastSaved = snapshot(); saveDraft();
    msg(wasNew ? "บันทึกแล้ว • กด \"คัดลอกลิงก์โครงการ\" เพื่อส่งให้ทีมเปิดดู (ต้องล็อกอินก่อน)" : "บันทึกการแก้ไขแล้ว");
    refreshList();
    return true;
  } catch (e) { msg("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง"); return false; }
}
$("bSave").onclick = saveCurrent;
async function deleteCurrent() {
  if (!curId || !editable) return;
  const name = $("pj").value.trim() || "(ไม่มีชื่อ)";
  if (!window.confirm('ลบโครงการ "' + name + '" ออกจากระบบถาวรใช่ไหม?\n\nลบแล้วกู้คืนไม่ได้ และคนที่เปิดลิงก์โครงการนี้จะเปิดไม่ได้อีก')) return;
  try {
    await deleteProject(curId);
    resetAll(); // ล้างหน้าจอกลับเป็นโครงการเปล่า
    msg('ลบโครงการ "' + name + '" แล้ว'); refreshList();
  } catch (e) { msg("ลบไม่สำเร็จ ลองใหม่อีกครั้ง"); }
}
$("bLink").onclick = async () => {
  if (!curId) return;
  const url = location.origin + location.pathname + "#" + curId;
  try { await navigator.clipboard.writeText(url); msg("คัดลอกลิงก์โครงการแล้ว • ส่งให้ทีมเปิดดูได้ (ต้องล็อกอินก่อน)"); }
  catch (e) { window.prompt("คัดลอกลิงก์นี้", url); }
};
// เริ่มโครงการใหม่: ล้างทุกช่อง (เก็บชื่อผู้ขายไว้) ช่องเสาเข็มกลับเป็นว่าง และไม่แสดงแบบจนกว่าจะเลือกและใส่ขนาด
const snapshot = () => JSON.stringify(collect());
let lastSaved = null; // snapshot ล่าสุดที่บันทึก/เปิด/เริ่มใหม่ ใช้ถามยืนยันเมื่อมีงานค้าง
const isDirty = () => ($("pj").value.trim() || $("pt").value) && snapshot() !== lastSaved;
function resetAll() {
  const seller = $("sa").value;
  $("f").reset(); $("sa").value = seller;
  spans = [{ cc: 0, n: 0 }]; orderRows = [{ WT: 0, H: 0, qty: 0 }];
  stackSel = 0; curId = null; orderAllowance = 20;
  try { localStorage.removeItem("wp-draft"); } catch (e) {}
  try { history.replaceState(null, "", "#view3d"); } catch (e) {}
  renderSpans(); renderRows(); show("view3d"); run();
  lastSaved = snapshot();
  msg("เริ่มโครงการใหม่แล้ว");
}
// หน้าต่างให้เลือกหลายทาง คืนค่า v ของปุ่มที่กด (Esc / กดพื้นหลัง = cancel)
function askChoice(title, text, buttons) {
  return new Promise((resolve) => {
    const ov = document.createElement("div"); ov.className = "modal";
    ov.innerHTML = '<div class="modal__box" role="dialog" aria-modal="true"><h3></h3><p></p><div class="modal__btns"></div></div>';
    ov.querySelector("h3").textContent = title; ov.querySelector("p").textContent = text;
    const done = (v) => { document.removeEventListener("keydown", onKey); ov.remove(); resolve(v); };
    const onKey = (e) => { if (e.key === "Escape") done("cancel"); };
    buttons.forEach((b) => {
      const el = document.createElement("button"); el.type = "button"; el.textContent = b.t;
      if (b.pri) el.className = "pri"; if (b.danger) el.className = "danger";
      el.onclick = () => done(b.v); ov.querySelector(".modal__btns").appendChild(el);
    });
    ov.addEventListener("click", (e) => { if (e.target === ov) done("cancel"); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(ov);
    ov.querySelector("button.pri, button").focus();
  });
}
// มีงานที่ยังไม่บันทึกไหม: ถามว่าจะ บันทึก / ไม่บันทึก(ทิ้ง) / ยกเลิก คืน true เมื่อไปต่อได้
async function guardUnsaved() {
  if (!isDirty()) return true;
  const name = $("pj").value.trim() || "(ยังไม่มีชื่อ)", saved = !!curId;
  const btns = [];
  if (editable) btns.push({ v: "save", t: saved ? "บันทึกการแก้ไข" : "บันทึกโครงการ", pri: true });
  btns.push({ v: "discard", t: saved ? "ไม่บันทึก (ทิ้งการแก้ไข)" : "ไม่บันทึก (ทิ้งข้อมูล)", danger: true }, { v: "cancel", t: "ยกเลิก (กลับไปแก้ต่อ)" });
  const c = await askChoice(saved ? 'โครงการ "' + name + '" มีการแก้ไขที่ยังไม่ได้บันทึก' : 'โครงการ "' + name + '" ยังไม่ได้บันทึก', "จะทำอย่างไรกับข้อมูลนี้?", btns);
  if (c === "save") return await saveCurrent();
  return c === "discard";
}
$("bNew").onclick = async () => {
  if (!(await guardUnsaved())) return;
  resetAll();
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
  renderRows(); run(); msg("ทำใบสั่งเพิ่มจากโครงการนี้แล้ว • แก้จำนวนแผ่นแล้วกดบันทึกโครงการ (จะบันทึกเป็นโครงการใหม่)");
};
// ส่งออก PDF: ภายใน = มีหน้าสรุป (น้ำหนัก วัสดุ การผลิต) / ส่งลูกค้า = เฉพาะภาพ 3 มิติและแบบแผ่น
async function exportPdf(customer) {
  if (!STATE || !STATE.list.length) { msg("ยังไม่มีรายการแผ่นให้ส่งออก"); return; }
  const btns = [$("bPdf"), $("bPdfC")]; btns.forEach((b) => (b.disabled = true)); msg("กำลังสร้าง PDF…");
  try {
    await makePdf({ st: STATE, d: collect(), $, views, onStatus: msg, customer });
    msg(customer ? "ดาวน์โหลด PDF สำหรับลูกค้าแล้ว • มีเฉพาะภาพ 3 มิติและแบบแผ่นทุกรหัส" : "ดาวน์โหลด PDF ภายในแล้ว • หน้าแรกสรุปโครงการ หน้าถัดไปเป็นภาพ 3 มิติและแบบแผ่นทุกรหัส");
  } catch (e) { msg(e && e.message ? e.message : "สร้าง PDF ไม่สำเร็จ ลองใหม่อีกครั้ง"); }
  finally { btns.forEach((b) => (b.disabled = false)); views.buildWall(+$("sel3").value || 0); }
}
$("bPdf").onclick = () => exportPdf(false);
$("bPdfC").onclick = () => exportPdf(true);

// ---------------- เริ่มทำงาน ----------------
function wire() {
  views = createViews({ $, getState: () => STATE });
  $("sel3").onchange = () => { drawJoint(); views.buildWall(+$("sel3").value || 0); };
  $("selD").onchange = drawPanel;
  ["shOn", "shMode", "shDrop"].forEach((id) => { $(id).addEventListener("input", sched); $(id).addEventListener("change", sched); });
  FIELDS.forEach((id) => { $(id).addEventListener("input", sched); $(id).addEventListener("change", sched); });
  document.querySelectorAll('input[name="md"],input[name="sm"],input[name="om"]').forEach((x) => x.addEventListener("change", run));
}

function enter(u) {
  user = u;
  if (!canUse(u)) { $("app").hidden = true; $("deny").hidden = false; return; }
  $("deny").hidden = true; $("app").hidden = false;
  editable = canEdit(u);
  $("uName").textContent = u.name; $("roTag").hidden = editable;
  setActions(!!STATE);
  renderSpans(); renderRows(); lastSaved = snapshot(); loadDraft(); run();
  const h0 = location.hash.slice(1);
  show(PANES.includes(h0) ? h0 : "view3d");
  refreshList();
  if (/^p-[a-z0-9]+$/.test(h0)) loadProject(h0);
  initPile();
}
function boot() {
  wire();
  const out = () => { logout(); location.reload(); };
  $("bOut").onclick = out; $("bDenyOut").onclick = out;
  const s = getSession();
  if (s) { enter(s); syncSession(s).then((fresh) => { if (fresh !== s && JSON.stringify(fresh) !== JSON.stringify(s)) { user = fresh; editable = canEdit(fresh); $("roTag").hidden = editable; setActions(!!STATE); if (!canUse(fresh)) enter(fresh); } }); }
  else showLogin($("login"), enter);
}
boot();
