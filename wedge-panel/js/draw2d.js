// © 2569 นุกูล ยอดเทียน — สร้างเพื่อบริษัท ร่วมมิตรคอนกรีต(บางเลน) จำกัด สงวนลิขสิทธิ์ ใช้ภายในบริษัทเท่านั้น ห้ามคัดลอกหรือเผยแพร่โดยไม่ได้รับอนุญาต
// แบบ 2 มิติ (SVG) — คัดลอกจากต้นแบบ wedge-panel-designer.html ตัวเลขบนแบบเป็นเมตร 3 ตำแหน่ง
// ฟังก์ชันทั้งหมดคืนสตริง SVG/HTML ไม่แตะ DOM
import { WG, SHOULDER, PIPE_NAME as PN, barName as NM } from "./standards.js?v=20261111013440";
import { fmt, f2, f3 } from "./calc.js?v=20261111013440";

let o="";const A=s=>{o+=s};
const L=(x1,y1,x2,y2,c,w,da)=>A(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" style="stroke:${c||"var(--muted)"};stroke-width:${w||.6}${da?";stroke-dasharray:"+da:""}"/>`);
const TX=(x,y,t,an,rot,sz)=>A(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" style="fill:var(--muted);font-size:${sz||11}px;font-family:inherit;paint-order:stroke;stroke:var(--surface);stroke-width:3px;stroke-linejoin:round" text-anchor="${an||"middle"}" ${rot?`transform="rotate(-90 ${x.toFixed(1)} ${y.toFixed(1)})"`:""}>${t}</text>`);
const tick=(x,y)=>L(x-3,y+3,x+3,y-3,"var(--muted)",.9);
function dimLine(xa,xb,y,t,below){L(xa,y,xb,y);tick(xa,y);tick(xb,y);TX((xa+xb)/2,below?y+16:y-8,t)}
function chainH(pts,y,t){pts.forEach(([x,yr])=>{const sd=yr>y?1:-1;L(x,yr-sd*2,x,y-sd*3)});L(pts[0][0],y,pts[pts.length-1][0],y);pts.forEach(([x])=>tick(x,y));const tw=q=>String(q).length*6.3+6;for(let i=0;i<pts.length-1;i++){const w=pts[i+1][0]-pts[i][0],n=pts.length-2,c=(pts[i][0]+pts[i+1][0])/2;if(w>=tw(t[i])+8)TX(c,y-8,t[i]);else if(i>0&&i<n)TX(c,y+16,t[i]);else if(i===0){const x0=pts[0][0];L(x0-tw(t[i])-8,y,x0,y);TX(x0-5,y-4,t[i],"end")}else{const x1=pts[n+1][0];L(x1,y,x1+tw(t[i])+8,y);TX(x1+5,y-4,t[i],"start")}}}
function chainV(pts,x,t){const sd=x>pts[0][0]?1:-1;pts.forEach(([xr,y])=>L(xr+sd*3,y,x+sd*3,y));L(x,pts[0][1],x,pts[pts.length-1][1]);pts.forEach(([,y])=>tick(x,y));for(let i=0;i<pts.length-1;i++){const h=Math.abs(pts[i+1][1]-pts[i][1]),ym=(pts[i][1]+pts[i+1][1])/2;if(h>=40)TX(x+(sd>0?18:-10),ym,t[i],"middle",true);else TX(x+sd*12,ym+4,t[i],sd>0?"start":"end")}}
const poly=(pts,X,Y,st,fl,w)=>A(`<polygon points="${pts.map(q=>X(q[0]).toFixed(1)+","+Y(q[1]).toFixed(1)).join(" ")}" style="fill:${fl||"none"};stroke:${st||"var(--ink)"};stroke-width:${w||1.1}"/>`);
export function pilePoly(p){const b=p.B/2,m=b-p.f,h=p.c/2,w=p.tw/2,ch=10;return[[-b+ch,-b],[b-ch,-b],[b,-b+ch],[b,-m],[w,-h],[w,h],[b,m],[b,b-ch],[b-ch,b],[-b+ch,b],[-b,b-ch],[-b,m],[-w,h],[-w,-h],[-b,-m],[-b,-b+ch]]}
export function planTip(G){return G===WG.A?x=>[[x,-55],[x,-49.8],[x+65,-35],[x+65,35],[x,49.8],[x,55]]:x=>[[x,-50],[x+85,-25],[x+85,25],[x,50]]}
export function planPoly(G,Wb){const tr=planTip(G),R=tr(Wb/2),Lf=tr(0).map(q=>[-Wb/2-q[0],q[1]]);return [[-Wb/2,-G.T/2],...R,...Lf.slice().reverse()].filter(Boolean)}


export function jointSvg(st,gr){if(!gr)return{svg:"",note:""};
o="";const p=st.p,G=st.G,F=gr.F,b=p.B/2,cx=gr.cc/2,wf=cx-p.tw/2,pf=cx-b,te=wf-F.gr,m=b-p.f,tp=planTip(G);
const x0=te-G.TP-120,x1=cx+b,k=Math.min(2.2,480/(x1-x0)),X=x=>80+(x-x0)*k,Y=z=>62+(z+b)*k;
poly(pilePoly(p).map(q=>[q[0]+cx,q[1]]),X,Y,"var(--ink)","var(--surface-2)");L(X(cx),Y(-b)-6,X(cx),Y(b)+6,"var(--muted)",.5,"4 3");
const pts=[[x0+12,-G.T/2],...tp(te-G.TP),[x0+12,G.T/2]];A(`<polyline points="${pts.map(q=>X(q[0]).toFixed(1)+","+Y(q[1]).toFixed(1)).join(" ")}" style="fill:var(--concrete);stroke:var(--accent);stroke-width:1.3"/>`);
const bx=X(x0+12);A(`<polyline points="${bx},${Y(-G.T/2)-6} ${bx},${Y(-8)} ${bx-6},${Y(-2)} ${bx+6},${Y(4)} ${bx},${Y(10)} ${bx},${Y(G.T/2)+6}" style="fill:none;stroke:var(--muted);stroke-width:.8"/>`);
L(X(pf),Y(-m),X(pf),Y(m),"var(--muted)",.6,"3 3");
dimLine(X(te-G.TP),X(te),Y(-G.T/4),"ลิ่ม "+f3(G.TP));
const yc=Y(G.T/4);L(X(pf),yc,X(wf),yc);[pf,te,wf].forEach(x=>tick(X(x),yc));TX(X((pf+te)/2),yc-8,"เสียบ "+f3(F.ze));TX(X(wf)-6,yc+18,f3(F.gr),"end");
const xs=X(cx+b);chainV([[xs,Y(-m)],[xs,Y(m)]],xs+24,["ปาก "+f3(2*m)]);chainV([[X(cx+p.tw/2),Y(-p.c/2)],[X(cx+p.tw/2),Y(p.c/2)]],X(cx+p.tw/2)+30,["ก้น "+f3(p.c)]);chainV([[xs,Y(-b)],[xs,Y(b)]],xs+56,["กว้างหน้าตัดเสา "+f3(p.B)]);
chainV([[bx,Y(-G.T/2)],[bx,Y(G.T/2)]],bx-26,["หนา "+f3(G.T)]);
chainH([[X(cx-b),Y(-b)],[X(cx+b),Y(-b)]],Y(-b)-26,["กว้างหน้าตัดเสา "+f3(p.B)]);
const yb=Y(b)+22;chainH([[X(pf),Y(b)],[X(wf),Y(p.c/2)+4],[X(cx+p.tw/2),Y(p.c/2)+4]],yb,["ลึกร่อง "+f3(p.dg),"เอวเสา "+f3(p.tw)]);
const svg=`<svg viewBox="0 0 680 ${Math.ceil(yb+12)}" role="img" aria-label="รูปขยายรอยต่อเสากับแผ่น">${o}</svg>`;
const note=`${p.n} • กลาง/กลางเสา ${f2(gr.cc)} ม. → กว้างแผ่น ${f2(F.WT)} ม. (คำนวณได้ ${f2(F.raw)} ปัดลงทุก 0.01 ม.) ${gr.stk ? `• เผื่อค่าการทำงานแล้วข้างละ ${f3(Math.round(F.gr))} ม. ` : ""}• เสียบร่องข้างละ ${f3(Math.round(F.ze))} ม. • ช่องว่างปากร่อง ${f3(Math.round(F.cm))} ม./ข้าง • ปลายลิ่ม ${f3(Math.round(F.ct))} ม./ข้าง`;return{svg,note}}

function sec(G,W){return G===WG.A?[[0,0],[W,0],[W,5.2],[W+65,20],[W+65,90],[W,104.8],[W,110],[0,110],[0,104.8],[-65,90],[-65,20],[0,5.2]]:[[0,0],[W,0],[W+85,25],[W+85,75],[W,100],[0,100],[-85,75],[-85,25]]}
const near=(arr,v)=>arr.reduce((b,x,i)=>Math.abs(x-v)<Math.abs(arr[b]-v)?i:b,0);
export function svgSection(G,P,S,R){o="";const W=P.W,WT=P.WT,T=G.T,TP=G.TP,s=Math.min(430/WT,400/P.H),X=v=>95+(v+TP)*s,sy=Math.max(s,.6),Y=v=>80+(T-v)*sy;
poly(sec(G,W),X,Y,"var(--ink)","none",1.2);const yt=Y(T),yb=Y(0);
chainH([[X(-TP),Y(G.et)],[X(0),yt],[X(W),yt],[X(W+TP),Y(G.et)]],yt-18,[f3(TP),f3(W),f3(TP)]);chainH([[X(-TP),yt-18],[X(W+TP),yt-18]],yt-40,[f3(WT)]);chainV([[X(0),yt],[X(0),yb]],X(-TP)-30,[f3(T)]);chainV([[X(W),yt],[X(W+TP),Y(G.et)],[X(W+TP),Y(G.eb)],[X(W),yb]],X(W+TP)+22,[f3(T-G.et),f3(G.E),f3(G.eb)]);
if(R){const yH=30+S.dh/2,ym=30+S.dh+S.dv/2;L(X(P.x0),Y(yH),X(P.x1),Y(yH),"var(--rebar-2)",Math.max(1,S.dh*sy*.9));P.vx.forEach(x=>A(`<circle cx="${X(x).toFixed(1)}" cy="${Y(ym).toFixed(1)}" r="${Math.max(1.8,S.dv/2*sy)}" style="fill:var(--rebar)"/>`));
const ty=yb+22,i0=near(P.vx,W/2),mx=P.vx[i0];A(`<polyline points="${X(mx)},${Y(ym)} ${X(mx)},${ty+14} ${X(mx)+16},${ty+14}" style="fill:none;stroke:var(--muted);stroke-width:.6"/>`);TX(X(mx)+20,ty+18,`V-bar ${P.nv}-${NM(S.dv)} @${f3(P.am).slice(1)} ม.`,"start");
const hx=X((P.vx[Math.max(0,i0-2)]+P.vx[Math.max(1,i0-1)])/2);A(`<polyline points="${hx},${Y(yH)} ${hx},${ty+40} ${hx+16},${ty+40}" style="fill:none;stroke:var(--muted);stroke-width:.6"/>`);TX(hx+20,ty+44,`H-bar ${P.nh}-${NM(S.dh)} @${f3(P.ah).slice(1)} ม.`,"start");TX(X(-TP),ty+68,`เหล็กสูงจากท้องแบบ 0.030 ม. • ปลายเหล็กทุกเส้นระยะหุ้ม ${f3(S.cv)} ม. • เหล็กเส้นริมเลยจุดผูก ${f3(S.oh)} ม.`,"start")}
return `<svg viewBox="0 0 680 ${Math.ceil(yb+(R?96:20))}" role="img" aria-label="รูปตัดแผ่น">${o}</svg>`}
export function svgElev(G,P,S,R,dimP){o="";const W=P.W,WT=P.WT,H=P.H,TP=G.TP,s=Math.min(430/WT,400/H),X2=v=>95+(v+TP)*s,Y2=v=>60+(H-v)*s,top=Y2(H),bot=Y2(0),cv=S.cv;
A(`<rect x="${X2(-TP)}" y="${top}" width="${WT*s}" height="${H*s}" style="fill:none;stroke:var(--ink);stroke-width:1.2"/>`);L(X2(0),top,X2(0),bot,"var(--ink)",.9);L(X2(W),top,X2(W),bot,"var(--ink)",.9);
chainH([[X2(-TP),top],[X2(0),top],[X2(W),top],[X2(W+TP),top]],top-16,[f3(TP),f3(W),f3(TP)]);chainH([[X2(-TP),top-16],[X2(W+TP),top-16]],top-38,[f3(WT)]);chainV([[X2(-TP),top],[X2(-TP),bot]],X2(-TP)-24,[f3(H)]);
let vb=bot;const PP=P.pipe;
if(S.pd&&PP.P.length){const pr=Math.max(3.5,S.pd/2*s);PP.P.forEach(([x,y])=>{A(`<circle cx="${X2(x)}" cy="${Y2(y)}" r="${pr}" style="fill:none;stroke:var(--pipe);stroke-width:1.1"/>`);L(X2(x)-pr-3,Y2(y),X2(x)+pr+3,Y2(y),"var(--pipe)",.5);L(X2(x),Y2(y)-pr-3,X2(x),Y2(y)+pr+3,"var(--pipe)",.5)});
const y0=PP.ys[0];if(dimP){const xp=[[X2(-TP),bot],...PP.xs.map(x=>[X2(x),Y2(y0)+pr]),[X2(W+TP),bot]];const tx=[];for(let i=0;i<xp.length-1;i++){const a=i===0?-TP:PP.xs[i-1],b=i===xp.length-2?W+TP:PP.xs[i];tx.push(f3(b-a))}chainH(xp,bot+20,tx);
const xr=PP.xs[PP.xs.length-1],yp=[[X2(W+TP),bot],...PP.ys.map(y=>[X2(xr)+pr,Y2(y)]),[X2(W+TP),top]],ty=[];for(let j=0;j<yp.length-1;j++){const a=j===0?0:PP.ys[j-1],b=j===yp.length-2?H:PP.ys[j];ty.push(f3(b-a))}chainV(yp,X2(W+TP)+28,ty);vb=bot+20}
const x=X2(PP.xs[0]),ly=vb+(dimP?26:30);L(x,dimP?bot+23:Y2(y0)+pr,x,ly);L(x,ly,x-16,ly);TX(x-20,ly+4,`ท่อ PVC Ø${PN[S.pd]} × ${PP.P.length} จุด`,"end");vb=ly+14}
const labs=[];if(R){P.hy.forEach(y=>L(X2(P.x0),Y2(y),X2(P.x1),Y2(y),"var(--rebar-2)",1));P.vx.forEach(x=>L(X2(x),Y2(cv),X2(x),Y2(H-cv),"var(--rebar)",1.1));
const jc=near(P.hy,H/2),ic=near(P.vx,W/2),hxp=(P.vx[Math.min(ic+1,P.vx.length-2)]+P.vx[Math.min(ic+2,P.vx.length-1)])/2;labs.push([`H-bar ${P.nh}-${NM(S.dh)} @${f3(P.ah).slice(1)} ม.`,X2(hxp),Y2(P.hy[jc])]);
const j2=jc>0?jc-1:jc+1;labs.push([`V-bar ${P.nv}-${NM(S.dv)} @${f3(P.am).slice(1)} ม.`,X2(P.vx[ic]),Y2((P.hy[jc]+P.hy[j2])/2)])}
const rx=X2(W+TP)+22;labs.sort((a,b)=>a[2]-b[2]);let last=-1e9;labs.forEach(l=>{l[3]=Math.max(l[2],last+22);last=l[3]});
labs.forEach(([t,x,y,ly])=>{A(`<polyline points="${x.toFixed(1)},${y.toFixed(1)} ${(rx-14).toFixed(1)},${y.toFixed(1)} ${(rx-4).toFixed(1)},${ly.toFixed(1)} ${rx.toFixed(1)},${ly.toFixed(1)}" style="fill:none;stroke:var(--muted);stroke-width:.6"/>`);A(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" style="fill:var(--muted)"/>`);TX(rx+4,ly+4,t,"start")});
vb=Math.max(vb,last+10);return `<svg viewBox="0 0 680 ${Math.ceil(vb+10)}" role="img" aria-label="รูปด้านแผ่น">${o}</svg>`}
export function panelSheet(it,st,cust){const G=st.G,P=it.P,S=st.S;return `<p class="cap">รูปตัดแผ่นกันดิน</p>${svgSection(G,P,S,false)}<p class="cap">รูปตัดแผ่นกันดิน (แสดงเหล็กเสริม)</p>${svgSection(G,P,S,true)}<p class="cap">รูปด้านแผ่นกันดิน (ระยะท่อ)</p>${svgElev(G,P,S,false,true)}<p class="cap">รูปด้านแผ่นกันดิน (แสดงเหล็กเสริม)</p>${svgElev(G,P,S,true,false)}
<div class="tb"><span>รหัส <b>${it.code}</b></span><span>${st.p.n} • หัวลิ่มแบบ ${st.p.ty}</span><span>คอนกรีต ${P.vol.toFixed(3)} ลบ.ม. • เหล็ก ${P.kg.toFixed(1)} กก. • หนัก ${fmt(P.wt)} กก.</span><span class="stamp ${S.sp?"sp":"std"}">${S.sp?"สั่งพิเศษ":"มาตรฐานบริษัท"}</span></div>${S.sp&&S.note?`<p class="hint">รายละเอียดพิเศษ: ${esc(S.note)}</p>`:""}${cust===undefined?"":confirmBox(cust)}`}
export function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}

// ช่องลูกค้ายืนยันการผลิตท้ายแบบแผ่น (บรรทัดเดียว มีแค่ชื่อลูกค้า) cust = ชื่อลูกค้า ว่างได้
export function confirmBox(cust){
  const nm=String(cust||"").trim()?esc(String(cust).trim()):"................................";
  return `<div style="margin-top:12px;border:1px solid #CDD3CF;border-radius:6px;padding:8px 12px;display:flex;align-items:flex-end;gap:16px;font-size:13px;page-break-inside:avoid"><div style="white-space:nowrap"><b>ลูกค้ายืนยันการผลิต</b><br><span style="font-size:12px;color:#5B6964">ตามแบบนี้</span></div><div style="flex:1;text-align:center"><div style="border-bottom:1px solid #1D2725;height:30px"></div>( ${nm} )</div><div style="white-space:nowrap">วันที่ ........./........./.........</div></div>`;
}

// หมายเหตุใต้ภาพ 3 มิติ (เฉพาะโหมดสั่งตามจำนวนแผ่น): แผ่นกว้างที่ลูกค้าแจ้ง เสียบเสาเข็มแล้วได้ระยะกลาง/กลางเสาที่แนะนำเท่าไร
export function remark3d(st,gr){
  if(!st||!st.direct||!gr)return "";
  return `<p style="font-size:13px;margin:8px 0 0"><b>หมายเหตุ:</b> แผ่นกว้าง ${f2(gr.F.WT)} ม. เมื่อเสียบเสาเข็ม ${st.p.n} จะได้ระยะกลาง/กลางเสาที่แนะนำ ${f2(gr.cc)} ม. (เผื่อค่าการทำงานแล้วข้างละ ${f3(st.g)} ม.)</p>`;
}

// หมายเหตุบ่ารองรับแผ่น (ใต้ภาพ 3 มิติ / หน้า 3 มิติใน PDF) d = ข้อมูลฟอร์ม (shOn, shMode, shDrop มม.)
export function shoulderRemark(st,gr,d){
  if(!d||!d.shOn||!gr)return "";
  const Ht=(gr.stk||st.stk).reduce((a,b)=>a+b,0),drop=d.shMode==="drop"?(+d.shDrop||0):0;
  const top=drop?`ด้านบนแผ่นลงมาจากหัวเข็ม ${f2(drop)} ม. + ความสูงแผ่น ${f2(Ht)} ม.`:`ด้านบนแผ่นเสมอหัวเข็ม • ความสูงแผ่น ${f2(Ht)} ม.`;
  return `<p style="font-size:13px;margin:8px 0 0"><b>บ่ารองรับแผ่น:</b> หน้าบ่าอยู่ต่ำจากหัวเข็ม ${f2(Ht+drop)} ม. (${top}) • บ่ายาว ${f2(SHOULDER.flat)} ม. + ส่วนเรียว ${f2(SHOULDER.taper)} ม.</p>`;
}
