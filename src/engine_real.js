/* ============================================================================
 * TR3D RealEngine — Photorealistic WebGL Rendering & Vehicle Physics Engine
 * Inspired by RAGE (GTA V / VI): Physical Sky (Rayleigh/Mie + Volumetric Clouds),
 * HDR HalfFloat Pipeline, GTAO + Screen-Space Contact Shadows, God Rays,
 * AgX/ACES Filmic + CAS Sharpen, Wet Asphalt Puddles & Rain Ripples,
 * 3D Interior Parallax Windows, Clearcoat Metallic Car Paint, 3D Suspension &
 * Drift Physics with Skid Marks & Tire Smoke, Subsurface Skin & Fabric Humans,
 * Foliage Translucency, and Instanced 3D Wind Grass.
 * ============================================================================ */
(function(){
  const RE = window.REAL_ENGINE = {
    version: '2.0-GTA',
    active: false,
    quality: 3, // 0=Low, 1=Med, 2=High, 3=Ultra Realism
    wetness: 0,
    rainIntensity: 0,
    sunScreen: new THREE.Vector2(0.5, 0.5),
    sunVis: 0,
    inside: false,
    sharedUniforms: {
      uTime: { value: 0 },
      uWet: { value: 0 },
      uRain: { value: 0 },
      uSunDir: { value: new THREE.Vector3(-0.62, 0.42, 0.66).normalize() },
      uSunCol: { value: new THREE.Color(0xfff0d8) },
      uSkyHor: { value: new THREE.Color(0xc3daee) },
      uSkyZen: { value: new THREE.Color(0x2a63c4) },
      uNight: { value: 0 },
      uFogColor: { value: new THREE.Color(0xc2d4e4) },
      uSnow: { value: 0 }
    }
  };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* 1. PBR TEXTURE MAPS GENERATOR (Sobel Normal + Roughness) */
  const PBR_CACHE = new WeakMap();
  RE.generatePBRMaps = function(map, opts){
    opts = opts || {};
    if(!map || !map.image) return null;
    const im = map.image;
    if(PBR_CACHE.has(im)){
      const cached = PBR_CACHE.get(im);
      if(!cached) return null;
      const cloneT = src => {
        if(!src) return null;
        const t = src.clone();
        t.wrapS = map.wrapS; t.wrapT = map.wrapT;
        t.repeat.copy(map.repeat); t.offset.copy(map.offset); t.rotation = map.rotation;
        t.flipY = map.flipY; t.needsUpdate = true;
        return t;
      };
      return { normalMap: cloneT(cached.normalMap), roughnessMap: cloneT(cached.roughnessMap) };
    }
    try{
      const iw = im.naturalWidth || im.width || 0, ih = im.naturalHeight || im.height || 0;
      if(iw < 16 || ih < 16){ PBR_CACHE.set(im, null); return null; }
      const maxS = opts.maxSize || 512;
      const W = Math.min(maxS, iw), H = Math.min(maxS, ih);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d'); ctx.drawImage(im, 0, 0, W, H);
      const a = ctx.getImageData(0, 0, W, H).data;
      const L = new Float32Array(W * H);
      for(let i = 0; i < W * H; i++) L[i] = (a[i*4]*0.299 + a[i*4+1]*0.587 + a[i*4+2]*0.114) / 255;
      const nData = ctx.createImageData(W, H), nd = nData.data;
      const rCanvas = document.createElement('canvas'); rCanvas.width = W; rCanvas.height = H;
      const rCtx = rCanvas.getContext('2d'), rData = rCtx.createImageData(W, H), rd = rData.data;
      const str = (opts.strength || 2.1) * Math.min(2.0, W / 128);
      const rBase = opts.roughBase !== undefined ? opts.roughBase : 0.78;
      const rVar = opts.roughVar !== undefined ? opts.roughVar : 0.28;
      const rep = map.wrapS === THREE.RepeatWrapping;
      const at = (x, y) => {
        if(rep){ x = (x + W) % W; y = (y + H) % H; }
        else { x = x < 0 ? 0 : x >= W ? W - 1 : x; y = y < 0 ? 0 : y >= H ? H - 1 : y; }
        return L[y * W + x];
      };
      for(let y = 0; y < H; y++){
        for(let x = 0; x < W; x++){
          const tl = at(x-1,y-1), tc = at(x,y-1), tr = at(x+1,y-1);
          const ml = at(x-1,y),   mc = at(x,y),   mr = at(x+1,y);
          const bl = at(x-1,y+1), bc = at(x,y+1), br = at(x+1,y+1);
          const gx = (tr + 2*mr + br) - (tl + 2*ml + bl);
          const gy = (bl + 2*bc + br) - (tl + 2*tc + tr);
          const nx = -gx * str, ny = gy * str, inv = 1 / Math.sqrt(nx*nx + ny*ny + 1);
          const idx = (y * W + x) * 4;
          nd[idx] = (nx * inv * 0.5 + 0.5) * 255; nd[idx+1] = (ny * inv * 0.5 + 0.5) * 255;
          nd[idx+2] = (inv * 0.5 + 0.5) * 255; nd[idx+3] = 255;
          const edge = Math.min(1, Math.hypot(gx, gy) * 1.4);
          const rb = (clamp(rBase + (0.5 - mc) * rVar + edge * 0.16, 0.14, 0.98) * 255) | 0;
          rd[idx] = rd[idx+1] = rd[idx+2] = rb; rd[idx+3] = 255;
        }
      }
      ctx.putImageData(nData, 0, 0); rCtx.putImageData(rData, 0, 0);
      const mkTex = cv => {
        const t = new THREE.CanvasTexture(cv);
        t.wrapS = map.wrapS; t.wrapT = map.wrapT;
        t.repeat.copy(map.repeat); t.offset.copy(map.offset); t.rotation = map.rotation;
        t.flipY = map.flipY; t.anisotropy = map.anisotropy || 4; t.needsUpdate = true;
        return t;
      };
      const res = { normalMap: mkTex(c), roughnessMap: mkTex(rCanvas) };
      PBR_CACHE.set(im, res);
      return res;
    }catch(e){ PBR_CACHE.set(im, null); return null; }
  };

  RE.enhanceBlenderModel = function(mesh, opts){
    if(!mesh || !mesh.material || !RE.active) return;
    const mat = mesh.material;
    if(!mat.isMeshStandardMaterial) return;
    opts = opts || {};
    mat.roughness = opts.roughness !== undefined ? opts.roughness : 0.84;
    mat.metalness = opts.metalness !== undefined ? opts.metalness : 0.04;
    mat.envMapIntensity = opts.envMapIntensity !== undefined ? opts.envMapIntensity : 0.55;
    if(mat.map && mat.map.image && !mat.normalMap){
      const maps = RE.generatePBRMaps(mat.map, { strength: opts.normalStrength || 1.35, roughBase: 0.82, roughVar: 0.25, maxSize: 512 });
      if(maps){
        mat.normalMap = maps.normalMap;
        mat.normalScale = new THREE.Vector2(0.75, 0.75);
        mat.roughnessMap = maps.roughnessMap;
        mat.needsUpdate = true;
      }
    }
  };

  /* 2. PHYSICAL ATMOSPHERE SKY SHADER (Rayleigh + Mie + Volumetric Clouds) */
  RE.createPhysicalSkyMaterial = function(skyU){
    return new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `
        uniform vec3 hor, zen, sunC, sunDir;
        uniform float night, t, cov;
        varying vec3 vD;
        float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
        float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n2(vec2 p){
          vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h2(i), h2(i+vec2(1.,0.)), f.x), mix(h2(i+vec2(0.,1.)), h2(i+vec2(1.,1.)), f.x), f.y);
        }
        float fbm(vec2 p){
          float a = 0.5, s = 0.0; mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
          for(int i = 0; i < 5; i++){ s += a * n2(p); p = rot * p * 2.04 + vec2(17.3, 9.2); a *= 0.5; }
          return s;
        }
        float hgPhase(float cosT, float g){
          float g2 = g * g;
          return (1.0 - g2) / (4.0 * 3.14159265 * pow(max(0.001, 1.0 + g2 - 2.0 * g * cosT), 1.5));
        }
        void main(){
          vec3 d = normalize(vD), sd = normalize(sunDir);
          float y = max(d.y, 0.0), cosT = dot(d, sd);
          float sunElev = clamp(sd.y, -0.25, 1.0);
          float golden = smoothstep(0.45, 0.02, abs(sunElev)) * (1.0 - night * 0.85);
          vec3 rayleigh = mix(hor, zen, pow(y, 0.48));
          float haze = exp(-y * 7.5);
          vec3 warmGlow = mix(hor * 1.08, vec3(1.18, 0.62, 0.30), golden * 0.72);
          vec3 c = mix(rayleigh, warmGlow, haze * (0.58 + 0.25 * golden));
          float mie = hgPhase(cosT, 0.76) * 0.42 + hgPhase(cosT, 0.45) * 0.28;
          float sunDisk = smoothstep(0.99935, 0.99978, cosT);
          float sunHalo = pow(max(cosT, 0.0), 32.0) * 0.45 + pow(max(cosT, 0.0), 5.0) * 0.16;
          vec3 sunTint = mix(sunC, vec3(1.3, 0.68, 0.32), golden * 0.65);
          c += sunTint * (sunDisk * 14.0 + (mie + sunHalo) * mix(1.0, 1.65, golden)) * (1.0 - night * 0.92);
          if(night > 0.15){
            vec3 moonDir = normalize(vec3(-sd.x, max(0.28, abs(sd.y) + 0.22), -sd.z));
            float mc = max(dot(d, moonDir), 0.0);
            c += vec3(0.75, 0.84, 1.0) * (smoothstep(0.9992, 0.9996, mc) * 2.6 + pow(mc, 48.0) * 0.35 + pow(mc, 8.0) * 0.08) * night;
          }
          if(d.y > 0.008){
            float altFade = smoothstep(0.008, 0.16, d.y);
            vec2 cuvH = d.xz / (d.y + 0.22) * 1.45 + vec2(t * 0.0028, t * 0.0011);
            float cir = fbm(cuvH * vec2(1.8, 0.75) + fbm(cuvH * 1.6) * 0.55);
            float cirM = smoothstep(0.56, 0.84, cir) * 0.26 * (1.0 - cov * 0.4);
            vec3 cirCol = mix(vec3(0.85, 0.9, 0.98), sunTint * 1.15, 0.35 + golden * 0.4) * (1.0 - night * 0.84);
            c = mix(c, cirCol, cirM * altFade);
            vec2 cuv = d.xz / (d.y + 0.095) * 1.15 + vec2(t * 0.0055, t * 0.0022);
            vec2 warp = vec2(fbm(cuv * 1.3 + 2.1), fbm(cuv * 1.3 + 7.4)) * 0.32;
            float density = fbm(cuv + warp) * 0.68 + fbm((cuv + warp) * 2.9 + vec2(3.2, 5.1)) * 0.32;
            float thresh = 1.0 - cov;
            float mask = smoothstep(thresh - 0.14, thresh + 0.19, density);
            if(mask > 0.002){
              vec2 sunStep = sd.xz / (max(sd.y, 0.18) + 0.35) * 0.11;
              float dS1 = fbm(cuv + warp + sunStep) * 0.68 + fbm((cuv + warp + sunStep) * 2.9 + vec2(3.2, 5.1)) * 0.32;
              float dS2 = fbm(cuv + warp + sunStep * 2.4);
              float beer = exp(-max(0.0, (dS1 - thresh) * 1.6 + (dS2 - thresh) * 0.9) * 2.2);
              float powder = 1.0 - exp(-max(0.0, density - thresh) * 4.5);
              float silver = hgPhase(cosT, 0.72) * 0.85 + hgPhase(cosT, -0.25) * 0.18;
              float directLit = clamp(beer * (0.55 + 0.45 * powder) * (0.75 + silver * 1.35), 0.0, 2.2);
              vec3 cloudDark = mix(hor * 0.48, zen * 0.38, 0.45) * mix(1.0, 0.52, smoothstep(0.6, 0.96, cov));
              vec3 cloudBright = mix(vec3(1.02, 1.01, 0.99), sunTint * 1.25, 0.35 + golden * 0.55);
              vec3 cloudCol = mix(cloudDark, cloudBright, clamp(directLit, 0.0, 1.0));
              cloudCol += sunTint * max(0.0, directLit - 0.85) * 0.55 * (1.0 - night * 0.9);
              cloudCol *= (1.0 - night * 0.84) * mix(1.0, 0.68, smoothstep(0.65, 0.98, cov));
              cloudCol = mix(warmGlow * (1.0 - night * 0.4), cloudCol, smoothstep(0.008, 0.24, d.y));
              c = mix(c, cloudCol, mask * altFade * 0.95);
            }
          }
          if(d.y < 0.0){
            vec3 gnd = mix(vec3(0.24, 0.26, 0.20), vec3(0.14, 0.15, 0.14), smoothstep(0.0, -0.45, d.y));
            c = mix(hor * 0.82, gnd * (1.0 - night * 0.78), smoothstep(0.0, -0.22, d.y));
          }
          if(night > 0.35 && d.y > 0.02){
            vec3 q = floor(d * 480.0); float stVal = h3(q);
            float star = smoothstep(0.9968, 0.9995, stVal) * (0.75 + 0.25 * sin(t * 2.6 + stVal * 120.0)) * smoothstep(0.02, 0.28, d.y);
            vec3 starCol = mix(vec3(0.85, 0.92, 1.0), vec3(1.0, 0.92, 0.78), fract(stVal * 73.1));
            float mw = exp(-pow((d.x * 0.6 + d.z * 0.5 - d.y * 0.45), 2.0) * 14.0) * fbm(d.xz * 4.5 + d.y * 3.0);
            c += (starCol * star * 1.9 + vec3(0.06, 0.08, 0.14) * mw * 0.55) * smoothstep(0.35, 0.85, night) * (1.0 - cov * 0.85);
          }
          gl_FragColor = linearToOutputTexel(vec4(max(c, vec3(0.0)), 1.0));
        }`
    });
  };
  /* 3A. HDR COMPOSER + GTAO + CONTACT SHADOWS + VOLUMETRIC GOD RAYS */
  RE.createPostPipeline = function(renderer, scene, camera, DAY){
    if(!THREE.EffectComposer || !THREE.UnrealBloomPass) return null;
    const rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, stencilBuffer: false };
    const gl = renderer.getContext();
    const isW2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    const hasHF = isW2 ? !!gl.getExtension('EXT_color_buffer_float') : !!(gl.getExtension('OES_texture_half_float') && gl.getExtension('EXT_color_buffer_half_float'));
    if(hasHF) rtOpts.type = THREE.HalfFloatType;
    const pr = renderer.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(Math.max(1, Math.round(innerWidth * pr)), Math.max(1, Math.round(innerHeight * pr)), rtOpts);
    const mkD = () => { const d = new THREE.DepthTexture(); d.type = THREE.UnsignedIntType; return d; };
    rt.depthTexture = mkD();
    const composer = new THREE.EffectComposer(renderer, rt);
    composer.renderTarget1.depthTexture = rt.depthTexture;
    composer.renderTarget2.depthTexture = mkD();
    composer.addPass(new THREE.RenderPass(scene, camera));

    const ao = new THREE.ShaderPass({
      uniforms: {
        tDiffuse: { value: null }, tDepth: { value: null },
        nf: { value: new THREE.Vector2(0.25, 4000) }, tn: { value: new THREE.Vector2(1, 1) }, px: { value: new THREE.Vector2(1, 1) },
        str: { value: 1.0 }, sunViewDir: { value: new THREE.Vector3(0, 0.5, -0.5) },
        sunScreen: { value: new THREE.Vector2(0.5, 0.5) }, sunVis: { value: 0.0 },
        sunCol: { value: new THREE.Color(0xfff0d8) }, contactStr: { value: 0.55 }, shaftStr: { value: 0.24 }, samples: { value: 12.0 }
      },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `uniform sampler2D tDiffuse,tDepth;uniform vec2 nf,tn,px,sunScreen;uniform vec3 sunViewDir,sunCol;uniform float str,sunVis,contactStr,shaftStr,samples;varying vec2 vUv;
float ld(vec2 uv){float z=texture2D(tDepth,clamp(uv,vec2(.001),vec2(.999))).x*2.-1.;return 2.*nf.x*nf.y/(nf.y+nf.x-z*(nf.y-nf.x));}
vec3 vp(vec2 uv){float d=ld(uv);return vec3((uv*2.-1.)*tn*d,-d);}
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
void main(){
  vec4 col=texture2D(tDiffuse,vUv);float d=ld(vUv);vec3 rgb=col.rgb;
  if(d<240.&&str>.01){
    vec3 p=vec3((vUv*2.-1.)*tn*d,-d),px1=vp(vUv+vec2(px.x,0.))-p,px0=p-vp(vUv-vec2(px.x,0.)),py1=vp(vUv+vec2(0.,px.y))-p,py0=p-vp(vUv-vec2(0.,px.y));
    vec3 n=normalize(cross(abs(px1.z)<abs(px0.z)?px1:px0,abs(py1.z)<abs(py0.z)?py1:py0));
    float R=mix(.45,1.85,smoothstep(3.,55.,d)),rs=R/(d*tn.y*2.),a0=ign(gl_FragCoord.xy)*6.2831853,occ=0.;
    int N=int(samples+.5);
    for(int i=0;i<12;i++){if(i>=N)break;float fi=(float(i)+.5)/samples,ang=a0+fi*22.732;vec2 o=vec2(cos(ang),sin(ang))*pow(fi,.62)*rs;o.x*=tn.y/tn.x;vec3 v=vp(vUv+o)-p;float dd=dot(v,v);occ+=max(dot(n,v)-.014*d-.018,0.)/(dd+.025)*smoothstep(R*R*3.8,R*R*.9,dd);}
    float af=clamp(1.-occ*(R*.56)/samples*2.45,.18,1.);
    rgb=mix(rgb,rgb*(af+(1.-af)*rgb*.38),str*smoothstep(240.,110.,d));
    if(contactStr>.01&&d<65.&&dot(n,sunViewDir)>.05){
      float cSh=0.,stp=mix(.06,.24,smoothstep(2.,45.,d)),jit=ign(gl_FragCoord.xy+19.3);
      for(int s=1;s<=5;s++){vec3 sp=p+sunViewDir*(stp*(float(s)-.35+jit*.45));vec2 suv=(sp.xy/(-sp.z*tn))*.5+.5;if(suv.x<0.||suv.x>1.||suv.y<0.||suv.y>1.)break;float df=(-sp.z)-ld(suv);if(df>.025&&df<stp*3.2)cSh=max(cSh,1.-float(s)/6.);}
      rgb*=1.-cSh*contactStr*smoothstep(65.,28.,d);
    }
  }
  if(shaftStr>.005&&sunVis>.01){
    vec2 dl=vUv-sunScreen;float ds=length(dl);
    if(ds<1.15){vec2 su=dl*(.72/14.),uvS=vUv-su*ign(gl_FragCoord.xy+7.1);float il=0.,dc=1.;for(int i=0;i<14;i++){uvS-=su;il+=smoothstep(420.,1400.,ld(uvS))*dc;dc*=.91;}rgb+=sunCol*(il/14.)*smoothstep(1.15,0.,ds)*sunVis*shaftStr;}
  }
  gl_FragColor=vec4(rgb,col.a);
}`
    });
    const aoOrig = ao.render.bind(ao);
    ao.render = function(rn, wb, rb, dt, mk){
      const u = ao.uniforms; u.tDepth.value = rb.depthTexture;
      const th = Math.tan(camera.fov * Math.PI / 360);
      u.tn.value.set(th * camera.aspect, th); u.nf.value.set(camera.near, camera.far);
      u.px.value.set(1 / Math.max(1, rb.width), 1 / Math.max(1, rb.height));
      u.sunViewDir.value.copy(RE.sharedUniforms.uSunDir.value).transformDirection(camera.matrixWorldInverse).normalize();
      u.sunScreen.value.copy(RE.sunScreen); u.sunVis.value = RE.inside ? 0.0 : RE.sunVis;
      u.sunCol.value.copy(RE.sharedUniforms.uSunCol.value);
      aoOrig(rn, wb, rb, dt, mk);
    };
    composer.addPass(ao);
    const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(512, 512), DAY.bloom * 0.72, 0.62, hasHF ? 1.05 : 0.84);
    composer.addPass(bloom);
    const grade = RE.createGradePass(DAY); composer.addPass(grade);
    const fxaa = THREE.FXAAShader ? new THREE.ShaderPass(THREE.FXAAShader) : null;
    if(fxaa) composer.addPass(fxaa);
    return { composer, ao, bloom, grade, fxaa, isHDR: hasHF };
  };
  /* 3B. FILMIC AGX/ACES GRADE + CAS SHARPEN + RAIN LENS PASS */
  RE.createGradePass = function(DAY){
    const grade = new THREE.ShaderPass({
      uniforms: {
        tDiffuse: { value: null }, time: { value: 0 }, exposure: { value: DAY.exp },
        night: { value: 0 }, rain: { value: 0 }, sharpen: { value: 0.34 },
        px: { value: new THREE.Vector2(1/1280, 1/720) }
      },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `uniform sampler2D tDiffuse;uniform float time,exposure,night,rain,sharpen;uniform vec2 px;varying vec2 vUv;
vec3 filmicTone(vec3 x){float l=dot(x,vec3(.2126,.7152,.0722));x=mix(x,vec3(l),smoothstep(1.2,6.5,l)*.38);return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  vec2 uv=vUv;
  if(rain>.15){
    vec2 gr=uv*vec2(14.,8.),id=floor(gr),gv=fract(gr)-.5;
    float n=h2(id),ph=fract(-(time*(.45+n*.5)+n*6.28)*.35)-.5;
    vec2 dp=vec2((n-.5)*.45,ph*.6);
    float dr=smoothstep(.11,.03,length((gv-dp)*vec2(1.,1.45)))*smoothstep(.15,.85,rain)*step(.58,n);
    uv+=(gv-dp)*dr*.14;
  }
  vec2 fc=uv-.5;float r2=dot(fc,fc);vec2 ca=fc*r2*.0045;
  vec3 c=vec3(texture2D(tDiffuse,uv+ca).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-ca).b);
  if(sharpen>.01){
    vec3 nN=texture2D(tDiffuse,uv+vec2(0.,px.y)).rgb,nS=texture2D(tDiffuse,uv-vec2(0.,px.y)).rgb,nE=texture2D(tDiffuse,uv+vec2(px.x,0.)).rgb,nW=texture2D(tDiffuse,uv-vec2(px.x,0.)).rgb;
    vec3 mn=min(c,min(min(nN,nS),min(nE,nW))),mx=max(c,max(max(nN,nS),max(nE,nW)));
    vec3 amp=sqrt(clamp(min(mn,2.-mx)/(mx+.001),0.,1.))*(-.16*sharpen);
    c=max((c+(nN+nS+nE+nW)*amp)/(1.+4.*amp),vec3(0.));
  }
  c=filmicTone(c*exposure);
  float lum=dot(c,vec3(.299,.587,.114));
  c=mix(vec3(lum),c,mix(1.14,1.04,night));
  c=mix(c,c*c*(3.-2.*c),.18);
  c+=vec3(.014,.005,-.012)*smoothstep(.45,1.,lum)*(1.-night)+vec3(-.010,.002,.018)*(1.-smoothstep(0.,.42,lum));
  c*=1.-r2*.46;
  c+=(fract(sin(dot(uv*(time+1.),vec2(12.9898,78.233)))*43758.5453)-.5)*.009;
  gl_FragColor=vec4(clamp(c,0.,1.),1.);
}`
    });
    const gradeOrig = grade.render.bind(grade);
    grade.render = function(rn, wb, rb, dt, mk){
      grade.uniforms.px.value.set(1 / Math.max(1, rb.width), 1 / Math.max(1, rb.height));
      grade.uniforms.rain.value = RE.inside ? 0.0 : RE.rainIntensity;
      gradeOrig(rn, wb, rb, dt, mk);
    };
    return grade;
  };
  /* 4. ASPHALT PBR (Aggregate + Wet Puddles + Animated Rain Ripples) & BUILDINGS */
  RE.enhanceAsphaltMaterial = function(mat, isMain){
    if(!mat || !mat.isMeshStandardMaterial) return mat;
    mat.roughness = isMain ? 0.78 : 0.84; mat.metalness = 0.02; mat.envMapIntensity = 0.65;
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTime = RE.sharedUniforms.uTime; sh.uniforms.uWet = RE.sharedUniforms.uWet;
      sh.uniforms.uRain = RE.sharedUniforms.uRain; sh.uniforms.uSnow = RE.sharedUniforms.uSnow;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWP,vUpV,vRtV,vFwV;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;vUpV=normalize((viewMatrix*vec4(0.,1.,0.,0.)).xyz);vRtV=normalize((viewMatrix*vec4(1.,0.,0.,0.)).xyz);vFwV=normalize((viewMatrix*vec4(0.,0.,1.,0.)).xyz);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vWP,vUpV,vRtV,vFwV; uniform float uTime, uWet, uRain, uSnow;
          float rHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float rNoise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(rHash(i),rHash(i+vec2(1.,0.)),f.x),mix(rHash(i+vec2(0.,1.)),rHash(i+vec2(1.,1.)),f.x),f.y); }
          float rFbm(vec2 p){ return rNoise(p)*0.55 + rNoise(p*2.13+3.1)*0.3 + rNoise(p*4.41+7.2)*0.15; }
          vec2 rainRipples(vec2 uv, float t){
            vec2 acc = vec2(0.0);
            for(int i = 0; i < 2; i++){
              vec2 p = uv * (i == 0 ? 1.8 : 2.9) + float(i) * 13.7, id = floor(p), gv = fract(p) - 0.5;
              float rnd = rHash(id), ph = fract(t * (0.75 + rnd * 0.55) + rnd * 17.0);
              vec2 dv = gv - (vec2(rHash(id + 3.1), rHash(id + 8.7)) - 0.5) * 0.45;
              float d = length(dv);
              acc += normalize(dv + 0.0001) * sin((d - ph * 0.42) * 58.0) * exp(-d * 10.0) * (1.0 - ph) * smoothstep(0.0, 0.08, ph);
            }
            return acc;
          }`)
        .replace('#include <map_fragment>', `#include <map_fragment>
          float macroVar = rFbm(vWP.xz * 0.085);
          float microGr = rNoise(vWP.xz * 4.5) * 0.5 + rNoise(vWP.xz * 12.0) * 0.5;
          diffuseColor.rgb *= (0.86 + macroVar * 0.24) * (0.93 + microGr * 0.14);
          float pudBase = rFbm(vWP.xz * 0.14 + vec2(4.2, -1.7));
          float pudM = smoothstep(0.56 - uWet * 0.18, 0.72 - uWet * 0.16, pudBase) * smoothstep(0.08, 0.55, uWet);
          diffuseColor.rgb *= (1.0 - uWet * (0.34 + pudM * 0.24));
          if(uSnow > 0.1) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.76, 0.80, 0.84), smoothstep(0.45, 0.78, macroVar) * uSnow * 0.28);`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          float pudBaseR = rFbm(vWP.xz * 0.14 + vec2(4.2, -1.7));
          float pudMR = smoothstep(0.56 - uWet * 0.18, 0.72 - uWet * 0.16, pudBaseR) * smoothstep(0.08, 0.55, uWet);
          roughnessFactor = clamp(roughnessFactor + (rNoise(vWP.xz * 2.2) - 0.5) * 0.18, 0.15, 0.96);
          roughnessFactor = mix(mix(roughnessFactor, 0.24, uWet * 0.72), 0.035, pudMR);`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          float pudBaseN = rFbm(vWP.xz * 0.14 + vec2(4.2, -1.7));
          float pudMN = smoothstep(0.56 - uWet * 0.18, 0.72 - uWet * 0.16, pudBaseN) * smoothstep(0.08, 0.55, uWet);
          if(pudMN > 0.02){
            normal = normalize(mix(normal, normalize(vUpV), pudMN * 0.90));
            if(uRain > 0.05){ vec2 rip = rainRipples(vWP.xz, uTime) * uRain * pudMN * 0.16; normal = normalize(normal + vRtV * rip.x + vFwV * rip.y); }
          }`);
    };
    mat.customProgramCacheKey = () => 're_asphalt_' + (isMain ? '1' : '0');
    return mat;
  };

  RE.enhanceBuildingWallMaterial = function(mat){
    if(!mat || !mat.isMeshStandardMaterial) return mat;
    mat.roughness = 0.88; mat.metalness = 0.0; mat.envMapIntensity = 0.34;
    mat.onBeforeCompile = sh => {
      sh.uniforms.uWet = RE.sharedUniforms.uWet;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying float vLocalY;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvec4 bwp=vec4(transformed,1.0);#ifdef USE_INSTANCING\nbwp=instanceMatrix*bwp;\n#endif\nvWP=(modelMatrix*bwp).xyz;\nvLocalY=transformed.y;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vWP; varying float vLocalY; uniform float uWet;
          float bH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float bN(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(bH(i),bH(i+vec2(1.,0.)),f.x),mix(bH(i+vec2(0.,1.)),bH(i+vec2(1.,1.)),f.x),f.y); }`)
        .replace('#include <map_fragment>', `#include <map_fragment>
          float wPatch = bN(vWP.xz * 0.25 + vec2(vWP.y * 0.18, 0.0)) * 0.65 + bN(vWP.xz * 1.4 + vWP.y * 0.9) * 0.35;
          float baseAO = mix(0.76, 1.0, smoothstep(0.02, 0.18, vLocalY));
          float eaveAO = mix(0.86, 1.0, smoothstep(1.0, 0.86, vLocalY));
          diffuseColor.rgb *= (0.92 + wPatch * 0.15) * baseAO * eaveAO * (1.0 - uWet * 0.12);`);
    };
    mat.customProgramCacheKey = () => 're_wall_v1';
    return mat;
  };
  /* 5A. 3D PARALLAX INTERIOR WINDOWS + FOLIAGE TRANSLUCENCY */
  RE.enhanceWindowMaterial = function(mat){
    if(!mat || !mat.isMeshStandardMaterial) return mat;
    mat.roughness = 0.07; mat.metalness = 0.12; mat.envMapIntensity = 2.0;
    mat.onBeforeCompile = sh => {
      sh.uniforms.uNight = RE.sharedUniforms.uNight; sh.uniforms.uSkyHor = RE.sharedUniforms.uSkyHor;
      sh.uniforms.uSkyZen = RE.sharedUniforms.uSkyZen; sh.uniforms.uSunDir = RE.sharedUniforms.uSunDir;
      sh.uniforms.uSunCol = RE.sharedUniforms.uSunCol;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWinWP,vWinN;\nvarying vec2 vWinUv;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWinUv=uv;vec4 wp4=vec4(transformed,1.);#ifdef USE_INSTANCING\nwp4=instanceMatrix*wp4;\n#endif\nvWinWP=(modelMatrix*wp4).xyz;vec3 wn=objectNormal;#ifdef USE_INSTANCING\nwn=mat3(instanceMatrix)*wn;\n#endif\nvWinN=normalize(mat3(modelMatrix)*wn);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWinWP,vWinN;varying vec2 vWinUv;uniform float uNight;uniform vec3 uSkyHor,uSkyZen,uSunDir,uSunCol;float wH(vec2 p){return fract(sin(dot(p,vec2(41.1,289.7)))*43758.5453);}')
        .replace('#include <map_fragment>', `#include <map_fragment>
          if(vWinUv.x>.08&&vWinUv.x<.92&&vWinUv.y>.07&&vWinUv.y<.92&&abs(vWinUv.x-.5)>.032&&abs(vWinUv.y-.64)>.026){
            vec3 V=normalize(cameraPosition-vWinWP),N=normalize(vWinN),T=normalize(cross(vec3(0.,1.,0.),N)+vec3(.0001)),B=cross(N,T);
            vec3 vL=vec3(dot(-V,T),dot(-V,B),max(.18,abs(dot(V,N)))); vec2 pU=(vWinUv-.5)*2., tW=(sign(vL.xy)-pU)/(vL.xy+sign(vL.xy)*.0001);
            vec3 hit=vec3(pU,0.)+vL*min(min(abs(tW.x),abs(tW.y)),1.65/vL.z);
            float sw=wH(floor(vWinWP.xz*.45+vWinWP.y*.3));
            vec3 rC=mix(vec3(.76,.72,.65),vec3(.84,.78,.68),sw)*(.45+.55*smoothstep(-1.,.85,hit.y));
            float cg=smoothstep(.65,1.,hit.y)*smoothstep(.7,0.,length(hit.xz-vec2(0.,.85)));
            float lit=mix(.22,1.,uNight)*(.45+.55*step(.32,sw));
            vec3 intr=rC*(.28+.85*lit)+vec3(1.15,.92,.58)*cg*lit*1.4;
            float curt=smoothstep(.62,.94,abs(pU.x))*(.65+.35*sin(pU.x*38.));
            intr=mix(intr,vec3(.85,.82,.76)*(.32+.48*lit),curt*.55);
            float fr=.06+.94*pow(1.-clamp(abs(dot(N,V)),0.,1.),4.2); vec3 R=reflect(-V,N);
            vec3 skyR=mix(uSkyHor,uSkyZen,clamp(R.y*1.15,0.,1.))*mix(.95,.25,uNight)+uSunCol*pow(max(dot(R,normalize(uSunDir)),0.),160.)*(1.-uNight*.9)*3.2;
            diffuseColor.rgb=mix(intr*.82,skyR,clamp(fr*1.15,.14,.92));
          }`);
    };
    mat.customProgramCacheKey = () => 're_win_parallax_v1';
    return mat;
  };

  RE.enhanceFoliageMaterial = function(mat){
    if(!mat || !mat.isMeshStandardMaterial) return mat;
    mat.roughness = 0.86; mat.metalness = 0.0; mat.envMapIntensity = 0.32;
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = sh => {
      if(prev) prev(sh);
      sh.uniforms.uSunDir = RE.sharedUniforms.uSunDir; sh.uniforms.uSunCol = RE.sharedUniforms.uSunCol; sh.uniforms.uNight = RE.sharedUniforms.uNight;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vFolWP,vFWN;')
        .replace('#include <defaultnormal_vertex>', 'vec3 _fwn=objectNormal;#ifdef USE_INSTANCING\n_fwn=mat3(instanceMatrix)*_fwn;\n#endif\nvFWN=normalize(mat3(modelMatrix)*_fwn);\n#include <defaultnormal_vertex>')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvec4 fwp=vec4(transformed,1.);#ifdef USE_INSTANCING\nfwp=instanceMatrix*fwp;\n#endif\nvFolWP=(modelMatrix*fwp).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vFolWP,vFWN;uniform vec3 uSunDir,uSunCol;uniform float uNight;')
        .replace('#include <dithering_fragment>', '{vec3 fV=normalize(cameraPosition-vFolWP),fN=normalize(vFWN);float bl=pow(clamp(dot(-fV,normalize(uSunDir)),0.,1.),3.);float wr=clamp(dot(fN,normalize(uSunDir))*.5+.5,0.,1.);gl_FragColor.rgb+=diffuseColor.rgb*uSunCol*(bl*.65+wr*.14)*(1.-uNight*.9);}\n#include <dithering_fragment>');
    };
    return mat;
  };
  /* 5B. REALISTIC HUMANS & AVATAR (Per-Region PBR + Skin SSS + Wet Eyes + Fabric Sheen) */
  RE.humanRegionProps = function(reg, tee){
    if(reg === 0 || (tee && (reg === 12 || reg === 13 || reg === 14))) return [0.46, 0.0, 1.0];
    if(reg === 10) return [0.34, 0.0, 0.9];
    if(reg === 8 || reg === 9) return [0.06, 0.0, 0.0];
    if(reg === 7 || reg === 11) return [0.42, 0.45, 0.15];
    if(reg === 5 || reg === 6) return [0.38, 0.05, 0.0];
    if(reg === 15 || reg === 16) return [0.76, 0.4, 0.0];
    return [0.86, 1.0, 0.0];
  };

  RE.createHumanMaterial = function(skinned){
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.02, envMapIntensity: 0.52, skinning: !!skinned });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uSunDir = RE.sharedUniforms.uSunDir; sh.uniforms.uSunCol = RE.sharedUniforms.uSunCol; sh.uniforms.uNight = RE.sharedUniforms.uNight;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 aMat;\nvarying vec3 vHMat,vHPos,vHWP,vHWN;')
        .replace('#include <defaultnormal_vertex>', 'vHWN=normalize(mat3(modelMatrix)*objectNormal);\n#include <defaultnormal_vertex>')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvHMat=aMat;vHPos=position;vHWP=(modelMatrix*vec4(transformed,1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vHMat,vHPos,vHWP,vHWN;uniform vec3 uSunDir,uSunCol;uniform float uNight;float hN2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}')
        .replace('#include <map_fragment>', `#include <map_fragment>
          if(vHMat.y>.5){float wv=sin(vHPos.x*340.)*sin(vHPos.y*340.)*.5+.5,mc=hN2(floor(vHPos.xy*180.+vHPos.z*90.));diffuseColor.rgb*=(.955+wv*.045+(mc-.5)*.04);}
          if(vHMat.z>.5){diffuseColor.rgb*=(.985+hN2(floor(vHPos.xy*260.+vHPos.z*260.))*.03);}`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=clamp(vHMat.x,.05,.96);')
        .replace('#include <dithering_fragment>', `{vec3 hV=normalize(cameraPosition-vHWP),hL=normalize(uSunDir),hN=normalize(vHWN);float rim=pow(1.-clamp(dot(hN,hV),0.,1.),3.2);
          if(vHMat.z>.1){float ndl=dot(hN,hL),sss=smoothstep(-.35,.45,ndl)*(1.-smoothstep(.15,.85,ndl));gl_FragColor.rgb+=diffuseColor.rgb*vec3(.95,.34,.22)*uSunCol*(1.-uNight*.82)*(sss*.32+rim*.12)*vHMat.z;}
          if(vHMat.y>.1){gl_FragColor.rgb+=(diffuseColor.rgb*.55+vec3(.12))*rim*.26*clamp(dot(hN,hL)*.5+.5,.15,1.)*vHMat.y*(1.-uNight*.72);}}\n#include <dithering_fragment>`);
    };
    mat.customProgramCacheKey = () => 're_human_' + (skinned ? 'sk' : 'st');
    return mat;
  };
  /* 6A. CLEARCOAT CAR MATERIALS + SHADOW BLOB */
  let SHADOW_BLOB_TEX = null;
  RE.getShadowBlobTex = function(){
    if(SHADOW_BLOB_TEX) return SHADOW_BLOB_TEX;
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 14, 64, 64, 62);
    g.addColorStop(0, 'rgba(0,0,0,0.68)'); g.addColorStop(0.55, 'rgba(0,0,0,0.42)');
    g.addColorStop(0.82, 'rgba(0,0,0,0.14)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    SHADOW_BLOB_TEX = new THREE.CanvasTexture(c); SHADOW_BLOB_TEX.__nonm = 1;
    return SHADOW_BLOB_TEX;
  };

  RE.createCarMaterials = function(){
    if(RE._carMats) return RE._carMats;
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x0e171f, roughness: 0.04, metalness: 0.15, clearcoat: 1.0, clearcoatRoughness: 0.03, envMapIntensity: 2.35, reflectivity: 1.0 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.14, metalness: 0.94, envMapIntensity: 1.9 });
    const trim = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, metalness: 0.06, envMapIntensity: 0.45, vertexColors: true });
    const tire = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, metalness: 0.02, envMapIntensity: 0.28, vertexColors: true });
    const alloy = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.22, metalness: 0.88, envMapIntensity: 1.75, vertexColors: true });
    const headLight = new THREE.MeshStandardMaterial({ color: 0xfff8e4, emissive: 0xfff0c8, emissiveIntensity: 0.75, roughness: 0.1, metalness: 0.1 });
    const tailLight = new THREE.MeshStandardMaterial({ color: 0x9c0e14, emissive: 0xd81218, emissiveIntensity: 0.55, roughness: 0.15, metalness: 0.1 });
    const shadowMat = new THREE.MeshBasicMaterial({ map: RE.getShadowBlobTex(), transparent: true, opacity: 0.78, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
    RE._carMats = { glass, chrome, trim, tire, alloy, headLight, tailLight, shadowMat };
    return RE._carMats;
  };

  RE.createCarPaintMaterial = function(color){
    const c = new THREE.Color(color), hsl = {}; c.getHSL(hsl);
    const mat = new THREE.MeshPhysicalMaterial({
      color: c, roughness: hsl.l < 0.28 ? 0.18 : 0.23, metalness: hsl.s > 0.12 ? 0.58 : 0.45,
      clearcoat: 1.0, clearcoatRoughness: 0.055, envMapIntensity: 1.65, vertexColors: true
    });
    mat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCarLP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCarLP=position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCarLP;float cFlk(vec3 p){return fract(sin(dot(floor(p),vec3(12.9898,78.233,37.719)))*43758.5453);}')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(cFlk(vCarLP*190.)-.5)*.075,.09,.42);');
    };
    mat.customProgramCacheKey = () => 're_carpaint_v1';
    return mat;
  };
  /* 6B. SKID MARKS + TIRE SMOKE FX */
  const SKID_MAX = 420, SMOKE_MAX = 140;
  let skidMesh = null, skidPos = null, skidAlpha = null, skidIdx = 0, smokeMesh = null, smokeData = [], smokeCursor = 0;
  RE.initVehicleFX = function(scene){
    if(skidMesh) return;
    const geo = new THREE.BufferGeometry();
    skidPos = new Float32Array(SKID_MAX * 18); skidAlpha = new Float32Array(SKID_MAX * 6);
    geo.setAttribute('position', new THREE.BufferAttribute(skidPos, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(skidAlpha, 1));
    skidMesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -10,
      vertexShader: 'attribute float aAlpha;varying float vA;void main(){vA=aAlpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying float vA;void main(){if(vA<.01)discard;gl_FragColor=vec4(.06,.06,.065,vA*.58);}'
    }));
    skidMesh.frustumCulled = false; skidMesh.renderOrder = 2; scene.add(skidMesh);
    const sc = document.createElement('canvas'); sc.width = 64; sc.height = 64;
    const sx = sc.getContext('2d'), sg = sx.createRadialGradient(32, 32, 4, 32, 32, 30);
    sg.addColorStop(0, 'rgba(215,215,212,0.55)'); sg.addColorStop(0.55, 'rgba(190,190,188,0.24)'); sg.addColorStop(1, 'rgba(180,180,180,0)');
    sx.fillStyle = sg; sx.fillRect(0, 0, 64, 64);
    const sTex = new THREE.CanvasTexture(sc); sTex.__nonm = 1;
    smokeMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: sTex, transparent: true, opacity: 0.65, depthWrite: false, side: THREE.DoubleSide }), SMOKE_MAX);
    smokeMesh.frustumCulled = false; smokeMesh.renderOrder = 4;
    const zM = new THREE.Matrix4().makeScale(0, 0, 0);
    for(let i = 0; i < SMOKE_MAX; i++){ smokeMesh.setMatrixAt(i, zM); smokeData.push({ life: 0, max: 1, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, s: 0.5, col: new THREE.Color(0xd2d2d0) }); }
    scene.add(smokeMesh);
  };
  RE.addSkidMark = function(x0, y0, z0, x1, y1, z1, nx, nz, alpha){
    if(!skidPos) return;
    const w = 0.14, o = skidIdx * 18, ao = skidIdx * 6;
    const ax=x0+nx*w, az=z0+nz*w, bx=x0-nx*w, bz=z0-nz*w, cx=x1+nx*w, cz=z1+nz*w, dx=x1-nx*w, dz=z1-nz*w;
    skidPos[o]=ax; skidPos[o+1]=y0; skidPos[o+2]=az; skidPos[o+3]=bx; skidPos[o+4]=y0; skidPos[o+5]=bz;
    skidPos[o+6]=cx; skidPos[o+7]=y1; skidPos[o+8]=cz; skidPos[o+9]=bx; skidPos[o+10]=y0; skidPos[o+11]=bz;
    skidPos[o+12]=dx; skidPos[o+13]=y1; skidPos[o+14]=dz; skidPos[o+15]=cx; skidPos[o+16]=y1; skidPos[o+17]=cz;
    for(let i = 0; i < 6; i++) skidAlpha[ao + i] = alpha;
    skidIdx = (skidIdx + 1) % SKID_MAX;
    skidMesh.geometry.attributes.position.needsUpdate = true; skidMesh.geometry.attributes.aAlpha.needsUpdate = true;
  };
  RE.spawnSmoke = function(x, y, z, vx, vy, vz, isDirt){
    if(!smokeMesh || RE.quality < 1) return;
    const p = smokeData[smokeCursor]; smokeCursor = (smokeCursor + 1) % SMOKE_MAX;
    p.life = 1; p.max = isDirt ? 0.85 : 1.15;
    p.x = x + (Math.random() - 0.5) * 0.18; p.y = y + 0.18; p.z = z + (Math.random() - 0.5) * 0.18;
    p.vx = vx * 0.25 + (Math.random() - 0.5) * 0.6; p.vy = 0.75 + Math.random() * 0.65; p.vz = vz * 0.25 + (Math.random() - 0.5) * 0.6;
    p.s = isDirt ? 0.55 : 0.48; p.col.setHex(isDirt ? 0x9c8c72 : 0xdadcd8);
  };
  const _smDummy = new THREE.Object3D();
  RE.updateVehicleFX = function(dt, camera){
    if(!smokeMesh) return;
    let any = false;
    for(let i = 0; i < SMOKE_MAX; i++){
      const p = smokeData[i]; if(p.life <= 0) continue; any = true;
      p.life -= dt / p.max;
      if(p.life <= 0){ _smDummy.scale.set(0, 0, 0); _smDummy.updateMatrix(); smokeMesh.setMatrixAt(i, _smDummy.matrix); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.vx *= 1 - dt * 1.4; p.vz *= 1 - dt * 1.4; p.vy *= 1 - dt * 0.6;
      const sc = p.s * (1 + (1 - p.life) * 2.6) * Math.min(1, p.life * 2.5);
      _smDummy.position.set(p.x, p.y, p.z); _smDummy.quaternion.copy(camera.quaternion); _smDummy.scale.set(sc, sc, sc);
      _smDummy.updateMatrix(); smokeMesh.setMatrixAt(i, _smDummy.matrix); smokeMesh.setColorAt(i, p.col);
    }
    if(any){ smokeMesh.instanceMatrix.needsUpdate = true; if(smokeMesh.instanceColor) smokeMesh.instanceColor.needsUpdate = true; }
  };
  /* 6C. 3D SPRING-DAMPER SUSPENSION, BODY ROLL, PITCH, STEER WHEELS & DRIFT */
  RE.updateCarDynamics = function(c, dt, thr, steer, hb, prevV, H, isDirt){
    if(!c._dyn) c._dyn = { pitch: 0, roll: 0, bounce: 0, bounceV: 0, prevH: H(c.x, c.z), prevRear: null, smokeT: 0 };
    const D = c._dyn;
    const accel = clamp((c.v - prevV) / Math.max(0.008, dt), -22, 18);
    D.pitch += (clamp(accel * 0.0044, -0.058, 0.044) - D.pitch) * Math.min(1, dt * 8.5);
    D.roll += (clamp(c.v * steer * (hb ? 1.5 : 1.0) * 0.0029, -0.098, 0.098) - D.roll) * Math.min(1, dt * 7.5);
    const curH = H(c.x, c.z), dh = curH - D.prevH; D.prevH = curH;
    D.bounceV -= dh * 14.0;
    D.bounceV += (-95.0 * D.bounce - 13.0 * D.bounceV) * dt;
    D.bounce = clamp(D.bounce + D.bounceV * dt, -0.14, 0.16);
    if(c.g){
      c.g.position.y += D.bounce; c.g.rotateZ(D.pitch); c.g.rotateX(D.roll);
      const ws = c.g.userData.wheels;
      if(ws && ws.length >= 2){
        const sa = -c.steer * 0.62;
        ws[0].rotation.order = 'YXZ'; ws[1].rotation.order = 'YXZ';
        ws[0].rotation.y = sa; ws[1].rotation.y = sa;
      }
      if(c.g.userData.brakeMat){
        const braking = (thr < -0.1 && c.v > 0.6) || (thr > 0.1 && c.v < -0.6) || (hb && Math.abs(c.v) > 0.8);
        c.g.userData.brakeMat.emissiveIntensity = braking ? 3.8 : (RE.sharedUniforms.uNight.value > 0.5 ? 0.95 : 0.25);
      }
    }
    const slip = (hb && Math.abs(c.v) > 4.2) || (Math.abs(steer) > 0.45 && Math.abs(c.v) > 13.0) || (thr < -0.5 && c.v > 11.5);
    const fx = Math.cos(c.h), fz = Math.sin(c.h), rx = -fz, rz = fx;
    const rearL = [c.x - fx*1.35 + rx*0.78, c.z - fz*1.35 + rz*0.78];
    const rearR = [c.x - fx*1.35 - rx*0.78, c.z - fz*1.35 - rz*0.78];
    if(slip && RE.quality >= 1){
      if(D.prevRear){
        const dL = Math.hypot(rearL[0] - D.prevRear[0][0], rearL[1] - D.prevRear[0][1]);
        if(dL > 0.14 && dL < 4.0){
          const a = clamp(Math.abs(c.v) / 18, 0.35, 1.0);
          RE.addSkidMark(D.prevRear[0][0], H(D.prevRear[0][0], D.prevRear[0][1]) + 0.14, D.prevRear[0][1], rearL[0], H(rearL[0], rearL[1]) + 0.14, rearL[1], rx, rz, a);
          RE.addSkidMark(D.prevRear[1][0], H(D.prevRear[1][0], D.prevRear[1][1]) + 0.14, D.prevRear[1][1], rearR[0], H(rearR[0], rearR[1]) + 0.14, rearR[1], rx, rz, a);
        }
      }
      D.prevRear = [rearL, rearR];
      D.smokeT -= dt;
      if(D.smokeT <= 0){
        D.smokeT = 0.045;
        RE.spawnSmoke(rearL[0], H(rearL[0], rearL[1]), rearL[1], fx*c.v, 0, fz*c.v, isDirt);
        RE.spawnSmoke(rearR[0], H(rearR[0], rearR[1]), rearR[1], fx*c.v, 0, fz*c.v, isDirt);
      }
    } else {
      D.prevRear = null;
      if(isDirt && Math.abs(c.v) > 6 && RE.quality >= 2){
        D.smokeT -= dt;
        if(D.smokeT <= 0){
          D.smokeT = 0.09;
          RE.spawnSmoke(rearL[0], H(rearL[0], rearL[1]), rearL[1], fx*c.v*0.4, 0, fz*c.v*0.4, true);
          RE.spawnSmoke(rearR[0], H(rearR[0], rearR[1]), rearR[1], fx*c.v*0.4, 0, fz*c.v*0.4, true);
        }
      }
    }
  };
  /* 7. 3D INSTANCED WIND GRASS + PER-FRAME REALENGINE SYNC */
  RE.createGrassSystem = function(scene, H, isGrassOk){
    const COUNT = 2600, RADIUS = 34;
    const pos = [], nrm = [], uv = [], idx = []; let vi = 0;
    [[0,0,0,.22,.34],[.06,-.05,1.05,.19,.28],[-.06,.04,2.15,.21,.31],[.02,.07,.55,.17,.24]].forEach(([ox,oz,ang,w,h]) => {
      const ca = Math.cos(ang), sa = Math.sin(ang), hw = w * 0.5;
      const pts = [[ox-ca*hw,0,oz-sa*hw],[ox+ca*hw,0,oz+sa*hw],[ox-ca*hw*.55+sa*.03,h*.52,oz-sa*hw*.55-ca*.03],[ox+ca*hw*.55+sa*.03,h*.52,oz+sa*hw*.55-ca*.03],[ox+sa*.09,h,oz-ca*.09]];
      pts.forEach((p, k) => { pos.push(p[0], p[1], p[2]); nrm.push(0, 1, 0); uv.push(k % 2, k < 2 ? 0 : k < 4 ? 0.55 : 1); });
      idx.push(vi, vi+1, vi+2, vi+1, vi+3, vi+2, vi+2, vi+3, vi+4); vi += 5;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0.0, side: THREE.DoubleSide, envMapIntensity: 0.3 });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTime = RE.sharedUniforms.uTime; sh.uniforms.uSunDir = RE.sharedUniforms.uSunDir;
      sh.uniforms.uSunCol = RE.sharedUniforms.uSunCol; sh.uniforms.uNight = RE.sharedUniforms.uNight;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;varying float vBH;varying vec3 vGWP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBH=uv.y;vec3 ip=instanceMatrix[3].xyz;float wn=sin(uTime*1.9+ip.x*.35+ip.z*.28)+.4*sin(uTime*3.7+ip.x*.9-ip.z*.6);float bd=uv.y*uv.y;transformed.x+=wn*.085*bd;transformed.z+=wn*.045*bd;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvGWP=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vBH;varying vec3 vGWP;uniform vec3 uSunDir,uSunCol;uniform float uNight;')
        .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb*=mix(.42,1.18,vBH);if(distance(vGWP,cameraPosition)>33.5)discard;')
        .replace('#include <dithering_fragment>', '{vec3 gV=normalize(cameraPosition-vGWP);float bl=pow(clamp(dot(-gV,normalize(uSunDir)),0.,1.),3.)*vBH;gl_FragColor.rgb+=diffuseColor.rgb*uSunCol*bl*.45*(1.-uNight*.9);}\n#include <dithering_fragment>');
    };
    const im = new THREE.InstancedMesh(geo, mat, COUNT); im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
    const dummy = new THREE.Object3D(), cTmp = new THREE.Color();
    let lastX = 1e9, lastZ = 1e9, lastSeason = -1;
    const h2 = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
    const SG = [[0x5d8d36,0x6ea040,0x4f7d2e,0x7cb048],[0x487a2c,0x558834,0x3f6e26,0x62923c],[0x6b7f36,0x7d8a3c,0x5d7232,0x8f8842],[0x9ca4a8,0x8b867a,0xa8b0b4,0x7d7a70]];
    return {
      mesh: im,
      update(px, pz, season, inside){
        if(inside || RE.quality < 2){ im.visible = false; return; }
        im.visible = true;
        if(Math.hypot(px - lastX, pz - lastZ) < 2.2 && season === lastSeason) return;
        lastX = px; lastZ = pz; lastSeason = season;
        const pal = SG[season] || SG[2], step = 1.25, gx0 = Math.floor((px - RADIUS) / step), gz0 = Math.floor((pz - RADIUS) / step), span = Math.floor((RADIUS * 2) / step);
        let n = 0;
        for(let iz = 0; iz <= span && n < COUNT; iz++){
          for(let ix = 0; ix <= span && n < COUNT; ix++){
            const cx = gx0 + ix, cz = gz0 + iz, r1 = h2(cx, cz), r2 = h2(cz + 13.7, cx - 5.3);
            const wx = (cx + r1 * 0.85) * step, wz = (cz + r2 * 0.85) * step, d2 = (wx - px)**2 + (wz - pz)**2;
            if(d2 > RADIUS * RADIUS || !isGrassOk(wx, wz)) continue;
            const fade = clamp(1 - (Math.sqrt(d2) - RADIUS * 0.65) / (RADIUS * 0.35), 0.18, 1);
            const sc = (0.78 + h2(cx * 3.1, cz * 2.7) * 0.65) * fade;
            dummy.position.set(wx, H(wx, wz) + 0.02, wz); dummy.rotation.set(0, r1 * 6.283, 0); dummy.scale.set(sc, sc * (0.85 + r2 * 0.45), sc);
            dummy.updateMatrix(); im.setMatrixAt(n, dummy.matrix); im.setColorAt(n, cTmp.setHex(pal[Math.abs(cx * 7 + cz * 13) % pal.length])); n++;
          }
        }
        im.count = n; im.instanceMatrix.needsUpdate = true; if(im.instanceColor) im.instanceColor.needsUpdate = true;
      }
    };
  };

  const _sunW = new THREE.Vector3(), _camF = new THREE.Vector3();
  RE.updateFrame = function(dt, tAll, camera, SUNDIR, sunColor, skyU, fogColor, wet, rain, snow, inside){
    const u = RE.sharedUniforms;
    u.uTime.value = tAll; u.uWet.value = wet; u.uRain.value = rain; u.uSnow.value = snow ? 1 : 0;
    u.uSunDir.value.copy(SUNDIR); u.uSunCol.value.copy(sunColor);
    u.uSkyHor.value.copy(skyU.hor.value); u.uSkyZen.value.copy(skyU.zen.value);
    u.uNight.value = skyU.night.value; u.uFogColor.value.copy(fogColor);
    RE.wetness = wet; RE.rainIntensity = rain; RE.inside = !!inside;
    camera.getWorldDirection(_camF);
    const dotS = _camF.dot(SUNDIR);
    if(dotS > 0.05 && SUNDIR.y > 0.02 && skyU.night.value < 0.75){
      _sunW.copy(camera.position).addScaledVector(SUNDIR, 1000).project(camera);
      RE.sunScreen.set(_sunW.x * 0.5 + 0.5, _sunW.y * 0.5 + 0.5);
      RE.sunVis = clamp((dotS - 0.05) * 1.6, 0, 1) * clamp(1.25 - Math.hypot(RE.sunScreen.x - 0.5, RE.sunScreen.y - 0.5), 0, 1) * (1 - skyU.night.value) * clamp(1 - rain * 0.85, 0.1, 1);
    } else RE.sunVis = 0;
    RE.updateVehicleFX(dt, camera);
  };
})();
