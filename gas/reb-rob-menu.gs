// ============================================================
// Apps Script — pile-production-data
// Sheet: รับคืนสินค้า-เสียหายหน้างาน บางเลน รหัสREB-ROB
// วิธีใช้:
//   1. เปิด Sheet → Extensions → Apps Script
//   2. วางโค้ดนี้ทั้งหมด → Save
//   3. รัน onOpen() ครั้งแรกเพื่อสร้างเมนู
//   4. หรือ reload หน้า Sheet เพื่อให้เมนูโผล่
// ============================================================

var SHEET_NAME_REB = 'รับคืนสินค้า-เสียหายหน้างาน บางเลน รหัสREB-ROB';
var COL_MONTH      = 1; // คอลัมน์ A = เดือน/ปี (เช่น "มกราคม 2568")
var COL_ID         = 2; // คอลัมน์ B = รหัส REB/ROB

// แปลงชื่อเดือนไทย → ตัวเลข
var THAI_MONTH_MAP = {
  'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,
  'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,'สิงหาคม':8,
  'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12
};

// แปลง "มกราคม 2568" → "2025-01" (CE yyyy-MM สำหรับ sort)
function parseThaiMonthYear(text) {
  if (!text) return '';
  text = String(text).trim();
  var parts = text.split(' ');
  if (parts.length < 2) return '';
  var m = THAI_MONTH_MAP[parts[0]];
  var beYear = parseInt(parts[1]);
  if (!m || isNaN(beYear)) return '';
  var ceYear = beYear - 543;
  return ceYear + '-' + (m < 10 ? '0' + m : String(m));
}

// แปลง yyyy-MM → ข้อความสวยงาม "เดือน 01/68 (2025-01)"
function fmtMenuLabel(ym) {
  var parts = ym.split('-');
  var ceYear = parseInt(parts[0]);
  var beYear = ceYear + 543;
  var mon = parts[1];
  var thaiMonths = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return 'เดือน ' + thaiMonths[parseInt(mon)] + '/' + String(beYear).slice(2) + '  (' + ceYear + '-' + mon + ')';
}

// ============================================================
// สร้างเมนูเมื่อเปิด Sheet
// ============================================================
function onOpen() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME_REB);
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('📅 เลือกเดือน');

  if (sh && sh.getLastRow() > 1) {
    var colA = sh.getRange(2, COL_MONTH, sh.getLastRow() - 1, 1).getValues();
    var months = {};
    colA.forEach(function(r) {
      var ym = parseThaiMonthYear(r[0]);
      if (ym) months[ym] = true;
    });

    Object.keys(months).sort().reverse().forEach(function(ym) {
      var fnName = 'showRebMonth_' + ym.replace('-', '_');
      menu.addItem(fmtMenuLabel(ym), fnName);
    });
  }

  menu.addSeparator();
  menu.addItem('✅ แสดงทั้งหมด', 'showAllRebRows');
  menu.addItem('🔒 แค่เดือนล่าสุด', 'showLatestRebMonth');
  menu.addToUi();
}

// ============================================================
// กรองแถวตามเดือน
// ============================================================
function handleRebMonth(ym) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_REB);
  if (!sh || sh.getLastRow() <= 1) return;
  var colA = sh.getRange(2, COL_MONTH, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < colA.length; i++) {
    var rowYM = parseThaiMonthYear(colA[i][0]);
    if (rowYM === ym) sh.showRows(i + 2, 1);
    else sh.hideRows(i + 2, 1);
  }
}

function showAllRebRows() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_REB);
  if (sh && sh.getLastRow() > 1) sh.showRows(2, sh.getLastRow() - 1);
  try { SpreadsheetApp.getUi().alert('✅ แสดงทั้งหมดแล้ว'); } catch(e) {}
}

function showLatestRebMonth() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_REB);
  if (!sh || sh.getLastRow() <= 1) return;
  var colA = sh.getRange(2, COL_MONTH, sh.getLastRow() - 1, 1).getValues();
  var latestYM = '';
  colA.forEach(function(r) {
    var ym = parseThaiMonthYear(r[0]);
    if (ym > latestYM) latestYM = ym;
  });
  if (!latestYM) return;
  for (var i = 0; i < colA.length; i++) {
    var ym = parseThaiMonthYear(colA[i][0]);
    if (ym === latestYM) sh.showRows(i + 2, 1);
    else sh.hideRows(i + 2, 1);
  }
  try { SpreadsheetApp.getUi().alert('✅ แสดงเฉพาะ ' + fmtMenuLabel(latestYM)); } catch(e) {}
}

// ============================================================
// ฟังก์ชันแต่ละเดือน 2025–2027
// ============================================================
function showRebMonth_2025_01(){handleRebMonth('2025-01');}
function showRebMonth_2025_02(){handleRebMonth('2025-02');}
function showRebMonth_2025_03(){handleRebMonth('2025-03');}
function showRebMonth_2025_04(){handleRebMonth('2025-04');}
function showRebMonth_2025_05(){handleRebMonth('2025-05');}
function showRebMonth_2025_06(){handleRebMonth('2025-06');}
function showRebMonth_2025_07(){handleRebMonth('2025-07');}
function showRebMonth_2025_08(){handleRebMonth('2025-08');}
function showRebMonth_2025_09(){handleRebMonth('2025-09');}
function showRebMonth_2025_10(){handleRebMonth('2025-10');}
function showRebMonth_2025_11(){handleRebMonth('2025-11');}
function showRebMonth_2025_12(){handleRebMonth('2025-12');}
function showRebMonth_2026_01(){handleRebMonth('2026-01');}
function showRebMonth_2026_02(){handleRebMonth('2026-02');}
function showRebMonth_2026_03(){handleRebMonth('2026-03');}
function showRebMonth_2026_04(){handleRebMonth('2026-04');}
function showRebMonth_2026_05(){handleRebMonth('2026-05');}
function showRebMonth_2026_06(){handleRebMonth('2026-06');}
function showRebMonth_2026_07(){handleRebMonth('2026-07');}
function showRebMonth_2026_08(){handleRebMonth('2026-08');}
function showRebMonth_2026_09(){handleRebMonth('2026-09');}
function showRebMonth_2026_10(){handleRebMonth('2026-10');}
function showRebMonth_2026_11(){handleRebMonth('2026-11');}
function showRebMonth_2026_12(){handleRebMonth('2026-12');}
function showRebMonth_2027_01(){handleRebMonth('2027-01');}
function showRebMonth_2027_02(){handleRebMonth('2027-02');}
function showRebMonth_2027_03(){handleRebMonth('2027-03');}
function showRebMonth_2027_04(){handleRebMonth('2027-04');}
function showRebMonth_2027_05(){handleRebMonth('2027-05');}
function showRebMonth_2027_06(){handleRebMonth('2027-06');}
function showRebMonth_2027_07(){handleRebMonth('2027-07');}
function showRebMonth_2027_08(){handleRebMonth('2027-08');}
function showRebMonth_2027_09(){handleRebMonth('2027-09');}
function showRebMonth_2027_10(){handleRebMonth('2027-10');}
function showRebMonth_2027_11(){handleRebMonth('2027-11');}
function showRebMonth_2027_12(){handleRebMonth('2027-12');}
