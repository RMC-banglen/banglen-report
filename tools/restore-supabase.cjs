#!/usr/bin/env node
/*
 * กู้ข้อมูลจากไฟล์สำรองกลับเข้า Supabase
 *
 * ใช้กับไฟล์สำรองจาก 2 แบบ:
 *   • ไฟล์ .json จากปุ่ม "สำรองข้อมูลตอนนี้" บนหน้าเว็บ  (RMC-banglen-backup_....json)
 *   • โฟลเดอร์จากสคริปต์ tools/backup-supabase.cjs      (...\data\2026-11-16_1021)
 *
 *   node tools/restore-supabase.cjs <ไฟล์หรือโฟลเดอร์สำรอง>                          ← ดูผลเฉยๆ (DRY RUN) ไม่เขียนอะไร
 *   node tools/restore-supabase.cjs <สำรอง> --tables concrete_results,foreman_reports ← เฉพาะบางตาราง
 *   node tools/restore-supabase.cjs <สำรอง> --apply                                  ← เขียนจริง: ใส่เฉพาะแถวที่ "หายไป" (ไม่ทับแถวที่มีอยู่)
 *   node tools/restore-supabase.cjs <สำรอง> --apply --overwrite                     ← เขียนจริง: ทับแถวที่มีอยู่ด้วยค่าจากไฟล์สำรองด้วย (ระวัง: ข้อมูลที่แก้หลังสำรองจะถูกทับ)
 *   เขียนจริง (--apply) ต้องใส่ PIN ผู้ดูแลระบบ (ตรวจกับตาราง worktrack_users role=admin) แล้วพิมพ์ RESTORE ยืนยัน — ดูผลเฉยๆ ไม่ต้องใส่
 *   --admin-pin=XXXX และ --confirm=RESTORE ข้ามคำถาม (ใช้เมื่อรันอัตโนมัติ) · --url / --key ใช้ฐานข้อมูลอื่น (ค่าเริ่มต้นอ่านจาก qc.html)
 *   การกู้คืนทำได้จากสคริปต์นี้ในเครื่องเท่านั้น ไม่มีปุ่มกู้บนหน้าเว็บ
 *
 * ความปลอดภัย
 *   - ค่าเริ่มต้นไม่เขียนอะไร ต้องใส่ --apply และพิมพ์ RESTORE ยืนยันทุกครั้ง
 *   - ก่อนเขียน เก็บสถานะปัจจุบันของตารางที่จะแตะไว้ที่ <ที่เก็บสำรอง>\pre-restore\ (กู้ย้อนกลับได้)
 *   - ไม่ลบอะไรเลย (มีแค่เพิ่ม/ทับแถว) · ตารางที่ไม่มีคอลัมน์ id ข้าม (ต้องจัดการเอง)
 *   - หลังกู้ ต้องรัน SQL ที่สคริปต์เขียนไว้ (restore-fix-sequences.sql) เพื่อให้เลขรันอัตโนมัติ (id) ไม่ซ้ำกับแถวที่กู้
 *   - ไม่รวม: โครงสร้างตาราง (สร้างจากไฟล์ supabase-*.sql ใน repo ก่อน) และรูปถ่าย (อัปโหลดจากโฟลเดอร์ photos ของที่สำรอง)
 */
const fs=require('fs'),path=require('path'),readline=require('readline');

const args=process.argv.slice(2);
const flag=n=>args.includes('--'+n), val=n=>{const a=args.find(x=>x.startsWith('--'+n+'='));return a?a.slice(n.length+3):(args.indexOf('--'+n)>=0&&args[args.indexOf('--'+n)+1]&&!args[args.indexOf('--'+n)+1].startsWith('--')?args[args.indexOf('--'+n)+1]:null);};
const input=args.find(a=>!a.startsWith('--')&&a!==val('tables')&&a!==val('url')&&a!==val('key'));
if(!input){console.error('ใช้: node tools/restore-supabase.cjs <ไฟล์หรือโฟลเดอร์สำรอง> [--tables a,b] [--apply] [--overwrite]');process.exit(1);}
const APPLY=flag('apply'),OVERWRITE=flag('overwrite');
const ROOT=path.resolve(__dirname,'..');
let URL_=val('url'),KEY=val('key');
if(!URL_||!KEY){const qc=fs.readFileSync(path.join(ROOT,'qc.html'),'utf8');URL_=URL_||(qc.match(/https:\/\/[a-z0-9]+\.supabase\.co/)||[])[0];KEY=KEY||(qc.match(/eyJ[A-Za-z0-9_\-\.]+/)||[])[0];}
const H={apikey:KEY,Authorization:'Bearer '+KEY};

// ---- อ่านไฟล์สำรอง ----
function loadBackup(p){
  const st=fs.statSync(p),out={};
  if(st.isDirectory()){
    fs.readdirSync(p).filter(f=>f.endsWith('.json')&&f!=='manifest.json').forEach(f=>{out[f.replace(/\.json$/,'')]=JSON.parse(fs.readFileSync(path.join(p,f),'utf8'));});
  }else{
    const j=JSON.parse(fs.readFileSync(p,'utf8'));
    if(j&&j.data&&typeof j.data==='object')Object.assign(out,j.data);else throw new Error('รูปแบบไฟล์ไม่ถูกต้อง (ไม่พบ data)');
  }
  return out;
}
// ตารางแม่ก่อนตารางลูก (กันติดความสัมพันธ์) · ที่เหลือเรียงตามชื่อ · ตารางที่พลาดจะถูกลองอีกรอบท้ายสุด
const FIRST=['quality_reports','qc_checks','repair_requests','repair_assets','worktrack_users','worktrack_raft_info','pile_fail_inspections','foreman_reports','qc_inspectors','qc_checklist'];
const ordered=names=>[...names.filter(n=>FIRST.includes(n)).sort((a,b)=>FIRST.indexOf(a)-FIRST.indexOf(b)),...names.filter(n=>!FIRST.includes(n)).sort()];

async function req(method,pathq,opt={}){return fetch(URL_+'/rest/v1/'+pathq,{method,headers:{...H,...(opt.headers||{})},body:opt.body});}
async function currentIds(t){
  const ids=new Set(),rows=[];
  for(let from=0;;from+=1000){
    const r=await req('GET',t+'?select=*&order=id.asc',{headers:{Range:from+'-'+(from+999)}});
    if(!(r.status===200||r.status===206)){const e=await r.text();const err=new Error(r.status+' '+e.slice(0,140));err.status=r.status;throw err;}
    const part=await r.json();part.forEach(x=>{ids.add(String(x.id));rows.push(x);});
    if(part.length<1000)break;
  }
  return {ids,rows};
}
function ask(q){return new Promise(res=>{const rl=readline.createInterface({input:process.stdin,output:process.stdout});rl.question(q,a=>{rl.close();res(a);});});}

(async()=>{
  const backup=loadBackup(path.resolve(input));
  let names=ordered(Object.keys(backup));
  const only=val('tables');if(only){const set=new Set(only.split(',').map(x=>x.trim()));names=names.filter(n=>set.has(n));}
  console.log((APPLY?'โหมดเขียนจริง':'โหมดดูผล (DRY RUN — ไม่เขียนอะไร)')+(APPLY?(OVERWRITE?' · ทับแถวที่มีอยู่ด้วย':' · ใส่เฉพาะแถวที่หายไป'):'')+'\nฐานข้อมูล: '+URL_.replace('https://','')+' · ตาราง '+names.length+'\n');

  // ---- วิเคราะห์ ----
  const plan=[];
  for(const t of names){
    const rows=backup[t];
    if(!Array.isArray(rows)){console.log('  - '+t.padEnd(30)+'ข้าม (ข้อมูลไม่ใช่รายการแถว)');continue;}
    if(!rows.length){console.log('  · '+t.padEnd(30)+'ไฟล์สำรองไม่มีแถว');continue;}
    if(!rows.every(r=>r&&r.id!=null)){console.log('  ! '+t.padEnd(30)+'ข้าม: มีแถวที่ไม่มีคอลัมน์ id (ต้องกู้เอง)');continue;}
    try{
      const cur=await currentIds(t);
      const missing=rows.filter(r=>!cur.ids.has(String(r.id)));
      const existing=rows.length-missing.length;
      plan.push({t,rows,missing,existing,cur:cur.rows});
      console.log('  '+(missing.length?'+':'=')+' '+t.padEnd(30)+'ในไฟล์ '+String(rows.length).padStart(6)+' · ในฐานข้อมูลตอนนี้ '+String(cur.ids.size).padStart(6)+' · หายไป '+String(missing.length).padStart(6)+(OVERWRITE?' · จะทับ '+existing:''));
    }catch(e){console.log('  ✘ '+t.padEnd(30)+'อ่านฐานข้อมูลไม่ได้: '+(e.message||e));}
  }
  const totalMissing=plan.reduce((s,p)=>s+p.missing.length,0),totalOver=OVERWRITE?plan.reduce((s,p)=>s+p.existing,0):0;
  console.log('\nรวม: แถวที่หายไป '+totalMissing+(OVERWRITE?' · แถวที่จะถูกทับ '+totalOver:''));
  if(!APPLY){console.log('\n(ดูผลเท่านั้น) ถ้าจะกู้จริงให้เพิ่ม --apply');return;}
  if(!totalMissing&&!totalOver){console.log('ไม่มีอะไรต้องกู้');return;}

  // ---- ผู้ดูแลระบบเท่านั้น: ตรวจ PIN ----
  let admins=[];
  try{const ra=await req('GET','worktrack_users?select=id,name,role,pin&role=eq.admin');if(ra.ok)admins=await ra.json();}catch(e){}
  if(!admins.length){console.log('\nไม่พบผู้ดูแลระบบในตาราง worktrack_users — ไม่อนุญาตให้เขียน (ยกเลิก)');process.exitCode=3;return;}
  const pin=(val('admin-pin')||await ask('\nPIN ผู้ดูแลระบบ: ')||'').trim();
  if(!admins.some(a=>String(a.pin)===pin&&pin)){console.log('PIN ไม่ถูกต้อง หรือไม่ใช่ผู้ดูแลระบบ — ยกเลิก (ไม่ได้เขียนอะไร)');process.exitCode=3;return;}
  console.log('ยืนยันตัวตนผู้ดูแลระบบแล้ว');

  // ---- ยืนยัน ----
  const conf=val('confirm');
  if(conf!=='RESTORE'){const a=await ask('\nจะเขียน '+(totalMissing)+' แถวใหม่'+(OVERWRITE?' และทับ '+totalOver+' แถว':'')+' ลงฐานข้อมูลจริง — พิมพ์ RESTORE แล้วกด Enter เพื่อยืนยัน: ');if(a.trim()!=='RESTORE'){console.log('ยกเลิก (ไม่ได้เขียนอะไร)');return;}}

  // ---- เก็บสถานะปัจจุบันไว้ก่อน ----
  const base=process.env.BACKUP_DIR||'D:\\Claude AI\\banglen-backups';
  const d=new Date(),p2=n=>String(n).padStart(2,'0'),stamp=d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())+'_'+p2(d.getHours())+p2(d.getMinutes())+p2(d.getSeconds());
  let pre=path.join(base,'pre-restore',stamp);for(let k=2;fs.existsSync(pre);k++)pre=path.join(base,'pre-restore',stamp+'-'+k);   // ไม่ทับสถานะที่เก็บไว้ก่อนหน้า
  fs.mkdirSync(pre,{recursive:true});
  plan.forEach(p=>fs.writeFileSync(path.join(pre,p.t+'.json'),JSON.stringify(p.cur,null,1)));
  console.log('\nเก็บสถานะก่อนกู้ไว้ที่ '+pre);

  // ---- เขียน ----
  const sql=[];const failed=[];
  async function writeTable(p){
    const toWrite=OVERWRITE?p.rows:p.missing;if(!toWrite.length)return true;
    for(let i=0;i<toWrite.length;i+=200){
      const chunk=toWrite.slice(i,i+200);
      const r=await req('POST',p.t+(OVERWRITE?'?on_conflict=id':''),{headers:{'content-type':'application/json',Prefer:OVERWRITE?'resolution=merge-duplicates,return=minimal':'return=minimal'},body:JSON.stringify(chunk)});
      if(!r.ok){const e=await r.text();throw new Error(r.status+' '+e.slice(0,200));}
    }
    return true;
  }
  let pending=plan.filter(p=>(OVERWRITE?p.rows.length:p.missing.length)>0),done=0;
  for(let pass=1;pass<=2&&pending.length;pass++){
    const next=[];
    for(const p of pending){
      try{await writeTable(p);done++;console.log('  ✔ '+p.t.padEnd(30)+(OVERWRITE?p.rows.length:p.missing.length)+' แถว');
        const maxId=Math.max(...p.rows.map(r=>Number(r.id)).filter(n=>isFinite(n)));
        if(isFinite(maxId))sql.push("select setval(pg_get_serial_sequence('public."+p.t+"','id'), greatest((select coalesce(max(id),1) from public."+p.t+"),"+maxId+"));");
      }catch(e){if(pass===1)next.push(p);else{failed.push([p.t,e.message||String(e)]);console.log('  ✘ '+p.t.padEnd(30)+(e.message||e));}}
    }
    pending=next;
    if(pending.length&&pass===1)console.log('  … ลองอีกรอบ '+pending.length+' ตาราง (เผื่อติดลำดับตารางแม่-ลูก)');
  }
  const sqlFile=path.join(pre,'restore-fix-sequences.sql');
  fs.writeFileSync(sqlFile,'-- รันใน Supabase SQL editor หลังกู้ เพื่อให้เลข id อัตโนมัติไม่ซ้ำกับแถวที่กู้ (ตารางที่ id ไม่ได้เป็น serial จะขึ้นข้อผิดพลาด ข้ามได้)\n'+sql.join('\n')+'\n');
  console.log('\nเสร็จ: กู้สำเร็จ '+done+' ตาราง · ไม่สำเร็จ '+failed.length+' ตาราง\nSQL ปรับเลข id (ให้รันใน Supabase SQL editor): '+sqlFile);
  process.exitCode=failed.length?2:0;
})().catch(e=>{console.error('ผิดพลาด: '+(e.message||e));process.exitCode=1;});
