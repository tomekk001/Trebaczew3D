(function(){
const hot = window.claude && window.claude.hot;

async function boot(saved){
  saved = saved || {};
  /* materiały fizyczne (PBR) na komputerach: cieniowanie liczone na piksel, odbicia nieba; na telefonach zostają lekkie materiały */
  const PBR=!matchMedia('(pointer:coarse)').matches&&!/[?&]pbr=0/.test(location.search);
  if(PBR&&!THREE.__pbr){ THREE.__pbr=1; const conv=(p,rough)=>{ const q=Object.assign({},p||{}); let r=rough; if(q.shininess!==undefined){ r=clamp01(1-Math.min(1,q.shininess/110)*.82); } delete q.shininess; delete q.specular; delete q.reflectivity; delete q.combine; if(q.roughness===undefined) q.roughness=r; if(q.metalness===undefined) q.metalness=0; if(q.envMapIntensity===undefined) q.envMapIntensity=.38; if(q.map&&!q.normalMap&&!q.transparent&&!q.alphaTest&&(q.map.wrapS===THREE.RepeatWrapping||q.map.__nm)&&q.map.image&&q.map.image.getContext&&!q.map.__nonm){ const nm=THREE.__nm(q.map); if(nm){ q.normalMap=nm; q.normalScale=new THREE.Vector2(.9,.9); } } return new THREE.MeshStandardMaterial(q); }; function clamp01(v){ return Math.max(.08,Math.min(1,v)); }
    const NMC=new WeakMap(); THREE.__nm=map=>{ const im=map.image; if(NMC.has(im)){ const b=NMC.get(im); if(!b) return null; const t=b.clone(); t.wrapS=map.wrapS; t.wrapT=map.wrapT; t.repeat.copy(map.repeat); t.offset.copy(map.offset); t.rotation=map.rotation; t.needsUpdate=true; return t; }
      try{ const W=Math.min(512,im.width), Hh=Math.min(512,im.height); if(W<16||Hh<16||im.width*im.height>1100000){ NMC.set(im,null); return null; } const c=document.createElement('canvas'); c.width=W; c.height=Hh; const x=c.getContext('2d'); x.drawImage(im,0,0,W,Hh); const d=x.getImageData(0,0,W,Hh), a=d.data, L=new Float32Array(W*Hh); for(let i=0;i<W*Hh;i++) L[i]=(a[i*4]*.3+a[i*4+1]*.59+a[i*4+2]*.11)/255;
        const k=2.2*Math.min(2,W/128); for(let y=0;y<Hh;y++)for(let xx=0;xx<W;xx++){ const l=L[y*W+(xx+W-1)%W], r=L[y*W+(xx+1)%W], u=L[((y+Hh-1)%Hh)*W+xx], dn=L[((y+1)%Hh)*W+xx]; let nx=(l-r)*k, ny=(u-dn)*k; const il=1/Math.sqrt(nx*nx+ny*ny+1); const i=(y*W+xx)*4; a[i]=(nx*il*.5+.5)*255; a[i+1]=(-ny*il*.5+.5)*255; a[i+2]=(il*.5+.5)*255; a[i+3]=255; }
        x.putImageData(d,0,0); const t=new THREE.CanvasTexture(c); t.wrapS=map.wrapS; t.wrapT=map.wrapT; t.repeat.copy(map.repeat); t.offset.copy(map.offset); t.rotation=map.rotation; t.anisotropy=map.anisotropy; NMC.set(im,t); return t; }catch(e){ NMC.set(im,null); return null; } };
    THREE.MeshLambertMaterial=function(p){ return conv(p,.88); }; THREE.MeshPhongMaterial=function(p){ return conv(p,.45); }; }
  const LP=async p=>{ try{ const b=document.getElementById('loadBar'), t=document.getElementById('loadPct'); if(b)b.firstElementChild.style.width=p+'%'; if(t)t.textContent=p+'%'; }catch(e){} await Promise.race([new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0))),new Promise(r=>setTimeout(r,60))]); };
  try{ await Promise.race([Promise.all([document.fonts.load('600 40px "Barlow Condensed"'),document.fonts.load('40px "Anton"')]), new Promise(r=>setTimeout(r,1800))]); }catch(e){}

  /* ---------- pomocnicze ---------- */
  let seed = 20261030;
  function rnd(){ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }
  const R=(a,b)=>a+(b-a)*rnd();
  const pick=a=>a[Math.floor(rnd()*a.length)];
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;
  function segDist(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,L=dx*dx+dz*dz;let t=L?((px-ax)*dx+(pz-az)*dz)/L:0;t=t<0?0:t>1?1:t;const qx=ax+dx*t-px,qz=az+dz*t-pz;return Math.sqrt(qx*qx+qz*qz);}
  function inPoly(x,y,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))c=!c;}return c;}
  const dec=d=>{const r=[[d[0],d[1]]];for(let i=2;i<d.length;i+=2){const p=r[r.length-1];r.push([p[0]+d[i],p[1]+d[i+1]]);}return r;};
  const decRel=d=>{const r=[[d[0],d[1]]];for(let i=2;i<d.length;i+=2)r.push([d[0]+d[i],d[1]+d[i+1]]);return r;};
  function mar(p){let best=null;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];const an=Math.atan2(q[1]-p[i][1],q[0]-p[i][0]);const c=Math.cos(an),s=Math.sin(an);let a=1e9,b=-1e9,cc=1e9,dd=-1e9;p.forEach(v=>{const u=v[0]*c+v[1]*s,w=-v[0]*s+v[1]*c;a=Math.min(a,u);b=Math.max(b,u);cc=Math.min(cc,w);dd=Math.max(dd,w);});const A=(b-a)*(dd-cc);if(!best||A<best.A){const mu=(a+b)/2,mw=(cc+dd)/2;best={A,cx:mu*c-mw*s,cz:mu*s+mw*c,w:b-a,d:dd-cc,an};}}return best;}
  function centroid(p){let x=0,z=0;p.forEach(v=>{x+=v[0];z+=v[1];});return [x/p.length,z/p.length];}
  function polyArea(p){let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1];}return a/2;}
  const bbox=p=>{let a=1e9,b=1e9,c=-1e9,d=-1e9;p.forEach(v=>{a=Math.min(a,v[0]);b=Math.min(b,v[1]);c=Math.max(c,v[0]);d=Math.max(d,v[1]);});return [a,b,c,d];};
  function lineLen(pts){const len=[0];for(let i=1;i<pts.length;i++)len.push(len[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));return len;}
  function resample(pts,step){ const out=[pts[0]]; for(let i=1;i<pts.length;i++){ const a=pts[i-1],b=pts[i],L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(L/step)); for(let k=1;k<=n;k++) out.push([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]); } return out; }

  /* ---------- wysokości terenu (NMT GUGiK, siatka 10 m WCS GUGiK) ---------- */
  const HG=HGRID, HB=205; const hv=new Float32Array(HG.nx*HG.nz); for(let i=0;i<hv.length;i++) hv[i]=parseInt(HG.s.substr(i*2,2),36)/10+HG.base-HB;
  function hRaw(x,z){ let fx=clamp((x-HG.x0)/HG.step,0,HG.nx-1.0001), fz=clamp((z-HG.z0)/HG.step,0,HG.nz-1.0001); const ix=fx|0, iz=fz|0, tx=fx-ix, tz=fz-iz, n=HG.nx; const a=hv[iz*n+ix], b=hv[iz*n+ix+1], c=hv[(iz+1)*n+ix], d=hv[(iz+1)*n+ix+1]; return a*(1-tx)*(1-tz)+b*tx*(1-tz)+c*(1-tx)*tz+d*tx*tz; }
  const FLAT=[];
  function H0(x,z){ for(const f of FLAT){ if(x>f.bb[0]-f.fe&&x<f.bb[2]+f.fe&&z>f.bb[1]-f.fe&&z<f.bb[3]+f.fe){ if(inPoly(x,z,f.p))return f.h; } } return hRaw(x,z); }
  // głęboki wykop kolejowy na północ od Trębaczewa: tory (Magistrala Węglowa) schodzą coraz głębiej w ziemię, a ulica Wynalazek przechodzi nad nimi wiaduktem
  let CUTL=null, BRG=null; const CUT_D=6.8;
  const cutProfile=z=>{ const sm=t=>{ t=Math.max(0,Math.min(1,t)); return t*t*(3-2*t); }; return CUT_D*sm((280-z)/290)*(1-sm((-760-z)/340)); };
  function cutAt(x,z){ if(z>290||z<-1110||x>-480||x<-960) return 0; if(!CUTL){ CUTL=RAILS.find(r=>r.length>=20&&Math.hypot(r[0][0]+194,r[0][1]+2246)<40)||[]; } const L=CUTL; if(L.length<2) return 0; const dp=cutProfile(z); if(dp<=0.01) return 0; let best=1e9;
    for(let i=0;i<L.length-1;i++){ const a=L[i], b=L[i+1]; if(Math.max(a[1],b[1])<z-30||Math.min(a[1],b[1])>z+30) continue; const dx=b[0]-a[0], dz=b[1]-a[1], l2=dx*dx+dz*dz||1; let t=((x-a[0])*dx+(z-a[1])*dz)/l2; t=t<0?0:t>1?1:t; const d=Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t); if(d<best) best=d; }
    if(best>24) return 0; const k=best<=8?1:(1+Math.cos((best-8)/16*Math.PI))/2; return dp*k; }
  function HC(x,z){ return H0(x,z)-cutAt(x,z); }
  function inDeck(x,z){ if(!BRG){ if(typeof ROADS==='undefined') return false; let bd=1e9, br=null; ROADS.forEach(r=>{ if(r.n!=='Wynalazek') return; for(let i=0;i<r.pts.length-1;i++){ const a=r.pts[i], b=r.pts[i+1], dx=b[0]-a[0], dz=b[1]-a[1], l2=dx*dx+dz*dz||1; let t=((-707-a[0])*dx+(-65-a[1])*dz)/l2; t=t<0?0:t>1?1:t; const qx=a[0]+dx*t, qz=a[1]+dz*t, d=Math.hypot(qx+707,qz+65); if(d<bd){ bd=d; const l=Math.sqrt(l2); br={x:qx,z:qz,dx:dx/l,dz:dz/l}; } } }); BRG=br||{x:0,z:0,dx:1,dz:0,none:true}; }
    if(BRG.none) return false; const ux=x-BRG.x, uz=z-BRG.z, u=ux*BRG.dx+uz*BRG.dz, v=-ux*BRG.dz+uz*BRG.dx; return Math.abs(u)<70&&Math.abs(v)<3.8; }
  function deckY(x,z){ inDeck(0,0); if(!BRG||BRG.none) return H0(x,z); if(BRG.y0===undefined){ const P=u=>[BRG.x+BRG.dx*u,BRG.z+BRG.dz*u]; const a=P(-70), b=P(70); BRG.y0=H0(a[0],a[1]); BRG.y1=H0(b[0],b[1]); } const u=(x-BRG.x)*BRG.dx+(z-BRG.z)*BRG.dz; return BRG.y0+(BRG.y1-BRG.y0)*(u+70)/140; }
  const DECKH=(x,z)=>inDeck(x,z)?deckY(x,z):H0(x,z);
  function H(x,z){ if(z>290||z<-1110||x>-480||x<-960) return H0(x,z); if(inDeck(x,z)) return deckY(x,z); return H0(x,z)-cutAt(x,z); }

  /* ---------- dane OSM ---------- */
  const RENAME={'Jarosława Zdzisława Stodulskiego':'Stodulskiego','Generała Władysława Sikorskiego':'Sikorskiego'};
  const WIDTH={primary:9,res:6,unc:5,srv:3.5,track:3};
  const ROADS=[], RAILS=[];
  DATA.R.forEach(([t,n,ref,d])=>{ const pts=dec(d);
    if(t.startsWith('rail')){ RAILS.push(pts); return; }
    n=RENAME[n]||n;
    if(n==='Polna'&&d[0]===-458&&d[1]===311) n='Energetyczna';
    if(!n&&t==='unc'&&d[0]<-650) n='Wynalazek';
    ROADS.push({t,n,ref,w:n==='Zacisze'?3.6:(WIDTH[t]||4),pts,main:t==='primary'}); });
  if(typeof DATA_X!=='undefined'){ const dk=ROADS.find(r=>r.main); if(dk&&DATA_X.DK&&DATA_X.DK.length>4) dk.pts=dec(DATA_X.DK);
    DATA_X.R.forEach(([t,n,ref,d])=>{ const pts=dec(d); if(t.startsWith('rail')){ RAILS.push(pts); return; } ROADS.push({t,n:RENAME[n]||n,ref,w:WIDTH[t]||4,pts,main:false,ext:true}); }); }
  ROADS.forEach(r=>{ r.len=lineLen(r.pts); r.L=r.len[r.len.length-1]; });
  const DK=ROADS.find(r=>r.main);
  { const band=DK.w/2+.6; const extra=[]; const inB=q=>roadDist(DK,q[0],q[1])<band;
    ROADS.slice().forEach(r=>{ if(r===DK||r.main||r.t==='track'||!r.pts||r.pts.length<2) return; const pts=resample(r.pts,1.5); if(pts.length<3||!pts.some(inB)) return;
      const flags=pts.map(inB); const parts=[]; let cur=[], i=0; while(i<pts.length){ if(!flags[i]){ cur.push(pts[i]); i++; continue; } let j=i; while(j<pts.length&&flags[j]) j++; const runLen=(j-i)*1.5; const atEnd=i===0||j===pts.length; if(atEnd||runLen>16){ if(cur.length>1) parts.push(cur); cur=[]; } else for(let k=i;k<j;k++) cur.push(pts[k]); i=j; }
      if(cur.length>1) parts.push(cur); const good=parts.filter(pp=>pp.length>2);
      if(good.length===1&&good[0].length===pts.length) return; if(!good.length){ r.pts=pts.slice(0,2); r.skipDraw=true; return; } r.pts=good[0]; good.slice(1).forEach(pp=>extra.push(Object.assign({},r,{pts:pp}))); });
    extra.forEach(r=>ROADS.push(r)); ROADS.forEach(r=>{ r.len=lineLen(r.pts); r.L=r.len[r.len.length-1]; }); }
  const AREAS=DATA.A.map(([t,n,sport,surf,d])=>({t,n,sport,surf,pts:dec(d)}));
  if(typeof DATA_X!=='undefined') DATA_X.A.forEach(([t,n,sport,surf,d])=>AREAS.push({t,n,sport,surf,pts:dec(d),ext:true}));
  const BLD=[];
  DATA_B.split(';').forEach(s=>{ const q=s.indexOf('"'); const name=q>=0?s.slice(q+1,s.lastIndexOf('"')):''; const nums=(q>=0?s.slice(0,q):s).split(',').filter(x=>x!=='').map(Number);
    const [x,z,w,d,deg,code,lv]=nums; BLD.push({x,z,w,d,a:deg*Math.PI/180,code,lv:lv||0,name}); });
  BLD.forEach(b=>{ if(b.name==='Żabka'&&Math.hypot(b.x+65,b.z-42)>300) b.name='Żabka Działoszyn'; if(b.name==='Myjnia'||b.name.startsWith('Myjnia Ręczna')||b.name==='STALPOL'||(Math.abs(b.x+976)<1&&Math.abs(b.z-470)<1)) b.skip=true; });
  const BPARTS={}; if(typeof DATA_PARTS!=='undefined'&&DATA_PARTS) DATA_PARTS.split(';').forEach(e=>{ const [i,r]=e.split(':'); BPARTS[+i]=r.split('|').map(q=>{ const [x,z,w,d]=q.split(',').map(Number); return {x,z,w,d}; }); });
  if(typeof DATA_ADDR!=='undefined'&&DATA_ADDR) DATA_ADDR.split(';').forEach(e=>{ const k=e.indexOf(':'); const b=BLD[+e.slice(0,k)]; if(!b)return; const [st2,num]=e.slice(k+1).split('|'); b.addr=(st2?st2+' ':'')+num; });
  BLD.forEach((b,i)=>{ if(BPARTS[i]) b.parts=BPARTS[i]; });
  BLD.forEach(b=>{ if(Math.hypot(b.x+1309,b.z-650)<3) b.skip=true; }); // dom przed Z.U.H. Zbyszko - zostaje tylko hala z Blendera
  // hala sportowa: osobny budynek między szkołą a boiskiem (wg ortofotomapy), bez łącznika ze szkołą
  { const hb=BLD.find(b=>b.code===5&&Math.hypot(b.x+173,b.z+74)<3); if(hb){ Object.assign(hb,{x:-174,z:-79,w:26,d:16,a:336*Math.PI/180,lv:1,isHall:true}); delete hb.parts; }
    const cn=BLD.find(b=>b.code===5&&Math.hypot(b.x+173,b.z+64)<2); if(cn) cn.skip=true; }
  const BPOLY=DATA.BP.map(([code,lv,name,d])=>({code,lv,name,pts:decRel(d)}));
  const PARCELS=DATA_PARC.split(';').map(s=>{ const p=dec(s.split(',').map(Number)); return {p,bb:bbox(p)}; });
  function roadNearF(x,z,m){ return ROADS.some(r=>r.t!=='track'&&roadDist(r,x,z)<r.w/2+m); }
  function sampleLine(pts,len,d){ const L=len[len.length-1]; d=clamp(d,0,L); let i=1; while(i<len.length-1&&len[i]<d)i++; const a=pts[i-1],b=pts[i],t=(d-len[i-1])/((len[i]-len[i-1])||1); const tx=b[0]-a[0],tz=b[1]-a[1],l=Math.hypot(tx,tz)||1; return {x:a[0]+tx*t,z:a[1]+tz*t,tx:tx/l,tz:tz/l}; }
  function roadDist(r,x,z){let m=1e9;for(let i=0;i<r.pts.length-1;i++){const d=segDist(x,z,r.pts[i][0],r.pts[i][1],r.pts[i+1][0],r.pts[i+1][1]);if(d<m)m=d;}return m;}
  function nearestRoad(x,z,filter){let best=null,bd=1e9,seg=0;ROADS.forEach(r=>{ if(filter&&!filter(r))return; for(let i=0;i<r.pts.length-1;i++){const d=segDist(x,z,r.pts[i][0],r.pts[i][1],r.pts[i+1][0],r.pts[i+1][1]);if(d<bd){bd=d;best=r;seg=i;}}});return {r:best,d:bd,seg};}
  const area=t=>AREAS.find(a=>a.t===t);
  const SCHOOL=area('am:school'), KINDER=area('am:kindergarten');
  const COURT=AREAS.find(a=>a.surf==='tartan'&&a.t==='lei:pitch'); // orlik dokładnie tam, gdzie w OSM i na ortofotomapie (zachodni kraniec parku)
  // orlik nie może wchodzić na jezdnię: odsuń ogrodzenie (z zapasem 2 m) od wszystkich dróg
  for(let it=0;it<40;it++){ const m=mar(COURT.pts), hw=m.w/2+1+2, hd=m.d/2+1+2, c=Math.cos(m.an), sn=Math.sin(m.an); let mx=0,mz=0,hit=false;
    for(let k=0;k<64;k++){ const t=k/64*4; let u,v; if(t<1){u=-hw+2*hw*t;v=-hd;} else if(t<2){u=hw;v=-hd+2*hd*(t-1);} else if(t<3){u=hw-2*hw*(t-2);v=hd;} else {u=-hw;v=hd-2*hd*(t-3);}
      const x=m.cx+u*c-v*sn, z=m.cz+u*sn+v*c; ROADS.forEach(r=>{ if(r.t==='track'||r.t==='rail'||r.t==='path'||r.t==='foot')return; const d=roadDist(r,x,z); if(d<r.w/2){ hit=true; const nr=nearestRoad(x,z,q=>q===r); const a2=r.pts[nr.seg], b2=r.pts[nr.seg+1]; const L=Math.hypot(b2[0]-a2[0],b2[1]-a2[1])||1; let nx=-(b2[1]-a2[1])/L, nz=(b2[0]-a2[0])/L; if((m.cx-a2[0])*nx+(m.cz-a2[1])*nz<0){ nx=-nx; nz=-nz; } const need=r.w/2-d+.3; if(Math.abs(nx*need)>Math.abs(mx)) mx=nx*need; if(Math.abs(nz*need)>Math.abs(mz)) mz=nz*need; } }); }
    if(!hit) break; COURT.pts=COURT.pts.map(p=>[p[0]+mx,p[1]+mz]); }
  const PITCH2=AREAS.find(a=>a.sport==='multi'), TRACK=area('lei:track');
  const PARK=AREAS.find(a=>a.n==='Park w Trębaczewie'), CEM=area('lu:cemetery'), OSPA=area('am:fire_station');
  const PLAYS=AREAS.filter(a=>a.t==='lei:playground');
  const PLAC=AREAS.find(a=>a.t==='am:parking'&&a.pts[0][0]===-40&&a.pts[0][1]===-278);
  const CHURCH=BPOLY.find(b=>b.name.startsWith('Kościół')); let CHURCH_DOOR=null;
  // boisko szkolne obok przedszkola: ułożone wzdłuż Zagrodowej (jak na mapie), równy plac z niebieską bieżnią wokół (bieżnia z OSM zastąpiona)
  const TRK={lane:1.0,n:5,gap:.5};
  { const m0=mar(PITCH2.pts), c=Math.cos(m0.an), s=Math.sin(m0.an), hw=m0.d/2, hd=m0.w/2;
    const m=mar(PITCH2.pts), hs=PITCH2.pts.map(v=>hRaw(v[0],v[1])), h=hs.reduce((a,v)=>a+v,0)/hs.length, cc=Math.cos(m.an), ss=Math.sin(m.an);
    const sw0=m.w>m.d, sh0=Math.min(m.w,m.d)/2+1, lg0=Math.max(m.w,m.d)/2+1, r00=sh0+TRK.gap, cz00=Math.max(0,lg0-Math.sqrt(Math.max(0,r00*r00-sh0*sh0))+.3), A0=r00+TRK.lane*TRK.n+1.5, B0=cz00+r00+TRK.lane*TRK.n+1.5, ow=sw0?B0:A0, od=sw0?A0:B0;
    const pad=[[-ow,-od],[ow,-od],[ow,od],[-ow,od]].map(([u,v])=>[m.cx+u*cc-v*ss, m.cz+u*ss+v*cc]);
    FLAT.push({p:PITCH2.pts,bb:bbox(PITCH2.pts),fe:0,h}); FLAT.unshift({p:pad,bb:bbox(pad),fe:0,h}); }
  [COURT].forEach(a=>{ const hs=a.pts.map(v=>hRaw(v[0],v[1])); FLAT.push({p:a.pts,bb:bbox(a.pts),fe:0,h:hs.reduce((s,v)=>s+v,0)/hs.length}); });
  const NC=(()=>{ const cx=-943,cz=1280,tx=.739,tz=.673,L=15,Wd=8; const pts=[[-L,-Wd],[L,-Wd],[L,Wd],[-L,Wd],[-L,-Wd]].map(([a,b])=>[cx+tx*a-tz*b,cz+tz*a+tx*b]); const hs=pts.map(v=>hRaw(v[0],v[1])); FLAT.push({p:pts,bb:bbox(pts),fe:0,h:hs.reduce((q,v)=>q+v,0)/hs.length}); return {pts}; })(); // małe boisko (-954, 1278)
  const flatH=a=>FLAT.find(f=>f.p===a.pts).h;
  // orlik w Sadowcu: boisko z OSM najbliżej wsi Sadowiec-Wrzosy (spłaszczamy pod nie teren)
  let SAD_PITCH=null; if(typeof DATA_OSM!=='undefined'&&typeof DATA_X!=='undefined'){ const hp=DATA_X.P.find(q=>q[0]==='Sadowiec-Wrzosy'); let bd=600; if(hp) DATA_OSM.P.forEach(([sp,sf,f])=>{ if(sp!=='soccer'&&sp!=='basketball') return; const pts=[]; for(let i=0;i<f.length;i+=2) pts.push([f[i],f[i+1]]); const c=centroid(pts), dd=Math.hypot(c[0]-hp[2],c[1]-hp[3]); if(dd<bd){ bd=dd; SAD_PITCH={t:'lei:pitch',n:'Orlik Sadowiec',pts}; } });
    if(SAD_PITCH){ const hs=SAD_PITCH.pts.map(v=>hRaw(v[0],v[1])); FLAT.push({p:SAD_PITCH.pts,bb:bbox(SAD_PITCH.pts),fe:0,h:hs.reduce((s,v)=>s+v,0)/hs.length}); } }

  // myjnia przy DK42: ramka układu (hala + dom + wiata; z przodu komis, z tyłu duży plac w kostce z tirami); lokalnie x - w prawo patrząc od ulicy, z - do ulicy
  const LPGF=(()=>{ const B=BLD.find(b=>b.name==='STALPOL'); if(!B) return null; const nr=nearestRoad(B.x,B.z,r=>r.t!=='track'); if(!nr.r||nr.d>120) return null; const RD=nr.r; let bs=null;
    for(let d=0;d<RD.L;d+=2){ const s0=sampleLine(RD.pts,RD.len,d); const q=Math.hypot(s0.x-B.x,s0.z-B.z); if(!bs||q<bs.q) bs={q,s:s0}; }
    const s0=bs.s; let nx=-s0.tz, nz=s0.tx; if((B.x-s0.x)*nx+(B.z-s0.z)*nz<0){ nx=-nx; nz=-nz; }
    const mx=-nx, mz=-nz, th=Math.atan2(mx,mz), ex=mz, ez=-mx; const Ox=B.x+mx*2.5, Oz=B.z+mz*2.5;
    const L=(a,b)=>[Ox+ex*a+mx*b, Oz+ez*a+mz*b]; return {L,th,mx,mz,Ox,Oz,lot:[L(-24,-12),L(20,-12),L(20,26),L(-24,26)]}; })();
  const MJF=(()=>{ const MJ=DATA_B.includes('"Myjnia"')?{x:920,z:-320}:null; if(!MJ) return null; const nr=nearestRoad(MJ.x,MJ.z,r=>r.t!=='track'); const RD=(nr.r&&nr.d<80)?nr.r:ROADS.find(r=>r.main); let bs=null;
    for(let d=0;d<RD.L;d+=2){ const s0=sampleLine(RD.pts,RD.len,d); const q=Math.hypot(s0.x-MJ.x,s0.z-MJ.z); if(!bs||q<bs.q) bs={q,s:s0}; }
    const s0=bs.s; let nx=-s0.tz, nz=s0.tx; if((MJ.x-s0.x)*nx+(MJ.z-s0.z)*nz<0){ nx=-nx; nz=-nz; }
    const mx=-nx, mz=-nz, th=Math.atan2(mx,mz), ex=mz, ez=-mx, vO=RD.w/2+32; const Ox=s0.x+nx*vO-ex*2.5, Oz=s0.z+nz*vO-ez*2.5;
    const L=(a,b)=>[Ox+ex*a+mx*b, Oz+ez*a+mz*b]; const rect=(a,b,c,d)=>[L(a,c),L(b,c),L(b,d),L(a,d)];
    const F={Ox,Oz,mx,mz,th,ex,ez,L,rect,RD,front:rect(-33,16,-12,29),side:rect(16,17,-12,29),yard:rect(-34,16,-125,-12)};
    const pad=rect(-36,60,-74,30); F.h=hRaw(Ox,Oz); FLAT.push({p:pad,bb:bbox(pad),fe:0,h:F.h}); return F; })();
  // Cementownia Warta (Grądy): obrysy budynków, drogi i tory z OpenStreetMap (CEM_OSM), teren wyrównany (brak NMT)
  const CEMF=(()=>{ const items=CEM_OSM.split('\n').filter(Boolean).map(l=>{ const f=l.split('|'); let t={},lv=0,pts=[],name='';
      if(f.length>=6){ let x=0,z=0; f[5].split(';').forEach((s,i)=>{ const d=s.split(',').map(Number); if(i){ x+=d[0]; z+=d[1]; } else { x=d[0]; z=d[1]; } pts.push([x,z]); }); if(f[0]==='B'){ t.building=f[4]||'yes'; if(f[3]) t.man_made=f[3]; } else t.man_made='pipeline'; name=f[1]; lv=+f[2]||0; }
      else { const [tg,lv0,ps]=f; lv=+lv0||0; const n=ps.split(',').map(Number); for(let i=0;i<n.length;i+=2) pts.push([n[i],n[i+1]]); if(tg==='B') t.building='yes'; else tg.split(';').forEach(s=>{ const k=s.split('='); t[k[0]]=k.slice(1).join('='); }); }
      return {t,lv,pts,name}; });
    const x0=150,x1=1490,z0=2595,z1=3000, pad=[[x0,z0],[x1,z0],[x1,z1],[x0,z1]]; const h=hRaw((x0+x1)/2,(z0+z1)/2); FLAT.push({p:pad,bb:bbox(pad),fe:0,h});
    items.forEach(it=>{ if(it.t.railway==='rail') RAILS.push(it.pts); });
    return {x0,x1,z0,z1,pad,h,items}; })();
  /* ---------- renderer + efekty ---------- */
  const canvas=document.getElementById('c');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  const DPR=Math.min(window.devicePixelRatio||1,1.6); renderer.setPixelRatio(DPR);
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const ANISO=renderer.capabilities.getMaxAnisotropy();
  const scene=new THREE.Scene();
  const SUNDIR=new THREE.Vector3(-0.62,0.42,0.66).normalize();
  const DAY={hor:0xc3daee,zen:0x2a63c4,fog:0xc2d4e4,hemiS:0xcfe2ff,hemiG:0x7a735c,hemi:0.62,sun:1.15,sunC:0xfff0d8,bloom:0.3,exp:0.95}; const HK=PBR?.62:1;
  const NIGHT={hor:0x232a48,zen:0x04060e,fog:0x121726,hemiS:0x4a5c8c,hemiG:0x12141c,hemi:0.4,sun:0.18,sunC:0x9fb4ff,bloom:0.8,exp:1.02};
  scene.fog=new THREE.Fog(DAY.fog,190,1000);
  const camera=new THREE.PerspectiveCamera(60,1,0.25,4000);
  const hemi=new THREE.HemisphereLight(DAY.hemiS,DAY.hemiG,DAY.hemi); scene.add(hemi);
  const sun=new THREE.DirectionalLight(DAY.sunC,DAY.sun); sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048); const sc=sun.shadow.camera; sc.left=-85;sc.right=85;sc.top=85;sc.bottom=-85;sc.near=10;sc.far=500; sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.02;
  scene.add(sun); scene.add(sun.target);
  const playerLight=new THREE.PointLight(0xffc98a,0,55,1.6); scene.add(playerLight);
  const skyU={hor:{value:new THREE.Color(DAY.hor)},zen:{value:new THREE.Color(DAY.zen)},sunDir:{value:SUNDIR.clone()},sunC:{value:new THREE.Color(0xfff0d0)},night:{value:0},t:{value:0},cov:{value:.42}};
  const sky=new THREE.Mesh(new THREE.SphereGeometry(3000,32,16),new THREE.ShaderMaterial({uniforms:skyU,side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 hor,zen,sunC,sunDir;uniform float night,t,cov;varying vec3 vD;
float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1.,0.)),f.x),mix(h2(i+vec2(0.,1.)),h2(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n2(p);p=p*2.03+vec2(17.,9.);a*=.5;}return s;}
void main(){vec3 d=normalize(vD);float y=max(d.y,0.);vec3 sd=normalize(sunDir);
 vec3 c=mix(hor,zen,pow(y,.42));c=mix(c,hor*1.06,exp(-y*9.)*.55);
 float s=max(dot(d,sd),0.);c+=sunC*(pow(s,900.)*5.+pow(s,60.)*.3+pow(s,6.)*.14)*(1.-night*.85);
 if(d.y>.012){vec2 uv=d.xz/(d.y+.09)*1.25+vec2(t*.006,t*.002);float f=fbm(uv)*.62+fbm(uv*2.7+3.)*.38;float m=smoothstep(1.-cov-.12,1.-cov+.2,f);float f2=fbm(uv+sd.xz*.09);float lit=clamp(.62+(f-f2)*2.4,0.,1.);
  vec3 cc=mix(mix(hor,zen,.35)*.62,vec3(1.)+sunC*.12,lit)*(1.-night*.8)*mix(1.,.62,smoothstep(.6,.95,cov));c=mix(c,cc,m*smoothstep(.012,.14,d.y)*.93);}
 if(d.y<0.)c=mix(hor*.9,vec3(.33,.34,.29)*(1.-night*.7),smoothstep(0.,-.25,d.y));
 if(night>.5){vec3 q=floor(vD*420.);float st=step(.9975,h(q))*smoothstep(.05,.3,vD.y);c+=vec3(st);}gl_FragColor=linearToOutputTexel(vec4(c,1.));}`}));
  sky.renderOrder=-1; scene.add(sky);
  let composer=null, bloom=null, grade=null, fxaa=null, ao=null;
  try{ if(THREE.EffectComposer&&THREE.UnrealBloomPass){ composer=new THREE.EffectComposer(renderer); composer.addPass(new THREE.RenderPass(scene,camera));
      { const mkD=()=>{ const d=new THREE.DepthTexture(); d.type=THREE.UnsignedIntType; return d; }; composer.renderTarget1.depthTexture=mkD(); composer.renderTarget2.depthTexture=mkD();
        ao=new THREE.ShaderPass({uniforms:{tDiffuse:{value:null},tDepth:{value:null},nf:{value:new THREE.Vector2(.25,4000)},tn:{value:new THREE.Vector2(1,1)},px:{value:new THREE.Vector2(1,1)},str:{value:1}},
          vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
          fragmentShader:`uniform sampler2D tDiffuse,tDepth;uniform vec2 nf,tn,px;uniform float str;varying vec2 vUv;
float ld(vec2 uv){float z=texture2D(tDepth,uv).x*2.-1.;return 2.*nf.x*nf.y/(nf.y+nf.x-z*(nf.y-nf.x));}
vec3 vp(vec2 uv){float d=ld(uv);return vec3((uv*2.-1.)*tn*d,-d);}
void main(){vec4 col=texture2D(tDiffuse,vUv);float d=ld(vUv);if(d>260.||str<.01){gl_FragColor=col;return;}
 vec3 p=vec3((vUv*2.-1.)*tn*d,-d);vec3 px1=vp(vUv+vec2(px.x,0.))-p,px0=p-vp(vUv-vec2(px.x,0.)),py1=vp(vUv+vec2(0.,px.y))-p,py0=p-vp(vUv-vec2(0.,px.y));
 vec3 dx=abs(px1.z)<abs(px0.z)?px1:px0,dy=abs(py1.z)<abs(py0.z)?py1:py0;vec3 n=normalize(cross(dx,dy));
 float R=mix(.55,1.6,smoothstep(4.,60.,d));float rs=R/(d*tn.y*2.);float a0=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))*6.2831853;float occ=0.;
 for(int i=0;i<12;i++){float fi=(float(i)+.5)/12.;float a=a0+fi*6.2831853*3.1;vec2 o=vec2(cos(a),sin(a))*sqrt(fi)*rs;o.x*=tn.y/tn.x;vec3 v=vp(vUv+o)-p;float dd=dot(v,v);occ+=max(dot(n,v)-.012*d-.02,0.)/(dd+.03)*smoothstep(R*R*3.5,R*R*1.2,dd);}
 float k=clamp(1.-occ*(R*.5)/12.*2.3,0.,1.);k=mix(1.,k,str*smoothstep(260.,120.,d));gl_FragColor=vec4(col.rgb*k,col.a);}`});
        const r0=ao.render.bind(ao); ao.render=(rn,wb,rb,dt,mk)=>{ const u=ao.uniforms; u.tDepth.value=rb.depthTexture; const th=Math.tan(camera.fov*Math.PI/360); u.tn.value.set(th*camera.aspect,th); u.nf.value.set(camera.near,camera.far); u.px.value.set(1/rb.width,1/rb.height); r0(rn,wb,rb,dt,mk); }; composer.addPass(ao); }
      bloom=new THREE.UnrealBloomPass(new THREE.Vector2(512,512),DAY.bloom,0.55,0.82); composer.addPass(bloom);
      grade=new THREE.ShaderPass({uniforms:{tDiffuse:{value:null},time:{value:0},exposure:{value:DAY.exp},night:{value:0}},
        vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:'uniform sampler2D tDiffuse;uniform float time,exposure,night;varying vec2 vUv;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb*exposure;c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,1.22);c=(c-.5)*1.12+.5;c+=vec3(.018,.006,-.014)*smoothstep(.35,1.,l)*(1.-night)+vec3(-.012,.003,.022)*(1.-smoothstep(0.,.45,l));vec2 d=vUv-.5;c*=1.-dot(d,d)*.55;c+=(fract(sin(dot(vUv*(time+1.),vec2(12.9898,78.233)))*43758.5453)-.5)*.014;gl_FragColor=vec4(clamp(c,0.,1.),1.);}'});
      composer.addPass(grade); if(THREE.FXAAShader){ fxaa=new THREE.ShaderPass(THREE.FXAAShader); composer.addPass(fxaa); } } }catch(e){ composer=null; }
  if(!composer){ renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=0.95; }
  /* odbicia i światło otoczenia z nieba (tylko materiały PBR) */
  let ENVRT=null, envT=-99; const envRefresh=()=>{ if(!PBR) return; try{ if(!envRefresh.pm){ envRefresh.pm=new THREE.PMREMGenerator(renderer); envRefresh.sc=new THREE.Scene(); const m=new THREE.Mesh(new THREE.SphereGeometry(50,24,12),sky.material); envRefresh.sc.add(m); } const rt=envRefresh.pm.fromScene(envRefresh.sc,0,1,200); scene.environment=rt.texture; if(ENVRT) ENVRT.dispose(); ENVRT=rt; }catch(e){} };

  let GROUND=null;
  function roofColor(i){ if(typeof DATA_ROOF==='undefined')return null; const s=DATA_ROOF.substr(i*3,3); if(s.length<3)return null; const c=new THREE.Color(parseInt(s[0],16)/15,parseInt(s[1],16)/15,parseInt(s[2],16)/15); const o={}; c.getHSL(o); c.setHSL(o.h,Math.min(1,o.s*1.8),clamp(o.l*.92,.12,.78)); return '#'+c.getHexString(); }
  await LP(6);
  /* ---------- tekstura terenu ---------- */
  const WB=typeof DATA_X!=='undefined'?DATA_X.W:[-1150,950,-850,1050];
  const X0=WB[0],X1=WB[1],Z0=WB[2],Z1=WB[3], GW=X1-X0, GH=Z1-Z0;
  /* maska przejścia w pasie północnym (Sadowiec): 1 = da się przejść, 0 = pola/lasy bez dróg - wyszarzone i zablokowane */
  const NM=(typeof DATA_X!=='undefined'&&DATA_X.N)||null, NMB=NM?Uint8Array.from(atob(NM.s),c=>c.charCodeAt(0)):null;
  function noWalk(x,z){ if(!NM)return false; const cx=Math.floor((x-NM.x0)/NM.c), cz=Math.floor((z-NM.z0)/NM.c); if(cx<0||cz<0||cx>=NM.nx||cz>=NM.nz)return false; const i=cz*NM.nx+cx; return !((NMB[i>>3]>>(i&7))&1); }
  const GTW=GW>3000?4096:2048; const gc=document.createElement('canvas'); const K=GTW/GW; gc.width=GTW; gc.height=Math.round(GH*K);
  let ORTO_IMG=null; if(typeof ORTO!=='undefined'){ try{ const im=new Image(); im.src=ORTO.src; await im.decode(); ORTO_IMG=im; }catch(e){} }
  const g=gc.getContext('2d'); g.setTransform(K,0,0,K,-X0*K,-Z0*K);
  const path=(pts,close)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));if(close)g.closePath();};
  g.fillStyle='#93a05c'; g.fillRect(X0,Z0,GW,GH);

  const FIELD=['#c2a873','#ad9260','#d3be8a','#8fa052','#7a9445','#a2b464','#dccb98','#6c8a40','#bca36a','#9a8455'];
  function strips(ang,clip){ g.save(); if(clip){path(clip,true);g.clip();} g.translate(-100,0); g.rotate(ang*Math.PI/180);
    for(let x=-2200;x<2200;){const w=R(10,32); g.fillStyle=pick(FIELD); g.fillRect(x,-2200,w,4400); g.fillStyle='rgba(50,40,20,.18)'; g.fillRect(x,-2200,.8,4400);
      for(let k=0;k<3;k++){ if(rnd()<.35){ g.fillStyle=pick(FIELD); g.fillRect(x,R(-2200,1900),w,R(80,400)); } } x+=w; }
    g.restore(); }
  strips(-2,null);
  strips(-56,[...DK.pts.map(p=>[p[0],p[1]+40]),[X0-50,Z1+50],[X1+50,Z1+50],[X1+50,DK.pts[0][1]+40]]);
  // działki rolne z ewidencji: każdy pas w swoim kolorze uprawy
  PARCELS.forEach(pc=>{ const ar=Math.abs(polyArea(pc.p)); if(ar<2500)return; path(pc.p,true); g.fillStyle=pick(FIELD); g.globalAlpha=.85; g.fill(); }); g.globalAlpha=1;
  const GARD=['#5d8038','#68893d','#567a35','#729447','#5f8239','#6c8e42'];
  // działki z domami: zielone ogrody w granicach działki
  const isHouseParcel=pc=>BLD.some(b=>b.x>pc.bb[0]&&b.x<pc.bb[2]&&b.z>pc.bb[1]&&b.z<pc.bb[3]&&inPoly(b.x,b.z,pc.p));
  PARCELS.forEach(pc=>{ pc.res=isHouseParcel(pc); if(pc.res){ path(pc.p,true); g.fillStyle=pick(GARD); g.fill(); } });
  BLD.forEach(b=>{ if(b.x<-1150||b.x>950||b.z<-850||b.z>1050)return; const r=Math.max(12,Math.hypot(b.w,b.d)*.9); g.fillStyle=pick(GARD); g.beginPath(); g.arc(b.x,b.z,r,0,7); g.fill(); });
  for(let i=0;i<8000;i++){ const b=pick(BLD); g.fillStyle=pick(['#557833','#6a8b3c','#4c6c2f','#78964a','#839a52','#9a9a68','#a59a7c']); g.globalAlpha=R(.35,.85); g.fillRect(b.x+R(-24,24),b.z+R(-24,24),R(3,10),R(3,10)); }
  g.globalAlpha=.85; BLD.forEach(b=>{ if(b.w*b.d<60||rnd()<.4)return; const nr=nearestRoad(b.x,b.z,r=>r.t!=='track'); if(!nr.r||nr.d>45)return; const a=nr.r.pts[nr.seg],c=nr.r.pts[nr.seg+1]; const dx=c[0]-a[0],dz=c[1]-a[1],L=dx*dx+dz*dz; const t=clamp(((b.x-a[0])*dx+(b.z-a[1])*dz)/L,0,1); const px=a[0]+dx*t,pz=a[1]+dz*t; g.strokeStyle=pick(['#a7a49c','#9c968a','#b3ada2']); g.lineWidth=R(3,4.5); g.lineCap='butt'; g.beginPath(); g.moveTo(px,pz); g.lineTo(b.x+(px-b.x)*.35,b.z+(pz-b.z)*.35); g.stroke(); }); g.globalAlpha=1;
  // granice działek: miedze
  g.strokeStyle='rgba(70,85,40,.45)'; g.lineWidth=.6; PARCELS.forEach(pc=>{ path(pc.p,true); g.stroke(); });
  // ortofotomapa: pełna poza wsią, delikatnie pod stylizowanym centrum (miękkie przejście)
  if(ORTO_IMG){ const oc=document.createElement('canvas'); oc.width=gc.width; oc.height=gc.height; const o=oc.getContext('2d'); o.setTransform(K,0,0,K,-X0*K,-Z0*K);
    o.filter='saturate(1.45) contrast(1.06) brightness(0.74)'; { const ozB=ORTO.z0+ORTO_IMG.height*ORTO.mpp; if(ozB<Z1){ /* poza ortofotem na południu: rozciągnięty dolny pas (rozmyty), by nie było twardej krawędzi i innego koloru */
      const sh=Math.min(60,ORTO_IMG.height); o.save(); o.filter='saturate(1.45) contrast(1.06) brightness(0.74) blur('+Math.round(40*K)+'px)'; o.drawImage(ORTO_IMG,0,ORTO_IMG.height-sh,ORTO_IMG.width,sh,ORTO.x0,ozB-2,ORTO_IMG.width*ORTO.mpp,Z1-ozB+60); o.restore();
      o.filter='saturate(1.45) contrast(1.06) brightness(0.74)'; }
    if(ORTO.x0>X0||ORTO.x0+ORTO_IMG.width*ORTO.mpp<X1){ } }
    o.drawImage(ORTO_IMG,ORTO.x0,ORTO.z0,ORTO_IMG.width*ORTO.mpp,ORTO_IMG.height*ORTO.mpp);
    o.filter='blur('+Math.round(70*K)+'px)'; o.globalCompositeOperation='destination-out'; o.fillStyle='rgba(0,0,0,.72)'; o.fillRect(-1100,-800,2000,1800);
    g.save(); g.setTransform(1,0,0,1,0,0); g.drawImage(oc,0,0); g.restore(); }
  if(NM){ const mc=document.createElement('canvas'); mc.width=NM.nx; mc.height=NM.nz; const mg=mc.getContext('2d'); const id=mg.createImageData(NM.nx,NM.nz);
    for(let i=0;i<NM.nx*NM.nz;i++){ const w=(NMB[i>>3]>>(i&7))&1; id.data[i*4]=128; id.data[i*4+1]=130; id.data[i*4+2]=136; id.data[i*4+3]=w?0:255; } mg.putImageData(id,0,0);
    const gl=document.createElement('canvas'); gl.width=gc.width; gl.height=gc.height; const gx=gl.getContext('2d'); gx.imageSmoothingEnabled=true; gx.filter='blur('+Math.max(1,Math.round(NM.c*K*.5))+'px)';
    gx.drawImage(mc,(NM.x0-X0)*K,(NM.z0-Z0)*K,NM.nx*NM.c*K,NM.nz*NM.c*K); gx.filter='none';
    g.save(); g.setTransform(1,0,0,1,0,0); g.globalCompositeOperation='saturation'; g.globalAlpha=.92; g.drawImage(gl,0,0); g.globalCompositeOperation='source-over'; g.globalAlpha=.38; g.drawImage(gl,0,0); g.restore(); }
  const AREA_COL={'lu:cemetery':'#7d8c68','lei:park':'#6fa046','am:parking':'#7f7f7c','lei:playground':'#b8513f','lu:commercial':'#a8a291','lu:industrial':'#a39d8e','am:fire_station':'#99968d','am:school':'#86ad5c','am:kindergarten':'#8eb662','lu:construction':'#a19a8a','lei:track':'#b4553e'};
  ['lu:industrial','lu:commercial','am:school','am:kindergarten','lei:park','lu:cemetery','am:fire_station','lu:construction','am:parking','lei:playground','lei:track'].forEach(t=>AREAS.filter(a=>a.t===t).forEach(a=>{ path(a.pts,true); g.fillStyle=AREA_COL[t]; g.globalAlpha=ORTO_IMG&&(a.ext||['am:school','am:kindergarten','lei:park','lu:cemetery','lu:industrial','lu:commercial'].includes(t))?.45:1; g.fill(); g.globalAlpha=1; }));
  { g.save(); path(CEM.pts,true); g.clip(); for(let x=-260;x<60;x+=3.2)for(let z=280;z<480;z+=4.5){ g.fillStyle=rnd()<.5?'#cfcbc2':'#9e9a92'; g.fillRect(x,z,1.6,2.6);} g.restore(); }
  RAILS.forEach(p=>{ g.lineJoin='round'; path(p); g.strokeStyle='#4e6a34'; g.lineWidth=14; g.stroke(); g.strokeStyle='#857a6c'; g.lineWidth=5; g.stroke(); });
  g.lineCap='round'; g.lineJoin='round';
  ROADS.forEach(r=>{ path(r.pts); if(r.t==='track'){ g.globalAlpha=ORTO_IMG?.6:1; g.strokeStyle='#a8916a'; g.lineWidth=3.5; g.stroke(); g.globalAlpha=1; return; } g.strokeStyle='#8d8a7c'; g.lineWidth=r.w+(r.t==='srv'?1:5); g.stroke(); g.strokeStyle=r.main?'#5a5b5d':'#6b6b68'; g.lineWidth=r.w; g.stroke(); });
  const groundTex=new THREE.CanvasTexture(gc); groundTex.anisotropy=ANISO;
  function tex(w,h,draw,rep){ const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h); const t=new THREE.CanvasTexture(c); if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;} t.anisotropy=ANISO; return t; }
  /* tekstury w wyższej rozdzielczości: ten sam rysunek ×k plus drobne ziarno (Math.random, żeby nie zmieniać losowania świata) */
  function texHD(w,h,k,draw,grain){ return tex(w*k,h*k,(x,W,Hh)=>{ x.save(); x.scale(k,k); draw(x,w,h); x.restore(); const n=Math.round(W*Hh*(grain||.22)); for(let i=0;i<n;i++){ const v=Math.random()<.5?0:255; x.fillStyle=`rgba(${v},${v},${v},${.03+Math.random()*.09})`; const sz=Math.random()<.85?1:2; x.fillRect(Math.random()*W,Math.random()*Hh,sz,sz); } for(let i=0;i<W*Hh/5200;i++){ const v=Math.random()<.5?20:235; const g=x.createRadialGradient(0,0,0,0,0,1); const px=Math.random()*W, py=Math.random()*Hh, r=6+Math.random()*26; x.save(); x.translate(px,py); x.scale(r,r*(.5+Math.random())); g.addColorStop(0,`rgba(${v},${v},${v},.07)`); g.addColorStop(1,`rgba(${v},${v},${v},0)`); x.fillStyle=g; x.fillRect(-1,-1,2,2); x.restore(); } },true); }
  const noise=(x,w,h,n,a,b,al,s)=>{ for(let i=0;i<n;i++){ const v=Math.floor(R(a,b)); x.fillStyle=`rgba(${v},${v},${v},${al})`; x.fillRect(R(0,w),R(0,h),s||1.5,s||1.5);} };
  const detailTex=tex(256,256,(x,w,h)=>{ x.fillStyle='rgb(158,158,158)'; x.fillRect(0,0,w,h); noise(x,w,h,9000,110,210,.35,2); for(let i=0;i<1400;i++){ const v=Math.floor(R(90,200)); x.strokeStyle=`rgba(${v},${v},${v},.4)`; const px=R(0,w),py=R(0,h); x.beginPath(); x.moveTo(px,py); x.lineTo(px+R(-2,2),py-R(3,7)); x.stroke(); } },true);
  function withDetail(mat,scale,strength){ mat.onBeforeCompile=sh=>{ sh.uniforms.detail={value:detailTex};
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>','#include <project_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;uniform sampler2D detail;').replace('#include <map_fragment>',`#include <map_fragment>\n diffuseColor.rgb*=mix(vec3(1.),texture2D(detail,vWP.xz*${scale.toFixed(3)}).rgb*1.62,${strength.toFixed(2)});`); }; return mat; }
  // siatka terenu 3D
  { const TX0=Math.min(-2100,X0-900),TX1=Math.max(1900,X1+900),TZ0=Math.min(-1850,Z0-900),TZ1=Math.max(1750,Z1+900), S=GW>3000?12:10; const nx=(TX1-TX0)/S, nz=(TZ1-TZ0)/S;
    const geo=new THREE.PlaneGeometry(TX1-TX0,TZ1-TZ0,nx,nz); geo.rotateX(-Math.PI/2); geo.translate((TX0+TX1)/2,0,(TZ0+TZ1)/2);
    const pos=geo.attributes.position, uv=geo.attributes.uv;
    for(let i=0;i<pos.count;i++){ const x=pos.getX(i), z=pos.getZ(i); pos.setY(i,HC(x,z)); uv.setXY(i,clamp((x-X0)/GW,0,1),clamp(1-(z-Z0)/GH,0,1)); }
    geo.computeVertexNormals();
    const grassD=tex(512,512,(x,w,h)=>{ x.fillStyle='rgb(120,128,112)'; x.fillRect(0,0,w,h); for(let i=0;i<26000;i++){ const v=Math.random(); const g=90+v*90, r=g*(.72+Math.random()*.25), b=g*(.5+Math.random()*.2); x.strokeStyle=`rgba(${r|0},${g|0},${b|0},.55)`; x.lineWidth=.8+Math.random(); const px=Math.random()*w, py=Math.random()*h, a=-Math.PI/2+(Math.random()-.5)*1.5, l=3+Math.random()*7; x.beginPath(); x.moveTo(px,py); x.lineTo(px+Math.cos(a)*l,py+Math.sin(a)*l); x.stroke(); } },true); grassD.__nonm=1;
    const gm=new THREE.MeshLambertMaterial({map:groundTex}); if(gm.roughness!==undefined){ gm.roughness=.96; gm.envMapIntensity=.3; } gm.onBeforeCompile=sh=>{ sh.uniforms.detail={value:detailTex}; sh.uniforms.grassD={value:grassD};
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>','#include <project_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;uniform sampler2D detail,grassD;').replace('#include <map_fragment>',`#include <map_fragment>
 diffuseColor.rgb*=mix(vec3(1.),texture2D(detail,vWP.xz*.35).rgb*1.62,.8);
 { float gd=distance(vWP,cameraPosition); float nf=1.-smoothstep(14.,95.,gd); vec3 c0=diffuseColor.rgb; float gr=smoothstep(-.01,.05,c0.g-max(c0.r*.95,c0.b));
   vec3 g1=texture2D(grassD,vWP.xz*.42).rgb, g2=texture2D(grassD,vWP.xz*.071+.37).rgb; vec3 hf=g1*2.05*(.72+.56*g2.g);
   diffuseColor.rgb=mix(c0,c0*mix(vec3(dot(hf,vec3(.333))),hf,.35+.65*gr),nf*(.55+.45*gr)); }`); };
    GROUND=new THREE.Mesh(geo, gm); GROUND.receiveShadow=true; scene.add(GROUND); }

  const JOINTS=[];
  /* ---------- drogi, chodniki ---------- */
  const texMain=texHD(128,256,4,(x,w,h)=>{ x.fillStyle='#4f5153'; x.fillRect(0,0,w,h); noise(x,w,h,3000,60,120,.4); x.fillStyle='rgba(30,30,30,.25)'; x.fillRect(30,0,22,h); x.fillRect(78,0,22,h); x.fillStyle='#ecebe4'; x.fillRect(5,0,3,h); x.fillRect(120,0,3,h); x.fillRect(62,0,4,128); });
  const texLocal=texHD(128,256,4,(x,w,h)=>{ x.fillStyle='#5f6062'; x.fillRect(0,0,w,h); noise(x,w,h,3000,60,125,.4); for(let i=0;i<6;i++){ x.strokeStyle='rgba(25,25,25,.35)'; x.lineWidth=1.2; x.beginPath(); let px=R(10,118),py=R(0,256); x.moveTo(px,py); for(let k=0;k<5;k++){px+=R(-8,8);py+=R(4,14);x.lineTo(px,py);} x.stroke(); } });
  const texTrack=texHD(64,128,4,(x,w,h)=>{ x.fillStyle='#9c8a66'; x.fillRect(0,0,w,h); noise(x,w,h,900,90,160,.4); x.fillStyle='rgba(90,120,60,.6)'; x.fillRect(26,0,12,h); });
  const texPaver=texHD(128,128,4,(x,w,h)=>{ x.fillStyle='#7f7d78'; x.fillRect(0,0,w,h); for(let r=0;r<8;r++)for(let c=0;c<8;c++){ const v=Math.floor(R(132,168)); x.fillStyle=`rgb(${v},${v-3},${v-8})`; const o=(r%2)*8; x.fillRect(((c*16+o)%w)+1,r*16+1,14,14);} });
  const texCurb=texHD(32,64,4,(x,w,h)=>{ x.fillStyle='#bdbab2'; x.fillRect(0,0,w,h); x.fillStyle='#9a978f'; for(let i=0;i<h;i+=16)x.fillRect(0,i,w,1); });
  const texPath=texHD(64,64,4,(x,w,h)=>{ x.fillStyle='#55575a'; x.fillRect(0,0,w,h); noise(x,w,h,900,50,120,.45); });
  function offsetLine(pts,o){ return pts.map((p,i)=>{ const a=pts[Math.max(0,i-1)], b=pts[Math.min(pts.length-1,i+1)]; let tx=b[0]-a[0],tz=b[1]-a[1]; const l=Math.hypot(tx,tz)||1; tx/=l;tz/=l; let s=1; if(i>0&&i<pts.length-1){ const sx=p[0]-a[0],sz=p[1]-a[1],sl=Math.hypot(sx,sz)||1; s=1/Math.max(.55,(-sz/sl)*(-tz)+(sx/sl)*tx); } return [p[0]-tz*o*s,p[1]+tx*o*s]; }); }
  // wstęga dopasowana do terenu (yo = wysokość nad gruntem)
  function ribbon(pts,w,yo,rep,hf){ const HF=hf||H; pts=resample(pts,5); const pos=[],uv=[],idx=[]; let dist=0; const n=pts.length; const L=offsetLine(pts,w/2), Rr=offsetLine(pts,-w/2);
    for(let i=0;i<n;i++){ if(i>0) dist+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]); const hc=HF(pts[i][0],pts[i][1]); const hl=Math.max(HF(L[i][0],L[i][1]),hc-0.6), hr=Math.max(HF(Rr[i][0],Rr[i][1]),hc-0.6);
      pos.push(L[i][0],hl+yo,L[i][1], Rr[i][0],hr+yo,Rr[i][1]); uv.push(0,dist/rep,1,dist/rep); if(i>0){const k=i*2; idx.push(k-2,k,k-1, k-1,k,k+1);} }
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); geo.setIndex(idx); geo.computeVertexNormals(); return geo; }
  const po=(m,f)=>{ m.polygonOffset=true; m.polygonOffsetFactor=-f; m.polygonOffsetUnits=-f*2; return m; };
  const jointMat=po(new THREE.MeshLambertMaterial({color:0x5f6062}),1);
  const roadMat=t=>po(new THREE.MeshPhongMaterial({map:t,side:THREE.DoubleSide,shininess:18,specular:0x222222}),2);
  const matMain=roadMat(texMain), matLocal=roadMat(texLocal), WETM=[matMain,matLocal], matTrack=po(new THREE.MeshLambertMaterial({map:texTrack,side:THREE.DoubleSide}),1);
  const matPaver=po(new THREE.MeshLambertMaterial({map:texPaver,side:THREE.DoubleSide}),3), matCurb=po(new THREE.MeshLambertMaterial({map:texCurb,side:THREE.DoubleSide}),4);
  // kostka „holland” w kolorze cegły z szarymi fugami - wyraźnie inna niż czerwony tartan orlika
  const texPaverRed=texHD(128,128,4,(x,w,h)=>{ x.fillStyle='#8d8a84'; x.fillRect(0,0,w,h); for(let r=0;r<16;r++)for(let c=0;c<8;c++){ const v=Math.floor(R(-12,12)); x.fillStyle=`rgb(${126+v},${72+v},${60+v})`; const o=(r%2)*8; x.fillRect(((c*16+o)%w)+1,r*8+1,14,6);} });
  const matPaverRed=po(new THREE.MeshLambertMaterial({map:texPaverRed,side:THREE.DoubleSide}),3);
  const SIDEWALK=new Set(['Szkolna','Zielona','Spacerowa','Zagrodowa','Sikorskiego','Kwiatowa','Północna','Zacisze','Stodulskiego','Traktorowa','Wiśniowa','Strażacka','Energetyczna','Cmentarna','Parkowa','Południowa']); SIDEWALK.delete('Zacisze');
  const WALKS=[], SWR=[]; let SAD_ORLIK=null;
  // chodniki także na innych zabudowanych ulicach (Reja, Dojazdowa, Sadowiec itd.): tak jak w centrum, gdzie są ≥4 budynki przy jezdni
  ROADS.forEach(r=>{ if(r.main||!r.ext||!r.n||['track','rail','path','foot','srv'].includes(r.t)||SIDEWALK.has(r.n)||!r.pts||r.pts.length<2) return; let cnt=0; const len=lineLen(r.pts), L=len[len.length-1]; for(let d=0;d<L;d+=18){ const q=sampleLine(r.pts,len,d); for(const b of BLD){ if(Math.abs(b.x-q.x)<26&&Math.abs(b.z-q.z)<26){ cnt++; } } } if(cnt>=8) r.sw=true; });
  const PS=[];
  // wiadukt ulicy Wynalazek nad głębokim wykopem kolejowym: płyta, balustrady i filary
  { inDeck(0,0); if(BRG&&!BRG.none){ const cm=new THREE.MeshLambertMaterial({color:0x9a9a96}), cm2=new THREE.MeshLambertMaterial({color:0x7f7f7b});
    const P=u=>[BRG.x+BRG.dx*u,BRG.z+BRG.dz*u], ang=-Math.atan2(BRG.dz,BRG.dx);
    const deckPts=[]; for(let u=-70;u<=70;u+=5) deckPts.push(P(u));
    const slab=new THREE.Mesh(ribbon(deckPts,9.2,-0.55,6,deckY),cm2); scene.add(slab);
    for(let u=-70;u<70;u+=5){ const a=P(u), b=P(u+5), mx=(a[0]+b[0])/2, mz=(a[1]+b[1])/2; if(cutAt(mx,mz)<0.4) continue;
      [1,-1].forEach(sd=>{ const w=new THREE.Mesh(new THREE.BoxGeometry(5.1,0.95,0.35),cm); const px=mx-BRG.dz*sd*4.3, pz=mz+BRG.dx*sd*4.3; w.position.set(px,deckY(mx,mz)+0.5,pz); w.rotation.y=ang; scene.add(w); PS.push({x:px,z:pz,hw:2.6,hd:.25,c:Math.cos(-ang),s:Math.sin(-ang),r:3}); });
      const gh=cutAt(mx,mz); if(gh>2.5){ for(let k=-1;k<=1;k+=2){ const pil=new THREE.Mesh(new THREE.BoxGeometry(1.1,gh+0.8,1.1),cm); pil.position.set(mx-BRG.dz*k*3.2,deckY(mx,mz)-0.6-(gh)/2+0.1,mz+BRG.dx*k*3.2); if(Math.abs(Math.round(u/5))%2===0) scene.add(pil); } } } } }
  // barierki wzdłuż krawędzi wykopu kolejowego (przejście tylko wiaduktem)
  { cutAt(-707,-65); const L=CUTL||[]; const fm=new THREE.MeshLambertMaterial({color:0x6d7176}); const segs=[];
    const step=4; for(let i=0;i<L.length-1;i++){ const a=L[i],b=L[i+1], dl=Math.hypot(b[0]-a[0],b[1]-a[1]); if(dl<.1) continue; const tx=(b[0]-a[0])/dl, tz=(b[1]-a[1])/dl, nx=-tz, nz=tx;
      for(let d=0;d<dl;d+=step){ const x=a[0]+tx*d, z=a[1]+tz*d; if(z>290||z<-1110||x>-480||x<-960) continue; if(cutAt(x,z)<1) continue;
        [1,-1].forEach(sd=>{ let sdist=0; while(sdist<60 && cutAt(x+nx*sd*sdist,z+nz*sd*sdist)>=.8) sdist+=1; sdist+=.6; const px=x+nx*sd*sdist, pz=z+nz*sd*sdist; if(inDeck(px,pz)) return; segs.push([px,pz,Math.atan2(tx,tz)]); }); } }
    const g=new THREE.BoxGeometry(.08,1.1,step+.3); const im=new THREE.InstancedMesh(g,fm,Math.max(1,segs.length)); const mt=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler();
    segs.forEach((o,i)=>{ e.set(0,o[2],0); q.setFromEuler(e); mt.compose(new THREE.Vector3(o[0],H0(o[0],o[1])+.55,o[1]),q,new THREE.Vector3(1,1,1)); im.setMatrixAt(i,mt); PS.push({x:o[0],z:o[1],hw:.3,hd:step/2+.2,c:Math.cos(-o[2]),s:Math.sin(-o[2]),r:step/2+.4}); });
    im.count=segs.length; scene.add(im); }
  const RSEG=new Map(); ROADS.forEach(r=>{ if(r.t==='track')return; for(let i=0;i<r.pts.length-1;i++){ const a=r.pts[i],b=r.pts[i+1]; for(let gx=Math.floor(Math.min(a[0],b[0])/30)-1;gx<=Math.floor(Math.max(a[0],b[0])/30)+1;gx++)for(let gz=Math.floor(Math.min(a[1],b[1])/30)-1;gz<=Math.floor(Math.max(a[1],b[1])/30)+1;gz++){ const k=gx+','+gz; if(!RSEG.has(k))RSEG.set(k,[]); RSEG.get(k).push([r,a,b]); } } });
  const onOtherRoad=(x,z,self,m)=>(RSEG.get(Math.floor(x/30)+','+Math.floor(z/30))||[]).some(([r,a,b])=>r!==self&&segDist(x,z,a[0],a[1],b[0],b[1])<r.w/2+m);
  function splitFree(line,self,m){ const pts=resample(line,1.5), runs=[]; let cur=[]; pts.forEach(p=>{ if(onOtherRoad(p[0],p[1],self,m)){ if(cur.length>1)runs.push(cur); cur=[]; } else cur.push(p); }); if(cur.length>1)runs.push(cur); return runs.filter(r=>lineLen(r).pop()>2.5); }
  ROADS.forEach((r,ri)=>{ const y=r.main?0.1:r.t==='track'?0.03:0.06+ri*0.001;
    const m=new THREE.Mesh(ribbon(r.pts,r.w,y,r.main?14:r.t==='track'?8:10,r.n==='Wynalazek'?DECKH:undefined), r.main?matMain:r.t==='track'?matTrack:matLocal); m.receiveShadow=true; scene.add(m);
    if(!r.main&&r.t!=='track') r.pts.forEach(p=>JOINTS.push([p[0],H(p[0],p[1])+y-0.01,p[1],r.w/2,jointMat]));
    if(r.main||SIDEWALK.has(r.n)||r.sw){ const pts=r.main?r.pts.filter(p=>p[0]>-700&&p[0]<720):r.pts; if(pts.length<2)return;
      [1,-1].forEach(s=>{ const cl=offsetLine(pts,s*(r.w/2+0.15)), sw=offsetLine(pts,s*(r.w/2+1.35));
        splitFree(cl,r,0.9).forEach(run=>{ const m=new THREE.Mesh(ribbon(run,0.3,0.17,2),matCurb); scene.add(m); SWR.push({run,m,w:0.3,y:0.17,rep:2,mat:matCurb,th:.55}); });
        splitFree(sw,r,1.15).forEach(run=>{ const mt=r.n==='Szkolna'?matPaverRed:matPaver; const p=new THREE.Mesh(ribbon(run,2.1,0.14,2.2),mt); p.receiveShadow=true; scene.add(p); let wk=null; if(lineLen(run).pop()>12){ wk={pts:resample(run,4),road:r}; WALKS.push(wk); } SWR.push({run,m:p,w:2.1,y:0.14,rep:2.2,mat:mt,th:1.45,wk,road:r}); }); }); }
  });
  WALKS.forEach(w=>w.len=lineLen(w.pts));
  const railMat=new THREE.MeshLambertMaterial({color:0x6d6e70,side:THREE.DoubleSide}), ballMat=po(new THREE.MeshLambertMaterial({color:0x8a7f72,side:THREE.DoubleSide}),1);
  const sleeperGeo=new THREE.BoxGeometry(2.4,0.16,0.24), sleeperMat=new THREE.MeshLambertMaterial({color:0x5b4a3c});
  const dum=new THREE.Object3D(), col=new THREE.Color();
  RAILS.forEach(pts=>{ const len=lineLen(pts); splitFree(pts,null,.2).forEach(run=>scene.add(new THREE.Mesh(ribbon(run,4.2,0.14,10,HC),ballMat)));
    [-0.75,0.75].forEach(o=>scene.add(new THREE.Mesh(ribbon(offsetLine(pts,o),0.14,0.34,10,HC),railMat)));
    const L=len[len.length-1]; const n=Math.floor(Math.min(L,2600)/0.9); const im=new THREE.InstancedMesh(sleeperGeo,sleeperMat,n);
    for(let i=0;i<n;i++){ const s=sampleLine(pts,len,i*0.9); dum.position.set(s.x,HC(s.x,s.z)+0.22,s.z); dum.rotation.set(0,Math.atan2(-s.tz,s.tx)+Math.PI/2,0); dum.scale.set(1,1,1); dum.updateMatrix(); im.setMatrixAt(i,dum.matrix);} scene.add(im);
    for(let d=0;d<L;d+=55){ const s=sampleLine(pts,len,d); const x=s.x-s.tz*3.6, z=s.z+s.tx*3.6; const pole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,8,6).translate(0,4,0),railMat); pole.position.set(x,HC(x,z),z); scene.add(pole); } });

  { const byMat=new Map(); JOINTS.forEach(J=>{ if(!byMat.has(J[4])) byMat.set(J[4],[]); byMat.get(J[4]).push(J); });
    byMat.forEach((list,mat)=>{ const im=new THREE.InstancedMesh(new THREE.CircleGeometry(1,18).rotateX(-Math.PI/2),mat,list.length); list.forEach((J,i)=>{ dum.position.set(J[0],J[1],J[2]); dum.rotation.set(0,0,0); dum.scale.set(J[3],1,J[3]); dum.updateMatrix(); im.setMatrixAt(i,dum.matrix); }); im.receiveShadow=true; scene.add(im); }); }
  await LP(14);
  /* ---------- budynki ---------- */
  const grid=new Map(); const CELL=24;
  function addSolid(o){ const r=o.r; for(let gx=Math.floor((o.x-r)/CELL);gx<=Math.floor((o.x+r)/CELL);gx++)for(let gz=Math.floor((o.z-r)/CELL);gz<=Math.floor((o.z+r)/CELL);gz++){const k=gx+','+gz;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(o);} }
  PS.forEach(addSolid);
  const near=(x,z)=>grid.get(Math.floor(x/CELL)+','+Math.floor(z/CELL))||[];
  function blocked(x,z,pr,noTree){ for(const o of near(x,z)){ if(o.off||(noTree&&o.tree))continue; if(o.poly){ if(inPoly(x,z,o.poly))return true; continue; } const dx=x-o.x,dz=z-o.z; const lx=dx*o.c+dz*o.s, lz=-dx*o.s+dz*o.c; if(Math.abs(lx)<o.hw+pr&&Math.abs(lz)<o.hd+pr)return true; } return false; }
  const WALLS=['#efe6d4','#e8dcc4','#f4eee2','#dccaa8','#ebd6b4','#d2c6b4','#f2e0bc','#ddd6cc','#cbb393','#e6d0aa','#d8dde2','#e9cba0','#f1e8d8','#c9d2c2','#e3c9b8'];
  const ROOFS=['#9a3d2a','#843424','#5a5f66','#3a3f45','#a64d33','#6e3a28','#4a4f57','#b05b3b','#2d3136','#86402f','#5a412f'];
  const inSchool=(x,z)=>inPoly(x,z,SCHOOL.pts), inKinder=(x,z)=>inPoly(x,z,KINDER.pts);
  const HALL_B=BLD.find(b=>b.isHall)||BLD.find(b=>b.code===5&&Math.max(b.w,b.d)>50);
  const houses=[];
  const CB={}; [['komf',-2198,983],['manu',-2070,938],['tutti',-2048,921],['autop',-1136,686],['hgraf',-1125,695],['dstary',-1180,670],['dsolar',-1210,681],['zuh',-1310,625],['zabdom',-80,17],['przed',-139,-134],['delik',-151,-341],['dworzec',-554,1454],['mineral',-580,1672],['swietl',-710,1630],['orlenShop',-2284,1098],['orlenRoof',-2308,1102],['biedr',-2328,973],['lidl',-2432,1186],['kwiac',-144,-229],['szk3',-88,-49],['w159',-130,73],['w161',-119,66],['w163',-110,64]].forEach(([k,x,z])=>{ let best=null,bd=1e9; BLD.forEach(b=>{ const d=Math.hypot(b.x-x,b.z-z); if(d<bd){bd=d;best=b;} }); if(best&&bd<8){ best.cust=k; CB[k]=best; } });
  if(CB.orlenRoof) CB.orlenRoof.skip=true;
  // domy nachodzące na jezdnię: odsuń od drogi (albo pomiń, gdy trzeba by przesunąć za daleko)
  { const RD=ROADS.filter(r=>!['track','path','footway','steps','cycleway','foot'].includes(r.t)); const nearPt=(r,x,z)=>{ let best=null,bd=1e9; for(let i=0;i<r.pts.length-1;i++){ const a=r.pts[i],b=r.pts[i+1]; const dx=b[0]-a[0],dz=b[1]-a[1],L=dx*dx+dz*dz||1; const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/L,0,1); const px=a[0]+dx*t,pz=a[1]+dz*t; const d=Math.hypot(x-px,z-pz); if(d<bd){bd=d;best=[px,pz,d];} } return best; };
    BLD.forEach(b=>{ if(b.cust||b.skip||b.isHall||b.name==='Lewiatan'||b.name==='Żabka'||b.w*b.d>450)return; let moved=0;
      for(let it=0;it<4;it++){ const c=Math.cos(b.a), sn=Math.sin(b.a); const pts=[]; [-1,-.5,0,.5,1].forEach(u=>[-1,-.5,0,.5,1].forEach(v=>pts.push([b.x+u*b.w/2*c-v*b.d/2*sn,b.z+u*b.w/2*sn+v*b.d/2*c]))); let worst=null;
        RD.forEach(r=>{ if(roadDist(r,b.x,b.z)>Math.hypot(b.w,b.d)/2+r.w/2+2)return; const clr=r.w/2+(r.t==='srv'?.3:.9); pts.forEach(q=>{ const np=nearPt(r,q[0],q[1]); const pen=clr-np[2]; if(pen>0&&(!worst||pen>worst.pen)) worst={pen,np,q}; }); });
        if(!worst)break; let nx=b.x-worst.np[0], nz=b.z-worst.np[1]; const l=Math.hypot(nx,nz)||1; nx/=l; nz/=l; const m=worst.pen+.15; b.x+=nx*m; b.z+=nz*m; if(b.parts) b.parts.forEach(q=>{ q.x+=nx*m; q.z+=nz*m; }); moved+=m; }
      if(moved>7) b.skip=true; }); }
  BLD.forEach((b,bi)=>{ if(b.skip){ b.kind='skip'; return; } const ar=b.w*b.d, ratio=Math.max(b.w,b.d)/Math.min(b.w,b.d);
    // wysokość posadowienia: środek i najniższy narożnik
    const c=Math.cos(b.a), s=Math.sin(b.a); b.hc=H(b.x,b.z); b.hmin=Math.min(...[[1,1],[1,-1],[-1,1],[-1,-1]].map(([u,v])=>H(b.x+u*b.w/2*c-v*b.d/2*s,b.z+u*b.w/2*s+v*b.d/2*c)));
    if(b.name==='shelter'){ b.kind='shelter'; return; }
    if(b.name==='Lewiatan'||b.name==='Żabka'){ b.kind='brand'; addSolid({x:b.x,z:b.z,hw:b.w/2,hd:b.d/2,c,s,r:Math.hypot(b.w,b.d)/2}); return; }
    if(b.cust){ b.kind='cust'; addSolid({x:b.x,z:b.z,hw:b.w/2,hd:b.d/2,c,s,r:Math.hypot(b.w,b.d)/2}); return; }
    if(inKinder(b.x,b.z)||(b.code===5&&inPoly(b.x,b.z,OSPA.pts))){ b.kind=inKinder(b.x,b.z)?'kinderX':'osp'; addSolid({x:b.x,z:b.z,hw:b.w/2,hd:b.d/2,c,s,r:Math.hypot(b.w,b.d)/2}); return; }
    let h,rt,rh,wall,roof,kind='house';
    if(b===HALL_B){ kind='hall'; h=9.5; rt='barrel'; wall='#d4dbe1'; roof='#7b8794'; }
    else if(b.code===5||inSchool(b.x,b.z)){ kind='school'; h=b.lv?b.lv*3.6:7.2; rt='hip'; rh=2.2; wall='#f1e3c4'; roof='#5f6670'; }
    else if(inKinder(b.x,b.z)){ kind='kinder'; h=b.lv?b.lv*3.4:4; rt='hip'; rh=2.4; wall=pick(['#f4d36b','#f2a65a','#9ccfe0']); roof='#c0503a'; }
    else if(b.code===6&&ar>60){ kind='ind'; h=b.lv>1?b.lv*4.2:R(6.5,9); rt='flat'; rh=.5; wall=pick(['#d9dcdc','#c8ccce','#b9c3c9','#e2e0da','#9fa9ae']); roof=pick(['#6e7378','#5a5f66','#7d8389']); }
    else if(b.code===4||b.name){ kind='shop'; h=b.lv?Math.max(4.5,b.lv*3.8):4.8; rt='flat'; rh=.5; wall=pick(['#eceae4','#dcdcd8','#e8dfcf']); roof='#5b6066'; }
    else if(b.code===2){ kind='garage'; h=2.6; rt='gable'; rh=.8; wall=pick(['#bdb6a8','#c9c2b4','#d4cbbb']); roof=pick(['#5a5f66','#6e7378','#7a3226']); }
    else if(b.code===3||ar<42||(ratio>2.3&&ar<140)){ kind='out'; h=R(2.5,3.3); rt='gable'; rh=R(1,1.6); wall=pick(['#b8b0a2','#c9c2b4','#a39a8a','#d4cbbb','#c6b9a3','#9c8466']); roof=pick(['#8d9399','#6e7378','#7a3226','#5a5f66','#6b3a2a']); }
    else if(ar>320){ kind='farm'; h=6.5; rt='gable'; rh=2.4; wall=pick(['#b8bec4','#c9c2b4','#d9d4c8']); roof=pick(['#8d9399','#6e7378']); }
    else { h=b.lv?b.lv*2.9+0.5:(rnd()<.5?3.4:6); rt=rnd()<.6?'hip':'gable'; rh=Math.max(2.2,Math.min(4.2,Math.min(b.w,b.d)*.33)); wall=pick(WALLS); roof=pick(ROOFS); }
    { const rc=roofColor(bi); if(rc&&kind!=='hall'&&kind!=='school'&&kind!=='ind') roof=rc; }
    if(b.name==='Plebania'){ wall='#f2efe8'; roof='#5b3a2c'; }
    /* prawdziwa wysokość budynku z modeli 3D LoD1 (GUGiK): najbliższa bryła w obrębie obrysu */
    if(typeof LOD1==='string'&&kind!=='hall'&&kind!=='school'){ if(!BLD.__lod){ const m=new Map(); LOD1.split(';').forEach(t=>{ const v=t.split(','); const e=[+v[0],+v[1],+v[2]/10]; const k=Math.floor(e[0]/16)+','+Math.floor(e[1]/16); (m.get(k)||m.set(k,[]).get(k)).push(e); }); BLD.__lod=m; }
      const ci=Math.floor(b.x/16), cj=Math.floor(b.z/16), lim=Math.max(4,Math.min(b.w,b.d)/2+1.5); let be=null, bd=lim; for(let i=ci-1;i<=ci+1;i++)for(let j=cj-1;j<=cj+1;j++){ const arr=BLD.__lod.get(i+','+j); if(arr) arr.forEach(e=>{ const d=Math.hypot(e[0]-b.x,e[1]-b.z); if(d<bd){ bd=d; be=e; } }); }
      if(be&&be[2]>=2.2&&be[2]<40){ const total=be[2]; if(rt==='flat'||rt==='barrel'||!rh) h=Math.max(2.4,total-(rh||0)); else { rh=Math.max(.8,Math.min(rh,total*.42)); h=Math.max(2.3,total-rh); } b.lodH=total; } }
    Object.assign(b,{h,rt,rh,wall,roof,kind});
    if(b.parts&&['house','out','farm','garage','shop','ind'].includes(kind)){   // dokładny obrys z OSM: bryła złożona z prostokątów
      const ps=b.parts.slice().sort((p,q)=>q.w*q.d-p.w*p.d);
      ps.forEach((p,k)=>{ const mn=Math.min(p.w,p.d); const prh=kind==='house'?(k?Math.min(rh,Math.max(1.1,mn*.38)):Math.max(2.2,Math.min(4.2,mn*.33))):Math.min(rh,Math.max(.6,mn*.3));
        const hm=Math.min(...[[1,1],[1,-1],[-1,1],[-1,-1]].map(([u,v])=>H(p.x+u*p.w/2*c-v*p.d/2*s,p.z+u*p.w/2*s+v*p.d/2*c)));
        const hp=k&&kind==='house'&&mn<3.2?Math.max(2.6,h-2.6):h;          // małe przybudówki: ganki, wiatrołapy, parterowe dobudowy
        houses.push(Object.assign({},b,{x:p.x,z:p.z,w:p.w,d:p.d,hmin:hm,h:hp,rh:prh,rt:k&&mn<3.2?'flat':rt,isPart:k>0,src:b,parts:null}));
        addSolid({x:p.x,z:p.z,hw:p.w/2,hd:p.d/2,c,s,r:Math.hypot(p.w,p.d)/2}); });
      return; }
    houses.push(b);
    addSolid({x:b.x,z:b.z,hw:b.w/2,hd:b.d/2,c,s,r:Math.hypot(b.w,b.d)/2}); });
  BPOLY.forEach(p=>{ const c=centroid(p.pts); p.hc=H(c[0],c[1]); p.hmin=Math.min(...p.pts.map(v=>H(v[0],v[1]))); addSolid({x:c[0],z:c[1],poly:p.pts,r:Math.max(...p.pts.map(v=>Math.hypot(v[0]-c[0],v[1]-c[1])))}); });
  const plasterTex=texHD(128,128,2,(x,w,h)=>{ x.fillStyle='#d8d8d8'; x.fillRect(0,0,w,h); noise(x,w,h,4000,170,250,.35,1.6); x.fillStyle='rgba(0,0,0,.18)'; x.fillRect(0,h-10,w,10); x.fillStyle='rgba(0,0,0,.08)'; x.fillRect(0,0,w,3); },.3); plasterTex.wrapS=plasterTex.wrapT=THREE.ClampToEdgeWrapping; plasterTex.__nm=1;
  const tileTex=tex(128,128,(x,w,h)=>{ x.fillStyle='#dedede'; x.fillRect(0,0,w,h); for(let r=0;r<h;r+=8){ x.fillStyle='rgba(0,0,0,.22)'; x.fillRect(0,r,w,2); for(let c=(r/8%2)*6;c<w;c+=12){ x.fillStyle='rgba(0,0,0,.12)'; x.fillRect(c,r,1.5,8);} } noise(x,w,h,1200,150,255,.25); },true); tileTex.repeat.set(4,3);
  const boxGeo=new THREE.BoxGeometry(1,1,1).translate(0,.5,0);
  const seamTex=tex(64,64,(x,w,h)=>{ x.fillStyle='#d6d6d6'; x.fillRect(0,0,w,h); for(let i=0;i<w;i+=8){ x.fillStyle='rgba(255,255,255,.55)'; x.fillRect(i,0,1.5,h); x.fillStyle='rgba(0,0,0,.25)'; x.fillRect(i+2,0,1,h); } },true); seamTex.repeat.set(10,3);
  const L2W=(cx,cz,rot)=>(x,z)=>[cx+x*Math.cos(rot)+z*Math.sin(rot), cz-x*Math.sin(rot)+z*Math.cos(rot)];
  function bx(g,w,h,d,x,y,z,mat,noShadow){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y+h/2,z); if(!noShadow){m.castShadow=true;} m.receiveShadow=true; g.add(m); return m; }
  function pl(g,w,h,x,y,z,mat,ry){ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat); m.position.set(x,y,z); if(ry)m.rotation.y=ry; g.add(m); return m; }
  function tri(g,w,h,x,y,z,mat,ry){ const sh=new THREE.Shape([new THREE.Vector2(-w/2,0),new THREE.Vector2(w/2,0),new THREE.Vector2(0,h)]); const m=new THREE.Mesh(new THREE.ShapeGeometry(sh),mat); m.position.set(x,y,z); if(ry)m.rotation.y=ry; m.receiveShadow=true; g.add(m); return m; }
  const EXTRA_TREES=[], LOTS=[], STAIRS=[], LATER=[]; if(MJF) LOTS.push(MJF.front,MJF.side,MJF.yard); if(LPGF) LOTS.push(LPGF.lot); if(CEMF) LOTS.push(CEMF.pad); // LATER: zamiany na modele odłożone do chwili, gdy swapIn jest gotowe // STAIRS: funkcje (x,z)->wysokość podłoża ponad terenem (taras i schody kościoła)
  const stairAt=(x,z)=>{ let h=0; for(const f of STAIRS){ const v=f(x,z); if(v>h)h=v; } return h; };
  const hipGeo=new THREE.ConeGeometry(Math.SQRT1_2,1,4,1).rotateY(Math.PI/4).translate(0,.5,0);
  const gabGeo=(()=>{ const v=[-.5,0,.5,.5,0,.5,.5,1,0, -.5,0,.5,.5,1,0,-.5,1,0, .5,0,-.5,-.5,0,-.5,-.5,1,0, .5,0,-.5,-.5,1,0,.5,1,0, .5,0,.5,.5,0,-.5,.5,1,0, -.5,0,-.5,-.5,0,.5,-.5,1,0];
    const uv=[0,0,1,0,1,1, 0,0,1,1,0,1, 0,0,1,0,1,1, 0,0,1,1,0,1, 0,0,1,0,.5,1, 0,0,1,0,.5,1];
    const ge=new THREE.BufferGeometry(); ge.setAttribute('position',new THREE.Float32BufferAttribute(v,3)); ge.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); ge.computeVertexNormals(); return ge; })();
  const barrelGeo=new THREE.CylinderGeometry(.5,.5,1,18,1,false,0,Math.PI).rotateZ(Math.PI/2);
  const mkIM=(geo,count,map)=>{ const m=new THREE.InstancedMesh(geo,new THREE.MeshLambertMaterial({color:0xffffff,map:map||null}),Math.max(1,count)); m.castShadow=true; m.receiveShadow=true; scene.add(m); return m; };
  const cnt=t=>houses.filter(h=>h.rt===t).length;
  const bodies=mkIM(boxGeo,houses.length,plasterTex), hips=mkIM(hipGeo,cnt('hip'),tileTex), gabs=mkIM(gabGeo,cnt('gable'),tileTex), flats=mkIM(boxGeo,cnt('flat')), barrels=mkIM(barrelGeo,cnt('barrel'));
  const ctr={hip:0,gable:0,flat:0,barrel:0};
  houses.forEach((h,i)=>{ const base=h.hmin-0.5, top=h.hc+h.h; dum.position.set(h.x,base,h.z); dum.rotation.set(0,-h.a,0); dum.scale.set(h.w,top-base,h.d); dum.updateMatrix(); bodies.setMatrixAt(i,dum.matrix); bodies.setColorAt(i,col.set(h.wall));
    dum.position.y=top; const k=ctr[h.rt]++;
    if(h.rt==='hip'){ dum.scale.set(h.w+1,h.rh,h.d+1); dum.updateMatrix(); hips.setMatrixAt(k,dum.matrix); hips.setColorAt(k,col.set(h.roof)); }
    else if(h.rt==='gable'){ const along=h.w>=h.d; dum.rotation.set(0,-h.a+(along?0:Math.PI/2),0); dum.scale.set((along?h.w:h.d)+.8,h.rh,(along?h.d:h.w)+.8); dum.updateMatrix(); gabs.setMatrixAt(k,dum.matrix); gabs.setColorAt(k,col.set(h.roof)); }
    else if(h.rt==='flat'){ dum.scale.set(h.w+.5,h.rh,h.d+.5); dum.updateMatrix(); flats.setMatrixAt(k,dum.matrix); flats.setColorAt(k,col.set(h.roof)); }
    else if(h.rt==='barrel'){ dum.position.y=top-0.01; dum.scale.set(h.w,h.d*0.42,h.d); dum.updateMatrix(); barrels.setMatrixAt(k,dum.matrix); barrels.setColorAt(k,col.set(h.roof)); } });
  const winTex=tex(128,160,(x,w,h)=>{ x.fillStyle='#eeeeea'; x.fillRect(0,0,w,h); x.fillStyle='#c9c9c4'; x.fillRect(5,5,w-10,h-10); const g=x.createLinearGradient(0,10,0,h-10); g.addColorStop(0,'#5d7f9c'); g.addColorStop(.45,'#3c556c'); g.addColorStop(1,'#26323f'); x.fillStyle=g; x.fillRect(10,10,w-20,h-20);
    x.fillStyle='rgba(235,232,220,.28)'; x.beginPath(); x.moveTo(10,h*.42); x.quadraticCurveTo(w*.3,h*.5,w*.28,h-10); x.lineTo(10,h-10); x.fill(); x.beginPath(); x.moveTo(w-10,h*.42); x.quadraticCurveTo(w*.7,h*.5,w*.72,h-10); x.lineTo(w-10,h-10); x.fill();
    x.fillStyle='rgba(255,255,255,.2)'; x.beginPath(); x.moveTo(14,14); x.lineTo(52,14); x.lineTo(14,66); x.fill(); x.fillStyle='#eeeeea'; x.fillRect(w/2-4,6,8,h-12); x.fillRect(6,h*.36,w-12,6); x.fillStyle='rgba(0,0,0,.18)'; x.fillRect(10,10,w-20,3); x.fillRect(10,h*.36+6,w-20,2); x.fillStyle='#dcdcd6'; x.fillRect(0,h-6,w,6); }); winTex.__nonm=1;
  const wins=[], doors=[];
  houses.forEach(h=>{ if(['out','garage','farm','ind'].includes(h.kind)||(h.isPart&&Math.min(h.w,h.d)<3))return; const floors=Math.max(1,Math.round(h.h/3)); const along=h.w>=h.d; const L=along?h.w:h.d, D=along?h.d:h.w;
    const ww=h.kind==='school'||h.kind==='hall'?2.2:1.2;
    let sdDoor=1; if(h.kind==='house'&&!h.isPart){ const nr=nearestRoad(h.x,h.z,r=>r.t!=='track'); if(nr.r){ const q0=nr.r.pts[nr.seg], q1=nr.r.pts[nr.seg+1]; const ex=q1[0]-q0[0], ez=q1[1]-q0[1], EL=ex*ex+ez*ez||1; const tt=clamp(((h.x-q0[0])*ex+(h.z-q0[1])*ez)/EL,0,1); const vx=q0[0]+ex*tt-h.x, vz=q0[1]+ez*tt-h.z; const cc=Math.cos(h.a), ss=Math.sin(h.a); const nlx=along?0:1, nlz=along?1:0; sdDoor=((nlx*cc-nlz*ss)*vx+(nlx*ss+nlz*cc)*vz)>=0?1:-1; } }
    for(let f=0;f<floors;f++){ if(h.kind==='hall'&&f>0)break; const y=h.hc+(h.kind==='hall'?5.8:1.25+f*3); const n=Math.max(2,Math.floor(L/(h.kind==='school'?3.2:3.8)));
      for(let k=0;k<n;k++){ const t=-L/2+(k+.5)*(L/n); [1,-1].forEach(sd=>{ const lx=along?t:sd*(D/2+.03), lz=along?sd*(D/2+.03):t; if(f===0&&k===Math.floor(n/2)&&sd===sdDoor&&h.kind==='house'&&!h.isPart){ doors.push({h,lx,lz,rot:along?(sd>0?0:Math.PI):(sd>0?Math.PI/2:-Math.PI/2)}); return; } wins.push({h,lx,lz,y,rot:along?(sd>0?0:Math.PI):(sd>0?Math.PI/2:-Math.PI/2),ww}); }); } } });
  const winMat=new THREE.MeshPhongMaterial({color:0xffffff,map:winTex,emissive:0x000000,shininess:80,specular:0x666666}); if(winMat.roughness!==undefined){ winMat.roughness=.16; winMat.envMapIntensity=1.5; }
  const winIM=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1.35),winMat,Math.max(1,wins.length)); scene.add(winIM);
  const placeOnWall=(h,lx,lz,y,rot,sx)=>{ const c=Math.cos(h.a), s=Math.sin(h.a); dum.position.set(h.x+lx*c-lz*s,y,h.z+lx*s+lz*c); dum.rotation.set(0,-h.a+rot,0); dum.scale.set(sx,1,1); dum.updateMatrix(); return dum.matrix; };
  wins.forEach((w,i)=>{ winIM.setMatrixAt(i,placeOnWall(w.h,w.lx,w.lz,w.y,w.rot,w.ww)); winIM.setColorAt(i,col.set('#4a5866')); });
  const winLit=wins.map(()=>rnd()<.42);
  const doorIM=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1,2.1),new THREE.MeshLambertMaterial({color:0xffffff}),Math.max(1,doors.length)); scene.add(doorIM);
  doors.forEach((d,i)=>{ doorIM.setMatrixAt(i,placeOnWall(d.h,d.lx,d.lz,d.h.hc+1.05,d.rot,1)); doorIM.setColorAt(i,col.set(pick(['#5b3a24','#3d2a1d','#7a5230','#2f3a44','#6e6e6e']))); });
  function extrude(pts,h,mat,y0){ const sh=new THREE.Shape(pts.map(p=>new THREE.Vector2(p[0],-p[1]))); const geo=new THREE.ExtrudeGeometry(sh,{depth:h,bevelEnabled:false}); geo.rotateX(-Math.PI/2); const m=new THREE.Mesh(geo,mat); m.position.y=y0||0; m.castShadow=true; m.receiveShadow=true; scene.add(m); return m; }
  function edgeWindows(pts,floors,y0,step,wh){ const ccw=polyArea(pts)>0; const list=[];
    for(let i=0;i<pts.length;i++){ const a=pts[i],b=pts[(i+1)%pts.length]; const L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L<5)continue; const tx=(b[0]-a[0])/L,tz=(b[1]-a[1])/L; let nx=tz,nz=-tx; if(!ccw){nx=-nx;nz=-nz;}
      const n=Math.floor(L/step); for(let k=0;k<n;k++){ const t=(k+.5)*L/n; for(let f=0;f<floors;f++) list.push([a[0]+tx*t+nx*.05,y0+f*3.4,a[1]+tz*t+nz*.05,Math.atan2(nx,nz)]); } }
    const im=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.8,wh||1.5),winMat,Math.max(1,list.length)); list.forEach((w,i)=>{ dum.position.set(w[0],w[1],w[2]); dum.rotation.set(0,w[3],0); dum.scale.set(1,1,1); dum.updateMatrix(); im.setMatrixAt(i,dum.matrix); im.setColorAt(i,col.set('#4a5866')); }); scene.add(im); return im; }
  const polyWinIMs=[];
  const APT=BPOLY.find(b=>b.pts[0][0]===-107&&b.pts[0][1]===-222); let APT_DOORS=null, SCHOOL_M=null, SCHOOL_DOOR2=null;
  BPOLY.forEach(p=>{ if(p===CHURCH||p===APT)return; const school=p.code===5; const h=school?7.4:5; const base=p.hmin-0.5; const ph=[];
    ph.push(extrude(p.pts,p.hc+h-base,new THREE.MeshLambertMaterial({color:school?0xf1e3c4:0xe9e4d8,map:plasterTex}),base));
    ph.push(extrude(p.pts,0.6,new THREE.MeshLambertMaterial({color:school?0x5f6670:0x6a6f75}),p.hc+h));
    const wi=edgeWindows(p.pts,school?2:1,p.hc+1.6,school?3.2:3.6); polyWinIMs.push(wi); ph.push(wi);
    if(school) ph.push(extrude(p.pts,0.5,new THREE.MeshLambertMaterial({color:0xe07b39}),p.hc+3.3));
    if(school){ const m=mar(p.pts); const g=new THREE.Group(); g.position.set(m.cx,p.hc,m.cz); g.rotation.y=-m.an; scene.add(g); SCHOOL_M={cx:m.cx,cz:m.cz,an:m.an,hc:p.hc}; LATER.push(()=>swapIn(g,'szkola',ph,{})); } });
  { const p=CHURCH.pts, m=mar(p), hc=CHURCH.hc, base=CHURCH.hmin-0.5;
    const wallM=new THREE.MeshLambertMaterial({color:0xd9d3c8,map:plasterTex}), roofM=new THREE.MeshLambertMaterial({color:0x6e4a3b,map:seamTex}), darkG=new THREE.MeshPhongMaterial({color:0x2c3a46,shininess:90,specular:0x667788}), louver=new THREE.MeshLambertMaterial({color:0x3a3d40});
    const NW=m.d*0.62;
    const ex=Math.cos(m.an)*m.w/2, ez=Math.sin(m.an)*m.w/2; const e1=[m.cx+ex,m.cz+ez], e2=[m.cx-ex,m.cz-ez];
    const te=roadDist(DK,...e1)<roadDist(DK,...e2)?e1:e2; const dl=Math.hypot(te[0]-m.cx,te[1]-m.cz)||1; const dir=[(te[0]-m.cx)/dl,(te[1]-m.cz)/dl], perp=[-dir[1],dir[0]]; const ry=Math.atan2(dir[0],dir[1]);
    // bryła kościoła z Blendera (front z rozetą na -x modelu, czyli od strony DK42)
    const flip=te===e1; const KR=-m.an+(flip?Math.PI:0); const U=[Math.cos(m.an)*(flip?-1:1),Math.sin(m.an)*(flip?-1:1)], V=[-Math.sin(m.an)*(flip?-1:1),Math.cos(m.an)*(flip?-1:1)];
    const kos=modelMesh('kosciol'); if(kos){ kos.position.set(m.cx,hc,m.cz); kos.rotation.y=KR; scene.add(kos); } else { extrude(p,hc+6.5-base,wallM,base); }
    // taras ze schodami przed wejściem (wymiary jak w tools/blender/kosciol.py): da się po nich wejść, boki zamykają balustrady
    { const T=1.0, B0=-1.6, U0=-16.8, TU=U0-4.2, SU=TU-7*.36, V0=-7.4, V1=7.2, VM=-.1, SW=2.3; const cK=Math.cos(KR), sK=Math.sin(KR);
      const loc=(x,z)=>{ const dx=x-m.cx, dz=z-m.cz; return [dx*cK-dz*sK, dx*sK+dz*cK]; }, wld=(u,v)=>[m.cx+u*cK+v*sK, m.cz-u*sK+v*cK];
      STAIRS.push((x,z)=>{ if(Math.abs(x-m.cx)>40||Math.abs(z-m.cz)>40)return 0; const [u,v]=loc(x,z); let top=null;
        if(u>=TU&&u<=U0+.3&&v>=V0&&v<=V1) top=hc+T; else if(u>=SU-.2&&u<TU&&Math.abs(v-VM)<=SW) top=hc+B0+(T-B0)*Math.max(0,(u-SU)/(TU-SU));
        return top===null?0:Math.max(0,top-H(x,z)); });
      const wall=(u0,u1,v0,v1)=>{ const q=wld((u0+u1)/2,(v0+v1)/2); addSolid({x:q[0],z:q[1],hw:(u1-u0)/2,hd:(v1-v0)/2,c:cK,s:-sK,r:Math.hypot(u1-u0,v1-v0)/2+.3}); };
      wall(TU,U0,V0-.1,V0+.1); wall(TU,U0,V1-.1,V1+.1);                 // balustrady boczne tarasu
      wall(TU-.1,TU+.1,V0,VM-SW); wall(TU-.1,TU+.1,VM+SW,V1);           // przednia krawędź tarasu obok schodów
      wall(SU,TU,VM-SW-.08,VM-SW+.08); wall(SU,TU,VM+SW-.08,VM+SW+.08); // poręcze schodów
      // dwuskrzydłowe drzwi, które otwierają się, gdy ktoś podchodzi
      const dm=new THREE.MeshLambertMaterial({color:0x5a3a28,map:tex(64,128,(c,w2,h2)=>{ c.fillStyle='#5a3a28'; c.fillRect(0,0,w2,h2); c.strokeStyle='#3a2418'; c.lineWidth=3; c.strokeRect(6,8,w2-12,h2*.42); c.strokeRect(6,h2*.52,w2-12,h2*.42); c.fillStyle='#c9a24a'; c.fillRect(w2-12,h2*.5,5,10); })});
      const dg=new THREE.Group(); const dp=wld(U0-.2,VM); dg.position.set(dp[0],hc+T,dp[1]); dg.rotation.y=KR; scene.add(dg); const leaves=[];
      [-1,1].forEach(sd=>{ const piv=new THREE.Group(); piv.position.set(0,0,VM*0+sd*1.48); dg.add(piv); const lf=new THREE.Mesh(new THREE.BoxGeometry(.08,2.66,1.46),dm); lf.position.set(0,1.33,-sd*.73); lf.castShadow=true; piv.add(lf); leaves.push({piv,sd}); });
      dg.position.y=hc+T; dg.position.x=dp[0]; dg.position.z=dp[1];
      { const hole=new THREE.Mesh(new THREE.PlaneGeometry(2.96,2.66),new THREE.MeshBasicMaterial({color:0x17120e})); hole.rotation.y=-Math.PI/2; hole.position.set(.05,1.33,0); dg.add(hole); } // ciemne wnętrze za otwartymi drzwiami
      CHURCH_DOOR={leaves,p:dp,cur:0}; } 
    // wolnostojąca dzwonnica z przodu po prawej
    let tx=m.cx+U[0]*-8+V[0]*19, tz=m.cz+U[1]*-8+V[1]*19; if(blocked(tx,tz,3)){ tx=m.cx+U[0]*-8-V[0]*19; tz=m.cz+U[1]*-8-V[1]*19; }
    const dz=modelMesh('dzwonnica'); if(dz){ dz.position.set(tx,H(tx,tz),tz); dz.rotation.y=KR; scene.add(dz); }
    const fg=new THREE.Group(); fg.position.set(te[0]+dir[0]*.62,0,te[1]+dir[1]*.62); fg.rotation.y=ry; scene.add(fg);
    { const tw=null;
      for(let k=0;k<5;k++){ [1,-1].forEach(sd=>{ const d=10+k*3.2; const x=te[0]+dir[0]*d+perp[0]*sd*4.2, z=te[1]+dir[1]*d+perp[1]*sd*4.2; if(!blocked(x,z,.8)&&!roadNearF(x,z,2)) EXTRA_TREES.push({x,z,s:R(.55,.7),con:true,col:'#2d5a2a'}); }); }
      const pk=[[6,-3],[6,-14],[20,-14],[20,-3]].map(([a,b2])=>[te[0]+dir[0]*a+perp[0]*b2,te[1]+dir[1]*a+perp[1]*b2]); if(!pk.some(([x,z])=>roadNearF(x,z,1))){ drape(pk,matPaverRed,0.12,1.2); LOTS.push(pk); }
      const wlk=[[te[0]+dir[0]*1,te[1]+dir[1]*1],[te[0]+dir[0]*26,te[1]+dir[1]*26]]; const wm2=new THREE.Mesh(ribbon(wlk,3.2,.11,2),matPaver); wm2.receiveShadow=true; scene.add(wm2); }
    addSolid({x:tx,z:tz,hw:2.6,hd:2.6,c:1,s:0,r:4});
    // żywopłot z tui i iglaki przed kościołem
    for(let k=0;k<9;k++){ const sd=k%2?1:-1, o=NW/2+2+Math.floor(k/2)*2.4; EXTRA_TREES.push({x:te[0]+dir[0]*7+perp[0]*sd*o,z:te[1]+dir[1]*7+perp[1]*sd*o,s:R(.55,.75),con:true,col:'#2e5427'}); }
    }
  BLD.filter(b=>b.kind==='shelter').forEach(b=>{ const gB=new THREE.Group(); const mm=new THREE.MeshLambertMaterial({color:0x6b7d8c}); const roof=new THREE.Mesh(new THREE.BoxGeometry(4.5,.15,1.8),mm); roof.position.y=2.5; const back=new THREE.Mesh(new THREE.BoxGeometry(4.5,2.3,.08),new THREE.MeshPhongMaterial({color:0xaac4d6,transparent:true,opacity:.45,shininess:90})); back.position.set(0,1.25,-.8); const bench=new THREE.Mesh(new THREE.BoxGeometry(3,.1,.4),new THREE.MeshLambertMaterial({color:0x8a6a4a})); bench.position.set(0,.5,-.5);
    gB.add(roof,back,bench); gB.position.set(b.x,b.hc,b.z); const nr=nearestRoad(b.x,b.z); const a=nr.r.pts[nr.seg],c2=nr.r.pts[nr.seg+1]; gB.rotation.y=-Math.atan2(c2[1]-a[1],c2[0]-a[0]); scene.add(gB); });

  await LP(24);
  /* ---------- Lewiatan, Żabka, paczkomaty ---------- */
  function signTex(text,bg,fg,w,h,font,stripe){ return tex(w,h,(x)=>{ x.fillStyle=bg; x.fillRect(0,0,w,h); if(stripe){ x.fillStyle=stripe; x.fillRect(0,h-h*0.14,w,h*0.14); } x.fillStyle=fg; x.font=font; x.textAlign='center'; x.textBaseline='middle'; x.fillText(text,w/2,h*0.47); }); }
  const glassTex=tex(256,128,(x,w,h)=>{ x.fillStyle='#22313a'; x.fillRect(0,0,w,h); const g2=x.createLinearGradient(0,0,w,h); g2.addColorStop(0,'rgba(255,255,255,.22)'); g2.addColorStop(.5,'rgba(255,255,255,.04)'); g2.addColorStop(1,'rgba(255,255,255,.16)'); x.fillStyle=g2; x.fillRect(0,0,w,h);
    for(let i=0;i<6;i++){ x.fillStyle=['#e9e2c8','#d9c9a2','#c8d4dc','#e6b8a0'][i%4]; x.globalAlpha=.35; x.fillRect(10+i*40,h*.35,30,h*.55); } x.globalAlpha=1; x.fillStyle='#c9cdd0'; for(let i=0;i<=8;i++) x.fillRect(i*w/8-2,0,4,h); x.fillRect(0,0,w,5); x.fillRect(0,h-6,w,6); });
  // ściana frontowa: która krawędź prostokąta patrzy na podaną drogę
  function frontSide(b,road){ const c=Math.cos(b.a), s=Math.sin(b.a); const opts=[[1,0],[-1,0],[0,1],[0,-1]]; let best=null,bd=1e9;
    opts.forEach(([u,v])=>{ const ex=b.x+(u*b.w/2)*c-(v*b.d/2)*s, ez=b.z+(u*b.w/2)*s+(v*b.d/2)*c; const d=roadDist(road,ex,ez); if(d<bd){bd=d;best={u,v,ex,ez};} });
    const nx=best.u*c-best.v*s, nz=best.u*s+best.v*c; const len=best.u?b.d:b.w, dep=best.u?b.w:b.d; return {x:best.ex,z:best.ez,nx,nz,len,dep,rot:Math.atan2(nx,nz)}; }
  function frontPlane(f,y,w,h,mat,out){ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat); m.position.set(f.x+f.nx*(out||.03),y,f.z+f.nz*(out||.03)); m.rotation.y=f.rot; scene.add(m); return m; }
  const brandLights=[]; const shopPaver=po(new THREE.MeshLambertMaterial({map:texPaver,side:THREE.DoubleSide}),3);
  function brandShop(b,o){ const base=b.hmin-0.4, top=b.hc+o.h; const body=new THREE.Mesh(boxGeo,new THREE.MeshLambertMaterial({color:o.wall,map:plasterTex})); body.position.set(b.x,base,b.z); body.rotation.y=-b.a; body.scale.set(b.w,top-base,b.d); body.castShadow=body.receiveShadow=true; scene.add(body);
    const roof=new THREE.Mesh(boxGeo,new THREE.MeshLambertMaterial({color:o.roof})); roof.position.set(b.x,top,b.z); roof.rotation.y=-b.a; roof.scale.set(b.w+.4,.45,b.d+.4); roof.castShadow=true; scene.add(roof);
    const f=frontSide(b,o.road); const y0=b.hc;
    // pas szyldu (attyka) na całą szerokość frontu
    const signMat=new THREE.MeshLambertMaterial({map:signTex(o.text,o.sign,o.signText,1024,128,o.font,o.stripe),emissive:0x000000}); const sm=frontPlane(f,top-0.7,f.len+.2,1.4,signMat,.13); brandLights.push(signMat);
    const band=new THREE.Mesh(new THREE.BoxGeometry(f.len+.4,1.5,.15),new THREE.MeshLambertMaterial({color:o.sign})); band.position.set(f.x+f.nx*.02,top-0.7,f.z+f.nz*.02); band.rotation.y=f.rot; scene.add(band);
    // przeszklona witryna
    const gw=f.len*o.glass; const gl=frontPlane(f,y0+1.55,gw,2.6,new THREE.MeshPhongMaterial({map:glassTex,shininess:110,specular:0x8899aa,emissive:0x000000}),.05);
    // wejście z drzwiami automatycznymi
    const door=frontPlane(f,y0+1.15,2.2,2.3,new THREE.MeshPhongMaterial({color:0x2a3a44,shininess:120,specular:0xaabbcc}),.07);
    const tx=-f.nz, tz=f.nx; door.position.x+=tx*o.doorOff; door.position.z+=tz*o.doorOff;
    // daszek nad wejściem
    let cn=null; if(o.canopy){ cn=new THREE.Mesh(new THREE.BoxGeometry(o.canopy,.18,1.6),new THREE.MeshLambertMaterial({color:o.canopyCol})); cn.position.set(f.x+f.nx*.8+tx*o.doorOff,y0+2.75,f.z+f.nz*.8+tz*o.doorOff); cn.rotation.y=f.rot; cn.castShadow=true; scene.add(cn); }
    f.parts={body,roof,band,gl,door,cn,sm};
    // cokół, schodek i chodnik z kostki przed sklepem
    const plinth=new THREE.Mesh(new THREE.BoxGeometry(f.len+.2,.35,.1),new THREE.MeshLambertMaterial({color:0x6b6e72})); plinth.position.set(f.x+f.nx*.06,y0+.1,f.z+f.nz*.06); plinth.rotation.y=f.rot; scene.add(plinth);
    const apron=[[-f.len/2-1,0],[f.len/2+1,0],[f.len/2+1,o.apron],[-f.len/2-1,o.apron]].map(([u,v])=>[f.x+tx*u+f.nx*v,f.z+tz*u+f.nz*v]); drape(apron,shopPaver,0.12,2.2);
    // dodatki: wózki / stojak z gazetami / kosz
    (o.extras||[]).forEach(e=>{ const ex=f.x+tx*e.u+f.nx*e.v, ez=f.z+tz*e.u+f.nz*e.v; const m=e.mesh(); m.position.set(ex,H(ex,ez),ez); m.rotation.y=f.rot; m.traverse(q=>{if(q.isMesh)q.castShadow=true;}); scene.add(m); });
    if(o.model){ const g=new THREE.Group(); g.position.set(b.x,b.hc,b.z); g.rotation.y=f.rot; scene.add(g); const low=b.hmin-0.4-b.hc;
      swapIn(g,o.model,[body,roof,band,gl,cn].concat(o.hideDoor?[door]:[]),{sx:f.len/o.mL,sz:f.dep/o.mD,low,L:f.len,D:f.dep,after:()=>{ const out=o.signOut||.13; sm.position.set(f.x+f.nx*out-tx*(o.signX||0),b.hc+o.signY,f.z+f.nz*out-tz*(o.signX||0)); sm.scale.set(o.signW/(f.len+.2),(o.signH||1.4)/1.4,1); plinth.visible=false; }}); f.mg=g; }
    b.front=f; return f; }
  const cartRow=()=>{ const g=new THREE.Group(); const mm=new THREE.MeshLambertMaterial({color:0xb9bec2}); for(let i=0;i<4;i++){ const c=new THREE.Mesh(new THREE.BoxGeometry(.6,.55,.9).translate(0,.75,0),new THREE.MeshLambertMaterial({color:0xa9afb4,transparent:true,opacity:.75})); c.position.x=i*.22; g.add(c); } const roof=new THREE.Mesh(new THREE.BoxGeometry(1.8,.06,1.3),mm); roof.position.set(.35,1.9,0); const p1=new THREE.Mesh(new THREE.BoxGeometry(.06,1.9,.06).translate(0,.95,0),mm); p1.position.set(-.5,0,0); const p2=p1.clone(); p2.position.x=1.2; g.add(roof,p1,p2); return g; };
  const binM=()=>{ const g=new THREE.Group(); const b=new THREE.Mesh(new THREE.CylinderGeometry(.25,.22,.8,12).translate(0,.4,0),new THREE.MeshLambertMaterial({color:0x3b4045})); g.add(b); return g; };
  const bikeRack=()=>{ const g=new THREE.Group(); const mm=new THREE.MeshLambertMaterial({color:0x8d949a}); for(let i=0;i<4;i++){ const r=new THREE.Mesh(new THREE.TorusGeometry(.35,.03,6,12,Math.PI),mm); r.position.set(i*.6,0,0); r.rotation.y=Math.PI/2; g.add(r);} return g; };
  const B_LEW=BLD.find(b=>b.name==='Lewiatan'), B_ZAB=BLD.find(b=>b.name==='Żabka');
  const ROAD_SZK=ROADS.find(r=>r.n==='Szkolna'&&roadDist(r,B_LEW.x,B_LEW.z)<30)||nearestRoad(B_LEW.x,B_LEW.z).r;
  const lotPaver=po(new THREE.MeshLambertMaterial({color:0x9a9894,map:texPaver,side:THREE.DoubleSide}),3);
  const LEW_SPOTS=[];
  function bikeM(){ const g=new THREE.Group(); const fm=new THREE.MeshLambertMaterial({color:pick([0xc0392b,0x2f6fb5,0x222222,0xd0d0d0])}), tm=new THREE.MeshLambertMaterial({color:0x111111});
    [-.52,.52].forEach(x=>{ const w=new THREE.Mesh(new THREE.TorusGeometry(.33,.035,6,16),tm); w.position.set(x,.35,0); g.add(w); }); const fr=new THREE.Mesh(new THREE.BoxGeometry(1.05,.05,.05),fm); fr.position.set(0,.6,0); fr.rotation.z=.1; g.add(fr);
    const st=new THREE.Mesh(new THREE.BoxGeometry(.05,.5,.05),fm); st.position.set(-.15,.6,0); g.add(st); const hb=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.5),tm); hb.position.set(.45,.95,0); g.add(hb); return g; }
  function rotFront(b,f){ const c=Math.cos(b.a), s=Math.sin(b.a); let best=null,bd=1e9;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([u,v])=>{ const nx=u*c-v*s, nz=u*s+v*c; if(Math.abs(nx*f.nx+nz*f.nz)>.5)return; const ex=b.x+(u*b.w/2)*c-(v*b.d/2)*s, ez=b.z+(u*b.w/2)*s+(v*b.d/2)*c; const d=nearestRoad(ex,ez,r=>r.t!=='track').d; if(d<bd){bd=d;best={x:ex,z:ez,nx,nz,len:u?b.d:b.w,dep:u?b.w:b.d,rot:Math.atan2(nx,nz)};} }); return best||f; }
  // model 3D z Blendera (tools/blender) -> THREE.Mesh z wypaloną teksturą
  function modelMesh(name){ const M=typeof MODELS!=='undefined'&&MODELS[name]; if(!M)return null; try{
    const raw=atob(M.g), bin=new ArrayBuffer(raw.length), u8=new Uint8Array(bin); for(let i=0;i<raw.length;i++) u8[i]=raw.charCodeAt(i);
    const n=M.n, al=x=>(x+3)&~3; let o=0; const P=new Int16Array(bin,o,n*3); o=al(o+n*6); const N=new Int8Array(bin,o,n*3); o=al(o+n*3); const U=new Uint16Array(bin,o,n*2); o=al(o+n*4); const I=new Uint16Array(bin,o,M.i);
    const pos=new Float32Array(n*3), nor=new Float32Array(n*3), uv=new Float32Array(n*2); const q=M.q||1000; for(let i=0;i<n*3;i++){ pos[i]=P[i]/q; nor[i]=N[i]/127; } for(let i=0;i<n*2;i++) uv[i]=U[i]/65535;
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('normal',new THREE.BufferAttribute(nor,3)); g.setAttribute('uv',new THREE.BufferAttribute(uv,2)); g.setIndex(new THREE.BufferAttribute(new Uint16Array(I),1)); g.computeBoundingSphere();
    const t=new THREE.Texture(); t.flipY=false; t.anisotropy=8; const im=new Image(); im.onload=()=>{ t.image=im; t.needsUpdate=true; }; im.src='data:image/jpeg;base64,'+M.t;
    const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({map:t,color:0xffffff})); m.castShadow=m.receiveShadow=true; return m; }catch(e){ console.warn('model',name,e); return null; } }
  const MPROTO={}; function modelClone(name){ if(!MPROTO[name]) MPROTO[name]=modelMesh(name); const m=MPROTO[name]; return m?m.clone():null; }
  // budynki z Blendera są w paczce doczytywanej - do tego czasu stoi bryła proceduralna, potem zamieniamy ją na model
  function whenModel(name,fn){ const ok=()=>typeof MODELS!=='undefined'&&MODELS[name]; if(ok()){ fn(); return; } const h=()=>{ if(ok()){ window.removeEventListener('modele',h); fn(); } }; window.addEventListener('modele',h); }
  const plinSwap=new THREE.MeshLambertMaterial({color:0x8d8a84});
  function swapIn(g,name,hide,o){ o=o||{}; whenModel(name,()=>{ const m=modelClone(name); if(!m)return; m.scale.set(o.sx||1,o.sy||1,o.sz||1); if(o.y)m.position.y=o.y; g.add(m); hide.forEach(c=>{ if(c)c.visible=false; }); if(o.low!==undefined&&o.low<-.95&&o.L) bx(g,o.L,-.9-o.low,o.D,0,o.low,0,plinSwap); if(o.after)o.after(m); }); }
  const bodyOf=(g,n,keep)=>g.children.slice(0,n).filter(c=>!keep.has(c));
  const LEW_LOT={};
  function buildLewiatan(b){ const f0=rotFront(b,frontSide(b,ROAD_SZK)); const f={...f0,x:2*b.x-f0.x,z:2*b.z-f0.z,nx:-f0.nx,nz:-f0.nz,rot:f0.rot+Math.PI}; const L=f.len, D=f.dep, FZ=D/2; const g=new THREE.Group(); g.position.set(b.x,b.hc,b.z); g.rotation.y=f.rot; scene.add(g); b.front=f;
    const low=b.hmin-0.4-b.hc, WH=3.4, XS=.6*L/16.5, VZ=FZ+2.2, w=L2W(b.x,b.z,f.rot);
    const cream=new THREE.MeshLambertMaterial({color:0xeadfc6,map:plasterTex}), white=new THREE.MeshLambertMaterial({color:0xf4f2ee}), fr=new THREE.MeshLambertMaterial({color:0x3b3a38});
    // bryła budynku: model z Blendera (fallback: prosta bryła)
    const mdl=modelMesh('lewiatan'); if(mdl){ mdl.scale.set(L/16.5,1,D/30); g.add(mdl); }
    else { bx(g,L,WH-low,D,0,low,0,cream); const rf=new THREE.Mesh(gabGeo,new THREE.MeshLambertMaterial({color:0x3d4248,map:tileTex})); rf.rotation.y=Math.PI/2; rf.scale.set(D+1,3.4,L+1); rf.position.y=WH; g.add(rf); bx(g,L/2-XS,3-low,VZ-FZ,(XS+L/2)/2,low,(FZ+VZ)/2,cream); }
    { const c=w((XS+L/2)/2,(FZ+VZ)/2); addSolid({x:c[0],z:c[1],hw:(L/2-XS)/2+.3,hd:(VZ-FZ)/2,c:Math.cos(-f.rot),s:Math.sin(-f.rot),r:6}); }
    // żółty szyld LEWIATAN na attyce przedsionka (z narożnikiem od ulicy)
    const lewTex=tex(1024,150,(x,W,h)=>{ x.fillStyle='#f6c315'; x.fillRect(0,0,W,h); x.fillStyle='#e3a50f'; x.fillRect(0,h-10,W,10); x.textBaseline='middle'; x.textAlign='center'; const lx=W*0.17; x.fillStyle='#173e93'; x.beginPath(); x.ellipse(lx,h/2-4,52,50,0,0,7); x.fill(); x.fillStyle='#f6c315'; x.font='italic 900 82px Barlow, Arial'; x.fillText('L',lx-2,h/2-2); x.fillStyle='#173e93'; x.font='italic 900 104px Barlow, Arial'; x.textAlign='left'; x.fillText('LEWIATAN',lx+70,h/2-2); });
    const signM=new THREE.MeshLambertMaterial({map:lewTex,emissive:0x000000}); brandLights.push(signM); const yel=new THREE.MeshLambertMaterial({color:0xf6c315});
    const bx0=XS-.2, bx1=L/2+.36, bl=bx1-bx0; bx(g,bl,1.1,.3,(bx0+bx1)/2,2.85,VZ+.5,yel); pl(g,bl,1.1,(bx0+bx1)/2,3.4,VZ+.66,signM);
    bx(g,.3,1.1,VZ-FZ+.6,bx1-.15,2.85,(FZ+VZ)/2+.1,yel); const sideT=tex(256,150,(x,W,h)=>{ x.fillStyle='#f6c315'; x.fillRect(0,0,W,h); x.fillStyle='#173e93'; x.beginPath(); x.ellipse(W/2,h/2-4,52,50,0,0,7); x.fill(); x.fillStyle='#f6c315'; x.font='italic 900 82px Barlow, Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('L',W/2-2,h/2-2); });
    const sM=new THREE.MeshLambertMaterial({map:sideT}); brandLights.push(sM); pl(g,VZ-FZ+.6,1.1,bx1+.01,3.4,(FZ+VZ)/2+.1,sM,Math.PI/2);
    // witryna: wnętrze widoczne przez szybę, rama, drzwi przesuwne
    const ex0=L/2-3.05; { const wD=L2W(b.x,b.z,f.rot); b.door=wD(ex0,VZ+1.3); b.doorF=wD(ex0,VZ+.3); b.doorOut=wD(ex0,VZ+2.6); }
    { const SW=4.0, SH=2.7, zf=VZ+.03;
      const inside=tex(512,320,(x,W,h)=>{ const gr=x.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#d9dde0'); gr.addColorStop(.5,'#c2c7ca'); gr.addColorStop(1,'#8d9296'); x.fillStyle=gr; x.fillRect(0,0,W,h);
        for(let i=0;i<5;i++){ x.fillStyle='rgba(255,255,250,.9)'; x.fillRect(30+i*100,14,60,6); }
        const C=['#d8452a','#f2c230','#3a7bd5','#5aa34a','#e86aa0','#f5f5f0','#ff8c1a'];
        [[20,150],[150,120],[300,150],[420,110]].forEach(([sx,sw])=>{ x.fillStyle='#9aa0a6'; x.fillRect(sx,70,sw,190); for(let r=0;r<4;r++){ for(let k=0;k<sw-8;k+=9){ x.fillStyle=C[(k*7+r*3+sx)%C.length]; x.fillRect(sx+4+k,80+r*45,7,30); } x.fillStyle='#6d7276'; x.fillRect(sx,112+r*45,sw,4); } });
        const rf=x.createLinearGradient(0,0,W,h); rf.addColorStop(0,'rgba(255,255,255,.28)'); rf.addColorStop(.35,'rgba(255,255,255,0)'); rf.addColorStop(.6,'rgba(255,255,255,.12)'); rf.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=rf; x.fillRect(0,0,W,h); });
      const gm=new THREE.MeshLambertMaterial({map:inside,emissive:0x2a2a28,emissiveMap:inside}); brandLights.push(gm);
      pl(g,SW,SH,ex0,SH/2,VZ+.015,gm);
      bx(g,SW+.16,.12,.14,ex0,SH-.06,zf,fr,true); bx(g,SW+.16,.1,.14,ex0,0,zf,fr,true); [-SW/2,SW/2,-.95,.95].forEach(u=>bx(g,.1,SH,.14,ex0+u,0,zf,fr,true)); bx(g,SW,.09,.12,ex0,2.22,zf,fr,true);
      const leafG=new THREE.MeshPhongMaterial({color:0x9fb8c4,transparent:true,opacity:.22,shininess:120,specular:0xffffff});
      [-.47,.47].forEach(u=>{ pl(g,.9,2.15,ex0+u,1.08,zf+.04,leafG); bx(g,.05,2.15,.05,ex0+u+(u<0?.43:-.43),0,zf+.06,fr,true); bx(g,.9,.05,.05,ex0+u,2.12,zf+.06,fr,true); bx(g,.9,.05,.05,ex0+u,.03,zf+.06,fr,true); });
      const mat=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.2).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0x2a2a2c})); mat.position.set(ex0,.15,VZ+.75); g.add(mat);
      // baner „Wybieram lokalne” nad drzwiami
      const ban=tex(256,48,(x,W,h)=>{ x.fillStyle='#f4f1e8'; x.fillRect(0,0,W,h); x.fillStyle='#173e93'; x.font='italic 700 26px Barlow, Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('Wybieram lokalne',W/2,h/2+1); });
      pl(g,1.8,.34,ex0,2.45,zf+.08,new THREE.MeshLambertMaterial({map:ban}));
      // duże plakaty z jedzeniem po lewej i wąski po prawej
      const food=(seed)=>tex(128,300,(x,W,h)=>{ x.fillStyle='#fff3dc'; x.fillRect(0,0,W,h); const C=['#c8452c','#e8a33a','#6c9c3c','#f0d27a','#8a4a2b','#e66b3d']; for(let i=0;i<9;i++){ x.fillStyle=C[(i+seed)%C.length]; x.beginPath(); x.ellipse(20+((i*37+seed*11)%90),50+((i*53+seed*7)%210),18+(i%3)*8,14+(i%2)*9,i,0,7); x.fill(); } x.fillStyle='#f6c315'; x.fillRect(0,h-46,W,46); x.fillStyle='#173e93'; x.font='800 24px Barlow, Arial'; x.textAlign='center'; x.fillText('ŚWIEŻE',W/2,h-16); });
      [[XS+.75,0],[XS+1.8,2]].forEach(([u,s])=>{ bx(g,1.0,2.4,.08,u,.05,VZ+.02,fr,true); pl(g,.9,2.3,u,1.25,VZ+.07,new THREE.MeshLambertMaterial({map:food(s)})); });
      bx(g,.62,2.0,.08,L/2-.45,.2,VZ+.02,fr,true); pl(g,.54,1.9,L/2-.45,1.2,VZ+.07,new THREE.MeshLambertMaterial({map:food(4)})); }
    // szyld „Marczak” na szczycie skrzydła zachodniego + tablica z ogłoszeniami i flaga
    { const xm=(-L/2+XS)/2; const mT=tex(512,384,(x,W,h)=>{ x.clearRect(0,0,W,h); x.fillStyle='#d2232a'; x.beginPath(); x.moveTo(W/2-120,150); x.bezierCurveTo(W/2-90,40,W/2-20,60,W/2,140); x.bezierCurveTo(W/2+20,60,W/2+90,40,W/2+120,150); x.bezierCurveTo(W/2+60,110,W/2+20,150,W/2,215); x.bezierCurveTo(W/2-20,150,W/2-60,110,W/2-120,150); x.fill();
        x.font='italic 700 108px Georgia, serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('Marczak',W/2,300); },true);
      pl(g,3.0,2.25,xm,4.25,FZ+.04,new THREE.MeshLambertMaterial({map:mT,transparent:true,alphaTest:.3}));
      const board=tex(128,160,(x,W,h)=>{ x.fillStyle='#d9c08a'; x.fillRect(0,0,W,h); ['#fff','#ffe08a','#bfe3ff','#ffd1d1','#fff'].forEach((c,i)=>{ x.fillStyle=c; x.fillRect(8+(i%2)*58,8+Math.floor(i/2)*50,52,44); }); x.strokeStyle='#7a5a2a'; x.lineWidth=8; x.strokeRect(0,0,W,h); });
      pl(g,1.1,1.4,-1.4,1.6,FZ+.04,new THREE.MeshLambertMaterial({map:board}));
      const fp=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,1.6,6),white); fp.position.set(-.1,2.9,FZ+.5); fp.rotation.x=.7; g.add(fp);
      const flag=new THREE.Mesh(new THREE.PlaneGeometry(.9,.55),new THREE.MeshLambertMaterial({map:tex(64,40,(x,W,h)=>{ x.fillStyle='#fff'; x.fillRect(0,0,W,h/2); x.fillStyle='#dc143c'; x.fillRect(0,h/2,W,h/2); }),side:THREE.DoubleSide})); flag.position.set(.35,3.05,FZ+.95); flag.rotation.set(.7,Math.PI/2,0); g.add(flag); }
    // czerwone kosze, szafka energetyczna, rowery
    const red=new THREE.MeshLambertMaterial({color:0xc62a24}); bx(g,.5,1.0,.5,XS-.2,0,VZ+.5,red); bx(g,.5,1.0,.5,L/2+.6,0,VZ+.6,red);
    bx(g,.8,1.7,.5,L/2+.45,0,FZ-1.2,new THREE.MeshLambertMaterial({color:0xd6d8d6}));
    for(let k=0;k<4;k++){ const bk=bikeM(); bk.position.set(-.9-k*.7,0,FZ+.7); bk.rotation.y=Math.PI/2+.25; g.add(bk); }
    g.traverse(o=>{ if(o.isMesh&&o.geometry.type!=='PlaneGeometry')o.castShadow=true; });
    // ---- parking z ciemnej kostki: od ulicy aż za tył sklepu, tuje wzdłuż lewej krawędzi, płot z tyłu ----
    const LZ=24, XB=-L/2-2.2; let XR=L/2+1; for(let x=L/2+1;x<L/2+20;x+=.5){ const q=w(x,FZ+LZ*.5), q2=w(x,FZ+LZ-1); const nr=nearestRoad(q[0],q[1],r=>r.t!=='track'), nr2=nearestRoad(q2[0],q2[1],r=>r.t!=='track'); if(nr.d<nr.r.w/2+.6||nr2.d<nr2.r.w/2+.6)break; XR=x; }
    const darkPav=po(new THREE.MeshLambertMaterial({color:0x5f6165,map:texPaver,side:THREE.DoubleSide}),3);
    const lot=[[XB,FZ],[XR,FZ],[XR,FZ+LZ],[XB,FZ+LZ]].map(([x,z])=>w(x,z)); drape(lot,darkPav,0.12,2.2); LOTS.push(lot); LEW_LOT.poly=lot;
    const redPav=po(new THREE.MeshLambertMaterial({color:0xb4584a,map:texPaver,side:THREE.DoubleSide}),4);
    drape([[XR-2.2,VZ+2.5],[XR,VZ+2.5],[XR,FZ+LZ],[XR-2.2,FZ+LZ]].map(([x,z])=>w(x,z)),redPav,0.14,2.2);
    // tuje (żywopłot) - stożki instancjonowane
    { const geo=new THREE.CylinderGeometry(.2,.62,1,9,3).translate(0,.5,0), m=new THREE.MeshLambertMaterial({color:0xffffff}); const pts=[]; for(let x=XB+.6;x<XR-2.6;x+=.95) pts.push([x,FZ+LZ+.35]);
      const im=new THREE.InstancedMesh(geo,m,pts.length); const M4=new THREE.Matrix4(), q=new THREE.Quaternion(), sc=new THREE.Vector3(), ps=new THREE.Vector3(), cl=new THREE.Color();
      pts.forEach(([x,z],i)=>{ const p=w(x,z), hh=R(3.6,4.6); ps.set(p[0],H(p[0],p[1])-.1,p[1]); sc.set(R(.9,1.1),hh,R(.9,1.1)); M4.compose(ps,q,sc); im.setMatrixAt(i,M4); im.setColorAt(i,cl.setHSL(R(.26,.31),R(.38,.5),R(.24,.3))); });
      im.castShadow=im.receiveShadow=true; scene.add(im); const a=w((XB+XR-2.6)/2,FZ+LZ+.35); addSolid({x:a[0],z:a[1],hw:(XR-2.6-XB)/2,hd:.7,c:Math.cos(-f.rot),s:Math.sin(-f.rot),r:(XR-XB)/2+2}); }
    // płot z prefabrykatów betonowych z tyłu parkingu
    { const pf=tex(128,96,(x,W,h)=>{ x.fillStyle='#b9b6ae'; x.fillRect(0,0,W,h); for(let r=0;r<4;r++){ x.fillStyle='#a9a69e'; x.fillRect(0,r*24+20,W,4); } for(let i=0;i<40;i++){ x.fillStyle='rgba(90,90,85,.15)'; x.fillRect(Math.random()*W,Math.random()*h,3,3); } });
      const fm=new THREE.MeshLambertMaterial({map:pf}); const fg=new THREE.Group(); const c=w(XB-.3,FZ+LZ/2); fg.position.set(c[0],H(c[0],c[1]),c[1]); fg.rotation.y=f.rot+Math.PI/2; scene.add(fg);
      for(let u=-LZ/2;u<LZ/2;u+=2.4){ bx(fg,2.3,1.8,.08,u+1.2,0,0,fm); bx(fg,.16,2.0,.16,u,0,0,fm); } addSolid({x:c[0],z:c[1],hw:.25,hd:LZ/2,c:Math.cos(-f.rot),s:Math.sin(-f.rot),r:LZ/2+1}); }
    // latarnia i dwa maszty przy ulicy (narożnik przy tujach)
    { const p=w(XR-1.2,FZ+LZ-.8), y=H(p[0],p[1]); const pm=new THREE.MeshLambertMaterial({color:0xe9ebed}), lm=new THREE.MeshLambertMaterial({color:0x6a7076});
      [[-.9,9.5],[.3,9]].forEach(([o,hh])=>{ const q=w(XR-1.2+o,FZ+LZ-.9); const m=new THREE.Mesh(new THREE.CylinderGeometry(.05,.08,hh,8).translate(0,hh/2,0),pm); m.position.set(q[0],H(q[0],q[1]),q[1]); m.castShadow=true; scene.add(m); });
      const q=w(XR-1.4,FZ+LZ-4.5); const lp=new THREE.Mesh(new THREE.CylinderGeometry(.07,.11,6.5,8).translate(0,3.25,0),lm); lp.position.set(q[0],H(q[0],q[1]),q[1]); scene.add(lp); const hd=new THREE.Mesh(new THREE.BoxGeometry(.7,.14,.45),lm); hd.position.set(q[0],H(q[0],q[1])+6.5,q[1]); hd.rotation.y=f.rot; scene.add(hd); }
    // paczkomat w lewym tylnym rogu parkingu (przy płocie i tujach), front w stronę parkingu
    { const p=w(XB+.55,FZ+LZ-3.4); LEW_LOT.locker={x:p[0],z:p[1],ry:f.rot+Math.PI/2}; }
    // miejsca parkingowe: wzdłuż tui (przodem do żywopłotu) i przy płocie z tyłu
    [-6.9,-3.7,-.5,2.7,5.9].forEach((x,i)=>{ const q=w(x+R(-.3,.3),FZ+LZ-3.1); LEW_SPOTS.push({x:q[0],z:q[1],h:Math.atan2(f.nz,f.nx)+R(-.05,.05)}); });
    [[XB+2.8,FZ+9],[XB+2.8,FZ+12.2]].forEach(([x,z])=>{ const q=w(x,z); LEW_SPOTS.push({x:q[0],z:q[1],h:Math.atan2(Math.sin(f.rot),-Math.cos(f.rot))}); });
    { const q=w(XB+4.6,FZ+LZ-4.2); LEW_LOT.van={x:q[0],z:q[1],h:Math.atan2(-f.nz,-f.nx)}; }
    LEW_LOT.f=f; LEW_LOT.w=w; LEW_LOT.XB=XB; LEW_LOT.XR=XR; LEW_LOT.FZ=FZ; LEW_LOT.LZ=LZ;
  }
  function buildZabka(b){ const f=rotFront(b,frontSide(b,DK)); const L=f.len, D=f.dep, FZ=D/2; const g=new THREE.Group(); g.position.set(b.x,b.hc,b.z); g.rotation.y=f.rot; scene.add(g); b.front=f;
    const low=b.hmin-0.4-b.hc, G1=3.3, G2=2.9;
    const light=new THREE.MeshLambertMaterial({color:0xe9e9e7,map:plasterTex}), darkC=new THREE.MeshLambertMaterial({color:0x4b4f53}), white=new THREE.MeshLambertMaterial({color:0xf3f3f1,map:plasterTex}), brownC=new THREE.MeshLambertMaterial({color:0x6a5146}), roofM=new THREE.MeshLambertMaterial({color:0x3b4045,map:seamTex}), green=new THREE.MeshLambertMaterial({color:0x1f8f3d}), glassP=new THREE.MeshPhongMaterial({map:glassTex,shininess:110,specular:0x8899aa});
    bx(g,L,G1-low,D,0,low,0,light); bx(g,L,G1,.14,0,0,FZ+.07,darkC);
    pl(g,L*0.66,2.25,-L*0.05,1.25,FZ+.15,glassP); bx(g,1.3,2.5,.12,L/2-1.6,0,FZ+.16,green);
    const zTex=tex(1024,96,(x,w,h)=>{ x.fillStyle='#1d8f3e'; x.fillRect(0,0,w,h); x.fillStyle='#ffffff'; x.textBaseline='middle'; x.textAlign='center'; x.font='italic 800 78px Barlow, Arial'; x.fillText('żabka',w*.5,h/2); x.font='600 34px Barlow, Arial'; x.fillText('café',w*.86,h/2); x.font='600 30px Barlow, Arial'; x.fillText('6-23/7',w*.1,h/2); });
    const zM=new THREE.MeshLambertMaterial({map:zTex,emissive:0x000000}); brandLights.push(zM); bx(g,L*0.82,.75,.22,L*0.04,2.5,FZ+.2,green); const zSign=pl(g,L*0.82,.75,L*0.04,2.875,FZ+.32,zM); const zN0=g.children.length;
    // balkon na całą szerokość z przeszkloną balustradą, ciemny słup na narożniku
    bx(g,L+.4,.25,1.9,0,G1,FZ+.85,darkC); bx(g,.55,G1,.55,-L/2+.35,0,FZ+1.45,darkC);
    pl(g,L+.3,1.0,0,G1+.75,FZ+1.78,new THREE.MeshPhongMaterial({color:0xbfd8e6,transparent:true,opacity:.35,shininess:100,side:THREE.DoubleSide}));
    bx(g,L+.3,.05,.06,0,G1+1.25,FZ+1.78,new THREE.MeshLambertMaterial({color:0x8d949a}),true);
    // piętro: białe, z brązowym panelem i dużym oknem, cofnięte o metr
    const UZ=-1, UD=D-2; bx(g,L-.6,G2,UD,0,G1+.25,UZ,white); bx(g,2.3,G2,.1,-L/2+1.7,G1+.25,UZ+UD/2+.05,brownC);
    pl(g,3.2,2.1,L*0.1,G1+1.5,UZ+UD/2+.06,new THREE.MeshPhongMaterial({color:0x2a3640,shininess:110,specular:0x8899aa}));
    pl(g,1.0,1.0,L/2-2.2,G1+1.9,UZ+UD/2+.06,new THREE.MeshPhongMaterial({color:0x2a3640,shininess:110}));
    const rf=new THREE.Mesh(gabGeo,roofM); rf.scale.set(L+.6,3.8,UD+1.2); rf.position.set(0,G1+.25+G2,UZ); rf.castShadow=true; g.add(rf);
    tri(g,UD+.6,3.6,L/2-.29,G1+.25+G2,UZ,white,Math.PI/2); tri(g,UD+.6,3.6,-L/2+.29,G1+.25+G2,UZ,white,-Math.PI/2);
    // pylon z szyldem przy drodze
    const pole=new THREE.Group(); pole.position.set(L/2+4.5,0,FZ+6.5); g.add(pole); bx(pole,.12,5.2,.12,0,0,0,new THREE.MeshLambertMaterial({color:0x3c4146}));
    const pTex=tex(256,128,(x,w,h)=>{ x.fillStyle='#ffffff'; x.fillRect(0,0,w,h); x.fillStyle='#1d8f3e'; rr(x,6,6,w-12,h-12,46); x.fill(); x.fillStyle='#fff'; x.font='italic 800 64px Barlow, Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('żabka',w/2,h/2); });
    { const keepZ=new Set([zSign]); swapIn(g,'zabka2',g.children.filter(c=>!keepZ.has(c)),{sx:L/14.5,sz:D/13.5,low,L,D,after:()=>{ zSign.position.set(4.0*L/14.5,2.9,FZ+.64); zSign.scale.set(.622,1.067,1); }}); }
    const pM=new THREE.MeshLambertMaterial({map:pTex,emissive:0x000000}); brandLights.push(pM); bx(pole,1.8,.9,.12,0,4.3,0,green); pl(pole,1.8,.9,0,4.75,.07,pM); pl(pole,1.8,.9,0,4.75,-.07,pM,Math.PI);
    bx(pole,1.6,.45,.06,0,3.3,0,new THREE.MeshLambertMaterial({color:0xf2f2f2}));
    g.traverse(o=>{ if(o.isMesh&&o.geometry.type!=='PlaneGeometry'&&o.geometry.type!=='ShapeGeometry')o.castShadow=true; });
    const w=L2W(b.x,b.z,f.rot); const ap=[[-L/2-2,FZ],[L/2+2,FZ],[L/2+2,FZ+3],[-L/2-2,FZ+3]].map(([x,z])=>w(x,z)); drape(ap,lotPaver,0.12,2.2); LOTS.push(ap);
  }
  function buildApteka(p){ const m=mar(p.pts); const road=nearestRoad(m.cx,m.cz,r=>r.t!=='track').r; const f=frontSide({x:m.cx,z:m.cz,w:m.w,d:m.d,a:m.an},road); const L=f.len, D=f.dep;
    const base=p.hmin-0.6, top=p.hc+5.4; const must=new THREE.MeshLambertMaterial({color:0xdcb246,map:plasterTex}), roofM=new THREE.MeshLambertMaterial({color:0x26282b,map:tileTex});
    const body0=extrude(p.pts,top-base,must,base);
    const sk=new THREE.Mesh(hipGeo,roofM); sk.position.set(m.cx,top-.3,m.cz); sk.rotation.y=-m.an; sk.scale.set(m.w+2.4,1.3,m.d+2.4); sk.castShadow=true; scene.add(sk);
    const up=new THREE.Mesh(hipGeo,roofM); up.position.set(m.cx,top+.6,m.cz); up.rotation.y=-m.an; up.scale.set(m.w+.6,2.6,m.d+.6); up.castShadow=true; scene.add(up);
    const g=new THREE.Group(); g.position.set(m.cx,p.hc,m.cz); g.rotation.y=f.rot; scene.add(g); const FZ=D/2; const keepA=new Set();
    // komin z cegły
    bx(g,.9,3.6,.9,-L*0.2,top-p.hc+.2,-D*0.15,new THREE.MeshLambertMaterial({color:0x8e4a33}));
    // daszek nad wejściem do apteki z czerwonym napisem
    const cx=L/2-3.2; const cr=new THREE.Mesh(gabGeo,roofM); cr.rotation.y=Math.PI/2; cr.scale.set(3.4,1.6,4.6); cr.position.set(cx,3.0,FZ+1.3); cr.castShadow=true; g.add(cr);
    [-2,2].forEach(o=>bx(g,.16,3.0,.16,cx+o,0,FZ+2.8,new THREE.MeshLambertMaterial({color:0x2b2d30})));
    const aTex=tex(512,128,(x,w,h)=>{ x.clearRect(0,0,w,h); x.fillStyle='#e8eef0'; x.fillRect(0,0,w,h); x.fillStyle='#d0262d'; x.font='700 92px Barlow, Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('APTEKA',w/2,h/2+4); });
    const aM=new THREE.MeshLambertMaterial({map:aTex,emissive:0x000000}); brandLights.push(aM); const aSign=pl(g,2.4,.6,cx,2.6,FZ+.03,aM); keepA.add(aSign);
    pl(g,1.6,2.3,cx,1.15,FZ+.03,new THREE.MeshPhongMaterial({map:glassTex,shininess:100}));
    // okna z różowymi plakatami, drzwi niższej kondygnacji
    const pinkW=tex(64,64,(x,w,h)=>{ x.fillStyle='#f1f1ee'; x.fillRect(0,0,w,h); x.fillStyle='#d64a7c'; x.fillRect(6,10,w-12,h-20); });
    for(let x=-L/2+3;x<cx-3;x+=3.4) pl(g,1.3,1.1,x,2.2,FZ+.03,new THREE.MeshLambertMaterial({map:pinkW}));
    pl(g,1.1,2.1,-L/2+1.6,p.hmin-p.hc+1.05,FZ+.03,new THREE.MeshLambertMaterial({color:0xe9e9e6}));
    // poręcze i rampa
    const railM=new THREE.MeshLambertMaterial({color:0x1f2124});
    bx(g,L-4,.05,.05,-1.5,1.0,FZ+1.4,railM,true); for(let x=-L/2+1;x<L/2-4;x+=1.5) bx(g,.05,1.0,.05,x,0,FZ+1.4,railM,true);
    bx(g,6,.05,.05,L/2+3,.9,FZ+1.2,railM,true); bx(g,6,.05,.05,L/2+3,.9,FZ+2.6,railM,true);
    // model z Blendera (tools/blender/budynki.py: osrodek) - taras na wysokości FL, ganek z dwojgiem drzwi
    const FL=.95, TZ=FZ+3.3, PC=2.0, SX=1.9, wA=L2W(m.cx,m.cz,f.rot); const cR=Math.cos(f.rot), sR=Math.sin(f.rot); const locA=(x,z)=>{ const dx=x-m.cx, dz=z-m.cz; return [dx*cR-dz*sR, dx*sR+dz*cR]; };
    const winIM=edgeWindows(p.pts,1,p.hc+2.2,4.2,1.2); polyWinIMs.push(winIM);
    STAIRS.push((x,z)=>{ if(Math.abs(x-m.cx)>30||Math.abs(z-m.cz)>30||!MODELS.osrodek)return 0; const [u,v]=locA(x,z); let top=null;
      if(u>=-4&&u<=L/2-.4&&v>=FZ-.3&&v<=TZ) top=p.hc+FL; else if(Math.abs(u-PC)<=SX&&v>TZ&&v<=TZ+1.15) top=p.hc+FL*(1-(v-TZ)/1.15);
      return top===null?0:Math.max(0,top-H(x,z)); });
    const railA=[], wallA=(u0,u1,v0,v1)=>{ const q=wA((u0+u1)/2,(v0+v1)/2); const o={x:q[0],z:q[1],hw:(u1-u0)/2,hd:(v1-v0)/2,c:Math.cos(-f.rot),s:Math.sin(-f.rot),r:Math.hypot(u1-u0,v1-v0)/2+.3,off:true}; addSolid(o); railA.push(o); }; // poręcze działają dopiero z modelem
    wallA(-4,PC-SX,TZ-.12,TZ+.02); wallA(PC+SX,L/2-.3,TZ-.12,TZ+.02); wallA(-4.1,-3.9,FZ,TZ); wallA(L/2-.45,L/2-.25,FZ,TZ); wallA(PC-SX-.05,PC-SX+.05,TZ,TZ+1.1); wallA(PC+SX-.05,PC+SX+.05,TZ,TZ+1.1);
    swapIn(g,'osrodek',g.children.filter(c=>!keepA.has(c)).concat([body0,sk,up,winIM]),{sx:L/26.6,sz:D/18.64,after:()=>{ aSign.position.set(PC,FL+2.35,FZ+.08); aSign.scale.set(1.15,1.15,1); railA.forEach(o=>o.off=false); }});
    { const onRd=(x,z,mg)=>{ const q=wA(x,z); return ROADS.some(r=>r.t!=='track'&&r.t!=='rail'&&roadDist(r,q[0],q[1])<r.w/2+mg); }; let PZ=TZ+1.2; for(let z=TZ+1.2;z<FZ+18;z+=.5){ if([-5,0,PC,L/4,L/2+2].some(x=>onRd(x,z,.4))) break; PZ=z; }
      const plaza=[[-5,FZ],[L/2+3,FZ],[L/2+3,PZ],[-5,PZ]].map(([x,z])=>wA(x,z)); drape(plaza,matPaverRed,0.12,1.2); LOTS.push(plaza); }  // plac z kostki przed wejściem
    const nA=[f.nx,f.nz]; APT_DOORS={clinic:wA(PC+2.1,FZ+1.4),pharm:wA(PC-2.1,FZ+1.4),n:nA};
    // ogródek skalny: iglaki, świerk srebrny, krzewy (na lewo od tarasu)
    for(let k=0;k<6;k++){ const x=-L/2+1.5+k*(L/2-6.5)/5+R(-.4,.4), z=FZ+1.6+R(0,2.4); const q=L2W(m.cx,m.cz,f.rot)(x,z); EXTRA_TREES.push({x:q[0],z:q[1],s:R(.45,.8),con:rnd()<.6,col:pick(['#2e5427','#4c6e3a','#7a99a8','#6f8a4a','#7b3b4a'])}); }
    polyWinIMs.push(edgeWindows(p.pts,1,p.hc+2.2,4.2,1.2)); }
  buildLewiatan(B_LEW); buildZabka(B_ZAB); buildApteka(APT);
  if(0)brandShop(B_LEW,{h:5.2,wall:'#f1f0ec',roof:'#4d5257',road:ROAD_SZK,text:'Lewiatan',sign:'#0b7a3b',signText:'#ffffff',stripe:'#f2b705',font:'700 84px Barlow, Arial',glass:.62,doorOff:-3,canopy:4.5,canopyCol:0x0b7a3b,apron:5,
    extras:[{u:5.5,v:2.2,mesh:cartRow},{u:-7.5,v:1.6,mesh:binM},{u:-9,v:2,mesh:bikeRack}]});
  if(0)brandShop(B_ZAB,{h:4.4,wall:'#f4f3ef',roof:'#3b4045',road:DK,text:'żabka',sign:'#1e8a3a',signText:'#ffffff',stripe:'#76c043',font:'700 92px Barlow, Arial',glass:.78,doorOff:2,canopy:0,canopyCol:0,apron:4,
    extras:[{u:-4.6,v:1.4,mesh:binM}]});
  // paczkomaty (OSM: amenity=parcel_locker)
  const LOCKERS=[];
  function locker(x,z,n,road,rot90,ryFix){ const nr=nearestRoad(x,z,road?(r=>r===road):(r=>r.t!=='track')); const a=nr.r.pts[nr.seg],b=nr.r.pts[nr.seg+1]; const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz); const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(L*L),0,1); const px=a[0]+dx*t,pz=a[1]+dz*t;
    let nx=px-x,nz=pz-z; const nl=Math.hypot(nx,nz)||1; nx/=nl; nz/=nl; let y=H(x,z); if(ryFix===undefined&&blocked(x,z,1.2)){ x+=nx*3; z+=nz*3; y=H(x,z); }
    const g=new THREE.Group(); const yel=new THREE.MeshLambertMaterial({color:0xffcd00}), grey=new THREE.MeshLambertMaterial({color:0x3c4146}), dark=new THREE.MeshLambertMaterial({color:0x1e2226});
    const W=4.2,Hh=2.1,D=.65; const body=new THREE.Mesh(new THREE.BoxGeometry(W,Hh,D).translate(0,Hh/2+.12,0),yel); g.add(body);
    const plinth=new THREE.Mesh(new THREE.BoxGeometry(W+.2,.12,D+.2).translate(0,.06,0),grey); g.add(plinth);
    const roof=new THREE.Mesh(new THREE.BoxGeometry(W+.3,.1,D+.4).translate(0,Hh+.17,.08),grey); g.add(roof);
    // siatka skrytek
    const cols=7, rows=[.5,.35,.35,.5]; let yy=.25; rows.forEach((rh,ri)=>{ for(let c=0;c<cols;c++){ if(c===3&&ri<3)continue; const dd=new THREE.Mesh(new THREE.BoxGeometry(W/cols-.06,rh-.05,.02),grey); dd.position.set(-W/2+(c+.5)*W/cols,yy+rh/2+.12,D/2+.01); g.add(dd); } yy+=rh; });
    const screen=new THREE.Mesh(new THREE.BoxGeometry(.5,.38,.03),dark); screen.position.set(0,1.38,D/2+.02); const scr=new THREE.Mesh(new THREE.PlaneGeometry(.42,.3),new THREE.MeshBasicMaterial({color:0x6fb7e8})); scr.position.set(0,1.38,D/2+.04); g.add(screen,scr);
    const label=new THREE.Mesh(new THREE.PlaneGeometry(W*.9,.22),new THREE.MeshBasicMaterial({map:signTex('PACZKOMAT','#ffcd00','#2b2f33',512,48,'800 34px Barlow, Arial')})); label.position.set(0,Hh+.02,D/2+.02); g.add(label);
    const ry=ryFix!==undefined?ryFix:Math.atan2(nx,nz)+(rot90?Math.PI/2:0); if(ryFix===undefined&&rot90&&blocked(x,z,2.2)){ x+=nx*1.5; z+=nz*1.5; y=H(x,z); } g.position.set(x,y,z); g.rotation.y=ry; g.traverse(q=>{if(q.isMesh){q.castShadow=true;q.receiveShadow=true;}}); scene.add(g);
    addSolid({x,z,hw:W/2,hd:.45,c:Math.cos(-ry),s:Math.sin(-ry),r:2.3});
    // wg kolizji: obróć prostokąt zgodnie z orientacją
    LOCKERS.push({x,z,n}); }
  DATA.N.filter(n=>n[0]==='parcel_locker').forEach(n=>{ const d=Math.hypot(n[2]-B_LEW.x,n[3]-B_LEW.z), dz=Math.hypot(n[2]-B_ZAB.x,n[3]-B_ZAB.z); if(d<40&&LEW_LOT.locker){ const k=LEW_LOT.locker; locker(k.x,k.z,'przy Lewiatanie',null,false,k.ry); return; } if(dz<40&&B_ZAB.front){ const f=B_ZAB.front, tx=-f.nz, tz=f.nx; /* z dala od drzwi Żabki - przy narożniku */ const x=-76, z=43; const q0=nearestRoad(x,z,r=>r===DK), q1=q0.r.pts[q0.seg], q2=q0.r.pts[q0.seg+1]; const ddx=q2[0]-q1[0], ddz=q2[1]-q1[1], ll=Math.hypot(ddx,ddz)||1, tt=clamp(((x-q1[0])*ddx+(z-q1[1])*ddz)/(ll*ll),0,1); locker(x,z,'ul. Wyzwolenia, przy Żabce',DK,true,Math.atan2(q1[0]+ddx*tt-x,q1[1]+ddz*tt-z)+Math.PI/2); return; } locker(n[2],n[3],d<40?'przy Lewiatanie':dz<40?'ul. Wyzwolenia, przy Żabce':'Trębaczew',dz<40?DK:null,dz<40); });

  await LP(34);
  /* ---------- boiska ---------- */
  function courtTex(kind){ return tex(512,360,(x,w,h)=>{
    if(kind==='ruin'){ x.fillStyle='#7d7a72'; x.fillRect(0,0,w,h); noise(x,w,h,14000,90,150,.2); for(let i=0;i<70;i++){ x.fillStyle=['rgba(76,110,52,.55)','rgba(96,86,66,.5)','rgba(55,55,52,.45)'][i%3]; x.beginPath(); x.ellipse(Math.random()*w,Math.random()*h,8+Math.random()*34,5+Math.random()*18,Math.random()*3,0,7); x.fill(); } x.strokeStyle='rgba(30,30,28,.6)'; x.lineWidth=1.6; for(let i=0;i<26;i++){ let px=Math.random()*w, py=Math.random()*h; x.beginPath(); x.moveTo(px,py); for(let k=0;k<6;k++){ px+=(Math.random()-.5)*50; py+=(Math.random()-.5)*50; x.lineTo(px,py); } x.stroke(); } return; }
    if(kind==='school'){ // boisko szkolne wg zdjęcia: zielona opaska, niebieski pas, czerwony tartan z białymi liniami
      x.fillStyle='#3f8a4a'; x.fillRect(0,0,w,h); noise(x,w,h,4000,40,90,.1); x.fillStyle='#2f6fb5'; x.fillRect(w*.04,h*.06,w*.92,h*.88); noise(x,w,h,3000,60,120,.06);
      const X0=w*.1, Y0=h*.15, W=w*.8, Hh=h*.7; x.fillStyle='#b44a3a'; x.fillRect(X0,Y0,W,Hh); x.strokeStyle='#f4f1ea'; x.lineWidth=2.5; x.strokeRect(X0+4,Y0+4,W-8,Hh-8);
      x.beginPath(); x.moveTo(w/2,Y0+4); x.lineTo(w/2,Y0+Hh-4); x.stroke(); x.beginPath(); x.arc(w/2,h/2,26,0,7); x.stroke();
      [X0+4,X0+W-4].forEach((gx,i)=>{ x.beginPath(); x.arc(gx,h/2,62,i?Math.PI/2:-Math.PI/2,i?Math.PI*1.5:Math.PI/2); x.stroke(); x.setLineDash([8,7]); x.beginPath(); x.arc(gx,h/2,84,i?Math.PI/2:-Math.PI/2,i?Math.PI*1.5:Math.PI/2); x.stroke(); x.setLineDash([]); });
      x.strokeStyle='#f2d34a'; x.lineWidth=2; [X0+4,X0+W-4].forEach((gx,i)=>{ x.strokeRect(i?gx-52:gx,h/2-18,52,36); }); return; }
    if(kind==='tartan'||kind==='tartang'){ x.fillStyle=kind==='tartan'?'#b5503e':'#2f8f43'; x.fillRect(0,0,w,h); noise(x,w,h,9000,120,190,.12); }
    else { x.fillStyle='#4f8a3c'; x.fillRect(0,0,w,h); for(let i=0;i<w;i+=40){x.fillStyle=i%80?'#4a8338':'#548f40';x.fillRect(i,0,40,h);} }
    x.strokeStyle='#f4f1ea'; x.lineWidth=3; const m=14; x.strokeRect(m,m,w-2*m,h-2*m); x.beginPath(); x.moveTo(w/2,m); x.lineTo(w/2,h-m); x.stroke(); x.beginPath(); x.arc(w/2,h/2,34,0,7); x.stroke();
    [m,w-m].forEach((gx,i)=>{ x.beginPath(); x.arc(gx,h/2,70,i?Math.PI/2:-Math.PI/2,i?Math.PI*1.5:Math.PI/2); x.stroke(); x.setLineDash([10,8]); x.beginPath(); x.arc(gx,h/2,100,i?Math.PI/2:-Math.PI/2,i?Math.PI*1.5:Math.PI/2); x.stroke(); x.setLineDash([]); });
    if(kind==='tartan'||kind==='tartang'){ x.strokeStyle=kind==='tartan'?'#e9c94a':'#f2f2ea'; x.lineWidth=2.5; [m,w-m].forEach((gx,i)=>{ const s=i?-1:1; x.beginPath(); x.arc(gx+s*16,h/2,90,-Math.PI/2,Math.PI/2,s<0); x.stroke(); x.strokeRect(i?gx-62:gx,h/2-22,62,44); }); } }); }
  const fenceT=tex(128,128,(x,w,h)=>{ x.clearRect(0,0,w,h); x.strokeStyle='rgba(70,78,82,.95)'; x.lineWidth=2; for(let i=-w;i<w*2;i+=16){ x.beginPath(); x.moveTo(i,0); x.lineTo(i+h,h); x.stroke(); x.beginPath(); x.moveTo(i,h); x.lineTo(i+h,0); x.stroke(); } x.lineWidth=5; x.strokeRect(0,0,w,h); },true);
  const ORLIK_GAPS=[];
  function buildCourt(a,kind,opts){ const m=mar(a.pts); const grp=new THREE.Group(); grp.position.set(m.cx,flatH(a),m.cz); grp.rotation.y=-m.an;
    const surf=new THREE.Mesh((opts.rot90?new THREE.PlaneGeometry(m.d,m.w):new THREE.PlaneGeometry(m.w,m.d)).rotateX(-Math.PI/2),po(new THREE.MeshLambertMaterial({map:courtTex(kind)}),2)); if(opts.rot90) surf.rotation.y=Math.PI/2; surf.position.y=.06; surf.receiveShadow=true; grp.add(surf);
    const FH=opts.fence, fw=m.w+2, fd=m.d+2; const steel=new THREE.MeshLambertMaterial({color:0x5c666c});
    const W2=L2W(m.cx,m.cz,-m.an), gates=opts.gates||[], GW=1.5, GH=2.2;
    [[fw,0,-fd/2,'z-'],[fw,0,fd/2,'z+'],[fd,Math.PI/2,-fw/2,'x-'],[fd,Math.PI/2,fw/2,'x+']].forEach(([L,rot,o,side])=>{ if(!FH) return;
      // odcinki płotu (z przerwami na furtki)
      const cuts=gates.filter(q=>q.side===side).map(q=>q.u).sort((x,y)=>x-y); const segs=[]; let u0=-L/2; cuts.forEach(u=>{ segs.push([u0,u-GW/2]); u0=u+GW/2; }); segs.push([u0,L/2]);
      const panel=(a0,a1,y0,y1)=>{ const len=a1-a0; if(len<.05)return; const t=fenceT.clone(); t.needsUpdate=true; t.repeat.set(len/2.5,(y1-y0)/2.5); const pl=new THREE.Mesh(new THREE.PlaneGeometry(len,y1-y0),new THREE.MeshLambertMaterial({map:t,transparent:true,alphaTest:.35,side:THREE.DoubleSide,color:opts.fenceCol||0xffffff})); pl.position.y=(y0+y1)/2; const c=(a0+a1)/2; if(rot){pl.rotation.y=rot;pl.position.set(o,pl.position.y,c);}else pl.position.set(c,pl.position.y,o); grp.add(pl); };
      segs.forEach(([a0,a1])=>{ panel(a0,a1,0,FH); if(opts.solid){ for(let q=a0;q<a1-.01;q+=8){ const q1=Math.min(a1,q+8), c=(q+q1)/2, hw=(q1-q)/2; const lp=rot?[o,c]:[c,o]; const wp=W2(lp[0],lp[1]); addSolid({x:wp[0],z:wp[1],hw:rot?.12:hw,hd:rot?hw:.12,c:Math.cos(m.an),s:Math.sin(m.an),r:hw+.5}); } } });
      cuts.forEach(u=>{ panel(u-GW/2,u+GW/2,GH,FH); const lp0=rot?[o,u-GW/2]:[u-GW/2,o], lp1=rot?[o,u+GW/2]:[u+GW/2,o]; const p0=W2(lp0[0],lp0[1]), p1=W2(lp1[0],lp1[1]); const tx=(p1[0]-p0[0])/GW, tz=(p1[1]-p0[1])/GW;
        const out=rot?[o*1.0+(o>0?3:-3),u]:[u,o+(o>0?3:-3)]; const ow=W2(out[0],out[1]); const nx=(ow[0]-(p0[0]+p1[0])/2)/3, nz=(ow[1]-(p0[1]+p1[1])/2)/3; ORLIK_GAPS.push({x0:p0[0],z0:p0[1],x1:p1[0],z1:p1[1],G:GW,tx,tz,nx,nz,hs:1.55,steel:true,out:ow}); });
      const n=Math.ceil(L/3); for(let i=0;i<=n;i++){ const po2=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,FH+.2,6).translate(0,(FH+.2)/2,0),steel); const t2=-L/2+i*L/n; if(cuts.some(u=>Math.abs(t2-u)<GW/2+.05))continue; if(rot)po2.position.set(o,0,t2); else po2.position.set(t2,0,o); po2.castShadow=true; grp.add(po2); }
      cuts.forEach(u=>[u-GW/2,u+GW/2].forEach(t2=>{ const po2=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,FH+.2,6).translate(0,(FH+.2)/2,0),steel); if(rot)po2.position.set(o,0,t2); else po2.position.set(t2,0,o); grp.add(po2); }));
      if(cuts.length){ cuts.forEach(u=>{ const bar=new THREE.Mesh(new THREE.BoxGeometry(rot?.07:GW,.07,rot?GW:.07),steel); if(rot)bar.position.set(o,GH,u); else bar.position.set(u,GH,o); grp.add(bar); }); } });
    if(opts.solid){ const pad=2.5; grp.userData.inside=(x,z)=>{ const dx=x-m.cx, dz=z-m.cz, lx=dx*Math.cos(m.an)+dz*Math.sin(m.an), lz=-dx*Math.sin(m.an)+dz*Math.cos(m.an); return Math.abs(lx)<fw/2+pad&&Math.abs(lz)<fd/2+pad; }; }
    const LW=opts.rot90?m.d:m.w; const inner=new THREE.Group(); inner.rotation.y=opts.rot90?Math.PI/2:0; grp.add(inner);
    const stripes=tex(16,64,(x)=>{ for(let i=0;i<8;i++){x.fillStyle=i%2?'#d92d2d':'#f4f4f4';x.fillRect(0,i*8,16,8);} }); const goalMat=new THREE.MeshLambertMaterial({map:stripes});
    [-1,1].forEach(s=>{ const gx=s*(LW/2-0.4); [-1.5,1.5].forEach(z=>{ const p=new THREE.Mesh(new THREE.BoxGeometry(.08,2,.08).translate(0,1,0),goalMat); p.position.set(gx,0,z); inner.add(p); }); const bar=new THREE.Mesh(new THREE.BoxGeometry(.08,.08,3.08),goalMat); bar.position.set(gx,2,0); inner.add(bar);
      if(opts.hoops){ const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,3.6,8).translate(0,1.8,0),steel); pole.position.set(s*(LW/2+.3),0,0); const brd=new THREE.Mesh(new THREE.BoxGeometry(.06,1.05,1.8),new THREE.MeshLambertMaterial({color:0xf2f2f2})); brd.position.set(s*(LW/2-.2),3.4,0); const ring=new THREE.Mesh(new THREE.TorusGeometry(.23,.025,6,16).rotateX(Math.PI/2),new THREE.MeshLambertMaterial({color:0xe06a1f})); ring.position.set(s*(LW/2-.5),3.05,0); inner.add(pole,brd,ring); } });
    if(opts.benches){ const bm=new THREE.MeshLambertMaterial({color:0x9a9fa3}); for(let i=0;i<3;i++){ const b=new THREE.Mesh(new THREE.BoxGeometry(2.4,.45,.5).translate(0,.22,0),bm); b.position.set(-m.w/4+i*m.w/4, 0, -m.d/2-0.4); grp.add(b);} }
    grp.traverse(o=>{ if(o.isMesh&&o!==surf) o.castShadow=true; }); scene.add(grp); return {m,grp,fw,fd}; }
  const ORLIK_GATES=(()=>{ const m=mar(COURT.pts), pc=centroid(PARK.pts); const c=Math.cos(m.an), sn=Math.sin(m.an); const dx=pc[0]-m.cx, dz=pc[1]-m.cz; const lx=dx*c+dz*sn, lz=-dx*sn+dz*c; // park w układzie boiska
    const loc=p=>{ const dx=p[0]-m.cx, dz=p[1]-m.cz; return [dx*c+dz*sn, -dx*sn+dz*c]; }, sideOf=([x,z])=>Math.abs(x)/(m.w/2)>Math.abs(z)/(m.d/2)?(x>0?'x+':'x-'):(z>0?'z+':'z-');
    const gate=(p)=>{ const q=loc(p), sd=sideOf(q), L=sd[0]==='x'?m.d:m.w, u=clamp(sd[0]==='x'?q[1]:q[0],-L/2+1.8,L/2-1.8); return {side:sd,u}; };
    const G=[gate(typeof PARKD!=='undefined'&&PARKD.gate?PARKD.gate:pc)]; // wejście z alejki parkowej (OSM: entrance=yes)
    const zr=ROADS.find(r=>r.n==='Zielona'); if(zr){ const nr=nearestRoad(m.cx,m.cz,r=>r===zr); const a=zr.pts[nr.seg], b=zr.pts[nr.seg+1]; const t=clamp(((m.cx-a[0])*(b[0]-a[0])+(m.cz-a[1])*(b[1]-a[1]))/((b[0]-a[0])**2+(b[1]-a[1])**2),0,1); const g2=gate([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]); if(g2.side!==G[0].side) G.push(g2); }
    return G; })();
  const orlik=buildCourt(COURT,'tartan',{rot90:true,fence:4.2,hoops:true,benches:true,solid:true,gates:ORLIK_GATES});
  const ORLIK_RD=(()=>{ let best=null,bd=1e9; ROADS.forEach(r=>{ if(['track','rail','path','foot','footway','service'].includes(r.t)||!r.L)return; for(let d=0;d<r.L;d+=3){ const q=sampleLine(r.pts,r.len,d); const dd=Math.hypot(q.x-orlik.m.cx,q.z-orlik.m.cz); if(dd<bd){bd=dd;best=[q.x,q.z];} } }); return best||[orlik.m.cx,orlik.m.cz-40]; })();
  const ORLIK_DOOR=()=>{ if(!ORLIK_GAPS.length) return [orlik.m.cx,orlik.m.cz+30]; const t=typeof PARKD!=='undefined'&&PARKD.gate?PARKD.gate:centroid(PARK.pts); let b=ORLIK_GAPS[0]; ORLIK_GAPS.forEach(g=>{ if(Math.hypot(g.out[0]-t[0],g.out[1]-t[1])<Math.hypot(b.out[0]-t[0],b.out[1]-t[1])) b=g; }); return b.out; };
  const pitch2=buildCourt(PITCH2,'school',{rot90:(()=>{ const q=mar(PITCH2.pts); return q.w<q.d; })(),fence:0,hoops:true,fenceCol:0x6fb070});
  const ncCourt=buildCourt(NC,'ruin',{fence:0,hoops:false,benches:true,solid:true});
  // przy boisku szkolnym (Zagrodowa): ławki od ulicy i siłownia pod chmurką (żółto-zielone urządzenia) - wg zdjęć
  { const m=pitch2.m, zr=ROADS.find(r=>r.n==='Zagrodowa'); const W2=L2W(m.cx,m.cz,-m.an); const fw=m.w+2, fd=m.d+2;
    let side=null,bd=1e9; [[0,fd/2+1.4],[0,-fd/2-1.4],[fw/2+1.4,0],[-fw/2-1.4,0]].forEach(p=>{ const q=W2(p[0],p[1]); const d=zr?roadDist(zr,q[0],q[1]):0; if(d<bd){bd=d;side=p;} });
    const along=side[0]===0, slat=new THREE.MeshLambertMaterial({color:0x8a5a34}), iron=new THREE.MeshLambertMaterial({color:0x2a2c2e});
    for(let k=-1.5;k<=1.5;k++){ const lp=along?[k*(fw/4.2),side[1]]:[side[0],k*(fd/4.2)]; const q=W2(lp[0],lp[1]); const b=new THREE.Group(); b.position.set(q[0],H(q[0],q[1]),q[1]); b.rotation.y=-m.an+(along?(side[1]>0?0:Math.PI):(side[0]>0?Math.PI/2:-Math.PI/2)); scene.add(b);
      bx(b,1.8,.05,.42,0,.45,0,slat); bx(b,1.8,.32,.04,0,.6,-.22,slat); [-.8,.8].forEach(x=>bx(b,.06,.46,.45,x,0,0,iron)); b.traverse(o=>o.castShadow=true); addSolid({x:q[0],z:q[1],hw:1,hd:.3,c:Math.cos(-b.rotation.y),s:Math.sin(-b.rotation.y),r:1.1}); }
    const yel=new THREE.MeshLambertMaterial({color:0xf0c030}), grn=new THREE.MeshLambertMaterial({color:0x8bc34a}), gm=new THREE.MeshLambertMaterial({color:0x9aa0a6}), blkm=new THREE.MeshLambertMaterial({color:0x222426});
    // siłownia pod chmurką tuż przy płocie od Zagrodowej (żółte słupy z szarymi ramionami, wg zdjęcia)
    if(zr){ const q0=nearestRoad(m.cx,m.cz,r=>r===zr); const a0=zr.pts[q0.seg], b0=zr.pts[q0.seg+1]; let tx=b0[0]-a0[0], tz=b0[1]-a0[1]; const tl=Math.hypot(tx,tz); tx/=tl; tz/=tl; const u0=clamp((m.cx-a0[0])*tx+(m.cz-a0[1])*tz,0,tl), q=[a0[0]+tx*u0,a0[1]+tz*u0]; let nx=-tz, nz=tx; if((m.cx-q[0])*nx+(m.cz-q[1])*nz<0){ nx=-nx; nz=-nz; }
      const off=zr.w/2+5.2; for(let k=-3;k<=3;k++){ const x=q[0]+tx*k*5.6+nx*off, z=q[1]+tz*k*5.6+nz*off; if(blocked(x,z,1.2,true)||roadNearF(x,z,3.2)||inPoly(x,z,KINDER.pts)) continue; const e=new THREE.Group(); e.position.set(x,H(x,z),z); e.rotation.y=-Math.atan2(tz,tx); scene.add(e); const ty=((k+3)%3);
        if(ty===0){ bx(e,.14,1.7,.3,-.55,0,0,yel); bx(e,.16,.05,.22,-.55,1.4,0,blkm,true); bx(e,1.5,.07,.55,0,.05,0,gm); [-.2,.2].forEach(zz=>{ bx(e,.5,.05,.2,.35,.32,zz,gm); const ar=bx(e,.05,1.3,.05,-.2,.25,zz,gm); ar.rotation.z=-.18; }); bx(e,.1,.12,.7,-.4,1.35,0,gm); }
        else if(ty===1){ bx(e,.14,1.5,.3,-.5,0,0,grn); bx(e,.14,.05,.22,-.5,1.2,0,blkm,true); bx(e,.5,.07,.4,.3,.45,0,gm); const bk=bx(e,.08,.55,.4,.62,.5,0,gm); bk.rotation.z=-.25; bx(e,.5,.05,.55,-.2,.2,0,gm).rotation.z=.4; bx(e,1.4,.06,.1,0,.05,0,gm); }
        else { bx(e,.14,1.35,.3,0,0,0,yel); bx(e,.16,.05,.22,0,1.1,0,blkm,true); [-.35,.35].forEach(zz=>{ bx(e,.45,.05,.22,0,.3,zz,gm); bx(e,.05,.9,.05,.05,.3,zz*.6,gm); }); bx(e,.1,.1,1.0,0,1.2,0,gm); }
        e.traverse(o=>o.castShadow=true); addSolid({x,z,hw:.7,hd:.45,c:Math.cos(-e.rotation.y),s:Math.sin(-e.rotation.y),r:.9}); } } }
  // niebieska bieżnia lekkoatletyczna (4 tory) dookoła boiska szkolnego
  { const m=pitch2.m, g=new THREE.Group(); g.position.set(m.cx,flatH(PITCH2),m.cz); g.rotation.y=-m.an; scene.add(g);
    const SW=m.w>m.d, hwF=Math.min(m.w,m.d)/2+1, hdF=Math.max(m.w,m.d)/2+1, r0=hwF+TRK.gap, cw=0, cz0=Math.max(0,hdF-Math.sqrt(Math.max(0,r0*r0-hwF*hwF))+.3), cd=cz0, ihw=r0, ihd=cz0+r0, N=16;
    const loop=o=>{ const pts=[]; for(let q=0;q<4;q++){ const sx=(q===0||q===3)?1:-1, sz=(q<2)?1:-1; for(let k=0;k<=N;k++){ const a=q*Math.PI/2+k/N*Math.PI/2; const px=sx*cw+(r0+o)*Math.cos(a), pz=sz*cd+(r0+o)*Math.sin(a); pts.push(SW?[pz,px]:[px,pz]); } } return pts; };
    const ring=(o0,o1,y,mat)=>{ const A=loop(o0), B=loop(o1), pos=[]; for(let i=0;i<A.length;i++){ const j=(i+1)%A.length; [[A[i],B[i],B[j]],[A[i],B[j],A[j]]].forEach(t=>t.forEach(v=>pos.push(v[0],y,v[1]))); }
      const ge=new THREE.BufferGeometry(); ge.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); ge.computeVertexNormals(); const me=new THREE.Mesh(ge,mat); me.receiveShadow=true; g.add(me); };
    const W=TRK.lane*TRK.n, blue=po(new THREE.MeshLambertMaterial({color:0x3f7fb6,side:THREE.DoubleSide}),2), white=po(new THREE.MeshLambertMaterial({color:0xf2f2ea,side:THREE.DoubleSide}),3);
    ring(0,W,.05,blue); for(let i=0;i<=TRK.n;i++) ring(i*TRK.lane-.04,i*TRK.lane+.04,.06,white);
    // linia startu/mety na prostej
    const sl=new THREE.Mesh(new THREE.PlaneGeometry(W,.12).rotateX(-Math.PI/2),white); sl.position.set(SW?0:ihw+W/2,.065,SW?ihw+W/2:0); sl.rotation.y=SW?Math.PI/2:0; g.add(sl); }

  /* ---------- powierzchnie utwardzone (parkingi, plac przy parku) ---------- */
  // przycinanie nawierzchni do krawędzi dróg (żadna kostka ani plac nie wchodzi na jezdnię)
  function clipHalf(poly,ax,az,nx,nz,d){ const out=[]; for(let i=0;i<poly.length;i++){ const P=poly[i],Q=poly[(i+1)%poly.length]; const dp=(P[0]-ax)*nx+(P[1]-az)*nz-d, dq=(Q[0]-ax)*nx+(Q[1]-az)*nz-d; if(dp>=0) out.push(P); if((dp>=0)!==(dq>=0)){ const t=dp/(dp-dq); out.push([P[0]+(Q[0]-P[0])*t,P[1]+(Q[1]-P[1])*t]); } } return out; }
  function clipRoads(pts){ let poly=pts.slice(); if(poly.length<3) return poly; const bb=bbox(poly);
    ROADS.forEach(r=>{ if(r.t==='track'||r.t==='rail'||r.t==='path'||r.t==='foot'||r.t==='footway')return; const hw=r.w/2+.3;
      for(let i=0;i<r.pts.length-1;i++){ const a=r.pts[i], b=r.pts[i+1]; if(Math.max(a[0],b[0])<bb[0]-hw||Math.min(a[0],b[0])>bb[2]+hw||Math.max(a[1],b[1])<bb[1]-hw||Math.min(a[1],b[1])>bb[3]+hw)continue;
        const L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L<.1)continue; const tx=(b[0]-a[0])/L, tz=(b[1]-a[1])/L; let nx=-tz, nz=tx;
        let hit=false; for(let k=0;k<=L&&!hit;k+=.75){ const x=a[0]+tx*k, z=a[1]+tz*k; if(inPoly(x,z,poly)) hit=true; } if(!hit) hit=poly.some(q=>segDist(q[0],q[1],a[0],a[1],b[0],b[1])<hw); if(!hit)continue;
        const c=centroid(poly); if((c[0]-a[0])*nx+(c[1]-a[1])*nz<0){ nx=-nx; nz=-nz; } const np=clipHalf(poly,a[0],a[1],nx,nz,hw); if(np.length>=3&&Math.abs(polyArea(np))>1.5) poly=np; } });
    return poly; }
  // gęstsza siatka, żeby nawierzchnia równo leżała na terenie (bez zapadania i unoszenia)
  function tessellate(geo,maxL){ const P=geo.attributes.position, I=geo.index?Array.from(geo.index.array):[...Array(P.count).keys()]; const V=[]; for(let i=0;i<P.count;i++) V.push([P.getX(i),P.getZ(i)]); const out=[]; const mid=new Map();
    const M=(i,j)=>{ const k=i<j?i+','+j:j+','+i; if(mid.has(k)) return mid.get(k); V.push([(V[i][0]+V[j][0])/2,(V[i][1]+V[j][1])/2]); mid.set(k,V.length-1); return V.length-1; };
    const st=[]; for(let t=0;t<I.length;t+=3) st.push([I[t],I[t+1],I[t+2]]); let guard=0;
    while(st.length&&guard++<60000){ const [a,b,c]=st.pop(); const d=(i,j)=>Math.hypot(V[i][0]-V[j][0],V[i][1]-V[j][1]); const ab=d(a,b), bc=d(b,c), ca=d(c,a), mx=Math.max(ab,bc,ca);
      if(mx<=maxL){ out.push(a,b,c); continue; } if(mx===ab){ const m=M(a,b); st.push([a,m,c],[m,b,c]); } else if(mx===bc){ const m=M(b,c); st.push([a,b,m],[a,m,c]); } else { const m=M(c,a); st.push([a,b,m],[m,b,c]); } }
    const g=new THREE.BufferGeometry(); const pos=new Float32Array(V.length*3); V.forEach((v,i)=>{ pos[i*3]=v[0]; pos[i*3+2]=v[1]; }); g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(V.length*2),2)); g.setIndex(out); return g; }
  function drape(pts,mat,yo,uvs,noClip){ if(!noClip) pts=clipRoads(pts); if(pts.length<3) return null; const sh=new THREE.Shape(pts.map(p=>new THREE.Vector2(p[0],-p[1]))); let geo=new THREE.ShapeGeometry(sh); geo.rotateX(-Math.PI/2); geo=tessellate(geo,3); const pos=geo.attributes.position, uv=geo.attributes.uv;
    for(let i=0;i<pos.count;i++){ const x=pos.getX(i), z=pos.getZ(i); pos.setY(i,H(x,z)+yo); uv.setXY(i,x/uvs,z/uvs); } geo.computeVertexNormals(); const m=new THREE.Mesh(geo,mat); m.receiveShadow=true; scene.add(m); return m; }
  const paverArea=po(new THREE.MeshLambertMaterial({map:texPaver,side:THREE.DoubleSide}),3);
  AREAS.filter(a=>a.t==='am:parking'&&!(LEW_LOT.poly&&(inPoly(...centroid(a.pts),LEW_LOT.poly)||a.pts.some(q=>inPoly(q[0],q[1],LEW_LOT.poly))))).forEach(a=>drape(resample(a.pts,4),paverArea,0.13,2.2));

  /* ---------- przedszkole im. Jasia i Małgosi (wg zdjęcia) ---------- */
  function kidWinTex(draw){ return tex(64,72,(x,w,h)=>{ x.fillStyle='#f6f6f2'; x.fillRect(0,0,w,h); x.fillStyle='#34424d'; x.fillRect(5,5,w-10,h-10); const g2=x.createLinearGradient(0,0,w,h); g2.addColorStop(0,'rgba(255,255,255,.28)'); g2.addColorStop(.6,'rgba(255,255,255,.03)'); x.fillStyle=g2; x.fillRect(5,5,w-10,h-10); x.fillStyle='#f6f6f2'; x.fillRect(w/2-2,5,4,h-10); x.fillRect(5,h*.36,w-10,3);
    if(draw){ const C=['#f2c230','#e8453c','#3f8fd8','#47b04b','#ef7fb0','#ff9a2e']; for(let k=0;k<3;k++){ const px=9+(k%2)*26, py=h*.42+4+Math.floor(k/2)*10; x.fillStyle='#ffffff'; x.fillRect(px,py,20,18); x.fillStyle=C[(k*2+draw)%C.length]; x.beginPath(); x.arc(px+10,py+8,5,0,7); x.fill(); x.fillStyle=C[(k+draw+3)%C.length]; x.fillRect(px+3,py+13,14,3); } } }); }
  const KWIN=[kidWinTex(0),kidWinTex(1),kidWinTex(2),kidWinTex(4)].map(t=>new THREE.MeshPhongMaterial({map:t,shininess:70,specular:0x555555}));
  const asphaltM=po(new THREE.MeshLambertMaterial({color:0x6a6c6f,map:detailTex,side:THREE.DoubleSide}),3);
  function buildPrzedszkole(){ const list=BLD.filter(b=>b.kind==='kinderX').sort((a,b)=>a.z-b.z); if(!list.length)return;
    const SZK=nearestRoad(...centroid(KINDER.pts),r=>r.n==='Szkolna').r;
    const cream=new THREE.MeshLambertMaterial({color:0xeee2c2,map:plasterTex}), plinthM=new THREE.MeshLambertMaterial({color:0x9d958a}), roofDk=new THREE.MeshLambertMaterial({color:0x6e2f24,map:tileTex}), roofOr=new THREE.MeshLambertMaterial({color:0xcf6a2c,map:tileTex}), white=new THREE.MeshLambertMaterial({color:0xf3f2ee}), metal=new THREE.MeshLambertMaterial({color:0x6d7377}), glassD=new THREE.MeshPhongMaterial({map:glassTex,shininess:110,specular:0x8899aa});
    list.forEach((b,bi)=>{ const f=frontSide(b,SZK); const L=f.len, D=f.dep, FZ=D/2; const g=new THREE.Group(); g.position.set(b.x,b.hc,b.z); g.rotation.y=f.rot; scene.add(g);
      const small=bi===list.length-1&&list.length>1, floors=small?1:2, WH=small?3.6:6.6, low=b.hmin-0.4-b.hc;
      bx(g,L,WH-low,D,0,low,0,cream); bx(g,L+.06,.6-low,D+.06,0,low,0,plinthM);
      // gzyms + dach: ciemnoczerwona dachówka, mała część pomarańczowa
      bx(g,L+.9,.25,D+.9,0,WH-.05,0,white);
      const rf=new THREE.Mesh(hipGeo,small?roofOr:roofDk); rf.scale.set(L+1.2,small?2.0:2.4,D+1.2); rf.position.y=WH+.2; rf.castShadow=true; g.add(rf);
      // okna w białych ramach, część z rysunkami dzieci
      let wk=0; const win=(x,y,z,ry)=>{ const m=KWIN[(wk++*7+bi)%4]; const p=pl(g,1.35,1.5,x,y,z,m,ry); return p; };
      for(let fl=0;fl<floors;fl++){ const y=1.65+fl*3.05;
        const n=Math.max(2,Math.floor(L/2.6)); for(let k=0;k<n;k++){ const x=-L/2+(k+.5)*L/n; if(fl===0&&bi===0&&Math.abs(x)<1.6)continue; win(x,y,FZ+.03,0); win(x,y,-FZ-.03,Math.PI); }
        const m2=Math.max(1,Math.floor(D/2.8)); for(let k=0;k<m2;k++){ const z=-D/2+(k+.5)*D/m2; win(L/2+.03,y,z,Math.PI/2); win(-L/2-.03,y,z,-Math.PI/2); } }
      if(bi===0){ // główne wejście: daszek, schody, poręcze
        pl(g,1.9,2.3,0,1.15+.2,FZ+.04,glassD); bx(g,2.2,.12,.12,0,2.45,FZ+.06,white);
        bx(g,3.8,.18,2.4,0,2.75,FZ+1.2,white); [-1.7,1.7].forEach(o=>bx(g,.1,2.75,.1,o,0,FZ+2.3,metal));
        bx(g,3.6,.2,2.2,0,-.05,FZ+1.1,new THREE.MeshLambertMaterial({color:0xb8b2a8}));
        [-1.85,1.85].forEach(o=>{ bx(g,.05,.05,2.6,o,1.0,FZ+1.3,metal,true); for(let k=0;k<4;k++) bx(g,.05,1.0,.05,o,0,FZ+.3+k*.75,metal,true); });
        // wejście boczne z małym daszkiem
        pl(g,1.1,2.1,-L/2-.04,1.05,FZ-2,new THREE.MeshLambertMaterial({color:0x7a5a3e}),-Math.PI/2); bx(g,.9,.12,1.6,-L/2-.45,2.3,FZ-2,white);
        // maszt antenowy za budynkiem
        const mast=new THREE.Group(); mast.position.set(-L/2+2,0,-FZ-4); g.add(mast); const mm=new THREE.MeshLambertMaterial({color:0xb9bdc0});
        [[0,0],[.9,0],[.45,.78]].forEach(([x,z])=>{ const c=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,17,5).translate(0,8.5,0),mm); c.position.set(x-.45,0,z-.26); mast.add(c); });
        for(let y=1;y<17;y+=1.2){ const r=new THREE.Mesh(new THREE.TorusGeometry(.53,.03,3,3),mm); r.rotation.x=Math.PI/2; r.position.y=y; mast.add(r); }
        [0,2.1,4.2].forEach(a=>{ const p=new THREE.Mesh(new THREE.BoxGeometry(.3,1.4,.15),white); p.position.set(Math.cos(a)*.7,15.8,Math.sin(a)*.7); p.rotation.y=-a; mast.add(p); });
        mast.traverse(o=>{if(o.isMesh)o.castShadow=true;}); }
      g.traverse(o=>{ if(o.isMesh&&o.geometry.type!=='PlaneGeometry')o.castShadow=true; });
      // chodnik z kostki (czerwone obrzeża) + asfaltowy parking do ulicy
      const w=L2W(b.x,b.z,f.rot); const toRoad=Math.max(4,roadDist(SZK,f.x,f.z)-SZK.w/2-.3);
      const walk=[[-L/2-1,FZ],[L/2+1,FZ],[L/2+1,FZ+1.8],[-L/2-1,FZ+1.8]].map(([x,z])=>w(x,z)); drape(walk,lotPaver,0.13,2.2); LOTS.push(walk);
      const edge=[[-L/2-1,FZ+1.8],[L/2+1,FZ+1.8],[L/2+1,FZ+2.2],[-L/2-1,FZ+2.2]].map(([x,z])=>w(x,z)); drape(edge,matPaverRed,0.14,1);
      if(toRoad>3){ const lot=[[-L/2-1,FZ+2.2],[L/2+1,FZ+2.2],[L/2+1,FZ+toRoad],[-L/2-1,FZ+toRoad]].map(([x,z])=>w(x,z)); drape(lot,asphaltM,0.12,4); LOTS.push(lot);
        const lineM=po(new THREE.MeshBasicMaterial({color:0xe8e8e2}),4); for(let x=-L/2+1;x<L/2;x+=2.7){ const q=w(x,FZ+2.2+Math.min(5,toRoad-2.2)/2); const ln=new THREE.Mesh(new THREE.PlaneGeometry(.12,Math.min(4.6,toRoad-2.6)).rotateX(-Math.PI/2),lineM); ln.position.set(q[0],H(q[0],q[1])+.15,q[1]); ln.rotation.y=f.rot; scene.add(ln); }
        if(toRoad>6&&bi<2){ const q=w(-L/2+3.5,FZ+4.6); LEW_SPOTS.push({x:q[0],z:q[1],h:Math.atan2(-f.nz,-f.nx)}); } }
      // ogródek skalny z głazami + duże tuje po lewej
      if(bi===0){ const rock=new THREE.MeshLambertMaterial({color:0x8d8a84,map:detailTex}); const bark=new THREE.MeshLambertMaterial({color:0x5a4030});
        const bed=new THREE.Mesh(new THREE.CircleGeometry(2.6,18).rotateX(-Math.PI/2),po(bark,3)); const q0=w(L/2-2.5,FZ+0.9); bed.scale.set(1.4,1,.45); bed.position.set(q0[0],H(q0[0],q0[1])+.16,q0[1]); bed.rotation.y=f.rot; scene.add(bed);
        for(let k=0;k<7;k++){ const r=new THREE.Mesh(new THREE.DodecahedronGeometry(R(.25,.55),0),rock); const q=w(L/2-4.5+k*.7+R(-.2,.2),FZ+.7+R(-.3,.3)); r.position.set(q[0],H(q[0],q[1])+.12,q[1]); r.scale.y=.65; r.rotation.set(R(0,3),R(0,3),0); r.castShadow=true; scene.add(r); }
        for(let k=0;k<4;k++) EXTRA_TREES.push({x:w(-L/2-2.5,FZ-1-k*2.4)[0],z:w(-L/2-2.5,FZ-1-k*2.4)[1],s:R(.75,1.0),con:true,col:'#2b4a24'});
        // znak P
        const q=w(L/2+1.6,FZ+2.6); const sg=new THREE.Group(); sg.position.set(q[0],H(q[0],q[1]),q[1]); sg.rotation.y=f.rot; scene.add(sg);
        bx(sg,.07,2.4,.07,0,0,0,metal); pl(sg,.6,.6,0,2.5,.05,new THREE.MeshLambertMaterial({map:signTex('P','#1f5fb4','#ffffff',128,128,'800 96px Barlow, Arial')})); }
      { const keepK=g.children.filter(c=>c.type==='Group'); swapIn(g,'przedszkole'+Math.min(bi,2),g.children.filter(c=>!keepK.includes(c)),{sx:L/[8.5,12.5,9.5][Math.min(bi,2)],sz:D/[18,12.5,11.5][Math.min(bi,2)],low,L,D}); }
    }); }
  /* ---------- OSP Trębaczew (wg zdjęcia) ---------- */
  let OSP_YARD=null; const OSP_REQ=[], KG_REQ=[];
  function buildOSP(){ const b=BLD.find(q=>q.kind==='osp'); if(!b)return; const ST=(nearestRoad(b.x,b.z,r=>r.n==='Wyzwolenia'&&r.t!=='track').r)||ROADS.find(r=>r.n==='Strażacka')||nearestRoad(b.x,b.z).r; const f=frontSide(b,ST); const L=f.len, D=f.dep, FZ=D/2;
    const g=new THREE.Group(); g.position.set(b.x,b.hc,b.z); g.rotation.y=f.rot; scene.add(g); b.front=f;
    const low=b.hmin-0.4-b.hc, H1=3.9, H2=3.3;
    const grey=new THREE.MeshLambertMaterial({color:0x9fa3a5,map:plasterTex}), red=new THREE.MeshLambertMaterial({color:0xb3262b,map:plasterTex}), dark=new THREE.MeshLambertMaterial({color:0x3b3f43}), metal=new THREE.MeshLambertMaterial({color:0x4a5054}), white=new THREE.MeshLambertMaterial({color:0xf2f2ee});
    bx(g,L,H1-low,D,0,low,0,grey); bx(g,L+.04,H2,D+.04,0,H1,0,red); bx(g,L+.3,.5,D+.3,0,H1+H2,0,red); bx(g,L-.2,.1,D-.2,0,H1+H2+.35,0,dark);
    bx(g,L+.12,.16,D+.12,0,H1-.08,0,white);
    // bramy garażowe: dwie czerwone (jedna z furtką) + otwarty boks z prawej
    const doorTex=(wicket)=>tex(128,128,(x,w,h)=>{ x.fillStyle='#c0272c'; x.fillRect(0,0,w,h); for(let i=0;i<h;i+=11){ x.fillStyle='rgba(0,0,0,.22)'; x.fillRect(0,i,w,2); x.fillStyle='rgba(255,255,255,.12)'; x.fillRect(0,i+2,w,1); } x.strokeStyle='rgba(0,0,0,.5)'; x.lineWidth=4; x.strokeRect(2,2,w-4,h-4); if(wicket){ x.strokeStyle='rgba(0,0,0,.6)'; x.lineWidth=3; x.strokeRect(w*.62,h*.3,w*.26,h*.68); x.fillStyle='#ddd'; x.fillRect(w*.65,h*.62,6,3); } });
    const DW=3.4, DH=3.3; const bays=[-L/2+2.6, -L/2+2.6+4.3, L/2-2.6];
    pl(g,DW,DH,bays[0],DH/2,FZ+.03,new THREE.MeshLambertMaterial({map:doorTex(true)})); pl(g,DW,DH,bays[1],DH/2,FZ+.03,new THREE.MeshLambertMaterial({map:doorTex(false)}));
    pl(g,DW,DH,bays[2],DH/2,FZ+.03,new THREE.MeshBasicMaterial({color:0x15181b})); bx(g,DW+.3,.25,.4,bays[2],DH,FZ+.1,white);
    bays.slice(0,2).forEach(x=>bx(g,DW+.3,.14,.2,x,DH,FZ+.08,white));
    // napis na czerwonym pasie
    const sTex=tex(2048,96,(x,w,h)=>{ x.clearRect(0,0,w,h); x.fillStyle='#ffffff'; x.font='700 64px Barlow, Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('OCHOTNICZA  STRAŻ  POŻARNA  W  TRĘBACZEWIE',w/2,h/2+3); });
    const ospSign=pl(g,Math.min(L-1,15.5),.72,0,H1+.55,FZ+.06,new THREE.MeshLambertMaterial({map:sTex,transparent:true}));
    // białe okna piętra
    const wM=new THREE.MeshPhongMaterial({map:winTex,shininess:80,specular:0x666666,color:0xb8c4cc});
    const n=Math.max(3,Math.floor(L/3)); for(let k=0;k<n;k++){ const x=-L/2+(k+.5)*L/n; pl(g,1.3,1.25,x,H1+2.05,FZ+.04,wM); pl(g,1.3,1.25,x,H1+2.05,-FZ-.04,wM,Math.PI); }
    const m=Math.max(2,Math.floor(D/3.4)); for(let k=0;k<m;k++){ const z=-D/2+(k+.5)*D/m; pl(g,1.3,1.25,L/2+.04,H1+1.75,z,wM,Math.PI/2); if(z<-D/2+4)continue; pl(g,1.3,1.25,-L/2-.04,H1+1.75,z,wM,-Math.PI/2); pl(g,1.1,1.1,L/2+.04,1.9,z,wM,Math.PI/2); }
    swapIn(g,'osp',g.children.filter(c=>c!==ospSign),{sx:L/16,sz:D/19.5,low,L,D});
    // zewnętrzne metalowe schody po lewej
    { const sx=-L/2-.65, zTop=-D/2+2.6, run=5.6, N=17; for(let k=0;k<N;k++){ const t=(k+1)/N; bx(g,1.0,.06,.38,sx,H1*t-.06,zTop+run*(1-t),metal,true); }
      const ang=Math.atan2(H1,run); [-.52,.52].forEach(o=>{ const s=new THREE.Mesh(new THREE.BoxGeometry(.06,.18,Math.hypot(run,H1)),metal); s.position.set(sx+o,H1/2,zTop+run/2); s.rotation.x=ang; g.add(s); const r=s.clone(); r.position.y+=1; g.add(r); });
      bx(g,1.1,.08,2.1,sx,H1-.08,-D/2+1.5,metal); bx(g,.05,1.0,2.1,sx-.53,H1,-D/2+1.5,metal,true); bx(g,.08,H1,.08,sx-.5,0,-D/2+.6,metal); bx(g,.08,H1,.08,sx-.5,0,zTop+run-.2,metal);
      pl(g,1.0,2.1,-L/2-.04,H1+1.05,-D/2+1.5,new THREE.MeshLambertMaterial({color:0x6b6f72}),-Math.PI/2); }
    g.traverse(o=>{ if(o.isMesh&&o.geometry.type!=='PlaneGeometry')o.castShadow=true; });
    // plac z kostki przed bramami, maszt z flagą na trawniku, ogrodzenie z siatki z bramą przesuwną
    const w=L2W(b.x,b.z,f.rot); let toRoad=clamp(roadDist(ST,f.x,f.z)-ST.w/2-1.2,4,22); for(let k=0;k<44&&toRoad>1.5&&[[-L/2,0],[L/2,0],[-L/2-7,0],[L/2+3,0],[0,0],[-L/2-7,-.5]].some(([x])=>{ for(const zz of [FZ+toRoad+.6,FZ+toRoad*.5]){ const q=w(x,zz); if(roadNearF(q[0],q[1],1.6)) return true; } return false; });k++) toRoad-=.5;
    const yard=[[-L/2,FZ],[L/2-.0,FZ],[L/2,FZ+toRoad],[-L/2+5.2,FZ+toRoad],[-L/2+.5,FZ+toRoad*.5]].map(([x,z])=>w(x,z)); drape(yard,lotPaver,0.13,2.2); LOTS.push(yard); OSP_YARD={w,L,FZ,toRoad,f,inYard:(x,z,m)=>{ let q=w(x,z); for(let k=0;k<30&&z>FZ+.6&&roadNearF(q[0],q[1],m||1.2);k++){ z-=.3; q=w(x,z); } return q; }};
    { const q=w(-L/2-2.5,FZ+toRoad*.55); const fg=new THREE.Group(); fg.position.set(q[0],H(q[0],q[1]),q[1]); fg.rotation.y=f.rot; scene.add(fg); const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,8,8).translate(0,4,0),white); pole.castShadow=true; fg.add(pole);
      const flag=tex(64,40,(x,w,h)=>{ x.fillStyle='#ffffff'; x.fillRect(0,0,w,h/2); x.fillStyle='#d4213d'; x.fillRect(0,h/2,w,h/2); }); const fm=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.9,6,1),new THREE.MeshLambertMaterial({map:flag,side:THREE.DoubleSide})); fm.position.set(.78,7.4,0); fg.add(fm); OSP_FLAG=fm; }
    const steelM=new THREE.MeshLambertMaterial({color:0x6c7478}), concM=new THREE.MeshLambertMaterial({color:0xa9a69e,map:detailTex});
    const fenceRun=(a,bq,gate)=>{ const dx=bq[0]-a[0],dz=bq[1]-a[1],Ln=Math.hypot(dx,dz); if(Ln<.5)return; const an=Math.atan2(dz,dx); const cx=(a[0]+bq[0])/2,cz=(a[1]+bq[1])/2,y=H(cx,cz);
      const base=new THREE.Mesh(new THREE.BoxGeometry(Ln,.35,.18),concM); base.position.set(cx,y+.1,cz); base.rotation.y=-an; base.castShadow=true; scene.add(base);
      const t=fenceT.clone(); t.needsUpdate=true; t.repeat.set(Ln/1.2,1.2); const mesh=new THREE.Mesh(new THREE.PlaneGeometry(Ln,1.4),new THREE.MeshLambertMaterial({map:t,transparent:true,alphaTest:.35,side:THREE.DoubleSide,color:0x9aa2a6})); mesh.position.set(cx,y+1.0,cz); mesh.rotation.y=-an; scene.add(mesh);
      for(let k=0;k<=Math.ceil(Ln/2.5);k++){ const tt=k/Math.ceil(Ln/2.5); const p=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,1.8,6).translate(0,.9,0),steelM); p.position.set(a[0]+dx*tt,H(a[0]+dx*tt,a[1]+dz*tt),a[1]+dz*tt); scene.add(p); }
      addSolid({x:cx,z:cz,hw:Ln/2,hd:.12,c:Math.cos(an),s:Math.sin(an),r:Ln/2+.3}); };
    const loc=p=>{ const dx=p[0]-b.x, dz=p[1]-b.z, c=Math.cos(f.rot), sn=Math.sin(f.rot); return [dx*c-dz*sn, dx*sn+dz*c]; };
    const GB=loc([-207,140]), GF=loc([-215,144]); let FZF=FZ+toRoad+.6; if(GB[1]>FZ+1&&GB[1]<FZ+toRoad+10) FZF=GB[1];
    { const xa=-L/2-7, xb=L/2+3; let ub=clamp(GB[0],xa+2.6,xb-2.6), uf=clamp(GF[0],xa+1,xb-1); if(Math.abs(ub-uf)<3.2) uf=ub+(uf>=ub?1:-1)*3.2; uf=clamp(uf,xa+1,xb-1);
      const cuts=[[ub-2.2,ub+2.2],[uf-.65,uf+.65]].sort((p1,q1)=>p1[0]-q1[0]); let x0=xa; cuts.forEach(([c0,c1])=>{ fenceRun(w(x0,FZF),w(c0,FZF)); x0=c1; const A=w(c0,FZF), B=w(c1,FZF); OSP_REQ.push({x0:A[0],z0:A[1],x1:B[0],z1:B[1],G:c1-c0,tx:Math.cos(f.rot),tz:-Math.sin(f.rot),nx:Math.sin(f.rot),nz:Math.cos(f.rot),pc:null}); }); fenceRun(w(x0,FZF),w(xb,FZF)); }
    // wozy strażackie na placu przed halą
    { const truck=(x,z)=>{ const q=w(x,z); const t=new THREE.Group(); t.position.set(q[0],H(q[0],q[1]),q[1]); t.rotation.y=f.rot; scene.add(t); const rM=new THREE.MeshLambertMaterial({color:0xc4161c}), wM2=new THREE.MeshLambertMaterial({color:0xf2f2ee}), gM=new THREE.MeshLambertMaterial({color:0x25292d}), cM=new THREE.MeshPhongMaterial({color:0x7e99a8,shininess:90}), bl2=new THREE.MeshBasicMaterial({color:0x3a8cff});
        bx(t,2.5,1.9,4.7,0,.55,-.9,rM); bx(t,2.5,1.45,1.9,0,.55,2.0,rM); bx(t,2.3,.62,.05,0,1.28,2.97,cM); bx(t,.05,.5,1.2,1.26,1.3,2.0,cM,true); bx(t,.05,.5,1.2,-1.26,1.3,2.0,cM,true);
        bx(t,2.54,.2,6.6,0,1.15,.4,wM2,true); bx(t,.5,.1,4.4,.55,2.45,-.9,wM2,true); bx(t,.5,.1,4.4,-.55,2.45,-.9,wM2,true); for(let k=0;k<9;k++) bx(t,1.6,.04,.07,0,2.46,-3+k*.5,wM2,true);
        bx(t,1.7,.14,.3,0,2.0,2.55,bl2,true); bx(t,2.6,.3,.25,0,.3,3.05,gM); bx(t,2.6,.3,.25,0,.3,-3.2,gM); [[1.22,2.0],[-1.22,2.0],[1.22,-1.5],[-1.22,-1.5]].forEach(([xx,zz])=>{ const wh=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.35,12).rotateZ(Math.PI/2),gM); wh.position.set(xx,.55,zz); t.add(wh); });
        bx(t,1.0,.55,.04,0,1.0,-3.27,wM2,true); t.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); addSolid({x:q[0],z:q[1],hw:1.3,hd:3.1,c:Math.cos(-f.rot),s:Math.sin(-f.rot),r:3.5}); };
      const zt=FZ+Math.max(3.6,Math.min(toRoad-4,5.4)); truck(bays[0],zt); truck(bays[1]+.3,zt+.3); }
    fenceRun(w(-L/2-7,FZF),w(-L/2-7,-FZ-2));
    // ogrodzenie z płyt betonowych po prawej
    { const a=w(L/2+3,FZF), c=w(L/2+3,-FZ-3); const dx=c[0]-a[0],dz=c[1]-a[1],Ln=Math.hypot(dx,dz),an=Math.atan2(dz,dx); const N=Math.ceil(Ln/2);
      for(let k=0;k<N;k++){ const x=a[0]+dx*(k+.5)/N, z=a[1]+dz*(k+.5)/N; const p=new THREE.Mesh(new THREE.BoxGeometry(Ln/N-.06,1.9,.1),concM); p.position.set(x,H(x,z)+.95,z); p.rotation.y=-an; p.castShadow=true; scene.add(p); const ps=new THREE.Mesh(new THREE.BoxGeometry(.18,2.05,.18),concM); ps.position.set(a[0]+dx*k/N,H(x,z)+1.0,a[1]+dz*k/N); scene.add(ps); }
      addSolid({x:(a[0]+c[0])/2,z:(a[1]+c[1])/2,hw:Ln/2,hd:.12,c:Math.cos(an),s:Math.sin(an),r:Ln/2+.3}); }
  }
  let OSP_FLAG=null;
  buildPrzedszkole(); buildOSP(); LATER.forEach(f=>f());

  /* ================= miejsca ze zdjęć (Street View) ================= */
  const darkTile=new THREE.MeshLambertMaterial({color:0x4a3e36,map:tileTex}), brownFr=new THREE.MeshLambertMaterial({color:0x5a3b28}), glassDk=new THREE.MeshPhongMaterial({map:glassTex,shininess:110,specular:0x8899aa}), steelG=new THREE.MeshLambertMaterial({color:0x6c7478}), whiteM=new THREE.MeshLambertMaterial({color:0xf3f2ee});
  const gravelM=po(new THREE.MeshLambertMaterial({color:0x9d9384,map:detailTex,side:THREE.DoubleSide}),3);
  function frameWin(g,x,y,z,w,h,ry,fr){ pl(g,w+.14,h+.14,x,y,z,fr||brownFr,ry); const o=ry?[Math.sin(ry)*.012,Math.cos(ry)*.012]:[0,.012]; pl(g,w-.06,h-.06,x+o[0],y,z+o[1],glassDk,ry); }
  function sideWins(g,L,D,y,step,fr,skip){ for(let z=-D/2+step/2;z<D/2-.5;z+=step){ [-1,1].forEach(sd=>{ if(skip&&skip(sd,z))return; frameWin(g,sd*(L/2+.02),y,z,1.2,1.25,sd*Math.PI/2,fr); }); } }
  function hipRoof(g,w,d,h,y,mat,x,z){ const r=new THREE.Mesh(hipGeo,mat); r.scale.set(w,h,d); r.position.set(x||0,y,z||0); r.castShadow=true; g.add(r); return r; }
  function gableRoof(g,len,dep,h,y,mat,x,z,rot){ const r=new THREE.Mesh(gabGeo,mat); r.scale.set(len,h,dep); r.position.set(x||0,y,z||0); if(rot)r.rotation.y=rot; r.castShadow=true; g.add(r); return r; }
  function groupAt(b,road){ const f=frontSide(b,road); const g=new THREE.Group(); g.position.set(b.x,b.hc,b.z); g.rotation.y=f.rot; scene.add(g); b.front=f; return {f,g,L:f.len,D:f.dep,FZ:f.dep/2,low:b.hmin-0.4-b.hc,w:L2W(b.x,b.z,f.rot)}; }
  const sh=g=>g.traverse(o=>{ if(o.isMesh&&o.geometry.type!=='PlaneGeometry')o.castShadow=true; });
  const nearRoad=(b,re)=>nearestRoad(b.x,b.z,r=>r.t!=='track'&&(!re||re.test(r.n))).r;

  // --- Delikatesy Premium (Szkolna): piętrowy dom z lukarnami, szczyt z deską nad wejściem, czerwone szyldy, schody z poręczami ---
  function buildDelikatesy(b){ const {f,g,L,D,FZ,low,w}=groupAt(b,nearRoad(b,/Szkolna/)); const FL=1.0, WH=FL+3.4;
    const wall=new THREE.MeshLambertMaterial({color:0xe2e2de,map:plasterTex}), tilesM=new THREE.MeshLambertMaterial({color:0xc9a27a,map:tileTex});
    bx(g,L,WH-low,D,0,low,0,wall); bx(g,L+.05,FL+.5-low,D+.05,0,low,0,tilesM);
    gableRoof(g,L+1.2,D+1.4,4.6,WH,darkTile);
    // lukarny (3 po lewej) i jedna duża po prawej
    [-L*.36,-L*.22,-L*.08].forEach(x=>{ bx(g,1.8,1.6,2.2,x,WH+.6,D/2-1.3,wall); gableRoof(g,2.6,2.2,1.1,WH+2.2,darkTile,x,D/2-1.2,Math.PI/2); frameWin(g,x,WH+1.3,D/2-.18,.9,.9); });
    bx(g,3.2,2,2.6,L*.3,WH+.7,D/2-1.4,wall); gableRoof(g,3.0,3.6,1.3,WH+2.7,darkTile,L*.3,D/2-1.2,Math.PI/2); frameWin(g,L*.3,WH+1.6,D/2-.08,1.4,1.0);
    // centralny szczyt nad wejściem z deskowaniem
    const cx=-L*.05; bx(g,6.2,WH-low,1.6,cx,low,D/2+.4,wall); gableRoof(g,3.6,7.2,3.2,WH,darkTile,cx,D/2+.8,Math.PI/2);
    const woodT=tex(64,64,(x,w2,h2)=>{ x.fillStyle='#8a5a32'; x.fillRect(0,0,w2,h2); for(let i=0;i<w2;i+=6){ x.fillStyle='rgba(0,0,0,.25)'; x.fillRect(i,0,1,h2); } });
    tri(g,6.2,2.9,cx,WH,D/2+2.0,new THREE.MeshLambertMaterial({map:woodT}));
    [-1.3,1.3].forEach(o=>bx(g,.35,WH-FL,.35,cx+o,FL,D/2+2.4,whiteM)); bx(g,4.6,.3,1.8,cx,WH-.3,D/2+2.0,whiteM);
    const prem=tex(512,96,(x,w2,h2)=>{ x.fillStyle='#d6474a'; x.fillRect(0,0,w2,h2); x.fillStyle='#7a6a6a'; x.fillRect(w2*.36,4,w2*.28,h2-8); x.fillStyle='#fff'; x.font='italic 700 46px Georgia, serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('Premium',w2/2,h2/2); });
    const keep=new Set(); // sklep Delikatesy już nie istnieje - budynek bez szyldów
    const dlk=tex(1024,128,(x,w2,h2)=>{ x.fillStyle='#c8262c'; x.fillRect(0,0,w2,h2); x.fillStyle='#fff'; x.font='700 92px Georgia, serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('DELIKATESY',w2/2,h2/2+4); });
    pl(g,2.4,2.4,cx,FL+1.2,D/2+1.22,glassDk);
    // okna: parter z plakatami po prawej, brązowe ramy po lewej
    const post=tex(64,64,(x,w2,h2)=>{ x.fillStyle='#f3e7d6'; x.fillRect(0,0,w2,h2); x.fillStyle='#c0392b'; x.fillRect(6,8,24,18); x.fillStyle='#e9b77a'; x.fillRect(34,30,24,26); x.fillStyle='#7a4a2a'; x.fillRect(4,38,26,16); });
    [L*.17,L*.37].forEach(x=>{ pl(g,2.5,1.9,x,FL+1.4,D/2+.02,brownFr); pl(g,2.3,1.7,x,FL+1.4,D/2+.03,new THREE.MeshLambertMaterial({map:post})); });
    for(let x=-L/2+1.6;x<cx-3.5;x+=2.4) frameWin(g,x,FL+1.6,D/2+.02,1.1,1.3);
    sideWins(g,L,D,FL+1.6,3.2); const nB=g.children.length;
    // schody i poręcze, podjazd wzdłuż prawej części
    const stoneM=new THREE.MeshLambertMaterial({color:0x8f8278});
    for(let k=0;k<6;k++) bx(g,5.4-k*.15,FL*(6-k)/6,.42,cx,0+(FL*(6-k)/6-FL)*0,D/2+2.9+k*.42,stoneM,true);
    bx(g,5.6,FL,1.1,cx,0,D/2+2.6,stoneM);
    [-2.6,2.6].forEach(o=>{ const rl=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,3.2),steelG); rl.position.set(cx+o,FL+.6,D/2+4.4); rl.rotation.x=.28; g.add(rl); });
    bx(g,L*.42,.05,.05,L*.27,FL+1.0,D/2+1.5,steelG,true); for(let x=L*.06;x<L*.48;x+=1.6) bx(g,.05,1.0,.05,x,FL,D/2+1.5,steelG,true);
    bx(g,L*.44,FL,1.6,L*.27,0,D/2+.8,stoneM);
    sh(g); swapIn(g,'delikatesy',bodyOf(g,nB,keep),{sx:L/32,sz:D/20.5,low,L,D}); const lot=[[-L/2-2,FZ],[L/2+2,FZ],[L/2+2,FZ+10],[-L/2-2,FZ+10]].map(([x,z])=>w(x,z)); drape(lot,lotPaver,0.12,2.2); LOTS.push(lot); }

  // --- dworzec PKP Działoszyn (Kolejowa 8): piętrowy korpus z dachem czterospadowym, niższe skrzydło, czerwone obróbki, kominy ---
  function buildDworzec(b){ const {f,g,L,D,FZ,low,w}=groupAt(b,nearRoad(b,/Kolejowa/));
    const wall=new THREE.MeshLambertMaterial({color:0xb9b1a0,map:plasterTex}), plin=new THREE.MeshLambertMaterial({color:0x8d877c}), redT=new THREE.MeshLambertMaterial({color:0x6a2a1e}), roofS=new THREE.MeshLambertMaterial({color:0x463730,map:tileTex});
    const ML=L*.5, mx=-L/2+ML/2, WL=L-ML, wx=L/2-WL/2, H1=7.2, H2=4.2;
    bx(g,ML,H1-low,D,mx,low,0,wall); bx(g,WL,H2-low,D*.82,wx,low,-D*.09,wall); bx(g,L+.05,1.0-low,D+.05,0,low,0,plin);
    bx(g,ML+.7,.25,D+.7,mx,H1-.1,0,redT); bx(g,WL+.7,.25,D*.82+.7,wx,H2-.1,-D*.09,redT);
    hipRoof(g,ML+.8,D+.8,3.6,H1+.1,roofS,mx,0); hipRoof(g,WL+.8,D*.82+.8,2.6,H2+.1,roofS,wx,-D*.09);
    [[mx-ML*.2,-D*.2],[mx+ML*.25,D*.1],[wx+WL*.2,-D*.3]].forEach(([x,z],i)=>bx(g,.8,2.4,.8,x,i<2?H1+1.6:H2+1.4,z,new THREE.MeshLambertMaterial({color:0xa69a8a})));
    const wf=new THREE.MeshLambertMaterial({color:0x40291a});
    [-.32,0,.32].forEach(k=>{ frameWin(g,mx+k*ML,5.2,D/2+.02,1.1,1.5,0,wf); frameWin(g,mx+k*ML,2.2,D/2+.02,1.1,1.5,0,wf); });
    for(let x=wx-WL/2+1.6;x<wx+WL/2-.8;x+=2.2) frameWin(g,x,2.2,D*.32+.02,1.1,1.4,0,wf);
    pl(g,1.2,2.2,mx-ML*.42,1.1,D/2+.03,new THREE.MeshLambertMaterial({color:0x3a2e26})); pl(g,1.5,2.4,wx-WL/2+1,1.2,D*.32+.03,new THREE.MeshLambertMaterial({color:0x7a3b2a}));
    const keep=new Set(); keep.add(pl(g,2.2,.45,mx,3.9,D/2+.07,new THREE.MeshLambertMaterial({map:signTex('Działoszyn','#a3482f','#f0e2c8',256,52,'italic 600 30px Georgia, serif')})));
    bx(g,1.8,.5,.1,wx-WL/2+1,2.7,D*.32+.1,new THREE.MeshLambertMaterial({color:0x3f9a4a}));
    sideWins(g,ML,D,5.2,3.4,wf,(sd,z)=>sd>0); sh(g); swapIn(g,'dworzec',bodyOf(g,g.children.length,keep),{sx:L/17.5,sz:D/10,low,L,D});
    const lot=[[-L/2-8,FZ],[L/2+6,FZ],[L/2+6,FZ+14],[-L/2-8,FZ+14]].map(([x,z])=>w(x,z)); drape(lot,asphaltM,0.12,4); LOTS.push(lot);
    for(let k=0;k<3;k++){ const q=w(-L/2-6+k*8,FZ+16); EXTRA_TREES.push({x:q[0],z:q[1],s:R(1.6,2.0),con:false,tall:true}); } }

  // --- biurowiec Zakładu Kredowego „Minerał” (Kolejowa 17): żółty, piętrowy, płaski dach, kraty w parterze ---
  function buildMineral(b){ const {f,g,L,D,FZ,low,w}=groupAt(b,nearRoad(b,/Kolejowa/)); const HH=6.8;
    const yel=new THREE.MeshLambertMaterial({color:0xe6c35c,map:plasterTex}), brn=new THREE.MeshLambertMaterial({color:0x5a3a2a});
    bx(g,L,HH-low,D,0,low,0,yel); bx(g,L+.05,.6-low,D+.05,0,low,0,brn); bx(g,L+.5,.4,D+.5,0,HH,0,brn); bx(g,L-.3,.2,D-.3,0,HH+.2,0,new THREE.MeshLambertMaterial({color:0x4a4d50}));
    const n=Math.max(4,Math.floor(L/2.6)); for(let k=0;k<n;k++){ const x=-L/2+(k+.5)*L/n; frameWin(g,x,4.7,D/2+.02,1.15,1.4,0,whiteM); frameWin(g,x,1.8,D/2+.02,1.15,1.4,0,whiteM); for(let i=-2;i<=2;i++) bx(g,.04,1.4,.04,x+i*.25,1.1,D/2+.06,steelG,true); frameWin(g,x,4.7,-D/2-.02,1.15,1.4,Math.PI,whiteM); }
    bx(g,2.4,.15,1.2,-L*.18,3.0,D/2+.6,brn);
    const keep=new Set(); keep.add(pl(g,3.4,.9,-L*.32,3.5,D/2+.07,new THREE.MeshLambertMaterial({map:tex(512,128,(x,w2,h2)=>{ x.fillStyle='#f4f4f0'; x.fillRect(0,0,w2,h2); x.strokeStyle='#c22'; x.lineWidth=6; x.strokeRect(4,4,w2-8,h2-8); x.fillStyle='#c4221e'; x.font='italic 800 70px Barlow, Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('MINERAŁ',w2/2,h2/2+4); })})));
    sideWins(g,L,D,4.7,3,whiteM); sh(g); swapIn(g,'mineral',bodyOf(g,g.children.length,keep),{sx:L/9.5,sz:D/24,low,L,D});
    // portiernia i plac
    const pq=w(-L/2-9,FZ+3); const pg=new THREE.Group(); pg.position.set(pq[0],H(pq[0],pq[1]),pq[1]); pg.rotation.y=f.rot; scene.add(pg); bx(pg,5,3,4,0,-.3,0,yel); bx(pg,5.6,.3,4.6,0,2.7,0,new THREE.MeshLambertMaterial({color:0x5a5e62})); frameWin(pg,0,1.5,2.02,1.2,1.1,0,whiteM); addSolid({x:pq[0],z:pq[1],hw:2.5,hd:2,c:Math.cos(-f.rot+Math.PI/2),s:Math.sin(-f.rot+Math.PI/2),r:3.3}); sh(pg);
    const lot=[[-L/2-14,FZ],[L/2+8,FZ],[L/2+8,FZ+16],[-L/2-14,FZ+16]].map(([x,z])=>w(x,z)); drape(lot,asphaltM,0.12,4); LOTS.push(lot);
    [L*.15,L*.15+3,L*.15+6].forEach(x=>{ const q=w(x,FZ+5); LEW_SPOTS.push({x:q[0],z:q[1],h:Math.atan2(-f.nz,-f.nx)}); }); }

  // --- świetlica sołectwa Stacja (Słoneczna 14): biała, dwuspadowy brązowy dach, plac z czerwonej kostki, zielona siatka, parasol ---
  function buildSwietlica(b){ const {f,g,L,D,FZ,low,w}=groupAt(b,nearRoad(b,/Słoneczna|Dojazdowa/)); const HS=3.4;
    bx(g,L,HS-low,D,0,low,0,new THREE.MeshLambertMaterial({color:0xf1f1ec,map:plasterTex})); bx(g,L+.05,.5-low,D+.05,0,low,0,new THREE.MeshLambertMaterial({color:0x9c9a94}));
    const rf=new THREE.MeshLambertMaterial({color:0x5a3a2c,map:tileTex}); gableRoof(g,D+1.2,L+1.0,2.6,HS,rf,0,0,Math.PI/2);
    tri(g,L,2.4,0,HS,D/2+.02,new THREE.MeshLambertMaterial({color:0xf1f1ec})); bx(g,L+.9,.25,.15,0,HS-.1,D/2+.5,new THREE.MeshLambertMaterial({color:0x7a5030}));
    const keep=new Set(); keep.add(pl(g,1.8,.6,0,HS+.8,D/2+.05,new THREE.MeshLambertMaterial({map:signTex('10-lecie','#ffffff','#c4221e',256,84,'800 52px Barlow, Arial')})));
    const shut=new THREE.MeshLambertMaterial({color:0x6e7378}); [-L*.28,L*.28].forEach(x=>{ pl(g,1.5,1.5,x,1.8,D/2+.03,shut); }); pl(g,1.1,2.2,0,1.1,D/2+.03,glassDk);
    sideWins(g,L,D,1.8,3,shut); sh(g); swapIn(g,'swietlica',bodyOf(g,g.children.length,keep),{sx:L/15.5,sz:D/9.5,low,L,D});
    const onRd=(x,z,m)=>{ const q=w(x,z); return ROADS.some(r=>r.t!=='track'&&r.t!=='rail'&&roadDist(r,q[0],q[1])<r.w/2+m); };
    let PZ=12; for(let z=FZ+2;z<=FZ+12.6;z+=.5){ if([-L/2-3,-L/4,0,L/4,L/2+4,L/2+8].some(x=>onRd(x,z,.9))){ PZ=Math.max(3,z-FZ-.9); break; } }
    const plaza=[[-L/2-3,FZ],[L/2+8,FZ],[L/2+8,FZ+PZ],[-L/2-3,FZ+PZ]].map(([x,z])=>w(x,z)); drape(plaza,matPaverRed,0.13,1.2); LOTS.push(plaza);
    const blue=po(new THREE.MeshLambertMaterial({color:0x3f7fd0}),4); if(PZ>6&&!onRd(L/2+3.5,FZ+PZ/2,3)){ const q=w(L/2+3.5,FZ+PZ/2); const m=new THREE.Mesh(new THREE.PlaneGeometry(3.6,Math.min(5,PZ-2)).rotateX(-Math.PI/2),blue); m.position.set(q[0],H(q[0],q[1])+.16,q[1]); m.rotation.y=f.rot; scene.add(m); }
    const greenM=new THREE.MeshLambertMaterial({color:0x2f7a3a}); const t=fenceT.clone(); t.needsUpdate=true; t.repeat.set(1,1);
    const netM=new THREE.MeshLambertMaterial({map:t,transparent:true,alphaTest:.35,side:THREE.DoubleSide,color:0x3f8a4a});
    // siatka wzdłuż krawędzi placu - tylko tam, gdzie nie ma drogi
    for(let x=-L/2-3;x<L/2+8-.1;x+=2.5){ const x1=Math.min(L/2+8,x+2.5), zz=FZ+PZ+.4; if(onRd(x,zz,.6)||onRd(x1,zz,.6)||onRd((x+x1)/2,zz,.6))continue; const a=w(x,zz), b=w(x1,zz), c=[(a[0]+b[0])/2,(a[1]+b[1])/2];
      const fg=new THREE.Group(); fg.position.set(c[0],H(c[0],c[1]),c[1]); fg.rotation.y=f.rot; scene.add(fg); const net=new THREE.Mesh(new THREE.PlaneGeometry(x1-x,1.6),netM); net.position.y=.8; fg.add(net); bx(fg,.07,1.7,.07,-(x1-x)/2,0,0,greenM,true);
      addSolid({x:c[0],z:c[1],hw:(x1-x)/2,hd:.1,c:Math.cos(-f.rot+Math.PI/2)*0+Math.cos(f.rot),s:-Math.sin(f.rot),r:(x1-x)/2+.3}); }
    if(!onRd(L/2-1,FZ+Math.min(5,PZ*.45),2.5)){ const q=w(L/2-1,FZ+Math.min(5,PZ*.45)); const u=new THREE.Group(); u.position.set(q[0],H(q[0],q[1]),q[1]); scene.add(u); bx(u,.08,2.6,.08,0,0,0,whiteM); const cn=new THREE.Mesh(new THREE.ConeGeometry(2.4,.9,8,1,true),new THREE.MeshLambertMaterial({color:0x2f7a3a,side:THREE.DoubleSide})); cn.position.y=2.6; u.add(cn); sh(u); } }

  // --- park na Parkowej: siłownia zewnętrzna (limonkowa), ławki, ogrodzony plac zabaw ze zjeżdżalnią, wysokie drzewa ---
  function buildParkParkowa(){ const A=AREAS.find(a=>a.t==='lei:park'&&a!==PARK&&Math.hypot(centroid(a.pts)[0]-413,centroid(a.pts)[1]+184)<120); if(!A)return; const m=mar(A.pts); const L2=L2W(m.cx,m.cz,-m.an);
    const lime=new THREE.MeshLambertMaterial({color:0xb5d334}), dark=new THREE.MeshLambertMaterial({color:0x3c4146});
    const gym=(x,z,k)=>{ const q=L2(x,z); const g=new THREE.Group(); g.position.set(q[0],H(q[0],q[1]),q[1]); g.rotation.y=R(0,6); scene.add(g); bx(g,.14,2.0,.14,0,0,0,lime); bx(g,1.6,.1,.1,0,1.9,0,lime);
      if(k%2){ [-.6,.6].forEach(o=>{ const a=new THREE.Mesh(new THREE.BoxGeometry(.06,1.3,.06),lime); a.position.set(o,1.2,0); a.rotation.z=o*.4; g.add(a); bx(g,.35,.05,.25,o*1.3,.6,0,dark); }); }
      else { bx(g,.1,.1,1.2,0,.9,0,lime); bx(g,.5,.06,.3,0,.85,.6,dark); bx(g,.4,.06,.3,0,1.1,-.5,dark); } sh(g); addSolid({x:q[0],z:q[1],hw:.6,hd:.6,c:1,s:0,r:1}); };
    for(let k=0;k<4;k++) gym(-m.w*.15+k*3.2,m.d*.15,k);
    const bench=(x,z,ry)=>{ const q=L2(x,z); const g=new THREE.Group(); g.position.set(q[0],H(q[0],q[1]),q[1]); g.rotation.y=ry; scene.add(g); bx(g,1.8,.06,.45,0,.45,0,new THREE.MeshLambertMaterial({color:0x2f6a3a})); bx(g,1.8,.4,.06,0,.5,-.22,new THREE.MeshLambertMaterial({color:0x2f6a3a})); [-.75,.75].forEach(o=>bx(g,.08,.45,.4,o,0,0,dark)); sh(g); };
    bench(-m.w*.3,-m.d*.05,0); bench(m.w*.05,-m.d*.25,1.2); bench(m.w*.25,m.d*.2,3.1);
    // ogrodzony plac zabaw
    const pq=L2(-m.w*.3,-m.d*.25); const pg=new THREE.Group(); pg.position.set(pq[0],H(pq[0],pq[1]),pq[1]); pg.rotation.y=-m.an; scene.add(pg); const t=fenceT.clone(); t.needsUpdate=true; t.repeat.set(5,1);
    [[0,-5,0],[0,5,0],[-6,0,Math.PI/2],[6,0,Math.PI/2]].forEach(([x,z,r])=>{ const n=new THREE.Mesh(new THREE.PlaneGeometry(r?10:12,1.2),new THREE.MeshLambertMaterial({map:t,transparent:true,alphaTest:.35,side:THREE.DoubleSide,color:0x8f979b})); n.position.set(x,.6,z); n.rotation.y=r; pg.add(n); });
    const sl=new THREE.Mesh(new THREE.BoxGeometry(2.6,.06,.6),new THREE.MeshLambertMaterial({color:0xc8302a})); sl.position.set(1.5,.7,0); sl.rotation.z=-.5; pg.add(sl); bx(pg,1.2,1.2,1.2,-.6,0,0,new THREE.MeshLambertMaterial({color:0x9a6a3c}));
    // ścieżka i wysokie drzewa
    const path=[L2(-m.w/2,m.d*.05),L2(m.w/2,-m.d*.1)]; const pm=new THREE.Mesh(ribbon(path,1.6,.1,2),matPaver); pm.receiveShadow=true; scene.add(pm);
    for(let i=0;i<300&&EXTRA_TREES.filter(t=>t.pk).length<16;i++){ const x=R(-m.w/2,m.w/2), z=R(-m.d/2,m.d/2); const q=L2(x,z); if(!inPoly(q[0],q[1],A.pts)||blocked(q[0],q[1],2.5))continue; if(EXTRA_TREES.some(t=>t.pk&&Math.hypot(t.x-q[0],t.z-q[1])<7))continue; EXTRA_TREES.push({x:q[0],z:q[1],s:R(1.5,2.1),con:false,tall:true,pk:1}); } }

  // --- plac dla TIR-ów przy Szkolnej obok orlika (żwir; ciągniki siodłowe dostawiane później) ---
  let TIR_LOT=null;
  // plac naprzeciwko orlika: po drugiej stronie ul. Szkolnej (z dala od Delikatesów)
  { const cc=centroid(COURT.pts); const sz=ROADS.filter(r=>r.n==='Szkolna'&&r.t!=='track'); let best=null;
    sz.forEach(r=>{ for(let d=0;d<r.L;d+=2){ const s=sampleLine(r.pts,r.len,d); if(Math.abs(s.tz)<.7)continue; const dd=Math.hypot(s.x-cc[0],s.z-cc[1]); if(!best||dd<best.dd) best={r,s,d,dd}; } });
    if(best){ const r=best.r, s0=best.s; const toC=(cc[0]-s0.x)*-s0.tz+(cc[1]-s0.z)*s0.tx; const sd=toC>0?-1:1; // strona przeciwna do orlika
      outer: for(const dd of [0,6,-6,12,-12,18,-18,24,-24]){ const s=sampleLine(r.pts,r.len,clamp(best.d+dd,0,r.L)); const nx=-s.tz*sd, nz=s.tx*sd;
        for(const o of [r.w/2+11.5,r.w/2+13,r.w/2+15]){ const cx=s.x+nx*o, cz=s.z+nz*o; let ok=true;
          for(let u=-14;u<=14&&ok;u+=3.5)for(let v=-10;v<=10&&ok;v+=3.5){ const x=cx+s.tx*u+nx*v, z=cz+s.tz*u+nz*v; if(blocked(x,z,.5)||ROADS.some(q=>q.t!=='track'&&roadDist(q,x,z)<q.w/2+1.2)||inPoly(x,z,COURT.pts)||LOTS.some(l=>inPoly(x,z,l))) ok=false; }
          if(ok){ TIR_LOT={x:cx,z:cz,tx:s.tx,tz:s.tz,nx,nz}; break outer; } } } }
    if(TIR_LOT){ const {x,z,tx,tz,nx,nz}=TIR_LOT; const P=[[-14,-10],[14,-10],[14,10],[-14,10]].map(([u,v])=>[x+tx*u+nx*v,z+tz*u+nz*v]); drape(resample([...P,P[0]],3).slice(0,-1),gravelM,0.1,3); LOTS.push(P); } }

  // --- przejazd kolejowy na DK42 (rogatki, sygnalizatory, żółte barierki, ekrany akustyczne) ---
  const CROSS=[];
  function buildCrossing(x,z){ const nr=nearestRoad(x,z,r=>r===DK); const a=DK.pts[nr.seg],b=DK.pts[nr.seg+1]; let dx=b[0]-a[0],dz=b[1]-a[1]; const l=Math.hypot(dx,dz); dx/=l; dz/=l; const nx=-dz,nz=dx; const hw=DK.w/2;
    const redW=tex(16,128,(c)=>{ for(let i=0;i<8;i++){ c.fillStyle=i%2?'#d22':'#fff'; c.fillRect(0,i*16,16,16); } });
    const signalT=tex(64,64,(c)=>{ c.fillStyle='#111'; c.fillRect(0,0,64,64); c.fillStyle='#300'; c.beginPath(); c.arc(16,32,12,0,7); c.arc(48,32,12,0,7); c.fill(); });
    [[-1,1],[1,-1]].forEach(([side,along])=>{ const bx0=x+nx*side*(hw+1.2)+dx*along*6.5, bz0=z+nz*side*(hw+1.2)+dz*along*6.5; const g=new THREE.Group(); g.position.set(bx0,H(bx0,bz0),bz0); g.rotation.y=Math.atan2(dx*along,dz*along); scene.add(g);
      bx(g,.5,1.1,.4,0,0,0,new THREE.MeshLambertMaterial({color:0xd08a2a})); const arm=new THREE.Group(); arm.position.set(0,1.0,0); g.add(arm);
      const rw2=redW.clone(); rw2.needsUpdate=true; rw2.rotation=Math.PI/2; const boom=new THREE.Mesh(new THREE.BoxGeometry(1,.12,.12).translate(-.5,0,0),new THREE.MeshLambertMaterial({map:rw2})); boom.scale.x=hw+.2; arm.add(boom); arm.rotation.z=-1.45;
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,3.4,8).translate(0,1.7,0),whiteM); pole.position.set(.9,0,0); g.add(pole);
      const sig=new THREE.Mesh(new THREE.BoxGeometry(1.1,.5,.12),new THREE.MeshLambertMaterial({map:signalT})); sig.position.set(.9,2.6,.08); g.add(sig);
      const lamps=[new THREE.Mesh(new THREE.CircleGeometry(.17,12),new THREE.MeshBasicMaterial({color:0x330000})),new THREE.Mesh(new THREE.CircleGeometry(.17,12),new THREE.MeshBasicMaterial({color:0x330000}))]; lamps[0].position.set(.65,2.6,.15); lamps[1].position.set(1.15,2.6,.15); g.add(...lamps);
      const xs=new THREE.Group(); xs.position.set(.9,3.3,.06); [.6,-.6].forEach(r=>{ const p2=new THREE.Mesh(new THREE.BoxGeometry(1.3,.18,.03),new THREE.MeshLambertMaterial({map:redW})); p2.rotation.z=r; xs.add(p2); }); g.add(xs);
      const yel=new THREE.MeshLambertMaterial({color:0xf2c12e}); for(let k=0;k<2;k++){ bx(g,.05,1.0,.05,2+k*2.2,0,-1,yel,true); bx(g,2.2,.06,.06,3.1,.95+(k?-.4:0),-1,yel,true); }
      sh(g); CROSS.push({arm,boom,lamps,x:bx0,z:bz0}); addSolid({x:bx0,z:bz0,hw:.3,hd:.3,c:1,s:0,r:.5}); });
  }
  buildCrossing(-1043,586);

  // --- płot z szarych paneli wzdłuż torów przy przejeździe (wg zdjęcia) ---
  { const wt=tex(64,64,(x,w,h)=>{ x.fillStyle='#a6abae'; x.fillRect(0,0,w,h); x.fillStyle='#8b9094'; for(let i=0;i<w;i+=8) x.fillRect(i,0,2,h); }), wm=new THREE.MeshLambertMaterial({map:wt}), pm=new THREE.MeshLambertMaterial({color:0x2a2d30});
    const wallL=[]; const nearOther=(x,z,self)=>RAILS.some(q=>q!==self&&q.some((v,i)=>i<q.length-1&&segDist(x,z,v[0],v[1],q[i+1][0],q[i+1][1])<3.8));
    RAILS.forEach(pts=>{ const len=lineLen(pts), L=len[len.length-1]; [1,-1].forEach(sd=>{ for(let d=0;d<L-4;d+=4){ const a=sampleLine(pts,len,d), b=sampleLine(pts,len,d+4); const da=Math.hypot(a.x+1043,a.z-586); if(da>140||da<15) continue; const o=5.4; const pa=[a.x-a.tz*sd*o,a.z+a.tx*sd*o], pb=[b.x-b.tz*sd*o,b.z+b.tx*sd*o]; const c=[(pa[0]+pb[0])/2,(pa[1]+pb[1])/2];
        if([pa,pb,c].some(q=>nearOther(q[0],q[1],pts)||roadNearF(q[0],q[1],2)||blocked(q[0],q[1],.3,true))) continue; wallL.push([pa,pb,c]); } }); });
    wallL.forEach(([pa,pb,c])=>{ const l=Math.hypot(pb[0]-pa[0],pb[1]-pa[1]), ang=Math.atan2(pb[1]-pa[1],pb[0]-pa[0]); const g=new THREE.Group(); g.position.set(c[0],H(c[0],c[1]),c[1]); g.rotation.y=-ang; scene.add(g); bx(g,l,2.1,.07,0,.15,0,wm); bx(g,.12,2.5,.12,-l/2,0,0,pm,true);
      addSolid({x:c[0],z:c[1],hw:l/2,hd:.1,c:Math.cos(ang),s:Math.sin(ang),r:l/2+.2}); }); }

  // --- rozwidlenie ul. Kolejowej przy Wyzwolenia: trawiasta wyspa ze świerkami i znakiem (wg zdjęcia) ---
  { const KR=ROADS.filter(r=>r.n==='Kolejowa'); const F=[-1099,656]; const arms=[]; KR.forEach(r=>r.pts.forEach((v,i)=>{ if(Math.hypot(v[0]-F[0],v[1]-F[1])>1.5) return; [i-1,i+1].forEach(j=>{ const q=r.pts[j]; if(!q) return; const l=Math.hypot(q[0]-F[0],q[1]-F[1]); if(l>3) arms.push({u:[(q[0]-F[0])/l,(q[1]-F[1])/l],w:r.w}); }); }));
    let best=null; for(let i=0;i<arms.length;i++)for(let j=i+1;j<arms.length;j++){ const cs=arms[i].u[0]*arms[j].u[0]+arms[i].u[1]*arms[j].u[1]; if(cs>.2&&cs<.98&&(!best||cs>best.cs)) best={a:arms[i],b:arms[j],cs}; }
    if(best){ const {a,b}=best; let bx0=a.u[0]+b.u[0], bz0=a.u[1]+b.u[1]; const bl=Math.hypot(bx0,bz0); bx0/=bl; bz0/=bl; const half=Math.acos(best.cs)/2, off=3+.9, ap=off/Math.sin(half);
      const pt=(arm)=>{ let nx=bx0-(bx0*arm.u[0]+bz0*arm.u[1])*arm.u[0], nz=bz0-(bx0*arm.u[0]+bz0*arm.u[1])*arm.u[1]; const nl=Math.hypot(nx,nz)||1; nx/=nl; nz/=nl; return [F[0]+arm.u[0]*26+nx*off, F[1]+arm.u[1]*26+nz*off]; };
      const apex=[F[0]+bx0*ap,F[1]+bz0*ap], P1=pt(a), P2=pt(b); const tri3=[apex,P1,P2]; const gm=po(new THREE.MeshLambertMaterial({color:0x6a9a42,map:detailTex}),4); drape(resample([...tri3,tri3[0]],3).slice(0,-1),gm,0.1,4);
      const at=(f,g2)=>[apex[0]*(1-f-g2)+P1[0]*f+P2[0]*g2, apex[1]*(1-f-g2)+P1[1]*f+P2[1]*g2];
      [[.30,.30,1.5],[.5,.18,1.25],[.18,.52,1.1]].forEach(([f,g2,sc])=>{ const q=at(f,g2); if(!blocked(q[0],q[1],.6,true)) EXTRA_TREES.push({x:q[0],z:q[1],s:sc,con:true,col:'#244a24'}); });
      [[.45,.35],[.2,.2],[.6,.12]].forEach(([f,g2],i)=>{ const q=at(f,g2); EXTRA_TREES.push({x:q[0],z:q[1],s:.35+i*.05,con:false,col:['#6b8a3a','#7a9a42','#5f8238'][i]}); });
      const q=at(.62,.62), g=new THREE.Group(); g.position.set(q[0],H(q[0],q[1]),q[1]); g.rotation.y=Math.atan2(-bx0,-bz0); scene.add(g); const cvT=tex(64,96,(x,w,h)=>{ x.fillStyle='#fff'; x.fillRect(0,0,w,h); x.strokeStyle='#d22'; x.lineWidth=10; for(let k=0;k<2;k++){ x.beginPath(); x.moveTo(6,22+k*38); x.lineTo(w/2,54+k*38-30); x.lineTo(w-6,22+k*38); x.stroke(); } });
      bx(g,.06,1.2,.06,0,0,0,new THREE.MeshLambertMaterial({color:0x777b7e})); const bd=new THREE.Mesh(new THREE.PlaneGeometry(.55,.85),new THREE.MeshLambertMaterial({map:cvT,side:THREE.DoubleSide})); bd.position.set(0,1.45,.05); g.add(bd); addSolid({x:q[0],z:q[1],hw:.2,hd:.2,c:1,s:0,r:.4});
      [[.4,.5],[.55,.28]].forEach(([f,g2],i)=>{ const q2=at(f,g2); const st=new THREE.Mesh(new THREE.DodecahedronGeometry(.35+i*.1,0),new THREE.MeshLambertMaterial({color:0xb9b5aa})); st.position.set(q2[0],H(q2[0],q2[1])+.2,q2[1]); st.scale.y=.6; scene.add(st); }); } }

  // --- trakcja elektryczna nad torami: słupy z wysięgnikami i przewód jezdny ---
  { const masts=[], wires=[]; RAILS.forEach(pts=>{ const len=lineLen(pts), L=len[len.length-1]; let prev=null; for(let d=0;d<=L;d+=55){ const s=sampleLine(pts,len,d); if(s.x<X0||s.x>X1||s.z<Z0||s.z>Z1){ prev=null; continue; } const mx=s.x-s.tz*3.6, mz=s.z+s.tx*3.6; if(masts.some(m=>Math.hypot(m[0]-mx,m[1]-mz)<6)){ prev=null; continue; } if(blocked(mx,mz,.3)||roadNearF(mx,mz,1.5)){ prev=null; continue; }
      const y=H(s.x,s.z); masts.push([mx,mz,Math.atan2(s.tz,-s.tx)]); const wp=[s.x,y+6.2,s.z]; if(prev) wires.push(prev,wp); prev=wp; } });
    const mastM=new THREE.InstancedMesh(new THREE.BoxGeometry(.35,7.6,.35).translate(0,3.8,0),new THREE.MeshLambertMaterial({color:0x7a8084}),Math.max(1,masts.length));
    const armM=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,.12,4.2).translate(0,0,2.1),new THREE.MeshLambertMaterial({color:0x5c6266}),Math.max(1,masts.length));
    masts.forEach((m,i)=>{ dum.position.set(m[0],H(m[0],m[1]),m[1]); dum.rotation.set(0,m[2],0); dum.scale.set(1,1,1); dum.updateMatrix(); mastM.setMatrixAt(i,dum.matrix); dum.position.y+=6.6; dum.updateMatrix(); armM.setMatrixAt(i,dum.matrix); });
    mastM.castShadow=true; scene.add(mastM,armM);
    const wg=new THREE.BufferGeometry(); const arr=[]; wires.forEach(p=>arr.push(...p)); wg.setAttribute('position',new THREE.Float32BufferAttribute(arr,3)); scene.add(new THREE.LineSegments(wg,new THREE.LineBasicMaterial({color:0x2a2c2e}))); }

  // --- perony stacji Działoszyn ---
  { const st0=[-510,1462]; let best=null,bd=1e9; RAILS.forEach(pts=>{ for(let i=0;i<pts.length-1;i++){ const d=segDist(st0[0],st0[1],pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1]); if(d<bd){bd=d;best=pts;} } });
    if(best&&bd<60){ const len=lineLen(best); let d0=0,dd=1e9; for(let d=0;d<len[len.length-1];d+=4){ const s=sampleLine(best,len,d); const q=Math.hypot(s.x-st0[0],s.z-st0[1]); if(q<dd){dd=q;d0=d;} }
      const conc=new THREE.MeshLambertMaterial({color:0xa8a49c,map:detailTex}), yel=new THREE.MeshLambertMaterial({color:0xf2d02e});
      [1,-1].forEach(sd=>{ const line=[]; for(let d=d0-70;d<=d0+70;d+=5){ const s=sampleLine(best,len,d); line.push([s.x-s.tz*sd*4.6,s.z+s.tx*sd*4.6]); }
        for(let k=0;k<line.length-1;k++){ const a=line[k],c=line[k+1]; const ln=Math.hypot(c[0]-a[0],c[1]-a[1]); const ang=Math.atan2(-(c[1]-a[1]),c[0]-a[0]); const mx=(a[0]+c[0])/2, mz=(a[1]+c[1])/2, y=H(mx,mz);
          const pb=new THREE.Mesh(new THREE.BoxGeometry(ln+.05,1.3,3.2).translate(0,.2,0),conc); pb.position.set(mx,y,mz); pb.rotation.y=ang; pb.castShadow=true; pb.receiveShadow=true; scene.add(pb);
          const ye=new THREE.Mesh(new THREE.BoxGeometry(ln+.05,.02,.25),yel); ye.position.set(mx-Math.sin(ang)*0-(-(c[1]-a[1])/ln)*0, y+.86, mz); ye.rotation.y=ang; ye.translateZ(sd*1.35); scene.add(ye); }
        for(let k=0;k<line.length-1;k+=3){ const p=line[k]; addSolid({x:p[0],z:p[1],hw:1.6,hd:1.6,c:1,s:0,r:2.3}); }
        const sgn=signTex('Działoszyn','#1f4fa3','#ffffff',512,96,'700 62px Barlow, Arial'); [Math.floor(line.length*.3),Math.floor(line.length*.7)].forEach(k=>{ const p=line[k]; const g=new THREE.Group(); g.position.set(p[0],H(p[0],p[1])+.85,p[1]); scene.add(g); [-1.2,1.2].forEach(o=>bx(g,.08,2.6,.08,o,0,0,steelG)); const sp=new THREE.Mesh(new THREE.PlaneGeometry(3,.56),new THREE.MeshLambertMaterial({map:sgn,side:THREE.DoubleSide})); sp.position.y=2.4; const s=sampleLine(best,len,d0); sp.rotation.y=Math.atan2(s.tx,s.tz)+Math.PI/2; g.add(sp); }); }); } }

  // --- boisko przy Dojazdowej: trawa, bramki, wysokie piłkochwyty z siatki ---
  { const c0=[-905,1215]; let spot=null; for(let r=0;r<80&&!spot;r+=6)for(let a=0;a<6.28&&!spot;a+=.5){ const x=c0[0]+Math.cos(a)*r, z=c0[1]+Math.sin(a)*r; let ok=true; for(let u=-22;u<=22&&ok;u+=4)for(let v=-12;v<=12&&ok;v+=4){ if(blocked(x+u,z+v,.5)||ROADS.some(q=>roadDist(q,x+u,z+v)<q.w/2+2)) ok=false; } if(ok) spot=[x,z]; }
    if(spot){ const [x,z]=spot; const y=H(x,z); const g=new THREE.Group(); g.position.set(x,y,z); scene.add(g); const wh=new THREE.MeshLambertMaterial({color:0xf0f0ea});
      [-20,20].forEach(gx=>{ [-1.8,1.8].forEach(o=>bx(g,.1,2.1,.1,gx,0,o,wh)); bx(g,.1,.1,3.7,gx,2.05,0,wh); });
      const t=fenceT.clone(); t.needsUpdate=true; t.repeat.set(8,2); const netM=new THREE.MeshLambertMaterial({map:t,transparent:true,alphaTest:.3,side:THREE.DoubleSide,color:0xd8d8d0});
      [-23,23].forEach(gx=>{ const n=new THREE.Mesh(new THREE.PlaneGeometry(16,5),netM); n.position.set(gx,2.5,0); n.rotation.y=Math.PI/2; g.add(n); for(let o=-8;o<=8;o+=4) bx(g,.12,5.2,.12,gx,0,o,wh); });
      { const n=new THREE.Mesh(new THREE.PlaneGeometry(46,4),netM); n.position.set(0,2,-11); g.add(n); for(let gx=-23;gx<=23;gx+=5.75) bx(g,.12,4.2,.12,gx,0,-11,wh); }
      sh(g); addSolid({x,z:z-11,hw:23,hd:.15,c:1,s:0,r:24}); } }

  // --- Zacisze: ścieżka do szkoły od Wyzwolenia (aleja kasztanowców, zakaz wjazdu, tablica ogłoszeń) ---
  { const zc=ROADS.find(r=>r.n==='Zacisze'); if(zc){ const foot=[[-164,104],[-163,101],[-164,91],[-169,69],[-173,43],[-185,-25]]; const fm=new THREE.Mesh(ribbon(foot,2.2,.12,2.2),matPaver); fm.receiveShadow=true; scene.add(fm); WALKS.push({pts:resample(foot,4),len:lineLen(resample(foot,4)),road:zc});
      for(let d=8;d<Math.min(zc.L,140);d+=7.5){ const s=sampleLine(zc.pts,zc.len,zc.L-d); const o=zc.w/2+2.4; let x=s.x+s.tz*o, z=s.z-s.tx*o; if(foot.some((p,i)=>i<foot.length-1&&segDist(x,z,p[0],p[1],foot[i+1][0],foot[i+1][1])<2.6)){ x=s.x+s.tz*(o+4.2); z=s.z-s.tx*(o+4.2); } if(blocked(x,z,1.2))continue; EXTRA_TREES.push({x,z,s:R(1.5,1.8),con:false,tall:true,col:pick(['#b8742e','#c98a3a','#a8642a','#8f8a3a'])}); }
      { const rf=resample(foot,6.5); for(let i=1;i<rf.length-1;i++){ const q=rf[i], t=[rf[i+1][0]-rf[i-1][0],rf[i+1][1]-rf[i-1][1]], tl=Math.hypot(t[0],t[1])||1; const lx=t[1]/tl, lz=-t[0]/tl; const x=q[0]+lx*2.5+R(-.3,.3), z=q[1]+lz*2.5+R(-.3,.3); if(blocked(x,z,.5,true)||roadNearF(x,z,.5)) continue; EXTRA_TREES.push({x,z,s:R(1.7,2.1),con:false,tall:true,col:pick(['#b8742e','#c98a3a','#a8642a','#9a6a2c','#bf8036'])}); } }
      const s0=sampleLine(zc.pts,zc.len,zc.L-6); const o=zc.w/2+1.2; const sx=s0.x-s0.tz*o, sz=s0.z+s0.tx*o; const g=new THREE.Group(); g.position.set(sx,H(sx,sz),sz); g.rotation.y=Math.atan2(-s0.tx,-s0.tz); scene.add(g); bx(g,.07,2.4,.07,0,0,0,steelG);
      const ne=tex(64,64,(c)=>{ c.fillStyle='#fff'; c.beginPath(); c.arc(32,32,31,0,7); c.fill(); c.fillStyle='#d01e1e'; c.beginPath(); c.arc(32,32,28,0,7); c.fill(); c.fillStyle='#fff'; c.fillRect(12,27,40,10); });
      const sg=new THREE.Mesh(new THREE.CircleGeometry(.32,24),new THREE.MeshLambertMaterial({map:ne})); sg.position.set(0,2.3,.05); g.add(sg);
      const q=[s0.x+s0.tz*(zc.w/2+3.2),s0.z-s0.tx*(zc.w/2+3.2)]; const tb=new THREE.Group(); tb.position.set(q[0],H(q[0],q[1]),q[1]); tb.rotation.y=Math.atan2(-s0.tz,s0.tx); scene.add(tb); [-.6,.6].forEach(x=>bx(tb,.1,2.0,.1,x,0,0,brownFr)); bx(tb,1.4,1.0,.08,0,.9,0,new THREE.MeshLambertMaterial({color:0xa35a3a})); } }

  /* ---------- ogród przedszkola: altanka-domek, drabinki, piaskownica, opony, garaż, siatka panelowa ---------- */
  { const SZK=nearestRoad(...centroid(KINDER.pts),r=>r.n==='Szkolna').r; let best=null,bd=-1; const bb=bbox(KINDER.pts);
    for(let x=bb[0]+6;x<bb[2]-6;x+=2)for(let z=bb[1]+6;z<bb[3]-6;z+=2){ let ok=true; for(let u=-6;u<=6&&ok;u+=2)for(let v=-5;v<=5&&ok;v+=2){ if(!inPoly(x+u,z+v,KINDER.pts)||blocked(x+u,z+v,.6)) ok=false; } if(!ok)continue; const d=roadDist(SZK,x,z); if(d>bd){bd=d;best=[x,z];} }
    if(best){ const [gx,gz]=best; const y=H(gx,gz); const g=new THREE.Group(); g.position.set(gx,y,gz); scene.add(g); const wood=new THREE.MeshLambertMaterial({color:0x9a6a3c}), orange=new THREE.MeshLambertMaterial({color:0xe8892a}), dark=new THREE.MeshLambertMaterial({color:0x222426});
      // altanka ogrodowa (wg zdjęcia): ośmiokątna, słupy z łukowymi zastrzałami, balustrada w krzyże, dach z brązowego gontu z latarenką
      { const ag=new THREE.Group(); ag.position.set(3,0,-1.6); g.add(ag); const R0=2.1, tim=new THREE.MeshLambertMaterial({color:0xb4642a}), timD=new THREE.MeshLambertMaterial({color:0x9a5222}); const shing=tex(128,128,(c,w,h)=>{ c.fillStyle='#4a2f26'; c.fillRect(0,0,w,h); for(let y=0;y<h;y+=10)for(let x=(y/10%2)*8;x<w;x+=16){ c.fillStyle=['#55362b','#3f2820','#4d3127'][(x+y)%3]; c.beginPath(); c.moveTo(x,y); c.lineTo(x+15,y); c.lineTo(x+15,y+7); c.quadraticCurveTo(x+7.5,y+11,x,y+7); c.fill(); } },true);
        const base=new THREE.Mesh(new THREE.CylinderGeometry(R0+.5,R0+.55,.12,24),new THREE.MeshLambertMaterial({color:0xc9c4ba,map:texPaver})); base.position.y=.06; ag.add(base); const kerb=new THREE.Mesh(new THREE.TorusGeometry(R0+.55,.06,4,32).rotateX(Math.PI/2),new THREE.MeshLambertMaterial({color:0xbab4aa})); kerb.position.y=.1; ag.add(kerb);
        for(let k=0;k<8;k++){ const a=k/8*Math.PI*2+Math.PI/8, x=Math.cos(a)*R0, z=Math.sin(a)*R0; bx(ag,.16,2.3,.16,x,.12,z,tim);
          const a2=(k+1)/8*Math.PI*2+Math.PI/8, x2=Math.cos(a2)*R0, z2=Math.sin(a2)*R0, mx=(x+x2)/2, mz=(z+z2)/2, L=Math.hypot(x2-x,z2-z), ry=-Math.atan2(z2-z,x2-x);
          [[.25,.1],[2.3,.18]].forEach(([yy,hh])=>{ const r=new THREE.Mesh(new THREE.BoxGeometry(L,hh,.1),tim); r.position.set(mx,yy+.12,mz); r.rotation.y=ry; ag.add(r); });
          if(k!==2){ const top=new THREE.Mesh(new THREE.BoxGeometry(L,.08,.12),tim); top.position.set(mx,1.0,mz); top.rotation.y=ry; ag.add(top); [-1,1].forEach(sd=>{ const d=new THREE.Mesh(new THREE.BoxGeometry(L*.95,.06,.05),timD); d.position.set(mx,.62,mz); d.rotation.set(0,ry,sd*.62); ag.add(d); }); }
          [-1,1].forEach(sd=>{ const br=new THREE.Mesh(new THREE.BoxGeometry(.5,.09,.08),tim); br.position.set(x+(x2-x)*(sd<0?.12:.88)*1,2.08,z+(z2-z)*(sd<0?.12:.88)); br.rotation.set(0,ry,sd*.6); ag.add(br); }); }
        const fas=new THREE.Mesh(new THREE.CylinderGeometry(R0+.38,R0+.38,.26,8,1,true),new THREE.MeshLambertMaterial({color:0xb4642a,side:THREE.DoubleSide})); fas.rotation.y=Math.PI/8; fas.position.y=2.55; ag.add(fas);
        const roof=new THREE.Mesh(new THREE.ConeGeometry(R0+.55,1.35,8),new THREE.MeshLambertMaterial({map:shing})); roof.rotation.y=Math.PI/8; roof.position.y=2.68+.67; ag.add(roof);
        const lan=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.22,8),tim); lan.position.y=3.95; ag.add(lan); const lr=new THREE.Mesh(new THREE.ConeGeometry(.42,.32,8),new THREE.MeshLambertMaterial({map:shing})); lr.position.y=4.2; ag.add(lr);
        const tbl=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,.06,16),new THREE.MeshLambertMaterial({color:0xd8cfb0})); tbl.position.y=.82; ag.add(tbl); bx(ag,.1,.7,.1,0,.12,0,timD); for(let k=0;k<4;k++){ const a=k/4*Math.PI*2+.4; const ch=new THREE.Group(); ch.position.set(Math.cos(a)*1.05,.12,Math.sin(a)*1.05); ch.rotation.y=-a-Math.PI/2; ag.add(ch); bx(ch,.48,.06,.45,0,.42,0,timD); bx(ch,.06,.42,.06,-.2,0,-.18,timD); bx(ch,.06,.42,.06,.2,0,-.18,timD); bx(ch,.06,.42,.06,-.2,0,.18,timD); bx(ch,.06,.42,.06,.2,0,.18,timD); bx(ch,.48,.55,.05,0,.48,-.22,timD); }
        for(let k=0;k<8;k++){ if(k===2)continue; const a=k/8*Math.PI*2+Math.PI/8; addSolid({x:gx+3+Math.cos(a)*R0,z:gz-1.6+Math.sin(a)*R0,hw:.12,hd:.12,c:1,s:0,r:.2}); }
        for(let k=0;k<8;k++){ if(k===2)continue; const a=(k+.5)/8*Math.PI*2+Math.PI/8; addSolid({x:gx+3+Math.cos(a)*R0*.95,z:gz-1.6+Math.sin(a)*R0*.95,hw:.75,hd:.08,c:Math.cos(-a+Math.PI/2),s:Math.sin(-a+Math.PI/2),r:.8}); } addSolid({x:gx+3,z:gz-1.6,hw:.65,hd:.65,c:1,s:0,r:.9}); }
      // drabinki
      const cl=new THREE.Group(); cl.position.set(-3.5,0,-2.5); g.add(cl); [[-.9,-.5],[.9,-.5],[-.9,.5],[.9,.5]].forEach(([a,b])=>bx(cl,.1,2.0,.1,a,0,b,wood)); for(let k=1;k<5;k++){ bx(cl,1.9,.06,.06,0,k*.4,-.5,wood); bx(cl,1.9,.06,.06,0,k*.4,.5,wood); }
      // piaskownica
      { const sx=-154-gx, sz=-119-gz; bx(g,3,.25,3,sx,0,sz,wood); const sand=new THREE.Mesh(new THREE.PlaneGeometry(2.7,2.7).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0xe6d6a8})); sand.position.set(sx,.2,sz); g.add(sand); }
      // wkopane opony
      for(let k=0;k<4;k++){ const t=new THREE.Mesh(new THREE.TorusGeometry(.35,.12,8,16),dark); t.position.set(3+k*.8,.12,2.5); g.add(t); }
      // mały biały garaż z brązowymi drzwiami
      const ga=new THREE.Group(); ga.position.set(-149-gx,0,-102-gz); g.add(ga); bx(ga,3,2.4,4,0,0,0,new THREE.MeshLambertMaterial({color:0xeeeeea,map:plasterTex})); bx(ga,3.3,.2,4.3,0,2.4,0,new THREE.MeshLambertMaterial({color:0x6b3a2a})); pl(ga,2.2,1.9,0,.95,2.02,new THREE.MeshLambertMaterial({color:0x6b4430}));
      // plac zabaw wokół altanki: gumowa nawierzchnia, huśtawki, wieża ze zjeżdżalnią, bujaki, karuzela, huśtawka-równoważnia
      { const AB=(x,z)=>[x-gx,z-gz]; const PLP=[AB(-172,-122),AB(-165,-109),AB(-158,-127),AB(-152,-123),AB(-161,-115)], SLD=AB(-164,-104);
        const rubM=po(new THREE.MeshLambertMaterial({color:0x9b5a45,map:detailTex}),2); const rmat=(x,z,w,d)=>{ const r=new THREE.Mesh(new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2),rubM); r.position.set(x,.04,z); r.receiveShadow=true; g.add(r); };
        rmat(PLP[0][0],PLP[0][1],5.6,3.6); rmat(PLP[1][0],PLP[1][1],3.6,3.6); rmat(PLP[2][0],PLP[2][1],3.2,3.2); rmat(PLP[3][0],PLP[3][1],3.8,3.8); rmat(PLP[4][0],PLP[4][1],4.4,2.4); rmat(SLD[0],SLD[1]+.8,3.4,5.6);
        const bl=new THREE.MeshLambertMaterial({color:0x2f6fb5}), yl=new THREE.MeshLambertMaterial({color:0xf0c030}), rd=new THREE.MeshLambertMaterial({color:0xd33a2c}), gn=new THREE.MeshLambertMaterial({color:0x3fa34d}), stl=new THREE.MeshLambertMaterial({color:0x8a9096});
        const sol=(x,z,hw,hd)=>addSolid({x:gx+x,z:gz+z,hw,hd,c:1,s:0,r:Math.max(hw,hd)+.3});
        { const sg=new THREE.Group(); sg.position.set(PLP[0][0],0,PLP[0][1]); g.add(sg); [-1.7,1.7].forEach(x=>[-1,1].forEach(sd=>{ const lg=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,2.75,6).translate(0,1.37,0),bl); lg.position.set(x,0,sd*.8); lg.rotation.x=-sd*.3; sg.add(lg); })); bx(sg,3.8,.1,.1,0,2.62,0,bl);
          [-.7,.7].forEach(x=>{ [-.2,.2].forEach(z=>bx(sg,.02,2.1,.02,x,.55,z,stl,true)); bx(sg,.45,.04,.22,x,.5,0,yl,true); }); sg.rotation.y=Math.PI/2; sg.traverse(o=>o.castShadow=true); sol(PLP[0][0],PLP[0][1],.5,1.9); }
        { const sg=new THREE.Group(); sg.position.set(PLP[1][0],0,PLP[1][1]); g.add(sg); [[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]].forEach(([x,z])=>bx(sg,.08,2.0,.08,x,0,z,stl)); bx(sg,1.2,.07,1.2,0,1.4,0,yl); const rf=new THREE.Mesh(new THREE.ConeGeometry(.95,.7,4).translate(0,.35,0),rd); rf.position.y=2.0; rf.rotation.y=Math.PI/4; sg.add(rf); bx(sg,1.2,.4,.04,0,1.45,.58,bl,true);
          sg.traverse(o=>o.castShadow=true); sol(PLP[1][0],PLP[1][1],.8,.8); }
        { const sg=new THREE.Group(); sg.position.set(SLD[0],0,SLD[1]); g.add(sg); [[-.4,-.4],[.4,-.4],[-.4,.4],[.4,.4]].forEach(([x,z])=>bx(sg,.07,1.6,.07,x,0,z,stl)); bx(sg,1.0,.06,1.0,0,1.25,0,yl); for(let k=0;k<5;k++) bx(sg,.8,.04,.12,0,.2+k*.22,-.6-k*.0-.0,stl,true);
          const ramp=bx(sg,.62,.05,2.9,0,.62,1.9,bl,true); ramp.rotation.x=.4; bx(sg,.05,.22,2.8,.34,.7,1.9,bl,true).rotation.x=.4; bx(sg,.05,.22,2.8,-.34,.7,1.9,bl,true).rotation.x=.4; sg.traverse(o=>o.castShadow=true); sol(SLD[0],SLD[1]+.9,.8,2.0); }
        [[PLP[2][0]+.7,PLP[2][1]-.2,0xd33a2c],[PLP[2][0]-.7,PLP[2][1]+.2,0x3fa34d]].forEach(([x,z,col])=>{ const rk=new THREE.Group(); rk.position.set(x,0,z); g.add(rk); const mt=new THREE.MeshLambertMaterial({color:col}); const sp=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.45,8).translate(0,.22,0),stl); rk.add(sp); bx(rk,.28,.4,.7,0,.45,0,mt); const hd=new THREE.Mesh(new THREE.SphereGeometry(.2,8,6),mt); hd.position.set(0,.95,.35); rk.add(hd); bx(rk,.6,.04,.3,0,.7,0,yl,true); rk.traverse(o=>o.castShadow=true); sol(x,z,.4,.4); });
        { const cr=new THREE.Group(); cr.position.set(PLP[3][0],0,PLP[3][1]); g.add(cr); const dk=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.0,.1,16).translate(0,.35,0),rd); cr.add(dk); bx(cr,.08,.9,.08,0,.35,0,stl); for(let k=0;k<4;k++){ const a=k*Math.PI/2; bx(cr,.04,.6,.04,Math.cos(a)*.9,.4,Math.sin(a)*.9,bl,true); } const rg=new THREE.Mesh(new THREE.TorusGeometry(.9,.025,5,18).rotateX(Math.PI/2),bl); rg.position.y=.95; cr.add(rg); cr.traverse(o=>o.castShadow=true); sol(PLP[3][0],PLP[3][1],1.0,1.0); }
        { const sw=new THREE.Group(); sw.position.set(PLP[4][0],0,PLP[4][1]); g.add(sw); bx(sw,.2,.45,.2,0,0,0,stl); const bd=bx(sw,3.0,.07,.3,0,.45,0,gn); bd.rotation.z=.14; bx(sw,.06,.3,.06,-1.3,.5,0,yl,true); bx(sw,.06,.3,.06,1.3,.35,0,yl,true); sw.traverse(o=>o.castShadow=true); sol(PLP[4][0],PLP[4][1],1.5,.3); } }
      sh(g); [[-3.5,-2.5,1.3],[-5,3.5,2.3]].forEach(([u,v,r2])=>addSolid({x:gx+u,z:gz+v,hw:r2,hd:r2,c:1,s:0,r:r2*1.5}));
      // iglaki i brzozy dookoła
      for(let k=0;k<7;k++){ const a=k/7*6.28, rr=7.5; const x=gx+Math.cos(a)*rr, z=gz+Math.sin(a)*rr; if(inPoly(x,z,KINDER.pts)&&!blocked(x,z,1)) EXTRA_TREES.push({x,z,s:R(.8,1.1),con:k%2===0,col:k%2?'#7a8a3a':'#2d5a2a'}); }
      for(let k=0;k<=5;k++){ const u=k/5; const x=-177+16*u, z=-129-7*u; EXTRA_TREES.push({x,z,s:R(.9,1.2),con:k%2===0,col:k%2?'#7a8a3a':'#2d5a2a'}); }
      // zielony płot panelowy od strony ulicy Zagrodowej (przy altance): panele na słupkach, brama dwuskrzydłowa i furtka - wg zdjęcia
      { const ZG=ROADS.find(r=>r.n==='Zagrodowa'&&r.t!=='track'), P=KINDER.pts, kc=centroid(P); const fcol=0x2f6b3c, fmat=new THREE.MeshLambertMaterial({color:fcol}), fmesh=(()=>{ const t=fenceT.clone(); t.needsUpdate=true; t.repeat.set(1,1); return new THREE.MeshLambertMaterial({map:t,transparent:true,alphaTest:.35,side:THREE.DoubleSide,color:0x3f8a4a}); })();
        const runs=[]; for(let q=0;q<P.length-1;q++){ const a=P[q], b=P[q+1], l=Math.hypot(b[0]-a[0],b[1]-a[1]), mx=(a[0]+b[0])/2, mz=(a[1]+b[1])/2; if(!ZG||l<2||mx>-121||roadDist(ZG,mx,mz)>9) continue; const tx=(b[0]-a[0])/l, tz=(b[1]-a[1])/l; let nx=-tz, nz=tx; if((kc[0]-mx)*nx+(kc[1]-mz)*nz<0){ nx=-nx; nz=-nz; } runs.push({a:[a[0]+nx*.6,a[1]+nz*.6],tx,tz,l,ang:Math.atan2(tz,tx)}); }
        const nearRun=p=>{ let r0=null,d0=1e9,u0=0; runs.forEach(r=>{ const u=clamp((p[0]-r.a[0])*r.tx+(p[1]-r.a[1])*r.tz,0,r.l), d=Math.hypot(r.a[0]+r.tx*u-p[0],r.a[1]+r.tz*u-p[1]); if(d<d0){ d0=d; r0=r; u0=u; } }); return {r:r0,u:u0}; }; const nf=nearRun([-145,-143]), nb=nearRun([-149,-142]); let gr=nf.r, gu=nf.u;
        const KBT=BLD.find(b=>Math.hypot(b.x+139,b.z+134)<4); let rbT=null,ruT=0; { let rdT=1e9; if(KBT) runs.forEach(r=>{ const u=clamp((KBT.x-r.a[0])*r.tx+(KBT.z-r.a[1])*r.tz,1.5,r.l-1.5), d=Math.hypot(r.a[0]+r.tx*u-KBT.x,r.a[1]+r.tz*u-KBT.z); if(d<rdT){ rdT=d; rbT=r; ruT=u; } }); }
        const W2=(r,u)=>[r.a[0]+r.tx*u, r.a[1]+r.tz*u];
        const inBld=(x,z)=>BPOLY.some(pp=>inPoly(x,z,pp.pts))||BLD.some(b=>{ if(b.skip) return false; const dx=x-b.x, dz=z-b.z, c=Math.cos(b.a), sn=Math.sin(b.a); return Math.abs(dx*c+dz*sn)<b.w/2+.1&&Math.abs(-dx*sn+dz*c)<b.d/2+.1; });
        const piece=(r,u0,u1)=>{ const len=u1-u0; if(len<.2) return; const c=W2(r,(u0+u1)/2); if(inBld(c[0],c[1])) return; const g=new THREE.Group(); g.position.set(c[0],H(c[0],c[1]),c[1]); g.rotation.y=-r.ang; scene.add(g);
          const m=new THREE.Mesh(new THREE.PlaneGeometry(len,1.4),fmesh.clone()); m.material.map=fmesh.map.clone(); m.material.map.needsUpdate=true; m.material.map.repeat.set(len/1.6,1); m.position.y=.8; g.add(m); bx(g,len,.05,.05,0,1.5,0,fmat,true); bx(g,len,.05,.05,0,.08,0,fmat,true);
          addSolid({x:c[0],z:c[1],hw:len/2,hd:.08,c:Math.cos(r.ang),s:Math.sin(r.ang),r:len/2+.2}); };
        const post=(r,u,h2)=>{ const c=W2(r,u); const g=new THREE.Group(); g.position.set(c[0],H(c[0],c[1]),c[1]); scene.add(g); bx(g,.09,h2||1.65,.09,0,0,0,fmat,true); };
        runs.forEach(r=>{ const cuts=[]; if(r===nf.r) cuts.push([nf.u-.75,nf.u+.75]); if(r===nb.r) cuts.push([nb.u-1.7,nb.u+1.7]); cuts.sort((p1,q1)=>p1[0]-q1[0]); let u0=0, uEnd=r.l; if(r===rbT&&nf.r===rbT){ if(nf.u<ruT) uEnd=Math.min(r.l,ruT+.6); else u0=Math.max(0,ruT-.6); } const seg=(a,b)=>{ const n=Math.max(1,Math.ceil((b-a)/2.5)); for(let k=0;k<n;k++){ piece(r,a+(b-a)*k/n,a+(b-a)*(k+1)/n); post(r,a+(b-a)*k/n); } post(r,b); }; cuts.forEach(([a,b])=>{ if(a>u0) seg(u0,Math.min(a,uEnd)); u0=Math.max(u0,b); }); if(uEnd>u0) seg(u0,uEnd); });
        // nowy płot od placu zabaw: (-123,-105) -> (-164,-94) -> (-176,-131)
        { const PL=[[-123,-105],[-164,-94],[-176,-131]]; for(let q=0;q<PL.length-1;q++){ const a=PL[q], b=PL[q+1], l=Math.hypot(b[0]-a[0],b[1]-a[1]); const r={a,tx:(b[0]-a[0])/l,tz:(b[1]-a[1])/l,l,ang:Math.atan2(b[1]-a[1],b[0]-a[0])}; const fu=(q===1)?clamp((-166-a[0])*r.tx+(-98-a[1])*r.tz,2,l-2):-99; const n=Math.max(1,Math.ceil(l/2.5)); for(let k=0;k<n;k++){ const u0=l*k/n, u1=l*(k+1)/n; if(fu>0&&(u0+u1)/2>fu-.8-(u1-u0)/2&&(u0+u1)/2<fu+.8+(u1-u0)/2){ post(r,u0); continue; } piece(r,u0,u1); post(r,u0); } post(r,l);
          if(fu>0){ const c=W2(r,fu); const fg=new THREE.Group(); fg.position.set(c[0],H(c[0],c[1]),c[1]); fg.rotation.y=-r.ang; scene.add(fg); [-.65,.65].forEach(o=>bx(fg,.1,1.75,.1,o,0,0,fmat,true)); const fr=new THREE.Group(); fr.position.set(-.55,0,0); fr.rotation.y=-1.1; fg.add(fr); [0,1.1].forEach(o=>bx(fr,.06,1.55,.06,o,0,0,fmat,true)); [.1,.8,1.5].forEach(yy=>bx(fr,1.1,.05,.05,.55,yy,0,fmat,true)); const lm=new THREE.Mesh(new THREE.PlaneGeometry(1.02,1.35),fmesh.clone()); lm.material.map=fmesh.map.clone(); lm.material.map.needsUpdate=true; lm.material.map.repeat.set(.7,1); lm.position.set(.55,.8,0); fr.add(lm); } } }
        { const KB=BLD.find(b=>Math.hypot(b.x+139,b.z+134)<4); if(KB&&runs.length){ let rb=null,rd=1e9,ru=0; runs.forEach(r=>{ const u=clamp((KB.x-r.a[0])*r.tx+(KB.z-r.a[1])*r.tz,1.5,r.l-1.5), q=W2(r,u), d=Math.hypot(q[0]-KB.x,q[1]-KB.z); if(d<rd){ rd=d; rb=r; ru=u; } });
          if(rb){ const Q=W2(rb,ru); let dx=KB.x-Q[0], dz=KB.z-Q[1]; const dl=Math.hypot(dx,dz)||1; dx/=dl; dz/=dl; const wl=Math.max(2,dl-KB.d/2); const r2={a:Q,tx:dx,tz:dz,l:wl,ang:Math.atan2(dz,dx)}; const mid=wl*.5; const n=Math.max(1,Math.ceil(mid/2.5));
            const half=(a,b)=>{ const nn=Math.max(1,Math.ceil((b-a)/2.5)); for(let k=0;k<nn;k++){ piece(r2,a+(b-a)*k/nn,a+(b-a)*(k+1)/nn); post(r2,a+(b-a)*k/nn); } post(r2,b); }; half(0,mid-.6); half(mid+.6,wl);
            { const c=W2(r2,mid); const fg=new THREE.Group(); fg.position.set(c[0],H(c[0],c[1]),c[1]); fg.rotation.y=-r2.ang; scene.add(fg); const fr=new THREE.Group(); fr.position.set(-.55,0,0); fr.rotation.y=-1.2; fg.add(fr); [0,1.1].forEach(o=>bx(fr,.06,1.55,.06,o,0,0,fmat,true)); [.1,.8,1.5].forEach(yy=>bx(fr,1.1,.05,.05,.55,yy,0,fmat,true)); const lm=new THREE.Mesh(new THREE.PlaneGeometry(1.02,1.35),fmesh.clone()); lm.material.map=fmesh.map.clone(); lm.material.map.needsUpdate=true; lm.material.map.repeat.set(.7,1); lm.position.set(.55,.8,0); fr.add(lm); } } } }
        { const mkReq=(rn,u,Gw,only)=>{ if(!rn) return; const A=W2(rn,u-Gw/2), B=W2(rn,u+Gw/2); let nxx=-rn.tz, nzz=rn.tx; if((kc[0]-A[0])*nxx+(kc[1]-A[1])*nzz<0){ nxx=-nxx; nzz=-nzz; } KG_REQ.push({x0:A[0],z0:A[1],x1:B[0],z1:B[1],G:Gw,tx:rn.tx,tz:rn.tz,nx:nxx,nz:nzz,pc:null,green:true,steel:true,hs:1.12,onlyBrama:only}); }; mkReq(nb.r,nb.u,3.4,true); mkReq(nf.r,nf.u,1.5,false); }
        if(gr){ const c=W2(gr,gu); const g=new THREE.Group(); g.position.set(c[0],H(c[0],c[1]),c[1]); g.rotation.y=-gr.ang; scene.add(g);
          const leaf=(x0,w0)=>{ const fr=new THREE.Group(); fr.position.set(x0,0,0); g.add(fr); [-w0/2,w0/2].forEach(o=>bx(fr,.06,1.55,.06,o,0,0,fmat,true)); [.1,.8,1.5].forEach(yy=>bx(fr,w0,.05,.05,0,yy,0,fmat,true)); const m=new THREE.Mesh(new THREE.PlaneGeometry(w0-.08,1.35),fmesh.clone()); m.material.map=fmesh.map.clone(); m.material.map.needsUpdate=true; m.material.map.repeat.set(w0/1.6,1); m.position.y=.8; fr.add(m); };
          // ścieżka z kostki od furtki do altanki (po lewej stronie ogrodu)
          const nrm=[-gr.tz,gr.tx]; const inward=((kc[0]-c[0])*nrm[0]+(kc[1]-c[1])*nrm[1])>0?nrm:[-nrm[0],-nrm[1]]; const gz2=[gx+3,gz-1.6];
          const P0=[c[0]+inward[0]*.6,c[1]+inward[1]*.6], P1=[c[0]+inward[0]*3.5-gr.tx*1.5,c[1]+inward[1]*3.5-gr.tz*1.5], P2=[(P1[0]+gz2[0])/2-gr.tx*.4,(P1[1]+gz2[1])/2-gr.tz*.4];
          const path=resample([P0,P1,P2,gz2],1.5); const pm=new THREE.Mesh(ribbon(path,1.6,.1,1.6),matPaverRed); pm.receiveShadow=true; scene.add(pm); WALKS.push({pts:resample(path,4),len:lineLen(resample(path,4)),road:ZG}); } } } }

  // --- ogrodzenie szkoły (wg zdjęcia): czarny kuty płot z łukami na cokole, tuje, ceglane słupki bramy ---
  { const P=SCHOOL.pts, kc=centroid(P); const ironT=tex(128,64,(x,w,h)=>{ x.clearRect(0,0,w,h); x.strokeStyle='#15171a'; x.lineWidth=2.4; for(let i=4;i<w;i+=8){ x.beginPath(); x.moveTo(i,h*.2); x.lineTo(i,h-4); x.stroke(); } x.lineWidth=3.5; x.beginPath(); x.moveTo(0,h*.3); x.quadraticCurveTo(w/2,-h*.08,w,h*.3); x.stroke(); x.beginPath(); x.moveTo(0,h-6); x.lineTo(w,h-6); x.stroke(); x.beginPath(); x.moveTo(0,h*.55); x.lineTo(w,h*.55); x.stroke(); });
    const im=new THREE.MeshLambertMaterial({map:ironT,transparent:true,alphaTest:.3,side:THREE.DoubleSide,color:0x25272a}), blk=new THREE.MeshLambertMaterial({color:0x1c1e20}), plm=new THREE.MeshLambertMaterial({color:0x9a968c,map:detailTex}), brk=new THREE.MeshLambertMaterial({color:0xa94a2e,map:detailTex}), cap=new THREE.MeshLambertMaterial({color:0x8d8a82});
    const segs=[], posts=[], thuja=[], gates=[]; let gDone=false; const G2L=[[-183.3,-26]]; if(SCHOOL_M){ const {cx:sx,cz:sz,an:sa}=SCHOOL_M; G2L.push([sx-4.25*Math.cos(sa)-13*Math.sin(sa),sz-4.25*Math.sin(sa)+13*Math.cos(sa)]); } const G2D=G2L.map(()=>false);
    for(let q=0;q<P.length-1;q++){ const a=P[q], b=P[q+1], l=Math.hypot(b[0]-a[0],b[1]-a[1]); if(l<4) continue; const mx=(a[0]+b[0])/2, mz=(a[1]+b[1])/2; if(!roadNearF(mx,mz,6)) continue; const tx=(b[0]-a[0])/l, tz=(b[1]-a[1])/l; let nx=-tz, nz=tx; if((kc[0]-mx)*nx+(kc[1]-mz)*nz<0){ nx=-nx; nz=-nz; }
      const A=[a[0]+nx*2.2,a[1]+nz*2.2]; const ang=Math.atan2(tz,tx); const gu0=(!gDone&&l>25)?(()=>{ const gp0=[-122,-94], u=(gp0[0]-A[0])*tx+(gp0[1]-A[1])*tz, dv=Math.abs((gp0[0]-A[0])*nx+(gp0[1]-A[1])*nz); return (u>2.6&&u<l-2.6&&dv<14)?u:-99; })():-99; const gu=(gu0>0&&Math.hypot(A[0]+tx*gu0+208,A[1]+tz*gu0+118)<9)?-99:gu0; if(gu>0) gDone=true; const g2=[]; G2L.forEach((gp,gi)=>{ if(G2D[gi]) return; const u=(gp[0]-a[0])*tx+(gp[1]-a[1])*tz, dv=Math.abs((gp[0]-a[0])*nx+(gp[1]-a[1])*nz); if(u>2&&u<l-2&&dv<14){ g2.push(u); G2D[gi]=true; } }); const n=Math.max(1,Math.round(l/2.5));
      for(let k=0;k<n;k++){ const u0=k/n*l, u1=(k+1)/n*l, um=(u0+u1)/2, c=[A[0]+tx*um,A[1]+tz*um]; if(gu>0&&Math.abs(um-gu)<2.6){ if(!gates.length) gates.push({x:A[0]+tx*gu,z:A[1]+tz*gu,ang,tx,tz,nx,nz}); continue; } { const gq=g2.find(u=>Math.abs(um-u)<3.3); if(gq!==undefined){ const gx0=A[0]+tx*gq, gz0=A[1]+tz*gq; if(!gates.some(q=>q.open&&Math.hypot(q.x-gx0,q.z-gz0)<1)){ const sg=(nx*-tz+nz*tx)>0?1:-1; gates.push({x:gx0,z:gz0,ang,tx,tz,nx,nz,open:1,sg}); } continue; } } if([u0,um,u1].some(u=>blocked(A[0]+tx*u,A[1]+tz*u,0,true)||roadNearF(A[0]+tx*u,A[1]+tz*u,.3))) continue; segs.push([c[0],c[1],ang,(u1-u0)]); posts.push([A[0]+tx*u0,A[1]+tz*u0,ang]);
        if(k%2===0&&!g2.some(u=>Math.abs(um-u)<4.6)){ const tq=[c[0]+nx*.9,c[1]+nz*.9]; if(!blocked(tq[0],tq[1],.2,true)) thuja.push(tq); } } }
    { // narożnik szkoły przy (-116,-60): domknięcie płotu na zakręcie
      let vi=-1,vd=12; P.forEach((v,i)=>{ const d=Math.hypot(v[0]+116,v[1]+60); if(i<P.length-1&&d<vd){ vd=d; vi=i; } });
      if(vi>=0){ const v=P[vi], nb=[P[(vi+1)%(P.length-1)],P[(vi-1+P.length-1)%(P.length-1)]]; nb.forEach(o=>{ const l=Math.hypot(o[0]-v[0],o[1]-v[1]); if(l<1) return; const tx=(o[0]-v[0])/l, tz=(o[1]-v[1])/l; let nx=-tz, nz=tx; if((kc[0]-v[0])*nx+(kc[1]-v[1])*nz<0){ nx=-nx; nz=-nz; } const ang=Math.atan2(tz,tx);
          for(let u=0;u<8;u+=2){ const c=[v[0]+nx*2.2+tx*(u+1),v[1]+nz*2.2+tz*(u+1)]; if(segs.some(q=>Math.hypot(q[0]-c[0],q[1]-c[1])<3.2)||blocked(c[0],c[1],0,true)) continue; segs.push([c[0],c[1],ang,2]); posts.push([v[0]+nx*2.2+tx*u,v[1]+nz*2.2+tz*u,ang]); } }); } }
    const dm=new THREE.Object3D();
    { const ip=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1.5).translate(0,.25+.75,0),im,Math.max(1,segs.length)), pl=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.3,.22).translate(0,.15,0),plm,Math.max(1,segs.length));
      segs.forEach((q,i)=>{ dm.position.set(q[0],H(q[0],q[1]),q[1]); dm.rotation.set(0,-q[2],0); dm.scale.set(q[3]+.04,1,1); dm.updateMatrix(); ip.setMatrixAt(i,dm.matrix); pl.setMatrixAt(i,dm.matrix); addSolid({x:q[0],z:q[1],hw:q[3]/2,hd:.1,c:Math.cos(q[2]),s:Math.sin(q[2]),r:q[3]/2+.3}); }); ip.count=pl.count=segs.length; scene.add(ip,pl);
      const sp=new THREE.InstancedMesh(new THREE.BoxGeometry(.09,1.85,.09).translate(0,.92,0),blk,Math.max(1,posts.length)); posts.forEach((q,i)=>{ dm.position.set(q[0],H(q[0],q[1]),q[1]); dm.rotation.set(0,0,0); dm.scale.set(1,1,1); dm.updateMatrix(); sp.setMatrixAt(i,dm.matrix); }); sp.count=posts.length; sp.castShadow=true; scene.add(sp);
      const tm=new THREE.InstancedMesh(new THREE.ConeGeometry(.42,2.7,7).translate(0,1.35,0),new THREE.MeshLambertMaterial({color:0x2c5a33}),Math.max(1,thuja.length)); thuja.forEach((q,i)=>{ dm.position.set(q[0],H(q[0],q[1]),q[1]); dm.rotation.set(0,i*1.9,0); dm.scale.set(1,.85+((i*29)%10)/35,1); dm.updateMatrix(); tm.setMatrixAt(i,dm.matrix); }); tm.count=thuja.length; tm.castShadow=true; scene.add(tm); }
    gates.forEach(G=>{ const g=new THREE.Group(); g.position.set(G.x,H(G.x,G.z),G.z); g.rotation.y=-G.ang; scene.add(g); const po2=G.open?3.4:2.5; [-po2,po2].forEach(o=>{ bx(g,.55,2.1,.55,o,0,0,brk); bx(g,.7,.12,.7,o,2.1,0,cap); });
      const leaf=(x0,w0,open)=>{ const f=new THREE.Group(); f.position.set(x0,0,0); f.rotation.y=open; g.add(f); const m=new THREE.Mesh(new THREE.PlaneGeometry(w0,1.5),im.clone()); m.material.map=ironT.clone(); m.material.map.needsUpdate=true; m.material.map.repeat.set(w0/2.5,1); m.position.set(-x0*0+ (x0<0?w0/2:-w0/2)*0,1.1,0); m.position.x=x0<0?w0/2:-w0/2; f.add(m); bx(f,w0,.06,.06,x0<0?w0/2:-w0/2,.3,0,blk,true); };
      if(G.open){ leaf(-3.1,2.3,-G.sg*1.45); leaf(3.1,2.3,G.sg*1.45); } else { leaf(-2.2,2.0,0); leaf(2.2,2.0,-1.1); } });
  }

  // --- ogródek skalny przy narożniku przedszkola od Szkolnej (wg zdjęcia): żwir z głazami, tuje, świerk, znaki ---
  { const c0=[-127.5,-121]; if(inPoly(c0[0],c0[1],KINDER.pts)){ const gv=new THREE.Mesh(new THREE.CircleGeometry(3.4,24).rotateX(-Math.PI/2),po(new THREE.MeshLambertMaterial({color:0xaaa497,map:detailTex}),3)); gv.position.set(c0[0],H(c0[0],c0[1])+.07,c0[1]); gv.receiveShadow=true; scene.add(gv);
      const stoneM=new THREE.MeshLambertMaterial({color:0xb4afa4,map:detailTex}); for(let k=0;k<14;k++){ const a=k/14*6.28+.3, r=2.2+((k*7)%5)*.3; const x=c0[0]+Math.cos(a)*r, z=c0[1]+Math.sin(a)*r; const st=new THREE.Mesh(new THREE.DodecahedronGeometry(.22+((k*3)%4)*.1,0),stoneM); st.position.set(x,H(x,z)+.12,z); st.scale.y=.65; st.rotation.y=k; st.castShadow=true; scene.add(st); }
      [[0,0,2.6],[.9,-.8,2.3],[-.9,-.6,2.0]].forEach(([u,v,hh],i)=>{ const x=c0[0]+u-1.2, z=c0[1]+v-.6; const th=new THREE.Mesh(new THREE.ConeGeometry(.55,hh,8).translate(0,hh/2,0),new THREE.MeshLambertMaterial({color:i?0x2f5d31:0x35693a})); th.position.set(x,H(x,z),z); th.castShadow=true; scene.add(th); });
      EXTRA_TREES.push({x:c0[0]-1.6,z:c0[1]-1.4,s:1.5,con:true,col:'#3d6f6a'});
      const sc=new THREE.Group(); sc.position.set(c0[0]+.4,H(c0[0],c0[1]),c0[1]+.8); scene.add(sc); bx(sc,.9,.5,.7,0,0,0,stoneM); bx(sc,.5,.8,.4,0,.5,0,stoneM);
      const sg=new THREE.Group(); sg.position.set(c0[0]+3.6,H(c0[0]+3.6,c0[1]+1.5),c0[1]+1.5); scene.add(sg); bx(sg,.06,2.7,.06,0,0,0,steelG); const nsT=tex(64,64,(x)=>{ x.fillStyle='#fff'; x.beginPath(); x.arc(32,32,31,0,7); x.fill(); x.fillStyle='#1c4fa8'; x.beginPath(); x.arc(32,32,26,0,7); x.fill(); x.strokeStyle='#d22'; x.lineWidth=6; x.beginPath(); x.moveTo(14,14); x.lineTo(50,50); x.moveTo(50,14); x.lineTo(14,50); x.stroke(); });
      const sgn=new THREE.Mesh(new THREE.CircleGeometry(.3,20),new THREE.MeshLambertMaterial({map:nsT,side:THREE.DoubleSide})); sgn.position.set(0,2.3,.04); sg.add(sgn); bx(sg,.3,.4,.03,0,1.65,.04,new THREE.MeshLambertMaterial({color:0x1c4fa8}),true); sg.rotation.y=Math.PI/2; addSolid({x:sg.position.x,z:sg.position.z,hw:.1,hd:.1,c:1,s:0,r:.3}); } }
  if(CB.delik) buildDelikatesy(CB.delik); if(CB.dworzec) buildDworzec(CB.dworzec); if(CB.mineral) buildMineral(CB.mineral); if(CB.swietl) buildSwietlica(CB.swietl); buildParkParkowa();
  // domy ze zdjęć (Wyzwolenia 159-163 naprzeciw kościoła, kwiaciarnia „Sas-Anka” przy Szkolnej 9, Szkolna 3) - modele z tools/blender/budynki2.py
  function buildPhotoHouse(b,name,re,ML,MD,col,roofCol,extra){ const {f,g,L,D,FZ,low,w}=groupAt(b,nearRoad(b,re)); const H0=5.8;
    const ph=[bx(g,L,H0-low,D,0,low,0,new THREE.MeshLambertMaterial({color:col,map:plasterTex})), gableRoof(g,L+1,D+1,3.4,H0,new THREE.MeshLambertMaterial({color:roofCol,map:tileTex}))];
    swapIn(g,name,ph,{sx:L/ML,sz:D/MD,low,L,D}); if(extra) extra({f,g,L,D,FZ,w}); return {f,g,L,D,FZ,w}; }
  if(CB.w159) buildPhotoHouse(CB.w159,'dom_w159',/Wyzwolenia/,10.5,12,0xecebe7,0x3b3f45);
  if(CB.w161) buildPhotoHouse(CB.w161,'dom_w161',/Wyzwolenia/,8.5,11,0xefe2c9,0x3e7a3a);
  if(CB.w163) buildPhotoHouse(CB.w163,'dom_w163',/Wyzwolenia/,10,11,0xf1e9d6,0x5b3b2d);
  if(CB.szk3) buildPhotoHouse(CB.szk3,'dom_szk3',/Szkolna/,11.5,11,0xe8dcc4,0x4f545a);
  // budynki ze zdjęć Street View przy DK42 / Wyzwolenia / Piłsudskiego (modele: tools/blender/foto_dk42.py) + szyldy
  function photoBld(b,name,ML,MD,col,roofCol,H0,sign){ const nr=nearestRoad(b.x,b.z,r=>r.t!=='track'&&r.t!=='srv'&&r.t!=='path'); const {f,g,L,D,FZ,low,w}=groupAt(b,nr.r);
    const ph=[bx(g,L,H0-low,D,0,low,0,new THREE.MeshLambertMaterial({color:col,map:plasterTex})), gableRoof(g,L+1,D+1,3.2,H0,new THREE.MeshLambertMaterial({color:roofCol,map:tileTex}))];
    swapIn(g,name,ph,{sx:L/ML,sz:D/MD,low,L,D});
    if(sign){ const sm=new THREE.MeshLambertMaterial({map:signTex(sign.text,sign.bg,sign.fg,512,sign.h||112,sign.font||'800 66px Barlow, Arial',sign.stripe)}); const pl=frontPlane(f,sign.y,sign.w,sign.w*(sign.h||112)/512,sm,.1+(sign.out||0)); if(sign.dx){ pl.position.x+=-f.nz*sign.dx; pl.position.z+=f.nx*sign.dx; } }
    return {f,g,L,D,w}; }
  if(CB.komf) photoBld(CB.komf,'komfort',31.5,29,0xc9c2b3,0x4d555d,5.4,{text:'komfort',bg:'#f2f0ea',fg:'#1f4aa8',y:5.6,w:9,h:128,font:'italic 800 84px Barlow, Arial',stripe:'#1f4aa8',out:.1});
  if(CB.manu) photoBld(CB.manu,'salon',29.5,14.5,0xefe4cf,0x5b3a2a,4.4,{text:'SALON ŁAZIENEK',bg:'#5a5d62',fg:'#ffffff',y:3.9,w:7.6,h:96,font:'700 56px Barlow, Arial',out:1.9});
  if(CB.tutti) photoBld(CB.tutti,'tutti',31,15.5,0xf0e6d2,0x6b4332,4.2,{text:'Tutti Flori',bg:'#f6f1e6',fg:'#7a2f7a',y:3.2,w:5.4,h:110,font:'italic 700 62px Barlow, Arial',out:2.35});
  if(CB.autop) photoBld(CB.autop,'autopart',12,10,0xa3a9ae,0x555a60,6.6,{text:'AUTOPART',bg:'#2e3134',fg:'#ffffff',y:5.4,w:7.5,h:100,font:'800 64px Barlow, Arial',out:.12});
  if(CB.hgraf) photoBld(CB.hgraf,'autopart_hala',18.5,14,0x9da3a8,0x6b7075,5.6,null);
  if(CB.zuh) photoBld(CB.zuh,'zuh',16,40,0x464a50,0x3c4046,6.4,null);
  if(CB.zabdom) photoBld(CB.zabdom,'dom_zabka',10,9,0x8e8d88,0x4a3329,3.1,null);
  if(CB.przed) photoBld(CB.przed,'przedszkole',18,8,0xd9d3b4,0x7a4636,6.3,null);
  if(CB.dstary) photoBld(CB.dstary,'dom_stary',10,9.5,0xc8ab8d,0x6d7378,5.4,null);
  if(CB.dsolar) photoBld(CB.dsolar,'dom_solar',12.5,10,0xe6dcc4,0x4b3b34,5.2,null);

  // --- firmy za torami (Wyzwolenia): powierzchnie wg OSM/ortofotomapy, ogrodzenia i żywopłoty, szczegóły wg Street View ---
  { const pav=po(new THREE.MeshLambertMaterial({color:0x7e8184,map:detailTex}),4), grv=po(new THREE.MeshLambertMaterial({color:0xa9a497,map:detailTex}),4), lawn=po(new THREE.MeshLambertMaterial({color:0x5f9a3e,map:detailTex}),5);
    const ZUH=[[-1341,579],[-1302,565],[-1296,664],[-1335,678]];
    const ABP=[[-1195,652],[-1187,648],[-1183,647],[-1098,697],[-1095,707],[-1090,707],[-1084,732],[-1088,730],[-1107,718],[-1147,692],[-1174,675],[-1170,670]];
    drape(resample([...ZUH,ZUH[0]],4).slice(0,-1),pav,0.08,3); drape(resample([...ABP,ABP[0]],4).slice(0,-1),grv,0.08,3);
    // F.H. Weltsamen i IKAR: place utwardzone wokół zabudowy
    { const bs=BLD.filter(b=>b.x<-1540&&b.x>-1600&&b.z>610&&b.z<750&&!b.skip); if(bs.length){ const x0=Math.min(...bs.map(b=>b.x))-14, x1=Math.max(...bs.map(b=>b.x))+14, z0=Math.min(...bs.map(b=>b.z))-14, z1=Math.max(...bs.map(b=>b.z))+14; const yd=[[x0,z0],[x1,z0],[x1,z1],[x0,z1]]; drape(resample([...yd,yd[0]],4).slice(0,-1),grv,0.08,3); } }
    { const c=Math.cos(32*Math.PI/180), sn=Math.sin(32*Math.PI/180); const yd=[[-34,-24],[34,-24],[34,26],[-34,26]].map(([u,v])=>[-1357+u*c-v*sn,758+u*sn+v*c]); drape(resample([...yd,yd[0]],4).slice(0,-1),pav,0.08,3); }
    // Z.U.H. ZBYSZKO: trawnik od ulicy z żywopłotem tui, ciemne ogrodzenie, brama, 4 flagi
    const A=[-1335,678], B=[-1296,664], eL=Math.hypot(B[0]-A[0],B[1]-A[1]), eT=[(B[0]-A[0])/eL,(B[1]-A[1])/eL], eN=[eT[1]*-1*-1,-eT[0]]; // eN: w głąb działki (na północ)
    const nrm=(eN[1]>0)?[-eN[0],-eN[1]]:eN; const at=(u,v)=>[A[0]+eT[0]*u+nrm[0]*v, A[1]+eT[1]*u+nrm[1]*v]; const gu=eL*.55, gw=6;
    [[0,gu-gw/2],[gu+gw/2,eL]].forEach(([u0,u1])=>{ const pg=[at(u0,0),at(u1,0),at(u1,6),at(u0,6)]; drape(pg,lawn,0.1,4); });
    // żywopłot tui wzdłuż ulicy i boków
    const thuja=[]; const edge=(a,b,skip)=>{ const L=Math.hypot(b[0]-a[0],b[1]-a[1]), n=Math.floor(L/.85); for(let k=0;k<=n;k++){ const u=k/n*L; if(skip&&u>skip[0]&&u<skip[1]) continue; thuja.push([a[0]+(b[0]-a[0])*k/n, a[1]+(b[1]-a[1])*k/n]); } };
    edge(at(0,1.2),at(eL,1.2),[gu-gw/2,gu+gw/2]); edge(ZUH[0],ZUH[3]); edge(ZUH[1],ZUH[2]);
    { const ge=new THREE.ConeGeometry(.5,2.6,7).translate(0,1.3,0), im=new THREE.InstancedMesh(ge,new THREE.MeshLambertMaterial({color:0x2f5d31}),thuja.length), dm=new THREE.Object3D(); thuja.forEach((q,i)=>{ dm.position.set(q[0],H(q[0],q[1]),q[1]); dm.rotation.set(0,i*1.7,0); dm.scale.set(1,.85+((i*37)%10)/40,1); dm.updateMatrix(); im.setMatrixAt(i,dm.matrix); }); im.castShadow=true; scene.add(im); }
    // ogrodzenie panelowe (grafit) za żywopłotem
    { const segs=[]; const ed=(a,b,skip)=>{ const L=Math.hypot(b[0]-a[0],b[1]-a[1]), n=Math.max(1,Math.round(L/2.5)); for(let k=0;k<n;k++){ const u0=k/n*L, u1=(k+1)/n*L, um=(u0+u1)/2; if(skip&&um>skip[0]-.5&&um<skip[1]+.5) continue; const m=[a[0]+(b[0]-a[0])*(k+.5)/n,a[1]+(b[1]-a[1])*(k+.5)/n]; segs.push([m[0],m[1],Math.atan2(b[1]-a[1],b[0]-a[0]),L/n]); } };
      ed(at(0,.3),at(eL,.3),[gu-gw/2,gu+gw/2]); ed(ZUH[0],ZUH[3]); ed(ZUH[1],ZUH[2]); ed(ZUH[0],ZUH[1]);
      const t=fenceT.clone(); t.needsUpdate=true; t.repeat.set(1.25,1); const fm=new THREE.MeshLambertMaterial({map:t,transparent:true,alphaTest:.35,side:THREE.DoubleSide,color:0x30343a}); const im=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1.8).translate(0,.9,0),fm,segs.length), dm=new THREE.Object3D();
      segs.forEach((q,i)=>{ dm.position.set(q[0],H(q[0],q[1]),q[1]); dm.rotation.set(0,-q[2],0); dm.scale.set(q[3],1,1); dm.updateMatrix(); im.setMatrixAt(i,dm.matrix); addSolid({x:q[0],z:q[1],hw:q[3]/2,hd:.1,c:Math.cos(q[2]),s:Math.sin(q[2]),r:q[3]/2+.3}); }); scene.add(im); }
    // flagi przy bramie
    { const poleM=new THREE.MeshLambertMaterial({color:0xd8dadc}); [0,1,2,3].forEach(i=>{ const q=at(gu-gw/2-1.2-i*1.7,3.4); const g=new THREE.Group(); g.position.set(q[0],H(q[0],q[1]),q[1]); g.rotation.y=-Math.atan2(eT[1],eT[0]); scene.add(g); bx(g,.07,7,.07,0,0,0,poleM,true); const fl=new THREE.Mesh(new THREE.PlaneGeometry(.9,2.3),new THREE.MeshLambertMaterial({color:i%2?0xb12a30:0x55595e,side:THREE.DoubleSide})); fl.position.set(.5,5.3,0); fl.rotation.y=Math.PI/2; g.add(fl); }); }
    // AUTOPART: stosy opon, żółty kontener i naczepy na placu (wg zdjęcia z Kolejowej)
    { const tg=new THREE.TorusGeometry(.5,.2,6,12), tm=new THREE.MeshLambertMaterial({color:0x1d1e20}); const tires=[]; [[-1108,706],[-1103,714],[-1112,718]].forEach(([cx,cz],pi)=>{ for(let k=0;k<26;k++){ const a=k*2.4, r=Math.sqrt(k/26)*3.2, x=cx+Math.cos(a)*r, z=cz+Math.sin(a)*r; if(blocked(x,z,.3,true)||roadNearF(x,z,1.5)) continue; tires.push([x,z,Math.floor(k/9)*.32+.2,(k*1.3)%3.1,(k*.7)%1.2]); } });
      const im=new THREE.InstancedMesh(tg,tm,Math.max(1,tires.length)), dm=new THREE.Object3D(); tires.forEach((q,i)=>{ dm.position.set(q[0],H(q[0],q[1])+q[2],q[1]); dm.rotation.set(Math.PI/2-q[4]*.2,q[3],q[4]*.3); dm.scale.set(1,1,1); dm.updateMatrix(); im.setMatrixAt(i,dm.matrix); }); im.count=tires.length; im.castShadow=true; scene.add(im);
      const cq=[-1121,714]; if(!blocked(cq[0],cq[1],2,true)){ const g=new THREE.Group(); g.position.set(cq[0],H(cq[0],cq[1]),cq[1]); g.rotation.y=.5; scene.add(g); bx(g,6,2.5,2.4,0,0,0,new THREE.MeshLambertMaterial({color:0xc9a53a,map:detailTex})); addSolid({x:cq[0],z:cq[1],hw:3,hd:1.2,c:Math.cos(-.5),s:Math.sin(-.5),r:3.4}); } } }
  if(CB.kwiac) buildPhotoHouse(CB.kwiac,'kwiaciarnia',/Szkolna/,12.5,11,0xecd2b4,0x5e3a2b,({f,g,L,D,FZ,w})=>{
    // tablica „Kwiaciarnia Sas-Anka” na ogrodzeniu i ceglasto-czerwony płot z drewnianych sztachet na podmurówce
    const kT=tex(512,192,(c,W,Hh)=>{ c.fillStyle='#f6f8f2'; c.fillRect(0,0,W,Hh); const gr=c.createLinearGradient(0,0,W*.4,0); gr.addColorStop(0,'#f2b6d0'); gr.addColorStop(1,'#f6f8f2'); c.fillStyle=gr; c.fillRect(0,0,W*.45,Hh);
      for(let i=0;i<9;i++){ c.fillStyle=['#e86aa0','#f4a3c4','#d94a86'][i%3]; c.beginPath(); c.arc(40+(i%3)*44,40+Math.floor(i/3)*48,18,0,7); c.fill(); }
      c.fillStyle='#3a8a3a'; c.fillRect(0,Hh-22,W,22); c.fillStyle='#2a5a2a'; c.font='700 34px Barlow, Arial'; c.textAlign='left'; c.fillText('KWIACIARNIA',190,58); c.fillStyle='#c2185b'; c.font='800 38px Barlow, Arial'; c.fillText('„SAS-ANKA”',190,104);
      c.fillStyle='#333'; c.font='500 18px Barlow, Arial'; c.fillText('kwiaty • wieńce • wiązanki',190,138); });
    const fenceZ=FZ+3.2, q=w(L*.32,fenceZ); const sg=new THREE.Group(); sg.position.set(q[0],H(q[0],q[1]),q[1]); sg.rotation.y=f.rot; scene.add(sg); bx(sg,2.6,1.0,.05,0,1.15,0,new THREE.MeshLambertMaterial({map:kT}));
    const red=new THREE.MeshLambertMaterial({color:0xb4553c}), post=new THREE.MeshLambertMaterial({color:0x8a7f74,map:detailTex}), plinth=new THREE.MeshLambertMaterial({color:0x9a948a,map:detailTex});
    for(let x=-L/2-2;x<L/2+2;x+=2.4){ const x1=Math.min(L/2+2,x+2.4); if(x<-.6&&x1>-2.6)continue; const a=w(x,fenceZ), b2=w(x1,fenceZ), c=[(a[0]+b2[0])/2,(a[1]+b2[1])/2]; const fg=new THREE.Group(); fg.position.set(c[0],H(c[0],c[1]),c[1]); fg.rotation.y=f.rot; scene.add(fg);
      bx(fg,x1-x,.35,.25,0,0,0,plinth); for(let k=0;k<(x1-x)/.16-1;k++){ const sx=-(x1-x)/2+.12+k*.16; bx(fg,.1,1.1+.08*Math.sin(k*.6),.03,sx,.35,0,red,true); } bx(fg,x1-x,.07,.05,0,1.15,-.03,red,true); bx(fg,.32,1.55,.32,-(x1-x)/2,0,0,post);
      addSolid({x:c[0],z:c[1],hw:(x1-x)/2,hd:.15,c:Math.cos(-f.rot),s:Math.sin(-f.rot),r:(x1-x)/2+.3}); }
    const pv=[[-L/2-2,FZ],[L/2+2,FZ],[L/2+2,fenceZ],[-L/2-2,fenceZ]].map(([x,z])=>w(x,z)); drape(pv,matPaverRed,0.12,1.4); LOTS.push(pv); });
  // elektrownie wiatrowe (OSM: generator:source=wind) - wieża i obracający się wirnik; daleko widoczne mimo mgły
  const TURBINES=[]; [[-2774,155,.3],[-2815,-439,.3],[-2990,-120,.35],[-3060,420,.32],[-2930,760,.4]].forEach(([x,z,yw],i)=>{ const g=new THREE.Group(); g.position.set(x,H(x,z)-.2,z); g.rotation.y=yw; scene.add(g); const rot=new THREE.Group(); rot.position.set(-2.4,95.4,0); g.add(rot); rot.rotation.x=i*.7; TURBINES.push(rot);
    whenModel('wiatrak',()=>{ const t=modelClone('wiatrak'), r=modelClone('wiatrak_wirnik'); [t,r].forEach(m=>{ if(!m)return; m.material=m.material.clone(); m.material.fog=false; m.material.color.set(0xd9e0e6); m.castShadow=false; }); if(t) g.add(t); if(r) rot.add(r); }); });
  function turbinesUpdate(dt){ TURBINES.forEach((r,i)=>r.rotation.x+=dt*(1.05+i*.07)); }
  await LP(44);
  /* ---------- ogrodzenia wzdłuż granic działek (ULDK) ---------- */
  const KBB=bbox(KINDER.pts); const nearSchool=(x,z,d)=>{ const P=SCHOOL.pts; for(let i=0;i<P.length-1;i++) if(segDist(x,z,P[i][0],P[i][1],P[i+1][0],P[i+1][1])<d) return true; return false; };
  const noFence=(x,z)=>nearSchool(x,z,16)||(x>KBB[0]-4&&x<KBB[2]+7&&z>KBB[1]-4&&z<KBB[3]+4)||LOTS.some(l=>inPoly(x,z,l))||LOCKERS.some(l=>Math.hypot(l.x-x,l.z-z)<7)||[B_LEW,B_ZAB].some(b=>Math.hypot(b.x-x,b.z-z)<Math.hypot(b.w,b.d)/2+7)||[SCHOOL,KINDER,PARK,CEM,OSPA].some(a=>inPoly(x,z,a.pts))||[COURT,PITCH2].some(a=>{const c=centroid(a.pts);return Math.hypot(x-c[0],z-c[1])<35;});
  const roadNear=(x,z,m)=>ROADS.some(r=>r.t!=='track'&&roadDist(r,x,z)<r.w/2+m);
  const GAPS=[], GATES=[], DRIVE_SPOTS=[];
  { const front=[], side=[]; const seen=new Set();
    // puste małe działki przy ulicy, graniczące z ogrodzonymi (np. naprzeciw przedszkola i Żabki), też dostają płot, żeby ogrodzenie nie urywało się w pół ulicy
    { const near2=(a,b)=>a.bb[0]<b.bb[2]+2&&a.bb[2]>b.bb[0]-2&&a.bb[1]<b.bb[3]+2&&a.bb[3]>b.bb[1]-2; const share=(a,b)=>a.p.some(u=>b.p.some(v=>Math.hypot(u[0]-v[0],u[1]-v[1])<2));
      const cand=PARCELS.filter(pc=>{ if(pc.res) return false; const ar=Math.abs(polyArea(pc.p)); if(ar<120||ar>2600) return false; const c=centroid(pc.p); if(noFence(c[0],c[1])||blocked(c[0],c[1],0)) return false; if(pc.p.some((a,i)=>{ const b=pc.p[(i+1)%pc.p.length]; const ex=b[0]-a[0], ez=b[1]-a[1], l2=ex*ex+ez*ez||1; const t=Math.max(0,Math.min(1,((B_ZAB.x-a[0])*ex+(B_ZAB.z-a[1])*ez)/l2)); return Math.hypot(a[0]+ex*t-B_ZAB.x,a[1]+ez*t-B_ZAB.z)<28; })) return false; /* przy Żabce (wjazd na parking) bez płotu */ return pc.p.some((a,i)=>{ const b=pc.p[(i+1)%pc.p.length]; return roadNear((a[0]+b[0])/2,(a[1]+b[1])/2,4.5); }); });
      for(let it=0;it<3;it++){ let ch=false; cand.forEach(pc=>{ if(pc.fenceFill) return; if(PARCELS.some(o=>o!==pc&&(o.res||o.fenceFill)&&near2(pc,o)&&share(pc,o))){ pc.fenceFill=true; ch=true; } }); if(!ch) break; } }
    PARCELS.forEach(pc=>{ if(!pc.res&&!pc.fenceFill)return; const p=pc.p;
      for(let i=0;i<p.length;i++){ const a=p[i], b=p[(i+1)%p.length]; const L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L<1.5||L>220)continue;
        const key=[Math.round(a[0]),Math.round(a[1]),Math.round(b[0]),Math.round(b[1])]; const k1=key.join(','), k2=[key[2],key[3],key[0],key[1]].join(','); if(seen.has(k1)||seen.has(k2))continue; seen.add(k1);
        const mx=(a[0]+b[0])/2, mz=(a[1]+b[1])/2; if(noFence(mx,mz))continue;
        const isFront=roadNear(mx,mz,4.5); const n=Math.max(1,Math.round(L/2.5)); const tx=(b[0]-a[0])/L, tz=(b[1]-a[1])/L; const ang=Math.atan2(tz,tx);
        for(let k=0;k<n;k++){ const t0=k/n, t1=(k+1)/n; const cx=a[0]+(b[0]-a[0])*(t0+t1)/2, cz=a[1]+(b[1]-a[1])*(t0+t1)/2;
          if(isFront&&n>3&&Math.hypot(cx+208,cz+118)>9&&Math.abs((t0+t1)/2-.5)<1.6/L+.5/n){ (pc.gaps=pc.gaps||[]).push([a,b,t0,t1,i]); continue; }           // brama
          if(roadNear(cx,cz,isFront?0.4:1.2))continue; { const ex=a[0]+(b[0]-a[0])*t0, ez=a[1]+(b[1]-a[1])*t0, fx=a[0]+(b[0]-a[0])*t1, fz=a[1]+(b[1]-a[1])*t1; if(roadNear(ex,ez,.25)||roadNear(fx,fz,.25))continue; } if(blocked(cx,cz,.15)||noFence(cx,cz))continue; if([-.5,-.25,.25,.5].some(k=>blocked(cx+Math.cos(ang)*k*L/n,cz+Math.sin(ang)*k*L/n,0,true)))continue;
          (isFront?front:side).push([cx,cz,ang,L/n]); } } });
    // ---- płoty wzdłuż ulic bez działek (Reja, Dojazdowa, Batorego, Plater) i po wschodniej stronie Szkolnej naprzeciw Lewiatana: front z bramą i furtką, boki między sąsiadami ----
    { const PT=(r,sd,sv,o)=>{ const q=sampleLine(r.pts,r.len,clamp(sv,0,r.L)); return [q.x-sd*q.tz*o,q.z+sd*q.tx*o,q]; };
      const FPIECE=2.5, GATEG=4.6;
      const fLine=(r,sd,s0,s1,dF,gates)=>{ const n=Math.max(1,Math.round((s1-s0)/FPIECE)); for(let k=0;k<n;k++){ const a0=s0+(s1-s0)*k/n, a1=s0+(s1-s0)*(k+1)/n, sm=(a0+a1)/2; if((gates||[]).some(g=>Math.abs(sm-g)<3.4)) continue; const A=PT(r,sd,a0,dF), B=PT(r,sd,a1,dF), c=[(A[0]+B[0])/2,(A[1]+B[1])/2], l=Math.hypot(B[0]-A[0],B[1]-A[1]); if(l<.3) continue; if(roadNear(c[0],c[1],.4)||roadNear(A[0],A[1],.2)||roadNear(B[0],B[1],.2)||blocked(c[0],c[1],.15)||(r.n==='Zagrodowa'&&noFence(c[0],c[1]))) continue; front.push([c[0],c[1],Math.atan2(B[1]-A[1],B[0]-A[0]),l]); } };
      const fGate=(r,sd,g,dF)=>{ const A=PT(r,sd,g-GATEG/2,dF), B=PT(r,sd,g+GATEG/2,dF), G=Math.hypot(B[0]-A[0],B[1]-A[1]); if(G<2||Math.hypot(A[0]+208,A[1]+118)<9||(r.n==='Zagrodowa'&&noFence(A[0],A[1]))||roadNear(A[0],A[1],.3)||roadNear(B[0],B[1],.3)||blocked((A[0]+B[0])/2,(A[1]+B[1])/2,.5)) return false; const tx=(B[0]-A[0])/G, tz=(B[1]-A[1])/G; const q=A[2]; GAPS.push({x0:A[0],z0:A[1],x1:B[0],z1:B[1],G,tx,tz,nx:-sd*q.tz,nz:sd*q.tx,pc:null}); return true; };
      const fSide=(r,sd,sv,dF,depth)=>{ const A=PT(r,sd,sv,dF); const ux=-sd*A[2].tz, uz=sd*A[2].tx; const ang=Math.atan2(uz,ux); for(let j=0;j<depth;j+=FPIECE){ const c=[A[0]+ux*(j+FPIECE/2),A[1]+uz*(j+FPIECE/2)]; if(roadNear(c[0],c[1],1)||blocked(c[0],c[1],.15)||(r.n==='Zagrodowa'&&noFence(c[0],c[1]))) continue; side.push([c[0],c[1],ang,FPIECE]); } };
      const STR=['Stefana Batorego','Dojazdowa','Emilii Plater','Mikołaja Reja','Zagrodowa']; const hs=BLD.filter(b=>!b.cust&&!b.skip&&!b.isHall&&b.w*b.d<450&&b.name!=='Lewiatan'&&b.name!=='Żabka');
      ROADS.filter(r=>STR.includes(r.n)).forEach(r=>{ [1,-1].forEach(sd=>{ const lst=[]; hs.forEach(b=>{ if(roadDist(r,b.x,b.z)>27) return; const nr=nearestRoad(b.x,b.z,q=>q.t!=='track'); if(!nr.r||nr.r!==r) return; let bs=0,bd2=1e9; for(let sv=0;sv<=r.L;sv+=2){ const q=sampleLine(r.pts,r.len,sv), d=Math.hypot(q.x-b.x,q.z-b.z); if(d<bd2){ bd2=d; bs=sv; } } const q=sampleLine(r.pts,r.len,bs); const sdb=(q.tx*(b.z-q.z)-q.tz*(b.x-q.x))>0?1:-1; if(sdb!==sd) return; lst.push({b,s:bs}); });
          lst.sort((a,b)=>a.s-b.s); if(!lst.length) return; const dF=r.w/2+3.2; lst.forEach((it,i)=>{ const lo=i?(lst[i-1].s+it.s)/2:it.s-15, hi=i<lst.length-1?(lst[i+1].s+it.s)/2:it.s+15; it.lo=Math.max(lo,it.s-18); it.hi=Math.min(hi,it.s+18); });
          lst.forEach((it,i)=>{ const lo=Math.max(4,it.lo), hi=Math.min(r.L-4,it.hi); if(hi-lo<6) return; const gOk=fGate(r,sd,it.s,dF); fLine(r,sd,lo,hi,dF,gOk?[it.s]:[]); fSide(r,sd,lo,dF,24); if(i===lst.length-1) fSide(r,sd,hi,dF,24); }); }); });
      // Szkolna, wschodnia strona naprzeciw Lewiatana
      const nF0=front.length;
      { const rs=ROADS.find(r=>r.n==='Szkolna'&&r.pts.some(p=>Math.abs(p[0]+104)<3&&Math.abs(p[1]+33)<3)); if(rs){ const q0=sampleLine(rs.pts,rs.len,10); const sd=(-q0.tz)>0?1:-1; const dF=rs.w/2+3.6; const gs=[rs.L*.38]; const gk=fGate(rs,sd,gs[0],dF); fLine(rs,sd,12,rs.L-34,dF,gk?gs:[]); } }
      { const old=front.slice(0,nF0).concat(side); for(let i=front.length-1;i>=nF0;i--){ const q=front[i]; if(old.some(o=>Math.hypot(o[0]-q[0],o[1]-q[1])<3.4)||Math.hypot(q[0]-B_ZAB.x,q[1]-B_ZAB.z)<30) front.splice(i,1); } } }
    // Sadowiec: w OSM brak drzew i płotów - ogrodzenia działek (z bramą od drogi) i drzewa przy domach generowane na podstawie położenia domów
    { const SH=BLD.filter(b=>b.x>-2300&&b.x<-1100&&b.z>-874&&b.z<330&&!b.cust&&!b.skip&&!b.isHall&&!b.name&&b.w*b.d>25&&b.w*b.d<330);
      SH.forEach((b,bi)=>{ const m=5+(bi*7%4), hw=b.w/2+m, hd=b.d/2+m, c=Math.cos(b.a), sn=Math.sin(b.a); const W=(u,v)=>[b.x+u*c-v*sn,b.z+u*sn+v*c];
        const nr=nearestRoad(b.x,b.z,q=>q.t!=='track'&&q.t!=='rail'); const cr=[[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]]; let ge=-1;
        if(nr.r&&nr.d<70){ let bd=1e9; cr.forEach((p0,i)=>{ const p1=cr[(i+1)%4], mm=W((p0[0]+p1[0])/2,(p0[1]+p1[1])/2), d=roadDist(nr.r,mm[0],mm[1]); if(d<bd){ bd=d; ge=i; } }); }
        cr.forEach((p0,i)=>{ const A=W(p0[0],p0[1]), B=W(cr[(i+1)%4][0],cr[(i+1)%4][1]), L=Math.hypot(B[0]-A[0],B[1]-A[1]), tx=(B[0]-A[0])/L, tz=(B[1]-A[1])/L, ang=Math.atan2(tz,tx); const n=Math.max(1,Math.round(L/2.5)); const isG=i===ge&&L>8;
          for(let k=0;k<n;k++){ const t=(k+.5)/n, cx=A[0]+(B[0]-A[0])*t, cz=A[1]+(B[1]-A[1])*t; if(isG&&Math.abs(t*L-L/2)<2.4) continue; if(roadNear(cx,cz,1.2)||blocked(cx,cz,.2)) continue; (isG?front:side).push([cx,cz,ang,L/n]); }
          if(isG){ let nx=-tz, nz=tx; const mid=[(A[0]+B[0])/2,(A[1]+B[1])/2]; if((b.x-mid[0])*nx+(b.z-mid[1])*nz>0){ nx=-nx; nz=-nz; } const x0=mid[0]-tx*2.3, z0=mid[1]-tz*2.3; if(!roadNear(x0,z0,.3)&&!roadNear(mid[0]+tx*2.3,mid[1]+tz*2.3,.3)) GAPS.push({x0,z0,x1:mid[0]+tx*2.3,z1:mid[1]+tz*2.3,G:4.6,tx,tz,nx,nz,pc:null}); } });
        for(let k=0;k<3;k++){ const a=R(0,6.28), d=R(Math.max(hw,hd)+2,Math.max(hw,hd)+9); const x=b.x+Math.cos(a)*d, z=b.z+Math.sin(a)*d; if(blocked(x,z,1.5)||roadNear(x,z,3.5)) continue; EXTRA_TREES.push({x,z,s:R(.8,1.25),con:rnd()<.3,col:pick(['#5c7a36','#6b7f3a','#7a8a3c','#2d5a2a','#8a6a2a'])}); } }); }
    { const RP=PARCELS.filter(pc=>pc.p&&pc.p.length>2&&pc.bb); const nearB=(q,r2)=>{ let m=1e9; for(let i=0;i<r2.p.length;i++){ const a=r2.p[i], b=r2.p[(i+1)%r2.p.length]; m=Math.min(m,segDist(q[0],q[1],a[0],a[1],b[0],b[1])); } return m; };
      const cross=q=>{ let inside=false; for(const pc of RP){ const bb=pc.bb; if(q[0]<bb[0]-2||q[0]>bb[2]+2||q[1]<bb[1]-2||q[1]>bb[3]+2) continue; if(nearB(q,pc)<1.8) return false; if(inPoly(q[0],q[1],pc.p)) inside=true; } return inside; };
      for(let i=side.length-1;i>=0;i--) if(cross(side[i])) side.splice(i,1); }
    if(OSP_YARD){ /* remiza OSP ma własne ogrodzenie - usuwam zdublowane płoty działek wokół niej; płot z sąsiedztwa łączy się z ogrodzeniem remizy i kończy w okolicy x -221 z 148 */
      const ob=BLD.find(q=>q.kind==='osp'), {L:oL,FZ:oFZ,toRoad:oTR,f:of}=OSP_YARD; if(ob){ const cs=Math.cos(of.rot), sn=Math.sin(of.rot); const lc=q=>{ const dx=q[0]-ob.x, dz=q[1]-ob.z; return [dx*cs-dz*sn, dx*sn+dz*cs]; };
        const dup=q=>{ const l=lc(q); return l[0]>-oL/2-9.5&&l[0]<oL/2+5.5&&l[1]>-oFZ-5&&l[1]<oFZ+oTR+3.5; };
        for(const arr of [front,side]) for(let i=arr.length-1;i>=0;i--) if(dup(arr[i])) arr.splice(i,1); } }
    { const FCUT=[[-122,-50,-112,-54],[-114,-59,-147,-43]]; for(const arr of [front,side]) for(let i=arr.length-1;i>=0;i--){ const q=arr[i]; if(FCUT.some(c=>segDist(q[0],q[1],c[0],c[1],c[2],c[3])<1.8)) arr.splice(i,1); } }
    { /* płot naprzeciw szkoły i przedszkola, za przychodnią (x -115 z -145 → x -104 z -63): wzdłuż podanej linii, ale nie bliżej niż 6,2 m od osi Szkolnej, żeby nie wchodził na chodnik */
        const LA=[-115,-145], LB=[-104,-63], pts=[], N0=34; for(let i=0;i<=N0;i++){ const t=i/N0; let x=LA[0]+(LB[0]-LA[0])*t, z=LA[1]+(LB[1]-LA[1])*t; const nr=nearestRoad(x,z,r=>r.t!=='track'&&r.n==='Szkolna'); if(nr.r&&nr.d<6.2){ const a2=nr.r.pts[nr.seg], b2=nr.r.pts[nr.seg+1]; const dx=b2[0]-a2[0], dz=b2[1]-a2[1], l2=dx*dx+dz*dz||1, tt=clamp(((x-a2[0])*dx+(z-a2[1])*dz)/l2,0,1), qx=a2[0]+dx*tt, qz=a2[1]+dz*tt, dd=Math.hypot(x-qx,z-qz)||1; x=qx+(x-qx)/dd*6.2; z=qz+(z-qz)/dd*6.2; } pts.push([x,z]); }
        for(let i=0;i<pts.length-1;i++){ const A=pts[i], B=pts[i+1], l=Math.hypot(B[0]-A[0],B[1]-A[1]); if(l<.3) continue; const c=[(A[0]+B[0])/2,(A[1]+B[1])/2]; if(blocked(c[0],c[1],.15)||side.some(q=>Math.hypot(q[0]-c[0],q[1]-c[1])<1.1)||front.some(q=>Math.hypot(q[0]-c[0],q[1]-c[1])<1.1)) continue; side.push([c[0],c[1],Math.atan2(B[1]-A[1],B[0]-A[0]),l]); }
        { /* zwykła, otwierana brama na tym płocie, możliwie najbliżej x -110 z -95 */
          const GT=[-110,-95], GW=3.8; let bi=0,bd=1e9; for(let i=0;i<pts.length-1;i++){ const A=pts[i], B=pts[i+1], dx=B[0]-A[0], dz=B[1]-A[1], l2=dx*dx+dz*dz||1, tt=clamp(((GT[0]-A[0])*dx+(GT[1]-A[1])*dz)/l2,0,1), d=Math.hypot(A[0]+dx*tt-GT[0],A[1]+dz*tt-GT[1]); if(d<bd){ bd=d; bi=i; } }
          const A=pts[bi], B=pts[bi+1], ll=Math.hypot(B[0]-A[0],B[1]-A[1])||1, tx=(B[0]-A[0])/ll, tz=(B[1]-A[1])/ll; const t0=clamp((GT[0]-A[0])*tx+(GT[1]-A[1])*tz,0,ll); const C=[A[0]+tx*t0, A[1]+tz*t0];
          for(let i=side.length-1;i>=0;i--){ const q=side[i]; if(Math.abs((q[0]-C[0])*tx+(q[1]-C[1])*tz)<GW/2+q[3]/2&&Math.abs(-(q[0]-C[0])*tz+(q[1]-C[1])*tx)<1.2) side.splice(i,1); }
          let nx=-tz, nz=tx; const sr=nearestRoad(C[0],C[1],r=>r.t!=='track'&&r.n==='Szkolna'); if(sr.r){ const a2=sr.r.pts[sr.seg], b2=sr.r.pts[sr.seg+1]; const dx=b2[0]-a2[0], dz=b2[1]-a2[1], l2=dx*dx+dz*dz||1, tt=clamp(((C[0]-a2[0])*dx+(C[1]-a2[1])*dz)/l2,0,1); if((a2[0]+dx*tt-C[0])*nx+(a2[1]+dz*tt-C[1])*nz<0){ nx=-nx; nz=-nz; } }
          GAPS.push({x0:C[0]-tx*GW/2,z0:C[1]-tz*GW/2,x1:C[0]+tx*GW/2,z1:C[1]+tz*GW/2,G:GW,tx,tz,nx,nz,pc:null,onlyBrama:true,steel:false,green:true}); } }
    [...front,...side].forEach(p=>addSolid({x:p[0],z:p[1],hw:p[3]/2+.05,hd:.07,c:Math.cos(p[2]),s:Math.sin(p[2]),r:p[3]/2+.2}));
    // przerwy w płotach od ulicy -> furtka i brama
    PARCELS.forEach(pc=>{ if(!pc.gaps)return; const byEdge={}; pc.gaps.forEach(g=>{ (byEdge[g[4]]=byEdge[g[4]]||[]).push(g); });
      Object.values(byEdge).forEach(gs=>{ const a=gs[0][0], b=gs[0][1]; const t0=Math.min(...gs.map(g=>g[2])), t1=Math.max(...gs.map(g=>g[3])); const x0=a[0]+(b[0]-a[0])*t0, z0=a[1]+(b[1]-a[1])*t0, x1=a[0]+(b[0]-a[0])*t1, z1=a[1]+(b[1]-a[1])*t1;
        const G=Math.hypot(x1-x0,z1-z0); if(G<1.4)return; if(roadNear(x0,z0,.3)||roadNear(x1,z1,.3)||roadNear((x0+x1)/2,(z0+z1)/2,.3))return; const tx=(x1-x0)/G, tz=(z1-z0)/G; const cc=centroid(pc.p); let nx=-tz,nz=tx; if((cc[0]-x0)*nx+(cc[1]-z0)*nz<0){nx=-nx;nz=-nz;}
        GAPS.push({x0,z0,x1,z1,G,tx,tz,nx,nz,pc}); }); });
    const fT=tex(64,32,(x,w,h)=>{ x.clearRect(0,0,w,h); x.fillStyle='rgba(50,56,52,1)'; for(let i=0;i<w;i+=6)x.fillRect(i,0,2,h); x.fillRect(0,2,w,3); x.fillRect(0,h-5,w,3); });
    const sT=tex(64,64,(x,w,h)=>{ x.clearRect(0,0,w,h); x.strokeStyle='rgba(60,95,60,.95)'; x.lineWidth=1.4; for(let i=-w;i<w*2;i+=8){ x.beginPath(); x.moveTo(i,0); x.lineTo(i+h,h); x.stroke(); x.beginPath(); x.moveTo(i,h); x.lineTo(i+h,0); x.stroke(); } x.lineWidth=3; x.beginPath(); x.moveTo(0,1.5); x.lineTo(w,1.5); x.stroke(); });
    const fm=new THREE.MeshLambertMaterial({map:fT,transparent:true,alphaTest:.4,side:THREE.DoubleSide}), sm=new THREE.MeshLambertMaterial({map:sT,transparent:true,alphaTest:.35,side:THREE.DoubleSide});
    const mkFence=(list,geo,mat,base)=>{ const im=new THREE.InstancedMesh(geo,mat,Math.max(1,list.length)); const bi=base?new THREE.InstancedMesh(new THREE.BoxGeometry(1,.3,.18).translate(0,.15,0),new THREE.MeshLambertMaterial({color:0xb5b0a6}),Math.max(1,list.length)):null;
      list.forEach((p,i)=>{ dum.position.set(p[0],H(p[0],p[1]),p[1]); dum.rotation.set(0,-p[2],0); dum.scale.set(p[3],1,1); dum.updateMatrix(); im.setMatrixAt(i,dum.matrix); if(bi)bi.setMatrixAt(i,dum.matrix); }); scene.add(im); if(bi)scene.add(bi); };
    mkFence(front,new THREE.PlaneGeometry(1,1.3).translate(0,.9,0),fm,true);
    mkFence(side,new THREE.PlaneGeometry(1,1.25).translate(0,.62,0),sm,false);
    // słupki
    const posts=[...front,...side].filter((_,i)=>i%2===0); const pim=new THREE.InstancedMesh(new THREE.BoxGeometry(.08,1.5,.08).translate(0,.75,0),new THREE.MeshLambertMaterial({color:0x3e4442}),Math.max(1,posts.length));
    posts.forEach((p,i)=>{ const x=p[0]+Math.cos(p[2])*p[3]/2, z=p[1]+Math.sin(p[2])*p[3]/2; dum.position.set(x,H(x,z),z); dum.rotation.set(0,0,0); dum.scale.set(1,1,1); dum.updateMatrix(); pim.setMatrixAt(i,dum.matrix); }); scene.add(pim); }

  /* ---------- furtki i bramy w przerwach płotów (otwierane klawiszem E) ---------- */
  ORLIK_GAPS.forEach(g=>GAPS.push(g)); OSP_REQ.forEach(g=>GAPS.push(g)); KG_REQ.forEach(g=>GAPS.push(g));
  { const gm=new THREE.MeshLambertMaterial({color:0x2f3532}), pm=new THREE.MeshLambertMaterial({color:0x8f8a82,map:plasterTex});
    const G2=(geo,a,b,c,x,y,z)=>geo.clone().translate(x,y,z); const leafGeo=(()=>{ const P=[[G2(new THREE.BoxGeometry(1,.06,.05),1,1,1,.5,1.38,0),0xffffff],[G2(new THREE.BoxGeometry(1,.06,.05),1,1,1,.5,.12,0),0xffffff],[G2(new THREE.BoxGeometry(.05,1.32,.05),1,1,1,.02,.75,0),0xffffff],[G2(new THREE.BoxGeometry(.05,1.32,.05),1,1,1,.98,.75,0),0xffffff]];
      for(let x=.12;x<.95;x+=.11) P.push([G2(new THREE.BoxGeometry(.022,1.26,.022),1,1,1,x,.75,0),0xffffff]); return mergeParts(P); })();
    const gmG=new THREE.MeshLambertMaterial({color:0x2f6b3c});
    GAPS.forEach(gp=>{ const {x0,z0,G,tx,tz,nx,nz}=gp; const y=H(x0+tx*G/2,z0+tz*G/2); const ang=Math.atan2(tz,tx);
      const g=new THREE.Group(); g.position.set(x0,y,z0); g.rotation.y=-ang; scene.add(g);
      if(!gp.steel)[0,G].forEach(u=>{ const p=new THREE.Mesh(new THREE.BoxGeometry(.3,1.7,.3),pm); p.position.set(u,.85,0); p.castShadow=true; g.add(p); });
      const leaves=[]; const mk=(u0,w,dir,kind)=>{ const piv=new THREE.Group(); piv.position.set(u0,0,0); g.add(piv); const m=new THREE.Mesh(leafGeo,gp.green?gmG:gm); m.scale.set(w*dir,gp.hs||1,1); m.castShadow=true; piv.add(m);
        const cx=x0+tx*(u0+dir*w/2), cz=z0+tz*(u0+dir*w/2); const sol={x:cx,z:cz,hw:w/2,hd:.08,c:Math.cos(ang),s:Math.sin(ang),r:w/2+.2}; addSolid(sol); return {piv,dir,sol,kind,open:false,cur:0}; };
      const items=[];
      if(gp.onlyBrama){ const half=(G-.3)/2; items.push({kind:'brama',leaves:[mk(.15,half,1,'brama'),mk(G-.15,half,-1,'brama')],cx:x0+tx*G/2,cz:z0+tz*G/2}); }
      else if(G>=3.6){ const fw=1.0, bw=G-fw-.3; const half=bw/2; items.push({kind:'brama',leaves:[mk(.15,half,1,'brama'),mk(.15+bw,half,-1,'brama')],cx:x0+tx*(.15+bw/2),cz:z0+tz*(.15+bw/2)}); items.push({kind:'furtka',leaves:[mk(G-.15-fw,fw,1,'furtka')],cx:x0+tx*(G-.15-fw/2),cz:z0+tz*(G-.15-fw/2)});
        if(rnd()<.38){ const c=[x0+tx*(.15+bw/2)+nx*5.8, z0+tz*(.15+bw/2)+nz*5.8]; DRIVE_SPOTS.push({x:c[0],z:c[1],h:Math.atan2(nz,nx),gate:items[0]}); } }
      else items.push({kind:'furtka',leaves:[mk(.15,G-.3,1,'furtka')],cx:x0+tx*G/2,cz:z0+tz*G/2});
      items.forEach(it=>{ it.g=g; it.nx=nx; it.nz=nz; it.sg=(nx*(-tz)+nz*tx)>0?1:-1; GATES.push(it); }); }); }
  /* chodniki i krawężniki nie przechodzą przez bramy ani furtki: kończą się przy słupku, a brama stoi na końcu chodnika */
  { const zs=GAPS.filter(q=>q.G>0); const inGate=(x,z,th)=>zs.some(q=>{ const dx=x-q.x0, dz=z-q.z0; const u=dx*q.tx+dz*q.tz; if(u<-.9||u>q.G+.9) return false; const v=dx*q.nx+dz*q.nz; return Math.abs(v)<th; });
    SWR.forEach(rec=>{ const pts=resample(rec.run,.6); const runs=[]; let cur=[], cut=false; pts.forEach(p=>{ if(inGate(p[0],p[1],rec.th)){ cut=true; if(cur.length>1) runs.push(cur); cur=[]; } else cur.push(p); }); if(cur.length>1) runs.push(cur); if(!cut) return;
      scene.remove(rec.m); rec.m.geometry.dispose(); if(rec.wk){ const i=WALKS.indexOf(rec.wk); if(i>=0) WALKS.splice(i,1); }
      runs.filter(r2=>lineLen(r2).pop()>1.5).forEach(r2=>{ const m=new THREE.Mesh(ribbon(r2,rec.w,rec.y,rec.rep),rec.mat); if(rec.wk!==undefined) m.receiveShadow=true; scene.add(m); if(rec.wk!==undefined&&lineLen(r2).pop()>12){ const w2={pts:resample(r2,4),road:rec.road}; w2.len=lineLen(w2.pts); WALKS.push(w2); } }); }); }
  function toggleGate(it,force){ it.open=force===undefined?!it.open:force; it.leaves.forEach(l=>{ l.open=it.open; l.sol.off=it.open; }); if(AU.ctx&&AU.on){ const t=AU.ctx.currentTime; tone('square',it.open?420:300,t,.08,.03); noiseHit(t,.12,.05,'bandpass',900); } }
  function nearGate(){ const x=st.car?st.car.x:st.x, z=st.car?st.car.z:st.z, lim=st.car?4:2.6; let b=null,bd=lim; GATES.forEach(it=>{ if(st.car&&it.kind!=='brama')return; const d=Math.hypot(it.cx-x,it.cz-z); if(d<bd){bd=d;b=it;} }); return b; }
  function gatesUpdate(dt){ GATES.forEach(it=>it.leaves.forEach(l=>{ const tgt=l.open?l.dir*1.45*it.sg:0; if(Math.abs(l.cur-tgt)<.001)return; l.cur+=(tgt-l.cur)*Math.min(1,dt*5); l.piv.rotation.y=-l.cur; })); }

  /* ---------- park przy Zielonej (wg Street View) ---------- */
  const parkTrees=[];
  { const pm=mar(PARK.pts); const ca=Math.cos(pm.an), sa=Math.sin(pm.an);
    const P=(u,v)=>[pm.cx+u*ca-v*sa, pm.cz+u*sa+v*ca];
    // alejki z OSM: w środku parku asfalt, przy ulicach chodniki z kostki; odsunięte od jezdni
    const pathMat=po(new THREE.MeshLambertMaterial({map:texPath,side:THREE.DoubleSide}),2);
    const resRoads=ROADS.filter(r=>r.t!=='track'&&r.t!=='rail'&&r.t!=='foot'&&r.t!=='path');
    const offRoad=(p,hw)=>{ let [x,z]=p; for(let it=0;it<4;it++){ let moved=false; resRoads.forEach(r=>{ const d=roadDist(r,x,z), need=r.w/2+hw+.25; if(d<need){ const nr=nearestRoad(x,z,q=>q===r); const a=r.pts[nr.seg], b=r.pts[nr.seg+1]; const L=Math.hypot(b[0]-a[0],b[1]-a[1])||1; let nx=-(b[1]-a[1])/L, nz=(b[0]-a[0])/L; const s0=(x-a[0])*nx+(z-a[1])*nz; if(s0<0){nx=-nx;nz=-nz;} x+=nx*(need-d); z+=nz*(need-d); moved=true; } }); if(!moved)break; } return [x,z]; };
    const PP=(typeof PARKD!=='undefined'?PARKD.paths:[]).map(pts=>{ const nearRd=pts.filter(p=>resRoads.some(r=>roadDist(r,p[0],p[1])<r.w/2+6)).length/pts.length>.5; const w=nearRd?2.0:2.4; return {pts:resample(pts,2).map(p=>offRoad(p,w/2)),w,paver:nearRd}; });
    PP.forEach(q=>{ const m=new THREE.Mesh(ribbon(q.pts,q.w,q.paver?0.09:0.08,4),q.paver?matPaver:pathMat); m.receiveShadow=true; scene.add(m); q.len=lineLen(q.pts); q.L=q.len[q.len.length-1]; });
    const onPath=(x,z,m)=>PP.some(q=>{ for(let i=0;i<q.pts.length-1;i++) if(segDist(x,z,q.pts[i][0],q.pts[i][1],q.pts[i+1][0],q.pts[i+1][1])<q.w/2+(m||.6))return true; return false; });
    const nearPath=(x,z)=>{ let best=null,bd=1e9; PP.forEach(q=>{ for(let i=0;i<q.pts.length;i++){ const d=Math.hypot(q.pts[i][0]-x,q.pts[i][1]-z); if(d<bd){bd=d;best=q.pts[i];} } }); return best; };
    PARK.walks=PP.filter(q=>!q.paver&&q.L>25).map(q=>({pts:q.pts,len:q.len}));
    // ławki z OSM (betonowe nogi, ciemne deski) przodem do alejki; przy co drugiej kosz
    const slat=new THREE.MeshLambertMaterial({color:0x2c2f31}), conc=new THREE.MeshLambertMaterial({color:0xb9b6ae,map:plasterTex});
    const benchAt=(x,z,ry)=>{ const b=new THREE.Group(); [-0.75,0.75].forEach(u=>{ const leg=new THREE.Mesh(new THREE.BoxGeometry(.22,.42,.5).translate(0,.21,0),conc); leg.position.x=u; b.add(leg); });
      const seat=new THREE.Mesh(new THREE.BoxGeometry(1.9,.07,.45).translate(0,.45,0),slat); const back=new THREE.Mesh(new THREE.BoxGeometry(1.9,.32,.05).translate(0,.72,-.2),slat); back.rotation.x=-.12; b.add(seat,back);
      b.position.set(x,H(x,z),z); b.rotation.y=ry; b.traverse(o=>o.castShadow=true); scene.add(b); addSolid({x,z,hw:1,hd:.3,c:Math.cos(-ry),s:Math.sin(-ry),r:1.1}); };
    PARK.benches=[];
    (typeof PARKD!=='undefined'?PARKD.benches:[]).forEach((p,i)=>{ const q=nearPath(p[0],p[1])||[p[0],p[1]+1]; let x=p[0], z=p[1]; const d=Math.hypot(q[0]-x,q[1]-z)||1; if(d<1.9){ x=q[0]-(q[0]-x)/d*1.9; z=q[1]-(q[1]-z)/d*1.9; } const ry=Math.atan2(q[0]-x,q[1]-z); benchAt(x,z,ry); PARK.benches.push({x,z,ry});
      if(i%2===0){ const bin=new THREE.Mesh(new THREE.CylinderGeometry(.28,.25,.7,14).translate(0,.35,0),conc); const bx2=x+Math.cos(ry)*1.5, bz2=z-Math.sin(ry)*1.5; bin.position.set(bx2,H(bx2,bz2),bz2); bin.castShadow=true; scene.add(bin); } });
    // latarnie parkowe: wysokie białe słupy wzdłuż asfaltowych alejek
    const plm=new THREE.MeshLambertMaterial({color:0xeceeec}); const pglobe=new THREE.MeshLambertMaterial({color:0xf4f4f0,emissive:0x000000}); const lampsP=[];
    PP.filter(q=>!q.paver).forEach(q=>{ for(let d=6;d<q.L-3;d+=24){ const s2=sampleLine(q.pts,q.len,d); const x=s2.x+s2.tz*1.7, z=s2.z-s2.tx*1.7; if(roadNearF(x,z,1.2)||lampsP.some(l=>Math.hypot(l[0]-x,l[1]-z)<14))continue; lampsP.push([x,z]); const y=H(x,z);
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,5.6,10).translate(0,2.8,0),plm); pole.position.set(x,y,z); const head=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.08,20),pglobe); head.position.set(x,y+5.65,z); const neck=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.3,10),plm); neck.position.set(x,y+5.5,z); scene.add(neck,pole,head); addSolid({x,z,hw:.12,hd:.12,c:1,s:0,r:.3}); } });
    // betonowe słupki (kostki) przy wjazdach z parkingów, wg OSM
    const cube=new THREE.BoxGeometry(.42,.48,.42).translate(0,.24,0);
    (typeof PARKD!=='undefined'?PARKD.bollards:[]).forEach(l=>{ for(let i=0;i<l.length-1;i++){ const a=l[i], b=l[i+1], L=Math.hypot(b[0]-a[0],b[1]-a[1]); const n=Math.max(1,Math.round(L/1.6)); for(let k=0;k<=n;k++){ const x=a[0]+(b[0]-a[0])*k/n, z=a[1]+(b[1]-a[1])*k/n; const c=new THREE.Mesh(cube,conc); c.position.set(x,H(x,z),z); c.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]); c.castShadow=true; scene.add(c); addSolid({x,z,hw:.22,hd:.22,c:1,s:0,r:.35}); } } });
    // piaskownica z drewnianą ramą, rabata kwiatowa, żwir
    const sandM=po(new THREE.MeshLambertMaterial({color:0xe2cf9a,map:detailTex}),3), woodB=new THREE.MeshLambertMaterial({color:0x8a5a34});
    if(typeof PARKD!=='undefined'){ PARKD.sand.forEach(pts=>{ drape(pts,sandM,0.12,1.5,true); for(let i=0;i<pts.length-1;i++){ const a=pts[i], b=pts[i+1], L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L<.3)continue; const m=new THREE.Mesh(new THREE.BoxGeometry(L,.3,.18).translate(0,.15,0),woodB); m.position.set((a[0]+b[0])/2,H((a[0]+b[0])/2,(a[1]+b[1])/2),(a[1]+b[1])/2); m.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]); scene.add(m); } });
      const flowT=tex(128,128,(x,w,h)=>{ x.fillStyle='#4f6b2e'; x.fillRect(0,0,w,h); const C=['#e34b6b','#f2c230','#ffffff','#b04ad8','#ff8a3d','#d8263c']; for(let i=0;i<420;i++){ x.fillStyle=C[i%C.length]; x.beginPath(); x.arc(Math.random()*w,Math.random()*h,1.6+Math.random()*2.2,0,7); x.fill(); } },true);
      const flowM=po(new THREE.MeshLambertMaterial({map:flowT,side:THREE.DoubleSide}),3); PARKD.flower.forEach(pts=>drape(pts,flowM,0.14,2,true));
      PARKD.gravel.forEach(pts=>drape(pts,gravelM,0.11,2,true));
      // ścianka wspinaczkowa: szary „głaz” z kolorowymi chwytami na żwirze
      PARKD.climb.forEach(pts=>{ const c=centroid(pts); const rad=[]; for(let i=0;i<14;i++){ const a=i/14*Math.PI*2; rad.push([c[0]+Math.cos(a)*3.4,c[1]+Math.sin(a)*3.4]); } drape(rad,gravelM,0.12,2,true);
        const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(1,1),new THREE.MeshLambertMaterial({color:0x8d8e8a,map:detailTex})); rock.scale.set(1.0,1.45,.8); rock.position.set(c[0],H(c[0],c[1])+1.25,c[1]); rock.castShadow=true; scene.add(rock);
        const HC=[0xe23b3b,0x2f7fd8,0xf2c230,0x3fae4a,0xff8a3d]; for(let i=0;i<26;i++){ const a=R(0,6.28), y=R(.25,2.3); const rr=Math.sqrt(Math.max(.05,1-((y-1.25)/1.45)**2))*1.0; const h=new THREE.Mesh(new THREE.BoxGeometry(.12,.08,.1),new THREE.MeshLambertMaterial({color:HC[i%5]})); h.position.set(c[0]+Math.cos(a)*rr*1.02,H(c[0],c[1])+y,c[1]+Math.sin(a)*rr*.82); h.rotation.y=-a; scene.add(h); }
        [[-1.6,0],[1.6,0],[0,1.4],[0,-1.4]].forEach(([dx,dz])=>{ const mt=new THREE.Mesh(new THREE.BoxGeometry(1.2,.05,1.2),new THREE.MeshLambertMaterial({color:0x2a2c2e})); mt.position.set(c[0]+dx,H(c[0]+dx,c[1]+dz)+.13,c[1]+dz); scene.add(mt); });
        addSolid({x:c[0],z:c[1],hw:.9,hd:.75,c:1,s:0,r:1.3}); PARK.climb=c; });
      // pajęczyna (huśtawka-bocianie gniazdo) i podwójna huśtawka wg OSM
      const met=new THREE.MeshLambertMaterial({color:0x2f6fb5}), rope=new THREE.MeshLambertMaterial({color:0x3a3a3a});
      PARKD.web.forEach(p=>{ const g=new THREE.Group(); g.position.set(p[0],H(p[0],p[1]),p[1]); [-1.7,1.7].forEach(x=>[-.9,.9].forEach(z=>{ const l=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,2.6,8),met); l.position.set(x,1.25,z*.6); l.rotation.x=z>0?-.33:.33; g.add(l); })); const top=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,3.6,8).rotateZ(Math.PI/2),met); top.position.y=2.45; g.add(top);
        const ring=new THREE.Mesh(new THREE.TorusGeometry(.55,.05,6,20).rotateX(Math.PI/2),new THREE.MeshLambertMaterial({color:0xd8263c})); ring.position.y=.6; g.add(ring); const net=new THREE.Mesh(new THREE.CircleGeometry(.52,16).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0x444444,side:THREE.DoubleSide})); net.position.y=.58; g.add(net);
        [[-.4,0],[.4,0],[0,-.4],[0,.4]].forEach(([x,z])=>{ const r=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,1.9,4),rope); r.position.set(x*.9,1.5,z); r.rotation.z=x*.25; g.add(r); }); g.traverse(o=>o.castShadow=true); scene.add(g); addSolid({x:p[0],z:p[1],hw:.8,hd:.8,c:1,s:0,r:1.2}); });
      PARKD.swing.forEach(p=>{ const g=new THREE.Group(); g.position.set(p[0],H(p[0],p[1]),p[1]); [-1.9,1.9].forEach(x=>[-.7,.7].forEach(z=>{ const l=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,2.5,8),met); l.position.set(x,1.2,z*.55); l.rotation.x=z>0?-.3:.3; g.add(l); })); const top=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,4,8).rotateZ(Math.PI/2),met); top.position.y=2.35; g.add(top);
        [-.85,.85].forEach(x=>{ [-.2,.2].forEach(dz=>{ const r=new THREE.Mesh(new THREE.CylinderGeometry(.01,.01,1.75,4),rope); r.position.set(x,1.45,dz); g.add(r); }); const seat=new THREE.Mesh(new THREE.BoxGeometry(.25,.06,.5),new THREE.MeshLambertMaterial({color:0x222222})); seat.position.set(x,.56,0); g.add(seat); }); g.traverse(o=>o.castShadow=true); scene.add(g); addSolid({x:p[0],z:p[1],hw:.9,hd:.9,c:1,s:0,r:1.3}); });
      // gabloty z ogłoszeniami przy wejściach z ulic
      const boards=[]; const gabT=tex(128,96,(x,w,h)=>{ x.fillStyle='#3a2a1e'; x.fillRect(0,0,w,h); x.fillStyle='#d9d4c8'; x.fillRect(8,8,w-16,h-16); x.fillStyle='#ffffff'; x.fillRect(16,16,40,30); x.fillRect(64,22,46,24); x.fillStyle='#c0392b'; x.fillRect(18,54,30,10); x.fillStyle='#2f6fb5'; x.fillRect(60,54,44,26); });
      PP.forEach(q=>[q.pts[0],q.pts[q.pts.length-1]].forEach((e,k)=>{ if(boards.length>=4||!resRoads.some(r=>roadDist(r,e[0],e[1])<r.w/2+5)||boards.some(b=>Math.hypot(b[0]-e[0],b[1]-e[1])<35)||!inPoly(e[0],e[1],PARK.pts)&&!PARK.pts.some(v=>Math.hypot(v[0]-e[0],v[1]-e[1])<12))return;
        const o=k?q.pts[q.pts.length-4]||q.pts[0]:q.pts[3]||q.pts[q.pts.length-1]; const dx=o[0]-e[0], dz=o[1]-e[1], l=Math.hypot(dx,dz)||1; const x=e[0]+dx/l*3-dz/l*(q.w/2+.8), z=e[1]+dz/l*3+dx/l*(q.w/2+.8); if(roadNearF(x,z,1.2)) return; boards.push([x,z]);
        const g=new THREE.Group(); g.position.set(x,H(x,z),z); g.rotation.y=Math.atan2(dx,dz)+Math.PI/2; [-.55,.55].forEach(u=>{ const pst=new THREE.Mesh(new THREE.BoxGeometry(.08,2.1,.08).translate(0,1.05,0),new THREE.MeshLambertMaterial({color:0x2a2c2e})); pst.position.x=u; g.add(pst); }); const bd=new THREE.Mesh(new THREE.BoxGeometry(1.25,.95,.1),new THREE.MeshLambertMaterial({color:0x3a2a1e})); bd.position.y=1.5; g.add(bd); [-1,1].forEach(sd=>{ const f=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.82),new THREE.MeshLambertMaterial({map:gabT})); f.position.set(0,1.5,sd*.056); if(sd<0)f.rotation.y=Math.PI; g.add(f); }); g.traverse(o2=>o2.castShadow=true); scene.add(g); addSolid({x,z,hw:.65,hd:.1,c:Math.cos(-g.rotation.y),s:Math.sin(-g.rotation.y),r:.7}); })); }
    PARK.globeMat=pglobe;
    // plac z kostki od Zielonej: zaokrąglona wysepka trawy z krawężnikiem, ławki parami, jarzębiny i latarnie przy krawędzi
    { const zr=ROADS.find(r=>r.n==='Zielona'); let bp=PLAC.pts[0],bd=1e9; PLAC.pts.forEach(v=>{ const d=roadDist(zr,v[0],v[1]); if(d<bd){bd=d;bp=v;} });
      const nr0=nearestRoad(bp[0],bp[1],r=>r===zr); const a0=zr.pts[nr0.seg],b0=zr.pts[nr0.seg+1]; let tx=b0[0]-a0[0],tz=b0[1]-a0[1]; const tl=Math.hypot(tx,tz); tx/=tl; tz/=tl;
      const pc=centroid(PLAC.pts); let nx=-tz,nz=tx; if((pc[0]-bp[0])*nx+(pc[1]-bp[1])*nz<0){nx=-nx;nz=-nz;}
      let cx=bp[0]+nx*4.2, cz=bp[1]+nz*4.2; if((pc[0]-cx)*tx+(pc[1]-cz)*tz<0){ tx=-tx; tz=-tz; } cx+=tx*6; cz+=tz*6;
      const stad=(Lh,Rd,n)=>{ const out=[]; for(let i=0;i<=n;i++){ const a=-Math.PI/2+Math.PI*i/n; out.push([Lh+Math.cos(a)*Rd,Math.sin(a)*Rd]); } for(let i=0;i<=n;i++){ const a=Math.PI/2+Math.PI*i/n; out.push([-Lh+Math.cos(a)*Rd,Math.sin(a)*Rd]); } return out.map(([u,v])=>[cx+tx*u+nx*v,cz+tz*u+nz*v]); };
      // ławki parami na skraju placu od strony parku
      let fp=PLAC.pts[0],fd=-1; PLAC.pts.forEach(v=>{ const d=roadDist(zr,v[0],v[1]); if(d>fd&&d<60){fd=d;fp=v;} });
      const toC=Math.atan2(pc[0]-fp[0],pc[1]-fp[1]); const bp2=[fp[0]+(pc[0]-fp[0])*.15,fp[1]+(pc[1]-fp[1])*.15];
      [-1.15,1.15].forEach(o=>{ const x=bp2[0]+Math.cos(toC)*o, z=bp2[1]-Math.sin(toC)*o; const b=new THREE.Group(); [-0.75,0.75].forEach(u=>{ const leg=new THREE.Mesh(new THREE.BoxGeometry(.22,.42,.5).translate(0,.21,0),conc); leg.position.x=u; b.add(leg); }); const seat=new THREE.Mesh(new THREE.BoxGeometry(1.9,.07,.45).translate(0,.45,0),slat); const back=new THREE.Mesh(new THREE.BoxGeometry(1.9,.32,.05).translate(0,.72,-.2),slat); b.add(seat,back); b.position.set(x,H(x,z),z); b.rotation.y=toC; b.traverse(q=>q.castShadow=true); scene.add(b); });
      // jarzębiny z czerwonymi owocami wzdłuż alejki przy placu
      PLAC.pts.forEach((v,i)=>{ if(i%8||roadDist(zr,v[0],v[1])<9)return; const ox=v[0]+(v[0]-pc[0])*.18, oz=v[1]+(v[1]-pc[1])*.18; if(parkTrees.some(t=>Math.hypot(t.x-ox,t.z-oz)<5))return; parkTrees.push({x:ox,z:oz,s:R(.7,.9),con:false,col:pick(['#c2502e','#b8432a','#cf6a33'])}); });
      PLAC.pts.forEach((v,i)=>{ if(i%10)return; const ox=v[0]+(v[0]-pc[0])*.08, oz=v[1]+(v[1]-pc[1])*.08; const y=H(ox,oz); const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,5.6,10).translate(0,2.8,0),plm); pole.position.set(ox,y,oz); const head=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.08,20),pglobe); head.position.set(ox,y+5.65,oz); scene.add(pole,head); });
    }
    // plac zabaw: drewniane wieże z daszkami, zjeżdżalnia, ścianka, huśtawki
    const wood=new THREE.MeshLambertMaterial({color:0x9a6a3c}), blueR=new THREE.MeshLambertMaterial({color:0x2f6fb5}), redR=new THREE.MeshLambertMaterial({color:0xc0392b}), teal=new THREE.MeshLambertMaterial({color:0x2a9d8f}), slideM=new THREE.MeshPhongMaterial({color:0x2d6db3,shininess:60}), metal=new THREE.MeshLambertMaterial({color:0x8a9096});
    PLAYS.forEach((pl,pi)=>{ const m=mar(pl.pts); const y=H(m.cx,m.cz); const grp=new THREE.Group(); grp.position.set(m.cx,y,m.cz); grp.rotation.y=-m.an;
      drape(pl.pts,po(new THREE.MeshLambertMaterial({color:0xb8513f,map:detailTex}),3),.06,3,true);
      if(pi===0){ const tower=(x,roofM)=>{ const t=new THREE.Group(); [[-.6,-.6],[.6,-.6],[-.6,.6],[.6,.6]].forEach(([a,b])=>{ const p=new THREE.Mesh(new THREE.BoxGeometry(.12,3.2,.12).translate(0,1.6,0),wood); p.position.set(a,0,b); t.add(p); });
          const fl=new THREE.Mesh(new THREE.BoxGeometry(1.4,.08,1.4),wood); fl.position.y=1.4; const rail=new THREE.Mesh(new THREE.BoxGeometry(1.4,.6,.05),wood); rail.position.set(0,1.75,.68); const rf=new THREE.Mesh(hipGeo,roofM); rf.scale.set(1.8,.9,1.8); rf.position.y=3.2; t.add(fl,rail,rf); t.position.x=x; return t; };
        const t1=tower(-1.8,blueR), t2=tower(1.6,redR); const bridge=new THREE.Mesh(new THREE.BoxGeometry(2,.06,.7),wood); bridge.position.set(-.1,1.4,0);
        const slide=new THREE.Mesh(new THREE.BoxGeometry(3.2,.06,.6),slideM); slide.position.set(3.9,.75,0); slide.rotation.z=-.45;
        const wall=new THREE.Mesh(new THREE.BoxGeometry(.08,1.4,1.3),teal); wall.position.set(-2.6,.75,0); wall.rotation.z=.25;
        grp.add(t1,t2,bridge,slide,wall); }
      else { const fr=new THREE.Group(); [-1.6,1.6].forEach(x=>{ [-.6,.6].forEach(z=>{ const l=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,2.6,6),metal); l.position.set(x,1.25,z*.8); l.rotation.x=z>0?-.2:.2; fr.add(l); }); });
        const top=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,3.3,6).rotateZ(Math.PI/2),metal); top.position.y=2.45; fr.add(top);
        [-.7,.7].forEach(x=>{ [-.18,.18].forEach(dx=>{ const ch=new THREE.Mesh(new THREE.CylinderGeometry(.01,.01,1.9,4),metal); ch.position.set(x+dx,1.5,0); fr.add(ch); }); const st=new THREE.Mesh(new THREE.BoxGeometry(.5,.05,.2),new THREE.MeshLambertMaterial({color:0x222222})); st.position.set(x,.55,0); fr.add(st); }); grp.add(fr); }
      grp.traverse(o=>{ if(o.isMesh)o.castShadow=true; }); scene.add(grp); });
    // drzewa parkowe z OSM (każde drzewo w swoim miejscu): lipy i klony, jarzębiny, modrzewie i świerki
    const edgeD=(x,z)=>{ let m=1e9; const P2=PARK.pts; for(let i=0;i<P2.length;i++){ const a=P2[i], b=P2[(i+1)%P2.length]; m=Math.min(m,segDist(x,z,a[0],a[1],b[0],b[1])); } return m; };
    (typeof PARKD!=='undefined'?PARKD.trees:[]).forEach(([x,z,con],i)=>{ if(!inPoly(x,z,PARK.pts)&&edgeD(x,z)>8)return; if(resRoads.some(r=>roadDist(r,x,z)<r.w/2+1.2))return; if(onPath(x,z,.3)||inPoly(x,z,COURT.pts))return; if(parkTrees.some(t=>Math.hypot(t.x-x,t.z-z)<1.6))return;
      const k=rnd(); parkTrees.push(con?{x,z,s:R(.75,1.05),con:true,col:k<.4?'#5a6a2e':null}:k<.08?{x,z,s:R(.62,.8),con:false,col:pick(['#c2502e','#b8432a','#cf6a33'])}:k<.17?{x,z,s:R(.9,1.3),con:false,col:pick(['#c8642c','#d9822f','#b8522a','#cf7a34','#a9a23a'])}:{x,z,s:R(1.05,1.6),con:false}); });
  }

  await LP(54);
  /* ---------- ROD „Borowik” (Działoszyn): działki z domkami i ogrodzeniami, układ z OSM (tools/gen_rod.py) ---------- */
  if(typeof DATA_ROD!=='undefined'){ const D=DATA_ROD;
    const okP=(x,z)=>!blocked(x,z,.25)&&!roadNearF(x,z,.15);
    const plots=D.p.filter(p=>{ const [cx,cz,rot,,,,,,,ww,dd]=p; const w=L2W(cx,cz,rot); return [[0,0],[-1,-1],[1,-1],[1,1],[-1,1],[0,-1],[0,1],[-1,0],[1,0]].every(([a,b])=>{ const q=w(a*ww/2*.96,b*dd/2*.96); return okP(q[0],q[1]); }); });
    const WALLC=['#c9b48a','#9fb6c2','#b8c2a0','#d9d2c0','#a65e48','#7d8c6a','#e0c78d'], ROOFC=['#7a3226','#5a5f66','#3f4a3a','#8a6a3a','#4a5668'];
    const n=plots.length, bodyIM=mkIM(boxGeo,n,plasterTex), roofIM=mkIM(gabGeo,n,tileTex), doorIM=mkIM(boxGeo,n), winIM=mkIM(boxGeo,n);
    const m4=new THREE.Matrix4(), q4=new THREE.Quaternion(), e4=new THREE.Euler(), p3=new THREE.Vector3(), s3=new THREE.Vector3(), col=new THREE.Color();
    const put=(im,k,x,y,z,rot,sx,sy,sz,c)=>{ e4.set(0,rot,0); q4.setFromEuler(e4); p3.set(x,y,z); s3.set(sx,sy,sz); m4.compose(p3,q4,s3); im.setMatrixAt(k,m4); im.setColorAt(k,col.set(c)); };
    const fpos=[], fuv=[], fidx=[]; let fv=0; const FH=1.4; const posts=[];
    const panel=(x0,z0,x1,z1)=>{ const L=Math.hypot(x1-x0,z1-z0); const nseg=Math.max(1,Math.round(L/2.6)); for(let i=0;i<nseg;i++){ const a=i/nseg, b=(i+1)/nseg; const ax=x0+(x1-x0)*a, az=z0+(z1-z0)*a, bx2=x0+(x1-x0)*b, bz=z0+(z1-z0)*b; const ha=H(ax,az), hb=H(bx2,bz);
        fpos.push(ax,ha,az, bx2,hb,bz, bx2,hb+FH,bz, ax,ha+FH,az); fuv.push(0,0, L/nseg/1.4,0, L/nseg/1.4,1, 0,1); fidx.push(fv,fv+1,fv+2,fv,fv+2,fv+3); fv+=4; posts.push([ax,ha,az]); } posts.push([x1,H(x1,z1),z1]); };
    plots.forEach((p,k)=>{ const [cx,cz,rot,sw,sd,wi,ri,rtp,off,ww,dd]=p; const w=L2W(cx,cz,rot), c=Math.cos(rot), s=Math.sin(rot);
      const C=[w(-ww/2,-dd/2),w(ww/2,-dd/2),w(ww/2,dd/2),w(-ww/2,dd/2)];
      // ogrodzenie dookoła, z furtką od strony alejki (front = +z lokalnie)
      const gx=Math.max(-ww/2+1.5,Math.min(ww/2-1.5,off*.8)), G=1.0, gw1=w(gx-G/2,dd/2), gw2=w(gx+G/2,dd/2);
      panel(C[0][0],C[0][1],C[1][0],C[1][1]); panel(C[1][0],C[1][1],C[2][0],C[2][1]); panel(C[2][0],C[2][1],gw2[0],gw2[1]); panel(gw1[0],gw1[1],C[3][0],C[3][1]); panel(C[3][0],C[3][1],C[0][0],C[0][1]);
      [[C[0],C[1]],[C[1],C[2]],[C[3],C[0]]].forEach(([a,b])=>{ const dx=b[0]-a[0], dz=b[1]-a[1], L=Math.hypot(dx,dz); addSolid({x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,hw:L/2,hd:.1,c:dx/L,s:dz/L,r:L/2+.3}); });
      [[C[2],gw2],[gw1,C[3]]].forEach(([a,b])=>{ const dx=b[0]-a[0], dz=b[1]-a[1], L=Math.hypot(dx,dz)||1; addSolid({x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,hw:L/2,hd:.1,c:dx/L,s:dz/L,r:L/2+.3}); });
      // domek w głębi działki (drzwi w stronę alejki)
      const sx=off*.5, sz=-dd/2+sd/2+1.0, q=w(sx,sz), base=Math.min(H(q[0],q[1]),H(...w(sx-sw/2,sz+sd/2)),H(...w(sx+sw/2,sz-sd/2)))-.25, hh=2.3+(k%3)*.12;
      put(bodyIM,k,q[0],base,q[1],rot,sw,hh+.25,sd,WALLC[wi]);
      put(roofIM,k,q[0],base+hh+.25,q[1],rot+(rtp===2?Math.PI/2:0),(rtp===2?sd:sw)+.5,.9+rtp*.12,(rtp===2?sw:sd)+.5,ROOFC[ri]);
      const dq=w(sx+sw*.18,sz+sd/2+.03); put(doorIM,k,dq[0],base+.25,dq[1],rot,.8,1.85,.06,'#4a3a2c');
      const wq=w(sx-sw*.25,sz+sd/2+.03); put(winIM,k,wq[0],base+1.0,wq[1],rot,.7,.6,.06,'#9fb7c6');
      addSolid({x:q[0],z:q[1],hw:sw/2,hd:sd/2,c,s:-s,r:Math.hypot(sw,sd)/2});
      // drzewko owocowe / rabata
      if(k%5<3){ const t=w(ww*.28*(k%2?1:-1),dd*.12); if(!blocked(t[0],t[1],.8)) EXTRA_TREES.push({x:t[0],z:t[1],s:.5+((k*7)%5)*.08,con:false,col:['#6b8a3a','#7a9a42','#8aa04a','#5f8238'][k%4]}); }
    });
    [bodyIM,roofIM,doorIM,winIM].forEach(im=>{ im.count=n; im.instanceMatrix.needsUpdate=true; if(im.instanceColor) im.instanceColor.needsUpdate=true; im.castShadow=false; });
    if(fv){ const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(fpos,3)); geo.setAttribute('uv',new THREE.Float32BufferAttribute(fuv,2)); geo.setIndex(fidx); geo.computeVertexNormals();
      const mt=fenceT.clone(); mt.needsUpdate=true; mt.wrapS=mt.wrapT=THREE.RepeatWrapping; const mesh=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map:mt,transparent:true,alphaTest:.35,side:THREE.DoubleSide,color:0x4a8a4a})); scene.add(mesh);
      const pm=mkIM(boxGeo,posts.length,null); posts.forEach(([x,y,z],i)=>put(pm,i,x,y,z,0,.07,FH+.1,.07,'#59624f')); pm.castShadow=false; pm.instanceMatrix.needsUpdate=true; pm.instanceColor.needsUpdate=true; }
    window.__rodPlots=n; }
  /* ---------- stadion w Działoszynie (OSM: stadium 351179148, boiska 351179150 / 1495872959, trybuny 1453320620-21) ---------- */
  { const SPOLY=[[-2384,1422],[-2392,1426],[-2399,1431],[-2403,1437],[-2405,1442],[-2412,1442],[-2400,1577],[-2398,1577],[-2391,1576],[-2387,1583],[-2377,1590],[-2359,1593],[-2343,1588],[-2333,1580],[-2324,1567],[-2322,1557],[-2329,1475],[-2331,1453],[-2337,1438],[-2346,1427],[-2352,1423],[-2360,1420],[-2369,1419],[-2378,1421]];
    const P1=[[-2403,1459],[-2338,1454],[-2330,1554],[-2395,1559]], P2=[[-2322.3,1471.5],[-2326.9,1406.2],[-2251,1397.4],[-2245.8,1466.2]];
    const wM=new THREE.MeshLambertMaterial({color:0xffffff}), grM=new THREE.MeshLambertMaterial({color:0x59616a}), seatA=new THREE.MeshLambertMaterial({color:0x1f5fb4}), seatB=new THREE.MeshLambertMaterial({color:0xc8261e});
    const pitches=[P1,P2].map((pp,k)=>{ const m=mar(pp); const y0=Math.min(...pp.map(v=>H(v[0],v[1]))); FLAT.push({p:pp,bb:bbox(pp),fe:0,h:y0});
      const surf=new THREE.Mesh(new THREE.PlaneGeometry(m.w,m.d).rotateX(-Math.PI/2),po(new THREE.MeshLambertMaterial({map:courtTex('grass')}),2)); surf.position.set(m.cx,y0+.08,m.cz); surf.rotation.y=-m.an; surf.receiveShadow=true; scene.add(surf);
      const gg=new THREE.Group(); gg.position.set(m.cx,y0,m.cz); gg.rotation.y=-m.an; scene.add(gg);
      const long=m.w>=m.d; [-1,1].forEach(s=>{ const gx=long?s*(m.w/2-1):0, gz=long?0:s*(m.d/2-1); [-3.66,3.66].forEach(o=>bx(gg,.12,2.44,.12,long?gx:o,0,long?o:gz,wM)); if(long) bx(gg,.12,.12,7.44,gx,2.44,0,wM); else bx(gg,7.44,.12,.12,0,2.44,gz,wM); });
      return {m,y0}; });
    // trybuny: schodkowe siedziska zwrócone w stronę boiska
    [[[-2404.4,1563.6],[-2406.4,1563.7],[-2408.8,1564.2],[-2416.1,1481.9],[-2411.6,1482.1],[-2407.5,1526.7],[-2407.0,1531.8]],[[-2334.3,1589.3],[-2321.6,1575.8],[-2320.7,1574.9],[-2324.7,1571.2],[-2338.2,1585.6]]].forEach((bp,bi)=>{ const m=mar(bp); const y0=Math.min(...bp.map(v=>H(v[0],v[1]))); const sw=m.d>m.w; const gg=new THREE.Group(); gg.position.set(m.cx,y0,m.cz); gg.rotation.y=-m.an+(sw?Math.PI/2:0); scene.add(gg);
      const Lg=Math.max(m.w,m.d), Dg=Math.min(m.w,m.d), c=Math.cos(gg.rotation.y), s=Math.sin(gg.rotation.y), pc=pitches[0].m, dx=pc.cx-m.cx, dz=pc.cz-m.cz; const lz=-dx*s+dz*c; const dir=lz>=0?1:-1;
      const st=(Dg-1.2)/4; for(let r=0;r<5;r++){ bx(gg,Lg,.45*(r+1),Math.max(.5,st),0,0,dir*(Dg/2-.6-r*st),r%2?seatB:seatA); }
      addSolid({x:m.cx,z:m.cz,hw:Lg/2,hd:Dg/2,c:Math.cos(-gg.rotation.y),s:Math.sin(-gg.rotation.y),r:Math.hypot(Lg,Dg)/2}); });
    // oświetlenie boiska bocznego (lit=yes): 4 maszty
    { const m=pitches[1].m, y0=pitches[1].y0, c=Math.cos(-m.an), s=Math.sin(-m.an); [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a,b])=>{ const lx=a*(m.w/2+4), lz=b*(m.d/2+4); const x=m.cx+lx*c+lz*s, z=m.cz-lx*s+lz*c; const mg=new THREE.Group(); mg.position.set(x,H(x,z),z); scene.add(mg); bx(mg,.35,15,.35,0,0,0,grM); const lm=new THREE.Mesh(new THREE.BoxGeometry(2.6,.9,.5),new THREE.MeshBasicMaterial({color:0xfff3c4})); lm.position.set(0,15.6,0); lm.rotation.y=Math.atan2(m.cx-x,m.cz-z); mg.add(lm); addSolid({x,z,hw:.3,hd:.3,c:1,s:0,r:.5}); }); }
    // ogrodzenie z siatki wokół obiektu (z bramą od północy, od parkingu)
    { const FHh=2.2, pos=[], uv=[], idx=[], posts=[]; let v=0; const gate=(a,b)=>{ const mx=(a[0]+b[0])/2; return mx>-2372&&mx<-2340&&a[1]<1432&&b[1]<1432; };
      for(let i=0;i<SPOLY.length;i++){ const a=SPOLY[i], b=SPOLY[(i+1)%SPOLY.length]; if(gate(a,b)) continue; const L=Math.hypot(b[0]-a[0],b[1]-a[1]), n=Math.max(1,Math.round(L/3)); for(let k=0;k<n;k++){ const t0=k/n,t1=(k+1)/n, ax=a[0]+(b[0]-a[0])*t0, az=a[1]+(b[1]-a[1])*t0, bx2=a[0]+(b[0]-a[0])*t1, bz=a[1]+(b[1]-a[1])*t1; const ha=H(ax,az), hb=H(bx2,bz);
          pos.push(ax,ha,az,bx2,hb,bz,bx2,hb+FHh,bz,ax,ha+FHh,az); uv.push(0,0,L/n/1.4,0,L/n/1.4,1,0,1); idx.push(v,v+1,v+2,v,v+2,v+3); v+=4; posts.push([ax,ha,az]); }
        addSolid({x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,hw:L/2,hd:.1,c:(b[0]-a[0])/L,s:(b[1]-a[1])/L,r:L/2+.3}); }
      const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); geo.setIndex(idx); geo.computeVertexNormals();
      const mt=fenceT.clone(); mt.needsUpdate=true; mt.wrapS=mt.wrapT=THREE.RepeatWrapping; scene.add(new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map:mt,transparent:true,alphaTest:.35,side:THREE.DoubleSide,color:0x3f6f8a})));
      const m4=new THREE.Matrix4(), q4=new THREE.Quaternion(), p3=new THREE.Vector3(), s3=new THREE.Vector3(), col=new THREE.Color(); const pm=mkIM(boxGeo,posts.length,null); posts.forEach(([x,y,z],i)=>{ m4.compose(p3.set(x,y,z),q4,s3.set(.1,FHh+.15,.1)); pm.setMatrixAt(i,m4); pm.setColorAt(i,col.set('#4c5660')); }); pm.castShadow=false; pm.instanceMatrix.needsUpdate=true; pm.instanceColor.needsUpdate=true; }
    // ławki rezerwowych przy boisku głównym + znacznik na mapie
    { const m=pitches[0].m, y0=pitches[0].y0; const gg=new THREE.Group(); gg.position.set(m.cx,y0,m.cz); gg.rotation.y=-m.an; scene.add(gg); [-6,6].forEach(o=>{ bx(gg,4,.5,.6,m.w>=m.d?o:m.w/2+1.5,0,m.w>=m.d?m.d/2+1.5:o,seatA); bx(gg,4,.9,.1,m.w>=m.d?o:m.w/2+1.5,.4,m.w>=m.d?m.d/2+1.9:o,grM); }); }
    }

  /* ---------- drzewa ---------- */
  // ---- dane z OSM (tools/osm_extras.py): prawdziwe drzewa, szpalery, ścieżki piesze, ławki; do tego szpalery przy ulicach z chodnikami ----
  if(typeof DATA_OSM!=='undefined'){ const D=DATA_OSM;
    for(let i=0;i<D.T.length;i+=3){ const x=D.T[i], z=D.T[i+1]; if(blocked(x,z,.8)||roadNearF(x,z,1.2)) continue; if(EXTRA_TREES.some(t=>Math.abs(t.x-x)<2&&Math.abs(t.z-z)<2)) continue; EXTRA_TREES.push({x,z,s:R(.85,1.35),con:D.T[i+2]===1,osm:true}); }
    D.TR.forEach(f=>{ const pts=[]; for(let i=0;i<f.length;i+=2) pts.push([f[i],f[i+1]]); const len=lineLen(pts), L=len[len.length-1]; for(let d=0;d<=L;d+=6.5){ const q=sampleLine(pts,len,d); if(blocked(q.x,q.z,.8)||roadNearF(q.x,q.z,1.2)) continue; EXTRA_TREES.push({x:q.x,z:q.z,s:R(.8,1.2),con:false,osm:true}); } });
    D.F.forEach(([paved,f])=>{ const pts=[]; for(let i=0;i<f.length;i+=2) pts.push([f[i],f[i+1]]); if(PARK&&inPoly(pts[0][0],pts[0][1],PARK.pts)) return; splitFree(pts,null,.3).forEach(run=>{ const m=new THREE.Mesh(ribbon(run,paved?1.9:1.2,0.13,2.2),paved?matPaver:matTrack); m.receiveShadow=true; scene.add(m); }); });
    // szpalery drzew przy chodnikach na ulicach spoza centrum
    ROADS.forEach(r=>{ if(!r.sw) return; const len=lineLen(r.pts), L=len[len.length-1]; let k=0; for(let d=6;d<L-4;d+=R(9,13)){ const q=sampleLine(r.pts,len,d); k++; const sd=k%2?1:-1, o=r.w/2+3.9; const x=q.x-q.tz*o*sd, z=q.z+q.tx*o*sd; if(blocked(x,z,1.4)||roadNearF(x,z,3)) continue; if(EXTRA_TREES.some(t=>Math.abs(t.x-x)<3&&Math.abs(t.z-z)<3)) continue; EXTRA_TREES.push({x,z,s:R(.75,1.1),con:false,col:pick(['#4c6e3a','#5a7d3a','#6a8a3a'])}); } });
    // orlik w Sadowcu: boisko z OSM najbliżej wsi Sadowiec-Wrzosy, z ogrodzeniem, bramką od strony drogi i koszami
    { if(SAD_PITCH){ const area=SAD_PITCH; const m=mar(area.pts); const cs=Math.cos(m.an), sn=Math.sin(m.an); let rq=null,rd=1e9; ROADS.forEach(r=>{ if(['track','rail','path','foot'].includes(r.t)||!r.L) return; for(let d=0;d<r.L;d+=3){ const q=sampleLine(r.pts,r.len,d); const dd=Math.hypot(q.x-m.cx,q.z-m.cz); if(dd<rd){ rd=dd; rq=[q.x,q.z]; } } });
        const q0=rq||[m.cx,m.cz+30], dx=q0[0]-m.cx, dz=q0[1]-m.cz, lx=dx*cs+dz*sn, lz=-dx*sn+dz*cs, sd=Math.abs(lx)/(m.w/2)>Math.abs(lz)/(m.d/2)?(lx>0?'x+':'x-'):(lz>0?'z+':'z-'), Lg=sd[0]==='x'?m.d:m.w, u=clamp(sd[0]==='x'?lz:lx,-Lg/2+1.8,Lg/2-1.8);
        SAD_ORLIK=buildCourt(area,'tartang',{fence:4.2,hoops:true,benches:true,solid:true,gates:[{side:sd,u}]}); SAD_ORLIK.area=area; } }
  }
  const trees=[...parkTrees,...EXTRA_TREES];
  for(let i=0;i<9000&&trees.length<3400;i++){ const b=pick(BLD); const a=R(0,6.28), d=R(7,26); const x=b.x+Math.cos(a)*d, z=b.z+Math.sin(a)*d; if(blocked(x,z,1.5))continue; if(roadNear(x,z,3.8))continue; if(inPoly(x,z,COURT.pts)||inPoly(x,z,PITCH2.pts)||inPoly(x,z,TRACK.pts)||inPoly(x,z,PARK.pts)||LOTS.some(l=>inPoly(x,z,l))||inPoly(x,z,PLAC.pts))continue; trees.push({x,z,s:R(.6,1.3),con:rnd()<.33}); }
  RAILS.slice(0,2).forEach(pts=>{ const len=lineLen(pts); const L=len[len.length-1]; for(let d=0;d<L;d+=R(6,10)){ const s=sampleLine(pts,len,d); if(s.x<X0||s.x>X1||s.z<Z0||s.z>Z1)continue; [1,-1].forEach(sd=>{ if(rnd()<.7){ const o=R(10,16)*sd; trees.push({x:s.x-s.tz*o,z:s.z+s.tx*o,s:R(.9,1.5),con:rnd()<.3}); } }); } });
  for(let i=0;i<300;i++){ const x=R(-240,-80),z=R(290,470); if(!inPoly(x,z,CEM.pts))continue; trees.push({x,z,s:R(.5,.8),con:true}); }
  // korona drzewa nie może zachodzić na żaden budynek
  function nearBuilding(x,z,R){ const gx=Math.floor(x/CELL), gz=Math.floor(z/CELL); for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){ const L=grid.get((gx+i)+','+(gz+j)); if(!L)continue; for(const o of L){ if(o.tree||o.off)continue;
      if(o.poly){ if(inPoly(x,z,o.poly))return true; for(let k=0;k<o.poly.length;k++){ const a=o.poly[k],b=o.poly[(k+1)%o.poly.length]; if(segDist(x,z,a[0],a[1],b[0],b[1])<R) return true; } continue; }
      if(Math.min(o.hw,o.hd)<.9)continue; const dx=x-o.x,dz=z-o.z; const lx=Math.abs(dx*o.c+dz*o.s)-o.hw, lz=Math.abs(-dx*o.s+dz*o.c)-o.hd; if(Math.hypot(Math.max(0,lx),Math.max(0,lz))<R) return true; } } return false; }
  const SHOP_FR=[CB.biedr,CB.lidl].filter(Boolean).map(b=>frontSide(b,nearestRoad(b.x,b.z,r=>r.t!=='track'&&r.t!=='srv').r));
  const shopFront=(x,z)=>SHOP_FR.some(f=>{ const dx=x-f.x,dz=z-f.z, v=dx*f.nx+dz*f.nz, u=Math.abs(-dx*f.nz+dz*f.nx); return v>-1&&v<16&&u<f.len/2+3; });
  const onRoadT=(x,z,m)=>(RSEG.get(Math.floor(x/30)+','+Math.floor(z/30))||[]).some(([r,a,b])=>segDist(x,z,a[0],a[1],b[0],b[1])<r.w/2+m);
  const ZPK=AREAS.find(a=>a.t==='am:parking'&&Math.hypot(centroid(a.pts)[0]-B_ZAB.x,centroid(a.pts)[1]-B_ZAB.z)<40), TSTR=ROADS.filter(r=>['Stefana Batorego','Dojazdowa','Emilii Plater','Mikołaja Reja'].includes(r.n)), DWZ=CB.dworzec;
  for(let i=trees.length-1;i>=0;i--){ const t=trees[i]; if([[-159,-119],[-156,-125],[-159,-132]].some(q=>Math.hypot(t.x-q[0],t.z-q[1])<4.2)||onRoadT(t.x,t.z,.8)||orlik.grp.userData.inside(t.x,t.z)||ncCourt.grp.userData.inside(t.x,t.z)||shopFront(t.x,t.z)||(ZPK&&inPoly(t.x,t.z,ZPK.pts))||TSTR.some(r=>roadDist(r,t.x,t.z)<15)||(DWZ&&Math.hypot(t.x-DWZ.x,t.z-DWZ.z)<34)||nearBuilding(t.x,t.z,t.con?1.9*t.s:3.0*t.s)) trees.splice(i,1); } // bez drzew na orliku i na budynkach
  const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.16,.26,1,6).translate(0,.5,0),new THREE.MeshLambertMaterial({color:0x5e4632}),trees.length);
  const cD=trees.filter(t=>!t.con), cC=trees.filter(t=>t.con);
  const leafTex=tex(128,128,(x,w,h)=>{ x.fillStyle='#bdbdbd'; x.fillRect(0,0,w,h); for(let i=0;i<500;i++){ const v=Math.floor(R(120,255)); x.fillStyle=`rgb(${v},${v},${v})`; x.beginPath(); x.arc(R(0,w),R(0,h),R(2,6),0,7); x.fill(); } },true);
  const crownGeo=(()=>{ const P=[[0,.05,0,.72],[.42,-.12,.2,.55],[-.4,-.1,.25,.55],[.1,-.15,-.45,.55],[-.2,.38,-.1,.5],[.28,.32,.18,.48],[-.05,-.4,.05,.55],[.45,.15,-.3,.45],[-.45,.18,-.25,.45]];
    const parts=P.map(([x,y,z,r],i)=>{ const g=new THREE.IcosahedronGeometry(r,1); const p=g.attributes.position; for(let k=0;k<p.count;k++){ const hh=Math.sin((i*97+Math.round(p.getX(k)*40)*13.1+Math.round(p.getY(k)*40)*7.7+Math.round(p.getZ(k)*40)*3.3)*127.1+311.7)*43758.5453; const f=1+(hh-Math.floor(hh)-.5)*.22; p.setXYZ(k,p.getX(k)*f,p.getY(k)*f,p.getZ(k)*f); } const nn=g.attributes.normal; for(let k=0;k<p.count;k++){ const vx=p.getX(k),vy=p.getY(k),vz=p.getZ(k),l=Math.hypot(vx,vy,vz)||1; nn.setXYZ(k,vx/l,vy/l,vz/l); } g.translate(x,y,z); return [g,0xffffff]; });
    /* korona: ciemniejszy rdzeń + zewnętrzna warstwa płatów liści (tekstura z przezroczystością), wspólna geometria, więc sezony i podział na kwadraty działają bez zmian */
    const Pp=[],Nn=[],Uu=[],Cc=[]; const hh=(a,b)=>{ const v=Math.sin(a*127.1+b*311.7)*43758.5453; return v-Math.floor(v); };
    parts.forEach(([g0])=>{ const g=g0.index?g0.toNonIndexed():g0; const p=g.attributes.position; for(let k=0;k<p.count;k++){ const x=p.getX(k)*.86,y=p.getY(k)*.86,z=p.getZ(k)*.86,l=Math.hypot(x,y,z)||1; Pp.push(x,y,z); Nn.push(x/l,y/l,z/l); Uu.push(.02+hh(k,1)*.44,.02+hh(k,2)*.96); Cc.push(.5,.5,.5); } });
    P.forEach(([cx,cy,cz,r],i)=>{ const n=i?11:16; for(let k=0;k<n;k++){ const u=hh(i*31+k,3)*2-1, th=hh(i*31+k,4)*6.2832, sq=Math.sqrt(1-u*u); let dx=sq*Math.cos(th), dy=u*.9+.1, dz=sq*Math.sin(th); const dl=Math.hypot(dx,dy,dz); dx/=dl; dy/=dl; dz/=dl; const ox=cx+dx*r*.93, oy=cy+dy*r*.93, oz=cz+dz*r*.93; if(Math.hypot(ox,oy,oz)<.55&&i) continue;
        let nx=dx+(hh(k,i+5)-.5)*1.1, ny=dy+(hh(k,i+6)-.5)*1.1, nz=dz+(hh(k,i+7)-.5)*1.1; const nl=Math.hypot(nx,ny,nz)||1; nx/=nl; ny/=nl; nz/=nl; let ax=ny*0-nz*1, ay=nz*0-nx*0, az=nx*1-ny*0; ax=-nz; ay=0; az=nx; let al=Math.hypot(ax,az); if(al<.05){ ax=1; az=0; al=1; } ax/=al; az/=al; const bx2=ny*az-nz*ay, by2=nz*ax-nx*az, bz2=nx*ay-ny*ax; const sz=(.34+hh(k,i+8)*.2)*(r/.55);
        const cr=[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]]; const fl=hh(k,i+9)<.5; const sh=.82+hh(k,i+10)*.36; cr.forEach(([a,b])=>{ const px=ox+(ax*a+bx2*b)*sz, py=oy+(ay*a+by2*b)*sz, pz=oz+(az*a+bz2*b)*sz; Pp.push(px,py,pz); const l=Math.hypot(px,py,pz)||1; Nn.push(px/l*.75,py/l*.75+.25,pz/l*.75); Uu.push(.5+((fl?-a:a)*.5+.5)*.5,b*.5+.5); Cc.push(sh,sh,sh); }); } });
    const out=new THREE.BufferGeometry(); out.setAttribute('position',new THREE.Float32BufferAttribute(Pp,3)); out.setAttribute('normal',new THREE.Float32BufferAttribute(Nn,3)); out.setAttribute('uv',new THREE.Float32BufferAttribute(Uu,2)); out.setAttribute('color',new THREE.Float32BufferAttribute(Cc,3)); out.computeBoundingSphere(); return out; })();
  const WINDU={value:0};
  const leafAtlas=tex(512,256,(x,w,h)=>{ x.clearRect(0,0,w,h); x.fillStyle='#b9b9b9'; x.fillRect(0,0,w/2,h); for(let i=0;i<900;i++){ const v=130+Math.random()*125|0; x.fillStyle=`rgb(${v},${v},${v})`; x.beginPath(); x.ellipse(Math.random()*w/2,Math.random()*h,2+Math.random()*5,1.5+Math.random()*3,Math.random()*3.14,0,7); x.fill(); }
    x.save(); x.beginPath(); x.rect(w/2,0,w/2,h); x.clip(); for(let i=0;i<230;i++){ const a=Math.random()*6.283, rr=Math.pow(Math.random(),.6)*h*.46, px=w*.75+Math.cos(a)*rr, py=h/2+Math.sin(a)*rr, v=150+Math.random()*105|0; x.fillStyle=`rgb(${v},${v},${v})`; x.save(); x.translate(px,py); x.rotate(Math.random()*6.283); x.beginPath(); x.moveTo(-11,0); x.quadraticCurveTo(0,-7,12,0); x.quadraticCurveTo(0,7,-11,0); x.fill(); x.strokeStyle='rgba(60,60,60,.5)'; x.lineWidth=.8; x.beginPath(); x.moveTo(-10,0); x.lineTo(11,0); x.stroke(); x.restore(); } x.restore(); }); leafAtlas.__nonm=1;
  const windy=(mat,amp)=>{ mat.onBeforeCompile=sh=>{ sh.uniforms.wT=WINDU; sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float wT;').replace('#include <begin_vertex>',`#include <begin_vertex>
 {
#ifdef USE_INSTANCING
   vec3 ip=instanceMatrix[3].xyz;
#else
   vec3 ip=vec3(0.);
#endif
   float ph=ip.x*.31+ip.z*.27; float wv=sin(wT*1.3+ph+position.y*2.)+.45*sin(wT*2.9+ph*1.7+position.x*5.); transformed.x+=wv*${amp.toFixed(3)}*(.4+position.y+.6); transformed.z+=cos(wT*1.1+ph+position.x*3.)*${(amp*.6).toFixed(3)}; }`); sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n normal=normalize(vNormal);'); }; return mat; };
  const coneGeo=(()=>{ const parts=[[1,.0,.55],[.82,.25,.5],[.62,.48,.42],[.4,.68,.32]].map(([r,y,h])=>[new THREE.ConeGeometry(r,h,9).translate(0,y+h/2,0),0xffffff]); return mergeParts(parts); })();
  const crownD=new THREE.InstancedMesh(crownGeo,windy(new THREE.MeshLambertMaterial({color:0xffffff,map:leafAtlas,alphaTest:.5,side:THREE.DoubleSide,vertexColors:true}),.022),Math.max(1,cD.length)); if(crownD.material.roughness!==undefined){ crownD.material.roughness=.95; crownD.material.envMapIntensity=.25; }
  const crownC=new THREE.InstancedMesh(coneGeo,new THREE.MeshLambertMaterial({color:0xffffff,map:leafTex}),Math.max(1,cC.length));
  [trunk,crownD,crownC].forEach(m=>{m.castShadow=true;m.receiveShadow=true;scene.add(m);});
  const TG=['#557a35','#62853a','#728e40','#86913e','#9a8f3a','#5b7832','#a88a35','#b4782e'];
  let ci=0,cc=0; trees.forEach((t,i)=>{ const y=H(t.x,t.z); const th=t.con?2*t.s:(t.tall?4.2:2.6)*t.s; dum.rotation.set(0,R(0,6.28),0); dum.position.set(t.x,y,t.z); dum.scale.set(t.s,th,t.s); dum.updateMatrix(); trunk.setMatrixAt(i,dum.matrix);
    if(t.con){ dum.position.y=y+th*.5; dum.scale.set(2*t.s,6.5*t.s,2*t.s); dum.updateMatrix(); crownC.setMatrixAt(cc,dum.matrix); crownC.setColorAt(cc++,col.set(t.col||pick(['#2f5526','#36602a','#2b4d24','#3b5f2c','#7d8a3a']))); }
    else { dum.position.y=y+th+2*t.s; dum.scale.set(3.2*t.s,(t.tall?3.4:2.7)*t.s,3.2*t.s); dum.updateMatrix(); crownD.setMatrixAt(ci,dum.matrix); crownD.setColorAt(ci++,col.set(t.col||pick(TG))); } });
  trees.forEach(t=>addSolid({x:t.x,z:t.z,hw:.35*t.s,hd:.35*t.s,c:1,s:0,r:.6,tree:true}));

  /* ---------- lasy z OSM (poza wsią): lekkie drzewa instancjonowane ---------- */
  { const W=AREAS.filter(a=>a.t==='nat:wood'||a.t==='nat:scrub').sort((a,b)=>(centroid(a.pts)[1]<-860)-(centroid(b.pts)[1]<-860)); const F=[];
    W.unshift({t:'nat:wood',usr:true,pts:[[-1016,1460],[-931,1521],[-962,1562],[-944,1570],[-875,1556],[-908,1607],[-857,1654],[-911,1722],[-842,1792],[-988,1959],[-1176,1883],[-1350,1784],[-1076,1484]]});
    W.forEach(a=>{ const bb=bbox(a.pts), scrub=a.t==='nat:scrub', step=scrub?10:a.usr?3.1:(Math.hypot(...centroid(a.pts))<2200?5.2:11); const ar=Math.abs(polyArea(a.pts));
      for(let x=bb[0];x<bb[2];x+=step)for(let z=bb[1];z<bb[3];z+=step){ if(F.length>(a.usr?90000:30000))return; const jx=x+R(-step*.4,step*.4), jz=z+R(-step*.4,step*.4); if(jx<X0||jx>X1||jz<Z0||jz>Z1)continue; if(!inPoly(jx,jz,a.pts))continue; if(scrub&&rnd()<.5)continue; if(a.usr&&ROADS.some(r=>r.L&&roadDist(r,jx,jz)<(r.w||3)/2+3.2))continue; if(a.usr&&(rnd()<.18))continue; if(roadNear(jx,jz,4)||blocked(jx,jz,1.5)||orlik.grp.userData.inside(jx,jz)||ncCourt.grp.userData.inside(jx,jz)||nearBuilding(jx,jz,3.4))continue; F.push([jx,jz,scrub?R(.5,.9):R(.85,1.35),scrub?0:rnd()<.72?1:0]); } });
    const pine=mergeParts([[new THREE.CylinderGeometry(.18,.28,9,5).translate(0,4.5,0),0x6b4a32],[new THREE.ConeGeometry(2.1,5,7).translate(0,9,0),0xffffff],[new THREE.ConeGeometry(1.6,4,7).translate(0,11.2,0),0xffffff],[new THREE.ConeGeometry(1.0,3,7).translate(0,13.2,0),0xffffff]]);
    const leaf=mergeParts([[new THREE.CylinderGeometry(.2,.3,4.5,5).translate(0,2.25,0),0x6b4a32],[new THREE.IcosahedronGeometry(2.8,0).scale(1,.85,1).translate(0,6.2,0),0xffffff],[new THREE.IcosahedronGeometry(2,0).translate(1.4,5.2,.8),0xffffff],[new THREE.IcosahedronGeometry(2,0).translate(-1.3,5.4,-.9),0xffffff]]);
    const mk=(geo,list,cols)=>{ const m=new THREE.InstancedMesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,map:leafTex}),Math.max(1,list.length)); list.forEach((f,i)=>{ dum.position.set(f[0],H(f[0],f[1])-.2,f[1]); dum.rotation.set(0,R(0,6.28),0); dum.scale.set(f[2],f[2]*R(.85,1.15),f[2]); dum.updateMatrix(); m.setMatrixAt(i,dum.matrix); m.setColorAt(i,col.set(pick(cols))); }); m.castShadow=false; m.receiveShadow=true; scene.add(m); return m; };
    window.__forest=[mk(pine,F.filter(f=>f[3]===1),['#2c4a26','#34552b','#2a4423','#3c5a2e']), mk(leaf,F.filter(f=>f[3]===0),['#4f6e32','#5c7a36','#6b7f3a','#7a8a3c','#8a8a3a'])];
    F.forEach(f=>{ if(f[3]===1||f[2]>.8) addSolid({x:f[0],z:f[1],hw:.35,hd:.35,c:1,s:0,r:.5,tree:true}); }); }

  /* ---------- latarnie ---------- */
  const lamps=[]; ROADS.filter(r=>r.main||SIDEWALK.has(r.n)).forEach(r=>{ for(let d=12;d<r.L;d+=36){ const s=sampleLine(r.pts,r.len,d); if(s.x<-720||s.x>720)continue; const o=r.w/2+2.6; const x=s.x-s.tz*o, z=s.z+s.tx*o; if(roadNearF(x,z,.4)) continue; lamps.push({x,z,y:H(x,z),a:Math.atan2(s.tz,s.tx)}); } });
  const poleIM=new THREE.InstancedMesh(new THREE.CylinderGeometry(.08,.12,8,6).translate(0,4,0),new THREE.MeshLambertMaterial({color:0x8a9096}),lamps.length);
  const headMat=new THREE.MeshLambertMaterial({color:0xdedcd4,emissive:0x000000});
  const headIM=new THREE.InstancedMesh(new THREE.BoxGeometry(.9,.18,.38),headMat,lamps.length);
  lamps.forEach((l,i)=>{ dum.rotation.set(0,-l.a,0); dum.position.set(l.x,l.y,l.z); dum.scale.set(1,1,1); dum.updateMatrix(); poleIM.setMatrixAt(i,dum.matrix); dum.position.y=l.y+8; dum.updateMatrix(); headIM.setMatrixAt(i,dum.matrix); addSolid({x:l.x,z:l.z,hw:.2,hd:.2,c:1,s:0,r:.4}); });
  scene.add(poleIM,headIM);
  /* plamy światła pod latarniami (widoczne po zmroku na całej mapie, bez dodatkowych świateł) */
  const LAMPGLOW=(()=>{ const t=tex(128,128,(x,w,h)=>{ const g=x.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2); g.addColorStop(0,'rgba(255,214,150,1)'); g.addColorStop(.35,'rgba(255,196,120,.5)'); g.addColorStop(1,'rgba(255,180,100,0)'); x.fillStyle=g; x.fillRect(0,0,w,h); }); t.__nonm=1;
    const im=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:t,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:true,polygonOffset:true,polygonOffsetFactor:-6,polygonOffsetUnits:-12}),Math.max(1,lamps.length));
    lamps.forEach((l,i)=>{ const ox=l.x+Math.sin(l.a)*1.2, oz=l.z-Math.cos(l.a)*1.2; dum.position.set(ox,H(ox,oz)+.22,oz); dum.rotation.set(0,0,0); dum.scale.set(19,1,19); dum.updateMatrix(); im.setMatrixAt(i,dum.matrix); }); im.count=lamps.length; im.renderOrder=3; im.visible=false; scene.add(im); return im; })();
  const lampPool=[]; for(let i=0;i<8;i++){ const pl=new THREE.PointLight(0xffc070,0,26,1.8); scene.add(pl); lampPool.push(pl); }

  /* ---------- etykiety ---------- */
  function rr(x,X,Y,W,Hh,r){ x.beginPath(); x.moveTo(X+r,Y); x.arcTo(X+W,Y,X+W,Y+Hh,r); x.arcTo(X+W,Y+Hh,X,Y+Hh,r); x.arcTo(X,Y+Hh,X,Y,r); x.arcTo(X,Y,X+W,Y,r); x.closePath(); }
  function labelSprite(text,color){ const c=document.createElement('canvas'),x=c.getContext('2d'); x.font='600 44px "Barlow Condensed", Arial'; const tw=x.measureText(text).width; c.width=Math.ceil(tw+90); c.height=72;
    x.font='600 44px "Barlow Condensed", Arial'; rr(x,2,2,c.width-4,c.height-4,6); x.fillStyle='rgba(8,10,12,.82)'; x.fill();
    x.fillStyle=color; x.fillRect(2,2,10,c.height-4); x.fillStyle='#fff'; x.textBaseline='middle'; x.fillText(text,30,38);
    const t=new THREE.CanvasTexture(c); t.minFilter=THREE.LinearFilter; const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthWrite:false,fog:false})); const h=.8; sp.scale.set(h*c.width/c.height,h,1); return sp; }
  function plateSprite(text){ const c=document.createElement('canvas'),x=c.getContext('2d'); x.font='600 40px "Barlow Condensed", Arial'; const tw=x.measureText(text).width; c.width=Math.ceil(tw+50); c.height=64;
    x.fillStyle='#1f4fa3'; x.fillRect(0,0,c.width,c.height); x.strokeStyle='#fff'; x.lineWidth=4; x.strokeRect(6,6,c.width-12,c.height-12); x.font='600 40px "Barlow Condensed", Arial'; x.fillStyle='#fff'; x.textBaseline='middle'; x.fillText(text,25,34);
    const t=new THREE.CanvasTexture(c); t.minFilter=THREE.LinearFilter; const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t})); const h=0.9; sp.scale.set(h*c.width/c.height,h,1); return sp; }
  const bc=n=>{ const b=BLD.find(b=>b.name===n); return [b.x,b.z]; };
  const MAP_PLACES=(typeof DATA_X!=='undefined'?DATA_X.P:[]).filter(p=>p[1].startsWith('place:')).map(p=>[p[0],p[2],p[3],p[1]==='place:village'||p[1]==='place:hamlet']).concat([['Trębaczew',-120,-60,true],['Działoszyn',-2700,1350,true]]);
  const POIS=[
    {n:'Szkoła Podstawowa',p:centroid(BPOLY.find(b=>b.code===5&&b!==CHURCH).pts),c:'#e07b39',h:10,ic:'S'},
    {n:'Przedszkole im. Jasia i Małgosi',p:centroid(KINDER.pts),c:'#f2b33d',ic:'P'},
    {n:'Orlik przy Zielonej',p:[orlik.m.cx,orlik.m.cz],c:'#c0503a',h:6,ic:'⚽'},
    {n:'Boisko szkolne',p:centroid(PITCH2.pts),c:'#3fa34d',h:5,ic:'⚽'},
    {n:'Hala sportowa',p:[HALL_B.x,HALL_B.z],c:'#7b8794',h:12,ic:'H'},
    {n:'Kościół pw. Nawiedzenia NMP',p:centroid(CHURCH.pts),c:'#9a3f2b',h:20,ic:'✝'},
    {n:'Plebania',p:bc('Plebania'),c:'#9a3f2b',ic:'⌂'},
    {n:'Cmentarz parafialny',p:centroid(CEM.pts),c:'#7a8a68',h:4,ic:'✝'},
    {n:'OSP Trębaczew',p:centroid(area('am:fire_station').pts),c:'#d0312d',ic:'F'},
    {n:'Lewiatan',p:bc('Lewiatan'),c:'#2f8de4',ic:'$'},
    {n:'Żabka',p:bc('Żabka'),c:'#3fa34d',ic:'$'},
    {n:'Paczkomat przy Lewiatanie',p:[-121,7],c:'#ffcd00',h:4,ic:'P'},
    {n:'Paczkomat · Wyzwolenia (Żabka)',p:[-76,43],c:'#ffcd00',h:4,ic:'P'},
    {n:'Euforia Trębaczew',p:[-151,-350],c:'#f07a1f',ic:'R'},
    {n:'Apteka Magnolia',p:[-94,-201],c:'#3fa34d',ic:'+'},
    {n:'Ośrodek zdrowia',p:[-99,-213],c:'#d0312d',ic:'+'},
    {n:'AUTOPART · serwis samochodów ciężarowych',p:[-1136,687],c:'#2e3134',h:7,ic:'R'},
    {n:'Z.U.H. ZBYSZKO',p:[-1319,621],c:'#d1262e',h:7,ic:'$'},
    {n:'IKAR · materiały budowlane',p:[-1357,758],c:'#e0a020',h:7,ic:'$'},
    {n:'Biblioteka',p:[-136,-125],c:'#7d5ab5',ic:'B'},
    {n:'Park w Trębaczewie',p:centroid(PARK.pts),c:'#3fa34d',h:4,ic:'♣'},
    {n:'Plac zabaw',p:centroid(PLAYS[0].pts),c:'#c0392b',h:4,ic:'☺'},
    {n:'Kwiaciarnia Sas-Anka',p:[-144,-244],c:'#e0368a',ic:'✿'},
    {n:'F.P.H.U TRANS-BUD',p:[157,-76],c:'#7d8a96',ic:'T'},
    {n:'Noclegi pracownicze',p:[-501,276],c:'#e0368a',ic:'N'},
    {n:'Wyroby mięsne „U Kazia”',p:bc('U Kazia'),c:'#7d8a96',ic:'$'},
    {n:'Sklep ADOLEK',p:bc('Sklep ADOLEK'),c:'#2f8de4',ic:'$'},
    {n:'Przystanek',p:[409,-187],c:'#2f8de4',h:4,ic:'⇄'},
    {n:'Przystanek przy kościele',p:[-156,96],c:'#2f8de4',h:4,ic:'⇄'},
  ];
  if(typeof DATA_X!=='undefined'){ const PICK={station:['Dworzec PKP Działoszyn','#1f5fb4','⇄'],memorial:[null,'#7a8a68','★'],animal_shelter:[null,'#c96b9a','♥'],shop:[null,'#2f8de4','$'],industrial:[null,'#7b8794','⚙'],restaurant:[null,'#f07a1f','R'],hotel:[null,'#7d5ab5','H'],school:[null,'#e07b39','S'],pharmacy:[null,'#3fa34d','+']};
    const want=['Biedronka','Górka Kazika','Schronisko','Działoszyn','BPT STEEL','MINERAŁ','Hotel V.I.P.','Zespół Szkół','Punkt Apteczny','Z.U.H. ZBYSZKO','KIEPUREX'];
    DATA_X.P.forEach(([n,k,x,z])=>{ const d=PICK[k]; if(!d||!want.some(w=>n.includes(w)))return; if(POIS.some(q=>Math.hypot(q.p[0]-x,q.p[1]-z)<30))return; POIS.push({n:d[0]||n.replace(/\s+-\s+pomnik.*$/,' - pomnik').slice(0,46),p:[x,z],c:d[1],ic:d[2],h:k==='station'?8:6}); }); }
  POIS.forEach(p=>{ [p.x,p.z]=p.p; const sp=labelSprite(p.n,p.c); sp.position.set(p.x,H(p.x,p.z)+(p.h||8)+2,p.z); sp.visible=false; scene.add(sp); p.sp=sp; });
  /* kapliczka przy Wyzwolenia usunięta (stała na jezdni) */
  const poleMat=new THREE.MeshLambertMaterial({color:0x7c8288});
  ROADS.filter(r=>r.n&&!r.main&&r.t!=='track').forEach(r=>{ [0.08,0.55].forEach(f=>{ if(r.L<150&&f>.5)return; const s=sampleLine(r.pts,r.len,Math.max(6,r.L*f)); const o=r.w/2+2.6; const x=s.x-s.tz*o, z=s.z+s.tx*o; if(roadNearF(x,z,.4)||blocked(x,z,.3)) return; const y=H(x,z);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,2.8,5).translate(0,1.4,0),poleMat); pole.position.set(x,y,z); scene.add(pole);
    const pl=plateSprite('ul. '+r.n); pl.position.set(x,y+3.1,z); scene.add(pl); }); });
  { const zr=ROADS.find(r=>r.n==='Zielona'); const s=sampleLine(zr.pts,zr.len,60); const t=tex(512,128,(x,w,h)=>{ x.clearRect(0,0,w,h); x.font='italic 700 96px "Barlow Condensed", Arial'; x.fillStyle='rgba(235,235,235,.75)'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('Zielona',w/2,h/2+4); });
    const m=new THREE.Mesh(new THREE.PlaneGeometry(8,2).rotateX(-Math.PI/2),po(new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}),5)); const x=s.x+s.tz*1.4, z=s.z-s.tx*1.4; m.position.set(x,H(x,z)+0.1,z); m.rotation.y=-Math.atan2(s.tz,s.tx)+Math.PI/2; scene.add(m); }

  await LP(62);
  /* ---------- pojazdy ---------- */
  const wheelGeo=new THREE.CylinderGeometry(.36,.36,.26,14).rotateX(Math.PI/2), wheelMat=new THREE.MeshLambertMaterial({color:0x151515});
  /* ---------- scalanie geometrii z kolorami wierzchołków (mniej wywołań rysowania) ---------- */
  function mergeParts(parts){ let n=0; const gs=parts.map(([g,c])=>{ const q=g.index?g.toNonIndexed():g; n+=q.attributes.position.count; return [q,new THREE.Color(c)]; });
    const P=new Float32Array(n*3), N=new Float32Array(n*3), C=new Float32Array(n*3); let o=0;
    gs.forEach(([q,c])=>{ const p=q.attributes.position, nn=q.attributes.normal; for(let i=0;i<p.count;i++){ P[o*3]=p.getX(i); P[o*3+1]=p.getY(i); P[o*3+2]=p.getZ(i); N[o*3]=nn.getX(i); N[o*3+1]=nn.getY(i); N[o*3+2]=nn.getZ(i); C[o*3]=c.r; C[o*3+1]=c.g; C[o*3+2]=c.b; o++; } });
    const out=new THREE.BufferGeometry(); out.setAttribute('position',new THREE.BufferAttribute(P,3)); out.setAttribute('normal',new THREE.BufferAttribute(N,3)); out.setAttribute('color',new THREE.BufferAttribute(C,3)); out.computeBoundingSphere(); return out; }
  const G_=(geo,sx,sy,sz,x,y,z,rx,ry,rz)=>{ const g=geo.clone(); if(sx!==1||sy!==1||sz!==1)g.scale(sx,sy,sz); if(rx)g.rotateX(rx); if(ry)g.rotateY(ry); if(rz)g.rotateZ(rz); g.translate(x,y,z); return g; };
  const SPH=new THREE.SphereGeometry(1,16,12), SPHs=new THREE.SphereGeometry(1,10,8), CYL=(rt,rb,h,s)=>new THREE.CylinderGeometry(rt,rb,h,s||12,1);

  await LP(70);
  /* ---------- postacie: ludzkie proporcje, stawy w łokciach i kolanach ---------- */
  const humanMat=new THREE.MeshPhongMaterial({vertexColors:true,shininess:14,specular:0x181818});
  const SKINS=[0xf0cfb2,0xe6bb98,0xd9a982,0xc68e66,0xa86f4b,0xf5d9c0];
  function shade(c,k){ return new THREE.Color(c).multiplyScalar(k).getHex(); }
  /* ---------- postacie z Blendera (tools/blender/postac.py): części ciała z regionami kolorów i zacienieniem ---------- */
  const HUMG={}; const HAS_HUM=typeof HUM!=='undefined'&&!!HUM.torso_m_tee;
  function humPart(name){ if(HUMG[name])return HUMG[name]; const M=HUM[name]; if(!M)return null; const raw=atob(M.g), bin=new ArrayBuffer(raw.length), u8=new Uint8Array(bin); for(let i=0;i<raw.length;i++) u8[i]=raw.charCodeAt(i);
    const n=M.n, al=x=>(x+3)&~3; let o=0; const P=new Int16Array(bin,o,n*3); o=al(o+n*6); const N=new Int8Array(bin,o,n*3); o=al(o+n*3); const Rg=new Uint8Array(bin,o,n), A=new Uint8Array(bin,o+n,n); o=al(o+n*2); const I=new Uint16Array(bin,o,M.i);
    const pos=new Float32Array(n*3), nor=new Float32Array(n*3); for(let i=0;i<n*3;i++){ pos[i]=P[i]/1000; nor[i]=N[i]/127; } return HUMG[name]={n,pos,nor,R:Uint8Array.from(Rg),A:Float32Array.from(A,v=>.55+.45*v/255),I:Uint16Array.from(I)}; }
  // jedna siatka na osobę ze skórą (SkinnedMesh): części ciała przeniesione do pozycji spoczynkowej kości, przy stawach wagi się przenikają (gładkie łokcie, kolana, barki)
  const humanSkinMat=new THREE.MeshPhongMaterial({vertexColors:true,shininess:8,specular:0x0c0c0c,skinning:true});
  const sstep=(a,b,x)=>{ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
  function humSkinGeo(list,pal){ let n=0,ni=0; const L=list.map(q=>{ const h=humPart(q.name); if(h){ n+=h.n; ni+=h.I.length; } return [q,h]; }).filter(x=>x[1]);
    const P=new Float32Array(n*3), N=new Float32Array(n*3), C=new Float32Array(n*3), SI=new Uint16Array(n*4), SW=new Float32Array(n*4), I=new Uint32Array(ni); let o=0, oi=0; const tmp=new THREE.Color(), v=new THREE.Vector3(), nv=new THREE.Vector3(), nm=new THREE.Matrix3();
    L.forEach(([q,h])=>{ const s=q.s||[1,1,1], c=q.c||[0,0,0], m=q.mirror?-1:1, M=q.M; if(M) nm.getNormalMatrix(M);
      for(let i=0;i<h.n;i++){ const k=(o+i)*3, j=i*3; v.set(m*(c[0]+(h.pos[j]-c[0])*s[0]), c[1]+(h.pos[j+1]-c[1])*s[1], c[2]+(h.pos[j+2]-c[2])*s[2]); const ly=v.y, lx=v.x;
        nv.set(m*h.nor[j]/s[0],h.nor[j+1]/s[1],h.nor[j+2]/s[2]).normalize(); if(M){ v.applyMatrix4(M); nv.applyMatrix3(nm).normalize(); }
        P[k]=v.x; P[k+1]=v.y; P[k+2]=v.z; N[k]=nv.x; N[k+1]=nv.y; N[k+2]=nv.z; tmp.set(pal[h.R[i]]); if(q.cf) q.cf(tmp,h.R[i],lx,ly,v.z); const a=h.A[i]; C[k]=tmp.r*a; C[k+1]=tmp.g*a; C[k+2]=tmp.b*a;
        const w=q.w(lx,ly,v.x,v.y); const b4=(o+i)*4; SI[b4]=w[0]; SW[b4]=1-w[2]; SI[b4+1]=w[1]; SW[b4+1]=w[2]; }
      for(let t=0;t<h.I.length;t+=3){ I[oi+t]=h.I[t]+o; I[oi+t+1]=h.I[t+(q.mirror?2:1)]+o; I[oi+t+2]=h.I[t+(q.mirror?1:2)]+o; }
      o+=h.n; oi+=h.I.length; });
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(P,3)); g.setAttribute('normal',new THREE.BufferAttribute(N,3)); g.setAttribute('color',new THREE.BufferAttribute(C,3));
    g.setAttribute('skinIndex',new THREE.BufferAttribute(SI,4)); g.setAttribute('skinWeight',new THREE.BufferAttribute(SW,4)); g.setIndex(new THREE.BufferAttribute(I,1)); g.computeBoundingSphere(); g.boundingSphere.radius+=.6; return g; }
  const blendC=(a,b,k)=>new THREE.Color(a).lerp(new THREE.Color(b),k).getHex();
  function makePerson(top,bottom,hair,opt){ if(!HAS_HUM) return makePersonOld(top,bottom,hair,opt); opt=opt||{}; const p=new THREE.Group();
    const fem=opt.female!==undefined?opt.female:rnd()<.45, skin=opt.skin||pick(SKINS), style=opt.style||pick(fem?['jacket','tee','coat','hoodie']:['jacket','tee','hoodie','coat','jacket']);
    const hairStyle=opt.hairStyle||(fem?pick(['long','pony','bob','long']):pick(['short','short','buzz','cap','bald','short'])), shoe=opt.shoe||pick([0x1c1c1c,0x2a2420,0xe8e8e4,0x3a2c22,0x22252a]);
    const sh=fem?.185:.215, hipW=fem?.105:.095, tee=style==='tee';
    // paleta w kolejności HUM_REG: skin top topd bot botd shoe sole hair eyew iris lips brow slvU slvF cuff cap capd zip str
    const pal=[skin,top,shade(top,.72),bottom,shade(bottom,.78),shoe,shoe===0xe8e8e4?0xf4f4f2:shade(shoe,.55),hair,0xeeeae2,opt.eyes||pick([0x4a3020,0x3a5f86,0x5a6a3a,0x2e2218,0x6a5236]),blendC(skin,0xa8454a,fem?.5:.32),shade(hair,.8),
      tee?skin:top,tee?skin:top,tee?skin:shade(top,.72),opt.capC||pick([0xb3262b,0x1e2a44,0x222222,0x2f6b3a]),0x161616,opt.under||pick([0xdedcd6,0x2a2a2c,0x8a8f96,0x9a2f2f,0x2f4f7a]),0xe8e8e4].map(c=>new THREE.Color(c).getHex()); // „zip” = koszulka pod rozpiętą kurtką
    // kości: 0 tułów, 1-2 lewa noga, 3-4 prawa noga, 5-6 lewa ręka, 7-8 prawa ręka (jak dawne grupy stawów)
    const root=new THREE.Bone(), bones=[root]; const bone=(par,x,y,z,rz)=>{ const b=new THREE.Bone(); b.position.set(x,y,z); if(rz) b.rotation.z=rz; par.add(b); bones.push(b); return b; };
    const hL=bone(root,-hipW,.95,0), kL=bone(hL,0,-.45,0), hR=bone(root,hipW,.95,0), kR=bone(hR,0,-.45,0), chest=bone(root,0,1.0,0), sL=bone(chest,-sh,.44,0,-.08), eL=bone(sL,0,-.29,0), sR=bone(chest,sh,.44,0,.08), eR=bone(sR,0,-.29,0), head=bone(chest,0,.56,0);
    // kości: 0 biodra, 1-2 / 3-4 nogi, 5 klatka, 6-7 lewa ręka, 8-9 prawa ręka, 10 głowa
    p.add(root); p.updateMatrixWorld(true);
    const HC=[0,HY_H,-.006], hk=fem?.97:1, ak=fem?[.88,1,.88]:[1,1,1], lk=fem?[.93,1,.95]:[1,1,1];
    const W=(a,b,k)=>[a,b,k]; const ML=(x,y,rz)=>new THREE.Matrix4().makeRotationZ(rz||0).setPosition(x,y,0);
    const torsoW=(lx,ly)=>{ const ax=Math.abs(lx); const ws=sstep(.13,.2,ax)*sstep(1.33,1.42,ly)*.55; if(ws>0) return W(5,lx<0?6:8,ws); if(ly>1.49&&ax<.1) return W(5,10,sstep(1.5,1.6,ly)*.85);
      if(ly>.97) return W(0,5,sstep(.97,1.14,ly)); const wh=sstep(.04,.12,ax)*sstep(.99,.88,ly)*.35; return wh>0?W(0,lx<0?1:3,wh):W(0,0,0); };
    // „makijaż” w kolorach wierzchołków: rumieńce, cienie oczodołów, zarost u części mężczyzn, faktura tkanin i pasm włosów
    const hn=(x,y,z)=>{ const t=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453; return t-Math.floor(t); }, blush=new THREE.Color(0xc8786a), stub=new THREE.Color(shade(hair,.9)), seed=rnd(), stubble=!fem&&opt.stubble!==false&&rnd()<.35;
    const g2=(x,y,cx,cy,r)=>Math.exp(-((x-cx)**2+(y-cy)**2)/(r*r));
    const faceCF=(c,r,x,y,z)=>{ if(r!==0||z<.02)return; const dy=y-HY_H, ax=Math.abs(x); c.lerp(blush,.22*g2(ax,dy,.052,-.022,.026)*(fem?1.3:1)); c.multiplyScalar(1-.13*g2(ax,dy,.034,.014,.02));
      if(stubble&&dy<-.012&&!(dy>-.06&&ax<.02&&dy>-.065)) c.lerp(stub,.28*sstep(-.012,-.04,dy)); c.multiplyScalar(.97+.06*hn(x,y,z)); };
    const clothCF=(c,r,x,y,z)=>{ if(r===0)return; const k=r===7?.82+.3*hn(x*3,y*9,z*3):.95+.07*hn(x,y,z+seed); c.multiplyScalar(k); };
    const parts=[{name:`torso_${fem?'f':'m'}_${style}`,w:torsoW,cf:clothCF},{name:fem?'head_f':'head_m',w:(lx,ly)=>W(10,5,sstep(1.57,1.52,ly)*.5),cf:faceCF}]; if(hairStyle!=='bald') parts.push({name:'hair_'+hairStyle,s:[hk,hk,hk],c:HC,w:()=>W(10,10,0),cf:clothCF});
    [[-1,6,7,1,2],[1,8,9,3,4]].forEach(([sd,bs,be,bh,bk])=>{ const mir=sd<0;
      parts.push({name:'uarm',mirror:mir,s:ak,M:ML(sd*sh,1.44,sd*.08),w:(lx,ly)=>W(bs,be,sstep(-.24,-.31,ly)*.5)});
      parts.push({name:'farm',mirror:mir,s:ak,M:ML(sd*sh,1.44,sd*.08).multiply(ML(0,-.29)),w:(lx,ly)=>W(be,bs,sstep(-.005,.035,ly)*.5)});
      parts.push({name:'thigh',mirror:mir,s:lk,M:ML(sd*hipW,.95),w:(lx,ly)=>ly>-.2?W(bh,0,sstep(-.03,.03,ly)*.45):W(bh,bk,sstep(-.4,-.47,ly)*.5)});
      parts.push({name:'shin',mirror:mir,s:lk,M:ML(sd*hipW,.5),w:(lx,ly)=>W(bk,bh,sstep(-.005,.035,ly)*.5)}); });
    const body=new THREE.SkinnedMesh(humSkinGeo(parts,pal),humanSkinMat); body.castShadow=true; body.receiveShadow=false; p.add(body); body.bind(new THREE.Skeleton(bones));
    if(!opt.exact){ const h=R(.95,1.04), w=R(.95,1.1); p.scale.set(w,h,w); }
    p.userData={lL:hL,lR:hR,aL:sL,aR:sR,kL,kR,eL,eR,body,root,chest,head,idle:{ph:rnd()*20,look:0,lookP:0,tgt:0,tgtP:0,next:R(1,4),amt:0}}; PEOPLE.push(p); return p; }
  const PEOPLE=[];
  // ruch w spoczynku: oddech (klatka), rozglądanie się (głowa), przenoszenie ciężaru z nogi na nogę; przy chodzie przeciwskręt barków
  const _pw=new THREE.Vector3();
  function peopleIdle(dt){ const cx=camera.position.x, cz=camera.position.z;
    for(const p of PEOPLE){ const u=p.userData, I=u.idle; if(!I||!u.head||!p.visible||!p.parent)continue; p.getWorldPosition(_pw); if((_pw.x-cx)**2+(_pw.z-cz)**2>4900)continue;
      const t=tAll+I.ph, still=I.amt<.08, b=Math.sin(t*1.45);
      u.chest.position.y=1.0+.0045*b; u.chest.rotation.x=-.012*b+(still?0:.05*I.amt);
      I.next-=dt; if(I.next<=0){ I.next=R(1.8,5.5); I.tgt=rnd()<.35?0:R(-.7,.7)*(still?1:.45); I.tgtP=R(-.12,.15); }
      const k=Math.min(1,dt*2.2); I.look+=(I.tgt-I.look)*k; I.lookP+=(I.tgtP-I.lookP)*k; u.head.rotation.y=I.look; u.head.rotation.x=I.lookP; if(still) u.chest.rotation.y=I.look*.18;
      const straight=Math.abs(u.lL.rotation.x)<.06&&Math.abs(u.lR.rotation.x)<.06&&Math.abs(u.kL.rotation.x)<.25&&Math.abs(u.kR.rotation.x)<.25;
      if(still&&straight){ const w=Math.sin(t*.42); u.root.rotation.z=.014*w; u.root.rotation.x=.006*Math.sin(t*.31); u.kL.rotation.x=.05*Math.max(0,w); u.kR.rotation.x=.05*Math.max(0,-w);
        if(Math.abs(u.aL.rotation.x)<.12&&Math.abs(u.aR.rotation.x)<.12){ u.aL.rotation.x=.035*Math.sin(t*.9); u.aR.rotation.x=.035*Math.sin(t*.9+1.3); u.aL.rotation.z=-.08-.012*(1+b); u.aR.rotation.z=.08+.012*(1+b); } }
      else { u.root.rotation.z*=.9; u.root.rotation.x*=.9; }
      I.amt*=.9; } }
  const HY_H=1.665;
  function makePersonOld(top,bottom,hair,opt){ opt=opt||{}; const p=new THREE.Group();
    const fem=opt.female!==undefined?opt.female:rnd()<.45, skin=opt.skin||pick(SKINS), style=opt.style||pick(fem?['jacket','tee','coat','hoodie']:['jacket','tee','hoodie','coat','jacket']);
    const hairStyle=opt.hairStyle||(fem?pick(['long','pony','bob','long']):pick(['short','short','buzz','cap','bald','short'])), shoe=opt.shoe||pick([0x1c1c1c,0x2a2420,0xe8e8e4,0x3a2c22,0x22252a]);
    const sh=fem?.185:.215, hipW=fem?.105:.095, chest=fem?.165:.19;
    const B=[]; // tułów (statyczny)
    // miednica i pas
    B.push([G_(SPH,hipW+.075,.12,.12,0,.97,0),bottom]); B.push([G_(CYL(1,1,1,14),.168+(fem?.01:0),.05,.115,0,1.05,0),shade(bottom,.55)]);
    // tułów: talia → klatka → barki (elipsa w przekroju)
    const torsoTop=style==='coat'?top:top;
    B.push([G_(CYL(chest,.155,.42,16),1,1,.62,0,1.28,0),torsoTop]);
    B.push([G_(SPH,chest+.005,.1,.12,0,1.47,0),torsoTop]);
    if(fem) B.push([G_(SPH,.075,.07,.07,-.07,1.36,.08),torsoTop],[G_(SPH,.075,.07,.07,.07,1.36,.08),torsoTop]);
    [-1,1].forEach(s=>B.push([G_(SPH,.07,.065,.075,s*(sh-.01),1.45,0),torsoTop]));
    if(style==='coat'){ B.push([G_(CYL(.17,.21,.42,16),1,1,.7,0,.86,0),top]); B.push([G_(new THREE.BoxGeometry(.03,.6,.01),1,1,1,0,1.12,.12),shade(top,.6)]); }
    if(style==='hoodie'){ B.push([G_(SPH,.13,.09,.07,0,1.52,-.1),shade(top,.9)]); B.push([G_(new THREE.BoxGeometry(.22,.11,.02),1,1,1,0,1.12,.11),shade(top,.85)]); }
    if(style==='jacket'){ B.push([G_(new THREE.BoxGeometry(.012,.4,.01),1,1,1,0,1.28,.12),0xb0b0b0]); B.push([G_(CYL(.07,.085,.06,12),1,1,1,0,1.53,0),shade(top,.85)]); }
    if(style==='tee'){ B.push([G_(SPH,.06,.02,.05,0,1.5,.07),skin]); }
    // szyja i głowa
    B.push([G_(CYL(.048,.055,.12,10),1,1,1,0,1.55,0),skin]);
    const HY=1.665; B.push([G_(SPH,.098,.118,.108,0,HY,0),skin]); B.push([G_(SPH,.078,.06,.085,0,HY-.06,.016),skin]);
    B.push([G_(new THREE.ConeGeometry(.018,.05,6),1,1,1,0,HY-.01,.112,Math.PI/2.3),shade(skin,.95)]);
    [-1,1].forEach(s=>{ B.push([G_(SPHs,.016,.03,.012,s*.098,HY,-.005),shade(skin,.92)]); B.push([G_(SPHs,.016,.011,.008,s*.036,HY+.017,.095),0xf4f2ee]); B.push([G_(SPHs,.008,.008,.006,s*.036,HY+.017,.101),0x2a2018]); B.push([G_(new THREE.BoxGeometry(.04,.008,.01),1,1,1,s*.036,HY+.045,.098),shade(hair,.9)]); });
    B.push([G_(new THREE.BoxGeometry(.04,.007,.01),1,1,1,0,HY-.055,.098),0x9c5a52]);
    // włosy
    if(hairStyle!=='bald'){ const hc=hair; const cap=new THREE.SphereGeometry(1,16,10,0,Math.PI*2,0,Math.PI*.5);
      if(hairStyle==='buzz') B.push([G_(cap,.102,.122,.112,0,HY+.01,-.008,-.4),shade(hc,1.1)]);
      else if(hairStyle==='cap'){ B.push([G_(cap,.108,.1,.116,0,HY+.03,-.004),pick([0xb3262b,0x1e2a44,0x222222,0x2f6b3a])]); B.push([G_(CYL(.1,.1,.012,14),1,1,.9,0,HY+.035,.1),0x161616]); B.push([G_(SPH,.098,.07,.06,0,HY-.01,-.05),hc]); }
      else { B.push([G_(cap,.107,.13,.118,0,HY+.012,-.01,-.42),hc]); B.push([G_(SPH,.1,.085,.07,0,HY-.02,-.045),hc]);
        if(hairStyle==='long') B.push([G_(SPH,.11,.2,.07,0,HY-.13,-.06),hc]);
        if(hairStyle==='bob') B.push([G_(SPH,.112,.1,.1,0,HY-.06,-.03),hc]);
        if(hairStyle==='pony') B.push([G_(SPH,.04,.14,.04,0,HY-.12,-.13,.3),hc]); } }
    const body=new THREE.Mesh(mergeParts(B),humanMat); body.castShadow=true; p.add(body);
    // ręce: ramię → łokieć → przedramię + dłoń
    const longSl=style!=='tee'; const arm=(s)=>{ const sp=new THREE.Group(); sp.position.set(s*sh,1.44,0); sp.rotation.z=s*.08;
      const ua=new THREE.Mesh(mergeParts([[G_(CYL(.056,.046,.3,10),1,1,1,0,-.15,0),top]]),humanMat); sp.add(ua);
      const el=new THREE.Group(); el.position.y=-.29; sp.add(el);
      const fa=new THREE.Mesh(mergeParts([[G_(CYL(.045,.034,.25,10),1,1,1,0,-.125,0),longSl?top:skin],[G_(SPH,.045,.045,.045,0,0,0),longSl?top:skin],[G_(SPH,.028,.07,.045,0,-.29,.008),skin],[G_(SPHs,.014,.035,.014,0,-.27,.04),skin]]),humanMat); el.add(fa);
      ua.castShadow=fa.castShadow=true; return {sp,el}; };
    const L=arm(-1), Rr=arm(1);
    // nogi: biodro → kolano → łydka + but
    const leg=(s)=>{ const hp=new THREE.Group(); hp.position.set(s*hipW,.95,0);
      const th=new THREE.Mesh(mergeParts([[G_(CYL(.08,.062,.46,12),1,1,1,0,-.23,0),style==='coat'&&fem?shade(bottom,.95):bottom]]),humanMat); hp.add(th);
      const kn=new THREE.Group(); kn.position.y=-.45; hp.add(kn);
      const sh2=new THREE.Mesh(mergeParts([[G_(CYL(.058,.044,.43,12),1,1,1,0,-.215,0),bottom],[G_(SPH,.058,.05,.058,0,0,0),bottom],[G_(SPH,.055,.045,.13,0,-.455,.045),shoe],[G_(new THREE.BoxGeometry(.11,.025,.25),1,1,1,0,-.49,.04),shade(shoe,.6)]]),humanMat); kn.add(sh2);
      th.castShadow=sh2.castShadow=true; return {hp,kn}; };
    const LL=leg(-1), LR=leg(1);
    p.add(L.sp,Rr.sp,LL.hp,LR.hp);
    p.userData={lL:LL.hp,lR:LR.hp,aL:L.sp,aR:Rr.sp,kL:LL.kn,kR:LR.kn,eL:L.el,eR:Rr.el,body}; return p; }
  const glassMat=new THREE.MeshPhongMaterial({color:0x1b2630,shininess:120,specular:0x99aabb}); if(glassMat.roughness!==undefined){ glassMat.roughness=.06; glassMat.envMapIntensity=1.6; }
  const headM=new THREE.MeshLambertMaterial({color:0xfff6dd,emissive:0x000000}), tailM=new THREE.MeshLambertMaterial({color:0x8a1010,emissive:0x220000});
  const CARCOL=[0xb3262b,0x2a4b8d,0xdedede,0x1d1d1f,0x8a8f96,0x3d6b3a,0xc9a227,0x5c6a78,0xe8e6df,0x6b1f2a,0x2f5d7c,0xa45a2a];
  /* ---------- samochody: zaokrąglona karoseria z profilu, szyby, felgi ---------- */
  const carPaintGeo={}, carDetGeo={}, carLightGeo={}; let wheelGeoHD=null;
  const carDetMat=(()=>{ const m=new THREE.MeshPhongMaterial({vertexColors:true,shininess:110,specular:0x8899aa}); if(m.roughness!==undefined){ m.roughness=.32; m.envMapIntensity=1.1; } return m; })(), carLightMat=new THREE.MeshBasicMaterial({vertexColors:true});
  function profileGeo(pts,depth,bevel){ const s=new THREE.Shape(); s.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++){ const q=pts[i]; if(q.length===4) s.quadraticCurveTo(q[0],q[1],q[2],q[3]); else s.lineTo(q[0],q[1]); } s.closePath();
    const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:8}); g.translate(0,0,-depth/2); g.computeVertexNormals(); return g; }
  function carGeos(type){ if(carPaintGeo[type])return; const van=type==='van', pas=type==='passat';
    let body, green, roof, L;
    if(pas){ L=4.67;   // VW Passat B5 FL sedan: długi bagażnik, chromowany grill, okrągłe tylne lampy
      body=profileGeo([[-2.3,.32],[2.25,.32],[2.35,.5,2.34,.62],[2.3,.76],[2.2,.82,1.7,.88],[.9,.96],[-1.7,.98],[-2.2,.97,-2.33,.82],[-2.37,.6,-2.3,.32]],1.62,.08);
      green=profileGeo([[.88,.94],[.2,1.38],[.12,1.42,0,1.43],[-1.0,1.43],[-1.15,1.42,-1.25,1.36],[-1.68,.96]],1.48,.04);
      roof=profileGeo([[.2,1.36],[.12,1.43,0,1.44],[-1.0,1.44],[-1.16,1.43,-1.26,1.37]],1.44,.04); }
    else if(!van){ L=4.3;
      body=profileGeo([[-2.12,.34],[2.06,.34],[2.16,.5,2.15,.62],[2.12,.74],[2.0,.8,1.6,.86],[.95,.93],[-1.55,.95],[-2.0,.93,-2.12,.78],[-2.16,.6,-2.12,.34]],1.62,.08);
      green=profileGeo([[.95,.9],[.28,1.36],[.2,1.39,.1,1.4],[-1.05,1.4],[-1.2,1.39,-1.3,1.33],[-1.78,.94]],1.48,.04);
      roof=profileGeo([[.3,1.37],[.22,1.43,.1,1.44],[-1.06,1.44],[-1.22,1.43,-1.3,1.37]],1.44,.04); }
    else { L=5;
      body=profileGeo([[-2.45,.38],[2.4,.38],[2.52,.55,2.5,.7],[2.42,.95],[2.0,1.05],[1.4,1.85],[1.25,2.05,.95,2.1],[-2.3,2.1],[-2.48,2.05,-2.48,1.85],[-2.5,.5,-2.45,.38]],1.74,.06);
      green=profileGeo([[1.95,1.1],[1.38,1.85],[1.2,1.95],[1.0,1.95],[1.05,1.1]],1.78,.02); roof=null; }
    const paintParts=[[body,0xffffff]]; if(roof) paintParts.push([roof,0xffffff]);
    // słupki B
    if(!van) [-1,1].forEach(s=>paintParts.push([G_(new THREE.BoxGeometry(.1,.46,.03),1,1,1,-.4,1.15,s*.76),0xffffff]));
    carPaintGeo[type]=mergeParts(paintParts);
    const D=[]; const HL=L/2;
    D.push([green,0x18222b]);
    if(van) [-1,1].forEach(s=>D.push([G_(new THREE.BoxGeometry(1.1,.5,.02),1,1,1,.45,1.55,s*.905),0x18222b]));
    // zderzaki, grill, tablice, lusterka, nadkola
    D.push([G_(new THREE.BoxGeometry(.16,.2,1.66),1,1,1,HL+.03,.44,0),0x2a2c2f],[G_(new THREE.BoxGeometry(.16,.2,1.66),1,1,1,-HL-.03,.46,0),0x2a2c2f]);
    D.push([G_(new THREE.BoxGeometry(.04,.14,.7),1,1,1,HL+.09,.66,0),0x111315]);
    D.push([G_(new THREE.BoxGeometry(.02,.11,.48),1,1,1,HL+.12,.44,0),0xf2f2ee],[G_(new THREE.BoxGeometry(.02,.11,.48),1,1,1,-HL-.12,.5,0),0xf2f2ee]);
    D.push([G_(new THREE.BoxGeometry(.015,.09,.08),1,1,1,HL+.13,.44,-.2),0x1d3f9a],[G_(new THREE.BoxGeometry(.015,.09,.08),1,1,1,-HL-.13,.5,-.2),0x1d3f9a]);
    [-1,1].forEach(s=>D.push([G_(SPHs,.09,.06,.05,van?1.5:.85,van?1.25:1.0,s*.93),0x222426]));
    D.push([G_(new THREE.BoxGeometry(L*.86,.035,.012),1,1,1,0,.42,.9),0x1a1a1a],[G_(new THREE.BoxGeometry(L*.86,.035,.012),1,1,1,0,.42,-.9),0x1a1a1a]);
    [-1,1].forEach(s=>D.push([G_(new THREE.BoxGeometry(.12,.025,.012),1,1,1,van?.4:.1,.88,s*.9),0x9a9a9a],[G_(new THREE.BoxGeometry(.12,.025,.012),1,1,1,-.75,.88,s*.9),0x9a9a9a]));
    if(pas){ const ch=0xc9ced2; D.push([G_(new THREE.BoxGeometry(.03,.2,.82),1,1,1,HL+.07,.68,0),ch]);
      for(let k=0;k<5;k++) D.push([G_(new THREE.BoxGeometry(.035,.018,.74),1,1,1,HL+.1,.6+k*.04,0),0x15171a]);
      D.push([G_(new THREE.CylinderGeometry(.06,.06,.02,16).rotateZ(Math.PI/2),1,1,1,HL+.115,.69,0),0x1d3f9a]);
      D.push([G_(new THREE.BoxGeometry(.04,.07,.9),1,1,1,HL+.1,.43,0),0x15171a]);
      [-1,1].forEach(sd=>{ D.push([G_(new THREE.BoxGeometry(L*.62,.025,.012),1,1,1,0,.66,sd*.905),ch]); D.push([G_(new THREE.BoxGeometry(L*.8,.05,.012),1,1,1,0,.38,sd*.905),0x15171a]); D.push([G_(new THREE.CylinderGeometry(.035,.035,.03,10).rotateZ(Math.PI/2),1,1,1,HL+.1,.43,sd*.36),0xfff4d8]); });
      D.push([G_(new THREE.BoxGeometry(.03,.03,.5),1,1,1,-HL-.12,.78,0),ch]); D.push([G_(new THREE.BoxGeometry(.03,.06,.2),1,1,1,-HL-.12,.7,0),0x1a1a1a]); }
    carDetGeo[type]=mergeParts(D);
    const Lg=[]; [-1,1].forEach(s=>{ Lg.push([G_(SPHs,.05,.075,.17,HL+.06,.72,s*.6),0xfff4d8]); Lg.push([G_(new THREE.BoxGeometry(.05,.13,.3),1,1,1,-HL-.05,van?.95:.76,s*.62),0xb0151a]); Lg.push([G_(new THREE.BoxGeometry(.052,.04,.3),1,1,1,-HL-.05,van?.86:.68,s*.62),0xe08a20]); });
    carLightGeo[type]=mergeParts(Lg);
    if(!wheelGeoHD){ const tire=new THREE.CylinderGeometry(.34,.34,.24,20).rotateX(Math.PI/2); const side=new THREE.TorusGeometry(.3,.045,6,20); const rim=new THREE.CylinderGeometry(.21,.21,.02,16).rotateX(Math.PI/2);
      const W=[[tire,0x151515],[G_(side,1,1,1,0,0,.11),0x1c1c1c],[G_(side,1,1,1,0,0,-.11),0x1c1c1c],[G_(rim,1,1,1,0,0,.122),0xb9bec4],[G_(rim,1,1,1,0,0,-.122),0xb9bec4],[G_(new THREE.CylinderGeometry(.06,.06,.03,10).rotateX(Math.PI/2),1,1,1,0,0,.13),0x6a6e72]];
      for(let k=0;k<5;k++){ const a=k*Math.PI*2/5; [.126,-.126].forEach(z=>W.push([G_(new THREE.BoxGeometry(.05,.19,.012),1,1,1,Math.sin(a)*.1,Math.cos(a)*.1,z,0,0,-a),0x8d9399])); }
      wheelGeoHD=mergeParts(W); } }
  function makeCar(color,type){ type=type==='van'?'van':type==='passat'?'passat':'car'; carGeos(type); const gC=new THREE.Group(); const van=type==='van', L=van?5:type==='passat'?4.67:4.3;
    const paint=new THREE.MeshPhongMaterial({color,shininess:95,specular:0x9a9a9a,vertexColors:true}); if(paint.roughness!==undefined){ paint.roughness=.24; paint.metalness=.45; paint.envMapIntensity=1.25; }
    const body=new THREE.Mesh(carPaintGeo[type],paint); gC.add(body); gC.add(new THREE.Mesh(carDetGeo[type],carDetMat)); gC.add(new THREE.Mesh(carLightGeo[type],carLightMat));
    const wheels=[]; [[L/2-.85,.8],[L/2-.85,-.8],[-L/2+.8,.8],[-L/2+.8,-.8]].forEach(([x,z])=>{ const w=new THREE.Mesh(wheelGeoHD,carDetMat); w.position.set(x,.35,z); gC.add(w); wheels.push(w); });
    gC.traverse(o=>{ if(o.isMesh)o.castShadow=true; }); gC.userData.wheels=wheels; return gC; }
  // ustawienie auta na pochyłym terenie
  function seatCar(g,x,z,h,yo){ const fx=Math.cos(h),fz=Math.sin(h); const hf=H(x+fx*1.6,z+fz*1.6), hb=H(x-fx*1.6,z-fz*1.6), hl=H(x+fz*.9,z-fx*.9), hr=H(x-fz*.9,z+fx*.9);
    g.position.set(x,(hf+hb+hl+hr)/4+(yo||0),z); g.rotation.set(0,0,0); g.rotateY(-h); g.rotateZ(Math.atan2(hf-hb,3.2)); g.rotateX(Math.atan2(hl-hr,1.8)); return (hf-hb)/3.2; }
  const cars=[];
  const TOUCHD=matchMedia('(pointer:coarse)').matches; const TRAFFIC_N=TOUCHD?10:18; for(let i=0;i<TRAFFIC_N;i++){ const gC=makeCar(CARCOL[i%CARCOL.length],i%4===3?'van':''); scene.add(gC); cars.push({g:gC,d:R(0,DK.L),dir:i%2?1:-1,v:R(13,19),x:0,z:0}); }
  ['Spacerowa','Zagrodowa','Stodulskiego','Północna','Traktorowa','Parkowa','Zielona','Szkolna','Kolejowa','Dojazdowa','Polna','Sikorskiego'].forEach((nm,i)=>{ const rs=ROADS.filter(r=>r.n===nm&&r.t!=='track'&&r.L>70).sort((a,b)=>b.L-a.L)[0]; if(!rs) return; for(let k=0;k<(TOUCHD?1:2);k++){ const gC=makeCar(CARCOL[(i*2+k)%CARCOL.length],(i+k)%5===4?'van':''); scene.add(gC); cars.push({g:gC,r:rs,d:R(6,rs.L-6),dir:(i+k)%2?1:-1,v:R(5.5,8.5),x:0,z:0}); } });
  const parked=[];
  const DIMS={bus:[12,2.6],tractor:[4.2,2.2],moto:[2.1,.8],bike:[1.8,.6],fire:[7.4,2.5],van:[5,1.95],cop:[4.4,1.9]};
  const dimsOf=c=>c&&(c.L?[c.L,c.W]:DIMS[c.kind]||[4.4,1.9]);
  function obb(a,b,m){ const dx=b.x-a.x, dz=b.z-a.z; for(const ang of [a.h,a.h+Math.PI/2,b.h,b.h+Math.PI/2]){ const ax=Math.cos(ang), az=Math.sin(ang); const d=Math.abs(dx*ax+dz*az);
      const ra=a.L/2*Math.abs(Math.cos(a.h-ang))+a.W/2*Math.abs(Math.sin(a.h-ang)), rb=b.L/2*Math.abs(Math.cos(b.h-ang))+b.W/2*Math.abs(Math.sin(b.h-ang)); if(d>ra+rb+(m||0))return false; } return true; }
  const box=(c,x,z,h)=>{ const [L,W]=dimsOf(c); return {x:x??c.x,z:z??c.z,h:h??c.h,L,W}; };
  function park(x,z,h,van,spec){ const fx=Math.cos(h),fz=Math.sin(h); for(const k of [-1.7,0,1.7]){ if(blocked(x+fx*k,z+fz*k,1.0))return false; } if(ROADS.some(r=>r.t!=='track'&&roadDist(r,x,z)<r.w/2+1.2))return false;
    const L=van?5:spec?4.67:4.4, me={x,z,h,L,W:1.95}; if(parked.some(p=>Math.abs(p.x-x)<14&&Math.abs(p.z-z)<14&&obb(me,box(p),.4)))return false;
    const c={g:spec?spec.g:makeCar(pick(CARCOL),van?'van':''),x,z,h,v:0,steer:0,L,W:1.95,kind:van?'van':'car'}; if(spec&&spec.name)c.name=spec.name; c.k0=Math.round(x)+','+Math.round(z); seatCar(c.g,x,z,h); scene.add(c.g); parked.push(c); if(spec){ PASSAT=c; c.cap=62; c.ftype='pb95'; c.fuel=8; c.lowWarn=false; } return true; }
  // --- szkoła: trzecie wejście od strony dziedzińca, chodnik na dziedzińcu, ścieżki na halę i do Szkolnej; altanka ze ścieżką ---
  let SCHOOL_DOOR3=null;
  { const PA=[-150,-70], PB=[-142,-73], dl=Math.hypot(PB[0]-PA[0],PB[1]-PA[1]); let nx=(PB[1]-PA[1])/dl, nz=-(PB[0]-PA[0])/dl; if(nz>0){ nx=-nx; nz=-nz; }
    const d0=[-146.5,-71.8]; const dg=new THREE.Group(); dg.position.set(d0[0],H(d0[0],d0[1]),d0[1]); dg.rotation.y=Math.atan2(nx,nz); scene.add(dg);
    const frm=new THREE.MeshLambertMaterial({color:0x4a2f22}), gls=new THREE.MeshLambertMaterial({color:0x27333d}), cn=new THREE.MeshLambertMaterial({color:0x6b3a26}), stp=new THREE.MeshLambertMaterial({color:0x9a968c,map:detailTex});
    bx(dg,2.1,2.5,.12,0,0,0,frm); [-.52,.52].forEach(o=>bx(dg,.92,2.2,.05,o,.05,.07,gls)); bx(dg,.05,2.3,.07,0,.05,.09,frm);
    bx(dg,3.4,.14,1.8,0,2.75,.9,cn); [-1.5,1.5].forEach(o=>bx(dg,.1,2.75,.1,o,0,1.65,frm)); bx(dg,3.0,.18,1.2,0,0,.6,stp); bx(dg,2.6,.18,.5,0,.0,1.45,stp);
    SCHOOL_DOOR3={p:[d0[0],d0[1]],n:[nx,nz]};
    // chodnik z kostki na dziedzińcu (wskazane wierzchołki)
    const yard=[[-153,-72],[-164,-92],[-124,-103],[-122,-91]]; drape(yard,matPaver,.13,2.2,true); LOTS.push(yard);
    // ścieżki: z drzwi na halę i do chodnika przy Szkolnej (dalej Szkolną do Wyzwolenia)
    const out=[d0[0]+nx*2.2,d0[1]+nz*2.2];
    [[out,[-158,-80],[-164,-79]],[out,[-134,-90],[-122,-93]]].forEach(pt=>{ const pm=new THREE.Mesh(ribbon(pt,2.4,.13,2.2),matPaver); pm.receiveShadow=true; scene.add(pm); });
    // altanka (ośmiokątna, drewno + dach z gontu) przy x -233 z -17, ścieżka od bramki szkoły
    const AX=-233, AZ=-17, ag=new THREE.Group(); ag.position.set(AX,H(AX,AZ),AZ); scene.add(ag); const R0=2.0, tim=new THREE.MeshLambertMaterial({color:0xb4642a}), timD=new THREE.MeshLambertMaterial({color:0x9a5222}), sh=new THREE.MeshLambertMaterial({color:0x4a2f26,map:detailTex});
    const fl=new THREE.Mesh(new THREE.CylinderGeometry(R0+.4,R0+.45,.14,8),new THREE.MeshLambertMaterial({color:0xc9c4ba,map:texPaver})); fl.position.y=.07; fl.receiveShadow=true; ag.add(fl);
    for(let k=0;k<8;k++){ const an=k/8*Math.PI*2+Math.PI/8, x=Math.cos(an)*R0, z=Math.sin(an)*R0; bx(ag,.16,2.3,.16,x,.14,z,tim); addSolid({x:AX+x,z:AZ+z,hw:.12,hd:.12,c:1,s:0,r:.3});
      const x2=Math.cos(an+Math.PI/8*2)*R0, z2=Math.sin(an+Math.PI/8*2)*R0; if(k!==2){ const m=new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(x2-x,z2-z),.07,.05),timD); m.position.set((x+x2)/2,1.0,(z+z2)/2); m.rotation.y=-Math.atan2(z2-z,x2-x); ag.add(m); const m2=m.clone(); m2.position.y=.45; ag.add(m2); } }
    const roof=new THREE.Mesh(new THREE.ConeGeometry(R0*1.4,1.5,8),sh); roof.position.y=2.44+.75; roof.rotation.y=Math.PI/8; roof.castShadow=true; ag.add(roof); bx(ag,.18,.5,.18,0,3.9,0,timD);
    const pth=[[-183.3,-29.2],[-205,-24],[AX+R0+.4,AZ-.5]]; const pmA=new THREE.Mesh(ribbon(pth,1.8,.13,2.2),matPaver); pmA.receiveShadow=true; scene.add(pmA);
    const bn=new THREE.Mesh(new THREE.BoxGeometry(1.6,.08,.4),timD); bn.position.set(0,.5,-R0+.45); ag.add(bn);
  }
  let PASSAT=null;
  // --- alejka do szkoły (Zacisze): parking z kostki po prawej, drugie wejście do szkoły od strony bramy + 2 auta ---
  { const GP=[-183.3,-29.2]; const sb=BLD.reduce((q,b)=>Math.hypot(b.x+189,b.z+45)<Math.hypot(q.x+189,q.z+45)?b:q,BLD[0]);
    if(Math.hypot(sb.x+189,sb.z+45)<8){ const c=Math.cos(sb.a), sn=Math.sin(sb.a), xh=[c,sn], zh=[-sn,c]; let sg=((GP[0]-sb.x)*xh[0]+(GP[1]-sb.z)*xh[1])>0?1:-1; const nrm=[xh[0]*sg,xh[1]*sg];
      const t0=(GP[0]-sb.x)*zh[0]+(GP[1]-sb.z)*zh[1]; const W=(u,v)=>[sb.x+nrm[0]*(sb.w/2+u)+zh[0]*(t0+v), sb.z+nrm[1]*(sb.w/2+u)+zh[1]*(t0+v)];
      const pad=[[.2,-13],[6.2,-13],[6.2,13],[.2,13]].map(([u,v])=>W(u,v)); drape(pad,matPaver,.13,2.2,true);
      const pth=[W(6,0),[GP[0],GP[1]]]; const pm=new THREE.Mesh(ribbon(pth,3,.13,2.2),matPaver); pm.receiveShadow=true; scene.add(pm);
      // drzwi dwuskrzydłowe z daszkiem i schodkami
      const d0=W(.04,0), dg=new THREE.Group(); dg.position.set(d0[0],H(d0[0],d0[1]),d0[1]); dg.rotation.y=Math.atan2(nrm[0],nrm[1]); scene.add(dg);
      const frm=new THREE.MeshLambertMaterial({color:0x4a2f22}), gls=new THREE.MeshLambertMaterial({color:0x27333d}), cn=new THREE.MeshLambertMaterial({color:0x6b3a26}), stp=new THREE.MeshLambertMaterial({color:0x9a968c,map:detailTex});
      bx(dg,2.1,2.5,.12,0,0,0,frm); [-.52,.52].forEach(o=>bx(dg,.92,2.2,.05,o,.05,.07,gls)); bx(dg,.05,2.3,.07,0,.05,.09,frm);
      bx(dg,3.4,.14,1.8,0,2.75,.9,cn); [-1.5,1.5].forEach(o=>bx(dg,.1,2.75,.1,o,0,1.65,frm)); bx(dg,3.0,.18,1.2,0,0,.6,stp); bx(dg,2.6,.18,.5,0,.0,1.45,stp);
      SCHOOL_DOOR2={p:[d0[0],d0[1]],n:[nrm[0],nrm[1]]};
      const hh=Math.atan2(zh[1],zh[0]); [[-9,0xb8bcc2],[8.5,0x2c3e55]].forEach(([v,col])=>{ const q=W(3.6,v); const car=makeCar(col,'car'); seatCar(car,q[0],q[1],hh+(v<0?0:Math.PI)); scene.add(car); const cc=Math.cos(hh), ss=Math.sin(hh); addSolid({x:q[0],z:q[1],hw:2.2,hd:.95,c:cc,s:ss,r:2.5}); });
    }
    // parking z kostki po prawej stronie alejki (jak na zdjęciu) - przy asfalcie, od bramy w stronę Wyzwolenia
    const AL=[-182,-26], BL=[-161,99], ul=Math.hypot(BL[0]-AL[0],BL[1]-AL[1]), ux=(BL[0]-AL[0])/ul, uz=(BL[1]-AL[1])/ul, ex=uz, ez=-ux;
    const strip=[[5,5.6],[5,38]].map(([t,o])=>0); const sp=[]; for(let t=6;t<=40;t+=4) sp.push([AL[0]+ux*t+ex*3.9, AL[1]+uz*t+ez*3.9]);
    if(!sp.some(q=>blocked(q[0],q[1],.5,true))){ const sm=new THREE.Mesh(ribbon(sp,3.6,.13,2.2),matPaver); sm.receiveShadow=true; scene.add(sm); }
  }
  /* szary VW Passat B5 FL 2.0 benzyna, sedan, tablica EPJ 03338 */
  function makePassat(){ const g=makeCar(0x6f7378,'passat'); const cv=document.createElement('canvas'); cv.width=256; cv.height=64; const x=cv.getContext('2d'); x.fillStyle='#f4f4f0'; x.fillRect(0,0,256,64); x.fillStyle='#1f4fa3'; x.fillRect(0,0,26,64); x.fillStyle='#fff'; x.font='700 14px Arial'; x.textAlign='center'; x.fillText('PL',13,56); x.fillStyle='#111'; x.font='700 44px "Barlow Condensed", Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('EPJ 03338',143,34); x.strokeStyle='#111'; x.lineWidth=3; x.strokeRect(1.5,1.5,253,61);
    const t=new THREE.CanvasTexture(cv); const pm=new THREE.MeshBasicMaterial({map:t}); const HL=2.335; [[HL+.13,Math.PI/2],[-HL-.14,-Math.PI/2]].forEach(([px,ry])=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(.52,.13),pm); m.position.set(px,px>0?.4:.6,0); m.rotation.y=ry; g.add(m); });
    return g; }
  DRIVE_SPOTS.forEach(sp=>{ if(rnd()<.45) return; if(!park(sp.x,sp.z,sp.h,rnd()<.1)){ const ok=park(sp.x-Math.cos(sp.h)*1.5,sp.z-Math.sin(sp.h)*1.5,sp.h); } });
  if(0)houses.filter(h=>h.kind==='house'&&!h.isPart).forEach(h=>{ if(rnd()>.28||parked.length>150)return; const nr=nearestRoad(h.x,h.z,r=>r.t!=='track'); if(!nr.r||nr.d>40)return; const a=nr.r.pts[nr.seg],b=nr.r.pts[nr.seg+1]; const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz); const tx=dx/L,tz=dz/L; let nx=-tz,nz=tx; const t=clamp((h.x-a[0])*tx+(h.z-a[1])*tz,0,L); const px=a[0]+tx*t,pz=a[1]+tz*t; if((h.x-px)*nx+(h.z-pz)*nz<0){nx=-nx;nz=-nz;}
    const off=nr.r.w/2+(SIDEWALK.has(nr.r.n)?6:3.6); park(px+nx*off+tx*R(4,8),pz+nz*off+tz*R(4,8),Math.atan2(nz,nx)+Math.PI); });
  LEW_SPOTS.forEach(sp=>{ if(!PASSAT&&park(sp.x,sp.z,sp.h,false,{g:makePassat(),name:'VW Passat B5 FL 2.0 (EPJ 03338)'}))return; if(rnd()<.4) return; park(sp.x,sp.z,sp.h); }); if(LEW_LOT.van) park(LEW_LOT.van.x,LEW_LOT.van.z,LEW_LOT.van.h,true);
  AREAS.filter(a=>a.t==='am:parking'&&!(LEW_LOT.poly&&(inPoly(...centroid(a.pts),LEW_LOT.poly)||a.pts.some(q=>inPoly(q[0],q[1],LEW_LOT.poly))))).forEach(a=>{ if(a===PLAC)return; const m=mar(a.pts); const ca=Math.cos(m.an), sa=Math.sin(m.an); let n=0; const rows=m.d>11?2:1;
    for(let r=0;r<rows;r++) for(let u=-m.w/2+1.8;u<=m.w/2-1.8&&n<8;u+=2.9){ const v=rows===2?(r?1:-1)*(m.d/2-2.6):0; const x=m.cx+u*ca-v*sa, z=m.cz+u*sa+v*ca; if(!inPoly(x,z,a.pts)||(((Math.sin(Math.round(x*7+z*3)*127.1+311.7)*43758.5453)%1+1)%1)<.62)continue; if(park(x,z,m.an+Math.PI/2+(r?Math.PI:0)))n++; } });
  { const zr=ROADS.find(r=>r.n==='Zielona'); const s=sampleLine(zr.pts,zr.len,150); park(s.x+s.tz*2,s.z-s.tx*2,Math.atan2(s.tz,s.tx)); }
  const trainPath=RAILS.find(p=>p[0][0]===-945)||RAILS[0], trainLen=lineLen(trainPath);
  const train=[]; for(let i=0;i<6;i++){ const t=new THREE.Mesh(new THREE.BoxGeometry(21,3.6,3).translate(0,2.3,0),new THREE.MeshPhongMaterial({color:i===0||i===5?0xd4202a:0xeef0f0,shininess:30})); const gT=new THREE.Group(); gT.add(t); gT.traverse(m=>m.castShadow=true); gT.visible=false; scene.add(gT); train.push(gT);
    // model z Blendera (tools/blender/pociagi.py): człony czołowe na obu końcach, pomiędzy środkowe
    swapIn(gT,i===0||i===5?'pociag_cab':'pociag_mid',[t],{after:m=>{ if(i===5) m.rotation.y=Math.PI; }}); }

  /* ---------- postacie ---------- */
  let player=makePerson(0x2b2f36,0x2c3e66,0x2a1d14,{female:false,style:'jacket',hairStyle:'short',skin:0xe6bb98,shoe:0xe8e8e4,exact:true}); scene.add(player);
  const peds=[]; const PCOL=[0xb33a3a,0x2f5d8a,0x3f6b3a,0xc9a24a,0x6b4c8a,0x3a3a3c,0xd8d6d0,0x8a5a2b,0x1f6a6a,0xc96b9a,0x23262b,0x7a6a58,0x4a5a3a,0x9a2f3a];
  (PARK.walks||[]).forEach((w,i)=>{ for(let k=0;k<(i<4?2:1);k++){ const L=w.len[w.len.length-1]; const p=makePerson(pick(PCOL),pick([0x2c3e66,0x3a4e7a,0x2a2a2c,0x5a4a3a,0x6a6a6a]),pick([0x2a1d14,0x4a2e1a,0x6b4426,0xb08a50,0x8a8a8a])); scene.add(p); peds.push({g:p,w,d:R(0,L),dir:rnd()<.5?1:-1,v:R(.8,1.2),walk:R(0,6),down:0}); } }); // spacerowicze w parku
  for(let i=0;i<(matchMedia('(pointer:coarse)').matches?70:105);i++){ const w=pick(WALKS); const L=w.len[w.len.length-1]; if(L<30){i--;continue;} const p=makePerson(pick(PCOL),pick([0x2c3e66,0x3a4e7a,0x2a2a2c,0x5a4a3a,0x6a6a6a,0x1e2a44,0x4a5a72,0xb8ac94]),pick([0x2a1d14,0x4a2e1a,0x6b4426,0xb08a50,0xd2b27a,0x111111,0x8a8a8a,0x7a3a1e])); scene.add(p); peds.push({g:p,w,d:R(0,L),dir:rnd()<.5?1:-1,v:R(1.1,1.6),walk:R(0,6),down:0}); }

  /* ---------- paczki ---------- */
  const cashGeo=new THREE.BoxGeometry(.7,.35,.45), cashMat=new THREE.MeshLambertMaterial({color:0x4fbf4a,emissive:0x1d5a1a});
  const pickups=[];
  // pieniądze na chodnikach: drobne kwoty (głównie 10-50 zł, czasem 100-150, rzadko zgubiony portfel 300 zł); co 90 s pojawia się nowy banknot (maks. 30 naraz)
  const cashVal=()=>{ const r=rnd(); return r<.6?pick([10,20,20,50]):r<.92?pick([50,100]):r<.985?150:300; };
  function spawnCash(){ const w=pick(WALKS); const L=w.len[w.len.length-1]; const s=sampleLine(w.pts,w.len,R(0,L)); const free=pickups.find(k=>k.got); const val=cashVal(); if(free){ free.x=s.x; free.z=s.z; free.y=H(s.x,s.z)+.9; free.val=val; free.got=false; free.m.position.set(s.x,free.y,s.z); free.m.visible=true; return; } const m=new THREE.Mesh(cashGeo,cashMat); const y=H(s.x,s.z)+.9; m.position.set(s.x,y,s.z); scene.add(m); pickups.push({m,x:s.x,z:s.z,y,val}); }
  for(let i=0;i<30;i++) spawnCash(); let cashT=0;

  /* ---------- stan gry ---------- */
  // punkt startu: ul. Szkolna (najbliżej kościoła, koło Lewiatana), kamera skierowana na kościół
  const SPAWN=(()=>{ const ch=centroid(CHURCH.pts); let best=null; ROADS.filter(r=>r.n==='Szkolna'&&r.t!=='track').forEach(r=>{ for(let d=0;d<r.L;d+=2){ const q=sampleLine(r.pts,r.len,d); if(ROADS.some(o=>o!==r&&o.t!=='track'&&o.n!=='Szkolna'&&roadDist(o,q.x,q.z)<o.w/2+14))continue; const dd=Math.hypot(q.x-ch[0],q.z-ch[1]); if(!best||dd<best.dd) best={q,dd,r}; } }); const sc=[2*best.q.x-ch[0],2*best.q.z-ch[1]]; /* chodnik po stronie przeciwnej do kościoła - widok przez ulicę */
    if(!best){ const zel=ROADS.find(r=>r.n==='Zielona'); const q=sampleLine(zel.pts,zel.len,95); return {x:q.x,z:q.z,yaw:Math.atan2(q.tx,q.tz)}; }
    const q=best.q, o=best.r.w/2+1.35; let nx=-q.tz, nz=q.tx; if((sc[0]-q.x)*nx+(sc[1]-q.z)*nz<0){ nx=-nx; nz=-nz; } let x=q.x+nx*o, z=q.z+nz*o; if(blocked(x,z,.5)){ x=q.x+nx*(best.r.w/4); z=q.z+nz*(best.r.w/4); }
    return {x,z,yaw:Math.atan2(x-ch[0],z-ch[1])}; })();
  // ostatnia pozycja z poprzedniej sesji (localStorage) - tylko gdy to wolne miejsce na zewnątrz
  const LASTPOS=(()=>{ try{ const v=JSON.parse(localStorage.getItem('trebaczew-gra')||'null'); if(v&&isFinite(v.px)&&isFinite(v.pz)&&Math.abs(v.px)<2000&&Math.abs(v.pz)<2000&&!blocked(v.px,v.pz,.5)) return {x:+v.px,z:+v.pz,yaw:isFinite(v.pyaw)?+v.pyaw:SPAWN.yaw}; }catch(e){} return null; })();
  if(LASTPOS&&saved.x===undefined){ saved={...saved,x:LASTPOS.x,z:LASTPOS.z,yaw:LASTPOS.yaw}; }
  const st={x:saved.x??SPAWN.x, z:saved.z??SPAWN.z, yaw:saved.yaw??SPAWN.yaw, pitch:0.22, dist:6.5, mode:saved.mode??0, night:!!saved.night, face:saved.yaw===undefined?SPAWN.yaw+Math.PI:0, walk:0, run:false,
    money:saved.money??0, hp:100, wanted:0, wantedT:0, car:null, lastDrag:-9};
  st.face=st.yaw+Math.PI;
  const MODES=['za postacią','pierwsza osoba','z lotu ptaka'];
  let tAll=0, shake=0;

  /* ---------- sterowanie ---------- */
  const keys=new Set();
  const GAME={paused:true,started:false}; const IS_TOUCH=matchMedia('(pointer:coarse)').matches; let SENS=1;
  const KEY_DEF={w:'KeyW',s:'KeyS',a:'KeyA',d:'KeyD',shift:'ShiftLeft',' ':'Space',f:'KeyF',e:'KeyE',q:'KeyQ',m:'KeyM',c:'KeyC',r:'KeyR',n:'KeyN'};
  const KEYMAP=Object.assign({},KEY_DEF); try{ const km=JSON.parse(localStorage.getItem('trebaczew-klawisze')||'{}'); Object.keys(KEY_DEF).forEach(k=>{ if(typeof km[k]==='string'&&/^[A-Za-z0-9]{2,20}$/.test(km[k])) KEYMAP[k]=km[k]; }); }catch(e){}
  const CODES={}; function rebuildCodes(){ for(const k in CODES) delete CODES[k]; Object.assign(CODES,{ArrowUp:'arrowup',ArrowDown:'arrowdown',ArrowLeft:'arrowleft',ArrowRight:'arrowright'}); if(KEYMAP.shift==='ShiftLeft') CODES.ShiftRight='shift'; Object.keys(KEYMAP).forEach(a=>{ CODES[KEYMAP[a]]=a; }); }
  rebuildCodes();
  const keyOf=e=>CODES[e.code]||('#'+e.code);
  const releaseAll=()=>{ keys.clear(); resetJoy(); drag=null; };
  addEventListener('keydown',e=>{ if(e.target&&e.target.tagName==='INPUT')return; if(e.target&&e.target.tagName==='BUTTON'&&(e.key===' '||e.key==='Enter'))return;
    if(e.metaKey||e.ctrlKey||e.altKey){ keys.clear(); return; }            // skróty systemowe gubią zdarzenie keyup
    if(GAME.paused||e.code==='Escape') return;
    const k=keyOf(e); if(!keys.has(k)&&!e.repeat){ if(k==='q'){ toggleLog(); e.preventDefault(); return; } if(!logEl.hidden) return; if(k==='c')cycleCam(); if(k==='n')toggleNight(); if(k==='m')toggleMap(); if(k==='f')enterExit(); if(k==='e')extInteract(); if(k==='r')extRadio(); }
    if(mapView.hidden&&!SHOP_OPEN&&logEl.hidden&&!NPC_OPEN) keys.add(k); if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault(); },true);
  addEventListener('keyup',e=>{ const k=keyOf(e); keys.delete(k); keys.delete((e.key||'').toLowerCase()); if(e.key==='Meta'||e.key==='Control'||e.key==='Alt')keys.clear(); },true);
  // sprint: stan Shift synchronizowany z każdego zdarzenia (gubione keyup po zmianie kamery, okna, menu)
  ['keydown','keyup','pointermove','pointerdown','wheel'].forEach(ev=>addEventListener(ev,e=>{ try{ if(e.target&&e.target.tagName==='INPUT')return; if(e.shiftKey){ if(mapView.hidden&&!SHOP_OPEN&&logEl.hidden&&!NPC_OPEN&&!GAME.paused) keys.add('shift'); } else if(keys.has('shift')&&e.type!=='keyup') keys.delete('shift'); }catch(_){} },true));
  addEventListener('blur',releaseAll); addEventListener('pagehide',releaseAll);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden)releaseAll(); });
  addEventListener('contextmenu',()=>keys.clear());
  let drag=null; const joy={id:null,x:0,y:0,cx:0,cy:0};
  function resetJoy(){ joy.id=null; joy.x=joy.y=0; if(knob)knob.style.transform=''; }
  var joyEl=document.getElementById('joy'), knob=document.getElementById('knob');
  canvas.addEventListener('pointerdown',e=>{ canvas.focus();
    if(e.pointerType==='touch'&&e.clientX<innerWidth*0.45&&joy.id===null){ joy.id=e.pointerId; const r=joyEl.getBoundingClientRect(); joy.cx=r.left+r.width/2; joy.cy=r.top+r.height/2; joy.x=joy.y=0; updJoy(e); }
    else drag={id:e.pointerId,x:e.clientX,y:e.clientY};
    canvas.setPointerCapture(e.pointerId); });
  function updJoy(e){ let dx=e.clientX-joy.cx, dy=e.clientY-joy.cy; const l=Math.hypot(dx,dy), m=48; if(l>m){dx*=m/l;dy*=m/l;} joy.x=Math.abs(dx)<8?0:dx/m; joy.y=Math.abs(dy)<8?0:dy/m; knob.style.transform=`translate(${dx}px,${dy}px)`; }
  canvas.addEventListener('pointermove',e=>{ if(e.pointerId===joy.id){updJoy(e);return;} if(drag&&drag.id===e.pointerId){ const dx=e.clientX-drag.x, dy=e.clientY-drag.y; drag.x=e.clientX; drag.y=e.clientY; st.yaw-=dx*0.006*SENS; st.pitch=clamp(st.pitch+dy*0.005*SENS,-0.9,1.35); st.lastDrag=tAll; } });
  const endP=e=>{ if(e.pointerId===joy.id)resetJoy(); if(drag&&drag.id===e.pointerId)drag=null; };
  canvas.addEventListener('pointerup',endP); canvas.addEventListener('pointercancel',endP); canvas.addEventListener('lostpointercapture',endP);
  canvas.addEventListener('wheel',e=>{ e.preventDefault(); st.dist=clamp(st.dist*(e.deltaY>0?1.12:0.89),3,40); },{passive:false});
  const runBtn=document.getElementById('run'); runBtn.addEventListener('click',()=>{ st.run=!st.run; runBtn.classList.toggle('on',st.run); });
  document.getElementById('bEnter').addEventListener('click',()=>enterExit());
  const bCam=document.getElementById('bCam'), bNight=document.getElementById('bNight');
  function cycleCam(){ st.mode=(st.mode+1)%3; bCam.textContent='Kamera: '+MODES[st.mode]; }
  bCam.textContent='Kamera: '+MODES[st.mode]; bCam.addEventListener('click',cycleCam);
  function applyNight(){ const P=st.night?NIGHT:DAY; skyU.hor.value.set(P.hor); skyU.zen.value.set(P.zen); skyU.night.value=st.night?1:0; scene.fog.color.set(P.fog); hemi.color.set(P.hemiS); hemi.groundColor.set(P.hemiG); hemi.intensity=P.hemi*HK; sun.intensity=P.sun; sun.color.set(P.sunC);
    if(bloom)bloom.strength=P.bloom; if(grade){grade.uniforms.exposure.value=P.exp; grade.uniforms.night.value=st.night?1:0;}
    headMat.emissive.set(st.night?0xffc070:0x000000); brandLights.forEach(m=>m.emissive.set(st.night?0x777777:0x000000)); PARK.globeMat.emissive.set(st.night?0xfff0c0:0x000000); playerLight.intensity=st.night?.22:0; winMat.emissive.set(st.night?0x553a12:0x000000); headM.emissive.set(st.night?0xfff2c0:0x000000); tailM.emissive.set(st.night?0x880000:0x220000);
    wins.forEach((w,i)=>winIM.setColorAt(i,col.set(st.night?(winLit[i]?'#ffcf7a':'#1a222c'):'#4a5866'))); winIM.instanceColor.needsUpdate=true;
    polyWinIMs.forEach(im=>{ for(let i=0;i<im.count;i++) im.setColorAt(i,col.set(st.night?(i%3?'#ffd98a':'#1a222c'):'#4a5866')); im.instanceColor.needsUpdate=true; });
    bNight.textContent=st.night?'Pora dnia: wieczór':'Pora dnia: dzień'; }
  function toggleNight(){ st.night=!st.night; applyNight(); }
  bNight.addEventListener('click',()=>toggleNight()); applyNight();
  document.getElementById('hideHelp').addEventListener('click',()=>{ document.getElementById('helpBox').hidden=true; });
  /* ukryty kod: hesoyam → teleport z mapy przez 10 s */
  let TELE_T=0, CHEAT_BUF=''; const TELE_ON=()=>performance.now()<TELE_T;
  addEventListener('keydown',e=>{ if(e.target&&e.target.tagName==='INPUT')return; if(!e.key||e.key.length!==1)return; CHEAT_BUF=(CHEAT_BUF+e.key.toLowerCase()).slice(-8); if(CHEAT_BUF.endsWith('hesoyam')){ CHEAT_BUF=''; TELE_T=performance.now()+10000; } },true);
  function teleport(x,z){ if(st.car)exitCar(true);
    const nr=nearestRoad(x,z,r=>r.t!=='track'); if(nr.r&&nr.d<60){ const a=nr.r.pts[nr.seg],b=nr.r.pts[nr.seg+1]; const dx=b[0]-a[0],dz=b[1]-a[1],L=dx*dx+dz*dz; const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/L,0,1); const px=a[0]+dx*t,pz=a[1]+dz*t; const l=Math.sqrt(L); const nx=-dz/l,nz=dx/l; const sd=((x-px)*nx+(z-pz)*nz)>0?1:-1; x=px+nx*sd*(nr.r.w/2+1.3); z=pz+nz*sd*(nr.r.w/2+1.3); }
    for(let r=0;r<40;r+=1.5){ for(let a=0;a<6.28;a+=.5){ const tx=x+Math.cos(a)*r, tz=z+Math.sin(a)*r; if(!blocked(tx,tz,.5)){ st.x=tx; st.z=tz; return; } } } st.x=x; st.z=z; }

  /* ---------- auto ---------- */
  const vehEl=document.getElementById('veh'), hintEl=document.getElementById('hint'), deadEl=document.getElementById('dead');
  const carLight=new THREE.SpotLight(0xfff1d0,0,60,0.55,0.5,1.2); scene.add(carLight); scene.add(carLight.target);
  const ROOF={car:1.45,van:2.05,moto:1.05,bike:.95,tractor:2.5,fire:3.1,bus:3.1};
  function roofH(c){ return ROOF[c.kind]||1.45; }
  function roofBox(c){ const d=typeof dimsOf==='function'?dimsOf(c):[4.4,1.9]; return [d[0]/2,d[1]/2]; }
  function roofAt(x,z){ let h=0; for(const c of parked){ if(c===st.car||c.ghost||Math.abs(c.x-x)>4||Math.abs(c.z-z)>4)continue; const lx=(x-c.x)*Math.cos(c.h)+(z-c.z)*Math.sin(c.h), lz=-(x-c.x)*Math.sin(c.h)+(z-c.z)*Math.cos(c.h); const [L2,W2]=roofBox(c); if(Math.abs(lx)<L2-.1&&Math.abs(lz)<W2-.1) h=Math.max(h,roofH(c)); } return h; }
  function nearestParked(){ let b=null,bd=4.2; parked.forEach(c=>{ if(c.deco||c.ghost) return; const d=Math.hypot(c.x-st.x,c.z-st.z); if(d<bd){bd=d;b=c;} }); return b; }
  function enterExit(){ if(MP.ride){ leaveRide(); return; } if(BUSR.on){ busLeave(); return; } if(nearBusBoard()){ busBoard(); return; } if(st.car){ exitCar(false); return; } const c=nearestParked(); if(!c){ tryRide(); return; } st.car=c; c.v=0; fuelInit(c); canisterCheck(); player.visible=false; vehEl.hidden=false; vehEl.textContent=c.name||pick(['Fiat Seicento','Opel Astra','Skoda Fabia','VW Golf','Daewoo Lanos','Fiat 126p','Ford Mondeo']); onCarEnter(); }
  function exitCar(force){ const c=st.car; if(!c)return; const lx=c.x+Math.sin(c.h)*1.9, lz=c.z-Math.cos(c.h)*1.9; const rx=c.x-Math.sin(c.h)*1.9, rz=c.z+Math.cos(c.h)*1.9;
    if(!blocked(lx,lz,.4)){st.x=lx;st.z=lz;} else if(!blocked(rx,rz,.4)){st.x=rx;st.z=rz;} else if(!force) return; else {st.x=lx;st.z=lz;}
    c.v=0; st.car=null; player.visible=st.mode!==1; vehEl.hidden=true; }
  function carBlocked(x,z,h){ if(noWalk(x,z))return true; const c=st.car, [L,W]=dimsOf(c); const fx=Math.cos(h),fz=Math.sin(h), half=Math.max(0,L/2-W/2); for(const k of [-half,0,half]){ if(blocked(x+fx*k,z+fz*k,W/2*.95,true))return true; }
    const me={x,z,h,L,W}; for(const p of parked){ if(p!==c&&Math.abs(p.x-x)<15&&Math.abs(p.z-z)<15&&obb(me,box(p),0))return true; } return false; }
  function carHits(c){ const me=box(c); const hit=[]; cars.forEach(t=>{ if(t.h!==undefined&&Math.abs(t.x-c.x)<15&&Math.abs(t.z-c.z)<15&&obb(me,{x:t.x,z:t.z,h:t.h,L:4.4,W:1.9},0)) hit.push(t); });
    if(typeof COPS!=='undefined') COPS.forEach(t=>{ if(Math.abs(t.x-c.x)<15&&Math.abs(t.z-c.z)<15&&obb(me,{x:t.x,z:t.z,h:t.h,L:4.4,W:1.9},0)) hit.push(t); });
    if(typeof BUS!=='undefined'&&BUS.h!==undefined&&Math.abs(BUS.x-c.x)<20&&Math.abs(BUS.z-c.z)<20&&obb(me,{x:BUS.x,z:BUS.z,h:BUS.h,L:12,W:2.6},0)) hit.push(BUS); return hit; }
  function driveCar(c,dt){ let thr=0,steer=0; if(keys.has('w')||keys.has('arrowup'))thr=1; if(keys.has('s')||keys.has('arrowdown'))thr=-1; if(keys.has('a')||keys.has('arrowleft'))steer=-1; if(keys.has('d')||keys.has('arrowright'))steer=1;
    if(joy.id!==null){ thr=clamp(-joy.y*1.4,-1,1); steer=clamp(joy.x*1.3,-1,1); }
    const hb=keys.has(' '); if(c.fuel!==undefined&&c.fuel<=0&&(thr>0||(thr<0&&c.v<=.3))) thr=0;   // bez paliwa silnik nie daje napędu: ani do przodu, ani wstecz (hamować można)
    if(thr>0) c.v+= (c.v<0?16:(c.acc||8.5))*dt; else if(thr<0) c.v-= (c.v>0?16:5)*dt; else c.v*=1-dt*0.6;
    if(c.fuel!==undefined&&c.fuel<=0&&thr<0&&c.v<0) c.v=0;
    c.v-=(c.slope||0)*9.8*dt*0.6;                       // grawitacja na zboczach
    c.v=clamp(c.v,-8,c.maxV||34); if(c.v>45) c.v*=1-dt*.01*(c.v-45)/10; if(hb) c.v*=1-dt*2.4; c.v*=1-dt*0.05;
    c.steer+=(steer*0.55-c.steer)*Math.min(1,dt*6); const sAng=c.steer*(1-Math.min(.65,Math.abs(c.v)/50))/(1+Math.max(0,Math.abs(c.v)-35)/12);
    const turn=c.v/2.6*Math.tan(sAng)*(hb?1.5:1); const nh=c.h+turn*dt; const nx=c.x+Math.cos(nh)*c.v*dt, nz=c.z+Math.sin(nh)*c.v*dt;
    if(!carBlocked(nx,nz,nh)){ fuelUse(c,Math.hypot(nx-c.x,nz-c.z)); c.x=nx; c.z=nz; c.h=nh; } else { if(Math.abs(c.v)>9){ st.hp=Math.max(0,st.hp-Math.abs(c.v)*.4); shake=.5; } c.v=-c.v*0.25; }
    { const hs=carHits(c); if(hs.length){ const sp=Math.abs(c.v); c.x-=Math.cos(c.h)*Math.sign(c.v)*.4; c.z-=Math.sin(c.h)*Math.sign(c.v)*.4; c.v=-c.v*0.3; hs.forEach(t=>{ if(t.v!==undefined) t.v=Math.min(t.v,3); }); if(sp>4){ shake=.6; st.hp=Math.max(0,st.hp-sp*.25); } } }
    c.x=clamp(c.x,X0+30,X1-30); c.z=clamp(c.z,Z0+30,Z1-30);
    c.slope=seatCar(c.g,c.x,c.z,c.h); c.g.userData.wheels.forEach(w=>w.rotation.z-=c.v*dt/.36);
    st.x=c.x; st.z=c.z; st.face=Math.atan2(Math.cos(c.h),Math.sin(c.h));
    vehEl.dataset.kmh=Math.round(Math.abs(c.v)*3.6); }

  /* ---------- mapa duża: cieniowanie rzeźby + działki jak w Geoportalu ---------- */
  const MX0=X0+50,MX1=X1-50,MZ0=Z0+50,MZ1=Z1-50;
  const mapBase=document.createElement('canvas'); const MS=GW>3000?0.5:1; mapBase.width=(MX1-MX0)*MS; mapBase.height=(MZ1-MZ0)*MS;
  const mp=(x,z)=>[(x-MX0)*MS,(z-MZ0)*MS];
  { const b=mapBase.getContext('2d'); b.fillStyle='#2a3424'; b.fillRect(0,0,mapBase.width,mapBase.height);
    b.globalAlpha=.5; b.drawImage(gc,(MX0-X0)*K,(MZ0-Z0)*K,(MX1-MX0)*K,(MZ1-MZ0)*K,0,0,mapBase.width,mapBase.height); b.globalAlpha=1;
    // cieniowanie rzeźby terenu
    const hs=document.createElement('canvas'); const HS=4; hs.width=Math.ceil(mapBase.width/HS); hs.height=Math.ceil(mapBase.height/HS); const hx=hs.getContext('2d'); const img=hx.createImageData(hs.width,hs.height);
    for(let j=0;j<hs.height;j++)for(let i=0;i<hs.width;i++){ const x=MX0+i*HS, z=MZ0+j*HS; const dx=(hRaw(x+HS,z)-hRaw(x-HS,z))/(2*HS), dz=(hRaw(x,z+HS)-hRaw(x,z-HS))/(2*HS); const sh=clamp(0.5+(-dx*0.7-dz*0.7)*6,0,1); const k=(j*hs.width+i)*4; const v=Math.round(sh*255); img.data[k]=v; img.data[k+1]=v; img.data[k+2]=v; img.data[k+3]=110; }
    hx.putImageData(img,0,0); b.imageSmoothingEnabled=true; b.globalCompositeOperation='overlay'; b.drawImage(hs,0,0,mapBase.width,mapBase.height); b.globalCompositeOperation='source-over';
    b.fillStyle='rgba(20,28,22,.35)'; b.fillRect(0,0,mapBase.width,mapBase.height);
    b.strokeStyle='rgba(110,170,230,.55)'; b.lineWidth=.8; PARCELS.forEach(pc=>{ b.beginPath(); pc.p.forEach((v,i)=>{const [x,y]=mp(v[0],v[1]); i?b.lineTo(x,y):b.moveTo(x,y);}); b.closePath(); b.stroke(); });
    b.lineCap='round'; b.lineJoin='round';
    RAILS.forEach(p=>{ b.beginPath(); p.forEach((v,i)=>{const [x,y]=mp(v[0],v[1]); i?b.lineTo(x,y):b.moveTo(x,y);}); b.strokeStyle='#6b6258'; b.lineWidth=3; b.setLineDash([6,4]); b.stroke(); b.setLineDash([]); });
    ROADS.forEach(r=>{ b.beginPath(); r.pts.forEach((v,i)=>{const [x,y]=mp(v[0],v[1]); i?b.lineTo(x,y):b.moveTo(x,y);}); b.strokeStyle=r.main?'#f2c84a':r.t==='track'?'rgba(200,180,140,.5)':'#e8e8e4'; b.lineWidth=r.main?9:r.t==='track'?2:r.t==='srv'?3:6; b.stroke(); });
    b.fillStyle='rgba(126,132,140,.95)'; b.strokeStyle='rgba(220,70,60,.9)'; b.lineWidth=1; houses.forEach(h=>{ const [x,y]=mp(h.x,h.z); b.save(); b.translate(x,y); b.rotate(h.a); b.fillRect(-h.w*MS/2,-h.d*MS/2,h.w*MS,h.d*MS); b.strokeRect(-h.w*MS/2,-h.d*MS/2,h.w*MS,h.d*MS); b.restore(); });
    BPOLY.forEach(p=>{ b.beginPath(); p.pts.forEach((v,i)=>{const [x,y]=mp(v[0],v[1]); i?b.lineTo(x,y):b.moveTo(x,y);}); b.closePath(); b.fill(); b.stroke(); }); }
  const mapView=document.getElementById('mapView'), big=document.getElementById('bigmap'), bctx=big.getContext('2d'); big.width=mapBase.width; big.height=mapBase.height;
  function arrowAngle(){ const dx=Math.sin(st.face), dz=Math.cos(st.face); return Math.atan2(dx,-dz); }
  const MV={z:1,ox:0,oy:0};
  function mvClamp(){ const W=mapBase.width,Hh=mapBase.height; MV.z=clamp(MV.z,1,10); MV.ox=clamp(MV.ox,0,W-W/MV.z); MV.oy=clamp(MV.oy,0,Hh-Hh/MV.z); }
  function mvCenter(x,z,zoom){ const [px,py]=mp(x,z); MV.z=zoom; MV.ox=px-mapBase.width/MV.z/2; MV.oy=py-mapBase.height/MV.z/2; mvClamp(); }
  function drawBig(){ bctx.setTransform(1,0,0,1,0,0); bctx.fillStyle='#1a211c'; bctx.fillRect(0,0,big.width,big.height); bctx.setTransform(MV.z,0,0,MV.z,-MV.ox*MV.z,-MV.oy*MV.z); drawBigInner(); bctx.setTransform(1,0,0,1,0,0); }
  function drawBigInner(){ bctx.drawImage(mapBase,0,0); bctx.font='bold 16px Barlow, Arial'; MAP_PLACES.forEach(([n,x,z,big])=>{ const [px,py]=mp(x,z); bctx.font=(big?'700 34px':'600 20px')+' "Barlow Condensed", Arial'; bctx.textAlign='center'; bctx.lineWidth=4; bctx.strokeStyle='rgba(0,0,0,.7)'; bctx.strokeText(n,px,py); bctx.fillStyle=big?'#fff':'rgba(255,240,200,.9)'; bctx.fillText(n,px,py); }); bctx.font='bold 16px Barlow, Arial'; POIS.forEach(p=>{ const [x,y]=mp(p.x,p.z); bctx.beginPath(); bctx.arc(x,y,9,0,7); bctx.fillStyle=p.c; bctx.fill(); bctx.lineWidth=2.5; bctx.strokeStyle='#000'; bctx.stroke(); bctx.fillStyle='#fff'; bctx.textAlign='center'; bctx.textBaseline='middle'; bctx.fillText(p.ic,x,y+1); });
    bctx.font='600 15px "Barlow Condensed", Arial'; bctx.fillStyle='rgba(255,255,255,.8)'; const SHORTN={'Mikołaja Reja':'Reja','Stefana Batorego':'Batorego','Emilii Plater':'Plater'}; ROADS.filter(r=>r.n&&r.t!=='track').forEach(r=>{ if(r.L<120)return; const s=sampleLine(r.pts,r.len,r.L/2); const [x,y]=mp(s.x,s.z); bctx.save(); bctx.translate(x,y); let a=Math.atan2(s.tz,s.tx); if(a>Math.PI/2)a-=Math.PI; if(a<-Math.PI/2)a+=Math.PI; bctx.rotate(a); bctx.textAlign='center'; bctx.fillText(r.main?'DK42':(SHORTN[r.n]||r.n),0,-7); bctx.restore(); });
    const [px,py]=mp(st.x,st.z); bctx.save(); bctx.translate(px,py); bctx.rotate(arrowAngle()); bctx.beginPath(); bctx.moveTo(0,-16); bctx.lineTo(11,12); bctx.lineTo(0,6); bctx.lineTo(-11,12); bctx.closePath(); bctx.fillStyle='#fff'; bctx.fill(); bctx.lineWidth=3; bctx.strokeStyle='#000'; bctx.stroke(); bctx.restore();
    bctx.font='600 20px Barlow, Arial'; bctx.fillStyle='rgba(255,255,255,.85)'; bctx.textAlign='left'; bctx.fillText(`Wysokość: ${(H(st.x,st.z)+HB).toFixed(1)} m n.p.m.`,16,mapBase.height-18); }
  const poiList=document.getElementById('poiList');
  POIS.forEach(p=>{ const b=document.createElement('button'); b.innerHTML=`<i style="background:${p.c}"></i>`; b.append(p.n); b.addEventListener('click',()=>{ goTo(p); toggleMap(false); }); poiList.append(b); });
  function goTo(p){ if(st.car)exitCar(true);
    { const TPX=[[/^Szkoła Podstawowa/,-141,-46],[/^Apteka Magnolia/,-112,-206],[/^Biblioteka/,-125,-127],[/^AUTOPART/,-1146,678],[/^Biedronka/,-2326,1001],[/^Euforia/,-135,-340],[/^Dworzec PKP/,-564,1461],[/^Hotel V\.I\.P/,-3033,1378],[/^Ośrodek zdrowia/,-112,-206],[/^Kwiaciarnia/,-132,-234],[/^Żabka$/,-77,43],[/^Paczkomat · Wyzwolenia/,-77,43]]; const e=TPX.find(t=>t[0].test(p.n)); if(e){ const [,x,z]=e; let sp=null; for(let r=0;r<30&&!sp;r+=1){ for(let k=0;k<(r?12:1);k++){ const an=k*.5236, tx=x+Math.cos(an)*r, tz=z+Math.sin(an)*r; if(!blocked(tx,tz,.5)){ sp=[tx,tz]; break; } } } sp=sp||[x,z]; st.x=sp[0]; st.z=sp[1]; st.vx=st.vz=0; st.yaw=Math.atan2(sp[0]-p.x,sp[1]-p.z); st.face=st.yaw+Math.PI; st.pitch=.2; return; } }
    const bb=p.n==='Lewiatan'?B_LEW:p.n==='Żabka'?B_ZAB:null; if(bb&&bb.front){ const f=bb.front; st.x=f.x+f.nx*11; st.z=f.z+f.nz*11; st.vx=st.vz=0; st.yaw=Math.atan2(f.nx,f.nz); st.face=st.yaw+Math.PI; st.pitch=0.2; return; } const nr=nearestRoad(p.x,p.z,r=>r.t!=='track'); let dir=[0,1];
    if(nr.r){ const a=nr.r.pts[nr.seg],b=nr.r.pts[nr.seg+1]; const dx=b[0]-a[0],dz=b[1]-a[1],L=dx*dx+dz*dz; const t=clamp(((p.x-a[0])*dx+(p.z-a[1])*dz)/L,0,1); const qx=a[0]+dx*t-p.x, qz=a[1]+dz*t-p.z, l=Math.hypot(qx,qz)||1; dir=[qx/l,qz/l]; }
    let best=null; for(let r=6;r<40&&!best;r+=2){ for(let k=0;k<16;k++){ const an=Math.atan2(dir[1],dir[0])+(k%2?1:-1)*Math.ceil(k/2)*0.35; const x=p.x+Math.cos(an)*r, z=p.z+Math.sin(an)*r; if(!blocked(x,z,.6)){ best=[x,z]; break; } } }
    if(!best){ teleport(p.x,p.z); return; } st.x=best[0]; st.z=best[1]; st.vx=st.vz=0; st.yaw=Math.atan2(st.x-p.x,st.z-p.z); st.face=st.yaw+Math.PI; st.pitch=0.22; }
  let poiBuilt=false;
  function buildPoiList(){ poiBuilt=true; if(CB.orlenShop&&!POIS.some(q=>/orlen/i.test(q.n))){ const S=CB.orlenShop, pp=[S.x,S.z]; POIS.push({n:'ORLEN · stacja paliw (Działoszyn)',x:pp[0],z:pp[1],p:pp,c:'#d8141c',ic:'O',sp:labelSprite('ORLEN','#d8141c')}); const lp=POIS[POIS.length-1]; lp.sp.position.set(pp[0],H(pp[0],pp[1])+9,pp[1]); lp.sp.visible=false; scene.add(lp.sp); }
    poiList.innerHTML=''; const seen=new Set(); const skip=/^(Przystanek|Plac zabaw|Park w|Boisko|Orlik|Górka|Stadion|Paczkomat(?! ·)|Cmentarz)/;
    POIS.filter(q=>!q.npcTag&&!skip.test(q.n)&&!seen.has(q.n)&&seen.add(q.n)).sort((a,b)=>a.n.localeCompare(b.n,'pl')).forEach(q=>{ const b=document.createElement('button'); b.innerHTML=`<i style="background:${q.c}"></i>`; b.append(q.n); b.dataset.k=q.n.toLowerCase(); b.addEventListener('click',()=>{ goTo(q); toggleMap(false); }); poiList.append(b); });
    const si=document.getElementById('poiSearch'); if(si){ const fl=()=>{ const v=si.value.trim().toLowerCase(); [...poiList.children].forEach(b=>{ b.style.display=(!v||b.dataset.k.includes(v))?'':'none'; }); }; si.addEventListener('input',fl); si.addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Enter'){ const f=[...poiList.children].find(b=>b.style.display!=='none'); if(f) f.click(); } }); si.addEventListener('keyup',e=>e.stopPropagation()); } }
  function toggleMap(v){ keys.clear(); resetJoy(); mapView.hidden=v===undefined?!mapView.hidden:!v; if(!mapView.hidden&&!poiBuilt) buildPoiList(); if(!mapView.hidden){ mvCenter(st.x,st.z,2.2); drawBig(); } else canvas.focus(); }
  document.getElementById('bMap').addEventListener('click',()=>toggleMap()); document.getElementById('bMapM').addEventListener('click',()=>toggleMap()); document.getElementById('closeMap').addEventListener('click',()=>toggleMap(false));
  { const pts=new Map(); let moved=0, pinch0=0, z0=1;
    const cpx=e=>{ const r=big.getBoundingClientRect(); return [(e.clientX-r.left)*big.width/r.width,(e.clientY-r.top)*big.height/r.height]; };
    const zoomAt=(px,py,f)=>{ const mx=MV.ox+px/MV.z, my=MV.oy+py/MV.z; MV.z=clamp(MV.z*f,1,10); MV.ox=mx-px/MV.z; MV.oy=my-py/MV.z; mvClamp(); drawBig(); };
    big.addEventListener('wheel',e=>{ e.preventDefault(); const [px,py]=cpx(e); zoomAt(px,py,e.deltaY<0?1.25:.8); },{passive:false});
    big.addEventListener('pointerdown',e=>{ big.setPointerCapture(e.pointerId); pts.set(e.pointerId,cpx(e)); moved=0; if(pts.size===2){ const [a,b]=[...pts.values()]; pinch0=Math.hypot(a[0]-b[0],a[1]-b[1]); z0=MV.z; } });
    big.addEventListener('pointermove',e=>{ if(!pts.has(e.pointerId))return; const p=cpx(e), q=pts.get(e.pointerId); pts.set(e.pointerId,p);
      if(pts.size===2){ const [a,b]=[...pts.values()]; const d=Math.hypot(a[0]-b[0],a[1]-b[1]); const cx=(a[0]+b[0])/2, cy=(a[1]+b[1])/2; const mx=MV.ox+cx/MV.z, my=MV.oy+cy/MV.z; MV.z=clamp(z0*d/(pinch0||d),1,10); MV.ox=mx-cx/MV.z; MV.oy=my-cy/MV.z; mvClamp(); moved=99; drawBig(); return; }
      const dx=p[0]-q[0], dy=p[1]-q[1]; moved+=Math.abs(dx)+Math.abs(dy); if(moved>6){ MV.ox-=dx/MV.z; MV.oy-=dy/MV.z; mvClamp(); drawBig(); } });
    const up=e=>{ const had=pts.has(e.pointerId); pts.delete(e.pointerId); if(!had||pts.size)return; if(moved<=6&&TELE_ON()){ const [px,py]=cpx(e); teleport(MX0+(MV.ox+px/MV.z)/MS, MZ0+(MV.oy+py/MV.z)/MS); toggleMap(false); } };
    big.addEventListener('pointerup',up); big.addEventListener('pointercancel',e=>pts.delete(e.pointerId));
    document.getElementById('mapZin').addEventListener('click',()=>zoomAt(big.width/2,big.height/2,1.5)); document.getElementById('mapZout').addEventListener('click',()=>zoomAt(big.width/2,big.height/2,1/1.5));
    document.getElementById('mapMe').addEventListener('click',()=>{ mvCenter(st.x,st.z,Math.max(3,MV.z)); drawBig(); }); }

  /* ---------- radar ---------- */
  const radar=document.getElementById('radar'), rx=radar.getContext('2d');
  radar.addEventListener('click',()=>toggleMap(true));
  function drawRadar(){ if(st.inside&&CUR.ret){ const sx=st.x,sz=st.z; st.x=CUR.ret.x; st.z=CUR.ret.z; try{ drawRadar0(); } finally{ st.x=sx; st.z=sz; } return; } drawRadar0(); }
  function drawRadar0(){ const W=radar.width,Hh=radar.height, cx=W/2, cy=Hh*0.62; const sc2=(st.car?1.6-Math.min(.6,Math.abs(st.car.v)/40):1.6)/MS;
    rx.save(); rx.clearRect(0,0,W,Hh); rx.fillStyle='#1f2a22'; rx.fillRect(0,0,W,Hh);
    rx.translate(cx,cy); rx.rotate(st.yaw); rx.scale(sc2,sc2); const [px,py]=mp(st.x,st.z); rx.drawImage(mapBase,-px,-py);
    POIS.forEach(p=>{ const [x,y]=mp(p.x,p.z); rx.save(); rx.translate(x-px,y-py); rx.rotate(-st.yaw); rx.beginPath(); rx.arc(0,0,7/sc2,0,7); rx.fillStyle=p.c; rx.fill(); rx.lineWidth=2/sc2; rx.strokeStyle='#000'; rx.stroke(); rx.restore(); });
    pickups.forEach(k=>{ if(k.got)return; const [x,y]=mp(k.x,k.z); rx.fillStyle='#7fd06b'; rx.fillRect(x-px-2.5/sc2,y-py-2.5/sc2,5/sc2,5/sc2); }); extBlips(rx,px,py,sc2);
    rx.restore();
    rx.save(); rx.translate(cx,cy); rx.rotate(st.yaw); rx.translate(0,-Math.min(cx,cy)*1.25); rx.rotate(-st.yaw); rx.beginPath(); rx.arc(0,0,11,0,7); rx.fillStyle='rgba(0,0,0,.7)'; rx.fill(); rx.fillStyle='#fff'; rx.font='bold 14px Barlow, Arial'; rx.textAlign='center'; rx.textBaseline='middle'; rx.fillText('N',0,1); rx.restore();
    rx.save(); rx.translate(cx,cy); rx.rotate(st.yaw+arrowAngle()); rx.beginPath(); rx.moveTo(0,-12); rx.lineTo(8,9); rx.lineTo(0,5); rx.lineTo(-8,9); rx.closePath(); rx.fillStyle='#fff'; rx.fill(); rx.lineWidth=2.5; rx.strokeStyle='#000'; rx.stroke(); rx.restore();
    rx.fillStyle='rgba(0,0,0,.55)'; rx.fillRect(W-128,6,122,30); rx.fillStyle='#fff'; rx.font='600 20px "Barlow Condensed", Arial'; rx.textAlign='right'; rx.textBaseline='middle'; rx.fillText(`${(H(st.x,st.z)+HB).toFixed(0)} m n.p.m.`,W-12,22);
    const grd=rx.createRadialGradient(cx,cy,Math.min(W,Hh)*.3,cx,cy,W*.7); grd.addColorStop(0,'rgba(0,0,0,0)'); grd.addColorStop(1,'rgba(0,0,0,.45)'); rx.fillStyle=grd; rx.fillRect(0,0,W,Hh); }

  /* ---------- HUD ---------- */
  const moneyEl=document.getElementById('money'), starsEl=document.getElementById('stars'), hpb=document.getElementById('hpb');
  const locEl=document.getElementById('loc'), locMain=document.getElementById('locMain'), locSub=document.getElementById('locSub');
  let lastLoc='', locTimer=0, lastHud=0, shownMoney=st.money;
  const zones=[[SCHOOL.pts,'Szkoła Podstawowa'],[KINDER.pts,'Przedszkole'],[PARK.pts,'Park w Trębaczewie'],[CEM.pts,'Cmentarz parafialny'],[COURT.pts,'Orlik']];
  function locationName(){ const zn=zones.find(zz=>inPoly(st.x,st.z,zz[0])); if(zn)return zn[1]; const nr=nearestRoad(st.x,st.z); if(nr.r&&nr.d<nr.r.w/2+14){ if(nr.r.main)return 'Wyzwolenia (DK42)'; if(nr.r.n)return nr.r.n; return nr.r.t==='track'?'Droga polna':''; } if(houses.some(h=>Math.abs(h.x-st.x)<40&&Math.abs(h.z-st.z)<40))return ''; return 'Pola uprawne'; }
  function fmt(n){ return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,' ')+' zł'; }
  function addMoney(v){ st.money+=v; moneyEl.classList.remove('pop'); void moneyEl.offsetWidth; moneyEl.classList.add('pop'); }
  function setWanted(n){ st.wanted=clamp(n,0,5); st.wantedT=0; }
  const ADDR_B=BLD.filter(b=>b.addr); let lastAddr=null;
  function nearAddr(){ if(st.car)return null; let best=null,bd=1e9; for(const b of ADDR_B){ const dx=st.x-b.x,dz=st.z-b.z; if(Math.abs(dx)>40||Math.abs(dz)>40)continue; const c=Math.cos(b.a),s=Math.sin(b.a); const lx=Math.abs(dx*c+dz*s)-b.w/2, lz=Math.abs(-dx*s+dz*c)-b.d/2; const d=Math.hypot(Math.max(0,lx),Math.max(0,lz)); if(d<bd){bd=d;best=b;} } return bd<4?best:null; }
  function updHud(){ const ln=st.inside?(CUR===IN?'Lewiatan':(CUR.title||'Wnętrze')):locationName(); if(ln&&ln!==lastLoc){ lastLoc=ln; locMain.textContent=ln; locSub.textContent='Trębaczew'; locEl.classList.add('on'); locTimer=4; }
    const ab=st.inside?null:nearAddr(); if(ab&&ab!==lastAddr){ locMain.textContent=(/^\d/.test(ab.addr)?'Trębaczew ':'ul. ')+ab.addr; locSub.textContent=ab.name&&ab.name!=='shelter'?ab.name:'Trębaczew'; locEl.classList.add('on'); locTimer=3; lastLoc=null; } lastAddr=ab;
    starsEl.innerHTML='<b>'+'★'.repeat(st.wanted)+'</b>'+'★'.repeat(5-st.wanted); starsEl.classList.toggle('flash',st.wanted>0);
    hpb.style.width=st.hp+'%';
    let hint=extHint()||''; if(!hint&&!st.car){ const c=nearestParked(); if(c) hint=`Naciśnij <kbd>${keyName(KEYMAP.f)}</kbd>, aby wsiąść do auta`; else { const pk=LOCKERS.find(l=>Math.hypot(l.x-st.x,l.z-st.z)<4); if(pk) hint='Paczkomat · '+pk.n; } } hintEl.innerHTML=hint; hintEl.classList.toggle('on',!!hint); if(IS_TOUCH) actLabel();
    if(st.car) vehEl.textContent=vehEl.textContent.split(' · ')[0]+' · '+(vehEl.dataset.kmh||0)+' km/h'; fuelHud();
    const far=st.mode===2?600:17; POIS.forEach(p=>{ const d=Math.hypot(p.x-st.x,p.z-st.z); p.sp.visible=d<far&&!(p.npcTag&&d<26); }); }

  /* ======================= ROZSZERZENIA ======================= */
  const EXT_UPD=[];
  const $=id=>document.getElementById(id);
  const toastEl=$('toast'), missionEl=$('mission'), clockEl=$('clock'), shopEl=$('shop');
  let toastT=0; function toast(msg,sec){ toastEl.innerHTML=msg; toastEl.classList.add('on'); toastT=sec||3; }
  const hash=i=>{ let x=Math.sin(i*127.1+311.7)*43758.5453; return x-Math.floor(x); };
  function roadPt(name,frac,side){ const r=ROADS.find(q=>q.n===name&&q.t!=='track'); if(!r)return null; const s=sampleLine(r.pts,r.len,r.L*frac); const o=(side||0)*(r.w/2+1.3); return [s.x-s.tz*o,s.z+s.tx*o]; }
  function frontOf(h){ const nr=nearestRoad(h.x,h.z,r=>r.t!=='track'); if(!nr.r)return [h.x,h.z]; const a=nr.r.pts[nr.seg],b=nr.r.pts[nr.seg+1]; const dx=b[0]-a[0],dz=b[1]-a[1],L=dx*dx+dz*dz; const t=clamp(((h.x-a[0])*dx+(h.z-a[1])*dz)/L,0,1); const px=a[0]+dx*t,pz=a[1]+dz*t; const vx=h.x-px,vz=h.z-pz,l=Math.hypot(vx,vz)||1; return [px+vx/l*(nr.r.w/2+1.6),pz+vz/l*(nr.r.w/2+1.6)]; }

  /* ---------- infrastruktura: słupy energetyczne z przewodami ---------- */
  { const PL=['Szkolna','Spacerowa','Zagrodowa','Zielona','Kwiatowa','Sikorskiego','Północna','Traktorowa','Polna','Energetyczna','Cmentarna','Wiśniowa','Stodulskiego','Zacisze','Strażacka','Wynalazek'];
    const poles=[], wire=[];
    ROADS.filter(r=>r.main||PL.includes(r.n)).forEach(r=>{ const off=r.w/2+(r.main||SIDEWALK.has(r.n)?3.7:2.3); let prev=null;
      for(let d=6;d<r.L;d+=r.main?42:36){ const s=sampleLine(r.pts,r.len,d); const x=s.x+s.tz*off, z=s.z-s.tx*off; if(x<X0+40||x>X1-40||z<Z0+40||z>Z1-40){prev=null;continue;} if(blocked(x,z,.4)){prev=null;continue;}
        const y=H(x,z), ang=Math.atan2(s.tz,s.tx); const p={x,y,z,ang,tx:s.tx,tz:s.tz}; poles.push(p);
        if(prev&&Math.hypot(prev.x-x,prev.z-z)<60){ [-.85,0,.85].forEach(o=>{ const ax=prev.x-prev.tz*o, az=prev.z+prev.tx*o, ay=prev.y+8.55, bx2=x-s.tz*o, bz=z+s.tx*o, by=y+8.55; for(let k=0;k<8;k++){ const t0=k/8,t1=(k+1)/8; const sag=t=>-0.7*4*t*(1-t); wire.push(ax+(bx2-ax)*t0,ay+(by-ay)*t0+sag(t0),az+(bz-az)*t0, ax+(bx2-ax)*t1,ay+(by-ay)*t1+sag(t1),az+(bz-az)*t1); } }); }
        prev=p; addSolid({x,z,hw:.2,hd:.2,c:1,s:0,r:.4}); } });
    const conc=new THREE.MeshLambertMaterial({color:0x9a9890}); const pim=new THREE.InstancedMesh(new THREE.BoxGeometry(.26,9,.26).translate(0,4.5,0),conc,poles.length), aim=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,.12,2.0),conc,poles.length);
    const ins=new THREE.InstancedMesh(new THREE.CylinderGeometry(.06,.06,.22,6),new THREE.MeshLambertMaterial({color:0xd8dde0}),poles.length*3);
    poles.forEach((p,i)=>{ dum.position.set(p.x,p.y,p.z); dum.rotation.set(0,-p.ang,0); dum.scale.set(1,1,1); dum.updateMatrix(); pim.setMatrixAt(i,dum.matrix); dum.position.y=p.y+8.4; dum.updateMatrix(); aim.setMatrixAt(i,dum.matrix);
      [-.85,0,.85].forEach((o,k)=>{ dum.position.set(p.x-p.tz*o,p.y+8.55,p.z+p.tx*o); dum.rotation.set(0,0,0); dum.updateMatrix(); ins.setMatrixAt(i*3+k,dum.matrix); }); });
    pim.castShadow=true; scene.add(pim,aim,ins);
    const wg=new THREE.BufferGeometry(); wg.setAttribute('position',new THREE.Float32BufferAttribute(wire,3)); scene.add(new THREE.LineSegments(wg,new THREE.LineBasicMaterial({color:0x26292b}))); }

  /* ---------- znaki drogowe, przejścia dla pieszych, hydranty ---------- */
  const signTexC={};
  function stex(kind){ if(signTexC[kind])return signTexC[kind]; let t;
    if(kind==='stop') t=tex(128,128,(x,w,h)=>{ x.clearRect(0,0,w,h); x.beginPath(); for(let i=0;i<8;i++){ const a=Math.PI/8+i*Math.PI/4; x.lineTo(64+60*Math.cos(a),64+60*Math.sin(a)); } x.closePath(); x.fillStyle='#fff'; x.fill(); x.beginPath(); for(let i=0;i<8;i++){ const a=Math.PI/8+i*Math.PI/4; x.lineTo(64+54*Math.cos(a),64+54*Math.sin(a)); } x.closePath(); x.fillStyle='#c8102e'; x.fill(); x.fillStyle='#fff'; x.font='800 34px Barlow, Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('STOP',64,66); });
    else if(kind==='50') t=tex(128,128,(x)=>{ x.clearRect(0,0,128,128); x.beginPath(); x.arc(64,64,60,0,7); x.fillStyle='#c8102e'; x.fill(); x.beginPath(); x.arc(64,64,46,0,7); x.fillStyle='#fff'; x.fill(); x.fillStyle='#111'; x.font='800 46px Barlow, Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('50',64,67); });
    else if(kind==='zebra') t=tex(128,128,(x)=>{ x.fillStyle='#1f5fb4'; x.fillRect(0,0,128,128); x.fillStyle='#fff'; x.beginPath(); x.moveTo(64,16); x.lineTo(114,108); x.lineTo(14,108); x.closePath(); x.fill(); x.fillStyle='#111'; for(let i=0;i<4;i++) x.fillRect(30+i*18,96,10,8); x.beginPath(); x.arc(64,52,7,0,7); x.fill(); x.fillRect(58,60,12,22); x.fillRect(50,82,8,14); x.fillRect(70,82,8,14); });
    else if(kind==='name') t=tex(512,128,(x)=>{ x.fillStyle='#fdfdfb'; x.fillRect(0,0,512,128); x.strokeStyle='#111'; x.lineWidth=8; x.strokeRect(8,8,496,112); x.fillStyle='#111'; x.font='700 66px Barlow, Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('Trębaczew',256,68); });
    else if(kind==='bus') t=tex(128,128,(x)=>{ x.fillStyle='#1f5fb4'; x.fillRect(0,0,128,128); x.fillStyle='#f4c430'; x.fillRect(14,14,100,100); x.fillStyle='#1f5fb4'; x.fillRect(26,40,76,40); x.fillStyle='#f4c430'; x.fillRect(32,46,14,14); x.fillRect(52,46,14,14); x.fillRect(72,46,14,14); x.fillStyle='#111'; x.beginPath(); x.arc(42,86,7,0,7); x.arc(86,86,7,0,7); x.fill(); });
    else if(kind==='rozklad') t=tex(64,96,(x)=>{ x.fillStyle='#f4d03f'; x.fillRect(0,0,64,96); x.fillStyle='#222'; x.font='700 10px Arial'; x.fillText('PKS',4,12); for(let i=0;i<9;i++) x.fillRect(4,20+i*8,30+((i*13)%24),3); });
    return signTexC[kind]=t; }
  const poleM=new THREE.MeshLambertMaterial({color:0x8a9096});
  function sign(x,z,rot,kind,w,h,top){ if(roadNearF(x,z,.15)) return; const g=new THREE.Group(); const y=H(x,z); const ph=top||2.3; bx(g,.07,ph+.1,.07,0,0,0,poleM); const m=new THREE.Mesh(new THREE.PlaneGeometry(w||.8,h||.8),new THREE.MeshLambertMaterial({map:stex(kind),transparent:kind==='stop'||kind==='50',alphaTest:.3,side:THREE.DoubleSide})); m.position.set(0,ph,.05); g.add(m); g.position.set(x,y,z); g.rotation.y=rot; scene.add(g); return g; }
  const zebraM=po(new THREE.MeshLambertMaterial({color:0xf2f2ee}),6);
  function zebra(cx,cz,dirx,dirz,width,len){ const px=-dirz,pz=dirx; const n=Math.floor(width/1.0); for(let i=0;i<n;i++){ const o=-width/2+.5+i; const x=cx+px*o, z=cz+pz*o; const m=new THREE.Mesh(new THREE.PlaneGeometry(.5,len).rotateX(-Math.PI/2),zebraM); m.position.set(x,H(x,z)+.13+(DK&&roadDist(DK,x,z)<5?.05:0),z); m.rotation.y=Math.atan2(dirx,dirz); scene.add(m); } }
  // skrzyżowania z DK42: STOP i przejście przez boczną ulicę
  ROADS.forEach(r=>{ if(r.main||r.t==='track'||r.t==='srv')return; [0,r.pts.length-1].forEach(ei=>{ const e=r.pts[ei], nb=r.pts[ei===0?1:ei-1]; if(roadDist(DK,e[0],e[1])>DK.w/2+3)return; let dx=nb[0]-e[0],dz=nb[1]-e[1]; const l=Math.hypot(dx,dz)||1; dx/=l; dz/=l;
    const sx=e[0]+dx*8+dz*(r.w/2+1.4), sz=e[1]+dz*8-dx*(r.w/2+1.4); if(!blocked(sx,sz,.3)) sign(sx,sz,Math.atan2(dx,dz),'stop',.8,.8);
    zebra(e[0]+dx*(DK.w/2+2.5),e[1]+dz*(DK.w/2+2.5),dx,dz,r.w,2.8); }); });
  // przejścia na DK42 i przy szkole
  [[-60,95],[-62,52]].forEach(([x,z])=>{ const s=nearestRoad(x,z,r=>r===DK); const a=DK.pts[s.seg],b=DK.pts[s.seg+1]; let dx=b[0]-a[0],dz=b[1]-a[1]; const l=Math.hypot(dx,dz); dx/=l; dz/=l; const t=clamp(((x-a[0])*dx+(z-a[1])*dz),0,l); const cx=a[0]+dx*t, cz=a[1]+dz*t; zebra(cx,cz,-dz,dx,DK.w,3.2);
    [1,-1].forEach(sd=>{ const sx=cx-dz*sd*(DK.w/2+1.6)+dx*sd*2, sz=cz+dx*sd*(DK.w/2+1.6)+dz*sd*2; if(!blocked(sx,sz,.3)) sign(sx,sz,Math.atan2(-dx*sd,-dz*sd),'zebra',.7,.7); }); });
  { const sp=roadPt('Szkolna',0.55,0); if(sp){ const nr=nearestRoad(sp[0],sp[1],r=>r.n==='Szkolna'); const a=nr.r.pts[nr.seg],b=nr.r.pts[nr.seg+1]; let dx=b[0]-a[0],dz=b[1]-a[1]; const l=Math.hypot(dx,dz); zebra(sp[0],sp[1],-dz/l,dx/l,nr.r.w,3); } }
  // tablice „Trębaczew” i ograniczenie 50 na wjazdach DK42
  [[-640,1],[700,-1]].forEach(([xx,dirSign])=>{ let best=0,bd=1e9; for(let d=0;d<DK.L;d+=4){ const s=sampleLine(DK.pts,DK.len,d); if(Math.abs(s.x-xx)<bd){bd=Math.abs(s.x-xx);best=d;} } const s=sampleLine(DK.pts,DK.len,best);
    const o=DK.w/2+2.2; const sx=s.x+s.tz*o*dirSign, sz=s.z-s.tx*o*dirSign; sign(sx,sz,Math.atan2(-s.tx*dirSign,-s.tz*dirSign),'name',2.2,.55,2.4);
    const s2=sampleLine(DK.pts,DK.len,best+dirSign*25); const sx2=s2.x+s2.tz*o*dirSign, sz2=s2.z-s2.tx*o*dirSign; sign(sx2,sz2,Math.atan2(-s2.tx*dirSign,-s2.tz*dirSign),'50',.75,.75); });
  // przystanki: znak D-15 i rozkład jazdy
  const BUS_STOPS=[];
  BLD.filter(b=>b.kind==='shelter').forEach(b=>{ const nr=nearestRoad(b.x,b.z,r=>r.t!=='track'); const a=nr.r.pts[nr.seg],c=nr.r.pts[nr.seg+1]; const ang=Math.atan2(c[0]-a[0],c[1]-a[1]); const sx=b.x+Math.cos(ang)*3, sz=b.z-Math.sin(ang)*3; sign(sx,sz,ang,'bus',.65,.65,2.5);
    const rp=new THREE.Mesh(new THREE.PlaneGeometry(.45,.65),new THREE.MeshLambertMaterial({map:stex('rozklad')})); rp.position.set(sx,H(sx,sz)+1.5,sz); rp.rotation.y=ang; scene.add(rp);
    if(nr.r===DK){ let best=0,bd=1e9; for(let d=0;d<DK.L;d+=2){ const s=sampleLine(DK.pts,DK.len,d); const dd=Math.hypot(s.x-b.x,s.z-b.z); if(dd<bd){bd=dd;best=d;} } BUS_STOPS.push(best); } });
  // hydranty
  { const hyM=new THREE.MeshLambertMaterial({color:0xc8261e}); ['Szkolna','Zielona','Spacerowa','Zagrodowa','Kwiatowa'].forEach(n=>{ ROADS.filter(r=>r.n===n).forEach(r=>{ for(let d=40;d<r.L;d+=110){ const s=sampleLine(r.pts,r.len,d); const o=r.w/2+2.55; const x=s.x-s.tz*o, z=s.z+s.tx*o; if(blocked(x,z,.3))continue; const g=new THREE.Group(); const y=H(x,z); const b1=new THREE.Mesh(new THREE.CylinderGeometry(.13,.15,.75,10).translate(0,.375,0),hyM); const b2=new THREE.Mesh(new THREE.SphereGeometry(.15,10,6,0,Math.PI*2,0,Math.PI/2),hyM); b2.position.y=.75; const b3=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.38,8).rotateZ(Math.PI/2),hyM); b3.position.y=.5; g.add(b1,b2,b3); g.position.set(x,y,z); scene.add(g); } }); }); }

  /* ---------- cmentarz: groby, kaplica, znicze (dzień Wszystkich Świętych) ---------- */
  const candleMat=new THREE.MeshLambertMaterial({color:0xd8392b,emissive:0x000000}), flameMat=new THREE.MeshBasicMaterial({color:0xffb347});
  let flameIM=null;
  { const m=mar(CEM.pts); const ca=Math.cos(m.an), sa=Math.sin(m.an); const G=[];
    for(let u=-m.w/2+3;u<m.w/2-3;u+=2.6) for(let v=-m.d/2+3;v<m.d/2-3;v+=3.6){ if(Math.abs(u)<2.2||Math.abs(v)<2)continue; const x=m.cx+u*ca-v*sa, z=m.cz+u*sa+v*ca; if(!inPoly(x,z,CEM.pts)||blocked(x,z,.8))continue; G.push({x,z,a:m.an,k:hash(G.length)}); }
    const slab=new THREE.InstancedMesh(new THREE.BoxGeometry(1.0,.32,2.0).translate(0,.16,0),new THREE.MeshLambertMaterial({color:0xffffff}),G.length);
    const stone=new THREE.InstancedMesh(new THREE.BoxGeometry(.95,1.0,.16).translate(0,.5,0),new THREE.MeshLambertMaterial({color:0xffffff}),G.length);
    const STONE=['#2b2d30','#3b3e42','#5b5e62','#8a8780','#4a3a33','#6b6e72','#1c1d1f'];
    const C=[];
    G.forEach((g,i)=>{ const y=H(g.x,g.z); dum.position.set(g.x,y,g.z); dum.rotation.set(0,-g.a+Math.PI/2,0); dum.scale.set(1,1,1); dum.updateMatrix(); slab.setMatrixAt(i,dum.matrix); const c=STONE[Math.floor(g.k*STONE.length)]; slab.setColorAt(i,col.set(c));
      const hx=g.x-Math.cos(g.a)*0.95, hz=g.z-Math.sin(g.a)*0.95; dum.position.set(hx,y+.2,hz); dum.updateMatrix(); stone.setMatrixAt(i,dum.matrix); stone.setColorAt(i,col.set(c));
      const n=1+Math.floor(hash(i+7)*4); for(let k=0;k<n;k++){ const ox=(hash(i*3+k)-.5)*.7, oz=(hash(i*5+k)-.5)*1.5; C.push([g.x+ox*Math.sin(g.a)+oz*Math.cos(g.a)*.3, y+.32, g.z-ox*Math.cos(g.a)+oz*Math.sin(g.a)*.3, hash(i*11+k)]); } });
    slab.receiveShadow=true; stone.castShadow=true; scene.add(slab,stone);
    const cand=new THREE.InstancedMesh(new THREE.CylinderGeometry(.06,.06,.16,8).translate(0,.08,0),candleMat,C.length); const fl=new THREE.InstancedMesh(new THREE.SphereGeometry(.035,6,4).scale(1,1.8,1),flameMat,C.length);
    const CC=['#c8261e','#a31c1c','#e0b030','#f2f2ee','#7a3fa0','#2f7a3f'];
    C.forEach((c,i)=>{ dum.position.set(c[0],c[1],c[2]); dum.rotation.set(0,0,0); dum.scale.set(1,1,1); dum.updateMatrix(); cand.setMatrixAt(i,dum.matrix); cand.setColorAt(i,col.set(CC[Math.floor(c[3]*CC.length)])); dum.position.y=c[1]+.2; dum.updateMatrix(); fl.setMatrixAt(i,dum.matrix); });
    scene.add(cand,fl); flameIM=fl;
    // kaplica przy wejściu od Cmentarnej
    const cr=ROADS.find(r=>r.n==='Cmentarna'); let ep=CEM.pts[0],ed=1e9; CEM.pts.forEach(v=>{ const d=roadDist(cr,v[0],v[1]); if(d<ed){ed=d;ep=v;} }); const cc=centroid(CEM.pts); const dx=cc[0]-ep[0],dz=cc[1]-ep[1],dl=Math.hypot(dx,dz)||1; const kx=ep[0]+dx/dl*9, kz=ep[1]+dz/dl*9;
    const kg=new THREE.Group(); kg.position.set(kx,H(kx,kz),kz); kg.rotation.y=Math.atan2(-dx,-dz); scene.add(kg); const wm=new THREE.MeshLambertMaterial({color:0xe8e2d6,map:plasterTex});
    bx(kg,5,4,7,0,-.5,0,wm); const kr=new THREE.Mesh(gabGeo,new THREE.MeshLambertMaterial({color:0x6e4a3b,map:seamTex})); kr.rotation.y=Math.PI/2; kr.scale.set(7.8,3.2,5.8); kr.position.y=3.5; kr.castShadow=true; kg.add(kr); tri(kg,5,2.75,0,3.5,3.51,wm);
    pl(kg,1.4,2.4,0,1.2,3.52,new THREE.MeshLambertMaterial({color:0x4b3a2e})); const cm=new THREE.MeshLambertMaterial({color:0x3a3d40}); bx(kg,.12,1.6,.12,0,6.6,3.3,cm); bx(kg,.8,.12,.12,0,7.6,3.3,cm);
    addSolid({x:kx,z:kz,hw:2.5,hd:3.5,c:Math.cos(-kg.rotation.y),s:Math.sin(-kg.rotation.y),r:4.3}); }

  /* ---------- ogrodzenie cmentarza od Cmentarnej: ażurowe płyty betonowe na skarpie, czerwona brama ---------- */
  { const cr=ROADS.find(r=>r.n==='Cmentarna'); const P=CEM.pts.slice(); if(P.length>2&&P[0][0]===P[P.length-1][0]&&P[0][1]===P[P.length-1][1])P.pop(); const cc=centroid(P);
    const panT=tex(256,128,(x,w,h)=>{ x.clearRect(0,0,w,h); x.fillStyle='#c4c0b6'; x.fillRect(0,0,w,h); noise(x,w,h,2500,150,215,.25,1.4);
      x.globalCompositeOperation='destination-out'; for(let r=0;r<3;r++)for(let c=0;c<7;c++){ const cx=22+c*35, cy=26+r*38; x.beginPath(); x.ellipse(cx,cy,14,15,0,0,7); x.fill(); }
      x.globalCompositeOperation='source-over'; x.strokeStyle='#bdb9af'; x.lineWidth=4; for(let r=0;r<3;r++)for(let c=0;c<7;c++){ const cx=22+c*35, cy=26+r*38; x.beginPath(); x.arc(cx,cy,6,0,7); x.stroke(); x.beginPath(); x.moveTo(cx-14,cy); x.lineTo(cx+14,cy); x.moveTo(cx,cy-15); x.lineTo(cx,cy+15); x.lineWidth=2.5; x.stroke(); x.lineWidth=4; } });
    panT.generateMipmaps=false; panT.minFilter=THREE.LinearFilter; panT.needsUpdate=true;
    const panM=new THREE.MeshLambertMaterial({map:panT,transparent:true,alphaTest:.4,side:THREE.DoubleSide});
    const concM=new THREE.MeshLambertMaterial({color:0xb7b3a9,map:detailTex}), grassM=new THREE.MeshLambertMaterial({color:0x5d8a3c,map:detailTex});
    const segs=[]; for(let i=0;i<P.length;i++){ const a=P[i],b=P[(i+1)%P.length]; const Ln=Math.hypot(b[0]-a[0],b[1]-a[1]); const n=Math.max(1,Math.round(Ln/2.2)); const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2]; const road=cr&&(roadDist(cr,a[0],a[1])<26||roadDist(cr,b[0],b[1])<26)&&roadDist(cr,mid[0],mid[1])<26;
      for(let k=0;k<n;k++) segs.push({a:[a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n],b:[a[0]+(b[0]-a[0])*(k+1)/n,a[1]+(b[1]-a[1])*(k+1)/n],road}); }
    // brama: segment najbliżej Cmentarnej (lewy koniec odcinka przy drodze)
    let gi=0,gd=1e9; segs.forEach((s,i)=>{ const d=cr?roadDist(cr,(s.a[0]+s.b[0])/2,(s.a[1]+s.b[1])/2):0; if(d<gd){gd=d;gi=i;} });
    const panIM=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),panM,segs.length), postIM=new THREE.InstancedMesh(new THREE.BoxGeometry(.2,1,.2).translate(0,.5,0),concM,segs.length), baseIM=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.3,.14).translate(0,.15,0),concM,segs.length), bermIM=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,3.2).translate(0,.5,0),grassM,segs.length);
    let nb=0;
    segs.forEach((s,i)=>{ const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],Ln=Math.hypot(dx,dz),an=Math.atan2(dz,dx); const cx=(s.a[0]+s.b[0])/2,cz=(s.a[1]+s.b[1])/2; const y=H(cx,cz)+(s.road?.7:0);
      if(s.road){ let inx=-dz/Ln,inz=dx/Ln; if((cc[0]-cx)*inx+(cc[1]-cz)*inz<0){inx=-inx;inz=-inz;} const bxp=cx+inx*1.7,bzp=cz+inz*1.7; dum.position.set(bxp,H(cx,cz)-.3,bzp); dum.rotation.set(0,-an,0); dum.scale.set(Ln+.05,1.0,1); dum.updateMatrix(); bermIM.setMatrixAt(nb++,dum.matrix); }
      dum.position.set(s.a[0],H(s.a[0],s.a[1])+(s.road?.7:0)-.1,s.a[1]); dum.rotation.set(0,-an,0); dum.scale.set(1,1.85,1); dum.updateMatrix(); postIM.setMatrixAt(i,dum.matrix);
      if(i===gi){ dum.scale.set(0,0,0); dum.updateMatrix(); panIM.setMatrixAt(i,dum.matrix); baseIM.setMatrixAt(i,dum.matrix); return; }
      dum.position.set(cx,y+.3+.62,cz); dum.scale.set(Ln-.18,1.25,1); dum.updateMatrix(); panIM.setMatrixAt(i,dum.matrix);
      dum.position.set(cx,y,cz); dum.scale.set(Ln,1,1); dum.updateMatrix(); baseIM.setMatrixAt(i,dum.matrix);
      addSolid({x:cx,z:cz,hw:Ln/2,hd:.12,c:Math.cos(an),s:Math.sin(an),r:Ln/2+.3}); });
    bermIM.count=Math.max(1,nb); [panIM,postIM,baseIM,bermIM].forEach(m=>{ m.castShadow=true; m.receiveShadow=true; scene.add(m); });
    // czerwona brama (dwuskrzydłowa, uchylona) + szafka elektryczna i tablica ogłoszeń przy drodze
    const s=segs[gi]; const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],Ln=Math.hypot(dx,dz),an=Math.atan2(dz,dx); const cx=(s.a[0]+s.b[0])/2,cz=(s.a[1]+s.b[1])/2;
    let nx=-dz/Ln,nz=dx/Ln,zs=1; if((cc[0]-cx)*nx+(cc[1]-cz)*nz>0){nx=-nx;nz=-nz;zs=-1;}          // normalna na zewnątrz (do drogi)
    const redM=new THREE.MeshLambertMaterial({color:0xb8282a});
    const gg=new THREE.Group(); gg.position.set(cx,H(cx,cz)+(s.road?.7:0),cz); gg.rotation.y=-an; scene.add(gg);
    [-1,1].forEach(sd=>{ const leaf=new THREE.Group(); leaf.position.set(sd*Ln/2,0,0); leaf.rotation.y=sd*.35; gg.add(leaf); const LW=Ln/2-.1;
      bx(leaf,LW,.07,.07,-sd*LW/2,1.55,0,redM); bx(leaf,LW,.07,.07,-sd*LW/2,.12,0,redM); for(let k=0;k<=8;k++) bx(leaf,.04,1.43,.04,-sd*k*LW/8,.12,0,redM,true); for(let k=0;k<4;k++){ const sp=new THREE.Mesh(new THREE.ConeGeometry(.05,.16,4),redM); sp.position.set(-sd*(k+.5)*LW/4,1.67,0); leaf.add(sp); } });
    if(s.road){ const st2=new THREE.Mesh(new THREE.BoxGeometry(Ln,.75,3.4),concM); st2.position.set(0,-.38,-zs*1.7); gg.add(st2); for(let k=0;k<4;k++) bx(gg,Ln,.18,.45,0,-.72+k*.18,-zs*(3.5+(3-k)*.45),concM); }
    // (szafka elektryczna i tablica ogłoszeń usunięte - blokowały Cmentarną)
  }

  /* ---------- pola: bele siana ---------- */
  const BALES=new THREE.InstancedMesh(new THREE.CylinderGeometry(.75,.75,1.25,16).rotateZ(Math.PI/2),new THREE.MeshLambertMaterial({color:0xc6a65a,map:detailTex}),220);
  { let n=0; const big=PARCELS.filter(p=>!p.res&&Math.abs(polyArea(p.p))>9000).sort((a,b)=>hash(a.bb[0])-hash(b.bb[0])).slice(0,40);
    big.forEach((pc,pi)=>{ const c=centroid(pc.p); const m=mar(pc.p); for(let k=0;k<6&&n<220;k++){ const u=(k-2.5)*6, x=c[0]+Math.cos(m.an)*u, z=c[1]+Math.sin(m.an)*u; if(!inPoly(x,z,pc.p)||blocked(x,z,1)||ROADS.some(r=>roadDist(r,x,z)<5))continue; dum.position.set(x,H(x,z)+.72,z); dum.rotation.set(0,-m.an+Math.PI/2+hash(n)*.4,0); dum.scale.set(1,1,1); dum.updateMatrix(); BALES.setMatrixAt(n++,dum.matrix); } });
    BALES.count=n; BALES.castShadow=true; scene.add(BALES); }

  let STADIUM_P=null, STADIUM_C=null, STADIUM_D=null; const STAD={};
  await LP(78);
  /* ---------- stadion LZS Trębaczew (za DK42) ---------- */
  { const ST=dec([122,937,-80,-53,-9,-18,1,-6,3,-10,41,-58,94,67,-50,78]), PI2=dec([39,864,40,-57,82,56,-41,58,-81,-57]); const m=mar(PI2); const y0=Math.min(...PI2.map(v=>H(v[0],v[1])));
    FLAT.push({p:PI2,bb:bbox(PI2),fe:0,h:y0});
    const surf=new THREE.Mesh(new THREE.PlaneGeometry(m.w,m.d).rotateX(-Math.PI/2),po(new THREE.MeshLambertMaterial({map:courtTex('grass')}),2)); surf.position.set(m.cx,y0+.08,m.cz); surf.rotation.y=-m.an; surf.receiveShadow=true; scene.add(surf);
    const g=new THREE.Group(); g.position.set(m.cx,y0,m.cz); g.rotation.y=-m.an; scene.add(g); const wM=new THREE.MeshLambertMaterial({color:0xffffff});
    [-1,1].forEach(s=>{ const gx=s*(m.w/2-1); [-3.66,3.66].forEach(z=>bx(g,.12,2.44,.12,gx,0,z,wM)); bx(g,.12,.12,7.44,gx,2.44,0,wM); });
    // trybunka i budynek klubowy
    const seatM=new THREE.MeshLambertMaterial({color:0x1f5fb4}); for(let r=0;r<3;r++) bx(g,26,.4,.8,0,r*.4,-m.d/2-2-r*.8,r%2?seatM:new THREE.MeshLambertMaterial({color:0xc8261e}));
    /* trybuna bez dachu - jak na zdjęciu */
    // szatnia: kontener (wg zdjęcia) po lewej stronie boiska, na wysokości połowy murawy
    { const cont=new THREE.Group(); g.updateMatrixWorld(true); { const lp0=g.worldToLocal(new THREE.Vector3(121,y0,818)); cont.position.set(lp0.x,0,lp0.z); } g.add(cont); const cg=new THREE.MeshLambertMaterial({color:0xdde1de,map:detailTex}), dk=new THREE.MeshLambertMaterial({color:0x3a3f45}), bl=new THREE.MeshLambertMaterial({color:0x6e9ab8});
      bx(cont,6.1,2.5,2.44,0,.15,0,cg); bx(cont,6.3,.12,2.64,0,2.65,0,new THREE.MeshLambertMaterial({color:0x8d9399})); [-3.05,3.05].forEach(x=>bx(cont,.1,2.5,2.5,x,.15,0,dk)); for(let i=0;i<4;i++) bx(cont,.06,2.5,2.5,-2.3+i*1.5,.15,0,new THREE.MeshLambertMaterial({color:0xcfd4d0}));
      bx(cont,1.0,2.0,.07,1.7,.15,-1.24,dk); bx(cont,.9,.7,.07,-.4,1.2,-1.24,bl); bx(cont,.9,.7,.07,-1.9,1.2,-1.24,bl); [-1,1].forEach(o=>bx(cont,.25,.25,.5,2.2+o*.0,0,-1.5,new THREE.MeshLambertMaterial({color:0xf2c230})));
      pl(cont,2.2,.4,-1.2,2.25,-1.26,new THREE.MeshLambertMaterial({map:signTex('SZATNIA','#1b4f8a','#ffffff',256,64,'800 40px Barlow, Arial')}),Math.PI);
      const cp=[121,818]; addSolid({x:cp[0],z:cp[1],hw:3.15,hd:1.3,c:Math.cos(m.an),s:Math.sin(m.an),r:3.5}); }
    g.traverse(o=>{ if(o.isMesh)o.castShadow=true; });
    // ---- kibice z biało-czerwonymi szalikami, zawodnicy z piłkami, barierka, brama LZS i kapliczka ----
    { const scarfT=tex(256,48,(x,w,h)=>{ for(let i=0;i<16;i++){ x.fillStyle=i%2?'#ffffff':'#c8261e'; x.fillRect(i*16,0,16,h); } x.fillStyle='#c8261e'; x.fillRect(40,8,176,32); x.fillStyle='#fff'; x.font='800 22px Barlow, Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('LZS TRĘBACZEW',128,25); });
      const fans=[]; for(let r=0;r<3;r++) for(let xx=-12.4;xx<=12.4;xx+=.85){ if(rnd()<.28)continue; fans.push({x:xx+R(-.12,.12),y:r*.4+.4,z:-m.d/2-2-r*.8,ph:R(0,6.28),scarf:rnd()<.72}); }
      const bodyIM=new THREE.InstancedMesh(new THREE.CylinderGeometry(.2,.24,.78,8).translate(0,.39,0),new THREE.MeshLambertMaterial({color:0xffffff}),fans.length);
      const headIM=new THREE.InstancedMesh(new THREE.SphereGeometry(.13,8,6),new THREE.MeshLambertMaterial({color:0xffffff}),fans.length);
      const sc=fans.filter(f=>f.scarf); const scarfIM=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.25,.24),new THREE.MeshLambertMaterial({map:scarfT,side:THREE.DoubleSide}),Math.max(1,sc.length));
      const armIM=new THREE.InstancedMesh(new THREE.BoxGeometry(.07,.5,.07).translate(0,.25,0),new THREE.MeshLambertMaterial({color:0xffffff}),Math.max(1,sc.length*2));
      const cl=new THREE.Color(), M4=new THREE.Matrix4(), Q=new THREE.Quaternion(), V=new THREE.Vector3(), S1=new THREE.Vector3(1,1,1), E=new THREE.Euler();
      fans.forEach((f,i)=>{ V.set(f.x,f.y,f.z); M4.compose(V,Q,S1); bodyIM.setMatrixAt(i,M4); bodyIM.setColorAt(i,cl.set(pick(['#c8261e','#f2f2f2','#c8261e','#2b2f36','#1f5fb4','#f2f2f2','#3a3f45']))); V.set(f.x,f.y+.93,f.z); M4.compose(V,Q,S1); headIM.setMatrixAt(i,M4); headIM.setColorAt(i,cl.set(pick(['#e6bb98','#d9a983','#f0c9a8','#c99572']))); });
      bodyIM.instanceColor.needsUpdate=true; headIM.instanceColor.needsUpdate=true;
      sc.forEach((f,j)=>{ armIM.setColorAt(j*2,cl.set('#e6bb98')); armIM.setColorAt(j*2+1,cl.set('#e6bb98')); });
      [bodyIM,headIM,scarfIM,armIM].forEach(o=>{ o.castShadow=true; g.add(o); });
      // trybuna: betonowe stopnie, ściana tylna, boki
      const conc=new THREE.MeshLambertMaterial({color:0xa9a59c,map:plasterTex}); bx(g,27,.3,3.2,0,-.2,-m.d/2-2.8,conc);
      const ban=tex(512,64,(x,w,h)=>{ x.fillStyle='#fff'; x.fillRect(0,0,w,h); x.fillStyle='#c8261e'; x.fillRect(0,h/2,w,h/2); x.fillStyle='#173e93'; x.font='800 30px Barlow, Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('LZS TRĘBACZEW  ·  JESTEŚMY Z WAMI!',w/2,h/2); });
      pl(g,18,1.0,0,.55,-m.d/2-1.55,new THREE.MeshLambertMaterial({map:ban}));
      // piłkochwyty (wysokie słupy z siatką) za bramkami i wzdłuż boku - jak na zdjęciu
      const netT=tex(64,64,(x,w,h)=>{ x.clearRect(0,0,w,h); x.strokeStyle='rgba(40,48,40,.9)'; x.lineWidth=1.2; for(let i=0;i<=w;i+=8){ x.beginPath(); x.moveTo(i,0); x.lineTo(i,h); x.stroke(); x.beginPath(); x.moveTo(0,i); x.lineTo(w,i); x.stroke(); } },true);
      const poleW=new THREE.MeshLambertMaterial({color:0xf2f2f2}); const netRun=(x0,z0,x1,z1,Hn)=>{ const L=Math.hypot(x1-x0,z1-z0); const t=netT.clone(); t.needsUpdate=true; t.repeat.set(L/1.5,Hn/1.5); const nm=new THREE.Mesh(new THREE.PlaneGeometry(L,Hn),new THREE.MeshLambertMaterial({map:t,transparent:true,alphaTest:.3,side:THREE.DoubleSide})); nm.position.set((x0+x1)/2,Hn/2,(z0+z1)/2); nm.rotation.y=-Math.atan2(z1-z0,x1-x0); g.add(nm);
        const n=Math.max(1,Math.round(L/5)); for(let i=0;i<=n;i++){ const pp=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,Hn+.3,8).translate(0,(Hn+.3)/2,0),poleW); pp.position.set(x0+(x1-x0)*i/n,0,z0+(z1-z0)*i/n); pp.castShadow=true; g.add(pp); } };
      [-1,1].forEach(sd=>netRun(sd*(m.w/2+4),-m.d/2+2,sd*(m.w/2+4),m.d/2-2,8)); netRun(m.w/2-24,m.d/2+5,m.w/2+4,m.d/2+5,6);
      // czerwone siatki w bramkach i chorągiewki narożne
      const redNet=new THREE.MeshLambertMaterial({color:0xc8261e,transparent:true,opacity:.55,side:THREE.DoubleSide}); [-1,1].forEach(sd=>{ const gx=sd*(m.w/2-1); const back=new THREE.Mesh(new THREE.PlaneGeometry(7.32,2.44),redNet); back.position.set(gx+sd*1.6,1.22,0); back.rotation.y=Math.PI/2; g.add(back); [-3.66,3.66].forEach(z=>{ const sdn=new THREE.Mesh(new THREE.PlaneGeometry(1.6,2.44),redNet); sdn.position.set(gx+sd*.8,1.22,z); g.add(sdn); }); const top=new THREE.Mesh(new THREE.PlaneGeometry(1.6,7.32).rotateX(-Math.PI/2).rotateY(Math.PI/2),redNet); top.position.set(gx+sd*.8,2.44,0); g.add(top); });
      const flagT=tex(16,16,(x)=>{ x.fillStyle='#f2c230'; x.fillRect(0,0,16,8); x.fillStyle='#c8261e'; x.fillRect(0,8,16,8); }); [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([a,b])=>{ const fx=a*(m.w/2-.8), fz=b*(m.d/2-.6); const pp=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,1.5,6).translate(0,.75,0),poleW); pp.position.set(fx,0,fz); g.add(pp); const fl=new THREE.Mesh(new THREE.PlaneGeometry(.45,.32),new THREE.MeshLambertMaterial({map:flagT,side:THREE.DoubleSide})); fl.position.set(fx+.23,1.32,fz); g.add(fl); });
      // rząd topoli za trybuną
      { const pop=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,7).scale(1.6,6,1.6).translate(0,6.5,0),new THREE.MeshLambertMaterial({color:0xffffff}),26); const M5=new THREE.Matrix4(), cl2=new THREE.Color(); for(let i=0;i<26;i++){ const s2=R(.85,1.15); M5.compose(new THREE.Vector3(-m.w/2-6+i*(m.w+12)/25+R(-1,1),0,-m.d/2-8.5+R(-1,1)),new THREE.Quaternion(),new THREE.Vector3(s2,R(.85,1.2),s2)); pop.setMatrixAt(i,M5); pop.setColorAt(i,cl2.setHSL(R(.24,.3),R(.4,.55),R(.25,.33))); } pop.castShadow=true; g.add(pop);
        const trk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.18,.25,2.6,6).translate(0,1.3,0),new THREE.MeshLambertMaterial({color:0x5e4632}),26); for(let i=0;i<26;i++){ const e=new THREE.Matrix4(); pop.getMatrixAt(i,e); const v=new THREE.Vector3().setFromMatrixPosition(e); M5.makeTranslation(v.x,0,v.z); trk.setMatrixAt(i,M5); } g.add(trk); }
      // ławki rezerwowych
      [-6,6].forEach(x=>{ bx(g,4,.45,.6,x,0,m.d/2+3,new THREE.MeshLambertMaterial({color:0x2b2f36})); const roof=new THREE.Mesh(new THREE.CylinderGeometry(1,1,4,10,1,true,0,Math.PI).rotateZ(Math.PI/2).rotateY(Math.PI),new THREE.MeshPhongMaterial({color:0x9fc3d6,transparent:true,opacity:.55,side:THREE.DoubleSide})); roof.position.set(x,.9,m.d/2+3.2); g.add(roof); });
      // zawodnicy: drybling, podania, bramkarz
      const ballT=tex(64,32,(x,w,h)=>{ x.fillStyle='#fff'; x.fillRect(0,0,w,h); x.fillStyle='#222'; for(let i=0;i<6;i++){ x.beginPath(); x.arc(5+i*11,8+(i%2)*14,4,0,7); x.fill(); } });
      const ballG=new THREE.SphereGeometry(.11,12,8), ballM=new THREE.MeshLambertMaterial({map:ballT});
      const mkBall=()=>{ const b=new THREE.Mesh(ballG,ballM); b.castShadow=true; g.add(b); return b; };
      const kit=(i)=>i===5?[0x2f9e4a,0x111111]:[0xc8261e,0xffffff]; const PL=[];
      for(let i=0;i<7;i++){ const [t,b]=kit(i); const p=makePerson(t,b,pick([0x1a1a1a,0x3a2a1c,0x6b4a2b,0xc9a46a]),{female:false,style:'tee',hairStyle:pick(['short','buzz','short'])}); g.add(p); const o={p,x:R(-m.w/2+8,m.w/2-8),z:R(-m.d/2+5,m.d/2-5),h:0,walk:0,tx:0,tz:0,role:i<3?'drib':i<5?'pass':i===5?'gk':'cone'}; PL.push(o); }
      PL.forEach((o,i)=>{ if(o.role==='drib'){ o.ball=mkBall(); o.tx=o.x; o.tz=o.z; }
        if(o.role==='gk'){ o.x=-m.w/2+1.4; o.z=0; }
        if(o.role==='cone'){ o.x=-4; o.z=-m.d/2+4; } });
      const pa=PL.filter(o=>o.role==='pass'); if(pa.length===2){ pa[0].x=-10; pa[0].z=6; pa[1].x=6; pa[1].z=-2; const b=mkBall(); STAD.pass={a:pa[0],b:pa[1],ball:b,t:0,dir:0}; }
      // pachołki do slalomu
      const coneM=new THREE.MeshLambertMaterial({color:0xff7a1a}); for(let i=0;i<6;i++){ const c=new THREE.Mesh(new THREE.ConeGeometry(.14,.32,10).translate(0,.16,0),coneM); c.position.set(-2+i*1.6,.06,-m.d/2+4); g.add(c); }
      STAD.PL=PL; STAD.fans=fans; STAD.sc=sc; STAD.scarfIM=scarfIM; STAD.armIM=armIM; STAD.m=m; STAD.g=g; STAD.y0=y0;
      // brama LZS przy wjeździe (najbliższa droga)
      const W2=L2W(m.cx,m.cz,-m.an); let best=null,bd=1e9; ROADS.forEach(r=>{ if(['track','rail','path','foot','footway'].includes(r.t)||!r.L)return; for(let d=0;d<r.L;d+=2){ const q=sampleLine(r.pts,r.len,d); const dd=Math.hypot(q.x-m.cx,q.z-m.cz); if(dd<bd){ bd=dd; best={r,q,d}; } } });
      if(best){ let q=best.q; let dx=m.cx-q.x, dz=m.cz-q.z; const dl=Math.hypot(dx,dz)||1; dx/=dl; dz/=dl; { const lx=dz, lz=-dx; const sgn=(q.tx*lx+q.tz*lz)>=0?1:-1; const q2=sampleLine(best.r.pts,best.r.len,clamp(best.d+sgn*18,0,best.r.L)); q=q2; dx=m.cx-q.x; dz=m.cz-q.z; const d2=Math.hypot(dx,dz)||1; dx/=d2; dz/=d2; } const off=best.r.w/2+3.2; const gx=75, gz=798, gy=H(gx,gz); const ang=Math.atan2(dx,dz);
        const gate=new THREE.Group(); gate.position.set(gx,gy,gz); gate.rotation.y=ang; scene.add(gate); STAD.gate=[gx,gz];
        const iron=new THREE.MeshLambertMaterial({color:0x232527}), redM=new THREE.MeshLambertMaterial({color:0xc8261e}), concM=new THREE.MeshLambertMaterial({color:0xb9b6ae,map:plasterTex});
        const lzsT=tex(512,64,(x,w,h)=>{ x.fillStyle='#c8261e'; x.fillRect(0,0,w,h); x.strokeStyle='#8a1612'; x.lineWidth=4; x.strokeRect(2,2,w-4,h-4); x.fillStyle='#f6e7c8'; x.font='600 40px Barlow, Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('LZS TRĘBACZEW',w/2,h/2+2); });
        // brama dwuskrzydłowa: górą czarne pręty, dołem czerwona blacha z napisem; prawe skrzydło otwarte
        const leaf=(lx,open)=>{ const L=new THREE.Group(); L.position.set(lx,0,0); gate.add(L); const s=lx<0?1:-1; const w=2.9; L.rotation.y=open?s*1.4:0;
          bx(L,w,.06,.06,s*w/2,1.75,0,iron,true); bx(L,w,.06,.06,s*w/2,.15,0,iron,true); for(let i=0;i<=14;i++) bx(L,.03,1.0,.03,s*(.08+i*(w-.16)/14),.8,0,iron,true); bx(L,w,.62,.04,s*w/2,.18,0,redM,true);
          const tp=new THREE.Mesh(new THREE.PlaneGeometry(w-.1,.55),new THREE.MeshLambertMaterial({map:lzsT})); tp.position.set(s*w/2,.49,.03); L.add(tp); const tp2=tp.clone(); tp2.rotation.y=Math.PI; tp2.position.z=-.03; L.add(tp2); };
        [-3,3].forEach(x=>bx(gate,.1,1.9,.1,x,0,0,iron)); leaf(-3,true); leaf(3,false);
        { const wp=[gx+Math.cos(ang)*1.5,gz-Math.sin(ang)*1.5]; addSolid({x:wp[0],z:wp[1],hw:1.5,hd:.12,c:Math.cos(-ang),s:Math.sin(-ang),r:1.7}); }
        // prawa strona: płot z betonowych płyt, słupek, tablica „OGŁOSZENIA” pod daszkiem
        bx(gate,3.4,1.75,.14,-(3.1+1.7),0,0,concM); for(let i=0;i<4;i++) bx(gate,3.4,.03,.15,-(3.1+1.7),.4+i*.4,0,new THREE.MeshLambertMaterial({color:0x9a968e}),true); 
        { const wp=[gx+Math.cos(ang)*-4.8,gz-Math.sin(ang)*-4.8]; addSolid({x:wp[0],z:wp[1],hw:1.8,hd:.15,c:Math.cos(-ang),s:Math.sin(-ang),r:2}); }
        // (tablica „OGŁOSZENIA” i słupy usunięte - stały element na jezdni)
        // (siatka na słupkach po lewej stronie bramy usunięta)
        gate.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
        // krzyż przydrożny na granitowym cokole (przy siatce piłkochwytu)
        const tx=Math.cos(ang), tz=-Math.sin(ang); let kp=[57,819]; for(const o of []){ const x=gx+tx*o+dx*2.5, z=gz+tz*o+dz*2.5; if(!blocked(x,z,1.2)&&!ROADS.some(r=>r.t!=='track'&&roadDist(r,x,z)<r.w/2+1.2)){ kp=[x,z]; break; } }
        if(kp){ const k=new THREE.Group(); k.position.set(kp[0],H(kp[0],kp[1]),kp[1]); k.rotation.y=ang+Math.PI; scene.add(k); STAD.kap=kp;
          const gran=new THREE.MeshLambertMaterial({color:0xb7b4ad,map:plasterTex}), crM=new THREE.MeshLambertMaterial({color:0xe8e6e0,map:plasterTex}), dark2=new THREE.MeshLambertMaterial({color:0x8d8a84});
          bx(k,1.1,.18,1.1,0,0,0,dark2); const ped=new THREE.Mesh(new THREE.CylinderGeometry(.33,.42,1.5,4).rotateY(Math.PI/4),gran); ped.position.y=.93; k.add(ped); bx(k,.5,.12,.5,0,1.68,0,gran);
          bx(k,.24,4.0,.2,0,1.8,0,crM); bx(k,1.75,.24,.2,0,4.6,0,crM); bx(k,.32,.2,.04,0,5.35,.11,dark2,true);
          const fig=new THREE.Group(); fig.position.set(0,4.2,.13); k.add(fig); const sk=new THREE.MeshLambertMaterial({color:0xd8d4cc}); const bd=new THREE.Mesh(new THREE.CylinderGeometry(.07,.05,.55,6),sk); fig.add(bd); const hd=new THREE.Mesh(new THREE.SphereGeometry(.06,6,5),sk); hd.position.y=.33; fig.add(hd); [-1,1].forEach(sd=>{ const ar=new THREE.Mesh(new THREE.BoxGeometry(.38,.04,.04),sk); ar.position.set(sd*.2,.28,0); ar.rotation.z=sd*.25; fig.add(ar); });
          k.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); addSolid({x:kp[0],z:kp[1],hw:.55,hd:.55,c:1,s:0,r:.8}); } } }
    STADIUM_P=[m.cx+Math.cos(m.an)*(m.w/2-14),m.cz+Math.sin(m.an)*(m.w/2-14)];
    STADIUM_C=[m.cx,m.cz];
    const cc=centroid(PI2); addSolid({x:m.cx+Math.cos(m.an)*(m.w/2+8),z:m.cz+Math.sin(m.an)*(m.w/2+8),hw:4,hd:6,c:Math.cos(m.an),s:Math.sin(m.an),r:7.5});
    POIS.push({n:'Stadion LZS Trębaczew',x:cc[0],z:cc[1],p:cc,c:'#1f5fb4',ic:'⚽',sp:labelSprite('Stadion LZS Trębaczew','#1f5fb4')}); const lp=POIS[POIS.length-1]; lp.sp.position.set(cc[0],y0+8,cc[1]); lp.sp.visible=false; scene.add(lp.sp);
    const b=document.createElement('button'); b.innerHTML='<i style="background:#1f5fb4"></i>'; b.append(lp.n); b.addEventListener('click',()=>{ goTo(lp); toggleMap(false); }); $('poiList').append(b); }
  { const cc=[-2362,1490];
    POIS.push({n:'Stadion w Działoszynie',x:cc[0],z:cc[1],p:cc,c:'#c8261e',ic:'⚽',sp:labelSprite('Stadion w Działoszynie','#c8261e')}); const lp=POIS[POIS.length-1]; lp.sp.position.set(cc[0],H(cc[0],cc[1])+9,cc[1]); lp.sp.visible=false; scene.add(lp.sp);
    const b=document.createElement('button'); b.innerHTML='<i style="background:#c8261e"></i>'; b.append(lp.n); b.addEventListener('click',()=>{ goTo(lp); toggleMap(false); }); $('poiList').append(b); }

  // wsiąść można tylko do kilku aut: Passat spod Lewiatana, BMW Seby, własne auto i jedno zapasowe przy starcie; reszta to dekoracja
  { let spare=null, sd=1e9; parked.forEach(c=>{ if(c===PASSAT) return; c.deco=true; if(c.kind==='car'&&!roadNearF(c.x,c.z,3.4)){ const d=Math.hypot(c.x-SPAWN.x,c.z-SPAWN.z); if(d<sd&&d>12){ sd=d; spare=c; } } }); if(spare){ spare.deco=false; spare.name='Fiat Seicento'; }
    for(let i=parked.length-1;i>=0;i--){ const c=parked[i]; if(c.deco){ scene.remove(c.g); parked.splice(i,1); } } }  // w świecie zostają tylko 3 auta: Passat, Seicento i BMW Seby
  /* ---------- pojazdy: rower, motocykl, ciągnik, autobus PKS, pociąg towarowy ---------- */
  function makeMoto(){ const g=new THREE.Group(); const tm=new THREE.MeshLambertMaterial({color:0x111111}), bm=new THREE.MeshPhongMaterial({color:0xb3262b,shininess:80});
    [-.7,.7].forEach(x=>{ const w=new THREE.Mesh(new THREE.TorusGeometry(.32,.09,8,18),tm); w.position.set(x,.36,0); g.add(w); }); const bd=new THREE.Mesh(new THREE.BoxGeometry(1.1,.35,.35),bm); bd.position.set(0,.72,0); g.add(bd);
    const tank=new THREE.Mesh(new THREE.BoxGeometry(.5,.25,.4),bm); tank.position.set(.2,.95,0); g.add(tank); const seat=new THREE.Mesh(new THREE.BoxGeometry(.6,.1,.3),tm); seat.position.set(-.25,.95,0); g.add(seat); const hb=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.7),tm); hb.position.set(.62,1.1,0); g.add(hb);
    g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); g.userData.wheels=[]; return g; }
  function makeTractor(){ const g=new THREE.Group(); const gr=new THREE.MeshLambertMaterial({color:0x2f7a3a}), tm=new THREE.MeshLambertMaterial({color:0x151515}), yl=new THREE.MeshLambertMaterial({color:0xe0b020});
    bx(g,2.2,1.0,1.1,.4,.7,0,gr); bx(g,1.3,1.6,1.4,-.75,.9,0,gr); bx(g,1.4,.08,1.6,-.75,2.5,0,gr); pl(g,1.1,.9,-.1,2.0,0,new THREE.MeshPhongMaterial({color:0x22303a,shininess:100}),Math.PI/2);
    const rw=[],wg=new THREE.CylinderGeometry(.75,.75,.45,16).rotateX(Math.PI/2), fw=new THREE.CylinderGeometry(.42,.42,.3,14).rotateX(Math.PI/2);
    [[-.8,.8,wg,.75],[-.8,-.8,wg,.75],[1.1,.65,fw,.42],[1.1,-.65,fw,.42]].forEach(([x,z,gg,r])=>{ const w=new THREE.Mesh(gg,tm); w.position.set(x,r,z); g.add(w); rw.push(w); const hub=new THREE.Mesh(new THREE.CylinderGeometry(r*.45,r*.45,.47,10).rotateX(Math.PI/2),yl); hub.position.copy(w.position); g.add(hub); });
    bx(g,.08,.8,.08,1.0,1.2,.35,tm); g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); g.userData.wheels=rw; return g; }
  function makeBus(){ const g=new THREE.Group(); const wh=new THREE.MeshPhongMaterial({color:0x1f5fb4,shininess:70}), or=new THREE.MeshLambertMaterial({color:0xf4f6f8}), gl=new THREE.MeshPhongMaterial({color:0x1b2630,shininess:120});
    bx(g,11,2.6,2.5,0,.45,0,wh); bx(g,11.02,.35,2.52,0,1.0,0,or); [1.27,-1.27].forEach(z=>pl(g,9.6,1.0,-.4,2.25,z,gl,z>0?0:Math.PI)); pl(g,2.3,1.3,5.51,2.1,0,gl,Math.PI/2);
    const pks=tex(256,64,(x)=>{ x.fillStyle='#111'; x.fillRect(0,0,256,64); x.fillStyle='#f4c430'; x.font='700 34px Barlow, Arial'; x.fillText('GEPARD',60,44); }); pl(g,2.0,.35,5.52,3.0,0,new THREE.MeshBasicMaterial({map:pks}),Math.PI/2);
    const gep=tex(256,40,(x)=>{ x.fillStyle='#f4f6f8'; x.fillRect(0,0,256,40); x.fillStyle='#1f5fb4'; x.font='800 32px Barlow, Arial'; x.textAlign='center'; x.fillText('GEPARD',128,32); }); [1.275,-1.275].forEach(z=>pl(g,3.4,.34,-3.0,1.0,z,new THREE.MeshBasicMaterial({map:gep}),z>0?0:Math.PI));
    const ws=[]; [[3.6,1.1],[3.6,-1.1],[-3.4,1.1],[-3.4,-1.1]].forEach(([x,z])=>{ const w=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.3,14).rotateX(Math.PI/2),new THREE.MeshLambertMaterial({color:0x151515})); w.position.set(x,.5,z); g.add(w); ws.push(w); });
    g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); g.userData.wheels=ws; return g; }
  function makeMelex(){ const g=new THREE.Group(); const wh=new THREE.MeshLambertMaterial({color:0xf2f3f1}), bl=new THREE.MeshLambertMaterial({color:0x1f4fa3}), dk=new THREE.MeshLambertMaterial({color:0x2a2d31}), gn=new THREE.MeshLambertMaterial({color:0x2f7a3a}), tm=new THREE.MeshLambertMaterial({color:0x151515}), gl=new THREE.MeshLambertMaterial({color:0x9fc4d8,transparent:true,opacity:.35});
    bx(g,2.5,.16,1.1,0,.28,0,dk); bx(g,.85,.5,1.1,.85,.42,0,wh); bx(g,.85,.12,1.12,.85,.9,0,gn); bx(g,.9,.5,1.1,-.85,.42,0,wh); bx(g,.7,.06,.8,-.85,.92,0,dk);
    bx(g,.55,.12,.95,-.02,.5,0,bl); bx(g,.12,.55,.95,-.34,.62,0,bl); bx(g,.08,.5,.1,.38,.55,.0,dk).rotation.z=-.5;
    const sw=new THREE.Mesh(new THREE.TorusGeometry(.17,.02,6,14),dk); sw.position.set(.33,1.0,0); sw.rotation.y=Math.PI/2; sw.rotation.x=.45; g.add(sw);
    bx(g,2.0,.06,1.2,-.05,1.95,0,wh); [[.78,.54],[.78,-.54],[-.88,.54],[-.88,-.54]].forEach(([x,z])=>bx(g,.05,1.1,.05,x,.88,z,dk)); pl(g,1.0,.7,.82,1.45,0,gl,Math.PI/2).rotation.set(-.2,Math.PI/2,0);
    const lm=new THREE.MeshBasicMaterial({color:0xfff2c0}); [.4,-.4].forEach(z=>bx(g,.04,.14,.2,1.29,.62,z,lm,true));
    const ws=[], wg=new THREE.CylinderGeometry(.24,.24,.16,12).rotateX(Math.PI/2); [[.85,.55],[.85,-.55],[-.85,.55],[-.85,-.55]].forEach(([x,z])=>{ const w=new THREE.Mesh(wg,tm); w.position.set(x,.24,z); w.castShadow=true; g.add(w); ws.push(w); });
    const dv=makePerson(0xf0c020,0x2c3e66,0x2a1d14,{female:false,style:'jacket',hairStyle:'short'}); dv.position.set(-.02,-.25,-.26); dv.rotation.y=Math.PI/2; g.add(dv); g.userData.drv=dv;
    g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); g.userData.wheels=ws; return g; }
  function addParked(g,x,z,h,kind,name,maxV,acc){ if(blocked(x,z,1.2))return null; const c={g,x,z,h,v:0,steer:0,kind,name,maxV,acc,k0:Math.round(x)+','+Math.round(z)}; seatCar(g,x,z,h); scene.add(g); parked.push(c); return c; }
  // rowery przy Lewiatanie i na wsi, motocykl przy Żabce, ciągnik przy gospodarstwie
  if(B_LEW.front){ const f=B_LEW.front; [[-6,4],[-7.2,4]].forEach(([u,v])=>{ const x=f.x-f.nz*u+f.nx*v, z=f.z+f.nx*u+f.nz*v; const b=bikeM(); b.userData.wheels=[]; addParked(b,x,z,Math.atan2(f.nz,f.nx),'bike','Rower',9,4.5); }); }
  if(B_ZAB.front){ const f=B_ZAB.front; addParked(makeMoto(),f.x+f.nx*6+f.nz*5,f.z+f.nz*6-f.nx*5,Math.atan2(-f.nx,f.nz),'moto','Motocykl Romet',40,13); }
  { const farm=houses.filter(h=>h.kind==='farm').sort((a,b)=>Math.hypot(a.x+200,a.z-200)-Math.hypot(b.x+200,b.z-200)).slice(0,3); farm.forEach(h=>{ const p=frontOf(h); addParked(makeTractor(),p[0],p[1],h.a,'tractor','Ciągnik Ursus',11,4); });
    for(let i=0;i<6;i++){ const h=houses[(i*173)%houses.length]; if(h.kind!=='house')continue; const p=frontOf(h); const b=bikeM(); b.userData.wheels=[]; addParked(b,p[0]+1.5,p[1]+1.5,h.a,'bike','Rower',9,4.5); } }
  // ciągniki jeżdżące po drogach polnych
  const TRACTORS=[]; ROADS.filter(r=>r.t==='track'&&r.L>200).slice(0,3).forEach((r,i)=>{ const g=makeTractor(); scene.add(g); TRACTORS.push({g,r,d:r.L*hash(i),dir:1,v:3.5}); });
  // autobus PKS po DK42 z postojami
  const BUS={g:makeBus(),d:0,v:0,wait:0,x:0,z:0}; scene.add(BUS.g);
  // pociąg towarowy na Magistrali Węglowej
  const freightPath=RAILS.reduce((a,b)=>lineLen(b).slice(-1)[0]>lineLen(a).slice(-1)[0]&&b!==trainPath?b:a,RAILS.find(p=>p!==trainPath)||RAILS[0]); const freightLen=lineLen(freightPath);
  const FREIGHT=[]; { const loco=new THREE.Group(); const lb=[bx(loco,16,3.4,3,0,.5,0,new THREE.MeshPhongMaterial({color:0xb3262b,shininess:40})),bx(loco,16.05,.4,3.05,0,1.5,0,new THREE.MeshLambertMaterial({color:0xe8c23a}))]; loco.visible=false; scene.add(loco); FREIGHT.push(loco); swapIn(loco,'towar_lok',lb);
    for(let i=0;i<22;i++){ const w=new THREE.Group(); const wb=[bx(w,13,2.4,2.9,0,.6,0,new THREE.MeshLambertMaterial({color:i%3?0x4a3a2f:0x5a4a3c})),bx(w,12.6,.6,2.6,0,2.8,0,new THREE.MeshLambertMaterial({color:0x1b1b1d}))]; w.traverse(o=>{if(o.isMesh)o.castShadow=true;}); w.visible=false; scene.add(w); FREIGHT.push(w); swapIn(w,'towar_wag',wb); } }
  const FR_OFF=FREIGHT.map((w,i)=>i?15+(i-1)*13.4:0);
  // rozkład: pociągi przejeżdżają co kilka minut, między przejazdami tory są puste
  const TRAIN_SCHED={pas:{v:26,P:0,span:0,horn:false},fr:{v:17,P:0,span:0,horn:false}};

  /* ---------- autobus Gepard: wspólny rozkład (zegar ścienny) i jazda pasażerem ---------- */
  const BUSP={stops:null,T:0,seg:null,dwell:14,v:14,tail:25}; const BUSR={on:false,note:0};
  function busPlan(){ if(BUSP.stops) return; const s2=[...BUS_STOPS].sort((a,b)=>a-b).filter((d,i,a)=>!i||d-a[i-1]>5); BUSP.stops=s2; let t=0,d=0; const seg=[];
    s2.forEach(sd=>{ const tt=(sd-d)/BUSP.v; seg.push({t0:t,t1:t+tt,d0:d,d1:sd,mv:true}); t+=tt; seg.push({t0:t,t1:t+BUSP.dwell,d0:sd,d1:sd,mv:false,stop:sd}); t+=BUSP.dwell; d=sd; });
    const tt=(DK.L-d)/BUSP.v; seg.push({t0:t,t1:t+tt,d0:d,d1:DK.L,mv:true}); t+=tt; seg.push({t0:t,t1:t+BUSP.tail,d0:DK.L,d1:DK.L,mv:false,hid:true}); t+=BUSP.tail; BUSP.seg=seg; BUSP.T=t; }
  function busAt(sec){ busPlan(); const T=BUSP.T||1; const t=((sec%T)+T)%T; const s=BUSP.seg.find(x=>t>=x.t0&&t<x.t1)||BUSP.seg[0]; const k=(t-s.t0)/Math.max(.001,s.t1-s.t0); return {d:s.d0+(s.d1-s.d0)*(s.mv?k:0),v:s.mv?BUSP.v:0,wait:s.mv?0:s.t1-t,hid:!!s.hid}; }
  function busEta(stopD){ busPlan(); const T=BUSP.T||1, s=BUSP.seg.find(x=>x.stop===stopD); if(!s) return null; const now=(Date.now()/1000)%T; return ((s.t0-now)+T)%T; }
  const BUS_FARE=4;
  function nearBusBoard(){ return !BUSR.on&&!st.car&&!st.inside&&!MP.ride&&BUS.g.visible&&BUS.wait>0&&Math.hypot(BUS.x-st.x,BUS.z-st.z)<9; }
  function busBoard(){ if(st.money<BUS_FARE){ toast('Bilet kosztuje '+BUS_FARE+' zł - nie masz tyle',2); return; } addMoney(-BUS_FARE); BUSR.on=true; MP.last=''; player.visible=false; toast('🚌 Jedziesz autobusem Gepard (bilet '+BUS_FARE+' zł) - wysiądziesz na przystanku (E)',3); }
  function busLeave(force){ if(!BUSR.on) return; if(!force&&BUS.wait<=0){ toast('Wysiądź na najbliższym przystanku',2); return; } BUSR.on=false; MP.last=''; player.visible=st.mode!==1; for(const sg of [1,-1]){ for(const r of [4.5,6,8]){ const x=BUS.x+Math.sin(BUS.h)*r*sg, z=BUS.z-Math.cos(BUS.h)*r*sg; if(!blocked(x,z,.4)){ st.x=x; st.z=z; return; } } } }
  function busTick(dt){ if(BUSR.on){ if(!BUS.g.visible){ busLeave(true); toast('Koniec trasy',2); return; } st.x=BUS.x; st.z=BUS.z; st.vx=0; st.vz=0; st.gy=0; st.jy=0; st.vy=0; player.visible=false; }
    else if(!st.car&&!st.inside&&BUS.g.visible&&tAll-BUSR.note>25){ for(const sd of BUS_STOPS){ const s=sampleLine(DK.pts,DK.len,sd); if(Math.hypot(s.x-st.x,s.z-st.z)<14){ const e=busEta(sd); if(e!==null){ BUSR.note=tAll; toast(`🚌 Przystanek PKS · autobus Gepard ${BUS.wait>0&&Math.abs(BUS.d-sd)<3?'stoi teraz - wsiądź (E)':'przyjedzie za '+Math.round(e)+' s'} · bilet ${BUS_FARE} zł`,4); } break; } } } }
  /* ---------- policja ---------- */
  const COPS=[];
  function makeCop(){ const g=makeCar(0xf2f2f0,''); const stripe=new THREE.Mesh(new THREE.BoxGeometry(3.9,.14,1.82),new THREE.MeshLambertMaterial({color:0x1f4fa3})); stripe.position.y=.66; g.add(stripe);
    const bar=new THREE.Group(); const r=new THREE.Mesh(new THREE.BoxGeometry(.3,.15,.5),new THREE.MeshBasicMaterial({color:0xff2020})), b=new THREE.Mesh(new THREE.BoxGeometry(.3,.15,.5),new THREE.MeshBasicMaterial({color:0x2040ff})); r.position.z=.3; b.position.z=-.3; bar.add(r,b); bar.position.set(-.45,1.53,0); g.add(bar);
    const pt=tex(256,48,(x)=>{ x.fillStyle='#1f4fa3'; x.fillRect(0,0,256,48); x.fillStyle='#fff'; x.font='700 34px Barlow, Arial'; x.textAlign='center'; x.fillText('POLICJA',128,36); }); [.94,-.94].forEach(z=>{ const p=new THREE.Mesh(new THREE.PlaneGeometry(2.2,.4),new THREE.MeshBasicMaterial({map:pt})); p.position.set(0,.66,z*.98); if(z<0)p.rotation.y=Math.PI; g.add(p); });
    const light=new THREE.PointLight(0xff2020,0,25,2); light.position.set(0,2.4,0); g.add(light); g.userData.bar=[r,b]; g.userData.light=light; return g; }
  function spawnCop(){ for(let t=0;t<40;t++){ const r=pick(ROADS.filter(q=>q.t!=='track'&&q.L>60)); const s=sampleLine(r.pts,r.len,R(0,r.L)); const d=Math.hypot(s.x-st.x,s.z-st.z); if(d<45||d>200||blocked(s.x,s.z,2))continue; const g=makeCop(); scene.add(g); COPS.push({g,x:s.x,z:s.z,h:Math.atan2(st.z-s.z,st.x-s.x),v:0,hitT:-9,far:0}); return; } }
  let copHitT=-9, trafficHitT=-9;

  await LP(86);
  /* ---------- czas, pogoda, pory roku ---------- */
  const SEASONS=['wiosna','lato','jesień','zima'], WEATHERS=['słonecznie','deszcz','mgła','śnieg'];
  const ENV={time:14,speed:1/240,season:2,weather:0,wTimer:240,quality:2,lastNight:null};
  const crownBase=[]; for(let i=0;i<crownD.count;i++){ crownD.getColorAt(i,col); crownBase.push(col.getHex()); }
  function applySeason(){ const s=ENV.season; const pal={0:['#7fb24a','#8cc152','#6fa83e','#9bc95c','#f2b8c8','#f7f2f0'],1:['#3f7a2a','#4a8a32','#356f26','#5a9638','#2f6a24'],3:['#6b5d50','#75685a','#5e5348','#827466']}[s];
    for(let i=0;i<crownD.count;i++){ crownD.setColorAt(i,col.set(s===2?crownBase[i]:pal[Math.floor(hash(i)*pal.length)])); } crownD.instanceColor.needsUpdate=true;
    for(let i=0;i<crownC.count;i++){ crownC.getColorAt(i,col); }
    const snow=s===3; if(GROUND) GROUND.material.emissive.set(snow?0x7a8288:0x000000); [hips,gabs,flats].forEach(m=>m.material.emissive.set(snow?0x6a6e72:0x000000)); crownC.material.emissive.set(snow?0x3a4044:0x000000);
    if(GROUND) GROUND.material.color.set(s===1?0xd8e8c4:s===0?0xd0ecc0:0xffffff); BALES.visible=s===1||s===2;
    if(s===3&&ENV.weather===1) ENV.weather=3; if(s!==3&&ENV.weather===3) ENV.weather=1; updButtons(); }
  // cząsteczki deszczu i śniegu
  const PN=5000, pPos=new Float32Array(PN*3); for(let i=0;i<PN;i++){ pPos[i*3]=R(-60,60); pPos[i*3+1]=R(0,40); pPos[i*3+2]=R(-60,60); }
  const pGeo=new THREE.BufferGeometry(); pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3)); const flakeTex=tex(32,32,(x)=>{ const g=x.createRadialGradient(16,16,0,16,16,16); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.5,'rgba(255,255,255,.6)'); g.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=g; x.fillRect(0,0,32,32); });
  const pMat=new THREE.PointsMaterial({color:0xaabbcc,size:.12,map:flakeTex,transparent:true,opacity:.6,depthWrite:false}); const PARTS=new THREE.Points(pGeo,pMat); PARTS.frustumCulled=false; scene.add(PARTS);
  const cA=new THREE.Color(), cB=new THREE.Color();
  function lerpHex(a,b,t){ cA.set(a); cB.set(b); return cA.lerp(cB,t); }
  function envUpdate(dt){ /* pełna doba: w grze samotnej noc (22-4:30) płynie 2,5x szybciej; w wieloosobowej czas liczony ze wspólnego zegara, więc wszyscy mają tę samą porę */ if(ENV.fixed) ENV.time=((Date.now()/1000)*ENV.speed+14)%24; else ENV.time=(ENV.time+dt*ENV.speed*((ENV.time>22||ENV.time<4.5)?2.5:1)+24)%24; const a=(ENV.time-6)/12*Math.PI; const se=Math.sin(a); const k=clamp((se+0.08)/0.33,0,1); const dusk=se>-0.12?clamp(1-Math.abs(se)/0.32,0,1):0;
    if(se>-0.05) SUNDIR.set(Math.cos(a)*0.75,Math.max(0.06,se*0.8),0.55).normalize(); else { const ma=a-Math.PI; SUNDIR.set(Math.cos(ma)*0.6,Math.max(0.22,Math.sin(ma)*0.7),-0.5).normalize(); } const moon=clamp((-0.05-se)/0.2,0,1); skyU.sunDir.value.copy(SUNDIR);
    const w=ENV.weather; if(!ENV.W){ ENV.W=[0,0,0,0]; ENV.W[w]=1; } for(let i=0;i<4;i++) ENV.W[i]+=((i===w?1:0)-ENV.W[i])*Math.min(1,dt/7); const Wt=ENV.W, wet=1-Wt[0]; const wl=Wt[0]+Wt[1]*.62+Wt[2]*.75+Wt[3]*.85;
    skyU.hor.value.copy(lerpHex(NIGHT.hor,DAY.hor,k)).lerp(cB.set(0xff8a4a),dusk*.55).lerp(cB.set(0x9aa3aa),(Wt[1]+Wt[2])*.6+Wt[3]*.5); skyU.zen.value.copy(lerpHex(NIGHT.zen,DAY.zen,k)).lerp(cB.set(0x7d868d),wet*.55*k); skyU.night.value=1-k;
    scene.fog.color.copy(lerpHex(NIGHT.fog,DAY.fog,k)).lerp(cB.set(0xe08a5a),dusk*.35).lerp(cB.set(0xa9b0b4),wet*.6*k);
    scene.fog.near=Wt[0]*190+Wt[1]*50+Wt[2]*12+Wt[3]*40; scene.fog.far=Wt[0]*1000+Wt[1]*380+Wt[2]*170+Wt[3]*320; if(st.inside){ scene.fog.near=80; scene.fog.far=600; } // w budynku bez mgły z pogody
    hemi.intensity=(NIGHT.hemi+(DAY.hemi-NIGHT.hemi)*k)*wl*HK; skyU.t.value=tAll; skyU.cov.value=clamp(.4*Wt[0]+.9*Wt[1]+.97*Wt[2]+.85*Wt[3],0,1); if(tAll-envT>12){ envT=tAll; envRefresh(); } { const wr=clamp(Wt[1]*1.15,0,1); WETM.forEach(m=>{ if(m.roughness!==undefined){ m.roughness=.82-.62*wr; m.envMapIntensity=.38+1.3*wr; m.color.setScalar(1-.3*wr); } }); } sun.intensity=(se>-0.05?1.5*clamp(se/.42,0,1)*(1-dusk*.35):0.3*moon)*wl*(1-.5*Wt[2]); LAMPGLOW.material.opacity=.3*(1-k); LAMPGLOW.visible=k<.98&&!st.inside; sun.color.copy(lerpHex(0xff9a5a,DAY.sunC,clamp(se*3,0,1))); if(se<=-0.05) sun.color.set(0x9fb4ff);
    if(bloom) bloom.strength=NIGHT.bloom+(DAY.bloom-NIGHT.bloom)*k; if(grade){ grade.uniforms.exposure.value=NIGHT.exp+(DAY.exp-NIGHT.exp)*k; grade.uniforms.night.value=1-k; }
    const night=k<0.35; if(night!==ENV.lastNight){ ENV.lastNight=night; st.night=night; applyNight(); candleMat.emissive.set(0x000000); }
    flameIM.visible=k<0.75; flameMat.color.set(night?0xffc060:0xffb347);
    // cząsteczki
    const pint=Math.max(Wt[1],Wt[3]), snowy=Wt[3]>Wt[1]; PARTS.visible=pint>.02; if(PARTS.visible){ pGeo.setDrawRange(0,Math.floor(PN*pint)); const sp=snowy?2.2:22; pMat.size=snowy?.11:.05; pMat.color.set(snowy?0xffffff:0x9fb2c4); pMat.opacity=(snowy?.9:.55)*Math.min(1,pint*1.3); const cx=camera.position.x, cy=camera.position.y, cz=camera.position.z;
      for(let i=0;i<PN;i++){ let y=pPos[i*3+1]-sp*dt; if(snowy){ pPos[i*3]+=Math.sin(tAll+i)*dt*.6; } if(y<cy-15){ y=cy+25; pPos[i*3]=cx+R(-60,60); pPos[i*3+2]=cz+R(-60,60); } if(Math.abs(pPos[i*3]-cx)>60) pPos[i*3]=cx+R(-60,60); if(Math.abs(pPos[i*3+2]-cz)>60) pPos[i*3+2]=cz+R(-60,60); pPos[i*3+1]=y; } pGeo.attributes.position.needsUpdate=true; }
    ENV.wTimer-=dt; if(ENV.wTimer<0){ ENV.wTimer=R(180,360); const r=rnd(); ENV.weather=ENV.season===3?(r<.5?3:r<.75?0:2):(r<.55?0:r<.8?1:2); updButtons(); toast('Pogoda: '+WEATHERS[ENV.weather],2.5); }
    const hh=Math.floor(ENV.time), mm=Math.floor((ENV.time-hh)*60); clockEl.textContent=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
    // rutyna mieszkańców: w nocy na ulicach mniej ludzi
    const frac=(ENV.time<5.5||ENV.time>22.5)?.15:(ENV.time<7||ENV.time>20.5)?.5:1; peds.forEach((p,i)=>{ p.g.visible=hash(i)<frac; });
    BUS.day=ENV.time>5&&ENV.time<23; }
  toggleNight=function(){ if(ENV.fixed){ toast('W trybie wieloosobowym pora dnia jest wspólna dla wszystkich',2); return; } ENV.time=(ENV.time>=6&&ENV.time<16.5)?17.6:11; toast(ENV.time>12?'Przewinięto do wieczora':'Przewinięto do południa',2); };

  /* ---------- dźwięk: otoczenie, silnik, radio ---------- */
  const AU={ctx:null,on:false,master:null,noise:null,rain:null,eng:null,engG:null,siren:null,sirG:null,radioG:null,station:0,next:0,step:0,amb:2};
  function audioStart(){ if(AU.ctx){ AU.on=!AU.on; AU.userOff=!AU.on; AU.master.gain.value=AU.on?.6:0; updButtons(); return; }
    try{ const C=new (window.AudioContext||window.webkitAudioContext)(); AU.ctx=C; AU.master=C.createGain(); AU.master.gain.value=.6; AU.master.connect(C.destination); AU.on=true;
      const nb=C.createBuffer(1,C.sampleRate*2,C.sampleRate), d=nb.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; AU.noise=nb;
      { const bb=C.createBuffer(1,C.sampleRate*4,C.sampleRate), bd=bb.getChannelData(0); let last=0; for(let i=0;i<bd.length;i++){ const w=Math.random()*2-1; last=(last+.02*w)/1.02; bd[i]=last*3.2; } const rn=C.createBufferSource(); rn.buffer=bb; rn.loop=true; const hp=C.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=180; const rf=C.createBiquadFilter(); rf.type='lowpass'; rf.frequency.value=2600; rf.Q.value=.3; AU.rain=C.createGain(); AU.rain.gain.value=0; rn.connect(hp); hp.connect(rf); rf.connect(AU.rain); AU.rain.connect(AU.master); rn.start(); }
      AU.eng=C.createOscillator(); AU.eng.type='sawtooth'; const ef=C.createBiquadFilter(); ef.type='lowpass'; ef.frequency.value=420; AU.engG=C.createGain(); AU.engG.gain.value=0; AU.eng.connect(ef); ef.connect(AU.engG); AU.engG.connect(AU.master); AU.eng.start();
      AU.siren=C.createOscillator(); AU.siren.type='triangle'; AU.sirG=C.createGain(); AU.sirG.gain.value=0; AU.siren.connect(AU.sirG); AU.sirG.connect(AU.master); AU.siren.start();
      AU.radioG=C.createGain(); AU.radioG.gain.value=0; AU.radioG.connect(AU.master); AU.next=C.currentTime+.1; natureInit(); }catch(e){ toast('Dźwięk niedostępny w tej przeglądarce',3); } updButtons(); }
  function tone(type,f,t,dur,vol,dest,f2){ const C=AU.ctx; const o=C.createOscillator(), g=C.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.01); g.gain.exponentialRampToValueAtTime(.0001,t+dur); o.connect(g); g.connect(dest||AU.master); o.start(t); o.stop(t+dur+.05); }
  function noiseHit(t,dur,vol,ftype,freq,dest){ const C=AU.ctx; const s=C.createBufferSource(); s.buffer=AU.noise; const f=C.createBiquadFilter(); f.type=ftype; f.frequency.value=freq; const g=C.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur); s.connect(f); f.connect(g); g.connect(dest||AU.master); s.start(t,Math.random()); s.stop(t+dur); }
  const sfx={ bird(){ const t=AU.ctx.currentTime; const b=R(2600,3800); for(let i=0;i<3+Math.floor(R(0,3));i++) tone('sine',b,t+i*.13,.09,.035,null,b*1.4); },
    cricket(){ const t=AU.ctx.currentTime; for(let i=0;i<6;i++) tone('square',4400,t+i*.05,.03,.008); },
    dog(){ const t=AU.ctx.currentTime; for(let i=0;i<2;i++){ tone('sawtooth',420,t+i*.28,.18,.05,null,180); noiseHit(t+i*.28,.15,.06,'bandpass',700); } },
    bell(n){ const t=AU.ctx.currentTime; for(let k=0;k<n;k++) [1,2,2.4,3,4.2].forEach((m,j)=>tone('sine',196*m,t+k*1.6,3,.05/(j+1))); },
    horn(v){ v=v===undefined?1:v; if(v<.02)return; const t=AU.ctx.currentTime; tone('sawtooth',311,t,1.4,.05*v); tone('sawtooth',370,t,1.4,.05*v); },
    schoolBell(){ const t=AU.ctx.currentTime; for(let k=0;k<44;k++) tone('square',1046+(k%2)*14,t+k*.055,.05,.022); },
    cash(){ const t=AU.ctx.currentTime; tone('square',1320,t,.08,.05); tone('square',1760,t+.08,.18,.05); },
    win(){ const t=AU.ctx.currentTime; [523,659,784,1047].forEach((f,i)=>tone('square',f,t+i*.12,.25,.05)); } };
  /* ---------- muzyka w aucie: 4 stacje z prawdziwą perkusją, basem, akordami i melodią ---------- */
  const NOTE=n=>440*Math.pow(2,(n-69)/12);
  const STN=[
    {n:'Trębaczew FM',g:'synth-pop',bpm:112,prog:[[57,60,64],[53,57,60],[48,52,55],[55,59,62]],hook:[0,null,2,null,4,null,2,0,null,0,5,4,2,null,0,null],sw:0},
    {n:'Disco Polo 42',g:'disco polo',bpm:128,prog:[[48,52,55],[55,59,62],[57,60,64],[53,57,60]],hook:[4,4,5,4,2,null,0,null,2,2,4,2,0,null,null,null],sw:0},
    {n:'Radio Pola',g:'lo-fi',bpm:78,prog:[[50,53,57,60],[55,59,62,65],[48,52,55,59],[57,60,64,67]],hook:[2,null,null,1,0,null,null,null,3,null,2,null,1,null,null,null],sw:.16},
    {n:'DK42 Rap',g:'boom bap',bpm:90,prog:[[48,51,55],[44,48,51],[51,55,58],[46,50,53]],hook:[0,null,null,0,2,null,0,null,null,null,4,null,2,null,null,null],sw:.12}];
  const STATIONS=STN.map(s=>s.n).concat(['Radio wyłączone']); const OFF=STN.length;
  function vOsc(type,f,t,dur,vol,dest,o){ o=o||{}; const C=AU.ctx; const osc=C.createOscillator(), g=C.createGain(); osc.type=type; osc.frequency.setValueAtTime(f,t); if(o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2,t+(o.gl||dur)); if(o.det) osc.detune.value=o.det;
    let node=osc; if(o.lp){ const fl=C.createBiquadFilter(); fl.type='lowpass'; fl.Q.value=o.q||1; fl.frequency.setValueAtTime(o.lp,t); if(o.lp2) fl.frequency.exponentialRampToValueAtTime(o.lp2,t+(o.lpt||dur)); osc.connect(fl); node=fl; }
    const a=o.a||.005; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+a); g.gain.setValueAtTime(vol,t+Math.max(a,dur*(o.hold||.3))); g.gain.exponentialRampToValueAtTime(.0001,t+dur); node.connect(g); g.connect(dest); osc.start(t); osc.stop(t+dur+.05); }
  const DR={ kick(t,v,d){ vOsc('sine',160,t,.32,v,d,{f2:42,gl:.11,hold:.1}); noiseHit(t,.02,v*.25,'highpass',3000,d); },
    snare(t,v,d){ noiseHit(t,.2,v*.7,'bandpass',1900,d); vOsc('triangle',200,t,.12,v*.45,d,{f2:150}); },
    clap(t,v,d){ [0,.012,.024].forEach(o=>noiseHit(t+o,.09,v*.55,'bandpass',1400,d)); },
    hat(t,v,d,open){ noiseHit(t,open?.22:.035,v,'highpass',8500,d); },
    rim(t,v,d){ vOsc('square',1700,t,.03,v*.4,d); } };
  function musicStep(t,step){ const s=STN[AU.station]; if(!s)return; const d=AU.radioIn; const spb=60/s.bpm/4; const b=step%16, bar=Math.floor(step/16), cyc=bar%16, ch=s.prog[bar%4];
    if(b%2===1) t+=s.sw*spb;                                        // swing
    const full=cyc>=4, lead=cyc>=8, fill=(bar%8===7)&&b>=12;
    if(s.g==='synth-pop'){ if(b===0||b===8||(b===10&&full)) DR.kick(t,.55,d); if(full&&(b===4||b===12)) DR.snare(t,.35,d); if(b%2===0) DR.hat(t,.05,d); if(fill) DR.snare(t,.22,d);
      if(b%2===0) vOsc('sawtooth',NOTE(ch[0]-24),t,spb*1.8,.11,d,{lp:500,lp2:180,q:4});
      if(b===0) ch.forEach((n,i)=>{ vOsc('sawtooth',NOTE(n),t,spb*15,.022,d,{lp:1400,a:.25,hold:.8,det:-8}); vOsc('sawtooth',NOTE(n),t,spb*15,.022,d,{lp:1400,a:.25,hold:.8,det:8}); });
      if(full) vOsc('sawtooth',NOTE(ch[b%3]+12+(b>=8?12:0)),t,spb*.9,.03,d,{lp:3200,lp2:500,q:6});
      const hk=s.hook[b]; if(lead&&hk!==null) vOsc('square',NOTE(ch[0]+12+[0,2,3,5,7,8,10][hk%7]),t,spb*1.6,.035,d,{lp:2400}); }
    else if(s.g==='disco polo'){ if(b%4===0) DR.kick(t,.6,d); if(b%4===2) DR.hat(t,.07,d,true); if(full&&(b===4||b===12)) DR.clap(t,.4,d); if(fill&&b%2===0) DR.snare(t,.25,d);
      if(b%4===2) vOsc('square',NOTE(ch[0]-12),t,spb*1.6,.075,d,{lp:900}); if(b%4===0) vOsc('square',NOTE(ch[0]-24),t,spb*1.2,.06,d,{lp:500});
      if(b%4===2&&full) ch.forEach(n=>vOsc('sawtooth',NOTE(n+12),t,spb*1.2,.018,d,{lp:2600}));
      const hk=s.hook[b]; if(lead&&hk!==null){ vOsc('square',NOTE(ch[0]+24+[0,2,4,5,7,9,11][hk%7]),t,spb*1.8,.03,d,{lp:3500}); vOsc('triangle',NOTE(ch[0]+24+[0,2,4,5,7,9,11][hk%7]),t,spb*1.8,.03,d,{det:7}); } }
    else if(s.g==='lo-fi'){ if(b===0||b===10) DR.kick(t,.4,d); if(full&&(b===4||b===12)) DR.rim(t,.4,d), DR.snare(t,.12,d); if(b%2===0) DR.hat(t,.025,d);
      if(b===0) ch.forEach((n,i)=>{ vOsc('sine',NOTE(n),t+i*.03,spb*14,.035,d,{a:.02,hold:.2}); vOsc('triangle',NOTE(n+12),t+i*.03,spb*6,.008,d); });
      if(b===0||b===7) vOsc('sine',NOTE(ch[0]-24),t,spb*5,.12,d,{hold:.4});
      const hk=s.hook[b]; if(lead&&hk!==null) vOsc('triangle',NOTE(ch[0]+12+[0,2,3,5,7,9,10][hk%7]),t,spb*3,.03,d,{a:.02}); }
    else { if(b===0||b===3||b===10) DR.kick(t,.65,d); if(b===4||b===12) DR.snare(t,.45,d); if(b%2===0) DR.hat(t,b%4===2?.06:.035,d); if(fill&&b===14) DR.snare(t,.3,d);
      if(b===0||b===3||b===10) vOsc('sine',NOTE(ch[0]-24),t,spb*3,.18,d,{f2:NOTE(ch[0]-24)*.98});
      if(b%4===0) vOsc('triangle',NOTE(ch[(b/4)%3]+12),t,spb*2.5,.04,d,{a:.003,hold:.05});
      const hk=s.hook[b]; if(lead&&hk!==null) vOsc('square',NOTE(ch[0]+24+[0,3,5,7,10][hk%5]),t,spb*.8,.018,d,{lp:1800}); } }

  /* ---------- przyroda: wiatr, liście, ptaki, kukułka, wrony, dzięcioł, kogut, krowy, żaby, sowa, świerszcze ---------- */
  function natureInit(){ const C=AU.ctx; const mk=(type,f,q)=>{ const s=C.createBufferSource(); s.buffer=AU.noise; s.loop=true; const fl=C.createBiquadFilter(); fl.type=type; fl.frequency.value=f; fl.Q.value=q||.7; const g=C.createGain(); g.gain.value=0; s.connect(fl); fl.connect(g); g.connect(AU.master); s.start(); return {g,fl}; };
    AU.wind=mk('lowpass',380); AU.leaves=mk('bandpass',3200,.5); AU.crick=mk('bandpass',4600,8);
    const lfo=C.createOscillator(); lfo.frequency.value=13; const lg=C.createGain(); lg.gain.value=.5; lfo.connect(lg); const am=C.createGain(); am.gain.value=.5; lg.connect(am.gain); AU.crick.g.disconnect(); AU.crick.g.connect(am); am.connect(AU.master); lfo.start();
    AU.radioIn=C.createGain(); const comp=C.createDynamicsCompressor(); comp.threshold.value=-20; comp.ratio.value=5; AU.radioIn.connect(comp); comp.connect(AU.radioG); }
  function pan(x){ const C=AU.ctx; const p=C.createStereoPanner?C.createStereoPanner():null; if(!p)return AU.master; p.pan.value=x; p.connect(AU.master); return p; }
  const NAT={
    blackbird(){ const t=AU.ctx.currentTime, d=pan(R(-.8,.8)); let f=R(1400,2200); for(let i=0;i<5+Math.floor(R(0,4));i++){ const f2=f*R(.75,1.35); tone('sine',f,t+i*.16,.14,.03,d,f2); f=clamp(f2,1100,3200); } },
    sparrow(){ const t=AU.ctx.currentTime, d=pan(R(-.8,.8)); for(let i=0;i<4+Math.floor(R(0,6));i++) tone('sine',R(3800,5200),t+i*R(.07,.12),.05,.025,d,R(3000,4600)); },
    lark(){ const t=AU.ctx.currentTime, d=pan(R(-.5,.5)); for(let i=0;i<22;i++) tone('sine',R(2800,4600),t+i*.06,.05,.016,d,R(2600,5000)); },
    cuckoo(){ const t=AU.ctx.currentTime, d=pan(R(-1,1)); for(let k=0;k<3;k++){ tone('sine',680,t+k*.9,.22,.035,d,660); tone('sine',560,t+k*.9+.26,.32,.035,d,540); } },
    crow(){ const t=AU.ctx.currentTime, d=pan(R(-1,1)); for(let k=0;k<2+Math.floor(R(0,2));k++){ tone('sawtooth',R(420,520),t+k*.42,.3,.03,d,R(300,380)); noiseHit(t+k*.42,.25,.04,'bandpass',900,d); } },
    woodpecker(){ const t=AU.ctx.currentTime, d=pan(R(-1,1)); for(let k=0;k<14;k++) noiseHit(t+k*.045,.02,.08*(1-k/20),'bandpass',1100,d); },
    rooster(){ const t=AU.ctx.currentTime, d=pan(R(-1,1)); [[520,.18],[700,.22],[760,.5],[560,.4]].reduce((a,[f,du])=>{ tone('sawtooth',f,t+a,du,.03,d,f*.92); return a+du*.9; },0); },
    cow(){ const t=AU.ctx.currentTime, d=pan(R(-1,1)); tone('sawtooth',125,t,1.6,.05,d,95); tone('sawtooth',250,t,1.6,.015,d,190); },
    frog(){ const t=AU.ctx.currentTime, d=pan(R(-1,1)); for(let k=0;k<6;k++) tone('square',R(260,320),t+k*.11,.06,.02,d,200); },
    owl(){ const t=AU.ctx.currentTime, d=pan(R(-1,1)); tone('sine',420,t,.35,.04,d,380); tone('sine',400,t+.6,.25,.03,d,390); tone('sine',410,t+.95,.55,.04,d,360); },
    dog(){ sfx.dog(); } };
  let envCache={t:-9,forest:false,water:false,farm:false,houses:0};
  function natureEnv(){ if(tAll-envCache.t<2)return envCache; const x=st.car?st.car.x:st.x, z=st.car?st.car.z:st.z; envCache.t=tAll;
    envCache.forest=AREAS.some(a=>a.t==='nat:wood'&&Math.abs(centroid(a.pts)[0]-x)<900&&inPolyNear(a,x,z,60));
    envCache.water=AREAS.some(a=>a.t==='nat:water'&&inPolyNear(a,x,z,120)); envCache.houses=houses.filter(h=>Math.abs(h.x-x)<60&&Math.abs(h.z-z)<60).length; envCache.farm=houses.some(h=>h.kind==='farm'&&Math.abs(h.x-x)<120&&Math.abs(h.z-z)<120); return envCache; }
  function inPolyNear(a,x,z,m){ if(!a.bb)a.bb=bbox(a.pts); if(x<a.bb[0]-m||x>a.bb[2]+m||z<a.bb[1]-m||z>a.bb[3]+m)return false; return inPoly(x,z,a.pts)||[[m,0],[-m,0],[0,m],[0,-m]].some(([dx,dz])=>inPoly(x+dx,z+dz,a.pts)); }
  const CH_SHOP=[[261.6,329.6,392,493.9],[220,261.6,329.6,392],[293.7,349.2,440,523.3],[196,246.9,293.7,349.2]], PENTA=[523.3,587.3,659.3,784,880,1046.5];
  const CH_ORG=[[130.8,196,261.6,329.6],[174.6,220,261.6,349.2],[196,246.9,293.7,392],[130.8,196,261.6,329.6],[110,164.8,220,261.6],[174.6,220,261.6,349.2],[196,246.9,293.7,349.2],[130.8,196,261.6,329.6]];
  function organTone(f,t,dur,vol){ const C=AU.ctx; [['sine',1,vol],['sine',2,vol*.5],['square',1,vol*.12]].forEach(([ty,m,v])=>{ const o=C.createOscillator(), g=C.createGain(); o.type=ty; o.frequency.value=f*m; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+.25); g.gain.setValueAtTime(v,t+dur-.4); g.gain.linearRampToValueAtTime(0,t+dur); o.connect(g); g.connect(AU.musG); o.start(t); o.stop(t+dur+.05); }); }
  function storeStep(kind,t,i){ const d=AU.musG;
    if(kind==='organ'){ if(i%8===0){ const ch=CH_ORG[Math.floor(i/8)%CH_ORG.length]; ch.forEach(f=>organTone(f,t,4.1,.012)); organTone(ch[0]/2,t,4.1,.016); } return; }
    const key=kind==='rest'?1.335:1, bar=Math.floor(i/8)%4, s=i%8, ch=CH_SHOP[bar].map(f=>f*key);
    if(kind==='rest'){ if(s%2===0) tone('triangle',ch[0]/2*(s%4?1.5:1),t,.22,.045,d); else ch.slice(1).forEach(f=>tone('square',f,t,.12,.004,d)); if(rnd()<.5) tone('triangle',PENTA[Math.floor(rnd()*PENTA.length)]*key,t,.18,.013,d); return; }
    if(s===0||s===3||s===6) ch.forEach(f=>{ tone('sine',f,t,.55,.016,d); tone('triangle',f*2,t,.25,.003,d); });
    if(s===0) tone('triangle',ch[0]/2,t,.4,.05,d); if(s===4) tone('triangle',ch[2]/2,t,.4,.045,d);
    if((s===2||s===5||s===7)&&rnd()<.45) tone('sine',PENTA[Math.floor(rnd()*PENTA.length)],t,.3,.012,d); }
  // przestrzenny dźwięk aut: 4 najbliższe pojazdy mają własny silnik i szum opon; głośność maleje z odległością, panorama liczona względem kamery
  const CARV={v:[],fw:new THREE.Vector3()};
  function carVoices(){ const C=AU.ctx; if(!CARV.v.length){ for(let i=0;i<4;i++){ const o=C.createOscillator(); o.type='triangle'; o.frequency.value=40; const lp=C.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=260; const ns=C.createBufferSource(); ns.buffer=AU.noise; ns.loop=true; const bp=C.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=500; bp.Q.value=.6; const ng=C.createGain(); ng.gain.value=0; const g=C.createGain(); g.gain.value=0; const pn=C.createStereoPanner?C.createStereoPanner():null;
      o.connect(lp); lp.connect(g); ns.connect(bp); bp.connect(ng); ng.connect(g); if(pn){ g.connect(pn); pn.connect(AU.master); } else g.connect(AU.master); o.start(); ns.start(0,Math.random()); CARV.v.push({o,g,pn,ng,bp}); } }
    const lx=camera.position.x, lz=camera.position.z; camera.getWorldDirection(CARV.fw); const fl=Math.hypot(CARV.fw.x,CARV.fw.z)||1, rx=-CARV.fw.z/fl, rz=CARV.fw.x/fl;
    const src=[], R0=70, add=(x,z,v,k,vis)=>{ if(vis===false)return; const d=Math.hypot(x-lx,z-lz); if(d<R0) src.push({x,z,v:Math.abs(v||0),k,d}); };
    if(!st.inside&&GAME.started){ cars.forEach(c=>add(c.x,c.z,c.v,1,c.g.visible)); add(BUS.x,BUS.z,BUS.v,1.4,BUS.g.visible); TRACTORS.forEach(t=>add(t.x,t.z,t.v,1.2)); COPS.forEach(c=>add(c.x,c.z,c.v,1)); }
    src.sort((a,b)=>a.d-b.d); const now=C.currentTime, muf=st.car&&st.car.kind!=='bike'?.55:1;
    CARV.v.forEach((vo,i)=>{ const s=src[i]; let g=0; if(s){ const k=1-s.d/R0; g=s.v<1?0:.045*k*k*(.25+Math.min(1,s.v/14)*.75)*muf*(s.k>1.3?1.3:1);
        vo.o.frequency.setTargetAtTime((s.k>1.1?30:42)+s.v*2.6,now,.15); vo.bp.frequency.setTargetAtTime(300+s.v*25,now,.2); vo.ng.gain.setTargetAtTime(Math.min(1,s.v/10)*.9,now,.2);
        if(vo.pn){ const dx=s.x-lx, dz=s.z-lz, dl=Math.hypot(dx,dz)||1; vo.pn.pan.setTargetAtTime(clamp((dx*rx+dz*rz)/dl,-1,1)*.85,now,.1); } }
      vo.g.gain.setTargetAtTime(g,now,.12); }); }
  // pociąg słychać tylko, gdy przejeżdża w pobliżu: dudnienie i stukot kół zależne od odległości
  function trainRumble(){ const C=AU.ctx; if(!AU.rum){ const s=C.createBufferSource(); s.buffer=AU.noise; s.loop=true; const lp=C.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=150; const g=C.createGain(); g.gain.value=0; s.connect(lp); lp.connect(g); g.connect(AU.master); s.start(); AU.rum=g; AU.rumNext=0; }
    let dm=1e9; if(!st.inside&&GAME.started) [...train,...FREIGHT].forEach(w=>{ if(w.visible){ const d=Math.hypot(w.position.x-camera.position.x,w.position.z-camera.position.z); if(d<dm)dm=d; } });
    const k=Math.max(0,1-dm/220), t=C.currentTime; AU.rum.gain.setTargetAtTime(.22*k*k,t,.3);
    if(k>.4&&t>AU.rumNext){ AU.rumNext=t+.45; noiseHit(t,.05,.045*k*k,'lowpass',520); noiseHit(t+.1,.05,.035*k*k,'lowpass',520); } }
  function audioUpdate(dt){ if(!AU.ctx||!AU.on)return; const C=AU.ctx, now=C.currentTime;
    AU.rain.gain.value=0; // deszcz i grad bez dźwięku (szum i stukanie były nieprzyjemne)
    const inCar=st.car&&st.car.kind!=='bike'; AU.engG.gain.value=inCar?.05+Math.min(.06,Math.abs(st.car.v)*.003):0; if(inCar) AU.eng.frequency.value=(st.car.kind==='tractor'?28:38)+Math.abs(st.car.v)*(st.car.kind==='moto'?6:3.2);
    carVoices(); // pociąg jest bezgłośny (na życzenie): bez dudnienia, stukotu, sygnału i dzwonka przejazdu
    const copNear=COPS.some(c=>Math.hypot(c.x-st.x,c.z-st.z)<120); AU.sirG.gain.value=copNear?.035:0; if(copNear) AU.siren.frequency.value=800+Math.sin(now*3)*350;
    const radioOn=st.car&&st.car.kind!=='bike'&&st.car.kind!=='tractor'&&AU.station<OFF; AU.radioG.gain.value+=((radioOn?.85:0)-AU.radioG.gain.value)*Math.min(1,dt*3);
    const s=STN[AU.station]; const sp=60/(s?s.bpm:100)/4;
    if(AU.next<now-.3) AU.next=now+.05; while(AU.next<now+.15){ if(radioOn) musicStep(AU.next,AU.step); AU.step++; AU.next+=sp; }
    // muzyka w sklepach, pizzerii i organy w kościele
    { const mk=st.inside?(CUR===IN?'shop':({shop:'shop',zabka:'shop',counter:'shop',pharm:'shop',rest:'rest',church:'organ'})[CUR.kind]||null):null;
      if(!AU.musG){ AU.musG=C.createGain(); AU.musG.gain.value=0; const lp=C.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2600; AU.musG.connect(lp); lp.connect(AU.master); AU.mNext=now; AU.mStep=0; }
      AU.musG.gain.value+=((mk?(mk==='organ'?.4:.28):0)-AU.musG.gain.value)*Math.min(1,dt*2);
      if(mk){ const sp=mk==='organ'?.5:mk==='rest'?60/132/2:60/100/2; if(AU.mNext<now-.3) AU.mNext=now+.05; while(AU.mNext<now+.2){ storeStep(mk,AU.mNext,AU.mStep++); AU.mNext+=sp; } } }
    // tło przyrody: w aucie przytłumione
    const E=natureEnv(), day=ENV.time>5&&ENV.time<20.5, muf=st.inside?0:inCar?.25:1, gust=.6+.4*Math.sin(now*.23)*Math.sin(now*.071+1);
    if(AU.wind){ /* bez stałego szumu: wiatr słychać tylko podczas burzy */ AU.wind.g.gain.value=0; AU.wind.fl.frequency.value=180+gust*160;
      AU.leaves.g.gain.value=0; AU.crick.g.gain.value=0; }
    AU.amb-=dt; if(AU.amb<0&&!st.inside&&!st.car&&Math.hypot(st.vx||0,st.vz||0)>.5){ AU.amb=R(1.2,4); if(ENV.weather===1||ENV.weather===2){ if(rnd()<.2) NAT.crow(); return; } const h=ENV.time, r=rnd();
      if(day){ if(E.forest){ if(r<.35)NAT.blackbird(); else if(r<.5)NAT.cuckoo(); else if(r<.65)NAT.woodpecker(); else if(r<.8)NAT.sparrow(); }
        else if(E.houses>2){ if(r<.4)NAT.sparrow(); else if(r<.6)NAT.blackbird(); else if(r<.68&&h>4.5&&h<9)NAT.rooster(); else if(r<.8)NAT.dog(); }
        else { if(r<.35)NAT.lark(); else if(r<.5)NAT.crow(); else if(r<.6)NAT.cuckoo(); else if(r<.7&&E.farm)NAT.cow(); } }
      else { if(E.water&&r<.5)NAT.frog(); else if(E.forest&&r<.3)NAT.owl(); else if(E.houses>2&&r<.15)NAT.dog(); else if(r<.1)NAT.owl(); } } }
  function onCarEnter(){ const kind=st.car&&st.car.kind; if(kind==='bike')return; if(!AU.ctx){ audioStart(); } if(!AU.ctx)return; if(!AU.on&&!AU.userOff){ AU.on=true; AU.master.gain.value=.6; updButtons(); }
    if(AU.station>=OFF||!AU.picked){ AU.station=Math.floor(Math.random()*STN.length); AU.picked=true; } AU.step=0; AU.next=AU.ctx.currentTime+.25;
    if(kind!=='tractor') toast(`📻 <b>${STN[AU.station].n}</b><br>${STN[AU.station].g} · <kbd>R</kbd> zmienia stację`,3); }
  let lastBell=-1, lastHorn=-99;
  // jeden sygnał na przejazd, gdy czoło pociągu zbliża się do gracza (głośność zależna od odległości)
  function trainHorn(lead,S){ return; if(!lead.visible){ S.horn=false; return; } if(S.horn||st.inside||!AU.ctx||!AU.on)return; const px=st.car?st.car.x:st.x, pz=st.car?st.car.z:st.z, dh=Math.hypot(lead.position.x-px,lead.position.z-pz); if(dh<260){ S.horn=true; const k=1-dh/260; sfx.horn(k*k*(st.car?.6:1)); } }
  function extRadio(){ if(!st.car)return; AU.picked=true; AU.station=(AU.station+1)%STATIONS.length; toast('📻 '+STATIONS[AU.station],2); }

  /* ---------- sklepy: kupowanie ---------- */
  const SHOPS=[
    {n:'Lewiatan',get p(){ if(B_LEW.door) return B_LEW.door; const f=B_LEW.front; return [f.x+f.nx*2,f.z+f.nz*2]; },items:[['Hot-dog',8,'hp',40],['Napój energetyczny',6,'boost',60],['Woda mineralna',3,'hp',10],['Znicz',7,'znicz',0]]},
    {n:'Żabka',get p(){ const f=B_ZAB.front; return [f.x+f.nx*2,f.z+f.nz*2]; },items:[['Kawa z ekspresu',9,'hp',20],['Zapiekanka',12,'hp',50],['Napój energetyczny',6,'boost',60],['Hot-dog',8,'hp',40]]},
    {n:'Euforia Trębaczew',p:[-151,-344],items:[['Pizza',32,'hp',100],['Burger',24,'hp',70],['Frytki',10,'hp',25]]},
    {n:'Apteka Magnolia',p:[-94,-195],items:[['Plastry',6,'hp',25],['Witaminy',15,'hp',45]]},
];
  let SHOP_OPEN=null;
  // podgląd parametrów aut (komis i ekwipunek)
  function carStatsHtml(k,tune){ const C=CARS[k]; if(!C) return ''; const chip=tune&&tune.chip, v=C.v*(chip?1.15:1), a=C.a*(chip?1.25:1); const kmh=Math.round(v*3.6), t100=(27.8/a).toFixed(1), top=Math.round(72.5*1.15*3.6);
    return `<div class="cst"><span>Prędkość maks.</span><span><b style="color:#fff">${kmh} km/h</b>${!chip&&k==='bmw'?' (z chipem '+Math.round(C.v*1.15*3.6)+' km/h)':''}<div class="cb"><i style="width:${Math.min(100,kmh/top*100)}%"></i></div></span><span>Przyspieszenie</span><span><b style="color:#fff">0-100 km/h w ${t100} s</b><div class="cb"><i style="width:${Math.min(100,a/13.1*100)}%"></i></div></span></div>`; }
  const ITEM_ICO=[[/hot-?dog/i,'🌭'],[/energet/i,'⚡'],[/woda/i,'💧'],[/znicz/i,'🕯️'],[/kaw/i,'☕'],[/zapiekan/i,'🥖'],[/pizza/i,'🍕'],[/burger/i,'🍔'],[/frytk/i,'🍟'],[/plast/i,'🩹'],[/witamin/i,'💊'],[/kieł?basa/i,'🌭'],[/tuning/i,'🔧'],[/rower/i,'🚲'],[/pi[wf]o|piwo/i,'🍺'],[/kanister|paliw/i,'⛽'],[/ksi[ąa]ż/i,'📚']];
  const itemIcon=(n,t)=>{ const m=ITEM_ICO.find(q=>q[0].test(n||'')); if(m) return m[1]; return t==='car'?'🚗':t==='bike'?'🚲':t==='tune'?'🔧':t==='hp'?'🍔':t==='boost'?'🥤':t==='znicz'?'🕯️':'🛒'; };
  function openShop(s){ SHOP_OPEN=s; keys.clear(); shopEl.hidden=false; shopEl.innerHTML=`<h2>${s.n}</h2><p class="sub">${s.sub||'Kasa'} · masz ${fmt(st.money)}</p>`+s.items.map((it,i)=>`<button data-i="${i}" style="flex-wrap:wrap"><kbd>${i+1}</kbd> <span class="sic" style="display:inline;font-size:20px;margin-right:6px">${itemIcon(it[0],it[2])}</span>${it[0]}<span>${it[1]} zł</span>${it[2]==='car'?carStatsHtml(it[3]):''}</button>`).join('')+`<button data-i="x" class="close">Wyjdź <kbd>E</kbd></button>`;
    shopEl.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ const i=b.dataset.i; if(i==='x')closeShop(); else buy(+i); })); }
  function closeShop(){ SHOP_OPEN=null; shopEl.hidden=true; canvas.focus(); }
  const TURBO_CARS=['Porsche 911 Turbo','Lamborghini Countach','Ferrari Testarossa','BMW M1','Audi Quattro','Lancia Delta Integrale','Mercedes 190E','Volkswagen Golf GTI','Toyota Supra','Ford Sierra Cosworth','Fiat 126p','Polonez Coupe','Ferrari F40','Lotus Esprit','De Tomaso Pantera','Ford Mustang','Chevrolet Corvette','Nissan 300ZX','Mazda RX-7','Renault 5 Turbo','Peugeot 205 GTI','Saab 900 Turbo','Volvo 240','Opel Manta','Alfa Romeo Spider','Jaguar XJS','Aston Martin V8','Dodge Viper','Honda NSX','Bugatti EB110'];
  const TURBO_HAVE=new Set();
  function buy(i){ const it=SHOP_OPEN&&SHOP_OPEN.items[i]; if(!it)return; { const gm=shopGuard(it); if(gm){ toast(gm,2.5); return; } } if(st.money<it[1]){ toast('Za mało pieniędzy',2); return; } st.money-=it[1]; shownMoney=st.money; moneyEl.textContent=fmt(st.money); if(AU.ctx&&AU.on)sfx.cash();
    if(shopBuyExtra(it)){ openShop(SHOP_OPEN); return; }
    if(it[2]==='book'){ st.books=(st.books||0)+1; toast(`Wypożyczono: ${it[0]}`,3); saveGame(); openShop(SHOP_OPEN); return; } if(it[2]==='canister'){ st.canister=(st.canister||0)+it[3]; }
    if(it[2]==='npc'){ giveIt(it[3]); toast(`Kupiono: <b>${it[0]}</b>`,2.5); saveGame(); openShop(SHOP_OPEN); return; }
    if(it[2]==='hp'||it[2]==='boost'){ invAdd(it); toast(`Dodano do ekwipunku: <b>${it[0]}</b><br><kbd>I</kbd> - otwórz ekwipunek`,2.6); saveGame(); openShop(SHOP_OPEN); return; } if(it[2]==='turbo'){ st.turbo=(st.turbo||0)+1; const i=Math.floor(rnd()*TURBO_CARS.length), nw=!TURBO_HAVE.has(i); TURBO_HAVE.add(i); const n=TURBO_HAVE.size, N=TURBO_CARS.length;
      toast(`Guma Turbo! Historyjka nr ${i+1}: <b>${TURBO_CARS[i]}</b> ${nw?'- nowa!':'(już masz)'}<br>Kolekcja: ${n}/${N}`,3.2);
      if(nw&&n===N){ setTimeout(()=>{ toast(`<b>PEŁNA KOLEKCJA TURBO!</b><br>+${fmt(1500)} · +150 XP`,4.5); addMoney(1500); addXP(150); },1800); } saveGame(); openShop(SHOP_OPEN); return; } toast(`Kupiono: ${it[0]}`,2); saveGame(); openShop(SHOP_OPEN); }
  addEventListener('keydown',e=>{ if(!SHOP_OPEN)return; const n=parseInt(e.key,10); if(n>=1&&n<=9){ buy(n-1); e.preventDefault(); } if(e.key==='Escape'){ closeShop(); e.preventDefault(); } },true);

  /* ---------- misje ---------- */
  const resHouses=houses.filter(h=>h.kind==='house'&&!h.isPart);
  const housesBy=(f)=>resHouses.filter(f);
  /* ---------- interakcja (E) i podpowiedzi ---------- */
  function nearShop(){ if(st.inside){ const sh=CUR===IN?IN_SHOP:CUR.shop; if(CUR.levels&&(st.gy||0)>1.8) return null; return sh&&Math.hypot(sh.p[0]-st.x,sh.p[1]-st.z)<2.4?sh:null; } return SHOPS.find(s=>{ if(s.n==='Lewiatan'||s.room)return false; const p=s.p; return Math.hypot(p[0]-st.x,p[1]-st.z)<4.5; }); }
  function nearStoreDoor(){ if(st.car)return false; if(st.inside){ const d=CUR.doorW; if(CUR.levels&&(st.gy||0)>1.8) return false; return d&&Math.hypot(d[0]-st.x,d[1]-st.z)<(IS_TOUCH?3.2:2.3)?'out':false; } DOOR_ENT=null; let bd=IS_TOUCH?4.8:3.4; ENTS.forEach(e=>{ const p=e.p; if(!p)return; const d=Math.hypot(p[0]-st.x,p[1]-st.z); if(d<bd){ bd=d; DOOR_ENT=e; } }); return DOOR_ENT?'in':false; }
  function nearMission(){ return !ACTIVE&&!st.inside&&MISSIONS.find(m=>m.mk.visible&&Math.hypot(m.sp[0]-st.x,m.sp[1]-st.z)<(st.car?5:3)); }
  await LP(92);
  /* ---------- postacie z AI: Mietek (Lewiatan), Seba (przystanek PKS), Pani Jadzia (płot przy remizie) ----------
     Zadania są zaprogramowane w grze (stały przebieg i nagrody); swobodną rozmowę prowadzi model językowy na serwerze (Workers AI). */
  const NPC_GOSSIP=['Kaśka od sąsiadów wracała z dyskoteki z Darkiem z Działoszyna','Zbyszek ze Stacji odprowadzał Agnieszkę aż pod sam kościół','Wiesiek wracał sam, bo Monika uciekła mu z Krystianem','Marta wracała z Pawłem rowerem, we dwoje na jednym siodełku','Grzesiek z Zagrodowej i Agnieszka szli piechotą aż do świtu'];
  const NQ=(()=>{ let q=null; try{ q=JSON.parse(localStorage.getItem('trebaczew-npc')||'null'); }catch(e){} return Object.assign({mietek:'start',seba:'start',jadzia:'start',items:[],gi:0,hist:{}},q||{}); })();
  const nqSave=()=>{ try{ localStorage.setItem('trebaczew-npc',JSON.stringify(NQ)); }catch(e){} };
  const hasIt=i=>NQ.items.includes(i), giveIt=i=>{ if(!hasIt(i)) NQ.items.push(i); nqSave(); }, takeIt=i=>{ NQ.items=NQ.items.filter(q=>q!==i); nqSave(); };
  const NPC=[]; const NPC_PICKS=[]; let SEBA_CAR=null;
  function npcSpot(x,z,dx,dz){ for(let k=0;k<12&&blocked(x,z,.45);k++){ x+=dx*.5; z+=dz*.5; } return [x,z]; }
  function addNPC(id,name,title,col,pos,face,look){ const p=makePerson(look.top,look.bot,look.hair,Object.assign({exact:true},look.opt)); p.position.set(pos[0],H(pos[0],pos[1])+.1,pos[1]); p.rotation.y=face; scene.add(p);
    const sol={x:pos[0],z:pos[1],hw:.24,hd:.24,c:1,s:0,r:.4}; addSolid(sol); const tag=labelSprite(name,col); tag.scale.multiplyScalar(.22); tag.position.set(pos[0],H(pos[0],pos[1])+2.35,pos[1]); scene.add(tag);
    const n={id,name,title,col,p,x:pos[0],z:pos[1],face0:face,tag,sol}; NPC.push(n);
    POIS.push({n:`${name} - ${title}`,x:pos[0],z:pos[1],p:pos,c:col,ic:'💬',npcTag:true,sp:labelSprite(name,col)}); { const lp=POIS[POIS.length-1]; lp.sp.position.set(pos[0],H(pos[0],pos[1])+9,pos[1]); lp.sp.visible=false; scene.add(lp.sp);
      const b=document.createElement('button'); b.innerHTML=`<i style="background:${col}"></i>`; b.append(`💬 ${name} - ${title}`); b.addEventListener('click',()=>{ goTo(lp); toggleMap(false); }); poiList.prepend(b); }
    return n; }
  // --- miejsce dla postaci: z dala od bram, furtek, przejść, jezdni i alejek, z wolnym miejscem dookoła (da się obejść) ---
  const lineDist=(pts,x,z)=>{ let m=1e9; for(let i=0;i<pts.length-1;i++){ const d=segDist(x,z,pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1]); if(d<m)m=d; } return m; };
  const RES_PC=PARCELS.filter(pc=>pc.res), polyEdgeD=(P,x,z)=>{ let m=1e9; for(let i=0;i<P.length;i++){ const a=P[i],b=P[(i+1)%P.length]; const d=segDist(x,z,a[0],a[1],b[0],b[1]); if(d<m)m=d; } return m; };
  const NPC_DOORS=[]; try{ SHOPS.forEach(q=>{ const p=q.p; if(p) NPC_DOORS.push(p); }); }catch(e){} if(B_LEW&&B_LEW.door) NPC_DOORS.push(B_LEW.door); if(APT_DOORS) NPC_DOORS.push(APT_DOORS.pharm,APT_DOORS.clinic); if(CHURCH_DOOR) NPC_DOORS.push(CHURCH_DOOR.p);
  if(SCHOOL_M){ const {cx,cz,an}=SCHOOL_M; NPC_DOORS.push([cx-4.25*Math.cos(an)-13*Math.sin(an),cz-4.25*Math.sin(an)+13*Math.cos(an)]); }
  function npcFree(x,z,r){ if(blocked(x,z,r))return false; if(NPC_DOORS.some(d=>Math.hypot(d[0]-x,d[1]-z)<6))return false; if(GATES.some(g=>Math.hypot(g.cx-x,g.cz-z)<6))return false; if(GAPS.some(g=>Math.hypot((g.x0+g.x1)/2-x,(g.z0+g.z1)/2-z)<5))return false;
    if(roadNearF(x,z,.9))return false; if(ROADS.some(rd=>rd.t==='track'&&roadDist(rd,x,z)<rd.w/2+.6))return false; if((PARK.walks||[]).some(w=>lineDist(w.pts,x,z)<2.2))return false; if(RES_PC.some(pc=>x>pc.bb[0]-1.5&&x<pc.bb[2]+1.5&&z>pc.bb[1]-1.5&&z<pc.bb[3]+1.5&&(inPoly(x,z,pc.p)||polyEdgeD(pc.p,x,z)<1.5)))return false; return true; }
  // czy z danego miejsca da się dojść do jakiejś ulicy (BFS po siatce 1 m) - żeby postać nie stała w zamkniętym zakątku
  function npcReach(x,z){ const seen=new Set(), q=[[Math.round(x),Math.round(z)]]; let n=0; while(q.length&&n<5000){ const [a,b]=q.shift(); n++; const k=a+','+b; if(seen.has(k))continue; seen.add(k); if(roadNearF(a,b,.2))return true; if(Math.hypot(a-x,b-z)>70)continue; for(const [da,db] of [[1,0],[-1,0],[0,1],[0,-1]]){ const na=a+da,nb=b+db; if(!seen.has(na+','+nb)&&!blocked(na,nb,.35)) q.push([na,nb]); } } return false; }
  function npcFind(x,z,r,maxK){ r=r||1.5; for(let k=0;k<(maxK||900);k++){ const d=Math.sqrt(k)*.75, a=k*2.39996; const qx=x+Math.cos(a)*d, qz=z+Math.sin(a)*d; if(npcFree(qx,qz,r)&&npcReach(qx,qz)) return [qx,qz]; } return r>.8?npcFind(x,z,.8,maxK):[x,z]; }
  // Mietek: przy Lewiatanie, ale nie w przejściu - obok, na wolnym miejscu przy ścianie
  if(B_LEW&&B_LEW.front){ const f=B_LEW.front, tx=-f.nz, tz=f.nx; const q=npcFind(f.x+f.nx*3+tx*(f.len/2+2),f.z+f.nz*3+tz*(f.len/2+2));
    addNPC('mietek','Mietek','stały bywalec spod Lewiatana','#d9a43a',q,Math.atan2(f.nx,f.nz),{top:0x5a5146,bot:0x3a3d44,hair:0x8a8a8a,opt:{female:false,style:'jacket',hairStyle:'cap',capC:0x2a3a5a,skin:0xd9a982,shoe:0x2a2420,stubble:true}}); }
  // przystanek PKS z wiatą na Wyzwolenia (DK42) - zostaje, autobus też się na nim zatrzymuje
  { let bd=1e9, d0=0; for(let d=0;d<DK.L;d+=2){ const q=sampleLine(DK.pts,DK.len,d); const dd=Math.hypot(q.x+160,q.z-105); if(dd<bd){bd=dd;d0=d;} }
    const s0=sampleLine(DK.pts,DK.len,d0); const tx=s0.tx, tz=s0.tz; let nx=-tz, nz=tx, off=DK.w/2+2.2;
    const free=(sg)=>[0,3,6,9].every(k=>!blocked(s0.x+sg*nx*off+tx*k,s0.z+sg*nz*off+tz*k,.8)); if(!free(1)&&free(-1)){ nx=-nx; nz=-nz; }
    const sh={x:s0.x+nx*off,z:s0.z+nz*off}; BUS_STOPS.push(d0);
    { const gB=new THREE.Group(); const mm=new THREE.MeshLambertMaterial({color:0x6b7d8c}); const roof=new THREE.Mesh(new THREE.BoxGeometry(4.5,.15,1.8),mm); roof.position.y=2.5; const back=new THREE.Mesh(new THREE.BoxGeometry(4.5,2.3,.08),new THREE.MeshPhongMaterial({color:0xaac4d6,transparent:true,opacity:.45,shininess:90})); back.position.set(0,1.25,-.8);
      const bench=new THREE.Mesh(new THREE.BoxGeometry(3,.1,.4),new THREE.MeshLambertMaterial({color:0x8a6a4a})); bench.position.set(0,.5,-.5); [-2.15,2.15].forEach(x=>{ const p2=new THREE.Mesh(new THREE.BoxGeometry(.08,2.5,.08),mm); p2.position.set(x,1.25,-.75); gB.add(p2); });
      gB.add(roof,back,bench); gB.position.set(sh.x,H(sh.x,sh.z),sh.z); gB.rotation.y=Math.atan2(-nx,-nz); scene.add(gB); addSolid({x:sh.x-nx*.75,z:sh.z-nz*.75,hw:2.25,hd:.12,c:Math.cos(-gB.rotation.y),s:Math.sin(-gB.rotation.y),r:2.4}); } }
  // Seba: w parku w Trębaczewie - na placu z kostki od Zielonej, obok swojej czarnej beemki (BMW E46) zaparkowanej przy krawężniku
  { const zr=ROADS.find(r=>r.n==='Zielona'), pc=centroid(PLAC.pts); let bp=PLAC.pts[0],bd=1e9; PLAC.pts.forEach(v=>{ const d=roadDist(zr,v[0],v[1]); if(d<bd){bd=d;bp=v;} });
    const nr0=nearestRoad(bp[0],bp[1],r=>r===zr); const a0=zr.pts[nr0.seg],b0=zr.pts[nr0.seg+1]; let tx=b0[0]-a0[0],tz=b0[1]-a0[1]; const tl=Math.hypot(tx,tz); tx/=tl; tz/=tl; let nx=-tz,nz=tx; if((pc[0]-bp[0])*nx+(pc[1]-bp[1])*nz<0){nx=-nx;nz=-nz;}
    // auto: na placu, wzdłuż Zielonej, kilka metrów od wjazdu
    let cx=bp[0]+nx*3.2-tx*9, cz=bp[1]+nz*3.2-tz*9; for(let k=0;k<20&&(blocked(cx,cz,1.6,true)||roadNearF(cx,cz,1));k++){ cx+=nx*.5-tx*.5; cz+=nz*.5-tz*.5; }
    const ch=Math.atan2(tz,tx); const car=makeCar(0x30343a,'car'); seatCar(car,cx,cz,ch); scene.add(car); { // BMW: podwójna „nerka” w atrapie, znaczek na masce i przyciemniane szyby
      const bm=(w,h,d,x,y,z,c)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:c})); m.position.set(x,y,z); car.add(m); return m; };
      [-.15,.15].forEach(z=>{ bm(.05,.19,.22,2.2,.68,z,0xd0d0d0); bm(.06,.15,.17,2.21,.68,z,0x0c0c0e); for(let k=-2;k<=2;k++) bm(.07,.13,.012,2.215,.68,z+k*.035,0x9a9a9a); });
      const rt=tex(64,64,(x,w,h)=>{ x.fillStyle='#111'; x.beginPath(); x.arc(32,32,31,0,7); x.fill(); [['#2a7ad8',0],['#f4f4f4',1],['#2a7ad8',2],['#f4f4f4',3]].forEach(([c,i])=>{ x.fillStyle=c; x.beginPath(); x.moveTo(32,32); x.arc(32,32,21,i*Math.PI/2-Math.PI/2,(i+1)*Math.PI/2-Math.PI/2); x.closePath(); x.fill(); }); x.strokeStyle='#bbb'; x.lineWidth=2; x.beginPath(); x.arc(32,32,30,0,7); x.stroke(); });
      const rd=new THREE.Mesh(new THREE.CircleGeometry(.07,20),new THREE.MeshBasicMaterial({map:rt})); rd.rotation.x=-Math.PI/2+.32; rd.rotation.z=-Math.PI/2; rd.position.set(2.0,.81,0); car.add(rd);
      const rr=rd.clone(); rr.rotation.set(0,-Math.PI/2,0); rr.position.set(-2.19,.74,0); car.add(rr); }
    const pl2=new THREE.Mesh(new THREE.PlaneGeometry(.52,.12),new THREE.MeshBasicMaterial({map:signTex('EPJ 330D','#f4f4f2','#111111',256,60,'700 40px Barlow, Arial')})); pl2.position.set(-2.2,.5,0); pl2.rotation.y=-Math.PI/2; car.add(pl2);
    // beemką da się jeździć (misja „Beemka na próbę” po pomocy Sebie)
    SEBA_CAR={g:car,x:cx,z:cz,h:ch,v:0,steer:0,L:4.3,W:1.95,kind:'car',name:'BMW E46 330d (Seby)',home:[cx,cz,ch]}; parked.push(SEBA_CAR);
    const q=npcFind(cx+nx*2.6,cz+nz*2.6,1.4); addNPC('seba','Seba','fan niemieckiej motoryzacji','#4aa3df',q,Math.atan2(cx-q[0],cz-q[1]),{top:0x1f2a44,bot:0x1f2a44,hair:0x2a1d14,opt:{female:false,style:'hoodie',hairStyle:'buzz',skin:0xe6bb98,shoe:0xe8e8e4}});
    // skrzynka z narzędziami przy garażu jednego z domów w pobliżu parku
    const hb=BLD.filter(b=>b.kind==='house'&&!b.cust&&Math.hypot(b.x+205,b.z-107)>35&&Math.hypot(b.x-q[0],b.z-q[1])>45&&Math.hypot(b.x-q[0],b.z-q[1])<150).sort((a,b)=>Math.hypot(a.x-q[0],a.z-q[1])-Math.hypot(b.x-q[0],b.z-q[1]))[0];
    if(hb){ const fr=frontSide(hb,nearestRoad(hb.x,hb.z,r=>r.t!=='track').r); const ttx=-fr.nz, ttz=fr.nx; const p=npcSpot(fr.x+fr.nx*1.1+ttx*(fr.len/2-.9),fr.z+fr.nz*1.1+ttz*(fr.len/2-.9),fr.nx,fr.nz);
      const g=new THREE.Group(); g.position.set(p[0],H(p[0],p[1]),p[1]); g.rotation.y=fr.rot; scene.add(g); bx(g,1.4,.85,.6,0,0,0,new THREE.MeshLambertMaterial({color:0x7a5a3a})); bx(g,.55,.28,.25,-.25,.85,0,new THREE.MeshLambertMaterial({color:0xc0272c})); bx(g,.12,.03,.25,.3,.86,0,new THREE.MeshLambertMaterial({color:0x9aa0a6}));
      NPC_PICKS.push({id:'narzedzia',p,label:'weź klucz 10 mm i trytytki ze skrzynki',on:()=>NQ.seba==='zadanie'&&!(hasIt('klucz10')&&hasIt('trytytki')),act:()=>{ giveIt('klucz10'); giveIt('trytytki'); toast('Masz <b>klucz 10 mm</b> i <b>trytytki</b> - wróć do Seby',3); }}); } }
  // Pani Jadzia: przed domem najbliżej remizy OSP, przy narożniku płotu (nie przy furtce)
  { const hb=BLD.filter(b=>b.kind==='house'&&!b.cust).sort((a,b)=>Math.hypot(a.x+205,a.z-107)-Math.hypot(b.x+205,b.z-107))[0];
    if(hb){ const fr=frontSide(hb,nearestRoad(hb.x,hb.z,r=>r.t!=='track').r); const ttx=-fr.nz, ttz=fr.nx; const q=npcFind(fr.x+fr.nx*2.6+ttx*(fr.len/2+1),fr.z+fr.nz*2.6+ttz*(fr.len/2+1),1.3);
      addNPC('jadzia','Pani Jadzia','wie wszystko o wszystkich','#d35d8e',q,fr.rot,{top:0x9a4a6a,bot:0x3a3a4a,hair:0xb8b8b8,opt:{female:true,style:'coat',hairStyle:'bob',skin:0xf0cfb2,shoe:0x3a2c22}}); } }
  // --- kolejne postacie z prostymi zadaniami „przynieś / zanieś” (opis w NPC_DEF) ---
  const pickMesh=(kind)=>{ const g=new THREE.Group(); const M=c=>new THREE.MeshLambertMaterial({color:c});
    if(kind==='klucze'){ for(let k=0;k<3;k++){ const t=new THREE.Mesh(new THREE.TorusGeometry(.05,.012,6,12),M(0xc9b25a)); t.rotation.x=Math.PI/2; t.position.set(k*.05-.05,.03,k*.02); g.add(t); } bx(g,.05,.012,.14,.08,.02,.05,M(0xb8b8b8)); }
    else if(kind==='kot'){ bx(g,.42,.2,.18,0,.12,0,M(0x2a2624)); const h=new THREE.Mesh(new THREE.SphereGeometry(.1,10,8),M(0x2a2624)); h.position.set(.25,.3,0); g.add(h); [-.05,.05].forEach(z=>{ const e=new THREE.Mesh(new THREE.ConeGeometry(.035,.08,4),M(0x2a2624)); e.position.set(.27,.42,z); g.add(e); }); const t=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.4,6),M(0x2a2624)); t.position.set(-.28,.3,0); t.rotation.z=.6; g.add(t); [[.14,.07],[.14,-.07],[-.14,.07],[-.14,-.07]].forEach(([x,z])=>bx(g,.04,.12,.04,x,0,z,M(0x2a2624))); }
    else if(kind==='kanister'){ bx(g,.34,.46,.18,0,0,0,M(0x2f6b2f)); bx(g,.1,.06,.1,.1,.46,0,M(0x2a2a2a)); bx(g,.2,.05,.04,-.05,.5,0,M(0x2f6b2f)); }
    else if(kind==='sluchawki'){ const t=new THREE.Mesh(new THREE.TorusGeometry(.09,.015,6,16,Math.PI),M(0xf2f2f2)); t.position.y=.47; g.add(t); [-.09,.09].forEach(x=>bx(g,.05,.07,.05,x,.42,0,M(0xf2f2f2))); bx(g,.4,.02,.2,0,.44,0,M(0x8a6a4a)); }
    else if(kind==='tablica'){ const w=M(0x5b3e28); [-.6,.6].forEach(o=>bx(g,.08,1.9,.08,o,0,0,w)); bx(g,1.3,.9,.06,0,.85,0,w); pl(g,1.2,.8,0,1.3,.04,new THREE.MeshLambertMaterial({color:0x3d5a3a})); }
    else if(kind==='skrzynka'){ bx(g,.5,1.1,.12,0,0,0,M(0xc0272c)); bx(g,.3,.03,.02,0,.85,.07,M(0x222222)); }
    else if(kind==='pilka'){ const b=new THREE.Mesh(new THREE.SphereGeometry(.11,12,10),M(0xd02a2a)); b.position.y=.11; g.add(b); const st2=new THREE.Mesh(new THREE.TorusGeometry(.11,.012,6,16),M(0xf2f2f2)); st2.position.y=.11; g.add(st2); const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(.7,0),M(0x3f6b2f)); bush.scale.set(1.3,.7,1); bush.position.set(.6,.35,.3); g.add(bush); }
    else if(kind==='worek'){ const b=new THREE.Mesh(new THREE.SphereGeometry(.32,10,8),M(0x2a2a2a)); b.scale.set(1,1.25,.9); b.position.y=.38; g.add(b); const t=new THREE.Mesh(new THREE.ConeGeometry(.08,.16,6),M(0x2a2a2a)); t.position.y=.83; g.add(t); for(let k=0;k<3;k++){ const lf=new THREE.Mesh(new THREE.SphereGeometry(.07,5,4),M([0xc8642c,0xd9a23a,0x8a5a2a][k])); lf.position.set(.3*Math.cos(k*2),.06,.3*Math.sin(k*2)); lf.scale.y=.4; g.add(lf); } }
    else if(kind==='kosz'){ const c=new THREE.Mesh(new THREE.CylinderGeometry(.22,.18,.32,12),M(0xa07a4a)); c.position.y=.16; g.add(c); for(let k=0;k<6;k++){ const e=new THREE.Mesh(new THREE.SphereGeometry(.06,8,6),M(0xf2ead8)); e.scale.y=1.25; e.position.set(Math.cos(k)*.1,.34,Math.sin(k)*.1); g.add(e); } }
    return g; };
  const NPC_DEF={
    andrzej:{name:'Andrzej',title:'fanatyk motocykli spod Żabki',col:'#c98a4a',at:()=>{ const f=B_ZAB.front; return [f.x+f.nx*7-f.nz*6,f.z+f.nz*7+f.nx*6]; },look:{top:0x6a5a3a,bot:0x2f3238,hair:0x9a9590,opt:{female:false,style:'jacket',hairStyle:'short',skin:0xe0a888,shoe:0x2a2420,stubble:true}},
      canned:{start:'Dzień dobry, kolego! Ty wiesz, że ja miałem kiedyś WSK-ę sto dwadzieścia pięć? Kultowy sprzęt, słowo honoru!',zadanie:'Kolego, klucze mi wypadły koło kościoła, przy trawniku. A w nich kluczyk do mojej stuki w garażu, tej po WSK-ce!',ma:'Brzęczy coś! Kolego, to moje klucze tak brzęczą?',koniec:'Złoty z ciebie człowiek! Jak odpalę silnik, to cię przewiozę, słowo honoru.'},
      ask:'Panie Andrzeju, coś się stało?',give:'Kolego, zgubiłem klucze od garażu, gdzie trzymam stary motocykl. Szedłem koło kościoła i brzdęk, gdzieś w trawę. Poszukasz?',task:'Nowe zadanie: znajdź klucze Andrzeja na trawniku przy kościele.',
      item:'klucze_a',pick:{kind:'klucze',at:()=>[-86,118],label:'podnieś pęk kluczy z trawy',got:'Masz <b>klucze Andrzeja</b> - oddaj mu je pod Żabką'},
      doneBtn:'Proszę, pana klucze',done:'No przecież to moje! Kolego, dziękuję. Idę do garażu, pogłaskać moją maszynę.',money:120,xp:35,talk:['Opowie pan o swoim motocyklu?','Jaki był najlepszy motor w Trębaczewie?']},
    soltys:{name:'Sołtys Zdzisław',title:'sołtys Trębaczewa',col:'#5a9a4a',at:()=>[-142,-114],look:{top:0x3a4a5a,bot:0x2a2c30,hair:0xb0aaa0,opt:{female:false,style:'coat',hairStyle:'short',skin:0xe2b496,shoe:0x1e1a18}},
      canned:{start:'Dzień dobry, dzień dobry. W sołectwie zawsze jest co robić, proszę pana.',zadanie:'Ogłoszenie o zebraniu wiejskim trzeba przypiąć na tablicy przy Żabce. Tam ludzie najczęściej chodzą.',ma:'I jak, wisi już ogłoszenie?',koniec:'Dziękuję, zebranie w piątek o osiemnastej w świetlicy. Zapraszam!'},
      ask:'Panie sołtysie, mogę w czymś pomóc?',give:'A wie pan, że tak! Zebranie wiejskie w piątek, a ogłoszenia nikt nie powiesił. Proszę przypiąć je na tablicy przy Żabce.',task:'Nowe zadanie: przypnij ogłoszenie sołtysa na tablicy przy Żabce.',
      startItem:'ogloszenie',item:'ogloszenie_ok',pick:{kind:'tablica',keep:true,at:()=>[-58,56],label:'przypnij ogłoszenie o zebraniu wiejskim',got:'Ogłoszenie wisi na tablicy - wróć do sołtysa'},
      doneBtn:'Ogłoszenie wisi przy Żabce',done:'Bardzo dziękuję! Tak trzymać, z takich ludzi to wieś jest dumna.',money:150,xp:40,talk:['Co słychać w sołectwie?','Co będzie na zebraniu?']},
    halina:{name:'Babcia Halina',title:'szuka kota Mruczka',col:'#c46aa8',at:()=>[-98,-62],look:{top:0x7a6a8a,bot:0x4a3a3a,hair:0xe0e0e0,opt:{female:true,style:'coat',hairStyle:'bob',skin:0xf0d2ba,shoe:0x3a2c22}},
      canned:{start:'Dzień dobry, synku. Nie widziałeś gdzieś mojego Mruczka? Czarny taki, puchaty.',zadanie:'Mruczek lubi chodzić do parku, koło placu zabaw. Synku, przynieś go, proszę.',ma:'Mruczuś! Jest mój kochany!',koniec:'Dziękuję ci, synku. Mruczek już śpi na piecu. Wpadnij kiedyś na pierogi.'},
      ask:'Pomogę szukać Mruczka',give:'Złote dziecko! Mruczek często chodzi do parku, koło placu zabaw. Przynieś go, tylko delikatnie, bo on się boi.',task:'Nowe zadanie: znajdź kota Mruczka w parku przy placu zabaw.',
      item:'kot',pick:{kind:'kot',at:()=>[30,-258],label:'weź Mruczka na ręce',got:'Masz <b>Mruczka</b> - zanieś go Babci Halinie'},
      doneBtn:'Oto Mruczek, cały i zdrowy',done:'Mruczusiu! Synku, dziękuję. Masz tu na cukierki, tylko nie mów nikomu.',money:100,xp:35,talk:['Jakie pierogi babcia robi?','Jak było dawniej we wsi?']},
    stasiek:{name:'Rolnik Stasiek',title:'gospodarz z ciągnikiem',col:'#9a8a3a',at:()=>{ const t=parked.filter(c=>c.kind==='tractor').sort((a,b)=>Math.hypot(a.x+200,a.z-200)-Math.hypot(b.x+200,b.z-200))[0]; return t?[t.x+3,t.z+3]:[-200,200]; },look:{top:0x3f6b3a,bot:0x2c3e66,hair:0x5a4a3a,opt:{female:false,style:'jacket',hairStyle:'cap',capC:0x8a2a2a,skin:0xd09a7a,shoe:0x3a2a1a,stubble:true}},
      canned:{start:'Szczęść Boże. Ursus mi stanął, a tu pole czeka.',zadanie:'Kanister ropy jest u magazyniera w TRANS-BUD-zie, już dzwoniłem. Przywieź go, bo bez tego nie ruszę.',ma:'O, kanister! Teraz to Ursus pójdzie jak burza.',koniec:'Dziękuję, sąsiedzie. Jak będziesz potrzebował ziemniaków, to wiesz, gdzie mieszkam.'},
      ask:'Co się stało z ciągnikiem?',give:'Ropy zabrakło, a do stacji kawał drogi. Magazynier z TRANS-BUD-u ma dla mnie kanister, zostawił go przy bramie. Przywieziesz?',task:'Nowe zadanie: przywieź kanister ropy z TRANS-BUD-u Rolnikowi Staśkowi.',
      item:'kanister_r',pick:{kind:'kanister',at:()=>[150,-66],label:'weź kanister ropy dla Staśka',got:'Masz <b>kanister ropy</b> - zawieź go Staśkowi'},
      doneBtn:'Przywiozłem kanister ropy',done:'No to teraz w pole! Dziękuję, sąsiedzie, masz tu za fatygę.',money:180,xp:45,talk:['Jak tegoroczne plony?','Ile ma lat ten Ursus?']},
    kasia:{name:'Kasia',title:'studentka, wraca z orlika',col:'#4ac0a0',at:()=>[-66,-240],look:{top:0xd8d6d0,bot:0x2c3e66,hair:0x6b4426,opt:{female:true,style:'hoodie',hairStyle:'pony',skin:0xf0cfb2,shoe:0xe8e8e4}},
      canned:{start:'Hej! Nie widziałeś moich słuchawek? Białe, takie bezprzewodowe.',zadanie:'Siedziałam na ławce w parku, tej dalej, za placem zabaw. Pewnie tam zostały.',ma:'Moje słuchawki! Serio je masz?',koniec:'Dzięki wielkie! Teraz mogę biegać z muzyką. Wpadaj na orlik w piątek, gramy mecz.'},
      ask:'Pomogę ci poszukać',give:'Serio? Super! Siedziałam na ławce w parku, tej dalej, za placem zabaw. Zobacz, czy tam nie leżą.',task:'Nowe zadanie: znajdź słuchawki Kasi na ławce w parku.',
      item:'sluchawki',pick:{kind:'sluchawki',at:()=>[62,-262],label:'weź słuchawki z ławki',got:'Masz <b>słuchawki Kasi</b> - oddaj je przy orliku'},
      doneBtn:'Proszę, twoje słuchawki',done:'Jesteś wielki! Masz tu coś na lody, należy się.',money:90,xp:30,talk:['Co studiujesz?','Kto gra w piątek na orliku?']},
    wiesiek:{name:'Listonosz Wiesiek',title:'roznosi pocztę po wsi',col:'#e0b020',at:()=>[-118,-176],look:{top:0x2a4a8a,bot:0x2a3a5a,hair:0x3a2a1a,opt:{female:false,style:'jacket',hairStyle:'cap',capC:0x2a4a8a,skin:0xe2b496,shoe:0x1e1a18}},
      canned:{start:'Dzień dobry! Poczta Polska, ja tu wszystkich znam po adresach.',zadanie:'Paczka dla plebanii, proszę ją zostawić przy drzwiach, w skrzynce na paczki.',ma:'Doręczona? To pięknie!',koniec:'Dzięki za pomoc, teraz zdążę na autobus do Działoszyna.'},
      ask:'Pomóc w roznoszeniu?',give:'O, przyda się! Noga mnie boli, a jeszcze paczka na plebanię. Zaniesie pan? Wystarczy zostawić w skrzynce przy drzwiach.',task:'Nowe zadanie: zanieś paczkę do skrzynki przy plebanii.',
      startItem:'paczka',item:'pokwitowanie',pick:{kind:'skrzynka',keep:true,at:()=>[-34,146],label:'zostaw paczkę w skrzynce przy plebanii',got:'Paczka doręczona - wróć do listonosza'},
      doneBtn:'Paczka doręczona',done:'Dziękuję! Fachowo, jak u nas na poczcie. Proszę, za fatygę.',money:140,xp:40,talk:['Jakie są najdziwniejsze przesyłki?','Ma pan dużo pracy?']} };
  // --- kolejne postacie: park w Trębaczewie (szachista, piłkarz LZS, właścicielka psa, ogrodnik, dziadek z gołębiami) ---
  Object.assign(NPC_DEF,{
    zenek:{name:'Pan Zenek',title:'szachista z ławki w parku',col:'#8a7ad8',bench:1,kind:'quiz',look:{top:0x5a5a6a,bot:0x3a3a40,hair:0xd0d0d0,opt:{female:false,style:'coat',hairStyle:'short',skin:0xe8c0a0,shoe:0x2a2420}},
      canned:{start:'Dzień dobry, młody człowieku. Partyjka? A może najpierw sprawdzimy, co wiesz o naszej wsi?',zadanie:'',ma:'',koniec:'Szach i mat! Zapraszam na partyjkę w każde popołudnie.'},
      ask:'Chętnie, panie Zenku!',give:'To trzy pytania o Trębaczewie. Jak odpowiesz na wszystkie, dostaniesz ode mnie nagrodę.',task:'Nowe zadanie: odpowiedz na trzy pytania Pana Zenka o Trębaczewie.',
      quiz:[{q:'Pierwsze pytanie: jaka droga krajowa biegnie przez Trębaczew?',a:['DK42','DK1','DK8'],ok:0},{q:'Drugie: jak nazywa się nasz klub piłkarski?',a:['Wisła Trębaczew','LZS Trębaczew','Orlęta Działoszyn'],ok:1},{q:'I trzecie: w jakiej gminie leży Trębaczew?',a:['Pajęczno','Wieluń','Działoszyn'],ok:2}],
      done:'Brawo! Głowa jak u arcymistrza. Proszę, to dla ciebie.',money:160,xp:45,talk:['Kto zwykle wygrywa w szachy w parku?','Jak było w Trębaczewie dawniej?']},
    marek:{name:'Marek',title:'gra w LZS Trębaczew',col:'#2f9a4a',at:()=>[-60,-270],kind:'mini',mini:'karne',mo:{mode:'lzs'},item:'karne_ok',look:{top:0x1f7a3a,bot:0x1f7a3a,hair:0x2a1d14,opt:{female:false,style:'hoodie',hairStyle:'buzz',skin:0xe2b496,shoe:0xf2f2f2}},
      canned:{start:'Cześć! Szukamy ludzi do LZS-u. Umiesz strzelać karne?',zadanie:'No to co, strzelamy? Pokaż, co potrafisz.',ma:'Widziałem! Ale strzały! Podejdź, pogadamy o drużynie.',koniec:'W sobotę gramy na orliku, przyjdź koniecznie!'},
      ask:'Umiem, sprawdź mnie!',give:'Dobra, seria rzutów karnych. Wygrasz - załatwię ci miejsce w drużynie i premię od klubu.',task:'Nowe zadanie: wygraj serię rzutów karnych z Markiem.',playBtn:'Gramy w karne!',win:'Wygrana! Wróć do Marka po nagrodę.',lose:'Tym razem nie wyszło - porozmawiaj z trenerem i spróbuj jeszcze raz.',
      doneBtn:'No i jak, biorę miejsce w drużynie?',done:'Jasne! Witamy w LZS Trębaczew. Masz tu premię od klubu.',money:250,xp:60,talk:['Jak idzie LZS w tym sezonie?','Na jakiej pozycji grasz?']},
    burek:{name:'Właścicielka Burka',title:'spacer z psem po parku',col:'#e0709a',at:()=>[42,-238],dog:true,look:{top:0x6a9ad8,bot:0x2a2a30,hair:0xb08a50,opt:{female:true,style:'jacket',hairStyle:'long',skin:0xf0cfb2,shoe:0xe8e8e4}},
      canned:{start:'Cześć! Burek, siad! Przepraszam, on jest bardzo ciekawski.',zadanie:'Czerwona piłka Burka wpadła gdzieś w krzaki na skraju parku. Poszukasz?',ma:'Burek już merda ogonem - chyba czuje swoją piłkę!',koniec:'Dzięki! Burek jest najszczęśliwszym psem w Trębaczewie.'},
      ask:'Co się stało?',give:'Rzuciłam Burkowi piłkę za mocno i poleciała w krzaki na skraju parku. On sam jej nie znajdzie. Pomożesz?',task:'Nowe zadanie: znajdź czerwoną piłkę Burka w krzakach na skraju parku.',
      item:'pilka_burka',pick:{kind:'pilka',at:()=>[60,-222],label:'wyciągnij piłkę Burka z krzaków',got:'Masz <b>piłkę Burka</b> - oddaj ją właścicielce psa'},
      doneBtn:'Proszę, piłka Burka',done:'Burek, patrz! Dziękuję, masz tu coś na lody.',money:90,xp:30,talk:['Jakiej rasy jest Burek?','Często tu spacerujecie?']},
    heniek:{name:'Ogrodnik Heniek',title:'dba o park w Trębaczewie',col:'#6aa02a',at:()=>[22,-282],barrow:true,look:{top:0x3f6b3a,bot:0x3a4a30,hair:0x6a5a4a,opt:{female:false,style:'jacket',hairStyle:'cap',capC:0x3f6b3a,skin:0xd09a7a,shoe:0x3a2a1a,stubble:true}},
      canned:{start:'Dzień dobry! Jesień, liście lecą, a ja sam do grabienia.',zadanie:'Trzy worki z liśćmi stoją w różnych miejscach parku. Przynieś je do mojej taczki.',ma:'O, widzę worki! Dawaj je tutaj.',koniec:'Park jak z obrazka. Dziękuję za pomoc!'},
      ask:'Pomogę panu',give:'Złoty człowiek! Nagrabiłem trzy worki liści, ale zostały w różnych miejscach parku. Znieś je do mojej taczki.',task:'Nowe zadanie: zbierz trzy worki z liśćmi w parku i przynieś je Ogrodnikowi Heńkowi.',
      picks:[{kind:'worek',at:()=>[-4,-232],item:'worek1',label:'weź worek z liśćmi (1 z 3)'},{kind:'worek',at:()=>[48,-262],item:'worek2',label:'weź worek z liśćmi (2 z 3)'},{kind:'worek',at:()=>[80,-282],item:'worek3',label:'weź worek z liśćmi (3 z 3)'}],gotAll:'Masz wszystkie worki - zanieś je Ogrodnikowi Heńkowi',
      doneBtn:'Są wszystkie trzy worki',done:'Wszystkie trzy! Teraz na kompost. Dziękuję, masz tu za pomoc.',money:170,xp:45,talk:['Jakie drzewa rosną w parku?','Co pan sadzi na wiosnę?']},
    jozek:{name:'Dziadek Józek',title:'karmi gołębie w parku',col:'#b08a50',bench:7,pigeons:true,buy:{shop:'Żabka',name:'Bułka dla gołębi',price:3},item:'bulka',look:{top:0x7a6a5a,bot:0x3a3a3a,hair:0xe0e0e0,opt:{female:false,style:'coat',hairStyle:'cap',capC:0x4a3a2a,skin:0xe8c0a0,shoe:0x2a2420}},
      canned:{start:'Gruli, gruli… Dzień dobry. Gołębie głodne, a mi się bułka skończyła.',zadanie:'Bułkę kupisz w Żabce przy Wyzwolenia. Tylko taką zwykłą, bez masła!',ma:'Pachnie świeżą bułką!',koniec:'Patrz, jak się cieszą. Dziękuję ci, dziecko.'},
      ask:'Mogę kupić bułkę',give:'Byłbyś taki dobry? W Żabce mają bułki. Ja już nie mam siły tam chodzić.',task:'Nowe zadanie: kup w Żabce bułkę dla gołębi i przynieś Dziadkowi Józkowi.',
      doneBtn:'Proszę, bułka dla gołębi',done:'Gruli, gruli! Dziękuję. Weź, kup sobie coś dobrego.',money:80,xp:25,talk:['Ile tu jest gołębi?','Od dawna karmi pan gołębie?']} });
  { const zb=SHOPS.find(q=>q.n==='Żabka'); if(zb) zb.items.push(['Kiełbasa na grilla',15,'npc','kielbasa_grill']); }
  Object.keys(NPC_DEF).forEach(id=>{ const D=NPC_DEF[id]; if(D.picks) D.items=D.picks.map(p=>p.item); else D.items=D.item?[D.item]:[]; if(D.buy){ const sh=SHOPS.find(q=>q.n===D.buy.shop); if(sh&&!sh.items.some(it=>it[0]===D.buy.name)) sh.items.push([D.buy.name,D.buy.price,'npc',D.item]); } });
  // proste modele do parku: pies, gołębie, szachownica, taczka, pachołki
  const PARK_ANIM=[];
  function dogModel(col){ const g=new THREE.Group(); const M=new THREE.MeshLambertMaterial({color:col}), Dk=new THREE.MeshLambertMaterial({color:0x2a1d14});
    const body=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8).scale(1.7,.85,.8),M); body.position.y=.42; g.add(body);
    const head=new THREE.Group(); head.position.set(.36,.6,0); g.add(head); const hm=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),M); head.add(hm); const sn=new THREE.Mesh(new THREE.BoxGeometry(.14,.09,.1),M); sn.position.set(.12,-.03,0); head.add(sn); const nose=new THREE.Mesh(new THREE.SphereGeometry(.025,6,5),Dk); nose.position.set(.2,-.01,0); head.add(nose);
    [-.07,.07].forEach(z=>{ const e=new THREE.Mesh(new THREE.BoxGeometry(.05,.12,.07),Dk); e.position.set(-.02,.1,z); e.rotation.x=z>0?.4:-.4; head.add(e); });
    [[.2,.1],[.2,-.1],[-.2,.1],[-.2,-.1]].forEach(([x,z])=>{ const l=new THREE.Mesh(new THREE.CylinderGeometry(.04,.035,.36,6),M); l.position.set(x,.18,z); g.add(l); });
    const tail=new THREE.Group(); tail.position.set(-.32,.5,0); g.add(tail); const t=new THREE.Mesh(new THREE.CylinderGeometry(.025,.015,.26,6),M); t.position.y=.12; t.rotation.z=.5; tail.add(t); g.userData={tail,head}; return g; }
  function pigeonModel(){ const g=new THREE.Group(); const M=new THREE.MeshLambertMaterial({color:pick([0x8a8e96,0x7a7e86,0x9a9ea6,0x6a6e76])}); const b=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),M); b.scale.set(1.4,1,1); b.position.y=.1; g.add(b);
    const h=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),new THREE.MeshLambertMaterial({color:0x5a6a7a})); h.position.set(.12,.18,0); g.add(h); const bk=new THREE.Mesh(new THREE.ConeGeometry(.012,.04,4),new THREE.MeshLambertMaterial({color:0xd8b090})); bk.rotation.z=-Math.PI/2; bk.position.set(.18,.18,0); g.add(bk); g.userData.h=h; return g; }
  function propModel(kind){ const g=new THREE.Group(); const M=c=>new THREE.MeshLambertMaterial({color:c});
    if(kind==='szachy'){ const t=tex(64,64,(x,w,h)=>{ for(let i=0;i<8;i++)for(let j=0;j<8;j++){ x.fillStyle=(i+j)%2?'#3a2a1a':'#e8d8b8'; x.fillRect(i*8,j*8,8,8); } }); bx(g,.36,.04,.36,0,0,0,M(0x6a4a2a)); const top=new THREE.Mesh(new THREE.PlaneGeometry(.34,.34).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({map:t})); top.position.y=.042; g.add(top); for(let k=0;k<6;k++){ const pc=new THREE.Mesh(new THREE.CylinderGeometry(.012,.016,.05,6),M(k%2?0x1a1a1a:0xf2f2ea)); pc.position.set(-.12+k*.05,.07,k%2?.1:-.1); g.add(pc); } }
    if(kind==='taczka'){ bx(g,.7,.28,.5,0,.3,0,M(0x2f6b2f)); const w=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.08,12).rotateX(Math.PI/2),M(0x222222)); w.position.set(.42,.16,0); g.add(w); [-.18,.18].forEach(z=>{ bx(g,.8,.04,.04,-.35,.4,z,M(0x8a6a4a)); bx(g,.04,.3,.04,-.15,0,z,M(0x5a5a5a)); }); for(let k=0;k<3;k++){ const lf=new THREE.Mesh(new THREE.SphereGeometry(.18,6,5),M([0xc8642c,0xd9a23a,0x8a5a2a][k])); lf.scale.y=.5; lf.position.set(-.15+k*.15,.6,0); g.add(lf); } }
    if(kind==='pacholki'){ for(let k=0;k<4;k++){ const c=new THREE.Mesh(new THREE.ConeGeometry(.12,.3,10),M(0xf07a1f)); c.position.set(k*1.2,.15,0); g.add(c); } const b=new THREE.Mesh(new THREE.SphereGeometry(.11,12,10),M(0xf2f2f2)); b.position.set(-.8,.11,.4); g.add(b); }
    return g; }
  Object.keys(NPC_DEF).forEach(id=>{ if(!NQ[id]) NQ[id]='start'; const d=NPC_DEF[id]; let n;
    const bench=d.bench!==undefined&&PARK.benches?PARK.benches[d.bench]:null;
    if(bench){ const o=-.45, x=bench.x+Math.cos(bench.ry)*o+Math.sin(bench.ry)*.05, z=bench.z-Math.sin(bench.ry)*o+Math.cos(bench.ry)*.05; n=addNPC(id,d.name,d.title,d.col,[x,z],bench.ry,d.look); sitPose(n.p,.46); n.p.position.y=H(x,z)+n.p.position.y+.1; n.sit=true; n.tag.position.y-=.45;
      if(d.kind==='quiz'){ const ch=propModel('szachy'); const q=[bench.x+Math.cos(bench.ry)*.35,bench.z-Math.sin(bench.ry)*.35]; ch.position.set(q[0],H(q[0],q[1])+.5,q[1]); ch.rotation.y=bench.ry; scene.add(ch); }
      if(d.pigeons) for(let k=0;k<7;k++){ const a=k*.9+R(-.2,.2), r=1.4+R(0,1.6); const px=x+Math.sin(bench.ry)*r+Math.cos(a)*.6, pz=z+Math.cos(bench.ry)*r+Math.sin(a)*.6; const pg=pigeonModel(); pg.position.set(px,H(px,pz)+.02,pz); pg.rotation.y=R(0,6.28); scene.add(pg); PARK_ANIM.push({k:'pigeon',g:pg,t:R(0,5)}); } }
    else { const a=d.at(); const q=npcFind(a[0],a[1],1.4); n=addNPC(id,d.name,d.title,d.col,q,rnd()*6.28,d.look); }
    n.def=d;
    if(d.dog){ const dg=dogModel(0x8a5a2a); const q=[n.x+.9,n.z+.5]; dg.position.set(q[0],H(q[0],q[1]),q[1]); dg.rotation.y=R(0,6.28); scene.add(dg); PARK_ANIM.push({k:'dog',g:dg,t:0}); }
    if(d.barrow){ const tb=propModel('taczka'); const q=[n.x-1.2,n.z+.6]; tb.position.set(q[0],H(q[0],q[1]),q[1]); tb.rotation.y=.6; scene.add(tb); addSolid({x:q[0],z:q[1],hw:.5,hd:.4,c:1,s:0,r:.7}); }
    if(d.kind==='mini'){ const pc=propModel('pacholki'); const q=[n.x+1.5,n.z-1.5]; pc.position.set(q[0],H(q[0],q[1]),q[1]); pc.rotation.y=R(0,6.28); scene.add(pc); }
    (d.picks||(d.pick?[Object.assign({item:d.item},d.pick)]:[])).forEach((pi,k)=>{ const pa=pi.at(); const pp=npcFind(pa[0],pa[1],pi.keep?1:.7); const g=pickMesh(pi.kind); g.position.set(pp[0],H(pp[0],pp[1]),pp[1]); g.rotation.y=rnd()*6.28; scene.add(g); if(pi.keep) addSolid({x:pp[0],z:pp[1],hw:.4,hd:.4,c:1,s:0,r:.6});
      const it=pi.item; NPC_PICKS.push({id:id+'_pick'+(d.picks?k:''),p:pp,g,keep:pi.keep,label:pi.label,on:()=>NQ[id]==='zadanie'&&!hasIt(it)&&(!d.startItem||hasIt(d.startItem)),act:()=>{ if(d.startItem) takeIt(d.startItem); giveIt(it); toast(d.items.every(hasIt)&&d.gotAll?d.gotAll:(pi.got||'Masz: <b>'+pi.label.replace(/^weź /,'')+'</b>'),3); }}); }); });
  // schronisko dla zwierząt w Trębaczewie: tablica, budy z psami, pracownik; pies do adopcji (misja „Pies ze schroniska”)
  const SHELTER=(()=>{ const P=POIS.find(q=>q.n.startsWith('Schronisko')); if(!P) return null; const b=BLD.filter(q=>Math.hypot(q.x-P.x,q.z-P.z)<12).sort((a,c)=>Math.hypot(a.x-P.x,a.z-P.z)-Math.hypot(c.x-P.x,c.z-P.z))[0]||{x:P.x,z:P.z};
    const nr=nearestRoad(b.x,b.z,r=>r.t!=='track'); const a=nr.r.pts[nr.seg], c=nr.r.pts[nr.seg+1]; const dx=c[0]-a[0], dz=c[1]-a[1], L=dx*dx+dz*dz; const t=clamp(((b.x-a[0])*dx+(b.z-a[1])*dz)/L,0,1); const rx=a[0]+dx*t, rz=a[1]+dz*t; let nx=b.x-rx, nz=b.z-rz; const nl=Math.hypot(nx,nz)||1; nx/=nl; nz/=nl;
    const gate=npcFind(rx+nx*(nr.r.w/2+2.5),rz+nz*(nr.r.w/2+2.5),1.2);
    { const g=new THREE.Group(); g.position.set(gate[0]+(-nz)*3,H(gate[0],gate[1]),gate[1]+nx*3); g.rotation.y=Math.atan2(-nx,-nz); scene.add(g); const wood=new THREE.MeshLambertMaterial({color:0x5b3e28}); [-1.1,1.1].forEach(o=>bx(g,.12,2.4,.12,o,0,0,wood));
      pl(g,2.4,.9,0,2.0,.07,new THREE.MeshLambertMaterial({map:signTex('SCHRONISKO DLA ZWIERZĄT','#2f7a3a','#ffffff',512,128,'800 40px Barlow, Arial')})); pl(g,2.4,.9,0,2.0,-.07,new THREE.MeshLambertMaterial({map:signTex('🐾 Trębaczew','#2f7a3a','#ffffff',512,128,'800 52px Barlow, Arial')}),Math.PI); }
    const kennel=(x,z,ry)=>{ const g=new THREE.Group(); g.position.set(x,H(x,z),z); g.rotation.y=ry; scene.add(g); const w=new THREE.MeshLambertMaterial({color:0x8a5a34}), rf=new THREE.MeshLambertMaterial({color:0x6a2a20}); bx(g,1.0,.7,1.2,0,0,0,w); const r1=new THREE.Mesh(new THREE.BoxGeometry(.75,.05,1.3),rf); r1.position.set(-.25,.85,0); r1.rotation.z=.6; g.add(r1); const r2=r1.clone(); r2.position.x=.25; r2.rotation.z=-.6; g.add(r2); bx(g,.4,.45,.02,0,0,.61,new THREE.MeshLambertMaterial({color:0x1a120c})); addSolid({x,z,hw:.55,hd:.65,c:Math.cos(-ry),s:Math.sin(-ry),r:.9}); };
    const cols=[0x2a2420,0xc8a070,0xf2f2ea,0x6a4a2a,0x8a8a8a]; const tx=-nz, tz=nx;
    for(let k=0;k<4;k++){ const q=npcFind(gate[0]+nx*5+tx*(k*3.2-4.8),gate[1]+nz*5+tz*(k*3.2-4.8),1.1,300); kennel(q[0]+nx*1.2,q[1]+nz*1.2,Math.atan2(-nx,-nz)); const dg=dogModel(cols[k%cols.length]); dg.position.set(q[0],H(q[0],q[1]),q[1]); dg.rotation.y=Math.atan2(-nz,nx)+R(-.6,.6); scene.add(dg); PARK_ANIM.push({k:'dog',g:dg,t:R(0,3)}); }
    const wk=makePerson(0x2f7a3a,0x2a2c30,0x6b4426,{female:true,style:'jacket',hairStyle:'pony',exact:true}); const wq=npcFind(gate[0]+tx*2,gate[1]+tz*2,1,200); wk.position.set(wq[0],H(wq[0],wq[1])+.1,wq[1]); wk.rotation.y=Math.atan2(-nx,-nz); scene.add(wk); addSolid({x:wq[0],z:wq[1],hw:.25,hd:.25,c:1,s:0,r:.4});
    return {gate,b,nx,nz,road:[rx,rz]}; })();
  const ADOPT=(()=>{ const f=B_LEW&&B_LEW.front; if(!f) return null; const h=houses.filter(q=>q.kind==='house'&&!q.isPart&&!q.cust).map(q=>[q,Math.hypot(q.x-f.x,q.z-f.z)]).filter(q=>q[1]>18).sort((a,b)=>a[1]-b[1])[0]; if(!h) return null; const p=frontOf(h[0]); const yard=npcFind(p[0]+(h[0].x-p[0])*.25,p[1]+(h[0].z-p[1])*.25,.8,300); return {h:h[0],p,yard}; })();
  const AZOR={on:false,g:null,home:false};
  function azorMake(){ if(AZOR.g) return AZOR.g; const g=dogModel(0xc8a070); g.scale.setScalar(.95); scene.add(g); PARK_ANIM.push({k:'dog',g,t:0}); AZOR.g=g; return g; }
  function azorHome(){ const g=azorMake(); AZOR.on=false; AZOR.home=true; if(g.parent!==scene){ scene.add(g); } g.position.set(ADOPT.yard[0],H(ADOPT.yard[0],ADOPT.yard[1]),ADOPT.yard[1]); g.rotation.set(0,R(0,6.28),0); }
  function azorUpdate(dt){ if(!AZOR.on||!AZOR.g) return; const g=AZOR.g;
    if(st.car&&st.car.g){ if(g.parent!==st.car.g){ st.car.g.add(g); } g.position.set(-.55,.62,.32); g.rotation.set(0,0,0); }
    else { if(g.parent!==scene) scene.add(g); if(st.inside){ g.visible=false; return; } g.visible=true; const tx=st.x-Math.sin(st.face)*1.4+Math.cos(st.face)*.5, tz=st.z-Math.cos(st.face)*1.4-Math.sin(st.face)*.5; const dx=tx-g.position.x, dz=tz-g.position.z, d=Math.hypot(dx,dz);
      if(d>25){ g.position.set(tx,H(tx,tz),tz); } else if(d>.3){ const sp=Math.min(d*3,9)*dt; g.position.x+=dx/d*sp; g.position.z+=dz/d*sp; g.rotation.y=Math.atan2(-dz,dx); } g.position.y=H(g.position.x,g.position.z)+(d>.3?Math.abs(Math.sin(tAll*14))*.04:0); } }
  if(NQ.azor==='dom'&&ADOPT) azorHome();
  function parkAnim(dt){ azorUpdate(dt); PARK_ANIM.forEach(a=>{ a.t+=dt; const d2=Math.hypot(a.g.position.x-st.x,a.g.position.z-st.z); if(d2>60)return; if(a.k==='dog'){ a.g.userData.tail.rotation.x=Math.sin(a.t*14)*.6; a.g.userData.head.rotation.y=Math.sin(a.t*.7)*.4; }
      else if(a.k==='pigeon'){ const ph=(a.t%2.4); a.g.userData.h.position.y=ph<.3?.1:.18; if(ph>2.3) a.g.rotation.y+=R(-.8,.8)*dt*10; if(d2<2.5&&!a.fly){ a.fly=1.2; } if(a.fly){ a.fly-=dt; a.g.position.y+=dt*3; if(a.fly<=0){ a.fly=0; a.g.position.y=H(a.g.position.x,a.g.position.z)+.02; } } } }); }
  // remiza OSP: grill strażaków i dwóch druhów, którzy plotkują przy bramie
  if(OSP_YARD){ const {w,L,FZ,toRoad,f}=OSP_YARD; const gp=OSP_YARD.inYard(L/2-1.2,FZ+Math.min(6,toRoad*.6),1.6); const g=new THREE.Group(); g.position.set(gp[0],H(gp[0],gp[1]),gp[1]); g.rotation.y=f.rot; scene.add(g);
    const blk=new THREE.MeshLambertMaterial({color:0x222426}); bx(g,1.2,.25,.5,0,.75,0,blk); [-.5,.5].forEach(x=>[-.2,.2].forEach(z=>bx(g,.04,.75,.04,x,0,z,blk,true))); const coal=new THREE.Mesh(new THREE.BoxGeometry(1.0,.04,.36),new THREE.MeshBasicMaterial({color:0xff6a20})); coal.position.y=1.0; g.add(coal);
    for(let k=0;k<5;k++){ const s2=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.32,8).rotateZ(Math.PI/2),new THREE.MeshLambertMaterial({color:0xb0553a})); s2.position.set(-.3+k*.15,1.04,0); g.add(s2); } addSolid({x:gp[0],z:gp[1],hw:.7,hd:.35,c:Math.cos(-f.rot),s:Math.sin(-f.rot),r:.9});
    NPC_PICKS.push({id:'grill',p:gp,label:'poproś strażaków o kiełbasę z grilla',on:()=>NQ.mietek==='zadanie'&&!hasIt('kielbasa'),act:()=>{ giveIt('kielbasa'); toast('Druh Marek: „Bierz, sąsiedzie, na zdrowie!”<br>Masz <b>kiełbasę z grilla</b> - zanieś ją Mietkowi',3.5); }});
    const lp=OSP_YARD.inYard(L/2-3.2,FZ+2.4,1.6); [[-.6,Math.PI/2],[.6,-Math.PI/2]].forEach(([o,r])=>{ const q=[lp[0]+Math.cos(-f.rot)*o,lp[1]+Math.sin(-f.rot)*o]; const p=makePerson(0x1f2a44,0x1f2a44,pick([0x2a1d14,0x6b4426]),{female:false,style:'jacket',hairStyle:'short',exact:true}); p.position.set(q[0],H(q[0],q[1])+.1,q[1]); p.rotation.y=f.rot+r; scene.add(p); addSolid({x:q[0],z:q[1],hw:.3,hd:.3,c:1,s:0,r:.5}); });
    NPC_PICKS.push({id:'plotka',p:lp,listen:true,label:'podsłuchaj, o czym rozmawiają strażacy',on:()=>NQ.jadzia==='zadanie'&&!hasIt('plotka'),act:()=>{}}); }
  // znaczniki celów zadań (świetlne słupy)
  const beaconM=new THREE.MeshBasicMaterial({color:0xffd34a,transparent:true,opacity:.28,depthWrite:false}); const BEAC=NPC_PICKS.map(k=>{ const m=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,14,12,1,true).translate(0,7,0),beaconM); m.position.set(k.p[0],H(k.p[0],k.p[1]),k.p[1]); m.visible=false; scene.add(m); return m; });
  // opisy zadań postaci do dziennika (Q) i cel na radarze
  const NPC_INFO={ mietek:{where:'pod Lewiatanem',task:'Przynieś Mietkowi kiełbasę z grilla przy remizie OSP.',pick:'grill',money:150,xp:40},
    seba:{where:'w parku przy Zielonej, obok czarnego BMW E46',task:'Przynieś Sebie klucz 10 mm i trytytki ze skrzynki przy garażu.',pick:'narzedzia',money:200,xp:50,bad:'Seba jest obrażony - przeproś go i doceń jego BMW.'},
    jadzia:{where:'przed domem niedaleko remizy OSP',task:'Podsłuchaj strażaków pod remizą OSP (postój chwilę obok) i wróć z plotką.',pick:'plotka',money:120,xp:40,bad:'Pani Jadzia jest obrażona - przeproś i idź jeszcze raz pod remizę.'} };
  Object.keys(NPC_DEF).forEach(id=>{ const D=NPC_DEF[id]; NPC_INFO[id]={where:{andrzej:'przy Żabce',soltys:'przy bibliotece',halina:'przy Szkolnej, niedaleko Lewiatana',stasiek:'przy swoim ciągniku',kasia:'przy orliku',wiesiek:'przy Szkolnej, koło ośrodka zdrowia',zenek:'na ławce w parku, przy szachownicy',marek:'w parku przy orliku',burek:'w parku, z psem Burkiem',heniek:'w parku przy placu zabaw, z taczką',jozek:'na ławce w parku, wśród gołębi'}[id]||'',task:D.task.replace(/^Nowe zadanie: /,'').replace(/^./,c=>c.toUpperCase()),pick:id+'_pick',money:D.money,xp:D.xp}; });
  function npcTarget(n){ const s=npcStage(n.id), I=NPC_INFO[n.id], D=NPC_DEF[n.id]; if(s==='zadanie'&&I){ if(D&&D.buy){ const sh=SHOPS.find(q=>q.n===D.buy.shop); if(sh&&!hasIt(D.item)) return {p:sh.p.slice(),what:D.buy.shop}; } const k=NPC_PICKS.find(q=>(q.id===I.pick||q.id.startsWith(I.pick))&&q.on()); if(k) return {p:k.p,what:'cel zadania'}; } if(s==='koniec') return null; return {p:[n.x,n.z],what:n.name}; }
  // znaczek nad głową: „!” - zadanie do wzięcia, „?” - można oddać zadanie
  const markTex=(ch,bg)=>{ const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); x.fillStyle=bg; x.beginPath(); x.arc(32,32,28,0,7); x.fill(); x.lineWidth=4; x.strokeStyle='#1a1a1a'; x.stroke(); x.fillStyle='#1a1a1a'; x.font='900 44px Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(ch,32,35); const t=new THREE.CanvasTexture(c); return new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}); };
  const MARK_EX=markTex('!','#ffd34a'), MARK_Q=markTex('?','#7ee08a');
  NPC.forEach(n=>{ const sp=new THREE.Sprite(MARK_EX); sp.scale.set(.55,.55,.55); sp.position.set(n.x,H(n.x,n.z)+2.95,n.z); sp.renderOrder=5; sp.visible=false; scene.add(sp); n.mark=sp; });
  let listenT=0, bumpT=0;
  function npcUpdate(dt){ if(st.inside){ return; } const px=st.car?st.car.x:st.x, pz=st.car?st.car.z:st.z;
    NPC_PICKS.forEach((k,i)=>BEAC[i].visible=k.on());
    NPC.forEach(n=>{ const d=Math.hypot(px-n.x,pz-n.z); n.tag.visible=d<22; if(n.mark){ const s=npcStage(n.id); const m=s==='start'?MARK_EX:s==='ma'?MARK_Q:null; n.mark.visible=!!m&&d<60&&!NPC_OPEN; if(m){ n.mark.material=m; n.mark.position.y=H(n.x,n.z)+2.95+Math.sin(tAll*2.5)*.08; } } const tgt=d<5&&!n.sit?Math.atan2(px-n.x,pz-n.z):n.face0; let df=tgt-n.p.rotation.y; df=Math.atan2(Math.sin(df),Math.cos(df)); n.p.rotation.y+=df*Math.min(1,dt*3);
      if(n.def&&n.def.wobble){ n.p.rotation.z=Math.sin(tAll*1.3)*.05; n.p.rotation.x=Math.sin(tAll*.83+1)*.035; } });
    NPC_PICKS.forEach(k=>{ if(k.g&&!k.keep) k.g.visible=k.on(); }); parkAnim(dt);
    if(NPC_OPEN&&Math.hypot(px-NPC_OPEN.x,pz-NPC_OPEN.z)>4.5) closeNPC();
    const L=NPC_PICKS.find(k=>k.listen&&k.on()); if(L&&!st.car&&Math.hypot(px-L.p[0],pz-L.p[1])<4){ listenT+=dt; if(listenT>5){ listenT=0; NQ.gi=Math.floor(rnd()*NPC_GOSSIP.length); giveIt('plotka'); toast(`Podsłuchałeś: <i>„${NPC_GOSSIP[NQ.gi]}”</i><br>Wróć do Pani Jadzi`,5); } } else listenT=Math.max(0,listenT-dt); }
  function nearNPCthing(){ if(st.car||NPC_OPEN)return null; if(st.inside){ if(CUR!==IN||!IN.built) return null; let b=null,bd=1.6; IN_TALK.forEach(n=>{ const d=Math.hypot(st.x-n.x,st.z-n.z); if(d<bd){ bd=d; b={npc:n}; } }); return b; } let best=null,bd=2.4; NPC.forEach(n=>{ const d=Math.hypot(st.x-n.x,st.z-n.z); if(d<bd){bd=d;best={npc:n};} }); NPC_PICKS.forEach(k=>{ if(k.listen||!k.on())return; const d=Math.hypot(st.x-k.p[0],st.z-k.p[1]); if(d<bd+.4){bd=d;best={pick:k};} }); return best; }
  function npcHint(E){ const t=nearNPCthing(); if(!t){ const L=NPC_PICKS.find(k=>k.listen&&k.on()); if(L&&Math.hypot(st.x-L.p[0],st.z-L.p[1])<4) return `Podsłuchujesz strażaków… ${Math.max(1,Math.ceil(5-listenT))} s`; return ''; } return t.npc?`${E} porozmawiaj: <b>${t.npc.name}</b>`:`${E} ${t.pick.label}`; }
  function npcInteract(){ const t=nearNPCthing(); if(!t)return false; if(t.npc) openNPC(t.npc); else t.pick.act(); return true; }
  // ---------- okno rozmowy ----------
  let NPC_OPEN=null;
  { const css=document.createElement('style'); css.textContent=`#npcBox{position:fixed;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(580px,calc(100vw - 24px));max-height:min(62vh,520px);display:flex;flex-direction:column;background:rgba(12,14,16,.94);border:1px solid var(--line);border-top:4px solid var(--accent);z-index:35;font-family:var(--font-ui);color:var(--ink);box-shadow:0 10px 40px rgba(0,0,0,.5)}
#npcBox[hidden]{display:none}#npcBox header{display:flex;align-items:baseline;gap:10px;padding:10px 14px 6px}#npcBox header b{font-family:var(--font-sign);font-size:22px;letter-spacing:.03em}#npcBox header span{color:var(--muted);font-size:13px;flex:1}
#npcLog{overflow:auto;padding:4px 14px;display:flex;flex-direction:column;gap:6px;min-height:80px}#npcLog p{margin:0;padding:7px 10px;border-radius:3px;line-height:1.4;font-size:15px;max-width:88%}#npcLog p.n{background:rgba(255,255,255,.07);align-self:flex-start}#npcLog p.u{background:rgba(242,194,48,.18);align-self:flex-end}#npcLog p.s{color:var(--muted);font-size:13px;font-style:italic;align-self:center;background:none}
#npcCh{display:flex;flex-wrap:wrap;gap:6px;padding:8px 14px 2px}#npcCh button{font-size:14px;padding:6px 10px}#npcIn{display:flex;gap:6px;padding:8px 14px 12px}#npcIn input{flex:1;min-width:0;background:rgba(255,255,255,.08);color:var(--ink);border:1px solid var(--line);border-radius:3px;padding:8px 10px;font:inherit;font-size:15px}
#npcBox .typing{opacity:.6}`; document.head.appendChild(css);
    const box=document.createElement('div'); box.id='npcBox'; box.hidden=true; box.setAttribute('role','dialog'); box.innerHTML=`<header><b id="npcName"></b><span id="npcTitle"></span><button class="btn" id="npcX" aria-label="Zamknij rozmowę">Zamknij · Esc</button></header><div id="npcLog" aria-live="polite"></div><div id="npcCh"></div><form id="npcIn"><input id="npcTxt" maxlength="160" autocomplete="off" placeholder="Napisz coś…" aria-label="Twoja wypowiedź"><button class="btn pri">Powiedz</button></form>`; document.body.appendChild(box); }
  const npcLog=$('npcLog'), npcCh=$('npcCh'), npcTxt=$('npcTxt');
  function npcSay(cls,t){ const p=document.createElement('p'); p.className=cls; p.textContent=t; npcLog.appendChild(p); npcLog.scrollTop=npcLog.scrollHeight; return p; }
  function npcHist(id){ return NQ.hist[id]||(NQ.hist[id]=[]); }
  function npcPush(id,r,t){ const h=npcHist(id); h.push({r,t}); if(h.length>10) h.splice(0,h.length-10); nqSave(); }
  function npcStage(id){ const s=NQ[id]||'start'; const D=NPC_DEF[id]; if(D) return s==='zadanie'&&D.items.length&&D.items.every(hasIt)?'ma':s; if(id==='mietek'&&s==='zadanie'&&hasIt('kielbasa')) return 'ma'; if(id==='seba'&&s==='zadanie'&&hasIt('klucz10')&&hasIt('trytytki')) return 'ma'; if(id==='jadzia'&&s==='zadanie'&&hasIt('plotka')) return 'ma'; return s; }
  const NPC_CANNED={ mietek:{start:'Nooo, szeeefie… Stoję tu od rana pod sklepem i coś mi w brzuchu burczy.',zadanie:'Kierowniku, kiełbaska z grilla spod remizy. Strażacy dziś grillują, wiem to na pewno.',ma:'Czuję zapach! Szeeefie, to kiełbaska z remizy?',koniec:'Szeeefie, LZS w weekend gra u siebie. Będzie się działo, mówię ci.'},
    stasia:{start:'Ojej, dzień dobry! Właśnie mówię pani Grażynce, że wszystko drożeje. Pan też w kolejce?',zadanie:'Siatka niech pan zaniesie pod mój dom, przy furtce zostawić. Dom zaraz za Lewiatanem.',koniec:'Dziękuję, złote dziecko! Pani Grażynko, widzi pani, jacy tu dobrzy ludzie mieszkają.'},
    grazyna:{start:'Dzień dobry! Pani Stasia zaraz kończy, a pan zapraszam do kasy obok.',koniec:'Dzień dobry! Co podać?'},
    seba:{start:'Co jest, ziomek? Beemka mi znowu odwala, check engine świeci jak choinka.',obrazony:'Spadaj, mordo. Z takimi tekstami nie gadam.',zadanie:'Mordo, klucz dziesiątka i trytytki. Bez tego nie ruszę.',ma:'O, mordo, masz to?',koniec:'Ziomek, E46-ka chodzi jak złoto, sześć cylindrów mruczy. Chcesz się przejechać? Kluczyki w stacyjce - tylko odstaw ją w całości!'},
    jadzia:{start:'Ojej, dzień dobry, dzień dobry! A pan słyszał, co się wczoraj działo po dyskotece?',zadanie:'Panie dziejku, pod remizą strażacy na pewno gadają. Niech pan podsłucha, tylko dyskretnie!',ma:'No i co, no i co? Kto z kim wracał?',obrazona:'Kto to widział, żeby tak starszą osobę okłamywać! Niech pan idzie jeszcze raz pod remizę.',koniec:'Ojej, to ci dopiero! Dziękuję, złote serce z pana.'} };
  function npcChoices(n){ npcCh.innerHTML=''; const id=n.id, s=npcStage(id); const add=(t,fn)=>{ const b=document.createElement('button'); b.className='btn'; b.textContent=t; b.onclick=()=>{ npcSay('u',t); npcPush(id,'u',t); fn(); }; npcCh.appendChild(b); };
    const reply=t=>{ npcSay('n',t); npcPush(id,'n',t); }, sys=t=>npcSay('s',t), after=()=>{ nqSave(); setTimeout(()=>npcChoices(n),30); };
    if(id==='mietek'){
      if(s==='start') add('Co tak stoisz, Mietek? Pomóc w czymś?',()=>{ reply('Kiełbaska z grilla spod remizy OSP, szefie. Jak przyniesiesz, to ci powiem, jak LZS zagra w weekend.'); NQ.mietek='zadanie'; sys('Nowe zadanie: przynieś Mietkowi kiełbasę z grilla przy remizie OSP.'); after(); });
      if(s==='ma') add('Proszę, kiełbasa z remizy',()=>{ takeIt('kielbasa'); NQ.mietek='koniec'; reply('Nooo, szeeefie, złoty człowiek! A LZS w weekend wygra, mówię ci.'); addMoney(150); addXP(40); sys('Zadanie wykonane: +150 zł, +40 XP'); mietekMove(); after(); });
      add('Jak szanse LZS w weekend?',()=>npcAI(n,'Jak oceniasz szanse LZS Trębaczew w weekendowym meczu?',true)); }
    if(id==='seba'){
      if(s==='start'){ add('Ładna fura! E46 to klasyk.',()=>{ reply('No w końcu ktoś, kto się zna! Mordo, padła mi cewka zapłonowa i coś stuka w wahaczu. Skoczysz po klucz dziesiątkę i trytytki? W garażu przy domu niedaleko jest skrzynka z narzędziami.'); NQ.seba='zadanie'; sys('Nowe zadanie: przynieś Sebie klucz 10 mm i trytytki ze skrzynki przy garażu.'); after(); });
        add('Co to za złom?',()=>{ reply('Złom?! Ziomek, ty się lepiej odsuń od mojej fury. Nie gadam z tobą.'); NQ.seba='obrazony'; after(); });
        add('Co się stało z autem?',()=>npcAI(n,'Co się stało z twoim autem?',true)); }
      if(s==='obrazony') add('Sorry, mordo. BMW jest git.',()=>{ reply('No… dobra, ziomek. Ale uważaj, co gadasz o mojej furze.'); NQ.seba='start'; after(); });
      if(s==='ma') add('Masz klucz 10 i trytytki',()=>{ takeIt('klucz10'); takeIt('trytytki'); NQ.seba='koniec'; reply('Mordo, jesteś złoty! Osłona odkręcona, cewka wymieniona, trytytka tu… i check engine zgasł! Szacun, ziomek.'); addMoney(200); addXP(50); sys('Zadanie wykonane: +200 zł, +50 XP'); after(); }); }
    const D=NPC_DEF[id]; if(D){
      const finish=()=>{ D.items.forEach(takeIt); NQ[id]='koniec'; reply(D.done); addMoney(D.money); addXP(D.xp); sys(`Zadanie wykonane: +${D.money} zł, +${D.xp} XP`); after(); };
      if(s==='start') add(D.ask,()=>{ reply(D.give); NQ[id]='zadanie'; NQ[id+'_q']=0; if(D.startItem) giveIt(D.startItem); sys(D.task); if(D.kind==='quiz') reply(D.quiz[0].q); after(); });
      if(s==='zadanie'&&D.kind==='quiz'){ const qi=NQ[id+'_q']||0, Q=D.quiz[qi]; if(Q) Q.a.forEach((t,k)=>add(t,()=>{ if(k===Q.ok){ NQ[id+'_q']=qi+1; if(qi+1>=D.quiz.length){ finish(); return; } reply(pick(['Dobrze!','Zgadza się!','Brawo!'])+' '+D.quiz[qi+1].q); } else reply(pick(['Nie, nie… Pomyśl jeszcze raz.','Oj, pudło. Spróbuj jeszcze raz.','Nie tym razem. No, jeszcze raz!'])+' '+Q.q); after(); })); }
      if(s==='zadanie'&&D.kind==='mini') add(D.playBtn,()=>{ closeNPC(); openMini(D.mini,Object.assign({},D.mo||{},{sub:D.name,onEnd:w=>{ if(w){ giveIt(D.item); toast(D.win,3.5); } else toast(D.lose,3.5); }})); });
      if(s==='ma') add(D.doneBtn,()=>{ finish(); });
      (D.talk||[]).forEach(q=>add(q,()=>npcAI(n,q,true))); }
    if(id==='stasia'){
      if(s==='start'){ add('Dzień dobry! O czym panie tak rozmawiają?',()=>npcAI(n,'Dzień dobry! O czym panie tak rozmawiają?',true)); add('Może pomogę z zakupami?',()=>{ reply('Ojej, naprawdę? Siatka ciężka jak nie wiem co, a ja jeszcze do apteki muszę. Niech pan ją zaniesie pod mój dom, zaraz za Lewiatanem, i zostawi przy furtce. Pani Grażynka świadkiem!'); NQ.stasia='zadanie'; giveIt('siatka'); sys('Nowe zadanie: zanieś siatkę Pani Stasi pod jej dom za Lewiatanem i zostaw przy furtce.'); after(); }); }
      add('Jakie ceny w tym tygodniu?',()=>npcAI(n,'Jakie ceny w tym tygodniu?',true)); }
    if(id==='grazyna'){ add('Co dziś w promocji?',()=>npcAI(n,'Co dziś w promocji?',true)); add('Długo pani tu pracuje?',()=>npcAI(n,'Długo pani tu pracuje?',true)); add('Pani Stasia zawsze tyle opowiada?',()=>npcAI(n,'Pani Stasia zawsze tyle opowiada?',true)); }
    if(id==='jadzia'){
      if(s==='start') add('W czym mogę pomóc, pani Jadziu?',()=>{ reply('Ojej, panie dziejku… Strażacy pod remizą gadają, kto z kim wracał wczoraj z dyskoteki. Niech pan podsłucha i mi powie, tylko prawdę, bo ja wszystko i tak sprawdzę!'); NQ.jadzia='zadanie'; sys('Nowe zadanie: podsłuchaj strażaków pod remizą OSP i wróć do Pani Jadzi.'); after(); });
      if(s==='obrazona') add('Przepraszam, pójdę jeszcze raz pod remizę.',()=>{ reply('No dobrze, ale tym razem prawdę, kto to widział…'); NQ.jadzia='zadanie'; after(); });
      if(s==='ma'){ const opts=[NQ.gi]; while(opts.length<3){ const k=Math.floor(rnd()*NPC_GOSSIP.length); if(!opts.includes(k)) opts.push(k); } opts.sort(()=>rnd()-.5);
        opts.forEach(k=>add(NPC_GOSSIP[k]+'.',()=>{ takeIt('plotka'); if(k===NQ.gi){ NQ.jadzia='koniec'; reply('Ojej, to ci dopiero sensacja! Złote serce z pana, niech pan tu ma coś za fatygę.'); addMoney(120); addXP(40); sys('Zadanie wykonane: +120 zł, +40 XP'); }
          else { NQ.jadzia='obrazona'; reply('Kłamstwo! Ja wiem, że to nieprawda, kto to widział! Obrażam się. Niech pan idzie jeszcze raz pod remizę.'); sys('Pani Jadzia się obraziła - zadanie zaczyna się od nowa.'); } after(); })); } } }
  async function npcAI(n,msg,fromBtn){ const id=n.id; if(!fromBtn){ npcSay('u',msg); } npcPush(id,'u',msg); const wait=npcSay('n typing','…'); let t='', ok=false;
    try{ const ctl=new AbortController(); const tm=setTimeout(()=>ctl.abort(),12000); const r=await fetch(STAT_URL+'/npc',{method:'POST',signal:ctl.signal,body:JSON.stringify({npc:id,stage:npcStage(id),items:NQ.items,gi:NQ.gi,msg,hist:npcHist(id).slice(-9,-1)})}); clearTimeout(tm); const j=await r.json(); t=j.t||''; ok=!!j.ok; }catch(e){}
    if(!t){ const CN=NPC_DEF[id]?NPC_DEF[id].canned:NPC_CANNED[id]; t=CN[npcStage(id)]||CN.start; } wait.classList.remove('typing'); wait.textContent=t; npcPush(id,'n',t); npcLog.scrollTop=npcLog.scrollHeight; }
  function openNPC(n){ NPC_OPEN=n; keys.clear(); try{ document.exitPointerLock&&document.exitPointerLock(); }catch(e){} $('npcName').textContent=n.name; $('npcTitle').textContent=n.title; npcLog.innerHTML=''; $('npcBox').hidden=false;
    npcHist(n.id).slice(-6).forEach(h=>npcSay(h.r==='u'?'u':'n',h.t)); const s=npcStage(n.id); const D0=NPC_DEF[n.id], CN=D0?D0.canned:NPC_CANNED[n.id]; const open=D0&&D0.kind==='quiz'&&s==='zadanie'?((D0.quiz[NQ[n.id+'_q']||0]||{}).q||CN.start):(CN[s]||CN.start); npcSay('n',open); npcPush(n.id,'n',open); npcChoices(n); if(!IS_TOUCH) setTimeout(()=>npcTxt.focus(),50); }
  function closeNPC(){ if(!NPC_OPEN)return; NPC_OPEN=null; $('npcBox').hidden=true; npcTxt.blur(); keys.clear(); canvas.focus(); }
  $('npcX').addEventListener('click',closeNPC);
  $('npcIn').addEventListener('submit',e=>{ e.preventDefault(); const t=cleanTxt(npcTxt.value,160); npcTxt.value=''; if(!t||!NPC_OPEN)return; npcAI(NPC_OPEN,t,false); });
  addEventListener('keydown',e=>{ if(NPC_OPEN&&e.code==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); closeNPC(); } },true);
  function mietekMove(){ return; const n=NPC.find(q=>q.id==='mietek'); if(!n)return; n.sol.off=true; const f=B_LEW.front; const nx=n.x+f.nx*2.2, nz=n.z+f.nz*2.2; n.x=nx; n.z=nz; n.p.position.set(nx,H(nx,nz)+.1,nz); n.tag.position.set(nx,H(nx,nz)+2.35,nz); }
  if(NQ.mietek==='koniec') mietekMove();
  // ---------- punkt informacyjny przy starcie: cel gry, pierwsza misja, jak zarabiać ----------
  const INFO=(()=>{ const fx=-Math.sin(SPAWN.yaw), fz=-Math.cos(SPAWN.yaw); const a=[SPAWN.x+fx*2.5+fz*4.5,SPAWN.z+fz*2.5-fx*4.5]; const p=[-78,57]; const g=new THREE.Group(); g.position.set(p[0],H(p[0],p[1]),p[1]); g.rotation.y=Math.atan2(SPAWN.x-p[0],SPAWN.z-p[1]); scene.add(g);
    const blue=new THREE.MeshLambertMaterial({color:0x1d5fae}), wood=new THREE.MeshLambertMaterial({color:0x5b3e28}), roof=new THREE.MeshLambertMaterial({color:0x2a2c30});
    [-.9,.9].forEach(o=>bx(g,.12,2.6,.12,o,0,0,wood)); bx(g,2.1,1.3,.1,0,1.0,0,wood); bx(g,2.4,.08,.7,0,2.6,0,roof);
    pl(g,1.9,1.1,0,1.65,.06,new THREE.MeshLambertMaterial({map:tex(256,148,(x,w,h)=>{ x.fillStyle='#f4f1e6'; x.fillRect(0,0,w,h); x.fillStyle='#1d5fae'; x.fillRect(0,0,w,30); x.fillStyle='#fff'; x.font='700 20px Barlow, Arial'; x.fillText('INFORMACJA · TRĘBACZEW',10,22); x.fillStyle='#2a2c30'; x.font='15px Barlow, Arial'; ['Misje, mapa wsi, porady','Podejdź i naciśnij E'].forEach((t,i)=>x.fillText(t,12,58+i*24)); x.fillStyle='#6fa046'; x.fillRect(150,40,90,96); x.fillStyle='#d8d4c8'; x.fillRect(150,84,90,6); x.fillRect(190,40,6,96); x.fillStyle='#c0272c'; x.beginPath(); x.arc(176,70,5,0,7); x.fill(); }),emissive:0x202020}));
    const sg=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.06,24).rotateX(Math.PI/2),blue); sg.position.set(0,3.15,0); g.add(sg); const ic=pl(g,.5,.5,0,3.15,.035,new THREE.MeshBasicMaterial({map:signTex('i','#1d5fae','#ffffff',64,64,'900 52px Georgia, serif'),transparent:true})); const ic2=ic.clone(); ic2.position.z=-.035; ic2.rotation.y=Math.PI; g.add(ic2); bx(g,.08,.6,.08,0,2.6,0,wood);
    addSolid({x:p[0],z:p[1],hw:1.1,hd:.25,c:Math.cos(-g.rotation.y),s:Math.sin(-g.rotation.y),r:1.3});
    const n=[Math.sin(g.rotation.y),Math.cos(g.rotation.y)]; return {p,front:[p[0]+n[0]*1.4,p[1]+n[1]*1.4],g}; })();
  { const css=document.createElement('style'); css.textContent=`#infoBox{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(620px,calc(100vw - 24px));max-height:calc(100vh - 40px);overflow:auto;background:rgba(12,14,16,.96);border:1px solid var(--line);border-top:4px solid #1d5fae;z-index:36;font-family:var(--font-ui);color:var(--ink);padding:16px 20px 18px;box-shadow:0 10px 40px rgba(0,0,0,.5)}#infoBox[hidden]{display:none}#infoBox h2{margin:0 0 4px;font-family:var(--font-display);font-weight:400;font-size:30px}#infoBox h3{margin:14px 0 4px;color:var(--accent);font-family:var(--font-sign);font-size:18px;font-weight:600}#infoBox p,#infoBox li{font-size:15px;line-height:1.45}#infoBox ul{margin:4px 0;padding-left:20px}#infoBox .row{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}`; document.head.appendChild(css);
    const b=document.createElement('div'); b.id='infoBox'; b.hidden=true; b.setAttribute('role','dialog'); b.setAttribute('aria-label','Punkt informacyjny'); document.body.appendChild(b); }
  let INFO_OPEN=false;
  function nearInfo(){ return INFO&&!st.inside&&!st.car&&Math.hypot(st.x-INFO.p[0],st.z-INFO.p[1])<3.2; }
  function openInfo(){ const B=$('infoBox'); INFO_OPEN=true; keys.clear(); const next=CAMPAIGN.find(m=>!DONE.has(m.id)); const av=next&&avail(next), first=next&&next.id==='m1';
    const nDone=NPC.filter(n=>npcStage(n.id)==='koniec').length;
    B.innerHTML=`<h2>Punkt informacyjny</h2><p>Witaj w Trębaczewie! <b>Cel gry:</b> uzbierać <b>450 000 zł</b> i kupić własny dom. Masz teraz <b>${fmt(st.money)}</b> (poziom ${st.level}).</p>
      <h3>${first?'Pierwsza misja':'Następna misja fabularna'}</h3>${next?`<p><b>${CAMPAIGN.indexOf(next)+1}. ${next.n}</b> - ${next.desc}<br>Nagroda: ${fmt(next.reward)} · ${next.xp} XP${av?'':` · wymaga poziomu ${next.lvl}`}</p>`:'<p>Wszystkie misje fabularne ukończone.</p>'}
      <h3>Jak zarabiać</h3><ul><li><b>Misje fabularne</b> (żółte znaczniki) - największe nagrody, kolejne odblokowują się z poziomem.</li><li><b>Misje poboczne</b> (niebieskie) - płacą więcej na wyższym poziomie, ale ta sama misja powtarzana raz za razem płaci coraz mniej. Zmieniaj zlecenia! Teraz z premią ×1,5: <b>${sideBonus().map(id=>SIDE.find(m=>m.id===id).n).join(', ')}</b> (zmiana co 20 minut).</li><li><b>Postacie z „!” nad głową</b> - zadania i rozmowy (zrobione: ${nDone}/${NPC.length}).</li><li><b>Banknoty na chodnikach</b> - drobne kwoty, co jakiś czas pojawiają się nowe.</li></ul>
      <h3>Zlecenia dnia</h3><p>${(()=>{ const D=dailyGet(); return D.ids.map(id=>{ const m=SIDE.find(q=>q.id===id); return (D.done.includes(id)?'✓ ':'○ ')+(m?m.n:id); }).join(' · ')+` - za komplet premia ${fmt(dailyPrize())}`; })()}</p>
      <h3>Na co wydać pieniądze</h3><ul><li><b>Auto-Komis przy DK42</b> - własne auto (od 3 000 zł), rower, tuning i ubrania. Auto czeka na twoim parkingu obok tego punktu.</li><li><b>Dom za 450 000 zł</b> - a potem meble z katalogu.</li></ul>
      <h3>Uważaj na wydatki</h3><ul><li>Mandat po złapaniu przez policję: 10% pieniędzy (do 5 000 zł).</li><li>Rachunek ze szpitala po utracie zdrowia: 5% (do 2 000 zł).</li><li>Paliwo kupisz na ORLENIE w Działoszynie.</li></ul>
      <div class="row">${first&&av&&!ACTIVE?'<button class="btn pri" id="infoGo">Rozpocznij pierwszą misję</button>':''}${next&&!first?'<button class="btn" id="infoWay">Pokaż następną misję na mapie</button>':''}<button class="btn" id="infoX">Zamknij · Esc</button></div>`;
    B.hidden=false; try{ document.exitPointerLock&&document.exitPointerLock(); }catch(e){}
    const go=$('infoGo'); if(go) go.addEventListener('click',()=>{ closeInfo(); startMission(next); });
    const wy=$('infoWay'); if(wy) wy.addEventListener('click',()=>{ try{ WAYPOINT=next.start(); }catch(e){} closeInfo(); toast('Cel zaznaczony na radarze (fioletowy)',2.5); });
    $('infoX').addEventListener('click',closeInfo); }
  function closeInfo(){ INFO_OPEN=false; $('infoBox').hidden=true; keys.clear(); canvas.focus(); }
  addEventListener('keydown',e=>{ if(INFO_OPEN&&e.code==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); closeInfo(); } },true);
  function extInteract(){ if(SHOP_OPEN){ closeShop(); return; } if(INFO_OPEN){ closeInfo(); return; } if(nearInfo()){ openInfo(); return; } if(nearKomis()){ openShop(KOMIS.shop); return; } if(st.car&&nearPump()){ openFuel(); return; } const sd=nearStoreDoor(); if(sd==='out'){ exitRoom(); return; } if(!st.inside){ const gt=nearGate(); if(gt){ toggleGate(gt); return; } } if(npcInteract()) return; if(sd==='in'&&IS_TOUCH){ DOOR_ENT.enter(); return; } const m=nearMission(); if(m){ startMission(m); return; } if(ACTIVE&&ACTIVE.mRetry&&ACTIVE.mIn){ ACTIVE.mRetry=false; ACTIVE.mLock=false; return; } const mg=nearMini(); if(mg){ openMini(mg.id,mg.opt); return; } if(sd==='in'){ DOOR_ENT.enter(); return; } if(!st.car){ const s=nearShop(); if(s){ openShop(s); return; } } }
  function extHint(){ if(SHOP_OPEN||INFO_OPEN)return ''; if(nearInfo()) return `${IS_TOUCH?'<kbd>Akcja</kbd>':`<kbd>${keyName(KEYMAP.e)}</kbd>`} punkt informacyjny - misje i porady`; if(nearKomis()) return `${IS_TOUCH?'<kbd>Akcja</kbd>':`<kbd>${keyName(KEYMAP.e)}</kbd>`} Auto-Komis: auta, rower, tuning, ubrania`; const E=IS_TOUCH?'<kbd>Akcja</kbd>':`<kbd>${keyName(KEYMAP.e)}</kbd>`; if(st.car&&nearPump()) return `${E} zatankuj (${FUEL_NAME[st.car.ftype]} ${FUEL[st.car.ftype].toFixed(2).replace('.',',')} zł/l)`; const sd=nearStoreDoor(); if(sd==='out') return `${E} wyjdź na zewnątrz`; if(!st.inside){ const gt=nearGate(); if(gt) return `${E} ${gt.open?'zamknij':'otwórz'} ${gt.kind==='brama'?'bramę':'furtkę'}`; } { const nh=npcHint(E); if(nh) return nh; }
    const m=nearMission(); if(m) return `<b>${m.n}</b> · ${E} rozpocznij misję${m.reward?` (nagroda ${fmt(m.main?m.reward:sideReward(m))})`:''}`; if(ACTIVE&&ACTIVE.mRetry&&ACTIVE.mIn) return `${E} spróbuj ponownie`; { const mg=nearMini(); if(mg) return `🎮 ${E} ${mg.label.toLowerCase()}`; } if(sd==='in') return `${E} wejdź do ${DOOR_ENT.label}`; if(!st.car){ const s=nearShop(); if(s) return `${E} ${st.inside?(s.sub?'wypożycz książkę':'kasa - zrób zakupy'):'zrób zakupy: '+s.n}`; } return ''; }

  /* ---------- zapis postępu ---------- */
  let saveT=10;

  /* ---------- przyciski ---------- */
  function updButtons(){ $('bWeather').textContent='Pogoda: '+WEATHERS[ENV.weather]; $('bSeason').textContent='Pora roku: '+SEASONS[ENV.season]; $('bSound').textContent=AU.on?'Dźwięk: wł.':'Dźwięk: wył.'; $('bQual').textContent='Grafika: '+['niskie','średnie','maksymalne'][ENV.quality|0]; }
  $('bWeather').addEventListener('click',()=>{ ENV.weather=(ENV.weather+1)%4; ENV.wTimer=400; updButtons(); });
  $('bSeason').addEventListener('click',()=>{ ENV.season=(ENV.season+1)%4; applySeason(); saveGame(); });
  $('bSound').addEventListener('click',audioStart);
  $('bQual').addEventListener('click',()=>setQuality((ENV.quality+1)%3));
  $('bAct').addEventListener('click',()=>{ if(IS_TOUCH&&(lastAct==='Wsiądź'||lastAct==='Wysiądź')) enterExit(); else extInteract(); setTimeout(()=>{ if(IS_TOUCH) actLabel(); },50); }); $('bRadio').addEventListener('click',()=>{ if(!AU.ctx)audioStart(); extRadio(); });
  applySeason(); updButtons();

  window.__treb={get GATES(){return GATES;},get MP(){return MP;},get AU(){return AU;},get CB(){return CB;},get TIR(){return TIR_LOT;},startMission:m=>startMission(MISSIONS.find(q=>q.id===m)),get CAMPAIGN(){return CAMPAIGN;},get IN(){return IN;},enterStore:()=>enterStore(),exitStore:()=>exitStore(),showMenu:v=>showMenu(v),get GAME(){return GAME;},addXP:v=>addXP(v),get ORLEN(){return ORLEN;},st,setWanted,openShop:i=>openShop(SHOPS[i]),buy,ENV,COPS,parked,enterExit,get MISSIONS(){return MISSIONS;},get active(){return ACTIVE;},get player(){return player;},LEW:B_LEW,get CUR(){return CUR;},get ROOMS(){return ROOMS;},get ENTS(){return ENTS;},get CRS(){return CRS;},get FUEL(){return FUEL;},openFuel:()=>openFuel(),dbgRoads(){ const out=[]; const seg=(r,x,z)=>roadDist(r,x,z); houses.forEach(h=>{ if(!h.w)return; ROADS.forEach(r=>{ if(r.t==='track'||r.t==='path'||r.t==='foot')return; const d=roadDist(r,h.x,h.z); const R=Math.min(h.w,h.d)/2; if(d<r.w/2+R-0.5) out.push([r.n||r.t,Math.round(h.x),Math.round(h.z),h.kind,+d.toFixed(1),+(r.w/2+R).toFixed(1)]); }); }); return out.slice(0,80); },
  solidsNear(x,z,R){ const o=[]; for(let gx=Math.floor((x-R)/24);gx<=Math.floor((x+R)/24);gx++)for(let gz=Math.floor((z-R)/24);gz<=Math.floor((z+R)/24);gz++){ (grid.get(gx+','+gz)||[]).forEach(q=>{ if(!o.includes(q)) o.push(q); }); } return o.filter(q=>Math.hypot(q.x-x,q.z-z)<R).map(q=>[Math.round(q.x),Math.round(q.z),q.hw&&+q.hw.toFixed(1),q.hd&&+q.hd.toFixed(1),!!q.poly]); },get CHUNKS(){return CHUNKS;}};
  /* ---------- aktualizacja co klatkę ---------- */
  function extUpdate(dt){
    envUpdate(dt); audioUpdate(dt); missionUpdate(dt); achTick(dt);
    if(toastT>0){ toastT-=dt; if(toastT<=0) toastEl.classList.remove('on'); }
    if(st.boost>0){ st.boost-=dt; if(!st.car&&(keys.has('shift')||st.run)&&(st.vx||st.vz)){ st.x+=st.vx*dt*.3; st.z+=st.vz*dt*.3; } }
    if(SHOP_OPEN){ keys.clear(); const p=SHOP_OPEN.p; if(Math.hypot(p[0]-st.x,p[1]-st.z)>6) closeShop(); }
    // rower i motocykl: postać widoczna na siodełku
    if(st.car&&(st.car.kind==='bike'||st.car.kind==='moto')){ player.visible=st.mode!==1; riderPose(st.car,dt); } else if(player.rotation.x){ player.rotation.x=0; }
    // dzwony kościelne i znicze
    const hr=Math.floor(ENV.time); if((hr===12||hr===18)&&lastBell!==hr&&AU.ctx&&AU.on){ lastBell=hr; const cc=centroid(CHURCH.pts); if(Math.hypot(cc[0]-st.x,cc[1]-st.z)<500) sfx.bell(hr===12?6:3); } if(hr!==12&&hr!==18) lastBell=-1;
    // ciągniki na polach
    TRACTORS.forEach(t=>{ t.d+=t.dir*t.v*dt; if(t.d>t.r.L-2||t.d<2) t.dir*=-1; const s=sampleLine(t.r.pts,t.r.len,t.d); seatCar(t.g,s.x,s.z,Math.atan2(s.tz*t.dir,s.tx*t.dir)); t.g.userData.wheels.forEach(w=>w.rotation.z-=t.v*dt*t.dir); t.x=s.x; t.z=s.z;
      if(!st.car&&Math.hypot(s.x-st.x,s.z-st.z)<2){ const dx=st.x-s.x,dz=st.z-s.z,l=Math.hypot(dx,dz)||1; st.vx=dx/l*6; st.vz=dz/l*6; } });
    // autobus PKS
    { const b=busAt(Date.now()/1000); BUS.d=b.d; BUS.v=b.v; BUS.wait=b.wait; BUS.hid=b.hid; BUS.g.visible=BUS.day!==false&&!b.hid; }
    busTick(dt);
    { const s=sampleLine(DK.pts,DK.len,BUS.d); BUS.x=s.x+s.tz*2.4; BUS.z=s.z-s.tx*2.4; BUS.h=Math.atan2(s.tz,s.tx); seatCar(BUS.g,BUS.x,BUS.z,BUS.h,.1); BUS.g.userData.wheels.forEach(w=>w.rotation.z-=BUS.v*dt/.5);
      if(BUS.g.visible&&BUS.v>1&&!BUSR.on&&!st.car&&!st.inside&&Math.hypot(BUS.x-st.x,BUS.z-st.z)<4){ { const dx=st.x-BUS.x,dz=st.z-BUS.z,l=Math.hypot(dx,dz)||1; st.vx=dx/l*8; st.vz=dz/l*8; st.hp=Math.max(0,st.hp-dt*40); } } }
    // pociąg towarowy (wolniejszy, w przeciwnej fazie)
    { const FL=freightLen[freightLen.length-1], S=TRAIN_SCHED.fr; S.span=FL+FR_OFF[FR_OFF.length-1]+20; S.P=Math.max(S.span/S.v+240,480); const h0=(((tAll+150)%S.P))*S.v;
      FREIGHT.forEach((w,i)=>{ const d=FL-(h0-FR_OFF[i]); if(d<0||d>FL){ w.visible=false; return; } w.visible=true; const s=sampleLine(freightPath,freightLen,d); w.position.set(s.x,HC(s.x,s.z)+.22,s.z); w.rotation.y=-Math.atan2(s.tz,s.tx); });
      trainHorn(FREIGHT[0],S); }
    // policja
    if(st.car&&!['bike'].includes(st.car.kind)){ cars.forEach(t=>{ if(Math.hypot(t.x-st.car.x,t.z-st.car.z)<3.8&&tAll-trafficHitT>4){ trafficHitT=tAll; if(rnd()<.5) setWanted(Math.max(st.wanted,1)); } }); }
    if(st.wanted>0&&PARK&&inPoly(st.car?st.car.x:st.x,st.car?st.car.z:st.z,PARK.pts)){ setWanted(0); toast('🌳 Zgubiłeś policję w parku - przestali Cię gonić',3.2); }
    const want=Math.min(3,st.wanted); if(COPS.length<want&&rnd()<dt*2) spawnCop();
    for(let i=COPS.length-1;i>=0;i--){ const c=COPS[i]; const tx=st.car?st.car.x:st.x, tz=st.car?st.car.z:st.z; const dx=tx-c.x,dz=tz-c.z, d=Math.hypot(dx,dz);
      if(st.wanted===0){ c.far+=dt; c.v*=1-dt; if(c.far>4||d>200){ scene.remove(c.g); COPS.splice(i,1); continue; } }
      else { const want=Math.atan2(dz,dx); let dh=want-c.h; dh=Math.atan2(Math.sin(dh),Math.cos(dh)); c.h+=clamp(dh,-1.6*dt,1.6*dt); const vmax=Math.min(26,15+st.wanted*3)*(d<10?.4:1); c.v+=(vmax-c.v)*dt*.8;
        const nx=c.x+Math.cos(c.h)*c.v*dt, nz=c.z+Math.sin(c.h)*c.v*dt; if(blocked(nx,nz,1.1,true)){ c.h+=1.4*dt*(c.turn||(c.turn=rnd()<.5?1:-1)); c.v*=.6; } else { c.x=nx; c.z=nz; c.turn=0; }
        if(d<80) st.wantedT=0;
        if(!st.car&&d<2.6&&!st.dead){ st.busted=true; st.dead=2.5; deadEl.textContent='ZATRZYMANY'; deadEl.hidden=false; OWN.clean=0; const fine=Math.min(st.money,Math.min(5000,Math.max(100,Math.round(st.money*.1/10)*10))); st.money-=fine; shownMoney=st.money; moneyEl.textContent=fmt(st.money); toast(`Mandat: ${fine} zł`,3); COPS.forEach(q=>scene.remove(q.g)); COPS.length=0; if(ACTIVE) endMission(false); return; } }
      seatCar(c.g,c.x,c.z,c.h,.05); const fl=Math.floor(tAll*6)%2; c.g.userData.bar[0].visible=!!fl; c.g.userData.bar[1].visible=!fl; c.g.userData.light.color.set(fl?0xff2020:0x2040ff); c.g.userData.light.intensity=st.wanted?1.5:0; }
    if(st.car){ COPS.forEach(c=>{ if(Math.hypot(c.x-st.car.x,c.z-st.car.z)<3.6&&tAll-copHitT>3){ copHitT=tAll; setWanted(st.wanted+1); } }); }
    if(!st.dead&&st.busted){ st.busted=false; deadEl.textContent='ZGINĄŁEŚ'; }
    saveT-=dt; if(saveT<0){ saveT=10; saveGame(); }
  }

  /* ---------- wóz strażacki OSP (do jazdy) ---------- */
  function makeFireTruck(){ const g=new THREE.Group(); const rd=new THREE.MeshPhongMaterial({color:0xc8161d,shininess:70}), wh=new THREE.MeshLambertMaterial({color:0xf2f2ee}), al=new THREE.MeshLambertMaterial({color:0xc9ccd0}), gl=glassMat;
    g.add(new THREE.Mesh(new THREE.BoxGeometry(5.2,2.3,2.4).translate(-.9,.6+1.15,0),rd)); g.add(new THREE.Mesh(new THREE.BoxGeometry(2.0,2.0,2.4).translate(2.6,.6+1.0,0),rd));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(.06,.9,2.1).translate(3.61,2.05,0),gl)); [-1.21,1.21].forEach(z=>g.add(new THREE.Mesh(new THREE.BoxGeometry(1.1,.8,.04).translate(2.75,2.05,z),gl)));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(7.25,.14,2.44).translate(-.0,1.25,0),wh)); for(let k=0;k<6;k++) g.add(new THREE.Mesh(new THREE.BoxGeometry(.78,1.7,.03).translate(-3.1+k*.88,1.85,1.22),al));
    const lad=new THREE.Group(); [-.3,.3].forEach(z=>lad.add(new THREE.Mesh(new THREE.BoxGeometry(5.4,.08,.08).translate(0,0,z),al))); for(let x=-2.6;x<=2.6;x+=.45) lad.add(new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.6).translate(x,0,0),al)); lad.position.set(-.9,3.0,0); g.add(lad);
    const bar=[new THREE.Mesh(new THREE.BoxGeometry(.3,.18,.5),new THREE.MeshBasicMaterial({color:0x2050ff})),new THREE.Mesh(new THREE.BoxGeometry(.3,.18,.5),new THREE.MeshBasicMaterial({color:0x2050ff}))]; bar[0].position.set(2.6,2.7,.55); bar[1].position.set(2.6,2.7,-.55); g.add(...bar);
    [-.75,.75].forEach(z=>{ const h=new THREE.Mesh(new THREE.BoxGeometry(.06,.2,.4),headM); h.position.set(3.62,.95,z); g.add(h); });
    const wheels=[]; [[2.4,1.05],[2.4,-1.05],[-1.6,1.05],[-1.6,-1.05],[-2.8,1.05],[-2.8,-1.05]].forEach(([x,z])=>{ const w=new THREE.Mesh(wheelGeo,wheelMat); w.scale.set(1.45,1.45,1.3); w.position.set(x,.52,z); g.add(w); wheels.push(w); });
    g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); g.userData.wheels=wheels; g.userData.bar=bar; return g; }
  let FIRE=null;
  if(OSP_YARD){ const {w,L,FZ,toRoad,f}=OSP_YARD; let q=w(-L/2+2.6,FZ+Math.min(toRoad-1,4.5)); { let z=FZ+Math.min(toRoad-1,4.5); for(let k=0;k<30&&z>FZ+3.8;k++){ const fr=w(-L/2+2.6,z+3.8); if(!roadNearF(fr[0],fr[1],.4)&&!roadNearF(q[0],q[1],1.2))break; z-=.3; q=w(-L/2+2.6,z); } } FIRE=addParked(makeFireTruck(),q[0],q[1],Math.atan2(f.nz,f.nx),'fire','Wóz strażacki OSP · Jelcz',24,7); }

  /* ---------- ciężarówki na placu przy Szkolnej + rogatki reagujące na pociągi ---------- */
  function makeSemi(cabCol,trailer){ const g=new THREE.Group(); const cab=new THREE.MeshPhongMaterial({color:cabCol,shininess:60}), dark=new THREE.MeshLambertMaterial({color:0x222426}), chrome=new THREE.MeshLambertMaterial({color:0xb8bcc0});
    bx(g,2.4,2.6,2.5,4.2,1.1,0,cab); bx(g,2.42,.9,2.3,4.2,2.6,0,glassMat); bx(g,2.2,.6,2.5,4.2,3.5,0,cab); bx(g,.1,1.0,2.0,5.42,1.4,0,dark); bx(g,.1,.25,2.4,5.45,.9,0,chrome); bx(g,7,.35,1.4,1.2,.75,0,dark);
    if(trailer==='tank'){ const t=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.25,9,18).rotateZ(Math.PI/2),new THREE.MeshPhongMaterial({color:0xe8e8e4,shininess:70})); t.position.set(-2.6,2.5,0); g.add(t); const c=new THREE.Mesh(new THREE.ConeGeometry(1.25,1.4,18).rotateZ(-Math.PI/2),t.material); c.position.set(2.5,2.5,0); g.add(c); }
    else if(trailer==='box'){ bx(g,10,3,2.5,-2.5,1.2,0,new THREE.MeshLambertMaterial({color:0xf2f2ee})); }
    const wl=[[4.4,1],[4.4,-1],[1.2,1],[1.2,-1]].concat(trailer?[[-5,1],[-5,-1],[-6.3,1],[-6.3,-1]]:[]); wl.forEach(([x,z])=>{ const w=new THREE.Mesh(wheelGeo,wheelMat); w.scale.set(1.45,1.45,1.3); w.position.set(x,.52,z*1.05); g.add(w); });
    g.traverse(o=>{ if(o.isMesh)o.castShadow=true; }); return g; }
  if(TIR_LOT){ const {x,z,tx,tz,nx,nz}=TIR_LOT; [[-8,2,0xf2f2f0,null],[0,0,0xf4f4f2,'tank'],[9,-1,0xe8e8e6,'box']].forEach(([u,v,c,t])=>{ const px=x+tx*u+nx*v, pz=z+tz*u+nz*v; const g=makeSemi(c,t); const h=Math.atan2(-nz,-nx); seatCar(g,px,pz,h); scene.add(g); addSolid({x:px,z:pz,hw:t?7.5:3,hd:1.4,c:Math.cos(h),s:Math.sin(h),r:8}); }); }
  function crossUpdate(){ if(!CROSS.length)return; const c0=CROSS[0]; const near=[...train,...FREIGHT].some(w=>w.visible&&Math.hypot(w.position.x-c0.x,w.position.z-c0.z)<260);
    CROSS.forEach(c=>{ const tgt=near?0:-1.45; c.arm.rotation.z+=(tgt-c.arm.rotation.z)*.04; const on=near&&Math.floor(tAll*2.5)%2; c.lamps[0].material.color.set(near&&on?0xff2a1a:0x330000); c.lamps[1].material.color.set(near&&!on?0xff2a1a:0x330000); });
    if(near&&!st.car&&false){} }

  /* ---------- gra wieloosobowa: wszyscy, którzy mają tę grę otwartą teraz ---------- */
  const MP={room:null,user:null,on:false,ride:null,remote:new Map(),sendT:0,last:'',chat:[],canChat:true};
  const mpEl=document.getElementById('mp'), mpCount=document.getElementById('mpCount'), mpList=document.getElementById('mpList'), chatLog=document.getElementById('chatLog'), chatIn=document.getElementById('chatIn'), nickIn=document.getElementById('nickIn');
  let myNick=''; try{ myNick=localStorage.getItem('trebaczew-nick')||''; }catch(e){}
  const MYFC=(()=>{ let h=2166136261; const s=(()=>{ try{ return localStorage.getItem('trebaczew-id')||''; }catch(e){ return ''; } })()||String(Math.random()); for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return (h.toString(36)+Math.imul(h,2654435761).toString(36)).replace(/[^a-z0-9]/g,'').padEnd(6,'x').slice(0,6); })();
  const MYCOL='#'+new THREE.Color().setHSL(Math.random(),.7,.5).getHexString();
  const cleanTxt=(t,n)=>String(t==null?'':t).replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/g,'').slice(0,n).trim();
  function tagTex(text,color,bubble){ const c=document.createElement('canvas'); c.width=512; c.height=bubble?160:96; const x=c.getContext('2d'); x.font=(bubble?'600 38px':'700 44px')+' "Barlow Condensed", Arial'; x.textAlign='center'; x.textBaseline='middle';
    if(bubble){ const lines=[]; let cur=''; text.split(' ').forEach(wd=>{ const t2=cur?cur+' '+wd:wd; if(x.measureText(t2).width>460&&cur){ lines.push(cur); cur=wd; } else cur=t2; }); lines.push(cur); const L2=lines.slice(0,3); const bw=Math.min(500,Math.max(...L2.map(l=>x.measureText(l).width))+36), bh=L2.length*42+20;
      x.fillStyle='rgba(255,255,255,.95)'; x.beginPath(); x.roundRect?x.roundRect(256-bw/2,(160-bh)/2,bw,bh,16):x.rect(256-bw/2,(160-bh)/2,bw,bh); x.fill(); x.fillStyle='#111'; L2.forEach((l,i)=>x.fillText(l,256,(160-bh)/2+31+i*42)); }
    else { const tw=Math.min(500,x.measureText(text).width+34); x.fillStyle='rgba(0,0,0,.6)'; x.fillRect(256-tw/2,14,tw,64); x.fillStyle=color; x.fillRect(256-tw/2,14,8,64); x.fillStyle='#fff'; x.fillText(text,256+4,47); }
    const t=new THREE.CanvasTexture(c); t.anisotropy=4; return t; }
  function sprite(tex,w,h){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true})); s.scale.set(w,h,1); s.renderOrder=10; return s; }
  function vehModel(kind,color){ if(kind==='moto')return makeMoto(); if(kind==='melex')return makeMelex(); if(kind==='tractor')return makeTractor(); if(kind==='bus')return makeBus(); if(kind==='bike'){ const b=bikeM(); b.userData.wheels=[]; return b; } if(kind==='fire')return makeFireTruck(); const g=makeCar(new THREE.Color(color||'#888888'),kind==='van'?'van':''); return g; }
  function releaseGhost(r){ const c=r.gc; if(!c) return; c.ghost=false; c.g.visible=true; c.x=r.x; c.z=r.z; c.h=r.h; seatCar(c.g,c.x,c.z,c.h); r.gc=null; }
  function ensureRemote(p){ let r=MP.remote.get(p.peer); if(!r){ const col=typeof p.presence.col==='string'&&/^#[0-9a-f]{6}$/i.test(p.presence.col)?p.presence.col:'#888888';
      const body=makePerson(new THREE.Color(col).getHex(),0x2c3e66,0x2a1d14,{female:false,style:'jacket',hairStyle:'short',skin:0xe6bb98,exact:true}); scene.add(body); const tag=sprite(tagTex('…',col),3.2,.6); scene.add(tag);
      r={peer:p.peer,by:p.by,col,fc:'',body,tag,veh:null,vk:null,x:+p.presence.x||0,z:+p.presence.z||0,h:+p.presence.h||0,tx:0,tz:0,th:0,walk:0,name:'',bubble:null,bubT:0,spd:0}; MP.remote.set(p.peer,r); }
    const pr=p.presence; r.vo=pr.vo?1:0; r.sp=pr.sp?1:0; r.fc=typeof pr.fc==='string'?pr.fc.replace(/[^a-z0-9]/g,'').slice(0,6):''; if(Number.isFinite(+pr.x)&&Number.isFinite(+pr.z)){ r.in=typeof pr.in==='string'?pr.in.replace(/[^0-9,.-]/g,'').slice(0,24):''; r.gy=+pr.g||0; if(r.in){ r.tx=+pr.x; r.tz=+pr.z; } else { r.tx=clamp(+pr.x,X0,X1); r.tz=clamp(+pr.z,Z0,Z1); } r.th=+pr.h||0; r.spd=+pr.s||0; }
    if(!r.seen){ r.x=r.tx; r.z=r.tz; r.h=r.th; r.seen=true; }
    { const rd=typeof pr.rd==='string'&&pr.rd?pr.rd.slice(0,12):''; const me=MP.room&&MP.room.me?MP.room.me():null; if(rd!==(r.rd||'')){ const nm=(r.name||'Gracz').replace(/[<>&]/g,''); if(me&&rd===me) toast(`🚗 ${nm} wsiada do Twojego auta`,2); else if(me&&r.rd===me) toast(`🚪 ${nm} wysiada z Twojego auta`,2); r.rd=rd; } }
    { const pk=typeof pr.pk==='string'?pr.pk.replace(/[^0-9,-]/g,'').slice(0,20):''; if(pk!==(r.pk||'')){ releaseGhost(r); r.pk=pk; if(pk){ const c=parked.find(q=>q.k0===pk&&q!==st.car); if(c){ c.ghost=true; c.g.visible=false; r.gc=c; } } } }
    const vk=['car','van','moto','tractor','bus','bike','fire','melex'].includes(pr.v)?pr.v:null; const vc=typeof pr.vc==='string'&&/^#[0-9a-f]{6}$/i.test(pr.vc)?pr.vc:'#888888';
    if(vk!==r.vk||vc!==r.vc){ if(r.veh){ scene.remove(r.veh); r.veh=null; } r.vk=vk; r.vc=vc; if(vk){ r.veh=vehModel(vk,vc); scene.add(r.veh); } }
    return r; }
  async function mpNames(){ const list=[...MP.remote.values()]; let prof={}; const ids=list.map(r=>r.by).filter(Boolean);
    if(MP.user&&ids.length){ try{ prof=await MP.user.profiles(ids); }catch(e){} }
    list.forEach(r=>{ const pr=(MP.room.peers().find(p=>p.peer===r.peer)||{}).presence||{}; const nm=cleanTxt(pr.nick,24)||(r.by&&prof[r.by]&&prof[r.by].name)||'Gracz'; if(nm!==r.name){ r.name=nm; r.tag.material.map.dispose(); r.tag.material.map=tagTex(nm,r.col); r.tag.material.needsUpdate=true; } });
    renderList(); }
  function renderList(){ if(!MP.on)return; const n=MP.remote.size+1; { const bp=document.getElementById('bPeople'); if(bp) bp.textContent=n>1?'👥'+n:'👥'; } mpCount.textContent=MP.room&&MP.room.connected&&!MP.room.connected()?'Łączenie z serwerem…':n===1?'Tylko Ty w Trębaczewie':`${n} graczy w Trębaczewie`; mpList.textContent='';
    const add=(name,col,me)=>{ const li=document.createElement('div'); li.className='mpi'; const d=document.createElement('i'); d.style.background=col; li.appendChild(d); const s=document.createElement('span'); s.textContent=name+(me?' (Ty)':''); li.appendChild(s); mpList.appendChild(li); };
    add(myNick||'Ty',MYCOL,true); [...MP.remote.values()].forEach(r=>add(r.name||'Gracz',r.col,false)); }
  function addChat(name,col,text){ const row=document.createElement('div'); row.className='cl'; const b=document.createElement('b'); b.textContent=name+': '; b.style.color=col; row.appendChild(b); row.appendChild(document.createTextNode(text)); chatLog.appendChild(row); while(chatLog.children.length>6) chatLog.removeChild(chatLog.firstChild); MP.chat.push({row,t:12}); }
  function bubble(r,text){ if(r.bubble){ scene.remove(r.bubble); r.bubble.material.map.dispose(); } r.bubble=sprite(tagTex(text,'#fff',true),4.2,1.3); scene.add(r.bubble); r.bubT=6; }
  const meR={body:player,bubble:null,bubT:0};
  function inKey(){ return st.inside&&CUR?Math.round(CUR.x)+','+Math.round(CUR.z):''; }
  function myPresence(){ const c=st.car; const kind=c?(c.kind||'car'):null; let vc=null; if(c&&(!c.kind||c.kind==='van')){ const m=c.g.children[0]&&c.g.children[0].material; if(m&&m.color) vc='#'+m.color.getHexString(); }
    return {x:+(c?c.x:st.x).toFixed(2),z:+(c?c.z:st.z).toFixed(2),h:+(c?c.h:st.face).toFixed(3),v:kind,vc,s:+(c?Math.abs(c.v):Math.hypot(st.vx||0,st.vz||0)).toFixed(1),col:MYCOL,nick:myNick||null,rd:MP.ride||(BUSR.on?'bus':null),fc:MYFC,pk:(st.car&&st.car.k0)||null,in:inKey()||null,g:+(((st.inside&&st.gy)||0)).toFixed(1),vo:(typeof VC!=='undefined'&&VC.on)?1:0,sp:(typeof VC!=='undefined'&&VC.talk)?1:0}; }
  const MP_URL='wss://trebaczew-mp.kontakt-3e3.workers.dev';
  // anonimowe statystyki (losowy identyfikator w przeglądarce - bez danych osobowych)
  const STAT_URL=MP_URL.replace(/^wss:/,'https:').replace(/^ws:/,'http:');
  let STAT_ID=''; try{ STAT_ID=localStorage.getItem('trebaczew-id')||''; if(!STAT_ID){ STAT_ID=((window.crypto&&crypto.randomUUID)?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36)).replace(/[^a-z0-9-]/gi,''); localStorage.setItem('trebaczew-id',STAT_ID); } }catch(e){ STAT_ID='s'+Math.random().toString(36).slice(2,14); }
  function statEvent(ev,d){ try{ if(!/^https?:$/.test(location.protocol))return; d=d||{}; if(ev==='mini'||ev==='start') d={...d,n:cleanTxt(myNick||(typeof CHAR!=='undefined'&&CHAR.name)||'',18)}; fetch(STAT_URL+'/hit',{method:'POST',body:JSON.stringify({id:STAT_ID,ev,d}),keepalive:true}).catch(()=>{}); }catch(e){} }
  setInterval(()=>{ if(GAME.started&&!GAME.paused&&document.visibilityState==='visible') statEvent('beat',{min:2}); },120000);
  // połączenie z serwerem gry (Cloudflare) - ten sam interfejs co pokój Claude
  function wsRoom(base,initial){ const peers=new Map(), subP=[], subE={}; let myId=null, ws=null, ok=false, ever=false, room=1, lastP=null, retry=0, ping=null, tries=0, warned=false, forced=initial||null; const rname=()=>forced||('t'+room);
    const fire=ch=>subP.forEach(f=>{ try{ f(ch); }catch(e){ console.warn(e); } }); const none={joined:[],left:[],updated:[]};
    function connect(){ try{ ws=new WebSocket(base+'/room/'+rname()); }catch(e){ return later(); }
      ws.onmessage=e=>{ if(e.data==='pong')return; let m; try{ m=JSON.parse(e.data); }catch(_){ return; }
        if(m.t==='full'&&forced){ toast(forced[0]==='p'?'Pokój prywatny jest pełny (max 8 osób)':'Ten pokój jest pełny',3); const bad=forced; forced=null; ws.onclose=null; try{ ws.close(); }catch(_){} setTimeout(()=>{ if(bad&&!forced) { tries=0; connect(); } },200); return; }
        if(m.t==='full'){ tries++; room=room%9+1; ws.onclose=null; try{ ws.close(); }catch(_){} if(tries<9) setTimeout(connect,150); else { toast('Wszystkie pokoje są pełne - spróbuj za chwilę',3); later(); } return; }
        if(m.t==='hello'){ myId=m.id; ok=true; ever=true; retry=0; tries=0; const left=[...peers.values()]; peers.clear(); if(left.length) fire({...none,left});
          const j=(m.peers||[]).map(p=>({peer:p.peer,presence:p.presence,kind:'viewer'})); j.forEach(p=>peers.set(p.peer,p)); if(lastP) ws.send(JSON.stringify({t:'p',d:lastP})); fire({...none,joined:j});
          clearInterval(ping); ping=setInterval(()=>{ if(ws.readyState===1) ws.send('ping'); },25000); toast(forced&&forced[0]==='p'?`🔒 Pokój prywatny ${forced.slice(1).toUpperCase()}`:`🌐 Połączono · pokój ${forced?forced.slice(1):room}`,2); fire({...none,room:rname()}); return; }
        if(m.t==='p'){ const had=peers.has(m.peer); const p={peer:m.peer,presence:m.d,kind:'viewer'}; peers.set(m.peer,p); fire(had?{...none,updated:[p]}:{...none,joined:[p]}); return; }
        if(m.t==='l'){ const p=peers.get(m.peer); if(p){ peers.delete(m.peer); fire({...none,left:[p]}); } return; }
        if(m.t==='e'){ (subE[m.topic]||[]).forEach(f=>{ try{ f({peer:m.peer,data:m.d,sameTab:!!m.me}); }catch(err){ console.warn(err); } }); return; }
        if(m.t==='err'&&m.code==='slow') toast('Za szybko piszesz - chwila przerwy',1.5); };
      ws.onclose=()=>{ const was=ok; ok=false; clearInterval(ping); fire(none); if(was) toast('Utracono połączenie - łączę ponownie…',2); later(); }; ws.onerror=()=>{}; }
    function later(){ retry=Math.min(retry+1,6); if(!ever&&retry>=3&&!warned){ warned=true; toast('Nie mogę połączyć się z serwerem gry.<br>Tryb wieloosobowy działa na <b>trebaczew.io</b>',5); } setTimeout(connect,1500*retry); }
    connect();
    return { me:()=>myId, name:rname, switchTo(n){ forced=n||null; if(!n){ room=1; } tries=0; retry=0; const left=[...peers.values()]; peers.clear(); if(left.length) fire({...none,left}); ok=false; if(ws){ ws.onclose=null; try{ ws.close(); }catch(_){} } clearInterval(ping); connect(); }, peers:()=>[...peers.values()], connected:()=>ok&&!!ws&&ws.readyState===1, onPeers(f){ subP.push(f); }, on(t,f){ (subE[t]=subE[t]||[]).push(f); },
      emit(t,d){ if(!ok||ws.readyState!==1) return Promise.reject({code:'offline'}); ws.send(JSON.stringify({t:'e',topic:t,d})); return Promise.resolve(); },
      presence(p){ lastP=p; if(ok&&ws.readyState===1) ws.send(JSON.stringify({t:'p',d:p})); return Promise.resolve(); } }; }
  async function mpInit(useWs){ try{ let room; if(useWs){ let ini=null; try{ const q=(new URLSearchParams(location.search).get('room')||'').toLowerCase(); if(/^p[a-z0-9]{5,8}$/.test(q)) ini=q; else if(/^[a-z0-9]{5,8}$/.test(q)) ini='p'+q; }catch(e){} room=wsRoom(MP_URL,ini); statEvent('mp'); } else { if(!window.claude||!window.claude.use)return; room=await window.claude.use('room'); if(!room)return; try{ MP.user=await window.claude.use('user'); }catch(e){} } MP.room=room;
      if(!myNick&&CHAR.name) myNick=cleanTxt(CHAR.name,24);
      if(!myNick&&MP.user){ try{ const me=await MP.user.me(); if(me&&me.name) myNick=cleanTxt(me.name.split(' ')[0],24); }catch(e){} }
      MP.on=true; ENV.fixed=true; mpEl.hidden=false; { const bm=document.getElementById('bMic'); if(bm){ bm.hidden=false; bm.onclick=()=>{ if(VC.on) vcDisable(); else vcEnable(); }; setTimeout(()=>{ if(MP.on&&!VC.on) toast('🎤 Kliknij przycisk mikrofonu u góry, by rozmawiać głosowo (mówisz przytrzymując V)',5); },2500); } } { const bp=document.getElementById('bPeople'); bp.hidden=false; bp.onclick=()=>document.body.classList.toggle('mpOpen');  if(IS_TOUCH) document.getElementById('bChat').textContent='Czat'; } nickIn.value=myNick; renderList();
      room.onPeers(ch=>{ ch.left.forEach(p=>{ const r=MP.remote.get(p.peer); if(!r)return; releaseGhost(r); [r.body,r.tag,r.veh,r.bubble].forEach(o=>o&&scene.remove(o)); MP.remote.delete(p.peer); if(r.name) toast(`👋 ${r.name.replace(/[<>&]/g,'')} wychodzi z gry`,2); });
        let names=false; [...ch.joined,...ch.updated].forEach(p=>{ if(p.sameTab||p.kind!=='viewer')return; if(!p.presence||p.presence.x===undefined)return; const isNew=!MP.remote.has(p.peer); ensureRemote(p); if(isNew){ names=true; } else { const r=MP.remote.get(p.peer); const nk=cleanTxt(p.presence.nick,24); if(nk&&nk!==r.name) names=true; } });
        if(names) mpNames(); else renderList(); },()=>{});
      room.on('chat',msg=>{ const d=msg.data||{}; const text=cleanTxt(d.t,140); if(!text)return; if(msg.sameTab){ addChat(myNick||'Ty',MYCOL,text); bubble(meR,text); return; } const r=MP.remote.get(msg.peer); addChat(r?r.name||'Gracz':'Gracz',r?r.col:'#ccc',text); if(r) bubble(r,text); if(AU.ctx&&AU.on&&sfx.cash) {} },()=>{});
      room.on('emote',msg=>{ const d=msg.data||{}; const e=EMO[d.e|0]; if(!e)return; if(msg.sameTab){ bubble(meR,e); return; } const r=MP.remote.get(msg.peer); if(r) bubble(r,e); },()=>{});
      room.on('duel',msg=>duelMsg(msg),()=>{});
      room.on('co',msg=>coMsg(msg),()=>{}); room.onPeers(ch=>{ if(ch.room){ CO.notified={}; setTimeout(coHere,600); } if(CO.open) renderSoc(); },()=>{}); setTimeout(()=>{ coHere(); coPoll(); },1500);
      room.on('klakson',msg=>{ if(msg.sameTab)return; const r=MP.remote.get(msg.peer); if(r&&AU.ctx&&AU.on&&Math.hypot(r.x-st.x,r.z-st.z)<120&&sfx.horn) sfx.horn(); },()=>{});
      room.presence(myPresence()).catch(()=>{});
    }catch(e){ console.warn('multiplayer',e); } }
  function sendChat(){ const t=cleanTxt(chatIn.value,140); chatIn.value=''; chatIn.blur(); chatBox(false); if(!t||!MP.room)return; if(!MP.room.connected()){ toast('Brak połączenia z innymi graczami',2); return; }
    MP.room.emit('chat',{t}).catch(e=>{ if(e&&e.code==='not_permitted'){ MP.canChat=false; toast('Czat jest dostępny dla osób z prawem współpracy (Contributor) w udostępnieniu',3); } }); }
  function chatBox(open){ document.getElementById('chatRow').hidden=!open; if(open){ releaseAll(); setTimeout(()=>chatIn.focus(),0); } }
  addEventListener('keydown',e=>{ if(!MP.on)return; const tag=e.target&&e.target.tagName; if(tag==='INPUT'){ e.stopPropagation(); if(e.key==='Enter'&&e.target===chatIn){ e.preventDefault(); sendChat(); } if(e.key==='Escape'){ e.target.blur(); chatBox(false); } return; }
    if(e.key==='Enter'&&!e.repeat&&!GAME.paused&&!MG.on&&!SHOP_OPEN){ e.preventDefault(); chatBox(true); }
    if(!e.repeat&&!GAME.paused&&!MG.on&&!SHOP_OPEN&&!st.dead){ const ei=['Digit1','Digit2','Digit3','Digit4'].indexOf(e.code); if(ei>=0&&e.altKey===false&&MP.room&&MP.room.me){ sendEmote(ei); } if(e.code==='KeyG') duelAsk(); if(e.code==='KeyY'&&MP.invite) duelAnswer(true); if(e.code==='KeyN'&&MP.invite) duelAnswer(false); } if(e.code==='KeyH'&&!e.repeat&&st.car&&MP.room){ MP.room.emit('klakson',{}).catch(()=>{}); if(AU.ctx&&AU.on&&sfx.horn) sfx.horn(); } },true);
  addEventListener('keyup',e=>{ if(e.target&&e.target.tagName==='INPUT') e.stopPropagation(); },true);
  document.getElementById('bChat').addEventListener('click',()=>chatBox(document.getElementById('chatRow').hidden));
  document.getElementById('chatSend').addEventListener('click',sendChat);
  nickIn.addEventListener('change',()=>{ const [v]=nickCheck(nickIn.value); if(!v){ nickIn.value=myNick; toast('Wpisz dowolną nazwę (1-16 znaków)',2); return; } nickSave(v); renderList(); MP.last=''; });
  /* ---------- multiplayer: emotki i wyzwanie na wyścig ---------- */
  const EMO=['👋','👍','😂','⚽'];
  function sendEmote(i){ if(!MP.room||!MP.room.connected()) return; if(tAll-(MP.lastEmo||-9)<1) return; MP.lastEmo=tAll; MP.room.emit('emote',{e:i}).catch(()=>{}); }
  const duelBox=document.createElement('div'); duelBox.id='duelBox'; duelBox.hidden=true; document.body.appendChild(duelBox);
  const duelMark=new THREE.Group(); { const m=new THREE.MeshBasicMaterial({color:0xff3a3a,transparent:true,opacity:.4,depthWrite:false}), w=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.45,depthWrite:false}); for(let i=0;i<8;i++){ const c=new THREE.Mesh(new THREE.CylinderGeometry(3,3,5,28,1,true),i%2?w:m); c.position.y=2.5+i*5; duelMark.add(c); } duelMark.visible=false; scene.add(duelMark); }
  function nearestPlayer(lim){ const x=st.car?st.car.x:st.x, z=st.car?st.car.z:st.z; let b=null,bd=lim; MP.remote.forEach(r=>{ const d=Math.hypot(r.x-x,r.z-z); if(d<bd){ bd=d; b=r; } }); return b; }
  function duelTargets(){ return POIS.filter(p=>p.p&&isFinite(p.p[0])&&isFinite(p.p[1])&&!p.npcTag&&!/^(Paczkomat|Przystanek|Park |Plac zabaw|Cmentarz)|pomnik/i.test(p.n)); } // tylko budynki i obiekty (szkoła, stadion, schronisko...), bez postaci, przystanków i paczkomatów
  function duelAsk(){ if(!MP.room||!MP.room.me||!MP.room.connected()) return toast('Wyzwania działają w trybie wieloosobowym',2); if(MP.duel&&MP.duel.state==='race') return toast('Już się ścigasz!',2);
    const r=nearestPlayer(30); if(!r) return toast('Podejdź bliżej do innego gracza (do 30 m), żeby go wyzwać',2.5);
    MP.duel={state:'asked',with:r.peer,name:r.name||'Gracz',t:tAll}; MP.room.emit('duel',{to:r.peer,a:'ask'}).catch(()=>{}); toast(`🏁 Wyzwałeś <b>${esc(r.name||'Gracza')}</b> na wyścig. Czekam na odpowiedź…`,3); renderDuel(); }
  function duelAnswer(yes){ const iv=MP.invite; if(!iv)return; MP.invite=null; if(!yes){ MP.room.emit('duel',{to:iv.from,a:'no'}).catch(()=>{}); renderDuel(); return; } const T=duelTargets(); const x=st.car?st.car.x:st.x, z=st.car?st.car.z:st.z; const far=T.map((p,i)=>[p,i]).filter(([p])=>Math.hypot(p.p[0]-x,p.p[1]-z)>250&&Math.hypot(p.p[0]-x,p.p[1]-z)<1600); const pickL=far.length?far:T.map((p,i)=>[p,i]); const idx=pickL[Math.floor(Math.random()*pickL.length)][1]; MP.room.emit('duel',{to:iv.from,a:'yes',s:idx}).catch(()=>{}); duelStart(iv.from,iv.name,idx); }
  function duelStart(peer,name,idx){ const T=duelTargets(); const tg=T[Math.min(T.length-1,Math.max(0,idx|0))];
    MP.duel={state:'count',with:peer,name,t:tAll,go:tAll+3,target:tg}; duelMark.position.set(tg.p[0],H(tg.p[0],tg.p[1]),tg.p[1]); duelMark.visible=true; WAYPOINT=[tg.p[0],tg.p[1]]; toast(`🏁 Wyścig z <b>${esc(name)}</b> do: <b>${esc(tg.n)}</b><br>Start za 3…`,3); renderDuel(); if(AU.ctx&&AU.on) sfx.cash(); }
  function duelBanner(won,txt){ let b=document.getElementById('mpResult'); if(!b){ b=document.createElement('div'); b.id='mpResult'; b.style.cssText='position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:60;padding:18px 34px;border-radius:14px;text-align:center;font:400 40px/1.1 "Bebas Neue",Impact,sans-serif;letter-spacing:.05em;color:#fff;pointer-events:none;box-shadow:0 8px 30px rgba(0,0,0,.45);transition:opacity .4s'; document.body.appendChild(b); } b.style.background=won?'#1f8f4a':'#b3321f'; b.innerHTML=(won?'ZWYCIĘSTWO':'PRZEGRANA')+'<div style="font:400 18px/1.3 Arial,sans-serif;margin-top:6px;letter-spacing:0">'+txt+'</div>'; b.style.opacity=1; clearTimeout(b._t); b._t=setTimeout(()=>{ b.style.opacity=0; },5000); }
  function duelEnd(txt,won){ duelMark.visible=false; WAYPOINT=null; MP.duel=null; toast(txt,4.5); duelBanner(won,txt); if(won){ addMoney(200); addXP(15); if(AU.ctx&&AU.on) sfx.win(); } renderDuel(); }
  function duelMsg(msg){ const d=msg.data||{}; if(!MP.room||!MP.room.me||d.to!==MP.room.me()) return; const r=MP.remote.get(msg.peer); const name=r?r.name||'Gracz':'Gracz';
    if(d.a==='ask'){ if(MP.duel&&MP.duel.state==='race'){ MP.room.emit('duel',{to:msg.peer,a:'no'}).catch(()=>{}); return; } MP.invite={from:msg.peer,name,t:tAll}; if(AU.ctx&&AU.on) sfx.horn(); renderDuel(); }
    else if(d.a==='yes'&&MP.duel&&MP.duel.with===msg.peer&&MP.duel.state==='asked') duelStart(msg.peer,name,(d.s|0)>>>0);
    else if(d.a==='no'&&MP.duel&&MP.duel.with===msg.peer){ MP.duel=null; toast(`${esc(name)} odrzucił wyzwanie`,2.5); renderDuel(); }
    else if(d.a==='win'&&MP.duel&&MP.duel.with===msg.peer&&MP.duel.state!=='asked') duelEnd(`🏁 <b>${esc(name)}</b> był szybszy. Rewanż? (G)`,false);
    else if(d.a==='quit'&&MP.duel&&MP.duel.with===msg.peer) duelEnd(`${esc(name)} zrezygnował - wygrywasz walkowerem!`,true); }
  function duelUpdate(){ const D=MP.duel; if(MP.invite&&tAll-MP.invite.t>20){ MP.invite=null; renderDuel(); } if(!D)return;
    if(D.state==='asked'&&tAll-D.t>22){ MP.duel=null; toast('Brak odpowiedzi na wyzwanie',2); renderDuel(); return; }
    if(D.state==='count'){ const left=Math.ceil(D.go-tAll); if(left!==D.left){ D.left=left; if(left>0){ toast(`<b>${left}</b>`,.8); if(AU.ctx&&AU.on) tone('square',660,AU.ctx.currentTime,.12,.05); } } if(tAll>=D.go){ D.state='race'; D.t0=tAll; toast('<b>START!</b> Pierwszy na mecie wygrywa',2); if(AU.ctx&&AU.on) tone('square',990,AU.ctx.currentTime,.3,.06); renderDuel(); } return; }
    if(D.state==='race'){ const x=st.car?st.car.x:st.x, z=st.car?st.car.z:st.z; const tg=D.target.p; duelMark.children.forEach((c,i)=>c.rotation.y=tAll*(i%2?1:-1)*.5);
      if(Math.hypot(tg[0]-x,tg[1]-z)<10){ MP.room.emit('duel',{to:D.with,a:'win'}).catch(()=>{}); duelEnd(`🏆 <b>Wygrałeś wyścig</b> z ${esc(D.name)} w ${Math.round(tAll-D.t0)} s! +200 zł`,true); return; }
      if(tAll-D.t0>300){ MP.room.emit('duel',{to:D.with,a:'quit'}).catch(()=>{}); duelEnd('Wyścig przerwany - minęło 5 minut',false); return; }
      if(!MP.remote.has(D.with)) duelEnd(`${esc(D.name)} wyszedł z gry - wygrywasz walkowerem!`,true); } }
  function esc(t){ return String(t).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }
  function renderDuel(){ const iv=MP.invite, D=MP.duel; if(iv){ duelBox.hidden=false; duelBox.innerHTML=`<b>🏁 ${esc(iv.name)}</b> wyzywa cię na wyścig!<div class="row"><button class="btn hot" id="dY">Akceptuj${IS_TOUCH?'':' (Y)'}</button><button class="btn" id="dN">Odrzuć${IS_TOUCH?'':' (N)'}</button></div>`; duelBox.querySelector('#dY').onclick=()=>duelAnswer(true); duelBox.querySelector('#dN').onclick=()=>duelAnswer(false); }
    else if(D&&D.state==='race'){ duelBox.hidden=false; duelBox.innerHTML=`<b>🏁 Wyścig z ${esc(D.name)}</b><br>Meta: ${esc(D.target.n)} (fioletowy punkt)<div class="row"><button class="btn" id="dQ">Poddaj się</button></div>`; duelBox.querySelector('#dQ').onclick=()=>{ MP.room.emit('duel',{to:D.with,a:'quit'}).catch(()=>{}); duelEnd('Poddałeś wyścig',false); }; }
    else duelBox.hidden=true; }
  // przyciski w panelu graczy (telefon i mysz)
  { const row=document.createElement('div'); row.className='mpEmo'; row.innerHTML=EMO.map((e,i)=>`<button class="btn" data-e="${i}" title="Emotka ${i+1}">${e}</button>`).join('')+'<button class="btn" id="bDuel" title="Wyzwij najbliższego gracza na wyścig (G)">🏁 Wyzwij</button>';
    mpEl.appendChild(row); row.querySelectorAll('[data-e]').forEach(b=>b.addEventListener('click',()=>sendEmote(+b.dataset.e))); row.querySelector('#bDuel').addEventListener('click',duelAsk); }
  function mpBlips(dot){ MP.remote.forEach(r=>!r.in&&dot(r.x,r.z,r.col,5.5)); }
  // stadion: animacje zawodników (drybling, podania, bramkarz) i kibiców z szalikami
  const _M4=new THREE.Matrix4(), _Q=new THREE.Quaternion(), _V=new THREE.Vector3(), _S=new THREE.Vector3(1,1,1), _E=new THREE.Euler();
  function stadUpdate(dt){ if(!STAD.PL||st.inside)return; const m=STAD.m; const px=st.car?st.car.x:st.x, pz=st.car?st.car.z:st.z; if(Math.hypot(px-m.cx,pz-m.cz)>230)return;
    STAD.PL.forEach(o=>{ const p=o.p;
      if(o.role==='drib'){ let dx=o.tx-o.x, dz=o.tz-o.z; const d=Math.hypot(dx,dz); if(d<1.5){ o.tx=R(-m.w/2+6,m.w/2-6); o.tz=R(-m.d/2+4,m.d/2-4); return; } dx/=d; dz/=d; const sp=3.0+Math.sin(tAll*.7+o.x)*.6; o.x+=dx*sp*dt; o.z+=dz*sp*dt; o.h=Math.atan2(dx,dz); o.walk+=dt*sp*2.2;
        const touch=Math.abs(Math.sin(o.walk*.5)); o.ball.position.set(o.x+dx*(.45+touch*.55),.11,o.z+dz*(.45+touch*.55)); o.ball.rotation.x+=sp*dt/.11*dz; o.ball.rotation.z-=sp*dt/.11*dx; p.position.set(o.x,.06,o.z); p.rotation.y=o.h; animPerson(p,o.walk,1); }
      else if(o.role==='gk'){ o.z=Math.sin(tAll*.8)*2.2; p.position.set(o.x,.06,o.z); p.rotation.y=Math.PI/2; animPerson(p,tAll*3,.25+.2*Math.abs(Math.cos(tAll*.8))); }
      else if(o.role==='cone'){ o.x=-3+((tAll*1.4)%10); o.z=-m.d/2+4+Math.sin(tAll*3.3)*.8; p.position.set(o.x,.06,o.z); p.rotation.y=Math.PI/2+Math.cos(tAll*3.3)*.6; animPerson(p,tAll*7,1); } });
    const P=STAD.pass; if(P){ P.t+=dt; const A=P.dir?P.b:P.a, B=P.dir?P.a:P.b; const k=Math.min(1,P.t/1.3); const bx0=A.x+(B.x-A.x)*k, bz0=A.z+(B.z-A.z)*k; P.ball.position.set(bx0,.11+Math.sin(k*Math.PI)*.15,bz0); P.ball.rotation.x+=dt*14;
      [P.a,P.b].forEach(o=>{ const other=o===P.a?P.b:P.a; o.p.position.set(o.x,.06,o.z); o.p.rotation.y=Math.atan2(other.x-o.x,other.z-o.z); const kick=(o===A&&P.t<.25)?1:0; animPerson(o.p,kick?P.t*12:tAll*1.5,kick?1:.1); });
      if(P.t>1.6){ P.t=0; P.dir^=1; } }
    // szaliki w górze i w dół
    const sc=STAD.sc; sc.forEach((f,j)=>{ const up=.5+.5*Math.sin(tAll*2.6+f.ph); _V.set(f.x,f.y+1.38+up*.22,f.z+.05); _E.set(0,0,Math.sin(tAll*1.3+f.ph)*.08); _Q.setFromEuler(_E); _M4.compose(_V,_Q,_S); STAD.scarfIM.setMatrixAt(j,_M4);
      [-1,1].forEach((s,k)=>{ _V.set(f.x+s*.24,f.y+.72,f.z); _E.set(0,0,s*(.35-up*.15)); _Q.setFromEuler(_E); _M4.compose(_V,_Q,_S); STAD.armIM.setMatrixAt(j*2+k,_M4); }); });
    STAD.scarfIM.instanceMatrix.needsUpdate=true; STAD.armIM.instanceMatrix.needsUpdate=true; }
  function mpUpdate(dt){ stadUpdate(dt); if(MP.on) duelUpdate(); crossUpdate(); gatesUpdate(dt); churchDoorUpdate(dt); peopleIdle(dt); turbinesUpdate(dt); npcUpdate(dt); animalsUpdate(dt); parkGuysUpdate(dt); interiorUpdate(dt); roomsUpdate(dt); storeDoorAuto(); cullUpdate();
    if(FIRE&&FIRE.g.userData.bar){ const on=st.car===FIRE&&Math.abs(FIRE.v)>1, fl=Math.floor(tAll*7)%2; FIRE.g.userData.bar[0].visible=!on||!!fl; FIRE.g.userData.bar[1].visible=!on||!fl; }
    if(OSP_FLAG){ const p=OSP_FLAG.geometry.attributes.position; for(let i=0;i<p.count;i++){ const x=p.getX(i)+.75; p.setZ(i,Math.sin(tAll*4+x*3)*.12*x); } p.needsUpdate=true; }
    MP.chat=MP.chat.filter(c=>{ c.t-=dt; if(c.t<3) c.row.style.opacity=Math.max(0,c.t/3); if(c.t<=0){ c.row.remove(); return false; } return true; });
    if(meR.bubble){ meR.bubT-=dt; const px=st.car?st.car.x:st.x, pz=st.car?st.car.z:st.z; meR.bubble.position.set(px,H(px,pz)+(st.car?4:3.1),pz); if(meR.bubT<=0){ scene.remove(meR.bubble); meR.bubble=null; } }
    if(!MP.on)return;
    MP.sendT-=dt; if(MP.sendT<=0){ MP.sendT=1/12; const p=myPresence(); const k=JSON.stringify(p); if(k!==MP.last){ MP.last=k; MP.room.presence(p).catch(()=>{}); } }
    rideTick(dt); coTick(); raceTick(dt); trTick(); cmTick(dt); vcTick(dt);
    MP.remote.forEach(r=>{ if(r.rd){ const dv=r.rd==='bus'?{x:BUS.x,z:BUS.z,h:BUS.h,vk:'bus'}:r.rd===(MP.room.me&&MP.room.me())?(st.car&&{x:st.car.x,z:st.car.z,h:st.car.h,vk:st.car.kind||'car'}):MP.remote.get(r.rd); if(dv){ r.x=dv.x; r.z=dv.z; r.tx=dv.x; r.tz=dv.z; const y0=H(dv.x,dv.z); if(dv.vk==='melex'){ const ch=Math.cos(dv.h), sh=Math.sin(dv.h); r.body.visible=true; r.body.position.set(dv.x-.02*ch-.26*sh,y0-.25,dv.z-.02*sh+.26*ch); r.body.rotation.y=-dv.h+Math.PI/2; animPerson(r.body,0,0); } else r.body.visible=false; const idx=riders(r.rd).indexOf(r.peer)+1; const big=dv.vk==='bus'||dv.vk==='fire'; r.tag.position.set(dv.x,y0+(big?4.2:2.9)+.62*idx,dv.z); const d0=camera.position.distanceTo(r.tag.position); const sc0=clamp(d0/18,1,7); r.tag.scale.set(3.2*sc0,.6*sc0,1); return; } }
      const k=Math.min(1,dt*10); r.x+=(r.tx-r.x)*k; r.z+=(r.tz-r.z)*k; let dh=r.th-r.h; dh=Math.atan2(Math.sin(dh),Math.cos(dh)); r.h+=dh*k; const same=(r.in||'')===inKey(); const y=r.in?(same?CUR.y+(r.gy||0):0):H(r.x,r.z);
      if(r.veh){ seatCar(r.veh,r.x,r.z,r.h,r.vk==='bus'?.1:0); (r.veh.userData.wheels||[]).forEach(w=>w.rotation.z-=r.spd*dt/.36); const rider=r.vk==='bike'||r.vk==='moto'; r.body.visible=rider; if(rider){ r.body.position.set(r.x,y+.35,r.z); r.body.rotation.y=-r.h+Math.PI/2; animPerson(r.body,tAll*r.spd*.8,r.vk==='bike'?.5:0); } }
      else { r.body.visible=true; r.body.position.set(r.x,y+.1,r.z); r.body.rotation.y=r.h; r.walk+=dt*r.spd*1.6; animPerson(r.body,r.walk,Math.min(1,r.spd/4.2)); }
      const hy=y+(r.vk&&r.vk!=='bike'&&r.vk!=='moto'?(r.vk==='bus'||r.vk==='fire'?4.2:2.9):2.45); r.tag.position.set(r.x,hy,r.z); r.tag.visible=same; if(r.veh) r.veh.visible=same; if(!same) r.body.visible=false; const d=camera.position.distanceTo(r.tag.position); const sc=clamp(d/18,1,7); r.tag.scale.set(3.2*sc,.6*sc,1);
      if(r.bubble){ r.bubT-=dt; r.bubble.visible=same; r.bubble.position.set(r.x,hy+.9*sc,r.z); r.bubble.scale.set(4.2*sc,1.3*sc,1); if(r.bubT<=0){ scene.remove(r.bubble); r.bubble=null; } } });
  }
  /* wspólna jazda: do 4 osób w jednym aucie (kierowca + 3 pasażerów); pasażer wskazuje kierowcę w swojej obecności (rd) */
  const RIDEABLE=['car','van','bus','fire','melex'];
  const rideCap=vk=>vk==='melex'?1:3;
  function riders(drv){ const me=MP.room&&MP.room.me?MP.room.me():null; const a=[]; MP.remote.forEach(r=>{ if(r.rd===drv) a.push(r.peer); }); if((MP.ride===drv||(drv==='bus'&&BUSR.on))&&me) a.push(me); return a.sort(); }
  function tryRide(){ if(!MP.on||!MP.room||!MP.room.me||st.car) return false; let b=null,bd=6; MP.remote.forEach(r=>{ if(!r.veh||!RIDEABLE.includes(r.vk)||r.rd) return; const d=Math.hypot(r.x-st.x,r.z-st.z); if(d<bd){ bd=d; b=r; } });
    if(!b) return false; if(riders(b.peer).length>=rideCap(b.vk)){ toast(b.vk==='melex'?'Melex jest pełny (kierowca + 1 pasażer)':'Auto jest pełne (kierowca + 3 pasażerów)',2); return true; } MP.ride=b.peer; MP.last=''; player.visible=false; toast(`🚗 Jedziesz z ${(b.name||'graczem').replace(/[<>&]/g,'')} - F wysiada`,3); return true; }
  function leaveRide(msg){ const r=MP.remote.get(MP.ride); MP.ride=null; MP.last=''; player.visible=st.mode!==1; if(r){ const x=r.x+Math.sin(r.h)*2.4, z=r.z-Math.cos(r.h)*2.4; if(!blocked(x,z,.4)){ st.x=x; st.z=z; } } if(msg) toast(msg,2); }
  function rideTick(dt){ if(!MP.ride) return; const r=MP.remote.get(MP.ride); if(!r||!r.veh||!RIDEABLE.includes(r.vk)){ leaveRide('Kierowca wysiadł'); return; }
    const me=MP.room.me(); if(riders(MP.ride).indexOf(me)>=rideCap(r.vk)){ leaveRide('Pojazd jest pełny'); return; }
    st.x=r.x; st.z=r.z; st.vx=0; st.vz=0; st.gy=0; st.jy=0; st.vy=0; player.visible=false; }
  /* ---------- społeczność: znajomi, pokoje prywatne, zaproszenia i wiadomości współpracy ---------- */
  const CO={h:{},invH:{},actions:[],q:[],cur:null,friends:[],on:{},menu:null,open:false,notified:{}};
  try{ CO.friends=(JSON.parse(localStorage.getItem('trebaczew-friends')||'[]')||[]).filter(f=>f&&/^[a-z0-9]{6}$/.test(f.fc)).map(f=>({fc:f.fc,nick:cleanTxt(f.nick,24)})).slice(0,40); }catch(e){}
  const coSaveFr=()=>{ try{ localStorage.setItem('trebaczew-friends',JSON.stringify(CO.friends)); }catch(e){} };
  const peerName=p=>{ const r=MP.remote.get(p); return (r&&r.name)||'Gracz'; };
  const esc2=t=>String(t).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
  function coSend(to,k,d){ if(!MP.room||!MP.room.connected()) return false; MP.room.emit('co',{k,to,d:d||{}}).catch(()=>{}); return true; }
  function coMsg(msg){ if(msg.sameTab) return; const d=msg.data||{}; const f=CO.h[d.k]; if(f){ try{ f(d.d||{},msg.peer,d.k); }catch(e){ console.warn('co',d.k,e); } } }
  const coBox=document.createElement('div'); coBox.id='coBox'; coBox.hidden=true; document.body.appendChild(coBox);
  function coAsk(o){ CO.q.push(o); coNext(); }
  function coNext(){ if(CO.cur||!CO.q.length) return; const o=CO.q.shift(); CO.cur=o; o.t0=tAll; coBox.hidden=false; coBox.innerHTML=`<div class="kick">${esc2(o.kick||'Zaproszenie')}</div><b>${esc2(o.title)}</b>${o.sub?`<div class="sub">${esc2(o.sub)}</div>`:''}<div class="row"><button class="btn hot" id="coY">${esc2(o.yes||'Przyjmij')}</button><button class="btn" id="coN">${esc2(o.no||'Odrzuć')}</button></div>`;
    document.getElementById('coY').onclick=()=>coDone(true); document.getElementById('coN').onclick=()=>coDone(false); if(AU.ctx&&AU.on&&sfx.horn) sfx.horn(); }
  function coDone(yes){ const o=CO.cur; if(!o) return; CO.cur=null; coBox.hidden=true; try{ (yes?o.onYes:o.onNo)&&(yes?o.onYes:o.onNo)(); }catch(e){ console.warn(e); } coNext(); }
  function coTick(){ if(CO.cur&&tAll-CO.cur.t0>(CO.cur.ttl||30)){ const o=CO.cur; CO.cur=null; coBox.hidden=true; try{ o.onNo&&o.onNo(true); }catch(e){} coNext(); } }
  // zaproszenia: d={w:rodzaj,...}
  CO.h.inv=(d,from)=>{ const nm=peerName(from), h=CO.invH[d.w]; if(h) h(d,from,nm); };
  CO.invH.room=(d,from,nm)=>{ const code=String(d.code||'').toLowerCase(); if(!/^p[a-z0-9]{5,8}$/.test(code)) return; coAsk({title:nm+' zaprasza Cię do pokoju prywatnego',sub:'Kod: '+code.slice(1).toUpperCase(),yes:'Dołącz',onYes:()=>{ MP.room.switchTo(code); MP.last=''; }}); };
  function coCreatePrivate(){ const cs='abcdefghjkmnpqrstuvwxyz23456789'; let c='p'; for(let i=0;i<6;i++) c+=cs[Math.floor(Math.random()*cs.length)]; MP.room.switchTo(c); MP.last=''; return c; }
  function coInviteRoom(peer){ if(!MP.room) return; const send=()=>{ const n=MP.room.name(); if(n[0]==='p'&&MP.room.connected()){ coSend(peer,'inv',{w:'room',code:n}); toast('✉ Zaproszenie wysłane: '+esc2(peerName(peer)),2); return true; } return false; };
    if(MP.room.name()[0]!=='p'){ coCreatePrivate(); let n=0; const iv=setInterval(()=>{ if(send()||++n>30) clearInterval(iv); },300); } else send(); }
  // znajomi: kod znajomego jest stały dla przeglądarki; lista jest lokalna, status online pobieramy z serwera
  const isFriend=fc=>CO.friends.some(f=>f.fc===fc);
  function coAddFriend(fc,nick){ if(!fc||fc===MYFC||isFriend(fc)||CO.friends.length>=40) return false; CO.friends.push({fc,nick:cleanTxt(nick||'Gracz',24)}); coSaveFr(); return true; }
  async function coPost(path,obj){ if(!/^https?:$/.test(location.protocol)) return null; try{ const r=await fetch(STAT_URL+path,{method:'POST',body:JSON.stringify(obj)}); if(!r.ok) return null; return await r.json(); }catch(e){ return null; } }
  async function coHere(){ if(!MP.on||!MP.room||!MP.room.connected()) return; const n=MP.room.name(); coPost('/here',{fc:MYFC,room:n[0]==='t'?n:null,nick:myNick||''}); }
  async function coPoll(){ if(!MP.on||!CO.friends.length) return; const r=await coPost('/where',{fcs:CO.friends.map(f=>f.fc)}); if(!r||!r.on) return; const on={}; r.on.forEach(x=>{ on[x.fc]=x; });
    CO.friends.forEach(f=>{ if(on[f.fc]&&!CO.on[f.fc]&&!CO.notified[f.fc]){ CO.notified[f.fc]=1; toast(`👋 Znajomy <b>${esc2(f.nick||on[f.fc].nick||'Gracz')}</b> jest online (pokój ${esc2(on[f.fc].room.slice(1))})`,3); } if(!on[f.fc]) CO.notified[f.fc]=0; if(on[f.fc]&&on[f.fc].nick&&on[f.fc].nick!==f.nick){ f.nick=on[f.fc].nick; } }); CO.on=on; coSaveFr(); if(CO.open) renderSoc(); }
  setInterval(()=>{ coHere(); },40000); setInterval(()=>{ coPoll(); },30000);
  const socEl=document.createElement('div'); socEl.id='soc'; socEl.hidden=true; document.body.appendChild(socEl);
  function socToggle(v){ CO.open=v===undefined?!CO.open:v; socEl.hidden=!CO.open; if(CO.open){ keys.clear(); renderSoc(); coPoll(); if(ACC.tok&&tAll-HM.t>3) homeCall('get'); } }
  function renderSoc(){ if(!CO.open) return; const rn=MP.room?MP.room.name():'', priv=rn[0]==='p'; const peers=[...MP.remote.values()];
    let h=`<div class="socH"><b>Wieloosobowo</b><button class="btn sm" data-a="x">✕</button></div>`;
    h+=`<div class="socS">Twój kod znajomego: <b class="fc">${MYFC.toUpperCase()}</b> <button class="btn sm" data-a="cpfc">Kopiuj</button><div class="sub">Podaj go znajomym, żeby dodali Cię do listy.</div></div>`;
    h+=`<div class="socS"><b>Pokój:</b> ${priv?'🔒 prywatny <span class="fc">'+esc2(rn.slice(1).toUpperCase())+'</span> (max 8 osób)':'🌐 publiczny '+esc2(rn.slice(1))}<div class="row">${priv?'<button class="btn sm" data-a="cplink">Kopiuj link</button><button class="btn sm" data-a="pub">Wróć do publicznego</button>':'<button class="btn sm" data-a="mkpriv">Utwórz pokój prywatny</button>'}</div><div class="row"><input id="socCode" maxlength="9" placeholder="Kod pokoju" aria-label="Kod pokoju"><button class="btn sm" data-a="joinc">Dołącz</button></div></div>`;
    h+=`<div class="socS"><b>Gracze w pokoju (${peers.length+1})</b>`; if(!peers.length) h+='<div class="sub">Nikogo więcej tu nie ma. Zaproś znajomego kodem pokoju.</div>';
    peers.forEach(r=>{ const fr=r.fc&&isFriend(r.fc); h+=`<div class="socP"><i style="background:${esc2(r.col)}"></i><span>${esc2(r.name||'Gracz')}</span>${r.fc&&!fr?`<button class="btn sm" data-a="addf" data-p="${esc2(r.peer)}">+ znajomy</button>`:fr?'<em>znajomy</em>':''}<button class="btn sm" data-a="menu" data-p="${esc2(r.peer)}">Zaproś…</button></div>`;
      if(CO.menu===r.peer){ h+='<div class="socM"><button class="btn sm" data-a="invroom" data-p="'+esc2(r.peer)+'">do pokoju prywatnego</button>'+CO.actions.map((a,i)=>`<button class="btn sm" data-a="act" data-i="${i}" data-p="${esc2(r.peer)}">${esc2(a.l)}</button>`).join('')+'</div>'; } });
    h+='</div>'; h+=vcSocHtml(); h+=raceSocHtml(); h+=homeSocHtml(); h+=`<div class="socS"><b>Znajomi (${CO.friends.length})</b>`; if(!CO.friends.length) h+='<div class="sub">Dodaj znajomych przyciskiem „+ znajomy” albo wpisz kod:</div>';
    CO.friends.forEach(f=>{ const o=CO.on[f.fc]; h+=`<div class="socP"><i style="background:${o?'#47b04b':'#666'}"></i><span>${esc2(f.nick||f.fc.toUpperCase())}</span>${o?`<button class="btn sm" data-a="goto" data-r="${esc2(o.room)}">Dołącz (pokój ${esc2(o.room.slice(1))})</button>`:'<em>offline</em>'}<button class="btn sm" data-a="delf" data-f="${f.fc}">✕</button></div>`; });
    h+=`<div class="row"><input id="socFc" maxlength="6" placeholder="Kod znajomego" aria-label="Kod znajomego"><button class="btn sm" data-a="addc">Dodaj</button></div></div>`;
    socEl.innerHTML=h; }
  socEl.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; const a=b.dataset.a, p=b.dataset.p; if(a==='x'){ socToggle(false); return; }
    if(a==='cpfc'){ try{ navigator.clipboard.writeText(MYFC.toUpperCase()); toast('Skopiowano kod znajomego',1.5); }catch(_){} return; }
    if(a==='mkpriv'){ coCreatePrivate(); renderSoc(); return; } if(a==='pub'){ MP.room.switchTo(null); MP.last=''; renderSoc(); return; }
    if(a==='cplink'){ try{ navigator.clipboard.writeText(location.origin+location.pathname+'?room='+MP.room.name().slice(1)); toast('Skopiowano link do pokoju',1.5); }catch(_){} return; }
    if(a==='joinc'){ const c=(document.getElementById('socCode').value||'').toLowerCase().replace(/[^a-z0-9]/g,''); if(c.length<5||c.length>8){ toast('Kod pokoju ma 5-8 znaków',2); return; } MP.room.switchTo('p'+c); MP.last=''; return; }
    if(a==='addf'){ const r=MP.remote.get(p); if(r&&coAddFriend(r.fc,r.name)){ toast('Dodano do znajomych: '+esc2(r.name||'Gracz'),2); coPoll(); } renderSoc(); return; }
    if(a==='addc'){ const c=(document.getElementById('socFc').value||'').toLowerCase().replace(/[^a-z0-9]/g,''); if(c.length!==6){ toast('Kod znajomego ma 6 znaków',2); return; } if(c===MYFC){ toast('To Twój własny kod',2); return; } coAddFriend(c,'Znajomy '+c.toUpperCase()); coPoll(); renderSoc(); return; }
    if(a==='delf'){ CO.friends=CO.friends.filter(f=>f.fc!==b.dataset.f); coSaveFr(); renderSoc(); return; }
    if(a==='goto'){ MP.room.switchTo(b.dataset.r); MP.last=''; socToggle(false); return; }
    if(a==='menu'){ CO.menu=CO.menu===p?null:p; renderSoc(); return; } if(a==='invroom'){ coInviteRoom(p); CO.menu=null; renderSoc(); return; }
    if(a[0]==='h'&&a.length>2&&a!=='hmAmt'){ homeAct(a,b); return; }
    if(a.slice(0,2)==='vc'){ vcAct(a,p); return; }
    if(a==='rjoin'){ raceJoin(p); renderSoc(); return; } if(a==='rsel'){ RACE.sel=+b.dataset.i|0; renderSoc(); return; } if(a==='rfee'){ RACE.feeSel=+b.dataset.i|0; renderSoc(); return; } if(a==='rmk'){ raceCreate(); socToggle(false); return; }
    if(a==='act'){ const act=CO.actions[+b.dataset.i]; if(act){ CO.menu=null; socToggle(false); act.fn(p); } } });
  addEventListener('keydown',e=>{ if(CO.open&&e.key==='Escape'){ e.stopPropagation(); socToggle(false); } },true);
  { const bs=document.getElementById('mp'); if(bs){ const b=document.createElement('button'); b.className='btn'; b.id='bSoc'; b.textContent='Znajomi i pokoje'; b.style.cssText='margin-top:6px;width:100%'; b.addEventListener('click',()=>socToggle()); bs.appendChild(b); } }
  /* ---------- wspólna praca w cementowni (2 osoby): gracze wymieniają wiadomości 'job' ---------- */
  CO.h.job=(d,from)=>{ if(!MG.on||!MG.opt||MG.opt.peer!==from||!MG.g||!MG.g.net) return; MG.g.net(String(d.m||'').slice(0,6),d); };
  CO.jobWait=null;
  const JOBS={cysterna:{t:'Załadunek cystern we dwoje',sub:'Ty obsługujesz wagę - zatwierdzasz ładunek, gdy waga pokaże 24 t'},palety:{t:'Brygada paletyzacji',sub:'Trafiajcie w rytm razem - obaj naciskacie w tej samej chwili'}};
  CO.invH.job=(d,from,nm)=>{ const k=String(d.kind||''); const J=JOBS[k]; if(!J) return; coAsk({kick:'Wspólna praca',title:nm+' zaprasza do pracy: '+J.t,sub:J.sub,yes:'Dołącz',no:'Nie teraz',ttl:35,onYes:()=>{ if(MG.on){ toast('Skończ najpierw bieżącą minigrę',2); return; } coSend(from,'jobok',{kind:k}); openMini(k+'2',{peer:from,host:false,title:J.t+' - Cementownia Warta',sub:J.sub}); },onNo:t=>{ if(!t) coSend(from,'jobno',{kind:k}); }}); };
  CO.h.jobok=(d,from)=>{ const w=CO.jobWait; if(!w||w.peer!==from||tAll-w.t>45||d.kind!==w.kind) return; CO.jobWait=null; if(MG.on){ coSend(from,'jobno',{kind:w.kind}); return; } const J=JOBS[w.kind]; openMini(w.kind+'2',{peer:from,host:true,title:J.t+' - Cementownia Warta',sub:w.kind==='cysterna'?'Ty ładujesz cysternę - partner obsługuje wagę':J.sub}); };
  CO.h.jobno=(d,from)=>{ if(CO.jobWait&&CO.jobWait.peer===from){ CO.jobWait=null; toast(esc2(peerName(from))+' nie może teraz pracować',2); } };
  CO.actions.push({l:'wspólna praca (cementownia)',fn:peer=>{ const s=typeof nearMini==='function'?nearMini():null; const k=s&&s.id; if(!JOBS[k]){ toast('Stań przy stanowisku: załadunek cystern albo paletyzacja worków',3); return; } CO.jobWait={peer,kind:k,t:tAll}; coSend(peer,'inv',{w:'job',kind:k}); toast('✉ Zaproszenie do pracy wysłane: '+esc2(peerName(peer)),2); }});
  /* ---------- wyścigi w pokoju: lobby, wpisowe, punkty kontrolne, policja jako przeszkoda, tablica wyników ---------- */
  const RACE={st:'idle',routes:null,id:'',ri:0,fee:0,host:null,mine:false,pl:new Map(),pot:0,go:0,t0:0,cp:0,openers:new Map(),openT:0,joinT:0,cops:[],pen:0,penT:-9,firstFin:0,endT:0,resT:0,box:document.createElement('div'),bt:0,sel:0,feeSel:20,left:0};
  RACE.box.id='raceBox'; RACE.box.hidden=true; document.body.appendChild(RACE.box);
  RACE.group=new THREE.Group(); RACE.group.visible=false; scene.add(RACE.group);
  const RACE_FEES=[0,20,50,100];
  function raceRoutes(){ if(RACE.routes) return RACE.routes; const L=DK.L; const mk=(n,a,b,k)=>{ const cps=[]; for(let i=1;i<=k;i++){ const s=sampleLine(DK.pts,DK.len,a+(b-a)*i/k); cps.push([s.x,s.z]); } const s0=sampleLine(DK.pts,DK.len,a), dir=b>a?1:-1; const cops=[.38,.72].map(f=>{ const s=sampleLine(DK.pts,DK.len,a+(b-a)*f); return {x:s.x-s.tz*2.2*dir,z:s.z+s.tx*2.2*dir,h:Math.atan2(s.tz*dir,s.tx*dir)+Math.PI/2*0}; }); return {n,cps,start:{x:s0.x,z:s0.z,tx:s0.tx*dir,tz:s0.tz*dir},cops,len:Math.round(Math.abs(b-a))}; };
    RACE.routes=[mk('Sprint przez Trębaczew',L*.2,L*.42,5),mk('Długi dystans DK',L*.08,L*.92,9),mk('Powrót do Trębaczewa',L*.82,L*.5,6)]; return RACE.routes; }
  const raceMe=()=>MP.room&&MP.room.me?MP.room.me():'';
  const raceName=p=>p===raceMe()?'Ty':peerName(p);
  const raceBcast=(m,d)=>coSend('*','rc',Object.assign({m,id:RACE.id},d||{}));
  const raceBest=()=>{ try{ return JSON.parse(localStorage.getItem('trebaczew-race')||'{}')||{}; }catch(e){ return {}; } };
  function raceSetMarks(){ while(RACE.group.children.length) RACE.group.remove(RACE.group.children[0]); const R=raceRoutes()[RACE.ri]; R.cps.forEach((p,i)=>{ const g=new THREE.Group(); const last=i===R.cps.length-1; const m=new THREE.MeshBasicMaterial({color:last?0xffffff:0xf2c230,transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide}); for(let k=0;k<5;k++){ const c=new THREE.Mesh(new THREE.CylinderGeometry(9,9,3,28,1,true),m); c.position.y=1.5+k*3; g.add(c); } g.position.set(p[0],H(p[0],p[1]),p[1]); g.userData.i=i; RACE.group.add(g); });
    RACE.cops.forEach(c=>scene.remove(c)); RACE.cops=R.cops.map(o=>{ const g=makeCop(); g.position.set(o.x,H(o.x,o.z)+.05,o.z); seatCar(g,o.x,o.z,o.h+Math.PI/2); scene.add(g); return g; }); }
  function raceClear(){ RACE.group.visible=false; RACE.cops.forEach(c=>scene.remove(c)); RACE.cops=[]; WAYPOINT=null; }
  function raceReset(){ RACE.st='idle'; RACE.pl.clear(); RACE.mine=false; RACE.host=null; RACE.id=''; RACE.pen=0; raceClear(); raceRender(); }
  function raceCreate(){ if(!MP.room||!MP.room.connected()||!MP.room.me) return toast('Wyścigi działają w trybie wieloosobowym',2); if(RACE.st!=='idle') return toast('Już uczestniczysz w wyścigu',2); if(!st.car) return toast('Wsiądź do auta, żeby zorganizować wyścig',2.5); if(st.money<RACE.feeSel) return toast('Za mało pieniędzy na wpisowe',2);
    RACE.id=Math.random().toString(36).slice(2,8); RACE.ri=RACE.sel; RACE.fee=RACE.feeSel; RACE.mine=true; RACE.host=raceMe(); RACE.st='lobby'; RACE.pl.clear(); RACE.pl.set(raceMe(),{cp:0,t:null}); addMoney(-RACE.fee); RACE.openT=0; toast(`🏁 Lobby wyścigu otwarte: <b>${esc2(raceRoutes()[RACE.ri].n)}</b>. Poczekaj na graczy i naciśnij Start.`,4); raceRender(); }
  function raceJoin(host){ const o=RACE.openers.get(host); if(!o||RACE.st!=='idle') return; if(!st.car) return toast('Wsiądź do auta, żeby dołączyć do wyścigu',2.5); if(st.money<o.f) return toast('Za mało pieniędzy na wpisowe',2); addMoney(-o.f); RACE.id=o.id; RACE.ri=o.r; RACE.fee=o.f; RACE.host=host; RACE.mine=false; RACE.st='joined'; RACE.joinT=tAll; RACE.pl.clear(); coSend(host,'rc',{m:'join',id:o.id}); toast('Zapisano na wyścig. Czekaj na start…',2.5); raceRender(); }
  function raceRefund(msg){ if(RACE.fee>0) addMoney(RACE.fee); const m=msg; raceReset(); if(m) toast(m,3); }
  function raceCancel(){ if(RACE.st==='lobby'&&RACE.mine){ raceBcast('cancel'); raceRefund('Lobby zamknięte - wpisowe zwrócone'); } else if(RACE.st==='joined'){ coSend(RACE.host,'rc',{m:'leave',id:RACE.id}); raceRefund('Wypisano z wyścigu - wpisowe zwrócone'); } }
  function raceStart(){ if(RACE.st!=='lobby'||!RACE.mine||RACE.pl.size<2) return toast('Potrzeba co najmniej 2 zawodników',2); const ids=[...RACE.pl.keys()]; raceBcast('go',{p:ids}); raceBegin(ids); }
  function raceBegin(ids){ RACE.pl.clear(); ids.slice(0,8).forEach(p=>RACE.pl.set(p,{cp:0,t:null})); RACE.pot=RACE.fee*RACE.pl.size; RACE.st='count'; RACE.go=tAll+6; RACE.cp=0; RACE.pen=0; RACE.left=99; raceSetMarks(); RACE.group.visible=true;
    const R=raceRoutes()[RACE.ri], slot=Math.max(0,ids.indexOf(raceMe())), c=st.car; if(c){ const back=8+(slot>>1)*8, side=(slot&1?1:-1)*2.3; const x=R.start.x-R.start.tx*back-R.start.tz*side, z=R.start.z-R.start.tz*back+R.start.tx*side; c.x=x; c.z=z; c.h=Math.atan2(R.start.tz,R.start.tx); c.v=0; try{ seatCar(c.g,x,z,c.h); }catch(e){} } else { st.x=R.start.x; st.z=R.start.z; }
    WAYPOINT=[R.cps[0][0],R.cps[0][1]]; toast(`🏁 <b>${esc2(R.n)}</b> · pula ${fmt(RACE.pot)}<br>Start za 5…`,3); raceRender(); }
  function raceFinishMe(){ const ms=Math.max(1000,Math.round((tAll-RACE.t0+RACE.pen)*1000)); const me=RACE.pl.get(raceMe()); if(me) me.t=ms; raceBcast('fin',{t:ms}); RACE.st='fin'; WAYPOINT=null; if(!RACE.firstFin) RACE.firstFin=tAll; toast(`🏁 Meta! Twój czas: <b>${(ms/1000).toFixed(1)} s</b>`,3.5); raceRender(); }
  function raceResult(){ const arr=[...RACE.pl.entries()].map(([p,o])=>({p,cp:o.cp,t:o.t})); arr.sort((a,b)=>(a.t!==null&&b.t!==null)?(a.t-b.t||(a.p<b.p?-1:1)):a.t!==null?-1:b.t!==null?1:(b.cp-a.cp)); const w=arr[0]&&arr[0].t!==null?arr[0]:null; RACE.res=arr; RACE.st='result'; RACE.resT=tAll; const meT=RACE.pl.get(raceMe()); let txt='Wyścig zakończony';
    if(w&&w.p===raceMe()){ addMoney(RACE.pot); addXP(25); txt=`🏆 Wygrywasz wyścig! +${fmt(RACE.pot)}`; if(AU.ctx&&AU.on) sfx.win(); duelBanner(true,txt); } else if(w){ txt=`Wygrywa ${esc2(raceName(w.p))} (${(w.t/1000).toFixed(1)} s)`; duelBanner(false,txt); }
    if(meT&&meT.t!==null){ const b=raceBest(), k='r'+RACE.ri; if(!b[k]||meT.t<b[k]){ b[k]=meT.t; try{ localStorage.setItem('trebaczew-race',JSON.stringify(b)); }catch(e){} } }
     raceClear(); raceRender(); }
  CO.h.rc=(d,from)=>{ const m=String(d.m||''), id=String(d.id||'').slice(0,8);
    if(m==='open'){ const r=d.r|0, f=d.f|0; if(r<0||r>2||!RACE_FEES.includes(f)) return; RACE.openers.set(from,{id,r,f,n:d.c|0,t:tAll}); if(CO.open) renderSoc(); if(!RACE.noted||RACE.noted!==id){ RACE.noted=id; if(RACE.st==='idle') toast(`🏁 ${esc2(peerName(from))} organizuje wyścig (${esc2(raceRoutes()[r].n)}, wpisowe ${fmt(f)}) - Znajomi i pokoje → Wyścigi`,4.5); } return; }
    if(id!==RACE.id) { if(m==='cancel'||m==='go') RACE.openers.delete(from); return; }
    if(m==='join'&&RACE.mine&&RACE.st==='lobby'){ if(RACE.pl.size>=8){ coSend(from,'rc',{m:'full',id}); return; } RACE.pl.set(from,{cp:0,t:null}); raceBcast('lst',{p:[...RACE.pl.keys()]}); raceRender(); return; }
    if(m==='leave'&&RACE.mine&&RACE.st==='lobby'){ RACE.pl.delete(from); raceBcast('lst',{p:[...RACE.pl.keys()]}); raceRender(); return; }
    if(from!==RACE.host&&!RACE.pl.has(from)) return;
    if(m==='full'&&RACE.st==='joined'&&from===RACE.host){ raceRefund('Wyścig jest pełny - wpisowe zwrócone'); return; }
    if(m==='lst'&&from===RACE.host&&RACE.st==='joined'){ RACE.pl.clear(); (Array.isArray(d.p)?d.p:[]).slice(0,8).forEach(p=>RACE.pl.set(String(p),{cp:0,t:null})); raceRender(); return; }
    if(m==='cancel'&&from===RACE.host&&RACE.st==='joined'){ raceRefund('Organizator zamknął lobby - wpisowe zwrócone'); return; }
    if(m==='go'&&from===RACE.host&&RACE.st==='joined'){ const ids=(Array.isArray(d.p)?d.p:[]).map(String); if(!ids.includes(raceMe())){ raceRefund('Nie załapałeś się na start - wpisowe zwrócone'); return; } raceBegin(ids); return; }
    const o=RACE.pl.get(from); if(!o) return;
    if(m==='prog') o.cp=d.c|0; else if(m==='fin'){ o.t=Math.max(1000,d.t|0); if(!RACE.firstFin) RACE.firstFin=tAll; } else if(m==='quit') o.dnf=true; raceRender(); };
  function raceTick(dt){ RACE.openers.forEach((o,k)=>{ if(tAll-o.t>8||!MP.remote.has(k)) RACE.openers.delete(k); });
    if(RACE.st==='lobby'&&RACE.mine){ RACE.openT-=dt; if(RACE.openT<=0){ RACE.openT=2.5; raceBcast('open',{r:RACE.ri,f:RACE.fee,c:RACE.pl.size}); } for(const p of [...RACE.pl.keys()]) if(p!==raceMe()&&!MP.remote.has(p)){ RACE.pl.delete(p); raceBcast('lst',{p:[...RACE.pl.keys()]}); raceRender(); } }
    if(RACE.st==='joined'&&tAll-RACE.joinT>40) raceRefund('Brak startu - wpisowe zwrócone');
    if(RACE.st==='count'){ const l=Math.ceil(RACE.go-tAll); if(l!==RACE.left){ RACE.left=l; if(l>0&&l<=5){ toast(`<b>${l}</b>`,.8); if(AU.ctx&&AU.on) tone('square',660,AU.ctx.currentTime,.12,.05); } } if(st.car){ st.car.v=0; } if(tAll>=RACE.go){ RACE.st='race'; RACE.t0=tAll; RACE.firstFin=0; toast('<b>START!</b>',1.6); if(AU.ctx&&AU.on) tone('square',990,AU.ctx.currentTime,.3,.06); raceRender(); } }
    if(RACE.st==='race'){ const R=raceRoutes()[RACE.ri]; const x=st.car?st.car.x:st.x, z=st.car?st.car.z:st.z; const c=R.cps[RACE.cp];
      if(c&&Math.hypot(c[0]-x,c[1]-z)<14){ RACE.cp++; const me=RACE.pl.get(raceMe()); if(me) me.cp=RACE.cp; raceBcast('prog',{c:RACE.cp}); if(RACE.cp>=R.cps.length) raceFinishMe(); else { WAYPOINT=[R.cps[RACE.cp][0],R.cps[RACE.cp][1]]; toast(`Punkt ${RACE.cp}/${R.cps.length}`,1); if(AU.ctx&&AU.on) tone('square',880,AU.ctx.currentTime,.1,.05); } }
      if(st.car&&tAll-RACE.penT>2) for(const cg of RACE.cops){ if(Math.hypot(cg.position.x-x,cg.position.z-z)<4.2){ RACE.penT=tAll; RACE.pen+=1.5; st.car.v*=.2; toast('🚓 Policja na drodze! Kara +1,5 s',1.8); break; } }
      if(tAll-RACE.t0>360){ raceBcast('quit'); const me=RACE.pl.get(raceMe()); if(me) me.dnf=true; RACE.st='fin'; WAYPOINT=null; toast('Limit czasu wyścigu minął',3); }
      RACE.group.children.forEach(g=>{ g.visible=g.userData.i>=RACE.cp; g.children.forEach((c2,i)=>c2.material.opacity=g.userData.i===RACE.cp?.55+.2*Math.sin(tAll*6+i):.22); g.rotation.y=tAll*.6; }); }
    if(RACE.st==='race'||RACE.st==='fin'){ for(const [p,o] of RACE.pl) if(p!==raceMe()&&!MP.remote.has(p)&&!o.dnf&&o.t===null) o.dnf=true; const act=[...RACE.pl.values()].filter(o=>o.t===null&&!o.dnf).length; if(act===0||(RACE.firstFin&&tAll-RACE.firstFin>25)||(RACE.st==='fin'&&tAll-RACE.t0>370)) raceResult(); }
    if(RACE.st==='result'&&tAll-RACE.resT>14) raceReset();
    RACE.bt-=dt; if(RACE.bt<=0&&RACE.st!=='idle'){ RACE.bt=.25; raceRender(); } }
  const fmtT=ms=>(ms/1000).toFixed(1)+' s';
  function raceRender(){ const b=RACE.box; if(RACE.st==='idle'||RACE.st==='joined'||(RACE.st==='lobby'&&false)){ if(RACE.st==='idle'){ b.hidden=true; return; } }
    const R=raceRoutes()[RACE.ri]; let h=''; b.hidden=false;
    if(RACE.st==='joined'||RACE.st==='lobby'){ h=`<b>🏁 ${esc2(R.n)}</b><div class="sub">wpisowe ${fmt(RACE.fee)} · ${RACE.pl.size}/8 zawodników${RACE.st==='joined'?' · czekam na start':''}</div><div class="row">${RACE.mine?`<button class="btn hot" data-r="start">Start (${RACE.pl.size})</button>`:''}<button class="btn" data-r="cancel">${RACE.mine?'Zamknij lobby':'Wypisz się'}</button></div>`; }
    else { const sorted=[...RACE.pl.entries()].sort((a,b)=>(a[1].t!==null&&b[1].t!==null)?a[1].t-b[1].t:a[1].t!==null?-1:b[1].t!==null?1:b[1].cp-a[1].cp);
      const head=RACE.st==='count'?`Start za ${Math.max(0,Math.ceil(RACE.go-tAll))}…`:RACE.st==='result'?'Wyniki':RACE.st==='fin'?'Meta - czekam na resztę':`Punkt ${Math.min(RACE.cp+1,R.cps.length)}/${R.cps.length} · ${((tAll-RACE.t0)).toFixed(1)} s${RACE.pen?` (+${RACE.pen.toFixed(1)} kary)`:''}`;
      h=`<b>🏁 ${esc2(R.n)}</b> · pula ${fmt(RACE.pot)}<div class="sub">${head}</div><table>${sorted.map(([p,o],i)=>`<tr${p===raceMe()?' class="me"':''}><td>${i+1}.</td><td>${esc2(raceName(p))}</td><td>${o.t!==null?fmtT(o.t):o.dnf?'DNF':`pkt ${o.cp}/${R.cps.length}`}</td></tr>`).join('')}</table>`;
      if(RACE.st==='result'){ const bs=raceBest()['r'+RACE.ri]; h+=`<div class="sub">Twój rekord na trasie: ${bs?fmtT(bs):'-'}</div>`; }
      h+=`<div class="row">${RACE.st==='result'?'<button class="btn" data-r="close">Zamknij</button>':'<button class="btn" data-r="quit">Poddaj się</button>'}</div>`; }
    b.innerHTML=h; }
  RACE.box.addEventListener('click',e=>{ const r=e.target.closest('button'); if(!r) return; const a=r.dataset.r; if(a==='start') raceStart(); else if(a==='cancel') raceCancel(); else if(a==='close') raceReset(); else if(a==='quit'){ if(RACE.st==='race'||RACE.st==='count'||RACE.st==='fin'){ raceBcast('quit'); const me=RACE.pl.get(raceMe()); if(me) me.dnf=true; RACE.st='fin'; WAYPOINT=null; raceRender(); } } });
  function raceSocHtml(){ let h='<div class="socS"><b>Wyścigi</b>'; const R=raceRoutes(); if(RACE.st!=='idle'){ h+=`<div class="sub">Bierzesz udział w wyścigu: ${esc2(R[RACE.ri].n)}</div>`; } else {
      RACE.openers.forEach((o,k)=>{ h+=`<div class="socP"><i style="background:#f2c230"></i><span>${esc2(peerName(k))}: ${esc2(R[o.r].n)} · ${fmt(o.f)} · ${o.n} os.</span><button class="btn sm" data-a="rjoin" data-p="${esc2(k)}">Dołącz</button></div>`; });
      h+=`<div class="sub">Zorganizuj własny (siedząc w aucie). Trasa i wpisowe:</div><div class="row">${R.map((r,i)=>`<button class="btn sm${RACE.sel===i?' hot':''}" data-a="rsel" data-i="${i}">${esc2(r.n)} (${(r.len/1000).toFixed(1)} km)</button>`).join('')}</div><div class="row">${RACE_FEES.map(f=>`<button class="btn sm${RACE.feeSel===f?' hot':''}" data-a="rfee" data-i="${f}">${f?fmt(f):'bez wpisowego'}</button>`).join('')}</div><div class="row"><button class="btn sm hot" data-a="rmk">Utwórz lobby wyścigu</button></div>`; }
    return h+'</div>'; }
  /* ---------- handel między graczami: oferty, blokada, podwójne potwierdzenie ---------- */
  const TR={on:false,peer:null,id:'',me:{m:0,i:{},c:0},th:{m:0,i:[],c:0,k:'',tn:[0,0]},lockMe:false,lockTh:false,confMe:false,confTh:false,rx:0,pend:null,thH:''};
  const trBox=document.createElement('div'); trBox.id='trBox'; trBox.hidden=true; document.body.appendChild(trBox);
  const trHash=o=>{ const s=JSON.stringify(o); let h=5381; for(let i=0;i<s.length;i++) h=((h*33)^s.charCodeAt(i))>>>0; return h.toString(36); };
  const trCanon=o=>({m:o.m|0,i:(o.i||[]).map(e=>[String(e[0]),e[1]|0]).sort((a,b)=>a[0]<b[0]?-1:1),c:o.c?1:0,k:o.c?String(o.k||''):''});
  function trMine(){ const i=Object.keys(TR.me.i).filter(k=>TR.me.i[k]>0).map(k=>[k,TR.me.i[k]]); return trCanon({m:TR.me.m,i,c:TR.me.c,k:OWN.car||''}); }
  function trValidMine(){ const o=trMine(); if(o.m<0||o.m>st.money) return 'Nie masz tylu pieniędzy'; for(const [k,n] of o.i){ const e=OWN.inv&&OWN.inv[k]; if(!e||e.n<n||n<1) return 'Nie masz tylu sztuk: '+k; } if(o.c&&(!OWN.car||!CARS[OWN.car])) return 'Nie masz auta do sprzedaży'; if(o.c&&st.car&&st.car.own) return 'Wysiądź z auta, które sprzedajesz'; return ''; }
  function trValidIn(){ const o=trCanon(TR.th); if(o.m<0||o.m>1e6) return 'Zła kwota'; if(o.i.length>6) return 'Za dużo przedmiotów'; for(const [k,n] of o.i){ const e=TR.thMeta&&TR.thMeta[k]; if(n<1||n>20||!e||!['hp','boost'].includes(e.t)||!(e.v>=0&&e.v<=100)) return 'Nieprawidłowy przedmiot'; } if(o.c){ if(!CARS[o.k]) return 'Nieznane auto'; if(OWN.car&&!TR.me.c) return 'Masz już auto - wystaw swoje w zamian'; } return ''; }
  function trOpen(peer,id){ Object.assign(TR,{on:true,peer,id,me:{m:0,i:{},c:0},th:{m:0,i:[],c:0,k:'',tn:[0,0]},thMeta:{},lockMe:false,lockTh:false,confMe:false,confTh:false,rx:tAll,pend:null,err:''}); keys.clear(); trBox.hidden=false; trRender(); }
  function trClose(msg){ TR.on=false; trBox.hidden=true; if(msg) toast(msg,3); }
  const trSend=(m,d)=>coSend(TR.peer,'tr',Object.assign({m,id:TR.id},d||{}));
  function trSendOff(){ const o=trMine(); const meta=o.i.map(([k,n])=>{ const e=OWN.inv[k]||{}; return [k.slice(0,40),n,e.t||'hp',e.v|0]; }); TR.lockMe=false; TR.lockTh=false; TR.confMe=false; TR.confTh=false; trSend('off',{mo:o.m,it:meta,c:o.c,k:o.k,tn:[OWN.tune.chip?1:0,OWN.tune.bak?1:0]}); }
  function trExec(){ const bad=trValidMine()||trValidIn(); if(bad){ trSend('cancel'); trClose('Handel przerwany: '+bad); return; } const me=trMine(), th=trCanon(TR.th);
    st.money-=me.m; me.i.forEach(([k,n])=>{ const e=OWN.inv[k]; e.n-=n; if(e.n<=0) delete OWN.inv[k]; });
    let gaveCar=false; if(me.c){ OWN.car=null; OWN.tune={}; gaveCar=true; }
    addMoney(th.m); th.i.forEach(([k,n])=>{ const meta=TR.thMeta[k]; if(!OWN.inv) OWN.inv={}; const e=OWN.inv[k]||(OWN.inv[k]={n:0,t:meta.t,v:meta.v}); e.n+=n; });
    if(th.c){ OWN.car=th.k; OWN.tune={chip:!!TR.th.tn[0],bak:!!TR.th.tn[1]}; } if(gaveCar||th.c){ try{ spawnOwnCar(); }catch(e){} }
    ownSave(); saveGame(); moneyEl.textContent=fmt(st.money); const nm=peerName(TR.peer); trClose(`🤝 Handel zakończony z ${esc2(nm)}`); if(AU.ctx&&AU.on) sfx.cash(); }
  function trCheckConf(){ if(TR.lockMe&&TR.lockTh&&!TR.confMe){ if(trValidMine()||trValidIn()){ TR.err=trValidMine()||trValidIn(); trRender(); return; } TR.confMe=true; trSend('conf',{h:trHash(trCanon(TR.th)),g:trHash(trMine())}); } if(TR.confMe&&TR.confTh) trExec(); }
  CO.h.tr=(d,from)=>{ const m=String(d.m||'').slice(0,6); if(m==='acc'){ if(TR.pend&&TR.pend.peer===from&&TR.pend.id===String(d.id)&&!TR.on) trOpen(from,TR.pend.id); return; }
    if(!TR.on||from!==TR.peer||String(d.id)!==TR.id) return; TR.rx=tAll;
    if(m==='cancel'){ trClose('Handel anulowany przez '+esc2(peerName(from))); return; }
    if(m==='off'){ const it=(Array.isArray(d.it)?d.it:[]).slice(0,6).filter(e=>Array.isArray(e)).map(e=>[String(e[0]).slice(0,40),e[1]|0]); TR.thMeta={}; (Array.isArray(d.it)?d.it:[]).slice(0,6).forEach(e=>{ if(Array.isArray(e)) TR.thMeta[String(e[0]).slice(0,40)]={t:String(e[2]),v:+e[3]||0}; }); TR.th={m:Math.max(0,d.mo|0),i:it,c:d.c?1:0,k:String(d.k||''),tn:Array.isArray(d.tn)?d.tn:[0,0]}; TR.lockTh=false; TR.confTh=false; TR.lockMe=false; TR.confMe=false; TR.err=''; trRender(); return; }
    if(m==='lock'){ if(String(d.h)===trHash(trCanon(TR.th))){ TR.lockTh=true; TR.err=''; trCheckConf(); trRender(); } return; }
    if(m==='unlock'){ TR.lockTh=false; TR.confTh=false; TR.confMe=false; trRender(); return; }
    if(m==='conf'){ if(TR.lockMe&&TR.lockTh&&String(d.h)===trHash(trMine())&&String(d.g)===trHash(trCanon(TR.th))){ TR.confTh=true; trCheckConf(); } return; } };
  function trRender(){ if(!TR.on) return; const nm=esc2(peerName(TR.peer)), o=trMine(), th=trCanon(TR.th);
    const invKeys=Object.keys(OWN.inv||{}); const mineHtml=`<div class="trS"><b>Twoja oferta</b><label>Pieniądze (masz ${fmt(st.money)}) <input id="trM" type="number" min="0" max="${st.money|0}" step="10" value="${o.m}" ${TR.lockMe?'disabled':''}></label>`+
      invKeys.slice(0,12).map(k=>{ const e=OWN.inv[k], n=TR.me.i[k]|0; return `<div class="trI"><span>${esc2(k)} (masz ${e.n})</span><span><button class="btn sm" data-t="dec" data-k="${esc2(k)}" ${TR.lockMe?'disabled':''}>−</button> ${n} <button class="btn sm" data-t="inc" data-k="${esc2(k)}" ${TR.lockMe?'disabled':''}>+</button></span></div>`; }).join('')+
      (OWN.car&&CARS[OWN.car]?`<label class="trI"><span>Auto: ${esc2(CARS[OWN.car].n)}</span><input type="checkbox" id="trC" ${TR.me.c?'checked':''} ${TR.lockMe?'disabled':''}></label>`:'')+
      `<div class="sub">${TR.lockMe?'✔ zatwierdziłeś':'oferta niezatwierdzona'}</div></div>`;
    const thHtml=`<div class="trS"><b>Oferta: ${nm}</b><div>${fmt(th.m)}</div>${th.i.map(([k,n])=>`<div class="trI"><span>${esc2(k)}</span><span>× ${n}</span></div>`).join('')}${th.c&&CARS[th.k]?`<div class="trI"><span>Auto: ${esc2(CARS[th.k].n)}${TR.th.tn[0]?' · chip':''}${TR.th.tn[1]?' · większy bak':''}</span></div>`:''}${!th.m&&!th.i.length&&!th.c?'<div class="sub">nic jeszcze nie oferuje</div>':''}<div class="sub">${TR.lockTh?'✔ zatwierdził ofertę':'jeszcze edytuje'}</div></div>`;
    trBox.innerHTML=`<div class="trH"><b>🤝 Handel z ${nm}</b><button class="btn sm" data-t="x">✕</button></div><div class="trC">${mineHtml}${thHtml}</div>${TR.err?`<div class="err">${esc2(TR.err)}</div>`:''}<div class="row"><button class="btn hot" data-t="lock">${TR.lockMe?'Cofnij zatwierdzenie':'Zatwierdź ofertę'}</button><button class="btn" data-t="x">Anuluj</button></div><div class="sub">${TR.lockMe&&TR.lockTh?'Obie strony zatwierdziły - finalizuję…':'Wymiana nastąpi, gdy obie strony zatwierdzą widoczne oferty. Uwaga: wymieniaj się tylko z zaufanymi graczami.'}</div>`; }
  trBox.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b||!TR.on) return; const t=b.dataset.t, k=b.dataset.k; if(t==='x'){ trSend('cancel'); trClose('Handel anulowany'); return; }
    if(t==='inc'||t==='dec'){ const e2=OWN.inv[k]; if(!e2) return; TR.me.i[k]=Math.max(0,Math.min(e2.n,(TR.me.i[k]|0)+(t==='inc'?1:-1))); trSendOff(); trRender(); return; }
    if(t==='lock'){ if(TR.lockMe){ TR.lockMe=false; TR.confMe=false; trSend('unlock'); trRender(); return; } const bad=trValidMine(); if(bad){ TR.err=bad; trRender(); return; } TR.err=''; TR.lockMe=true; trSend('lock',{h:trHash(trMine())}); trCheckConf(); trRender(); } });
  trBox.addEventListener('change',e=>{ if(!TR.on) return; if(e.target.id==='trM'){ TR.me.m=Math.max(0,Math.min(st.money|0,Math.floor(+e.target.value||0))); trSendOff(); trRender(); } else if(e.target.id==='trC'){ TR.me.c=e.target.checked?1:0; trSendOff(); trRender(); } });
  function trTick(){ if(TR.on&&(tAll-TR.rx>90||!MP.remote.has(TR.peer))){ trClose('Handel przerwany - partner nieaktywny'); } if(TR.pend&&tAll-TR.pend.t>40) TR.pend=null; }
  CO.invH.trade=(d,from,nm)=>{ const id=String(d.id||'').slice(0,8); if(!id) return; coAsk({kick:'Handel',title:nm+' proponuje wymianę',sub:'Pieniądze, przedmioty albo auto - obie strony muszą zatwierdzić ofertę',yes:'Handluj',no:'Nie teraz',ttl:30,onYes:()=>{ if(TR.on||MG.on){ toast('Skończ najpierw bieżące zajęcie',2); return; } coSend(from,'tr',{m:'acc',id}); trOpen(from,id); }}); };
  CO.actions.push({l:'handel / sprzedaż auta',fn:peer=>{ if(TR.on){ toast('Handel już trwa',2); return; } const id=Math.random().toString(36).slice(2,8); TR.pend={peer,id,t:tAll}; coSend(peer,'inv',{w:'trade',id}); toast('✉ Propozycja handlu wysłana: '+esc2(peerName(peer)),2); }});
  /* ---------- misje kooperacyjne: żniwa na dwa ciągniki i paczki na dwie ekipy ---------- */
  const CM={on:false,k:'',peer:null,id:'',host:false,t0:0,mine:0,their:0,need:0,fi:0,dwell:0,inMe:false,inTh:false,pend:null,has:false,box:document.createElement('div'),mark:new THREE.Group(),kaT:0,rx:0,fields:null,role:0};
  CM.box.id='cmBox'; CM.box.hidden=true; document.body.appendChild(CM.box); CM.mark.visible=false; scene.add(CM.mark);
  { const m=new THREE.MeshBasicMaterial({color:0x47b04b,transparent:true,opacity:.4,depthWrite:false,side:THREE.DoubleSide}); for(let i=0;i<6;i++){ const c=new THREE.Mesh(new THREE.CylinderGeometry(7,7,4,24,1,true),m); c.position.y=2+i*4; CM.mark.add(c); } }
  const CMK={harvest:{t:'Żniwa na dwa ciągniki',sub:'Obaj weźcie ciągniki i razem objedźcie 4 pola - na każdym polu bądźcie w tym samym czasie przez 8 s',rw:9000},parcels:{t:'Paczki na dwie ekipy',sub:'Każdy odbiera paczki z paczkomatu i rozwozi je do swojego punktu - razem 8 kursów',rw:7000},fire:{t:'Pożar: wóz i kierowanie ruchem',sub:'Zapraszający prowadzi wóz strażacki z remizy OSP, partner stoi na znaczniku skrzyżowania i zatrzymuje ruch. Potem razem gaście pożar na Sadowcu',rw:8000}};
  function cmFields(){ if(CM.fields) return CM.fields; const out=[]; for(const pc of PARCELS){ if(out.length>=4) break; if(pc.res||Math.abs(polyArea(pc.p))<9000) continue; const c=centroid(pc.p); if(blocked(c[0],c[1],2)||out.some(o=>Math.hypot(o[0]-c[0],o[1]-c[1])<120)) continue; out.push([c[0],c[1]]); } CM.fields=out; return out; }
  const cmMid=()=>{ const a=OSP_P, b=SAD; return [(a[0]+b[0])/2,(a[1]+b[1])/2]; };
  function cmDepot(){ const l=LOCKERS[0]; return l?[l.x,l.z]:[0,0]; }
  function cmDrops(){ const d=cmDepot(); const P=POIS.filter(p=>p.p&&isFinite(p.p[0])&&isFinite(p.p[1])).map(p=>({p:p.p,d:Math.hypot(p.p[0]-d[0],p.p[1]-d[1])})).filter(o=>o.d>250&&o.d<900).sort((a,b)=>a.d-b.d||a.p[0]-b.p[0]); if(P.length<2) return [[d[0]+300,d[1]],[d[0]-300,d[1]]]; return [P[0].p,P[Math.min(P.length-1,Math.floor(P.length/2)+1)].p]; }
  const cmSend=(m,d)=>coSend(CM.peer,'cm',Object.assign({m,id:CM.id},d||{}));
  function cmOpen(kind,id,peer,host){ Object.assign(CM,{on:true,k:kind,peer,id,host,t0:tAll,mine:0,their:0,fi:0,dwell:0,inMe:false,inTh:false,has:false,pend:null,kaT:0,rx:tAll,role:host?0:1,need:kind==='harvest'?4:8}); CM.box.hidden=false;
    const J=CMK[kind]; toast(`🤝 <b>${esc2(J.t)}</b> z ${esc2(peerName(peer))}<br>${esc2(J.sub)}`,6); if(kind==='harvest'){ const t=parked.filter(c=>c.kind==='tractor').sort((a,b)=>Math.hypot(a.x-st.x,a.z-st.z)-Math.hypot(b.x-st.x,b.z-st.z))[0]; if(t) WAYPOINT=[t.x,t.z]; } else if(kind==='fire'){ CM.ph=0; const t=parked.find(c=>c.kind==='fire'); WAYPOINT=host?(t?[t.x,t.z]:OSP_P):cmMid(); } else WAYPOINT=cmDepot(); cmRender(); }
  function cmEnd(win,txt){ if(!CM.on) return; CM.on=false; CM.box.hidden=true; CM.mark.visible=false; WAYPOINT=null; if(win){ const J=CMK[CM.k]; addMoney(J.rw); addXP(40); toast(`🤝 ${esc2(txt||'Zadanie wykonane!')} +${fmt(J.rw)}`,5); duelBanner(true,esc2(J.t)+': +'+fmt(J.rw)); if(AU.ctx&&AU.on) sfx.win(); } else toast(esc2(txt||'Misja przerwana'),4); }
  function cmTarget(){ if(CM.k==='harvest') return cmFields()[CM.fi]; if(CM.k==='parcels') return CM.has?cmDrops()[CM.role]:cmDepot(); if(CM.k==='fire') return (!CM.host||CM.ph===0)?cmMid():SAD; return null; }
  CO.h.cm=(d,from)=>{ const m=String(d.m||'').slice(0,6), id=String(d.id||'').slice(0,8);
    if(m==='acc'){ if(CM.pend&&CM.pend.peer===from&&CM.pend.id===id&&!CM.on){ const k=CM.pend.kind; cmOpen(k,id,from,true); cmSend('go',{k}); } return; }
    if(!CM.on||from!==CM.peer||id!==CM.id) return; CM.rx=tAll;
    if(m==='quit') cmEnd(false,peerName(from)+' przerwał misję');
    else if(m==='in'){ CM.inTh=!!d.v; } else if(m==='ph'){ CM.ph=d.p|0; if(CM.ph===1&&!CM.host) toast('Ruch zatrzymany - wóz przejechał. Teraz jedźcie do pożaru!',3); }
    else if(m==='adv'){ CM.fi=d.f|0; CM.dwell=0; CM.inTh=false; toast(`Pole ${CM.fi}/4 zaliczone`,2); if(CM.fi>=4) cmEnd(true,'Żniwa skończone!'); else { const f=cmFields()[CM.fi]; if(f) WAYPOINT=[f[0],f[1]]; } }
    else if(m==='trip'){ CM.their=Math.max(CM.their,d.n|0); if(CM.mine+CM.their>=CM.need) cmEnd(true,'Wszystkie paczki rozwiezione!'); }
    else if(m==='win') cmEnd(true,'Zadanie wykonane!'); cmRender(); };
  function cmTick(dt){ if(CM.on){ if(!MP.remote.has(CM.peer)||tAll-CM.rx>20){ cmEnd(false,'Partner opuścił misję'); return; } if(tAll-CM.t0>600){ cmSend('quit'); cmEnd(false,'Czas minął (10 min)'); return; }
      CM.kaT-=dt; const x=st.car?st.car.x:st.x, z=st.car?st.car.z:st.z; const T=cmTarget();
      if(T){ CM.mark.visible=true; CM.mark.position.set(T[0],H(T[0],T[1]),T[1]); CM.mark.rotation.y=tAll*.5; }
      if(CM.k==='harvest'&&T){ const inn=!!(st.car&&st.car.kind==='tractor'&&Math.hypot(T[0]-x,T[1]-z)<32); if(inn!==CM.inMe||CM.kaT<=0){ CM.inMe=inn; CM.kaT=2; cmSend('in',{v:inn?1:0}); }
        if(CM.host){ if(CM.inMe&&CM.inTh){ CM.dwell+=dt; if(CM.dwell>=8){ CM.fi++; CM.dwell=0; CM.inTh=false; cmSend('adv',{f:CM.fi}); toast(`Pole ${CM.fi}/4 zaliczone`,2); if(CM.fi>=4) cmEnd(true,'Żniwa skończone!'); else { const f=cmFields()[CM.fi]; if(f) WAYPOINT=[f[0],f[1]]; } } } else CM.dwell=Math.max(0,CM.dwell-dt*2); } }
      else if(CM.k==='fire'){ const M=cmMid(), rem=MP.remote.get(CM.peer);
        if(CM.host){ const dM=Math.hypot(M[0]-x,M[1]-z); const ctl=rem&&Math.hypot(rem.x-M[0],rem.z-M[1])<10;
          if(CM.ph===0){ if(dM<32&&!ctl&&st.car){ st.car.v*=.88; if(tAll-(CM.wt||-9)>3){ CM.wt=tAll; toast('🚦 Skrzyżowanie nie jest zablokowane - czekaj na partnera!',2); } } if(dM<22&&ctl){ CM.ph=1; cmSend('ph',{p:1}); toast('Ruch zatrzymany - jedź do pożaru!',3); WAYPOINT=SAD.slice(); } }
          else { if(st.car&&st.car.kind==='fire'&&Math.hypot(SAD[0]-x,SAD[1]-z)<28){ CM.dwell+=dt; if(CM.dwell>=10){ cmSend('win'); cmEnd(true,'Pożar ugaszony!'); } } else CM.dwell=Math.max(0,CM.dwell-dt*2); } }
        else if(CM.kaT<=0){ CM.kaT=3; cmSend('in',{v:Math.hypot(M[0]-x,M[1]-z)<10?1:0}); } }
      else if(CM.k==='parcels'&&T){ if(Math.hypot(T[0]-x,T[1]-z)<9){ if(!CM.has){ CM.has=true; toast('📦 Paczki załadowane - jedź do swojego punktu',2.5); WAYPOINT=cmDrops()[CM.role]; } else { CM.has=false; CM.mine++; cmSend('trip',{n:CM.mine}); toast(`📦 Dowieziono (${CM.mine+CM.their}/${CM.need})`,2); WAYPOINT=cmDepot(); if(CM.mine+CM.their>=CM.need){ cmSend('win'); cmEnd(true,'Wszystkie paczki rozwiezione!'); } } } else if(CM.kaT<=0){ CM.kaT=3; cmSend('in',{v:0}); } }
      if(Math.floor(tAll*4)!==CM.rt){ CM.rt=Math.floor(tAll*4); cmRender(); } } }
  function cmRender(){ if(!CM.on) return; const J=CMK[CM.k]; const left=Math.max(0,600-(tAll-CM.t0)|0); let st2=''; if(CM.k==='harvest') st2=`Pole ${Math.min(CM.fi+1,4)}/4 · ty ${CM.inMe?'✔ na polu':'✘ poza polem'} · ${esc2(peerName(CM.peer))} ${CM.inTh?'✔':'✘'}${CM.host&&CM.inMe&&CM.inTh?` · ${(8-CM.dwell).toFixed(0)} s`:''}`; else if(CM.k==='fire') st2=CM.host?(CM.ph===0?'Jedź wozem do skrzyżowania - partner musi stać na znaczniku':`Gaś pożar: ${Math.max(0,10-CM.dwell).toFixed(0)} s w zasięgu`):'Stój na znaczniku skrzyżowania i zatrzymaj ruch, aż wóz przejedzie'; else st2=`Dowiezione ${CM.mine+CM.their}/${CM.need} (ty ${CM.mine}, ${esc2(peerName(CM.peer))} ${CM.their}) · ${CM.has?'wieziesz paczki':'jedź po paczki'}`;
    CM.box.innerHTML=`<b>🤝 ${esc2(J.t)}</b><div class="sub">${st2}</div><div class="sub">zostało ${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}</div><div class="row"><button class="btn" data-c="q">Przerwij</button></div>`; }
  CM.box.addEventListener('click',e=>{ if(e.target.closest('[data-c=q]')){ cmSend('quit'); cmEnd(false,'Misja przerwana'); } });
  CO.invH.cm=(d,from,nm)=>{ const k=String(d.kind||''), id=String(d.id||'').slice(0,8); const J=CMK[k]; if(!J||!id) return; coAsk({kick:'Misja kooperacyjna',title:nm+' zaprasza: '+J.t,sub:J.sub+' · nagroda '+fmt(J.rw)+' dla każdego',yes:'Dołącz',no:'Nie teraz',ttl:35,onYes:()=>{ if(CM.on||MG.on||TR.on){ toast('Skończ najpierw bieżące zajęcie',2); return; } coSend(from,'cm',{m:'acc',id}); cmOpen(k,id,from,false); }}); };
  ['harvest','parcels','fire'].forEach(k=>CO.actions.push({l:'misja: '+CMK[k].t.toLowerCase(),fn:peer=>{ if(CM.on){ toast('Misja kooperacyjna już trwa',2); return; } const id=Math.random().toString(36).slice(2,8); CM.pend={peer,id,kind:k,t:tAll}; coSend(peer,'inv',{w:'cm',kind:k,id}); toast('✉ Zaproszenie do misji wysłane: '+esc2(peerName(peer)),2); }}));
  /* ---------- wspólny dom i garaż (konto): skarbiec i miejsca na auta dla kilku kont, dane trzyma serwer ---------- */
  const HM={d:null,inv:[],err:'',busy:false,t:0};
  async function homeCall(op,extra){ if(!ACC.tok) return null; if(HM.busy) return null; HM.busy=true; const j=await accCall('home',Object.assign({tok:ACC.tok,op},extra||{})); HM.busy=false; if(j.error){ HM.err=j.error; if(CO.open) renderSoc(); return null; } HM.err=''; HM.d=j.home||null; HM.inv=j.inv||[]; HM.t=tAll; if(CO.open) renderSoc(); return j; }
  function homeSocHtml(){ let h='<div class="socS"><b>Wspólny dom i garaż</b>';
    if(!ACC.tok){ return h+'<div class="sub">Zaloguj się na konto (Menu → Konto), żeby założyć wspólny dom z innymi graczami.</div></div>'; }
    if(HM.err) h+=`<div class="sub" style="color:#e07a6a">${esc2(HM.err)}</div>`;
    const d=HM.d; if(!d){ h+='<div class="sub">Nie masz wspólnego domu. Skarbiec i garaż (4 auta) dzielisz z lokatorami.</div>'+HM.inv.map(o=>`<div class="socP"><span>Zaproszenie od <b>${esc2(o)}</b></span><button class="btn sm" data-a="hjoin" data-o="${esc2(o)}">Dołącz</button></div>`).join('')+'<div class="row"><button class="btn sm hot" data-a="hnew">Załóż wspólny dom</button></div>'; return h+'</div>'; }
    const own=d.owner===d.me; h+=`<div class="sub">Właściciel: <b>${esc2(d.owner)}</b> · lokatorzy: ${d.members.map(esc2).join(', ')}</div>`;
    h+=`<div class="socP"><span>Skarbiec: <b>${fmt(d.money)}</b></span></div><div class="row"><input id="hmAmt" type="number" min="1" step="100" placeholder="kwota" style="width:90px"><button class="btn sm" data-a="hput">Wpłać</button><button class="btn sm" data-a="htake">Wypłać</button></div>`;
    h+=`<div class="sub">Garaż (${d.cars.length}/4):</div>`+(d.cars.length?d.cars.map(c=>`<div class="socP"><span>${esc2((CARS[c]||{}).n||c)}</span><button class="btn sm" data-a="htakecar" data-c="${esc2(c)}" ${OWN.car?'disabled title="Najpierw odstaw swoje auto"':''}>Weź</button></div>`).join(''):'<div class="sub">pusto</div>');
    if(OWN.car&&CARS[OWN.car]) h+=`<div class="row"><button class="btn sm" data-a="hputcar">Odstaw moje auto (${esc2(CARS[OWN.car].n)})</button></div>`;
    if(own){ h+='<div class="row"><input id="hmWho" maxlength="20" placeholder="nazwa konta lokatora" style="width:150px"><button class="btn sm" data-a="hinv">Zaproś</button></div>'; d.members.filter(m=>m!==d.me).forEach(m=>{ h+=`<div class="socP"><span>${esc2(m)}</span><button class="btn sm" data-a="hkick" data-w="${esc2(m)}">Usuń</button></div>`; }); }
    h+='<div class="row"><button class="btn sm" data-a="hleave">'+(own?'Zamknij dom':'Wyprowadź się')+'</button></div>';
    if(d.log&&d.log.length) h+='<div class="sub">'+d.log.slice(0,5).map(l=>esc2(l.x)).join('<br>')+'</div>';
    return h+'</div>'; }
  async function homeAct(a,b){ const amt=Math.floor(+(document.getElementById('hmAmt')||{}).value||0);
    if(a==='hnew') await homeCall('create'); else if(a==='hjoin') await homeCall('join',{owner:b.dataset.o}); else if(a==='hleave'){ const j=await homeCall('leave'); if(j) toast('Opuszczono wspólny dom',2); }
    else if(a==='hinv'){ const j=await homeCall('invite',{who:(document.getElementById('hmWho')||{}).value||''}); if(j) toast('Zaproszenie wysłane - lokator musi mieć konto i otworzyć ten panel',3); } else if(a==='hkick') await homeCall('kick',{who:b.dataset.w});
    else if(a==='hput'){ if(amt<1||amt>st.money){ HM.err='Nie masz tyle pieniędzy'; renderSoc(); return; } const j=await homeCall('put',{n:amt}); if(j){ addMoney(-amt); saveGame(); toast('Wpłacono do skarbca: '+fmt(amt),2); } }
    else if(a==='htake'){ if(amt<1){ HM.err='Podaj kwotę'; renderSoc(); return; } const j=await homeCall('take',{n:amt}); if(j){ addMoney(amt); saveGame(); toast('Wypłacono ze skarbca: '+fmt(amt),2); } }
    else if(a==='hputcar'){ if(!OWN.car) return; if(st.car&&st.car.own){ HM.err='Wysiądź z auta'; renderSoc(); return; } const k=OWN.car; const j=await homeCall('putcar',{car:k}); if(j){ OWN.car=null; OWN.tune={}; ownSave(); try{ spawnOwnCar(); }catch(e){} saveGame(); toast('Auto odstawione do wspólnego garażu',2.5); } }
    else if(a==='htakecar'){ if(OWN.car){ HM.err='Najpierw odstaw swoje auto'; renderSoc(); return; } const k=b.dataset.c; const j=await homeCall('takecar',{car:k}); if(j){ OWN.car=k; OWN.tune={}; ownSave(); try{ spawnOwnCar(); }catch(e){} saveGame(); toast('Auto ze wspólnego garażu czeka na Twoim parkingu',3); } } }
  /* ---------- czat głosowy (WebRTC peer-to-peer): serwer przekazuje tylko sygnalizację, dźwięk idzie bezpośrednio między graczami ---------- */
  const VC={on:false,mic:null,track:null,ptt:true,mode:'ptt',lvl:0,hold:0,talk:false,pcs:new Map(),muted:new Set(),back:new Map(),err:'',t:0,box:document.createElement('div'),vol:1,held:false};
  VC.box.id='vcBox'; VC.box.hidden=true; document.body.appendChild(VC.box);
  const VC_ICE=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
  const VC_NEAR=70, VC_FAR=110;
  const vcOk=()=>!!(window.RTCPeerConnection&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
  async function vcEnable(){ if(VC.on) return; if(!vcOk()){ VC.err='Ta przeglądarka nie obsługuje czatu głosowego'; renderSoc(); return; } if(!MP.room||!MP.room.connected()){ VC.err='Czat głosowy działa w trybie wieloosobowym'; renderSoc(); return; }
    VC.err=''; try{ VC.mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false}); VC.track=VC.mic.getAudioTracks()[0]; VC.track.enabled=false; try{ const AC=window.AudioContext||window.webkitAudioContext; VC.ac=new AC(); VC.an=VC.ac.createAnalyser(); VC.an.fftSize=512; VC.clone=VC.track.clone(); VC.ac.createMediaStreamSource(new MediaStream([VC.clone])).connect(VC.an); VC.buf=new Uint8Array(VC.an.fftSize); VC.ac.resume&&VC.ac.resume(); }catch(e2){ VC.an=null; } }catch(e){ VC.mic=null; VC.track=null; VC.err='Brak dostępu do mikrofonu (zezwól w przeglądarce) - będziesz tylko słuchać'; }
    VC.on=true; MP.last=''; toast(VC.track?`🎤 Czat głosowy włączony - mów przytrzymując <b>V</b>`:'🔈 Czat głosowy: tylko słuchasz',3.5); vcRender(); renderSoc(); }
  function vcDisable(){ for(const p of [...VC.pcs.keys()]) vcClose(p,true); if(VC.mic) VC.mic.getTracks().forEach(t=>t.stop()); if(VC.clone) VC.clone.stop(); try{ VC.ac&&VC.ac.close(); }catch(e){} VC.ac=null; VC.an=null; VC.clone=null; VC.lvl=0; VC.hold=0; VC.mic=null; VC.track=null; VC.on=false; VC.talk=false; MP.last=''; vcRender(); renderSoc(); }
  function vcClose(p,say){ const c=VC.pcs.get(p); if(!c) return; VC.pcs.delete(p); try{ c.pc.close(); }catch(e){} if(c.au){ try{ c.au.pause(); c.au.srcObject=null; }catch(e){} } if(say) coSend(p,'vc',{m:'bye'}); }
  function vcIce(pc){ return new Promise(res=>{ if(pc.iceGatheringState==='complete') return res(); const to=setTimeout(res,3500); pc.addEventListener('icegatheringstatechange',()=>{ if(pc.iceGatheringState==='complete'){ clearTimeout(to); res(); } }); }); }
  function vcMake(p){ const pc=new RTCPeerConnection({iceServers:VC_ICE}); const c={pc,au:null,t0:tAll}; VC.pcs.set(p,c);
    pc.ontrack=e=>{ if(!c.au){ c.au=new Audio(); c.au.autoplay=true; } c.au.srcObject=e.streams[0]||new MediaStream([e.track]); c.au.play().catch(()=>{}); };
    pc.onconnectionstatechange=()=>{ if(['failed','closed','disconnected'].includes(pc.connectionState)&&VC.pcs.get(p)===c){ vcClose(p); VC.back.set(p,tAll+(pc.connectionState==='failed'?45:10)); } };
    if(VC.track) pc.addTrack(VC.track,VC.mic); else pc.addTransceiver('audio',{direction:'recvonly'}); return c; }
  async function vcCall(p){ try{ const c=vcMake(p); const o=await c.pc.createOffer(); await c.pc.setLocalDescription(o); await vcIce(c.pc); if(VC.pcs.get(p)!==c) return; coSend(p,'vc',{m:'off',s:c.pc.localDescription.sdp}); }catch(e){ vcClose(p); VC.back.set(p,tAll+30); } }
  async function vcAnswer(p,sdp){ try{ vcClose(p); const c=vcMake(p); await c.pc.setRemoteDescription({type:'offer',sdp}); const a=await c.pc.createAnswer(); await c.pc.setLocalDescription(a); await vcIce(c.pc); if(VC.pcs.get(p)!==c) return; coSend(p,'vc',{m:'ans',s:c.pc.localDescription.sdp}); }catch(e){ vcClose(p); VC.back.set(p,tAll+30); } }
  CO.h.vc=(d,from)=>{ if(!VC.on) return; const r=MP.remote.get(from); if(!r||VC.muted.has(from)) return; const m=String(d.m||''), sdp=typeof d.s==='string'?d.s.slice(0,7000):'';
    if(m==='off'&&sdp.startsWith('v=0')) vcAnswer(from,sdp); else if(m==='ans'&&sdp.startsWith('v=0')){ const c=VC.pcs.get(from); if(c&&c.pc.signalingState==='have-local-offer') c.pc.setRemoteDescription({type:'answer',sdp}).catch(()=>vcClose(from)); } else if(m==='bye') vcClose(from); };
  addEventListener('keydown',e=>{ if(e.key&&e.key.toLowerCase()==='v'&&!e.repeat&&!(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'))&&!e.ctrlKey&&!e.metaKey&&!e.altKey){ VC.held=true; } });
  addEventListener('keyup',e=>{ if(e.key&&e.key.toLowerCase()==='v') VC.held=false; }); addEventListener('blur',()=>{ VC.held=false; });
  function vcTick(dt){ if(!VC.on){ return; } VC.t-=dt;
    if(VC.an){ VC.an.getByteTimeDomainData(VC.buf); let s=0; for(let i=0;i<VC.buf.length;i++){ const v=(VC.buf[i]-128)/128; s+=v*v; } const rms=Math.sqrt(s/VC.buf.length); VC.lvl=Math.max(rms*4,VC.lvl-dt*2); if(rms>.02) VC.hold=.7; else VC.hold=Math.max(0,VC.hold-dt); } else VC.hold=0;
    const talk=!!VC.track&&(VC.mode==='ptt'?VC.held:VC.mode==='vad'?VC.hold>0:!VC.mute); if(talk!==VC.talk){ VC.talk=talk; if(VC.track) VC.track.enabled=talk; MP.last=''; vcRender(); }
    const me=MP.room&&MP.room.me?MP.room.me():''; const mx=st.car?st.car.x:st.x, mz=st.car?st.car.z:st.z;
    MP.remote.forEach((r,p)=>{ const c=VC.pcs.get(p); const d=Math.hypot(r.x-mx,r.z-mz); const want=r.vo&&!VC.muted.has(p)&&d<VC_NEAR;
      if(c){ if(!r.vo||VC.muted.has(p)||d>VC_FAR) vcClose(p,true); else if(c.au){ c.au.volume=clamp((1-Math.max(0,d-6)/(VC_FAR-6))*VC.vol,0,1); } if(c&&VC.pcs.get(p)===c&&tAll-c.t0>25&&c.pc.connectionState!=='connected'){ vcClose(p); VC.back.set(p,tAll+60); } }
      else if(want&&me&&me<p&&tAll>(VC.back.get(p)||0)&&VC.pcs.size<8){ VC.back.set(p,tAll+5); vcCall(p); } });
    for(const p of [...VC.pcs.keys()]) if(!MP.remote.has(p)) vcClose(p);
    if(VC.t<=0){ VC.t=.12; vcRender(); } }
  function vcRender(){ { const bm=document.getElementById('bMic'); if(bm){ bm.className='btn ic'+(VC.on?(VC.talk?' talk':' on'):' off'); bm.title=VC.on?'Wyłącz czat głosowy (mówisz: przytrzymaj V)':'Włącz mikrofon (czat głosowy)'; } } const b=VC.box; if(!VC.on){ b.hidden=true; return; } b.hidden=false; const sp=[]; MP.remote.forEach((r,p)=>{ if(r.sp&&r.vo&&VC.pcs.has(p)&&!VC.muted.has(p)) sp.push(esc2(r.name||'Gracz')); });
    const conn=[...VC.pcs.values()].filter(c=>c.pc.connectionState==='connected').length;
    b.innerHTML=`<div class="me ${VC.talk?'on':''}">${VC.track?(VC.talk?'🎤 Mówisz':(VC.mode==='ptt'?'🎤 Wyciszony - przytrzymaj V':VC.mode==='vad'?'🎤 Czekam na głos…':'🔇 Wyciszony')):'🔈 Tylko słuchasz'}</div>${VC.track&&VC.an?`<div class="mt"><i style="width:${Math.round(Math.min(1,VC.lvl)*100)}%"></i></div>`:''}${sp.length?`<div class="sp">🔊 ${sp.join(', ')}</div>`:''}<div class="sub">połączeni: ${conn}</div>`; }
  function vcSocHtml(){ let h='<div class="socS"><b>Czat głosowy</b>'; if(!vcOk()) return h+'<div class="sub">Ta przeglądarka nie obsługuje czatu głosowego.</div></div>';
    if(VC.err) h+=`<div class="sub" style="color:#e0a46a">${esc2(VC.err)}</div>`;
    if(!VC.on) return h+'<div class="sub">Rozmowa idzie bezpośrednio między graczami (nie jest nagrywana ani zapisywana). Słyszysz graczy w pobliżu, im dalej, tym ciszej. Gracze, z którymi się łączysz, widzą Twój adres IP.</div><div class="row"><button class="btn sm hot" data-a="vcon">Włącz czat głosowy</button></div></div>';
    h+=`<div class="row"><button class="btn sm" data-a="vcptt">${VC.mode==='ptt'?'Tryb: push-to-talk (V)':VC.mode==='vad'?'Tryb: wykrywanie głosu':'Tryb: otwarty mikrofon'}</button>${VC.mode==='open'&&VC.track?`<button class="btn sm" data-a="vcmute">${VC.mute?'Włącz mikrofon':'Wycisz mikrofon'}</button>`:''}<button class="btn sm" data-a="vcvol">Głośność ${Math.round(VC.vol*100)}%</button></div>`;
    const rows=[]; MP.remote.forEach((r,p)=>{ if(r.vo||VC.muted.has(p)) rows.push(`<div class="socP"><span>${esc2(r.name||'Gracz')}${VC.pcs.has(p)&&VC.pcs.get(p).pc.connectionState==='connected'?' · połączony':''}</span><button class="btn sm" data-a="vcmu" data-p="${esc2(p)}">${VC.muted.has(p)?'Włącz dźwięk':'Wycisz'}</button></div>`); });
    h+=rows.length?rows.join(''):'<div class="sub">Nikt w pokoju nie ma włączonego czatu głosowego.</div>'; h+='<div class="row"><button class="btn sm" data-a="vcoff">Wyłącz czat głosowy</button></div></div>'; return h; }
  function vcAct(a,p){ if(a==='vcon') vcEnable(); else if(a==='vcoff') vcDisable(); else if(a==='vcptt'){ VC.mode=VC.mode==='ptt'?'vad':VC.mode==='vad'?'open':'ptt'; VC.ptt=VC.mode==='ptt'; VC.mute=false; renderSoc(); } else if(a==='vcmute'){ VC.mute=!VC.mute; renderSoc(); } else if(a==='vcvol'){ VC.vol=VC.vol>=1?.25:VC.vol+.25; renderSoc(); } else if(a==='vcmu'){ if(VC.muted.has(p)) VC.muted.delete(p); else { VC.muted.add(p); vcClose(p,true); } renderSoc(); } }
  const MP_ENABLED=false; if(MP_ENABLED) mpInit();

  /* ---------- zwierzęta: psy na podwórkach, koty, kury, krowy na pastwiskach, sarny przy lesie ---------- */
  const animalMat=new THREE.MeshLambertMaterial({vertexColors:true});
  function makeAnimal(type){ const g=new THREE.Group(); const P=[]; const legs=[]; let legGeo, body;
    const add=(geo,c,x,y,z)=>P.push([geo.clone().translate(x,y,z),c]);
    if(type==='dog'||type==='cat'){ const k=type==='dog'?1:.6, col=type==='dog'?pick([0x6b4a2a,0x2a2420,0xc8a070,0xe8e2d6,0x8a6a4a]):pick([0x2a2a2a,0xd0802a,0x9a9a9a,0xf0ece4]);
      add(new THREE.BoxGeometry(.75*k,.3*k,.28*k),col,0,.5*k,0); add(new THREE.BoxGeometry(.28*k,.26*k,.24*k),col,.46*k,.66*k,0); add(new THREE.BoxGeometry(.14*k,.1*k,.14*k),type==='dog'?0x1a1a1a:col,.62*k,.62*k,0);
      if(type==='cat'){ add(new THREE.ConeGeometry(.05,.1,4),col,.46*k,.83*k,.07); add(new THREE.ConeGeometry(.05,.1,4),col,.46*k,.83*k,-.07); add(new THREE.BoxGeometry(.4,.05,.05),col,-.55*k,.62*k,0); }
      else { add(new THREE.BoxGeometry(.08,.14,.06),col,.42*k,.82*k,.1); add(new THREE.BoxGeometry(.08,.14,.06),col,.42*k,.82*k,-.1); add(new THREE.BoxGeometry(.3,.06,.06),col,-.48*k,.68*k,0); }
      legGeo=[new THREE.BoxGeometry(.08*k,.38*k,.08*k).translate(0,-.19*k,0),col]; [[.28,.12],[.28,-.12],[-.28,.12],[-.28,-.12]].forEach(([x,z])=>legs.push([x*k,.4*k,z*k])); }
    else if(type==='chicken'){ const col=pick([0xf4f2ec,0xb8642a,0x2a2420]); add(new THREE.SphereGeometry(.16,8,6).scale(1.3,1,1),col,0,.3,0); add(new THREE.SphereGeometry(.08,8,6),col,.17,.45,0); add(new THREE.BoxGeometry(.06,.07,.03),0xd02020,.18,.55,0); add(new THREE.ConeGeometry(.025,.07,4).rotateZ(-Math.PI/2),0xe0a020,.27,.45,0);
      legGeo=[new THREE.BoxGeometry(.025,.16,.025).translate(0,-.08,0),0xe0a020]; legs.push([0,.17,.05],[0,.17,-.05]); }
    else if(type==='cow'){ const spots=rnd()<.6; add(new THREE.BoxGeometry(1.9,.85,.75),spots?0xf2f0ea:0x6b4a2a,0,1.25,0); if(spots){ add(new THREE.BoxGeometry(.6,.5,.77),0x1a1a1a,-.3,1.35,0); add(new THREE.BoxGeometry(.4,.4,.77),0x1a1a1a,.5,1.2,0); }
      add(new THREE.BoxGeometry(.5,.45,.42),spots?0xf2f0ea:0x6b4a2a,1.15,1.45,0); add(new THREE.BoxGeometry(.18,.22,.36),0xd8a090,1.42,1.32,0); add(new THREE.BoxGeometry(.06,.12,.06),0xe8e2d0,1.05,1.75,.15); add(new THREE.BoxGeometry(.06,.12,.06),0xe8e2d0,1.05,1.75,-.15);
      legGeo=[new THREE.BoxGeometry(.16,.85,.16).translate(0,-.42,0),spots?0xf2f0ea:0x6b4a2a]; [[.7,.25],[.7,-.25],[-.7,.25],[-.7,-.25]].forEach(([x,z])=>legs.push([x,.85,z])); }
    else { // sarna
      add(new THREE.BoxGeometry(1.1,.45,.38),0x9a6a3a,0,.95,0); add(new THREE.BoxGeometry(.22,.5,.2),0x9a6a3a,.5,1.25,0); add(new THREE.BoxGeometry(.3,.2,.2),0x8a5a30,.65,1.5,0); add(new THREE.BoxGeometry(.15,.15,.36),0xf2ece0,-.56,1.0,0);
      legGeo=[new THREE.BoxGeometry(.08,.75,.08).translate(0,-.37,0),0x8a5a30]; [[.4,.13],[.4,-.13],[-.4,.13],[-.4,-.13]].forEach(([x,z])=>legs.push([x,.75,z])); }
    body=new THREE.Mesh(mergeParts(P),animalMat); body.castShadow=true; g.add(body);
    const lg=mergeParts([legGeo]); g.userData.legs=legs.map(([x,y,z])=>{ const m=new THREE.Mesh(lg,animalMat); m.position.set(x,y,z); g.add(m); return m; }); return g; }
  const ANIMALS=[];
  function spawnAnimal(type,x,z,home,rad,speed){ if(blocked(x,z,.4))return; const g=makeAnimal(type); scene.add(g); ANIMALS.push({type,g,x,z,h:R(0,6.28),tx:x,tz:z,home,rad,speed,walk:0,wait:R(0,4),poly:null}); }
  { const resP=PARCELS.filter(p=>p.res); for(let i=0;i<22&&resP.length;i++){ const pc=resP[Math.floor(rnd()*resP.length)]; const c=centroid(pc.p); for(let t=0;t<10;t++){ const x=c[0]+R(-12,12), z=c[1]+R(-12,12); if(inPoly(x,z,pc.p)&&!blocked(x,z,.5)){ spawnAnimal('dog',x,z,c,10,1.8); ANIMALS[ANIMALS.length-1].poly=pc.p; break; } } }
    for(let i=0;i<14;i++){ const h=pick(houses.filter(h=>h.kind==='house')); const x=h.x+R(-10,10), z=h.z+R(-10,10); spawnAnimal('cat',x,z,[x,z],22,1.1); }
    houses.filter(h=>h.kind==='out'||h.kind==='farm').slice(0,400).filter((_,i)=>i%9===0).slice(0,12).forEach(h=>{ for(let k=0;k<4;k++) spawnAnimal('chicken',h.x+R(-7,7)+h.w,h.z+R(-7,7),[h.x+h.w,h.z],6,.6); });
    houses.filter(h=>h.kind==='farm').filter((_,i)=>i%5===0).slice(0,5).forEach(h=>{ for(let t=0;t<20;t++){ const a=R(0,6.28), d=R(30,60); const x=h.x+Math.cos(a)*d, z=h.z+Math.sin(a)*d; if(!blocked(x,z,2)&&!roadNearF(x,z,6)){ for(let k=0;k<3;k++) spawnAnimal('cow',x+R(-6,6),z+R(-6,6),[x,z],18,.5); break; } } });
    AREAS.filter(a=>a.t==='nat:wood').slice(0,6).forEach(a=>{ const p=a.pts[Math.floor(rnd()*a.pts.length)], c=centroid(a.pts); const x=p[0]+(p[0]-c[0])*.04, z=p[1]+(p[1]-c[1])*.04; if(x>X0&&x<X1&&z>Z0&&z<Z1){ spawnAnimal('deer',x,z,[x,z],30,1.4); spawnAnimal('deer',x+3,z+2,[x,z],30,1.4); } }); }
  function animalsUpdate(dt){ const px=st.car?st.car.x:st.x, pz=st.car?st.car.z:st.z;
    ANIMALS.forEach(a=>{ const d2=Math.hypot(a.x-px,a.z-pz); a.g.visible=d2<260; if(d2>260)return;
      if(a.type==='deer'&&d2<25){ a.tx=a.x+(a.x-px); a.tz=a.z+(a.z-pz); a.wait=0; a.run=1; }
      if(a.wait>0){ a.wait-=dt; if(a.wait<=0){ for(let t=0;t<6;t++){ const ang=R(0,6.28), r=R(2,a.rad); const x=a.home[0]+Math.cos(ang)*r, z=a.home[1]+Math.sin(ang)*r; if(!a.poly||inPoly(x,z,a.poly)){ a.tx=x; a.tz=z; break; } } } }
      else { const dx=a.tx-a.x, dz=a.tz-a.z, l=Math.hypot(dx,dz); if(l<.3){ a.wait=R(1.5,6); a.run=0; } else { const sp=a.speed*(a.run?2.5:1); const nx=a.x+dx/l*sp*dt, nz=a.z+dz/l*sp*dt; if(blocked(nx,nz,.25)||(a.poly&&!inPoly(nx,nz,a.poly))){ a.wait=R(.5,2); } else { a.x=nx; a.z=nz; a.walk+=dt*sp*6; } let dh=Math.atan2(-dz,dx)-a.h; dh=Math.atan2(Math.sin(dh),Math.cos(dh)); a.h+=dh*Math.min(1,dt*6); } }
      a.g.position.set(a.x,H(a.x,a.z),a.z); a.g.rotation.y=a.h; const sw=a.wait>0?0:Math.sin(a.walk)*.5; a.g.userData.legs.forEach((m,i)=>m.rotation.z=(i%2?sw:-sw)*(i<2?1:-1));
      if(a.type==='dog'&&d2<9&&!st.car&&rnd()<dt*.5&&AU.ctx&&AU.on) sfx.dog(); }); }

  /* ---------- park: ekipa z piwem na ławce ---------- */
  const PARK_GUYS=[];
  { const pc=centroid(PARK.pts); let spot=null; for(let t=0;t<200&&!spot;t++){ const x=pc[0]+R(-25,25), z=pc[1]+R(-25,25); if(!inPoly(x,z,PARK.pts))continue; let ok=true; for(let u=-2;u<=2&&ok;u+=1)for(let v=-1.5;v<=1.5&&ok;v+=1.5){ if(blocked(x+u,z+v,.3)) ok=false; } if(ok) spot=[x,z]; }
    if(spot){ const [x,z]=spot, y=H(x,z), ry=R(0,6.28); const g=new THREE.Group(); g.position.set(x,y,z); g.rotation.y=ry; scene.add(g); const wd=new THREE.MeshLambertMaterial({color:0x2f6a3a}), dk=new THREE.MeshLambertMaterial({color:0x2b2d30});
      bx(g,2.6,.07,.5,0,.45,0,wd); bx(g,2.6,.45,.06,0,.5,-.24,wd); [-1.1,1.1].forEach(o=>bx(g,.08,.45,.45,o,0,0,dk)); addSolid({x,z,hw:1.4,hd:.4,c:Math.cos(-ry),s:Math.sin(-ry),r:1.6});
      const lines=['Zdrowie!','No to siup.','Panie, kiedyś to było…','Jeszcze po jednym?','Widziałeś nowy orlik?','Na Wydrzynów dziś domówka.','Lewiatan do 22?'];
      [-.8,0,.8].forEach((o,i)=>{ const p=makePerson(pick(PCOL),pick([0x2c3e66,0x2a2a2c,0x5a4a3a]),pick([0x2a1d14,0x4a2e1a,0x8a8a8a]),{female:i===1&&rnd()<.4}); p.position.set(o,.05,.05); g.add(p); const u=p.userData;
        u.lL.rotation.x=-1.45; u.lR.rotation.x=-1.45; u.kL.rotation.x=1.45; u.kR.rotation.x=1.45; p.position.y=-.38;
        const bottle=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.22,8),new THREE.MeshLambertMaterial({color:0x5a3a14})); bottle.position.set(0,-.3,.05); (i%2?u.eL:u.eR).add(bottle);
        PARK_GUYS.push({p,u,arm:i%2?u.aL:u.aR,t:R(0,8),bub:null,bubT:0,lines}); });
      PARK_GUYS.anchor=[x,z]; } }
  function parkGuysUpdate(dt){ if(!PARK_GUYS.length)return; const d=Math.hypot(PARK_GUYS.anchor[0]-st.x,PARK_GUYS.anchor[1]-st.z); if(d>120)return;
    PARK_GUYS.forEach((g,i)=>{ g.t+=dt; const sip=(g.t%7)<1.4; g.arm.rotation.x+=((sip?-2.2:-.6)-g.arm.rotation.x)*Math.min(1,dt*4); g.u.eL.rotation.x=g.u.eR.rotation.x=-.9;
      g.bubT-=dt; if(g.bubT<=0&&d<35&&rnd()<dt*.25){ if(g.bub) g.p.remove(g.bub); const t=tagTex(pick(g.lines),'#fff',true); g.bub=sprite(t,2.6,.8); g.bub.position.set(0,2.2,0); g.p.add(g.bub); g.bubT=4; } if(g.bub&&g.bubT<=0){ g.p.remove(g.bub); g.bub=null; } }); }

  /* ---------- wnętrze Lewiatana: regały, lodówki, kasy z kasjerkami, kolejka, klienci ---------- */
  // ---------- Lewiatan od środka: duży market (30 × 22 m) jak typowy Lewiatan - jasny, biało-zielony, owoce przy wejściu, stoisko z wędlinami, nabiał w lodówkach, trzy kasy ----------
  const IN={x:2900,z:600,y:150,W:30,D:22,built:false,g:null,npc:[],box:[],ret:null,CZ:.4};
  const IN_DOOR=[-11.5,10.0], IN_CASH=[-2.9,7.1], IN_KASY=[-6,-2,2];
  const IN_SHOP={n:'Lewiatan',get p(){ return [IN.x+IN_CASH[0],IN.z+IN_CASH[1]]; },get items(){ return SHOPS[0].items; }};
  const inBlocked=(x,z,r)=>{ r=r||.35; const lx=x-IN.x, lz=z-IN.z; if(lx<-IN.W/2+r||lx>IN.W/2-r||lz<-IN.D/2+r||lz>IN.D/2-r) return true; return IN.box.some(b=>lx>b[0]-r&&lx<b[2]+r&&lz>b[1]-r&&lz<b[3]+r); };
  function shelfTex(kind){ return tex(512,256,(c,w,h)=>{ c.fillStyle=kind==='fridge'?'#dfe9ee':'#f2f0ea'; c.fillRect(0,0,w,h); const rows=kind==='fridge'?5:4, rh=h/rows;
      const PAL=kind==='drink'?['#c81e1e','#1e5cc8','#f0b400','#2a8a3a','#ff7a00','#7a1e8a','#e8e8e8']:kind==='fridge'?['#ffffff','#2f6fd0','#f4d23a','#e23a3a','#59b04a','#f7f2e0']:kind==='chem'?['#2f8de4','#f2f2f2','#e86aa0','#59b04a','#7a3aa8','#f2c230']:['#d8452a','#f2c230','#3a7bd5','#5aa34a','#8a5a2b','#e86aa0','#f5f5f0','#2a2a2a','#ff8c1a'];
      for(let r=0;r<rows;r++){ const y0=r*rh; c.fillStyle=kind==='fridge'?'#b9c6cc':'#9aa0a6'; c.fillRect(0,y0+rh-7,w,7); c.fillStyle='#1d7a3a'; c.fillRect(0,y0+rh-7,w,2);
        let x=3; while(x<w-6){ const pw=kind==='drink'?10+Math.random()*6:12+Math.random()*22, ph=(kind==='drink'?.78:.45+Math.random()*.4)*(rh-10); const col=PAL[Math.floor(Math.random()*PAL.length)]; const n=1+Math.floor(Math.random()*4);
          for(let k=0;k<n&&x<w-6;k++){ if(kind==='drink'){ c.fillStyle=col; c.fillRect(x+2,y0+rh-7-ph,pw-4,ph); c.fillRect(x+pw/2-2,y0+rh-7-ph-8,4,8); c.fillStyle='rgba(255,255,255,.7)'; c.fillRect(x+2,y0+rh-7-ph*.6,pw-4,ph*.22); }
            else { c.fillStyle=col; c.fillRect(x,y0+rh-7-ph,pw-1,ph); c.fillStyle='rgba(255,255,255,.55)'; c.fillRect(x+2,y0+rh-7-ph*.7,pw-5,ph*.25); c.fillStyle='rgba(0,0,0,.18)'; c.fillRect(x+pw-3,y0+rh-7-ph,2,ph); }
            x+=pw; } x+=2; }
        c.fillStyle='#ffd23a'; for(let k=0;k<4;k++){ const px=20+k*125; c.fillRect(px,y0+rh-6,26,5); } } }); }
  const IN_TALK=[]; // rozmowni klienci i personel w sklepie (Pani Stasia przy kasie 1 i kasjerka)
  function buildInterior(){ if(IN.built)return; IN.built=true; const g=new THREE.Group(); g.position.set(IN.x,IN.y,IN.z); scene.add(g); IN.g=g; const W=IN.W, D=IN.D, HT=3.8;
    const tile=tex(256,256,(c,w,h)=>{ c.fillStyle='#d6d3cc'; c.fillRect(0,0,w,h); c.fillStyle='#cfccc4'; c.fillRect(0,0,w/2,h/2); c.fillRect(w/2,h/2,w/2,h/2); c.strokeStyle='rgba(0,0,0,.10)'; c.lineWidth=2; c.strokeRect(0,0,w,h); c.beginPath(); c.moveTo(w/2,0); c.lineTo(w/2,h); c.moveTo(0,h/2); c.lineTo(w,h/2); c.stroke(); }); tile.repeat.set(W/1.2,D/1.2);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(W,D).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({map:tile,emissive:0x262624})); floor.receiveShadow=true; g.add(floor);
    const wallM=new THREE.MeshLambertMaterial({color:0xf0efe9,emissive:0x2e2e2c,side:THREE.DoubleSide}), green=new THREE.MeshLambertMaterial({color:0x1d7a3a,emissive:0x06200e}), yellow=new THREE.MeshLambertMaterial({color:0xffd23a,emissive:0x302400}), steel=new THREE.MeshLambertMaterial({color:0xb8bcc0}), dark=new THREE.MeshLambertMaterial({color:0x2c2f33}), wood=new THREE.MeshLambertMaterial({color:0x9a6a3e}), white=new THREE.MeshLambertMaterial({color:0xf4f4f2,emissive:0x262626});
    const ceil=new THREE.Mesh(new THREE.BoxGeometry(W+1,.3,D+1),new THREE.MeshLambertMaterial({color:0xe6e6e2,emissive:0x4a4a48})); ceil.position.y=HT+.15; g.add(ceil);
    [[0,-D/2,W,0],[0,D/2,W,Math.PI],[-W/2,0,D,Math.PI/2],[W/2,0,D,-Math.PI/2]].forEach(([x,z,l,r])=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(l,HT),wallM); m.position.set(x,HT/2,z); m.rotation.y=r; m.receiveShadow=true; g.add(m);
      const s=new THREE.Mesh(new THREE.PlaneGeometry(l,.4),green); s.position.set(x*.999,HT-.45,z*.999); s.rotation.y=r; g.add(s); const s2=new THREE.Mesh(new THREE.PlaneGeometry(l,.12),yellow); s2.position.set(x*.998,HT-.72,z*.998); s2.rotation.y=r; g.add(s2); });
    // jasne panele świetlne w suficie
    const lp=new THREE.MeshBasicMaterial({color:0xfdfcf4}); for(let x=-12;x<=12;x+=4) for(let z=-8;z<=8;z+=4){ const m=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2).rotateX(Math.PI/2),lp); m.position.set(x,HT-.01,z); g.add(m); }
    const logo=tex(512,128,(c,w,h)=>{ c.fillStyle='#1d7a3a'; c.fillRect(0,0,w,h); c.fillStyle='#ffd23a'; c.beginPath(); c.arc(64,64,40,0,7); c.fill(); c.fillStyle='#1d7a3a'; c.font='800 52px Barlow, Arial'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('L',64,66); c.fillStyle='#fff'; c.textAlign='left'; c.font='800 70px Barlow, Arial'; c.fillText('Lewiatan',120,68); });
    pl(g,7,1.75,6,2.55,-D/2+.03,new THREE.MeshBasicMaterial({map:logo}));
    const box=(x0,z0,x1,z1)=>IN.box.push([x0,z0,x1,z1]);
    const sign=(t,bg,fg)=>tex(512,128,(c,w,h)=>{ c.fillStyle=bg||'#1d7a3a'; c.fillRect(0,0,w,h); c.fillStyle=fg||'#fff'; c.font='800 60px Barlow, Arial'; c.textAlign='center'; c.textBaseline='middle'; c.fillText(t,w/2,h/2+4); });
    const hang=(t,x,z,ry,bg,fg)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(2.2,.55),new THREE.MeshBasicMaterial({map:sign(t,bg,fg),side:THREE.DoubleSide})); m.position.set(x,HT-.9,z); m.rotation.y=ry||0; g.add(m); [-.9,.9].forEach(o=>{ const w=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.62,4),steel); w.position.set(x+Math.cos(ry||0)*o,HT-.31,z-Math.sin(ry||0)*o); g.add(w); }); };
    // wejście: przesuwne drzwi, okna z widokiem na parking
    const glass=new THREE.MeshPhongMaterial({color:0x9fc3d0,transparent:true,opacity:.35,shininess:120,side:THREE.DoubleSide}); const outside=tex(256,128,(c,w,h)=>{ const gr=c.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#a9cbe6'); gr.addColorStop(.6,'#e8eef0'); gr.addColorStop(.62,'#6b6d70'); gr.addColorStop(1,'#56585b'); c.fillStyle=gr; c.fillRect(0,0,w,h); c.fillStyle='#3f6b3a'; c.fillRect(0,h*.45,w,h*.16); });
    pl(g,2.6,2.4,IN_DOOR[0],1.2,D/2-.03,new THREE.MeshBasicMaterial({map:outside}),Math.PI); IN.doorL=bx(g,1.3,2.4,.06,IN_DOOR[0]-.65,0,D/2-.1,glass,true); IN.doorR=bx(g,1.3,2.4,.06,IN_DOOR[0]+.65,0,D/2-.1,glass,true);
    pl(g,1.6,.4,IN_DOOR[0],2.75,D/2-.05,new THREE.MeshBasicMaterial({map:sign('WYJŚCIE')}),Math.PI);
    [-6,-1,4,9,13].forEach(x=>pl(g,3.6,1.7,x,1.65,D/2-.03,new THREE.MeshBasicMaterial({map:outside}),Math.PI));
    const promo=new THREE.MeshBasicMaterial({map:tex(256,256,(c,w,h)=>{ c.fillStyle='#ffd23a'; c.fillRect(0,0,w,h); c.fillStyle='#c4221e'; c.font='800 60px Barlow, Arial'; c.textAlign='center'; c.fillText('PROMOCJA',w/2,90); c.fillStyle='#111'; c.font='800 96px Barlow, Arial'; c.fillText('-30%',w/2,200); })});
    [[-14.95,4,Math.PI/2],[14.95,4.5,-Math.PI/2],[6.5,10.94,Math.PI]].forEach(([x,z,r])=>pl(g,1.2,1.2,x,1.9,z,promo,r));
    // 6 rzędów regałów (gondole z Blendera) z wiszącymi tabliczkami działów
    const TS={dry:shelfTex('dry'),drink:shelfTex('drink'),chem:shelfTex('chem')};
    const ROWS=[[-10.5,'PIECZYWO',2],[-5,'SŁODYCZE',3],[-1.5,'MAKARONY I KASZE',3],[2,'NAPOJE',3],[5.5,'KONSERWY',3],[9,'CHEMIA',3]];
    ROWS.forEach(([x,t,n])=>{ for(let k=0;k<n;k++){ const m=modelClone('gondola'); if(m){ m.position.set(x,0,-2.6-k*2.167); m.rotation.y=Math.PI/2; m.scale.set(1.083,1.05,1); g.add(m); } }
      const cap=new THREE.Mesh(new THREE.PlaneGeometry(1,.3),green); cap.position.set(x,2.0,-1.48); g.add(cap); bx(g,1,.06,.06,x,1.82,-1.5,green,true); box(x-.5,-2.6-(n-1)*2.167-1.1,x+.5,-1.5); hang(t,x,-4.8,Math.PI/2); });
    // lodówki z nabiałem przy tylnej ścianie i z napojami po prawej
    const glassF=new THREE.MeshPhongMaterial({color:0xcfe6f0,transparent:true,opacity:.16,shininess:140,specular:0xffffff});
    const fridge=(x,z,ry)=>{ const m=modelClone('lodowka'); if(!m)return; m.position.set(x,0,z); m.rotation.y=ry; m.material=m.material.clone(); m.material.emissive=new THREE.Color(0x3a3f44); m.material.emissiveMap=m.material.map; g.add(m); const gp=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.75),glassF); gp.position.set(0,1.05,.62); m.add(gp); };
    for(let x=-6;x<13.6;x+=1.25) fridge(x+.62,-D/2,0); box(-6.2,-D/2,W/2,-D/2+.95); hang('NABIAŁ',3,-9.6,0); hang('MROŻONKI',10,-9.6,0);
    for(let i=0;i<8;i++) fridge(W/2,-9+.62+i*1.25,-Math.PI/2); box(W/2-.95,-9.2,W/2,1.3); hang('NAPOJE ZIMNE',13.9,-4,-Math.PI/2);
    // stoisko z wędlinami, mięsem i serami (lewy tylny róg): lada chłodnicza z szybą, ekspedientka
    { const cx=-11, L=7; bx(g,L,.95,.9,cx,0,-8.2,white); const cg=new THREE.Mesh(new THREE.BoxGeometry(L,.45,.7),glassF); cg.position.set(cx,1.18,-8.25); g.add(cg); bx(g,L,.05,.95,cx,.95,-8.2,steel,true);
      const meat=['#c86a5a','#e8b0a0','#d88a6a','#f2d8a8','#e8c070','#a84a3a']; for(let k=0;k<12;k++){ const m=new THREE.Mesh(new THREE.BoxGeometry(.45,.12,.3),new THREE.MeshLambertMaterial({color:meat[k%6],emissive:0x201010})); m.position.set(cx-L/2+.4+k*.55,1.02,-8.25); g.add(m); }
      bx(g,L,2.0,.6,cx,0,-10.65,wood); const p=new THREE.Mesh(new THREE.PlaneGeometry(L-.2,1.6),new THREE.MeshLambertMaterial({map:shelfTex('dry'),emissive:0x202020})); p.position.set(cx,1.1,-10.33); g.add(p);
      pl(g,4.4,.55,cx,2.85,-D/2+.04,new THREE.MeshBasicMaterial({map:sign('WĘDLINY · MIĘSO · SERY','#8a1c1c')})); box(cx-L/2-.2,-D/2,cx+L/2+.2,-7.7); }
    // pieczywo i alkohol przy lewej ścianie
    bx(g,.7,1.8,4.2,-W/2+.36,0,-4.0,wood); { const br=tex(256,128,(c,w,h)=>{ c.fillStyle='#6a4426'; c.fillRect(0,0,w,h); for(let r=0;r<4;r++)for(let i=0;i<9;i++){ c.fillStyle=['#c8893e','#a8642a','#e0b070','#8a4a1e'][(i+r)%4]; c.beginPath(); c.ellipse(16+i*28,18+r*31,12,9,0,0,7); c.fill(); } }); const p=new THREE.Mesh(new THREE.PlaneGeometry(4.1,1.6),new THREE.MeshLambertMaterial({map:br,emissive:0x201008})); p.position.set(-W/2+.72,.9,-4.0); p.rotation.y=Math.PI/2; g.add(p); } box(-W/2,-6.2,-W/2+.75,-1.9);
    for(let i=0;i<3;i++){ const m=modelClone('regal_alk'); if(m){ m.position.set(-W/2,0,-.6+.62+i*1.27); m.rotation.y=Math.PI/2; g.add(m); } } box(-W/2,-.7,-W/2+.55,3.3); hang('ALKOHOLE',-13.9,1.3,Math.PI/2,'#141414','#d4b04a');
    // warzywa i owoce w skrzynkach (przy wejściu, po prawej) i paleta z promocją
    { const cols=[0xd8261e,0xf2c230,0x5aa34a,0xff8c1a,0x7a2a6a,0xe8d84a,0x8ab04a,0xc85a2a,0xf2e2a0]; for(let i=0;i<9;i++){ const x=7.8+(i%3)*1.15, z=2.3+Math.floor(i/3)*1.2; const cr=new THREE.Mesh(new THREE.BoxGeometry(1.05,.55,1.1),wood); cr.position.set(x,.55,z); cr.rotation.x=-.18; g.add(cr);
        const fr=new THREE.Mesh(new THREE.SphereGeometry(.42,10,6).scale(1.1,.35,1.2),new THREE.MeshLambertMaterial({color:cols[i],emissive:0x101010})); fr.position.set(x,.88,z); g.add(fr); } bx(g,3.6,.3,3.8,9,0,3.5,wood); box(7,1.5,11,5.5); hang('WARZYWA I OWOCE',9,3.5,0,'#2f7a3a'); }
    { bx(g,1.2,.15,1.0,-13.6,0,6.5,wood); for(let k=0;k<4;k++) bx(g,1.1,.25,.9,-13.6,.15+k*.25,6.5,new THREE.MeshLambertMaterial({color:[0xc4221e,0xf2c230,0xc4221e,0x2f6fd0][k]})); pl(g,.9,.6,-13.6,1.55,6.0,promo); box(-14.3,5.9,-12.9,7.1); }
    // kasy (3) z taśmą, terminalem i półką z gumami; za kasami regał z papierosami
    const belt=new THREE.MeshLambertMaterial({color:0x1e2022}); IN_KASY.forEach((x,i)=>{ bx(g,.8,.9,3.3,x,0,7.0,new THREE.MeshLambertMaterial({color:0x3a5a48})); bx(g,.62,.03,2.4,x,.9,6.5,belt,true); bx(g,.5,.25,.35,x+.1,.9,8.1,dark);
      const scr=new THREE.Mesh(new THREE.BoxGeometry(.05,.3,.4),dark); scr.position.set(x+.25,1.35,8.0); g.add(scr); const ch=new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.06,14),dark); ch.position.set(x+.95,.52,7.7); g.add(ch); bx(g,.05,.5,.05,x+.95,0,7.7,steel,true);
      bx(g,.2,1.0,.5,x-.55,0,8.45,new THREE.MeshLambertMaterial({color:0xf2c230})); const s=new THREE.Mesh(new THREE.PlaneGeometry(.9,.45),new THREE.MeshBasicMaterial({map:sign('KASA '+(i+1)),side:THREE.DoubleSide})); s.position.set(x+.4,2.3,6.2); g.add(s); bx(g,.03,1.0,.03,x+.4,2.52,6.2,steel,true);
      box(x-.42,5.3,x+1.3,8.7); });
    { bx(g,7.5,2.2,.45,-2,0,10.5,dark); const ps=new THREE.Mesh(new THREE.PlaneGeometry(7.2,1.6),new THREE.MeshLambertMaterial({map:shelfTex('drink'),emissive:0x202020})); ps.position.set(-2,1.25,10.26); ps.rotation.y=Math.PI; g.add(ps); box(-5.8,10.25,1.8,D/2); }
    // koszyki i wózki przy wejściu
    for(let i=0;i<5;i++){ const k=new THREE.Mesh(new THREE.BoxGeometry(.5,.28,.36),new THREE.MeshLambertMaterial({color:0xc4221e})); k.position.set(-9.4,.14+i*.16,9.9); g.add(k); }
    for(let i=0;i<3;i++){ const c=new THREE.Group(); c.position.set(-13.8,0,8.6+i*.35); g.add(c); bx(c,.55,.45,.8,0,.5,0,steel); [[-.22,-.3],[.22,-.3],[-.22,.3],[.22,.3]].forEach(([a,b])=>{ const w=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.05,8).rotateZ(Math.PI/2),dark); w.position.set(a,.06,b); c.add(w); }); } box(-14.2,8.2,-13.4,9.6);
    g.traverse(o=>{ if(o.isMesh&&o.geometry.type==='BoxGeometry'){ o.castShadow=true; o.receiveShadow=true; } });
    // personel i klienci
    const mk=(fem,top,bot,hair,o)=>{ const p=makePerson(top,bot,hair,Object.assign({female:fem},o||{})); g.add(p); return p; };
    const UNI=0x1d7a3a;
    IN_KASY.forEach((x,i)=>{ const p=mk(true,UNI,0x22252a,[0x4a2e1a,0xb08a50,0x2a1d14][i],{style:'tee',hairStyle:['bob','pony','short'][i]}); p.position.set(x+.95,-.38,7.7); p.rotation.y=-Math.PI/2; const u=p.userData; u.lL.rotation.x=u.lR.rotation.x=-1.45; u.kL.rotation.x=u.kR.rotation.x=1.45;
      IN.npc.push({p,role:i===0?'talk':'cash',t:R(0,3),u}); if(i===0) IN_TALK.push({id:'grazyna',name:'Pani Grażyna',title:'kasjerka w Lewiatanie',p,x:IN.x+x+.95,z:IN.z+7.7}); });
    { const p=mk(true,0x7a5a8a,0x3a3a40,0xd8d8d8,{style:'coat',hairStyle:'bob',skin:0xf0d2ba}); const bag=new THREE.Mesh(new THREE.BoxGeometry(.32,.36,.14),new THREE.MeshLambertMaterial({color:0x2f6b2f})); bag.position.set(0,-.4,.08); p.userData.eL.add(bag);
      p.position.set(IN_KASY[0]-.75,0,6.6); p.rotation.y=Math.PI/2; IN.npc.push({p,role:'talk',t:1.3,u:p.userData}); IN_TALK.push({id:'stasia',name:'Pani Stasia',title:'stała klientka Lewiatana',p,x:IN.x+IN_KASY[0]-.75,z:IN.z+6.6}); box(IN_KASY[0]-1.05,6.3,IN_KASY[0]-.45,6.9); }
    { const p=mk(true,UNI,0x22252a,0x6b4426,{style:'tee',hairStyle:'pony'}); p.position.set(-3.25,0,-5); p.rotation.y=-Math.PI/2; IN.npc.push({p,role:'stock',t:0,u:p.userData,x:-3.25,z:-5}); }
    { const p=mk(true,0xf2f2f2,0x22252a,0x8a4a2a,{style:'tee',hairStyle:'bob'}); p.position.set(-11,0,-9.6); IN.npc.push({p,role:'clerk',t:0,u:p.userData}); }
    const AISLE=[-12.75,-7.75,-3.25,.25,3.75,7.25,10.75], QX=[IN_KASY[1]-.85,IN_KASY[2]-.85], QZ=[7.6,6.5,5.4];
    IN.Q=[[null,null,null],[null,null,null]];
    const cust=(x,z)=>{ const fem=rnd()<.55; const p=mk(fem,pick(PCOL),pick([0x2c3e66,0x2a2a2c,0x5a4a3a,0x6a6a6a,0x1e2a44]),pick([0x2a1d14,0x4a2e1a,0x6b4426,0xb08a50,0x8a8a8a,0xd2b27a])); p.position.set(x,0,z);
      const bk=new THREE.Mesh(new THREE.BoxGeometry(.42,.24,.3),new THREE.MeshLambertMaterial({color:0xc4221e})); bk.position.set(0,-.42,.08); p.userData.eR.add(bk); return {p,role:'cust',st:'wander',path:[],wait:R(0,3),walk:R(0,6),u:p.userData}; };
    const N=IN.npc; for(let q=0;q<2;q++) for(let s=0;s<2;s++){ const c=cust(QX[q],QZ[s]); c.st='queue'; c.q=q; c.s=s; IN.Q[q][s]=c; c.p.rotation.y=0; c.pay=s===0?R(4,9):0; N.push(c); }
    for(let i=0;i<8;i++){ const c=cust(pick(AISLE),R(-7,-2)); N.push(c); }
    IN.AISLE=AISLE; IN.QX=QX; IN.QZ=QZ;
    // dymki rozmowy Pani Stasi z kasjerką
    IN.bub=[0,1].map(()=>{ const c=document.createElement('canvas'); c.width=512; c.height=128; const t=new THREE.CanvasTexture(c); const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true})); sp.scale.set(2.6,.65,1); sp.renderOrder=6; sp.visible=false; g.add(sp); return {c,t,sp}; });
    IN.bubT=0; IN.bubI=0;
    g.visible=false; }
  const IN_CHAT=[['s','Pani Grażynko, a te pomidory to po ile dzisiaj?'],['g','Po dziewięć dziewięćdziesiąt, pani Stasiu. Drożeje wszystko.'],['s','Ojej, za moich czasów to za tyle był cały koszyk!'],['g','A wnuczek przyjechał na weekend?'],['s','Przyjechał, chudy jak patyk. Muszę mu pierogów narobić.'],['g','To mąka jest w promocji, trzeci regał.'],['s','A słyszała pani, że w parku nowe ławki stawiają?'],['g','Sołtys mówił, że na wiosnę. Zobaczymy.'],['s','A ten deszcz to ma padać do niedzieli?'],['g','W telewizji mówili, że od jutra słońce.'],['s','To dobrze, bo pranie mam do wywieszenia.'],['g','Pani Stasiu, reszta: dwa złote i dziesięć groszy.']];
  function bubbleDraw(b,txt){ const x=b.c.getContext('2d'), w=b.c.width, h=b.c.height; x.clearRect(0,0,w,h); x.font='600 26px Barlow, Arial'; const words=txt.split(' '); const lines=['']; words.forEach(wd=>{ const t=(lines[lines.length-1]+' '+wd).trim(); if(x.measureText(t).width>w-40) lines.push(wd); else lines[lines.length-1]=t; });
    x.fillStyle='rgba(255,255,255,.94)'; x.strokeStyle='rgba(0,0,0,.35)'; x.lineWidth=3; const bh=Math.min(h-14,lines.length*30+16); x.beginPath(); x.roundRect?x.roundRect(4,4,w-8,bh,14):x.rect(4,4,w-8,bh); x.fill(); x.stroke(); x.fillStyle='#1a1a1a'; lines.slice(0,3).forEach((l,i)=>x.fillText(l,20,34+i*30)); b.t.needsUpdate=true; }
  function inRoute(c,tx,tz){ const p=c.p.position, CZ=IN.CZ; const ax=IN.AISLE.reduce((a,b)=>Math.abs(b-p.x)<Math.abs(a-p.x)?b:a); const path=[];
    if(p.z<CZ)path.push([ax,CZ]); else path.push([p.x,Math.min(p.z,CZ)]); if(tz<CZ){ const bxA=IN.AISLE.reduce((a,b)=>Math.abs(b-tx)<Math.abs(a-tx)?b:a); path.push([bxA,CZ],[bxA,tz]); } else path.push([tx,CZ],[tx,tz]); c.path=path; }
  function interiorUpdate(dt){ if(!IN.built||!st.inside||CUR!==IN)return; const Q=IN.Q;
    // drzwi automatyczne
    { const d=Math.hypot(st.x-IN.x-IN_DOOR[0],st.z-IN.z-IN_DOOR[1]); const o=d<2.6?1:0; IN.dOpen=(IN.dOpen||0)+(o-(IN.dOpen||0))*Math.min(1,dt*5); IN.doorL.position.x=IN_DOOR[0]-.65-IN.dOpen*1.2; IN.doorR.position.x=IN_DOOR[0]+.65+IN.dOpen*1.2; }
    // rozmowa przy kasie 1 (dymki), gdy gracz jest w pobliżu i nie rozmawia z nimi
    { const near=Math.hypot(st.x-(IN.x+IN_KASY[0]),st.z-(IN.z+6.8))<10&&!NPC_OPEN; IN.bubT-=dt; if(near&&IN.bubT<=0){ IN.bubT=4.2; const [who,t]=IN_CHAT[IN.bubI%IN_CHAT.length]; IN.bubI++; const b=IN.bub[who==='s'?0:1], o=IN.bub[who==='s'?1:0]; bubbleDraw(b,t); b.sp.visible=true; o.sp.visible=false; b.sp.position.set(who==='s'?IN_KASY[0]-.75:IN_KASY[0]+.95,2.45,who==='s'?6.6:7.7); } if(!near) IN.bub.forEach(b=>b.sp.visible=false); }
    IN.npc.forEach(c=>{ c.t=(c.t||0)+dt; const u=c.u;
      if(c.role==='cash'){ u.aR.rotation.x=-1.0+Math.sin(c.t*3.2)*.45; u.aL.rotation.x=-.7; u.eR.rotation.x=u.eL.rotation.x=-.8; c.p.rotation.y=-Math.PI/2+Math.sin(c.t*.7)*.25; return; }
      if(c.role==='talk'){ u.aR.rotation.x=-.4+Math.sin(c.t*2.1)*.35; u.eR.rotation.x=-.6+Math.sin(c.t*1.7)*.3; u.aL.rotation.x=-.2; if(u.head) u.head.rotation.y=Math.sin(c.t*.9)*.25; return; }
      if(c.role==='clerk'){ u.aR.rotation.x=-.9+Math.sin(c.t*1.6)*.4; u.eR.rotation.x=-.9; u.aL.rotation.x=-.6; return; }
      if(c.role==='stock'){ const k=(c.t%8)/8; u.aR.rotation.x=-1.6+Math.sin(c.t*2)*.4; u.aL.rotation.x=-1.2; c.p.position.y=k<.5?-.25:0; if(c.t%16<.02){ c.z=R(-7,-2); } c.p.position.z+=(c.z-c.p.position.z)*Math.min(1,dt); animPerson(c.p,c.t*2,0); return; }
      const p=c.p.position;
      if(c.st==='queue'){ const slot=[IN.QX[c.q],IN.QZ[c.s]]; const dx=slot[0]-p.x, dz=slot[1]-p.z, l=Math.hypot(dx,dz);
        if(l>.05){ const v=Math.min(l,dt*1.1); p.x+=dx/l*v; p.z+=dz/l*v; c.p.rotation.y=Math.atan2(dx,dz); c.walk+=dt*3.4; animPerson(c.p,c.walk,1); } else { animPerson(c.p,0,0); c.p.rotation.y=c.s===0?Math.PI/2:0; }
        if(c.s===0&&l<.1){ c.pay-=dt; u.aR.rotation.x=-.9+Math.sin(c.t*4)*.3; if(c.pay<=0){ Q[c.q][0]=null; c.st='leave'; c.path=[[p.x,9.4],[IN_DOOR[0],9.4],[IN_DOOR[0],10.4]]; for(let s=1;s<3;s++){ const n=Q[c.q][s]; if(n){ Q[c.q][s-1]=n; Q[c.q][s]=null; n.s=s-1; if(s-1===0) n.pay=R(6,11); } } } }
        return; }
      if(c.path.length){ const [tx,tz]=c.path[0]; const dx=tx-p.x, dz=tz-p.z, l=Math.hypot(dx,dz); if(l<.08){ c.path.shift(); } else { const v=Math.min(l,dt*1.15); p.x+=dx/l*v; p.z+=dz/l*v; let dr=Math.atan2(dx,dz)-c.p.rotation.y; dr=Math.atan2(Math.sin(dr),Math.cos(dr)); c.p.rotation.y+=dr*Math.min(1,dt*8); c.walk+=dt*3.4; animPerson(c.p,c.walk,1); }
        if(!c.path.length){ if(c.st==='leave'){ c.st='wander'; p.x=pick(IN.AISLE); p.z=R(-7,-2); c.wait=R(1,4); } else if(c.st==='toQueue'){ c.st='queue'; } else { c.wait=R(2,6); c.p.rotation.y=rnd()<.5?Math.PI/2:-Math.PI/2; } } return; }
      animPerson(c.p,0,0); c.wait-=dt; if(c.wait<=0){ if(rnd()<.35){ for(let q=0;q<2;q++){ const s=Q[q].indexOf(null); if(s>=0&&(s===0||Q[q][s-1])){ Q[q][s]=c; c.q=q; c.s=s; if(s===0)c.pay=R(6,11); c.st='toQueue'; c.path=[[p.z<IN.CZ?IN.AISLE.reduce((a,b)=>Math.abs(b-p.x)<Math.abs(a-p.x)?b:a):p.x,IN.CZ],[IN.QX[q],IN.CZ],[IN.QX[q],IN.QZ[s]]]; return; } } }
        inRoute(c,pick(IN.AISLE),R(-7,-2)); } });
    // światło w sklepie (używa puli latarni)
    lampPool.forEach((l,i)=>{ if(i<6){ l.position.set(IN.x-10+(i%3)*10,IN.y+3.4,IN.z-5+Math.floor(i/3)*9); l.intensity=.8; l.distance=19; l.color.set(0xffffff); } else l.intensity=0; });
    if(typeof PARTS!=='undefined') PARTS.visible=false; }
  let fadeEl=document.getElementById('fade');
  function fadeTo(cb){ if(!fadeEl){ cb(); return; } fadeEl.classList.add('on'); setTimeout(()=>{ cb(); setTimeout(()=>fadeEl.classList.remove('on'),60); },260); }
  // modele wnętrz są doczytywane osobno (models_in.js) - przy wejściu czekamy na nie chwilę
  const ROOM_NEEDS={church:['kosciol_in'],pharm:['regal'],zabka:['lada_zabka','lodowka','gondola'],lew:['gondola','lodowka','regal_alk']};
  let MODELS_SKIP=false; const modelsOk=l=>!l||l.every(n=>typeof MODELS!=='undefined'&&MODELS[n]); let WAITING=false;
  function waitModels(l,cb){ if(WAITING)return; WAITING=true; toast('Wczytywanie wnętrza…',2); let t=0; const iv=setInterval(()=>{ t+=250; if(modelsOk(l)||t>15000){ clearInterval(iv); WAITING=false; cb(); } },250); }
  function enterStore(){ if(st.car||st.inside)return; if(!modelsOk(ROOM_NEEDS.lew)&&!IN.built&&!MODELS_SKIP){ waitModels(ROOM_NEEDS.lew,()=>{ MODELS_SKIP=true; enterStore(); MODELS_SKIP=false; }); return; } IN.lastSwap=tAll; if(st.wanted>0){ toast('Policja Cię ściga - nie wejdziesz teraz do sklepu',2.5); return; }
    fadeTo(()=>{ buildInterior(); const f=B_LEW.front, o=B_LEW.doorOut||[f.x+f.nx*3.2,f.z+f.nz*3.2]; IN.ret={x:o[0],z:o[1],yaw:Math.atan2(-f.nx,-f.nz),face:Math.atan2(f.nx,f.nz)}; st.inside=true; IN.g.visible=true; IN.worldPos=SHOPS[0].p; CUR=IN;
      st.x=IN.x+IN_DOOR[0]; st.z=IN.z+IN.D/2-2.4; st.gy=0; st.jy=0; st.vx=st.vz=0; st.yaw=0; st.face=Math.PI; st.pitch=.22; st.dist=Math.min(st.dist,3.4); st.distS=st.dist; if(st.mode===2) st.mode=0; locMain.textContent='Lewiatan'; locSub.textContent='Sklep · ul. Szkolna'; locEl.classList.add('on'); locTimer=3; }); }
  function exitStore(){ if(!st.inside)return; IN.lastSwap=tAll; fadeTo(()=>{ st.inside=false; IN.g.visible=false; const r=IN.ret||{x:SHOPS[0].p[0],z:SHOPS[0].p[1],yaw:0,face:0}; st.x=r.x; st.z=r.z; if(blocked(st.x,st.z,.45)){ const q=walkSpot([st.x,st.z],false); st.x=q[0]; st.z=q[1]; } st.yaw=r.yaw; st.face=r.face; st.vx=st.vz=0; if(SHOP_OPEN) closeShop(); }); }
  // drzwi automatyczne: wystarczy podejść do drzwi (ważne na telefonie)
  const bActEl=document.getElementById('bAct'); let lastAct='';
  const bRadioEl=document.getElementById('bRadio');
  function actLabel(){ let t=''; if(SHOP_OPEN) t='Zamknij'; else if(st.car&&nearPump()) t='Tankuj'; else { const sd=nearStoreDoor(); if(sd==='out') t='Wyjdź'; else if(sd==='in') t='Wejdź'; else if(!st.inside&&nearGate()) t=nearGate().open?'Zamknij':'Otwórz'; else if(nearNPCthing()) t=nearNPCthing().npc?'Rozmowa':'Weź'; else if(BUSR.on) t=BUS.wait>0?'Wysiądź':'W autobusie'; else if(nearBusBoard()) t='Wsiądź do autobusu'; else if(nearMission()) t='Misja'; else if(ACTIVE&&ACTIVE.mRetry&&ACTIVE.mIn) t='Jeszcze raz'; else if(nearMini()) t='Zagraj'; else if(!st.car&&nearShop()) t='Kasa'; else if(st.car) t='Wysiądź'; else if(!st.inside&&nearestParked()) t='Wsiądź'; }
    if(t!==lastAct){ lastAct=t; bActEl.textContent=t; bActEl.classList.toggle('show',!!t); bActEl.classList.toggle('hot',!!t&&t!=='Wysiądź'); }
    bRadioEl.classList.toggle('show',!!st.car&&st.car.kind!=='bike'); }
  function storeDoorAuto(){ if(st.car||st.dead||GAME.paused||SHOP_OPEN||tAll-(IN.lastSwap||-9)<2.5) return; const v=Math.hypot(st.vx||0,st.vz||0); if(v<.8) return;
    if(st.inside){ const d=CUR.doorW; if(!d)return; if(Math.abs(st.x-d[0])<1.3&&st.z>d[1]-.6&&(st.vz||0)>.6) exitRoom(); return; }
    for(const e of ENTS){ const f=e.f, n=e.n; if(!f||!n)continue; if(Math.hypot(f[0]-st.x,f[1]-st.z)<1.9&&-(st.vx*n[0]+st.vz*n[1])>.6){ e.enter(); return; } } }
  function inCam(){ const C=CUR, p=camera.position; const lx=clamp(p.x-C.x,-C.W/2+.3,C.W/2-.3), lz=clamp(p.z-C.z,-C.D/2+.3,C.D/2-.3); const L1=C.levels&&(st.gy||0)>1.8, y0=C.y+(L1?SCH_F:0), y1=C.levels?(L1?C.y+C.HT:C.y+SCH_F-.3):C.y+(C.HT||3.6); p.set(C.x+lx,clamp(p.y,y0+.6,y1-.25),C.z+lz); if(st.mode!==1) camera.lookAt(st.x,CUR.y+(st.gy||0)+1.4,st.z); sky.position.copy(p); }

  /* ---------- przejazd kolejowy: sygnalizacja, dzwonek, rogatki i korek na DK42 ---------- */
  const CRS={phase:'idle',t:0,clear:0,bell:0,armA:-1.45}; let CROSS_D=null;
  if(CROSS.length){ let bd=1e9; const c0=CROSS[0]; for(let d=0;d<DK.L;d+=2){ const s=sampleLine(DK.pts,DK.len,d); const q=Math.hypot(s.x-(CROSS[0].x+CROSS[1].x)/2,s.z-(CROSS[0].z+CROSS[1].z)/2); if(q<bd){bd=q;CROSS_D=d;} } }
  // rogatki jako przeszkody, gdy są opuszczone
  const BOOMS=[]; if(CROSS_D!==null){ const s=sampleLine(DK.pts,DK.len,CROSS_D); [-1,1].forEach(sd=>{ const o={x:s.x-s.tz*sd*DK.w*.25-s.tx*sd*6.5,z:s.z+s.tx*sd*DK.w*.25-s.tz*sd*6.5,hw:DK.w*.25,hd:.15,c:Math.cos(Math.atan2(-s.tx,s.tz)),s:Math.sin(Math.atan2(-s.tx,s.tz)),r:DK.w*.3,off:true}; addSolid(o); BOOMS.push(o); }); }
  function crossClosed(){ return CRS.phase==='warn'||CRS.phase==='down'||(CRS.phase==='up'&&CRS.armA>-1.3); }
  crossUpdate=function(){ if(!CROSS.length)return; const dt=Math.min(.05,tAll-(CRS.last||tAll)); CRS.last=tAll; const cx=(CROSS[0].x+CROSS[1].x)/2, cz=(CROSS[0].z+CROSS[1].z)/2;
    const W=[...train,...FREIGHT].filter(w=>w.visible); const dmin=W.reduce((m,w)=>Math.min(m,Math.hypot(w.position.x-cx,w.position.z-cz)),1e9);
    CRS.t+=dt;
    const appr=dmin<(CRS.pd===undefined?1e9:CRS.pd)-.001; CRS.pd=dmin;
    if(CRS.phase==='idle'&&dmin<420&&appr){ CRS.phase='warn'; CRS.t=0; CRS.passed=false; }
    else if(CRS.phase==='warn'&&CRS.t>5){ CRS.phase='down'; CRS.t=0; }
    else if(CRS.phase==='down'){ if(dmin<60) CRS.passed=true; if((CRS.passed&&dmin>90&&!appr)||CRS.t>45){ CRS.clear+=dt; if(CRS.clear>2.5){ CRS.phase='up'; CRS.t=0; CRS.clear=0; CRS.passed=false; } } else CRS.clear=0; }
    else if(CRS.phase==='up'&&CRS.armA<-1.43){ CRS.phase='idle'; CRS.t=0; }
    const tgt=CRS.phase==='down'?0:CRS.phase==='warn'?-1.45:CRS.phase==='up'?-1.45:-1.45; CRS.armA+=clamp(tgt-CRS.armA,-dt*.42,dt*.42);
    const lights=CRS.phase!=='idle'; const on=Math.floor(tAll*1.6)%2;
    CROSS.forEach(c=>{ c.arm.rotation.z=CRS.armA; c.lamps[0].material.color.set(lights&&on?0xff2a1a:0x330000); c.lamps[1].material.color.set(lights&&!on?0xff2a1a:0x330000); });
    BOOMS.forEach(o=>o.off=CRS.armA<-.35);
    if(false&&lights&&AU.ctx&&AU.on&&!st.inside){ const dp=Math.hypot((st.car?st.car.x:st.x)-cx,(st.car?st.car.z:st.z)-cz); if(dp<150){ CRS.bell-=dt; if(CRS.bell<=0){ CRS.bell=.55; const t=AU.ctx.currentTime, v=.05*Math.pow(clamp(1-dp/150,0,1),2); tone('triangle',1320,t,.25,v); tone('sine',2640,t,.12,v*.4); } } } };
  // ruch na DK42: odstępy między autami i zatrzymanie przed przejazdem
  function trafficSpeeds(dt){ const closed=crossClosed(); [1,-1].forEach(dir=>{ const L=cars.filter(c=>!c.r&&c.dir===dir).sort((a,b)=>(a.d-b.d)*dir);
      for(let i=0;i<L.length;i++){ const c=L[i]; if(c.v0===undefined) c.v0=c.v; let tv=c.v0; const nx=L[i+1];
        if(nx){ const gap=(nx.d-c.d)*dir-7.5; if(gap<40) tv=Math.min(tv,Math.max(0,gap)*.85); }
        if(CROSS_D!==null){ const toX=(CROSS_D-c.d)*dir-10; if(closed&&toX>-.5&&toX<120&&!(toX<3&&c.v>9)) tv=Math.min(tv,Math.max(0,toX)*.6); }
        if(st.car&&!st.inside){ const p=st.car; const s=sampleLine(DK.pts,DK.len,c.d); const ahead=((p.x-s.x)*s.tx+(p.z-s.z)*s.tz)*dir, side=Math.abs((p.x-s.x)*-s.tz+(p.z-s.z)*s.tx-2.2*dir); if(ahead>0&&ahead<25&&side<2.2) tv=Math.min(tv,Math.max(0,ahead-7)*.8); }
        c.v+=clamp(tv-c.v,-9*dt,2.6*dt); if(c.v<0) c.v=0; } }); }

  /* ---------- wnętrza: Żabka, Delikatesy, Apteka, Euforia, Orlen, Biedronka, Lidl, kościół, biblioteka ---------- */
  let CUR=IN; IN.doorW=[IN.x+IN_DOOR[0],IN.z+IN_DOOR[1]];
  const ROOMS=[]; let roomSlot=1;
  function defRoom(o){ o.x=2900+(roomSlot++)*62; o.z=600; o.y=150; o.box=[]; o.npc=[]; o.walks=[]; o.built=false; o.HT=o.HT||3.6; o.doorX=o.doorX!==undefined?o.doorX:-o.W/2+2.5; ROOMS.push(o); return o; }
  const curBlocked=(x,z,r)=>{ r=r||.35; const C=CUR, lx=x-C.x, lz=z-C.z; if(lx<-C.W/2+r||lx>C.W/2-r||lz<-C.D/2+r||lz>C.D/2-r) return true; const LV=C.levels&&(st.gy||0)>1.8?1:0; return C.box.some(b=>(b[4]===undefined||b[4]===LV)&&lx>b[0]-r&&lx<b[2]+r&&lz>b[1]-r&&lz<b[3]+r); };
  function sitPose(p,seatY){ const u=p.userData; u.lL.rotation.x=u.lR.rotation.x=-1.45; u.kL.rotation.x=u.kR.rotation.x=1.45; p.position.y=(seatY||.46)-.9; }
  // na części ławek w parku ktoś siedzi
  (PARK.benches||[]).forEach((b,i)=>{ if(i%3===1)return; const p=makePerson(pick(PCOL),pick([0x2c3e66,0x2a2a2c,0x5a4a3a,0x6a6a6a]),pick([0x2a1d14,0x6b4426,0xb08a50,0x8a8a8a,0xd8d8d8])); const o=i%2?.45:-.45; const x=b.x+Math.cos(b.ry)*o+Math.sin(b.ry)*.05, z=b.z-Math.sin(b.ry)*o+Math.cos(b.ry)*.05; sitPose(p,.46); p.position.set(x,H(x,z)+p.position.y+.1,z); p.rotation.y=b.ry; scene.add(p); });
  function roomShell(o){ const g=new THREE.Group(); g.position.set(o.x,o.y,o.z); g.visible=false; scene.add(g); o.g=g; const W=o.W,D=o.D,HT=o.HT;
    const tile=tex(256,256,(c,w,h)=>{ c.fillStyle=o.floor||'#c9c5bc'; c.fillRect(0,0,w,h); c.fillStyle='rgba(0,0,0,.06)'; c.fillRect(0,0,w/2,h/2); c.fillRect(w/2,h/2,w/2,h/2); c.strokeStyle='rgba(0,0,0,.12)'; c.lineWidth=2; c.strokeRect(0,0,w,h); }); tile.repeat.set(W/1.4,D/1.4);
    const fl=new THREE.Mesh(new THREE.PlaneGeometry(W,D).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({map:tile,emissive:o.floorE!==undefined?o.floorE:0x2a2a2a})); fl.receiveShadow=true; g.add(fl);
    const wallM=new THREE.MeshLambertMaterial({color:o.wall||0xd9d5ca,emissive:o.wallE!==undefined?o.wallE:0x2c2c2a,side:THREE.DoubleSide}), band=new THREE.MeshLambertMaterial({color:o.col||0x1d7a3a});
    const ceil=new THREE.Mesh(new THREE.BoxGeometry(W+1,.3,D+1),new THREE.MeshLambertMaterial({color:o.ceil||0xdcdcd8,emissive:o.ceilE!==undefined?o.ceilE:0x5a5a58})); ceil.position.y=HT+.15; ceil.castShadow=true; g.add(ceil);
    [[0,-D/2,W,0],[0,D/2,W,Math.PI],[-W/2,0,D,Math.PI/2],[W/2,0,D,-Math.PI/2]].forEach(([x,z,l,r])=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(l,HT),wallM); m.position.set(x,HT/2,z); m.rotation.y=r; m.castShadow=true; m.receiveShadow=true; g.add(m);
      if(!o.noBand){ const s=new THREE.Mesh(new THREE.PlaneGeometry(l,.35),band); s.position.set(x*.999,Math.min(HT-.5,3.1),z*.999); s.rotation.y=r; g.add(s); } });
    if(!o.noLights){ const lp=new THREE.MeshBasicMaterial({color:0xfdfcf4}); for(let x=-W/2+3;x<W/2-1;x+=4) for(let z=-D/2+2.5;z<D/2-1;z+=3.4){ const m=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.3).rotateX(Math.PI/2),lp); m.position.set(x,HT-.01,z); g.add(m); } }
    if(o.logo){ const lw=o.logoW||Math.min(W*.5,7); pl(g,lw,lw/4,o.logoX||0,o.logoY||Math.min(HT-1.1,2.5),-D/2+.02,new THREE.MeshBasicMaterial({map:o.logo})); }
    // drzwi z widokiem na zewnątrz
    const outside=tex(256,128,(c,w,h)=>{ const gr=c.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#a9cbe6'); gr.addColorStop(.6,'#e8eef0'); gr.addColorStop(.62,'#6b6d70'); gr.addColorStop(1,'#56585b'); c.fillStyle=gr; c.fillRect(0,0,w,h); c.fillStyle='#3f6b3a'; c.fillRect(0,h*.45,w,h*.16); });
    pl(g,2.2,2.4,o.doorX,1.2,D/2-.03,new THREE.MeshBasicMaterial({map:outside}),Math.PI);
    const wy=tex(256,64,(c,w,h)=>{ c.fillStyle='#1d7a3a'; c.fillRect(0,0,w,h); c.fillStyle='#fff'; c.font='700 36px Barlow, Arial'; c.textAlign='center'; c.fillText('WYJŚCIE',w/2,46); }); pl(g,1.4,.36,o.doorX,2.65,D/2-.05,new THREE.MeshBasicMaterial({map:wy}),Math.PI);
    if(!o.noWindows) for(let x=o.doorX+3.5;x<W/2-1.5;x+=4) pl(g,3,1.5,x,1.5,D/2-.03,new THREE.MeshBasicMaterial({map:outside}),Math.PI);
    return g; }
  const box2=(o,x0,z0,x1,z1)=>o.box.push([Math.min(x0,x1),Math.min(z0,z1),Math.max(x0,x1),Math.max(z0,z1)]);
  function npcPerson(o,fem,top,bot,hair,opt){ const p=makePerson(top,bot,hair,Object.assign({female:fem},opt||{})); o.g.add(p); return p; }
  const custPerson=o=>npcPerson(o,rnd()<.55,pick(PCOL),pick([0x2c3e66,0x2a2a2c,0x5a4a3a,0x6a6a6a,0x1e2a44]),pick([0x2a1d14,0x4a2e1a,0x6b4426,0xb08a50,0x8a8a8a,0xd2b27a]));
  function addWalker(o,path,basket){ const p=custPerson(o); if(basket){ const bk=new THREE.Mesh(new THREE.BoxGeometry(.42,.24,.3),new THREE.MeshLambertMaterial({color:basket})); bk.position.set(0,-.42,.08); p.userData.eR.add(bk); }
    const len=lineLen(path); const n={p,role:'walk',path,len,d:R(0,len[len.length-1]),dir:rnd()<.5?1:-1,wait:R(0,3),walk:R(0,6)}; o.npc.push(n); return n; }
  // sklep samoobsługowy: regały, lodówki, kasy
  function shopInterior(o){ const g=roomShell(o), W=o.W, D=o.D; const steel=new THREE.MeshLambertMaterial({color:0xb8bcc0}), dark=new THREE.MeshLambertMaterial({color:0x2c2f33}), col=new THREE.MeshLambertMaterial({color:o.col});
    const texs=[shelfTex('dry'),shelfTex('drink'),shelfTex('dry')]; const TF=shelfTex('fridge'); const front=D/2-4.2, back=-D/2+1.9; const xs=[]; const n=o.rows; const span=W-6; for(let i=0;i<n;i++) xs.push(-span/2+(i+.5)*span/n);
    const gz0=back+1.2, gz1=front-1.6, gl=gz1-gz0, gc=(gz0+gz1)/2;
    xs.forEach((x,i)=>{ bx(g,1,1.85,gl,x,0,gc,steel); const m=new THREE.MeshLambertMaterial({map:texs[i%3]}); [-1,1].forEach(sd=>{ const p=new THREE.Mesh(new THREE.PlaneGeometry(gl-.1,1.7),m); p.position.set(x+sd*.505,.95,gc); p.rotation.y=sd*Math.PI/2; g.add(p); }); const cap=new THREE.Mesh(new THREE.PlaneGeometry(1,.3),col); cap.position.set(x,2.02,gz1+.02); g.add(cap); box2(o,x-.5,gz0,x+.5,gz1); });
    if(o.fridge!==false){ bx(g,W-1,2.2,.85,0,0,-D/2+.43,new THREE.MeshLambertMaterial({color:0xe8ecee})); const fr=new THREE.Mesh(new THREE.PlaneGeometry(W-1.4,1.9),new THREE.MeshLambertMaterial({map:TF,emissive:0x8899a0,emissiveMap:TF})); fr.position.set(0,1.1,-D/2+.87); g.add(fr); box2(o,-W/2,-D/2,W/2,-D/2+.9); }
    // kasy przy wejściu
    const cx=[]; for(let i=0;i<o.checkouts;i++) cx.push(W/2-3-i*3.2); const belt=new THREE.MeshLambertMaterial({color:0x1e2022});
    cx.forEach((x,i)=>{ bx(g,.8,.9,2.6,x,0,D/2-2.6,new THREE.MeshLambertMaterial({color:0x3a4a52})); bx(g,.62,.03,2,x,.9,D/2-2.9,belt,true); bx(g,.5,.25,.35,x+.1,.9,D/2-1.6,dark); box2(o,x-.42,D/2-3.95,x+1.3,D/2-1.25);
      const ca=npcPerson(o,rnd()<.8,o.col,0x22252a,pick([0x4a2e1a,0xb08a50,0x2a1d14]),{style:'tee'}); ca.position.set(x+.95,0,D/2-2.2); sitPose(ca,.52); ca.rotation.y=-Math.PI/2; o.npc.push({p:ca,role:'cash',t:R(0,3)});
      for(let k=0;k<(i===0?2:1);k++){ const c=custPerson(o); c.position.set(x-.85,0,D/2-2.4-k*1.1); c.rotation.y=k?0:Math.PI/2; o.npc.push({p:c,role:'stand',t:R(0,5),pay:!k}); } });
    o.counter=[cx[0]-.9,D/2-3.2];
    // trasa klientów: wężyk między regałami
    const aisles=[-W/2+1.2,...xs.slice(0,-1).map((x,i)=>(x+xs[i+1])/2),W/2-1.2].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b); const path=[]; aisles.forEach((ax,i)=>{ const top=back+.4, bot=front-.6; if(i%2===0){ path.push([ax,bot],[ax,top]); } else { path.push([ax,top],[ax,bot]); } });
    for(let i=0;i<o.walkers;i++) addWalker(o,path,o.basket||0xc4221e);
    if(o.extra) o.extra(o,g); }
  // mały sklep z ladą (Orlen, apteka)
  function counterInterior(o){ const g=roomShell(o), W=o.W, D=o.D; const wood=new THREE.MeshLambertMaterial({color:o.counterCol||0xe8e6e0}), col=new THREE.MeshLambertMaterial({color:o.col});
    bx(g,W*.55,1.0,.8,W*.1,0,-D/2+2.4,wood); bx(g,W*.55,.08,.9,W*.1,1.0,-D/2+2.4,col,true); box2(o,W*.1-W*.275,-D/2,W*.1+W*.275,-D/2+2.8);
    const sh=o.shelfTex||shelfTex('dry'); bx(g,W-1,2.2,.6,0,0,-D/2+.3,new THREE.MeshLambertMaterial({color:0xf0f0ec})); const sp=new THREE.Mesh(new THREE.PlaneGeometry(W-1.2,1.9),new THREE.MeshLambertMaterial({map:sh})); sp.position.set(0,1.15,-D/2+.62); g.add(sp);
    [-1,1].forEach(sd=>{ bx(g,.6,1.9,D-5,sd*(W/2-.3),0,.5,new THREE.MeshLambertMaterial({color:0xf0f0ec})); const p=new THREE.Mesh(new THREE.PlaneGeometry(D-5.2,1.7),new THREE.MeshLambertMaterial({map:shelfTex(o.side2||'drink')})); p.position.set(sd*(W/2-.62),1,.5); p.rotation.y=-sd*Math.PI/2; g.add(p); box2(o,sd*(W/2)-.01,-D/2+2.5,sd*(W/2-.62),D/2-2.5); });
    const ca=npcPerson(o,o.cashFem!==false,o.uni||o.col,0x22252a,pick([0x4a2e1a,0xb08a50,0x2a1d14]),{style:'tee'}); ca.position.set(W*.1,0,-D/2+1.5); ca.rotation.y=0; o.npc.push({p:ca,role:'clerk',t:R(0,3)});
    for(let k=0;k<2;k++){ const c=custPerson(o); c.position.set(W*.1-.8+k*1.6,0,-D/2+3.4+k*.9); c.rotation.y=Math.PI; o.npc.push({p:c,role:'stand',t:R(0,5),pay:!k}); }
    o.counter=[W*.1,-D/2+3.4];
    const path=[[-W/2+1.6,D/2-1.8],[-W/2+1.6,-D/2+3.8],[W/2-1.6,-D/2+3.8],[W/2-1.6,D/2-1.8]]; for(let i=0;i<(o.walkers||1);i++) addWalker(o,path,null);
    if(o.extra) o.extra(o,g); }
  // Żabka: lada z kawą i hot-dogami, ekrany z menu, lamelowy sufit z liniami LED, lodówki, gondole
  function zabkaInterior(o){ const g=roomShell(o), W=o.W, D=o.D, HT=o.HT;
    const dark=new THREE.MeshLambertMaterial({color:0x2a2d30}), led=new THREE.MeshBasicMaterial({color:0xf6fbff}), green=new THREE.MeshBasicMaterial({color:0x2fd36a});
    // sufit z lameli i linie LED
    { const n=Math.floor(W/.22); const im=new THREE.InstancedMesh(new THREE.BoxGeometry(.06,.18,D),dark,n); const M4=new THREE.Matrix4(); for(let i=0;i<n;i++){ M4.makeTranslation(-W/2+.11+i*.22,HT-.12,0); im.setMatrixAt(i,M4); } g.add(im);
      [-W/4,W/4].forEach(x=>{ const l=new THREE.Mesh(new THREE.PlaneGeometry(.1,D-1).rotateX(Math.PI/2),led); l.position.set(x,HT-.22,0); g.add(l); }); [-1,1].forEach(k=>{ const l=new THREE.Mesh(new THREE.PlaneGeometry(W-1,.1).rotateX(Math.PI/2),led); l.position.set(0,HT-.23,k*D/4); g.add(l); }); }
    // lada (2 moduły z Blendera) przy tylnej ścianie, za nią zaplecze z papierosami
    for(let i=0;i<2;i++){ const m=modelClone('lada_zabka'); if(m){ m.position.set(-W/2+3.2+i*3.0,0,-D/2+1.5); g.add(m); } } box2(o,-W/2+1.6,-D/2,-W/2+7.8,-D/2+2.35);
    { const cig=tex(256,128,(c,w,h)=>{ c.fillStyle='#1d1f21'; c.fillRect(0,0,w,h); const C=['#e8e8e8','#c62a24','#1c4fa0','#d4b04a','#2a9a5a','#111']; for(let r=0;r<4;r++) for(let i=0;i<16;i++){ c.fillStyle=C[(i*3+r)%C.length]; c.fillRect(4+i*15.8,6+r*30,13,24); c.fillStyle='rgba(255,255,255,.3)'; c.fillRect(4+i*15.8,6+r*30,13,4); } });
      bx(g,6,1.6,.35,-W/2+4.7,.9,-D/2+.18,dark); pl(g,5.8,1.5,-W/2+4.7,1.7,-D/2+.36,new THREE.MeshLambertMaterial({map:cig,emissive:0x202020,emissiveMap:cig})); }
    // ekrany z menu nad ladą (zielone „GŁODNY?” z cenami)
    const scr=(a,b,price,col)=>tex(256,144,(c,w,h)=>{ c.fillStyle=col; c.fillRect(0,0,w,h); c.fillStyle='#fff'; c.font='800 26px Barlow, Arial'; c.fillText(a,12,32); c.font='600 18px Barlow, Arial'; c.fillText(b,12,56); c.fillStyle='#c62a24'; c.beginPath(); c.arc(w-56,h-52,40,0,7); c.fill(); c.fillStyle='#fff'; c.font='800 30px Barlow, Arial'; c.textAlign='center'; c.fillText(price,w-56,h-42); c.fillStyle='#f2c38a'; c.beginPath(); c.ellipse(80,h-36,62,20,0,0,7); c.fill(); c.fillStyle='#a8452a'; c.fillRect(30,h-42,100,10); });
    [['GŁODNY?','Hot-dog + napój','7,90','#1e8f45'],['GŁODNY?','Panini','5,00','#1e8f45'],['ŚNIADANIE','Kawa + bułka','6,50','#2a9a5a'],['ZAPIEKANKA','z serem','9,99','#1e8f45']].forEach((d,i)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(1.3,.73),new THREE.MeshBasicMaterial({map:scr(...d)})); m.position.set(-W/2+2.3+i*1.4,2.85,-D/2+.06); g.add(m); });
    // zielony pasek LED pod blatem przy wejściu na zaplecze
    const strip=new THREE.Mesh(new THREE.PlaneGeometry(6,.04),green); strip.position.set(-W/2+4.7,.06,-D/2+2.31); g.add(strip);
    // lodówki wzdłuż prawej ściany
    const glassF=new THREE.MeshPhongMaterial({color:0xcfe6f0,transparent:true,opacity:.16,shininess:140,specular:0xffffff});
    for(let i=0;i<Math.floor((D-2.5)/1.25);i++){ const m=modelClone('lodowka'); if(!m)break; m.position.set(W/2,0,-D/2+.8+.62+i*1.25); m.rotation.y=-Math.PI/2; m.material=m.material.clone(); m.material.emissive=new THREE.Color(0x3a3f44); m.material.emissiveMap=m.material.map; g.add(m); const gp=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.75),glassF); gp.position.set(0,1.05,.8); m.add(gp); } box2(o,W/2-.85,-D/2,W/2,D/2-1.2);
    // gondole z przekąskami
    [-W/2+2.4,-W/2+5.2].forEach(x=>{ for(let k=0;k<2;k++){ const m=modelClone('gondola'); if(m){ m.position.set(x,0,-.2+k*2.0); m.rotation.y=Math.PI/2; g.add(m); } } box2(o,x-.5,-1.2,x+.5,2.8); });
    { const m=modelClone('gondola'); if(m){ m.position.set(W/2-3.2,0,1.4); m.rotation.y=Math.PI/2; g.add(m); } box2(o,W/2-3.7,.4,W/2-2.7,2.4); }
    // sprzedawcy i klienci
    [-W/2+3.2,-W/2+6.2].forEach((x,i)=>{ const c=npcPerson(o,i===0,0x1e8f45,0x22252a,pick([0x4a2e1a,0xb08a50,0x2a1d14]),{style:'tee'}); c.position.set(x,0,-D/2+.85); c.rotation.y=0; o.npc.push({p:c,role:'clerk',t:R(0,3)}); });
    for(let k=0;k<2;k++){ const c=custPerson(o); c.position.set(-W/2+3.2+k*1.2,0,-D/2+2.9+k*.8); c.rotation.y=Math.PI; o.npc.push({p:c,role:'stand',t:R(0,5),pay:!k}); }
    o.counter=[-W/2+4.7,-D/2+2.9];
    addWalker(o,[[-W/2+1.2,D/2-1.6],[-W/2+1.2,-D/2+3.4],[W/2-1.4,-D/2+3.4],[W/2-1.4,D/2-1.6]],0x1e8f45); }
  // apteka: przygaszone ciepłe światło, regały z lekami z Blendera, lada z dwoma stanowiskami
  let REGAL_PROTO=null;
  // ośrodek zdrowia: rejestracja, poczekalnia z krzesłami i pacjentami, drzwi do gabinetów
  function clinicInterior(o){ const g=roomShell(o), W=o.W, D=o.D;
    const desk=new THREE.MeshLambertMaterial({color:0xf2f2ee}), blue=new THREE.MeshLambertMaterial({color:0x2f7fbf}), seat=new THREE.MeshLambertMaterial({color:0x3a6fa8}), metal=new THREE.MeshLambertMaterial({color:0x9aa2a8}), doorM=new THREE.MeshLambertMaterial({color:0xd8d2c4});
    // rejestracja w rogu
    bx(g,4.2,1.05,.8,W/2-2.6,0,-D/2+2.2,desk); bx(g,4.3,.06,.9,W/2-2.6,1.05,-D/2+2.2,blue,true); box2(o,W/2-4.8,-D/2,W/2,-D/2+2.65);
    bx(g,.45,.32,.06,W/2-2.2,1.1,-D/2+1.95,new THREE.MeshLambertMaterial({color:0x1d2124}),true);
    const rec=npcPerson(o,true,0xffffff,0x2f7fbf,pick([0x4a2e1a,0xb08a50,0x2a1d14]),{style:'coat'}); rec.position.set(W/2-2.6,0,-D/2+1.3); rec.rotation.y=0; o.npc.push({p:rec,role:'clerk',t:R(0,3)});
    pl(g,2.4,.5,W/2-2.6,2.3,-D/2+.02,new THREE.MeshLambertMaterial({map:signTex('REJESTRACJA','#2f7fbf','#ffffff',512,96,'700 54px Barlow, Arial')}));
    // drzwi do gabinetów
    [[-W/2+2,'GABINET 1'],[-W/2+4.6,'GABINET 2']].forEach(([x,t])=>{ pl(g,1.1,2.15,x,1.08,-D/2+.02,doorM); bx(g,.06,.06,.12,x+.4,1.0,-D/2+.04,metal,true); pl(g,.9,.22,x,2.35,-D/2+.02,new THREE.MeshLambertMaterial({map:signTex(t,'#ffffff','#2f7fbf',256,64,'700 34px Barlow, Arial')})); });
    // krzesła w poczekalni pod ścianami, na części siedzą pacjenci
    const chairs=[]; for(let i=0;i<5;i++) chairs.push([-W/2+.45,-D/2+3.6+i*.75,Math.PI/2]); for(let i=0;i<4;i++) chairs.push([.2+i*.75,D/2-1.7,Math.PI]);
    chairs.forEach(([x,z,r],i)=>{ const c=new THREE.Group(); c.position.set(x,0,z); c.rotation.y=r; g.add(c); bx(c,.5,.06,.46,0,.44,0,seat,true); bx(c,.5,.5,.05,0,.47,-.22,seat,true); bx(c,.05,.44,.05,0,0,0,metal,true);
      if(i%3!==1){ const p=custPerson(o); p.position.set(x,0,z); sitPose(p,.46); p.rotation.y=r; o.npc.push({p,role:'read',t:R(0,6)}); } });
    box2(o,-W/2,-D/2+3.2,-W/2+.8,-D/2+7.2); box2(o,-.2,D/2-2.1,2.9,D/2-1.3);
    // plakaty i roślina
    [[-1,'#d8ecf7','#2f7fbf'],[1.4,'#fdf0d8','#c0392b']].forEach(([x,bg,fg])=>{ pl(g,.8,1.1,x,1.7,-D/2+.02,new THREE.MeshLambertMaterial({map:tex(64,96,(c,w,h)=>{ c.fillStyle=bg; c.fillRect(0,0,w,h); c.fillStyle=fg; c.fillRect(8,10,w-16,14); c.fillRect(8,34,w-26,6); c.fillRect(8,46,w-20,6); c.beginPath(); c.arc(w/2,74,12,0,7); c.fill(); })})); });
    const pot=new THREE.Mesh(new THREE.CylinderGeometry(.25,.2,.45,10).translate(0,.22,0),new THREE.MeshLambertMaterial({color:0xb8603a})); pot.position.set(W/2-.6,0,D/2-1.4); g.add(pot); const lf=new THREE.Mesh(new THREE.IcosahedronGeometry(.55,0),new THREE.MeshLambertMaterial({color:0x3f8a3a})); lf.position.set(W/2-.6,1.0,D/2-1.4); g.add(lf); box2(o,W/2-.9,D/2-1.7,W/2-.3,D/2-1.1);
    const path=[[-W/2+2.2,D/2-2.6],[W/2-2,D/2-2.6],[W/2-2,-D/2+3.4],[-W/2+2.2,-D/2+3.4]]; for(let i=0;i<(o.walkers||1);i++) addWalker(o,path,null); }
  function pharmInterior(o){ const g=roomShell(o), W=o.W, D=o.D;
    const woodD=new THREE.MeshLambertMaterial({color:0x5e412c}), top=new THREE.MeshLambertMaterial({color:0xe9e6df}), green=new THREE.MeshLambertMaterial({color:0x2a9a5a});
    // lada
    bx(g,W*.62,1.0,.75,0,0,-D/2+2.6,woodD); bx(g,W*.62+.12,.06,.87,0,1.0,-D/2+2.6,top,true); bx(g,W*.62,.12,.02,0,.75,-D/2+2.985,green,true); box2(o,-W*.31-.1,-D/2,W*.31+.1,-D/2+3.05);
    [-W*.15,W*.15].forEach(x=>{ bx(g,.42,.3,.06,x,1.06,-D/2+2.4,new THREE.MeshLambertMaterial({color:0x1d2124}),true); pl(g,.36,.24,x,1.21,-D/2+2.432,new THREE.MeshBasicMaterial({color:0x7fc2a0})); bx(g,.32,.06,.24,x+.35,1.06,-D/2+2.75,new THREE.MeshLambertMaterial({color:0x2b2f33}),true); });
    // przeszklona gablota z kosmetykami na ladzie
    const gl=new THREE.MeshPhongMaterial({color:0xbfdde6,transparent:true,opacity:.25,shininess:120}); const gc=new THREE.Mesh(new THREE.BoxGeometry(1.4,.4,.5),gl); gc.position.set(0,1.26,-D/2+2.65); g.add(gc);
    for(let i=0;i<6;i++) bx(g,.12,.18,.12,-.55+i*.22,1.06,-D/2+2.65,new THREE.MeshLambertMaterial({color:[0xf2c3d6,0xd9ecf7,0xffffff,0xe3f4dc,0xfff3c4,0xe6e0f5][i]}),true);
    // regały z lekami
    if(!REGAL_PROTO) REGAL_PROTO=modelMesh('regal');
    const put=(x,z,ry)=>{ let m; if(REGAL_PROTO){ m=REGAL_PROTO.clone(); } else { m=new THREE.Group(); bx(m,2,2.45,.46,0,0,.23,new THREE.MeshLambertMaterial({color:0xe9e4da})); } m.position.set(x,0,z); m.rotation.y=ry; g.add(m); };
    const nB=Math.floor((W-.3)/2.05); for(let i=0;i<nB;i++) put(-nB*2.05/2+1.025+i*2.05,-D/2+.02,0);
    [-1,1].forEach(sd=>{ for(let z=-D/2+4.2;z<D/2-1.6;z+=2.05){ if(sd<0&&Math.abs(z-(D/2-.6))<2.2)continue; put(sd*(W/2-.02),z,-sd*Math.PI/2); } box2(o,sd*(W/2)-(sd>0?.5:0),-D/2+3.1,sd*(W/2)+(sd<0?.5:0),D/2-1.6); });
    // zielony krzyż (świecący) nad regałami
    const cT=tex(128,128,(x,w,h)=>{ x.clearRect(0,0,w,h); x.fillStyle='#3be07d'; x.fillRect(44,10,40,108); x.fillRect(10,44,108,40); x.fillStyle='#b9ffd3'; x.fillRect(54,20,20,88); x.fillRect(20,54,88,20); },true);
    const cr=new THREE.Mesh(new THREE.PlaneGeometry(.7,.7),new THREE.MeshBasicMaterial({map:cT,transparent:true})); cr.position.set(W/2-1.2,3.08,-D/2+.04); g.add(cr);
    // stojak z promocjami i koszyk
    bx(g,.6,1.4,.4,W/2-1.2,0,D/2-1.4,new THREE.MeshLambertMaterial({color:0xe9e6df})); pl(g,.5,.5,W/2-1.2,1.2,D/2-1.19,new THREE.MeshLambertMaterial({map:tex(64,64,(x,w,h)=>{ x.fillStyle='#2a9a5a'; x.fillRect(0,0,w,h); x.fillStyle='#fff'; x.font='800 20px Barlow, Arial'; x.textAlign='center'; x.fillText('-15%',w/2,38); })}),Math.PI); box2(o,W/2-1.5,D/2-1.6,W/2-.9,D/2-1.2);
    // farmaceutki i klienci
    [-W*.15,W*.15].forEach((x,i)=>{ const c=npcPerson(o,i===0,0xf4f4f2,0x2b2f36,pick([0x4a2e1a,0xb08a50,0x2a1d14]),{style:'coat'}); c.position.set(x,0,-D/2+1.75); c.rotation.y=0; o.npc.push({p:c,role:'clerk',t:R(0,3)}); });
    for(let k=0;k<2;k++){ const c=custPerson(o); c.position.set(-W*.15+k*W*.3,0,-D/2+3.5+k*.4); c.rotation.y=Math.PI; o.npc.push({p:c,role:'stand',t:R(0,5),pay:!k}); }
    o.counter=[0,-D/2+3.5];
    addWalker(o,[[-W/2+1.8,D/2-1.8],[-W/2+1.8,-D/2+4.2],[W/2-1.8,-D/2+4.2],[W/2-1.8,D/2-2.4]],null); }
  // restauracja (Euforia)
  function restInterior(o){ const g=roomShell(o), W=o.W, D=o.D; const wood=new THREE.MeshLambertMaterial({color:0x8a5a34}), top=new THREE.MeshLambertMaterial({color:0xf2efe8}), col=new THREE.MeshLambertMaterial({color:o.col});
    bx(g,W*.5,1.05,.8,0,0,-D/2+2,wood); bx(g,W*.5,.06,.9,0,1.05,-D/2+2,col,true); box2(o,-W*.25,-D/2,W*.25,-D/2+2.4);
    const menu=tex(512,128,(c,w,h)=>{ c.fillStyle='#1b1b1b'; c.fillRect(0,0,w,h); c.fillStyle='#ffd23a'; c.font='700 34px Barlow, Arial'; c.fillText('PIZZA 32 zł   BURGER 24 zł   FRYTKI 10 zł',18,74); }); pl(g,5,1.2,0,2.4,-D/2+.03,new THREE.MeshBasicMaterial({map:menu}));
    const ca=npcPerson(o,false,0x222222,0x22252a,0x2a1d14,{style:'tee'}); ca.position.set(0,0,-D/2+1.2); o.npc.push({p:ca,role:'clerk',t:0}); o.counter=[0,-D/2+3];
    for(let ix=0;ix<3;ix++) for(let iz=0;iz<2;iz++){ const x=-W/2+3+ix*(W-6)/2, z=-D/2+5.2+iz*2.8; bx(g,1.3,.75,.9,x,0,z,top); [-1,1].forEach(sd=>{ bx(g,.45,.46,.45,x+sd*.95,0,z,wood); if(rnd()<.7){ const p=custPerson(o); p.position.set(x+sd*.95,0,z); sitPose(p,.46); p.rotation.y=sd>0?-Math.PI/2:Math.PI/2; o.npc.push({p,role:'eat',t:R(0,6)}); } }); box2(o,x-1.25,z-.5,x+1.25,z+.5); }
    addWalker(o,[[-W/2+1.4,D/2-1.6],[-W/2+1.4,-D/2+3.4],[W/2-1.4,-D/2+3.4],[W/2-1.4,D/2-1.6]],null); }
  // kościół
  function churchInterior(o){ const W=o.W, D=o.D; const g=new THREE.Group(); g.position.set(o.x,o.y,o.z); g.visible=false; scene.add(g); o.g=g;
    const mdl=modelMesh('kosciol_in'); if(mdl){ mdl.scale.set(W/16,1,D/30); g.add(mdl); }
    // mural za ołtarzem: promienista „gloria” ze złotą monstrancją i postaciami (wg zdjęć)
    const mur=tex(1024,640,(c,w,h)=>{ c.fillStyle='#efe2c8'; c.fillRect(0,0,w,h); const cx=w/2, cy=h*.66; const C=['#d6e6f2','#f2e2a8','#c9d9ea','#f0c9a0','#e9d6f0','#d8eccf','#f4d9b0','#bcd2e6'];
        for(let i=0;i<120;i++){ const a=Math.PI*(1+i/120)+(Math.random()-.5)*.02, L=h*.35+Math.random()*h*.55; c.strokeStyle=C[i%C.length]; c.globalAlpha=.75; c.lineWidth=6+Math.random()*12; c.beginPath(); c.moveTo(cx+Math.cos(a)*60,cy+Math.sin(a)*60); c.lineTo(cx+Math.cos(a)*L*1.4,cy+Math.sin(a)*L); c.stroke(); }
        for(let i=0;i<40;i++){ const a=Math.PI*.05+Math.random()*Math.PI*.9, L=h*.2+Math.random()*h*.2; c.strokeStyle=C[i%C.length]; c.lineWidth=5; c.beginPath(); c.moveTo(cx+Math.cos(a)*60,cy+Math.sin(a)*60); c.lineTo(cx+Math.cos(a)*L*1.6,cy+Math.sin(a)*L*.6); c.stroke(); }
        c.globalAlpha=1; const gr=c.createRadialGradient(cx,cy,10,cx,cy,70); gr.addColorStop(0,'#fff6c8'); gr.addColorStop(.6,'#e6c14a'); gr.addColorStop(1,'#a8822a'); c.fillStyle=gr; c.beginPath(); c.arc(cx,cy,64,0,7); c.fill(); c.strokeStyle='#8a6a1e'; c.lineWidth=6; c.stroke();
        for(let i=0;i<24;i++){ const a=i/24*Math.PI*2; c.strokeStyle='#d8b54a'; c.lineWidth=3; c.beginPath(); c.moveTo(cx+Math.cos(a)*68,cy+Math.sin(a)*68); c.lineTo(cx+Math.cos(a)*92,cy+Math.sin(a)*92); c.stroke(); }
        c.fillStyle='rgba(255,255,255,.9)'; [[cx-40,h*.12],[cx+20,h*.14]].forEach(([x,y],i)=>{ c.beginPath(); c.ellipse(x,y+90,30,110,i?.1:-.1,0,7); c.fill(); c.beginPath(); c.arc(x,y-30,20,0,7); c.fill(); });
        c.fillStyle='rgba(200,215,235,.7)'; c.beginPath(); c.moveTo(cx-60,h*.05); c.lineTo(cx-25,h*.0); c.lineTo(cx-10,h*.05); c.fill(); });
    const murM=new THREE.MeshBasicMaterial({map:mur,color:0xcfcac0}); const mp=new THREE.Mesh(new THREE.PlaneGeometry(W*.75,W*.75*.62),murM); mp.position.set(0,1.0+W*.75*.31,-D/2+.32); g.add(mp);
    // obrazy na ścianach bocznych: Jezu ufam Tobie (lewa), Matka Boża Częstochowska (prawa), witraż
    const pic=(draw)=>tex(160,220,(c,w,h)=>{ c.fillStyle='#c9a227'; c.fillRect(0,0,w,h); c.fillStyle='#1a1a1a'; c.fillRect(10,10,w-20,h-20); draw(c,w,h); });
    const mercy=pic((c,w,h)=>{ const gr=c.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#2a3a4a'); gr.addColorStop(1,'#1a2430'); c.fillStyle=gr; c.fillRect(12,12,w-24,h-24); c.fillStyle='#f2efe6'; c.beginPath(); c.ellipse(w/2,h*.6,26,70,0,0,7); c.fill(); c.fillStyle='#e0b896'; c.beginPath(); c.arc(w/2,h*.24,14,0,7); c.fill(); c.fillStyle='rgba(255,90,90,.6)'; c.beginPath(); c.moveTo(w/2,h*.45); c.lineTo(w/2+40,h*.95); c.lineTo(w/2+10,h*.95); c.fill(); c.fillStyle='rgba(160,200,255,.6)'; c.beginPath(); c.moveTo(w/2,h*.45); c.lineTo(w/2-40,h*.95); c.lineTo(w/2-10,h*.95); c.fill(); });
    const black=pic((c,w,h)=>{ c.fillStyle='#d4b04a'; c.fillRect(12,12,w-24,h-24); c.fillStyle='#1f2a5a'; c.beginPath(); c.ellipse(w/2-10,h*.58,44,80,0,0,7); c.fill(); c.fillStyle='#4a3020'; c.beginPath(); c.ellipse(w/2-12,h*.3,16,20,0,0,7); c.fill(); c.ellipse(w/2+16,h*.52,10,12,0,0,7); c.fill(); c.strokeStyle='#f2e6a0'; c.lineWidth=4; c.beginPath(); c.arc(w/2-12,h*.3,26,Math.PI,0); c.stroke(); });
    [[-1,mercy,-D/2+10],[1,black,-D/2+10]].forEach(([sd,t,z])=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.9),new THREE.MeshLambertMaterial({map:t,emissive:0x1a1814,emissiveMap:t})); m.position.set(sd*(W/2-.32),2.2,z); m.rotation.y=-sd*Math.PI/2; g.add(m); });
    const glassT=tex(96,160,(c,w,h)=>{ const C=['#2a5bd7','#d7342a','#e8c02a','#2aa04a','#7a2ad7','#f08a2a']; for(let i=0;i<40;i++){ c.fillStyle=C[i%C.length]; c.beginPath(); c.moveTo(Math.random()*w,Math.random()*h); c.lineTo(Math.random()*w,Math.random()*h); c.lineTo(Math.random()*w,Math.random()*h); c.fill(); } c.strokeStyle='#222'; c.lineWidth=3; c.strokeRect(0,0,w,h); });
    for(let z=-D/2+16;z<D/2-3;z+=8){ const m=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.8),new THREE.MeshBasicMaterial({map:glassT})); m.position.set(W/2-.31,2.0,z); m.rotation.y=-Math.PI/2; g.add(m); }
    // świece na ołtarzu, palmy wielkanocne/kwiaty przy prezbiterium
    const SY=.6, SZ=-D/2+3.8*D/30; [-1.1,1.1].forEach(x=>{ const cnd=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.35,8),new THREE.MeshLambertMaterial({color:0xfff8e6,emissive:0x443a20})); cnd.position.set(x,SY+1.2,SZ); g.add(cnd); const fl=new THREE.Mesh(new THREE.SphereGeometry(.035,6,5),new THREE.MeshBasicMaterial({color:0xffd27a})); fl.position.set(x,SY+1.42,SZ); g.add(fl); });
    [-3.2,3.2].forEach(x=>{ const v=new THREE.Mesh(new THREE.CylinderGeometry(.18,.14,.5,10),new THREE.MeshLambertMaterial({color:0xe9e4da})); v.position.set(x,SY+.25+.4,-D/2+7.6*D/30); g.add(v); for(let k=0;k<9;k++){ const f=new THREE.Mesh(new THREE.SphereGeometry(.09,6,5),new THREE.MeshLambertMaterial({color:k%3?0xf2c230:0x2f7a2a})); f.position.set(x+Math.cos(k)*.22,SY+.95+(k%3)*.1,-D/2+7.6*D/30+Math.sin(k)*.22); g.add(f); } });
    // kolizje: prezbiterium i ławki
    box2(o,-W/2,-D/2,W/2,-D/2+7.2*D/30);
    const pri=npcPerson(o,false,0xf2f0ea,0x222222,0x6a6a6a,{style:'coat',hairStyle:'short'}); pri.position.set(0,SY,SZ-.9); o.npc.push({p:pri,role:'priest',t:0});
    for(let z=-D/2+9.2*D/30;z<D/2-3;z+=1.45*D/30) [[-W/2+1.2*W/16,-1.3*W/16],[1.3*W/16,W/2-1.2*W/16]].forEach(([x0,x1])=>{ box2(o,x0,z-.45,x1,z+.32);
      for(let x=x0+.5;x<x1-.3;x+=.75) if(rnd()<.32){ const p=custPerson(o); p.position.set(x,0,z); sitPose(p,.45); p.rotation.y=Math.PI; o.npc.push({p,role:'pray',t:R(0,8)}); } });
    o.counter=null; addWalker(o,[[0,D/2-1.5],[0,-D/2+8.2*D/30]],null); }
  // biblioteka
  function libInterior(o){ o.col=0x2a5a8a; const g=roomShell(o), W=o.W, D=o.D; const wood=new THREE.MeshLambertMaterial({color:0x8a5a34});
    const books=tex(512,256,(c,w,h)=>{ c.fillStyle='#6b4428'; c.fillRect(0,0,w,h); const C=['#8a1c1c','#1c3a8a','#1c6a3a','#c9a227','#5a2a6a','#2a2a2a','#d8d2c0','#a0522d']; for(let r=0;r<5;r++){ let x=4; while(x<w-4){ const bw=6+Math.random()*10, bh=36+Math.random()*10; c.fillStyle=C[Math.floor(Math.random()*C.length)]; c.fillRect(x,r*51+48-bh,bw-1,bh); x+=bw; } c.fillStyle='#4a2e1a'; c.fillRect(0,r*51+46,w,5); } });
    const bm=new THREE.MeshLambertMaterial({map:books});
    bx(g,W-1,2.4,.5,0,0,-D/2+.25,wood); const bp=new THREE.Mesh(new THREE.PlaneGeometry(W-1.2,2.2),bm); bp.position.set(0,1.2,-D/2+.52); g.add(bp); box2(o,-W/2,-D/2,W/2,-D/2+.6);
    [-1,1].forEach(sd=>{ bx(g,.5,2.4,D-4,sd*(W/2-.25),0,-.5,wood); const p=new THREE.Mesh(new THREE.PlaneGeometry(D-4.2,2.2),bm); p.position.set(sd*(W/2-.52),1.2,-.5); p.rotation.y=-sd*Math.PI/2; g.add(p); box2(o,sd*(W/2),-D/2,sd*(W/2-.55),D/2-2.5); });
    [-2.6,0,2.6].forEach(x=>{ bx(g,.6,2,3.6,x,0,-D/2+3.6,wood); [-1,1].forEach(sd=>{ const p=new THREE.Mesh(new THREE.PlaneGeometry(3.5,1.9),bm); p.position.set(x+sd*.31,1,-D/2+3.6); p.rotation.y=sd*Math.PI/2; g.add(p); }); box2(o,x-.32,-D/2+1.8,x+.32,-D/2+5.4); });
    bx(g,2.6,.95,.9,W/2-3,0,D/2-3.3,new THREE.MeshLambertMaterial({color:0xd8d2c0})); box2(o,W/2-4.3,D/2-3.8,W/2-1.7,D/2-2.8);
    const lib=npcPerson(o,true,0x7a5a8a,0x2a2a2c,0x8a8a8a,{style:'coat',hairStyle:'bob'}); lib.position.set(W/2-3,0,D/2-4.1); sitPose(lib,.5); lib.rotation.y=0; o.npc.push({p:lib,role:'clerk',t:0}); o.counter=[W/2-3,D/2-2.2];
    [[-3.2,D/2-4.2]].forEach(([x,z])=>{ bx(g,2.4,.75,1.2,x,0,z,new THREE.MeshLambertMaterial({color:0xc9a26a})); box2(o,x-1.6,z-1,x+1.6,z+1); [-1,1].forEach(sd=>{ bx(g,.45,.46,.45,x+sd*.6,0,z+sd*.95,wood); const p=custPerson(o); p.position.set(x+sd*.6,0,z+sd*.95); sitPose(p,.46); p.rotation.y=sd>0?Math.PI:0; o.npc.push({p,role:'read',t:R(0,6)}); }); });
    addWalker(o,[[-W/2+1.3,D/2-1.6],[-W/2+1.3,-D/2+6.2],[W/2-1.3,-D/2+6.2]],null); }

  // szkoła podstawowa: duże dwukondygnacyjne wnętrze - długi korytarz, klasy z ławkami i tablicami, klatka schodowa na piętro, sklepik szkolny
  const SCH_F=3.6;
  const SCH_ROOMS=[ // [x0,x1,strona,piętro,nazwa,rodzaj,temat na tablicy]
    [-20,-9,'S',0,'Klasa 1a','class',['Temat: Dodawanie do 100','23 + 45 = 68','Praca domowa: str. 12']],[-9,-3,'S',0,'Sklepik szkolny','shop'],[3,11.5,'S',0,'Klasa 2b','class',['Temat: Pory roku','Jesień: wrzesień, październik,','listopad']],[11.5,20,'S',0,'Pracownia biologiczna','lab',['Temat: Budowa komórki','jądro, cytoplazma, błona']],
    [-20,-11.5,'N',0,'Klasa 3c','class',['Temat: Części mowy','rzeczownik, czasownik,','przymiotnik']],[-11.5,-3,'N',0,'Pracownia komputerowa','comp',['Temat: Pętle w Scratchu','powtórz 10 razy…']],[3,11.5,'N',0,'Świetlica','swiet'],[11.5,20,'N',0,'Klasa 4a','class',['Temat: Ułamki zwykłe','1/2 + 1/4 = 3/4']],
    [-20,-11.5,'S',1,'Klasa 5b','class',['Present Simple','I play - he plays','Homework: p. 34']],[-11.5,-3,'S',1,'Pokój nauczycielski','teach'],[-3,3,'S',1,'Gabinet dyrektora','dyr'],[3,11.5,'S',1,'Klasa 6a','class',['Temat: „Pan Tadeusz”','A. Mickiewicz - inwokacja']],[11.5,20,'S',1,'Pracownia chemiczna','lab',['H₂O   NaCl   CO₂','Temat: Reakcje spalania']],
    [-20,-11.5,'N',1,'Klasa 7b','class',['Twierdzenie Pitagorasa','a² + b² = c²']],[-11.5,-3,'N',1,'Klasa 8a','class',['Temat: Rozprawka','teza - argumenty - wnioski']],[3,11.5,'N',1,'Pracownia geograficzna','geo',['Temat: Wyżyny Polski','Wyżyna Wieluńska - Warta']],[11.5,20,'N',1,'Klasa 8b','class',['Egzamin ósmoklasisty','- powtórka z matematyki']]];
  function schoolInterior(o){ o.noLights=true; o.noWindows=true; o.noBand=true; const g=roomShell(o), W=o.W, D=o.D, F=SCH_F;
    const MM=new Map(), M=(c,e)=>{ const k=c+'_'+e; if(!MM.has(k)) MM.set(k,new THREE.MeshLambertMaterial({color:c,emissive:e===undefined?0x1a1a18:e})); return MM.get(k); };
    const wallM=M(0xece6d4,0x2c2b26), lamp=M(0x8fb39a,0x10180f), slabM=M(0xf0f0ec,0x4c4c4a), woodM=M(0xb07a46,0x1a1006), woodD=M(0x6a4428,0x0e0804), metal=M(0x45658a,0x0a0e14), doorM=M(0x8a5a32,0x140a04), green=M(0x2f4a3a,0x060c08), steel=M(0xa8acb0,0x1a1a1a), dark=M(0x2a2c30,0x080808), red=M(0xb03a2e,0x1a0604), sofa=M(0x3a5a8a,0x080c14), glassM=new THREE.MeshPhongMaterial({color:0xcfe6f0,transparent:true,opacity:.35,shininess:90});
    const lightM=new THREE.MeshBasicMaterial({color:0xfdfcf4}), screenM=new THREE.MeshBasicMaterial({color:0x6aa8e8}), outM=new THREE.MeshBasicMaterial({map:tex(256,128,(c,w,h)=>{ const gr=c.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#a9cbe6'); gr.addColorStop(.62,'#e8eef0'); gr.addColorStop(.64,'#5f8a4a'); gr.addColorStop(1,'#4a6a3a'); c.fillStyle=gr; c.fillRect(0,0,w,h); c.fillStyle='#3a5a2a'; for(let i=0;i<9;i++){ c.beginPath(); c.arc(i*32+10,h*.62,14+(i%3)*5,Math.PI,0); c.fill(); } c.strokeStyle='#f4f4f2'; c.lineWidth=8; c.strokeRect(0,0,w,h); c.beginPath(); c.moveTo(w/2,0); c.lineTo(w/2,h); c.stroke(); })});
    const tileT=tex(256,256,(c,w,h)=>{ c.fillStyle='#b9b2a2'; c.fillRect(0,0,w,h); c.fillStyle='#a39a88'; c.fillRect(0,0,w/2,h/2); c.fillRect(w/2,h/2,w/2,h/2); c.strokeStyle='rgba(0,0,0,.15)'; c.lineWidth=2; c.strokeRect(0,0,w,h); }); tileT.repeat.set(W/1.2,D/1.2);
    // instancje: wszystkie skrzynki szkoły w kilku InstancedMesh (mało wywołań rysowania)
    const IB=new Map(); const ib=(mat,x,y,z,sx,sy,sz,ry)=>{ if(!IB.has(mat)) IB.set(mat,[]); IB.get(mat).push([x,y,z,sx,sy,sz,ry||0]); };
    const col=(x0,z0,x1,z1,lv)=>o.box.push([Math.min(x0,x1),Math.min(z0,z1),Math.max(x0,x1),Math.max(z0,z1),lv]);
    const wallSeg=(x0,z0,x1,z1,lv,h)=>{ const cx=(x0+x1)/2, cz=(z0+z1)/2, sx=Math.max(.2,Math.abs(x1-x0)), sz=Math.max(.2,Math.abs(z1-z0)); h=h||F; ib(wallM,cx,lv*F,cz,sx,h,sz); ib(lamp,cx,lv*F,cz,sx+.02,1.3,sz+.02); };
    const sign=(t,x,y,z,ry,w)=>pl(g,w||1.4,.3,x,y,z,new THREE.MeshBasicMaterial({map:signTex(t,'#f4f1e6','#1d3a6a',320,68,'700 34px Barlow, Arial')}),ry);
    // ściany korytarza (z = ±2) z otworami drzwiowymi, ściany działowe między salami
    const doorGap=r=>[r[1]-2.6,r[1]-.8];
    const PW=new Set(); [0,1].forEach(lv=>['S','N'].forEach(sd=>{ const zw=sd==='S'?2:-2, zs=sd==='S'?1:-1; const rs=SCH_ROOMS.filter(r=>r[3]===lv&&r[2]===sd).sort((a,b)=>a[0]-b[0]);
      let x=-W/2; const segs=[]; const cut=(a,b)=>{ if(b>a+.05) segs.push([a,b]); };
      const open=lv===0&&sd==='S'?[[-3,3]]:sd==='N'?(lv===0?[[-3,-.2]]:[[-3,3]]):[]; // hol wejściowy, schody, przejście na piętrze
      const holes=rs.map(doorGap).concat(open).sort((a,b)=>a[0]-b[0]); holes.forEach(([a,b])=>{ cut(x,a); x=b; }); cut(x,W/2);
      segs.forEach(([a,b])=>{ wallSeg(a,zw,b,zw,lv); col(a,zw-.12,b,zw+.12,lv); });
      rs.map(doorGap).forEach(([a,b])=>{ ib(wallM,(a+b)/2,lv*F+2.25,zw,b-a,F-2.25,.2); ib(doorM,a+.06,lv*F,zw+zs*.55,.05,2.2,1.0); ib(woodD,(a+b)/2,lv*F+2.2,zw,b-a+.1,.08,.26); });
      rs.forEach(r=>sign(r[4],r[1]-1.6,lv*F+2.55,zw-zs*.12,sd==='S'?Math.PI:0));
      // ściany działowe
      rs.forEach(r=>[r[0],r[1]].forEach(xb=>{ if(Math.abs(xb)>=W/2||PW.has(lv+sd+xb))return; PW.add(lv+sd+xb); const z0=sd==='S'?2:-D/2, z1=sd==='S'?D/2:-2; wallSeg(xb,z0,xb,z1,lv); col(xb-.12,z0,xb+.12,z1,lv); }));
    }));
    // klatka schodowa: bieg schodów x∈[-3,-0.2], z od -2 (parter) do -9 (piętro), podest i przejście na piętrze, schowek pod spodem
    const SN=20, SR=.35; for(let i=0;i<SN;i++){ const z=-2-(i+.5)*SR, h=(i+1)*F/SN; ib(i%2?M(0xa9a39a,0x1a1a18):M(0xb5afa6,0x1c1c1a),-1.6,0,z,2.8,h,SR); }
    wallSeg(-.2,-D/2,-.2,-2,0); col(-.3,-D/2,-.1,-2,0); col(-.3,-9,-.1,-2,1); ib(metal,-.2,F,-5.5,.06,1.0,7.0); ib(woodM,-.2,F+1.0,-5.5,.1,.06,7.0); ib(metal,-1.6,F,-2,2.8,1.0,.06); ib(woodM,-1.6,F+1.0,-2,2.8,.06,.1); col(-3,-2.12,-.2,-1.88,1);
    for(let i=0;i<SN;i+=2) ib(metal,-.35,(i+1)*F/SN,-2-(i+.5)*SR,.04,.95,.04); ib(woodM,-.35,F*.5+.95,-5.5,.06,.06,7.4); // poręcz biegu
    col(-.2,-D/2,3,-2,0); col(-3,-D/2,-.2,-9,0);
    o.floorAt=(lx,lz)=>{ if(lx>-3&&lx<-.2&&lz>-9&&lz<-2){ const i=Math.floor((-2-lz)/SR); return Math.min(F,(i+1)*F/SN); } return (st.gy||0)>1.8?F:0; };
    // strop między kondygnacjami (z otworem nad biegiem schodów) + posadzka piętra
    [[-W/2,-3,-D/2,D/2],[-.2,W/2,-D/2,D/2],[-3,-.2,-D/2,-9],[-3,-.2,-2,D/2]].forEach(([x0,x1,z0,z1])=>{ ib(slabM,(x0+x1)/2,F-.3,(z0+z1)/2,x1-x0,.3,z1-z0); const t=tileT.clone(); t.needsUpdate=true; t.repeat.set((x1-x0)/1.2,(z1-z0)/1.2); const fl=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,z1-z0).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({map:t,emissive:0x1c1c1a})); fl.position.set((x0+x1)/2,F+.006,(z0+z1)/2); fl.receiveShadow=true; g.add(fl); });
    // lampy sufitowe (korytarz i sale) na obu kondygnacjach
    [0,1].forEach(lv=>{ const y=lv?2*F-.03:F-.33; for(let x=-W/2+2;x<W/2-1;x+=3.2) ib(lightM,x,y,0,1.3,.03,.28); SCH_ROOMS.filter(r=>r[3]===lv).forEach(r=>{ const zc=r[2]==='S'?6.5:-6.5; [r[0]+(r[1]-r[0])*.33,r[0]+(r[1]-r[0])*.67].forEach(x=>[zc-2,zc+2].forEach(z=>ib(lightM,x,y,z,1.3,.03,.28))); }); if(lv===0) [[-1.5,6],[1.5,6],[-1.5,9],[1.5,9]].forEach(([x,z])=>ib(lightM,x,y,z,1.3,.03,.28)); });
    // okna w ścianach zewnętrznych i na końcach korytarza
    [0,1].forEach(lv=>{ for(let x=-W/2+1.6;x<W/2-1;x+=3.1){ [[-D/2+.03,0],[D/2-.03,Math.PI]].forEach(([z,ry])=>{ if(lv===0&&z>0&&Math.abs(x)<2.6)return; pl(g,1.9,1.7,x,lv*F+1.85,z,outM,ry); ib(steel,x,lv*F+.95,z+(z<0?.1:-.1),2.0,.05,.22); }); }
      [[-W/2+.03,Math.PI/2],[W/2-.03,-Math.PI/2]].forEach(([x,ry])=>pl(g,2.4,1.8,x,lv*F+1.85,0,outM,ry)); });
    // drzwi wejściowe: przeszklony wiatrołap w holu
    // tablice i plakaty
    const boardTex=lines=>tex(512,192,(c,w,h)=>{ c.fillStyle='#2f4a3a'; c.fillRect(0,0,w,h); c.fillStyle='rgba(255,255,255,.08)'; for(let i=0;i<40;i++) c.fillRect(Math.random()*w,Math.random()*h,30,2); c.fillStyle='rgba(250,250,245,.9)'; c.font='30px "Comic Sans MS", "Segoe Print", cursive'; (lines||[]).forEach((t,i)=>c.fillText(t,22,48+i*46)); });
    const posters=[tex(128,96,(c,w,h)=>{ c.fillStyle='#f4f1e6'; c.fillRect(0,0,w,h); const C=['#e07b39','#4aa3df','#5a9a4a','#c9a227','#c46aa8']; for(let r=0;r<6;r++)for(let k=0;k<12;k++){ if(r<1&&k>0&&k<11)continue; c.fillStyle=C[(r+k)%5]; c.fillRect(6+k*9.6,10+r*13,8,11); } }),
      tex(128,96,(c,w,h)=>{ c.fillStyle='#bfe0f0'; c.fillRect(0,0,w,h); c.fillStyle='#6fae5a'; c.beginPath(); c.moveTo(30,22); c.lineTo(80,14); c.lineTo(104,30); c.lineTo(100,70); c.lineTo(70,84); c.lineTo(34,76); c.lineTo(22,50); c.closePath(); c.fill(); c.fillStyle='#c94a3a'; c.beginPath(); c.arc(56,62,3,0,7); c.fill(); c.fillStyle='#1d3a6a'; c.font='700 11px Arial'; c.fillText('POLSKA',44,92); }),
      tex(128,96,(c,w,h)=>{ c.fillStyle='#fff6d8'; c.fillRect(0,0,w,h); c.fillStyle='#8a1c1c'; c.font='700 18px Arial'; ['Aa Bb Cc','Dd Ee Ff','Gg Hh Ii'].forEach((t,i)=>c.fillText(t,14,28+i*26)); }),
      tex(128,96,(c,w,h)=>{ c.fillStyle='#f4f1e6'; c.fillRect(0,0,w,h); c.fillStyle='#1d3a6a'; c.font='700 12px Arial'; c.fillText('TABLICZKA MNOŻENIA',8,16); c.font='11px Arial'; for(let r=1;r<6;r++) for(let k=1;k<6;k++) c.fillText(String(r*k),k*20,18+r*14); })].map(t=>new THREE.MeshBasicMaterial({map:t}));
    let KID_CTX=null;
    const kid=(lv,x,z,ry)=>{ const p=npcPerson(o,rnd()<.5,pick(PCOL),pick([0x2c3e66,0x2a2a2c,0x1e2a44,0x4a4a4a]),pick([0x2a1d14,0x6b4426,0xb08a50,0xd2b27a]),{hairStyle:pick(['short','pony','bob','short'])}); p.scale.setScalar(.8); p.position.set(x,0,z); sitPose(p,.44); p.position.y=lv*F+.44-.9*.8+.02; p.rotation.y=ry; o.npc.push({p,role:'read',t:R(0,6),st:'sit',bell:KID_CTX?{lv,xd:KID_CTX.xd,zs:KID_CTX.zs,x,z,ry,y:p.position.y}:null}); };
    SCH_ROOMS.forEach(r=>{ const [x0,x1,sd,lv,name,kind,board]=r, Y=lv*F, zs=sd==='S'?1:-1, zIn=zs*2, zOut=zs*D/2, zc=zs*6.5, cols=[5.2,7.6,10.0].map(v=>v*zs);
      KID_CTX={xd:x1-1.7,zs};
      const posterOn=(i,x)=>pl(g,1.1,.82,x,Y+1.9,zOut-zs*.03,posters[i%posters.length],sd==='S'?Math.PI:0);
      if(kind==='class'||kind==='lab'||kind==='comp'||kind==='geo'){
        pl(g,3.4,1.25,x0+.13,Y+1.65,zc,new THREE.MeshLambertMaterial({map:boardTex(board),emissive:0x0c120e}),Math.PI/2); ib(woodD,x0+.1,Y+.98,zc,.06,1.38,3.6); ib(woodD,x0+.16,Y+.98,zc,.14,.04,3.4);
        ib(woodM,x0+1.7,Y,zc+zs*2.4,.8,.76,1.5); ib(dark,x0+2.4,Y,zc+zs*2.4,.42,.46,.42); col(x0+1.2,zc+zs*1.55,x0+2.7,zc+zs*3.25,lv);
        const rows=[]; for(let x=x0+3.4;x<x1-1.7;x+=1.65) rows.push(x); const lab=kind==='lab', comp=kind==='comp';
        rows.forEach(x=>(lab?[5.2*zs,8.5*zs]:cols).forEach(z=>{ const dw=lab?1.7:1.3; ib(lab?M(0x3a3a3a,0x0a0a0a):woodM,x,Y+.72,z,.6,.05,dw); [[-.24,-dw/2+.06],[-.24,dw/2-.06],[.24,-dw/2+.06],[.24,dw/2-.06]].forEach(([a,b])=>ib(lab?steel:metal,x+a,Y,z+b,.04,.72,.04));
          [-.33,.33].forEach(o2=>{ ib(woodM,x+.52,Y+.43,z+o2,.4,.03,.4); ib(woodM,x+.72,Y+.46,z+o2,.03,.36,.4); ib(metal,x+.52,Y,z+o2,.34,.43,.04); if(comp){ ib(dark,x-.12,Y+.77,z+o2,.06,.34,.48); ib(screenM,x-.085,Y+.82,z+o2,.01,.26,.42); ib(dark,x+.08,Y+.77,z+o2,.16,.02,.36); } });
          col(x-.32,z-dw/2-.04,x+.78,z+dw/2+.04,lv); if(kind!=='comp'&&rnd()<.3) kid(lv,x+.52,z+(rnd()<.5?-.33:.33),-Math.PI/2); }));
        if(kind==='geo'){ const gl=new THREE.Mesh(new THREE.SphereGeometry(.22,16,12),new THREE.MeshLambertMaterial({map:posters[1].map,emissive:0x101010})); gl.position.set(x0+1.7,Y+1.0,zc+zs*2.1); g.add(gl); }
        if(lab){ ib(woodD,x1-.45,Y,zc,.5,2.0,3.2); ib(glassM,x1-.7,Y+.3,zc,.02,1.6,3.0); }
        posterOn(Math.abs(Math.round(x0)),(x0+x1)/2-1.2); posterOn(Math.abs(Math.round(x1))+1,(x0+x1)/2+1.4);
        if((Math.round(x0)+lv)%3===0){ const t=npcPerson(o,rnd()<.6,pick([0x7a5a8a,0x3a4a5a,0x8a3a3a]),0x2a2a2c,pick([0x8a8a8a,0x4a2e1a,0xb08a50]),{style:'coat',hairStyle:pick(['bob','short'])}); t.position.set(x0+1.1,Y,zc-zs*.6); t.rotation.y=Math.PI/2; o.npc.push({p:t,role:'clerk',t:0}); col(x0+.8,zc-zs*.6-.3,x0+1.4,zc-zs*.6+.3,lv); }
      }
      if(kind==='teach'){ const cx=(x0+x1)/2; ib(woodM,cx,Y+.74,zc,4.2,.05,1.6); [[-1.9,-.6],[1.9,-.6],[-1.9,.6],[1.9,.6]].forEach(([a,b])=>ib(woodD,cx+a,Y,zc+b,.06,.74,.06)); col(cx-2.6,zc-1.3,cx+2.6,zc+1.3,lv);
        for(let k=0;k<4;k++)[-1.1,1.1].forEach(b=>{ ib(dark,cx-1.5+k,Y+.44,zc+b,.42,.04,.42); ib(dark,cx-1.5+k,Y+.46,zc+b*1.2,.42,.4,.04); });
        ib(woodD,x0+.4,Y,zc,.55,2.1,3.6); col(x0+.1,zc-1.9,x0+.75,zc+1.9,lv); ib(steel,x1-.6,Y+.9,zOut-zs*1.4,.4,.42,.36); ib(dark,x1-.6,Y,zOut-zs*1.4,.6,.9,.6); col(x1-.95,zOut-zs*1.75,x1-.25,zOut-zs*1.05,lv);
        const t=npcPerson(o,true,0x8a3a3a,0x2a2a2c,0x6b4426,{style:'coat',hairStyle:'bob'}); t.position.set(cx-.5,0,zc+1.1*zs); sitPose(t,.46); t.position.y+=Y; t.rotation.y=sd==='S'?Math.PI:0; o.npc.push({p:t,role:'read',t:0}); posterOn(3,cx); }
      if(kind==='dyr'){ const cx=(x0+x1)/2; ib(woodD,cx,Y,zc+zs*1.4,2.0,.78,.9); col(cx-1.2,zc+zs*.9,cx+1.2,zc+zs*1.9,lv); ib(dark,cx,Y,zc+zs*2.3,.6,1.15,.6); ib(woodD,x0+.35,Y,zc,.5,2.2,3.0); ib(woodD,x1-.35,Y,zc,.5,2.2,3.0); col(x0,zc-1.6,x0+.65,zc+1.6,lv); col(x1-.65,zc-1.6,x1,zc+1.6,lv);
        const fl=new THREE.Mesh(new THREE.PlaneGeometry(.5,.32),new THREE.MeshBasicMaterial({map:tex(64,40,(c,w,h)=>{ c.fillStyle='#fff'; c.fillRect(0,0,w,h/2); c.fillStyle='#d4213d'; c.fillRect(0,h/2,w,h/2); }),side:THREE.DoubleSide})); fl.position.set(x1-1,Y+1.9,zc+zs*2.6); g.add(fl); ib(steel,x1-1.25,Y,zc+zs*2.6,.03,2.05,.03); posterOn(1,cx); }
      if(kind==='swiet'){ const cx=(x0+x1)/2; [[-2,-1.4],[1.5,-1.4],[-2,1.6],[1.5,1.6]].forEach(([a,b])=>{ ib(M(0xd8b26a,0x140e04),cx+a,Y+.6,zc+b,1.4,.04,.9); ib(metal,cx+a,Y,zc+b,.06,.6,.06); col(cx+a-.75,zc+b-.5,cx+a+.75,zc+b+.5,lv); for(let k=0;k<3;k++) ib(M([0xc0272c,0xf2c230,0x2f7a2a][k],0x0a0a0a),cx+a-.4+k*.35,Y+.64,zc+b,.2,.04,.2); });
        ib(sofa,x1-.6,Y,zc,.8,.45,3.0); ib(sofa,x1-.25,Y+.45,zc,.2,.5,3.0); col(x1-1,zc-1.6,x1,zc+1.6,lv); ib(woodD,x0+.35,Y,zc,.5,1.8,3.4); col(x0,zc-1.8,x0+.65,zc+1.8,lv); kid(lv,cx-2,zc-1.4-.7*zs,0); kid(lv,cx+1.5,zc+1.6+.7*zs,Math.PI); posterOn(2,cx); }
      if(kind==='shop'){ const cx=(x0+x1)/2, zC=6.8; // lada z gablotą, regał ze słodyczami, sprzedawczyni
        ib(M(0xd8d2c0,0x1a1a18),cx,0,zC,x1-x0-.6,.95,.6); ib(glassM,cx,.95,zC,x1-x0-.8,.35,.5); col(x0,zC-.35,x1,D/2,0);
        const sw=[0xc0272c,0x2f7aa8,0xf2c230,0x2f7a2a,0xe07b39,0x8a3aa8]; for(let k=0;k<14;k++) ib(M(sw[k%6],0x101010),x0+.7+k*.38,.96,zC+(k%2?.08:-.08),.26,.08,.18);
        ib(woodD,cx,0,D/2-.35,x1-x0-.4,2.2,.5); const sh=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0-.6,1.9),new THREE.MeshLambertMaterial({map:shelfTex('dry'),emissive:0x202020})); sh.position.set(cx,1.15,D/2-.62); sh.rotation.y=Math.PI; g.add(sh);
        pl(g,3.6,.6,cx,2.75,D/2-.64,new THREE.MeshBasicMaterial({map:signTex('SKLEPIK SZKOLNY','#e07b39','#ffffff',512,86,'800 52px Barlow, Arial')}),Math.PI);
        pl(g,1.2,1.0,x0+.14,1.7,zC-1.6,new THREE.MeshBasicMaterial({map:tex(128,108,(c,w,h)=>{ c.fillStyle='#2f4a3a'; c.fillRect(0,0,w,h); c.fillStyle='#fff'; c.font='700 12px Arial'; c.fillText('CENNIK',42,16); c.font='11px Arial'; ['Guma Turbo - 1 zł','Prince Polo - 2 zł','Drożdżówka - 3 zł','Kubuś - 3 zł','Oranżada - 1 zł','Kanapka - 5 zł'].forEach((t,i)=>c.fillText(t,8,34+i*13)); })}),Math.PI/2);
        const s=npcPerson(o,true,0xe07b39,0x2a2a2c,0x8a5a3a,{style:'coat',hairStyle:'bob'}); s.position.set(cx,0,zC+.75); s.rotation.y=Math.PI; o.npc.push({p:s,role:'clerk',t:0}); o.counter=[cx,zC-.95]; }
    });
    // korytarz: ławki, donice, gablota z pucharami, gazetka szkolna, szafki
    [-15,-6.5,7,15.5].forEach((x,i)=>[0,1].forEach(lv=>{ const z=(i===1?-1:1)*1.62; ib(woodM,x,lv*F+.42,z,1.8,.05,.38); ib(metal,x-.8,lv*F,z,.05,.42,.34); ib(metal,x+.8,lv*F,z,.05,.42,.34); col(x-.95,z-.22,x+.95,z+.22,lv); }));
    [[-19.5,.9],[19.5,-.9],[-19.5,-.9],[19.5,.9]].forEach(([x,z])=>[0,1].forEach(lv=>{ const pot=new THREE.Mesh(new THREE.CylinderGeometry(.25,.2,.45,10),M(0xb06a3a,0x140804)); pot.position.set(x,lv*F+.22,z); g.add(pot); const pl2=new THREE.Mesh(new THREE.SphereGeometry(.42,8,6),M(0x3f7a3a,0x08100a)); pl2.position.set(x,lv*F+.85,z); pl2.scale.y=1.3; g.add(pl2); col(x-.3,z-.3,x+.3,z+.3,lv); }));
    ib(woodD,2.5,0,9.2,.45,1.9,1.8); ib(glassM,2.24,.2,9.2,.02,1.6,1.7); [8.6,9.2,9.8].forEach((z,k)=>{ const cup=new THREE.Mesh(new THREE.CylinderGeometry(.08,.05,.26,10),M(0xd8b030,0x2a2000)); cup.position.set(2.5,1.0+k%2*.5,z); g.add(cup); }); col(2.2,8.2,3,10.2,0);
    pl(g,3.0,.75,1.4,2.45,-1.87,new THREE.MeshBasicMaterial({map:signTex('SZKOŁA PODSTAWOWA','#1d3a6a','#ffffff',512,128,'800 60px Barlow, Arial')}),0);
    pl(g,2.4,1.2,-8,1.6,-1.89,new THREE.MeshBasicMaterial({map:tex(256,128,(c,w,h)=>{ c.fillStyle='#c9a26a'; c.fillRect(0,0,w,h); c.fillStyle='#1d3a6a'; c.font='700 20px Barlow, Arial'; c.fillText('GAZETKA SZKOLNA',58,24); [[12,36,'#f4f1e6'],[92,40,'#bfe0f0'],[172,34,'#fff6d8'],[30,82,'#e8c8d8'],[120,84,'#f4f1e6']].forEach(([x,y,cl])=>{ c.fillStyle=cl; c.fillRect(x,y,70,38); }); })}),0);
    for(let x=11.5;x<16.6;x+=.62) ib(M(0x5a7a9a,0x0a0e14),x,F,-1.78,.58,1.75,.4); col(11.2,-2,16.8,-1.55,1);
    // spacerujący uczniowie i woźny
    const wl=(lv,path,sc)=>{ const n=addWalker(o,path,null); n.p.position.y=lv*F; if(sc) n.p.scale.setScalar(sc); };
    wl(0,[[-18,.4],[17,.4]],.82); wl(0,[[16,-.6],[-12,-.6],[-1.6,-1.2]],.82); wl(1,[[-18,.3],[18,.3]],.82); wl(1,[[17,-.5],[1.5,-.5],[1.5,-9.8]],null);
    const wz=npcPerson(o,false,0x3a5a3a,0x2a2c30,0x8a8a8a,{style:'jacket',hairStyle:'cap',capC:0x2a3a2a}); wz.position.set(-2.2,0,4.5); wz.rotation.y=Math.PI/2; o.npc.push({p:wz,role:'stand',t:0}); col(-2.5,4.2,-1.9,4.8,0);
    const ubox=new THREE.BoxGeometry(1,1,1).translate(0,.5,0), dm=new THREE.Object3D();
    IB.forEach((arr,mat)=>{ const im=new THREE.InstancedMesh(ubox,mat,arr.length); arr.forEach((a,i)=>{ dm.position.set(a[0],a[1],a[2]); dm.rotation.set(0,a[6],0); dm.scale.set(a[3],a[4],a[5]); dm.updateMatrix(); im.setMatrixAt(i,dm.matrix); }); im.receiveShadow=true; if(mat.transparent){ im.renderOrder=2; } g.add(im); }); }
  function buildRoom(o){ if(o.built)return; o.built=true; ({home:homeInterior,school:schoolInterior,shop:shopInterior,zabka:zabkaInterior,counter:counterInterior,pharm:pharmInterior,clinic:clinicInterior,rest:restInterior,church:churchInterior,lib:libInterior})[o.kind](o); o.g.traverse(q=>{ if(q.isMesh&&q.geometry.type==='BoxGeometry'){ q.castShadow=true; q.receiveShadow=true; } }); }
  // wejścia z zewnątrz
  const ENTS=[]; let DOOR_ENT=null;
  ENTS.push({label:'Lewiatana',get p(){ return SHOPS[0].p; },get f(){ return B_LEW.doorF; },get n(){ return [B_LEW.front.nx,B_LEW.front.nz]; },enter:()=>enterStore()});
  function addEnt(room,label,p,n){ const nl=Math.hypot(n[0],n[1])||1; n=[n[0]/nl,n[1]/nl]; const e={label,room,p,n,f:[p[0]-n[0]*1.4,p[1]-n[1]*1.4]}; e.enter=()=>enterRoom(e); ENTS.push(e); room.ent=e; return e; }
  function entFromShop(shopName,room,label,center){ const s=SHOPS.find(q=>q.n===shopName); if(!s)return; s.room=room; const p=s.p; const n=[p[0]-center[0],p[1]-center[1]]; addEnt(room,label,p,n); room.items=s.items; room.shopName=s.n; }
  const logoT=(bg,fg,txt,font)=>tex(512,128,(c,w,h)=>{ c.fillStyle=bg; c.fillRect(0,0,w,h); c.fillStyle=fg; c.font=font||'800 74px Barlow, Arial'; c.textAlign='center'; c.textBaseline='middle'; c.fillText(txt,w/2,h/2+4); });
  { const r=defRoom({kind:'zabka',W:12,D:10,HT:3.6,doorX:1.0,col:0x1a8a3a,wall:0xe6e6e2,floor:'#cfcdc6',wallE:0x121212,floorE:0x0c0c0c,noLights:true,logoW:2.4,logoX:3.4,logoY:2.6,walkers:2,logo:logoT('#1a8a3a','#ffffff','żabka')}); entFromShop('Żabka',r,'Żabki',[B_ZAB.x,B_ZAB.z]); }
  // (Delikatesy Premium - sklep zamknięty, bez wejścia)
  { const r=defRoom({kind:'pharm',W:10,D:9,HT:3.7,logoW:3.4,logoY:3.08,col:0x2a9a5a,wall:0xaebdb2,floor:'#8f877b',ceil:0xc9c9c3,ceilE:0x161615,wallE:0x0e100e,floorE:0x0c0b0a,walkers:1,logo:logoT('#1b2a22','#57d68d','✚ APTEKA MAGNOLIA','700 50px Barlow, Arial')}); const a=typeof APT!=='undefined'&&APT?centroid(APT.pts):[-100,-200]; if(APT_DOORS){ const sh=SHOPS.find(q=>q.n==='Apteka Magnolia'); if(sh){ sh.p=APT_DOORS.pharm; sh.room=r; addEnt(r,'apteki',APT_DOORS.pharm,APT_DOORS.n); r.items=sh.items; r.shopName=sh.n; } } else entFromShop('Apteka Magnolia',r,'apteki',a); }
  const CLINIC_ROOM=defRoom({kind:'clinic',W:12,D:10,HT:3.4,col:0x2f7fbf,wall:0xa3b0b4,floor:'#7d878b',ceil:0xc9c9c3,ceilE:0x161615,wallE:0x0e100e,floorE:0x0c0b0a,walkers:1,logo:logoT('#ffffff','#2f7fbf','✚ OŚRODEK ZDROWIA','700 52px Barlow, Arial')});
  if(APT_DOORS) addEnt(CLINIC_ROOM,'ośrodka zdrowia',APT_DOORS.clinic,APT_DOORS.n); CLINIC_ROOM.title='Ośrodek zdrowia';
  { const r=defRoom({kind:'rest',W:14,D:12,col:0xd8261e,logo:logoT('#d8261e','#ffffff','EUFORIA')}); entFromShop('Euforia Trębaczew',r,'Euforii',[-146,-356]); }
  // kościół: drzwi od strony ulicy
  const CHURCH_ROOM=defRoom({kind:'church',W:16,D:30,HT:13,col:0x8a1c1c,noLights:false,doorX:0});
  { const P=CHURCH.pts, c=centroid(P); let best=null; for(let i=0;i<P.length;i++){ const a=P[i], b=P[(i+1)%P.length], L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L<4)continue; const m=[(a[0]+b[0])/2,(a[1]+b[1])/2]; const d=nearestRoad(m[0],m[1],r=>r.t!=='track').d; if(!best||d<best.d){ let n=[-(b[1]-a[1])/L,(b[0]-a[0])/L]; if((m[0]-c[0])*n[0]+(m[1]-c[1])*n[1]<0) n=[-n[0],-n[1]]; best={d,m,n}; } }
    if(CHURCH_DOOR){ const p0=CHURCH_DOOR.p, m=mar(CHURCH.pts), c=centroid(CHURCH.pts); let n=[p0[0]-m.cx,p0[1]-m.cz]; const l=Math.hypot(n[0],n[1]); n=[n[0]/l,n[1]/l]; addEnt(CHURCH_ROOM,'kościoła',[p0[0]+n[0]*1.4,p0[1]+n[1]*1.4],n); }
    else if(best) addEnt(CHURCH_ROOM,'kościoła',[best.m[0]+best.n[0]*1.6,best.m[1]+best.n[1]*1.6],best.n); }
  function churchDoorUpdate(dt){ const D=CHURCH_DOOR; if(!D)return; const near=!st.inside&&Math.hypot(st.x-D.p[0],st.z-D.p[1])<4.2&&(st.gy||0)>.5; const tgt=near?1:0; if(Math.abs(D.cur-tgt)<.002)return; D.cur+=(tgt-D.cur)*Math.min(1,dt*4); D.leaves.forEach(l=>l.piv.rotation.y=l.sd*D.cur*1.35); }
  // biblioteka (filia w Trębaczewie)
  const LIB_ROOM=defRoom({kind:'lib',W:14,D:12,col:0x2a5a8a,logo:logoT('#2a5a8a','#ffffff','BIBLIOTEKA','700 64px Barlow, Arial')});
  LIB_ROOM.items=[['„Pan Tadeusz” - A. Mickiewicz',0,'book',0],['„Lalka” - B. Prus',0,'book',0],['„Quo vadis” - H. Sienkiewicz',0,'book',0],['„Chłopi” - W. Reymont',0,'book',0],['„W pustyni i w puszczy” - H. Sienkiewicz',0,'book',0],['„Krzyżacy” - H. Sienkiewicz',0,'book',0]]; LIB_ROOM.shopName='Biblioteka'; LIB_ROOM.sub='Wypożyczalnia · książki za darmo';
  { const lb=BLD.filter(b=>Math.hypot(b.x+136,b.z+124)<14).sort((a,b)=>Math.hypot(a.x+136,a.z+125)-Math.hypot(b.x+136,b.z+125))[0]; if(lb){ const nr=nearestRoad(lb.x,lb.z,r=>r.t!=='track'); const f=frontSide(lb,nr.r); addEnt(LIB_ROOM,'biblioteki',[f.x+f.nx*1.6,f.z+f.nz*1.6],[f.nx,f.nz]); } }
  // szkoła podstawowa: wejście głównymi drzwiami w ganku od północy (model szkola, drzwi w x≈-4.25, z≈11.3 w układzie modelu)
  const SCHOOL_ROOM=defRoom({kind:'school',W:40,D:22,HT:2*SCH_F,doorX:0,col:0xe07b39,wall:0xece6d4,floor:'#b0a898',ceil:0xf0f0ec,ceilE:0x4c4c4a,wallE:0x2c2b26,floorE:0x1c1c1a,levels:2}); SCHOOL_ROOM.title='Szkoła Podstawowa w Trębaczewie';
  SCHOOL_ROOM.items=[['Guma Turbo',1,'turbo',0],['Prince Polo',2,'hp',10],['Drożdżówka z serem',3,'hp',20],['Sok Kubuś',3,'hp',12],['Oranżada w proszku',1,'boost',30],['Kanapka z szynką',5,'hp',30]]; SCHOOL_ROOM.shopName='Sklepik szkolny'; SCHOOL_ROOM.sub='Pani Krysia · przerwa trwa 10 minut';
  if(SCHOOL_M){ const {cx,cz,an}=SCHOOL_M, c=Math.cos(an), sn=Math.sin(an), W0=(x,z)=>[cx+x*c-z*sn,cz+x*sn+z*c]; addEnt(SCHOOL_ROOM,'szkoły',W0(-4.25,13.1),[-sn,c]); if(SCHOOL_DOOR2){ const e1=SCHOOL_ROOM.ent; addEnt(SCHOOL_ROOM,'szkoły (drugie wejście)',SCHOOL_DOOR2.p,SCHOOL_DOOR2.n); SCHOOL_ROOM.ent=e1; } if(SCHOOL_DOOR3){ const e1=SCHOOL_ROOM.ent; addEnt(SCHOOL_ROOM,'szkoły (trzecie wejście)',SCHOOL_DOOR3.p,SCHOOL_DOOR3.n); SCHOOL_ROOM.ent=e1; } }
  const SCH_SPOT={teach:[-6.2,3.6,1],k1a:[-18,7.3,0],board:[-19.2,6.5,0],shop:[-6,5.8,0]};
  function roomShopObj(o){ if(!o.items||!o.counter)return null; return {n:o.shopName||'Sklep',sub:o.sub,get p(){ return [o.x+o.counter[0],o.z+o.counter[1]]; },items:o.items}; }
  function enterRoom(e){ if(st.car||st.inside)return; if(e.room.kind==='home'&&!DONE.has('m20')){ toast('To dom na sprzedaż. Kupisz go w ostatniej misji „Własny kąt” (450 000 zł).',3.5); return; } if(st.wanted>0){ toast('Policja Cię ściga - nie wejdziesz teraz do środka',2.5); return; } const o=e.room; if(!o.built&&!modelsOk(ROOM_NEEDS[o.kind])&&!MODELS_SKIP){ waitModels(ROOM_NEEDS[o.kind],()=>{ MODELS_SKIP=true; enterRoom(e); MODELS_SKIP=false; }); return; } IN.lastSwap=tAll;
    fadeTo(()=>{ buildRoom(o); o.shop=roomShopObj(o); o.ret={x:e.p[0]+e.n[0]*1.6,z:e.p[1]+e.n[1]*1.6,yaw:Math.atan2(-e.n[0],-e.n[1]),face:Math.atan2(e.n[0],e.n[1])}; o.doorW=[o.x+o.doorX,o.z+o.D/2-.6]; o.worldPos=e.p;
      CUR=o; st.inside=true; o.g.visible=true; st.gy=0; st.jy=0; st.vy=0; st.x=o.x+o.doorX; st.z=o.z+o.D/2-2.2; if(curBlocked(st.x,st.z,.4)){ let ok=false; for(let r=.4;r<5&&!ok;r+=.3) for(let a2=0;a2<6.28&&!ok;a2+=.4){ const x=st.x+Math.cos(a2)*r, z=st.z+Math.sin(a2)*r; if(!curBlocked(x,z,.4)){ st.x=x; st.z=z; ok=true; } } } st.vx=st.vz=0; st.yaw=0; st.face=Math.PI; st.pitch=.22; st.dist=Math.min(st.dist,3.4); st.distS=st.dist; if(st.mode===2) st.mode=0;
      locMain.textContent=o.title||e.label; locSub.textContent='wnętrze'; locEl.classList.add('on'); locTimer=3; }); }
  function exitRoom(){ const o=CUR; if(o===IN){ exitStore(); return; } IN.lastSwap=tAll; fadeTo(()=>{ lampPool.forEach(l=>{ l.color.set(0xffc070); l.distance=26; }); st.inside=false; o.g.visible=false; const r=o.ret; st.x=r.x; st.z=r.z; if(blocked(st.x,st.z,.45)){ const q=walkSpot([st.x,st.z],false); st.x=q[0]; st.z=q[1]; } st.yaw=r.yaw; st.face=r.face; st.vx=st.vz=0; st.gy=stairAt(st.x,st.z); st.jy=0; st.vy=0; if(SHOP_OPEN) closeShop(); CUR=IN; }); }
  function roomsUpdate(dt){ if(!st.inside||CUR===IN||!CUR.built)return; const o=CUR;
    if(o.kind==='school'){ o.bellT=(o.bellT===undefined?20:o.bellT)-dt; if(o.bellT<=0){ o.bellT=R(70,110); o.npc.forEach(c=>{ if(c.bell&&c.st==='sit'&&rnd()<.7){ const B=c.bell; c.st='out'; c.pi=0; c.wt=R(16,28); c.p.position.y=B.lv*SCH_F; c.path=[[B.x,B.z],[B.xd,B.zs*3.0],[B.xd,B.zs*1.2],[B.xd+R(-4,4),R(-.9,.9)]]; } }); if(AU.ctx&&AU.on) sfx.schoolBell(); toast(pick(['🔔 Dzwonek - przerwa!','🔔 Dzwonek na lekcję','🔔 Dzwonek! Uczniowie wybiegają na korytarz']),2.2); } }
    o.npc.forEach(c=>{ c.t=(c.t||0)+dt; const u=c.p.userData;
      if(c.bell&&c.st!=='sit'){ if(c.st==='wait'){ c.wt-=dt; animPerson(c.p,0,0); if(c.wt<=0){ c.st='back'; c.path=c.path.slice().reverse(); c.pi=0; } return; }
        const tg=c.path[c.pi+1]; if(!tg){ if(c.st==='back'){ c.st='sit'; const B=c.bell; c.p.position.set(B.x,B.y,B.z); c.p.rotation.y=B.ry; sitPose(c.p,.44); c.p.position.y=B.y; } else c.st='wait'; return; }
        const dx=tg[0]-c.p.position.x, dz=tg[1]-c.p.position.z, dd=Math.hypot(dx,dz), sp=1.5*dt; if(dd<=sp){ c.p.position.x=tg[0]; c.p.position.z=tg[1]; c.pi++; } else { c.p.position.x+=dx/dd*sp; c.p.position.z+=dz/dd*sp; c.p.rotation.y=Math.atan2(dx,dz); c.walkK=(c.walkK||0)+dt*5; animPerson(c.p,c.walkK,1); } return; }
      if(c.role==='cash'){ u.aR.rotation.x=-1.0+Math.sin(c.t*3.2)*.45; u.aL.rotation.x=-.7; u.eR.rotation.x=u.eL.rotation.x=-.8; return; }
      if(c.role==='clerk'){ u.aR.rotation.x=-.5+Math.sin(c.t*1.3)*.3; u.eR.rotation.x=-.9; return; }
      if(c.role==='stand'){ if(c.pay) u.aR.rotation.x=-.9+Math.sin(c.t*4)*.3; else c.p.rotation.y+=Math.sin(c.t*.5)*.002; return; }
      if(c.role==='eat'){ const s=(c.t%5)<1.2; u.aR.rotation.x+=((s?-2.0:-.7)-u.aR.rotation.x)*Math.min(1,dt*4); u.eR.rotation.x=-1.0; return; }
      if(c.role==='read'){ u.aL.rotation.x=u.aR.rotation.x=-.9; u.eL.rotation.x=u.eR.rotation.x=-1.1; return; }
      if(c.role==='pray'){ u.aL.rotation.x=u.aR.rotation.x=-.6; u.eL.rotation.x=u.eR.rotation.x=-1.3; return; }
      if(c.role==='priest'){ const up=(c.t%10)<4; u.aL.rotation.x=u.aR.rotation.x=up?-2.2:-.4; u.aL.rotation.z=-.5; u.aR.rotation.z=.5; return; }
      if(c.role==='walk'){ if(c.wait>0){ c.wait-=dt; animPerson(c.p,0,0); return; } const L=c.len[c.len.length-1]; c.d+=c.dir*1.05*dt; if(c.d>L){ c.d=L; c.dir=-1; c.wait=R(1,3); } if(c.d<0){ c.d=0; c.dir=1; c.wait=R(1,3); } if(rnd()<dt*.08) c.wait=R(1.5,4);
        const s=sampleLine(c.path,c.len,c.d); c.p.position.x=s.x; c.p.position.z=s.z; c.p.rotation.y=Math.atan2(s.tx*c.dir,s.tz*c.dir); c.walk+=dt*3.4; animPerson(c.p,c.walk,1); } });
    if(o.kind==='school'){ const L1=(st.gy||0)>1.8, ly=o.y+(L1?2*SCH_F:SCH_F-.3)-.4; lampPool.forEach((l,i)=>{ if(i<6){ const gx=Math.round((st.x-o.x)/6)*6+((i%3)-1)*6, gz=(Math.floor(i/3)?-5:5); l.position.set(o.x+clamp(gx,-17,17),ly,o.z+gz); l.intensity=.55; l.distance=13; l.color.set(0xfff6e8); } else l.intensity=0; }); }
    else { const n=o.kind==='church'?4:6; lampPool.forEach((l,i)=>{ if(i<n){ l.position.set(o.x-o.W/3+(i%3)*o.W/3,o.y+o.HT-.5,o.z-o.D/3+Math.floor(i/3)*o.D/1.6); l.intensity=o.kind==='church'?1.1:(o.kind==='pharm'||o.kind==='clinic')?.45:.95; l.distance=Math.max(16,Math.max(o.W,o.D)*.75); l.color.set(o.kind==='church'?0xffd9a0:o.kind==='pharm'?0xffeed6:0xffffff); } else l.intensity=0; }); }
    if(typeof PARTS!=='undefined') PARTS.visible=false; }

  /* ---------- Działoszyn: ORLEN (Piłsudskiego 75), Biedronka, Lidl ---------- */
  let ORLEN=null;
  const FUEL={pb95:6.48,on:8.15,lpg:3.71,pb98:7.32,date:'2026-11-01',src:'ceny maksymalne (Monitor Polski) / średnie BM Reflex'};
  const pylonTexs=[];
  function drawPylon(c,w,h){ c.fillStyle='#d8141c'; c.fillRect(0,0,w,h); c.fillStyle='#fff'; c.font='800 64px Barlow, Arial'; c.textAlign='center'; c.fillText('ORLEN',w/2,70); c.fillStyle='#111'; c.fillRect(14,96,w-28,h-110);
    const rows=[['Pb95',FUEL.pb95],['ON',FUEL.on],['LPG',FUEL.lpg],['Pb98',FUEL.pb98]]; c.textAlign='left'; rows.forEach(([n,v],i)=>{ const y=150+i*78; c.fillStyle='#fff'; c.font='700 40px Barlow, Arial'; c.fillText(n,28,y); c.fillStyle='#ffb000'; c.font='700 56px monospace'; c.textAlign='right'; c.fillText(v.toFixed(2).replace('.',','),w-28,y+4); c.textAlign='left'; }); }
  function refreshPylons(){ pylonTexs.forEach(t=>{ const c=t.image, x=c.getContext('2d'); drawPylon(x,c.width,c.height); t.needsUpdate=true; }); }
  function faceTo(b,tx,tz){ const c=Math.cos(b.a), s=Math.sin(b.a); let best=null; [[1,0],[-1,0],[0,1],[0,-1]].forEach(([u,v])=>{ const nx=u*c-v*s, nz=u*s+v*c; const ex=b.x+(u*b.w/2)*c-(v*b.d/2)*s, ez=b.z+(u*b.w/2)*s+(v*b.d/2)*c; const d=Math.hypot(ex-tx,ez-tz); if(!best||d<best.d) best={d,x:ex,z:ez,nx,nz,len:u?b.d:b.w,dep:u?b.w:b.d,rot:Math.atan2(nx,nz)}; }); return best; }
  if(CB.orlenShop&&CB.orlenRoof){ const S=CB.orlenShop, Rf=CB.orlenRoof; const red=new THREE.MeshLambertMaterial({color:0xd8141c}), wh=new THREE.MeshLambertMaterial({color:0xf4f4f2}), gr=new THREE.MeshLambertMaterial({color:0x4a4e52}), glass=new THREE.MeshPhongMaterial({map:glassTex,shininess:110});
    const conc=po(new THREE.MeshLambertMaterial({color:0xa9a7a2,map:detailTex}),4);
    // plac z kostki pod stacją
    { const cx=(S.x+Rf.x)/2, cz=(S.z+Rf.z)/2, a=Rf.a; const W0=L2W(cx,cz,-a); drape([[-32,-22],[32,-22],[32,22],[-32,22]].map(([u,v])=>W0(u,v)),conc,0.11,2.2); }
    // wiata: biały daszek z czerwonym pasem, 4 słupy, 3 wyspy z dystrybutorami
    const g=new THREE.Group(); g.position.set(Rf.x,H(Rf.x,Rf.z),Rf.z); g.rotation.y=-Rf.a; scene.add(g); const L=Math.max(Rf.w,Rf.d)+3, Wd=Math.min(Rf.w,Rf.d)+3, alongX=Rf.w>=Rf.d;
    const cg=new THREE.Group(); if(!alongX) cg.rotation.y=Math.PI/2; g.add(cg);
    bx(cg,L,.5,Wd,0,5.0,0,wh); bx(cg,L+.1,.55,Wd+.1,0,5.25,0,red,true); const logo=tex(512,96,(c,w,h)=>{ c.fillStyle='#d8141c'; c.fillRect(0,0,w,h); c.fillStyle='#fff'; c.font='800 70px Barlow, Arial'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('ORLEN',w/2,h/2+3); });
    const logos=[[0,-Wd/2-.06,Math.PI],[0,Wd/2+.06,0]].map(([u,v,r])=>pl(cg,6,.55,u,5.52,v,new THREE.MeshBasicMaterial({map:logo}),r));
    [[-L/2+2,-Wd/2+1.6],[L/2-2,-Wd/2+1.6],[-L/2+2,Wd/2-1.6],[L/2-2,Wd/2-1.6]].forEach(([u,v])=>bx(cg,.45,5,.45,u,0,v,wh)); const cgBody=cg.children.filter(c=>!logos.includes(c));
    swapIn(cg,'orlen_wiata',cgBody,{sx:L/18,sz:Wd/12,after:()=>logos.forEach((m,i)=>{ m.position.y=5.65; m.position.z=(i?1:-1)*(Wd/2+.12); })});
    const pumps=[]; [-L/3,0,L/3].forEach(u=>{ bx(cg,1.2,.25,3.6,u,0,0,new THREE.MeshLambertMaterial({color:0xc8c8c4})); bx(cg,.8,1.8,.5,u,.25,0,red); bx(cg,.82,.5,.52,u,1.6,0,wh); const sc=tex(64,64,(c)=>{ c.fillStyle='#111'; c.fillRect(0,0,64,64); c.fillStyle='#7fe0ff'; c.font='700 18px monospace'; c.fillText('00.00',6,28); c.fillText('PLN',14,52); }); [-1,1].forEach(sd=>pl(cg,.5,.4,u,1.25,sd*.26,new THREE.MeshBasicMaterial({map:sc}),sd<0?Math.PI:0));
      const q=new THREE.Vector3(u,0,0); q.applyAxisAngle(new THREE.Vector3(0,1,0),cg.rotation.y-Rf.a); pumps.push([Rf.x+q.x,Rf.z+q.z]); });
    g.traverse(o=>{ if(o.isMesh&&o.geometry.type!=='PlaneGeometry') o.castShadow=true; });
    pumps.forEach(p=>addSolid({x:p[0],z:p[1],hw:.5,hd:.5,c:1,s:0,r:.8}));
    // budynek stacji: biały z czerwonym pasem, przeszklone wejście od strony wiaty
    const f=faceTo(S,Rf.x,Rf.z); const sg=new THREE.Group(); sg.position.set(S.x,S.hc||H(S.x,S.z),S.z); sg.rotation.y=f.rot; scene.add(sg); const low=(S.hmin||H(S.x,S.z))-.4-(S.hc||H(S.x,S.z));
    bx(sg,f.len,4.2-low,f.dep,0,low,0,new THREE.MeshLambertMaterial({color:0xf2f2ee,map:plasterTex})); bx(sg,f.len+.1,.7,f.dep+.1,0,3.5,0,red); bx(sg,f.len+.3,.2,f.dep+.3,0,4.2,0,gr);
    pl(sg,f.len*.5,2.3,-f.len*.15,1.3,f.dep/2+.02,glass); const sgN=sg.children.length; pl(sg,3,.62,-f.len*.15,3.85,f.dep/2+.08,new THREE.MeshBasicMaterial({map:logo})); const cafe=tex(256,64,(c,w,h)=>{ c.fillStyle='#3a2a1e'; c.fillRect(0,0,w,h); c.fillStyle='#fff'; c.font='700 34px Barlow, Arial'; c.fillText('STOP CAFE',20,44); }); pl(sg,2.2,.5,f.len*.28,2.6,f.dep/2+.08,new THREE.MeshBasicMaterial({map:cafe}));
    sg.traverse(o=>{ if(o.isMesh&&o.geometry.type!=='PlaneGeometry') o.castShadow=true; }); swapIn(sg,'orlen_sklep',sg.children.slice(0,sgN),{sx:f.len/13,sz:f.dep/12.5,low,L:f.len,D:f.dep});
    const tx=-f.nz, tz=f.nx; const door=[f.x+tx*(-f.len*.15)+f.nx*1.8,f.z+tz*(-f.len*.15)+f.nz*1.8];
    // pylon z cenami przy DK42
    { const nr=nearestRoad(Rf.x,Rf.z,r=>r===DK); const a=DK.pts[nr.seg],b=DK.pts[nr.seg+1]; const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz); const t=clamp(((Rf.x-a[0])*dx+(Rf.z-a[1])*dz)/(l*l),0,1); const px=a[0]+dx*t,pz=a[1]+dz*t; let nx=Rf.x-px,nz=Rf.z-pz; const nl=Math.hypot(nx,nz)||1; nx/=nl; nz/=nl;
      const x=px+nx*(DK.w/2+3.5)+dx/l*6, z=pz+nz*(DK.w/2+3.5)+dz/l*6; const py=new THREE.Group(); py.position.set(x,H(x,z),z); py.rotation.y=Math.atan2(-nx,-nz)+Math.PI; scene.add(py); bx(py,.5,1,.5,0,0,0,gr); bx(py,1.9,8.2,.5,0,0,0,red);
      const c=document.createElement('canvas'); c.width=256; c.height=420; const t2=new THREE.CanvasTexture(c); pylonTexs.push(t2); drawPylon(c.getContext('2d'),256,420); [-1,1].forEach(sd=>pl(py,1.8,2.95,0,6.4,sd*.26,new THREE.MeshBasicMaterial({map:t2}),sd<0?Math.PI:0)); addSolid({x,z,hw:1,hd:.3,c:Math.cos(py.rotation.y),s:-Math.sin(py.rotation.y),r:1.1}); }
    ORLEN={x:Rf.x,z:Rf.z,pumps,pump:pumps[1],shop:door};
    POIS.push({n:'ORLEN Działoszyn',x:Rf.x,z:Rf.z,p:[Rf.x,Rf.z],c:'#d8141c',ic:'⛽',sp:labelSprite('ORLEN Działoszyn','#d8141c')}); { const lp=POIS[POIS.length-1]; lp.sp.position.set(Rf.x,H(Rf.x,Rf.z)+9,Rf.z); lp.sp.visible=false; scene.add(lp.sp); }
    const r=defRoom({kind:'counter',W:14,D:9,col:0xd8141c,uni:0xd8141c,walkers:2,logo:logoT('#d8141c','#ffffff','ORLEN · STOP CAFE','800 56px Barlow, Arial'),extra:(o,g2)=>{ bx(g2,.8,1.5,.7,-o.W/2+2.2,1,-o.D/2+2.4,new THREE.MeshLambertMaterial({color:0x2b2b2b})); const hd=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.9,8).rotateZ(Math.PI/2),new THREE.MeshLambertMaterial({color:0xc06a3a})); for(let k=0;k<5;k++){ const h2=hd.clone(); h2.position.set(o.W*.1+1.6,1.12,-o.D/2+2.2+k*.12); g2.add(h2); } }});
    r.items=[['Hot-dog',9,'hp',40],['Kawa z ekspresu',8,'hp',20],['Kanister 5 l (benzyna)',45,'canister',5],['Płyn do spryskiwaczy',15,'hp',0],['Hot-dog XXL',14,'hp',60]]; r.shopName='ORLEN';
    addEnt(r,'stacji ORLEN',door,[f.nx,f.nz]); r.title='ORLEN Działoszyn'; }
  function bigStore(b,o){ const nr=nearestRoad(b.x,b.z,r=>r.t!=='track'&&r.t!=='srv'); const f0=frontSide(b,nr.r); const off=o.doorK!==undefined?f0.len*o.doorK:-(f0.len*.22); const f=brandShop(b,Object.assign({road:nr.r,glass:.45,doorOff:off,canopy:7,apron:8},o)); const tx=-f.nz, tz=f.nx;
    return {p:[f.x+tx*off+f.nx*1.8,f.z+tz*off+f.nz*1.8],n:[f.nx,f.nz],f}; }
  if(CB.biedr){ const e=bigStore(CB.biedr,{h:6,wall:'#f3f1ec',roof:'#5b6066',text:'Biedronka',sign:'#e30613',signText:'#ffd500',stripe:'#ffd500',font:'800 92px Barlow, Arial',canopyCol:0xe30613,extras:[{u:8,v:2.5,mesh:cartRow}],
      model:'biedronka',mL:37.5,mD:42.5,doorK:0,hideDoor:true,signY:4.6,signW:9.4,signH:.85,signOut:1.09});
    { const f=e.f, q=[f.x+f.nx*.5,f.z+f.nz*.5]; addSolid({x:q[0],z:q[1],hw:5*f.len/37.5,hd:.6,c:Math.cos(-f.rot),s:Math.sin(-f.rot),r:5.2}); }
    const r=defRoom({kind:'shop',W:30,D:22,col:0xe30613,rows:6,checkouts:3,walkers:6,basket:0xe30613,logo:logoT('#e30613','#ffd500','Biedronka')}); r.items=[['Bułki (6 szt.)',4,'hp',15],['Jabłka 1 kg',5,'hp',20],['Woda 1,5 l',2,'hp',10],['Piwo',4,'piwo',0],['Czekolada',5,'hp',15],['Energetyk',4,'boost',60]]; r.shopName='Biedronka'; addEnt(r,'Biedronki',e.p,e.n); r.title='Biedronka';
    POIS.push({n:'Biedronka',x:e.p[0],z:e.p[1],p:e.p,c:'#e30613',ic:'B',sp:labelSprite('Biedronka','#e30613')}); { const lp=POIS[POIS.length-1]; lp.sp.position.set(e.p[0],H(e.p[0],e.p[1])+9,e.p[1]); lp.sp.visible=false; scene.add(lp.sp); } }
  if(CB.lidl){ const e=bigStore(CB.lidl,{h:6.5,wall:'#d6d9dc',roof:'#4d5257',text:'LIDL',sign:'#0050aa',signText:'#ffe500',stripe:'#e60a14',font:'900 96px Barlow, Arial',canopyCol:0x8a9096,
      model:'lidl',mL:67,mD:31.5,doorK:.2,signY:7.15,signW:22,signH:1.1,signX:-12});
    { const f=e.f, tx=-f.nz, tz=f.nx, k=f.len/67; for(let x=-67/2+4;x<6.7;x+=8){ const lx=x*k; const q=[f.x-tx*lx+f.nx*3.77,f.z-tz*lx+f.nz*3.77]; addSolid({x:q[0],z:q[1],hw:.25,hd:.25,c:1,s:0,r:.4}); } }
    { const x=e.p[0]+e.n[0]*14-e.n[1]*10, z=e.p[1]+e.n[1]*14+e.n[0]*10; const py=new THREE.Group(); py.position.set(x,H(x,z),z); scene.add(py); bx(py,.4,7,.4,0,0,0,new THREE.MeshLambertMaterial({color:0x6a6e72}));
      const lt=tex(256,256,(c,w,h)=>{ c.fillStyle='#0050aa'; c.fillRect(0,0,w,h); c.fillStyle='#ffe500'; c.beginPath(); c.arc(w/2,h/2,100,0,7); c.fill(); c.strokeStyle='#e60a14'; c.lineWidth=8; c.stroke(); c.fillStyle='#0050aa'; c.font='900 78px Barlow, Arial'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('LIDL',w/2,h/2+4); });
      const bxm=new THREE.Mesh(new THREE.BoxGeometry(2.6,2.6,.4),[new THREE.MeshLambertMaterial({color:0x0050aa}),new THREE.MeshLambertMaterial({color:0x0050aa}),new THREE.MeshLambertMaterial({color:0x0050aa}),new THREE.MeshLambertMaterial({color:0x0050aa}),new THREE.MeshLambertMaterial({map:lt}),new THREE.MeshLambertMaterial({map:lt})]); bxm.position.y=7.8; bxm.rotation.y=Math.atan2(e.n[0],e.n[1]); py.add(bxm); addSolid({x,z,hw:.3,hd:.3,c:1,s:0,r:.5}); }
    const r=defRoom({kind:'shop',W:30,D:22,col:0x0050aa,rows:6,checkouts:3,walkers:6,basket:0x0050aa,logo:logoT('#0050aa','#ffe500','LIDL','900 90px Barlow, Arial')}); r.items=[['Bagietka',3,'hp',15],['Banany 1 kg',6,'hp',20],['Sok pomarańczowy',5,'hp',15],['Piwo',4,'piwo',0],['Pizza mrożona',12,'hp',50],['Energetyk',4,'boost',60]]; r.shopName='Lidl'; addEnt(r,'Lidla',e.p,e.n); r.title='Lidl';
    POIS.push({n:'Lidl',x:e.p[0],z:e.p[1],p:e.p,c:'#0050aa',ic:'L',sp:labelSprite('Lidl','#0050aa')}); { const lp=POIS[POIS.length-1]; lp.sp.position.set(e.p[0],H(e.p[0],e.p[1])+9,e.p[1]); lp.sp.visible=false; scene.add(lp.sp); } }
  // wejścia, które wypadły w obrysie budynku (np. Delikatesy i Euforia z ręcznie wpisanym punktem): przesuń na zewnątrz, na pierwsze wolne i dostępne miejsce
  { const reachRoad=(x,z)=>{ const seen=new Set(), q=[[Math.round(x),Math.round(z)]]; let n=0; while(q.length&&n<4000){ const [a,b]=q.shift(); n++; const k=a+','+b; if(seen.has(k))continue; seen.add(k); if(roadNearF(a,b,.2))return true; if(Math.hypot(a-x,b-z)>60)continue; for(const [da,db] of [[1,0],[-1,0],[0,1],[0,-1]]){ const na=a+da,nb=b+db; if(!seen.has(na+','+nb)&&!blocked(na,nb,.35)) q.push([na,nb]); } } return false; };
    ENTS.forEach(e=>{ if(!e.room||!e.p)return; const p0=e.p; if(!blocked(p0[0],p0[1],.45)&&reachRoad(p0[0],p0[1]))return; const n=e.n||[0,1]; let best=null;
      for(let k=1;k<=40&&!best;k++){ const d=k*.4; for(const sd of [0,.5,-.5,1,-1]){ const x=p0[0]+n[0]*d-n[1]*sd*d*.5, z=p0[1]+n[1]*d+n[0]*sd*d*.5; if(!blocked(x,z,.5)&&reachRoad(x,z)){ best=[x,z]; break; } } }
      if(best){ e.p=best; e.f=[best[0]-n[0]*1.4,best[1]-n[1]*1.4]; const sh=SHOPS.find(q=>q.room===e.room); if(sh){ const ds=Object.getOwnPropertyDescriptor(sh,'p'); if(ds&&!ds.get) sh.p=best; } const poi=POIS.find(q=>q.n===(sh&&sh.n)); if(poi){ poi.x=best[0]; poi.z=best[1]; poi.p=best; } } }); }
  // ceny paliw: próba pobrania aktualnych cen (plik aktualizowany codziennie na trebaczew.io)
  (async()=>{ try{ const ctl=new AbortController(); setTimeout(()=>ctl.abort(),5000); const u=location.hostname.endsWith('trebaczew.io')?'../ceny_paliw.json':'https://trebaczew.io/ceny_paliw.json'; const r=await fetch(u,{cache:'no-store',signal:ctl.signal}); if(!r.ok)return; const j=await r.json();
      const ok=v=>typeof v==='number'&&v>1&&v<20; let ch=false; ['pb95','on','lpg','pb98'].forEach(k=>{ if(ok(j[k])){ FUEL[k]=j[k]; ch=true; } }); if(ch){ if(typeof j.date==='string') FUEL.date=j.date.slice(0,10); if(typeof j.src==='string') FUEL.src=j.src.slice(0,80); refreshPylons(); } }catch(e){} })();

  /* ---------- paliwo: bak, spalanie, tankowanie na Orlenie ---------- */
  const FUEL_NAME={pb95:'Pb95',on:'ON',lpg:'LPG',pb98:'Pb98'};
  function fuelInit(c){ if(!c||c.kind==='bike'||c.kind==='melex'||c.fuel!==undefined)return; const cap=Math.round(({car:45,van:70,moto:14,tractor:90,fire:200,bus:200}[c.kind]||45)*(c.capMul||1)); c.cap=cap; c.ftype=c.kind==='car'?pick(['pb95','pb95','pb95','on','lpg']):c.kind==='moto'?'pb95':'on'; c.fuel=+(cap*R(.25,.8)).toFixed(1); c.lowWarn=false; }
  function fuelUse(c,dist){ if(c.fuel===undefined||dist<=0)return; const was=c.fuel; c.fuel=Math.max(0,c.fuel-dist*c.cap/18000);
    if(was/c.cap>.15&&c.fuel/c.cap<=.15) toast('<b>MAŁO PALIWA</b><br>Zatankuj na ORLENIE w Działoszynie (ul. Piłsudskiego)',4);
    if(was>0&&c.fuel<=0){ toast('<b>SKOŃCZYŁO SIĘ PALIWO</b><br>Dojdź pieszo na ORLEN i kup kanister albo podjedź innym autem',5); if(AU.ctx&&AU.on) noiseHit(AU.ctx.currentTime,.4,.05,'lowpass',200); } }
  function nearPump(){ if(!st.car||!ORLEN||st.car.fuel===undefined)return null; return ORLEN.pumps.find(p=>Math.hypot(p[0]-st.car.x,p[1]-st.car.z)<6)||null; }
  function openFuel(){ const c=st.car, pp=nearPump(); if(!c||!pp)return; if(Math.abs(c.v)>1){ toast('Zatrzymaj się przy dystrybutorze',2); return; } const price=FUEL[c.ftype]||FUEL.pb95; const need=Math.max(0,c.cap-c.fuel);
    SHOP_OPEN={n:'ORLEN - dystrybutor',p:pp,items:[]}; keys.clear(); shopEl.hidden=false;
    const opts=[['Do pełna',need],['10 litrów',Math.min(10,need)],['20 litrów',Math.min(20,need)]].filter(o=>o[1]>.2);
    shopEl.innerHTML=`<h2>ORLEN · dystrybutor</h2><p class="sub">${FUEL_NAME[c.ftype]} · ${price.toFixed(2).replace('.',',')} zł/l · w baku ${c.fuel.toFixed(1)} z ${c.cap} l · masz ${fmt(st.money)}</p>`+(opts.length?opts.map((o,i)=>`<button data-i="${i}"><kbd>${i+1}</kbd> ${o[0]} (${o[1].toFixed(1)} l)<span>${Math.ceil(o[1]*price)} zł</span></button>`).join(''):'<p class="sub">Bak jest pełny.</p>')+`<button data-i="x" class="close">Wyjdź <kbd>E</kbd></button><p class="sub" style="font-size:12px;margin-top:6px">Ceny z dnia ${FUEL.date} (${FUEL.src})</p>`;
    shopEl.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ const i=b.dataset.i; if(i==='x'){ closeShop(); return; } const o=opts[+i]; const cost=Math.ceil(o[1]*price); if(st.money<cost){ toast('Za mało pieniędzy',2); return; } st.money-=cost; shownMoney=st.money; moneyEl.textContent=fmt(st.money); c.fuel=Math.min(c.cap,c.fuel+o[1]); LASTBUY={shop:'ORLEN',item:'paliwo',t:tAll};
      if(AU.ctx&&AU.on){ const t=AU.ctx.currentTime; for(let k=0;k<8;k++) noiseHit(t+k*.12,.1,.03,'bandpass',900+k*40); sfx.cash(); } toast(`Zatankowano ${o[1].toFixed(1)} l ${FUEL_NAME[c.ftype]} · ${cost} zł`,3); saveGame(); closeShop(); })); }
  function fuelHud(){ const fb=document.getElementById('fuelBox'); if(!fb)return; const c=st.car; if(!c||c.fuel===undefined){ fb.hidden=true; return; } fb.hidden=false; const f=c.fuel/c.cap; document.getElementById('fuelBar').style.width=Math.round(f*100)+'%'; document.getElementById('fuelBar').style.background=f<.15?'#e5484d':f<.35?'#f2c230':'#7fd06b'; document.getElementById('fuelTxt').textContent=`${FUEL_NAME[c.ftype]} ${Math.round(c.fuel)} l`; }
  function canisterCheck(){ const c=st.car; if(c&&c.fuel!==undefined&&c.fuel<1&&st.canister>0&&(c.ftype==='pb95'||c.ftype==='pb98')){ c.fuel+=st.canister; toast(`Wlano ${st.canister} l z kanistra`,3); st.canister=0; } else if(c&&c.fuel!==undefined&&c.fuel<1&&st.canister>0) toast('Kanister ma benzynę, a to auto jeździ na '+FUEL_NAME[c.ftype],3); }

  /* ---------- jazda na rowerze i motocyklu: siodełko, pedałowanie (IK nóg), ręce na kierownicy ---------- */
  function ik2(hy,hz,ty,tz,l1,l2,knFwd){ // kąty (obrót x) stawu biodra/barku i kolana/łokcia dla celu (ty,tz) względem stawu
    const vy=ty-hy, vz=tz-hz; let d=Math.hypot(vy,vz); d=Math.min(d,l1+l2-.005); const g=Math.atan2(vz,-vy); const a=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1)); const k=Math.acos(clamp((l1*l1+l2*l2-d*d)/(2*l1*l2),-1,1));
    const beta=knFwd?g+a:g-a; return [-beta,knFwd?Math.PI-k:-(Math.PI-k)]; }
  function riderPose(c,dt){ const p=player, u=p.userData, bike=c.kind==='bike'; p.rotation.order='YXZ';
    const lean=bike?.32:.38; const seat=bike?[-.18,.98]:[-.28,1.0]; const bars=bike?[.42,1.0]:[.55,1.12];
    c.crank=(c.crank||0)+(bike?c.v*dt/.33*.55:0);
    const cl=Math.cos(lean), sl=Math.sin(lean); // obrót ciała o lean wokół bioder: punkt (y,z) świata -> układ ciała
    const toBody=(y,z)=>{ const ry=y-seat[1], rz=z-seat[0]; return [ .95+ry*cl+rz*sl, -ry*sl+rz*cl ]; };
    // nogi
    [[u.lL,u.kL,0],[u.lR,u.kR,Math.PI]].forEach(([hip,kn,ph])=>{ let fy,fz; if(bike){ const a=c.crank+ph; fy=.34+Math.sin(a)*.17; fz=-.02+Math.cos(a)*.17; } else { fy=.42; fz=.02; } const [ty,tz]=toBody(fy+.06,fz); const [h,k]=ik2(.95,0,ty,tz,.45,.47,true); hip.rotation.x=h; kn.rotation.x=k; });
    // ręce
    [[u.aL,u.eL],[u.aR,u.eR]].forEach(([sh,el])=>{ const [ty,tz]=toBody(bars[1],bars[0]); const [a,e]=ik2(1.44,0,ty+.04,tz,.29,.32,false); sh.rotation.x=a; el.rotation.x=e; });
    // całe ciało: pochylenie i biodra na siodełku
    p.rotation.x=lean; const hy=.95*cl, hz=.95*sl; const fx=Math.cos(c.h), fz=Math.sin(c.h); const base=H(c.x,c.z);
    p.position.set(c.x+fx*(seat[0]-hz),base+seat[1]-hy,c.z+fz*(seat[0]-hz)); p.rotation.y=-c.h+Math.PI/2; }

  // Żabka: piwo i napoje na imprezę
  { const zb=SHOPS.find(s=>s.n==='Żabka'); if(zb){ zb.items.push(['Piwo',5,'piwo',0],['Zgrzewka na domówkę',39,'piwo',0]); } }

  /* ---------- poziomy i doświadczenie ---------- */
  const LVL_XP=[0,150,400,800,1300,2000,2900,4000,5400,7200];          // próg na poziom 1..10 (na początku szybko, potem wolniej)
  function levelOf(xp){ let L=1; for(let i=1;i<LVL_XP.length;i++) if(xp>=LVL_XP[i]) L=i+1; return L; }
  st.xp=st.xp||0; st.level=levelOf(st.xp);
  function updLevel(){ const L=levelOf(st.xp), a=LVL_XP[L-1], b=LVL_XP[L]; $('lvlTxt').textContent='POZIOM '+L+(L>=10?' (MAX)':''); $('xpb').style.width=(L>=10?100:Math.round((st.xp-a)/(b-a)*100))+'%'; }
  function addXP(v){ const L0=levelOf(st.xp); st.xp+=v; const L=levelOf(st.xp); st.level=L; updLevel(); if(L>L0){ toast(`<b>AWANS! POZIOM ${L}</b><br>Nowe misje w dzienniku (Q)`,4); if(AU.ctx&&AU.on) sfx.win(); refreshMarks(); } }

  /* ---------- kampania: 20 misji głównych + misje poboczne ---------- */
  let LASTBUY=null; const _buy=buy; buy=function(i){ const it=SHOP_OPEN&&SHOP_OPEN.items[i]; const m0=st.money; _buy(i); if(it&&st.money<m0) LASTBUY={shop:SHOP_OPEN.n,item:it[0],t:tAll}; };
  const fr=(b,o)=>{ const f=b.front; return [f.x+f.nx*(o||3),f.z+f.nz*(o||3)]; }; const sideOf=(b,o,sd)=>{ const f=b.front; return [f.x+f.nx*o-f.nz*sd,f.z+f.nz*o+f.nx*sd]; };
  const nearHouse=(x,z)=>frontOf(resHouses.reduce((a,h)=>Math.hypot(h.x-x,h.z-z)<Math.hypot(a.x-x,a.z-z)?h:a));
  const farHouse=(s,d0,d1)=>frontOf(pick(housesBy(h=>{ const d=Math.hypot(h.x-s[0],h.z-s[1]); return d>d0&&d<d1; }))||resHouses[0]);
  const SPAWN_P=()=>[SPAWN.x,SPAWN.z];
  const SCHOOL_P=frontOf({x:centroid(BPOLY.find(b=>b.code===5&&b!==CHURCH).pts)[0],z:centroid(BPOLY.find(b=>b.code===5&&b!==CHURCH).pts)[1]});
  const CHURCH_P=(()=>{ const c=centroid(CHURCH.pts); const nr=nearestRoad(c[0],c[1],r=>r===DK); const a=DK.pts[nr.seg]; const dx=a[0]-c[0],dz=a[1]-c[1],l=Math.hypot(dx,dz)||1; return [c[0]+dx/l*14,c[1]+dz/l*14]; })();
  const PARK_P=PARK_GUYS.anchor?[PARK_GUYS.anchor[0]+1.5,PARK_GUYS.anchor[1]+1.5]:centroid(PARK.pts);
  const OSP_B=BLD.find(b=>b.kind==='osp'); const OSP_P=OSP_B&&OSP_B.front?fr(OSP_B,6):[-192,190];
  const WYD=(()=>{ const p=(typeof DATA_X!=='undefined'?DATA_X.P:[]).find(q=>q[0]==='Wydrzynów'); return p?nearHouse(p[2],p[3]):[1700,540]; })();
  const SAD=(()=>{ const p=(typeof DATA_X!=='undefined'?DATA_X.P:[]).find(q=>q[0]==='Sadowiec-Wrzosy'); return p?nearHouse(p[2],p[3]):[-1700,-270]; })();
  const STATION_P=(()=>{ try{ const bx0=-554, bz0=1454; const nr=nearestRoad(bx0,bz0,r=>r.t!=='track'&&/Kolejowa/.test(r.n||'')); if(nr.r&&nr.d<80){ const a=nr.r.pts[nr.seg], b=nr.r.pts[nr.seg+1]; const dx=b[0]-a[0], dz=b[1]-a[1], L=dx*dx+dz*dz||1; const t=clamp(((bx0-a[0])*dx+(bz0-a[1])*dz)/L,0,1); const px=a[0]+dx*t, pz=a[1]+dz*t; const dd=Math.hypot(bx0-px,bz0-pz)||1; const o=nr.r.w/2+5; const q=npcFind(px+(bx0-px)/dd*o,pz+(bz0-pz)/dd*o,2,400); if(q) return [q[0],q[1]]; } }catch(e){} return [-510,1462]; })(), DOC_P=APT_DOORS?APT_DOORS.clinic:[-99,-206];
  const MIN_P=CB.mineral&&CB.mineral.front?fr(CB.mineral,8):[-580,1690];
  const TIR_P=TIR_LOT?[TIR_LOT.x,TIR_LOT.z]:[-130,-260];
  const fieldPts=()=>{ const out=[]; for(let t=0;t<200&&out.length<4;t++){ const pc=pick(PARCELS); if(pc.res||Math.abs(polyArea(pc.p))<9000)continue; const c=centroid(pc.p); if(!blocked(c[0],c[1],2)&&!out.some(o=>Math.hypot(o[0]-c[0],o[1]-c[1])<120)) out.push(c); } return out; };
  const dkPt=f=>{ const s=sampleLine(DK.pts,DK.len,DK.L*f); return [s.x,s.z]; };
  const C=(id,n,lvl,xp,reward,start,desc,steps,o)=>Object.assign({id,n,lvl,xp,reward,start,desc,steps,main:true},o||{});
  const CAMPAIGN=[
    C('m1','Pierwsza jazda',1,80,500,()=>INFO?INFO.front.slice():sideOf(B_LEW,10,4),'Auto czeka zaparkowane przy Lewiatanie. Wsiądź (F) i zatankuj je na Orlenie w Działoszynie (ul. Piłsudskiego).',()=>[{p:[PASSAT.x,PASSAT.z],t:'Wsiądź do auta zaparkowanego przy Lewiatanie (F)',car:'passat',r:5},{p:ORLEN?ORLEN.pump:dkPt(.15),t:'Zatankuj auto na Orlenie (stój przy dystrybutorze)',wait:6,r:7,car:'passat'}]),
    C('m2','Znicz dla dziadka',1,90,300,()=>sideOf(B_LEW,10,-4),'Kup znicz w Lewiatanie i zapal go na grobie dziadka na cmentarzu.',()=>[{p:fr(B_LEW,2),t:'Kup znicz w Lewiatanie',buy:'Lewiatan',item:'Znicz'},{p:centroid(CEM.pts),t:'Zapal znicz na grobie',wait:4,r:12}]),
    C('m3','Wizyta u lekarza',2,120,350,()=>APT_DOORS?[DOC_P[0]+APT_DOORS.n[0]*10,DOC_P[1]+APT_DOORS.n[1]*10]:[DOC_P[0]+6,DOC_P[1]+4],'Kaszel nie przechodzi. Idź do ośrodka zdrowia i odczekaj swoje w poczekalni.',()=>[{p:DOC_P,t:'Poczekaj na wizytę',wait:10,r:6,heal:1}]),
    C('m4','Mecz na orliku',2,140,500,()=>ORLIK_DOOR(),'Chłopaki z orlika grają do trzech goli. Wejdź przez furtkę i pokaż, kto tu rządzi!',()=>[{p:[orlik.m.cx,orlik.m.cz],t:'Wejdź na orlik i wygraj mecz',mini:'pilka',mo:{title:'Mecz na orliku'},r:14,onfoot:1}]),
    C('m5','Browar w parku',3,160,300,()=>fr(B_ZAB,5),'Kup piwo w Żabce i dołącz do ekipy w parku - grają we flanki.',()=>[{p:fr(B_ZAB,2),t:'Kup piwo w Żabce',buy:'Żabka',item:'Piwo'},{p:PARK_P,t:'Zagraj z ekipą we flanki',mini:'flanki',mo:{diff:1,title:'Flanki z ekipą'},r:6,onfoot:1}]),
    C('m6','Do szkoły na czas',3,180,600,()=>fr(B_ZAB,7),'Zaraz dzwonek! Pobiegnij do szkoły, zanim skończy się czas.',()=>[{p:SCHOOL_P,t:'Biegnij do szkoły',onfoot:1}],{time:80}),
    C('m7','Niedzielna msza',3,200,450,()=>[CHURCH_P[0]+8,CHURCH_P[1]],'Babcia prosi, żebyś poszedł na mszę do kościoła Nawiedzenia NMP.',()=>[{p:CHURCH_P,t:'Zostań na mszy',wait:20,r:12,onfoot:1}]),
    C('m8','Paczka dla sąsiada',4,220,1200,()=>{ const l=LOCKERS[0]; return [l.x+3,l.z+3]; },'Odbierz paczkę z paczkomatu i zanieś ją pod wskazany dom.',function(){ const l=LOCKERS[0]; return [{p:[l.x,l.z],t:'Odbierz paczkę z paczkomatu',mini:'paczkomat',mo:{mode:'odbierz',title:'Odbiór paczki'},r:3.5,onfoot:1},{p:farHouse([l.x,l.z],150,420),t:'Dostarcz paczkę'}]; },{time:180}),
    C('m9','Tankowanie na Orlenie',4,260,1800,()=>ORLEN?ORLEN.shop:dkPt(.15),'Bak prawie pusty. Weź auto i zatankuj na Orlenie w Działoszynie.',()=>[{p:ORLEN?ORLEN.pump:dkPt(.15),t:'Zatankuj auto (stój przy dystrybutorze)',wait:6,r:7,car:1,pay:250}]),
    C('m10','Ucieczka przed policją',5,320,3500,()=>dkPt(.55),'Pan władza Cię namierzył. Zgub pościg - po prostu przetrwaj, aż gwiazdki zgasną.',()=>[{p:null,t:'Zgub policję',escape:2}],{time:240}),
    C('m11','Domówka na Wydrzynowie',5,340,2500,()=>fr(B_ZAB,8),'Kup zgrzewkę w Żabce i jedź na domówkę na Wydrzynów.',()=>[{p:fr(B_ZAB,2),t:'Kup zgrzewkę w Żabce',buy:'Żabka',item:'Zgrzewka na domówkę'},{p:WYD,t:'Jedź na domówkę na Wydrzynów'},{p:WYD,t:'Imprezuj',wait:10,r:10,onfoot:1}]),
    C('m12','Zielone w parku',6,380,3500,()=>[PARK_P[0]-8,PARK_P[1]+6],'Koleś w kapturze w parku ma „zielone”. Zapłać mu i zwiewaj, zanim zjawi się policja.',()=>[{p:[PARK_P[0]-14,PARK_P[1]+10],t:'Zapłać gościowi w kapturze (200 zł)',pay:200,r:4},{p:null,t:'Uciekaj przed policją',escape:1}],{time:200}),
    C('m13','Wyścig po DK42',6,420,6000,()=>dkPt(.6),'Weź auto: od Trębaczewa do Działoszyna i z powrotem, zanim skończy się czas.',()=>[.5,.35,.2,.08,.25,.45,.6].map(f=>({p:dkPt(f),t:'Punkt kontrolny',car:1})),{time:240,needCar:true}),
    C('m14','Paczki po zmroku',7,460,5000,()=>fr(B_ZAB,9),'Żabka ma sporo zamówień. Rozwieź cztery paczki z zakupami po wsi.',function(){ const s=fr(B_ZAB,9); return [0,1,2,3].map(i=>({p:farHouse(s,90+i*60,520),t:`Paczka ${i+1} z 4`})); },{time:260}),
    C('m15','Strażak ochotnik',7,520,8000,()=>OSP_P,'Pali się na Sadowcu! Wsiądź do wozu OSP i jedź gasić.',()=>[{p:SAD,t:'Dojedź wozem strażackim do pożaru',car:'fire'},{p:SAD,t:'Gaś pożar',wait:10,r:14,car:'fire',fire:1}],{time:300}),
    C('m16','Transport z Minerału',8,600,10000,()=>MIN_P,'Zakład Kredowy „Minerał” potrzebuje kierowcy. Odbierz towar i zawieź go na plac TIR-ów przy Szkolnej.',()=>[{p:MIN_P,t:'Załaduj towar w Minerale',wait:5,r:8,car:1},{p:TIR_P,t:'Dowieź towar na plac TIR-ów',car:1}],{time:300}),
    C('m17','Pociąg o czasie',8,650,8000,()=>fr(B_LEW,8),'Pociąg z Działoszyna odjeżdża za chwilę. Zdąż na peron!',()=>[{p:STATION_P,t:'Zdąż na peron w Działoszynie',r:10}],{time:150}),
    C('m18','Żniwa',9,750,14000,()=>{ const t=parked.find(c=>c.kind==='tractor'); return t?[t.x+5,t.z+5]:[-300,300]; },'Pomóż przy żniwach: weź ciągnik i objedź cztery pola.',function(){ return fieldPts().map((p,i)=>({p,t:`Pole ${i+1} z 4`,car:'tractor'})); },{time:420}),
    C('m21','Praca w cementowni',9,700,12000,()=>CEMENT?CEMENT.gate:[78,2854],'Cementownia Warta w Grądach szuka pracowników. Dojedź do zakładu, zgłoś się w biurze i odbierz biały kask.',()=>[{p:CEMENT.gate,t:'Dojedź do cementowni (ul. Przemysłowa)',car:1,r:16},{p:CEMENT.office,t:'Zgłoś się w biurze kadr',wait:6,r:8},{p:CEMENT.hall,t:'Odbierz kask i idź na halę',wait:8,r:12}],{time:600}),
    C('m19','Wielki wyścig gminny',9,900,25000,()=>ORLIK_RD,'Ostatni sprawdzian: Sadowiec - Wydrzynów - Działoszyn i powrót pod orlik.',()=>[{p:SAD,t:'Sadowiec-Wrzosy',car:1},{p:WYD,t:'Wydrzynów',car:1},{p:STATION_P,t:'Dworzec Działoszyn',car:1},{p:ORLIK_RD,t:'Meta przy orliku',car:1}],{time:420}),
    C('m20','Własny kąt',10,0,0,()=>FOR_SALE?FOR_SALE.p:[0,0],'Dom na sprzedaż w Trębaczewie. Zbierz 450 000 zł i kup go - to koniec gry.',()=>[{p:FOR_SALE?FOR_SALE.p:[0,0],t:'Kup dom (450 000 zł)',pay:450000,r:5,win:1}])];
  const SIDE=[
    {id:'s1',n:'Paczki z paczkomatu',xp:40,reward:900,start:()=>{ const l=LOCKERS[LOCKERS.length-1]; return [l.x+3,l.z-3]; },desc:'Dorabiasz jako kurier. Rozwieź paczkę pod wskazany dom.',steps(){ const l=LOCKERS[LOCKERS.length-1]; return [{p:farHouse([l.x,l.z],120,450),t:'Dostarcz paczkę'}]; },time:160},
    {id:'s3',n:'Zakupy dla sąsiadki',xp:35,reward:700,start:()=>nearHouse(-150,230),desc:'Pani Halinka prosi o chleb z Lewiatana.',steps(){ return [{p:fr(B_LEW,2),t:'Kup coś w Lewiatanie',buy:'Lewiatan'},{p:nearHouse(-150,230),t:'Zanieś zakupy sąsiadce'}]; },time:240},
    {id:'s4',n:'Wyścig dookoła wsi',xp:60,reward:2500,start:()=>ORLIK_RD,desc:'Przejedź trasę po wsi przed czasem.',steps(){ return [['Zielona',.95],['Traktorowa',.5],['Spacerowa',.9],['Szkolna',.15],['Sikorskiego',.4],['Szkolna',.55]].map(([n,f])=>({p:roadPt(n,f,0),t:'Punkt kontrolny',car:1})).filter(c=>c.p); },time:150,needCar:true},
    {id:'s5',n:'Taksówka na dworzec',xp:55,reward:2000,start:()=>fr(B_ZAB,10),desc:'Sąsiad spóźni się na pociąg. Zawieź go autem na dworzec w Działoszynie.',steps(){ return [{p:[-558,1466],t:'Zawieź pasażera na dworzec',car:1}]; },time:200,needCar:true},
    {id:'s6',n:'Nadaj paczki w paczkomacie',xp:40,reward:600,start:()=>{ const l=LOCKERS.find(l=>l.n==='przy Lewiatanie')||LOCKERS[0]; return [l.x+3,l.z+2]; },desc:'Sąsiadka sprzedała rzeczy w internecie. Nadaj jej 3 paczki w paczkomacie przy Lewiatanie.',steps(){ const l=LOCKERS.find(l=>l.n==='przy Lewiatanie')||LOCKERS[0]; return [{p:[l.x,l.z],t:'Nadaj 3 paczki',mini:'paczkomat',mo:{mode:'nadaj',title:'Nadaj 3 paczki'},r:3.5,onfoot:1}]; }},
    {id:'s7',n:'Turniej flanek w parku',xp:50,reward:900,start:()=>[PARK_P[0]-6,PARK_P[1]+5],desc:'Ekipa z Wydrzynowa wyzywa Trębaczew na flanki. Nie daj się!',steps(){ return [{p:PARK_P,t:'Wygraj turniej flanek',mini:'flanki',mo:{diff:2,title:'Turniej flanek - Wydrzynów'},r:6,onfoot:1}]; }},
    {id:'s8',n:'Trening LZS Trębaczew',xp:70,reward:1500,start:()=>STAD.gate?[STAD.gate[0],STAD.gate[1]]:(STADIUM_C||[0,0]),desc:'Trener LZS szuka zawodnika do składu. Na środku boiska pokaż żonglerkę - utrzymaj piłkę w powietrzu przez minutę!',steps(){ return [{p:STADIUM_C,t:'Żonglerka: 60 s piłki w powietrzu',mini:'zonglerka',mo:{title:'Żonglerka - trening LZS'},r:10,onfoot:1}]; }},
    {id:'s9',n:'Sprzątanie parku',xp:45,reward:600,start:()=>{ const b=(PARK.benches||[])[0]; return b?[b.x+Math.sin(b.ry)*2.5,b.z+Math.cos(b.ry)*2.5]:centroid(PARK.pts); },desc:'Sołtys organizuje sprzątanie parku przy Zielonej. Pozbieraj śmieci z alejek i wyrzuć je do kosza.',
      steps(){ const W=PARK.walks||[]; const out=[]; for(let i=0;i<4&&W.length;i++){ const w=W[(i*3+1)%W.length]; const L=w.len[w.len.length-1]; const q=sampleLine(w.pts,w.len,L*(.25+.5*((i*.37)%1))); out.push({p:[q.x,q.z],t:`Podnieś śmieci z alejki (${i+1}/4)`,r:2.6,onfoot:1}); }
        const b=(PARK.benches||[])[1]||(PARK.benches||[])[0]; if(b) out.push({p:[b.x+Math.sin(b.ry)*1.8,b.z+Math.cos(b.ry)*1.8],t:'Wyrzuć śmieci do kosza przy ławce',r:2.8,onfoot:1}); return out; }},
    {id:'s10',n:'Zastępstwo w podstawówce',xp:60,reward:700,start:()=>{ const e=SCHOOL_ROOM.ent; return e?[e.p[0]+e.n[0]*3.5,e.p[1]+e.n[1]*3.5]:SCHOOL_P; },desc:'Pani dyrektor prosi o pomoc: wychowawczyni 1a utknęła w korku pod Działoszynem. Poprowadź za nią lekcję!',
      steps(){ const o=SCHOOL_ROOM, e=o.ent?o.ent.p:SCHOOL_P; const S=(k,t,ex)=>Object.assign({room:o,lp:[SCH_SPOT[k][0],SCH_SPOT[k][1]],lv:SCH_SPOT[k][2],p:[e[0],e[1]],t},ex||{});
        return [S('teach','Weź dziennik z pokoju nauczycielskiego na piętrze (schody na końcu holu)',{wait:2}),{buy:'Sklepik szkolny',item:'Guma Turbo',p:[e[0],e[1]],t:'Kup w sklepiku szkolnym gumę Turbo - nagroda dla 1a za ciszę'},S('board','Napisz temat lekcji na tablicy w klasie 1a',{wait:4}),S('k1a','Poprowadź lekcję przy biurku nauczyciela - dotrwaj do dzwonka',{wait:10,done:'Dzwonek! Uczniowie 1a biją brawo, a pani dyrektor dziękuje za pomoc.'})]; }},
    {id:'s11',n:'Beemka na próbę',xp:55,reward:650,req:()=>NQ.seba==='koniec'&&!!SEBA_CAR,start:()=>{ const n=NPC.find(q=>q.id==='seba'); return n?[n.x+1.5,n.z+1.5]:[SEBA_CAR.x,SEBA_CAR.z]; },desc:'Seba w podzięce daje ci kluczyki do swojego BMW E46. Przejedź rundkę po wsi i odstaw beemkę w całości!',time:170,
      steps(){ const h=SEBA_CAR.home, n=NPC.find(q=>q.id==='seba'); const lew=B_LEW&&B_LEW.front?[B_LEW.front.x+B_LEW.front.nx*14,B_LEW.front.z+B_LEW.front.nz*14]:SPAWN_P();
        return [{p:[SEBA_CAR.x,SEBA_CAR.z],t:'Wsiądź do beemki Seby',car:'bmw',r:6},{p:SCHOOL_P,t:'Przejedź obok szkoły',car:'bmw',r:9},{p:lew,t:'Pokaż się pod Lewiatanem',car:'bmw',r:9},{p:[h[0],h[1]],t:'Odstaw beemkę na plac w parku',car:'bmw',r:6},{p:n?[n.x+1.2,n.z+1.2]:[h[0],h[1]],t:'Oddaj kluczyki Sebie',onfoot:1,r:3.5}]; }},
    {id:'s12',n:'Pies ze schroniska',xp:60,reward:900,req:()=>!!(SHELTER&&ADOPT),start:()=>ADOPT.p.slice(),desc:'Rodzina z domu obok Lewiatana adoptuje psa. Pojedź autem do schroniska dla zwierząt w Trębaczewie, odbierz Azora i przywieź go do nowego domu.',
      steps(){ const S=SHELTER, A=ADOPT; return [
        {p:[S.gate[0],S.gate[1]],t:'Pojedź autem do schroniska dla zwierząt w Trębaczewie',car:1,r:14},
        {p:[S.gate[0],S.gate[1]],t:'Wysiądź i odbierz Azora - podpisz papiery adopcyjne',onfoot:1,r:4,wait:4,onDone:()=>{ azorMake(); AZOR.on=true; AZOR.home=false; NQ.azor='jedzie'; nqSave(); toast('Azor merda ogonem i idzie za tobą. Wsiądź z nim do auta!',3.5); }},
        {p:A.p.slice(),t:'Zawieź Azora do nowego domu obok Lewiatana',car:1,r:9},
        {p:A.p.slice(),t:'Wysiądź i przekaż Azora nowej rodzinie',onfoot:1,r:4,wait:3,onDone:()=>{ NQ.azor='dom'; nqSave(); azorHome(); toast('Azor ma nowy dom! Rodzina dziękuje.',3.5); }}]; }},
    {id:'s13',n:'Wyścig z Sebą na stadion',xp:65,reward:1400,req:()=>!!SIDE_T.s11&&!!STAD.gate,time:150,start:()=>{ const n=NPC.find(q=>q.id==='seba'); return n?[n.x+1.5,n.z-1.5]:SCHOOL_P; },desc:'Seba rzuca wyzwanie: z parku przez wieś i Cmentarną na stadion LZS. On mierzy czas - zmieść się w 150 sekundach!',
      steps(){ const cm=ROADS.find(r=>r.n==='Cmentarna'); const mid=cm?sampleLine(cm.pts,cm.len,cm.L*.5):null; return [{p:SEBA_CAR?[SEBA_CAR.x,SEBA_CAR.z]:SCHOOL_P,t:'Wsiądź do auta - może być beemka Seby',car:1,r:8},{p:SCHOOL_P,t:'Przejedź obok szkoły',car:1,r:10},mid?{p:[mid.x,mid.z],t:'Jedź Cmentarną w stronę stadionu',car:1,r:10}:null,{p:[STAD.gate[0],STAD.gate[1]],t:'Meta: brama stadionu LZS',car:1,r:10}].filter(Boolean); }},
    {id:'s14',n:'Grill u rodziny Azora',xp:45,reward:700,req:()=>NQ.azor==='dom'&&!!ADOPT,start:()=>ADOPT.p.slice(),desc:'Rodzina, która adoptowała Azora, zaprasza na grilla. Kup w Żabce kiełbasę na grilla i przyjdź do nich.',
      steps(){ const z=SHOPS.find(q=>q.n==='Żabka'); return [{buy:'Żabka',item:'Kiełbasa na grilla',p:z?z.p.slice():ADOPT.p.slice(),t:'Kup w Żabce kiełbasę na grilla'},{p:ADOPT.p.slice(),t:'Przyjdź na grilla do rodziny Azora',onfoot:1,r:4,wait:5,onDone:()=>{ takeIt('kielbasa_grill'); toast('Kiełbaski skwierczą, a Azor dostał swoją porcję!',3.5); }}]; }},
    {id:'s15',n:'Mecz z drużyną LZS',xp:60,reward:1200,req:()=>NQ.marek==='koniec',start:()=>ORLIK_DOOR(),desc:'Marek zebrał drużynę LZS na orliku. Pokaż, że miejsce w składzie ci się należy!',
      steps(){ return [{p:[orlik.m.cx,orlik.m.cz],t:'Zagraj mecz z drużyną Marka na orliku',mini:'pilka',mo:{title:'Mecz z drużyną LZS'},r:14,onfoot:1}]; }}];
  const MISSIONS=[...CAMPAIGN,...SIDE]; const SIDE_CD=300;                                // misje poboczne wracają po 5 min
  const DONE=new Set(); const SIDE_T={}; const SIDE_N={}; let ACTIVE=null;
  // ekonomia misji pobocznych: rośnie z poziomem (x1,35 na 1. → x4,5 na 10.), ale ta sama misja powtarzana raz za razem płaci coraz mniej (-25% za każde powtórzenie, min. 40%); odnawia się o 25% na każde 15 minut przerwy
  function sideFresh(m){ const r=SIDE_N[m.id]; if(!r) return 1; const n=Math.max(0,r.n-(Date.now()-r.t)/900000); return Math.max(.4,1-.25*n); }
  // zlecenia z premią: co 20 minut trzy losowe misje poboczne płacą 1,5×
  function sideBonus(){ const k=Math.floor(Date.now()/1200000); const ids=SIDE.filter(m=>!m.req||m.req()).map(m=>m.id); const out=[]; let h=k*2654435761>>>0; for(let i=0;i<40&&out.length<3&&ids.length;i++){ h=(h*1103515245+12345)>>>0; const id=ids[h%ids.length]; if(!out.includes(id)) out.push(id); } return out; }
  function sideReward(m){ return Math.round(m.reward*(1+st.level*.35)*sideFresh(m)*(sideBonus().includes(m.id)?1.5:1)/10)*10; }
  function sideDone(m){ const r=SIDE_N[m.id]||{n:0,t:Date.now()}; const n=Math.max(0,r.n-(Date.now()-r.t)/900000); SIDE_N[m.id]={n:n+1,t:Date.now()}; }
  // dom na sprzedaż (ostatnia misja)
  let FOR_SALE=null; { const cand=resHouses.filter(h=>h.kind==='house'&&Math.hypot(h.x+100,h.z-260)<500&&!h.cust).sort((a,b)=>Math.hypot(a.x+220,a.z-300)-Math.hypot(b.x+220,b.z-300))[0];
    if(cand){ const p=frontOf(cand); FOR_SALE={h:cand,p}; const g=new THREE.Group(); g.position.set(p[0],H(p[0],p[1]),p[1]); scene.add(g); bx(g,.1,2.2,.1,-.8,0,0,new THREE.MeshLambertMaterial({color:0x5a3b28})); bx(g,.1,2.2,.1,.8,0,0,new THREE.MeshLambertMaterial({color:0x5a3b28}));
      const t=tex(256,128,(c,w,h)=>{ c.fillStyle='#fff'; c.fillRect(0,0,w,h); c.fillStyle='#c4221e'; c.fillRect(0,0,w,36); c.fillStyle='#fff'; c.font='800 28px Barlow, Arial'; c.textAlign='center'; c.fillText('NA SPRZEDAŻ',w/2,27); c.fillStyle='#111'; c.font='700 38px Barlow, Arial'; c.fillText('450 000 zł',w/2,86); });
      const sg=new THREE.Mesh(new THREE.PlaneGeometry(1.9,.95),new THREE.MeshLambertMaterial({map:t,side:THREE.DoubleSide})); sg.position.y=1.7; sg.rotation.y=Math.atan2(cand.x-p[0],cand.z-p[1])+Math.PI; g.add(sg); } }
  const MARK_M=new THREE.MeshBasicMaterial({color:0xffd23a,transparent:true,opacity:.32,depthWrite:false}), SIDE_M=new THREE.MeshBasicMaterial({color:0x3fb0ff,transparent:true,opacity:.3,depthWrite:false}), CP_M=new THREE.MeshBasicMaterial({color:0xff3a3a,transparent:true,opacity:.35,depthWrite:false});
  MISSIONS.forEach(m=>{ const g=new THREE.Group(); const mat=m.main?MARK_M:SIDE_M; const c=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,3,24,1,true),mat); c.position.y=1.5; const r=new THREE.Mesh(new THREE.RingGeometry(1.0,1.4,32).rotateX(-Math.PI/2),mat); r.position.y=.12; g.add(c,r); g.visible=false; scene.add(g); m.mk=g; m.sp=[0,0]; });
  const cpMark=new THREE.Group(); { const c=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,40,28,1,true),CP_M); c.position.y=20; const r=new THREE.Mesh(new THREE.RingGeometry(2.2,2.9,32).rotateX(-Math.PI/2),CP_M); r.position.y=.15; cpMark.add(c,r); cpMark.visible=false; scene.add(cpMark); }
  const smoke=new THREE.Group(); { const sm=new THREE.MeshLambertMaterial({color:0x555555,transparent:true,opacity:.55,depthWrite:false}); for(let i=0;i<14;i++){ const s=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),sm); s.userData.o=i/14; smoke.add(s); } smoke.visible=false; scene.add(smoke); }
  function walkSpot(p,car){ if(!p||!isFinite(p[0])||!isFinite(p[1]))return p; const r0=car?1.4:.5; if(!blocked(p[0],p[1],r0,car)) return p; for(let r=.5;r<=30;r+=.5) for(let a=0;a<6.28;a+=.3){ const x=p[0]+Math.cos(a)*r, z=p[1]+Math.sin(a)*r; if(!blocked(x,z,r0,car)&&!ROADS.some(q=>q.t==='rail'&&roadDist(q,x,z)<3)) return [x,z]; } return p; }
  function avail(m){ if(m.req&&!m.req()) return false; if(m.main){ if(DONE.has(m.id))return false; const idx=CAMPAIGN.indexOf(m); if(idx>0&&!DONE.has(CAMPAIGN[idx-1].id))return false; return st.level>=m.lvl; } const t=SIDE_T[m.id]; return !t||Date.now()-t>SIDE_CD*1000; }
  function refreshMarks(){ MISSIONS.forEach(m=>{ const a=!ACTIVE&&avail(m); if(a){ try{ m.sp=walkSpot(m.start(),false); }catch(e){ m.sp=[0,0]; } m.mk.position.set(m.sp[0],H(m.sp[0],m.sp[1]),m.sp[1]); } m.mk.visible=a; }); }
  function startMission(m){ if(!m||ACTIVE)return; if(m.needCar&&!(st.car&&st.car.kind!=='bike')){ toast('Do tej misji potrzebujesz auta',3); return; }
    const steps=(typeof m.steps==='function'?m.steps.call(m):m.steps).filter(s=>s&&(s.p||s.escape)); steps.forEach(s=>{ if(s.p&&!s.buy) s.p=walkSpot(s.p,!!s.car&&!s.onfoot); }); ACTIVE={m,steps,i:0,t:m.time||0,w:0,t0:tAll}; MISSIONS.forEach(q=>q.mk.visible=false); toast(`<b>${m.n}</b><br>${m.desc}`,4.5); stepBegin(); }
  function stepBegin(){ const s=ACTIVE.steps[ACTIVE.i]; ACTIVE.w=0; ACTIVE.ts=tAll; if(s.escape){ setWanted(Math.max(st.wanted,s.escape)); ACTIVE.hadW=true; cpMark.visible=false; } else { cpMark.position.set(s.p[0],H(s.p[0],s.p[1]),s.p[1]); cpMark.visible=true; }
    smoke.visible=!!s.fire; if(s.fire) smoke.position.set(s.p[0]+8,H(s.p[0],s.p[1]),s.p[1]+6); }
  { const mb=document.getElementById('mMute'); const upd=()=>{ mb.textContent=(AU.ctx&&AU.on)?'🔊':'🔇'; mb.title=(AU.ctx&&AU.on)?'Wycisz':'Włącz dźwięk'; }; mb.addEventListener('click',e=>{ e.stopPropagation(); audioStart(); upd(); mb.blur(); }); setInterval(upd,1000); upd(); }
  const abortEl=document.getElementById('mAbort'); abortEl.addEventListener('click',()=>{ if(ACTIVE){ endMission(false); toast('Misja anulowana',2.2); } });
  function endMission(ok){ const m=ACTIVE.m; try{ missionHook(ACTIVE,ok); }catch(e){} if(!ok&&m.id==='s12'&&AZOR.on){ AZOR.on=false; if(AZOR.g){ if(AZOR.g.parent) AZOR.g.parent.remove(AZOR.g); } AZOR.g=null; NQ.azor=''; nqSave(); } cpMark.visible=false; cpMark.scale.set(1,1,1); smoke.visible=false; ACTIVE=null;
    if(ok){ statEvent('mission',{main:m.main?1:0}); if(m.main) DONE.add(m.id); else SIDE_T[m.id]=Date.now(); const rw=m.main?m.reward:sideReward(m); if(!m.main) sideDone(m); if(rw) addMoney(rw); if(m.xp) addXP(m.xp); toast(`<b>MISJA ZALICZONA</b><br>${m.n}${rw?` · +${fmt(rw)}`:''}${m.xp?` · +${m.xp} XP`:''}`,4.5); if(AU.ctx&&AU.on)sfx.win(); saveGame(); }
    else toast('<b>MISJA NIEUDANA</b><br>Spróbuj jeszcze raz',3.5); refreshMarks(); }
  function stepOK(s){ if(s.car&&!st.car){ return 'Wsiądź do pojazdu'; } if(s.car==='passat'&&st.car!==PASSAT) return 'Potrzebne auto z parkingu przy Lewiatanie'; if(s.car==='fire'&&!(st.car&&st.car.kind==='fire')) return 'Potrzebny wóz strażacki z OSP'; if(s.car==='tractor'&&!(st.car&&st.car.kind==='tractor')) return 'Potrzebny ciągnik'; if(s.car==='bmw'&&st.car!==SEBA_CAR) return 'Wsiądź do BMW Seby'; if(s.onfoot&&st.car) return 'Wysiądź z pojazdu'; return ''; }
  // strzałka prowadząca do celu aktualnej misji (a na początku do pierwszej misji) i wskazówki dla nowego gracza
  const GUIDE=new THREE.Group(); { const gm=new THREE.Mesh(new THREE.ConeGeometry(.45,1.5,4),new THREE.MeshBasicMaterial({color:0xffd23a,depthTest:false,transparent:true,opacity:.95})); gm.rotation.x=Math.PI/2; gm.renderOrder=999; GUIDE.add(gm); GUIDE.visible=false; scene.add(GUIDE); }
  function guideTarget(){ if(ACTIVE){ const s=ACTIVE.steps[ACTIVE.i]; if(s.escape) return null; if(s.room) return st.inside?null:(s.room.ent?s.room.ent.p:null); return s.p||null; } if(!DONE.has('m1')){ const m=MISSIONS.find(q=>q.id==='m1'); return m&&m.sp?m.sp:null; } return WAYPOINT; }
  function guideUpdate(){ const t=(!GAME.started||GAME.paused||st.inside)?null:guideTarget(); if(!t){ GUIDE.visible=false; return; }
    if(!GUIDE.h1&&!DONE.has('m1')&&!ACTIVE){ GUIDE.h1=1; toast('<b>Pierwsza misja</b><br>Idź za żółtą strzałką do znacznika',5.5); }
    const px=st.car?st.car.x:st.x, pz=st.car?st.car.z:st.z, dx=t[0]-px, dz=t[1]-pz, d=Math.hypot(dx,dz); if(d<(ACTIVE?9:7)){ GUIDE.visible=false; return; }
    GUIDE.visible=true; GUIDE.position.set(px+dx/d*2.6,H(px,pz)+(st.car?3.4:2.9)+Math.sin(tAll*4)*.12,pz+dz/d*2.6); GUIDE.rotation.y=Math.atan2(dx,dz); }
  function dailyHud(){ const chip=document.getElementById('dChip'); if(!chip) return; chip.hidden=true; return; const on=GAME.started&&!GAME.paused&&!st.inside; chip.hidden=!on; if(!on) return; const D=dailyGet(); chip.textContent=`📋 ${D.done.length}/${D.ids.length}${OWN.streak>1&&D.paid?' 🔥'+OWN.streak:''}`; if(!GUIDE.d1&&DONE.has('m1')){ GUIDE.d1=1; if(!D.paid){ setTimeout(()=>toast(`<b>📋 Zlecenia dnia ${D.done.length}/${D.ids.length}</b><br>Za komplet premia ${fmt(dailyPrize())} + bonus za serię dni${OWN.streak>0?' (obecnie '+OWN.streak+')':''}`,6),4000); } } }
  { const chip=document.getElementById('dChip'); if(chip) chip.addEventListener('click',e=>{ e.stopPropagation(); LOG_SEL='daily'; toggleLog(true); }); setInterval(dailyHud,1000); }
  function missionUpdate(dt){ try{ guideUpdate(); }catch(e){} sideRefresh(dt); MISSIONS.forEach((m,i)=>{ if(m.mk.visible) m.mk.children[0].material.opacity=.25+Math.sin(tAll*3+i)*.08; });
    if(smoke.visible) smoke.children.forEach(s=>{ const k=(s.userData.o+tAll*.12)%1; s.position.set(Math.sin(k*9)*1.5,2+k*18,Math.cos(k*7)*1.5); s.scale.setScalar(1+k*4); });
    if(!ACTIVE){ missionEl.hidden=true; if(!abortEl.hidden) abortEl.hidden=true; return; } if(abortEl.hidden) abortEl.hidden=false; const A=ACTIVE, s=A.steps[A.i]; if(A.m.time){ A.t-=dt; if(A.t<=0){ endMission(false); return; } }
    let info='', d=0;
    if(s.escape){ info=st.wanted>0?`Gwiazdki: ${st.wanted} - uciekaj!`:''; if(st.wanted===0&&tAll-A.ts>2) return nextStep(); }
    else if(s.buy){ d=st.inside?0:Math.hypot(s.p[0]-st.x,s.p[1]-st.z); if(LASTBUY&&LASTBUY.t>=A.ts&&LASTBUY.shop===s.buy&&(!s.item||LASTBUY.item===s.item)) return nextStep(); info=st.inside||d<8?`podejdź do kasy i naciśnij E${s.item?' · '+s.item:''}`:''; }
    else if(s.room){ const o=s.room; cpMark.scale.set(1,1,1); if(st.inside&&CUR===o){ const tx=o.x+s.lp[0], tz=o.z+s.lp[1], lv=s.lv||0, lvOK=((st.gy||0)>1.8?1:0)===lv; d=Math.hypot(tx-st.x,tz-st.z); cpMark.position.set(tx,o.y+lv*SCH_F,tz); cpMark.scale.set(.32,.085,.32);
        if(d<(s.r||1.6)&&lvOK){ if(s.wait){ A.w+=dt; info=`${Math.ceil(s.wait-A.w)} s`; if(A.w>=s.wait){ if(s.done) toast(s.done,3.5); return nextStep(); } } else return nextStep(); } else { if(s.wait) A.w=Math.max(0,A.w-dt*.5); if(!lvOK) info=lv?'wejdź schodami na piętro':'zejdź schodami na parter'; } }
      else if(o.ent){ const e=o.ent.p; d=Math.hypot(e[0]-st.x,e[1]-st.z); cpMark.position.set(e[0],H(e[0],e[1]),e[1]); info=st.inside?'wyjdź i wejdź do szkoły':'wejdź do szkoły'; } }
    else { cpMark.scale.set(1,1,1); const PP=st.inside&&CUR.worldPos?CUR.worldPos:[st.x,st.z]; d=Math.hypot(s.p[0]-PP[0],s.p[1]-PP[1]); const R0=Math.max(s.r||(st.car?6:3.5),st.inside&&CUR.worldPos?6:0); const bad=stepOK(s);
      if(d<R0){ if(bad) info=bad; else if(s.pay){ if(st.money>=s.pay){ if(s.wait){ A.w+=dt; info=`${Math.ceil(s.wait-A.w)} s`; if(A.w>=s.wait){ st.money-=s.pay; shownMoney=st.money; toast(`Zapłacono ${fmt(s.pay)}`,2); return nextStep(); } } else { st.money-=s.pay; shownMoney=st.money; moneyEl.textContent=fmt(st.money); toast(`Zapłacono ${fmt(s.pay)}`,2); return nextStep(); } } else info=`Brakuje ${fmt(s.pay-st.money)}`; }
        else if(s.wait){ A.w+=dt; info=`${Math.ceil(s.wait-A.w)} s`; if(A.w>=s.wait){ if(s.heal) st.hp=100; return nextStep(); } }
        else if(s.mini){ A.mIn=true; if(!MG.on&&!A.mLock){ A.mLock=true; A.mRetry=false; openMini(s.mini,{...(s.mo||{}),mission:true,sub:A.m.n,onEnd:w=>{ if(ACTIVE===A&&A.steps[A.i]===s){ if(w) nextStep(); else A.mRetry=true; } }}); } info=A.mRetry?(IS_TOUCH?'Jeszcze raz - przycisk akcji':'E - spróbuj ponownie'):''; }
        else return nextStep(); } else { if(s.wait) A.w=Math.max(0,A.w-dt*.5); if(s.mini){ A.mIn=false; if(d>R0+2&&A.mRetry){ A.mLock=false; A.mRetry=false; } } } }
    missionEl.hidden=false; missionEl.innerHTML=`<b>${A.m.n}</b><span>${s.t}${s.p&&d>1?' · '+Math.round(d)+' m':''}${info?' · '+info:''}</span>${A.m.time?`<em>${Math.max(0,Math.ceil(A.t))} s</em>`:''}`; }
  function nextStep(){ const A=ACTIVE, s=A.steps[A.i]; if(s.onDone){ try{ s.onDone(); }catch(e){} } if(s.win){ endMission(true); winGame(); return; } A.i++; if(AU.ctx&&AU.on)sfx.cash(); if(A.i>=A.steps.length) endMission(true); else { stepBegin(); toast(A.steps[A.i].t,2.2); } }
  function winGame(){ const w=document.getElementById('winScreen'); if(!w)return; w.hidden=false; w.querySelector('.stats').textContent=`Poziom ${st.level} · misje główne: ${DONE.size}/20 · czas gry: ${Math.round(tAll/60)} min`; }
  function extBlips(rx,px,py,sc){ const dot=(x,z,c,r)=>{ const [a,b]=mp(x,z); rx.beginPath(); rx.arc(a-px,b-py,r/sc,0,7); rx.fillStyle=c; rx.fill(); rx.lineWidth=2/sc; rx.strokeStyle='#000'; rx.stroke(); };
    if(ACTIVE){ const s=ACTIVE.steps[ACTIVE.i]; if(s.p) dot(s.p[0],s.p[1],'#ff3a3a',8); } else MISSIONS.forEach(m=>{ if(m.mk.visible) dot(m.sp[0],m.sp[1],m.main?'#ffd23a':'#3fb0ff',6); }); if(WAYPOINT) dot(WAYPOINT[0],WAYPOINT[1],'#c86bff',7);
    COPS.forEach(c=>dot(c.x,c.z,Math.floor(tAll*4)%2?'#2040ff':'#ff2020',5)); NPC.forEach(n=>{ const s=npcStage(n.id); if(s!=='zadanie'&&s!=='ma')return; const t=npcTarget(n); if(t) dot(t.p[0],t.p[1],s==='ma'?'#7ee08a':'#ffd34a',5); }); mpBlips(dot); }
  let WAYPOINT=null;
  // dziennik misji (Q)
  const logEl=document.getElementById('questLog'); let LOG_SEL=null;
  function renderLog(){ const row=(m)=>{ const done=m.main?DONE.has(m.id):false, a=avail(m), cd=!m.main&&SIDE_T[m.id]?Math.max(0,Math.ceil((SIDE_CD*1000-(Date.now()-SIDE_T[m.id]))/1000)):0; const lock=m.main&&!done&&!a; const act=ACTIVE&&ACTIVE.m===m;
      const st2=act?'▶':done?'✓':lock?'🔒':cd?'⏳':'●'; const sub=m.main?(done?'ukończona':lock?(st.level<m.lvl?`wymaga poziomu ${m.lvl}`:'najpierw poprzednia misja'):act?'w trakcie':'dostępna'):(act?'w trakcie':cd?`znów za ${Math.floor(cd/60)}:${String(cd%60).padStart(2,'0')}`:'dostępna');
      return `<button class="q${LOG_SEL===m.id?' sel':''}${done?' done':''}${lock?' lock':''}" data-id="${m.id}"><span class="ic">${st2}</span><span class="nm">${m.main?CAMPAIGN.indexOf(m)+1+'. ':''}${m.n}${!m.main&&sideBonus().includes(m.id)?' <b style="color:var(--accent)">★ ×1,5</b>':''}</span><span class="sb">${sub}</span></button>`; };
    const npcRow=n=>{ const s=npcStage(n.id); const ic=s==='koniec'?'✓':s==='ma'?'?':s==='zadanie'?'▶':s.startsWith('obraz')?'☹':'!'; const sb=s==='koniec'?'ukończone':s==='ma'?'wróć po nagrodę':s==='zadanie'?'w trakcie':s.startsWith('obraz')?'obrażony':'porozmawiaj'; return `<button class="q${LOG_SEL==='npc:'+n.id?' sel':''}${s==='koniec'?' done':''}" data-id="npc:${n.id}"><span class="ic">${ic}</span><span class="nm">${n.name}</span><span class="sb">${sb}</span></button>`; };
    const selN=LOG_SEL&&LOG_SEL.startsWith('npc:')?NPC.find(n=>'npc:'+n.id===LOG_SEL):null;
    const sel=selN?null:MISSIONS.find(m=>m.id===LOG_SEL)||ACTIVE&&ACTIVE.m||CAMPAIGN.find(m=>!DONE.has(m.id))||CAMPAIGN[19];
    const nDone=NPC.filter(n=>npcStage(n.id)==='koniec').length;
    logEl.querySelector('.ql').innerHTML='<h3>Fabuła</h3>'+CAMPAIGN.map(row).join('')+'<h3>Poboczne</h3>'+SIDE.map(row).join('')+`<h3>Postacie · ${nDone}/${NPC.length}</h3>`+NPC.map(npcRow).join('')+`<h3>Kolekcja</h3><button class="q${LOG_SEL==='turbo'?' sel':''}" data-id="turbo"><span class="ic">🍬</span><span class="nm">Historyjki z gum Turbo</span><span class="sb">${TURBO_HAVE.size}/${TURBO_CARS.length}</span></button>`+(()=>{ const D=dailyGet(); const xb=(id,ic,nm,sb)=>`<button class="q${LOG_SEL===id?' sel':''}" data-id="${id}"><span class="ic">${ic}</span><span class="nm">${nm}</span><span class="sb">${sb}</span></button>`;
      return '<h3>Postęp</h3>'+xb('daily','📋','Zlecenia dnia',`${D.done.length}/${D.ids.length}${D.paid?' · premia odebrana':''}`)+xb('ach','🏆','Osiągnięcia',`${OWN.ach.length}/${ACH.length}`)+xb('own','🔑','Twoje rzeczy',OWN.car?CARS[OWN.car].n:'bez auta')+xb('rank','📊','Ranking graczy',rankNick()?'twoja nazwa: '+rankNick():'ustaw nazwę w trybie wieloosobowym'); })();
    if(selN){ const n=selN, s=npcStage(n.id), I=NPC_INFO[n.id]||{}; const now=s==='start'?`Porozmawiaj z postacią ${I.where?'- stoi '+I.where:''}.`:s==='zadanie'?I.task:s==='ma'?'Masz to, czego potrzebuje - wróć i oddaj.':s.startsWith('obraz')?(I.bad||'Przeproś.'):'Zadanie ukończone - możesz dalej pogadać.';
      logEl.querySelector('.qd').innerHTML=`<h2>${n.name}</h2><p class="meta">${n.title}${I.where?' · '+I.where:''} · nagroda ${fmt(I.money||0)} · ${I.xp||0} XP</p><p>${now}</p><p class="meta">Rozmowa przez AI: możesz pisać własne pytania. Gdy serwer nie odpowiada, postać mówi gotowymi kwestiami.</p>${s!=='koniec'?'<button class="btn" id="qWay">Pokaż na mapie</button>':''}`; }
    else if(LOG_SEL==='daily'){ const D=dailyGet(); logEl.querySelector('.qd').innerHTML=`<h2>Zlecenia dnia</h2><p class="meta">Trzy misje poboczne z różnych kategorii · zmieniają się codziennie · za komplet premia ${fmt(dailyPrize())}</p>`+D.ids.map(id=>{ const m=SIDE.find(q=>q.id===id); return `<p>${D.done.includes(id)?'✓':'○'} <b>${m?m.n:id}</b>${m&&m.req&&!m.req()?' (jeszcze niedostępna - odblokuj ją wcześniejszymi zadaniami)':''}<br><span class="meta">${m?m.desc:''}</span></p>`; }).join('')+(D.paid?'<p><b>Komplet wykonany - premia odebrana. Nowe zlecenia jutro.</b></p>':''); }
    else if(LOG_SEL==='ach'){ logEl.querySelector('.qd').innerHTML=`<h2>Osiągnięcia</h2><p class="meta">${OWN.ach.length} z ${ACH.length} · przejechane: ${(OWN.odo/1000).toFixed(1)} km · bez mandatu: ${Math.floor(OWN.clean/60)} min</p>`+ACH.map(a=>`<p>${OWN.ach.includes(a.id)?'🏆':'○'} <b>${a.n}</b> - ${a.d}${a.r?` · ${fmt(a.r)}`:''}</p>`).join(''); }
    else if(LOG_SEL==='own'){ logEl.querySelector('.qd').innerHTML=`<h2>Twoje rzeczy</h2><p><b>Auto:</b> ${OWN.car?CARS[OWN.car].n+(OWN.tune.chip?' · chip tuning':'')+(OWN.tune.bak?' · większy bak':''):'brak - kup je w Auto-Komisie przy DK42'}${OWN.car?' (stoi na twoim parkingu obok punktu informacyjnego)':''}</p><p><b>Rower:</b> ${OWN.bike?'tak':'nie'}</p><p><b>Ubrania:</b> ${OWN.outfits.length?OWN.outfits.map(k=>OUTFITS[k].n).join(', '):'-'}</p><p><b>Dom:</b> ${DONE.has('m20')?'kupiony · meble: '+(OWN.furn.length?OWN.furn.map(k=>FURN[k][0]).join(', '):'brak'):'jeszcze nie (450 000 zł)'}</p>${KOMIS?'<button class="btn" id="qKomis">Pokaż Auto-Komis na mapie</button>':''}`; const qk=document.getElementById('qKomis'); if(qk) qk.addEventListener('click',()=>{ WAYPOINT=KOMIS.p.slice(); toggleLog(false); toast('Auto-Komis zaznaczony na radarze',2.5); }); }
    else if(LOG_SEL==='rank'){ const qd=logEl.querySelector('.qd'); const show=c=>{ if(LOG_SEL!=='rank') return; if(!c){ qd.innerHTML='<h2>Ranking graczy</h2><p>Ranking jest teraz niedostępny (brak połączenia z serwerem).</p>'; return; } const li=(a,f)=>a.length?'<ol>'+a.slice(0,5).map(r=>`<li><b>${r.n.replace(/[<>&]/g,'')}</b> - ${f(r.s)}</li>`).join('')+'</ol>':'<p>Jeszcze nikt.</p>'; qd.innerHTML=`<h2>Ranking graczy</h2><p class="meta">${rankNick()?'Grasz jako: '+rankNick():'Ustaw nazwę w trybie wieloosobowym, żeby trafić do rankingu.'}</p><h3>Najwięcej pieniędzy</h3>${li(c.kasa,v=>fmt(v))}<h3>Najszybszy „Wyścig dookoła wsi”</h3>${li(c.wyscig,v=>(600-v/10).toFixed(1)+' s')}`; };
      qd.innerHTML='<h2>Ranking graczy</h2><p>Wczytywanie…</p>'; if(RANK_CACHE&&Date.now()-RANK_CACHE.t<60000) show(RANK_CACHE); else rankLoad(show); }
    else if(LOG_SEL==='turbo'){ logEl.querySelector('.qd').innerHTML=`<h2>Historyjki z gum Turbo</h2><p class="meta">Kupuj gumy Turbo w sklepiku szkolnym (1 zł). Każda ma losową historyjkę z autem. Za pełną kolekcję: ${fmt(1500)} i 150 XP.</p><div class="turboGrid">${TURBO_CARS.map((c,i)=>TURBO_HAVE.has(i)?`<span class="have"><b>${i+1}</b>${c}</span>`:`<span><b>${i+1}</b>?</span>`).join('')}</div>`; }
    else logEl.querySelector('.qd').innerHTML=sel?`<h2>${sel.n}</h2><p class="meta">${sel.main?`Misja ${CAMPAIGN.indexOf(sel)+1} z 20 · poziom ${sel.lvl}`:'Misja poboczna · co 5 min'} · nagroda ${sel.reward?fmt(sel.main?sel.reward:sideReward(sel)):'-'}${!sel.main&&sideFresh(sel)<1?` (powtarzana - ${Math.round(sideFresh(sel)*100)}%, odnawia się z czasem)`:''} · ${sel.xp} XP</p><p>${sel.desc}</p>${avail(sel)&&!ACTIVE?'<button class="btn" id="qWay">Pokaż na mapie</button>':''}${ACTIVE&&ACTIVE.m===sel?'<button class="btn" id="qAbort">Przerwij misję</button>':''}`:'';
    logEl.querySelectorAll('button.q').forEach(b=>b.addEventListener('click',()=>{ LOG_SEL=b.dataset.id; renderLog(); }));
    const w=document.getElementById('qWay'); if(w) w.addEventListener('click',()=>{ try{ if(selN){ const t=npcTarget(selN); if(t) WAYPOINT=t.p.slice(); } else WAYPOINT=sel.start(); }catch(e){} toast('Cel zaznaczony na radarze (fioletowy)',2.5); const fm=LOG_FROM_MENU; LOG_FROM_MENU=false; toggleLog(false); if(fm) showMenu(false); });
    const ab=document.getElementById('qAbort'); if(ab) ab.addEventListener('click',()=>{ endMission(false); renderLog(); });
    $('qMoney').textContent=fmt(st.money); $('qLvl').textContent='Poziom '+st.level+' · '+st.xp+' XP'; }
  let LOG_FROM_MENU=false;
  function toggleLog(v){ logEl.hidden=v===undefined?!logEl.hidden:!v; if(!logEl.hidden){ keys.clear(); renderLog(); } else if(LOG_FROM_MENU){ LOG_FROM_MENU=false; showMenu(true); } }
  addEventListener('keydown',e=>{ if(e.code==='Escape'&&!logEl.hidden){ toggleLog(false); e.preventDefault(); e.stopPropagation(); } },true);
  document.getElementById('qClose').addEventListener('click',()=>toggleLog(false)); if(IS_TOUCH) document.getElementById('qClose').textContent='Zamknij';

  /* ---------- zapis postępu ---------- */
  addEventListener('pagehide',()=>{ try{ saveGame(); }catch(e){} }); document.addEventListener('visibilitychange',()=>{ if(document.hidden){ try{ saveGame(); }catch(e){} } });
  const LASTOUT={x:Math.round(st.x*10)/10,z:Math.round(st.z*10)/10,yaw:Math.round(st.yaw*100)/100};
  function saveGame(){ if(!st.inside){ LASTOUT.x=Math.round(st.x*10)/10; LASTOUT.z=Math.round(st.z*10)/10; LASTOUT.yaw=Math.round(st.yaw*100)/100; } try{ localStorage.setItem('trebaczew-gra',JSON.stringify({v:2,money:st.money,xp:st.xp,sideN:SIDE_N,turbo:st.turbo||0,turboSet:[...TURBO_HAVE],done:[...DONE],side:SIDE_T,season:ENV.season,time:ENV.time,weather:ENV.weather,px:LASTOUT.x,pz:LASTOUT.z,pyaw:LASTOUT.yaw})); }catch(e){} }
  try{ const sv=JSON.parse(localStorage.getItem('trebaczew-gra')||'null'); if(sv){ if(saved.money===undefined){ st.money=+sv.money||0; shownMoney=st.money; } if(sv.v===2){ (sv.done||[]).forEach(d=>{ if(CAMPAIGN.some(m=>m.id===d)) DONE.add(d); }); st.xp=Math.max(0,+sv.xp||0); if(sv.side&&typeof sv.side==='object') Object.keys(sv.side).forEach(k=>{ if(SIDE.some(m=>m.id===k)) SIDE_T[k]=+sv.side[k]||0; }); } if(sv.turbo) st.turbo=+sv.turbo||0; if(sv.sideN&&typeof sv.sideN==='object') Object.keys(sv.sideN).forEach(k=>{ const r=sv.sideN[k]; if(r&&isFinite(r.n)&&isFinite(r.t)) SIDE_N[k]={n:+r.n,t:+r.t}; }); if(Array.isArray(sv.turboSet)) sv.turboSet.forEach(i=>{ if(Number.isInteger(i)&&i>=0&&i<TURBO_CARS.length) TURBO_HAVE.add(i); }); if(sv.season!==undefined)ENV.season=sv.season; if(sv.time!==undefined)ENV.time=sv.time; } }catch(e){}
  { let has=false; try{ has=!!localStorage.getItem('trebaczew-gra'); }catch(e){} if(!has&&saved.money===undefined&&st.money<200){ st.money=200; shownMoney=st.money; } }
  st.level=levelOf(st.xp); updLevel(); refreshMarks();
  /* ---------- postęp: własne auto i tuning, ubrania, dom do urządzenia, zlecenia dnia, osiągnięcia, ranking ---------- */
  const OWN=(()=>{ let o=null; try{ o=JSON.parse(localStorage.getItem('trebaczew-wlasne')||'null'); }catch(e){} return Object.assign({car:null,tune:{},outfits:[],bike:false,furn:[],ach:[],daily:null,odo:0,clean:0,rank:0,inv:{}},o||{}); })();
  const ownSave=()=>{ try{ localStorage.setItem('trebaczew-wlasne',JSON.stringify(OWN)); }catch(e){} };
  const CARS={fiat:{n:'Fiat 126p',p:3000,c:0xc8302a,v:28,a:4},polonez:{n:'Polonez Caro',p:8000,c:0x5a7a9a,v:36,a:5.5},astra:{n:'Opel Astra II',p:11500,c:0xa9adb2,v:47,a:7},golf:{n:'VW Golf III',p:15000,c:0x2a4a8a,v:55,a:8},bmw:{n:'BMW E36 328i',p:35000,c:0x15161a,v:72.5,a:10.5}};
  const TUNE={chip:{n:'Chip tuning (+15% prędkości, +25% przyspieszenia)',p:6000},bak:{n:'Większy bak (+50%)',p:3000}};
  const OUTFITS={dres:{n:'Dres sportowy',p:400,o:{style:'hoodie',top:0x1f2a44,bot:0x1f2a44}},skora:{n:'Kurtka skórzana',p:1200,o:{style:'jacket',top:0x161616,bot:0x2c3e66}},garnitur:{n:'Garnitur',p:2500,o:{style:'coat',top:0x23262f,bot:0x23262f}}};
  // garaż gracza: wiata obok punktu informacyjnego
  let GARAGE=(()=>{ if(!INFO) return null; const fx=-Math.sin(SPAWN.yaw), fz=-Math.cos(SPAWN.yaw); const q=npcFind(INFO.p[0]-fz*7,INFO.p[1]+fx*7,2.6,900); const h=Math.atan2(fz,fx);
    return {x:q[0],z:q[1],h}; })();
  let OWN_CAR=null, OWN_BIKE=null;
  function spawnOwnCar(){ if(OWN_CAR){ scene.remove(OWN_CAR.g); const i=parked.indexOf(OWN_CAR); if(i>=0) parked.splice(i,1); OWN_CAR=null; } const C=CARS[OWN.car]; if(!C||!GARAGE) return;
    const g=makeCar(C.c,'car'); const c={g,x:GARAGE.x,z:GARAGE.z,h:GARAGE.h,v:0,steer:0,L:4.3,W:1.95,kind:'car',name:'Twoje auto: '+C.n,own:true,maxV:C.v*(OWN.tune.chip?1.15:1),acc:C.a*(OWN.tune.chip?1.25:1),capMul:OWN.tune.bak?1.5:1}; seatCar(g,c.x,c.z,c.h); scene.add(g); parked.push(c); OWN_CAR=c; }
  function spawnOwnBike(){ if(!OWN.bike||OWN_BIKE||!GARAGE) return; const b=bikeM(); b.userData.wheels=[]; const x=GARAGE.x+Math.cos(GARAGE.h+Math.PI/2)*2.2, z=GARAGE.z+Math.sin(GARAGE.h+Math.PI/2)*2.2; OWN_BIKE=addParked(b,x,z,GARAGE.h,'bike','Twój rower',9,4.5)||addParked(b,GARAGE.x-Math.cos(GARAGE.h)*3.2,GARAGE.z-Math.sin(GARAGE.h)*3.2,GARAGE.h,'bike','Twój rower',9,4.5); }
  function applyOutfit(k){ const O=OUTFITS[k]; if(!O) return; Object.assign(CHAR,O.o); saveChar(); rebuildPlayer(); }
  spawnOwnCar(); spawnOwnBike();
  { const f=B_LEW&&B_LEW.front; if(f){ const hs=houses.filter(q=>q.kind==='house'&&!q.isPart&&!q.cust&&(!ADOPT||q!==ADOPT.h)).map(q=>[q,Math.hypot(q.x-f.x,q.z-f.z)]).filter(q=>q[1]>18).sort((a,b)=>a[1]-b[1]); const h=hs[0]&&hs[0][0]; if(h){ const p=frontOf(h);
      NPC_PICKS.push({id:'stasia_pick',p,label:'zostaw siatkę z zakupami przy furtce Pani Stasi',on:()=>NQ.stasia==='zadanie'&&hasIt('siatka'),act:()=>{ takeIt('siatka'); NQ.stasia='koniec'; nqSave(); addMoney(120); addXP(35); toast('Siatka zostawiona przy furtce - Pani Stasia na pewno się ucieszy!<br>+120 zł · +35 XP',4); }});
      const m=new THREE.Mesh(BEAC[0].geometry,beaconM); m.position.set(p[0],H(p[0],p[1]),p[1]); m.visible=false; scene.add(m); BEAC.push(m); } } }
  // komis samochodowy przy DK42: plac, auta na sprzedaż, kontener-biuro, pylon
  // sklep ŚRUBY + stacja LPG (STALPOL) przy ul. Wyzwolenia, model z Blendera (tools/blender/lpg.py)
  // sklep ŚRUBY + stacja LPG (STALPOL) przy ul. Wyzwolenia, model z Blendera (tools/blender/lpg.py)
  const LPGS=(()=>{ const F=LPGF; if(!F) return null; const {L,th,mx,mz,Ox,Oz}=F; const rect=(a,b,c,d)=>[L(a,c),L(b,c),L(b,d),L(a,d)]; const hg=H(Ox,Oz);
    const grp=new THREE.Group(); grp.position.set(Ox,hg,Oz); grp.rotation.y=th; scene.add(grp); const m=modelMesh('lpg'); if(m){ m.position.y=0; grp.add(m); }
    const sol=(lx,lz,hw,hd)=>{ const c=L(lx,lz); addSolid({x:c[0],z:c[1],hw,hd,c:Math.cos(-th),s:Math.sin(-th),r:Math.hypot(hw,hd)+.3}); };
    sol(0,0,7,4.5); sol(-13,.7,3,1.7); sol(11.5,-2,2.6,1); sol(9.5,8.5,.5,.7);
    drape(rect(-22,16,5,26),lotPaver,.1,2.2); drape(rect(-24,-8,-8,5),lotPaver,.1,2.2);
    const car=makeCar(0x8a8f78,'car'); const q=L(3,12); seatCar(car,q[0],q[1],Math.atan2(mz,mx)+.4); scene.add(car); addSolid({x:q[0],z:q[1],hw:2.2,hd:1,c:Math.cos(Math.atan2(mz,mx)),s:Math.sin(Math.atan2(mz,mx)),r:2.5});
    { const wl=L(0,12); POIS.push({n:'Stacja LPG i sklep ŚRUBY',x:wl[0],z:wl[1],p:wl,c:'#1f5fa8',ic:'L',sp:labelSprite('Stacja LPG','#1f5fa8')}); const lp=POIS[POIS.length-1]; lp.sp.position.set(wl[0],H(wl[0],wl[1])+9,wl[1]); lp.sp.visible=false; scene.add(lp.sp); const b=document.createElement('button'); b.innerHTML=`<i style="background:${lp.c}"></i>`; b.append(lp.n); b.addEventListener('click',()=>{ goTo(lp); toggleMap(false); }); poiList.append(b); }
    return {L,th}; })();
  // Cementownia Warta: ciąg technologiczny i biuro z Blendera + ogrodzenie, drogi, parking, tiry i pracownicy w białych kaskach
  let CEMENT=null; CEMENT=(()=>{ const F=CEMF; if(!F) return null; const hg=F.h;
    const area=p=>{ let a=0; for(let i=0;i<p.length;i++){ const q=p[(i+1)%p.length]; a+=p[i][0]*q[1]-q[0]*p[i][1]; } return a/2; };
    const clean=p=>{ const o=[]; p.forEach(q=>{ const l=o[o.length-1]; if(!l||Math.hypot(q[0]-l[0],q[1]-l[1])>.4) o.push(q); }); if(o.length>2&&Math.hypot(o[0][0]-o[o.length-1][0],o[0][1]-o[o.length-1][1])<.4) o.pop(); return o; };
    // kolizje: pudełko po obrysie lub paski wzdłuż najdłuższej krawędzi (budynki w kształcie L, U)
    const solidsFor=(pts,A)=>{ let best=0,ang=0; for(let i=0;i<pts.length;i++){ const a=pts[i],b=pts[(i+1)%pts.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]); if(l>best){ best=l; ang=Math.atan2(b[1]-a[1],b[0]-a[0]); } }
      const c=Math.cos(ang), s=Math.sin(ang); const U=pts.map(p=>p[0]*c+p[1]*s), V=pts.map(p=>-p[0]*s+p[1]*c); const u0=Math.min(...U),u1=Math.max(...U),v0=Math.min(...V),v1=Math.max(...V); const fill=A/Math.max(1,(u1-u0)*(v1-v0));
      const box=(ua,ub,va,vb)=>{ const uc=(ua+ub)/2, vc=(va+vb)/2, hw=(ub-ua)/2, hd=(vb-va)/2; addSolid({x:uc*c-vc*s,z:uc*s+vc*c,hw:hw+.2,hd:hd+.2,c,s,r:Math.hypot(hw,hd)+.6}); };
      if(fill>.8){ box(u0,u1,v0,v1); return; }
      const cs=6; for(let v=v0;v<v1;v+=cs){ let run=null; for(let u=u0;u<=u1+cs;u+=cs){ const uc=u+cs/2, vc=v+cs/2, ins=u<u1&&inPoly(uc*c-vc*s,uc*s+vc*c,pts); if(ins){ if(run===null) run=u; } else if(run!==null){ box(run,u,v,v+cs); run=null; } } } };
    // tekstura blachy trapezowej / elewacji
    const cv=document.createElement('canvas'); cv.width=64; cv.height=64; { const g=cv.getContext('2d'); g.fillStyle='#e6e6e6'; g.fillRect(0,0,64,64); for(let i=0;i<8;i++){ g.fillStyle=i%2?'#d4d4d4':'#f4f4f4'; g.fillRect(i*8,0,8,64); } g.fillStyle='rgba(60,70,80,.45)'; g.fillRect(0,40,64,10); }
    const wt=new THREE.CanvasTexture(cv); wt.wrapS=wt.wrapT=THREE.RepeatWrapping; wt.repeat.set(.25,.125); wt.anisotropy=ANISO;
    const wallMs=[0xb4bcc2,0xc9c4b6,0xa4afb7,0xd2cfc6].map(c=>new THREE.MeshLambertMaterial({color:c,map:wt}));
    const roofM=new THREE.MeshLambertMaterial({color:0x8f979c}), siloM=new THREE.MeshLambertMaterial({color:0xb5b3ac}), domeM=new THREE.MeshLambertMaterial({color:0xc4c2ba});
    const baseY=(pts)=>Math.min(...pts.map(p=>H(p[0],p[1])));
    let kb=0, siloN=0;
    const hByName=n=>/Młynownia surowca i cementu/.test(n)?30:/Chłodnik/.test(n)?36:/Stacja Przesypowa/.test(n)?20:/Zbiornik pyłów/.test(n)?14:/kompresownia|sprężarek/.test(n)?9:/laboratorium/.test(n)?8:/Dozownia/.test(n)?11:/Pompownia/.test(n)?5:/transformatorowa/.test(n)?5:/Młynownia surowca/.test(n)?22:/Prokstal/.test(n)?10:0;
    // ---- teren przy cementowni wg OSM: bloki mieszkalne i domy ----
    const WB=[["office",[[283,2861],[292,2861],[301,2861],[320,2860],[320,2866],[350,2866],[350,2879],[315,2880],[315,2894],[302,2895],[302,2885],[290,2886],[290,2880],[284,2880],[283,2861]]],["yes",[[247,2865],[252,2857],[261,2863],[256,2871],[247,2865]]],["semidetached_house",[[158,2810],[163,2802],[165,2803],[165,2803],[166,2803],[166,2804],[170,2807],[171,2806],[172,2807],[171,2808],[172,2808],[168,2816],[158,2810]]],["apartments",[[163,2853],[169,2843],[200,2862],[193,2872],[163,2853]]],["apartments",[[114,2834],[120,2824],[150,2843],[144,2853],[114,2834]]],["garages",[[208,2827],[226,2787],[231,2789],[213,2829],[208,2827]]],["abandoned",[[-147,2775],[-138,2773],[-137,2778],[-136,2783],[-145,2784],[-147,2775]]],["apartments",[[89,2806],[94,2798],[95,2799],[96,2800],[110,2808],[111,2809],[112,2810],[108,2817],[89,2806]]],["yes",[[225,2996],[240,2996],[241,3005],[226,3006],[225,2996]]],["transportation",[[73,2979],[78,2972],[86,2978],[81,2985],[73,2979]]],["garages",[[224,2825],[237,2796],[242,2798],[234,2818],[229,2827],[224,2825]]],["semidetached_house",[[143,2793],[148,2786],[158,2792],[153,2799],[143,2793]]],["yes",[[240,2996],[255,2995],[256,3004],[241,3005],[240,2996]]],["apartments",[[-82,3027],[-77,3020],[-73,3023],[-68,3017],[-65,3019],[-71,3025],[-17,3068],[-12,3062],[-10,3064],[-15,3070],[-11,3073],[-17,3080],[-82,3027]]],["office",[[302,2897],[314,2897],[315,2941],[303,2941],[302,2897]]],["yes",[[286,2759],[290,2756],[299,2769],[294,2772],[286,2759]]],["apartments",[[-97,2941],[-64,2905],[-57,2912],[-90,2948],[-97,2941]]],["yes",[[320,2823],[329,2823],[330,2848],[321,2848],[320,2823]]],["yes",[[276,2991],[281,2991],[282,3004],[276,3004],[276,2991]]],["semidetached_house",[[126,2782],[130,2775],[140,2781],[135,2788],[126,2782]]],["semidetached_house",[[179,2816],[184,2808],[185,2809],[185,2808],[187,2809],[186,2810],[191,2812],[191,2812],[192,2812],[192,2813],[194,2814],[189,2822],[179,2816]]],["transportation",[[137,3018],[141,3014],[142,3014],[142,3013],[147,3017],[147,3018],[151,3021],[148,3026],[137,3018]]],["yes",[[-111,2961],[-99,2947],[-93,2952],[-105,2966],[-107,2964],[-111,2961]]],["semidetached_house",[[105,2774],[110,2767],[120,2773],[115,2780],[105,2774]]],["outbuilding",[[-95,3043],[-99,3048],[-102,3045],[-105,3043],[-101,3038],[-98,3040],[-95,3043]]],["garages",[[234,2818],[240,2820],[248,2800],[242,2798],[234,2818]]],["apartments",[[84,2789],[89,2781],[72,2771],[67,2779],[84,2789]]],["yes",[[141,2870],[142,2871],[143,2868],[141,2867],[141,2870]]],["yes",[[291,2754],[296,2750],[301,2756],[295,2760],[291,2754]]],["yes",[[-129,2782],[-124,2782],[-124,2775],[-130,2776],[-129,2782]]],["yes",[[-82,3042],[-80,3039],[-66,3050],[-68,3053],[-82,3042]]],["yes",[[-45,3071],[-43,3068],[-30,3079],[-32,3082],[-45,3071]]],["yes",[[-30,3079],[-29,3078],[-22,3084],[-25,3088],[-32,3082],[-30,3079]]],["yes",[[-4,3031],[16,3006],[20,3010],[21,3009],[24,3011],[3,3036],[-4,3031]]],["yes",[[-70,2983],[-68,2980],[-65,2984],[-66,2986],[-70,2983]]],["yes",[[-110,2987],[-113,2984],[-109,2981],[-107,2983],[-110,2987]]],["yes",[[-111,2961],[-113,2964],[-109,2967],[-107,2964],[-111,2961]]]]; const PKW=[[[117,2895],[128,2896],[127,2902],[129,2905],[151,2919],[149,2922],[151,2923],[162,2931],[164,2928],[196,2947],[195,2951],[199,2953],[208,2960],[211,2962],[213,2960],[225,2966],[222,2976],[214,2985],[194,2976],[185,2980],[176,2980],[168,2981],[157,2974],[122,2952],[120,2948],[121,2927],[117,2925],[117,2923],[117,2903],[117,2895]],[[581,2788],[571,2782],[567,2789],[560,2794],[550,2795],[538,2795],[530,2790],[526,2784],[524,2775],[523,2718],[522,2711],[578,2709],[581,2788]],[[189,2888],[192,2883],[159,2863],[156,2868],[189,2888]],[[201,2878],[206,2882],[218,2862],[213,2859],[201,2878]],[[247,2860],[250,2855],[234,2843],[230,2849],[247,2860]],[[247,2940],[251,2943],[259,2947],[263,2950],[268,2952],[273,2954],[278,2955],[284,2957],[294,2957],[292,2917],[292,2915],[291,2912],[289,2910],[287,2909],[285,2908],[283,2907],[281,2907],[280,2907],[278,2907],[276,2908],[274,2909],[264,2917],[240,2935],[244,2940],[247,2940]]];
    { const fc=document.createElement('canvas'); fc.width=128; fc.height=128; const g=fc.getContext('2d'); g.fillStyle='#d9d2bf'; g.fillRect(0,0,128,128); g.fillStyle='#c4bba4'; g.fillRect(0,0,128,7); g.fillRect(0,121,128,7); [14,72].forEach(x=>{ g.fillStyle='#4a5560'; g.fillRect(x,34,40,64); g.fillStyle='#93a8b8'; g.fillRect(x+3,37,34,28); g.fillStyle='#e8e4d8'; g.fillRect(x-3,98,46,4); }); const facade=new THREE.CanvasTexture(fc); facade.wrapS=facade.wrapT=THREE.RepeatWrapping; facade.repeat.set(1/7.2,1/3.2); facade.anisotropy=ANISO;
      const blockM=new THREE.MeshLambertMaterial({color:0xffffff,map:facade}), roofB=new THREE.MeshLambertMaterial({color:0x6d6862});
      WB.forEach(([bt,raw])=>{ const pts=clean(raw.map(q=>[q[0],q[1]])); if(pts.length<3) return; const Ar=Math.abs(area(pts)); if(Ar<8) return; const c=[pts.reduce((a,q)=>a+q[0],0)/pts.length,pts.reduce((a,q)=>a+q[1],0)/pts.length];
        const ex=F.items.find(it=>it.t.building&&it.pts.length&&Math.hypot(it.pts.reduce((a,q)=>a+q[0],0)/it.pts.length-c[0],it.pts.reduce((a,q)=>a+q[1],0)/it.pts.length-c[1])<6); const apt=bt==='apartments'; if(Math.hypot(c[0]-181,c[1]-2857)<10) return;
        if(ex&&!apt) return; if(ex) ex.skip=true; const h=apt?12.8:bt==='garages'?3:bt==='outbuilding'?3.4:bt==='semidetached_house'?6.8:bt==='office'?9:bt==='abandoned'?5:6;
        const by=baseY(pts)-1.2; const sh=new THREE.Shape(pts.map(q=>new THREE.Vector2(q[0],-q[1]))); const geo=new THREE.ExtrudeGeometry(sh,{depth:h+1.2,bevelEnabled:false}); geo.rotateX(-Math.PI/2);
        const m=new THREE.Mesh(geo,[apt?roofB:roofM,apt?blockM:wallMs[(kb++)%wallMs.length]]); m.position.y=by; m.castShadow=true; scene.add(m); solidsFor(pts,Ar); }); }
    F.items.filter(it=>it.t.building).forEach(it=>{ if(it.skip) return; const pts=clean(it.pts); if(pts.length<3) return; const A=Math.abs(area(pts)); if(A<8) return;
      const xs=pts.map(p=>p[0]), zs=pts.map(p=>p[1]); const w=Math.max(...xs)-Math.min(...xs), d=Math.max(...zs)-Math.min(...zs), cx=(Math.max(...xs)+Math.min(...xs))/2, cz=(Math.max(...zs)+Math.min(...zs))/2;
      if(Math.abs(pts[0][0]-163)<1&&Math.abs(pts[0][1]-2853)<1) return; // biurowiec: osobny model
      const by=baseY(pts)-1.2, nm=it.name||'';
      if(pts.length>=16&&w/d>.85&&w/d<1.18&&A/(Math.PI*(w/2)*(d/2))>.85){ const r=Math.sqrt(A/Math.PI); const g=new THREE.Group(); g.position.set(cx,by,cz);
        if(r>16||/Silos/.test(nm)){ const cy=new THREE.Mesh(new THREE.CylinderGeometry(r,r,15+1.2,40),domeM); cy.position.y=(15+1.2)/2; g.add(cy); const dm=new THREE.Mesh(new THREE.SphereGeometry(r,40,12,0,Math.PI*2,0,Math.PI/2),domeM); dm.scale.y=.5; dm.position.y=16.2; g.add(dm); }
        else { const h=/homogeniz/.test(nm)?48:30; const cy=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h+1.2,24),siloM); cy.position.y=(h+1.2)/2; g.add(cy); const cn=new THREE.Mesh(new THREE.CylinderGeometry(r*.3,r,3,24),siloM); cn.position.y=h+1.2+1.5; g.add(cn); }
        scene.add(g); addSolid({x:cx,z:cz,hw:r,hd:r,c:1,s:0,r:r*1.45}); return; }
      let h=hByName(nm); if(!h){ const bt=it.t.building; h= it.lv? it.lv*3.3+1.5 : bt==='garages'?3.2 : bt==='office'?9 : bt==='outbuilding'?3.6 : A<60?4 : A<200?6.5 : A<800?9 : A<2500?12 : A<10000?15 : 14; }
      if(it.t.man_made==='storage_tank'&&A<120&&!/Zbiornik pyłów/.test(nm)) h=14;
      const sh=new THREE.Shape(pts.map(p=>new THREE.Vector2(p[0],-p[1]))); const geo=new THREE.ExtrudeGeometry(sh,{depth:h+1.2,bevelEnabled:false}); geo.rotateX(-Math.PI/2);
      const m=new THREE.Mesh(geo,[roofM,wallMs[(kb++)%wallMs.length]]); m.position.y=by; m.castShadow=true; scene.add(m); solidsFor(pts,A); });
    // rurociągi i taśmociągi (man_made=pipeline) - rury nad ziemią na słupach
    { const pipeM=new THREE.MeshLambertMaterial({color:0x8e949a}), postM=new THREE.MeshLambertMaterial({color:0x5d6369}); const Y=new THREE.Vector3(0,1,0), dv=new THREE.Vector3();
      F.items.filter(it=>it.t.man_made==='pipeline').forEach(it=>{ const p=it.pts; for(let i=0;i<p.length-1;i++){ const a=p[i], b=p[i+1], len=Math.hypot(b[0]-a[0],b[1]-a[1]); if(len<.5) continue; const my=Math.max(H(a[0],a[1]),H(b[0],b[1]))+5.5; const cyl=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,len,8),pipeM); cyl.position.set((a[0]+b[0])/2,my,(a[1]+b[1])/2); dv.set(b[0]-a[0],0,b[1]-a[1]).normalize(); cyl.quaternion.setFromUnitVectors(Y,dv); cyl.castShadow=true; scene.add(cyl);
          const n=Math.max(1,Math.floor(len/28)); for(let k=0;k<=n;k++){ const t=k/n, x=a[0]+(b[0]-a[0])*t, z=a[1]+(b[1]-a[1])*t; const ps=new THREE.Mesh(new THREE.BoxGeometry(.4,5.6,.4),postM); ps.position.set(x,H(x,z)+2.8,z); scene.add(ps); } } }); }
    // podłoże: beton w obrębie zakładu (otoczka wypukła budynków)
    const conc=po(new THREE.MeshLambertMaterial({color:0x8d8b86,map:detailTex,side:THREE.DoubleSide}),3);
    const gravelM=po(new THREE.MeshLambertMaterial({color:0xa39a86,map:detailTex,side:THREE.DoubleSide}),3);
    { const P=[]; F.items.filter(it=>it.t.building).forEach(it=>it.pts.forEach(p=>{ if(p[0]>250&&p[0]<1485&&p[1]<3000&&p[1]>2598) P.push(p); })); P.sort((a,b)=>a[0]-b[0]||a[1]-b[1]); const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]); const lo=[],up=[]; P.forEach(p=>{ while(lo.length>1&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0) lo.pop(); lo.push(p); }); [...P].reverse().forEach(p=>{ while(up.length>1&&cr(up[up.length-2],up[up.length-1],p)<=0) up.pop(); up.push(p); }); const hull=lo.slice(0,-1).concat(up.slice(0,-1)); const gx=hull.reduce((a,p)=>a+p[0],0)/hull.length, gz=hull.reduce((a,p)=>a+p[1],0)/hull.length;
      const dh=hull.map(p=>{ const dx=p[0]-gx, dz=p[1]-gz, l=Math.hypot(dx,dz)||1; return [p[0]+dx/l*10,p[1]+dz/l*10]; }); for(let i=0;i<dh.length;i++){ const a=dh[i], b=dh[(i+1)%dh.length]; drape([[gx,gz],a,b],conc,.1,5.5,true); } }
    // drogi, parkingi, utwardzenia
    const dirtM=new THREE.MeshLambertMaterial({color:0x8a7a5a,map:detailTex,side:THREE.DoubleSide});
    F.items.forEach(it=>{ const t=it.t; if(t.highway){ const tr=t.highway==='track'||t.surface==='dirt'; const w=tr?3.6:t.highway==='service'?5.5:t.highway==='residential'?6:7; scene.add(new THREE.Mesh(ribbon(it.pts,w,.16,4,H),tr?dirtM:asphaltM)); }
      else if(t.amenity==='parking'){ drape(clean(it.pts),/TIR/.test(t.name||'')?gravelM:asphaltM,.15,4,true); }
      else if(t.surface==='concrete'&&!t.highway){ drape(clean(it.pts),conc,.14,5.5,true); }
      else if(t.power==='substation'){ const pts=clean(it.pts); drape(pts,gravelM,.12,4,true);
        const fm=new THREE.MeshLambertMaterial({color:0x6a7058}); for(let i=0;i<pts.length;i++){ const a=pts[i], b=pts[(i+1)%pts.length], len=Math.hypot(b[0]-a[0],b[1]-a[1]), n=Math.max(1,Math.round(len/10)), ang=Math.atan2(b[0]-a[0],b[1]-a[1]); for(let k=0;k<n;k++){ const tt=(k+.5)/n, x=a[0]+(b[0]-a[0])*tt, z=a[1]+(b[1]-a[1])*tt; const wm=new THREE.Mesh(new THREE.BoxGeometry(.06,2.2,len/n+.05),fm); wm.position.set(x,H(x,z)+1.1,z); wm.rotation.y=ang; scene.add(wm); addSolid({x,z,hw:.3,hd:len/n/2,c:Math.cos(-ang),s:Math.sin(-ang),r:len/n/2+.6}); } }
        const xs=pts.map(p=>p[0]), zs=pts.map(p=>p[1]); const bm=new THREE.MeshLambertMaterial({color:0x7d838a}); for(let i=0;i<6;i++){ const x=Math.min(...xs)+8+(i%3)*((Math.max(...xs)-Math.min(...xs)-16)/2), z=Math.min(...zs)+10+Math.floor(i/3)*((Math.max(...zs)-Math.min(...zs)-20)); if(!inPoly(x,z,pts)) continue; const bx=new THREE.Mesh(new THREE.BoxGeometry(4,5,3),bm); bx.position.set(x,H(x,z)+2.5,z); scene.add(bx); addSolid({x,z,hw:2.1,hd:1.6,c:1,s:0,r:3}); } } });
    // farmy fotowoltaiczne (power=plant): rzędy paneli
    { const pm=new THREE.MeshLambertMaterial({color:0x25406b}); F.items.filter(it=>it.t.power==='plant').forEach(it=>{ const pts=clean(it.pts); const xs=pts.map(p=>p[0]), zs=pts.map(p=>p[1]); const zA=Math.min(...zs)+3, zB=Math.max(...zs)-3, xA=Math.min(...xs), xB=Math.max(...xs); for(let z=zA;z<zB;z+=5){ let run=null; for(let x=xA;x<=xB+2;x+=2){ const ins=x<xB&&inPoly(x+1,z,pts)&&inPoly(x+1,z+2,pts); if(ins){ if(run===null) run=x; } else if(run!==null){ const len=x-run; if(len>4){ const m=new THREE.Mesh(new THREE.BoxGeometry(len,.08,2.4),pm); m.position.set(run+len/2,H(run+len/2,z)+1.1,z+1); m.rotation.x=-.45; scene.add(m); } run=null; } } } solidsFor(pts,Math.abs(area(pts))); }); }
    // parkingi z autami (OSM: amenity=parking)
    { const carG=mergeParts([[new THREE.BoxGeometry(1.7,.35,3.9).translate(0,.35,0),0x222222],[new THREE.BoxGeometry(1.8,.6,4.2).translate(0,.78,0),0xffffff],[new THREE.BoxGeometry(1.55,.55,2.1).translate(0,1.32,-.2),0xffffff],[new THREE.BoxGeometry(1.64,.36,2.2).translate(0,1.34,-.2),0x39505f]]);
      const cols=['#c8c9cc','#2a2d33','#8b1f26','#1f3b6e','#e5e5e0','#6b7076','#3c5b3a','#a8742c','#111111','#b9b9b3'];
      const pcs=[]; PKW.forEach(pp=>{ const pts=pp.slice(0,-1); if(!F.items.some(it=>it.t.amenity==='parking'&&it.pts.some(q=>Math.hypot(q[0]-pts[0][0],q[1]-pts[0][1])<3))) drape(clean(pts),asphaltM,.15,4,true);
        let bl=0,ang=0; pts.forEach((a,i)=>{ const b=pts[(i+1)%pts.length], l=Math.hypot(b[0]-a[0],b[1]-a[1]); if(l>bl){ bl=l; ang=Math.atan2(b[1]-a[1],b[0]-a[0]); } }); const ca=Math.cos(ang), sa=Math.sin(ang);
        const U=pts.map(q=>q[0]*ca+q[1]*sa), V=pts.map(q=>-q[0]*sa+q[1]*ca); const u0=Math.min(...U), u1=Math.max(...U), v0=Math.min(...V), v1=Math.max(...V); let row=0;
        for(let v=v0+3;v<v1-3;v+=5.4,row++){ if(row%3===2) continue; for(let u=u0+1.6;u<u1-1.6;u+=2.7){ const px=u*ca-v*sa, pz=u*sa+v*ca; if(![[0,0],[.9,2.4],[-.9,-2.4],[.9,-2.4],[-.9,2.4]].every(([du,dv])=>inPoly(px+(du*ca-dv*sa),pz+(du*sa+dv*ca),pts))) continue; if(rnd()<.32) continue; if(blocked(px,pz,1.4,true)) continue; pcs.push([px,pz,-ang,Math.random()]); } } });
      const im=new THREE.InstancedMesh(carG,new THREE.MeshLambertMaterial({vertexColors:true}),Math.max(1,pcs.length)); const dd=new THREE.Object3D(); pcs.forEach((q,i)=>{ const th=q[2]+(q[3]<.5?0:Math.PI); dd.position.set(q[0],H(q[0],q[1])+.12,q[1]); dd.rotation.set(0,th,0); dd.scale.set(1,1,1); dd.updateMatrix(); im.setMatrixAt(i,dd.matrix); im.setColorAt(i,col.set(cols[(i*7+Math.floor(q[3]*10))%cols.length])); addSolid({x:q[0],z:q[1],hw:.95,hd:2.2,c:Math.cos(-th),s:Math.sin(-th),r:2.6}); }); im.count=pcs.length; im.castShadow=true; scene.add(im); }
    // PROKSTAL: napis, rampy załadunkowe, plac z kontenerami i tirami
    { const pk=F.items.find(it=>/Prokstal/.test(it.name||'')); if(pk){ const pts=clean(pk.pts); if(pts.length>=3){ const c=[pts.reduce((a,q)=>a+q[0],0)/pts.length,pts.reduce((a,q)=>a+q[1],0)/pts.length]; let bi=0,bl=0; pts.forEach((a,i)=>{ const b=pts[(i+1)%pts.length], l=Math.hypot(b[0]-a[0],b[1]-a[1]); if(l>bl){ bl=l; bi=i; } });
        const a=pts[bi], b=pts[(bi+1)%pts.length], tx=(b[0]-a[0])/bl, tz=(b[1]-a[1])/bl; let nx=-tz, nz=tx; if((c[0]-a[0])*nx+(c[1]-a[1])*nz>0){ nx=-nx; nz=-nz; } const ry=Math.atan2(nx,nz), hh=10;
        const sgn=(txt,w2,h2,bg,fg,u,y,fs)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(w2,h2),new THREE.MeshBasicMaterial({map:tex(512,Math.round(512*h2/w2),(x,w,h)=>{ x.fillStyle=bg; x.fillRect(0,0,w,h); x.fillStyle=fg; x.font='800 '+fs+'px Barlow, Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,w/2,h/2+2); })})); const px=a[0]+tx*u+nx*.2, pz=a[1]+tz*u+nz*.2; m.position.set(px,H(px,pz)+y,pz); m.rotation.y=ry; scene.add(m); };
        sgn('PROKSTAL',Math.min(16,bl*.4),2.6,'#143a6e','#ffffff',bl*.5,hh-1.6,Math.round(130*Math.min(16,bl*.4)/16)); sgn('MAGAZYN · ZAŁADUNKI',8.5,1.15,'#f2c230','#1b1b1b',bl*.18,5.9,68);
        const dockM=new THREE.MeshLambertMaterial({color:0x4d555c}); for(let k=0;k<5;k++){ const u=bl*(.3+k*.1), px=a[0]+tx*u+nx*.12, pz=a[1]+tz*u+nz*.12; const dm=new THREE.Mesh(new THREE.BoxGeometry(3,3.2,.2),dockM); dm.position.set(px,H(px,pz)+1.6,pz); dm.rotation.y=ry; scene.add(dm); }
        drape([a,b,[b[0]+nx*20,b[1]+nz*20],[a[0]+nx*20,a[1]+nz*20]],conc,.13,5.5,true);
        const conM=[0x2f6fa8,0xb34a2c,0x4a7d3c,0x8a8d90].map(cl=>new THREE.MeshLambertMaterial({color:cl}));
        for(let k=0;k<6;k++){ const u=bl*.08+k*bl*.14, px=a[0]+tx*u+nx*17, pz=a[1]+tz*u+nz*17; const cb=new THREE.Mesh(new THREE.BoxGeometry(6,2.6,2.4),conM[k%4]); cb.position.set(px,H(px,pz)+1.3,pz); cb.rotation.y=Math.atan2(tx,tz)-Math.PI/2; cb.castShadow=true; scene.add(cb); addSolid({x:px,z:pz,hw:3,hd:1.2,c:Math.cos(-cb.rotation.y),s:Math.sin(-cb.rotation.y),r:3.4}); }
        ['tir_a','tir_b'].forEach((nm,k)=>{ const m=modelMesh(nm); if(!m) return; const u=bl*(.38+k*.22), px=a[0]+tx*u+nx*8, pz=a[1]+tz*u+nz*8; const g=new THREE.Group(); g.position.set(px,H(px,pz),pz); g.rotation.y=Math.atan2(nx,nz)+Math.PI/2; m.position.x=3; g.add(m); scene.add(g); addSolid({x:px,z:pz,hw:1.35,hd:10,c:Math.cos(-g.rotation.y),s:Math.sin(-g.rotation.y),r:11}); }); } } }
    // biurowiec (4 piętra, fioletowo-biały) — obrys OSM przy pętli drogi wewnętrznej
    const OF=[181,2857.5], oth=-0.549; const bo=modelMesh('cement_biuro'); if(bo){ const g=new THREE.Group(); g.position.set(OF[0],H(OF[0],OF[1]),OF[1]); g.rotation.y=oth; g.scale.set(.66,1,.95); g.add(bo); scene.add(g); }
    addSolid({x:OF[0],z:OF[1],hw:18.4,hd:6.2,c:Math.cos(-oth),s:Math.sin(-oth),r:20.5});
    // tiry na parkingu dla ciężarówek
    { const tp=F.items.find(it=>/TIR/.test(it.t.name||'')); if(tp){ const names=['tir_a','tir_b','tir_c']; let n=0; for(let x=-30;x<80&&n<9;x+=9) for(let z=2790;z<2900&&n<9;z+=22){ const ok=[[0,0],[0,11],[0,-11],[3,0],[-3,0]].every(([dx,dz])=>inPoly(x+dx,z+dz,tp.pts)); if(!ok) continue; const m=modelMesh(names[n%3]); if(!m) continue; const g=new THREE.Group(); g.position.set(x,H(x,z),z); g.rotation.y=Math.PI/2; m.position.x=3; g.add(m); scene.add(g); addSolid({x,z,hw:1.35,hd:10.5,c:1,s:0,r:11}); n++; } } }
    // pracownicy w białych kaskach i odblaskowych kamizelkach — chodzą po drogach wewnętrznych zakładu
    const helm=new THREE.MeshLambertMaterial({color:0xf6f6f1}); const walks=[]; const mkWalk=pts=>{ const len=[0]; for(let i=1;i<pts.length;i++) len.push(len[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1])); return {pts,len}; };
    F.items.filter(it=>it.t.highway&&(it.t.highway==='service'||it.t.highway==='residential'||it.t.highway==='unclassified')&&it.pts.length>=2).forEach(it=>{ const mid=it.pts[Math.floor(it.pts.length/2)]; const L=lenOf(it.pts); if(mid[0]>90&&mid[0]<1480&&mid[1]>2640&&mid[1]<3000&&L>60) walks.push(mkWalk(it.pts.map(q=>[q[0]+1.8,q[1]+1.8]))); });
    function lenOf(p){ let s=0; for(let i=1;i<p.length;i++) s+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]); return s; }
    walks.push(mkWalk([[150,2869],[176,2878],[196,2872],[215,2856],[200,2846]]));
    const hmDome=new THREE.SphereGeometry(.128,16,10,0,Math.PI*2,0,Math.PI/2), hmBrim=new THREE.CylinderGeometry(.14,.152,.022,18), hmPeak=new THREE.BoxGeometry(.2,.018,.09), hmRidge=new THREE.BoxGeometry(.03,.02,.27), hmRidgeM=new THREE.MeshLambertMaterial({color:0xd9d9d2});
    const addHelmet=p=>{ const hb=p.userData&&p.userData.head||p; const g2=new THREE.Group(); g2.position.set(0,hb===p?1.66:.17,0); const d=new THREE.Mesh(hmDome,helm); d.scale.set(1,.92,1.08); g2.add(d); const br=new THREE.Mesh(hmBrim,helm); g2.add(br); const pk=new THREE.Mesh(hmPeak,helm); pk.position.set(0,0,.14); pk.rotation.x=.18; g2.add(pk); const rg=new THREE.Mesh(hmRidge,hmRidgeM); rg.position.y=.118; g2.add(rg); hb.add(g2); };
    const vest=[0xf08a1c,0xf0c020,0x3a6fa8,0xe8e4dc];
    for(let i=0;i<26&&walks.length;i++){ const w=walks[i%walks.length]; const L=w.len[w.len.length-1]; const p=makePerson(pick(vest),pick([0x2c3e66,0x2a2a2c,0x3a4e7a]),pick([0x2a1d14,0x4a2e1a,0x6b4426,0x111111]),{female:false,style:'jacket',hairStyle:'short'});
      addHelmet(p);
      scene.add(p); const pd={g:p,w,d:R(0,L),dir:rnd()<.5?1:-1,v:R(.9,1.4),walk:R(0,6),down:0}; peds.push(pd); }
    // punkty: brama przy ul. Przemysłowej, biuro kadr, hala
    const gate=[78,2854], office=[OF[0]-.522*14,OF[1]+.852*14], hall=[1135,2858];
    { const wl=gate; POIS.push({n:'Cementownia Warta',x:wl[0],z:wl[1],p:wl,c:'#6a75b8',ic:'C',sp:labelSprite('Cementownia Warta','#6a75b8')}); const lp=POIS[POIS.length-1]; lp.sp.position.set(wl[0],H(wl[0],wl[1])+12,wl[1]); lp.sp.visible=false; scene.add(lp.sp); const b=document.createElement('button'); b.innerHTML=`<i style="background:${lp.c}"></i>`; b.append(lp.n); b.addEventListener('click',()=>{ goTo(lp); toggleMap(false); }); poiList.append(b); }
    // melexy (elektryczne wózki, nie wymagają tankowania) do jazdy po terenie zakładu
    const melexes=[]; [[168,2880,-2.4],[88,2866,.5],[640,2955,0],[1062,2862,0],[1330,2848,3.1],[860,2955,3.14]].forEach(([x,z,hd])=>{ const c=addParked(makeMelex(),x,z,hd,'melex','Melex (elektryczny)',8.5,4); if(c){ c.g.userData.drv.visible=false; melexes.push(c); } });
    const mini=[ {id:'palety',p:[1337,2897],title:'Paletyzacja worków - Cementownia Warta',label:'Paletyzacja worków'}, {id:'bhp',p:[96,2870],title:'Kontrola BHP - Cementownia Warta',label:'Kontrola BHP'}, {id:'cysterna',p:[880,2962],title:'Załadunek cystern - Cementownia Warta',label:'Załadunek cystern'}, {id:'laboratorium',p:[1097,2918],title:'Laboratorium - Cementownia Warta',label:'Pobieranie próbek'} , {id:'mlyn',p:[1112,2812],title:'Młyn cementu - Cementownia Warta',label:'Młyn cementu'}, {id:'sterownia',p:[1230,2872],title:'Sterownia pieca - Cementownia Warta',label:'Sterownia pieca'} ];
    const tick=()=>{ melexes.forEach(c=>{ c.g.userData.drv.visible=(st.car===c); }); };
    return {gate,office,hall,mini,tick,melexes}; })();
  const KOMIS=(()=>{ const F=MJF; if(!F) return null; const {L,th,mx,mz}=F; const hMean=F.h;
    const grp=new THREE.Group(); grp.position.set(F.Ox,hMean,F.Oz); grp.rotation.y=th; scene.add(grp);
    const sol=(lx,lz,hw,hd,r)=>{ const c=L(lx,lz); addSolid({x:c[0],z:c[1],hw,hd,c:Math.cos(-th),s:Math.sin(-th),r:r||Math.hypot(hw,hd)+.3}); };
    const pav=(poly,mat,uv)=>{ drape(poly,mat,.12,uv||2.2); };
    const redK=matPaverRed.clone(); redK.color=new THREE.Color(0x8e8883); pav(F.rect(-33,16,8,29),redK,1.2); pav(F.rect(-33,16,-12,8),lotPaver); pav(F.yard,lotPaver);
    const mj=modelMesh('myjnia'); if(mj){ mj.position.y=0; grp.add(mj); }
    sol(-4.5,0,4.5,6); sol(7.9,-.75,6.1,4.75); sol(5.3,4.85,3.1,.9); sol(1.5,1.6,.9,2.6); sol(-23.5,-3.5,4.6,.25); sol(-19,2.2,.25,2.9); sol(-22.8,-2.6,2,.55);
    // komis z przodu: 5 aut z cenami, kiosk-biuro, pylon
    const h=Math.atan2(mz,mx); [['fiat',-14],['polonez',-10.5],['astra',-7],['golf',-3.5],['bmw',0]].forEach(([k,lx])=>{ const c=CARS[k].c, q=L(lx,18); const car=makeCar(c,'car'); seatCar(car,q[0],q[1],h); scene.add(car); addSolid({x:q[0],z:q[1],hw:2.2,hd:1,c:Math.cos(h),s:Math.sin(h),r:2.5});
      const pr=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.5),new THREE.MeshBasicMaterial({map:signTex(String(CARS[k].p).replace(/\B(?=(\d{3})+$)/g,' ')+' zł','#ffd23a','#111111',256,128,'800 52px Barlow, Arial'),side:THREE.DoubleSide})); pr.position.set(q[0],H(q[0],q[1])+1.75,q[1]); pr.rotation.y=th; scene.add(pr); });
    const kq=L(9,14); const of=new THREE.Group(); of.position.set(kq[0],H(kq[0],kq[1]),kq[1]); of.rotation.y=th; scene.add(of); bx(of,4.2,2.6,2.4,0,0,0,new THREE.MeshLambertMaterial({color:0xf2f2ee})); bx(of,4.3,.12,2.5,0,2.6,0,new THREE.MeshLambertMaterial({color:0x2a2c30}));
    pl(of,.9,2.0,.8,1.0,1.21,new THREE.MeshLambertMaterial({color:0x5a3b28})); pl(of,1.2,.9,-1.0,1.5,1.21,new THREE.MeshLambertMaterial({color:0x9fc3d0})); sol(9,14,2.2,1.3,2.6);
    const pq=L(13,25); const py=new THREE.Group(); py.position.set(pq[0],H(pq[0],pq[1]),pq[1]); py.rotation.y=th; scene.add(py); bx(py,.25,4.5,.25,0,0,0,new THREE.MeshLambertMaterial({color:0x5c666c}));
    pl(py,3.2,1.1,0,4.6,.14,new THREE.MeshBasicMaterial({map:signTex('AUTO-KOMIS','#c4221e','#ffffff',512,160,'900 92px Barlow, Arial')})); pl(py,3.2,1.1,0,4.6,-.14,new THREE.MeshBasicMaterial({map:signTex('AUTO-KOMIS','#c4221e','#ffffff',512,160,'900 92px Barlow, Arial')}),Math.PI);
    // plac za myjnią: tiry z naczepami (modele z Blendera)
    // plac to wąski, ogrodzony pas prostopadły do drogi (jak na zdjęciu lotniczym); tiry stoją wzdłuż osi pasa
    const TR=[['tir_a',9,-34,1],['tir_b',9,-57,1],['tir_c',9,-80,1],['tir_b',9,-103,1],['tir_a',-6,-44,-1],['tir_c',-6,-68,-1],['tir_b',-22,-60,1]];
    TR.forEach(([k,lx,lz,dr])=>{ const m=modelMesh(k); if(!m) return; const q=L(lx,lz); const g=new THREE.Group(); g.position.set(q[0],H(q[0],q[1]),q[1]); g.rotation.y=th+(dr>0?Math.PI/2:-Math.PI/2); m.position.x=3*dr; g.add(m); scene.add(g); sol(lx,lz,1.35,10.5,11); });
    { const fm=new THREE.MeshLambertMaterial({color:0x5b6a58}), gm=new THREE.MeshLambertMaterial({color:0x7b8080});
      const fence=(a0,b0,a1,b1)=>{ const A=L(a0,b0), Bp=L(a1,b1), len=Math.hypot(Bp[0]-A[0],Bp[1]-A[1]), n=Math.max(1,Math.round(len/10)); const ang=Math.atan2(Bp[0]-A[0],Bp[1]-A[1]);
        for(let i=0;i<n;i++){ const t=(i+.5)/n, cx=A[0]+(Bp[0]-A[0])*t, cz=A[1]+(Bp[1]-A[1])*t; const w=new THREE.Mesh(new THREE.BoxGeometry(.08,1.9,len/n+.05),fm); w.position.set(cx,H(cx,cz)+.95,cz); w.rotation.y=ang; scene.add(w);
          addSolid({x:cx,z:cz,hw:.3,hd:len/n/2,c:Math.cos(-ang),s:Math.sin(-ang),r:len/n/2+.6}); } };
      fence(-34,-12,-34,-125); fence(16,-12,16,-125); fence(-34,-125,16,-125); fence(-34,-12,-34,-10); }
    // miejsce w myjni dla kupionego auta (wiata bezdotykowa) - wyjazd przodem w stronę ulicy
    const gb=L(-23.5,1.4); GARAGE={x:gb[0],z:gb[1],h:Math.atan2(mz,mx)};
    const wl=L(-23.5,6.5); POIS.push({n:'Myjnia',x:wl[0],z:wl[1],p:wl,c:'#c9242a',ic:'M',sp:labelSprite('Myjnia','#c9242a')}); { const lp=POIS[POIS.length-1]; lp.sp.position.set(wl[0],H(wl[0],wl[1])+9,wl[1]); lp.sp.visible=false; scene.add(lp.sp); const b=document.createElement('button'); b.innerHTML=`<i style="background:${lp.c}"></i>`; b.append(lp.n); b.addEventListener('click',()=>{ goTo(lp); toggleMap(false); }); poiList.append(b); }
    const door=L(9,14+1.2+1.4); const pd=npcFind(door[0],door[1],.6,200);
    const it=[]; Object.keys(CARS).forEach(k=>it.push([CARS[k].n,CARS[k].p,'car',k])); it.push(['Rower',300,'bike',1]); Object.keys(TUNE).forEach(k=>it.push(['Tuning: '+TUNE[k].n,TUNE[k].p,'tune',k])); 
    const shop={n:'Auto-Komis Trębaczew',sub:'samochody, rower, tuning i ubrania · kupione auto podstawimy w myjni za komisem',p:pd,items:it,komis:true};
    POIS.push({n:'Auto-Komis Trębaczew',x:pd[0],z:pd[1],p:pd,c:'#c4221e',ic:'K',sp:labelSprite('Auto-Komis','#c4221e')}); { const lp=POIS[POIS.length-1]; lp.sp.position.set(pd[0],H(pd[0],pd[1])+9,pd[1]); lp.sp.visible=false; scene.add(lp.sp); const b=document.createElement('button'); b.innerHTML=`<i style="background:${lp.c}"></i>`; b.append(lp.n); b.addEventListener('click',()=>{ goTo(lp); toggleMap(false); }); poiList.append(b); }
    return {shop,p:pd}; })();
  // zakupy w komisie i katalogu mebli: sprawdzenie przed zapłatą
  function shopGuard(it){ if(it[2]==='car'&&OWN.car===it[3]) return 'To auto już masz'; if(it[2]==='bike'&&OWN.bike) return 'Masz już rower';
    if(it[2]==='tune'){ if(!OWN.car) return 'Najpierw kup auto w komisie'; if(OWN.tune[it[3]]) return 'To już jest w twoim aucie'; }
    if(it[2]==='outfit'&&OWN.outfits.includes(it[3])){ applyOutfit(it[3]); return 'Ubranie założone (masz je już)'; } if(it[2]==='mebel'&&OWN.furn.includes(it[3])) return 'Ten mebel już stoi w domu'; return ''; }
  function shopBuyExtra(it){ const t=it[2];
    if(t==='car'){ OWN.car=it[3]; OWN.tune={}; ownSave(); spawnOwnCar(); WAYPOINT=GARAGE?[GARAGE.x,GARAGE.z]:null; toast(`Kupiono: <b>${it[0]}</b><br>Auto czeka w myjni za komisem (zaznaczone na mapie)`,4.5); }
    else if(t==='bike'){ OWN.bike=true; ownSave(); spawnOwnBike(); toast('Kupiono rower - stoi przy twoim parkingu',3); }
    else if(t==='tune'){ OWN.tune[it[3]]=true; ownSave(); if(OWN_CAR){ const C=CARS[OWN.car]; OWN_CAR.maxV=C.v*(OWN.tune.chip?1.15:1); OWN_CAR.acc=C.a*(OWN.tune.chip?1.25:1); if(OWN.tune.bak&&OWN_CAR.capMul!==1.5){ OWN_CAR.capMul=1.5; if(OWN_CAR.cap) OWN_CAR.cap=Math.round(OWN_CAR.cap*1.5); } } toast(`Zamontowano: <b>${TUNE[it[3]].n}</b>`,3); }
    else if(t==='outfit'){ OWN.outfits.push(it[3]); ownSave(); applyOutfit(it[3]); toast(`Kupiono i założono: <b>${OUTFITS[it[3]].n}</b>`,3); }
    else if(t==='mebel'){ OWN.furn.push(it[3]); ownSave(); if(HOME_ROOM.furnUpd) HOME_ROOM.furnUpd(); toast(`Kupiono: <b>${it[0]}</b> - już stoi w domu`,3); }
    else return false; saveGame(); return true; }
  // ekwipunek: wszystko, co kupiłeś (auto, rower, tuning, ubrania, meble, jedzenie i napoje)
  const invEl=document.getElementById('inv');
  function invAdd(it){ const k=it[0]; if(!OWN.inv) OWN.inv={}; const e=OWN.inv[k]||(OWN.inv[k]={n:0,t:it[2],v:it[3]}); e.n++; ownSave(); }
  function invUse(k){ const e=OWN.inv&&OWN.inv[k]; if(!e||e.n<1) return; if(e.t==='hp'){ if(st.hp>=100){ toast('Masz pełne zdrowie',1.8); return; } st.hp=Math.min(100,st.hp+e.v); toast(`Zjedzono: <b>${k}</b> (+${e.v} zdrowia)`,2.2); } else if(e.t==='boost'){ st.boost=e.v; toast(`Wypito: <b>${k}</b> - przypływ energii`,2.2); }
    e.n--; if(e.n<=0) delete OWN.inv[k]; ownSave(); saveGame(); renderInv(); }
  let INV_SEL=0;
  function invTiles(){ const T=[]; if(OWN.car){ const C=CARS[OWN.car]; T.push({ic:'🚗',n:C.n,sub:(OWN.tune.chip?'chip tuning':'')+(OWN.tune.chip&&OWN.tune.bak?' · ':'')+(OWN.tune.bak?'większy bak':'')||'Twój samochód',extra:carStatsHtml(OWN.car,OWN.tune),btns:KOMIS?[['park','Pokaż na mapie']]:[]}); }
    if(OWN.bike) T.push({ic:itemIcon('Rower','bike'),n:'Rower',sub:'szybszy niż spacer'});
    Object.keys(OWN.inv||{}).forEach(k=>{ const e=OWN.inv[k]; T.push({ic:itemIcon(k,e.t),n:k,q:e.n,sub:e.t==='hp'?`+${e.v} zdrowia`:'energia',btns:[['use',e.t==='hp'?'Zjedz':'Wypij',k]]}); });
    if(st.canister) T.push({ic:'⛽',n:'Kanister paliwa',sub:st.canister+' l'}); if(st.books) T.push({ic:'📚',n:'Książki z biblioteki',q:st.books,sub:'z biblioteki'});
    OWN.outfits.forEach(k=>OUTFITS[k]&&T.push({ic:'👕',n:OUTFITS[k].n,sub:'ubranie',btns:[['outfit','Załóż',k]]}));
    if(DONE.has('m20')) OWN.furn.forEach(k=>T.push({ic:'🛋️',n:FURN[k][0],sub:'w domu'}));
    return T; }
  function renderInv(){ const T=invTiles(); if(INV_SEL>=T.length) INV_SEL=0; const slots=Math.max(24,Math.ceil(T.length/6)*6); const esc=v=>String(v).replace(/"/g,'&quot;');
    let h=`<h2>EKWIPUNEK</h2><p class="sub">klawisz <kbd>I</kbd> zamyka okno</p><div class="ivWrap"><div class="ivGrid">`;
    for(let i=0;i<slots;i++){ const t=T[i]; h+=t?`<button class="ivSlot${i===INV_SEL?' sel':''}" data-i="${i}" title="${esc(t.n)}"><span class="ic">${t.ic}</span>${t.q>1?`<b class="qty">${t.q}</b>`:''}</button>`:'<div class="ivSlot empty"></div>'; }
    h+='</div><div class="ivDet">'; const t=T[INV_SEL];
    if(t){ h+=`<div class="big">${t.ic}</div><h3>${t.n}${t.q>1?' ×'+t.q:''}</h3><p>${t.sub||''}</p>${t.extra||''}${(t.btns||[]).map(b=>`<button data-act="${b[0]}"${b[2]!==undefined?` data-k="${esc(b[2])}"`:''}>${b[1]}</button>`).join('')}`; } else h+='<h3>Pusto</h3><p>Kup jedzenie w Lewiatanie, Żabce, Eufori lub aptece, a auto w Auto-Komisie przy DK42.</p>';
    h+='</div></div>'+(DONE.has('m20')?'':'<p class="sub">Dom: jeszcze nie kupiony</p>')+'<button class="ivClose" data-act="close">Zamknij</button>'; invEl.innerHTML=h;
    invEl.querySelectorAll('.ivSlot[data-i]').forEach(b=>b.addEventListener('click',()=>{ INV_SEL=+b.dataset.i; renderInv(); }));
    invEl.querySelectorAll('button[data-act]').forEach(b=>b.addEventListener('click',()=>{ const a=b.dataset.act; if(a==='close') toggleInv(false); else if(a==='use'){ invUse(b.dataset.k); renderInv(); } else if(a==='outfit'){ applyOutfit(b.dataset.k); toast('Ubranie założone',1.8); } else if(a==='park'&&GARAGE){ WAYPOINT=[GARAGE.x,GARAGE.z]; toggleInv(false); toast('Twoje auto zaznaczone na radarze',2.4); } })); }
  function toggleInv(v){ const on=v===undefined?invEl.hidden:v; if(on&&(SHOP_OPEN||(typeof logEl!=='undefined'&&!logEl.hidden))) return; invEl.hidden=!on; if(on){ keys.clear(); renderInv(); } else canvas.focus(); }
  ['bInv','bInvM'].forEach(id=>{ const b=document.getElementById(id); if(b) b.addEventListener('click',e=>{ e.stopPropagation(); toggleInv(); }); });
  addEventListener('keydown',e=>{ if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'))return; if(!invEl.hidden&&e.key==='Escape'){ toggleInv(false); e.preventDefault(); e.stopPropagation(); } else if((e.key==='i'||e.key==='I')&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&document.getElementById('menu').hidden){ toggleInv(); e.preventDefault(); } },true);
  function nearKomis(){ return KOMIS&&!st.inside&&!st.car&&Math.hypot(st.x-KOMIS.p[0],st.z-KOMIS.p[1])<3; }
  // dom gracza: wnętrze do urządzania po kupnie domu (misja „Własny kąt”)
  const FURN={kanapa:['Kanapa narożna',2500],tv:['Telewizor 55"',3000],stol:['Stół z krzesłami',1500],lozko:['Łóżko z pościelą',2000],regal:['Regał z książkami',800],konsola:['Konsola do gier',1800],obraz:['Obraz z Trębaczewem',300],roslina:['Duża roślina',150],dywan:['Dywan',600],pies:['Pies ze schroniska z legowiskiem',500]};
  const HOME_ROOM=defRoom({kind:'home',W:14,D:11,HT:2.8,col:0x8a6a3a,wall:0xe8dcc6,floor:'#a07a50',ceil:0xf2efe6,wallE:0x262018,floorE:0x140c06,ceilE:0x3a3832,noBand:true,doorX:-4});
  HOME_ROOM.title='Twój dom'; HOME_ROOM.items=Object.keys(FURN).map(k=>[FURN[k][0],FURN[k][1],'mebel',k]); HOME_ROOM.shopName='Katalog mebli (laptop)'; HOME_ROOM.sub='meble pojawiają się od razu w domu';
  if(FOR_SALE){ const h=FOR_SALE.h, p=FOR_SALE.p; let n=[p[0]-h.x,p[1]-h.z]; addEnt(HOME_ROOM,'twojego domu',[p[0]-n[0]/Math.hypot(n[0],n[1])*1.2,p[1]-n[1]/Math.hypot(n[0],n[1])*1.2],n); }
  function homeInterior(o){ const g=roomShell(o), W=o.W, D=o.D; const M=c=>new THREE.MeshLambertMaterial({color:c}); const F={};
    const add=(k,fn)=>{ const q=new THREE.Group(); fn(q); g.add(q); F[k]=q; };
    add('kanapa',q=>{ bx(q,3.2,.45,1,-3,0,-3.9,M(0x4a5a7a)); bx(q,3.2,.5,.25,-3,.45,-4.3,M(0x4a5a7a)); bx(q,1,.45,2.2,-4.1,0,-2.8,M(0x4a5a7a)); });
    add('tv',q=>{ bx(q,1.8,.5,.4,-3,0,1.2,M(0x5a3b28)); bx(q,1.5,.85,.06,-3,.75,1.2,M(0x111111)); const s=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.78),new THREE.MeshBasicMaterial({color:0x4a8ad8})); s.position.set(-3,1.17,1.16); s.rotation.y=Math.PI; q.add(s); });
    add('stol',q=>{ bx(q,1.6,.06,1,2.5,.74,-2,M(0x8a5a34)); [[-.7,-.4],[.7,-.4],[-.7,.4],[.7,.4]].forEach(([a,b])=>bx(q,.06,.74,.06,2.5+a,0,-2+b,M(0x6a4428))); [[-.5,-.8],[.5,-.8],[-.5,.8],[.5,.8]].forEach(([a,b])=>{ bx(q,.42,.45,.42,2.5+a,0,-2+b,M(0x8a5a34)); }); });
    add('lozko',q=>{ bx(q,1.8,.45,2.2,5.4,0,2.9,M(0x6a4428)); bx(q,1.7,.15,2.0,5.4,.45,3.0,M(0xf2f2ee)); bx(q,1.6,.12,1.2,5.4,.6,3.4,M(0x2f6fd0)); bx(q,1.8,.8,.12,5.4,0,1.85,M(0x6a4428)); });
    add('regal',q=>{ bx(q,1.6,2.0,.4,W/2-.3,0,-1.5,M(0x8a5a34)); const b=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.8),new THREE.MeshLambertMaterial({map:shelfTex('dry')})); b.position.set(W/2-.51,1.0,-1.5); b.rotation.y=-Math.PI/2; q.add(b); q.children[0].scale.set(.25,1,4); });
    add('konsola',q=>{ bx(q,.35,.08,.25,-2.4,.5,1.15,M(0x1a1a1a)); bx(q,.15,.03,.1,-2.0,.52,.9,M(0x2a2a2a)); });
    add('obraz',q=>{ pl(q,1.4,.9,0,1.7,-D/2+.03,new THREE.MeshBasicMaterial({map:tex(128,80,(x,w,h)=>{ x.fillStyle='#a9cbe6'; x.fillRect(0,0,w,h*.55); x.fillStyle='#6fa046'; x.fillRect(0,h*.55,w,h); x.fillStyle='#e8e2d4'; x.fillRect(60,26,22,22); x.fillStyle='#8a2a20'; x.beginPath(); x.moveTo(56,28); x.lineTo(71,14); x.lineTo(86,28); x.fill(); x.fillStyle='#d8d4c8'; x.fillRect(28,18,8,32); x.fillStyle='#5a3b28'; x.strokeStyle='#5a3b28'; x.lineWidth=6; x.strokeRect(0,0,w,h); })})); });
    add('roslina',q=>{ const p=new THREE.Mesh(new THREE.CylinderGeometry(.25,.2,.45,10),M(0xb06a3a)); p.position.set(W/2-.6,.22,-D/2+.6); q.add(p); const l=new THREE.Mesh(new THREE.SphereGeometry(.45,8,6),M(0x3f7a3a)); l.scale.y=1.4; l.position.set(W/2-.6,.95,-D/2+.6); q.add(l); });
    add('dywan',q=>{ const r=new THREE.Mesh(new THREE.PlaneGeometry(3,2.2).rotateX(-Math.PI/2),M(0x8a2a3a)); r.position.set(-3,.01,-1.5); q.add(r); });
    add('pies',q=>{ const bed=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,.12,16),M(0x6a4a2a)); bed.position.set(1.0,.06,2.6); q.add(bed); const d=dogModel(0x2a2420); d.position.set(1.0,.08,2.6); d.rotation.y=-.8; q.add(d); PARK_ANIM.push({k:'dog',g:d,t:0}); });
    // biurko z laptopem (katalog mebli)
    bx(g,1.2,.75,.6,-W/2+1.2,0,D/2-2.2,M(0x8a5a34)); bx(g,.38,.02,.26,-W/2+1.2,.76,D/2-2.2,M(0x2a2a2a)); const scr=new THREE.Mesh(new THREE.PlaneGeometry(.36,.22),new THREE.MeshBasicMaterial({color:0x6aa8e8})); scr.position.set(-W/2+1.2,.9,D/2-2.33); scr.rotation.x=-.2; g.add(scr); box2(o,-W/2+.55,D/2-2.55,-W/2+1.85,D/2-1.85); o.counter=[-W/2+1.2,D/2-1.5];
    o.furn=F; o.furnUpd=()=>{ Object.keys(F).forEach(k=>F[k].visible=OWN.furn.includes(k)); o.box.length=0; box2(o,-W/2+.55,D/2-2.55,-W/2+1.85,D/2-1.85); if(OWN.furn.includes('kanapa')){ box2(o,-4.6,-4.45,-1.4,-3.35); box2(o,-4.6,-3.9,-3.6,-1.7); } if(OWN.furn.includes('tv')) box2(o,-3.9,1.0,-2.1,1.4); if(OWN.furn.includes('stol')) box2(o,1.6,-2.9,3.4,-1.1); if(OWN.furn.includes('lozko')) box2(o,4.5,1.8,6.3,4.0); if(OWN.furn.includes('regal')) box2(o,W/2-.5,-2.3,W/2,-.7); };
    o.furnUpd(); }
  // zlecenia dnia: trzy misje poboczne z różnych kategorii, za komplet premia
  const DAILY_CAT={dostawa:['s1','s3','s6','s12','s14'],jazda:['s4','s5','s11','s13'],pomoc:['s7','s8','s9','s10','s15']};
  function dayKey(){ const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
  function dailyGet(){ const k=dayKey(); if(!OWN.daily||OWN.daily.day!==k){ let h=0; for(const ch of k) h=(h*31+ch.charCodeAt(0))>>>0; const ids=Object.values(DAILY_CAT).map(list=>{ const ok=list.filter(id=>{ const m=SIDE.find(q=>q.id===id); return m&&(!m.req||m.req()); }); const L=ok.length?ok:list.filter(id=>SIDE.find(q=>q.id===id)&&!SIDE.find(q=>q.id===id).req); h=(h*1103515245+12345)>>>0; return L[h%L.length]; }).filter(Boolean); OWN.daily={day:k,ids,done:[],paid:false}; ownSave(); } return OWN.daily; }
  const dailyPrize=()=>2000+400*st.level;
  function dailyOn(id){ const D=dailyGet(); if(!D.ids.includes(id)||D.done.includes(id)) return; D.done.push(id); toast(`Zlecenie dnia wykonane (${D.done.length}/3)`,3); if(D.done.length>=D.ids.length&&!D.paid){ D.paid=true; const yd=new Date(Date.now()-864e5), yk=yd.getFullYear()+'-'+(yd.getMonth()+1)+'-'+yd.getDate(); OWN.streak=OWN.lastPaid===yk?(OWN.streak||0)+1:1; OWN.lastPaid=dayKey(); const sb=Math.min(OWN.streak,7)*500, pz=dailyPrize()+sb; setTimeout(()=>{ toast(`<b>KOMPLET ZLECEŃ DNIA!</b><br>Premia +${fmt(pz)}${OWN.streak>1?` · seria ${OWN.streak} dni (+${fmt(sb)})`:''}`,5); addMoney(pz); saveGame(); },2500); OWN.dailyDone=(OWN.dailyDone||0)+1; } ownSave(); }
  // osiągnięcia
  const ACH=[
    {id:'start',n:'Pierwsze kroki',d:'Ukończ pierwszą misję',r:100,t:()=>DONE.has('m1')},
    {id:'npc5',n:'Sąsiedzka pomoc',d:'Pomóż 5 postaciom',r:300,t:()=>NPC.filter(n=>npcStage(n.id)==='koniec').length>=5},
    {id:'npcall',n:'Złota rączka',d:'Pomóż wszystkim postaciom',r:1500,t:()=>NPC.every(n=>npcStage(n.id)==='koniec')},
    {id:'turbo',n:'Kolekcjoner Turbo',d:'Zbierz wszystkie historyjki z gum Turbo',r:0,t:()=>TURBO_HAVE.size>=TURBO_CARS.length},
    {id:'clean',n:'Wzorowy obywatel',d:'Graj 60 minut bez mandatu',r:500,t:()=>OWN.clean>=3600},
    {id:'odo',n:'Kierowca',d:'Przejedź 25 km',r:500,t:()=>OWN.odo>=25000},
    {id:'car',n:'Własne cztery kółka',d:'Kup auto w komisie',r:300,t:()=>!!OWN.car},
    {id:'azor',n:'Przyjaciel zwierząt',d:'Znajdź dom dla Azora',r:300,t:()=>NQ.azor==='dom'},
    {id:'daily',n:'Pracuś',d:'Wykonaj komplet zleceń dnia',r:500,t:()=>(OWN.dailyDone||0)>=1},
    {id:'rich',n:'Na bogato',d:'Miej 100 000 zł naraz',r:1000,t:()=>st.money>=100000},
    {id:'side',n:'Wszystko po trochu',d:'Ukończ każdą misję poboczną',r:1000,t:()=>SIDE.every(m=>SIDE_T[m.id])},
    {id:'house',n:'Na swoim',d:'Kup dom',r:0,t:()=>DONE.has('m20')},
    {id:'furn',n:'Urządzony',d:'Kup 5 mebli do domu',r:500,t:()=>OWN.furn.length>=5}];
  let achT=0, cleanSave=0;
  function achTick(dt){ if(!GAME.started) return; OWN.clean+=dt; cleanSave+=dt; if(st.car&&Math.abs(st.car.v)>.5) OWN.odo+=Math.abs(st.car.v)*dt; achT+=dt; if(achT<2) return; achT=0;
    ACH.forEach(a=>{ if(OWN.ach.includes(a.id)) return; let ok=false; try{ ok=a.t(); }catch(e){} if(ok){ OWN.ach.push(a.id); ownSave(); toast(`🏆 <b>Osiągnięcie: ${a.n}</b><br>${a.d}${a.r?` · +${fmt(a.r)}`:''}`,4.5); if(a.r) addMoney(a.r); if(AU.ctx&&AU.on) sfx.win(); saveGame(); } });
    if(cleanSave>30){ cleanSave=0; ownSave(); } rankTick(); }
  // ranking: najwięcej pieniędzy i najszybszy „Wyścig dookoła wsi” (nazwa z trybu wieloosobowego)
  function rankNick(){ let n=''; try{ n=(typeof myNick!=='undefined'&&myNick)||localStorage.getItem('trebaczew-nick')||''; }catch(e){} return cleanTxt(n,18); }
  function rankTick(force,race){ const n=rankNick(); if(!n) return; const now=Date.now(); if(!force&&now-OWN.rank<120000) return; OWN.rank=now; ownSave(); try{ let o=''; try{ o=localStorage.getItem('trebaczew-nick-prev')||''; }catch(e){} statEvent('rank',{n,o:o!==n?o:'',money:st.money,race:race||0,lvl:st.level,xp:st.xp}); }catch(e){} }
  let RANK_CACHE=null;
  function rankLoad(cb){ if(!/^https?:$/.test(location.protocol)){ cb(null); return; } fetch(STAT_URL+'/ranking').then(r=>r.json()).then(j=>{ RANK_CACHE={t:Date.now(),kasa:[],wyscig:[],poziom:Array.isArray(j)?j.slice(0,5):[]}; cb(RANK_CACHE); }).catch(()=>cb(null)); }
  // haki misji: zlecenia dnia, ranking wyścigu, dom
  function missionHook(A,ok){ if(!A||!ok) return; const m=A.m; if(!m.main) dailyOn(m.id); if(m.id==='s4') rankTick(true,tAll-A.t0); if(m.id==='m20') setTimeout(()=>toast('Dom jest twój! Wejdź do środka i urządź go - katalog mebli jest na laptopie przy wejściu.',6),5000); }

  let sideRef=0; function sideRefresh(dt){ sideRef-=dt; if(sideRef<0){ sideRef=5; if(!ACTIVE) MISSIONS.forEach(m=>{ if(!m.main&&!m.mk.visible&&avail(m)){ try{ m.sp=walkSpot(m.start(),false); }catch(e){} m.mk.position.set(m.sp[0],H(m.sp[0],m.sp[1]),m.sp[1]); m.mk.visible=true; } }); } }

  /* ---------- ukrywanie drobnych obiektów w oddali (bramy, auta na podwórkach, zwierzęta, przechodnie) ---------- */
  const CULL=[]; let cullI=0;
  GATES.forEach(it=>{ if(it.g&&!it.g.userData.cull){ it.g.userData.cull=1; CULL.push({o:it.g,x:it.cx,z:it.cz,r:IS_TOUCH?110:170}); } });
  parked.forEach(c=>{ CULL.push({o:c.g,car:c,r:IS_TOUCH?170:260}); });
  peds.forEach(p=>CULL.push({o:p.g,ped:p,r:IS_TOUCH?120:200}));
  /* trawa 3D przy kamerze: kępki tylko tam, gdzie grunt jest zielony i nie ma drogi, chodnika, placu ani budynku */
  const GRASS=(()=>{ if(IS_TOUCH) return null; const CELL=5, RAD=28, PER=70, CAP=12000; const bt=tex(128,64,(x,w,h)=>{ x.clearRect(0,0,w,h); for(let i=0;i<70;i++){ const px=4+Math.random()*(w-8), l=h*(.45+Math.random()*.55), lean=(Math.random()-.5)*16, v=150+Math.random()*90; x.strokeStyle=`rgba(${v*.93|0},${v|0},${v*.8|0},1)`; x.lineWidth=1.2+Math.random()*1.4; x.beginPath(); x.moveTo(px,h); x.quadraticCurveTo(px+lean*.3,h-l*.6,px+lean,h-l); x.stroke(); } }); bt.__nonm=1;
    const q=new THREE.PlaneGeometry(.6,.3).translate(0,.15,0); const parts=[0,1,2].map(i=>q.clone().rotateY(i*Math.PI/3)); const geo=THREE.BufferGeometryUtils?THREE.BufferGeometryUtils.mergeBufferGeometries(parts):(()=>{ const g=new THREE.BufferGeometry(); const P=[],U=[],I=[]; parts.forEach((pg,k)=>{ const pa=pg.attributes.position.array, ua=pg.attributes.uv.array; for(let i=0;i<pa.length;i++)P.push(pa[i]); for(let i=0;i<ua.length;i++)U.push(ua[i]); Array.from(pg.index.array).forEach(v=>I.push(v+k*4)); }); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2)); g.setIndex(I); return g; })();
    { const n=geo.attributes.position.count, N=new Float32Array(n*3); for(let i=0;i<n;i++) N[i*3+1]=1; geo.setAttribute('normal',new THREE.BufferAttribute(N,3)); }
    const mat=new THREE.MeshLambertMaterial({map:bt,alphaTest:.45,side:THREE.DoubleSide}); if(mat.roughness!==undefined){ mat.roughness=1; mat.envMapIntensity=.25; } const U={gT:{value:0},gC:{value:new THREE.Vector3()}};
    mat.onBeforeCompile=sh=>{ sh.uniforms.gT=U.gT; sh.uniforms.gC=U.gC; sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float gT;uniform vec3 gC;').replace('#include <begin_vertex>',`#include <begin_vertex>
 { vec3 ip=instanceMatrix[3].xyz; float fd=1.-smoothstep(${(RAD*.62).toFixed(1)},${(RAD*.97).toFixed(1)},distance(ip.xz,gC.xz)); transformed.y*=fd; float wv=sin(gT*1.9+ip.x*.55+ip.z*.4)+.5*sin(gT*3.3+ip.z*.9); transformed.x+=wv*.04*uv.y; transformed.z+=wv*.025*uv.y; }`); sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n normal=normalize(vNormal);').replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb*=.72+.5*vUv.y;'); };
    const im=new THREE.InstancedMesh(geo,mat,CAP); im.instanceColor=new THREE.BufferAttribute(new Float32Array(CAP*3).fill(1),3); im.count=0; im.frustumCulled=false; im.castShadow=false; im.receiveShadow=true; scene.add(im);
    let gd=null,gw=0,gh=0; const green=(x,z)=>{ if(!gd){ try{ gw=1024; gh=Math.max(1,Math.round(gc.height/gc.width*gw)); const c=document.createElement('canvas'); c.width=gw; c.height=gh; const cx=c.getContext('2d'); cx.drawImage(gc,0,0,gw,gh); gd=cx.getImageData(0,0,gw,gh).data; }catch(e){ gd=new Uint8ClampedArray(4); gw=gh=1; } }
      const u=Math.floor(clamp((x-X0)/GW,0,.9999)*gw), v=Math.floor(clamp((z-Z0)/GH,0,.9999)*gh), i=(v*gw+u)*4; const r=gd[i], g=gd[i+1], b=gd[i+2]; return (g-Math.max(r*.95,b)>4)?[r,g,b]:null; };
    const hs=(a,b,k)=>{ const v=Math.sin(a*127.1+b*311.7+k*74.7)*43758.5453; return v-Math.floor(v); };
    const cells=new Map(); const make=(ci,cj)=>{ const out=[]; for(let k=0;k<PER;k++){ const x=(ci+hs(ci,cj,k))*CELL, z=(cj+hs(ci,cj,k+97))*CELL; const col=green(x,z); if(!col) continue; if(roadNearF(x,z,3.5)||blocked(x,z,.35)||LOTS.some(l=>inPoly(x,z,l))) continue; const nr=nearestRoad(x,z); if(nr&&nr.r&&nr.d<(nr.r.w||3)/2+1.2) continue; out.push([x,H(x,z),z,.75+hs(ci,cj,k+31)*.7,hs(ci,cj,k+53)*3.14,col]); } return out; };
    let lx=1e9,lz=1e9,pending=false; const dm=new THREE.Object3D(), cc=new THREE.Color();
    return {im,update(fx,fz,dt){ U.gT.value=tAll; U.gC.value.set(fx,0,fz); const on=!st.inside&&ENV.season!==3&&ENV.quality>0; im.visible=on; if(!on) return; if(Math.hypot(fx-lx,fz-lz)<2.2&&!pending) return; lx=fx; lz=fz; pending=false; const c0=Math.floor((fx-RAD)/CELL), c1=Math.floor((fx+RAD)/CELL), d0=Math.floor((fz-RAD)/CELL), d1=Math.floor((fz+RAD)/CELL); let made=0, n=0;
        for(let i=c0;i<=c1;i++)for(let j=d0;j<=d1;j++){ if(Math.hypot((i+.5)*CELL-fx,(j+.5)*CELL-fz)>RAD+CELL) continue; const key=i+','+j; let arr=cells.get(key); if(!arr){ if(made>=36){ pending=true; continue; } arr=make(i,j); cells.set(key,arr); made++; }
          for(const t of arr){ if(n>=CAP) break; dm.position.set(t[0],t[1]-.02,t[2]); dm.rotation.set(0,t[4],0); dm.scale.set(t[3],t[3]*(.8+.5*((t[4]*7)%1)),t[3]); dm.updateMatrix(); im.setMatrixAt(n,dm.matrix); const c=t[5]; cc.setRGB(Math.min(1,c[0]/255*1.3+.03),Math.min(1,c[1]/255*1.38+.06),Math.min(1,c[2]/255*1.15)); im.setColorAt(n,cc); n++; } }
        im.count=n; im.instanceMatrix.needsUpdate=true; if(im.instanceColor) im.instanceColor.needsUpdate=true; if(cells.size>1500){ for(const k of cells.keys()){ const [a,b]=k.split(',').map(Number); if(Math.hypot((a+.5)*CELL-fx,(b+.5)*CELL-fz)>RAD*2.2) cells.delete(k); } } }}; })();
  function cullUpdate(){ if(!CULL.length)return; let fx=st.inside&&CUR.ret?CUR.ret.x:(st.car?st.car.x:st.x), fz=st.inside&&CUR.ret?CUR.ret.z:(st.car?st.car.z:st.z); if(GAME.paused&&!GAME.started&&MENU.c){ fx=MENU.c[0]; fz=MENU.c[1]; } const far=st.mode===2?1.8:1, n=Math.min(CULL.length,IS_TOUCH?220:360);
    for(let k=0;k<n;k++){ cullI=(cullI+1)%CULL.length; const c=CULL[cullI]; let x=c.x,z=c.z; if(c.car){ x=c.car.x; z=c.car.z; if(c.car===st.car){ c.o.visible=true; continue; } } else if(c.ped){ x=c.o.position.x; z=c.o.position.z; }
      const r=c.r*far; c.o.visible=!st.inside&&((x-fx)*(x-fx)+(z-fz)*(z-fz)<r*r); } chunkUpdate(fx,fz); }
  function grassTick(){ if(GRASS&&GAME.started){ const fx=st.car?st.car.x:st.x, fz=st.car?st.car.z:st.z; GRASS.update(fx,fz); } }
  // duże InstancedMesh (drzewa, lasy, płoty, słupki…) dzielone na kwadraty 120 m, żeby kamera i cienie pomijały to, czego nie widać
  const CHUNKS=[], CHUNK_SRC=new Map();
  function chunkIM(im,cell){ const n=im.count, m=new THREE.Matrix4(), p=new THREE.Vector3(), q=new THREE.Quaternion(), sc=new THREE.Vector3(); const buckets=new Map();
    for(let i=0;i<n;i++){ im.getMatrixAt(i,m); p.setFromMatrixPosition(m); const k=Math.floor(p.x/cell)+','+Math.floor(p.z/cell); let b=buckets.get(k); if(!b) buckets.set(k,b=[]); b.push(i); }
    if(buckets.size<2) return false; if(!im.geometry.boundingSphere) im.geometry.computeBoundingSphere(); const gs=im.geometry.boundingSphere, gr=gs.radius+gs.center.length(); const parts=[];
    buckets.forEach(list=>{ const geo=im.geometry.clone(); const c=new THREE.InstancedMesh(geo,im.material,list.length); const bb=new THREE.Box3(); let ms=0;
      list.forEach((i,j)=>{ im.getMatrixAt(i,m); c.setMatrixAt(j,m); m.decompose(p,q,sc); bb.expandByPoint(p); ms=Math.max(ms,Math.abs(sc.x),Math.abs(sc.y),Math.abs(sc.z)); if(im.instanceColor){ const a=im.instanceColor.array; c.setColorAt(j,col.setRGB(a[i*3],a[i*3+1],a[i*3+2])); } });
      const sph=new THREE.Sphere(); bb.getBoundingSphere(sph); sph.radius+=gr*ms; geo.boundingSphere=sph; c.castShadow=im.castShadow; c.receiveShadow=im.receiveShadow; c.renderOrder=im.renderOrder; c.instanceMatrix.needsUpdate=true; if(c.instanceColor) c.instanceColor.needsUpdate=true;
      scene.add(c); c.userData.idx=list; parts.push(c); CHUNKS.push({o:c,x:sph.center.x,z:sph.center.z,r:sph.radius}); });
    CHUNK_SRC.set(im,parts); im.parent&&im.parent.remove(im); return true; }
  { const skip=new Set([winIM,...polyWinIMs]); const list=[]; scene.children.forEach(o=>{ if(!o.isInstancedMesh||skip.has(o)||!o.visible)return; const g=o.geometry, t=(g.index?g.index.count:g.attributes.position.count)/3*o.count; if(t>=50000) list.push(o); }); list.forEach(o=>chunkIM(o,260)); }
  function syncChunks(){ CHUNK_SRC.forEach((parts,src)=>{ if(!src.instanceColor)return; const a=src.instanceColor.array; parts.forEach(c=>{ c.userData.idx.forEach((i,j)=>c.setColorAt(j,col.setRGB(a[i*3],a[i*3+1],a[i*3+2]))); c.instanceColor.needsUpdate=true; }); }); }
  { const _as=applySeason; applySeason=function(){ _as(); syncChunks(); }; }
  let chunkT=0; function chunkUpdate(fx,fz){ if(tAll-chunkT<.25&&!GAME.paused) return; chunkT=tAll; const R=(IS_TOUCH?480:880)*(st.mode===2?1.6:1); CHUNKS.forEach(c=>{ const d=Math.hypot(c.x-fx,c.z-fz)-c.r; c.o.visible=!st.inside&&d<R; }); }

  let fpsAcc=0,fpsN=0,pr=DPR,lowN=0; const T_START=performance.now();
  /* ---------- menu główne, pauza (Esc), opcje z przypisywaniem klawiszy, kreator postaci, zgłaszanie błędów ---------- */
  const menuEl=$('menu'), MENU={t:0,view:'',c:null,ca:0};
  { const cc=centroid(CHURCH.pts); MENU.c=[cc[0]+40,cc[1]+30]; MENU.a0=0; MENU.r=110;
    try{ const P=[[B_LEW.x,B_LEW.z],[B_ZAB.x,B_ZAB.z],[SCHOOL_P[0],SCHOOL_P[1]],cc]; const c=[P.reduce((t,q)=>t+q[0],0)/4,P.reduce((t,q)=>t+q[1],0)/4]; const nr=nearestRoad(c[0],c[1],r=>r.n==='Wyzwolenia'); if(nr.r){ const q=nr.r.pts[nr.seg], q2=nr.r.pts[nr.seg+1]; const dx=q2[0]-q[0], dz=q2[1]-q[1], L=dx*dx+dz*dz||1, t=clamp(((c[0]-q[0])*dx+(c[1]-q[1])*dz)/L,0,1); const rx=q[0]+dx*t, rz=q[1]+dz*t; MENU.a0=Math.atan2(rx-c[0],rz-c[1])+Math.PI; MENU.c=c; MENU.r=Math.max(80,Math.max(...P.map(v=>Math.hypot(v[0]-c[0],v[1]-c[1])))*1.1); } }catch(e){} }
  const ACTIONS=[['w','Do przodu / gaz'],['s','Do tyłu / hamulec'],['a','W lewo'],['d','W prawo'],['shift','Sprint'],[' ','Skok / ręczny'],['f','Wsiądź / wysiądź'],['e','Akcja (misja, sklep, brama)'],['q','Dziennik misji'],['m','Mapa'],['c','Kamera'],['r','Radio w aucie']];
  const keyName=c=>({Space:'Spacja',ShiftLeft:'L Shift',ShiftRight:'P Shift',ControlLeft:'L Ctrl',ControlRight:'P Ctrl',AltLeft:'L Alt',Tab:'Tab',Enter:'Enter',Backspace:'Backspace',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',CapsLock:'Caps Lock'})[c]||c.replace(/^Key|^Digit|^Numpad/,'');
  let WAITKEY=null;
  function renderKeys(){ const kl=$('keyList'); kl.innerHTML=''; ACTIONS.forEach(([a,l])=>{ const r=document.createElement('div'); r.className='kRow'; const s=document.createElement('span'); s.textContent=l; const b=document.createElement('button'); b.className='btn'+(WAITKEY===a?' wait':''); b.textContent=WAITKEY===a?'naciśnij…':keyName(KEYMAP[a]); b.addEventListener('click',()=>{ WAITKEY=WAITKEY===a?null:a; renderKeys(); }); r.append(s,b); kl.append(r); }); renderHelp(); }
  addEventListener('keydown',e=>{ if(!WAITKEY)return; e.preventDefault(); e.stopImmediatePropagation(); if(e.code==='Escape'){ WAITKEY=null; renderKeys(); return; }
    const old=KEYMAP[WAITKEY]; const other=Object.keys(KEYMAP).find(k=>KEYMAP[k]===e.code&&k!==WAITKEY); if(other) KEYMAP[other]=old; KEYMAP[WAITKEY]=e.code; WAITKEY=null; rebuildCodes(); try{ localStorage.setItem('trebaczew-klawisze',JSON.stringify(KEYMAP)); }catch(err){} renderKeys(); },true);
  $('kReset').addEventListener('click',()=>{ Object.assign(KEYMAP,KEY_DEF); rebuildCodes(); try{ localStorage.removeItem('trebaczew-klawisze'); }catch(e){} renderKeys(); });
  function renderHelp(){ const K=a=>`<kbd>${keyName(KEYMAP[a])}</kbd>`; $('helpKeys').innerHTML=`${K('w')}${K('a')}${K('s')}${K('d')} ruch · ${K('shift')} sprint · ${K(' ')} skok (w aucie ręczny) · mysz: rozglądanie<br>${K('f')} wsiądź / wysiądź · ${K('e')} akcja: misja, sklep, brama, furtka · ${K('r')} radio<br>${K('q')} dziennik misji · ${K('m')} mapa · ${K('c')} kamera · <kbd>Esc</kbd> pauza`; }
  // grafika
  function setQuality(q){ q=Math.max(0,Math.min(2,q|0)); ENV.quality=q; renderer.shadowMap.enabled=q>0; sun.castShadow=q>0; const ms=q===2?(IS_TOUCH?2048:4096):1024; if(sun.shadow.mapSize.x!==ms){ sun.shadow.mapSize.set(ms,ms); if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map=null; } }
    if(bloom)bloom.enabled=q===2; if(ao)ao.enabled=q===2&&!IS_TOUCH; pr=q===2?DPR:q===1?Math.min(DPR,1):Math.min(DPR,.75); renderer.setPixelRatio(pr); const an=q===2?8:q===1?4:1; resize(); scene.traverse(o=>{ const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[]; ms.forEach(m=>{ if(m.map&&m.map.anisotropy!==an){ m.map.anisotropy=an; m.map.needsUpdate=true; } m.needsUpdate=true; }); }); updButtons(); try{ localStorage.setItem('trebaczew-grafika2',String(q)); }catch(e){} renderQ(); }
  function renderQ(){ $('qChips').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.q===ENV.quality))); $('oSound').textContent=AU.on?'Dźwięk: wł.':'Dźwięk: wył.'; $('oWeather').textContent=$('bWeather').textContent; $('oSeason').textContent=$('bSeason').textContent; }
  $('oWeather').addEventListener('click',()=>{ $('bWeather').click(); renderQ(); }); $('oSeason').addEventListener('click',()=>{ $('bSeason').click(); renderQ(); });
  $('qChips').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>setQuality(+b.dataset.q)));
  $('oSound').addEventListener('click',()=>{ audioStart(); setTimeout(renderQ,50); });
  try{ SENS=clamp(parseFloat(localStorage.getItem('trebaczew-czulosc'))||1,.4,2); }catch(e){} $('sensIn').value=SENS; $('sensIn').addEventListener('input',e=>{ SENS=+e.target.value; try{ localStorage.setItem('trebaczew-czulosc',String(SENS)); }catch(err){} });
  { let q=null; try{ q=localStorage.getItem('trebaczew-grafika2'); }catch(e){} if(q==='0'||q==='1'||q==='2') setQuality(+q); else if(IS_TOUCH) setQuality(0); }
  // kreator postaci
  const HAIR_C=[0x111111,0x2a1d14,0x4a2e1a,0x6b4426,0x8a4a2a,0xb08a50,0xd2b27a,0xe8d8a8,0x8a8a8a,0xd8d8d8,0x7a1e1e,0x3a5ac8];
  const SKIN_C=[0xf5d9c0,0xf0cfb2,0xe6bb98,0xd9a982,0xc68e66,0xa86f4b,0x7a4a2e,0x5a3420];
  const CLOTH_C=[0x2b2f36,0x111214,0xe8e6e0,0xb33a3a,0x2f5d8a,0x3f6b3a,0xc9a24a,0x6b4c8a,0x1f6a6a,0xc96b9a,0x7a6a58,0xff8c1a];
  const BOT_C=[0x2c3e66,0x1e2a44,0x3a4e7a,0x2a2a2c,0x111214,0x5a4a3a,0x6a6a6a,0xb8ac94,0x3f4a32,0x7a2a2a];
  const HAIRS={m:[['short','krótkie'],['buzz','na jeża'],['cap','czapka'],['bald','łysy']],k:[['long','długie'],['pony','kucyk'],['bob','bob'],['short','krótkie']]};
  const STYLES=[['jacket','kurtka'],['tee','t-shirt'],['hoodie','bluza'],['coat','płaszcz']];
  const CHAR={sex:'m',name:'',hair:'short',hairC:0x2a1d14,skin:0xe6bb98,style:'jacket',top:0x2b2f36,bot:0x2c3e66};
  try{ const c=JSON.parse(localStorage.getItem('trebaczew-postac')||'null'); if(c&&typeof c==='object'){ ['sex','hair','style'].forEach(k=>{ if(typeof c[k]==='string')CHAR[k]=c[k].slice(0,12); }); if(typeof c.name==='string')CHAR.name=cleanName(c.name); ['hairC','skin','top','bot'].forEach(k=>{ if(Number.isInteger(c[k]))CHAR[k]=c[k]; }); } }catch(e){}
  function cleanName(n){ return String(n).replace(/[<>&"'`\u0000-\u001f]/g,'').slice(0,20).trim(); }
  function rebuildPlayer(){ const vis=player.visible, pos=player.position.clone(), rot=player.rotation.y; scene.remove(player);
    player=makePerson(CHAR.top,CHAR.bot,CHAR.hairC,{female:CHAR.sex==='k',style:CHAR.style,hairStyle:CHAR.hair,skin:CHAR.skin,shoe:0x1c1c1c,exact:true}); player.position.copy(pos); player.rotation.y=rot; player.visible=vis; scene.add(player);
    player.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); $('nameTxt').textContent=CHAR.name; if(CHAR.name){ try{ myNick=CHAR.name; }catch(e){} } }
  function saveChar(){ try{ localStorage.setItem('trebaczew-postac',JSON.stringify(CHAR)); }catch(e){} }
  function chips(el,list,key){ el.innerHTML=''; list.forEach(([v,l])=>{ const b=document.createElement('button'); b.textContent=l; b.setAttribute('aria-pressed',String(CHAR[key]===v)); b.addEventListener('click',()=>{ CHAR[key]=v; renderChar(); rebuildPlayer(); saveChar(); }); el.append(b); }); }
  function swatches(el,list,key){ el.innerHTML=''; list.forEach(v=>{ const b=document.createElement('button'); b.style.background='#'+v.toString(16).padStart(6,'0'); b.setAttribute('aria-label','kolor'); b.setAttribute('aria-pressed',String(CHAR[key]===v)); b.addEventListener('click',()=>{ CHAR[key]=v; renderChar(); rebuildPlayer(); saveChar(); }); el.append(b); }); }
  function renderChar(){ $('cName').value=CHAR.name; $('cSex').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===CHAR.sex)));
    if(!HAIRS[CHAR.sex].some(h=>h[0]===CHAR.hair)) CHAR.hair=HAIRS[CHAR.sex][0][0]; chips($('cHair'),HAIRS[CHAR.sex],'hair'); swatches($('cHairC'),HAIR_C,'hairC'); swatches($('cSkin'),SKIN_C,'skin'); chips($('cStyle'),STYLES,'style'); swatches($('cTop'),CLOTH_C,'top'); swatches($('cBot'),BOT_C,'bot'); }
  $('cSex').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ CHAR.sex=b.dataset.v; renderChar(); rebuildPlayer(); saveChar(); }));
  $('cName').addEventListener('input',e=>{ CHAR.name=cleanName(e.target.value); $('nameTxt').textContent=CHAR.name; saveChar(); });
  $('cRand').addEventListener('click',()=>{ CHAR.sex=rnd()<.5?'m':'k'; CHAR.hair=pick(HAIRS[CHAR.sex])[0]; CHAR.hairC=pick(HAIR_C); CHAR.skin=pick(SKIN_C); CHAR.style=pick(STYLES)[0]; CHAR.top=pick(CLOTH_C); CHAR.bot=pick(BOT_C); renderChar(); rebuildPlayer(); saveChar(); });
  // zgłoszenie błędu: gotowy formularz issue na GitHubie
  function bugHref(){ const cat=$('bCat').value, txt=$('bTxt').value.trim(); const title=`[${cat}] ${txt.split('\n')[0].slice(0,70)||'Zgłoszenie błędu'}`;
    const body=`**Opis**\n${txt||'(brak opisu)'}\n\n**Informacje z gry**\n- pozycja: x=${Math.round(st.x)}, z=${Math.round(st.z)}${st.inside?' (w Lewiatanie)':''}\n- poziom: ${st.level}, misje główne: ${DONE.size}/20\n- grafika: ${ENV.quality?'wysoka':'niska'}, ekran: ${innerWidth}×${innerHeight}, dotyk: ${IS_TOUCH?'tak':'nie'}\n- przeglądarka: ${navigator.userAgent}`;
    return 'https://trebaczew.io/zglos.html?kat='+encodeURIComponent(cat)+'&opis='+encodeURIComponent(txt.slice(0,1500))+'&info='+encodeURIComponent(body.split('**Informacje z gry**')[1]||''); }
  ['input','change'].forEach(ev=>{ $('bTxt').addEventListener(ev,()=>{ $('bSend').href=bugHref(); }); $('bCat').addEventListener(ev,()=>{ $('bSend').href=bugHref(); }); });
  $('bSend').addEventListener('click',()=>{ $('bSend').href=bugHref(); setTimeout(()=>{ $('bTxt').value=''; openPanel(''); },300); });
  // panele i stany menu
  function openPanel(id){ ['pOpt','pChar','pBug','pNick','pAcct'].forEach(p=>$(p).hidden=p!==id); menuEl.classList.toggle('panel',!!id); menuEl.classList.toggle('creator',id==='pChar'); MENU.view=id==='pChar'?'creator':'';
    if(id==='pOpt'){ renderKeys(); renderQ(); } if(id==='pChar'){ renderChar(); MENU.ca=st.yaw; MENU.t=0; } if(id==='pBug') $('bSend').href=bugHref(); WAITKEY=null; }
  menuEl.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>openPanel('')));
  let HAS_SAVE=false; try{ HAS_SAVE=!!localStorage.getItem('trebaczew-gra'); }catch(e){}
  function playSub(){ const has=st.xp>0||DONE.size>0||HAS_SAVE; $('mPlaySub').textContent=GAME.started?'':has?`kontynuuj · poziom ${st.level}`:'nowa gra'; $('mPlay').firstChild.textContent=GAME.started?'Wznów grę ':'Tryb jednoosobowy '; $('mNew').hidden=true; $('mMulti').firstChild.textContent=GAME.started?'Wznów grę ':'Graj '; $('mMultiSub').textContent=GAME.started?'':'z innymi mieszkańcami'; $('mLog').hidden=!GAME.started; $('mLogSub').textContent=`fabuła ${DONE.size}/20`; }
  function showMenu(v){ GAME.paused=v; if(AU.ctx){ try{ v?AU.ctx.suspend():AU.ctx.resume(); }catch(e){} } menuEl.hidden=!v; document.body.classList.toggle('inmenu',v); keys.clear(); resetJoy(); if(v){ menuEl.classList.toggle('pause',GAME.started); playSub(); openPanel(''); if(!IS_TOUCH) setTimeout(()=>$('mMulti').focus(),30); } else { if(MENU.view==='creator') MENU.view=''; if(MENU.vo){ camera.clearViewOffset(); MENU.vo=false; } canvas.focus(); clock.getDelta(); } }
  $('mPlay').addEventListener('click',()=>{ if(!GAME.started){ GAME.started=true; statEvent('start',{mob:IS_TOUCH?1:0}); if(!AU.ctx) try{ audioStart(); }catch(e){} { const how=IS_TOUCH?'Menu → Misje: lista zadań':`<kbd>${keyName(KEYMAP.q)}</kbd> dziennik misji`; if(!DONE.size&&INFO){ WAYPOINT=INFO.front.slice(); toast(`Witaj w Trębaczewie${CHAR.name?', '+CHAR.name:''}!<br>Podejdź do niebieskiego punktu informacyjnego „i” obok - tam zaczyna się pierwsza misja.<br>${how}`,7); } else toast(`Witaj w Trębaczewie${CHAR.name?', '+CHAR.name:''}!<br>${how} · żółte znaczniki to misje fabularne`,6); } } showMenu(false); });
  $('mOpt').addEventListener('click',()=>openPanel($('pOpt').hidden?'pOpt':''));
  /* ---------- konto (opcjonalne): synchronizacja zapisu między urządzeniami ---------- */
  const ACC_KEYS=['trebaczew-gra','trebaczew-wlasne','trebaczew-npc','trebaczew-mini','trebaczew-postac','trebaczew-nick'];
  const ACC={name:'',tok:''}; try{ const a=JSON.parse(localStorage.getItem('trebaczew-konto')||'null'); if(a&&a.tok){ ACC.name=a.name; ACC.tok=a.tok; } }catch(e){}
  async function accCall(path,body){ try{ const r=await fetch(STAT_URL+'/acct/'+path,{method:'POST',headers:{'content-type':'text/plain'},body:JSON.stringify(body)}); const j=await r.json().catch(()=>({error:'Błąd odpowiedzi serwera'})); if(!r.ok&&!j.error) j.error='Błąd '+r.status; return j; }catch(e){ return {error:'Brak połączenia z serwerem.'}; } }
  function accPack(){ const o={}; ACC_KEYS.forEach(k=>{ try{ const v=localStorage.getItem(k); if(v!==null) o[k]=v; }catch(e){} }); return JSON.stringify(o); }
  function accApply(txt){ let o; try{ o=JSON.parse(txt); }catch(e){ return false; } if(!o||typeof o!=='object') return false; ACC_KEYS.forEach(k=>{ if(typeof o[k]==='string'){ try{ localStorage.setItem(k,o[k]); }catch(e){} } }); return true; }
  let accBusy=false;
  async function accSave(){ if(!ACC.tok||accBusy) return; accBusy=true; try{ saveGame(); const j=await accCall('save',{tok:ACC.tok,save:accPack()}); if(j.error&&/Sesja/.test(j.error)){ ACC.tok=''; localStorage.removeItem('trebaczew-konto'); accUi(); } }catch(e){} accBusy=false; }
  setInterval(()=>{ if(ACC.tok&&!document.hidden) accSave(); },60000);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden&&ACC.tok){ try{ saveGame(); fetch(STAT_URL+'/acct/save',{method:'POST',keepalive:true,headers:{'content-type':'text/plain'},body:JSON.stringify({tok:ACC.tok,save:accPack()})}); }catch(e){} } });
  function accUi(msg,bad){ const st_=$('accSt'); if(!st_) return; $('accIn').hidden=!!ACC.tok; $('accOut').hidden=!ACC.tok; $('accWho').textContent=ACC.name||''; $('accMsg').textContent=msg||''; $('accMsg').style.color=bad?'#e07a6a':'#9fd8a8'; $('mAcctSub').textContent=ACC.tok?'zalogowano: '+ACC.name:'zapis w chmurze'; }
  async function accAuth(kind){ const name=$('accName').value.trim(), pass=$('accPass').value; accUi('Łączenie…'); const j=await accCall(kind,{name,pass}); if(j.error){ accUi(j.error,true); return; }
    ACC.name=j.name; ACC.tok=j.tok; try{ localStorage.setItem('trebaczew-konto',JSON.stringify(ACC)); }catch(e){} $('accPass').value='';
    if(kind==='login'&&j.save){ if(confirm('Wczytać zapis z konta? Zastąpi on zapis gry na tym urządzeniu.')){ if(accApply(j.save)){ accUi('Zapis wczytany - odświeżam grę…'); setTimeout(()=>location.reload(),600); return; } } }
    await accSave(); accUi(kind==='register'?'Konto utworzone. Zapis jest synchronizowany.':'Zalogowano. Zapis jest synchronizowany.'); }
  $('mAcct').addEventListener('click',()=>{ openPanel($('pAcct').hidden?'pAcct':''); accUi(); });
  $('accLogin').addEventListener('click',()=>accAuth('login')); $('accReg').addEventListener('click',()=>accAuth('register'));
  $('accLogout').addEventListener('click',async()=>{ await accSave(); await accCall('logout',{tok:ACC.tok}); ACC.tok=''; ACC.name=''; try{ localStorage.removeItem('trebaczew-konto'); }catch(e){} accUi('Wylogowano.'); });
  $('accPush').addEventListener('click',async()=>{ await accSave(); accUi('Zapis wysłany do chmury.'); });
  accUi();

  $('mLog').addEventListener('click',()=>{ openPanel(''); menuEl.hidden=true; LOG_FROM_MENU=true; toggleLog(true); });
  $('mChar').addEventListener('click',()=>openPanel($('pChar').hidden?'pChar':''));
  $('mBug').addEventListener('click',()=>openPanel($('pBug').hidden?'pBug':''));
  // tryb wieloosobowy: najpierw nazwa gracza (wymagana), potem połączenie
  /* ---------- tryb admina: logowanie GitHub przez Worker (konto z listy), szybki lot z góry, noclip, współrzędne ---------- */
  const ADM={on:false,login:''}; const ADM_URL='https://trebaczew-mp.kontakt-3e3.workers.dev';
  function admRender(){ const b=$('mAdm'); if(!b)return; b.firstChild.textContent=ADM.on?'Admin: '+ADM.login+' ✓ ':'Admin (GitHub) '; $('mAdmSub').textContent=ADM.on?'kliknij, aby wylogować':'zaloguj się, by szybciej latać po mapie'; $('admHud').hidden=!ADM.on; b.hidden=!ADM.on; }
  async function admVerify(t){ try{ const r=await fetch(ADM_URL+'/auth/verify?t='+encodeURIComponent(t),{cache:'no-store'}); const j=await r.json(); if(j&&j.ok){ ADM.on=true; ADM.login=String(j.login||'').slice(0,40); try{ sessionStorage.setItem('trebaczew-adm',t); }catch(e){} admRender(); toast('<b>Tryb admina</b><br>Widok z lotu ptaka: lot bez kolizji, Shift - bardzo szybko',5); return; } }catch(e){} ADM.on=false; try{ sessionStorage.removeItem('trebaczew-adm'); }catch(e){} admRender(); }
  if(/[?&]admin(=|&|$)/.test(location.search)&&!sessionStorage.getItem('trebaczew-adm')){ location.href=ADM_URL+'/auth/game?return='+encodeURIComponent('https://trebaczew.io/gra/'); }
  { let t=''; try{ const m=/[#&]adm=([A-Za-z0-9_.-]{20,400})/.exec(location.hash); if(m){ t=m[1]; history.replaceState(null,'',location.pathname+location.search); } else t=sessionStorage.getItem('trebaczew-adm')||''; }catch(e){} if(t) admVerify(t); }
  { const ah=$('admHud'); ah.style.pointerEvents='auto'; ah.style.cursor='copy'; ah.title='Kliknij, aby skopiować współrzędne'; ah.addEventListener('click',()=>{ const la=51.1301965-st.z/110574, lo=18.9215954+st.x/(111320*Math.cos(51.1301965*Math.PI/180)); const t='x '+st.x.toFixed(0)+' z '+st.z.toFixed(0)+' ('+la.toFixed(5)+', '+lo.toFixed(5)+')'; const done=()=>toast('Skopiowano współrzędne:<br><b>'+t+'</b>',2.4); try{ navigator.clipboard.writeText(t).then(done,()=>{ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e){} ta.remove(); done(); }); }catch(e){ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e2){} ta.remove(); done(); } }); }
  $('mAdm').addEventListener('click',()=>{ if(ADM.on){ ADM.on=false; try{ sessionStorage.removeItem('trebaczew-adm'); }catch(e){} admRender(); return; } location.href=ADM_URL+'/auth/game?return='+encodeURIComponent('https://trebaczew.io/gra/'); });
  function nickSave(v){ try{ const pv=localStorage.getItem('trebaczew-nick'); if(pv&&pv!==v) localStorage.setItem('trebaczew-nick-prev',pv); localStorage.setItem('trebaczew-nick',v); }catch(e){} myNick=v; if(typeof rankTick==='function') setTimeout(()=>{ try{ rankTick(true); }catch(e){} },300); }
  function nickCheck(v){ v=cleanTxt(v,16).replace(/\s+/g,' ').trim(); if(v.length<1) return [null,'Wpisz dowolny nick, żeby zagrać.']; if(/^(gracz|ty|admin|moderator|serwer|system)$/i.test(v)) return [null,'Ta nazwa jest zajęta - wybierz inną.']; return [v,'']; }
  function nickGo(){ const [v,err]=nickCheck($('nickStart').value); if(!v){ $('nickErr').textContent=err; $('nickStart').focus(); return; } nickSave(v); nickIn.value=v; openPanel(''); if(!MP.on) mpInit(true); $('mPlay').click(); }
  $('mMulti').addEventListener('click',()=>{ if(MP.on){ $('mPlay').click(); return; } openPanel('pNick'); $('nickStart').value=myNick||''; $('nickErr').textContent=''; setTimeout(()=>{ try{ $('nickStart').focus(); }catch(e){} },60); });
  $('nickGo').addEventListener('click',nickGo); $('nickStart').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); nickGo(); } });
  let newArm=0; $('mNew').addEventListener('click',()=>{ if(Date.now()-newArm>3000){ newArm=Date.now(); $('mNew').firstChild.textContent='Na pewno? Kliknij jeszcze raz '; setTimeout(()=>{ $('mNew').firstChild.textContent='Nowa gra'; },3000); return; }
    try{ localStorage.removeItem('trebaczew-gra'); }catch(e){} location.reload(); });
  ['bMenu','bMenuT'].forEach(id=>$(id).addEventListener('click',()=>showMenu(true)));
  ['bLog','bLogT'].forEach(id=>$(id).addEventListener('click',()=>toggleLog()));
  $('bJump').addEventListener('pointerdown',()=>{ keys.add(' '); setTimeout(()=>keys.delete(' '),120); });
  $('winOk').addEventListener('click',()=>{ $('winScreen').hidden=true; canvas.focus(); });
  addEventListener('keydown',e=>{ if(e.code!=='Escape'||e.defaultPrevented||WAITKEY)return; const tag=e.target&&e.target.tagName; if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'){ if(!menuEl.hidden) e.target.blur(); return; }
    if(!$('winScreen').hidden){ $('winScreen').hidden=true; return; } if(!mapView.hidden){ toggleMap(false); return; }
    if(!menuEl.hidden){ if(!$('pOpt').hidden||!$('pChar').hidden||!$('pBug').hidden||!$('pNick').hidden){ openPanel(''); return; } if(GAME.started) showMenu(false); return; }
    if(GAME.started) showMenu(true); });
  // co klatkę, gdy menu jest otwarte
  function menuFrame(dt){ MENU.t+=dt; if(MENU.vo&&MENU.view!=='creator'){ camera.clearViewOffset(); MENU.vo=false; }
    if(MENU.view==='creator'){ const P=player.position; const fy=st.inside?CUR.y:H(st.x,st.z); player.visible=true; P.set(st.x,fy+.1,st.z); player.rotation.y=MENU.ca+Math.sin(MENU.t*.6)*.7; animPerson(player,0,0);
      const Wd=innerWidth, Hd=innerHeight, pr0=$('pChar').getBoundingClientRect(); let fx0=0,fy0=0,fw=Wd,fh=Hd;
      if(pr0.left>Wd*.3){ fw=Math.max(120,pr0.left-8); } else { fh=Math.max(120,pr0.top-8); }
      const tanH=Math.tan(camera.fov*Math.PI/360), need=2.1; let d=need/(.82*(fh/Hd)*2*tanH); d=Math.max(d,need*.5/((fw/Wd)*2*tanH*camera.aspect)*1.0); d=clamp(d,2.2,12);
      const a=MENU.ca; camera.position.set(st.x+Math.sin(a)*d,fy+1.05,st.z+Math.cos(a)*d); camera.lookAt(st.x,fy+.95,st.z);
      camera.setViewOffset(Wd,Hd,Wd/2-(fx0+fw/2),Hd/2-(fy0+fh/2),Wd,Hd); MENU.vo=true; if(st.inside) inCam2();
      sun.position.set(st.x+SUNDIR.x*220,fy+SUNDIR.y*220,st.z+SUNDIR.z*220); sun.target.position.set(st.x,fy,st.z); }
    else if(!GAME.started){ const a=MENU.a0+Math.sin(MENU.t*.12)*.2, r=MENU.r, c=MENU.c, y=H(c[0],c[1]), off=-r*.22; camera.position.set(c[0]+Math.sin(a)*r,y+Math.max(62,r*.5),c[1]+Math.cos(a)*r); camera.lookAt(c[0]-Math.cos(a)*off,y+2,c[1]+Math.sin(a)*off); sun.position.set(c[0]+SUNDIR.x*220,y+SUNDIR.y*220,c[1]+SUNDIR.z*220); sun.target.position.set(c[0],y,c[1]); }
    else return false;
    cullUpdate(); sky.position.copy(camera.position); if(composer) composer.render(dt); else renderer.render(scene,camera); return true; }
  function inCam2(){ const p=camera.position; p.x=clamp(p.x,CUR.x-CUR.W/2+.3,CUR.x+CUR.W/2-.3); p.z=clamp(p.z,CUR.z-CUR.D/2+.3,CUR.z+CUR.D/2-.3); }
  // instalacja gry (PWA): własne okno, pełny ekran, działa też bez internetu - tylko na trebaczew.io
  { let deferred=null; const inst=$('mInstall'), onSite=/trebaczew\.io$/.test(location.hostname)||location.hostname==='localhost'; const standalone=matchMedia('(display-mode: fullscreen)').matches||matchMedia('(display-mode: standalone)').matches||navigator.standalone;
    if(onSite&&'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
    addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferred=e; if(!standalone) inst.hidden=false; });
    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent); if(!standalone&&(ios||!onSite)) inst.hidden=false;
    inst.addEventListener('click',async()=>{ const sub=$('mInstallSub');
      if(deferred){ deferred.prompt(); const r=await deferred.userChoice.catch(()=>null); deferred=null; if(r&&r.outcome==='accepted'){ inst.hidden=true; } return; }
      if(!onSite){ window.open('https://trebaczew.io/?zainstaluj=1','_blank','noopener'); return; }
      sub.textContent=ios?'Safari: Udostępnij → „Do ekranu początkowego”':'menu przeglądarki → „Zainstaluj aplikację”'; }); }
  rebuildPlayer(); renderHelp();

  /* ---------- minigry: paczkomat, flanki w parku, rzuty karne (orlik / stadion LZS) ---------- */
  const MG={on:false,id:null,g:null,opt:{},t:0,best:{},cv:null,cx:null,W:0,H:0,res:null};
  try{ MG.best=JSON.parse(localStorage.getItem('trebaczew-mini')||'{}')||{}; }catch(e){}
  const mgEl=document.createElement('div'); mgEl.id='mg'; mgEl.hidden=true;
  mgEl.innerHTML='<canvas id="mgCv"></canvas><div class="mgTop"><b id="mgTitle"></b><span id="mgInfo"></span><button id="mgX" aria-label="Wyjdź z minigry">✕</button></div><div id="mgOver" hidden></div>';
  document.body.appendChild(mgEl); MG.cv=mgEl.querySelector('canvas'); MG.cx=MG.cv.getContext('2d');
  const mgOver=mgEl.querySelector('#mgOver');
  function mgResize(){ const d=Math.min(2,window.devicePixelRatio||1); MG.W=innerWidth; MG.H=innerHeight; MG.cv.width=Math.round(MG.W*d); MG.cv.height=Math.round(MG.H*d); MG.cx.setTransform(d,0,0,d,0,0); }
  addEventListener('resize',()=>{ if(MG.on) mgResize(); });
  const mgSnd={ ok(){ if(AU.ctx&&AU.on){ const t=AU.ctx.currentTime; tone('triangle',880,t,.12,.06); tone('triangle',1320,t+.07,.16,.05); } },
    bad(){ if(AU.ctx&&AU.on){ const t=AU.ctx.currentTime; tone('square',220,t,.25,.04,null,150); } },
    tick(){ if(AU.ctx&&AU.on) tone('sine',1200,AU.ctx.currentTime,.04,.03); },
    key(){ if(AU.ctx&&AU.on) tone('square',900+Math.random()*80,AU.ctx.currentTime,.05,.02); },
    thud(){ if(AU.ctx&&AU.on){ const t=AU.ctx.currentTime; tone('sine',140,t,.18,.12,null,60); } },
    can(){ if(AU.ctx&&AU.on){ const t=AU.ctx.currentTime; tone('triangle',1800,t,.12,.05,null,900); tone('square',2600,t+.02,.08,.015); } },
    whistle(){ if(AU.ctx&&AU.on){ const t=AU.ctx.currentTime; tone('sine',2900,t,.35,.05,null,3100); tone('sine',2700,t+.4,.6,.05); } },
    cheer(v){ if(AU.ctx&&AU.on){ const t=AU.ctx.currentTime; noiseHit(t,1.4,.05*(v||1),'bandpass',1100); [0,.12,.24].forEach((o,i)=>tone('triangle',520+i*130,t+o,.3,.03)); } },
    win(){ if(AU.ctx&&AU.on) sfx.win(); } };
  // pomocnicze rysowanie
  function rrect(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
  function txt(c,s,x,y,size,col,align,weight){ c.font=`${weight||700} ${size}px "Barlow Condensed", Barlow, Arial`; c.textAlign=align||'center'; c.textBaseline='middle'; c.fillStyle=col||'#fff'; c.fillText(s,x,y); }
  function bigTxt(c,s,x,y,size,col){ c.font=`400 ${size}px Anton, Impact, "Barlow Condensed", Arial`; c.textAlign='center'; c.textBaseline='middle'; c.lineWidth=Math.max(4,size*.12); c.strokeStyle='rgba(0,0,0,.75)'; c.strokeText(s,x,y); c.fillStyle=col||'#fff'; c.fillText(s,x,y); }
  function bar(c,x,y,w,h,f,col,bg){ rrect(c,x,y,w,h,h/2); c.fillStyle=bg||'rgba(0,0,0,.45)'; c.fill(); if(f>0){ rrect(c,x,y,Math.max(h,w*Math.min(1,f)),h,h/2); c.fillStyle=col; c.fill(); } }
  function person(c,x,y,s,shirt,pants,o){ o=o||{}; c.save(); c.translate(x,y); c.scale(s,s); if(o.rot) c.rotate(o.rot); const lw=o.walk?Math.sin(o.walk)*.45:0;
    c.strokeStyle=pants; c.lineCap='round'; c.lineWidth=9; c.beginPath(); c.moveTo(-5,-34); c.lineTo(-5+Math.sin(lw)*16,-2); c.moveTo(5,-34); c.lineTo(5-Math.sin(lw)*16,-2); c.stroke();
    c.fillStyle=shirt; rrect(c,-12,-72,24,40,7); c.fill(); c.strokeStyle=o.skin||'#e6bb98'; c.lineWidth=7; c.beginPath();
    const aL=o.armL!==undefined?o.armL:.25-lw*.6, aR=o.armR!==undefined?o.armR:-.25+lw*.6; c.moveTo(-12,-66); c.lineTo(-12-Math.sin(aL)*24,-66+Math.cos(aL)*24); c.moveTo(12,-66); c.lineTo(12+Math.sin(-aR)*24,-66+Math.cos(aR)*24); c.stroke();
    c.fillStyle=o.skin||'#e6bb98'; c.beginPath(); c.arc(0,-84,11,0,7); c.fill(); c.fillStyle=o.hair||'#3a2a1c'; c.beginPath(); c.arc(0,-88,11,Math.PI,0); c.fill(); c.restore(); }
  function stars(n){ return '★★★'.slice(0,n)+'<span class="off">'+'★★★'.slice(0,3-n)+'</span>'; }
  function mgHelp(lines){ return '<ul>'+lines.map(l=>`<li>${l}</li>`).join('')+'</ul>'; }

  /* ===== 1. PACZKOMAT ===== */
  const PK_SIZES=[['A',8,'mała'],['B',19,'średnia'],['C',41,'duża']];
  function makePaczkomat(opt){ const mode=opt.mode||'nadaj'; const G={mode,rounds:mode==='nadaj'?3:2,round:0,lives:3,score:0,phase:'',pt:0,lim:0,msg:'',msgT:0,typed:'',code:'',door:-1,doors:[],flash:0,combo:0,done:false,shake:0,anim:0};
    const COLS=7, ROWS=5;
    function newRound(){ G.round++; G.typed=''; G.code=String(Math.floor(100000+Math.random()*900000)); const h=[4+Math.floor(Math.random()*4),10+Math.floor(Math.random()*9),22+Math.floor(Math.random()*19)][Math.floor(Math.random()*3)]; G.pkg={h,w:20+Math.floor(Math.random()*20),d:25+Math.floor(Math.random()*20),ok:h<=8?0:h<=19?1:2,col:['#c9a26b','#b98d55','#d8b47c'][Math.floor(Math.random()*3)]};
      setPhase(mode==='nadaj'?'size':'code'); }
    function setPhase(p){ G.phase=p; G.pt=0; G.picked=-1;
      if(p==='size') G.lim=Math.max(4,7-G.round*.8);
      if(p==='code'){ G.lim=Math.max(7,11-G.round); G.show=Math.max(1.4,2.6-G.round*.3); G.typed=''; }
      if(p==='door'){ G.lim=Math.max(1.0,1.6-G.round*.15); G.door=Math.floor(Math.random()*COLS*ROWS); if(G.door%COLS===3&&Math.floor(G.door/COLS)<3) G.door+=1; G.dPhase=0; G.wait=.6+Math.random()*.6; } }
    function fail(m){ G.lives--; G.combo=0; G.msg=m; G.msgT=1.6; G.shake=.35; mgSnd.bad(); if(G.lives<=0){ G.done=true; G.over=1.2; } else setPhase(G.phase); }
    function okStep(nx){ const tb=Math.max(0,Math.round((G.lim-G.pt)*20)); G.combo++; G.score+=100+tb+G.combo*10; G.msg=`+${100+tb+G.combo*10}`; G.msgT=1; mgSnd.ok(); if(nx) setPhase(nx); else { G.anim=1.1; G.phase='slide'; } }
    G.update=dt=>{ G.t=(G.t||0)+dt; if(G.msgT>0)G.msgT-=dt; if(G.shake>0)G.shake-=dt; if(G.over!==undefined){ G.over-=dt; if(G.over<=0) mgEnd(G.result()); return; }
      if(G.phase==='slide'){ G.anim-=dt; if(G.anim<=0){ if(G.round>=G.rounds){ G.done=true; G.over=.6; } else newRound(); } return; }
      if(G.phase==='door'){ if(G.wait>0){ G.wait-=dt; return; } }
      if(G.phase==='code'&&G.pt<G.show){ G.pt+=dt; return; }
      G.pt+=dt; const lim=G.phase==='code'?G.lim+G.show:G.lim; if(G.pt>lim) fail(G.phase==='door'?'Skrytka się zamknęła!':'Za wolno!'); };
    G.result=()=>{ const win=G.lives>0; const st3=!win?0:G.lives===3&&G.score>=(mode==='nadaj'?1150:650)?3:G.lives>=2?2:1; return {win,score:G.score,stars:st3,text:win?(mode==='nadaj'?`Nadano ${G.rounds} paczki`:'Paczka odebrana'):'Paczkomat zablokowany - spróbuj jeszcze raz'}; };
    function layout(W,H){ const port=H>W; const mW=port?Math.min(W*.92,460):Math.min(W*.46,520), mH=port?H*.42:Math.min(H*.78,560); const mx=port?(W-mW)/2:W*.06, my=port?70:(H-mH)/2+20;
      const pW=port?Math.min(W*.92,420):Math.min(W*.38,420), pH=port?H*.42:Math.min(H*.78,560), px=port?(W-pW)/2:W-pW-W*.06, py=port?my+mH+12:my; return {mx,my,mW,mH,px,py,pW,pH}; }
    function keyRects(L){ const out=[]; const kw=(L.pW-40)/3, kh=Math.min(64,(L.pH-190)/4); const ks=['1','2','3','4','5','6','7','8','9','⌫','0','OK']; ks.forEach((k,i)=>out.push({k,x:L.px+20+(i%3)*kw,y:L.py+170+Math.floor(i/3)*(kh+6),w:kw-8,h:kh})); return out; }
    function sizeRects(L){ return PK_SIZES.map((s,i)=>({i,x:L.px+20,y:L.py+150+i*((L.pH-170)/3),w:L.pW-40,h:(L.pH-170)/3-12})); }
    function doorRect(L,i){ const gx=L.mx+18, gy=L.my+46, gw=L.mW-36, gh=L.mH-64; const cw=gw/COLS, rh=gh/ROWS; return {x:gx+(i%COLS)*cw+3,y:gy+Math.floor(i/COLS)*rh+3,w:cw-6,h:rh-6}; }
    G.down=(x,y)=>{ if(G.done||G.over!==undefined)return; const L=layout(MG.W,MG.H);
      if(G.phase==='size'){ const r=sizeRects(L).find(r=>x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h); if(r){ if(r.i===G.pkg.ok) okStep('code'); else fail(`Gabaryt ${PK_SIZES[r.i][0]} nie pasuje (wys. ${G.pkg.h} cm)`); } }
      else if(G.phase==='code'&&G.pt>=G.show){ const r=keyRects(L).find(r=>x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h); if(r) G.key(r.k); }
      else if(G.phase==='door'&&G.wait<=0){ for(let i=0;i<COLS*ROWS;i++){ const d=doorRect(L,i); if(x>d.x&&x<d.x+d.w&&y>d.y&&y<d.y+d.h){ if(i===G.door) okStep(null); else fail('To nie ta skrytka!'); return; } } } };
    G.key=k=>{ if(G.phase==='size'){ const i=['a','b','c','1','2','3'].indexOf(String(k).toLowerCase())%3; if(i>=0&&/^[abc123]$/i.test(k)){ if(i===G.pkg.ok) okStep('code'); else fail(`Gabaryt ${PK_SIZES[i][0]} nie pasuje (wys. ${G.pkg.h} cm)`); } return; }
      if(G.phase!=='code'||G.pt<G.show)return; if(k==='⌫'||k==='Backspace'){ G.typed=G.typed.slice(0,-1); mgSnd.key(); return; } if(k==='OK'||k==='Enter'){ if(G.typed===G.code) okStep('door'); else { G.typed=''; fail('Błędny kod'); } return; }
      if(/^[0-9]$/.test(k)&&G.typed.length<6){ G.typed+=k; mgSnd.key(); if(G.typed.length===6){ if(G.typed===G.code) okStep('door'); else { G.typed=''; fail('Błędny kod'); } } } };
    G.draw=(c,W,H)=>{ const L=layout(W,H); const sx=G.shake>0?(Math.random()-.5)*10:0; c.save(); c.translate(sx,0);
      // tło: parking i niebo
      let gr=c.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#9cc3e2'); gr.addColorStop(.55,'#d9e3ea'); gr.addColorStop(.56,'#5d5f63'); gr.addColorStop(1,'#3e4044'); c.fillStyle=gr; c.fillRect(-20,0,W+40,H);
      for(let i=0;i<14;i++){ c.fillStyle='#2f5a2c'; const tx=i*W/13; c.beginPath(); c.moveTo(tx-26,H*.56); c.lineTo(tx,H*.56-120-(i%3)*18); c.lineTo(tx+26,H*.56); c.fill(); }
      // paczkomat
      c.fillStyle='#2b2f33'; rrect(c,L.mx-8,L.my-8,L.mW+16,L.mH+16,10); c.fill(); c.fillStyle='#ffcd00'; rrect(c,L.mx,L.my,L.mW,L.mH,8); c.fill();
      c.fillStyle='#2b2f33'; c.fillRect(L.mx,L.my,L.mW,36); txt(c,'PACZKOMAT · TRĘBACZEW',L.mx+L.mW/2,L.my+18,20,'#ffcd00');
      for(let i=0;i<COLS*ROWS;i++){ const d=doorRect(L,i); const isScr=i%COLS===3&&Math.floor(i/COLS)<3; if(isScr){ if(Math.floor(i/COLS)===1){ c.fillStyle='#1e2226'; rrect(c,d.x,d.y-d.h*.6,d.w,d.h*1.8,4); c.fill(); c.fillStyle='#6fb7e8'; c.fillRect(d.x+6,d.y-d.h*.45,d.w-12,d.h*1.2); } continue; }
        const open=G.phase==='door'&&G.wait<=0&&i===G.door, slid=G.phase==='slide'&&i===G.door;
        c.fillStyle=open||slid?'#151719':'#9aa0a5'; rrect(c,d.x,d.y,d.w,d.h,3); c.fill(); c.strokeStyle='#6c7277'; c.lineWidth=1.5; c.stroke();
        if(open){ const k=1-G.pt/G.lim; c.strokeStyle=`rgba(127,208,107,${.5+.5*Math.sin(G.t*20)})`; c.lineWidth=4; rrect(c,d.x-2,d.y-2,d.w+4,d.h+4,4); c.stroke(); c.fillStyle='#7fd06b'; c.fillRect(d.x,d.y+d.h-5,d.w*Math.max(0,k),5); }
        else { c.fillStyle='#c6cbcf'; c.fillRect(d.x+d.w-10,d.y+d.h/2-2,6,4); } }
      if(G.phase==='slide'){ const d=doorRect(L,G.door); const k=Math.min(1,(1.1-G.anim)/.6); c.globalAlpha=1-k*.7; c.fillStyle=G.pkg.col; c.fillRect(d.x+4+(1-k)*30,d.y+6,d.w-8,d.h-12); c.globalAlpha=1; }
      // panel: telefon / wybór gabarytu
      c.fillStyle='#121518'; rrect(c,L.px,L.py,L.pW,L.pH,18); c.fill(); c.strokeStyle='#3a4046'; c.lineWidth=3; c.stroke();
      txt(c,mode==='nadaj'?`Paczka ${G.round}/${G.rounds}`:`Odbiór ${G.round}/${G.rounds}`,L.px+20,L.py+26,20,'#f2c230','left'); txt(c,'❤'.repeat(Math.max(0,G.lives))+'♡'.repeat(Math.max(0,3-G.lives)),L.px+L.pW-20,L.py+26,22,'#e5484d','right');
      txt(c,`${G.score} pkt`,L.px+L.pW/2,L.py+26,22,'#fff');
      const lim=G.phase==='code'?G.lim:G.lim, tl=G.phase==='code'?Math.max(0,G.pt-G.show):G.pt; if(G.phase!=='slide'&&!(G.phase==='door'&&G.wait>0)) bar(c,L.px+20,L.py+46,L.pW-40,8,1-tl/lim,tl/lim>.7?'#e5484d':'#f2c230');
      if(G.phase==='size'){ txt(c,'Wybierz gabaryt skrytki',L.px+L.pW/2,L.py+76,22,'#fff'); const p=G.pkg; txt(c,`Wymiary paczki: ${p.w} × ${p.d} × ${p.h} cm`,L.px+L.pW/2,L.py+104,18,'#b9c0c6'); txt(c,`wysokość: ${p.h} cm`,L.px+L.pW/2,L.py+128,20,'#f2c230');
        sizeRects(L).forEach(r=>{ c.fillStyle='rgba(255,255,255,.07)'; rrect(c,r.x,r.y,r.w,r.h,8); c.fill(); c.strokeStyle='#3a4046'; c.stroke(); const s=PK_SIZES[r.i]; txt(c,s[0],r.x+30,r.y+r.h/2,Math.min(40,r.h*.6),'#ffcd00'); txt(c,`${s[2]} · do ${s[1]} cm`,r.x+64,r.y+r.h/2,Math.min(20,r.h*.34),'#fff','left'); const bh=Math.min(r.h-14,s[1]*1.1); c.fillStyle='#c9a26b'; c.fillRect(r.x+r.w-70,r.y+r.h-7-bh,50,bh); }); }
      if(G.phase==='code'){ const showing=G.pt<G.show; txt(c,mode==='nadaj'?'Kod nadania z aplikacji':'Kod odbioru z SMS-a',L.px+L.pW/2,L.py+80,20,'#b9c0c6');
        c.fillStyle='rgba(255,255,255,.08)'; rrect(c,L.px+20,L.py+98,L.pW-40,58,10); c.fill();
        if(showing){ txt(c,G.code.replace(/(\d{3})(\d{3})/,'$1 $2'),L.px+L.pW/2,L.py+127,40,'#fff'); txt(c,'Zapamiętaj!',L.px+L.pW/2,L.py+170,20,'#f2c230'); bar(c,L.px+60,L.py+190,L.pW-120,6,1-G.pt/G.show,'#6fb7e8'); }
        else { const t=G.typed.padEnd(6,'·'); txt(c,t.replace(/(.{3})(.{3})/,'$1 $2'),L.px+L.pW/2,L.py+127,40,'#fff'); keyRects(L).forEach(r=>{ c.fillStyle=r.k==='OK'?'#2f6b2f':'rgba(255,255,255,.1)'; rrect(c,r.x,r.y,r.w,r.h,8); c.fill(); txt(c,r.k,r.x+r.w/2,r.y+r.h/2,Math.min(28,r.h*.5),'#fff'); }); } }
      if(G.phase==='door'){ txt(c,G.wait>0?'Za chwilę otworzy się skrytka…':'Kliknij otwartą skrytkę!',L.px+L.pW/2,L.py+90,22,G.wait>0?'#b9c0c6':'#7fd06b');
        const p=G.pkg; const bw=Math.min(L.pW*.5,160), bh=bw*.7; const bx0=L.px+L.pW/2-bw/2, by0=L.py+L.pH/2-bh/2+20; c.fillStyle=p.col; c.fillRect(bx0,by0,bw,bh); c.fillStyle='rgba(0,0,0,.15)'; c.fillRect(bx0+bw*.75,by0,bw*.25,bh); c.fillStyle='#e9e2d0'; c.fillRect(bx0+bw*.1,by0+bh*.3,bw*.45,bh*.28); c.fillStyle='#d2a64a'; c.fillRect(bx0,by0+bh*.45,bw,6); txt(c,mode==='nadaj'?'Twoja paczka':'Paczka dla sąsiada',L.px+L.pW/2,by0+bh+26,18,'#b9c0c6'); }
      if(G.phase==='slide') txt(c,mode==='nadaj'?'Paczka nadana ✓':'Paczka odebrana ✓',L.px+L.pW/2,L.py+L.pH/2,28,'#7fd06b');
      if(G.msgT>0) bigTxt(c,G.msg,W/2,L.my+L.mH/2,Math.min(44,W/16),G.msg[0]==='+'?'#7fd06b':'#ff6b6b');
      c.restore(); };
    newRound(); return G; }

  /* ===== 2. FLANKI ===== */
  function makeFlanki(opt){ const diff=opt.diff||1; const G={need:2,me:0,cpu:0,turn:'me',phase:'aim',pt:0,ang:0,pow:0,ball:null,wind:0,msg:'',msgT:0,can:{fall:0,up:true},run:0,taps:0,cpuRun:0,done:false,round:0,shake:0,parts:[]};
    const W0=()=>MG.W, H0=()=>MG.H;
    function geo(){ const W=MG.W,H=MG.H; const gy=H*.78; const sc=Math.min(W/1000,H/560)*1.15; return {W,H,gy,sc,mx:W*.14,cx:W*.5,ox:W*.86}; }
    function newTurn(t){ G.turn=t; G.round++; G.wind=Math.round((Math.random()*2-1)*(1.2+diff*.6)*10)/10; G.ball=null; G.can={fall:0,up:true}; G.pt=0;
      if(t==='me'){ G.phase='aim'; G.ang=0; } else { G.phase='cpuAim'; } }
    function throwBall(fromX,dir,angDeg,pow){ const g=geo(); const a=angDeg*Math.PI/180; const v=(380+pow*520)*g.sc; G.ball={x:fromX+dir*24*g.sc,y:g.gy-80*g.sc,vx:Math.cos(a)*v*dir,vy:-Math.sin(a)*v,dir,spin:0,trail:[]}; G.phase='fly'; mgSnd.tick(); }
    function msg(m,t){ G.msg=m; G.msgT=t||1.4; }
    G.update=dt=>{ G.t=(G.t||0)+dt; if(G.msgT>0)G.msgT-=dt; if(G.shake>0)G.shake-=dt; G.parts=G.parts.filter(p=>{ p.t-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=600*dt; return p.t>0; });
      if(G.over!==undefined){ G.over-=dt; if(G.over<=0) mgEnd(G.result()); return; } const g=geo(); G.pt+=dt;
      if(G.phase==='aim'){ G.ang=40+35*Math.sin(G.pt*2.4); }
      else if(G.phase==='power'){ G.pow=.5-.5*Math.cos(G.pt*2.3); }
      else if(G.phase==='cpuAim'){ if(G.pt>1.1){ const ideal=42, want=ideal+(Math.random()-.5)*(26-diff*7); const acc=.32+diff*.08; // szansa trafienia
          const hit=Math.random()<acc, fx=g.ox; throwBall(fx,-1,want,G.solvePow(fx,-1,want,hit)); } }
      else if(G.phase==='fly'){ const b=G.ball; b.vx+=G.wind*28*g.sc*dt; b.vy+=980*g.sc*dt; b.x+=b.vx*dt; b.y+=b.vy*dt; b.spin+=dt*12; b.trail.push([b.x,b.y]); if(b.trail.length>18)b.trail.shift();
        const cw=18*g.sc, ch=38*g.sc; if(G.can.up&&b.x>g.cx-cw&&b.x<g.cx+cw&&b.y>g.gy-ch&&b.y<g.gy){ G.can.up=false; G.can.fall=0.001; G.can.dir=Math.sign(b.vx); b.vx*=-.3; mgSnd.can(); G.shake=.25; for(let i=0;i<12;i++) G.parts.push({x:g.cx,y:g.gy-ch*.7,vx:(Math.random()-.5)*260,vy:-Math.random()*300,t:.8,c:'#f2c230'});
          if(G.turn==='me'){ G.phase='drink'; G.pt=0; G.run=0; msg('TRAFIONA! PIJ!',1.4); G.cpuRunT=3.2+Math.random()*.8-diff*.35; } else { G.phase='run'; G.pt=0; G.run=0; G.cpuDrink=0; msg('TRAFILI! BIEGNIJ!',1.4); } }
        if(b.y>g.gy-6*g.sc){ b.y=g.gy-6*g.sc; b.vy*=-.35; b.vx*=.6; mgSnd.thud(); if(Math.abs(b.vy)<60){ if(G.can.up){ msg(G.turn==='me'?'Pudło!':'Spudłowali!',1); G.phase='miss'; G.pt=0; } } }
        if(b.x<-50||b.x>g.W+50){ msg(G.turn==='me'?'Pudło!':'Spudłowali!',1); G.phase='miss'; G.pt=0; } }
      else if(G.phase==='miss'){ if(G.pt>1.1) newTurn(G.turn==='me'?'cpu':'me'); }
      else if(G.phase==='drink'){ // ja piję, rywal biegnie postawić puszkę i wraca
        G.run=Math.min(1,G.pt/G.cpuRunT); if(G.can.fall>0) G.can.fall=Math.min(1,G.can.fall+dt*5); if(G.run>.5&&!G.can.up){ G.can.up=true; G.can.fall=0; mgSnd.can(); }
        if(G.me>=G.need){ G.done=true; G.over=1.2; msg('WYGRANA!',2); mgSnd.cheer(); return; }
        if(G.run>=1){ msg('STOP! Puszka stoi',1.2); G.phase='miss'; G.pt=-.2; } }
      else if(G.phase==='run'){ // rywale piją, ja biegnę (klikanie) postawić puszkę
        G.cpuDrink+=dt*(.12+diff*.04); G.cpu=Math.min(G.need,G.cpuBase+G.cpuDrink); if(G.can.fall>0) G.can.fall=Math.min(1,G.can.fall+dt*5);
        if(G.cpu>=G.need){ G.done=true; G.over=1.2; msg('PRZEGRANA…',2); mgSnd.bad(); return; }
        if(G.run>=.5&&!G.can.up){ G.can.up=true; G.can.fall=0; mgSnd.can(); } if(G.run>=1){ msg('Zdążyłeś!',1.2); G.phase='miss'; G.pt=-.2; } } };
    G.solvePow=(fx,dir,angDeg,hit)=>{ // szukanie siły rzutu CPU (symulacja), z błędem gdy pudło
      const g=geo(); let best=.5,bd=1e9; for(let p=0;p<=1;p+=.02){ const a=angDeg*Math.PI/180, v=(380+p*520)*g.sc; let x=fx+dir*24*g.sc,y=g.gy-80*g.sc,vx=Math.cos(a)*v*dir,vy=-Math.sin(a)*v; for(let i=0;i<400;i++){ const dt=1/120; vx+=G.wind*28*g.sc*dt; vy+=980*g.sc*dt; x+=vx*dt; y+=vy*dt; if(y>g.gy-20*g.sc&&vy>0)break; } const d=Math.abs(x-g.cx); if(d<bd){bd=d;best=p;} }
      return hit?best:Math.min(1,Math.max(0,best+(Math.random()<.5?-1:1)*(.07+Math.random()*.08))); };
    G.cpuBase=0;
    G.press=()=>{ if(G.done||G.over!==undefined)return; const g=geo();
      if(G.phase==='aim'){ G.lockA=G.ang; G.phase='power'; G.pt=0; mgSnd.tick(); }
      else if(G.phase==='power'){ G.lockP=G.pow; throwBall(g.mx,1,G.lockA,G.lockP); }
      else if(G.phase==='drink'){ G.me=Math.min(G.need,G.me+.035+Math.random()*.01); if(Math.random()<.4) mgSnd.key(); }
      else if(G.phase==='run'){ G.run=Math.min(1,G.run+.045-diff*.004); if(Math.random()<.3) mgSnd.tick(); } };
    G.down=()=>G.press(); G.key=k=>{ if(k===' '||k==='Enter'||k==='e') G.press(); };
    // przy zmianie fazy run zapamiętaj stan rywala
    const _up=G.update; G.update=dt=>{ const ph=G.phase; _up(dt); if(ph!=='run'&&G.phase==='run'){ G.cpuBase=G.cpu; G.cpuDrink=0; } };
    G.result=()=>{ const win=G.me>=G.need; const st3=!win?0:G.cpu<.6?3:G.cpu<1.3?2:1; return {win,score:Math.round(G.me*500-G.cpu*200+(win?500:0)),stars:st3,text:win?`Wygrana we flanki! Rywale wypili ${Math.round(G.cpu/G.need*100)}%`:`Rywale byli szybsi. Ty: ${Math.round(G.me/G.need*100)}%`}; };
    G.draw=(c,W,H)=>{ const g=geo(); const sx=G.shake>0?(Math.random()-.5)*8:0; c.save(); c.translate(sx,0);
      let gr=c.createLinearGradient(0,0,0,g.gy); gr.addColorStop(0,'#7fb4e0'); gr.addColorStop(1,'#cfe3ea'); c.fillStyle=gr; c.fillRect(-20,0,W+40,g.gy);
      // drzewa parku
      for(let i=0;i<9;i++){ const tx=(i+.5)*W/9+Math.sin(i*7)*30, th=(120+((i*53)%60))*g.sc; c.fillStyle='#5a4130'; c.fillRect(tx-6*g.sc,g.gy-th*.6,12*g.sc,th*.6); c.fillStyle=['#3f6b30','#4c7a36','#355f2a'][i%3]; c.beginPath(); c.arc(tx,g.gy-th*.7,th*.38,0,7); c.arc(tx-th*.22,g.gy-th*.55,th*.28,0,7); c.arc(tx+th*.24,g.gy-th*.58,th*.3,0,7); c.fill(); }
      gr=c.createLinearGradient(0,g.gy,0,H); gr.addColorStop(0,'#6fa046'); gr.addColorStop(1,'#4f7f33'); c.fillStyle=gr; c.fillRect(-20,g.gy,W+40,H-g.gy);
      c.strokeStyle='rgba(255,255,255,.5)'; c.setLineDash([8,8]); c.lineWidth=3; [g.mx+40*g.sc,g.ox-40*g.sc].forEach(x=>{ c.beginPath(); c.moveTo(x,g.gy+4); c.lineTo(x,H); c.stroke(); }); c.setLineDash([]);
      // ławka
      c.fillStyle='#7a5532'; c.fillRect(W*.3,g.gy-26*g.sc,110*g.sc,8*g.sc); c.fillRect(W*.3,g.gy-48*g.sc,110*g.sc,7*g.sc); c.fillStyle='#333'; c.fillRect(W*.3+6,g.gy-26*g.sc,6,26*g.sc); c.fillRect(W*.3+100*g.sc,g.gy-26*g.sc,6,26*g.sc);
      // puszka na środku
      const cw=12*g.sc, ch=30*g.sc; c.save(); c.translate(g.cx,g.gy); if(!G.can.up) c.rotate((G.can.dir||1)*Math.PI/2*Math.min(1,G.can.fall)); c.fillStyle='#c62a24'; rrect(c,-cw,-ch,cw*2,ch,3); c.fill(); c.fillStyle='#e9e9e9'; c.fillRect(-cw,-ch,cw*2,4*g.sc); c.fillStyle='#f2c230'; c.fillRect(-cw,-ch*.6,cw*2,6*g.sc); c.restore();
      // gracze
      const meRun=G.phase==='run'?G.run:0, cpuRun=G.phase==='drink'?G.run:0;
      const mPos=g.mx+(meRun<.5?meRun*2:2-meRun*2)*(g.cx-g.mx-30*g.sc), oPos=g.ox-(cpuRun<.5?cpuRun*2:2-cpuRun*2)*(g.ox-g.cx-30*g.sc);
      const thrMe=G.phase==='fly'&&G.turn==='me'&&G.pt<.3, thrCpu=G.phase==='fly'&&G.turn==='cpu'&&G.pt<.3;
      person(c,mPos,g.gy,g.sc*1.15,'#1f5fb4','#2c3e66',{walk:G.phase==='run'?G.t*16:0,armR:thrMe?-2.4:G.phase==='drink'?-2.7:undefined});
      person(c,mPos-54*g.sc,g.gy,g.sc*1.0,'#2a72c8','#2c3e66',{hair:'#7a5a2a',armR:G.phase==='drink'?-2.7:undefined});
      person(c,oPos,g.gy,g.sc*1.15,'#c8261e','#333',{walk:G.phase==='drink'?G.t*16:0,armL:thrCpu?2.4:G.phase==='run'?2.7:undefined,hair:'#1a1a1a'});
      person(c,oPos+54*g.sc,g.gy,g.sc*1.0,'#d4442c','#333',{armL:G.phase==='run'?2.7:undefined,hair:'#c9a46a'});
      // celownik i siła
      if((G.phase==='aim'||G.phase==='power')){ const a=(G.phase==='aim'?G.ang:G.lockA)*Math.PI/180, ox=g.mx+24*g.sc, oy=g.gy-80*g.sc, L=120*g.sc; c.strokeStyle='#f2c230'; c.lineWidth=5; c.setLineDash([10,7]); c.beginPath(); c.moveTo(ox,oy); c.lineTo(ox+Math.cos(a)*L,oy-Math.sin(a)*L); c.stroke(); c.setLineDash([]);
        c.strokeStyle='rgba(255,255,255,.35)'; c.lineWidth=3; c.beginPath(); c.arc(ox,oy,L*.6,-75*Math.PI/180,-5*Math.PI/180); c.stroke();
        if(G.phase==='power'){ const v=(380+G.pow*520)*g.sc; let x=g.mx+24*g.sc, y=g.gy-80*g.sc, vx=Math.cos(a)*v, vy=-Math.sin(a)*v; c.fillStyle='rgba(255,255,255,.7)'; for(let i=0;i<14;i++){ const dt=1/60; for(let k=0;k<2;k++){ vx+=G.wind*28*g.sc*dt; vy+=980*g.sc*dt; x+=vx*dt; y+=vy*dt; } if(i%2===0){ c.beginPath(); c.arc(x,y,3,0,7); c.fill(); } } }
        if(G.phase==='power'){ const bw=24*g.sc, bh=150*g.sc, bx0=g.mx-80*g.sc, by0=g.gy-bh-20*g.sc; c.fillStyle='rgba(0,0,0,.5)'; rrect(c,bx0,by0,bw,bh,6); c.fill(); const gg=c.createLinearGradient(0,by0+bh,0,by0); gg.addColorStop(0,'#7fd06b'); gg.addColorStop(.6,'#f2c230'); gg.addColorStop(1,'#e5484d'); c.fillStyle=gg; rrect(c,bx0,by0+bh*(1-G.pow),bw,bh*G.pow,6); c.fill(); } }
      // piłka
      if(G.ball){ const b=G.ball; c.strokeStyle='rgba(255,255,255,.35)'; c.lineWidth=3; c.beginPath(); b.trail.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.stroke(); c.save(); c.translate(b.x,b.y); c.rotate(b.spin); c.fillStyle='#fff'; c.beginPath(); c.arc(0,0,9*g.sc,0,7); c.fill(); c.fillStyle='#222'; c.beginPath(); c.arc(0,0,3.5*g.sc,0,7); c.fill(); c.restore(); }
      G.parts.forEach(p=>{ c.fillStyle=p.c; c.globalAlpha=Math.max(0,p.t); c.fillRect(p.x,p.y,4,4); c.globalAlpha=1; });
      // HUD: puszki obu drużyn, wiatr
      const hw=Math.min(300,W*.32); txt(c,'TWOJA EKIPA',24,62,20,'#8fc2ff','left'); bar(c,24,78,hw,16,G.me/G.need,'#3a86e0'); txt(c,`${Math.floor(G.me)} / ${G.need} puszki`,24+hw/2,86,14,'#fff');
      txt(c,'RYWALE',W-24,62,20,'#ff8a80','right'); bar(c,W-24-hw,78,hw,16,G.cpu/G.need,'#e04a3a'); txt(c,`${Math.floor(G.cpu)} / ${G.need} puszki`,W-24-hw/2,86,14,'#fff');
      const wx=W/2; txt(c,'WIATR',wx,62,16,'#fff'); c.strokeStyle='#fff'; c.lineWidth=4; const wl=G.wind*22; c.beginPath(); c.moveTo(wx-wl,86); c.lineTo(wx+wl,86); c.stroke(); if(Math.abs(wl)>2){ c.beginPath(); c.moveTo(wx+wl,86); c.lineTo(wx+wl-Math.sign(wl)*10,80); c.lineTo(wx+wl-Math.sign(wl)*10,92); c.fillStyle='#fff'; c.fill(); }
      const hint={aim:IS_TOUCH?'Dotknij, by ustawić kąt':'SPACJA - ustaw kąt rzutu',power:IS_TOUCH?'Dotknij, by rzucić':'SPACJA - siła rzutu',drink:IS_TOUCH?'STUKAJ szybko - pij, zanim postawią puszkę!':'WCISKAJ SPACJĘ - pij, zanim postawią puszkę!',run:IS_TOUCH?'STUKAJ szybko - biegnij postawić puszkę!':'WCISKAJ SPACJĘ - biegnij postawić puszkę!',cpuAim:'Rzucają rywale…'}[G.phase];
      if(hint) txt(c,hint,W/2,H-34,Math.min(26,W/26),'#fff');
      if(G.phase==='drink'||G.phase==='run'){ const k=G.phase==='drink'?G.run:G.run; bar(c,W/2-150,H-72,300,10,k,G.phase==='drink'?'#e04a3a':'#3a86e0'); }
      if(G.msgT>0) bigTxt(c,G.msg,W/2,H*.32,Math.min(64,W/12),'#f2c230');
      c.restore(); };
    newTurn('me'); return G; }

  /* ===== 3. RZUTY KARNE ===== */
  function makeKarne(opt){ const lzs=opt.mode==='lzs'; const diff=lzs?2:1; const G={i:0,me:[],cpu:[],turn:'shoot',phase:'aimX',pt:0,ax:0,ay:0,ball:null,keeper:{dx:0,dy:0,t:0},msg:'',msgT:0,done:false,shake:0,crowd:lzs?1:.4,net:0};
    function geo(){ const W=MG.W,H=MG.H; const gw=Math.min(W*.78,H*1.5), gh=gw*.33, gx=W/2-gw/2, gy=H*.2+ (H>W?60:0); return {W,H,gw,gh,gx,gy,by:H*.86}; }
    function score(a){ return a.filter(Boolean).length; }
    function decided(){ const n=Math.max(G.me.length,G.cpu.length), r=Math.max(5,n); const m=score(G.me), c=score(G.cpu), lm=Math.max(0,5-G.me.length), lc=Math.max(0,5-G.cpu.length);
      if(G.me.length<=5&&G.cpu.length<=5){ if(m+lm<c) return 'cpu'; if(c+lc<m) return 'me'; if(G.me.length===5&&G.cpu.length===5&&m!==c) return m>c?'me':'cpu'; return null; }
      if(G.me.length===G.cpu.length&&m!==c) return m>c?'me':'cpu'; return null; }
    function next(){ const d=decided(); if(d){ G.done=true; G.over=1.6; if(d==='me'){ G.msg='WYGRANA!'; mgSnd.cheer(1.4); } else { G.msg='PRZEGRANA'; mgSnd.bad(); } G.msgT=2; return; }
      if(G.turn==='shoot'){ G.turn='save'; G.phase='run'; G.pt=0; G.cpuT={x:(Math.random()*2-1)*(.55+Math.random()*.4),y:Math.random()*.9,miss:Math.random()<(lzs?.1:.16)}; if(G.cpuT.miss){ G.cpuT.x=Math.sign(G.cpuT.x||1)*(1.05+Math.random()*.15); } G.dive=null; }
      else { G.turn='shoot'; G.phase='aimX'; G.pt=0; G.ax=0; G.ay=0; } G.ball=null; G.keeper={dx:0,dy:0,t:0}; G.net=0; }
    function kick(tx,ty){ const g=geo(); G.ball={t:0,dur:.55,tx,ty,sx:g.W/2,sy:g.by}; mgSnd.thud(); }
    G.update=dt=>{ G.t=(G.t||0)+dt; if(G.msgT>0)G.msgT-=dt; if(G.shake>0)G.shake-=dt; if(G.net>0)G.net-=dt; if(G.over!==undefined){ G.over-=dt; if(G.over<=0) mgEnd(G.result()); return; } G.pt+=dt;
      const sp=1.6+diff*.35+G.i*.04;
      if(G.phase==='aimX') G.ax=Math.sin(G.pt*sp)*1.12;
      else if(G.phase==='aimY') G.ay=.54-.54*Math.cos(G.pt*sp*1.1);
      else if(G.phase==='fly'||G.phase==='cfly'){ const b=G.ball; b.t+=dt; const k=Math.min(1,b.t/b.dur);
        // bramkarz
        if(G.phase==='fly'){ if(!G.kd){ const guess=Math.random()<(.2+diff*.07); const side=guess?b.tx:(Math.random()<.35?0:-Math.sign(b.tx||1)*(.35+Math.random()*.55)); G.kd={x:Math.max(-.9,Math.min(.9,side)),y:guess?Math.max(0,Math.min(.8,b.ty+(Math.random()-.5)*.5)):Math.random()*.8,start:.05+Math.random()*.1}; } if(b.t>G.kd.start){ const kk=Math.min(1,(b.t-G.kd.start)/.35); G.keeper.dx=G.kd.x*kk; G.keeper.dy=G.kd.y*kk; } }
        else { if(G.dive){ const kk=Math.min(1,(b.t-G.dive.t)/.3); G.keeper.dx=G.dive.x*kk; G.keeper.dy=G.dive.y*kk; } }
        if(k>=1){ const out=Math.abs(b.tx)>1||b.ty>1.02; const kx=G.keeper.dx, ky=G.keeper.dy; const reach=G.phase==='fly'?.26+diff*.03:.4; const saved=!out&&Math.hypot((b.tx-kx)*1,(b.ty-ky)*.6)<reach;
          const goal=!out&&!saved; if(G.phase==='fly'){ G.me.push(goal); G.msg=goal?'GOL!':out?'OBOK BRAMKI':'OBRONIONY'; } else { G.cpu.push(goal); G.msg=goal?'Gol dla rywali':out?'Pudło rywala!':'OBRONIŁEŚ!'; }
          G.msgT=1.3; if(goal){ G.net=.6; if(G.phase==='fly'){ mgSnd.cheer(); G.shake=.3; } else mgSnd.bad(); } else if(saved||out){ if(G.phase==='cfly') { mgSnd.cheer(); G.shake=.3; } else mgSnd.bad(); }
          G.phase=G.phase==='fly'?'after':'cafter'; G.pt=0; G.kd=null; } }
      else if(G.phase==='after'||G.phase==='cafter'){ if(G.pt>1.4){ if(G.phase==='cafter') G.i++; next(); } }
      else if(G.phase==='run'){ if(G.pt>1.0){ G.phase='cfly'; kick(G.cpuT.x,G.cpuT.y); G.ball.dur=lzs?.5:.6; } } };
    G.press=(x,y)=>{ if(G.done||G.over!==undefined)return; const g=geo();
      if(G.phase==='aimX'){ G.phase='aimY'; G.pt=0; mgSnd.tick(); }
      else if(G.phase==='aimY'){ G.phase='fly'; kick(G.ax,G.ay); }
      else if((G.phase==='cfly'||G.phase==='run')&&!G.dive&&x!==undefined){ const tx=(x-g.W/2)/(g.gw/2), ty=1-(y-g.gy)/g.gh; G.dive={x:Math.max(-1,Math.min(1,tx)),y:Math.max(0,Math.min(1,ty)),t:G.ball?G.ball.t:0}; } };
    G.down=(x,y)=>G.press(x,y);
    G.key=k=>{ if(k===' '||k==='Enter'){ if(G.phase==='aimX'||G.phase==='aimY') return G.press(); }
      if((G.phase==='cfly'||G.phase==='run')&&!G.dive){ const L=['ArrowLeft','a','A'].includes(k), Rr=['ArrowRight','d','D'].includes(k), U=['ArrowUp','w','W'].includes(k), Dn=['ArrowDown','s','S',' '].includes(k);
        if(L||Rr||U||Dn){ G.dive={x:L?-.7:Rr?.7:0,y:U?.75:Dn?.15:.4,t:G.ball?G.ball.t:0}; } } };
    G.result=()=>{ const m=score(G.me), c=score(G.cpu), win=m>c; return {win,score:m*300-c*100+(win?400:0),stars:!win?0:c===0?3:m-c>=2?2:1,text:`${lzs?'LZS Trębaczew':'Twoja drużyna'} ${m} : ${c} ${lzs?'Goście':'Rywale'}`}; };
    G.draw=(c,W,H)=>{ const g=geo(); const sx=G.shake>0?(Math.random()-.5)*8:0; c.save(); c.translate(sx,0);
      // trybuny / niebo
      let gr=c.createLinearGradient(0,0,0,g.gy+g.gh); gr.addColorStop(0,lzs?'#2a3a52':'#86b6dc'); gr.addColorStop(1,lzs?'#46566e':'#cfe0ea'); c.fillStyle=gr; c.fillRect(-20,0,W+40,g.gy+g.gh);
      if(lzs){ for(let r=0;r<5;r++){ c.fillStyle=r%2?'#1f5fb4':'#c8261e'; c.fillRect(-20,g.gy-60+r*14,W+40,12); } for(let i=0;i<90;i++){ const x=(i*97)%W, y=g.gy-58+((i*37)%60); c.fillStyle=['#f2c230','#fff','#1f5fb4','#c8261e','#333'][i%5]; c.beginPath(); c.arc(x,y-(G.msgT>0&&G.msg.startsWith('GOL')?Math.abs(Math.sin(G.t*14+i))*6:0),4,0,7); c.fill(); }
      }
      else { c.fillStyle='#b5503e'; c.fillRect(-20,g.gy+g.gh-6,W+40,10); c.strokeStyle='rgba(70,78,82,.6)'; c.lineWidth=1; for(let x=0;x<W;x+=14){ c.beginPath(); c.moveTo(x,g.gy-80); c.lineTo(x+40,g.gy+g.gh); c.stroke(); } }
      gr=c.createLinearGradient(0,g.gy+g.gh,0,H); gr.addColorStop(0,lzs?'#3f8a3a':'#b5503e'); gr.addColorStop(1,lzs?'#2f6f2c':'#9a4434'); c.fillStyle=gr; c.fillRect(-20,g.gy+g.gh,W+40,H);
      if(lzs) for(let i=0;i<6;i++){ c.fillStyle='rgba(255,255,255,.05)'; c.fillRect(-20,g.gy+g.gh+i*(H-g.gy-g.gh)/6*2,W+40,(H-g.gy-g.gh)/6); }
      c.strokeStyle='rgba(255,255,255,.85)'; c.lineWidth=3; c.beginPath(); c.moveTo(g.gx-g.gw*.4,g.gy+g.gh); c.lineTo(g.gx+g.gw*1.4,g.gy+g.gh); c.stroke(); c.beginPath(); c.moveTo(g.gx-g.gw*.15,g.gy+g.gh); c.lineTo(g.gx-g.gw*.35,H*.72); c.lineTo(g.gx+g.gw*1.35,H*.72); c.lineTo(g.gx+g.gw*1.15,g.gy+g.gh); c.stroke(); c.fillStyle='#fff'; c.beginPath(); c.ellipse(W/2,g.by+6,8,4,0,0,7); c.fill();
      // siatka i bramka
      const nk=G.net>0?Math.sin(G.net*30)*G.net*6:0; c.strokeStyle='rgba(255,255,255,.35)'; c.lineWidth=1; for(let x=0;x<=g.gw;x+=g.gw/24){ c.beginPath(); c.moveTo(g.gx+x,g.gy); c.lineTo(g.gx+x+nk,g.gy+g.gh); c.stroke(); } for(let y=0;y<=g.gh;y+=g.gh/8){ c.beginPath(); c.moveTo(g.gx,g.gy+y); c.lineTo(g.gx+g.gw,g.gy+y+nk*.3); c.stroke(); }
      c.strokeStyle='#fff'; c.lineWidth=Math.max(6,g.gw*.012); c.beginPath(); c.moveTo(g.gx,g.gy+g.gh); c.lineTo(g.gx,g.gy); c.lineTo(g.gx+g.gw,g.gy); c.lineTo(g.gx+g.gw,g.gy+g.gh); c.stroke();
      // bramkarz (rywali gdy strzelasz, Ty gdy bronisz)
      const kx=W/2+G.keeper.dx*g.gw/2, ky=g.gy+g.gh-G.keeper.dy*g.gh*.75; const ks=g.gh/125; const rot=G.keeper.dx*1.1;
      person(c,kx,Math.min(g.gy+g.gh,ky+ (G.keeper.dy>.1?g.gh*.25:0)),ks,G.turn==='save'?'#1f5fb4':'#e8e23a','#222',{rot,armL:2.6+Math.abs(rot)*.2,armR:-2.6-Math.abs(rot)*.2,hair:'#2a1d14'});
      // strzelec przy rzucie rywala
      if(G.turn==='save'&&(G.phase==='run'||G.phase==='cfly'||G.phase==='cafter')){ const k=Math.min(1,G.pt/1.0); person(c,W/2-60+k*40,g.by+20,g.gh/80,'#c8261e','#fff',{walk:G.phase==='run'?G.t*14:0,hair:'#111'}); }
      // celowanie
      if(G.phase==='aimX'||G.phase==='aimY'){ const ax=W/2+G.ax*g.gw/2, ay=g.gy+g.gh-(G.phase==='aimY'?G.ay:.5)*g.gh; c.strokeStyle='#f2c230'; c.lineWidth=4; c.beginPath(); c.arc(ax,ay,18,0,7); c.moveTo(ax-28,ay); c.lineTo(ax+28,ay); c.moveTo(ax,ay-28); c.lineTo(ax,ay+28); c.stroke();
        if(G.phase==='aimX'){ c.fillStyle='rgba(242,194,48,.25)'; c.fillRect(g.gx-g.gw*.06,g.gy+g.gh+12,g.gw*1.12,10); c.fillStyle='#f2c230'; c.fillRect(ax-4,g.gy+g.gh+8,8,18); } else { c.fillStyle='rgba(242,194,48,.25)'; c.fillRect(g.gx+g.gw+14,g.gy,10,g.gh); c.fillStyle='#f2c230'; c.fillRect(g.gx+g.gw+10,ay-4,18,8); } }
      // piłka
      const b=G.ball; let bx=W/2, by=g.by, br=g.gh*.09; if(b){ const k=Math.min(1,b.t/b.dur); const tx=W/2+b.tx*g.gw/2, ty=g.gy+g.gh-b.ty*g.gh; bx=b.sx+(tx-b.sx)*k; by=b.sy+(ty-b.sy)*k-Math.sin(k*Math.PI)*g.gh*.25; br=g.gh*(.09-.05*k); }
      if(!(G.turn==='save'&&G.phase==='run')||true){ c.fillStyle='rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(bx,b?g.gy+g.gh+4+(g.by-g.gy-g.gh)*(1-Math.min(1,b.t/b.dur)):g.by+br*.8,br,br*.35,0,0,7); c.fill(); c.fillStyle='#fff'; c.beginPath(); c.arc(bx,by,br,0,7); c.fill(); c.fillStyle='#222'; for(let i=0;i<5;i++){ const a=i*1.256+G.t*(b?12:0); c.beginPath(); c.arc(bx+Math.cos(a)*br*.55,by+Math.sin(a)*br*.55,br*.22,0,7); c.fill(); } }
      // tablica wyników
      const sbw=Math.min(W*.9,460); c.fillStyle='rgba(18,21,24,.9)'; rrect(c,W/2-sbw/2,10,sbw,52,8); c.fill(); const row=(arr,y,name,col)=>{ txt(c,name,W/2-sbw/2+14,y,17,col,'left'); for(let i=0;i<Math.max(5,arr.length);i++){ const x=W/2-sbw/2+sbw*.5+i*22; c.fillStyle=i<arr.length?(arr[i]?'#7fd06b':'#e5484d'):'rgba(255,255,255,.18)'; c.beginPath(); c.arc(x,y,7,0,7); c.fill(); } };
      row(G.me,24,lzs?'LZS TRĘBACZEW':'TWOJA DRUŻYNA','#8fc2ff'); row(G.cpu,48,lzs?'GOŚCIE':'RYWALE','#ff8a80'); txt(c,`${score(G.me)} : ${score(G.cpu)}`,W/2+sbw/2-14,36,26,'#f2c230','right');
      const hint=G.phase==='aimX'?(IS_TOUCH?'Dotknij - kierunek strzału':'SPACJA - kierunek strzału'):G.phase==='aimY'?(IS_TOUCH?'Dotknij - wysokość i strzał':'SPACJA - wysokość i strzał'):(G.phase==='run'||G.phase==='cfly')&&!G.dive?(IS_TOUCH?'BRONISZ: dotknij miejsca, gdzie rzucisz się w bramce':'BRONISZ: kliknij w bramkę albo strzałki ← ↑ → ↓'):'';
      if(hint) txt(c,hint,W/2,H-28,Math.min(24,W/26),'#fff');
      if(G.msgT>0) bigTxt(c,G.msg,W/2,g.gy+g.gh*.5,Math.min(80,W/9),G.msg.startsWith('GOL')||G.msg.startsWith('OBRONI')||G.msg.startsWith('WYGR')||G.msg.startsWith('Pudło')?'#f2c230':'#fff');
      c.restore(); };
    mgSnd.whistle(); return G; }

  /* ===== 4. MECZ NA ORLIKU (2D z góry): strzel 3 gole w 90 s ===== */
  function makePilka(opt){ const FW=26, FH=38, GW=6; // boisko w metrach, bramka u góry
    const G={t:0,goals:0,need:3,time:90,me:{x:0,y:FH*.3,vx:0,vy:0,dir:-Math.PI/2},ball:{x:0,y:FH*.22,vx:0,vy:0,own:null,sp:0},def:[],gk:{x:0,y:-FH/2+1.2},charge:0,charging:false,msg:'',msgT:0,cool:0,shake:0,joy:null,shootId:null,parts:[]};
    G.def=[{x:-4,y:-4,sp:4.1,col:'#c8261e'},{x:5,y:-9,sp:3.7,col:'#c8261e'}];
    function reset(){ G.me.x=0; G.me.y=FH*.3; G.me.vx=G.me.vy=0; G.ball.x=0; G.ball.y=FH*.22; G.ball.vx=G.ball.vy=0; G.ball.own=null; G.def[0].x=-4; G.def[0].y=-4; G.def[1].x=5; G.def[1].y=-9; G.gk.x=0; G.cool=.8; }
    function msg(m,t){ G.msg=m; G.msgT=t||1.3; }
    function geo(){ const W=MG.W,H=MG.H; const VH=Math.min(FH+3,Math.max(22,(H-150)/((W-32)/FW))); const s=Math.max(4,Math.min((W-32)/FW,(H-150)/VH)); const half=(H-150)/2/s; const cy=Math.max(-FH/2-1.6+half,Math.min(FH/2+1.4-half,(G.camY!==undefined?G.camY:0))); return {W,H,s,ox:W/2,oy:H/2+30-cy*s}; }
    const toS=(x,y)=>{ const g=geo(); return [g.ox+x*g.s,g.oy+y*g.s]; };
    function shoot(){ const b=G.ball; if(b.own!=='me'){ G.charge=0; return; } const p=.35+G.charge*.65, sp=9+p*17; b.own=null; b.vx=Math.cos(G.me.dir)*sp; b.vy=Math.sin(G.me.dir)*sp; b.shot=p; G.cool=.35; mgSnd.thud(); G.charge=0; }
    G.update=dt=>{ G.t+=dt; const cyT=(G.me.y*2+G.ball.y)/3; G.camY=(G.camY===undefined?cyT:G.camY+(cyT-G.camY)*Math.min(1,dt*4)); if(G.msgT>0)G.msgT-=dt; if(G.shake>0)G.shake-=dt; if(G.cool>0)G.cool-=dt; G.parts=G.parts.filter(p=>{ p.t-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; return p.t>0; });
      if(G.over!==undefined){ G.over-=dt; if(G.over<=0) mgEnd(G.result()); return; }
      if(G.resetT>0){ G.resetT-=dt; if(G.resetT<=0) reset(); return; }
      G.time-=dt; if(G.time<=0){ G.time=0; G.done=true; G.over=1.2; msg(G.goals>=G.need?'WYGRANA!':'KONIEC CZASU',2); return; }
      // sterowanie
      let ix=0, iy=0; const K=MG.keys; if(K.has('a')||K.has('arrowleft'))ix-=1; if(K.has('d')||K.has('arrowright'))ix+=1; if(K.has('w')||K.has('arrowup'))iy-=1; if(K.has('s')||K.has('arrowdown'))iy+=1;
      if(G.joy){ ix=G.joy.dx; iy=G.joy.dy; } const il=Math.hypot(ix,iy); if(il>1){ ix/=il; iy/=il; }
      if(G.charging) G.charge=Math.min(1,G.charge+dt*1.1);
      const sp=G.charging?4.2:6.2; const me=G.me; me.vx+=(ix*sp-me.vx)*Math.min(1,dt*10); me.vy+=(iy*sp-me.vy)*Math.min(1,dt*10); me.x=Math.max(-FW/2+.5,Math.min(FW/2-.5,me.x+me.vx*dt)); me.y=Math.max(-FH/2+.5,Math.min(FH/2-.5,me.y+me.vy*dt)); if(Math.hypot(me.vx,me.vy)>.5) me.dir=Math.atan2(me.vy,me.vx); me.walk=(me.walk||0)+Math.hypot(me.vx,me.vy)*dt*2.2;
      // piłka
      const b=G.ball; if(b.own==='me'){ const f=.55+.25*Math.abs(Math.sin(me.walk*.5)); b.x=me.x+Math.cos(me.dir)*f; b.y=me.y+Math.sin(me.dir)*f; b.vx=me.vx; b.vy=me.vy; }
      else { b.x+=b.vx*dt; b.y+=b.vy*dt; const fr=Math.pow(.38,dt); b.vx*=fr; b.vy*=fr;
        if(b.x<-FW/2+.2){ b.x=-FW/2+.2; b.vx=Math.abs(b.vx)*.6; } if(b.x>FW/2-.2){ b.x=FW/2-.2; b.vx=-Math.abs(b.vx)*.6; } if(b.y>FH/2-.2){ b.y=FH/2-.2; b.vy=-Math.abs(b.vy)*.6; }
        if(b.y<-FH/2+.2){ if(Math.abs(b.x)<GW/2){ G.goals++; mgSnd.cheer(1.2); G.shake=.35; msg(G.goals>=G.need?'HAT-TRICK!':'GOL!',1.5); for(let i=0;i<24;i++) G.parts.push({x:b.x,y:-FH/2,vx:(Math.random()-.5)*10,vy:Math.random()*8,t:1,c:i%2?'#f2c230':'#fff'}); if(G.goals>=G.need){ G.done=true; G.over=1.6; } else G.resetT=1.1; b.vx=b.vy=0; b.y=-FH/2-.3; return; }
          b.y=-FH/2+.2; b.vy=Math.abs(b.vy)*.6; }
        if(G.cool<=0&&Math.hypot(b.x-me.x,b.y-me.y)<.75&&Math.hypot(b.vx,b.vy)<9){ b.own='me'; mgSnd.tick(); } }
      // bramkarz
      const gk=G.gk; const tx=Math.max(-GW/2+.5,Math.min(GW/2-.5,b.x*.7)); const gsp=b.y<0?3.4:1.8; gk.x+=Math.max(-gsp*dt,Math.min(gsp*dt,tx-gk.x)); gk.y=-FH/2+1.2;
      if(!b.own&&b.vy<0&&Math.abs(b.y-gk.y)<.7&&Math.abs(b.x-gk.x)<.85+(1-(b.shot||.5))*.5){ const strong=(b.shot||0)>.7&&Math.abs(b.x-gk.x)>.45; if(!strong){ b.vy=Math.abs(b.vy)*.5+3; b.vx=(b.x-gk.x)*6; mgSnd.thud(); msg('OBRONA!',1); } }
      // obrońcy: biegną do piłki, odbierają przy kontakcie
      G.def.forEach((d,i)=>{ const tgx=b.x+(i?1.2:-1.2)*.4, tgy=b.y-(b.own?0.6:0); let dx=tgx-d.x, dy=tgy-d.y; const dl=Math.hypot(dx,dy)||1; const ds=d.sp*(G.time<45?1.1:1)*(dl<3?.85:1); d.x+=dx/dl*ds*dt; d.y+=dy/dl*ds*dt; d.walk=(d.walk||0)+ds*dt*2.2; d.dir=Math.atan2(dy,dx);
        if(dl<.5&&G.cool<=0&&b.own==='me'){ b.own=null; const a=Math.atan2(FH/2-b.y,(Math.random()-.5)*FW); b.vx=Math.cos(a)*10; b.vy=Math.sin(a)*10; G.cool=.7; msg('Odbiór!',.9); mgSnd.bad(); }
        G.def.forEach(o=>{ if(o===d)return; const ox=d.x-o.x, oy=d.y-o.y, ol=Math.hypot(ox,oy); if(ol<1.2&&ol>0){ d.x+=ox/ol*(1.2-ol)*.5; d.y+=oy/ol*(1.2-ol)*.5; } }); }); };
    G.result=()=>{ const win=G.goals>=G.need; const used=90-G.time; return {win,score:G.goals*300+(win?Math.round(G.time*10):0),stars:!win?0:used<45?3:used<70?2:1,text:win?`3 gole w ${Math.round(used)} s`:`Strzelone gole: ${G.goals} z 3`}; };
    G.key=k=>{ if(k===' '){ if(!G.charging){ G.charging=true; G.charge=0; } } };
    G.keyUp=k=>{ if(k===' '&&G.charging){ G.charging=false; shoot(); } };
    G.down=(x,y,id)=>{ const g=geo(); if(x>g.W*.6){ G.shootId=id; G.charging=true; G.charge=0; } else { G.joy={id,x0:x,y0:y,x,y,dx:0,dy:0}; } };
    G.move=(x,y,id)=>{ if(G.joy&&G.joy.id===id){ const dx=x-G.joy.x0, dy=y-G.joy.y0, l=Math.hypot(dx,dy), R0=50; G.joy.x=x; G.joy.y=y; G.joy.dx=l?dx/l*Math.min(l,R0)/R0:0; G.joy.dy=l?dy/l*Math.min(l,R0)/R0:0; } };
    G.up=(x,y,id)=>{ if(G.joy&&G.joy.id===id) G.joy=null; if(G.shootId===id){ G.shootId=null; if(G.charging){ G.charging=false; shoot(); } } };
    function plr(c,x,y,dir,walk,col,num,s){ s=Math.max(s,10)*1.7; const [sx,sy]=toS(x,y); c.save(); c.translate(sx,sy); c.fillStyle='rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(2,3,s*.42,s*.3,0,0,7); c.fill(); c.rotate(dir+Math.PI/2);
      const lg=Math.sin(walk||0)*s*.22; c.fillStyle='#222'; c.beginPath(); c.ellipse(-s*.14,-lg,s*.09,s*.16,0,0,7); c.ellipse(s*.14,lg,s*.09,s*.16,0,0,7); c.fill();
      c.fillStyle=col; c.beginPath(); c.ellipse(0,0,s*.36,s*.22,0,0,7); c.fill(); c.fillStyle='#e6bb98'; c.beginPath(); c.arc(0,0,s*.15,0,7); c.fill(); c.fillStyle='#3a2a1c'; c.beginPath(); c.arc(0,s*.03,s*.13,0,Math.PI); c.fill(); c.restore();
      if(num) txt(c,num,sx,sy-s*.55,Math.max(10,s*.32),'#fff'); }
    G.draw=(c,W,H)=>{ const g=geo(), s=g.s; const sh=G.shake>0?(Math.random()-.5)*8:0; c.save(); c.translate(sh,0);
      c.fillStyle='#2b2f33'; c.fillRect(-20,0,W+40,H);
      const [x0,y0]=toS(-FW/2,-FH/2); c.fillStyle='#b5503e'; c.fillRect(x0-s*1.2,y0-s*1.2,FW*s+s*2.4,FH*s+s*2.4); for(let i=0;i<FH;i+=2){ c.fillStyle=i%4?'rgba(255,255,255,.03)':'rgba(0,0,0,.04)'; c.fillRect(x0,y0+i*s,FW*s,2*s); }
      c.strokeStyle='rgba(255,255,255,.85)'; c.lineWidth=2; c.strokeRect(x0,y0,FW*s,FH*s); c.beginPath(); c.moveTo(x0,y0+FH*s/2); c.lineTo(x0+FW*s,y0+FH*s/2); c.stroke(); c.beginPath(); c.arc(g.ox,g.oy,4*s,0,7); c.stroke();
      [[-1,y0],[1,y0+FH*s]].forEach(([d,yy])=>{ c.strokeRect(g.ox-6*s,d<0?yy:yy-5*s,12*s,5*s); c.beginPath(); c.arc(g.ox,d<0?yy+4*s:yy-4*s,.18*s,0,7); c.fillStyle='#fff'; c.fill(); });
      // ogrodzenie (siatka)
      c.strokeStyle='rgba(200,210,215,.35)'; c.lineWidth=1; for(let i=0;i<=FW+2.4;i+=1){ c.beginPath(); c.moveTo(x0-s*1.2+i*s,y0-s*1.2); c.lineTo(x0-s*1.2+i*s+s,y0-s*1.2-6); c.stroke(); }
      // bramka u góry
      c.fillStyle='rgba(255,255,255,.15)'; c.fillRect(g.ox-GW/2*s,y0-1.4*s,GW*s,1.4*s); c.strokeStyle='#fff'; c.lineWidth=3; c.beginPath(); c.moveTo(g.ox-GW/2*s,y0); c.lineTo(g.ox-GW/2*s,y0-1.4*s); c.lineTo(g.ox+GW/2*s,y0-1.4*s); c.lineTo(g.ox+GW/2*s,y0); c.stroke();
      c.strokeStyle='rgba(255,255,255,.3)'; c.lineWidth=1; for(let i=1;i<GW;i++){ c.beginPath(); c.moveTo(g.ox-GW/2*s+i*s,y0); c.lineTo(g.ox-GW/2*s+i*s,y0-1.4*s); c.stroke(); }
      // zawodnicy
      plr(c,G.gk.x,G.gk.y,Math.PI/2,G.t*4,'#e8e23a','1',s); G.def.forEach((d,i)=>plr(c,d.x,d.y,d.dir||Math.PI/2,d.walk,d.col,String(4+i),s)); plr(c,G.me.x,G.me.y,G.me.dir,G.me.walk,'#1f5fb4','10',s);
      // piłka
      const [bx0,by0]=toS(G.ball.x,G.ball.y); c.fillStyle='rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(bx0+2,by0+2,s*.2,s*.14,0,0,7); c.fill(); c.fillStyle='#fff'; c.beginPath(); c.arc(bx0,by0,Math.max(5,s*.26),0,7); c.fill(); c.fillStyle='#222'; c.beginPath(); c.arc(bx0+Math.cos(G.t*9)*s*.06,by0+Math.sin(G.t*9)*s*.06,Math.max(1.5,s*.06),0,7); c.fill();
      // celownik siły
      if(G.charging&&G.ball.own==='me'){ const [mx,my]=toS(G.me.x,G.me.y); const L=(1.5+G.charge*3)*s; c.strokeStyle=G.charge>.85?'#e5484d':'#f2c230'; c.lineWidth=4; c.setLineDash([8,6]); c.beginPath(); c.moveTo(mx,my); c.lineTo(mx+Math.cos(G.me.dir)*L,my+Math.sin(G.me.dir)*L); c.stroke(); c.setLineDash([]); bar(c,mx-30,my+s*.7,60,7,G.charge,G.charge>.85?'#e5484d':'#f2c230'); }
      G.parts.forEach(p=>{ const [px,py]=toS(p.x,p.y); c.globalAlpha=Math.max(0,p.t); c.fillStyle=p.c; c.fillRect(px,py,4,4); c.globalAlpha=1; });
      // HUD
      c.fillStyle='rgba(18,21,24,.9)'; rrect(c,W/2-150,52,300,44,8); c.fill(); txt(c,`GOLE ${G.goals}/${G.need}`,W/2-70,74,22,'#f2c230'); txt(c,`${Math.floor(G.time/60)}:${String(Math.ceil(G.time%60)%60).padStart(2,'0')}`,W/2+80,74,24,G.time<15?'#ff6b6b':'#fff');
      if(IS_TOUCH){ if(G.joy){ c.strokeStyle='rgba(255,255,255,.4)'; c.lineWidth=3; c.beginPath(); c.arc(G.joy.x0,G.joy.y0,50,0,7); c.stroke(); c.fillStyle='rgba(255,255,255,.5)'; c.beginPath(); c.arc(G.joy.x0+G.joy.dx*50,G.joy.y0+G.joy.dy*50,22,0,7); c.fill(); }
        c.fillStyle=G.charging?'rgba(242,194,48,.6)':'rgba(242,194,48,.28)'; c.beginPath(); c.arc(W-70,H-90,46,0,7); c.fill(); txt(c,'STRZAŁ',W-70,H-90,16,'#fff'); txt(c,'lewa strona - ruch · prawa - przytrzymaj i puść',W/2,H-20,13,'#cfd4d8'); }
      else txt(c,'WASD/strzałki - bieg z piłką · PRZYTRZYMAJ SPACJĘ i puść - strzał (dłużej = mocniej)',W/2,H-20,Math.min(18,W/50),'#cfd4d8');
      if(G.msgT>0) bigTxt(c,G.msg,W/2,H*.4,Math.min(72,W/10),'#f2c230');
      c.restore(); };
    reset(); G.cool=0; mgSnd.whistle(); return G; }

  /* ===== 5. ŻONGLERKA NA STADIONIE LZS: utrzymaj piłkę w powietrzu 60 s ===== */
  function makeZonglerka(opt){ const GOAL=opt.goal||60; const G={t:0,time:0,touches:0,perfect:0,me:{x:0,vx:0,kick:0,walk:0},ball:{x:.1,y:2.2,vx:0,vy:0},charge:0,charging:false,msg:'',msgT:0,started:false,parts:[],best:0,dragX:null};
    const g9=9.81*.85, ZW=7; // szerokość pola gry (m)
    function geo(){ const W=MG.W,H=MG.H; const s=Math.max(8,Math.min(W/ (ZW+3), (H-140)/6.5)); return {W,H,s,gy:H-70,ox:W/2}; }
    const toS=(x,y)=>{ const g=geo(); return [g.ox+x*g.s,g.gy-y*g.s]; };
    function msg(m,t){ G.msg=m; G.msgT=t||1; }
    function kick(force){ const b=G.ball, me=G.me; me.kick=.25; if(force!==undefined) G.charge=force; const dx=b.x-me.x, inZone=!G.started||(Math.abs(dx)<.55&&b.y>.12&&b.y<1.35&&b.vy<=1.5);
      if(!inZone){ G.buf={p:G.charge,t:.24}; G.charge=0; return; }
      const p=G.charge; b.vy=3.2+p*7.2; b.vx=-dx*2.2+(Math.random()-.5)*.6*(1-p*.5)+me.vx*.15; G.touches++; G.started=true; mgSnd.thud();
      const apex=b.y+b.vy*b.vy/(2*g9); if(apex>2.0&&apex<3.6){ G.perfect++; msg('IDEALNIE!',.6); for(let i=0;i<8;i++) G.parts.push({x:b.x,y:b.y,vx:(Math.random()-.5)*3,vy:Math.random()*2,t:.6,c:'#f2c230'}); } else if(apex>5.2) msg('Za mocno!',.6); else if(apex<1.6) msg('Za słabo!',.6);
      G.charge=0; }
    G.update=dt=>{ G.t+=dt; if(G.msgT>0)G.msgT-=dt; if(G.me.kick>0)G.me.kick-=dt; G.parts=G.parts.filter(p=>{ p.t-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy-=6*dt; return p.t>0; });
      if(G.over!==undefined){ G.over-=dt; if(G.over<=0) mgEnd(G.result()); return; }
      if(G.started) G.time+=dt; if(G.time>=GOAL){ G.time=GOAL; G.done=true; G.over=1.4; msg('60 SEKUND! BRAWO!',2); mgSnd.cheer(1.5); return; }
      if(G.charging) G.charge=Math.min(1,G.charge+dt*.95);
      if(G.buf){ G.buf.t-=dt; const bb=G.ball; if(Math.abs(bb.x-G.me.x)<.55&&bb.y>.12&&bb.y<1.35&&bb.vy<=1.5){ const p=G.buf.p; G.buf=null; kick(p); } else if(G.buf.t<=0) G.buf=null; }
      const K=MG.keys; let ix=0; if(K.has('a')||K.has('arrowleft'))ix-=1; if(K.has('d')||K.has('arrowright'))ix+=1; const me=G.me;
      if(G.dragX!==null){ const tx=Math.max(-ZW/2,Math.min(ZW/2,G.dragX)); ix=Math.max(-1,Math.min(1,(tx-me.x)*2.2)); }
      me.vx+=(ix*4.2-me.vx)*Math.min(1,dt*12); me.x=Math.max(-ZW/2,Math.min(ZW/2,me.x+me.vx*dt)); me.walk+=Math.abs(me.vx)*dt*3;
      const b=G.ball; if(!G.started){ b.y=.45+Math.abs(Math.sin(G.t*2.2))*.06; b.x=me.x+.08; b.vx=0; b.vy=0; return; }
      b.vy-=g9*dt; b.x+=b.vx*dt; b.y+=b.vy*dt; if(b.x<-ZW/2-.6){ b.x=-ZW/2-.6; b.vx=Math.abs(b.vx)*.5; } if(b.x>ZW/2+.6){ b.x=ZW/2+.6; b.vx=-Math.abs(b.vx)*.5; }
      if(b.y<=.11){ b.y=.11; G.done=true; G.over=1.4; msg('Piłka spadła!',1.6); mgSnd.bad(); } };
    G.result=()=>{ const win=G.time>=GOAL; const ratio=G.touches?G.perfect/G.touches:0; return {win,score:Math.round(G.time*20+G.perfect*15),stars:!win?0:ratio>.55?3:ratio>.3?2:1,text:win?`${GOAL} s w powietrzu · ${G.touches} odbić, ${G.perfect} idealnych`:`Wytrzymałeś ${G.time.toFixed(1)} s · ${G.touches} odbić`}; };
    G.key=k=>{ if(k===' '&&!G.charging){ G.charging=true; G.charge=0; } };
    G.keyUp=k=>{ if(k===' '&&G.charging){ G.charging=false; kick(); } };
    G.down=(x,y,id)=>{ const g=geo(); G.dragX=(x-g.ox)/g.s; G.charging=true; G.charge=0; G.pid=id; };
    G.move=(x,y,id)=>{ if(G.pid===id){ const g=geo(); G.dragX=(x-g.ox)/g.s; } };
    G.up=(x,y,id)=>{ if(G.pid===id){ G.dragX=null; if(G.charging){ G.charging=false; kick(); } } };
    G.draw=(c,W,H)=>{ const g=geo(), s=g.s;
      // trybuny z kibicami (biało-czerwone szaliki)
      let gr=c.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#8db8dd'); gr.addColorStop(.35,'#c9dbe6'); c.fillStyle=gr; c.fillRect(0,0,W,H);
      const st0=H*.12, st1=g.gy-6.2*s>st0+60?g.gy-6.2*s:st0+60; c.fillStyle='#8f8b84'; c.fillRect(0,st0,W,st1-st0+30); c.fillStyle='#5c666c'; c.fillRect(0,st0-14,W,14);
      for(let r=0;r<4;r++){ const y=st0+12+r*(st1-st0)/4; c.fillStyle=r%2?'#1f5fb4':'#c8261e'; c.fillRect(0,y+18,W,8); for(let i=0;i<W/26;i++){ const x=i*26+(r%2)*13+6; if(((i*7+r*3)%5)===0)continue; const bob=Math.sin(G.t*4+i+r)*3*(G.msgT>0?2:1); c.fillStyle=['#c8261e','#f2f2f2','#2b2f36','#1f5fb4'][(i+r)%4]; c.fillRect(x-6,y+2+bob,12,16); c.fillStyle='#e6bb98'; c.beginPath(); c.arc(x,y-3+bob,5,0,7); c.fill();
        if((i+r)%2===0){ for(let k=0;k<6;k++){ c.fillStyle=k%2?'#fff':'#c8261e'; c.fillRect(x-15+k*5,y-13+bob*1.4,5,5); } } } }
      c.fillStyle='#c8261e'; c.fillRect(W/2-150,st1-4,300,26); txt(c,'LZS TRĘBACZEW',W/2,st1+9,18,'#fff');
      // murawa
      gr=c.createLinearGradient(0,st1+30,0,H); gr.addColorStop(0,'#4f8f3f'); gr.addColorStop(1,'#2f6f2c'); c.fillStyle=gr; c.fillRect(0,st1+30,W,H-st1-30); for(let i=0;i<10;i++){ c.fillStyle='rgba(255,255,255,.04)'; c.fillRect(i*W/5,st1+30,W/10,H); }
      c.fillStyle='rgba(255,255,255,.75)'; c.fillRect(0,g.gy+1,W,3);
      // strefa idealnej wysokości
      const [,yA]=toS(0,3.6), [,yB]=toS(0,2.0); c.fillStyle='rgba(127,208,107,.12)'; c.fillRect(g.ox-ZW/2*s-30,yA,ZW*s+60,yB-yA); c.strokeStyle='rgba(127,208,107,.5)'; c.setLineDash([6,6]); c.beginPath(); c.moveTo(g.ox-ZW/2*s-30,yA); c.lineTo(g.ox+ZW/2*s+30,yA); c.moveTo(g.ox-ZW/2*s-30,yB); c.lineTo(g.ox+ZW/2*s+30,yB); c.stroke(); c.setLineDash([]); txt(c,'idealna wysokość',g.ox+ZW/2*s+28,yA-10,13,'#bfe8b0','right');
      // zawodnik (bok) - noga kopiąca
      const me=G.me, [px,py]=toS(me.x,0); const k=me.kick>0?Math.sin((.25-me.kick)/.25*Math.PI):0, ch=G.charging?G.charge:0; c.save(); c.translate(px,py); const sc=s/100;
      c.fillStyle='rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0,0,22*sc*1.8,6*sc*1.8,0,0,7); c.fill(); c.scale(sc*1.8,sc*1.8);
      const lw=Math.sin(me.walk)*.4; c.strokeStyle='#111'; c.lineCap='round'; c.lineWidth=9; c.beginPath(); c.moveTo(-5,-36); c.lineTo(-5+Math.sin(lw)*12,-2); c.stroke();
      const kick=-.3-ch*.6+k*1.9; c.strokeStyle='#fff'; c.beginPath(); c.moveTo(5,-36); c.lineTo(5+Math.sin(kick)*30,-36+Math.cos(kick)*30); c.stroke(); c.fillStyle='#111'; c.beginPath(); c.arc(5+Math.sin(kick)*32,-36+Math.cos(kick)*32,5,0,7); c.fill();
      c.fillStyle='#c8261e'; rrect(c,-13,-76,26,42,7); c.fill(); c.fillStyle='#fff'; c.fillRect(-13,-60,26,6); txt(c,'10',0,-46,14,'#fff');
      c.strokeStyle='#e6bb98'; c.lineWidth=7; c.beginPath(); c.moveTo(-13,-70); c.lineTo(-30,-50+Math.sin(G.t*6)*4); c.moveTo(13,-70); c.lineTo(30,-52-Math.sin(G.t*6)*4); c.stroke();
      c.fillStyle='#e6bb98'; c.beginPath(); c.arc(0,-90,12,0,7); c.fill(); c.fillStyle='#1a1a1a'; c.beginPath(); c.arc(0,-94,12,Math.PI,0); c.fill(); c.restore();
      // piłka
      const b=G.ball, [bx0,by0]=toS(b.x,b.y), br=Math.max(7,.11*s*1.6); c.fillStyle='rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(bx0,g.gy+2,br*(1-Math.min(.7,b.y/8)),br*.3,0,0,7); c.fill();
      c.save(); c.translate(bx0,by0); c.rotate(G.t*(G.started?6:1)); c.fillStyle='#fff'; c.beginPath(); c.arc(0,0,br,0,7); c.fill(); c.fillStyle='#222'; for(let i=0;i<5;i++){ const a=i*1.256; c.beginPath(); c.arc(Math.cos(a)*br*.55,Math.sin(a)*br*.55,br*.22,0,7); c.fill(); } c.restore();
      // strefa kopnięcia (podpowiedź)
      const inZ=Math.abs(b.x-me.x)<.55&&b.y>.12&&b.y<1.35; if(G.started&&inZ){ c.strokeStyle='rgba(242,194,48,.8)'; c.lineWidth=3; c.beginPath(); c.arc(bx0,by0,br+6,0,7); c.stroke(); }
      // siła
      if(G.charging){ bar(c,px-50,py+18,100,9,G.charge,G.charge>.8?'#e5484d':G.charge>.35?'#f2c230':'#7fd06b'); }
      G.parts.forEach(p=>{ const [x,y]=toS(p.x,p.y); c.globalAlpha=Math.max(0,p.t*1.6); c.fillStyle=p.c; c.fillRect(x,y,4,4); c.globalAlpha=1; });
      // HUD: czas
      c.fillStyle='rgba(18,21,24,.9)'; rrect(c,W/2-170,52,340,48,8); c.fill(); bar(c,W/2-155,84,310,8,G.time/GOAL,'#7fd06b'); txt(c,`${G.time.toFixed(1)} / ${GOAL} s`,W/2-70,68,20,'#fff'); txt(c,`odbicia ${G.touches} · idealne ${G.perfect}`,W/2+80,68,15,'#f2c230');
      if(!G.started) txt(c,IS_TOUCH?'Przytrzymaj palec i puść, by podbić piłkę · przesuwaj palcem, by iść':'PRZYTRZYMAJ SPACJĘ i puść, by podbić (dłużej = mocniej) · A/D lub ←/→ - ruch',W/2,H*.5,Math.min(20,W/44),'#fff');
      else txt(c,IS_TOUCH?'trzymaj palec = siła · puść = kopnięcie · przesuwaj = ruch':'spacja: trzymaj = siła, puść = kopnięcie · A/D - ruch',W/2,H-22,Math.min(16,W/50),'#e8ece9');
      if(G.msgT>0) bigTxt(c,G.msg,W/2,H*.32,Math.min(54,W/13),G.msg.startsWith('IDEAL')||G.msg.startsWith('60')?'#f2c230':'#fff'); };
    mgSnd.whistle(); return G; }
  /* ===== minigry pracy w Cementowni Warta ===== */
  const CEM_COL=['#c9c4b6','#d6d2c4','#b8b3a4'];
  function makePalety(opt){ const G={t:0,bags:[],spawn:.4,stack:0,target:20,miss:0,maxMiss:4,msg:'',msgT:0,score:0,fly:[],last:0}; const geo=(W,H)=>({by:H*.60,zx:W*.40,zw:Math.min(80,W*.12),px:W*.78});
    G.press=(W,H)=>{ if(G.over!==undefined)return; const L=geo(W,H); let b=null,bd=1e9; G.bags.forEach(q=>{ if(q.done)return; const d=Math.abs(q.x-L.zx); if(d<bd){ bd=d; b=q; } });
      if(b&&bd<=L.zw/2+14){ b.done=true; G.stack++; const pr=1-bd/(L.zw/2+14); const pts=Math.round(10+pr*10); G.score+=pts; G.fly.push({x:b.x,y:L.by-20,t:0,tx:L.px,ty:H*.62-Math.floor((G.stack-1)/4)*18-8,col:b.col}); G.msg=pr>.7?'IDEALNIE':'OK'; G.msgT=.5; mgSnd.thud(); if(G.stack>=G.target){ G.over=1.1; G.win=true; mgSnd.ok(); } }
      else { G.miss++; G.msg='PUDŁO'; G.msgT=.6; mgSnd.bad(); if(G.miss>=G.maxMiss){ G.over=1.1; G.win=false; } } };
    G.update=dt=>{ G.t+=dt; if(G.msgT>0)G.msgT-=dt; if(G.over!==undefined){ G.over-=dt; if(G.over<=0) mgEnd(G.result()); return; }
      const sp=150+G.stack*7; G.spawn-=dt; if(G.spawn<=0){ G.spawn=Math.max(.5,1.15-G.stack*.025)+Math.random()*.25; G.bags.push({x:-40,col:pick(CEM_COL),done:false}); }
      const W=MG.W,H=MG.H,L=geo(W,H); G.bags.forEach(q=>{ q.x+=sp*dt; if(!q.done&&!q.passed&&q.x>L.zx+L.zw/2+18){ q.passed=true; G.miss++; G.msg='ZJECHAŁ'; G.msgT=.6; mgSnd.bad(); if(G.miss>=G.maxMiss&&G.over===undefined){ G.over=1.1; G.win=false; } } }); G.bags=G.bags.filter(q=>q.x<W+60&&!q.done);
      G.fly.forEach(f=>{ f.t+=dt*2.2; }); G.fly=G.fly.filter(f=>f.t<1); };
    G.down=()=>G.press(MG.W,MG.H); G.key=k=>{ if(k===' '||k==='Enter') G.press(MG.W,MG.H); };
    G.result=()=>({win:!!G.win,score:G.score,stars:G.win?(G.miss<=0?3:G.miss<=2?2:1):0,text:G.win?`Paleta gotowa: ${G.stack} worków, pudła: ${G.miss}.`:`Za dużo pudeł. Ułożone worki: ${G.stack} z ${G.target}.`});
    G.draw=(c,W,H)=>{ const L=geo(W,H); const gr=c.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#2b3138'); gr.addColorStop(1,'#14171b'); c.fillStyle=gr; c.fillRect(0,0,W,H);
      c.fillStyle='#3a4048'; c.fillRect(0,L.by,W,22); c.fillStyle='#252a30'; c.fillRect(0,L.by+22,W,10); for(let x=-((G.t*150)%40);x<W;x+=40){ c.fillStyle='#2f353c'; c.fillRect(x,L.by+4,18,4); }
      c.fillStyle='rgba(127,208,107,.22)'; c.fillRect(L.zx-L.zw/2,L.by-80,L.zw,100); c.strokeStyle='#7fd06b'; c.lineWidth=2; c.strokeRect(L.zx-L.zw/2,L.by-80,L.zw,100);
      G.bags.forEach(q=>{ c.fillStyle=q.col; rrect(c,q.x-26,L.by-34,52,36,5); c.fill(); c.fillStyle='#c8302a'; c.fillRect(q.x-20,L.by-24,40,8); txt(c,'WARTA',q.x,L.by-20,9,'#fff'); });
      c.fillStyle='#6b5a3a'; c.fillRect(L.px-70,H*.62,140,12); c.fillStyle='#4a3d28'; c.fillRect(L.px-60,H*.62+12,120,8);
      for(let i=0;i<G.stack;i++){ const row=Math.floor(i/4), col=i%4; c.fillStyle=CEM_COL[(i)%3]; rrect(c,L.px-62+col*31+(row%2)*8,H*.62-(row+1)*18+1,29,17,3); c.fill(); }
      G.fly.forEach(f=>{ const k=f.t; const x=f.x+(f.tx-f.x)*k, y=f.y+(f.ty-f.y)*k-Math.sin(k*Math.PI)*70; c.fillStyle=f.col; rrect(c,x-20,y-12,40,24,4); c.fill(); });
      c.fillStyle='rgba(18,21,24,.9)'; rrect(c,W/2-190,52,380,48,8); c.fill(); txt(c,`worki ${G.stack}/${G.target}`,W/2-95,68,20,'#fff'); txt(c,`pudła ${G.miss}/${G.maxMiss} · ${G.score} pkt`,W/2+85,68,17,'#f2c230'); bar(c,W/2-175,86,350,6,G.stack/G.target,'#7fd06b');
      if(G.msgT>0) bigTxt(c,G.msg,W/2,H*.3,Math.min(54,W/13),G.msg==='IDEALNIE'?'#f2c230':G.msg==='OK'?'#fff':'#e5484d');
      txt(c,IS_TOUCH?'Stuknij, gdy worek jest w zielonej strefie':'SPACJA lub klik, gdy worek jest w zielonej strefie',W/2,H-24,Math.min(18,W/44),'#e8ece9'); }; return G; }
  function makeBhp(opt){ const G={t:0,time:45,workers:[],spawn:.3,caught:0,strikes:0,need:8,msg:'',msgT:0,score:0,done:false}; const lanes=H=>[H*.52,H*.66,H*.80];
    G.update=dt=>{ G.t+=dt; if(G.msgT>0)G.msgT-=dt; if(G.over!==undefined){ G.over-=dt; if(G.over<=0) mgEnd(G.result()); return; } G.time-=dt; if(G.time<=0){ G.over=.6; G.win=G.caught>=G.need&&G.strikes<=3; return; }
      G.spawn-=dt; if(G.spawn<=0){ G.spawn=.55+Math.random()*.6; const dir=Math.random()<.5?1:-1, ln=Math.floor(Math.random()*3); const bad=Math.random()<.45; G.workers.push({x:dir>0?-40:MG.W+40,ln,dir,v:70+Math.random()*80,bad,helm:!bad||Math.random()<.0,vest:Math.random()<.8,shirt:pick(['#f08a1c','#f0c020','#3a6fa8','#e8e4dc']),ph:Math.random()*6,gone:false}); }
      G.workers.forEach(w=>{ w.x+=w.dir*w.v*dt; w.ph+=dt*9; }); G.workers=G.workers.filter(w=>w.x>-80&&w.x<MG.W+80&&!w.gone); if(G.caught>=G.need&&G.over===undefined){ G.over=.8; G.win=true; mgSnd.ok(); } if(G.strikes>3&&G.over===undefined){ G.over=.8; G.win=false; } };
    G.down=(mx,my)=>{ if(G.over!==undefined)return; const ls=lanes(MG.H); let hit=null; G.workers.forEach(w=>{ const y=ls[w.ln]; if(Math.abs(mx-w.x)<26&&my>y-125&&my<y+6) hit=w; }); if(!hit)return;
      if(hit.bad){ hit.gone=true; G.caught++; G.score+=25; G.msg='ZGŁOSZONY'; mgSnd.ok(); } else { G.strikes++; G.score=Math.max(0,G.score-15); G.msg='MIAŁ KASK!'; mgSnd.bad(); } G.msgT=.6; };
    G.result=()=>({win:!!G.win,score:G.score,stars:G.win?(G.strikes===0?3:G.strikes<=1?2:1):0,text:G.win?`Kontrola zakończona: ${G.caught} wykroczeń, pomyłki: ${G.strikes}.`:`Za mało zgłoszeń (${G.caught}/${G.need}) lub za dużo pomyłek (${G.strikes}).`});
    G.draw=(c,W,H)=>{ const ls=lanes(H); const gr=c.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#8fa6bf'); gr.addColorStop(.45,'#cdd3d6'); gr.addColorStop(.46,'#6f7478'); gr.addColorStop(1,'#4a4e52'); c.fillStyle=gr; c.fillRect(0,0,W,H);
      c.fillStyle='#b9b4a6'; c.fillRect(0,H*.2,W,H*.26); c.fillStyle='rgba(60,70,80,.6)'; for(let x=20;x<W;x+=90) c.fillRect(x,H*.27,50,H*.1); c.fillStyle='#a39a86'; c.fillRect(0,H*.46,W,6);
      [...G.workers].sort((a,b)=>a.ln-b.ln).forEach(w=>{ const y=ls[w.ln]; const s=1.25+w.ln*.12; person(c,w.x,y,s,w.vest?w.shirt:'#5a606a','#2c3e66',{walk:w.ph,hair:'#2a1d14'}); if(!w.bad){ c.fillStyle='#f6f6f1'; c.beginPath(); c.arc(w.x,y-88*s,12.5*s,Math.PI,0); c.fill(); c.fillRect(w.x-14*s,y-88*s-1,28*s,3*s); c.fillStyle='#d8d8d0'; c.fillRect(w.x-1.5*s,y-100*s,3*s,12*s); } });
      c.fillStyle='rgba(18,21,24,.9)'; rrect(c,W/2-210,52,420,48,8); c.fill(); txt(c,`zgłoszeni ${G.caught}/${G.need}`,W/2-120,68,20,'#fff'); txt(c,`pomyłki ${G.strikes}/3`,W/2,68,18,G.strikes?'#e5484d':'#e8ece9'); txt(c,`${Math.max(0,G.time).toFixed(0)} s`,W/2+150,68,22,'#f2c230'); bar(c,W/2-195,86,390,6,Math.max(0,G.time)/45,'#7fd06b');
      if(G.msgT>0) bigTxt(c,G.msg,W/2,H*.38,Math.min(48,W/14),G.msg==='ZGŁOSZONY'?'#7fd06b':'#e5484d');
      txt(c,IS_TOUCH?'Stuknij pracownika BEZ białego kasku':'Kliknij pracownika BEZ białego kasku (jednocześnie nie wolno zgłaszać tych w kaskach)',W/2,H-22,Math.min(17,W/44),'#1b1e21'); }; return G; }
  function makeCysterna(opt){ const G={t:0,round:0,fill:0,hold:false,phase:'wait',pt:0,res:[],msg:'',msgT:0,score:0,flow:1}; const TG=24, MAXF=30, tol=[1.4,1,.65];
    G.start=()=>{ G.fill=0; G.hold=false; G.phase='wait'; G.pt=0; };
    G.begin=()=>{ if(G.phase==='wait'&&G.over===undefined){ G.phase='fill'; G.hold=true; } }; G.end=()=>{ if(G.phase==='fill'){ G.hold=false; G.phase='done'; G.pt=0; const d=Math.abs(G.fill-TG); const ok=G.fill<=MAXF&&d<=tol[G.round]; const pts=ok?Math.round(60-d*30):0; G.score+=Math.max(0,pts); G.res.push({ok,fill:G.fill}); G.msg=ok?(d<.3?'IDEALNIE':'W NORMIE'):(G.fill>TG?'ZA DUŻO':'ZA MAŁO'); G.msgT=1.4; ok?mgSnd.ok():mgSnd.bad(); } };
    G.update=dt=>{ G.t+=dt; if(G.msgT>0)G.msgT-=dt; if(G.over!==undefined){ G.over-=dt; if(G.over<=0) mgEnd(G.result()); return; }
      if(G.phase==='fill'){ G.flow=.75+.55*Math.abs(Math.sin(G.t*1.7+G.round))+.2*Math.sin(G.t*4.3); G.fill+=dt*G.flow*5.2; if(G.fill>=MAXF+2){ G.fill=MAXF+2; G.end(); } }
      if(G.phase==='done'){ G.pt+=dt; if(G.pt>1.6){ G.round++; if(G.round>=3){ G.over=.2; G.win=G.res.filter(r=>r.ok).length>=2; } else G.start(); } } };
    G.down=()=>G.begin(); G.up=()=>G.end(); G.key=k=>{ if(k===' ') G.begin(); }; G.keyUp=k=>{ if(k===' ') G.end(); };
    G.result=()=>{ const n=G.res.filter(r=>r.ok).length; return {win:!!G.win,score:G.score,stars:G.win?(n===3?3:2):0,text:G.win?`Załadowano poprawnie ${n} z 3 cystern.`:`Tylko ${n} z 3 cystern z poprawnym tonażem.`}; };
    G.draw=(c,W,H)=>{ const gr=c.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#aab8c6'); gr.addColorStop(1,'#5d6368'); c.fillStyle=gr; c.fillRect(0,0,W,H); c.fillStyle='#4a4e52'; c.fillRect(0,H*.72,W,H*.28);
      const gx=W*.5, gy=H*.55, gw=Math.min(300,W*.7); c.fillStyle='#d9dde0'; rrect(c,gx-gw/2,gy-70,gw,100,40); c.fill(); c.fillStyle='#c8302a'; c.fillRect(gx-gw/2+30,gy-20,gw-60,10); txt(c,'WARTA CEMENT',gx,gy-42,22,'#1f4fa3'); c.fillStyle='#222'; c.beginPath(); c.arc(gx-gw*.32,gy+32,22,0,7); c.arc(gx+gw*.32,gy+32,22,0,7); c.fill();
      const bx=W/2-30, by=H*.24, bw=60, bh=H*.27; c.fillStyle='rgba(0,0,0,.5)'; rrect(c,bx,by,bw,bh,10); c.fill(); const yf=v=>by+bh-bh*Math.min(1,v/32); c.fillStyle='rgba(127,208,107,.35)'; c.fillRect(bx,yf(TG+tol[Math.min(2,G.round)]),bw,yf(TG-tol[Math.min(2,G.round)])-yf(TG+tol[Math.min(2,G.round)])); c.fillStyle=G.fill>TG+tol[Math.min(2,G.round)]?'#e5484d':'#7fb4e8'; c.fillRect(bx+6,yf(G.fill),bw-12,by+bh-yf(G.fill)); c.strokeStyle='#f2c230'; c.lineWidth=3; c.beginPath(); c.moveTo(bx-10,yf(TG)); c.lineTo(bx+bw+10,yf(TG)); c.stroke(); txt(c,`${TG} t`,bx+bw+36,yf(TG),16,'#f2c230'); txt(c,`${G.fill.toFixed(1)} t`,bx+bw/2,by-14,20,'#fff');
      c.fillStyle='rgba(18,21,24,.9)'; rrect(c,W/2-170,52,340,40,8); c.fill(); txt(c,`cysterna ${Math.min(3,G.round+1)}/3 · ${G.score} pkt`,W/2,72,19,'#fff'); G.res.forEach((r,i)=>txt(c,r.ok?'✔':'✘',W/2-40+i*40,H*.93-30,26,r.ok?'#7fd06b':'#e5484d'));
      if(G.msgT>0) bigTxt(c,G.msg,W/2,H*.5,Math.min(54,W/13),G.msg==='ZA DUŻO'||G.msg==='ZA MAŁO'?'#e5484d':'#f2c230');
      txt(c,G.phase==='wait'?(IS_TOUCH?'Przytrzymaj palec, by nasypywać cement':'PRZYTRZYMAJ SPACJĘ - cement leci do cysterny. Puść przy 24 t'):'Puść, gdy wskaźnik jest na żółtej linii (24 t)',W/2,H-24,Math.min(18,W/44),'#1b1e21'); }; return G; }
  function makeLab(opt){ const G={t:0,seq:[],pos:0,phase:'show',si:0,lit:-1,lt:0,round:0,need:7,score:0,msg:'',msgT:0,pt:0}; const COL=['#e5484d','#3f8fd8','#47b04b','#f2c230'], NAM=['Surowiec','Klinkier','Cement','Popiół'];
    G.next=()=>{ G.seq.push(Math.floor(Math.random()*4)); G.round=G.seq.length; G.phase='show'; G.si=0; G.pt=0; G.lit=-1; G.pos=0; };
    G.next(); const rects=(W,H)=>{ const s=Math.min(150,W*.2,H*.22); return [0,1,2,3].map(i=>({x:W/2-s*2.15+i*s*1.1+ (i>1?0:0),y:H*.55-s/2,s})); };
    G.pick=i=>{ if(G.phase!=='in'||G.over!==undefined)return; G.lit=i; G.lt=.25; if(G.seq[G.pos]===i){ G.pos++; mgSnd.tick(); if(G.pos>=G.seq.length){ G.score+=20+G.round*5; if(G.round>=G.need){ G.over=.9; G.win=true; mgSnd.ok(); } else { G.phase='pause'; G.pt=0; G.msg='DOBRZE'; G.msgT=.7; mgSnd.ok(); } } } else { G.over=1; G.win=false; G.msg='BŁĄD PRÓBKI'; G.msgT=1; mgSnd.bad(); } };
    G.update=dt=>{ G.t+=dt; if(G.msgT>0)G.msgT-=dt; if(G.lt>0){ G.lt-=dt; if(G.lt<=0)G.lit=-1; } if(G.over!==undefined){ G.over-=dt; if(G.over<=0) mgEnd(G.result()); return; }
      G.pt+=dt; if(G.phase==='pause'&&G.pt>.9) G.next(); else if(G.phase==='show'){ if(G.pt>.8){ const k=Math.floor((G.pt-.8)/.7); if(k<G.seq.length){ const ph=(G.pt-.8)%.7; G.lit=ph<.45?G.seq[k]:-1; } else { G.lit=-1; G.phase='in'; G.pos=0; } } } };
    G.down=(mx,my)=>{ const R=rects(MG.W,MG.H); R.forEach((r,i)=>{ if(mx>=r.x&&mx<=r.x+r.s&&my>=r.y&&my<=r.y+r.s) G.pick(i); }); }; G.key=k=>{ const i='1234'.indexOf(k); if(i>=0) G.pick(i); else { const j='asdf'.indexOf(k.toLowerCase()); if(j>=0&&k.length===1) G.pick(j); } };
    G.result=()=>({win:!!G.win,score:G.score,stars:G.win?3:G.round>=5?2:G.round>=3?1:0,text:G.win?'Wszystkie próbki w normie. Laboratorium zadowolone.':`Pomyłka w serii nr ${G.round}. Wymagane: ${G.need} serii.`});
    G.draw=(c,W,H)=>{ const gr=c.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#e9eef0'); gr.addColorStop(1,'#a9b3b8'); c.fillStyle=gr; c.fillRect(0,0,W,H); c.fillStyle='#8a949a'; c.fillRect(0,H*.7,W,H*.3); const R=rects(W,H);
      R.forEach((r,i)=>{ const on=G.lit===i; c.fillStyle=on?COL[i]:'rgba(0,0,0,.18)'; rrect(c,r.x,r.y,r.s,r.s,16); c.fill(); c.strokeStyle=COL[i]; c.lineWidth=4; c.stroke(); if(on){ c.shadowColor=COL[i]; c.shadowBlur=30; c.fillStyle=COL[i]; rrect(c,r.x,r.y,r.s,r.s,16); c.fill(); c.shadowBlur=0; } txt(c,NAM[i],r.x+r.s/2,r.y+r.s+16,Math.min(16,r.s/7),'#1b1e21'); txt(c,String(i+1),r.x+r.s/2,r.y+r.s/2,Math.min(44,r.s/3),on?'#fff':'rgba(0,0,0,.35)'); });
      c.fillStyle='rgba(18,21,24,.9)'; rrect(c,W/2-170,52,340,40,8); c.fill(); txt(c,`seria ${G.round}/${G.need} · ${G.score} pkt`,W/2,72,19,'#fff');
      if(G.msgT>0) bigTxt(c,G.msg,W/2,H*.3,Math.min(48,W/14),G.msg==='DOBRZE'?'#47b04b':'#e5484d');
      txt(c,G.phase==='show'?'Zapamiętaj kolejność pobierania próbek…':G.phase==='in'?(IS_TOUCH?'Powtórz kolejność - stukaj naczynia':'Powtórz kolejność: klikaj naczynia lub klawisze 1-4'):'',W/2,H*.2,Math.min(22,W/36),'#1b1e21'); }; return G; }
  /* wspólna cysterna: gospodarz (zapraszający) ładuje - dozuje strumień, partner stoi na wadze i zatwierdza ładunek (jego wynik liczy gospodarz) */
  function makeCysterna2(opt){ const host=!!opt.host; const G={t:0,rxT:0,go:false,round:0,fill:0,hold:false,phase:0,pt:0,res:'',msg:'',msgT:0,score:0,flow:1,sendT:0,rdyT:0,kaT:0,seq:0,gcode:0}; const TG=24, MAXF=30, tol=[2.2,1.6,1.1], NM=['','IDEALNIE','W NORMIE','ZA DUŻO','ZA MAŁO'];
    const send=(m,d)=>coSend(opt.peer,'job',Object.assign({m},d||{}));
    const sendSt=()=>send('st',{f:Math.round(G.fill*100)/100,ph:G.phase,h:G.hold?1:0,r:G.round,s:G.score,q:G.res,g:G.gcode});
    function fin(){ if(G.phase!==1) return; G.phase=2; G.pt=0; G.hold=false; const d=Math.abs(G.fill-TG); const ok=G.fill<=MAXF&&d<=tol[G.round]; G.score+=ok?Math.max(0,Math.round(60-d*25)):0; G.res+=ok?'1':'0'; const ty=ok?(d<.4?1:2):(G.fill>TG?3:4); G.gcode=(++G.seq)*10+ty; G.msg=NM[ty]; G.msgT=1.4; ok?mgSnd.ok():mgSnd.bad(); sendSt(); }
    G.net=(m,d)=>{ G.rxT=G.t;
      if(host){ if(m==='rdy'&&!G.go){ G.go=true; send('go'); } else if(m==='stop'&&G.phase===1) fin(); }
      else if(m==='go') G.go=true;
      else if(m==='st'){ G.fill=+d.f||0; G.phase=d.ph|0; G.hold=!!d.h; G.round=d.r|0; G.score=d.s|0; G.res=String(d.q||''); const g=d.g|0; if(g>G.gcode){ G.gcode=g; G.msg=NM[g%10]||''; G.msgT=1.4; (g%10<3)?mgSnd.ok():mgSnd.bad(); } }
      else if(m==='fin'){ G.win=!!d.w; G.score=d.s|0; G.res=String(d.q||G.res); G.over=1.2; } };
    G.up=()=>{ if(host) G.hold=false; }; G.keyUp=k=>{ if(k===' ') G.up(); };
    G.down=()=>{ if(!G.go||G.over!==undefined) return; if(host){ if(G.phase===0) G.phase=1; if(G.phase===1) G.hold=true; } else if(G.phase===1) send('stop'); }; G.key=k=>{ if(k===' ') G.down(); };
    G.update=dt=>{ G.t+=dt; if(G.msgT>0) G.msgT-=dt;
      if(!G.go){ if(!host){ G.rdyT-=dt; if(G.rdyT<=0){ G.rdyT=1; send('rdy'); } } if(G.t>25&&G.over===undefined){ G.abort=true; G.win=false; G.over=.1; } return; }
      if(G.over!==undefined){ G.over-=dt; if(G.over<=0) mgEnd(G.result()); return; }
      G.kaT-=dt; if(G.kaT<=0){ G.kaT=2; if(!host) send('ka'); }
      if(G.t-G.rxT>12){ G.abort=true; G.win=false; G.over=.2; if(host) send('fin',{w:0,s:G.score,q:G.res}); return; }
      if(!host) return;
      if(G.phase===1){ G.flow=.75+.55*Math.abs(Math.sin(G.t*1.7+G.round))+.2*Math.sin(G.t*4.3); if(G.hold) G.fill+=dt*G.flow*5.2; if(G.fill>=MAXF+2){ G.fill=MAXF+2; fin(); } }
      if(G.phase===2){ G.pt+=dt; if(G.pt>1.8){ G.round++; if(G.round>=3){ G.win=G.res.split('').filter(c=>c==='1').length>=2; G.over=1.2; send('fin',{w:G.win?1:0,s:G.score,q:G.res}); return; } G.phase=0; G.fill=0; G.hold=false; sendSt(); } }
      G.sendT-=dt; if(G.sendT<=0){ G.sendT=.125; sendSt(); } };
    G.result=()=>{ const n=G.res.split('').filter(c=>c==='1').length; if(G.abort) return {win:false,score:G.score,stars:0,text:'Partner opuścił zmianę - praca przerwana.'}; return {win:!!G.win,score:G.score,stars:G.win?(n===3?3:2):0,text:G.win?`Wspólnie załadowaliście poprawnie ${n} z 3 cystern. Wypłata dla obojga!`:`Tylko ${n} z 3 cystern z poprawnym tonażem.`}; };
    G.draw=(c,W,H)=>{ const gr=c.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#aab8c6'); gr.addColorStop(1,'#5d6368'); c.fillStyle=gr; c.fillRect(0,0,W,H); c.fillStyle='#4a4e52'; c.fillRect(0,H*.72,W,H*.28);
      const gx=W*.5, gy=H*.55, gw=Math.min(300,W*.7); c.fillStyle='#d9dde0'; rrect(c,gx-gw/2,gy-70,gw,100,40); c.fill(); c.fillStyle='#c8302a'; c.fillRect(gx-gw/2+30,gy-20,gw-60,10); txt(c,'WARTA CEMENT',gx,gy-42,22,'#1f4fa3'); c.fillStyle='#222'; c.beginPath(); c.arc(gx-gw*.32,gy+32,22,0,7); c.arc(gx+gw*.32,gy+32,22,0,7); c.fill();
      const bx=W/2-30, by=H*.24, bw=60, bh=H*.27; c.fillStyle='rgba(0,0,0,.5)'; rrect(c,bx,by,bw,bh,10); c.fill(); const yf=v=>by+bh-bh*Math.min(1,v/32); c.fillStyle='#7fb4e8'; c.fillRect(bx+6,yf(G.fill),bw-12,by+bh-yf(G.fill));
      if(!host){ const tt=tol[Math.min(2,G.round)]; c.fillStyle='rgba(127,208,107,.35)'; c.fillRect(bx,yf(TG+tt),bw,yf(TG-tt)-yf(TG+tt)); c.strokeStyle='#f2c230'; c.lineWidth=3; c.beginPath(); c.moveTo(bx-10,yf(TG)); c.lineTo(bx+bw+10,yf(TG)); c.stroke(); txt(c,`${TG} t`,bx+bw+36,yf(TG),16,'#f2c230'); c.fillStyle='rgba(18,21,24,.9)'; rrect(c,W/2-70,H*.52,140,34,8); c.fill(); txt(c,`${G.fill.toFixed(1)} t`,W/2,H*.52+17,22,'#7fd06b'); }
      else { txt(c,G.hold?'strumień leci':'strumień zamknięty',bx+bw/2,by-14,15,'#1b1e21'); }
      c.fillStyle='rgba(18,21,24,.9)'; rrect(c,W/2-190,52,380,40,8); c.fill(); txt(c,`cysterna ${Math.min(3,G.round+1)}/3 · ${G.score} pkt · ${host?'ŁADOWACZ':'WAGA'}`,W/2,72,19,'#fff'); G.res.split('').forEach((r,i)=>txt(c,r==='1'?'✔':'✘',W/2-40+i*40,H*.93-30,26,r==='1'?'#7fd06b':'#e5484d'));
      if(G.msgT>0) bigTxt(c,G.msg,W/2,H*.5,Math.min(54,W/13),G.msg==='ZA DUŻO'||G.msg==='ZA MAŁO'?'#e5484d':'#f2c230');
      const tip=!G.go?'Czekam na partnera…':host?(IS_TOUCH?'Przytrzymaj palec - cement leci. Puść, żeby dozować; partner zatwierdza wagę':'PRZYTRZYMAJ SPACJĘ - cement leci. Puść, by dozować; partner na wadze zatwierdzi ładunek'):(IS_TOUCH?'Stuknij, gdy waga pokaże 24 t - zatwierdzasz ładunek':'Naciśnij SPACJĘ, gdy waga pokaże 24 t - zatwierdzasz ładunek (jest opóźnienie łącza!)'); txt(c,tip,W/2,H-24,Math.min(18,W/44),'#1b1e21'); }; return G; }
  /* wspólna brygada paletyzacji: worki jadą do strefy w tym samym rytmie, obaj muszą nacisnąć we właściwym momencie (ocena jest względem własnego zegara każdego gracza) */
  function makePalety2(opt){ const host=!!opt.host; const G={t:0,rxT:0,go:false,bags:[],nb:0,score:0,sync:0,miss:0,msg:'',msgT:0,rdyT:0,kaT:0,hist:'',t0:0,last:''}; const NB=16, TR=1.5, INT=1.05, WIN=.3;
    const send=(m,d)=>coSend(opt.peer,'job',Object.assign({m},d||{}));
    G.net=(m,d)=>{ G.rxT=G.t;
      if(m==='rdy'&&host&&!G.go){ G.go=true; G.t0=G.t+1.2; send('go'); }
      else if(m==='go') G.go=true;
      else if(m==='b'&&!host){ G.bags.push({k:d.k|0,a:G.t+TR-.0,pd:undefined,j:false}); }
      else if(m==='p'&&host){ const b=G.bags.find(x=>x.k===(d.k|0)); if(b) b.gd=+d.d/1000; }
      else if(m==='r'&&!host){ G.sync=d.y|0; G.miss=d.x|0; G.score=d.s|0; G.hist=String(d.h||''); const c=d.c|0; G.msg=c===2?'W RYTMIE':c===1?'TYLKO JEDEN':'PUDŁO'; G.msgT=.9; c===2?mgSnd.ok():mgSnd.bad(); }
      else if(m==='fin'&&!host){ G.win=!!d.w; G.score=d.s|0; G.sync=d.y|0; G.over=1.2; } };
    function press(){ if(!G.go||G.over!==undefined) return; let b=null,bd=.55; G.bags.forEach(x=>{ if(x.pd!==undefined||x.j) return; const dd=Math.abs(G.t-x.a); if(dd<bd){ bd=dd; b=x; } }); if(!b){ G.msg='ZA WCZEŚNIE'; G.msgT=.5; mgSnd.bad(); return; } b.pd=G.t-b.a; if(Math.abs(b.pd)<=WIN){ mgSnd.tick(); } else { mgSnd.bad(); } if(!host) send('p',{k:b.k,d:Math.round(b.pd*1000)}); }
    G.down=press; G.key=k=>{ if(k===' ') press(); };
    G.update=dt=>{ G.t+=dt; if(G.msgT>0) G.msgT-=dt;
      if(!G.go){ if(!host){ G.rdyT-=dt; if(G.rdyT<=0){ G.rdyT=1; send('rdy'); } } if(G.t>25&&G.over===undefined){ G.abort=true; G.win=false; G.over=.1; } return; }
      if(G.over!==undefined){ G.over-=dt; if(G.over<=0) mgEnd(G.result()); return; }
      G.kaT-=dt; if(G.kaT<=0){ G.kaT=2; if(!host) send('ka'); }
      if(G.t-G.rxT>12){ G.abort=true; G.win=false; G.over=.2; if(host) send('fin',{w:0,s:G.score,y:G.sync}); return; }
      if(!host) { G.bags=G.bags.filter(b=>G.t<b.a+1.2); return; }
      if(G.nb<NB&&G.t>=G.t0+G.nb*INT){ const k=G.nb++; G.bags.push({k,a:G.t0+k*INT+TR,pd:undefined,gd:undefined,j:false}); send('b',{k}); }
      G.bags.forEach(b=>{ if(!b.j&&G.t>b.a+1.25){ b.j=true; const h=b.pd!==undefined&&Math.abs(b.pd)<=WIN, g=b.gd!==undefined&&Math.abs(b.gd)<=WIN; const c=(h?1:0)+(g?1:0); if(c===2){ G.sync++; G.score+=30; } else G.miss++; G.hist+=c; G.msg=c===2?'W RYTMIE':c===1?'TYLKO JEDEN':'PUDŁO'; G.msgT=.9; c===2?mgSnd.ok():mgSnd.bad(); send('r',{c,y:G.sync,x:G.miss,s:G.score,h:G.hist}); G.judged=(G.judged|0)+1; } });
      G.bags=G.bags.filter(b=>!b.j||G.t<b.a+1.4);
      if((G.judged|0)>=NB){ G.win=G.sync>=10; G.over=1.2; send('fin',{w:G.win?1:0,s:G.score,y:G.sync}); } };
    G.result=()=>{ if(G.abort) return {win:false,score:G.score,stars:0,text:'Partner opuścił zmianę - praca przerwana.'}; return {win:!!G.win,score:G.score,stars:G.win?(G.sync>=14?3:G.sync>=12?2:1):0,text:G.win?`W rytmie ${G.sync} z ${NB} worków. Wspólna wypłata!`:`W rytmie tylko ${G.sync} z ${NB} worków (potrzeba 10).`}; };
    G.draw=(c,W,H)=>{ const gr=c.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#c9d3da'); gr.addColorStop(1,'#7c868c'); c.fillStyle=gr; c.fillRect(0,0,W,H);
      const by=H*.6, zx=W*.62, zw=Math.min(90,W*.14); c.fillStyle='#3a3f44'; c.fillRect(0,by,W,26); c.fillStyle='rgba(127,208,107,.35)'; c.fillRect(zx-zw/2,by-60,zw,100); c.strokeStyle='#7fd06b'; c.lineWidth=3; c.strokeRect(zx-zw/2,by-60,zw,100);
      const sp=(zx-30)/TR; G.bags.forEach(b=>{ const x=zx-(b.a-G.t)*sp; if(x<-40||x>W+40) return; const col=b.pd===undefined?'#e9e0cc':Math.abs(b.pd)<=WIN?'#7fd06b':'#e5484d'; c.fillStyle=col; rrect(c,x-26,by-34,52,32,6); c.fill(); c.strokeStyle='#8a7f66'; c.lineWidth=2; c.stroke(); txt(c,'WARTA',x,by-18,10,'#1f4fa3'); });
      c.fillStyle='rgba(18,21,24,.9)'; rrect(c,W/2-190,52,380,40,8); c.fill(); txt(c,`w rytmie ${G.sync} · pudła ${G.miss} · ${G.score} pkt`,W/2,72,19,'#fff');
      G.hist.split('').forEach((h,i)=>txt(c,h==='2'?'✔':h==='1'?'½':'✘',W/2-8*NB*1.6+i*26+20,H*.82,22,h==='2'?'#7fd06b':h==='1'?'#f2c230':'#e5484d'));
      if(G.msgT>0) bigTxt(c,G.msg,W/2,H*.32,Math.min(46,W/14),G.msg==='W RYTMIE'?'#47b04b':'#e5484d');
      txt(c,!G.go?'Czekam na partnera…':(IS_TOUCH?'Stuknij, gdy worek jest w zielonej strefie - razem z partnerem':'SPACJA lub klik, gdy worek jest w zielonej strefie - razem z partnerem'),W/2,H-24,Math.min(18,W/44),'#1b1e21'); }; return G; }

  /* ===== POJEDYNEK PRZY REMIZIE: kto pierwszy naciśnie po sygnale (wodne pistolety) ===== */
  function makePojedynek(opt){ const OPN=['Zdzisiek z remizy','Bogdan spod sklepu','Pan Staszek, prezes OSP']; const OPC=[['#c8392b','#3a3a40'],['#7d3fb5','#2c2c33'],['#d49a1c','#2b2b2b']];
    const G={t:0,round:0,pw:0,ow:0,phase:'intro',pt:0,msg:'',sub:'',over:undefined,score:0,taken:0,time:60,hold:{},ptr:{},btn:[],flash:0,shake:0,lost:0}; const AT={punch:{w:.07,a:.1,r:.18,dmg:7,reach:.105,stun:.28,push:.02},kick:{w:.14,a:.12,r:.28,dmg:12,reach:.135,stun:.4,push:.045}};
    const mk=(x,face)=>({x,face,hp:100,st:'idle',e:0,hitDone:false,fl:0,walk:0,at:null}); let me,op,ai; const diff=()=>[.5,.72,.92][Math.min(2,G.round-1)];
    const nr=()=>{ G.round++; me=mk(.28,1); op=mk(.72,-1); ai={t:.6,mode:'idle',blk:0,ret:0,dir:0}; G.phase='intro'; G.pt=0; G.time=60; G.msg='ROUND '+G.round; G.sub=''; }; nr();
    const busy=f=>f.st==='punch'||f.st==='kick'||f.st==='hurt'||f.st==='ko';
    const start=(f,k)=>{ if(busy(f)||G.phase!=='fight') return; f.st=k; f.e=0; f.hitDone=false; f.at=AT[k]; mgSnd.tick&&mgSnd.tick(); };
    const hit=(a,d,x)=>{ const k=a.at; if(d.hp<=0) return; const front=(d.x-a.x)*a.face>0, dist=Math.abs(d.x-a.x); if(!front||dist>k.reach) return; a.hitDone=true;
      if(d.st==='block'){ d.hp=Math.max(0,d.hp-k.dmg*.15); d.x+=a.face*k.push*.5; G.flash=.08; mgSnd.tick&&mgSnd.tick(); return; }
      d.hp=Math.max(0,d.hp-k.dmg); d.st='hurt'; d.e=0; d.stun=k.stun; d.x+=a.face*k.push; G.flash=.12; G.shake=.18; if(d===me) G.taken+=k.dmg; mgSnd.bad&&(d===me?mgSnd.bad():mgSnd.ok()); };
    const ko=w=>{ G.phase='ko'; G.pt=0; (w==='me'?op:me).st='ko'; G.winner=w; if(w==='me'){ G.pw++; G.score+=Math.round(op.hp*0+me.hp*8)+200; } else { G.ow++; G.lost++; } const done=G.pw>=2||G.ow>=2; G.msg=done&&w==='me'?'FINISH HIM!':'K.O.'; G.sub=''; };
    const upF=(f,o,dt,pl)=>{ f.walk+=dt*8; f.face=o.x>=f.x?1:-1; if(f.fl>0) f.fl-=dt;
      if(f.st==='punch'||f.st==='kick'){ f.e+=dt; const k=f.at; if(!f.hitDone&&f.e>=k.w&&f.e<=k.w+k.a) hit(f,o); if(f.e>=k.w+k.a+k.r){ f.st='idle'; f.at=null; } }
      else if(f.st==='hurt'){ f.e+=dt; if(f.e>=f.stun) f.st='idle'; } };
    G.update=dt=>{ G.t+=dt; G.pt+=dt; if(G.flash>0)G.flash-=dt; if(G.shake>0)G.shake-=dt; if(G.over!==undefined){ G.over-=dt; if(G.over<=0) mgEnd(G.result()); return; }
      if(G.phase==='intro'){ if(G.pt>1.1&&G.msg!=='FIGHT!'){ G.msg='FIGHT!'; mgSnd.whistle&&mgSnd.whistle(); } if(G.pt>1.9){ G.phase='fight'; G.msg=''; } upF(me,op,dt); upF(op,me,dt); return; }
      if(G.phase==='fight'){ G.time-=dt; const K=MG.keys; const L=K.has('a')||K.has('arrowleft')||G.hold.l, R=K.has('d')||K.has('arrowright')||G.hold.r, B=K.has('s')||K.has('arrowdown')||K.has('shift')||G.hold.b;
        if(!busy(me)){ me.st=B?'block':(L||R?'walk':'idle'); const mv=(R?1:0)-(L?1:0); if(!B&&mv) me.x+=mv*.3*dt; }
        // przeciwnik
        if(!busy(op)){ ai.t-=dt; const d=Math.abs(op.x-me.x), df=diff(), toMe=Math.sign(me.x-op.x);
          if(ai.ret>0){ ai.ret-=dt; op.x-=toMe*.26*dt; op.st='walk'; }
          else if(ai.blk>0){ ai.blk-=dt; op.st='block'; }
          else { op.st=ai.mode==='walk'?'walk':'idle'; if(ai.mode==='walk'){ op.x+=toMe*ai.dir*.26*dt; }
            if((me.st==='punch'||me.st==='kick')&&d<.2&&Math.random()<dt*df*3.2){ ai.blk=.35+Math.random()*.3; }
            if(ai.t<=0){ ai.t=.25+Math.random()*(.55-.2*df); if(d>.125){ ai.mode='walk'; ai.dir=1; } else { ai.mode='idle'; if(Math.random()<.6+.3*df) start(op,Math.random()<.62?'punch':'kick'); else if(Math.random()<.4){ ai.ret=.35; } } } } }
        upF(me,op,dt); upF(op,me,dt); me.x=clamp(me.x,.07,.93); op.x=clamp(op.x,.07,.93); const gap=.085; if(Math.abs(me.x-op.x)<gap){ const m=(me.x+op.x)/2, s=Math.sign(op.x-me.x)||1; me.x=m-s*gap/2; op.x=m+s*gap/2; }
        if(op.hp<=0) ko('me'); else if(me.hp<=0) ko('op'); else if(G.time<=0){ if(me.hp>=op.hp) ko('me'); else ko('op'); G.msg='CZAS!'; } return; }
      if(G.phase==='ko'){ upF(me,op,dt); upF(op,me,dt); const need=G.msg==='FINISH HIM!'?2.6:1.9; if(G.msg==='FINISH HIM!'&&G.pt>1.4&&G.sub==='') G.sub=G.taken<1?'FLAWLESS VICTORY':'ZWYCIĘSTWO'; if(G.pt>need){ if(G.pw>=2||G.ow>=2){ G.over=.2; G.win=G.pw>=2; } else nr(); } } };
    const dn=(x,y)=>{ const b=G.btn.find(q=>x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h); return b&&b.k; };
    G.down=(x,y,id)=>{ if(G.over!==undefined) return; const k=dn(x,y); if(!k) return; G.ptr[id]=k; if(k==='p') start(me,'punch'); else if(k==='k') start(me,'kick'); else G.hold[k]=true; };
    G.up=(x,y,id)=>{ const k=G.ptr[id]; delete G.ptr[id]; if(k&&(k==='l'||k==='r'||k==='b')) G.hold[k]=false; };
    G.key=k=>{ k=String(k).toLowerCase(); if(k==='j'||k===' '||k==='f') start(me,'punch'); else if(k==='k'||k==='l'||k==='e') start(me,'kick'); };
    G.result=()=>({win:!!G.win,score:Math.max(0,G.score),stars:!G.win?0:G.lost===0?3:2,text:G.win?`Pokonałeś: ${OPN[0]} ${G.pw}:${G.ow}${G.taken<1?' - FLAWLESS VICTORY!':'.'}`:`Przegrałeś ${G.pw}:${G.ow}. Blokuj (S) i kontruj ciosami (J / K).`});
    const limb=(c,x0,y0,x1,y1,w,col)=>{ c.strokeStyle=col; c.lineWidth=w; c.lineCap='round'; c.beginPath(); c.moveTo(x0,y0); c.lineTo(x1,y1); c.stroke(); };
    const fighter=(c,px,py,s,f,col,pants,skin,band)=>{ c.save(); c.translate(px,py); c.scale(f.face*s,s); const idle=f.st==='idle', bob=Math.sin(G.t*5+px)*2*(idle?1:0), sw=f.st==='walk'?Math.sin(f.walk)*14:0; const prog=f.at?Math.min(1,f.e/(f.at.w+f.at.a)):0, ext=f.at?Math.sin(Math.min(1,prog)*Math.PI*.5+ (f.e>f.at.w+f.at.a?0:0)):0, rec=f.at&&f.e>f.at.w+f.at.a?1-(f.e-f.at.w-f.at.a)/f.at.r:1; const E=f.at?Math.max(0,Math.min(1,f.e/f.at.w>1?rec:f.e/f.at.w)):0;
      if(f.st==='ko'){ c.rotate(-Math.PI/2*.92); c.translate(0,-18); }
      if(f.st==='hurt'){ c.rotate(-.16); }
      const hipY=-62+bob, shY=-118+bob*1.4; // nogi
      let fx=14+sw, fy=0, bxx=-14-sw, kneeF=[12,-30];
      if(f.st==='kick'){ fx=28+62*E; fy=-74*E; kneeF=[22+16*E,-40-12*E]; }
      c.save(); limb(c,0,hipY,bxx,0,15,pants); limb(c,0,hipY,kneeF[0],kneeF[1],15,pants); limb(c,kneeF[0],kneeF[1],fx,fy,14,pants); c.restore();
      c.fillStyle='#1b1b1b'; c.beginPath(); c.ellipse(bxx+3,-2,9,4,0,0,7); c.fill(); c.beginPath(); c.ellipse(fx+3,fy-2,9,4,0,0,7); c.fill();
      // tułów
      c.fillStyle=col; rrect(c,-15,shY,30,hipY-shY+8,8); c.fill(); c.fillStyle='rgba(0,0,0,.28)'; c.fillRect(-15,hipY-6,30,7);
      // ręce
      let hF=[34,-116+bob], eF=[18,-100+bob], hB=[22,-110+bob], eB=[6,-98+bob];
      if(f.st==='punch'){ hF=[34+66*E,-120]; eF=[20+34*E,-118]; } else if(f.st==='block'){ hF=[24,-132]; eF=[16,-104]; hB=[30,-120]; eB=[12,-100]; } else if(f.st==='hurt'||f.st==='ko'){ hF=[-6,-80]; eF=[8,-96]; hB=[-12,-82]; eB=[0,-98]; }
      limb(c,0,shY+8,eB[0],eB[1],11,skin); limb(c,eB[0],eB[1],hB[0],hB[1],10,skin); limb(c,0,shY+8,eF[0],eF[1],12,skin); limb(c,eF[0],eF[1],hF[0],hF[1],11,skin);
      c.fillStyle=skin; c.beginPath(); c.arc(hF[0],hF[1],7.5,0,7); c.fill(); c.beginPath(); c.arc(hB[0],hB[1],6.5,0,7); c.fill();
      // głowa
      const hx=f.st==='hurt'?-6:3, hy=shY-18; c.fillStyle=skin; c.beginPath(); c.arc(hx,hy,14,0,7); c.fill(); if(band){ c.fillStyle=band; c.fillRect(hx-14,hy-7,28,6); c.fillRect(hx-20,hy-5,8,3); } c.fillStyle='#1a1a1a'; c.fillRect(hx+4,hy-1,6,2.5);
      c.restore(); };
    const bar=(c,x,y,w,h,hp,right,name)=>{ c.fillStyle='#14161a'; rrect(c,x-3,y-3,w+6,h+6,4); c.fill(); const gr=c.createLinearGradient(x,0,x+w,0); gr.addColorStop(0,'#e5b21c'); gr.addColorStop(1,'#e5484d'); c.fillStyle='#5a1414'; c.fillRect(x,y,w,h); c.fillStyle=gr; const fw=w*Math.max(0,hp)/100; if(right) c.fillRect(x+w-fw,y,fw,h); else c.fillRect(x,y,fw,h); txt(c,name,right?x+w:x,y+h+14,Math.max(13,h*.8),'#f1e6c8',right?'right':'left'); };
    G.draw=(c,W,H)=>{ const sx=G.shake>0?(Math.random()-.5)*8:0; c.save(); c.translate(sx,0);
      const gr=c.createLinearGradient(0,0,0,H*.7); gr.addColorStop(0,'#1a0a24'); gr.addColorStop(.6,'#4b1830'); gr.addColorStop(1,'#a2362a'); c.fillStyle=gr; c.fillRect(-10,0,W+20,H*.7);
      c.fillStyle='#f0b04a'; c.beginPath(); c.arc(W*.5,H*.34,H*.17,0,7); c.fill(); c.fillStyle='rgba(30,8,20,.5)'; c.beginPath(); c.arc(W*.5+H*.03,H*.34,H*.17,0,7); c.fill();
      c.fillStyle='#120712'; c.beginPath(); c.moveTo(0,H*.62); [[.08,.5],[.14,.56],[.22,.42],[.3,.55],[.4,.48],[.5,.58],[.6,.46],[.72,.55],[.82,.44],[.9,.54],[1,.5]].forEach(([a,b])=>c.lineTo(W*a,H*b)); c.lineTo(W,H*.64); c.lineTo(0,H*.64); c.fill();
      [.12,.88].forEach(a=>{ c.fillStyle='#7a1a1a'; c.fillRect(W*a-W*.035,H*.12,W*.07,H*.3); c.fillStyle='#d4a53a'; c.fillRect(W*a-W*.035,H*.12,W*.07,4); txt(c,'TRĘBACZEW',W*a,H*.27,Math.min(16,W/50),'#d4a53a'); });
      const fy=H*.64; c.fillStyle='#2b2230'; c.fillRect(-10,fy,W+20,H*.36); c.strokeStyle='rgba(255,255,255,.07)'; c.lineWidth=1; for(let i=0;i<14;i++){ c.beginPath(); c.moveTo(W*.5,fy); c.lineTo(W*(i/13),H); c.stroke(); } for(let i=1;i<6;i++){ c.beginPath(); c.moveTo(0,fy+(H-fy)*i*i/36); c.lineTo(W,fy+(H-fy)*i*i/36); c.stroke(); }
      const sc=Math.min(1.9,(H*.62)/190), by=H*.88, mx=me.x*W, ox=op.x*W; const sk1='#e8b894', sk2='#d9a27c';
      c.fillStyle='rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(mx,by+4,36*sc,7*sc,0,0,7); c.fill(); c.beginPath(); c.ellipse(ox,by+4,36*sc,7*sc,0,0,7); c.fill();
      const oc=OPC[Math.min(2,G.round-1)]; fighter(c,mx,by,sc,me,'#2f6fd0','#2c3e66',sk1,'#ffffff'); fighter(c,ox,by,sc,op,oc[0],oc[1],sk2,null);
      if(G.flash>0){ c.fillStyle=`rgba(255,255,255,${G.flash*3})`; c.fillRect(-10,0,W+20,H); } c.restore();
      // HUD
      const bw=W*.36, bh=Math.max(14,H*.045), by0=H*.06; bar(c,W*.07,by0,bw,bh,me.hp,false,'TY'); bar(c,W-W*.07-bw,by0,bw,bh,op.hp,true,OPN[0].toUpperCase());
      c.fillStyle='#14161a'; rrect(c,W/2-26,by0-6,52,bh+16,6); c.fill(); txt(c,String(Math.max(0,Math.ceil(G.time))),W/2,by0+bh/2+2,bh*1.3,'#f2c230');
      for(let i=0;i<2;i++){ c.fillStyle=i<G.pw?'#e5b21c':'rgba(255,255,255,.18)'; c.beginPath(); c.arc(W*.07+10+i*22,by0+bh+34,7,0,7); c.fill(); c.fillStyle=i<G.ow?'#e5484d':'rgba(255,255,255,.18)'; c.beginPath(); c.arc(W-W*.07-10-i*22,by0+bh+34,7,0,7); c.fill(); }
      if(G.msg){ const big=G.msg==='FIGHT!'||G.msg==='FINISH HIM!'||G.msg==='K.O.'; bigTxt(c,G.msg,W/2,H*.34,Math.min(big?96:70,W/(big?7:9)),G.msg==='FINISH HIM!'?'#e5484d':G.msg==='K.O.'?'#e5b21c':'#f2e6c8'); if(G.sub) bigTxt(c,G.sub,W/2,H*.46,Math.min(48,W/14),'#f2c230'); }
      // przyciski dotykowe i podpowiedź
      G.btn=[]; const bs=Math.min(78,W/8), pad=14, yy=H-bs-pad; const B=(k,x,l,col)=>{ G.btn.push({k,x,y:yy,w:bs,h:bs}); c.fillStyle=G.hold[k]?'rgba(255,255,255,.4)':'rgba(255,255,255,.16)'; rrect(c,x,yy,bs,bs,14); c.fill(); c.strokeStyle='rgba(255,255,255,.5)'; c.lineWidth=2; c.stroke(); txt(c,l,x+bs/2,yy+bs/2,bs*.34,col||'#fff'); };
      B('l',pad,'◀'); B('r',pad+bs+10,'▶'); B('b',W-pad-bs*3-20,'BLOK','#9ad0ff'); B('k',W-pad-bs*2-10,'KOP','#ffd27a'); B('p',W-pad-bs,'CIOS','#ff9a8a');
      if(!IS_TOUCH) txt(c,'A / D - ruch · J lub SPACJA - cios · K - kopniak · S lub SHIFT - blok',W/2,H-16,Math.min(18,W/42),'rgba(255,255,255,.75)'); };
    return G; }
  /* ===== MŁYN CEMENTU: utrzymaj obciążenie młyna kulowego w zielonym polu ===== */
  function makeMlyn(opt){ const G={t:0,L:.2,feed:.3,hist:[],inBand:0,total:0,choke:0,idle:0,strikes:0,over:undefined,rot:0,msg:'',msgT:0,score:0,pt:0}; const DUR=60, LO=.45, HI=.65;
    G.demand=t=>.5+.16*Math.sin(t*.45)+.09*Math.sin(t*1.3+1.7)+.04*Math.sin(t*3.1);
    G.update=dt=>{ G.t+=dt; if(G.msgT>0) G.msgT-=dt; if(G.over!==undefined){ G.over-=dt; if(G.over<=0) mgEnd(G.result()); return; }
      const up=G.kUp||G.hold; const dn=G.kDn; G.feed=clamp(G.feed+(up?1:dn?-1:-.35)*.55*dt,0,1);
      if(G.choke>0){ G.choke-=dt; G.L=Math.max(.5,G.L-dt*.3); } else { G.L=clamp(G.L+(G.feed-G.demand(G.t))*.9*dt,0,1); if(G.L>.93){ G.choke=3; G.strikes++; G.msg='ZATOR W MŁYNIE!'; G.msgT=1.6; mgSnd.bad(); } else if(G.L<.07&&G.t>3){ G.idle+=dt; if(G.idle>1.8){ G.idle=0; G.strikes++; G.msg='MIELENIE NA PUSTO!'; G.msgT=1.4; mgSnd.bad(); } } else G.idle=0; }
      G.total+=dt; if(G.L>=LO&&G.L<=HI&&G.choke<=0) G.inBand+=dt; G.rot+=dt*(1+(G.choke>0?0:1.4)); G.pt+=dt; if(G.pt>.12){ G.pt=0; G.hist.push(G.L); if(G.hist.length>140) G.hist.shift(); }
      if(G.strikes>=3){ G.over=1; G.win=false; } else if(G.t>=DUR){ G.over=1; G.win=G.inBand/G.total>=.62; if(G.win) mgSnd.ok(); } };
    G.down=(x,y)=>{ G.hold=true; }; G.up=()=>{ G.hold=false; };
    const kk=k=>{ k=String(k).toLowerCase(); return k===' '||k==='w'||k==='arrowup'?'u':k==='s'||k==='arrowdown'?'d':''; }; G.key=k=>{ const t=kk(k); if(t==='u') G.kUp=true; if(t==='d') G.kDn=true; }; G.keyUp=k=>{ const t=kk(k); if(t==='u') G.kUp=false; if(t==='d') G.kDn=false; };
    G.result=()=>{ const r=G.inBand/Math.max(1,G.total); return {win:!!G.win,score:Math.round(r*1000),stars:!G.win?0:r>.85&&G.strikes===0?3:r>.72?2:1,text:G.win?`Młyn pracował w optimum ${Math.round(r*100)}% czasu, awarie: ${G.strikes}.`:G.strikes>=3?'Zbyt wiele awarii młyna - zmiana przerwana.':`Za mało czasu w optimum (${Math.round(r*100)}%, potrzeba 62%).`}; };
    G.draw=(c,W,H)=>{ const gr=c.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#cfd6da'); gr.addColorStop(1,'#8f989e'); c.fillStyle=gr; c.fillRect(0,0,W,H); c.fillStyle='#6f777c'; c.fillRect(0,H*.78,W,H*.22);
      const cx=W*.42, cy=H*.5, mw=Math.min(W*.46,520), mh=mw*.38; c.fillStyle='#4f565b'; c.fillRect(cx-mw*.55,cy+mh*.55,mw*1.1,mh*.25); c.fillStyle='#d9d4c4'; rrect(c,cx-mw/2,cy-mh/2,mw,mh,mh*.35); c.fill(); c.strokeStyle='#5f6469'; c.lineWidth=5; c.stroke();
      c.save(); c.beginPath(); rrect(c,cx-mw/2,cy-mh/2,mw,mh,mh*.35); c.clip(); c.strokeStyle='rgba(0,0,0,.25)'; c.lineWidth=10; for(let i=-6;i<12;i++){ const x=cx-mw/2+((i*34+G.rot*60)%(mw+68))-34; c.beginPath(); c.moveTo(x,cy-mh/2); c.lineTo(x+mh*.4,cy+mh/2); c.stroke(); } c.restore();
      c.fillStyle='#e3a02a'; c.beginPath(); c.moveTo(cx-mw*.8,cy-mh*.9); c.lineTo(cx-mw*.55,cy-mh*.9); c.lineTo(cx-mw*.38,cy-mh*.35); c.lineTo(cx-mw*.62,cy-mh*.35); c.closePath(); c.fill(); txt(c,'SUROWIEC',cx-mw*.66,cy-mh*.62,Math.min(16,W/55),'#2a2a2a');
      const gx=W*.78, gy=H*.2, gw=44, gh=H*.5; c.fillStyle='rgba(18,21,24,.9)'; rrect(c,gx-14,gy-34,gw+28,gh+68,10); c.fill(); txt(c,'OBCIĄŻENIE',gx+gw/2,gy-16,15,'#fff'); c.fillStyle='#2d3338'; c.fillRect(gx,gy,gw,gh); c.fillStyle='rgba(71,176,75,.55)'; c.fillRect(gx,gy+gh*(1-HI),gw,gh*(HI-LO)); c.fillStyle=G.choke>0?'#e5484d':(G.L>=LO&&G.L<=HI?'#47b04b':'#f2c230'); c.fillRect(gx,gy+gh*(1-G.L),gw,gh*G.L);
      c.fillStyle='#fff'; c.fillRect(gx-8,gy+gh*(1-G.feed)-2,gw+16,4); txt(c,'dozownik',gx+gw/2,gy+gh+16,13,'#aab2b8');
      const hx=W*.08, hy=H*.76, hw=Math.min(W*.6,640), hh=H*.14; c.fillStyle='rgba(18,21,24,.85)'; rrect(c,hx,hy,hw,hh,8); c.fill(); c.fillStyle='rgba(71,176,75,.25)'; c.fillRect(hx,hy+hh*(1-HI),hw,hh*(HI-LO)); c.strokeStyle='#ffd23a'; c.lineWidth=2; c.beginPath(); G.hist.forEach((v,i)=>{ const x=hx+i/139*hw, y=hy+hh*(1-v); i?c.lineTo(x,y):c.moveTo(x,y); }); c.stroke();
      c.fillStyle='rgba(18,21,24,.9)'; rrect(c,W/2-210,70,420,44,8); c.fill(); txt(c,`czas ${Math.max(0,Math.ceil(DUR-G.t))} s · w optimum ${Math.round(100*G.inBand/Math.max(1,G.total))}% · awarie ${G.strikes}/3`,W/2,92,19,'#fff');
      if(G.msgT>0) bigTxt(c,G.msg,W/2,H*.3,Math.min(46,W/14),'#e5484d'); txt(c,IS_TOUCH?'Przytrzymaj palec - więcej surowca, puść - mniej. Trzymaj poziom w zielonym polu!':'Przytrzymaj SPACJĘ (lub W/↑) - więcej surowca, puść - mniej (S/↓ - szybciej mniej). Trzymaj poziom w zielonym!',W/2,H-30,Math.min(19,W/38),'#1b1e21'); }; return G; }
  /* ===== STEROWNIA PIECA: reaguj na alarmy parametrów procesu ===== */
  function makeSterownia(opt){ const G={t:0,over:undefined,fail:0,score:0,green:0,msg:'',msgT:0}; const DUR=55;
    const P=[['Temp. pieca °C',1450,1380,1520],['Ciśnienie mbar',-8,-14,-3],['Tlen O₂ %',2.6,1.5,4],['Obroty pieca',3.4,2.8,4.2],['Prąd młyna A',210,170,250],['Poziom silosu %',60,35,85]].map(([n,v,lo,hi],i)=>({n,lo,hi,mid:(lo+hi)/2,v:(lo+hi)/2+(Math.random()-.5)*(hi-lo)*.4,vel:0,red:0,cd:0,warn:0}));
    G.P=P; G.fix=i=>{ const q=P[i]; if(!q||q.cd>0||G.over!==undefined) return; q.cd=1.1; q.vel=(q.mid-q.v)*1.3+(Math.random()-.5)*(q.hi-q.lo)*.1; mgSnd.key(); };
    G.update=dt=>{ G.t+=dt; if(G.msgT>0) G.msgT-=dt; if(G.over!==undefined){ G.over-=dt; if(G.over<=0) mgEnd(G.result()); return; }
      let anyGreen=true; P.forEach(q=>{ if(q.cd>0) q.cd-=dt; const rng=q.hi-q.lo; q.vel+= (Math.random()-.5)*rng*(.55+G.t/DUR*.9)*dt + (Math.random()<dt*.18?(Math.random()<.5?-1:1)*rng*.35:0); q.vel*=1-dt*.9; q.v+=q.vel*dt*1.0; const out=q.v<q.lo||q.v>q.hi; if(out){ anyGreen=false; q.red+=dt; if(q.red>3){ q.red=0; q.v=q.mid+(Math.random()-.5)*rng*.3; q.vel=0; G.fail++; G.msg='ALARM: '+q.n; G.msgT=1.6; mgSnd.bad(); } } else q.red=Math.max(0,q.red-dt*2); });
      if(anyGreen) G.green+=dt; if(G.fail>=3){ G.over=1; G.win=false; } else if(G.t>=DUR){ G.over=1; G.win=true; mgSnd.ok(); } };
    G.down=(mx,my)=>{ const R=G.rects(MG.W,MG.H); R.forEach((r,i)=>{ if(mx>=r.x&&mx<=r.x+r.w&&my>=r.y&&my<=r.y+r.h) G.fix(i); }); }; G.key=k=>{ const i='123456'.indexOf(k); if(i>=0) G.fix(i); };
    G.rects=(W,H)=>{ const w=Math.min(W*.28,230), h=Math.min(H*.26,160), gx=Math.min(W*.03,22), x0=W/2-(w*3+gx*2)/2, y0=H*.26; return P.map((q,i)=>({x:x0+(i%3)*(w+gx),y:y0+Math.floor(i/3)*(h+gx),w,h})); };
    G.result=()=>({win:!!G.win,score:Math.round(G.green*14)-G.fail*100,stars:!G.win?0:G.fail===0?3:G.fail===1?2:1,text:G.win?`Piec utrzymany w parametrach. Alarmy: ${G.fail}.`:'Trzy awarie procesu - piec odstawiony. Reaguj szybciej na czerwone wskaźniki.'});
    G.draw=(c,W,H)=>{ c.fillStyle='#161b20'; c.fillRect(0,0,W,H); c.fillStyle='#1f262d'; c.fillRect(0,H*.2,W,H*.7); const R=G.rects(W,H);
      R.forEach((r,i)=>{ const q=P[i], out=q.v<q.lo||q.v>q.hi, f=(q.v-q.lo)/(q.hi-q.lo); const blink=out&&Math.floor(G.t*5)%2; c.fillStyle=out?(blink?'#5a1d1d':'#3a1515'):'#1b2c22'; rrect(c,r.x,r.y,r.w,r.h,10); c.fill(); c.strokeStyle=out?'#e5484d':'#47b04b'; c.lineWidth=3; c.stroke();
        txt(c,`${i+1}. ${q.n}`,r.x+r.w/2,r.y+20,Math.min(16,r.w/12),'#cfd6da'); const bx0=r.x+16, bw=r.w-32, by0=r.y+r.h*.5; c.fillStyle='#0d1114'; c.fillRect(bx0,by0,bw,16); c.fillStyle='rgba(71,176,75,.35)'; c.fillRect(bx0+bw*.0,by0,bw,16); c.fillStyle=out?'#e5484d':'#7fe08a'; const px=bx0+bw*clamp(f,-.12,1.12); c.fillRect(px-3,by0-6,6,28);
        txt(c,(Math.round(q.v*10)/10)+'',r.x+r.w/2,r.y+r.h*.8,Math.min(30,r.w/6),out?'#ff8a8a':'#e6f2e8'); if(q.cd>0){ c.fillStyle='rgba(255,255,255,.12)'; c.fillRect(r.x+4,r.y+r.h-8,(r.w-8)*(q.cd/1.1),4); } if(out){ c.fillStyle='#e5484d'; c.fillRect(r.x+4,r.y+4,(r.w-8)*(1-q.red/3),4); } });
      c.fillStyle='rgba(18,21,24,.9)'; rrect(c,W/2-210,70,420,44,8); c.fill(); txt(c,`zmiana: ${Math.max(0,Math.ceil(DUR-G.t))} s · awarie ${G.fail}/3`,W/2,92,19,'#fff'); if(G.msgT>0) bigTxt(c,G.msg,W/2,H*.19,Math.min(42,W/16),'#e5484d');
      txt(c,IS_TOUCH?'Stukaj w kafelek ze wskaźnikiem poza zielonym polem - regulacja (przerwa ~1 s).':'Kliknij kafelek (lub klawisze 1-6) ze wskaźnikiem poza normą - regulacja (przerwa ~1 s). Czerwony pasek = czas do awarii.',W/2,H-30,Math.min(19,W/38),'#cfd6da'); }; return G; }
  const MINIS={
    pojedynek:{t:'Pojedynek przy remizie',make:makePojedynek,help:()=>mgHelp(['Walka na pięści jak w Mortal Kombat - do dwóch wygranych rund (60 s każda).','Ruch: A / D (lub strzałki), cios: J lub SPACJA, kopniak: K, blok: S lub SHIFT. Na telefonie - przyciski na ekranie.','Blokuj ciosy rywala i kontruj, gdy się odsłoni. Rywal z każdą rundą jest szybszy.']),reward:()=>150},
    mlyn:{t:'Młyn cementu',make:makeMlyn,help:()=>mgHelp(['Jesteś operatorem młyna kulowego. Dozuj surowiec tak, by obciążenie młyna było w zielonym polu.','Za dużo surowca = zator (przestój), za mało = mielenie na pusto. Trzy awarie kończą zmianę.','Przez 60 sekund utrzymaj poziom w optimum co najmniej 62% czasu.']),reward:()=>140},
    sterownia:{t:'Sterownia pieca',make:makeSterownia,help:()=>mgHelp(['Siedzisz w sterowni pieca obrotowego. Sześć parametrów procesu ucieka z normy.','Kliknij kafelek (lub klawisz 1-6), gdy wskaźnik wyjdzie poza zielone pole - regulacja wraca go do środka.','Nie dopuść, by parametr był poza normą dłużej niż 3 s. Trzy awarie = odstawienie pieca.']),reward:()=>130},
    paczkomat:{t:'Paczkomat',make:makePaczkomat,help:o=>mgHelp(o.mode==='odbierz'?['Zapamiętaj 6-cyfrowy kod z SMS-a i wpisz go na klawiaturze.','Kliknij skrytkę, która się otworzy - szybko, zanim się zamknie!','Masz 3 życia. Im szybciej, tym więcej punktów.']:['Dobierz gabaryt skrytki do wysokości paczki (A do 8 cm, B do 19 cm, C do 41 cm).','Zapamiętaj kod nadania i wpisz go na klawiaturze.','Kliknij otwartą skrytkę, zanim się zamknie. 3 paczki, 3 życia.']),reward:o=>o.mode==='odbierz'?30:60},
    flanki:{t:'Flanki w parku',make:makeFlanki,help:()=>mgHelp(['Rzucasz piłką w puszkę na środku: najpierw kąt, potem siła. Uważaj na wiatr!',IS_TOUCH?'Gdy trafisz - STUKAJ jak najszybciej, żeby wypić swoją puszkę, zanim rywal ją postawi.':'Gdy trafisz - WCISKAJ SPACJĘ jak najszybciej, żeby wypić swoją puszkę, zanim rywal ją postawi.','Gdy trafią rywale - klikaj szybko, żeby pobiec i postawić puszkę.','Wygrywa ekipa, która pierwsza opróżni 2 puszki.']),reward:()=>80},
    pilka:{t:'Mecz na orliku',make:makePilka,help:()=>mgHelp([IS_TOUCH?'Lewa strona ekranu - prowadź zawodnika (piłka sama trzyma się nogi).':'WASD lub strzałki - bieg z piłką (drybling).',IS_TOUCH?'Przycisk STRZAŁ: przytrzymaj, żeby nabrać siły, i puść.':'Przytrzymaj SPACJĘ, żeby nabrać siły, i puść - strzał. Mocny strzał w róg mija bramkarza.','Uważaj na dwóch obrońców - odbierają piłkę przy kontakcie.','Strzel 3 gole w 90 sekund.']),reward:()=>100},
    zonglerka:{t:'Żonglerka - LZS Trębaczew',make:makeZonglerka,help:()=>mgHelp(['Utrzymaj piłkę w powietrzu przez 60 sekund.',IS_TOUCH?'Przytrzymaj palec - rośnie siła; puść, gdy piłka spada na nogę. Przesuwaj palcem, żeby iść pod piłkę.':'Przytrzymaj SPACJĘ - rośnie siła; puść, gdy piłka spada na nogę. A/D lub ←/→ - ruch pod piłkę.','Im dłużej trzymasz, tym mocniej kopiesz. Celuj w zieloną strefę - idealne podbicia dają gwiazdki.','Piłka nie może dotknąć murawy!']),reward:()=>150},
    palety:{t:'Paletyzacja worków',make:makePalety,help:()=>mgHelp(['Worki cementu jadą taśmą w stronę palety.',IS_TOUCH?'Stuknij, gdy worek jest w zielonej strefie - robot odłoży go na paletę.':'Naciśnij SPACJĘ (albo kliknij), gdy worek jest w zielonej strefie - robot odłoży go na paletę.','Ułóż 20 worków. Cztery pudła lub zjechane worki kończą zmianę.']),reward:()=>120},
    bhp:{t:'Kontrola BHP',make:makeBhp,help:()=>mgHelp(['Jesteś inspektorem BHP na terenie zakładu.','Klikaj pracowników BEZ białego kasku. Pracownik w kasku jest w porządku - pomyłka kosztuje punkty.','Zgłoś 8 wykroczeń w 45 sekund, popełniając najwyżej 3 pomyłki.']),reward:()=>100},
    cysterna2:{t:'Załadunek cystern we dwoje',make:makeCysterna2,help:o=>mgHelp(o.host?['Jesteś ŁADOWACZEM: przytrzymaj SPACJĘ (lub palec) - cement leci do cysterny. Puść, by przerwać strumień.','Nie widzisz wagi - partner stoi na wadze i zatwierdza ładunek przy 24 t.','Łącze ma opóźnienie: dozuj strumień, żeby partner zdążył. Poprawnie 2 z 3 cystern.']:['Jesteś na WADZE: widzisz dokładny tonaż. Naciśnij SPACJĘ (lub stuknij), gdy waga pokaże 24 t - zatwierdzasz ładunek.','Ładowacz (partner) dozuje strumień. Łącze ma opóźnienie - zatwierdzaj ciut wcześniej.','Poprawnie 2 z 3 cystern. Wypłata dla obojga.']),reward:()=>220},
    palety2:{t:'Brygada paletyzacji',make:makePalety2,help:()=>mgHelp(['Worki jadą taśmą do zielonej strefy - u was obu w tym samym rytmie.',IS_TOUCH?'Stuknij dokładnie wtedy, gdy worek jest w strefie. Obaj musicie trafić.':'Naciśnij SPACJĘ (lub kliknij) dokładnie, gdy worek jest w strefie. Obaj musicie trafić.','16 worków - potrzeba 10 trafionych przez oboje naraz. Wypłata dla obojga.']),reward:()=>240},
    cysterna:{t:'Załadunek cystern',make:makeCysterna,help:()=>mgHelp([IS_TOUCH?'Przytrzymaj palec - cement leci do cysterny. Puść, gdy wskaźnik jest na 24 tonach.':'Przytrzymaj SPACJĘ - cement leci do cysterny. Puść, gdy wskaźnik jest na 24 tonach.','Przepływ się waha - wyczuj rytm. Tolerancja maleje z każdą cysterną.','Załaduj poprawnie co najmniej 2 z 3 cystern.']),reward:()=>140},
    laboratorium:{t:'Laboratorium - próbki',make:makeLab,help:()=>mgHelp(['Laborant pobiera próbki z czterech punktów linii produkcyjnej.','Zapamiętaj kolejność podświetlanych naczyń i powtórz ją (klik lub klawisze 1-4).','Z każdą serią kolejność jest dłuższa. Wygrasz po 7 seriach.']),reward:()=>110},
    karne:{t:'Rzuty karne',make:makeKarne,help:o=>mgHelp(['Strzelasz: zatrzymaj celownik w poziomie, potem w pionie. Rogi są trudne do obrony, ale łatwo trafić obok.','Bronisz: po strzale rywala kliknij miejsce w bramce, gdzie się rzucisz (albo strzałki).','Seria 5 karnych, potem do pierwszego błędu.'+(o.mode==='lzs'?' Na stadionie LZS bramkarz gości jest lepszy!':'')]),reward:o=>o.mode==='lzs'?200:120},
  };
  function openMini(id,opt){ const M=MINIS[id]; if(!M||MG.on)return false; opt=opt||{}; MG.on=true; MG.id=id; MG.opt=opt; MG.g=null; MG.res=null; keys.clear(); resetJoy(); st.vx=0; st.vz=0; try{ if(player.userData.idle) player.userData.idle.amt=0; animPerson(player,st.walk,0); }catch(e){} if(typeof MP!=='undefined'&&MP.on&&MP.room){ MP.last=''; MP.room.presence(myPresence()).catch(()=>{}); } if(typeof releaseAll==='function') releaseAll();
    mgEl.hidden=false; document.body.classList.add('inmg'); mgResize(); document.getElementById('mgTitle').textContent=opt.title||M.t; document.getElementById('mgInfo').textContent=opt.mission?'Misja':'';
    const best=MG.best[id+(opt.mode?'-'+opt.mode:'')]; mgOver.hidden=false;
    mgOver.innerHTML=`<div class="mgCard"><div class="kick">Minigra</div><h2>${opt.title||M.t}</h2>${opt.sub?`<p class="sub">${opt.sub}</p>`:''}${M.help(opt)}<p class="sub">${best?`Rekord: <b>${best.s}</b> pkt · ${stars(best.st||0)}`:'Jeszcze nie grałeś - ustaw pierwszy rekord!'}${!opt.mission?` · nagroda za wygraną: ${fmt(M.reward(opt))}`:''}</p><div class="mgBtns"><button class="btn hot" id="mgGo">Graj</button><button class="btn" id="mgBack">Wyjdź</button></div></div>`;
    document.getElementById('mgGo').addEventListener('click',mgStart); document.getElementById('mgBack').addEventListener('click',()=>closeMini(false)); setTimeout(()=>{ const b=document.getElementById('mgGo'); if(b) b.focus(); },30); return true; }
  function mgStart(){ const M=MINIS[MG.id]; mgOver.hidden=true; MG.keys.clear(); MG.g=M.make(MG.opt); MG.t=0; if(!AU.ctx) try{ audioStart(); }catch(e){} }
  function mgEnd(res){ if(MG.res)return; MG.res=res; const key=MG.id+(MG.opt.mode?'-'+MG.opt.mode:''); const prev=MG.best[key]; const rec=!prev||res.score>prev.s; if(rec||!prev||res.stars>(prev.st||0)){ MG.best[key]={s:Math.max(res.score,prev?prev.s:0),st:Math.max(res.stars,prev?prev.st||0:0)}; try{ localStorage.setItem('trebaczew-mini',JSON.stringify(MG.best)); }catch(e){} }
    let rw=''; if(res.win&&!MG.opt.mission){ const v=MINIS[MG.id].reward(MG.opt); addMoney(v); addXP(8); rw=`<p class="rw">+${fmt(v)} · +8 XP</p>`; } if(res.win) mgSnd.win();
    if(typeof statEvent==='function') statEvent('mini',{g:MG.id,m:MG.opt.mode||'',s:res.score,w:res.win?1:0});
    mgOver.hidden=false; mgOver.innerHTML=`<div class="mgCard res ${res.win?'ok':'bad'}"><div class="kick">${res.win?'Wygrana':'Porażka'}</div><h2>${res.win?'BRAWO!':'NIE TYM RAZEM'}</h2><div class="stars">${stars(res.stars)}</div><p>${res.text}</p><p class="sub">${res.score} pkt${rec&&res.score>0?' · <b>nowy rekord!</b>':prev?` · rekord ${prev.s}`:''}</p>${rw}<div class="mgBtns">${MG.opt.mission&&res.win?'<button class="btn hot" id="mgOk">Dalej</button>':'<button class="btn hot" id="mgAgain">Zagraj jeszcze raz</button>'}<button class="btn" id="mgBack">${MG.opt.mission&&res.win?'Zagraj jeszcze raz':'Wyjdź'}</button></div></div>`;
    const ok=document.getElementById('mgOk'), ag=document.getElementById('mgAgain'), bk=document.getElementById('mgBack');
    if(ok){ ok.addEventListener('click',()=>closeMini(true)); bk.addEventListener('click',()=>{ MG.res=null; mgStart(); }); ok.focus(); } else { ag.addEventListener('click',()=>{ MG.res=null; mgStart(); }); bk.addEventListener('click',()=>closeMini(res.win)); ag.focus(); } }
  function closeMini(win){ const cb=MG.opt.onEnd; MG.on=false; MG.g=null; mgEl.hidden=true; mgOver.hidden=true; document.body.classList.remove('inmg'); keys.clear(); clock.getDelta(); if(cb) cb(!!(win||(MG.res&&MG.res.win))); canvas.focus(); }
  MG.frame=dt=>{ const c=MG.cx, W=MG.W, H=MG.H; MG.t+=dt; if(MG.g&&!MG.res) MG.g.update(dt);
    if(MG.g) MG.g.draw(c,W,H); else { const gr=c.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#1b2026'); gr.addColorStop(1,'#0b0d10'); c.fillStyle=gr; c.fillRect(0,0,W,H); } };
  MG.keys=new Set();
  MG.cv.addEventListener('pointerdown',e=>{ if(!MG.g||MG.res)return; e.preventDefault(); try{ MG.cv.setPointerCapture(e.pointerId); }catch(_){} const r=MG.cv.getBoundingClientRect(); MG.g.down&&MG.g.down(e.clientX-r.left,e.clientY-r.top,e.pointerId); });
  MG.cv.addEventListener('pointermove',e=>{ if(!MG.g||MG.res||!MG.g.move)return; const r=MG.cv.getBoundingClientRect(); MG.g.move(e.clientX-r.left,e.clientY-r.top,e.pointerId); });
  ['pointerup','pointercancel'].forEach(ev=>MG.cv.addEventListener(ev,e=>{ if(!MG.g||MG.res||!MG.g.up)return; const r=MG.cv.getBoundingClientRect(); MG.g.up(e.clientX-r.left,e.clientY-r.top,e.pointerId); }));
  addEventListener('keydown',e=>{ if(!MG.on)return; e.stopPropagation(); if(e.key==='Escape'){ e.preventDefault(); closeMini(false); return; } MG.keys.add(e.key.toLowerCase()); if(e.key===' '||e.key.startsWith('Arrow')) e.preventDefault(); if(MG.g&&!MG.res&&MG.g.key&&!e.repeat) MG.g.key(e.key); },true);
  addEventListener('keyup',e=>{ if(!MG.on)return; e.stopPropagation(); MG.keys.delete(e.key.toLowerCase()); if(MG.g&&!MG.res&&MG.g.keyUp) MG.g.keyUp(e.key); },true);
  addEventListener('blur',()=>MG.keys.clear());
  document.getElementById('mgX').addEventListener('click',()=>closeMini(false));
  // miejsca w świecie, gdzie można zagrać
  const MINI_SPOTS=[];
  function addMiniSpot(p,id,opt,label){ const g=new THREE.Group(); const m=new THREE.MeshBasicMaterial({color:0x7fd06b,transparent:true,opacity:.45,depthWrite:false}); const r=new THREE.Mesh(new THREE.RingGeometry(.9,1.15,32).rotateX(-Math.PI/2),m); r.position.y=.14; g.add(r); g.position.set(p[0],H(p[0],p[1]),p[1]); scene.add(g); MINI_SPOTS.push({p,id,opt,label,g}); }
  function nearMini(){ if(st.car||st.inside||MG.on||ACTIVE&&ACTIVE.steps[ACTIVE.i]&&ACTIVE.steps[ACTIVE.i].mini)return null; let best=null,bd=3.2; MINI_SPOTS.forEach(s=>{ const d=Math.hypot(s.p[0]-st.x,s.p[1]-st.z); if(d<bd){bd=d;best=s;} }); if(!best){ const l=LOCKERS.find(l=>Math.hypot(l.x-st.x,l.z-st.z)<3.2); if(l) best={id:'paczkomat',opt:{mode:'nadaj',title:'Nadaj paczkę'},label:'Nadaj paczkę'}; } return best; }
  function miniSpotsInit(){ if(PARK_P) addMiniSpot(walkSpot([PARK_P[0]+6,PARK_P[1]-4],false),'flanki',{diff:1},'Zagraj we flanki');
    if(STADIUM_P) addMiniSpot(walkSpot(STADIUM_P,false),'karne',{mode:'lzs',title:'Rzuty karne - LZS Trębaczew'},'Rzuty karne LZS');
    if(STADIUM_C) addMiniSpot(walkSpot([STADIUM_C[0]+3,STADIUM_C[1]+3],false),'zonglerka',{title:'Żonglerka - LZS Trębaczew'},'Żonglerka');
    addMiniSpot(walkSpot([orlik.m.cx+6,orlik.m.cz],false),'pilka',{title:'Mecz na orliku'},'Zagraj mecz');
    { const ospP=POIS.find(q=>q.n==='OSP Trębaczew'); if(ospP){ const yp=OSP_YARD?OSP_YARD.inYard(0,OSP_YARD.FZ+Math.min(OSP_YARD.toRoad*.6,7.5),1.6):[ospP.p[0],ospP.p[1]]; addMiniSpot(walkSpot([yp[0],yp[1]],false),'pojedynek',{title:'Pojedynek przy remizie'},'Pojedynek na pięści'); } }
    if(CEMENT) CEMENT.mini.forEach(m=>addMiniSpot(walkSpot(m.p,false),m.id,{title:m.title},m.label));
    MINI_SPOTS.forEach(s=>{ const c=new THREE.Mesh(new THREE.CylinderGeometry(.18,.16,.4,12),new THREE.MeshLambertMaterial({color:s.id==='flanki'?0xc62a24:0xffffff})); c.position.y=.3; s.g.add(c); }); }
  miniSpotsInit();

  /* ---------- pętla ---------- */
  function resize(){ const w=innerWidth,h=innerHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); if(composer){ composer.setPixelRatio&&composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w,h); if(fxaa){ const pr2=renderer.getPixelRatio(); fxaa.material.uniforms.resolution.value.set(1/(w*pr2),1/(h*pr2)); } } }
  addEventListener('resize',resize); resize();
  const clock=new THREE.Clock(); const fwd=new THREE.Vector3();
  function animPerson(p,walk,amt){ const u=p.userData, sn=Math.sin(walk), cs=Math.cos(walk); if(u.idle){ u.idle.amt=Math.max(u.idle.amt,amt); if(u.chest&&amt>.05) u.chest.rotation.y=-sn*.09*amt; } u.lL.rotation.x=sn*.55*amt; u.lR.rotation.x=-sn*.55*amt; u.aL.rotation.x=-sn*.45*amt; u.aR.rotation.x=sn*.45*amt;
    if(u.kL){ u.kL.rotation.x=amt*(.12+.8*Math.max(0,-cs)); u.kR.rotation.x=amt*(.12+.8*Math.max(0,cs)); u.eL.rotation.x=-(.12+.3*amt+Math.max(0,sn)*.25*amt); u.eR.rotation.x=-(.12+.3*amt+Math.max(0,-sn)*.25*amt); } }
  function frame(){ const rawDt=clock.getDelta(); const dt=Math.min(rawDt,0.05); tAll+=dt; WINDU.value=tAll; if(CEMENT&&CEMENT.tick) CEMENT.tick(); grassTick();
    fpsAcc+=rawDt; fpsN++; if(fpsAcc>2){ const fps=fpsN/fpsAcc; fpsAcc=0; fpsN=0; if(performance.now()-T_START<14000) lowN=0; else if(fps<22) lowN++; else lowN=0; const flo=IS_TOUCH?.85:.65; const npr=lowN>=3?(lowN=0,Math.max(flo,pr-0.1)):fps>48?Math.min(DPR,pr+0.1):pr; if(npr!==pr){ pr=npr; renderer.setPixelRatio(pr); resize(); } }
    if(!mapView.hidden){ requestAnimationFrame(frame); return; }
    if(GAME.paused){ menuFrame(dt); requestAnimationFrame(frame); return; }
    if(MG.on){ MG.frame(rawDt>0.1?0.016:rawDt); requestAnimationFrame(frame); return; }
    if(!logEl.hidden){ requestAnimationFrame(frame); return; }
    if(document.hasFocus&&!document.hasFocus()&&keys.size) keys.clear();
    let moving=false, mag=0;
    if(st.car){ driveCar(st.car,dt); moving=Math.abs(st.car.v)>.5;
      if(tAll-st.lastDrag>1.2){ const target=Math.atan2(-Math.cos(st.car.h),-Math.sin(st.car.h)); let d=target-st.yaw; d=Math.atan2(Math.sin(d),Math.cos(d)); st.yaw+=d*Math.min(1,dt*3); } }
    else { if(keys.has(' ')&&!(st.jy>0)&&!st.dead){ st.vy=7.6; } if(st.vy||st.jy>0){ st.vy-=19*dt; st.jy=(st.jy||0)+st.vy*dt; if(st.jy<=0){ st.jy=0; st.vy=0; } }
      let fw=0,sd=0; if(keys.has('w')||keys.has('arrowup'))fw+=1; if(keys.has('s')||keys.has('arrowdown'))fw-=1;
      if(st.mode===1){ if(keys.has('arrowleft'))st.yaw+=dt*2; if(keys.has('arrowright'))st.yaw-=dt*2; if(keys.has('a'))sd-=1; if(keys.has('d'))sd+=1; }
      else { if(keys.has('a')||keys.has('arrowleft'))sd-=1; if(keys.has('d')||keys.has('arrowright'))sd+=1; }
      if(joy.id!==null){ fw=-joy.y; sd=joy.x; }
      mag=Math.min(1,Math.hypot(fw,sd)); if(mag<0.12)mag=0;
      let speed=(keys.has('shift')||st.run)?(ADM.on&&st.mode===2?320:ADM.on?24:8.5):(ADM.on&&st.mode===2?90:ADM.on?7:4.2);
      let tvx=0,tvz=0;
      if(mag>0){ const sy=Math.sin(st.yaw), cy=Math.cos(st.yaw); const dx=(-sy*fw+cy*sd), dz=(-cy*fw-sy*sd); const l=Math.hypot(dx,dz)||1;
        const up=(H(st.x+dx/l,st.z+dz/l)-H(st.x,st.z)); speed*=clamp(1-up*1.2,0.55,1.15);            // pod górkę wolniej
        tvx=dx/l*speed*mag; tvz=dz/l*speed*mag; }
      const acc=mag>0?10:16; st.vx=(st.vx||0)+(tvx-(st.vx||0))*Math.min(1,dt*acc); st.vz=(st.vz||0)+(tvz-(st.vz||0))*Math.min(1,dt*acc);
      if(mag===0&&Math.hypot(st.vx,st.vz)<0.15){ st.vx=0; st.vz=0; }
      const vel=Math.hypot(st.vx,st.vz); moving=vel>0.1; mag=Math.min(1,vel/4.2);
      if(moving){ const dx=st.vx, dz=st.vz;
        const nx=st.x+st.vx*dt, nz=st.z+st.vz*dt; const feet=(st.gy||0)+(st.jy||0); const pb=st.inside?((x,z)=>curBlocked(x,z,.35)):(x,z)=>(ADM.on&&st.mode===2)?false:blocked(x,z,.35)||noWalk(x,z)||parked.some(c=>{ if(c===st.car)return false; const lx=(x-c.x)*Math.cos(c.h)+(z-c.z)*Math.sin(c.h), lz=-(x-c.x)*Math.sin(c.h)+(z-c.z)*Math.cos(c.h); const [L2,W2]=roofBox(c); return Math.abs(lx)<L2+.35&&Math.abs(lz)<W2+.35&&feet<roofH(c)-.12; });
        if(!pb(nx,nz)){st.x=nx;st.z=nz;} else if(!pb(nx,st.z)) st.x=nx; else if(!pb(st.x,nz)) st.z=nz;
        const tf=Math.atan2(dx,dz); let df=tf-st.face; df=Math.atan2(Math.sin(df),Math.cos(df)); st.face+=df*Math.min(1,dt*12); st.walk+=dt*vel*1.6; }
      if(!st.inside){ st.x=clamp(st.x,X0+30,X1-30); st.z=clamp(st.z,Z0+30,Z1-30); }
      if(ADM.on){ const la=51.1301965-st.z/110574, lo=18.9215954+st.x/(111320*Math.cos(51.1301965*Math.PI/180)); $('admHud').textContent='x '+st.x.toFixed(0)+'  z '+st.z.toFixed(0)+'  '+la.toFixed(5)+', '+lo.toFixed(5)+'  [kliknij = kopiuj]'; }
      { const fa=st.inside&&CUR.floorAt, ss=st.inside?(fa?CUR.floorAt(st.x-CUR.x,st.z-CUR.z):0):stairAt(st.x,st.z), sup=st.inside?ss:Math.max(roofAt(st.x,st.z),ss), gy=st.gy||0, ft=gy+(st.jy||0), tol=fa||(ss>0&&ss>=sup-.001)?.7:.15; if(sup>gy+.01){ if(ft>=sup-tol){ st.jy=Math.max(0,ft-sup); st.gy=sup; if(st.jy===0) st.vy=0; } } else if(sup<gy-.01){ st.jy=ft-sup; st.gy=sup; if(!st.vy) st.vy=-.01; } }
      player.position.set(st.x,(st.inside?CUR.y:H(st.x,st.z))+0.1+(st.gy||0)+(st.jy||0)+(moving?Math.abs(Math.cos(st.walk))*0.05:0),st.z); player.rotation.y=st.face; animPerson(player,st.walk,moving?mag:0); player.visible=st.mode!==1; }
    const fx=st.car?st.car.x:st.x, fz=st.car?st.car.z:st.z, fy=st.inside?CUR.y+(st.gy||0):H(fx,fz)+(st.car?0:(st.gy||0)); const sh=shake>0?(Math.random()-.5)*shake:0; shake=Math.max(0,shake-dt);
    st.distS=(st.distS||st.dist)+(st.dist-(st.distS||st.dist))*Math.min(1,dt*5); st.carD=(st.carD||0)+((st.car?3:0)-(st.carD||0))*Math.min(1,dt*2.5);
    if(st.mode===0){ const d=Math.max(st.car?8.5:0,st.distS+st.carD), p=Math.max(0.05,st.pitch)+(st.car?.05:0), ty=fy+(st.car?1.4:1.55); let cx=fx+Math.sin(st.yaw)*Math.cos(p)*d+sh, cz=fz+Math.cos(st.yaw)*Math.cos(p)*d; let cy=ty+.4+Math.sin(p)*d; { const steps=12; let hitT=1; if(st.camT===undefined)st.camT=1; for(let i=1;i<=steps;i++){ const t=i/steps, qx=fx+(cx-fx)*t, qz=fz+(cz-fz)*t; if(st.inside&&CUR.levels?curBlocked(qx,qz,.15):blocked(qx,qz,.3)){ hitT=Math.max(.18,(i-1)/steps); break; } } const k=hitT<st.camT?4:1.6; st.camT+=(hitT-st.camT)*Math.min(1,dt*k); const tt=st.camT; cx=fx+(cx-fx)*tt; cz=fz+(cz-fz)*tt; cy=ty+.4+(cy-ty-.4)*tt; } cy=Math.max(cy,H(cx,cz)+0.7); camera.position.set(cx,cy,cz); camera.lookAt(fx,ty+(st.car?.6:0),fz); camera.fov+=((st.car?60+Math.min(14,Math.abs(st.car.v)*.5):60)-camera.fov)*Math.min(1,dt*2); camera.updateProjectionMatrix(); }
    else if(st.mode===1){ const hy=fy+(st.car?1.25:1.72); camera.position.set(fx,hy,fz); const p=clamp((st.pitch-0.22)*-1.4,-1.2,1.2); fwd.set(-Math.sin(st.yaw)*Math.cos(p),Math.sin(p),-Math.cos(st.yaw)*Math.cos(p)); camera.lookAt(fx+fwd.x,hy+fwd.y,fz+fwd.z); }
    else { const d=Math.max(80,st.distS*7); const p=clamp(st.pitch+0.65,0.6,1.45); camera.position.set(fx+Math.sin(st.yaw)*Math.cos(p)*d, fy+Math.sin(p)*d, fz+Math.cos(st.yaw)*Math.cos(p)*d); camera.lookAt(fx,fy,fz); }
    if(st.inside) inCam();
    sky.position.copy(camera.position);
    sun.position.set(fx+SUNDIR.x*220,fy+SUNDIR.y*220,fz+SUNDIR.z*220); sun.target.position.set(fx,fy,fz); playerLight.position.set(fx,fy+7,fz);
    if(st.car&&st.night){ const c=st.car; carLight.intensity=2.2; carLight.position.set(c.x+Math.cos(c.h)*2.3,fy+1,c.z+Math.sin(c.h)*2.3); carLight.target.position.set(c.x+Math.cos(c.h)*20,H(c.x+Math.cos(c.h)*20,c.z+Math.sin(c.h)*20),c.z+Math.sin(c.h)*20); } else carLight.intensity=0;
    if(st.night){ const ls=lamps.map(l=>[l,(l.x-fx)**2+(l.z-fz)**2]).sort((a,b)=>a[1]-b[1]); lampPool.forEach((pl,i)=>{ const l=ls[i]&&ls[i][0]; if(l){pl.position.set(l.x,l.y+7.6,l.z); pl.intensity=.6;} }); } else lampPool.forEach(pl=>pl.intensity=0);
    trafficSpeeds(dt); cars.forEach(c=>{ const RR=c.r||DK; c.d+=c.dir*c.v*dt; if(c.r){ if(c.d>RR.L-5){ c.d=RR.L-5; c.dir=-1; } else if(c.d<5){ c.d=5; c.dir=1; } } else { if(c.d>DK.L)c.d-=DK.L; if(c.d<0)c.d+=DK.L; } const s=sampleLine(RR.pts,RR.len,c.d); const o=(c.r?1.7:2.2)*c.dir; c.x=s.x-s.tz*o; c.z=s.z+s.tx*o; c.h=Math.atan2(s.tz,s.tx)+(c.dir<0?Math.PI:0); seatCar(c.g,c.x,c.z,c.h,0.1); c.g.userData.wheels.forEach(w=>w.rotation.z-=c.v*dt/.36);
      if(!st.car&&Math.hypot(c.x-st.x,c.z-st.z)<2.2&&tAll-(st.hitT||-9)>1.5){ st.hitT=tAll; st.hp=Math.max(0,st.hp-30); shake=.8; const dx=st.x-c.x,dz=st.z-c.z,l=Math.hypot(dx,dz)||1; st.vx=dx/l*9; st.vz=dz/l*9; } });
    const TL=trainLen[trainLen.length-1], SP=TRAIN_SCHED.pas; SP.span=TL+6*22+10; SP.P=Math.max(SP.span/SP.v+150,300); const h0=(tAll%SP.P)*SP.v;
    trainHorn(train[0],SP);
    train.forEach((t,i)=>{ const d=h0-i*22; if(d<0||d>TL){t.visible=false;return;} t.visible=true; const s=sampleLine(trainPath,trainLen,d); t.position.set(s.x,HC(s.x,s.z)+0.22,s.z); t.rotation.y=-Math.atan2(s.tz,s.tx); });
    peds.forEach(p=>{ if(p.down>0){ p.down-=dt; if(p.down<=0){ p.g.rotation.x=0; } return; }
      const L=p.w.len[p.w.len.length-1]; p.d+=p.dir*p.v*dt; if(p.d>L){p.d=L;p.dir=-1;} if(p.d<0){p.d=0;p.dir=1;} const s=sampleLine(p.w.pts,p.w.len,p.d);
      p.g.position.set(s.x,H(s.x,s.z)+0.16,s.z); p.g.rotation.y=Math.atan2(s.tx*p.dir,s.tz*p.dir); p.walk+=dt*p.v*3; animPerson(p.g,p.walk,1);
      if(st.car&&Math.abs(st.car.v)>5&&Math.hypot(s.x-st.car.x,s.z-st.car.z)<1.9){ p.down=15; p.g.rotation.x=-Math.PI/2; p.g.position.y+=.2; setWanted(st.wanted+1); shake=.4; } });
    cashT+=dt; if(cashT>90){ cashT=0; if(pickups.filter(k=>!k.got).length<30) spawnCash(); }
    pickups.forEach(k=>{ if(k.got)return; k.m.rotation.y+=dt*2; k.m.position.y=k.y+Math.sin(tAll*3+k.x)*.12; if(Math.hypot(k.x-st.x,k.z-st.z)<(st.car?2.6:1.4)){ k.got=true; k.m.visible=false; addMoney(k.val); } });
    if(st.wanted>0){ st.wantedT+=dt; if(st.wantedT>25){ st.wanted--; st.wantedT=0; } }
    if(st.hp<=0&&!st.dead){ st.dead=2.5; if(st.car)exitCar(true); deadEl.hidden=false; const bill=Math.min(2000,Math.max(50,Math.round(st.money*.05/10)*10)); if(st.money>0){ const b=Math.min(st.money,bill); st.money-=b; shownMoney=st.money; moneyEl.textContent=fmt(st.money); toast(`Szpital w Działoszynie - rachunek: ${fmt(b)}`,3.5); } }
    if(st.dead){ st.dead-=dt; if(st.dead<=0){ st.dead=0; deadEl.hidden=true; st.hp=100; st.wanted=0; teleport(SPAWN.x,SPAWN.z); st.yaw=SPAWN.yaw; st.face=SPAWN.yaw+Math.PI; } }
    if(st.hp<100) st.hp=Math.min(100,st.hp+dt*1.5);
    if(shownMoney!==st.money){ shownMoney+=Math.sign(st.money-shownMoney)*Math.max(1,Math.ceil(Math.abs(st.money-shownMoney)*dt*6)); if(Math.abs(shownMoney-st.money)<2)shownMoney=st.money; moneyEl.textContent=fmt(shownMoney); }
    if(locTimer>0){ locTimer-=dt; if(locTimer<=0)locEl.classList.remove('on'); }
    extUpdate(dt); mpUpdate(dt);
    if(grade) grade.uniforms.time.value=tAll%100;
    if(composer) composer.render(dt); else renderer.render(scene,camera);
    drawRadar();
    if(tAll-lastHud>0.2){ lastHud=tAll; updHud(); }
    requestAnimationFrame(frame); }
  hot && hot.snapshot && hot.snapshot(()=>({x:st.x,z:st.z,yaw:st.yaw,mode:st.mode,night:st.night,money:st.money}));
  moneyEl.textContent=fmt(st.money);
  await LP(100);
  document.getElementById('load').hidden=true;
  showMenu(true); updHud(); frame();
}
hot && hot.ready ? hot.ready(boot) : boot(hot && hot.data || {});
})();
