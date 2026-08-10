// ============================================================
// Apps Script — ใช้ร่วมกันทั้ง productionreport และ pile-production-data
// ตรวจสอบ Spreadsheet อัตโนมัติ → ทำงานแยกกัน
// ============================================================

var SHEET_NAME   = 'ผลทดสอบคอนกรีต';
var SUPABASE_URL = 'https://npxzerdirspwunuckcqr.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weHplcmRpcnNwd3VudWNrY3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjUxMjIsImV4cCI6MjA5NTcwMTEyMn0.4C1MucMeqPozXSfErLM44at7dykfzfFQvpVnoqmrMQI';

// ============================================================
// ตรวจว่าเป็น pile-production-data หรือเปล่า
// ============================================================
function isPileSheet() {
  var name = SpreadsheetApp.getActiveSpreadsheet().getName();
  return name.toLowerCase().indexOf('pile') >= 0;
}

// ============================================================
// onOpen — แยกเมนูตาม Spreadsheet
// ============================================================
function onOpen() {
  var ui = SpreadsheetApp.getUi();

  if (isPileSheet()) {
    // pile-production-data → เมนูเลือกเดือนเท่านั้น (ไม่มี Sync)
    buildPileMonthMenu(ui);
  } else {
    // productionreport → เมนูเลือกเดือน + Sync Dashboard
    buildConcreteMonthMenu(ui);
    ui.createMenu('Sync Dashboard')
      .addItem('🔄 Sync ทั้งหมด (คอนกรีต + วัตถุดิบ)', 'syncAll')
      .addItem('🧪 Sync เฉพาะผลคอนกรีต', 'syncConcrete')
      .addItem('🧱 Sync เฉพาะวัตถุดิบ', 'syncMaterials')
      .addItem('🗑️ ลบแถวซ้ำ', 'removeDuplicates')
      .addToUi();
  }
}

// ============================================================
// เมนูเดือน — pile-production-data (Column A = "มกราคม 2568")
// ============================================================
var THAI_MONTH_MAP = {
  'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,
  'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,'สิงหาคม':8,
  'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12
};

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

function fmtThaiLabel(ym) {
  var parts = ym.split('-');
  var be = Number(parts[0]) + 543;
  var thaiM = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return 'เดือน ' + thaiM[parseInt(parts[1])] + '/' + String(be).slice(2) + '  (' + ym + ')';
}

function buildPileMonthMenu(ui) {
  var menu = ui.createMenu('📅 เลือกเดือน');
  var sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sh && sh.getLastRow() > 1) {
    var colA = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    var months = {};
    colA.forEach(function(r) {
      var ym = parseThaiMonthYear(r[0]);
      if (ym) months[ym] = true;
    });
    Object.keys(months).sort().reverse().forEach(function(ym) {
      menu.addItem(fmtThaiLabel(ym), 'showPileMonth_' + ym.replace('-', '_'));
    });
  }
  menu.addSeparator();
  menu.addItem('✅ แสดงทั้งหมด', 'pileShowAll');
  menu.addItem('🔒 แค่เดือนล่าสุด', 'pileShowLatest');
  menu.addToUi();
}

function filterPileByMonth(ym) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (!sh || sh.getLastRow() <= 1) return;
  var colA = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < colA.length; i++) {
    if (parseThaiMonthYear(colA[i][0]) === ym) sh.showRows(i + 2, 1);
    else sh.hideRows(i + 2, 1);
  }
}

function pileShowAll() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sh && sh.getLastRow() > 1) sh.showRows(2, sh.getLastRow() - 1);
  try { SpreadsheetApp.getUi().alert('✅ แสดงทั้งหมดแล้ว'); } catch(e) {}
}

function pileShowLatest() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (!sh || sh.getLastRow() <= 1) return;
  var colA = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  var latest = '';
  colA.forEach(function(r) { var ym = parseThaiMonthYear(r[0]); if (ym > latest) latest = ym; });
  if (!latest) return;
  for (var i = 0; i < colA.length; i++) {
    if (parseThaiMonthYear(colA[i][0]) === latest) sh.showRows(i + 2, 1);
    else sh.hideRows(i + 2, 1);
  }
  try { SpreadsheetApp.getUi().alert('✅ แสดงเฉพาะ ' + fmtThaiLabel(latest)); } catch(e) {}
}

// ฟังก์ชันเดือน pile (2024–2027)
function showPileMonth_2024_01(){filterPileByMonth('2024-01');} function showPileMonth_2024_02(){filterPileByMonth('2024-02');} function showPileMonth_2024_03(){filterPileByMonth('2024-03');} function showPileMonth_2024_04(){filterPileByMonth('2024-04');} function showPileMonth_2024_05(){filterPileByMonth('2024-05');} function showPileMonth_2024_06(){filterPileByMonth('2024-06');} function showPileMonth_2024_07(){filterPileByMonth('2024-07');} function showPileMonth_2024_08(){filterPileByMonth('2024-08');} function showPileMonth_2024_09(){filterPileByMonth('2024-09');} function showPileMonth_2024_10(){filterPileByMonth('2024-10');} function showPileMonth_2024_11(){filterPileByMonth('2024-11');} function showPileMonth_2024_12(){filterPileByMonth('2024-12');}
function showPileMonth_2025_01(){filterPileByMonth('2025-01');} function showPileMonth_2025_02(){filterPileByMonth('2025-02');} function showPileMonth_2025_03(){filterPileByMonth('2025-03');} function showPileMonth_2025_04(){filterPileByMonth('2025-04');} function showPileMonth_2025_05(){filterPileByMonth('2025-05');} function showPileMonth_2025_06(){filterPileByMonth('2025-06');} function showPileMonth_2025_07(){filterPileByMonth('2025-07');} function showPileMonth_2025_08(){filterPileByMonth('2025-08');} function showPileMonth_2025_09(){filterPileByMonth('2025-09');} function showPileMonth_2025_10(){filterPileByMonth('2025-10');} function showPileMonth_2025_11(){filterPileByMonth('2025-11');} function showPileMonth_2025_12(){filterPileByMonth('2025-12');}
function showPileMonth_2026_01(){filterPileByMonth('2026-01');} function showPileMonth_2026_02(){filterPileByMonth('2026-02');} function showPileMonth_2026_03(){filterPileByMonth('2026-03');} function showPileMonth_2026_04(){filterPileByMonth('2026-04');} function showPileMonth_2026_05(){filterPileByMonth('2026-05');} function showPileMonth_2026_06(){filterPileByMonth('2026-06');} function showPileMonth_2026_07(){filterPileByMonth('2026-07');} function showPileMonth_2026_08(){filterPileByMonth('2026-08');} function showPileMonth_2026_09(){filterPileByMonth('2026-09');} function showPileMonth_2026_10(){filterPileByMonth('2026-10');} function showPileMonth_2026_11(){filterPileByMonth('2026-11');} function showPileMonth_2026_12(){filterPileByMonth('2026-12');}
function showPileMonth_2027_01(){filterPileByMonth('2027-01');} function showPileMonth_2027_02(){filterPileByMonth('2027-02');} function showPileMonth_2027_03(){filterPileByMonth('2027-03');} function showPileMonth_2027_04(){filterPileByMonth('2027-04');} function showPileMonth_2027_05(){filterPileByMonth('2027-05');} function showPileMonth_2027_06(){filterPileByMonth('2027-06');} function showPileMonth_2027_07(){filterPileByMonth('2027-07');} function showPileMonth_2027_08(){filterPileByMonth('2027-08');} function showPileMonth_2027_09(){filterPileByMonth('2027-09');} function showPileMonth_2027_10(){filterPileByMonth('2027-10');} function showPileMonth_2027_11(){filterPileByMonth('2027-11');} function showPileMonth_2027_12(){filterPileByMonth('2027-12');}

// ============================================================
// เมนูเดือน — productionreport (Column A = Date object)
// ============================================================
function buildConcreteMonthMenu(ui) {
  var menu = ui.createMenu('📅 เลือกเดือน');
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
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
      menu.addItem('เดือน ' + parts[1] + '/' + String(be).slice(2) + '  (' + ym + ')', 'showConcreteMonth_' + ym.replace('-', '_'));
    });
  }
  menu.addSeparator();
  menu.addItem('✅ แสดงทั้งหมด', 'concreteShowAll');
  menu.addItem('🔒 แค่เดือนล่าสุด', 'concreteShowLatest');
  menu.addToUi();
}

function filterConcreteByMonth(ym) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sh || sh.getLastRow() <= 1) return;
  var dates = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < dates.length; i++) {
    var d = dates[i][0];
    var rowYM = d instanceof Date ? Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM') : String(d).slice(0, 7);
    if (rowYM === ym) sh.showRows(i + 2, 1); else sh.hideRows(i + 2, 1);
  }
}

function concreteShowAll() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (sh && sh.getLastRow() > 1) sh.showRows(2, sh.getLastRow() - 1);
  try { SpreadsheetApp.getUi().alert('✅ แสดงทั้งหมดแล้ว'); } catch(e) {}
}

function concreteShowLatest() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sh || sh.getLastRow() <= 1) return;
  var dates = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  var latest = '';
  dates.forEach(function(r) { var ym = r[0] instanceof Date ? Utilities.formatDate(r[0], 'Asia/Bangkok', 'yyyy-MM') : String(r[0]).slice(0, 7); if (ym > latest) latest = ym; });
  if (!latest) return;
  for (var i = 0; i < dates.length; i++) {
    var ym = dates[i][0] instanceof Date ? Utilities.formatDate(dates[i][0], 'Asia/Bangkok', 'yyyy-MM') : String(dates[i][0]).slice(0, 7);
    if (ym === latest) sh.showRows(i + 2, 1); else sh.hideRows(i + 2, 1);
  }
  try { SpreadsheetApp.getUi().alert('✅ แสดงเฉพาะเดือน ' + latest); } catch(e) {}
}

// ฟังก์ชันเดือน concrete (2024–2027)
function showConcreteMonth_2024_01(){filterConcreteByMonth('2024-01');} function showConcreteMonth_2024_02(){filterConcreteByMonth('2024-02');} function showConcreteMonth_2024_03(){filterConcreteByMonth('2024-03');} function showConcreteMonth_2024_04(){filterConcreteByMonth('2024-04');} function showConcreteMonth_2024_05(){filterConcreteByMonth('2024-05');} function showConcreteMonth_2024_06(){filterConcreteByMonth('2024-06');} function showConcreteMonth_2024_07(){filterConcreteByMonth('2024-07');} function showConcreteMonth_2024_08(){filterConcreteByMonth('2024-08');} function showConcreteMonth_2024_09(){filterConcreteByMonth('2024-09');} function showConcreteMonth_2024_10(){filterConcreteByMonth('2024-10');} function showConcreteMonth_2024_11(){filterConcreteByMonth('2024-11');} function showConcreteMonth_2024_12(){filterConcreteByMonth('2024-12');}
function showConcreteMonth_2025_01(){filterConcreteByMonth('2025-01');} function showConcreteMonth_2025_02(){filterConcreteByMonth('2025-02');} function showConcreteMonth_2025_03(){filterConcreteByMonth('2025-03');} function showConcreteMonth_2025_04(){filterConcreteByMonth('2025-04');} function showConcreteMonth_2025_05(){filterConcreteByMonth('2025-05');} function showConcreteMonth_2025_06(){filterConcreteByMonth('2025-06');} function showConcreteMonth_2025_07(){filterConcreteByMonth('2025-07');} function showConcreteMonth_2025_08(){filterConcreteByMonth('2025-08');} function showConcreteMonth_2025_09(){filterConcreteByMonth('2025-09');} function showConcreteMonth_2025_10(){filterConcreteByMonth('2025-10');} function showConcreteMonth_2025_11(){filterConcreteByMonth('2025-11');} function showConcreteMonth_2025_12(){filterConcreteByMonth('2025-12');}
function showConcreteMonth_2026_01(){filterConcreteByMonth('2026-01');} function showConcreteMonth_2026_02(){filterConcreteByMonth('2026-02');} function showConcreteMonth_2026_03(){filterConcreteByMonth('2026-03');} function showConcreteMonth_2026_04(){filterConcreteByMonth('2026-04');} function showConcreteMonth_2026_05(){filterConcreteByMonth('2026-05');} function showConcreteMonth_2026_06(){filterConcreteByMonth('2026-06');} function showConcreteMonth_2026_07(){filterConcreteByMonth('2026-07');} function showConcreteMonth_2026_08(){filterConcreteByMonth('2026-08');} function showConcreteMonth_2026_09(){filterConcreteByMonth('2026-09');} function showConcreteMonth_2026_10(){filterConcreteByMonth('2026-10');} function showConcreteMonth_2026_11(){filterConcreteByMonth('2026-11');} function showConcreteMonth_2026_12(){filterConcreteByMonth('2026-12');}
function showConcreteMonth_2027_01(){filterConcreteByMonth('2027-01');} function showConcreteMonth_2027_02(){filterConcreteByMonth('2027-02');} function showConcreteMonth_2027_03(){filterConcreteByMonth('2027-03');} function showConcreteMonth_2027_04(){filterConcreteByMonth('2027-04');} function showConcreteMonth_2027_05(){filterConcreteByMonth('2027-05');} function showConcreteMonth_2027_06(){filterConcreteByMonth('2027-06');} function showConcreteMonth_2027_07(){filterConcreteByMonth('2027-07');} function showConcreteMonth_2027_08(){filterConcreteByMonth('2027-08');} function showConcreteMonth_2027_09(){filterConcreteByMonth('2027-09');} function showConcreteMonth_2027_10(){filterConcreteByMonth('2027-10');} function showConcreteMonth_2027_11(){filterConcreteByMonth('2027-11');} function showConcreteMonth_2027_12(){filterConcreteByMonth('2027-12');}

// ============================================================
// doPost / doGet — productionreport เท่านั้น
// ============================================================
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) return respond(false, 'ไม่พบ Sheet: ' + SHEET_NAME);
    sh.appendRow([data.sample_date,data.test_date,data.age_days,data.formula_name,data.cube_size,data.result1_kn,data.result2_kn,data.result3_kn,data.avg_kn,data.avg_mpa,data.avg_ksc]);
    var lastRow = sh.getLastRow();
    sh.getRange(lastRow, 12).setFormula('=TEXT(A' + lastRow + ',"YYYY-MM")');
    sh.getRange(2, 1, lastRow - 1, 12).sort({ column: 1, ascending: true });
    try {
      UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/concrete_results', {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        payload: JSON.stringify([{ sample_date:data.sample_date, test_date:data.test_date, age_days:Number(data.age_days)||0, formula_name:data.formula_name, cube_size:data.cube_size, result1_kn:Number(data.result1_kn)||0, result2_kn:Number(data.result2_kn)||0, result3_kn:Number(data.result3_kn)||0, avg_kn:Number(data.avg_kn)||0, avg_mpa:Number(data.avg_mpa)||0, avg_ksc:Number(data.avg_ksc)||0 }]),
        muteHttpExceptions: true
      });
    } catch(syncErr) { Logger.log('Supabase sync error: ' + syncErr.message); }
    return respond(true, 'บันทึกสำเร็จ');
  } catch (err) { return respond(false, err.message); }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) return respond(false, 'ไม่พบ Sheet');
    var rows = sh.getDataRange().getValues();
    var headers = rows[0];
    var data = rows.slice(1).filter(function(r){ return r[0]; }).map(function(r) {
      var obj = {}; headers.forEach(function(h, i) { var v = r[i]; obj[h] = v instanceof Date ? Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd') : v; }); return obj;
    });
    var materials = [];
    var matSh = ss.getSheetByName('วัตถุดิบ');
    if (matSh) {
      var matRows = matSh.getDataRange().getValues(); var matH = matRows[0];
      materials = matRows.slice(1).filter(function(r){ return r[0]; }).map(function(r) { var obj = {}; matH.forEach(function(h, i){ obj[h] = r[i] === '' ? null : r[i]; }); return obj; });
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: data, materials: materials })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) { return respond(false, err.message); }
}

// ============================================================
// Sync functions — productionreport เท่านั้น
// ============================================================
function syncConcrete() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { SpreadsheetApp.getUi().alert('❌ ไม่พบ Sheet'); return; }
  var rows = sh.getDataRange().getValues();
  var records = rows.slice(1).filter(function(r){ return r[0]; }).map(function(r) {
    return { sample_date: r[0] instanceof Date ? Utilities.formatDate(r[0],'Asia/Bangkok','yyyy-MM-dd') : String(r[0]).slice(0,10), test_date: r[1] instanceof Date ? Utilities.formatDate(r[1],'Asia/Bangkok','yyyy-MM-dd') : String(r[1]).slice(0,10), age_days: Number(r[2])||0, formula_name: String(r[3]), cube_size: String(r[4]), result1_kn: Number(r[5])||0, result2_kn: Number(r[6])||0, result3_kn: Number(r[7])||0, avg_kn: Number(r[8])||0, avg_mpa: Number(r[9])||0, avg_ksc: Number(r[10])||0 };
  });
  UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/concrete_results?id=gte.0', { method: 'DELETE', headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' }, muteHttpExceptions: true });
  var BATCH = 500;
  for (var i = 0; i < records.length; i += BATCH) {
    UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/concrete_results', { method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, payload: JSON.stringify(records.slice(i, i + BATCH)), muteHttpExceptions: true });
  }
  SpreadsheetApp.getUi().alert('✅ Sync สำเร็จ ' + records.length + ' แถว');
}

function syncMaterials() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('วัตถุดิบ');
  if (!sh) { SpreadsheetApp.getUi().alert('❌ ไม่พบ Sheet วัตถุดิบ'); return; }
  var rows = sh.getDataRange().getValues();
  var records = rows.slice(1).filter(function(r){ return r[0]; }).map(function(r) {
    return { mat_label: String(r[0]), cement_total: r[1]!==''?Number(r[1]):null, cement_big: r[2]!==''?Number(r[2]):null, cement_i18: r[3]!==''?Number(r[3]):null, rock34: r[4]!==''?Number(r[4]):null, rock1: r[5]!==''?Number(r[5]):null, sand: r[6]!==''?Number(r[6]):null };
  });
  UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/materials_daily?id=gte.0', { method: 'DELETE', headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' }, muteHttpExceptions: true });
  UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/materials_daily', { method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, payload: JSON.stringify(records), muteHttpExceptions: true });
  SpreadsheetApp.getUi().alert('✅ Sync วัตถุดิบสำเร็จ ' + records.length + ' แถว');
}

function syncAll() { syncConcrete(); syncMaterials(); }

function removeDuplicates() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sh) return;
  var data = sh.getDataRange().getValues(); var seen = {}; var toDelete = [];
  for (var i = data.length - 1; i >= 1; i--) {
    var key = [String(data[i][0]).slice(0,10), String(data[i][1]).slice(0,10), data[i][2], data[i][3], data[i][5], data[i][6], data[i][7]].join('|');
    if (seen[key]) { toDelete.push(i + 1); } else { seen[key] = true; }
  }
  toDelete.forEach(function(row){ sh.deleteRow(row); });
  SpreadsheetApp.getUi().alert('✅ ลบแถวซ้ำแล้ว ' + toDelete.length + ' แถว');
}

function respond(success, message) {
  return ContentService.createTextOutput(JSON.stringify({ success: success, message: message })).setMimeType(ContentService.MimeType.JSON);
}
