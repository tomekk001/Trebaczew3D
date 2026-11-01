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
    ROADS.push({t,n,ref,w:WIDTH[t]||4,pts,main:t==='primary'}); });
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
  const BPOLY=DATA.BP.map(([code,lv,name,d])=>({code,lv,name,pts:decRel(d)}));
  const PARCELS=DATA_PARC.split(';').map(s=>{ const p=dec(s.split(',').map(Number)); return {p,bb:bbox(p)}; });
  function roadNearF(x,z,m){ return ROADS.some(r=>r.t!=='track'&&roadDist(r,x,z)<r.w/2+m); }
  function sampleLine(pts,len,d){ const L=len[len.length-1]; d=clamp(d,0,L); let i=1; while(i<len.length-1&&len[i]<d)i++; const a=pts[i-1],b=pts[i],t=(d-len[i-1])/((len[i]-len[i-1])||1); const tx=b[0]-a[0],tz=b[1]-a[1],l=Math.hypot(tx,tz)||1; return {x:a[0]+tx*t,z:a[1]+tz*t,tx:tx/l,tz:tz/l}; }
  function roadDist(r,x,z){let m=1e9;for(let i=0;i<r.pts.length-1;i++){const d=segDist(x,z,r.pts[i][0],r.pts[i][1],r.pts[i+1][0],r.pts[i+1][1]);if(d<m)m=d;}return m;}
  function nearestRoad(x,z,filter){let best=null,bd=1e9,seg=0;ROADS.forEach(r=>{ if(filter&&!filter(r))return; for(let i=0;i<r.pts.length-1;i++){const d=segDist(x,z,r.pts[i][0],r.pts[i][1],r.pts[i+1][0],r.pts[i+1][1]);if(d<bd){bd=d;best=r;seg=i;}}});return {r:best,d:bd,seg};}
  const area=t=>AREAS.find(a=>a.t===t);
  const SCHOOL=area('am:school'), KINDER=area('am:kindergarten');
  const COURT=AREAS.find(a=>a.surf==='tartan'&&a.t==='lei:pitch'); COURT.pts=COURT.pts.map(p=>[p[0],p[1]+5.5]);
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
    if(!r.main&&r.t!=='track') r.pts.forEach(p=>{ const d=new THREE.Mesh(new THREE.CircleGeometry(r.w/2,18).rotateX(-Math.PI/2), jointMat); d.position.set(p[0],H(p[0],p[1])+y-0.01,p[1]); d.receiveShadow=true; scene.add(d); });
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

  /* ---------- budynki ---------- */
  const grid=new Map(); const CELL=24;
  function addSolid(o){ const r=o.r; for(let gx=Math.floor((o.x-r)/CELL);gx<=Math.floor((o.x+r)/CELL);gx++)for(let gz=Math.floor((o.z-r)/CELL);gz<=Math.floor((o.z+r)/CELL);gz++){const k=gx+','+gz;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(o);} }
  const near=(x,z)=>grid.get(Math.floor(x/CELL)+','+Math.floor(z/CELL))||[];
  function blocked(x,z,pr){ for(const o of near(x,z)){ if(o.poly){ if(inPoly(x,z,o.poly))return true; continue; } const dx=x-o.x,dz=z-o.z; const lx=dx*o.c+dz*o.s, lz=-dx*o.s+dz*o.c; if(Math.abs(lx)<o.hw+pr&&Math.abs(lz)<o.hd+pr)return true; } return false; }
  const WALLS=['#efe6d4','#e8dcc4','#f4eee2','#dccaa8','#ebd6b4','#d2c6b4','#f2e0bc','#ddd6cc','#cbb393','#e6d0aa','#d8dde2','#e9cba0','#f1e8d8','#c9d2c2','#e3c9b8'];
  const ROOFS=['#9a3d2a','#843424','#5a5f66','#3a3f45','#a64d33','#6e3a28','#4a4f57','#b05b3b','#2d3136','#86402f','#5a412f'];
  const inSchool=(x,z)=>inPoly(x,z,SCHOOL.pts), inKinder=(x,z)=>inPoly(x,z,KINDER.pts);
  const HALL_B=BLD.find(b=>b.code===5&&Math.max(b.w,b.d)>50);
  const houses=[];
  const CB={}; [['delik',-151,-341],['dworzec',-554,1454],['mineral',-580,1672],['swietl',-710,1630]].forEach(([k,x,z])=>{ let best=null,bd=1e9; BLD.forEach(b=>{ const d=Math.hypot(b.x-x,b.z-z); if(d<bd){bd=d;best=b;} }); if(best&&bd<8){ best.cust=k; CB[k]=best; } });
  BLD.forEach((b,bi)=>{ const ar=b.w*b.d, ratio=Math.max(b.w,b.d)/Math.min(b.w,b.d);
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
  function buildLewiatan(b){ const f=frontSide(b,ROAD_SZK); const L=f.len, D=f.dep, FZ=D/2; const g=new THREE.Group(); g.position.set(b.x,b.hc,b.z); g.rotation.y=f.rot; scene.add(g); b.front=f;
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
    const lewTex=tex(2048,160,(x,w,h)=>{ x.fillStyle='#f6c315'; x.fillRect(0,0,w,h); x.fillStyle='#e3a50f'; x.fillRect(0,h-12,w,12); x.textBaseline='middle'; x.textAlign='center'; x.fillStyle='#173e93'; x.font='italic 800 96px Barlow, Arial'; x.fillText('LEWIATAN',w*0.13,h/2-2); x.font='italic 800 112px Barlow, Arial'; x.fillText('LEWIATAN',w*0.5,h/2-2); x.fillStyle='#d23a2a'; x.font='800 96px Barlow, Arial'; x.fillText('MARKET',w*0.87,h/2-2); });
    const signM=new THREE.MeshLambertMaterial({map:lewTex,emissive:0x000000}); brandLights.push(signM);
    bx(g,bl,.18,1.7,bxC,2.75,GZ+.85,white); bx(g,bl,1.15,.35,bxC,2.75,GZ+1.6,new THREE.MeshLambertMaterial({color:0xf6c315}));
    pl(g,bl,1.15,bxC,2.75+.575,GZ+1.79,signM);
    // wejście, witryna z plakatami, drzwi, okna w brązowych ramach
    const ex0=-L/2+3.2; pl(g,2.6,2.4,ex0,1.2,GZ+.02,new THREE.MeshPhongMaterial({map:glassTex,shininess:110,specular:0x8899aa}));
    pl(g,1.3,2.0,ex0+2.2,1.2,GZ+.02,new THREE.MeshLambertMaterial({color:0xd9773a})); pl(g,1.1,2.2,-L/2+8.2,1.1,GZ+.02,brownF); pl(g,.9,2.0,-L/2+8.2,1.1,GZ+.03,glassD);
    for(let x=L*0.06+4.6;x<L/2-1;x+=3.3){ pl(g,1.45,1.15,x,1.9,D/2+.01,brownF); pl(g,1.25,.95,x,1.9,D/2+.02,glassD); }
    gables.forEach(([cx,wd],i)=>{ if(i===1){ [-1.6,1.6].forEach(o=>{ pl(g,1.45,1.15,cx+o,1.9,GZ+.01,brownF); pl(g,1.25,.95,cx+o,1.9,GZ+.02,glassD); }); } });
    for(let z=-D/2+2;z<D/2-1;z+=3.3){ [-1,1].forEach(sd=>{ const w1=pl(g,1.45,1.15,sd*(L/2+.01),1.9,z,brownF,sd*Math.PI/2); const w2=pl(g,1.25,.95,sd*(L/2+.02),1.9,z,glassD,sd*Math.PI/2); }); }
    // czerwone kosze, szafka, rowery
    const red=new THREE.MeshLambertMaterial({color:0xc62a24}); bx(g,.55,1.0,.55,ex0-2.2,0,GZ+.6,red); bx(g,.55,1.0,.55,ex0+3.3,0,GZ+.6,red);
    bx(g,.8,1.7,.5,ex0+4.6,0,GZ+.35,new THREE.MeshLambertMaterial({color:0xe6e6e2}));
    for(let k=0;k<4;k++){ const bk=bikeM(); bk.position.set(-L/2-1.5-k*.65,0,GZ+.6); bk.rotation.y=Math.PI/2+.25; g.add(bk); }
    g.traverse(o=>{ if(o.isMesh&&o.geometry.type!=='PlaneGeometry')o.castShadow=true; });
    // plac przed sklepem (kostka) + miejsca parkingowe
    const w=L2W(b.x,b.z,f.rot); const LD=clamp(roadDist(ROAD_SZK,f.x,f.z)-ROAD_SZK.w/2-2.8,5,13); const lot=[[-L/2-4,FZ],[L/2+2,FZ],[L/2+2,FZ+LD],[-L/2-4,FZ+LD]].map(([x,z])=>w(x,z)); drape(lot,lotPaver,0.12,2.2); LOTS.push(lot);
    [[L*0.06+2,FZ+Math.min(8,LD-2.6)],[L*0.06+8.5,FZ+Math.min(8,LD-2.6)],[L*0.06+13,FZ+Math.min(8,LD-2.6)]].forEach(([x,z])=>{ const q=w(x,z); LEW_SPOTS.push({x:q[0],z:q[1],h:Math.atan2(-f.nz,-f.nx)}); });
  }
  function buildZabka(b){ const f=frontSide(b,DK); const L=f.len, D=f.dep, FZ=D/2; const g=new THREE.Group(); g.position.set(b.x,b.hc,b.z); g.rotation.y=f.rot; scene.add(g); b.front=f;
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
  function locker(x,z,n,road){ const nr=nearestRoad(x,z,road?(r=>r===road):(r=>r.t!=='track')); const a=nr.r.pts[nr.seg],b=nr.r.pts[nr.seg+1]; const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz); const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(L*L),0,1); const px=a[0]+dx*t,pz=a[1]+dz*t;
    let nx=px-x,nz=pz-z; const nl=Math.hypot(nx,nz)||1; nx/=nl; nz/=nl; let y=H(x,z); if(blocked(x,z,1.2)){ x+=nx*3; z+=nz*3; y=H(x,z); }
    const g=new THREE.Group(); const yel=new THREE.MeshLambertMaterial({color:0xffcd00}), grey=new THREE.MeshLambertMaterial({color:0x3c4146}), dark=new THREE.MeshLambertMaterial({color:0x1e2226});
    const W=4.2,Hh=2.1,D=.65; const body=new THREE.Mesh(new THREE.BoxGeometry(W,Hh,D).translate(0,Hh/2+.12,0),yel); g.add(body);
    const plinth=new THREE.Mesh(new THREE.BoxGeometry(W+.2,.12,D+.2).translate(0,.06,0),grey); g.add(plinth);
    const roof=new THREE.Mesh(new THREE.BoxGeometry(W+.3,.1,D+.4).translate(0,Hh+.17,.08),grey); g.add(roof);
    // siatka skrytek
    const cols=7, rows=[.5,.35,.35,.5]; let yy=.25; rows.forEach((rh,ri)=>{ for(let c=0;c<cols;c++){ if(c===3&&ri<3)continue; const dd=new THREE.Mesh(new THREE.BoxGeometry(W/cols-.06,rh-.05,.02),grey); dd.position.set(-W/2+(c+.5)*W/cols,yy+rh/2+.12,D/2+.01); g.add(dd); } yy+=rh; });
    const screen=new THREE.Mesh(new THREE.BoxGeometry(.5,.38,.03),dark); screen.position.set(0,1.38,D/2+.02); const scr=new THREE.Mesh(new THREE.PlaneGeometry(.42,.3),new THREE.MeshBasicMaterial({color:0x6fb7e8})); scr.position.set(0,1.38,D/2+.04); g.add(screen,scr);
    const label=new THREE.Mesh(new THREE.PlaneGeometry(W*.9,.22),new THREE.MeshBasicMaterial({map:signTex('PACZKOMAT','#ffcd00','#2b2f33',512,48,'800 34px Barlow, Arial')})); label.position.set(0,Hh+.02,D/2+.02); g.add(label);
    g.position.set(x,y,z); g.rotation.y=Math.atan2(nx,nz); g.traverse(q=>{if(q.isMesh){q.castShadow=true;q.receiveShadow=true;}}); scene.add(g);
    addSolid({x,z,hw:W/2,hd:.45,c:Math.cos(-Math.atan2(nx,nz)),s:Math.sin(-Math.atan2(nx,nz)),r:2.3});
    // wg kolizji: obróć prostokąt zgodnie z orientacją
    LOCKERS.push({x,z,n}); }
  DATA.N.filter(n=>n[0]==='parcel_locker').forEach(n=>{ const d=Math.hypot(n[2]-B_LEW.x,n[3]-B_LEW.z), dz=Math.hypot(n[2]-B_ZAB.x,n[3]-B_ZAB.z); locker(n[2],n[3],d<40?'przy Lewiatanie':dz<40?'ul. Wyzwolenia, przy Żabce':'Trębaczew',dz<40?DK:null); });

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
    // ekrany akustyczne wzdłuż drogi po jednej stronie torów
    const wallT=tex(64,128,(c)=>{ c.fillStyle='#b9bdbf'; c.fillRect(0,0,64,128); for(let i=0;i<128;i+=10){ c.fillStyle='rgba(0,0,0,.12)'; c.fillRect(0,i,64,2); } c.fillStyle='rgba(0,0,0,.3)'; c.fillRect(0,0,3,128); });
    for(let k=0;k<12;k++){ const d=12+k*4; const px=x-nx*(hw+6)+dx*d, pz=z-nz*(hw+6)+dz*d; const p2=new THREE.Mesh(new THREE.BoxGeometry(4,3.2,.2).translate(0,1.6,0),new THREE.MeshLambertMaterial({map:wallT})); p2.position.set(px,H(px,pz),pz); p2.rotation.y=Math.atan2(-dz,dx); p2.castShadow=true; scene.add(p2); }
    addSolid({x:x-nx*(hw+6)+dx*34,z:z-nz*(hw+6)+dz*34,hw:24,hd:.2,c:dx,s:dz,r:25}); }
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

  if(CB.delik) buildDelikatesy(CB.delik); if(CB.dworzec) buildDworzec(CB.dworzec); if(CB.mineral) buildMineral(CB.mineral); if(CB.swietl) buildSwietlica(CB.swietl); buildParkParkowa();
  /* ---------- ogrodzenia wzdłuż granic działek (ULDK) ---------- */
  const KBB=bbox(KINDER.pts); const noFence=(x,z)=>(x>KBB[0]-4&&x<KBB[2]+7&&z>KBB[1]-4&&z<KBB[3]+4)||LOTS.some(l=>inPoly(x,z,l))||LOCKERS.some(l=>Math.hypot(l.x-x,l.z-z)<7)||[B_LEW,B_ZAB].some(b=>Math.hypot(b.x-x,b.z-z)<Math.hypot(b.w,b.d)/2+7)||[SCHOOL,KINDER,PARK,CEM,OSPA].some(a=>inPoly(x,z,a.pts))||[COURT,PITCH2].some(a=>{const c=centroid(a.pts);return Math.hypot(x-c[0],z-c[1])<35;});
  const roadNear=(x,z,m)=>ROADS.some(r=>r.t!=='track'&&roadDist(r,x,z)<r.w/2+m);
  { const front=[], side=[]; const seen=new Set();
    PARCELS.forEach(pc=>{ if(!pc.res)return; const p=pc.p;
      for(let i=0;i<p.length;i++){ const a=p[i], b=p[(i+1)%p.length]; const L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L<1.5||L>220)continue;
        const key=[Math.round(a[0]),Math.round(a[1]),Math.round(b[0]),Math.round(b[1])]; const k1=key.join(','), k2=[key[2],key[3],key[0],key[1]].join(','); if(seen.has(k1)||seen.has(k2))continue; seen.add(k1);
        const mx=(a[0]+b[0])/2, mz=(a[1]+b[1])/2; if(noFence(mx,mz))continue;
        const isFront=roadNear(mx,mz,4.5); const n=Math.max(1,Math.round(L/2.5)); const tx=(b[0]-a[0])/L, tz=(b[1]-a[1])/L; const ang=Math.atan2(tz,tx);
        for(let k=0;k<n;k++){ const t0=k/n, t1=(k+1)/n; const cx=a[0]+(b[0]-a[0])*(t0+t1)/2, cz=a[1]+(b[1]-a[1])*(t0+t1)/2;
          if(isFront&&n>3&&Math.abs((t0+t1)/2-.5)<1.6/L+.5/n)continue;           // brama
          if(roadNear(cx,cz,isFront?0.4:1.2))continue; if(blocked(cx,cz,.15)||noFence(cx,cz))continue;
          (isFront?front:side).push([cx,cz,ang,L/n]); } } });
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
      drape(stad(6,2.4,10),po(new THREE.MeshLambertMaterial({color:0xa9a69e}),4),0.26,2);
      drape(stad(5.85,2.2,10),po(new THREE.MeshLambertMaterial({color:0x5f8f3a,map:detailTex}),5),0.30,4);
      LOTS.push(stad(6,2.4,10));
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
  trees.forEach(t=>addSolid({x:t.x,z:t.z,hw:.35*t.s,hd:.35*t.s,c:1,s:0,r:.6}));

  /* ---------- lasy z OSM (poza wsią): lekkie drzewa instancjonowane ---------- */
  { const W=AREAS.filter(a=>a.t==='nat:wood'||a.t==='nat:scrub'); const F=[];
    W.forEach(a=>{ const bb=bbox(a.pts), scrub=a.t==='nat:scrub', step=scrub?14:7.5; const ar=Math.abs(polyArea(a.pts));
      for(let x=bb[0];x<bb[2];x+=step)for(let z=bb[1];z<bb[3];z+=step){ if(F.length>14000)return; const jx=x+R(-step*.4,step*.4), jz=z+R(-step*.4,step*.4); if(jx<X0||jx>X1||jz<Z0||jz>Z1)continue; if(!inPoly(jx,jz,a.pts))continue; if(scrub&&rnd()<.5)continue; if(roadNear(jx,jz,4)||blocked(jx,jz,1.5))continue; F.push([jx,jz,scrub?R(.5,.9):R(.85,1.35),scrub?0:rnd()<.72?1:0]); } });
    const pine=mergeParts([[new THREE.CylinderGeometry(.18,.28,9,5).translate(0,4.5,0),0x6b4a32],[new THREE.ConeGeometry(2.1,5,7).translate(0,9,0),0xffffff],[new THREE.ConeGeometry(1.6,4,7).translate(0,11.2,0),0xffffff],[new THREE.ConeGeometry(1.0,3,7).translate(0,13.2,0),0xffffff]]);
    const leaf=mergeParts([[new THREE.CylinderGeometry(.2,.3,4.5,5).translate(0,2.25,0),0x6b4a32],[new THREE.IcosahedronGeometry(2.8,0).scale(1,.85,1).translate(0,6.2,0),0xffffff],[new THREE.IcosahedronGeometry(2,0).translate(1.4,5.2,.8),0xffffff],[new THREE.IcosahedronGeometry(2,0).translate(-1.3,5.4,-.9),0xffffff]]);
    const mk=(geo,list,cols)=>{ const m=new THREE.InstancedMesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,map:leafTex}),Math.max(1,list.length)); list.forEach((f,i)=>{ dum.position.set(f[0],H(f[0],f[1])-.2,f[1]); dum.rotation.set(0,R(0,6.28),0); dum.scale.set(f[2],f[2]*R(.85,1.15),f[2]); dum.updateMatrix(); m.setMatrixAt(i,dum.matrix); m.setColorAt(i,col.set(pick(cols))); }); m.castShadow=true; m.receiveShadow=true; scene.add(m); return m; };
    window.__forest=[mk(pine,F.filter(f=>f[3]===1),['#2c4a26','#34552b','#2a4423','#3c5a2e']), mk(leaf,F.filter(f=>f[3]===0),['#4f6e32','#5c7a36','#6b7f3a','#7a8a3c','#8a8a3a'])];
    F.forEach(f=>{ if(f[3]===1||f[2]>.8) addSolid({x:f[0],z:f[1],hw:.35,hd:.35,c:1,s:0,r:.5}); }); }

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
    {n:'Kapliczka',p:[-297,169],c:'#7d8a96',h:5,ic:'✝'},
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
  { const kp=POIS.find(p=>p.n==='Kapliczka'); const nr=nearestRoad(kp.x,kp.z,r=>r.t!=='track'); const a=nr.r.pts[nr.seg],b=nr.r.pts[nr.seg+1]; const ang=Math.atan2(b[1]-a[1],b[0]-a[0]);
    const gK=new THREE.Group(); const base=new THREE.Mesh(new THREE.BoxGeometry(2.2,3.9,2.2).translate(0,1.45,0),new THREE.MeshLambertMaterial({color:0xf4f1ea,map:plasterTex})); const roof=new THREE.Mesh(hipGeo,new THREE.MeshLambertMaterial({color:0x2f4f7a})); roof.scale.set(2.8,1.6,2.8); roof.position.y=3.4;
    const gold=new THREE.MeshLambertMaterial({color:0xd8b54a}); const cv=new THREE.Mesh(new THREE.BoxGeometry(.12,1.2,.12),gold); cv.position.y=5.5; const chh=new THREE.Mesh(new THREE.BoxGeometry(.6,.12,.12),gold); chh.position.y=5.75;
    gK.add(base,roof,cv,chh); gK.position.set(kp.x,H(kp.x,kp.z),kp.z); gK.rotation.y=-ang; gK.traverse(o=>o.castShadow=true); scene.add(gK); addSolid({x:kp.x,z:kp.z,hw:1.2,hd:1.2,c:Math.cos(ang),s:Math.sin(ang),r:2}); }
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
  function park(x,z,h){ if(blocked(x,z,1.8))return false; if(parked.some(p=>Math.hypot(p.x-x,p.z-z)<7))return false; const c={g:makeCar(pick(CARCOL),rnd()<.12?'van':''),x,z,h,v:0,steer:0}; seatCar(c.g,x,z,h); scene.add(c.g); parked.push(c); return true; }
  houses.filter(h=>h.kind==='house'&&!h.isPart).forEach(h=>{ if(rnd()>.28||parked.length>150)return; const nr=nearestRoad(h.x,h.z,r=>r.t!=='track'); if(!nr.r||nr.d>40)return; const a=nr.r.pts[nr.seg],b=nr.r.pts[nr.seg+1]; const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz); const tx=dx/L,tz=dz/L; let nx=-tz,nz=tx; const t=clamp((h.x-a[0])*tx+(h.z-a[1])*tz,0,L); const px=a[0]+tx*t,pz=a[1]+tz*t; if((h.x-px)*nx+(h.z-pz)*nz<0){nx=-nx;nz=-nz;}
    const off=nr.r.w/2+(SIDEWALK.has(nr.r.n)?6:3.6); park(px+nx*off+tx*R(4,8),pz+nz*off+tz*R(4,8),Math.atan2(nz,nx)+Math.PI); });
  LEW_SPOTS.forEach(sp=>park(sp.x,sp.z,sp.h));
  AREAS.filter(a=>a.t==='am:parking').forEach(a=>{ if(a===PLAC)return; const m=mar(a.pts); for(let i=0;i<4;i++){ const x=m.cx+R(-m.w/3,m.w/3), z=m.cz+R(-m.d/3,m.d/3); if(inPoly(x,z,a.pts)) park(x,z,m.an+Math.PI/2); } });
  { const zr=ROADS.find(r=>r.n==='Zielona'); const s=sampleLine(zr.pts,zr.len,150); park(s.x+s.tz*2,s.z-s.tx*2,Math.atan2(s.tz,s.tx)); }
  const trainPath=RAILS.find(p=>p[0][0]===-945)||RAILS[0], trainLen=lineLen(trainPath);
  const train=[]; for(let i=0;i<6;i++){ const t=new THREE.Mesh(new THREE.BoxGeometry(21,3.6,3).translate(0,2.3,0),new THREE.MeshPhongMaterial({color:i===0?0x1f4f7a:0x4a4038,shininess:30})); const gT=new THREE.Group(); gT.add(t); gT.traverse(m=>m.castShadow=true); scene.add(gT); train.push(gT); }

  /* ---------- postacie ---------- */
  const player=makePerson(0x2b2f36,0x2c3e66,0x2a1d14,{female:false,style:'jacket',hairStyle:'short',skin:0xe6bb98,shoe:0xe8e8e4}); scene.add(player);
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
  const CODES={KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',KeyQ:'q',KeyE:'e',KeyF:'f',KeyC:'c',KeyN:'n',KeyM:'m',ArrowUp:'arrowup',ArrowDown:'arrowdown',ArrowLeft:'arrowleft',ArrowRight:'arrowright',KeyR:'r',ShiftLeft:'shift',ShiftRight:'shift',Space:' '};
  const keyOf=e=>CODES[e.code]||(e.key||'').toLowerCase();
  const releaseAll=()=>{ keys.clear(); resetJoy(); drag=null; };
  addEventListener('keydown',e=>{ if(e.target&&e.target.tagName==='INPUT')return; if(e.target&&e.target.tagName==='BUTTON'&&(e.key===' '||e.key==='Enter'))return;
    if(e.metaKey||e.ctrlKey||e.altKey){ keys.clear(); return; }            // skróty systemowe gubią zdarzenie keyup
    const k=keyOf(e); if(!keys.has(k)&&!e.repeat){ if(k==='c')cycleCam(); if(k==='n')toggleNight(); if(k==='m')toggleMap(); if(k==='f')enterExit(); if(k==='e')extInteract(); if(k==='r')extRadio(); }
    if(mapView.hidden&&!SHOP_OPEN) keys.add(k); if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault(); },true);
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
  canvas.addEventListener('pointermove',e=>{ if(e.pointerId===joy.id){updJoy(e);return;} if(drag&&drag.id===e.pointerId){ const dx=e.clientX-drag.x, dy=e.clientY-drag.y; drag.x=e.clientX; drag.y=e.clientY; st.yaw-=dx*0.006; st.pitch=clamp(st.pitch+dy*0.005,-0.9,1.35); st.lastDrag=tAll; } });
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
  function nearestParked(){ let b=null,bd=4.2; parked.forEach(c=>{ const d=Math.hypot(c.x-st.x,c.z-st.z); if(d<bd){bd=d;b=c;} }); return b; }
  function enterExit(){ if(st.car){ exitCar(false); return; } const c=nearestParked(); if(!c)return; st.car=c; c.v=0; player.visible=false; vehEl.hidden=false; vehEl.textContent=c.name||pick(['Fiat Seicento','Opel Astra','Skoda Fabia','VW Passat','Daewoo Lanos','Fiat 126p','Ford Mondeo']); onCarEnter(); }
  function exitCar(force){ const c=st.car; if(!c)return; const lx=c.x+Math.sin(c.h)*1.9, lz=c.z-Math.cos(c.h)*1.9; const rx=c.x-Math.sin(c.h)*1.9, rz=c.z+Math.cos(c.h)*1.9;
    if(!blocked(lx,lz,.4)){st.x=lx;st.z=lz;} else if(!blocked(rx,rz,.4)){st.x=rx;st.z=rz;} else if(!force) return; else {st.x=lx;st.z=lz;}
    c.v=0; st.car=null; player.visible=st.mode!==1; vehEl.hidden=true; }
  function carBlocked(x,z,h){ const fx=Math.cos(h),fz=Math.sin(h); for(const k of [-1.8,0,1.8]){ if(blocked(x+fx*k,z+fz*k,.95))return true; } if(parked.some(p=>p!==st.car&&Math.hypot(p.x-x,p.z-z)<3.4))return true; return false; }
  function driveCar(c,dt){ let thr=0,steer=0; if(keys.has('w')||keys.has('arrowup'))thr=1; if(keys.has('s')||keys.has('arrowdown'))thr=-1; if(keys.has('a')||keys.has('arrowleft'))steer=-1; if(keys.has('d')||keys.has('arrowright'))steer=1;
    if(joy.id!==null){ thr=clamp(-joy.y*1.4,-1,1); steer=clamp(joy.x*1.3,-1,1); }
    const hb=keys.has(' ');
    if(thr>0) c.v+= (c.v<0?16:(c.acc||8.5))*dt; else if(thr<0) c.v-= (c.v>0?16:5)*dt; else c.v*=1-dt*0.6;
    c.v-=(c.slope||0)*9.8*dt*0.6;                       // grawitacja na zboczach
    c.v=clamp(c.v,-8,c.maxV||34); if(hb) c.v*=1-dt*2.4; c.v*=1-dt*0.05;
    c.steer+=(steer*0.55-c.steer)*Math.min(1,dt*6); const sAng=c.steer*(1-Math.min(.65,Math.abs(c.v)/50));
    const turn=c.v/2.6*Math.tan(sAng)*(hb?1.5:1); const nh=c.h+turn*dt; const nx=c.x+Math.cos(nh)*c.v*dt, nz=c.z+Math.sin(nh)*c.v*dt;
    if(!carBlocked(nx,nz,nh)){ c.x=nx; c.z=nz; c.h=nh; } else { if(Math.abs(c.v)>9){ st.hp=Math.max(0,st.hp-Math.abs(c.v)*.4); shake=.5; } c.v=-c.v*0.25; }
    cars.forEach(t=>{ if(Math.hypot(t.x-c.x,t.z-c.z)<3.6){ c.v=-c.v*0.3; t.v=4; shake=.6; } });
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
  function drawBig(){ bctx.drawImage(mapBase,0,0); bctx.font='bold 16px Barlow, Arial'; MAP_PLACES.forEach(([n,x,z,big])=>{ const [px,py]=mp(x,z); bctx.font=(big?'700 34px':'600 20px')+' "Barlow Condensed", Arial'; bctx.textAlign='center'; bctx.lineWidth=4; bctx.strokeStyle='rgba(0,0,0,.7)'; bctx.strokeText(n,px,py); bctx.fillStyle=big?'#fff':'rgba(255,240,200,.9)'; bctx.fillText(n,px,py); }); bctx.font='bold 16px Barlow, Arial'; POIS.forEach(p=>{ const [x,y]=mp(p.x,p.z); bctx.beginPath(); bctx.arc(x,y,9,0,7); bctx.fillStyle=p.c; bctx.fill(); bctx.lineWidth=2.5; bctx.strokeStyle='#000'; bctx.stroke(); bctx.fillStyle='#fff'; bctx.textAlign='center'; bctx.textBaseline='middle'; bctx.fillText(p.ic,x,y+1); });
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
  function toggleMap(v){ keys.clear(); resetJoy(); mapView.hidden=v===undefined?!mapView.hidden:!v; if(!mapView.hidden)drawBig(); else canvas.focus(); }
  document.getElementById('bMap').addEventListener('click',()=>toggleMap()); document.getElementById('closeMap').addEventListener('click',()=>toggleMap(false));
  big.addEventListener('click',e=>{ const r=big.getBoundingClientRect(); teleport(MX0+(e.clientX-r.left)/r.width*(MX1-MX0), MZ0+(e.clientY-r.top)/r.height*(MZ1-MZ0)); toggleMap(false); });

  /* ---------- radar ---------- */
  const radar=document.getElementById('radar'), rx=radar.getContext('2d');
  radar.addEventListener('click',()=>toggleMap(true));
  function drawRadar(){ const W=radar.width,Hh=radar.height, cx=W/2, cy=Hh*0.62; const sc2=(st.car?1.6-Math.min(.6,Math.abs(st.car.v)/40):1.6)/MS;
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
  function updHud(){ const ln=locationName(); if(ln&&ln!==lastLoc){ lastLoc=ln; locMain.textContent=ln; locSub.textContent='Trębaczew'; locEl.classList.add('on'); locTimer=4; }
    const ab=nearAddr(); if(ab&&ab!==lastAddr){ locMain.textContent=(/^\d/.test(ab.addr)?'Trębaczew ':'ul. ')+ab.addr; locSub.textContent=ab.name&&ab.name!=='shelter'?ab.name:'Trębaczew'; locEl.classList.add('on'); locTimer=3; lastLoc=null; } lastAddr=ab;
    starsEl.innerHTML='<b>'+'★'.repeat(st.wanted)+'</b>'+'★'.repeat(5-st.wanted); starsEl.classList.toggle('flash',st.wanted>0);
    hpb.style.width=st.hp+'%';
    let hint=extHint()||''; if(!hint&&!st.car){ const c=nearestParked(); if(c) hint='Naciśnij <kbd>F</kbd>, aby wsiąść do auta'; else { const pk=LOCKERS.find(l=>Math.hypot(l.x-st.x,l.z-st.z)<4); if(pk) hint='Paczkomat · '+pk.n; } } hintEl.innerHTML=hint; hintEl.classList.toggle('on',!!hint);
    if(st.car) vehEl.textContent=vehEl.textContent.split(' · ')[0]+' · '+(vehEl.dataset.kmh||0)+' km/h';
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
  [[-60,95],[-62,52],[-150,-6]].forEach(([x,z])=>{ const s=nearestRoad(x,z,r=>r===DK); const a=DK.pts[s.seg],b=DK.pts[s.seg+1]; let dx=b[0]-a[0],dz=b[1]-a[1]; const l=Math.hypot(dx,dz); dx/=l; dz/=l; const t=clamp(((x-a[0])*dx+(z-a[1])*dz),0,l); const cx=a[0]+dx*t, cz=a[1]+dz*t; zebra(cx,cz,-dz,dx,DK.w,3.2);
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
    const w=ENV.weather, wl=w===1?.62:w===2?.75:w===3?.85:1;
    skyU.hor.value.copy(lerpHex(NIGHT.hor,DAY.hor,k)).lerp(cB.set(0xff8a4a),dusk*.55).lerp(cB.set(0x9aa3aa),w===1||w===2?.6:w===3?.5:0); skyU.zen.value.copy(lerpHex(NIGHT.zen,DAY.zen,k)).lerp(cB.set(0x7d868d),w?.55*k:0); skyU.night.value=1-k;
    scene.fog.color.copy(lerpHex(NIGHT.fog,DAY.fog,k)).lerp(cB.set(0xe08a5a),dusk*.35).lerp(cB.set(0xa9b0b4),w?.6*k:0);
    const fn=w===2?12:w===1?50:w===3?40:140, ff=w===2?170:w===1?380:w===3?320:820; scene.fog.near=fn; scene.fog.far=ff;
    hemi.intensity=(NIGHT.hemi+(DAY.hemi-NIGHT.hemi)*k)*wl; sun.intensity=(se>-0.05?Math.max(0,se)*1.5*(1-dusk*.3):0.14)*wl*(w===2?.5:1); sun.color.copy(lerpHex(0xff9a5a,DAY.sunC,clamp(se*3,0,1))); if(se<=-0.05) sun.color.set(0x9fb4ff);
    if(bloom) bloom.strength=NIGHT.bloom+(DAY.bloom-NIGHT.bloom)*k; if(grade){ grade.uniforms.exposure.value=NIGHT.exp+(DAY.exp-NIGHT.exp)*k; grade.uniforms.night.value=1-k; }
    const night=k<0.35; if(night!==ENV.lastNight){ ENV.lastNight=night; st.night=night; applyNight(); candleMat.emissive.set(0x000000); }
    flameIM.visible=k<0.75; flameMat.color.set(night?0xffc060:0xffb347);
    // cząsteczki
    PARTS.visible=w===1||w===3; if(PARTS.visible){ const sp=w===1?22:2.2; pMat.size=w===1?.05:.11; pMat.color.set(w===1?0x9fb2c4:0xffffff); pMat.opacity=w===1?.55:.9; const cx=camera.position.x, cy=camera.position.y, cz=camera.position.z;
      for(let i=0;i<PN;i++){ let y=pPos[i*3+1]-sp*dt; if(w===3){ pPos[i*3]+=Math.sin(tAll+i)*dt*.6; } if(y<cy-15){ y=cy+25; pPos[i*3]=cx+R(-60,60); pPos[i*3+2]=cz+R(-60,60); } if(Math.abs(pPos[i*3]-cx)>60) pPos[i*3]=cx+R(-60,60); if(Math.abs(pPos[i*3+2]-cz)>60) pPos[i*3+2]=cz+R(-60,60); pPos[i*3+1]=y; } pGeo.attributes.position.needsUpdate=true; }
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
      const rn=C.createBufferSource(); rn.buffer=nb; rn.loop=true; const rf=C.createBiquadFilter(); rf.type='lowpass'; rf.frequency.value=1400; AU.rain=C.createGain(); AU.rain.gain.value=0; rn.connect(rf); rf.connect(AU.rain); AU.rain.connect(AU.master); rn.start();
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
  function audioUpdate(dt){ if(!AU.ctx||!AU.on)return; const C=AU.ctx, now=C.currentTime;
    AU.rain.gain.value=ENV.weather===1?.12:0;
    const inCar=st.car&&st.car.kind!=='bike'; AU.engG.gain.value=inCar?.05+Math.min(.06,Math.abs(st.car.v)*.003):0; if(inCar) AU.eng.frequency.value=(st.car.kind==='tractor'?28:38)+Math.abs(st.car.v)*(st.car.kind==='moto'?6:3.2);
    const copNear=COPS.some(c=>Math.hypot(c.x-st.x,c.z-st.z)<120); AU.sirG.gain.value=copNear?.035:0; if(copNear) AU.siren.frequency.value=800+Math.sin(now*3)*350;
    const radioOn=st.car&&st.car.kind!=='bike'&&st.car.kind!=='tractor'&&AU.station<OFF; AU.radioG.gain.value+=((radioOn?.85:0)-AU.radioG.gain.value)*Math.min(1,dt*3);
    const s=STN[AU.station]; const sp=60/(s?s.bpm:100)/4;
    if(AU.next<now-.3) AU.next=now+.05; while(AU.next<now+.15){ if(radioOn) musicStep(AU.next,AU.step); AU.step++; AU.next+=sp; }
    // tło przyrody: w aucie przytłumione
    const E=natureEnv(), day=ENV.time>5&&ENV.time<20.5, muf=inCar?.25:1, gust=.6+.4*Math.sin(now*.23)*Math.sin(now*.071+1);
    if(AU.wind){ AU.wind.g.gain.value=(.035+(E.houses<3?.03:0)+(ENV.weather===2?.05:0))*gust*muf; AU.wind.fl.frequency.value=260+gust*260;
      AU.leaves.g.gain.value=(E.forest?.02:E.houses>4?.008:.004)*Math.max(0,gust-.4)*muf; AU.crick.g.gain.value=(!day&&ENV.season>0&&ENV.season<3&&ENV.weather===0?.012:0)*muf; }
    AU.amb-=dt; if(AU.amb<0){ AU.amb=R(1.2,4); if(ENV.weather===1||ENV.weather===2){ if(rnd()<.2) NAT.crow(); return; } const h=ENV.time, r=rnd();
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
    {n:'Lewiatan',get p(){ const f=B_LEW.front; return [f.x+f.nx*2,f.z+f.nz*2]; },items:[['Hot-dog',8,'hp',40],['Napój energetyczny',6,'boost',60],['Woda mineralna',3,'hp',10],['Znicz',7,'znicz',0]]},
    {n:'Żabka',get p(){ const f=B_ZAB.front; return [f.x+f.nx*2,f.z+f.nz*2]; },items:[['Kawa z ekspresu',9,'hp',20],['Zapiekanka',12,'hp',50],['Napój energetyczny',6,'boost',60],['Hot-dog',8,'hp',40]]},
    {n:'Euforia Trębaczew',p:[-151,-344],items:[['Pizza',32,'hp',100],['Burger',24,'hp',70],['Frytki',10,'hp',25]]},
    {n:'Apteka Magnolia',p:[-94,-195],items:[['Plastry',6,'hp',25],['Witaminy',15,'hp',45]]},
    {n:'Delikatesy Premium',p:[-145,-330],items:[['Kanapka',9,'hp',30],['Sok',5,'hp',10]]}];
  let SHOP_OPEN=null;
  function openShop(s){ SHOP_OPEN=s; keys.clear(); shopEl.hidden=false; shopEl.innerHTML=`<h2>${s.n}</h2><p class="sub">Kasa · masz ${fmt(st.money)}</p>`+s.items.map((it,i)=>`<button data-i="${i}"><kbd>${i+1}</kbd> ${it[0]}<span>${it[1]} zł</span></button>`).join('')+`<button data-i="x" class="close">Wyjdź <kbd>E</kbd></button>`;
    shopEl.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ const i=b.dataset.i; if(i==='x')closeShop(); else buy(+i); })); }
  function closeShop(){ SHOP_OPEN=null; shopEl.hidden=true; canvas.focus(); }
  function buy(i){ const it=SHOP_OPEN&&SHOP_OPEN.items[i]; if(!it)return; if(st.money<it[1]){ toast('Za mało pieniędzy',2); return; } st.money-=it[1]; shownMoney=st.money; moneyEl.textContent=fmt(st.money); if(AU.ctx&&AU.on)sfx.cash();
    if(it[2]==='hp') st.hp=Math.min(100,st.hp+it[3]); if(it[2]==='boost') st.boost=it[3]; toast(`Kupiono: ${it[0]}`,2); saveGame(); openShop(SHOP_OPEN); }
  addEventListener('keydown',e=>{ if(!SHOP_OPEN)return; const n=parseInt(e.key,10); if(n>=1&&n<=9){ buy(n-1); e.preventDefault(); } if(e.key==='Escape'){ closeShop(); } },true);

  /* ---------- misje ---------- */
  const resHouses=houses.filter(h=>h.kind==='house'&&!h.isPart);
  const housesBy=(f)=>resHouses.filter(f);
  const MISSIONS=[
    {id:'paczka',n:'Paczka z paczkomatu',start:()=>{ const l=LOCKERS[0]; return [l.x,l.z]; },desc:'Odbierz paczkę i dostarcz ją pod wskazany dom.',time:150,reward:300,
      plan(){ const s=this.start(); const h=pick(housesBy(h=>{ const d=Math.hypot(h.x-s[0],h.z-s[1]); return d>150&&d<420; })); return [{p:frontOf(h),t:'Dostarcz paczkę pod dom'}]; }},
    {id:'zakupy',n:'Zakupy dla sąsiadki',start:()=>frontOf(resHouses.reduce((a,h)=>Math.hypot(h.x+150,h.z-230)<Math.hypot(a.x+150,a.z-230)?h:a)),desc:'Pani Halinka prosi o chleb z Lewiatana.',time:200,reward:250,
      plan(){ const f=B_LEW.front; return [{p:[f.x+f.nx*3,f.z+f.nz*3],t:'Kup chleb w Lewiatanie'},{p:this.start(),t:'Zanieś zakupy sąsiadce'}]; }},
    {id:'wyscig',n:'Wyścig dookoła wsi',start:()=>[orlik.m.cx+8,orlik.m.cz-14],desc:'Weź auto albo motor i przejedź trasę przed czasem.',time:150,reward:1000,needCar:true,
      plan(){ return [['Zielona',.95],['Traktorowa',.5],['Spacerowa',.9],['Wyzwolenia',.62],['Szkolna',.15],['Sikorskiego',.4],['Szkolna',.55]].map(([n,f])=>({p:n==='Wyzwolenia'?[-342,204]:roadPt(n,f,0),t:'Punkt kontrolny'})).filter(c=>c.p); }},
    {id:'pizza',n:'Pizza z Euforii',start:()=>[-151,-340],desc:'Rozwieź trzy pizze, zanim wystygną.',time:210,reward:600,
      plan(){ const s=this.start(); return [0,1,2].map(i=>({p:frontOf(pick(housesBy(h=>{ const d=Math.hypot(h.x-s[0],h.z-s[1]); return d>100+i*60&&d<500; }))),t:`Pizza ${i+1} z 3`})); }},
    {id:'szkola',n:'Do szkoły na czas',start:()=>frontOf(resHouses.reduce((a,h)=>Math.hypot(h.x+520,h.z-300)<Math.hypot(a.x+520,a.z-300)?h:a)),desc:'Odwieź Kubę do szkoły, zanim zadzwoni dzwonek.',time:75,reward:400,
      plan(){ const sc=centroid(BPOLY.find(b=>b.code===5&&b!==CHURCH).pts); const nr=nearestRoad(sc[0],sc[1],r=>r.n==='Szkolna'||r.n==='Zagrodowa'); const a=nr.r.pts[nr.seg]; return [{p:frontOf({x:sc[0],z:sc[1]}),t:'Dowieź Kubę do szkoły'}]; }},
    {id:'znicze',n:'Znicze na cmentarz',start:()=>{ const f=B_LEW.front; return [f.x+f.nx*4+f.nz*6,f.z+f.nz*4-f.nx*6]; },desc:'Jutro 1 listopada. Zanieś znicze na grób dziadków.',time:240,reward:200,
      plan(){ const c=centroid(CEM.pts); return [{p:c,t:'Zapal znicze na cmentarzu'},{p:this.start(),t:'Wróć pod Lewiatana'}]; }} ];
  const MARK_M=new THREE.MeshBasicMaterial({color:0xffd23a,transparent:true,opacity:.32,depthWrite:false}), CP_M=new THREE.MeshBasicMaterial({color:0xff3a3a,transparent:true,opacity:.35,depthWrite:false});
  const startMarks=MISSIONS.map(m=>{ const p=m.start(); const g=new THREE.Group(); const c=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,3,24,1,true),MARK_M); c.position.y=1.5; const r=new THREE.Mesh(new THREE.RingGeometry(1.0,1.4,32).rotateX(-Math.PI/2),MARK_M); r.position.y=.12; g.add(c,r); g.position.set(p[0],H(p[0],p[1]),p[1]); scene.add(g); m.mk=g; m.sp=p; return g; });
  const cpMark=new THREE.Group(); { const c=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,40,28,1,true),CP_M); c.position.y=20; const r=new THREE.Mesh(new THREE.RingGeometry(2.2,2.9,32).rotateX(-Math.PI/2),CP_M); r.position.y=.15; cpMark.add(c,r); cpMark.visible=false; scene.add(cpMark); }
  let ACTIVE=null; const DONE=new Set();
  function startMission(m){ if(m.needCar&&!(st.car&&st.car.kind!=='bike')){ toast('Do tej misji potrzebujesz auta albo motoru',3); return; } ACTIVE={m,steps:m.plan(),i:0,t:m.time}; MISSIONS.forEach(q=>q.mk.visible=false); toast(`<b>${m.n}</b><br>${m.desc}`,4); setCP(); }
  function setCP(){ const s=ACTIVE.steps[ACTIVE.i]; cpMark.position.set(s.p[0],H(s.p[0],s.p[1]),s.p[1]); cpMark.visible=true; }
  function endMission(ok){ const m=ACTIVE.m; cpMark.visible=false; ACTIVE=null; MISSIONS.forEach(q=>q.mk.visible=true); if(ok){ addMoney(m.reward); DONE.add(m.id); toast(`<b>MISJA ZALICZONA</b><br>+${m.reward} zł`,4); if(AU.ctx&&AU.on)sfx.win(); saveGame(); } else toast('<b>MISJA NIEUDANA</b><br>Skończył się czas',3.5); }
  function missionUpdate(dt){ MISSIONS.forEach((m,i)=>{ if(m.mk.visible){ m.mk.children[0].material.opacity=.25+Math.sin(tAll*3+i)*.08; } });
    if(!ACTIVE){ missionEl.hidden=true; return; } ACTIVE.t-=dt; const s=ACTIVE.steps[ACTIVE.i]; const d=Math.hypot(s.p[0]-st.x,s.p[1]-st.z);
    missionEl.hidden=false; missionEl.innerHTML=`<b>${ACTIVE.m.n}</b><span>${s.t} · ${Math.round(d)} m</span><em>${Math.max(0,Math.ceil(ACTIVE.t))} s</em>`;
    if(d<(st.car?6:3.5)){ ACTIVE.i++; if(AU.ctx&&AU.on)sfx.cash(); if(ACTIVE.i>=ACTIVE.steps.length) endMission(true); else { setCP(); toast(ACTIVE.steps[ACTIVE.i].t,2); } }
    else if(ACTIVE.t<=0) endMission(false); }
  function extBlips(rx,px,py,sc){ const dot=(x,z,c,r)=>{ const [a,b]=mp(x,z); rx.beginPath(); rx.arc(a-px,b-py,r/sc,0,7); rx.fillStyle=c; rx.fill(); rx.lineWidth=2/sc; rx.strokeStyle='#000'; rx.stroke(); };
    if(ACTIVE){ const s=ACTIVE.steps[ACTIVE.i]; dot(s.p[0],s.p[1],'#ff3a3a',8); } else MISSIONS.forEach(m=>dot(m.sp[0],m.sp[1],'#ffd23a',6)); COPS.forEach(c=>dot(c.x,c.z,Math.floor(tAll*4)%2?'#2040ff':'#ff2020',5)); mpBlips(dot); }

  /* ---------- interakcja (E) i podpowiedzi ---------- */
  function nearShop(){ return SHOPS.find(s=>{ const p=s.p; return Math.hypot(p[0]-st.x,p[1]-st.z)<4.5; }); }
  function nearMission(){ return !ACTIVE&&MISSIONS.find(m=>Math.hypot(m.sp[0]-st.x,m.sp[1]-st.z)<(st.car?5:3)); }
  function extInteract(){ if(SHOP_OPEN){ closeShop(); return; } const m=nearMission(); if(m){ startMission(m); return; } if(!st.car){ const s=nearShop(); if(s){ openShop(s); return; } } }
  function extHint(){ if(SHOP_OPEN)return ''; const m=nearMission(); if(m) return `<b>${m.n}</b> · <kbd>E</kbd> rozpocznij misję (nagroda ${m.reward} zł)`; if(!st.car){ const s=nearShop(); if(s) return `Naciśnij <kbd>E</kbd>, aby zrobić zakupy: ${s.n}`; } return ''; }

  /* ---------- zapis postępu ---------- */
  function saveGame(){ try{ localStorage.setItem('trebaczew-gra',JSON.stringify({money:st.money,done:[...DONE],season:ENV.season,time:ENV.time,weather:ENV.weather})); }catch(e){} }
  try{ const sv=JSON.parse(localStorage.getItem('trebaczew-gra')||'null'); if(sv){ if(saved.money===undefined){ st.money=sv.money||0; shownMoney=st.money; } (sv.done||[]).forEach(d=>DONE.add(d)); if(sv.season!==undefined)ENV.season=sv.season; if(sv.time!==undefined)ENV.time=sv.time; } }catch(e){}
  let saveT=10;

  /* ---------- przyciski ---------- */
  function updButtons(){ $('bWeather').textContent='Pogoda: '+WEATHERS[ENV.weather]; $('bSeason').textContent='Pora roku: '+SEASONS[ENV.season]; $('bSound').textContent=AU.on?'Dźwięk: wł.':'Dźwięk: wył.'; $('bQual').textContent='Grafika: '+(ENV.quality?'wysoka':'niska'); }
  $('bWeather').addEventListener('click',()=>{ ENV.weather=(ENV.weather+1)%4; ENV.wTimer=400; updButtons(); });
  $('bSeason').addEventListener('click',()=>{ ENV.season=(ENV.season+1)%4; applySeason(); saveGame(); });
  $('bSound').addEventListener('click',audioStart);
  $('bQual').addEventListener('click',()=>{ ENV.quality=1-ENV.quality; renderer.shadowMap.enabled=!!ENV.quality; sun.castShadow=!!ENV.quality; if(bloom)bloom.enabled=!!ENV.quality; pr=ENV.quality?DPR:Math.min(DPR,.75); renderer.setPixelRatio(pr); resize(); scene.traverse(o=>{ if(o.material&&!Array.isArray(o.material)) o.material.needsUpdate=true; }); updButtons(); });
  $('bAct').addEventListener('click',()=>extInteract()); $('bRadio').addEventListener('click',()=>{ if(!AU.ctx)audioStart(); extRadio(); });
  applySeason(); updButtons();

  window.__treb={get MP(){return MP;},get AU(){return AU;},get CB(){return CB;},get TIR(){return TIR_LOT;},startMission:m=>startMission(MISSIONS.find(q=>q.id===m)),st,setWanted,openShop:i=>openShop(SHOPS[i]),buy,ENV,COPS,parked,enterExit,MISSIONS,get active(){return ACTIVE;}};
  /* ---------- aktualizacja co klatkę ---------- */
  function extUpdate(dt){
    envUpdate(dt); audioUpdate(dt); missionUpdate(dt);
    if(toastT>0){ toastT-=dt; if(toastT<=0) toastEl.classList.remove('on'); }
    if(st.boost>0){ st.boost-=dt; if(!st.car&&(keys.has('shift')||st.run)&&(st.vx||st.vz)){ st.x+=st.vx*dt*.3; st.z+=st.vz*dt*.3; } }
    if(SHOP_OPEN){ keys.clear(); const p=SHOP_OPEN.p; if(Math.hypot(p[0]-st.x,p[1]-st.z)>6) closeShop(); }
    // rower i motocykl: postać widoczna na siodełku
    if(st.car&&(st.car.kind==='bike'||st.car.kind==='moto')){ player.visible=st.mode!==1; player.position.set(st.car.x,H(st.car.x,st.car.z)+.35,st.car.z); player.rotation.y=-st.car.h+Math.PI/2; animPerson(player,tAll*Math.abs(st.car.v)*.8,st.car.kind==='bike'?.5:0); }
    // dzwony kościelne i znicze
    const hr=Math.floor(ENV.time); if((hr===12||hr===18)&&lastBell!==hr&&AU.ctx&&AU.on){ lastBell=hr; const cc=centroid(CHURCH.pts); if(Math.hypot(cc[0]-st.x,cc[1]-st.z)<500) sfx.bell(hr===12?6:3); } if(hr!==12&&hr!==18) lastBell=-1;
    // ciągniki na polach
    TRACTORS.forEach(t=>{ t.d+=t.dir*t.v*dt; if(t.d>t.r.L-2||t.d<2) t.dir*=-1; const s=sampleLine(t.r.pts,t.r.len,t.d); seatCar(t.g,s.x,s.z,Math.atan2(s.tz*t.dir,s.tx*t.dir)); t.g.userData.wheels.forEach(w=>w.rotation.z-=t.v*dt*t.dir); t.x=s.x; t.z=s.z;
      if(!st.car&&Math.hypot(s.x-st.x,s.z-st.z)<2){ const dx=st.x-s.x,dz=st.z-s.z,l=Math.hypot(dx,dz)||1; st.vx=dx/l*6; st.vz=dz/l*6; } });
    // autobus PKS
    if(BUS.wait>0){ BUS.wait-=dt; BUS.v=0; } else { BUS.v=Math.min(14,BUS.v+dt*3); const nd=BUS.d+BUS.v*dt; const stop=BUS_STOPS.find(sd=>BUS.d<sd&&nd>=sd); BUS.d=nd; if(stop!==undefined){ BUS.wait=7; } if(BUS.d>DK.L){ BUS.d=0; } }
    { const s=sampleLine(DK.pts,DK.len,BUS.d); BUS.x=s.x+s.tz*2.4; BUS.z=s.z-s.tx*2.4; seatCar(BUS.g,BUS.x,BUS.z,Math.atan2(s.tz,s.tx),.1); BUS.g.userData.wheels.forEach(w=>w.rotation.z-=BUS.v*dt/.5);
      if(BUS.g.visible&&Math.hypot(BUS.x-st.x,BUS.z-st.z)<4){ if(st.car){ st.car.v=-st.car.v*.3; shake=.5; } else { const dx=st.x-BUS.x,dz=st.z-BUS.z,l=Math.hypot(dx,dz)||1; st.vx=dx/l*8; st.vz=dz/l*8; st.hp=Math.max(0,st.hp-dt*40); } } }
    // pociąg towarowy (wolniejszy, w przeciwnej fazie)
    { const FL=freightLen[freightLen.length-1], cyc=FL+3000, h0=((tAll+90)*17)%cyc; FREIGHT.forEach((w,i)=>{ const d=FL-(h0-i*14); if(d<0||d>FL){ w.visible=false; return; } w.visible=true; const s=sampleLine(freightPath,freightLen,d); w.position.set(s.x,H(s.x,s.z)+.22,s.z); w.rotation.y=-Math.atan2(s.tz,s.tx); });
      const lead=FREIGHT[0]; if(lead.visible&&Math.hypot(lead.position.x-st.x,lead.position.z-st.z)<350&&tAll-lastHorn>25&&AU.ctx&&AU.on){ lastHorn=tAll; sfx.horn(); } }
    // policja
    if(st.car&&!['bike'].includes(st.car.kind)){ cars.forEach(t=>{ if(Math.hypot(t.x-st.car.x,t.z-st.car.z)<3.8&&tAll-trafficHitT>4){ trafficHitT=tAll; if(rnd()<.5) setWanted(Math.max(st.wanted,1)); } }); }
    const want=Math.min(3,st.wanted); if(COPS.length<want&&rnd()<dt*2) spawnCop();
    for(let i=COPS.length-1;i>=0;i--){ const c=COPS[i]; const tx=st.car?st.car.x:st.x, tz=st.car?st.car.z:st.z; const dx=tx-c.x,dz=tz-c.z, d=Math.hypot(dx,dz);
      if(st.wanted===0){ c.far+=dt; c.v*=1-dt; if(c.far>4||d>200){ scene.remove(c.g); COPS.splice(i,1); continue; } }
      else { const want=Math.atan2(dz,dx); let dh=want-c.h; dh=Math.atan2(Math.sin(dh),Math.cos(dh)); c.h+=clamp(dh,-1.6*dt,1.6*dt); const vmax=Math.min(26,15+st.wanted*3)*(d<10?.4:1); c.v+=(vmax-c.v)*dt*.8;
        const nx=c.x+Math.cos(c.h)*c.v*dt, nz=c.z+Math.sin(c.h)*c.v*dt; if(blocked(nx,nz,1.1)){ c.h+=1.4*dt*(c.turn||(c.turn=rnd()<.5?1:-1)); c.v*=.6; } else { c.x=nx; c.z=nz; c.turn=0; }
        if(d<80) st.wantedT=0;
        if(st.car&&d<3.4&&tAll-c.hitT>1.2){ c.hitT=tAll; st.car.v*=-.3; c.v=-4; st.hp=Math.max(0,st.hp-8); shake=.7; }
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
  function renderList(){ if(!MP.on)return; const n=MP.remote.size+1; mpCount.textContent=n===1?'Tylko Ty w Trębaczewie':`${n} graczy w Trębaczewie`; mpList.textContent='';
    const add=(name,col,me)=>{ const li=document.createElement('div'); li.className='mpi'; const d=document.createElement('i'); d.style.background=col; li.appendChild(d); const s=document.createElement('span'); s.textContent=name+(me?' (Ty)':''); li.appendChild(s); mpList.appendChild(li); };
    add(myNick||'Ty',MYCOL,true); [...MP.remote.values()].forEach(r=>add(r.name||'Gracz',r.col,false)); }
  function addChat(name,col,text){ const row=document.createElement('div'); row.className='cl'; const b=document.createElement('b'); b.textContent=name+': '; b.style.color=col; row.appendChild(b); row.appendChild(document.createTextNode(text)); chatLog.appendChild(row); while(chatLog.children.length>6) chatLog.removeChild(chatLog.firstChild); MP.chat.push({row,t:12}); }
  function bubble(r,text){ if(r.bubble){ scene.remove(r.bubble); r.bubble.material.map.dispose(); } r.bubble=sprite(tagTex(text,'#fff',true),4.2,1.3); scene.add(r.bubble); r.bubT=6; }
  const meR={body:player,bubble:null,bubT:0};
  function myPresence(){ const c=st.car; const kind=c?(c.kind||'car'):null; let vc=null; if(c&&(!c.kind||c.kind==='van')){ const m=c.g.children[0]&&c.g.children[0].material; if(m&&m.color) vc='#'+m.color.getHexString(); }
    return {x:+(c?c.x:st.x).toFixed(2),z:+(c?c.z:st.z).toFixed(2),h:+(c?c.h:st.face).toFixed(3),v:kind,vc,s:+(c?Math.abs(c.v):Math.hypot(st.vx||0,st.vz||0)).toFixed(1),col:MYCOL,nick:myNick||null}; }
  async function mpInit(){ try{ if(!window.claude||!window.claude.use)return; const room=await window.claude.use('room'); if(!room)return; MP.room=room; try{ MP.user=await window.claude.use('user'); }catch(e){}
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
  function mpUpdate(dt){ crossUpdate();
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
  mpInit();

  /* ---------- pętla ---------- */
  function resize(){ const w=innerWidth,h=innerHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); if(composer){ composer.setPixelRatio&&composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w,h); if(fxaa){ const pr2=renderer.getPixelRatio(); fxaa.material.uniforms.resolution.value.set(1/(w*pr2),1/(h*pr2)); } } }
  addEventListener('resize',resize); resize();
  const clock=new THREE.Clock(); const fwd=new THREE.Vector3();
  function animPerson(p,walk,amt){ const u=p.userData, sn=Math.sin(walk), cs=Math.cos(walk); u.lL.rotation.x=sn*.55*amt; u.lR.rotation.x=-sn*.55*amt; u.aL.rotation.x=-sn*.45*amt; u.aR.rotation.x=sn*.45*amt;
    if(u.kL){ u.kL.rotation.x=amt*(.12+.8*Math.max(0,-cs)); u.kR.rotation.x=amt*(.12+.8*Math.max(0,cs)); u.eL.rotation.x=-(.12+.3*amt+Math.max(0,sn)*.25*amt); u.eR.rotation.x=-(.12+.3*amt+Math.max(0,-sn)*.25*amt); } }
  let fpsAcc=0,fpsN=0,pr=DPR;
  function frame(){ const rawDt=clock.getDelta(); const dt=Math.min(rawDt,0.05); tAll+=dt;
    fpsAcc+=rawDt; fpsN++; if(fpsAcc>2){ const fps=fpsN/fpsAcc; fpsAcc=0; fpsN=0; const npr=fps<28?Math.max(0.6,pr-0.2):fps>55?Math.min(DPR,pr+0.1):pr; if(npr!==pr){ pr=npr; renderer.setPixelRatio(pr); resize(); } }
    if(!mapView.hidden){ requestAnimationFrame(frame); return; }
    if(document.hasFocus&&!document.hasFocus()&&keys.size) keys.clear();
    if(keys.has('q'))st.yaw+=dt*1.8;
    let moving=false, mag=0;
    if(st.car){ driveCar(st.car,dt); moving=Math.abs(st.car.v)>.5;
      if(tAll-st.lastDrag>1.2){ const target=Math.atan2(-Math.cos(st.car.h),-Math.sin(st.car.h)); let d=target-st.yaw; d=Math.atan2(Math.sin(d),Math.cos(d)); st.yaw+=d*Math.min(1,dt*3); } }
    else { let fw=0,sd=0; if(keys.has('w')||keys.has('arrowup'))fw+=1; if(keys.has('s')||keys.has('arrowdown'))fw-=1;
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
        const nx=st.x+st.vx*dt, nz=st.z+st.vz*dt; const pb=(x,z)=>blocked(x,z,.35)||parked.some(c=>{ const lx=(x-c.x)*Math.cos(c.h)+(z-c.z)*Math.sin(c.h), lz=-(x-c.x)*Math.sin(c.h)+(z-c.z)*Math.cos(c.h); return Math.abs(lx)<2.5&&Math.abs(lz)<1.2; });
        if(!pb(nx,nz)){st.x=nx;st.z=nz;} else if(!pb(nx,st.z)) st.x=nx; else if(!pb(st.x,nz)) st.z=nz;
        const tf=Math.atan2(dx,dz); let df=tf-st.face; df=Math.atan2(Math.sin(df),Math.cos(df)); st.face+=df*Math.min(1,dt*12); st.walk+=dt*vel*1.6; }
      st.x=clamp(st.x,X0+30,X1-30); st.z=clamp(st.z,Z0+30,Z1-30);
      player.position.set(st.x,H(st.x,st.z)+0.1+(moving?Math.abs(Math.cos(st.walk))*0.05:0),st.z); player.rotation.y=st.face; animPerson(player,st.walk,moving?mag:0); player.visible=st.mode!==1; }
    const fx=st.car?st.car.x:st.x, fz=st.car?st.car.z:st.z, fy=H(fx,fz); const sh=shake>0?(Math.random()-.5)*shake:0; shake=Math.max(0,shake-dt);
    st.distS=(st.distS||st.dist)+(st.dist-(st.distS||st.dist))*Math.min(1,dt*5); st.carD=(st.carD||0)+((st.car?3:0)-(st.carD||0))*Math.min(1,dt*2.5);
    if(st.mode===0){ const d=Math.max(st.car?8.5:0,st.distS+st.carD), p=Math.max(0.05,st.pitch)+(st.car?.05:0), ty=fy+(st.car?1.4:1.55); let cx=fx+Math.sin(st.yaw)*Math.cos(p)*d+sh, cz=fz+Math.cos(st.yaw)*Math.cos(p)*d; let cy=ty+.4+Math.sin(p)*d; { const steps=12; let hitT=1; if(st.camT===undefined)st.camT=1; for(let i=1;i<=steps;i++){ const t=i/steps, qx=fx+(cx-fx)*t, qz=fz+(cz-fz)*t; if(blocked(qx,qz,.3)){ hitT=Math.max(.18,(i-1)/steps); break; } } const k=hitT<st.camT?4:1.6; st.camT+=(hitT-st.camT)*Math.min(1,dt*k); const tt=st.camT; cx=fx+(cx-fx)*tt; cz=fz+(cz-fz)*tt; cy=ty+.4+(cy-ty-.4)*tt; } cy=Math.max(cy,H(cx,cz)+0.7); camera.position.set(cx,cy,cz); camera.lookAt(fx,ty+(st.car?.6:0),fz); camera.fov+=((st.car?60+Math.min(14,Math.abs(st.car.v)*.5):60)-camera.fov)*Math.min(1,dt*2); camera.updateProjectionMatrix(); }
    else if(st.mode===1){ const hy=fy+(st.car?1.25:1.72); camera.position.set(fx,hy,fz); const p=clamp((st.pitch-0.22)*-1.4,-1.2,1.2); fwd.set(-Math.sin(st.yaw)*Math.cos(p),Math.sin(p),-Math.cos(st.yaw)*Math.cos(p)); camera.lookAt(fx+fwd.x,hy+fwd.y,fz+fwd.z); }
    else { const d=Math.max(80,st.distS*7); const p=clamp(st.pitch+0.65,0.6,1.45); camera.position.set(fx+Math.sin(st.yaw)*Math.cos(p)*d, fy+Math.sin(p)*d, fz+Math.cos(st.yaw)*Math.cos(p)*d); camera.lookAt(fx,fy,fz); }
    sky.position.copy(camera.position);
    sun.position.set(fx+SUNDIR.x*220,fy+SUNDIR.y*220,fz+SUNDIR.z*220); sun.target.position.set(fx,fy,fz); playerLight.position.set(fx,fy+7,fz);
    if(st.car&&st.night){ const c=st.car; carLight.intensity=2.2; carLight.position.set(c.x+Math.cos(c.h)*2.3,fy+1,c.z+Math.sin(c.h)*2.3); carLight.target.position.set(c.x+Math.cos(c.h)*20,H(c.x+Math.cos(c.h)*20,c.z+Math.sin(c.h)*20),c.z+Math.sin(c.h)*20); } else carLight.intensity=0;
    if(st.night){ const ls=lamps.map(l=>[l,(l.x-fx)**2+(l.z-fz)**2]).sort((a,b)=>a[1]-b[1]); lampPool.forEach((pl,i)=>{ const l=ls[i]&&ls[i][0]; if(l){pl.position.set(l.x,l.y+7.6,l.z); pl.intensity=1.1;} }); } else lampPool.forEach(pl=>pl.intensity=0);
    cars.forEach(c=>{ c.v+=((c.v0||(c.v0=c.v))-c.v)*dt*.3; c.d+=c.dir*c.v*dt; if(c.d>DK.L)c.d-=DK.L; if(c.d<0)c.d+=DK.L; const s=sampleLine(DK.pts,DK.len,c.d); const o=2.2*c.dir; c.x=s.x-s.tz*o; c.z=s.z+s.tx*o; seatCar(c.g,c.x,c.z,Math.atan2(s.tz,s.tx)+(c.dir<0?Math.PI:0),0.1); c.g.userData.wheels.forEach(w=>w.rotation.z-=c.v*dt/.36);
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
  updHud(); frame();
}
hot && hot.ready ? hot.ready(boot) : boot(hot && hot.data || {});
})();
