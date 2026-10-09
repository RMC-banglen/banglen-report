// ============================================================
// Apps Script แยก — ระบบแจ้งซ่อม (หน้า repair.html) อย่างเดียว ไม่เกี่ยวกับผลลูกปูน
// หน้าที่: รับเหตุการณ์จาก repair.html → ส่ง Telegram เข้ากลุ่มช่าง · เตือนงานค้างทุก 10 นาที
//         รอบงานประจำของช่าง + เปิดใบงาน PM ให้เอง (ทุกวัน 08:00) · สรุปประจำสัปดาห์ (จันทร์ 08:00)
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
  } else if (d.event === 'done' && r.kind === 'pm') {
    L.push('✅ <b>ทำ PM เสร็จ</b> — ' + head);
    L.push('ช่าง: ' + esc(r.technician || '-') + (r.helpers ? ' + ' + esc(r.helpers) : ''));
    L.push('ทำ: ' + esc(r.work_done || '-'));
    L.push('<i>อัปเดตวันที่ทำในรอบงานประจำให้แล้ว</i>');
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
  var withLink = !(d.event === 'closed' || d.event === 'cancelled' || (d.event === 'done' && r.kind === 'pm')) && r.id;
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

function sb(method, path, payload, returnRows) {
  var headers = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' };
  if (returnRows) headers.Prefer = 'return=representation';
  var opts = { method: method, headers: headers, muteHttpExceptions: true };
  if (payload) opts.payload = JSON.stringify(payload);
  return UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/' + path, opts);
}

// ── รอบงานประจำของช่าง (PM / เปลี่ยนอุปกรณ์ตามรอบ) → กลุ่มซ่อมบำรุงด้วย ──────
// อ่านจากตาราง calibration_items (หน้า "รอบงานประจำ" บนแดชบอร์ด) เฉพาะที่ผู้รับผิดชอบมีคำว่า "ช่าง" (เช่น ช่างวัฒ)
// กติกาเดียวกับแดชบอร์ด: เกินกำหนด / ใกล้ถึง (รอบนับวัน = ล่วงหน้า 3 วัน, รอบเดือน/ปี = ล่วงหน้า 30 วัน)
// หมวด "เปลี่ยนเมื่อชำรุด" ไม่เตือน · ส่งวันละครั้ง 08:00 (ตั้งด้วย setup) — กลุ่มหลักยังได้เตือนตามเดิม ไม่ได้ย้าย
var DASHBOARD_URL = 'https://rmc-banglen.github.io/banglen-report/';
function routineCheck() {
  var res = sb('get', 'calibration_items?select=id,name,category,interval_type,interval_value,next_cal_date,responsible');
  if (res.getResponseCode() >= 300) { Logger.log('routineCheck: ' + res.getContentText()); return; }
  var today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  var t0 = new Date(today + 'T00:00:00Z').getTime();
  // ใบงาน PM ที่ยังไม่ปิด (กันเปิดซ้ำ) — ถ้ายังไม่ได้รัน supabase-repair-v2.sql จะอ่านไม่ได้ → แค่เตือน ไม่เปิดใบงาน
  var openPm = {}, canPm = true;
  var act = sb('get', 'repair_requests?kind=eq.pm&status=in.(open,accepted,in_progress,waiting_parts,done)&select=id,ticket_no,pm_item_id');
  if (act.getResponseCode() >= 300) canPm = false;
  else JSON.parse(act.getContentText() || '[]').forEach(function (t) { openPm[t.pm_item_id] = t; });
  var overdue = [], soon = [];
  JSON.parse(res.getContentText() || '[]').forEach(function (x) {
    if (String(x.responsible || '').indexOf('ช่าง') < 0) return;
    if (x.category === 'เปลี่ยนเมื่อชำรุด' || !x.next_cal_date) return;
    var days = Math.round((new Date(String(x.next_cal_date).slice(0, 10) + 'T00:00:00Z').getTime() - t0) / 864e5);
    var warn = x.interval_type === 'day' ? 3 : 30;
    if (days > warn) return;
    var line = '• ' + esc(x.name) + ' — ' + esc(x.responsible) + ' · กำหนด ' + thDate(x.next_cal_date);
    // เหลือ ≤ 7 วัน (หรือเกินแล้ว) → เปิดใบงาน PM ให้ช่างกดรับ/ปิดเหมือนงานซ่อม
    var t = openPm[x.id];
    if (!t && canPm && days <= PM_OPEN_DAYS) t = createPmTicket(x, days);
    if (t) line += ' → <a href="' + REPAIR_PAGE_URL + '#' + t.id + '">' + esc(t.ticket_no) + '</a>';
    if (days < 0) overdue.push(line + ' <b>(เกินมา ' + (-days) + ' วัน)</b>');
    else soon.push(line + ' (อีก ' + days + ' วัน)');
  });
  if (!overdue.length && !soon.length) return;
  var L = ['🗓 <b>รอบงานประจำของช่าง</b>'];
  if (overdue.length) { L.push(''); L.push('🔴 <b>เกินกำหนด ' + overdue.length + ' รายการ</b>'); L = L.concat(overdue); }
  if (soon.length) { L.push(''); L.push('🟡 <b>ใกล้ถึงกำหนด ' + soon.length + ' รายการ</b>'); L = L.concat(soon); }
  L.push('');
  L.push('<i>เหลือ 7 วัน ระบบเปิดใบงาน PM ให้เอง — ช่างกดรับงาน ทำเสร็จกด "ทำ PM เสร็จ" วันที่ในรอบงานประจำจะอัปเดตเอง</i>');
  sendTelegram(L.join('\n'));
}
var PM_OPEN_DAYS = 7;
function createPmTicket(x, days) {
  var iv = x.interval_type === 'day' ? 'ทุก ' + x.interval_value + ' วัน' : x.interval_type === 'month' ? 'ทุก ' + x.interval_value + ' เดือน' : 'ทุก ' + x.interval_value + ' ปี';
  var row = { site: 'banglen', kind: 'pm', pm_item_id: x.id, asset_name: x.name, asset_category: 'PM', urgency: 'normal',
    symptom: 'PM ตามรอบ (' + iv + ') · กำหนด ' + thDate(x.next_cal_date) + (days < 0 ? ' — เกินมา ' + (-days) + ' วัน' : ''),
    reporter_name: 'ระบบ (รอบงานประจำ)', reporter_dept: 'PM', status: 'open' };
  var r = sb('post', 'repair_requests', [row], true);
  if (r.getResponseCode() >= 300) { Logger.log('createPmTicket: ' + r.getContentText()); return null; }
  var t = JSON.parse(r.getContentText())[0];
  sb('post', 'repair_events', [{ request_id: t.id, actor: 'ระบบ', action: 'เปิดใบงาน PM ตามรอบ', note: x.responsible || null }]);
  return t;
}

// ── สรุปประจำสัปดาห์ (ทุกวันจันทร์ 08:00) ─────────────────────
function weeklySummary() {
  var now = new Date(), since = new Date(now.getTime() - 7 * 864e5);
  var res = sb('get', 'repair_requests?site=eq.banglen&status=neq.cancelled&or=(reported_at.gte.' + since.toISOString() + ',done_at.gte.' + since.toISOString()
    + ',status.in.(open,accepted,in_progress,waiting_parts,done))&select=*');
  if (res.getResponseCode() >= 300) { Logger.log('weeklySummary: ' + res.getContentText()); return; }
  var rows = JSON.parse(res.getContentText() || '[]');
  var isPm = function (r) { return r.kind === 'pm'; };
  var newR = rows.filter(function (r) { return !isPm(r) && new Date(r.reported_at) >= since; });
  var doneR = rows.filter(function (r) { return !isPm(r) && r.done_at && new Date(r.done_at) >= since; });
  var openR = rows.filter(function (r) { return ['open', 'accepted', 'in_progress', 'waiting_parts'].indexOf(r.status) >= 0; });
  var waitR = rows.filter(function (r) { return r.status === 'done'; });
  var pmDone = rows.filter(function (r) { return isPm(r) && r.done_at && new Date(r.done_at) >= since; }).length;
  // เครื่องหยุด: เฉพาะช่วง 7 วันนี้ ของงานที่แจ้งว่า "เครื่องหยุด"
  var downH = 0, byAsset = {};
  rows.filter(function (r) { return !isPm(r) && r.urgency === 'stop'; }).forEach(function (r) {
    var a = Math.max(new Date(r.reported_at).getTime(), since.getTime());
    var b = r.done_at ? new Date(r.done_at).getTime() : now.getTime();
    if (b > a) { downH += (b - a) / 3600e3; byAsset[r.asset_name] = (byAsset[r.asset_name] || 0) + (b - a) / 3600e3; }
  });
  var cnt = {};
  newR.forEach(function (r) { cnt[r.asset_name] = (cnt[r.asset_name] || 0) + 1; });
  var top = Object.keys(cnt).sort(function (x, y) { return cnt[y] - cnt[x] || (byAsset[y] || 0) - (byAsset[x] || 0); }).slice(0, 3);
  var cost = doneR.reduce(function (s, r) { return s + (Number(r.parts_cost) || 0) + (Number(r.vendor_cost) || 0); }, 0);
  var avgRep = doneR.length ? doneR.reduce(function (s, r) { return s + (new Date(r.done_at) - new Date(r.reported_at)); }, 0) / doneR.length : null;
  var L = ['📊 <b>สรุปงานซ่อม 7 วันที่ผ่านมา</b> (' + thDate(Utilities.formatDate(since, 'Asia/Bangkok', 'yyyy-MM-dd')) + ' – ' + thDate(Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM-dd')) + ')', ''];
  L.push('🔧 แจ้งซ่อมใหม่ <b>' + newR.length + '</b> · ซ่อมเสร็จ <b>' + doneR.length + '</b>' + (pmDone ? ' · ทำ PM ' + pmDone : ''));
  L.push('⏱ เครื่องหยุดรวม <b>' + downH.toFixed(1) + ' ชม.</b>' + (avgRep != null ? ' · ซ่อมเฉลี่ย ' + dur(avgRep) : ''));
  if (cost > 0) L.push('💰 ค่าอะไหล่+จ้างนอก ' + Math.round(cost).toLocaleString() + ' บาท');
  if (top.length) {
    L.push(''); L.push('<b>เสียบ่อยสุด</b>');
    top.forEach(function (n, i) { L.push((i + 1) + '. ' + esc(n) + ' — ' + cnt[n] + ' ครั้ง' + (byAsset[n] ? ' · หยุด ' + byAsset[n].toFixed(1) + ' ชม.' : '')); });
  }
  L.push('');
  if (openR.length) {
    L.push('⏳ <b>งานค้างตอนนี้ ' + openR.length + ' ใบ</b>');
    openR.slice(0, 8).forEach(function (r) { L.push('• <a href="' + REPAIR_PAGE_URL + '#' + r.id + '">' + esc(r.ticket_no) + '</a> ' + esc(r.asset_name) + ' (' + dur(now - new Date(r.reported_at)) + ')'); });
  } else L.push('✅ ไม่มีงานค้าง');
  if (waitR.length) L.push('🕓 ซ่อมเสร็จรอผู้แจ้งยืนยัน ' + waitR.length + ' ใบ');
  L.push(''); L.push('<a href="' + DASHBOARD_URL + '">👉 ดูแดชบอร์ด</a>');
  sendTelegram(L.join('\n'));
}
function thDate(v) {
  var p = String(v || '').slice(0, 10).split('-');
  return p.length === 3 ? Number(p[2]) + '/' + Number(p[1]) + '/' + (Number(p[0]) + 543) : '-';
}

// ── ติดตั้ง: กด Run ฟังก์ชันนี้ครั้งเดียว (รันซ้ำได้ ไม่ซ้อน) ───────────
function setup() {
  stopReminder(true);
  ScriptApp.newTrigger('repairReminderCheck').timeBased().everyMinutes(10).create();
  ScriptApp.newTrigger('routineCheck').timeBased().atHour(8).everyDays(1).inTimezone('Asia/Bangkok').create();
  ScriptApp.newTrigger('weeklySummary').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).inTimezone('Asia/Bangkok').create();
  sendTelegram('✅ ระบบแจ้งซ่อมพร้อมใช้งาน — เตือนงานซ่อมค้างทุก 10 นาที · รอบงานประจำ/เปิดใบงาน PM ทุกวัน 08:00 · สรุปทุกวันจันทร์ 08:00');
  routineCheck();
  Logger.log('ตั้งเตือนงานค้างทุก 10 นาที + รอบงานประจำ/PM ทุกวัน 08:00 + สรุปทุกวันจันทร์ 08:00 แล้ว');
}
// ยกเลิกการเตือนทั้งหมด (ถ้าต้องการหยุด)
function stopReminder(silent) {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === 'repairReminderCheck' || h === 'routineCheck' || h === 'weeklySummary') ScriptApp.deleteTrigger(t);
  });
  if (silent !== true) Logger.log('ยกเลิกการเตือนทั้งหมดแล้ว');
}
