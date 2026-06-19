// ============================================================
// Blow Count 30 ฟุต — รับข้อมูลจาก Form → บันทึก Sheet → แจ้ง LINE
//
// วิธี Deploy:
//   1. เปิด Google Sheet "Blow Count" → Extensions → Apps Script
//   2. วางโค้ดนี้ → Save
//   3. Deploy → New deployment → Web app
//      - Execute as: Me
//      - Who has access: Anyone (anonymous)
//   4. Copy URL → วางใน blow-count-form.html ที่ GAS_URL
//
// LINE Notify Token:
//   - ไปที่ https://notify-bot.line.me → "Generate access token"
//   - เลือก Group ที่ต้องการแจ้ง → Copy Token
//   - วางใน LINE_NOTIFY_TOKEN ด้านล่าง
// ============================================================

const BLOW_SHEET_NAME = 'Blow Count';
const LINE_NOTIFY_TOKEN = 'YOUR_LINE_NOTIFY_TOKEN_HERE'; // <-- ใส่ Token

// เกณฑ์จำแนกชั้นดิน
const SOIL_SOFT_MAX   = 300;  // ≤ 300 = ดินอ่อน
const SOIL_HARD_MIN   = 700;  // ≥ 700 = ดินแข็งมาก
// 301–699 = ดินแข็งปานกลาง

function classifySoil(blow) {
  if (blow <= SOIL_SOFT_MAX)  return { status: 'ดินอ่อน',           emoji: '🟡' };
  if (blow < SOIL_HARD_MIN)   return { status: 'ดินแข็งปานกลาง',    emoji: '🟠' };
  return                               { status: 'ดินแข็งมาก',        emoji: '🔴' };
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
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
    if (blowNum <= SOIL_SOFT_MAX)       rowRange.setBackground('#fefcbf');
    else if (blowNum < SOIL_HARD_MIN)   rowRange.setBackground('#feebc8');
    else                                 rowRange.setBackground('#fed7d7');

    // ส่ง LINE Notify
    sendLineNotify(date, pile_id, worker, blowNum, soil, note);

    return respond(true, 'บันทึกสำเร็จ');

  } catch (err) {
    Logger.log('Error: ' + err.message);
    return respond(false, err.message);
  }
}

function sendLineNotify(date, pile_id, worker, blow, soil, note) {
  const msg = [
    '',
    '🔨 รายงานค่า Blow Count 30 ฟุต',
    '─────────────────',
    '📅 วันที่: ' + date,
    '🪧 เสา/งาน: ' + pile_id,
    '👷 พนักงาน: ' + worker,
    '💥 Blow Count: ' + blow + ' ครั้ง',
    '',
    soil.emoji + ' สถานะดิน: ' + soil.status,
    '─────────────────',
    note ? '📝 หมายเหตุ: ' + note : null
  ].filter(Boolean).join('\n');

  UrlFetchApp.fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + LINE_NOTIFY_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    payload: 'message=' + encodeURIComponent(msg),
    muteHttpExceptions: true
  });
}

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
