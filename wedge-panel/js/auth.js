// ล็อกอินด้วย PIN จากตาราง worktrack_users ชุดเดียวกับเว็บรายงานการผลิต
// session เก็บใน sessionStorage คีย์ wt_user (ใช้ร่วมกับเว็บเดิมได้เมื่ออยู่โดเมนเดียวกัน)
import { SESSION_KEY, PERM_KEY } from "./config.js?v=20261105013720";
import { listUsers, refreshUser } from "./db.js?v=20261105013720";

export function getSession() {
  try { const u = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); return u && u.id ? u : null; } catch (e) { return null; }
}
function setSession(u) { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(u)); } catch (e) {} }
export function logout() { try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {} }

// ไม่มีคีย์ wedgepanel ใน tab_perms ถือว่าใช้ได้ (แบบเดียวกับ pilecalc) admin ใช้ได้เสมอ
export function canUse(u) { return !!u && (u.role === "admin" || (u.tab_perms || {})[PERM_KEY] !== false); }
// แก้ไข/บันทึกได้: admin และ editor ที่ไม่ได้ปิดสิทธิ์ ส่วน viewer ดูได้อย่างเดียว
export function canEdit(u) { return !!u && canUse(u) && (u.role === "admin" || u.role === "editor"); }

// ดึงข้อมูลผู้ใช้ล่าสุด (สิทธิ์อาจถูกแก้ในเว็บเดิม) คืนผู้ใช้ที่อัปเดตแล้ว
export async function syncSession(u) {
  try {
    const fresh = await refreshUser(u.id);
    if (fresh) { const next = { ...u, ...fresh }; setSession(next); return next; }
  } catch (e) {}
  return u;
}

// วาดหน้าล็อกอินลงใน root แล้วเรียก onLogin(user)
export async function showLogin(root, onLogin) {
  root.hidden = false;
  root.innerHTML = '<div class="box"><img src="assets/logo.png" alt="RMC"><h2>ออกแบบและเขียนแบบ</h2><div id="lgBody">กำลังโหลดรายชื่อ…</div></div>';
  const body = root.querySelector("#lgBody");
  let users = [];
  try { users = await listUsers(); } catch (e) { body.innerHTML = '<div class="err">เชื่อมต่อฐานข้อมูลไม่ได้ ลองรีเฟรชหน้า</div>'; return; }
  const finish = (u) => { setSession(u); root.hidden = true; onLogin(u); };
  const pickUser = () => {
    body.innerHTML = '<div style="font-size:13px;color:var(--muted);margin-bottom:10px">เลือกชื่อผู้ใช้</div><div class="users"></div>';
    const grid = body.querySelector(".users");
    users.forEach((u) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = u.name;
      b.onclick = () => (u.pin ? askPin(u) : finish(u));
      grid.appendChild(b);
    });
  };
  const askPin = (u) => {
    let pin = "";
    body.innerHTML = `<div style="font-weight:600">${u.name.replace(/[<>&]/g, "")}</div><div style="font-size:13px;color:var(--muted)">กรอก PIN 4 หลัก</div><div class="dots">${"<i></i>".repeat(4)}</div><div class="pad"></div><div class="err" id="lgErr"></div><button type="button" id="lgBack" style="margin-top:8px">เปลี่ยนผู้ใช้</button>`;
    const dots = body.querySelectorAll(".dots i"), pad = body.querySelector(".pad"), err = body.querySelector("#lgErr");
    const paint = () => dots.forEach((d, i) => d.classList.toggle("on", i < pin.length));
    const press = (d) => {
      if (err.textContent || pin.length >= 4) return;
      pin += d; paint();
      if (pin.length === 4) {
        if (pin === String(u.pin)) finish(u);
        else { err.textContent = "PIN ไม่ถูกต้อง"; setTimeout(() => { pin = ""; err.textContent = ""; paint(); }, 900); }
      }
    };
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].forEach((k) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = k;
      if (!k) b.style.visibility = "hidden";
      b.onclick = () => (k === "⌫" ? ((pin = pin.slice(0, -1)), paint()) : k && press(k));
      pad.appendChild(b);
    });
    body.querySelector("#lgBack").onclick = pickUser;
  };
  pickUser();
}
