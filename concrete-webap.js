// ============================================================
// Apps Script Web App - รับข้อมูลผลทดสอบคอนกรีต
// วิธี Deploy:
//   1. เปิด Sheet "ผลทดสอบคอนกรีต" > Extensions > Apps Script
//   2. วางโค้ดนี้ทั้งหมด > Save
//   3. Deploy > New deployment > Web app
//      - Execute as: Me
//      - Who has access: Anyone
//   4. Copy URL ที่ได้ > แก้ CONCRETE_URL ใน index.html
// ============================================================

const SHEET_NAME = 'ผลทดสอบคอนกรีต';
const SPREADSHEET_ID = '1ZYGnV8AqyR3a0uTNRftkguEdBPrQOjLQbWU6ZhpiFyk';

const SUPABASE_URL = 'https://npxzerdirspwunuckcqr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weHplcmRpcnNwd3VudWNrY3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjUxMjIsImV4cCI6MjA5NTcwMTEyMn0.4C1MucMeqPozXSfErLM44at7dykfzfFQvpVnoqmrMQI';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // แอปทดสอบทราย/หินบันทึกตรงเข้า Supabase เองได้ แต่ส่ง Telegram ไม่ได้
    // เพราะโทเคนอยู่ที่นี่ จึงยิงมาบอกเฉพาะตอนผลไม่ผ่าน
    if (data.kind === 'material_alert') {
      notifyMaterialFail(data);
      return respond(true, 'แจ้งเตือนแล้ว');
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAME);

    if (!sh) {
      return respond(false, 'ไม่พบ Sheet: ' + SHEET_NAME);
    }

    // แอป concrete.html ส่ง cast_date/age/formula/luk1-3 ส่วน skill เดิมส่ง sample_date/age_days/...
    var sampleDate  = data.cast_date   || data.sample_date  || '';
    var testDate    = data.test_date   || '';
    var ageDays     = data.age         || data.age_days     || '';
    var formulaName = data.formula     || data.formula_name || '';
    var cubeSize    = data.cube_size   || '15x15';
    var r1          = data.luk1 != null ? data.luk1 : data.result1_kn;
    var r2          = data.luk2 != null ? data.luk2 : data.result2_kn;
    var r3          = data.luk3 != null ? data.luk3 : data.result3_kn;

    // หาแถวสุดท้ายจาก column A จริง (ไม่นับสูตรที่ลากลงไป)
    var colA = sh.getRange('A:A').getValues();
    var lastRow = 1;
    for (var i = colA.length - 1; i >= 1; i--) {
      if (colA[i][0] !== '') { lastRow = i + 1; break; }
    }

    // สแกนรูปเดิมซ้ำแล้วกดบันทึกอีกครั้ง ไม่ควรได้แถวซ้ำ
    if (lastRow > 1) {
      var existing = sh.getRange(2, 1, lastRow - 1, 8).getValues();
      var newKey = dupKey([sampleDate, testDate, ageDays, formulaName, cubeSize, r1, r2, r3]);
      for (var j = 0; j < existing.length; j++) {
        if (dupKey(existing[j]) === newKey) {
          return respond(true, 'มีข้อมูลนี้อยู่แล้ว (แถว ' + (j + 2) + ') ไม่บันทึกซ้ำ');
        }
      }
    }

    var newRow = lastRow + 1;
    // เขียนเป็นวันที่จริง ไม่ใช่ข้อความ ไม่งั้นคอลัมน์จะมี 2 ชนิดปนกันแล้วเรียงเพี้ยน
    sh.getRange(newRow, 1, 1, 12).setValues([[
      toDate(sampleDate),
      toDate(testDate),
      ageDays,
      formulaName,
      cubeSize,
      r1,
      r2,
      r3,
      data.avg_kn,
      data.avg_mpa,
      data.avg_ksc,
      String(fmtDate(sampleDate) || '').slice(0, 7)   // คอลัมน์ "เดือน" ใช้กรองตามเดือน
    ]]);

    // ผลไม่ผ่านเกณฑ์ → แจ้งเตือน Telegram ทันทีที่บันทึก
    // ต้องทำก่อนเรียงชีท เพราะใช้เลขแถวไปเขียนธงกันแจ้งซ้ำ
    notifyIfBelowTarget({
      sampleDate: sampleDate,
      testDate:   testDate,
      age:        ageDays,
      formula:    formulaName,
      ksc:        data.avg_ksc,
      row:        newRow
    });

    sortSheet(sh);

    // ส่งแถวใหม่เข้า Supabase ทันที แดชบอร์ดจะเห็นโดยไม่ต้องกด Sync เอง
    try {
      sbRequest('post', 'concrete_results', [{
        sample_date:  fmtDate(sampleDate),
        test_date:    fmtDate(testDate),
        age_days:     Number(ageDays) || 0,
        formula_name: String(formulaName),
        cube_size:    String(cubeSize),
        result1_kn:   Number(r1) || 0,
        result2_kn:   Number(r2) || 0,
        result3_kn:   Number(r3) || 0,
        avg_kn:       Number(data.avg_kn)  || 0,
        avg_mpa:      Number(data.avg_mpa) || 0,
        avg_ksc:      Number(data.avg_ksc) || 0
      }]);
    } catch (syncErr) {
      Logger.log('Supabase sync error: ' + syncErr.message);
    }

    return respond(true, 'บันทึกสำเร็จ');

  } catch (err) {
    return respond(false, err.message);
  }
}

// '2026-09-20' → Date จริง (ถ้าแปลงไม่ได้คืนค่าเดิม)
function toDate(v) {
  if (v instanceof Date) return v;
  var m = String(v == null ? '' : v).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : v;
}

// คอลัมน์วันที่มีทั้งข้อความและวันที่จริงปนกัน ทำให้ Sheets แยกเรียงคนละกลุ่ม
// แปลงให้เป็นวันที่จริงทั้งหมดก่อน การเรียงถึงจะถูกต้อง
function normalizeDates(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var rng = sh.getRange(2, 1, last - 1, 2);
  var v = rng.getValues();
  var n = 0;
  for (var i = 0; i < v.length; i++) {
    for (var c = 0; c < 2; c++) {
      if (!v[i][c] || v[i][c] instanceof Date) continue;
      var d = toDate(v[i][c]);
      if (d instanceof Date) { v[i][c] = d; n++; }
    }
  }
  if (n) rng.setValues(v);
  return n;
}

// เรียงชีทตามวันที่เก็บตัวอย่าง แล้วตามอายุ
// ต้องเรียงทั้งความกว้างที่ใช้จริง เพราะคอลัมน์ M เก็บธงกันแจ้งเตือนซ้ำของแต่ละแถว
// ถ้าเรียงแค่บางคอลัมน์ ธงจะค้างอยู่กับแถวเดิมแล้วผิดแถวทันที
function sortSheet(sh) {
  try {
    var last = sh.getLastRow();
    if (last < 3) return;
    normalizeDates(sh);
    sh.getRange(2, 1, last - 1, sh.getLastColumn())
      .sort([{ column: 1, ascending: true }, { column: 3, ascending: true }]);
  } catch (err) {
    Logger.log('sortSheet error: ' + err.message);
  }
}

// เรียงชีทจากเมนู + เติมคอลัมน์เดือนที่ยังว่าง (ใช้กับข้อมูลเก่า)
function sortSheetNow() {
  var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  sortSheet(sh);
  var n = fillMonthColumn(sh);
  try { SpreadsheetApp.getUi().alert('เรียงตามวันที่เก็บตัวอย่างแล้ว\nเติมคอลัมน์เดือนเพิ่ม ' + n + ' แถว'); } catch (e) {}
}

// เติมคอลัมน์ "เดือน" (คอลัมน์ L) จากวันที่เก็บตัวอย่าง เฉพาะแถวที่ยังว่าง
function fillMonthColumn(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var a = sh.getRange(2, 1, last - 1, 1).getValues();     // วันที่เก็บตัวอย่าง
  var l = sh.getRange(2, 12, last - 1, 1).getValues();    // เดือน
  var n = 0;
  for (var i = 0; i < a.length; i++) {
    if (!a[i][0]) continue;
    if (String(l[i][0] || '').trim() !== '') continue;
    var ym = String(fmtDate(a[i][0]) || '').slice(0, 7);
    if (ym) { l[i][0] = ym; n++; }
  }
  if (n) sh.getRange(2, 12, last - 1, 1).setValues(l);
  return n;
}

// ตั้ง/ยกเลิกซิงก์อัตโนมัติ — กันกรณีแก้ข้อมูลในชีทเองแล้วลืมกดซิงก์
function installAutoSync() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncConcrete') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncConcrete').timeBased().everyHours(4).create();
  try { SpreadsheetApp.getUi().alert('ตั้งซิงก์อัตโนมัติทุก 4 ชั่วโมงแล้ว\n(การบันทึกจากแอปยังซิงก์ทันทีเหมือนเดิม)'); } catch (e) {}
}

function removeAutoSync() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncConcrete') { ScriptApp.deleteTrigger(t); n++; }
  });
  try { SpreadsheetApp.getUi().alert('ยกเลิกซิงก์อัตโนมัติแล้ว (' + n + ' ตัว)'); } catch (e) {}
}

function doGet(e) {
  try {
    // ?mode=key → คืน Gemini API key ให้แอปมือถือ จะได้ไม่ต้องพิมพ์ใหม่ทุกครั้งที่ iOS ล้าง storage
    // key เก็บใน Script Properties ชื่อ GEMINI_KEY (ไม่ขึ้น GitHub) และจำกัดสิทธิ์ด้วย referrer ที่ Google Cloud
    if (e && e.parameter && e.parameter.mode === 'key') {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          key: PropertiesService.getScriptProperties().getProperty('GEMINI_KEY') || ''
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) return respond(false, 'ไม่พบ Sheet: ' + SHEET_NAME);
    const rows = sh.getDataRange().getValues();
    const headers = rows[0];
    const data = rows.slice(1).filter(r => r[0]).map(r => {
      const obj = {};
      headers.forEach((h, i) => {
        const v = r[i];
        if (v instanceof Date) {
          obj[h] = Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd');
        } else {
          obj[h] = v;
        }
      });
      return obj;
    });

    // อ่าน tab วัตถุดิบ
    var materials = [];
    var matSh = ss.getSheetByName('วัตถุดิบ');
    if (matSh) {
      var matRows = matSh.getDataRange().getValues();
      var matH = matRows[0];
      materials = matRows.slice(1).filter(r => r[0]).map(r => {
        var obj = {};
        matH.forEach((h, i) => { obj[h] = r[i] === '' ? null : r[i]; });
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

function importFromOldSheet() {
  var SOURCE_ID = '1Ii0Ocr-PAIp1If2R-wMskzVteHkrGwtVuXXpvqKdKz4';
  var TARGET_NAME = 'ผลทดสอบคอนกรีต';

  var src = SpreadsheetApp.openById(SOURCE_ID);
  var srcSheet = src.getSheetByName('ค่ากำอัดอัดทั้งปี69');
  if (!srcSheet) { Logger.log('ไม่พบ sheet'); return; }
  var rows = srcSheet.getDataRange().getValues();
  var headers = rows[0].map(function(x){ return String(x).trim(); });
  var ci = {};
  headers.forEach(function(n,i){ ci[n] = i; });

  var iDate = ci['วันที่'] !== undefined ? ci['วันที่'] : 0;
  var iForm = ci['สูตร']  !== undefined ? ci['สูตร']  : 1;
  var iSet  = ci['ชุดที่'] !== undefined ? ci['ชุดที่'] : 2;
  var iAge  = ci['อายุ (วัน)'] !== undefined ? ci['อายุ (วัน)'] : (ci['อายุ(วัน)'] !== undefined ? ci['อายุ(วัน)'] : 3);
  var iKN   = ci['แรงกด (kN)'] !== undefined ? ci['แรงกด (kN)'] : (ci['แรงกด(kN)'] !== undefined ? ci['แรงกด(kN)'] : 4);
  var iKSC  = ci['กำลังอัด (KSC)'] !== undefined ? ci['กำลังอัด (KSC)'] : (ci['กำลังอัด(KSC)'] !== undefined ? ci['กำลังอัด(KSC)'] : 5);

  var groups = {};
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[iDate]) continue;
    var rawDate = r[iDate];
    var age = Number(r[iAge] || 0);
    var formula = String(r[iForm] || '').trim();
    var set = String(r[iSet] || '1').trim();
    var kn  = Number(r[iKN]  || 0);
    var ksc = Number(r[iKSC] || 0);

    var testDate = '';
    if (rawDate instanceof Date) {
      testDate = Utilities.formatDate(rawDate, 'Asia/Bangkok', 'yyyy-MM-dd');
    } else {
      var parts = String(rawDate).split('/');
      if (parts.length === 3) {
        var y = Number(parts[2]) < 100 ? 2000 + Number(parts[2]) : Number(parts[2]);
        testDate = y + '-' + parts[0].padStart(2,'0') + '-' + parts[1].padStart(2,'0');
      }
    }
    if (!testDate) continue;
    if (testDate.slice(0,4) !== '2026') continue;

    var sampleDate = testDate;
    var td2 = new Date(sampleDate);
    td2.setDate(td2.getDate() + age);
    testDate = Utilities.formatDate(td2, 'Asia/Bangkok', 'yyyy-MM-dd');

    var key = sampleDate + '|' + formula + '|' + set + '|' + age;
    if (!groups[key]) groups[key] = { sampleDate:sampleDate, testDate:testDate, age:age, formula:formula, kns:[], kscs:[] };
    groups[key].kns.push(kn);
    groups[key].kscs.push(ksc);
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(TARGET_NAME);
  if (!sh) { Logger.log('ไม่พบ target sheet'); return; }
  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow()-1, sh.getLastColumn()).clearContent();
  }

  var added = 0;
  var keys = Object.keys(groups);
  for (var k = 0; k < keys.length; k++) {
    var g = groups[keys[k]];
    if (g.kns.length < 1) continue;
    var r1 = g.kns[0] || '';
    var r2 = g.kns[1] || '';
    var r3 = g.kns[2] || '';
    var avgKn  = g.kns.reduce(function(a,b){return a+b;},0) / g.kns.length;
    var avgKsc = g.kscs.reduce(function(a,b){return a+b;},0) / g.kscs.length;
    sh.appendRow([
      g.sampleDate, g.testDate, g.age, g.formula, '15x15',
      r1, r2, r3,
      Math.round(avgKn*100)/100, '',
      Math.round(avgKsc*10)/10
    ]);
    added++;
  }
  Logger.log('นำเข้าสำเร็จ: ' + added + ' แถว');
  try { SpreadsheetApp.getUi().alert('นำเข้าสำเร็จ ' + added + ' แถว'); }
  catch(e) { Logger.log('done'); }
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Sync Dashboard')
    .addItem('Sync ทันที', 'syncConcrete')
    .addItem('ดู Log', 'viewLog')
    .addSeparator()
    .addItem('เรียงชีทตามวันที่', 'sortSheetNow')
    .addItem('ตั้งซิงก์อัตโนมัติทุก 4 ชม.', 'installAutoSync')
    .addItem('ยกเลิกซิงก์อัตโนมัติ', 'removeAutoSync')
    .addToUi();

  ui.createMenu('🚨 แจ้งเตือนผลลูกปูน')
    .addItem('หาไอดีกลุ่ม Telegram', 'findChatIds')
    .addItem('ทดสอบส่ง Telegram', 'testTelegramAlert')
    .addItem('ตรวจย้อนหลังทั้งชีท', 'checkAllConcreteResults')
    .addItem('ทดสอบเตือน QC แพค้างตรวจ', 'qcTestAlertNow')
    .addToUi();

  // onOpen เป็น simple trigger สิทธิ์จำกัด เรียก openById ไม่ได้ (จะโยน error แล้วเมนูที่เหลือไม่ขึ้น)
  // ใช้ชีทที่เปิดอยู่แทน และครอบ try ไว้ เผื่ออ่านข้อมูลไม่ได้ก็ยังได้เมนูพื้นฐาน
  var menu = ui.createMenu('เลือกเดือน');
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (sh && sh.getLastRow() > 1) {
      var dates = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
      var months = {};
      dates.forEach(function(r) {
        var d = r[0];
        var ym = d instanceof Date
          ? Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM')
          : String(d).slice(0, 7);
        if (ym && /^\d{4}-\d{2}$/.test(ym)) months[ym] = true;
      });
      Object.keys(months).sort().reverse().forEach(function(ym) {
        var fn = 'showMonth_' + ym.replace('-', '_');
        if (!MONTH_FNS[fn]) return;   // ไม่มีฟังก์ชันรองรับก็ข้าม กันกดแล้ว error
        var parts = ym.split('-');
        var be = Number(parts[0]) + 543;
        menu.addItem('เดือน ' + parts[1] + '/' + String(be).slice(2) + '  (' + ym + ')', fn);
      });
    }
  } catch (err) {
    Logger.log('onOpen month menu error: ' + err.message);
  }

  menu.addSeparator();
  menu.addItem('แสดงทั้งหมด', 'showAllRows');
  menu.addItem('แค่เดือนล่าสุด', 'showLatestMonthOnly');
  menu.addToUi();
}

// รายชื่อฟังก์ชันเลือกเดือนที่มีจริงด้านล่าง — ใช้กันเมนูชี้ไปฟังก์ชันที่ไม่มี (กดแล้ว error)
// ถ้าเพิ่มปีใหม่ ต้องเพิ่มทั้งฟังก์ชันและรายชื่อในนี้ให้ตรงกัน
var MONTH_FNS = {};
['2026','2027'].forEach(function (y) {
  ['01','02','03','04','05','06','07','08','09','10','11','12'].forEach(function (m) {
    MONTH_FNS['showMonth_' + y + '_' + m] = true;
  });
});

function handleMonthMenu(ym) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh || sh.getLastRow() <= 1) return;
  var dates = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < dates.length; i++) {
    var d = dates[i][0];
    var rowYM = d instanceof Date
      ? Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM')
      : String(d).slice(0, 7);
    if (rowYM === ym) sh.showRows(i + 2, 1);
    else sh.hideRows(i + 2, 1);
  }
  try { SpreadsheetApp.getUi().alert('แสดงเฉพาะ ' + ym); } catch(e) {}
}

function showAllRows() {
  var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (sh && sh.getLastRow() > 1) sh.showRows(2, sh.getLastRow() - 1);
  try { SpreadsheetApp.getUi().alert('แสดงทั้งหมดแล้ว'); } catch(e) {}
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
function showMonth_2027_01(){handleMonthMenu('2027-01');}
function showMonth_2027_02(){handleMonthMenu('2027-02');}
function showMonth_2027_03(){handleMonthMenu('2027-03');}
function showMonth_2027_04(){handleMonthMenu('2027-04');}
function showMonth_2027_05(){handleMonthMenu('2027-05');}
function showMonth_2027_06(){handleMonthMenu('2027-06');}
function showMonth_2027_07(){handleMonthMenu('2027-07');}
function showMonth_2027_08(){handleMonthMenu('2027-08');}
function showMonth_2027_09(){handleMonthMenu('2027-09');}
function showMonth_2027_10(){handleMonthMenu('2027-10');}
function showMonth_2027_11(){handleMonthMenu('2027-11');}
function showMonth_2027_12(){handleMonthMenu('2027-12');}

function showLatestMonthOnly() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) return;
  var lastRow = sh.getLastRow();
  if (lastRow <= 1) return;
  var dates = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  var latestYM = '';
  dates.forEach(function(r) {
    var d = r[0];
    var ym = d instanceof Date
      ? Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM')
      : String(d).slice(0, 7);
    if (ym > latestYM) latestYM = ym;
  });
  if (!latestYM) return;
  for (var i = 0; i < dates.length; i++) {
    var d = dates[i][0];
    var ym = d instanceof Date
      ? Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM')
      : String(d).slice(0, 7);
    if (ym === latestYM) sh.showRows(i + 2, 1);
    else sh.hideRows(i + 2, 1);
  }
  try { SpreadsheetApp.getUi().alert('แสดงเฉพาะเดือน ' + latestYM); }
  catch(e) { Logger.log('done'); }
}

function fixAllKscValues() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) return;
  var lastRow = sh.getLastRow();
  if (lastRow <= 1) return;
  var range = sh.getRange(2, 1, lastRow - 1, 11);
  var values = range.getValues();
  var fixed = 0;
  for (var i = 0; i < values.length; i++) {
    var kn1 = Number(values[i][5]) || 0;
    var kn2 = Number(values[i][6]) || 0;
    var kn3 = Number(values[i][7]) || 0;
    if (kn1 > 0 && kn2 > 0 && kn3 > 0) {
      values[i][8]  = Math.round((kn1+kn2+kn3)/3*100)/100;
      values[i][9]  = Math.round((kn1+kn2+kn3)/3/22.5*100)/100;
      values[i][10] = Math.round((kn1+kn2+kn3)/3/22.5*10.197*10)/10;
      fixed++;
    }
  }
  range.setValues(values);
  try { SpreadsheetApp.getUi().alert('แก้แล้ว ' + fixed + ' แถว'); }
  catch(e) { Logger.log('done'); }
}

function setupMaterialsSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName('วัตถุดิบ');
  if (!sh) sh = ss.insertSheet('วัตถุดิบ');
  var headers = ['วันที่','ปูนรวม','ปูนเสาเหล็ก','ปูนI18','หิน3/4','หิน1','ทราย'];
  var firstRow = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  if (firstRow[0] === '') {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  try { SpreadsheetApp.getUi().alert('พร้อมแล้ว! กรอกข้อมูลใน tab "วัตถุดิบ" ได้เลย'); }
  catch(e) { Logger.log('done'); }
}

// Auto-fill เดือนปี (คอลัมน์ L) เมื่อกรอกวันที่ในคอลัมน์ A
function onEdit(e) {
  if (!e || !e.range) return;
  var range = e.range;
  var sh = range.getSheet();
  if (sh.getName() !== SHEET_NAME) return;
  if (range.getColumn() !== 1) return;
  var row = range.getRow();
  if (row <= 1) return;
  var val = range.getValue();
  if (!val) return;
  var d = new Date(val);
  if (isNaN(d.getTime())) return;
  var ym = Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM');
  sh.getRange(row, 12).setValue(ym);
}

// กรอกผลในชีทเองก็ให้แจ้งเตือนเหมือนกัน — ยิงตอนแก้คอลัมน์ "เฉลี่ย KSC"
// แยกจาก onEdit ด้านบนเพราะอันนั้นดักเฉพาะคอลัมน์ A (วันที่เก็บตัวอย่าง)
function onEditConcreteResult(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() !== SHEET_NAME) return;
  var row = e.range.getRow();
  if (row <= 1) return;

  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (x) { return String(x).trim(); });
  var ci = {}; headers.forEach(function (n, i) { ci[n] = i + 1; });
  var cKsc = ci['เฉลี่ย KSC'];
  if (!cKsc) return;
  // แก้ค่า kN ก็ทำให้ KSC เปลี่ยนตามสูตร จึงตรวจเมื่อแก้คอลัมน์ไหนก็ได้ในแถวนั้น
  var vals = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
  var get = function (name, fallback) { return ci[name] ? vals[ci[name] - 1] : fallback; };
  notifyIfBelowTarget({
    sampleDate: vals[0],
    testDate:   vals[1],
    age:        get('อายุ(วัน)', get('อายุ (วัน)', null)),
    formula:    get('ชื่อสูตร', null),
    ksc:        Number(vals[cKsc - 1]),
    row:        row
  });
}

// ============================================================
// แจ้งเตือน Telegram เมื่อผลลูกปูนไม่ผ่านเกณฑ์
//
// ★ ใส่ค่า 2 บรรทัดนี้ในสคริปต์ของคุณ (ก๊อปมาจากสคริปต์แจ้งเตือนรอบสอบเทียบได้เลย)
//   ในไฟล์บน GitHub เว้นว่างไว้ เพราะเป็น repo สาธารณะ โทเคนจะหลุด
// ============================================================
var TELEGRAM_TOKEN = '';   // เช่น '8852411771:AAG...'
var TELEGRAM_CHAT  = '';   // ไอดีกลุ่มหลัก (แจ้งเตือนรอบงาน)
var TELEGRAM_CHAT_QC = '';   // ★ ไอดีกลุ่ม QC — เรื่อง QC เข้ากลุ่มนี้ (เว้นว่าง = ใช้กลุ่มหลัก)

// เกณฑ์กำลังอัด (ksc) ตามอายุ — ต้องตรงกับที่หน้าแดชบอร์ดใช้ (TARGET_NORMAL / TARGET_NP280)
var TARGET_NORMAL = { 1: 340, 3: 400, 5: 420, 7: 450 };
var TARGET_NP280  = { 1: 340, 7: 420 };
var ALERT_FLAG_COL = 13;   // คอลัมน์ M — กันส่งซ้ำแถวเดิม

function targetFor(formula, age) {
  var a = Number(age);
  if (!a) return null;
  var isNP280 = String(formula || '').toUpperCase().indexOf('280') >= 0;
  var spec = isNP280 ? TARGET_NP280 : TARGET_NORMAL;
  return spec[a] != null ? spec[a] : null;   // อายุที่ไม่มีเกณฑ์ = ไม่ต้องตัดสิน
}

function notifyIfBelowTarget(r) {
  try {
    var ksc = Number(r.ksc);
    if (!isFinite(ksc) || ksc <= 0) return;
    var target = targetFor(r.formula, r.age);
    if (target == null) return;
    if (ksc >= target) return;                       // ผ่านเกณฑ์ ไม่ต้องแจ้ง

    // กันส่งซ้ำ: ถ้าแถวนี้เคยแจ้งแล้วด้วยค่าเดิม ไม่ส่งอีก
    var stamp = String(r.formula) + '|' + r.age + '|' + ksc;
    if (r.row) {
      var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
      var cell = sh.getRange(r.row, ALERT_FLAG_COL);
      if (String(cell.getValue()) === stamp) return;
      cell.setValue(stamp);
    }

    var diff = Math.round((target - ksc) * 10) / 10;
    var pct  = Math.round(diff / target * 1000) / 10;
    var msg = '🚨 <b>ผลลูกปูนไม่ผ่านเกณฑ์</b>\n\n'
            + '<b>สูตร:</b> ' + (r.formula || '-') + '\n'
            + '<b>อายุ:</b> ' + r.age + ' วัน\n'
            + '<b>ผลที่ได้:</b> ' + ksc + ' ksc\n'
            + '<b>เกณฑ์:</b> ' + target + ' ksc\n'
            + '<b>ต่ำกว่าเกณฑ์:</b> ' + diff + ' ksc (' + pct + '%)\n\n'
            + 'เก็บตัวอย่าง ' + fmtThaiDate(r.sampleDate) + ' · ทดสอบ ' + fmtThaiDate(r.testDate);
    sendTelegram(msg, tgChatQC());
  } catch (err) {
    Logger.log('notifyIfBelowTarget error: ' + err.message);
  }
}

// แจ้งเตือนผลทดสอบวัตถุดิบที่ไม่ผ่านเกณฑ์ → กลุ่ม QC
// ยิงมาจากหน้า sieve.html หลังบันทึกลง Supabase สำเร็จแล้วเท่านั้น
function notifyMaterialFail(d) {
  try {
    var L = [];
    if (d.test === 'sand_fm') {
      L.push('⚠️ <b>ขนาดคละทราย ไม่ผ่านเกณฑ์</b>');
      L.push('ค่า FM: <b>' + d.fm + '</b>  (เกณฑ์ ' + d.lo + '–' + d.hi + ')');
      L.push(Number(d.fm) < Number(d.lo) ? 'ทรายละเอียดเกินไป' : 'ทรายหยาบเกินไป');
    } else if (d.test === 'sand_sieve') {
      L.push('⚠️ <b>ขนาดคละทราย ไม่ผ่านเกณฑ์</b>');
      L.push('ตะแกรงที่หลุดเกณฑ์: <b>' + esc(d.detail || '-') + '</b>');
      if (d.fm) L.push('ค่า FM: ' + d.fm);
    } else if (d.test === 'sand_silt') {
      var isWash = d.method === 'wash';
      L.push('⚠️ <b>ฝุ่นในทราย เกินเกณฑ์</b>');
      L.push('วิธี: ' + (isWash ? 'ล้างตะแกรง #200 (% โดยน้ำหนัก)' : 'เขย่าขวด (% โดยปริมาตร)'));
      L.push('ปริมาณฝุ่น: <b>' + d.pct + '%</b>  (เกณฑ์ไม่เกิน ' + d.max_pct + '%)');
      if (isWash) L.push('ก่อนล้าง ' + d.w_before + ' g · หลังล้าง ' + d.w_after + ' g');
      else L.push('ชั้นทราย ' + d.sand_mm + ' มม. · ชั้นฝุ่น ' + d.silt_mm + ' มม.');
      if (!isWash) L.push('<i>วิธีเขย่าขวดเป็นการคัดกรอง ควรยืนยันด้วยวิธีล้างก่อนตัดสิน</i>');
    } else if (d.test === 'stone') {
      L.push('⚠️ <b>ขนาดคละหิน ไม่ผ่านเกณฑ์</b>');
      L.push('หิน ' + esc(d.size || '') + ' — ตะแกรงที่หลุดเกณฑ์: <b>' + esc(d.detail || '-') + '</b>');
    } else {
      return;
    }
    L.push('');
    L.push('วันที่ทดสอบ ' + fmtThaiDate(d.test_date));
    if (d.source) L.push('แหล่ง: ' + esc(d.source));
    sendTelegram(L.join('\n'), tgChatQC());
  } catch (err) {
    Logger.log('notifyMaterialFail error: ' + err.message);
  }
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tgToken() {
  return TELEGRAM_TOKEN || PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN') || '';
}
function tgChat() {
  return TELEGRAM_CHAT || PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT') || '';
}

// กลุ่ม QC — ถ้ายังไม่ได้ตั้ง ใช้กลุ่มหลักไปก่อน จะได้ไม่เงียบหาย
function tgChatQC() {
  return TELEGRAM_CHAT_QC || PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT_QC') || tgChat();
}

function sendTelegram(text, chatOverride) {
  var token = tgToken(), chat = chatOverride || tgChat();
  if (!token || !chat) { Logger.log('ยังไม่ได้ใส่ TELEGRAM_TOKEN / TELEGRAM_CHAT ที่หัวไฟล์'); return; }
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chat, text: text, parse_mode: 'HTML' }),
    muteHttpExceptions: true
  });
}

function fmtThaiDate(v) {
  if (!v) return '-';
  var d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return Utilities.formatDate(d, 'Asia/Bangkok', 'dd/MM/') + (d.getFullYear() + 543);
}

// หาไอดีกลุ่มอัตโนมัติ — ไม่ต้องไปเปิด URL getUpdates เอง
// ต้องมีคนพิมพ์ข้อความอะไรก็ได้ในกลุ่มก่อน Telegram ถึงจะคืนกลุ่มนั้นมาให้
function findChatIds() {
  var ui = SpreadsheetApp.getUi();
  var token = tgToken();
  if (!token) { ui.alert('ยังไม่ได้ใส่ TELEGRAM_TOKEN ที่หัวไฟล์'); return; }

  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getUpdates',
                              { muteHttpExceptions: true });
  var data = JSON.parse(res.getContentText());
  if (!data.ok) { ui.alert('เรียก Telegram ไม่สำเร็จ: ' + (data.description || '')); return; }

  var seen = {}, lines = [];
  (data.result || []).forEach(function (u) {
    var c = (u.message || u.channel_post || u.my_chat_member || {}).chat;
    if (!c || seen[c.id]) return;
    seen[c.id] = true;
    lines.push((c.title || c.username || c.first_name || '(ไม่มีชื่อ)') + '\n   ไอดี: ' + c.id + '  [' + c.type + ']');
  });

  if (!lines.length) {
    ui.alert('ยังไม่เจอกลุ่มไหนเลย\n\n1) เพิ่มบอทเข้ากลุ่ม QC ก่อน\n2) พิมพ์ข้อความอะไรก็ได้ในกลุ่ม 1 ครั้ง\n3) กดเมนูนี้ใหม่\n\n(Telegram เก็บข้อความย้อนหลังแค่ 24 ชม.)');
    return;
  }
  ui.alert('กลุ่ม/แชทที่บอทเห็น\n\n' + lines.join('\n\n')
         + '\n\nเอาไอดีของกลุ่ม QC ไปใส่ที่หัวไฟล์ ช่อง TELEGRAM_CHAT');
}

// กดจากเมนูเพื่อทดสอบว่าบอทส่งเข้ากลุ่มได้จริง
function testTelegramAlert() {
  sendTelegram('✅ ทดสอบการแจ้งเตือนผลลูกปูน — ถ้าเห็นข้อความนี้ในกลุ่ม QC แปลว่าตั้งค่าถูกแล้ว', tgChatQC());
  SpreadsheetApp.getUi().alert('ส่งข้อความทดสอบไป Telegram แล้ว — ลองเช็คในกลุ่ม');
}

// ตรวจย้อนหลังทั้งชีท แล้วแจ้งเฉพาะแถวที่ยังไม่เคยแจ้ง (ใช้ตอนเริ่มใช้งานครั้งแรก)
function checkAllConcreteResults() {
  var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  var rows = sh.getDataRange().getValues();
  var headers = rows[0].map(function (x) { return String(x).trim(); });
  var ci = {}; headers.forEach(function (n, i) { ci[n] = i; });
  var iAge  = ci['อายุ(วัน)'] !== undefined ? ci['อายุ(วัน)'] : ci['อายุ (วัน)'];
  var iForm = ci['ชื่อสูตร'];
  var iKsc  = ci['เฉลี่ย KSC'];
  var fail = 0;
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    var target = targetFor(r[iForm], r[iAge]);
    if (target == null) continue;
    if (Number(r[iKsc]) >= target) continue;
    fail++;
    notifyIfBelowTarget({ sampleDate: r[0], testDate: r[1], age: r[iAge],
                          formula: r[iForm], ksc: Number(r[iKsc]), row: i + 1 });
  }
  SpreadsheetApp.getUi().alert('ตรวจย้อนหลังเสร็จ — พบผลไม่ผ่านเกณฑ์ ' + fail + ' แถว (แจ้งเฉพาะแถวที่ยังไม่เคยแจ้ง)');
}

function viewLog() {
  var props = PropertiesService.getScriptProperties();
  var log = props.getProperty('SYNC_LOG') || 'ยังไม่มีประวัติ Sync';
  SpreadsheetApp.getUi().alert('📋 Sync Log\n\n' + log);
}

function respond(success, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: success, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Supabase helpers ────────────────────────────────────────

function sbRequest(method, table, payload, query) {
  var url = SUPABASE_URL + '/rest/v1/' + table + (query ? '?' + query : '');
  var opts = {
    method: method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': method === 'post' ? 'return=minimal' : ''
    },
    muteHttpExceptions: true
  };
  if (payload) opts.payload = JSON.stringify(payload);
  return UrlFetchApp.fetch(url, opts);
}

function fmtDate(v) {
  if (!v) return null;
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd');
  return String(v).slice(0, 10) || null;
}

// ลายนิ้วมือของแถว ใช้เทียบว่าเป็นข้อมูลชุดเดียวกันไหม
// ต้อง normalize เพราะ Sheet คืนวันที่เป็น Date ส่วนที่ส่งมาจากแอปเป็นข้อความ
function dupKey(row) {
  var num = function (v) { return (Math.round((Number(v) || 0) * 100) / 100).toFixed(2); };
  return [
    fmtDate(row[0]),
    fmtDate(row[1]),
    Number(row[2]) || 0,
    String(row[3] || '').trim().toUpperCase(),
    String(row[4] || '').trim(),
    num(row[5]), num(row[6]), num(row[7])
  ].join('|');
}

// ── syncConcrete: sync ผลทดสอบคอนกรีต + วัตถุดิบ → Supabase ──

function syncConcrete() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 1. ผลทดสอบคอนกรีต
  var sh = ss.getSheetByName(SHEET_NAME);
  var rows = sh ? sh.getDataRange().getValues() : [];
  var headers = rows[0] || [];
  var concreteData = rows.slice(1).filter(function(r){ return r[0]; }).map(function(r) {
    var o = {};
    headers.forEach(function(h, i){ o[h] = r[i]; });
    return {
      sample_date:  fmtDate(o['วันที่เก็บตัวอย่าง']),
      test_date:    fmtDate(o['วันที่ทดสอบ']),
      age_days:     Number(o['อายุ(วัน)'] || o['อายุ (วัน)'] || 0) || null,
      formula_name: String(o['ชื่อสูตร'] || '').trim() || null,
      cube_size:    String(o['ขนาด cube'] || '').trim() || null,
      result1_kn:   Number(o['ลูก1(kN)'] || 0) || null,
      result2_kn:   Number(o['ลูก2(kN)'] || 0) || null,
      result3_kn:   Number(o['ลูก3(kN)'] || 0) || null,
      avg_kn:       Number(o['เฉลี่ย kN'] || 0) || null,
      avg_mpa:      Number(o['เฉลี่ย MPa'] || 0) || null,
      avg_ksc:      Number(o['เฉลี่ย KSC'] || 0) || null
    };
  });

  sbRequest('delete', 'concrete_results', null, 'id=gte.1');
  if (concreteData.length > 0) {
    var CHUNK = 200;
    for (var i = 0; i < concreteData.length; i += CHUNK) {
      sbRequest('post', 'concrete_results', concreteData.slice(i, i + CHUNK));
    }
  }

  // 2. วัตถุดิบ
  var matSh = ss.getSheetByName('วัตถุดิบ');
  var matData = [];
  if (matSh) {
    var matRows = matSh.getDataRange().getValues();
    var matH = matRows[0] || [];
    matData = matRows.slice(1).filter(function(r){ return r[0]; }).map(function(r) {
      var o = {};
      matH.forEach(function(h, i){ o[h] = r[i]; });
      return {
        mat_label:    String(o['ช่วง'] || o['วันที่'] || '').trim() || null,
        cement_total: Number(o['ปูนรวม'] || 0) || null,
        cement_big:   Number(o['ปูนเสาใหญ่'] || o['ปูนเสาเหล็ก'] || 0) || null,
        cement_i18:   Number(o['ปูนI18'] || 0) || null,
        rock34:       Number(o['หิน3/4'] || 0) || null,
        rock1:        Number(o['หิน1'] || 0) || null,
        sand:         Number(o['ทราย'] || 0) || null
      };
    });
    sbRequest('delete', 'materials_daily', null, 'id=gte.1');
    if (matData.length > 0) sbRequest('post', 'materials_daily', matData);
  }

  var now = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
  var logMsg = now + ' — ผลทดสอบ: ' + concreteData.length + ' แถว, วัตถุดิบ: ' + matData.length + ' แถว';
  PropertiesService.getScriptProperties().setProperty('SYNC_LOG', logMsg);
  try {
    SpreadsheetApp.getUi().alert('✅ Sync สำเร็จ!\n\n' + logMsg);
  } catch(e) {
    Logger.log(logMsg);
  }
}

// ============================================================
// แจ้งเตือน QC — แพที่ลงใบงานผลิตไว้แต่ยังไม่ได้ตรวจก่อนผลิต
// ตั้ง Trigger 2 ตัว:
//   qcAlertEvening  → Day timer 17:00-18:00  (เตือนของวันนี้)
//   qcAlertMorning  → Day timer 08:00-09:00  (เตือนของเมื่อวานที่ยังค้าง)
// ============================================================

function qcAlertEvening() { qcCheckPending(0, 'เย็นนี้'); }
function qcAlertMorning() { qcCheckPending(-1, 'เมื่อวาน'); }

function qcCheckPending(dayOffset, whenLabel) {
  try {
    var d = new Date();
    d.setDate(d.getDate() + (dayOffset || 0));
    var ymd = Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd');

    var planned = qcGet('qc_production_day?select=raft_num,pile_spec&d=eq.' + ymd);
    if (!planned || !planned.length) return;            // วันนั้นไม่มีใบงาน ไม่ต้องเตือน

    var checks = qcGet('qc_checks?select=bed_no&form_type=eq.pre&check_date=eq.' + ymd) || [];
    var done = {};
    checks.forEach(function (c) { if (c.bed_no) done[String(c.bed_no)] = true; });

    var pending = planned.filter(function (p) { return !done[String(p.raft_num)]; });
    if (!pending.length) {
      // ครบแล้ว — เตือนเฉพาะรอบเย็นให้รู้ว่าเรียบร้อย
      if ((dayOffset || 0) === 0) {
        sendTelegram('✅ <b>QC ตรวจก่อนผลิตครบแล้ว</b>\n' + qcThaiDate(ymd) +
                     ' · ครบทั้ง ' + planned.length + ' แพ', tgChatQC());
      }
      return;
    }

    var lines = pending.map(function (p) {
      return '• แพ ' + p.raft_num + (p.pile_spec ? ' — ' + p.pile_spec : '');
    }).join('\n');

    sendTelegram('🚨 <b>ยังไม่ได้ตรวจก่อนผลิต ' + pending.length + ' แพ</b>\n' +
                 'ใบงานผลิต ' + qcThaiDate(ymd) + ' (' + whenLabel + ')\n\n' + lines +
                 '\n\nตรวจแล้ว ' + (planned.length - pending.length) + '/' + planned.length + ' แพ', tgChatQC());
  } catch (err) {
    Logger.log('qcCheckPending error: ' + err.message);
  }
}

// อ่านข้อมูลจาก Supabase (อ่านอย่างเดียว)
function qcGet(path) {
  var res = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/' + path, {
    method: 'get',
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) { Logger.log('qcGet ' + res.getResponseCode() + ': ' + res.getContentText()); return null; }
  return JSON.parse(res.getContentText());
}

function qcThaiDate(ymd) {
  var p = String(ymd).split('-');
  return Number(p[2]) + '/' + Number(p[1]) + '/' + (Number(p[0]) + 543);
}

// กดจากเมนูเพื่อลองดูผลทันที ไม่ต้องรอ trigger
function qcTestAlertNow() {
  qcCheckPending(0, 'ทดสอบ');
  SpreadsheetApp.getUi().alert('ส่งผลตรวจสอบของวันนี้ไป Telegram แล้ว (ถ้าวันนี้ไม่มีใบงานผลิต จะไม่ส่งอะไร)');
}
