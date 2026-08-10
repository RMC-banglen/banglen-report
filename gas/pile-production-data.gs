// ============================================================
// Apps Script — pile-production-data เท่านั้น
// อ่าน Column A = ปี (พ.ศ.), Column B = เดือน (1-12)
// ไม่มีโค้ดคอนกรีต / วัตถุดิบ / Supabase
// ============================================================

var THAI_M = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('📅 เลือกเดือน');
  var sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  if (sh && sh.getLastRow() > 1) {
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
    var months = {};
    data.forEach(function(r) {
      var y = Number(r[0]), m = Number(r[1]);
      if (y && m) months[y + '-' + (m < 10 ? '0' + m : m)] = true;
    });
    Object.keys(months).sort().reverse().forEach(function(k) {
      var p = k.split('-');
      menu.addItem(THAI_M[Number(p[1])] + ' ' + p[0], 'showM_' + p[0] + '_' + p[1]);
    });
  }

  menu.addSeparator();
  menu.addItem('✅ แสดงทั้งหมด', 'showAll');
  menu.addItem('🔒 แค่เดือนล่าสุด', 'showLatest');
  menu.addToUi();
}

function filterYM(year, month) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (!sh || sh.getLastRow() <= 1) return;
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < data.length; i++) {
    if (Number(data[i][0]) === year && Number(data[i][1]) === month) sh.showRows(i + 2, 1);
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
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
  var latest = '';
  data.forEach(function(r) {
    var y = Number(r[0]), m = Number(r[1]);
    if (y && m) {
      var k = y + '-' + (m < 10 ? '0' + m : m);
      if (k > latest) latest = k;
    }
  });
  if (!latest) return;
  var p = latest.split('-');
  filterYM(Number(p[0]), Number(p[1]));
  SpreadsheetApp.getUi().alert('✅ แสดงเฉพาะ ' + THAI_M[Number(p[1])] + ' ' + p[0]);
}

// ฟังก์ชันแต่ละเดือน (ปี พ.ศ. 2565–2572)
function showM_2565_01(){filterYM(2565,1);} function showM_2565_02(){filterYM(2565,2);} function showM_2565_03(){filterYM(2565,3);} function showM_2565_04(){filterYM(2565,4);} function showM_2565_05(){filterYM(2565,5);} function showM_2565_06(){filterYM(2565,6);} function showM_2565_07(){filterYM(2565,7);} function showM_2565_08(){filterYM(2565,8);} function showM_2565_09(){filterYM(2565,9);} function showM_2565_10(){filterYM(2565,10);} function showM_2565_11(){filterYM(2565,11);} function showM_2565_12(){filterYM(2565,12);}
function showM_2566_01(){filterYM(2566,1);} function showM_2566_02(){filterYM(2566,2);} function showM_2566_03(){filterYM(2566,3);} function showM_2566_04(){filterYM(2566,4);} function showM_2566_05(){filterYM(2566,5);} function showM_2566_06(){filterYM(2566,6);} function showM_2566_07(){filterYM(2566,7);} function showM_2566_08(){filterYM(2566,8);} function showM_2566_09(){filterYM(2566,9);} function showM_2566_10(){filterYM(2566,10);} function showM_2566_11(){filterYM(2566,11);} function showM_2566_12(){filterYM(2566,12);}
function showM_2567_01(){filterYM(2567,1);} function showM_2567_02(){filterYM(2567,2);} function showM_2567_03(){filterYM(2567,3);} function showM_2567_04(){filterYM(2567,4);} function showM_2567_05(){filterYM(2567,5);} function showM_2567_06(){filterYM(2567,6);} function showM_2567_07(){filterYM(2567,7);} function showM_2567_08(){filterYM(2567,8);} function showM_2567_09(){filterYM(2567,9);} function showM_2567_10(){filterYM(2567,10);} function showM_2567_11(){filterYM(2567,11);} function showM_2567_12(){filterYM(2567,12);}
function showM_2568_01(){filterYM(2568,1);} function showM_2568_02(){filterYM(2568,2);} function showM_2568_03(){filterYM(2568,3);} function showM_2568_04(){filterYM(2568,4);} function showM_2568_05(){filterYM(2568,5);} function showM_2568_06(){filterYM(2568,6);} function showM_2568_07(){filterYM(2568,7);} function showM_2568_08(){filterYM(2568,8);} function showM_2568_09(){filterYM(2568,9);} function showM_2568_10(){filterYM(2568,10);} function showM_2568_11(){filterYM(2568,11);} function showM_2568_12(){filterYM(2568,12);}
function showM_2569_01(){filterYM(2569,1);} function showM_2569_02(){filterYM(2569,2);} function showM_2569_03(){filterYM(2569,3);} function showM_2569_04(){filterYM(2569,4);} function showM_2569_05(){filterYM(2569,5);} function showM_2569_06(){filterYM(2569,6);} function showM_2569_07(){filterYM(2569,7);} function showM_2569_08(){filterYM(2569,8);} function showM_2569_09(){filterYM(2569,9);} function showM_2569_10(){filterYM(2569,10);} function showM_2569_11(){filterYM(2569,11);} function showM_2569_12(){filterYM(2569,12);}
function showM_2570_01(){filterYM(2570,1);} function showM_2570_02(){filterYM(2570,2);} function showM_2570_03(){filterYM(2570,3);} function showM_2570_04(){filterYM(2570,4);} function showM_2570_05(){filterYM(2570,5);} function showM_2570_06(){filterYM(2570,6);} function showM_2570_07(){filterYM(2570,7);} function showM_2570_08(){filterYM(2570,8);} function showM_2570_09(){filterYM(2570,9);} function showM_2570_10(){filterYM(2570,10);} function showM_2570_11(){filterYM(2570,11);} function showM_2570_12(){filterYM(2570,12);}
function showM_2571_01(){filterYM(2571,1);} function showM_2571_02(){filterYM(2571,2);} function showM_2571_03(){filterYM(2571,3);} function showM_2571_04(){filterYM(2571,4);} function showM_2571_05(){filterYM(2571,5);} function showM_2571_06(){filterYM(2571,6);} function showM_2571_07(){filterYM(2571,7);} function showM_2571_08(){filterYM(2571,8);} function showM_2571_09(){filterYM(2571,9);} function showM_2571_10(){filterYM(2571,10);} function showM_2571_11(){filterYM(2571,11);} function showM_2571_12(){filterYM(2571,12);}
function showM_2572_01(){filterYM(2572,1);} function showM_2572_02(){filterYM(2572,2);} function showM_2572_03(){filterYM(2572,3);} function showM_2572_04(){filterYM(2572,4);} function showM_2572_05(){filterYM(2572,5);} function showM_2572_06(){filterYM(2572,6);} function showM_2572_07(){filterYM(2572,7);} function showM_2572_08(){filterYM(2572,8);} function showM_2572_09(){filterYM(2572,9);} function showM_2572_10(){filterYM(2572,10);} function showM_2572_11(){filterYM(2572,11);} function showM_2572_12(){filterYM(2572,12);}
