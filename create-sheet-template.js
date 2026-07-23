// ============================================================
// STEP 1: สร้าง Google Sheet template พร้อมข้อมูลตัวอย่าง
// วิธีใช้:
//   1. ไป https://script.google.com → New project
//   2. วางโค้ดทั้งหมดนี้ แทนที่โค้ดเดิม
//   3. กด Run → "createTemplate"
//   4. อนุญาต permission → รอ ~10 วินาที
//   5. จะมี link ของ Google Sheet ขึ้นมาใน popup
// ============================================================

function createTemplate() {
  // สร้าง Spreadsheet ใหม่
  const ss = SpreadsheetApp.create('📊 pile-production-data');

  // สร้าง 3 sheets
  setupSheetMonthly(ss);
  setupSheetDecades(ss);
  setupSheetCauses(ss);

  // ลบ Sheet1 เริ่มต้น (ถ้ามี)
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet) ss.deleteSheet(defaultSheet);

  // เปิด sheet แรก
  ss.setActiveSheet(ss.getSheetByName('รายเดือน'));

  // แสดง URL
  const url = ss.getUrl();
  SpreadsheetApp.getUi().alert(
    '✅ สร้าง Google Sheet สำเร็จ!\n\n' +
    'คลิก OK แล้วดูใน Google Drive หรือไปที่:\n' + url
  );
  Logger.log('Sheet URL: ' + url);
}

// ============================================================
// Sheet 1: รายเดือน
// ============================================================
function setupSheetMonthly(ss) {
  const sheet = ss.insertSheet('รายเดือน');

  // หัวคอลัมน์
  const headers = [
    'ปี', 'เดือน', 'คิวสั่งผลิต', 'คิวผลิตจริง', 'ค้าง-ยกเลิก',
    'วันผลิต', 'เฉลี่ยคิว/วัน', 'คิวขนส่ง', 'สต็อคคงเหลือ',
    'แพสั่ง', 'แพผลิต', 'แพค้าง', 'ข้อมูลจริง (TRUE=จริง)'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // ข้อมูลตัวอย่าง ปี 2569 (จริง)
  const data2569 = [
    [2569,1, 4453.59,4291.81,161.78,27,158.96,4024.69,4257.81,293,  283,  10,  true],
    [2569,2, 3722.51,3657.43, 65.08,25,146.30,4402.10,3530.86,221,  219,   2,  true],
    [2569,3, 4614.79,4350.12,264.67,31,140.33,4691.94,3210.50,308,  295,  10,  true],
    [2569,4, 3453.09,3268.36,184.73,21,155.64,2634.03,3851.02,231.5,218.5,13,  true],
    // เดือนถัดไป — กรอกเพิ่มได้เลย
    [2569,5, '',      '',      '',   '', '',     '',      '',     '',  '',   '',  true],
    [2569,6, '',      '',      '',   '', '',     '',      '',     '',  '',   '',  true],
  ];

  // ข้อมูลตัวอย่าง ปี 2568 (sample)
  const data2568 = [
    [2568,1, 4120,3902.4,217.6,26,150.1,3760.5,3990.2,268,255,13,false],
    [2568,2, 3580,3401,  179,  24,141.7,3520.8,3870.4,214,206, 8,false],
    [2568,3, 4380,4029.6,350.4,30,134.3,4210,  3690,  295,276,19,false],
    [2568,4, 3260,3064.4,195.6,22,139.3,3180,  3574.4,220,210,10,false],
    [2568,5, 3980,3741.2,238.8,27,138.6,3890,  3425.6,262,248,14,false],
    [2568,6, 3710,3450.3,259.7,25,138,  3600,  3275.9,244,230,14,false],
    [2568,7, 4250,4037.5,212.5,29,139.2,4120,  3193.4,281,268,13,false],
    [2568,8, 4410,4145.4,264.6,30,138.2,4300,  3038.8,292,274,18,false],
    [2568,9, 3890,3617.7,272.3,26,139.1,3780,  2876.5,256,240,16,false],
    [2568,10,4060,3856,  204,  28,137.7,3960,  2772.5,270,257,13,false],
    [2568,11,4180,3929.2,250.8,27,145.5,4050,  2651.7,278,262,16,false],
    [2568,12,4530,4258.2,271.8,30,141.9,4400,  2509.9,301,283,18,false],
  ];

  const allData = [...data2569, ...data2568];
  sheet.getRange(2, 1, allData.length, headers.length).setValues(allData);

  // จัดสไตล์
  styleHeader(sheet, headers.length);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);

  // สีแถว 2569 (ฟ้าอ่อน) vs 2568 (เทาอ่อน)
  sheet.getRange(2, 1, 6, headers.length).setBackground('#EEF3FC');   // 2569
  sheet.getRange(8, 1, 12, headers.length).setBackground('#F5F6F8');  // 2568

  // ปรับความกว้างคอลัมน์
  sheet.autoResizeColumns(1, headers.length);

  // หมายเหตุ
  sheet.getRange(1, 13).setNote('TRUE = ข้อมูลจริง | FALSE = ข้อมูลตัวอย่าง (ปี 2568)');

  Logger.log('✅ Sheet รายเดือน สร้างเสร็จ');
}

// ============================================================
// Sheet 2: คุณภาพ10วัน
// ============================================================
function setupSheetDecades(ss) {
  const sheet = ss.insertSheet('คุณภาพ10วัน');

  const headers = [
    'ปี', 'ลำดับ', 'ช่วง 10 วัน',
    'Strength (ksc)', 'ปูนรวม (kg/m³)', 'ปูนเสาใหญ่ (kg/m³)', 'ปูน I18 (kg/m³)',
    'หิน 3/4" (kg/m³)', 'หิน 1" (kg/m³)', 'ทราย (kg/m³)'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  const data = [
    [2569, 1, '1–10 ม.ค.',   473,    328.45,331.41,279.91,920.67,324.71,807.12],
    [2569, 2, '11–20 ม.ค.',  478,    326.95,330.77,279.14,924.30,329.19,810.17],
    [2569, 3, '21–31 ม.ค.',  505,    336.48,337.74,279.17,948.53,339.59,829.70],
    [2569, 4, '1–10 ก.พ.',   438,    329.49,329.63,280.21,933.34,326.21,814.59],
    [2569, 5, '11–20 ก.พ.',  467,    332.54,332.54,'',    963.25,293.28,815.80],
    [2569, 6, '21–28 ก.พ.',  454.47, 333.17,333.17,'',    938.86,319.82,810.29],
    [2569, 7, '1–10 มี.ค.',  482.37, 330.96,333.43,279.44,916.65,326.89,801.61],
    [2569, 8, '11–20 มี.ค.', 541.05, 330.08,333.03,280.12,931.94,330.99,813.39],
    [2569, 9, '21–31 มี.ค.', 483.36, 328.02,329.97,279.66,924.22,327.87,809.42],
    [2569,10, '1–11 เม.ย.',  475.39, 326.79,328.62,279.15,953.18,337.04,832.20],
    [2569,11, '20–30 เม.ย.', '',     355.41,'',    '',    '',    '',    ''     ],
    // เพิ่มช่วงถัดไป
    [2569,12, '1–10 พ.ค.',   '',     '',    '',    '',    '',    '',    ''     ],
    [2569,13, '11–20 พ.ค.',  '',     '',    '',    '',    '',    '',    ''     ],
    [2569,14, '21–31 พ.ค.',  '',     '',    '',    '',    '',    '',    ''     ],
  ];

  sheet.getRange(2, 1, data.length, headers.length).setValues(data);

  styleHeader(sheet, headers.length);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(3);
  sheet.getRange(2, 1, data.length, headers.length).setBackground('#EEF3FC');
  sheet.autoResizeColumns(1, headers.length);

  // เส้นค่าสูตร (หมายเหตุ)
  sheet.getRange(1, 4).setNote('เกณฑ์ขั้นต่ำ: 450 ksc');
  sheet.getRange(1, 8).setNote('ค่าสูตร: 940 kg/m³');
  sheet.getRange(1, 9).setNote('ค่าสูตร: 330 kg/m³');
  sheet.getRange(1, 10).setNote('ค่าสูตร: 822 kg/m³');

  Logger.log('✅ Sheet คุณภาพ10วัน สร้างเสร็จ');
}

// ============================================================
// Sheet 3: สาเหตุค้าง
// ============================================================
function setupSheetCauses(ss) {
  const sheet = ss.insertSheet('สาเหตุค้าง');

  const headers = ['ปี', 'เดือน', 'ลำดับ (0-9)', 'สาเหตุ', 'จำนวน (แพ)'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  const causeLabels = [
    'แพล้นเสีย','ที่ดึงหินทรายเสีย','เครนเสีย','รถไฟขนเสาเข็มเสีย',
    'รถไฟขนคอนกรีตเสีย','รถขนส่งเข้าเยอะ','ผู้รับเหมาผลิตไม่ได้',
    'สต็อคเต็ม','ซ่อมแพผลิต','ฝ่ายผลิตยกเลิกเอง'
  ];

  const rawCauses = {
    1: [3,0,0,0,1,0,3,2,1,0],
    2: [1,0,0,0,0,1,0,0,0,0],
    3: [9,5,0,1,0,1,0,0,0,1],
    4: [6,4,0,2,0,1,0,1,0,0],
  };

  const data = [];
  [1,2,3,4].forEach(month => {
    causeLabels.forEach((label, idx) => {
      data.push([2569, month, idx, label, rawCauses[month][idx]]);
    });
  });

  // แถวว่างสำหรับเดือนถัดไป (พ.ค.)
  causeLabels.forEach((label, idx) => {
    data.push([2569, 5, idx, label, '']);
  });

  sheet.getRange(2, 1, data.length, headers.length).setValues(data);

  styleHeader(sheet, headers.length);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);

  // สีแต่ละเดือน
  const colors = ['#EEF3FC','#F0FAF8','#FEF9EC','#FFF0F0','#F5F6F8'];
  [1,2,3,4,5].forEach((m, i) => {
    const row = 2 + (i * 10);
    sheet.getRange(row, 1, 10, headers.length).setBackground(colors[i]);
  });

  sheet.autoResizeColumns(1, headers.length);
  sheet.getRange(1,3).setNote('0=แพล้นเสีย, 1=ที่ดึงหินทราย, 2=เครน, 3=รถไฟขนเสา, 4=รถไฟขนคอน, 5=รถขนส่ง, 6=ผู้รับเหมา, 7=สต็อคเต็ม, 8=ซ่อมแพ, 9=ฝ่ายผลิตยกเลิก');

  Logger.log('✅ Sheet สาเหตุค้าง สร้างเสร็จ');
}

// ============================================================
// Helper: จัดสไตล์ header row
// ============================================================
function styleHeader(sheet, numCols) {
  const headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange
    .setBackground('#2F5FD0')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  sheet.setRowHeight(1, 48);
}
