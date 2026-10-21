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
var TELEGRAM_CHAT_PILE = '';    // ไอดีกลุ่ม "Rmc คำนวณเสาเข็ม" — แจ้งเตือน "ขอรายการคำนวณเสาเข็ม" (ถ้าว่าง = ไม่ส่ง)

var SUPABASE_URL = 'https://npxzerdirspwunuckcqr.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weHplcmRpcnNwd3VudWNrY3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjUxMjIsImV4cCI6MjA5NTcwMTEyMn0.4C1MucMeqPozXSfErLM44at7dykfzfFQvpVnoqmrMQI';
var REPAIR_PAGE_URL = 'https://rmc-banglen.github.io/banglen-report/repair.html';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.kind === 'repair_event') notifyRepair(data);
    if (data.kind === 'pile_calc_event') notifyPileCalc(data);
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
  } else if (d.event === 'assigned') {
    L.push('👷 <b>มอบหมายงาน</b> — ' + head);
    L.push('มอบให้: <b>' + esc(r.technician || '-') + '</b> (โดย ' + esc(d.actor || r.assigned_by || 'หัวหน้า') + ')');
    L.push('อาการ: ' + esc(r.symptom || '-'));
    L.push('<i>' + esc(r.technician || 'ช่าง') + ' กดรับงานในแอป</i>');
  } else if (d.event === 'declined') {
    L.push('↩ <b>ช่างส่งคืนงาน</b> — ' + head);
    L.push('โดย: ' + esc(d.actor || '-') + (d.note ? ' — ' + esc(d.note) : ''));
    var hd = headTagsFor(headList(), r.asset_category);
    L.push('งานกลับไปรอรับ ' + (hd ? hd + ' ' : '') + 'ช่วยมอบหมายใหม่');
  } else if (d.event === 'accepted') {
    L.push('🙋 ' + esc(d.actor || r.technician || '') + ' รับงานแล้ว — ' + head);
  } else if (d.event === 'waiting_parts') {
    L.push('⏸ <b>รออะไหล่</b> — ' + head);
    if (d.note) L.push('รอ: ' + esc(d.note));
  } else if (d.event === 'outsourced') {
    L.push('🚚 <b>ส่งซ่อมนอก</b> — ' + head);
    L.push('ร้าน: <b>' + esc(r.outsource_vendor || '-') + '</b>');
    if (r.outsource_eta) L.push('คาดว่าเสร็จ: ' + thDate(r.outsource_eta));
    if (r.outsource_est) L.push('ประเมิน: ' + Number(r.outsource_est).toLocaleString() + ' บาท');
    L.push('ช่าง: ' + esc(r.technician || d.actor || '-') + (d.note ? ' · ' + esc(d.note) : ''));
    var hh = headTagsFor(headList(), r.asset_category);
    if (hh) L.push(hh + ' (รับทราบการส่งซ่อมนอก)');
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
  try { pileCalcDaily(); } catch (err) { Logger.log('pileCalcDaily: ' + err.message); }
  try { pileTelegramPoll(); } catch (err) { Logger.log('pileTelegramPoll: ' + err.message); }
  var now = new Date();
  var hour = Number(Utilities.formatDate(now, 'Asia/Bangkok', 'H'));
  var workHours = hour >= 7 && hour < 18;
  var res = sb('get', 'repair_requests?site=eq.banglen&status=in.(open,assigned,done,outsourced)'
    + '&select=id,ticket_no,asset_name,asset_category,urgency,symptom,reporter_name,status,reported_at,done_at,last_alert_at,alert_count,outsource_vendor,outsource_eta,technician,updated_at');
  if (res.getResponseCode() >= 300) res = sb('get', 'repair_requests?site=eq.banglen&status=in.(open,done)'
    + '&select=id,ticket_no,asset_name,asset_category,urgency,symptom,reporter_name,status,reported_at,done_at,last_alert_at,alert_count');
  if (res.getResponseCode() >= 300) { Logger.log('repairReminderCheck: ' + res.getContentText()); return; }
  var headL = headList();
  JSON.parse(res.getContentText() || '[]').forEach(function (r) {
    var heads = headTagsFor(headL, r.asset_category);
    if (r.status === 'assigned') {
      // ช่างที่ถูกมอบหมายยังไม่กดรับ: เตือนตามความเร่งด่วนเหมือนงานรอรับ นับเวลาจากตอนมอบหมาย (updated_at)
      var aAge = now - new Date(r.updated_at || r.reported_at), aLast = r.last_alert_at ? now - new Date(r.last_alert_at) : Infinity;
      var aEvery = r.urgency === 'stop' ? 15 * 60e3 : r.urgency === 'abnormal' ? 2 * 3600e3 : 24 * 3600e3;
      if (r.urgency !== 'stop' && !workHours) return;
      if (aAge < aEvery || aLast < aEvery) return;
      sendTelegram('👷⏰ <b>' + esc(r.technician || 'ช่าง') + ' ยังไม่กดรับงานที่ถูกมอบหมาย</b> ' + dur(aAge) + '\n' + (URG[r.urgency] || '') + ' <b>' + esc(r.ticket_no) + '</b> · ' + esc(r.asset_name)
        + '\nอาการ: ' + esc(r.symptom || '-') + (((r.alert_count || 0) + 1) >= 3 && heads ? '\n' + heads + ' (ช่วยตาม/มอบหมายใหม่)' : '') + jobLink(r.id));
      sb('patch', 'repair_requests?id=eq.' + r.id, { last_alert_at: now.toISOString(), alert_count: (r.alert_count || 0) + 1 });
      return;
    }
    if (r.status === 'outsourced') {
      // รถอยู่ร้านนอก: เตือนเฉพาะเมื่อเลยวันคาดเสร็จ (วันละครั้ง ช่วงเวลาทำงาน) — ตามช่างให้ไปถามร้าน
      var today = Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM-dd');
      if (!workHours || !r.outsource_eta || String(r.outsource_eta).slice(0, 10) >= today) return;
      if (r.last_alert_at && now - new Date(r.last_alert_at) < 24 * 3600e3) return;
      var late = Math.round((new Date(today + 'T00:00:00Z') - new Date(String(r.outsource_eta).slice(0, 10) + 'T00:00:00Z')) / 864e5);
      sendTelegram('🚚⏰ <b>รถอยู่ร้านนอกเลยกำหนด ' + late + ' วัน</b>\n<b>' + esc(r.ticket_no) + '</b> · ' + esc(r.asset_name) + ' — ร้าน ' + esc(r.outsource_vendor || '-')
        + '\nคาดว่าเสร็จ ' + thDate(r.outsource_eta) + ' — ช่างช่วยโทรถามร้าน' + (heads ? '\n' + heads : '') + jobLink(r.id));
      sb('patch', 'repair_requests?id=eq.' + r.id, { last_alert_at: now.toISOString(), alert_count: (r.alert_count || 0) + 1 });
      return;
    }
    var since = r.status === 'done' ? new Date(r.done_at) : new Date(r.reported_at);
    var age = now - since, last = r.last_alert_at ? now - new Date(r.last_alert_at) : Infinity;
    var first, every, msg;
    if (r.status === 'done') {
      if (!workHours) return;
      first = every = 24 * 3600e3;
      msg = '⏳ <b>ซ่อมเสร็จแล้ว ยังไม่มีคนยืนยันปิดงาน</b> (' + dur(age) + ')\n<b>' + esc(r.ticket_no) + '</b> · ' + esc(r.asset_name)
          + '\n' + esc(r.reporter_name || 'ผู้แจ้ง') + ' ช่วยตรวจแล้วกดปิดงานด้วย' + (heads ? '\n' + heads + ' (หัวหน้าปิดแทนได้)' : '');
    } else {
      if (r.urgency === 'stop') { first = every = 15 * 60e3; }
      else if (r.urgency === 'abnormal') { if (!workHours) return; first = every = 2 * 3600e3; }
      else { if (!workHours) return; first = every = 24 * 3600e3; }
      var n = (r.alert_count || 0) + 1;
      msg = (r.urgency === 'stop' ? '🚨' : '⏰') + ' <b>ยังไม่มีช่างรับงาน</b> ' + dur(age) + (n >= 3 ? ' — ‼️ หัวหน้าช่างช่วยจัดคน' + (heads ? ' ' + heads : '') : '')
          + '\n' + (URG[r.urgency] || '') + ' <b>' + esc(r.ticket_no) + '</b> · ' + esc(r.asset_name)
          + '\nอาการ: ' + esc(r.symptom || '-');
    }
    if (age < first || last < every) return;
    sendTelegram(msg + jobLink(r.id));
    sb('patch', 'repair_requests?id=eq.' + r.id, { last_alert_at: now.toISOString(), alert_count: (r.alert_count || 0) + 1 });
  });
}

// @แท็กหัวหน้าช่าง (ตั้งชื่อผู้ใช้ Telegram ในแดชบอร์ด แท็บแจ้งซ่อม → รายชื่อช่าง) — แท็กแล้วมือถือหัวหน้าเด้งแม้ปิดเสียงกลุ่ม
// หัวหน้าฝ่ายที่ตั้งหมวดไว้ ถูกแท็กเฉพาะงานในหมวดนั้น (fleet = รถขนส่ง+เครนรถ · factory = อื่นๆ) · หัวหน้าช่างถูกแท็กทุกงาน
function headList() {
  var r = sb('get', 'repair_staff?site=eq.banglen&role=in.(head,manager)&active=eq.true&select=telegram,role,scope');
  if (r.getResponseCode() >= 300) r = sb('get', 'repair_staff?site=eq.banglen&role=in.(head,manager)&active=eq.true&select=telegram,role');
  if (r.getResponseCode() >= 300) return [];
  return JSON.parse(r.getContentText() || '[]').filter(function (x) { return x.telegram; });
}
function headTagsFor(list, cat) {
  var fleet = cat === 'รถขนส่ง' || cat === 'เครนรถขนส่ง';
  return list.filter(function (x) {
    if (x.role !== 'manager' || !x.scope || x.scope === 'all') return true;
    return x.scope === 'fleet' ? fleet : !fleet;
  }).map(function (x) { return '@' + x.telegram; }).join(' ');
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
    + ',status.in.(open,assigned,accepted,in_progress,waiting_parts,outsourced,done))&select=*');
  if (res.getResponseCode() >= 300) { Logger.log('weeklySummary: ' + res.getContentText()); return; }
  var rows = JSON.parse(res.getContentText() || '[]');
  var isPm = function (r) { return r.kind === 'pm'; };
  var newR = rows.filter(function (r) { return !isPm(r) && new Date(r.reported_at) >= since; });
  var doneR = rows.filter(function (r) { return !isPm(r) && r.done_at && new Date(r.done_at) >= since; });
  var openR = rows.filter(function (r) { return ['open', 'assigned', 'accepted', 'in_progress', 'waiting_parts', 'outsourced'].indexOf(r.status) >= 0; });
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

// ── ขอรายการคำนวณเสาเข็ม → กลุ่ม Rmc คำนวณเสาเข็ม ──────────────────────────
// หน้า pile-calc-request.html ส่งเหตุการณ์ (งานใหม่/เปลี่ยนสถานะ) มาที่ doPost · เตือนงานเกินกำหนดทุกเช้า 08:00 (จันทร์–เสาร์)
var PILE_SLA = { draw: 1, send: 1, pdf: 2, original: 7 };  // วัน — ให้ตรงกับค่าตั้งในหน้า pile-calc-request
var PILE_MSG = {
  received: ['🆕', 'คำขอคำนวณเสาเข็มใหม่', function () { return '⏱ ต้องเขียนแบบ/คำนวณภายใน ' + PILE_SLA.draw + ' วัน'; }],
  drawn:    ['✏️', 'เขียนแบบ/คำนวณเสร็จแล้ว', function () { return 'ต่อไป: ส่ง zip ให้ สย.'; }],
  sent:     ['📤', 'ส่ง zip ให้ สย. แล้ว', function () { return '⏱ รอ PDF กลับภายใน ' + PILE_SLA.pdf + ' วัน'; }],
  pdf_back: ['📥', 'ได้ PDF กลับจาก สย. แล้ว', function () { return 'ต่อไป: ตรวจ PDF'; }],
  pdf_ok:   ['✅', 'ตรวจ PDF ผ่านแล้ว', function () { return '⏱ รอเอกสารตัวจริงภายใน ' + PILE_SLA.original + ' วัน'; }],
  revise:   ['↩️', 'ส่งแก้กลับ สย.', function () { return '⏱ รอ สย. ส่งคืนภายใน ' + PILE_SLA.pdf + ' วัน'; }],
  original: ['🏁', 'ได้เอกสารตัวจริงแล้ว — จบงาน', function () { return ''; }],
  cancel:   ['🚫', 'ยกเลิกงาน', function () { return ''; }]
};
var PILE_STL = { received: 'รับคำขอแล้ว', drawn: 'เขียนแบบ/คำนวณเสร็จ', sent: 'ส่ง zip ให้ สย. แล้ว', pdf_back: 'ได้ PDF กลับแล้ว', pdf_ok: 'ตรวจ PDF ผ่าน', revise: 'ส่งแก้กลับ สย.', original: 'ได้เอกสารตัวจริงแล้ว', cancel: 'ยกเลิก' };
function sendPile(text, replyTo) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_PILE) { Logger.log('ยังไม่ได้ใส่ TELEGRAM_TOKEN / TELEGRAM_CHAT_PILE'); return; }
  var body = { chat_id: TELEGRAM_CHAT_PILE, text: text, parse_mode: 'HTML', disable_web_page_preview: true };
  if (replyTo) { body.reply_to_message_id = replyTo; body.allow_sending_without_reply = true; }
  UrlFetchApp.fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
}
function pileLine(e) {
  return '• <b>' + esc(e.code || 'ยังไม่มีรหัส') + '</b> ' + esc(e.project || '-')
    + (e.owner ? '\n   เจ้าของ: ' + esc(e.owner) : '') + (e.location ? ' · ' + esc(e.location) : '')
    + (e.spec ? '\n   เสา: ' + esc(e.spec) : '');
}
function notifyPileCalc(d) {
  var evs = d.events || [];
  var groups = {}, order = [];
  evs.forEach(function (e) {
    var k = PILE_MSG[e.status] ? e.status : null; if (!k) return;
    if (!groups[k]) { groups[k] = []; order.push(k); }
    groups[k].push(e);
  });
  order.forEach(function (k) {
    var m = PILE_MSG[k], list = groups[k], by = list[0].by;
    var L = [m[0] + ' <b>' + m[1] + '</b>' + (list.length > 1 ? ' ' + list.length + ' งาน' : '')];
    list.forEach(function (e) {
      L.push(pileLine(e));
      if (k === 'revise' && e.note) L.push('   เหตุผล: ' + esc(e.note));
      if (k === 'revise' && e.revisions) L.push('   (แก้ครั้งที่ ' + e.revisions + ')');
    });
    var hint = m[2](); if (hint) L.push('\n' + hint);
    if (by) L.push('โดย ' + esc(by));
    L.push('<a href="' + DASHBOARD_URL + '">👉 เปิดหน้าติดตาม (เมนู อื่นๆ → ขอรายการคำนวณเสาเข็ม)</a>');
    sendPile(L.join('\n'));
  });
}
// กฎเกินกำหนด: ตรงกับ overdue() ในหน้า pile-calc-request  [วัน, เหตุผล, ใครต้องทำ]
function pileOverdueRule(st) {
  return {
    received: [PILE_SLA.draw, 'ยังไม่เขียนแบบ/คำนวณ', 'f'],
    drawn:    [PILE_SLA.send, 'เขียนแบบเสร็จแล้ว แต่ยังไม่ส่ง สย.', 'f'],
    sent:     [PILE_SLA.pdf, 'สย. ยังไม่ส่ง PDF กลับ', 's'],
    pdf_back: [1, 'ได้ PDF แล้ว แต่ยังไม่ตรวจ', 'f'],
    revise:   [PILE_SLA.pdf, 'ส่งแก้กลับแล้ว สย. ยังไม่ส่งคืน', 's'],
    pdf_ok:   [PILE_SLA.original, 'ยังไม่ได้รับเอกสารตัวจริง', 's']
  }[st];
}
function pileCalcDaily(force) {
  if (!TELEGRAM_CHAT_PILE) return;
  var now = new Date();
  var hour = Number(Utilities.formatDate(now, 'Asia/Bangkok', 'H'));
  var dow = Number(Utilities.formatDate(now, 'Asia/Bangkok', 'u'));   // 1=จันทร์ … 7=อาทิตย์
  var day = Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM-dd');
  var props = PropertiesService.getScriptProperties();
  if (force !== true) {
    if (hour < 8 || hour > 9 || dow === 7) return;
    if (props.getProperty('PILECALC_LAST') === day) return;
  }
  var res = sb('get', 'pile_calc_requests?select=data');
  if (res.getResponseCode() >= 300) { Logger.log('pileCalcDaily: ' + res.getContentText()); return; }
  var fac = [], syy = [];
  JSON.parse(res.getContentText() || '[]').forEach(function (row) {
    var r = row.data || {}, rule = pileOverdueRule(r.status);
    if (!rule || !r.history || !r.history.length) return;
    var days = (now - r.history[r.history.length - 1].t) / 864e5;
    if (days < rule[0]) return;
    var it = { days: Math.floor(days), line: '• ' + esc(r.code || 'ยังไม่มีรหัส') + ' ' + esc(r.project || '-') + ' — ' + rule[1] + ' <b>' + Math.floor(days) + ' วัน</b>' };
    (rule[2] === 'f' ? fac : syy).push(it);
  });
  if (force !== true) props.setProperty('PILECALC_LAST', day);
  if (!fac.length && !syy.length) { if (force === true) sendPile('✅ ไม่มีงานคำนวณเสาเข็มค้างเกินกำหนด'); return; }
  var byDays = function (a, b) { return b.days - a.days; };
  var L = ['⏰ <b>งานคำนวณเสาเข็มเกินกำหนด</b> ' + (fac.length + syy.length) + ' งาน'];
  if (fac.length) { L.push('\n🏭 <b>ฝั่งโรงงาน/ฝ่ายผลิต (ต้องเร่ง)</b>'); fac.sort(byDays).slice(0, 12).forEach(function (x) { L.push(x.line); }); }
  if (syy.length) { L.push('\n📮 <b>รอ สย.</b>'); syy.sort(byDays).slice(0, 12).forEach(function (x) { L.push(x.line); }); }
  L.push('\n<a href="' + DASHBOARD_URL + '">👉 เปิดหน้าติดตาม (เมนู อื่นๆ → ขอรายการคำนวณเสาเข็ม)</a>');
  sendPile(L.join('\n'));
}
// ทดสอบ: กด Run ฟังก์ชันนี้ → ส่งสรุปงานเกินกำหนดเข้ากลุ่ม Rmc คำนวณเสาเข็ม ทันที (ไม่นับเป็นรอบของวัน)
function testPileCalc() {
  sendPile('✅ ทดสอบ: แจ้งเตือนขอรายการคำนวณเสาเข็ม เข้ากลุ่ม Rmc คำนวณเสาเข็ม ได้แล้ว');
  pileCalcDaily(true);
}


// ── ส่งข้อความเข้ากลุ่ม → ระบบสร้างคำขอให้เอง ─────────────────────
// คนในกลุ่มวางข้อความคำขอ (รูปแบบเดียวกับที่วางในหน้า "รับคำขอใหม่") → บอทอ่าน แยกข้อมูล บันทึกเข้าฐานข้อมูล แล้วตอบกลับสรุปให้ตรวจ
// ต้องตั้งบอทเป็น "ผู้ดูแลกลุ่ม" (ไม่งั้นบอทไม่เห็นข้อความทั่วไป) · ตรวจข้อความใหม่ทุก 1 นาที (setupPileCalc)
// ตัวแยกข้อความ = โค้ดเดียวกับปุ่ม "แยกข้อมูล" ในหน้า pile-calc-request.html
var PileParse = (function () {
  const uid = () => Math.random().toString(36).slice(2, 9);
  const ORG_RE = /^(บริษัท|บจก|บมจ|หจก|ห้างหุ้นส่วน|โรงพยาบาล|รพ\.|โรงเรียน|มหาวิทยาลัย|วัด|อบต|อบจ|เทศบาล|องค์การ|กรม|สำนักงาน|การไฟฟ้า|การประปา|มูลนิธิ|สหกรณ์|กองทัพ|ศาล|ธนาคาร|นิติบุคคล|สมาคม|ร้าน|หมู่บ้าน)/;
  const cleanProject = s => (s || '').replace(/^\s*(?:ชื่อ)?(?:โ?ครงการ|ชื่องาน)\s*[:：.\-]?\s*/, '');
  const normOwner = s0 => {
    const s = (s0 || '').normalize('NFC').replace(/ํา/g, 'ำ').replace(/\s+/g, ' ').trim(); let m;
    if ((m = s.match(/^(?:บมจ\.?|บริษัทมหาชน|บริษัท\s*มหาชน)\s*(.+?)\s*(?:จำกัด)?\s*(?:\(?\s*มหาชน\s*\)?)?$/))) return `บริษัท ${m[1]} จำกัด (มหาชน)`;
    if ((m = s.match(/^(?:บจก\.?|บ\.|บริษัท)\s*(.+?)\s*(?:\(?\s*มหาชน\s*\)?)$/))) return `บริษัท ${m[1].replace(/\s*จำกัด$/, '')} จำกัด (มหาชน)`;
    if ((m = s.match(/^(?:บจก\.?|บ\.|บริษัท)\s*(.+?)\s*(?:จำกัด|จก\.?)?$/))) return `บริษัท ${m[1]} จำกัด`;
    if ((m = s.match(/^รพ\.?\s*(.+)$/))) return `โรงพยาบาล${m[1]}`;
    if ((m = s.match(/^(?:หจก\.?|ห้างหุ้นส่วนจำกัด)\s*(.+)$/))) return `ห้างหุ้นส่วนจำกัด ${m[1]}`;
    if ((m = s.match(/^(?:นางสาว|น\.ส\.|นาย|นาง|คุณ)\s*(.+)$/))) return 'คุณ' + m[1].trim();
    if (s && !ORG_RE.test(s) && !/^(ดร\.|ด\.ต|จ\.ส\.|ส\.อ|ร\.ต|ร\.ท|ร\.อ|พ\.ต|พ\.ท|พ\.อ|พล|ว่าที่|พระ|หม่อม|ม\.ร\.ว|Mr|Ms|Mrs)/i.test(s)) return 'คุณ' + s;
    return s;
  };
  const emptyItem = () => ({ id: uid(), section: 'I', std: 'tis', joint: 'single', hammer: '', drop: '', dowel: '', size: '', length: '', qa: '', qty: '', micro: false, segLen: '', segCount: '' });
  const emptyDraft = () => ({ project: '', owner: '', location: '', requester: '', hammer: '', drop: '', items: [emptyItem()] });
  function parseItem(line) {
    const sz = line.match(/(?:^|[^a-z])(?:I|ไอ|S|สี่เหลี่ยม|เสา)\s*-?\s*(0?\.\d{2}|\d{2})(?!\d)/i);
    if (!sz) return null;
    const it = emptyItem();
    if (/สี่เหลี่ยม|(?:^|[^a-z])S\s*-?\s*\d/i.test(line)) it.section = 'S';
    const v = parseFloat(sz[1]); it.size = String(v < 1 ? v : v / 100);
    const lens = [...line.matchAll(/[x×*]\s*(\d+(?:\.\d+)?)\s*(?:เมตร|ม|m)?/gi)].map(m => m[1]).filter(x => parseFloat(x) >= 1);
    const len = line.match(/ยาว\s*(\d+(?:\.\d+)?)/);
    const seg = line.match(/(\d+(?:\.\d+)?)\s*(?:ม\.?|m\.?)\s*[x×*]?\s*(\d+)\s*ท่อน/i);
    if (len) it.length = len[1]; else if (lens.length) it.length = lens[lens.length - 1];
    if (/ไมโคร|micro/i.test(line) || seg) {
      it.micro = true;
      const ml = line.match(/(?:ไมโคร\S*|micro\S*)\s*(\d+(?:\.\d+)?)\s*(?:ม|m)/i);
      if (seg) { it.segLen = seg[1]; it.segCount = seg[2]; } else if (ml) it.segLen = ml[1];
      const c = line.match(/(\d+)\s*ท่อน/); if (c) it.segCount = c[1];
      if (!it.length && it.segLen && it.segCount) it.length = String(parseFloat(it.segLen) * parseInt(it.segCount));
      if (!it.segCount && it.segLen && it.length) it.segCount = String(Math.round(parseFloat(it.length) / parseFloat(it.segLen)));
    }
    if (!it.micro) { if (/ต\s*\/\s*ช|ตช|ต่อเชื่อม|ต่อ\s*เชื่อม/.test(line)) it.joint = 'joined'; else it.joint = 'single'; } else it.joint = 'micro';
    if (/โรงงาน|ธรรมดา/.test(line)) it.std = 'factory'; else if (/มอก|TIS/i.test(line)) it.std = 'tis';
    const qa = line.match(/Qa\.?\s*[=:]?\s*(\d+(?:\.\d+)?)/i) || line.match(/(\d+(?:\.\d+)?)\s*ตัน/); if (qa) it.qa = qa[1];
    const q = line.match(/(\d+)\s*ต้น/); if (q) it.qty = q[1];
    return it;
  }
  
  function parseLine(txt) {
    const d = emptyDraft(); d.items = [];
    const street = /^(ถนน|ถ\.|แขวง|เขต|ตำบล|ต\.|อำเภอ|อ\.|จังหวัด|จ\.|ซอย|ซ\.)/;
    let last = null; const pend = {};
    const addLoc = s => { s = s.trim(); if (s) d.location = d.location ? d.location + ' ' + s : s; };
    const setOwner = s => {
      s = s.replace(/^[\s.:：\-–,]+/, '').trim();
      const m = s.match(/\s*(?:^|\s)(ต\.|ตำบล|อ\.|อำเภอ|จ\.|จังหวัด|แขวง|เขต|ถ\.|ถนน|ซ\.|ซอย|เลขที่|\d+\/\d+)/);
      if (m && m.index > 0) { addLoc(s.slice(m.index)); s = s.slice(0, m.index); }
      d.owner = normOwner(s);
    };
    txt.split(/\n/).map(l => l.trim()).filter(Boolean).forEach(l0 => {
      let l = l0;
      const ow = l.match(/(เจ้าของ(?:โครงการ)?|ลูกค้า)\s*[:：]?\s*(.+)$/);
      if (ow) { setOwner(ow[2]); l = l.slice(0, ow.index).trim(); if (l) step(l); last = 'loc'; return; }
      step(l);
    });
    function step(l) { let m;
      const setLast = (k, v) => { if (d.items.length) d.items[d.items.length - 1][k] = v; else pend[k] = v; };
      if (/^(สล|สลัก|เหล็กเดือย|dowel)/i.test(l) && (m = l.match(/(\d+)\s*-?\s*(DB|RB)\s*(\d+)\s*(?:mm\.?)?\s*(?:[x×*]\s*(\d+(?:\.\d+)?))?/i))) { setLast('dowel', `${m[1]}${m[2].toUpperCase()}${m[3]}${m[4] ? '×' + parseFloat(m[4]).toFixed(2) + ' ม.' : ''}`); return; }
      if ((m = l.match(/ตุ้ม\D*?(\d+(?:\.\d+)?)/))) { setLast('hammer', m[1]); return; }
      if (/^(ยก|ระยะยก)/.test(l) && (m = l.match(/(\d+(?:\.\d+)?)/))) { setLast('drop', m[1]); return; }
      if (/^Qa/i.test(l) && (m = l.match(/Qa\.?\s*[=:]?\s*(\d+(?:\.\d+)?)/i))) { setLast('qa', m[1]); return; }
      if (/^(ชื่อ)?(โ?ครงการ|ชื่องาน)/.test(l)) { d.project = cleanProject(l); last = 'project'; return; }
      if (/^(สถานที่|ที่ตั้ง|หน้างาน|ที่อยู่)/.test(l)) { d.location = l.replace(/^(สถานที่|ที่ตั้ง|หน้างาน|ที่อยู่)\s*[:：]?\s*/, ''); last = 'loc'; return; }
      if (/^(ผู้ขอ|เซลล์|sale|ผู้ส่ง)/i.test(l)) { d.requester = l.replace(/^(ผู้ขอ|เซลล์|sale|ผู้ส่ง)\s*[:：]?\s*/i, ''); return; }
      const it = parseItem(l); if (it) { d.items.push(it); last = 'item'; return; }
      if (!d.owner && d.project && /^(บริษัท|บจก|บมจ|หจก|ห้างหุ้นส่วน|คุณ|นาย|นาง|โรงพยาบาล|รพ\.|โรงเรียน|มหาวิทยาลัย|วัด|อบต|อบจ|เทศบาล|องค์การ|กรม|สำนักงาน|การไฟฟ้า|การประปา|มูลนิธิ|สหกรณ์)/.test(l)) { setOwner(l); last = 'loc'; return; }
      if (/^(ขอ|รบกวน)/.test(l)) return;
      if (street.test(l) && (d.location || last === 'loc')) { addLoc(l); last = 'loc'; }
      else if (last === 'project' && !street.test(l)) d.project += ' ' + l;
      else if (!d.project) { d.project = l; last = 'project'; }
      else if (!d.location) { d.location = l; last = 'loc'; }
      else if (last === 'loc') d.location += ' ' + l;
    }
    if (!d.items.length) d.items.push(emptyItem());
    d.items.forEach(i => Object.keys(pend).forEach(k => { if (!i[k]) i[k] = pend[k]; }));
    return d;
  }
  
  return { parseLine: parseLine, cleanProject: cleanProject, uid: uid };
})();

function pileSpec(i) {
  var f = function (v) { var n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? '?' : n.toFixed(2); };
  return (i.section || 'I') + '-' + f(i.size) + 'x' + f(i.size) + 'x' + f(i.length) + ' m.'
    + (i.qa ? ' · Qa ' + i.qa + ' ตัน' : '') + (i.qty ? ' · ' + i.qty + ' ต้น' : '');
}
function pileKey(project, items) {
  return String(project || '').replace(/\s+/g, '').toLowerCase() + '|' + items.map(function (i) { return [i.section, Number(i.size), Number(i.length)].join('/'); }).join(',');
}
function pileTelegramPoll() {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_PILE) return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    var props = PropertiesService.getScriptProperties();
    var offset = Number(props.getProperty('PILETG_OFFSET') || 0);
    var url = 'https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/getUpdates?timeout=0&limit=100&allowed_updates=' + encodeURIComponent('["message"]') + (offset ? '&offset=' + offset : '');
    var j = JSON.parse(UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText() || '{}');
    if (!j.ok) { Logger.log('pileTelegramPoll: ' + (j.description || 'getUpdates ล้มเหลว')); return; }
    var ups = j.result || [];
    if (!ups.length) return;
    props.setProperty('PILETG_OFFSET', String(ups[ups.length - 1].update_id + 1));  // ยืนยันก่อนประมวลผล → ไม่ทำซ้ำ
    ups.forEach(function (u) {
      try { handlePileMessage(u.message); } catch (err) { Logger.log('handlePileMessage: ' + err.message); }
    });
  } finally { lock.releaseLock(); }
}
function handlePileMessage(m) {
  if (!m || !m.chat || String(m.chat.id) !== String(TELEGRAM_CHAT_PILE)) return;   // รับเฉพาะกลุ่มคำนวณเสาเข็ม
  if (m.from && m.from.is_bot) return;
  var text = String(m.text || m.caption || '').trim();
  if (!text || text.charAt(0) === '/') return;
  var sender = m.from ? ((m.from.first_name || '') + ' ' + (m.from.last_name || '')).trim() || m.from.username || '' : '';
  var d = PileParse.parseLine(text);
  var items = d.items.filter(function (i) { return i.size || i.length; });
  var project = PileParse.cleanProject(d.project).trim();
  var lines = text.split(/\n/).filter(function (x) { return x.trim(); }).length;
  var looksLikeRequest = /(โ?ครงการ|ชื่องาน)\s*[:：]?/.test(text) && lines >= 2;
  // ข้อความคุยทั่วไป (เช่น "รับทราบ") ไม่นับ — ต้องมีเสาที่ระบุทั้งขนาดและความยาว และมีอย่างน้อย 2 บรรทัด
  var complete = items.length > 0 && items.every(function (i) { return i.size && i.length; }) && lines >= 2;
  if (!complete) {
    if (looksLikeRequest || (items.length && lines >= 2)) sendPile('⚠️ <b>อ่านคำขอไม่ครบ ยังไม่ได้บันทึก</b>\n' + (project ? '' : '• ไม่พบชื่อโครงการ (ขึ้นต้นบรรทัดด้วย "โครงการ ...")\n') + (items.length ? '' : '• ไม่พบขนาด/ความยาวเสา เช่น I0.22×18.00 เมตร\n') + (items.length && !items.every(function (i) { return i.size && i.length; }) ? '• มีเสาที่ขนาดหรือความยาวไม่ครบ\n' : '') + 'ช่วยส่งใหม่ให้ครบ หรือกรอกเองในหน้าติดตาม', m.message_id);
    return;
  }
  if (!project) { sendPile('⚠️ <b>ไม่พบชื่อโครงการ ยังไม่ได้บันทึก</b>\nขึ้นต้นบรรทัดด้วย "โครงการ ..." แล้วส่งใหม่', m.message_id); return; }
  // กันส่งซ้ำ: ชื่อโครงการ + เสาชุดเดียวกัน ที่ยังไม่จบ/ไม่ยกเลิก
  var res = sb('get', 'pile_calc_requests?select=data');
  if (res.getResponseCode() >= 300) { Logger.log('pile intake get: ' + res.getContentText()); sendPile('⚠️ บันทึกไม่ได้ (เชื่อมฐานข้อมูลไม่สำเร็จ) ลองส่งใหม่อีกครั้ง', m.message_id); return; }
  var key = pileKey(project, items), dup = null;
  JSON.parse(res.getContentText() || '[]').forEach(function (row) {
    var r = row.data || {};
    if (!dup && r.status !== 'cancel' && r.status !== 'original' && pileKey(PileParse.cleanProject(r.project), (r.items || []).filter(function (i) { return i.size || i.length; })) === key) dup = r;
  });
  if (dup) { sendPile('ℹ️ <b>มีคำขอนี้อยู่ในระบบแล้ว</b> (ไม่สร้างซ้ำ)\n• <b>' + esc(dup.code || 'ยังไม่มีรหัส') + '</b> ' + esc(dup.project || '') + '\nสถานะ: ' + esc(PILE_STL[dup.status] || dup.status), m.message_id); return; }
  var nr = {
    id: PileParse.uid(), code: null, project: project, owner: (d.owner || '').trim(), location: (d.location || '').trim(),
    requester: (d.requester || '').trim() || sender, hammer: d.hammer || '', drop: d.drop || '', items: items,
    status: 'received', revisions: 0, check: null, lineRaw: text,
    history: [{ status: 'received', t: Date.now(), note: 'นำเข้าจากข้อความ Telegram', by: sender }]
  };
  var ins = sb('post', 'pile_calc_requests', [{ id: nr.id, data: nr, updated_at: new Date().toISOString(), updated_by: sender || 'Telegram' }]);
  if (ins.getResponseCode() >= 300) { Logger.log('pile intake insert: ' + ins.getContentText()); sendPile('⚠️ บันทึกไม่ได้ (' + ins.getResponseCode() + ') ลองส่งใหม่อีกครั้ง', m.message_id); return; }
  var L = ['🆕 <b>รับคำขอคำนวณเสาเข็มเข้าระบบแล้ว</b>', '• ' + esc(nr.project)];
  if (nr.owner) L.push('   เจ้าของ: ' + esc(nr.owner));
  if (nr.location) L.push('   สถานที่: ' + esc(nr.location));
  items.forEach(function (i) { L.push('   เสา: ' + esc(pileSpec(i))); });
  if (nr.requester) L.push('   ผู้ขอ: ' + esc(nr.requester));
  L.push('\n⏱ ต้องเขียนแบบ/คำนวณภายใน ' + PILE_SLA.draw + ' วัน');
  L.push('ถ้าอ่านผิด แก้ได้ในหน้าติดตาม');
  L.push('<a href="' + DASHBOARD_URL + '">👉 เปิดหน้าติดตาม (เมนู อื่นๆ → ขอรายการคำนวณเสาเข็ม)</a>');
  sendPile(L.join('\n'), m.message_id);
}
// ตั้งให้ตรวจข้อความในกลุ่มทุก 1 นาที — กด Run ครั้งเดียว (รันซ้ำได้ ไม่ซ้อน)
function setupPileCalc() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'pileTelegramPoll') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('pileTelegramPoll').timeBased().everyMinutes(1).create();
  sendPile('✅ ระบบรับคำขอจากข้อความพร้อมแล้ว — วางข้อความคำขอ (เหมือนที่วางในหน้า "รับคำขอใหม่") ในกลุ่มนี้ ระบบจะบันทึกให้เองภายใน 1 นาที\nต้องมี: บรรทัด "โครงการ ..." + เสา เช่น I0.22×18.00 เมตร (อย่างน้อย 2 บรรทัด)');
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
    if (h === 'repairReminderCheck' || h === 'routineCheck' || h === 'weeklySummary' || h === 'pileTelegramPoll') ScriptApp.deleteTrigger(t);
  });
  if (silent !== true) Logger.log('ยกเลิกการเตือนทั้งหมดแล้ว');
}
