// ============================================================
// แจ้งเตือนรอบงานประจำเข้า Telegram — อ่านจาก Supabase (calibration_items)
// ฟรี ไม่จำกัดจำนวนข้อความ
//
// ── ตั้งค่าครั้งแรก (ใช้เวลา ~5 นาที) ─────────────────────────
// 1. เปิดแอป Telegram → ค้นหา  @BotFather  → กด Start
// 2. พิมพ์  /newbot
//    - ตั้งชื่อบอท เช่น  RMC แจ้งเตือนรอบงาน
//    - ตั้ง username ต้องลงท้ายด้วย bot เช่น  rmc_calibration_bot
//    - BotFather จะส่ง Token มาให้ หน้าตาแบบ  1234567890:AAF...xyz
//    → คัดลอกมาใส่ TG_TOKEN ด้านล่าง
// 3. สร้างกลุ่ม Telegram ของทีม → เชิญบอทที่เพิ่งสร้างเข้ากลุ่ม
// 4. พิมพ์อะไรก็ได้ในกลุ่ม 1 ครั้ง (เช่น  /start )
// 5. กลับมาที่ Apps Script → เลือกฟังก์ชัน  findChatId  → กด "เรียกใช้"
//    → ดู "บันทึกการดำเนินการ" จะเห็น Chat ID (เลขติดลบ เช่น -1001234567890)
//    → คัดลอกมาใส่ TG_CHAT_ID
// 6. ทดสอบ: เลือกฟังก์ชัน  testAlert  → กด "เรียกใช้"
// 7. ตั้งเวลาอัตโนมัติ: แถบซ้าย ⏰ ทริกเกอร์ → เพิ่มทริกเกอร์
//    - ฟังก์ชัน: sendCalibrationAlert
//    - แหล่งที่มา: ตามเวลา → ตัวจับเวลารายวัน → 08:00–09:00
//
// หมายเหตุ: ให้ทุกคนในทีมเปิดการแจ้งเตือนของกลุ่มนี้ในแอป Telegram
// ============================================================

var TG_TOKEN   = 'ใส่_BOT_TOKEN_ที่นี่';
var TG_CHAT_ID = 'ใส่_CHAT_ID_ที่นี่';

var SUPABASE_URL = 'https://npxzerdirspwunuckcqr.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weHplcmRpcnNwd3VudWNrY3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjUxMjIsImV4cCI6MjA5NTcwMTEyMn0.4C1MucMeqPozXSfErLM44at7dykfzfFQvpVnoqmrMQI';

// แจ้งเตือนล่วงหน้ากี่วัน
var WARN_DAYS = 30;

// ส่งข้อความ "ไม่มีรายการใกล้ครบกำหนด" ด้วยไหม (false = เงียบเมื่อไม่มีอะไร)
var NOTIFY_WHEN_EMPTY = false;

var DASHBOARD_URL = 'https://rmc-banglen.github.io/banglen-report/';
var THAI_M = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

// ============================================================
// ฟังก์ชันหลัก — ตั้งทริกเกอร์รายวันให้เรียกอันนี้
// ============================================================
function sendCalibrationAlert() {
  var g = collect();
  if (!g) return;

  if (g.overdue.length === 0 && g.soon.length === 0 && !NOTIFY_WHEN_EMPTY) {
    Logger.log('✅ ไม่มีรายการใกล้ครบกำหนด — ไม่ส่งข้อความ');
    return;
  }

  sendTelegram(buildMessage(g.overdue, g.soon, g.today));
  Logger.log('ส่งแล้ว — เกินกำหนด ' + g.overdue.length + ' / ใกล้ถึง ' + g.soon.length);
}

// ============================================================
// รวบรวม + จัดกลุ่มรายการ
// ============================================================
function collect() {
  var items = fetchCalibrationItems();
  if (items === null) { Logger.log('❌ ดึงข้อมูลจาก Supabase ไม่ได้'); return null; }

  var today = startOfToday();
  var overdue = [], soon = [];

  items.forEach(function(it) {
    if (!it.next_cal_date) return;
    if (String(it.category || '') === 'เปลี่ยนเมื่อชำรุด') return;   // ไม่มีรอบตายตัว
    var d = daysUntil(it.next_cal_date, today);
    if (d < 0) overdue.push({ it: it, d: d });
    else if (d <= WARN_DAYS) soon.push({ it: it, d: d });
  });

  overdue.sort(function(a, b) { return a.d - b.d; });
  soon.sort(function(a, b) { return a.d - b.d; });

  return { items: items, today: today, overdue: overdue, soon: soon };
}

// ============================================================
// ดึงข้อมูลจาก Supabase
// ============================================================
function fetchCalibrationItems() {
  try {
    var res = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/calibration_items?select=*', {
      method: 'GET',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) {
      Logger.log('Supabase HTTP ' + res.getResponseCode() + ': ' + res.getContentText());
      return null;
    }
    return JSON.parse(res.getContentText());
  } catch (err) {
    Logger.log('fetch error: ' + err.message);
    return null;
  }
}

// ============================================================
// ประกอบข้อความ (Telegram HTML)
// ============================================================
function buildMessage(overdue, soon, today) {
  var L = [];
  // บรรทัดแรก = สรุปสั้น เพื่อให้เห็นบนหน้าล็อกมือถือโดยไม่ต้องเปิดแอป
  L.push('<b>' + buildHeadline(overdue, soon) + '</b>');
  L.push('🔧 รอบงานประจำ · ' + fmtThaiDate(today));

  if (overdue.length) {
    L.push('');
    L.push('🔴 <b>เกินกำหนดแล้ว (' + overdue.length + ' รายการ)</b>');
    overdue.forEach(function(x) {
      L.push('• <b>' + esc(x.it.name) + '</b>');
      L.push('   เลยมา <b>' + Math.abs(x.d) + ' วัน</b> — ครบกำหนด ' + fmtDate(x.it.next_cal_date));
      if (x.it.responsible) L.push('   ผู้รับผิดชอบ: ' + esc(x.it.responsible));
    });
  }

  if (soon.length) {
    L.push('');
    L.push('🟡 <b>ใกล้ถึงกำหนดใน ' + WARN_DAYS + ' วัน (' + soon.length + ' รายการ)</b>');
    soon.forEach(function(x) {
      L.push('• <b>' + esc(x.it.name) + '</b>');
      L.push('   อีก <b>' + x.d + ' วัน</b> — ครบกำหนด ' + fmtDate(x.it.next_cal_date));
      if (x.it.responsible) L.push('   ผู้รับผิดชอบ: ' + esc(x.it.responsible));
    });
  }

  if (!overdue.length && !soon.length) {
    L.push('');
    L.push('✅ ไม่มีรายการใกล้ครบกำหนด');
  }

  L.push('');
  L.push('<a href="' + DASHBOARD_URL + '">เปิดหน้ารอบงานประจำ →</a>');

  return L.join('\n');
}

// ============================================================
// สรุปบรรทัดแรก — โผล่บนหน้าล็อกมือถือ
// ============================================================
function buildHeadline(overdue, soon) {
  if (!overdue.length && !soon.length) return '✅ ไม่มีรายการใกล้ครบกำหนด';

  // หยิบรายการที่ด่วนที่สุดมาโชว์ชื่อ
  var top = overdue.length ? overdue[0] : soon[0];
  var topTxt = esc(top.it.name) + ' ' +
    (top.d < 0 ? 'เลยมา ' + Math.abs(top.d) + ' วัน' : 'อีก ' + top.d + ' วัน');

  var total = overdue.length + soon.length;
  if (total === 1) return (overdue.length ? '🔴 ' : '🟡 ') + topTxt;

  var parts = [];
  if (overdue.length) parts.push('🔴 เกินกำหนด ' + overdue.length);
  if (soon.length)    parts.push('🟡 ใกล้ครบ ' + soon.length);
  return parts.join(' · ') + ' รายการ — ' + topTxt;
}

// ============================================================
// ส่งเข้า Telegram
// ============================================================
function sendTelegram(html) {
  if (TG_TOKEN.indexOf('ใส่_') === 0 || TG_CHAT_ID.indexOf('ใส่_') === 0) {
    Logger.log('⚠️ ยังไม่ได้ตั้งค่า TG_TOKEN หรือ TG_CHAT_ID');
    Logger.log('ข้อความที่จะส่ง:\n' + html);
    return;
  }
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage', {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: TG_CHAT_ID,
      text: html,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    }),
    muteHttpExceptions: true
  });
  Logger.log('Telegram HTTP ' + res.getResponseCode() + ' ' + res.getContentText());
}

// ============================================================
// หา Chat ID — รันหลังเชิญบอทเข้ากลุ่มและพิมพ์ข้อความในกลุ่มแล้ว
// ============================================================
function findChatId() {
  if (TG_TOKEN.indexOf('ใส่_') === 0) { Logger.log('⚠️ ใส่ TG_TOKEN ก่อน'); return; }

  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + TG_TOKEN + '/getUpdates', { muteHttpExceptions: true });
  var body = JSON.parse(res.getContentText());

  if (!body.ok) { Logger.log('❌ Token ไม่ถูกต้อง: ' + res.getContentText()); return; }
  if (!body.result || !body.result.length) {
    Logger.log('⚠️ ยังไม่พบข้อความ — เชิญบอทเข้ากลุ่ม แล้วพิมพ์อะไรก็ได้ในกลุ่ม 1 ครั้ง จากนั้นรันใหม่');
    return;
  }

  var seen = {};
  body.result.forEach(function(u) {
    var m = u.message || u.channel_post || u.my_chat_member;
    if (!m || !m.chat) return;
    var c = m.chat;
    if (seen[c.id]) return;
    seen[c.id] = true;
    Logger.log('✅ Chat ID: ' + c.id + '   ประเภท: ' + c.type + '   ชื่อ: ' + (c.title || c.username || c.first_name || '-'));
  });
  Logger.log('— คัดลอก Chat ID ของกลุ่ม (เลขติดลบ) ไปใส่ TG_CHAT_ID —');
}

// ============================================================
// ทดสอบ — บังคับส่งแม้ไม่มีรายการใกล้ครบกำหนด
// ============================================================
function testAlert() {
  var g = collect();
  if (!g) return;
  Logger.log('ดึงข้อมูลได้ ' + g.items.length + ' รายการ');
  var msg = buildMessage(g.overdue, g.soon, g.today);
  Logger.log('--- ข้อความ ---\n' + msg);
  sendTelegram(msg);
}

// ============================================================
// Helper
// ============================================================
function startOfToday() {
  var n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function daysUntil(dateStr, today) {
  var p = String(dateStr).slice(0, 10).split('-');
  var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  return Math.round((d - today) / 86400000);
}

function fmtDate(dateStr) {
  var p = String(dateStr).slice(0, 10).split('-');
  return p[2] + '/' + p[1] + '/' + (Number(p[0]) + 543);
}

function fmtThaiDate(d) {
  return d.getDate() + ' ' + THAI_M[d.getMonth() + 1] + ' ' + (d.getFullYear() + 543);
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
