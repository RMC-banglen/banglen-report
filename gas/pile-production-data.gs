// ============================================================
// Apps Script — pile-production-data เท่านั้น
// รองรับ 2 รูปแบบ:
//   แบบ A: Column A = ปี (2568), Column B = เดือน (1-12)   → แท็บ รายเดือน
//   แบบ B: Column A = "มกราคม 2568"                        → แท็บ REB-ROB
// แถวที่ Column A ว่าง = ใช้เดือนของแถวก่อนหน้า
// ไม่มีโค้ดคอนกรีต / วัตถุดิบ / Supabase
// ============================================================

var THAI_M = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
              'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

var THAI_M_MAP = {
  'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,
  'กรกฎาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12
};

// อ่านคีย์เดือน "2568-01" ของทุกแถว (เติมค่าลงมาให้แถวที่ว่าง)
function readMonthKeys(sh) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  var vals = sh.getRange(2, 1, n, 2).getValues();
  var keys = [];
  var last = '';
  for (var i = 0; i < n; i++) {
    var a = vals[i][0], b = vals[i][1];
    var key = '';

    // แบบ A: A=ปี ตัวเลข, B=เดือน ตัวเลข
    if (typeof a === 'number' && typeof b === 'number' && a > 2400 && b >= 1 && b <= 12) {
      key = a + '-' + (b < 10 ? '0' + b : b);
    } else if (a) {
      // แบบ B: A = "มกราคม 2568"
      var parts = String(a).trim().split(/\s+/);
      if (parts.length >= 2) {
        var m = THAI_M_MAP[parts[0]];
        var y = parseInt(parts[1], 10);
        if (m && !isNaN(y)) key = y + '-' + (m < 10 ? '0' + m : m);
      }
    }

    if (key) last = key;
    keys.push(last);   // แถวว่าง → ใช้เดือนล่าสุดที่เจอ
  }
  return keys;
}

function fmtKey(key) {
  var p = key.split('-');
  return THAI_M[parseInt(p[1], 10)] + ' ' + p[0];
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('📅 เลือกเดือน');
  var sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  if (sh && sh.getLastRow() > 1) {
    var keys = readMonthKeys(sh);
    var seen = {};
    keys.forEach(function(k) { if (k) seen[k] = true; });
    Object.keys(seen).sort().reverse().forEach(function(k) {
      var p = k.split('-');
      menu.addItem(fmtKey(k), 'showM_' + p[0] + '_' + p[1]);
    });
  }

  menu.addSeparator();
  menu.addItem('✅ แสดงทั้งหมด', 'showAll');
  menu.addItem('🔒 แค่เดือนล่าสุด', 'showLatest');
  menu.addToUi();
}

function filterKey(key) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (!sh || sh.getLastRow() <= 1) return;
  var keys = readMonthKeys(sh);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i] === key) sh.showRows(i + 2, 1);
    else sh.hideRows(i + 2, 1);
  }
}

function showAll() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sh && sh.getLastRow() > 1) sh.showRows(2, sh.getLastRow() - 1);
}

function showLatest() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (!sh || sh.getLastRow() <= 1) return;
  var keys = readMonthKeys(sh);
  var latest = '';
  keys.forEach(function(k) { if (k && k > latest) latest = k; });
  if (!latest) { SpreadsheetApp.getUi().alert('ไม่พบข้อมูลเดือนในคอลัมน์ A'); return; }
  filterKey(latest);
  SpreadsheetApp.getUi().alert('✅ แสดงเฉพาะ ' + fmtKey(latest));
}

// ฟังก์ชันแต่ละเดือน (ปี พ.ศ. 2565–2572)
function showM_2565_01(){filterKey('2565-01');} function showM_2565_02(){filterKey('2565-02');} function showM_2565_03(){filterKey('2565-03');} function showM_2565_04(){filterKey('2565-04');} function showM_2565_05(){filterKey('2565-05');} function showM_2565_06(){filterKey('2565-06');} function showM_2565_07(){filterKey('2565-07');} function showM_2565_08(){filterKey('2565-08');} function showM_2565_09(){filterKey('2565-09');} function showM_2565_10(){filterKey('2565-10');} function showM_2565_11(){filterKey('2565-11');} function showM_2565_12(){filterKey('2565-12');}
function showM_2566_01(){filterKey('2566-01');} function showM_2566_02(){filterKey('2566-02');} function showM_2566_03(){filterKey('2566-03');} function showM_2566_04(){filterKey('2566-04');} function showM_2566_05(){filterKey('2566-05');} function showM_2566_06(){filterKey('2566-06');} function showM_2566_07(){filterKey('2566-07');} function showM_2566_08(){filterKey('2566-08');} function showM_2566_09(){filterKey('2566-09');} function showM_2566_10(){filterKey('2566-10');} function showM_2566_11(){filterKey('2566-11');} function showM_2566_12(){filterKey('2566-12');}
function showM_2567_01(){filterKey('2567-01');} function showM_2567_02(){filterKey('2567-02');} function showM_2567_03(){filterKey('2567-03');} function showM_2567_04(){filterKey('2567-04');} function showM_2567_05(){filterKey('2567-05');} function showM_2567_06(){filterKey('2567-06');} function showM_2567_07(){filterKey('2567-07');} function showM_2567_08(){filterKey('2567-08');} function showM_2567_09(){filterKey('2567-09');} function showM_2567_10(){filterKey('2567-10');} function showM_2567_11(){filterKey('2567-11');} function showM_2567_12(){filterKey('2567-12');}
function showM_2568_01(){filterKey('2568-01');} function showM_2568_02(){filterKey('2568-02');} function showM_2568_03(){filterKey('2568-03');} function showM_2568_04(){filterKey('2568-04');} function showM_2568_05(){filterKey('2568-05');} function showM_2568_06(){filterKey('2568-06');} function showM_2568_07(){filterKey('2568-07');} function showM_2568_08(){filterKey('2568-08');} function showM_2568_09(){filterKey('2568-09');} function showM_2568_10(){filterKey('2568-10');} function showM_2568_11(){filterKey('2568-11');} function showM_2568_12(){filterKey('2568-12');}
function showM_2569_01(){filterKey('2569-01');} function showM_2569_02(){filterKey('2569-02');} function showM_2569_03(){filterKey('2569-03');} function showM_2569_04(){filterKey('2569-04');} function showM_2569_05(){filterKey('2569-05');} function showM_2569_06(){filterKey('2569-06');} function showM_2569_07(){filterKey('2569-07');} function showM_2569_08(){filterKey('2569-08');} function showM_2569_09(){filterKey('2569-09');} function showM_2569_10(){filterKey('2569-10');} function showM_2569_11(){filterKey('2569-11');} function showM_2569_12(){filterKey('2569-12');}
function showM_2570_01(){filterKey('2570-01');} function showM_2570_02(){filterKey('2570-02');} function showM_2570_03(){filterKey('2570-03');} function showM_2570_04(){filterKey('2570-04');} function showM_2570_05(){filterKey('2570-05');} function showM_2570_06(){filterKey('2570-06');} function showM_2570_07(){filterKey('2570-07');} function showM_2570_08(){filterKey('2570-08');} function showM_2570_09(){filterKey('2570-09');} function showM_2570_10(){filterKey('2570-10');} function showM_2570_11(){filterKey('2570-11');} function showM_2570_12(){filterKey('2570-12');}
function showM_2571_01(){filterKey('2571-01');} function showM_2571_02(){filterKey('2571-02');} function showM_2571_03(){filterKey('2571-03');} function showM_2571_04(){filterKey('2571-04');} function showM_2571_05(){filterKey('2571-05');} function showM_2571_06(){filterKey('2571-06');} function showM_2571_07(){filterKey('2571-07');} function showM_2571_08(){filterKey('2571-08');} function showM_2571_09(){filterKey('2571-09');} function showM_2571_10(){filterKey('2571-10');} function showM_2571_11(){filterKey('2571-11');} function showM_2571_12(){filterKey('2571-12');}
function showM_2572_01(){filterKey('2572-01');} function showM_2572_02(){filterKey('2572-02');} function showM_2572_03(){filterKey('2572-03');} function showM_2572_04(){filterKey('2572-04');} function showM_2572_05(){filterKey('2572-05');} function showM_2572_06(){filterKey('2572-06');} function showM_2572_07(){filterKey('2572-07');} function showM_2572_08(){filterKey('2572-08');} function showM_2572_09(){filterKey('2572-09');} function showM_2572_10(){filterKey('2572-10');} function showM_2572_11(){filterKey('2572-11');} function showM_2572_12(){filterKey('2572-12');}
