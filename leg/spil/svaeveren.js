// Spil: Svæveren — en lille ræv med en farvet skærm svæver rundt over en ø (rigtig 3D med three.js).
// Stil: "billedbog" — tegnefilms-skygger i få trin, blommefarvede omrids, pastelfarver og lilla skygger.
// 1) Ræven står på toppen af bjerget. Tryk, så løber den, skærmen folder sig ud, og den hopper ud.
// 2) Hold fingeren til venstre eller højre på skærmen for at dreje. Højt oppe på skærmen læner ræven sig tilbage
//    og svæver langsomt; langt nede læner den sig frem og får fart på (men daler også hurtigere).
//    Glitrende vindsøjler løfter ræven højt op; man kan flyve gennem skyerne.
//    Stjerner i luften kan fanges: der ligger altid én lige foran ræven, og tæt på trækkes de hen til den.
//    Blød baggrundsmusik bliver lysere, jo højere man er; den dukker sig under stemmen, og 🎵 slår den fra.
// 3) Ræven daler langsomt og lander til sidst (på græsset, på stranden eller i vandet).
//    Tryk, så løfter en hvirvelvind den op i luften igen, og man flyver videre.
// Ingen tabe-tilstand: man kan ikke styrte, kun lande.
(function () {
  const R = 175, S = 470;          // øens radius og terrænets størrelse
  const FART = 10.5;               // grundfart fremad
  const SYNK = .85;                // hvor hurtigt ræven daler (lavt, så man kan blive ved med at svæve)
  const LOEFT = 7.5;               // vindsøjlernes løft
  const DREJ = 1.2;                // drejehastighed (radianer/s)
  const LOFT = 100;                // højere op end det løfter vinden ikke
  const TOP = { x: -18, z: -26 };  // bjergtoppen, hvor man starter
  const SOL = [-.5, .42, -.75];    // retning mod solen
  const VINDE = [[34, -62], [-72, 18], [58, 38], [-22, 84], [104, -12], [-112, -64], [10, 20]];
  const PIV = 4.6;                 // ræven hænger og svinger om dette punkt under skærmen
  const CELLER = 7, UNDER = 2, KORDE = 6, SPAN = 1.0, RR = 3.6, TOPH = 4.9; // skærmens form
  const SKAERMFARVER = ["#ff8a7a", "#ffb877", "#ffe07a", "#9ee39a", "#7cc8f2", "#a99cf2", "#f59ac8"];
  const STREG = "#3d2b3d";         // omrids-farven (blomme)
  const HORISONT = "#ffe4c8";
  const GEM = "lk-svaev-stjerner";
  const ROS = ["ros-0", "ros-1", "ros-2", "ros-3", "ros-4"];
  const roligt = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };

  Spil.css("css-svaeveren", `
    .sv{position:absolute;inset:0;overflow:hidden;background:linear-gradient(#7cb8ee,#ffe4c8)}
    .sv-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
    .sv-vent{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:clamp(60px,14vh,140px);
      animation:sv-svaev 2s ease-in-out infinite}
    @keyframes sv-svaev{0%,100%{transform:translateY(-12px) rotate(-6deg)}50%{transform:translateY(12px) rotate(6deg)}}
    .sv-knap{position:absolute;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);
      width:clamp(84px,14vh,130px);aspect-ratio:1;border-radius:50%;background:var(--card);
      box-shadow:0 6px 0 rgba(61,43,61,.3);display:flex;align-items:center;justify-content:center;
      font-size:clamp(46px,8vh,74px);line-height:1;animation:sv-hop 1.4s ease-in-out infinite}
    .sv-knap[hidden]{display:none}
    .sv-knap,.sv-musik{padding:0;font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif}
    .sv-knap:active{transform:translateX(-50%) translateY(4px)}
    @keyframes sv-hop{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.1)}}
    .sv-stj{position:absolute;top:calc(2vh + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));
      padding:8px 18px;border-radius:40px;background:rgba(255,250,240,.8);box-shadow:0 4px 0 rgba(61,43,61,.2);
      font:700 clamp(26px,4.5vh,40px)/1.1 var(--display,system-ui);color:#7a5200;pointer-events:none}
    .sv-stj.pop{animation:sv-pop .5s ease-out}
    .sv-musik{position:absolute;top:calc(2vh + clamp(52px,8vh,70px) + 12px + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));
      width:clamp(60px,8.5vh,76px);aspect-ratio:1;border-radius:50%;background:rgba(255,250,240,.8);box-shadow:0 4px 0 rgba(61,43,61,.2);
      display:flex;align-items:center;justify-content:center;font-size:clamp(28px,4.5vh,40px);line-height:1}
    .sv-musik.fra{opacity:.55;filter:grayscale(1)}
    .sv-musik:active{transform:translateY(3px)}
    @keyframes sv-pop{40%{transform:scale(1.3)}}
    @media (prefers-reduced-motion:reduce){.sv-vent,.sv-knap,.sv-stj.pop{animation:none}}
  `);

  let T, root, alive, timers, raf, cv, renderer, scene, camera, envTex, sol, himmel, tidU, gradient;
  let raev, rig, indre, raevPivot, krop, hoved, oejne = [], oerer = [], ben = [], hale, halePivot, toerklaede;
  let skaermGeo, skaermMesh, snorGeo, spor, striber, vindPunkter, vindData, hvirvelPunkter, skyGrp, fugle, stjerner;
  let tex = [], matCache = {};
  let fase, p, yaw, yawFart, vy, fart, bank, faseTid, sidstTid, landetI, landetVed = 0, kamPos, kamSe, kamRul, fov, fovKick;
  let kol = 1, svR = { x: 0, v: 0 }, svP = { x: 0, v: 0 }, haleS = { x: 0, v: 0 }, iVind = false, blink = 0, naesteBlink = 3;
  let finger = null, taster = { v: false, h: false, n: false, o: false }, styr = 0, styrTid = 0, flyveTid = 0;
  let laen = 0, kropLaen = 0, kropHop = 0;   // læn frem (+) / tilbage (-)
  let sagt = {}, antalOp = 0, antalStj = 0, ventLyd = 0, naesteForan = 0;
  let lyd = null, musikTil = true;
  const MUSIK = "lk-svaev-musik";
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));
  const $ = s => root.querySelector(s);
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const klem = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ---------- Øen: højde som funktion af (x, z) ---------- */
  function hash(i, j) {
    let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + 1013904223) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function stoej(x, z) {
    const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
    const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, z) { let s = 0, a = .5, f = 1; for (let o = 0; o < 4; o++) { s += a * stoej(x * f, z * f); f *= 2.03; a *= .5; } return s / .9375; }
  function hoejde(x, z) {
    const d = Math.hypot(x, z) / R + (fbm(x * .008 + 7, z * .008 + 3) - .5) * .35;
    const oe = 1 - ss(.72, 1.02, d);                  // 1 på øen, 0 ude i havet
    const bakker = 2.5 + 11 * fbm(x * .018, z * .018) + 5 * ss(.45, .8, fbm(x * .05 + 11, z * .05));
    const dx = x - TOP.x, dz = z - TOP.z;
    const bjerg = Math.min(46, 54 * Math.exp(-(dx * dx + dz * dz) / (2 * 27 * 27)) * (.88 + .24 * fbm(x * .04, z * .04)));
    const bakke2 = 24 * Math.exp(-((x - 70) ** 2 + (z - 55) ** 2) / (2 * 22 * 22));
    return -12 + (bakker + bjerg + bakke2 + 12) * oe;
  }
  const bund = (x, z) => Math.max(0, hoejde(x, z));   // jorden eller vandoverfladen
  function haeldning(x, z) {
    const gx = (hoejde(x + 1, z) - hoejde(x - 1, z)) / 2, gz = (hoejde(x, z + 1) - hoejde(x, z - 1)) / 2;
    return 1 / Math.sqrt(1 + gx * gx + gz * gz);      // 1 = fladt
  }
  // Den retning, hvor der er mest fri luft foran (bruges ved start og efter hvirvelvinden)
  function friRetning(x, z, y) {
    let bedst = 0, bedstV = -1e9;
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2, sx = Math.sin(a), sz = Math.cos(a);
      let maks = -99; for (let s = 6; s <= 60; s += 6) maks = Math.max(maks, bund(x + sx * s, z + sz * s));
      const indad = -(sx * x + sz * z) / (Math.hypot(x, z) + 1);   // helst ind over øen
      const v = (y - maks) + indad * 6;
      if (v > bedstV) { bedstV = v; bedst = a; }
    }
    return bedst;
  }

  /* ---------- Stilen: tegnefilms-materialer, omrids og vind i shaderen ---------- */
  // Alle planter, flaget og omridsene bøjer sig i den samme vind (samme retning, faseforskudt efter stedet).
  function stil(mat, o = {}) {
    const sway = o.sway || 0, tyk = o.tyk || 0, flag = !!o.flag;
    mat.customProgramCacheKey = () => `sv-${sway}-${tyk}-${flag}`;
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTid = tidU;
      sh.vertexShader = "uniform float uTid;\n" + sh.vertexShader
        .replace("#include <begin_vertex>", `#include <begin_vertex>
          ${flag ? "transformed.z += sin(position.x * 3.0 - uTid * 7.0) * 0.16 * position.x + sin(position.y * 4.0 - uTid * 5.0) * 0.04 * position.x;" : ""}
          ${tyk ? `transformed += normalize(normal) * ${tyk.toFixed(4)};` : ""}`)
        .replace("#include <project_vertex>", `
          vec4 mvPosition = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
            vec3 rodV = instanceMatrix[3].xyz;
          #else
            vec3 rodV = vec3(0.0);
          #endif
          ${sway ? `{
            vec3 rw = (modelMatrix * vec4(rodV, 1.0)).xyz;
            float hh = max((modelMatrix * mvPosition).y - rw.y, 0.0);
            float ph = uTid * 1.6 + rw.x * 0.09 + rw.z * 0.06;
            float sv = (sin(ph) * 0.6 + sin(ph * 2.7 + 1.3) * 0.25 + 0.4) * ${sway.toFixed(4)} * hh * hh;
            mvPosition.x += sv * 0.8; mvPosition.z += sv * 0.45;
          }` : ""}
          mvPosition = modelViewMatrix * mvPosition;
          gl_Position = projectionMatrix * mvPosition;`);
    };
    return mat;
  }
  function toon(farve, o = {}) {
    const k = farve + JSON.stringify(o);
    if (!matCache[k]) matCache[k] = stil(new T.MeshToonMaterial({ color: farve, gradientMap: gradient, side: o.side || T.FrontSide, vertexColors: !!o.vc }), o);
    return matCache[k];
  }
  function streg(tyk, o = {}) {
    const k = "streg" + tyk + JSON.stringify(o);
    if (!matCache[k]) matCache[k] = stil(new T.MeshBasicMaterial({ color: STREG, side: T.BackSide }), { ...o, tyk });
    return matCache[k];
  }

  /* ---------- Teksturer ---------- */
  function prikTex() {
    const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.35, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; tex.push(t); return t;
  }

  /* ---------- Lyd: følger flyvningen ---------- */
  // vind:    susen der stiger i styrke og tone med farten
  // sus:     et lyst "swish", når ræven svinger under skærmen eller drejer skarpt
  // flagren: skærmens stof, der blafrer (hurtigere og kraftigere ved høj fart og i sving)
  // klang:   en blød, glitrende akkord inde i vindsøjlerne og i hvirvelvinden
  function lydStart() {
    try {
      const ac = Spil.audio(), n = ac.sampleRate * 2, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
      let b = 0; for (let i = 0; i < n; i++) { b = b * .97 + (Math.random() * 2 - 1) * .03; d[i] = b * 6; }
      const hvid = ac.createBuffer(1, n, ac.sampleRate), h = hvid.getChannelData(0);
      for (let i = 0; i < n; i++) h[i] = Math.random() * 2 - 1;
      const master = ac.createGain(); master.gain.value = .9; master.connect(ac.destination);
      const kilde = (bf) => { const s = ac.createBufferSource(); s.buffer = bf; s.loop = true; s.start(); return s; };
      const filter = (type, f, q) => { const x = ac.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
      const gain = v => { const g = ac.createGain(); g.gain.value = v; return g; };
      const brun = kilde(buf), lys = kilde(hvid);
      const vF = filter("bandpass", 400, .6), vG = gain(0); brun.connect(vF).connect(vG).connect(master);
      const sF = filter("bandpass", 1800, .9), sG = gain(0); lys.connect(sF).connect(sG).connect(master);
      const fF = filter("bandpass", 260, 2.2), fMod = gain(.5), fG = gain(0); brun.connect(fF).connect(fMod).connect(fG).connect(master);
      const lfo = ac.createOscillator(); lfo.type = "triangle"; lfo.frequency.value = 9;
      const lfoG = gain(.5); lfo.connect(lfoG).connect(fMod.gain); lfo.start();
      const kG = gain(0), kTrem = gain(.6); kTrem.connect(kG).connect(master);
      const trem = ac.createOscillator(); trem.frequency.value = 5.5; const tremG = gain(.4); trem.connect(tremG).connect(kTrem.gain); trem.start();
      const toner = [523.25, 659.25, 783.99, 1046.5].map((f, i) => {
        const o = ac.createOscillator(); o.type = "sine"; o.frequency.value = f; o.detune.value = (i - 1.5) * 4;
        const g = gain(.25 / (i + 1)); o.connect(g).connect(kTrem); o.start(); return o;
      });
      // Musik: en blød flade af akkorder gennem et filter, der åbner sig (bliver lysere) jo højere ræven er,
      // og spredte klokketoner, der kommer oftere højt oppe. Den dukker sig, når stemmen taler.
      const mG = gain(0), mF = filter("lowpass", 500, .5); mF.connect(mG); mG.connect(master);
      const klokke = gain(1); klokke.connect(mG);
      lyd = { ac, master, vF, vG, sF, sG, fG, lfo, kG, mG, mF, klokke, naesteAkkord: ac.currentTime + .3, akkordNr: 0, naesteKlokke: ac.currentTime + 3,
        kilder: [brun, lys, lfo, trem, ...toner] };
    } catch (e) { lyd = null; }
  }
  // C-dur: C(add9) – Am7 – Fmaj7 – G(sus)
  const AKKORDER = [[130.81, 196, 293.66, 329.63], [110, 164.81, 261.63, 392], [87.31, 174.61, 220, 329.63], [98, 146.83, 293.66, 392]];
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
  const AKKORD_LAENGDE = 7;
  function musikTrin(hoejdeF) {
    const ac = lyd.ac, nu = ac.currentTime;
    if (lyd.naesteAkkord < nu + .5) {
      const t0 = Math.max(lyd.naesteAkkord, nu), varig = AKKORD_LAENGDE + 3.5;
      AKKORDER[lyd.akkordNr++ % AKKORDER.length].forEach((f, i) => {
        for (const [type, det, v] of [["sine", 0, .05], ["triangle", 7, .018]]) {
          const o = ac.createOscillator(), g = ac.createGain();
          o.type = type; o.frequency.value = f; o.detune.value = det * (i % 2 ? 1 : -1);
          g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + 2.2);
          g.gain.setValueAtTime(v, t0 + AKKORD_LAENGDE); g.gain.linearRampToValueAtTime(0, t0 + varig);
          o.connect(g).connect(lyd.mF); o.start(t0); o.stop(t0 + varig + .1);
        }
      });
      lyd.naesteAkkord = t0 + AKKORD_LAENGDE;
    }
    if (lyd.naesteKlokke < nu) {
      // Højt oppe: flere og lysere klokketoner
      const n = PENTA.length, lav = Math.floor(hoejdeF * 3), f = PENTA[lav + Math.floor(Math.random() * (n - 3))];
      const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = f; o2.type = "sine"; o2.frequency.value = f * 2;
      const g2 = ac.createGain(); g2.gain.value = .25;
      g.gain.setValueAtTime(0, nu); g.gain.linearRampToValueAtTime(.035, nu + .02); g.gain.exponentialRampToValueAtTime(.0005, nu + 2.6);
      o.connect(g); o2.connect(g2).connect(g); g.connect(lyd.klokke);
      o.start(nu); o2.start(nu); o.stop(nu + 2.7); o2.stop(nu + 2.7);
      lyd.naesteKlokke = nu + (3.4 - hoejdeF * 2) * (.6 + Math.random() * .8);
    }
  }
  function saetMusik(til) {
    musikTil = til;
    try { localStorage.setItem(MUSIK, til ? "1" : "0"); } catch (e) {}
    const b = root && $(".sv-musik"); if (b) { b.classList.toggle("fra", !til); b.textContent = til ? "🎵" : "🔇"; }
  }
  function lydTrin() {
    if (!lyd) return;
    const ac = lyd.ac, nu = ac.currentTime, saet = (param, v, tau = .15) => { try { param.setTargetAtTime(v, nu, tau); } catch (e) {} };
    const flyver = fase === "flyv", hvirvl = fase === "hvirvel";
    const fn = klem((fart - 5) / 13, 0, 1);            // 0 = langsomt, 1 = meget hurtigt
    const swing = Math.abs(svR.v) + Math.abs(svP.v);   // hvor hurtigt ræven svinger
    saet(lyd.vG.gain, flyver ? .02 + fn * fn * .11 + Math.max(0, -vy - 3) * .006 : hvirvl ? .1 : 0, .25);
    saet(lyd.vF.frequency, flyver ? 260 + fn * 650 : 700, .3);
    saet(lyd.sG.gain, flyver ? Math.min(.09, swing * .05 + Math.abs(yawFart) * .025) : 0, .08);
    saet(lyd.sF.frequency, 1300 + Math.min(1500, swing * 900), .1);
    saet(lyd.fG.gain, flyver ? .015 + Math.abs(styr) * .05 + Math.max(0, fn - .55) * .12 : hvirvl ? .03 : 0, .2);
    saet(lyd.lfo.frequency, 6 + fn * 14 + Math.abs(styr) * 4, .2);
    saet(lyd.kG.gain, (flyver && iVind) || hvirvl ? .05 : 0, iVind || hvirvl ? .4 : .8);
    // Musikken: højden (0 ved jorden, 1 højt oppe) styrer, hvor lys den er
    const hoejdeF = p ? klem((p.y - bund(p.x, p.z)) / 55, 0, 1) : 0;
    musikTrin(hoejdeF);
    // Musikken er en baggrund: lav, og næsten væk mens stemmen taler (kommer langsomt igen bagefter)
    const taler = Spil.isTalking();
    const mVol = !musikTil ? 0 : (flyver || hvirvl ? .45 : .3) * (taler ? .08 : 1);
    saet(lyd.mG.gain, mVol, taler ? .08 : 1.5);
    saet(lyd.mF.frequency, 420 + hoejdeF * hoejdeF * 2600, .8);
  }
  function lydStop() {
    if (!lyd) return;
    lyd.kilder.forEach(s => { try { s.stop(); } catch (e) {} });
    try { lyd.master.disconnect(); } catch (e) {}
    lyd = null;
  }

  /* ---------- Scenen ---------- */
  const srgb = hex => { const v = parseInt(hex.slice(1), 16); return new T.Vector3((v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255); };

  function himmelMat() {
    return new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false, toneMapped: false,
      uniforms: { top: { value: srgb("#6fb0ec") }, horisont: { value: srgb(HORISONT) }, hav: { value: srgb("#5bb0c9") },
        solFarve: { value: srgb("#fff1d0") }, solDir: { value: new T.Vector3(...SOL).normalize() } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      // Farverne regnes direkte i sRGB, så horisonten bliver præcis samme farve som tågen
      fragmentShader: `uniform vec3 top, horisont, hav, solFarve, solDir; varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir); float y = d.y;
          vec3 c = y > 0.0 ? mix(horisont, top, pow(y, 0.55)) : mix(horisont, hav, pow(min(-y * 5.0, 1.0), 0.6));
          c = mix(c, vec3(1.0, 0.86, 0.9), smoothstep(0.25, 0.0, abs(y - 0.06)) * 0.18);  // et lyserødt bånd over horisonten
          float s = max(dot(d, solDir), 0.0);
          c += solFarve * (pow(s, 5.0) * 0.22 + pow(s, 60.0) * 0.35) * smoothstep(-0.1, 0.05, y);
          c = mix(c, vec3(1.0, 0.98, 0.9), smoothstep(0.9984, 0.9991, s));
          gl_FragColor = vec4(c, 1.0);
        }`
    });
  }

  function byg() {
    renderer = new T.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.toneMapping = T.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene();
    scene.fog = new T.Fog(HORISONT, 160, 640);
    camera = new T.PerspectiveCamera(60, 1, .3, 1800);
    tidU = { value: 0 };
    gradient = new T.DataTexture(new Uint8Array([105, 170, 225, 255]), 4, 1, T.RedFormat);
    gradient.minFilter = gradient.magFilter = T.NearestFilter; gradient.needsUpdate = true; tex.push(gradient);

    himmel = new T.Mesh(new T.SphereGeometry(900, 32, 16), himmelMat()); himmel.renderOrder = -1; scene.add(himmel);
    const pm = new T.PMREMGenerator(renderer), envScene = new T.Scene();
    envScene.add(new T.Mesh(new T.SphereGeometry(50, 32, 16), himmel.material));
    envTex = pm.fromScene(envScene, .02).texture; scene.environment = envTex; pm.dispose();
    envScene.children[0].geometry.dispose();

    // Lyst og varmt fra solen, lilla i skyggerne
    scene.add(new T.HemisphereLight("#d4e6ff", "#b9a2d6", 1.25));
    sol = new T.DirectionalLight("#ffe2b8", 2.1);
    sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -.0006; sol.shadow.normalBias = .5;
    Object.assign(sol.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 10, far: 320 });
    scene.add(sol, sol.target);

    bygTerraen(); bygVand(); bygFjerneOeer(); bygPlanter(); bygSkyer(); bygVinde(); bygStjerner(); bygFugle(); bygFlag();
    bygRaev(); bygSkaerm(); bygSpor(); bygStriber();  }

  function bygTerraen() {
    const N = 160, g = new T.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
    const pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) pa.setY(i, hoejde(pa.getX(i), pa.getZ(i)));
    g.computeVertexNormals();
    const C = h => new T.Color(h);
    const P = { vaad: C("#e6c58c"), sand: C("#ffe2b0"), g1: C("#a6dc7c"), g2: C("#68b86c"), g3: C("#d2dc80"),
      lyser: C("#f5b9d2"), gul: C("#ffe48a"), sten: C("#c3b3d6"), sten2: C("#a291bd") };
    const na = g.attributes.normal, farver = new Float32Array(pa.count * 3), o = new T.Color();
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), z = pa.getZ(i), h = pa.getY(i), ny = na.getY(i);
      if (h < .25) o.copy(P.vaad);
      else if (h < 1.9) o.copy(P.sand);
      else {
        o.copy(P.g1).lerp(P.g2, ss(.4, .7, fbm(x * .025 + 40, z * .025))).lerp(P.g3, ss(24, 46, h));
        if (h < 2.8) o.lerp(P.sand, .5);
        const eng = fbm(x * .045 - 13, z * .045 + 21);          // enge med lyserøde og gule blomster
        if (ny > .9 && h < 32) { o.lerp(P.lyser, ss(.66, .78, eng) * .45); o.lerp(P.gul, ss(.34, .22, eng) * .4); }
        const stejl = ss(.88, .7, ny);
        if (stejl > 0) o.lerp(h > 22 ? P.sten : P.sten2, stejl);
      }
      farver[i * 3] = o.r; farver[i * 3 + 1] = o.g; farver[i * 3 + 2] = o.b;
    }
    g.setAttribute("color", new T.BufferAttribute(farver, 3));
    const m = new T.Mesh(g, toon("#ffffff", { vc: true })); m.receiveShadow = true; scene.add(m);
  }

  function bygVand() {
    // Dybden under vandet gemmes i en tekstur, så vandet kan være lyst ved kysten og have skum langs stranden
    const n = 256, data = new Uint8Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = (i + .5) / n * S - S / 2, z = (j + .5) / n * S - S / 2;
      data[j * n + i] = Math.round(klem(-hoejde(x, z) / 7, 0, 1) * 255);
    }
    const dyb = new T.DataTexture(data, n, n, T.RedFormat); dyb.minFilter = dyb.magFilter = T.LinearFilter; dyb.needsUpdate = true; tex.push(dyb);
    const u = T.UniformsUtils.merge([T.UniformsLib.fog]);
    Object.assign(u, { uTid: tidU, uDybde: { value: dyb }, uLav: { value: srgb("#93ecd9") }, uDyb: { value: srgb("#3f9bd0") },
      uSkum: { value: srgb("#ffffff") }, uSol: { value: new T.Vector3(...SOL).normalize() } });
    const mat = new T.ShaderMaterial({
      fog: true, uniforms: u,
      vertexShader: `uniform float uTid; varying vec3 vW;
        #include <fog_pars_vertex>
        void main(){
          vec4 w = modelMatrix * vec4(position, 1.0);
          w.y += sin(w.x * 0.15 + uTid * 1.1) * 0.09 + cos(w.z * 0.13 + uTid * 0.9) * 0.09;
          vW = w.xyz;
          vec4 mvPosition = viewMatrix * w;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform float uTid; uniform sampler2D uDybde; uniform vec3 uLav, uDyb, uSkum, uSol; varying vec3 vW;
        #include <common>
        #include <fog_pars_fragment>
        void main(){
          float d = texture2D(uDybde, vW.xz / ${S}.0 + 0.5).r;
          vec3 c = mix(uLav, uDyb, smoothstep(0.02, 0.55, d));
          float b = 0.5 + 0.5 * sin(uTid * 1.6 - d * 45.0);
          float skum = smoothstep(0.075, 0.0, d - 0.03 * b);
          float skum2 = smoothstep(0.02, 0.0, abs(d - 0.12 - 0.05 * sin(uTid * 0.8 - d * 20.0))) * 0.35;
          c = mix(c, uSkum, skum * 0.9 + skum2);
          float n = sin(vW.x * 0.9 + uTid * 1.3) * sin(vW.z * 0.8 - uTid * 1.1) + sin((vW.x - vW.z) * 0.45 + uTid * 0.7) * 0.5;
          vec3 v = normalize(cameraPosition - vW);
          float glans = pow(max(dot(reflect(-uSol, vec3(0.0, 1.0, 0.0)), v), 0.0), 20.0);
          c += vec3(1.0, 0.95, 0.85) * (smoothstep(1.05, 1.25, n) * (0.25 + glans) + glans * 0.2);
          gl_FragColor = vec4(c, 1.0);
          #include <fog_fragment>
        }`
    });
    const v = new T.Mesh(new T.PlaneGeometry(3000, 3000, 80, 80), mat);
    v.rotation.x = -Math.PI / 2; scene.add(v);
  }

  function bygFjerneOeer() {
    // Lilla silhuetter af øer langt ude i disen giver dybde
    const mat = new T.MeshBasicMaterial({ color: "#c9b3d4" }), geo = new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + .4, r = 480 + (i % 3) * 40, h = 22 + (i * 37 % 34), b = 55 + (i * 23 % 60);
      const m = new T.Mesh(geo, mat);
      m.position.set(Math.cos(a) * r, -2, Math.sin(a) * r); m.scale.set(b, h, b * .6); m.rotation.y = -a;
      scene.add(m);
    }
  }

  function bygPlanter() {
    const stamme = new T.CylinderGeometry(.2, .32, 2.0, 6); stamme.translate(0, 1.0, 0);
    const gran = new T.LatheGeometry([[0, 1.1], [1.55, 1.1], [.65, 2.35], [1.25, 2.35], [.45, 3.5], [.9, 3.5], [0, 4.8]].map(([x, y]) => new T.Vector2(x, y)), 8);
    const rund = new T.SphereGeometry(1.55, 11, 8); rund.scale(1, .9, 1); rund.translate(0, 3.1, 0);
    const busk = new T.SphereGeometry(.85, 10, 7); busk.scale(1, .75, 1); busk.translate(0, .45, 0);
    const sten = new T.DodecahedronGeometry(1, 0);
    const blomst = new T.OctahedronGeometry(.2, 0); blomst.translate(0, .45, 0);
    const straa = new T.BufferGeometry(), sp = [];
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2, c = Math.cos(a) * .07, s = Math.sin(a) * .07, tx = Math.cos(a + .6) * .12, tz = Math.sin(a + .6) * .12;
      sp.push(-s, 0, c, s, 0, -c, tx, .55 + k * .08, tz); }
    straa.setAttribute("position", new T.Float32BufferAttribute(sp, 3)); straa.computeVertexNormals();

    const V = .0055; // samme vind for stamme og krone, så de hænger sammen
    const lav = (geo, n, o = {}) => {
      const m = new T.InstancedMesh(geo, stil(new T.MeshToonMaterial({ color: "#ffffff", gradientMap: gradient, side: o.side || T.FrontSide }), { sway: o.sway || 0 }), n);
      m.castShadow = !!o.skygge; m.receiveShadow = true; m.count = 0; scene.add(m);
      if (o.tyk) { m.userData.o = new T.InstancedMesh(geo, stil(new T.MeshBasicMaterial({ color: STREG, side: T.BackSide }), { sway: o.sway || 0, tyk: o.tyk }), n); m.userData.o.count = 0; scene.add(m.userData.o); }
      return m;
    };
    const mS = lav(stamme, 900, { sway: V, tyk: .07, skygge: true }), mG = lav(gran, 500, { sway: V, tyk: .09, skygge: true }),
      mR = lav(rund, 500, { sway: V, tyk: .09, skygge: true }), mB = lav(busk, 400, { sway: .03, tyk: .06, skygge: true }),
      mSt = lav(sten, 160, { tyk: .06, skygge: true }), mBl = lav(blomst, 1800, { sway: .5 }), mGr = lav(straa, 4000, { sway: 1.2, side: T.DoubleSide });
    const M = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sk = new T.Vector3(), pos = new T.Vector3(), col = new T.Color();
    const saet = (m, x, y, z, s, sy = s, farve, v = .06) => {
      e.set(0, Math.random() * 6.3, 0); q.setFromEuler(e); sk.set(s, sy, s); pos.set(x, y, z);
      M.compose(pos, q, sk); m.setMatrixAt(m.count, M);
      if (m.userData.o) { m.userData.o.setMatrixAt(m.count, M); m.userData.o.count++; }
      col.set(farve).offsetHSL((Math.random() - .5) * .03, 0, (Math.random() - .5) * v); m.setColorAt(m.count, col);
      m.count++;
    };
    const vedTop = (x, z) => Math.hypot(x - TOP.x, z - TOP.z) < 16;
    const kroner = ["#7cc96b", "#7cc96b", "#9bd46a", "#62b56c", "#f7a8c4", "#f2c45a"];
    for (let i = 0; i < 16000; i++) {
      const x = (Math.random() * 2 - 1) * R * 1.05, z = (Math.random() * 2 - 1) * R * 1.05, h = hoejde(x, z);
      if (h < 1.5 || Math.hypot(x - TOP.x, z - TOP.z) < 4) continue;
      const fl = haeldning(x, z), skov = fbm(x * .02 + 5, z * .02 - 9);
      // (hold antallet under hver InstancedMesh' plads, ellers tegnes der skrald)
      if (h > 2.6 && h < 40 && fl > .86 && skov > .5 && !vedTop(x, z) && mS.count < 900 && mG.count < 500 && mR.count < 500) {
        const s = .7 + Math.random() * .8;
        saet(mS, x, h - .2, z, s, s, "#8b5e4a");
        if (h > 18 || Math.random() < .4) saet(mG, x, h - .2, z, s, s * (.9 + Math.random() * .4), "#3f9a7c");
        else { const r = Math.random(); saet(mR, x, h - .2, z, s, s, r < .1 ? kroner[4] : r < .16 ? kroner[5] : kroner[Math.floor(Math.random() * 4)]); }
      } else if (h > 2 && fl > .8 && Math.random() < .05 && mB.count < 400) saet(mB, x, h - .1, z, .7 + Math.random() * .9, undefined, "#5fae63");
      else if (fl < .8 && Math.random() < .04 && mSt.count < 160) { const s = .6 + Math.random() * 1.6; saet(mSt, x, h, z, s, s * .7, "#c3b3d6", .08); }
      else if (h > 2 && h < 62 && fl > .85 && Math.random() < .35 && mBl.count < 1800)
        saet(mBl, x, h, z, .8 + Math.random() * .6, undefined, ["#ffffff", "#ffe066", "#ff9fbf", "#ffffff", "#c9a7ff"][Math.floor(Math.random() * 5)], .04);
      else if (h > 1.8 && h < 70 && fl > .82 && mGr.count < 4000) saet(mGr, x, h - .05, z, .8 + Math.random() * .9, undefined, "#7fc96a", .1);
    }
    for (const m of [mS, mG, mR, mB, mSt, mBl, mGr]) {
      m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
      if (m.userData.o) m.userData.o.instanceMatrix.needsUpdate = true;
    }
  }

  function bygSkyer() {
    skyGrp = new T.Group(); scene.add(skyGrp);
    const pust = new T.SphereGeometry(1, 16, 12);
    const n = 16 * 9, m = new T.InstancedMesh(pust, stil(new T.MeshToonMaterial({ color: "#ffffff", gradientMap: gradient, emissive: "#efe6ff", emissiveIntensity: .35 })), n);
    const M = new T.Matrix4(), q = new T.Quaternion(), sk = new T.Vector3(), pos = new T.Vector3();
    let k = 0;
    for (let c = 0; c < 16; c++) {
      const a = c / 16 * Math.PI * 2 + Math.random() * .3, rr = 40 + Math.random() * 190;
      const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr, cy = 62 + Math.random() * 30, st = 1 + Math.random() * .8;
      for (let i = 0; i < 9; i++) {
        const midt = 1 - Math.abs(i - 4) / 5, s = (2.5 + midt * 4 + Math.random() * 1.5) * st;
        pos.set(cx + (i - 4) * 2.8 * st, cy + s * .35, cz + (Math.random() - .5) * 5 * st);
        sk.set(s, s * .75, s * .9); M.compose(pos, q, sk); m.setMatrixAt(k++, M);
      }
    }
    skyGrp.add(m);
  }

  function bygVinde() {
    const PER = 80, n = VINDE.length * PER, pos = new Float32Array(n * 3), farve = new Float32Array(n * 3);
    vindData = [];
    const fv = ["#fffbe8", "#ffe7a8", "#ffd1e3", "#d8f5ff"].map(h => new T.Color(h));
    for (let v = 0; v < VINDE.length; v++) {
      const [x, z] = VINDE[v], b = bund(x, z);
      for (let i = 0; i < PER; i++) {
        vindData.push({ x, z, b, y: b + Math.random() * 80, a: Math.random() * 6.3, r: 1 + Math.random() * 5, f: 5 + Math.random() * 6 });
        const c = fv[i % 4], k = (v * PER + i) * 3; farve[k] = c.r; farve[k + 1] = c.g; farve[k + 2] = c.b;
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("color", new T.BufferAttribute(farve, 3));
    vindPunkter = new T.Points(g, new T.PointsMaterial({ size: 1.1, map: prikTex(), vertexColors: true, transparent: true, opacity: .65,
      depthWrite: false, blending: T.AdditiveBlending }));
    vindPunkter.frustumCulled = false; scene.add(vindPunkter);

    const hn = 160, hg = new T.BufferGeometry();
    hg.setAttribute("position", new T.BufferAttribute(new Float32Array(hn * 3), 3));
    hvirvelPunkter = new T.Points(hg, new T.PointsMaterial({ size: .55, map: prikTex(), color: "#ffffff", transparent: true, opacity: 0,
      depthWrite: false, blending: T.AdditiveBlending }));
    hvirvelPunkter.frustumCulled = false; hvirvelPunkter.userData.d = Array.from({ length: hn }, () => ({ a: Math.random() * 6.3, h: Math.random(), r: .4 + Math.random() }));
    scene.add(hvirvelPunkter);
  }
  function vindTrin(dt) {
    const pa = vindPunkter.geometry.attributes.position, arr = pa.array;
    for (let i = 0; i < vindData.length; i++) {
      const d = vindData[i];
      d.y += d.f * dt; if (d.y > d.b + 82) d.y = d.b;
      d.a += dt * (1.6 / (d.r * .4 + 1));
      const sp = d.r * (1 + (d.y - d.b) / 200);
      arr[i * 3] = d.x + Math.cos(d.a) * sp; arr[i * 3 + 1] = d.y; arr[i * 3 + 2] = d.z + Math.sin(d.a) * sp;
    }
    pa.needsUpdate = true;
  }

  function bygStjerner() {
    const s = new T.Shape();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? .45 : 1, a = i / 10 * Math.PI * 2 + Math.PI / 2; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const geo = new T.ExtrudeGeometry(s, { depth: .3, bevelEnabled: true, bevelThickness: .12, bevelSize: .1, bevelSegments: 1 }); geo.center();
    const mat = new T.MeshToonMaterial({ color: "#ffd23f", emissive: "#ffb000", emissiveIntensity: .45, gradientMap: gradient });
    const glimt = new T.SpriteMaterial({ map: prikTex(), color: "#fff1a8", transparent: true, opacity: .75, depthWrite: false, blending: T.AdditiveBlending });
    stjerner = [];
    for (let i = 0; i < 16; i++) {
      const grp = new T.Group(), m = new T.Mesh(geo, mat); m.scale.setScalar(1.7); m.castShadow = true; grp.add(m);
      m.add(new T.Mesh(geo, streg(.08)));
      const sp = new T.Sprite(glimt); sp.scale.setScalar(7); grp.add(sp);
      grp.userData = { m, ventTil: 0 }; flytStjerne(grp); scene.add(grp); stjerner.push(grp);
    }
  }
  function flytStjerne(s) {
    for (let k = 0; k < 40; k++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R * .95, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const y = bund(x, z) + 9 + Math.random() * 28;
      if (y < 85 && (!p || Math.hypot(x - p.x, z - p.z) > 30)) { s.position.set(x, y, z); s.userData.y0 = y; break; }
    }
    s.visible = true;
  }

  function bygFugle() {
    fugle = new T.Group(); scene.add(fugle);
    const krp = new T.SphereGeometry(.22, 8, 6); krp.scale(1, .8, 2.4);
    const vinge = new T.BufferGeometry();
    vinge.setAttribute("position", new T.Float32BufferAttribute([0, 0, .28, 1.4, .05, -.1, 0, 0, -.25], 3)); vinge.computeVertexNormals();
    const hvid = toon("#ffffff"), graa = toon("#dfe2ea", { side: T.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const f = new T.Group(), k = new T.Mesh(krp, hvid);
      const vh = new T.Mesh(vinge, graa), vv = new T.Mesh(vinge, graa); vv.scale.x = -1;
      f.add(k, vh, vv);
      f.userData = { vh, vv, a: i * .9, r: 55 + (i % 3) * 5, h: 42 + (i % 2) * 3, fl: Math.random() * 6 };
      fugle.add(f);
    }
  }
  function fugleTrin(dt, t) {
    fugle.children.forEach((f, i) => {
      const u = f.userData; u.a += dt * .16;
      f.position.set(20 + Math.cos(u.a) * u.r, u.h + Math.sin(t * .7 + i) * 1.5, 10 + Math.sin(u.a) * u.r);
      f.rotation.y = -u.a;
      const fl = Math.sin(t * 7 + u.fl) * .6; u.vh.rotation.z = fl; u.vv.rotation.z = -fl;
    });
  }

  function bygFlag() {
    const h = hoejde(TOP.x + 3, TOP.z - 2);
    const stang = new T.Mesh(new T.CylinderGeometry(.07, .07, 4, 6), toon("#7a5236"));
    stang.position.set(TOP.x + 3, h + 2, TOP.z - 2); stang.castShadow = true; scene.add(stang);
    stang.add(new T.Mesh(stang.geometry, streg(.04)));
    const fg = new T.PlaneGeometry(1.9, 1.1, 10, 4); fg.translate(.95, 0, 0);
    const flag = new T.Mesh(fg, stil(new T.MeshToonMaterial({ color: "#ff6f61", gradientMap: gradient, side: T.DoubleSide }), { flag: true }));
    flag.position.set(TOP.x + 3.05, h + 3.4, TOP.z - 2); flag.castShadow = true; scene.add(flag);
  }

  /* ---------- Ræven ---------- */
  function bygRaev() {
    raev = new T.Group(); scene.add(raev);
    rig = new T.Group(); rig.rotation.order = "ZXY"; rig.position.y = PIV; raev.add(rig);
    indre = new T.Group(); indre.position.y = -PIV; rig.add(indre);
    raevPivot = new T.Group(); raevPivot.position.y = PIV; raevPivot.rotation.order = "ZXY"; indre.add(raevPivot);
    krop = new T.Group(); krop.position.y = -PIV; raevPivot.add(krop);

    const OR = "#f07c32", HV = "#fff4e6", SO = "#2d1f24", BR = "#5b3a2e", RO = "#e2435a";
    const del = (geo, farve, x, y, z, o = {}) => {
      const m = new T.Mesh(geo, toon(farve)); m.position.set(x, y, z);
      if (o.r) m.rotation.set(...o.r); if (o.s) m.scale.set(...o.s);
      m.castShadow = true;
      if (o.streg !== false) m.add(new T.Mesh(geo, streg(o.tyk || .03)));
      (o.til || krop).add(m); return m;
    };
    const kugle = (r, a = 18, b = 14) => new T.SphereGeometry(r, a, b);
    // Krop og mave
    del(new T.CapsuleGeometry(.36, .42, 6, 14), OR, 0, .9, 0, { r: [.18, 0, 0] });
    del(kugle(.3), HV, 0, .86, .2, { s: [.92, 1.15, .62], streg: false });
    // Ben (strømper) og arme, der holder i snorene
    for (const s of [-1, 1]) {
      const bg = new T.Group(); bg.position.set(s * .17, .62, .02); krop.add(bg); ben.push(bg);
      del(new T.CapsuleGeometry(.1, .3, 4, 8), BR, 0, -.26, 0, { til: bg });
      const arm = del(new T.CapsuleGeometry(.08, .42, 4, 8), OR, s * .34, 1.32, .06, { r: [0, 0, -s * .45] });
      del(kugle(.09, 8, 6), BR, 0, .28, 0, { til: arm, streg: false });
    }
    // Tørklæde om halsen
    del(new T.TorusGeometry(.3, .09, 8, 18), RO, 0, 1.24, .02, { r: [Math.PI / 2 + .2, 0, 0] });
    // Hovedet
    hoved = new T.Group(); hoved.position.set(0, 1.62, .08); krop.add(hoved);
    del(kugle(.5, 22, 16), OR, 0, 0, 0, { s: [1.06, .92, 1], til: hoved });
    for (const s of [-1, 1]) {
      del(kugle(.23, 12, 10), HV, s * .27, -.14, .24, { til: hoved, s: [1, .85, .9], streg: false });
      const oeje = del(kugle(.075, 10, 8), SO, s * .19, .07, .43, { til: hoved, s: [1, 1.35, .6], streg: false });
      del(kugle(.025, 6, 4), "#ffffff", .02, .035, .05, { til: oeje, streg: false });
      oejne.push(oeje);
      const og = new T.Group(); og.position.set(s * .27, .36, -.04); og.rotation.set(-.15, 0, -s * .28); hoved.add(og); oerer.push(og);
      del(new T.ConeGeometry(.18, .5, 12), OR, 0, .2, 0, { til: og });
      del(new T.ConeGeometry(.11, .32, 10), BR, 0, .17, .07, { til: og, streg: false });
    }
    del(kugle(.21, 14, 10), HV, 0, -.12, .4, { til: hoved, s: [1, .78, 1.35] });
    del(kugle(.075, 10, 8), SO, 0, -.06, .67, { til: hoved, streg: false });

    // Halen: busket, tynd ved roden, tyk på midten og med hvid spids. Den svinger efter med lidt forsinkelse.
    halePivot = new T.Group(); halePivot.position.set(0, .72, -.38); krop.add(halePivot);
    hale = new T.Group(); halePivot.add(hale);
    const HL = 1.35, prof = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14; prof.push(new T.Vector2(i === 14 ? 0 : .07 + .28 * Math.sin(Math.PI * Math.pow(t, .75)), t * HL)); }
    const hg = new T.LatheGeometry(prof, 14), hc = [], cO = new T.Color(OR), cH = new T.Color(HV);
    for (let i = 0; i < hg.attributes.position.count; i++) { const c = hg.attributes.position.getY(i) / HL > .7 ? cH : cO; hc.push(c.r, c.g, c.b); }
    hg.setAttribute("color", new T.Float32BufferAttribute(hc, 3));
    const hk = new T.Mesh(hg, toon("#ffffff", { vc: true })); hk.rotation.x = -2.1; hk.castShadow = true; hale.add(hk);
    hk.add(new T.Mesh(hg, streg(.03)));

    // Tørklædets flagrende ende: et bånd, hvis punkter flyttes hvert billede
    const tg = new T.BufferGeometry(), TN = 10;
    tg.setAttribute("position", new T.BufferAttribute(new Float32Array((TN + 1) * 2 * 3), 3));
    const idx = []; for (let i = 0; i < TN; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    tg.setIndex(idx);
    toerklaede = new T.Mesh(tg, toon(RO, { side: T.DoubleSide })); toerklaede.castShadow = true; toerklaede.frustumCulled = false;
    krop.add(toerklaede);
  }

  function toerklaedeTrin(t, kraft) {
    const pa = toerklaede.geometry.attributes.position, TN = 10;
    for (let i = 0; i <= TN; i++) {
      const s = i / TN, sv = Math.sin(t * 11 - s * 6) * .1 * s * (.4 + kraft), sd = Math.sin(t * 8 - s * 5 + 1) * .12 * s * (.3 + kraft);
      const x = -.12 + sd, y = 1.22 - s * (.55 - kraft * .4) + sv, z = -.22 - s * (.4 + kraft * .55);
      pa.setXYZ(i * 2, x - .07, y, z); pa.setXYZ(i * 2 + 1, x + .07, y - .03, z);
    }
    pa.needsUpdate = true; toerklaede.geometry.computeVertexNormals(); toerklaede.geometry.computeBoundingSphere();
  }

  /* ---------- Skærmen: en vinge af celler med tykkelse, der bølger i vinden ---------- */
  const VPC = (UNDER + 1) * (KORDE + 1) * 2;     // punkter pr. celle
  const vi = (c, j, k, s) => c * VPC + (j * (KORDE + 1) + k) * 2 + s;
  function bygSkaerm() {
    const n = CELLER * VPC, farver = new Float32Array(n * 3), idx = [], c1 = new T.Color();
    for (let c = 0; c < CELLER; c++) {
      for (let j = 0; j <= UNDER; j++) for (let k = 0; k <= KORDE; k++) for (let s = 0; s < 2; s++) {
        c1.set(SKAERMFARVER[c]); if (s) c1.multiplyScalar(.82);
        farver.set([c1.r, c1.g, c1.b], vi(c, j, k, s) * 3);
      }
      for (let j = 0; j < UNDER; j++) {
        for (let k = 0; k < KORDE; k++) {
          const a = vi(c, j, k, 0), b = vi(c, j + 1, k, 0), d = vi(c, j, k + 1, 0), e = vi(c, j + 1, k + 1, 0);
          idx.push(a, b, d, b, e, d);                        // oversiden
          idx.push(a + 1, d + 1, b + 1, b + 1, d + 1, e + 1); // undersiden
        }
        const a = vi(c, j, 0, 0), b = vi(c, j + 1, 0, 0);    // forkanten (åbne celler)
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    skaermGeo = new T.BufferGeometry();
    skaermGeo.setAttribute("position", new T.BufferAttribute(new Float32Array(n * 3), 3));
    skaermGeo.setAttribute("color", new T.BufferAttribute(farver, 3));
    skaermGeo.setIndex(idx);
    skaermMesh = new T.Mesh(skaermGeo, toon("#ffffff", { vc: true, side: T.DoubleSide }));
    skaermMesh.castShadow = true; skaermMesh.frustumCulled = false; indre.add(skaermMesh);
    const o = new T.Mesh(skaermGeo, streg(.045)); o.frustumCulled = false; skaermMesh.add(o);

    snorGeo = new T.BufferGeometry();
    snorGeo.setAttribute("position", new T.BufferAttribute(new Float32Array((CELLER + 1) * 2 * 2 * 3), 3));
    const snore = new T.LineSegments(snorGeo, new T.LineBasicMaterial({ color: "#5a4656", transparent: true, opacity: .8 }));
    snore.frustumCulled = false; indre.add(snore); skaermMesh.userData.snore = snore;
  }
  // Punkt på skærmen: u = -1..1 hen over spændet, v = 0 (forkant) .. 1 (bagkant), s = 0 over- / 1 underside
  const skaermPkt = (() => {
    let out = null;
    return (u, v, s, t, flagre, venstre, hoejre) => {
      if (!out) out = new T.Vector3();
      const a = u * SPAN * (1 - kol * .45), sa = Math.sin(a), ca = Math.cos(a);
      const korde = 2.1 * (1 - .3 * u ** 4);
      const th = s ? -.06 * Math.sqrt(v) * (1 - v) : .62 * Math.sqrt(v) * (1 - v) * (1 - .4 * u ** 4);
      const boelge = Math.sin(t * 8 + u * 7 + v * 4) * .035 * v * flagre + Math.sin(t * 13 + u * 11) * .015 * flagre;
      const broms = (u < 0 ? hoejre : venstre) * Math.abs(u) * v * v * .5;
      const off = th * (1 - kol) + boelge;
      out.set(RR * sa + sa * off, TOPH - RR * (1 - ca) + ca * off - broms, korde * (.5 - v));
      if (kol > 0) { out.y -= kol * kol * (TOPH - .6) * (.55 + .45 * Math.abs(u)); out.z -= kol * 2.4; out.x *= 1 - kol * .3; }
      return out;
    };
  })();
  function skaermTrin(t) {
    const pa = skaermGeo.attributes.position, flagre = .4 + Math.min(1.4, Math.abs(fart - 8) * .12 + Math.abs(styr) * .5);
    const venstre = Math.max(0, -styr), hoejre = Math.max(0, styr);
    for (let c = 0; c < CELLER; c++) for (let j = 0; j <= UNDER; j++) {
      const u = -1 + 2 * (c * UNDER + j) / (CELLER * UNDER);
      for (let k = 0; k <= KORDE; k++) for (let s = 0; s < 2; s++) {
        const q = skaermPkt(u, k / KORDE, s, t, flagre, venstre, hoejre);
        pa.setXYZ(vi(c, j, k, s), q.x, q.y, q.z);
      }
    }
    pa.needsUpdate = true; skaermGeo.computeVertexNormals();
    // Snorene: fra cellernes skillevægge ned til rævens skuldre
    const sn = snorGeo.attributes.position, skulder = [new T.Vector3(.36, 1.55, .08), new T.Vector3(-.36, 1.55, .08)];
    const e = new T.Euler(raevPivot.rotation.x, 0, raevPivot.rotation.z, "ZXY");
    skulder.forEach(v => { v.y -= PIV; v.applyEuler(e); v.y += PIV; });
    let k = 0;
    for (let b = 0; b <= CELLER; b++) {
      const u = -1 + 2 * b / CELLER, sk = u > 0 ? skulder[0] : skulder[1];
      for (const v of [.2, .65]) {
        const q = skaermPkt(u, v, 1, t, flagre, venstre, hoejre);
        sn.setXYZ(k++, q.x, q.y, q.z); sn.setXYZ(k++, sk.x, sk.y, sk.z);
      }
    }
    sn.needsUpdate = true;
  }

  /* ---------- Fartfølelse: spor fra vingespidserne og vindstriber ---------- */
  const SPORN = 40;
  function bygSpor() {
    spor = [];
    for (let i = 0; i < 2; i++) {
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.BufferAttribute(new Float32Array(SPORN * 2 * 3), 3));
      const c = new Float32Array(SPORN * 2 * 4);
      for (let k = 0; k < SPORN; k++) { const a = (1 - k / SPORN) ** 1.5 * .55; c.set([1, 1, 1, a, 1, 1, 1, a], k * 8); }
      g.setAttribute("color", new T.BufferAttribute(c, 4));
      const idx = []; for (let k = 0; k < SPORN - 1; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      g.setIndex(idx);
      const m = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: T.DoubleSide, fog: false }));
      m.frustumCulled = false; m.visible = false; scene.add(m);
      spor.push({ m, pkt: [] });
    }
  }
  function sporTrin(flyver) {
    const v = new T.Vector3();
    spor.forEach((sp, i) => {
      if (!flyver) { sp.m.visible = false; sp.pkt.length = 0; return; }
      v.copy(skaermPkt(i ? -1 : 1, 1, 0, 0, 0, 0, 0)); indre.localToWorld(v);
      sp.pkt.unshift(v.clone()); if (sp.pkt.length > SPORN) sp.pkt.pop();
      const pa = sp.m.geometry.attributes.position;
      for (let k = 0; k < SPORN; k++) {
        const q = sp.pkt[Math.min(k, sp.pkt.length - 1)], b = .09 * (1 - k / SPORN);
        pa.setXYZ(k * 2, q.x, q.y + b, q.z); pa.setXYZ(k * 2 + 1, q.x, q.y - b, q.z);
      }
      pa.needsUpdate = true; sp.m.visible = sp.pkt.length > 2;
    });
  }
  const STRN = 46;
  function bygStriber() {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(new Float32Array(STRN * 2 * 3), 3));
    striber = new T.LineSegments(g, new T.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
    striber.frustumCulled = false; striber.userData.d = Array.from({ length: STRN }, () => new T.Vector3(1e5, 0, 0)); scene.add(striber);
  }
  function striberTrin(dt, flyver) {
    const m = striber.material, f = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const vel = new T.Vector3(f.x * fart, vy, f.z * fart), vn = vel.clone().normalize();
    const maal = flyver ? klem((fart - 9) / 7, 0, 1) * .55 + .12 : 0;
    m.opacity += (maal - m.opacity) * Math.min(1, dt * 3);
    if (m.opacity < .01) return;
    const pa = striber.geometry.attributes.position, hojre = new T.Vector3(-f.z, 0, f.x), len = .6 + fart * .12;
    striber.userData.d.forEach((q, i) => {
      const rel = q.clone().sub(p);
      if (rel.dot(vn) < -6 || rel.length() > 40) {
        const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 9;
        q.copy(p).addScaledVector(vn, 18 + Math.random() * 16).addScaledVector(hojre, Math.cos(a) * r).add(new T.Vector3(0, Math.sin(a) * r * .7 + 2, 0));
      }
      pa.setXYZ(i * 2, q.x, q.y, q.z); pa.setXYZ(i * 2 + 1, q.x - vn.x * len, q.y - vn.y * len, q.z - vn.z * len);
    });
    pa.needsUpdate = true;
  }

  /* ---------- Styring ---------- */
  function laesStyring() {
    // Venstre/højre = drej. Højt oppe på skærmen = læn tilbage (langsomt), langt nede = læn frem (hurtigt).
    let s = 0, l = 0;
    if (finger) {
      const b = cv.getBoundingClientRect(), dx = (finger.x - (b.left + b.width / 2)) / (b.width * .3);
      s = Math.abs(dx) < .08 ? 0 : klem(dx, -1, 1);
      const dy = (finger.y - (b.top + b.height * .52)) / (b.height * .3);
      l = Math.abs(dy) < .2 ? 0 : klem((dy - Math.sign(dy) * .2) / .8, -1, 1);
    }
    if (taster.v) s -= 1; if (taster.h) s += 1; if (taster.n) l += 1; if (taster.o) l -= 1;
    return { s: klem(s, -1, 1), l: klem(l, -1, 1) };
  }
  function onDown(e) {
    if (!alive || !renderer) return;
    try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    finger = { id: e.pointerId, x: e.clientX, y: e.clientY };
    tryk();
  }
  function onMove(e) { if (finger && e.pointerId === finger.id) { finger.x = e.clientX; finger.y = e.clientY; } }
  function onUp(e) { if (finger && e.pointerId === finger.id) finger = null; }
  function onKey(e) {
    const ned = e.type === "keydown";
    if (e.key === "ArrowLeft") taster.v = ned;
    else if (e.key === "ArrowRight") taster.h = ned;
    else if (e.key === "ArrowDown") taster.n = ned;
    else if (e.key === "ArrowUp") { taster.o = ned; if (ned && fase !== "flyv") tryk(); }
    else if (ned && (e.key === " " || e.key === "Enter")) tryk();
  }
  function tryk() {
    if (fase === "klar") hop();
    else if (fase === "landet" && performance.now() - landetVed > 700) opIgen();
  }

  /* ---------- Faser ---------- */
  function visKnap(ikon) { const b = $(".sv-knap"); if (!ikon) { b.hidden = true; return; } b.textContent = ikon; b.hidden = false; }
  function saetFase(f) { fase = f; faseTid = 0; }

  function klar() {
    saetFase("klar");
    p = new T.Vector3(TOP.x, hoejde(TOP.x, TOP.z), TOP.z);
    yaw = friRetning(p.x, p.z, p.y + 6); vy = 0; bank = 0; fart = 0; yawFart = 0; kol = 1;
    visKnap("🪂");
  }
  function hop() { saetFase("hop"); visKnap(null); Spil.sfx.click(); }
  function flyv() { saetFase("flyv"); visKnap(null); }
  function land(vand) {
    saetFase("landet"); landetI = vand ? "vand" : "jord"; landetVed = performance.now();
    p.y = vand ? -.35 : hoejde(p.x, p.z); vy = 0; fart = 0;
    Spil.tone(vand ? [300, 200, 140] : [220, 170], .1, "triangle");
    const sp = skaermPunkt(p);
    if (!roligt()) Spil.burst(sp.x, sp.y, vand ? "💧💦💧💦💧" : "🍃🌼🍃✨🍃");
    later(() => fase === "landet" && visKnap("🌀"), 700);
    if (vand && !sagt.plask) { sagt.plask = true; later(() => Spil.say("Plask! Ræven landede i vandet.", null, "svaev-plask"), 300); }
    else if (!sagt.landet) { sagt.landet = true; later(() => Spil.say("Du er landet! Tryk, så løfter vinden dig op igen.", null, "svaev-landet"), 400); }
    ventLyd = 0;
  }
  function opIgen() {
    saetFase("hvirvel"); visKnap(null);
    const start = p.y, maal = Math.max(p.y, bund(p.x, p.z)) + 30;
    const nyYaw = friRetning(p.x, p.z, maal);
    let d = nyYaw - yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    raev.userData.hv = { start, maal, yaw0: yaw, dYaw: d + Math.PI * 4 };
    antalOp++;
    if (antalOp === 1 || antalOp % 5 === 0) Spil.say("Op i luften igen!", null, "svaev-op");
    Spil.tone([392, 523, 659, 784], .09, "sine");
  }

  /* ---------- Løkken ---------- */
  function skaermPunkt(v) {
    const q = new T.Vector3(v.x, v.y + 1.2, v.z).project(camera), b = cv.getBoundingClientRect();
    return { x: b.left + (q.x + 1) / 2 * b.width, y: b.top + (1 - q.y) / 2 * b.height };
  }
  function vindLoeft() {
    let l = 0, naermest = 1e9;
    for (const [x, z] of VINDE) {
      const d = Math.hypot(p.x - x, p.z - z); naermest = Math.min(naermest, d);
      l += 1 - ss(7, 15, d);   // brede vindsøjler, så de er lette at ramme
    }
    return { l: Math.min(1, l) * LOEFT * (1 - ss(LOFT - 25, LOFT, p.y)), naermest };
  }
  const fjeder = (f, maal, k, d, dt) => { f.v += ((maal - f.x) * k - f.v * d) * dt; f.x += f.v * dt; };

  function raevTrin(dt, t) {
    const fyrFoer = vy, fartFoer = fart;
    let swingMaal = 0, pitchMaal = 0, benSving = .2, kraft = 0, hop = 0, laenMaal = 0;
    if (fase === "klar") {
      hop = Math.abs(Math.sin(t * 2.2)) * .04; styr = 0;
    } else if (fase === "hop") {
      // løb et par skridt, skærmen rejser sig bag ræven, og så hopper den ud
      const k = faseTid, f = { x: Math.sin(yaw), z: Math.cos(yaw) };
      p.x += f.x * 5.5 * dt; p.z += f.z * 5.5 * dt;
      hop = Math.abs(Math.sin(k * 14)) * .14; laenMaal = .25;
      ben.forEach((b, i) => b.rotation.x = Math.sin(k * 14 + i * Math.PI) * .8);
      if (k > .55) p.y += (4 - (k - .55) * 6) * dt; else p.y = hoejde(p.x, p.z);
      kol = 1 - ss(.1, 1.0, k);
      if (k > 1.1) { vy = 1; fart = 7; Spil.tone([523, 784], .12, "sine"); flyv(); }
    } else if (fase === "flyv") {
      flyveTid += dt;
      let { s, l: laenInd } = laesStyring();
      laen += (laenInd - laen) * Math.min(1, dt * 2.5);
      if (Math.abs(s) > .1) styrTid += dt;
      const dist = Math.hypot(p.x, p.z);
      if (dist > R * 1.2) { // langt ude over havet: vend blødt hjem mod øen
        let d = Math.atan2(-p.x, -p.z) - yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
        s = klem(s - klem(d * 1.5, -1, 1) * Math.min(1, (dist - R * 1.2) / 40), -1, 1);
      }
      styr += (s - styr) * Math.min(1, dt * 4);
      yawFart += (-styr * DREJ - yawFart) * Math.min(1, dt * 3);
      yaw += yawFart * dt;
      bank += (styr * .62 - bank) * Math.min(1, dt * 2.5);
      const { l, naermest } = vindLoeft();
      // Læn frem = hurtigere (men man daler mere); læn tilbage = langsomt og svævende.
      // Og fart og højde hænger sammen: dykker man, går det stærkere; stiger man, går det langsommere.
      const synk = SYNK * (1 + Math.abs(styr) * .25) * (laen > 0 ? 1 + laen * 1.2 : 1 + laen * .3);
      vy += ((-synk + l) - vy) * Math.min(1, dt * 1.6);
      const fartMaal = FART + laen * (laen > 0 ? 7 : 4.5) + (-vy - SYNK) * .8;
      fart += (klem(fartMaal, 5.5, 20) - fart) * Math.min(1, dt * 1.2);
      laenMaal = laen * .5;
      p.x += Math.sin(yaw) * fart * dt; p.z += Math.cos(yaw) * fart * dt; p.y += vy * dt;
      const ind = l > .3 * LOEFT;
      if (ind && !iVind) { fovKick = 7; Spil.tone([330, 440, 554], .1, "sine"); }
      iVind = ind;
      swingMaal = bank * .55; benSving = .35 + Math.min(.5, Math.abs(vy) * .05); kraft = klem((fart - 6) / 10, 0, 1);
      const g = hoejde(p.x, p.z);
      if (p.y <= Math.max(g, 0) + .05) { land(g < 0); return; }
      if (!sagt.styr && flyveTid > 7 && styrTid < .5 && !Spil.isTalking()) { sagt.styr = true; Spil.say("Hold fingeren til venstre eller til højre for at dreje.", null, "svaev-styr"); }
      if (!sagt.vind && naermest < 30 && flyveTid > 3 && !Spil.isTalking()) { sagt.vind = true; Spil.say("Flyv ind i den glitrende vind, så kommer du højt op!", null, "svaev-vind"); }
    } else if (fase === "landet") {
      bank += -bank * Math.min(1, dt * 2.5); styr *= .9; yawFart = 0; laen *= .9;
      kol = Math.min(1, kol + dt * 1.5);
      if (landetI === "vand") hop = Math.sin(t * 2) * .06 - .1;
      else {
        // en blød knæbøjning ved landingen og et lille glad hop bagefter
        const k = faseTid;
        hop = -.12 * Math.sin(Math.min(1, k / .4) * Math.PI) + (k > .55 && k < .95 ? .1 * Math.sin((k - .55) / .4 * Math.PI) : 0);
      }
      p.y = landetI === "vand" ? -.35 : hoejde(p.x, p.z);
      ventLyd += dt;
      if (ventLyd > 12 && !sagt.landet2 && !Spil.isTalking()) { sagt.landet2 = true; Spil.say("Tryk, så løfter vinden dig op igen.", null, "svaev-landet"); }
    } else if (fase === "hvirvel") {
      const hv = raev.userData.hv, k = Math.min(1, faseTid / 2.6), e = 1 - Math.pow(1 - k, 3);
      p.y = hv.start + (hv.maal - hv.start) * e;
      yaw = hv.yaw0 + hv.dYaw * e;
      bank += -bank * Math.min(1, dt * 2.5);
      kol = 1 - ss(.6, 1, k);
      benSving = .6; kraft = .6;
      if (k >= 1) { vy = 0; fart = 8; flyv(); }
    }

    // Ræven svinger som et pendul under skærmen: ud i sving, frem og tilbage når farten ændrer sig.
    // På jorden falder den blødt (kritisk dæmpet) tilbage, så den ikke rykker ud af billedet.
    if (fase === "flyv" || fase === "hvirvel") {
      pitchMaal = klem(-(fart - fartFoer) / Math.max(dt, .001) * .06 + (vy - fyrFoer) / Math.max(dt, .001) * .02, -.45, .45) + .1 - laen * .12;
      fjeder(svR, swingMaal, 16, 3.2, dt); fjeder(svP, pitchMaal, 12, 3, dt);
    } else { fjeder(svR, 0, 9, 6, dt); fjeder(svP, 0, 9, 6, dt); }
    raevPivot.rotation.set(svP.x, 0, svR.x);
    // Kroppen lænes frem/tilbage om selen (ca. 1.4 over fødderne)
    kropLaen += (laenMaal - kropLaen) * Math.min(1, dt * 4);
    kropHop += (hop - kropHop) * Math.min(1, dt * 14);
    krop.rotation.x = kropLaen;
    krop.position.set(0, -PIV + kropHop + 1.4 * (1 - Math.cos(kropLaen)), -1.4 * Math.sin(kropLaen));

    // Små levende detaljer
    hoved.rotation.y = klem(yawFart * .45, -.5, .5);
    hoved.rotation.x = fase === "flyv" ? .12 : 0;
    oerer.forEach((o, i) => { o.rotation.x = -.15 - kraft * .5 + Math.sin(t * 22 + i) * .06 * kraft; });
    if (fase === "flyv" || fase === "hvirvel") ben.forEach((b, i) => { b.rotation.x = Math.sin(t * 3 + i * 1.7) * benSving - svP.x * .8 + .25 + laen * .55; });
    else if (fase !== "hop") ben.forEach(b => { b.rotation.x *= .85; });
    fjeder(haleS, -yawFart * .5 + svR.x * .6, 10, 2.5, dt);
    halePivot.rotation.y = haleS.x + Math.sin(t * (fase === "landet" ? 9 : 2.4)) * (fase === "landet" ? .35 : .25);
    halePivot.rotation.x = -kraft * .45;
    naesteBlink -= dt; if (naesteBlink < 0) { blink = .14; naesteBlink = 2.5 + Math.random() * 3; }
    blink = Math.max(0, blink - dt); oejne.forEach(o => o.scale.y = blink > 0 ? .15 : 1.35);
    toerklaedeTrin(t, kraft);

    raev.position.copy(p); raev.rotation.y = yaw; rig.rotation.z = bank;
    // Skærmen tipper frem, når man læner sig frem og dykker (blødt, også ved landing)
    const rigMaal = fase === "flyv" ? klem(-vy * .02 + laen * .16, -.18, .25) : 0;
    rig.rotation.x += (rigMaal - rig.rotation.x) * Math.min(1, dt * 3);
    skaermMesh.visible = skaermMesh.userData.snore.visible = kol < .98;
    if (skaermMesh.visible) skaermTrin(t);

    // Hvirvelvindens prikker
    const hp = hvirvelPunkter, hm = hp.material;
    const mod = fase === "hvirvel" ? 1 - ss(.75, 1, faseTid / 2.6) : 0;
    hm.opacity += (mod * .9 - hm.opacity) * Math.min(1, dt * 6);
    if (hm.opacity > .01) {
      const arr = hp.geometry.attributes.position.array;
      hp.userData.d.forEach((d, i) => {
        d.a += dt * 9; d.h = (d.h + dt * .5) % 1;
        const r = d.r * (.6 + d.h * 2.6);
        arr[i * 3] = p.x + Math.cos(d.a) * r; arr[i * 3 + 1] = p.y - 3 + d.h * 9; arr[i * 3 + 2] = p.z + Math.sin(d.a) * r;
      });
      hp.geometry.attributes.position.needsUpdate = true;
    }
  }

  // Der ligger altid en stjerne foran ræven, i den højde den er på vej ned til, så man rammer den bare ved at flyve ligeud
  function stjerneForan(dt) {
    naesteForan -= dt;
    if (fase !== "flyv" || naesteForan > 0) return;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    for (const s of stjerner) {
      if (!s.visible) continue;
      // Ligger der allerede en stjerne på ruten (lige foran og i den højde, ræven kommer forbi i)?
      const dx = s.position.x - p.x, dz = s.position.z - p.z, frem = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
      const forventetY = p.y + vy * frem / Math.max(fart, 5);
      if (frem > 8 && frem < 80 && side < 7 && Math.abs(s.userData.y0 - forventetY) < 7) return;
    }
    // Brug den synlige stjerne, der er længst væk (eller en der venter på at komme igen)
    let valgt = stjerner.find(s => !s.visible), bedst = -1;
    if (!valgt) for (const s of stjerner) { const d = s.position.distanceTo(p); if (d > bedst) { bedst = d; valgt = s; } }
    const afst = 42 + Math.random() * 16, side = (Math.random() - .5) * 8;
    const x = p.x + fx * afst - fz * side, z = p.z + fz * afst + fx * side;
    const y = klem(p.y + vy * afst / Math.max(fart, 5) + .5, bund(x, z) + 5, 88);
    valgt.position.set(x, y, z); valgt.userData.y0 = y; valgt.visible = true; valgt.userData.ventTil = 0;
    naesteForan = 2.5;
  }

  function stjerneTrin(dt, t) {
    const c = new T.Vector3(p.x, p.y + 1.6, p.z), flyver = fase === "flyv" || fase === "hvirvel";
    stjerneForan(dt);
    for (const s of stjerner) {
      if (!s.visible) { if (t > s.userData.ventTil) flytStjerne(s); continue; }
      s.userData.m.rotation.y += dt * 2;
      // Er ræven tæt på, trækkes stjernen hen til den (som en magnet), så man ikke skal ramme præcist
      const til = c.clone().sub(s.position), d = til.length();
      if (flyver && d < 18 && d > .01) {
        const skridt = Math.min(d, dt * (10 + (18 - d) * 1.8));
        s.position.x += til.x / d * skridt; s.position.z += til.z / d * skridt; s.userData.y0 += til.y / d * skridt;
      }
      s.position.y = s.userData.y0 + Math.sin(t * 1.5 + s.id) * .4;
      if (flyver && s.position.distanceTo(c) < 6) {
        s.visible = false; s.userData.ventTil = t + 10; naesteForan = Math.min(naesteForan, 1.2);
        antalStj++; try { localStorage.setItem(GEM, String(antalStj)); } catch (e) {}
        const el = $(".sv-stj"); el.querySelector("b").textContent = antalStj; el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
        Spil.tone([1047, 1319, 1568, 2093], .07, "sine");
        const sp = skaermPunkt(s.position.clone().setY(s.position.y - 1.2)); if (!roligt()) Spil.burst(sp.x, sp.y, "⭐✨🌟✨");
        if (!sagt.stjerne) { sagt.stjerne = true; Spil.say("Du fangede en stjerne!", null, "svaev-stjerne"); }
        else if (antalStj % 5 === 0) Spil.say("", null, ROS[Math.floor(Math.random() * ROS.length)]);
      }
    }
  }

  function kameraTrin(dt) {
    const f = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), hojre = new T.Vector3(-f.z, 0, f.x);
    const naer = fase === "landet" || fase === "klar" || fase === "hop";
    const flyver = fase === "flyv";
    const smal = cv.clientWidth < cv.clientHeight;
    const bag = (naer ? 8.5 : 11.5 + (fart - FART) * .25) * (smal ? 1.25 : 1), op = naer ? 3.4 : 4.2;
    // I sving glider kameraet lidt ud til siden og kigger ind i svinget (mindre på en smal telefon-skærm)
    const asp = cv.clientWidth / Math.max(1, cv.clientHeight), sid = flyver ? klem(asp, .3, 1) : 0;
    const maal = new T.Vector3(p.x - f.x * bag, p.y + op, p.z - f.z * bag).addScaledVector(hojre, yawFart * 2.2 * sid);
    if (fase === "landet") maal.y = Math.max(maal.y, bund(maal.x, maal.z) + 5.5);
    const k = 1 - Math.exp(-dt * (fase === "hvirvel" ? 2 : 2.8));
    kamPos.lerp(maal, k);
    const gulv = bund(kamPos.x, kamPos.z) + 1.5; if (kamPos.y < gulv) kamPos.y = gulv;
    const se = new T.Vector3(p.x + f.x * 7, p.y + (naer ? 1.4 : 2.2), p.z + f.z * 7).addScaledVector(hojre, -yawFart * 3 * sid);
    // Sigt også efter selve ræven (den svinger ud i sving), mest på en smal skærm, så den bliver i billedet
    if (flyver) { const rv = krop.getWorldPosition(new T.Vector3()); rv.y += 1.6; se.lerp(rv, asp < 1 ? .65 : .3); }
    kamSe.lerp(se, Math.min(1, k * 1.5));
    // Kameraet hælder med i svinget
    kamRul += ((flyver ? bank * .35 : 0) - kamRul) * Math.min(1, dt * 2.5);
    camera.position.copy(kamPos);
    camera.up.set(0, 1, 0).multiplyScalar(Math.cos(kamRul)).addScaledVector(hojre, Math.sin(kamRul));
    camera.lookAt(kamSe);
    // Synsfeltet bliver bredere, jo hurtigere det går
    const basis = asp < 1 ? 72 : 58;
    fovKick *= Math.exp(-dt * 2);
    const fovMaal = basis + (flyver ? klem((fart - FART) * 1.3, -3, 10) : 0) + fovKick;
    fov += (fovMaal - fov) * Math.min(1, dt * 3);
    if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    himmel.position.copy(camera.position);
    const sd = new T.Vector3(...SOL).normalize();
    sol.target.position.set(p.x, p.y, p.z); sol.position.set(p.x + sd.x * 150, p.y + sd.y * 150, p.z + sd.z * 150);
  }

  function loop(nu) {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (nu - (sidstTid || nu)) / 1000); sidstTid = nu;
    const t = nu / 1000;
    faseTid += dt; tidU.value = t;
    raevTrin(dt, t);
    lydTrin();
    raev.updateMatrixWorld(true);
    sporTrin(fase === "flyv");
    striberTrin(dt, fase === "flyv");
    stjerneTrin(dt, t);
    vindTrin(dt);
    fugleTrin(dt, t);
    skyGrp.rotation.y += dt * .004;
    kameraTrin(dt);
    renderer.render(scene, camera);
  }

  function tilpas() {
    if (!renderer) return;
    const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  Spil.register({
    id: "svaeveren", navn: "Svæveren", ikon: "🪂", farve: "#bfe3ff",
    start(rt) {
      alive = true; timers = []; tex = []; matCache = {}; sidstTid = 0; finger = null; taster = { v: false, h: false, n: false, o: false }; laen = 0; kropLaen = 0; kropHop = 0;
      sagt = {}; antalOp = 0; naesteForan = 3; styrTid = 0;
      try { musikTil = localStorage.getItem(MUSIK) !== "0"; } catch (e) { musikTil = true; } flyveTid = 0; faseTid = 0; fase = "start"; styr = 0; kol = 1;
      oejne = []; oerer = []; ben = []; kamRul = 0; fov = 60; fovKick = 0; iVind = false;
      svR = { x: 0, v: 0 }; svP = { x: 0, v: 0 }; haleS = { x: 0, v: 0 };
      try { antalStj = parseInt(localStorage.getItem(GEM) || "0", 10) || 0; } catch (e) { antalStj = 0; }
      Spil.preload(["svaev-hej", "svaev-styr", "svaev-vind", "svaev-landet", "svaev-plask", "svaev-op", "svaev-stjerne", ...ROS]);
      rt.innerHTML = `<div class="sv"><canvas class="sv-cv"></canvas><div class="sv-vent">🪂</div>
        <div class="sv-stj">⭐ <b>${antalStj}</b></div>
        <button class="sv-musik" aria-label="Musik">🎵</button>
        <button class="sv-knap" hidden aria-label="Flyv">🪂</button></div>`;
      root = rt.querySelector(".sv"); cv = $(".sv-cv");
      saetMusik(musikTil);
      $(".sv-musik").addEventListener("click", e => { e.stopPropagation(); Spil.sfx.click(); saetMusik(!musikTil); });
      $(".sv-knap").addEventListener("click", e => { e.stopPropagation(); tryk(); });
      cv.addEventListener("pointerdown", onDown); cv.addEventListener("pointermove", onMove);
      cv.addEventListener("pointerup", onUp); cv.addEventListener("pointercancel", onUp);
      addEventListener("resize", tilpas); addEventListener("keydown", onKey); addEventListener("keyup", onKey);
      lydStart();
      Spil.three().then(mod => {
        if (!alive) return;
        T = mod;
        byg(); tilpas();
        $(".sv-vent").remove();
        klar();
        const dyb = Spil.dyb;
        if (dyb === "flyv" || dyb === "landet") {
          kol = 0; p.set(40, 45, -20); yaw = friRetning(p.x, p.z, p.y); fart = FART; flyv();
          if (dyb === "landet") { p.set(60, 0, 110); p.y = hoejde(p.x, p.z); land(p.y < 0); }
        } else later(() => Spil.say("Tryk på skærmen, så hopper ræven ud og flyver!", null, "svaev-hej"), 700);
        const f = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        kamPos = new T.Vector3(p.x - f.x * 8.5, p.y + 3.4, p.z - f.z * 8.5); kamSe = new T.Vector3(p.x + f.x * 7, p.y + 1.4, p.z + f.z * 7);
        raf = requestAnimationFrame(loop);
      }, () => { if (alive) { const v = $(".sv-vent"); if (v) { v.style.animation = "none"; v.textContent = "😕"; } } });
    },
    stop() {
      alive = false; timers.forEach(clearTimeout); cancelAnimationFrame(raf);
      removeEventListener("resize", tilpas); removeEventListener("keydown", onKey); removeEventListener("keyup", onKey);
      lydStop();
      if (renderer) {
        scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
        tex.forEach(t => t.dispose()); if (envTex) envTex.dispose();
        renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) {}
      }
      renderer = scene = camera = null; tex = []; matCache = {}; finger = null;
    }
  });
})();
