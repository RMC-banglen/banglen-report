// ============================================================
// ดึงยอดแพรายวัน จากแดชบอร์ด มาเติมในชีท "รายเดือน" ให้เอง
//
// เดิมต้องเปิดรายงานรายวัน แล้วคัดลอกยอดมาพิมพ์ในชีททุกเดือน
// ลืมคัดลอกเมื่อไหร่ ตัวเลขในชีทกับในแดชบอร์ดก็ไม่ตรงกัน
//
// ไฟล์นี้ "เพิ่มใหม่" ไม่ต้องแก้โค้ดเดิมแม้แต่บรรทัดเดียว
// ใช้ SUPABASE_URL / SUPABASE_KEY / SS_MAIN_ID ร่วมกับไฟล์เดิมที่มีอยู่แล้ว
//
// วิธีติดตั้ง
//   1. เปิดชีท -> ส่วนขยาย -> Apps Script
//   2. กด + ข้างคำว่า "ไฟล์" -> สคริปต์ -> ตั้งชื่อ pullRaftDaily
//   3. วางโค้ดนี้ทั้งไฟล์ -> บันทึก
//   4. เลือกฟังก์ชัน installRaftPullTrigger -> กด Run หนึ่งครั้ง (อนุญาตสิทธิ์)
//      จากนั้นระบบจะดึงให้เองทุกชั่วโมง
//   5. อยากดึงเดี๋ยวนั้น เลือกฟังก์ชัน pullRaftFromDaily แล้วกด Run
//
// ช่องที่เขียนทับ
//   แพสั่ง · แพผลิต · แพค้าง · วันผลิต        <- จากรายงานรายวัน (pour_daily)
//   คิวสั่งผลิต · คิวผลิตจริง · คิวขนส่ง · สต็อคคงเหลือ <- จากช่องกรอกรายเดือนบนแดชบอร์ด (monthly_input)
// ช่องที่ชีทคำนวณเอง (% ผลิต · ส่วนต่างสต็อค · เฉลี่ยคิว/วัน) ไม่แตะ
// เดือนที่ยังไม่มีข้อมูล ไม่แตะทั้งแถว
// ============================================================

// วันผลิตที่ใช้หาร % — วันหยุดบริษัท (day_type=1) ไม่นับ · หยุดเอง (2) นับ
var RAFT_DAYTYPE_HOLIDAY = 1;

function pullRaftFromDaily() {
  var res = UrlFetchApp.fetch(
    SUPABASE_URL + '/rest/v1/pour_daily?select=d,raft_order,raft_produced,raft_cancel,day_type',
    { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    Logger.log('❌ ดึงข้อมูลรายวันไม่ได้: ' + res.getContentText());
    return;
  }
  var daily = JSON.parse(res.getContentText());
  if (!daily.length) { Logger.log('ไม่มีข้อมูลรายวัน'); return; }

  // รวมยอดรายเดือน — key = "ปีพ.ศ.-เดือน"
  var agg = {};
  daily.forEach(function (r) {
    var p = String(r.d).split('-');
    var ce = Number(p[0]), mo = Number(p[1]);
    if (!ce || !mo) return;
    var k = (ce + 543) + '-' + mo;
    var o = agg[k] || (agg[k] = { order: 0, produced: 0, cancel: 0, workDays: 0, holidays: 0, typed: false });
    o.order += Number(r.raft_order) || 0;
    o.produced += Number(r.raft_produced) || 0;
    o.cancel += (Number(r.raft_order) || 0) - (Number(r.raft_produced) || 0);
    var dt = Number(r.day_type) || 0;
    if (dt !== 0) o.typed = true;
    if (dt === RAFT_DAYTYPE_HOLIDAY) o.holidays += 1; else o.workDays += 1;
  });

  // ตัวเลขรายเดือนที่กรอกจากแดชบอร์ด (ตารางนี้ยังไม่มีก็ข้ามไป ส่วนแพยังทำงานปกติ)
  var mIn = {};
  var mRes = UrlFetchApp.fetch(
    SUPABASE_URL + '/rest/v1/monthly_input?select=year,month,order_qty,produced,transport,stock',
    { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }, muteHttpExceptions: true });
  if (mRes.getResponseCode() === 200) {
    JSON.parse(mRes.getContentText()).forEach(function (r) { mIn[r.year + '-' + r.month] = r; });
  } else {
    Logger.log('ข้ามตัวเลขรายเดือน: ' + mRes.getContentText());
  }

  var ss = SpreadsheetApp.openById(SS_MAIN_ID);
  var sheet = ss.getSheetByName('รายเดือน');
  if (!sheet) { Logger.log('ไม่พบชีท "รายเดือน"'); return; }

  var values = sheet.getDataRange().getValues();
  var col = {};
  values[0].forEach(function (h, i) { col[String(h).trim()] = i; });

  var need = ['ปี', 'เดือน', 'แพสั่ง', 'แพผลิต', 'แพค้าง', 'วันผลิต'];
  var missing = need.filter(function (h) { return col[h] === undefined; });
  if (missing.length) { Logger.log('❌ ชีทไม่มีคอลัมน์: ' + missing.join(', ')); return; }

  // ช่องกรอกรายเดือนจากแดชบอร์ด -> ชื่อคอลัมน์ในชีท
  var M_MAP = [['order_qty', 'คิวสั่งผลิต'], ['produced', 'คิวผลิตจริง'], ['transport', 'คิวขนส่ง'], ['stock', 'สต็อคคงเหลือ']];

  var changed = [];
  for (var i = 1; i < values.length; i++) {
    var yr = Number(values[i][col['ปี']]), mo = Number(values[i][col['เดือน']]);
    if (!yr || !mo) continue;
    var a = agg[yr + '-' + mo];
    var m = mIn[yr + '-' + mo];
    if (!a && !m) continue;                             // เดือนนี้ยังไม่มีข้อมูลเลย ไม่แตะ

    var write = [];
    if (a) {
      write.push([col['แพสั่ง'], round1(a.order)], [col['แพผลิต'], round1(a.produced)], [col['แพค้าง'], round1(a.cancel)]);
      // วันผลิต เขียนทับเฉพาะเดือนที่ระบุประเภทวันแล้ว ไม่งั้นปล่อยค่าที่พิมพ์ไว้เดิม
      if (a.typed && a.workDays > 0) write.push([col['วันผลิต'], a.workDays]);
    }
    if (m) M_MAP.forEach(function (x) {
      // ช่องที่ยังไม่ได้กรอกในแดชบอร์ด (ว่าง) ไม่ไปลบค่าที่พิมพ์ไว้ในชีท
      if (m[x[0]] == null || col[x[1]] === undefined) return;
      write.push([col[x[1]], Number(m[x[0]])]);
    });

    var diff = [];
    write.forEach(function (w) {
      var cell = sheet.getRange(i + 1, w[0] + 1);
      var old = Number(cell.getValue()) || 0;
      if (Math.abs(old - w[1]) > 0.001) { cell.setValue(w[1]); diff.push(values[0][w[0]] + ' ' + old + '→' + w[1]); }
    });
    if (diff.length) changed.push(yr + '/' + mo + ': ' + diff.join(' · '));
  }

  // สคริปต์เขียนชีทไม่ปลุก onEdit ช่อง % ผลิต/ส่วนต่างสต็อคเลยไม่คำนวณใหม่เอง
  // สั่งคำนวณต่อให้ที่นี่ (ฟังก์ชันนี้อยู่ในไฟล์เดิม ไม่ต้องแก้) — พังก็ไม่ให้ลากการเติมตัวเลขล้มไปด้วย
  if (changed.length) {
    try { writeComputedColumns(ss); }
    catch (e) { Logger.log('คำนวณ % ในชีทไม่สำเร็จ: ' + e.message); }
  }

  var msg = changed.length
    ? '✅ อัปเดต ' + changed.length + ' เดือน\n' + changed.join('\n')
    : '✅ ตัวเลขตรงกันอยู่แล้ว ไม่มีอะไรต้องแก้';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}   // รันจาก trigger จะไม่มี UI
  return msg;
}

function round1(n) { return Math.round(n * 10) / 10; }

// ตั้งให้ดึงเองทุกชั่วโมง — กดรันซ้ำได้ ไม่สร้าง trigger ซ้อน
function installRaftPullTrigger() {
  var existing = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'pullRaftFromDaily';
  });
  if (existing.length) {
    Logger.log('มี trigger อยู่แล้ว ' + existing.length + ' ตัว — ไม่สร้างเพิ่ม');
    return;
  }
  ScriptApp.newTrigger('pullRaftFromDaily').timeBased().everyHours(1).create();
  Logger.log('✅ ตั้งให้ดึงยอดแพรายวันมาเติมในชีท ทุก 1 ชั่วโมง');
}

function removeRaftPullTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'pullRaftFromDaily') ScriptApp.deleteTrigger(t);
  });
  Logger.log('ลบ trigger แล้ว');
}
