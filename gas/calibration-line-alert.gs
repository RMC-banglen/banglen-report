// ============================================================
// แจ้งเตือนรอบงานประจำเข้า LINE — อ่านจาก Supabase (calibration_items)
//
// ใช้กับ LINE Official Account ที่บริษัทมีอยู่แล้ว
//
// ── ตั้งค่าครั้งแรก ──────────────────────────────────────────
// 1. เข้า https://developers.line.biz → Log in ด้วยบัญชีที่ดูแล OA
// 2. เลือก Provider → เลือก Channel ของ OA บริษัท (ประเภท Messaging API)
//    * ถ้ายังไม่มี Channel: ไปที่ LINE Official Account Manager
//      → ตั้งค่า → Messaging API → "ใช้ Messaging API" → เลือก Provider
// 3. แท็บ "Messaging API" → เลื่อนหาหัวข้อ Channel access token (long-lived)
//    → กด Issue → คัดลอกมาใส่ LINE_TOKEN ด้านล่าง
// 4. แท็บ "Messaging API" → เปิด "Allow bot to join group chats"
// 5. เชิญ OA เข้ากลุ่ม LINE ของทีม
// 6. หา Group ID:
//    - แท็บ Messaging API → Webhook URL → ใส่ URL ของ Web App นี้
//      (Deploy → New deployment → Web app → Anyone) → เปิด "Use webhook"
//    - พิมพ์อะไรก็ได้ในกลุ่ม 1 ครั้ง
//    - กลับมาที่ Apps Script → ดู "บันทึกการดำเนินการ" (Executions) จะเห็น Group ID
//    - คัดลอกมาใส่ LINE_GROUP_ID
// 7. ทดสอบ: เลือกฟังก์ชัน testAlert → กด "เรียกใช้"
// 8. ตั้งเวลาอัตโนมัติ: เมนูซ้าย ⏰ ทริกเกอร์ → เพิ่มทริกเกอร์
//    - ฟังก์ชัน: sendCalibrationAlert
//    - แหล่งที่มา: ตามเวลา → ตัวจับเวลารายวัน → 08:00–09:00
// ============================================================

var LINE_TOKEN    = 'ใส่_CHANNEL_ACCESS_TOKEN_ที่นี่';
var LINE_GROUP_ID = 'ใส่_GROUP_ID_ที่นี่';

var SUPABASE_URL = 'https://npxzerdirspwunuckcqr.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weHplcmRpcnNwd3VudWNrY3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjUxMjIsImV4cCI6MjA5NTcwMTEyMn0.4C1MucMeqPozXSfErLM44at7dykfzfFQvpVnoqmrMQI';

// แจ้งเตือนล่วงหน้ากี่วัน
var WARN_DAYS = 30;

// ส่งข้อความ "ไม่มีรายการใกล้ครบกำหนด" ด้วยไหม (false = เงียบเมื่อไม่มีอะไร)
var NOTIFY_WHEN_EMPTY = false;

var THAI_M = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

// ============================================================
// ฟังก์ชันหลัก — ตั้งทริกเกอร์รายวันให้เรียกอันนี้
// ============================================================
function sendCalibrationAlert() {
  var items = fetchCalibrationItems();
  if (items === null) { Logger.log('❌ ดึงข้อมูลจาก Supabase ไม่ได้'); return; }

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

  if (overdue.length === 0 && soon.length === 0 && !NOTIFY_WHEN_EMPTY) {
    Logger.log('✅ ไม่มีรายการใกล้ครบกำหนด — ไม่ส่งข้อความ');
    return;
  }

  var msg = buildMessage(overdue, soon, today);
  pushLine(msg);
  Logger.log('ส่งแล้ว — เกินกำหนด ' + overdue.length + ' / ใกล้ถึง ' + soon.length);
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
// ประกอบข้อความ
// ============================================================
function buildMessage(overdue, soon, today) {
  var lines = [];
  lines.push('🔧 แจ้งเตือนรอบงานประจำ');
  lines.push(fmtThaiDate(today));
  lines.push('━━━━━━━━━━━━━━━');

  if (overdue.length) {
    lines.push('');
    lines.push('🔴 เกินกำหนดแล้ว (' + overdue.length + ' รายการ)');
    overdue.forEach(function(x) {
      lines.push('• ' + x.it.name);
      lines.push('   เลยมา ' + Math.abs(x.d) + ' วัน — ครบกำหนด ' + fmtDate(x.it.next_cal_date));
      if (x.it.responsible) lines.push('   ผู้รับผิดชอบ: ' + x.it.responsible);
    });
  }

  if (soon.length) {
    lines.push('');
    lines.push('🟡 ใกล้ถึงกำหนด ภายใน ' + WARN_DAYS + ' วัน (' + soon.length + ' รายการ)');
    soon.forEach(function(x) {
      lines.push('• ' + x.it.name);
      lines.push('   อีก ' + x.d + ' วัน — ครบกำหนด ' + fmtDate(x.it.next_cal_date));
      if (x.it.responsible) lines.push('   ผู้รับผิดชอบ: ' + x.it.responsible);
    });
  }

  if (!overdue.length && !soon.length) {
    lines.push('');
    lines.push('✅ ไม่มีรายการใกล้ครบกำหนด');
  }

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━');
  lines.push('ดูทั้งหมด: https://rmc-banglen.github.io/banglen-report/');

  return lines.join('\n');
}

// ============================================================
// ส่งเข้า LINE
// ============================================================
function pushLine(text) {
  if (LINE_TOKEN.indexOf('ใส่_') === 0 || LINE_GROUP_ID.indexOf('ใส่_') === 0) {
    Logger.log('⚠️ ยังไม่ได้ตั้งค่า LINE_TOKEN หรือ LINE_GROUP_ID');
    Logger.log('ข้อความที่จะส่ง:\n' + text);
    return;
  }
  var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + LINE_TOKEN, 'Content-Type': 'application/json' },
    payload: JSON.stringify({ to: LINE_GROUP_ID, messages: [{ type: 'text', text: text }] }),
    muteHttpExceptions: true
  });
  Logger.log('LINE HTTP ' + res.getResponseCode() + ' ' + res.getContentText());
}

// ============================================================
// Webhook — ใช้หา Group ID ตอนตั้งค่าครั้งแรก
// ============================================================
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    (body.events || []).forEach(function(ev) {
      if (ev.source) {
        if (ev.source.groupId) Logger.log('✅ Group ID: ' + ev.source.groupId);
        if (ev.source.roomId)  Logger.log('✅ Room ID: '  + ev.source.roomId);
        if (ev.source.userId)  Logger.log('ℹ️ User ID: '  + ev.source.userId);
      }
    });
  } catch (err) {
    Logger.log('doPost error: ' + err.message);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// ทดสอบ — บังคับส่งแม้ไม่มีรายการใกล้ครบกำหนด
// ============================================================
function testAlert() {
  var items = fetchCalibrationItems();
  if (items === null) { Logger.log('❌ ดึงข้อมูลไม่ได้'); return; }
  Logger.log('ดึงข้อมูลได้ ' + items.length + ' รายการ');

  var today = startOfToday(), overdue = [], soon = [];
  items.forEach(function(it) {
    if (!it.next_cal_date) return;
    if (String(it.category || '') === 'เปลี่ยนเมื่อชำรุด') return;
    var d = daysUntil(it.next_cal_date, today);
    if (d < 0) overdue.push({ it: it, d: d });
    else if (d <= WARN_DAYS) soon.push({ it: it, d: d });
  });
  overdue.sort(function(a, b) { return a.d - b.d; });
  soon.sort(function(a, b) { return a.d - b.d; });

  var msg = buildMessage(overdue, soon, today);
  Logger.log('--- ข้อความ ---\n' + msg);
  pushLine(msg);
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
