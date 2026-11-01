(function(){
const hot = window.claude && window.claude.hot;

async function boot(saved){
  saved = saved || {};
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

  /* ---------- wysokości terenu (NMT GUGiK, siatka 20 m) ---------- */
  const HG=HGRID, HB=205; const hv=new Float32Array(HG.nx*HG.nz); for(let i=0;i<hv.length;i++) hv[i]=parseInt(HG.s.substr(i*2,2),36)/10+HG.base-HB;
  function hRaw(x,z){ let fx=clamp((x-HG.x0)/HG.step,0,HG.nx-1.0001), fz=clamp((z-HG.z0)/HG.step,0,HG.nz-1.0001); const ix=fx|0, iz=fz|0, tx=fx-ix, tz=fz-iz, n=HG.nx; const a=hv[iz*n+ix], b=hv[iz*n+ix+1], c=hv[(iz+1)*n+ix], d=hv[(iz+1)*n+ix+1]; return a*(1-tx)*(1-tz)+b*tx*(1-tz)+c*(1-tx)*tz+d*tx*tz; }
  const FLAT=[];
  function H(x,z){ for(const f of FLAT){ if(x>f.bb[0]-f.fe&&x<f.bb[2]+f.fe&&z>f.bb[1]-f.fe&&z<f.bb[3]+f.fe){ if(inPoly(x,z,f.p))return f.h; } } return hRaw(x,z); }

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
  const AREAS=DATA.A.map(([t,n,sport,surf,d])=>({t,n,sport,surf,pts:dec(d)}));
  if(typeof DATA_X!=='undefined') DATA_X.A.forEach(([t,n,sport,surf,d])=>AREAS.push({t,n,sport,surf,pts:dec(d),ext:true}));
  const BLD=[];
  DATA_B.split(';').forEach(s=>{ const q=s.indexOf('"'); const name=q>=0?s.slice(q+1,s.lastIndexOf('"')):''; const nums=(q>=0?s.slice(0,q):s).split(',').filter(x=>x!=='').map(Number);
    const [x,z,w,d,deg,code,lv]=nums; BLD.push({x,z,w,d,a:deg*Math.PI/180,code,lv:lv||0,name}); });
  BLD.forEach(b=>{ if(b.name==='Żabka'&&Math.hypot(b.x+65,b.z-42)>300) b.name='Żabka Działoszyn'; });
  const BPARTS={}; if(typeof DATA_PARTS!=='undefined'&&DATA_PARTS) DATA_PARTS.split(';').forEach(e=>{ const [i,r]=e.split(':'); BPARTS[+i]=r.split('|').map(q=>{ const [x,z,w,d]=q.split(',').map(Number); return {x,z,w,d}; }); });
  if(typeof DATA_ADDR!=='undefined'&&DATA_ADDR) DATA_ADDR.split(';').forEach(e=>{ const k=e.indexOf(':'); const b=BLD[+e.slice(0,k)]; if(!b)return; const [st2,num]=e.slice(k+1).split('|'); b.addr=(st2?st2+' ':'')+num; });
  BLD.forEach((b,i)=>{ if(BPARTS[i]) b.parts=BPARTS[i]; });
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
  const COURT=AREAS.find(a=>a.surf==='tartan'&&a.t==='lei:pitch'); COURT.pts=COURT.pts.map(p=>[p[0],p[1]+5.5]); { const c=centroid(COURT.pts); COURT.pts=COURT.pts.map(p=>[c[0]-(p[1]-c[1]),c[1]+(p[0]-c[0])]); }
  const PITCH2=AREAS.find(a=>a.sport==='multi'), TRACK=area('lei:track');
  const PARK=AREAS.find(a=>a.n==='Park w Trębaczewie'), CEM=area('lu:cemetery'), OSPA=area('am:fire_station');
  const PLAYS=AREAS.filter(a=>a.t==='lei:playground');
  const PLAC=AREAS.find(a=>a.t==='am:parking'&&a.pts[0][0]===-40&&a.pts[0][1]===-278);
  const CHURCH=BPOLY.find(b=>b.name.startsWith('Kościół'));
  [COURT,PITCH2,TRACK].forEach(a=>{ const hs=a.pts.map(v=>hRaw(v[0],v[1])); FLAT.push({p:a.pts,bb:bbox(a.pts),fe:0,h:hs.reduce((s,v)=>s+v,0)/hs.length}); });
  const flatH=a=>FLAT.find(f=>f.p===a.pts).h;

  /* ---------- renderer + efekty ---------- */
  const canvas=document.getElementById('c');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  const DPR=Math.min(window.devicePixelRatio||1,1.6); renderer.setPixelRatio(DPR);
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const ANISO=renderer.capabilities.getMaxAnisotropy();
  const scene=new THREE.Scene();
  const SUNDIR=new THREE.Vector3(-0.62,0.42,0.66).normalize();
  const DAY={hor:0xf1c79a,zen:0x3f78c2,fog:0xd9c3a3,hemiS:0xbcd4f0,hemiG:0x6b5a3a,hemi:0.62,sun:1.15,sunC:0xffd6a0,bloom:0.38,exp:0.92};
  const NIGHT={hor:0x2a2f4a,zen:0x05070f,fog:0x141826,hemiS:0x40507a,hemiG:0x10121a,hemi:0.32,sun:0.18,sunC:0x9fb4ff,bloom:1.0,exp:1.25};
  scene.fog=new THREE.Fog(DAY.fog,140,820);
  const camera=new THREE.PerspectiveCamera(60,1,0.25,4000);
  const hemi=new THREE.HemisphereLight(DAY.hemiS,DAY.hemiG,DAY.hemi); scene.add(hemi);
  const sun=new THREE.DirectionalLight(DAY.sunC,DAY.sun); sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048); const sc=sun.shadow.camera; sc.left=-70;sc.right=70;sc.top=70;sc.bottom=-70;sc.near=10;sc.far=500; sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.02;
  scene.add(sun); scene.add(sun.target);
  const playerLight=new THREE.PointLight(0xffc98a,0,55,1.6); scene.add(playerLight);
  const skyU={hor:{value:new THREE.Color(DAY.hor)},zen:{value:new THREE.Color(DAY.zen)},sunDir:{value:SUNDIR.clone()},sunC:{value:new THREE.Color(0xfff0d0)},night:{value:0}};
  const sky=new THREE.Mesh(new THREE.SphereGeometry(3000,32,16),new THREE.ShaderMaterial({uniforms:skyU,side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 hor,zen,sunC,sunDir;uniform float night;varying vec3 vD;float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}void main(){float y=max(vD.y,0.);vec3 c=mix(hor,zen,pow(y,.55));float s=max(dot(normalize(vD),normalize(sunDir)),0.);c+=sunC*(pow(s,600.)*3.+pow(s,24.)*.35+pow(s,4.)*.12)*(1.-night*.85);if(vD.y<0.)c=hor*.85;if(night>.5){vec3 q=floor(vD*420.);float st=step(.9975,h(q))*smoothstep(.05,.3,vD.y);c+=vec3(st);}gl_FragColor=vec4(c,1.);}'}));
  sky.renderOrder=-1; scene.add(sky);
  let composer=null, bloom=null, grade=null, fxaa=null;
  try{ if(THREE.EffectComposer&&THREE.UnrealBloomPass){ composer=new THREE.EffectComposer(renderer); composer.addPass(new THREE.RenderPass(scene,camera));
      bloom=new THREE.UnrealBloomPass(new THREE.Vector2(512,512),DAY.bloom,0.55,0.82); composer.addPass(bloom);
      grade=new THREE.ShaderPass({uniforms:{tDiffuse:{value:null},time:{value:0},exposure:{value:DAY.exp},night:{value:0}},
        vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:'uniform sampler2D tDiffuse;uniform float time,exposure,night;varying vec2 vUv;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb*exposure;c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,1.32);c=(c-.5)*1.14+.5;c+=vec3(.03,.008,-.025)*smoothstep(.35,1.,l)*(1.-night)+vec3(-.02,.005,.035)*(1.-smoothstep(0.,.45,l));vec2 d=vUv-.5;c*=1.-dot(d,d)*1.05;c+=(fract(sin(dot(vUv*(time+1.),vec2(12.9898,78.233)))*43758.5453)-.5)*.03;gl_FragColor=vec4(clamp(c,0.,1.),1.);}'});
      composer.addPass(grade); if(THREE.FXAAShader){ fxaa=new THREE.ShaderPass(THREE.FXAAShader); composer.addPass(fxaa); } } }catch(e){ composer=null; }
  if(!composer){ renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=0.95; }

  let GROUND=null;
  function roofColor(i){ if(typeof DATA_ROOF==='undefined')return null; const s=DATA_ROOF.substr(i*3,3); if(s.length<3)return null; const c=new THREE.Color(parseInt(s[0],16)/15,parseInt(s[1],16)/15,parseInt(s[2],16)/15); const o={}; c.getHSL(o); c.setHSL(o.h,Math.min(1,o.s*1.8),clamp(o.l*.92,.12,.78)); return '#'+c.getHexString(); }
  /* ---------- tekstura terenu ---------- */
  const WB=typeof DATA_X!=='undefined'?DATA_X.W:[-1150,950,-850,1050];
  const X0=WB[0],X1=WB[1],Z0=WB[2],Z1=WB[3], GW=X1-X0, GH=Z1-Z0;
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
    o.filter='saturate(1.45) contrast(1.06) brightness(0.74)'; o.drawImage(ORTO_IMG,ORTO.x0,ORTO.z0,ORTO_IMG.width*ORTO.mpp,ORTO_IMG.height*ORTO.mpp);
    o.filter='blur('+Math.round(70*K)+'px)'; o.globalCompositeOperation='destination-out'; o.fillStyle='rgba(0,0,0,.72)'; o.fillRect(-1100,-800,2000,1800);
    g.save(); g.setTransform(1,0,0,1,0,0); g.drawImage(oc,0,0); g.restore(); }
  const AREA_COL={'lu:cemetery':'#7d8c68','lei:park':'#6fa046','am:parking':'#7f7f7c','lei:playground':'#b8513f','lu:commercial':'#a8a291','lu:industrial':'#a39d8e','am:fire_station':'#99968d','am:school':'#86ad5c','am:kindergarten':'#8eb662','lu:construction':'#a19a8a','lei:track':'#b4553e'};
  ['lu:industrial','lu:commercial','am:school','am:kindergarten','lei:park','lu:cemetery','am:fire_station','lu:construction','am:parking','lei:playground','lei:track'].forEach(t=>AREAS.filter(a=>a.t===t).forEach(a=>{ path(a.pts,true); g.fillStyle=AREA_COL[t]; g.globalAlpha=ORTO_IMG&&(a.ext||['am:school','am:kindergarten','lei:park','lu:cemetery','lu:industrial','lu:commercial'].includes(t))?.45:1; g.fill(); g.globalAlpha=1; }));
  { g.save(); path(CEM.pts,true); g.clip(); for(let x=-260;x<60;x+=3.2)for(let z=280;z<480;z+=4.5){ g.fillStyle=rnd()<.5?'#cfcbc2':'#9e9a92'; g.fillRect(x,z,1.6,2.6);} g.restore(); }
  RAILS.forEach(p=>{ g.lineJoin='round'; path(p); g.strokeStyle='#4e6a34'; g.lineWidth=14; g.stroke(); g.strokeStyle='#857a6c'; g.lineWidth=5; g.stroke(); });
  g.lineCap='round'; g.lineJoin='round';
  ROADS.forEach(r=>{ path(r.pts); if(r.t==='track'){ g.globalAlpha=ORTO_IMG?.6:1; g.strokeStyle='#a8916a'; g.lineWidth=3.5; g.stroke(); g.globalAlpha=1; return; } g.strokeStyle='#8d8a7c'; g.lineWidth=r.w+(r.t==='srv'?1:5); g.stroke(); g.strokeStyle=r.main?'#5a5b5d':'#6b6b68'; g.lineWidth=r.w; g.stroke(); });
  const groundTex=new THREE.CanvasTexture(gc); groundTex.anisotropy=ANISO;
  function tex(w,h,draw,rep){ const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h); const t=new THREE.CanvasTexture(c); if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;} t.anisotropy=ANISO; return t; }
  const noise=(x,w,h,n,a,b,al,s)=>{ for(let i=0;i<n;i++){ const v=Math.floor(R(a,b)); x.fillStyle=`rgba(${v},${v},${v},${al})`; x.fillRect(R(0,w),R(0,h),s||1.5,s||1.5);} };
  const detailTex=tex(256,256,(x,w,h)=>{ x.fillStyle='rgb(158,158,158)'; x.fillRect(0,0,w,h); noise(x,w,h,9000,110,210,.35,2); for(let i=0;i<1400;i++){ const v=Math.floor(R(90,200)); x.strokeStyle=`rgba(${v},${v},${v},.4)`; const px=R(0,w),py=R(0,h); x.beginPath(); x.moveTo(px,py); x.lineTo(px+R(-2,2),py-R(3,7)); x.stroke(); } },true);
  function withDetail(mat,scale,strength){ mat.onBeforeCompile=sh=>{ sh.uniforms.detail={value:detailTex};
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>','#include <project_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;uniform sampler2D detail;').replace('#include <map_fragment>',`#include <map_fragment>\n diffuseColor.rgb*=mix(vec3(1.),texture2D(detail,vWP.xz*${scale.toFixed(3)}).rgb*1.62,${strength.toFixed(2)});`); }; return mat; }
  // siatka terenu 3D
  { const TX0=Math.min(-2100,X0-900),TX1=Math.max(1900,X1+900),TZ0=Math.min(-1850,Z0-900),TZ1=Math.max(1750,Z1+900), S=GW>3000?12:10; const nx=(TX1-TX0)/S, nz=(TZ1-TZ0)/S;
    const geo=new THREE.PlaneGeometry(TX1-TX0,TZ1-TZ0,nx,nz); geo.rotateX(-Math.PI/2); geo.translate((TX0+TX1)/2,0,(TZ0+TZ1)/2);
    const pos=geo.attributes.position, uv=geo.attributes.uv;
    for(let i=0;i<pos.count;i++){ const x=pos.getX(i), z=pos.getZ(i); pos.setY(i,H(x,z)); uv.setXY(i,clamp((x-X0)/GW,0,1),clamp(1-(z-Z0)/GH,0,1)); }
    geo.computeVertexNormals();
    GROUND=new THREE.Mesh(geo, withDetail(new THREE.MeshLambertMaterial({map:groundTex}),0.35,0.8)); GROUND.receiveShadow=true; scene.add(GROUND); }

  const JOINTS=[];
  /* ---------- drogi, chodniki ---------- */
  const texMain=tex(128,256,(x,w,h)=>{ x.fillStyle='#4f5153'; x.fillRect(0,0,w,h); noise(x,w,h,3000,60,120,.4); x.fillStyle='rgba(30,30,30,.25)'; x.fillRect(30,0,22,h); x.fillRect(78,0,22,h); x.fillStyle='#ecebe4'; x.fillRect(5,0,3,h); x.fillRect(120,0,3,h); x.fillRect(62,0,4,128); },true);
  const texLocal=tex(128,256,(x,w,h)=>{ x.fillStyle='#5f6062'; x.fillRect(0,0,w,h); noise(x,w,h,3000,60,125,.4); for(let i=0;i<6;i++){ x.strokeStyle='rgba(25,25,25,.35)'; x.lineWidth=1.2; x.beginPath(); let px=R(10,118),py=R(0,256); x.moveTo(px,py); for(let k=0;k<5;k++){px+=R(-8,8);py+=R(4,14);x.lineTo(px,py);} x.stroke(); } },true);
  const texTrack=tex(64,128,(x,w,h)=>{ x.fillStyle='#9c8a66'; x.fillRect(0,0,w,h); noise(x,w,h,900,90,160,.4); x.fillStyle='rgba(90,120,60,.6)'; x.fillRect(26,0,12,h); },true);
  const texPaver=tex(128,128,(x,w,h)=>{ x.fillStyle='#7f7d78'; x.fillRect(0,0,w,h); for(let r=0;r<8;r++)for(let c=0;c<8;c++){ const v=Math.floor(R(132,168)); x.fillStyle=`rgb(${v},${v-3},${v-8})`; const o=(r%2)*8; x.fillRect(((c*16+o)%w)+1,r*16+1,14,14);} },true);
  const texCurb=tex(32,64,(x,w,h)=>{ x.fillStyle='#bdbab2'; x.fillRect(0,0,w,h); x.fillStyle='#9a978f'; for(let i=0;i<h;i+=16)x.fillRect(0,i,w,1); },true);
  const texPath=tex(64,64,(x,w,h)=>{ x.fillStyle='#55575a'; x.fillRect(0,0,w,h); noise(x,w,h,900,50,120,.45); },true);
  function offsetLine(pts,o){ return pts.map((p,i)=>{ const a=pts[Math.max(0,i-1)], b=pts[Math.min(pts.length-1,i+1)]; let tx=b[0]-a[0],tz=b[1]-a[1]; const l=Math.hypot(tx,tz)||1; tx/=l;tz/=l; let s=1; if(i>0&&i<pts.length-1){ const sx=p[0]-a[0],sz=p[1]-a[1],sl=Math.hypot(sx,sz)||1; s=1/Math.max(.55,(-sz/sl)*(-tz)+(sx/sl)*tx); } return [p[0]-tz*o*s,p[1]+tx*o*s]; }); }
  // wstęga dopasowana do terenu (yo = wysokość nad gruntem)
  function ribbon(pts,w,yo,rep){ pts=resample(pts,5); const pos=[],uv=[],idx=[]; let dist=0; const n=pts.length; const L=offsetLine(pts,w/2), Rr=offsetLine(pts,-w/2);
    for(let i=0;i<n;i++){ if(i>0) dist+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]); const hc=H(pts[i][0],pts[i][1]); const hl=Math.max(H(L[i][0],L[i][1]),hc-0.6), hr=Math.max(H(Rr[i][0],Rr[i][1]),hc-0.6);
      pos.push(L[i][0],hl+yo,L[i][1], Rr[i][0],hr+yo,Rr[i][1]); uv.push(0,dist/rep,1,dist/rep); if(i>0){const k=i*2; idx.push(k-2,k,k-1, k-1,k,k+1);} }
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); geo.setIndex(idx); geo.computeVertexNormals(); return geo; }
  const po=(m,f)=>{ m.polygonOffset=true; m.polygonOffsetFactor=-f; m.polygonOffsetUnits=-f*2; return m; };
  const jointMat=po(new THREE.MeshLambertMaterial({color:0x5f6062}),1);
  const roadMat=t=>po(new THREE.MeshPhongMaterial({map:t,side:THREE.DoubleSide,shininess:18,specular:0x222222}),2);
  const matMain=roadMat(texMain), matLocal=roadMat(texLocal), matTrack=po(new THREE.MeshLambertMaterial({map:texTrack,side:THREE.DoubleSide}),1);
  const matPaver=po(new THREE.MeshLambertMaterial({map:texPaver,side:THREE.DoubleSide}),3), matCurb=po(new THREE.MeshLambertMaterial({map:texCurb,side:THREE.DoubleSide}),4);
  const texPaverRed=tex(128,128,(x,w,h)=>{ x.fillStyle='#7a463c'; x.fillRect(0,0,w,h); for(let r=0;r<8;r++)for(let c=0;c<8;c++){ const v=Math.floor(R(-14,14)); x.fillStyle=`rgb(${168+v},${88+v},${74+v})`; const o=(r%2)*8; x.fillRect(((c*16+o)%w)+1,r*16+1,14,14);} },true);
  const matPaverRed=po(new THREE.MeshLambertMaterial({map:texPaverRed,side:THREE.DoubleSide}),3);
  const SIDEWALK=new Set(['Szkolna','Zielona','Spacerowa','Zagrodowa','Sikorskiego','Kwiatowa','Północna','Zacisze','Stodulskiego','Traktorowa','Wiśniowa','Strażacka','Energetyczna','Cmentarna','Parkowa','Południowa']); SIDEWALK.delete('Zacisze');
  const WALKS=[];
  const RSEG=new Map(); ROADS.forEach(r=>{ if(r.t==='track')return; for(let i=0;i<r.pts.length-1;i++){ const a=r.pts[i],b=r.pts[i+1]; for(let gx=Math.floor(Math.min(a[0],b[0])/30)-1;gx<=Math.floor(Math.max(a[0],b[0])/30)+1;gx++)for(let gz=Math.floor(Math.min(a[1],b[1])/30)-1;gz<=Math.floor(Math.max(a[1],b[1])/30)+1;gz++){ const k=gx+','+gz; if(!RSEG.has(k))RSEG.set(k,[]); RSEG.get(k).push([r,a,b]); } } });
  const onOtherRoad=(x,z,self,m)=>(RSEG.get(Math.floor(x/30)+','+Math.floor(z/30))||[]).some(([r,a,b])=>r!==self&&segDist(x,z,a[0],a[1],b[0],b[1])<r.w/2+m);
  function splitFree(line,self,m){ const pts=resample(line,1.5), runs=[]; let cur=[]; pts.forEach(p=>{ if(onOtherRoad(p[0],p[1],self,m)){ if(cur.length>1)runs.push(cur); cur=[]; } else cur.push(p); }); if(cur.length>1)runs.push(cur); return runs.filter(r=>lineLen(r).pop()>2.5); }
  ROADS.forEach((r,ri)=>{ const y=r.main?0.1:r.t==='track'?0.03:0.06+ri*0.001;
    const m=new THREE.Mesh(ribbon(r.pts,r.w,y,r.main?14:r.t==='track'?8:10), r.main?matMain:r.t==='track'?matTrack:matLocal); m.receiveShadow=true; scene.add(m);
    if(!r.main&&r.t!=='track') r.pts.forEach(p=>JOINTS.push([p[0],H(p[0],p[1])+y-0.01,p[1],r.w/2,jointMat]));
    if(r.main||SIDEWALK.has(r.n)){ const pts=r.main?r.pts.filter(p=>p[0]>-700&&p[0]<720):r.pts; if(pts.length<2)return;
      [1,-1].forEach(s=>{ const cl=offsetLine(pts,s*(r.w/2+0.15)), sw=offsetLine(pts,s*(r.w/2+1.35));
        splitFree(cl,r,0.9).forEach(run=>scene.add(new THREE.Mesh(ribbon(run,0.3,0.17,2),matCurb)));
        splitFree(sw,r,0.6).forEach(run=>{ const p=new THREE.Mesh(ribbon(run,2.1,0.14,2.2),r.n==='Szkolna'?matPaverRed:matPaver); p.receiveShadow=true; scene.add(p); if(lineLen(run).pop()>12) WALKS.push({pts:resample(run,4),road:r}); }); }); }
  });
  WALKS.forEach(w=>w.len=lineLen(w.pts));
  const railMat=new THREE.MeshLambertMaterial({color:0x6d6e70,side:THREE.DoubleSide}), ballMat=po(new THREE.MeshLambertMaterial({color:0x8a7f72,side:THREE.DoubleSide}),1);
  const sleeperGeo=new THREE.BoxGeometry(2.4,0.16,0.24), sleeperMat=new THREE.MeshLambertMaterial({color:0x5b4a3c});
  const dum=new THREE.Object3D(), col=new THREE.Color();
  RAILS.forEach(pts=>{ const len=lineLen(pts); scene.add(new THREE.Mesh(ribbon(pts,4.2,0.14,10),ballMat));
    [-0.75,0.75].forEach(o=>scene.add(new THREE.Mesh(ribbon(offsetLine(pts,o),0.14,0.34,10),railMat)));
    const L=len[len.length-1]; const n=Math.floor(Math.min(L,2600)/0.9); const im=new THREE.InstancedMesh(sleeperGeo,sleeperMat,n);
    for(let i=0;i<n;i++){ const s=sampleLine(pts,len,i*0.9); dum.position.set(s.x,H(s.x,s.z)+0.22,s.z); dum.rotation.set(0,Math.atan2(-s.tz,s.tx)+Math.PI/2,0); dum.scale.set(1,1,1); dum.updateMatrix(); im.setMatrixAt(i,dum.matrix);} scene.add(im);
    for(let d=0;d<L;d+=55){ const s=sampleLine(pts,len,d); const x=s.x-s.tz*3.6, z=s.z+s.tx*3.6; const pole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,8,6).translate(0,4,0),railMat); pole.position.set(x,H(x,z),z); scene.add(pole); } });

  { const byMat=new Map(); JOINTS.forEach(J=>{ if(!byMat.has(J[4])) byMat.set(J[4],[]); byMat.get(J[4]).push(J); });
    byMat.forEach((list,mat)=>{ const im=new THREE.InstancedMesh(new THREE.CircleGeometry(1,18).rotateX(-Math.PI/2),mat,list.length); list.forEach((J,i)=>{ dum.position.set(J[0],J[1],J[2]); dum.rotation.set(0,0,0); dum.scale.set(J[3],1,J[3]); dum.updateMatrix(); im.setMatrixAt(i,dum.matrix); }); im.receiveShadow=true; scene.add(im); }); }
  /* ---------- budynki ---------- */
  const grid=new Map(); const CELL=24;
  function addSolid(o){ const r=o.r; for(let gx=Math.floor((o.x-r)/CELL);gx<=Math.floor((o.x+r)/CELL);gx++)for(let gz=Math.floor((o.z-r)/CELL);gz<=Math.floor((o.z+r)/CELL);gz++){const k=gx+','+gz;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(o);} }
  const near=(x,z)=>grid.get(Math.floor(x/CELL)+','+Math.floor(z/CELL))||[];
  function blocked(x,z,pr,noTree){ for(const o of near(x,z)){ if(o.off||(noTree&&o.tree))continue; if(o.poly){ if(inPoly(x,z,o.poly))return true; continue; } const dx=x-o.x,dz=z-o.z; const lx=dx*o.c+dz*o.s, lz=-dx*o.s+dz*o.c; if(Math.abs(lx)<o.hw+pr&&Math.abs(lz)<o.hd+pr)return true; } return false; }
  const WALLS=['#efe6d4','#e8dcc4','#f4eee2','#dccaa8','#ebd6b4','#d2c6b4','#f2e0bc','#ddd6cc','#cbb393','#e6d0aa','#d8dde2','#e9cba0','#f1e8d8','#c9d2c2','#e3c9b8'];
  const ROOFS=['#9a3d2a','#843424','#5a5f66','#3a3f45','#a64d33','#6e3a28','#4a4f57','#b05b3b','#2d3136','#86402f','#5a412f'];
  const inSchool=(x,z)=>inPoly(x,z,SCHOOL.pts), inKinder=(x,z)=>inPoly(x,z,KINDER.pts);
  const HALL_B=BLD.find(b=>b.isHall)||BLD.find(b=>b.code===5&&Math.max(b.w,b.d)>50);
  const houses=[];
  const CB={}; [['delik',-151,-341],['dworzec',-554,1454],['mineral',-580,1672],['swietl',-710,1630],['orlenShop',-2284,1098],['orlenRoof',-2308,1102],['biedr',-2328,973],['lidl',-2432,1186]].forEach(([k,x,z])=>{ let best=null,bd=1e9; BLD.forEach(b=>{ const d=Math.hypot(b.x-x,b.z-z); if(d<bd){bd=d;best=b;} }); if(best&&bd<8){ best.cust=k; CB[k]=best; } });
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
  const plasterTex=tex(128,128,(x,w,h)=>{ x.fillStyle='#d8d8d8'; x.fillRect(0,0,w,h); noise(x,w,h,4000,170,250,.35,1.6); x.fillStyle='rgba(0,0,0,.18)'; x.fillRect(0,h-10,w,10); x.fillStyle='rgba(0,0,0,.08)'; x.fillRect(0,0,w,3); });
  const tileTex=tex(128,128,(x,w,h)=>{ x.fillStyle='#dedede'; x.fillRect(0,0,w,h); for(let r=0;r<h;r+=8){ x.fillStyle='rgba(0,0,0,.22)'; x.fillRect(0,r,w,2); for(let c=(r/8%2)*6;c<w;c+=12){ x.fillStyle='rgba(0,0,0,.12)'; x.fillRect(c,r,1.5,8);} } noise(x,w,h,1200,150,255,.25); },true); tileTex.repeat.set(4,3);
  const boxGeo=new THREE.BoxGeometry(1,1,1).translate(0,.5,0);
  const seamTex=tex(64,64,(x,w,h)=>{ x.fillStyle='#d6d6d6'; x.fillRect(0,0,w,h); for(let i=0;i<w;i+=8){ x.fillStyle='rgba(255,255,255,.55)'; x.fillRect(i,0,1.5,h); x.fillStyle='rgba(0,0,0,.25)'; x.fillRect(i+2,0,1,h); } },true); seamTex.repeat.set(10,3);
  const L2W=(cx,cz,rot)=>(x,z)=>[cx+x*Math.cos(rot)+z*Math.sin(rot), cz-x*Math.sin(rot)+z*Math.cos(rot)];
  function bx(g,w,h,d,x,y,z,mat,noShadow){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y+h/2,z); if(!noShadow){m.castShadow=true;} m.receiveShadow=true; g.add(m); return m; }
  function pl(g,w,h,x,y,z,mat,ry){ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat); m.position.set(x,y,z); if(ry)m.rotation.y=ry; g.add(m); return m; }
  function tri(g,w,h,x,y,z,mat,ry){ const sh=new THREE.Shape([new THREE.Vector2(-w/2,0),new THREE.Vector2(w/2,0),new THREE.Vector2(0,h)]); const m=new THREE.Mesh(new THREE.ShapeGeometry(sh),mat); m.position.set(x,y,z); if(ry)m.rotation.y=ry; m.receiveShadow=true; g.add(m); return m; }
  const EXTRA_TREES=[], LOTS=[];
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
  const winTex=tex(64,80,(x,w,h)=>{ x.fillStyle='#f4f4f0'; x.fillRect(0,0,w,h); x.fillStyle='#ffffff'; x.fillRect(4,4,w-8,h-8); x.fillStyle='#d8d8d8'; x.fillRect(6,6,w-12,h-12); x.fillStyle='#f4f4f0'; x.fillRect(w/2-2,4,4,h-8); x.fillRect(4,h*0.38,w-8,3); x.fillStyle='rgba(255,255,255,.35)'; x.beginPath(); x.moveTo(8,8); x.lineTo(24,8); x.lineTo(8,30); x.fill(); });
  const wins=[], doors=[];
  houses.forEach(h=>{ if(['out','garage','farm','ind'].includes(h.kind)||(h.isPart&&Math.min(h.w,h.d)<3))return; const floors=Math.max(1,Math.round(h.h/3)); const along=h.w>=h.d; const L=along?h.w:h.d, D=along?h.d:h.w;
    const ww=h.kind==='school'||h.kind==='hall'?2.2:1.2;
    for(let f=0;f<floors;f++){ if(h.kind==='hall'&&f>0)break; const y=h.hc+(h.kind==='hall'?5.8:1.25+f*3); const n=Math.max(2,Math.floor(L/(h.kind==='school'?3.2:3.8)));
      for(let k=0;k<n;k++){ const t=-L/2+(k+.5)*(L/n); [1,-1].forEach(sd=>{ const lx=along?t:sd*(D/2+.03), lz=along?sd*(D/2+.03):t; if(f===0&&k===Math.floor(n/2)&&sd===1&&h.kind==='house'&&!h.isPart){ doors.push({h,lx,lz,rot:along?0:Math.PI/2}); return; } wins.push({h,lx,lz,y,rot:along?(sd>0?0:Math.PI):(sd>0?Math.PI/2:-Math.PI/2),ww}); }); } } });
  const winMat=new THREE.MeshPhongMaterial({color:0xffffff,map:winTex,emissive:0x000000,shininess:80,specular:0x666666});
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
  const APT=BPOLY.find(b=>b.pts[0][0]===-107&&b.pts[0][1]===-222);
  BPOLY.forEach(p=>{ if(p===CHURCH||p===APT)return; const school=p.code===5; const h=school?7.4:5; const base=p.hmin-0.5;
    extrude(p.pts,p.hc+h-base,new THREE.MeshLambertMaterial({color:school?0xf1e3c4:0xe9e4d8,map:plasterTex}),base);
    extrude(p.pts,0.6,new THREE.MeshLambertMaterial({color:school?0x5f6670:0x6a6f75}),p.hc+h);
    polyWinIMs.push(edgeWindows(p.pts,school?2:1,p.hc+1.6,school?3.2:3.6));
    if(school) extrude(p.pts,0.5,new THREE.MeshLambertMaterial({color:0xe07b39}),p.hc+3.3); });
  { const p=CHURCH.pts, m=mar(p), hc=CHURCH.hc, base=CHURCH.hmin-0.5;
    const wallM=new THREE.MeshLambertMaterial({color:0xd9d3c8,map:plasterTex}), roofM=new THREE.MeshLambertMaterial({color:0x6e4a3b,map:seamTex}), darkG=new THREE.MeshPhongMaterial({color:0x2c3a46,shininess:90,specular:0x667788}), louver=new THREE.MeshLambertMaterial({color:0x3a3d40});
    extrude(p,hc+6.5-base,wallM,base);
    // niższe nawy boczne i stromy dach nawy głównej (blacha w kolorze brązowym)
    const r1=new THREE.Mesh(gabGeo,roofM); r1.position.set(m.cx,hc+6.5,m.cz); r1.rotation.y=-m.an; r1.scale.set(m.w+.8,3.2,m.d+1.6); r1.castShadow=true; scene.add(r1);
    const NW=m.d*0.62, NH=13; const r2=new THREE.Mesh(gabGeo,roofM); r2.position.set(m.cx,hc+6.5,m.cz); r2.rotation.y=-m.an; r2.scale.set(m.w+1.2,NH,NW); r2.castShadow=true; scene.add(r2);
    const ex=Math.cos(m.an)*m.w/2, ez=Math.sin(m.an)*m.w/2; const e1=[m.cx+ex,m.cz+ez], e2=[m.cx-ex,m.cz-ez];
    const te=roadDist(DK,...e1)<roadDist(DK,...e2)?e1:e2; const dl=Math.hypot(te[0]-m.cx,te[1]-m.cz)||1; const dir=[(te[0]-m.cx)/dl,(te[1]-m.cz)/dl], perp=[-dir[1],dir[0]]; const ry=Math.atan2(dir[0],dir[1]);
    // fasada szczytowa z rozetą
    const fg=new THREE.Group(); fg.position.set(te[0]+dir[0]*.62,0,te[1]+dir[1]*.62); fg.rotation.y=ry; scene.add(fg);
    tri(fg,NW,NH,0,hc+6.5,0,wallM); bx(fg,NW,6.6+hc-base,.3,0,base,-.1,wallM);
    const rose=new THREE.Mesh(new THREE.CircleGeometry(2.4,40),darkG); rose.position.set(0,hc+10.6,.05); fg.add(rose);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(2.45,.16,8,40),new THREE.MeshLambertMaterial({color:0xbab4a8})); ring.position.set(0,hc+10.6,.08); fg.add(ring);
    for(let k=0;k<4;k++){ const sp=new THREE.Mesh(new THREE.BoxGeometry(4.8,.08,.05),ring.material); sp.position.set(0,hc+10.6,.1); sp.rotation.z=k*Math.PI/4; fg.add(sp); }
    // kruchta z daszkiem dwuspadowym i kolumnami
    const porch=new THREE.Mesh(gabGeo,roofM); porch.rotation.y=Math.PI/2; porch.scale.set(3.4,1.4,4.2); porch.position.set(0,hc+3.4,1.6); porch.castShadow=true; fg.add(porch);
    tri(fg,4.0,1.35,0,hc+3.4,3.31,wallM);
    [-1.7,1.7].forEach(x=>bx(fg,.35,3.4,.35,x,hc,3.1,new THREE.MeshLambertMaterial({color:0xf3f1ec})));
    pl(fg,2.2,2.8,0,hc+1.4,.06,new THREE.MeshLambertMaterial({color:0x4b3a2e}));
    // schody zewnętrzne i ukośne podpory z boku fasady
    for(let k=0;k<5;k++) bx(fg,3.4,.18,.35,-NW/2+.6-1.8,hc-0.9+k*.18,3.4-k*.35,new THREE.MeshLambertMaterial({color:0xb5b0a6}));
    for(let k=0;k<3;k++){ const st=new THREE.Mesh(new THREE.BoxGeometry(.3,5.2,.3),new THREE.MeshLambertMaterial({color:0xece8e0})); st.position.set(-NW/2-1.6-k*1.3,hc+2.2,1.6); st.rotation.z=.55; st.castShadow=true; fg.add(st); }
    // wolnostojąca, smukła dzwonnica z pionowymi żaluzjami
    const tx=te[0]-dir[0]*5+perp[0]*(m.d*0.5+2.6), tz=te[1]-dir[1]*5+perp[1]*(m.d*0.5+2.6); const ty=H(tx,tz);
    const tw=new THREE.Group(); tw.position.set(tx,ty,tz); tw.rotation.y=ry; scene.add(tw);
    bx(tw,5,31,5,0,-1,0,wallM);
    [[0,2.52,0],[0,-2.52,Math.PI],[2.52,0,Math.PI/2],[-2.52,0,-Math.PI/2]].forEach(([x,z,r])=>{ for(let k=-1;k<=1;k++){ const lv=new THREE.Mesh(new THREE.BoxGeometry(.35,9,.06),louver); lv.position.set(x+Math.cos(r)*k*.8,23,z-Math.sin(r)*k*.8); lv.rotation.y=r; tw.add(lv); } });
    const tr=new THREE.Mesh(gabGeo,roofM); tr.scale.set(5.6,3.4,5.6); tr.position.y=30; tw.add(tr);
    const crossM=new THREE.MeshLambertMaterial({color:0x4a4d50}); bx(tw,.22,4,.22,0,32.8,0,crossM); bx(tw,1.6,.22,.22,0,35.6,0,crossM);
    tw.traverse(o=>{ if(o.isMesh)o.castShadow=true; });
    { const fig=new THREE.Group(); const wm=new THREE.MeshLambertMaterial({color:0xf4f4f2}); const bd=new THREE.Mesh(new THREE.ConeGeometry(.42,1.9,10).translate(0,.95,0),wm); const hd=new THREE.Mesh(new THREE.SphereGeometry(.17,10,8),wm); hd.position.y=2.0; fig.add(bd,hd); fig.position.set(0,hc+9.4,.25); fg.add(fig);
      const slitM=new THREE.MeshLambertMaterial({color:0x3a3330}); [[0,2.53,0],[0,-2.53,Math.PI],[2.53,0,Math.PI/2],[-2.53,0,-Math.PI/2]].forEach(([x,z,r])=>{ const sl=new THREE.Mesh(new THREE.PlaneGeometry(1.5,20),slitM); sl.position.set(x,17.5,z); sl.rotation.y=r; tw.add(sl); });
      for(let k=0;k<7;k++){ [1,-1].forEach(sd=>{ const d=4+k*3.2; const x=te[0]+dir[0]*d+perp[0]*sd*4.2, z=te[1]+dir[1]*d+perp[1]*sd*4.2; if(!blocked(x,z,.8)&&!roadNearF(x,z,2)) EXTRA_TREES.push({x,z,s:R(.55,.7),con:true,col:'#2d5a2a'}); }); }
      const pk=[[6,-3],[6,-14],[20,-14],[20,-3]].map(([a,b2])=>[te[0]+dir[0]*a+perp[0]*b2,te[1]+dir[1]*a+perp[1]*b2]); if(!pk.some(([x,z])=>roadNearF(x,z,1))){ drape(pk,matPaverRed,0.12,1.2); LOTS.push(pk); }
      const wlk=[[te[0]+dir[0]*1,te[1]+dir[1]*1],[te[0]+dir[0]*26,te[1]+dir[1]*26]]; const wm2=new THREE.Mesh(ribbon(wlk,3.2,.11,2),matPaver); wm2.receiveShadow=true; scene.add(wm2); }
    addSolid({x:tx,z:tz,hw:2.6,hd:2.6,c:1,s:0,r:4});
    // żywopłot z tui i iglaki przed kościołem
    for(let k=0;k<9;k++){ const sd=k%2?1:-1, o=NW/2+2+Math.floor(k/2)*2.4; EXTRA_TREES.push({x:te[0]+dir[0]*7+perp[0]*sd*o,z:te[1]+dir[1]*7+perp[1]*sd*o,s:R(.55,.75),con:true,col:'#2e5427'}); }
    polyWinIMs.push(edgeWindows(p,1,hc+2.6,4.5,3)); }
  BLD.filter(b=>b.kind==='shelter').forEach(b=>{ const gB=new THREE.Group(); const mm=new THREE.MeshLambertMaterial({color:0x6b7d8c}); const roof=new THREE.Mesh(new THREE.BoxGeometry(4.5,.15,1.8),mm); roof.position.y=2.5; const back=new THREE.Mesh(new THREE.BoxGeometry(4.5,2.3,.08),new THREE.MeshPhongMaterial({color:0xaac4d6,transparent:true,opacity:.45,shininess:90})); back.position.set(0,1.25,-.8); const bench=new THREE.Mesh(new THREE.BoxGeometry(3,.1,.4),new THREE.MeshLambertMaterial({color:0x8a6a4a})); bench.position.set(0,.5,-.5);
    gB.add(roof,back,bench); gB.position.set(b.x,b.hc,b.z); const nr=nearestRoad(b.x,b.z); const a=nr.r.pts[nr.seg],c2=nr.r.pts[nr.seg+1]; gB.rotation.y=-Math.atan2(c2[1]-a[1],c2[0]-a[0]); scene.add(gB); });

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
    const gw=f.len*o.glass; frontPlane(f,y0+1.55,gw,2.6,new THREE.MeshPhongMaterial({map:glassTex,shininess:110,specular:0x8899aa,emissive:0x000000}),.05);
    // wejście z drzwiami automatycznymi
    const door=frontPlane(f,y0+1.15,2.2,2.3,new THREE.MeshPhongMaterial({color:0x2a3a44,shininess:120,specular:0xaabbcc}),.07);
    const tx=-f.nz, tz=f.nx; door.position.x+=tx*o.doorOff; door.position.z+=tz*o.doorOff;
    // daszek nad wejściem
    if(o.canopy){ const cn=new THREE.Mesh(new THREE.BoxGeometry(o.canopy,.18,1.6),new THREE.MeshLambertMaterial({color:o.canopyCol})); cn.position.set(f.x+f.nx*.8+tx*o.doorOff,y0+2.75,f.z+f.nz*.8+tz*o.doorOff); cn.rotation.y=f.rot; cn.castShadow=true; scene.add(cn); }
    // cokół, schodek i chodnik z kostki przed sklepem
    const plinth=new THREE.Mesh(new THREE.BoxGeometry(f.len+.2,.35,.1),new THREE.MeshLambertMaterial({color:0x6b6e72})); plinth.position.set(f.x+f.nx*.06,y0+.1,f.z+f.nz*.06); plinth.rotation.y=f.rot; scene.add(plinth);
    const apron=[[-f.len/2-1,0],[f.len/2+1,0],[f.len/2+1,o.apron],[-f.len/2-1,o.apron]].map(([u,v])=>[f.x+tx*u+f.nx*v,f.z+tz*u+f.nz*v]); drape(apron,shopPaver,0.12,2.2);
    // dodatki: wózki / stojak z gazetami / kosz
    (o.extras||[]).forEach(e=>{ const ex=f.x+tx*e.u+f.nx*e.v, ez=f.z+tz*e.u+f.nz*e.v; const m=e.mesh(); m.position.set(ex,H(ex,ez),ez); m.rotation.y=f.rot; m.traverse(q=>{if(q.isMesh)q.castShadow=true;}); scene.add(m); });
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
  function buildLewiatan(b){ const f0=rotFront(b,frontSide(b,ROAD_SZK)); const f={...f0,x:2*b.x-f0.x,z:2*b.z-f0.z,nx:-f0.nx,nz:-f0.nz,rot:f0.rot+Math.PI}; /* wejście od drugiej strony (obrót o 180°) */ const L=f.len, D=f.dep, FZ=D/2; const g=new THREE.Group(); g.position.set(b.x,b.hc,b.z); g.rotation.y=f.rot; scene.add(g); b.front=f;
    const low=b.hmin-0.4-b.hc, WH=3.4;
    const cream=new THREE.MeshLambertMaterial({color:0xeadfc6,map:plasterTex}), plinthM=new THREE.MeshLambertMaterial({color:0xb9ab94}), roofM=new THREE.MeshLambertMaterial({color:0x3d4248,map:tileTex}), white=new THREE.MeshLambertMaterial({color:0xf4f2ee}), brownF=new THREE.MeshLambertMaterial({color:0x5a3b28}), glassD=new THREE.MeshPhongMaterial({color:0x22303a,shininess:110,specular:0x8899aa});
    bx(g,L,WH-low,D,0,low,0,cream); bx(g,L+.06,.55-low,D+.06,0,low,0,plinthM);
    const rf=new THREE.Mesh(gabGeo,roofM); rf.scale.set(L+.8,4,D+1.4); rf.position.y=WH; rf.castShadow=true; g.add(rf);
    // dwa szczyty od frontu
    const gables=[[-L/2+4.3,8.6],[L*0.06,7.4]];
    gables.forEach(([cx,wd])=>{ bx(g,wd,WH-low,D/2+.6,cx,low,D/4+.3,cream); const r=new THREE.Mesh(gabGeo,roofM); r.rotation.y=Math.PI/2; r.scale.set(D/2+1.8,4,wd+.7); r.position.set(cx,WH,D/4+.5); r.castShadow=true; g.add(r);
      tri(g,wd,4*wd/(wd+.7),cx,WH,D/2+.62,cream); const eave=new THREE.Mesh(new THREE.BoxGeometry(wd+.8,.22,.12),white); eave.position.set(cx,WH-.05,D/2+.75); g.add(eave); });
    const GZ=D/2+.6;
    // panele fotowoltaiczne na połaci
    const run=(D+1.4)/2, ang=Math.atan2(4,run), pvM=new THREE.MeshPhongMaterial({color:0x1b2638,shininess:120,specular:0x6a7a9a});
    for(let c=0;c<7;c++)for(let r=0;r<2;r++){ const sx=L*0.06+4.4+c*1.08; if(sx>L/2-1)continue; const sp=.38+r*.3; const pv=new THREE.Mesh(new THREE.PlaneGeometry(1.02,1.6),pvM); pv.position.set(sx,WH+4*sp+.07,run*(1-sp)-.0); pv.rotation.x=ang-Math.PI/2; g.add(pv); }
    // żółty pas szyldu na daszku
    const bl=L*0.66, bxC=-L/2+.3+bl/2;
    const lewTex=tex(2048,160,(x,w,h)=>{ x.fillStyle='#f6c315'; x.fillRect(0,0,w,h); x.fillStyle='#e3a50f'; x.fillRect(0,h-12,w,12); x.textBaseline='middle'; x.textAlign='center'; const lx=w*0.40; x.fillStyle='#173e93'; x.beginPath(); x.ellipse(lx,h/2-4,62,56,0,0,7); x.fill(); x.fillStyle='#f6c315'; x.font='italic 900 92px Barlow, Arial'; x.fillText('L',lx-2,h/2-2); x.fillStyle='#173e93'; x.font='italic 900 112px Barlow, Arial'; x.textAlign='left'; x.fillText('LEWIATAN',lx+82,h/2-2); });
    const signM=new THREE.MeshLambertMaterial({map:lewTex,emissive:0x000000}); brandLights.push(signM);
    bx(g,bl,.18,1.7,bxC,2.75,GZ+.85,white); bx(g,bl,1.15,.35,bxC,2.75,GZ+1.6,new THREE.MeshLambertMaterial({color:0xf6c315}));
    pl(g,bl,1.15,bxC,2.75+.575,GZ+1.79,signM);
    // wejście, witryna z plakatami, drzwi, okna w brązowych ramach
    const ex0=-L/2+3.2; { const wD=L2W(b.x,b.z,f.rot); b.door=wD(ex0,GZ+1.5); b.doorF=wD(ex0,GZ+.3); b.doorOut=wD(ex0,GZ+2.8); } 
    { const SW=4.6, SH=2.75, fr=new THREE.MeshLambertMaterial({color:0x3b3a38}), zf=GZ+.03;
      const inside=tex(512,320,(x,w,h)=>{ const gr=x.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#d9dde0'); gr.addColorStop(.5,'#c2c7ca'); gr.addColorStop(1,'#8d9296'); x.fillStyle=gr; x.fillRect(0,0,w,h);
        for(let i=0;i<5;i++){ x.fillStyle='rgba(255,255,250,.9)'; x.fillRect(30+i*100,14,60,6); }
        const C=['#d8452a','#f2c230','#3a7bd5','#5aa34a','#e86aa0','#f5f5f0','#ff8c1a'];
        [[20,150],[150,120],[300,150],[420,110]].forEach(([sx,sw])=>{ x.fillStyle='#9aa0a6'; x.fillRect(sx,70,sw,190); for(let r=0;r<4;r++){ for(let k=0;k<sw-8;k+=9){ x.fillStyle=C[(k*7+r*3+sx)%C.length]; x.fillRect(sx+4+k,80+r*45,7,30); } x.fillStyle='#6d7276'; x.fillRect(sx,112+r*45,sw,4); } });
        x.fillStyle='#c4221e'; x.fillRect(230,180,38,26); x.fillStyle='#555'; x.fillRect(222,206,56,40);
        const rf=x.createLinearGradient(0,0,w,h); rf.addColorStop(0,'rgba(255,255,255,.28)'); rf.addColorStop(.35,'rgba(255,255,255,0)'); rf.addColorStop(.6,'rgba(255,255,255,.12)'); rf.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=rf; x.fillRect(0,0,w,h); });
      const gm=new THREE.MeshLambertMaterial({map:inside,emissive:0x2a2a28,emissiveMap:inside}); brandLights.push(gm);
      pl(g,SW,SH,ex0,SH/2,GZ+.015,gm);
      // rama: obrys, słupki przy drzwiach, nadświetle
      bx(g,SW+.16,.12,.14,ex0,SH-.06,zf,fr,true); bx(g,SW+.16,.1,.14,ex0,0,zf,fr,true); [-SW/2,SW/2,-.95,.95].forEach(u=>bx(g,.1,SH,.14,ex0+u,0,zf,fr,true)); bx(g,SW,.09,.12,ex0,2.22,zf,fr,true);
      // dwa skrzydła drzwi przesuwnych (szkło z cienką ramą)
      const leafG=new THREE.MeshPhongMaterial({color:0x9fb8c4,transparent:true,opacity:.22,shininess:120,specular:0xffffff});
      [-.47,.47].forEach(u=>{ pl(g,.9,2.15,ex0+u,1.08,zf+.04,leafG); bx(g,.05,2.15,.05,ex0+u+(u<0?.43:-.43),0,zf+.06,fr,true); bx(g,.9,.05,.05,ex0+u,2.12,zf+.06,fr,true); bx(g,.9,.05,.05,ex0+u,.03,zf+.06,fr,true); });
      // wycieraczka, plakaty z promocjami po bokach
      const mat=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.2).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0x2a2a2c})); mat.position.set(ex0,.15,GZ+.75); g.add(mat);
      const pos=tex(128,180,(x,w,h)=>{ x.fillStyle='#fff7d6'; x.fillRect(0,0,w,h); x.fillStyle='#f6c315'; x.fillRect(0,0,w,46); x.fillStyle='#173e93'; x.font='800 26px Barlow, Arial'; x.textAlign='center'; x.fillText('PROMOCJE',w/2,32); x.fillStyle='#d23a2a'; x.font='800 40px Barlow, Arial'; x.fillText('-20%',w/2,108); x.fillStyle='#333'; x.font='600 18px Barlow, Arial'; x.fillText('w tym tygodniu',w/2,150); });
      [-(SW/2+.75),SW/2+.75].forEach(u=>pl(g,.62,.86,ex0+u,1.55,GZ+.02,new THREE.MeshLambertMaterial({map:pos}))); } pl(g,1.1,2.2,-L/2+8.2,1.1,GZ+.02,brownF); pl(g,.9,2.0,-L/2+8.2,1.1,GZ+.03,glassD);
    for(let x=L*0.06+4.6;x<L/2-1;x+=3.3){ pl(g,1.45,1.15,x,1.9,D/2+.01,brownF); pl(g,1.25,.95,x,1.9,D/2+.02,glassD); }
    gables.forEach(([cx,wd],i)=>{ if(i===1){ [-1.6,1.6].forEach(o=>{ pl(g,1.45,1.15,cx+o,1.9,GZ+.01,brownF); pl(g,1.25,.95,cx+o,1.9,GZ+.02,glassD); }); } });
    for(let z=-D/2+2;z<D/2-1;z+=3.3){ [-1,1].forEach(sd=>{ const w1=pl(g,1.45,1.15,sd*(L/2+.01),1.9,z,brownF,sd*Math.PI/2); const w2=pl(g,1.25,.95,sd*(L/2+.02),1.9,z,glassD,sd*Math.PI/2); }); }
    // czerwone kosze, szafka, rowery
    const red=new THREE.MeshLambertMaterial({color:0xc62a24}); bx(g,.5,1.0,.5,ex0-3.0,0,GZ+.45,red); bx(g,.5,1.0,.5,ex0+3.1,0,GZ+.45,red);
    bx(g,.8,1.7,.5,ex0+4.4,0,GZ+.35,new THREE.MeshLambertMaterial({color:0xe6e6e2}));
    for(let k=0;k<4;k++){ const bk=bikeM(); bk.position.set(-L/2-1.5-k*.65,0,GZ+.6); bk.rotation.y=Math.PI/2+.25; g.add(bk); }
    g.traverse(o=>{ if(o.isMesh&&o.geometry.type!=='PlaneGeometry')o.castShadow=true; });
    // plac przed sklepem (kostka) + miejsca parkingowe
    const w=L2W(b.x,b.z,f.rot); const LD=(()=>{ const nr=nearestRoad(f.x+f.nx*2,f.z+f.nz*2,r=>r.t!=='track'); return clamp(nr.d+2-nr.r.w/2-2.8,5,13); })(); const lot=[[-L/2-4,FZ],[L/2+2,FZ],[L/2+2,FZ+LD],[-L/2-4,FZ+LD]].map(([x,z])=>w(x,z)); drape(lot,lotPaver,0.12,2.2); LOTS.push(lot);
    [[L*0.06+2,FZ+Math.min(8,LD-2.6)],[L*0.06+8.5,FZ+Math.min(8,LD-2.6)],[L*0.06+13,FZ+Math.min(8,LD-2.6)]].forEach(([x,z])=>{ const q=w(x,z); LEW_SPOTS.push({x:q[0],z:q[1],h:Math.atan2(-f.nz,-f.nx)}); });
  }
  function buildZabka(b){ const f=rotFront(b,frontSide(b,DK)); const L=f.len, D=f.dep, FZ=D/2; const g=new THREE.Group(); g.position.set(b.x,b.hc,b.z); g.rotation.y=f.rot; scene.add(g); b.front=f;
    const low=b.hmin-0.4-b.hc, G1=3.3, G2=2.9;
    const light=new THREE.MeshLambertMaterial({color:0xe9e9e7,map:plasterTex}), darkC=new THREE.MeshLambertMaterial({color:0x4b4f53}), white=new THREE.MeshLambertMaterial({color:0xf3f3f1,map:plasterTex}), brownC=new THREE.MeshLambertMaterial({color:0x6a5146}), roofM=new THREE.MeshLambertMaterial({color:0x3b4045,map:seamTex}), green=new THREE.MeshLambertMaterial({color:0x1f8f3d}), glassP=new THREE.MeshPhongMaterial({map:glassTex,shininess:110,specular:0x8899aa});
    bx(g,L,G1-low,D,0,low,0,light); bx(g,L,G1,.14,0,0,FZ+.07,darkC);
    pl(g,L*0.66,2.25,-L*0.05,1.25,FZ+.15,glassP); bx(g,1.3,2.5,.12,L/2-1.6,0,FZ+.16,green);
    const zTex=tex(1024,96,(x,w,h)=>{ x.fillStyle='#1d8f3e'; x.fillRect(0,0,w,h); x.fillStyle='#ffffff'; x.textBaseline='middle'; x.textAlign='center'; x.font='italic 800 78px Barlow, Arial'; x.fillText('żabka',w*.5,h/2); x.font='600 34px Barlow, Arial'; x.fillText('café',w*.86,h/2); x.font='600 30px Barlow, Arial'; x.fillText('6–23/7',w*.1,h/2); });
    const zM=new THREE.MeshLambertMaterial({map:zTex,emissive:0x000000}); brandLights.push(zM); bx(g,L*0.82,.75,.22,L*0.04,2.5,FZ+.2,green); pl(g,L*0.82,.75,L*0.04,2.875,FZ+.32,zM);
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
    const pM=new THREE.MeshLambertMaterial({map:pTex,emissive:0x000000}); brandLights.push(pM); bx(pole,1.8,.9,.12,0,4.3,0,green); pl(pole,1.8,.9,0,4.75,.07,pM); pl(pole,1.8,.9,0,4.75,-.07,pM,Math.PI);
    bx(pole,1.6,.45,.06,0,3.3,0,new THREE.MeshLambertMaterial({color:0xf2f2f2}));
    g.traverse(o=>{ if(o.isMesh&&o.geometry.type!=='PlaneGeometry'&&o.geometry.type!=='ShapeGeometry')o.castShadow=true; });
    const w=L2W(b.x,b.z,f.rot); const ap=[[-L/2-2,FZ],[L/2+2,FZ],[L/2+2,FZ+3],[-L/2-2,FZ+3]].map(([x,z])=>w(x,z)); drape(ap,lotPaver,0.12,2.2); LOTS.push(ap);
  }
  function buildApteka(p){ const m=mar(p.pts); const road=nearestRoad(m.cx,m.cz,r=>r.t!=='track').r; const f=frontSide({x:m.cx,z:m.cz,w:m.w,d:m.d,a:m.an},road); const L=f.len, D=f.dep;
    const base=p.hmin-0.6, top=p.hc+5.4; const must=new THREE.MeshLambertMaterial({color:0xdcb246,map:plasterTex}), roofM=new THREE.MeshLambertMaterial({color:0x26282b,map:tileTex});
    extrude(p.pts,top-base,must,base);
    const sk=new THREE.Mesh(hipGeo,roofM); sk.position.set(m.cx,top-.3,m.cz); sk.rotation.y=-m.an; sk.scale.set(m.w+2.4,1.3,m.d+2.4); sk.castShadow=true; scene.add(sk);
    const up=new THREE.Mesh(hipGeo,roofM); up.position.set(m.cx,top+.6,m.cz); up.rotation.y=-m.an; up.scale.set(m.w+.6,2.6,m.d+.6); up.castShadow=true; scene.add(up);
    const g=new THREE.Group(); g.position.set(m.cx,p.hc,m.cz); g.rotation.y=f.rot; scene.add(g); const FZ=D/2;
    // komin z cegły
    bx(g,.9,3.6,.9,-L*0.2,top-p.hc+.2,-D*0.15,new THREE.MeshLambertMaterial({color:0x8e4a33}));
    // daszek nad wejściem do apteki z czerwonym napisem
    const cx=L/2-3.2; const cr=new THREE.Mesh(gabGeo,roofM); cr.rotation.y=Math.PI/2; cr.scale.set(3.4,1.6,4.6); cr.position.set(cx,3.0,FZ+1.3); cr.castShadow=true; g.add(cr);
    [-2,2].forEach(o=>bx(g,.16,3.0,.16,cx+o,0,FZ+2.8,new THREE.MeshLambertMaterial({color:0x2b2d30})));
    const aTex=tex(512,128,(x,w,h)=>{ x.clearRect(0,0,w,h); x.fillStyle='#e8eef0'; x.fillRect(0,0,w,h); x.fillStyle='#d0262d'; x.font='700 92px Barlow, Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('APTEKA',w/2,h/2+4); });
    const aM=new THREE.MeshLambertMaterial({map:aTex,emissive:0x000000}); brandLights.push(aM); pl(g,2.4,.6,cx,2.6,FZ+.03,aM);
    pl(g,1.6,2.3,cx,1.15,FZ+.03,new THREE.MeshPhongMaterial({map:glassTex,shininess:100}));
    // okna z różowymi plakatami, drzwi niższej kondygnacji
    const pinkW=tex(64,64,(x,w,h)=>{ x.fillStyle='#f1f1ee'; x.fillRect(0,0,w,h); x.fillStyle='#d64a7c'; x.fillRect(6,10,w-12,h-20); });
    for(let x=-L/2+3;x<cx-3;x+=3.4) pl(g,1.3,1.1,x,2.2,FZ+.03,new THREE.MeshLambertMaterial({map:pinkW}));
    pl(g,1.1,2.1,-L/2+1.6,p.hmin-p.hc+1.05,FZ+.03,new THREE.MeshLambertMaterial({color:0xe9e9e6}));
    // poręcze i rampa
    const railM=new THREE.MeshLambertMaterial({color:0x1f2124});
    bx(g,L-4,.05,.05,-1.5,1.0,FZ+1.4,railM,true); for(let x=-L/2+1;x<L/2-4;x+=1.5) bx(g,.05,1.0,.05,x,0,FZ+1.4,railM,true);
    bx(g,6,.05,.05,L/2+3,.9,FZ+1.2,railM,true); bx(g,6,.05,.05,L/2+3,.9,FZ+2.6,railM,true);
    // ogródek skalny: iglaki, świerk srebrny, krzewy
    for(let k=0;k<10;k++){ const x=-L/2+2+k*(L-4)/9+R(-.6,.6), z=FZ+2.2+R(0,2.2); const q=L2W(m.cx,m.cz,f.rot)(x,z); EXTRA_TREES.push({x:q[0],z:q[1],s:R(.45,.8),con:rnd()<.6,col:pick(['#2e5427','#4c6e3a','#7a99a8','#6f8a4a','#7b3b4a'])}); }
    polyWinIMs.push(edgeWindows(p.pts,1,p.hc+2.2,4.2,1.2)); }
  buildLewiatan(B_LEW); buildZabka(B_ZAB); buildApteka(APT);
  if(0)brandShop(B_LEW,{h:5.2,wall:'#f1f0ec',roof:'#4d5257',road:ROAD_SZK,text:'Lewiatan',sign:'#0b7a3b',signText:'#ffffff',stripe:'#f2b705',font:'700 84px Barlow, Arial',glass:.62,doorOff:-3,canopy:4.5,canopyCol:0x0b7a3b,apron:5,
    extras:[{u:5.5,v:2.2,mesh:cartRow},{u:-7.5,v:1.6,mesh:binM},{u:-9,v:2,mesh:bikeRack}]});
  if(0)brandShop(B_ZAB,{h:4.4,wall:'#f4f3ef',roof:'#3b4045',road:DK,text:'żabka',sign:'#1e8a3a',signText:'#ffffff',stripe:'#76c043',font:'700 92px Barlow, Arial',glass:.78,doorOff:2,canopy:0,canopyCol:0,apron:4,
    extras:[{u:-4.6,v:1.4,mesh:binM}]});
  // paczkomaty (OSM: amenity=parcel_locker)
  const LOCKERS=[];
  function locker(x,z,n,road,rot90){ const nr=nearestRoad(x,z,road?(r=>r===road):(r=>r.t!=='track')); const a=nr.r.pts[nr.seg],b=nr.r.pts[nr.seg+1]; const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz); const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(L*L),0,1); const px=a[0]+dx*t,pz=a[1]+dz*t;
    let nx=px-x,nz=pz-z; const nl=Math.hypot(nx,nz)||1; nx/=nl; nz/=nl; let y=H(x,z); if(blocked(x,z,1.2)){ x+=nx*3; z+=nz*3; y=H(x,z); }
    const g=new THREE.Group(); const yel=new THREE.MeshLambertMaterial({color:0xffcd00}), grey=new THREE.MeshLambertMaterial({color:0x3c4146}), dark=new THREE.MeshLambertMaterial({color:0x1e2226});
    const W=4.2,Hh=2.1,D=.65; const body=new THREE.Mesh(new THREE.BoxGeometry(W,Hh,D).translate(0,Hh/2+.12,0),yel); g.add(body);
    const plinth=new THREE.Mesh(new THREE.BoxGeometry(W+.2,.12,D+.2).translate(0,.06,0),grey); g.add(plinth);
    const roof=new THREE.Mesh(new THREE.BoxGeometry(W+.3,.1,D+.4).translate(0,Hh+.17,.08),grey); g.add(roof);
    // siatka skrytek
    const cols=7, rows=[.5,.35,.35,.5]; let yy=.25; rows.forEach((rh,ri)=>{ for(let c=0;c<cols;c++){ if(c===3&&ri<3)continue; const dd=new THREE.Mesh(new THREE.BoxGeometry(W/cols-.06,rh-.05,.02),grey); dd.position.set(-W/2+(c+.5)*W/cols,yy+rh/2+.12,D/2+.01); g.add(dd); } yy+=rh; });
    const screen=new THREE.Mesh(new THREE.BoxGeometry(.5,.38,.03),dark); screen.position.set(0,1.38,D/2+.02); const scr=new THREE.Mesh(new THREE.PlaneGeometry(.42,.3),new THREE.MeshBasicMaterial({color:0x6fb7e8})); scr.position.set(0,1.38,D/2+.04); g.add(screen,scr);
    const label=new THREE.Mesh(new THREE.PlaneGeometry(W*.9,.22),new THREE.MeshBasicMaterial({map:signTex('PACZKOMAT','#ffcd00','#2b2f33',512,48,'800 34px Barlow, Arial')})); label.position.set(0,Hh+.02,D/2+.02); g.add(label);
    const ry=Math.atan2(nx,nz)+(rot90?Math.PI/2:0); if(rot90&&blocked(x,z,2.2)){ x+=nx*1.5; z+=nz*1.5; y=H(x,z); } g.position.set(x,y,z); g.rotation.y=ry; g.traverse(q=>{if(q.isMesh){q.castShadow=true;q.receiveShadow=true;}}); scene.add(g);
    addSolid({x,z,hw:W/2,hd:.45,c:Math.cos(-ry),s:Math.sin(-ry),r:2.3});
    // wg kolizji: obróć prostokąt zgodnie z orientacją
    LOCKERS.push({x,z,n}); }
  DATA.N.filter(n=>n[0]==='parcel_locker').forEach(n=>{ const d=Math.hypot(n[2]-B_LEW.x,n[3]-B_LEW.z), dz=Math.hypot(n[2]-B_ZAB.x,n[3]-B_ZAB.z); locker(n[2],n[3],d<40?'przy Lewiatanie':dz<40?'ul. Wyzwolenia, przy Żabce':'Trębaczew',dz<40?DK:null,dz<40); });

  /* ---------- boiska ---------- */
  function courtTex(kind){ return tex(512,360,(x,w,h)=>{
    if(kind==='tartan'){ x.fillStyle='#b5503e'; x.fillRect(0,0,w,h); noise(x,w,h,9000,120,190,.12); }
    else { x.fillStyle='#4f8a3c'; x.fillRect(0,0,w,h); for(let i=0;i<w;i+=40){x.fillStyle=i%80?'#4a8338':'#548f40';x.fillRect(i,0,40,h);} }
    x.strokeStyle='#f4f1ea'; x.lineWidth=3; const m=14; x.strokeRect(m,m,w-2*m,h-2*m); x.beginPath(); x.moveTo(w/2,m); x.lineTo(w/2,h-m); x.stroke(); x.beginPath(); x.arc(w/2,h/2,34,0,7); x.stroke();
    [m,w-m].forEach((gx,i)=>{ x.beginPath(); x.arc(gx,h/2,70,i?Math.PI/2:-Math.PI/2,i?Math.PI*1.5:Math.PI/2); x.stroke(); x.setLineDash([10,8]); x.beginPath(); x.arc(gx,h/2,100,i?Math.PI/2:-Math.PI/2,i?Math.PI*1.5:Math.PI/2); x.stroke(); x.setLineDash([]); });
    if(kind==='tartan'){ x.strokeStyle='#e9c94a'; x.lineWidth=2.5; [m,w-m].forEach((gx,i)=>{ const s=i?-1:1; x.beginPath(); x.arc(gx+s*16,h/2,90,-Math.PI/2,Math.PI/2,s<0); x.stroke(); x.strokeRect(i?gx-62:gx,h/2-22,62,44); }); } }); }
  const fenceT=tex(128,128,(x,w,h)=>{ x.clearRect(0,0,w,h); x.strokeStyle='rgba(70,78,82,.95)'; x.lineWidth=2; for(let i=-w;i<w*2;i+=16){ x.beginPath(); x.moveTo(i,0); x.lineTo(i+h,h); x.stroke(); x.beginPath(); x.moveTo(i,h); x.lineTo(i+h,0); x.stroke(); } x.lineWidth=5; x.strokeRect(0,0,w,h); },true);
  function buildCourt(a,kind,opts){ const m=mar(a.pts); const grp=new THREE.Group(); grp.position.set(m.cx,flatH(a),m.cz); grp.rotation.y=-m.an;
    const surf=new THREE.Mesh(new THREE.PlaneGeometry(m.w,m.d).rotateX(-Math.PI/2),po(new THREE.MeshLambertMaterial({map:courtTex(kind)}),2)); surf.position.y=.06; surf.receiveShadow=true; grp.add(surf);
    const FH=opts.fence, fw=m.w+2, fd=m.d+2; const steel=new THREE.MeshLambertMaterial({color:0x5c666c});
    [[fw,0,-fd/2],[fw,0,fd/2],[fd,Math.PI/2,-fw/2],[fd,Math.PI/2,fw/2]].forEach(([L,rot,o])=>{ const t=fenceT.clone(); t.needsUpdate=true; t.repeat.set(L/2.5,FH/2.5);
      const pl=new THREE.Mesh(new THREE.PlaneGeometry(L,FH),new THREE.MeshLambertMaterial({map:t,transparent:true,alphaTest:.35,side:THREE.DoubleSide})); pl.position.y=FH/2; if(rot){pl.rotation.y=rot;pl.position.x=o;}else pl.position.z=o; grp.add(pl);
      const n=Math.ceil(L/3); for(let i=0;i<=n;i++){ const po2=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,FH+.2,6).translate(0,(FH+.2)/2,0),steel); const t2=-L/2+i*L/n; if(rot)po2.position.set(o,0,t2); else po2.position.set(t2,0,o); po2.castShadow=true; grp.add(po2); } });
    const stripes=tex(16,64,(x)=>{ for(let i=0;i<8;i++){x.fillStyle=i%2?'#d92d2d':'#f4f4f4';x.fillRect(0,i*8,16,8);} }); const goalMat=new THREE.MeshLambertMaterial({map:stripes});
    [-1,1].forEach(s=>{ const gx=s*(m.w/2-0.4); [-1.5,1.5].forEach(z=>{ const p=new THREE.Mesh(new THREE.BoxGeometry(.08,2,.08).translate(0,1,0),goalMat); p.position.set(gx,0,z); grp.add(p); }); const bar=new THREE.Mesh(new THREE.BoxGeometry(.08,.08,3.08),goalMat); bar.position.set(gx,2,0); grp.add(bar);
      if(opts.hoops){ const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,3.6,8).translate(0,1.8,0),steel); pole.position.set(s*(m.w/2+.3),0,0); const brd=new THREE.Mesh(new THREE.BoxGeometry(.06,1.05,1.8),new THREE.MeshLambertMaterial({color:0xf2f2f2})); brd.position.set(s*(m.w/2-.2),3.4,0); const ring=new THREE.Mesh(new THREE.TorusGeometry(.23,.025,6,16).rotateX(Math.PI/2),new THREE.MeshLambertMaterial({color:0xe06a1f})); ring.position.set(s*(m.w/2-.5),3.05,0); grp.add(pole,brd,ring); } });
    if(opts.benches){ const bm=new THREE.MeshLambertMaterial({color:0x9a9fa3}); for(let i=0;i<3;i++){ const b=new THREE.Mesh(new THREE.BoxGeometry(2.4,.45,.5).translate(0,.22,0),bm); b.position.set(-m.w/4+i*m.w/4, 0, -m.d/2-0.4); grp.add(b);} }
    grp.traverse(o=>{ if(o.isMesh&&o!==surf) o.castShadow=true; }); scene.add(grp); return {m}; }
  const orlik=buildCourt(COURT,'tartan',{fence:4.2,hoops:true,benches:true});
  buildCourt(PITCH2,'grass',{fence:3.5,hoops:false});
  { const m=mar(TRACK.pts); const t=tex(512,64,(x,w,h)=>{ x.fillStyle='#b4553e'; x.fillRect(0,0,w,h); x.strokeStyle='#f1ede4'; x.lineWidth=2; for(let i=1;i<4;i++){x.beginPath();x.moveTo(0,i*h/4);x.lineTo(w,i*h/4);x.stroke();} });
    const s=new THREE.Mesh(new THREE.PlaneGeometry(m.w,m.d).rotateX(-Math.PI/2),po(new THREE.MeshLambertMaterial({map:t}),2)); s.position.set(m.cx,flatH(TRACK)+.05,m.cz); s.rotation.y=-m.an; scene.add(s); }

  /* ---------- powierzchnie utwardzone (parkingi, plac przy parku) ---------- */
  function drape(pts,mat,yo,uvs){ const sh=new THREE.Shape(pts.map(p=>new THREE.Vector2(p[0],-p[1]))); const geo=new THREE.ShapeGeometry(sh); geo.rotateX(-Math.PI/2); const pos=geo.attributes.position, uv=geo.attributes.uv;
    for(let i=0;i<pos.count;i++){ const x=pos.getX(i), z=pos.getZ(i); pos.setY(i,H(x,z)+yo); uv.setXY(i,x/uvs,z/uvs); } geo.computeVertexNormals(); const m=new THREE.Mesh(geo,mat); m.receiveShadow=true; scene.add(m); return m; }
  const paverArea=po(new THREE.MeshLambertMaterial({map:texPaver,side:THREE.DoubleSide}),3);
  AREAS.filter(a=>a.t==='am:parking').forEach(a=>drape(resample(a.pts,4),paverArea,0.13,2.2));

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
    }); }
  /* ---------- OSP Trębaczew (wg zdjęcia) ---------- */
  let OSP_YARD=null;
  function buildOSP(){ const b=BLD.find(q=>q.kind==='osp'); if(!b)return; const ST=ROADS.find(r=>r.n==='Strażacka')||nearestRoad(b.x,b.z).r; const f=frontSide(b,ST); const L=f.len, D=f.dep, FZ=D/2;
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
    pl(g,Math.min(L-1,15.5),.72,0,H1+.55,FZ+.04,new THREE.MeshLambertMaterial({map:sTex,transparent:true}));
    // białe okna piętra
    const wM=new THREE.MeshPhongMaterial({map:winTex,shininess:80,specular:0x666666,color:0xb8c4cc});
    const n=Math.max(3,Math.floor(L/3)); for(let k=0;k<n;k++){ const x=-L/2+(k+.5)*L/n; pl(g,1.3,1.25,x,H1+2.05,FZ+.04,wM); pl(g,1.3,1.25,x,H1+2.05,-FZ-.04,wM,Math.PI); }
    const m=Math.max(2,Math.floor(D/3.4)); for(let k=0;k<m;k++){ const z=-D/2+(k+.5)*D/m; pl(g,1.3,1.25,L/2+.04,H1+1.75,z,wM,Math.PI/2); if(z<-D/2+4)continue; pl(g,1.3,1.25,-L/2-.04,H1+1.75,z,wM,-Math.PI/2); pl(g,1.1,1.1,L/2+.04,1.9,z,wM,Math.PI/2); }
    // zewnętrzne metalowe schody po lewej
    { const sx=-L/2-.65, zTop=-D/2+2.6, run=5.6, N=17; for(let k=0;k<N;k++){ const t=(k+1)/N; bx(g,1.0,.06,.38,sx,H1*t-.06,zTop+run*(1-t),metal,true); }
      const ang=Math.atan2(H1,run); [-.52,.52].forEach(o=>{ const s=new THREE.Mesh(new THREE.BoxGeometry(.06,.18,Math.hypot(run,H1)),metal); s.position.set(sx+o,H1/2,zTop+run/2); s.rotation.x=ang; g.add(s); const r=s.clone(); r.position.y+=1; g.add(r); });
      bx(g,1.1,.08,2.1,sx,H1-.08,-D/2+1.5,metal); bx(g,.05,1.0,2.1,sx-.53,H1,-D/2+1.5,metal,true); bx(g,.08,H1,.08,sx-.5,0,-D/2+.6,metal); bx(g,.08,H1,.08,sx-.5,0,zTop+run-.2,metal);
      pl(g,1.0,2.1,-L/2-.04,H1+1.05,-D/2+1.5,new THREE.MeshLambertMaterial({color:0x6b6f72}),-Math.PI/2); }
    g.traverse(o=>{ if(o.isMesh&&o.geometry.type!=='PlaneGeometry')o.castShadow=true; });
    // plac z kostki przed bramami, maszt z flagą na trawniku, ogrodzenie z siatki z bramą przesuwną
    const w=L2W(b.x,b.z,f.rot); const toRoad=clamp(roadDist(ST,f.x,f.z)-ST.w/2-1.2,4,22);
    const yard=[[-L/2,FZ],[L/2-.0,FZ],[L/2,FZ+toRoad],[-L/2+5.2,FZ+toRoad],[-L/2+.5,FZ+toRoad*.5]].map(([x,z])=>w(x,z)); drape(yard,lotPaver,0.13,2.2); LOTS.push(yard); OSP_YARD={w,L,FZ,toRoad,f};
    { const q=w(-L/2-2.5,FZ+toRoad*.55); const fg=new THREE.Group(); fg.position.set(q[0],H(q[0],q[1]),q[1]); fg.rotation.y=f.rot; scene.add(fg); const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,8,8).translate(0,4,0),white); pole.castShadow=true; fg.add(pole);
      const flag=tex(64,40,(x,w,h)=>{ x.fillStyle='#ffffff'; x.fillRect(0,0,w,h/2); x.fillStyle='#d4213d'; x.fillRect(0,h/2,w,h/2); }); const fm=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.9,6,1),new THREE.MeshLambertMaterial({map:flag,side:THREE.DoubleSide})); fm.position.set(.78,7.4,0); fg.add(fm); OSP_FLAG=fm; }
    const steelM=new THREE.MeshLambertMaterial({color:0x6c7478}), concM=new THREE.MeshLambertMaterial({color:0xa9a69e,map:detailTex});
    const fenceRun=(a,bq,gate)=>{ const dx=bq[0]-a[0],dz=bq[1]-a[1],Ln=Math.hypot(dx,dz); if(Ln<.5)return; const an=Math.atan2(dz,dx); const cx=(a[0]+bq[0])/2,cz=(a[1]+bq[1])/2,y=H(cx,cz);
      const base=new THREE.Mesh(new THREE.BoxGeometry(Ln,.35,.18),concM); base.position.set(cx,y+.1,cz); base.rotation.y=-an; base.castShadow=true; scene.add(base);
      const t=fenceT.clone(); t.needsUpdate=true; t.repeat.set(Ln/1.2,1.2); const mesh=new THREE.Mesh(new THREE.PlaneGeometry(Ln,1.4),new THREE.MeshLambertMaterial({map:t,transparent:true,alphaTest:.35,side:THREE.DoubleSide,color:0x9aa2a6})); mesh.position.set(cx,y+1.0,cz); mesh.rotation.y=-an; scene.add(mesh);
      for(let k=0;k<=Math.ceil(Ln/2.5);k++){ const tt=k/Math.ceil(Ln/2.5); const p=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,1.8,6).translate(0,.9,0),steelM); p.position.set(a[0]+dx*tt,H(a[0]+dx*tt,a[1]+dz*tt),a[1]+dz*tt); scene.add(p); }
      addSolid({x:cx,z:cz,hw:Ln/2,hd:.12,c:Math.cos(an),s:Math.sin(an),r:Ln/2+.3}); };
    const FZF=FZ+toRoad+.6, gx0=-L/2+.2, gx1=L/2+.2;      // brama przesuwna (otwarta) na szerokość placu
    fenceRun(w(-L/2-7,FZF),w(gx0,FZF)); fenceRun(w(gx1,FZF),w(L/2+3,FZF));
    { const gg=new THREE.Group(); const q=w((gx0+gx1)/2-L*.55,FZF+.35); gg.position.set(q[0],H(q[0],q[1]),q[1]); gg.rotation.y=f.rot; scene.add(gg); const GL=gx1-gx0;
      bx(gg,GL,.08,.08,0,1.55,0,steelM); bx(gg,GL,.08,.08,0,.15,0,steelM); for(let x=-GL/2;x<=GL/2;x+=.14) bx(gg,.03,1.4,.03,x,.15,0,steelM,true); }
    fenceRun(w(-L/2-7,FZF),w(-L/2-7,-FZ-2));
    // ogrodzenie z płyt betonowych po prawej
    { const a=w(L/2+3,FZF), c=w(L/2+3,-FZ-3); const dx=c[0]-a[0],dz=c[1]-a[1],Ln=Math.hypot(dx,dz),an=Math.atan2(dz,dx); const N=Math.ceil(Ln/2);
      for(let k=0;k<N;k++){ const x=a[0]+dx*(k+.5)/N, z=a[1]+dz*(k+.5)/N; const p=new THREE.Mesh(new THREE.BoxGeometry(Ln/N-.06,1.9,.1),concM); p.position.set(x,H(x,z)+.95,z); p.rotation.y=-an; p.castShadow=true; scene.add(p); const ps=new THREE.Mesh(new THREE.BoxGeometry(.18,2.05,.18),concM); ps.position.set(a[0]+dx*k/N,H(x,z)+1.0,a[1]+dz*k/N); scene.add(ps); }
      addSolid({x:(a[0]+c[0])/2,z:(a[1]+c[1])/2,hw:Ln/2,hd:.12,c:Math.cos(an),s:Math.sin(an),r:Ln/2+.3}); }
  }
  let OSP_FLAG=null;
  buildPrzedszkole(); buildOSP();

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
    pl(g,6.0,1.0,cx,WH-.4,D/2+2.93,new THREE.MeshLambertMaterial({map:prem,emissive:0x000000}));
    const dlk=tex(1024,128,(x,w2,h2)=>{ x.fillStyle='#c8262c'; x.fillRect(0,0,w2,h2); x.fillStyle='#fff'; x.font='700 92px Georgia, serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('DELIKATESY',w2/2,h2/2+4); });
    const dM=new THREE.MeshLambertMaterial({map:dlk,emissive:0x000000}); brandLights.push(dM); pl(g,Math.min(9,L*.42),1.1,L*.27,WH-.75,D/2+.03,dM);
    pl(g,2.4,2.4,cx,FL+1.2,D/2+1.22,glassDk);
    // okna: parter z plakatami po prawej, brązowe ramy po lewej
    const post=tex(64,64,(x,w2,h2)=>{ x.fillStyle='#f3e7d6'; x.fillRect(0,0,w2,h2); x.fillStyle='#c0392b'; x.fillRect(6,8,24,18); x.fillStyle='#e9b77a'; x.fillRect(34,30,24,26); x.fillStyle='#7a4a2a'; x.fillRect(4,38,26,16); });
    [L*.17,L*.37].forEach(x=>{ pl(g,2.5,1.9,x,FL+1.4,D/2+.02,brownFr); pl(g,2.3,1.7,x,FL+1.4,D/2+.03,new THREE.MeshLambertMaterial({map:post})); });
    for(let x=-L/2+1.6;x<cx-3.5;x+=2.4) frameWin(g,x,FL+1.6,D/2+.02,1.1,1.3);
    sideWins(g,L,D,FL+1.6,3.2);
    // schody i poręcze, podjazd wzdłuż prawej części
    const stoneM=new THREE.MeshLambertMaterial({color:0x8f8278});
    for(let k=0;k<6;k++) bx(g,5.4-k*.15,FL*(6-k)/6,.42,cx,0+(FL*(6-k)/6-FL)*0,D/2+2.9+k*.42,stoneM,true);
    bx(g,5.6,FL,1.1,cx,0,D/2+2.6,stoneM);
    [-2.6,2.6].forEach(o=>{ const rl=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,3.2),steelG); rl.position.set(cx+o,FL+.6,D/2+4.4); rl.rotation.x=.28; g.add(rl); });
    bx(g,L*.42,.05,.05,L*.27,FL+1.0,D/2+1.5,steelG,true); for(let x=L*.06;x<L*.48;x+=1.6) bx(g,.05,1.0,.05,x,FL,D/2+1.5,steelG,true);
    bx(g,L*.44,FL,1.6,L*.27,0,D/2+.8,stoneM);
    sh(g); const lot=[[-L/2-2,FZ],[L/2+2,FZ],[L/2+2,FZ+10],[-L/2-2,FZ+10]].map(([x,z])=>w(x,z)); drape(lot,lotPaver,0.12,2.2); LOTS.push(lot); }

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
    pl(g,2.2,.45,mx,3.9,D/2+.03,new THREE.MeshLambertMaterial({map:signTex('Działoszyn','#a3482f','#f0e2c8',256,52,'italic 600 30px Georgia, serif')}));
    bx(g,1.8,.5,.1,wx-WL/2+1,2.7,D*.32+.1,new THREE.MeshLambertMaterial({color:0x3f9a4a}));
    sideWins(g,ML,D,5.2,3.4,wf,(sd,z)=>sd>0); sh(g);
    const lot=[[-L/2-8,FZ],[L/2+6,FZ],[L/2+6,FZ+14],[-L/2-8,FZ+14]].map(([x,z])=>w(x,z)); drape(lot,asphaltM,0.12,4); LOTS.push(lot);
    for(let k=0;k<3;k++){ const q=w(-L/2-6+k*8,FZ+16); EXTRA_TREES.push({x:q[0],z:q[1],s:R(1.6,2.0),con:false,tall:true}); } }

  // --- biurowiec Zakładu Kredowego „Minerał” (Kolejowa 17): żółty, piętrowy, płaski dach, kraty w parterze ---
  function buildMineral(b){ const {f,g,L,D,FZ,low,w}=groupAt(b,nearRoad(b,/Kolejowa/)); const HH=6.8;
    const yel=new THREE.MeshLambertMaterial({color:0xe6c35c,map:plasterTex}), brn=new THREE.MeshLambertMaterial({color:0x5a3a2a});
    bx(g,L,HH-low,D,0,low,0,yel); bx(g,L+.05,.6-low,D+.05,0,low,0,brn); bx(g,L+.5,.4,D+.5,0,HH,0,brn); bx(g,L-.3,.2,D-.3,0,HH+.2,0,new THREE.MeshLambertMaterial({color:0x4a4d50}));
    const n=Math.max(4,Math.floor(L/2.6)); for(let k=0;k<n;k++){ const x=-L/2+(k+.5)*L/n; frameWin(g,x,4.7,D/2+.02,1.15,1.4,0,whiteM); frameWin(g,x,1.8,D/2+.02,1.15,1.4,0,whiteM); for(let i=-2;i<=2;i++) bx(g,.04,1.4,.04,x+i*.25,1.1,D/2+.06,steelG,true); frameWin(g,x,4.7,-D/2-.02,1.15,1.4,Math.PI,whiteM); }
    bx(g,2.4,.15,1.2,-L*.18,3.0,D/2+.6,brn);
    pl(g,3.4,.9,-L*.32,3.5,D/2+.04,new THREE.MeshLambertMaterial({map:tex(512,128,(x,w2,h2)=>{ x.fillStyle='#f4f4f0'; x.fillRect(0,0,w2,h2); x.strokeStyle='#c22'; x.lineWidth=6; x.strokeRect(4,4,w2-8,h2-8); x.fillStyle='#c4221e'; x.font='italic 800 70px Barlow, Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('MINERAŁ',w2/2,h2/2+4); })}));
    sideWins(g,L,D,4.7,3,whiteM); sh(g);
    // portiernia i plac
    const pq=w(-L/2-9,FZ+3); const pg=new THREE.Group(); pg.position.set(pq[0],H(pq[0],pq[1]),pq[1]); pg.rotation.y=f.rot; scene.add(pg); bx(pg,5,3,4,0,-.3,0,yel); bx(pg,5.6,.3,4.6,0,2.7,0,new THREE.MeshLambertMaterial({color:0x5a5e62})); frameWin(pg,0,1.5,2.02,1.2,1.1,0,whiteM); addSolid({x:pq[0],z:pq[1],hw:2.5,hd:2,c:Math.cos(-f.rot+Math.PI/2),s:Math.sin(-f.rot+Math.PI/2),r:3.3}); sh(pg);
    const lot=[[-L/2-14,FZ],[L/2+8,FZ],[L/2+8,FZ+16],[-L/2-14,FZ+16]].map(([x,z])=>w(x,z)); drape(lot,asphaltM,0.12,4); LOTS.push(lot);
    [L*.15,L*.15+3,L*.15+6].forEach(x=>{ const q=w(x,FZ+5); LEW_SPOTS.push({x:q[0],z:q[1],h:Math.atan2(-f.nz,-f.nx)}); }); }

  // --- świetlica sołectwa Stacja (Słoneczna 14): biała, dwuspadowy brązowy dach, plac z czerwonej kostki, zielona siatka, parasol ---
  function buildSwietlica(b){ const {f,g,L,D,FZ,low,w}=groupAt(b,nearRoad(b,/Słoneczna|Dojazdowa/)); const HS=3.4;
    bx(g,L,HS-low,D,0,low,0,new THREE.MeshLambertMaterial({color:0xf1f1ec,map:plasterTex})); bx(g,L+.05,.5-low,D+.05,0,low,0,new THREE.MeshLambertMaterial({color:0x9c9a94}));
    const rf=new THREE.MeshLambertMaterial({color:0x5a3a2c,map:tileTex}); gableRoof(g,D+1.2,L+1.0,2.6,HS,rf,0,0,Math.PI/2);
    tri(g,L,2.4,0,HS,D/2+.02,new THREE.MeshLambertMaterial({color:0xf1f1ec})); bx(g,L+.9,.25,.15,0,HS-.1,D/2+.5,new THREE.MeshLambertMaterial({color:0x7a5030}));
    pl(g,1.8,.6,0,HS+.8,D/2+.05,new THREE.MeshLambertMaterial({map:signTex('10-lecie','#ffffff','#c4221e',256,84,'800 52px Barlow, Arial')}));
    const shut=new THREE.MeshLambertMaterial({color:0x6e7378}); [-L*.28,L*.28].forEach(x=>{ pl(g,1.5,1.5,x,1.8,D/2+.03,shut); }); pl(g,1.1,2.2,0,1.1,D/2+.03,glassDk);
    sideWins(g,L,D,1.8,3,shut); sh(g);
    const plaza=[[-L/2-3,FZ],[L/2+8,FZ],[L/2+8,FZ+12],[-L/2-3,FZ+12]].map(([x,z])=>w(x,z)); drape(plaza,matPaverRed,0.13,1.2); LOTS.push(plaza);
    const blue=po(new THREE.MeshLambertMaterial({color:0x3f7fd0}),4); { const q=w(L/2+3.5,FZ+6); const m=new THREE.Mesh(new THREE.PlaneGeometry(3.6,5).rotateX(-Math.PI/2),blue); m.position.set(q[0],H(q[0],q[1])+.16,q[1]); m.rotation.y=f.rot; scene.add(m); }
    const greenM=new THREE.MeshLambertMaterial({color:0x2f7a3a}); const t=fenceT.clone(); t.needsUpdate=true; t.repeat.set(10,1);
    const fg=new THREE.Group(); const q0=w(0,FZ+12.4); fg.position.set(q0[0],H(q0[0],q0[1]),q0[1]); fg.rotation.y=f.rot; scene.add(fg);
    const net=new THREE.Mesh(new THREE.PlaneGeometry(L+11,1.6),new THREE.MeshLambertMaterial({map:t,transparent:true,alphaTest:.35,side:THREE.DoubleSide,color:0x3f8a4a})); net.position.set(2.5,.8,0); fg.add(net);
    for(let x=-L/2-3;x<=L/2+8;x+=2.5) bx(fg,.07,1.7,.07,x,0,0,greenM,true);
    { const q=w(L/2-1,FZ+5); const u=new THREE.Group(); u.position.set(q[0],H(q[0],q[1]),q[1]); scene.add(u); bx(u,.08,2.6,.08,0,0,0,whiteM); const cn=new THREE.Mesh(new THREE.ConeGeometry(2.4,.9,8,1,true),new THREE.MeshLambertMaterial({color:0x2f7a3a,side:THREE.DoubleSide})); cn.position.y=2.6; u.add(cn); sh(u); }
    addSolid({x:q0[0],z:q0[1],hw:(L+11)/2,hd:.1,c:Math.cos(-f.rot+Math.PI/2),s:Math.sin(-f.rot+Math.PI/2),r:(L+11)/2}); }

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
  { const cc=centroid(COURT.pts); const sz=ROADS.filter(r=>r.n==='Szkolna');
    outer: for(const r of sz){ for(let d=0;d<r.L;d+=6){ const s=sampleLine(r.pts,r.len,d); if(Math.hypot(s.x-cc[0],s.z-cc[1])>140)continue;
      for(const sd of [1,-1]){ const nx=-s.tz*sd, nz=s.tx*sd, o=r.w/2+4.5+11; const cx=s.x+nx*o, cz=s.z+nz*o; let ok=true;
        for(let u=-14;u<=14&&ok;u+=3.5)for(let v=-10;v<=10&&ok;v+=3.5){ const x=cx+s.tx*u+nx*v, z=cz+s.tz*u+nz*v; if(blocked(x,z,.5)||ROADS.some(q=>q.t!=='track'&&roadDist(q,x,z)<q.w/2+1.5)||inPoly(x,z,COURT.pts)||LOTS.some(l=>inPoly(x,z,l))) ok=false; }
        if(ok){ TIR_LOT={x:cx,z:cz,tx:s.tx,tz:s.tz,nx,nz}; break outer; } } } }
    if(TIR_LOT){ const {x,z,tx,tz,nx,nz}=TIR_LOT; const P=[[-14,-10],[14,-10],[14,10],[-14,10]].map(([u,v])=>[x+tx*u+nx*v,z+tz*u+nz*v]); drape(resample([...P,P[0]],3).slice(0,-1),gravelM,0.1,3); LOTS.push(P); } }

  // --- przejazd kolejowy na DK42 (rogatki, sygnalizatory, żółte barierki, ekrany akustyczne) ---
  const CROSS=[];
  function buildCrossing(x,z){ const nr=nearestRoad(x,z,r=>r===DK); const a=DK.pts[nr.seg],b=DK.pts[nr.seg+1]; let dx=b[0]-a[0],dz=b[1]-a[1]; const l=Math.hypot(dx,dz); dx/=l; dz/=l; const nx=-dz,nz=dx; const hw=DK.w/2;
    const rub=po(new THREE.MeshLambertMaterial({color:0x2a2c2e,map:detailTex}),6); const rp=new THREE.Mesh(new THREE.PlaneGeometry(DK.w+2,9).rotateX(-Math.PI/2),rub); rp.position.set(x,H(x,z)+.16,z); rp.rotation.y=Math.atan2(nx,nz); scene.add(rp);
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
      bx(g,3,.25,3,-1,0,2,wood); const sand=new THREE.Mesh(new THREE.PlaneGeometry(2.7,2.7).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0xe6d6a8})); sand.position.set(-1,.2,2); g.add(sand);
      // wkopane opony
      for(let k=0;k<4;k++){ const t=new THREE.Mesh(new THREE.TorusGeometry(.35,.12,8,16),dark); t.position.set(3+k*.8,.12,2.5); g.add(t); }
      // mały biały garaż z brązowymi drzwiami
      const ga=new THREE.Group(); ga.position.set(-5,0,3.5); g.add(ga); bx(ga,3,2.4,4,0,0,0,new THREE.MeshLambertMaterial({color:0xeeeeea,map:plasterTex})); bx(ga,3.3,.2,4.3,0,2.4,0,new THREE.MeshLambertMaterial({color:0x6b3a2a})); pl(ga,2.2,1.9,0,.95,2.02,new THREE.MeshLambertMaterial({color:0x6b4430}));
      sh(g); [[-3.5,-2.5,1.3],[-5,3.5,2.3]].forEach(([u,v,r2])=>addSolid({x:gx+u,z:gz+v,hw:r2,hd:r2,c:1,s:0,r:r2*1.5}));
      // iglaki i brzozy dookoła
      for(let k=0;k<7;k++){ const a=k/7*6.28, rr=7.5; const x=gx+Math.cos(a)*rr, z=gz+Math.sin(a)*rr; if(inPoly(x,z,KINDER.pts)&&!blocked(x,z,1)) EXTRA_TREES.push({x,z,s:R(.8,1.1),con:k%2===0,col:k%2?'#7a8a3a':'#2d5a2a'}); }
      // zielona siatka panelowa z furtką od strony ulicy
      const t=fenceT.clone(); t.needsUpdate=true; t.repeat.set(8,1); const net=new THREE.Mesh(new THREE.PlaneGeometry(16,1.5),new THREE.MeshLambertMaterial({map:t,transparent:true,alphaTest:.35,side:THREE.DoubleSide,color:0x3f8a4a})); net.position.set(0,.75,6.5); g.add(net); for(let x=-8;x<=8;x+=2.5) bx(g,.07,1.6,.07,x,0,6.5,new THREE.MeshLambertMaterial({color:0x2f7a3a}),true); addSolid({x:gx,z:gz+6.5,hw:8,hd:.1,c:1,s:0,r:8.5}); } }
  if(CB.delik) buildDelikatesy(CB.delik); if(CB.dworzec) buildDworzec(CB.dworzec); if(CB.mineral) buildMineral(CB.mineral); if(CB.swietl) buildSwietlica(CB.swietl); buildParkParkowa();
  /* ---------- ogrodzenia wzdłuż granic działek (ULDK) ---------- */
  const KBB=bbox(KINDER.pts); const noFence=(x,z)=>(x>KBB[0]-4&&x<KBB[2]+7&&z>KBB[1]-4&&z<KBB[3]+4)||LOTS.some(l=>inPoly(x,z,l))||LOCKERS.some(l=>Math.hypot(l.x-x,l.z-z)<7)||[B_LEW,B_ZAB].some(b=>Math.hypot(b.x-x,b.z-z)<Math.hypot(b.w,b.d)/2+7)||[SCHOOL,KINDER,PARK,CEM,OSPA].some(a=>inPoly(x,z,a.pts))||[COURT,PITCH2].some(a=>{const c=centroid(a.pts);return Math.hypot(x-c[0],z-c[1])<35;});
  const roadNear=(x,z,m)=>ROADS.some(r=>r.t!=='track'&&roadDist(r,x,z)<r.w/2+m);
  const GAPS=[], GATES=[], DRIVE_SPOTS=[];
  { const front=[], side=[]; const seen=new Set();
    PARCELS.forEach(pc=>{ if(!pc.res)return; const p=pc.p;
      for(let i=0;i<p.length;i++){ const a=p[i], b=p[(i+1)%p.length]; const L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L<1.5||L>220)continue;
        const key=[Math.round(a[0]),Math.round(a[1]),Math.round(b[0]),Math.round(b[1])]; const k1=key.join(','), k2=[key[2],key[3],key[0],key[1]].join(','); if(seen.has(k1)||seen.has(k2))continue; seen.add(k1);
        const mx=(a[0]+b[0])/2, mz=(a[1]+b[1])/2; if(noFence(mx,mz))continue;
        const isFront=roadNear(mx,mz,4.5); const n=Math.max(1,Math.round(L/2.5)); const tx=(b[0]-a[0])/L, tz=(b[1]-a[1])/L; const ang=Math.atan2(tz,tx);
        for(let k=0;k<n;k++){ const t0=k/n, t1=(k+1)/n; const cx=a[0]+(b[0]-a[0])*(t0+t1)/2, cz=a[1]+(b[1]-a[1])*(t0+t1)/2;
          if(isFront&&n>3&&Math.abs((t0+t1)/2-.5)<1.6/L+.5/n){ (pc.gaps=pc.gaps||[]).push([a,b,t0,t1,i]); continue; }           // brama
          if(roadNear(cx,cz,isFront?0.4:1.2))continue; { const ex=a[0]+(b[0]-a[0])*t0, ez=a[1]+(b[1]-a[1])*t0, fx=a[0]+(b[0]-a[0])*t1, fz=a[1]+(b[1]-a[1])*t1; if(roadNear(ex,ez,.25)||roadNear(fx,fz,.25))continue; } if(blocked(cx,cz,.15)||noFence(cx,cz))continue;
          (isFront?front:side).push([cx,cz,ang,L/n]); } } });
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
  { const gm=new THREE.MeshLambertMaterial({color:0x2f3532}), pm=new THREE.MeshLambertMaterial({color:0x8f8a82,map:plasterTex});
    const G2=(geo,a,b,c,x,y,z)=>geo.clone().translate(x,y,z); const leafGeo=(()=>{ const P=[[G2(new THREE.BoxGeometry(1,.06,.05),1,1,1,.5,1.38,0),0xffffff],[G2(new THREE.BoxGeometry(1,.06,.05),1,1,1,.5,.12,0),0xffffff],[G2(new THREE.BoxGeometry(.05,1.32,.05),1,1,1,.02,.75,0),0xffffff],[G2(new THREE.BoxGeometry(.05,1.32,.05),1,1,1,.98,.75,0),0xffffff]];
      for(let x=.12;x<.95;x+=.11) P.push([G2(new THREE.BoxGeometry(.022,1.26,.022),1,1,1,x,.75,0),0xffffff]); return mergeParts(P); })();
    GAPS.forEach(gp=>{ const {x0,z0,G,tx,tz,nx,nz}=gp; const y=H(x0+tx*G/2,z0+tz*G/2); const ang=Math.atan2(tz,tx);
      const g=new THREE.Group(); g.position.set(x0,y,z0); g.rotation.y=-ang; scene.add(g);
      [0,G].forEach(u=>{ const p=new THREE.Mesh(new THREE.BoxGeometry(.3,1.7,.3),pm); p.position.set(u,.85,0); p.castShadow=true; g.add(p); });
      const leaves=[]; const mk=(u0,w,dir,kind)=>{ const piv=new THREE.Group(); piv.position.set(u0,0,0); g.add(piv); const m=new THREE.Mesh(leafGeo,gm); m.scale.set(w*dir,1,1); m.castShadow=true; piv.add(m);
        const cx=x0+tx*(u0+dir*w/2), cz=z0+tz*(u0+dir*w/2); const sol={x:cx,z:cz,hw:w/2,hd:.08,c:Math.cos(ang),s:Math.sin(ang),r:w/2+.2}; addSolid(sol); return {piv,dir,sol,kind,open:false,cur:0}; };
      const items=[];
      if(G>=3.6){ const fw=1.0, bw=G-fw-.3; const half=bw/2; items.push({kind:'brama',leaves:[mk(.15,half,1,'brama'),mk(.15+bw,half,-1,'brama')],cx:x0+tx*(.15+bw/2),cz:z0+tz*(.15+bw/2)}); items.push({kind:'furtka',leaves:[mk(G-.15-fw,fw,1,'furtka')],cx:x0+tx*(G-.15-fw/2),cz:z0+tz*(G-.15-fw/2)});
        if(rnd()<.38){ const c=[x0+tx*(.15+bw/2)+nx*5.8, z0+tz*(.15+bw/2)+nz*5.8]; DRIVE_SPOTS.push({x:c[0],z:c[1],h:Math.atan2(nz,nx),gate:items[0]}); } }
      else items.push({kind:'furtka',leaves:[mk(.15,G-.3,1,'furtka')],cx:x0+tx*G/2,cz:z0+tz*G/2});
      items.forEach(it=>{ it.g=g; it.nx=nx; it.nz=nz; it.sg=(nx*(-tz)+nz*tx)>0?1:-1; GATES.push(it); }); }); }
  function toggleGate(it,force){ it.open=force===undefined?!it.open:force; it.leaves.forEach(l=>{ l.open=it.open; l.sol.off=it.open; }); if(AU.ctx&&AU.on){ const t=AU.ctx.currentTime; tone('square',it.open?420:300,t,.08,.03); noiseHit(t,.12,.05,'bandpass',900); } }
  function nearGate(){ const x=st.car?st.car.x:st.x, z=st.car?st.car.z:st.z, lim=st.car?7:2.6; let b=null,bd=lim; GATES.forEach(it=>{ if(st.car&&it.kind!=='brama')return; const d=Math.hypot(it.cx-x,it.cz-z); if(d<bd){bd=d;b=it;} }); return b; }
  function gatesUpdate(dt){ GATES.forEach(it=>it.leaves.forEach(l=>{ const tgt=l.open?l.dir*1.45*it.sg:0; if(Math.abs(l.cur-tgt)<.001)return; l.cur+=(tgt-l.cur)*Math.min(1,dt*5); l.piv.rotation.y=-l.cur; })); }

  /* ---------- park przy Zielonej (wg Street View) ---------- */
  const parkTrees=[];
  { const pm=mar(PARK.pts); const ca=Math.cos(pm.an), sa=Math.sin(pm.an);
    const P=(u,v)=>[pm.cx+u*ca-v*sa, pm.cz+u*sa+v*ca];
    // kręta asfaltowa alejka przez cały park
    const main=[]; for(let i=0;i<=24;i++){ const u=-pm.w/2+6+(pm.w-12)*i/24; let v=Math.sin(i*0.55)*pm.d*0.22; let q=P(u,v); let tries=0; while(!inPoly(q[0],q[1],PARK.pts)&&tries<6){ v*=0.5; q=P(u,v); tries++; } main.push(q); }
    const pathMat=po(new THREE.MeshLambertMaterial({map:texPath,side:THREE.DoubleSide}),2);
    scene.add(new THREE.Mesh(ribbon(main,2.3,0.08,4),pathMat));
    // odnoga do Zielonej (wejście z placu)
    const zr=ROADS.find(r=>r.n==='Zielona'); const near0=main[3]; const nr=nearestRoad(near0[0],near0[1],r=>r===zr); const sa0=zr.pts[nr.seg], sb0=zr.pts[nr.seg+1]; const dx=sb0[0]-sa0[0],dz=sb0[1]-sa0[1],LL=dx*dx+dz*dz; const tt=clamp(((near0[0]-sa0[0])*dx+(near0[1]-sa0[1])*dz)/LL,0,1);
    const ent=[near0,[sa0[0]+dx*tt,sa0[1]+dz*tt]]; scene.add(new THREE.Mesh(ribbon(ent,2.2,0.085,4),pathMat));
    const mlen=lineLen(main), ML=mlen[mlen.length-1];
    const onPath=(x,z)=>{ for(let i=0;i<main.length-1;i++) if(segDist(x,z,main[i][0],main[i][1],main[i+1][0],main[i+1][1])<2.6)return true; return segDist(x,z,ent[0][0],ent[0][1],ent[1][0],ent[1][1])<2.4; };
    // ławki z betonowymi nogami i okrągłe kosze
    const slat=new THREE.MeshLambertMaterial({color:0x2c2f31}), conc=new THREE.MeshLambertMaterial({color:0xb9b6ae,map:plasterTex});
    for(let d=10,i=0;d<ML-6;d+=17,i++){ const s=sampleLine(main,mlen,d); const sd=i%2?1:-1; const x=s.x-s.tz*2.2*sd, z=s.z+s.tx*2.2*sd; const y=H(x,z);
      const b=new THREE.Group(); [-0.75,0.75].forEach(u=>{ const leg=new THREE.Mesh(new THREE.BoxGeometry(.22,.42,.5).translate(0,.21,0),conc); leg.position.x=u; b.add(leg); });
      const seat=new THREE.Mesh(new THREE.BoxGeometry(1.9,.07,.45).translate(0,.45,0),slat); const back=new THREE.Mesh(new THREE.BoxGeometry(1.9,.32,.05).translate(0,.72,-.2),slat); back.rotation.x=-.12; b.add(seat,back);
      b.position.set(x,y,z); b.rotation.y=-Math.atan2(s.tz,s.tx)+(sd>0?Math.PI:0); b.traverse(o=>o.castShadow=true); scene.add(b); addSolid({x,z,hw:1,hd:.3,c:Math.cos(Math.atan2(s.tz,s.tx)),s:Math.sin(Math.atan2(s.tz,s.tx)),r:1.1});
      if(i%2===0){ const bin=new THREE.Mesh(new THREE.CylinderGeometry(.28,.25,.7,14).translate(0,.35,0),conc); const bx=x+s.tx*1.5, bz=z+s.tz*1.5; bin.position.set(bx,H(bx,bz),bz); bin.castShadow=true; scene.add(bin); } }
    // latarnie parkowe
    const plm=new THREE.MeshLambertMaterial({color:0xeceeec}); const pglobe=new THREE.MeshLambertMaterial({color:0xf4f4f0,emissive:0x000000});
    for(let d=4;d<ML;d+=22){ const s=sampleLine(main,mlen,d); const x=s.x+s.tz*1.8, z=s.z-s.tx*1.8; const y=H(x,z); const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,5.6,10).translate(0,2.8,0),plm); pole.position.set(x,y,z); const head=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.08,20),pglobe); head.position.set(x,y+5.65,z); const neck=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.3,10),plm); neck.position.set(x,y+5.5,z); scene.add(neck); scene.add(pole,head); }
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
    PLAYS.forEach((pl,pi)=>{ const m=mar(pl.pts); const y=Math.max(...pl.pts.map(v=>H(v[0],v[1]))); const grp=new THREE.Group(); grp.position.set(m.cx,y,m.cz); grp.rotation.y=-m.an;
      const surf=new THREE.Mesh(new THREE.PlaneGeometry(m.w+1,m.d+1).rotateX(-Math.PI/2),po(new THREE.MeshLambertMaterial({color:0xb8513f,map:detailTex}),3)); surf.position.y=.05; grp.add(surf);
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
    // drzewa parkowe: lipy, klony w jesiennych kolorach, modrzewie
    for(let i=0;i<900&&parkTrees.length<55;i++){ const x=R(pm.cx-pm.w/2,pm.cx+pm.w/2), z=R(pm.cz-pm.d,pm.cz+pm.d); if(!inPoly(x,z,PARK.pts)||onPath(x,z)||PLAYS.some(p=>{const c=centroid(p.pts);return Math.hypot(c[0]-x,c[1]-z)<9;}))continue;
      if(parkTrees.some(t=>Math.hypot(t.x-x,t.z-z)<8))continue; const k=rnd(); parkTrees.push({x,z,s:k<.25?R(.7,.95):R(1.1,1.7),con:k>.82,col:k<.25?pick(['#c8642c','#d9822f','#b8522a','#cf7a34']):null}); }
  }

  /* ---------- drzewa ---------- */
  const trees=[...parkTrees,...EXTRA_TREES];
  { const z=ROADS.find(r=>r.n==='Zielona'); for(let d=8;d<78;d+=6.5){ const s=sampleLine(z.pts,z.len,d); const o=(z.w/2+5.2); trees.push({x:s.x-s.tz*o,z:s.z+s.tx*o,s:R(1.1,1.4),con:false,tall:true}); } }
  for(let i=0;i<9000&&trees.length<3400;i++){ const b=pick(BLD); const a=R(0,6.28), d=R(7,26); const x=b.x+Math.cos(a)*d, z=b.z+Math.sin(a)*d; if(blocked(x,z,1.5))continue; if(roadNear(x,z,3.8))continue; if(inPoly(x,z,COURT.pts)||inPoly(x,z,PITCH2.pts)||inPoly(x,z,TRACK.pts)||inPoly(x,z,PARK.pts)||LOTS.some(l=>inPoly(x,z,l))||inPoly(x,z,PLAC.pts))continue; trees.push({x,z,s:R(.6,1.3),con:rnd()<.33}); }
  RAILS.slice(0,2).forEach(pts=>{ const len=lineLen(pts); const L=len[len.length-1]; for(let d=0;d<L;d+=R(6,10)){ const s=sampleLine(pts,len,d); if(s.x<X0||s.x>X1||s.z<Z0||s.z>Z1)continue; [1,-1].forEach(sd=>{ if(rnd()<.7){ const o=R(10,16)*sd; trees.push({x:s.x-s.tz*o,z:s.z+s.tx*o,s:R(.9,1.5),con:rnd()<.3}); } }); } });
  for(let i=0;i<300;i++){ const x=R(-240,-80),z=R(290,470); if(!inPoly(x,z,CEM.pts))continue; trees.push({x,z,s:R(.5,.8),con:true}); }
  const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.16,.26,1,6).translate(0,.5,0),new THREE.MeshLambertMaterial({color:0x5e4632}),trees.length);
  const cD=trees.filter(t=>!t.con), cC=trees.filter(t=>t.con);
  const leafTex=tex(128,128,(x,w,h)=>{ x.fillStyle='#bdbdbd'; x.fillRect(0,0,w,h); for(let i=0;i<500;i++){ const v=Math.floor(R(120,255)); x.fillStyle=`rgb(${v},${v},${v})`; x.beginPath(); x.arc(R(0,w),R(0,h),R(2,6),0,7); x.fill(); } },true);
  const crownGeo=(()=>{ const P=[[0,.05,0,.72],[.42,-.12,.2,.55],[-.4,-.1,.25,.55],[.1,-.15,-.45,.55],[-.2,.38,-.1,.5],[.28,.32,.18,.48],[-.05,-.4,.05,.55],[.45,.15,-.3,.45],[-.45,.18,-.25,.45]];
    const parts=P.map(([x,y,z,r],i)=>{ const g=new THREE.IcosahedronGeometry(r,1); const p=g.attributes.position; for(let k=0;k<p.count;k++){ const hh=Math.sin((i*97+Math.round(p.getX(k)*40)*13.1+Math.round(p.getY(k)*40)*7.7+Math.round(p.getZ(k)*40)*3.3)*127.1+311.7)*43758.5453; const f=1+(hh-Math.floor(hh)-.5)*.22; p.setXYZ(k,p.getX(k)*f,p.getY(k)*f,p.getZ(k)*f); } const nn=g.attributes.normal; for(let k=0;k<p.count;k++){ const vx=p.getX(k),vy=p.getY(k),vz=p.getZ(k),l=Math.hypot(vx,vy,vz)||1; nn.setXYZ(k,vx/l,vy/l,vz/l); } g.translate(x,y,z); return [g,0xffffff]; }); return mergeParts(parts); })();
  const coneGeo=(()=>{ const parts=[[1,.0,.55],[.82,.25,.5],[.62,.48,.42],[.4,.68,.32]].map(([r,y,h])=>[new THREE.ConeGeometry(r,h,9).translate(0,y+h/2,0),0xffffff]); return mergeParts(parts); })();
  const crownD=new THREE.InstancedMesh(crownGeo,new THREE.MeshLambertMaterial({color:0xffffff,map:leafTex}),Math.max(1,cD.length));
  const crownC=new THREE.InstancedMesh(coneGeo,new THREE.MeshLambertMaterial({color:0xffffff,map:leafTex}),Math.max(1,cC.length));
  [trunk,crownD,crownC].forEach(m=>{m.castShadow=true;m.receiveShadow=true;scene.add(m);});
  const TG=['#557a35','#62853a','#728e40','#86913e','#9a8f3a','#5b7832','#a88a35','#b4782e'];
  let ci=0,cc=0; trees.forEach((t,i)=>{ const y=H(t.x,t.z); const th=t.con?2*t.s:(t.tall?4.2:2.6)*t.s; dum.rotation.set(0,R(0,6.28),0); dum.position.set(t.x,y,t.z); dum.scale.set(t.s,th,t.s); dum.updateMatrix(); trunk.setMatrixAt(i,dum.matrix);
    if(t.con){ dum.position.y=y+th*.5; dum.scale.set(2*t.s,6.5*t.s,2*t.s); dum.updateMatrix(); crownC.setMatrixAt(cc,dum.matrix); crownC.setColorAt(cc++,col.set(t.col||pick(['#2f5526','#36602a','#2b4d24','#3b5f2c','#7d8a3a']))); }
    else { dum.position.y=y+th+2*t.s; dum.scale.set(3.2*t.s,(t.tall?3.4:2.7)*t.s,3.2*t.s); dum.updateMatrix(); crownD.setMatrixAt(ci,dum.matrix); crownD.setColorAt(ci++,col.set(t.col||pick(TG))); } });
  trees.forEach(t=>addSolid({x:t.x,z:t.z,hw:.35*t.s,hd:.35*t.s,c:1,s:0,r:.6,tree:true}));

  /* ---------- lasy z OSM (poza wsią): lekkie drzewa instancjonowane ---------- */
  { const W=AREAS.filter(a=>a.t==='nat:wood'||a.t==='nat:scrub'); const F=[];
    W.forEach(a=>{ const bb=bbox(a.pts), scrub=a.t==='nat:scrub', step=scrub?14:7.5; const ar=Math.abs(polyArea(a.pts));
      for(let x=bb[0];x<bb[2];x+=step)for(let z=bb[1];z<bb[3];z+=step){ if(F.length>14000)return; const jx=x+R(-step*.4,step*.4), jz=z+R(-step*.4,step*.4); if(jx<X0||jx>X1||jz<Z0||jz>Z1)continue; if(!inPoly(jx,jz,a.pts))continue; if(scrub&&rnd()<.5)continue; if(roadNear(jx,jz,4)||blocked(jx,jz,1.5))continue; F.push([jx,jz,scrub?R(.5,.9):R(.85,1.35),scrub?0:rnd()<.72?1:0]); } });
    const pine=mergeParts([[new THREE.CylinderGeometry(.18,.28,9,5).translate(0,4.5,0),0x6b4a32],[new THREE.ConeGeometry(2.1,5,7).translate(0,9,0),0xffffff],[new THREE.ConeGeometry(1.6,4,7).translate(0,11.2,0),0xffffff],[new THREE.ConeGeometry(1.0,3,7).translate(0,13.2,0),0xffffff]]);
    const leaf=mergeParts([[new THREE.CylinderGeometry(.2,.3,4.5,5).translate(0,2.25,0),0x6b4a32],[new THREE.IcosahedronGeometry(2.8,0).scale(1,.85,1).translate(0,6.2,0),0xffffff],[new THREE.IcosahedronGeometry(2,0).translate(1.4,5.2,.8),0xffffff],[new THREE.IcosahedronGeometry(2,0).translate(-1.3,5.4,-.9),0xffffff]]);
    const mk=(geo,list,cols)=>{ const m=new THREE.InstancedMesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,map:leafTex}),Math.max(1,list.length)); list.forEach((f,i)=>{ dum.position.set(f[0],H(f[0],f[1])-.2,f[1]); dum.rotation.set(0,R(0,6.28),0); dum.scale.set(f[2],f[2]*R(.85,1.15),f[2]); dum.updateMatrix(); m.setMatrixAt(i,dum.matrix); m.setColorAt(i,col.set(pick(cols))); }); m.castShadow=true; m.receiveShadow=true; scene.add(m); return m; };
    window.__forest=[mk(pine,F.filter(f=>f[3]===1),['#2c4a26','#34552b','#2a4423','#3c5a2e']), mk(leaf,F.filter(f=>f[3]===0),['#4f6e32','#5c7a36','#6b7f3a','#7a8a3c','#8a8a3a'])];
    F.forEach(f=>{ if(f[3]===1||f[2]>.8) addSolid({x:f[0],z:f[1],hw:.35,hd:.35,c:1,s:0,r:.5,tree:true}); }); }

  /* ---------- latarnie ---------- */
  const lamps=[]; ROADS.filter(r=>r.main||SIDEWALK.has(r.n)).forEach(r=>{ for(let d=12;d<r.L;d+=36){ const s=sampleLine(r.pts,r.len,d); if(s.x<-720||s.x>720)continue; const o=r.w/2+2.6; const x=s.x-s.tz*o, z=s.z+s.tx*o; lamps.push({x,z,y:H(x,z),a:Math.atan2(s.tz,s.tx)}); } });
  const poleIM=new THREE.InstancedMesh(new THREE.CylinderGeometry(.08,.12,8,6).translate(0,4,0),new THREE.MeshLambertMaterial({color:0x8a9096}),lamps.length);
  const headMat=new THREE.MeshLambertMaterial({color:0xdedcd4,emissive:0x000000});
  const headIM=new THREE.InstancedMesh(new THREE.BoxGeometry(.9,.18,.38),headMat,lamps.length);
  lamps.forEach((l,i)=>{ dum.rotation.set(0,-l.a,0); dum.position.set(l.x,l.y,l.z); dum.scale.set(1,1,1); dum.updateMatrix(); poleIM.setMatrixAt(i,dum.matrix); dum.position.y=l.y+8; dum.updateMatrix(); headIM.setMatrixAt(i,dum.matrix); addSolid({x:l.x,z:l.z,hw:.2,hd:.2,c:1,s:0,r:.4}); });
  scene.add(poleIM,headIM);
  const lampPool=[]; for(let i=0;i<8;i++){ const pl=new THREE.PointLight(0xffc070,0,26,1.8); scene.add(pl); lampPool.push(pl); }

  /* ---------- etykiety ---------- */
  function rr(x,X,Y,W,Hh,r){ x.beginPath(); x.moveTo(X+r,Y); x.arcTo(X+W,Y,X+W,Y+Hh,r); x.arcTo(X+W,Y+Hh,X,Y+Hh,r); x.arcTo(X,Y+Hh,X,Y,r); x.arcTo(X,Y,X+W,Y,r); x.closePath(); }
  function labelSprite(text,color){ const c=document.createElement('canvas'),x=c.getContext('2d'); x.font='600 44px "Barlow Condensed", Arial'; const tw=x.measureText(text).width; c.width=Math.ceil(tw+90); c.height=72;
    x.font='600 44px "Barlow Condensed", Arial'; rr(x,2,2,c.width-4,c.height-4,6); x.fillStyle='rgba(8,10,12,.82)'; x.fill();
    x.fillStyle=color; x.fillRect(2,2,10,c.height-4); x.fillStyle='#fff'; x.textBaseline='middle'; x.fillText(text,30,38);
    const t=new THREE.CanvasTexture(c); t.minFilter=THREE.LinearFilter; const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthWrite:false,fog:false})); const h=2.6; sp.scale.set(h*c.width/c.height,h,1); return sp; }
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
    {n:'Paczkomat · Wyzwolenia (Żabka)',p:[-75,46],c:'#ffcd00',h:4,ic:'P'},
    {n:'Euforia Trębaczew',p:[-151,-350],c:'#f07a1f',ic:'R'},
    {n:'Delikatesy Premium',p:[-145,-334],c:'#2f8de4',ic:'$'},
    {n:'Apteka Magnolia',p:[-94,-201],c:'#3fa34d',ic:'+'},
    {n:'Ośrodek zdrowia',p:[-99,-213],c:'#d0312d',ic:'+'},
    {n:'Biblioteka',p:[-136,-125],c:'#7d5ab5',ic:'B'},
    {n:'Park w Trębaczewie',p:centroid(PARK.pts),c:'#3fa34d',h:4,ic:'♣'},
    {n:'Plac zabaw',p:centroid(PLAYS[0].pts),c:'#c0392b',h:4,ic:'☺'},
    {n:'Kwiaciarnia Sas-Anka',p:[-144,-244],c:'#e0368a',ic:'✿'},
    {n:'F.P.H.U TRANS-BUD',p:[157,-76],c:'#7d8a96',ic:'T'},
    {n:'Noclegi pracownicze',p:[-501,276],c:'#e0368a',ic:'N'},
    {n:'Trębaczew (bar)',p:[76,-479],c:'#f07a1f',ic:'Y'},
    {n:'Wyroby mięsne „U Kazia”',p:bc('U Kazia'),c:'#7d8a96',ic:'$'},
    {n:'Sklep ADOLEK',p:bc('Sklep ADOLEK'),c:'#2f8de4',ic:'$'},
    {n:'Przystanek',p:[409,-187],c:'#2f8de4',h:4,ic:'⇄'},
    {n:'Przystanek przy kościele',p:[-156,96],c:'#2f8de4',h:4,ic:'⇄'},
  ];
  if(typeof DATA_X!=='undefined'){ const PICK={station:['Dworzec PKP Działoszyn','#1f5fb4','⇄'],memorial:[null,'#7a8a68','★'],animal_shelter:[null,'#c96b9a','♥'],shop:[null,'#2f8de4','$'],industrial:[null,'#7b8794','⚙'],restaurant:[null,'#f07a1f','R'],hotel:[null,'#7d5ab5','H'],school:[null,'#e07b39','S'],pharmacy:[null,'#3fa34d','+']};
    const want=['Biedronka','Górka Kazika','Schronisko','Działoszyn','BPT STEEL','MINERAŁ','Hotel V.I.P.','Zespół Szkół','Punkt Apteczny','Z.U.H. ZBYSZKO','KIEPUREX'];
    DATA_X.P.forEach(([n,k,x,z])=>{ const d=PICK[k]; if(!d||!want.some(w=>n.includes(w)))return; if(POIS.some(q=>Math.hypot(q.p[0]-x,q.p[1]-z)<30))return; POIS.push({n:d[0]||n.replace(/\s+-\s+pomnik.*$/,' – pomnik').slice(0,46),p:[x,z],c:d[1],ic:d[2],h:k==='station'?8:6}); }); }
  POIS.forEach(p=>{ [p.x,p.z]=p.p; const sp=labelSprite(p.n,p.c); sp.position.set(p.x,H(p.x,p.z)+(p.h||8)+2,p.z); sp.visible=false; scene.add(sp); p.sp=sp; });
  /* kapliczka przy Wyzwolenia usunięta (stała na jezdni) */
  const poleMat=new THREE.MeshLambertMaterial({color:0x7c8288});
  ROADS.filter(r=>r.n&&!r.main&&r.t!=='track').forEach(r=>{ [0.08,0.55].forEach(f=>{ if(r.L<150&&f>.5)return; const s=sampleLine(r.pts,r.len,Math.max(6,r.L*f)); const o=r.w/2+2.6; const x=s.x-s.tz*o, z=s.z+s.tx*o; const y=H(x,z);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,2.8,5).translate(0,1.4,0),poleMat); pole.position.set(x,y,z); scene.add(pole);
    const pl=plateSprite('ul. '+r.n); pl.position.set(x,y+3.1,z); scene.add(pl); }); });
  { const zr=ROADS.find(r=>r.n==='Zielona'); const s=sampleLine(zr.pts,zr.len,60); const t=tex(512,128,(x,w,h)=>{ x.clearRect(0,0,w,h); x.font='italic 700 96px "Barlow Condensed", Arial'; x.fillStyle='rgba(235,235,235,.75)'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('Zielona',w/2,h/2+4); });
    const m=new THREE.Mesh(new THREE.PlaneGeometry(8,2).rotateX(-Math.PI/2),po(new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}),5)); const x=s.x+s.tz*1.4, z=s.z-s.tx*1.4; m.position.set(x,H(x,z)+0.1,z); m.rotation.y=-Math.atan2(s.tz,s.tx)+Math.PI/2; scene.add(m); }

  /* ---------- pojazdy ---------- */
  const wheelGeo=new THREE.CylinderGeometry(.36,.36,.26,14).rotateX(Math.PI/2), wheelMat=new THREE.MeshLambertMaterial({color:0x151515});
  /* ---------- scalanie geometrii z kolorami wierzchołków (mniej wywołań rysowania) ---------- */
  function mergeParts(parts){ let n=0; const gs=parts.map(([g,c])=>{ const q=g.index?g.toNonIndexed():g; n+=q.attributes.position.count; return [q,new THREE.Color(c)]; });
    const P=new Float32Array(n*3), N=new Float32Array(n*3), C=new Float32Array(n*3); let o=0;
    gs.forEach(([q,c])=>{ const p=q.attributes.position, nn=q.attributes.normal; for(let i=0;i<p.count;i++){ P[o*3]=p.getX(i); P[o*3+1]=p.getY(i); P[o*3+2]=p.getZ(i); N[o*3]=nn.getX(i); N[o*3+1]=nn.getY(i); N[o*3+2]=nn.getZ(i); C[o*3]=c.r; C[o*3+1]=c.g; C[o*3+2]=c.b; o++; } });
    const out=new THREE.BufferGeometry(); out.setAttribute('position',new THREE.BufferAttribute(P,3)); out.setAttribute('normal',new THREE.BufferAttribute(N,3)); out.setAttribute('color',new THREE.BufferAttribute(C,3)); out.computeBoundingSphere(); return out; }
  const G_=(geo,sx,sy,sz,x,y,z,rx,ry,rz)=>{ const g=geo.clone(); if(sx!==1||sy!==1||sz!==1)g.scale(sx,sy,sz); if(rx)g.rotateX(rx); if(ry)g.rotateY(ry); if(rz)g.rotateZ(rz); g.translate(x,y,z); return g; };
  const SPH=new THREE.SphereGeometry(1,16,12), SPHs=new THREE.SphereGeometry(1,10,8), CYL=(rt,rb,h,s)=>new THREE.CylinderGeometry(rt,rb,h,s||12,1);

  /* ---------- postacie: ludzkie proporcje, stawy w łokciach i kolanach ---------- */
  const humanMat=new THREE.MeshPhongMaterial({vertexColors:true,shininess:14,specular:0x181818});
  const SKINS=[0xf0cfb2,0xe6bb98,0xd9a982,0xc68e66,0xa86f4b,0xf5d9c0];
  function shade(c,k){ return new THREE.Color(c).multiplyScalar(k).getHex(); }
  function makePerson(top,bottom,hair,opt){ opt=opt||{}; const p=new THREE.Group();
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
  const glassMat=new THREE.MeshPhongMaterial({color:0x1b2630,shininess:120,specular:0x99aabb});
  const headM=new THREE.MeshLambertMaterial({color:0xfff6dd,emissive:0x000000}), tailM=new THREE.MeshLambertMaterial({color:0x8a1010,emissive:0x220000});
  const CARCOL=[0xb3262b,0x2a4b8d,0xdedede,0x1d1d1f,0x8a8f96,0x3d6b3a,0xc9a227,0x5c6a78,0xe8e6df,0x6b1f2a,0x2f5d7c,0xa45a2a];
  /* ---------- samochody: zaokrąglona karoseria z profilu, szyby, felgi ---------- */
  const carPaintGeo={}, carDetGeo={}, carLightGeo={}; let wheelGeoHD=null;
  const carDetMat=new THREE.MeshPhongMaterial({vertexColors:true,shininess:110,specular:0x8899aa}), carLightMat=new THREE.MeshBasicMaterial({vertexColors:true});
  function profileGeo(pts,depth,bevel){ const s=new THREE.Shape(); s.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++){ const q=pts[i]; if(q.length===4) s.quadraticCurveTo(q[0],q[1],q[2],q[3]); else s.lineTo(q[0],q[1]); } s.closePath();
    const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:8}); g.translate(0,0,-depth/2); g.computeVertexNormals(); return g; }
  function carGeos(type){ if(carPaintGeo[type])return; const van=type==='van';
    let body, green, roof, L;
    if(!van){ L=4.3;
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
    carDetGeo[type]=mergeParts(D);
    const Lg=[]; [-1,1].forEach(s=>{ Lg.push([G_(SPHs,.05,.075,.17,HL+.06,.72,s*.6),0xfff4d8]); Lg.push([G_(new THREE.BoxGeometry(.05,.13,.3),1,1,1,-HL-.05,van?.95:.76,s*.62),0xb0151a]); Lg.push([G_(new THREE.BoxGeometry(.052,.04,.3),1,1,1,-HL-.05,van?.86:.68,s*.62),0xe08a20]); });
    carLightGeo[type]=mergeParts(Lg);
    if(!wheelGeoHD){ const tire=new THREE.CylinderGeometry(.34,.34,.24,20).rotateX(Math.PI/2); const side=new THREE.TorusGeometry(.3,.045,6,20); const rim=new THREE.CylinderGeometry(.21,.21,.02,16).rotateX(Math.PI/2);
      const W=[[tire,0x151515],[G_(side,1,1,1,0,0,.11),0x1c1c1c],[G_(side,1,1,1,0,0,-.11),0x1c1c1c],[G_(rim,1,1,1,0,0,.122),0xb9bec4],[G_(rim,1,1,1,0,0,-.122),0xb9bec4],[G_(new THREE.CylinderGeometry(.06,.06,.03,10).rotateX(Math.PI/2),1,1,1,0,0,.13),0x6a6e72]];
      for(let k=0;k<5;k++){ const a=k*Math.PI*2/5; [.126,-.126].forEach(z=>W.push([G_(new THREE.BoxGeometry(.05,.19,.012),1,1,1,Math.sin(a)*.1,Math.cos(a)*.1,z,0,0,-a),0x8d9399])); }
      wheelGeoHD=mergeParts(W); } }
  function makeCar(color,type){ type=type==='van'?'van':'car'; carGeos(type); const gC=new THREE.Group(); const van=type==='van', L=van?5:4.3;
    const paint=new THREE.MeshPhongMaterial({color,shininess:95,specular:0x9a9a9a,vertexColors:true});
    const body=new THREE.Mesh(carPaintGeo[type],paint); gC.add(body); gC.add(new THREE.Mesh(carDetGeo[type],carDetMat)); gC.add(new THREE.Mesh(carLightGeo[type],carLightMat));
    const wheels=[]; [[L/2-.85,.8],[L/2-.85,-.8],[-L/2+.8,.8],[-L/2+.8,-.8]].forEach(([x,z])=>{ const w=new THREE.Mesh(wheelGeoHD,carDetMat); w.position.set(x,.35,z); gC.add(w); wheels.push(w); });
    gC.traverse(o=>{ if(o.isMesh)o.castShadow=true; }); gC.userData.wheels=wheels; return gC; }
  // ustawienie auta na pochyłym terenie
  function seatCar(g,x,z,h,yo){ const fx=Math.cos(h),fz=Math.sin(h); const hf=H(x+fx*1.6,z+fz*1.6), hb=H(x-fx*1.6,z-fz*1.6), hl=H(x+fz*.9,z-fx*.9), hr=H(x-fz*.9,z+fx*.9);
    g.position.set(x,(hf+hb+hl+hr)/4+(yo||0),z); g.rotation.set(0,0,0); g.rotateY(-h); g.rotateZ(Math.atan2(hf-hb,3.2)); g.rotateX(Math.atan2(hl-hr,1.8)); return (hf-hb)/3.2; }
  const cars=[];
  for(let i=0;i<(DK.L>3000?20:10);i++){ const gC=makeCar(CARCOL[i%CARCOL.length],i%4===3?'van':''); scene.add(gC); cars.push({g:gC,d:R(0,DK.L),dir:i%2?1:-1,v:R(13,19),x:0,z:0}); }
  const parked=[];
  const DIMS={bus:[12,2.6],tractor:[4.2,2.2],moto:[2.1,.8],bike:[1.8,.6],fire:[7.4,2.5],van:[5,1.95],cop:[4.4,1.9]};
  const dimsOf=c=>c&&(c.L?[c.L,c.W]:DIMS[c.kind]||[4.4,1.9]);
  function obb(a,b,m){ const dx=b.x-a.x, dz=b.z-a.z; for(const ang of [a.h,a.h+Math.PI/2,b.h,b.h+Math.PI/2]){ const ax=Math.cos(ang), az=Math.sin(ang); const d=Math.abs(dx*ax+dz*az);
      const ra=a.L/2*Math.abs(Math.cos(a.h-ang))+a.W/2*Math.abs(Math.sin(a.h-ang)), rb=b.L/2*Math.abs(Math.cos(b.h-ang))+b.W/2*Math.abs(Math.sin(b.h-ang)); if(d>ra+rb+(m||0))return false; } return true; }
  const box=(c,x,z,h)=>{ const [L,W]=dimsOf(c); return {x:x??c.x,z:z??c.z,h:h??c.h,L,W}; };
  function park(x,z,h,van){ const fx=Math.cos(h),fz=Math.sin(h); for(const k of [-1.7,0,1.7]){ if(blocked(x+fx*k,z+fz*k,1.0))return false; } if(ROADS.some(r=>r.t!=='track'&&roadDist(r,x,z)<r.w/2+1.2))return false;
    const L=van?5:4.4, me={x,z,h,L,W:1.95}; if(parked.some(p=>Math.abs(p.x-x)<14&&Math.abs(p.z-z)<14&&obb(me,box(p),.4)))return false;
    const c={g:makeCar(pick(CARCOL),van?'van':''),x,z,h,v:0,steer:0,L,W:1.95,kind:van?'van':'car'}; seatCar(c.g,x,z,h); scene.add(c.g); parked.push(c); return true; }
  DRIVE_SPOTS.forEach(sp=>{ if(!park(sp.x,sp.z,sp.h,rnd()<.1)){ const ok=park(sp.x-Math.cos(sp.h)*1.5,sp.z-Math.sin(sp.h)*1.5,sp.h); } });
  if(0)houses.filter(h=>h.kind==='house'&&!h.isPart).forEach(h=>{ if(rnd()>.28||parked.length>150)return; const nr=nearestRoad(h.x,h.z,r=>r.t!=='track'); if(!nr.r||nr.d>40)return; const a=nr.r.pts[nr.seg],b=nr.r.pts[nr.seg+1]; const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz); const tx=dx/L,tz=dz/L; let nx=-tz,nz=tx; const t=clamp((h.x-a[0])*tx+(h.z-a[1])*tz,0,L); const px=a[0]+tx*t,pz=a[1]+tz*t; if((h.x-px)*nx+(h.z-pz)*nz<0){nx=-nx;nz=-nz;}
    const off=nr.r.w/2+(SIDEWALK.has(nr.r.n)?6:3.6); park(px+nx*off+tx*R(4,8),pz+nz*off+tz*R(4,8),Math.atan2(nz,nx)+Math.PI); });
  LEW_SPOTS.forEach(sp=>park(sp.x,sp.z,sp.h));
  AREAS.filter(a=>a.t==='am:parking').forEach(a=>{ if(a===PLAC)return; const m=mar(a.pts); const ca=Math.cos(m.an), sa=Math.sin(m.an); let n=0; const rows=m.d>11?2:1;
    for(let r=0;r<rows;r++) for(let u=-m.w/2+1.8;u<=m.w/2-1.8&&n<8;u+=2.9){ const v=rows===2?(r?1:-1)*(m.d/2-2.6):0; const x=m.cx+u*ca-v*sa, z=m.cz+u*sa+v*ca; if(!inPoly(x,z,a.pts)||(((Math.sin(Math.round(x*7+z*3)*127.1+311.7)*43758.5453)%1+1)%1)<.45)continue; if(park(x,z,m.an+Math.PI/2+(r?Math.PI:0)))n++; } });
  { const zr=ROADS.find(r=>r.n==='Zielona'); const s=sampleLine(zr.pts,zr.len,150); park(s.x+s.tz*2,s.z-s.tx*2,Math.atan2(s.tz,s.tx)); }
  const trainPath=RAILS.find(p=>p[0][0]===-945)||RAILS[0], trainLen=lineLen(trainPath);
  const train=[]; for(let i=0;i<6;i++){ const t=new THREE.Mesh(new THREE.BoxGeometry(21,3.6,3).translate(0,2.3,0),new THREE.MeshPhongMaterial({color:i===0?0x1f4f7a:0x4a4038,shininess:30})); const gT=new THREE.Group(); gT.add(t); gT.traverse(m=>m.castShadow=true); scene.add(gT); train.push(gT); }

  /* ---------- postacie ---------- */
  let player=makePerson(0x2b2f36,0x2c3e66,0x2a1d14,{female:false,style:'jacket',hairStyle:'short',skin:0xe6bb98,shoe:0xe8e8e4}); scene.add(player);
  const peds=[]; const PCOL=[0xb33a3a,0x2f5d8a,0x3f6b3a,0xc9a24a,0x6b4c8a,0x3a3a3c,0xd8d6d0,0x8a5a2b,0x1f6a6a,0xc96b9a,0x23262b,0x7a6a58,0x4a5a3a,0x9a2f3a];
  for(let i=0;i<46;i++){ const w=pick(WALKS); const L=w.len[w.len.length-1]; if(L<30){i--;continue;} const p=makePerson(pick(PCOL),pick([0x2c3e66,0x3a4e7a,0x2a2a2c,0x5a4a3a,0x6a6a6a,0x1e2a44,0x4a5a72,0xb8ac94]),pick([0x2a1d14,0x4a2e1a,0x6b4426,0xb08a50,0xd2b27a,0x111111,0x8a8a8a,0x7a3a1e])); scene.add(p); peds.push({g:p,w,d:R(0,L),dir:rnd()<.5?1:-1,v:R(1.1,1.6),walk:R(0,6),down:0}); }

  /* ---------- paczki ---------- */
  const cashGeo=new THREE.BoxGeometry(.7,.35,.45), cashMat=new THREE.MeshLambertMaterial({color:0x4fbf4a,emissive:0x1d5a1a});
  const pickups=[];
  for(let i=0;i<45;i++){ const w=pick(WALKS); const L=w.len[w.len.length-1]; const s=sampleLine(w.pts,w.len,R(0,L)); const m=new THREE.Mesh(cashGeo,cashMat); const y=H(s.x,s.z)+.9; m.position.set(s.x,y,s.z); scene.add(m); pickups.push({m,x:s.x,z:s.z,y,val:Math.round(R(1,10))*50}); }

  /* ---------- stan gry ---------- */
  const zel=ROADS.find(r=>r.n==='Zielona'); const s0=sampleLine(zel.pts,zel.len,95); const so=(zel.w/2+1.35);
  const st={x:saved.x??(s0.x-s0.tz*so), z:saved.z??(s0.z+s0.tx*so), yaw:saved.yaw??Math.atan2(s0.tx,s0.tz), pitch:0.22, dist:6.5, mode:saved.mode??0, night:!!saved.night, face:0, walk:0, run:false,
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
    if(mapView.hidden&&!SHOP_OPEN&&logEl.hidden) keys.add(k); if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault(); },true);
  addEventListener('keyup',e=>{ const k=keyOf(e); keys.delete(k); keys.delete((e.key||'').toLowerCase()); if(e.key==='Meta'||e.key==='Control'||e.key==='Alt')keys.clear(); },true);
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
  function applyNight(){ const P=st.night?NIGHT:DAY; skyU.hor.value.set(P.hor); skyU.zen.value.set(P.zen); skyU.night.value=st.night?1:0; scene.fog.color.set(P.fog); hemi.color.set(P.hemiS); hemi.groundColor.set(P.hemiG); hemi.intensity=P.hemi; sun.intensity=P.sun; sun.color.set(P.sunC);
    if(bloom)bloom.strength=P.bloom; if(grade){grade.uniforms.exposure.value=P.exp; grade.uniforms.night.value=st.night?1:0;}
    headMat.emissive.set(st.night?0xffc070:0x000000); brandLights.forEach(m=>m.emissive.set(st.night?0x777777:0x000000)); PARK.globeMat.emissive.set(st.night?0xfff0c0:0x000000); playerLight.intensity=st.night?.9:0; winMat.emissive.set(st.night?0x553a12:0x000000); headM.emissive.set(st.night?0xfff2c0:0x000000); tailM.emissive.set(st.night?0x880000:0x220000);
    wins.forEach((w,i)=>winIM.setColorAt(i,col.set(st.night?(winLit[i]?'#ffcf7a':'#1a222c'):'#4a5866'))); winIM.instanceColor.needsUpdate=true;
    polyWinIMs.forEach(im=>{ for(let i=0;i<im.count;i++) im.setColorAt(i,col.set(st.night?(i%3?'#ffd98a':'#1a222c'):'#4a5866')); im.instanceColor.needsUpdate=true; });
    bNight.textContent=st.night?'Pora dnia: noc':'Pora dnia: dzień'; }
  function toggleNight(){ st.night=!st.night; applyNight(); }
  bNight.addEventListener('click',()=>toggleNight()); applyNight();
  document.getElementById('hideHelp').addEventListener('click',()=>{ document.getElementById('helpBox').hidden=true; });
  function teleport(x,z){ if(st.car)exitCar(true);
    const nr=nearestRoad(x,z,r=>r.t!=='track'); if(nr.r&&nr.d<60){ const a=nr.r.pts[nr.seg],b=nr.r.pts[nr.seg+1]; const dx=b[0]-a[0],dz=b[1]-a[1],L=dx*dx+dz*dz; const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/L,0,1); const px=a[0]+dx*t,pz=a[1]+dz*t; const l=Math.sqrt(L); const nx=-dz/l,nz=dx/l; const sd=((x-px)*nx+(z-pz)*nz)>0?1:-1; x=px+nx*sd*(nr.r.w/2+1.3); z=pz+nz*sd*(nr.r.w/2+1.3); }
    for(let r=0;r<40;r+=1.5){ for(let a=0;a<6.28;a+=.5){ const tx=x+Math.cos(a)*r, tz=z+Math.sin(a)*r; if(!blocked(tx,tz,.5)){ st.x=tx; st.z=tz; return; } } } st.x=x; st.z=z; }

  /* ---------- auto ---------- */
  const vehEl=document.getElementById('veh'), hintEl=document.getElementById('hint'), deadEl=document.getElementById('dead');
  const carLight=new THREE.SpotLight(0xfff1d0,0,60,0.55,0.5,1.2); scene.add(carLight); scene.add(carLight.target);
  const ROOF={car:1.45,van:2.05,moto:1.05,bike:.95,tractor:2.5,fire:3.1,bus:3.1};
  function roofH(c){ return ROOF[c.kind]||1.45; }
  function roofBox(c){ const d=typeof dimsOf==='function'?dimsOf(c):[4.4,1.9]; return [d[0]/2,d[1]/2]; }
  function roofAt(x,z){ let h=0; for(const c of parked){ if(c===st.car||Math.abs(c.x-x)>4||Math.abs(c.z-z)>4)continue; const lx=(x-c.x)*Math.cos(c.h)+(z-c.z)*Math.sin(c.h), lz=-(x-c.x)*Math.sin(c.h)+(z-c.z)*Math.cos(c.h); const [L2,W2]=roofBox(c); if(Math.abs(lx)<L2-.1&&Math.abs(lz)<W2-.1) h=Math.max(h,roofH(c)); } return h; }
  function nearestParked(){ let b=null,bd=4.2; parked.forEach(c=>{ const d=Math.hypot(c.x-st.x,c.z-st.z); if(d<bd){bd=d;b=c;} }); return b; }
  function enterExit(){ if(st.car){ exitCar(false); return; } const c=nearestParked(); if(!c)return; st.car=c; c.v=0; fuelInit(c); canisterCheck(); player.visible=false; vehEl.hidden=false; vehEl.textContent=c.name||pick(['Fiat Seicento','Opel Astra','Skoda Fabia','VW Passat','Daewoo Lanos','Fiat 126p','Ford Mondeo']); onCarEnter(); }
  function exitCar(force){ const c=st.car; if(!c)return; const lx=c.x+Math.sin(c.h)*1.9, lz=c.z-Math.cos(c.h)*1.9; const rx=c.x-Math.sin(c.h)*1.9, rz=c.z+Math.cos(c.h)*1.9;
    if(!blocked(lx,lz,.4)){st.x=lx;st.z=lz;} else if(!blocked(rx,rz,.4)){st.x=rx;st.z=rz;} else if(!force) return; else {st.x=lx;st.z=lz;}
    c.v=0; st.car=null; player.visible=st.mode!==1; vehEl.hidden=true; }
  function carBlocked(x,z,h){ const c=st.car, [L,W]=dimsOf(c); const fx=Math.cos(h),fz=Math.sin(h), half=Math.max(0,L/2-W/2); for(const k of [-half,0,half]){ if(blocked(x+fx*k,z+fz*k,W/2*.95,true))return true; }
    const me={x,z,h,L,W}; for(const p of parked){ if(p!==c&&Math.abs(p.x-x)<15&&Math.abs(p.z-z)<15&&obb(me,box(p),0))return true; } return false; }
  function carHits(c){ const me=box(c); const hit=[]; cars.forEach(t=>{ if(t.h!==undefined&&Math.abs(t.x-c.x)<15&&Math.abs(t.z-c.z)<15&&obb(me,{x:t.x,z:t.z,h:t.h,L:4.4,W:1.9},0)) hit.push(t); });
    if(typeof COPS!=='undefined') COPS.forEach(t=>{ if(Math.abs(t.x-c.x)<15&&Math.abs(t.z-c.z)<15&&obb(me,{x:t.x,z:t.z,h:t.h,L:4.4,W:1.9},0)) hit.push(t); });
    if(typeof BUS!=='undefined'&&BUS.h!==undefined&&Math.abs(BUS.x-c.x)<20&&Math.abs(BUS.z-c.z)<20&&obb(me,{x:BUS.x,z:BUS.z,h:BUS.h,L:12,W:2.6},0)) hit.push(BUS); return hit; }
  function driveCar(c,dt){ let thr=0,steer=0; if(keys.has('w')||keys.has('arrowup'))thr=1; if(keys.has('s')||keys.has('arrowdown'))thr=-1; if(keys.has('a')||keys.has('arrowleft'))steer=-1; if(keys.has('d')||keys.has('arrowright'))steer=1;
    if(joy.id!==null){ thr=clamp(-joy.y*1.4,-1,1); steer=clamp(joy.x*1.3,-1,1); }
    const hb=keys.has(' '); if(c.fuel!==undefined&&c.fuel<=0&&thr>0) thr=0;
    if(thr>0) c.v+= (c.v<0?16:(c.acc||8.5))*dt; else if(thr<0) c.v-= (c.v>0?16:5)*dt; else c.v*=1-dt*0.6;
    c.v-=(c.slope||0)*9.8*dt*0.6;                       // grawitacja na zboczach
    c.v=clamp(c.v,-8,c.maxV||34); if(hb) c.v*=1-dt*2.4; c.v*=1-dt*0.05;
    c.steer+=(steer*0.55-c.steer)*Math.min(1,dt*6); const sAng=c.steer*(1-Math.min(.65,Math.abs(c.v)/50));
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
    bctx.font='600 22px "Barlow Condensed", Arial'; bctx.fillStyle='rgba(255,255,255,.8)'; ROADS.filter(r=>r.n&&r.t!=='track').forEach(r=>{ if(r.L<120)return; const s=sampleLine(r.pts,r.len,r.L/2); const [x,y]=mp(s.x,s.z); bctx.save(); bctx.translate(x,y); let a=Math.atan2(s.tz,s.tx); if(a>Math.PI/2)a-=Math.PI; if(a<-Math.PI/2)a+=Math.PI; bctx.rotate(a); bctx.textAlign='center'; bctx.fillText(r.main?'DK42':r.n,0,-8); bctx.restore(); });
    const [px,py]=mp(st.x,st.z); bctx.save(); bctx.translate(px,py); bctx.rotate(arrowAngle()); bctx.beginPath(); bctx.moveTo(0,-16); bctx.lineTo(11,12); bctx.lineTo(0,6); bctx.lineTo(-11,12); bctx.closePath(); bctx.fillStyle='#fff'; bctx.fill(); bctx.lineWidth=3; bctx.strokeStyle='#000'; bctx.stroke(); bctx.restore();
    bctx.font='600 20px Barlow, Arial'; bctx.fillStyle='rgba(255,255,255,.85)'; bctx.textAlign='left'; bctx.fillText(`Wysokość: ${(H(st.x,st.z)+HB).toFixed(1)} m n.p.m.`,16,mapBase.height-18); }
  const poiList=document.getElementById('poiList');
  POIS.forEach(p=>{ const b=document.createElement('button'); b.innerHTML=`<i style="background:${p.c}"></i>`; b.append(p.n); b.addEventListener('click',()=>{ goTo(p); toggleMap(false); }); poiList.append(b); });
  function goTo(p){ if(st.car)exitCar(true);
    const bb=p.n==='Lewiatan'?B_LEW:p.n==='Żabka'?B_ZAB:null; if(bb&&bb.front){ const f=bb.front; st.x=f.x+f.nx*11; st.z=f.z+f.nz*11; st.vx=st.vz=0; st.yaw=Math.atan2(f.nx,f.nz); st.face=st.yaw+Math.PI; st.pitch=0.2; return; } const nr=nearestRoad(p.x,p.z,r=>r.t!=='track'); let dir=[0,1];
    if(nr.r){ const a=nr.r.pts[nr.seg],b=nr.r.pts[nr.seg+1]; const dx=b[0]-a[0],dz=b[1]-a[1],L=dx*dx+dz*dz; const t=clamp(((p.x-a[0])*dx+(p.z-a[1])*dz)/L,0,1); const qx=a[0]+dx*t-p.x, qz=a[1]+dz*t-p.z, l=Math.hypot(qx,qz)||1; dir=[qx/l,qz/l]; }
    let best=null; for(let r=6;r<40&&!best;r+=2){ for(let k=0;k<16;k++){ const an=Math.atan2(dir[1],dir[0])+(k%2?1:-1)*Math.ceil(k/2)*0.35; const x=p.x+Math.cos(an)*r, z=p.z+Math.sin(an)*r; if(!blocked(x,z,.6)){ best=[x,z]; break; } } }
    if(!best){ teleport(p.x,p.z); return; } st.x=best[0]; st.z=best[1]; st.vx=st.vz=0; st.yaw=Math.atan2(st.x-p.x,st.z-p.z); st.face=st.yaw+Math.PI; st.pitch=0.22; }
  function toggleMap(v){ keys.clear(); resetJoy(); mapView.hidden=v===undefined?!mapView.hidden:!v; if(!mapView.hidden){ mvCenter(st.x,st.z,2.2); drawBig(); } else canvas.focus(); }
  document.getElementById('bMap').addEventListener('click',()=>toggleMap()); document.getElementById('closeMap').addEventListener('click',()=>toggleMap(false));
  { const pts=new Map(); let moved=0, pinch0=0, z0=1;
    const cpx=e=>{ const r=big.getBoundingClientRect(); return [(e.clientX-r.left)*big.width/r.width,(e.clientY-r.top)*big.height/r.height]; };
    const zoomAt=(px,py,f)=>{ const mx=MV.ox+px/MV.z, my=MV.oy+py/MV.z; MV.z=clamp(MV.z*f,1,10); MV.ox=mx-px/MV.z; MV.oy=my-py/MV.z; mvClamp(); drawBig(); };
    big.addEventListener('wheel',e=>{ e.preventDefault(); const [px,py]=cpx(e); zoomAt(px,py,e.deltaY<0?1.25:.8); },{passive:false});
    big.addEventListener('pointerdown',e=>{ big.setPointerCapture(e.pointerId); pts.set(e.pointerId,cpx(e)); moved=0; if(pts.size===2){ const [a,b]=[...pts.values()]; pinch0=Math.hypot(a[0]-b[0],a[1]-b[1]); z0=MV.z; } });
    big.addEventListener('pointermove',e=>{ if(!pts.has(e.pointerId))return; const p=cpx(e), q=pts.get(e.pointerId); pts.set(e.pointerId,p);
      if(pts.size===2){ const [a,b]=[...pts.values()]; const d=Math.hypot(a[0]-b[0],a[1]-b[1]); const cx=(a[0]+b[0])/2, cy=(a[1]+b[1])/2; const mx=MV.ox+cx/MV.z, my=MV.oy+cy/MV.z; MV.z=clamp(z0*d/(pinch0||d),1,10); MV.ox=mx-cx/MV.z; MV.oy=my-cy/MV.z; mvClamp(); moved=99; drawBig(); return; }
      const dx=p[0]-q[0], dy=p[1]-q[1]; moved+=Math.abs(dx)+Math.abs(dy); if(moved>6){ MV.ox-=dx/MV.z; MV.oy-=dy/MV.z; mvClamp(); drawBig(); } });
    const up=e=>{ const had=pts.has(e.pointerId); pts.delete(e.pointerId); if(!had||pts.size)return; if(moved<=6){ const [px,py]=cpx(e); teleport(MX0+(MV.ox+px/MV.z)/MS, MZ0+(MV.oy+py/MV.z)/MS); toggleMap(false); } };
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
    const far=st.mode===2?600:70; POIS.forEach(p=>{ p.sp.visible=Math.hypot(p.x-st.x,p.z-st.z)<far; }); }

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
  function sign(x,z,rot,kind,w,h,top){ const g=new THREE.Group(); const y=H(x,z); const ph=top||2.3; bx(g,.07,ph+.1,.07,0,0,0,poleM); const m=new THREE.Mesh(new THREE.PlaneGeometry(w||.8,h||.8),new THREE.MeshLambertMaterial({map:stex(kind),transparent:kind==='stop'||kind==='50',alphaTest:.3,side:THREE.DoubleSide})); m.position.set(0,ph,.05); g.add(m); g.position.set(x,y,z); g.rotation.y=rot; scene.add(g); return g; }
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
      if(s.road){ dum.position.set(cx,H(cx,cz)-.3,cz); dum.rotation.set(0,-an,0); dum.scale.set(Ln+.05,1.0,1); dum.updateMatrix(); bermIM.setMatrixAt(nb++,dum.matrix); }
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
    if(s.road){ const st2=new THREE.Mesh(new THREE.BoxGeometry(Ln,.75,3.4),concM); st2.position.set(0,-.38,0); gg.add(st2); for(let k=0;k<4;k++) bx(gg,Ln,.18,.45,0,-.72+k*.18,zs*(1.7+(3-k)*.45),concM); }
    const ox=cx+nx*3.2+dx/Ln*(Ln/2+2.2), oz=cz+nz*3.2+dz/Ln*(Ln/2+2.2);
    { const cab=new THREE.Group(); cab.position.set(ox,H(ox,oz),oz); cab.rotation.y=Math.atan2(nx,nz); scene.add(cab); const gm=new THREE.MeshLambertMaterial({color:0x8e9396}); bx(cab,1.1,1.35,.45,0,0,0,gm); bx(cab,1.2,.06,.55,0,1.35,0,gm);
      pl(cab,.22,.22,0,1.05,.24,new THREE.MeshLambertMaterial({map:signTex('⚡','#f2c230','#111111',64,64,'700 44px Arial')})); addSolid({x:ox,z:oz,hw:.6,hd:.3,c:1,s:0,r:.7}); }
    const tx=ox+dx/Ln*2.2, tz=oz+dz/Ln*2.2;
    { const tb=new THREE.Group(); tb.position.set(tx,H(tx,tz),tz); tb.rotation.y=Math.atan2(nx,nz); scene.add(tb); const wood=new THREE.MeshLambertMaterial({color:0x5b3e28});
      [-.75,.75].forEach(o=>bx(tb,.1,2.2,.1,o,0,0,wood)); const paper=tex(128,96,(x,w,h)=>{ x.fillStyle='#3d5a3a'; x.fillRect(0,0,w,h); [[8,8,34,44],[48,12,30,38],[84,6,36,30],[86,44,32,44],[12,58,44,30]].forEach(([a,b,c,d])=>{ x.fillStyle='#f2f0e6'; x.fillRect(a,b,c,d); x.fillStyle='#777'; for(let yy=b+6;yy<b+d-4;yy+=5) x.fillRect(a+4,yy,c-8,1.5); }); });
      bx(tb,1.6,1.1,.08,0,.95,0,wood); pl(tb,1.5,1.0,0,1.5,.05,new THREE.MeshLambertMaterial({map:paper})); const rf=new THREE.Mesh(new THREE.BoxGeometry(1.8,.06,.5),wood); rf.position.set(0,2.15,.05); rf.rotation.x=.25; tb.add(rf); addSolid({x:tx,z:tz,hw:.85,hd:.15,c:1,s:0,r:.9}); }
  }

  /* ---------- pola: bele siana ---------- */
  const BALES=new THREE.InstancedMesh(new THREE.CylinderGeometry(.75,.75,1.25,16).rotateZ(Math.PI/2),new THREE.MeshLambertMaterial({color:0xc6a65a,map:detailTex}),220);
  { let n=0; const big=PARCELS.filter(p=>!p.res&&Math.abs(polyArea(p.p))>9000).sort((a,b)=>hash(a.bb[0])-hash(b.bb[0])).slice(0,40);
    big.forEach((pc,pi)=>{ const c=centroid(pc.p); const m=mar(pc.p); for(let k=0;k<6&&n<220;k++){ const u=(k-2.5)*6, x=c[0]+Math.cos(m.an)*u, z=c[1]+Math.sin(m.an)*u; if(!inPoly(x,z,pc.p)||blocked(x,z,1)||ROADS.some(r=>roadDist(r,x,z)<5))continue; dum.position.set(x,H(x,z)+.72,z); dum.rotation.set(0,-m.an+Math.PI/2+hash(n)*.4,0); dum.scale.set(1,1,1); dum.updateMatrix(); BALES.setMatrixAt(n++,dum.matrix); } });
    BALES.count=n; BALES.castShadow=true; scene.add(BALES); }

  /* ---------- stadion LZS Trębaczew (za DK42) ---------- */
  { const ST=dec([122,937,-80,-53,-9,-18,1,-6,3,-10,41,-58,94,67,-50,78]), PI2=dec([39,864,40,-57,82,56,-41,58,-81,-57]); const m=mar(PI2); const y0=Math.min(...PI2.map(v=>H(v[0],v[1])));
    FLAT.push({p:PI2,bb:bbox(PI2),fe:0,h:y0});
    const surf=new THREE.Mesh(new THREE.PlaneGeometry(m.w,m.d).rotateX(-Math.PI/2),po(new THREE.MeshLambertMaterial({map:courtTex('grass')}),2)); surf.position.set(m.cx,y0+.08,m.cz); surf.rotation.y=-m.an; surf.receiveShadow=true; scene.add(surf);
    const g=new THREE.Group(); g.position.set(m.cx,y0,m.cz); g.rotation.y=-m.an; scene.add(g); const wM=new THREE.MeshLambertMaterial({color:0xffffff});
    [-1,1].forEach(s=>{ const gx=s*(m.w/2-1); [-3.66,3.66].forEach(z=>bx(g,.12,2.44,.12,gx,0,z,wM)); bx(g,.12,.12,7.44,gx,2.44,0,wM); });
    // trybunka i budynek klubowy
    const seatM=new THREE.MeshLambertMaterial({color:0x1f5fb4}); for(let r=0;r<4;r++) bx(g,26,.4,.8,0,r*.4,-m.d/2-2-r*.8,r%2?seatM:new THREE.MeshLambertMaterial({color:0xc8261e}));
    const rf=new THREE.Mesh(new THREE.BoxGeometry(28,.15,4),new THREE.MeshLambertMaterial({color:0x5c666c})); rf.position.set(0,4.2,-m.d/2-3.4); rf.rotation.x=-.12; g.add(rf); [-13,0,13].forEach(x=>bx(g,.15,4.2,.15,x,0,-m.d/2-5.2,poleM));
    const club=new THREE.Group(); club.position.set(m.w/2+8,0,-m.d/2+4); g.add(club); bx(club,8,3.2,12,0,-1,0,new THREE.MeshLambertMaterial({color:0xe9e2cf,map:plasterTex})); const cr=new THREE.Mesh(gabGeo,new THREE.MeshLambertMaterial({color:0x7a3226,map:tileTex})); cr.rotation.y=Math.PI/2; cr.scale.set(12.6,2.2,8.6); cr.position.y=2.2; club.add(cr);
    const lzs=tex(512,96,(x,w,h)=>{ x.fillStyle='#1f5fb4'; x.fillRect(0,0,w,h); x.fillStyle='#fff'; x.font='700 56px Barlow, Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('LZS TRĘBACZEW',w/2,h/2+2); }); pl(club,6,1.1,-4.02,2.2,0,new THREE.MeshLambertMaterial({map:lzs}),-Math.PI/2);
    g.traverse(o=>{ if(o.isMesh)o.castShadow=true; });
    const cc=centroid(PI2); addSolid({x:m.cx+Math.cos(m.an)*(m.w/2+8),z:m.cz+Math.sin(m.an)*(m.w/2+8),hw:4,hd:6,c:Math.cos(m.an),s:Math.sin(m.an),r:7.5});
    POIS.push({n:'Stadion LZS Trębaczew',x:cc[0],z:cc[1],p:cc,c:'#1f5fb4',ic:'⚽',sp:labelSprite('Stadion LZS Trębaczew','#1f5fb4')}); const lp=POIS[POIS.length-1]; lp.sp.position.set(cc[0],y0+8,cc[1]); lp.sp.visible=false; scene.add(lp.sp);
    const b=document.createElement('button'); b.innerHTML='<i style="background:#1f5fb4"></i>'; b.append(lp.n); b.addEventListener('click',()=>{ goTo(lp); toggleMap(false); }); $('poiList').append(b); }

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
  function makeBus(){ const g=new THREE.Group(); const wh=new THREE.MeshPhongMaterial({color:0xf2f0ea,shininess:60}), or=new THREE.MeshLambertMaterial({color:0xd8661f}), gl=new THREE.MeshPhongMaterial({color:0x1b2630,shininess:120});
    bx(g,11,2.6,2.5,0,.45,0,wh); bx(g,11.02,.35,2.52,0,1.0,0,or); [1.27,-1.27].forEach(z=>pl(g,9.6,1.0,-.4,2.25,z,gl,z>0?0:Math.PI)); pl(g,2.3,1.3,5.51,2.1,0,gl,Math.PI/2);
    const pks=tex(256,64,(x)=>{ x.fillStyle='#111'; x.fillRect(0,0,256,64); x.fillStyle='#f4c430'; x.font='700 34px Barlow, Arial'; x.fillText('PKS  Działoszyn',10,44); }); pl(g,2.0,.35,5.52,3.0,0,new THREE.MeshBasicMaterial({map:pks}),Math.PI/2);
    const ws=[]; [[3.6,1.1],[3.6,-1.1],[-3.4,1.1],[-3.4,-1.1]].forEach(([x,z])=>{ const w=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.3,14).rotateX(Math.PI/2),new THREE.MeshLambertMaterial({color:0x151515})); w.position.set(x,.5,z); g.add(w); ws.push(w); });
    g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); g.userData.wheels=ws; return g; }
  function addParked(g,x,z,h,kind,name,maxV,acc){ if(blocked(x,z,1.2))return null; const c={g,x,z,h,v:0,steer:0,kind,name,maxV,acc}; seatCar(g,x,z,h); scene.add(g); parked.push(c); return c; }
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
  const FREIGHT=[]; { const loco=new THREE.Group(); bx(loco,16,3.4,3,0,.5,0,new THREE.MeshPhongMaterial({color:0xb3262b,shininess:40})); bx(loco,16.05,.4,3.05,0,1.5,0,new THREE.MeshLambertMaterial({color:0xe8c23a})); scene.add(loco); FREIGHT.push(loco);
    for(let i=0;i<22;i++){ const w=new THREE.Group(); bx(w,13,2.4,2.9,0,.6,0,new THREE.MeshLambertMaterial({color:i%3?0x4a3a2f:0x5a4a3c})); bx(w,12.6,.6,2.6,0,2.8,0,new THREE.MeshLambertMaterial({color:0x1b1b1d})); w.traverse(o=>{if(o.isMesh)o.castShadow=true;}); scene.add(w); FREIGHT.push(w); } }

  /* ---------- policja ---------- */
  const COPS=[];
  function makeCop(){ const g=makeCar(0xf2f2f0,''); const stripe=new THREE.Mesh(new THREE.BoxGeometry(3.9,.14,1.82),new THREE.MeshLambertMaterial({color:0x1f4fa3})); stripe.position.y=.66; g.add(stripe);
    const bar=new THREE.Group(); const r=new THREE.Mesh(new THREE.BoxGeometry(.3,.15,.5),new THREE.MeshBasicMaterial({color:0xff2020})), b=new THREE.Mesh(new THREE.BoxGeometry(.3,.15,.5),new THREE.MeshBasicMaterial({color:0x2040ff})); r.position.z=.3; b.position.z=-.3; bar.add(r,b); bar.position.set(-.45,1.53,0); g.add(bar);
    const pt=tex(256,48,(x)=>{ x.fillStyle='#1f4fa3'; x.fillRect(0,0,256,48); x.fillStyle='#fff'; x.font='700 34px Barlow, Arial'; x.textAlign='center'; x.fillText('POLICJA',128,36); }); [.94,-.94].forEach(z=>{ const p=new THREE.Mesh(new THREE.PlaneGeometry(2.2,.4),new THREE.MeshBasicMaterial({map:pt})); p.position.set(0,.66,z*.98); if(z<0)p.rotation.y=Math.PI; g.add(p); });
    const light=new THREE.PointLight(0xff2020,0,25,2); light.position.set(0,2.4,0); g.add(light); g.userData.bar=[r,b]; g.userData.light=light; return g; }
  function spawnCop(){ for(let t=0;t<40;t++){ const r=pick(ROADS.filter(q=>q.t!=='track'&&q.L>60)); const s=sampleLine(r.pts,r.len,R(0,r.L)); const d=Math.hypot(s.x-st.x,s.z-st.z); if(d<45||d>200||blocked(s.x,s.z,2))continue; const g=makeCop(); scene.add(g); COPS.push({g,x:s.x,z:s.z,h:Math.atan2(st.z-s.z,st.x-s.x),v:0,hitT:-9,far:0}); return; } }
  let copHitT=-9, trafficHitT=-9;

  /* ---------- czas, pogoda, pory roku ---------- */
  const SEASONS=['wiosna','lato','jesień','zima'], WEATHERS=['słonecznie','deszcz','mgła','śnieg'];
  const ENV={time:14,speed:1/60,season:2,weather:0,wTimer:240,quality:1,lastNight:null};
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
  function envUpdate(dt){ ENV.time=(ENV.time+dt*ENV.speed+24)%24; const a=(ENV.time-6)/12*Math.PI; const se=Math.sin(a); const k=clamp((se+0.08)/0.33,0,1); const dusk=se>-0.12?clamp(1-Math.abs(se)/0.32,0,1):0;
    if(se>-0.05) SUNDIR.set(Math.cos(a)*0.75,Math.max(0.06,se*0.8),0.55).normalize(); else SUNDIR.set(-0.4,0.6,-0.5).normalize(); skyU.sunDir.value.copy(SUNDIR);
    const w=ENV.weather; if(!ENV.W){ ENV.W=[0,0,0,0]; ENV.W[w]=1; } for(let i=0;i<4;i++) ENV.W[i]+=((i===w?1:0)-ENV.W[i])*Math.min(1,dt/7); const Wt=ENV.W, wet=1-Wt[0]; const wl=Wt[0]+Wt[1]*.62+Wt[2]*.75+Wt[3]*.85;
    skyU.hor.value.copy(lerpHex(NIGHT.hor,DAY.hor,k)).lerp(cB.set(0xff8a4a),dusk*.55).lerp(cB.set(0x9aa3aa),(Wt[1]+Wt[2])*.6+Wt[3]*.5); skyU.zen.value.copy(lerpHex(NIGHT.zen,DAY.zen,k)).lerp(cB.set(0x7d868d),wet*.55*k); skyU.night.value=1-k;
    scene.fog.color.copy(lerpHex(NIGHT.fog,DAY.fog,k)).lerp(cB.set(0xe08a5a),dusk*.35).lerp(cB.set(0xa9b0b4),wet*.6*k);
    scene.fog.near=Wt[0]*140+Wt[1]*50+Wt[2]*12+Wt[3]*40; scene.fog.far=Wt[0]*820+Wt[1]*380+Wt[2]*170+Wt[3]*320;
    hemi.intensity=(NIGHT.hemi+(DAY.hemi-NIGHT.hemi)*k)*wl; sun.intensity=(se>-0.05?Math.max(0,se)*1.5*(1-dusk*.3):0.14)*wl*(1-.5*Wt[2]); sun.color.copy(lerpHex(0xff9a5a,DAY.sunC,clamp(se*3,0,1))); if(se<=-0.05) sun.color.set(0x9fb4ff);
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
    BUS.g.visible=ENV.time>5&&ENV.time<23; }
  toggleNight=function(){ ENV.time=(ENV.time>=6.5&&ENV.time<19)?21.5:11; toast(ENV.time>12?'Przewinięto do wieczora':'Przewinięto do południa',2); };

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
    horn(){ const t=AU.ctx.currentTime; tone('sawtooth',311,t,1.4,.05); tone('sawtooth',370,t,1.4,.05); },
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
    else if(s.g==='lo-fi'){ if(b===0||b===10) DR.kick(t,.4,d); if(full&&(b===4||b===12)) DR.rim(t,.4,d), DR.snare(t,.12,d); if(b%2===0) DR.hat(t,.025,d); if(b%4===0) noiseHit(t,.4,.012,'bandpass',2500,d);
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
    if(s%2===0) noiseHit(t,.035,.006,'highpass',7000,d);
    if((s===2||s===5||s===7)&&rnd()<.45) tone('sine',PENTA[Math.floor(rnd()*PENTA.length)],t,.3,.012,d); }
  function audioUpdate(dt){ if(!AU.ctx||!AU.on)return; const C=AU.ctx, now=C.currentTime;
    { const tg=(ENV.W?ENV.W[1]:(ENV.weather===1?1:0))*(st.inside?.15:.32); AU.rain.gain.setTargetAtTime(tg,C.currentTime,.6); if(tg>.05&&rnd()<dt*14) noiseHit(C.currentTime+R(0,.05),R(.03,.07),R(.006,.016)*tg*3,'bandpass',R(1800,3600)); }
    const inCar=st.car&&st.car.kind!=='bike'; AU.engG.gain.value=inCar?.05+Math.min(.06,Math.abs(st.car.v)*.003):0; if(inCar) AU.eng.frequency.value=(st.car.kind==='tractor'?28:38)+Math.abs(st.car.v)*(st.car.kind==='moto'?6:3.2);
    const copNear=COPS.some(c=>Math.hypot(c.x-st.x,c.z-st.z)<120); AU.sirG.gain.value=copNear?.035:0; if(copNear) AU.siren.frequency.value=800+Math.sin(now*3)*350;
    const radioOn=st.car&&st.car.kind!=='bike'&&st.car.kind!=='tractor'&&AU.station<OFF; AU.radioG.gain.value+=((radioOn?.85:0)-AU.radioG.gain.value)*Math.min(1,dt*3);
    const s=STN[AU.station]; const sp=60/(s?s.bpm:100)/4;
    if(AU.next<now-.3) AU.next=now+.05; while(AU.next<now+.15){ if(radioOn) musicStep(AU.next,AU.step); AU.step++; AU.next+=sp; }
    // muzyka w sklepach, pizzerii i organy w kościele
    { const mk=st.inside?(CUR===IN?'shop':({shop:'shop',counter:'shop',rest:'rest',church:'organ'})[CUR.kind]||null):null;
      if(!AU.musG){ AU.musG=C.createGain(); AU.musG.gain.value=0; const lp=C.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3400; AU.musG.connect(lp); lp.connect(AU.master); AU.mNext=now; AU.mStep=0; }
      AU.musG.gain.value+=((mk?(mk==='organ'?.55:.45):0)-AU.musG.gain.value)*Math.min(1,dt*2);
      if(mk){ const sp=mk==='organ'?.5:mk==='rest'?60/132/2:60/100/2; if(AU.mNext<now-.3) AU.mNext=now+.05; while(AU.mNext<now+.2){ storeStep(mk,AU.mNext,AU.mStep++); AU.mNext+=sp; } } }
    // tło przyrody: w aucie przytłumione
    const E=natureEnv(), day=ENV.time>5&&ENV.time<20.5, muf=st.inside?0:inCar?.25:1, gust=.6+.4*Math.sin(now*.23)*Math.sin(now*.071+1);
    if(AU.wind){ AU.wind.g.gain.value=(.035+(E.houses<3?.03:0)+(ENV.weather===2?.05:0))*gust*muf; AU.wind.fl.frequency.value=260+gust*260;
      AU.leaves.g.gain.value=(E.forest?.02:E.houses>4?.008:.004)*Math.max(0,gust-.4)*muf; AU.crick.g.gain.value=(!day&&ENV.season>0&&ENV.season<3&&ENV.weather===0?.012:0)*muf; }
    AU.amb-=dt; if(AU.amb<0&&!st.inside){ AU.amb=R(1.2,4); if(ENV.weather===1||ENV.weather===2){ if(rnd()<.2) NAT.crow(); return; } const h=ENV.time, r=rnd();
      if(day){ if(E.forest){ if(r<.35)NAT.blackbird(); else if(r<.5)NAT.cuckoo(); else if(r<.65)NAT.woodpecker(); else if(r<.8)NAT.sparrow(); }
        else if(E.houses>2){ if(r<.4)NAT.sparrow(); else if(r<.6)NAT.blackbird(); else if(r<.68&&h>4.5&&h<9)NAT.rooster(); else if(r<.8)NAT.dog(); }
        else { if(r<.35)NAT.lark(); else if(r<.5)NAT.crow(); else if(r<.6)NAT.cuckoo(); else if(r<.7&&E.farm)NAT.cow(); } }
      else { if(E.water&&r<.5)NAT.frog(); else if(E.forest&&r<.3)NAT.owl(); else if(E.houses>2&&r<.15)NAT.dog(); else if(r<.1)NAT.owl(); } } }
  function onCarEnter(){ const kind=st.car&&st.car.kind; if(kind==='bike')return; if(!AU.ctx){ audioStart(); } if(!AU.ctx)return; if(!AU.on&&!AU.userOff){ AU.on=true; AU.master.gain.value=.6; updButtons(); }
    if(AU.station>=OFF||!AU.picked){ AU.station=Math.floor(Math.random()*STN.length); AU.picked=true; } AU.step=0; AU.next=AU.ctx.currentTime+.25;
    if(kind!=='tractor') toast(`📻 <b>${STN[AU.station].n}</b><br>${STN[AU.station].g} · <kbd>R</kbd> zmienia stację`,3); }
  let lastBell=-1, lastHorn=-99;
  function extRadio(){ if(!st.car)return; AU.picked=true; AU.station=(AU.station+1)%STATIONS.length; toast('📻 '+STATIONS[AU.station],2); }

  /* ---------- sklepy: kupowanie ---------- */
  const SHOPS=[
    {n:'Lewiatan',get p(){ if(B_LEW.door) return B_LEW.door; const f=B_LEW.front; return [f.x+f.nx*2,f.z+f.nz*2]; },items:[['Hot-dog',8,'hp',40],['Napój energetyczny',6,'boost',60],['Woda mineralna',3,'hp',10],['Znicz',7,'znicz',0]]},
    {n:'Żabka',get p(){ const f=B_ZAB.front; return [f.x+f.nx*2,f.z+f.nz*2]; },items:[['Kawa z ekspresu',9,'hp',20],['Zapiekanka',12,'hp',50],['Napój energetyczny',6,'boost',60],['Hot-dog',8,'hp',40]]},
    {n:'Euforia Trębaczew',p:[-151,-344],items:[['Pizza',32,'hp',100],['Burger',24,'hp',70],['Frytki',10,'hp',25]]},
    {n:'Apteka Magnolia',p:[-94,-195],items:[['Plastry',6,'hp',25],['Witaminy',15,'hp',45]]},
    {n:'Delikatesy Premium',p:[-145,-330],items:[['Kanapka',9,'hp',30],['Sok',5,'hp',10]]}];
  let SHOP_OPEN=null;
  function openShop(s){ SHOP_OPEN=s; keys.clear(); shopEl.hidden=false; shopEl.innerHTML=`<h2>${s.n}</h2><p class="sub">${s.sub||'Kasa'} · masz ${fmt(st.money)}</p>`+s.items.map((it,i)=>`<button data-i="${i}"><kbd>${i+1}</kbd> ${it[0]}<span>${it[1]} zł</span></button>`).join('')+`<button data-i="x" class="close">Wyjdź <kbd>E</kbd></button>`;
    shopEl.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ const i=b.dataset.i; if(i==='x')closeShop(); else buy(+i); })); }
  function closeShop(){ SHOP_OPEN=null; shopEl.hidden=true; canvas.focus(); }
  function buy(i){ const it=SHOP_OPEN&&SHOP_OPEN.items[i]; if(!it)return; if(st.money<it[1]){ toast('Za mało pieniędzy',2); return; } st.money-=it[1]; shownMoney=st.money; moneyEl.textContent=fmt(st.money); if(AU.ctx&&AU.on)sfx.cash();
    if(it[2]==='book'){ st.books=(st.books||0)+1; toast(`Wypożyczono: ${it[0]}`,3); saveGame(); openShop(SHOP_OPEN); return; } if(it[2]==='canister'){ st.canister=(st.canister||0)+it[3]; }
    if(it[2]==='hp') st.hp=Math.min(100,st.hp+it[3]); if(it[2]==='boost') st.boost=it[3]; toast(`Kupiono: ${it[0]}`,2); saveGame(); openShop(SHOP_OPEN); }
  addEventListener('keydown',e=>{ if(!SHOP_OPEN)return; const n=parseInt(e.key,10); if(n>=1&&n<=9){ buy(n-1); e.preventDefault(); } if(e.key==='Escape'){ closeShop(); e.preventDefault(); } },true);

  /* ---------- misje ---------- */
  const resHouses=houses.filter(h=>h.kind==='house'&&!h.isPart);
  const housesBy=(f)=>resHouses.filter(f);
  /* ---------- interakcja (E) i podpowiedzi ---------- */
  function nearShop(){ if(st.inside){ const sh=CUR===IN?IN_SHOP:CUR.shop; return sh&&Math.hypot(sh.p[0]-st.x,sh.p[1]-st.z)<2.4?sh:null; } return SHOPS.find(s=>{ if(s.n==='Lewiatan'||s.room)return false; const p=s.p; return Math.hypot(p[0]-st.x,p[1]-st.z)<4.5; }); }
  function nearStoreDoor(){ if(st.car)return false; if(st.inside){ const d=CUR.doorW; return d&&Math.hypot(d[0]-st.x,d[1]-st.z)<(IS_TOUCH?3.2:2.3)?'out':false; } DOOR_ENT=null; let bd=IS_TOUCH?4.8:3.4; ENTS.forEach(e=>{ const p=e.p; if(!p)return; const d=Math.hypot(p[0]-st.x,p[1]-st.z); if(d<bd){ bd=d; DOOR_ENT=e; } }); return DOOR_ENT?'in':false; }
  function nearMission(){ return !ACTIVE&&!st.inside&&MISSIONS.find(m=>m.mk.visible&&Math.hypot(m.sp[0]-st.x,m.sp[1]-st.z)<(st.car?5:3)); }
  function extInteract(){ if(SHOP_OPEN){ closeShop(); return; } if(st.car&&nearPump()){ openFuel(); return; } const sd=nearStoreDoor(); if(sd==='out'){ exitRoom(); return; } if(!st.inside){ const gt=nearGate(); if(gt){ toggleGate(gt); return; } } if(sd==='in'&&IS_TOUCH){ DOOR_ENT.enter(); return; } const m=nearMission(); if(m){ startMission(m); return; } if(sd==='in'){ DOOR_ENT.enter(); return; } if(!st.car){ const s=nearShop(); if(s){ openShop(s); return; } } }
  function extHint(){ if(SHOP_OPEN)return ''; const E=IS_TOUCH?'<kbd>Akcja</kbd>':`<kbd>${keyName(KEYMAP.e)}</kbd>`; if(st.car&&nearPump()) return `${E} zatankuj (${FUEL_NAME[st.car.ftype]} ${FUEL[st.car.ftype].toFixed(2).replace('.',',')} zł/l)`; const sd=nearStoreDoor(); if(sd==='out') return `${E} wyjdź na zewnątrz`; if(!st.inside){ const gt=nearGate(); if(gt) return `${E} ${gt.open?'zamknij':'otwórz'} ${gt.kind==='brama'?'bramę':'furtkę'}`; }
    const m=nearMission(); if(m) return `<b>${m.n}</b> · ${E} rozpocznij misję${m.reward?` (nagroda ${fmt(m.main?m.reward:Math.round(m.reward*(1+st.level*.35)))})`:''}`; if(sd==='in') return `${E} wejdź do ${DOOR_ENT.label}`; if(!st.car){ const s=nearShop(); if(s) return `${E} ${st.inside?(s.sub?'wypożycz książkę':'kasa – zrób zakupy'):'zrób zakupy: '+s.n}`; } return ''; }

  /* ---------- zapis postępu ---------- */
  let saveT=10;

  /* ---------- przyciski ---------- */
  function updButtons(){ $('bWeather').textContent='Pogoda: '+WEATHERS[ENV.weather]; $('bSeason').textContent='Pora roku: '+SEASONS[ENV.season]; $('bSound').textContent=AU.on?'Dźwięk: wł.':'Dźwięk: wył.'; $('bQual').textContent='Grafika: '+(ENV.quality?'wysoka':'niska'); }
  $('bWeather').addEventListener('click',()=>{ ENV.weather=(ENV.weather+1)%4; ENV.wTimer=400; updButtons(); });
  $('bSeason').addEventListener('click',()=>{ ENV.season=(ENV.season+1)%4; applySeason(); saveGame(); });
  $('bSound').addEventListener('click',audioStart);
  $('bQual').addEventListener('click',()=>{ ENV.quality=1-ENV.quality; renderer.shadowMap.enabled=!!ENV.quality; sun.castShadow=!!ENV.quality; if(bloom)bloom.enabled=!!ENV.quality; pr=ENV.quality?DPR:Math.min(DPR,.75); renderer.setPixelRatio(pr); resize(); scene.traverse(o=>{ if(o.material&&!Array.isArray(o.material)) o.material.needsUpdate=true; }); updButtons(); });
  $('bAct').addEventListener('click',()=>{ if(IS_TOUCH&&(lastAct==='Wsiądź'||lastAct==='Wysiądź')) enterExit(); else extInteract(); setTimeout(()=>{ if(IS_TOUCH) actLabel(); },50); }); $('bRadio').addEventListener('click',()=>{ if(!AU.ctx)audioStart(); extRadio(); });
  applySeason(); updButtons();

  window.__treb={get GATES(){return GATES;},get MP(){return MP;},get AU(){return AU;},get CB(){return CB;},get TIR(){return TIR_LOT;},startMission:m=>startMission(MISSIONS.find(q=>q.id===m)),get CAMPAIGN(){return CAMPAIGN;},get IN(){return IN;},enterStore:()=>enterStore(),exitStore:()=>exitStore(),showMenu:v=>showMenu(v),get GAME(){return GAME;},addXP:v=>addXP(v),get ORLEN(){return ORLEN;},st,setWanted,openShop:i=>openShop(SHOPS[i]),buy,ENV,COPS,parked,enterExit,get MISSIONS(){return MISSIONS;},get active(){return ACTIVE;},get player(){return player;},LEW:B_LEW,get CUR(){return CUR;},get ROOMS(){return ROOMS;},get ENTS(){return ENTS;},get CRS(){return CRS;},get FUEL(){return FUEL;},openFuel:()=>openFuel(),dbgRoads(){ const out=[]; const seg=(r,x,z)=>roadDist(r,x,z); houses.forEach(h=>{ if(!h.w)return; ROADS.forEach(r=>{ if(r.t==='track'||r.t==='path'||r.t==='foot')return; const d=roadDist(r,h.x,h.z); const R=Math.min(h.w,h.d)/2; if(d<r.w/2+R-0.5) out.push([r.n||r.t,Math.round(h.x),Math.round(h.z),h.kind,+d.toFixed(1),+(r.w/2+R).toFixed(1)]); }); }); return out.slice(0,80); },
  solidsNear(x,z,R){ const o=[]; for(let gx=Math.floor((x-R)/24);gx<=Math.floor((x+R)/24);gx++)for(let gz=Math.floor((z-R)/24);gz<=Math.floor((z+R)/24);gz++){ (grid.get(gx+','+gz)||[]).forEach(q=>{ if(!o.includes(q)) o.push(q); }); } return o.filter(q=>Math.hypot(q.x-x,q.z-z)<R).map(q=>[Math.round(q.x),Math.round(q.z),q.hw&&+q.hw.toFixed(1),q.hd&&+q.hd.toFixed(1),!!q.poly]); },get CHUNKS(){return CHUNKS;}};
  /* ---------- aktualizacja co klatkę ---------- */
  function extUpdate(dt){
    envUpdate(dt); audioUpdate(dt); missionUpdate(dt);
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
    if(BUS.wait>0){ BUS.wait-=dt; BUS.v=0; } else { BUS.v=Math.min(14,BUS.v+dt*3); if(CROSS_D!==null&&crossClosed()){ const toX=CROSS_D-BUS.d-14; if(toX>-.5&&toX<120) BUS.v=Math.min(BUS.v,Math.max(0,toX)*.5); } const nd=BUS.d+BUS.v*dt; const stop=BUS_STOPS.find(sd=>BUS.d<sd&&nd>=sd); BUS.d=nd; if(stop!==undefined){ BUS.wait=7; } if(BUS.d>DK.L){ BUS.d=0; } }
    { const s=sampleLine(DK.pts,DK.len,BUS.d); BUS.x=s.x+s.tz*2.4; BUS.z=s.z-s.tx*2.4; BUS.h=Math.atan2(s.tz,s.tx); seatCar(BUS.g,BUS.x,BUS.z,BUS.h,.1); BUS.g.userData.wheels.forEach(w=>w.rotation.z-=BUS.v*dt/.5);
      if(BUS.g.visible&&!st.car&&!st.inside&&Math.hypot(BUS.x-st.x,BUS.z-st.z)<4){ { const dx=st.x-BUS.x,dz=st.z-BUS.z,l=Math.hypot(dx,dz)||1; st.vx=dx/l*8; st.vz=dz/l*8; st.hp=Math.max(0,st.hp-dt*40); } } }
    // pociąg towarowy (wolniejszy, w przeciwnej fazie)
    { const FL=freightLen[freightLen.length-1], cyc=FL+3000, h0=((tAll+90)*17)%cyc; FREIGHT.forEach((w,i)=>{ const d=FL-(h0-i*14); if(d<0||d>FL){ w.visible=false; return; } w.visible=true; const s=sampleLine(freightPath,freightLen,d); w.position.set(s.x,H(s.x,s.z)+.22,s.z); w.rotation.y=-Math.atan2(s.tz,s.tx); });
      const lead=FREIGHT[0]; if(lead.visible&&Math.hypot(lead.position.x-st.x,lead.position.z-st.z)<350&&tAll-lastHorn>25&&AU.ctx&&AU.on){ lastHorn=tAll; sfx.horn(); } }
    // policja
    if(st.car&&!['bike'].includes(st.car.kind)){ cars.forEach(t=>{ if(Math.hypot(t.x-st.car.x,t.z-st.car.z)<3.8&&tAll-trafficHitT>4){ trafficHitT=tAll; if(rnd()<.5) setWanted(Math.max(st.wanted,1)); } }); }
    const want=Math.min(3,st.wanted); if(COPS.length<want&&rnd()<dt*2) spawnCop();
    for(let i=COPS.length-1;i>=0;i--){ const c=COPS[i]; const tx=st.car?st.car.x:st.x, tz=st.car?st.car.z:st.z; const dx=tx-c.x,dz=tz-c.z, d=Math.hypot(dx,dz);
      if(st.wanted===0){ c.far+=dt; c.v*=1-dt; if(c.far>4||d>200){ scene.remove(c.g); COPS.splice(i,1); continue; } }
      else { const want=Math.atan2(dz,dx); let dh=want-c.h; dh=Math.atan2(Math.sin(dh),Math.cos(dh)); c.h+=clamp(dh,-1.6*dt,1.6*dt); const vmax=Math.min(26,15+st.wanted*3)*(d<10?.4:1); c.v+=(vmax-c.v)*dt*.8;
        const nx=c.x+Math.cos(c.h)*c.v*dt, nz=c.z+Math.sin(c.h)*c.v*dt; if(blocked(nx,nz,1.1,true)){ c.h+=1.4*dt*(c.turn||(c.turn=rnd()<.5?1:-1)); c.v*=.6; } else { c.x=nx; c.z=nz; c.turn=0; }
        if(d<80) st.wantedT=0;
        if(!st.car&&d<2.6&&!st.dead){ st.busted=true; st.dead=2.5; deadEl.textContent='ZATRZYMANY'; deadEl.hidden=false; const fine=Math.round(st.money*.2); st.money-=fine; shownMoney=st.money; moneyEl.textContent=fmt(st.money); toast(`Mandat: ${fine} zł`,3); COPS.forEach(q=>scene.remove(q.g)); COPS.length=0; if(ACTIVE) endMission(false); return; } }
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
  if(OSP_YARD){ const {w,L,FZ,toRoad,f}=OSP_YARD; const q=w(-L/2+2.6,FZ+Math.min(toRoad-1,4.5)); FIRE=addParked(makeFireTruck(),q[0],q[1],Math.atan2(f.nz,f.nx),'fire','Wóz strażacki OSP · Jelcz',24,7); }

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
  const MP={room:null,user:null,on:false,remote:new Map(),sendT:0,last:'',chat:[],canChat:true};
  const mpEl=document.getElementById('mp'), mpCount=document.getElementById('mpCount'), mpList=document.getElementById('mpList'), chatLog=document.getElementById('chatLog'), chatIn=document.getElementById('chatIn'), nickIn=document.getElementById('nickIn');
  let myNick=''; try{ myNick=localStorage.getItem('trebaczew-nick')||''; }catch(e){}
  const MYCOL='#'+new THREE.Color().setHSL(Math.random(),.7,.5).getHexString();
  const cleanTxt=(t,n)=>String(t==null?'':t).replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/g,'').slice(0,n).trim();
  function tagTex(text,color,bubble){ const c=document.createElement('canvas'); c.width=512; c.height=bubble?160:96; const x=c.getContext('2d'); x.font=(bubble?'600 38px':'700 44px')+' "Barlow Condensed", Arial'; x.textAlign='center'; x.textBaseline='middle';
    if(bubble){ const lines=[]; let cur=''; text.split(' ').forEach(wd=>{ const t2=cur?cur+' '+wd:wd; if(x.measureText(t2).width>460&&cur){ lines.push(cur); cur=wd; } else cur=t2; }); lines.push(cur); const L2=lines.slice(0,3); const bw=Math.min(500,Math.max(...L2.map(l=>x.measureText(l).width))+36), bh=L2.length*42+20;
      x.fillStyle='rgba(255,255,255,.95)'; x.beginPath(); x.roundRect?x.roundRect(256-bw/2,(160-bh)/2,bw,bh,16):x.rect(256-bw/2,(160-bh)/2,bw,bh); x.fill(); x.fillStyle='#111'; L2.forEach((l,i)=>x.fillText(l,256,(160-bh)/2+31+i*42)); }
    else { const tw=Math.min(500,x.measureText(text).width+34); x.fillStyle='rgba(0,0,0,.6)'; x.fillRect(256-tw/2,14,tw,64); x.fillStyle=color; x.fillRect(256-tw/2,14,8,64); x.fillStyle='#fff'; x.fillText(text,256+4,47); }
    const t=new THREE.CanvasTexture(c); t.anisotropy=4; return t; }
  function sprite(tex,w,h){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true})); s.scale.set(w,h,1); s.renderOrder=10; return s; }
  function vehModel(kind,color){ if(kind==='moto')return makeMoto(); if(kind==='tractor')return makeTractor(); if(kind==='bus')return makeBus(); if(kind==='bike'){ const b=bikeM(); b.userData.wheels=[]; return b; } if(kind==='fire')return makeFireTruck(); const g=makeCar(new THREE.Color(color||'#888888'),kind==='van'?'van':''); return g; }
  function ensureRemote(p){ let r=MP.remote.get(p.peer); if(!r){ const col=typeof p.presence.col==='string'&&/^#[0-9a-f]{6}$/i.test(p.presence.col)?p.presence.col:'#888888';
      const body=makePerson(new THREE.Color(col).getHex(),0x2c3e66,0x2a1d14,{female:false,style:'jacket',hairStyle:'short',skin:0xe6bb98}); scene.add(body); const tag=sprite(tagTex('…',col),3.2,.6); scene.add(tag);
      r={peer:p.peer,by:p.by,col,body,tag,veh:null,vk:null,x:+p.presence.x||0,z:+p.presence.z||0,h:+p.presence.h||0,tx:0,tz:0,th:0,walk:0,name:'',bubble:null,bubT:0,spd:0}; MP.remote.set(p.peer,r); }
    const pr=p.presence; if(Number.isFinite(+pr.x)&&Number.isFinite(+pr.z)){ r.tx=clamp(+pr.x,X0,X1); r.tz=clamp(+pr.z,Z0,Z1); r.th=+pr.h||0; r.spd=+pr.s||0; }
    if(!r.seen){ r.x=r.tx; r.z=r.tz; r.h=r.th; r.seen=true; }
    const vk=['car','van','moto','tractor','bus','bike','fire'].includes(pr.v)?pr.v:null; const vc=typeof pr.vc==='string'&&/^#[0-9a-f]{6}$/i.test(pr.vc)?pr.vc:'#888888';
    if(vk!==r.vk||vc!==r.vc){ if(r.veh){ scene.remove(r.veh); r.veh=null; } r.vk=vk; r.vc=vc; if(vk){ r.veh=vehModel(vk,vc); scene.add(r.veh); } }
    return r; }
  async function mpNames(){ const list=[...MP.remote.values()]; let prof={}; const ids=list.map(r=>r.by).filter(Boolean);
    if(MP.user&&ids.length){ try{ prof=await MP.user.profiles(ids); }catch(e){} }
    list.forEach(r=>{ const pr=(MP.room.peers().find(p=>p.peer===r.peer)||{}).presence||{}; const nm=cleanTxt(pr.nick,24)||(r.by&&prof[r.by]&&prof[r.by].name)||'Gracz'; if(nm!==r.name){ r.name=nm; r.tag.material.map.dispose(); r.tag.material.map=tagTex(nm,r.col); r.tag.material.needsUpdate=true; } });
    renderList(); }
  function renderList(){ if(!MP.on)return; const n=MP.remote.size+1; mpCount.textContent=MP.room&&MP.room.connected&&!MP.room.connected()?'Łączenie z serwerem…':n===1?'Tylko Ty w Trębaczewie':`${n} graczy w Trębaczewie`; mpList.textContent='';
    const add=(name,col,me)=>{ const li=document.createElement('div'); li.className='mpi'; const d=document.createElement('i'); d.style.background=col; li.appendChild(d); const s=document.createElement('span'); s.textContent=name+(me?' (Ty)':''); li.appendChild(s); mpList.appendChild(li); };
    add(myNick||'Ty',MYCOL,true); [...MP.remote.values()].forEach(r=>add(r.name||'Gracz',r.col,false)); }
  function addChat(name,col,text){ const row=document.createElement('div'); row.className='cl'; const b=document.createElement('b'); b.textContent=name+': '; b.style.color=col; row.appendChild(b); row.appendChild(document.createTextNode(text)); chatLog.appendChild(row); while(chatLog.children.length>6) chatLog.removeChild(chatLog.firstChild); MP.chat.push({row,t:12}); }
  function bubble(r,text){ if(r.bubble){ scene.remove(r.bubble); r.bubble.material.map.dispose(); } r.bubble=sprite(tagTex(text,'#fff',true),4.2,1.3); scene.add(r.bubble); r.bubT=6; }
  const meR={body:player,bubble:null,bubT:0};
  function myPresence(){ const c=st.car; const kind=c?(c.kind||'car'):null; let vc=null; if(c&&(!c.kind||c.kind==='van')){ const m=c.g.children[0]&&c.g.children[0].material; if(m&&m.color) vc='#'+m.color.getHexString(); }
    return {x:+(c?c.x:st.x).toFixed(2),z:+(c?c.z:st.z).toFixed(2),h:+(c?c.h:st.face).toFixed(3),v:kind,vc,s:+(c?Math.abs(c.v):Math.hypot(st.vx||0,st.vz||0)).toFixed(1),col:MYCOL,nick:myNick||null}; }
  const MP_URL='wss://trebaczew-mp.kontakt-3e3.workers.dev';
  // połączenie z serwerem gry (Cloudflare) – ten sam interfejs co pokój Claude
  function wsRoom(base){ const peers=new Map(), subP=[], subE={}; let ws=null, ok=false, ever=false, room=1, lastP=null, retry=0, ping=null, tries=0, warned=false;
    const fire=ch=>subP.forEach(f=>{ try{ f(ch); }catch(e){ console.warn(e); } }); const none={joined:[],left:[],updated:[]};
    function connect(){ try{ ws=new WebSocket(base+'/room/t'+room); }catch(e){ return later(); }
      ws.onmessage=e=>{ if(e.data==='pong')return; let m; try{ m=JSON.parse(e.data); }catch(_){ return; }
        if(m.t==='full'){ tries++; room=room%9+1; ws.onclose=null; try{ ws.close(); }catch(_){} if(tries<9) setTimeout(connect,150); else { toast('Wszystkie pokoje są pełne – spróbuj za chwilę',3); later(); } return; }
        if(m.t==='hello'){ ok=true; ever=true; retry=0; tries=0; const left=[...peers.values()]; peers.clear(); if(left.length) fire({...none,left});
          const j=(m.peers||[]).map(p=>({peer:p.peer,presence:p.presence,kind:'viewer'})); j.forEach(p=>peers.set(p.peer,p)); if(lastP) ws.send(JSON.stringify({t:'p',d:lastP})); fire({...none,joined:j});
          clearInterval(ping); ping=setInterval(()=>{ if(ws.readyState===1) ws.send('ping'); },25000); toast(`🌐 Połączono · pokój ${room}`,2); return; }
        if(m.t==='p'){ const had=peers.has(m.peer); const p={peer:m.peer,presence:m.d,kind:'viewer'}; peers.set(m.peer,p); fire(had?{...none,updated:[p]}:{...none,joined:[p]}); return; }
        if(m.t==='l'){ const p=peers.get(m.peer); if(p){ peers.delete(m.peer); fire({...none,left:[p]}); } return; }
        if(m.t==='e'){ (subE[m.topic]||[]).forEach(f=>{ try{ f({peer:m.peer,data:m.d,sameTab:!!m.me}); }catch(err){ console.warn(err); } }); return; }
        if(m.t==='err'&&m.code==='slow') toast('Za szybko piszesz – chwila przerwy',1.5); };
      ws.onclose=()=>{ const was=ok; ok=false; clearInterval(ping); fire(none); if(was) toast('Utracono połączenie – łączę ponownie…',2); later(); }; ws.onerror=()=>{}; }
    function later(){ retry=Math.min(retry+1,6); if(!ever&&retry>=3&&!warned){ warned=true; toast('Nie mogę połączyć się z serwerem gry.<br>Tryb wieloosobowy działa na <b>trebaczew.io</b>',5); } setTimeout(connect,1500*retry); }
    connect();
    return { peers:()=>[...peers.values()], connected:()=>ok&&!!ws&&ws.readyState===1, onPeers(f){ subP.push(f); }, on(t,f){ (subE[t]=subE[t]||[]).push(f); },
      emit(t,d){ if(!ok||ws.readyState!==1) return Promise.reject({code:'offline'}); ws.send(JSON.stringify({t:'e',topic:t,d})); return Promise.resolve(); },
      presence(p){ lastP=p; if(ok&&ws.readyState===1) ws.send(JSON.stringify({t:'p',d:p})); return Promise.resolve(); } }; }
  async function mpInit(useWs){ try{ let room; if(useWs){ room=wsRoom(MP_URL); } else { if(!window.claude||!window.claude.use)return; room=await window.claude.use('room'); if(!room)return; try{ MP.user=await window.claude.use('user'); }catch(e){} } MP.room=room;
      if(!myNick&&CHAR.name) myNick=cleanTxt(CHAR.name,24);
      if(!myNick&&MP.user){ try{ const me=await MP.user.me(); if(me&&me.name) myNick=cleanTxt(me.name.split(' ')[0],24); }catch(e){} }
      MP.on=true; mpEl.hidden=false; nickIn.value=myNick; renderList();
      room.onPeers(ch=>{ ch.left.forEach(p=>{ const r=MP.remote.get(p.peer); if(!r)return; [r.body,r.tag,r.veh,r.bubble].forEach(o=>o&&scene.remove(o)); MP.remote.delete(p.peer); if(r.name) toast(`👋 ${r.name.replace(/[<>&]/g,'')} wychodzi z gry`,2); });
        let names=false; [...ch.joined,...ch.updated].forEach(p=>{ if(p.sameTab||p.kind!=='viewer')return; if(!p.presence||p.presence.x===undefined)return; const isNew=!MP.remote.has(p.peer); ensureRemote(p); if(isNew){ names=true; } else { const r=MP.remote.get(p.peer); const nk=cleanTxt(p.presence.nick,24); if(nk&&nk!==r.name) names=true; } });
        if(names) mpNames(); else renderList(); },()=>{});
      room.on('chat',msg=>{ const d=msg.data||{}; const text=cleanTxt(d.t,140); if(!text)return; if(msg.sameTab){ addChat(myNick||'Ty',MYCOL,text); bubble(meR,text); return; } const r=MP.remote.get(msg.peer); addChat(r?r.name||'Gracz':'Gracz',r?r.col:'#ccc',text); if(r) bubble(r,text); if(AU.ctx&&AU.on&&sfx.cash) {} },()=>{});
      room.on('klakson',msg=>{ if(msg.sameTab)return; const r=MP.remote.get(msg.peer); if(r&&AU.ctx&&AU.on&&Math.hypot(r.x-st.x,r.z-st.z)<120&&sfx.horn) sfx.horn(); },()=>{});
      room.presence(myPresence()).catch(()=>{});
    }catch(e){ console.warn('multiplayer',e); } }
  function sendChat(){ const t=cleanTxt(chatIn.value,140); chatIn.value=''; chatIn.blur(); chatBox(false); if(!t||!MP.room)return; if(!MP.room.connected()){ toast('Brak połączenia z innymi graczami',2); return; }
    MP.room.emit('chat',{t}).catch(e=>{ if(e&&e.code==='not_permitted'){ MP.canChat=false; toast('Czat jest dostępny dla osób z prawem współpracy (Contributor) w udostępnieniu',3); } }); }
  function chatBox(open){ document.getElementById('chatRow').hidden=!open; if(open){ releaseAll(); setTimeout(()=>chatIn.focus(),0); } }
  addEventListener('keydown',e=>{ if(!MP.on)return; const tag=e.target&&e.target.tagName; if(tag==='INPUT'){ e.stopPropagation(); if(e.key==='Enter'&&e.target===chatIn){ e.preventDefault(); sendChat(); } if(e.key==='Escape'){ e.target.blur(); chatBox(false); } return; }
    if(e.code==='KeyT'&&!e.repeat){ e.preventDefault(); chatBox(true); } if(e.code==='KeyH'&&!e.repeat&&st.car&&MP.room){ MP.room.emit('klakson',{}).catch(()=>{}); if(AU.ctx&&AU.on&&sfx.horn) sfx.horn(); } },true);
  addEventListener('keyup',e=>{ if(e.target&&e.target.tagName==='INPUT') e.stopPropagation(); },true);
  document.getElementById('bChat').addEventListener('click',()=>chatBox(document.getElementById('chatRow').hidden));
  document.getElementById('chatSend').addEventListener('click',sendChat);
  nickIn.addEventListener('change',()=>{ myNick=cleanTxt(nickIn.value,24); try{ localStorage.setItem('trebaczew-nick',myNick); }catch(e){} renderList(); MP.last=''; });
  function mpBlips(dot){ MP.remote.forEach(r=>dot(r.x,r.z,r.col,5.5)); }
  function mpUpdate(dt){ crossUpdate(); gatesUpdate(dt); animalsUpdate(dt); parkGuysUpdate(dt); interiorUpdate(dt); roomsUpdate(dt); storeDoorAuto(); cullUpdate();
    if(FIRE&&FIRE.g.userData.bar){ const on=st.car===FIRE&&Math.abs(FIRE.v)>1, fl=Math.floor(tAll*7)%2; FIRE.g.userData.bar[0].visible=!on||!!fl; FIRE.g.userData.bar[1].visible=!on||!fl; }
    if(OSP_FLAG){ const p=OSP_FLAG.geometry.attributes.position; for(let i=0;i<p.count;i++){ const x=p.getX(i)+.75; p.setZ(i,Math.sin(tAll*4+x*3)*.12*x); } p.needsUpdate=true; }
    MP.chat=MP.chat.filter(c=>{ c.t-=dt; if(c.t<3) c.row.style.opacity=Math.max(0,c.t/3); if(c.t<=0){ c.row.remove(); return false; } return true; });
    if(meR.bubble){ meR.bubT-=dt; const px=st.car?st.car.x:st.x, pz=st.car?st.car.z:st.z; meR.bubble.position.set(px,H(px,pz)+(st.car?4:3.1),pz); if(meR.bubT<=0){ scene.remove(meR.bubble); meR.bubble=null; } }
    if(!MP.on)return;
    MP.sendT-=dt; if(MP.sendT<=0){ MP.sendT=1/12; const p=myPresence(); const k=JSON.stringify(p); if(k!==MP.last){ MP.last=k; MP.room.presence(p).catch(()=>{}); } }
    MP.remote.forEach(r=>{ const k=Math.min(1,dt*10); r.x+=(r.tx-r.x)*k; r.z+=(r.tz-r.z)*k; let dh=r.th-r.h; dh=Math.atan2(Math.sin(dh),Math.cos(dh)); r.h+=dh*k; const y=H(r.x,r.z);
      if(r.veh){ seatCar(r.veh,r.x,r.z,r.h,r.vk==='bus'?.1:0); (r.veh.userData.wheels||[]).forEach(w=>w.rotation.z-=r.spd*dt/.36); const rider=r.vk==='bike'||r.vk==='moto'; r.body.visible=rider; if(rider){ r.body.position.set(r.x,y+.35,r.z); r.body.rotation.y=-r.h+Math.PI/2; animPerson(r.body,tAll*r.spd*.8,r.vk==='bike'?.5:0); } }
      else { r.body.visible=true; r.body.position.set(r.x,y+.1,r.z); r.body.rotation.y=r.h; r.walk+=dt*r.spd*1.6; animPerson(r.body,r.walk,Math.min(1,r.spd/4.2)); }
      const hy=y+(r.vk&&r.vk!=='bike'&&r.vk!=='moto'?(r.vk==='bus'||r.vk==='fire'?4.2:2.9):2.45); r.tag.position.set(r.x,hy,r.z); const d=camera.position.distanceTo(r.tag.position); const sc=clamp(d/18,1,7); r.tag.scale.set(3.2*sc,.6*sc,1);
      if(r.bubble){ r.bubT-=dt; r.bubble.position.set(r.x,hy+.9*sc,r.z); r.bubble.scale.set(4.2*sc,1.3*sc,1); if(r.bubT<=0){ scene.remove(r.bubble); r.bubble=null; } } });
  }
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
  const IN={x:2900,z:600,y:150,W:22,D:16,built:false,g:null,npc:[],box:[],ret:null};
  const IN_DOOR=[-8.5,7.0], IN_CASH=[-2.4,4.6];
  const IN_SHOP={n:'Lewiatan',get p(){ return [IN.x+IN_CASH[0],IN.z+IN_CASH[1]]; },get items(){ return SHOPS[0].items; }};
  const inBlocked=(x,z,r)=>{ r=r||.35; const lx=x-IN.x, lz=z-IN.z; if(lx<-IN.W/2+r||lx>IN.W/2-r||lz<-IN.D/2+r||lz>IN.D/2-r) return true; return IN.box.some(b=>lx>b[0]-r&&lx<b[2]+r&&lz>b[1]-r&&lz<b[3]+r); };
  function shelfTex(kind){ return tex(512,256,(c,w,h)=>{ c.fillStyle=kind==='fridge'?'#dfe9ee':'#f2f0ea'; c.fillRect(0,0,w,h); const rows=kind==='fridge'?5:4, rh=h/rows;
      const PAL=kind==='drink'?['#c81e1e','#1e5cc8','#f0b400','#2a8a3a','#ff7a00','#7a1e8a','#e8e8e8']:kind==='fridge'?['#ffffff','#2f6fd0','#f4d23a','#e23a3a','#59b04a','#f7f2e0']:['#d8452a','#f2c230','#3a7bd5','#5aa34a','#8a5a2b','#e86aa0','#f5f5f0','#2a2a2a','#ff8c1a'];
      for(let r=0;r<rows;r++){ const y0=r*rh; c.fillStyle=kind==='fridge'?'#b9c6cc':'#9aa0a6'; c.fillRect(0,y0+rh-7,w,7); c.fillStyle='#1d7a3a'; c.fillRect(0,y0+rh-7,w,2);
        let x=3; while(x<w-6){ const pw=kind==='drink'?10+Math.random()*6:12+Math.random()*22, ph=(kind==='drink'?.78:.45+Math.random()*.4)*(rh-10); const col=PAL[Math.floor(Math.random()*PAL.length)]; const n=1+Math.floor(Math.random()*4);
          for(let k=0;k<n&&x<w-6;k++){ if(kind==='drink'){ c.fillStyle=col; c.fillRect(x+2,y0+rh-7-ph,pw-4,ph); c.fillRect(x+pw/2-2,y0+rh-7-ph-8,4,8); c.fillStyle='rgba(255,255,255,.7)'; c.fillRect(x+2,y0+rh-7-ph*.6,pw-4,ph*.22); }
            else { c.fillStyle=col; c.fillRect(x,y0+rh-7-ph,pw-1,ph); c.fillStyle='rgba(255,255,255,.55)'; c.fillRect(x+2,y0+rh-7-ph*.7,pw-5,ph*.25); c.fillStyle='rgba(0,0,0,.18)'; c.fillRect(x+pw-3,y0+rh-7-ph,2,ph); }
            x+=pw; } x+=2; }
        c.fillStyle='#ffd23a'; for(let k=0;k<4;k++){ const px=20+k*125; c.fillRect(px,y0+rh-6,26,5); } } }); }
  function buildInterior(){ if(IN.built)return; IN.built=true; const g=new THREE.Group(); g.position.set(IN.x,IN.y,IN.z); scene.add(g); IN.g=g; const W=IN.W, D=IN.D, HT=3.6;
    const tile=tex(256,256,(c,w,h)=>{ c.fillStyle='#c9c5bc'; c.fillRect(0,0,w,h); c.fillStyle='#cbc7be'; c.fillRect(0,0,w/2,h/2); c.fillRect(w/2,h/2,w/2,h/2); c.strokeStyle='rgba(0,0,0,.12)'; c.lineWidth=2; c.strokeRect(0,0,w,h); c.beginPath(); c.moveTo(w/2,0); c.lineTo(w/2,h); c.moveTo(0,h/2); c.lineTo(w,h/2); c.stroke(); }); tile.repeat.set(W/1.2,D/1.2);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(W,D).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({map:tile})); floor.receiveShadow=true; g.add(floor);
    const wallM=new THREE.MeshLambertMaterial({color:0xd9d5ca,side:THREE.DoubleSide}), green=new THREE.MeshLambertMaterial({color:0x1d7a3a}), steel=new THREE.MeshLambertMaterial({color:0xb8bcc0}), dark=new THREE.MeshLambertMaterial({color:0x2c2f33}), wood=new THREE.MeshLambertMaterial({color:0x9a6a3e});
    const ceil=new THREE.Mesh(new THREE.BoxGeometry(W+1,.3,D+1),new THREE.MeshLambertMaterial({color:0xdcdcd8,emissive:0x5a5a58})); ceil.position.y=HT+.15; ceil.castShadow=true; g.add(ceil);
    [[0,-D/2,W,0],[0,D/2,W,Math.PI],[-W/2,0,D,Math.PI/2],[W/2,0,D,-Math.PI/2]].forEach(([x,z,l,r])=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(l,HT),wallM); m.position.set(x,HT/2,z); m.rotation.y=r; m.castShadow=true; m.receiveShadow=true; g.add(m);
      const s=new THREE.Mesh(new THREE.PlaneGeometry(l,.35),green); s.position.set(x*.999,HT-.5,z*.999); s.rotation.y=r; g.add(s); });
    const lp=new THREE.MeshBasicMaterial({color:0xfdfcf4}); for(let x=-8;x<=8;x+=4) for(let z=-5;z<=5;z+=3.4){ const m=new THREE.Mesh(new THREE.PlaneGeometry(2.6,.32).rotateX(Math.PI/2),lp); m.position.set(x,HT-.01,z); g.add(m); }
    const logo=tex(512,128,(c,w,h)=>{ c.fillStyle='#1d7a3a'; c.fillRect(0,0,w,h); c.fillStyle='#ffd23a'; c.beginPath(); c.arc(64,64,40,0,7); c.fill(); c.fillStyle='#fff'; c.font='800 70px Barlow, Arial'; c.textBaseline='middle'; c.fillText('Lewiatan',120,68); });
    pl(g,6,1.5,0,2.55,-D/2+.02,new THREE.MeshBasicMaterial({map:logo}));
    // wejście: szklane drzwi przesuwne
    const glass=new THREE.MeshPhongMaterial({color:0x9fc3d0,transparent:true,opacity:.35,shininess:120,side:THREE.DoubleSide}); const outside=tex(256,128,(c,w,h)=>{ const gr=c.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#a9cbe6'); gr.addColorStop(.6,'#e8eef0'); gr.addColorStop(.62,'#6b6d70'); gr.addColorStop(1,'#56585b'); c.fillStyle=gr; c.fillRect(0,0,w,h); c.fillStyle='#3f6b3a'; c.fillRect(0,h*.45,w,h*.16); });
    pl(g,2.6,2.4,IN_DOOR[0],1.2,D/2-.03,new THREE.MeshBasicMaterial({map:outside}),Math.PI); IN.doorL=bx(g,1.3,2.4,.06,IN_DOOR[0]-.65,0,D/2-.1,glass,true); IN.doorR=bx(g,1.3,2.4,.06,IN_DOOR[0]+.65,0,D/2-.1,glass,true);
    const wy=tex(256,64,(c,w,h)=>{ c.fillStyle='#1d7a3a'; c.fillRect(0,0,w,h); c.fillStyle='#fff'; c.font='700 36px Barlow, Arial'; c.textAlign='center'; c.fillText('WYJŚCIE',w/2,46); }); pl(g,1.6,.4,IN_DOOR[0],2.75,D/2-.05,new THREE.MeshBasicMaterial({map:wy}),Math.PI);
    [-3,3,8].forEach(x=>pl(g,3.4,1.6,x,1.6,D/2-.03,new THREE.MeshBasicMaterial({map:outside}),Math.PI));
    const pos=tex(256,256,(c,w,h)=>{ c.fillStyle='#ffd23a'; c.fillRect(0,0,w,h); c.fillStyle='#c4221e'; c.font='800 64px Barlow, Arial'; c.textAlign='center'; c.fillText('PROMOCJA',w/2,90); c.fillStyle='#111'; c.font='800 96px Barlow, Arial'; c.fillText('-30%',w/2,200); }); pl(g,1.1,1.1,5.2,1.8,D/2-.06,new THREE.MeshBasicMaterial({map:pos}),Math.PI);
    // regały (gondole) z towarem po obu stronach
    const T1=shelfTex('dry'), T2=shelfTex('drink'), T3=shelfTex('dry'), TF=shelfTex('fridge'); const box=(x0,z0,x1,z1)=>IN.box.push([x0,z0,x1,z1]);
    [[-8,T1],[-4.5,T2],[-1,T3],[2.5,T1],[6,T2]].forEach(([x,t])=>{ bx(g,1.0,1.9,6.5,x,0,-3.25,steel); bx(g,1.04,.12,6.54,x,0,-3.25,dark,true); const m=new THREE.MeshLambertMaterial({map:t});
      [-1,1].forEach(sd=>{ const p=new THREE.Mesh(new THREE.PlaneGeometry(6.4,1.75),m); p.position.set(x+sd*.505,.98,-3.25); p.rotation.y=sd*Math.PI/2; g.add(p); });
      const cap=new THREE.Mesh(new THREE.PlaneGeometry(1,.3),green); cap.position.set(x,2.08,.02); g.add(cap); bx(g,1,.06,.06,x,1.9,0,green,true); box(x-.5,-6.5,x+.5,0); });
    // lodówki przy tylnej ścianie i po prawej
    const fm=new THREE.MeshLambertMaterial({map:TF,emissive:0x8899a0,emissiveMap:TF}); bx(g,W-1,2.2,.85,0,0,-D/2+.43,new THREE.MeshLambertMaterial({color:0xe8ecee})); const fr2=new THREE.Mesh(new THREE.PlaneGeometry(W-1.4,1.9),fm); fr2.position.set(0,1.1,-D/2+.87); g.add(fr2);
    for(let x=-W/2+1;x<W/2-.5;x+=1.4){ bx(g,.04,1.9,.04,x,.15,-D/2+.88,steel,true); } box(-W/2,-D/2,W/2,-D/2+.9);
    const fd=new THREE.Mesh(new THREE.PlaneGeometry(6,1.9),new THREE.MeshLambertMaterial({map:T2,emissive:0x667078,emissiveMap:T2})); bx(g,.85,2.2,6.2,W/2-.43,0,-2.5,new THREE.MeshLambertMaterial({color:0xe8ecee})); fd.position.set(W/2-.87,1.1,-2.5); fd.rotation.y=-Math.PI/2; g.add(fd); box(W/2-.9,-5.6,W/2,.6);
    // pieczywo przy lewej ścianie, warzywa i owoce przy wejściu
    bx(g,.7,1.7,4.2,-W/2+.36,0,-1.2,wood); { const br=tex(256,128,(c,w,h)=>{ c.fillStyle='#6a4426'; c.fillRect(0,0,w,h); for(let r=0;r<4;r++)for(let i=0;i<9;i++){ c.fillStyle=['#c8893e','#a8642a','#e0b070','#8a4a1e'][(i+r)%4]; c.beginPath(); c.ellipse(16+i*28,18+r*31,12,9,0,0,7); c.fill(); } }); const p=new THREE.Mesh(new THREE.PlaneGeometry(4.1,1.6),new THREE.MeshLambertMaterial({map:br})); p.position.set(-W/2+.72,.86,-1.2); p.rotation.y=Math.PI/2; g.add(p); } box(-W/2,-3.3,-W/2+.75,.9);
    { const cols=[0xd8261e,0xf2c230,0x5aa34a,0xff8c1a,0x7a2a6a,0xe8d84a]; for(let i=0;i<6;i++){ const x=7.4+(i%3)*1.1, z=3.4+Math.floor(i/3)*1.3; const cr=new THREE.Mesh(new THREE.BoxGeometry(1,.55,1.1),wood); cr.position.set(x,.55,z); cr.rotation.x=-.18; g.add(cr);
        const fr=new THREE.Mesh(new THREE.SphereGeometry(.42,10,6).scale(1.1,.35,1.2),new THREE.MeshLambertMaterial({color:cols[i]})); fr.position.set(x,.88,z); g.add(fr); } bx(g,3.4,.3,2.7,8.5,0,4.05,wood); box(6.8,2.7,10.2,5.4); }
    // kasy
    const belt=new THREE.MeshLambertMaterial({color:0x1e2022}); [[-1.5],[2.5]].forEach(([x])=>{ bx(g,.8,.9,3.2,x,0,4.5,new THREE.MeshLambertMaterial({color:0x3a5a48})); bx(g,.62,.03,2.4,x,.9,4.0,belt,true); bx(g,.5,.25,.35,x+.1,.9,5.6,dark);
      const scr=new THREE.Mesh(new THREE.BoxGeometry(.05,.3,.4),dark); scr.position.set(x+.25,1.35,5.5); g.add(scr); const ch=new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.06,14),dark); ch.position.set(x+.95,.52,5.2); g.add(ch); bx(g,.05,.5,.05,x+.95,0,5.2,steel,true);
      const sg=tex(128,64,(c,w,h)=>{ c.fillStyle='#1d7a3a'; c.fillRect(0,0,w,h); c.fillStyle='#fff'; c.font='800 40px Barlow, Arial'; c.textAlign='center'; c.fillText('KASA '+(x<0?1:2),w/2,46); }); const s=new THREE.Mesh(new THREE.PlaneGeometry(.9,.45),new THREE.MeshBasicMaterial({map:sg,side:THREE.DoubleSide})); s.position.set(x,2.5,3.1); g.add(s); bx(g,.02,1.1,.02,x,2.72,3.1,steel,true);
      box(x-.42,2.85,x+1.3,6.15); });
    // koszyki
    for(let i=0;i<4;i++){ const k=new THREE.Mesh(new THREE.BoxGeometry(.5,.28,.36),new THREE.MeshLambertMaterial({color:0xc4221e})); k.position.set(-6.2,.14+i*.16,6.9); g.add(k); }
    g.traverse(o=>{ if(o.isMesh&&o.geometry.type==='BoxGeometry'){ o.castShadow=true; o.receiveShadow=true; } });
    // personel i klienci
    const mk=(fem,top,bot,hair,o)=>{ const p=makePerson(top,bot,hair,Object.assign({female:fem},o||{})); g.add(p); return p; };
    const UNI=0x1d7a3a;
    [[-1.5],[2.5]].forEach(([x],i)=>{ const p=mk(true,UNI,0x22252a,pick([0x4a2e1a,0xb08a50,0x2a1d14,0x8a4a2a]),{style:'tee',hairStyle:i?'pony':'bob'}); p.position.set(x+.95,-.38,5.2); p.rotation.y=-Math.PI/2; const u=p.userData; u.lL.rotation.x=u.lR.rotation.x=-1.45; u.kL.rotation.x=u.kR.rotation.x=1.45;
      IN.npc.push({p,role:'cash',t:R(0,3),u}); });
    { const p=mk(true,UNI,0x22252a,0x6b4426,{style:'tee',hairStyle:'pony'}); p.position.set(-6.25,0,-4.6); p.rotation.y=-Math.PI/2; IN.npc.push({p,role:'stock',t:0,u:p.userData,x:-6.25,z:-4.6}); }
    const AISLE=[-9.75,-6.25,-2.75,.75,4.25,8.6], QX=[-2.35,1.65], QZ=[5.0,3.9,2.8];
    IN.Q=[[null,null,null],[null,null,null]];
    const cust=(x,z)=>{ const fem=rnd()<.55; const p=mk(fem,pick(PCOL),pick([0x2c3e66,0x2a2a2c,0x5a4a3a,0x6a6a6a,0x1e2a44]),pick([0x2a1d14,0x4a2e1a,0x6b4426,0xb08a50,0x8a8a8a,0xd2b27a])); p.position.set(x,0,z);
      const bk=new THREE.Mesh(new THREE.BoxGeometry(.42,.24,.3),new THREE.MeshLambertMaterial({color:0xc4221e})); bk.position.set(0,-.42,.08); p.userData.eR.add(bk); return {p,role:'cust',st:'wander',path:[],wait:R(0,3),walk:R(0,6),u:p.userData}; };
    const N=IN.npc; for(let q=0;q<2;q++) for(let s=0;s<2;s++){ const c=cust(QX[q],QZ[s]); c.st='queue'; c.q=q; c.s=s; IN.Q[q][s]=c; c.p.rotation.y=0; c.pay=s===0?R(4,9):0; N.push(c); }
    for(let i=0;i<5;i++){ const c=cust(pick(AISLE),R(-6,-.5)); N.push(c); }
    IN.AISLE=AISLE; IN.QX=QX; IN.QZ=QZ;
    g.visible=false; }
  function inRoute(c,tx,tz){ const p=c.p.position; const ax=IN.AISLE.reduce((a,b)=>Math.abs(b-p.x)<Math.abs(a-p.x)?b:a); const path=[];
    if(p.z<1)path.push([ax,1.5]); else path.push([p.x,Math.min(p.z,1.5)]); if(tz<1){ const bxA=IN.AISLE.reduce((a,b)=>Math.abs(b-tx)<Math.abs(a-tx)?b:a); path.push([bxA,1.5],[bxA,tz]); } else path.push([tx,1.5],[tx,tz]); c.path=path; }
  function interiorUpdate(dt){ if(!IN.built||!st.inside||CUR!==IN)return; const Q=IN.Q;
    // drzwi automatyczne
    { const d=Math.hypot(st.x-IN.x-IN_DOOR[0],st.z-IN.z-IN_DOOR[1]); const o=d<2.6?1:0; IN.dOpen=(IN.dOpen||0)+(o-(IN.dOpen||0))*Math.min(1,dt*5); IN.doorL.position.x=IN_DOOR[0]-.65-IN.dOpen*1.2; IN.doorR.position.x=IN_DOOR[0]+.65+IN.dOpen*1.2; }
    IN.npc.forEach(c=>{ c.t=(c.t||0)+dt; const u=c.u;
      if(c.role==='cash'){ u.aR.rotation.x=-1.0+Math.sin(c.t*3.2)*.45; u.aL.rotation.x=-.7; u.eR.rotation.x=u.eL.rotation.x=-.8; c.p.rotation.y=-Math.PI/2+Math.sin(c.t*.7)*.25; return; }
      if(c.role==='stock'){ const k=(c.t%8)/8; u.aR.rotation.x=-1.6+Math.sin(c.t*2)*.4; u.aL.rotation.x=-1.2; c.p.position.y=k<.5?-.25:0; if(c.t%16<.02){ c.z=R(-6,-1); } c.p.position.z+=(c.z-c.p.position.z)*Math.min(1,dt); animPerson(c.p,c.t*2,0); return; }
      const p=c.p.position;
      if(c.st==='queue'){ const slot=[IN.QX[c.q],IN.QZ[c.s]]; const dx=slot[0]-p.x, dz=slot[1]-p.z, l=Math.hypot(dx,dz);
        if(l>.05){ const v=Math.min(l,dt*1.1); p.x+=dx/l*v; p.z+=dz/l*v; c.p.rotation.y=Math.atan2(dx,dz); c.walk+=dt*3.4; animPerson(c.p,c.walk,1); } else { animPerson(c.p,0,0); c.p.rotation.y=c.s===0?Math.PI/2:0; }
        if(c.s===0&&l<.1){ c.pay-=dt; u.aR.rotation.x=-.9+Math.sin(c.t*4)*.3; if(c.pay<=0){ Q[c.q][0]=null; c.st='leave'; c.path=[[p.x,6.8],[IN_DOOR[0],6.8],[IN_DOOR[0],7.7]]; for(let s=1;s<3;s++){ const n=Q[c.q][s]; if(n){ Q[c.q][s-1]=n; Q[c.q][s]=null; n.s=s-1; if(s-1===0) n.pay=R(6,11); } } } }
        return; }
      if(c.path.length){ const [tx,tz]=c.path[0]; const dx=tx-p.x, dz=tz-p.z, l=Math.hypot(dx,dz); if(l<.08){ c.path.shift(); } else { const v=Math.min(l,dt*1.15); p.x+=dx/l*v; p.z+=dz/l*v; let dr=Math.atan2(dx,dz)-c.p.rotation.y; dr=Math.atan2(Math.sin(dr),Math.cos(dr)); c.p.rotation.y+=dr*Math.min(1,dt*8); c.walk+=dt*3.4; animPerson(c.p,c.walk,1); }
        if(!c.path.length){ if(c.st==='leave'){ c.st='wander'; p.x=pick(IN.AISLE); p.z=R(-6,-.5); c.wait=R(1,4); } else if(c.st==='toQueue'){ c.st='queue'; } else { c.wait=R(2,6); c.p.rotation.y=p.x>IN.AISLE[0]?(rnd()<.5?Math.PI/2:-Math.PI/2):Math.PI/2; } } return; }
      animPerson(c.p,0,0); c.wait-=dt; if(c.wait<=0){ if(rnd()<.35){ for(let q=0;q<2;q++){ const s=Q[q].indexOf(null); if(s>=0&&(s===0||Q[q][s-1])){ Q[q][s]=c; c.q=q; c.s=s; if(s===0)c.pay=R(6,11); c.st='toQueue'; c.path=[[p.x<1?IN.AISLE.reduce((a,b)=>Math.abs(b-p.x)<Math.abs(a-p.x)?b:a):p.x,1.5],[IN.QX[q],1.5],[IN.QX[q],IN.QZ[s]]]; if(p.z>=1)c.path.shift(); return; } } }
        inRoute(c,pick(IN.AISLE),R(-6,-.5)); } });
    // światło w sklepie (używa puli latarni)
    lampPool.forEach((l,i)=>{ if(i<6){ l.position.set(IN.x-7+(i%3)*7,IN.y+3.2,IN.z-4+Math.floor(i/3)*7); l.intensity=.75; l.distance=15; } else l.intensity=0; });
    if(typeof PARTS!=='undefined') PARTS.visible=false; }
  let fadeEl=document.getElementById('fade');
  function fadeTo(cb){ if(!fadeEl){ cb(); return; } fadeEl.classList.add('on'); setTimeout(()=>{ cb(); setTimeout(()=>fadeEl.classList.remove('on'),60); },260); }
  function enterStore(){ if(st.car||st.inside)return; IN.lastSwap=tAll; if(st.wanted>0){ toast('Policja Cię ściga — nie wejdziesz teraz do sklepu',2.5); return; }
    fadeTo(()=>{ buildInterior(); const f=B_LEW.front, o=B_LEW.doorOut||[f.x+f.nx*3.2,f.z+f.nz*3.2]; IN.ret={x:o[0],z:o[1],yaw:Math.atan2(-f.nx,-f.nz),face:Math.atan2(f.nx,f.nz)}; st.inside=true; IN.g.visible=true; IN.worldPos=SHOPS[0].p; CUR=IN;
      st.x=IN.x+IN_DOOR[0]; st.z=IN.z+4.6; st.vx=st.vz=0; st.yaw=0; st.face=Math.PI; st.pitch=.22; st.dist=Math.min(st.dist,3.4); st.distS=st.dist; if(st.mode===2) st.mode=0; locMain.textContent='Lewiatan'; locSub.textContent='Sklep · ul. Szkolna'; locEl.classList.add('on'); locTimer=3; }); }
  function exitStore(){ if(!st.inside)return; IN.lastSwap=tAll; fadeTo(()=>{ st.inside=false; IN.g.visible=false; const r=IN.ret||{x:SHOPS[0].p[0],z:SHOPS[0].p[1],yaw:0,face:0}; st.x=r.x; st.z=r.z; st.yaw=r.yaw; st.face=r.face; st.vx=st.vz=0; if(SHOP_OPEN) closeShop(); }); }
  // drzwi automatyczne: wystarczy podejść do drzwi (ważne na telefonie)
  const bActEl=document.getElementById('bAct'); let lastAct='';
  const bRadioEl=document.getElementById('bRadio');
  function actLabel(){ let t=''; if(SHOP_OPEN) t='Zamknij'; else if(st.car&&nearPump()) t='Tankuj'; else { const sd=nearStoreDoor(); if(sd==='out') t='Wyjdź'; else if(sd==='in') t='Wejdź'; else if(!st.inside&&nearGate()) t=nearGate().open?'Zamknij':'Otwórz'; else if(nearMission()) t='Misja'; else if(!st.car&&nearShop()) t='Kasa'; else if(st.car) t='Wysiądź'; else if(!st.inside&&nearestParked()) t='Wsiądź'; }
    if(t!==lastAct){ lastAct=t; bActEl.textContent=t; bActEl.classList.toggle('show',!!t); bActEl.classList.toggle('hot',!!t&&t!=='Wysiądź'); }
    bRadioEl.classList.toggle('show',!!st.car&&st.car.kind!=='bike'); }
  function storeDoorAuto(){ if(st.car||st.dead||GAME.paused||SHOP_OPEN||tAll-(IN.lastSwap||-9)<2.5) return; const v=Math.hypot(st.vx||0,st.vz||0); if(v<.8) return;
    if(st.inside){ const d=CUR.doorW; if(!d)return; if(Math.abs(st.x-d[0])<1.3&&st.z>d[1]-.6&&(st.vz||0)>.6) exitRoom(); return; }
    for(const e of ENTS){ const f=e.f, n=e.n; if(!f||!n)continue; if(Math.hypot(f[0]-st.x,f[1]-st.z)<1.9&&-(st.vx*n[0]+st.vz*n[1])>.6){ e.enter(); return; } } }
  function inCam(){ const C=CUR, p=camera.position; const lx=clamp(p.x-C.x,-C.W/2+.3,C.W/2-.3), lz=clamp(p.z-C.z,-C.D/2+.3,C.D/2-.3); p.set(C.x+lx,clamp(p.y,C.y+.6,C.y+(C.HT||3.6)-.25),C.z+lz); if(st.mode!==1) camera.lookAt(st.x,CUR.y+1.4,st.z); sky.position.copy(p); }

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
    if(lights&&AU.ctx&&AU.on){ const dp=Math.hypot(st.x-cx,st.z-cz); if(dp<300){ CRS.bell-=dt; if(CRS.bell<=0){ CRS.bell=.55; const t=AU.ctx.currentTime, v=.05*clamp(1-dp/300,0,1); tone('triangle',1320,t,.25,v); tone('sine',2640,t,.12,v*.4); } } } };
  // ruch na DK42: odstępy między autami i zatrzymanie przed przejazdem
  function trafficSpeeds(dt){ const closed=crossClosed(); [1,-1].forEach(dir=>{ const L=cars.filter(c=>c.dir===dir).sort((a,b)=>(a.d-b.d)*dir);
      for(let i=0;i<L.length;i++){ const c=L[i]; if(c.v0===undefined) c.v0=c.v; let tv=c.v0; const nx=L[i+1];
        if(nx){ const gap=(nx.d-c.d)*dir-7.5; if(gap<40) tv=Math.min(tv,Math.max(0,gap)*.85); }
        if(CROSS_D!==null){ const toX=(CROSS_D-c.d)*dir-10; if(closed&&toX>-.5&&toX<120&&!(toX<3&&c.v>9)) tv=Math.min(tv,Math.max(0,toX)*.6); }
        if(st.car&&!st.inside){ const p=st.car; const s=sampleLine(DK.pts,DK.len,c.d); const ahead=((p.x-s.x)*s.tx+(p.z-s.z)*s.tz)*dir, side=Math.abs((p.x-s.x)*-s.tz+(p.z-s.z)*s.tx-2.2*dir); if(ahead>0&&ahead<25&&side<2.2) tv=Math.min(tv,Math.max(0,ahead-7)*.8); }
        c.v+=clamp(tv-c.v,-9*dt,2.6*dt); if(c.v<0) c.v=0; } }); }

  /* ---------- wnętrza: Żabka, Delikatesy, Apteka, Euforia, Orlen, Biedronka, Lidl, kościół, biblioteka ---------- */
  let CUR=IN; IN.doorW=[IN.x+IN_DOOR[0],IN.z+IN_DOOR[1]];
  const ROOMS=[]; let roomSlot=1;
  function defRoom(o){ o.x=2900+(roomSlot++)*62; o.z=600; o.y=150; o.box=[]; o.npc=[]; o.walks=[]; o.built=false; o.HT=o.HT||3.6; o.doorX=o.doorX!==undefined?o.doorX:-o.W/2+2.5; ROOMS.push(o); return o; }
  const curBlocked=(x,z,r)=>{ r=r||.35; const C=CUR, lx=x-C.x, lz=z-C.z; if(lx<-C.W/2+r||lx>C.W/2-r||lz<-C.D/2+r||lz>C.D/2-r) return true; return C.box.some(b=>lx>b[0]-r&&lx<b[2]+r&&lz>b[1]-r&&lz<b[3]+r); };
  const sitPose=(p,seatY)=>{ const u=p.userData; u.lL.rotation.x=u.lR.rotation.x=-1.45; u.kL.rotation.x=u.kR.rotation.x=1.45; p.position.y=(seatY||.46)-.9; };
  function roomShell(o){ const g=new THREE.Group(); g.position.set(o.x,o.y,o.z); g.visible=false; scene.add(g); o.g=g; const W=o.W,D=o.D,HT=o.HT;
    const tile=tex(256,256,(c,w,h)=>{ c.fillStyle=o.floor||'#c9c5bc'; c.fillRect(0,0,w,h); c.fillStyle='rgba(0,0,0,.06)'; c.fillRect(0,0,w/2,h/2); c.fillRect(w/2,h/2,w/2,h/2); c.strokeStyle='rgba(0,0,0,.12)'; c.lineWidth=2; c.strokeRect(0,0,w,h); }); tile.repeat.set(W/1.4,D/1.4);
    const fl=new THREE.Mesh(new THREE.PlaneGeometry(W,D).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({map:tile,emissive:0x2a2a2a})); fl.receiveShadow=true; g.add(fl);
    const wallM=new THREE.MeshLambertMaterial({color:o.wall||0xd9d5ca,emissive:0x2c2c2a,side:THREE.DoubleSide}), band=new THREE.MeshLambertMaterial({color:o.col||0x1d7a3a});
    const ceil=new THREE.Mesh(new THREE.BoxGeometry(W+1,.3,D+1),new THREE.MeshLambertMaterial({color:o.ceil||0xdcdcd8,emissive:o.ceilE!==undefined?o.ceilE:0x5a5a58})); ceil.position.y=HT+.15; ceil.castShadow=true; g.add(ceil);
    [[0,-D/2,W,0],[0,D/2,W,Math.PI],[-W/2,0,D,Math.PI/2],[W/2,0,D,-Math.PI/2]].forEach(([x,z,l,r])=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(l,HT),wallM); m.position.set(x,HT/2,z); m.rotation.y=r; m.castShadow=true; m.receiveShadow=true; g.add(m);
      if(!o.noBand){ const s=new THREE.Mesh(new THREE.PlaneGeometry(l,.35),band); s.position.set(x*.999,Math.min(HT-.5,3.1),z*.999); s.rotation.y=r; g.add(s); } });
    if(!o.noLights){ const lp=new THREE.MeshBasicMaterial({color:0xfdfcf4}); for(let x=-W/2+3;x<W/2-1;x+=4) for(let z=-D/2+2.5;z<D/2-1;z+=3.4){ const m=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.3).rotateX(Math.PI/2),lp); m.position.set(x,HT-.01,z); g.add(m); } }
    if(o.logo){ pl(g,Math.min(W*.5,7),Math.min(W*.5,7)/4,0,Math.min(HT-1.1,2.5),-D/2+.02,new THREE.MeshBasicMaterial({map:o.logo})); }
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
  // restauracja (Euforia)
  function restInterior(o){ const g=roomShell(o), W=o.W, D=o.D; const wood=new THREE.MeshLambertMaterial({color:0x8a5a34}), top=new THREE.MeshLambertMaterial({color:0xf2efe8}), col=new THREE.MeshLambertMaterial({color:o.col});
    bx(g,W*.5,1.05,.8,0,0,-D/2+2,wood); bx(g,W*.5,.06,.9,0,1.05,-D/2+2,col,true); box2(o,-W*.25,-D/2,W*.25,-D/2+2.4);
    const menu=tex(512,128,(c,w,h)=>{ c.fillStyle='#1b1b1b'; c.fillRect(0,0,w,h); c.fillStyle='#ffd23a'; c.font='700 34px Barlow, Arial'; c.fillText('PIZZA 32 zł   BURGER 24 zł   FRYTKI 10 zł',18,74); }); pl(g,5,1.2,0,2.4,-D/2+.03,new THREE.MeshBasicMaterial({map:menu}));
    const ca=npcPerson(o,false,0x222222,0x22252a,0x2a1d14,{style:'tee'}); ca.position.set(0,0,-D/2+1.2); o.npc.push({p:ca,role:'clerk',t:0}); o.counter=[0,-D/2+3];
    for(let ix=0;ix<3;ix++) for(let iz=0;iz<2;iz++){ const x=-W/2+3+ix*(W-6)/2, z=-D/2+5.2+iz*2.8; bx(g,1.3,.75,.9,x,0,z,top); [-1,1].forEach(sd=>{ bx(g,.45,.46,.45,x+sd*.95,0,z,wood); if(rnd()<.7){ const p=custPerson(o); p.position.set(x+sd*.95,0,z); sitPose(p,.46); p.rotation.y=sd>0?-Math.PI/2:Math.PI/2; o.npc.push({p,role:'eat',t:R(0,6)}); } }); box2(o,x-1.25,z-.5,x+1.25,z+.5); }
    addWalker(o,[[-W/2+1.4,D/2-1.6],[-W/2+1.4,-D/2+3.4],[W/2-1.4,-D/2+3.4],[W/2-1.4,D/2-1.6]],null); }
  // kościół
  function churchInterior(o){ o.noBand=true; o.noWindows=true; o.ceilE=0x2a2622; o.wall=0xe9e1d0; o.floor='#b9ad9a'; const g=roomShell(o), W=o.W, D=o.D, HT=o.HT; const wood=new THREE.MeshLambertMaterial({color:0x6b4428}), gold=new THREE.MeshLambertMaterial({color:0xd8b54a,emissive:0x3a2a08}), red=new THREE.MeshLambertMaterial({color:0x8a1c1c});
    const glassT=tex(64,160,(c,w,h)=>{ const C=['#2a5bd7','#d7342a','#e8c02a','#2aa04a','#7a2ad7']; for(let y=0;y<h;y+=16)for(let x=0;x<w;x+=16){ c.fillStyle=C[(x/16+y/16*3)%5|0]; c.fillRect(x,y,15,15); } c.fillStyle='#222'; c.fillRect(0,0,w,3); });
    const gm=new THREE.MeshBasicMaterial({map:glassT}); for(let z=-D/2+5;z<D/2-3;z+=4.5) [-1,1].forEach(sd=>{ const w=new THREE.Mesh(new THREE.PlaneGeometry(1.3,3.4),gm); w.position.set(sd*(W/2-.03),4.6,z); w.rotation.y=-sd*Math.PI/2; g.add(w); });
    const pr=new THREE.Mesh(new THREE.BoxGeometry(W-2,.4,4.5),new THREE.MeshLambertMaterial({color:0xcfc6b4})); pr.position.set(0,.2,-D/2+2.25); g.add(pr); box2(o,-W/2,-D/2,W/2,-D/2+4.4);
    bx(g,2.6,1.0,1,0,.4,-D/2+2.2,new THREE.MeshLambertMaterial({color:0xf3efe6})); bx(g,2.7,.06,1.1,0,1.4,-D/2+2.2,gold,true);
    bx(g,.25,4.2,.2,0,1.5,-D/2+.25,gold,true); bx(g,2.2,.25,.2,0,4.5,-D/2+.25,gold,true);
    const runner=new THREE.Mesh(new THREE.PlaneGeometry(1.6,D-6).rotateX(-Math.PI/2),red); runner.position.set(0,.01,1.5); g.add(runner);
    const pri=npcPerson(o,false,0xf2f0ea,0x222222,0x6a6a6a,{style:'coat',hairStyle:'short'}); pri.position.set(0,.4,-D/2+1.4); o.npc.push({p:pri,role:'priest',t:0});
    for(let z=-D/2+6;z<D/2-4;z+=1.5) [-1,1].forEach(sd=>{ const x=sd*(W/4+.4); bx(g,W/2-2.4,.45,.45,x,0,z,wood); bx(g,W/2-2.4,.5,.08,x,.45,z+.25,wood); box2(o,x-(W/4-1.2),z-.3,x+(W/4-1.2),z+.3);
      for(let k=-1;k<=1;k++) if(rnd()<.45){ const p=custPerson(o); p.position.set(x+k*1.2,0,z); sitPose(p,.45); p.rotation.y=Math.PI; o.npc.push({p,role:'pray',t:R(0,8)}); } });
    o.counter=null; addWalker(o,[[0,D/2-1.5],[0,-D/2+5.2]],null); }
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
  function buildRoom(o){ if(o.built)return; o.built=true; ({shop:shopInterior,counter:counterInterior,rest:restInterior,church:churchInterior,lib:libInterior})[o.kind](o); o.g.traverse(q=>{ if(q.isMesh&&q.geometry.type==='BoxGeometry'){ q.castShadow=true; q.receiveShadow=true; } }); }
  // wejścia z zewnątrz
  const ENTS=[]; let DOOR_ENT=null;
  ENTS.push({label:'Lewiatana',get p(){ return SHOPS[0].p; },get f(){ return B_LEW.doorF; },get n(){ return [B_LEW.front.nx,B_LEW.front.nz]; },enter:()=>enterStore()});
  function addEnt(room,label,p,n){ const nl=Math.hypot(n[0],n[1])||1; n=[n[0]/nl,n[1]/nl]; const e={label,room,p,n,f:[p[0]-n[0]*1.4,p[1]-n[1]*1.4]}; e.enter=()=>enterRoom(e); ENTS.push(e); room.ent=e; return e; }
  function entFromShop(shopName,room,label,center){ const s=SHOPS.find(q=>q.n===shopName); if(!s)return; s.room=room; const p=s.p; const n=[p[0]-center[0],p[1]-center[1]]; addEnt(room,label,p,n); room.items=s.items; room.shopName=s.n; }
  const logoT=(bg,fg,txt,font)=>tex(512,128,(c,w,h)=>{ c.fillStyle=bg; c.fillRect(0,0,w,h); c.fillStyle=fg; c.font=font||'800 74px Barlow, Arial'; c.textAlign='center'; c.textBaseline='middle'; c.fillText(txt,w/2,h/2+4); });
  { const r=defRoom({kind:'shop',W:12,D:10,col:0x1a8a3a,rows:2,checkouts:1,walkers:2,logo:logoT('#1a8a3a','#ffffff','żabka')}); entFromShop('Żabka',r,'Żabki',[B_ZAB.x,B_ZAB.z]); }
  { const r=defRoom({kind:'shop',W:13,D:11,col:0x2b2b2b,rows:2,checkouts:1,walkers:2,logo:logoT('#1b1b1b','#e8c25a','Delikatesy Premium','700 54px Barlow, Arial')}); entFromShop('Delikatesy Premium',r,'Delikatesów',CB.delik?[CB.delik.x,CB.delik.z]:[-150,-336]); }
  { const r=defRoom({kind:'counter',W:10,D:9,col:0x2a9a5a,counterCol:0xffffff,side2:'fridge',walkers:1,logo:logoT('#ffffff','#2a9a5a','✚ APTEKA MAGNOLIA','700 50px Barlow, Arial')}); const a=typeof APT!=='undefined'&&APT?centroid(APT.pts):[-100,-200]; entFromShop('Apteka Magnolia',r,'apteki',a); }
  { const r=defRoom({kind:'rest',W:14,D:12,col:0xd8261e,logo:logoT('#d8261e','#ffffff','EUFORIA')}); entFromShop('Euforia Trębaczew',r,'Euforii',[-146,-356]); }
  // kościół: drzwi od strony ulicy
  const CHURCH_ROOM=defRoom({kind:'church',W:14,D:28,HT:9,col:0x8a1c1c,noLights:false,doorX:0});
  { const P=CHURCH.pts, c=centroid(P); let best=null; for(let i=0;i<P.length;i++){ const a=P[i], b=P[(i+1)%P.length], L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L<4)continue; const m=[(a[0]+b[0])/2,(a[1]+b[1])/2]; const d=nearestRoad(m[0],m[1],r=>r.t!=='track').d; if(!best||d<best.d){ let n=[-(b[1]-a[1])/L,(b[0]-a[0])/L]; if((m[0]-c[0])*n[0]+(m[1]-c[1])*n[1]<0) n=[-n[0],-n[1]]; best={d,m,n}; } }
    if(best) addEnt(CHURCH_ROOM,'kościoła',[best.m[0]+best.n[0]*1.6,best.m[1]+best.n[1]*1.6],best.n); }
  // biblioteka (filia w Trębaczewie)
  const LIB_ROOM=defRoom({kind:'lib',W:14,D:12,col:0x2a5a8a,logo:logoT('#2a5a8a','#ffffff','BIBLIOTEKA','700 64px Barlow, Arial')});
  LIB_ROOM.items=[['„Pan Tadeusz” – A. Mickiewicz',0,'book',0],['„Lalka” – B. Prus',0,'book',0],['„Quo vadis” – H. Sienkiewicz',0,'book',0],['„Chłopi” – W. Reymont',0,'book',0],['„W pustyni i w puszczy” – H. Sienkiewicz',0,'book',0],['„Krzyżacy” – H. Sienkiewicz',0,'book',0]]; LIB_ROOM.shopName='Biblioteka'; LIB_ROOM.sub='Wypożyczalnia · książki za darmo';
  { const lb=BLD.filter(b=>Math.hypot(b.x+136,b.z+124)<14).sort((a,b)=>Math.hypot(a.x+136,a.z+125)-Math.hypot(b.x+136,b.z+125))[0]; if(lb){ const nr=nearestRoad(lb.x,lb.z,r=>r.t!=='track'); const f=frontSide(lb,nr.r); addEnt(LIB_ROOM,'biblioteki',[f.x+f.nx*1.6,f.z+f.nz*1.6],[f.nx,f.nz]); } }
  function roomShopObj(o){ if(!o.items||!o.counter)return null; return {n:o.shopName||'Sklep',sub:o.sub,get p(){ return [o.x+o.counter[0],o.z+o.counter[1]]; },items:o.items}; }
  function enterRoom(e){ if(st.car||st.inside)return; if(st.wanted>0){ toast('Policja Cię ściga — nie wejdziesz teraz do środka',2.5); return; } IN.lastSwap=tAll; const o=e.room;
    fadeTo(()=>{ buildRoom(o); o.shop=roomShopObj(o); o.ret={x:e.p[0]+e.n[0]*1.6,z:e.p[1]+e.n[1]*1.6,yaw:Math.atan2(-e.n[0],-e.n[1]),face:Math.atan2(e.n[0],e.n[1])}; o.doorW=[o.x+o.doorX,o.z+o.D/2-.6]; o.worldPos=e.p;
      CUR=o; st.inside=true; o.g.visible=true; st.x=o.x+o.doorX; st.z=o.z+o.D/2-2.2; st.vx=st.vz=0; st.yaw=0; st.face=Math.PI; st.pitch=.22; st.dist=Math.min(st.dist,3.4); st.distS=st.dist; if(st.mode===2) st.mode=0;
      locMain.textContent=o.title||e.label; locSub.textContent='wnętrze'; locEl.classList.add('on'); locTimer=3; }); }
  function exitRoom(){ const o=CUR; if(o===IN){ exitStore(); return; } IN.lastSwap=tAll; fadeTo(()=>{ lampPool.forEach(l=>{ l.color.set(0xffc070); l.distance=26; }); st.inside=false; o.g.visible=false; const r=o.ret; st.x=r.x; st.z=r.z; st.yaw=r.yaw; st.face=r.face; st.vx=st.vz=0; if(SHOP_OPEN) closeShop(); CUR=IN; }); }
  function roomsUpdate(dt){ if(!st.inside||CUR===IN||!CUR.built)return; const o=CUR;
    o.npc.forEach(c=>{ c.t=(c.t||0)+dt; const u=c.p.userData;
      if(c.role==='cash'){ u.aR.rotation.x=-1.0+Math.sin(c.t*3.2)*.45; u.aL.rotation.x=-.7; u.eR.rotation.x=u.eL.rotation.x=-.8; return; }
      if(c.role==='clerk'){ u.aR.rotation.x=-.5+Math.sin(c.t*1.3)*.3; u.eR.rotation.x=-.9; return; }
      if(c.role==='stand'){ if(c.pay) u.aR.rotation.x=-.9+Math.sin(c.t*4)*.3; else c.p.rotation.y+=Math.sin(c.t*.5)*.002; return; }
      if(c.role==='eat'){ const s=(c.t%5)<1.2; u.aR.rotation.x+=((s?-2.0:-.7)-u.aR.rotation.x)*Math.min(1,dt*4); u.eR.rotation.x=-1.0; return; }
      if(c.role==='read'){ u.aL.rotation.x=u.aR.rotation.x=-.9; u.eL.rotation.x=u.eR.rotation.x=-1.1; return; }
      if(c.role==='pray'){ u.aL.rotation.x=u.aR.rotation.x=-.6; u.eL.rotation.x=u.eR.rotation.x=-1.3; return; }
      if(c.role==='priest'){ const up=(c.t%10)<4; u.aL.rotation.x=u.aR.rotation.x=up?-2.2:-.4; u.aL.rotation.z=-.5; u.aR.rotation.z=.5; return; }
      if(c.role==='walk'){ if(c.wait>0){ c.wait-=dt; animPerson(c.p,0,0); return; } const L=c.len[c.len.length-1]; c.d+=c.dir*1.05*dt; if(c.d>L){ c.d=L; c.dir=-1; c.wait=R(1,3); } if(c.d<0){ c.d=0; c.dir=1; c.wait=R(1,3); } if(rnd()<dt*.08) c.wait=R(1.5,4);
        const s=sampleLine(c.path,c.len,c.d); c.p.position.x=s.x; c.p.position.z=s.z; c.p.rotation.y=Math.atan2(s.tx*c.dir,s.tz*c.dir); c.walk+=dt*3.4; animPerson(c.p,c.walk,1); } });
    const n=o.kind==='church'?4:6; lampPool.forEach((l,i)=>{ if(i<n){ l.position.set(o.x-o.W/3+(i%3)*o.W/3,o.y+o.HT-.5,o.z-o.D/3+Math.floor(i/3)*o.D/1.6); l.intensity=o.kind==='church'?1.1:.95; l.distance=Math.max(16,Math.max(o.W,o.D)*.75); l.color.set(o.kind==='church'?0xffd9a0:0xffffff); } else l.intensity=0; });
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
    [[0,-Wd/2-.06,Math.PI],[0,Wd/2+.06,0]].forEach(([u,v,r])=>pl(cg,6,.55,u,5.52,v,new THREE.MeshBasicMaterial({map:logo}),r));
    [[-L/2+2,-Wd/2+1.6],[L/2-2,-Wd/2+1.6],[-L/2+2,Wd/2-1.6],[L/2-2,Wd/2-1.6]].forEach(([u,v])=>bx(cg,.45,5,.45,u,0,v,wh));
    const pumps=[]; [-L/3,0,L/3].forEach(u=>{ bx(cg,1.2,.25,3.6,u,0,0,new THREE.MeshLambertMaterial({color:0xc8c8c4})); bx(cg,.8,1.8,.5,u,.25,0,red); bx(cg,.82,.5,.52,u,1.6,0,wh); const sc=tex(64,64,(c)=>{ c.fillStyle='#111'; c.fillRect(0,0,64,64); c.fillStyle='#7fe0ff'; c.font='700 18px monospace'; c.fillText('00.00',6,28); c.fillText('PLN',14,52); }); [-1,1].forEach(sd=>pl(cg,.5,.4,u,1.25,sd*.26,new THREE.MeshBasicMaterial({map:sc}),sd<0?Math.PI:0));
      const q=new THREE.Vector3(u,0,0); q.applyAxisAngle(new THREE.Vector3(0,1,0),cg.rotation.y-Rf.a); pumps.push([Rf.x+q.x,Rf.z+q.z]); });
    g.traverse(o=>{ if(o.isMesh&&o.geometry.type!=='PlaneGeometry') o.castShadow=true; });
    pumps.forEach(p=>addSolid({x:p[0],z:p[1],hw:.5,hd:.5,c:1,s:0,r:.8}));
    // budynek stacji: biały z czerwonym pasem, przeszklone wejście od strony wiaty
    const f=faceTo(S,Rf.x,Rf.z); const sg=new THREE.Group(); sg.position.set(S.x,S.hc||H(S.x,S.z),S.z); sg.rotation.y=f.rot; scene.add(sg); const low=(S.hmin||H(S.x,S.z))-.4-(S.hc||H(S.x,S.z));
    bx(sg,f.len,4.2-low,f.dep,0,low,0,new THREE.MeshLambertMaterial({color:0xf2f2ee,map:plasterTex})); bx(sg,f.len+.1,.7,f.dep+.1,0,3.5,0,red); bx(sg,f.len+.3,.2,f.dep+.3,0,4.2,0,gr);
    pl(sg,f.len*.5,2.3,-f.len*.15,1.3,f.dep/2+.02,glass); pl(sg,3,.62,-f.len*.15,3.85,f.dep/2+.06,new THREE.MeshBasicMaterial({map:logo})); const cafe=tex(256,64,(c,w,h)=>{ c.fillStyle='#3a2a1e'; c.fillRect(0,0,w,h); c.fillStyle='#fff'; c.font='700 34px Barlow, Arial'; c.fillText('STOP CAFE',20,44); }); pl(sg,2.2,.5,f.len*.28,2.6,f.dep/2+.03,new THREE.MeshBasicMaterial({map:cafe}));
    sg.traverse(o=>{ if(o.isMesh&&o.geometry.type!=='PlaneGeometry') o.castShadow=true; });
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
  function bigStore(b,o){ const nr=nearestRoad(b.x,b.z,r=>r.t!=='track'&&r.t!=='srv'); const f0=frontSide(b,nr.r); const off=-(f0.len*.22); const f=brandShop(b,Object.assign({road:nr.r,glass:.45,doorOff:off,canopy:7,apron:8},o)); const tx=-f.nz, tz=f.nx;
    return {p:[f.x+tx*off+f.nx*1.8,f.z+tz*off+f.nz*1.8],n:[f.nx,f.nz],f}; }
  if(CB.biedr){ const e=bigStore(CB.biedr,{h:6,wall:'#f3f1ec',roof:'#5b6066',text:'Biedronka',sign:'#e30613',signText:'#ffd500',stripe:'#ffd500',font:'800 92px Barlow, Arial',canopyCol:0xe30613,extras:[{u:6,v:2,mesh:cartRow}]});
    const r=defRoom({kind:'shop',W:30,D:22,col:0xe30613,rows:6,checkouts:3,walkers:6,basket:0xe30613,logo:logoT('#e30613','#ffd500','Biedronka')}); r.items=[['Bułki (6 szt.)',4,'hp',15],['Jabłka 1 kg',5,'hp',20],['Woda 1,5 l',2,'hp',10],['Piwo',4,'piwo',0],['Czekolada',5,'hp',15],['Energetyk',4,'boost',60]]; r.shopName='Biedronka'; addEnt(r,'Biedronki',e.p,e.n); r.title='Biedronka';
    POIS.push({n:'Biedronka',x:e.p[0],z:e.p[1],p:e.p,c:'#e30613',ic:'B',sp:labelSprite('Biedronka','#e30613')}); { const lp=POIS[POIS.length-1]; lp.sp.position.set(e.p[0],H(e.p[0],e.p[1])+9,e.p[1]); lp.sp.visible=false; scene.add(lp.sp); } }
  if(CB.lidl){ const e=bigStore(CB.lidl,{h:6.5,wall:'#d6d9dc',roof:'#4d5257',text:'LIDL',sign:'#0050aa',signText:'#ffe500',stripe:'#e60a14',font:'900 96px Barlow, Arial',canopyCol:0x8a9096});
    { const x=e.p[0]+e.n[0]*14-e.n[1]*10, z=e.p[1]+e.n[1]*14+e.n[0]*10; const py=new THREE.Group(); py.position.set(x,H(x,z),z); scene.add(py); bx(py,.4,7,.4,0,0,0,new THREE.MeshLambertMaterial({color:0x6a6e72}));
      const lt=tex(256,256,(c,w,h)=>{ c.fillStyle='#0050aa'; c.fillRect(0,0,w,h); c.fillStyle='#ffe500'; c.beginPath(); c.arc(w/2,h/2,100,0,7); c.fill(); c.strokeStyle='#e60a14'; c.lineWidth=8; c.stroke(); c.fillStyle='#0050aa'; c.font='900 78px Barlow, Arial'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('LIDL',w/2,h/2+4); });
      const bxm=new THREE.Mesh(new THREE.BoxGeometry(2.6,2.6,.4),[new THREE.MeshLambertMaterial({color:0x0050aa}),new THREE.MeshLambertMaterial({color:0x0050aa}),new THREE.MeshLambertMaterial({color:0x0050aa}),new THREE.MeshLambertMaterial({color:0x0050aa}),new THREE.MeshLambertMaterial({map:lt}),new THREE.MeshLambertMaterial({map:lt})]); bxm.position.y=7.8; bxm.rotation.y=Math.atan2(e.n[0],e.n[1]); py.add(bxm); addSolid({x,z,hw:.3,hd:.3,c:1,s:0,r:.5}); }
    const r=defRoom({kind:'shop',W:30,D:22,col:0x0050aa,rows:6,checkouts:3,walkers:6,basket:0x0050aa,logo:logoT('#0050aa','#ffe500','LIDL','900 90px Barlow, Arial')}); r.items=[['Bagietka',3,'hp',15],['Banany 1 kg',6,'hp',20],['Sok pomarańczowy',5,'hp',15],['Piwo',4,'piwo',0],['Pizza mrożona',12,'hp',50],['Energetyk',4,'boost',60]]; r.shopName='Lidl'; addEnt(r,'Lidla',e.p,e.n); r.title='Lidl';
    POIS.push({n:'Lidl',x:e.p[0],z:e.p[1],p:e.p,c:'#0050aa',ic:'L',sp:labelSprite('Lidl','#0050aa')}); { const lp=POIS[POIS.length-1]; lp.sp.position.set(e.p[0],H(e.p[0],e.p[1])+9,e.p[1]); lp.sp.visible=false; scene.add(lp.sp); } }
  // ceny paliw: próba pobrania aktualnych cen (plik aktualizowany codziennie na trebaczew.io)
  (async()=>{ try{ const ctl=new AbortController(); setTimeout(()=>ctl.abort(),5000); const u=location.hostname.endsWith('trebaczew.io')?'ceny_paliw.json':'https://trebaczew.io/ceny_paliw.json'; const r=await fetch(u,{cache:'no-store',signal:ctl.signal}); if(!r.ok)return; const j=await r.json();
      const ok=v=>typeof v==='number'&&v>1&&v<20; let ch=false; ['pb95','on','lpg','pb98'].forEach(k=>{ if(ok(j[k])){ FUEL[k]=j[k]; ch=true; } }); if(ch){ if(typeof j.date==='string') FUEL.date=j.date.slice(0,10); if(typeof j.src==='string') FUEL.src=j.src.slice(0,80); refreshPylons(); } }catch(e){} })();

  /* ---------- paliwo: bak, spalanie, tankowanie na Orlenie ---------- */
  const FUEL_NAME={pb95:'Pb95',on:'ON',lpg:'LPG',pb98:'Pb98'};
  function fuelInit(c){ if(!c||c.kind==='bike'||c.fuel!==undefined)return; const cap={car:45,van:70,moto:14,tractor:90,fire:200,bus:200}[c.kind]||45; c.cap=cap; c.ftype=c.kind==='car'?pick(['pb95','pb95','pb95','on','lpg']):c.kind==='moto'?'pb95':'on'; c.fuel=+(cap*R(.25,.8)).toFixed(1); c.lowWarn=false; }
  function fuelUse(c,dist){ if(c.fuel===undefined||dist<=0)return; const was=c.fuel; c.fuel=Math.max(0,c.fuel-dist*c.cap/18000);
    if(was/c.cap>.15&&c.fuel/c.cap<=.15) toast('<b>MAŁO PALIWA</b><br>Zatankuj na ORLENIE w Działoszynie (ul. Piłsudskiego)',4);
    if(was>0&&c.fuel<=0){ toast('<b>SKOŃCZYŁO SIĘ PALIWO</b><br>Dojdź pieszo na ORLEN i kup kanister albo podjedź innym autem',5); if(AU.ctx&&AU.on) noiseHit(AU.ctx.currentTime,.4,.05,'lowpass',200); } }
  function nearPump(){ if(!st.car||!ORLEN||st.car.fuel===undefined)return null; return ORLEN.pumps.find(p=>Math.hypot(p[0]-st.car.x,p[1]-st.car.z)<6)||null; }
  function openFuel(){ const c=st.car, pp=nearPump(); if(!c||!pp)return; if(Math.abs(c.v)>1){ toast('Zatrzymaj się przy dystrybutorze',2); return; } const price=FUEL[c.ftype]||FUEL.pb95; const need=Math.max(0,c.cap-c.fuel);
    SHOP_OPEN={n:'ORLEN – dystrybutor',p:pp,items:[]}; keys.clear(); shopEl.hidden=false;
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
  const LVL_XP=[0,100,250,450,750,1150,1700,2400,3300,4500];          // próg na poziom 1..10 (na początku szybko, potem wolniej)
  function levelOf(xp){ let L=1; for(let i=1;i<LVL_XP.length;i++) if(xp>=LVL_XP[i]) L=i+1; return L; }
  st.xp=st.xp||0; st.level=levelOf(st.xp);
  function updLevel(){ const L=levelOf(st.xp), a=LVL_XP[L-1], b=LVL_XP[L]; $('lvlTxt').textContent='POZIOM '+L+(L>=10?' (MAX)':''); $('xpb').style.width=(L>=10?100:Math.round((st.xp-a)/(b-a)*100))+'%'; }
  function addXP(v){ const L0=levelOf(st.xp); st.xp+=v; const L=levelOf(st.xp); st.level=L; updLevel(); if(L>L0){ toast(`<b>AWANS! POZIOM ${L}</b><br>Nowe misje w dzienniku (Q)`,4); if(AU.ctx&&AU.on) sfx.win(); refreshMarks(); } }

  /* ---------- kampania: 20 misji głównych + misje poboczne ---------- */
  let LASTBUY=null; const _buy=buy; buy=function(i){ const it=SHOP_OPEN&&SHOP_OPEN.items[i]; const m0=st.money; _buy(i); if(it&&st.money<m0) LASTBUY={shop:SHOP_OPEN.n,item:it[0],t:tAll}; };
  const fr=(b,o)=>{ const f=b.front; return [f.x+f.nx*(o||3),f.z+f.nz*(o||3)]; }; const sideOf=(b,o,sd)=>{ const f=b.front; return [f.x+f.nx*o-f.nz*sd,f.z+f.nz*o+f.nx*sd]; };
  const nearHouse=(x,z)=>frontOf(resHouses.reduce((a,h)=>Math.hypot(h.x-x,h.z-z)<Math.hypot(a.x-x,a.z-z)?h:a));
  const farHouse=(s,d0,d1)=>frontOf(pick(housesBy(h=>{ const d=Math.hypot(h.x-s[0],h.z-s[1]); return d>d0&&d<d1; }))||resHouses[0]);
  const SCHOOL_P=frontOf({x:centroid(BPOLY.find(b=>b.code===5&&b!==CHURCH).pts)[0],z:centroid(BPOLY.find(b=>b.code===5&&b!==CHURCH).pts)[1]});
  const CHURCH_P=(()=>{ const c=centroid(CHURCH.pts); const nr=nearestRoad(c[0],c[1],r=>r===DK); const a=DK.pts[nr.seg]; const dx=a[0]-c[0],dz=a[1]-c[1],l=Math.hypot(dx,dz)||1; return [c[0]+dx/l*14,c[1]+dz/l*14]; })();
  const PARK_P=PARK_GUYS.anchor?[PARK_GUYS.anchor[0]+1.5,PARK_GUYS.anchor[1]+1.5]:centroid(PARK.pts);
  const OSP_B=BLD.find(b=>b.kind==='osp'); const OSP_P=OSP_B&&OSP_B.front?fr(OSP_B,6):[-192,190];
  const WYD=(()=>{ const p=(typeof DATA_X!=='undefined'?DATA_X.P:[]).find(q=>q[0]==='Wydrzynów'); return p?nearHouse(p[2],p[3]):[1700,540]; })();
  const SAD=(()=>{ const p=(typeof DATA_X!=='undefined'?DATA_X.P:[]).find(q=>q[0]==='Sadowiec-Wrzosy'); return p?nearHouse(p[2],p[3]):[-1700,-270]; })();
  const STATION_P=[-510,1462], DOC_P=[-99,-206];
  const MIN_P=CB.mineral&&CB.mineral.front?fr(CB.mineral,8):[-580,1690];
  const TIR_P=TIR_LOT?[TIR_LOT.x,TIR_LOT.z]:[-130,-260];
  const fieldPts=()=>{ const out=[]; for(let t=0;t<200&&out.length<4;t++){ const pc=pick(PARCELS); if(pc.res||Math.abs(polyArea(pc.p))<9000)continue; const c=centroid(pc.p); if(!blocked(c[0],c[1],2)&&!out.some(o=>Math.hypot(o[0]-c[0],o[1]-c[1])<120)) out.push(c); } return out; };
  const dkPt=f=>{ const s=sampleLine(DK.pts,DK.len,DK.L*f); return [s.x,s.z]; };
  const C=(id,n,lvl,xp,reward,start,desc,steps,o)=>Object.assign({id,n,lvl,xp,reward,start,desc,steps,main:true},o||{});
  const CAMPAIGN=[
    C('m1','Pierwsze zakupy',1,80,300,()=>sideOf(B_LEW,10,4),'Zacznij od podstaw: wejdź do Lewiatana (podejdź do drzwi albo naciśnij E / Akcja) i kup cokolwiek przy kasie.',()=>[{p:fr(B_LEW,2),t:'Kup coś w Lewiatanie',buy:'Lewiatan'}]),
    C('m2','Znicz dla dziadka',1,90,400,()=>sideOf(B_LEW,10,-4),'Kup znicz w Lewiatanie i zapal go na grobie dziadka na cmentarzu.',()=>[{p:fr(B_LEW,2),t:'Kup znicz w Lewiatanie',buy:'Lewiatan',item:'Znicz'},{p:centroid(CEM.pts),t:'Zapal znicz na grobie',wait:4,r:12}]),
    C('m3','Wizyta u lekarza',2,120,300,()=>[DOC_P[0]+6,DOC_P[1]+4],'Kaszel nie przechodzi. Idź do ośrodka zdrowia i odczekaj swoje w poczekalni.',()=>[{p:DOC_P,t:'Poczekaj na wizytę',wait:10,r:6,heal:1}]),
    C('m4','Mecz na orliku',2,140,500,()=>[orlik.m.cx+10,orlik.m.cz-16],'Chłopaki zbierają drużynę. Pograj w piłkę na orliku przy parku.',()=>[{p:[orlik.m.cx,orlik.m.cz],t:'Graj w piłkę',wait:18,r:16,onfoot:1}]),
    C('m5','Browar w parku',3,160,200,()=>fr(B_ZAB,5),'Kup piwo w Żabce i dołącz do ekipy na ławce w parku.',()=>[{p:fr(B_ZAB,2),t:'Kup piwo w Żabce',buy:'Żabka',item:'Piwo'},{p:PARK_P,t:'Posiedź z ekipą na ławce',wait:12,r:5,onfoot:1}]),
    C('m6','Do szkoły na czas',3,180,600,()=>fr(B_ZAB,7),'Zaraz dzwonek! Pobiegnij do szkoły, zanim skończy się czas.',()=>[{p:SCHOOL_P,t:'Biegnij do szkoły',onfoot:1}],{time:80}),
    C('m7','Niedzielna msza',3,200,300,()=>[CHURCH_P[0]+8,CHURCH_P[1]],'Babcia prosi, żebyś poszedł na mszę do kościoła Nawiedzenia NMP.',()=>[{p:CHURCH_P,t:'Zostań na mszy',wait:20,r:12,onfoot:1}]),
    C('m8','Paczka dla sąsiada',4,220,1500,()=>{ const l=LOCKERS[0]; return [l.x+3,l.z+3]; },'Odbierz paczkę z paczkomatu i zanieś ją pod wskazany dom.',function(){ const l=LOCKERS[0]; return [{p:[l.x,l.z],t:'Odbierz paczkę z paczkomatu',r:3},{p:farHouse([l.x,l.z],150,420),t:'Dostarcz paczkę'}]; },{time:180}),
    C('m9','Tankowanie na Orlenie',4,260,2000,()=>ORLEN?ORLEN.shop:dkPt(.15),'Bak prawie pusty. Weź auto i zatankuj na Orlenie w Działoszynie.',()=>[{p:ORLEN?ORLEN.pump:dkPt(.15),t:'Zatankuj auto (stój przy dystrybutorze)',wait:6,r:7,car:1,pay:250}]),
    C('m10','Ucieczka przed policją',5,320,5000,()=>dkPt(.55),'Pan władza Cię namierzył. Zgub pościg — po prostu przetrwaj, aż gwiazdki zgasną.',()=>[{p:null,t:'Zgub policję',escape:2}],{time:240}),
    C('m11','Domówka na Wydrzynowie',5,340,1500,()=>fr(B_ZAB,8),'Kup zgrzewkę w Żabce i jedź na domówkę na Wydrzynów.',()=>[{p:fr(B_ZAB,2),t:'Kup zgrzewkę w Żabce',buy:'Żabka',item:'Zgrzewka na domówkę'},{p:WYD,t:'Jedź na domówkę na Wydrzynów'},{p:WYD,t:'Imprezuj',wait:10,r:10,onfoot:1}]),
    C('m12','Zielone w parku',6,380,2500,()=>[PARK_P[0]-8,PARK_P[1]+6],'Koleś w kapturze w parku ma „zielone”. Zapłać mu i zwiewaj, zanim zjawi się policja.',()=>[{p:[PARK_P[0]-14,PARK_P[1]+10],t:'Zapłać gościowi w kapturze (200 zł)',pay:200,r:4},{p:null,t:'Uciekaj przed policją',escape:1}],{time:200}),
    C('m13','Wyścig po DK42',6,420,6000,()=>dkPt(.6),'Weź auto: od Trębaczewa do Działoszyna i z powrotem, zanim skończy się czas.',()=>[.5,.35,.2,.08,.25,.45,.6].map(f=>({p:dkPt(f),t:'Punkt kontrolny',car:1})),{time:240,needCar:true}),
    C('m14','Pizza po zmroku',7,460,4000,()=>[-151,-340],'Euforia ma ruch. Rozwieź cztery pizze po wsi.',function(){ const s=[-151,-340]; return [0,1,2,3].map(i=>({p:farHouse(s,90+i*60,520),t:`Pizza ${i+1} z 4`})); },{time:260}),
    C('m15','Strażak ochotnik',7,520,8000,()=>OSP_P,'Pali się na Sadowcu! Wsiądź do wozu OSP i jedź gasić.',()=>[{p:SAD,t:'Dojedź wozem strażackim do pożaru',car:'fire'},{p:SAD,t:'Gaś pożar',wait:10,r:14,car:'fire',fire:1}],{time:300}),
    C('m16','Transport z Minerału',8,600,10000,()=>MIN_P,'Zakład Kredowy „Minerał” potrzebuje kierowcy. Odbierz towar i zawieź go na plac TIR-ów przy Szkolnej.',()=>[{p:MIN_P,t:'Załaduj towar w Minerale',wait:5,r:8,car:1},{p:TIR_P,t:'Dowieź towar na plac TIR-ów',car:1}],{time:300}),
    C('m17','Pociąg o czasie',8,650,6000,()=>fr(B_LEW,8),'Pociąg z Działoszyna odjeżdża za chwilę. Zdąż na peron!',()=>[{p:STATION_P,t:'Zdąż na peron w Działoszynie',r:10}],{time:150}),
    C('m18','Żniwa',9,750,15000,()=>{ const t=parked.find(c=>c.kind==='tractor'); return t?[t.x+5,t.z+5]:[-300,300]; },'Pomóż przy żniwach: weź ciągnik i objedź cztery pola.',function(){ return fieldPts().map((p,i)=>({p,t:`Pole ${i+1} z 4`,car:'tractor'})); },{time:420}),
    C('m19','Wielki wyścig gminny',9,900,25000,()=>[orlik.m.cx+12,orlik.m.cz-12],'Ostatni sprawdzian: Sadowiec – Wydrzynów – Działoszyn i powrót na orlik.',()=>[{p:SAD,t:'Sadowiec-Wrzosy',car:1},{p:WYD,t:'Wydrzynów',car:1},{p:STATION_P,t:'Dworzec Działoszyn',car:1},{p:[orlik.m.cx,orlik.m.cz-14],t:'Meta przy orliku',car:1}],{time:420}),
    C('m20','Własny kąt',10,0,0,()=>FOR_SALE?FOR_SALE.p:[0,0],'Dom na sprzedaż w Trębaczewie. Zbierz 450 000 zł i kup go — to koniec gry.',()=>[{p:FOR_SALE?FOR_SALE.p:[0,0],t:'Kup dom (450 000 zł)',pay:450000,r:5,win:1}])];
  const SIDE=[
    {id:'s1',n:'Paczki z paczkomatu',xp:40,reward:900,start:()=>{ const l=LOCKERS[LOCKERS.length-1]; return [l.x+3,l.z-3]; },desc:'Dorabiasz jako kurier. Rozwieź paczkę pod wskazany dom.',steps(){ const l=LOCKERS[LOCKERS.length-1]; return [{p:farHouse([l.x,l.z],120,450),t:'Dostarcz paczkę'}]; },time:160},
    {id:'s2',n:'Dowóz pizzy',xp:45,reward:1100,start:()=>[-146,-352],desc:'Euforia szuka dostawcy na dziś.',steps(){ const s=[-151,-340]; return [0,1].map(i=>({p:farHouse(s,100+i*80,480),t:`Pizza ${i+1} z 2`})); },time:180},
    {id:'s3',n:'Zakupy dla sąsiadki',xp:35,reward:700,start:()=>nearHouse(-150,230),desc:'Pani Halinka prosi o chleb z Lewiatana.',steps(){ return [{p:fr(B_LEW,2),t:'Kup coś w Lewiatanie',buy:'Lewiatan'},{p:nearHouse(-150,230),t:'Zanieś zakupy sąsiadce'}]; },time:240},
    {id:'s4',n:'Wyścig dookoła wsi',xp:60,reward:2500,start:()=>[orlik.m.cx+8,orlik.m.cz-14],desc:'Przejedź trasę po wsi przed czasem.',steps(){ return [['Zielona',.95],['Traktorowa',.5],['Spacerowa',.9],['Szkolna',.15],['Sikorskiego',.4],['Szkolna',.55]].map(([n,f])=>({p:roadPt(n,f,0),t:'Punkt kontrolny',car:1})).filter(c=>c.p); },time:150,needCar:true},
    {id:'s5',n:'Taksówka na dworzec',xp:55,reward:2000,start:()=>fr(B_ZAB,10),desc:'Sąsiad spóźni się na pociąg. Zawieź go autem na dworzec w Działoszynie.',steps(){ return [{p:STATION_P,t:'Zawieź pasażera na dworzec',car:1}]; },time:200,needCar:true}];
  const MISSIONS=[...CAMPAIGN,...SIDE]; const SIDE_CD=300;                                // misje poboczne wracają po 5 min
  const DONE=new Set(); const SIDE_T={}; let ACTIVE=null;
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
  function avail(m){ if(m.main){ if(DONE.has(m.id))return false; const idx=CAMPAIGN.indexOf(m); if(idx>0&&!DONE.has(CAMPAIGN[idx-1].id))return false; return st.level>=m.lvl; } const t=SIDE_T[m.id]; return !t||Date.now()-t>SIDE_CD*1000; }
  function refreshMarks(){ MISSIONS.forEach(m=>{ const a=!ACTIVE&&avail(m); if(a){ try{ m.sp=walkSpot(m.start(),false); }catch(e){ m.sp=[0,0]; } m.mk.position.set(m.sp[0],H(m.sp[0],m.sp[1]),m.sp[1]); } m.mk.visible=a; }); }
  function startMission(m){ if(!m||ACTIVE)return; if(m.needCar&&!(st.car&&st.car.kind!=='bike')){ toast('Do tej misji potrzebujesz auta',3); return; }
    const steps=(typeof m.steps==='function'?m.steps.call(m):m.steps).filter(s=>s&&(s.p||s.escape)); steps.forEach(s=>{ if(s.p&&!s.buy) s.p=walkSpot(s.p,!!s.car&&!s.onfoot); }); ACTIVE={m,steps,i:0,t:m.time||0,w:0,t0:tAll}; MISSIONS.forEach(q=>q.mk.visible=false); toast(`<b>${m.n}</b><br>${m.desc}`,4.5); stepBegin(); }
  function stepBegin(){ const s=ACTIVE.steps[ACTIVE.i]; ACTIVE.w=0; ACTIVE.ts=tAll; if(s.escape){ setWanted(Math.max(st.wanted,s.escape)); ACTIVE.hadW=true; cpMark.visible=false; } else { cpMark.position.set(s.p[0],H(s.p[0],s.p[1]),s.p[1]); cpMark.visible=true; }
    smoke.visible=!!s.fire; if(s.fire) smoke.position.set(s.p[0]+8,H(s.p[0],s.p[1]),s.p[1]+6); }
  function endMission(ok){ const m=ACTIVE.m; cpMark.visible=false; smoke.visible=false; ACTIVE=null;
    if(ok){ if(m.main) DONE.add(m.id); else SIDE_T[m.id]=Date.now(); const rw=m.main?m.reward:Math.round(m.reward*(1+st.level*.35)); if(rw) addMoney(rw); if(m.xp) addXP(m.xp); toast(`<b>MISJA ZALICZONA</b><br>${m.n}${rw?` · +${fmt(rw)}`:''}${m.xp?` · +${m.xp} XP`:''}`,4.5); if(AU.ctx&&AU.on)sfx.win(); saveGame(); }
    else toast('<b>MISJA NIEUDANA</b><br>Spróbuj jeszcze raz',3.5); refreshMarks(); }
  function stepOK(s){ if(s.car&&!st.car){ return 'Wsiądź do pojazdu'; } if(s.car==='fire'&&!(st.car&&st.car.kind==='fire')) return 'Potrzebny wóz strażacki z OSP'; if(s.car==='tractor'&&!(st.car&&st.car.kind==='tractor')) return 'Potrzebny ciągnik'; if(s.onfoot&&st.car) return 'Wysiądź z pojazdu'; return ''; }
  function missionUpdate(dt){ sideRefresh(dt); MISSIONS.forEach((m,i)=>{ if(m.mk.visible) m.mk.children[0].material.opacity=.25+Math.sin(tAll*3+i)*.08; });
    if(smoke.visible) smoke.children.forEach(s=>{ const k=(s.userData.o+tAll*.12)%1; s.position.set(Math.sin(k*9)*1.5,2+k*18,Math.cos(k*7)*1.5); s.scale.setScalar(1+k*4); });
    if(!ACTIVE){ missionEl.hidden=true; return; } const A=ACTIVE, s=A.steps[A.i]; if(A.m.time){ A.t-=dt; if(A.t<=0){ endMission(false); return; } }
    let info='', d=0;
    if(s.escape){ info=st.wanted>0?`Gwiazdki: ${st.wanted} — uciekaj!`:''; if(st.wanted===0&&tAll-A.ts>2) return nextStep(); }
    else if(s.buy){ d=st.inside?0:Math.hypot(s.p[0]-st.x,s.p[1]-st.z); if(LASTBUY&&LASTBUY.t>A.ts&&LASTBUY.shop===s.buy&&(!s.item||LASTBUY.item===s.item)) return nextStep(); info=st.inside||d<8?`podejdź do kasy i naciśnij E${s.item?' · '+s.item:''}`:''; }
    else { const PP=st.inside&&CUR.worldPos?CUR.worldPos:[st.x,st.z]; d=Math.hypot(s.p[0]-PP[0],s.p[1]-PP[1]); const R0=Math.max(s.r||(st.car?6:3.5),st.inside&&CUR.worldPos?6:0); const bad=stepOK(s);
      if(d<R0){ if(bad) info=bad; else if(s.pay){ if(st.money>=s.pay){ if(s.wait){ A.w+=dt; info=`${Math.ceil(s.wait-A.w)} s`; if(A.w>=s.wait){ st.money-=s.pay; shownMoney=st.money; toast(`Zapłacono ${fmt(s.pay)}`,2); return nextStep(); } } else { st.money-=s.pay; shownMoney=st.money; moneyEl.textContent=fmt(st.money); toast(`Zapłacono ${fmt(s.pay)}`,2); return nextStep(); } } else info=`Brakuje ${fmt(s.pay-st.money)}`; }
        else if(s.wait){ A.w+=dt; info=`${Math.ceil(s.wait-A.w)} s`; if(A.w>=s.wait){ if(s.heal) st.hp=100; return nextStep(); } }
        else return nextStep(); } else if(s.wait) A.w=Math.max(0,A.w-dt*.5); }
    missionEl.hidden=false; missionEl.innerHTML=`<b>${A.m.n}</b><span>${s.t}${s.p&&d>1?' · '+Math.round(d)+' m':''}${info?' · '+info:''}</span>${A.m.time?`<em>${Math.max(0,Math.ceil(A.t))} s</em>`:''}`; }
  function nextStep(){ const A=ACTIVE, s=A.steps[A.i]; if(s.win){ endMission(true); winGame(); return; } A.i++; if(AU.ctx&&AU.on)sfx.cash(); if(A.i>=A.steps.length) endMission(true); else { stepBegin(); toast(A.steps[A.i].t,2.2); } }
  function winGame(){ const w=document.getElementById('winScreen'); if(!w)return; w.hidden=false; w.querySelector('.stats').textContent=`Poziom ${st.level} · misje główne: ${DONE.size}/20 · czas gry: ${Math.round(tAll/60)} min`; }
  function extBlips(rx,px,py,sc){ const dot=(x,z,c,r)=>{ const [a,b]=mp(x,z); rx.beginPath(); rx.arc(a-px,b-py,r/sc,0,7); rx.fillStyle=c; rx.fill(); rx.lineWidth=2/sc; rx.strokeStyle='#000'; rx.stroke(); };
    if(ACTIVE){ const s=ACTIVE.steps[ACTIVE.i]; if(s.p) dot(s.p[0],s.p[1],'#ff3a3a',8); } else MISSIONS.forEach(m=>{ if(m.mk.visible) dot(m.sp[0],m.sp[1],m.main?'#ffd23a':'#3fb0ff',6); }); if(WAYPOINT) dot(WAYPOINT[0],WAYPOINT[1],'#c86bff',7);
    COPS.forEach(c=>dot(c.x,c.z,Math.floor(tAll*4)%2?'#2040ff':'#ff2020',5)); mpBlips(dot); }
  let WAYPOINT=null;
  // dziennik misji (Q)
  const logEl=document.getElementById('questLog'); let LOG_SEL=null;
  function renderLog(){ const row=(m)=>{ const done=m.main?DONE.has(m.id):false, a=avail(m), cd=!m.main&&SIDE_T[m.id]?Math.max(0,Math.ceil((SIDE_CD*1000-(Date.now()-SIDE_T[m.id]))/1000)):0; const lock=m.main&&!done&&!a; const act=ACTIVE&&ACTIVE.m===m;
      const st2=act?'▶':done?'✓':lock?'🔒':cd?'⏳':'●'; const sub=m.main?(done?'ukończona':lock?(st.level<m.lvl?`wymaga poziomu ${m.lvl}`:'najpierw poprzednia misja'):act?'w trakcie':'dostępna'):(act?'w trakcie':cd?`znów za ${Math.floor(cd/60)}:${String(cd%60).padStart(2,'0')}`:'dostępna');
      return `<button class="q${LOG_SEL===m.id?' sel':''}${done?' done':''}${lock?' lock':''}" data-id="${m.id}"><span class="ic">${st2}</span><span class="nm">${m.main?CAMPAIGN.indexOf(m)+1+'. ':''}${m.n}</span><span class="sb">${sub}</span></button>`; };
    const sel=MISSIONS.find(m=>m.id===LOG_SEL)||ACTIVE&&ACTIVE.m||CAMPAIGN.find(m=>!DONE.has(m.id))||CAMPAIGN[19];
    logEl.querySelector('.ql').innerHTML='<h3>Fabuła</h3>'+CAMPAIGN.map(row).join('')+'<h3>Poboczne</h3>'+SIDE.map(row).join('');
    logEl.querySelector('.qd').innerHTML=sel?`<h2>${sel.n}</h2><p class="meta">${sel.main?`Misja ${CAMPAIGN.indexOf(sel)+1} z 20 · poziom ${sel.lvl}`:'Misja poboczna · co 5 min'} · nagroda ${sel.reward?fmt(sel.main?sel.reward:Math.round(sel.reward*(1+st.level*.35))):'—'} · ${sel.xp} XP</p><p>${sel.desc}</p>${avail(sel)&&!ACTIVE?'<button class="btn" id="qWay">Pokaż na mapie</button>':''}${ACTIVE&&ACTIVE.m===sel?'<button class="btn" id="qAbort">Przerwij misję</button>':''}`:'';
    logEl.querySelectorAll('button.q').forEach(b=>b.addEventListener('click',()=>{ LOG_SEL=b.dataset.id; renderLog(); }));
    const w=document.getElementById('qWay'); if(w) w.addEventListener('click',()=>{ try{ WAYPOINT=sel.start(); }catch(e){} toast('Cel zaznaczony na radarze (fioletowy)',2.5); const fm=LOG_FROM_MENU; LOG_FROM_MENU=false; toggleLog(false); if(fm) showMenu(false); });
    const ab=document.getElementById('qAbort'); if(ab) ab.addEventListener('click',()=>{ endMission(false); renderLog(); });
    $('qMoney').textContent=fmt(st.money); $('qLvl').textContent='Poziom '+st.level+' · '+st.xp+' XP'; }
  let LOG_FROM_MENU=false;
  function toggleLog(v){ logEl.hidden=v===undefined?!logEl.hidden:!v; if(!logEl.hidden){ keys.clear(); renderLog(); } else if(LOG_FROM_MENU){ LOG_FROM_MENU=false; showMenu(true); } }
  addEventListener('keydown',e=>{ if(e.code==='Escape'&&!logEl.hidden){ toggleLog(false); e.preventDefault(); e.stopPropagation(); } },true);
  document.getElementById('qClose').addEventListener('click',()=>toggleLog(false)); if(IS_TOUCH) document.getElementById('qClose').textContent='Zamknij';

  /* ---------- zapis postępu ---------- */
  function saveGame(){ try{ localStorage.setItem('trebaczew-gra',JSON.stringify({v:2,money:st.money,xp:st.xp,done:[...DONE],side:SIDE_T,season:ENV.season,time:ENV.time,weather:ENV.weather})); }catch(e){} }
  try{ const sv=JSON.parse(localStorage.getItem('trebaczew-gra')||'null'); if(sv){ if(saved.money===undefined){ st.money=+sv.money||0; shownMoney=st.money; } if(sv.v===2){ (sv.done||[]).forEach(d=>{ if(CAMPAIGN.some(m=>m.id===d)) DONE.add(d); }); st.xp=Math.max(0,+sv.xp||0); if(sv.side&&typeof sv.side==='object') Object.keys(sv.side).forEach(k=>{ if(SIDE.some(m=>m.id===k)) SIDE_T[k]=+sv.side[k]||0; }); } if(sv.season!==undefined)ENV.season=sv.season; if(sv.time!==undefined)ENV.time=sv.time; } }catch(e){}
  { let has=false; try{ has=!!localStorage.getItem('trebaczew-gra'); }catch(e){} if(!has&&saved.money===undefined&&st.money<200){ st.money=200; shownMoney=st.money; } }
  st.level=levelOf(st.xp); updLevel(); refreshMarks();
  let sideRef=0; function sideRefresh(dt){ sideRef-=dt; if(sideRef<0){ sideRef=5; if(!ACTIVE) MISSIONS.forEach(m=>{ if(!m.main&&!m.mk.visible&&avail(m)){ try{ m.sp=walkSpot(m.start(),false); }catch(e){} m.mk.position.set(m.sp[0],H(m.sp[0],m.sp[1]),m.sp[1]); m.mk.visible=true; } }); } }

  /* ---------- ukrywanie drobnych obiektów w oddali (bramy, auta na podwórkach, zwierzęta, przechodnie) ---------- */
  const CULL=[]; let cullI=0;
  GATES.forEach(it=>{ if(it.g&&!it.g.userData.cull){ it.g.userData.cull=1; CULL.push({o:it.g,x:it.cx,z:it.cz,r:IS_TOUCH?110:170}); } });
  parked.forEach(c=>{ CULL.push({o:c.g,car:c,r:IS_TOUCH?170:260}); });
  peds.forEach(p=>CULL.push({o:p.g,ped:p,r:IS_TOUCH?120:200}));
  function cullUpdate(){ if(!CULL.length)return; let fx=st.inside&&CUR.ret?CUR.ret.x:(st.car?st.car.x:st.x), fz=st.inside&&CUR.ret?CUR.ret.z:(st.car?st.car.z:st.z); if(GAME.paused&&!GAME.started&&MENU.c){ fx=MENU.c[0]; fz=MENU.c[1]; } const far=st.mode===2?1.8:1, n=Math.min(CULL.length,IS_TOUCH?220:360);
    for(let k=0;k<n;k++){ cullI=(cullI+1)%CULL.length; const c=CULL[cullI]; let x=c.x,z=c.z; if(c.car){ x=c.car.x; z=c.car.z; if(c.car===st.car){ c.o.visible=true; continue; } } else if(c.ped){ x=c.o.position.x; z=c.o.position.z; }
      const r=c.r*far; c.o.visible=!st.inside&&((x-fx)*(x-fx)+(z-fz)*(z-fz)<r*r); } chunkUpdate(fx,fz); }
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
  let chunkT=0; function chunkUpdate(fx,fz){ if(tAll-chunkT<.25&&!GAME.paused) return; chunkT=tAll; const R=(IS_TOUCH?480:720)*(st.mode===2?1.6:1); CHUNKS.forEach(c=>{ const d=Math.hypot(c.x-fx,c.z-fz)-c.r; c.o.visible=!st.inside&&d<R; }); }

  let fpsAcc=0,fpsN=0,pr=DPR;
  /* ---------- menu główne, pauza (Esc), opcje z przypisywaniem klawiszy, kreator postaci, zgłaszanie błędów ---------- */
  const menuEl=$('menu'), MENU={t:0,view:'',c:null,ca:0};
  { const cc=centroid(CHURCH.pts); MENU.c=[cc[0]+40,cc[1]+30]; }
  const ACTIONS=[['w','Do przodu / gaz'],['s','Do tyłu / hamulec'],['a','W lewo'],['d','W prawo'],['shift','Sprint'],[' ','Skok / ręczny'],['f','Wsiądź / wysiądź'],['e','Akcja (misja, sklep, brama)'],['q','Dziennik misji'],['m','Mapa'],['c','Kamera'],['r','Radio w aucie'],['n','Pora dnia']];
  const keyName=c=>({Space:'Spacja',ShiftLeft:'L Shift',ShiftRight:'P Shift',ControlLeft:'L Ctrl',ControlRight:'P Ctrl',AltLeft:'L Alt',Tab:'Tab',Enter:'Enter',Backspace:'Backspace',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',CapsLock:'Caps Lock'})[c]||c.replace(/^Key|^Digit|^Numpad/,'');
  let WAITKEY=null;
  function renderKeys(){ const kl=$('keyList'); kl.innerHTML=''; ACTIONS.forEach(([a,l])=>{ const r=document.createElement('div'); r.className='kRow'; const s=document.createElement('span'); s.textContent=l; const b=document.createElement('button'); b.className='btn'+(WAITKEY===a?' wait':''); b.textContent=WAITKEY===a?'naciśnij…':keyName(KEYMAP[a]); b.addEventListener('click',()=>{ WAITKEY=WAITKEY===a?null:a; renderKeys(); }); r.append(s,b); kl.append(r); }); renderHelp(); }
  addEventListener('keydown',e=>{ if(!WAITKEY)return; e.preventDefault(); e.stopImmediatePropagation(); if(e.code==='Escape'){ WAITKEY=null; renderKeys(); return; }
    const old=KEYMAP[WAITKEY]; const other=Object.keys(KEYMAP).find(k=>KEYMAP[k]===e.code&&k!==WAITKEY); if(other) KEYMAP[other]=old; KEYMAP[WAITKEY]=e.code; WAITKEY=null; rebuildCodes(); try{ localStorage.setItem('trebaczew-klawisze',JSON.stringify(KEYMAP)); }catch(err){} renderKeys(); },true);
  $('kReset').addEventListener('click',()=>{ Object.assign(KEYMAP,KEY_DEF); rebuildCodes(); try{ localStorage.removeItem('trebaczew-klawisze'); }catch(e){} renderKeys(); });
  function renderHelp(){ const K=a=>`<kbd>${keyName(KEYMAP[a])}</kbd>`; $('helpKeys').innerHTML=`${K('w')}${K('a')}${K('s')}${K('d')} ruch · ${K('shift')} sprint · ${K(' ')} skok (w aucie ręczny) · mysz: rozglądanie<br>${K('f')} wsiądź / wysiądź · ${K('e')} akcja: misja, sklep, brama, furtka · ${K('r')} radio<br>${K('q')} dziennik misji · ${K('m')} mapa · ${K('c')} kamera · ${K('n')} pora dnia · <kbd>Esc</kbd> pauza`; }
  // grafika
  function setQuality(q){ ENV.quality=q; renderer.shadowMap.enabled=!!q; sun.castShadow=!!q; if(bloom)bloom.enabled=!!q; pr=q?DPR:Math.min(DPR,.75); renderer.setPixelRatio(pr); resize(); scene.traverse(o=>{ if(o.material&&!Array.isArray(o.material)) o.material.needsUpdate=true; }); updButtons(); try{ localStorage.setItem('trebaczew-grafika',String(q)); }catch(e){} renderQ(); }
  function renderQ(){ $('qChips').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.q===ENV.quality))); $('oSound').textContent=AU.on?'Dźwięk: wł.':'Dźwięk: wył.'; $('oWeather').textContent=$('bWeather').textContent; $('oSeason').textContent=$('bSeason').textContent; }
  $('oWeather').addEventListener('click',()=>{ $('bWeather').click(); renderQ(); }); $('oSeason').addEventListener('click',()=>{ $('bSeason').click(); renderQ(); });
  $('qChips').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>setQuality(+b.dataset.q)));
  $('oSound').addEventListener('click',()=>{ audioStart(); setTimeout(renderQ,50); });
  try{ SENS=clamp(parseFloat(localStorage.getItem('trebaczew-czulosc'))||1,.4,2); }catch(e){} $('sensIn').value=SENS; $('sensIn').addEventListener('input',e=>{ SENS=+e.target.value; try{ localStorage.setItem('trebaczew-czulosc',String(SENS)); }catch(err){} });
  { let q=null; try{ q=localStorage.getItem('trebaczew-grafika'); }catch(e){} if(q==='0'||(q===null&&IS_TOUCH)) setQuality(0); }
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
    player=makePerson(CHAR.top,CHAR.bot,CHAR.hairC,{female:CHAR.sex==='k',style:CHAR.style,hairStyle:CHAR.hair,skin:CHAR.skin,shoe:0x1c1c1c}); player.position.copy(pos); player.rotation.y=rot; player.visible=vis; scene.add(player);
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
  function openPanel(id){ ['pOpt','pChar','pBug'].forEach(p=>$(p).hidden=p!==id); menuEl.classList.toggle('panel',!!id); menuEl.classList.toggle('creator',id==='pChar'); MENU.view=id==='pChar'?'creator':'';
    if(id==='pOpt'){ renderKeys(); renderQ(); } if(id==='pChar'){ renderChar(); MENU.ca=st.yaw; MENU.t=0; } if(id==='pBug') $('bSend').href=bugHref(); WAITKEY=null; }
  menuEl.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>openPanel('')));
  let HAS_SAVE=false; try{ HAS_SAVE=!!localStorage.getItem('trebaczew-gra'); }catch(e){}
  function playSub(){ const has=st.xp>0||DONE.size>0||HAS_SAVE; $('mPlaySub').textContent=GAME.started?'':has?`kontynuuj · poziom ${st.level}`:'nowa gra'; $('mPlay').firstChild.textContent=GAME.started?'Wznów grę ':'Tryb jednoosobowy '; $('mNew').hidden=!has; $('mLog').hidden=!GAME.started; $('mLogSub').textContent=`fabuła ${DONE.size}/20`; }
  function showMenu(v){ GAME.paused=v; if(AU.ctx){ try{ v?AU.ctx.suspend():AU.ctx.resume(); }catch(e){} } menuEl.hidden=!v; document.body.classList.toggle('inmenu',v); keys.clear(); resetJoy(); if(v){ menuEl.classList.toggle('pause',GAME.started); playSub(); openPanel(''); if(!IS_TOUCH) setTimeout(()=>$('mPlay').focus(),30); } else { if(MENU.view==='creator') MENU.view=''; if(MENU.vo){ camera.clearViewOffset(); MENU.vo=false; } canvas.focus(); clock.getDelta(); } }
  $('mPlay').addEventListener('click',()=>{ if(!GAME.started){ GAME.started=true; if(!AU.ctx) try{ audioStart(); }catch(e){} { const how=IS_TOUCH?'Menu → Misje: lista zadań':`<kbd>${keyName(KEYMAP.q)}</kbd> dziennik misji`; toast(`Witaj w Trębaczewie${CHAR.name?', '+CHAR.name:''}!<br>${how} · żółte znaczniki to misje fabularne`,6); } } showMenu(false); });
  $('mOpt').addEventListener('click',()=>openPanel($('pOpt').hidden?'pOpt':''));
  $('mLog').addEventListener('click',()=>{ openPanel(''); menuEl.hidden=true; LOG_FROM_MENU=true; toggleLog(true); });
  $('mChar').addEventListener('click',()=>openPanel($('pChar').hidden?'pChar':''));
  $('mBug').addEventListener('click',()=>openPanel($('pBug').hidden?'pBug':''));
  $('mMulti').addEventListener('click',()=>{ if(!MP.on) mpInit(true); $('mPlay').click(); });
  let newArm=0; $('mNew').addEventListener('click',()=>{ if(Date.now()-newArm>3000){ newArm=Date.now(); $('mNew').firstChild.textContent='Na pewno? Kliknij jeszcze raz '; setTimeout(()=>{ $('mNew').firstChild.textContent='Nowa gra'; },3000); return; }
    try{ localStorage.removeItem('trebaczew-gra'); }catch(e){} location.reload(); });
  ['bMenu','bMenuT'].forEach(id=>$(id).addEventListener('click',()=>showMenu(true)));
  ['bLog','bLogT'].forEach(id=>$(id).addEventListener('click',()=>toggleLog()));
  $('bJump').addEventListener('pointerdown',()=>{ keys.add(' '); setTimeout(()=>keys.delete(' '),120); });
  $('winOk').addEventListener('click',()=>{ $('winScreen').hidden=true; canvas.focus(); });
  addEventListener('keydown',e=>{ if(e.code!=='Escape'||e.defaultPrevented||WAITKEY)return; const tag=e.target&&e.target.tagName; if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'){ if(!menuEl.hidden) e.target.blur(); return; }
    if(!$('winScreen').hidden){ $('winScreen').hidden=true; return; } if(!mapView.hidden){ toggleMap(false); return; }
    if(!menuEl.hidden){ if(!$('pOpt').hidden||!$('pChar').hidden||!$('pBug').hidden){ openPanel(''); return; } if(GAME.started) showMenu(false); return; }
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
    else if(!GAME.started){ const a=MENU.t*.035+.6, r=95, c=MENU.c, y=H(c[0],c[1]); camera.position.set(c[0]+Math.sin(a)*r,y+38,c[1]+Math.cos(a)*r); camera.lookAt(c[0],y+3,c[1]); sun.position.set(c[0]+SUNDIR.x*220,y+SUNDIR.y*220,c[1]+SUNDIR.z*220); sun.target.position.set(c[0],y,c[1]); }
    else return false;
    cullUpdate(); sky.position.copy(camera.position); if(composer) composer.render(dt); else renderer.render(scene,camera); return true; }
  function inCam2(){ const p=camera.position; p.x=clamp(p.x,CUR.x-CUR.W/2+.3,CUR.x+CUR.W/2-.3); p.z=clamp(p.z,CUR.z-CUR.D/2+.3,CUR.z+CUR.D/2-.3); }
  // instalacja gry (PWA): własne okno, pełny ekran, działa też bez internetu – tylko na trebaczew.io
  { let deferred=null; const inst=$('mInstall'), onSite=/trebaczew\.io$/.test(location.hostname)||location.hostname==='localhost'; const standalone=matchMedia('(display-mode: fullscreen)').matches||matchMedia('(display-mode: standalone)').matches||navigator.standalone;
    if(onSite&&'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
    addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferred=e; if(!standalone) inst.hidden=false; });
    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent); if(!standalone&&(ios||!onSite)) inst.hidden=false;
    inst.addEventListener('click',async()=>{ const sub=$('mInstallSub');
      if(deferred){ deferred.prompt(); const r=await deferred.userChoice.catch(()=>null); deferred=null; if(r&&r.outcome==='accepted'){ inst.hidden=true; } return; }
      if(!onSite){ window.open('https://trebaczew.io/?zainstaluj=1','_blank','noopener'); return; }
      sub.textContent=ios?'Safari: Udostępnij → „Do ekranu początkowego”':'menu przeglądarki → „Zainstaluj aplikację”'; }); }
  rebuildPlayer(); renderHelp();

  /* ---------- pętla ---------- */
  function resize(){ const w=innerWidth,h=innerHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); if(composer){ composer.setPixelRatio&&composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w,h); if(fxaa){ const pr2=renderer.getPixelRatio(); fxaa.material.uniforms.resolution.value.set(1/(w*pr2),1/(h*pr2)); } } }
  addEventListener('resize',resize); resize();
  const clock=new THREE.Clock(); const fwd=new THREE.Vector3();
  function animPerson(p,walk,amt){ const u=p.userData, sn=Math.sin(walk), cs=Math.cos(walk); u.lL.rotation.x=sn*.55*amt; u.lR.rotation.x=-sn*.55*amt; u.aL.rotation.x=-sn*.45*amt; u.aR.rotation.x=sn*.45*amt;
    if(u.kL){ u.kL.rotation.x=amt*(.12+.8*Math.max(0,-cs)); u.kR.rotation.x=amt*(.12+.8*Math.max(0,cs)); u.eL.rotation.x=-(.12+.3*amt+Math.max(0,sn)*.25*amt); u.eR.rotation.x=-(.12+.3*amt+Math.max(0,-sn)*.25*amt); } }
  function frame(){ const rawDt=clock.getDelta(); const dt=Math.min(rawDt,0.05); tAll+=dt;
    fpsAcc+=rawDt; fpsN++; if(fpsAcc>2){ const fps=fpsN/fpsAcc; fpsAcc=0; fpsN=0; const npr=fps<28?Math.max(0.6,pr-0.2):fps>55?Math.min(DPR,pr+0.1):pr; if(npr!==pr){ pr=npr; renderer.setPixelRatio(pr); resize(); } }
    if(!mapView.hidden){ requestAnimationFrame(frame); return; }
    if(GAME.paused){ menuFrame(dt); requestAnimationFrame(frame); return; }
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
      let speed=(keys.has('shift')||st.run)?(st.mode===2?60:8.5):(st.mode===2?25:4.2);
      let tvx=0,tvz=0;
      if(mag>0){ const sy=Math.sin(st.yaw), cy=Math.cos(st.yaw); const dx=(-sy*fw+cy*sd), dz=(-cy*fw-sy*sd); const l=Math.hypot(dx,dz)||1;
        const up=(H(st.x+dx/l,st.z+dz/l)-H(st.x,st.z)); speed*=clamp(1-up*1.2,0.55,1.15);            // pod górkę wolniej
        tvx=dx/l*speed*mag; tvz=dz/l*speed*mag; }
      const acc=mag>0?10:16; st.vx=(st.vx||0)+(tvx-(st.vx||0))*Math.min(1,dt*acc); st.vz=(st.vz||0)+(tvz-(st.vz||0))*Math.min(1,dt*acc);
      if(mag===0&&Math.hypot(st.vx,st.vz)<0.15){ st.vx=0; st.vz=0; }
      const vel=Math.hypot(st.vx,st.vz); moving=vel>0.1; mag=Math.min(1,vel/4.2);
      if(moving){ const dx=st.vx, dz=st.vz;
        const nx=st.x+st.vx*dt, nz=st.z+st.vz*dt; const feet=(st.gy||0)+(st.jy||0); const pb=st.inside?((x,z)=>curBlocked(x,z,.35)):(x,z)=>blocked(x,z,.35)||parked.some(c=>{ if(c===st.car)return false; const lx=(x-c.x)*Math.cos(c.h)+(z-c.z)*Math.sin(c.h), lz=-(x-c.x)*Math.sin(c.h)+(z-c.z)*Math.cos(c.h); const [L2,W2]=roofBox(c); return Math.abs(lx)<L2+.35&&Math.abs(lz)<W2+.35&&feet<roofH(c)-.12; });
        if(!pb(nx,nz)){st.x=nx;st.z=nz;} else if(!pb(nx,st.z)) st.x=nx; else if(!pb(st.x,nz)) st.z=nz;
        const tf=Math.atan2(dx,dz); let df=tf-st.face; df=Math.atan2(Math.sin(df),Math.cos(df)); st.face+=df*Math.min(1,dt*12); st.walk+=dt*vel*1.6; }
      if(!st.inside){ st.x=clamp(st.x,X0+30,X1-30); st.z=clamp(st.z,Z0+30,Z1-30); }
      { const sup=st.inside?0:roofAt(st.x,st.z), gy=st.gy||0, ft=gy+(st.jy||0); if(sup>gy+.01){ if(ft>=sup-.15){ st.jy=Math.max(0,ft-sup); st.gy=sup; if(st.jy===0) st.vy=0; } } else if(sup<gy-.01){ st.jy=ft-sup; st.gy=sup; if(!st.vy) st.vy=-.01; } }
      player.position.set(st.x,(st.inside?CUR.y:H(st.x,st.z))+0.1+(st.gy||0)+(st.jy||0)+(moving?Math.abs(Math.cos(st.walk))*0.05:0),st.z); player.rotation.y=st.face; animPerson(player,st.walk,moving?mag:0); player.visible=st.mode!==1; }
    const fx=st.car?st.car.x:st.x, fz=st.car?st.car.z:st.z, fy=st.inside?CUR.y:H(fx,fz); const sh=shake>0?(Math.random()-.5)*shake:0; shake=Math.max(0,shake-dt);
    st.distS=(st.distS||st.dist)+(st.dist-(st.distS||st.dist))*Math.min(1,dt*5); st.carD=(st.carD||0)+((st.car?3:0)-(st.carD||0))*Math.min(1,dt*2.5);
    if(st.mode===0){ const d=Math.max(st.car?8.5:0,st.distS+st.carD), p=Math.max(0.05,st.pitch)+(st.car?.05:0), ty=fy+(st.car?1.4:1.55); let cx=fx+Math.sin(st.yaw)*Math.cos(p)*d+sh, cz=fz+Math.cos(st.yaw)*Math.cos(p)*d; let cy=ty+.4+Math.sin(p)*d; { const steps=12; let hitT=1; if(st.camT===undefined)st.camT=1; for(let i=1;i<=steps;i++){ const t=i/steps, qx=fx+(cx-fx)*t, qz=fz+(cz-fz)*t; if(blocked(qx,qz,.3)){ hitT=Math.max(.18,(i-1)/steps); break; } } const k=hitT<st.camT?4:1.6; st.camT+=(hitT-st.camT)*Math.min(1,dt*k); const tt=st.camT; cx=fx+(cx-fx)*tt; cz=fz+(cz-fz)*tt; cy=ty+.4+(cy-ty-.4)*tt; } cy=Math.max(cy,H(cx,cz)+0.7); camera.position.set(cx,cy,cz); camera.lookAt(fx,ty+(st.car?.6:0),fz); camera.fov+=((st.car?60+Math.min(14,Math.abs(st.car.v)*.5):60)-camera.fov)*Math.min(1,dt*2); camera.updateProjectionMatrix(); }
    else if(st.mode===1){ const hy=fy+(st.car?1.25:1.72); camera.position.set(fx,hy,fz); const p=clamp((st.pitch-0.22)*-1.4,-1.2,1.2); fwd.set(-Math.sin(st.yaw)*Math.cos(p),Math.sin(p),-Math.cos(st.yaw)*Math.cos(p)); camera.lookAt(fx+fwd.x,hy+fwd.y,fz+fwd.z); }
    else { const d=Math.max(80,st.distS*7); const p=clamp(st.pitch+0.65,0.6,1.45); camera.position.set(fx+Math.sin(st.yaw)*Math.cos(p)*d, fy+Math.sin(p)*d, fz+Math.cos(st.yaw)*Math.cos(p)*d); camera.lookAt(fx,fy,fz); }
    if(st.inside) inCam();
    sky.position.copy(camera.position);
    sun.position.set(fx+SUNDIR.x*220,fy+SUNDIR.y*220,fz+SUNDIR.z*220); sun.target.position.set(fx,fy,fz); playerLight.position.set(fx,fy+7,fz);
    if(st.car&&st.night){ const c=st.car; carLight.intensity=2.2; carLight.position.set(c.x+Math.cos(c.h)*2.3,fy+1,c.z+Math.sin(c.h)*2.3); carLight.target.position.set(c.x+Math.cos(c.h)*20,H(c.x+Math.cos(c.h)*20,c.z+Math.sin(c.h)*20),c.z+Math.sin(c.h)*20); } else carLight.intensity=0;
    if(st.night){ const ls=lamps.map(l=>[l,(l.x-fx)**2+(l.z-fz)**2]).sort((a,b)=>a[1]-b[1]); lampPool.forEach((pl,i)=>{ const l=ls[i]&&ls[i][0]; if(l){pl.position.set(l.x,l.y+7.6,l.z); pl.intensity=1.1;} }); } else lampPool.forEach(pl=>pl.intensity=0);
    trafficSpeeds(dt); cars.forEach(c=>{ c.d+=c.dir*c.v*dt; if(c.d>DK.L)c.d-=DK.L; if(c.d<0)c.d+=DK.L; const s=sampleLine(DK.pts,DK.len,c.d); const o=2.2*c.dir; c.x=s.x-s.tz*o; c.z=s.z+s.tx*o; c.h=Math.atan2(s.tz,s.tx)+(c.dir<0?Math.PI:0); seatCar(c.g,c.x,c.z,c.h,0.1); c.g.userData.wheels.forEach(w=>w.rotation.z-=c.v*dt/.36);
      if(!st.car&&Math.hypot(c.x-st.x,c.z-st.z)<2.2&&tAll-(st.hitT||-9)>1.5){ st.hitT=tAll; st.hp=Math.max(0,st.hp-30); shake=.8; const dx=st.x-c.x,dz=st.z-c.z,l=Math.hypot(dx,dz)||1; st.vx=dx/l*9; st.vz=dz/l*9; } });
    const TL=trainLen[trainLen.length-1], cyc=TL+2200; const h0=(tAll*26)%cyc;
    train.forEach((t,i)=>{ const d=h0-i*22; if(d<0||d>TL){t.visible=false;return;} t.visible=true; const s=sampleLine(trainPath,trainLen,d); t.position.set(s.x,H(s.x,s.z)+0.22,s.z); t.rotation.y=-Math.atan2(s.tz,s.tx); });
    peds.forEach(p=>{ if(p.down>0){ p.down-=dt; if(p.down<=0){ p.g.rotation.x=0; } return; }
      const L=p.w.len[p.w.len.length-1]; p.d+=p.dir*p.v*dt; if(p.d>L){p.d=L;p.dir=-1;} if(p.d<0){p.d=0;p.dir=1;} const s=sampleLine(p.w.pts,p.w.len,p.d);
      p.g.position.set(s.x,H(s.x,s.z)+0.16,s.z); p.g.rotation.y=Math.atan2(s.tx*p.dir,s.tz*p.dir); p.walk+=dt*p.v*3; animPerson(p.g,p.walk,1);
      if(st.car&&Math.abs(st.car.v)>5&&Math.hypot(s.x-st.car.x,s.z-st.car.z)<1.9){ p.down=15; p.g.rotation.x=-Math.PI/2; p.g.position.y+=.2; setWanted(st.wanted+1); shake=.4; } });
    pickups.forEach(k=>{ if(k.got)return; k.m.rotation.y+=dt*2; k.m.position.y=k.y+Math.sin(tAll*3+k.x)*.12; if(Math.hypot(k.x-st.x,k.z-st.z)<(st.car?2.6:1.4)){ k.got=true; k.m.visible=false; addMoney(k.val); } });
    if(st.wanted>0){ st.wantedT+=dt; if(st.wantedT>25){ st.wanted--; st.wantedT=0; } }
    if(st.hp<=0&&!st.dead){ st.dead=2.5; if(st.car)exitCar(true); deadEl.hidden=false; }
    if(st.dead){ st.dead-=dt; if(st.dead<=0){ st.dead=0; deadEl.hidden=true; st.hp=100; st.wanted=0; teleport(s0.x-s0.tz*so,s0.z+s0.tx*so); } }
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
  document.getElementById('load').hidden=true;
  showMenu(true); updHud(); frame();
}
hot && hot.ready ? hot.ready(boot) : boot(hot && hot.data || {});
})();
