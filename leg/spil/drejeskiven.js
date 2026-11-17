// Spil: Drejeskiven — en klump ler drejer rundt på en drejeskive (rigtig 3D med three.js).
// 1) Form: rør ved leret. Fingeren skubber leret ind eller trækker det ud; leret bevarer sin mængde,
//    så en smal krukke bliver høj og en bred bliver lav. Tryk midt på toppen for at lave et hul;
//    træk så fingeren ud til siden inde i hullet, så åbner krukken sig til en skål. Tryk ovenfra, så bliver klumpen flad.
// 2) Glasur: vælg en farve (den første farve dypper hele krukken), og rør ved krukken mens den drejer,
//    så bliver der striber (flyt fingeren op og ned for bølger).
// 3) Ovnen sænker sig ned over krukken, gløder, og løfter sig igen: nu skinner glasuren.
// 4) Krukken stilles på hylden (gemmes i localStorage "lk-krukker", højst 8). Tryk på en krukke for at få den til at danse.
// Ingen rigtige eller forkerte svar: enhver form er en krukke.
(function () {
  const FARVER = [["roed", "#e5483f", "rød"], ["orange", "#f4962c", "orange"], ["gul", "#f5cd34", "gul"], ["groen", "#4caf50", "grøn"],
    ["blaa", "#3b7dd8", "blå"], ["lilla", "#8e5ccc", "lilla"], ["lyseroed", "#f290bb", "lyserød"]];
  const K = 40;            // punkter i krukkens ydre profil (nedefra og op)
  const KI = 22;           // punkter i hullets inderside
  const SEG = 72;          // segmenter rundt
  const VAEG = .14;        // vægtykkelse
  const MAXR = 1.38, MINR = .26;
  const MINH = .5, MAXH = 3.3;
  const TEX = 512;
  const GEM = "lk-krukker", MAKS_GEMT = 8;
  const ROS = ["ros-0", "ros-1", "ros-2", "ros-3", "ros-4"];
  const roligt = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };

  Spil.css("css-drejeskiven", `
    .dr{position:absolute;inset:0;overflow:hidden;
      background:radial-gradient(130% 90% at 50% 0%,#fff3df 0%,#f7dfc0 55%,#e9c49c 100%)}
    .dr-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
    .dr-vent{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:clamp(60px,14vh,140px);
      animation:dr-snur 1.6s linear infinite}
    @keyframes dr-snur{to{transform:rotate(360deg)}}
    .dr button{position:absolute;border-radius:50%;background:var(--card);box-shadow:0 6px 0 rgba(31,58,95,.25);
      display:flex;align-items:center;justify-content:center;line-height:1;transition:transform .15s,opacity .3s}
    .dr button:active{transform:translateY(4px);box-shadow:0 2px 0 rgba(31,58,95,.25)}
    .dr button[hidden]{display:none}
    .dr-videre{right:max(18px,env(safe-area-inset-right,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));
      width:clamp(76px,13vh,120px);aspect-ratio:1;font-size:clamp(40px,7vh,66px)}
    .dr-mere{left:max(18px,env(safe-area-inset-left,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));
      width:clamp(76px,13vh,120px);aspect-ratio:1}
    .dr-mere i{width:62%;height:52%;border-radius:50% 50% 46% 46%;pointer-events:none;
      background:radial-gradient(circle at 35% 30%,#ecb48c 0%,#c98760 45%,#9a5a38 100%);box-shadow:0 4px 0 rgba(90,45,25,.3)}
    .dr-videre.vis,.dr-mere.vis{animation:dr-hop 1.4s ease-in-out infinite}
    @keyframes dr-hop{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
    .dr-hyldeknap{top:calc(2vh + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));
      width:clamp(60px,9vh,84px);aspect-ratio:1;font-size:clamp(30px,5vh,46px)}
    .dr-farver{position:absolute;left:0;right:0;bottom:calc(14px + env(safe-area-inset-bottom,0px));
      display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(8px,1.6vw,18px);pointer-events:none;
      padding:0 calc(clamp(76px,13vh,120px) + 30px)}
    .dr-farver[hidden]{display:none}
    .dr-farver button{position:relative;pointer-events:auto;width:clamp(60px,10vh,90px);aspect-ratio:1;
      border:6px solid #fff;box-shadow:0 6px 0 rgba(31,58,95,.25),inset 0 -8px 0 rgba(0,0,0,.15)}
    .dr-farver button.valgt{transform:translateY(-12px) scale(1.12)}
    @media (max-aspect-ratio:1/1){
      .dr-farver{padding:0 16px calc(clamp(76px,13vh,120px) + 14px);max-width:440px;margin:0 auto}
      .dr-farver button{width:clamp(60px,15vw,84px)}
    }
    @media (prefers-reduced-motion:reduce){.dr-videre.vis,.dr-mere.vis{animation:none}.dr-vent{animation:none}}
  `);

  let T, root, alive, timers, raf, cv, renderer, scene, camera, ray, ndc;
  let gulv, hjulGrp, hoved, krukke, krukkeMat, lerTex, ovn, ovnVindue, ovnLys, hyldeGrp, envTex;
  let fase, r, H, V, hul, vinkel, omega, lerCanvas, raaCanvas, braendtCanvas, raaTex, braendtTex;
  let ned = false, punkt = null, modus = null, modusD = 0, sidstD = 0, sagtAabn = false, sidstUV = null, farve = null, flod = null, malet = 0;
  let formTid = 0, sidstRoert = 0, sagtHul = false, sagtMal = false, sidstTid = 0;
  let kamPos, kamMaal, kamPosMaal, kamMaalMaal, ovnAnim = null, hyldeKrukker = [], dans = [];
  let vist = null, snurr = null, slor = null, sagtSnur = false; // krukken der vises tæt på fra hylden
  let fingre = new Map(), kamGreb = null, kamTilt = 0, kamZoom = 1; // kamera: to fingre / højreklik / hjul
  let lyd = null, V0 = 1, klat = null, fyld = null, sagtMere = false, sagtHint = false;
  const MAXV = 2.2;       // højst så mange klumper ler (målt i startklumper)
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));

  /* ---------- Gemte krukker ---------- */
  function hentGemte() { try { const a = JSON.parse(localStorage.getItem(GEM) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function gem(k) {
    const a = hentGemte(); a.push(k);
    while (a.length > MAKS_GEMT) a.shift();
    try { localStorage.setItem(GEM, JSON.stringify(a)); } catch (e) {
      try { a.shift(); localStorage.setItem(GEM, JSON.stringify(a)); } catch (e2) {}
    }
  }

  /* ---------- Krukkens form ---------- */
  const basisR = k => { const t = k / (K - 1); return 1.05 * Math.sqrt(Math.max(.03, 1 - Math.pow(t, 2.6) * .93)); };
  function startForm() {
    r = []; for (let k = 0; k < K; k++) r.push(basisR(k));
    H = 1.25; hul = 0; V = V0 = H * middelR2(r);
  }

  /* ---------- Mere ler ---------- */
  // En ny klump falder ned på krukken og smelter ind i den: der bliver mere ler, og tynde steder bliver tykke igen,
  // så en lang tynd pind kan blive til en klump igen.
  function mereLer() {
    if (fase !== "drej" || klat || fyld) return;
    Spil.sfx.click();
    klat = new T.Mesh(new T.SphereGeometry(.5, 32, 20), krukkeMat);
    klat.scale.set(1, .8, 1); klat.castShadow = true;
    klat.userData.v = 0; klat.position.set(0, H + 5, 0);
    hjulGrp.add(klat);
  }
  function fjernKlat() {
    if (klat) { hjulGrp.remove(klat); klat.geometry.dispose(); klat = null; }
    fyld = null;
  }
  function klatTrin(dt) {
    if (klat && !fyld) {
      klat.userData.v += dt * 22;
      klat.position.y -= klat.userData.v * dt;
      if (klat.position.y <= H + .25) {
        klat.position.y = H + .25;
        Spil.sfx.pop(); Spil.tone([150, 110], .12, "triangle");
        Spil.say("Mere ler!", null, "drej-mere");
        const maal = r.map((x, k) => Math.max(x, x * .3 + basisR(k) * .7));
        fyld = { t: 0, maal, V: Math.min(V0 * MAXV, V + V0 * .4), hul: hul * .3 };
        formTid = Math.max(formTid, .01);
      }
    }
    if (fyld) {
      fyld.t = Math.min(1, fyld.t + dt / .5);
      const f = Math.min(1, dt * 10);
      for (let j = 0; j < K; j++) r[j] += (fyld.maal[j] - r[j]) * f;
      V += (fyld.V - V) * f; hul += (fyld.hul - hul) * f;
      H = Math.max(MINH, Math.min(MAXH, V / middelR2(r)));
      nyGeometri();
      klat.scale.setScalar(Math.max(.01, 1 - fyld.t)); klat.position.y = H + .25 * (1 - fyld.t);
      if (fyld.t >= 1) {
        for (let j = 0; j < K; j++) r[j] = fyld.maal[j];
        V = fyld.V; hul = fyld.hul; H = Math.max(MINH, Math.min(MAXH, V / middelR2(r)));
        nyGeometri(); fjernKlat(); sidstRoert = performance.now();
      }
    }
  }
  function middelR2(rr) { let s = 0; for (let k = 0; k < K; k++) s += rr[k] * rr[k] * ((k === 0 || k === K - 1) ? .5 : 1); return s / (K - 1); }
  function rVed(rr, hh, y) {
    const f = Math.max(0, Math.min(K - 1, y / hh * (K - 1))), i = Math.min(K - 2, Math.floor(f)), t = f - i;
    return rr[i] * (1 - t) + rr[i + 1] * t;
  }
  // Profilpunkter: bundens midte → yderside op → kant → inderside ned → hullets bund. Altid samme antal punkter,
  // så teksturens v-koordinater ligger fast.
  function profil(rr, hh, hu) {
    const P = [new T.Vector2(0, 0)];
    for (let k = 0; k < K; k++) P.push(new T.Vector2(rr[k] * (k === 0 ? .93 : 1), hh * k / (K - 1)));
    const aaben = Math.min(1, hu * 3), aab = aaben * aaben * (3 - 2 * aaben);
    const bund = Math.min(.3, hh * .22), D = hu * (hh - bund);
    const top = rr[K - 1], indeTop = Math.max(.02, top - VAEG) * aab;
    P.push(new T.Vector2((top + indeTop) / 2, hh + .03 * aab));
    for (let j = 0; j < KI; j++) {
      const s = j / (KI - 1), y = hh - D * s;
      P.push(new T.Vector2(Math.max(.02, rVed(rr, hh, y) - VAEG) * aab * (1 - .25 * s * s), y));
    }
    P.push(new T.Vector2(0, hh - D));
    return P;
  }
  function nyGeometri() {
    const g = new T.LatheGeometry(profil(r, H, hul), SEG);
    if (krukke.geometry) krukke.geometry.dispose();
    krukke.geometry = g;
  }

  /* ---------- Teksturer ---------- */
  function lerFarve(g, w, h) {
    g.fillStyle = "#c98760"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(${Math.random() < .5 ? "255,230,210" : "90,45,25"},${Math.random() * .07})`; g.fillRect(0, y, w, 2); }
    for (let i = 0; i < 700; i++) {
      g.fillStyle = Math.random() < .6 ? "rgba(110,60,35,.35)" : "rgba(255,235,215,.35)";
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, .8 + Math.random() * 1.8, 0, 7); g.fill();
    }
  }
  function lavCanvas() { const c = document.createElement("canvas"); c.width = c.height = TEX; return c; }
  function canvasTex(c) { const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; }
  const pastel = hex => { const c = new T.Color(hex).lerp(new T.Color("#ffffff"), .18); return "#" + c.getHexString(); };

  /* ---------- Lyd ---------- */
  function lydStart() {
    try {
      const ac = Spil.audio(), master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
      const sum = ac.createOscillator(); sum.type = "sawtooth"; sum.frequency.value = 52;
      const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 170;
      const sumG = ac.createGain(); sumG.gain.value = .07; sum.connect(lp).connect(sumG).connect(master);
      const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const st = ac.createBufferSource(); st.buffer = buf; st.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = .8;
      const smatG = ac.createGain(); smatG.gain.value = 0; st.connect(bp).connect(smatG).connect(master);
      const st2 = ac.createBufferSource(); st2.buffer = buf; st2.loop = true;
      const lp2 = ac.createBiquadFilter(); lp2.type = "lowpass"; lp2.frequency.value = 140;
      const brumG = ac.createGain(); brumG.gain.value = 0; st2.connect(lp2).connect(brumG).connect(ac.destination);
      sum.start(); st.start(); st2.start();
      lyd = { ac, master, sumG, smatG, brumG, kilder: [sum, st, st2], noder: [master, brumG] };
    } catch (e) { lyd = null; }
  }
  function lydSaet(node, v, tid = .08) { if (!lyd) return; try { node.gain.setTargetAtTime(v, lyd.ac.currentTime, tid); } catch (e) {} }
  function lydStop() {
    if (!lyd) return;
    lyd.kilder.forEach(s => { try { s.stop(); } catch (e) {} });
    lyd.noder.forEach(n => { try { n.disconnect(); } catch (e) {} });
    lyd = null;
  }

  /* ---------- Scene ---------- */
  function byg() {
    renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = .9;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(36, 1, .1, 100);
    ray = new T.Raycaster(); ndc = new T.Vector2();

    // Et lille "værksted" som omgivelser, så glasuren har noget at spejle
    const pm = new T.PMREMGenerator(renderer), env = new T.Scene();
    env.add(new T.Mesh(new T.BoxGeometry(20, 12, 20), new T.MeshBasicMaterial({ color: "#c9a27e", side: T.BackSide })));
    const panel = (c, x, y, z, w, h) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
    panel(new T.Color(6, 5.6, 5), 0, 5.9, 0, 8, 8); panel(new T.Color(3, 3.2, 3.6), -9.9, 2, 2, 5, 5); panel(new T.Color(2.4, 2.1, 1.8), 6, 1, 9.9, 6, 4);
    envTex = pm.fromScene(env, .02).texture; scene.environment = envTex; scene.environmentIntensity = .45; pm.dispose();

    scene.add(new T.HemisphereLight("#fff4e6", "#8a5a3c", .55));
    const sol = new T.DirectionalLight("#fff1dc", 2.1); sol.position.set(3.5, 8, 5);
    sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024); sol.shadow.radius = 4;
    Object.assign(sol.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 25 });
    scene.add(sol);

    // Gulv der kun viser skygger
    gulv = new T.Mesh(new T.PlaneGeometry(40, 40), new T.ShadowMaterial({ opacity: .22 }));
    gulv.rotation.x = -Math.PI / 2; gulv.position.y = -1.6; gulv.receiveShadow = true; scene.add(gulv);

    // Drejeskiven
    hjulGrp = new T.Group(); scene.add(hjulGrp);
    const krop = new T.Mesh(new T.CylinderGeometry(1.75, 2.0, 1.25, 48), new T.MeshStandardMaterial({ color: "#3f9aa0", roughness: .55 }));
    krop.position.y = -.98; krop.castShadow = krop.receiveShadow = true; hjulGrp.add(krop);
    const bakke = new T.Mesh(new T.CylinderGeometry(2.05, 1.9, .42, 56, 1, true), new T.MeshStandardMaterial({ color: "#f3ecdf", roughness: .6, side: T.DoubleSide }));
    bakke.position.y = -.2; bakke.receiveShadow = true; hjulGrp.add(bakke);
    const kantRing = new T.Mesh(new T.TorusGeometry(2.05, .06, 10, 64), new T.MeshStandardMaterial({ color: "#f3ecdf", roughness: .5 }));
    kantRing.rotation.x = Math.PI / 2; kantRing.position.y = .01; hjulGrp.add(kantRing);
    const slam = new T.Mesh(new T.CircleGeometry(1.95, 48), new T.MeshStandardMaterial({ color: "#b98466", roughness: .4 }));
    slam.rotation.x = -Math.PI / 2; slam.position.y = -.38; slam.receiveShadow = true; hjulGrp.add(slam);
    hoved = new T.Group(); hjulGrp.add(hoved);
    const plade = new T.Mesh(new T.CylinderGeometry(1.5, 1.5, .16, 56), new T.MeshStandardMaterial({ color: "#c7ccd2", metalness: .65, roughness: .3 }));
    plade.position.y = -.08; plade.receiveShadow = true; hoved.add(plade);
    for (let i = 0; i < 6; i++) { // prikker på kanten, så man kan se skiven dreje
      const p = new T.Mesh(new T.SphereGeometry(.08, 12, 8), new T.MeshStandardMaterial({ color: i % 2 ? "#ffcf3f" : "#ff7a6b", roughness: .4 }));
      const a = i / 6 * Math.PI * 2; p.position.set(Math.cos(a) * 1.36, .0, Math.sin(a) * 1.36); hoved.add(p);
    }
    const pedal = new T.Mesh(new T.BoxGeometry(.9, .18, .6), new T.MeshStandardMaterial({ color: "#2f6f74", roughness: .6 }));
    pedal.position.set(1.6, -1.52, 1.6); pedal.rotation.y = -.6; pedal.castShadow = true; hjulGrp.add(pedal);

    // Leret
    lerCanvas = lavCanvas(); lerFarve(lerCanvas.getContext("2d"), TEX, TEX);
    lerTex = canvasTex(lerCanvas);
    krukkeMat = new T.MeshStandardMaterial({ map: lerTex, roughness: .5, metalness: 0 });
    krukke = new T.Mesh(undefined, krukkeMat); krukke.castShadow = true; krukke.receiveShadow = true;
    hjulGrp.add(krukke);

    byggOvn();
    hyldeGrp = new T.Group(); hyldeGrp.visible = false; scene.add(hyldeGrp);

    kamPos = new T.Vector3(0, 4, 8); kamMaal = new T.Vector3(0, 1, 0);
    kamPosMaal = kamPos.clone(); kamMaalMaal = kamMaal.clone();
  }

  function byggOvn() {
    ovn = new T.Group();
    const mursten = new T.MeshStandardMaterial({ color: "#c65a35", roughness: .85 });
    const krop = new T.Mesh(new T.CylinderGeometry(1.95, 1.95, 3.7, 48, 1, true), new T.MeshStandardMaterial({ color: "#c65a35", roughness: .85, side: T.DoubleSide }));
    krop.position.y = 1.85; krop.castShadow = true; ovn.add(krop);
    const kuppel = new T.Mesh(new T.SphereGeometry(1.95, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), mursten);
    kuppel.position.y = 3.7; kuppel.castShadow = true; ovn.add(kuppel);
    for (const y of [.15, 1.3, 2.5, 3.6]) {
      const b = new T.Mesh(new T.TorusGeometry(1.98, .09, 10, 64), new T.MeshStandardMaterial({ color: "#7c3b25", roughness: .6, metalness: .2 }));
      b.rotation.x = Math.PI / 2; b.position.y = y; ovn.add(b);
    }
    const haandtag = new T.Mesh(new T.TorusGeometry(.35, .08, 10, 24, Math.PI), new T.MeshStandardMaterial({ color: "#333", metalness: .7, roughness: .3 }));
    haandtag.position.y = 5.6; ovn.add(haandtag);
    ovnVindue = new T.Mesh(new T.CircleGeometry(.5, 32), new T.MeshStandardMaterial({ color: "#3a1a10", emissive: "#ff7a1a", emissiveIntensity: 0 }));
    ovnVindue.position.set(0, 2.0, 1.96); ovn.add(ovnVindue);
    const vRing = new T.Mesh(new T.TorusGeometry(.52, .07, 10, 32), new T.MeshStandardMaterial({ color: "#7c3b25", metalness: .2, roughness: .6 }));
    vRing.position.copy(ovnVindue.position); ovn.add(vRing);
    ovnLys = new T.PointLight("#ff8a3c", 0, 6); ovnLys.position.set(0, 2, 2.6); ovn.add(ovnLys);
    ovn.position.y = 14; ovn.visible = false; scene.add(ovn);
  }

  /* ---------- Kamera ---------- */
  function indram(visning) {
    const asp = cv.clientWidth / Math.max(1, cv.clientHeight), tv = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    if (visning === "hylde") {
      const { b, h } = hyldeMaal();
      const d = Math.max((h / 2 + .6) / tv, (b / 2 + .5) / (tv * asp)) * 1.05;
      kamMaalMaal.set(0, h / 2 - .25, 0); kamPosMaal.set(0, h / 2 + .4, d);
      return;
    }
    // Drejeskiven: krukken (op til 3.3 høj) og skiven skal kunne ses, med plads til knapperne forneden
    const ovnen = visning === "ovn", halvH = ovnen ? 3.7 : 3.0, halvB = 2.45;
    const d = (Math.max(halvH / tv, halvB / (tv * asp)) + 1.2) * kamZoom;
    const op = asp < 1 ? .55 : .35; // skub billedet op, så knapperne forneden ikke dækker
    const my = ovnen ? 2.0 : .9 - op;
    // Er krukken blevet til en åben skål, kigger kameraet mere ovenfra, så man kan se ned i den
    const skaal = !ovnen && r ? hul * Math.max(0, Math.min(1, (r[K - 1] - .45) / .7)) : 0;
    const e = Math.max(.05, Math.min(.97, .4 + .22 * skaal + kamTilt));
    kamMaalMaal.set(0, my, 0);
    kamPosMaal.set(0, my + d * e, d * Math.sqrt(1 - e * e));
  }
  function tilpas() {
    if (!renderer) return;
    const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (fase === "hylde") lavHylde(false);
    indram(fase === "hylde" ? "hylde" : fase === "ovn" ? "ovn" : "hjul");
  }

  /* ---------- Faser ---------- */
  const $ = s => root.querySelector(s);
  function visKnap(ikon, synlig) {
    const b = $(".dr-videre"); b.textContent = ikon; b.hidden = !synlig;
    b.classList.toggle("vis", synlig);
  }

  function nyKlump(snak = true) {
    fjernKlat(); fase = "drej"; startForm(); nyGeometri();
    sagtMere = false; sagtHint = false; sagtAabn = false;
    $(".dr-mere").hidden = false; $(".dr-mere").classList.remove("vis");
    lerFarve(lerCanvas.getContext("2d"), TEX, TEX); lerTex.needsUpdate = true;
    krukke.material = krukkeMat; krukke.visible = true; krukke.position.set(0, 0, 0); krukke.rotation.set(0, 0, 0); krukke.scale.setScalar(1);
    if (raaTex) { raaTex.dispose(); braendtTex.dispose(); raaTex = braendtTex = null; }
    hjulGrp.visible = true; hyldeGrp.visible = false; ovn.visible = false; gulv.visible = true;
    omega = 0; formTid = 0; sagtHul = false; sagtMal = false; malet = 0; farve = null; flod = null;
    sidstRoert = performance.now();
    $(".dr-farver").hidden = true; $(".dr-farver").querySelectorAll("button").forEach(b => b.classList.remove("valgt"));
    $(".dr-hyldeknap").hidden = !hentGemte().length;
    visKnap("✅", false);
    indram("hjul");
    if (snak) later(() => Spil.say("Her er en klump ler. Rør ved leret, mens det drejer, og giv det form!", null, "drej-hej"), 500);
  }

  function tilGlasur() {
    fase = "glasur"; Spil.sfx.right();
    if (klat) { // en klump der stadig falder, nås ikke at komme med
      if (fyld) { for (let j = 0; j < K; j++) r[j] = fyld.maal[j]; V = fyld.V; hul = fyld.hul; H = Math.max(MINH, Math.min(MAXH, V / middelR2(r))); nyGeometri(); }
      fjernKlat();
    }
    $(".dr-mere").hidden = true;
    // Nu er formen fast; glasuren males på to lærreder: et blegt (før ovnen) og et klart (efter ovnen)
    raaCanvas = lavCanvas(); braendtCanvas = lavCanvas();
    for (const c of [raaCanvas, braendtCanvas]) c.getContext("2d").drawImage(lerCanvas, 0, 0);
    // Uglaseret ler bliver lysere efter brændingen
    const bg = braendtCanvas.getContext("2d"); bg.fillStyle = "rgba(255,225,200,.25)"; bg.fillRect(0, 0, TEX, TEX);
    raaTex = canvasTex(raaCanvas); braendtTex = canvasTex(braendtCanvas);
    krukke.material = new T.MeshStandardMaterial({ map: raaTex, roughness: .88 });
    $(".dr-farver").hidden = false; $(".dr-hyldeknap").hidden = true;
    visKnap("🔥", false);
    later(() => Spil.say("Flot! Nu skal krukken have farve. Vælg en farve!", null, "drej-glasur"), 300);
  }

  function vaelgFarve(i, knap) {
    if (fase !== "glasur") return;
    farve = FARVER[i]; Spil.sfx.click();
    $(".dr-farver").querySelectorAll("button").forEach(b => b.classList.toggle("valgt", b === knap));
    if (malet === 0) { // første farve dypper hele krukken
      flod = { t: 0, farve };
      malet = 1;
      Spil.say(farve[2], () => {
        if (!alive || fase !== "glasur" || sagtMal) return;
        sagtMal = true; Spil.say("Rør ved krukken, mens den drejer, så laver du striber.", null, "drej-mal");
      }, "farve-" + farve[0]);
      later(() => fase === "glasur" && visKnap("🔥", true), 1200);
    } else Spil.say(farve[2], null, "farve-" + farve[0]);
  }

  function tilOvn() {
    fase = "ovn"; visKnap("🔥", false); $(".dr-farver").hidden = true; Spil.sfx.click();
    ned = false;
    Spil.say("Nu skal krukken i ovnen. Den bliver varm!", null, "drej-ovn");
    ovn.visible = true; ovn.position.y = 14; ovnVindue.material.emissiveIntensity = 0; ovnLys.intensity = 0;
    ovnAnim = { t: 0 }; indram("ovn");
  }

  function braend() {
    // Pletter af jern i glasuren, og så den blanke overflade
    const g = braendtCanvas.getContext("2d");
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(70,40,25,${.15 + Math.random() * .25})`;
      g.beginPath(); g.arc(Math.random() * TEX, Math.random() * TEX, .6 + Math.random() * 1.4, 0, 7); g.fill();
    }
    braendtTex.needsUpdate = true;
    krukke.material.dispose();
    krukke.material = new T.MeshPhysicalMaterial({ map: braendtTex, roughness: .22, clearcoat: 1, clearcoatRoughness: .06 });
  }

  function efterOvn() {
    Spil.sfx.fanfare();
    const p = skaermPunkt(new T.Vector3(0, H / 2, 0));
    if (!roligt()) Spil.burst(p.x, p.y, "✨⭐✨🌟✨⭐");
    Spil.say("Se, hvor den skinner!", null, "drej-skinner");
    later(stilPaaHylde, 4200);
  }

  function stilPaaHylde() {
    // Gem krukken: form + et lille billede af glasuren
    const lille = document.createElement("canvas"); lille.width = lille.height = 256;
    lille.getContext("2d").drawImage(braendtCanvas, 0, 0, 256, 256);
    let billede = ""; try { billede = lille.toDataURL("image/jpeg", .8); } catch (e) {}
    gem({ r: r.map(x => Math.round(x * 1000) / 1000), H: Math.round(H * 1000) / 1000, hul: Math.round(hul * 100) / 100, billede });
    visHylde(true);
  }

  function visHylde(ny) {
    fase = "hylde"; ned = false;
    hjulGrp.visible = false; ovn.visible = false; gulv.visible = false;
    $(".dr-farver").hidden = true; $(".dr-hyldeknap").hidden = true; $(".dr-mere").hidden = true;
    lavHylde(ny);
    indram("hylde");
    visKnap("➕", false);
    later(() => visKnap("➕", true), ny ? 1800 : 400);
    if (ny) later(() => Spil.say("Den står på hylden nu. Vil du lave en til?", null, "drej-hylde"), 900);
    else Spil.say("Her er alle dine krukker.", null, "drej-alle");
  }

  /* ---------- Hylden ---------- */
  function hyldeLayout() {
    const asp = cv.clientWidth / Math.max(1, cv.clientHeight);
    const kol = asp < .8 ? 2 : 4; return { kol, rk: Math.ceil(MAKS_GEMT / kol) };
  }
  const PLADS = 2.5, RAEKKE = 3.0;
  function hyldeMaal() { const { kol, rk } = hyldeLayout(); return { b: kol * PLADS + .6, h: rk * RAEKKE }; }

  function lavHylde(ny) {
    // Ryd den gamle hylde
    hyldeGrp.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    hyldeGrp.clear(); hyldeKrukker = []; dans = []; vist = null; snurr = null;
    hyldeGrp.visible = true;
    // Et slør, der lægger sig foran hylden, når en krukke vises tæt på
    slor = new T.Mesh(new T.PlaneGeometry(80, 80), new T.MeshBasicMaterial({ color: "#f7e6cf", transparent: true, opacity: 0, depthWrite: false }));
    slor.visible = false; hyldeGrp.add(slor);
    const { kol, rk } = hyldeLayout(), { b } = hyldeMaal();
    const trae = new T.MeshStandardMaterial({ color: "#b07a4f", roughness: .7 });
    const bag = new T.Mesh(new T.PlaneGeometry(b + 1.2, rk * RAEKKE + .8), new T.MeshStandardMaterial({ color: "#f0d8b8", roughness: .95 }));
    bag.position.set(0, rk * RAEKKE / 2 - .2, -1.2); bag.receiveShadow = true; hyldeGrp.add(bag);
    for (let i = 0; i < rk; i++) {
      const hy = new T.Mesh(new T.BoxGeometry(b, .18, 2.2), trae);
      hy.position.set(0, i * RAEKKE - .09, -.1); hy.castShadow = hy.receiveShadow = true; hyldeGrp.add(hy);
    }
    for (const s of [-1, 1]) {
      const side = new T.Mesh(new T.BoxGeometry(.2, rk * RAEKKE, 2.2), trae);
      side.position.set(s * (b / 2 + .1), rk * RAEKKE / 2 - .2, -.1); side.castShadow = true; hyldeGrp.add(side);
    }
    const gemte = hentGemte(), loader = new T.TextureLoader();
    // Nyeste krukke øverst til venstre
    gemte.slice().reverse().forEach((k, i) => {
      const rad = rk - 1 - Math.floor(i / kol), plads = i % kol;
      const geo = new T.LatheGeometry(profilFra(k), 48);
      const mat = new T.MeshPhysicalMaterial({ color: k.billede ? "#ffffff" : "#c98760", roughness: .22, clearcoat: 1, clearcoatRoughness: .06 });
      if (k.billede) { const t = loader.load(k.billede); t.colorSpace = T.SRGBColorSpace; mat.map = t; }
      const m = new T.Mesh(geo, mat), maxR = Math.max(...k.r);
      const sk = Math.min(.8, 1.0 / maxR, 2.35 / k.H);
      m.scale.setScalar(sk); m.castShadow = m.receiveShadow = true;
      m.position.set((plads - (kol - 1) / 2) * PLADS, rad * RAEKKE, 0);
      m.rotation.y = Math.random() * 6;
      m.userData = { basisY: m.position.y, sk, h: k.H, maxR };
      hyldeGrp.add(m); hyldeKrukker.push(m);
      if (ny && i === 0) dans.push({ m, t: 0, lande: true });
    });
  }
  /* ---------- Se en krukke tæt på: tryk på den på hylden, træk for at dreje den, tryk ved siden af for at sætte den tilbage ---------- */
  function loeft(m) {
    dans = dans.filter(d => d.m !== m); m.position.y = m.userData.basisY; m.rotation.z = 0;
    const { sk, h, maxR } = m.userData, pivot = new T.Group();
    pivot.position.set(m.position.x, m.position.y + h * sk / 2, m.position.z); // drej om krukkens midte
    hyldeGrp.add(pivot); pivot.add(m); m.position.set(0, -h * sk / 2, 0);
    const dir = kamPosMaal.clone().sub(kamMaalMaal), Dk = dir.length(); dir.normalize();
    const maal = kamMaalMaal.clone().addScaledVector(dir, Dk * .45), Dc = Dk * .55;
    const vh = 2 * Dc * Math.tan(T.MathUtils.degToRad(camera.fov / 2)), vb = vh * camera.aspect;
    // Den skal kunne vippes, så en bred skål vender kanten mod os: hold den inden for skærmen i alle retninger
    const f = Math.min(.55 * vh / Math.max(h, 2 * maxR), .7 * vb / (2 * maxR));
    vist = { m, pivot, fra: pivot.position.clone(), maal, skala: f / sk, t: 0, retning: 1, vel: 0, rx: .35 };
    slor.position.copy(maal).addScaledVector(dir, -(maxR * f + .4)); slor.lookAt(kamPosMaal);
    Spil.tone([392, 523, 659], .1, "triangle");
    if (!sagtSnur) { sagtSnur = true; later(() => vist && Spil.say("Træk med fingeren, så drejer krukken rundt.", null, "drej-snur"), 600); }
  }
  function saetTilbage() {
    if (!vist || vist.retning < 0) return;
    vist.retning = -1; Spil.tone([523, 392], .08, "triangle");
  }
  function visTrin(dt) {
    if (!vist) return;
    const v = vist; v.t = Math.max(0, Math.min(1, v.t + dt / .55 * v.retning));
    const e = v.t * v.t * (3 - 2 * v.t);
    v.pivot.position.lerpVectors(v.fra, v.maal, e);
    v.pivot.scale.setScalar(1 + (v.skala - 1) * e);
    v.pivot.rotation.x = v.rx * e;
    if (!snurr) { v.vel *= Math.pow(.3, dt); v.pivot.rotation.y += (v.vel + .5 * e) * dt; } // efter et skub snurrer den videre, ellers drejer den roligt
    slor.material.opacity = .65 * e; slor.visible = e > .001;
    if (v.retning < 0 && v.t <= 0) { // tilbage på hylden, og den beholder den side, barnet drejede frem
      const m = v.m; v.pivot.remove(m); hyldeGrp.add(m);
      m.position.set(v.fra.x, m.userData.basisY, v.fra.z); m.rotation.y += v.pivot.rotation.y;
      hyldeGrp.remove(v.pivot); vist = null;
    }
  }
  function snurrFlyt(e) {
    const nu = performance.now(), dx = e.clientX - snurr.lx, dy = e.clientY - snurr.ly;
    if (Math.hypot(e.clientX - snurr.x, e.clientY - snurr.y) > 10) snurr.flyttet = true;
    vist.pivot.rotation.y += dx * .012;
    vist.rx = Math.max(-.6, Math.min(1.3, vist.rx + dy * .008));
    const dtE = Math.max(1, nu - snurr.lt) / 1000;
    snurr.vel = snurr.vel * .5 + (dx * .012 / dtE) * .5;
    snurr.lx = e.clientX; snurr.ly = e.clientY; snurr.lt = nu;
  }

  function profilFra(k) {
    const rr = k.r.length === K ? k.r : Array.from({ length: K }, (_, i) => k.r[Math.round(i / (K - 1) * (k.r.length - 1))]);
    return profil(rr, k.H, k.hul || 0);
  }

  /* ---------- Fingeren ---------- */
  function tilNdc(e) {
    const b = cv.getBoundingClientRect();
    ndc.set((e.clientX - b.left) / b.width * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
  }
  /* ---------- Kameraet: to fingre (træk op/ned = vip, knib = zoom), højreklik-træk og musehjul ---------- */
  const kamVisning = () => fase === "ovn" ? "ovn" : "hjul";
  function grebInfo() {
    const p = [...fingre.values()], y =p.reduce((s, q) => s + q.y, 0) / p.length;
    return { y, afst: p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0 };
  }
  function startGreb() {
    const g = grebInfo(); kamGreb = { y0: g.y, afst0: g.afst, tilt0: kamTilt, zoom0: kamZoom };
    ned = false; modus = null; sidstUV = null;
  }
  function flytGreb() {
    const g = grebInfo(), h = Math.max(1, cv.clientHeight);
    kamTilt = Math.max(-.4, Math.min(.6, kamGreb.tilt0 + (g.y - kamGreb.y0) / h * 1.6));
    if (kamGreb.afst0 > 20 && g.afst > 20) kamZoom = Math.max(.55, Math.min(1.6, kamGreb.zoom0 * kamGreb.afst0 / g.afst));
    indram(kamVisning());
  }
  function onHjul(e) {
    if (!alive || !renderer || fase === "hylde") return;
    e.preventDefault();
    kamZoom = Math.max(.55, Math.min(1.6, kamZoom * Math.exp(e.deltaY * .001)));
    indram(kamVisning());
  }

  function onDown(e) {
    if (!alive || !renderer) return;
    try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    fingre.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (fase !== "hylde" && (fingre.size >= 2 || e.button === 2)) { startGreb(); return; }
    if (kamGreb) return;
    ned = true; modus = null; sidstUV = null; tilNdc(e);
    if (fase === "hylde") { ned = false; tryk_hylde(e); }
    if (fase === "glasur" && !farve) {
      ray.setFromCamera(ndc, camera);
      if (ray.intersectObject(krukke).length) Spil.say("Vælg en farve først.", null, "drej-vaelg");
    }
  }
  function onMove(e) {
    if (fingre.has(e.pointerId)) fingre.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (snurr && vist) snurrFlyt(e);
    else if (kamGreb) flytGreb(); else if (ned) tilNdc(e);
  }
  function onUp(e) {
    fingre.delete(e.pointerId);
    if (snurr && vist) {
      if (snurr.flyttet) vist.vel = Math.max(-14, Math.min(14, performance.now() - snurr.lt < 120 ? snurr.vel : 0));
      else if (snurr.paa) { vist.vel += 7; Spil.tone([523, 659, 784].map(f => f * (.8 + Math.random() * .4)), .1, "triangle"); }
      else saetTilbage();
    }
    snurr = null;
    if (kamGreb) { if (fingre.size === 0) kamGreb = null; else startGreb(); } // nyt udgangspunkt, så kameraet ikke hopper
    ned = false; modus = null; sidstUV = null;
  }

  function tryk_hylde(e) {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hyldeKrukker)[0];
    if (vist) { // en krukke vises tæt på: træk = drej den, tryk ved siden af = sæt den tilbage
      if (vist.retning < 0) return;
      const nu = performance.now();
      snurr = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, lt: nu, vel: 0, flyttet: false, paa: !!hit && hit.object === vist.m };
    } else if (hit) loeft(hit.object);
  }

  const plan = () => { const n = new T.Vector3(camera.position.x, 0, camera.position.z).normalize(); return new T.Plane(n, 0); };

  // Hullets dybde (samme regel som i profil())
  const hulDybde = () => hul * (H - Math.min(.3, H * .22));

  // Fingeren inde i hullet skubber væggen ud: indersiden følger en skålform fra hullets bund op til fingeren,
  // og væggen over fingeren skubbes ud til fingeren. Leret bevarer sin mængde, så en bred skål bliver lav.
  function aabn(d, y, yb, dt) {
    const vil = Math.min(MAXR, d + VAEG), bundR = .12 + VAEG;
    const yf = Math.min(H, Math.max(yb + .1, y)), jf = yf / H * (K - 1), fart = Math.min(1, dt * 4);
    let roert = 0;
    for (let j = 0; j < K; j++) {
      const yj = H * j / (K - 1);
      if (yj < yb) continue;
      let maal, w = 1;
      if (yj <= yf) maal = bundR + (vil - bundR) * Math.sin((yj - yb) / (yf - yb) * Math.PI / 2);
      else { maal = vil; w = Math.exp(-Math.pow((j - jf) / 4, 2)); }
      if (maal > r[j]) { const ny = r[j] + (maal - r[j]) * w * fart; roert += ny - r[j]; r[j] = ny; }
    }
    return roert;
  }

  // Fingeren inde i hullet glider ind mod midten: væggen ved fingeren og alt over den følger med ind
  // (så en udbøjet kant kan bøjes ind igen). Leret under hullets bund røres ikke.
  function ind(dd, y, yb) {
    const jf = Math.min(K - 1, Math.max(0, y / H * (K - 1)));
    let roert = 0;
    for (let j = 0; j < K; j++) {
      if (H * j / (K - 1) < yb) continue;
      // bred overgang, så hele den udbøjede væg retter sig op (ikke kun en læbe øverst)
      const w = j >= jf ? 1 : Math.exp(-Math.pow((j - jf) / 10, 2));
      const ny = Math.max(Math.min(r[j], VAEG + .15), r[j] - dd * w);
      roert += r[j] - ny; r[j] = ny;
    }
    return roert;
  }

  // Tryk ovenfra: klumpen bliver lavere og bredere, og toppen bliver flad
  function tryk(y, dt) {
    const nyH = Math.max(MINH, H + (Math.max(MINH, y) - H) * Math.min(1, dt * 2.5));
    const f = Math.sqrt(H / nyH), maxR = Math.max(...r), fl = Math.min(1, dt * 1.5);
    let roert = 0;
    for (let j = 0; j < K; j++) {
      let ny = Math.min(MAXR, r[j] * f);
      ny += (Math.max(ny, Math.min(MAXR, maxR * f) * .85) - ny) * fl * (j / (K - 1));
      roert += Math.abs(ny - r[j]); r[j] = ny;
    }
    return roert;
  }

  function aabnHint() {
    if (sagtAabn) return; sagtAabn = true;
    later(() => fase === "drej" && r[K - 1] < .7 && !Spil.isTalking() &&
      Spil.say("Tryk i hullet og træk ud til siden, så bliver det en skål!", null, "drej-aabn"), 700);
  }

  function form(dt) {
    let roert = 0;
    if (ned) {
      ray.setFromCamera(ndc, camera);
      const p = new T.Vector3();
      if (ray.ray.intersectPlane(plan(), p)) {
        const d = Math.hypot(p.x, p.z), y = p.y, top = r[K - 1];
        const yb = H - hulDybde(), indeTop = Math.max(.02, top - VAEG);
        if (!modus) {
          // Hvad fingeren gør, bestemmes dér, hvor den først rammer leret, og gælder resten af strøget
          const midt = d < Math.max(.4, top * .7) && y > H - .35 && y < H + .9;
          if (midt) modus = hul < 1 ? "hul" : "inde";
          else if (hul > .3 && y > yb && y < H + .9 && d < indeTop + .1) modus = "inde";
          // Kanten af en åben skål kan gribes udefra lidt over og under kanten
          else if (hul > .3 && d < top + .3 && y > H - .4 && y < H + .4) modus = "ude";
          else if (y > H + .05 && y < H + 1.4 && d < Math.max(...r) + .2) modus = "tryk";
          else if (y > -.1 && y < H + .05 && d <= rVed(r, H, Math.max(0, y)) + .06) modus = "ude";
          modusD = sidstD = d;
        }
        if (modus === "hul") {
          // Hul: tryk midt på toppen
          hul = Math.min(1, hul + dt * .7); roert = .6;
          if (hul >= 1) { Spil.sfx.pop(); aabnHint(); }
          // Når hullet er dybt nok, eller fingeren glider ud til siden, åbner fingeren hullet i stedet
          if (hul >= 1 || (hul > .3 && d > modusD + .15)) modus = "inde";
        } else if (modus === "inde") {
          roert += aabn(d, y, yb, dt);
          if (d < sidstD) roert += ind(sidstD - d, y, yb);
        } else if (modus === "tryk") {
          if (y < H) roert += tryk(y, dt);
        } else if (modus === "ude") {
          const kf = Math.min(K - 1, y / H * (K - 1)); // over kanten tæller som selve kanten
          if (kf > -1 && y < H + .5) {
            const maal = Math.max(hul > .05 ? VAEG + .12 : MINR * .6, Math.min(MAXR, d));
            // Ind (gøre tyndere) går langsommere end ud, så man skal holde fingeren der et stykke tid
            const fartUd = Math.min(1, dt * 7), fartInd = Math.min(1, dt * 2.8);
            for (let j = 0; j < K; j++) {
              const w = Math.exp(-Math.pow((j - kf) / 2.8, 2));
              const lav = j < 3 ? .45 : MINR, m = Math.max(lav, maal);
              const ny = r[j] + (m - r[j]) * w * (m < r[j] ? fartInd : fartUd);
              roert += Math.abs(ny - r[j]); r[j] = ny;
            }
          } else modus = null;
        }
        sidstD = d;
      }
    }
    if (roert > 0) {
      // lidt udglatning, og bevar mængden af ler: smal → høj, bred → lav
      for (let j = 1; j < K - 1; j++) r[j] = r[j] * .94 + (r[j - 1] + r[j + 1]) * .03;
      H = Math.max(MINH, Math.min(MAXH, V / middelR2(r)));
      nyGeometri(); indram("hjul");
      formTid += dt; sidstRoert = performance.now();
      if (formTid > 2 && $(".dr-videre").hidden) visKnap("✅", true);
      if (formTid > 4 && hul < .3 && !sagtHul) {
        sagtHul = true; later(() => fase === "drej" && hul < .3 && Spil.say("Tryk midt på toppen, så laver du et hul.", null, "drej-hul"), 900);
      }
    } else if (!sagtHint && formTid === 0 && !klat && performance.now() - sidstRoert > 12000 && !Spil.isTalking()) {
      // Kun én gang, og kun hvis barnet slet ikke har rørt leret endnu
      sagtHint = true;
      Spil.say("Rør ved leret med fingeren.", null, "drej-hint");
    }
    // Tynd som en pind? Så hopper ler-knappen, og stemmen fortæller om den én gang
    const tynd = r.filter(x => x < .5).length > K * .4;
    $(".dr-mere").classList.toggle("vis", tynd && !klat);
    if (tynd && !sagtMere && !klat && performance.now() - sidstRoert > 1500 && !Spil.isTalking()) {
      sagtMere = true;
      Spil.say("Tryk på klumpen, så får du mere ler.", null, "drej-mere-hint");
    }
    lydSaet(lyd && lyd.smatG, Math.min(.12, roert * 2.5));
  }

  function mal() {
    if (flod) return;
    if (!ned || !farve) { sidstUV = null; return; }
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(krukke)[0];
    if (!hit || !hit.uv) { sidstUV = null; return; }
    const u = hit.uv.x * TEX, v = (1 - hit.uv.y) * TEX;
    const stroeg = (g, c) => {
      g.strokeStyle = c; g.lineCap = "round"; g.lineWidth = 15;
      const tegn = (x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
      if (!sidstUV) tegn(u, v, u + .1, v);
      else {
        let du = u - sidstUV[0]; if (du > TEX / 2) du -= TEX; if (du < -TEX / 2) du += TEX;
        const x0 = sidstUV[0], x1 = x0 + du;
        tegn(x0, sidstUV[1], x1, v);
        if (x1 < 0 || x1 > TEX) { const s = x1 < 0 ? TEX : -TEX; tegn(x0 + s, sidstUV[1], x1 + s, v); }
      }
    };
    stroeg(raaCanvas.getContext("2d"), pastel(farve[1]));
    stroeg(braendtCanvas.getContext("2d"), farve[1]);
    raaTex.needsUpdate = braendtTex.needsUpdate = true;
    sidstUV = [u, v];
    if (malet === 1) malet = 2;
  }

  function flodTrin(dt) {
    if (!flod) return;
    const for_ = flod.t; flod.t = Math.min(1, flod.t + dt * 1.4);
    // fyld nedefra og op (v=0 er bunden af krukken = nederst i lærredet)
    const y0 = TEX * (1 - flod.t), y1 = TEX * (1 - for_);
    for (const [c, col] of [[raaCanvas, pastel(flod.farve[1])], [braendtCanvas, flod.farve[1]]]) {
      const g = c.getContext("2d"); g.fillStyle = col; g.fillRect(0, Math.floor(y0), TEX, Math.ceil(y1 - y0) + 1);
    }
    raaTex.needsUpdate = braendtTex.needsUpdate = true;
    if (flod.t >= 1) {
      // lidt levende glasur: mørkere og lysere skjolder
      const g = braendtCanvas.getContext("2d");
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(${Math.random() < .5 ? "0,0,0" : "255,255,255"},.06)`;
        g.beginPath(); g.ellipse(Math.random() * TEX, Math.random() * TEX, 20 + Math.random() * 40, 6 + Math.random() * 12, 0, 0, 7); g.fill();
      }
      flod = null;
    }
  }

  function ovnTrin(dt) {
    if (!ovnAnim) return;
    const a = ovnAnim; a.t += dt;
    const ease = x => x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 3);
    const bund = -.25, top = 14;
    if (a.t < 1.3) ovn.position.y = top + (bund - top) * ease(a.t / 1.3);
    else if (a.t < 5.3) {
      ovn.position.y = bund;
      if (!a.lukket) { a.lukket = true; Spil.tone([110, 98], .14, "triangle"); lydSaet(lyd && lyd.brumG, .25, .4); }
      const gl = Math.min(1, (a.t - 1.3) / 1.5) * (.85 + .15 * Math.sin(a.t * 9));
      ovnVindue.material.emissiveIntensity = gl * 3; ovnLys.intensity = gl * 14;
      if (!roligt()) ovn.position.x = Math.sin(a.t * 50) * .012 * gl;
      if (a.t > 4.6 && !a.braendt) { a.braendt = true; braend(); }
    } else if (a.t < 6.6) {
      if (!a.ding) { a.ding = true; lydSaet(lyd && lyd.brumG, 0, .2); Spil.tone([1568, 2093], .25, "sine"); }
      ovn.position.x = 0;
      ovnVindue.material.emissiveIntensity *= .9; ovnLys.intensity *= .9;
      ovn.position.y = bund + (top - bund) * ease((a.t - 5.3) / 1.3);
    } else { ovn.visible = false; ovnAnim = null; indram("hjul"); efterOvn(); }
  }

  function dansTrin(dt) {
    for (let i = dans.length - 1; i >= 0; i--) {
      const d = dans[i], m = d.m; d.t += dt;
      if (d.lande) { // den nye krukke daler ned på hylden
        const k = Math.min(1, d.t / 1.1), e = 1 - Math.pow(1 - k, 3);
        m.position.y = m.userData.basisY + (1 - e) * 4; m.rotation.y += dt * 6 * (1 - k);
        if (k >= 1) { Spil.sfx.pop(); d.lande = false; d.t = 0; }
        continue;
      }
      const k = Math.min(1, d.t / 1.2);
      m.position.y = m.userData.basisY + Math.abs(Math.sin(k * Math.PI * 2)) * .5 * (1 - k);
      m.rotation.y += dt * 9 * (1 - k);
      m.rotation.z = Math.sin(k * Math.PI * 4) * .15 * (1 - k);
      if (k >= 1) { m.rotation.z = 0; m.position.y = m.userData.basisY; dans.splice(i, 1); }
    }
  }

  function skaermPunkt(v) {
    const p = v.clone(); krukke.localToWorld(p); p.project(camera);
    const b = cv.getBoundingClientRect();
    return { x: b.left + (p.x + 1) / 2 * b.width, y: b.top + (1 - p.y) / 2 * b.height };
  }

  /* ---------- Løkken ---------- */
  function loop(nu) {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (nu - (sidstTid || nu)) / 1000); sidstTid = nu;
    // Skivens fart
    const maalO = fase === "drej" ? 7 : fase === "glasur" ? 5 : fase === "ovn" ? 2.5 : 0;
    omega += (maalO - omega) * Math.min(1, dt * 1.5);
    vinkel = (vinkel + omega * dt) % (Math.PI * 2);
    hoved.rotation.y = vinkel; krukke.rotation.y = vinkel;
    lydSaet(lyd && lyd.master, fase === "hylde" ? 0 : Math.min(1, omega / 7) * .9, .3);

    if (fase === "drej") { form(dt); klatTrin(dt); }
    else lydSaet(lyd && lyd.smatG, 0);
    if (fase === "glasur") { flodTrin(dt); mal(); }
    ovnTrin(dt);
    dansTrin(dt);
    if (fase === "hylde") visTrin(dt);

    kamPos.lerp(kamPosMaal, Math.min(1, dt * 3)); kamMaal.lerp(kamMaalMaal, Math.min(1, dt * 3));
    camera.position.copy(kamPos); camera.lookAt(kamMaal);
    renderer.render(scene, camera);
  }

  function videre() {
    if (fase === "drej") tilGlasur();
    else if (fase === "glasur" && malet) tilOvn();
    else if (fase === "hylde") { Spil.sfx.click(); nyKlump(false); later(() => Spil.say("Her er en ny klump ler.", null, "drej-ny"), 300); }
  }

  Spil.register({
    id: "drejeskiven", navn: "Drejeskiven", ikon: "🏺", farve: "#f7c9a3",
    start(rt) {
      alive = true; timers = []; fase = "start"; vinkel = 0; omega = 0; sidstTid = 0; ned = false; dans = []; ovnAnim = null;
      Spil.preload(["drej-hej", "drej-hul", "drej-glasur", "drej-mal", "drej-ovn", "drej-skinner", "drej-hylde", "drej-ny", "drej-alle", "drej-vaelg", "drej-hint", "drej-mere", "drej-mere-hint", "drej-aabn", "drej-snur"]);
      rt.innerHTML = `<div class="dr"><canvas class="dr-cv"></canvas><div class="dr-vent">🏺</div>
        <div class="dr-farver" hidden>${FARVER.map((f, i) => `<button data-i="${i}" style="background:${f[1]}" aria-label="${f[2]}"></button>`).join("")}</div>
        <button class="dr-videre" hidden>✅</button>
        <button class="dr-mere" hidden aria-label="Mere ler"><i></i></button>
        <button class="dr-hyldeknap" hidden aria-label="Se hylden">🏺</button></div>`;
      root = rt.querySelector(".dr"); cv = $(".dr-cv");
      $(".dr-videre").addEventListener("click", videre);
      $(".dr-mere").addEventListener("click", mereLer);
      $(".dr-hyldeknap").addEventListener("click", () => { Spil.sfx.click(); visHylde(false); });
      $(".dr-farver").querySelectorAll("button").forEach(b => b.addEventListener("click", () => vaelgFarve(+b.dataset.i, b)));
      cv.addEventListener("pointerdown", onDown); cv.addEventListener("pointermove", onMove);
      cv.addEventListener("pointerup", onUp); cv.addEventListener("pointercancel", onUp);
      cv.addEventListener("wheel", onHjul, { passive: false });
      fingre = new Map(); kamGreb = null; kamTilt = 0; kamZoom = 1; vist = snurr = slor = null; sagtSnur = false;
      addEventListener("resize", tilpas);
      lydStart();
      Spil.three().then(mod => {
        if (!alive) return;
        T = mod; $(".dr-vent").remove();
        byg(); tilpas();
        const dyb = Spil.dyb;
        nyKlump(!dyb);
        if (dyb === "glasur" || dyb === "ovn") {
          for (let j = 0; j < K; j++) r[j] = .75 + .35 * Math.sin(j / (K - 1) * Math.PI * 1.3);
          hul = 1; H = Math.max(MINH, Math.min(MAXH, V / middelR2(r))); nyGeometri(); tilGlasur();
          if (dyb === "ovn") { vaelgFarve(4, $(".dr-farver button[data-i='4']")); later(tilOvn, 1500); }
        } else if (dyb === "hylde") visHylde(false);
        else if (dyb === "hul") { hul = 1; sagtAabn = true; nyGeometri(); } // test: klump med hul, klar til at blive en skål
        kamPos.copy(kamPosMaal); kamMaal.copy(kamMaalMaal);
        raf = requestAnimationFrame(loop);
      }, () => { if (alive) { const v = $(".dr-vent"); if (v) { v.style.animation = "none"; v.textContent = "😕"; } } });
    },
    stop() {
      alive = false; timers.forEach(clearTimeout); cancelAnimationFrame(raf);
      removeEventListener("resize", tilpas);
      lydStop();
      if (renderer) {
        scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
        if (envTex) envTex.dispose();
        renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) {}
      }
      renderer = scene = camera = krukke = null; raaTex = braendtTex = null; klat = fyld = null;
    }
  });
})();
