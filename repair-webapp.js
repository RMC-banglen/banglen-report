// ============================================================
// Apps Script แยก — ระบบแจ้งซ่อม (หน้า repair.html) อย่างเดียว ไม่เกี่ยวกับผลลูกปูน
// หน้าที่: รับเหตุการณ์จาก repair.html → ส่ง Telegram เข้ากลุ่มช่าง · เตือนงานค้างทุก 10 นาที
//
// วิธีติดตั้ง (ครั้งเดียว):
//   1. เปิด https://script.google.com → New project → ตั้งชื่อ "แจ้งซ่อม"
//   2. ลบโค้ดเดิม วางโค้ดนี้ทั้งหมด → Save
//   3. ช่องเลือกฟังก์ชันด้านบน เลือก setup → กด Run → อนุญาตสิทธิ์
//      (จะส่งข้อความทดสอบเข้ากลุ่มช่าง + ตั้งเตือนงานค้างทุก 10 นาทีให้)
//   4. Deploy → New deployment → ⚙️ Web app → Execute as: Me · Who has access: Anyone → Deploy
//   5. คัดลอก Web app URL ไปใส่ GAS_URL ใน repair.html
// ============================================================

var TELEGRAM_TOKEN = '';        // โทเคนบอท (ตัวเดียวกับบอทแจ้งเตือนเดิม)
var TELEGRAM_CHAT_REPAIR = '';  // ไอดีกลุ่ม "Rmc ซ่อมบำรุงบางเลน"

var SUPABASE_URL = 'https://npxzerdirspwunuckcqr.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weHplcmRpcnNwd3VudWNrY3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjUxMjIsImV4cCI6MjA5NTcwMTEyMn0.4C1MucMeqPozXSfErLM44at7dykfzfFQvpVnoqmrMQI';
var REPAIR_PAGE_URL = 'https://rmc-banglen.github.io/banglen-report/repair.html';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.kind === 'repair_event') notifyRepair(data);
    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
function doGet() {
  return ContentService.createTextOutput('repair webapp ok');
}

// ── Telegram ────────────────────────────────────────────────
function sendTelegram(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_REPAIR) { Logger.log('ยังไม่ได้ใส่ TELEGRAM_TOKEN / TELEGRAM_CHAT_REPAIR'); return; }
  UrlFetchApp.fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: TELEGRAM_CHAT_REPAIR, text: text, parse_mode: 'HTML', disable_web_page_preview: true }),
    muteHttpExceptions: true
  });
}
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
var URG = { stop: '🔴 เครื่องหยุด', abnormal: '🟠 ผิดปกติ', normal: '🟢 ไม่ด่วน' };
function dur(ms) {
  var m = Math.round(ms / 60000);
  if (m < 60) return m + ' นาที';
  var h = Math.floor(m / 60), mm = m % 60;
  if (h < 24) return h + ' ชม.' + (mm ? ' ' + mm + ' นาที' : '');
  return Math.floor(h / 24) + ' วัน ' + (h % 24) + ' ชม.';
}
function jobLink(id) {
  return '\n<a href="' + REPAIR_PAGE_URL + '#' + id + '">👉 เปิดใบงาน</a>';
}

// เหตุการณ์จากหน้า repair.html
function notifyRepair(d) {
  var r = d.req || {}, L = [];
  var head = '<b>' + esc(r.ticket_no || '') + '</b> · ' + esc(r.asset_name || '');
  if (d.event === 'new') {
    L.push('🔧 <b>แจ้งซ่อมใหม่</b> — ' + (URG[r.urgency] || ''));
    L.push(head);
    L.push('อาการ: ' + esc(r.symptom || '-'));
    L.push('แจ้งโดย: ' + esc(r.reporter_name || '-') + ' (' + esc(r.reporter_dept || '-') + ')');
    if (r.photos && r.photos.length) L.push('📷 มีรูป ' + r.photos.length + ' รูป');
    L.push('<i>ช่างที่ว่าง กดเปิดใบงานแล้วกด "รับงาน"</i>');
  } else if (d.event === 'accepted') {
    L.push('🙋 ' + esc(d.actor || r.technician || '') + ' รับงานแล้ว — ' + head);
  } else if (d.event === 'waiting_parts') {
    L.push('⏸ <b>รออะไหล่</b> — ' + head);
    if (d.note) L.push('รอ: ' + esc(d.note));
  } else if (d.event === 'done') {
    var cost = (Number(r.parts_cost) || 0) + (Number(r.vendor_cost) || 0);
    L.push('✅ <b>ซ่อมเสร็จ</b> — ' + head);
    L.push('ช่าง: ' + esc(r.technician || '-') + (r.helpers ? ' + ' + esc(r.helpers) : ''));
    L.push('สาเหตุ: ' + esc(r.cause || '-'));
    L.push('ทำ: ' + esc(r.work_done || '-'));
    if (cost > 0) L.push('ค่าใช้จ่าย: ' + cost.toLocaleString() + ' บาท');
    if (r.reported_at && r.done_at) L.push('ใช้เวลา: ' + dur(new Date(r.done_at) - new Date(r.reported_at)));
    L.push('<i>' + esc(r.reporter_name || 'ผู้แจ้ง') + ' ตรวจแล้วกด "ใช้งานได้แล้ว ปิดงาน"</i>');
  } else if (d.event === 'reopened') {
    L.push('👎 <b>ยังไม่หาย ส่งกลับให้ช่าง</b> — ' + head);
    if (d.note) L.push('อาการ: ' + esc(d.note));
    L.push('ช่าง: ' + esc(r.technician || '-'));
  } else if (d.event === 'closed') {
    L.push('👍 ปิดงาน ' + head + ' (ยืนยันโดย ' + esc(d.actor || '') + ')');
  } else if (d.event === 'cancelled') {
    L.push('✖️ ยกเลิกใบแจ้ง ' + head + (d.note ? ' — ' + esc(d.note) : ''));
  } else {
    return;
  }
  var withLink = !(d.event === 'closed' || d.event === 'cancelled') && r.id;
  sendTelegram(L.join('\n') + (withLink ? jobLink(r.id) : ''));
}

// ── เตือนงานค้าง (ตั้งให้รันทุก 10 นาทีด้วย setup) ─────────────
//   🔴 เครื่องหยุด: ยังไม่มีช่างรับเกิน 15 นาที → เตือนซ้ำทุก 15 นาที (ตลอดเวลา)
//   🟠 ผิดปกติ: เกิน 2 ชม. เตือนซ้ำทุก 2 ชม. · 🟢 ไม่ด่วน: เกิน 1 วัน (เฉพาะ 07:00–18:00)
//   ซ่อมเสร็จแต่ผู้แจ้งยังไม่ยืนยันเกิน 1 วัน → เตือนวันละครั้ง
function repairReminderCheck() {
  var now = new Date();
  var hour = Number(Utilities.formatDate(now, 'Asia/Bangkok', 'H'));
  var workHours = hour >= 7 && hour < 18;
  var res = sb('get', 'repair_requests?site=eq.banglen&status=in.(open,done)'
    + '&select=id,ticket_no,asset_name,urgency,symptom,reporter_name,status,reported_at,done_at,last_alert_at,alert_count');
  if (res.getResponseCode() >= 300) { Logger.log('repairReminderCheck: ' + res.getContentText()); return; }
  JSON.parse(res.getContentText() || '[]').forEach(function (r) {
    var since = r.status === 'done' ? new Date(r.done_at) : new Date(r.reported_at);
    var age = now - since, last = r.last_alert_at ? now - new Date(r.last_alert_at) : Infinity;
    var first, every, msg;
    if (r.status === 'done') {
      if (!workHours) return;
      first = every = 24 * 3600e3;
      msg = '⏳ <b>ซ่อมเสร็จแล้ว ยังไม่มีคนยืนยันปิดงาน</b> (' + dur(age) + ')\n<b>' + esc(r.ticket_no) + '</b> · ' + esc(r.asset_name)
          + '\n' + esc(r.reporter_name || 'ผู้แจ้ง') + ' ช่วยตรวจแล้วกดปิดงานด้วย';
    } else {
      if (r.urgency === 'stop') { first = every = 15 * 60e3; }
      else if (r.urgency === 'abnormal') { if (!workHours) return; first = every = 2 * 3600e3; }
      else { if (!workHours) return; first = every = 24 * 3600e3; }
      var n = (r.alert_count || 0) + 1;
      msg = (r.urgency === 'stop' ? '🚨' : '⏰') + ' <b>ยังไม่มีช่างรับงาน</b> ' + dur(age) + (n >= 3 ? ' — ‼️ หัวหน้าช่างช่วยจัดคน' : '')
          + '\n' + (URG[r.urgency] || '') + ' <b>' + esc(r.ticket_no) + '</b> · ' + esc(r.asset_name)
          + '\nอาการ: ' + esc(r.symptom || '-');
    }
    if (age < first || last < every) return;
    sendTelegram(msg + jobLink(r.id));
    sb('patch', 'repair_requests?id=eq.' + r.id, { last_alert_at: now.toISOString(), alert_count: (r.alert_count || 0) + 1 });
  });
}

function sb(method, path, payload) {
  var opts = {
    method: method,
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
    muteHttpExceptions: true
  };
  if (payload) opts.payload = JSON.stringify(payload);
  return UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/' + path, opts);
}

// ── ติดตั้ง: กด Run ฟังก์ชันนี้ครั้งเดียว ─────────────────────
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'repairReminderCheck') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('repairReminderCheck').timeBased().everyMinutes(10).create();
  sendTelegram('✅ ระบบแจ้งซ่อมพร้อมใช้งาน — ถ้าเห็นข้อความนี้ในกลุ่มช่าง แปลว่าตั้งค่าถูกแล้ว');
  Logger.log('ตั้งเตือนงานค้างทุก 10 นาทีแล้ว + ส่งข้อความทดสอบเข้ากลุ่มช่างแล้ว');
}
// ยกเลิกเตือนงานค้าง (ถ้าต้องการหยุด)
function stopReminder() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'repairReminderCheck') ScriptApp.deleteTrigger(t);
  });
  Logger.log('ยกเลิกเตือนงานค้างแล้ว');
}
