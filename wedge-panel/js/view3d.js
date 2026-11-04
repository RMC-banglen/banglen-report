// ภาพ 3 มิติ (three.js r128): เสา 2 ต้นกับแผ่นซ้อน และโต๊ะหล่อ — คัดลอกจากต้นแบบ
// ใช้ผ่าน createViews({ $, getState }) ต้องโหลด three.js เป็น global (THREE) ก่อน
import { SHOULDER } from "./standards.js?v=20261104053849";
import { f2, f3, fmt } from "./calc.js?v=20261104053849";
import { pilePoly, planPoly } from "./draw2d.js?v=20261104053849";

export function createViews({ $, getState }) {
const THREE = window.THREE;
const v3=$("v3");let ren=null,sc,cam,root,th=-.6,ph=1.05,r=3,R0=3,showP=true,pileObjs=[],shOn=false,shDrop=0;const tg=new THREE.Vector3();
function init3d(){if(ren)return;ren=new THREE.WebGLRenderer({antialias:true,alpha:true});ren.setPixelRatio(Math.min(devicePixelRatio,2));ren.setSize(v3.clientWidth,v3.clientHeight);v3.appendChild(ren.domElement);
sc=new THREE.Scene();cam=new THREE.PerspectiveCamera(38,v3.clientWidth/v3.clientHeight,.005,100);sc.add(new THREE.AmbientLight(0xffffff,.6));const l1=new THREE.DirectionalLight(0xffffff,.75);l1.position.set(3,6,4);sc.add(l1);const l2=new THREE.DirectionalLight(0xffffff,.35);l2.position.set(-4,-2,-3);sc.add(l2);root=new THREE.Group();sc.add(root);
const pts=new Map();let pd=0;const ce=ren.domElement;ce.style.touchAction="none";
ce.addEventListener("pointerdown",e=>{ce.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pts.size===2){const a=[...pts.values()];pd=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)}});
ce.addEventListener("pointermove",e=>{if(!pts.has(e.pointerId))return;const q=pts.get(e.pointerId);if(pts.size===1){th-=(e.clientX-q.x)*.008;ph-=(e.clientY-q.y)*.008}pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pts.size===2){const a=[...pts.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pd)r*=pd/d;pd=d}upd()});
const end=e=>{pts.delete(e.pointerId);pd=0};ce.addEventListener("pointerup",end);ce.addEventListener("pointercancel",end);
ce.addEventListener("wheel",e=>{e.preventDefault();r*=1+Math.sign(e.deltaY)*.08;upd()},{passive:false});
new ResizeObserver(()=>{if(!v3.clientWidth)return;ren.setSize(v3.clientWidth,v3.clientHeight);cam.aspect=v3.clientWidth/v3.clientHeight;cam.updateProjectionMatrix();upd()}).observe(v3)}
function upd(){if(!ren)return;ph=Math.max(.05,Math.min(1.6,ph));r=Math.max(.2,Math.min(30,r));cam.position.set(tg.x+r*Math.sin(ph)*Math.sin(th),tg.y+r*Math.cos(ph),tg.z+r*Math.sin(ph)*Math.cos(th));cam.lookAt(tg);ren.render(sc,cam)}
const K=.001;function ext(pts,h,y0,col,op){const s=new THREE.Shape();pts.forEach((q,i)=>i?s.lineTo(q[0]*K,q[1]*K):s.moveTo(q[0]*K,q[1]*K));const m=new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth:h*K,bevelEnabled:false}),new THREE.MeshLambertMaterial({color:col,transparent:op<1,opacity:op,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.y=y0*K;const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry,25),new THREE.LineBasicMaterial({color:0x5F5E5A}));e.rotation.copy(m.rotation);e.position.copy(m.position);root.add(m);root.add(e)}
function taper3d(cx,sg,b,m,w,hh,SF,ST){const V=[[b,-m,-SF],[w,-hh,-SF],[w,hh,-SF],[b,m,-SF],[w,-hh,-SF-ST],[w,hh,-SF-ST]].map(([x,z,y])=>new THREE.Vector3((cx+sg*x)*K,y*K,z*K));const g=new THREE.BufferGeometry().setFromPoints(V);g.setIndex([0,3,5,0,5,4,0,1,4,3,2,5]);g.computeVertexNormals();root.add(new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:0xBEBBB0,side:THREE.DoubleSide})))}
function holeAt(x,y,rad,T){const m=new THREE.Mesh(new THREE.CylinderGeometry(rad*K,rad*K,(T+3)*K,28),new THREE.MeshLambertMaterial({color:0x26323A}));m.rotation.x=Math.PI/2;m.position.set(x*K,y*K,0);root.add(m)}
function line3d(pts){const g=new THREE.BufferGeometry().setFromPoints(pts.map(p=>new THREE.Vector3(p[0]*K,p[1]*K,p[2]*K)));const l=new THREE.Line(g,new THREE.LineBasicMaterial({color:0x5B6964,depthTest:false}));l.renderOrder=9;root.add(l)}
function label3d(t,x,y,z,S){const ls=String(t).split("\n"),n=ls.length,c=document.createElement("canvas"),fz=44,fnt="500 "+fz+"px Tahoma,sans-serif";let ctx=c.getContext("2d");ctx.font=fnt;const w=Math.ceil(Math.max(...ls.map(q=>ctx.measureText(q).width)))+48;c.width=w;c.height=n*(fz+14)+8;ctx=c.getContext("2d");ctx.fillStyle="#ffffff";ctx.fillRect(0,0,w,c.height);ctx.strokeStyle="#8A9691";ctx.lineWidth=3;ctx.strokeRect(1.5,1.5,w-3,c.height-3);ctx.font=fnt;ctx.fillStyle="#1D2725";ctx.textBaseline="middle";ls.forEach((q,i)=>ctx.fillText(q,24,4+(i+.5)*(fz+14)+2));
const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false}));sp.renderOrder=10;sp.scale.set(S*n*w/c.height,S*n,1);sp.position.set(x*K,y*K,z*K);root.add(sp)}
function build3d(gi=0){init3d();const st=getState(),gr=st.groups[gi];sc.remove(root);root.traverse(q=>{if(q.geometry)q.geometry.dispose()});root=new THREE.Group();sc.add(root);if(!gr){upd();return}
const stkX=gr.stk||st.stk,p=st.p,G=st.G,Wb=gr.F.WT-2*G.TP,Ht=stkX.reduce((a,b)=>a+b,0)||1000,pp=pilePoly(p);
const n0=root.children.length;
const SF=SHOULDER.flat,ST=SHOULDER.taper,piH=shOn?Ht+shDrop+SF+ST+300:Ht+300,piY=shOn?-(SF+ST+300):-300;
[-gr.cc/2,gr.cc/2].forEach(cx=>ext(pp.map(q=>[q[0]+cx,q[1]]),piH,piY,0xD3D1C7,1));
if(shOn){const sb=p.B/2,sm=sb-p.f,sw=p.tw/2,sh=p.c/2;[[-gr.cc/2,1],[gr.cc/2,-1]].forEach(([cx,sg])=>{ext([[cx+sg*sb,-sm],[cx+sg*sw,-sh],[cx+sg*sw,sh],[cx+sg*sb,sm]],SF,-SF,0xBEBBB0,1);taper3d(cx,sg,sb,sm,sw,sh,SF,ST)})} // บ่าในร่องเสา: ก้อนเต็มร่อง + ส่วนเรียวด้านล่าง
const SZ=Math.max(gr.cc,Ht)*K*.08,hd=(shOn?Ht+shDrop:Ht),yd=Math.max(Ht+460,hd+160),tk=40;[-gr.cc/2,gr.cc/2].forEach(x=>{line3d([[x,hd+20,0],[x,yd+50,0]]);line3d([[x-tk,yd-tk,0],[x+tk,yd+tk,0]])});line3d([[-gr.cc/2,yd,0],[gr.cc/2,yd,0]]);const ccT="กลาง/กลางเสา"+(gr.stk?"ที่แนะนำ ":" ")+f3(gr.cc)+" ม.";if(gr.stk)label3d(ccT+"\nเผื่อค่าการทำงานแล้วข้างละ "+f3(Math.round(gr.F.gr))+" ม.",0,yd+230+SZ*.8/K,0,SZ*.8);else label3d(ccT,0,yd+SZ/K/2+230,0,SZ);
pileObjs=root.children.slice(n0);pileObjs.forEach(o=>{o.visible=showP}); // เสา + เส้นระยะกลาง/กลางเสา ซ่อนได้
label3d("กว้างแผ่น "+f3(gr.F.WT)+" ม.",0,Ht+SZ*.85/K/2+110,0,SZ*.85);
let y=0;const shade=[0x9FE1CB,0x7FD3B6];stkX.slice().reverse().forEach((h,i)=>{ext(planPoly(G,Wb),h-2,y,shade[i%2],.93);const it=st.list.find(q=>q.H===h&&q.WT===gr.F.WT),pp2=it&&it.P&&it.P.pipe;if(pp2&&pp2.P.length&&st.S.pd)pp2.P.forEach(([px,py])=>holeAt(px-Wb/2,y+py,st.S.pd/2,G.T));y+=h});
tg.set(0,(shOn?Ht+320:Ht+620)/2*K,0);R0=Math.max(gr.cc+p.B,shOn?Ht+1350:Ht+1250)*K*1.75;r=R0;upd()}
$("b3p").onclick=()=>{showP=!showP;pileObjs.forEach(o=>{o.visible=showP});$("b3p").textContent=showP?"ซ่อนเสา":"แสดงเสา";upd()};
$("b3a").onclick=()=>{th=-.6;ph=1.05;r=R0;upd()};$("b3t").onclick=()=>{th=0;ph=.06;r=R0*.9;upd()};$("b3f").onclick=()=>{th=0;ph=1.5;r=R0;upd()};
function snapshot(gi){const W2=1400,H2=820;init3d();const keepP=showP;showP=true;build3d(gi);showP=keepP;
const r2=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r2.setPixelRatio(1);r2.setSize(W2,H2);r2.setClearColor(0xffffff,1);const c2=new THREE.PerspectiveCamera(38,W2/H2,.005,100);
const a=-.6,b=1.05,rr=R0*1.05;c2.position.set(tg.x+rr*Math.sin(b)*Math.sin(a),tg.y+rr*Math.cos(b),tg.z+rr*Math.sin(b)*Math.cos(a));c2.lookAt(tg);r2.render(sc,c2);
const img=r2.domElement.toDataURL("image/jpeg",.9);r2.dispose();th=-.6;ph=1.05;r=R0;upd();return img}
const TV=(function(){
const KK=.001,RHSC=0x0F6E56,FBC=0x5DCAA5,HBC=0x378ADD,PSTC=0x085041,AGL=0x3B6D11,RED=0xE24B4A,CAP=0x04342C,PAC=0xD4537E,PBC=0x7F77DD,SLT=0xBA7517,BRC=0x185FA5;
const rect=(u0,u1,v0,v1)=>[[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
const boxU=a=>[rect(a,a+4.5,0,100),rect(a+45.5,a+50,0,100),rect(a+4.5,a+45.5,0,4.5),rect(a+4.5,a+45.5,95.5,100)];
const angU=a=>[[a,0],[a+50,0],[a+50,5],[a+5,5],[a+5,50],[a,50]];
const RAIL={A:[[0,110],[70,94.1],[70,15.9],[0,0],[0,5.2],[65,20],[65,90],[0,104.8]],B:[[0,0],[17.7,0],[90,21.2],[90,78.8],[17.7,100],[0,100],[85,75],[85,25]]};
const RIB={A:H=>[[-H,110],[H,110],[H-70,94.1],[H-70,15.9],[H,0],[-H,0],[-(H-70),15.9],[-(H-70),94.1]],B:H=>[[-(H-17.7),100],[H-17.7,100],[H-90,78.8],[H-90,21.2],[H-17.7,0],[-(H-17.7),0],[-(H-90),21.2],[-(H-90),78.8]]};
const CLIP=[[106,13.5],[112,13.5],[119,10.5],[123,3],[123,-6],[119,-13],[112,-16],[90,-16],[76,-16],[71,-20],[71,-30],[71,-55]];
const SU=57,MU=160.5,MG=221,CS=55,HOLES=[-75,-25,25,75],BLK=23;
let ren=null,sc,cam,g3,th=-.7,ph=.95,rr=7,R0=7,showC=true,concs=[],secTh=0;const tg=new THREE.Vector3(),T0=new THREE.Vector3();const MM={};
const mat=c=>MM[c]||(MM[c]=new THREE.MeshLambertMaterial({color:c,side:THREE.DoubleSide}));
const cMat=new THREE.MeshLambertMaterial({color:0x9FE1CB,transparent:true,opacity:.8,side:THREE.DoubleSide});
function bx(g,x,z,w,d,y0,y1,c){const m=new THREE.Mesh(new THREE.BoxGeometry(w*KK,(y1-y0)*KK,d*KK),c.isMaterial?c:mat(c));m.position.set((x+w/2)*KK,(y0+y1)/2*KK,(z+d/2)*KK);g.add(m);return m}
function ex(g,pts,z0,len,c){const s=new THREE.Shape();pts.forEach((p,i)=>i?s.lineTo(p[0]*KK,p[1]*KK):s.moveTo(p[0]*KK,p[1]*KK));const m=new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth:len*KK,bevelEnabled:false}),c.isMaterial?c:mat(c));m.position.z=z0*KK;g.add(m);return m}
function cyl(g,r,h,x,y,z,c,seg){const m=new THREE.Mesh(new THREE.CylinderGeometry(r*KK,r*KK,h*KK,seg||14),mat(c));m.position.set(x*KK,y*KK,z*KK);g.add(m);return m}
function cylZ(g,r,len,x,y,zc,c){const m=cyl(g,r,len,x,y,zc,c,18);m.rotation.x=Math.PI/2;return m}
function cylX(g,r,len,xc,y,z,c){const m=cyl(g,r,len,xc,y,z,c,18);m.rotation.z=Math.PI/2;return m}
function tube(g,P){g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P,false,"catmullrom",.2),30,6*KK,8,false),mat(RED)))}
function clipAt(g,off,zl,dy){tube(g,CLIP.map(q=>new THREE.Vector3((q[0]+off)*KK,(q[1]+dy)*KK,zl*KK)))}
function lugAt(g,thk,zl){const l=new THREE.Mesh(new THREE.BoxGeometry(45*KK,10*KK,80*KK),mat(PBC));l.position.set((thk-22.5)*KK,-5*KK,zl*KK);g.add(l)}
function railT(P,fz,cd,x0,L){const g=new THREE.Group();if(cd>0){g.position.set(x0*KK,0,fz*KK);g.rotation.y=Math.PI/2}else{g.position.set((x0+L)*KK,0,fz*KK);g.rotation.y=-Math.PI/2}P.add(g);return g}
function side(G,ty,fz,cd,x0,L,bot,Tt){const zl=x=>cd>0?x-x0:x0+L-x,b=railT(G,fz,cd,x0,L);boxU(0).forEach(p=>ex(b,p,0,L,RHSC));ex(b,rect(0,50,0,100),0,6,CAP);ex(b,rect(0,50,0,100),L-6,6,CAP);if(ty==="A")ex(b,rect(0,50,100,110),0,L,FBC);
ex(b,angU(50),0,L,AGL);ex(b,rect(64,114,Tt-10,Tt),0,L,SLT);const sp=[];for(let p=75;p<L;p+=150){ex(b,bot?rect(50,114,50,Tt-10):rect(50,114,66,Tt-10),p-3,6,SLT);sp.push(cd>0?x0+p:x0+L-p)}
return{zl,sp,g:b}}
function wedge(G,ty,TD,fx,cd,z0,H,bot){const g=new THREE.Group();g.position.set(fx*KK,0,z0*KK);if(cd>0)g.scale.x=-1;G.add(g);ex(g,RAIL[ty],0,H,0x888780);boxU(TD).forEach(p=>ex(g,p,0,H,RHSC));if(ty==="A")ex(g,rect(TD,TD+50,100,110),0,H,FBC);ex(g,rect(TD,TD+50,0,100),0,6,CAP);ex(g,rect(TD,TD+50,0,100),H-6,6,CAP);if(bot)ex(g,angU(TD+50),0,H,AGL);return g}
function post(g,cx,zf,dir,Tt){const za=dir>0?zf+9:zf-59,zw=dir>0?zf+9:zf-14;bx(g,cx-70,zw,140,5,0,Tt,PSTC);bx(g,cx-70,za,5,50,0,Tt,PSTC);bx(g,cx+65,za,5,50,0,Tt,PSTC)}
function divider(G,ty,TC,xL,z0,H,Tt){const HD=TC/2,cx=xL+HD;const a=new THREE.Group();a.position.set(xL*KK,0,z0*KK);G.add(a);ex(a,RAIL[ty],0,H,0x888780);const b=new THREE.Group();b.position.set((xL+TC)*KK,0,z0*KK);b.scale.x=-1;G.add(b);ex(b,RAIL[ty],0,H,0x888780);
const nr=Math.max(2,Math.ceil((H-9)/500)+1),rib=RIB[ty](HD).map(p=>[p[0]+cx,p[1]]);for(let i=0;i<nr;i++)ex(G,rib,z0+i*(H-9)/(nr-1),9,0xEF9F27);post(G,cx,z0,1,Tt);post(G,cx,z0+H,-1,Tt);return nr}
function bolt(g,x,zf,dir,top,Tt){const z=zf-dir*SU;cyl(g,10,8,x,top+4,z,BRC,6);cyl(g,6,top-Tt+20,x,(top+Tt-20)/2,z,0xB4B2A9);bx(g,x-20,dir>0?zf-80:zf+50,40,30,Tt-16,Tt-10,BRC);cyl(g,10,8,x,Tt-20,z,BRC,6)}
function joint(G,cx,wA,zf,dir,sp,Tt){const PY=Tt+22,zA0=dir>0?zf+15:zf-105;bx(G,cx-wA/2,zA0,wA,90,Tt,Tt+10,PAC);[28,64].forEach(o=>{const zc=zf+dir*o;bx(G,cx-22,zc-10,44,20,Tt+10,PY,PAC);cylZ(G,18,20,cx,PY,zc,PAC)});
const zB0=dir>0?zf-120:zf+10;bx(G,cx-105,zB0,210,110,Tt,Tt+10,PBC);bx(G,cx-22,zf-12,44,24,Tt+10,PY,PBC);cylZ(G,18,24,cx,PY,zf,PBC);
const ok=HOLES.map(o=>cx+o).filter(h=>!sp.some(s=>Math.abs(h-s)<BLK)),use=ok.length>=2?[ok[0],ok[ok.length-1]]:ok;use.forEach(x=>bolt(G,x,zf,dir,Tt+10,Tt));
cylZ(G,10,100,cx,PY,zf+dir*25,RED);cylX(G,10,45,cx-22,PY,zf-dir*25,RED)}
function magnet(G,zf,xc,Tt){const mc=zf+MU;bx(G,xc-160,mc-60,320,120,0,60,0x444441);cyl(G,31.5,35,xc,77,mc,0xD3D1C7);cyl(G,10,4,xc,96,mc,RED);
[xc-135,xc+135].forEach(ax=>{bx(G,ax-25,zf+40,50,140,Tt+21,Tt+25,BRC);bx(G,ax-25,zf+40,5,140,Tt,Tt+21,BRC);bx(G,ax+20,zf+40,5,140,Tt,Tt+21,BRC);cyl(G,15,Tt-60,ax,(Tt+60)/2,mc,0x888780);cyl(G,13,8,ax,Tt+29,mc,RED,6);bolt(G,ax,zf,-1,Tt+25,Tt)})}
function hX(G,x0,x1,ze,dir){const z=dir>0?ze:ze-75;bx(G,x0,z,x1-x0,75,-16,-9,HBC);bx(G,x0,z+35,x1-x0,5,-159,-16,HBC);bx(G,x0,z,x1-x0,75,-166,-159,HBC)}
function hZ(G,z0,z1,xe,dir){const x=dir>0?xe:xe-75;bx(G,x,z0,75,z1-z0,-16,-9,HBC);bx(G,x+35,z0,5,z1-z0,-159,-16,HBC);bx(G,x,z0,75,z1-z0,-166,-159,HBC)}
function upd(){if(!ren)return;ph=Math.max(.05,Math.min(1.6,ph));rr=Math.max(.12,Math.min(30,rr));cam.position.set(tg.x+rr*Math.sin(ph)*Math.sin(th),tg.y+rr*Math.cos(ph),tg.z+rr*Math.sin(ph)*Math.cos(th));cam.lookAt(tg);ren.render(sc,cam)}
function init(){if(ren)return;const host=$("vT");ren=new THREE.WebGLRenderer({antialias:true,alpha:true});ren.setPixelRatio(Math.min(devicePixelRatio,2));ren.setSize(host.clientWidth,host.clientHeight);host.appendChild(ren.domElement);
sc=new THREE.Scene();cam=new THREE.PerspectiveCamera(40,host.clientWidth/host.clientHeight,.003,200);sc.add(new THREE.AmbientLight(0xffffff,.62));const l1=new THREE.DirectionalLight(0xffffff,.7);l1.position.set(4,8,5);sc.add(l1);const l2=new THREE.DirectionalLight(0xffffff,.35);l2.position.set(-5,-2,-4);sc.add(l2);g3=new THREE.Group();sc.add(g3);
const pts=new Map();let pd=0;const ce=ren.domElement;ce.style.touchAction="none";
ce.addEventListener("pointerdown",e=>{ce.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pts.size===2){const a=[...pts.values()];pd=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)}});
ce.addEventListener("pointermove",e=>{if(!pts.has(e.pointerId))return;const q=pts.get(e.pointerId);if(pts.size===1){th-=(e.clientX-q.x)*.008;ph-=(e.clientY-q.y)*.008}pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pts.size===2){const a=[...pts.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pd)rr*=pd/d;pd=d}upd()});
const end=e=>{pts.delete(e.pointerId);pd=0};ce.addEventListener("pointerup",end);ce.addEventListener("pointercancel",end);ce.addEventListener("wheel",e=>{e.preventDefault();rr*=1+Math.sign(e.deltaY)*.08;upd()},{passive:false});
new ResizeObserver(()=>{if(!host.clientWidth)return;ren.setSize(host.clientWidth,host.clientHeight);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();upd()}).observe(host);
$("tA").onclick=()=>{rr=R0;th=-.7;ph=.95;tg.copy(T0);upd()};$("tT").onclick=()=>{rr=R0*.6;th=0;ph=.06;tg.copy(T0);upd()};$("tE").onclick=()=>{rr=R0*.5;th=0;ph=1.5;tg.copy(T0);upd()};
$("tC").onclick=()=>{showC=!showC;concs.forEach(m=>m.visible=showC);$("tC").textContent=showC?"ซ่อนคอนกรีต":"แสดงคอนกรีต";upd()};
$("selT").onchange=build;$("tR").onchange=build}
function build(){init();const st=getState(),it=st.list.find(i=>i.code===$("selT").value)||st.list[0];sc.remove(g3);g3.traverse(o=>{if(o.geometry)o.geometry.dispose()});g3=new THREE.Group();sc.add(g3);concs=[];
if(!it){$("tInfo").textContent="ยังไม่มีรายการแผ่น";upd();return}
const G=st.G,ty=st.p.ty,Tt=G.T,TD=G.TD,TC=G.TC,WB=TD+50,CE=WB+5,TL=6096,TW=1524,LF=6000,TDV=60,H=it.H,W=it.WT-2*G.TP,multi=$("tR").checked;
const x0L=CE-WB,xeMax=x0L+LF-WB;let R=1;if(multi){while(CS+(R+1)*H+R*TDV+MG<=TW)R++}const sideW=CS+R*H+(R-1)*TDV;const n=Math.floor((xeMax-CE+TC)/(W+TC));
bx(g3,0,0,TL,TW,-9,0,0x5F5E5A);hX(g3,0,TL,0,1);hX(g3,0,TL,TW,-1);hZ(g3,0,TW,0,1);hZ(g3,0,TW,TL,-1);
if(sideW+MG>TW||n<1){$("tInfo").textContent="แผ่นนี้วางบนโต๊ะ 5×20 ฟุตไม่ได้";frame();return}
const xe=CE+n*W+(n-1)*TC;const A=side(g3,ty,CS,1,x0L,LF,true,Tt);
for(let x=198;x<TL;x+=600){if(x<x0L+40||x>x0L+LF-40)continue;clipAt(A.g,-10,A.zl(x),-2.5);lugAt(A.g,100,A.zl(x))}
const zM=sideW,B=side(g3,ty,zM,-1,x0L,LF,false,Tt);const ends=[];
for(let k=0;k<R;k++){const z0=CS+k*(H+TDV);const w=wedge(g3,ty,TD,CE,1,z0,H,true);const ncl=H>750?2:1;for(let i=0;i<ncl;i++){const zl=H*(i+.5)/ncl;clipAt(w,TD-20,zl,-2.5);lugAt(w,TD+100,zl)}
for(let i=0;i<n;i++){const xa=CE+i*(W+TC),xb=xa+W;const P=[[xa,0],[xb,0],...G.tipR(xb),[xb,Tt],[xa,Tt],...G.tipL(xa)];const m=ex(g3,P,z0,H,cMat);m.visible=showC;concs.push(m);if(i<n-1){divider(g3,ty,TC,xb,z0,H,Tt);if(k===0)ends.push([xb+TC/2,150])}}
wedge(g3,ty,TD,xe,-1,z0,H,false);if(k===0)ends.push([xe+WB/2,WB]);if(k<R-1){bx(g3,CE-55,z0+H,xe-CE+110,TDV,0,100,RHSC);if(ty==="A")bx(g3,CE-55,z0+H,xe-CE+110,TDV,100,110,FBC)}}
ends.forEach(([cx,w])=>{joint(g3,cx,w,CS,1,A.sp,Tt);joint(g3,cx,w,zM,-1,B.sp,Tt);for(let k=0;k<R-1;k++){const z0=CS+k*(H+TDV);bx(g3,cx-w/2,z0+H-60,w,TDV+120,Tt,Tt+8,PAC)}});
const blocks=ends.map(([cx])=>[cx-105,cx+105]),mags=[];[1000,3000,5000].forEach(p=>{const want=x0L+p;for(let d=0;d<=900;d+=5){let got=null;for(const s of [1,-1]){const x=want+s*d;if(x-190<x0L||x+190>x0L+LF)continue;if(blocks.concat(mags.map(m=>[m-200,m+200])).some(([a,b])=>x+165>a-10&&x-165<b+10))continue;if([x-135,x+135].some(a=>B.sp.some(q=>Math.abs(a-q)<BLK)))continue;got=x;break}if(got!==null){mags.push(got);magnet(g3,zM,got,Tt);break}}});
$("tInfo").textContent=`${it.code} • ${R} แถว × ${n} แผ่น = ${R*n} แผ่น/โต๊ะ/รอบ • หัวลิ่มแบบ ${ty} • แม่เหล็ก ${mags.length} ตัว • เหลือแบบข้างว่าง ${f3(xeMax-xe)} ม.`;frame()}
function frame(){const b=new THREE.Box3().setFromObject(g3),c=new THREE.Vector3();b.getCenter(c);g3.position.set(-c.x,0,-c.z);T0.set(0,0,0);tg.set(0,0,0);R0=6096*KK*1.1;rr=R0;th=-.7;ph=.95;upd()}
function refresh(){const st=getState();if(!st)return;const s=$("selT"),k=s.value;s.innerHTML=st.list.map(i=>`<option value="${i.code}">${i.code} • สูง ${(i.H/1000).toFixed(2)} × กว้าง ${f2(i.WT)}</option>`).join("");if(k&&st.list.some(i=>i.code===k))s.value=k}
return{build,refresh}})();
return { setShoulder(on,drop){shOn=!!on;shDrop=+drop||0}, buildWall: build3d, snapshot, table: TV, resetWall(){ th=-.6; ph=1.05; r=R0; upd(); } };
}
