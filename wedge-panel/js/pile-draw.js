// วาดแบบเสาเข็มไอ (A4 แนวนอน) เป็น SVG สตริง — ตามรูปแบบแบบ RMC (NOT TRUE SCALE)
import { pilePoly, esc } from "./draw2d.js?v=20261107070825";
import { TITLE_BLOCK } from "./pile-data.js?v=20261107070825";
import { m2, wireLayout } from "./pile-calc.js?v=20261107070825";

const W = 1188, H = 840, INK = "#111";
const f1 = (n) => Math.round(n * 10) / 10;
const FONT = `font-family="Times New Roman, IBM Plex Sans Thai, Tahoma, serif"`;
const T = (x, y, s, o = {}) => `<text x="${f1(x)}" y="${f1(y)}" font-size="${o.size || 11}" text-anchor="${o.anchor || "middle"}" ${o.weight ? `font-weight="${o.weight}"` : ""} ${o.rot ? `transform="rotate(${o.rot} ${f1(x)} ${f1(y)})"` : ""} fill="${o.fill || INK}" ${o.halo ? 'stroke="#fff" stroke-width="3.5" paint-order="stroke" stroke-linejoin="round"' : ""} ${FONT}>${esc(s)}</text>`;
const L = (x1, y1, x2, y2, w = 1, extra = "") => `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${INK}" stroke-width="${w}" ${extra}/>`;
const tri = (x, y, ang, sz = 6) => {
  const a = (ang * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), p = (u, v) => `${f1(x + u * c - v * s)},${f1(y + u * s + v * c)}`;
  return `<polygon points="${p(0, 0)} ${p(-sz * 1.8, -sz * 0.45)} ${p(-sz * 1.8, sz * 0.45)}" fill="${INK}"/>`;
};
const tick = (x, y) => L(x - 3.5, y + 3.5, x + 3.5, y - 3.5, 1.2);
// ขนาดแนวนอน: เส้น + ขีดปลาย + ตัวเลขเหนือเส้น
const dimH = (x1, x2, y, txt, o = {}) => L(x1, y, x2, y, 0.9) + L(x1, y - 5, x1, y + 5, 0.8) + L(x2, y - 5, x2, y + 5, 0.8) + tri(x1, y, 180, 4.5) + tri(x2, y, 0, 4.5) + (txt ? T((x1 + x2) / 2, y - 4, txt, { size: o.size || 10.5 }) : "");
const dimV = (x, y1, y2, txt, o = {}) => L(x, y1, x, y2, 0.9) + L(x - 5, y1, x + 5, y1, 0.8) + L(x - 5, y2, x + 5, y2, 0.8) + tri(x, y1, -90, 4.5) + tri(x, y2, 90, 4.5) + (txt ? T(x - 4, (y1 + y2) / 2 + 3.5, txt, { size: o.size || 10.5, anchor: "end" }) : "");
const leader = (x1, y1, x2, y2, txt, o = {}) => L(x1, y1, x2, y2, 0.9) + tri(x1, y1, (Math.atan2(y1 - y2, x1 - x2) * 180) / Math.PI + 180, 5) + (txt ? L(x2, y2, x2 + (o.dir === "l" ? -(o.len || 110) : o.len || 110), y2, 0.9) + T(x2 + (o.dir === "l" ? -(o.len || 110) / 2 : (o.len || 110) / 2), y2 - 3, txt, { size: o.size || 10.5 }) : "");

// หน้าตัดไอ: จุดจาก pilePoly (มม. ศูนย์กลางที่ 0,0) → พิกัดหน้าจอ
// หน้าตัดสี่เหลี่ยมมุมตัด (sq): แปดเหลี่ยม ตัดมุม ch มม.
const sqPoly = (p) => { const h = p.B / 2, c = p.ch || 20; return [[-h + c, -h], [h - c, -h], [h, -h + c], [h, h - c], [h - c, h], [-h + c, h], [-h, h - c], [-h, -h + c]]; };
const polyOf = (p) => (p.sq ? sqPoly(p) : pilePoly(p));
const secPts = (p, cx, cy, s) => polyOf(p).map(([x, y]) => `${f1(cx + x * s)},${f1(cy + y * s)}`).join(" ");
let PILE22 = { B: 220, f: 65, c: 50, dg: 70, tw: 80 }; // หน้าตัดปัจจุบัน (ตั้งค่าใน pileSheet จาก plan.sec.geo)
const HB = () => PILE22.B / 2;
const cm3 = (v) => (v / 1000).toFixed(3), c2 = (v) => (v / 1000).toFixed(2); // 0.065 / 0.08

// ตำแหน่งลวด PC (มม. จากศูนย์กลาง): ลวด 4 มม. มุม ๆ และลวด 5 มม. ตรงข้ามกัน (ตามแบบ I-22)
const WIRE4 = [[-75, -75], [75, -75], [-75, 75], [75, 75]];
const WIRE5 = [[-40, -75], [40, 75]];
const dbRow = (k, y) => { const q = PILE22.B / 220; return (k === 1 ? [[0, y]] : k === 2 ? [[-63 * q, y], [63 * q, y]] : k === 3 ? [[-63 * q, y], [0, y], [63 * q, y]] : [[-63 * q, y], [-22 * q, y], [22 * q, y], [63 * q, y]].slice(0, Math.min(4, k))); };
const barRow = (k, y) => (k === 1 ? [[0, y]] : k === 2 ? [[-75, y], [75, y]] : k === 3 ? [[-75, y], [0, y], [75, y]] : [[-75, y], [-25, y], [25, y], [75, y]].slice(0, Math.min(4, k)));

// หน้าตัด A-A ตามแบบ AutoCAD: ปลอกเกลียวด้านใน, ลวด 4 มม. (วงกลม) และ 5 มม. (ดอกจัน), ป้ายชี้แบบเส้นใต้ตัวหนังสือ + ลูกศรทึบ
export function sectionA(plan, cx, cy, s, simple, ex = [], letter = "A", pcSame = false, lay = wireLayout(4, 2)) {
  const X = (x) => cx + x * s, Y = (y) => cy + y * s, P = (x, y) => `${f1(X(x))},${f1(Y(y))}`;
  let o = `<polygon points="${secPts(PILE22, cx, cy, s)}" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
  // ปลอกเกลียวอยู่ล้อมนอกลวด PC และเหล็ก DB (ห่างผิวคอนกรีต ~25 มม. ที่ปีก ~20 มม. ที่เอว)
  const G = PILE22, hb = G.B / 2, rO = hb - 25, rM = hb - G.f + 13, rW = Math.max(8, G.tw / 2 - 20), rC = G.c / 2 + 15;
  const sqr = hb - 30, ring = G.sq ? [[-sqr, -sqr], [sqr, -sqr], [sqr, sqr], [-sqr, sqr]] : [[-rO, -rO], [rO, -rO], [rO, -rM], [rW, -rC], [rW, rC], [rO, rM], [rO, rO], [-rO, rO], [-rO, rM], [-rW, rC], [-rW, -rC], [-rO, -rM]];
  o += `<polygon points="${ring.map(([x, y]) => P(x, y)).join(" ")}" fill="none" stroke="${INK}" stroke-width="0.8"/>`;
  const star = (x, y, r) => [0, 60, 120].map((a) => { const t = (a * Math.PI) / 180; return L(X(x) - Math.cos(t) * r, Y(y) - Math.sin(t) * r, X(x) + Math.cos(t) * r, Y(y) + Math.sin(t) * r, 1); }).join("");
  const circ = (x, y, r, fill) => `<circle cx="${f1(X(x))}" cy="${f1(Y(y))}" r="${f1(r * s)}" fill="${fill || "#fff"}" stroke="${INK}" stroke-width="0.9"/>`;
  lay.w4.forEach(([x, y]) => { o += circ(x, y, 3, "#fff"); });
  lay.w5.forEach(([x, y]) => { o += star(x, y, 4.5 * s); });
  // เหล็กเสริม DB: อยู่แนวแถวลวด PC แต่ต่ำกว่าแนวลวดเล็กน้อย 5 มม. (ขยับเข้าหาแกนหน้าตัด ตามผู้ใช้สั่ง) (ห่างผิว 35 มม.) ชิดลวด PC แต่ห้ามทับ (ต้องผูกเหล็กเข้ากับลวด) และต้องไม่ล้นกรอบปลอกแหวน (ผู้ใช้สั่งให้จำไว้เสมอ)
  const obs = [...lay.w4.map((p) => ({ x: p[0], y: p[1], r: 3 })), ...lay.w5.map((p) => ({ x: p[0], y: p[1], r: 4.5 }))], limX = G.sq ? hb - 30 : hb - 25;
  const wiresAll = obs.slice();
  ex.forEach((e) => {
    const r = e.d / 2, top = Math.ceil(e.n / 2), bot = e.n - top, yRow = Math.min(hb - 35, limX - r - 1) - 5, xmax = limX - r - 2;
    [[-1, top], [1, bot]].forEach(([sg, cnt]) => {
      const y = sg * yRow, rowW = wiresAll.filter((q) => Math.abs(q.y - sg * (hb - 35)) < 5).sort((p, q) => Math.abs(q.x) - Math.abs(p.x) || p.x - q.x);
      const free = (x) => x >= -xmax && x <= xmax && obs.every((q) => Math.hypot(x - q.x, y - q.y) >= r + q.r + 1);
      for (let i = 0; i < cnt; i++) {
        // เกาะลวดริมนอกสุดก่อน (ซ้ายสุด/ขวาสุดสลับกัน) ถัดไปค่อยเกาะเส้นในๆ — ถึงเส้นในสุดเมื่อเหล็กมีมาก; วางด้านใน (หันเข้าแกน) ของลวด ห่างขอบลวด 1.5 มม.
        const w = rowW[i % rowW.length] || { x: 0, y, r: 0 }, dx = Math.sqrt(Math.max(0, (r + w.r + 1.5) ** 2 - (y - w.y) ** 2)), dirs = w.x <= 0 ? [1, -1] : [-1, 1];
        let x = null;
        for (const dr of dirs) { for (let s = 0; s <= 40 && x === null; s++) { const c = w.x + dr * (dx + s); if (free(c)) x = c; } if (x !== null) break; }
        if (x === null) { const ideal = -xmax + ((i + 0.5) * 2 * xmax) / cnt; for (let s = 0; s <= xmax * 2 && x === null; s++) for (const t of [ideal + s, ideal - s]) if (free(t)) { x = t; break; } }
        x = x ?? 0; obs.push({ x, y, r }); o += circ(x, y, r, INK);
      }
    });
  });
  const x0 = X(-hb), x1 = X(hb), y0 = Y(-hb), y1 = Y(hb);
  // ขนาดแนวตั้งด้านซ้าย: 0.065 0.020 0.050 0.020 0.065 และ 0.22
  const sl = G.sq ? 0 : (G.B - 2 * G.f - G.c) / 2, dv = G.sq ? [[0, 35], [G.B - 35, G.B]] : [[0, G.f], [G.f, G.f + sl], [G.f + sl, G.f + sl + G.c], [G.f + sl + G.c, G.B - G.f], [G.B - G.f, G.B]], dx = x0 - 26, lab = G.sq ? ["0.035", "0.035"] : [cm3(G.f), cm3(sl), cm3(G.c), cm3(sl), cm3(G.f)];
  dv.forEach(([a, b], i) => { o += dimV(dx, y0 + a * s, y0 + b * s, ""); o += T(dx - 6, y0 + ((a + b) / 2) * s + 4.5, lab[i], { size: 13, anchor: "end" }); });
  o += dimV(dx - 56, y0, y1, "") + T(dx - 62, cy + 4.5, c2(G.B), { size: 14, anchor: "end" });
  // ขนาดแนวนอนด้านล่าง
  const yd = y1 + 26;
  (G.sq ? [[0, 35, "0.035"], [35, 70, "0.035"], [G.B - 35, G.B, "0.035"]] : [[0, G.dg, cm3(G.dg)], [G.dg, G.dg + G.tw, G.B === 220 ? c2(G.tw) : cm3(G.tw)], [G.dg + G.tw, G.B, cm3(G.dg)]]).forEach(([a, b, t], i) => { o += dimH(x0 + a * s, x0 + b * s, yd, "") + T(x0 + ((a + b) / 2) * s, G.sq && i === 1 ? yd - 6 : yd + 16, t, { size: 13 }); }); // เสาสี่เหลี่ยม: ตัวเลขช่วงที่ 2 อยู่เหนือเส้น ไม่ชนช่วงแรกและเส้นขนาดรวม
  o += dimH(x0, x1, yd + 24, "") + T(cx, yd + 40, c2(G.B), { size: 14 });
  o += T(cx - 34, yd + 62, "SECTION", { size: 16 }) + T(cx + 50, yd + 62, `${letter}-${letter}`, { size: 16 }) + L(cx - 76, yd + 67, cx + 84, yd + 67, 0.9);
  // ป้ายชี้: เส้นใต้ตัวหนังสือยาวไปทางขวา เส้นชี้เฉียงลงที่ลวด หัวลูกศรทึบ
  const xT = x1 + 36, TL = 138;
  // เส้นชี้ทุกเส้นเอียงมุมเดียวกัน (60° จากแนวนอน) เริ่มจากเส้นใต้ตัวหนังสือไปทางขวาของจุดที่ชี้ เพื่อความเป็นระเบียบ
  const ANG = Math.tan((60 * Math.PI) / 180);
  const row = (yL, label, leaders, xs0) => {
    const pts = leaders.map(([, tx, ty]) => [tx + Math.abs(ty - yL) / ANG, tx, ty]);
    const from = xs0 !== undefined ? xs0 : Math.min(...pts.map((l) => l[0]));
    let r = L(from, yL, xT + TL, yL, 0.9) + T(xT, yL - 4, label, { size: 15, anchor: "start" });
    pts.forEach(([sx, tx, ty]) => { r += L(sx, yL, tx, ty, 0.8) + tri(tx, ty, (Math.atan2(ty - yL, tx - sx) * 180) / Math.PI, 8); });
    return r;
  };
  // ไม่ใช้ป้ายชี้ลวด/DB: ใช้สัญลักษณ์ + legend (ประหยัดพื้นที่) ปลอกยังใช้ป้ายชี้ตรงๆ
  const lx = x1 + 24, ly0 = y0 + 10, stp = 20, sy1 = (k) => ly0 + k * stp;
  const symW4 = (yy) => `<circle cx="${lx + 8}" cy="${yy - 4}" r="4" fill="#fff" stroke="${INK}" stroke-width="1"/>`;
  const symW5 = (yy) => [0, 60, 120].map((a2) => { const t = (a2 * Math.PI) / 180; return L(lx + 8 - Math.cos(t) * 6, yy - 4 - Math.sin(t) * 6, lx + 8 + Math.cos(t) * 6, yy - 4 + Math.sin(t) * 6, 1); }).join("");
  const symDB = (yy) => `<circle cx="${lx + 8}" cy="${yy - 4}" r="4.5" fill="${INK}"/>`;
  const legend = [];
  if (simple) legend.push([null, "PC.WIRE ดูตาราง"]);
  else if (pcSame) legend.push([null, "PC.WIRE เหมือน A-A"]);
  else { if (lay.n4) legend.push([symW4, `${lay.n4}-PC.WIRE 4mm.`]); if (lay.n5) legend.push([symW5, `${lay.n5}-PC.WIRE 5mm.`]); }
  ex.forEach((e) => {
    // ความยาวเหล็ก: ระบุเอง = ตามนั้น • เต็มท่อน = ความยาวของท่อนที่ใช้เหล็กนี้ ถ้าหลายท่อนยาวไม่เท่ากัน = "เต็มท่อน" (ดูความยาวในภาพด้านข้าง)
    const ls = [...new Set(plan.pieces.filter((p) => p.extras && p.extras.includes(e) && p.len && (!p.cfg || p.cfg === letter)).map((p) => p.len))];
    legend.push([symDB, e.len ? `${e.n}-DB${e.d}x${m2(e.len)}m.` : `${e.n}-DB${e.d}x${ls.map(m2).join("/")}m.`]);
  });
  legend.forEach(([sym, t], i) => { const yy = sy1(i); if (sym) o += sym(yy); o += T(lx + (sym ? 28 : 0), yy, t, { size: 15, anchor: "start" }); });
  // ปลอก: เส้นนอนชี้เข้าที่เส้นปลอกด้านข้างเอว
  const xCD = x1 + 36;
  const spr = plan.sec.spiral, wTxt = spr.wire.toFixed(1), stpf = (v) => String(Math.round(v * 10000) / 10000);
  const xTip = G.sq ? hb - 30 : G.tw / 2 - 22;
  o += L(X(xTip) + 4, cy, xCD + 150, cy, 0.9) + tri(X(xTip), cy, 180, 5) + T(xCD, cy + 17, `CDØ${wTxt}mm.@${stpf(spr.midStep).padEnd(4, "0")}m.`, { size: 15, anchor: "start" }); // ปลายลูกศรชี้กลางเอว (กึ่งกลางความสูงเสา) เส้นอยู่ต่ำกว่าตัวหนังสือเล็กน้อย
  return o;
}

// DETAIL OF PC.WIRES: ตำแหน่งลวดเทียบขอบเสา — แถวบน/ล่างวัดจากขอบด้านเดียวกันกับที่ลวดอยู่ ทุกช่วง 0.035 ม. (เส้นบอกระยะแยกอยู่นอกตัวเสา มีเส้นต่อจากลวดชัดเจน)
function wiresDetail(cx, cy, s, lay = wireLayout(4, 2)) {
  if (lay.std) return wiresDetailStd(cx, cy, s);
  const HBv = HB(), W35 = HBv - 35;
  let o = `<polygon points="${secPts(PILE22, cx, cy, s)}" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
  lay.w4.forEach(([x, y]) => { o += `<circle cx="${f1(cx + x * s)}" cy="${f1(cy + y * s)}" r="${f1(3.5 * s)}" fill="#fff" stroke="${INK}" stroke-width="1"/>`; });
  lay.w5.forEach(([x, y]) => { o += `<circle cx="${f1(cx + x * s)}" cy="${f1(cy + y * s)}" r="${f1(2.2 * s)}" fill="${INK}"/>`; });
  const X = (mm) => cx + mm * s, Y = (mm) => cy + mm * s, x0 = X(-HBv), x1 = X(HBv), y0 = Y(-HBv), y1 = Y(HBv), ft = 8;
  const per = lay.per, nl = lay.br ?? Math.floor(per / 2), nr = lay.bl ?? Math.ceil(per / 2); // แถวบน: ซ้าย nl เส้น (วัดจากขอบซ้าย) ขวา nr เส้น (วัดจากขอบขวา) • แถวล่างสลับข้าง
  const dimS = (xa, xb, yd, yRef, lift = 0, below = false, txt = "0.035") => L(xa, yRef, xa, yd + (below ? 5 : -5), 0.6) + L(xb, yRef, xb, yd + (below ? 5 : -5), 0.6) + dimH(xa, xb, yd, "", {}) + (lift > 0 ? L((xa + xb) / 2, yd, (xa + xb) / 2, below ? yd + 11 + lift - ft : yd - 5 - lift + 2, 0.5) : "") + T((xa + xb) / 2, below ? yd + 11 + lift : yd - 5 - lift, txt, { size: ft - 1 }); // ตัวเลขที่ยกสูง ลากเส้นชี้จากเส้นบอกระยะ (แบบ AutoCAD) ไม่จำเป็นต้องอยู่กลางช่วง
  // ใส่ระยะ 0.035 ทุกช่วงตามตำแหน่งลวดจริง (สลับความสูงตัวเลขไม่ให้ชนกัน)
  const pp = lay.pitch || 35, off = (i) => (i === 0 ? 0 : 35 + pp * (i - 1)); // ตำแหน่งลวดที่ i = 35 + pp×i จากขอบ
  const chain = (x0c, dir, n, yd, yRef, below) => { let o2 = ""; if (n < 2) return o2; /* ลวดเส้นเดียวในฝั่ง ไม่ลงระยะแนวนอน (เหมือนแบบ I-22) */ for (let i = 0; i < n; i++) o2 += dimS(X(x0c + dir * off(i)), X(x0c + dir * (35 + pp * i)), yd, yRef, (i % 2) * 9, below, i === 0 ? "0.035" : (pp / 1000).toFixed(3)); return o2; };
  o += chain(-HBv, 1, nl, y0 - 26, Y(-W35), false) + chain(HBv, -1, nr, y0 - 26, Y(-W35), false);
  o += chain(-HBv, 1, nr, y1 + 26, Y(W35), true) + chain(HBv, -1, nl, y1 + 26, Y(W35), true);
  const vd = (xd, ya, yb, ref) => L(ref, ya, xd + 5, ya, 0.6) + L(ref, yb, xd + 5, yb, 0.6) + dimV(xd, ya, yb, "") + T(xd + 7, (ya + yb) / 2 + 3.5, "0.035", { size: ft, anchor: "start" });
  o += vd(x1 + 28, y0, Y(-W35), x1);
  o += `<g>${dimV(x0 - 28, Y(W35), y1, "")}${L(x0, Y(W35), x0 - 33, Y(W35), 0.6)}${L(x0, y1, x0 - 33, y1, 0.6)}${T(x0 - 35, (Y(W35) + y1) / 2 + 3.5, "0.035", { size: ft, anchor: "end" })}</g>`;
  o += T(cx, y1 + 88, "DETAIL OF PC.WIRES", { size: 16 }) + L(cx - 98, y1 + 93, cx + 98, y1 + 93, 0.9); // ชื่อภาพอยู่แนวเดียวกับ SECTION A-A ขนาดตัวอักษรเท่ากัน
  return o;
}

function wiresDetailStd(cx, cy, s) {
  const HBv = HB(), W35 = HBv - 35;
  let o = `<polygon points="${secPts(PILE22, cx, cy, s)}" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
  wireLayout(4, 2, PILE22.B).w4.forEach(([x, y]) => { o += `<circle cx="${f1(cx + x * s)}" cy="${f1(cy + y * s)}" r="${f1(3.5 * s)}" fill="#fff" stroke="${INK}" stroke-width="1"/>`; });
  wireLayout(4, 2, PILE22.B).w5.forEach(([x, y]) => { o += `<circle cx="${f1(cx + x * s)}" cy="${f1(cy + y * s)}" r="${f1(2.2 * s)}" fill="${INK}"/>`; });
  const X = (mm) => cx + mm * s, Y = (mm) => cy + mm * s, x0 = X(-HBv), x1 = X(HBv), y0 = Y(-HBv), y1 = Y(HBv), ft = 7.5; // ตัวเลขเล็กพอดีช่วง 0.035 ไม่ชนกัน
  const seg = (xa, xb, yd, yWire, edgeY, lift = 0) => L(xa, edgeY, xa, yd + (yd < edgeY ? -5 : 5), 0.6) + L(xb, yWire, xb, yd + (yd < edgeY ? -5 : 5), 0.6) + dimH(xa, xb, yd, "", {}) + T((xa + xb) / 2, yd - 5 - lift, "0.035", { size: ft });
  // บน: ขอบซ้าย → ลวด 4 มม. → ลวด 5 มม. (35 + 35)
  o += seg(x0, X(-W35), y0 - 26, Y(-W35), y0) + seg(X(-W35), X(-HBv + 70), y0 - 26, Y(-W35), y0);
  // ล่าง: ขอบขวา → ลวด 4 มม. → ลวด 5 มม.
  o += seg(x1, X(W35), y1 + 30, Y(W35), y1).replace(/y="(S+)"/, (m) => m) + seg(X(W35), X(HBv - 70), y1 + 30, Y(W35), y1);
  // แนวตั้ง: ขอบบน → ลวดบน (ขวา) • ขอบล่าง → ลวดล่าง (ซ้าย)
  const vd = (xd, ya, yb, ref) => L(ref, ya, xd + 5, ya, 0.6) + L(ref, yb, xd + 5, yb, 0.6) + dimV(xd, ya, yb, "") + T(xd + 7, (ya + yb) / 2 + 3.5, "0.035", { size: ft, anchor: "start" });
  o += vd(x1 + 28, y0, Y(-W35), x1);
  o += `<g>${dimV(x0 - 28, Y(W35), y1, "")}${L(x0, Y(W35), x0 - 33, Y(W35), 0.6)}${L(x0, y1, x0 - 33, y1, 0.6)}${T(x0 - 35, (Y(W35) + y1) / 2 + 3.5, "0.035", { size: ft, anchor: "end" })}</g>`;
  o += T(cx, y1 + 88, "DETAIL OF PC.WIRES", { size: 16 }) + L(cx - 98, y1 + 93, cx + 98, y1 + 93, 0.9); // ชื่อภาพอยู่แนวเดียวกับ SECTION A-A ขนาดตัวอักษรเท่ากัน
  return o;
}

function stirrupDetail(cx, cy, s) {
  const sd = PILE22.B - 70, k = sd / PILE22.B; // ปลอก = หน้าตัดเล็กลง 70 มม. (I-22 = 0.150)
  let o = `<polygon points="${(PILE22.sq ? [[-PILE22.B / 2 + 35, -PILE22.B / 2 + 35], [PILE22.B / 2 - 35, -PILE22.B / 2 + 35], [PILE22.B / 2 - 35, PILE22.B / 2 - 35], [-PILE22.B / 2 + 35, PILE22.B / 2 - 35]].map(([x, y]) => [x / k, y / k]) : pilePoly(PILE22)).map(([x, y]) => `${f1(cx + x * k * s)},${f1(cy + y * k * s)}`).join(" ")}" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
  const x1 = cx + (sd / 2) * s, y0 = cy - (sd / 2) * s, y1 = cy + (sd / 2) * s;
  o += dimV(x1 + 22, y0, y1, "", {}) + T(x1 + 26, cy + 4, cm3(sd), { size: 10, anchor: "start" });
  o += dimH(cx - 7.5 * s, cx + 7.5 * s, y1 + 14, "", {}) + T(cx, y1 + 28, "0.015", { size: 9.5 });
  o += T(cx, y1 + 46, "DETAIL OF STIRRUP", { size: 10.5 }) + L(cx - 55, y1 + 49, cx + 55, y1 + 49, 0.9);
  return o;
}

function liftingPoints(x0, y0, w) {
  const a = 0.207 * w;
  let o = `<rect x="${x0}" y="${y0 + 22}" width="${w}" height="16" fill="none" stroke="${INK}" stroke-width="1.1"/>`;
  [x0 + a, x0 + w - a].forEach((x) => { o += L(x, y0 + 16, x, y0 + 44, 1.1); });
  o += dimH(x0, x0 + a, y0 + 8, "0.207L", { size: 9.5 }) + dimH(x0 + w - a, x0 + w, y0 + 8, "0.207L", { size: 9.5 });
  o += dimH(x0, x0 + w, y0 + 60, "", {}) + T(x0 + w / 2, y0 + 56, "LENGTH OF PILE", { size: 10.5 });
  o += `<rect x="${x0 - 10}" y="${y0 + 74}" width="${w + 20}" height="22" fill="none" stroke="${INK}" stroke-width="0.9"/>` + T(x0 + w / 2, y0 + 89, "LIFTING POINT FOR PRE-STRESS CONCRETE PILE", { size: 10 });
  return o;
}

// แผ่นเหล็กหัวต่อ (มองหน้าแผ่น): โครงหน้าตัดไอ + เหล็กเดือย DB ครึ่งบน/ครึ่งล่าง (ห่างขอบ ~45 มม. ห่างกัน 70 มม.) ป้ายชี้เอียง 60° ขนานกัน
const TAN60 = Math.tan((60 * Math.PI) / 180);
const capLine = (x, y, txt, size = 14) => T(x, y, txt, { size, anchor: "start" }) + L(x - 8, y + 4, x + txt.length * size * 0.6 + 6, y + 4, 0.9); // ชื่อภาพ + เส้นใต้ยาวเต็มตัวหนังสือเสมอ
const capMid = (cx, y, txt, size = 14) => { const w = txt.length * size * 0.6; return T(cx, y, txt, { size }) + L(cx - w / 2 - 8, y + 4, cx + w / 2 + 8, y + 4, 0.9); }; // ชื่อภาพกึ่งกลางภาพ
const tw = (txt, size = 14) => txt.length * size * 0.47 + 18; // ความยาวเส้นใต้ตัวหนังสือให้พอดีข้อความ
function dowelPts(dowel) {
  if (PILE22.sq) { // เสาสี่เหลี่ยม: เหล็กเดือยวางตามมุม/กึ่งกลางด้าน/กลางแผ่น ตามจำนวน (4 มุม • 5 +กลาง • 6 +กลางบนล่าง • 7 +กลาง • 8 รอบ • 9 +กลาง)
    const n = dowel ? dowel.n : 4, a = PILE22.B / 2 - (PILE22.dIn || 55), pts = [[-a, -a], [a, -a], [-a, a], [a, a]];
    if (n === 5) pts.push([0, 0]);
    if (n >= 6) pts.push([-a * 0.3, -a], [a * 0.3, a]); // เหล็กกลางแถวบน/ล่างเยื้องสลับกัน (ไวร์จี้ปูนต้องลงได้)
    if (n === 7) pts.push([0, 0]);
    if (n >= 8) pts.push([-a, 0], [a, 0]);
    if (n >= 9) pts.push([0, 0]);
    const top = pts.filter((p) => p[1] < 0), bot = pts.filter((p) => p[1] >= 0);
    return { top, bot, nTop: top.length, nBot: bot.length };
  }
  const top = dowel ? Math.floor(dowel.n / 2) : 2, bot = dowel ? dowel.n - top : 2, hb = PILE22.B / 2, /* เหล็กคี่: เส้นกลางอยู่แถวล่าง (แถวล่างมากกว่าแถวบน 1 เส้น) */ pitch = Math.min((70 * PILE22.B) / 220, (PILE22.B - 110) / Math.max(1, Math.max(top, bot) - 1)), W = (Math.max(top, bot) - 1) * pitch / 2, xs = (k) => Array.from({ length: k }, (_, i) => (k > 1 ? -W + (i * 2 * W) / (k - 1) : 0)), ry = hb - 45; // ทั้งสองแถวกางเท่ากัน: เหล็กมุมบน/ล่างตรงกัน (เช่น 5 เส้น = 3 บน, ล่าง 2 เส้นที่มุม)
  const sh = pitch * 0.3, tx = xs(top).map((x) => (top >= 3 && top % 2 === 1 && bot >= 3 && bot % 2 === 1 && Math.abs(x) < 1e-6 ? -sh : x)), bx = xs(bot).map((x) => (top >= 3 && top % 2 === 1 && bot >= 3 && bot % 2 === 1 && Math.abs(x) < 1e-6 ? sh : x)); // เหล็กตรงกลางแถวบน/ล่างเยื้องสลับกัน ไม่ให้ไวร์จี้ปูนติด
  return { top: tx.map((x) => [x, -ry]), bot: bx.map((x) => [x, ry]), nTop: top, nBot: bot };
}
export function weldingPlate(dowel, cx, cy, s, subtitle, compact = false) {
  const P = dowelPts(dowel), lbl = (k) => (dowel ? `${k}DB${dowel.d}mm.x${Math.round(dowel.len * 100)}cm.` : "ดูตามตาราง");
  // collar หนา 3 × กว้าง 50 มม. เป็นแถบรอบขอบเพลท (วาดหนาเกินจริงให้เห็น) ตัดด้วย clipPath ให้อยู่ในขอบ
  const cid = "cl" + Math.round(cx * 7 + cy * 13), pg = secPts(PILE22, cx, cy, s);
  let o = `<defs><clipPath id="${cid}"><polygon points="${pg}"/></clipPath></defs><polygon points="${pg}" fill="#fff"/><polygon points="${pg}" fill="none" stroke="#555" stroke-width="11" clip-path="url(#${cid})"/><polygon points="${pg}" fill="none" stroke="${INK}" stroke-width="1.4"/>`;
  [...P.top, ...P.bot].forEach(([x, y]) => { o += `<circle cx="${f1(cx + x * s)}" cy="${f1(cy + y * s)}" r="${f1(5 * s)}" fill="#fff" stroke="${INK}" stroke-width="1"/>`; });
  const xr = cx + HB() * s, tx = xr + 40;
  if (compact) {
    // สัญลักษณ์ + legend แทนป้ายชี้ (เหมือนหน้าตัด) ชื่อภาพอยู่ใต้รูป
    const lx = xr + 24, y0l = cy - HB() * s + 12, rows = [
      [`<circle cx="${lx + 8}" cy="${y0l - 4}" r="4" fill="#fff" stroke="${INK}" stroke-width="1"/>`, dowel ? `${dowel.n}DB${dowel.d}mm.x${Math.round(dowel.len * 100)}cm.` : "ดูตามตาราง"],
      [`<rect x="${lx}" y="${y0l + 16 - 8}" width="16" height="7" fill="#555" stroke="${INK}" stroke-width="0.8"/>`, "COLLAR 3x50mm."],
      [`<rect x="${lx}" y="${y0l + 36 - 8}" width="16" height="7" fill="#fff" stroke="${INK}" stroke-width="1.2"/>`, "PLATE 9mm."],
    ];
    rows.forEach(([sym, t], i) => { o += sym + T(lx + 26, y0l + i * 20, t, { size: 14, anchor: "start" }); });
    o += capMid(cx, cy + HB() * s + 28, "WELDING PLATE" + (subtitle ? ` (${subtitle})` : ""));
    return o;
  }
  // ป้ายเส้นใต้ตัวหนัง: เรียงบนลงล่าง RING PLATE → 2DB (บน) → PLATE → 2DB (ล่าง)
  const row = (yL, txt, targets, from) => {
    const pts = targets.map(([px, py]) => [px + Math.abs(py - yL) / TAN60, px, py]), x0 = from !== undefined ? from : Math.min(...pts.map((p) => p[0]));
    let r = L(x0, yL, tx + tw(txt), yL, 0.9) + T(tx, yL - 4, txt, { size: 14, anchor: "start" });
    pts.forEach(([sx, px, py]) => { r += L(sx, yL, px, py, 0.8) + tri(px, py, (Math.atan2(py - yL, px - sx) * 180) / Math.PI, 7); });
    return r;
  };
  const yTopEdge = cy - HB() * s, yBotEdge = cy + HB() * s;
  o += row(yTopEdge - 50, "COLLAR 3x50mm.", [[cx - 80 * s, yTopEdge + 2.5]]);
  o += row(yTopEdge - 22, lbl(P.nTop), P.top.map(([x, y]) => [cx + x * s, cy + y * s - 2]));
  o += L(cx + 20 * s, cy, tx - 4, cy, 0.9) + tri(cx + 20 * s, cy, 180, 7) + T(tx, cy - 4, "PLATE 9mm.", { size: 14, anchor: "start" }) + L(tx - 4, cy, tx + tw("PLATE 9mm."), cy, 0.9);
  o += row(yBotEdge + 24, lbl(P.nBot), P.bot.map(([x, y]) => [cx + x * s, cy + y * s + 2]));
  o += capMid(cx, yBotEdge + 58, "WELDING PLATE" + (subtitle ? ` (${subtitle})` : ""));
  return o;
}

// แผ่นเหล็กหัวต่อ (ด้านข้าง): แผ่นเหล็ก 9 มม. + ปลอกริง (COLLAR) 3 มม. ต่อจากแผ่นเข้าไปด้านในเสา (ลึก COLLAR_D) เหล็กเดือยเชื่อมกับแผ่นและยื่นเลยปลอกริง
const COLLAR_D = 50; // มม. collar มาตรฐาน หนา 3 กว้าง 50 (ความลึกจากหน้าแผ่นเข้าไปในเสา)
export function weldSide(dowel, x, y, s, compact = false, noLab = false) {
  const h = PILE22.B * s, P = dowelPts(dowel), pw = Math.max(7, 9 * s), cd = COLLAR_D * s, wall = Math.max(2.4, 3 * s), len = dowel ? dowel.len * 1000 * s : 300 * s, x0 = x + pw + cd, tx = x0 + len + 24;
  // แผ่นเหล็ก 9 มม. (ซ้าย) + ปลอกริงยื่นเข้าด้านใน (ขวา) มีผนังหนา 3 มม. ด้านบน/ล่าง
  let o = `<rect x="${x}" y="${y}" width="${pw}" height="${h}" fill="#fff" stroke="${INK}" stroke-width="1.5"/><rect x="${x + pw}" y="${y}" width="${cd}" height="${h}" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`;
  o += L(x + pw, y + wall, x + pw + cd, y + wall, 0.9) + L(x + pw, y + h - wall, x + pw + cd, y + h - wall, 0.9);
  const yT = y + 45 * s, yB = y + (PILE22.B - 45) * s;
  // เหล็กข้ออ้อย DB: แท่งขนาดตามจริงเกินเล็กน้อย พื้นขาว ขอบดำ รอยข้อเฉียงเรียงเท่ากัน
  const bt = Math.max(7, (dowel ? dowel.d : 12) * s * 0.9);
  const deformed = (xa, xb, yc) => { let r = `<rect x="${f1(xa)}" y="${f1(yc - bt / 2)}" width="${f1(xb - xa)}" height="${f1(bt)}" fill="#fff" stroke="${INK}" stroke-width="1.2"/>`; for (let px = xa + 5; px < xb - 3; px += 7) r += L(px, yc - bt / 2, px + bt * 0.55, yc + bt / 2, 0.8); return r + L(xa, yc, xb, yc, 0.6); };
  o += deformed(x + pw, x0 + len, yT) + deformed(x + pw, x0 + len, yB);
  const row = (yL, txt, targets) => {
    const pts = targets.map(([px, py]) => [px + Math.abs(py - yL) / TAN60, px, py]);
    const xe = Math.max(...pts.map((p) => p[0])) + 6;
    let r = L(Math.min(...pts.map((p) => p[0])), yL, xe + tw(txt), yL, 0.9) + T(xe, yL - 4, txt, { size: 14, anchor: "start" }); // ตัวหนังสือชิดปลายเส้นชี้
    pts.forEach(([sx, px, py]) => { r += L(sx, yL, px, py, 0.8) + tri(px, py, (Math.atan2(py - yL, px - sx) * 180) / Math.PI, 7); });
    return r;
  };
  const lab = (k) => (dowel ? `${k}DB${dowel.d}mm.x${Math.round(dowel.len * 100)}cm.` : "ดูตาราง"); // แบบเต็ม: เหล็กเดือยขึ้นกับความยาว ให้ดูตาราง
  if (compact) { (noLab ? [] : [[yT, P.nTop], [yB, P.nBot]]).forEach(([yy2, k]) => { o += T(x0 + len / 2 + 10, yy2 - bt / 2 - 6, lab(k), { size: 14 }); /* ป้ายอยู่เหนือเหล็กแต่ละแถว ไม่ล้นไปชนตาราง */ }); return o + capLine(x - 20, y + h + 28, "WELDING PLATE SID VIEW"); }
  o += row(yT - 26, lab(P.nTop), [[x0 + len * 0.3, yT]]);
  o += L(x + pw / 2, y + h / 2, x0 + 14, y + h / 2, 0.9) + tri(x + pw / 2, y + h / 2, 180, 7) + T(x0 + 20, y + h / 2 - 4, "PLATE 9mm.", { size: 14, anchor: "start" }) + L(x0 + 14, y + h / 2, x0 + 20 + tw("PLATE 9mm."), y + h / 2, 0.9);
  o += row(yB + 28, lab(P.nBot), [[x0 + len * 0.3, yB]]);
  o += row(y + h + 46, "COLLAR 3x50mm.", [[x + pw + cd * 0.6, y + h - 1]]);
  o += capLine(x - 20, y + h + 80, "WELDING PLATE SID VIEW");
  return o;
}

// แบบขยายบ่า: ภาพที่ 1 ด้านข้าง (ร่องข้างเสาถูกถมเป็นบ่า) • ภาพที่ 2 รูปตัดแนวนอนผ่านกลางร่อง (มองจากด้านบน) เห็นเหล็กวางขวาง 3 เส้น
// เหล็กในบ่า = ท่อนสั้นวางขวางความกว้างเสา: ด้านข้างเห็นเป็นวงกลม 3 จุด ด้านบนเห็นเป็นเส้น 3 เส้น (ระยะหุ้ม 0.05 ที่ปลาย เว้นเท่ากัน)
export function shoulderDetail(sh, x, y) {
  const TAN = Math.tan((60 * Math.PI) / 180), kx = 84 / sh.a, /* px/m */ aW = sh.a * kx, bW = sh.b * kx;
  const nb = sh.bars, gap = (sh.a - 2 * sh.cover) / (nb - 1), posM = Array.from({ length: nb }, (_, i) => sh.cover + i * gap), edges = [0, ...posM, sh.a];
  let o = "";
  // ===== แบบขยาย (ด้านข้าง): ขอบปีก 65/85 และ 135/155 มม. จากหน้าตัด A-A, บ่าถมปากร่องถึงปากร่อง (65–155) =====
  {
    const sc = kx, w = 440, top = y + 46, xl = x + 20, xr = x + w + 20, bx = x + 140, mmy = (mm) => top + (mm / 1000) * sc;
    const ys = [0, 65, 85, 135, 155, 220].map(mmy), bot = ys[5], cy = (ys[1] + ys[4]) / 2, fl1 = (ys[0] + ys[1]) / 2, xe = bx + aW + bW;
    // ลำดับความลึก: ปีกเสา = ขาว • ลาดปากร่อง = เทาอ่อน • ท้องร่อง = เทากลาง
    o += `<rect x="${xl}" y="${ys[1]}" width="${xr - xl}" height="${ys[2] - ys[1]}" fill="#ECECEA"/><rect x="${xl}" y="${ys[2]}" width="${xr - xl}" height="${ys[3] - ys[2]}" fill="#DADAD6"/><rect x="${xl}" y="${ys[3]}" width="${xr - xl}" height="${ys[4] - ys[3]}" fill="#ECECEA"/>`;
    // เส้นขอบนอกหนา เส้นร่องบาง
    [0, 5].forEach((i) => { o += L(xl, ys[i], xr, ys[i], 1.5); });
    [1, 2, 3, 4].forEach((i) => { o += L(xl, ys[i], xr, ys[i], 0.8); });
    [xl, xr].forEach((xx) => { o += `<polyline points="${xx},${top - 8} ${xx - 8},${top + 22} ${xx + 6},${top + 46} ${xx - 8},${top + 70} ${xx},${bot + 8}" fill="#fff" stroke="${INK}" stroke-width="1"/>`; });
    // ระยะบ่าจากหัวเสา
    o += dimH(xl, bx, y + 22, `ระยะบ่าจากหัวเสา ${m2(sh.at)} m.`, { size: 13 }) + L(bx, y + 28, bx, ys[1], 0.8, 'stroke-dasharray="3 2"');
    // บ่า (ปิดเส้นร่องด้านใน) + ปลายลาด
    o += `<rect x="${bx}" y="${ys[1]}" width="${aW}" height="${ys[4] - ys[1]}" fill="#fff"/><rect x="${bx}" y="${ys[1]}" width="${aW}" height="${ys[4] - ys[1]}" fill="url(#stipple)" stroke="${INK}" stroke-width="1.3"/>`;
    const tp = `${bx + aW},${ys[1]} ${xe},${ys[2]} ${xe},${ys[3]} ${bx + aW},${ys[4]}`;
    o += `<polygon points="${tp}" fill="#fff"/><polygon points="${tp}" fill="url(#stipple)" stroke="${INK}" stroke-width="1.3"/>`;
    // เหล็ก 3 จุด + ป้ายชี้ขนาน 60°
    const xsB = posM.map((m) => bx + m * kx);
    xsB.forEach((px) => { o += `<circle cx="${f1(px)}" cy="${f1(cy)}" r="3.8" fill="${INK}"/>`; });
    const ly = bot + 34, sxs = xsB.map((px) => px + (ly - cy) / TAN), tX = sxs[nb - 1] + 12;
    o += L(sxs[0], ly, tX + 80, ly, 0.9) + T(tX, ly - 5, `${sh.bars}-DB${sh.d}mm.`, { size: 14, anchor: "start" });
    xsB.forEach((px, i) => { o += L(sxs[i], ly, px + 1.5, cy + 5, 0.8) + tri(px + 1.5, cy + 5, (Math.atan2(cy + 5 - ly, px + 1.5 - sxs[i]) * 180) / Math.PI, 7); });
    // ป้ายส่วนต่างๆ ทางขวา (ลูกศรชี้ปีกเสา / ลาด / ท้องร่อง)
    const tx = xe + 56, tag = (ty, txt, tgY) => L(tx - 6, ty, xe + 14, tgY, 0.8) + tri(xe + 14, tgY, (Math.atan2(tgY - ty, xe + 14 - (tx - 6)) * 180) / Math.PI, 6) + T(tx, ty + 4, txt, { size: 12, anchor: "start", halo: true });
    o += tag(fl1, "ปีกเสา", fl1) + tag(cy, "ร่องข้างเสา", cy) + tag((ys[4] + bot) / 2, "ปีกเสา", (ys[4] + bot) / 2); // ป้ายอยู่กลางแถบแต่ละส่วน ไม่ทับเส้น
    edges.slice(0, -1).forEach((m, i) => { o += dimH(bx + m * kx, bx + edges[i + 1] * kx, bot + 66, "", {}) + T(bx + ((m + edges[i + 1]) / 2) * kx, bot + 61, m2(edges[i + 1] - m), { size: 9 }); });
    o += dimH(bx, bx + aW, bot + 90, "0.20", { size: 14 }) + dimH(bx + aW, xe, bot + 90, "0.10", { size: 14 });
  }
  o += T(x, y + 216, "แบบขยายบ่า", { size: 17, weight: 700, anchor: "start" }) + L(x, y + 221, x + 130, y + 221, 0.9);
  return o;
}

// ภาพ 3 มิติบ่า (ไม่แสดงเหล็ก) แบบไอโซเมตริก ตามภาพตัวอย่าง AutoCAD: เห็นหน้าตัดไอที่ปลายเสา (หน้าซ้าย) แกนเสาพุ่งขึ้นขวา
// บ่าเป็นบล็อกเม็ดทรายในร่องข้างเสาด้านที่เห็น ห่างจากหัวเสา at ยาว 0.20 ม. มีเส้นบอก 0.22 ความสูง/ความกว้าง และระยะบ่า
export function shoulder3D(sh, x, y, s = 0.36) {
  const P = pilePoly(PILE22), LZ = 680, zs = 230, CZ = 0.866, SZ = 0.5;
  const X0 = x + 56, Y0 = y + 36 + LZ * SZ * s;
  const pj = (z, u, v) => [X0 + (z * CZ + (u + 110) * CZ) * s, Y0 + (v + 110) * s - z * SZ * s + (u + 110) * SZ * s];
  const pt = (arr) => arr.map((q) => q.map((n) => f1(n)).join(",")).join(" ");
  const cx = P.reduce((a2, q) => a2 + q[0], 0) / P.length, cy = P.reduce((a2, q) => a2 + q[1], 0) / P.length;
  const w3 = [0.6, -0.8, -0.6]; // ทิศมาทางผู้ดู (u, v, z): เห็นด้าน +u ด้านบน และปลายเสา
  const faces = [];
  for (let i = 0; i < P.length; i++) {
    const a1 = P[i], b1 = P[(i + 1) % P.length], dx = b1[0] - a1[0], dy = b1[1] - a1[1], len = Math.hypot(dx, dy);
    if (len < 0.5) continue;
    let nx = dy / len, ny = -dx / len; const mx = (a1[0] + b1[0]) / 2, my = (a1[1] + b1[1]) / 2;
    if (nx * (mx - cx) + ny * (my - cy) < 0) { nx = -nx; ny = -ny; }
    const vis = nx * w3[0] + ny * w3[1];
    if (vis > 0.04) faces.push({ a1, b1, key: mx * w3[0] + my * w3[1], vis });
  }
  faces.sort((p, q) => p.key - q.key); // ไกลผู้ดูก่อน
  let o = "";
  const drawFace = (f) => {
    const g2 = Math.round(244 - 46 * (1 - Math.min(1, f.vis / 0.8)));
    return `<polygon points="${pt([pj(0, f.a1[0], f.a1[1]), pj(0, f.b1[0], f.b1[1]), pj(LZ, f.b1[0], f.b1[1]), pj(LZ, f.a1[0], f.a1[1])])}" fill="rgb(${g2},${g2},${g2 - 3})" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
  };
  // ผิวด้านไกล/ในร่องวาดก่อน แล้วบ่า+ส่วนลาด แล้วผิวปีกเสาด้านหน้าทับ (ส่วนลาดที่ลึกเข้าร่องต้องถูกขอบปีกเสาบังไม่ให้ทะลุเส้นเสา)
  faces.filter((f) => f.key < 100).forEach((f) => { o += drawFace(f); });
  // บ่า: บล็อกเม็ดทรายถมร่องด้านที่เห็น (u = +b) ยาว 0.20 ม. ที่ระยะ at จากหัวเสา
  const bb = 110, m = 45, wv = 40, hv = 25, z1 = zs, z2 = zs + sh.a * 1000, z3 = z2 + sh.b * 1000;
  const blk = pt([pj(z1, bb, -m), pj(z2, bb, -m), pj(z2, bb, m), pj(z1, bb, m)]);
  o += `<polygon points="${blk}" fill="#fff"/><polygon points="${blk}" fill="url(#stipple)" stroke="${INK}" stroke-width="1.5"/>`;
  // ส่วนลาด 0.10 ม.: ผิวบ่าลาดจากระดับปากร่อง (u = +b) ลงถึงก้นร่อง (u = +w) แคบลงจาก ±m เป็น ±h
  const rmp = pt([pj(z2, bb, -m), pj(z3, wv, -hv), pj(z3, wv, hv), pj(z2, bb, m)]);
  o += `<polygon points="${rmp}" fill="#fff"/><polygon points="${rmp}" fill="url(#stipple)" stroke="${INK}" stroke-width="1.4"/>`;
  faces.filter((f) => f.key >= 100).forEach((f) => { o += drawFace(f); });
  // หน้าตัดปลายเสา (เม็ดทราย) วาดหน้าสุด
  const end = pt(P.map(([u, v]) => pj(0, u, v)));
  o += `<polygon points="${end}" fill="#fff"/><polygon points="${end}" fill="url(#stipple)" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
  // เส้นบอกขนาด
  const arrow = (p1, p2, sz = 5) => L(p1[0], p1[1], p2[0], p2[1], 0.9) + tri(p1[0], p1[1], (Math.atan2(p1[1] - p2[1], p1[0] - p2[0]) * 180) / Math.PI, sz) + tri(p2[0], p2[1], (Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180) / Math.PI, sz);
  const sh0 = (p, dx, dy) => [p[0] + dx, p[1] + dy];
  // 0.22 ความสูง (ซ้ายของหน้าตัด)
  { const p1 = sh0(pj(0, -110, -110), -22, 0), p2 = sh0(pj(0, -110, 110), -22, 0);
    o += arrow(p1, p2) + L(p1[0] + 4, p1[1], pj(0, -110, -110)[0] - 2, p1[1], 0.6) + L(p2[0] + 4, p2[1], pj(0, -110, 110)[0] - 2, p2[1], 0.6) + T(p1[0] - 6, (p1[1] + p2[1]) / 2 + 5, "0.22", { size: 15, anchor: "end" }); }
  // 0.22 ความกว้าง (ใต้หน้าตัด ขนานแนว u)
  { const p1 = sh0(pj(0, -110, 110), -10, 22), p2 = sh0(pj(0, 110, 110), -10, 22), mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    o += arrow(p1, p2) + `<text x="${f1(mid[0] - 6)}" y="${f1(mid[1] + 20)}" font-size="15" text-anchor="middle" transform="rotate(30 ${f1(mid[0] - 6)} ${f1(mid[1] + 20)})" ${FONT}>0.22</text>`; }
  // ระยะบ่าจากหัวเสา (ขนานแกนเสา เหนือขอบบน)
  { const p1 = sh0(pj(0, -110, -110), -6, -12), p2 = sh0(pj(z1, -110, -110), -6, -12), mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    o += arrow(p1, p2) + `<text x="${f1(mid[0])}" y="${f1(mid[1] - 8)}" font-size="15" text-anchor="middle" transform="rotate(-30 ${f1(mid[0])} ${f1(mid[1] - 8)})" ${FONT}>${m2(sh.at)}m.</text>`; }
  // 0.20 ความยาวบ่า (ใต้บล็อก)
  { const p1 = sh0(pj(z1, bb, 110), 8, 20), p2 = sh0(pj(z2, bb, 110), 8, 20), mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    o += arrow(p1, p2) + `<text x="${f1(mid[0] + 6)}" y="${f1(mid[1] + 20)}" font-size="15" text-anchor="middle" transform="rotate(-30 ${f1(mid[0] + 6)} ${f1(mid[1] + 20)})" ${FONT}>0.20</text>`; }
  { const p1 = sh0(pj(z2, bb, 110), 8, 20), p2 = sh0(pj(z3, bb, 110), 8, 20), mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    o += arrow(p1, p2) + `<text x="${f1(mid[0] + 6)}" y="${f1(mid[1] + 20)}" font-size="15" text-anchor="middle" transform="rotate(-30 ${f1(mid[0] + 6)} ${f1(mid[1] + 20)})" ${FONT}>0.10</text>`; }
  { const ty = y + 36 + LZ * SZ * s + 220 * s * 1.5 + 54; o += T(x + 120, ty, "ภาพ 3 มิติบ่า", { size: 17, weight: 700, anchor: "start" }) + L(x + 120, ty + 5, x + 250, ty + 5, 0.9); }
  return o;
}

// รูปด้านท่อนเสา: ปลายละ 0.33 (@0.05) + 0.66 (@0.07) ส่วนกลาง (@0.17) — ไม่ได้มาตราส่วนจริง
export function elevation(plan, piece, y0, opts) {
  const ex = piece.extras || [], sp = plan.sec.spiral, X0 = 110, TW = 960, a = 56, b = 116, mid = TW - 2 * (a + b), yTop = y0 + 42, sh = 44, kk = sh / 220, my = (mm) => mm * kk; // my = มม. จริงของหน้าตัดเป็นพิกเซลแนวตั้ง
  const ls = piece.full ? "L = 1.00-20.00 m." : m2(piece.len);
  let o = "";
  // ตำแหน่งตามระยะจริงจากหัวเสา (เหล็กเสริม/บ่า): ช่วงซ้ายถึงรอยหักกลางใช้สเกลเดียวกับโซนปลอก 0.33/0.66 ส่วนที่เหลือย่อให้พอดีด้านขวา
  const k1 = (a + b) / (sp.endLen + sp.nearLen), mL = (TW / 2 - 30) / k1, cxF = X0 + TW / 2;
  const F = (m) => (piece.full || !piece.len ? X0 + TW : m <= mL ? X0 + m * k1 : piece.len <= mL ? X0 + TW : cxF + 30 + ((m - mL) / (piece.len - mL)) * (X0 + TW - (cxF + 30)));
  o += dimH(X0, X0 + TW, y0 + 4, "", {}) + T(X0 + TW / 2, y0 - 2, ls, { size: 15 }); // ความยาวรวมของท่อน อยู่เหนือเส้น 0.33/0.66
  const xs = [X0, X0 + a, X0 + a + b, X0 + a + b + mid, X0 + a + b + mid + b, X0 + TW];
  const mz = (v) => { const s = (Math.round(v * 1000) / 1000).toFixed(3); return s.endsWith("0") ? s.slice(0, -1) : s; }; // 0.525 / 0.33
  const labs = [mz(sp.endLen), mz(sp.nearLen), piece.full ? `L-${mz(2 * (sp.endLen + sp.nearLen))}` : mz(piece.mid), mz(sp.nearLen), mz(sp.endLen)];
  labs.forEach((t, i) => { o += dimH(xs[i], xs[i + 1], y0 + 26, t, { size: 13 }); });
  o += `<rect x="${X0}" y="${yTop}" width="${TW}" height="${sh}" fill="#fff" stroke="${INK}" stroke-width="1.4"/>`;
  // ปลอกเกลียว: เส้นตั้ง (ห่วง) + เส้นเฉียง จำนวนรอบต่อโซนตามระยะ @ ในมาตรฐาน (ปลาย @0.05, ใกล้ @0.07, กลาง @0.17)
  const nEnd = Math.round(sp.endLen / sp.endStep), nNear = Math.round(sp.nearLen / sp.nearStep), stMid = (b / nNear) * (sp.midStep / sp.nearStep);
  const nMid = Math.max(1, Math.round(mid / stMid));
  // ปลอกอยู่ห่างผิวเสา (ชิดริมลวด PC/เหล็ก DB ด้านนอก) ไม่ชิดขอบเสา
  const ins = my(25), yi0 = yTop + ins, yi1 = yTop + sh - ins;
  // flatA/flatB = จำนวนห่วงตั้งตรงที่หัวท่อน (ซ้าย/ขวา): ห่วงตั้งตรงสุดท้ายต่อกับเส้นเฉียงเส้นแรก ("2-CD" = 2 ห่วงปิดที่ปลายทั้งสองข้างเสมอ)
  const spiral = (xa, xb, n, flatA = 0, flatB = 0) => { let p = ""; const st = (xb - xa) / n; for (let k = 0; k < n; k++) { const x = xa + k * st, flat = k < flatA - 1 || k >= n - flatB + 1; p += L(x, yi0, x, yi1, 0.8) + (flat ? "" : L(x, yi0, x + st, yi1, 0.8)); } return p; };
  o += spiral(xs[0], xs[1], nEnd, 2, 0) + spiral(xs[1], xs[2], nNear) + spiral(xs[2], xs[3], nMid) + spiral(xs[3], xs[4], nNear) + spiral(xs[4], xs[5], nEnd, 0, 2) + L(X0 + TW, yi0, X0 + TW, yi1, 0.8);
  // หัวต่อเชื่อมเฉพาะด้านที่ต่อกับท่อนอื่น: ท่อนบนที่ปลายขวา ท่อนล่างที่ปลายซ้าย ท่อนกลาง (3 ท่อนขึ้นไป) ทั้งสองด้าน ท่อนเดี่ยวที่ปลายขวา
  // วาดเป็นแผ่นเหล็กทึบ + เหล็กเดือย (DB) 2 แนวยื่นเข้าไปในเสา
  const jointSides = [];
  if (plan.joint) {
    const n = plan.pieces.length, i = opts.idx || 0;
    if (n > 1 && i > 0) jointSides.push("L");
    if (n === 1 || i < n - 1) jointSides.push("R");
  }
  const dw = piece.rule && piece.rule.dowel, dpx = dw && piece.len ? Math.max(52, (dw.len / piece.len) * TW) : 52;
  jointSides.forEach((sd) => {
    const px = sd === "L" ? X0 : X0 + TW - 6, dir = sd === "L" ? 1 : -1, x0d = sd === "L" ? X0 + 6 : X0 + TW - 6;
    o += `<rect x="${px}" y="${yTop}" width="6" height="${sh}" fill="${INK}"/>`;
    [yTop + my(45), yTop + sh - my(45)].forEach((yy2) => { o += L(x0d, yy2, x0d + dir * dpx, yy2, 2.4) + L(x0d + dir * dpx, yy2 - 3, x0d + dir * dpx, yy2 + 3, 1.2); });
  });
  // ลวด PC ยาวตลอด (บนและล่าง)
  // ลวด PC (ห่างผิว 35 มม.) ยาวตลอด (ไม่มีเส้นร่องข้างเสากลางแถบ)
  { const wy = my(35), wy2 = ex.length ? 1.3 : 1.8; o += L(X0, yTop + wy, X0 + TW, yTop + wy, wy2) + L(X0, yTop + sh - wy, X0 + TW, yTop + sh - wy, wy2); }
  // รอยหักกลาง + จุดตัด A
  const cx = X0 + TW / 2;
  // เหล็กเสริมที่สั้นกว่าท่อน วาดถึงแค่รอยหักกลางภาพ (ไม่ข้ามรอยตัด) • เต็มท่อนวาดตลอด
  const barEnd = (len) => (!len || len >= piece.len - 1e-9 ? X0 + TW : Math.min(F(len), cx - 8));
  // รอยหัก (ภาพต่อ): เส้นโค้งตัว S คู่ขนานเรียบๆ พื้นขาวตรงกลางปิดเส้นปลอก
  let brk = "";
  { const by0 = yTop, by1 = yTop + sh, bh = by1 - by0, c1 = (dx) => `${f1(cx + dx)},${f1(by0)} C ${f1(cx + dx + 9)},${f1(by0 + bh * 0.3)} ${f1(cx + dx - 9)},${f1(by0 + bh * 0.7)} ${f1(cx + dx)},${f1(by1)}`;
    const lc = `M ${c1(-7)}`, rc = `M ${c1(7)}`, back = `L ${f1(cx + 7)},${f1(by1)} C ${f1(cx + 7 - 9)},${f1(by0 + bh * 0.7)} ${f1(cx + 7 + 9)},${f1(by0 + bh * 0.3)} ${f1(cx + 7)},${f1(by0)} Z`;
    brk += `<path d="${lc} ${back}" fill="#fff" stroke="none"/><path d="${lc}" fill="none" stroke="${INK}" stroke-width="1.2"/><path d="${rc}" fill="none" stroke="${INK}" stroke-width="1.2"/>`; }
  // จุดตัดหน้าตัด: มีเหล็กเสริม = อยู่กลางช่วงเหล็กเสริม (ตรงเหล็กเส้น) ไม่มี = หลังรอยหักกลาง ตัวอักษร B เฉพาะเสาหลายท่อนที่ท่อนนี้มีเหล็กเสริมแต่ท่อนอื่นไม่มี
  let xm = cx + 60;
  if (ex.length) { // ขีดตัดต้องอยู่บนเส้นเหล็ก และอยู่ในช่วงปลอก @0.17 (หลัง 0.99 ม. จากปลาย) เพราะแบบขยายระบุ CD@0.17
    const bl = Math.max(...ex.map((e) => (e.len || piece.len) || 0)), zs = F(Math.min(sp.endLen + sp.nearLen + 0.05, piece.len)), ze = barEnd(bl);
    xm = ze - zs > 40 ? (zs + ze) / 2 : Math.max(X0 + 10, ze - 8);
    if (plan.shoulder && opts.first && !piece.full) { const xsh = F(Math.min(plan.shoulder.at, piece.len)); if (Math.abs(xm - xsh) < 38) xm = xsh + 40 <= ze ? xsh + 40 : xsh - 38; }
    if (Math.abs(xm - cx) < 30) xm = cx + 34 <= ze ? cx + 34 : cx - 34; // ไม่ทับรอยหักกลางและตัวเลขระยะกลาง
    for (let t = 0; t < 6 && xs.some((q) => Math.abs(q - xm) < 14); t++) xm += 20;
  }
  const letter = piece.cfg || "A";
  o += `<circle cx="${f1(xm)}" cy="${yTop - 12}" r="8" fill="#fff" stroke="${INK}" stroke-width="1"/>` + T(xm, yTop - 8, letter, { size: 13 }) + L(xm, yTop - 4, xm, yTop + sh, 0.9);
  o += dimV(X0 - 18, yTop, yTop + sh, c2(PILE22.B), { size: 13 });
  // ป้ายปลอกเกลียว
  const sy = yTop + sh + 18;
  let lbl = ""; // ป้ายปลอกวาดทีหลัง (ทับเส้นชี้บ่า) พร้อมขอบขาว ให้อ่านออกเสมอ
  const sf = (v) => String(Math.round(v * 10000) / 10000).padEnd(4, "0"), cdW = `CD.Ø${sp.wire.toFixed(1)}mm.`;
  lbl += T(X0 + 48, sy, "2-" + cdW, { size: 13, halo: true }) + T(X0 + 48, sy + 15, `@${sf(sp.endStep)}m.`, { size: 13, halo: true });
  // ป้ายโซน 0.66 ซ้าย: ถ้าวงบ่าอยู่ทับป้าย ให้เลื่อนป้ายไปทางขวาของวง (วงและเส้นชี้บ่าไม่บังตัวหนังสือ)
  let l2 = X0 + a + b / 2 + 14;
  if (plan.shoulder && opts.first && !piece.full) { const xsh = F(Math.min(plan.shoulder.at, piece.len)); if (Math.abs(xsh - l2) < 62) l2 = xsh + 100; }
  lbl += T(l2, sy, cdW, { size: 13, halo: true }) + T(l2, sy + 15, `@${sf(sp.nearStep)}m.`, { size: 13, halo: true });
  lbl += T(cx, sy, cdW, { size: 13, halo: true }) + T(cx, sy + 15, `@${sf(sp.midStep)}m.`, { size: 13, halo: true });
  lbl += T(xs[3] + b / 2 - 14, sy, cdW, { size: 13, halo: true }) + T(xs[3] + b / 2 - 14, sy + 15, `@${sf(sp.nearStep)}m.`, { size: 13, halo: true });
  lbl += T(X0 + TW - 48, sy, "2-" + cdW, { size: 13, halo: true }) + T(X0 + TW - 48, sy + 15, `@${sf(sp.endStep)}m.`, { size: 13, halo: true });
  const hasSh = !!(plan.shoulder && opts.first && !piece.full);
  let yy = sy + 30 + (hasSh ? 38 + (ex.length ? 22 : 0) : 0); // ระยะบ่าอยู่ใต้ป้ายปลอกทันที
  // ไม่มีป้ายชี้หัวต่อในรูปด้านท่อนเสา (ประหยัดพื้นที่) รายละเอียดอยู่ในแบบขยายแผ่นเหล็กหัวต่อด้านล่าง
  // เหล็กเสริมพิเศษ (เหล็กข้ออ้อย DB): มองด้านข้างเห็น 2 แนว (บน = เหล็กด้านบนซ้อนกัน, ล่าง = เหล็กด้านล่างซ้อนกัน) ชี้ทั้งสองแนว
  const TAN60 = Math.tan((60 * Math.PI) / 180);
  const ribbed = (x1, x2, y) => L(x1, y, x2, y, 2.6); // เหล็ก DB เส้นดำทึบ อยู่ในปลอก (ไม่ทึบทับเส้นปลอก)
  let dbLow = false;
  ex.forEach((e, i) => {
    const len = e.len || (piece.full ? null : piece.len), xe = piece.full || !len ? X0 + TW : barEnd(len);
    const topN = Math.ceil(e.n / 2), botN = e.n - topN, yT = yTop + my(45), yB = yTop + sh - my(45); let ly = sy + 6 + i * 30;
    o += ribbed(X0, xe, yT) + (botN ? ribbed(X0, xe, yB) : "");
    let tx = X0 + (xe - X0) * (plan.shoulder && opts.first && !piece.full ? 0.36 : 0.62);
    if (plan.shoulder && opts.first && !piece.full) tx = Math.max(X0 + 60, Math.min(tx, F(Math.min(plan.shoulder.at, piece.len)) - 200)); // ป้ายเหล็กอยู่ซ้ายวงบ่า (เส้นชี้บ่าไปทางขวา)
    // ตรวจจับการทับกัน: ป้ายเหล็กเสริม (แถวแรก) ห้ามซ้อนกับป้ายปลอก CD หรือวงบ่า → สแกนหาตำแหน่งที่ว่างใกล้ค่าตั้งต้นที่สุด ถ้าไม่มีที่ว่างเลย ลดลงไปแถวใต้ป้ายปลอก
    const lblTxt = `${e.n}-DB${e.d}x${len ? m2(len) : "L"}m.`, wTxt = Math.max(tw(lblTxt), tw("เหล็กข้ออ้อย")) + 14;
    const spanOf = (t) => { const s1 = t + (ly - yT) / TAN60, s2 = t + 44 + (ly - yB) / TAN60, r = Math.max(s1, botN ? s2 : s1) + wTxt; return [Math.min(t, s1), r]; };
    const zones = [X0 + 48, l2, cx, xs[3] + b / 2 - 14, X0 + TW - 48].map((c) => [c - 58, c + 58]);
    if (plan.shoulder && opts.first && !piece.full) { const xsh = F(Math.min(plan.shoulder.at, piece.len)); zones.push([xsh - 42, xsh + 42]); }
    const okAt = (t) => { const [p, q] = spanOf(t); return (botN ? t + 44 : t) <= xe - 6 && zones.every(([z0, z1]) => q < z0 || p > z1); };
    if (i === 0 && !okAt(tx)) {
      let best = null;
      for (let t = X0 + 14; t <= xe - 6; t += 4) if (okAt(t) && (best === null || Math.abs(t - tx) < Math.abs(best - tx))) best = t;
      if (best !== null) tx = best; else { ly = sy + 40; dbLow = true; } // ไม่มีที่ว่างในแถวเดียวกับป้ายปลอก → ลงไปแถวใต้ป้ายปลอก
    }
    const lbl = `${e.n}-DB${e.d}x${len ? m2(len) : "L"}m.`;
    const lblDup = 0, tx2 = tx + 44, sxT = tx + (ly - yT) / TAN60, sxB = tx2 + (ly - yB) / TAN60;
    let r = L(Math.min(sxT, botN ? sxB : 1e9), ly, Math.max(sxT, sxB) + tw(lbl), ly, 0.9) + T(Math.max(sxT, sxB) + 10, ly - 4, lbl, { size: 13, anchor: "start" }) + T(Math.max(sxT, sxB) + 10, ly + 14, "เหล็กข้ออ้อย", { size: 12, anchor: "start" });
    r += L(sxT, ly, tx, yT, 0.8) + tri(tx, yT, (Math.atan2(yT - ly, tx - sxT) * 180) / Math.PI, 7);
    if (botN) r += L(sxB, ly, tx2, yB, 0.8) + tri(tx2, yB, (Math.atan2(yB - ly, tx2 - sxB) * 180) / Math.PI, 7);
    o += r;
  });
  if (dbLow) yy = Math.max(yy, sy + 62);
  if (ex.length > 1) yy += (ex.length - 1) * 30; // ป้ายเหล็กเสริมอยู่แถวเดียวกับป้ายปลอก (ใต้ท่อน) ไม่ลากเส้นยาว
  // บ่า: ระยะจากหัวเสา (ท่อนบนเท่านั้น) วงกลมชัดๆ + ป้ายอ้างอิงแบบขยายบ่า
  if (plan.shoulder && opts.first && !piece.full) {
    const at = Math.min(plan.shoulder.at, piece.len), xs0 = F(at), cyS = yTop + sh / 2, rS = 30;
    o += `<circle cx="${f1(xs0)}" cy="${f1(cyS)}" r="${rS}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="7 3"/>`;
    // ป้ายบ่าอยู่ซ้ายล่างของวง (ถ้ามีที่พอ) เพื่อไม่ชนป้ายเหล็กเสริมทางขวา ไม่งั้นอยู่ขวาล่าง
    const dn = ex.length ? 22 : 0, left = ex.length ? xs0 + 190 > X0 + TW : xs0 - X0 >= 215, ly = sy + 34 + dn, // มีป้ายเหล็กเสริมอยู่แถวบน → ป้ายบ่าลงไปอีกแถว
       ty = cyS + rS, sx = left ? xs0 - (ly - ty) / TAN60 : xs0 + (ly - ty) / TAN60;
    o += L(sx, ly, xs0, ty, 0.9) + tri(xs0, ty, (Math.atan2(ty - ly, xs0 - sx) * 180) / Math.PI, 7);
    o += left ? L(sx, ly, sx - 175, ly, 0.9) + T(sx - 6, ly - 4, "บ่า (ดูแบบขยายบ่า)", { size: 14, anchor: "end", weight: 700 }) : L(sx, ly, sx + 170, ly, 0.9) + T(sx + 6, ly - 4, "บ่า (ดูแบบขยายบ่า)", { size: 14, anchor: "start", weight: 700 });
    o += dimH(X0, xs0, sy + 56 + dn, `ระยะบ่า ${m2(plan.shoulder.at)}`, { size: 13 });
  }
  o += lbl;
  if (hasSh) yy = Math.max(yy, sy + 66 + (ex.length ? 22 : 0)); // เผื่อที่ให้ป้าย "บ่า" ไม่ชนท่อนถัดไป
  o += brk; // รอยหักวาดทับท้ายสุด เพื่อตัดเหล็ก/ปลอก/ขอบท่อนให้ขาดตรงกลางเรียบๆ
  return { svg: o, h: yy - y0 + 6 };
}

export function table(plan, x, y, w) {
  const rows = plan.rows, fz = w < 360 ? 10.5 : 12.5, fb = w < 360 ? 11 : 14, rh = 34, h1 = 28, h2 = 26, cols = [0, 0.3, 0.42, 0.54, 1].map((f) => x + f * w), nr = rows.length, H = h1 + h2 + h2 + nr * rh;
  let o = `<rect x="${x}" y="${y}" width="${w}" height="${h1 + h2 + h2 + nr * rh}" fill="#fff" stroke="${INK}" stroke-width="1.2"/>`;
  const yh = y + h1, yh2 = yh + h2, yb = yh2 + h2;
  o += T(x + w / 2, y + 19, "PRE - STRESS STEEL TABLE", { size: 15 }) + L(x, yh, x + w, yh, 1.2);
  o += L(cols[1], yh, cols[1], y + H, 1.2) + L(cols[3], yh, cols[3], y + H, 1.2) + L(cols[2], yh2, cols[2], y + H, 1.2) + L(cols[1], yh2, cols[3], yh2, 1.2) + L(x, yb, x + w, yb, 1.2);
  o += T((cols[0] + cols[1]) / 2, yh + 38, "LENGTH OF PILE", { size: fz }) + T((cols[1] + cols[3]) / 2, yh + 19, "PC.WIRE", { size: fz + 0.5 }) + T((cols[1] + cols[2]) / 2, yh2 + 18, "4mm.", { size: fz + 0.5 }) + T((cols[2] + cols[3]) / 2, yh2 + 18, "5mm.", { size: fz + 0.5 });
  o += T((cols[3] + cols[4]) / 2, yh + 22, "DOWEL BAR OF", { size: fz }) + T((cols[3] + cols[4]) / 2, yh + 42, "CONNECTION JOINT", { size: fz });
  rows.forEach((r, i) => {
    const yy = yb + i * rh + 23;
    o += T((cols[0] + cols[1]) / 2, yy, r.label, { size: fb }) + T((cols[1] + cols[2]) / 2, yy, r.w4 || "-", { size: fb }) + T((cols[2] + cols[3]) / 2, yy, r.w5 || "-", { size: fb });
    o += T((cols[3] + cols[4]) / 2, yy, plan.joint && r.dowel ? `${r.dowel.n}-DB${r.dowel.d}mm.x${m2(r.dowel.len)}m.` : "-", { size: fb });
    if (i < nr - 1) o += L(x, yb + (i + 1) * rh, x + w, yb + (i + 1) * rh, 0.8);
  });
  return { svg: o, h: H };
}

function titleBlock(plan, logoHref) {
  const y = 742, p = plan.project || {}, tb = TITLE_BLOCK, cols = [20, 470, 760, 970, 1168];
  let o = `<rect x="20" y="${y}" width="1148" height="78" fill="#fff" stroke="${INK}" stroke-width="1.4"/>`;
  o += L(cols[1], y + 39, 1168, y + 39, 1) + cols.slice(1, 4).map((x) => L(x, y, x, y + 78, 1)).join("");
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
  PILE22 = plan.sec.geo || { B: 220, f: 65, c: 50, dg: 70, tw: 80 };
  const np = plan.pieces.length, cfgs = plan.configs && plan.configs.length ? plan.configs : [{ letter: "A", extras: plan.extras, layout: plan.layout, wires: "x", simple: false }];
  const simple = plan.full || plan.pieces.length === 0 || !plan.layout, kinds = plan.kinds || { A: true, B: false }, two = cfgs.length === 2, hasX = plan.extras.length > 0;
  const layE = cfgs[0].layout, bigSec = !two && !PILE22.sq && !!layE && !layE.std && !(simple || cfgs[0].simple), colBx = bigSec ? 690 : 640; // เสาลวดหลายเส้น: หน้าตัด A-A และภาพขยายลวดขยาย 1.3 เท่าเท่ากัน (ตัวเลขระยะไม่ชนกัน)
  let g = "", y = 0; // y = ตำแหน่งแนวตั้งของเนื้อหา (หน่วยก่อนย่อ)
  // ---- แถว 1: รูปด้านท่อนเสา ----
  plan.pieces.forEach((pc, i) => {
    const e = elevation(plan, pc, y, { first: i === 0, idx: i });
    g += e.svg; y += e.h - 4;
  });
  // โหมด "ดูตาราง" (แบบเต็ม/หลายชุดลวด): วาดตำแหน่งลวดของช่วงความยาวสูงสุดในตาราง (ผู้ใช้สั่ง) ข้อความ "PC.WIRE ดูตาราง" บอกว่าจำนวนจริงดูที่ตาราง
  const gG = plan.sec.geo || {}, r0 = plan.sec.rules[plan.sec.rules.length - 1];
  const layDim = plan.layout || wireLayout(r0.w4, r0.w5, gG.B || 220, !!gG.sq, gG.wl, gG.two ? "two" : gG.pat);
  // ---- แถว 2: หน้าตัด A / B (+ จุดยกสำหรับแบบเดี่ยว) ----
  const sa = (two ? 0.5 : 0.62) * (220 / PILE22.B) * (bigSec ? 1.3 : 1), topE = HB() * sa + (two ? 20 : 48), botE = HB() * sa + 98, cyA = y + topE;
  if (two) {
    g += cfgs.map((cf, i) => sectionA(plan, i ? 610 : 190, cyA, sa, simple || cf.simple || !cf.layout, cf.extras, cf.letter, i > 0 && cf.wires === cfgs[0].wires, (simple || cf.simple || !cf.layout) ? layDim : cf.layout)).join("");
  } else {
    const c0 = cfgs[0], lay = c0.layout || wireLayout(4, 2);
    const lay2 = simple || c0.simple ? layDim : lay;
    g += sectionA(plan, 230, cyA, sa, simple || c0.simple, plan.full ? [] : c0.extras, "A", false, lay2) + (PILE22.sq ? "" : wiresDetail(colBx, cyA, sa, lay2)); // ลวดหลายเส้น: ขยายแบบขยายลวดให้ตัวเลขระยะไม่ชนกัน // เสา I: DETAIL OF PC.WIRES • เสาสี่เหลี่ยม: ไม่มีแบบขยาย (ผู้ใช้สั่ง)
  }
  g += liftingPoints(two ? 900 : 860, y + (two ? 30 : topE - HB() * sa - 20), two ? 240 : 290);
  y += topE + botE + 8;
  // ---- แถว 3: หัวต่อ (ซ้าย) • คอลัมน์ขวา: แบบขยายบ่า (บน) + ตารางลวด (มุมขวาล่างเสมอ) ----
  const sw = bigSec ? sa / 1.3 : sa, hasJ = plan.joint, TW3 = 360, rx = 1160 - TW3, colA = two ? 190 : 230, colB = two ? 610 : bigSec ? colBx : 640; // หัวเพลท (ด้านข้าง) อยู่คอลัมน์เดียวกับภาพขยายลวด
  const dowels = plan.full ? [plan.rows[0] && plan.rows[0].dowel] : [...new Map(plan.pieces.map((p) => [p.rule ? p.rule.dowel.n + "-" + p.rule.dowel.d : "x", p])).values()].map((p) => p.rule && p.rule.dowel);
  let hLeft = 0;
  if (hasJ) {
    const list = plan.full ? [null] : dowels.slice(0, 2), cyB = y + HB() * sw + 16;
    list.forEach((d, i) => { g += weldingPlate(d, colA + i * 300, cyB, sw, !plan.full && list.length > 1 ? `${m2(plan.pieces.filter((p) => p.rule && p.rule.dowel === d)[0]?.len || plan.pieces[i].len)} m.` : "", true); });
    g += weldSide(list[0], (list.length > 1 ? colA + 600 : colB) - HB() * (bigSec && list.length === 1 ? sa : sw), cyB - HB() * sw, sw, true, list.length > 1); // 2 แผ่น: ขนาดเหล็กเดือยบอกในคำอธิบายของแต่ละแผ่นแล้ว ภาพด้านข้างไม่ซ้ำป้าย (กันชนตาราง)
    hLeft = HB() * sw * 2 + 16 + 44;
  }
  const TSC = 0.72, tb0 = table(plan, 1168 - TW3, 742 - table(plan, 0, 0, TW3).h, TW3), tb = { h: tb0.h * TSC, svg: `<g transform="translate(1168,742) scale(${TSC}) translate(-1168,-742)">${tb0.svg}</g>` }; // ตารางลวดติดมุมขวาล่าง ชิดตารางชื่อแบบ
  const yRow3 = y;
  let hRight = 0;
  const bigSh = !!plan.shoulder && !hasJ; // ท่อนเดี่ยว (ไม่มีหัวต่อ): แถวล่างว่าง → วางภาพ 3 มิติบ่าและแบบขยายบ่าใหญ่ๆ
  if (bigSh) {
    const sy = y + 4, sc = 0.92, sx = 480;
    g += shoulder3D(plan.shoulder, 60, sy - 12, 0.26);
    g += `<g transform="translate(${sx},${sy}) scale(${sc}) translate(-${sx},-${sy})">${shoulderDetail(plan.shoulder, sx, sy)}</g>`;
    hRight = 262;
  } else if (plan.shoulder) {
    const sc = 0.62, sx = rx + 105, sy = y + 4;
    g += `<g transform="translate(${sx},${sy}) scale(${sc}) translate(-${sx},-${sy})">${shoulderDetail(plan.shoulder, sx, sy)}</g>`;
    hRight = 196;
  }
  const rowH = Math.max(hLeft, hRight);
  y += rowH + 6;
  // ---- ย่อให้พอดี: พื้นที่ใช้ได้ = เหนือตารางชื่อแบบ ----
  const top = 90, avail = 742 - top - 10;
  let k = Math.min(1, avail / y);
  if (plan.shoulder && !bigSh) k = Math.min(k, (742 - tb.h - 8 - top) / (yRow3 + 200)); // แบบขยายบ่าอยู่เหนือตารางพอดี
  const tx = (W / 2) * (1 - k);
  let o = `<defs><pattern id="stipple" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="0.8" fill="#222"/><circle cx="4.5" cy="4.5" r="0.8" fill="#222"/></pattern></defs>`;
  o += `<rect width="${W}" height="${H}" fill="#fff"/><rect x="20" y="20" width="1148" height="800" fill="none" stroke="${INK}" stroke-width="1.8"/>`;
  o += L(20, 62, 1168, 62, 1.4) + T(W / 2, 48, plan.title, { size: 22, weight: 400 }); // ชื่อแบบอยู่ในกรอบหัวแบบเต็มความกว้าง
  o += `<g transform="translate(${f1(tx)},${top}) scale(${k.toFixed(4)})">${g}</g>`;
  o += tb.svg + titleBlock(plan, logoHref);
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" style="background:#fff;display:block">${o}</svg>`;
}
