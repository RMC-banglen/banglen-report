// ============================================================
// Apps Script Web App — รับข้อมูลผลทดสอบคอนกรีต
// วิธี Deploy:
//   1. เปิด Sheet → Extensions → Apps Script
//   2. วางโค้ดนี้ทั้งหมด → Save
//   3. Deploy → New deployment → Web app
//      - Execute as: Me  |  Who has access: Anyone
//   4. Copy URL ที่ได้ → แจ้งกลับมาเพื่อใส่ใน skill
// ============================================================

var SHEET_NAME  = 'ผลทดสอบคอนกรีต';
var SUPABASE_URL = 'https://npxzerdirspwunuckcqr.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weHplcmRpcnNwd3VudWNrY3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjUxMjIsImV4cCI6MjA5NTcwMTEyMn0.4C1MucMeqPozXSfErLM44at7dykfzfFQvpVnoqmrMQI';

// ============================================================
// รับข้อมูลจาก skill → เขียน Sheet + sync Supabase อัตโนมัติ
// ============================================================
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) return respond(false, 'ไม่พบ Sheet: ' + SHEET_NAME);

    sh.appendRow([
      data.sample_date,
      data.test_date,
      data.age_days,
      data.formula_name,
      data.cube_size,
      data.result1_kn,
      data.result2_kn,
      data.result3_kn,
      data.avg_kn,
      data.avg_mpa,
      data.avg_ksc
    ]);

    var lastRow = sh.getLastRow();
    sh.getRange(lastRow, 12).setFormula('=TEXT(A' + lastRow + ',"YYYY-MM")');
    sh.getRange(2, 1, lastRow - 1, 12).sort({ column: 1, ascending: true });

    // Auto-sync ไป Supabase ทันที
    try {
      UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/concrete_results', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        payload: JSON.stringify([{
          sample_date:  data.sample_date,
          test_date:    data.test_date,
          age_days:     Number(data.age_days) || 0,
          formula_name: data.formula_name,
          cube_size:    data.cube_size,
          result1_kn:   Number(data.result1_kn) || 0,
          result2_kn:   Number(data.result2_kn) || 0,
          result3_kn:   Number(data.result3_kn) || 0,
          avg_kn:       Number(data.avg_kn) || 0,
          avg_mpa:      Number(data.avg_mpa) || 0,
          avg_ksc:      Number(data.avg_ksc) || 0
        }]),
        muteHttpExceptions: true
      });
    } catch(syncErr) {
      Logger.log('Supabase sync error: ' + syncErr.message);
    }

    Logger.log('บันทึกสำเร็จ: ' + JSON.stringify(data));
    return respond(true, 'บันทึกสำเร็จ');

  } catch (err) {
    Logger.log('Error: ' + err.message);
    return respond(false, err.message);
  }
}

// ============================================================
// ส่งข้อมูลทั้งหมดกลับ (Dashboard อ่าน)
// ============================================================
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) return respond(false, 'ไม่พบ Sheet');
    var rows = sh.getDataRange().getValues();
    var headers = rows[0];
    var data = rows.slice(1).filter(function(r){ return r[0]; }).map(function(r) {
      var obj = {};
      headers.forEach(function(h, i) {
        var v = r[i];
        obj[h] = v instanceof Date ? Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd') : v;
      });
      return obj;
    });
    var materials = [];
    var matSh = ss.getSheetByName('วัตถุดิบ');
    if (matSh) {
      var matRows = matSh.getDataRange().getValues();
      var matH = matRows[0];
      materials = matRows.slice(1).filter(function(r){ return r[0]; }).map(function(r) {
        var obj = {};
        matH.forEach(function(h, i){ obj[h] = r[i] === '' ? null : r[i]; });
        return obj;
      });
    }
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: data, materials: materials }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return respond(false, err.message);
  }
}

// ============================================================
// Sync Sheet ทั้งหมดไป Supabase (กดจากเมนู)
// ============================================================
function syncConcrete() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { SpreadsheetApp.getUi().alert('❌ ไม่พบ Sheet'); return; }

  var rows = sh.getDataRange().getValues();
  var records = rows.slice(1).filter(function(r){ return r[0]; }).map(function(r) {
    return {
      sample_date:  r[0] instanceof Date ? Utilities.formatDate(r[0],'Asia/Bangkok','yyyy-MM-dd') : String(r[0]).slice(0,10),
      test_date:    r[1] instanceof Date ? Utilities.formatDate(r[1],'Asia/Bangkok','yyyy-MM-dd') : String(r[1]).slice(0,10),
      age_days:     Number(r[2]) || 0,
      formula_name: String(r[3]),
      cube_size:    String(r[4]),
      result1_kn:   Number(r[5]) || 0,
      result2_kn:   Number(r[6]) || 0,
      result3_kn:   Number(r[7]) || 0,
      avg_kn:       Number(r[8]) || 0,
      avg_mpa:      Number(r[9]) || 0,
      avg_ksc:      Number(r[10]) || 0
    };
  });

  // ลบข้อมูลเก่าก่อน
  UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/concrete_results?id=gte.0', {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
    muteHttpExceptions: true
  });

  // แทรกทีละ 500 แถว
  var BATCH = 500;
  for (var i = 0; i < records.length; i += BATCH) {
    UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/concrete_results', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      payload: JSON.stringify(records.slice(i, i + BATCH)),
      muteHttpExceptions: true
    });
  }

  SpreadsheetApp.getUi().alert('✅ Sync สำเร็จ ' + records.length + ' แถว');
}

// ============================================================
// ลบแถวซ้ำ
// ============================================================
function syncMaterials() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('วัตถุดิบ');
  if (!sh) { SpreadsheetApp.getUi().alert('❌ ไม่พบ Sheet วัตถุดิบ'); return; }

  var rows = sh.getDataRange().getValues();
  var records = rows.slice(1).filter(function(r){ return r[0]; }).map(function(r) {
    return {
      mat_label:    String(r[0]),
      cement_total: Number(r[1]) || null,
      cement_large: Number(r[2]) || null,
      cement_18:    Number(r[3]) || null,
      stone_34:     Number(r[4]) || null,
      stone_1:      Number(r[5]) || null,
      sand:         Number(r[6]) || null
    };
  });

  // ลบข้อมูลเก่าก่อน
  UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/materials_daily?id=gte.0', {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
    muteHttpExceptions: true
  });

  // แทรกใหม่
  UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/materials_daily', {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    payload: JSON.stringify(records),
    muteHttpExceptions: true
  });

  SpreadsheetApp.getUi().alert('✅ Sync วัตถุดิบสำเร็จ ' + records.length + ' แถว');
}

function removeDuplicates() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sh) return;
  var data = sh.getDataRange().getValues();
  var seen = {};
  var toDelete = [];
  for (var i = data.length - 1; i >= 1; i--) {
    var key = [String(data[i][0]).slice(0,10), String(data[i][1]).slice(0,10), data[i][2], data[i][3], data[i][5], data[i][6], data[i][7]].join('|');
    if (seen[key]) { toDelete.push(i + 1); } else { seen[key] = true; }
  }
  toDelete.forEach(function(row){ sh.deleteRow(row); });
  SpreadsheetApp.getUi().alert('✅ ลบแถวซ้ำแล้ว ' + toDelete.length + ' แถว');
}

// ============================================================
// เมนูบน Sheet
// ============================================================
function onOpen() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('📅 เลือกเดือน');

  if (sh && sh.getLastRow() > 1) {
    var dates = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    var months = {};
    dates.forEach(function(r) {
      var d = r[0];
      var ym = d instanceof Date ? Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM') : String(d).slice(0, 7);
      if (ym && ym.length === 7) months[ym] = true;
    });
    Object.keys(months).sort().reverse().forEach(function(ym) {
      var parts = ym.split('-');
      var be = Number(parts[0]) + 543;
      menu.addItem('เดือน ' + parts[1] + '/' + String(be).slice(2) + '  (' + ym + ')', 'showMonth_' + ym.replace('-', '_'));
    });
  }

  menu.addSeparator();
  menu.addItem('✅ แสดงทั้งหมด', 'showAllRows');
  menu.addItem('🔒 แค่เดือนล่าสุด', 'showLatestMonthOnly');
  menu.addToUi();

  ui.createMenu('Sync Dashboard')
    .addItem('🔄 Sync ผลคอนกรีตไป Dashboard', 'syncConcrete')
    .addItem('🧱 Sync วัตถุดิบไป Dashboard', 'syncMaterials')
    .addItem('🗑️ ลบแถวซ้ำ', 'removeDuplicates')
    .addToUi();
}

function handleMonthMenu(ym) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sh || sh.getLastRow() <= 1) return;
  var dates = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < dates.length; i++) {
    var d = dates[i][0];
    var rowYM = d instanceof Date ? Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM') : String(d).slice(0, 7);
    if (rowYM === ym) sh.showRows(i + 2, 1); else sh.hideRows(i + 2, 1);
  }
}

function showAllRows() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (sh && sh.getLastRow() > 1) sh.showRows(2, sh.getLastRow() - 1);
  try { SpreadsheetApp.getUi().alert('✅ แสดงทั้งหมดแล้ว'); } catch(e) {}
}

function showLatestMonthOnly() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sh || sh.getLastRow() <= 1) return;
  var dates = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  var latestYM = '';
  dates.forEach(function(r) {
    var ym = r[0] instanceof Date ? Utilities.formatDate(r[0], 'Asia/Bangkok', 'yyyy-MM') : String(r[0]).slice(0, 7);
    if (ym > latestYM) latestYM = ym;
  });
  if (!latestYM) return;
  for (var i = 0; i < dates.length; i++) {
    var ym = dates[i][0] instanceof Date ? Utilities.formatDate(dates[i][0], 'Asia/Bangkok', 'yyyy-MM') : String(dates[i][0]).slice(0, 7);
    if (ym === latestYM) sh.showRows(i + 2, 1); else sh.hideRows(i + 2, 1);
  }
  try { SpreadsheetApp.getUi().alert('✅ แสดงเฉพาะเดือน ' + latestYM); } catch(e) {}
}

function showMonth_2026_01(){handleMonthMenu('2026-01');}
function showMonth_2026_02(){handleMonthMenu('2026-02');}
function showMonth_2026_03(){handleMonthMenu('2026-03');}
function showMonth_2026_04(){handleMonthMenu('2026-04');}
function showMonth_2026_05(){handleMonthMenu('2026-05');}
function showMonth_2026_06(){handleMonthMenu('2026-06');}
function showMonth_2026_07(){handleMonthMenu('2026-07');}
function showMonth_2026_08(){handleMonthMenu('2026-08');}
function showMonth_2026_09(){handleMonthMenu('2026-09');}
function showMonth_2026_10(){handleMonthMenu('2026-10');}
function showMonth_2026_11(){handleMonthMenu('2026-11');}
function showMonth_2026_12(){handleMonthMenu('2026-12');}

function respond(success, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: success, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}
