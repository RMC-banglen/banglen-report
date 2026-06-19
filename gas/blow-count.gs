// ============================================================
// Blow Count 30 ฟุต — รับข้อมูลจาก Form → บันทึก Sheet → แจ้ง LINE
//
// วิธี Deploy:
//   1. เปิด Google Sheet "Blow Count" → Extensions → Apps Script
//   2. วางโค้ดนี้ทั้งหมด → Save
//   3. Deploy → New deployment → Web app
//      - Execute as: Me
//      - Who has access: Anyone (anonymous)
//   4. Copy URL → วางใน blow-count-form.html ที่ GAS_URL
//
// ตั้งค่า LINE Messaging API:
//   1. ไปที่ https://developers.line.biz → สร้าง Channel → Messaging API
//   2. แท็บ "Messaging API" → Issue "Channel access token" → Copy
//   3. เพิ่ม Bot เข้า Group LINE
//   4. ส่งข้อความใดก็ได้ใน Group → Bot จะรับ Webhook → ดู Group ID ใน Log
//      (หรือใช้ getGroupId() ด้านล่างเพื่อดู ID)
//   5. ใส่ Token และ Group ID ด้านล่าง
// ============================================================

const BLOW_SHEET_NAME = 'Blow Count';

// LINE Messaging API
const LINE_CHANNEL_TOKEN = 'YOUR_CHANNEL_ACCESS_TOKEN_HERE'; // <-- ใส่ Channel Access Token
const LINE_GROUP_ID      = 'YOUR_GROUP_ID_HERE';             // <-- ใส่ Group ID

// เกณฑ์จำแนกชั้นดิน
const SOIL_SOFT_MAX   = 300;  // ≤ 300  = ดินอ่อน
const SOIL_HARD_MIN   = 700;  // ≥ 700  = ดินแข็งมาก
// 301–699 = ดินแข็งปานกลาง

function classifySoil(blow) {
  if (blow <= SOIL_SOFT_MAX)  return { status: 'ดินอ่อน',        emoji: '🟡' };
  if (blow < SOIL_HARD_MIN)   return { status: 'ดินแข็งปานกลาง', emoji: '🟠' };
  return                               { status: 'ดินแข็งมาก',    emoji: '🔴' };
}

// ============================================================
// Webhook จาก LINE — รับ Event เพื่อหา Group ID
// (เปิดใช้ Webhook ใน LINE Developers Console → แท็บ Messaging API)
// ============================================================
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    // ถ้าเป็น Webhook จาก LINE (มี events) → บันทึก Group ID ลง Log
    if (body.events) {
      body.events.forEach(ev => {
        if (ev.source && ev.source.groupId) {
          Logger.log('✅ Group ID: ' + ev.source.groupId);
        }
      });
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ถ้าเป็น POST จาก blow-count-form.html
    return handleFormSubmit(body);

  } catch (err) {
    Logger.log('Error doPost: ' + err.message);
    return respond(false, err.message);
  }
}

function handleFormSubmit(data) {
  const { date, pile_id, worker, blow, note } = data;

  if (!date || !pile_id || !worker || blow === undefined || blow === null) {
    return respond(false, 'ข้อมูลไม่ครบถ้วน');
  }

  const blowNum = Number(blow);
  if (isNaN(blowNum) || blowNum < 0) {
    return respond(false, 'ค่า Blow Count ไม่ถูกต้อง');
  }

  const soil = classifySoil(blowNum);

  // บันทึกลง Sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(BLOW_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(BLOW_SHEET_NAME);
    sh.appendRow(['วันที่', 'เลขเสา/รหัสงาน', 'พนักงาน', 'Blow Count (ครั้ง)', 'สถานะดิน', 'หมายเหตุ', 'เวลาบันทึก']);
    sh.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#2c5282').setFontColor('white');
  }

  const now = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');
  sh.appendRow([date, pile_id, worker, blowNum, soil.status, note || '', now]);

  // ระบายสีแถวตามประเภทดิน
  const lastRow = sh.getLastRow();
  const rowRange = sh.getRange(lastRow, 1, 1, 7);
  if      (blowNum <= SOIL_SOFT_MAX) rowRange.setBackground('#fefcbf');
  else if (blowNum <  SOIL_HARD_MIN) rowRange.setBackground('#feebc8');
  else                               rowRange.setBackground('#fed7d7');

  // ส่ง LINE
  sendLineMessage(date, pile_id, worker, blowNum, soil, note);

  return respond(true, 'บันทึกสำเร็จ');
}

// ============================================================
// ส่งข้อความเข้า LINE Group ผ่าน Messaging API
// ============================================================
function sendLineMessage(date, pile_id, worker, blow, soil, note) {
  const lines = [
    '🔨 รายงานค่า Blow Count 30 ฟุต',
    '─────────────────',
    '📅 วันที่: ' + date,
    '🪧 เสา/งาน: ' + pile_id,
    '👷 พนักงาน: ' + worker,
    '💥 Blow Count: ' + blow + ' ครั้ง',
    '',
    soil.emoji + ' สถานะดิน: ' + soil.status,
    '─────────────────'
  ];
  if (note) lines.push('📝 หมายเหตุ: ' + note);

  const payload = {
    to: LINE_GROUP_ID,
    messages: [{
      type: 'text',
      text: lines.join('\n')
    }]
  };

  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + LINE_CHANNEL_TOKEN,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

// ============================================================
// ฟังก์ชันช่วย: ทดสอบส่ง LINE (รันใน Apps Script โดยตรง)
// ============================================================
function testSendLine() {
  sendLineMessage(
    '2026-06-19', 'P-TEST-001', 'ทดสอบระบบ', 450,
    classifySoil(450), 'ทดสอบการส่งข้อความ'
  );
  Logger.log('ส่งข้อความทดสอบแล้ว — ดู Group LINE');
}

// ============================================================
// ดูข้อมูลทั้งหมดผ่าน GET (optional)
// ============================================================
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(BLOW_SHEET_NAME);
  if (!sh) return respond(false, 'ไม่พบ Sheet');

  const rows = sh.getDataRange().getValues();
  const headers = rows[0];
  const data = rows.slice(1).filter(r => r[0]).map(r => {
    const obj = {};
    headers.forEach((h, i) => {
      const v = r[i];
      obj[h] = (v instanceof Date) ? Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd') : v;
    });
    return obj;
  });

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function respond(success, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success, message }))
    .setMimeType(ContentService.MimeType.JSON);
}
