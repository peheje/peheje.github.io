// Spil: Drejeskiven — en klump ler drejer rundt på en drejeskive (rigtig 3D med three.js).
// 1) Form: rør ved leret. Fingeren skubber leret ind eller trækker det ud; leret bevarer sin mængde,
//    så en smal krukke bliver høj og en bred bliver lav. Tryk midt på toppen for at lave et hul;
//    træk så fingeren ud til siden inde i hullet, så åbner krukken sig til en skål. Tryk ovenfra, så bliver klumpen flad.
// 2) Glasur: vælg en farve (den første farve dypper hele krukken), og rør ved krukken mens den drejer,
//    så bliver der striber (flyt fingeren op og ned for bølger).
// 3) Ovnen sænker sig ned over krukken, gløder, og løfter sig igen: nu skinner glasuren.
// 3b) Valgfrit: har krukken et hul, kan man sætte blomster i (smal åbning) eller lægge frugt i (bred skål). ✅ springer over.
// 4) Krukken stilles på hylden (gemmes i localStorage "lk-krukker", højst 8). Tryk på en krukke for at få den til at danse.
// Ingen rigtige eller forkerte svar: enhver form er en krukke.
(function () {
  const FARVER = [["roed", "#e5483f", "rød"], ["orange", "#f4962c", "orange"], ["gul", "#f5cd34", "gul"], ["groen", "#4caf50", "grøn"],
    ["blaa", "#3b7dd8", "blå"], ["lilla", "#8e5ccc", "lilla"], ["lyseroed", "#f290bb", "lyserød"],
    ["hvid", "#f1eadb", "hvid"], ["sort", "#2f2b2b", "sort"],
    null, // ny række: dæmpede "voksne" glasurfarver
    ["graa", "#8d9199", "grå"], ["brun", "#8a5233", "brun"], ["turkis", "#3aa79e", "turkis"], ["moerkeblaa", "#26407a", "mørkeblå"],
    ["mosgroen", "#76885a", "mosgrøn"], ["sennepsgul", "#c99a2e", "sennepsgul"], ["vinroed", "#7a2633", "vinrød"], ["gammelrosa", "#c58c8a", "gammelrosa"]];
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
      display:flex;align-items:center;justify-content:center;line-height:1;transition:transform .15s,opacity .3s;
      padding:0;font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif}
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
    .dr-farver[hidden],.dr-pynt[hidden]{display:none}
    .dr-pynt{position:absolute;left:0;right:0;bottom:calc(14px + env(safe-area-inset-bottom,0px));
      display:flex;justify-content:center;gap:clamp(12px,2.4vw,26px);pointer-events:none;
      padding:0 calc(clamp(76px,13vh,120px) + 30px)}
    .dr-pynt button{position:relative;pointer-events:auto;width:clamp(72px,12vh,104px);aspect-ratio:1;
      font-size:clamp(40px,7vh,62px);border:5px solid #fff}
    .dr-pynt button.valgt{transform:translateY(-12px) scale(1.12)}
    .dr-farver button{position:relative;pointer-events:auto;width:clamp(60px,10vh,90px);aspect-ratio:1;
      border:6px solid #fff;box-shadow:0 6px 0 rgba(31,58,95,.25),inset 0 -8px 0 rgba(0,0,0,.15)}
    .dr-farver button.valgt{transform:translateY(-12px) scale(1.12)}
    .dr-brud{flex-basis:100%;height:0}
    @media (max-aspect-ratio:1/1){
      .dr-farver{padding:0 16px calc(clamp(76px,13vh,120px) + 14px);max-width:440px;margin:0 auto}
      .dr-farver button{width:clamp(60px,15vw,84px)}
      .dr-brud{display:none}
      .dr-pynt{padding:0 16px calc(clamp(76px,13vh,120px) + 14px)}
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
  let pyntGrp = null, pyntAnim = null, valgtPynt = null, pyntFroe = 1;   // blomster/frugt i krukken på skiven
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

  /* ---------- Pynt: blomster i en høj krukke, frugt i en åben skål (valgfrit, efter ovnen) ---------- */
  const PYNT = {
    tulipan: { ikon: "🌷", navn: "Tulipaner!", lyd: "drej-tulipan", slags: "blomst" },
    solsikke: { ikon: "🌻", navn: "En solsikke!", lyd: "drej-solsikke", slags: "blomst" },
    margerit: { ikon: "🌼", navn: "Margeritter!", lyd: "drej-margerit", slags: "blomst" },
    aeble: { ikon: "🍎", navn: "Æbler!", lyd: "drej-aeble", slags: "frugt" },
    appelsin: { ikon: "🍊", navn: "Appelsiner!", lyd: "drej-appelsin", slags: "frugt" },
    citron: { ikon: "🍋", navn: "Citroner!", lyd: "drej-citron", slags: "frugt" }
  };
  const PYNT_LYDE = ["drej-blomst", "drej-frugt", ...Object.values(PYNT).map(p => p.lyd)];
  // Er der et hul, kan krukken få pynt: en bred åbning bliver til en frugtskål, en smal til en vase
  function pyntSlags(rr, hh, hu) {
    if (hu < .3) return null;
    return Math.max(.02, rr[K - 1] - VAEG) >= .6 ? "frugt" : "blomst";
  }
  // Samme frø giver samme buket, så krukken ser ens ud på hylden
  function tilfaeldig(s) {
    return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  // Citrusskræl: et prikket relief (bumpMap), delt af alle appelsiner og citroner; frigives i stop()
  let skraelTex = null;
  function skrael(farve, ru, bump) {
    if (!skraelTex) {
      const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
      g.fillStyle = "#808080"; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2600; i++) {
        const x = Math.random() * 256, y = Math.random() * 256, r = .8 + Math.random() * 1.8;
        g.fillStyle = `rgba(${Math.random() < .7 ? "40,40,40" : "220,220,220"},${.25 + Math.random() * .35})`;
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      skraelTex = new T.CanvasTexture(c); skraelTex.wrapS = skraelTex.wrapT = T.RepeatWrapping; skraelTex.repeat.set(3, 2);
    }
    return new T.MeshStandardMaterial({ color: farve, roughness: ru, bumpMap: skraelTex, bumpScale: bump });
  }
  // Æbleskræl: grundfarve, en lysere/gullig kind på den ene side, tynde striber fra stilk til bund og små lyse prikker.
  // I en drejet form (LatheGeometry) går x rundt om æblet og y fra bund til top. Én tekstur pr. farve; frigives i stop().
  let aebleTex = {};
  function aebleMat(farve, kind) {
    if (!aebleTex[farve]) {
      const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
      g.fillStyle = farve; g.fillRect(0, 0, 256, 256);
      const kg = g.createLinearGradient(0, 0, 256, 0);   // kinden: blød overgang rundt om æblet
      kg.addColorStop(0, kind + "00"); kg.addColorStop(.3, kind + "aa"); kg.addColorStop(.45, kind + "cc"); kg.addColorStop(.62, kind + "55"); kg.addColorStop(.8, kind + "00"); kg.addColorStop(1, kind + "00");
      g.fillStyle = kg; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 90; i++) {                     // striber, let bølgede
        const x = Math.random() * 256, b = .6 + Math.random() * 1.6;
        const groen = farve === "#9fcf4a";
        g.strokeStyle = Math.random() < .7 ? (groen ? `rgba(90,140,30,${.06 + Math.random() * .1})` : `rgba(120,10,20,${.06 + Math.random() * .12})`)
          : `rgba(255,225,130,${.05 + Math.random() * .08})`;
        g.lineWidth = b; g.beginPath(); g.moveTo(x, 0);
        for (let y = 0; y <= 256; y += 16) g.lineTo(x + Math.sin(y * .05 + i) * 2.5, y);
        g.stroke();
      }
      for (let i = 0; i < 420; i++) {                    // små lyse prikker (lenticeller)
        g.fillStyle = `rgba(255,240,200,${.25 + Math.random() * .3})`;
        g.beginPath(); g.ellipse(Math.random() * 256, Math.random() * 256, .6 + Math.random() * .9, .5 + Math.random() * .7, 0, 0, 7); g.fill();
      }
      for (const [y0, y1] of [[0, 34], [256, 214]]) {    // mørkere/grønligt ved stilken og bunden
        const ig = g.createLinearGradient(0, y0, 0, y1); ig.addColorStop(0, "rgba(90,100,30,.55)"); ig.addColorStop(1, "rgba(90,100,30,0)");
        g.fillStyle = ig; g.fillRect(0, Math.min(y0, y1), 256, Math.abs(y1 - y0));
      }
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; aebleTex[farve] = t;
    }
    return new T.MeshPhysicalMaterial({ map: aebleTex[farve], roughness: .38, clearcoat: .35, clearcoatRoughness: .3 });
  }
  function aebleGeo() {   // med en fordybning ved stilken og ved bunden
    const p = [[0, -.7], [.14, -.79], [.42, -.86], [.74, -.72], [.94, -.38], [1, 0], [.97, .3], [.86, .6], [.62, .82], [.32, .86], [.14, .76], [0, .66]];
    return new T.LatheGeometry(p.map(([r, y]) => new T.Vector2(r, y)), 28);
  }
  function citronGeo() {
    const p = [[0, -1.38], [.07, -1.36], [.13, -1.28], [.2, -1.16], [.36, -1.06], [.58, -.9], [.76, -.66], [.87, -.36], [.91, 0]];
    const alle = [...p, ...p.slice(0, -1).reverse().map(([r, y]) => [r, -y])];
    return new T.LatheGeometry(alle.map(([r, y]) => new T.Vector2(r, y)), 24);
  }

  // Et kronblad (eller blad) som en buet flade: længden går op ad +Y, bredden ud ad X, og fladen buer ud mod +Z.
  // L/W: længde/bredde, kop: hvor meget kanterne bøjer ind, bue: bule udad, kroel: spidsen bøjer ud (+) eller ind (-),
  // top: hvor på bladet det er bredest (>1 = højt oppe), spids: <1 = rundere spids. Farven går fra "fra" ved roden til "til",
  // med lysere kanter ("kant"), en mørkere midterribbe og svage årer.
  function kronbladGeo(o) {
    const nu = 12, nv = 14, pos = [], col = [], idx = [];
    const ca = new T.Color(o.fra), cb = new T.Color(o.til), ck = new T.Color(o.kant || o.til), c = new T.Color();
    for (let j = 0; j <= nv; j++) {
      const v = j / nv, w = o.W * Math.pow(Math.sin(Math.PI * Math.min(.995, Math.pow(v, o.top || 1))), o.spids || .75) + .004;
      for (let i = 0; i <= nu; i++) {
        const u = i / nu * 2 - 1, x = u * w;
        pos.push(x, v * o.L, -(o.kop || 0) * x * x + (o.bue || 0) * Math.sin(Math.PI * v) + (o.kroel || 0) * v * v * v);
        c.copy(ca).lerp(cb, Math.min(1, v / (o.overgang || .35)));
        c.lerp(ck, (o.kantLys || 0) * Math.pow(Math.abs(u), 2.5) * Math.min(1, v * 1.5));
        c.multiplyScalar(1 - (o.ribbe ?? .14) * Math.pow(1 - Math.abs(u), 8) - .05 * (Math.cos(u * Math.PI * 6) * .5 + .5) * v);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, d = a + nu + 1, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  // Solsikkens frøstand: frø i en gylden-vinkel-spiral, mørkest i midten og med små orange blomster yderst. Frigives i stop().
  let froeTexCache = null;
  function froeTex() {
    if (!froeTexCache) {
      const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
      const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      rg.addColorStop(0, "#5a3a12"); rg.addColorStop(.35, "#3a220c"); rg.addColorStop(.85, "#4a2c10"); rg.addColorStop(1, "#8a5a1a");
      g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
      for (let i = 1; i < 900; i++) {
        const r = 4.1 * Math.sqrt(i), a = i * 2.39996;
        if (r > 126) break;
        const yderst = r > 104;
        g.fillStyle = yderst ? (i % 3 ? "#c77a1f" : "#e0a030") : r < 30 ? "#6b4a1a" : (i % 2 ? "#2a170a" : "#5c3a16");
        g.beginPath(); g.arc(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, yderst ? 2.6 : 1.9, 0, 7); g.fill();
      }
      froeTexCache = new T.CanvasTexture(c); froeTexCache.colorSpace = T.SRGBColorSpace; froeTexCache.anisotropy = 4;
    }
    return froeTexCache;
  }

  // Bygger pynten i krukkens eget koordinatsystem. userData: top (højeste punkt), bredde, dele (til animationen)
  function lavPynt(id, froe, rr, hh, hu) {
    const rnd = tilfaeldig(froe), grp = new T.Group(), dele = [];
    const mat = (c, ru = .55) => new T.MeshStandardMaterial({ color: c, roughness: ru });
    const kugle = new T.SphereGeometry(1, 20, 14);
    const yb = hh - hu * (hh - Math.min(.3, hh * .22));       // hullets bund (samme regel som i profil())
    const mund = Math.max(.05, rr[K - 1] - VAEG);
    let top = hh, bredde = Math.max(...rr);

    if (PYNT[id].slags === "blomst") {
      const n = id === "solsikke" ? (mund > .4 ? 2 : 1) : id === "tulipan" ? 3 : 5;
      const ekstra = .55 + hh * .3;                            // høj krukke = høje blomster
      const stilk = mat("#4f9a3c"), blad = mat("#5fb04a");
      // Stilkene starter lidt under kanten (resten skjules af krukken), så buketten kan brede sig ud
      const by = Math.max(yb + .02, hh - .45);
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + rnd() * .6, rb = n > 1 ? mund * .4 : 0;
        const base = new T.Vector3(Math.cos(a) * rb, by, Math.sin(a) * rb);
        const yT = hh + ekstra - (n > 1 ? rnd() * .35 : 0);
        // Stilken må ikke gå gennem kanten: ved kanten skal den være inden for åbningen
        const f = Math.max(.05, (hh - by) / (yT - by)), hrMaks = rb + (mund * .8 - rb) / f;
        const hr = n > 1 ? Math.min(hrMaks, .35 + rnd() * .35) : Math.min(hrMaks, .12);
        const hoved = new T.Vector3(Math.cos(a) * hr, yT, Math.sin(a) * hr);
        const ret = hoved.clone().sub(base), L = ret.length();
        const plante = new T.Group(); plante.position.copy(base);
        plante.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), ret.normalize());
        // En let buet stilk; blomsthovedet sidder vinkelret på stilkens ende
        const OP = new T.Vector3(0, 1, 0);
        const kurve = new T.QuadraticBezierCurve3(new T.Vector3(0, 0, 0), new T.Vector3((rnd() - .5) * L * .16, L * .55, (rnd() - .5) * L * .16), new T.Vector3(0, L, 0));
        plante.add(new T.Mesh(new T.TubeGeometry(kurve, 16, .03, 7, false), stilk));
        const hd = new T.Group(); hd.position.y = L; hd.quaternion.setFromUnitVectors(OP, kurve.getTangent(1)); plante.add(hd);
        const hovedet = new T.Group(); hd.add(hovedet);
        const bladMat = new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: .6 });
        const lavBlad = (o, y, vinkel, laen) => {
          const b = new T.Mesh(kronbladGeo({ fra: "#3d7a32", til: "#6db35a", kant: "#8fcf74", kantLys: .3, overgang: 1, ribbe: .2, ...o }), bladMat);
          b.position.y = y; b.rotation.set(laen, vinkel, 0, "YXZ"); plante.add(b);
        };
        if (id === "tulipan") {
          // Seks buede kronblade (tre ydre, tre indre), der lukker sig om hinanden. Nogle tulipaner er tofarvede.
          const [farve, kant] = [["#e5483f", "#ffb0a0"], ["#f5cd34", "#fff3a8"], ["#f290bb", "#fff0f6"], ["#f4962c", "#ffe08a"],
            ["#c94fb0", "#f6d0ee"], ["#d8323a", "#f5cd34"], ["#6e2a86", "#c9a0e0"]][Math.floor(rnd() * 7)];
          const pm = new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: .42 });
          for (let k = 0; k < 6; k++) {
            const ydre = k < 3, a = (k % 3) / 3 * Math.PI * 2 + (ydre ? 0 : Math.PI / 3) + rnd() * .15, r = ydre ? .035 : .018;
            const p = new T.Mesh(kronbladGeo({ L: ydre ? .45 : .42, W: ydre ? .17 : .15, kop: 2.4, bue: ydre ? .08 : .055, kroel: ydre ? -.015 : -.04,
              top: 1.35, spids: .6, fra: "#b9c766", til: farve, kant, kantLys: .55, overgang: .32 }), pm);
            p.rotation.y = a; p.position.set(Math.sin(a) * r, -.03, Math.cos(a) * r); hovedet.add(p);
          }
          const bund = new T.Mesh(kugle, stilk); bund.scale.set(.05, .04, .05); hovedet.add(bund);
          hovedet.scale.setScalar(1.25);
          // To lange, rendeformede blade, der bøjer sig ud over kanten
          const bv = rnd() * 6.3;
          lavBlad({ L: .8, W: .11, kop: 4, bue: .02, kroel: .2, top: .9, spids: .55 }, .26, bv, .32);
          lavBlad({ L: .66, W: .1, kop: 4, bue: .02, kroel: .17, top: .9, spids: .55 }, .32, bv + 2.6, .4);
        } else {
          const sol = id === "solsikke", R0 = sol ? .2 : .085;
          hovedet.rotation.x = sol ? -.6 : -.45;                // blomsten kigger skråt op og ud (kameraet ser oppefra)
          if (sol) hovedet.scale.setScalar(1.3);
          // Hvide kronblade får lidt eget lys, så de ikke bliver grå i skyggen
          const pm = new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: .5, emissive: sol ? "#000000" : "#4a4842" });
          if (sol) {
            // Frøstand med spiralmønster, en brun kant og to kranse af spidse, gule kronblade
            const side = new T.Mesh(new T.CylinderGeometry(R0, R0 * .9, R0 * .35, 32, 1, true), mat("#4a2c12", .9)); hovedet.add(side);
            const froestand = new T.Mesh(new T.CircleGeometry(R0, 40), new T.MeshStandardMaterial({ map: froeTex(), roughness: .95 }));
            froestand.rotation.x = -Math.PI / 2; froestand.position.y = R0 * .175 + .002; hovedet.add(froestand);
            // Bagsiden: en grøn bund, så hovedet ikke er hult set bagfra
            const bag = new T.Mesh(new T.CircleGeometry(R0 * .9, 32), mat("#4f8a35", .8));
            bag.rotation.x = Math.PI / 2; bag.position.y = -R0 * .175 - .002; hovedet.add(bag);
          } else {
            const midt = new T.Mesh(kugle, skrael("#f4b81a", .7, 1.5)); midt.scale.set(R0, R0 * .5, R0); midt.position.y = .015; hovedet.add(midt);
          }
          const ring = (N, o, loeft, r, forskyd) => {
            for (let k = 0; k < N; k++) {
              const piv = new T.Group(); piv.rotation.y = (k + forskyd) / N * Math.PI * 2 + (rnd() - .5) * .08; hovedet.add(piv);
              const p = new T.Mesh(kronbladGeo(o), pm); p.rotation.x = Math.PI / 2 - loeft - (rnd() - .5) * .12; p.position.z = r; piv.add(p);
            }
          };
          const kb = sol ? { L: .27, W: .065, kop: 4, bue: .012, kroel: .03, spids: .5, top: 1.1, fra: "#f0a018", til: "#ffd02a", kant: "#fff07a", kantLys: .5, overgang: .3 }
            : { L: .19, W: .042, kop: 3, bue: .008, kroel: .015, spids: .4, top: 1, fra: "#e9e4c8", til: "#ffffff", kant: "#ffffff", overgang: .3, ribbe: .06 };
          ring(sol ? 18 : 14, kb, .1, R0 * .85, 0);
          ring(sol ? 16 : 13, { ...kb, L: kb.L * .88 }, sol ? .3 : .28, R0 * .78, .5);
          // Grønne bægerblade bag hovedet
          ring(sol ? 14 : 10, { L: sol ? .15 : .08, W: sol ? .05 : .025, kop: 3, bue: .005, kroel: .02, spids: .5, fra: "#3d7a32", til: "#5fa04a" }, -.4, R0 * .7, .25);
          const bv = rnd() * 6.3;
          if (sol) { lavBlad({ L: .46, W: .19, kop: 1.6, bue: .02, kroel: .1, top: .7, spids: .7 }, .45, bv, .95); lavBlad({ L: .4, W: .17, kop: 1.6, bue: .02, kroel: .09, top: .7, spids: .7 }, .7, bv + 3, .9); }
          else lavBlad({ L: .26, W: .04, kop: 4, bue: .01, kroel: .06, top: .8, spids: .5 }, .42, bv, .6);
        }
        grp.add(plante);
        dele.push({ o: plante, slags: "blomst", forsink: i * .18 });
        top = Math.max(top, yT + .35); bredde = Math.max(bredde, hr + .35);
      }
    } else {
      // Frugt i lag nedefra, så skålen fyldes, og til sidst en lille bunke over kanten
      const fr = Math.max(.14, Math.min(.3, mund * .3)), pos = [];
      const halvB = fr * (id === "citron" ? 1.48 : 1.12); // bredde inkl. tilfældig skala (citroner er aflange)
      let y = yb + fr * .95, lag = 0;
      while (pos.length < 22) {
        const sidste = lag > 0 && y > hh - fr * .4;
        const inde = Math.max(.02, rVed(rr, hh, Math.min(y, hh)) - VAEG);
        // Tjek krukkens smalleste ydre radius over frugtens højde, så frugter ikke stikker ud gennem en spids bund
        const rMin = Math.min(rVed(rr, hh, Math.min(y, hh)), rVed(rr, hh, Math.max(0, Math.min(y - fr, hh))));
        if (!sidste && y <= hh - fr * .4 && rMin - .04 < halvB) { y += fr * .5; continue; }
        const ring = sidste ? Math.min(inde * .4, fr * 1.2) : Math.min(inde - fr * 1.05, rMin - .04 - halvB);
        if (ring < fr * .6) pos.push([0, y, 0]);
        else {
          const n = Math.max(2, Math.floor(Math.PI * 2 * ring / (fr * 2.1))), skift = lag * .6 + rnd();
          for (let j = 0; j < (sidste ? Math.min(3, n) : n); j++) { const v = j / (sidste ? Math.min(3, n) : n) * Math.PI * 2 + skift; pos.push([Math.cos(v) * ring, y, Math.sin(v) * ring]); }
          if (!sidste && ring > fr * 2.2) pos.push([0, y, 0]);
        }
        if (sidste) break;
        y += fr * 1.5; lag++;
      }
      const stilk = mat("#6b4a2b", .8), blad = mat("#4f9a3c");
      pos.forEach(([x, py, z], i) => {
        const frugt = new T.Group(), s = fr * (.9 + rnd() * .2);
        frugt.position.set(x, py, z); frugt.rotation.set((rnd() - .5) * .5, rnd() * 6.3, (rnd() - .5) * .5);
        if (id === "aeble") {
          const [c, kind] = rnd() < .15 ? ["#9fcf4a", "#f2e26a"] : [["#d8322c", "#f4b63c"], ["#c62d2d", "#f08a3a"], ["#e5483f", "#ffd24a"]][Math.floor(rnd() * 3)];
          const m = new T.Mesh(aebleGeo(), aebleMat(c, kind)); m.scale.setScalar(s); frugt.add(m);
          const st = new T.Mesh(new T.CylinderGeometry(.015, .022, s * .45, 5), stilk); st.position.y = s * .82; st.rotation.z = .15; frugt.add(st);
          const b = new T.Mesh(kugle, blad); b.scale.set(s * .3, .015, s * .14); b.position.set(s * .16, s * .9, 0); b.rotation.z = .3; frugt.add(b);
        } else if (id === "appelsin") {
          // Lidt fladtrykt, med en ujævn, prikket skræl og en lille grøn stilk-stjerne på toppen
          const c = ["#f7931e", "#f28a1a", "#fa9d2a"][Math.floor(rnd() * 3)];
          const m = new T.Mesh(kugle, skrael(c, .62, .9)); m.scale.set(s, s * .93, s); frugt.add(m);
          const nub = new T.Mesh(new T.CylinderGeometry(s * .07, s * .1, s * .08, 8), mat("#6f8a2e", .7)); nub.position.y = s * .93; frugt.add(nub);
          for (let b = 0; b < 5; b++) {
            const bl = new T.Mesh(kugle, blad), v = b / 5 * Math.PI * 2;
            bl.scale.set(s * .1, s * .02, s * .045); bl.position.set(Math.cos(v) * s * .1, s * .925, Math.sin(v) * s * .1); bl.rotation.y = -v; frugt.add(bl);
          }
        } else {
          // Citronform: aflang, med en spids "næse" i hver ende
          const m = new T.Mesh(citronGeo(), skrael(["#f4d33a", "#f7dc4a", "#eecb2c"][Math.floor(rnd() * 3)], .45, .6));
          m.scale.setScalar(s); m.rotation.z = Math.PI / 2; frugt.add(m);
        }
        grp.add(frugt);
        dele.push({ o: frugt, slags: "frugt", maalY: py, forsink: i * .09 });
        top = Math.max(top, py + s);
      });
    }
    grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
    grp.userData = { top, bredde, dele };
    return grp;
  }
  // Blomsterne vokser op med et lille hop, frugterne falder ned i skålen og hopper
  function pyntTrin(dt) {
    if (!pyntAnim) return;
    pyntAnim.t += dt;
    let faerdig = true;
    for (const d of pyntAnim.dele) {
      const k = Math.max(0, Math.min(1, (pyntAnim.t - d.forsink) / (d.slags === "blomst" ? .7 : .45)));
      if (d.slags === "blomst") {
        const s = 1 - Math.pow(1 - k, 3) + Math.sin(k * Math.PI) * .15;
        d.o.scale.setScalar(Math.max(.001, s));
        if (k > 0 && !d.lyd) { d.lyd = true; Spil.tone([523 + Math.random() * 200, 784], .07, "sine"); }
      } else {
        d.o.visible = k > 0;
        const efter = pyntAnim.t - d.forsink - .45;
        d.o.position.y = d.maalY + 3 * (1 - k * k) + (efter > 0 && efter < .25 ? Math.sin(efter / .25 * Math.PI) * .12 : 0);
        if (k >= 1 && !d.lyd) { d.lyd = true; Spil.tone([180 + Math.random() * 80], .06, "triangle"); }
      }
      if (k < 1 || (d.slags === "frugt" && pyntAnim.t - d.forsink < .7)) faerdig = false;
    }
    if (faerdig) pyntAnim = null;
  }
  function fjernPynt() {
    if (!pyntGrp) return;
    pyntGrp.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    if (pyntGrp.parent) pyntGrp.parent.remove(pyntGrp);
    pyntGrp = null; pyntAnim = null;
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
    // Har krukken fået blomster, skal de også være i billedet
    const ovnen = visning === "ovn", oeverst = Math.max(3.5, pyntGrp ? pyntGrp.userData.top + .5 : 0);
    // På en smal telefon fylder farvevælgeren den nederste halvdel: zoom lidt ud, og løft krukken op over farverne
    const glasurTlf = !ovnen && fase === "glasur" && asp < 1;
    const halvH = ovnen ? 3.7 : glasurTlf ? 4.2 : (oeverst + 2.5) / 2, halvB = 2.45;
    const d = (Math.max(halvH / tv, halvB / (tv * asp)) + 1.2) * kamZoom;
    const op = glasurTlf ? 1.6 : asp < 1 ? .55 : .35; // skub billedet op, så knapperne forneden ikke dækker
    const my = ovnen ? 2.0 : (oeverst - 2.5) / 2 + .4 - op;
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
    fjernKlat(); fjernPynt(); valgtPynt = null; $(".dr-pynt").hidden = true;
    fase = "drej"; startForm(); nyGeometri();
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
    indram("hjul");
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
    const slags = pyntSlags(r, H, hul);
    if (slags) later(() => visPynt(slags), 2600);
    else later(stilPaaHylde, 4200);
  }

  // Valgfrit: vælg blomster eller frugt til krukken, eller tryk ✅ for at stille den på hylden som den er
  function visPynt(slags) {
    if (fase !== "ovn") return;
    fase = "pynt"; valgtPynt = null; pyntFroe = 1 + Math.floor(Math.random() * 1e8);
    const boks = $(".dr-pynt");
    boks.innerHTML = Object.entries(PYNT).filter(([, p]) => p.slags === slags)
      .map(([id, p]) => `<button data-p="${id}" aria-label="${p.navn}">${p.ikon}</button>`).join("");
    boks.querySelectorAll("button").forEach(b => b.addEventListener("click", () => vaelgPynt(b.dataset.p, b)));
    boks.hidden = false;
    visKnap("✅", true);
    Spil.say(slags === "frugt" ? "Vil du lægge frugt i skålen?" : "Vil du sætte blomster i krukken?", null, slags === "frugt" ? "drej-frugt" : "drej-blomst");
  }
  function vaelgPynt(id, knap) {
    if (fase !== "pynt") return;
    Spil.sfx.pop();
    $(".dr-pynt").querySelectorAll("button").forEach(b => b.classList.toggle("valgt", b === knap));
    fjernPynt();
    valgtPynt = id; pyntFroe = pyntFroe % 1e8 + 7919;        // nyt tryk = en ny buket
    pyntGrp = lavPynt(id, pyntFroe, r, H, hul);
    pyntGrp.userData.dele.forEach(d => { if (d.slags === "blomst") d.o.scale.setScalar(.001); else d.o.visible = false; });
    krukke.add(pyntGrp); pyntAnim = { t: 0, dele: pyntGrp.userData.dele };
    indram("hjul");
    Spil.say(PYNT[id].navn, null, PYNT[id].lyd);
  }

  function stilPaaHylde() {
    // Gem krukken: form + et lille billede af glasuren (+ evt. pynt)
    const lille = document.createElement("canvas"); lille.width = lille.height = 256;
    lille.getContext("2d").drawImage(braendtCanvas, 0, 0, 256, 256);
    let billede = ""; try { billede = lille.toDataURL("image/jpeg", .8); } catch (e) {}
    const k = { r: r.map(x => Math.round(x * 1000) / 1000), H: Math.round(H * 1000) / 1000, hul: Math.round(hul * 100) / 100, billede };
    if (valgtPynt) { k.pynt = valgtPynt; k.froe = pyntFroe; }
    gem(k);
    fjernPynt();
    visHylde(true);
  }

  function visHylde(ny) {
    fase = "hylde"; ned = false;
    hjulGrp.visible = false; ovn.visible = false; gulv.visible = false;
    $(".dr-farver").hidden = true; $(".dr-hyldeknap").hidden = true; $(".dr-mere").hidden = true; $(".dr-pynt").hidden = true;
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
      const m = new T.Mesh(geo, mat);
      let maxR = Math.max(...k.r), hoej = k.H;
      if (k.pynt && PYNT[k.pynt]) { // blomster/frugt følger med krukken og regnes med i dens størrelse
        const pg = lavPynt(k.pynt, k.froe || 1, rrFra(k), k.H, k.hul || 0);
        m.add(pg); hoej = pg.userData.top; maxR = Math.max(maxR, pg.userData.bredde);
      }
      const sk = Math.min(.8, 1.0 / maxR, 2.35 / hoej);
      m.scale.setScalar(sk); m.castShadow = m.receiveShadow = true;
      m.position.set((plads - (kol - 1) / 2) * PLADS, rad * RAEKKE, 0);
      m.rotation.y = Math.random() * 6;
      m.userData = { basisY: m.position.y, sk, h: hoej, maxR };
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

  const rrFra = k => k.r.length === K ? k.r : Array.from({ length: K }, (_, i) => k.r[Math.round(i / (K - 1) * (k.r.length - 1))]);
  function profilFra(k) { return profil(rrFra(k), k.H, k.hul || 0); }

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
    const h0 = ray.intersectObjects(hyldeKrukker)[0];
    // Rammer man en blomst eller en frugt, er det krukken, man har trykket på
    let obj = h0 && h0.object; while (obj && !hyldeKrukker.includes(obj)) obj = obj.parent;
    const hit = obj ? { object: obj } : null;
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
    const maalO = fase === "drej" ? 7 : fase === "glasur" ? 5 : fase === "ovn" ? 2.5 : fase === "pynt" ? 1 : 0;
    omega += (maalO - omega) * Math.min(1, dt * 1.5);
    vinkel = (vinkel + omega * dt) % (Math.PI * 2);
    hoved.rotation.y = vinkel; krukke.rotation.y = vinkel;
    lydSaet(lyd && lyd.master, fase === "hylde" || fase === "pynt" ? 0 : Math.min(1, omega / 7) * .9, .3);
    pyntTrin(dt);

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
    else if (fase === "pynt") { Spil.sfx.click(); $(".dr-pynt").hidden = true; visKnap("✅", false); stilPaaHylde(); }
    else if (fase === "hylde") { Spil.sfx.click(); nyKlump(false); later(() => Spil.say("Her er en ny klump ler.", null, "drej-ny"), 300); }
  }

  Spil.register({
    id: "drejeskiven", navn: "Drejeskiven", ikon: "🏺", farve: "#f7c9a3",
    start(rt) {
      alive = true; timers = []; fase = "start"; vinkel = 0; omega = 0; sidstTid = 0; ned = false; dans = []; ovnAnim = null;
      Spil.preload(["drej-hej", "drej-hul", "drej-glasur", "drej-mal", "drej-ovn", "drej-skinner", "drej-hylde", "drej-ny", "drej-alle", "drej-vaelg", "drej-hint", "drej-mere", "drej-mere-hint", "drej-aabn", "drej-snur", ...PYNT_LYDE]);
      rt.innerHTML = `<div class="dr"><canvas class="dr-cv"></canvas><div class="dr-vent">🏺</div>
        <div class="dr-farver" hidden>${FARVER.map((f, i) => f ? `<button data-i="${i}" style="background:${f[1]}" aria-label="${f[2]}"></button>` : `<i class="dr-brud"></i>`).join("")}</div>
        <div class="dr-pynt" hidden></div>
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
        if (dyb === "glasur" || dyb === "ovn" || dyb === "pynt" || dyb === "skaal") {
          // test: "pynt" = en høj vase klar til blomster, "skaal" = en bred skål klar til frugt
          for (let j = 0; j < K; j++) { const t = j / (K - 1); r[j] = dyb === "skaal" ? .55 + .75 * Math.pow(t, .7) : dyb === "pynt" ? .55 + .2 * Math.sin(t * Math.PI) - .12 * t : .75 + .35 * Math.sin(t * Math.PI * 1.3); }
          hul = 1; H = Math.max(MINH, Math.min(MAXH, V / middelR2(r))); nyGeometri(); tilGlasur();
          if (dyb === "ovn") { vaelgFarve(4, $(".dr-farver button[data-i='4']")); later(tilOvn, 1500); }
          if (dyb === "pynt" || dyb === "skaal") {
            vaelgFarve(dyb === "pynt" ? 4 : 2, $(`.dr-farver button[data-i='${dyb === "pynt" ? 4 : 2}']`));
            later(() => { fase = "ovn"; $(".dr-farver").hidden = true; braend(); visPynt(pyntSlags(r, H, hul)); }, 1000);
          }
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
      if (skraelTex) { skraelTex.dispose(); skraelTex = null; }
      Object.values(aebleTex).forEach(t => t.dispose()); aebleTex = {};
      if (froeTexCache) { froeTexCache.dispose(); froeTexCache = null; }
      renderer = scene = camera = krukke = null; raaTex = braendtTex = null; klat = fyld = null;
    }
  });
})();
