// วาดแบบเสาเข็มไอ (A4 แนวนอน) เป็น SVG สตริง — ตามรูปแบบแบบ RMC (NOT TRUE SCALE)
import { pilePoly, esc } from "./draw2d.js?v=20261104053849";
import { TITLE_BLOCK } from "./pile-data.js";
import { m2 } from "./pile-calc.js";

const W = 1188, H = 840, INK = "#111";
const f1 = (n) => Math.round(n * 10) / 10;
const FONT = `font-family="Times New Roman, IBM Plex Sans Thai, Tahoma, serif"`;
const T = (x, y, s, o = {}) => `<text x="${f1(x)}" y="${f1(y)}" font-size="${o.size || 11}" text-anchor="${o.anchor || "middle"}" ${o.weight ? `font-weight="${o.weight}"` : ""} ${o.rot ? `transform="rotate(${o.rot} ${f1(x)} ${f1(y)})"` : ""} fill="${o.fill || INK}" ${FONT}>${esc(s)}</text>`;
const L = (x1, y1, x2, y2, w = 1, extra = "") => `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${INK}" stroke-width="${w}" ${extra}/>`;
const tri = (x, y, ang, sz = 6) => {
  const a = (ang * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), p = (u, v) => `${f1(x + u * c - v * s)},${f1(y + u * s + v * c)}`;
  return `<polygon points="${p(0, 0)} ${p(-sz * 1.8, -sz * 0.45)} ${p(-sz * 1.8, sz * 0.45)}" fill="${INK}"/>`;
};
const tick = (x, y) => L(x - 3.5, y + 3.5, x + 3.5, y - 3.5, 1.2);
// ขนาดแนวนอน: เส้น + ขีดปลาย + ตัวเลขเหนือเส้น
const dimH = (x1, x2, y, txt, o = {}) => L(x1, y, x2, y, 0.9) + tick(x1, y) + tick(x2, y) + (txt ? T((x1 + x2) / 2, y - 4, txt, { size: o.size || 10.5 }) : "");
const dimV = (x, y1, y2, txt, o = {}) => L(x, y1, x, y2, 0.9) + tick(x, y1) + tick(x, y2) + (txt ? T(x - 4, (y1 + y2) / 2 + 3.5, txt, { size: o.size || 10.5, anchor: "end" }) : "");
const leader = (x1, y1, x2, y2, txt, o = {}) => L(x1, y1, x2, y2, 0.9) + tri(x1, y1, (Math.atan2(y1 - y2, x1 - x2) * 180) / Math.PI + 180, 5) + (txt ? L(x2, y2, x2 + (o.dir === "l" ? -(o.len || 110) : o.len || 110), y2, 0.9) + T(x2 + (o.dir === "l" ? -(o.len || 110) / 2 : (o.len || 110) / 2), y2 - 3, txt, { size: o.size || 10.5 }) : "");

// หน้าตัดไอ: จุดจาก pilePoly (มม. ศูนย์กลางที่ 0,0) → พิกัดหน้าจอ
const secPts = (p, cx, cy, s) => pilePoly(p).map(([x, y]) => `${f1(cx + x * s)},${f1(cy + y * s)}`).join(" ");
const PILE22 = { B: 220, f: 65, c: 50, dg: 70, tw: 80 };

// ตำแหน่งลวด PC (มม. จากศูนย์กลาง): ลวด 4 มม. มุม ๆ และลวด 5 มม. ตรงข้ามกัน (ตามแบบ I-22)
const WIRE4 = [[-75, -75], [75, -75], [-75, 75], [75, 75]];
const WIRE5 = [[-40, -75], [40, 75]];
const barRow = (k, y) => (k === 1 ? [[0, y]] : k === 2 ? [[-75, y], [75, y]] : k === 3 ? [[-75, y], [0, y], [75, y]] : [[-75, y], [-25, y], [25, y], [75, y]].slice(0, Math.min(4, k)));

function sectionA(plan, cx, cy, s, simple) {
  let o = `<polygon points="${secPts(PILE22, cx, cy, s)}" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
  const circ = (x, y, r, fill) => `<circle cx="${f1(cx + x * s)}" cy="${f1(cy + y * s)}" r="${f1(r * s)}" fill="${fill || "#fff"}" stroke="${INK}" stroke-width="0.9"/>`;
  WIRE4.forEach(([x, y]) => { o += circ(x, y, 4, "#fff"); });
  WIRE5.forEach(([x, y]) => { o += circ(x, y, 2.5, INK); });
  // เหล็กเสริมพิเศษ: วางครึ่งบนครึ่งล่าง
  plan.extras.forEach((e) => {
    const top = Math.ceil(e.n / 2), bot = e.n - top;
    barRow(top, -60).concat(barRow(bot, 60)).forEach(([x, y]) => { o += circ(x, y, e.d / 2 + 1.5, "#fff") + circ(x, y, e.d / 2 - 1.5, INK); });
  });
  const x0 = cx - 110 * s, x1 = cx + 110 * s, y0 = cy - 110 * s, y1 = cy + 110 * s;
  // ขนาดแนวตั้งด้านซ้าย: 0.065 0.020 0.050 0.020 0.065
  const dv = [[0, 65], [65, 85], [85, 135], [135, 155], [155, 220]], dx = x0 - 26;
  dv.forEach(([a, b]) => { o += dimV(dx, y0 + a * s, y0 + b * s, ""); });
  const lab = ["0.065", "0.020", "0.050", "0.020", "0.065"];
  dv.forEach(([a, b], i) => { o += T(dx - 4, y0 + ((a + b) / 2) * s + 3.5, lab[i], { size: 9.5, anchor: "end" }); });
  o += dimV(dx - 52, y0, y1, "0.22", { size: 10.5 });
  // ขนาดแนวนอนด้านล่าง: 0.070 0.08 0.070
  [[0, 70, "0.070"], [70, 150, "0.08"], [150, 220, "0.070"]].forEach(([a, b, t]) => { o += L(x0 + a * s, y1 + 14, x0 + b * s, y1 + 14, 0.9) + tick(x0 + a * s, y1 + 14) + tick(x0 + b * s, y1 + 14) + T(x0 + ((a + b) / 2) * s, y1 + 25, t, { size: 9.5 }); });
  o += T(cx, y1 + 40, "0.22", { size: 10.5 }) + T(cx - 30, y1 + 56, "SECTION", { size: 10.5, weight: 400 }) + T(cx + 38, y1 + 56, "A", { size: 10.5 }) + L(cx - 60, y1 + 59, cx + 60, y1 + 59, 0.9);
  // ป้ายชี้
  const lx = x1 + 22;
  if (simple) {
    o += leader(cx + 75 * s, cy - 75 * s, lx + 10, cy - 105 * s, "SEE TABLE", { len: 66 });
  } else {
    o += leader(cx - 40 * s, cy - 75 * s, lx, y0 - 14, "1-PC.WIRE 5mm.", { len: 82 });
    o += leader(cx + 75 * s, cy - 75 * s, lx, y0 + 2, "2-PC.WIRE 4mm.", { len: 82 });
    o += leader(cx - 75 * s, cy + 75 * s, lx, y1 + 2, "2-PC.WIRE 4mm.", { len: 82 });
    o += leader(cx + 40 * s, cy + 75 * s, lx, y1 + 18, "1-PC.WIRE 5mm.", { len: 82 });
  }
  const web = cx + 12 * s;
  o += leader(web, cy, lx - 2, cy, "CDØ2.8mm.@0.17m.", { len: 96 });
  plan.extras.forEach((e, i) => { o += leader(cx + 75 * s, cy - 60 * s, lx + 8, cy - 28 * s - i * 12, `${Math.ceil(e.n / 2)}-DB${e.d}`, { len: 52, size: 10 }) + leader(cx + 75 * s, cy + 60 * s, lx + 8, cy + 38 * s + i * 12, `${e.n - Math.ceil(e.n / 2)}-DB${e.d}`, { len: 52, size: 10 }); });
  return o;
}

function wiresDetail(cx, cy, s) {
  let o = `<polygon points="${secPts(PILE22, cx, cy, s)}" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
  WIRE4.forEach(([x, y]) => { o += `<circle cx="${f1(cx + x * s)}" cy="${f1(cy + y * s)}" r="${f1(4 * s)}" fill="#fff" stroke="${INK}" stroke-width="0.9"/>`; });
  WIRE5.forEach(([x, y]) => { o += `<circle cx="${f1(cx + x * s)}" cy="${f1(cy + y * s)}" r="${f1(2.5 * s)}" fill="${INK}"/>`; });
  const x0 = cx - 110 * s, y0 = cy - 110 * s, y1 = cy + 110 * s, x1 = cx + 110 * s;
  o += dimH(x0, x0 + 35 * s, y0 - 12, "", {}) + dimH(x0 + 35 * s, x0 + 70 * s, y0 - 12, "", {}) + T(x0 + 17 * s - 8, y0 - 16, "0.035", { size: 8.5 }) + T(x0 + 52 * s + 14, y0 - 28, "0.035", { size: 8.5 }) + L(x0 + 52 * s, y0 - 14, x0 + 52 * s + 6, y0 - 25, 0.6);
  o += dimH(x1 - 70 * s, x1 - 35 * s, y1 + 12, "", {}) + dimH(x1 - 35 * s, x1, y1 + 12, "", {}) + T(x1 - 52 * s - 14, y1 + 33, "0.035", { size: 8.5 }) + T(x1 - 17 * s + 8, y1 + 26, "0.035", { size: 8.5 }) + L(x1 - 52 * s, y1 + 14, x1 - 52 * s - 6, y1 + 24, 0.6);
  o += dimV(x1 + 14, y0, y0 + 35 * s, "", {}) + T(x1 + 18, y0 + 18 * s, "0.035", { size: 9, anchor: "start" });
  o += dimV(x0 - 14, y1 - 35 * s, y1, "", {}) + T(x0 - 18, y1 - 14 * s, "0.035", { size: 9, anchor: "end" });
  o += T(cx, y1 + 42, "DETAIL OF PC.WIRES", { size: 10.5 }) + L(cx - 62, y1 + 45, cx + 62, y1 + 45, 0.9);
  return o;
}

function stirrupDetail(cx, cy, s) {
  const k = 150 / 220;
  let o = `<polygon points="${pilePoly(PILE22).map(([x, y]) => `${f1(cx + x * k * s)},${f1(cy + y * k * s)}`).join(" ")}" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
  const x1 = cx + 75 * s, y0 = cy - 75 * s, y1 = cy + 75 * s;
  o += dimV(x1 + 22, y0, y1, "", {}) + T(x1 + 26, cy + 4, "0.150", { size: 10, anchor: "start" });
  o += dimH(cx - 7.5 * s, cx + 7.5 * s, y1 + 14, "", {}) + T(cx, y1 + 28, "0.015", { size: 9.5 });
  o += T(cx, y1 + 46, "DETAIL OF STIRRUP", { size: 10.5 }) + L(cx - 55, y1 + 49, cx + 55, y1 + 49, 0.9);
  return o;
}

function liftingPoints(x0, y0, w) {
  const a = 0.207 * w;
  let o = `<rect x="${x0}" y="${y0 + 22}" width="${w}" height="16" fill="none" stroke="${INK}" stroke-width="1.1"/>`;
  [x0 + a, x0 + w - a].forEach((x) => { o += L(x, y0 + 16, x, y0 + 44, 1.1); });
  o += dimH(x0, x0 + a, y0 + 8, "0.207L", { size: 9.5 }) + dimH(x0 + w - a, x0 + w, y0 + 8, "0.207L", { size: 9.5 });
  o += L(x0, y0 + 60, x0 + w, y0 + 60, 0.9) + tick(x0, y0 + 60) + tick(x0 + w, y0 + 60) + T(x0 + w / 2, y0 + 56, "LENGTH OF PILE", { size: 10.5 });
  o += `<rect x="${x0 - 10}" y="${y0 + 74}" width="${w + 20}" height="22" fill="none" stroke="${INK}" stroke-width="0.9"/>` + T(x0 + w / 2, y0 + 89, "LIFTING POINT FOR PRE-STRESS CONCRETE PILE", { size: 10 });
  return o;
}

// แผ่นเหล็กหัวต่อ (มองหน้าตัด) + เหล็กเดือย n เส้น (ครึ่งบน/ครึ่งล่าง)
function weldingPlate(dowel, cx, cy, s, subtitle) {
  let o = `<polygon points="${secPts(PILE22, cx, cy, s)}" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
  const top = dowel ? Math.ceil(dowel.n / 2) : 2, bot = dowel ? dowel.n - top : 2;
  const pts = barRow(top, -75).concat(barRow(bot, 75));
  pts.forEach(([x, y]) => { o += `<circle cx="${f1(cx + x * s)}" cy="${f1(cy + y * s)}" r="${f1(5 * s)}" fill="#fff" stroke="${INK}" stroke-width="0.9"/>`; });
  const lbl = dowel ? `${top}DB${dowel.d}mm.x${Math.round(dowel.len * 100)}cm.` : "SEE TABLE";
  o += leader(cx - 30 * s, cy - 70 * s, cx + 112 * s, cy - 125 * s, lbl, { len: 92 });
  o += leader(cx + 30 * s, cy + 70 * s, cx + 112 * s, cy + 125 * s, dowel ? `${bot}DB${dowel.d}mm.x${Math.round(dowel.len * 100)}cm.` : "SEE TABLE", { len: 92 });
  o += leader(cx + 8, cy, cx + 112 * s, cy, "PLATE 9mm.", { len: 70 });
  o += T(cx - 28, cy + 134 * s + 16, "WELDING PLATE" + (subtitle ? ` (${subtitle})` : ""), { size: 10.5 }) + L(cx - 78, cy + 134 * s + 19, cx + 78, cy + 134 * s + 19, 0.9);
  return o;
}

function weldSide(dowel, x, y, s) {
  const h = 220 * s, n = dowel ? dowel.n : 4;
  let o = `<rect x="${x}" y="${y}" width="9" height="${h}" fill="#555" stroke="${INK}" stroke-width="0.9"/><rect x="${x - 3}" y="${y}" width="3" height="${h}" fill="#bbb" stroke="${INK}" stroke-width="0.7"/>`;
  const rows = n === 6 ? [-75, -45, 45, 75] : [-75, -45, 45, 75];
  rows.forEach((yy) => { o += L(x + 9, y + h / 2 + yy * s, x + 9 + 110, y + h / 2 + yy * s, 1.6); });
  o += leader(x + 4, y + 6, x + 40, y - 14, "PLATE 9mm.", { len: 66 }) + leader(x - 2, y + 22, x - 30, y - 30, "RING PLATE 3mm.", { len: 86, dir: "l" });
  o += leader(x + 100, y + h / 2 - 75 * s, x + 130, y + h * 0.12, dowel ? `${dowel.n}-DB${dowel.d}mm.x${m2(dowel.len)}m.` : "SEE TABLE", { len: 96 });
  o += T(x + 50, y + h + 18, "WELDING PLATE SID VIEW", { size: 10.5 }) + L(x - 20, y + h + 21, x + 120, y + h + 21, 0.9);
  return o;
}

// รูปขยายบ่า: ขนาด 0.20 + 0.10 ม. เหล็ก 3 เส้น
function shoulderDetail(sh, x, y) {
  const w = 280, h = 56;
  let o = T(x, y - 22, `ระยะบ่า ${m2(sh.at)}m.`, { size: 15, anchor: "start" }) + L(x, y - 18, x + 130, y - 18, 0.9);
  o += dimH(x + 60, x + 130, y + 2, "", {}) + tri(x + 60, y + 2, 180, 5) + tri(x + 130, y + 2, 0, 5);
  const top = y + 16, bot = top + h;
  [top, top + 12, top + h - 12, bot].forEach((yy) => { o += L(x + 20, yy, x + w + 20, yy, 0.9); });
  // รอยหัก ซ้ายขวา
  [x + 20, x + w + 20].forEach((xx) => { o += `<polyline points="${xx},${top - 6} ${xx - 7},${top + 14} ${xx + 5},${top + 26} ${xx - 7},${top + 38} ${xx},${bot + 6}" fill="none" stroke="${INK}" stroke-width="1"/>`; });
  const bx = x + 130, aW = 56, bW = 30;
  o += `<rect x="${bx}" y="${top + 12}" width="${aW}" height="${h - 24}" fill="url(#stipple)" stroke="${INK}" stroke-width="1"/>`;
  o += `<polygon points="${bx + aW},${top + 12} ${bx + aW + bW},${top + 18} ${bx + aW + bW},${bot - 18} ${bx + aW},${bot - 12}" fill="url(#stipple)" stroke="${INK}" stroke-width="1"/>`;
  [0, 1, 2].forEach((i) => { o += tri(bx + 12 + i * 12, top + 40, -60, 4); });
  o += leader(bx + 24, top + 36, x + w + 20, bot + 22, `${sh.bars}-DB${sh.d}mm.`, { len: 70, size: 10 });
  o += dimH(bx, bx + aW, bot + 22, "0.20", { size: 12 }) + dimH(bx + aW, bx + aW + bW, bot + 22, "0.10", { size: 12 });
  o += T(x + 40, bot + 44, "แบบขยายบ่า", { size: 11 }) + L(x + 10, bot + 47, x + 100, bot + 47, 0.9);
  return o;
}

// รูปด้านท่อนเสา: ปลายละ 0.33 (@0.05) + 0.66 (@0.07) ส่วนกลาง (@0.17) — ไม่ได้มาตราส่วนจริง
function elevation(plan, piece, y0, opts) {
  const sp = plan.sec.spiral, X0 = 110, TW = 960, a = 56, b = 116, mid = TW - 2 * (a + b), yTop = y0 + 50, sh = 28;
  const ls = piece.full ? "L = 1.00-20.00 m." : m2(piece.len);
  let o = "";
  o += dimH(X0, X0 + TW, y0 + 10, "", {}) + T(X0 + TW / 2, y0 + 5, ls, { size: 12 });
  const xs = [X0, X0 + a, X0 + a + b, X0 + a + b + mid, X0 + a + b + mid + b, X0 + TW];
  const labs = [m2(sp.endLen), m2(sp.nearLen), piece.full ? "L-1.98" : m2(piece.mid), m2(sp.nearLen), m2(sp.endLen)];
  labs.forEach((t, i) => { o += dimH(xs[i], xs[i + 1], y0 + 34, t, { size: 10.5 }); });
  o += `<rect x="${X0}" y="${yTop}" width="${TW}" height="${sh}" fill="#fff" stroke="${INK}" stroke-width="1.4"/>`;
  const zig = (xa, xb, step) => { let p = "", up = true; for (let x = xa; x <= xb + 0.1; x += step) { p += `${f1(x)},${up ? yTop + 3 : yTop + sh - 3} `; up = !up; } return `<polyline points="${p}" fill="none" stroke="${INK}" stroke-width="0.9"/>`; };
  o += zig(xs[0], xs[1], 4) + zig(xs[1], xs[2], 9) + zig(xs[2], xs[3], 40) + zig(xs[3], xs[4], 9) + zig(xs[4], xs[5], 4);
  // ลวด PC ยาวตลอด (บนและล่าง)
  o += L(X0, yTop + 7, X0 + TW, yTop + 7, 1.8) + L(X0, yTop + sh - 7, X0 + TW, yTop + sh - 7, 1.8);
  // รอยหักกลาง + จุดตัด A
  const cx = X0 + TW / 2;
  o += `<rect x="${cx - 6}" y="${yTop - 1}" width="12" height="${sh + 2}" fill="#fff"/>` + L(cx - 6, yTop + sh, cx, yTop, 1.1) + L(cx, yTop + sh, cx + 6, yTop, 1.1);
  o += `<circle cx="${cx + 60}" cy="${yTop - 12}" r="8" fill="#fff" stroke="${INK}" stroke-width="1"/>` + T(cx + 60, yTop - 8, "A", { size: 10.5 }) + L(cx + 60, yTop - 4, cx + 60, yTop + sh + 6, 0.9) + L(cx - 12, yTop - 6, cx - 12, yTop + sh + 6, 0.9, 'stroke-dasharray="3 2"');
  o += dimV(X0 - 18, yTop, yTop + sh, "0.22", { size: 10.5 });
  // ป้ายปลอกเกลียว
  const sy = yTop + sh + 16;
  o += T(X0 + 30, sy, "2-CD.Ø2.8mm.", { size: 10.5 }) + T(X0 + 30, sy + 12, "@0.05m.", { size: 10.5 });
  o += T(X0 + a + b / 2 + 14, sy, "CD.Ø2.8mm.", { size: 10.5 }) + T(X0 + a + b / 2 + 14, sy + 12, "@0.07m.", { size: 10.5 });
  o += T(cx, sy, "CD.Ø2.8mm.", { size: 10.5 }) + T(cx, sy + 12, "@0.17m.", { size: 10.5 });
  o += T(xs[3] + b / 2 - 14, sy, "CD.Ø2.8mm.", { size: 10.5 }) + T(xs[3] + b / 2 - 14, sy + 12, "@0.07m.", { size: 10.5 });
  o += T(X0 + TW - 30, sy, "2-CD.Ø2.8mm.", { size: 10.5 }) + T(X0 + TW - 30, sy + 12, "@0.05m.", { size: 10.5 });
  let yy = sy + 24;
  // เหล็กเสริมพิเศษ
  plan.extras.forEach((e, i) => {
    const len = e.len || (piece.full ? null : piece.len), frac = piece.full || !len ? 1 : Math.min(1, len / piece.len), xe = X0 + TW * frac;
    o += L(X0, yTop + 13 + i * 2, xe, yTop + 13 + i * 2, 2.6);
    o += leader(X0 + TW * 0.34, yTop + 14 + i * 2, X0 + TW * 0.28, yy + 6 + i * 14, `${e.n}-DB${e.d}x${len ? m2(len) : "L"}m.`, { len: 110, size: 11 });
  });
  if (plan.extras.length) yy += 16 + plan.extras.length * 14;
  // บ่า: ระยะจากหัวเสา (ท่อนบนเท่านั้น)
  if (plan.shoulder && opts.first && !piece.full) {
    const at = Math.min(plan.shoulder.at, piece.len), xs0 = X0 + (at / piece.len) * TW;
    o += L(xs0 - 5, yTop + sh, xs0 + 5, yTop + sh + 7, 1) + `<polygon points="${f1(xs0 - 6)},${yTop + sh} ${f1(xs0 + 6)},${yTop + sh} ${f1(xs0)},${yTop + sh + 9}" fill="${INK}"/>`;
    o += dimH(X0, xs0, yy + 8, `บ่า ${m2(plan.shoulder.at)}`, { size: 10.5 });
    yy += 22;
  }
  return { svg: o, h: yy - y0 + 6 };
}

function table(plan, x, y, w) {
  const rows = plan.rows, rh = 20, hh = 22, cols = [0, 0.28, 0.43, 0.58, 1].map((f) => x + f * w);
  const nr = rows.length;
  let o = `<rect x="${x}" y="${y}" width="${w}" height="${hh + 20 + nr * rh}" fill="#fff" stroke="${INK}" stroke-width="1.1"/>`;
  o += T(x + w / 2, y + 15, "PRE - STRESS STEEL TABLE", { size: 11.5 }) + L(x, y + hh, x + w, y + hh, 1);
  o += T((cols[0] + cols[1]) / 2, y + hh + 20, "LENGTH OF PILE", { size: 9 }) + T((cols[1] + cols[3]) / 2, y + hh + 9, "PC.WIRE", { size: 9.5 }) + T((cols[1] + cols[2]) / 2, y + hh + 20, "4mm.", { size: 9.5 }) + T((cols[2] + cols[3]) / 2, y + hh + 20, "5mm.", { size: 9.5 });
  o += T((cols[3] + cols[4]) / 2, y + hh + 9, "DOWEL BAR OF", { size: 9 }) + T((cols[3] + cols[4]) / 2, y + hh + 20, "CONNECTION JOINT", { size: 9 });
  const y1 = y + hh + 24;
  o += L(x, y1, x + w, y1, 1) + L(cols[1], y + hh, cols[1], y + hh + 20 + nr * rh, 1) + L(cols[3], y + hh, cols[3], y + hh + 20 + nr * rh, 1) + L(cols[2], y + hh + 11, cols[2], y + hh + 20 + nr * rh, 1) + L(cols[1], y + hh + 11, cols[3], y + hh + 11, 1);
  rows.forEach((r, i) => {
    const yy = y1 + i * rh + 14;
    o += T((cols[0] + cols[1]) / 2, yy, r.label, { size: 10 }) + T((cols[1] + cols[2]) / 2, yy, r.w4 || "-", { size: 10 }) + T((cols[2] + cols[3]) / 2, yy, r.w5 || "-", { size: 10 });
    o += T((cols[3] + cols[4]) / 2, yy, plan.joint && r.dowel ? `${r.dowel.n}-DB${r.dowel.d}mm.x${m2(r.dowel.len)}m.` : "-", { size: 10 });
    if (i < nr - 1) o += L(x, y1 + (i + 1) * rh, x + w, y1 + (i + 1) * rh, 0.6);
  });
  return { svg: o, h: hh + 24 + nr * rh };
}

function titleBlock(plan, logoHref) {
  const y = 742, p = plan.project || {}, tb = TITLE_BLOCK, cols = [20, 470, 760, 970, 1168];
  let o = `<rect x="20" y="${y}" width="1148" height="78" fill="#fff" stroke="${INK}" stroke-width="1.4"/>`;
  o += L(20, y + 39, 1168, y + 39, 1) + cols.slice(1, 4).map((x) => L(x, y, x, y + 78, 1)).join("");
  o += `<image href="${logoHref}" x="30" y="${y + 8}" width="96" height="62" preserveAspectRatio="xMidYMid meet"/>`;
  o += T(140, y + 26, tb.company, { size: 18, anchor: "start", weight: 700 }) + T(140, y + 44, tb.companyEn, { size: 10, anchor: "start" });
  const cell = (x1, x2, yy, label, val) => T(x1 + 6, yy + 13, label, { size: 8.5, anchor: "start", fill: "#444" }) + T((x1 + x2) / 2, yy + 31, val || "", { size: 13 });
  o += cell(cols[1], cols[2], y, "PROJECT", p.pj) + cell(cols[2], cols[3], y, "LOCATION", p.lo) + cell(cols[3], cols[4], y, "DESIGN BY :", tb.designBy);
  o += cell(cols[1], cols[2], y + 39, "OWNER", p.ow) + cell(cols[2], cols[3], y + 39, "DRAWING BY :", tb.drawBy) + cell(cols[3], cols[4], y + 39, "APPROVED BY :", `${tb.approveBy} ${tb.licence}`);
  o += L(470, y + 39, 470, y + 78, 1);
  return o;
}

export function pileSheet(plan, logoHref = "assets/logo.png") {
  if (!plan.sec) return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"></svg>`;
  const np = plan.pieces.length, simple = plan.full || plan.pieces.some((p) => !p.rule || p.rule.w4 !== 4 || p.rule.w5 !== 2) || plan.pieces.length === 0;
  let o = `<defs><pattern id="stipple" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="0.8" fill="#222"/><circle cx="4.5" cy="4.5" r="0.8" fill="#222"/></pattern></defs>`;
  o += `<rect width="${W}" height="${H}" fill="#fff"/><rect x="20" y="20" width="1148" height="800" fill="none" stroke="${INK}" stroke-width="1.8"/>`;
  o += T(W / 2, 50, plan.title, { size: 22, weight: 400 });
  let y = 66, firstDone = false;
  plan.pieces.forEach((pc) => {
    const e = elevation(plan, pc, y, { first: !firstDone });
    firstDone = true; o += e.svg; y += e.h + 4;
  });
  const sd = np === 2 ? 0.56 : 0.78, rowA = Math.max(y + 8, 150);
  const cyA = rowA + 20 + 110 * sd;
  o += sectionA(plan, 240, cyA, sd, simple);
  o += wiresDetail(562, cyA, sd);
  o += stirrupDetail(742, cyA + 6, sd + 0.1);
  o += liftingPoints(872, rowA + 10, 270);
  // แถวล่าง: หัวต่อ + ตาราง + รูปขยายบ่า
  const rowB = rowA + 20 + 220 * sd + 92, cyB = rowB + 8 + 110 * sd;
  let xcur = 170;
  const dowels = plan.full ? [plan.rows[0] && plan.rows[0].dowel] : [...new Map(plan.pieces.map((p) => [p.rule ? p.rule.dowel.n + "-" + p.rule.dowel.d : "x", p])).values()].map((p) => p.rule && p.rule.dowel);
  if (plan.joint) {
    const list = plan.full ? [null] : dowels.slice(0, 2);
    list.forEach((d, i) => { o += weldingPlate(d, xcur, cyB, sd, !plan.full && list.length > 1 ? `${m2(plan.pieces.filter((p) => p.rule && p.rule.dowel === d)[0]?.len || plan.pieces[i].len)} m.` : ""); xcur += 250; });
    o += weldSide(list[0], xcur - 100, cyB - 110 * sd, sd);
    xcur += 220;
  }
  const tw = 360, tx = 1168 - 12 - tw, tY = rowB - 6;
  const tb = table(plan, tx, tY, tw);
  o += tb.svg;
  if (plan.shoulder) o += shoulderDetail(plan.shoulder, Math.max(xcur - 60, 70), rowB + 28);
  o += T(tx + tw - 4, tY + tb.h + 14, "NOTE : NOT TRUE SCALE", { size: 10, anchor: "end" });
  o += titleBlock(plan, logoHref);
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" style="background:#fff;display:block">${o}</svg>`;
}
