#!/usr/bin/env node
/*
 * สำรองข้อมูล Supabase ของระบบ RMC บางเลน ลงเครื่อง (อ่านอย่างเดียว ไม่แก้/ลบอะไรในฐานข้อมูล)
 *
 *   node tools/backup-supabase.cjs                 → เก็บที่  D:\Claude AI\banglen-backups
 *   node tools/backup-supabase.cjs "E:\สำรอง"      → เก็บที่โฟลเดอร์ที่ระบุ
 *   (หรือตั้งตัวแปร BACKUP_DIR)
 *
 * ที่ได้ในโฟลเดอร์สำรอง
 *   data\YYYY-MM-DD_HHMM\<ตาราง>.json + manifest.json   ← ข้อมูลทุกตารางที่ระบบใช้ (ตัวละไฟล์ · สรุปจำนวนแถว/ข้อผิดพลาดใน manifest)
 *   photos\<bucket>\...                                  ← รูปถ่ายที่อ้างอิงในข้อมูล (โหลดครั้งแรกครั้งเดียว ครั้งต่อไปโหลดเฉพาะรูปใหม่)
 *
 * ข้อควรระวัง: ข้อมูลมีชื่อลูกค้า/พนักงาน — เก็บไว้ในเครื่องเท่านั้น ห้ามใส่ใน repo GitHub (repo เป็นสาธารณะ)
 * ตารางที่สำรองดึงอัตโนมัติจากโค้ด (.from('ชื่อตาราง')) จึงครอบคลุมตารางใหม่ที่เพิ่มภายหลังเอง
 */
const fs=require('fs'),path=require('path');

const ROOT=path.resolve(__dirname,'..');
const OUT=path.resolve(process.argv[2]||process.env.BACKUP_DIR||'D:\\Claude AI\\banglen-backups');
if(OUT.toLowerCase().startsWith(ROOT.toLowerCase())){console.error('ที่เก็บสำรองต้องอยู่นอกโฟลเดอร์โปรเจกต์ (repo เป็นสาธารณะ): '+OUT);process.exit(1);}

// ---- ที่อยู่ฐานข้อมูล + คีย์สาธารณะ (anon) อ่านจากโค้ดของแอปเอง ----
const qc=fs.readFileSync(path.join(ROOT,'qc.html'),'utf8');
const URL_=(qc.match(/https:\/\/[a-z0-9]+\.supabase\.co/)||[])[0], KEY=(qc.match(/eyJ[A-Za-z0-9_\-\.]+/)||[])[0];
if(!URL_||!KEY){console.error('หา URL/คีย์ Supabase ใน qc.html ไม่เจอ');process.exit(1);}
const H={apikey:KEY,Authorization:'Bearer '+KEY};

// ---- รายชื่อตาราง: สแกนจากโค้ดทุกไฟล์ ----
const tables=new Set();
fs.readdirSync(ROOT).filter(f=>/\.(html|js|gs|cjs|mjs)$/i.test(f)).forEach(f=>{
  const t=fs.readFileSync(path.join(ROOT,f),'utf8');
  for(const m of t.matchAll(/\.from\(\s*['"]([a-z_][a-z0-9_]*)['"]\s*\)/g)){
    const isStorage=t.slice(Math.max(0,m.index-12),m.index).includes('storage');
    if(!isStorage) tables.add(m[1]);
  }
});

const stamp=(()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'_'+p(d.getHours())+p(d.getMinutes());})();
const dataDir=path.join(OUT,'data',stamp),photoDir=path.join(OUT,'photos');
fs.mkdirSync(dataDir,{recursive:true});fs.mkdirSync(photoDir,{recursive:true});

async function fetchTable(t){
  const rows=[],PAGE=1000;
  for(let from=0;;from+=PAGE){
    let r=await fetch(URL_+'/rest/v1/'+t+'?select=*&order=id.asc',{headers:{...H,Range:from+'-'+(from+PAGE-1)}});
    if(r.status===400) r=await fetch(URL_+'/rest/v1/'+t+'?select=*',{headers:{...H,Range:from+'-'+(from+PAGE-1)}});   // ตารางที่ไม่มีคอลัมน์ id
    if(!(r.status===200||r.status===206)){const e=await r.text();throw new Error(r.status+' '+e.slice(0,160));}
    const part=await r.json();rows.push(...part);
    if(part.length<PAGE)break;
  }
  return rows;
}

(async()=>{
  console.log('สำรองไปที่ '+OUT+'\nตาราง '+tables.size+' ตาราง จาก '+URL_.replace('https://','')+'\n');
  const manifest={started:new Date().toISOString(),supabase:URL_,tables:{},photos:{}};
  const photoUrls=new Set();
  for(const t of [...tables].sort()){
    try{
      const rows=await fetchTable(t);
      const text=JSON.stringify(rows);
      fs.writeFileSync(path.join(dataDir,t+'.json'),JSON.stringify(rows,null,1));
      manifest.tables[t]={rows:rows.length};
      for(const m of text.matchAll(/https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/[a-z0-9_-]+\/[^"'\s\\]+/g)) photoUrls.add(m[0]);
      console.log('  ✔ '+t.padEnd(32)+rows.length+' แถว');
    }catch(e){
      manifest.tables[t]={error:String(e.message||e)};
      console.log('  ✘ '+t.padEnd(32)+(e.message||e));
    }
  }
  // ---- รูปถ่าย ----
  let ok=0,skip=0,fail=0,bytes=0;const urls=[...photoUrls];
  console.log('\nรูปที่อ้างอิงในข้อมูล '+urls.length+' รูป');
  let idx=0;
  async function worker(){
    while(idx<urls.length){
      const u=urls[idx++];
      const rel=decodeURIComponent(u.split('/storage/v1/object/public/')[1]);
      const dest=path.join(photoDir,rel);
      if(fs.existsSync(dest)){skip++;continue;}
      try{
        const r=await fetch(u);if(!r.ok)throw new Error(r.status);
        const buf=Buffer.from(await r.arrayBuffer());
        fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,buf);ok++;bytes+=buf.length;
      }catch(e){fail++;(manifest.photos.failed=manifest.photos.failed||[]).push({url:u,error:String(e.message||e)});}
    }
  }
  await Promise.all(Array.from({length:6},worker));
  manifest.photos={...manifest.photos,referenced:urls.length,downloaded:ok,alreadyHad:skip,failed_count:fail,bytes_downloaded:bytes};
  manifest.finished=new Date().toISOString();
  fs.writeFileSync(path.join(dataDir,'manifest.json'),JSON.stringify(manifest,null,1));
  const errs=Object.entries(manifest.tables).filter(([,v])=>v.error).length;
  console.log('รูปใหม่ '+ok+' · มีอยู่แล้ว '+skip+' · โหลดไม่ได้ '+fail+' · '+(bytes/1048576).toFixed(1)+' MB');
  console.log('\nเสร็จ: ตาราง '+(tables.size-errs)+'/'+tables.size+' ตาราง · รายละเอียดที่ '+path.join(dataDir,'manifest.json'));
  process.exit(errs||fail?2:0);
})();
