// Spil: Snemanden — rul tre snekugler i en snedækket julehave, vælg selv størrelsen, pynt krop og hoved (snemand eller snekone)
// med kamera-zoom, tænd julelys i julenatten og besøg snemændene i julehaven (rigtig 3D med three.js).
// 1) Rul: træk fingeren hen over sneen (eller tryk på sneen). Rul hen over små snedriver på plænen for ekstra sne.
//    Du bestemmer selv størrelsen: rul kuglen ind i den lysende ring i midten (eller tryk ✅), når du vil sætte den på!
// 2) Pynt kroppen (kameraet zoomer ind på maven): halstørklæde, sløjfe, perlekæde, kjole, julevest, hjerteknapper,
//    grene-arme, røde juleluffer, kost, sukkerstok og lysende julelanterne.
// 3) Pynt hovedet (kameraet zoomer helt tæt på ansigtet): øjenvipper & rosenkinder, briller, julemandsskæg,
//    gulerod, lysende Rudolf-næse, jordbær, fletninger, nissehue, høj hat, guldkrone, strikhue og rensdyrgevir.
// 4) Fest & Julehave: snemanden vågner, vinker og danser ved juletræet (gemmes i localStorage "lk-snemaend", op til 6).
//    🌨️ kalder en stor snesky ind, der drysser frisk sne og nye snedriver; 🌙/☀️ skifter mellem vinterdag og julenat med lys!
(function () {
  const STREG = "#2d2842";
  const DAG_TOP = "#4a78c2", DAG_MIDT = "#9fd0f7", DAG_HORISONT = "#ffe6cf";
  const NAT_TOP = "#0e1736", NAT_MIDT = "#1c2d5e", NAT_HORISONT = "#394878";
  const GEM = "lk-snemaend", MAKS_GEMT = 6;
  const START_R = [.34, .29, .25];
  const MIN_KLAR_R = [.52, .44, .36];
  const MAAL_R = [1.02, .80, .60];
  const MAKS_R = [1.42, 1.15, .90];
  const SNE_STR = 512, HAVE_R = 7.4;
  const ROS = ["ros-0", "ros-1", "ros-2", "ros-3", "ros-4"];
  const roligt = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };

  // Trin A: Pynt kroppen (zoom på mave og arme) — 2 rækker á 6 store knapper
  const PYNT_KROP = [
    { id: "roed", kat: "hals", ikon: "🧣", tekst: "Et varmt halstørklæde!", lyd: "sne-toerklaede" },
    { id: "blaa", kat: "hals", ikon: "💙", tekst: "Et varmt halstørklæde!", lyd: "sne-toerklaede" },
    { id: "sloejfe", kat: "hals", ikon: "🎀", tekst: "En fin sløjfe!", lyd: "sne-sloejfe" },
    { id: "perler", kat: "hals", ikon: "📿", tekst: "En fin perlekæde!", lyd: "sne-perler" },
    { id: "kjole", kat: "toej", ikon: "👗", tekst: "En fin kjole!", lyd: "sne-kjole" },
    { id: "vest", kat: "toej", ikon: "🦺", tekst: "En flot julevest!", lyd: "sne-vest" },
    null,
    { id: "hjerter", kat: "knap", ikon: "❤️", tekst: "Hjerteknapper på maven!", lyd: "sne-hjerter" },
    { id: "grene", kat: "arm", ikon: "🌿", tekst: "Arme af grene!", lyd: "sne-grene" },
    { id: "luffer", kat: "arm", ikon: "🧤", tekst: "Varme juleluffer!", lyd: "sne-luffer" },
    { id: "kost", kat: "ting", ikon: "🧹", tekst: "En fejekost!", lyd: "sne-kost" },
    { id: "sukkerstok", kat: "ting", ikon: "🍬", tekst: "En sød sukkerstok!", lyd: "sne-sukkerstok" },
    { id: "lanterne", kat: "ting", ikon: "🏮", tekst: "En lanterne, der lyser!", lyd: "sne-lanterne" },
  ];

  // Trin B: Pynt hovedet (zoom helt tæt på ansigt og hat) — 2 rækker á 6 store knapper
  const PYNT_HOVED = [
    { id: "vipper", kat: "ansigt", ikon: "🥰", tekst: "Lange øjenvipper og røde kinder!", lyd: "sne-vipper" },
    { id: "briller", kat: "briller", ikon: "👓", tekst: "Flotte briller!", lyd: "sne-briller" },
    { id: "skaeg", kat: "ansigt", ikon: "🧔", tekst: "Et stort hvidt julemandsskæg!", lyd: "sne-skaeg" },
    { id: "gulerod", kat: "naese", ikon: "🥕", tekst: "En gulerodsnæse!", lyd: "sne-gulerod" },
    { id: "rudolf", kat: "naese", ikon: "🔴", tekst: "En rød næse, der lyser!", lyd: "sne-rudolf" },
    { id: "jordbaer", kat: "naese", ikon: "🍓", tekst: "Et jordbær til næse!", lyd: "sne-jordbaer" },
    null,
    { id: "fletninger", kat: "haar", ikon: "👱‍♀️", tekst: "Fine fletninger!", lyd: "sne-fletninger" },
    { id: "nissehue", kat: "hat", ikon: "🎅", tekst: "En nissehue! Glædelig jul!", lyd: "sne-nissehue" },
    { id: "hoejhat", kat: "hat", ikon: "🎩", tekst: "En fin høj hat!", lyd: "sne-hoejhat" },
    { id: "krone", kat: "hat", ikon: "👑", tekst: "En guldkrone!", lyd: "sne-krone" },
    { id: "strikhue", kat: "hat", ikon: "🧶", tekst: "En varm strikhue!", lyd: "sne-strikhue" },
    { id: "gevir", kat: "hat", ikon: "🦌", tekst: "Et rensdyrgevir!", lyd: "sne-gevir" },
  ];

  const NY_VALG = () => ({
    hals: null, toej: null, knap: null, arm: "grene", ting: null,
    ansigt: null, briller: null, naese: null, haar: null, hat: null
  });

  const IKON = "☃️";

  Spil.css("css-snemanden", `
    .sn{position:absolute;inset:0;overflow:hidden;background:linear-gradient(${DAG_TOP},${DAG_MIDT} 60%,${DAG_HORISONT})}
    .sn-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
    .sn-vent{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:clamp(60px,14vh,140px);
      animation:sn-vug 1.8s ease-in-out infinite}
    @keyframes sn-vug{0%,100%{transform:rotate(-8deg) translateY(-6px)}50%{transform:rotate(8deg) translateY(6px)}}
    .sn button{position:absolute;border-radius:50%;background:var(--card);box-shadow:0 6px 0 rgba(45,40,66,.26);
      display:flex;align-items:center;justify-content:center;line-height:1;transition:transform .15s,opacity .25s;
      padding:0;font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif}
    .sn button:active{transform:translateY(4px);box-shadow:0 2px 0 rgba(45,40,66,.26)}
    .sn button[hidden]{display:none}
    .sn-videre{right:max(18px,env(safe-area-inset-right,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));
      width:clamp(76px,13vh,120px);aspect-ratio:1;font-size:clamp(40px,7vh,66px);z-index:5}
    .sn-tilbage{left:max(18px,env(safe-area-inset-left,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));
      width:clamp(68px,11.5vh,104px);aspect-ratio:1;font-size:clamp(34px,6vh,54px);z-index:5}
    .sn-videre.vis{animation:sn-hop 1.4s ease-in-out infinite}
    @keyframes sn-hop{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
    .sn-top{position:absolute;top:calc(2vh + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));
      display:flex;gap:clamp(10px,1.6vw,16px);z-index:5;pointer-events:none}
    .sn-top button{position:relative;pointer-events:auto;width:clamp(56px,8.5vh,80px);aspect-ratio:1;font-size:clamp(28px,4.6vh,42px)}
    .sn-pynt{position:absolute;left:0;right:0;bottom:calc(14px + env(safe-area-inset-bottom,0px));
      display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(8px,1.5vw,16px);pointer-events:none;
      padding:0 calc(clamp(76px,13vh,120px) + 26px);z-index:4}
    .sn-pynt[hidden]{display:none}
    .sn-pynt button{position:relative;pointer-events:auto;width:clamp(62px,10.5vh,92px);aspect-ratio:1;
      font-size:clamp(32px,5.8vh,52px);border:5px solid #fff;box-shadow:0 6px 0 rgba(45,40,66,.25)}
    .sn-pynt button.valgt{transform:translateY(-10px) scale(1.1);border-color:#ffcf3f;background:#fff9e2}
    .sn-brud{flex-basis:100%;height:0}
    @media (max-aspect-ratio:1/1){
      .sn-pynt{padding:0 14px calc(clamp(74px,12vh,108px) + 12px);max-width:420px;margin:0 auto;gap:8px}
      .sn-pynt button{width:clamp(60px,18.5vw,82px);font-size:clamp(30px,9vw,44px)}
      .sn-brud{display:none}
    }
    @media (prefers-reduced-motion:reduce){.sn-vent,.sn-videre.vis{animation:none}}
  `);

  let T, root, alive, timers, raf, cv, renderer, scene, camera, ray, ndc, tidU, gradient, envTex;
  let himmelMat, hemiLys, solLys, juletraeLys, juleFodLys, sneCanvas, sneTex, jordMesh, sneFnug, snePust;
  let juletraeGrp, juleLys = [], feLys = [], gaverListe = [], stjerneTop, stjerneHalo, kaninGrp, pladsRing, sneSkyGrp, sneSkyAnim = null;
  let snedriverGrp, snedriver = [], himmelFarver = null;
  let aktivGrp, kugler = [], rulBold, rulR = .34, rulPos, rulMaal = null, hopAnim = null, kugleNr = 0, rulDist = 0;
  let pyntValg = NY_VALG(), pyntListe = PYNT_KROP, pyntHop = 0, snemandVug = 0;
  let haveGrp, haveSnemaend = [], dansere = [], vistSnemand = null;
  let fase = "start", erNat = false, natBlanding = 0, sidstTid = 0, sidstRoert = 0;
  let sagtHint = false, sagtMidt = false, sagtStor = false, sneByge = 0, lysTema = 0;
  let ned = false, trækStart = null, snurVinkel = 0, kamPos, kamMaal, kamPosMaal, kamMaalMaal;
  let tex = [], matCache = {}, lyd = null;

  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));
  const $ = s => root.querySelector(s);
  const klem = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ---------- Gemte snemænd ---------- */
  function hentGemte() {
    try { const a = JSON.parse(localStorage.getItem(GEM) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function gemSnemand(s) {
    const a = hentGemte(); a.push(s);
    while (a.length > MAKS_GEMT) a.shift();
    try { localStorage.setItem(GEM, JSON.stringify(a)); } catch (e) {}
  }

  /* ---------- Tegnefilms-materialer og omrids ---------- */
  function stil(mat, o = {}) {
    const tyk = o.tyk || 0, sway = o.sway || 0;
    mat.customProgramCacheKey = () => `sn-${tyk}-${sway}`;
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTid = tidU;
      sh.vertexShader = "uniform float uTid;\n" + sh.vertexShader
        .replace("#include <begin_vertex>", `#include <begin_vertex>
          ${tyk ? `transformed += normalize(normal) * ${tyk.toFixed(4)};` : ""}
          ${sway ? `transformed.x += sin(uTid * 2.2 + position.y * 1.4) * ${sway.toFixed(4)} * max(0.0, position.y);` : ""}`);
    };
    return mat;
  }
  function toon(farve, o = {}) {
    const k = farve + JSON.stringify(o);
    if (!matCache[k]) {
      const m = new T.MeshToonMaterial({
        color: farve, gradientMap: gradient, side: o.side || T.FrontSide,
        emissive: o.emissive || "#000000", emissiveIntensity: o.emissiveIntensity || 0
      });
      matCache[k] = stil(m, o);
    }
    return matCache[k];
  }
  function streg(tyk, o = {}) {
    const k = "streg-" + tyk + JSON.stringify(o);
    if (!matCache[k]) matCache[k] = stil(new T.MeshBasicMaterial({ color: STREG, side: T.BackSide }), { ...o, tyk });
    return matCache[k];
  }
  function medStreg(geo, mat, tyk = .04, skygge = true) {
    const m = new T.Mesh(geo, mat);
    m.castShadow = skygge; m.receiveShadow = skygge;
    if (tyk > 0) m.add(new T.Mesh(geo, streg(tyk)));
    return m;
  }

  /* ---------- Lyd: knasende sne og juleklokker ---------- */
  function lydStart() {
    try {
      const ac = Spil.audio(), n = ac.sampleRate * 2, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
      let b = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        b = b * .92 + w * .08;
        d[i] = (b * 2.5 + w * .35) * (.6 + .4 * Math.sin(i * .003));
      }
      const kilde = ac.createBufferSource(); kilde.buffer = buf; kilde.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 950; bp.Q.value = 1.1;
      const knasG = ac.createGain(); knasG.gain.value = 0;
      kilde.connect(bp).connect(knasG).connect(ac.destination);
      kilde.start();
      lyd = { ac, kilde, bp, knasG };
    } catch (e) { lyd = null; }
  }
  function lydKnas(fart) {
    if (!lyd) return;
    try {
      const nu = lyd.ac.currentTime, v = klem(fart * .035, 0, .16);
      lyd.knasG.gain.setTargetAtTime(v, nu, .06);
      lyd.bp.frequency.setTargetAtTime(750 + klem(fart, 0, 8) * 90, nu, .08);
    } catch (e) {}
  }
  function lydStop() {
    if (!lyd) return;
    try { lyd.kilde.stop(); } catch (e) {}
    try { lyd.knasG.disconnect(); } catch (e) {}
    lyd = null;
  }
  function juleKlokker(toner = [523.25, 659.25, 783.99, 1046.5], tempo = .11) {
    try {
      const ac = Spil.audio();
      toner.forEach((f, i) => {
        const t = ac.currentTime + i * tempo;
        for (const [mult, amp] of [[1, .18], [2, .06], [3, .02]]) {
          const o = ac.createOscillator(), g = ac.createGain();
          o.type = "sine"; o.frequency.value = f * mult;
          g.gain.setValueAtTime(.0001, t);
          g.gain.linearRampToValueAtTime(amp, t + .015);
          g.gain.exponentialRampToValueAtTime(.0001, t + .9);
          o.connect(g).connect(ac.destination);
          o.start(t); o.stop(t + .95);
        }
      });
    } catch (e) {}
  }

  /* ---------- Teksturer (snespor og snefnug) ---------- */
  function prikTex() {
    const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(.45, "rgba(240,248,255,.75)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; tex.push(t); return t;
  }
  function nulstilSne() {
    if (!sneCanvas) return;
    const g = sneCanvas.getContext("2d"), w = SNE_STR;
    g.fillStyle = "#f4f8ff"; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 180; i++) {
      g.fillStyle = i % 2 ? "rgba(214,232,252,.35)" : "rgba(255,255,255,.6)";
      g.beginPath(); g.arc(Math.random() * w, Math.random() * w, 12 + Math.random() * 36, 0, 7); g.fill();
    }
    if (sneTex) sneTex.needsUpdate = true;
  }
  function drysFriskSne(alfa = .4) {
    if (!sneCanvas) return;
    const g = sneCanvas.getContext("2d"), w = SNE_STR;
    g.fillStyle = `rgba(244,248,255,${alfa})`;
    g.fillRect(0, 0, w, w);
    sneTex.needsUpdate = true;
  }
  function tegnSpor(x, z, r) {
    if (!sneCanvas) return;
    const g = sneCanvas.getContext("2d");
    const u = (x / 28 + .5) * SNE_STR, v = (z / 28 + .5) * SNE_STR, pr = Math.max(8, r * 14);
    const gr = g.createRadialGradient(u, v, pr * .1, u, v, pr);
    gr.addColorStop(0, "rgba(138,184,158,.72)");
    gr.addColorStop(.55, "rgba(182,210,238,.65)");
    gr.addColorStop(1, "rgba(244,248,255,0)");
    g.fillStyle = gr;
    g.beginPath(); g.arc(u, v, pr, 0, 7); g.fill();
    sneTex.needsUpdate = true;
  }

  /* ---------- Scenen: Vinterhave med juletræ, snedriver, snesky og kanin ---------- */
  const srgb = hex => { const v = parseInt(hex.slice(1), 16); return new T.Vector3((v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255); };

  function byg() {
    renderer = new T.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.toneMapping = T.NeutralToneMapping; renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene();
    scene.fog = new T.Fog(DAG_HORISONT, 26, 78);
    camera = new T.PerspectiveCamera(42, 1, .1, 200);
    ray = new T.Raycaster(); ndc = new T.Vector2();
    tidU = { value: 0 };

    gradient = new T.DataTexture(new Uint8Array([115, 175, 228, 255]), 4, 1, T.RedFormat);
    gradient.minFilter = gradient.magFilter = T.NearestFilter; gradient.needsUpdate = true; tex.push(gradient);

    // Vinterhimmel (med glidende skift mellem vinterdag og stjerneklar julenat)
    himmelFarver = {
      dagTop: srgb(DAG_TOP), natTop: srgb(NAT_TOP),
      dagMidt: srgb(DAG_MIDT), natMidt: srgb(NAT_MIDT),
      dagHor: srgb(DAG_HORISONT), natHor: srgb(NAT_HORISONT),
      dagFog: new T.Color(DAG_HORISONT), natFog: new T.Color(NAT_HORISONT)
    };
    himmelMat = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false, toneMapped: false,
      uniforms: {
        top: { value: himmelFarver.dagTop.clone() }, midt: { value: himmelFarver.dagMidt.clone() },
        horisont: { value: himmelFarver.dagHor.clone() }, nat: { value: 0 },
        uTid: tidU,
        solDir: { value: new T.Vector3(.45, .38, -.75).normalize() }
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 top, midt, horisont, solDir; uniform float nat, uTid; varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir); float y = max(d.y, 0.0);
          vec3 c = mix(horisont, midt, smoothstep(0.0, 0.35, y));
          c = mix(c, top, smoothstep(0.28, 0.9, y));
          float s = max(dot(d, solDir), 0.0);
          c += vec3(1.0, 0.92, 0.78) * (pow(s, 6.0) * 0.22 + pow(s, 48.0) * 0.35) * (1.0 - nat * 0.75);
          // Små funklende julestjerner på nattehimlen
          if (nat > 0.05 && y > 0.12) {
            vec2 p = floor(d.xz / (d.y + 0.3) * 55.0);
            float h = fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            if (h > 0.965) {
              float blink = 0.65 + 0.35 * sin(uTid * (2.0 + fract(h * 97.0) * 3.0) + h * 120.0);
              c += vec3(1.0, 0.97, 0.85) * nat * blink * smoothstep(0.12, 0.3, y);
            }
          }
          gl_FragColor = vec4(c, 1.0);
        }`
    });
    const himmel = new T.Mesh(new T.SphereGeometry(110, 28, 16), himmelMat);
    himmel.renderOrder = -1; scene.add(himmel);

    const pm = new T.PMREMGenerator(renderer), envScene = new T.Scene();
    envScene.add(new T.Mesh(new T.SphereGeometry(20, 24, 12), himmelMat));
    envTex = pm.fromScene(envScene, .03).texture; scene.environment = envTex; pm.dispose();
    envScene.children[0].geometry.dispose();

    hemiLys = new T.HemisphereLight("#e6f2ff", "#a999cc", 1.35);
    scene.add(hemiLys);
    solLys = new T.DirectionalLight("#fff1d6", 2.0);
    solLys.position.set(10, 16, 12);
    solLys.castShadow = true; solLys.shadow.mapSize.set(2048, 2048);
    solLys.shadow.bias = -.0005; solLys.shadow.normalBias = .04;
    Object.assign(solLys.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 2, far: 45 });
    scene.add(solLys);

    bygSnehaven();
    bygJuletrae();
    bygKanin();
    bygSnesky();
    bygSnevejr();

    aktivGrp = new T.Group(); scene.add(aktivGrp);
    haveGrp = new T.Group(); scene.add(haveGrp);
    snedriverGrp = new T.Group(); scene.add(snedriverGrp);

    // Ring på jorden i midten, hvor snemanden stables
    pladsRing = new T.Mesh(
      new T.RingGeometry(.82, 1.28, 36),
      new T.MeshBasicMaterial({ color: "#a5ceff", side: T.DoubleSide, transparent: true, opacity: .6 })
    );
    pladsRing.rotation.x = -Math.PI / 2; pladsRing.position.y = .025;
    scene.add(pladsRing);

    kamPos = new T.Vector3(0, 5.2, 9.5); kamMaal = new T.Vector3(0, 1.2, 0);
    kamPosMaal = kamPos.clone(); kamMaalMaal = kamMaal.clone();
  }

  function haveHoejde(x, z) {
    const r = Math.hypot(x, z);
    if (r < HAVE_R) return 0;
    const u = (r - HAVE_R) / 14;
    return u * u * 3.8 + (Math.sin(x * .35) * Math.cos(z * .35)) * Math.min(1, u) * .65;
  }

  function bygSnehaven() {
    sneCanvas = document.createElement("canvas"); sneCanvas.width = sneCanvas.height = SNE_STR;
    nulstilSne();
    sneTex = new T.CanvasTexture(sneCanvas); sneTex.colorSpace = T.SRGBColorSpace; tex.push(sneTex);

    const midtGeo = new T.PlaneGeometry(28, 28, 56, 56); midtGeo.rotateX(-Math.PI / 2);
    const pa = midtGeo.attributes.position;
    for (let i = 0; i < pa.count; i++) pa.setY(i, haveHoejde(pa.getX(i), pa.getZ(i)));
    midtGeo.computeVertexNormals();
    jordMesh = new T.Mesh(midtGeo, new T.MeshToonMaterial({ map: sneTex, gradientMap: gradient }));
    jordMesh.receiveShadow = true; scene.add(jordMesh);

    const ydreGeo = new T.RingGeometry(13.5, 75, 48, 8); ydreGeo.rotateX(-Math.PI / 2);
    const ypa = ydreGeo.attributes.position;
    for (let i = 0; i < ypa.count; i++) ypa.setY(i, haveHoejde(ypa.getX(i), ypa.getZ(i)));
    ydreGeo.computeVertexNormals();
    const ydre = new T.Mesh(ydreGeo, toon("#eaf3ff")); ydre.receiveShadow = true; scene.add(ydre);

    const stammeGeo = new T.CylinderGeometry(.18, .28, 1.2, 7); stammeGeo.translate(0, .6, 0);
    const granGeo = new T.LatheGeometry([[0, .8], [1.4, .8], [.6, 1.9], [1.15, 1.9], [.42, 2.9], [.82, 2.9], [0, 4.1]].map(([x, y]) => new T.Vector2(x, y)), 8);
    const sneTopGeo = new T.ConeGeometry(.46, .75, 8); sneTopGeo.translate(0, 3.78, 0);
    const sneKant1 = new T.TorusGeometry(1.28, .11, 6, 12); sneKant1.rotateX(Math.PI / 2); sneKant1.translate(0, .86, 0);
    const sneKant2 = new T.TorusGeometry(1.04, .10, 6, 12); sneKant2.rotateX(Math.PI / 2); sneKant2.translate(0, 1.95, 0);
    const sneKant3 = new T.TorusGeometry(.74, .09, 6, 12); sneKant3.rotateX(Math.PI / 2); sneKant3.translate(0, 2.95, 0);

    const stammeMat = toon("#8a5a44"), granMat = toon("#388e72"), sneMat = toon("#ffffff");
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + (i % 2) * .08;
      if (Math.abs(Math.sin(a)) < .38 && Math.cos(a) > 0) continue;
      const r = 9.8 + (i % 3) * 2.6 + (i * 17 % 5) * .5;
      const x = Math.sin(a) * r, z = Math.cos(a) * r, y = haveHoejde(x, z) - .1;
      const s = .85 + (i * 13 % 7) * .12;
      const tGrp = new T.Group(); tGrp.position.set(x, y, z); tGrp.scale.setScalar(s);
      tGrp.add(medStreg(stammeGeo, stammeMat, .05));
      tGrp.add(medStreg(granGeo, granMat, .06));
      tGrp.add(new T.Mesh(sneTopGeo, sneMat));
      tGrp.add(new T.Mesh(sneKant1, sneMat));
      tGrp.add(new T.Mesh(sneKant2, sneMat));
      tGrp.add(new T.Mesh(sneKant3, sneMat));
      scene.add(tGrp);
    }

    const stolpeGeo = new T.BoxGeometry(.22, .95, .22), laegteGeo = new T.BoxGeometry(2.3, .16, .1);
    const hegnMat = toon("#c95247");
    for (const side of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const a = side * (.65 + k * .24), r = 8.4;
        const p = medStreg(stolpeGeo, hegnMat, .03);
        p.position.set(Math.sin(a) * r, haveHoejde(Math.sin(a) * r, -Math.cos(a) * r) + .42, -Math.cos(a) * r);
        p.rotation.y = -a;
        scene.add(p);
        const sneHatte = new T.Mesh(new T.SphereGeometry(.16, 8, 6), sneMat);
        sneHatte.scale.set(1, .55, 1); sneHatte.position.y = .5; p.add(sneHatte);
        if (k < 3) {
          const l = medStreg(laegteGeo, hegnMat, .025);
          l.position.set(side * 1.05, .12, 0); p.add(l);
        }
      }
    }
  }

  // Stor 3D-snesky der svæver ind over haven, når man trykker på 🌨️
  function bygSnesky() {
    sneSkyGrp = new T.Group();
    const skyMat = toon("#ffffff", { emissive: "#dceeff", emissiveIntensity: .25 });
    const kugler = [[0, 0, 0, 1.4], [-1.2, -.15, .2, 1.05], [1.25, -.1, -.1, 1.1], [-.6, .35, -.3, .95], [.65, .3, .25, 1.0]];
    kugler.forEach(([x, y, z, r]) => {
      const m = medStreg(new T.SphereGeometry(r, 16, 12), skyMat, .05, false);
      m.position.set(x, y, z); m.scale.y = .78;
      sneSkyGrp.add(m);
    });
    sneSkyGrp.position.set(-16, 6.2, 0);
    sneSkyGrp.visible = false;
    scene.add(sneSkyGrp);
  }

  function rydSnedriver() {
    if (!snedriverGrp) return;
    while (snedriverGrp.children.length) {
      const c = snedriverGrp.children[0];
      c.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      snedriverGrp.remove(c);
    }
    snedriver = [];
  }

  function fyldSnedriver(antal = 6) {
    if (!snedriverGrp) return;
    rydSnedriver();
    const sneMat = toon("#ffffff", { emissive: "#e3f2ff", emissiveIntensity: .12 });
    const pladser = [
      [-3.2, 3.2], [3.5, 3.0], [-2.8, -1.6], [4.2, -.5],
      [-2.4, -2.8], [2.9, -2.4], [0.2, 4.3], [-1.5, 3.8], [1.9, 3.9]
    ];
    Spil.shuffle(pladser).slice(0, antal).forEach(([bx, bz]) => {
      const x = bx + (Math.random() - .5) * .65;
      const z = bz + (Math.random() - .5) * .65;
      const g = new T.Group();
      g.position.set(x, haveHoejde(x, z), z);
      const r = .52 + Math.random() * .16;
      const hoved = medStreg(new T.SphereGeometry(r, 14, 10), sneMat, .03);
      hoved.scale.set(1.25, .48, 1.05); hoved.position.y = r * .18; g.add(hoved);
      const side = medStreg(new T.SphereGeometry(r * .72, 12, 8), sneMat, .025);
      side.scale.set(1.15, .44, .95); side.position.set(r * .58, r * .12, r * .18); g.add(side);
      g.rotation.y = Math.random() * Math.PI * 2;
      g.scale.setScalar(.01);
      snedriverGrp.add(g);
      snedriver.push({ grp: g, x, z, r: r * 1.15, brugt: false, skal: .01 });
    });
  }

  function kaldSnesky() {
    sneByge = 5.5;
    sneSkyGrp.visible = true;
    sneSkyAnim = { t: 0, fyldt: false };
    juleKlokker([783.99, 987.77, 1174.66, 1567.98], .08);
    Spil.say("Se, en snesky! Nu kommer der frisk sne!", null, "sne-sner");
  }

  function skiftDagNat() {
    erNat = !erNat;
    const b = $(".sn-natknap");
    if (b) b.textContent = erNat ? "☀️" : "🌙";
    juleKlokker(erNat ? [659.25, 783.99, 987.77, 1318.5] : [523.25, 659.25, 783.99, 1046.5], .1);
    Spil.say(
      erNat ? "Godaften! Se alle julelysene i mørket!" : "Godmorgen i sneen!",
      null,
      erNat ? "sne-nat" : "sne-dag"
    );
  }

  function lavGloedeTex() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,0.8)");
    g.addColorStop(0.24, "rgba(255,255,255,0.48)");
    g.addColorStop(0.58, "rgba(255,255,255,0.14)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const t = new T.CanvasTexture(c);
    tex.push(t);
    return t;
  }

  function bygJuletrae() {
    juletraeGrp = new T.Group();
    juletraeGrp.position.set(0, haveHoejde(0, -6.8), -6.8);
    scene.add(juletraeGrp);
    const gloedeTex = lavGloedeTex();

    const stamme = medStreg(new T.CylinderGeometry(.32, .45, 1.4, 10), toon("#7c4e38"), .05);
    stamme.position.y = .7; juletraeGrp.add(stamme);

    const lag = [[2.35, 1.9, 1.1], [1.9, 1.75, 2.3], [1.4, 1.55, 3.45], [.9, 1.35, 4.45]];
    lag.forEach(([r, h, y]) => {
      const kegle = medStreg(new T.ConeGeometry(r, h, 14), toon("#2e8568"), .055);
      kegle.position.y = y + h / 2; juletraeGrp.add(kegle);
      const sneRing = new T.Mesh(new T.TorusGeometry(r * .92, .13, 8, 20), toon("#ffffff"));
      sneRing.rotation.x = Math.PI / 2; sneRing.scale.z = .65; sneRing.position.y = y + .12;
      juletraeGrp.add(sneRing);
    });

    const s = new T.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? .24 : .58, a = i / 10 * Math.PI * 2 - Math.PI / 2;
      i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const stjGeo = new T.ExtrudeGeometry(s, { depth: .18, bevelEnabled: true, bevelThickness: .06, bevelSize: .05, bevelSegments: 1 });
    stjGeo.center();
    stjerneTop = medStreg(stjGeo, toon("#ffd84a", { emissive: "#ffae00", emissiveIntensity: .85 }), .04);
    stjerneTop.position.y = 6.05;
    juletraeGrp.add(stjerneTop);

    const stjMat = new T.SpriteMaterial({
      map: gloedeTex, color: "#ffe066", blending: T.AdditiveBlending,
      transparent: true, opacity: .72, depthWrite: false
    });
    stjerneHalo = new T.Sprite(stjMat);
    stjerneHalo.position.y = 6.05;
    stjerneHalo.scale.setScalar(2.6);
    juletraeGrp.add(stjerneHalo);

    // Varmt julelys der oplyser træet, gaverne og sneen om natten
    juletraeLys = new T.PointLight("#ffcf70", 0, 22);
    juletraeLys.position.set(0, 3.4, 2.2);
    juletraeGrp.add(juletraeLys);
    juleFodLys = new T.PointLight("#ffb347", 0, 10);
    juleFodLys.position.set(0, 1.0, 1.4);
    juletraeGrp.add(juleFodLys);

    // Snoet lyskæde med små glitrende fe-lys rundt om træet
    feLys = [];
    const kaedePkt = [];
    const kaedeTrin = 42;
    for (let i = 0; i <= kaedeTrin; i++) {
      const t = i / kaedeTrin, y = 1.25 + t * 4.3, r = (1 - t * .78) * 2.22, a = t * Math.PI * 7.5;
      kaedePkt.push(new T.Vector3(Math.sin(a) * r, y, Math.cos(a) * r));
    }
    const kaedeGeo = new T.TubeGeometry(new T.CatmullRomCurve3(kaedePkt), 48, .022, 5, false);
    juletraeGrp.add(new T.Mesh(kaedeGeo, toon("#1f5a45")));
    for (let i = 0; i <= kaedeTrin; i++) {
      const pt = kaedePkt[i];
      const fMat = new T.SpriteMaterial({
        map: gloedeTex, color: i % 2 ? "#fff4c2" : "#ffd27d",
        blending: T.AdditiveBlending, transparent: true, opacity: .65, depthWrite: false
      });
      const sp = new T.Sprite(fMat);
      sp.position.copy(pt);
      sp.scale.setScalar(.36);
      juletraeGrp.add(sp);
      feLys.push({ sprite: sp, mat: fMat, i });
    }

    juleLys = [];
    const kugleGeo = new T.SphereGeometry(.17, 12, 10);
    const farver = ["#ff4d4d", "#ffd23f", "#4da6ff", "#ff7ac6", "#7be382"];
    for (let i = 0; i < 22; i++) {
      const t = i / 21, y = 1.35 + t * 4.15, r = (1 - t * .76) * 2.1, a = i * 1.15;
      const f = farver[i % farver.length];
      const mat = new T.MeshToonMaterial({ color: f, emissive: f, emissiveIntensity: .65, gradientMap: gradient });
      const k = medStreg(kugleGeo, mat, .025, false);
      k.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
      juletraeGrp.add(k);

      const haloMat = new T.SpriteMaterial({
        map: gloedeTex, color: f, blending: T.AdditiveBlending,
        transparent: true, opacity: .65, depthWrite: false
      });
      const halo = new T.Sprite(haloMat);
      halo.position.copy(k.position);
      halo.scale.setScalar(1.05);
      juletraeGrp.add(halo);

      juleLys.push({ mesh: k, mat, halo, haloMat, basisFarve: new T.Color(f), i });
    }

    gaverListe = [];
    const gaver = [
      [-1.35, .42, .95, "#e5483f", "#ffd23f", .55, .2],
      [1.4, .36, .85, "#3b82e6", "#ffffff", .48, -.35],
      [-.35, .32, 1.55, "#52b765", "#ff5c5c", .42, .15],
    ];
    gaver.forEach(([x, y, z, f1, f2, str, rot]) => {
      const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = rot;
      g.add(medStreg(new T.BoxGeometry(str, str, str), toon(f1), .03));
      g.add(new T.Mesh(new T.BoxGeometry(str * 1.04, str * 1.04, str * .22), toon(f2)));
      g.add(new T.Mesh(new T.BoxGeometry(str * .22, str * 1.04, str * 1.04), toon(f2)));
      juletraeGrp.add(g);
      gaverListe.push({ grp: g, basisY: y, basisRot: rot, hop: 0 });
    });
  }

  function skiftJuletraeLys(snak = true) {
    lysTema = (lysTema + 1) % 4;
    juleKlokker([523.25, 659.25, 783.99, 1046.5, 1318.5], .09);
    const p = skaermPunkt(new T.Vector3(0, 4.5, -6.8));
    if (!roligt()) Spil.burst(p.x, p.y, "⭐✨🎄🌟✨");
    if (kaninGrp) kaninGrp.userData.hop = 1.3;
    if (fase === "have") {
      haveSnemaend.forEach(sm => {
        if (!dansere.some(d => d.sm === sm)) dansere.push({ sm, t: 0 });
      });
    }
    if (snak) Spil.say("Se, juletræet lyser!", null, "sne-juletrae");
  }

  function bygKanin() {
    kaninGrp = new T.Group();
    kaninGrp.position.set(-4.3, haveHoejde(-4.3, .8), .8);
    kaninGrp.rotation.y = .85;
    scene.add(kaninGrp);

    const hvid = toon("#fffaf2"), lyseroed = toon("#ffb3c6"), roed = toon("#e53e38"), sort = toon(STREG);
    const krop = medStreg(new T.SphereGeometry(.46, 16, 12), hvid, .035);
    krop.scale.set(.95, 1.05, 1.1); krop.position.y = .45; kaninGrp.add(krop);

    const hale = medStreg(new T.SphereGeometry(.16, 10, 8), hvid, .025);
    hale.position.set(0, .32, -.48); kaninGrp.add(hale);

    const hoved = new T.Group(); hoved.position.set(0, .95, .15); kaninGrp.add(hoved);
    hoved.add(medStreg(new T.SphereGeometry(.34, 16, 12), hvid, .035));

    const oerer = [];
    for (const s of [-1, 1]) {
      const oje = new T.Mesh(new T.SphereGeometry(.055, 10, 8), sort);
      oje.position.set(s * .14, .06, .29); hoved.add(oje);
      const oere = new T.Group(); oere.position.set(s * .13, .28, -.04); oere.rotation.z = -s * .18;
      const ydre = medStreg(new T.CapsuleGeometry(.075, .36, 6, 10), hvid, .025); ydre.position.y = .2; oere.add(ydre);
      const indre = new T.Mesh(new T.CapsuleGeometry(.04, .26, 4, 8), lyseroed); indre.position.set(0, .2, .045); oere.add(indre);
      hoved.add(oere); oerer.push(oere);
    }
    const snude = new T.Mesh(new T.SphereGeometry(.055, 8, 6), lyseroed);
    snude.position.set(0, -.01, .33); hoved.add(snude);

    const hue = new T.Group(); hue.position.set(0, .28, -.02); hue.rotation.x = -.25; hoved.add(hue);
    hue.add(medStreg(new T.TorusGeometry(.22, .065, 8, 18), hvid, .02));
    const kegle = medStreg(new T.ConeGeometry(.21, .48, 12), roed, .025); kegle.position.y = .24; hue.add(kegle);
    const kvast = medStreg(new T.SphereGeometry(.085, 10, 8), hvid, .02); kvast.position.set(0, .49, -.04); hue.add(kvast);
    kaninGrp.userData = { hoved, oerer, hop: 0 };
  }

  function bygSnevejr() {
    const N = 260, pos = new Float32Array(N * 3), data = [];
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - .5) * 32, y = Math.random() * 16, z = (Math.random() - .5) * 28;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      data.push({ f: 1.1 + Math.random() * 1.2, a: Math.random() * 6.28, r: .3 + Math.random() * .6 });
    }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(pos, 3));
    sneFnug = new T.Points(g, new T.PointsMaterial({
      size: .36, map: prikTex(), color: "#ffffff", transparent: true, opacity: .88, depthWrite: false
    }));
    sneFnug.userData.d = data;
    scene.add(sneFnug);

    const PN = 42, pPos = new Float32Array(PN * 3);
    const pg = new T.BufferGeometry(); pg.setAttribute("position", new T.BufferAttribute(pPos, 3));
    snePust = new T.Points(pg, new T.PointsMaterial({
      size: .28, map: prikTex(), color: "#ffffff", transparent: true, opacity: .85, depthWrite: false
    }));
    snePust.userData.p = Array.from({ length: PN }, () => ({ x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, liv: 0 }));
    scene.add(snePust);
  }

  function pustSne(x, y, z, n = 4) {
    if (!snePust || roligt()) return;
    const ps = snePust.userData.p;
    for (let k = 0; k < n; k++) {
      const p = ps.find(u => u.liv <= 0) || ps[Math.floor(Math.random() * ps.length)];
      const a = Math.random() * Math.PI * 2, f = 1.2 + Math.random() * 2.2;
      p.x = x + (Math.random() - .5) * .3; p.y = y + .1; p.z = z + (Math.random() - .5) * .3;
      p.vx = Math.cos(a) * f; p.vy = 1.6 + Math.random() * 2.2; p.vz = Math.sin(a) * f;
      p.liv = .45 + Math.random() * .25;
    }
  }

  /* ---------- Byg 3D-snekugle og al pynt (Krop + Hoved, Snemand & Snekone) ---------- */
  function lavSnekugleMesh(r) {
    const geo = new T.SphereGeometry(1, 24, 18);
    const pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
      const bule = 1 + .025 * Math.sin(x * 5 + y * 4) * Math.cos(z * 5);
      pa.setXYZ(i, x * bule, y * (.94 * bule), z * bule);
    }
    geo.computeVertexNormals();
    const m = medStreg(geo, toon("#f8fbff"), .042);
    m.scale.setScalar(r);
    return m;
  }

  function kugleStakY(radier, idx) {
    let y = 0;
    for (let i = 0; i < idx; i++) y += radier[i] * 1.52;
    return y + radier[idx] * .86;
  }

  function bygSnemandPynt(grp, radier, valg) {
    const gammel = grp.getObjectByName("pyntRod");
    if (gammel) {
      gammel.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      grp.remove(gammel);
    }
    const rod = new T.Group(); rod.name = "pyntRod"; grp.add(rod);

    const r0 = radier[0] || 1.0, r1 = radier[1] || .8, r2 = radier[2] || .6;
    const y0 = kugleStakY(radier, 0), y1 = kugleStakY(radier, 1), y2 = kugleStakY(radier, 2);
    const kulMat = toon(STREG), hvidMat = toon("#ffffff"), roedMat = toon("#e53e38"),
      guldMat = toon("#ffd23f", { emissive: "#ff9900", emissiveIntensity: .3 }),
      pinkMat = toon("#ff7597");

    // --- ANSIGT: Øjne, vipper, kinder, briller, skæg og mund ---
    const oejne = [];
    for (const s of [-1, 1]) {
      const oje = medStreg(new T.SphereGeometry(r2 * .135, 12, 10), kulMat, .015);
      oje.position.set(s * r2 * .34, y2 + r2 * .20, r2 * .89);
      const glimt = new T.Mesh(new T.SphereGeometry(r2 * .048, 8, 6), hvidMat);
      glimt.position.set(s * r2 * .03, r2 * .04, r2 * .11); oje.add(glimt);

      if (valg.ansigt === "vipper") {
        for (let v = 0; v < 3; v++) {
          const vip = new T.Mesh(new T.CapsuleGeometry(r2 * .018, r2 * .11, 4, 6), kulMat);
          const va = s * (.35 + v * .32);
          vip.position.set(Math.sin(va) * r2 * .14, Math.cos(va) * r2 * .14, r2 * .03);
          vip.rotation.z = -va;
          oje.add(vip);
        }
        const kind = new T.Mesh(new T.SphereGeometry(r2 * .14, 10, 8), pinkMat);
        kind.scale.set(1.2, .75, .5);
        kind.position.set(s * r2 * .48, y2 - r2 * .04, r2 * .82);
        rod.add(kind);
      }
      rod.add(oje); oejne.push(oje);
    }
    grp.userData.oejne = oejne;

    if (valg.briller === "briller" || valg.ansigt === "briller") {
      const br = new T.Group(); br.position.set(0, y2 + r2 * .20, r2 * .97);
      const stelMat = toon("#d43b3b");
      for (const s of [-1, 1]) {
        const ring = medStreg(new T.TorusGeometry(r2 * .22, r2 * .035, 8, 20), stelMat, .012);
        ring.position.x = s * r2 * .34; br.add(ring);
      }
      const bro = new T.Mesh(new T.CylinderGeometry(r2 * .028, r2 * .028, r2 * .26, 8), stelMat);
      bro.rotation.z = Math.PI / 2; br.add(bro);
      rod.add(br);
    }

    if (valg.ansigt === "skaeg") {
      const sk = new T.Group();
      const puf = [
        [0, -.32, .88, .28], [-.24, -.26, .86, .24], [.24, -.26, .86, .24],
        [-.42, -.14, .80, .20], [.42, -.14, .80, .20],
        [0, -.52, .78, .26], [-.2, -.48, .78, .22], [.2, -.48, .78, .22], [0, -.68, .66, .21]
      ];
      puf.forEach(([x, y, z, r]) => {
        const m = medStreg(new T.SphereGeometry(r2 * r, 12, 10), hvidMat, .02);
        m.position.set(x * r2, y2 + y * r2, z * r2);
        sk.add(m);
      });
      rod.add(sk);
    } else if (valg.ansigt === "vipper") {
      // Glad rød snekone-mund
      for (let i = -2; i <= 2; i++) {
        const l = new T.Mesh(new T.SphereGeometry(r2 * .072, 10, 8), roedMat);
        const vx = i * .19, vy = -.24 + (i * i) * .042;
        const vz = Math.sqrt(Math.max(.1, 1 - vx * vx - vy * vy));
        l.position.set(vx * r2, y2 + vy * r2, vz * r2 * .98);
        rod.add(l);
      }
    } else {
      // Klassisk kul-smil
      for (let i = -2; i <= 2; i++) {
        const kul = medStreg(new T.DodecahedronGeometry(r2 * .072, 0), kulMat, .012);
        const vx = i * .21, vy = -.24 + (i * i) * .042;
        const vz = Math.sqrt(Math.max(.1, 1 - vx * vx - vy * vy));
        kul.position.set(vx * r2, y2 + vy * r2, vz * r2 * .98);
        rod.add(kul);
      }
    }

    // --- NÆSE ---
    if (valg.naese === "gulerod") {
      const g = medStreg(new T.ConeGeometry(r2 * .15, r2 * .82, 12), toon("#ff7a22"), .025);
      g.rotation.x = Math.PI / 2; g.position.set(0, y2 + r2 * .02, r2 * 1.18);
      rod.add(g);
    } else if (valg.naese === "rudolf") {
      const n = medStreg(new T.SphereGeometry(r2 * .22, 16, 12), toon("#ff2a2a", { emissive: "#ff1a1a", emissiveIntensity: .85 }), .025);
      n.position.set(0, y2 + r2 * .03, r2 * .98);
      const lys = new T.PointLight("#ff3333", .35, 2.4);
      lys.position.set(0, 0, r2 * .42); n.add(lys);
      rod.add(n);
    } else if (valg.naese === "jordbaer") {
      const jb = medStreg(new T.ConeGeometry(r2 * .22, r2 * .45, 12), toon("#e83858"), .025);
      jb.rotation.x = Math.PI / 2; jb.position.set(0, y2 + r2 * .02, r2 * 1.04);
      rod.add(jb);
    }

    // --- HÅR (Snekone-fletninger) ---
    const topY = y2 + r2 * .82;
    if (valg.haar === "fletninger") {
      const haarMat = toon("#f5c242");
      // Pandehår + to lange fletninger med røde sløjfer
      for (let i = -2; i <= 2; i++) {
        const tot = medStreg(new T.SphereGeometry(r2 * .18, 10, 8), haarMat, .02);
        tot.scale.set(1.2, .7, .9);
        tot.position.set(i * r2 * .24, y2 + r2 * .68 - Math.abs(i) * r2 * .05, r2 * .52);
        rod.add(tot);
      }
      for (const s of [-1, 1]) {
        const fl = new T.Group();
        for (let k = 0; k < 5; k++) {
          const kug = medStreg(new T.SphereGeometry(r2 * (.20 - k * .018), 10, 8), haarMat, .02);
          kug.position.set(s * r2 * (.82 + k * .08), y2 + r2 * (.35 - k * .26), r2 * (.15 + k * .04));
          fl.add(kug);
        }
        const sl = medStreg(new T.OctahedronGeometry(r2 * .16, 0), roedMat, .02);
        sl.scale.set(1.4, .8, .7);
        sl.position.set(s * r2 * 1.14, y2 - r2 * .72, r2 * .32);
        fl.add(sl);
        rod.add(fl);
      }
    }

    // --- HAT ---
    if (valg.hat === "nissehue") {
      const h = new T.Group(); h.position.set(0, topY, 0);
      const kant = medStreg(new T.TorusGeometry(r2 * .68, r2 * .17, 10, 24), hvidMat, .03);
      kant.rotation.x = Math.PI / 2; h.add(kant);
      const kegle = medStreg(new T.ConeGeometry(r2 * .66, r2 * 1.35, 16), roedMat, .035);
      kegle.position.set(0, r2 * .62, -r2 * .08); kegle.rotation.x = -.22; kegle.rotation.z = .15; h.add(kegle);
      const kvast = medStreg(new T.SphereGeometry(r2 * .24, 12, 10), hvidMat, .025);
      kvast.position.set(-r2 * .18, r2 * 1.24, -r2 * .32); h.add(kvast);
      rod.add(h);
    } else if (valg.hat === "hoejhat") {
      const h = new T.Group(); h.position.set(0, topY, 0);
      h.add(medStreg(new T.CylinderGeometry(r2 * .95, r2 * .95, r2 * .12, 24), kulMat, .03));
      const puld = medStreg(new T.CylinderGeometry(r2 * .64, r2 * .58, r2 * .95, 22), kulMat, .035);
      puld.position.y = r2 * .5; h.add(puld);
      const baand = new T.Mesh(new T.CylinderGeometry(r2 * .61, r2 * .60, r2 * .2, 22), roedMat);
      baand.position.y = r2 * .18; h.add(baand);
      rod.add(h);
    } else if (valg.hat === "krone") {
      const h = new T.Group(); h.position.set(0, topY + r2 * .18, 0);
      h.add(medStreg(new T.CylinderGeometry(r2 * .62, r2 * .54, r2 * .42, 16), guldMat, .03));
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const spids = medStreg(new T.ConeGeometry(r2 * .16, r2 * .34, 8), guldMat, .02);
        spids.position.set(Math.sin(a) * r2 * .54, r2 * .34, Math.cos(a) * r2 * .54);
        h.add(spids);
        const juvel = new T.Mesh(new T.SphereGeometry(r2 * .07, 8, 6), i % 2 ? roedMat : pinkMat);
        juvel.position.set(Math.sin(a) * r2 * .59, 0, Math.cos(a) * r2 * .59);
        h.add(juvel);
      }
      rod.add(h);
    } else if (valg.hat === "strikhue") {
      const h = new T.Group(); h.position.set(0, topY - r2 * .05, 0);
      const lillaMat = toon("#9b5de5"), stribeMat = toon("#ff7597");
      const kant = medStreg(new T.TorusGeometry(r2 * .68, r2 * .17, 10, 24), stribeMat, .03);
      kant.rotation.x = Math.PI / 2; h.add(kant);
      const kuppel = medStreg(new T.SphereGeometry(r2 * .72, 18, 12, 0, Math.PI * 2, 0, Math.PI * .55), lillaMat, .035);
      h.add(kuppel);
      const kvast = medStreg(new T.SphereGeometry(r2 * .28, 12, 10), hvidMat, .025);
      kvast.position.y = r2 * .78; h.add(kvast);
      rod.add(h);
    } else if (valg.hat === "gevir") {
      const h = new T.Group(); h.position.set(0, topY, 0);
      const brun = toon("#8c583a");
      for (const s of [-1, 1]) {
        const g = new T.Group(); g.position.set(s * r2 * .38, 0, 0); g.rotation.z = -s * .38;
        const st = medStreg(new T.CapsuleGeometry(r2 * .08, r2 * .85, 6, 10), brun, .025);
        st.position.y = r2 * .42; g.add(st);
        for (const [ty, v] of [[.35, .65], [.65, -.55]]) {
          const gren = medStreg(new T.CapsuleGeometry(r2 * .06, r2 * .38, 5, 8), brun, .02);
          gren.position.set(s * (v > 0 ? .18 : -.14), r2 * ty, 0); gren.rotation.z = -s * v;
          g.add(gren);
        }
        h.add(g);
      }
      rod.add(h);
    }

    // --- KROP: Halstørklæde, Sløjfe, Perlekæde, Kjole, Vest og Knapper ---
    const halsY = y2 - r2 * .68;
    if (valg.hals === "roed" || valg.hals === "blaa") {
      const farve = valg.hals === "blaa" ? "#3b82e6" : "#e53e38";
      const hMat = toon(farve);
      const ring = medStreg(new T.TorusGeometry(r2 * .74, r2 * .19, 10, 24), hMat, .03);
      ring.rotation.x = Math.PI / 2; ring.position.y = halsY; rod.add(ring);
      const snip = medStreg(new T.BoxGeometry(r2 * .3, r1 * .85, r2 * .14), hMat, .025);
      snip.position.set(r2 * .38, halsY - r1 * .38, r2 * .64); snip.rotation.z = -.18; snip.rotation.x = -.15;
      rod.add(snip);
    } else if (valg.hals === "sloejfe") {
      const sl = new T.Group(); sl.position.set(0, halsY + r2 * .04, r2 * .78);
      for (const s of [-1, 1]) {
        const vinge = medStreg(new T.ConeGeometry(r2 * .26, r2 * .44, 10), roedMat, .025);
        vinge.rotation.z = s * Math.PI / 2; vinge.position.x = s * r2 * .22;
        sl.add(vinge);
      }
      sl.add(medStreg(new T.SphereGeometry(r2 * .13, 10, 8), guldMat, .02));
      rod.add(sl);
    } else if (valg.hals === "perler") {
      const pMat = toon("#fff0f6", { emissive: "#ffd6e8", emissiveIntensity: .2 });
      const N = 16;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const perle = medStreg(new T.SphereGeometry(r2 * .11, 10, 8), i % 2 ? pMat : pinkMat, .016);
        perle.position.set(Math.sin(a) * r2 * .76, halsY - Math.cos(a) * r2 * .08, Math.cos(a) * r2 * .76);
        rod.add(perle);
      }
    }

    if (valg.toej === "kjole") {
      // Snekone-skørt omkring maven/nederste kugle
      const skMat = toon("#e84a7f"), kantMat = toon("#ffffff");
      const skoert = medStreg(new T.CylinderGeometry(r1 * .86, r0 * 1.24, r0 * .95, 24, 1, true), skMat, .035);
      skoert.position.y = y0 + r0 * .42; rod.add(skoert);
      const baelte = medStreg(new T.TorusGeometry(r1 * .87, r1 * .11, 8, 24), guldMat, .025);
      baelte.rotation.x = Math.PI / 2; baelte.position.y = y0 + r0 * .88; rod.add(baelte);
      const bundKant = medStreg(new T.TorusGeometry(r0 * 1.22, r0 * .09, 8, 24), kantMat, .025);
      bundKant.rotation.x = Math.PI / 2; bundKant.position.y = y0 - r0 * .04; rod.add(bundKant);
    } else if (valg.toej === "vest") {
      const vMat = toon("#c93434");
      const vest = medStreg(new T.CylinderGeometry(r1 * .88, r1 * 1.04, r1 * 1.15, 22, 1, true, .45, Math.PI * 2 - .9), vMat, .035);
      vest.rotation.y = Math.PI; vest.position.y = y1; rod.add(vest);
    }

    // Knapper på maven (hjerter eller runde knapper)
    for (let i = 0; i < 3; i++) {
      const a = (i - 1) * .34;
      const ky = y1 + Math.sin(a) * r1 * .82, kz = Math.cos(a) * r1 * .95;
      if (valg.knap === "hjerter") {
        const hj = new T.Group(); hj.position.set(0, ky, kz);
        for (const s of [-1, 1]) {
          const del = medStreg(new T.CapsuleGeometry(r1 * .075, r1 * .09, 6, 8), roedMat, .015);
          del.position.x = s * r1 * .045; del.rotation.z = s * .52;
          hj.add(del);
        }
        rod.add(hj);
      } else {
        const kMat = valg.toej === "vest" ? guldMat : valg.hals === "roed" ? roedMat : valg.hals === "blaa" ? toon("#3b82e6") : kulMat;
        const knap = medStreg(new T.SphereGeometry(r1 * .11, 10, 8), kMat, .018);
        knap.position.set(0, ky, kz);
        rod.add(knap);
      }
    }

    // --- ARME, LUFFER & TING I HÅNDEN ---
    const arme = [];
    const harArme = valg.arm || valg.ting;
    if (harArme) {
      const grenMat = toon("#7a4b32");
      for (const s of [-1, 1]) {
        const arm = new T.Group();
        arm.position.set(s * r1 * .82, y1 + r1 * .2, 0);
        arm.rotation.z = -s * .45;
        const pind = medStreg(new T.CylinderGeometry(r1 * .055, r1 * .08, r1 * 1.25, 8), grenMat, .022);
        pind.position.set(s * r1 * .55, r1 * .25, 0); pind.rotation.z = -s * 1.15;
        arm.add(pind);

        if (valg.arm === "luffer") {
          const luf = new T.Group(); luf.position.set(s * r1 * 1.12, r1 * .5, 0);
          luf.add(medStreg(new T.SphereGeometry(r1 * .22, 12, 10), roedMat, .025));
          const tommel = medStreg(new T.SphereGeometry(r1 * .11, 8, 8), roedMat, .02);
          tommel.position.set(-s * r1 * .12, r1 * .16, r1 * .08); luf.add(tommel);
          const kant = medStreg(new T.TorusGeometry(r1 * .15, r1 * .06, 8, 14), hvidMat, .02);
          kant.position.set(-s * r1 * .16, -r1 * .08, 0); kant.rotation.y = Math.PI / 2; luf.add(kant);
          arm.add(luf);
        } else {
          const kvist = medStreg(new T.CylinderGeometry(r1 * .035, r1 * .05, r1 * .42, 6), grenMat, .018);
          kvist.position.set(s * r1 * .82, r1 * .48, 0); kvist.rotation.z = -s * .55;
          arm.add(kvist);
        }

        if (s === 1 && valg.ting === "kost") {
          const kost = new T.Group(); kost.position.set(r1 * 1.05, r1 * .1, .15); kost.rotation.z = .35;
          kost.add(medStreg(new T.CylinderGeometry(.05, .05, 2.2, 8), toon("#c48b52"), .02));
          const hoved = medStreg(new T.ConeGeometry(.38, .75, 12), toon("#e6b84e"), .03);
          hoved.position.y = 1.15; kost.add(hoved);
          arm.add(kost);
        } else if (s === 1 && valg.ting === "sukkerstok") {
          const stok = new T.Group(); stok.position.set(r1 * 1.02, r1 * .35, .18); stok.rotation.z = .25;
          stok.add(medStreg(new T.CylinderGeometry(.075, .075, 1.35, 12), hvidMat, .022));
          for (let k = -2; k <= 2; k++) {
            const baand = new T.Mesh(new T.CylinderGeometry(.082, .082, .13, 12), roedMat);
            baand.position.y = k * .25; stok.add(baand);
          }
          const krog = medStreg(new T.TorusGeometry(.22, .075, 10, 18, Math.PI), roedMat, .022);
          krog.position.set(-.22, .67, 0); stok.add(krog);
          arm.add(stok);
        } else if (s === 1 && valg.ting === "lanterne") {
          const lan = new T.Group(); lan.position.set(r1 * 1.12, r1 * .12, .22);
          lan.add(medStreg(new T.CylinderGeometry(.18, .22, .08, 8), kulMat, .02));
          const glas = medStreg(new T.CylinderGeometry(.16, .18, .38, 8), toon("#ffe680", { emissive: "#ffae00", emissiveIntensity: .95 }), .02);
          glas.position.y = -.22; lan.add(glas);
          const bund = medStreg(new T.CylinderGeometry(.22, .18, .08, 8), kulMat, .02);
          bund.position.y = -.44; lan.add(bund);
          const lys = new T.PointLight("#ffae33", 2.2, 6);
          lys.position.set(0, -.22, .2); lan.add(lys);
          arm.add(lan);
        }
        rod.add(arm); arme.push(arm);
      }
    }
    grp.userData.arme = arme;
  }

  /* ---------- Kamera-indramning (hele snemanden synlig over knapperne) ---------- */
  function indram() {
    if (!cv) return;
    const asp = cv.clientWidth / Math.max(1, cv.clientHeight);
    const smal = asp < 1;
    const r0 = kugler[0] ? kugler[0].r : 1, r1 = kugler[1] ? kugler[1].r : .8, r2 = kugler[2] ? kugler[2].r : .6;
    const radier = [r0, r1, r2];
    const y2 = kugleStakY(radier, 2);

    if (fase === "rul") {
      kamMaalMaal.set(0, 1.1, .7);
      kamPosMaal.set(0, smal ? 6.8 : 5.2, smal ? 12.2 : 9.4);
    } else if (fase === "krop") {
      const y1 = kugleStakY(radier, 1);
      const top = y2 + r2 + 1.1;
      const løft = smal ? 1.1 : .68;
      kamMaalMaal.set(0, y1 - løft * .65, 0);
      const afstand = (smal ? 8.6 : 6.1) * Math.max(.86, top / 4.2);
      kamPosMaal.set(0, y1 + .35, afstand);
    } else if (fase === "hoved") {
      // Zoom tæt på hovedet og hatten, løftet op over pynteknapperne i bunden
      const løft = smal ? .95 : .52;
      kamMaalMaal.set(0, y2 + r2 * .25 - løft, 0);
      const afstand = (smal ? 6.8 : 5.0) * Math.max(.85, r2 / .60);
      kamPosMaal.set(0, y2 + r2 * .45, afstand);
    } else if (fase === "fest") {
      const top = y2 + r2 + 1.15;
      const løft = smal ? .35 : .15;
      kamMaalMaal.set(0, top * .46 - løft, 0);
      const afstand = (smal ? 10.2 : 7.4) * Math.max(.88, top / 3.8);
      kamPosMaal.set(0, top * .50 + .55, afstand);
    } else if (fase === "have") {
      const tv = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
      if (vistSnemand) {
        const p = vistSnemand.position;
        kamMaalMaal.set(p.x, 1.55, p.z);
        kamPosMaal.set(p.x * .7, 2.4, p.z + (smal ? 6.8 : 5.2));
      } else {
        const halvB = haveSnemaend.length > 2 ? 4.7 : 3.4;
        const d = Math.max(4.4 / tv, halvB / (tv * asp));
        kamMaalMaal.set(0, 2.0, -2.8);
        kamPosMaal.set(0, 2.4 + d * .26, -2.5 + d * .96);
      }
    }
  }

  /* ---------- Faser: Rul → Pynt Krop → Pynt Hoved → Fest → Julehave ---------- */
  function visKnap(ikon, synlig, hop = true) {
    const b = $(".sn-videre");
    b.textContent = ikon; b.hidden = !synlig;
    b.classList.toggle("vis", synlig && hop);
  }

  function tegnPyntKnapper(liste) {
    pyntListe = liste;
    const boks = $(".sn-pynt");
    boks.innerHTML = liste.map((p, i) => p
      ? `<button data-i="${i}" class="${pyntValg[p.kat] === p.id ? "valgt" : ""}" aria-label="${p.tekst}">${p.ikon}</button>`
      : `<i class="sn-brud"></i>`).join("");
    boks.querySelectorAll("button").forEach(b => b.addEventListener("click", () => vaelgPynt(pyntListe[+b.dataset.i])));
    boks.hidden = false;
  }

  function rydAktiv() {
    while (aktivGrp.children.length) {
      const c = aktivGrp.children[0];
      c.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      aktivGrp.remove(c);
    }
    kugler = [];
    if (rulBold) {
      rulBold.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      scene.remove(rulBold); rulBold = null;
    }
  }

  function nySnemand(snak = true) {
    fase = "rul"; vistSnemand = null; hopAnim = null; rulMaal = null;
    rydAktiv();
    aktivGrp.position.set(0, 0, 0); aktivGrp.rotation.set(0, 0, 0); aktivGrp.scale.setScalar(1);
    aktivGrp.visible = true; pladsRing.visible = true;
    if (snedriverGrp) snedriverGrp.visible = true;
    pyntValg = NY_VALG();
    $(".sn-pynt").hidden = true;
    $(".sn-tilbage").hidden = true;
    $(".sn-haveknap").hidden = !hentGemte().length;
    nulstilSne();
    fyldSnedriver();
    bygHaveSnemaend();
    kugleNr = 0;
    startNykugle(false);
    indram();
    if (snak) later(() => Spil.say("Lad os bygge en snemand! Rul snebolden rundt i sneen med fingeren.", null, "sne-hej"), 450);
  }

  function startNykugle(snak = true) {
    rulR = START_R[kugleNr];
    rulDist = 0; rulMaal = null; sagtMidt = false; sagtStor = false;
    pladsRing.material.color.set("#a5ceff");
    if (rulBold) {
      rulBold.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      scene.remove(rulBold);
    }
    rulBold = lavSnekugleMesh(rulR);
    const startX = kugleNr % 2 === 0 ? -2.6 : 2.6;
    rulPos = new T.Vector3(startX, rulR * .9, 2.6);
    rulBold.position.copy(rulPos);
    scene.add(rulBold);
    visKnap("✅", false);
    sidstRoert = performance.now();
    if (snak) {
      const nøgle = kugleNr === 1 ? "sne-mave" : "sne-hoved";
      const tekst = kugleNr === 1 ? "Nu skal vi rulle maven! Rul en snebold mere." : "Og nu hovedet! Rul den sidste snebold.";
      later(() => fase === "rul" && Spil.say(tekst, null, nøgle), 350);
    }
  }

  function hopPaaPlads() {
    if (fase !== "rul" || hopAnim || !rulBold) return;
    rulMaal = null; ned = false; lydKnas(0);
    visKnap("✅", false);
    Spil.sfx.pop();
    const radier = [...kugler.map(k => k.r), rulR];
    const maalY = kugleStakY(radier, kugleNr);
    hopAnim = {
      t: 0,
      fra: rulPos.clone(),
      til: new T.Vector3(0, maalY, 0),
      r: rulR
    };
  }

  function kugleLandet() {
    const r = hopAnim.r, maalY = hopAnim.til.y;
    hopAnim = null;
    scene.remove(rulBold);
    rulBold.position.set(0, maalY, 0);
    rulBold.rotation.set(0, 0, 0);
    aktivGrp.add(rulBold);
    kugler.push({ mesh: rulBold, r, y: maalY });
    rulBold = null;

    Spil.tone([260, 390, 520], .08, "triangle");
    pustSne(0, maalY, 0, 10);
    kaninGrp.userData.hop = 1;
    snemandVug = .28;

    kugleNr++;
    if (kugleNr < 3) {
      startNykugle(true);
    } else {
      tilPyntKrop(true);
    }
  }

  function tilPyntKrop(snak = true) {
    fase = "krop";
    pladsRing.visible = false;
    if (snedriverGrp) snedriverGrp.visible = false;
    $(".sn-haveknap").hidden = true;
    $(".sn-tilbage").hidden = true;
    bygSnemandPynt(aktivGrp, kugler.map(k => k.r), pyntValg);
    tegnPyntKnapper(PYNT_KROP);
    visKnap("✅", true, true);
    pyntHop = 1;
    Spil.sfx.right();
    indram();
    if (snak) later(() => fase === "krop" && Spil.say("Flot! Lad os pynte snemandens krop først.", null, "sne-krop"), 300);
  }

  function tilPyntHoved(snak = true) {
    fase = "hoved";
    $(".sn-tilbage").hidden = false;
    bygSnemandPynt(aktivGrp, kugler.map(k => k.r), pyntValg);
    tegnPyntKnapper(PYNT_HOVED);
    visKnap("✅", true, Boolean(pyntValg.naese || pyntValg.hat));
    pyntHop = .8;
    Spil.sfx.click();
    indram();
    if (snak) later(() => fase === "hoved" && Spil.say("Og nu hovedet! Skal det være en snemand eller en snekone?", null, "sne-hoved-pynt"), 250);
  }

  function vaelgPynt(p) {
    if (fase !== "krop" && fase !== "hoved") return;
    Spil.sfx.pop();
    juleKlokker([659.25, 880], .08);
    pyntValg[p.kat] = pyntValg[p.kat] === p.id ? null : p.id;
    tegnPyntKnapper(pyntListe);
    bygSnemandPynt(aktivGrp, kugler.map(k => k.r), pyntValg);
    pyntHop = 1; snemandVug = .22; kaninGrp.userData.hop = .8;
    visKnap("✅", true, true);
    const r0 = kugler[0] ? kugler[0].r : 1, r1 = kugler[1] ? kugler[1].r : .8, r2 = kugler[2] ? kugler[2].r : .6;
    const spY = fase === "hoved" ? kugleStakY([r0, r1, r2], 2) + r2 * .3 : kugleStakY([r0, r1, r2], 1);
    const sp = skaermPunkt(new T.Vector3(0, spY, 0));
    if (!roligt()) Spil.burst(sp.x, sp.y, [p.ikon, "✨", "❄️", "⭐", p.ikon, "✨"].join(""));
    Spil.say(p.tekst, null, p.lyd);
  }

  function startFest() {
    if (fase !== "hoved" && fase !== "krop") return;
    fase = "fest";
    $(".sn-pynt").hidden = true;
    $(".sn-tilbage").hidden = true;
    visKnap("✅", false);
    if (!pyntValg.naese) pyntValg.naese = "gulerod";
    if (!pyntValg.arm && !pyntValg.ting) pyntValg.arm = "grene";
    bygSnemandPynt(aktivGrp, kugler.map(k => k.r), pyntValg);
    indram();

    Spil.sfx.fanfare();
    juleKlokker([523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5], .13);
    sneByge = 4.5;
    kaninGrp.userData.hop = 1.4;
    const sp = skaermPunkt(new T.Vector3(0, 2.4, 0));
    if (!roligt()) Spil.burst(sp.x, sp.y, "⛄🎄⭐❄️🎅✨⛄");
    Spil.say("Hurra! Se, snemanden vinker! Glædelig jul!", null, "sne-levende");

    gemSnemand({
      r: kugler.map(k => Math.round(k.r * 100) / 100),
      valg: { ...pyntValg }
    });
    later(() => { if (fase === "fest") visKnap("⛄", true, true); }, 1800);
    later(() => { if (fase === "fest") visHave(true); }, 4800);
  }

  function bygEnSnemandFraData(d) {
    const grp = new T.Group();
    const radier = Array.isArray(d.r) && d.r.length === 3 ? d.r : [...MAAL_R];
    radier.forEach((r, idx) => {
      const m = lavSnekugleMesh(r);
      m.position.y = kugleStakY(radier, idx);
      grp.add(m);
    });
    bygSnemandPynt(grp, radier, { ...NY_VALG(), ...(d.valg || { naese: "gulerod", hat: "nissehue", hals: "roed" }) });
    grp.userData.radier = radier;
    return grp;
  }

  function bygHaveSnemaend(nyeste = false) {
    while (haveGrp.children.length) {
      const c = haveGrp.children[0];
      c.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      haveGrp.remove(c);
    }
    haveSnemaend = []; dansere = [];
    let gemte = hentGemte();
    if (!gemte.length && fase === "have") {
      gemte = [
        { r: [1.0, .78, .58], valg: { naese: "gulerod", hat: "nissehue", hals: "roed", arm: "luffer", ting: "sukkerstok" } },
        { r: [1.05, .82, .60], valg: { ansigt: "vipper", naese: "jordbaer", haar: "fletninger", hat: "krone", hals: "perler", toej: "kjole", knap: "hjerter", arm: "grene", ting: "lanterne" } },
      ];
    }
    const pladser = [
      [-2.1, -2.3, .32], [2.1, -2.3, -.32],
      [-3.8, -.8, .50], [3.8, -.8, -.50],
      [-1.3, -4.1, .18], [1.3, -4.1, -.18],
    ];
    gemte.forEach((d, i) => {
      const [x, z, rot] = pladser[i % pladser.length];
      const sm = bygEnSnemandFraData(d);
      sm.position.set(x, haveHoejde(x, z), z);
      sm.rotation.y = rot;
      sm.userData.basisY = sm.position.y;
      sm.userData.basisRot = rot;
      haveGrp.add(sm);
      haveSnemaend.push(sm);
      if (nyeste && i === gemte.length - 1) dansere.push({ sm, t: 0 });
    });
  }

  function visHave(ny = false) {
    fase = "have"; vistSnemand = null;
    rydAktiv();
    aktivGrp.visible = false; pladsRing.visible = false;
    if (snedriverGrp) snedriverGrp.visible = false;
    $(".sn-pynt").hidden = true;
    $(".sn-tilbage").hidden = true;
    $(".sn-haveknap").hidden = true;
    bygHaveSnemaend(ny);
    visKnap("⛄", true, true);
    indram();
    if (!ny) Spil.say("Her er alle dine snemænd i julehaven. Tryk på dem, så danser de!", null, "sne-have");
  }

  /* ---------- Interaktion (Peg, træk og tryk) ---------- */
  function opdaterNDC(e) {
    const b = cv.getBoundingClientRect();
    ndc.x = ((e.clientX - b.left) / b.width) * 2 - 1;
    ndc.y = -((e.clientY - b.top) / b.height) * 2 + 1;
  }

  function jordPunkt() {
    ray.setFromCamera(ndc, camera);
    const p = new T.Vector3();
    const plan = new T.Plane(new T.Vector3(0, 1, 0), 0);
    if (ray.ray.intersectPlane(plan, p)) {
      const d = Math.hypot(p.x, p.z);
      if (d > HAVE_R - .8) p.multiplyScalar((HAVE_R - .8) / d);
      return p;
    }
    return null;
  }

  function skaermPunkt(v) {
    const p = v.clone().project(camera);
    const b = cv.getBoundingClientRect();
    return { x: b.left + (p.x + 1) / 2 * b.width, y: b.top + (1 - p.y) / 2 * b.height };
  }

  function onDown(e) {
    if (!renderer) return;
    opdaterNDC(e);
    ray.setFromCamera(ndc, camera);
    sidstRoert = performance.now();

    const gaveHit = gaverListe.find(g => ray.intersectObjects(g.grp.children, true).length);
    if (gaveHit) {
      gaveHit.hop = 1;
      juleKlokker([659.25, 783.99, 1046.5, 1318.5], .09);
      const p = skaermPunkt(gaveHit.grp.getWorldPosition(new T.Vector3()));
      if (!roligt()) Spil.burst(p.x, p.y, "🎁✨🎀⭐");
      return;
    }
    if (juletraeGrp && ray.intersectObjects(juletraeGrp.children, true).length) {
      skiftJuletraeLys(true);
      return;
    }
    if (kaninGrp && ray.intersectObjects(kaninGrp.children, true).length) {
      kaninGrp.userData.hop = 1.2;
      Spil.tone([587, 880], .08, "sine");
      return;
    }

    if (fase === "rul" && !hopAnim && rulBold) {
      ned = true;
      const p = jordPunkt();
      if (p) {
        if (Math.hypot(p.x - rulPos.x, p.z - rulPos.z) < .7) {
          // Prik på selve snebolden: tril et stykke ud i sneen (ikke direkte i midten før den er klar)
          const klar = rulR >= MIN_KLAR_R[kugleNr] && rulDist > 3.2;
          const a = klar ? Math.atan2(-rulPos.z, -rulPos.x) : Math.atan2(rulPos.z, rulPos.x) + 1.3;
          rulMaal = new T.Vector3(
            klem(rulPos.x + Math.cos(a) * 2.8, -5.2, 5.2),
            0,
            klem(rulPos.z + Math.sin(a) * 2.8, -3.8, 4.2)
          );
        } else {
          rulMaal = p;
        }
      }
    } else if (fase === "krop" || fase === "hoved") {
      ned = true;
      trækStart = e.clientX;
      snurVinkel = aktivGrp.rotation.y;
      if (ray.intersectObjects(aktivGrp.children, true).length) {
        snemandVug = .28; pyntHop = .7;
        juleKlokker([784, 987.77, 1174.66], .07);
      }
    } else if (fase === "fest") {
      if (ray.intersectObjects(aktivGrp.children, true).length) {
        pyntHop = 1;
        juleKlokker([523.25, 659.25, 783.99, 1046.5], .08);
        const sp = skaermPunkt(new T.Vector3(0, 2.3, 0));
        if (!roligt()) Spil.burst(sp.x, sp.y, "❄️⭐⛄✨🎄");
        if (kaninGrp) kaninGrp.userData.hop = 1.2;
      }
    } else if (fase === "have") {
      for (const sm of haveSnemaend) {
        if (ray.intersectObjects(sm.children, true).length) {
          Spil.sfx.pop();
          juleKlokker([523.25, 659.25, 783.99, 1046.5], .09);
          if (!dansere.some(d => d.sm === sm)) dansere.push({ sm, t: 0 });
          const sp = skaermPunkt(sm.position.clone().setY(2));
          if (!roligt()) Spil.burst(sp.x, sp.y, "❄️⭐⛄✨");
          vistSnemand = vistSnemand === sm ? null : sm;
          indram();
          if (!Spil.isTalking()) Spil.say("", null, ROS[Math.floor(Math.random() * ROS.length)]);
          return;
        }
      }
      if (vistSnemand) { vistSnemand = null; indram(); }
    }
  }

  function onMove(e) {
    if (!ned || !renderer) return;
    opdaterNDC(e);
    sidstRoert = performance.now();
    if (fase === "rul" && !hopAnim && rulBold) {
      const p = jordPunkt();
      if (p) rulMaal = p;
    } else if ((fase === "krop" || fase === "hoved") && trækStart !== null) {
      const dx = (e.clientX - trækStart) / Math.max(200, cv.clientWidth);
      aktivGrp.rotation.y = snurVinkel + dx * 3.8;
    }
  }

  function onUp() {
    ned = false; trækStart = null;
  }

  /* ---------- Animations-løkken ---------- */
  function rulTrin(dt) {
    if (hopAnim) {
      hopAnim.t = Math.min(1, hopAnim.t + dt / .55);
      const k = hopAnim.t, e = 1 - Math.pow(1 - k, 3);
      rulBold.position.lerpVectors(hopAnim.fra, hopAnim.til, e);
      rulBold.position.y += Math.sin(k * Math.PI) * 1.85;
      rulBold.scale.setScalar(hopAnim.r * (1 + Math.sin(k * Math.PI * 2) * .08));
      if (k >= 1) kugleLandet();
      return;
    }
    if (!rulBold) return;

    let fart = 0;
    if (rulMaal) {
      const dx = rulMaal.x - rulPos.x, dz = rulMaal.z - rulPos.z, dist = Math.hypot(dx, dz);
      if (dist > .06) {
        const skridt = Math.min(dist, dt * 6.2);
        const nx = dx / dist, nz = dz / dist;
        rulPos.x += nx * skridt;
        rulPos.z += nz * skridt;
        fart = skridt / Math.max(dt, .001);

        const akse = new T.Vector3(nz, 0, -nx).normalize();
        rulBold.rotateOnWorldAxis(akse, skridt / rulR);

        // Vokser i et roligt tempo, så man kan rulle rundt i sneen et godt stykke tid
        rulR = Math.min(MAKS_R[kugleNr], rulR + skridt * .042);

        // Rul hen over små snedriver på plænen for ekstra sne!
        for (const d of snedriver) {
          if (!d.brugt && Math.hypot(rulPos.x - d.x, rulPos.z - d.z) < rulR + d.r * .75) {
            d.brugt = true;
            rulR = Math.min(MAKS_R[kugleNr], rulR + .14);
            pustSne(d.x, .25, d.z, 9);
            Spil.sfx.pop();
            Spil.tone([440, 620], .06, "triangle");
          }
        }

        // Kaninen hopper glad, hvis snebolden ruller tæt forbi den
        if (kaninGrp && kaninGrp.userData.hop <= 0 &&
            Math.hypot(rulPos.x - kaninGrp.position.x, rulPos.z - kaninGrp.position.z) < 1.85) {
          kaninGrp.userData.hop = 1.1;
          Spil.tone([660, 990], .07, "sine");
        }

        rulPos.y = rulR * .9;
        rulBold.position.copy(rulPos);
        rulBold.scale.setScalar(rulR);

        tegnSpor(rulPos.x, rulPos.z, rulR);
        rulDist += skridt;
        if (Math.random() < .65) pustSne(rulPos.x, .15, rulPos.z, 2);

        // Når kuglen har fået en fin minimum-størrelse, kan man trykke ✅ eller rulle den ind i midten;
        // eller bare blive ved med at rulle, indtil den er helt stor og selv hopper på plads!
        const klar = rulR >= MIN_KLAR_R[kugleNr] && rulDist > 3.2;
        if (klar) {
          if ($(".sn-videre").hidden) {
            visKnap("✅", true, false);
            pladsRing.material.color.set("#ffcf3f");
            if (!sagtMidt && kugleNr === 0 && !Spil.isTalking()) {
              sagtMidt = true;
              Spil.say("Rul snebolden hen til ringen i midten, når den har den rigtige størrelse!", null, "sne-midt");
            }
          }
          if (!sagtStor && rulR >= MAAL_R[kugleNr] * 1.05 && !Spil.isTalking()) {
            sagtStor = true;
            Spil.say("Se, hvor stor den blev! Rul den ind i midten, når du er klar.", null, "sne-stor");
          }
          if (Math.hypot(rulPos.x, rulPos.z) < 1.15 || rulR >= MAKS_R[kugleNr] - .01) {
            hopPaaPlads();
            return;
          }
        }
      } else if (!ned) {
        rulMaal = null;
      }
    }
    lydKnas(fart);

    if (!sagtHint && rulDist < .2 && performance.now() - sidstRoert > 11000 && !Spil.isTalking()) {
      sagtHint = true;
      Spil.say("Træk fingeren hen over sneen, så ruller snebolden!", null, "sne-hint");
    }
  }

  function loop(nu) {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (nu - (sidstTid || nu)) / 1000); sidstTid = nu;
    const t = nu / 1000;
    tidU.value = roligt() ? 0 : t;

    // Glidende overgang mellem vinterdag og julenat
    const natMaal = erNat ? 1 : 0;
    if (Math.abs(natBlanding - natMaal) > .002 && himmelFarver) {
      natBlanding += (natMaal - natBlanding) * Math.min(1, dt * 2.8);
      himmelMat.uniforms.nat.value = natBlanding;
      himmelMat.uniforms.top.value.lerpVectors(himmelFarver.dagTop, himmelFarver.natTop, natBlanding);
      himmelMat.uniforms.midt.value.lerpVectors(himmelFarver.dagMidt, himmelFarver.natMidt, natBlanding);
      himmelMat.uniforms.horisont.value.lerpVectors(himmelFarver.dagHor, himmelFarver.natHor, natBlanding);
      scene.fog.color.lerpColors(himmelFarver.dagFog, himmelFarver.natFog, natBlanding);
      hemiLys.intensity = 1.35 - natBlanding * .85;
      solLys.intensity = 2.0 - natBlanding * 1.55;
      if (juletraeLys) juletraeLys.intensity = natBlanding * 3.8;
      if (juleFodLys) juleFodLys.intensity = natBlanding * 2.4;
    }

    // 3D-snesky svæver hen over haven og ryster frisk sne + nye snedriver ned
    if (sneSkyAnim) {
      sneSkyAnim.t += dt;
      const k = sneSkyAnim.t / 4.8;
      sneSkyGrp.position.x = -16 + k * 32;
      sneSkyGrp.position.y = 6.2 + Math.sin(t * 4) * .25;
      drysFriskSne(dt * .28);
      if (Math.random() < .8) pustSne(sneSkyGrp.position.x + (Math.random() - .5) * 4, 4.5, (Math.random() - .5) * 4, 3);
      if (k >= .45 && !sneSkyAnim.fyldt) {
        sneSkyAnim.fyldt = true;
        if (fase === "rul") fyldSnedriver();
      }
      if (k >= 1) {
        sneSkyGrp.visible = false;
        sneSkyAnim = null;
      }
    }

    // Små snedriver popper blødt frem (og forsvinder når man ruller over dem)
    for (const d of snedriver) {
      const maal = d.brugt ? 0 : 1;
      if (Math.abs(d.skal - maal) > .01) {
        d.skal += (maal - d.skal) * Math.min(1, dt * (d.brugt ? 12 : 6));
        d.grp.scale.setScalar(Math.max(.001, d.skal));
        d.grp.visible = d.skal > .02;
      }
    }

    if (fase === "rul") {
      rulTrin(dt);
      const klarRing = !$(".sn-videre").hidden;
      const ringPuls = klarRing ? .11 : .06;
      pladsRing.scale.setScalar(1 + Math.sin(t * (klarRing ? 5.2 : 3.5)) * ringPuls);
      pladsRing.material.opacity = klarRing ? .78 : .58;
    } else {
      lydKnas(0);
    }

    if (pyntHop > 0) {
      pyntHop = Math.max(0, pyntHop - dt * 2.8);
      const s = 1 + Math.sin(pyntHop * Math.PI * 2) * .09 * pyntHop;
      aktivGrp.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
    }
    if (snemandVug > 0) {
      snemandVug = Math.max(0, snemandVug - dt * .9);
      aktivGrp.rotation.z = Math.sin(t * 14) * snemandVug * .35;
    } else if (fase !== "fest") {
      aktivGrp.rotation.z *= .85;
    }

    const blink = (t % 3.8) < .13;
    if (aktivGrp.userData.oejne) {
      aktivGrp.userData.oejne.forEach(o => { o.scale.y = blink ? .18 : 1; });
    }
    if (fase === "fest") {
      aktivGrp.position.y = Math.abs(Math.sin(t * 7.5)) * .38;
      aktivGrp.rotation.z = Math.sin(t * 3.75) * .12;
      aktivGrp.rotation.y = Math.sin(t * 2.5) * .35;
      if (aktivGrp.userData.arme) {
        aktivGrp.userData.arme.forEach((a, i) => {
          const s = i === 0 ? -1 : 1;
          a.rotation.z = -s * (.45 - Math.sin(t * 11 + i) * .45);
        });
      }
    }

    for (let i = dansere.length - 1; i >= 0; i--) {
      const d = dansere[i], sm = d.sm;
      d.t += dt;
      const k = Math.min(1, d.t / 1.5);
      sm.position.y = sm.userData.basisY + Math.abs(Math.sin(k * Math.PI * 3)) * .45 * (1 - k * .5);
      sm.rotation.z = Math.sin(k * Math.PI * 6) * .14 * (1 - k);
      sm.rotation.y = sm.userData.basisRot + Math.sin(k * Math.PI * 2) * .4 * (1 - k);
      if (sm.userData.arme) {
        sm.userData.arme.forEach((a, idx) => {
          const s = idx === 0 ? -1 : 1;
          a.rotation.z = -s * (.45 - Math.sin(k * Math.PI * 6) * .4 * (1 - k));
        });
      }
      if (k >= 1) {
        sm.position.y = sm.userData.basisY;
        sm.rotation.z = 0; sm.rotation.y = sm.userData.basisRot;
        dansere.splice(i, 1);
      }
    }

    if (stjerneTop) stjerneTop.rotation.z = Math.sin(t * 1.8) * .08;
    if (stjerneHalo) {
      const sPuls = 1 + .12 * Math.sin(t * 2.6);
      stjerneHalo.scale.setScalar((2.1 + natBlanding * 1.15) * sPuls);
      stjerneHalo.material.opacity = .32 + natBlanding * .52;
    }
    const natGlød = .65 + natBlanding * .45;
    juleLys.forEach(({ mat, halo, haloMat, basisFarve, i }) => {
      const puls = lysTema === 0
        ? .48 + .48 * Math.sin(t * 3.2 + i * .7)
        : lysTema === 1
          ? ((Math.floor(t * 4) + i) % 2 ? .98 : .18)
          : lysTema === 2
            ? .6 + .38 * Math.sin(t * 6 + i * .3)
            : .72 + .28 * Math.sin(t * 4.2 + i * .45);
      if (lysTema === 3) {
        const hue = ((t * .22 + i * .06) % 1 + 1) % 1;
        mat.color.setHSL(hue, .9, .58);
        mat.emissive.setHSL(hue, .95, .52);
        haloMat.color.setHSL(hue, 1, .62);
      } else {
        mat.color.copy(basisFarve);
        mat.emissive.copy(basisFarve);
        haloMat.color.copy(basisFarve);
      }
      mat.emissiveIntensity = puls * natGlød;
      haloMat.opacity = (.16 + natBlanding * .4) * (.45 + puls * .55);
      halo.scale.setScalar((.82 + natBlanding * .42) * (.85 + puls * .45));
    });
    feLys.forEach(({ sprite, mat, i }) => {
      const glimt = .45 + .55 * Math.sin(t * 4.5 + i * 1.3);
      mat.opacity = (.15 + natBlanding * .68) * glimt;
      sprite.scale.setScalar((.26 + natBlanding * .18) * (.8 + glimt * .4));
    });
    gaverListe.forEach(g => {
      if (g.hop > 0) {
        g.hop = Math.max(0, g.hop - dt * 2.2);
        g.grp.position.y = g.basisY + Math.abs(Math.sin(g.hop * Math.PI * 2)) * .32;
        g.grp.rotation.z = Math.sin(g.hop * Math.PI * 6) * .16 * g.hop;
      } else {
        g.grp.position.y = g.basisY;
        g.grp.rotation.z = 0;
      }
    });

    if (kaninGrp) {
      const kd = kaninGrp.userData;
      if (kd.hop > 0) {
        kd.hop = Math.max(0, kd.hop - dt * 1.6);
        kaninGrp.position.y = haveHoejde(-4.3, .8) + Math.abs(Math.sin(kd.hop * Math.PI * 2)) * .45;
      }
      kd.hoved.rotation.z = Math.sin(t * 2.1) * .08;
      if (kd.oerer) {
        const vip = kd.hop > 0 ? Math.sin(kd.hop * Math.PI * 6) * .28 : Math.sin(t * 3.2) * .05;
        kd.oerer.forEach((o, i) => { o.rotation.z = (i === 0 ? 1 : -1) * (.18 + vip); });
      }
    }

    if (sneByge > 0) sneByge = Math.max(0, sneByge - dt);
    if (sneFnug && !roligt()) {
      const pa = sneFnug.geometry.attributes.position, arr = pa.array, d = sneFnug.userData.d;
      const mult = sneByge > 0 ? 2.8 : 1;
      for (let i = 0; i < d.length; i++) {
        arr[i * 3 + 1] -= d[i].f * mult * dt;
        arr[i * 3] += Math.sin(t * 1.4 + d[i].a) * d[i].r * dt;
        if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 15.5;
      }
      pa.needsUpdate = true;
    }

    if (snePust) {
      const pa = snePust.geometry.attributes.position, arr = pa.array, ps = snePust.userData.p;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        if (p.liv > 0) {
          p.liv -= dt;
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          p.vy -= 7.5 * dt;
          arr[i * 3] = p.x; arr[i * 3 + 1] = Math.max(0, p.y); arr[i * 3 + 2] = p.z;
        } else {
          arr[i * 3 + 1] = -20;
        }
      }
      pa.needsUpdate = true;
    }

    kamPos.lerp(kamPosMaal, Math.min(1, dt * 3.5));
    kamMaal.lerp(kamMaalMaal, Math.min(1, dt * 4));
    camera.position.copy(kamPos);
    camera.lookAt(kamMaal);
    renderer.render(scene, camera);
  }

  function tilpas() {
    if (!renderer) return;
    const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    indram();
  }

  function videre() {
    if (fase === "rul") hopPaaPlads();
    else if (fase === "krop") tilPyntHoved(true);
    else if (fase === "hoved") startFest();
    else if (fase === "fest") visHave(true);
    else if (fase === "have") {
      Spil.sfx.click();
      nySnemand(false);
      later(() => Spil.say("Lad os bygge en ny snemand!", null, "sne-ny"), 300);
    }
  }

  Spil.register({
    id: "snemanden", navn: "Snemanden", ikon: IKON, farve: "#cfe8ff",
    start(rt) {
      alive = true; timers = []; tex = []; matCache = {}; sidstTid = 0; ned = false;
      erNat = false; natBlanding = 0; sneSkyAnim = null;
      sagtHint = false; sagtMidt = false; sagtStor = false; sneByge = 0; pyntHop = 0; snemandVug = 0;
      Spil.preload([
        "sne-hej", "sne-hint", "sne-mave", "sne-hoved", "sne-midt", "sne-stor",
        "sne-krop", "sne-hoved-pynt", "sne-toerklaede", "sne-sloejfe", "sne-perler",
        "sne-kjole", "sne-vest", "sne-hjerter", "sne-grene", "sne-luffer",
        "sne-kost", "sne-sukkerstok", "sne-lanterne", "sne-vipper", "sne-briller",
        "sne-skaeg", "sne-gulerod", "sne-rudolf", "sne-jordbaer", "sne-fletninger",
        "sne-nissehue", "sne-hoejhat", "sne-krone", "sne-strikhue", "sne-gevir",
        "sne-sner", "sne-nat", "sne-dag", "sne-levende", "sne-have", "sne-juletrae", "sne-ny", ...ROS
      ]);
      rt.innerHTML = `<div class="sn"><canvas class="sn-cv"></canvas><div class="sn-vent">${IKON}</div>
        <div class="sn-pynt" hidden></div>
        <button class="sn-tilbage" hidden aria-label="Tilbage til kroppen">⬇️</button>
        <button class="sn-videre" hidden aria-label="Videre">✅</button>
        <div class="sn-top">
          <button class="sn-sneknap" aria-label="Snesky">🌨️</button>
          <button class="sn-natknap" aria-label="Julenat">🌙</button>
          <button class="sn-haveknap" hidden aria-label="Se julehaven">⛄</button>
        </div></div>`;
      root = rt.querySelector(".sn"); cv = $(".sn-cv");

      $(".sn-videre").addEventListener("click", videre);
      $(".sn-tilbage").addEventListener("click", () => { if (fase === "hoved") tilPyntKrop(false); });
      $(".sn-haveknap").addEventListener("click", () => { Spil.sfx.click(); visHave(false); });
      $(".sn-sneknap").addEventListener("click", () => {
        kaldSnesky();
        const b = $(".sn-sneknap");
        if (!roligt()) Spil.burstAt(b, "❄️🌨️❄️⛄❄️");
      });
      $(".sn-natknap").addEventListener("click", skiftDagNat);

      cv.addEventListener("pointerdown", onDown);
      cv.addEventListener("pointermove", onMove);
      cv.addEventListener("pointerup", onUp);
      cv.addEventListener("pointercancel", onUp);
      addEventListener("resize", tilpas);
      lydStart();

      Spil.three().then(mod => {
        if (!alive) return;
        T = mod; $(".sn-vent").remove();
        byg(); tilpas();
        const dyb = Spil.dyb;
        nySnemand(!dyb);
        if (dyb === "pynt" || dyb === "krop" || dyb === "hoved") {
          if (rulBold) { scene.remove(rulBold); rulBold = null; }
          MAAL_R.forEach((r, idx) => {
            const m = lavSnekugleMesh(r), y = kugleStakY(MAAL_R, idx);
            m.position.y = y; aktivGrp.add(m);
            kugler.push({ mesh: m, r, y });
          });
          kugleNr = 3;
          if (dyb === "hoved") tilPyntHoved(false);
          else tilPyntKrop(false);
        } else if (dyb === "have") {
          visHave(false);
        }
        kamPos.copy(kamPosMaal); kamMaal.copy(kamMaalMaal);
        raf = requestAnimationFrame(loop);
      }, () => {
        if (alive) { const v = $(".sn-vent"); if (v) { v.style.animation = "none"; v.textContent = "😕"; } }
      });
    },
    stop() {
      alive = false; timers.forEach(clearTimeout); cancelAnimationFrame(raf);
      removeEventListener("resize", tilpas);
      lydStop();
      if (renderer) {
        scene.traverse(o => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
        });
        tex.forEach(t => t.dispose());
        if (envTex) envTex.dispose();
        renderer.dispose();
        try { renderer.forceContextLoss(); } catch (e) {}
      }
      renderer = scene = camera = rulBold = himmelFarver = null;
      juletraeLys = juleFodLys = stjerneHalo = null;
      tex = []; matCache = {}; juleLys = []; feLys = []; gaverListe = []; haveSnemaend = []; dansere = []; snedriver = [];
    }
  });
})();
